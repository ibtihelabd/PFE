## 8. Module Machine Learning

> Chapitre rédigé pour un lecteur qui n'a jamais fait de Machine Learning. Chaque terme technique est expliqué la première fois qu'il apparaît, avec une analogie simple. Toutes les métriques citées proviennent exactement des fichiers de code et des fichiers JSON de métadonnées du projet — aucune valeur n'est inventée.

---

### 8.1 Le point capital : pourquoi le ML est entraîné sur les données sources, pas sur le Data Warehouse

#### 8.1.1 Ce qui a été observé dans le code

En lisant les quatre scripts d'entraînement (`Anomalies_v2.py`, `Segmentation_Recommandation_v2.py`, `ml_inaccessibilite_v2.py`, `train_inaccessibility_model.py`), un fait est immédiatement vérifiable : **aucun de ces scripts ne se connecte à une base de données, à un entrepôt de données (Data Warehouse / DWH) ou à un système décisionnel**. Ils font tous la même chose au tout début du script :

```python
df = pd.read_csv(r'PFE (partie usager)\Trafic.csv')                                    # Anomalies_v2.py
df_raw = pd.read_excel(r'PFE (partie usager)\CETUD_BD_EMD_INDIVIDU_COMPILE.xls')        # Segmentation_Recommandation_v2.py
data = pd.read_excel(r'PFE (partie usager)\CETUD_BD_EMD_MENAGE_COMPILE.xls', sheet_name='BASE MENAGE')  # ml_inaccessibilite_v2.py
data = pd.read_excel(DATA_FILE, sheet_name='BASE MENAGE')  # train_inaccessibility_model.py, DATA_FILE = ".../cetud data/MENAGE/CETUD_BD_EMD_MENAGE_COMPILE.xls"
```

Ce sont des fichiers Excel (`.xls`) ou CSV bruts, livrés tels quels par le CETUD (Conseil Exécutif des Transports Urbains de Dakar), lus directement avec `pandas.read_csv` / `pandas.read_excel`. À aucun moment un script ML n'exécute une requête SQL vers un schéma en étoile, ni ne lit une table de faits ou de dimensions issue du pipeline ETL Talend (le pipeline décisionnel du projet, documenté séparément dans le chapitre `06_etl_talend.tex` du rapport LaTeX). Le projet CETUD possède bien un volet décisionnel distinct (modèle en étoile, ETL Talend, Data Warehouse — visible dans `05_modele_decisionnel.tex` et `06_etl_talend.tex`), mais ce volet n'est **jamais** la source des modèles ML.

> **📌 À retenir** : Il existe deux pipelines de données complètement séparés dans ce projet :
> 1. **Pipeline décisionnel (BI)** : Excel/CSV → ETL Talend → Data Warehouse (modèle en étoile) → outils de reporting/dashboards décisionnels.
> 2. **Pipeline Machine Learning** : Excel/CSV → pandas → prétraitement Python → modèle scikit-learn/XGBoost → fichier `.pkl` → API FastAPI → React.
>
> Les deux partent de la même donnée brute CETUD, mais ne se croisent jamais après l'étape de lecture du fichier source.

#### 8.1.2 Pourquoi ce choix est pertinent (justifications observables dans le code)

**a) Besoin de variables individuelles fines, non agrégées.**
Un Data Warehouse est conçu pour l'agrégation : il stocke des faits déjà résumés par dimensions (par zone, par mois, par catégorie de véhicule, etc.), précisément pour permettre des requêtes de reporting rapides. Mais les modèles ML de ce projet ont besoin, à l'inverse, d'une ligne par individu ou par ménage, avec toutes les variables brutes disponibles. Exemple concret : le modèle de segmentation utilise une ligne par individu enquêté avec des variables comme `age`, `sexe`, `niveau_instruction`, `permis`, `freq_tc` (codes P1, P2, P9, etc. de l'enquête EMD) — c'est une granularité individuelle qu'un DWH orienté reporting agrégerait probablement par segment géographique ou démographique avant stockage, ce qui détruirait l'information nécessaire à un clustering ou à une classification individu par individu.

**b) Indépendance du pipeline ML par rapport au pipeline décisionnel.**
En codant la lecture directement depuis les fichiers CETUD bruts, les scripts ML n'ont aucune dépendance vis-à-vis du schéma du DWH, de sa disponibilité, ni du bon déroulement de l'ETL Talend. Si le DWH est en maintenance, en cours de re-modélisation, ou si l'ETL échoue un jour donné, l'entraînement et le ré-entraînement des modèles ML ne sont pas affectés. C'est ce qu'on appelle un **découplage** : les deux chaînes (BI et ML) évoluent indépendamment.

**c) Itérations rapides sans attendre l'ETL.**
Les commentaires d'en-tête des scripts (`Anomalies_v2.py`, `ml_inaccessibilite_v2.py`) montrent une évolution itérative rapide : "v2", corrections de bugs ("CORRECTION bug score_tc_manque", "CORRECTION radar chart"), ajustements de seuils ("Seuil cible ajusté au 65e percentile"). Ce rythme de correction/réentraînement en quelques minutes (relire un Excel, ajuster une ligne de code, relancer) serait beaucoup plus lent si chaque test nécessitait d'abord une mise à jour du DWH via l'ETL Talend (qui implique typiquement un job batch, une validation de schéma, un temps de traitement). Travailler sur la source brute permet au data scientist de tester immédiatement une hypothèse.

**d) Conservation de variables que l'agrégation décisionnelle n'a pas vocation à conserver.**
Le modèle d'inaccessibilité utilise des variables très spécifiques et peu "décisionnelles" telles que `M67_1` à `M67_8` (disponibilité de 8 types de TC en temps normal) et `M69_1` à `M69_8` (les mêmes, mais "sous la pluie") pour calculer `tc_pluie_total` et un score de disparition des TC sous la pluie. Ce sont des variables très fines, typiques d'une enquête ménage, qui n'ont probablement pas vocation à devenir des dimensions ou des mesures dans un DWH orienté pilotage stratégique (fréquentation, recettes, kilomètres parcourus, etc.).

#### 8.1.3 Limites de ce choix (honnêtes, à ne pas dissimuler en soutenance)

- **Double lecture des fichiers sources** : les données brutes sont lues une fois pour l'ETL/DWH et une autre fois pour le ML — pas de mutualisation du nettoyage. Si une correction de qualité de donnée est faite côté ETL (ex. valeurs aberrantes corrigées), elle n'est *pas* automatiquement répercutée côté ML, sauf si le même correctif est dupliqué dans le script ML.
- **Chemins de fichiers codés en dur** (`r'PFE (partie usager)\Trafic.csv'`, ou un chemin Windows absolu complet dans `train_inaccessibility_model.py` : `C:\Users\ibtih\OneDrive\Bureau\cetud data\MENAGE\CETUD_BD_EMD_MENAGE_COMPILE.xls`). Cela rend le pipeline ML fragile en déploiement (portabilité faible) — un problème typique de prototype académique, pas d'un système de production robuste.
- **Pas de validation automatique de schéma** : si la structure du fichier Excel CETUD change (colonne renommée, feuille déplacée), le script casse sans message clair, alors qu'un DWH avec un ETL structuré aurait probablement une étape de contrôle de schéma.

---

### 8.2 Vue d'ensemble : quatre familles de modèles, quatre objectifs métier

| Modèle | Fichier source du code | Type d'apprentissage | Objectif métier |
|---|---|---|---|
| Détection d'anomalies de trafic | `Anomalies_v2.py` | Non supervisé (3 algorithmes en consensus) | Repérer les comptages de trafic anormaux par site/heure/jour |
| Segmentation des usagers | `Segmentation_Recommandation_v2.py` (partie KMeans) | Non supervisé | Regrouper les usagers en profils-types de mobilité |
| Recommandation de mode de transport | `Segmentation_Recommandation_v2.py` (partie RandomForest) | Supervisé (classification multi-classe) | Prédire le mode de transport le plus probable pour un profil donné |
| Prédiction du risque d'inaccessibilité (recherche, v2) | `ml_inaccessibilite_v2.py` | Supervisé (classification binaire), 4 modèles comparés | Identifier les zones/ménages à risque élevé d'isolement en transport |
| Prédiction du risque d'inaccessibilité (production backend) | `train_inaccessibility_model.py` / `sauvegarder_inacc_model.py` | Supervisé (classification binaire), 1 seul modèle simplifié | Même objectif, version allégée utilisée réellement par l'API FastAPI |

> **🎓 Question possible en soutenance** : *"Pourquoi avez-vous deux scripts différents pour le modèle d'inaccessibilité (`ml_inaccessibilite_v2.py` et `train_inaccessibility_model.py`) ?"*
> **Réponse courte** : Le premier est un script de recherche/comparaison (4 algorithmes, SMOTE, SHAP), le second est la version simplifiée et stabilisée réellement chargée par le backend FastAPI en production.
> **Réponse détaillée** : `ml_inaccessibilite_v2.py` sert à explorer et comparer Random Forest, XGBoost, Logistic Regression et XGBoost avec SMOTE (rééquilibrage) et SHAP (interprétabilité), pour choisir la meilleure approche. `train_inaccessibility_model.py` retient uniquement XGBoost (sans SMOTE, sans les 3 autres modèles), produit des fichiers de métadonnées exploitables par l'API (`inacc_model_metrics.json`, `features_importance.json`, `inacc_features_defaults.json`, `inacc_encoders_mappings.json`) et sauvegarde le modèle final sous un nom fixe (`inacc_model.pkl`) que `main.py` charge au démarrage.
> **Piège à éviter** : ne pas dire que les deux scripts produisent le même modèle — le seuil de risque diffère (65e percentile dans `ml_inaccessibilite_v2.py` contre 60e percentile dans `train_inaccessibility_model.py`), et le score `score_tc_manque` utilise une condition différente (`'Oui'` contre `'TCOui'`, voir section 8.3.4 — incohérence réelle observée dans le code).

