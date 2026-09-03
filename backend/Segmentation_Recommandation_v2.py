"""
Segmentation usagers + Recommandation de transport — Dakar v2
Source : CETUD_BD_EMD_INDIVIDU_COMPILE.xls

Améliorations par rapport à v1 :
  - Suppression des cellules/blocs dupliqués
  - SEGMENT_LABELS cohérent sur une seule définition (post-analyse)
  - PCA 2D pour visualiser les clusters
  - predire() corrigée : même pipeline imputer/scaler que l'entraînement,
    liste de features cohérente
  - Seuil de confiance pour les recommandations (avertissement si < 40%)
  - Gestion des valeurs inconnues en entrée
  - Sauvegarde complète des artefacts + métadonnées
  - Cross-validation du Random Forest
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.rcParams['font.family'] = 'DejaVu Sans'
import matplotlib.pyplot as plt
import seaborn as sns
import warnings
import joblib
import json
warnings.filterwarnings('ignore')

from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.metrics import (silhouette_score, classification_report,
                              confusion_matrix, accuracy_score)
from sklearn.impute import SimpleImputer

# ─────────────────────────────────────────────────────────────────────────────
# DICTIONNAIRES DE CODES (EMD Dakar)
# ─────────────────────────────────────────────────────────────────────────────
MODE_LABELS = {
    1:'A pied', 2:'Calèche/Charrette', 3:'Bicyclette',
    4:'Mobylette/Moto conducteur', 5:'Mobylette/Moto passager',
    6:'Voiture particulière conducteur', 7:'Voiture particulière passager',
    8:'Taxi', 9:'Taxi clando', 10:'Minibus (14 places)',
    11:'Car rapide', 12:'Ndiaga Ndiaye', 13:'DDD',
    14:'Tata', 15:'PTB', 16:'Bus scolaire/Ramassage employeur',
    17:'Car interurbain', 18:'Pirogue/Bateau', 19:'Autre'
}

MODE_GROUPES = {
    1:'Marche', 2:'Autre', 3:'Vélo', 4:'Moto', 5:'Moto',
    6:'Voiture', 7:'Voiture', 8:'Taxi/Clando', 9:'Taxi/Clando',
    10:'Transport Commun', 11:'Transport Commun', 12:'Transport Commun',
    13:'Transport Commun', 14:'Transport Commun', 15:'Transport Commun',
    16:'Transport Commun', 17:'Autre', 18:'Autre', 19:'Autre'
}

# ─────────────────────────────────────────────────────────────────────────────
# 1. CHARGEMENT & PRÉPARATION
# ─────────────────────────────────────────────────────────────────────────────
print("Chargement des données...")
df_raw = pd.read_excel(r'PFE (partie usager)\CETUD_BD_EMD_INDIVIDU_COMPILE.xls')
print(f"  {df_raw.shape[0]:,} individus | {df_raw.shape[1]} variables")

df = df_raw[[
    'P1','P2','P9','P20','P10',
    'P34_1','P14_1','P65','P80','P138',
    'P36','P35','P16','P15',
    'P61_2','P68',
]].copy()

df.columns = [
    'sexe','age','niveau_instruction','actif','etudiant',
    'mode_travail','mode_ecole',
    'permis','freq_tc','nb_deplacements',
    'duree_travail','cout_travail','duree_ecole','cout_ecole',
    'revenu','nb_vehicules'
]

df['mode_principal']   = df['mode_travail'].fillna(df['mode_ecole'])
df['duree_principale'] = df['duree_travail'].fillna(df['duree_ecole'])
df['cout_principal']   = df['cout_travail'].fillna(df['cout_ecole'])

# Nettoyer codes 9/99
df['permis']             = df['permis'].replace(9, np.nan)
df['mode_principal']     = df['mode_principal'].replace(99, np.nan)
df['niveau_instruction'] = df['niveau_instruction'].replace(9, np.nan)

df['groupe_mode'] = df['mode_principal'].map(MODE_GROUPES)
df['mode_label']  = df['mode_principal'].map(MODE_LABELS)

print(f"  Dataset préparé : {df.shape}")
print(f"  Lignes avec mode principal connu : {df['groupe_mode'].notna().sum():,}")

# ─────────────────────────────────────────────────────────────────────────────
# 2. EXPLORATION RAPIDE
# ─────────────────────────────────────────────────────────────────────────────
fig_expl, axes = plt.subplots(2, 3, figsize=(18, 10))
fig_expl.suptitle('Exploration des données — EMD Dakar', fontsize=16, fontweight='bold')

axes[0,0].hist(df['age'].dropna(), bins=30, color='steelblue', edgecolor='white')
axes[0,0].set_title('Distribution des âges')
axes[0,0].set_xlabel('Âge (années)')

sexe_c = df['sexe'].map({1:'Homme',2:'Femme'}).value_counts()
axes[0,1].pie(sexe_c, labels=sexe_c.index, autopct='%1.1f%%', colors=['#4A90D9','#E87D7D'])
axes[0,1].set_title('Répartition par sexe')

mode_c = df['groupe_mode'].value_counts()
axes[0,2].barh(mode_c.index, mode_c.values, color='#2ECC71')
axes[0,2].set_title('Modes de transport utilisés')
axes[0,2].set_xlabel("Nombre d'usagers")

durees = df['duree_principale'].dropna()
axes[1,0].hist(durees[durees < 120], bins=30, color='#F39C12', edgecolor='white')
axes[1,0].set_title('Durée des trajets (< 2h)')
axes[1,0].set_xlabel('Durée (minutes)')

couts = df['cout_principal'].dropna()
axes[1,1].hist(couts[couts < 1000], bins=30, color='#9B59B6', edgecolor='white')
axes[1,1].set_title('Coût des trajets (< 1000 FCFA)')
axes[1,1].set_xlabel('Coût (FCFA)')

freq_labels = {1:'Tous les jours',2:'1x/semaine',3:'1x/mois',4:'Rarement',5:'Jamais'}
freq_c = df['freq_tc'].map(freq_labels).value_counts()
axes[1,2].bar(range(len(freq_c)), freq_c.values, color='#1ABC9C')
axes[1,2].set_xticks(range(len(freq_c)))
axes[1,2].set_xticklabels(freq_c.index, rotation=30, ha='right', fontsize=8)
axes[1,2].set_title("Fréquence d'utilisation TC")

plt.tight_layout()
plt.savefig('exploration_data.png', dpi=150, bbox_inches='tight')
plt.close()

# ─────────────────────────────────────────────────────────────────────────────
# 3. CLUSTERING K-MEANS
# ─────────────────────────────────────────────────────────────────────────────
features_cluster = [
    'age','sexe','niveau_instruction',
    'actif','etudiant','permis',
    'freq_tc','nb_deplacements',
    'duree_principale','cout_principal'
]

df_cluster = df[features_cluster].copy()
imputer_km = SimpleImputer(strategy='median')
X_cluster  = imputer_km.fit_transform(df_cluster)
scaler_km  = StandardScaler()
X_scaled   = scaler_km.fit_transform(X_cluster)

print("\nRecherche du K optimal...")
inertias, silhouettes = [], []
K_range = range(2, 9)

for k in K_range:
    km = KMeans(n_clusters=k, random_state=42, n_init=10)
    km.fit(X_scaled)
    inertias.append(km.inertia_)
    silhouettes.append(silhouette_score(X_scaled, km.labels_))
    print(f"  K={k} | Inertie={km.inertia_:,.0f} | Silhouette={silhouettes[-1]:.3f}")

# Visualisation coude + silhouette
fig_k, (ax_k1, ax_k2) = plt.subplots(1, 2, figsize=(14, 5))
ax_k1.plot(K_range, inertias, 'bo-', lw=2, markersize=8)
ax_k1.set_title('Méthode du Coude', fontsize=13, fontweight='bold')
ax_k1.set_xlabel('K'); ax_k1.set_ylabel('Inertie'); ax_k1.grid(alpha=0.3)

ax_k2.plot(K_range, silhouettes, 'rs-', lw=2, markersize=8)
ax_k2.set_title('Score de Silhouette', fontsize=13, fontweight='bold')
ax_k2.set_xlabel('K'); ax_k2.set_ylabel('Score Silhouette'); ax_k2.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('choix_k.png', dpi=150, bbox_inches='tight')
plt.close()

K_OPTIMAL = list(K_range)[silhouettes.index(max(silhouettes))]
print(f"\n  K optimal : {K_OPTIMAL} (silhouette = {max(silhouettes):.3f})")

# Entraînement final
kmeans = KMeans(n_clusters=K_OPTIMAL, random_state=42, n_init=10)
df['segment'] = kmeans.fit_predict(X_scaled)
print(f"\nTaille des segments :")
print(df['segment'].value_counts().sort_index())

# ─────────────────────────────────────────────────────────────────────────────
# 4. CARACTÉRISATION DES SEGMENTS
# ─────────────────────────────────────────────────────────────────────────────
profil = df.groupby('segment').agg(
    nb_individus  = ('age','count'),
    age_moy       = ('age','mean'),
    pct_hommes    = ('sexe', lambda x: (x==1).mean()*100),
    pct_actifs    = ('actif', lambda x: (x==1).mean()*100),
    pct_etudiants = ('etudiant', lambda x: (x==1).mean()*100),
    pct_permis    = ('permis', lambda x: (x==1).mean()*100),
    freq_tc_moy   = ('freq_tc','mean'),
    nb_depl_moy   = ('nb_deplacements','mean'),
    duree_moy     = ('duree_principale','mean'),
    cout_moy      = ('cout_principal','mean'),
).round(1)

print("\n=== PROFILS DES SEGMENTS ===")
print(profil.T.to_string())

fig_heat, ax_heat = plt.subplots(figsize=(12, 6))
profil_norm = (profil - profil.min()) / (profil.max() - profil.min() + 1e-9)
sns.heatmap(profil_norm.T, annot=profil.T, fmt='.1f', cmap='YlOrRd',
            linewidths=0.5, xticklabels=[f'Segment {i}' for i in profil.index],
            ax=ax_heat)
ax_heat.set_title('Caractérisation des segments usagers', fontsize=14, fontweight='bold')
plt.tight_layout()
plt.savefig('heatmap_segments.png', dpi=150, bbox_inches='tight')
plt.close()

# ─────────────────────────────────────────────────────────────────────────────
# 5. LABELS MÉTIER — DÉFINITION UNIQUE (adapter après analyse profil)
# ─────────────────────────────────────────────────────────────────────────────
# IMPORTANT : ajuster ces labels selon les profils affichés ci-dessus
# La logique : segment avec plus d'étudiants → 'Étudiants', etc.
def auto_label(row):
    """Attribution automatique du label selon le profil dominant."""
    if row['pct_etudiants'] > 40:
        return 'Étudiants mobilité douce'
    elif row['pct_actifs'] > 60 and row['pct_permis'] > 30:
        return 'Actifs motorisés'
    elif row['pct_actifs'] > 50 and row['cout_moy'] < 200:
        return 'Actifs TC réguliers'
    elif row['duree_moy'] < 15 and row['cout_moy'] < 50:
        return 'Piétons de proximité'
    else:
        return 'Travailleurs informels'

SEGMENT_LABELS = {int(i): auto_label(row) for i, row in profil.iterrows()}

SEGMENT_CONSEILS = {
    'Actifs TC réguliers':
        'Vous utilisez quotidiennement les transports en commun. '
        'Un abonnement mensuel (DDD, car rapide) réduit vos dépenses. '
        'Privilégiez les départs avant 7h30 pour éviter la saturation.',
    'Actifs motorisés':
        'Vous possédez un véhicule personnel. Le covoiturage via des '
        'applications locales peut réduire vos frais et désengorger '
        'les axes Dakar-Plateau.',
    'Étudiants mobilité douce':
        'Les modes doux (vélo, marche) et les TC économiques (car rapide, '
        'DDD) sont adaptés à votre budget. Les abonnements étudiants TC '
        'offrent des tarifs préférentiels.',
    'Piétons de proximité':
        'Vos déplacements courts et peu coûteux sont efficaces. '
        'Pour les destinations plus éloignées, le car rapide reste '
        'l\'option la plus accessible.',
    'Travailleurs informels':
        'Le taxi clando et le car rapide sont vos modes les plus adaptés '
        'à vos horaires atypiques. Méfiez-vous des surcharges aux heures '
        'de pointe (7h-9h et 17h-20h).',
}

# Ajout générique pour les segments non couverts
for seg_id, label in SEGMENT_LABELS.items():
    if label not in SEGMENT_CONSEILS:
        SEGMENT_CONSEILS[label] = 'Consultez les options de transport disponibles dans votre zone.'

df['segment_label']   = df['segment'].map(SEGMENT_LABELS)
df['segment_conseil'] = df['segment_label'].map(SEGMENT_CONSEILS)
print("\n✅ Labels segments définis (une seule définition) :")
print(df[['segment','segment_label']].value_counts().to_string())

# ─────────────────────────────────────────────────────────────────────────────
# 6. PCA 2D — VISUALISATION DES CLUSTERS
# ─────────────────────────────────────────────────────────────────────────────
pca = PCA(n_components=2, random_state=42)
X_pca = pca.fit_transform(X_scaled)

fig_pca, ax_pca = plt.subplots(figsize=(10, 7))
palette = plt.cm.get_cmap('tab10', K_OPTIMAL)
for seg in range(K_OPTIMAL):
    mask = df['segment'] == seg
    ax_pca.scatter(X_pca[mask, 0], X_pca[mask, 1],
                   c=[palette(seg)], s=5, alpha=0.4,
                   label=f"Seg.{seg} — {SEGMENT_LABELS.get(seg,'?')}")
ax_pca.set_title('PCA 2D — Visualisation des clusters K-Means', fontsize=14, fontweight='bold')
ax_pca.set_xlabel(f'PC1 ({pca.explained_variance_ratio_[0]*100:.1f}% variance)')
ax_pca.set_ylabel(f'PC2 ({pca.explained_variance_ratio_[1]*100:.1f}% variance)')
ax_pca.legend(fontsize=9, markerscale=4)
ax_pca.grid(alpha=0.3)
plt.tight_layout()
plt.savefig('pca_clusters.png', dpi=150, bbox_inches='tight')
plt.close()
print(f"\n  PCA : PC1+PC2 expliquent {pca.explained_variance_ratio_[:2].sum()*100:.1f}% de la variance")

# ─────────────────────────────────────────────────────────────────────────────
# 7. RANDOM FOREST — RECOMMANDATION DE MODE
# ─────────────────────────────────────────────────────────────────────────────
features_rf = [
    'age','sexe','niveau_instruction',
    'actif','etudiant','permis',
    'freq_tc','nb_deplacements','nb_vehicules',
    'revenu','duree_principale','cout_principal'
]

df_rf = df[features_rf + ['groupe_mode']].dropna(subset=['groupe_mode']).copy()

# Filtrer groupes avec >= 30 exemples
counts = df_rf['groupe_mode'].value_counts()
groupes_valides = counts[counts >= 30].index
df_rf = df_rf[df_rf['groupe_mode'].isin(groupes_valides)]
print(f"\nDataset RF : {df_rf.shape}")
print(df_rf['groupe_mode'].value_counts().to_string())

X_rf = df_rf[features_rf]
y_rf = df_rf['groupe_mode']

imputer_rf = SimpleImputer(strategy='median')
X_rf_imp   = imputer_rf.fit_transform(X_rf)

le_rf  = LabelEncoder()
y_enc  = le_rf.fit_transform(y_rf)

X_train, X_test, y_train, y_test = train_test_split(
    X_rf_imp, y_enc, test_size=0.2, random_state=42, stratify=y_enc)

rf = RandomForestClassifier(
    n_estimators=200, max_depth=10, min_samples_split=5,
    min_samples_leaf=3, class_weight='balanced',
    random_state=42, n_jobs=-1)
rf.fit(X_train, y_train)

y_pred = rf.predict(X_test)
acc    = accuracy_score(y_test, y_pred)

# Cross-validation
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_acc = cross_val_score(rf, X_rf_imp, y_enc, cv=skf, scoring='accuracy')
cv_f1  = cross_val_score(rf, X_rf_imp, y_enc, cv=skf, scoring='f1_macro')

print(f"\n✅ Random Forest entraîné")
print(f"   Accuracy test  : {acc:.2%}")
print(f"   CV Accuracy    : {cv_acc.mean():.2%} ± {cv_acc.std():.2%}")
print(f"   CV F1-macro    : {cv_f1.mean():.3f} ± {cv_f1.std():.3f}")
print()
print(classification_report(y_test, y_pred, target_names=le_rf.classes_))

# Importance des features
importances = pd.Series(rf.feature_importances_, index=features_rf).sort_values(ascending=True)
fig_imp, ax_imp = plt.subplots(figsize=(10, 6))
bars_imp = ax_imp.barh(importances.index, importances.values, color='#3498DB')
ax_imp.set_xlabel('Importance')
ax_imp.set_title('Importance des variables — Recommandation de mode', fontsize=13, fontweight='bold')
for bar, val in zip(bars_imp, importances.values):
    ax_imp.text(val+0.002, bar.get_y()+bar.get_height()/2, f'{val:.3f}', va='center', fontsize=9)
plt.tight_layout()
plt.savefig('importance_features.png', dpi=150, bbox_inches='tight')
plt.close()

# Matrice de confusion
cm = confusion_matrix(y_test, y_pred)
fig_cm, ax_cm = plt.subplots(figsize=(10, 8))
sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
            xticklabels=le_rf.classes_, yticklabels=le_rf.classes_, ax=ax_cm)
ax_cm.set_title('Matrice de confusion — Recommandation de mode', fontsize=13, fontweight='bold')
ax_cm.set_xlabel('Prédit'); ax_cm.set_ylabel('Réel')
plt.xticks(rotation=30, ha='right')
plt.tight_layout()
plt.savefig('confusion_matrix.png', dpi=150, bbox_inches='tight')
plt.close()

# ─────────────────────────────────────────────────────────────────────────────
# 8. STATISTIQUES ENRICHIES PAR MODE (coût / durée précis)
# ─────────────────────────────────────────────────────────────────────────────
print('\n=== STATISTIQUES ENRICHIES PAR MODE ===')

df_valid = df[df['groupe_mode'].notna()].copy()

# ── 8a. Stats globales par mode avec percentiles complets ──────────────────
def enriched_stats(grp):
    d = grp['duree_principale'].dropna()
    c = grp['cout_principal'].dropna()
    # Nb déplacements par jour (médiane sur le groupe)
    n = grp['nb_deplacements'].median() if 'nb_deplacements' in grp else 2
    jours_mois = 22  # jours ouvrés
    return pd.Series({
        # Durée
        'duree_min'    : round(d.quantile(0.05), 1),
        'duree_q1'     : round(d.quantile(0.25), 1),
        'duree_median' : round(d.median(), 1),
        'duree_moy'    : round(d.mean(), 1),
        'duree_q3'     : round(d.quantile(0.75), 1),
        'duree_max'    : round(d.quantile(0.95), 1),
        'duree_std'    : round(d.std(), 1),
        # Coût par trajet
        'cout_min'     : round(c.quantile(0.05), 0),
        'cout_q1'      : round(c.quantile(0.25), 0),
        'cout_median'  : round(c.median(), 0),
        'cout_moy'     : round(c.mean(), 0),
        'cout_q3'      : round(c.quantile(0.75), 0),
        'cout_max'     : round(c.quantile(0.95), 0),
        'cout_std'     : round(c.std(), 0),
        # Coût mensuel estimé (aller-retour × jours ouvrés)
        'cout_mensuel_min': round(c.quantile(0.25) * 2 * jours_mois, 0),
        'cout_mensuel_moy': round(c.mean()         * 2 * jours_mois, 0),
        'cout_mensuel_max': round(c.quantile(0.75) * 2 * jours_mois, 0),
        # Meta
        'nb_usagers'   : len(grp),
        'part_marche'  : round((grp['groupe_mode'] == 'Marche').mean() * 100, 1),
    })

stats_mode = df_valid.groupby('groupe_mode').apply(enriched_stats).reset_index()
# Remplacer NaN (modes gratuits comme Marche, Vélo)
for col in ['cout_min','cout_q1','cout_median','cout_moy','cout_q3','cout_max',
            'cout_mensuel_min','cout_mensuel_moy','cout_mensuel_max','cout_std']:
    stats_mode[col] = stats_mode[col].fillna(0)

print(stats_mode[['groupe_mode','duree_median','duree_q1','duree_q3',
                   'cout_median','cout_q1','cout_q3','cout_mensuel_moy','nb_usagers']].to_string(index=False))

# ── 8b. Stats par segment × mode (précision par profil) ────────────────────
print('\n=== STATISTIQUES SEGMENT × MODE ===')

def seg_mode_stats(grp):
    d = grp['duree_principale'].dropna()
    c = grp['cout_principal'].dropna()
    if len(d) < 3:
        return pd.Series({'duree_median': np.nan, 'cout_median': np.nan,
                          'cout_mensuel_moy': np.nan, 'nb': len(grp)})
    return pd.Series({
        'duree_median'    : round(d.median(), 1),
        'duree_q1'        : round(d.quantile(0.25), 1),
        'duree_q3'        : round(d.quantile(0.75), 1),
        'cout_median'     : round(c.median(), 0),
        'cout_q1'         : round(c.quantile(0.25), 0),
        'cout_q3'         : round(c.quantile(0.75), 0),
        'cout_mensuel_moy': round(c.mean() * 2 * 22, 0),
        'nb'              : len(grp),
    })

df_valid['segment_label'] = df_valid['segment'].map(SEGMENT_LABELS)
stats_seg_mode = (df_valid[df_valid['segment_label'].notna()]
                  .groupby(['segment_label', 'groupe_mode'])
                  .apply(seg_mode_stats)
                  .reset_index()
                  .dropna(subset=['duree_median']))

print(stats_seg_mode.to_string(index=False))

# ── 8c. Export JSON enrichi ─────────────────────────────────────────────────
stats_json = stats_mode.set_index('groupe_mode').to_dict(orient='index')
# Ajouter stats par segment dans chaque mode
for _, row in stats_seg_mode.iterrows():
    mode  = row['groupe_mode']
    label = row['segment_label']
    if mode in stats_json:
        if 'par_segment' not in stats_json[mode]:
            stats_json[mode]['par_segment'] = {}
        stats_json[mode]['par_segment'][label] = {
            'duree_median'    : row.get('duree_median', np.nan),
            'duree_q1'        : row.get('duree_q1', np.nan),
            'duree_q3'        : row.get('duree_q3', np.nan),
            'cout_median'     : row.get('cout_median', np.nan),
            'cout_q1'         : row.get('cout_q1', np.nan),
            'cout_q3'         : row.get('cout_q3', np.nan),
            'cout_mensuel_moy': row.get('cout_mensuel_moy', np.nan),
            'nb'              : int(row.get('nb', 0)),
        }

# Convertir NaN → None pour JSON
def clean_nan(obj):
    if isinstance(obj, dict):
        return {k: clean_nan(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [clean_nan(v) for v in obj]
    if isinstance(obj, float) and np.isnan(obj):
        return None
    return obj

stats_json_clean = clean_nan(stats_json)
with open('stats_par_mode.json', 'w', encoding='utf-8') as f:
    json.dump(stats_json_clean, f, ensure_ascii=False, indent=2)
print('\n✅ stats_par_mode.json enrichi sauvegardé')

# ─────────────────────────────────────────────────────────────────────────────
# 9. SAUVEGARDE MODÈLES & MÉTADONNÉES
# ─────────────────────────────────────────────────────────────────────────────
joblib.dump(kmeans,      'kmeans_model.pkl')
joblib.dump(scaler_km,   'kmeans_scaler.pkl')
joblib.dump(imputer_km,  'kmeans_imputer.pkl')
joblib.dump(pca,         'kmeans_pca.pkl')
joblib.dump(rf,          'rf_model.pkl')
joblib.dump(imputer_rf,  'rf_imputer.pkl')
joblib.dump(le_rf,       'rf_label_encoder.pkl')

meta = {
    'features_cluster': features_cluster,
    'features_rf': features_rf,
    'segment_labels': {str(k): v for k, v in SEGMENT_LABELS.items()},
    'segment_conseils': SEGMENT_CONSEILS,
    'mode_labels': {str(k): v for k, v in MODE_LABELS.items()},
    'mode_groupes': {str(k): v for k, v in MODE_GROUPES.items()},
    'classes_rf': list(le_rf.classes_),
    'k_clusters': K_OPTIMAL,
    'rf_accuracy': round(float(acc), 4),
    'rf_cv_f1_macro': round(float(cv_f1.mean()), 4),
}
with open('metadata.json', 'w', encoding='utf-8') as f:
    json.dump(meta, f, ensure_ascii=False, indent=2)

print('\n✅ Tous les modèles sauvegardés.')

# ─────────────────────────────────────────────────────────────────────────────
# 10. FONCTION predire() — CORRIGÉE
#     Pipeline cohérent : imputer_km / scaler_km pour K-Means
#                         imputer_rf            pour Random Forest
#     Seuil de confiance ajouté (avertissement si < 40%)
# ─────────────────────────────────────────────────────────────────────────────
SEUIL_CONFIANCE = 0.40
JOURS_MOIS      = 22   # jours ouvrés par mois

def predire(age, sexe, niveau_instruction, actif, etudiant,
            permis, freq_tc, nb_deplacements,
            nb_vehicules=0, revenu=0, duree_est=25, cout_est=200):
    """
    Retourne le segment, le mode recommandé et des estimations précises
    de coût et durée basées sur les stats segment × mode.

    Fourchettes basées sur Q1–Q3 (intervalle de confiance 50%).
    Coût mensuel estimé = coût médian aller-retour × jours ouvrés.
    """
    # ── Segmentation (10 features) ──
    X_seg     = np.array([[age, sexe, niveau_instruction, actif, etudiant,
                           permis, freq_tc, nb_deplacements,
                           duree_est, cout_est]], dtype=float)
    X_seg_imp = imputer_km.transform(X_seg)
    X_seg_sc  = scaler_km.transform(X_seg_imp)
    segment   = int(kmeans.predict(X_seg_sc)[0])
    label     = SEGMENT_LABELS.get(segment, f'Segment {segment}')
    conseil   = SEGMENT_CONSEILS.get(label, '')

    # ── Recommandation mode (12 features) ──
    X_rf_in  = np.array([[age, sexe, niveau_instruction, actif, etudiant,
                          permis, freq_tc, nb_deplacements, nb_vehicules,
                          revenu, duree_est, cout_est]], dtype=float)
    X_rf_imp = imputer_rf.transform(X_rf_in)
    probas   = rf.predict_proba(X_rf_imp)[0]
    idx_sort = np.argsort(probas)[::-1]
    mode_rec = le_rf.classes_[idx_sort[0]]
    confiance= probas[idx_sort[0]]

    top3 = [(le_rf.classes_[i], round(float(probas[i]) * 100, 1)) for i in idx_sort[:3]]

    # ── Estimation coût/durée précise ──────────────────────────────────────
    stats_global  = stats_json.get(mode_rec, {})
    stats_seg_grp = stats_global.get('par_segment', {}).get(label, {})

    # Priorité : stats segment × mode → stats globales mode → valeurs par défaut
    def pick(key_seg, key_global, default):
        v = stats_seg_grp.get(key_seg) or stats_global.get(key_global)
        return v if v is not None else default

    duree_q1     = pick('duree_q1',     'duree_q1',     duree_est * 0.7)
    duree_median = pick('duree_median',  'duree_median', duree_est)
    duree_q3     = pick('duree_q3',     'duree_q3',     duree_est * 1.4)
    cout_q1      = pick('cout_q1',      'cout_q1',      0)
    cout_median  = pick('cout_median',  'cout_median',  cout_est)
    cout_q3      = pick('cout_q3',      'cout_q3',      cout_est * 1.5)
    cout_mensuel = pick('cout_mensuel_moy', 'cout_mensuel_moy',
                        cout_median * 2 * JOURS_MOIS)

    # Modes gratuits (marche, vélo) → coût = 0
    if mode_rec in ('Marche', 'Vélo'):
        cout_q1 = cout_median = cout_q3 = cout_mensuel = 0

    # Part du budget transport (si revenu connu)
    part_budget = None
    if revenu > 0 and cout_mensuel > 0:
        part_budget = round((cout_mensuel / revenu) * 100, 1)

    # Source de l'estimation
    source = 'segment×mode' if stats_seg_grp else 'mode'
    nb_ref = int(stats_seg_grp.get('nb', stats_global.get('nb_usagers', 0)) or 0)

    # Avertissement confiance
    confiance_flag = None
    if confiance < SEUIL_CONFIANCE:
        confiance_flag = (f"⚠️ Confiance {confiance*100:.0f}% — profil atypique, "
                          f"résultat indicatif")

    return {
        # Segmentation
        'segment'          : segment,
        'segment_label'    : label,
        'segment_conseil'  : conseil,

        # Recommandation
        'mode_recommande'  : mode_rec,
        'confiance'        : f"{confiance * 100:.1f}%",
        'confiance_flag'   : confiance_flag,
        'top3_modes'       : top3,

        # Durée — fourchette Q1–Q3 (intervalle 50 %)
        'duree_mediane'    : f"{duree_median:.0f} min",
        'duree_fourchette' : f"{duree_q1:.0f} – {duree_q3:.0f} min",
        'duree_q1'         : f"{duree_q1:.0f} min",
        'duree_q3'         : f"{duree_q3:.0f} min",

        # Coût par trajet
        'cout_median'      : f"{cout_median:.0f} FCFA",
        'cout_fourchette'  : f"{cout_q1:.0f} – {cout_q3:.0f} FCFA",
        'cout_q1'          : f"{cout_q1:.0f} FCFA",
        'cout_q3'          : f"{cout_q3:.0f} FCFA",

        # Coût mensuel (aller-retour × 22 jours)
        'cout_mensuel'     : f"{cout_mensuel:.0f} FCFA",
        'cout_mensuel_str' : f"~{cout_mensuel:,.0f} FCFA/mois".replace(',', ' '),

        # Part du budget si revenu fourni
        'part_budget'      : f"{part_budget:.1f}% du revenu" if part_budget else None,

        # Méta-qualité
        'estimation_source': source,
        'nb_reference'     : nb_ref,
    }

# ── TESTS ──
def print_result(titre, r):
    print(f"\n{'='*65}")
    print(f"  {titre}")
    print('='*65)
    print(f"  Segment         : {r['segment']} — {r['segment_label']}")
    print(f"  Mode recommandé : {r['mode_recommande']}  (confiance {r['confiance']})")
    print(f"  Top 3 modes     : {r['top3_modes']}")
    print(f"  ── Durée ────────────────────────────────────────────")
    print(f"  Médiane         : {r['duree_mediane']}")
    print(f"  Fourchette 50%  : {r['duree_fourchette']}  (Q1–Q3)")
    print(f"  ── Coût / trajet ────────────────────────────────────")
    print(f"  Médian          : {r['cout_median']}")
    print(f"  Fourchette 50%  : {r['cout_fourchette']}  (Q1–Q3)")
    print(f"  ── Coût mensuel (A/R × 22 jours) ───────────────────")
    print(f"  Estimation      : {r['cout_mensuel_str']}")
    if r.get('part_budget'):
        print(f"  Part du revenu  : {r['part_budget']}")
    print(f"  Source stats    : {r['estimation_source']} ({r['nb_reference']} usagers de référence)")
    if r.get('confiance_flag'):
        print(f"  ⚠️  {r['confiance_flag']}")
    print(f"  ── Conseil ──────────────────────────────────────────")
    print(f"  {r['segment_conseil']}")

print_result("TEST 1 — Étudiant 20 ans, sans permis, TC quotidien",
    predire(age=20, sexe=1, niveau_instruction=4, actif=2,
            etudiant=1, permis=2, freq_tc=1, nb_deplacements=4))

print_result("TEST 2 — Actif motorisé 40 ans, voiture + permis, revenu 300K",
    predire(age=40, sexe=1, niveau_instruction=3, actif=1,
            etudiant=2, permis=1, freq_tc=4, nb_deplacements=2,
            nb_vehicules=1, revenu=300000))

print_result("TEST 3 — Femme active 35 ans, TC quotidien, revenu 80K",
    predire(age=35, sexe=2, niveau_instruction=3, actif=1,
            etudiant=2, permis=2, freq_tc=1, nb_deplacements=3,
            revenu=80000))

print_result("TEST 4 — Travailleur informel 28 ans, faible revenu",
    predire(age=28, sexe=1, niveau_instruction=2, actif=1,
            etudiant=2, permis=2, freq_tc=2, nb_deplacements=3,
            revenu=45000))

print("\n✓ Terminé — segmentation + recommandation v2 complet.")
