# TECHNICAL DEFENSE GUIDE — Transport Dakar PFE
### Système d'aide à la décision pour l'optimisation du transport urbain de Dakar
**Auteure :** Ibtihel Abdellaoui | **Institution :** ESPRIT / CETUD | **Année :** 2025

---

> **Mode d'emploi :** Ce guide se lit du général au particulier. Commencez par la section 17 (Résumé Express) la veille, puis utilisez les autres sections pour approfondir chaque point lors de questions du jury.

---

## TABLE DES MATIÈRES

1. [Vue globale du projet](#1-vue-globale-du-projet)
2. [Architecture générale](#2-architecture-générale)
3. [Analyse des dossiers](#3-analyse-des-dossiers)
4. [Analyse détaillée du code](#4-analyse-détaillée-du-code)
5. [Inventaire des fonctions](#5-inventaire-complet-des-fonctions)
6. [Analyse React](#6-analyse-react)
7. [Analyse Backend FastAPI](#7-analyse-backend-fastapi)
8. [Analyse Base de Données](#8-analyse-base-de-données)
9. [Analyse ETL](#9-analyse-etl--pipeline-de-données)
10. [Analyse Machine Learning](#10-analyse-machine-learning)
11. [Analyse Power BI / Dashboards](#11-analyse-dashboards--visualisation)
12. [Flux complet des données](#12-flux-complet-des-données)
13. [Questions de soutenance](#13-questions-de-soutenance-50)
14. [Points forts du projet](#14-points-forts-du-projet)
15. [Limites du projet](#15-limites-et-points-critiques)
16. [Roadmap future](#16-roadmap-future)
17. [Résumé Express](#17-résumé-express--fiche-de-révision)

---

## 1. VUE GLOBALE DU PROJET

### 1.1 Pitch 2 minutes (à mémoriser pour la soutenance)

> "Le réseau de transport urbain de Dakar souffre de trois problèmes majeurs : des zones géographiques entièrement inaccessibles aux transports en commun, des anomalies de trafic non détectées sur les axes principaux, et l'absence d'outil pour guider les citoyens dans le choix de leur mode de déplacement.
>
> Notre projet répond à ces trois problèmes en construisant une plateforme complète d'aide à la décision alimentée par le Machine Learning, basée sur les données réelles de l'Enquête Ménage Déplacement CETUD 2019 portant sur 37 248 individus, 4 521 ménages et 775 480 observations de trafic.
>
> La plateforme propose deux espaces : un espace citoyen permettant d'obtenir une recommandation personnalisée de mode de transport, et un espace décideurs réservé aux gestionnaires du CETUD pour analyser les zones à risque, détecter les anomalies, simuler des scénarios et suivre l'évolution du réseau dans le temps."

### 1.2 Objectif métier

| Dimension | Détail |
|-----------|--------|
| **Problématique** | Inaccessibilité aux TC, anomalies trafic non détectées, pas de recommandation personnalisée |
| **Solution** | Plateforme décisionnelle ML + Web pour analyser, prédire et recommander |
| **Données source** | EMD CETUD 2019 — Ménages, Individus, Déplacements, Trafic |
| **Utilisateurs** | Citoyens de Dakar + Gestionnaires CETUD (2 rôles distincts) |
| **Valeur ajoutée** | Réduction du temps de diagnostic, automatisation des alertes, recommandation en temps réel |

### 1.3 Résultats attendus

- **Citoyen** : reçoit en < 2 secondes une recommandation de mode de transport adaptée à son profil (âge, revenu, localisation, fréquence TC)
- **Directeur Planification** : visualise les 41 zones de Dakar classées par niveau de risque d'inaccessibilité, les 316 anomalies détectées sur 49 sites, et l'évolution 2010–2023
- **Chef d'Exploitation** : accède au simulateur de risque et aux profils des 5 segments d'usagers pour piloter les interventions

---

## 2. ARCHITECTURE GÉNÉRALE

### 2.1 Schéma en couches

```
┌─────────────────────────────────────────────────────────────┐
│                    SOURCES DE DONNÉES                        │
│  CETUD_BD_EMD_MENAGE.xls   CETUD_BD_EMD_INDIVIDU.xls        │
│  CETUD_BD_TRAFIC_SECTION.xls   CSV exports                   │
└──────────────────────┬──────────────────────────────────────┘
                       │ Extraction manuelle / scripts Python
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                  PIPELINE ETL / PRÉPARATION                  │
│  Python (Pandas) → Nettoyage → Feature Engineering          │
│  Imputation → Encodage → Normalisation → Export CSV/PKL      │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               MODÈLES MACHINE LEARNING                       │
│                                                             │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │  K-Means    │  │Isolation     │  │Gradient Boosting │   │
│  │ (5 clusters)│  │Forest + LOF  │  │+ Random Forest   │   │
│  │ Segmentation│  │+ Z-Score     │  │Inaccessibilité   │   │
│  └─────────────┘  │(Anomalies)   │  └──────────────────┘   │
│                   └──────────────┘                          │
│  ┌──────────────────────────────────────────────────────┐   │
│  │     Random Forest Classifier (Mode de transport)     │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ joblib.dump → .pkl files
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               API BACKEND — FastAPI (Python)                 │
│  main.py — uvicorn :8000 — 9 endpoints REST                 │
│  CORS → localhost:3000                                       │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/JSON
                       ▼
┌─────────────────────────────────────────────────────────────┐
│               FRONTEND — React.js (SPA)                      │
│  7 pages Décideurs + 2 pages Citoyens + Auth RBAC           │
│  Recharts + Leaflet + Framer Motion + ThemeProvider         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│           DASHBOARDS BI / VISUALISATIONS STATIQUES           │
│  Matplotlib/Seaborn (Python) + Folium (Carte interactive)   │
│  Évolution temporelle simulée (evolutionData.js)             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Justification des choix technologiques

| Technologie | Pourquoi ce choix | Alternative écartée |
|-------------|-------------------|---------------------|
| **FastAPI** | Performant, async natif, documentation Swagger auto, validation Pydantic | Flask (moins performant, pas de validation native) |
| **React.js** | SPA fluide, écosystème riche, composants réutilisables, Context API pour le thème | Vue.js (moins de ressources), Angular (trop lourd pour un PFE) |
| **scikit-learn** | Standard industrie, API uniforme, pipeline complet, documentation excellente | TensorFlow (overkill pour données tabulaires) |
| **K-Means** | Segmentation non supervisée, interprétable, silhouette coefficient pour valider k | DBSCAN (sensible aux paramètres), GMM (complexe) |
| **Isolation Forest** | Efficace sur données multidimensionnelles, pas d'hypothèse de distribution | SVM One-Class (plus lent sur grands datasets) |
| **Gradient Boosting** | Meilleure performance sur données tabulaires déséquilibrées, SHAP compatible | XGBoost (similaire, moins intégré à sklearn) |
| **SMOTE** | Rééchantillonnage synthétique pour classes minoritaires (zones à risque rare) | Under-sampling (perte d'information) |
| **Pandas** | Manipulation DataFrames, lecture XLS/CSV native, .describe() pour statistiques | SQL pur (moins flexible pour feature engineering) |
| **Leaflet + Folium** | Cartes interactives, léger, OpenStreetMap gratuit | Google Maps (payant), Mapbox (clé API nécessaire) |

---

## 3. ANALYSE DES DOSSIERS

### 3.1 Structure complète annotée

```
PFE dev/
│
├── ml_inaccessibilite_v2.py         ← Entraînement modèle inaccessibilité
├── Anomalies_v2.py                  ← Détection anomalies trafic (ensemble)
├── Segmentation_Recommandation_v2.py ← K-Means + Random Forest transport
├── zones_risque_inaccessibilite_v2.csv ← Export résultats zones
├── anomalies_results_v2.csv          ← Export résultats anomalies
├── carte_anomalies_dakar_v2.html     ← Carte Folium interactive
│
└── PFE (partie usager)/
    │
    ├── Menage.csv                    ← Données ménages nettoyées
    ├── Deplacement.csv               ← Données déplacements
    ├── Trafic.csv                    ← Données trafic nettoyées
    ├── CETUD_BD_EMD_MENAGE_COMPILE.xls    ← Source brute ménages
    ├── CETUD_BD_EMD_INDIVIDU_COMPILE.xls  ← Source brute individus
    ├── CETUD_BD_TRAFIC_SECTION_COMPILE.xls ← Source brute trafic
    ├── CETUD_BD_EMD_INDIVIDU_LIBELLE.xlsx  ← Dictionnaire de données
    │
    ├── backend/
    │   ├── main.py                   ← API FastAPI — point d'entrée
    │   ├── requirements.txt          ← Dépendances Python
    │   ├── train_inaccessibility_model.py ← Script d'entraînement
    │   ├── sauvegarder_inacc_model.py     ← Sauvegarde modèle inacc.
    │   └── ml_models/
    │       ├── kmeans_model.pkl       ← Modèle K-Means sérialisé
    │       ├── kmeans_scaler.pkl      ← StandardScaler K-Means
    │       ├── kmeans_imputer.pkl     ← Imputer K-Means
    │       ├── kmeans_pca.pkl         ← PCA pour visualisation
    │       ├── rf_model.pkl           ← Random Forest mode transport
    │       ├── rf_imputer.pkl         ← Imputer Random Forest
    │       ├── rf_label_encoder.pkl   ← Encodeur labels modes
    │       ├── inacc_model.pkl        ← Gradient Boosting inaccessibilité
    │       ├── inacc_imputer.pkl      ← Imputer inaccessibilité
    │       ├── inacc_label_encoders.pkl ← Encodeurs catégoriels
    │       ├── anomalies_results.csv  ← Dataset anomalies (14 Mo, cache RAM)
    │       ├── metadata.json          ← Features + stats segmentation
    │       └── stats_par_mode.json    ← Stats Q1/médiane/Q3 par mode
    │
    └── frontend/
        ├── src/
        │   ├── App.js                ← Routeur principal + state global
        │   ├── App.css               ← Thème CSS global + overrides light
        │   ├── index.js              ← Point d'entrée React
        │   ├── index.css             ← Variables CSS globales
        │   ├── theme.js              ← Context Dark/Light + palettes
        │   ├── auth.js               ← Auth RBAC simulée + tokens Base64
        │   ├── data/
        │   │   └── evolutionData.js  ← Données temporelles simulées 2010-2023
        │   ├── components/
        │   │   ├── LoadingScreen.jsx ← Écran de chargement animé
        │   │   ├── ProtectedRoute.jsx ← HOC protection routes privées
        │   │   ├── ThemeToggle.jsx   ← Bouton bascule Dark/Light
        │   │   ├── MapView.jsx       ← Composant carte Leaflet
        │   │   └── ExportPDF.jsx     ← Export PDF via html2canvas + jsPDF
        │   └── pages/
        │       ├── WelcomePage.jsx   ← Accueil public
        │       ├── FormPage.jsx      ← Formulaire recommandation transport
        │       ├── LoginDecideurs.jsx ← Connexion espace décideurs
        │       ├── DecideursLayout.jsx ← Layout sidebar navigation
        │       ├── VueGenerale.jsx   ← Dashboard principal décideurs
        │       ├── ZonesRisquePage.jsx ← Analyse 41 zones inaccessibilité
        │       ├── AnomalyDashboard.jsx ← 316 anomalies 49 sites
        │       ├── SimulateurRisque.jsx ← Simulateur prédictif ML
        │       ├── MlInsights.jsx    ← Audit Gradient Boosting + SHAP
        │       ├── SegmentationPage.jsx ← K-Means 5 profils usagers
        │       └── EvolutionTemporelle.jsx ← Analyse 2010-2023
        └── public/
            ├── index.html            ← HTML shell SPA
            └── [assets: images, vidéos, favicon]
```

### 3.2 Rôle de chaque dossier

| Dossier | Rôle | Criticité |
|---------|------|-----------|
| `root/` Python scripts | Entraînement off-line des modèles ML | ⭐⭐⭐ |
| `backend/` | Serveur API exposant les prédictions aux clients | ⭐⭐⭐ |
| `backend/ml_models/` | Artefacts ML sérialisés (ne pas modifier manuellement) | ⭐⭐⭐ |
| `frontend/src/pages/` | Interface utilisateur — tout ce que voit l'utilisateur | ⭐⭐⭐ |
| `frontend/src/data/` | Données temporelles simulées pour analyse historique | ⭐⭐ |
| `frontend/src/components/` | Briques réutilisables partagées entre pages | ⭐⭐ |

---

## 4. ANALYSE DÉTAILLÉE DU CODE

### 4.1 `main.py` — API FastAPI

**Rôle :** Cerveau de l'application. Charge les modèles ML en mémoire au démarrage et expose 9 endpoints REST consommés par le frontend.

**Architecture interne :**

```
main.py (703 lignes)
├── Chargement modèles (lignes 37–93)     ← au démarrage, une seule fois
├── Dictionnaires métier (lignes 99–177)  ← zones GPS, quartiers, segments
├── Schémas Pydantic (lignes 182–220)     ← validation automatique des entrées
├── Fonctions helpers (lignes 225–290)    ← build_features_cluster/rf
└── Endpoints REST (lignes 295–703)       ← 9 routes
```

**Optimisation clé :** Le dataset anomalies (14 Mo) est chargé une seule fois en mémoire RAM au démarrage (`ANOMALIES_DF = pd.read_csv(...)`) plutôt qu'à chaque requête — réduction du temps de réponse de ~800ms à < 50ms.

**Flux d'un appel `/recommander` :**

```
POST /recommander
    │
    ├── Pydantic valide les 13 champs (âge 5-100, etc.)
    │
    ├── build_features_cluster() → vecteur 10 features
    │       │
    │       └── imputer.transform() → kmeans.predict() → cluster [0,1,2]
    │
    ├── build_features_rf() → vecteur 12 features
    │       │
    │       └── imputer.transform() → rf.predict_proba() → top3 modes
    │
    ├── Enrichissement via stats_par_mode.json
    │       (durée Q1/médiane/Q3, coût, budget mensuel)
    │
    └── Retourne JSON avec mode recommandé + top3 + conseil segment
```

### 4.2 `ml_inaccessibilite_v2.py` — Modèle d'inaccessibilité

**Rôle :** Construit la variable cible composite et entraîne 4 modèles de classification pour prédire le risque d'inaccessibilité d'une zone.

**Variable cible — construction :**

```python
score_composite = (
    score_tc_distance          # M66 > 10 min → 1
  + score_inond_bin            # M68 ≥ "Souvent" → 1
  + score_enclavement          # M87 = "Oui" → 1
  + score_routes_manquantes    # M72 = "Oui" → 1
  + score_tc_manque            # M55 = "Oui" → 1
  + score_tc_pluie             # M56 = "Oui" → 1
  + score_sante                # dur_sante > 30 min → 1
)

seuil = percentile_65(score_composite)
y = (score_composite >= seuil).astype(int)  # 1 = zone à risque
```

**Justification du seuil au 65e percentile :** maximise l'équilibre précision/rappel sur données déséquilibrées (peu de zones ÉLEVÉ) tout en restant interprétable métier.

**Pipeline d'entraînement :**

```
XLS source
    │
    ├── SimpleImputer (médiane numérique, mode catégoriel)
    ├── LabelEncoder (variables catégorielles)
    ├── StandardScaler (normalisation features numériques)
    ├── SMOTE (si imbalanced-learn installé) → équilibrage classes
    ├── StratifiedKFold(5) → validation croisée
    │
    └── Gradient Boosting  ← meilleur sur données tabulaires
        ├── ROC AUC ≈ 0.921 (2019)
        ├── F1-score ≈ 0.883
        └── Accuracy ≈ 90.6%
```

### 4.3 `Anomalies_v2.py` — Détection d'anomalies trafic

**Rôle :** Applique 3 algorithmes de détection d'anomalies en parallèle sur les données de trafic, puis combine leurs votes par consensus pondéré.

**Algorithmes et poids :**

```
Z-Score      (poids 0.25) ← univarié, rapide, interprétable
Isolation Forest (0.40)   ← multivarié, robuste, non-paramétrique
LOF          (poids 0.35) ← densité locale, détecte clusters inhabituels
                │
                └── Consensus : anomalie si score_pondéré ≥ 0.6
                    severity = W_Z * z_score_norm
                              + W_IF * (1 - if_score_norm)
                              + W_LOF * lof_score_norm
```

**Justification du consensus :** Aucun algorithme n'est optimal sur tous les types d'anomalies de trafic (bouchons soudains vs. comportements inhabituels persistants). Le consensus pondéré réduit les faux positifs de ~35% comparé à un seul modèle.

**DBSCAN pour clustering géographique :**
- `eps = 0.005 degrés` ≈ 500 mètres de rayon
- `min_samples = 3` → au moins 3 sites anomaux pour former un "hotspot"
- Résultat : identification des axes à congestion structurelle vs. incidents ponctuels

### 4.4 `Segmentation_Recommandation_v2.py` — K-Means + Random Forest

**Rôle :** Segmente les usagers en 5 profils comportementaux et entraîne un classifieur pour recommander le mode de transport optimal.

**Sélection de k pour K-Means :**

```python
# Méthode du coude (Elbow)
for k in range(2, 11):
    km = KMeans(n_clusters=k, random_state=42)
    inertias.append(km.inertia_)

# + Silhouette Coefficient
silhouette_avg = silhouette_score(X_scaled, labels)
# k=5 maximise le silhouette (≈ 0.31) avec coude visible
```

**5 segments identifiés :**

| Segment | Profil type | Mode dominant |
|---------|-------------|---------------|
| Actifs TC réguliers | 35 ans, actif, pas de permis, freq_tc=1 | Transport Commun |
| Actifs motorisés | 40 ans, actif, permis, revenu élevé | Voiture/Taxi |
| Étudiants mobilité douce | 20 ans, étudiant, budget faible | Marche/TC |
| Piétons de proximité | 45 ans, peu mobile, quartier dense | Marche |
| Travailleurs informels | 30 ans, actif informel, mobilité mixte | TC/Moto |

**Random Forest — hyperparamètres :**

```python
RandomForestClassifier(
    n_estimators=200,   # 200 arbres pour stabilité
    max_depth=10,       # limite l'overfitting
    class_weight='balanced',  # gère déséquilibre des modes
    random_state=42
)
# Validation : StratifiedKFold(5) → F1-macro ≈ 0.88
```

### 4.5 `theme.js` — Système de thème Dark/Light

**Rôle :** Fournit un Context React global qui injecte des variables CSS dynamiques et expose des palettes de couleurs typées pour chaque composant.

**Architecture :**

```javascript
DARK = { bg, panel, text, muted, ... }   // palette dark
LIGHT = { bg, panel, text, muted, ... }  // palette light

ThemeProvider
    └── useEffect → document.documentElement.setAttribute('data-theme', mode)
                 → inject <style id="dtk-theme-vars"> avec CSS custom props
                 → localStorage.setItem('dtk_theme', mode)

useTheme() → { theme, toggle, isDark }
```

**Pourquoi injecter dans le DOM ?** Les composants utilisant `style={}` inline (inline styles React) ne voient pas les variables CSS, donc on injecte simultanément via `theme.text` (inline) ET `var(--dtk-text)` (CSS classes).

### 4.6 `auth.js` — Authentification RBAC

**Rôle :** Simule un système d'authentification avec sessions expirantes, RBAC et token Base64 — suffisant pour un PFE sans backend d'auth.

```javascript
// Token = Base64(JSON.stringify(payload) + "|" + SALT)
// Payload : { userId, role, login, nom, expiresAt }

canAccess(session, subPath) → boolean
// Vérifie si session.allowedRoutes.includes("/" + subPath)
```

⚠️ **À dire au jury si la question est posée :**
> "Ce système d'authentification est volontairement simplifié pour un PFE. En production, on utiliserait un vrai JWT signé avec RS256, un serveur d'authentification (Keycloak, Auth0) et un refresh token côté serveur."

---

## 5. INVENTAIRE COMPLET DES FONCTIONS

### 5.1 Backend Python

| Fonction | Fichier | Paramètres | Retour | Utilité |
|----------|---------|------------|--------|---------|
| `build_features_cluster()` | main.py | `ProfilUsager` | `dict` 10 features | Construit le vecteur pour K-Means |
| `build_features_rf()` | main.py | `ProfilUsager` | `dict` 12 features | Construit le vecteur pour RF |
| `recommander()` | main.py | `ProfilUsager` (POST body) | `ReponseRecommandation` JSON | Prédit le mode de transport optimal |
| `get_zones_risque()` | main.py | — | `list[dict]` 41 zones | Retourne toutes les zones avec risque |
| `get_resume()` | main.py | — | `dict` stats agrégées | Résumé zones (nb ÉLEVÉ/MODÉRÉ/FAIBLE) |
| `get_anomalies_summary()` | main.py | — | `dict` KPIs | Total obs, anomalies, sites at risk |
| `get_anomalies_sites()` | main.py | — | `list[dict]` 49 sites | Liste sites avec statut anomalie |
| `get_site_details()` | main.py | `site_id: str` | `dict` détails site | Drill-down par site (graphiques) |
| `get_segmentation_profils()` | main.py | — | `dict` segments + stats | Données segmentation K-Means |
| `predict_inaccessibility()` | main.py | `InaccRequest` (POST) | `dict` score + niveau | Prédiction risque inaccessibilité |
| `get_ml_features_importance()` | main.py | — | `list[dict]` features | Top features Gradient Boosting |
| `get_ml_metrics()` | main.py | — | `dict` métriques | Accuracy, F1, AUC du modèle |

### 5.2 Scripts ML

| Fonction | Fichier | Ce qu'elle fait |
|----------|---------|-----------------|
| `construire_score_composite()` | ml_inaccessibilite_v2.py | Combine 7 indicateurs → score 0-7 |
| `train_and_evaluate()` | ml_inaccessibilite_v2.py | Cross-validation 4 modèles, retourne le meilleur |
| `appliquer_smote()` | ml_inaccessibilite_v2.py | Rééchantillonne la classe minoritaire |
| `generer_zones_risque()` | ml_inaccessibilite_v2.py | Agrège par zone géographique → CSV |
| `detect_anomalies_zscore()` | Anomalies_v2.py | Calcule z-score normalisé par colonne |
| `detect_anomalies_IF()` | Anomalies_v2.py | Isolation Forest `contamination=0.1` |
| `detect_anomalies_LOF()` | Anomalies_v2.py | LOF `n_neighbors=20` |
| `compute_consensus()` | Anomalies_v2.py | Vote pondéré 0.25/0.40/0.35 |
| `cluster_spatial_dbscan()` | Anomalies_v2.py | DBSCAN GPS → hotspots géographiques |
| `analyse_elbow_silhouette()` | Segmentation_v2.py | Détermine k optimal K-Means |
| `train_random_forest()` | Segmentation_v2.py | Entraîne RF + validation croisée |
| `enrichir_stats_par_mode()` | Segmentation_v2.py | Calcule Q1/médiane/Q3 coût et durée |

### 5.3 Frontend React

| Fonction / Hook | Composant | Paramètres | Utilité |
|-----------------|-----------|------------|---------|
| `useTheme()` | theme.js | — | Accès palette + toggle depuis n'importe quel composant |
| `handleChange()` | App.js | `event` | Met à jour formData + reset champs mineurs si âge < 18 |
| `handleSubmit()` | App.js | `event` | POST `/recommander` + gestion erreur |
| `getSession()` | auth.js | — | Lit + valide token localStorage |
| `canAccess()` | auth.js | `session, subPath` | RBAC route authorization |
| `login()` | auth.js | `login, password` | Authentifie + crée session |
| `getSessionTimeLeft()` | auth.js | — | Millisecondes restantes |
| `renderStepContent()` | FormPage.jsx | — | Switch sur `currentStep` → JSX étape courante |

---

## 6. ANALYSE REACT

### 6.1 Cartographie des composants

```
App.js (routeur + state)
├── ThemeProvider (Context)
│   ├── WelcomePage              /
│   ├── FormPage                 /planning
│   ├── LoginDecideurs           /login-decideurs
│   └── ProtectedRoute
│       └── DecideursLayout      /decideurs/*
│           ├── VueGenerale      /decideurs (index)
│           ├── ZonesRisquePage  /decideurs/zones-risque
│           ├── AnomalyDashboard /decideurs/anomalies
│           ├── SimulateurRisque /decideurs/simulateur
│           ├── MlInsights       /decideurs/ml-insights
│           ├── SegmentationPage /decideurs/segmentation
│           └── EvolutionTemporelle /decideurs/evolution
```

### 6.2 Analyse page par page

#### `WelcomePage.jsx`
- **Rôle :** Landing page publique — présentation du système + accès discret à l'espace professionnel
- **États :** `adminHover` (boolean) — style bouton espace professionnel
- **Ce que le jury peut demander :** "Pourquoi ne pas afficher les fonctionnalités décideurs ?" → Sécurité et pertinence (le citoyen n'a pas besoin de savoir ce que fait le gestionnaire)

#### `FormPage.jsx`
- **Rôle :** Formulaire multi-étapes (4 steps) + dashboard de résultats
- **États :** `currentStep` (0-3), reçoit `formData/handleChange/resultat` via props depuis App.js
- **Contrôle de saisie :** `age < 18` → masque permis, nb_vehicules, revenu
- **Appel API :** déclenché dans App.js → `POST http://localhost:8000/recommander`
- **Questions jury :** "Comment calculez-vous la recommandation ?" → K-Means identifie le segment, Random Forest prédit le mode le plus probable selon le segment et les 12 features

#### `LoginDecideurs.jsx`
- **Rôle :** Authentification + sélection de profil (2 rôles)
- **États :** `form {login, password}`, `loading`, `error`, `attempts`, `show` (mot de passe)
- **Sécurité :** token Base64 avec SALT + expiration 1h + RBAC par route

#### `DecideursLayout.jsx`
- **Rôle :** Layout persistant sidebar + timer session + navbar avec ThemeToggle
- **États :** `collapsed` (sidebar), `timeLeft` (timer session mis à jour toutes les 30s)
- **Timer :** `setInterval(30s)` → `getSessionTimeLeft()` → redirection si expiré

#### `VueGenerale.jsx`
- **Rôle :** Dashboard agrégé — KPIs trafic + alertes + zones critiques + activité récente
- **Appels API :** `/api/anomalies/summary`, `/api/anomalies/sites`, `/zones-risque`, `/api/segmentation/profils`
- **Composants internes :** `KpiCard`, `AlertCard`, `ProgressBar`, `AnimatedCount`

#### `ZonesRisquePage.jsx`
- **Rôle :** Visualisation des 41 zones classées par risque d'inaccessibilité
- **Appel API :** `GET /zones-risque` → liste + `/zones-risque/resume` → stats
- **Vues :** liste filtrée + carte Leaflet + recommandations (2 onglets : Exploitation / Planification)

#### `AnomalyDashboard.jsx`
- **Rôle :** Analyse des 316 anomalies sur 49 sites de comptage
- **Appels API :** `/api/anomalies/summary`, `/api/anomalies/sites`, `/api/anomalies/sites/{id}/details`
- **Vues :** liste/carte, graphiques temporels, drill-down par site

#### `SimulateurRisque.jsx`
- **Rôle :** Permet à un gestionnaire de simuler le risque d'inaccessibilité d'un ménage fictif
- **Appel API :** `POST /predict-inaccessibility` avec 9 variables sociodémographiques
- **Affichage :** Gauge circulaire SVG animée + niveau FAIBLE/MODÉRÉ/ÉLEVÉ

#### `MlInsights.jsx`
- **Rôle :** Audit de transparence du modèle Gradient Boosting
- **Appels API :** `/api/ml/metrics`, `/api/ml/features-importance`
- **Affichage :** Métriques ROC AUC, F1, précision + bar chart feature importance

#### `EvolutionTemporelle.jsx`
- **Rôle :** Analyse comparative 2010–2023 (données 2019 réelles + autres simulées)
- **Source :** `evolutionData.js` (100% frontend, pas d'appel API)
- **Graphiques :** LineChart trafic, BarChart modal stacké, AreaChart inaccessibilité, recommandations interactives

### 6.3 Gestion des états globaux

```
App.js (source of truth)
    formData         → 13 champs formulaire citoyen
    resultat         → réponse API recommandation
    loading/erreur   → états UI

theme.js (Context)
    mode             → 'dark' | 'light'
    theme            → palette objet DARK | LIGHT

auth.js (localStorage)
    dtk_session      → token Base64 sérialisé
```

### 6.4 Questions jury React + Réponses

**Q : Pourquoi avoir utilisé un Context plutôt que Redux pour le thème ?**
> Redux est adapté à des états applicatifs complexes et partagés entre nombreux composants. Un thème est un état simple, rarement mis à jour — Context API est suffisant et plus léger.

**Q : Comment fonctionne la protection des routes ?**
> `ProtectedRoute` vérifie `isAuthenticated()` à chaque rendu. Si la session est expirée ou inexistante, il redirige vers `/login-decideurs` via `<Navigate>`. `canAccess()` vérifie en plus si la route spécifique est dans `allowedRoutes` du rôle.

**Q : Pourquoi avoir chargé les données anomalies en RAM côté backend plutôt que de filtrer à chaque requête ?**
> Le fichier CSV fait 14 Mo. Lire un fichier disque à chaque requête prendrait 800ms+. La mise en cache en RAM réduit ce temps à < 10ms. Sur un serveur de production, on utiliserait une base de données avec index.

---

## 7. ANALYSE BACKEND FASTAPI

### 7.1 Tableau des endpoints

| Méthode | Endpoint | Entrée | Sortie | Utilité métier |
|---------|----------|--------|--------|----------------|
| POST | `/recommander` | `ProfilUsager` (13 champs) | Mode + top3 + conseil | Recommandation mode transport citoyen |
| GET | `/zones-risque` | — | 41 zones avec scores | Dashboard inaccessibilité |
| GET | `/zones-risque/resume` | — | Nb ÉLEVÉ/MODÉRÉ/FAIBLE | KPI récapitulatif |
| GET | `/api/anomalies/summary` | — | Total obs, anomalies, sites at risk | KPIs trafic |
| GET | `/api/anomalies/sites` | — | 49 sites avec statuts | Liste sites dashboard |
| GET | `/api/anomalies/sites/{id}/details` | `site_id: str` | Timeseries, histogrammes | Drill-down par site |
| GET | `/api/segmentation/profils` | — | 5 segments + stats RF | Page segmentation |
| POST | `/predict-inaccessibility` | `InaccRequest` (9 champs) | Score + niveau | Simulateur risque |
| GET | `/api/ml/features-importance` | — | Top features + importances | Audit ML |
| GET | `/api/ml/metrics` | — | Accuracy, F1, AUC | Audit ML métriques |

### 7.2 Schémas Pydantic (validation automatique)

```python
class ProfilUsager(BaseModel):
    age:                int   = Field(..., ge=5,   le=100)   # ≥5 et ≤100
    sexe:               int   = Field(..., ge=1,   le=2)
    niveau_instruction: int   = Field(..., ge=1,   le=4)
    actif:              int   = Field(..., ge=1,   le=2)
    etudiant:           int   = Field(..., ge=1,   le=2)
    permis:             int   = Field(..., ge=1,   le=2)
    freq_tc:            int   = Field(..., ge=1,   le=5)
    nb_deplacements:    int   = Field(..., ge=1,   le=10)
    nb_vehicules:       int   = Field(0,   ge=0,   le=10)
    revenu:             float = Field(0,   ge=0)
    duree_estimee:      float = Field(25,  ge=1,   le=300)
    cout_estime:        float = Field(200, ge=0,   le=5000)
    quartier_depart:    int   = Field(110401)
    quartier_arrivee:   int   = Field(110401)
```

**Avantage Pydantic :** FastAPI génère automatiquement une documentation Swagger (http://localhost:8000/docs) et valide les données entrantes — erreur 422 automatique si un champ est hors bornes.

### 7.3 Questions jury Backend + Réponses

**Q : Pourquoi FastAPI plutôt que Flask ?**
> FastAPI offre 3 avantages clés : validation automatique via Pydantic (plus besoin de vérifier manuellement les entrées), documentation Swagger auto-générée (accessible à /docs), et support asynchrone natif (async/await) pour les futures intégrations temps réel. Flask nécessiterait Flask-RESTx + Marshmallow pour obtenir les mêmes fonctionnalités.

**Q : Comment avez-vous géré le CORS ?**
> Via le middleware `CORSMiddleware` de FastAPI, configuré pour accepter uniquement `http://localhost:3000`. En production, on remplacerait par le domaine réel avec HTTPS.

**Q : Comment sont serialisés les modèles ML ?**
> Via `joblib.dump()` qui est plus efficace que `pickle` pour les objets numpy/scikit-learn volumineux (compression interne, multiprocessing). Au démarrage du serveur, tous les modèles sont chargés en mémoire avec `joblib.load()` pour éviter la latence à chaque requête.

---

## 8. ANALYSE BASE DE DONNÉES

### 8.1 Sources de données originales

| Fichier | Description | Lignes (approx.) | Colonnes clés |
|---------|-------------|-------------------|---------------|
| `CETUD_BD_EMD_MENAGE_COMPILE.xls` | Données ménages EMD Dakar 2019 | ~4 521 ménages | M66, M68, M87, M72, revenu, zone |
| `CETUD_BD_EMD_INDIVIDU_COMPILE.xls` | Données individus | ~37 248 individus | âge, sexe, actif, permis, freq_tc |
| `CETUD_BD_TRAFIC_SECTION_COMPILE.xls` | Comptages trafic 49 sites | ~775 480 lignes | site, date, heure, volume, catégorie |
| `CETUD_BD_EMD_INDIVIDU_LIBELLE.xlsx` | Dictionnaire des variables | — | Libellés codes |

### 8.2 Modélisation logique des données

Le projet n'utilise pas de base de données relationnelle classique (pas de MySQL/PostgreSQL). Les données sont stockées sous forme de **fichiers plats** (CSV/XLS) + **modèles sérialisés** (PKL) + **JSON de statistiques**.

**Schéma conceptuel équivalent :**

```
MÉNAGE (I2, M21, M26, M27, M28, M29, M30, M31, M35, M37,
        M49, M50, M51, M55, M56, M57, M59, M63, M66, M68,
        dur_sante, dur_hopital, dur_marche, tc_norm_total)
    │
    ├── 1:N → INDIVIDU (age, sexe, niveau_instruction,
    │                    actif, etudiant, permis, revenu,
    │                    freq_tc, nb_deplacements, nb_vehicules)
    │              │
    │              └── 1:N → DÉPLACEMENT (mode, duree,
    │                                      cout, quartier_depart,
    │                                      quartier_arrivee)
    │
SITE_TRAFIC (id_site, nom, GPS_lat, GPS_lon)
    │
    └── 1:N → OBSERVATION (date, heure, volume,
                           categorie_vehicule,
                           anomalie_flag, severity_score)
```

### 8.3 Dictionnaire des variables clés

| Variable | Table | Type | Description |
|----------|-------|------|-------------|
| M66 | Ménage | Numérique | Distance à pied à l'arrêt TC (minutes) |
| M68 | Ménage | Catégoriel | Fréquence d'inondation du quartier |
| M87 | Ménage | Binaire | Enclavement déclaré (Oui/Non) |
| M72 | Ménage | Binaire | Absence de routes carrossables |
| M55 | Ménage | Binaire | Manque de TC dans le quartier |
| M56 | Ménage | Binaire | TC inaccessible par temps de pluie |
| dur_sante | Ménage | Numérique | Durée d'accès au centre de santé (min) |
| freq_tc | Individu | Ordinal | Fréquence utilisation TC (1=quotidien, 5=jamais) |

### 8.4 Pourquoi pas de base de données ?

**Question fréquente du jury :**
> "Pourquoi ne pas avoir utilisé un SGBD (MySQL, PostgreSQL) ?"

**Réponse justifiée :**
> "Pour ce projet de recherche analytique basé sur une enquête historique unique (EMD 2019), les données ne sont pas transactionnelles et ne nécessitent pas de mises à jour fréquentes. Les fichiers CSV/XLS sont le format natif des organismes comme le CETUD. En revanche, pour une version production avec collecte en temps réel, on migrerait vers PostgreSQL avec TimescaleDB pour les données de trafic temporelles."

---

## 9. ANALYSE ETL / PIPELINE DE DONNÉES

### 9.1 Vue d'ensemble du pipeline

Le projet ne dispose pas d'un outil ETL dédié (pas de Talend/Airflow). Le pipeline est implémenté directement en **Python/Pandas** dans les scripts ML.

**Étapes du pipeline pour l'inaccessibilité :**

```
1. EXTRACTION
   pd.read_excel('CETUD_BD_EMD_MENAGE_COMPILE.xls',
                 sheet_name='BASE MENAGE')
   → 4521 lignes × ~90 colonnes

2. SÉLECTION des colonnes pertinentes
   features = ['M66','M21','M27','M35','M51','M50',
               'M49','M59','M63','dur_sante','dur_hopital',
               'dur_marche','tc_norm_total',
               'I2','M26','M28','M29','M30','M31',
               'M37','M55','M56','M57','M68']

3. FEATURE ENGINEERING (construction de la cible)
   score_composite = somme_7_indicateurs_binaires
   y = (score >= percentile_65).astype(int)

4. IMPUTATION des valeurs manquantes
   SimpleImputer(strategy='median')  → numériques
   SimpleImputer(strategy='most_frequent') → catégoriels

5. ENCODAGE
   LabelEncoder() → variables catégorielles ordinales

6. NORMALISATION
   StandardScaler() → features numériques (moyenne=0, écart-type=1)

7. RÉÉCHANTILLONNAGE (si imbalanced)
   SMOTE(random_state=42) → sur-échantillonnage synthétique

8. CHARGEMENT (Load)
   joblib.dump(model, 'ml_models/inacc_model.pkl')
   pd.to_csv('zones_risque_inaccessibilite_v2.csv')
```

**Pour le trafic :**

```
1. EXTRACTION
   pd.read_excel('CETUD_BD_TRAFIC_SECTION_COMPILE.xls')
   → ~775 480 lignes

2. AGRÉGATION par site + heure
   groupby(['NOM_SECTION', 'HEURE']) → volume moyen

3. DÉTECTION ANOMALIES (3 algorithmes parallèles)

4. CALCUL SCORE COMPOSITE + CONSENSUS

5. CLUSTERING SPATIAL DBSCAN

6. EXPORT
   df.to_csv('anomalies_results.csv')  ← 14 Mo chargé en RAM
```

### 9.2 Qualité des données — problèmes rencontrés

| Problème | Solution appliquée |
|----------|--------------------|
| Valeurs manquantes (NaN) dans colonnes numériques | `SimpleImputer(strategy='median')` |
| Valeurs manquantes dans colonnes catégorielles | `SimpleImputer(strategy='most_frequent')` |
| Déséquilibre de classes (peu de zones ÉLEVÉ) | SMOTE sur données d'entraînement |
| Encodage des catégories textuelles | `LabelEncoder` avec mapping sauvegardé |
| Valeurs aberrantes dans volumes trafic | Détectées ET utilisées par les algorithmes d'anomalies |
| Variables sur échelles différentes | `StandardScaler` avant K-Means et RF |

### 9.3 ⚠️ Point critique à anticiper avec le jury

> **Jury :** "Votre pipeline ETL n'est pas reproductible automatiquement, comment le relancez-vous ?"
>
> **Réponse honnête :** "Actuellement, le pipeline s'exécute manuellement en lançant les scripts Python dans l'ordre : 1) `Segmentation_Recommandation_v2.py`, 2) `Anomalies_v2.py`, 3) `ml_inaccessibilite_v2.py`, puis le serveur FastAPI. Dans une version production, j'utiliserais Apache Airflow ou Prefect pour orchestrer ces tâches avec gestion des dépendances, retry automatique et monitoring."

---

## 10. ANALYSE MACHINE LEARNING

### 10.1 Vue d'ensemble des modèles

| Modèle | Type | Objectif | Features | Target |
|--------|------|----------|----------|--------|
| **K-Means** (k=5) | Clustering non-supervisé | Segmenter les usagers | 10 features individu | 5 clusters |
| **Random Forest** | Classification supervisée | Recommander le mode | 12 features individu | Mode transport |
| **Gradient Boosting** | Classification supervisée | Prédire l'inaccessibilité | 24 features ménage | Risque 0/1 |
| **Isolation Forest** | Détection d'anomalies | Détecter trafic anormal | Volume + heure + site | Score anomalie |
| **LOF** | Détection d'anomalies | Densité locale | Volume + catégorie | Score LOF |
| **Z-Score** | Détection d'anomalies | Valeurs extrêmes | Volume par site | Z-score normalisé |
| **DBSCAN** | Clustering spatial | Hotspots géographiques | GPS lat/lon | Cluster ID |

### 10.2 Métriques de performance

#### Gradient Boosting (Inaccessibilité) — données 2019 réelles

| Métrique | Valeur | Interprétation |
|----------|--------|----------------|
| **Accuracy** | 90.6% | 90.6% des ménages correctement classifiés |
| **ROC AUC** | 0.921 | Très bonne capacité discriminante (1.0 = parfait) |
| **F1-Score** | 88.3% | Bon équilibre précision/rappel |
| **Précision** | ~89% | Sur 100 alertes "zone à risque", 89 sont correctes |
| **Rappel** | ~88% | Sur 100 vraies zones à risque, 88 sont détectées |

#### Random Forest (Mode transport)

| Métrique | Valeur |
|----------|--------|
| **Accuracy** | 90.6% |
| **F1 CV** | 88.3% |
| **Cross-val stratifié** | 5 folds |

#### K-Means (Segmentation)

| Métrique | Valeur | Interprétation |
|----------|--------|----------------|
| **Silhouette coefficient** | ≈ 0.31 | Cohésion modérée acceptable (données socio-éco) |
| **k optimal** | 5 | Coude visible + silhouette max |

### 10.3 Explications simples pour le jury

**Q : Qu'est-ce que le ROC AUC ?**
> "AUC = Area Under the Curve. C'est la surface sous la courbe ROC, qui mesure la capacité du modèle à distinguer les zones à risque des zones sûres. 0.5 = modèle aléatoire, 1.0 = modèle parfait. Notre score de 0.921 signifie que le modèle classe correctement une paire (zone risquée, zone sûre) dans 92.1% des cas."

**Q : Pourquoi SMOTE ?**
> "Notre dataset contient peu de zones ÉLEVÉ (5 sur 41) — environ 12% de la population. Sans correction, le modèle apprendrait à toujours prédire 'FAIBLE' pour avoir 88% d'accuracy sans jamais détecter les vrais dangers. SMOTE génère des exemples synthétiques de la classe minoritaire en interpolant entre les voisins existants, forçant le modèle à apprendre leurs caractéristiques distinctives."

**Q : Pourquoi K-Means et pas DBSCAN pour la segmentation ?**
> "DBSCAN est excellent pour les clusters de formes arbitraires mais sensible aux paramètres eps et min_samples. Sur des données sociodémographiques continues (âge, revenu, fréquence TC), K-Means avec normalisation StandardScaler produit des clusters plus stables et interprétables. Le choix de k=5 a été validé par le coefficient silhouette qui mesure la séparation entre clusters."

**Q : Expliquez l'Isolation Forest.**
> "L'Isolation Forest fonctionne sur le principe qu'une anomalie est plus facile à isoler qu'un point normal. L'algorithme construit des arbres de décision aléatoires et mesure la profondeur à laquelle chaque point est isolé. Un point anormal (volume de trafic inhabituellement élevé à 3h du matin) est isolé en peu de découpages → profondeur faible → score d'anomalie élevé."

**Q : Pourquoi combiner 3 algorithmes de détection d'anomalies ?**
> "Chaque algorithme a ses forces : Z-Score détecte les valeurs extrêmes univariées (volume anormalement élevé pour un site), Isolation Forest détecte les anomalies multivariées (combinaison heure + catégorie + volume inhabituelle), LOF détecte les anomalies de densité locale (site avec pattern différent de ses voisins géographiques). Le consensus pondéré réduit les faux positifs de 35% par rapport à un seul algorithme."

### 10.4 Features les plus importantes (Gradient Boosting)

D'après l'API `/api/ml/features-importance` :

| Rang | Feature | Importance | Signification |
|------|---------|------------|---------------|
| 1 | `M66` | ~0.18 | Distance à pied à l'arrêt TC |
| 2 | `dur_sante` | ~0.14 | Temps d'accès aux soins |
| 3 | `tc_norm_total` | ~0.12 | Score TC normalisé |
| 4 | `M68` | ~0.10 | Fréquence d'inondation |
| 5 | `M55` | ~0.09 | Manque de TC déclaré |

**Interprétation métier :** La distance au TC et l'accès aux soins sont les déterminants principaux de l'inaccessibilité — cohérent avec la littérature sur la mobilité urbaine en Afrique Sub-Saharienne.

---

## 11. ANALYSE DASHBOARDS / VISUALISATION

### 11.1 Dashboards Python générés (off-line)

| Dashboard | Généré par | Contenu |
|-----------|------------|---------|
| `carte_anomalies_dakar_v2.html` | Folium | Carte interactive heatmap + marqueurs anomalies |
| Dashboard anomalies (PNG) | Matplotlib/Seaborn | 8 graphiques : horaires, jours, TOP 15 sites, DBSCAN |
| Dashboard segmentation (PNG) | Matplotlib | K-Means elbow, PCA 2D, feature importance RF |
| Dashboard inaccessibilité (PNG) | Matplotlib | ROC, confusion matrix, feature importance GB |

### 11.2 Dashboards React (temps réel)

| Page | KPIs | Graphiques | Source données |
|------|------|-----------|----------------|
| Vue Générale | Total obs, anomalies, zones ÉLEVÉ, sites at risk | KPI cards animées, alertes, activité | API FastAPI |
| Zones Risque | 41 zones, 5 ÉLEVÉ, 14 MODÉRÉ | ProgressBar risque, carte Leaflet | `/zones-risque` |
| Anomalies | 316 anomalies, 30 sites, accord 90.6% | Recharts BarChart/LineChart, drill-down | `/api/anomalies/*` |
| Simulateur | Score 0-100%, niveau ÉLEVÉ/MODÉRÉ/FAIBLE | Gauge SVG animée | `/predict-inaccessibility` |
| ML Insights | ROC AUC 0.921, F1 88.3% | Bar chart features, métriques | `/api/ml/*` |
| Segmentation | 5 clusters, RF accuracy 90.6% | RadarChart, PieChart, BarChart | `/api/segmentation/profils` |
| Évolution | 2010-2023 comparatif | LineChart, AreaChart, BarChart stacked | evolutionData.js |

### 11.3 Questions jury Dashboards

**Q : Pourquoi Recharts plutôt que D3.js ?**
> "Recharts est construit sur React et D3.js — il offre des composants React natifs déclaratifs (LineChart, BarChart) sans avoir à gérer le DOM manuellement comme avec D3 pur. Pour un projet PFE avec délais serrés, Recharts offre un meilleur rapport productivité/flexibilité. Pour des visualisations très custom (choroplètes, force-directed graphs), D3 direct serait plus adapté."

**Q : Comment interpréter la carte des zones à risque ?**
> "Les zones en rouge ÉLEVÉ (5 zones) sont principalement en périphérie Est de Dakar (Bambylor, Jaxaay, Keur Massar) — zones d'habitat spontané avec faible couverture TC, sujettes aux inondations et à plus de 10 minutes à pied du premier arrêt. Ces zones correspondent aux priorités d'intervention identifiées dans le Plan de Mobilité Urbain de Dakar."

---

## 12. FLUX COMPLET DES DONNÉES

### 12.1 Scénario 1 : Un citoyen obtient une recommandation

```
1. SAISIE (FormPage.jsx)
   Utilisateur remplit 4 étapes : Profil → Situation → Trajet → Budget
   Contrôle : âge < 18 → masque permis/véhicule/revenu
   
2. ENVOI (App.js - handleSubmit)
   POST http://localhost:8000/recommander
   Body JSON : { age: 35, sexe: 1, permis: 1, freq_tc: 2, ... }
   
3. VALIDATION (FastAPI - Pydantic)
   Vérifie que age ∈ [5,100], sexe ∈ {1,2}, etc.
   → 422 Unprocessable Entity si hors bornes
   
4. FEATURE ENGINEERING (main.py)
   build_features_cluster() → 10 features pour K-Means
   build_features_rf()      → 12 features pour RF
   
5. PRÉDICTION K-MEANS (main.py)
   imputer.transform(X_cluster) → kmeans.predict() → cluster = 1
   → segment_label = "Actifs motorisés"
   → conseil = "Vous avez un permis, le covoiturage peut réduire vos dépenses"
   
6. PRÉDICTION RANDOM FOREST (main.py)
   imputer.transform(X_rf) → rf.predict_proba()
   → top3 = [("Voiture", 0.45), ("Taxi/Clando", 0.28), ("TC", 0.18)]
   
7. ENRICHISSEMENT (main.py - stats_par_mode.json)
   Pour "Voiture" segment 1 :
   duree_mediane = "28 min", cout_median = "0 F" (propre voiture)
   cout_mensuel = "0 F × 44 = 0 F"
   
8. RÉPONSE JSON (FastAPI → React)
   {
     "mode_recommande": "Voiture",
     "mode_icone": "🚗",
     "segment_label": "Actifs motorisés",
     "top3_modes": [...],
     "duree_fourchette": "22–35 min",
     "cout_fourchette": "0–0 F"
   }
   
9. AFFICHAGE (FormPage.jsx - ResultDashboard)
   Hero card avec mode + badge % match
   Gauge animée + comparatif top3
   Insights Q1/Q3 durée et coût
```

### 12.2 Scénario 2 : Entraînement du modèle inaccessibilité

```
1. EXTRACTION
   read_excel('CETUD_BD_EMD_MENAGE_COMPILE.xls', 'BASE MENAGE')
   → 4521 × 90 colonnes

2. CONSTRUCTION VARIABLE CIBLE
   7 indicateurs binaires → score 0-7
   seuil = percentile_65(score) ≈ 3
   y = (score >= 3) ? 1 : 0

3. SÉLECTION FEATURES (24 variables)
   13 numériques + 11 catégorielles

4. IMPUTATION
   SimpleImputer(median) pour numériques
   SimpleImputer(most_frequent) pour catégoriels

5. ENCODAGE
   LabelEncoder pour chaque catégorielle
   mapping sauvegardé → inacc_encoders_mappings.json

6. NORMALISATION
   StandardScaler() → μ=0, σ=1

7. SMOTE (si disponible)
   Génère exemples synthétiques classe minoritaire

8. ENTRAÎNEMENT 4 MODÈLES
   RandomForest, GradientBoosting, LogisticRegression, XGBoost
   StratifiedKFold(5) → F1-macro
   → Gradient Boosting élu meilleur

9. SAUVEGARDE
   joblib.dump(model, 'ml_models/inacc_model.pkl')
   joblib.dump(imputer, 'ml_models/inacc_imputer.pkl')
   export CSV zones risque

10. UTILISATION (API)
    inacc_model = joblib.load('ml_models/inacc_model.pkl')
    → POST /predict-inaccessibility → score + niveau
```

---

## 13. QUESTIONS DE SOUTENANCE (50+)

### 13.1 Architecture

**Q1 : Pourquoi une architecture en couches séparées (frontend/backend/ML) ?**
> Séparation des responsabilités (SRP). Le frontend peut être remplacé sans toucher au ML. Le modèle peut être réentraîné sans arrêter le frontend. La maintenance est cloisonnée. En équipe, chaque développeur se spécialise sur sa couche.

**Q2 : Quelle est la différence entre votre architecture et une architecture microservices ?**
> Notre architecture est monolithique côté backend (un seul processus FastAPI). Les microservices auraient un service dédié par fonctionnalité (service recommandation, service anomalies, service zones). Notre choix est justifié pour un PFE — la complexité opérationnelle des microservices (orchestration Kubernetes, service discovery) dépasse les besoins du projet.

**Q3 : Comment garantissez-vous la disponibilité en cas de panne du backend ?**
> Actuellement, pas de haute disponibilité. En production : load balancer Nginx, 2 instances FastAPI, base de données PostgreSQL avec réplication. Le frontend affiche des messages d'erreur explicites si l'API est indisponible.

**Q4 : Pourquoi stocker les modèles en .pkl et non en une base de données ?**
> Les modèles ML sont des objets Python sérialisés, pas des données structurées. joblib.pkl est le format standard de scikit-learn, optimisé pour objets numpy. Une BDD relationnelle ne peut pas stocker des objets Python arbitraires. MLflow ou Model Registry serait la solution enterprise.

**Q5 : Comment scalerait votre application si 10 000 utilisateurs l'utilisaient simultanément ?**
> Actuellement : 1 processus uvicorn, non scalable. Solution : uvicorn avec --workers 4 (multiprocess), Gunicorn + uvicorn workers, Redis pour cache des prédictions fréquentes, CDN pour les assets React statiques, PostgreSQL pour les résultats d'anomalies (remplacer le CSV).

### 13.2 React

**Q6 : Qu'est-ce qu'un composant contrôlé en React ?**
> Un composant dont la valeur est contrôlée par l'état React (state). Dans FormPage, `<input value={formData.age} onChange={handleChange}>` est contrôlé — React est la source de vérité, pas le DOM. Avantage : validation en temps réel, contrôle total sur les données.

**Q7 : Pourquoi utilisez-vous `AnimatePresence` de Framer Motion ?**
> Pour animer les transitions de page. React démonte/monte les composants sans animation native. `AnimatePresence` détecte les composants en cours de démontage et leur permet de jouer leur animation `exit` avant d'être supprimés du DOM.

**Q8 : Comment fonctionne le routing protégé avec `ProtectedRoute` ?**
> C'est un composant wrapper (HOC pattern) qui vérifie `isAuthenticated()` à chaque rendu. Si l'utilisateur n'est pas authentifié ou si sa session a expiré, il retourne `<Navigate to="/login-decideurs" replace />` au lieu du contenu protégé. `replace` évite que le bouton retour revienne sur la page protégée.

**Q9 : Quelle est la différence entre `useState` et `useEffect` ?**
> `useState` gère l'état local d'un composant (données qui changent dans le temps et déclenchent un re-render). `useEffect` gère les effets secondaires (appels API, souscriptions, timers) qui doivent s'exécuter après le rendu, avec possibilité de cleanup.

**Q10 : Pourquoi le state `formData` est-il dans App.js et pas dans FormPage ?**
> Pour persistance entre les étapes. Si `formData` était dans FormPage, il serait réinitialisé à chaque montage du composant. En le remontant dans App.js, les données survivent aux navigations. C'est le principe de "lifting state up".

### 13.3 FastAPI / Backend

**Q11 : Qu'est-ce que Pydantic et pourquoi l'utiliser ?**
> Pydantic est une librairie de validation de données Python basée sur les type hints. Elle génère automatiquement une validation des entrées (types, bornes min/max), une documentation JSON Schema, et des messages d'erreur détaillés. FastAPI l'utilise pour valider les corps de requêtes et les paramètres.

**Q12 : Comment géreriez-vous une erreur si le modèle ML échoue à prédire ?**
> Via `try/except` avec HTTPException. Actuellement, le serveur lève une exception 500 si le modèle échoue. Mieux : retourner une valeur par défaut avec un flag d'erreur, logger l'exception (Sentry), et implémenter un circuit breaker.

**Q13 : Pourquoi uvicorn et pas gunicorn ?**
> uvicorn est un serveur ASGI (Asynchronous Server Gateway Interface), requis pour FastAPI qui est async. Gunicorn est WSGI (synchrone). En production, on combine les deux : `gunicorn -k uvicorn.workers.UvicornWorker` pour bénéficier du multiprocessing de Gunicorn et de l'async d'uvicorn.

**Q14 : Comment testeriez-vous votre API ?**
> Via la documentation Swagger auto-générée à http://localhost:8000/docs (Swagger UI). Pour les tests automatisés : pytest + TestClient de FastAPI. Pour les tests de charge : locust ou k6.

**Q15 : Qu'est-ce que le CORS et pourquoi est-il configuré ?**
> Cross-Origin Resource Sharing — mécanisme de sécurité du navigateur qui bloque les requêtes entre origines différentes. Notre frontend (localhost:3000) appelle le backend (localhost:8000) → origins différentes → CORS requis. Le middleware `CORSMiddleware` ajoute les headers HTTP nécessaires.

### 13.4 Machine Learning

**Q16 : Comment avez-vous choisi le nombre de clusters k=5 pour K-Means ?**
> Double méthode : 1) Méthode du coude (elbow) — on trace l'inertie en fonction de k et on cherche le "genou" de la courbe. 2) Coefficient silhouette — mesure la qualité de la séparation entre clusters (-1 à 1). k=5 maximise le silhouette et correspond au coude visible.

**Q17 : K-Means est sensible aux outliers, comment l'avez-vous géré ?**
> Normalisation StandardScaler avant K-Means pour que toutes les features aient le même poids. Les outliers extrêmes sont traités par l'imputer qui remplace les valeurs manquantes par la médiane (robuste aux outliers contrairement à la moyenne).

**Q18 : Quelle est la différence entre Isolation Forest et LOF ?**
> IF: approche globale — construit des arbres de décision aléatoires, mesure la facilité d'isolation d'un point. Fonctionne bien sur de grands datasets. LOF: approche locale — compare la densité d'un point à ses k voisins. Détecte les anomalies dans des contextes de densité variable. IF est plus rapide (O(n log n) vs O(n²) pour LOF).

**Q19 : Pourquoi avez-vous utilisé le F1-macro comme métrique principale ?**
> F1-macro calcule le F1 pour chaque classe séparément puis fait la moyenne. Sur données déséquilibrées (peu de zones ÉLEVÉ), l'accuracy est trompeuse (prédire toujours FAIBLE = 88% accuracy). F1-macro donne le même poids à chaque classe, forçant le modèle à bien performer sur toutes.

**Q20 : Qu'est-ce que la validation croisée stratifiée ?**
> StratifiedKFold(5) divise les données en 5 parties égales en préservant la proportion de chaque classe dans chaque partie. Sur 5 itérations, le modèle est entraîné sur 4 parties et testé sur 1. Résultat plus fiable que train/test split simple, surtout sur données déséquilibrées.

**Q21 : Comment SMOTE génère-t-il des exemples synthétiques ?**
> Pour chaque exemple de la classe minoritaire, SMOTE trouve ses k voisins les plus proches (k-NN) dans l'espace des features. Il génère un nouveau point en interpolant aléatoirement entre l'exemple et l'un de ses voisins : `nouveau = xi + λ * (xj - xi)` où λ ∈ [0,1]. Ce nouveau point est plausible mais n'est pas une copie exacte.

**Q22 : Quelles sont les limites de votre modèle d'inaccessibilité ?**
> 1) Données de 2019 — la réalité de 2025 peut avoir changé (nouvelles lignes TC, BRT). 2) Variable cible construite subjectivement (choix des 7 indicateurs et du seuil au 65e percentile). 3) Données d'enquête auto-déclarées — biais de perception possible. 4) Pas de données temps réel.

**Q23 : Comment interpréter la feature importance ?**
> La feature importance RF/GB mesure combien chaque feature réduit l'impureté des noeuds (critère Gini ou variance) en moyenne sur tous les arbres. Une importance élevée signifie que cette feature est souvent utilisée pour les divisions les plus discriminantes. M66 (distance TC) est la plus importante → confirme l'hypothèse que la proximitéTC est le principal déterminant d'inaccessibilité.

**Q24 : Pourquoi Gradient Boosting surpasse Random Forest sur vos données ?**
> Gradient Boosting entraîne les arbres séquentiellement, chaque arbre corrigeant les erreurs du précédent via la descente de gradient. Random Forest entraîne en parallèle avec bagging. Sur données déséquilibrées avec patterns complexes, GB converge vers de meilleures solutions au prix d'un entraînement plus lent et d'un risque d'overfitting plus élevé.

**Q25 : Comment avez-vous évité le surapprentissage (overfitting) ?**
> 1) `max_depth=10` pour Random Forest (limite la complexité des arbres). 2) Cross-validation 5 folds (évalue la généralisation). 3) SMOTE uniquement sur l'ensemble d'entraînement (jamais sur le test). 4) `class_weight='balanced'` pour penaliser les erreurs sur la classe minoritaire.

### 13.5 SQL & Data

**Q26 : Si vous utilisiez une BDD, quelle requête donnez-vous les zones les plus à risque ?**
```sql
SELECT zone, AVG(prob_risque) as risque_moyen,
       COUNT(*) as nb_menages,
       SUM(CASE WHEN niveau_risque = 'ÉLEVÉ' THEN 1 ELSE 0 END) as menages_eleves
FROM zones_risque
GROUP BY zone
ORDER BY risque_moyen DESC
LIMIT 10;
```

**Q27 : Comment modéliseriez-vous vos données dans un Data Warehouse ?**
> Schéma en étoile (Star Schema) :
> - `FAIT_DEPLACEMENT` (durée, coût, distance, date_id, individu_id, zone_id, mode_id)
> - `DIM_INDIVIDU` (âge, sexe, niveau_instruction, actif, etudiant)
> - `DIM_ZONE` (nom, coordinates, niveau_risque)
> - `DIM_MODE` (nom, catégorie, icon)
> - `DIM_TEMPS` (date, heure, jour_semaine, mois, année)

**Q28 : Quelle est la différence entre OLTP et OLAP ?**
> OLTP (Online Transaction Processing) : optimisé pour opérations CRUD fréquentes, faible latence, ex: système de réservation. OLAP (Online Analytical Processing) : optimisé pour agrégations complexes sur grandes quantités de données, colonnes compressées, ex: notre analyse EMD. Notre projet est 100% OLAP.

### 13.6 Sécurité

**Q29 : Quelles sont les failles de sécurité de votre authentification ?**
> 1) Tokens Base64 sans signature cryptographique (falsifiables côté client). 2) Mots de passe en clair dans le code source (hardcodés). 3) Pas de HTTPS. 4) Pas de protection CSRF. 5) Pas de rate limiting sur les tentatives de connexion.

> **En production :** JWT signé RS256, mots de passe hashés bcrypt en BDD, HTTPS obligatoire, CSRF token, rate limiting (ex: max 5 tentatives / 15 minutes).

**Q30 : Comment protégeriez-vous l'API contre les injections ?**
> Pydantic valide et type-caste toutes les entrées (pas de string SQL possible). Les modèles ML acceptent uniquement des vecteurs numériques. Pas de construction dynamique de requêtes SQL. En production : WAF (Web Application Firewall), OWASP headers.

**Q31 : Le stockage des mots de passe dans auth.js est-il acceptable ?**
> Non, c'est inacceptable en production. C'est acceptable uniquement pour un PFE démonstratif. En production : mots de passe hashés avec bcrypt (factor 12) stockés en BDD, jamais dans le code source, jamais en clair.

### 13.7 Performance

**Q32 : Comment avez-vous optimisé les performances du frontend ?**
> 1) `React.memo` implicite via Framer Motion pour les animations. 2) Pagination des listes longues (sites anomalies filtrables). 3) `useEffect` avec dependencies array pour éviter les re-renders inutiles. 4) Images et vidéos dans `public/` pour cache navigateur. 5) `build/` pour production (minification, tree-shaking).

**Q33 : Pourquoi le CSV anomalies est-il chargé en RAM au démarrage ?**
> Le fichier fait 14 Mo. Une lecture disque à chaque requête prendrait 800-1200ms. Le chargement en RAM au démarrage (une seule fois) réduit les requêtes suivantes à < 10ms (lecture mémoire). Compromis : 14 Mo de RAM occupée en permanence — acceptable sur un serveur moderne (8-16 GB RAM).

**Q34 : Quels seraient les goulots d'étranglement en production ?**
> 1) Chargement des modèles PKL (500ms au démarrage). 2) CSV 14 Mo en RAM (pas scalable à plusieurs instances). 3) Recharts recalcule les SVG à chaque render. 4) Pas de cache HTTP (Cache-Control headers absents). Solution : Redis pour cache, PostgreSQL pour anomalies, Nginx pour compression gzip.

### 13.8 Power BI / BI

**Q35 : Quels KPIs auriez-vous ajouté dans un dashboard Power BI ?**
> 1) Taux d'inaccessibilité par commune (choroplèthe). 2) Évolution mensuelle des anomalies (time series). 3) Matrice segment × mode (heatmap). 4) ROI des interventions (avant/après). 5) Indice de mobilité par zone (composite). 6) Part modale cible vs. réalisée.

**Q36 : Quelle serait la requête DAX pour calculer le taux d'anomalie ?**
```dax
Taux Anomalie =
DIVIDE(
    CALCULATE(COUNTROWS(Anomalies), Anomalies[is_anomaly] = 1),
    COUNTROWS(Anomalies),
    0
) * 100
```

**Q37 : Comment connecteriez-vous Power BI à votre API FastAPI ?**
> Via le connecteur "Web" de Power BI qui appelle les endpoints REST et parse le JSON. Ou via un connecteur Python dans Power BI Desktop qui exécute un script pandas. Pour le temps réel : streaming dataset Power BI + push API.

### 13.9 Questions avancées

**Q38 : Comment avez-vous validé que votre modèle est éthique (pas de biais) ?**
> Point d'amélioration reconnu. Les données EMD peuvent contenir des biais sociaux (les zones plus pauvres sont sur-représentées dans les zones à risque). En production : audit Fairlearn pour détecter les disparités par groupe démographique (sexe, niveau d'instruction).

**Q39 : Qu'est-ce que XAI et comment avez-vous implémenté la transparence du modèle ?**
> XAI = eXplainable AI. Implémenté via : 1) Feature importance (importance globale des features). 2) Page MlInsights dédiée à l'audit du modèle (métriques, top features, audit de généralisation). Pour aller plus loin : SHAP values pour expliquer chaque prédiction individuelle (déjà importé dans ml_inaccessibilite_v2.py mais optionnel).

**Q40 : Pourquoi avez-vous choisi un seuil au 65e percentile pour la variable cible ?**
> Empiriquement : le seuil maximise le F1-score en cross-validation. Métier : le 65e percentile identifie ~35% des ménages comme à risque — proportion cohérente avec les estimations du CETUD sur l'inaccessibilité à Dakar. Trop bas → trop de faux positifs (alertes non pertinentes). Trop haut → manque les zones vraiment problématiques.

**Q41 : Comment avez-vous géré les données temporelles dans l'analyse de trafic ?**
> Extraction des features temporelles depuis les timestamps : heure de la journée, jour de la semaine, indicateur période de pointe (7-9h, 17-19h). Ces features sont passées aux algorithmes de détection d'anomalies pour distinguer une anomalie structurelle (toujours anormale) d'une variation normale (fort trafic le vendredi soir).

**Q42 : Quelle est la différence entre précision et rappel ? Lequel prioriser ?**
> Précision = parmi toutes les zones identifiées à risque, combien le sont vraiment. Rappel = parmi toutes les vraies zones à risque, combien ont été détectées. Pour l'inaccessibilité : **le rappel est prioritaire** — mieux vaut alerter sur une zone qui n'est pas vraiment à risque (faux positif acceptable) que manquer une zone réellement dangereuse (faux négatif coûteux pour les habitants).

**Q43 : Comment avez-vous traité les variables catégorielles pour les modèles ?**
> `LabelEncoder` pour les variables ordinales (niveau d'instruction: Aucun=1, Primaire=2, Secondaire=3, Supérieur=4). Pour les variables nominales (type de logement, zone géographique) : LabelEncoder avec mapping sauvegardé dans `inacc_encoders_mappings.json` pour garantir la cohérence entre entraînement et prédiction.

**Q44 : Pourquoi normaliser les features avant K-Means ?**
> K-Means utilise la distance euclidienne. Sans normalisation, une feature avec grande variance (revenu: 0-500 000 FCFA) dominerait totalement les features à faible variance (sexe: 1-2). StandardScaler ramène toutes les features à μ=0, σ=1 pour qu'elles contribuent équitablement au calcul de distance.

**Q45 : Comment interprétez-vous le silhouette coefficient de 0.31 ?**
> Le silhouette coefficient varie de -1 à 1. 0.31 indique une séparation modérée entre clusters — acceptable pour des données sociodémographiques complexes où les profils se chevauchent naturellement. Un score de 0.7+ serait attendu pour des données bien séparées (ex: données synthétiques). Pour des enquêtes ménages, 0.3-0.4 est considéré comme bon.

**Q46 : Si vous aviez à refaire le projet, qu'est-ce que vous changeriez ?**
> 1) Base de données PostgreSQL dès le début au lieu des CSV. 2) Tests unitaires pytest dès le démarrage (TDD). 3) Docker Compose pour la reproductibilité (un seul `docker-compose up`). 4) Séparation des scripts ML d'entraînement et de serving. 5) MLflow pour le tracking des expériences ML (comparaison des runs).

**Q47 : Comment garantissez-vous la reproductibilité des modèles ?**
> `random_state=42` sur tous les algorithmes stochastiques (K-Means, RF, GB, SMOTE). versions fixées dans requirements.txt (`scikit-learn==1.6.1`, `numpy==1.26.4`). Les modèles entraînés sont sauvegardés avec joblib — le même modèle exact est utilisé en production. Pour aller plus loin : environnement virtuel + Docker pour les dépendances système.

**Q48 : Quelle est la différence entre un modèle d'ensemble et un modèle simple ?**
> Un modèle simple (ex: régression logistique) prend une décision unique. Un modèle d'ensemble combine les prédictions de plusieurs modèles : Bagging (RF — arbres parallèles indépendants), Boosting (GB — arbres séquentiels correctifs), Stacking (méta-modèle sur les prédictions de base). Les ensembles réduisent la variance (bagging) ou le biais (boosting).

**Q49 : Comment déployeriez-vous votre application en production ?**
> 1) Containerisation Docker (Dockerfile backend + frontend). 2) Docker Compose ou Kubernetes. 3) Nginx comme reverse proxy (SSL, compression, routing). 4) PostgreSQL + Redis en services séparés. 5) CI/CD GitHub Actions (tests automatiques → build → deploy). 6) Monitoring : Prometheus + Grafana. 7) Hébergement : AWS EC2 ou OVH (contexte Sénégal : Orange SN Cloud).

**Q50 : Votre système peut-il fonctionner hors ligne ?**
> Partiellement. Le frontend React peut être servi statiquement depuis `build/`. La page EvolutionTemporelle fonctionne sans API (données dans `evolutionData.js`). Les pages qui nécessitent l'API (recommandation, zones risque, anomalies) affichent des messages d'erreur si l'API est indisponible. Pour un fonctionnement offline complet : Service Worker + IndexedDB pour cache des réponses API.

---

## 14. POINTS FORTS DU PROJET

### 14.1 Innovations techniques

| Point fort | Détail | Valorisation jury |
|------------|--------|-------------------|
| **Consensus d'anomalies** | 3 algorithmes combinés (Z-Score + IF + LOF) avec poids optimisés | Robustesse > tout algorithme seul |
| **Variable cible composite** | 7 indicateurs terrain → score d'inaccessibilité | Ancrage métier fort (pas de magic number) |
| **SMOTE sur données déséquilibrées** | Gestion des classes rares (5 zones ÉLEVÉ sur 41) | Bonne pratique ML ignorée par beaucoup |
| **RBAC multi-rôles** | 2 rôles avec permissions différentes (planificateur vs. exploitation) | Conception orientée utilisateur |
| **Dark/Light mode** | ThemeProvider + CSS variables + injection dynamique | UX professionnelle |
| **Contrôle de saisie contextualisé** | Champs masqués selon âge (< 18 ans) | Qualité UX et cohérence données |
| **Analyse temporelle** | Évolution 2010–2023 avec données simulées contextualisées | Vision stratégique PFE |

### 14.2 Bonnes pratiques

- ✅ Validation Pydantic côté API (pas de confiance aveugle aux inputs)
- ✅ `random_state=42` partout pour reproductibilité
- ✅ Cross-validation stratifiée (pas de simple train/test split)
- ✅ Séparation entraînement/inférence (scripts ML séparés de main.py)
- ✅ Cache mémoire pour le dataset 14 Mo
- ✅ État React centralisé dans App.js (single source of truth)
- ✅ Composants réutilisables (ThemeToggle, LoadingScreen, ProtectedRoute)
- ✅ Gestion des erreurs API côté frontend

### 14.3 Ce que le jury appréciera

1. **La richesse des données réelles** — EMD CETUD 2019, vraie enquête officielle
2. **La double dimension** — système citoyen (inclusif) + système décideur (stratégique)
3. **La transparence du modèle** — page MlInsights dédiée à l'auditabilité
4. **L'analyse prospective** — données simulées 2010-2023 avec recommandations
5. **La qualité UX** — Dark/Light mode, animations Framer Motion, cartes interactives

---

## 15. LIMITES ET POINTS CRITIQUES

### 15.1 ⚠️ Points que le jury pourrait critiquer

| Limite | Réponse défensive |
|--------|-------------------|
| **Pas de base de données** | "Données d'enquête statique, fichiers plats sont le standard CETUD. BDD = roadmap v2." |
| **Auth simulée côté client** | "Suffisant pour PFE démonstratif. En prod : JWT RS256 + Keycloak." |
| **Données 2019 (5 ans)** | "Seule enquête ménage disponible publiquement au Sénégal. EMD 2024 en cours selon CETUD." |
| **Données temporelles simulées** | "Clairement annotées 'données simulées' dans l'UI. Objectif pédagogique d'analyse de tendance." |
| **Pas de tests automatisés** | "Contrainte de temps PFE. Tests manuels Swagger. Pytest en roadmap." |
| **Pas de Docker** | "Stack documentée dans README. Docker en roadmap de déploiement." |
| **CORS uniquement localhost** | "Configuration développement. En prod : domaine HTTPS spécifique." |
| **Silhouette 0.31** | "Acceptable pour données sociodémographiques complexes avec chevauchements naturels." |

### 15.2 Limites métier

- Les recommandations sont basées sur des données de 2019 — comportements de mobilité changent
- Pas de données GPS temps réel (pas d'intégration DAKAR DEM DIKK API)
- Les zones de risque ne tiennent pas compte des projets d'infrastructure en cours (BRT, TER)
- La segmentation en 5 clusters est une simplification — la réalité est plus nuancée

### 15.3 Limites techniques

- Monolithique (tout dans main.py) — difficile à faire évoluer
- Pas de gestion des versions de modèles (quel modèle a été entraîné quand ?)
- Pas de monitoring des prédictions en production (drift des données)
- Frontend non testé sur mobile (responsive limité)

---

## 16. ROADMAP FUTURE

### 16.1 Court terme (3-6 mois)

| Amélioration | Impact | Effort |
|-------------|--------|--------|
| Base de données PostgreSQL | Haute | Moyen |
| Tests unitaires pytest + Jest | Haute | Faible |
| Docker Compose | Haute | Faible |
| Auth JWT + bcrypt | Haute | Moyen |
| CI/CD GitHub Actions | Moyen | Moyen |

### 16.2 Moyen terme (6-18 mois)

| Amélioration | Impact | Effort |
|-------------|--------|--------|
| **Données temps réel DAKAR DEM DIKK** | Très haute | Élevé |
| **MLflow tracking** | Moyen | Faible |
| **Réentraînement automatique** | Haute | Élevé |
| **Application mobile React Native** | Haute | Élevé |
| **SHAP values individuelles** | Moyen | Faible |
| **Intégration EMD 2024** | Très haute | Moyen |

### 16.3 Long terme — Vision 2030

```
Transport Dakar 3.0
│
├── IoT & Temps réel
│   ├── Capteurs GPS sur bus DAKAR DEM DIKK → flux temps réel
│   ├── Données météo (saison des pluies → impact inaccessibilité)
│   └── Caméras de comptage → Computer Vision (YOLO v9)
│
├── Deep Learning
│   ├── LSTM pour prédiction de trafic (séries temporelles)
│   ├── GNN (Graph Neural Networks) → réseau de transport = graphe
│   └── Transformers pour analyse de sentiment (tweets mobilité)
│
├── Optimisation
│   ├── Algorithme génétique pour optimisation des lignes TC
│   ├── Reinforcement Learning pour fréquence des bus
│   └── Simulation agent-based (MATSim) pour scénarios d'infrastructure
│
└── IA Générative
    ├── LLM pour chatbot d'aide au déplacement (en Wolof)
    ├── Génération automatique de rapports pour CETUD
    └── RAG sur documents de politique de mobilité
```

---

## 17. RÉSUMÉ EXPRESS — FICHE DE RÉVISION

> À mémoriser la veille de la soutenance

---

### 🏗️ ARCHITECTURE (30 secondes)

```
XLS/CSV CETUD 2019 → Python ETL → 4 modèles ML → FastAPI :8000
        ↑ Features engineering              ↓ JSON REST
        ↑ SMOTE + StandardScaler     React :3000 → 7 pages décideurs
                                                  + 2 pages citoyens
```

---

### 📊 TECHNOLOGIES

| Couche | Tech | Version |
|--------|------|---------|
| Frontend | React.js | 18.x |
| Charts | Recharts | — |
| Animations | Framer Motion | — |
| Maps | Leaflet | — |
| Backend | FastAPI + uvicorn | 0.111 + 0.30 |
| Validation | Pydantic | 2.7 |
| ML | scikit-learn | 1.6.1 |
| Serialisation | joblib | 1.4.2 |
| Data | Pandas | 2.2.2 |

---

### 🤖 MODÈLES ML

| Modèle | Objectif | Accuracy/Score |
|--------|----------|---------------|
| K-Means (k=5) | Segmentation usagers | Silhouette ≈ 0.31 |
| Random Forest | Mode de transport | Accuracy 90.6% |
| Gradient Boosting | Inaccessibilité zones | ROC AUC 0.921 |
| Isolation Forest | Anomalies trafic | Consensus ≥ 0.6 |
| LOF | Anomalies densité | Poids 0.35 |
| Z-Score | Anomalies univariées | Poids 0.25 |
| DBSCAN | Hotspots géo | eps=500m |

---

### 🔗 API ENDPOINTS (9)

```
POST /recommander              → mode transport citoyen
GET  /zones-risque             → 41 zones
GET  /zones-risque/resume      → stats agrégées
GET  /api/anomalies/summary    → KPIs trafic
GET  /api/anomalies/sites      → 49 sites
GET  /api/anomalies/sites/{id} → drill-down
GET  /api/segmentation/profils → 5 segments
POST /predict-inaccessibility  → score risque
GET  /api/ml/metrics           → Accuracy, AUC, F1
GET  /api/ml/features-importance → top features
```

---

### 📈 KPIs CLÉS (à citer)

| KPI | Valeur |
|-----|--------|
| Individus EMD | 37 248 |
| Ménages enquêtés | 4 521 |
| Sites de comptage trafic | 49 |
| Observations trafic | 775 480 |
| Anomalies détectées | 316 |
| Sites à risque | 30 / 49 (61%) |
| Zones analysées | 41 |
| Zones ÉLEVÉ | 5 |
| Zones MODÉRÉ | 14 |
| Accord modèles (IF+LOF+Z) | 90.6% |
| Précision modèle inacc. | 90.6% |
| ROC AUC | 0.921 |
| F1-Score | 88.3% |
| Clusters K-Means | 5 |

---

### 👥 UTILISATEURS & RÔLES

| Rôle | Login | Accès |
|------|-------|-------|
| Citoyen | — | WelcomePage + FormPage |
| Directeur Planification | `planification` | Tout (y compris ML Insights + Évolution) |
| Chef d'Exploitation | `exploitation` | Sans ML Insights |

---

### ⚡ RÉPONSES RAPIDES

**"Pourquoi FastAPI ?"** → Validation Pydantic + Swagger auto + async  
**"Pourquoi K-Means ?"** → Non supervisé, interprétable, silhouette validé  
**"Pourquoi 3 algos anomalies ?"** → Consensus réduit faux positifs de 35%  
**"Pourquoi seuil 65e percentile ?"** → Maximise F1 en cross-validation  
**"Sécurité ?"** → PFE = Base64, production = JWT RS256 + bcrypt  
**"Données récentes ?"** → EMD 2019 seule disponible publiquement au Sénégal  
**"Scalabilité ?"** → Actuellement monolithique, roadmap : Docker + PostgreSQL + Redis  
**"Tests ?"** → Tests manuels Swagger + contrôles Pydantic, roadmap : pytest  

---

*© 2025 — Ibtihel Abdellaoui — PFE Transport Dakar — ESPRIT / CETUD*  
*Guide généré le : Juin 2025*
