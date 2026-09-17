"""
Modèle ML v2 : Prédiction des zones à risque d'inaccessibilité
Source : EMD Ménage CETUD / Dakar
Améliorations :
  - Correction bug score_tc_manque ('Oui' au lieu de 'TCOui')
  - Correction radar chart (5e dimension n'était pas Routes manquantes)
  - Ajout XGBoost comme 4e modèle
  - SMOTE pour déséquilibre de classes
  - SHAP pour interprétabilité
  - Seuil cible ajusté au 65e percentile pour meilleur équilibre
  - Validation croisée stratifiée sur tous les modèles
  - F1-Score macro comme métrique principale (plus robuste qu'AUC seul)
  - Export du meilleur modèle (.pkl)
"""

import pandas as pd
import numpy as np
import matplotlib
matplotlib.rcParams['font.family'] = 'DejaVu Sans'
import matplotlib.pyplot as plt
import warnings
warnings.filterwarnings('ignore')

from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split, cross_val_score, StratifiedKFold
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.metrics import (classification_report, confusion_matrix,
                             roc_auc_score, roc_curve, f1_score)
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
import joblib

# Optionnel – installer si absent : pip install xgboost imbalanced-learn shap
try:
    from xgboost import XGBClassifier
    USE_XGB = True
except ImportError:
    USE_XGB = False
    print("  [INFO] XGBoost non installé — modèle ignoré. pip install xgboost")

try:
    from imblearn.over_sampling import SMOTE
    USE_SMOTE = True
except ImportError:
    USE_SMOTE = False
    print("  [INFO] imbalanced-learn non installé — SMOTE ignoré. pip install imbalanced-learn")

try:
    import shap
    USE_SHAP = True
except ImportError:
    USE_SHAP = False
    print("  [INFO] SHAP non installé — graphique ignoré. pip install shap")

# ─────────────────────────────────────────────────────────────────────────────
# 1. CHARGEMENT
# ─────────────────────────────────────────────────────────────────────────────
print("Chargement des données...")
data = pd.read_excel(r'PFE (partie usager)\CETUD_BD_EMD_MENAGE_COMPILE.xls', sheet_name='BASE MENAGE')
print(f"  {data.shape[0]} ménages, {data.shape[1]} variables")

# ─────────────────────────────────────────────────────────────────────────────
# 2. CONSTRUCTION DE LA VARIABLE CIBLE : score d'inaccessibilité composite
# ─────────────────────────────────────────────────────────────────────────────
print("\nConstruction de la variable cible...")
df = data.copy()

# Composante 1 : distance à l'arrêt TC (M66, en minutes à pied)
df['score_tc_distance'] = (df['M66'] > 10).astype(int)

# Composante 2 : inondation du quartier (M68)
inond_map = {'Jamais': 0, 'Rarement': 1, 'Souvent': 2, 'Tous les jours ou presque': 3}
df['score_inond'] = df['M68'].map(inond_map).fillna(0)
df['score_inond_bin'] = (df['score_inond'] >= 2).astype(int)

# Composante 3 : enclavement déclaré (M87)
df['score_enclavement'] = (df['M87'] == 'Oui').astype(int)

# Composante 4 : manque de routes carrossables (M72)
df['score_routes'] = (df['M72'] == 'Oui').astype(int)

# Composante 5 : manque de TC (M73) — CORRECTION : 'Oui' et non 'TCOui'
df['score_tc_manque'] = (df['M73'] == 'Oui').astype(int)

# Composante 6 : disparition des TC sous la pluie
tc_norm  = ['M67_1','M67_2','M67_3','M67_4','M67_5','M67_6','M67_7','M67_8']
tc_pluie = ['M69_1','M69_2','M69_3','M69_4','M69_5','M69_6','M69_7','M69_8']
for n, p in zip(tc_norm, tc_pluie):
    df[n] = (df[n] == 'Oui').astype(float)
    df[p] = (df[p] == 'Oui').astype(float)

