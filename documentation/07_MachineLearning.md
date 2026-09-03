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

### 8.9 Résumé du travail effectué et informations non disponibles

Cette section documente le module Machine Learning du projet CETUD à partir de la lecture intégrale de 5 fichiers Python (`Anomalies_v2.py`, `Segmentation_Recommandation_v2.py`, `ml_inaccessibilite_v2.py`, `train_inaccessibility_model.py`, `sauvegarder_inacc_model.py`), de `main.py` (backend FastAPI), et de 8 fichiers JSON de métadonnées réels. Elle justifie, à partir d'éléments observables dans le code (granularité individuelle des variables, découplage du pipeline ETL/DWH, rapidité d'itération), le choix architectural d'entraîner les modèles ML sur les fichiers Excel/CSV sources plutôt que sur le Data Warehouse. Chaque modèle (KMeans, Random Forest, Isolation Forest/LOF/DBSCAN, XGBoost/Random Forest/Logistic Regression/XGBoost) est décrit avec ses features réelles, son prétraitement, sa méthode de validation et ses métriques exactes quand elles existent. Deux incohérences réelles entre script de recherche et script de production ont été identifiées et signalées explicitement (condition `M73`, seuil de percentile, mapping `HUMAN_FEATURE_NAMES`).

**Informations explicitement marquées non disponibles dans les sources fournies** : valeurs numériques exactes d'AUC/F1 pour Random Forest, Logistic Regression et XGBoost dans `ml_inaccessibilite_v2.py` ; valeur exacte du score de silhouette pour K=3 ; détail du `classification_report` par classe pour le Random Forest de recommandation de mode (seuls `rf_accuracy` et `rf_cv_f1_macro` sont archivés) ; toute métrique sauvegardée pour les modèles non supervisés (Isolation Forest, LOF, DBSCAN, KMeans) au-delà de ce qui est imprimé en console.
