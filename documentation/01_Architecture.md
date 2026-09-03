# 01 — Présentation générale et architecture du projet TransportDakar

## 1. Contexte métier

La ville de Dakar connaît une croissance urbaine rapide, accompagnée d'une demande de mobilité de plus en plus forte. Le réseau de transport urbain (bus, cars rapides, Ndiaga Ndiaye, TATA, taxis, transport informel) génère un volume important de données issues notamment de l'**Enquête Ménages-Déplacements (EMD)** et de dispositifs de **comptage de trafic**. Ces données, riches mais dispersées, restaient jusqu'ici largement sous-exploitées par manque d'outils permettant de les centraliser, de les croiser et de les restituer sous une forme directement utilisable par les décideurs.

C'est dans ce contexte que le **CETUD** (Conseil Exécutif des Transports Urbains de Dakar), autorité organisatrice des transports urbains de la région de Dakar, a souhaité disposer d'une solution permettant de transformer ces données brutes en informations stratégiques.

### 1.1 Problématique

Comment centraliser, fiabiliser et restituer les données de mobilité urbaine de Dakar (enquêtes ménages, comptages de trafic) afin de fournir aux décideurs du CETUD une vision claire de la demande de transport, tout en offrant aux citoyens un point d'accès simple à l'information et un canal de retour d'expérience ?

### 1.2 Objectifs du projet

- Construire une chaîne décisionnelle complète : collecte → nettoyage/transformation (ETL) → modélisation multidimensionnelle (Data Warehouse) → restitution (cockpit BI).
- Enrichir l'analyse par des modèles de **Machine Learning** (segmentation des ménages, prédiction des zones à risque, détection d'anomalies).
- Développer une **application web** offrant deux espaces distincts : un espace public pour les usagers/citoyens du réseau de transport, et un espace sécurisé pour les décideurs du CETUD.

### 1.3 Utilisateurs cibles

D'après l'analyse métier et ce qui est observable dans le frontend (séparation claire des routes publiques et des routes décideurs protégées par `ProtectedRoute`), deux grandes catégories d'utilisateurs sont visées :

| Catégorie | Profil | Besoins |
|---|---|---|
| **Citoyens / usagers du réseau** | Grand public, utilisateurs du transport urbain à Dakar | Consulter des informations générales, remplir un formulaire/avis citoyen, visualiser une carte (`MapView`) |
| **Décideurs CETUD** | Directeur de planification, responsable d'exploitation, chargé de modélisation / data analyst (rôles identifiés dans l'analyse métier) | Accéder à un espace protégé par authentification (`LoginDecideurs`), consulter des tableaux de bord (vue générale, zones à risque, anomalies, simulateur de risque, segmentation, évolution temporelle, satisfaction, cockpit Knowage intégré) |

Cette distinction se retrouve directement dans la structure du frontend : des pages publiques (`WelcomePage`, `FormPage`, `AvisCitoyenPage`) et un sous-ensemble de pages dédiées aux décideurs, regroupées sous un layout commun (`DecideursLayout`) et protégées par `ProtectedRoute`.

### 1.4 Valeur ajoutée

- Passage de fichiers sources hétérogènes (Excel/CSV bruts du CETUD) à un entrepôt de données structuré en **schéma en constellation**, exploitable de façon fiable et répétable.
- Restitution visuelle via un cockpit BI **Knowage** dédié aux décideurs.
- Apport d'une couche **prédictive/analytique** (Machine Learning) totalement découplée de la chaîne décisionnelle classique, permettant des cas d'usage complémentaires (prédiction d'inaccessibilité, détection d'anomalies, segmentation).
- Une application web unique qui réunit volet citoyen et volet décideur.

### 1.5 Technologies utilisées

D'après les fichiers déjà rédigés (02 à 08) et l'arborescence réelle du code :