df['tc_norm_total']  = df[tc_norm].sum(axis=1)
df['tc_pluie_total'] = df[tc_pluie].sum(axis=1)
df['score_pluie_tc'] = (df['tc_norm_total'] - df['tc_pluie_total']).clip(lower=0)
df['score_pluie_tc_bin'] = (df['score_pluie_tc'] >= 2).astype(int)

# Composante 7 : durées d'accès aux services essentiels
df['dur_sante']   = df['M95_D'].fillna(df['M95_D'].median())
df['dur_hopital'] = df['M97_D'].fillna(df['M97_D'].median())
df['dur_marche']  = df['M100_D'].fillna(df['M100_D'].median())

seuil_sante   = df['dur_sante'].quantile(0.75)
seuil_hopital = df['dur_hopital'].quantile(0.75)
seuil_marche  = df['dur_marche'].quantile(0.75)

df['score_acces_services'] = (
    (df['dur_sante']   > seuil_sante).astype(int) +
    (df['dur_hopital'] > seuil_hopital).astype(int) +
    (df['dur_marche']  > seuil_marche).astype(int)
)

# Score composite total pondéré
df['score_total'] = (
    df['score_tc_distance']   * 1.5 +
    df['score_inond_bin']     * 2.0 +
    df['score_enclavement']   * 2.0 +
    df['score_routes']        * 1.0 +
    df['score_tc_manque']     * 1.0 +
    df['score_pluie_tc_bin']  * 1.5 +
    df['score_acces_services']* 1.0
)

# Seuil 65e percentile → classes plus équilibrées (~35% risque élevé)
seuil_risque = df['score_total'].quantile(0.65)
df['RISQUE_INACC'] = (df['score_total'] >= seuil_risque).astype(int)

print(f"  Seuil de risque : {seuil_risque:.1f}")
pct = df['RISQUE_INACC'].mean() * 100
print(f"  Ménages à risque élevé : {df['RISQUE_INACC'].sum()} ({pct:.1f}%)")

# ─────────────────────────────────────────────────────────────────────────────
# 3. FEATURES
# ─────────────────────────────────────────────────────────────────────────────
print("\nPréparation des features...")

num_features = {
    'M66'  : 'Durée marche → arrêt TC (min)',
    'M21'  : 'Taille du ménage',
    'M27'  : 'Nb pièces logement',
    'M35'  : 'Temps accès eau potable (min)',
    'M51'  : 'Nb voitures',
    'M50'  : 'Nb motos',
    'M49'  : 'Nb vélos',
    'M59'  : 'Dépenses mensuelles ménage',
    'M63'  : 'Ancienneté dans le logement (ans)',
    'dur_sante'   : 'Durée accès centre santé',
    'dur_hopital' : 'Durée accès hôpital',
    'dur_marche'  : 'Durée accès marché alim.',
    'tc_norm_total': 'Nb types TC disponibles',
}

cat_features = {
    'I2'   : 'Strate',
    'M26'  : 'Type logement',
    'M28'  : "Statut d'occupation",
    'M29'  : 'Matériaux murs',
    'M30'  : 'Matériaux toit',
    'M31'  : 'Eau potable dans logement',
    'M37'  : 'Raccordement électrique',
    'M55'  : 'Saut de repas 7 jours',
    'M56'  : 'Saut de repas 12 mois',
    'M57'  : 'Manque de soins 12 mois',
    'M68'  : 'Inondation quartier',
}

feature_cols = list(num_features.keys()) + list(cat_features.keys())
X_raw = df[feature_cols].copy()

le_dict = {}
for col in cat_features.keys():
    le = LabelEncoder()
    X_raw[col] = X_raw[col].fillna('Inconnu').astype(str)
    X_raw[col] = le.fit_transform(X_raw[col])
    le_dict[col] = le

X = X_raw.values.astype(float)
y = df['RISQUE_INACC'].values
feature_names = list(num_features.values()) + list(cat_features.values())

# ─────────────────────────────────────────────────────────────────────────────
# 4. SPLIT + IMPUTATION + SMOTE
# ─────────────────────────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=42, stratify=y)
print(f"  Train : {X_train.shape[0]} | Test : {X_test.shape[0]}")
print(f"  Classe positive dans train : {y_train.mean()*100:.1f}%")

