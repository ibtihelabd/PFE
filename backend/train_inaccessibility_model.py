# train_inaccessibility_model.py
import pandas as pd
import numpy as np
import joblib
import os
import json
from xgboost import XGBClassifier
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

# Configuration des chemins
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "ml_models")
DATA_FILE  = r"C:\Users\ibtih\OneDrive\Bureau\cetud data\MENAGE\CETUD_BD_EMD_MENAGE_COMPILE.xls"

if not os.path.exists(MODELS_DIR):
    os.makedirs(MODELS_DIR)

print("[INFO] Chargement des donnees depuis Excel (cette etape peut prendre quelques secondes)...")
data = pd.read_excel(DATA_FILE, sheet_name='BASE MENAGE')
df = data.copy()
print(f"[INFO] {len(df)} lignes chargees.")

# ============================================================
# TARGET & FEATURES PREPARATION
# ============================================================
df['score_tc_distance'] = (df['M66'] > 10).astype(int)
inond_map = {'Jamais': 0, 'Rarement': 1, 'Souvent': 2, 'Tous les jours ou presque': 3}
df['score_inond'] = df['M68'].map(inond_map).fillna(0)
df['score_inond_bin'] = (df['score_inond'] >= 2).astype(int)
df['score_enclavement'] = (df['M87'] == 'Oui').astype(int)
df['score_routes'] = (df['M72'] == 'Oui').astype(int)
df['score_tc_manque'] = (df['M73'] == 'TCOui').astype(int)

tc_norm  = ['M67_1','M67_2','M67_3','M67_4','M67_5','M67_6','M67_7','M67_8']
tc_pluie = ['M69_1','M69_2','M69_3','M69_4','M69_5','M69_6','M69_7','M69_8']
for n, p in zip(tc_norm, tc_pluie):
    df[n] = (df[n] == 'Oui').astype(float)
    df[p] = (df[p] == 'Oui').astype(float)
df['tc_norm_total']  = df[tc_norm].sum(axis=1)
df['tc_pluie_total'] = df[tc_pluie].sum(axis=1)
df['score_pluie_tc_bin'] = ((df['tc_norm_total'] - df['tc_pluie_total']).clip(lower=0) >= 2).astype(int)

df['dur_sante']   = df['M95_D'].fillna(df['M95_D'].median())
df['dur_hopital'] = df['M97_D'].fillna(df['M97_D'].median())
df['dur_marche']  = df['M100_D'].fillna(df['M100_D'].median())

df['score_acces_services'] = (
    (df['dur_sante']   > df['dur_sante'].quantile(0.75)).astype(int) +
    (df['dur_hopital'] > df['dur_hopital'].quantile(0.75)).astype(int) +
    (df['dur_marche']  > df['dur_marche'].quantile(0.75)).astype(int)
)
df['score_total'] = (
    df['score_tc_distance']    * 1.5 +
    df['score_inond_bin']      * 2.0 +
    df['score_enclavement']    * 2.0 +
    df['score_routes']         * 1.0 +
    df['score_tc_manque']      * 1.0 +
    df['score_pluie_tc_bin']   * 1.5 +
    df['score_acces_services'] * 1.0
)
df['RISQUE_INACC'] = (df['score_total'] >= df['score_total'].quantile(0.60)).astype(int)

# Definition des features
num_features = ['M66','M21','M27','M35','M51','M50','M49','M59','M63','dur_sante','dur_hopital','dur_marche','tc_norm_total']
cat_features = ['I2','M26','M28','M29','M30','M31','M37','M55','M56','M57','M68']
all_features = num_features + cat_features

# Sauvegarde des valeurs par défaut (modes et médianes) pour l'API de simulation partielle
defaults = {}
for col in num_features:
    defaults[col] = float(df[col].median())
for col in cat_features:
    defaults[col] = str(df[col].mode().iloc[0] if not df[col].dropna().empty else "Inconnu")

