# Glossaire technique

Ce glossaire rassemble, par ordre alphabétique, les termes techniques utilisés dans ce rapport. Chaque définition est volontairement simple, destinée à un lecteur découvrant ces notions pour la première fois.

---

### Accuracy (exactitude)

L'accuracy mesure la proportion de prédictions correctes faites par un modèle de Machine Learning, sur l'ensemble des prédictions réalisées. C'est l'indicateur de performance le plus simple, mais il peut être trompeur si les classes à prédire sont déséquilibrées (par exemple, 95 % de cas "normaux" et 5 % de cas "anormaux").

Exemple : Si un modèle fait 90 prédictions correctes sur 100 cas testés, son accuracy est de 90 %.

### API (Application Programming Interface)

Une API est un ensemble de règles qui permet à deux logiciels de communiquer entre eux, même s'ils sont écrits dans des langages différents. Elle définit quelles informations peuvent être demandées et comment elles seront renvoyées. C'est l'équivalent d'un "menu de restaurant" : on commande un plat précis (une requête) et la cuisine (le serveur) renvoie le plat correspondant (la réponse).

Exemple : Une application React appelle une API FastAPI pour récupérer la liste des lignes de bus de Dakar.

### ASGI / uvicorn

ASGI (Asynchronous Server Gateway Interface) est une norme qui définit comment un serveur web doit communiquer avec une application Python pour gérer plusieurs requêtes en même temps (de façon asynchrone). Uvicorn est un logiciel serveur qui implémente cette norme et qui est utilisé pour faire fonctionner une application FastAPI.

Exemple : La commande `uvicorn main:app` démarre le serveur qui fait tourner l'API FastAPI du projet.

### AUC-ROC

L'AUC-ROC est un indicateur qui mesure la capacité d'un modèle de classification à distinguer deux classes (par exemple "normal" et "anomalie"), quel que soit le seuil de décision choisi. Sa valeur va de 0,5 (le modèle ne fait pas mieux que le hasard) à 1 (le modèle distingue parfaitement les deux classes).

Exemple : Un modèle avec un AUC-ROC de 0,95 est considéré comme très performant pour détecter des anomalies dans des trajets de bus.

### Chargement (Load)

Le chargement est la troisième étape d'un processus ETL : elle consiste à écrire les données transformées dans leur destination finale, généralement un Data Warehouse. C'est l'étape qui rend les données disponibles pour l'analyse et les rapports.

Exemple : Après nettoyage, les données des enquêtes EMD sont chargées dans les tables de faits du Data Warehouse.

### Clé étrangère (Foreign Key)

Une clé étrangère est une colonne d'une table qui fait référence à la clé primaire d'une autre table. Elle permet de créer un lien entre deux tables d'une base de données relationnelle, garantissant la cohérence des données.

Exemple : Dans une table de faits "trajets", la colonne `id_ligne` est une clé étrangère qui pointe vers la table de dimension "lignes de bus".

### Clé primaire (Primary Key)

Une clé primaire est une colonne (ou un ensemble de colonnes) qui identifie de façon unique chaque ligne d'une table dans une base de données. Deux lignes ne peuvent jamais avoir la même clé primaire.

Exemple : Dans une table "usagers", la colonne `id_usager` est la clé primaire : chaque usager a un identifiant unique.

### Cockpit (Knowage)

Dans Knowage, un cockpit est un espace de travail visuel qui regroupe plusieurs widgets (graphiques, tableaux, indicateurs) organisés en page de tableau de bord. C'est l'équivalent du "tableau de bord" final que consultent les décideurs.

Exemple : Un cockpit CETUD pourrait afficher côte à côte un graphique de fréquentation par ligne et une carte des zones de déplacement.

### Composant (Component)

En React, un composant est un bloc de code réutilisable qui décrit une partie de l'interface utilisateur (un bouton, un formulaire, une carte, une page entière). Une application React est construite en assemblant de nombreux petits composants, un peu comme des briques de Lego.

Exemple : Un composant `<LigneBusCard />` affiche les informations d'une ligne de bus (numéro, trajet, fréquence).

### Composant — Props

Les props (abréviation de "properties") sont les données qu'un composant React reçoit de son composant parent, un peu comme les arguments d'une fonction. Elles permettent de personnaliser l'affichage ou le comportement d'un composant sans dupliquer son code.