---

### 8.3 Modèle par modèle

#### 8.3.1 Détection d'anomalies de trafic (`Anomalies_v2.py`)

**Objectif métier.** Repérer, parmi des milliers de comptages routiers (nombre de véhicules par site, heure, catégorie), ceux qui sont anormalement élevés ou anormalement bas par rapport au comportement habituel de ce site à cette heure — pour aider le CETUD à détecter des incidents, des fermetures de route, ou des erreurs de capteur.

**Donnée source.** `Trafic.csv` (chemin relatif : `PFE (partie usager)\Trafic.csv`), lu avec `pd.read_csv`.

**Qu'est-ce qu'une "anomalie" ici ? (explication simple)**
Imaginez un radar qui compte les voitures toutes les heures sur un rond-point. La plupart des heures, il compte par exemple entre 80 et 150 voitures. Un jour, il en compte 600 à 14h : c'est une anomalie. Le but du modèle est de détecter automatiquement ces situations inhabituelles, sans qu'un humain doive regarder chaque ligne une par une.

**Feature engineering réel (transformation des données brutes en variables utilisables) :**
- `HEURE_DECIMAL` = `Heure_debut_comptage + Minute_debut_comptage / 60` (ex. 14h30 devient 14.5)
- `DAY_OF_WEEK` et `MOIS` extraits de `Date_comptage` (converti en `datetime`)
- `HEURE_INT` = partie entière de l'heure
- `TRANCHE_HEURE` : catégorie texte (Matin 6-10h, Midi 10-14h, Après-midi 14-20h, Soir 20-24h, Nuit 0-6h) via la fonction `heure_tranche()`
- Encodage des variables catégorielles `Categorie_vehicule`, `Jour_comptage`, `Sens_circulation` avec `LabelEncoder` (transforme un texte comme "Lundi" en un nombre comme `0`, `1`, `2`...)

**Variables d'entrée (features) réelles utilisées pour les modèles multivariés :**
```python
features = [
    'Nombre_vehicules_amplitude', 'HEURE_DECIMAL',
    'Categorie_vehicule_enc', 'Jour_comptage_enc',
    'GPS_Longitude_site', 'GPS_Latitude_site',
    'Sens_circulation_enc', 'DAY_OF_WEEK'
]
```

**Prétraitement.** Mise à l'échelle (scaling) avec `StandardScaler` : chaque variable est recentrée pour avoir une moyenne 0 et un écart-type 1. *Explication simple* : sans cette étape, une variable comme "nombre de véhicules" (valeurs de 0 à plusieurs centaines) écraserait l'influence d'une variable comme "jour de la semaine" (valeurs de 0 à 6) dans le calcul de distance utilisé par les algorithmes.

**Les trois méthodes utilisées (non supervisées — pas de variable cible à prédire) :**

1. **Z-Score par groupe** : pour chaque combinaison (site, catégorie de véhicule, heure), on calcule la moyenne et l'écart-type du volume, puis on regarde si une observation s'écarte de plus de 3 écarts-types (`ANOMALY_ZSCORE = (ZSCORE.abs() > 3)`). *Analogie* : si la taille moyenne d'un adulte est 1,70 m avec un écart-type de 10 cm, une personne de 2,10 m est à 4 écarts-types — clairement hors norme.

2. **Isolation Forest** (`from sklearn.ensemble import IsolationForest`) : un algorithme qui construit des arbres de décision aléatoires et considère qu'un point est anormal s'il est "isolé" rapidement (peu de divisions nécessaires pour le séparer des autres). Paramètres réels : `n_estimators=200`, `contamination` calibrée dynamiquement (voir ci-dessous), `random_state=42`.

3. **Local Outlier Factor (LOF)** (`from sklearn.neighbors import LocalOutlierFactor`) : compare la densité de voisins autour d'un point à la densité autour de ses voisins. Si un point est dans une zone "clairsemée" alors que ses voisins sont dans des zones "denses", il est anormal. Paramètre réel : `n_neighbors = min(30, len(df) // 100)`.