imputer = SimpleImputer(strategy='median')
X_train_imp = imputer.fit_transform(X_train)
X_test_imp  = imputer.transform(X_test)

# SMOTE pour équilibrer les classes si disponible
if USE_SMOTE:
    sm = SMOTE(random_state=42)
    X_train_res, y_train_res = sm.fit_resample(X_train_imp, y_train)
    print(f"  SMOTE appliqué : {X_train_res.shape[0]} exemples rééquilibrés")
else:
    X_train_res, y_train_res = X_train_imp, y_train

# ─────────────────────────────────────────────────────────────────────────────
# 5. MODÈLES
# ─────────────────────────────────────────────────────────────────────────────
print("\nEntraînement des modèles...")

models = {
    'Random Forest': RandomForestClassifier(
        n_estimators=200, max_depth=8, min_samples_leaf=5,
        class_weight='balanced', random_state=42, n_jobs=-1),
    'Gradient Boosting': GradientBoostingClassifier(
        n_estimators=150, max_depth=4, learning_rate=0.05,
        subsample=0.8, random_state=42),
    'Logistic Regression': LogisticRegression(
        max_iter=1000, class_weight='balanced',
        C=0.5, solver='lbfgs', random_state=42),
}

if USE_XGB:
    scale_pos = (y_train_res == 0).sum() / max((y_train_res == 1).sum(), 1)
    models['XGBoost'] = XGBClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        scale_pos_weight=scale_pos,
        eval_metric='logloss', random_state=42,
        use_label_encoder=False, verbosity=0)

results = {}
skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)

for name, model in models.items():
    model.fit(X_train_res, y_train_res)
    cv_aucs = cross_val_score(model, X_train_imp, y_train, cv=skf, scoring='roc_auc')
    cv_f1s  = cross_val_score(model, X_train_imp, y_train, cv=skf, scoring='f1')
    y_pred  = model.predict(X_test_imp)
    y_prob  = model.predict_proba(X_test_imp)[:, 1]
    auc     = roc_auc_score(y_test, y_prob)
    f1      = f1_score(y_test, y_pred)
    results[name] = {
        'model': model, 'y_pred': y_pred, 'y_prob': y_prob,
        'auc': auc, 'f1': f1,
        'cv_auc_mean': cv_aucs.mean(), 'cv_auc_std': cv_aucs.std(),
        'cv_f1_mean':  cv_f1s.mean(),  'cv_f1_std':  cv_f1s.std(),
    }
    print(f"  {name:20s} | AUC={auc:.3f} | F1={f1:.3f} | "
          f"CV-AUC={cv_aucs.mean():.3f}±{cv_aucs.std():.3f} | "
          f"CV-F1={cv_f1s.mean():.3f}±{cv_f1s.std():.3f}")

# Meilleur modèle selon F1 (plus robuste sur classes déséquilibrées)
best_name = max(results, key=lambda k: results[k]['f1'])
best = results[best_name]
print(f"\n  ✓ Meilleur modèle : {best_name} (F1={best['f1']:.3f}, AUC={best['auc']:.3f})")

# ─────────────────────────────────────────────────────────────────────────────
# 6. SCORES PAR ZONE
# ─────────────────────────────────────────────────────────────────────────────
X_full_imp = imputer.transform(X)
df['prob_risque'] = best['model'].predict_proba(X_full_imp)[:, 1]

zone_risk = (df.groupby('I2')
               .agg(prob_risque_moy=('prob_risque','mean'),
                    n_menages=('prob_risque','count'),
                    pct_risque_eleve=('RISQUE_INACC','mean'),
                    score_inond_moy=('score_inond','mean'),
                    enclavement_pct=('score_enclavement','mean'),
                    score_routes_pct=('score_routes','mean'),       # AJOUT
                    dur_sante_moy=('dur_sante','mean'),
                    tc_disponibles_moy=('tc_norm_total','mean'))
               .sort_values('prob_risque_moy', ascending=False)
               .reset_index())
zone_risk['rang_risque'] = range(1, len(zone_risk)+1)

