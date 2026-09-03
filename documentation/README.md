# Documentation technique et pédagogique — Projet TransportDakar

## Sommaire

| Fichier | Contenu |
|---|---|
| [01_Architecture.md](./01_Architecture.md) | Présentation générale du projet et architecture globale |
| [02_Frontend.md](./02_Frontend.md) | Application web React |
| [03_Backend_FastAPI.md](./03_Backend_FastAPI.md) | API FastAPI |
| [04_Base_de_donnees.md](./04_Base_de_donnees.md) | Modélisation PostgreSQL (schémas SA / DW) |
| [05_ETL.md](./05_ETL.md) | Pipelines Talend |
| [06_DataWarehouse.md](./06_DataWarehouse.md) | Modèle en constellation |
| [07_MachineLearning.md](./07_MachineLearning.md) | Modèles de Machine Learning |
| [08_Knowage.md](./08_Knowage.md) | Cockpit décisionnel Knowage |
| [09_Integration.md](./09_Integration.md) | Intégration globale et pipelines (en cours de rédaction) |
| [11_Glossaire.md](./11_Glossaire.md) | Glossaire des termes techniques et métier |

---

## Résumé de chaque fichier

### 01_Architecture.md

### 02_Frontend.md

### 03_Backend_FastAPI.md

### 04_Base_de_donnees.md

### 05_ETL.md
Documente les jobs Talend Open Studio utilisés pour charger les données du staging (SA) vers les dimensions et les faits du Data Warehouse (DW). Décrit le rôle des composants Talend (tDBInput, tMap, tSortRow, tUniqRow, tDBOutput) et propose un diagramme ASCII complet du pipeline, des sources jusqu'au DW.

### 06_DataWarehouse.md
Présente la modélisation décisionnelle du projet sous forme de **schéma en constellation**, composé de 4 faits et 10 dimensions, avec `Dim_Geographie` comme dimension transversale partagée entre plusieurs faits. Justifie le choix de la constellation plutôt que d'étoiles indépendantes et détaille la granularité de chaque table.

### 07_MachineLearning.md
Explique la conception des pipelines de Machine Learning du projet, totalement indépendants de la chaîne décisionnelle bien que partant des mêmes données sources CETUD. Détaille les quatre familles de modèles utilisées (K-Means pour la segmentation, Random Forest pour la classification, Gradient Boosting pour le score d'inaccessibilité, et un consensus Isolation Forest/LOF/Z-Score combiné à DBSCAN pour la détection d'anomalies), avec leurs métriques réelles.

### 08_Knowage.md
Décrit le cockpit décisionnel Knowage "TransportDakar", composé de 6 feuilles restituant les indicateurs clés issus du Data Warehouse. Met en avant la contrainte du sanitizer interne de Knowage, qui impose des widgets HTML/CSS uniquement (sans JavaScript), et explique les mécanismes de navigation et de thème du cockpit.

### 09_Integration.md *(en cours de rédaction)*
Ce fichier doit présenter la vision d'intégration bout-en-bout du système TransportDakar, en reliant explicitement les éléments documentés dans les fichiers 02 à 08.

### 11_Glossaire.md
Glossaire alphabétique de plus de 70 termes techniques (développement web, ETL/Data Warehouse, Machine Learning, BI) et de termes métier spécifiques au domaine (CETUD, EMD, mobilité urbaine, matrice origine-destination), destiné à faciliter la compréhension transversale de la documentation.

---

## Conclusion générale du projet

Le projet TransportDakar répond à un besoin concret du CETUD : exploiter les données de mobilité urbaine de Dakar (enquêtes ménages-déplacements, comptages de trafic), aujourd'hui sous-utilisées, pour produire à la fois des informations décisionnelles fiables et des services accessibles aux citoyens. Le projet se structure autour de deux chaînes complémentaires mais indépendantes : une **chaîne décisionnelle** robuste, qui transforme les fichiers sources bruts en un Data Warehouse modélisé en constellation via des jobs Talend, puis restitue cette information dans un cockpit Knowage à destination des décideurs du CETUD (directeur de planification, responsable d'exploitation, chargé de modélisation) ; et une **chaîne applicative**, portée par une interface React et une API FastAPI, qui s'appuie sur des modèles de Machine Learning pour offrir des fonctionnalités prédictives et analytiques (segmentation des ménages, scores de risque d'inaccessibilité, détection d'anomalies) tout en distinguant un espace public pour les citoyens et un espace protégé pour les décideurs.

Les points forts du projet résident dans la richesse fonctionnelle de l'ensemble (BI, ML, application web réunis dans un même projet), la cohérence de la modélisation décisionnelle (schéma en constellation justifié par le partage de dimensions comme la géographie), et la diversité des modèles Machine Learning mobilisés et correctement évalués (métriques réelles à l'appui). Les limites assumées concernent principalement la sécurité (authentification JWT limitée aux endpoints décideurs, mots de passe encore stockés en clair côté serveur), la portée du déploiement (CORS restreint à un environnement local), le caractère synchrone du backend, ainsi que le découplage total entre la chaîne ML et la chaîne BI/DW, qui empêche aujourd'hui une vision pleinement unifiée des données et des prédictions.

Les pistes d'évolution naturelles consistent à renforcer l'authentification existante (hashing des mots de passe, refresh token), à industrialiser le déploiement (CORS de production, conteneurisation), à faire évoluer le backend vers un modèle asynchrone, et surtout à envisager un rapprochement entre les sorties des modèles Machine Learning et le Data Warehouse, afin que les prédictions puissent, à terme, être restituées aussi dans le cockpit Knowage et enrichir la vision décisionnelle globale du CETUD.