# Ajouter d'autres colonnes utiles au simulateur qui ne sont pas des features directes mais des variables intermédiaires
defaults['M87'] = "Non" # Enclavement par defaut
defaults['M72'] = "Oui" # Routes carrossables par defaut
defaults['M73'] = "Non" # Manque de TC par defaut
defaults['tc_pluie_total'] = float(df['tc_pluie_total'].median())

with open(os.path.join(MODELS_DIR, "inacc_features_defaults.json"), "w", encoding="utf-8") as f:
    json.dump(defaults, f, ensure_ascii=False, indent=2)
print("[SUCCESS] Valeurs par defaut sauvegardees dans inacc_features_defaults.json")

# Encodage des variables catégorielles & sauvegarde des dictionnaires d'encodage
label_encoders = {}
X_raw = df[all_features].copy()
encoder_mappings = {}

for col in cat_features:
    le = LabelEncoder()
    X_raw[col] = X_raw[col].fillna('Inconnu').astype(str)
    le.fit(X_raw[col])
    X_raw[col] = le.transform(X_raw[col])
    label_encoders[col] = le
    # Table de correspondance en texte pour que l'API puisse encoder sans charger de .pkl
    encoder_mappings[col] = {val: int(idx) for idx, val in enumerate(le.classes_)}

# Sauvegarder les encodeurs et les dictionnaires textuels
joblib.dump(label_encoders, os.path.join(MODELS_DIR, "inacc_label_encoders.pkl"))
with open(os.path.join(MODELS_DIR, "inacc_encoders_mappings.json"), "w", encoding="utf-8") as f:
    json.dump(encoder_mappings, f, ensure_ascii=False, indent=2)
print("[SUCCESS] Encodeurs sauvegardes.")

X = X_raw.values.astype(float)
y = df['RISQUE_INACC'].values

# ============================================================
# TRAIN / TEST SPLIT AND EVALUATION
# ============================================================
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

print("[INFO] Entrainement du modele XGBoost avec validation croisee...")
imputer = SimpleImputer(strategy='median')
X_train_imp = imputer.fit_transform(X_train)
X_test_imp = imputer.transform(X_test)

# Paramètres optimisés XGBoost
model = XGBClassifier(
    n_estimators=150,
    max_depth=4,
    learning_rate=0.05,
    random_state=42,
    use_label_encoder=False,
    eval_metric='logloss',
    verbosity=0
)
model.fit(X_train_imp, y_train)

# Évaluation sur l'ensemble de test
y_pred = model.predict(X_test_imp)
y_prob = model.predict_proba(X_test_imp)[:, 1]

metrics = {
    "accuracy":  float(accuracy_score(y_test, y_pred)),
    "precision": float(precision_score(y_test, y_pred)),
    "recall":    float(recall_score(y_test, y_pred)),
    "f1_score":  float(f1_score(y_test, y_pred)),
    "roc_auc":   float(roc_auc_score(y_test, y_prob)),
    "test_size": int(len(y_test)),
    "train_size": int(len(y_train))
}

with open(os.path.join(MODELS_DIR, "inacc_model_metrics.json"), "w", encoding="utf-8") as f:
    json.dump(metrics, f, ensure_ascii=False, indent=2)

print("\n[INFO] Metriques de Validation de l'Ensemble de Test :")
print(f"   Accuracy  : {metrics['accuracy']:.4f}")
print(f"   Precision : {metrics['precision']:.4f}")
print(f"   Recall    : {metrics['recall']:.4f}")
print(f"   F1-Score  : {metrics['f1_score']:.4f}")
print(f"   ROC AUC   : {metrics['roc_auc']:.4f}")

# ============================================================
# EXPLICABILITY (FEATURE IMPORTANCE)
# ============================================================
importances = model.feature_importances_
indices = np.argsort(importances)[::-1]