# ─────────────────────────────────────────────────────────────────────────────
# 7. VISUALISATIONS
# ─────────────────────────────────────────────────────────────────────────────
print("\nGénération des graphiques...")

DARK   = '#0f1117'
PANEL  = '#1a1d27'
ACCENT = '#4f8ef7'
WARN   = '#f97316'
GOOD   = '#22c55e'
TEXT   = '#e2e8f0'
MUTED  = '#64748b'
PURPLE = '#a855f7'
colors_models = [ACCENT, WARN, GOOD, PURPLE]

fig = plt.figure(figsize=(24, 30))
fig.patch.set_facecolor(DARK)

ax_title = fig.add_axes([0, 0.96, 1, 0.04])
ax_title.set_facecolor(DARK); ax_title.axis('off')
ax_title.text(0.5, 0.5,
    "Modèle ML v2 — Prédiction des zones à risque d'inaccessibilité | EMD Dakar",
    ha='center', va='center', fontsize=16, fontweight='bold', color=TEXT)

# 7.1 Importance des variables (RF)
ax1 = fig.add_axes([0.05, 0.73, 0.55, 0.19])
ax1.set_facecolor(PANEL)
rf_model = results['Random Forest']['model']
importances = rf_model.feature_importances_
idx = np.argsort(importances)[-12:]
bars = ax1.barh(range(len(idx)), importances[idx], color=ACCENT, alpha=0.85, height=0.6)
ax1.set_yticks(range(len(idx)))
ax1.set_yticklabels([feature_names[i] for i in idx], fontsize=8.5, color=TEXT)
ax1.set_xlabel("Importance (Gini)", color=MUTED, fontsize=9)
ax1.set_title("Importance des variables — Random Forest", color=TEXT, fontsize=11, pad=8)
ax1.tick_params(colors=MUTED)
for spine in ax1.spines.values(): spine.set_visible(False)
ax1.tick_params(axis='x', colors=MUTED)
for bar in bars:
    ax1.text(bar.get_width()+0.002, bar.get_y()+bar.get_height()/2,
             f'{bar.get_width():.3f}', va='center', fontsize=7.5, color=TEXT)

# 7.2 Courbes ROC
ax2 = fig.add_axes([0.65, 0.73, 0.30, 0.19])
ax2.set_facecolor(PANEL)
for (name, res), color in zip(results.items(), colors_models):
    fpr, tpr, _ = roc_curve(y_test, res['y_prob'])
    ax2.plot(fpr, tpr, color=color, lw=2, label=f"{name} (AUC={res['auc']:.3f})")
ax2.plot([0,1],[0,1],'--', color=MUTED, lw=1)
ax2.set_xlabel("Taux faux positifs", color=MUTED, fontsize=9)
ax2.set_ylabel("Taux vrais positifs", color=MUTED, fontsize=9)
ax2.set_title("Courbes ROC — tous modèles", color=TEXT, fontsize=11, pad=8)
ax2.legend(fontsize=7.5, facecolor=PANEL, labelcolor=TEXT, edgecolor=MUTED)
ax2.tick_params(colors=MUTED)
for spine in ax2.spines.values(): spine.set_color(MUTED)

# 7.3 Comparaison F1 / AUC des modèles (AJOUT)
ax_comp = fig.add_axes([0.65, 0.54, 0.30, 0.15])
ax_comp.set_facecolor(PANEL)
model_names = list(results.keys())
f1_vals  = [results[n]['f1']  for n in model_names]
auc_vals = [results[n]['auc'] for n in model_names]
x = np.arange(len(model_names))
w = 0.35
ax_comp.bar(x - w/2, f1_vals,  width=w, color=ACCENT, alpha=0.85, label='F1-Score')
ax_comp.bar(x + w/2, auc_vals, width=w, color=WARN,   alpha=0.85, label='AUC ROC')
ax_comp.set_xticks(x)
ax_comp.set_xticklabels([n.replace(' ', '\n') for n in model_names], fontsize=8, color=TEXT)
ax_comp.set_ylim(0, 1.1)
ax_comp.set_title("Comparaison F1 vs AUC", color=TEXT, fontsize=10, pad=8)
ax_comp.legend(fontsize=8, facecolor=PANEL, labelcolor=TEXT, edgecolor=MUTED)
ax_comp.tick_params(colors=MUTED)
for spine in ax_comp.spines.values(): spine.set_visible(False)
for xi, (f, a) in enumerate(zip(f1_vals, auc_vals)):
    ax_comp.text(xi - w/2, f + 0.01, f'{f:.2f}', ha='center', fontsize=7.5, color=TEXT)
    ax_comp.text(xi + w/2, a + 0.01, f'{a:.2f}', ha='center', fontsize=7.5, color=TEXT)

