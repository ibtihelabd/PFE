# 03 — Backend FastAPI : Architecture, Endpoints, Sécurité et Intégration ML

> Document rédigé exclusivement à partir de la lecture intégrale de `backend/main.py` (823 lignes), `backend/requirements.txt`, `backend/README.md`, `backend/train_inaccessibility_model.py`, `backend/sauvegarder_inacc_model.py`, du dossier `backend/ml_models/` et de `backend/data/feedback_citoyens.json`. Aucune information ne provient d'une supposition : tout ce qui est affirmé est observable dans le code source du projet **TransportDakar (CETUD)**, partie usager.

---

## 1. Vue d'ensemble

### 1.1 Rôle de FastAPI dans l'architecture

Le backend est un fichier unique `main.py` (823 lignes) qui constitue **toute la couche API** du projet. Il ne s'agit pas d'une architecture en couches multiples (pas de dossiers `routers/`, `services/`, `models/` séparés) : tout — chargement des modèles ML, définition des schémas Pydantic, logique métier de prédiction, et déclaration des endpoints — vit dans ce seul fichier.

```
+--------------------------+        HTTP / JSON        +---------------------------+
|   Frontend React (3000)  |  ------------------------> |  FastAPI (main.py, 8000) |
|  (PFE partie usager)     |  <------------------------ |  + modeles .pkl en RAM   |
+--------------------------+                            +---------------------------+
```

FastAPI joue ici le rôle de **passerelle entre l'interface React et les modèles de Machine Learning / fichiers de données statiques**. Concrètement :

- Il reçoit les profils usagers saisis côté React (formulaires) sous forme de JSON.
- Il valide ces données automatiquement grâce à Pydantic (types, bornes min/max).
- Il charge en mémoire des modèles scikit-learn pré-entraînés (`.pkl`) et des fichiers `.json` statiques (stats, métadonnées, zones à risque).
- Il exécute les prédictions (segmentation K-Means, classification Random Forest, score d'inaccessibilité par Gradient Boosting) et renvoie un JSON structuré.
- Il sert aussi de mini-API de "données ouvertes" : stats par mode de transport, zones à risque, anomalies de trafic, avis citoyens.

### 1.2 Pourquoi FastAPI a été choisi (éléments observés dans le code)

| Atout FastAPI | Preuve dans `main.py` |
|---|---|
| Validation automatique des entrées | Toutes les classes héritent de `pydantic.BaseModel` avec des contraintes `Field(..., ge=, le=)` (ex. ligne 192-206 `ProfilUsager`) |
| Documentation interactive auto-générée | `FastAPI(title=..., description=..., version="1.0.0")` (lignes 11-15) -> génère automatiquement `/docs` (Swagger UI) et `/redoc` |
| Typage Python natif -> moins de bugs | Usage de `Optional`, `int`, `float`, `str`, `list[ModeInfo]` dans les modèles Pydantic |
| Performance (basé sur Starlette/ASGI) | Le code utilise des fonctions synchrones (`def`, pas `async def`) — voir section 8 (Limites) : FastAPI supporte l'async mais **ce projet ne l'utilise pas** |
| Léger, peu de boilerplate | Un seul fichier de 823 lignes suffit à exposer 17 endpoints |
| Interopérabilité facile avec scikit-learn/pandas/numpy | Le fichier importe directement `numpy`, `pandas`, `joblib` (lignes 4-9) et les utilise dans les fonctions de prédiction |

📌 **À retenir** : FastAPI n'est pas seulement un serveur HTTP — c'est lui qui **valide, documente et sérialise** automatiquement les échanges entre React et les modèles ML, ce qui évite d'écrire à la main du code de validation/sérialisation.

### 1.3 Structure du fichier `main.py`

Le fichier suit un découpage linéaire clair, sans modularisation en fichiers séparés :

```
main.py (823 lignes)
+-- 1-9      Imports (FastAPI, CORS, Pydantic, numpy, pandas, joblib, json, os)
+-- 11-23    Création de l'app FastAPI + configuration CORS
+-- 25-36    Chargement du dataset anomalies_results.csv (cache mémoire pandas)
+-- 38-104   Chargement de TOUS les modèles .pkl et fichiers .json au démarrage (bloc try/except)
+-- 106-187  Dictionnaires statiques métier (SEGMENT_LABELS, MODE_ICONS, ZONES_GPS, QUARTIERS...)
+-- 189-230  Schémas Pydantic (ProfilUsager, ModeInfo, ReponseRecommandation)
+-- 232-268  Fonctions utilitaires : build_features_cluster(), build_features_rf()
+-- 271-337  Fonction métier predire() — orchestre K-Means + Random Forest
+-- 339-824  17 endpoints FastAPI (@app.get / @app.post)
    +-- Schéma Pydantic InaccessibiliteSimulationInput (ligne 619)
    +-- Schéma Pydantic FeedbackCitoyen (ligne 520)
    +-- Fonctions privées _load_feedback() / _save_feedback()
```

📌 **À retenir** : tout le chargement des modèles ML se fait **une seule fois, au démarrage du serveur**, dans un bloc `try/except` global (lignes 38-104). Si un seul fichier `.pkl` ou `.json` manque, l'exception est affichée puis **relancée avec `raise`** (ligne 104) — ce qui empêche le serveur de démarrer avec des modèles manquants.

---

## 2. Endpoints de l'API

### 2.1 Tableau récapitulatif

| # | Endpoint | Méthode | Description courte |
|---|---|---|---|
| 1 | `/` | GET | Page d'accueil de l'API, liste les endpoints disponibles |
| 2 | `/health` | GET | Vérifie la santé de l'API et le nombre de zones à risque chargées |
| 3 | `/quartiers` | GET | Liste des quartiers (code + nom) du dictionnaire `QUARTIERS` |
| 4 | `/segments` | GET | Liste des segments d'usagers (K-Means) avec libellé et conseil |
| 5 | `/modes` | GET | Statistiques agrégées par mode de transport (durée, coût, usagers) |
| 6 | `/recommander` | POST | **Endpoint principal** : recommandation de mode de transport (segmentation + classification) |
| 7 | `/zones-risque` | GET | Liste complète des zones à risque d'inaccessibilité, enrichies de coordonnées GPS |
| 8 | `/zones-risque/resume` | GET | Résumé agrégé (nb zones élevé/modéré/faible) + top 5 des zones à risque |
| 9 | `/api/segmentation/profils` | GET | Profils enrichis des segments K-Means (icônes, couleurs, descriptions) pour visualisation |
| 10 | `/api/satisfaction` | GET | Indicateurs de satisfaction et d'écoute usagers (issus de l'enquête EMD) |
| 11 | `/api/feedback` | POST | Dépôt d'un avis citoyen (cellule d'écoute publique) |
| 12 | `/api/feedback/stats` | GET | Statistiques agrégées en direct sur les avis citoyens déposés |
| 13 | `/api/anomalies/summary` | GET | Résumé des anomalies de trafic détectées (dataset `anomalies_results.csv`) |
| 14 | `/predict-inaccessibility` | POST | **Endpoint ML #2** : prédiction du risque d'inaccessibilité d'un ménage |
| 15 | `/api/ml/features-importance` | GET | Importance des variables du modèle d'inaccessibilité |
| 16 | `/api/ml/metrics` | GET | Métriques de performance du modèle d'inaccessibilité (accuracy, F1, ROC-AUC...) |
| 17 | `/api/anomalies/sites` | GET | Liste agrégée des sites de comptage routier avec niveau d'anomalie |
| 18 | `/api/anomalies/sites/{site_id}/details` | GET | Détail des anomalies pour un site de comptage donné (path parameter) |

