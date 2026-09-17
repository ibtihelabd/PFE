# sauvegarder_inacc_model.py
import pandas as pd
import numpy as np
import joblib
import os
from xgboost import XGBClassifier
from sklearn.impute import SimpleImputer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
import json
BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "ml_models")
DATA_FILE  = r"C:\Users\ibtih\OneDrive\Bureau\cetud data\MENAGE\CETUD_BD_EMD_MENAGE_COMPILE.xls"

print("Chargement données...")
data = pd.read_excel(DATA_FILE, sheet_name='BASE MENAGE')
df = data.copy()

# Construction cible
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

# Features
num_features = ['M66','M21','M27','M35','M51','M50','M49','M59','M63','dur_sante','dur_hopital','dur_marche','tc_norm_total']
cat_features = ['I2','M26','M28','M29','M30','M31','M37','M55','M56','M57','M68']

X_raw = df[num_features + cat_features].copy()
for col in cat_features:
    le = LabelEncoder()
    X_raw[col] = le.fit_transform(X_raw[col].fillna('Inconnu').astype(str))

X = X_raw.values.astype(float)
y = df['RISQUE_INACC'].values

# Entraînement XGBoost
print("Entraînement du modèle XGBoost...")
imputer = SimpleImputer(strategy='median')
X_imp = imputer.fit_transform(X)

model = XGBClassifier(
    n_estimators=150,
    max_depth=4,
    learning_rate=0.05,
    random_state=42,
    use_label_encoder=False,
    eval_metric='logloss',
    verbosity=0
)
model.fit(X_imp, y)

# Sauvegarde
joblib.dump(model,   os.path.join(MODELS_DIR, "inacc_model.pkl"))
joblib.dump(imputer, os.path.join(MODELS_DIR, "inacc_imputer.pkl"))
print("✅ inacc_model.pkl et inacc_imputer.pkl sauvegardés")

# Générer zones_risque.json
df['prob_risque'] = model.predict_proba(X_imp)[:, 1]
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
    lambda x: 'ÉLEVÉ' if x >= 0.65 else ('MODÉRÉ' if x >= 0.45 else 'FAIBLE'))
zone_risk['pct_risque'] = zone_risk['pct_risque'] * 100
zone_risk.rename(columns={'I2': 'zone'}, inplace=True)

output = zone_risk[['rang','zone','niveau_risque','prob_risque','nb_menages','pct_risque','tc_disponibles','dur_sante']].to_dict(orient='records')

with open(os.path.join(MODELS_DIR, "zones_risque.json"), "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"✅ zones_risque.json généré avec {len(output)} zones")
print("✅ Tout est prêt ! Redémarrez FastAPI.")