Exemple : `<LigneBusCard nom="Ligne 7" couleur="bleu" />` transmet les props `nom` et `couleur` au composant.

### Composant — State

Le state (état) est une donnée interne propre à un composant React, qui peut changer au fil du temps (par exemple suite à une action de l'utilisateur) et qui déclenche automatiquement le réaffichage du composant lorsqu'elle est modifiée.

Exemple : Le state `estOuvert` peut valoir `true` ou `false` pour afficher ou masquer un menu déroulant.

### Confusion Matrix (matrice de confusion)

La matrice de confusion est un tableau qui résume les résultats d'un modèle de classification, en comparant les prédictions du modèle aux vraies valeurs. Elle distingue quatre cas : vrais positifs, vrais négatifs, faux positifs et faux négatifs.

Exemple : Pour un modèle de détection d'anomalies, la matrice de confusion montre combien d'anomalies ont été correctement détectées et combien ont été manquées ou signalées à tort.

### CORS (Cross-Origin Resource Sharing)

CORS est un mécanisme de sécurité des navigateurs web qui contrôle si une application web (par exemple sur `localhost:3000`) a le droit d'appeler une API hébergée sur une autre adresse (par exemple `localhost:8000`). Sans configuration CORS adaptée côté serveur, le navigateur bloque la requête par sécurité.

Exemple : FastAPI doit explicitement autoriser l'origine `http://localhost:3000` pour que le frontend React puisse appeler ses endpoints.

### Cross Validation (validation croisée)

La validation croisée est une technique d'évaluation d'un modèle de Machine Learning qui consiste à diviser les données en plusieurs groupes ("folds"), puis à entraîner et tester le modèle plusieurs fois en changeant chaque fois le groupe de test. Cela donne une estimation plus fiable de la performance réelle du modèle qu'un simple test unique.

Exemple : Avec une validation croisée à 5 plis (5-fold), le modèle est entraîné et testé 5 fois sur des sous-ensembles différents des données.

### Dashboard / Tableau de bord

Un tableau de bord est une interface visuelle qui regroupe plusieurs indicateurs et graphiques pour donner une vue d'ensemble rapide d'une activité ou d'une situation, sans avoir besoin de lire des données brutes.

Exemple : Un tableau de bord CETUD peut présenter en un coup d'œil le nombre de déplacements par mode de transport et par zone.

### Data Warehouse (entrepôt de données)

Un Data Warehouse est une grande base de données spécialement organisée pour stocker, centraliser et analyser des données provenant de plusieurs sources, sur de longues périodes. Contrairement à une base de données classique utilisée par une application, il est optimisé pour l'analyse et la production de rapports, pas pour les opérations quotidiennes.

Exemple : Le Data Warehouse du CETUD centralise les données des enquêtes EMD, des comptages de trafic et des lignes de transport pour produire des statistiques globales.

### Dataset (Knowage)

Dans Knowage, un dataset est une source de données préparée (issue d'une requête SQL, d'un fichier, ou d'une API) qui sert de base pour construire des widgets et des cockpits. C'est l'équivalent d'un tableau de données prêt à être visualisé.

Exemple : Un dataset "fréquentation_par_ligne" regroupe le nombre de passagers par ligne de bus et par mois.

### DBSCAN

DBSCAN (Density-Based Spatial Clustering of Applications with Noise) est un algorithme de clustering (regroupement) qui identifie des groupes de points proches les uns des autres dans les données, et qui marque comme "bruit" les points isolés qui n'appartiennent à aucun groupe dense. Il est souvent utilisé pour la détection d'anomalies, car les points isolés peuvent correspondre à des cas atypiques.

Exemple : DBSCAN peut regrouper des trajets similaires entre eux et isoler les trajets très différents des autres comme anomalies potentielles.

### Dimension (table de dimension)

Une table de dimension décrit le contexte d'un événement enregistré dans une table de faits : le "qui", le "quoi", le "où" et le "quand". Elle contient des informations descriptives, généralement peu nombreuses et stables dans le temps.

Exemple : Une table de dimension "Zone" contient le nom, la région et la commune de chaque zone géographique de Dakar.

### Endpoint

Un endpoint est une URL précise d'une API à laquelle on peut envoyer une requête pour obtenir ou envoyer des données. Chaque endpoint correspond généralement à une action ou une ressource spécifique.

Exemple : L'endpoint `/api/lignes/{id}` permet de récupérer les informations d'une ligne de bus précise.

### Extraction

L'extraction est la première étape d'un processus ETL : elle consiste à récupérer les données brutes depuis leurs sources d'origine (fichiers, bases de données, API), sans les modifier.

Exemple : Talend extrait les réponses brutes de l'enquête EMD depuis des fichiers Excel ou une base de données source.

### F1-score

Le F1-score est un indicateur qui combine la precision et le recall en une seule valeur, en faisant une moyenne équilibrée des deux. Il est particulièrement utile quand on veut éviter à la fois trop de fausses alertes et trop d'oublis.

Exemple : Un modèle avec une bonne precision mais un mauvais recall aura un F1-score moyen, qui signale ce déséquilibre.

### FastAPI

FastAPI est un framework Python permettant de créer rapidement des API web modernes, performantes et bien documentées. Il s'appuie sur Pydantic pour valider automatiquement les données et génère une documentation interactive automatique.

Exemple : Le backend du projet utilise FastAPI pour exposer les endpoints consommés par l'application React.

### Fait (table de faits)

Une table de faits est la table centrale d'un Data Warehouse : elle contient les mesures numériques d'un événement métier (quantités, montants, durées) ainsi que des clés étrangères vers les tables de dimension qui en décrivent le contexte.

Exemple : Une table de faits "Déplacements" contient le nombre de déplacements, leur durée, et des clés vers les dimensions "Zone", "Mode de transport" et "Date".

### Feature (variable explicative)

Une feature est une variable d'entrée utilisée par un modèle de Machine Learning pour faire une prédiction. L'ensemble des features décrit les caractéristiques d'une observation.

Exemple : Pour prédire le mode de transport choisi par un usager, les features peuvent être son âge, son revenu, et la distance à parcourir.

### Gradient Boosting

Le Gradient Boosting est une technique de Machine Learning qui construit une succession d'arbres de décision, chaque nouvel arbre corrigeant les erreurs commises par les arbres précédents. Cette approche permet d'obtenir des modèles souvent très précis.

Exemple : Un modèle de Gradient Boosting peut être utilisé pour prédire si un trajet de bus sera en retard, en s'améliorant progressivement à chaque arbre ajouté.

### Granularité

La granularité d'une table de faits définit le niveau de détail des données qu'elle contient, c'est-à-dire ce que représente exactement une ligne. Plus la granularité est fine, plus le détail est précis, mais plus le volume de données est important.

Exemple : Une granularité "par trajet individuel" est plus fine qu'une granularité "par ligne et par jour".

### Hook (useState, useEffect)

En React, un hook est une fonction spéciale qui permet d'utiliser certaines fonctionnalités (comme le state ou la gestion d'effets) dans un composant écrit sous forme de fonction. `useState` permet de créer une donnée d'état modifiable, tandis que `useEffect` permet d'exécuter du code en réaction à un changement (par exemple, charger des données au chargement de la page).

Exemple : `const [lignes, setLignes] = useState([])` crée une variable d'état `lignes` initialisée à un tableau vide.

### Imputation (valeurs manquantes)

L'imputation est une technique de préparation des données qui consiste à remplacer les valeurs manquantes d'un jeu de données par une valeur estimée (moyenne, médiane, valeur la plus fréquente, ou une valeur calculée par un modèle), afin de pouvoir utiliser ces données dans une analyse ou un modèle.

Exemple : Si l'âge d'un usager est manquant dans l'enquête EMD, on peut l'imputer par l'âge moyen des autres répondants.

### Isolation Forest

Isolation Forest est un algorithme de Machine Learning conçu pour détecter des anomalies. Son principe repose sur le fait que les observations atypiques sont plus faciles à "isoler" du reste des données que les observations normales, en un plus petit nombre d'étapes.

Exemple : Isolation Forest peut détecter des trajets de bus avec une durée anormalement longue par rapport aux trajets habituels.

### JSON (JavaScript Object Notation)

JSON est un format de texte léger utilisé pour structurer et échanger des données entre un serveur et une application, sous forme de paires clé-valeur. C'est le format le plus couramment utilisé par les API modernes.

Exemple : `{"nom": "Ligne 7", "capacite": 50}` est un objet JSON décrivant une ligne de bus.

### JWT (JSON Web Token)

Un JWT est un jeton (chaîne de caractères) utilisé pour authentifier un utilisateur de façon sécurisée, sans que le serveur ait besoin de retenir son état de connexion. Après une connexion réussie, le serveur génère un JWT que le client renvoie ensuite à chaque requête pour prouver son identité.

Exemple : Après s'être connecté, un utilisateur reçoit un JWT qu'il doit inclure dans l'en-tête de ses requêtes API pour accéder aux pages protégées.

### K-Means

K-Means est un algorithme de clustering qui regroupe automatiquement des données en un nombre fixé de groupes (clusters), en cherchant à rapprocher les points similaires et à les éloigner des autres groupes.

Exemple : K-Means peut regrouper les usagers de l'EMD en plusieurs profils types selon leurs habitudes de déplacement.

### Knowage

Knowage est une plateforme open-source de Business Intelligence (BI) qui permet de créer des datasets, des cockpits et des tableaux de bord pour analyser et visualiser des données, sans nécessiter de développement informatique poussé.

Exemple : Knowage est utilisé dans ce projet pour visualiser les indicateurs de mobilité issus du Data Warehouse.

### KPI (Key Performance Indicator / indicateur clé de performance)

Un KPI est une mesure chiffrée qui permet de suivre et d'évaluer l'atteinte d'un objectif ou la performance d'une activité. Les KPI sont choisis pour être pertinents, mesurables et faciles à suivre dans le temps.

Exemple : Le "taux d'occupation moyen des bus" peut être un KPI suivi par le CETUD.

### Local Outlier Factor (LOF)

LOF est un algorithme de détection d'anomalies qui compare la densité de points autour d'une observation à la densité autour de ses voisins. Un point situé dans une zone beaucoup moins dense que ses voisins est considéré comme une anomalie locale.

Exemple : LOF peut repérer un trajet isolé géographiquement par rapport aux trajets habituels de la même ligne.

### localStorage

localStorage est un espace de stockage fourni par le navigateur web qui permet à une application de sauvegarder des données directement sur l'ordinateur de l'utilisateur, même après la fermeture du navigateur, sans passer par un serveur.

Exemple : Un token JWT peut être stocké dans le localStorage pour garder l'utilisateur connecté entre deux visites.

### Machine Learning (apprentissage automatique)

Le Machine Learning est une branche de l'intelligence artificielle dans laquelle un programme apprend à reconnaître des motifs ou à faire des prédictions à partir de données, plutôt que de suivre des règles écrites explicitement par un développeur.

Exemple : Un modèle de Machine Learning peut apprendre à prédire le mode de transport probable d'un usager à partir de ses caractéristiques.

### Middleware

Un middleware est une fonction qui s'exécute automatiquement entre la réception d'une requête par un serveur et le traitement final de cette requête, souvent pour des tâches transversales comme la sécurité, les logs ou la gestion du CORS.

Exemple : Un middleware peut vérifier que chaque requête contient un JWT valide avant de laisser passer la demande vers l'endpoint correspondant.

### Node.js

Node.js est un environnement qui permet d'exécuter du code JavaScript en dehors d'un navigateur web, notamment pour faire fonctionner des outils de développement ou des serveurs. Il est nécessaire pour développer et construire une application React.

Exemple : Node.js permet d'exécuter la commande `npm start` pour lancer le serveur de développement React.

### npm (Node Package Manager)

npm est l'outil qui accompagne Node.js et qui permet d'installer, gérer et partager des bibliothèques de code JavaScript (appelées "packages" ou "dépendances") utilisées par un projet.

Exemple : La commande `npm install react-router-dom` installe la bibliothèque de routage dans le projet React.

### PCA (Analyse en Composantes Principales)

La PCA est une technique statistique qui permet de réduire le nombre de variables d'un jeu de données tout en conservant le maximum d'information possible. Elle est utile pour simplifier des données complexes, les visualiser en 2D ou 3D, ou améliorer les performances de certains modèles.

Exemple : La PCA peut résumer dix variables décrivant un usager en seulement deux nouvelles variables, plus faciles à visualiser sur un graphique.

### Pickle (.pkl) / joblib

Pickle et joblib sont deux bibliothèques Python qui permettent de sauvegarder un objet Python (par exemple un modèle de Machine Learning entraîné) dans un fichier, afin de pouvoir le recharger plus tard sans avoir à le réentraîner. joblib est souvent préféré pour les modèles contenant de grands tableaux de données numériques.

Exemple : Après l'entraînement, un modèle est sauvegardé dans un fichier `modele.pkl` grâce à `joblib.dump()`, puis rechargé par l'API FastAPI pour faire des prédictions.

### Precision

La precision mesure, parmi toutes les prédictions positives faites par un modèle, la proportion de celles qui sont effectivement correctes. Une faible precision signifie que le modèle déclenche beaucoup de "fausses alertes".

Exemple : Si un modèle signale 10 trajets comme anomalies mais que seulement 7 le sont vraiment, sa precision est de 70 %.

### Product Backlog

Le Product Backlog est une liste ordonnée de toutes les fonctionnalités, améliorations et corrections à réaliser dans un projet, utilisée dans la méthode Scrum. Elle est régulièrement mise à jour et priorisée par le Product Owner.

Exemple : "Ajouter un export PDF des rapports" peut être un élément du Product Backlog du projet.

### PostgreSQL

PostgreSQL est un système de gestion de base de données relationnelle (SGBD) open-source, reconnu pour sa robustesse et le respect des standards SQL. Il permet de stocker, organiser et interroger des données de façon structurée.

Exemple : Les données opérationnelles de l'application et le Data Warehouse peuvent tous deux être hébergés dans des bases PostgreSQL.

### Pydantic

Pydantic est une bibliothèque Python utilisée pour définir la structure attendue des données (appelée "schéma" ou "modèle de données") et valider automatiquement qu'elles respectent cette structure. FastAPI s'appuie fortement sur Pydantic pour valider les requêtes et les réponses de l'API.

Exemple : Un modèle Pydantic `class Usager(BaseModel): age: int` impose que le champ `age` soit bien un nombre entier.

### Random Forest

Random Forest (forêt aléatoire) est un algorithme de Machine Learning qui combine les prédictions de nombreux arbres de décision construits de façon légèrement différente, afin d'obtenir une prédiction finale plus stable et plus précise qu'un seul arbre.

Exemple : Une Random Forest peut être utilisée pour prédire le mode de transport principal d'un usager à partir de son profil.

### React

React est une bibliothèque JavaScript développée par Meta (Facebook), utilisée pour construire des interfaces utilisateur interactives en assemblant des composants réutilisables. Elle est très répandue pour créer des applications web modernes.

Exemple : L'interface du projet (formulaires, tableaux de bord, pages de connexion) est construite avec React.

### React Router

React Router est une bibliothèque qui permet de gérer la navigation entre différentes pages au sein d'une application React, sans recharger entièrement la page dans le navigateur.

Exemple : React Router permet de passer de la page "Accueil" à la page "Tableau de bord" en changeant simplement l'URL, sans rechargement complet.

### Recall (rappel)

Le recall mesure, parmi tous les cas réellement positifs présents dans les données, la proportion que le modèle a réussi à détecter. Un faible recall signifie que le modèle "manque" beaucoup de cas positifs réels.

Exemple : S'il existe 10 vraies anomalies dans les données et que le modèle en détecte seulement 6, son recall est de 60 %.

### Recharts

Recharts est une bibliothèque JavaScript permettant de créer des graphiques (courbes, barres, secteurs) dans une application React, en utilisant des composants réutilisables.

Exemple : Recharts peut être utilisé pour afficher un graphique en barres de la fréquentation des lignes de bus directement dans l'interface React.

### Régression Logistique

La régression logistique est un algorithme de Machine Learning utilisé pour des problèmes de classification, notamment binaire (deux catégories). Elle estime la probabilité qu'une observation appartienne à une catégorie donnée, à partir d'une combinaison de ses variables.

Exemple : La régression logistique peut estimer la probabilité qu'un usager utilise le bus plutôt que la voiture, selon son profil.

### REST (Representational State Transfer)

REST est un style d'architecture pour concevoir des API web, basé sur des principes simples : chaque ressource est identifiée par une URL, et les actions sur cette ressource utilisent des méthodes HTTP standards (GET, POST, PUT, DELETE).

Exemple : `GET /api/lignes` récupère la liste des lignes, tandis que `POST /api/lignes` en crée une nouvelle, selon les conventions REST.

### Route

En programmation web, une route associe une URL donnée à une fonction ou un composant précis qui doit être exécuté ou affiché. Côté backend, une route correspond à un endpoint ; côté frontend, elle correspond à une page.

Exemple : La route `/dashboard` affiche le composant React du tableau de bord, tandis que la route backend `/api/dashboard` renvoie les données correspondantes.

### Schéma en constellation

Un schéma en constellation (ou "galaxie") est une organisation de Data Warehouse dans laquelle plusieurs tables de faits partagent certaines tables de dimension communes. Il permet d'analyser plusieurs processus métier différents tout en réutilisant les mêmes axes d'analyse.

Exemple : Une table de faits "Déplacements" et une table de faits "Comptages de trafic" peuvent toutes deux partager la dimension "Zone" et la dimension "Date".

### Schéma en étoile (Star Schema)

Un schéma en étoile est une organisation simple de Data Warehouse dans laquelle une seule table de faits centrale est reliée directement à plusieurs tables de dimension, formant visuellement une étoile. C'est la structure la plus simple et la plus répandue pour un Data Warehouse.

Exemple : La table de faits "Ventes" reliée aux dimensions "Produit", "Client" et "Date" forme un schéma en étoile classique.

### Scrum

Scrum est une méthode de gestion de projet agile, qui organise le travail en cycles courts appelés sprints, avec des rôles définis (Product Owner, Scrum Master, équipe de développement) et des réunions régulières pour suivre l'avancement.

Exemple : L'équipe du projet peut organiser des sprints de deux semaines, chacun se terminant par une démonstration des fonctionnalités réalisées.

### Session

Une session représente une période pendant laquelle un utilisateur est reconnu comme connecté par une application, depuis sa connexion jusqu'à sa déconnexion ou l'expiration de son accès.

Exemple : Tant que le JWT stocké dans le localStorage est valide, la session de l'utilisateur reste active.

### SGBD (Système de Gestion de Base de Données)

Un SGBD est un logiciel qui permet de créer, stocker, organiser, modifier et interroger des données de façon structurée et sécurisée. PostgreSQL est un exemple de SGBD relationnel.

Exemple : Le SGBD garantit que deux utilisateurs ne peuvent pas modifier la même donnée en même temps de façon incohérente.

### SHAP (SHapley Additive exPlanations)

SHAP est une méthode qui permet d'expliquer les prédictions d'un modèle de Machine Learning, en attribuant à chaque variable (feature) une contribution précise à la prédiction finale. Elle aide à comprendre "pourquoi" un modèle a pris une décision donnée, même pour des modèles complexes.

Exemple : SHAP peut montrer que la "distance du trajet" est la variable qui a le plus contribué à faire classer un trajet comme anomalie.

### Single Page Application (SPA)

Une SPA est une application web qui charge une seule page HTML au départ, puis met à jour son contenu dynamiquement en JavaScript au fil de la navigation, sans recharger entièrement la page depuis le serveur. Cela rend la navigation plus rapide et plus fluide.

Exemple : L'application React du projet fonctionne comme une SPA : changer de page ne recharge pas tout le site, seul le contenu nécessaire est mis à jour.

### Sprint

Un sprint est une période de temps fixe et courte (souvent une à quatre semaines) dans la méthode Scrum, pendant laquelle l'équipe réalise un ensemble défini de tâches issues du Product Backlog.

Exemple : Pendant un sprint de deux semaines, l'équipe peut développer et tester le module d'export PDF des rapports.

### SQL (Structured Query Language)

SQL est le langage standard utilisé pour interroger, créer et manipuler les données stockées dans une base de données relationnelle comme PostgreSQL.

Exemple : La requête `SELECT * FROM lignes WHERE commune = 'Dakar';` récupère toutes les lignes de bus situées à Dakar.

### Standardisation / Scaling

La standardisation (ou scaling) est une étape de préparation des données qui consiste à transformer les variables numériques pour qu'elles aient une échelle comparable (souvent une moyenne de 0 et un écart-type de 1). Cela évite que des variables avec de grandes valeurs ne dominent artificiellement un modèle de Machine Learning.

Exemple : L'âge (0-100) et le revenu (0-1 000 000) sont mis à une échelle comparable avant d'entraîner un modèle, pour que le revenu ne domine pas artificiellement le calcul.

### Talend

Talend est un outil logiciel d'ETL (Extraction, Transformation, Chargement) qui permet de concevoir visuellement des processus d'intégration de données, depuis des sources variées jusqu'à un Data Warehouse, sans écrire tout le code manuellement.

Exemple : Un job Talend peut extraire les données brutes de l'EMD, les nettoyer, puis les charger automatiquement dans le Data Warehouse.

### Target (variable cible)

La target est la variable que l'on cherche à prédire grâce à un modèle de Machine Learning. C'est la "réponse" que le modèle apprend à estimer à partir des features.

Exemple : Si l'on veut prédire si un trajet est une anomalie ou non, la target est la colonne "est_anomalie" (oui/non).

### Transformation (ETL)

La transformation est la deuxième étape d'un processus ETL : elle consiste à nettoyer, corriger, normaliser et restructurer les données extraites pour qu'elles soient cohérentes et exploitables, avant leur chargement dans le Data Warehouse.

Exemple : Talend peut transformer les dates de l'enquête EMD pour qu'elles soient toutes au même format avant de les charger.

### Validation croisée

Voir "Cross Validation".

### Widget (Knowage)

Dans Knowage, un widget est un élément visuel individuel (un graphique, un tableau, une carte ou un indicateur chiffré) que l'on place sur un cockpit pour représenter une partie spécifique des données d'un dataset.

Exemple : Un widget "carte" peut afficher la répartition géographique des déplacements enregistrés dans l'EMD.

### XGBoost

XGBoost (eXtreme Gradient Boosting) est une implémentation optimisée et très performante de l'algorithme de Gradient Boosting, largement utilisée en Machine Learning pour sa rapidité et sa précision sur des données tabulaires.

Exemple : XGBoost peut être utilisé pour prédire la probabilité de retard d'un trajet de bus à partir de plusieurs variables (heure, ligne, météo, etc.).

---

## Termes spécifiques au domaine du transport urbain et de l'enquête EMD

### CETUD (Conseil Exécutif des Transports Urbains de Dakar)

Le CETUD est l'autorité organisatrice des transports urbains dans l'agglomération de Dakar, au Sénégal. Il est chargé de planifier, coordonner et réguler les différents modes de transport public de la région.

### EMD (Enquête Ménages Déplacements)

Une EMD est une enquête statistique réalisée auprès d'un échantillon de ménages d'un territoire, visant à recueillir des informations détaillées sur leurs habitudes de déplacement quotidien (motifs, modes de transport utilisés, horaires, durées, origines et destinations). Les résultats permettent d'orienter les politiques de transport et d'aménagement urbain.

Exemple : Une EMD peut révéler que la majorité des déplacements domicile-travail à Dakar se font en transport collectif aux heures de pointe.

### Mode de transport

Le mode de transport désigne le moyen utilisé pour effectuer un déplacement : marche à pied, bus, taxi, voiture particulière, moto, etc. C'est une variable centrale dans l'analyse des enquêtes de mobilité comme l'EMD.

### Mobilité urbaine

La mobilité urbaine désigne l'ensemble des déplacements effectués par les habitants d'une ville, ainsi que les moyens, infrastructures et services qui les permettent. Elle est au cœur des politiques de transport public.

### Origine-Destination (matrice OD)

Une matrice origine-destination est un tableau qui recense, pour un territoire donné, le nombre de déplacements effectués entre chaque zone d'origine et chaque zone de destination. C'est un outil clé pour planifier les réseaux de transport.

Exemple : Une matrice OD peut montrer que de nombreux déplacements partent de la zone de Pikine vers le centre-ville de Dakar chaque matin.

---

## Résumé

Ce glossaire définit, par ordre alphabétique, plus de 70 termes techniques mobilisés dans le projet : développement web (React, FastAPI, API REST, JSON, JWT), ETL et Data Warehouse (Talend, schémas en étoile et en constellation, faits, dimensions), Machine Learning (algorithmes de classification, clustering, métriques d'évaluation), BI (Knowage) et gestion de projet (Scrum). Une section complémentaire couvre le vocabulaire métier du transport urbain (CETUD, EMD, mobilité). Chaque entrée propose une définition simple et un exemple concret, pour un lecteur sans prérequis technique.