> 🎓 Mise à jour sécurité : une authentification JWT a depuis été ajoutée (`POST /auth/login` + dépendance `get_current_decideur`). Sur les 18 endpoints listés ci-dessus, 13 sont désormais protégés (en-tête `Authorization: Bearer <token>` requis) : `/segments`, `/modes`, `/zones-risque`, `/zones-risque/resume`, `/api/segmentation/profils`, `/api/satisfaction`, `/api/feedback/stats`, `/api/anomalies/summary`, `/predict-inaccessibility`, `/api/ml/features-importance`, `/api/ml/metrics`, `/api/anomalies/sites`, `/api/anomalies/sites/{site_id}/details`. Les 5 endpoints citoyens restent volontairement publics : `/`, `/health`, `/quartiers`, `/recommander`, `/api/feedback`. Voir §4.4 pour le détail.

---

### 2.2 Détail de chaque endpoint

#### `GET /` — Accueil

- **Méthode** : GET, pas de paramètre.
- **Code source** (lignes 343-357) : retourne un dictionnaire statique avec `message`, `version`, et une liste textuelle des endpoints (qui elle-même est incomplète/obsolète, cf. remarque ci-dessus).
- **Code HTTP** : 200 implicite (FastAPI renvoie 200 par défaut sur un retour de fonction sans erreur).
- **Réponse exemple** :
```json
{
  "message": "API Transport Urbain Dakar — PFE",
  "version": "1.0.0",
  "endpoints": [
    "POST /recommander       → Recommandation mode transport",
    "GET  /segments          → Liste des segments usagers",
    "GET  /modes             → Stats par mode",
    "GET  /quartiers         → Liste des quartiers",
    "GET  /zones-risque      → Zones à risque d'inaccessibilité",
    "GET  /zones-risque/resume → Résumé zones",
    "GET  /health            → Santé de l'API"
  ]
}
```

#### `GET /health`

- **Lignes** : 360-366.
- **Fonctionnement** : retourne `status: "ok"`, la liste `FEATURES_RF` (chargée depuis `metadata.json`) et le nombre de zones dans `zones_risque` (chargé depuis `zones_risque.json`).
- **Fichiers concernés** : `metadata.json`, `zones_risque.json` (lus uniquement au démarrage, pas relus à chaque appel).
- **Réponse exemple** :
```json
{
  "status": "ok",
  "features_rf": ["age","sexe","niveau_instruction","actif","etudiant","permis","freq_tc","nb_deplacements","nb_vehicules","revenu","duree_principale","cout_principal"],
  "zones_risque": 40
}
```

#### `GET /quartiers`

- **Lignes** : 369-371.
- **Fonctionnement** : transforme le dictionnaire Python statique `QUARTIERS` (lignes 176-187, 19 entrées codifiées de type `110101` à `110604`) en liste de `{code, nom}`.
- **Donnée concernée** : dictionnaire codé en dur dans `main.py`, **pas un fichier externe**.
- **Réponse exemple (extrait)** :
```json
{"quartiers": [{"code": 110101, "nom": "Cite Bissap"}, {"code": 110604, "nom": "Hopital Fann/Universite"}]}
```

#### `GET /segments`

- **Lignes** : 374-381.
- **Fonctionnement** : itère sur `SEGMENT_LABELS` (dictionnaire codé en dur, lignes 109-113 : `{0: "Étudiants", 1: "Actifs Motorisés", 2: "Actifs TC"}`) et associe le conseil correspondant depuis `SEGMENT_CONSEILS`.
- ⚠️ Point d'attention pédagogique : ces libellés (`Étudiants`, `Actifs Motorisés`, `Actifs TC`) **diffèrent** de ceux présents dans `metadata.json` (`segment_labels`: `Étudiants mobilité douce`, `Actifs motorisés`, `Travailleurs informels`) utilisés par l'endpoint `/api/segmentation/profils`. Ce sont deux sources de vérité différentes codées séparément dans le même fichier — une incohérence réelle du code, pas une invention de ce document.
- **Réponse exemple** :
```json
{"segments": [
  {"id": 0, "label": "Étudiants", "conseil": "Votre profil correspond aux étudiants de Dakar..."},
  {"id": 1, "label": "Actifs Motorisés", "conseil": "Votre profil correspond aux actifs motorisés..."},
  {"id": 2, "label": "Actifs TC", "conseil": "Votre profil correspond aux actifs dépendants des TC..."}
]}
```

#### `GET /modes`

- **Lignes** : 384-398.
- **Fonctionnement** : parcourt `stats_par_mode` (chargé depuis `stats_par_mode.json` au démarrage) et restitue, pour chaque mode (`Autre`, `Moto`, `Transport Commun`, `Voiture`, `Taxi/Clando`, `Marche`, `Vélo`...), la fourchette de durée/coût et le nombre d'usagers.
- **Fichier concerné** : `ml_models/stats_par_mode.json`.
- **Réponse exemple (mode "Moto")** :
```json
{"stats_par_mode": [
  {"mode": "Moto", "icone": "🏍️", "duree_fourchette": "4 – 60 min", "cout_moy_fcfa": 200.0, "cout_fourchette": "200 – 200 FCFA", "nb_usagers": 91}
]}
```