| Domaine | Technologies |
|---|---|
| Frontend | React 18.3.1 (Create React App / react-scripts 5.0.1), react-router-dom 7.14.1, framer-motion, lucide-react, recharts, Leaflet (vanilla, sans react-leaflet), jsPDF (import dynamique), fetch API |
| Backend | FastAPI 0.111.0 (fichier unique `main.py`), Pydantic 2.7.1, joblib |
| Base de données | PostgreSQL (schémas `SA` et `DW`) |
| ETL | Talend Open Studio (tDBInput, tMap, tSortRow, tUniqRow, tDBOutput, etc.) |
| Machine Learning | scikit-learn (K-Means, Random Forest, Gradient Boosting, Isolation Forest, LOF, DBSCAN, Z-Score), joblib pour la sérialisation des modèles |
| BI / restitution décisionnelle | Knowage (cockpit "TransportDakar", 6 feuilles) |

### 1.6 Contraintes et limites globales

- Authentification JWT côté backend FastAPI (vérification de token sur 13 des 18 endpoints, ceux de l'espace décideurs) ; les 5 endpoints citoyens restent publics par design. Limite résiduelle : les mots de passe sont stockés en clair côté serveur (`DECIDEURS_DB`), sans hashing, et il n'existe pas de refresh token.
- CORS restreint à `localhost:3000`, ce qui limite le déploiement en l'état à un environnement de développement local.
- Code backend entièrement synchrone (pas de `async def`), ce qui peut limiter la scalabilité.
- Les pipelines ML et la chaîne BI/ETL/DW sont **totalement découplés** : ils repartent tous deux des mêmes fichiers sources bruts du CETUD, mais ne communiquent pas entre eux. Le Data Warehouse n'alimente pas les modèles ML, et les résultats ML ne sont pas réinjectés dans le DW.
- Cockpit Knowage limité aux widgets HTML/CSS (le sanitizer interne empêche l'exécution de JavaScript), ce qui contraint les possibilités d'interactivité avancée.
- Information non disponible dans les sources fournies : mécanisme exact de connexion entre Knowage et le Data Warehouse PostgreSQL (non documenté dans les fichiers 06/08).

### 1.7 Pistes d'amélioration futures

- Hasher les mots de passe (`DECIDEURS_DB`) et ajouter un refresh token côté FastAPI, l'authentification JWT de base étant déjà en place.
- Industrialiser le déploiement (CORS multi-origine, conteneurisation, environnement de production).
- Passer le backend en asynchrone (`async def`, driver PostgreSQL asynchrone) pour améliorer la scalabilité.
- Rapprocher à terme les deux chaînes (ML et BI/DW), par exemple en stockant les sorties des modèles ML dans le Data Warehouse pour les rendre consultables depuis Knowage.
- Réconcilier les incohérences relevées entre scripts de recherche et scripts de production des modèles ML (cf. 07_MachineLearning.md).

---

## 2. Architecture globale du système

Le système TransportDakar repose sur **deux chaînes distinctes**, partant toutes deux des mêmes données sources brutes du CETUD, mais ne se croisant jamais :

1. **Chaîne applicative / temps réel** : React (frontend) ↔ FastAPI (backend) ↔ Machine Learning.
2. **Chaîne décisionnelle / BI** : Sources CETUD → Talend (ETL) → Data Warehouse (PostgreSQL, schéma DW) → Knowage (cockpit BI).

### 2.1 Chaîne applicative (React ↔ FastAPI ↔ Machine Learning)

```
┌──────────────────────────────────────────────────────────────────────┐
│                          NAVIGATEUR (utilisateur)                    │
│                                                                      │
│   Espace public               Espace décideurs (protégé)            │
│   ┌────────────┐              ┌──────────────────────────────┐      │
│   │ WelcomePage│              │ LoginDecideurs                │      │
│   │ FormPage   │              │ DecideursLayout               │      │
│   │ AvisCitoyen│              │  ├─ VueGenerale                │      │
│   │ Page       │              │  ├─ ZonesRisquePage            │      │
│   └────────────┘              │  ├─ AnomalyDashboard           │      │
│                                │  ├─ SimulateurRisque           │      │
│                                │  ├─ MlInsights                 │      │
│                                │  ├─ SegmentationPage           │      │
│                                │  ├─ EvolutionTemporelle        │      │
│                                │  ├─ SatisfactionPage           │      │
│                                │  └─ CockpitDakar (iframe Knowage)│     │
│                                └──────────────────────────────┘      │
└───────────────────────────────────┬──────────────────────────────────┘
                                     │  fetch() — appels HTTP JSON
                                     │  (CORS restreint à localhost:3000)
                                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND FastAPI (main.py — 823 lignes)           │
│                                                                      │
│   18 endpoints REST (synchrones, validation Pydantic 2.7.1)         │
│   JWT (13 endpoints décideurs protégés / 5 publics)                 │
│                                                                      │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │  Au démarrage : chargement des modèles via joblib          │    │
│   │  (ml_models/*.pkl, *.json)                                  │    │
│   └────────────────────────────────────────────────────────────┘    │
│                                  │                                   │
│                                  ▼                                   │
│   ┌────────────────────────────────────────────────────────────┐    │
│   │            MODULE MACHINE LEARNING (4 familles)              │    │
│   │  • K-Means          → segmentation des ménages               │    │
│   │  • Random Forest    → classification                        │    │
│   │  • Gradient Boosting→ score d'inaccessibilité                │    │
│   │  • Isolation Forest / LOF / Z-Score (consensus) + DBSCAN     │    │
│   │                        → détection d'anomalies                │    │
│   └────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────┘
```

**Rôle de chaque composant :**
- **React (frontend)** : interface utilisateur, deux espaces (public / décideurs), appels `fetch` vers l'API, affichage de cartes (Leaflet), graphiques (recharts), export PDF (jsPDF), intégration du cockpit Knowage via iframe et proxy de développement (`setupProxy.js`).
- **FastAPI (backend)** : expose les 18 endpoints REST, valide les requêtes/réponses avec des modèles Pydantic, charge les modèles ML préentraînés (fichiers `.pkl` sérialisés avec joblib) au démarrage de l'application, et orchestre les appels vers ces modèles pour produire des prédictions ou statistiques.
- **Machine Learning** : quatre familles de modèles indépendants, entraînés à partir des données brutes du CETUD (mêmes sources que la chaîne BI mais traitement totalement séparé), utilisés pour enrichir les réponses de l'API (zones à risque, anomalies, segmentation, simulation).

### 2.2 Chaîne décisionnelle (Sources CETUD → Talend → Data Warehouse → Knowage)

```
┌──────────────────────────────────────────────────────────────────────┐
│                     SOURCES BRUTES CETUD                             │
│   Enquête Ménages-Déplacements (EMD) — fichiers Excel/CSV             │
│   Comptages de trafic — fichiers Excel/CSV                            │
└───────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    TALEND OPEN STUDIO (jobs ETL)                     │
│   tDBInput → tMap → tSortRow / tUniqRow → tDBOutput                   │
│   • Jobs de staging (chargement brut vers schéma SA)                  │
│   • Jobs de chargement des dimensions et des faits (flux Main/Lookup) │
└───────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│              POSTGRESQL — SCHÉMA SA (staging)                        │
│   Tables intermédiaires, nettoyage, normalisation des accents,        │
│   dédoublonnage (tUniqRow), valeurs par défaut (COALESCE)             │
└───────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│         POSTGRESQL — SCHÉMA DW (Data Warehouse, schéma en             │
│                         constellation)                                │
│                                                                      │
│   10 dimensions (dont Dim_Geographie, dimension transversale          │
│   partagée entre plusieurs faits)                                     │
│   4 faits                                                            │
└───────────────────────────────┬────────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    KNOWAGE (cockpit "TransportDakar")                │
│   6 feuilles (dont Accueil, Accessibilité, etc.)                      │
│   Widgets HTML/CSS uniquement (contrainte du sanitizer interne)       │
└──────────────────────────────────────────────────────────────────────┘
```

**Rôle de chaque composant :**
- **Sources CETUD** : fichiers bruts (EMD, comptages de trafic) constituant la matière première, partagée avec la chaîne ML mais traitée séparément.
- **Talend** : outil d'ETL qui extrait les données sources, les transforme (jointures, tri, dédoublonnage, normalisation) et les charge dans PostgreSQL, d'abord dans le schéma de staging (SA), puis dans les dimensions et faits du schéma DW.
- **Data Warehouse (schéma DW)** : modélisé en **schéma en constellation** (4 faits, 10 dimensions), il centralise les données nettoyées et structurées pour l'analyse multidimensionnelle.
- **Knowage** : outil de Business Intelligence qui se connecte au Data Warehouse pour produire le cockpit décisionnel "TransportDakar", restitué aux décideurs sous forme de tableaux de bord.

> Information non disponible dans les sources fournies : le mécanisme technique exact de connexion entre Knowage et le schéma DW (data source, driver JDBC, etc.) n'est pas détaillé dans 06_DataWarehouse.md ni 08_Knowage.md.

### 2.3 Pourquoi deux chaînes séparées ?

D'après 07_MachineLearning.md, il s'agit d'un choix architectural assumé : les pipelines ML et la chaîne BI/ETL/DW lisent les **mêmes fichiers sources bruts du CETUD**, mais ne se croisent jamais. Le Data Warehouse n'est pas la source des modèles ML (qui travaillent directement sur des extraits/fichiers du CETUD), et le DW n'intègre pas les sorties des modèles ML. Cette séparation permet un développement indépendant des deux chaînes, au prix d'une duplication partielle du traitement des données sources et d'une absence de mise en cohérence centralisée.

---

## 3. Structure du projet (arborescence réelle)

L'arborescence ci-dessous reflète les dossiers et fichiers réels observés dans `PFE (partie usager)/frontend/` et `PFE (partie usager)/backend/`.

```
PFE (partie usager)/
│
├── frontend/                          # Application React (CRA)
│   ├── public/                        # Fichiers statiques (favicon, manifest, médias)
│   ├── build/                         # Build de production généré
│   └── src/
│       ├── App.js                     # Définition des routes (react-router-dom)
│       ├── App.css
│       ├── index.js                   # Point d'entrée React
│       ├── index.css
│       ├── auth.js                    # Authentification via JWT (login serveur, token signé)
│       ├── theme.js                   # Gestion du thème clair/sombre
│       ├── setupProxy.js              # Proxy dev (intégration iframe Knowage)
│       ├── assets/
│       │   └── logo-transportdakar.png
│       ├── data/
│       │   └── evolutionData.js       # Données pour la page Évolution temporelle
│       ├── components/
│       │   ├── ProtectedRoute.jsx     # Garde de route pour l'espace décideurs
│       │   ├── ThemeToggle.jsx        # Bouton thème clair/sombre
│       │   ├── LogoTransportDakar.jsx
│       │   ├── LoadingScreen.jsx / .css
│       │   ├── MapView.jsx            # Carte Leaflet (vanilla)
│       │   └── ExportPDF.jsx          # Export PDF (jsPDF, import dynamique)
│       └── pages/
│           ├── WelcomePage.jsx        # Page publique d'accueil
│           ├── FormPage.jsx           # Formulaire public
│           ├── AvisCitoyenPage.jsx    # Avis citoyen (public)
│           ├── LoginDecideurs.jsx     # Connexion décideurs
│           ├── DecideursLayout.jsx    # Layout commun espace décideurs
│           ├── VueGenerale.jsx
│           ├── ZonesRisquePage.jsx
│           ├── AnomalyDashboard.jsx
│           ├── SimulateurRisque.jsx
│           ├── MlInsights.jsx
│           ├── SegmentationPage.jsx
│           ├── EvolutionTemporelle.jsx
│           ├── SatisfactionPage.jsx
│           └── CockpitDakar.jsx       # Intégration iframe du cockpit Knowage
│
└── backend/                           # API FastAPI (Python)
    ├── main.py                        # Point d'entrée unique — 18 endpoints REST
    ├── requirements.txt                # Dépendances Python
    ├── README.md
    ├── train_inaccessibility_model.py # Script d'entraînement du modèle d'inaccessibilité
    ├── sauvegarder_inacc_model.py      # Script de sérialisation du modèle
    ├── data/
    │   └── feedback_citoyens.json      # Stockage des avis citoyens
    └── ml_models/                      # Modèles ML préentraînés et artefacts
        ├── kmeans_model.pkl / kmeans_scaler.pkl / kmeans_pca.pkl / kmeans_imputer.pkl
        ├── rf_model.pkl / rf_label_encoder.pkl / rf_imputer.pkl
        ├── inacc_model.pkl / inaccessibilite_model.pkl / inacc_imputer.pkl
        │   / inacc_label_encoders.pkl / inacc_encoders_mappings.json
        │   / inacc_features_defaults.json / inacc_model_metrics.json
        ├── anomalies_results.csv
        ├── features_importance.json
        ├── metadata.json
        ├── satisfaction.json
        ├── stats_par_mode.json
        └── zones_risque.json
```

### Tableau récapitulatif des dossiers/fichiers principaux

| Élément | Rôle |
|---|---|
| `frontend/src/App.js` | Déclare l'ensemble des routes (publiques et décideurs) |
| `frontend/src/auth.js` | Authentification via JWT obtenu auprès du backend (`POST /auth/login`), `authFetch` pour les appels protégés |
| `frontend/src/theme.js` | Bascule thème clair/sombre via variables CSS |
| `frontend/src/components/ProtectedRoute.jsx` | Protège les routes de l'espace décideurs (RBAC via `allowedRoutes`) |
| `frontend/src/components/MapView.jsx` | Carte interactive (Leaflet vanilla) |
| `frontend/src/components/ExportPDF.jsx` | Génère des exports PDF (jsPDF) |
| `frontend/src/pages/*` | Pages publiques (Welcome, Form, AvisCitoyen) et pages décideurs (tableaux de bord) |
| `frontend/src/data/evolutionData.js` | Jeu de données pour la page d'évolution temporelle |
| `backend/main.py` | Application FastAPI complète : endpoints, modèles Pydantic, chargement ML |
| `backend/ml_models/` | Modèles ML sérialisés (joblib) et fichiers de métadonnées/résultats |
| `backend/train_inaccessibility_model.py` | Entraînement du modèle de score d'inaccessibilité |
| `backend/data/feedback_citoyens.json` | Stockage des avis/retours citoyens collectés via le formulaire public |

> Remarque : plusieurs fichiers `.bak` (sauvegardes, ex. `WelcomePage.jsx.bak`) sont présents dans `frontend/src/pages/` et `components/` ; ils n'ont pas été inclus dans le tableau ci-dessus car ils ne font pas partie du code applicatif actif.

---

## 📌 À retenir

- TransportDakar répond à un besoin réel du CETUD : transformer des données de mobilité urbaine brutes (EMD, comptages de trafic) en informations exploitables pour la décision et accessibles au citoyen.
- Le projet s'organise en **deux chaînes totalement indépendantes** partant des mêmes sources : une chaîne **décisionnelle/BI** (Talend → Data Warehouse PostgreSQL → Knowage) et une chaîne **applicative/temps réel** (React → FastAPI → Machine Learning).
- Le frontend distingue clairement un **espace public** (citoyens) et un **espace décideurs** protégé par un JWT obtenu auprès du backend.
- Le backend FastAPI est un service synchrone, avec une authentification JWT sur les endpoints décideurs (mots de passe encore en clair côté serveur), qui charge des modèles ML préentraînés au démarrage.
- Le Data Warehouse est modélisé en **schéma en constellation** (4 faits, 10 dimensions), avec `Dim_Geographie` comme dimension transversale partagée.
- Les pipelines ML et la chaîne BI/DW ne communiquent jamais entre eux : c'est un choix architectural assumé, pas un oubli.

---