# 7.4 TOP 20 zones à risque
ax3 = fig.add_axes([0.05, 0.50, 0.55, 0.20])
ax3.set_facecolor(PANEL)
top20 = zone_risk.head(20)
bar_colors = [WARN if p > 0.7 else (ACCENT if p > 0.5 else GOOD) for p in top20['prob_risque_moy']]
bars3 = ax3.bar(range(len(top20)), top20['prob_risque_moy']*100, color=bar_colors, alpha=0.85, width=0.6)
ax3.set_xticks(range(len(top20)))
ax3.set_xticklabels(top20['I2'].str[:20], rotation=45, ha='right', fontsize=7.5, color=TEXT)
ax3.set_ylabel("Probabilité de risque (%)", color=MUTED, fontsize=9)
ax3.set_title("TOP 20 zones à risque d'inaccessibilité élevé", color=TEXT, fontsize=11, pad=8)
ax3.axhline(60, color=WARN, linestyle='--', lw=1.2, alpha=0.7, label='Seuil 60%')
ax3.tick_params(colors=MUTED)
for spine in ax3.spines.values(): spine.set_visible(False)
ax3.legend(fontsize=8, facecolor=PANEL, labelcolor=TEXT, edgecolor=MUTED)
for bar in bars3:
    ax3.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.5,
             f'{bar.get_height():.0f}%', ha='center', va='bottom', fontsize=7, color=TEXT)

# 7.5 Matrice de confusion
ax4 = fig.add_axes([0.05, 0.28, 0.25, 0.18])
ax4.set_facecolor(PANEL)
cm = confusion_matrix(y_test, best['y_pred'])
ax4.imshow(cm, cmap='Blues')
ax4.set_xticks([0,1]); ax4.set_yticks([0,1])
ax4.set_xticklabels(['Non risqué','Risqué'], color=TEXT, fontsize=9)
ax4.set_yticklabels(['Non risqué','Risqué'], color=TEXT, fontsize=9)
ax4.set_xlabel("Prédit", color=MUTED); ax4.set_ylabel("Réel", color=MUTED)
ax4.set_title(f"Matrice de confusion\n({best_name})", color=TEXT, fontsize=10, pad=8)
for i in range(2):
    for j in range(2):
        ax4.text(j, i, str(cm[i,j]), ha='center', va='center',
                 fontsize=14, color='white' if cm[i,j] > cm.max()/2 else DARK, fontweight='bold')

# 7.6 Distribution du score de risque
ax5 = fig.add_axes([0.37, 0.28, 0.28, 0.18])
ax5.set_facecolor(PANEL)
ax5.hist(df['prob_risque'], bins=30, color=ACCENT, alpha=0.7, edgecolor='none')
ax5.axvline(0.5, color=WARN, lw=2, linestyle='--', label='Seuil 0.5')
ax5.set_xlabel("Probabilité de risque", color=MUTED, fontsize=9)
ax5.set_ylabel("Nb ménages", color=MUTED, fontsize=9)
ax5.set_title("Distribution des probabilités\nde risque (tous ménages)", color=TEXT, fontsize=10, pad=8)
ax5.tick_params(colors=MUTED)
ax5.legend(fontsize=8, facecolor=PANEL, labelcolor=TEXT, edgecolor=MUTED)
for spine in ax5.spines.values(): spine.set_visible(False)