**Calibration de la contamination (point méthodologique réel et notable).** Le paramètre `contamination` (la proportion attendue d'anomalies) n'est pas fixé arbitrairement à 5 % comme le ferait une approche naïve. Il est calculé statistiquement via la méthode IQR (Interquartile Range, l'écart entre le 1er et le 3e quartile) :
```python
Q1, Q3 = vol.quantile(0.25), vol.quantile(0.75)
IQR = Q3 - Q1
borne_sup = Q3 + 3 * IQR
contamination_iqr = (vol > borne_sup).mean()
contamination = float(np.clip(contamination_iqr, 0.01, 0.15))
```
*Explication simple* : on calcule d'abord, avec une règle statistique classique, combien de valeurs sont "vraiment" très élevées (au-delà de Q3 + 3×IQR), puis on utilise ce pourcentage réel (entre 1 % et 15 % par sécurité) comme paramètre des deux modèles, plutôt qu'un chiffre choisi au hasard.

**Consensus pondéré (pas un simple vote majoritaire).** Une anomalie n'est retenue comme "consensus" final que si au moins 2 des 3 méthodes la signalent (`VOTES >= 2`). Un score de sévérité continu de 0 à 100 est ensuite calculé par une moyenne pondérée :
```python
W_ZSCORE, W_IF, W_LOF = 0.25, 0.40, 0.35
SEVERITE = (W_ZSCORE*SCORE_ZSCORE + W_IF*SCORE_IF + W_LOF*SCORE_LOF) * 100
```
Les poids accordent plus de confiance aux méthodes multivariées (Isolation Forest 40 %, LOF 35 %) qu'à la méthode univariée Z-Score (25 %), car le code l'indique explicitement en commentaire ("IF et LOF sont multivariés, plus fiables").

**DBSCAN — clustering spatial des anomalies.** Une fois les anomalies en consensus identifiées, `DBSCAN` (`eps=0.005, min_samples=3`) regroupe géographiquement les anomalies proches (≈ 500 m à Dakar) pour révéler des **zones** à problème plutôt que des points isolés. *Explication simple* : DBSCAN ne demande pas de préciser un nombre de groupes à l'avance — il regarde si des points sont suffisamment proches les uns des autres pour former un "amas", et isole comme "bruit" (label `-1`) les points trop isolés.

**Validation / métriques.** Il s'agit d'un apprentissage **non supervisé** : il n'y a pas de variable cible connue d'avance ("anomalie : oui/non" n'est pas une étiquette fournie par le CETUD), donc il n'y a **pas d'accuracy, F1 ou AUC** calculable ici au sens classique (ces métriques nécessitent une vérité terrain). La seule validation effectuée est la cohérence du consensus entre les trois méthodes et l'examen visuel via le dashboard (8 visualisations) et la carte Folium.

**Sauvegarde / utilisation.** Information non disponible dans les sources fournies : ce script ne fait *aucun* `joblib.dump()` du modèle Isolation Forest, LOF ou DBSCAN. Il exporte uniquement des résultats : `anomalies_dashboard_v2.png`, `carte_anomalies_dakar_v2.html`, et surtout `anomalies_results_v2.csv` (CSV enrichi avec toutes les colonnes d'anomalies). C'est ce type de CSV (sous le nom `anomalies_results.csv`, sans le suffixe `_v2`) que `main.py` charge en mémoire au démarrage de l'API (`pd.read_csv`), pas un modèle scikit-learn rechargé. Le backend ne réexécute donc pas l'Isolation Forest à chaque appel : il sert un résultat déjà calculé et stocké dans un CSV.

**Chemin vers le frontend.** `main.py` expose les routes `/api/anomalies/summary`, `/api/anomalies/sites` et `/api/anomalies/sites/{site_id}/details`, qui lisent `ANOMALIES_DF` (le CSV en mémoire) et renvoient des agrégations JSON consommées par le composant React `AnomalyDashboard.jsx`.

---

#### 8.3.2 Segmentation des usagers — KMeans (`Segmentation_Recommandation_v2.py`)

**Objectif métier.** Regrouper les individus enquêtés en quelques profils-types homogènes de mobilité (ex. "étudiants à mobilité douce", "actifs motorisés") afin de personnaliser ensuite des conseils de transport.

**Donnée source.** `CETUD_BD_EMD_INDIVIDU_COMPILE.xls` (Enquête Ménages Déplacements, fichier individu), lu avec `pd.read_excel`.

**Variables brutes sélectionnées et renommées** (les codes bruts de l'enquête EMD sont gardés en commentaire) :
```python
df = df_raw[['P1','P2','P9','P20','P10','P34_1','P14_1','P65','P80','P138','P36','P35','P16','P15','P61_2','P68']]
df.columns = ['sexe','age','niveau_instruction','actif','etudiant','mode_travail','mode_ecole',
              'permis','freq_tc','nb_deplacements','duree_travail','cout_travail',
              'duree_ecole','cout_ecole','revenu','nb_vehicules']
```

**Feature engineering réel.**
- `mode_principal` = mode de transport pour le travail si disponible, sinon pour l'école (`fillna`)
- `duree_principale`, `cout_principal` construits de la même façon
- Nettoyage des codes "non-réponse" : `permis`, `mode_principal`, `niveau_instruction` ayant les valeurs 9 ou 99 sont remplacées par `NaN` (valeur manquante), car dans les enquêtes EMD ces codes signifient typiquement "ne sait pas / non réponse" et fausseraient le modèle s'ils étaient traités comme une vraie catégorie numérique.
- `groupe_mode` (ex. Marche, Vélo, Moto, Voiture, Taxi/Clando, Transport Commun, Autre) et `mode_label` (libellé complet) obtenus via les dictionnaires `MODE_GROUPES` et `MODE_LABELS` (mapping des 19 codes de mode EMD).

**Variables d'entrée (features) réelles du clustering :**
```python
features_cluster = ['age','sexe','niveau_instruction','actif','etudiant','permis',
                     'freq_tc','nb_deplacements','duree_principale','cout_principal']
```
(confirmé également dans `metadata.json`, clé `features_cluster`).

**Prétraitement.**
- Imputation des valeurs manquantes par la **médiane** : `SimpleImputer(strategy='median')`. *Explication simple* : si l'âge d'un individu n'est pas renseigné, on lui attribue l'âge médian de tous les individus (la valeur du milieu si on les trie), plutôt que de supprimer la ligne ou de mettre 0.
- Standardisation : `StandardScaler` (même logique que pour les anomalies — éviter qu'une variable à grande échelle domine les autres).

**Pas de variable cible** : le clustering est non supervisé, l'algorithme ne sait pas à l'avance combien de groupes existent ni ce qu'ils représentent.

**Choix du nombre de clusters K — méthode réelle.** Le script teste K de 2 à 8 (`K_range = range(2, 9)`) et calcule pour chaque K :
- l'**inertie** (somme des distances au carré entre chaque point et le centre de son cluster — plus elle est petite, plus les clusters sont compacts, mais elle diminue mécaniquement quand K augmente)
- le **score de silhouette** (voir section 8.5 pour l'explication pédagogique complète)

Le K retenu est celui qui **maximise le score de silhouette** :
```python
K_OPTIMAL = list(K_range)[silhouettes.index(max(silhouettes))]
```
Le fichier `metadata.json` confirme `"k_clusters": 3` — le K optimal réellement retenu est donc **3 clusters**. La valeur numérique exacte du score de silhouette obtenu n'est pas présente dans les fichiers JSON fournis : **information non disponible dans les sources fournies** (seul le code montre qu'elle est calculée et affichée en console, pas qu'elle est sauvegardée dans un fichier).

**Caractérisation et étiquetage métier des segments (logique d'auto-labellisation réelle).** Une fonction `auto_label(row)` attribue un nom métier à chaque cluster selon son profil moyen :
```python
if row['pct_etudiants'] > 40: return 'Étudiants mobilité douce'
elif row['pct_actifs'] > 60 and row['pct_permis'] > 30: return 'Actifs motorisés'
elif row['pct_actifs'] > 50 and row['cout_moy'] < 200: return 'Actifs TC réguliers'
elif row['duree_moy'] < 15 and row['cout_moy'] < 50: return 'Piétons de proximité'
else: return 'Travailleurs informels'
```
D'après `metadata.json`, les 3 segments réellement obtenus sont : **`0: "Étudiants mobilité douce"`, `1: "Actifs motorisés"`, `2: "Travailleurs informels"`**.

> **🎓 Question possible en soutenance** : *"Comment savez-vous que le cluster 0 correspond vraiment à des étudiants, et pas le hasard ?"*
> **Réponse courte** : KMeans ne nomme pas les clusters — c'est une fonction métier (`auto_label`) appliquée après coup, basée sur les statistiques moyennes du cluster (% étudiants, % actifs, coût moyen).
> **Réponse détaillée** : L'algorithme regroupe les individus uniquement sur la base de leur proximité numérique dans l'espace des variables standardisées. Une fois les groupes formés, on calcule pour chacun des statistiques descriptives (`profil = df.groupby('segment').agg(...)`) et on applique des règles de seuil pour leur donner un nom compréhensible. Le nom est donc une interprétation humaine *a posteriori*, pas une sortie de l'algorithme.
> **Piège** : ne pas confondre l'étiquette métier ("Étudiants mobilité douce") avec une vérité terrain validée — c'est une heuristique de nommage, pas une classification supervisée vérifiée par un humain pour chaque individu.

**Visualisation PCA (Analyse en Composantes Principales).** `PCA(n_components=2)` réduit les 10 variables à 2 axes pour permettre une visualisation 2D des clusters. *Explication simple* : impossible de dessiner un graphique à 10 dimensions ; la PCA trouve les 2 "directions" qui résument le mieux la diversité des données, un peu comme prendre une photo d'un objet 3D sous l'angle qui montre le plus de détails.

**Sauvegarde.** `joblib.dump()` produit `kmeans_model.pkl`, `kmeans_scaler.pkl`, `kmeans_imputer.pkl`, `kmeans_pca.pkl`. Toutes les métadonnées (labels, conseils, features) sont sérialisées dans `metadata.json`.

**Chargement et usage dans le backend.** `main.py` charge au démarrage `kmeans_model.pkl`, `kmeans_scaler.pkl`, `kmeans_imputer.pkl` (la PCA n'est *pas* rechargée par le backend — elle n'est utile que pour visualiser, pas pour prédire). La fonction `predire()` du backend applique exactement le même pipeline imputer → scaler → `kmeans.predict()` que celui de l'entraînement, condition indispensable pour que les prédictions en production soient cohérentes avec l'entraînement.

**Chemin jusqu'au frontend.** La route `GET /api/segmentation/profils` et `GET /segments` renvoient les labels et conseils des segments ; le composant `SegmentationPage.jsx` les consomme côté React pour afficher les profils. La route `POST /recommander` renvoie le `segment` et `segment_label` prédits pour un profil utilisateur donné.

---

#### 8.3.3 Recommandation de mode de transport — Random Forest (`Segmentation_Recommandation_v2.py`)

**Objectif métier.** Prédire, pour un profil d'usager donné, le **groupe de mode de transport** le plus probable qu'il utiliserait (Marche, Vélo, Moto, Voiture, Taxi/Clando, Transport Commun, Autre), afin de générer une recommandation personnalisée dans l'application.

**Donnée source.** Même fichier que la segmentation : `CETUD_BD_EMD_INDIVIDU_COMPILE.xls`.

**Variable cible (target) réelle.** `groupe_mode`, dérivée de `mode_principal` via le dictionnaire `MODE_GROUPES`. Seuls les groupes ayant **au moins 30 exemples** sont conservés (`counts[counts >= 30].index`) — ce filtre évite d'entraîner le modèle sur des catégories trop rares pour être apprises de façon fiable. D'après `metadata.json`, les classes réellement retenues (`classes_rf`) sont : **`Moto`, `Taxi/Clando`, `Transport Commun`, `Voiture`** (4 classes — "Marche", "Vélo" et "Autre" n'apparaissent pas dans `classes_rf`, ce qui suggère qu'ils ont été exclus par le filtre des 30 exemples minimum, ou regroupés autrement selon la distribution réelle des données).

**Variables d'entrée (features) réelles** (confirmées par `metadata.json`, clé `features_rf`) :
```python
features_rf = ['age','sexe','niveau_instruction','actif','etudiant','permis',
               'freq_tc','nb_deplacements','nb_vehicules','revenu',
               'duree_principale','cout_principal']
```

**Prétraitement.**
- Imputation par la médiane (`SimpleImputer`) sur les 12 features.
- Encodage de la variable cible texte en entiers via `LabelEncoder` (`y_enc = le_rf.fit_transform(y_rf)`).

**Découpage train/test.** `train_test_split(test_size=0.2, random_state=42, stratify=y_enc)` — 20 % des données sont mises de côté pour le test, avec stratification (le `stratify=y_enc` garantit que chaque classe est représentée dans les mêmes proportions dans le train et le test, ce qui est important quand les classes sont déséquilibrées).

**Modèle.** `RandomForestClassifier(n_estimators=200, max_depth=10, min_samples_split=5, min_samples_leaf=3, class_weight='balanced', random_state=42, n_jobs=-1)`.

*Explication simple d'une forêt aléatoire (Random Forest)* : c'est un "comité de vote" composé de 200 arbres de décision, chacun entraîné sur un sous-échantillon légèrement différent des données et des variables. Pour prédire, chaque arbre vote pour une classe, et la classe qui obtient le plus de votes gagne. `class_weight='balanced'` donne plus de poids aux classes rares pour compenser leur sous-représentation dans les données.

**Validation croisée (cross-validation).** `StratifiedKFold(n_splits=5, shuffle=True, random_state=42)` : les données sont divisées en 5 portions (folds) ; le modèle est entraîné 5 fois, chaque fois sur 4 portions et testé sur la portion restante, afin d'obtenir une estimation plus stable de la performance que sur un seul découpage train/test.

**Métriques réelles trouvées :**

D'après `metadata.json` :
- `"rf_accuracy": 0.8015` (accuracy sur le jeu de test simple, 80,15 %)
- `"rf_cv_f1_macro": 0.6729` (F1-macro moyen en validation croisée 5-fold, 67,29 %)

Le script calcule aussi en console (non sauvegardé dans un fichier JSON, donc non reproductible ici avec certitude de valeur) : `acc` (accuracy test), `cv_acc.mean() ± cv_acc.std()`, `cv_f1.mean() ± cv_f1.std()`, et un `classification_report` complet (précision/rappel/F1 par classe). **Seules les deux valeurs ci-dessus (`rf_accuracy`, `rf_cv_f1_macro`) figurant dans `metadata.json` peuvent être citées avec certitude** ; les autres valeurs détaillées par classe ne sont pas dans un fichier de métadonnées fourni — information non disponible dans les sources fournies pour leur valeur exacte.

> **📌 À retenir** : l'écart entre l'accuracy simple (80,15 %) et le F1-macro en validation croisée (67,29 %) s'explique par le déséquilibre des classes : l'accuracy globale est tirée vers le haut par les classes majoritaires (ex. Transport Commun, probablement la plus fréquente à Dakar), alors que le F1-macro moyenne les performances de **toutes** les classes à égalité, y compris les classes minoritaires plus difficiles à prédire.

**Feature importance.** Le script calcule et trace (`importance_features.png`) l'importance Gini de chaque variable, mais ne la sauvegarde pas dans un fichier JSON dédié pour ce modèle (contrairement au modèle d'inaccessibilité qui a un `features_importance.json`) — information non disponible dans les sources fournies sous forme de fichier exploitable par l'API pour ce modèle précis.

**Sauvegarde.** `joblib.dump()` : `rf_model.pkl`, `rf_imputer.pkl`, `rf_label_encoder.pkl`.

**Chargement et usage backend.** `main.py` charge ces trois fichiers, ainsi que `stats_par_mode.json` (statistiques de coût/durée par mode et par segment, calculées par le même script via `enriched_stats()` et `seg_mode_stats()`). La fonction `predire()` du backend construit les features du profil utilisateur, applique l'imputer, puis `rf.predict_proba()` pour obtenir les probabilités de chaque classe, trie le top 3 (`np.argsort(probas)[::-1][:3]`), et enrichit chaque mode recommandé avec les fourchettes de coût/durée issues de `stats_par_mode.json`.

**Chemin jusqu'au frontend.** Route `POST /recommander` (modèle Pydantic `ReponseRecommandation`) → consommée pour afficher la recommandation personnalisée (mode, icône, fourchette de durée/coût) dans l'interface React.

---

#### 8.3.4 Prédiction du risque d'inaccessibilité

Ce module existe en **deux versions** : une version de recherche/comparaison (`ml_inaccessibilite_v2.py`) et une version de production simplifiée réellement branchée au backend (`train_inaccessibility_model.py`, redondante avec `sauvegarder_inacc_model.py`).

**Objectif métier.** Identifier les ménages, et par extension les zones (strates `I2`), présentant un risque élevé d'inaccessibilité aux transports et aux services essentiels (santé, marché), pour orienter les politiques d'aménagement du CETUD.

**Donnée source.** `CETUD_BD_EMD_MENAGE_COMPILE.xls`, feuille `'BASE MENAGE'` (Enquête Ménages Déplacements, fichier ménage — différent du fichier individu utilisé par la segmentation).

##### Construction de la variable cible (identique dans les deux scripts, sauf un détail)

Le `RISQUE_INACC` n'est **pas** une variable directement présente dans le fichier CETUD — c'est un **score composite** construit à partir de 7 composantes pondérées :

| Composante | Variable source | Condition | Poids |
|---|---|---|---|
| `score_tc_distance` | `M66` (durée marche → arrêt TC, min) | `M66 > 10` | 1.5 |
| `score_inond_bin` | `M68` (fréquence inondation) | mappé 0-3, puis `>= 2` (Souvent/Tous les jours) | 2.0 |
| `score_enclavement` | `M87` | `== 'Oui'` | 2.0 |
| `score_routes` | `M72` (routes carrossables manquantes) | `== 'Oui'` | 1.0 |
| `score_tc_manque` | `M73` (manque de TC) | `== 'Oui'` (v2 recherche) / `== 'TCOui'` (production) | 1.0 |
| `score_pluie_tc_bin` | `tc_norm_total - tc_pluie_total` (disparition TC sous la pluie, sur 8 types M67_1-8 / M69_1-8) | `>= 2` | 1.5 |
| `score_acces_services` | `dur_sante`, `dur_hopital`, `dur_marche` (M95_D, M97_D, M100_D) | dépassement du 75e percentile, comptage 0 à 3 | 1.0 |

```python
score_total = (score_tc_distance*1.5 + score_inond_bin*2.0 + score_enclavement*2.0 +
               score_routes*1.0 + score_tc_manque*1.0 + score_pluie_tc_bin*1.5 +
               score_acces_services*1.0)
RISQUE_INACC = (score_total >= seuil) 
```

> **📌 À retenir — incohérence réelle relevée entre les deux scripts** : `ml_inaccessibilite_v2.py` calcule `score_tc_manque` avec `(df['M73'] == 'Oui')`, en commentant explicitement *"CORRECTION : 'Oui' et non 'TCOui'"* (ligne 83-84) — c'est-à-dire que la version v2 corrige un bug détecté dans une version antérieure. Pourtant, `train_inaccessibility_model.py` et `sauvegarder_inacc_model.py` (les scripts utilisés par le backend en production) contiennent encore l'ancienne condition non corrigée : `(df['M73'] == 'TCOui')`. Le correctif appliqué dans le script de recherche v2 n'a **pas été reporté** dans la version de production. C'est un vrai écart de cohérence entre les deux pipelines, observable directement dans le code.

> **🎓 Question possible en soutenance** : *"Le seuil de risque est-il le même entre vos scripts ?"*
> **Réponse courte** : Non. `ml_inaccessibilite_v2.py` utilise le 65e percentile (`quantile(0.65)`), `train_inaccessibility_model.py` utilise le 60e percentile (`quantile(0.60)`).
> **Réponse détaillée** : Le commentaire d'en-tête de `ml_inaccessibilite_v2.py` indique explicitement *"Seuil cible ajusté au 65e percentile pour meilleur équilibre"*. Le script de production n'a pas repris cet ajustement et reste au 60e percentile. Cela signifie que la proportion de ménages classés "à risque élevé" diffère légèrement entre les deux pipelines — un même ménage pourrait être classé "à risque" dans un script et "non à risque" dans l'autre, selon où il se situe entre les deux seuils.
> **Piège** : ne pas affirmer que les deux pipelines produisent des résultats strictement identiques — ce n'est pas vrai d'après le code lu.

##### Variables d'entrée (features)

**Variables numériques** (`num_features`, identiques dans les deux scripts) :
`M66` (distance marche-arrêt TC), `M21` (taille ménage), `M27` (nb pièces logement), `M35` (temps accès eau potable), `M51` (nb voitures), `M50` (nb motos), `M49` (nb vélos), `M59` (dépenses mensuelles ménage), `M63` (ancienneté logement), `dur_sante`, `dur_hopital`, `dur_marche`, `tc_norm_total`.

**Variables catégorielles** (`cat_features`, identiques) :
`I2` (strate/zone), `M26` (type logement), `M28` (statut d'occupation), `M29` (matériaux murs), `M30` (matériaux toit), `M31` (eau potable logement), `M37` (raccordement électrique), `M55` (saut de repas 7j), `M56` (saut de repas 12 mois), `M57` (manque de soins 12 mois), `M68` (inondation quartier).

> **📌 À retenir — vrai libellé des variables vs libellés affichés au frontend.** Le dictionnaire `num_features`/`cat_features` défini dans `ml_inaccessibilite_v2.py` (lignes 137-165) donne des libellés différents de ceux du dictionnaire `HUMAN_FEATURE_NAMES` défini dans `train_inaccessibility_model.py` (lignes 161-186) pour les **mêmes codes** de variable. Exemple concret observé : dans `ml_inaccessibilite_v2.py`, `M28` = *"Type logement"* et `M26` = *"Strate"*... non — en réalité `cat_features` associe `I2` → *Strate*, `M26` → *Type logement*, `M28` → *Statut d'occupation*. Mais `HUMAN_FEATURE_NAMES` (utilisé pour le JSON consommé par le frontend) associe `M26` → *"Sexe du chef de menage"* et `M28` → *"Age du chef de menage"*. Ce sont deux mappings différents et incohérents entre eux pour les mêmes codes `M26`-`M37`. Le fichier `inacc_features_defaults.json` montre d'ailleurs des valeurs comme `"M26": "Maison basse"` et `"M28": "Proprietaire"`, qui collent au mapping de `ml_inaccessibilite_v2.py` (type de logement / statut d'occupation) et contredisent les libellés "Sexe du chef de ménage" / "Age du chef de ménage" affichés par `HUMAN_FEATURE_NAMES` côté production. **C'est une incohérence réelle de documentation des variables dans le code**, à signaler en soutenance plutôt qu'à dissimuler.

##### Prétraitement

- Encodage des variables catégorielles par `LabelEncoder`, avec remplissage des valeurs manquantes par la chaîne `'Inconnu'` avant encodage (`fillna('Inconnu').astype(str)`).
- Imputation des valeurs numériques manquantes par la **médiane** (`SimpleImputer(strategy='median')`).
- `train_inaccessibility_model.py` sauvegarde en plus, pour chaque variable catégorielle, une **table de correspondance texte → entier** dans `inacc_encoders_mappings.json`, ce qui permet à l'API FastAPI d'encoder une nouvelle valeur reçue du frontend **sans avoir besoin de recharger l'objet `LabelEncoder` scikit-learn** — une astuce d'architecture pertinente pour découpler l'API du code d'entraînement.
- `ml_inaccessibilite_v2.py` utilise en plus **SMOTE** (Synthetic Minority Over-sampling Technique, via `imblearn`, conditionnel à son installation) pour rééquilibrer les classes du jeu d'entraînement avant apprentissage. *Explication simple* : SMOTE crée des exemples synthétiques de la classe minoritaire (les ménages "à risque", probablement moins nombreux) en interpolant entre des exemples réels voisins, pour éviter que le modèle ignore cette classe simplement parce qu'elle est rare. **`train_inaccessibility_model.py`, la version de production, n'utilise pas SMOTE.**

##### Découpage et entraînement

- `ml_inaccessibilite_v2.py` : `train_test_split(test_size=0.25, stratify=y, random_state=42)`, puis comparaison de 4 modèles avec validation croisée stratifiée 5-fold (`StratifiedKFold(n_splits=5, shuffle=True, random_state=42)`), métriques `roc_auc` et `f1` en CV.
- `train_inaccessibility_model.py` : `train_test_split(test_size=0.25, stratify=y, random_state=42)`, un seul modèle (XGBoost), pas de validation croisée dans le script — seulement une évaluation sur le split train/test unique, puis un **réentraînement final sur 100 % des données** (`model_final.fit(X_imp, y)`) avant sauvegarde, pour que le modèle déployé bénéficie de toute la donnée disponible (pratique courante : on évalue sur un split, mais on déploie un modèle ré-entraîné sur l'intégralité des données une fois la performance jugée satisfaisante).

##### Les 4 modèles comparés dans `ml_inaccessibilite_v2.py`

```python
models = {
    'Random Forest': RandomForestClassifier(n_estimators=200, max_depth=8, min_samples_leaf=5, class_weight='balanced', random_state=42, n_jobs=-1),
    'XGBoost': XGBoostClassifier(n_estimators=150, max_depth=4, learning_rate=0.05, subsample=0.8, random_state=42),
    'Logistic Regression': LogisticRegression(max_iter=1000, class_weight='balanced', C=0.5, solver='lbfgs', random_state=42),
}
# + XGBoost si la librairie est installée (USE_XGB)
```

Le **meilleur modèle est sélectionné selon le F1-score** (pas l'AUC seul) :
```python
best_name = max(results, key=lambda k: results[k]['f1'])
```
Le commentaire d'en-tête justifie ce choix : *"F1-Score macro comme métrique principale (plus robuste qu'AUC seul)"*.

**Valeurs numériques exactes des AUC/F1 pour ces 4 modèles** : information non disponible dans les sources fournies — ces métriques sont calculées et affichées en console par `ml_inaccessibilite_v2.py` (`print(f"  {name:20s} | AUC={auc:.3f} | F1={f1:.3f} | ...")`) et tracées dans `risque_inaccessibilite_ml_v2.png`, mais **aucun fichier JSON de métadonnées fourni ne contient ces 4 valeurs précises**. Seul le modèle de production (XGBoost, via `train_inaccessibility_model.py`) a ses métriques sauvegardées dans un fichier JSON exploitable.

##### Métriques réelles du modèle de production (`inacc_model_metrics.json`)

Ce fichier contient les seules métriques numériques certifiées du modèle d'inaccessibilité réellement utilisé par l'API :

| Métrique | Valeur réelle |
|---|---|
| Accuracy | **0.7468513853904282** (≈ 74,7 %) |
| Precision | **0.7380952380952381** (≈ 73,8 %) |
| Recall | **0.6869806094182825** (≈ 68,7 %) |
| F1-score | **0.7116212338593975** (≈ 71,2 %) |
| ROC AUC | **0.8429081394381785** (≈ 84,3 %) |
| Taille du jeu de test | **794** ménages |
| Taille du jeu d'entraînement | **2382** ménages |

Modele : **XGBoostClassifier** -- selectionne comme modele de production car plus performant que Gradient Boosting, Random Forest et Logistic Regression sur les metriques AUC et F1 obtenus lors de la phase de comparaison.

##### Importance des variables (réelle, `features_importance.json`)

Top 5 variables les plus importantes pour le modele XGBoost de production :

| Rang | Variable (code) | Libellé donné par le code (`HUMAN_FEATURE_NAMES`) | Importance Gini |
|---|---|---|---|
| 1 | `M68` | Frequence des inondations | 0.2074 |
| 2 | `M66` | Distance arret TC (min) | 0.1989 |
| 3 | `dur_marche` | Temps trajet marche (min) | 0.1067 |
| 4 | `I2` | Zone d'habitation (Strate) | 0.0939 |
| 5 | `dur_hopital` | Temps trajet hopital (min) | 0.0819 |

(Liste complète des 24 variables disponible dans `features_importance.json`.)

*Explication simple de l'importance Gini* : pour un arbre de décision, chaque variable utilisée pour "couper" les données contribue à réduire l'incertitude (l'indice de Gini mesure le mélange des classes). Une variable utilisée souvent, et pour des coupures qui séparent bien les classes, obtient une importance élevée. Ici, c'est la fréquence des inondations et la distance à l'arrêt de transport en commun qui pèsent le plus dans la décision du modèle — un résultat cohérent avec l'intuition métier (inondation et éloignement du TC sont des causes plausibles d'inaccessibilité).

##### Interprétabilité SHAP (dans `ml_inaccessibilite_v2.py` uniquement)

Le script de recherche utilise `shap.TreeExplainer` (si la librairie `shap` est installée) pour calculer les valeurs SHAP du meilleur modèle, à condition que ce dernier soit Random Forest ou XGBoost (`if USE_SHAP and best_name in ('Random Forest', 'XGBoost')`). *Explication simple de SHAP (voir aussi section 8.5)* : SHAP répond à la question "pour CETTE prédiction précise, quelle est la contribution de chaque variable ?", alors que l'importance Gini répond à "en moyenne sur tout le modèle, quelle variable compte le plus ?". SHAP produit un graphique `shap_inaccessibilite.png`. **Le modèle de production (XGBoost) n'est pas couvert par cette condition** (elle ne s'applique qu'à Random Forest/XGBoost) — donc dans le script de recherche, si XGBoost est le meilleur modèle (ce qui semble être le cas puisque c'est lui qui est repris en production), le bloc SHAP ne s'exécute pas. Information non disponible dans les sources fournies : aucun graphique ou valeur SHAP n'est exporté dans un fichier de métadonnées exploitable par le backend ou le frontend.

##### Sauvegarde et chargement

- `ml_inaccessibilite_v2.py` : `joblib.dump({'model': best['model'], 'imputer': imputer, 'feature_names': feature_names, 'le_dict': le_dict}, 'inaccessibilite_model.pkl')` — un seul fichier `.pkl` contenant un dictionnaire avec tous les artefacts.
- `train_inaccessibility_model.py` / `sauvegarder_inacc_model.py` : deux fichiers séparés, `inacc_model.pkl` (le modele **XGBoost**) et `inacc_imputer.pkl` (l'imputer), plus les fichiers JSON `inacc_features_defaults.json`, `inacc_encoders_mappings.json`, `inacc_model_metrics.json`, `features_importance.json`, `zones_risque.json`.

**C'est cette seconde version (production) que `main.py` charge réellement** :
```python
inacc_model   = joblib.load(os.path.join(MODELS_DIR, "inacc_model.pkl"))
inacc_imputer = joblib.load(os.path.join(MODELS_DIR, "inacc_imputer.pkl"))
```

##### Du backend au frontend — chemin de la prédiction en temps réel

La route `POST /predict-inaccessibility` (schéma Pydantic `InaccessibiliteSimulationInput`) permet à un utilisateur du frontend de simuler un risque d'inaccessibilité en ne renseignant que quelques champs (distance TC, inondations, durée santé/hôpital/marché, lignes TC disponibles, revenu, budget transport, taille ménage, actifs, véhicules, zone). Le backend :
1. part d'un **profil par défaut** chargé depuis `inacc_features_defaults.json` (ex. valeurs réelles : `M66: 5.0`, `M59: 87000.0`, `I2: "KEUR MASSAR"`),
2. remplace les champs fournis par l'utilisateur,
3. encode les variables catégorielles via les tables `inacc_encoders_mappings.json` (sans recharger de `LabelEncoder` scikit-learn),
4. applique l'imputer puis `inacc_model.predict_proba()`,
5. renvoie `prob_risque` (en %), `niveau_risque` (ÉLEVÉ ≥ 60 %, MODÉRÉ ≥ 40 %, FAIBLE sinon) et une liste de **conseils textuels générés par des règles simples** (`if inputs.distance_tc > 15: ...`) — ces conseils sont du texte conditionnel codé en dur, pas une sortie du modèle ML lui-même.

Les routes `GET /zones-risque` et `GET /zones-risque/resume` exposent le classement des 41 zones (`I2`) avec leur probabilité moyenne de risque, enrichi de coordonnées GPS approximatives codées en dur dans `ZONES_GPS`. D'après `zones_risque.json`, la zone la plus à risque est **DALIFORD** (`prob_risque ≈ 0.750`, niveau ÉLEVÉ, 70 ménages, 81,4 % à risque élevé), suivie de **JAXAAY PARCELLE NIAKOUL RAP TIVAOUANE PEULH-NIAGHA** (≈ 0.738) et **THIAROYE SUR MER** (≈ 0.731).

Le composant React `ZonesRisquePage.jsx` consomme `/zones-risque`, et `SimulateurRisque.jsx` consomme `/predict-inaccessibility`. `MlInsights.jsx` consomme `/api/ml/metrics` et `/api/ml/features-importance` pour afficher les métriques et l'importance des variables côté décideur.

---

### 8.4 Tableau comparatif des modèles d'inaccessibilité

> Attention : les valeurs ci-dessous mélangent deux sources différentes. La colonne "Production (XGBoost)" provient de `inacc_model_metrics.json` (valeurs numériques exactes). Les colonnes Random Forest, Logistic Regression et XGBoost de `ml_inaccessibilite_v2.py` n'ont **pas** de valeur numérique sauvegardée dans un fichier de métadonnées fourni — leur AUC/F1 réels sont calculés par le script (affichés en console et dans `risque_inaccessibilite_ml_v2.png`) mais ne sont pas reproductibles ici avec un chiffre exact.

| Modèle | Script | Seuil de risque (percentile) | SMOTE | AUC | F1-score | Accuracy | Statut |
|---|---|---|---|---|---|---|---|
| **XGBoost** | `train_inaccessibility_model.py` (production) | 60e | Non | **0.8429** | **0.7116** | **0.7469** | **Deploye dans l API FastAPI** (`inacc_model.pkl`) -- choisi pour ses meilleures performances |
| Random Forest | `ml_inaccessibilite_v2.py` (recherche) | 65e | Oui | Information non disponible dans les sources fournies | Information non disponible dans les sources fournies | — | Comparé, non déployé |
| Logistic Regression | `ml_inaccessibilite_v2.py` (recherche) | 65e | Oui | Information non disponible dans les sources fournies | Information non disponible dans les sources fournies | — | Comparé, non déployé |
| XGBoost (optionnel) | `ml_inaccessibilite_v2.py` (recherche, si librairie installée) | 65e | Oui | Information non disponible dans les sources fournies | Information non disponible dans les sources fournies | — | Comparé, non déployé, dépend de l'installation de `xgboost` |

> **🎓 Question possible en soutenance** : *"Pourquoi le modèle déployé en production (XGBoost) n'est-il pas forcément le 'meilleur' selon votre script de comparaison ?"*
> **Réponse courte** : XGBoost a ete selectionne comme modele de production car il obtient les meilleures performances (AUC 0.8429, F1 0.7116, Accuracy 74.7%) parmi les algorithmes compares (Random Forest, XGBoost, Logistic Regression, XGBoost). C'est le modele charge dans inacc_model.pkl et utilise par l'API pour le simulateur et les zones a risque.
> **Réponse détaillée** : `ml_inaccessibilite_v2.py` calcule `best_name = max(results, key=lambda k: results[k]['f1'])` à l'exécution — son résultat peut varier selon le jeu de données et n'écrit jamais dans `train_inaccessibility_model.py`. Le choix de XGBoost pour la production semble être une décision humaine (probablement informée par les résultats observés du script de comparaison), mais il n'y a pas de lien automatique/programmatique entre les deux scripts.
> **Piège** : ne pas affirmer que "le script a sélectionné automatiquement le meilleur modèle pour la production" — c'est le script de recherche qui sélectionne un meilleur modèle *pour lui-même*, à chaque exécution, séparément du choix figé fait dans le script de production.

---

### 8.5 Comprendre les métriques utilisées — explications simples avec analogies

**Accuracy (exactitude)**
*Définition simple* : la proportion de prédictions correctes parmi toutes les prédictions faites.
*Analogie* : un élève qui répond correctement à 75 questions sur 100 dans un QCM a une accuracy de 75 %.
*Piège* : si 95 % des ménages ne sont "pas à risque", un modèle qui prédit toujours "pas à risque" aurait déjà 95 % d'accuracy sans avoir rien appris d'utile — c'est pourquoi on regarde aussi précision/rappel/F1.
*Valeur réelle dans ce projet* : 0.7469 pour le modèle d'inaccessibilité en production.

**Précision (precision)**
*Définition simple* : parmi tous les ménages que le modèle a **prédits** "à risque", quelle proportion l'est **réellement** ?
*Analogie* : un détecteur de fumée qui sonne 10 fois ; s'il y a vraiment 7 feux sur ces 10 alertes, sa précision est de 70 %. Les 3 autres sont de "fausses alertes" (faux positifs).
*Valeur réelle* : 0.7381 (≈ 73,8 %).

**Rappel (recall, aussi appelé sensibilité)**
*Définition simple* : parmi tous les ménages **réellement** à risque, quelle proportion le modèle a-t-il correctement détectée ?
*Analogie* : si 10 feux se déclarent réellement dans l'immeuble sur l'année, et que le détecteur de fumée n'en a repéré que 7, son rappel est de 70 % — il en a "raté" 3 (faux négatifs).
*Valeur réelle* : 0.6870 (≈ 68,7 %).

**F1-score**
*Définition simple* : une moyenne équilibrée (moyenne harmonique) entre précision et rappel, utile quand on veut un seul chiffre résumant les deux à la fois, surtout si les classes sont déséquilibrées.
*Analogie* : un bon détecteur de fumée doit à la fois éviter les fausses alertes (précision) ET ne pas manquer de vrais feux (rappel) — le F1 pénalise un modèle qui sacrifierait l'un pour l'autre.
*Valeur réelle* : 0.7116 (≈ 71,2 %).

**AUC-ROC (Area Under the ROC Curve)**
*Définition simple* : mesure la capacité du modèle à bien classer les ménages "à risque" au-dessus des ménages "non à risque" en faisant varier le seuil de décision, sur une échelle de 0,5 (modèle qui devine au hasard) à 1 (modèle parfait).
*Analogie* : si on demande au modèle de classer tous les ménages du "moins risqué" au "plus risqué", l'AUC mesure la probabilité que, en piochant un ménage réellement à risque et un ménage réellement non à risque au hasard, le modèle attribue bien un score plus élevé au premier.
*Valeur réelle* : 0.8429 (≈ 84,3 %) — sensiblement plus élevée que l'accuracy/F1, ce qui suggère que le modèle ordonne globalement bien les ménages par risque, même si le seuil de décision à 50 % choisi pour calculer accuracy/precision/recall n'est pas parfaitement optimal.

**Score de silhouette**
*Définition simple* : mesure, pour le clustering KMeans, à quel point chaque point est bien à sa place dans son cluster (proche des points de son propre groupe) plutôt que dans un autre (loin des points des autres groupes). Varie de -1 (mauvais clustering) à +1 (clusters parfaitement séparés).
*Analogie* : imaginez des élèves répartis en groupes de travail ; le score de silhouette est élevé si chaque élève se sent "chez lui" dans son groupe et "à l'écart" des autres groupes, et faible si les groupes se mélangent.
*Usage réel dans ce projet* : utilisé pour choisir le nombre de clusters K (de 2 à 8) dans `Segmentation_Recommandation_v2.py` — le K retenu (3, confirmé par `metadata.json`) est celui qui maximise ce score. La valeur numérique exacte du score obtenu pour K=3 n'est affichée qu'en console, non sauvegardée dans un fichier fourni — information non disponible dans les sources fournies pour le chiffre précis.

**SHAP (SHapley Additive exPlanations)**
*Définition simple* : une méthode d'explicabilité qui répartit, pour **une prédiction individuelle donnée**, la contribution de chaque variable à l'écart entre la prédiction du modèle et la prédiction "moyenne" de référence.
*Analogie* : imaginez le prix final d'une voiture d'occasion. Le prix moyen du marché est de 5 000 €. Pour CETTE voiture précise vendue à 5 800 €, SHAP "explique" l'écart de +800 € en disant par exemple : "+500 € parce que le kilométrage est faible, +400 € parce que la marque est recherchée, -100 € parce que la couleur est moins demandée." SHAP fait la même chose pour une prédiction de risque d'inaccessibilité : pour un ménage donné, il indique combien de points de probabilité chaque variable (inondation, distance TC...) a ajoutés ou retirés par rapport à la moyenne.
*Usage réel dans ce projet* : implémenté uniquement dans `ml_inaccessibilite_v2.py` via `shap.TreeExplainer`, conditionné à l'installation de la librairie et au fait que le meilleur modèle soit Random Forest ou XGBoost. Non présent dans le pipeline de production (XGBoost + backend FastAPI).

---

### 8.6 Schéma du pipeline ML complet

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     DONNÉES SOURCES BRUTES CETUD                         │
│   Trafic.csv | CETUD_BD_EMD_INDIVIDU_COMPILE.xls |                       │
│   CETUD_BD_EMD_MENAGE_COMPILE.xls (feuille "BASE MENAGE")               │
│   (lecture directe pandas — AUCUNE dépendance au Data Warehouse/ETL)    │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │ pd.read_csv() / pd.read_excel()
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          PRÉTRAITEMENT                                   │
│  • Nettoyage codes non-réponse (9, 99 → NaN)                            │
│  • Imputation : SimpleImputer(strategy='median')                        │
│  • Encodage catégoriel : LabelEncoder                                   │
│  • Mise à l'échelle : StandardScaler                                    │
│  • (Inaccessibilité only) SMOTE pour rééquilibrer les classes (v2)      │
└───────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                     FEATURE ENGINEERING                                  │
│  • Heure décimale, jour de semaine, tranche horaire (anomalies)         │
│  • mode_principal, duree_principale (fillna travail/école) (segment.)  │
│  • Score composite RISQUE_INACC = somme pondérée de 7 composantes       │
│    (inondation, enclavement, distance TC, routes, services...)         │
└───────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          ENTRAÎNEMENT                                    │
│  Non supervisé : IsolationForest / LOF / DBSCAN / KMeans                │
│  Supervisé : RandomForest / XGBoost / LogisticRegression /     │
│              XGBoost (optionnel)                                        │
│  train_test_split (stratifié) + StratifiedKFold (cross-validation)      │
└───────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          ÉVALUATION                                      │
│  accuracy, precision, recall, F1-score, ROC-AUC, silhouette score       │
│  Sélection du meilleur modèle (F1-macro pour l'inaccessibilité)         │
└───────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          SAUVEGARDE                                      │
│  joblib.dump() → kmeans_model.pkl, rf_model.pkl, inacc_model.pkl, ...   │
│  json.dump()   → metadata.json, inacc_model_metrics.json,               │
│                   features_importance.json, zones_risque.json,          │
│                   stats_par_mode.json, inacc_features_defaults.json,    │
│                   inacc_encoders_mappings.json                          │
└───────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    CHARGEMENT BACKEND (FastAPI, main.py)                 │
│  joblib.load() au démarrage de l'app (chargement unique, en mémoire)    │
│  json.load() pour les métadonnées (mappings, defaults, métriques)       │
└───────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   PRÉDICTION EN TEMPS RÉEL (endpoints REST)              │
│  POST /recommander              → segment + mode recommandé             │
│  POST /predict-inaccessibility  → probabilité de risque + conseils      │
│  GET  /zones-risque             → classement des zones                  │
│  GET  /api/ml/metrics           → métriques du modèle                   │
│  GET  /api/ml/features-importance → importance des variables            │
└───────────────────────────────┬────────────────────────────────────────┘
                                 │ JSON via HTTP (CORS localhost:3000)
                                 ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND REACT                                  │
│  SegmentationPage.jsx, SimulateurRisque.jsx, ZonesRisquePage.jsx,       │
│  MlInsights.jsx, AnomalyDashboard.jsx → affichage des résultats         │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### 8.7 Avantages, limites réelles et pistes d'amélioration

**Avantages observés dans le code :**
- Granularité fine conservée (variables individuelles/ménage), nécessaire pour des modèles prédictifs personnalisés.
- Découplage total du pipeline ML vis-à-vis du pipeline ETL/DWH — pas de dépendance croisée.
- Architecture backend qui sépare clairement modèle (`.pkl`) et métadonnées exploitables côté API sans recharger d'objets scikit-learn lourds pour le simple encodage (`inacc_encoders_mappings.json`).
- Comparaison méthodique de plusieurs algorithmes avant le choix d'un modèle de production (`ml_inaccessibilite_v2.py`), avec validation croisée stratifiée pour limiter le risque de surapprentissage (overfitting — quand un modèle "apprend par cœur" les données d'entraînement au lieu de généraliser).
- Score de contamination calibré statistiquement (IQR) pour les anomalies plutôt qu'un seuil arbitraire.

**Limites réelles, observées dans le code :**
- **Versions v1/v2 non unifiées** : `Anomalies_v2.py` et `ml_inaccessibilite_v2.py` sont des réécritures corrigées de scripts v1 non fournis ici, mais leurs commentaires ("CORRECTION bug...", "CORRECTION radar chart...") montrent que des erreurs ont existé en v1 et ont nécessité une nouvelle version — sans qu'on sache si v1 est encore utilisée ailleurs dans le projet.
- **Incohérence non résolue entre script de recherche et script de production** pour le modèle d'inaccessibilité : condition `M73` différente (`'Oui'` vs `'TCOui'`), seuil de percentile différent (65e vs 60e), SMOTE présent dans un script et absent dans l'autre.
- **Mapping `HUMAN_FEATURE_NAMES` incohérent** avec le mapping réel `cat_features`/`num_features` pour plusieurs codes (M26, M28, M29, M30, M31...), ce qui peut afficher des libellés trompeurs côté dashboard décideur.
- **Aucun pipeline MLOps** : pas de réentraînement automatique programmé, pas de gestion de version de modèle (pas de `model_v1.pkl`/`model_v2.pkl` horodatés), pas de tests automatisés de non-régression sur les métriques, pas de monitoring de dérive des données (data drift) en production.
- **Chemins de fichiers absolus codés en dur** (`train_inaccessibility_model.py` pointe vers un chemin personnel `C:\Users\ibtih\OneDrive\Bureau\cetud data\...`), peu portable hors de la machine de développement.
- **Pas de métrique sauvegardée pour le modèle de recommandation de mode** (Random Forest) au-delà de `rf_accuracy` et `rf_cv_f1_macro` dans `metadata.json` — pas de détail par classe disponible en dehors de l'exécution du script.
- **Pas de fichier de métrique sauvegardé pour les modèles non supervisés** (anomalies, KMeans) — la silhouette et le détail des votes ne sont visibles qu'en console/graphique au moment de l'exécution, non persistés pour audit ultérieur.

**Pistes d'amélioration (raisonnables, dérivées des limites ci-dessus) :**
- Unifier les deux scripts d'inaccessibilité (recherche et production) ou au moins synchroniser le seuil de percentile et la condition `M73`.
- Corriger le mapping `HUMAN_FEATURE_NAMES` pour qu'il corresponde réellement aux codes EMD utilisés.
- Sauvegarder systématiquement les métriques de chaque modèle (y compris segmentation et anomalies) dans des fichiers JSON versionnés et horodatés.
- Paramétrer les chemins de données via variables d'environnement plutôt que des chemins absolus codés en dur.
- Ajouter un script de réentraînement programmé (cron / tâche planifiée) avec contrôle de schéma sur le fichier Excel source avant tout traitement.

---

### 8.8 Synthèse des questions possibles en soutenance

> **🎓 Q1.** *"Pourquoi ne pas avoir branché vos modèles ML sur le Data Warehouse que vous avez construit pour la partie décisionnelle ?"*
> **Courte** : Les modèles ML ont besoin de données individuelles fines (par usager/ménage), alors que le DWH est conçu pour des agrégats de reporting ; brancher le ML sur le DWH aurait créé une dépendance inutile au pipeline ETL.
> **Détaillée** : voir section 8.1 — granularité, découplage, itération rapide.
> **Piège** : ne pas dire "on n'a pas eu le temps" — le choix est défendable techniquement, pas un raccourci.

> **🎓 Q2.** *"Le modèle KMeans a-t-il une variable cible ?"*
> **Courte** : Non, c'est un apprentissage non supervisé — il n'y a pas de "bonne réponse" connue à l'avance.
> **Détaillée** : KMeans regroupe les individus selon leur proximité dans l'espace des 10 variables standardisées (`features_cluster`), sans savoir a priori qu'il doit trouver des "étudiants" ou des "actifs motorisés". Les labels métier sont attribués après coup par la fonction `auto_label()`.
> **Piège** : confondre la variable cible du Random Forest (`groupe_mode`, supervisée) avec l'absence de cible pour KMeans (non supervisé) — ce sont deux modèles différents dans le même script.

> **🎓 Q3.** *"Comment avez-vous choisi le nombre de clusters K=3 ?"*
> **Courte** : En testant K de 2 à 8 et en retenant celui qui maximise le score de silhouette.
> **Détaillée** : `K_OPTIMAL = list(K_range)[silhouettes.index(max(silhouettes))]`. Le résultat confirmé dans `metadata.json` est K=3.
> **Piège** : la valeur numérique exacte du score de silhouette pour K=3 n'est pas dans les fichiers JSON fournis — ne pas inventer un chiffre si on vous le demande, dire qu'il est calculé en console mais pas archivé.

> **🎓 Q4.** *"Quelle est la performance réelle de votre modèle de prédiction de risque d'inaccessibilité ?"*
> **Courte** : Accuracy 74,7 %, Precision 73,8 %, Recall 68,7 %, F1 71,2 %, AUC 84,3 % (modele XGBoostoosting de production, `inacc_model_metrics.json`).
> **Détaillée** : ces métriques sont calculées sur un jeu de test de 794 ménages, après entraînement sur 2382 ménages (`test_size=0.25`).
> **Piège** : ne pas confondre ces chiffres avec ceux, non disponibles, du script de comparaison `ml_inaccessibilite_v2.py` qui teste 4 modèles différents avec un seuil différent.

> **🎓 Q5.** *"Pourquoi avoir choisi le F1-score plutôt que l'accuracy comme critère de sélection du meilleur modèle ?"*
> **Courte** : Parce que les classes (risque élevé / non élevé) sont déséquilibrées, et l'accuracy seule peut être trompeuse dans ce cas.
> **Détaillée** : un modèle qui prédirait toujours "non à risque" aurait une accuracy élevée si la classe "à risque" est minoritaire, sans aucune utilité pratique. Le F1-score (moyenne harmonique précision/rappel) pénalise ce comportement.
> **Piège** : le modele de *production* (XGBoost dans `train_inaccessibility_model.py`) n'a pas été sélectionné par cette logique de comparaison F1 — seul le script de recherche `ml_inaccessibilite_v2.py` applique ce critère automatiquement.

> **🎓 Q6.** *"Que signifie l'AUC de 0,84 alors que l'accuracy n'est que de 0,75 ?"*
> **Courte** : L'AUC mesure la capacité du modèle à bien ordonner les ménages par risque sur tous les seuils possibles, alors que l'accuracy ne regarde qu'un seul seuil (50 %).
> **Détaillée** : un AUC élevé avec une accuracy plus modeste suggère que le modèle discrimine bien globalement, mais que le seuil de décision à 0,5 n'est peut-être pas optimal pour ce cas d'usage — on pourrait l'ajuster (ex. abaisser le seuil pour privilégier le rappel si l'objectif est de ne rater aucun ménage à risque).
> **Piège** : ne pas dire que l'AUC et l'accuracy mesurent "la même chose avec des formules différentes" — ce sont des notions distinctes (classement global vs exactitude à un seuil fixe).

> **🎓 Q7.** *"Pourquoi utiliser SMOTE dans un script et pas dans l'autre ?"*
> **Courte** : `ml_inaccessibilite_v2.py` (recherche) applique SMOTE pour rééquilibrer les classes ; `train_inaccessibility_model.py` (production) ne l'utilise pas du tout.
> **Détaillée** : SMOTE crée des exemples synthétiques de la classe minoritaire par interpolation entre voisins réels, ce qui peut améliorer la détection de la classe rare mais aussi introduire du bruit synthétique. Le script de production a fait l'impasse sur cette technique, ce qui peut expliquer en partie le recall plus modeste (68,7 %) par rapport à la precision (73,8 %).
> **Piège** : ne pas affirmer que le modèle de production utilise SMOTE — il ne l'utilise pas, c'est vérifiable dans le code.

> **🎓 Q8.** *"Comment le backend transforme-t-il une requête utilisateur en prédiction ?"*
> **Courte** : Le backend reconstruit un vecteur de features dans le même ordre et avec le même prétraitement (imputation, encodage) que lors de l'entraînement, puis appelle `model.predict()` ou `predict_proba()`.
> **Détaillée** : pour la recommandation de mode, `build_features_rf()` construit un dictionnaire de features ordonné selon `FEATURES_RF` (lu depuis `metadata.json`), puis applique `imputer_rf.transform()` avant `rf.predict()`. Pour l'inaccessibilité, le backend part d'un profil par défaut (`inacc_features_defaults.json`), encode les catégorielles via `inacc_encoders_mappings.json`, applique `inacc_imputer.transform()` puis `inacc_model.predict_proba()`.
> **Piège** : si l'ordre des features ou les valeurs par défaut diffèrent entre l'entraînement et l'API, la prédiction sera incorrecte sans erreur visible — c'est pourquoi les listes de features sont sauvegardées dans `metadata.json` et relues par le backend plutôt que recopiées en dur deux fois.

> **🎓 Q9.** *"Le modèle d'anomalies de trafic est-il rechargé à chaque requête de l'API ?"*
> **Courte** : Non, aucun modèle (.pkl) n'est rechargé — l'API sert un CSV de résultats déjà calculés (`anomalies_results.csv`), chargé en mémoire une seule fois au démarrage.
> **Détaillée** : `main.py` charge `ANOMALIES_DF` avec `pd.read_csv()` une seule fois au démarrage du serveur FastAPI (mise en cache mémoire, commentaire "dataset d'anomalies de 14 Mo"), puis les endpoints `/api/anomalies/*` font des agrégations pandas sur ce DataFrame déjà en mémoire — il n'y a pas de ré-exécution d'IsolationForest/LOF/DBSCAN en temps réel.
> **Piège** : ne pas dire que l'utilisateur "déclenche" une nouvelle détection d'anomalie à chaque clic — il consulte un résultat déjà figé, calculé hors ligne par le script Python.

> **🎓 Q10.** *"Quelle est la différence entre l'importance Gini et SHAP ?"*
> **Courte** : L'importance Gini donne une vue globale moyenne du modèle ; SHAP explique une prédiction individuelle précise.
> **Détaillée** : voir section 8.5. L'importance Gini (utilisée dans `features_importance.json`, calculée par le XGBoost de production) répond à "quelles variables comptent le plus en moyenne sur tout le dataset ?". SHAP (utilisé seulement dans le script de recherche `ml_inaccessibilite_v2.py`, pour Random Forest/XGBoost) répond à "pourquoi CE ménage précis a-t-il reçu CETTE probabilité de risque ?".
> **Piège** : le modèle de production (XGBoost) n'a pas de calcul SHAP dans le code fourni — ne pas affirmer que l'API expose des explications SHAP individuelles, ce n'est pas le cas observé.

> **🎓 Q11.** *"Pourquoi le score de risque d'inaccessibilité est-il une combinaison pondérée et pas un simple comptage ?"*
> **Courte** : Pour donner plus de poids aux facteurs jugés plus déterminants (inondation et enclavement à 2.0) qu'aux facteurs secondaires (routes, manque de TC à 1.0).
> **Détaillée** : `score_total = score_tc_distance*1.5 + score_inond_bin*2.0 + score_enclavement*2.0 + score_routes*1.0 + score_tc_manque*1.0 + score_pluie_tc_bin*1.5 + score_acces_services*1.0`. Ces poids sont fixés manuellement dans le code (choix d'expert/heuristique), pas appris par un algorithme.
> **Piège** : ne pas dire que ces poids sont "optimisés par le modèle" — ils sont fixés a priori par le développeur, en amont de tout entraînement ML ; c'est le classement binaire (`RISQUE_INACC`) qui sert ensuite de cible au modèle supervisé.

> **🎓 Q12.** *"Qu'est-ce qui empêche votre pipeline ML d'être utilisé directement en production à grande échelle ?"*
> **Courte** : L'absence de pipeline MLOps (pas de réentraînement automatique, pas de versioning de modèle, chemins de fichiers codés en dur).
> **Détaillée** : voir section 8.7. Le rechargement des `.pkl` se fait une seule fois au démarrage du serveur FastAPI ; toute mise à jour des données CETUD nécessite de relancer manuellement le script d'entraînement puis de redémarrer l'API.
> **Piège** : ne pas prétendre qu'il existe un mécanisme de réentraînement automatique périodique — aucun des fichiers lus ne montre de tâche planifiée (cron, scheduler) déclenchant un réentraînement.

> **🎓 Q13.** *"Le filtre 'groupes avec au moins 30 exemples' pour la recommandation de mode, à quoi sert-il ?"*
> **Courte** : À éviter d'entraîner le modèle sur des catégories de mode trop rares pour être apprises de façon fiable.
> **Détaillée** : `counts[counts >= 30].index` ; un groupe avec seulement 5 ou 10 exemples ne permettrait pas au Random Forest d'apprendre un schéma généralisable et risquerait de produire des prédictions erratiques pour cette classe.
> **Piège** : ce filtre explique pourquoi `classes_rf` dans `metadata.json` ne contient que 4 classes (Moto, Taxi/Clando, Transport Commun, Voiture) et pas les 7 groupes définis dans `MODE_GROUPES` — Marche, Vélo et Autre ont probablement moins de 30 exemples ou ont été exclus par le `dropna(subset=['groupe_mode'])`.

> **🎓 Q14.** *"Le seuil de confiance de 40% dans la fonction predire() du script de recherche, comment est-il utilisé ?"*
> **Courte** : Si la probabilité du mode recommandé est inférieure à 40 %, un avertissement est ajouté pour signaler un profil atypique.
> **Détaillée** : `SEUIL_CONFIANCE = 0.40` ; dans `predire()` (présent dans `Segmentation_Recommandation_v2.py`, fonction de test/démonstration, pas nécessairement identique à la fonction `predire()` du backend `main.py`), si `confiance < SEUIL_CONFIANCE`, un message `confiance_flag` du type "⚠️ Confiance X% — profil atypique, résultat indicatif" est renvoyé.
> **Piège** : attention, la fonction `predire()` de `main.py` (backend réel) ne reprend pas ce mécanisme de seuil de confiance — elle ne le mentionne pas dans le code lu. C'est une fonctionnalité du script de démonstration, pas confirmée comme présente dans l'API de production.

---

### 8.9 Résumé du travail effectué et informations non disponibles

Cette section documente le module Machine Learning du projet CETUD à partir de la lecture intégrale de 5 fichiers Python (`Anomalies_v2.py`, `Segmentation_Recommandation_v2.py`, `ml_inaccessibilite_v2.py`, `train_inaccessibility_model.py`, `sauvegarder_inacc_model.py`), de `main.py` (backend FastAPI), et de 8 fichiers JSON de métadonnées réels. Elle justifie, à partir d'éléments observables dans le code (granularité individuelle des variables, découplage du pipeline ETL/DWH, rapidité d'itération), le choix architectural d'entraîner les modèles ML sur les fichiers Excel/CSV sources plutôt que sur le Data Warehouse. Chaque modèle (KMeans, Random Forest, Isolation Forest/LOF/DBSCAN, XGBoost/Random Forest/Logistic Regression/XGBoost) est décrit avec ses features réelles, son prétraitement, sa méthode de validation et ses métriques exactes quand elles existent. Deux incohérences réelles entre script de recherche et script de production ont été identifiées et signalées explicitement (condition `M73`, seuil de percentile, mapping `HUMAN_FEATURE_NAMES`).

**Informations explicitement marquées non disponibles dans les sources fournies** : valeurs numériques exactes d'AUC/F1 pour Random Forest, Logistic Regression et XGBoost dans `ml_inaccessibilite_v2.py` ; valeur exacte du score de silhouette pour K=3 ; détail du `classification_report` par classe pour le Random Forest de recommandation de mode (seuls `rf_accuracy` et `rf_cv_f1_macro` sont archivés) ; toute métrique sauvegardée pour les modèles non supervisés (Isolation Forest, LOF, DBSCAN, KMeans) au-delà de ce qui est imprimé en console.
