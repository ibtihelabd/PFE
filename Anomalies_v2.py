"""
Détection d'anomalies de trafic — Dakar v2
Source : Trafic.csv (CETUD)

Améliorations par rapport à v1 :
  - Contamination calibrée par IQR (pas arbitraire à 5%)
  - Score de sévérité continu (0-100) par consensus pondéré
  - Analyse temporelle : anomalies par heure / jour / site
  - DBSCAN pour détection spatiale de clusters anormaux
  - Dashboard complet avec 8 visualisations
  - Export CSV enrichi + carte Folium améliorée
  - LOF utilisé uniquement en fit_predict (pas de novelty, cohérent)
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.rcParams['font.family'] = 'DejaVu Sans'
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.cluster import DBSCAN
from sklearn.preprocessing import StandardScaler, LabelEncoder
from scipy import stats

# ─────────────────────────────────────────────────────────────────────────────
# 1. CHARGEMENT & PRÉPARATION
# ─────────────────────────────────────────────────────────────────────────────
print("Chargement des données...")
df = pd.read_csv(r'PFE (partie usager)\Trafic.csv')
print(f"  {df.shape[0]:,} enregistrements | {df.shape[1]} variables")

# Feature engineering temporel
df['HEURE_DECIMAL'] = df['Heure_debut_comptage'] + df['Minute_debut_comptage'] / 60
df['Date_comptage'] = pd.to_datetime(df['Date_comptage'])
df['DAY_OF_WEEK']   = df['Date_comptage'].dt.dayofweek
df['MOIS']          = df['Date_comptage'].dt.month
df['HEURE_INT']     = df['Heure_debut_comptage'].astype(int)

# Catégorie heure (matin / midi / soir / nuit)
def heure_tranche(h):
    if 6 <= h < 10:  return 'Matin (6-10h)'
    if 10 <= h < 14: return 'Midi (10-14h)'
    if 14 <= h < 20: return 'Après-midi (14-20h)'
    if 20 <= h < 24: return 'Soir (20-24h)'
    return 'Nuit (0-6h)'

df['TRANCHE_HEURE'] = df['HEURE_INT'].apply(heure_tranche)

le_cat  = LabelEncoder()
le_jour = LabelEncoder()
le_sens = LabelEncoder()
df['Categorie_vehicule_enc'] = le_cat.fit_transform(df['Categorie_vehicule'].astype(str))
df['Jour_comptage_enc']      = le_jour.fit_transform(df['Jour_comptage'].astype(str))
df['Sens_circulation_enc']   = le_sens.fit_transform(df['Sens_circulation'].astype(str))

features = [
    'Nombre_vehicules_amplitude', 'HEURE_DECIMAL',
    'Categorie_vehicule_enc', 'Jour_comptage_enc',
    'GPS_Longitude_site', 'GPS_Latitude_site',
    'Sens_circulation_enc', 'DAY_OF_WEEK'
]

scaler = StandardScaler()
X_scaled = scaler.fit_transform(df[features])

# ─────────────────────────────────────────────────────────────────────────────
# 2. CALIBRATION DE LA CONTAMINATION PAR IQR
# ─────────────────────────────────────────────────────────────────────────────
vol = df['Nombre_vehicules_amplitude']
Q1, Q3 = vol.quantile(0.25), vol.quantile(0.75)
IQR = Q3 - Q1
borne_sup = Q3 + 3 * IQR
contamination_iqr = (vol > borne_sup).mean()
contamination = float(np.clip(contamination_iqr, 0.01, 0.15))
print(f"\n  Contamination estimée (IQR×3) : {contamination:.3f} ({contamination*100:.1f}%)")

# ─────────────────────────────────────────────────────────────────────────────
# 3. MODÈLE 1 : Z-Score par groupe (site / catégorie / heure)
# ─────────────────────────────────────────────────────────────────────────────
grp = ['Identifiant_site_comptage', 'Categorie_vehicule', 'Heure_debut_comptage']
df['VOL_MEAN'] = df.groupby(grp)['Nombre_vehicules_amplitude'].transform('mean')
df['VOL_STD']  = df.groupby(grp)['Nombre_vehicules_amplitude'].transform('std').fillna(1).replace(0, 1)
df['ZSCORE']         = (df['Nombre_vehicules_amplitude'] - df['VOL_MEAN']) / df['VOL_STD']
df['ANOMALY_ZSCORE'] = (df['ZSCORE'].abs() > 3).astype(int)
df['SCORE_ZSCORE']   = df['ZSCORE'].abs().clip(upper=10) / 10   # score normalisé 0-1

# ─────────────────────────────────────────────────────────────────────────────
# 4. MODÈLE 2 : Isolation Forest (contamination calibrée)
# ─────────────────────────────────────────────────────────────────────────────
iso = IsolationForest(contamination=contamination, n_estimators=200,
                      max_samples='auto', random_state=42)
df['ANOMALY_IF'] = (iso.fit_predict(X_scaled) == -1).astype(int)
df['SCORE_IF']   = (-iso.score_samples(X_scaled))          # plus élevé = plus anormal
# Normaliser entre 0 et 1
df['SCORE_IF'] = (df['SCORE_IF'] - df['SCORE_IF'].min()) / (df['SCORE_IF'].max() - df['SCORE_IF'].min() + 1e-9)

# ─────────────────────────────────────────────────────────────────────────────
# 5. MODÈLE 3 : Local Outlier Factor
# ─────────────────────────────────────────────────────────────────────────────
n_neigh = min(30, len(df) // 100)
lof = LocalOutlierFactor(n_neighbors=n_neigh, contamination=contamination)
df['ANOMALY_LOF'] = (lof.fit_predict(X_scaled) == -1).astype(int)
df['SCORE_LOF']   = (-lof.negative_outlier_factor_)
df['SCORE_LOF']   = (df['SCORE_LOF'] - df['SCORE_LOF'].min()) / (df['SCORE_LOF'].max() - df['SCORE_LOF'].min() + 1e-9)

# ─────────────────────────────────────────────────────────────────────────────
# 6. CONSENSUS PONDÉRÉ + SCORE DE SÉVÉRITÉ
# ─────────────────────────────────────────────────────────────────────────────
# Poids : IF et LOF sont multivariés (plus fiables), Z-Score est univarié
W_ZSCORE, W_IF, W_LOF = 0.25, 0.40, 0.35
df['VOTES']     = df['ANOMALY_ZSCORE'] + df['ANOMALY_IF'] + df['ANOMALY_LOF']
df['CONSENSUS'] = (df['VOTES'] >= 2).astype(int)

# Score de sévérité global 0-100
df['SEVERITE'] = (
    W_ZSCORE * df['SCORE_ZSCORE'] +
    W_IF     * df['SCORE_IF'] +
    W_LOF    * df['SCORE_LOF']
) * 100

df['NIVEAU_SEVERITE'] = pd.cut(df['SEVERITE'],
    bins=[0, 30, 55, 75, 101],
    labels=['Faible', 'Modéré', 'Élevé', 'Critique'],
    right=False)

print(f"\n  Z-Score    : {df['ANOMALY_ZSCORE'].sum():>5} anomalies ({df['ANOMALY_ZSCORE'].mean()*100:.1f}%)")
print(f"  Iso Forest : {df['ANOMALY_IF'].sum():>5} anomalies ({df['ANOMALY_IF'].mean()*100:.1f}%)")
print(f"  LOF        : {df['ANOMALY_LOF'].sum():>5} anomalies ({df['ANOMALY_LOF'].mean()*100:.1f}%)")
print(f"  Consensus  : {df['CONSENSUS'].sum():>5} anomalies ({df['CONSENSUS'].mean()*100:.1f}%)")

# ─────────────────────────────────────────────────────────────────────────────
# 7. DBSCAN — CLUSTERS SPATIAUX D'ANOMALIES
# ─────────────────────────────────────────────────────────────────────────────
df_anom = df[df['CONSENSUS'] == 1].copy()
if len(df_anom) > 10:
    coords = df_anom[['GPS_Latitude_site', 'GPS_Longitude_site']].values
    # eps en degrés (~500m à Dakar)
    db = DBSCAN(eps=0.005, min_samples=3)
    df_anom['CLUSTER_SPATIAL'] = db.fit_predict(coords)
    n_clusters = len(set(df_anom['CLUSTER_SPATIAL'])) - (1 if -1 in df_anom['CLUSTER_SPATIAL'] else 0)
    print(f"\n  DBSCAN : {n_clusters} clusters spatiaux d'anomalies détectés")
else:
    df_anom['CLUSTER_SPATIAL'] = -1
    n_clusters = 0

# ─────────────────────────────────────────────────────────────────────────────
# 8. DASHBOARD VISUALISATIONS
# ─────────────────────────────────────────────────────────────────────────────
print("\nGénération du dashboard...")

DARK   = '#0f1117'
PANEL  = '#1a1d27'
ACCENT = '#4f8ef7'
WARN   = '#f97316'
GOOD   = '#22c55e'
TEXT   = '#e2e8f0'
MUTED  = '#64748b'
RED    = '#ef4444'
PURPLE = '#a855f7'

fig = plt.figure(figsize=(24, 28))
fig.patch.set_facecolor(DARK)

ax_t = fig.add_axes([0, 0.96, 1, 0.04])
ax_t.set_facecolor(DARK); ax_t.axis('off')
ax_t.text(0.5, 0.5, "Détection d'anomalies de trafic v2 — Dakar | CETUD",
          ha='center', va='center', fontsize=16, fontweight='bold', color=TEXT)

# 8.1 Anomalies par heure de la journée
ax1 = fig.add_axes([0.05, 0.74, 0.42, 0.18])
ax1.set_facecolor(PANEL)
anom_heure = df.groupby('HEURE_INT').agg(
    total=('CONSENSUS','count'), anomalies=('CONSENSUS','sum')).reset_index()
anom_heure['taux'] = anom_heure['anomalies'] / anom_heure['total'] * 100
bars = ax1.bar(anom_heure['HEURE_INT'], anom_heure['taux'],
               color=[WARN if t > anom_heure['taux'].quantile(0.75) else ACCENT for t in anom_heure['taux']],
               alpha=0.85, width=0.7)
ax1.set_xlabel("Heure de la journée", color=MUTED, fontsize=9)
ax1.set_ylabel("Taux d'anomalies (%)", color=MUTED, fontsize=9)
ax1.set_title("Anomalies par heure de la journée", color=TEXT, fontsize=11, pad=8)
ax1.tick_params(colors=MUTED)
for spine in ax1.spines.values(): spine.set_visible(False)

# 8.2 Anomalies par jour de semaine
ax2 = fig.add_axes([0.55, 0.74, 0.40, 0.18])
ax2.set_facecolor(PANEL)
jours_labels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
anom_jour = df.groupby('DAY_OF_WEEK').agg(
    total=('CONSENSUS','count'), anomalies=('CONSENSUS','sum')).reset_index()
anom_jour['taux'] = anom_jour['anomalies'] / anom_jour['total'] * 100
bars2 = ax2.bar(anom_jour['DAY_OF_WEEK'], anom_jour['taux'],
                color=[WARN if t > anom_jour['taux'].mean() else GOOD for t in anom_jour['taux']],
                alpha=0.85, width=0.6)
ax2.set_xticks(range(7))
ax2.set_xticklabels(jours_labels, color=TEXT, fontsize=9)
ax2.set_ylabel("Taux d'anomalies (%)", color=MUTED, fontsize=9)
ax2.set_title("Anomalies par jour de la semaine", color=TEXT, fontsize=11, pad=8)
ax2.tick_params(colors=MUTED)
ax2.axhline(anom_jour['taux'].mean(), color=MUTED, lw=1.5, linestyle='--', label='Moyenne')
ax2.legend(fontsize=8, facecolor=PANEL, labelcolor=TEXT, edgecolor=MUTED)
for spine in ax2.spines.values(): spine.set_visible(False)

# 8.3 TOP 15 sites anormaux (nb anomalies consensus)
ax3 = fig.add_axes([0.05, 0.53, 0.55, 0.18])
ax3.set_facecolor(PANEL)
top_sites = (df[df['CONSENSUS'] == 1]
             .groupby('Description_site_comptage')
             .agg(n_anom=('CONSENSUS','sum'),
                  sev_moy=('SEVERITE','mean'))
             .sort_values('n_anom', ascending=False).head(15).reset_index())
colors_sites = [RED if s > 70 else (WARN if s > 50 else ACCENT) for s in top_sites['sev_moy']]
bars3 = ax3.barh(range(len(top_sites)), top_sites['n_anom'], color=colors_sites, alpha=0.85, height=0.6)
ax3.set_yticks(range(len(top_sites)))
ax3.set_yticklabels(top_sites['Description_site_comptage'].str[:40], fontsize=8, color=TEXT)
ax3.set_xlabel("Nb anomalies (consensus)", color=MUTED, fontsize=9)
ax3.set_title("TOP 15 sites les plus anormaux", color=TEXT, fontsize=11, pad=8)
ax3.tick_params(colors=MUTED)
for spine in ax3.spines.values(): spine.set_visible(False)
for bar, sev in zip(bars3, top_sites['sev_moy']):
    ax3.text(bar.get_width()+0.2, bar.get_y()+bar.get_height()/2,
             f'Sév. {sev:.0f}', va='center', fontsize=7.5, color=TEXT)

# 8.4 Distribution score de sévérité
ax4 = fig.add_axes([0.67, 0.53, 0.28, 0.18])
ax4.set_facecolor(PANEL)
ax4.hist(df['SEVERITE'], bins=40, color=ACCENT, alpha=0.75, edgecolor='none')
ax4.axvline(55, color=WARN,   lw=2, linestyle='--', label='Élevé (55)')
ax4.axvline(75, color=RED,    lw=2, linestyle='--', label='Critique (75)')
ax4.set_xlabel("Score de sévérité", color=MUTED, fontsize=9)
ax4.set_ylabel("Nb enregistrements", color=MUTED, fontsize=9)
ax4.set_title("Distribution du score\nde sévérité (0-100)", color=TEXT, fontsize=10, pad=8)
ax4.legend(fontsize=8, facecolor=PANEL, labelcolor=TEXT, edgecolor=MUTED)
ax4.tick_params(colors=MUTED)
for spine in ax4.spines.values(): spine.set_visible(False)

# 8.5 Matrice sites × tranches horaires (heatmap)
ax5 = fig.add_axes([0.05, 0.30, 0.55, 0.20])
ax5.set_facecolor(PANEL)
pivot = df.pivot_table(
    values='CONSENSUS', index='TRANCHE_HEURE',
    columns='Categorie_vehicule', aggfunc='sum', fill_value=0)
im = ax5.imshow(pivot.values, cmap='YlOrRd', aspect='auto')
ax5.set_xticks(range(len(pivot.columns)))
ax5.set_xticklabels(pivot.columns, rotation=30, ha='right', fontsize=8, color=TEXT)
ax5.set_yticks(range(len(pivot.index)))
ax5.set_yticklabels(pivot.index, fontsize=8, color=TEXT)
ax5.set_title("Heatmap anomalies : Tranche horaire × Catégorie véhicule", color=TEXT, fontsize=11, pad=8)
for i in range(len(pivot.index)):
    for j in range(len(pivot.columns)):
        val = pivot.values[i, j]
        ax5.text(j, i, str(val), ha='center', va='center', fontsize=8,
                 color='white' if val > pivot.values.max()/2 else DARK)
plt.colorbar(im, ax=ax5, fraction=0.02, pad=0.01).ax.tick_params(colors=MUTED)

# 8.6 Comparaison modèles (Venn-like : votes = 0,1,2,3)
ax6 = fig.add_axes([0.67, 0.30, 0.28, 0.20])
ax6.set_facecolor(PANEL)
vote_counts = df['VOTES'].value_counts().sort_index()
vote_labels = ['0 vote\n(normal)', '1 vote\n(suspect)', '2 votes\n(anomalie)', '3 votes\n(fort)']
colors_votes = [GOOD, ACCENT, WARN, RED]
bars6 = ax6.bar(range(len(vote_counts)), vote_counts.values,
                color=colors_votes[:len(vote_counts)], alpha=0.85, width=0.6)
ax6.set_xticks(range(len(vote_counts)))
ax6.set_xticklabels(vote_labels[:len(vote_counts)], fontsize=8, color=TEXT)
ax6.set_ylabel("Nb enregistrements", color=MUTED, fontsize=9)
ax6.set_title("Répartition par nombre\nde modèles en accord", color=TEXT, fontsize=10, pad=8)
ax6.tick_params(colors=MUTED)
for spine in ax6.spines.values(): spine.set_visible(False)
for bar in bars6:
    ax6.text(bar.get_x()+bar.get_width()/2, bar.get_height()+10,
             f'{bar.get_height():,}', ha='center', va='bottom', fontsize=8, color=TEXT)

# 8.7 Carte de chaleur géospatiale des anomalies
ax7 = fig.add_axes([0.05, 0.10, 0.55, 0.18])
ax7.set_facecolor('#0a1628')
normal = df[df['CONSENSUS'] == 0]
anomal = df[df['CONSENSUS'] == 1]
ax7.scatter(normal['GPS_Longitude_site'], normal['GPS_Latitude_site'],
            c=MUTED, s=5, alpha=0.2, label='Normal')
sc = ax7.scatter(anomal['GPS_Longitude_site'], anomal['GPS_Latitude_site'],
                 c=anomal['SEVERITE'], cmap='YlOrRd', s=20 + anomal['SEVERITE'],
                 alpha=0.7, label='Anomalie', zorder=5)
plt.colorbar(sc, ax=ax7, fraction=0.02, pad=0.01, label='Sévérité').ax.tick_params(colors=MUTED)
ax7.set_xlabel("Longitude", color=MUTED, fontsize=9)
ax7.set_ylabel("Latitude", color=MUTED, fontsize=9)
ax7.set_title("Localisation géographique des anomalies (taille = sévérité)", color=TEXT, fontsize=11, pad=8)
ax7.tick_params(colors=MUTED)
ax7.legend(fontsize=8, facecolor=PANEL, labelcolor=TEXT, edgecolor=MUTED)
for spine in ax7.spines.values(): spine.set_color(MUTED)

# 8.8 Niveau de sévérité (camembert)
ax8 = fig.add_axes([0.67, 0.10, 0.28, 0.18])
ax8.set_facecolor(PANEL)
sev_counts = df[df['CONSENSUS']==1]['NIVEAU_SEVERITE'].value_counts()
pie_colors = {'Faible': GOOD, 'Modéré': ACCENT, 'Élevé': WARN, 'Critique': RED}
pc_colors = [pie_colors.get(str(k), MUTED) for k in sev_counts.index]
wedges, texts, autotexts = ax8.pie(
    sev_counts.values, labels=sev_counts.index, autopct='%1.1f%%',
    colors=pc_colors, startangle=90, textprops={'color': TEXT, 'fontsize': 9})
for at in autotexts: at.set_color(DARK)
ax8.set_title("Répartition par niveau\nde sévérité (consensus)", color=TEXT, fontsize=10, pad=8)

plt.savefig('anomalies_dashboard_v2.png', dpi=150, bbox_inches='tight', facecolor=DARK)
print("  Dashboard sauvegardé → anomalies_dashboard_v2.png")

# ─────────────────────────────────────────────────────────────────────────────
# 9. CARTE FOLIUM AMÉLIORÉE
# ─────────────────────────────────────────────────────────────────────────────
try:
    import folium
    from folium.plugins import HeatMap, MarkerCluster

    m = folium.Map(location=[14.72, -17.45], zoom_start=11, tiles='CartoDB positron')

    # Calque chaleur des anomalies
    heat_data = [[r['GPS_Latitude_site'], r['GPS_Longitude_site'], r['SEVERITE']/100]
                 for _, r in df[df['CONSENSUS']==1].iterrows()]
    HeatMap(heat_data, name='Chaleur anomalies', radius=18, blur=12).add_to(m)

    # Marqueurs sites normaux
    cluster_normal = MarkerCluster(name='Sites normaux').add_to(m)
    for _, row in df[df['CONSENSUS']==0].drop_duplicates('Identifiant_site_comptage').iterrows():
        folium.CircleMarker(
            location=[row['GPS_Latitude_site'], row['GPS_Longitude_site']],
            radius=4, color='gray', fill=True, fill_opacity=0.4,
            popup=row['Description_site_comptage']
        ).add_to(cluster_normal)

    # Marqueurs anomalies avec couleur sévérité
    agg = (df[df['CONSENSUS']==1]
           .groupby(['Description_site_comptage','GPS_Longitude_site','GPS_Latitude_site'])
           .agg(count=('CONSENSUS','sum'), sev_moy=('SEVERITE','mean'),
                max_vol=('Nombre_vehicules_amplitude','max'))
           .reset_index())

    for _, row in agg.iterrows():
        color = ('red' if row['sev_moy'] > 75 else
                 'orange' if row['sev_moy'] > 55 else 'blue')
        niveau = ('CRITIQUE' if row['sev_moy'] > 75 else
                  'ÉLEVÉ' if row['sev_moy'] > 55 else 'MODÉRÉ')
        folium.CircleMarker(
            location=[row['GPS_Latitude_site'], row['GPS_Longitude_site']],
            radius=6 + row['sev_moy'] * 0.15,
            color=color, fill=True, fill_color=color, fill_opacity=0.75,
            popup=folium.Popup(
                f"<b>{row['Description_site_comptage']}</b><br>"
                f"Nb anomalies : {row['count']}<br>"
                f"Sévérité moy. : {row['sev_moy']:.1f}/100 ({niveau})<br>"
                f"Vol max : {row['max_vol']:.0f} véh.",
                max_width=250),
            tooltip=f"{row['Description_site_comptage']} — {niveau}"
        ).add_to(m)

    # Marqueurs clusters DBSCAN
    if n_clusters > 0:
        for cid in range(n_clusters):
            cl_pts = df_anom[df_anom['CLUSTER_SPATIAL'] == cid]
            centroid_lat = cl_pts['GPS_Latitude_site'].mean()
            centroid_lon = cl_pts['GPS_Longitude_site'].mean()
            folium.Marker(
                location=[centroid_lat, centroid_lon],
                icon=folium.Icon(color='darkred', icon='exclamation-sign', prefix='glyphicon'),
                tooltip=f"Cluster spatial #{cid} — {len(cl_pts)} anomalies"
            ).add_to(m)

    folium.LayerControl().add_to(m)
    m.save("carte_anomalies_dakar_v2.html")
    print("  Carte Folium sauvegardée → carte_anomalies_dakar_v2.html")
except ImportError:
    print("  [INFO] folium non installé — carte ignorée. pip install folium")

# ─────────────────────────────────────────────────────────────────────────────
# 10. EXPORT CSV ENRICHI
# ─────────────────────────────────────────────────────────────────────────────
# Colonnes de base toujours présentes
cols_export = [
    'Date_comptage', 'Heure_debut_comptage', 'Minute_debut_comptage',
    'Description_site_comptage', 'GPS_Latitude_site', 'GPS_Longitude_site',
    'Categorie_vehicule', 'Sens_circulation', 'Nombre_vehicules_amplitude',
    'TRANCHE_HEURE', 'DAY_OF_WEEK',
    'VOL_MEAN', 'ZSCORE', 'ANOMALY_ZSCORE',
    'ANOMALY_IF', 'SCORE_IF',
    'ANOMALY_LOF', 'SCORE_LOF',
    'VOTES', 'CONSENSUS', 'SEVERITE', 'NIVEAU_SEVERITE'
]

# Colonnes optionnelles — ajoutées si elles existent dans le CSV source
for col_opt in ['Identifiant_site_comptage', 'Vitesse_moyenne_amplitude',
                'Description_sens_circulation']:
    if col_opt in df.columns and col_opt not in cols_export:
        cols_export.insert(0, col_opt)

# Créer les colonnes manquantes avec des valeurs par défaut si absentes
if 'Identifiant_site_comptage' not in df.columns:
    df['Identifiant_site_comptage'] = df['Description_site_comptage'].astype(str)
    cols_export.insert(0, 'Identifiant_site_comptage')
if 'Vitesse_moyenne_amplitude' not in df.columns:
    df['Vitesse_moyenne_amplitude'] = 0.0
    cols_export.append('Vitesse_moyenne_amplitude')
if 'Description_sens_circulation' not in df.columns:
    df['Description_sens_circulation'] = df['Sens_circulation'].astype(str)
    cols_export.append('Description_sens_circulation')

df[cols_export].to_csv('anomalies_results_v2.csv', index=False, encoding='utf-8-sig')
print(f"  CSV enrichi exporté → anomalies_results_v2.csv")

# ─────────────────────────────────────────────────────────────────────────────
# 11. RÉSUMÉ CONSOLE
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*65)
print("RÉSUMÉ DÉTECTION D'ANOMALIES v2")
print("="*65)
print(f"  Total enregistrements       : {len(df):,}")
print(f"  Anomalies détectées (cons.) : {df['CONSENSUS'].sum():,} ({df['CONSENSUS'].mean()*100:.1f}%)")
print(f"  Dont sévérité Critique      : {(df['NIVEAU_SEVERITE']=='Critique').sum():,}")
print(f"  Dont sévérité Élevée        : {(df['NIVEAU_SEVERITE']=='Élevé').sum():,}")
print(f"  Clusters spatiaux DBSCAN    : {n_clusters}")

print("\nTop 10 sites anomaux :")
print(top_sites[['Description_site_comptage','n_anom','sev_moy']].head(10).to_string(index=False))
print("\n✓ Terminé — anomalies v2 complet.")