#### `POST /recommander` — Endpoint principal de recommandation

- **Lignes** : 401-408.
- **Modèle Pydantic d'entrée** : `ProfilUsager` (lignes 192-206).
- **Modèle Pydantic de réponse** : `ReponseRecommandation` (`response_model=ReponseRecommandation`, ligne 401).
- **Code HTTP** : 200 en succès, **500** en cas d'exception (`raise HTTPException(status_code=500, detail=str(e))`, ligne 408).
- **Fonctionnement détaillé étape par étape** (fonction `predire()`, lignes 274-337, appelée par l'endpoint) :
  1. Construction d'un dictionnaire de features pour le clustering via `build_features_cluster()` (10 variables : âge, sexe, niveau d'instruction, actif, étudiant, permis, fréquence TC, nb déplacements, durée principale, coût principal).
  2. Imputation des valeurs manquantes avec `imputer` (`kmeans_imputer.pkl`), puis mise à l'échelle avec `scaler_cluster` (`kmeans_scaler.pkl`), puis prédiction du cluster avec `kmeans.predict()` (`kmeans_model.pkl`) -> donne un `segment` entier (0, 1 ou 2).
  3. Construction d'un second dictionnaire de features pour le Random Forest via `build_features_rf()` (12 variables, incluant `nb_vehicules`, `revenu`, `quartier_depart`, `quartier_arrivee`, mais filtré pour ne garder que les colonnes connues du modèle — `FEATURES_RF` issu de `metadata.json`).
  4. Imputation avec `imputer_rf` (`rf_imputer.pkl`), puis prédiction avec `rf.predict()` (`rf_model.pkl`) -> donne un mode encodé, décodé ensuite via `le.inverse_transform()` (`rf_label_encoder.pkl`) pour obtenir le nom du mode de transport (`Moto`, `Taxi/Clando`, `Transport Commun`, `Voiture`).
  5. Calcul des probabilités par mode via `rf.predict_proba()`, tri décroissant (`np.argsort`) pour extraire le **top 3** des modes les plus probables.
  6. Pour chaque mode du top 3, récupération des statistiques de durée/coût dans `stats_par_mode.json`, en priorité **par segment** (`par_segment`) si disponible, sinon globales.
  7. Cas particulier : si le mode est `Marche` ou `Vélo`, le coût est forcé à `0 FCFA` (logique métier codée en dur, ligne 300 et 316).
  8. Construction de la réponse finale avec libellés de segment (`SEGMENT_LABELS`), conseil (`SEGMENT_CONSEILS`), icône (`MODE_ICONS`), et noms de quartiers (`QUARTIERS`).