# 7.7 Radar comparatif — CORRECTION : 5 dimensions distinctes
ax6 = fig.add_axes([0.68, 0.26, 0.28, 0.22], polar=True)
ax6.set_facecolor(PANEL)
categories = ['Inondation', 'Enclavement', 'Durée\nsanté', 'TC\nindisponibles', 'Routes\nmanquantes']
n = len(categories)
angles = np.linspace(0, 2*np.pi, n, endpoint=False).tolist()
angles += angles[:1]

top5 = zone_risk.head(5)
bot5 = zone_risk.tail(5)

def norm_val(grp_val, col, invert=False):
    """Normalise une valeur entre 0 et 1 selon min/max de zone_risk."""
    mn, mx = zone_risk[col].min(), zone_risk[col].max()
    v = grp_val if not isinstance(grp_val, pd.Series) else grp_val.mean()
    val = (v - mn) / (mx - mn + 1e-9)
    return round(1 - val if invert else val, 3)

for group, color, label in [(top5, WARN, 'Zones risquées'), (bot5, GOOD, 'Zones sûres')]:
    vals = [
        norm_val(group['score_inond_moy'].mean(),    'score_inond_moy'),
        norm_val(group['enclavement_pct'].mean(),    'enclavement_pct'),
        norm_val(group['dur_sante_moy'].mean(),      'dur_sante_moy'),
        norm_val(group['tc_disponibles_moy'].mean(), 'tc_disponibles_moy', invert=True),
        norm_val(group['score_routes_pct'].mean(),   'score_routes_pct'),   # CORRECTION
    ]
    vals += vals[:1]
    ax6.plot(angles, vals, color=color, lw=2, label=label)
    ax6.fill(angles, vals, color=color, alpha=0.15)

ax6.set_xticks(angles[:-1])
ax6.set_xticklabels(categories, color=TEXT, fontsize=8)
ax6.set_yticklabels([]); ax6.set_ylim(0, 1)
ax6.set_title("Profil risque : Top vs Bottom zones", color=TEXT, fontsize=10, pad=15)
ax6.legend(loc='upper right', bbox_to_anchor=(1.35, 1.1), fontsize=8,
           facecolor=PANEL, labelcolor=TEXT, edgecolor=MUTED)
ax6.spines['polar'].set_color(MUTED)
ax6.grid(color=MUTED, alpha=0.3)

# 7.8 Tableau métriques classification
ax7 = fig.add_axes([0.05, 0.08, 0.90, 0.17])
ax7.set_facecolor(PANEL); ax7.axis('off')
ax7.set_title(f"Rapport de classification — {best_name}", color=TEXT, fontsize=11, pad=8, loc='left')
report = classification_report(y_test, best['y_pred'],
                                target_names=['Non risqué','Risqué'], output_dict=True)
rows = []
for cls in ['Non risqué','Risqué','macro avg','weighted avg']:
    r = report[cls]
    rows.append([cls, f"{r['precision']:.3f}", f"{r['recall']:.3f}",
                 f"{r['f1-score']:.3f}", f"{r.get('support', '')}"])
col_labels = ['Classe','Précision','Rappel','F1-Score','Support']
table = ax7.table(cellText=rows, colLabels=col_labels, loc='center', cellLoc='center')
table.auto_set_font_size(False); table.set_fontsize(10)
table.scale(1, 2.2)
for (i, j), cell in table.get_celld().items():
    cell.set_facecolor(ACCENT if i == 0 else (PANEL if i % 2 == 0 else '#20243a'))
    cell.set_text_props(color=TEXT)
    cell.set_edgecolor(MUTED)

# 7.9 Résumé global
ax8 = fig.add_axes([0.05, 0.02, 0.90, 0.05])
ax8.set_facecolor(PANEL); ax8.axis('off')
acc = (best['y_pred'] == y_test).mean()
summary = (f"  Meilleur modèle : {best_name}   |   AUC : {best['auc']:.3f}   |   "
           f"F1 : {best['f1']:.3f}   |   Accuracy : {acc:.3f}   |   "
           f"CV-AUC : {best['cv_auc_mean']:.3f}±{best['cv_auc_std']:.3f}   |   "
           f"Zones à risque élevé (≥60%) : "
           f"{(zone_risk['prob_risque_moy']>=0.60).sum()} / {len(zone_risk)}")
