# 09 — Intégration globale du projet TransportDakar (CETUD)

> Ce document de synthèse croise les informations déjà établies dans les huit documents précédents (`02_Frontend.md`, `03_Backend_FastAPI.md`, `04_Base_de_donnees.md`, `05_ETL.md`, `06_DataWarehouse.md`, `07_MachineLearning.md`, `08_Knowage.md`, `11_Glossaire.md`). **Aucune information nouvelle n'est inventée** : chaque affirmation est une reformulation, une mise en relation ou une consolidation de ce qui est déjà écrit dans ces fichiers. Lorsqu'un lien entre deux briques n'est pas explicitement confirmé par les sources, ce document le signale par la mention *« non disponible/non confirmé »*, conformément à la règle imposée.

---

## Sommaire

1. [Vue d'ensemble : deux systèmes, pas une seule architecture](#1-vue-densemble--deux-systèmes-pas-une-seule-architecture)
2. [Chaîne n°1 — l'application citoyenne : React → FastAPI → fichiers .pkl/.json](#2-chaîne-n1--lapplication-citoyenne--react--fastapi--fichiers-pkljson)
3. [Chaîne n°2 — le système décisionnel : Sources CETUD → Talend → Data Warehouse → Knowage](#3-chaîne-n2--le-système-décisionnel--sources-cetud--talend--data-warehouse--knowage)
4. [Pourquoi ce sont deux chaînes séparées, pas une intégration unifiée](#4-pourquoi-ce-sont-deux-chaînes-séparées-pas-une-intégration-unifiée)
5. [Comparatif des deux pipelines de données](#5-comparatif-des-deux-pipelines-de-données)
6. [Tableau des fonctionnalités du projet](#6-tableau-des-fonctionnalités-du-projet)
7. [Analyse transversale du code : bonnes pratiques, limites, pistes d'amélioration](#7-analyse-transversale-du-code--bonnes-pratiques-limites-pistes-damélioration)
8. [Schéma de synthèse global](#8-schéma-de-synthèse-global)
10. [Résumé final](#10-résumé-final)

---

## 1. Vue d'ensemble : deux systèmes, pas une seule architecture

Le projet TransportDakar n'est **pas** une plateforme unique avec une seule chaîne de données. En croisant les huit documents, on observe que le projet est en réalité constitué de **deux systèmes informatiques distincts**, qui partagent la même origine (les données brutes du CETUD) mais qui ne se rencontrent jamais après la lecture initiale des fichiers sources :

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                     DONNÉES SOURCES BRUTES CETUD (point de départ commun)    │
│   Fichiers Excel/CSV de l'enquête EMD (ménages, individus, déplacements)     │
│   et des comptages de trafic routier                                         │
└───────────────────┬─────────────────────────────────┬────────────────────────┘
                     │                                 │
                     ▼                                 ▼
   ┌─────────────────────────────────┐   ┌─────────────────────────────────────┐
   │   CHAÎNE N°1 — APPLICATION       │   │   CHAÎNE N°2 — SYSTÈME              │
   │   CITOYENNE (ML + API + React)   │   │   DÉCISIONNEL (BI / reporting)      │
   │                                   │   │                                      │
   │  Fichiers Excel/CSV               │   │  Fichiers Excel/CSV                 │
   │     ↓ pandas (lecture directe)    │   │     ↓ Talend (ETL)                  │
   │  Prétraitement Python             │   │  Staging PostgreSQL (schéma SA)     │
   │     ↓                             │   │     ↓                               │
   │  Modèles scikit-learn (.pkl)      │   │  Data Warehouse PostgreSQL          │
   │     ↓ joblib.load() au démarrage  │   │  (schéma DW, modèle en             │
   │  FastAPI (main.py, port 8000)     │   │  constellation : 4 faits,           │
   │     ↓ fetch JSON                  │   │  10 dimensions)                     │
   │  React (port 3000)                │   │     ↓                               │
   │                                   │   │  Knowage (cockpit "TransportDakar", │
   │                                   │   │  6 sheets, widgets HTML/CSS)        │
   └─────────────────────────────────┘   └─────────────────────────────────────┘
                     │                                 │
                     ▼                                 ▼
            Usager / Citoyen                    Décideur (via React,
            (planning, simulateur,               onglet "Reporting (Knowage)",
            avis citoyen)                        page CockpitDakar.jsx en iframe)
```

📌 **À retenir** : les deux chaînes ne sont reliées **qu'à un seul endroit visible dans le code** : la page React `CockpitDakar.jsx`, qui affiche le cockpit Knowage **dans une iframe**, à l'intérieur de l'espace décideurs de l'application React. C'est un point de jonction **d'affichage uniquement** (intégration visuelle via iframe + proxy same-origin), pas un point de jonction **de données** : React n'appelle aucune API REST côté Knowage/Data Warehouse, et `main.py` (FastAPI) ne lit ni n'écrit jamais dans le schéma `DW` ou `SA` de PostgreSQL. Ce fait est confirmé explicitement par `03_Backend_FastAPI.md` (« Pas de base de données relationnelle : […] aucun import de `sqlalchemy`, `psycopg2`, `pymongo`, etc. ») et par `07_MachineLearning.md` (« aucun de ces scripts ne se connecte à une base de données, à un entrepôt de données (Data Warehouse/DWH) ou à un système décisionnel »).

---

## 2. Chaîne n°1 — l'application citoyenne : React → FastAPI → fichiers .pkl/.json

### 2.1 Confirmation explicite de l'absence de base relationnelle côté usager

D'après `03_Backend_FastAPI.md` (section 8.2, tableau des limites) : *« Pas de base de données relationnelle : toutes les données persistées le sont en fichiers `.json` (`feedback_citoyens.json`) ou en `.csv`/`.json` statiques en lecture — aucun import de `sqlalchemy`, `psycopg2`, `pymongo`, etc. »*. C'est un fait central de l'intégration : **toute la partie usager (React + FastAPI) fonctionne sans aucun moteur de base de données relationnelle**. La persistance repose entièrement sur :

| Type de fichier | Exemples | Rôle |
|---|---|---|
| Modèles entraînés (`.pkl`, via `joblib`) | `kmeans_model.pkl`, `rf_model.pkl`, `inacc_model.pkl`, `kmeans_scaler.pkl`, `rf_imputer.pkl`, etc. | Objets scikit-learn chargés une seule fois en mémoire au démarrage de `main.py` |
| Métadonnées statiques (`.json`) | `metadata.json`, `stats_par_mode.json`, `zones_risque.json`, `satisfaction.json`, `inacc_model_metrics.json`, `features_importance.json`, `inacc_features_defaults.json`, `inacc_encoders_mappings.json` | Libellés, statistiques, seuils, mappings d'encodage |
| Données mesurées (`.csv`) | `anomalies_results.csv` | Résultats déjà calculés de détection d'anomalies, chargés en mémoire pandas au démarrage |
| Stockage applicatif (`.json` en écriture) | `feedback_citoyens.json` | Seul fichier sur lequel l'API **écrit** (avis citoyens), réécrit intégralement à chaque ajout (`json.dump`, sans verrou de concurrence) |

### 2.2 Le flux complet React → FastAPI → fichiers

```
┌──────────────┐
│  Utilisateur │  remplit un formulaire (planning, simulateur, avis citoyen)
└──────┬───────┘
       ▼
┌────────────────────────────┐
│   React (localhost:3000)  │  fetch() natif, pas d'axios, constante API
└──────┬─────────────────────┘  dupliquée dans ~9 fichiers (cf. 02_Frontend.md §12.2)
       │ POST/GET JSON (CORS limité à localhost:3000)
       ▼
┌──────────────────────────────────────────────────────────────────┐
│                FastAPI (main.py, localhost:8000)                 │
│  Pydantic valide la requête → fonctions métier (predire(), etc.) │
│  Lecture des objets .pkl / .json déjà en RAM (chargés au démarrage)│
│  Écriture uniquement pour /api/feedback → feedback_citoyens.json │
└──────┬─────────────────────────────────────────────────────────-─┘
       │ Réponse JSON (validée par response_model Pydantic quand défini)
       ▼
┌────────────────────────────┐
│   React (affichage)        │  tableau de résultat, jauge, graphique recharts
└────────────────────────────┘
```

Ce flux est documenté en détail dans `03_Backend_FastAPI.md` (section 6, schéma ASCII du cycle de vie de `/recommander`) et dans `02_Frontend.md` (sections 6 à 9, détail page par page de tous les appels `fetch`). Les 18 endpoints réels de `main.py` (le `README.md` du projet n'en documente que 5, ce qui est signalé comme une désynchronisation documentaire) couvrent : recommandation de mode (`/recommander`), simulation de risque (`/predict-inaccessibility`), zones à risque (`/zones-risque`, `/zones-risque/resume`), anomalies de trafic (`/api/anomalies/*`), segmentation (`/api/segmentation/profils`), satisfaction et avis citoyens (`/api/satisfaction`, `/api/feedback`, `/api/feedback/stats`), métriques ML (`/api/ml/metrics`, `/api/ml/features-importance`).

### 2.3 Origine des modèles utilisés par cette chaîne

Les modèles `.pkl` chargés par `main.py` proviennent de scripts d'entraînement (`Segmentation_Recommandation_v2.py`, `train_inaccessibility_model.py` / `sauvegarder_inacc_model.py`) qui lisent **directement les fichiers Excel/CSV bruts du CETUD** avec `pandas.read_excel`/`read_csv` — confirmé dans `07_MachineLearning.md` (section 8.1.1) : *« Ce sont des fichiers Excel (.xls) ou CSV bruts, livrés tels quels par le CETUD […], lus directement avec pandas.read_csv / pandas.read_excel. À aucun moment un script ML n'exécute une requête SQL vers un schéma en étoile, ni ne lit une table de faits ou de dimensions issue du pipeline ETL Talend. »* Le ré-entraînement est **manuel et déconnecté de l'exécution de l'API** : un développeur doit relancer ces scripts à la main pour produire de nouveaux `.pkl`/`.json`, puis redémarrer `uvicorn` pour qu'ils soient rechargés (confirmé en `03_Backend_FastAPI.md` section 5.2 : *« Ce pipeline d'entraînement est complètement déconnecté de l'exécution de main.py — il doit être relancé manuellement par un développeur quand les données changent »*).

---

## 3. Chaîne n°2 — le système décisionnel : Sources CETUD → Talend → Data Warehouse → Knowage

### 3.1 Les étapes confirmées

D'après `04_Base_de_donnees.md`, `05_ETL.md` et `06_DataWarehouse.md`, le système décisionnel repose sur :

1. **Sources brutes CETUD** (les mêmes types de fichiers Excel/CSV que pour le ML, mais traités séparément) : `CETUD_BD_EMD_MENAGE_COMPILE.xls`, `CETUD_BD_EMD_INDIVIDU_COMPILE.xls`, `Deplacement.csv`, `CETUD_BD_TRAFIC_SECTION_COMPILE.xls`.
2. **Extraction et chargement en zone de staging** via des jobs Talend (`SA_individu`, `SA_men`/`Job deplacement`, jobs trafic), qui appliquent un filtrage léger de colonnes (`tFilterColumns`) avant d'écrire dans le schéma PostgreSQL `SA` (`SA.menage`, `SA.individu`, `SA.deplacement`, `SA.trafic`).
3. **Transformation et chargement des dimensions** (jobs Talend `Dim_geographie`, `Dim_individu`, `Dim_menage`, `Dim_site`, etc.) avec déduplication (`DISTINCT` SQL ou `tUniqRow`/`tSortRow`), vers le schéma `DW`.
4. **Transformation et chargement des faits** (jobs combinant un flux principal et plusieurs flux de lookup vers les dimensions) vers les 4 tables de faits du modèle en constellation : `Fait_Accessibilite`, `Fait_Deplacement`, `Fait_Comptage`, `Fait_IndividuMenage`.
5. **Restitution via Knowage** : le cockpit "TransportDakar" (6 sheets : Acceuil, Trafic, Déplacements, Démographie, Accessibilité, IA & Prévisions) affiche des KPI et graphiques construits en HTML/CSS pur dans l'éditeur de widget Knowage.

### 3.2 Le lien Knowage ↔ Data Warehouse : ce qui est confirmé et ce qui ne l'est pas

- les widgets observés (sheets Acceuil et Accessibilité) sont construits **en HTML/CSS codé à la main** dans l'éditeur de widget Knowage, et non via des widgets graphiques natifs connectés dynamiquement à un dataset ;
- les valeurs affichées (hauteurs de barres en `%`, KPI chiffrés) sont des **valeurs CSS/HTML fixes** intégrées dans le code du widget, sans preuve d'une liaison dynamique automatique avec les tables du Data Warehouse à chaque chargement de page.

### 3.3 Le seul point de jonction visible entre React et Knowage

`02_Frontend.md` (section 7.11) documente `CockpitDakar.jsx` : cette page React n'appelle **aucun endpoint FastAPI**. Elle affiche le cockpit Knowage dans une `<iframe>` pointant vers `/knowage-vue/workspace/document-composite/Acceuil`, rendue accessible en same-origin grâce à un proxy de développement (`setupProxy.js`) qui redirige vers `http://localhost:18080`. Ce mécanisme permet à React de manipuler le DOM de l'iframe (changer d'onglet interne Knowage par simulation de clic), mais il s'agit d'une **intégration d'affichage**, pas d'un échange de données JSON entre les deux systèmes.

---

## 4. Pourquoi ce sont deux chaînes séparées, pas une intégration unifiée

`07_MachineLearning.md` (section 8.1) est la source la plus explicite sur ce point et formule directement le constat structurant de toute l'intégration du projet :

> **📌 Citation directe de `07_MachineLearning.md`** : *« Il existe deux pipelines de données complètement séparés dans ce projet : 1. Pipeline décisionnel (BI) : Excel/CSV → ETL Talend → Data Warehouse (modèle en étoile) → outils de reporting/dashboards décisionnels. 2. Pipeline Machine Learning : Excel/CSV → pandas → prétraitement Python → modèle scikit-learn/XGBoost → fichier .pkl → API FastAPI → React. Les deux partent de la même donnée brute CETUD, mais ne se croisent jamais après l'étape de lecture du fichier source. »*

Les justifications données par les sources pour ce choix de séparation sont :

1. **Besoin de granularité différente.** Le Data Warehouse est conçu pour l'agrégation (faits résumés par dimensions), alors que les modèles ML ont besoin d'une ligne par individu/ménage avec toutes les variables brutes disponibles. Un DWH orienté reporting agrégerait probablement les données d'une façon qui détruirait l'information nécessaire à un clustering ou une classification individu par individu (`07_MachineLearning.md`, §8.1.2.a).
2. **Indépendance/découplage.** En lisant directement les fichiers CETUD bruts, les scripts ML n'ont aucune dépendance vis-à-vis du schéma du DWH, de sa disponibilité ni du bon déroulement de l'ETL Talend — si le DWH est en maintenance ou l'ETL échoue, l'entraînement ML n'est pas affecté (§8.1.2.b).
3. **Itération rapide.** Les commentaires des scripts ML (`v2`, "CORRECTION bug...", ajustements de seuils) montrent un rythme de correction/réentraînement rapide qui serait ralenti si chaque test nécessitait une mise à jour préalable du DWH via l'ETL Talend (§8.1.2.c).
4. **Conservation de variables non "décisionnelles".** Le modèle d'inaccessibilité utilise des variables très fines de l'enquête ménage (ex. `M67_1` à `M67_8`, disponibilité de 8 types de TC) qui n'ont probablement pas vocation à devenir des dimensions/mesures d'un DWH orienté pilotage stratégique (§8.1.2.d).

## 5. Comparatif des deux pipelines de données

| Critère | Pipeline décisionnel (BI) | Pipeline Machine Learning |
|---|---|---|
| **Étapes** | Sources CETUD → ETL Talend → Data Warehouse (PostgreSQL, schémas `SA`/`DW`) → Knowage → Dashboards/Cockpits → Décideur | Sources CETUD (mêmes types de fichiers Excel/CSV bruts) → Prétraitement Python (pandas) → Feature Engineering → Entraînement (scikit-learn) → Évaluation → Sauvegarde (`.pkl`/`.json`) → Chargement dans FastAPI → Prédictions (endpoints REST) → React (citoyen/décideur) |
| **Outil(s) d'intégration** | Talend Open Studio (jobs graphiques : `tDBInput`, `tMap`, `tSortRow`, `tUniqRow`, `tDBOutput`) | Scripts Python (`Anomalies_v2.py`, `Segmentation_Recommandation_v2.py`, `ml_inaccessibilite_v2.py`, `train_inaccessibility_model.py`, `sauvegarder_inacc_model.py`) |
| **Stockage intermédiaire** | Base de données relationnelle PostgreSQL (`CETUD_PFE`, schémas `SA` puis `DW`) | Aucun — fichiers `.pkl` (modèles sérialisés via `joblib`) et `.json` (métadonnées), pas de SGBD |
| **Modèle de données** | Modèle en constellation (4 faits : `Fait_Accessibilite`, `Fait_Deplacement`, `Fait_Comptage`, `Fait_IndividuMenage` ; 10 dimensions, dont `Dim_Geographie` transversale) | Pas de modèle relationnel — vecteurs de features en mémoire (DataFrames pandas), objets scikit-learn |
| **Granularité des données** | Variable selon le fait (ménage×service, déplacement individuel, relevé de comptage, profil individuel) — agrégation possible par les dimensions | Ligne individuelle par individu/ménage, nécessaire à l'entraînement supervisé/non supervisé |
| **Fréquence de mise à jour** | Information non disponible dans les sources fournies (aucune orchestration/planification de jobs Talend documentée) | Manuelle : un développeur doit relancer les scripts d'entraînement puis redémarrer `uvicorn` — aucun réentraînement automatique programmé (confirmé absent dans `07_MachineLearning.md` §8.7 et §8.8 Q12) |
| **Consommateur final** | Décideur, via le cockpit Knowage intégré en iframe dans la page React `CockpitDakar.jsx` (onglet "Reporting (Knowage)") | Citoyen (planning de transport, simulateur) et décideur (zones à risque, anomalies, segmentation, audit ML), via les pages React de l'espace usager et de l'espace décideurs |
| **Validation/qualité** | Nettoyage par expressions régulières, `COALESCE` pour éviter les FK nulles, normalisation des accents pour les jointures textuelles, dédoublonnage `tUniqRow` | Imputation des valeurs manquantes (médiane), encodage `LabelEncoder`, standardisation (`StandardScaler`), validation croisée stratifiée, métriques (accuracy, F1, ROC-AUC, silhouette) |
| **Lien avec une base de données relationnelle** | Oui — PostgreSQL est au cœur du pipeline (`SA` et `DW`) | Non — confirmé explicitement : aucun script ML ne se connecte à une base de données (`07_MachineLearning.md` §8.1.1) |

📌 **À retenir** : ce tableau illustre concrètement la citation centrale de `07_MachineLearning.md` — les deux pipelines partagent la même origine (les fichiers CETUD) mais utilisent des outils, des formats de stockage intermédiaire et des consommateurs finaux entièrement différents, sans jamais se croiser après l'étape de lecture du fichier source.

---

## 6. Tableau des fonctionnalités du projet

| Fonctionnalité | Objectif | Fichiers concernés | Technologies utilisées | Explication simple |
|---|---|---|---|---|
| **Recommandation de mode de transport** | Prédire le mode de transport (Moto, Taxi/Clando, Transport Commun, Voiture) le plus probable pour un profil usager donné, avec top 3 et fourchettes durée/coût | `FormPage.jsx`, `App.js` (frontend) ; `main.py` endpoint `POST /recommander` ; `rf_model.pkl`, `rf_imputer.pkl`, `rf_label_encoder.pkl`, `stats_par_mode.json` ; `Segmentation_Recommandation_v2.py` (entraînement) | React, FastAPI, Pydantic, scikit-learn (Random Forest), joblib | L'usager remplit un formulaire (âge, revenu, quartiers...). Le profil passe d'abord par un modèle de segmentation (K-Means) puis par un modèle de classification (Random Forest) qui "vote" pour le mode de transport le plus adapté, comme un comité d'experts qui se prononce à partir du profil de la personne. |
| **Segmentation des usagers (K-Means)** | Regrouper les usagers en 3 profils-types de mobilité (Étudiants mobilité douce, Actifs motorisés, Travailleurs informels) | `SegmentationPage.jsx` ; `main.py` endpoints `GET /segments`, `GET /api/segmentation/profils` ; `kmeans_model.pkl`, `kmeans_scaler.pkl`, `kmeans_imputer.pkl`, `metadata.json` ; `Segmentation_Recommandation_v2.py` | React, recharts, FastAPI, scikit-learn (K-Means), PCA | L'algorithme regroupe automatiquement les individus qui se ressemblent (âge, instruction, fréquence de transport en commun...) sans connaître à l'avance les catégories ; un humain donne ensuite un nom compréhensible à chaque groupe selon ses statistiques moyennes. |
| **Simulateur de risque d'inaccessibilité** | Permettre à un décideur de simuler en temps réel la probabilité qu'un ménage soit en situation de risque d'isolement en transport, selon des paramètres ajustables | `SimulateurRisque.jsx` ; `main.py` endpoint `POST /predict-inaccessibility` ; `inacc_model.pkl`, `inacc_imputer.pkl`, `inacc_features_defaults.json`, `inacc_encoders_mappings.json` ; `train_inaccessibility_model.py`/`sauvegarder_inacc_model.py` | React (sliders, debounce 250ms, jauge SVG), FastAPI, scikit-learn (Gradient Boosting) | En déplaçant des curseurs (distance à l'arrêt de bus, fréquence d'inondation, revenu...), le décideur voit en direct une jauge qui indique le niveau de risque calculé par un modèle entraîné sur les enquêtes ménages réelles du CETUD. |
| **Zones à risque d'inaccessibilité** | Cartographier et classer les zones de Dakar par niveau de risque d'inaccessibilité (ÉLEVÉ/MODÉRÉ/FAIBLE) | `ZonesRisquePage.jsx`, `MapView.jsx`, `ExportPDF.jsx` ; `main.py` endpoints `GET /zones-risque`, `GET /zones-risque/resume` ; `zones_risque.json`, dictionnaire `ZONES_GPS` codé en dur | React, Leaflet (carte), FastAPI | Chaque zone de l'enquête est classée selon la probabilité moyenne de risque calculée par le modèle d'inaccessibilité ; la carte affiche des points colorés (rouge/orange/vert) selon ce niveau, et un export PDF peut être généré côté navigateur. |
| **Détection d'anomalies de trafic** | Identifier les comptages de trafic anormaux (sites/heures avec un volume de véhicules inhabituel) | `AnomalyDashboard.jsx`, `MapView.jsx`, `ExportPDF.jsx` ; `main.py` endpoints `GET /api/anomalies/summary`, `/sites`, `/sites/{id}/details` ; `anomalies_results.csv` ; `Anomalies_v2.py` (génération hors ligne) | React, recharts, FastAPI, pandas, scikit-learn (Isolation Forest, Local Outlier Factor), Z-Score, DBSCAN | Trois méthodes statistiques différentes "votent" pour dire si un comptage de trafic est anormal ; si au moins deux methodes sont d'accord, l'anomalie est retenue. Le résultat est déjà calculé à l'avance et stocké dans un fichier CSV que l'API lit, sans recalcul en temps réel. |
| **Audit/transparence du modèle ML (MlInsights)** | Donner de la visibilité aux décideurs sur la performance et l'importance des variables du modèle d'inaccessibilité | `MlInsights.jsx` ; `main.py` endpoints `GET /api/ml/metrics`, `GET /api/ml/features-importance` ; `inacc_model_metrics.json`, `features_importance.json` | React, recharts, FastAPI | Affiche des chiffres de performance (74,7 % d'exactitude, 84,3 % d'AUC) et un graphique des variables qui pèsent le plus dans la décision du modèle (fréquence des inondations en tête), pour que le décideur comprenne ce qui motive les prédictions. Accessible uniquement au rôle "planificateur". |
| **Avis citoyens / cellule d'écoute** | Permettre à tout citoyen de déposer un avis de satisfaction sur les transports, sans authentification | `AvisCitoyenPage.jsx`, `WelcomePage.jsx` ; `main.py` endpoints `POST /api/feedback`, `GET /api/feedback/stats` ; `feedback_citoyens.json` | React, FastAPI, Pydantic | Un formulaire public (note, mode utilisé, problème rencontré, commentaire) écrit dans un fichier JSON, sans base de données. C'est le seul flux observé qui va d'une page publique vers une page décideur (`SatisfactionPage.jsx`) en passant par le backend. |
| **Indicateurs de satisfaction usagers** | Afficher les indicateurs de satisfaction par mode de transport, issus de l'enquête EMD, croisés avec les avis citoyens en direct | `SatisfactionPage.jsx` ; `main.py` endpoints `GET /api/satisfaction`, `GET /api/feedback/stats` ; `satisfaction.json` | React, recharts (RadarChart), FastAPI | Présente des scores de satisfaction par critère (prix, sécurité, attente...) et par mode de transport, et y ajoute en direct les avis collectés via la cellule d'écoute. Les recommandations affichées sont réordonnées selon le rôle du décideur connecté. |
| **Évolution temporelle 2010-2023** | Visualiser une tendance comparative de plusieurs indicateurs sur 4 années | `EvolutionTemporelle.jsx`, `data/evolutionData.js` | React, recharts | Données **statiques** (pas d'appel API) ; seules les années 2015 (EMD) et 2019 (trafic) sont réelles, les années 2010 et 2023 sont explicitement présentées comme reconstituées/projetées à but pédagogique. |
| **Authentification et RBAC décideurs** | Restreindre l'accès à l'espace décideurs et différencier les droits selon le rôle (planificateur/exploitation) | `auth.js`, `ProtectedRoute.jsx`, `LoginDecideurs.jsx`, `DecideursLayout.jsx`, `main.py` (`POST /auth/login`, `get_current_decideur`) | React, localStorage, FastAPI, JWT (PyJWT, HS256) | Connexion via `POST /auth/login` contre 2 comptes définis côté serveur (`DECIDEURS_DB`) ; le token est désormais un JWT signé, vérifié côté serveur sur 13 endpoints décideurs — limite résiduelle : mots de passe stockés en clair côté serveur, sans hashing, pas de refresh token. |
| **Export PDF de rapports** | Générer un rapport PDF (zones à risque ou anomalies) téléchargeable, sans serveur dédié | `ExportPDF.jsx` | React, jsPDF (import dynamique côté client) | Construit entièrement dans le navigateur à partir des données déjà affichées à l'écran ; les chiffres sont réels, mais le texte des recommandations est un modèle de phrase pré-écrit, paramétré par quelques vraies valeurs. |
| **Cockpit Knowage (reporting décisionnel)** | Donner aux décideurs une vue BI synthétique de la mobilité urbaine (trafic, déplacements, démographie, accessibilité) | `CockpitDakar.jsx` (intégration), 6 sheets Knowage (Acceuil, Trafic, Déplacements, Démographie, Accessibilité, IA & Prévisions) | Knowage, iframe, proxy `setupProxy.js`, HTML/CSS pur (sanitizer serveur interdisant JavaScript) | Le cockpit est affiché dans l'espace décideurs via une iframe en same-origin. Les widgets sont construits en HTML/CSS sans JavaScript (contrainte du filtre de sécurité Knowage), avec un mode sombre géré uniquement en CSS via le sélecteur `:has()`. |
| **Pipeline ETL Talend** | Extraire, transformer et charger les données brutes CETUD vers le Data Warehouse | Jobs Talend (`SA_individu`, `Dim_geographie`, `fait_accessibilite`, etc.) | Talend Open Studio, PostgreSQL | Chaque job lit une source, applique des transformations visuelles (filtrage, jointures, dédoublonnage), puis écrit dans la base. C'est la "tuyauterie" qui alimente le Data Warehouse, indépendante du pipeline ML. |
| **Data Warehouse en constellation** | Stocker les données décisionnelles de façon structurée pour l'analyse multi-thématique | Schéma `DW` (4 faits, 10 dimensions) | PostgreSQL | Plusieurs sujets d'analyse (mobilité, accessibilité, trafic, démographie) partagent certaines dimensions communes (notamment la géographie), permettant des analyses croisées sans tout fusionner dans une seule grande table. |

---

## 8. Schéma de synthèse global

```
                              ┌───────────────────────────────┐
                              │   DONNÉES SOURCES CETUD        │
                              │  (Excel/CSV : EMD ménages,     │
                              │   individus, déplacements,     │
                              │   comptages trafic)            │
                              └───────────┬─────────┬───────────┘
                                          │         │
                    ┌─────────────────────┘         └─────────────────────┐
                    ▼                                                     ▼
   ╔══════════════════════════════════╗                  ╔══════════════════════════════════╗
   ║   CHAÎNE ML / APPLICATION         ║                  ║   CHAÎNE BI / DÉCISIONNELLE        ║
   ║   (pas de base relationnelle)     ║                  ║   (PostgreSQL : schémas SA + DW)   ║
   ║                                    ║                  ║                                     ║
   ║  pandas (lecture directe)         ║                  ║  Talend (ETL) : extraction,        ║
   ║  → prétraitement                  ║                  ║  filtrage, transformation,         ║
   ║  → scikit-learn (KMeans, RF,      ║                  ║  dédoublonnage                     ║
   ║    Gradient Boosting, IF/LOF)     ║                  ║  → Staging (SA.menage, etc.)       ║
   ║  → .pkl (joblib) + .json          ║                  ║  → Data Warehouse (DW, 4 faits,    ║
   ║  → FastAPI (main.py, :8000)       ║                  ║    10 dimensions, constellation)   ║
   ║    18 endpoints REST, CORS        ║                  ║  → Knowage (cockpit               ║
   ║    limité à localhost:3000        ║                  ║    "TransportDakar", 6 sheets,     ║
   ║  → React (:3000) — fetch JSON     ║                  ║    widgets HTML/CSS sans JS)       ║
   ╚═════════════╦══════════════════════╝                  ╚════════════════╦════════════════════╝
                 │                                                          │
                 ▼                                                          ▼
        Pages usager : FormPage,                              CockpitDakar.jsx
        AvisCitoyenPage                                        (iframe, proxy same-origin
        Pages décideurs (RBAC) :                               setupProxy.js → :18080)
        ZonesRisquePage, AnomalyDashboard,                            │
        SimulateurRisque, MlInsights,                                 │
        SegmentationPage, SatisfactionPage  ◄──────────── seul point de jonction visuelle
                 │                                          (PAS d'échange de données JSON)
                 ▼
          Citoyen / Décideur (interface React unique,
          mais données issues de deux systèmes distincts)
```

---

## 10. Résumé final

TransportDakar repose sur **deux chaînes de données indépendantes**, confirmées explicitement par `07_MachineLearning.md` : une chaîne applicative (React → FastAPI → modèles `.pkl`/fichiers `.json`, sans base relationnelle, confirmé par `03_Backend_FastAPI.md`) et une chaîne décisionnelle (Sources CETUD → ETL Talend → Data Warehouse PostgreSQL en constellation → Knowage). Elles partent des mêmes fichiers Excel/CSV bruts mais ne se recroisent jamais après lecture, sauf à l'affichage : la page React `CockpitDakar.jsx` intègre le cockpit Knowage via iframe, sans échange de données JSON. Le tableau comparatif détaille les étapes, outils et granularités propres à chaque pipeline ; le tableau des fonctionnalités couvre recommandation de transport, segmentation, simulateur de risque, détection d'anomalies, avis citoyens, cockpit Knowage, et plus. L'analyse transversale consolide des limites déjà documentées : authentification JWT limitée à l'espace décideurs (mots de passe en clair côté serveur, pas de refresh token), incohérences de seuils/libellés entre scripts de recherche et production, fichiers `.bak`/`.pkl` orphelins, configuration dupliquée, et documentation BI incomplète sur le lien technique Knowage-Data Warehouse. Aucune information non confirmée par les 8 documents sources n'a été ajoutée.