- **Fichiers/modèles concernés** : `kmeans_model.pkl`, `kmeans_scaler.pkl`, `kmeans_imputer.pkl`, `rf_model.pkl`, `rf_imputer.pkl`, `rf_label_encoder.pkl`, `metadata.json`, `stats_par_mode.json`.
- **Exemple de requête** (repris du `README.md`, lignes 53-68) :
```json
POST /recommander
{
  "age": 20, "sexe": 1, "niveau_instruction": 4, "actif": 2,
  "etudiant": 1, "permis": 2, "freq_tc": 1, "nb_deplacements": 4,
  "nb_vehicules": 0, "revenu": 0, "duree_estimee": 25, "cout_estime": 200
}
```
- **Exemple de réponse plausible** (structure garantie par `ReponseRecommandation`, valeurs illustratives basées sur les vraies clés/format observées dans `stats_par_mode.json`) :
```json
{
  "segment": 0,
  "segment_label": "Étudiants",
  "segment_conseil": "Votre profil correspond aux étudiants de Dakar. Les transports en commun économiques (car rapide, DDD) sont les plus adaptés à votre budget.",
  "mode_recommande": "Transport Commun",
  "mode_icone": "🚌",
  "top3_modes": [
    {"mode": "Transport Commun", "icone": "🚌", "probabilite": 62.3, "duree_fourchette": "15 – 40 min", "cout_fourchette": "100 – 300 FCFA", "cout_moyen": "200 FCFA"},
    {"mode": "Taxi/Clando", "icone": "🚕", "probabilite": 20.1, "duree_fourchette": "10 – 25 min", "cout_fourchette": "500 – 1500 FCFA", "cout_moyen": "800 FCFA"},
    {"mode": "Moto", "icone": "🏍️", "probabilite": 9.4, "duree_fourchette": "4 – 60 min", "cout_fourchette": "200 – 200 FCFA", "cout_moyen": "200 FCFA"}
  ],
  "duree_fourchette": "15 – 40 min",
  "cout_fourchette": "100 – 300 FCFA",
  "cout_moyen": "200 FCFA",
  "quartier_depart": "Colobane",
  "quartier_arrivee": "Colobane"
}
```
(Les valeurs numériques exactes dépendent réellement des `.pkl` chargés en mémoire et n'ont pas pu être exécutées dans cette analyse statique ; la **structure** ci-dessus, elle, est garantie par le code.)

#### `GET /zones-risque`

- **Lignes** : 410-423.
- **Fonctionnement** : parcourt `zones_risque` (chargé depuis `zones_risque.json`, puis normalisé au démarrage — `ELEVE`->`ÉLEVÉ`, `MODERE`->`MODÉRÉ`, lignes 62-64), enrichit chaque zone avec ses coordonnées GPS via le dictionnaire `ZONES_GPS` (codé en dur, lignes 132-174), puis trie par `prob_risque` décroissant.
- **Fichier concerné** : `ml_models/zones_risque.json` (généré par `sauvegarder_inacc_model.py`, voir section 5).
- **Réponse exemple (1 zone)** :
```json
{
  "total_zones": 40,
  "zones": [
    {"rang": 1, "zone": "DALIFORD", "niveau_risque": "ÉLEVÉ", "prob_risque": 0.7502704508467269,
     "nb_menages": 70, "pct_risque": 81.43, "tc_disponibles": 1.79, "dur_sante": 15.76,
     "lat": 14.730, "lon": -17.302}
  ]
}
```

#### `GET /zones-risque/resume`

- **Lignes** : 425-440.
- **Fonctionnement** : **recalcule dynamiquement** (à chaque appel, pas au démarrage) le `niveau_risque` de chaque zone à partir de `prob_risque`, avec des seuils codés en dur dans l'endpoint (`>= 0.60` -> ÉLEVÉ, `>= 0.40` -> MODÉRÉ, sinon FAIBLE).
- ⚠️ Point d'attention pédagogique : ces seuils (0.60/0.40) **diffèrent** de ceux utilisés à l'origine dans `sauvegarder_inacc_model.py` pour générer `zones_risque.json` (`>= 0.65` / `>= 0.45`, ligne 96 du script). C'est une autre incohérence réelle entre script d'entraînement et code de l'API.
- **Réponse exemple** :
```json
{
  "total_zones": 40, "zones_elevees": 9, "zones_moderees": 22, "zones_faibles": 9,
  "top5_risque": [ /* 5 objets zone triés par prob_risque décroissant */ ]
}
```

#### `GET /api/segmentation/profils`

- **Lignes** : 441-479.
- **Fonctionnement** : lit `segment_labels`, `segment_conseils`, `classes_rf` depuis `metadata.json`, puis enrichit chaque segment avec une icône/couleur/description issues d'un dictionnaire `SEGMENT_META` codé en dur (5 entrées possibles, mais seulement 3 segments réellement présents dans `metadata.json` : `Étudiants mobilité douce`, `Actifs motorisés`, `Travailleurs informels`).
- **Gestion d'erreur** : `try/except` générique -> `HTTPException(500, detail=str(e))`.
- **Réponse exemple** :
```json
{
  "segments": [
    {"id": 0, "label": "Étudiants mobilité douce", "conseil": "Les modes doux (vélo, marche)...", "icon": "🎓", "color": "#69db7c", "desc": "Jeunes étudiants privilégiant les modes doux et TC économiques."}
  ],
  "nb_segments": 3,
  "modes_rf": ["Moto", "Taxi/Clando", "Transport Commun", "Voiture"],
  "k_clusters": 3,
  "rf_accuracy": 0.8015,
  "rf_cv_f1": 0.6729
}
```

#### `GET /api/satisfaction`

- **Lignes** : 482-496.
- **Fonctionnement** : retourne directement le contenu de `satisfaction.json` chargé au démarrage. Si le fichier n'existait pas au démarrage (`satisfaction_data = None`), retourne **404** avec un message explicite (lignes 491-495).
- **Fichier concerné** : `ml_models/satisfaction.json` (généré par un script externe `satisfaction_ecoute_usagers.py`, mentionné en commentaire mais non fourni pour lecture dans ce dossier).
- **Réponse exemple (extrait réel observé)** :
```json
{
  "n_individus": 13415,
  "score_satisfaction_global": 65.8,
  "insecurite_tc_globale": 40.1,
  "pct_activites_non_realisees": 6.8,
  "satisfaction_par_mode": {
    "Taxi": {"n": 909, "score_global": 80.4, "criteres": {"prix": 55.8, "proximite": 82.5, "attente": 87.9, "vitesse": 93.5, "confort_place": 93.4, "securite_accidents": 69.3}}
  }
}
```

#### `POST /api/feedback`

- **Lignes** : 528-543.
- **Modèle Pydantic d'entrée** : `FeedbackCitoyen` (lignes 520-525).
- **Fonctionnement** :
  1. Charge la liste existante via `_load_feedback()` (lit `data/feedback_citoyens.json`, retourne `[]` si fichier absent ou JSON corrompu).
  2. Convertit le body Pydantic en dict (`avis.dict()`).
  3. Calcule un nouvel `id` auto-incrémenté (`entries[-1]["id"] + 1`, ou `1` si liste vide).
  4. Ajoute un horodatage `datetime.utcnow().isoformat()`.
  5. Sauvegarde via `_save_feedback()` qui **réécrit entièrement le fichier JSON** (`json.dump`, pas d'ajout incrémental, pas de verrou de concurrence).
- **Donnée concernée** : `data/feedback_citoyens.json` — confirmé non vide (2 entrées observées dans le fichier réel lu).
- **Réponse exemple** :
```json
{"success": true, "message": "Merci pour votre avis, il a bien été enregistré.", "id": 3}
```

#### `GET /api/feedback/stats`

- **Lignes** : 546-590.
- **Fonctionnement** : recalcule à chaque requête (aucun cache) : note moyenne, répartition des notes (1 à 5), agrégation par mode utilisé, agrégation par type de problème, et les 10 derniers avis (`list(reversed(entries))[:10]`).
- **Cas vide** : si `n == 0`, retourne une structure avec des champs vides/`None` plutôt qu'une erreur.
- **Réponse exemple (à partir des 2 entrées réelles du fichier)** :
```json
{
  "n_avis": 2, "note_moyenne": 2.5,
  "repartition_notes": {"1": 1, "4": 1},
  "par_mode": {"Tata": {"n": 1, "note_moyenne": 1.0}, "Taxi": {"n": 1, "note_moyenne": 4.0}},
  "par_probleme": {"attente": 1, "ponctualite": 1},
  "derniers_avis": [ /* les 2 entrées, ordre inversé */ ]
}
```

#### `GET /api/anomalies/summary`

- **Lignes** : 593-613.
- **Fonctionnement** : utilise le DataFrame pandas `ANOMALIES_DF` mis en cache au démarrage depuis `anomalies_results.csv` (14 Mo, message de log explicite ligne 32). Si le cache est vide (`None`), tente de le recharger ; sinon **500**. Calcule : total de lignes, nombre d'anomalies (`CONSENSUS.sum()`), nombre de sites à risque uniques, top sites groupés par description, et répartition par heure.
- **Fichier concerné** : `ml_models/anomalies_results.csv` (colonnes utilisées : `CONSENSUS`, `Identifiant_site_comptage`, `Description_site_comptage`, `Nombre_vehicules_amplitude`, `Heure_debut_comptage`).

#### `POST /predict-inaccessibility` — Endpoint ML #2

- **Lignes** : 636-704.
- **Modèle Pydantic d'entrée** : `InaccessibiliteSimulationInput` (lignes 619-633, 14 champs).
- **Code HTTP** : 200 en succès, **500** sur exception (ligne 704).
- **Fonctionnement détaillé étape par étape** :
  1. Copie le profil par défaut `inacc_defaults` (chargé depuis `inacc_features_defaults.json`).
  2. Remplace les variables fournies par l'utilisateur (mapping explicite : `distance_tc`->`M66`, `inondations`->`M68`, `dur_sante`, `dur_hopital`, `dur_marche`, `tc_disponibles`->`tc_norm_total`, `revenu`->`M59`, `budget_transport`->`M63`, `taille_menage`->`M21`, `nb_actifs`->`M27`, `nb_voitures`->`M51`, `nb_motos`->`M50`, `nb_velos`->`M49`, `zone`->`I2`).
  3. Encode les variables catégorielles (`INACC_CAT_FEATURES` = `I2, M26, M28, M29, M30, M31, M37, M55, M56, M57, M68`) via les tables de correspondance JSON `inacc_encoders_mappings.json` (pas de `.pkl` LabelEncoder chargé à ce moment — l'encodage est fait "à la main" via dictionnaire, avec repli sur la valeur `'Inconnu'` si la valeur n'existe pas dans le mapping).
  4. Construit un DataFrame pandas avec les colonnes dans l'ordre exact `INACC_ALL_FEATURES` (13 numériques + 11 catégorielles = 24 colonnes).
  5. Impute les valeurs manquantes via `inacc_imputer` (`inacc_imputer.pkl`).
  6. Prédit la probabilité de risque avec `inacc_model.predict_proba()` (`inacc_model.pkl`, modèle `GradientBoostingClassifier` — confirmé dans `sauvegarder_inacc_model.py` ligne 73), récupère la probabilité de la classe 1 (`[0, 1]`).
  7. Détermine un niveau textuel : `ÉLEVÉ` si `prob >= 0.60`, `MODÉRÉ` si `>= 0.40`, sinon `FAIBLE` (seuils codés en dur dans l'endpoint, différents de ceux utilisés à l'entraînement comme noté plus haut).
  8. Génère des conseils textuels conditionnels codés en dur (distance TC > 15 min, inondations fréquentes, peu de lignes TC, revenu faible).
- **Fichiers/modèles concernés** : `inacc_model.pkl`, `inacc_imputer.pkl`, `inacc_features_defaults.json`, `inacc_encoders_mappings.json`.
- **Exemple de requête** :
```json
POST /predict-inaccessibility
{
  "distance_tc": 20, "inondations": "Souvent", "dur_sante": 30, "dur_hopital": 45,
  "dur_marche": 15, "tc_disponibles": 1, "revenu": 40000, "budget_transport": 10000,
  "taille_menage": 8, "nb_actifs": 2, "nb_voitures": 0, "nb_motos": 0, "nb_velos": 0,
  "zone": "KEUR MASSAR"
}
```
- **Réponse exemple (structure garantie, valeurs illustratives)** :
```json
{
  "prob_risque": 78.4,
  "niveau_risque": "ÉLEVÉ",
  "conseils": [
    "L'isolement est fortement accentué par la distance aux arrêts de transport en commun (plus de 15 min).",
    "La vulnérabilité élevée aux inondations perturbe gravement l'accessibilité dans cette strate.",
    "Le manque de diversité des lignes de transport disponibles limite les solutions de repli de l'usager.",
    "La contrainte budgétaire financière rend l'accès aux transports privés (taxis) impossible."
  ],
  "features_importance_factors": [
    {"name": "Distance TC", "value": 20},
    {"name": "Inondabilité", "value": "Souvent"},
    {"name": "TC disponibles", "value": 1}
  ]
}
```

#### `GET /api/ml/features-importance`

- **Lignes** : 707-713.
- **Fonctionnement** : relit le fichier `features_importance.json` **à chaque requête** (pas de cache mémoire, contrairement aux autres fichiers JSON chargés au démarrage).
- **Réponse exemple (3 premières entrées réelles)** :
```json
[
  {"feature_raw": "M68", "feature_human": "Frequence des inondations", "importance": 0.2074},
  {"feature_raw": "M66", "feature_human": "Distance arret TC (min)", "importance": 0.1989},
  {"feature_raw": "dur_marche", "feature_human": "Temps trajet marche (min)", "importance": 0.1067}
]
```

#### `GET /api/ml/metrics`

- **Lignes** : 716-722.
- **Fonctionnement** : relit `inacc_model_metrics.json` à chaque requête.
- **Réponse exacte (contenu réel du fichier)** :
```json
{
  "accuracy": 0.7468513853904282,
  "precision": 0.7380952380952381,
  "recall": 0.6869806094182825,
  "f1_score": 0.7116212338593975,
  "roc_auc": 0.8429081394381785,
  "test_size": 794,
  "train_size": 2382
}
```

#### `GET /api/anomalies/sites`

- **Lignes** : 725-771.
- **Fonctionnement** : groupe le DataFrame `ANOMALIES_DF` par site de comptage (`Identifiant_site_comptage` ou repli sur `Description_site_comptage`), agrège (`count`, `sum`, `max`, `mean`), puis classe chaque site en `CRITIQUE` (≥20 anomalies), `ÉLEVÉ` (≥8), ou `MODÉRÉ` (codé en dur), trié par nombre d'anomalies décroissant.

#### `GET /api/anomalies/sites/{site_id}/details`

- **Lignes** : 774-824.
- **Paramètre** : `site_id` en **path parameter** (seul endpoint du fichier à utiliser un paramètre de chemin dynamique).
- **Fonctionnement** : filtre le DataFrame sur le site demandé ; si vide, **404** (`HTTPException(404, "Site non trouvé")`, ligne 784) ; sinon calcule les anomalies par catégorie de véhicule, par heure, et liste le détail des 15 plus fortes anomalies avec scores de vote (`ANOMALY_IF`, `ANOMALY_LOF`, `ANOMALY_ZSCORE` — donc trois modèles de détection d'anomalies combinés en amont, probablement Isolation Forest, Local Outlier Factor et Z-score, bien que ce calcul ne soit pas fait dans `main.py` lui-même mais dans le pipeline qui a généré `anomalies_results.csv`).

---

## 3. Modèles Pydantic (classes BaseModel)

| Classe | Lignes | Champs et types exacts |
|---|---|---|
| `ProfilUsager` | 192-206 | `age: int (5-100)`, `sexe: int (1-2)`, `niveau_instruction: int (1-4)`, `actif: int (1-2)`, `etudiant: int (1-2)`, `permis: int (1-2)`, `freq_tc: int (1-5)`, `nb_deplacements: int (1-10)`, `nb_vehicules: int (0-10, défaut 0)`, `revenu: float (≥0, défaut 0)`, `duree_estimee: float (1-300, défaut 25)`, `cout_estime: float (0-5000, défaut 200)`, `quartier_depart: int (défaut 110401)`, `quartier_arrivee: int (défaut 110401)` |
| `ModeInfo` | 209-215 | `mode: str`, `icone: str`, `probabilite: float`, `duree_fourchette: str`, `cout_fourchette: str`, `cout_moyen: str` |
| `ReponseRecommandation` | 218-229 | `segment: int`, `segment_label: str`, `segment_conseil: str`, `mode_recommande: str`, `mode_icone: str`, `top3_modes: list[ModeInfo]`, `duree_fourchette: str`, `cout_fourchette: str`, `cout_moyen: str`, `quartier_depart: str`, `quartier_arrivee: str` |
| `InaccessibiliteSimulationInput` | 619-633 | `distance_tc: float (0-120, défaut 5.0)`, `inondations: str (défaut "Jamais")`, `dur_sante: float (0-300, défaut 15.0)`, `dur_hopital: float (0-300, défaut 25.0)`, `dur_marche: float (0-300, défaut 10.0)`, `tc_disponibles: float (0-8, défaut 3.0)`, `revenu: float (≥0, défaut 150000.0)`, `budget_transport: float (≥0, défaut 25000.0)`, `taille_menage: int (1-50, défaut 5)`, `nb_actifs: int (0-30, défaut 2)`, `nb_voitures: int (0-10, défaut 0)`, `nb_motos: int (0-10, défaut 0)`, `nb_velos: int (0-10, défaut 0)`, `zone: str (défaut "110401")` |
| `FeedbackCitoyen` | 520-525 | `note_satisfaction: int (1-5)`, `mode_utilise: str`, `type_probleme: Optional[str] = None`, `quartier: Optional[str] = None`, `commentaire: Optional[str] = None (max_length=600)` |

📌 **À retenir** : tous les champs numériques sensibles (âge, notes, probabilités, montants) sont bornés avec `Field(ge=..., le=...)`. C'est **Pydantic qui rejette automatiquement** une requête hors bornes avec un code **422 Unprocessable Entity**, avant même que le code métier ne s'exécute — aucune ligne de validation manuelle n'est nécessaire dans les fonctions des endpoints.

---

## 4. Sécurité réelle observée

### 4.1 CORS — configuration exacte trouvée dans le code

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```
(lignes 17-23)

- **`allow_origins`** : une seule origine autorisée, `http://localhost:3000` (le frontend React en développement local). **Aucune autre origine n'est autorisée** — ni un domaine de production, ni `*`.
- **`allow_credentials=True`** : autorise l'envoi de cookies/credentials avec les requêtes cross-origin.
- **`allow_methods=["*"]`** : toutes les méthodes HTTP sont autorisées (GET, POST, PUT, DELETE...).
- **`allow_headers=["*"]`** : tous les en-têtes HTTP sont autorisés.

⚠️ Cette configuration est typique d'un **environnement de développement** : elle ne fonctionnera pas si le frontend est déployé sur un autre domaine/port en production sans modification de `allow_origins`.

### 4.2 Validation des entrées

Entièrement déléguée à Pydantic (voir section 3) : bornes numériques (`ge`, `le`), valeurs par défaut, types stricts. **Aucune validation manuelle supplémentaire** (regex, sanitation de chaînes) n'est observée dans le code, par exemple sur les champs `str` libres comme `inondations`, `zone`, `mode_utilise`, ou `commentaire` du feedback citoyen — ces champs acceptent **n'importe quelle chaîne** tant qu'elle respecte la contrainte de longueur quand elle existe (`max_length=600` pour `commentaire` uniquement).

### 4.3 Gestion des erreurs

| Endpoint | Mécanisme observé |
|---|---|
| `/recommander` | `try/except Exception` -> `traceback.print_exc()` + `HTTPException(500, detail=str(e))` (lignes 403-408) |
| `/api/segmentation/profils` | `try/except Exception` -> `HTTPException(500, detail=str(e))` (lignes 444, 478-479) |
| `/api/satisfaction` | Vérification manuelle `if satisfaction_data is None` -> `HTTPException(404, ...)` (lignes 491-495) |
| `/api/anomalies/summary` | Vérification manuelle `if ANOMALIES_DF is None` -> `HTTPException(500, ...)` (ligne 601) |
| `/predict-inaccessibility` | `try/except Exception` -> `traceback.print_exc()` + `HTTPException(500, detail=str(e))` (lignes 701-704) |
| `/api/ml/features-importance`, `/api/ml/metrics` | `try/except Exception` -> `HTTPException(500, detail=f"...")` |
| `/api/anomalies/sites` | Vérification manuelle `if ANOMALIES_DF is None` -> `HTTPException(500, ...)` |
| `/api/anomalies/sites/{site_id}/details` | Vérification manuelle `if df_site.empty` -> `HTTPException(404, "Site non trouvé")` |
| Chargement des modèles au démarrage (lignes 38-104) | `try/except Exception` -> affichage de l'erreur puis `raise` (le serveur ne démarre pas) |

📌 **À retenir** : la gestion d'erreurs est **réactive et locale à chaque endpoint** (pas de gestionnaire d'exception global via `@app.exception_handler`). Le détail brut de l'exception Python (`str(e)`) est renvoyé au client dans plusieurs endpoints — ce qui est pratique en développement mais **peut exposer des informations internes** (chemins de fichiers, noms de colonnes) en production.

### 4.4 Authentification

**Une authentification JWT (JSON Web Token) protège désormais 13 des 18 endpoints — ceux destinés à l'espace décideurs.** Concrètement, dans `main.py` :

- Import de `jwt` (bibliothèque PyJWT, ajoutée à `requirements.txt`), ainsi que `Depends` et `Header` de FastAPI.
- Un bloc de configuration après le CORS définit `JWT_SECRET` (variable d'environnement, avec une valeur par défaut de développement), `JWT_ALGORITHM = "HS256"` et `JWT_EXPIRE_MIN = 60`.
- `DECIDEURS_DB` : les comptes décideurs (login, mot de passe, rôle, infos d'affichage, `allowedRoutes`) sont désormais stockés **côté serveur uniquement**, et non plus exposés en clair dans le bundle JavaScript du frontend comme c'était le cas auparavant.
- `POST /auth/login` : vérifie les identifiants contre `DECIDEURS_DB` et renvoie un JWT signé (`create_access_token`) valable 60 minutes, ou une erreur 401 si les identifiants sont invalides.
- `get_current_decideur` : une dependency FastAPI (`Depends`) qui lit l'en-tête `Authorization: Bearer <token>`, vérifie la signature et l'expiration du JWT, et lève une `HTTPException(401)` si le token est absent, invalide ou expiré.

**13 endpoints décideurs sont protégés** par `Depends(get_current_decideur)` : `/segments`, `/modes`, `/zones-risque`, `/zones-risque/resume`, `/api/segmentation/profils`, `/api/satisfaction`, `/api/feedback/stats`, `/api/anomalies/summary`, `/predict-inaccessibility`, `/api/ml/features-importance`, `/api/ml/metrics`, `/api/anomalies/sites`, `/api/anomalies/sites/{site_id}/details`.

**5 endpoints citoyens restent volontairement publics**, par design (pas une faille mais un choix : ce sont des points d'entrée grand public sans donnée sensible par utilisateur) :
- `GET /`, `GET /health`, `GET /quartiers` (informations générales, pas de données utilisateur).
- `POST /recommander` (recommandation citoyenne, usage anonyme attendu).
- `POST /api/feedback` (n'importe qui peut poster un avis citoyen ; aucune limite de fréquence/anti-spam observée, ce qui reste une limite résiduelle, voir ci-dessous).

**Limites résiduelles** (qui subsistent malgré l'ajout du JWT, déduites du code, pas inventées) :
1. **Mots de passe en clair côté serveur** : `DECIDEURS_DB` stocke les mots de passe en texte brut, sans hashing (pas de `bcrypt`/`passlib` observé) — un accès au code ou à la mémoire du serveur exposerait directement les identifiants.
2. **Pas de refresh token, pas de révocation serveur** : un JWT déjà émis reste valide jusqu'à son expiration (60 minutes), même après une "déconnexion" côté client (qui ne fait que supprimer le token du `localStorage`).
3. **Déni de service possible sur les endpoints publics** : rien n'empêche d'envoyer des milliers de requêtes `POST /api/feedback` pour polluer `feedback_citoyens.json` (pas de rate limiting, pas de CAPTCHA, pas de validation d'unicité) — ce risque ne concerne que les 5 endpoints publics par design, les 13 endpoints décideurs étant désormais protégés.
4. **CORS limité à `localhost:3000`** reste un mécanisme distinct de l'authentification : il atténue le risque d'appels depuis un site tiers en navigateur, mais ne protège pas contre des appels directs (curl, Postman, scripts) qui ignorent les règles CORS (CORS est une protection **navigateur**, pas une protection serveur) — l'authentification JWT, elle, s'applique quel que soit le client.

🎓 Ce point est central pour la soutenance : il faut être capable d'expliquer clairement que **CORS n'est pas un système d'authentification**, que ce backend en possède désormais un (JWT) pour l'espace décideurs, et que les endpoints citoyens restent publics par choix de conception, pas par oubli.

---

## 5. Intégration des modèles Machine Learning dans l'API

### 5.1 Chargement des `.pkl` : quand et comment

Tous les modèles sont chargés **une seule fois, au démarrage du serveur** (au moment de l'import du module `main.py` par uvicorn), dans le bloc `try/except` des lignes 38-104 :

```python
kmeans         = joblib.load(os.path.join(MODELS_DIR, "kmeans_model.pkl"))
scaler_cluster = joblib.load(os.path.join(MODELS_DIR, "kmeans_scaler.pkl"))
imputer        = joblib.load(os.path.join(MODELS_DIR, "kmeans_imputer.pkl"))
rf         = joblib.load(os.path.join(MODELS_DIR, "rf_model.pkl"))
imputer_rf = joblib.load(os.path.join(MODELS_DIR, "rf_imputer.pkl"))
le         = joblib.load(os.path.join(MODELS_DIR, "rf_label_encoder.pkl"))
inacc_model   = joblib.load(os.path.join(MODELS_DIR, "inacc_model.pkl"))
inacc_imputer = joblib.load(os.path.join(MODELS_DIR, "inacc_imputer.pkl"))
```

Les objets résultants (`kmeans`, `scaler_cluster`, `imputer`, `rf`, `imputer_rf`, `le`, `inacc_model`, `inacc_imputer`) sont des **variables globales du module**, réutilisées par toutes les requêtes sans être rechargées. Le dossier `ml_models/` contient aussi `kmeans_pca.pkl`, `inacc_label_encoders.pkl` et `inaccessibilite_model.pkl`, qui sont présents sur disque mais **non chargés/utilisés par `main.py`** (probablement des artefacts d'anciennes versions du pipeline).

📌 **À retenir** : ce choix (chargement au démarrage, pas à la requête) est une bonne pratique de performance — chaque appel à `/recommander` ne paie pas le coût de désérialisation du modèle, seulement le coût de l'inférence elle-même.

### 5.2 Origine des modèles entraînés

Les scripts `train_inaccessibility_model.py` et `sauvegarder_inacc_model.py` (présents dans le dossier `backend/`, hors `main.py`) montrent comment le modèle d'inaccessibilité est produit, **en amont, hors de l'exécution de l'API** :

1. Chargement d'un fichier Excel source (`CETUD_BD_EMD_MENAGE_COMPILE.xls`, feuille `BASE MENAGE`) — chemin absolu codé en dur sur la machine de développement (`C:\Users\ibtih\OneDrive\Bureau\cetud data\MENAGE\...`).
2. Construction d'une cible binaire `RISQUE_INACC` par un score composite pondéré (distance TC, inondations, enclavement, état des routes, manque de TC, accès aux services de santé/marché), seuillé au 60e centile (`df['score_total'].quantile(0.60)`).
3. Encodage des variables catégorielles avec `LabelEncoder` de scikit-learn, et sauvegarde de la correspondance texte->entier dans `inacc_encoders_mappings.json` (pour que l'API puisse encoder sans recharger les `LabelEncoder` eux-mêmes).
4. Entraînement d'un `GradientBoostingClassifier(n_estimators=150, max_depth=4, learning_rate=0.05, random_state=42)` (ligne 73 de `sauvegarder_inacc_model.py`).
5. Sauvegarde du modèle et de l'imputeur avec `joblib.dump()`.
6. Génération de `zones_risque.json` par agrégation des probabilités de risque par zone géographique (`I2`).

Ce pipeline d'entraînement est **complètement déconnecté** de l'exécution de `main.py` — il doit être relancé manuellement par un développeur quand les données changent (aucun ré-entraînement automatique, aucun déclenchement depuis l'API).

### 5.3 Comment les prédictions sont faites (résumé transversal)

| Modèle | Chargé via | Entrée construite par | Sortie utilisée |
|---|---|---|---|
| K-Means (segmentation) | `kmeans_model.pkl` + `kmeans_scaler.pkl` + `kmeans_imputer.pkl` | `build_features_cluster()` | `segment` (0,1,2) -> libellé + conseil |
| Random Forest (mode de transport) | `rf_model.pkl` + `rf_imputer.pkl` + `rf_label_encoder.pkl` | `build_features_rf()` | `mode_recommande` + `top3_modes` avec probabilités |
| Gradient Boosting (inaccessibilité) | `inacc_model.pkl` + `inacc_imputer.pkl` | profil par défaut + champs `InaccessibiliteSimulationInput` + encodage manuel via `inacc_encoders_mappings.json` | `prob_risque`, `niveau_risque`, `conseils` |

### 5.4 Formatage JSON de la sortie

FastAPI sérialise automatiquement en JSON tout dictionnaire Python ou instance Pydantic retournée par un endpoint. Pour `/recommander`, le `response_model=ReponseRecommandation` impose un contrat strict : si la fonction `predire()` retournait un champ manquant ou mal typé, FastAPI lèverait une erreur de validation côté serveur. Les autres endpoints (ex. `/zones-risque`, `/api/feedback/stats`) retournent de simples dictionnaires Python sans `response_model` déclaré — la validation de sortie n'est alors pas appliquée par Pydantic (seulement la validation d'entrée, quand un body existe).

---

## 6. Schéma ASCII du cycle de vie d'une requête

Exemple concret avec `POST /recommander` :

```
+--------------+
|  Utilisateur |  remplit un formulaire (age, sexe, revenu, quartier...)
+------+-------+
       | clic "Recommander"
       v
+---------------------------+
|   Frontend React (3000)   |  construit le JSON ProfilUsager
+------+--------------------+
       | fetch/axios POST http://localhost:8000/recommander
       | Content-Type: application/json
       v
+---------------------------------------------------------------+
|                     FastAPI (port 8000)                       |
|  1. CORSMiddleware verifie l'origine (localhost:3000) OK       |
|  2. Pydantic valide le body -> instancie ProfilUsager           |
|     (rejette avec 422 si bornes/type invalides)                |
|  3. Endpoint recommander() appelle predire(profil)              |
|  4. predire() :                                                |
|     a. build_features_cluster() -> DataFrame pandas             |
|     b. kmeans_imputer.pkl -> kmeans_scaler.pkl -> kmeans.pkl      |
|        ===============> segment (0/1/2)                        |
|     c. build_features_rf() -> DataFrame pandas                  |
|     d. rf_imputer.pkl -> rf_model.pkl -> rf_label_encoder.pkl     |
|        ===============> mode_recommande + probabilites          |
|     e. Lecture stats_par_mode.json (deja en RAM)                 |
|     f. Lecture QUARTIERS, SEGMENT_LABELS (dicts en RAM)          |
|  5. Construction du dict reponse, conforme a                    |
|     ReponseRecommandation (validation de sortie Pydantic)       |
|  6. Code HTTP 200 + serialisation JSON                          |
|     (ou 500 + HTTPException si exception levee a l'etape 4)     |
+------+----------------------------------------------------------+
       | reponse JSON (ReponseRecommandation)
       v
+---------------------------+
|   Frontend React (3000)   |  recoit le JSON, met a jour le state,
|                            |  affiche segment / mode recommande / top3
+------+--------------------+
       v
+--------------+
|  Utilisateur |  voit le resultat de la recommandation
+--------------+
```

📌 **À retenir** : la requête traverse **deux modèles ML successifs** (K-Means puis Random Forest), tous deux nécessitant chacun un imputer dédié, avant de produire une réponse enrichie de données statiques (stats par mode, quartiers, conseils).

---

## 7. Configuration et lancement

D'après `README.md` (lignes 21-41) et `requirements.txt` :

### 7.1 Dépendances exactes (`requirements.txt`)

```
fastapi==0.111.0
uvicorn==0.30.1
pydantic==2.7.1
scikit-learn==1.6.1
numpy==1.26.4
joblib==1.4.2
pandas==2.2.2
```

### 7.2 Installation

```bash
python -m venv venv
venv\Scripts\activate          # Windows
source venv/bin/activate       # Mac/Linux
pip install -r requirements.txt
```

### 7.3 Lancement

```bash
uvicorn main:app --reload --port 8000
```

- **Port** : `8000` (explicite dans la commande du README — `main.py` ne définit pas de port en dur, c'est uvicorn en ligne de commande qui le fixe).
- **Mode `--reload`** : rechargement automatique du serveur à chaque modification de fichier — adapté au développement, **à ne pas utiliser en production** (non précisé dans le README, mais c'est une bonne pratique standard à mentionner).
- **Documentation interactive** : `http://localhost:8000/docs` (Swagger UI, généré automatiquement par FastAPI, confirmé dans le README ligne 45).

🎓 Aucune configuration de variables d'environnement (`.env`), aucun fichier de config séparé, aucun `Dockerfile` n'a été trouvé dans les fichiers fournis pour cette analyse — le déploiement réel (s'il existe) n'est pas documenté dans les fichiers lus.

---

## Résumé du travail effectué et zones d'incertitude

J'ai lu intégralement `main.py` (823 lignes), `requirements.txt`, `README.md`, les deux scripts d'entraînement du modèle d'inaccessibilité, et le contenu réel des fichiers `ml_models/*.json` ainsi que `feedback_citoyens.json`. Le document liste les 18 endpoints réels (le README n'en documente que 5), les 5 modèles Pydantic exacts, la configuration CORS exacte (une seule origine autorisée, pas de wildcard), et confirme la présence d'une **authentification JWT sur 13 des 18 endpoints** (les 5 endpoints citoyens restant publics par design) — point explicitement vérifié, pas supposé. Zones d'incertitude assumées : les valeurs numériques précises de sortie de `/recommander` (probabilités exactes) n'ont pas pu être calculées sans exécuter les `.pkl` réels, donc les exemples de réponse sont illustratifs sur la structure garantie par le code, pas sur les chiffres. Le script `satisfaction_ecoute_usagers.py` générant `satisfaction.json` n'a pas été fourni pour lecture. Les fichiers `kmeans_pca.pkl`, `inacc_label_encoders.pkl`, `inaccessibilite_model.pkl` existent sur disque mais ne sont jamais chargés par `main.py` — signalés comme code/fichiers orphelins, pas comme fonctionnalités actives.