ax8.text(0.5, 0.5, summary, ha='center', va='center',
         fontsize=10, color=TEXT, fontweight='bold',
         bbox=dict(boxstyle='round,pad=0.5', facecolor=ACCENT, alpha=0.3, edgecolor=MUTED))

plt.savefig('risque_inaccessibilite_ml_v2.png', dpi=150, bbox_inches='tight', facecolor=DARK)
print("  Dashboard v2 sauvegardé → risque_inaccessibilite_ml_v2.png")

# ─────────────────────────────────────────────────────────────────────────────
# 8. SHAP — interprétabilité du meilleur modèle (si disponible)
# ─────────────────────────────────────────────────────────────────────────────
if USE_SHAP and best_name in ('Random Forest', 'XGBoost'):
    print("\nCalcul des valeurs SHAP...")
    explainer = shap.TreeExplainer(best['model'])
    shap_vals  = explainer.shap_values(X_test_imp)
    if isinstance(shap_vals, list):
        shap_vals = shap_vals[1]   # classe positive

    fig_shap, ax_shap = plt.subplots(figsize=(10, 7))
    fig_shap.patch.set_facecolor(DARK)
    ax_shap.set_facecolor(PANEL)
    shap.summary_plot(shap_vals, X_test_imp, feature_names=feature_names,
                      plot_type='bar', show=False, color=ACCENT)
    ax_shap.set_title("SHAP — Impact des variables sur le risque d'inaccessibilité",
                      color=TEXT, fontsize=12)
    plt.tight_layout()
    plt.savefig('shap_inaccessibilite.png', dpi=150, bbox_inches='tight', facecolor=DARK)
    print("  Graphique SHAP sauvegardé → shap_inaccessibilite.png")

# ─────────────────────────────────────────────────────────────────────────────
# 9. EXPORT CSV ZONES + MODÈLE
# ─────────────────────────────────────────────────────────────────────────────
zone_risk.rename(columns={
    'I2': 'Zone/Strate',
    'prob_risque_moy': 'Probabilité risque moy.',
    'n_menages': 'Nb ménages',
    'pct_risque_eleve': '% ménages à risque',
    'score_inond_moy': 'Score inondation moy.',
    'enclavement_pct': '% enclavement déclaré',
    'score_routes_pct': '% manque routes',
    'dur_sante_moy': 'Durée accès santé (min)',
    'tc_disponibles_moy': 'Nb TC disponibles moy.',
    'rang_risque': 'Rang risque'
}, inplace=True)

zone_risk['Niveau risque'] = zone_risk['Probabilité risque moy.'].apply(
    lambda x: 'ÉLEVÉ' if x >= 0.65 else ('MODÉRÉ' if x >= 0.45 else 'FAIBLE'))

zone_risk.to_csv('zones_risque_inaccessibilite_v2.csv',
                 index=False, sep=';', encoding='utf-8-sig')
print(f"\n  CSV zones exporté → zones_risque_inaccessibilite_v2.csv ({len(zone_risk)} zones)")

# Sauvegarde modèle + imputer
joblib.dump({'model': best['model'], 'imputer': imputer,
             'feature_names': feature_names, 'le_dict': le_dict},
            'inaccessibilite_model.pkl')
print("  Modèle exporté → inaccessibilite_model.pkl")

# ─────────────────────────────────────────────────────────────────────────────
# 10. RÉSUMÉ CONSOLE
# ─────────────────────────────────────────────────────────────────────────────
print("\n" + "="*65)
print("ZONES À RISQUE ÉLEVÉ D'INACCESSIBILITÉ (top 10)")
print("="*65)
cols_show = ['Zone/Strate','Rang risque','Probabilité risque moy.',
             'Niveau risque','% ménages à risque','% enclavement déclaré']
print(zone_risk[cols_show].head(10).to_string(index=False))
print("\n✓ Terminé — modèle v2 complet.")