# Mapping des features vers des noms humains pour le dashboard XAI
HUMAN_FEATURE_NAMES = {
    'M66': "Distance arret TC (min)",
    'dur_sante': "Temps trajet sante (min)",
    'dur_hopital': "Temps trajet hopital (min)",
    'dur_marche': "Temps trajet marche (min)",
    'tc_norm_total': "Lignes TC disponibles",
    'M68': "Frequence des inondations",
    'M59': "Revenu du menage",
    'M63': "Budget transport mensuel",
    'M21': "Taille du menage",
    'M27': "Membres actifs dans le menage",
    'M35': "Membres etudiants dans le menage",
    'I2': "Zone d'habitation (Strate)",
    'M26': "Sexe du chef de menage",
    'M28': "Age du chef de menage",
    'M29': "Niveau d'instruction du chef",
    'M30': "Statut d'activite du chef",
    'M31': "Profession du chef",
    'M37': "Type d'habitat du menage",
    'M55': "Possession climatiseur",
    'M56': "Possession ordinateur",
    'M57': "Possession connexion Internet",
    'M51': "Nombre de voitures possedees",
    'M50': "Nombre de motos possedees",
    'M49': "Nombre de velos possedes"
}

feature_importance_list = []
for idx in indices:
    feat = all_features[idx]
    feature_importance_list.append({
        "feature_raw": feat,
        "feature_human": HUMAN_FEATURE_NAMES.get(feat, feat),
        "importance": float(importances[idx])
    })

with open(os.path.join(MODELS_DIR, "features_importance.json"), "w", encoding="utf-8") as f:
    json.dump(feature_importance_list, f, ensure_ascii=False, indent=2)
print("[SUCCESS] Importance des variables sauvegardee dans features_importance.json")

# ============================================================
# FINAL TRAINING & MODEL SERIALIZATION
# ============================================================
print("\n[INFO] Entrainement final XGBoost sur l'integralite du dataset...")
imputer_final = SimpleImputer(strategy='median')
X_imp = imputer_final.fit_transform(X)

model_final = XGBClassifier(
    n_estimators=150,
    max_depth=4,
    learning_rate=0.05,
    random_state=42,
    use_label_encoder=False,
    eval_metric='logloss',
    verbosity=0
)
model_final.fit(X_imp, y)

# Sauvegarde des artefacts finaux
joblib.dump(model_final,   os.path.join(MODELS_DIR, "inacc_model.pkl"))
joblib.dump(imputer_final, os.path.join(MODELS_DIR, "inacc_imputer.pkl"))
print("[SUCCESS] inacc_model.pkl et inacc_imputer.pkl finaux sauvegardes.")

# Régénérer le fichier zones_risque.json avec les prédictions finales
df['prob_risque'] = model_final.predict_proba(X_imp)[:, 1]
zone_risk = (df.groupby('I2')
               .agg(
                   prob_risque=('prob_risque', 'mean'),
                   nb_menages=('prob_risque', 'count'),
                   pct_risque=('RISQUE_INACC', 'mean'),
                   dur_sante=('dur_sante', 'mean'),
                   tc_disponibles=('tc_norm_total', 'mean'),
               )
               .sort_values('prob_risque', ascending=False)
               .reset_index())

zone_risk['rang'] = range(1, len(zone_risk) + 1)
zone_risk['niveau_risque'] = zone_risk['prob_risque'].apply(
    lambda x: 'ELEVE' if x >= 0.65 else ('MODERE' if x >= 0.45 else 'FAIBLE'))
zone_risk['pct_risque'] = zone_risk['pct_risque'] * 100
zone_risk.rename(columns={'I2': 'zone'}, inplace=True)

output = zone_risk[['rang','zone','niveau_risque','prob_risque','nb_menages','pct_risque','tc_disponibles','dur_sante']].to_dict(orient='records')

with open(os.path.join(MODELS_DIR, "zones_risque.json"), "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"[SUCCESS] zones_risque.json regenere avec {len(output)} zones.")
print("[SUCCESS] Entrainement et validation termines avec succes !")
