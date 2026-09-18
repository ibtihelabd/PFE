# 10 — Foire aux questions de soutenance (TransportDakar / CETUD)

> Ce document rassemble plus de 100 questions susceptibles d'être posées lors de la soutenance du PFE, organisées par domaine. Chaque question est strictement traçable à l'un des neuf documents techniques précédents (`01_Architecture.md` à `09_Integration.md`, `11_Glossaire.md`). Aucun fait technique n'est inventé : lorsqu'une question touche un point non documenté dans le code ou les sources fournies, la réponse l'indique explicitement comme « information non disponible / non implémenté » plutôt que d'improviser une explication plausible mais non vérifiée. Format de chaque entrée : **Q** (question), **Réponse courte** (1 à 3 phrases, pour l'oral sous pression), **Réponse détaillée** (explication pédagogique complète), **⚠️ Piège possible** (ce qu'un jury pourrait creuser, ou une vraie faiblesse à présenter intelligemment), **💡 Conseil** (comment formuler la réponse à l'oral).

---

## Section 1 — Architecture générale

### Q1. Pouvez-vous présenter l'architecture générale de votre projet en une minute ?

**Réponse courte** : TransportDakar est composé de deux chaînes indépendantes : une chaîne applicative (React + FastAPI + modèles de Machine Learning) destinée aux citoyens et décideurs, et une chaîne décisionnelle (Talend + Data Warehouse PostgreSQL + Knowage) destinée au reporting BI. Les deux partent des mêmes données brutes du CETUD mais ne se recroisent jamais après la lecture initiale des fichiers sources.

**Réponse détaillée** : Le projet répond à un besoin du CETUD (Conseil Exécutif des Transports Urbains de Dakar) d'exploiter les données de l'enquête EMD (Enquête Ménages Déplacements) et des comptages de trafic routier, à la fois pour une application citoyenne (planification de trajet, simulateur de risque, avis citoyens) et pour un système de pilotage décisionnel (cockpit BI). Architecturalement, la chaîne applicative repose sur React (port 3000) qui consomme une API FastAPI (port 8000, 18 endpoints REST), laquelle charge au démarrage des modèles scikit-learn sérialisés (`.pkl` via joblib) ainsi que des fichiers de métadonnées JSON — sans aucune base de données relationnelle. La chaîne décisionnelle part des mêmes types de fichiers Excel/CSV CETUD, les fait transiter par des jobs Talend Open Studio vers un schéma de staging PostgreSQL (`SA`), puis vers un Data Warehouse en modèle constellation (schéma `DW`, 4 faits, 10 dimensions), restitué ensuite via des cockpits Knowage.

**⚠️ Piège possible** : le jury peut demander où, concrètement, les deux chaînes se rencontrent. La seule réponse honnête est : nulle part au niveau des données — uniquement à l'affichage, via la page React `CockpitDakar.jsx` qui montre le cockpit Knowage dans une iframe.

**💡 Conseil** : présentez ce découplage comme un choix architectural assumé (justifié par les besoins différents de granularité), pas comme un oubli. Préparez le schéma à deux blocs pour l'illustrer au tableau si besoin.

---

### Q2. Pourquoi avoir conçu deux systèmes séparés plutôt qu'une architecture unique ?

**Réponse courte** : Parce que les deux chaînes ont des besoins de granularité incompatibles — le Data Warehouse agrège pour le reporting, alors que le Machine Learning a besoin de données individuelles fines ; les coupler aurait créé une dépendance inutile.

**Réponse détaillée** : `07_MachineLearning.md` documente quatre justifications concrètes observées dans le code : (1) besoin de variables individuelles non agrégées pour le clustering/classification, alors qu'un DWH stocke des faits déjà résumés ; (2) découplage total — si l'ETL Talend échoue ou si le DWH est en maintenance, l'entraînement ML n'est pas affecté ; (3) itération rapide — les scripts ML montrent des cycles de correction très courts ("v2", "CORRECTION bug...") qui seraient ralentis par un cycle ETL batch ; (4) conservation de variables très fines de l'enquête ménage (ex. disponibilité de 8 types de TC sous la pluie) qui n'ont pas vocation à devenir des dimensions décisionnelles.

**⚠️ Piège possible** : le jury peut interpréter cela comme un manque de planification. Il faut au contraire montrer que c'est un choix défendable techniquement, pas un raccourci pris par manque de temps.

**💡 Conseil** : ne dites jamais "on n'a pas eu le temps de les relier" — dites "nous avons choisi de les découpler pour préserver la granularité nécessaire au ML et l'indépendance des deux pipelines".

---

### Q3. Quel est le seul point de jonction entre les deux chaînes dans le code ?

**Réponse courte** : La page React `CockpitDakar.jsx`, qui affiche le cockpit Knowage dans une iframe au sein de l'espace décideurs, sans aucun appel API entre les deux mondes.

**Réponse détaillée** : `CockpitDakar.jsx` ne fait aucun `fetch()` vers FastAPI. Elle pointe une balise `<iframe>` vers `/knowage-vue/workspace/document-composite/Acceuil`, rendue accessible en same-origin grâce à un proxy de développement (`setupProxy.js`) qui redirige vers `http://localhost:18080`. C'est une intégration purement visuelle (affichage), pas un échange de données JSON.

**⚠️ Piège possible** : ne pas confondre "intégration d'affichage" avec "intégration de données" — le jury peut tester cette distinction précisément.

**💡 Conseil** : illustrez avec l'analogie d'une fenêtre : on regarde par une fenêtre dans une autre pièce, mais on n'y entre pas.

---

### Q4. Quelle est la pile technologique complète du projet ?

**Réponse courte** : React 18.3.1 (frontend), FastAPI + Pydantic 2.7.1 (backend), scikit-learn/joblib (ML), PostgreSQL (Data Warehouse), Talend Open Studio (ETL), Knowage (BI).

**Réponse détaillée** : Côté applicatif : React (Create React App, sans TypeScript), `fetch` natif (pas d'axios), `recharts` pour les graphiques, Leaflet (vanilla, pas react-leaflet) pour les cartes, jsPDF pour l'export PDF côté client. Côté backend : FastAPI avec uvicorn comme serveur ASGI, validation via Pydantic, scikit-learn pour tous les modèles (K-Means, Random Forest, Gradient Boosting, Isolation Forest, Local Outlier Factor, DBSCAN), joblib pour la sérialisation. Côté décisionnel : PostgreSQL avec schémas `SA` (staging) et `DW` (Data Warehouse), Talend Open Studio pour l'ETL, Knowage pour la restitution BI.

**⚠️ Piège possible** : un jury technique peut demander pourquoi pas TypeScript, ou pourquoi pas un ORM côté backend — répondre honnêtement qu'aucune des sources ne documente l'usage de TypeScript ni d'ORM (SQLAlchemy absent), le backend applicatif n'utilisant aucune base de données relationnelle.

**💡 Conseil** : préparez une réponse classée par couche (frontend / backend / ML / données / BI) plutôt qu'une liste en vrac, pour montrer une vision structurée.

---

### Q5. Le projet utilise-t-il une architecture microservices ?

**Réponse courte** : Non, le backend est un monolithe : un seul fichier `main.py` de 823 lignes concentre chargement des modèles, schémas Pydantic et les 18 endpoints.

**Réponse détaillée** : `03_Backend_FastAPI.md` confirme qu'il n'existe ni dossier `routers/`, ni `services/`, ni séparation modulaire — tout est dans un seul fichier exécuté par un seul process uvicorn. Il n'y a pas non plus de conteneurisation (Docker) ni d'orchestration documentée dans les sources.

**⚠️ Piège possible** : le jury peut demander si cela posera problème à l'échelle. Reconnaître que oui, c'est une limite identifiée, mais cohérente avec un périmètre de PFE.

**💡 Conseil** : présentez la modularisation (`routers/`, `services/`) comme une piste d'amélioration explicite plutôt que de défendre le monolithe comme un choix définitif.

---

### Q6. Le système est-il actuellement déployé en production ?

**Réponse courte** : Non, rien dans les sources ne documente un déploiement en production — le projet fonctionne en environnement de développement local (`localhost:3000` / `localhost:8000`).

**Réponse détaillée** : Le CORS est explicitement restreint à `http://localhost:3000`, ce qui n'aurait aucun sens en production avec un nom de domaine réel. Les chemins de fichiers codés en dur (chemins Windows personnels du développeur) confirment également un contexte de développement, pas de déploiement industrialisé.

**⚠️ Piège possible** : ne pas prétendre qu'il existe un environnement de production alors qu'aucune preuve de cela n'existe dans le code.

**💡 Conseil** : présentez cela comme un prototype fonctionnel/preuve de concept, étape normale avant une éventuelle mise en production qui nécessiterait les améliorations de sécurité et d'infrastructure identifiées.

---

### Q7. Quels rôles utilisateurs existent dans l'application ?

**Réponse courte** : Deux rôles décideurs gérés côté serveur — "planificateur" (accès complet, incluant les insights ML) et "exploitation" (accès restreint, sans les insights ML) — plus un accès citoyen public sans authentification.

**Réponse détaillée** : Les comptes décideurs sont désormais définis côté serveur dans `DECIDEURS_DB` (`main.py`) : `planification`/`plan2025` (rôle planificateur, avec accès à `ml-insights`) et `exploitation`/`expl2025` (rôle exploitation, sans cet accès). Le frontend (`auth.js`) ne conserve que des informations d'affichage pour pré-remplir le formulaire de connexion. Le contrôle d'accès (RBAC) repose toujours sur une liste `allowedRoutes` par rôle, vérifiée côté frontend uniquement — le backend vérifie qu'un JWT valide existe, mais ne distingue pas finement les rôles pour bloquer un endpoint spécifique.

**⚠️ Piège possible** : ce RBAC fin par rôle n'est vérifié que côté client — un utilisateur authentifié avec un JWT valide (quel que soit son rôle) peut toujours appeler n'importe quel endpoint décideur protégé, l'API ne filtrant que la présence d'un token valide, pas le rôle exact.

**💡 Conseil** : soyez transparent sur cette limite dès que la question de la sécurité est posée — c'est un point que le jury testera presque certainement.

---

### Q8. Pourquoi le CORS est-il limité à `localhost:3000` ?

**Réponse courte** : Pour n'autoriser que le frontend React du projet à appeler l'API depuis un navigateur, conformément à la configuration observée dans `main.py`.

**Réponse détaillée** : Le CORS (Cross-Origin Resource Sharing) est un mécanisme de sécurité des navigateurs, pas du serveur : il empêche un site web tiers d'appeler l'API depuis le navigateur d'un utilisateur sans autorisation explicite. La configuration de `main.py` autorise uniquement l'origine `http://localhost:3000`.

**⚠️ Piège possible** : le jury peut demander si CORS protège contre un attaquant utilisant `curl` ou Postman. La réponse honnête est non — CORS ne protège que les requêtes initiées par un navigateur depuis une origine non autorisée, pas les appels directs à l'API.

**💡 Conseil** : démontrez que vous comprenez la différence entre CORS et une authentification réelle — c'est un point de compréhension technique souvent testé.

---

### Q9. Le projet répond-il à un besoin réel du CETUD ?

**Réponse courte** : Oui, il s'appuie sur de vraies données d'enquête CETUD (EMD, comptages trafic) pour répondre à des besoins concrets de planification de mobilité urbaine et de pilotage décisionnel.

**Réponse détaillée** : Les données sources (fichiers Excel `CETUD_BD_EMD_INDIVIDU_COMPILE.xls`, `CETUD_BD_EMD_MENAGE_COMPILE.xls`, `Trafic.csv`) sont des données réelles de l'Enquête Ménages Déplacements et des comptages de trafic du CETUD. Le projet adresse des besoins identifiés (accessibilité aux services, recommandation de transport, détection d'anomalies de trafic, reporting BI).

**⚠️ Piège possible** : ne pas surestimer la maturité — c'est un démonstrateur académique basé sur des données réelles, pas un système validé en exploitation par le CETUD.

**💡 Conseil** : insistez sur l'authenticité des données utilisées, qui donne de la crédibilité au travail, tout en restant honnête sur le niveau de maturité (PFE, pas produit final).

---

### Q10. Quels sont, selon vous, les trois points forts architecturaux du projet ?

**Réponse courte** : La séparation claire des responsabilités entre chaînes ML et BI, le chargement unique des modèles en mémoire pour la performance, et la validation systématique des entrées via Pydantic.

**Réponse détaillée** : (1) Le découplage ML/BI évite les dépendances croisées fragiles. (2) Les modèles `.pkl` sont chargés une seule fois au démarrage de `main.py`, évitant un rechargement coûteux à chaque requête. (3) Pydantic avec des contraintes `Field(ge=, le=)` rejette automatiquement les entrées hors bornes (code HTTP 422) avant toute logique métier, ce qui sécurise les endpoints contre des données malformées.

**⚠️ Piège possible** : si on vous demande un quatrième point fort, ne pas inventer — rester sur ceux confirmés par les documents.

**💡 Conseil** : ayez toujours 2-3 points forts prêts à énoncer rapidement en ouverture de soutenance pour donner le ton.

---

## Section 2 — Frontend React

### Q11. Pourquoi avoir choisi React plutôt qu'un autre framework ?

**Réponse courte** : Information non disponible dans les sources fournies — aucun document ne justifie explicitement ce choix par rapport à Vue, Angular ou autre.

**Réponse détaillée** : Les documents décrivent en détail l'implémentation React (Create React App, composants, hooks, routing) mais ne contiennent aucune justification comparative du choix de React face à d'autres frameworks. C'est un point qui devra être complété à l'oral à partir de votre expérience personnelle (familiarité avec l'écosystème, écosystème de composants disponibles comme recharts).

**⚠️ Piège possible** : ne pas inventer une justification technique sophistiquée qui ne serait pas dans le code — admettre que c'est un choix d'équipe/expérience si la documentation ne le formalise pas.

**💡 Conseil** : répondez avec assurance sur des critères généraux (popularité, écosystème, courbe d'apprentissage) sans prétendre que c'est documenté dans le rapport.

---

### Q12. Pourquoi utiliser `fetch` natif plutôt qu'axios ?

**Réponse courte** : Le projet n'a pas de dépendance axios ; tous les appels API utilisent l'API `fetch` native du navigateur.

**Réponse détaillée** : `02_Frontend.md` confirme l'absence d'axios dans les dépendances. Chaque composant qui consomme l'API construit ses appels avec `fetch()` directement, ce qui évite une dépendance supplémentaire mais implique de gérer manuellement certains aspects (parsing JSON, gestion d'erreurs) qu'axios automatiserait.

**⚠️ Piège possible** : cela contribue à la duplication de code observée (l'URL de l'API étant répétée dans au moins 9 fichiers, sans fichier de configuration centralisé).

**💡 Conseil** : reconnaissez que ce choix a un coût en duplication, et proposez la centralisation via une variable d'environnement (`REACT_APP_API_URL`) comme amélioration.

---

### Q13. Comment fonctionne l'authentification décideurs côté frontend ?

**Réponse courte** : `auth.js` appelle `POST /auth/login` côté backend, qui renvoie un JWT signé HS256 (valable 60 minutes) stocké en `localStorage` ; la vérification des identifiants se fait désormais côté serveur.

**Réponse détaillée** : Le frontend ne contient plus que des informations d'affichage (`USERS`, login/mot de passe de démonstration pour pré-remplir le formulaire). `login(loginInput, passwordInput)` est maintenant asynchrone : elle envoie ces identifiants à `POST /auth/login`, où FastAPI les vérifie contre `DECIDEURS_DB` (côté serveur) et renvoie `{access_token, token_type, expires_in_min, user}`. Le `access_token` (JWT) est stocké sous la clé `dtk_session` dans `localStorage`, remplaçant l'ancien encodage Base64 maison. `getSession()` décode localement le payload du JWT pour l'affichage UI, et vérifie son expiration (`exp`).

**⚠️ Piège possible** : le jury peut demander de décoder la partie payload d'un JWT en direct — c'est normal et ne révèle aucune faille, car cette partie est publique par construction sur tout JWT ; la sécurité vient de la signature, pas du secret du contenu.

**💡 Conseil** : présentez ce mécanisme comme une vraie authentification serveur, tout en assumant la limite résiduelle : les mots de passe restent stockés en clair dans `DECIDEURS_DB`, sans hashing.

---

### Q14. Le token d'authentification est-il vérifié côté serveur ?

**Réponse courte** : Oui, pour les 13 endpoints décideurs — la dependency `get_current_decideur` vérifie la signature et l'expiration du JWT à chaque appel.

**Réponse détaillée** : `03_Backend_FastAPI.md` confirme l'ajout de `Depends(get_current_decideur)` sur 13 endpoints (`/segments`, `/zones-risque`, `/api/ml/metrics`, etc.). Cette dependency lit l'en-tête `Authorization: Bearer <token>`, décode et valide le JWT (signature HS256 + expiration), et lève une `HTTPException(401)` si le token est absent, invalide ou expiré. Le RBAC fin par rôle (`allowedRoutes`), lui, reste uniquement côté React — le backend vérifie qu'un JWT valide existe, mais ne distingue pas "planificateur" de "exploitation" pour bloquer un endpoint spécifique. Les 5 endpoints citoyens restent volontairement publics, sans vérification.

**⚠️ Piège possible** : ne pas dire que tous les 18 endpoints sont protégés — seuls les 13 endpoints décideurs le sont ; ne pas dire non plus qu'il existe un RBAC fin côté backend, ce qui n'est pas le cas.

**💡 Conseil** : présentez la vérification JWT comme acquise, mais mentionnez les limites résiduelles si la question est creusée (mots de passe en clair, pas de refresh token, pas de RBAC backend fin).

---

### Q15. Pourquoi avoir utilisé Leaflet "vanilla" plutôt que react-leaflet ?

**Réponse courte** : Pour éviter un conflit de "double instance React" documenté dans un commentaire du code source de `MapView.jsx`.

**Réponse détaillée** : Le composant `MapView.jsx` manipule directement l'API JavaScript de Leaflet plutôt que d'utiliser le wrapper React `react-leaflet`. Le code contient un commentaire expliquant que cela évite un conflit connu de double instance React qui peut survenir avec certaines configurations de `react-leaflet`.

**⚠️ Piège possible** : le jury peut demander pourquoil ce conflit existe précisément — si vous ne maîtrisez pas le détail technique exact de la cause root du conflit react-leaflet, dites que c'est un choix défensif documenté en commentaire, sans sur-détailler une cause non confirmée par les sources.

**💡 Conseil** : valorisez ce choix comme une décision technique réfléchie et documentée dans le code (pas un hasard), preuve de rigueur.

---

### Q16. Comment fonctionne l'export PDF des rapports ?

**Réponse courte** : Entièrement côté client, via jsPDF importé dynamiquement, sans serveur dédié à la génération de PDF.

**Réponse détaillée** : Le composant `ExportPDF.jsx` construit le PDF directement dans le navigateur à partir des données déjà affichées à l'écran (zones à risque ou anomalies), avec un import dynamique de la bibliothèque jsPDF. Les chiffres intégrés sont réels (issus de l'API), mais le texte des recommandations qui accompagne le rapport est un modèle de phrase pré-écrit en français, simplement paramétré par quelques valeurs réelles.

**⚠️ Piège possible** : ces recommandations textuelles ne sont pas générées dynamiquement par une IA ou un calcul — c'est du texte conditionnel codé en dur ("fake-statique"), un point à ne pas présenter comme une fonctionnalité plus intelligente qu'elle ne l'est.

**💡 Conseil** : dites clairement que les données numériques sont réelles et calculées, mais que la formulation textuelle des conseils est un template — c'est une nuance honnête qui rassure un jury attentif plutôt que de le laisser découvrir la supercherie lui-même.

---

### Q17. Pourquoi la page "Évolution temporelle" n'appelle-t-elle aucune API ?

**Réponse courte** : Parce qu'elle affiche des données statiques stockées dans un fichier JavaScript local (`data/evolutionData.js`), et seules deux des quatre années affichées sont réelles.

**Réponse détaillée** : Le composant `EvolutionTemporelle.jsx` ne fait aucun appel `fetch`. Sur les quatre années comparées (2010, 2015, 2019, 2023), seules 2015 (données EMD) et 2019 (données de comptage trafic) sont réelles ; 2010 et 2023 sont explicitement présentées dans le code comme reconstituées/projetées à but pédagogique.

**⚠️ Piège possible** : si le jury demande la fiabilité de cette page, il ne faut pas affirmer que les quatre années sont des données mesurées — deux le sont, deux sont des extrapolations explicitement signalées comme telles.

**💡 Conseil** : présentez cette transparence (le code lui-même indique quelles données sont réelles ou projetées) comme une preuve de rigueur méthodologique plutôt que de cacher cette nuance.

---

### Q18. Quelles sont les limites de code observables côté frontend ?

**Réponse courte** : Duplication de l'URL d'API dans 9+ fichiers, fichiers `.bak` non nettoyés (au moins 12), style 100 % inline, et logique métier mélangée à la présentation.

**Réponse détaillée** : `02_Frontend.md` (section 12.2) documente concrètement ces points : l'URL `http://localhost:8000` est répétée en dur dans au moins 9 fichiers React sans fichier `.env` centralisé ; au moins 12 fichiers `.jsx.bak` coexistent avec leur version active dans le dépôt ; aucun CSS Module ou styled-components n'est utilisé pour les pages décideurs, avec des fichiers JSX de 300 à 700+ lignes contenant du `style={{...}}` partout.

**⚠️ Piège possible** : ces points sont vérifiables directement en ouvrant le dépôt — ne pas les nier si le jury les constate lui-même.

**💡 Conseil** : présentez-les en bloc comme des axes d'amélioration identifiés (nettoyage du dépôt, centralisation de configuration, modularisation CSS), démontrant une auto-critique constructive.

---

### Q19. Comment le thème clair/sombre est-il géré côté React ?

**Réponse courte** : Via `theme.js`, qui bascule des variables CSS pour styliser l'ensemble de l'application en mode clair ou sombre.

**Réponse détaillée** : Le mécanisme repose sur des variables CSS modifiées dynamiquement selon le thème sélectionné, persistantes pour l'expérience utilisateur des pages décideurs (cartes, listes, graphiques).

**⚠️ Piège possible** : ne pas confondre ce mécanisme React (variables CSS pilotées en JavaScript) avec le mécanisme 100 % CSS (`:has()`) utilisé côté Knowage — ce sont deux implémentations différentes du même concept de thème sombre, dans deux systèmes distincts du projet.

**💡 Conseil** : si la question porte sur "le" mode sombre du projet, demandez ou précisez si elle concerne React ou Knowage — la réponse technique est différente dans les deux cas.

---

### Q20. Comment l'intégration du cockpit Knowage dans React fonctionne-t-elle techniquement ?

**Réponse courte** : Via une iframe dans `CockpitDakar.jsx`, rendue same-origin grâce à un proxy de développement (`setupProxy.js`) qui redirige vers le serveur Knowage local.

**Réponse détaillée** : `setupProxy.js` redirige les requêtes vers `http://localhost:18080` (serveur Knowage), ce qui permet à la page React de charger le cockpit dans une iframe en évitant les restrictions de sécurité liées aux origines croisées (cross-origin), et potentiellement de manipuler le DOM de l'iframe (changement d'onglet interne par simulation).

**⚠️ Piège possible** : cette intégration dépend d'un environnement de développement particulier (proxy local) — sa portabilité en production n'est pas démontrée dans les sources.

**💡 Conseil** : expliquez le rôle du proxy comme solution au problème classique des iframes cross-origin, ce qui démontre une compréhension des contraintes de sécurité web.

---

## Section 3 — Backend FastAPI

### Q21. Combien d'endpoints le backend expose-t-il réellement, et cela correspond-il à la documentation ?

**Réponse courte** : 18 endpoints réels dans `main.py`, alors que le `README.md` du projet n'en documente que 5.

**Réponse détaillée** : `03_Backend_FastAPI.md` établit un inventaire complet des 18 endpoints (recommandation de mode, simulation de risque, zones à risque, anomalies, segmentation, satisfaction, feedback citoyen, métriques ML...). Le `README.md` ne documente que 5 d'entre eux, ce qui constitue une désynchronisation documentaire explicitement relevée.

**⚠️ Piège possible** : si le jury a lu le README avant la soutenance, il peut être surpris par le nombre réel d'endpoints — anticipez cette question en la mentionnant vous-même.

**💡 Conseil** : présentez cette désynchronisation comme un point d'amélioration de maintenance documentaire, pas comme une dissimulation volontaire.

---

### Q22. Le backend est-il asynchrone ?

**Réponse courte** : Non, toutes les fonctions sont définies en `def` synchrone, alors que FastAPI permettrait l'asynchrone (`async def`).

**Réponse détaillée** : `03_Backend_FastAPI.md` (sections 1.2 et 8.2) confirme que `main.py` n'utilise jamais `async def`. Cela signifie que chaque requête est traitée de façon bloquante, ce qui peut limiter la capacité de montée en charge si le nombre d'utilisateurs simultanés augmente fortement.

**⚠️ Piège possible** : ne pas dire que FastAPI est "automatiquement asynchrone" — l'asynchronisme dépend de la façon dont les fonctions sont écrites, et ici elles sont toutes synchrones.

**💡 Conseil** : présentez le passage à l'asynchrone comme une optimisation de performance possible, pas une obligation pour un projet de cette taille avec un usage modéré.

---

### Q23. Le backend utilise-t-il une base de données relationnelle ?

**Réponse courte** : Non — aucun import de `sqlalchemy`, `psycopg2` ou tout autre connecteur de base de données n'existe dans `main.py`.

**Réponse détaillée** : Toute la persistance de la chaîne applicative repose sur des fichiers : modèles `.pkl` (chargés via joblib), métadonnées `.json` (lues une fois au démarrage ou à la volée), et un seul fichier en écriture (`feedback_citoyens.json`) pour les avis citoyens. Ceci est cohérent avec le constat global du document `09_Integration.md` : l'application citoyenne fonctionne entièrement sans moteur de base de données relationnelle.

**⚠️ Piège possible** : ne pas confondre avec la chaîne décisionnelle, qui elle utilise bien PostgreSQL (schémas `SA`/`DW`) — ce sont deux systèmes différents.

**💡 Conseil** : soyez précis sur le périmètre de la question : "le backend FastAPI applicatif" n'a pas de base relationnelle, mais "le projet dans son ensemble" en a une, côté décisionnel.

---

### Q24. Comment l'API gère-t-elle la persistance des avis citoyens ?

**Réponse courte** : En réécrivant intégralement un fichier `feedback_citoyens.json` à chaque nouvel avis, via `json.dump()`, sans verrou de concurrence.

**Réponse détaillée** : C'est le seul fichier sur lequel l'API FastAPI écrit réellement. À chaque soumission via `POST /api/feedback`, le fichier entier est rechargé, l'avis ajouté, puis le fichier entier est réécrit. Il n'existe aucun mécanisme de verrouillage pour empêcher deux écritures simultanées de se corrompre mutuellement.

**⚠️ Piège possible** : en cas de forte charge ou de requêtes concurrentes, ce mécanisme présente un risque réel de corruption de données ou de perte d'avis — un jury technique peut souligner ce risque.

**💡 Conseil** : proposez spontanément l'amélioration : remplacer ce stockage JSON par une base légère (SQLite a minima) pour gérer la concurrence, montrant que vous avez anticipé cette limite.

---

### Q25. Quelles validations Pydantic existent sur les entrées de l'API ?

**Réponse courte** : Des contraintes de type et de bornes (`Field(ge=, le=)`) qui rejettent automatiquement les requêtes invalides avec un code HTTP 422, avant toute exécution de logique métier.

**Réponse détaillée** : Les modèles Pydantic (`ProfilUsager`, `InaccessibiliteSimulationInput`, `FeedbackCitoyen`, etc.) définissent des contraintes précises sur chaque champ (âge minimum/maximum, plages de revenus, etc.). FastAPI valide automatiquement chaque requête entrante contre ces schémas avant que le code métier ne s'exécute, ce qui évite d'avoir à écrire des vérifications manuelles répétitives.

**⚠️ Piège possible** : cette validation protège contre des données malformées, mais ne remplace pas une authentification — un attaquant peut toujours envoyer des données valides en grand nombre (absence de rate limiting).

**💡 Conseil** : présentez Pydantic comme une bonne pratique de robustesse des données, tout en précisant clairement qu'elle ne couvre pas la sécurité d'accès.

---

### Q26. Que se passe-t-il en cas d'erreur interne dans l'API ?

**Réponse courte** : Plusieurs endpoints renvoient `HTTPException(500, detail=str(e))`, ce qui expose potentiellement le message d'erreur brut de Python au client.

**Réponse détaillée** : `03_Backend_FastAPI.md` (sections 4.3 et 8.2) relève ce point comme un risque de fuite d'information : un message d'exception Python peut révéler des chemins de fichiers internes, des noms de colonnes de données, ou d'autres détails d'implémentation à un client externe, ce qui facilite la reconnaissance d'un système par un attaquant potentiel.

**⚠️ Piège possible** : ne pas dire que les erreurs sont "gérées proprement" si on vous interroge dessus — c'est un point de sécurité concret et vérifiable dans le code.

**💡 Conseil** : reconnaissez ce point et proposez la solution standard : des messages d'erreur génériques pour le client, avec le détail complet seulement dans les logs serveur.

---

### Q27. Le backend a-t-il un système de limitation de débit (rate limiting) ?

**Réponse courte** : Non, aucun rate limiting n'existe sur les 18 endpoints, y compris les endpoints publics d'écriture comme `/api/feedback`.

**Réponse détaillée** : Cette absence est documentée explicitement comme un risque de sécurité : un endpoint public sans authentification ni limitation de débit pourrait être la cible d'un déni de service trivial, simplement en envoyant un grand nombre de requêtes rapidement (spam de feedback, par exemple).

**⚠️ Piège possible** : c'est un risque concret et facile à démontrer en direct si le jury le demande (en théorie).

**💡 Conseil** : citez une solution standard connue (middleware de limitation par IP, ex. `slowapi`) comme piste d'amélioration immédiate et peu coûteuse à implémenter.

---

### Q28. Existe-t-il des tests automatisés pour le backend ?

**Réponse courte** : Non, aucun fichier de test n'a été trouvé dans le périmètre backend fourni.

**Réponse détaillée** : `03_Backend_FastAPI.md` (section 8.3) confirme l'absence de tests automatisés, aussi bien côté backend que côté frontend (`09_Integration.md`, section 7.2). Cela signifie qu'aucune régression n'est détectée automatiquement lors de modifications du code.

**⚠️ Piège possible** : c'est une lacune classique de projet académique — ne pas tenter de la minimiser, elle est facilement vérifiable par le jury en parcourant le dépôt.

**💡 Conseil** : présentez l'ajout de tests (pytest pour le backend, Jest/React Testing Library pour le frontend) comme une priorité claire d'industrialisation future.

---

### Q29. Comment les modèles ML sont-ils chargés par le backend, et quand ?

**Réponse courte** : Une seule fois, au démarrage du serveur FastAPI, via `joblib.load()`, puis conservés en mémoire pour toute la durée de vie du process.

**Réponse détaillée** : `main.py` charge au démarrage tous les fichiers `.pkl` nécessaires (modèles K-Means, Random Forest, Gradient Boosting, leurs imputers/scalers/encoders associés) ainsi que les métadonnées JSON. Aucune requête ne déclenche un rechargement depuis le disque — chaque appel à un endpoint de prédiction réutilise les objets déjà en mémoire.

**⚠️ Piège possible** : cela implique qu'une mise à jour des modèles (nouveau `.pkl` après ré-entraînement) nécessite un redémarrage manuel du serveur uvicorn — il n'y a pas de rechargement à chaud.

**💡 Conseil** : présentez ce choix comme une bonne pratique de performance (éviter de recharger un modèle lourd à chaque requête), tout en mentionnant la contrainte opérationnelle qui l'accompagne.

---

### Q30. Quelles sont, selon vous, les trois limites les plus importantes du backend ?

**Réponse courte** : Les mots de passe stockés en clair côté serveur (malgré le JWT en place), l'architecture monolithique non modulaire, et l'absence de tests automatisés.

**Réponse détaillée** : Ces trois points sont documentés de façon convergente dans `03_Backend_FastAPI.md` et `09_Integration.md` comme les limites structurelles les plus significatives, avec un impact direct sur la sécurité, la maintenabilité et la fiabilité à long terme du système.

**⚠️ Piège possible** : si on vous demande d'en citer une quatrième, vous pouvez ajouter l'absence de rate limiting ou la non-asynchronicité, toutes deux documentées également.

**💡 Conseil** : ayez ce triptyque mémorisé par cœur — c'est très probablement une question directe en soutenance.

---

## Section 4 — Sécurité

### Q31. Quelle est la faille de sécurité la plus critique du projet ?

**Réponse courte** : Les mots de passe stockés en clair côté serveur dans `DECIDEURS_DB`, sans hashing — malgré la présence d'un JWT signé pour la vérification des requêtes.

**Réponse détaillée** : `main.py` importe désormais `jwt` (PyJWT) et protège 13 des 18 endpoints via `Depends(get_current_decideur)`, qui vérifie la signature HS256 et l'expiration du token. Cela empêche un attaquant d'appeler directement ces endpoints (curl, Postman) sans détenir un JWT valide. La faille résiduelle est ailleurs : `DECIDEURS_DB` ne hash pas les mots de passe, et le RBAC fin par rôle (`allowedRoutes`) reste uniquement côté React — un utilisateur authentifié avec un JWT valide peut appeler n'importe quel endpoint décideur protégé, quel que soit son rôle réel.

**⚠️ Piège possible** : ne pas dire que le RBAC frontend "sécurise" l'accès par rôle — il ne sécurise que l'affichage de l'interface ; ne pas dire non plus que les endpoints décideurs restent ouverts sans token, ce n'est plus le cas depuis l'ajout du JWT.

**💡 Conseil** : nommez ce point vous-même en début de soutenance si vous sentez que la sécurité sera abordée — l'anticiper donne une impression de maîtrise plutôt que d'être pris au dépourvu.

---

### Q32. Le mécanisme d'authentification frontend (JWT) est-il sécurisé ?

**Réponse courte** : Le token est un JWT signé HS256 vérifié côté serveur — il n'est plus falsifiable sans connaître `JWT_SECRET`, mais des limites résiduelles subsistent (mots de passe en clair, pas de refresh token).

**Réponse détaillée** : `auth.js` n'encode plus rien lui-même : le token est délivré par `POST /auth/login` côté FastAPI, qui le signe avec `JWT_SECRET` (variable d'environnement, côté serveur uniquement) et l'algorithme HS256. N'importe qui peut décoder la partie *payload* du token (c'est normal et public sur tout JWT), mais ne peut pas le modifier ou en forger un nouveau valide sans connaître `JWT_SECRET` — toute altération invaliderait la signature, détectée par `get_current_decideur` à la prochaine requête. La limite réelle n'est donc plus la falsifiabilité du token, mais le fait que `DECIDEURS_DB` stocke les mots de passe en clair côté serveur, et qu'il n'existe ni refresh token ni révocation serveur.

**⚠️ Piège possible** : le jury peut décoder la partie payload d'un token en direct en pensant démontrer une faille — il faut expliquer que c'est attendu et sans conséquence : la sécurité d'un JWT repose sur sa signature, pas sur la confidentialité de son contenu.

**💡 Conseil** : démontrez la distinction entre "lisible" (payload, normal) et "falsifiable" (signature, impossible sans le secret) — c'est exactement le type de nuance qu'un jury technique apprécie.

---

### Q33. Que protège réellement CORS, et que ne protège-t-il pas ?

**Réponse courte** : CORS protège uniquement contre les appels initiés par un navigateur depuis une origine web non autorisée ; il ne protège absolument pas contre des appels directs à l'API via un outil hors navigateur.

**Réponse détaillée** : C'est un mécanisme appliqué par les navigateurs, pas par le serveur lui-même au sens d'un contrôle d'accès. La configuration de `main.py` autorise uniquement `http://localhost:3000` — cela bloque qu'un site web tiers exécute du JavaScript qui appellerait l'API depuis le navigateur d'un visiteur, mais un attaquant utilisant Postman, curl, ou un script Python peut appeler l'API directement sans jamais passer par un navigateur, et CORS ne s'applique pas dans ce cas.

**⚠️ Piège possible** : confondre CORS avec une mesure de sécurité d'accès aux données est une erreur fréquente et un piège classique de question de soutenance.

**💡 Conseil** : préparez cette distinction au mot près — c'est l'une des questions de sécurité les plus probables et les plus simples à mal répondre sous pression.

---

### Q34. Quels risques concrets découlent de l'absence d'authentification sur `/api/feedback` ?

**Réponse courte** : Un risque de déni de service (DoS) par spam de requêtes, et une absence de contrôle sur la véracité ou la légitimité des avis soumis — `/api/feedback` reste volontairement public, par design, contrairement aux endpoints décideurs désormais protégés par JWT.

**Réponse détaillée** : `/api/feedback` fait partie des 5 endpoints citoyens restés publics par choix de conception (pas de donnée sensible par utilisateur, usage anonyme attendu), contrairement aux 13 endpoints décideurs protégés par `Depends(get_current_decideur)`. Sans authentification ni rate limiting sur ce point d'entrée public, n'importe qui peut envoyer un nombre illimité d'avis citoyens factices, polluant les statistiques de satisfaction (`/api/feedback/stats`, lui-même protégé par JWT côté lecture) ou saturant le fichier `feedback_citoyens.json`, qui est réécrit intégralement à chaque ajout sans verrou de concurrence.

**⚠️ Piège possible** : ne pas minimiser ce risque en disant "c'est juste un avis citoyen, ce n'est pas grave" — c'est un point d'attaque réel exploitable facilement ; ne pas dire non plus que ce risque concerne aussi les endpoints décideurs, désormais protégés.

**💡 Conseil** : reliez ce risque à la solution déjà identifiée (rate limiting + migration vers une base de données légère) pour montrer la cohérence de votre analyse.

---

### Q35. Quelles mesures de sécurité existent côté Knowage ?

**Réponse courte** : La seule mesure documentée est un filtre de sécurité serveur (sanitizer) qui bloque toute balise `<script>` et tout attribut `onclick`/`onchange` lors de la sauvegarde des widgets, pour prévenir les injections XSS.

**Réponse détaillée** : `08_Knowage.md` confirme que ce sanitizer rejette la sauvegarde avec le message « Invalid HTML payload » si du JavaScript est détecté dans le widget. En revanche, la gestion des comptes utilisateurs Knowage, les rôles, les permissions et l'authentification serveur de la plateforme BI ne sont pas documentés dans les sources fournies.

**⚠️ Piège possible** : ne pas affirmer que Knowage "n'a pas de sécurité" — seule l'absence de documentation sur ce point précis est confirmée, pas l'absence réelle du mécanisme (qui pourrait exister sans avoir été documenté dans le périmètre de cette tâche).

**💡 Conseil** : distinguez clairement "non documenté" de "inexistant" — c'est une nuance qui démontre votre rigueur méthodologique.

---

### Q36. Comment amélioreriez-vous la sécurité du projet si vous aviez plus de temps ?

**Réponse courte** : Mettre en place une authentification JWT signée côté serveur, ajouter un rate limiting, sécuriser les messages d'erreur, et migrer le stockage du feedback vers une base de données avec gestion de la concurrence.

**Réponse détaillée** : Ces quatre pistes sont directement issues des limites documentées : (1) JWT vérifié côté FastAPI au minimum sur les endpoints sensibles et d'écriture ; (2) middleware de rate limiting (ex. `slowapi`) sur les endpoints publics ; (3) remplacement des messages d'erreur bruts par des messages génériques côté client, avec logs détaillés côté serveur uniquement ; (4) migration de `feedback_citoyens.json` vers SQLite ou équivalent.

**⚠️ Piège possible** : évitez les réponses vagues ("on sécuriserait plus") — donnez des solutions techniques précises et nommées.

**💡 Conseil** : structurez votre réponse en liste numérotée à l'oral pour montrer une vision claire et priorisée des actions.

---

### Q37. Le chiffrement des mots de passe est-il implémenté ?

**Réponse courte** : Non — les mots de passe des deux comptes décideurs sont codés en clair dans le fichier `auth.js` côté frontend.

**Réponse détaillée** : Les identifiants `u1`/`plan2025` et `u2`/`expl2025` apparaissent directement en texte clair dans le code source React, visible par quiconque inspecte le bundle JavaScript livré au navigateur. Aucun hachage (bcrypt, argon2...) n'est appliqué, et aucune vérification serveur n'existe de toute façon.

**⚠️ Piège possible** : ne pas dire que ces mots de passe sont "protégés" d'une quelconque façon — ils sont visibles en clair dans le code livré au client.

**💡 Conseil** : répétez que ceci est cohérent avec la nature "démonstration pédagogique" de l'authentification du projet, assumée comme telle dans le code.

---

### Q38. Y a-t-il un risque d'injection SQL dans le projet ?

**Réponse courte** : Information non disponible dans les sources fournies pour la partie applicative (pas de SQL exécuté par FastAPI) ; côté ETL/Data Warehouse, les requêtes sont conçues dans Talend, dont le mécanisme de protection contre l'injection n'est pas documenté explicitement.

**Réponse détaillée** : Le backend FastAPI applicatif ne se connecte à aucune base de données relationnelle et n'exécute donc aucune requête SQL dynamique — ce vecteur d'attaque est de facto absent côté API. Côté chaîne décisionnelle, les transformations et chargements sont réalisés via les composants graphiques de Talend (`tDBInput`, `tDBOutput`, `tMap`) sur des données internes au pipeline ETL, pas sur des entrées utilisateur externes directement injectées dans des requêtes SQL — mais aucune source ne documente explicitement de protection anti-injection nommée.

**⚠️ Piège possible** : ne pas affirmer catégoriquement "il n'y a aucun risque d'injection SQL" sans nuance — dites que le vecteur n'est pas exposé côté API, ce qui est différent de prouver une absence totale de risque sur l'ensemble du système.

**💡 Conseil** : ramenez la discussion sur le terrain que vous maîtrisez avec certitude (absence de SQL dynamique côté FastAPI) plutôt que de spéculer sur la chaîne ETL.

---

## Section 5 — Base de données

### Q39. Pourquoi avoir séparé les schémas `SA` et `DW` dans PostgreSQL ?

**Réponse courte** : `SA` (staging area) reçoit les données brutes peu transformées, tandis que `DW` contient le modèle décisionnel propre (faits et dimensions) — un pattern ETL classique de séparation des responsabilités.

**Réponse détaillée** : `04_Base_de_donnees.md` documente que le schéma `SA` héberge des tables comme `SA.menage`, `SA.individu`, `SA.trafic`, recevant les données après un filtrage léger de colonnes via Talend (`tFilterColumns`), avant toute transformation lourde. Le schéma `DW` contient ensuite les tables de dimensions et de faits finalisées, après nettoyage (expressions régulières), normalisation des accents, gestion des valeurs par défaut (`COALESCE`) et déduplication.

**⚠️ Piège possible** : ne pas confondre les deux schémas — le jury peut demander un exemple précis de table dans chacun.

**💡 Conseil** : mémorisez au moins un exemple de table par schéma (`SA.individu` pour staging, `Fait_Deplacement` ou `Dim_Geographie` pour DW) pour répondre avec précision.

---

### Q40. Comment les valeurs manquantes sont-elles traitées lors du chargement dans le Data Warehouse ?

**Réponse courte** : Via `COALESCE` avec des valeurs par défaut conventionnelles, par exemple le code 1 pour un transport inconnu ou le code 10 pour une difficulté inconnue.

**Réponse détaillée** : `04_Base_de_donnees.md` (section 5) documente l'usage systématique de `COALESCE` pour éviter des clés étrangères NULL dans les jointures, ce qui garantit l'intégrité référentielle du modèle en constellation, plutôt que de rejeter ou ignorer des lignes incomplètes.

**⚠️ Piège possible** : ces valeurs par défaut (1, 10) sont des conventions arbitraires choisies par l'équipe, pas des standards universels — soyez capable de l'expliquer si demandé.

**💡 Conseil** : présentez cette stratégie comme un compromis pragmatique entre complétude des données et perte d'information, plutôt qu'une solution parfaite.

---

### Q41. Comment la normalisation des accents est-elle gérée dans les jointures textuelles ?

**Réponse courte** : Via la fonction SQL `TRANSLATE`, qui remplace les caractères accentués par leurs équivalents non accentués avant comparaison.

**Réponse détaillée** : Cette normalisation est nécessaire car les libellés textuels (ex. noms de quartiers, libellés de difficultés) peuvent être saisis avec ou sans accents dans les données sources, ce qui casserait une jointure stricte sur égalité de chaînes. `Dim_Difficulte`, par exemple, utilise un libellé normalisé sans accent (`libelle_court`) précisément pour fiabiliser ce type de rapprochement.

**⚠️ Piège possible** : ne pas confondre cette normalisation avec un nettoyage orthographique complet — elle traite uniquement les accents, pas les fautes de frappe ou les synonymes.

**💡 Conseil** : donnez un exemple concret simple ("Médina" vs "Medina") pour illustrer le problème résolu.

---

### Q42. Comment le passage d'un format "large" (wide) à un format "long" est-il réalisé dans le SQL ?

**Réponse courte** : Via une technique de "dépivotage" utilisant `CROSS JOIN LATERAL`, pour transformer des colonnes répétitives en lignes.

**Réponse détaillée** : Certaines données sources stockent une information répétée sur plusieurs colonnes (par exemple, plusieurs services de proximité enquêtés par ménage, un par colonne). Le SQL utilise `CROSS JOIN LATERAL (VALUES (1, ...), (2, ...), ...)` pour générer une ligne par service plutôt qu'une colonne par service, ce qui est nécessaire pour alimenter une dimension comme `Dim_Service` (13 services identifiés) de façon relationnelle propre.

**⚠️ Piège possible** : le jury peut demander pourquoi ce passage est nécessaire — expliquer que le modèle en constellation a besoin d'une ligne par couple (ménage, service), pas d'une colonne par service.

**💡 Conseil** : reliez explicitement cette technique à la granularité de `Fait_Accessibilite` (1 ligne = 1 couple ménage/service) pour montrer la cohérence de votre compréhension du modèle.

---

### Q43. Qu'est-ce que `tUniqRow` et à quoi sert-il dans le pipeline ?

**Réponse courte** : Un composant Talend de déduplication, qui élimine les lignes en double avant le chargement dans les tables de dimension.

**Réponse détaillée** : Avant de charger une dimension comme `Dim_Site` ou `Dim_Geographie`, il est nécessaire d'éviter les doublons (par exemple, le même quartier apparaissant plusieurs fois dans les données sources). `tUniqRow` (ou l'équivalent `DISTINCT` en SQL pur) garantit qu'une valeur de dimension n'est insérée qu'une seule fois, condition indispensable pour maintenir l'unicité des clés primaires des dimensions.

**⚠️ Piège possible** : `tUniqRow` et `tSortRow` sont souvent utilisés ensemble (le tri facilite ou accompagne la déduplication) — ne pas les confondre dans une réponse technique précise.

**💡 Conseil** : si vous n'êtes pas sûr de la différence exacte entre les deux composants, restez généraliste ("composants de tri et de déduplication") plutôt que d'inventer un détail technique erroné.

---

### Q44. Quel type de clé primaire est utilisé pour les dimensions du Data Warehouse ?

**Réponse courte** : Information non disponible dans les sources fournies — le type exact (entier auto-incrémenté, séquence PostgreSQL...) n'est pas précisé dans le SQL, le dictionnaire de données ni les captures fournies.

**Réponse détaillée** : `06_DataWarehouse.md` (section 8, fin) indique explicitement cette absence d'information. On sait que chaque dimension a une clé technique (ex. `pk_id_transport`, `pk_id_difficulte`, `pk_id_service`), mais le mécanisme exact de génération de cette clé n'est pas documenté dans les sources.

**⚠️ Piège possible** : ne pas inventer "c'est un entier auto-incrémenté PostgreSQL classique (SERIAL)" si cela n'est pas confirmé — c'est une supposition raisonnable mais non vérifiée.

**💡 Conseil** : dites honnêtement "ce détail d'implémentation précis n'a pas été formalisé dans la documentation que j'ai sous la main, mais l'hypothèse la plus probable serait une séquence PostgreSQL standard" — cela montre votre honnêteté tout en gardant une réponse constructive.

---

### Q45. Quelle est la taille réelle du Data Warehouse (nombre de lignes) ?

**Réponse courte** : Information non disponible dans les sources fournies — aucun chiffre de volumétrie réelle du DW n'est documenté.

**Réponse détaillée** : Ni le SQL, ni le dictionnaire de données, ni les captures fournies ne précisent le nombre de lignes par table de faits ou de dimension dans l'état actuel du Data Warehouse.

**⚠️ Piège possible** : ne pas confondre avec les chiffres ML connus (ex. 2382 ménages dans le jeu d'entraînement du modèle d'inaccessibilité) — ce sont des chiffres différents, l'un venant de fichiers Excel sources lus par Python, l'autre concernant le DW PostgreSQL lui-même, qui n'a pas de volumétrie documentée.

**💡 Conseil** : si on vous pousse sur ce point, donnez les chiffres connus du côté ML (avec leur source précise) en clarifiant bien qu'ils ne représentent pas la taille du DW.

---

## Section 6 — ETL / Talend

### Q46. Quels sont les jobs Talend principaux du pipeline ETL ?

**Réponse courte** : Des jobs de staging (`SA_individu`, `SA_men`), des jobs de chargement de dimensions (`Dim_geographie`, `Dim_individu`, `Dim_menage`, `Dim_site`), et des jobs de chargement de faits (`fait_accessibilite`, `fact_deplacement`, `fact_comptage`, `fact_indivMen`).

**Réponse détaillée** : `05_ETL.md` détaille un pipeline en trois étapes : extraction/staging vers le schéma `SA`, chargement des dimensions vers `DW` avec déduplication, et chargement des faits combinant un flux principal avec plusieurs flux de lookup vers les dimensions déjà chargées.

**⚠️ Piège possible** : ne pas confondre les jobs de dimension et les jobs de fait — les jobs de fait dépendent toujours du chargement préalable des dimensions correspondantes (ordre d'exécution important).

**💡 Conseil** : structurez votre réponse en suivant l'ordre logique du pipeline (staging → dimensions → faits), cela montre une compréhension du flux, pas seulement une liste de noms.

---

### Q47. Quels composants Talend sont utilisés et quel est leur rôle ?

**Réponse courte** : `tDBInput` (lecture), `tMap` (transformation/mapping), `tSortRow` et `tUniqRow` (tri et déduplication), `tFilterColumns` (filtrage de colonnes), `tDBOutput` (écriture).

**Réponse détaillée** : `05_ETL.md` fournit un tableau des rôles de chaque composant : `tDBInput` extrait les données depuis la base source ou un fichier ; `tMap` réalise les transformations, renommages et jointures (lookups) ; `tSortRow`/`tUniqRow` trient et dédoublonnent ; `tFilterColumns` réduit le nombre de colonnes transmises (utilisé notamment lors du passage des sources vers le schéma `SA`) ; `tDBOutput` écrit le résultat final dans PostgreSQL.

**⚠️ Piège possible** : le jury Talend-averti peut demander un exemple précis tiré d'un job nommé — révisez au moins un exemple par composant (ex. `tmap_depl.png` pour `Fait_Deplacement`).

**💡 Conseil** : ayez un schéma ASCII du pipeline en tête (ou sur papier) pour pouvoir l'esquisser rapidement si demandé au tableau.

---

### Q48. Existe-t-il une orchestration automatique des jobs Talend (planification, master job) ?

**Réponse courte** : Information non disponible dans les sources fournies — aucun master job ni planification (scheduler) n'est documenté.

**Réponse détaillée** : `05_ETL.md` indique explicitement : « Information non disponible dans les sources fournies » concernant l'orchestration des jobs, leur ordre d'exécution automatisé, ou tout système de logging des exécutions. Cela suggère que les jobs sont probablement exécutés manuellement, un par un, dans l'environnement actuel du projet.

**⚠️ Piège possible** : ne pas prétendre qu'il existe un `tRunJob` orchestrateur ou un cron — aucune preuve de cela n'existe dans les sources.

**💡 Conseil** : présentez ce point comme une limite identifiée du pipeline ETL actuel, avec la piste d'amélioration explicite (job orchestrateur, planification, journalisation des exécutions).

---

### Q49. Quelle est la fréquence de mise à jour du Data Warehouse ?

**Réponse courte** : Information non disponible dans les sources fournies — aucune fréquence de rafraîchissement n'est documentée.

**Réponse détaillée** : `09_Integration.md` (tableau comparatif, section 5) signale explicitement cette absence d'information pour le pipeline décisionnel, contrairement au pipeline ML où l'on sait que le réentraînement est manuel (relancer un script puis redémarrer l'API).

**⚠️ Piège possible** : ne pas inventer un cycle (quotidien, hebdomadaire...) qui ne serait pas documenté.

**💡 Conseil** : reliez cette absence d'information à l'absence d'orchestration documentée (Q48) — les deux points sont cohérents entre eux et renforcent la crédibilité de votre réponse honnête.

---

### Q50. Pourquoi filtrer les colonnes avec `tFilterColumns` avant le chargement en staging ?

**Réponse courte** : Pour ne conserver que les colonnes pertinentes dès l'étape d'extraction, réduisant le volume de données transportées et simplifiant les transformations ultérieures.

**Réponse détaillée** : Les fichiers sources CETUD (Excel/CSV) contiennent un grand nombre de colonnes issues de l'enquête EMD complète. `tFilterColumns` permet de ne garder que celles nécessaires au modèle décisionnel cible avant même d'écrire dans le schéma `SA`, ce qui allège le pipeline et limite la propagation de données inutiles dans les étapes suivantes.

**⚠️ Piège possible** : ce filtrage léger en amont ne remplace pas le nettoyage de données plus poussé (regex, normalisation) qui intervient lors du chargement vers `DW`.

**💡 Conseil** : présentez ce composant comme la première étape d'un nettoyage progressif et en couches (filtrage → nettoyage → déduplication → modélisation), pas comme une étape isolée.

---

### Q51. Le pipeline ETL communique-t-il avec le pipeline Machine Learning ?

**Réponse courte** : Non, jamais — les deux pipelines lisent indépendamment les mêmes types de fichiers sources bruts, sans aucun partage de code, de nettoyage ou de résultat intermédiaire.

**Réponse détaillée** : `07_MachineLearning.md` confirme qu'aucun script ML ne lit depuis le schéma `SA` ou `DW` de PostgreSQL, et `05_ETL.md`/`06_DataWarehouse.md` ne font jamais référence aux scripts Python ML. Une correction de qualité de donnée faite côté ETL (par exemple un nettoyage de valeur aberrante) n'est donc pas automatiquement répercutée côté ML, sauf si le même correctif est dupliqué manuellement dans le script Python correspondant.

**⚠️ Piège possible** : c'est une vraie limite de cohérence du projet — un jury attentif peut demander ce qui garantit que les deux pipelines appliquent les mêmes règles de nettoyage. La réponse honnête est : rien ne le garantit actuellement.

**💡 Conseil** : proposez comme amélioration une mutualisation du nettoyage de données (bibliothèque de fonctions de nettoyage partagée, ou passage par une couche commune avant bifurcation des deux pipelines).

---

## Section 7 — Data Warehouse

### Q52. Qu'est-ce qu'un modèle en constellation, et pourquoi ce choix pour ce projet ?

**Réponse courte** : Un modèle en constellation comporte plusieurs tables de faits partageant certaines dimensions communes ; ce projet en a 4 (Comptage, Déplacement, Accessibilité, IndividuMénage) reliées notamment via `Dim_Geographie`.

**Réponse détaillée** : `06_DataWarehouse.md` explique qu'un modèle en étoile classique n'a qu'une seule table de faits, ce qui aurait forcé toutes les mesures du projet (mobilité, accessibilité, trafic, démographie) dans une grille unique, au prix de nombreuses valeurs NULL ou d'une perte d'information. La constellation permet à chaque sujet d'analyse de conserver sa granularité naturelle, tout en gardant la possibilité d'analyses croisées via les dimensions partagées.

**⚠️ Piège possible** : confondre "étoile" et "constellation" est une erreur fréquente — la distinction clé est le nombre de tables de faits (une seule vs plusieurs).

**💡 Conseil** : ayez un exemple métier concret prêt ("comparer par quartier la mobilité, l'accessibilité et le profil démographique grâce à `Dim_Geographie`") pour illustrer l'intérêt pratique, pas seulement la définition théorique.

---

### Q53. Quelle dimension est la plus transversale du modèle, et pourquoi ?

**Réponse courte** : `Dim_Geographie`, reliée à trois des quatre faits (`Fait_Deplacement`, `Fait_Accessibilite`, `Fait_IndividuMenage`).

**Réponse détaillée** : Cette transversalité permet de comparer, pour une même zone géographique, la mobilité, l'accessibilité aux services et le profil démographique — c'est l'axe d'analyse commun le plus riche du modèle. `Dim_Temps` est également partagée, mais seulement entre deux faits (`Fait_Comptage` et `Fait_Deplacement`).

**⚠️ Piège possible** : ne pas dire que `Dim_Geographie` est reliée aux quatre faits — elle ne l'est pas à `Fait_Comptage`, qui utilise seulement `Dim_Site` et `Dim_Temps`.

**💡 Conseil** : soyez précis sur le nombre exact de faits reliés (trois, pas quatre) — c'est un détail facilement vérifiable par le jury sur le schéma.

---

### Q54. Quelle est la granularité de chacune des quatre tables de faits ?

**Réponse courte** : `Fait_Accessibilite` = 1 couple ménage/service ; `Fait_Deplacement` = 1 déplacement individuel ; `Fait_Comptage` = 1 relevé de comptage ; `Fait_IndividuMenage` = 1 individu (profil + mesure agrégée).

**Réponse détaillée** : Chaque fait conserve sa granularité naturelle adaptée à son sujet d'analyse, ce qui est précisément l'avantage du modèle en constellation par rapport à un modèle en étoile unique où toutes les mesures auraient dû cohabiter à une granularité commune artificiellement forcée.

**⚠️ Piège possible** : `Fait_IndividuMenage` est particulier car sa mesure `nb_deplacements` est déjà agrégée en amont — ce n'est pas un fait purement "événementiel" comme les trois autres, mais plutôt un fait de type "profil/agrégat".

**💡 Conseil** : mentionnez spontanément cette nuance sur `Fait_IndividuMenage` pour montrer une compréhension fine, pas seulement mémorisée.

---

### Q55. `Dim_Mode` et `Dim_Transport` sont-elles la même dimension physique ?

**Réponse courte** : Cela ne peut pas être confirmé avec certitude à partir des seules sources fournies — c'est une zone d'ombre explicitement documentée.

**Réponse détaillée** : `06_DataWarehouse.md` (section 4.10) relève que le job de chargement de `Fait_Deplacement` effectue son lookup sur une dimension dont les colonnes (`pk_id_transport`/`code_transport`) sont identiques à celles de `Dim_Transport`, utilisée par `Fait_Accessibilite`. Il est possible que `Dim_Mode` et `Dim_Transport` soient en réalité la même table physique partagée entre les deux faits — ce qui serait cohérent avec le principe même de la constellation — mais aucune capture ne le confirme explicitement.

**⚠️ Piège possible** : c'est une question piège volontairement ambiguë dans le projet lui-même — ne pas trancher catégoriquement dans un sens ou dans l'autre sans preuve.

**💡 Conseil** : répondez en proposant la méthode de vérification plutôt que la réponse : "il faudrait inspecter le schéma physique PostgreSQL (`\d Dim_Mode` et `\d Dim_Transport`) pour confirmer s'il s'agit d'une seule table ou de deux tables distinctes aux colonnes similaires" — cela montre une démarche d'ingénieur rigoureuse.

---

### Q56. Quels sont les 13 services de proximité référencés dans `Dim_Service` ?

**Réponse courte** : Des établissements scolaires (daara, écoles publiques/privées), de santé (dispensaires, hôpitaux publics/privés, pharmacie), commerciaux (marché) et administratifs (mairie, poste/centre financier).

**Réponse détaillée** : La liste complète comprend : daara/école coranique, école primaire publique, école primaire privée, enseignement moyen/secondaire public, enseignement moyen/secondaire privé, centre de santé/dispensaire public, centre de santé/dispensaire privé, hôpital public, hôpital/clinique privée, pharmacie, marché de produits alimentaires, mairie, poste/centre financier — construits via `CROSS JOIN LATERAL (VALUES...)` en SQL.

**⚠️ Piège possible** : le jury ne demandera probablement pas la liste exhaustive par cœur, mais peut demander la logique de catégorisation (éducation/santé/commerce/administration) — préparez ce regroupement thématique.

**💡 Conseil** : ne récitez pas la liste mécaniquement — regroupez-la par thème métier pour montrer une compréhension du sens, pas seulement une mémorisation brute.

---

## Section 8 — Machine Learning

### Q57. Pourquoi vos modèles ML ne sont-ils pas branchés sur le Data Warehouse ?

**Réponse courte** : Parce que le DWH agrège pour le reporting alors que le ML a besoin de données individuelles fines ; les brancher aurait créé une dépendance inutile au pipeline ETL.

**Réponse détaillée** : `07_MachineLearning.md` (section 8.1) le confirme explicitement par lecture directe du code : aucun des quatre scripts d'entraînement (`Anomalies_v2.py`, `Segmentation_Recommandation_v2.py`, `ml_inaccessibilite_v2.py`, `train_inaccessibility_model.py`) ne se connecte à une base de données ; tous lisent directement des fichiers Excel/CSV CETUD bruts via `pandas.read_excel`/`read_csv`. Les justifications sont : la granularité individuelle nécessaire au clustering/classification, le découplage vis-à-vis de la disponibilité de l'ETL/DWH, la rapidité d'itération (corrections "v2" fréquentes), et la conservation de variables très fines non vouées à un usage décisionnel agrégé.

**⚠️ Piège possible** : ne pas dire "on n'a pas eu le temps de les connecter" — c'est un choix défendable techniquement, démontré par plusieurs arguments solides, pas un raccourci.

**💡 Conseil** : citez le découplage en premier — c'est l'argument le plus convaincant et le plus facile à défendre devant un jury technique.

---

### Q58. Combien de modèles de Machine Learning le projet comporte-t-il, et quels sont leurs objectifs ?

**Réponse courte** : Quatre familles de modèles : détection d'anomalies de trafic (non supervisé), segmentation des usagers (K-Means), recommandation de mode de transport (Random Forest), et prédiction du risque d'inaccessibilité (Gradient Boosting en production).

**Réponse détaillée** : Chaque modèle répond à un objectif métier distinct : repérer des comptages de trafic anormaux (consensus de 3 méthodes non supervisées) ; regrouper les usagers en profils-types de mobilité (K-Means, 3 clusters) ; prédire le mode de transport le plus probable pour un profil donné (Random Forest, classification multi-classe) ; identifier les ménages/zones à risque élevé d'isolement en transport (Gradient Boosting, classification binaire).

**⚠️ Piège possible** : le modèle d'inaccessibilité existe en deux versions (recherche `ml_inaccessibilite_v2.py` avec 4 algorithmes comparés, et production `train_inaccessibility_model.py` avec un seul modèle figé) — ne pas les confondre.

**💡 Conseil** : présentez ces quatre familles avec un objectif métier en une phrase chacune, prêtes à être énoncées rapidement en ouverture de la section ML.

---

### Q59. Le modèle K-Means a-t-il une variable cible ?

**Réponse courte** : Non, c'est un apprentissage non supervisé — il n'y a pas de "bonne réponse" connue à l'avance.

**Réponse détaillée** : K-Means regroupe les individus selon leur proximité dans l'espace des 10 variables standardisées (`features_cluster` : âge, sexe, niveau d'instruction, statut actif, statut étudiant, permis, fréquence TC, nombre de déplacements, durée et coût principaux), sans connaître a priori qu'il doit trouver des "étudiants" ou des "actifs motorisés". Les labels métier (ex. "Étudiants mobilité douce") sont attribués après coup par une fonction `auto_label()` appliquant des règles de seuil sur les statistiques moyennes de chaque cluster.

**⚠️ Piège possible** : ne pas confondre la variable cible du Random Forest (`groupe_mode`, supervisée) avec l'absence de cible pour K-Means — ce sont deux modèles différents dans le même script `Segmentation_Recommandation_v2.py`.

**💡 Conseil** : insistez sur le fait que le nom du cluster est une interprétation humaine a posteriori, pas une sortie de l'algorithme — c'est une nuance souvent mal comprise et donc valorisante à expliciter.

---

### Q60. Comment avez-vous choisi le nombre de clusters K=3 ?

**Réponse courte** : En testant K de 2 à 8 et en retenant celui qui maximise le score de silhouette.

**Réponse détaillée** : Le script calcule, pour chaque valeur de K testée, l'inertie (qui diminue mécaniquement avec K, donc peu discriminante seule) et le score de silhouette (mesure de séparation des clusters, de -1 à +1). Le K retenu est celui qui maximise ce score de silhouette ; `metadata.json` confirme que K=3 est la valeur réellement retenue.

**⚠️ Piège possible** : la valeur numérique exacte du score de silhouette pour K=3 n'est pas sauvegardée dans un fichier fourni — elle n'est affichée qu'en console au moment de l'exécution. Ne pas inventer un chiffre si on vous le demande précisément.

**💡 Conseil** : dites "le score est calculé et affiché en console au moment de l'entraînement, mais n'est pas archivé dans un fichier de métadonnées — je peux le recalculer si nécessaire" plutôt que d'avancer un chiffre non vérifié.

---

### Q61. Quels sont les trois segments de clientèle identifiés par le K-Means ?

**Réponse courte** : "Étudiants mobilité douce", "Actifs motorisés", et "Travailleurs informels", confirmés dans `metadata.json`.

**Réponse détaillée** : Ces labels sont attribués par une fonction `auto_label()` qui applique des règles de seuil sur les statistiques moyennes de chaque cluster (pourcentage d'étudiants, pourcentage d'actifs avec permis, coût moyen, durée moyenne). Par exemple, un cluster avec plus de 40 % d'étudiants est étiqueté "Étudiants mobilité douce".

**⚠️ Piège possible** : comment savoir que le cluster 0 correspond vraiment à des étudiants, et pas au hasard ? La réponse honnête est que c'est une heuristique de nommage basée sur des statistiques agrégées, pas une vérité validée individu par individu par un humain.

**💡 Conseil** : ayez les trois noms de segments mémorisés mot pour mot — question quasi certaine en soutenance ML.

---

### Q62. Quelle est la performance du modèle Random Forest de recommandation de mode ?

**Réponse courte** : Accuracy de 80,15 % et F1-macro en validation croisée de 67,29 %, selon `metadata.json`.

**Réponse détaillée** : L'écart entre ces deux chiffres s'explique par le déséquilibre des classes : l'accuracy globale est tirée vers le haut par les classes majoritaires (probablement Transport Commun, la plus fréquente à Dakar), alors que le F1-macro moyenne les performances de toutes les classes à égalité, y compris les classes minoritaires plus difficiles à prédire. Les classes réellement retenues (`classes_rf`) sont Moto, Taxi/Clando, Transport Commun et Voiture — Marche, Vélo et Autre ayant probablement moins de 30 exemples, le seuil minimum fixé par le filtre du script.

**⚠️ Piège possible** : ne pas confondre ces deux métriques ni en citer une seule sans l'autre — leur écart est lui-même une information pédagogique importante sur le déséquilibre des classes.

**💡 Conseil** : donnez toujours les deux chiffres ensemble avec leur explication de l'écart — cela démontre une compréhension fine plutôt qu'une mémorisation isolée.

---

### Q63. Pourquoi le filtre "groupes avec au moins 30 exemples" est-il appliqué pour la recommandation de mode ?

**Réponse courte** : Pour éviter d'entraîner le modèle sur des catégories de mode trop rares pour être apprises de façon fiable.

**Réponse détaillée** : `counts[counts >= 30].index` filtre les groupes de mode insuffisamment représentés. Un groupe avec seulement 5 ou 10 exemples ne permettrait pas au Random Forest d'apprendre un schéma généralisable et risquerait de produire des prédictions erratiques pour cette classe — ce filtre explique directement pourquoi seules 4 classes apparaissent dans `classes_rf` sur les 7 groupes définis initialement dans `MODE_GROUPES`.

**⚠️ Piège possible** : ce filtre est une décision de seuil arbitraire (30), pas une règle universelle — assumez que c'est un choix pragmatique de l'équipe.

**💡 Conseil** : reliez directement cette réponse à la Q62 sur les classes retenues, pour montrer la cohérence de votre compréhension du pipeline.

---

### Q64. Comment fonctionne la détection d'anomalies de trafic ?

**Réponse courte** : Trois méthodes non supervisées (Z-Score par groupe, Isolation Forest, Local Outlier Factor) votent ; une anomalie n'est retenue en "consensus" que si au moins 2 des 3 méthodes la signalent.

**Réponse détaillée** : Après feature engineering (heure décimale, jour de semaine, tranche horaire, encodage des catégories) et standardisation, les trois méthodes calculent chacune un score d'anomalie. Le paramètre de contamination (proportion attendue d'anomalies) n'est pas fixé arbitrairement à 5 % mais calibré statistiquement via la méthode IQR. Un score de sévérité continu de 0 à 100 est ensuite calculé par une moyenne pondérée (Isolation Forest 40 %, LOF 35 %, Z-Score 25 %), les méthodes multivariées étant jugées plus fiables que la méthode univariée selon le commentaire du code. DBSCAN regroupe ensuite géographiquement les anomalies en consensus pour révéler des zones à problème plutôt que des points isolés.

**⚠️ Piège possible** : il n'y a pas d'accuracy/F1/AUC calculable pour ce modèle, puisque c'est un apprentissage non supervisé sans vérité terrain connue — ne pas réclamer une métrique de performance classique qui n'existe pas pour ce module.

**💡 Conseil** : insistez sur le mécanisme de "consensus pondéré" (pas un simple vote majoritaire) — c'est un détail méthodologique qui démontre une réflexion plus poussée qu'une approche naïve.

---

### Q65. Le modèle de détection d'anomalies est-il rechargé à chaque requête de l'API ?

**Réponse courte** : Non, aucun modèle `.pkl` n'est rechargé — l'API sert un CSV de résultats déjà calculés (`anomalies_results.csv`), chargé en mémoire une seule fois au démarrage.

**Réponse détaillée** : `main.py` charge `ANOMALIES_DF` avec `pd.read_csv()` une seule fois au démarrage du serveur, puis les endpoints `/api/anomalies/*` font des agrégations pandas sur ce DataFrame déjà en mémoire. Il n'y a pas de ré-exécution d'Isolation Forest/LOF/DBSCAN en temps réel à chaque clic utilisateur.

**⚠️ Piège possible** : ne pas dire que l'utilisateur "déclenche" une nouvelle détection à chaque consultation — il consulte un résultat déjà figé, calculé hors ligne par le script Python `Anomalies_v2.py`.

**💡 Conseil** : expliquez cela comme un choix de performance assumé : le calcul lourd est fait une fois en amont, l'API se contente de servir un résultat déjà prêt.

---

### Q66. Quelle est la performance réelle du modèle de prédiction de risque d'inaccessibilité ?

**Réponse courte** : Accuracy 74,7 %, Precision 73,8 %, Recall 68,7 %, F1 71,2 %, AUC 84,3 %, pour le modèle Gradient Boosting de production.

**Réponse détaillée** : Ces métriques, issues de `inacc_model_metrics.json`, sont calculées sur un jeu de test de 794 ménages après entraînement sur 2382 ménages (`test_size=0.25`). Le modèle est un `GradientBoostingClassifier(n_estimators=150, max_depth=4, learning_rate=0.05, random_state=42)`.

**⚠️ Piège possible** : ne pas confondre ces chiffres avec ceux, non disponibles, du script de comparaison `ml_inaccessibilite_v2.py` qui teste 4 modèles différents (Random Forest, Gradient Boosting, Logistic Regression, XGBoost optionnel) avec un seuil de percentile différent (65e contre 60e en production).

**💡 Conseil** : mémorisez ces cinq chiffres précisément (74,7/73,8/68,7/71,2/84,3) — c'est la question la plus probable sur le module ML et la plus facilement vérifiable par le jury via les fichiers JSON.

---

### Q67. Pourquoi l'AUC (84,3 %) est-elle plus élevée que l'accuracy (74,7 %) ?

**Réponse courte** : L'AUC mesure la capacité du modèle à bien ordonner les ménages par risque sur tous les seuils possibles, alors que l'accuracy ne regarde qu'un seul seuil fixe (50 %).

**Réponse détaillée** : Un AUC élevé avec une accuracy plus modeste suggère que le modèle discrimine globalement bien les ménages à risque des ménages non à risque, mais que le seuil de décision à 0,5 n'est peut-être pas optimal pour ce cas d'usage précis — on pourrait l'ajuster, par exemple en l'abaissant pour privilégier le rappel si l'objectif prioritaire est de ne rater aucun ménage réellement à risque.

**⚠️ Piège possible** : ne pas dire que l'AUC et l'accuracy "mesurent la même chose avec des formules différentes" — ce sont des notions distinctes (classement global vs exactitude à un seuil fixe).

**💡 Conseil** : utilisez l'analogie du classement : "si on demande au modèle de classer tous les ménages du moins risqué au plus risqué, l'AUC mesure la probabilité qu'il place correctement un ménage à risque au-dessus d'un ménage non à risque".

---

### Q68. Quelles sont les variables les plus importantes pour le modèle d'inaccessibilité ?

**Réponse courte** : La fréquence des inondations (M68, importance 0,2074) et la distance à l'arrêt de transport en commun (M66, importance 0,1989) arrivent en tête.

**Réponse détaillée** : Le top 5 complet, selon `features_importance.json` (importance Gini du Gradient Boosting de production) : fréquence des inondations (0,2074), distance arrêt TC (0,1989), temps de trajet à pied (0,1067), zone d'habitation/strate (0,0939), temps de trajet vers l'hôpital (0,0819). Ce résultat est cohérent avec l'intuition métier : inondation et éloignement des transports en commun sont des causes plausibles d'inaccessibilité.

**⚠️ Piège possible** : l'importance Gini donne une vue moyenne globale du modèle, pas une explication individuelle — ne pas la confondre avec SHAP (voir Q70).

**💡 Conseil** : reliez ce résultat à la cohérence métier observée dans le cockpit Knowage (la sheet Accessibilité identifie aussi la "fracture territoriale" et la pénalité des inondations) — un excellent point de transversalité à mentionner si le temps le permet.

---

### Q69. Existe-t-il une incohérence entre le script de recherche et le script de production pour le modèle d'inaccessibilité ?

**Réponse courte** : Oui, deux incohérences réelles : le seuil de percentile (65e en recherche, 60e en production) et la condition `M73` (`'Oui'` corrigé en recherche, `'TCOui'` non corrigé en production).

**Réponse détaillée** : `ml_inaccessibilite_v2.py` contient un commentaire explicite "CORRECTION : 'Oui' et non 'TCOui'", indiquant qu'un bug a été corrigé dans cette version de recherche. Cependant, `train_inaccessibility_model.py` et `sauvegarder_inacc_model.py` (les scripts réellement utilisés par le backend en production) contiennent encore l'ancienne condition non corrigée `M73 == 'TCOui'`. Le correctif appliqué en recherche n'a pas été reporté en production. De même, le seuil cible a été ajusté au 65e percentile en recherche "pour meilleur équilibre", mais la production reste au 60e percentile.

**⚠️ Piège possible** : c'est une incohérence réelle et vérifiable directement dans le code — ne pas la nier ni minimiser si le jury la soulève, car elle est documentée explicitement par le projet lui-même.

**💡 Conseil** : présentez-la sans détour comme un écart de cohérence identifié entre deux pipelines, avec la piste d'amélioration évidente (synchroniser les deux scripts ou n'en garder qu'un avec un mécanisme de configuration partagé).

---

### Q70. Quelle est la différence entre l'importance Gini et SHAP ?

**Réponse courte** : L'importance Gini donne une vue globale moyenne du modèle ; SHAP explique une prédiction individuelle précise.

**Réponse détaillée** : L'importance Gini (utilisée dans `features_importance.json`, calculée par le Gradient Boosting de production) répond à "quelles variables comptent le plus en moyenne sur tout le dataset ?". SHAP (implémenté uniquement dans le script de recherche `ml_inaccessibilite_v2.py`, conditionné à l'installation de la librairie et applicable seulement si le meilleur modèle est Random Forest ou XGBoost) répond à "pourquoi CE ménage précis a-t-il reçu CETTE probabilité de risque ?".

**⚠️ Piège possible** : le modèle de production (Gradient Boosting) n'a pas de calcul SHAP dans le code fourni — ne pas affirmer que l'API expose des explications SHAP individuelles, ce n'est pas le cas observé.

**💡 Conseil** : utilisez l'analogie du prix d'une voiture d'occasion (prix moyen marché vs écart expliqué pour une voiture précise) pour rendre SHAP intuitif à l'oral.

---

### Q71. Pourquoi utiliser SMOTE dans un script et pas dans l'autre ?

**Réponse courte** : `ml_inaccessibilite_v2.py` (recherche) applique SMOTE pour rééquilibrer les classes ; `train_inaccessibility_model.py` (production) ne l'utilise pas du tout.

**Réponse détaillée** : SMOTE (Synthetic Minority Over-sampling Technique) crée des exemples synthétiques de la classe minoritaire par interpolation entre voisins réels, ce qui peut améliorer la détection de la classe rare mais aussi introduire du bruit synthétique. Le script de production a fait l'impasse sur cette technique, ce qui peut expliquer en partie le recall plus modeste (68,7 %) par rapport à la precision (73,8 %).

**⚠️ Piège possible** : ne pas affirmer que le modèle de production utilise SMOTE — il ne l'utilise pas, c'est vérifiable directement dans le code.

**💡 Conseil** : présentez cette absence comme une piste d'amélioration potentielle pour le recall, plutôt qu'une erreur pure — c'est un compromis méthodologique assumable.

---

### Q72. Pourquoi le F1-score a-t-il été choisi comme critère de sélection plutôt que l'accuracy seule ?

**Réponse courte** : Parce que les classes (risque élevé / non élevé) sont déséquilibrées, et l'accuracy seule peut être trompeuse dans ce cas.

**Réponse détaillée** : Un modèle qui prédirait toujours "non à risque" aurait une accuracy élevée si la classe "à risque" est minoritaire, sans aucune utilité pratique. Le F1-score (moyenne harmonique précision/rappel) pénalise ce comportement. Le commentaire d'en-tête du script justifie ce choix explicitement : "F1-Score macro comme métrique principale (plus robuste qu'AUC seul)".

**⚠️ Piège possible** : le modèle de production (Gradient Boosting figé) n'a pas été sélectionné par cette logique de comparaison F1 automatique — seul le script de recherche applique ce critère, à chaque exécution, séparément du choix figé fait en production. Le choix de Gradient Boosting pour la production semble être une décision humaine, sans lien programmatique avec le résultat du script de comparaison.

**💡 Conseil** : ne dites jamais que "le script a sélectionné automatiquement le meilleur modèle pour la production" — c'est une nuance importante à formuler avec précision.

---

### Q73. Le modèle de recommandation utilise-t-il un seuil de confiance pour signaler les profils atypiques ?

**Réponse courte** : Un seuil de confiance de 40 % existe dans le script de démonstration `Segmentation_Recommandation_v2.py`, mais rien ne confirme qu'il soit repris dans le backend de production `main.py`.

**Réponse détaillée** : Dans la fonction `predire()` du script de recherche, si la probabilité du mode recommandé est inférieure à `SEUIL_CONFIANCE = 0.40`, un message d'avertissement type "Confiance X% — profil atypique" est généré. Cependant, la fonction `predire()` de `main.py` (backend réel) ne mentionne pas ce mécanisme dans le code lu.

**⚠️ Piège possible** : ne pas affirmer que l'API en production avertit l'utilisateur en cas de faible confiance — ce n'est pas confirmé comme présent dans le code du backend réel.

**💡 Conseil** : distinguez clairement "fonctionnalité du script de démonstration" de "fonctionnalité confirmée de l'API de production" — exactement le type de nuance que ce document cherche à enseigner.

---

### Q74. Qu'est-ce qui empêche votre pipeline ML d'être utilisé directement en production à grande échelle ?

**Réponse courte** : L'absence de pipeline MLOps — pas de réentraînement automatique, pas de versioning de modèle, chemins de fichiers codés en dur.

**Réponse détaillée** : Le rechargement des `.pkl` se fait une seule fois au démarrage du serveur FastAPI ; toute mise à jour des données CETUD nécessite de relancer manuellement le script d'entraînement puis de redémarrer l'API. Aucun fichier ne montre de tâche planifiée (cron, scheduler) déclenchant un réentraînement, ni de gestion de version des modèles (pas de `model_v1.pkl`/`model_v2.pkl` horodatés), ni de tests de non-régression sur les métriques.

**⚠️ Piège possible** : ne pas prétendre qu'il existe un mécanisme de réentraînement automatique périodique — aucune source ne le montre.

**💡 Conseil** : citez ce point comme l'amélioration la plus structurante à apporter avant tout passage à l'échelle réelle, et reliez-le à votre compréhension de ce qu'est le MLOps.

---

### Q75. Quels fichiers `.pkl` sont orphelins (présents sur disque mais jamais chargés) ?

**Réponse courte** : `kmeans_pca.pkl`, `inacc_label_encoders.pkl`, et `inaccessibilite_model.pkl` (la version issue du script de recherche).

**Réponse détaillée** : La PCA n'est utile que pour la visualisation 2D des clusters pendant l'entraînement, pas pour la prédiction en production — le backend ne la recharge donc jamais. De même, le fichier `inaccessibilite_model.pkl` produit par `ml_inaccessibilite_v2.py` (script de recherche) n'est jamais chargé par `main.py`, qui utilise exclusivement `inacc_model.pkl`/`inacc_imputer.pkl` produits par le script de production.

**⚠️ Piège possible** : ces fichiers orphelins ne sont pas des bugs en soi, mais un signe de nettoyage de dépôt insuffisant — à présenter comme tel.

**💡 Conseil** : proposez le nettoyage de ces artefacts orphelins comme une amélioration simple et rapide à mettre en œuvre, contrairement à d'autres limites plus structurelles.

---

### Q76. Comment le backend transforme-t-il une requête utilisateur en prédiction ML ?

**Réponse courte** : Il reconstruit un vecteur de features dans le même ordre et avec le même prétraitement (imputation, encodage) que lors de l'entraînement, puis appelle `predict()` ou `predict_proba()`.

**Réponse détaillée** : Pour la recommandation de mode, `build_features_rf()` construit un dictionnaire de features ordonné selon `FEATURES_RF` (lu depuis `metadata.json`), puis applique l'imputer avant `rf.predict()`. Pour l'inaccessibilité, le backend part d'un profil par défaut (`inacc_features_defaults.json`), encode les catégorielles via des tables de correspondance (`inacc_encoders_mappings.json`, qui évitent de recharger un objet `LabelEncoder` scikit-learn complet), applique l'imputer puis `predict_proba()`.

**⚠️ Piège possible** : si l'ordre des features ou les valeurs par défaut diffèrent entre l'entraînement et l'API, la prédiction serait incorrecte sans erreur visible — c'est pourquoi les listes de features sont sauvegardées dans des fichiers de métadonnées et relues par le backend plutôt que recopiées en dur séparément.

**💡 Conseil** : valorisez cette astuce d'architecture (mappings JSON plutôt que rechargement d'objets scikit-learn lourds) comme une bonne pratique de découplage API/entraînement.

---

### Q77. Pourquoi avez-vous deux scripts différents pour le modèle d'inaccessibilité ?

**Réponse courte** : Le premier (`ml_inaccessibilite_v2.py`) est un script de recherche/comparaison de 4 algorithmes ; le second (`train_inaccessibility_model.py`) est la version simplifiée et stabilisée réellement chargée par le backend en production.

**Réponse détaillée** : Le script de recherche compare Random Forest, Gradient Boosting, Logistic Regression et XGBoost (optionnel) avec SMOTE et SHAP, pour choisir la meilleure approche. Le script de production ne retient que Gradient Boosting (sans SMOTE, sans les 3 autres modèles), produit les fichiers de métadonnées exploitables par l'API, et sauvegarde le modèle final sous un nom fixe (`inacc_model.pkl`) que `main.py` charge au démarrage.

**⚠️ Piège possible** : ne pas dire que les deux scripts produisent le même modèle — le seuil de risque et la condition `M73` diffèrent entre eux (cf. Q69).

**💡 Conseil** : présentez cette séparation comme une démarche méthodologique saine (explorer largement avant de figer un choix de production), même si la synchronisation entre les deux pourrait être améliorée.

---

### Q78. Le mapping des libellés de variables (`HUMAN_FEATURE_NAMES`) est-il cohérent dans tout le projet ?

**Réponse courte** : Non, une incohérence réelle existe entre le dictionnaire utilisé par le script de recherche et celui utilisé pour l'affichage côté production/frontend, pour les mêmes codes de variable.

**Réponse détaillée** : `ml_inaccessibilite_v2.py` associe par exemple `M26` à "Type logement" et `M28` à "Statut d'occupation", alors que `HUMAN_FEATURE_NAMES` (utilisé pour le JSON consommé par le frontend) associe `M26` à "Sexe du chef de menage" et `M28` à "Age du chef de menage" — des libellés totalement différents pour les mêmes codes. Le fichier `inacc_features_defaults.json` montre des valeurs cohérentes avec le premier mapping (ex. `"M26": "Maison basse"`), ce qui contredit les libellés affichés côté production.

**⚠️ Piège possible** : c'est une incohérence réelle de documentation des variables dans le code, à signaler en soutenance plutôt qu'à dissimuler — un jury qui croiserait les deux fichiers la détecterait facilement.

**💡 Conseil** : présentez cette découverte comme une preuve de votre lecture rigoureuse et critique du code, pas comme un aveu gênant — c'est exactement le type d'analyse qu'un jury valorise.

---

## Section 9 — Knowage / BI

### Q79. Qu'est-ce que Knowage et quel est son rôle dans le projet ?

**Réponse courte** : Knowage est la plateforme de Business Intelligence open source utilisée pour construire le cockpit "TransportDakar", qui affiche les indicateurs de mobilité urbaine sous forme de tableaux de bord visuels.

**Réponse détaillée** : Knowage ne stocke pas de données lui-même — c'est un outil de restitution qui vient lire des données déjà préparées ailleurs (typiquement un Data Warehouse) pour les afficher sous forme de cockpits. Le cockpit du projet, accessible via `workspace/document-composite/Acceuil`, comporte 6 feuilles ("sheets") : Acceuil, Trafic, Déplacements, Démographie, Accessibilité, IA & Prévisions.

**⚠️ Piège possible** : ne pas dire que Knowage "calcule" les indicateurs — il les affiche, le calcul étant en principe réalisé en amont par le Data Warehouse.

**💡 Conseil** : utilisez l'analogie du tableau de bord de voiture (plusieurs cadrans regroupés en une seule vue) pour expliquer le concept de cockpit à un public non technique.

---

### Q80. Pourquoi avoir choisi Knowage plutôt que Power BI ou Tableau ?

**Réponse courte** : Information non disponible dans les sources fournies — aucun document ne justifie explicitement ce choix comparatif.

**Réponse détaillée** : `08_Knowage.md` (section 1.2) indique explicitement cette absence de justification documentée. Seul le fait que Knowage soit l'outil effectivement utilisé est documenté ; aucune comparaison formelle avec d'autres outils BI n'apparaît dans les sources.

**⚠️ Piège possible** : ne pas inventer des arguments (coût, licence open source...) qui ne seraient pas dans la documentation, même s'ils semblent plausibles.

**💡 Conseil** : si vous avez personnellement des raisons (contrainte académique, disponibilité, open source), précisez bien que c'est votre apport personnel et non une justification documentée dans le rapport.

---

### Q81. Comment les widgets du cockpit Knowage sont-ils construits techniquement ?

**Réponse courte** : Entièrement à la main en HTML/CSS dans l'éditeur de widget de Knowage, et non via des widgets graphiques natifs préconfigurés.

**Réponse détaillée** : Les graphiques en barres affichent une hauteur fixée en CSS inline (`style="height:NN%"`), calculée à partir de la valeur de la donnée mais écrite manuellement dans le widget, pas générée dynamiquement par un moteur de rendu connecté à un dataset Knowage natif.

**⚠️ Piège possible** : un jury peut demander si les graphiques se mettent à jour automatiquement avec de nouvelles données — la réponse honnête est que le lien dynamique automatique avec le Data Warehouse n'est pas démontré dans les sources fournies, les valeurs semblant intégrées de façon largement statique dans le code du widget.

**💡 Conseil** : soyez transparent sur cette limite tout en valorisant la sophistication visuelle obtenue malgré la contrainte (voir Q83 sur le sanitizer).

---

### Q82. Combien de sheets comporte le cockpit, et que montre chacune ?

**Réponse courte** : Six sheets : Acceuil (vue de synthèse), Trafic, Déplacements, Démographie, Accessibilité (détaillée dans les sources), et IA & Prévisions.

**Réponse détaillée** : La sheet Acceuil affiche 5 KPI (déplacements, ménages, individus, sites, communes), une carte interactive simulée de Dakar, un résumé exécutif, trois mini-graphiques (trafic, déplacements par mode, démographie par âge) et un bloc "IA & Prévisions". La sheet Accessibilité approfondit l'accès aux transports par commune, mode et tranche horaire, avec des graphiques à axe Y gradué. Les sheets Trafic, Déplacements, Démographie et IA & Prévisions sont nommées et évoquées mais leur contenu HTML détaillé n'a pas été fourni au-delà des aperçus visibles sur la sheet Acceuil.

**⚠️ Piège possible** : ne pas inventer le détail complet des 4 sheets non documentées — admettre que seules Acceuil et Accessibilité ont été détaillées dans les sources disponibles.

**💡 Conseil** : présentez les deux sheets détaillées avec assurance, et soyez factuel sur la limite de documentation pour les quatre autres.

---

### Q83. Pourquoi n'avez-vous pas utilisé de JavaScript pour la navigation ou le mode sombre dans Knowage ?

**Réponse courte** : Parce que Knowage applique un filtre de sécurité serveur (sanitizer) qui rejette systématiquement toute balise `<script>` et tout attribut `onclick`/`onchange` lors de la sauvegarde du document composite.

**Réponse détaillée** : Toute tentative d'utiliser du JavaScript provoque l'erreur "Invalid HTML payload" et empêche la sauvegarde réelle, même si le bouton SAVE de l'éditeur de widget semblait fonctionner. La solution a consisté à utiliser des techniques 100 % CSS : le sélecteur `:has()` pour le mode sombre (via une case à cocher cachée reliée à un label cliquable), et la barre d'onglets native de Knowage pour la navigation réelle entre sheets.

**⚠️ Piège possible** : le fichier `accueil_knowage_v3.html` contient pourtant un bloc `<script>` qui tente de relier les cartes de navigation aux boutons d'onglets natifs — il s'agit probablement d'une version intermédiaire/expérimentale antérieure à la version finale sans JavaScript, rejetée par le sanitizer en l'état.

**💡 Conseil** : présentez cette contrainte technique comme la clé de voûte de tous vos choix de conception du cockpit — c'est une excellente démonstration de capacité d'adaptation à une contrainte imposée.

---

### Q84. Comment fonctionne le bouton de bascule clair/sombre sans JavaScript ?

**Réponse courte** : Via un `<input type="checkbox">` caché relié à un `<label>` cliquable, combiné au sélecteur CSS moderne `:has()`.

**Réponse détaillée** : La règle CSS `#td-home:has(#td-dark-toggle:checked) { background:#0B1220; color:#E2E8F0; }` se lit : "si le conteneur contient une case cochée, appliquer ce style sombre". Tant que l'utilisateur n'a pas cliqué, la condition est fausse et le thème reste clair par défaut ; dès le clic sur le label (qui bascule visuellement la case cachée), toutes les règles préfixées par ce sélecteur s'appliquent instantanément, sans rechargement de page et sans une seule ligne de script.

**⚠️ Piège possible** : `:has()` est un sélecteur CSS relativement récent — le jury peut demander s'il fonctionne sur tous les navigateurs ; aucune source ne documente de test de compatibilité spécifique.

**💡 Conseil** : présentez ce mécanisme comme une solution créative et élégante à une contrainte de sécurité stricte, démontrant une maîtrise CSS avancée.

---

### Q85. Vos graphiques Knowage sont-ils générés automatiquement à partir des données, ou codés en dur ?

**Réponse courte** : Codés en dur — la hauteur de chaque barre est définie manuellement en CSS inline à partir de la valeur de la donnée, sans liaison dynamique démontrée à un dataset Knowage natif.

**Réponse détaillée** : Ce n'est pas un graphique généré dynamiquement par un moteur de rendu connecté en temps réel à une base de données — c'est un widget HTML personnalisé affichant des valeurs sous forme de barres. La sheet Accessibilité présente une version améliorée par rapport à la sheet Acceuil : axe Y gradué (0/25/50/75/100) et étiquette de valeur numérique au-dessus de chaque barre, mais toujours en CSS pur, sans SVG ni JavaScript.

**⚠️ Piège possible** : ne pas prétendre qu'il existe une mise à jour automatique des graphiques à chaque chargement de données du Data Warehouse — ce mécanisme n'est pas démontré dans les sources.

**💡 Conseil** : valorisez la résolution honnête d'un vrai problème de lisibilité (passage d'un simple `height:%` sans repère à un graphique avec axe gradué et valeur affichée) comme preuve d'amélioration itérative documentée.

---

### Q86. Comment Knowage récupère-t-il concrètement les données affichées dans les cockpits ?

**Réponse courte** : Le principe général d'un outil BI est de connecter des datasets au Data Warehouse, mais la configuration technique précise (requêtes SQL, connexion, datasets nommés) n'est pas documentée dans les sources disponibles pour ce projet.

**Réponse détaillée** : Les valeurs affichées (déplacements : 156 764, ménages : 3 176, etc.) sont cohérentes thématiquement avec des données issues de l'enquête EMD et des comptages trafic, mais le lien exact entre chaque widget et une table de faits précise du Data Warehouse n'est pas formalisé dans les fichiers fournis pour cette tâche.

**⚠️ Piège possible** : c'est l'une des zones d'ombre les plus importantes du volet BI — ne pas improviser une chaîne de connexion technique (type de connecteur JDBC, nom de dataset) qui ne serait pas vérifiée.

**💡 Conseil** : assumez clairement que ce point reste à formaliser/documenter, en présentant cela comme une priorité de documentation plutôt qu'un vide technique réel (le mécanisme existe probablement, seule sa documentation manque).

---

### Q87. Quel est le KPI le plus important du cockpit, et pourquoi ?

**Réponse courte** : Le score d'accessibilité globale (78 %), car il synthétise en un seul chiffre la qualité de desserte en transport et apparaît sur plusieurs sheets (Acceuil et Accessibilité).

**Réponse détaillée** : Ce KPI transversal se retrouve à la fois dans le résumé exécutif de la sheet Acceuil et dans les KPI détaillés de la sheet Accessibilité, ce qui en fait un indicateur central et récurrent du cockpit, comparable à un score-clé du tableau de bord global.

**⚠️ Piège possible** : ne pas confondre ce chiffre (78 %, accessibilité globale Knowage) avec celui issu du modèle ML d'inaccessibilité (zone DALIFORD à ~75 % de probabilité de risque) — ce sont deux chiffres provenant de systèmes et de calculs complètement différents, qui portent sur des thématiques voisines mais ne sont reliés par aucun mécanisme documenté.

**💡 Conseil** : si le jury rapproche les deux chiffres, précisez explicitement qu'aucune cohérence chiffrée entre BI et ML n'est démontrée dans les sources — ce serait une erreur de laisser penser qu'ils se valident mutuellement.

---

### Q88. Quel KPI illustre la fracture territoriale dans le cockpit ?

**Réponse courte** : Le graphique "Accessibilité par commune" de la sheet Accessibilité, qui oppose Plateau (92 %) à Rufisque (35 %), complété par le bloc "Zones sous-desservies".

**Réponse détaillée** : Les communes centrales (Plateau, Médina) affichent une accessibilité très supérieure (92 %, 85 %) à celle des communes périphériques (Rufisque 35 %, Bargny 28 %, Sébikotane 20 %), toutes sous le seuil de 50 % considéré comme "sous-desservi". Le bus apparaît comme le mode de transport le plus structurant (82 % d'accessibilité), et la nuit est identifiée comme la période la plus pénalisante (35 % d'accessibilité, contre 90 % le matin).

**⚠️ Piège possible** : ces chiffres sont des valeurs affichées dans le widget HTML, pas nécessairement le résultat d'un calcul dynamique vérifiable en temps réel — gardez cette nuance en tête si le jury creuse leur origine exacte.

**💡 Conseil** : ce cas illustre parfaitement comment présenter une donnée métier intéressante (la fracture territoriale) tout en restant honnête sur son mode de production technique (HTML largement statique).

---

### Q89. Quelles sont les limites de votre solution Knowage ?

**Réponse courte** : L'impossibilité d'interactivité dynamique réelle (pas de filtre, pas de mise à jour automatique visible) à cause du sanitizer qui interdit JavaScript, et une documentation technique incomplète sur la connexion au Data Warehouse.

**Réponse détaillée** : Aucun sélecteur interactif (date, commune, mode de transport) n'apparaît dans les deux sheets HTML observées. La procédure de sauvegarde est également fragile : un widget peut sembler sauvegardé sans être réellement persisté côté serveur, imposant une vérification systématique par rechargement complet de la page.

**⚠️ Piège possible** : ne pas dire que ces limites sont insurmontables — Knowage propose des widgets natifs connectés dynamiquement à des datasets, qui pourraient être étudiés en complément des widgets HTML personnalisés.

**💡 Conseil** : terminez toujours une question sur les limites par une piste d'amélioration concrète, pour montrer une posture constructive plutôt que défensive.

---

## Section 10 — Intégration et pipelines

### Q90. Comment qualifieriez-vous la maturité de l'intégration globale du projet ?

**Réponse courte** : Une intégration de niveau prototype/PFE — deux chaînes fonctionnelles mais non unifiées, sans orchestration commune, avec des incohérences internes documentées plutôt que masquées.

**Réponse détaillée** : Aucune source ne mentionne d'orchestrateur global (pas de `tRunJob` Talend documenté, pas de pipeline MLOps, pas de configuration `.env` centralisée), ce qui est cohérent avec un projet de fin d'études démontrant la faisabilité de chaque brique plutôt qu'un système de production industrialisé.

**⚠️ Piège possible** : ne pas surévaluer la maturité par enthousiasme — un jury technique appréciera davantage une auto-évaluation honnête qu'une survente.

**💡 Conseil** : présentez cette maturité comme appropriée au cahier des charges d'un PFE (démontrer la faisabilité technique de chaque brique), tout en énonçant clairement la feuille de route vers une industrialisation future.

---

### Q91. Si le Data Warehouse tombe en panne, l'application citoyenne est-elle affectée ?

**Réponse courte** : Non, car FastAPI ne dépend d'aucune base de données relationnelle ni du Data Warehouse.

**Réponse détaillée** : Toute la chaîne React/FastAPI repose sur des fichiers `.pkl`/`.json` chargés en mémoire au démarrage du serveur. Seule la page `CockpitDakar.jsx` (affichage du cockpit Knowage) serait affectée par une panne du système décisionnel, sans impact sur les fonctionnalités citoyennes (planning, simulateur, avis citoyen) ni sur les autres pages décideurs (zones à risque, anomalies, segmentation).

**⚠️ Piège possible** : ne pas généraliser à "tout le projet n'est pas affecté" — soyez précis sur le périmètre exact de ce qui serait affecté (uniquement l'onglet Reporting/Knowage).

**💡 Conseil** : utilisez cette question pour démontrer votre compréhension de la résilience apportée par le découplage des deux chaînes — c'est un avantage architectural réel à mettre en valeur.

---

### Q92. Le citoyen qui dépose un avis sur la cellule d'écoute alimente-t-il le Data Warehouse décisionnel ?

**Réponse courte** : Non — ces avis sont stockés uniquement dans `feedback_citoyens.json`, consommé par l'API FastAPI, sans lien avec le schéma `SA`/`DW` PostgreSQL.

**Réponse détaillée** : `AvisCitoyenPage.jsx` poste vers `POST /api/feedback`, qui écrit dans un fichier JSON local au backend. Aucune des sources ne mentionne d'écriture vers le Data Warehouse à partir de ce flux — c'est cohérent avec le constat général de séparation totale des deux chaînes après la lecture des sources brutes.

**⚠️ Piège possible** : ne pas suggérer qu'un mécanisme de synchronisation existe entre ce feedback et le DW — aucune preuve de cela n'existe.

**💡 Conseil** : reliez cette réponse au schéma global des deux chaînes pour montrer la cohérence systémique de votre compréhension, pas une réponse isolée.

---

### Q93. Les deux pipelines (BI et ML) produisent-ils des analyses de risque cohérentes entre elles ?

**Réponse courte** : Cela ne peut pas être confirmé avec les sources disponibles — aucune comparaison croisée entre les résultats BI et ML n'est documentée.

**Réponse détaillée** : Les KPI affichés dans Knowage (ex. "Accessibilité globale : 78 %") et les sorties du modèle d'inaccessibilité FastAPI (ex. zone DALIFORD à ~75 % de risque) portent sur des thématiques voisines mais proviennent de calculs et de sources de données différents, reliés par aucun mécanisme documenté.

**⚠️ Piège possible** : ne pas affirmer ni infirmer catégoriquement une cohérence chiffrée entre les deux — la réponse honnête est l'absence de preuve dans un sens ou dans l'autre.

**💡 Conseil** : c'est l'occasion de démontrer votre rigueur scientifique : ne pas confondre "proximité thématique" avec "cohérence vérifiée".

---

### Q94. Pourquoi le projet n'a-t-il pas une seule base de données pour tout centraliser ?

**Réponse courte** : Parce que les deux chaînes ont des besoins très différents — l'application citoyenne privilégie la simplicité d'un service de modèles ML via fichiers, tandis que le système décisionnel a besoin d'un modèle relationnel structuré pour le reporting BI.

**Réponse détaillée** : Combiner les deux dans une seule base aurait nécessité de concilier des granularités et des usages incompatibles (variables individuelles fines pour le ML, agrégats pour le reporting). Le choix observé reflète une architecture pragmatique de PFE qui démontre chaque brique séparément plutôt qu'une plateforme de données unifiée — un axe d'amélioration explicitement identifiable mais non implémenté dans les sources.

**⚠️ Piège possible** : ne pas présenter cette absence de centralisation comme un oubli — c'est une conséquence directe et cohérente des choix de granularité déjà justifiés ailleurs (cf. Q57).

**💡 Conseil** : reliez systématiquement cette réponse aux justifications déjà données pour le découplage ML/BI — la cohérence entre vos réponses impressionne davantage qu'une réponse isolée brillante.

---

### Q95. Quel est le format d'échange de données entre React et FastAPI ?

**Réponse courte** : JSON, échangé via des requêtes HTTP `fetch` natives, avec une validation Pydantic côté serveur sur chaque requête entrante.

**Réponse détaillée** : Chaque appel React utilise `fetch()` pour envoyer des requêtes GET/POST en JSON vers l'un des 18 endpoints FastAPI ; chaque réponse JSON est, quand un `response_model` Pydantic est défini, également validée en sortie. Le CORS limite ces échanges aux requêtes initiées depuis `localhost:3000`.

**⚠️ Piège possible** : ne pas dire que toutes les réponses ont un `response_model` strict — vérifiez si la question porte sur un endpoint précis avant d'affirmer une validation systématique en sortie.

**💡 Conseil** : ce type de question généraliste est une bonne occasion de montrer le schéma complet du flux React → FastAPI → fichiers, déjà préparé pour la Q1.

---

## Section 11 — Méthodologie / gestion de projet

### Q96. Quelle méthodologie de gestion de projet avez-vous utilisée ?

**Réponse courte** : Information non disponible avec certitude dans les dix documents techniques sources — ces documents portent sur l'architecture et le code, pas sur le déroulement du projet lui-même ; le glossaire définit cependant les concepts Scrum (sprint, Product Backlog) utilisés dans le rapport.

**Réponse détaillée** : `11_Glossaire.md` définit les termes Scrum (Product Backlog, Sprint) avec des exemples génériques liés au projet (ex. "Ajouter un export PDF des rapports" comme élément de Product Backlog, "développer le module d'export PDF" comme exemple de contenu d'un sprint de deux semaines), ce qui suggère que la méthodologie Scrum a structuré la planification du projet. Cependant, aucun document parmi les neuf autres ne détaille le déroulement réel (nombre de sprints effectués, composition de l'équipe, rôles Scrum Master/Product Owner effectivement tenus).

**⚠️ Piège possible** : ne pas inventer un nombre précis de sprints ou une organisation d'équipe qui ne serait pas documentée dans les sources techniques fournies pour cette tâche.

**💡 Conseil** : appuyez-vous sur votre expérience réelle de déroulement du projet pour cette question — les dix documents sources couvrent le contenu technique, pas le processus de gestion de projet, donc votre réponse personnelle est légitime et attendue ici.

---

### Q97. Comment avez-vous priorisé les fonctionnalités du projet ?

**Réponse courte** : Information non disponible dans les documents techniques fournis — cette dimension relève du vécu du projet plutôt que du code analysé.

**Réponse détaillée** : Les dix documents sources (`01` à `11`) sont des analyses techniques du code et de l'architecture, pas des comptes-rendus de planification ou de priorisation. Le concept de Product Backlog est défini dans le glossaire comme "une liste ordonnée de toutes les fonctionnalités, améliorations et corrections à réaliser, régulièrement mise à jour et priorisée par le Product Owner", mais aucune trace d'un backlog réel du projet TransportDakar n'apparaît dans les sources.

**⚠️ Piège possible** : ne pas affirmer une logique de priorisation précise (MoSCoW, valeur métier, complexité...) qui ne serait pas documentée.

**💡 Conseil** : répondez à partir de votre vécu réel du projet (par exemple, "nous avons priorisé les fonctionnalités cœur de l'application citoyenne avant le module BI") en étant clair que cela relève de votre expérience, pas d'une documentation technique analysée.

---

### Q98. Quelles difficultés avez-vous rencontrées pendant le développement ?

**Réponse courte** : Le code lui-même révèle des difficultés réelles : corrections de bugs documentées en commentaires ("CORRECTION bug score_tc_manque", "CORRECTION radar chart"), versions "v2" de plusieurs scripts, et la contrainte du sanitizer Knowage ayant nécessité une refonte complète de l'approche de navigation/thème.

**Réponse détaillée** : Ces traces sont des preuves concrètes et vérifiables de difficultés réellement rencontrées et documentées dans le code : les scripts ML (`Anomalies_v2.py`, `ml_inaccessibilite_v2.py`) sont des réécritures corrigées de versions antérieures, et le module Knowage a dû abandonner une première approche JavaScript suite au rejet systématique par le filtre de sécurité serveur, pour repartir sur une solution 100 % CSS.

**⚠️ Piège possible** : ne pas se limiter à des difficultés génériques ("le temps", "la coordination") sans lien avec le code — privilégiez les difficultés techniques vérifiables dans les sources, qui sont plus crédibles devant un jury qui a accès au code.

**💡 Conseil** : citez ces deux exemples concrets (corrections de bugs ML "v2", refonte Knowage sans JavaScript) — ils sont factuellement ancrés et donc convaincants, plutôt que des généralités.

---

### Q99. Le projet a-t-il fait l'objet de revues de code ou de pair programming ?

**Réponse courte** : Information non disponible dans les sources fournies.

**Réponse détaillée** : Aucun des dix documents techniques ne documente un processus de revue de code, de pair programming, ou d'outils de collaboration (pull requests, etc.). Ces documents se concentrent sur l'analyse du code final, pas sur le processus ayant mené à sa production.

**⚠️ Piège possible** : ne pas inventer un processus formel de revue qui ne serait pas vérifiable.

**💡 Conseil** : si applicable à votre vécu réel, répondez honnêtement sur votre pratique personnelle ; sinon, indiquez simplement que ce point relève du déroulement du projet plutôt que de l'analyse technique du code.

---

### Q100. Quels outils de versioning ou de gestion de projet avez-vous utilisés ?

**Réponse courte** : Information non disponible dans les dix documents techniques fournis — ces sources analysent le code livré, pas les outils de processus utilisés pendant son développement.

**Réponse détaillée** : Aucune mention de Git, GitHub/GitLab, Jira, Trello ou tout autre outil de gestion de projet n'apparaît dans les documents d'analyse technique. La présence de fichiers `.bak` non nettoyés dans le dépôt frontend (`02_Frontend.md`, section 12.2) suggère cependant une gestion de versions manuelle/locale plutôt qu'un usage rigoureux d'un système de contrôle de version avec branches.

**⚠️ Piège possible** : la présence de fichiers `.bak` peut être interprétée par un jury comme un indice d'un usage insuffisant de Git (sinon, pourquoi garder des copies de sauvegarde manuelles ?) — c'est une déduction raisonnable, pas une affirmation certaine.

**💡 Conseil** : si vous avez utilisé Git réellement, mentionnez-le avec assurance à partir de votre expérience, tout en notant honnêtement que les fichiers `.bak` restants dans le dépôt sont un signe de nettoyage imparfait, indépendamment de l'outil de versioning utilisé.

---

## Section 12 — Limites et améliorations

### Q101. Si vous deviez résumer en trois points les limites majeures du projet, lesquelles choisiriez-vous ?

**Réponse courte** : Les mots de passe stockés en clair côté serveur (malgré le JWT en place pour l'espace décideurs), les incohérences internes entre scripts de recherche et de production (seuils, libellés), et l'absence de pipeline MLOps/orchestration ETL automatisée.

**Réponse détaillée** : Ces trois limites sont documentées de façon convergente dans plusieurs des neuf documents techniques : la sécurité (JWT signé HS256 sur 13 endpoints décideurs, mais sans hashing des mots de passe ni RBAC backend fin par rôle), la cohérence des pipelines ML (seuils 0.65/0.45 en recherche vs 0.60/0.40 en production, condition `M73` 'Oui' vs 'TCOui', mapping `HUMAN_FEATURE_NAMES` incohérent), et l'absence d'automatisation (pas de réentraînement programmé, pas d'orchestration Talend documentée).

**⚠️ Piège possible** : préparez-vous à approfondir chacune de ces trois limites si le jury insiste — elles sont probablement les plus susceptibles d'être creusées en détail.

**💡 Conseil** : mémorisez ce triptyque comme votre réponse "par défaut" à toute question générale sur les limites du projet — elle est cohérente avec tout le reste de votre argumentaire.

---

### Q102. Quelle amélioration prioriseriez-vous si vous aviez seulement deux semaines supplémentaires ?

**Réponse courte** : Harmoniser les seuils et libellés incohérents entre les scripts de recherche et de production du modèle d'inaccessibilité — c'est la correction la plus rapide à fort impact de cohérence.

**Réponse détaillée** : Contrairement à des refontes plus lourdes (hashing des mots de passe avec migration de `DECIDEURS_DB`, modularisation du backend, pipeline MLOps), la synchronisation du seuil de percentile (65e vs 60e) et de la condition `M73` ('Oui' vs 'TCOui') ne nécessite que des modifications ciblées dans deux fichiers Python, sans changement d'architecture.

**⚠️ Piège possible** : ne pas choisir une réponse disproportionnée par rapport au temps annoncé (deux semaines) — une refonte complète de l'authentification serait trop ambitieuse pour ce délai, alors qu'une correction de seuils est réaliste.

**💡 Conseil** : adaptez toujours l'ambition de votre réponse au temps annoncé dans la question — c'est un test implicite de votre sens des priorités, pas seulement de vos connaissances techniques.

---

### Q103. Comment évalueriez-vous la dette technique du projet ?

**Réponse courte** : Modérée à significative : fichiers `.bak` non nettoyés, `.pkl` orphelins, chemins codés en dur, style 100 % inline côté frontend, et un backend monolithique non testé.

**Réponse détaillée** : La dette technique se concentre principalement sur des aspects de maintenabilité (duplication de configuration, absence de modularisation, absence de tests) plutôt que sur des bugs fonctionnels majeurs — les fonctionnalités cœur (recommandation, segmentation, simulation de risque) fonctionnent et sont documentées avec des métriques réelles vérifiables.

**⚠️ Piège possible** : ne pas confondre "dette technique" avec "le projet ne fonctionne pas" — ce sont deux notions différentes ; la dette technique concerne la facilité de maintenance future, pas le fonctionnement actuel.

**💡 Conseil** : distinguez clairement ces deux notions dans votre réponse pour montrer une compréhension mature du concept de dette technique.

---

### Q104. Le projet est-il évolutif/scalable en l'état actuel ?

**Réponse courte** : Pas directement — l'absence d'asynchronisme côté FastAPI, de rate limiting, et de pipeline MLOps limiterait la montée en charge et la fréquence de mise à jour des modèles à grande échelle.

**Réponse détaillée** : Le backend synchrone traite chaque requête de façon bloquante ; sans limitation de débit sur les endpoints publics (le JWT protège les endpoints décideurs, mais pas de débit), un afflux massif de requêtes pourrait saturer le serveur ; le ré-entraînement manuel des modèles ML ne serait pas tenable avec des mises à jour de données fréquentes à grande échelle.

**⚠️ Piège possible** : ne pas dire que le projet "ne peut pas du tout" évoluer — il s'agit de limites concrètes à lever, pas d'un blocage architectural fondamental irréversible.

**💡 Conseil** : présentez les solutions déjà identifiées (async, rate limiting, MLOps) comme la feuille de route claire vers la scalabilité, ce qui démontre que vous avez déjà réfléchi au chemin à parcourir.

---

### Q105. Quelle serait la prochaine étape logique du projet après ce PFE ?

**Réponse courte** : Renforcer l'authentification existante (hashing des mots de passe, refresh token), synchroniser les pipelines ML internes, documenter formellement la connexion Knowage-Data Warehouse, et nettoyer la dette technique du dépôt.

**Réponse détaillée** : Ces priorités découlent directement des limites documentées dans les neuf fichiers sources : sécurité (`03_Backend_FastAPI.md`), cohérence ML (`07_MachineLearning.md`), documentation BI (`08_Knowage.md`), et propreté du dépôt (`02_Frontend.md`).

**⚠️ Piège possible** : évitez une réponse trop vague ("continuer à améliorer le projet") — donnez une feuille de route priorisée et concrète.

**💡 Conseil** : terminez la soutenance sur cette vision prospective si la question vous est posée en fin d'entretien — c'est une excellente façon de clore sur une note constructive et tournée vers l'avenir.

---

## Section 13 — Questions pièges transversales

### Q106. Si je decode le token d'authentification (JWT) en direct devant vous, qu'est-ce que cela prouve ?

**Réponse courte** : Cela prouve seulement que la partie payload d'un JWT est publique par construction — ce qui est normal pour tout JWT, signé ou non. Cela ne prouve pas qu'on peut le falsifier, car la sécurité d'un JWT repose sur sa signature, pas sur la confidentialité de son contenu.

**Réponse détaillée** : Un JWT est composé de trois parties (header, payload, signature), les deux premières encodées en Base64URL et lisibles par n'importe qui — c'est documenté ainsi dans `11_Glossaire.md` et c'est la norme pour tout JWT, pas une faille du projet. Ce que le jury ne peut PAS faire, en revanche, c'est fabriquer un nouveau token valide ou modifier le contenu d'un token existant (par exemple changer `role`) sans connaître `JWT_SECRET`, qui reste exclusivement côté serveur (`main.py`) et n'est jamais transmis au client : toute altération invaliderait la signature HS256, détectée par `get_current_decideur` au prochain appel protégé.

**⚠️ Piège possible** : ce piège pédagogique a changé de nature depuis l'ajout du JWT — avant, décoder le token suffisait à le falsifier (Base64 réversible) ; maintenant, décoder ne prouve rien de plus que la lisibilité normale du payload. Ne pas confondre "je peux lire le contenu" avec "je peux le falsifier".

**💡 Conseil** : accueillez cette démonstration avec assurance en expliquant la distinction payload (public, lisible) / signature (secrète, infalsifiable sans `JWT_SECRET`) — c'est exactement la nuance qu'un jury technique cherche à tester.

---

### Q107. Pourquoi le JWT n'est-il appliqué qu'aux endpoints décideurs ?

**Réponse courte** : Parce que les 5 endpoints citoyens (`/`, `/health`, `/quartiers`, `/recommander`, `/api/feedback`) sont publics par design — ils ne renvoient ni ne dépendent de données sensibles propres à un utilisateur identifié, contrairement aux tableaux de bord décideurs.

**Réponse détaillée** : Les endpoints citoyens servent un usage anonyme et grand public (informations générales, formulaire de recommandation, dépôt d'avis) : il n'y a pas de notion de compte citoyen à protéger. Les 13 endpoints décideurs, eux, exposent des données de pilotage (zones à risque, métriques ML, anomalies) réservées aux comptes CETUD authentifiés, ce qui justifie la protection par JWT. Cette distinction reflète un choix de portée assumé, pas un oubli partiel.

**⚠️ Piège possible** : ne pas présenter l'absence de JWT sur les endpoints citoyens comme une faille oubliée — c'est un choix de conception cohérent avec la nature publique de ces points d'entrée.

**💡 Conseil** : reliez cette réponse à la distinction public/décideurs qui structure tout le projet depuis le début (cf. `01_Architecture.md`).

---

### Q108. Comment le JWT est-il vérifié côté serveur ?

**Réponse courte** : Via la dependency FastAPI `get_current_decideur`, injectée avec `Depends()` sur chaque endpoint décideur, qui décode et valide la signature et l'expiration du token transmis dans l'en-tête `Authorization`.

**Réponse détaillée** : `get_current_decideur(authorization: Optional[str] = Header(None))` lit l'en-tête HTTP `Authorization: Bearer <token>`, extrait le token, puis appelle `jwt.decode(token, JWT_SECRET, algorithms=["HS256"])` (PyJWT). Si la signature ne correspond pas, ou si le champ `exp` indique une expiration dépassée, la bibliothèque lève une exception interceptée pour renvoyer une `HTTPException(401)`. Cette dependency est injectée via `Depends(get_current_decideur)` dans la signature des 13 endpoints décideurs.

**⚠️ Piège possible** : ne pas dire que cette vérification distingue les rôles — elle valide uniquement qu'un JWT signé et non expiré existe, sans filtrer par `role` ou `allowedRoutes` au niveau backend.

**💡 Conseil** : si on vous demande d'aller plus loin, mentionnez que cela ouvre une piste d'amélioration : un RBAC backend fin par rôle, en plus de la simple présence d'un token valide.

---

### Q107. Pouvez-vous garantir que les chiffres de votre cockpit Knowage et ceux de votre modèle ML sont cohérents entre eux ?

**Réponse courte** : Non, et il serait malhonnête d'affirmer le contraire — aucun mécanisme documenté ne relie ou ne valide la cohérence entre les deux systèmes.

**Réponse détaillée** : Les deux systèmes calculent des indicateurs sur des thématiques voisines (accessibilité aux transports) mais à partir de données, de méthodes et de pipelines complètement séparés (cf. Q93). Affirmer une cohérence non vérifiée serait une erreur scientifique.

**⚠️ Piège possible** : c'est une question délibérément formulée pour inciter à une réponse trop rassurante — résistez à la tentation de "vendre" une cohérence qui n'est pas prouvée.

**💡 Conseil** : cette question teste votre honnêteté scientifique plus que vos connaissances techniques — la bonne réponse est de reconnaître l'absence de preuve, pas de l'inventer.

---

### Q108. Votre projet utilise-t-il vraiment du Machine Learning, ou seulement des règles métier codées en dur ?

**Réponse courte** : Les deux coexistent : les modèles K-Means, Random Forest, Gradient Boosting, Isolation Forest/LOF/DBSCAN sont de vrais algorithmes entraînés sur des données réelles, mais certains éléments visibles côté frontend (conseils textuels, recommandations PDF) sont effectivement des règles ou templates codés en dur.

**Réponse détaillée** : Il faut distinguer deux couches : la couche de prédiction (modèles scikit-learn entraînés avec des métriques réelles documentées, ex. 74,7 % accuracy pour l'inaccessibilité) et la couche de présentation textuelle (les conseils accompagnant une prédiction, comme dans `predict-inaccessibility`, sont du texte conditionnel codé en dur : `if inputs.distance_tc > 15: ...`).

**⚠️ Piège possible** : ne pas dire que "tout est du vrai ML" — les recommandations textuelles ne sont pas des sorties de modèle, c'est une distinction importante que le projet documente lui-même honnêtement.

**💡 Conseil** : cette distinction entre "prédiction numérique réelle du modèle" et "texte d'accompagnement généré par des règles" est l'une des nuances les plus fines et les plus valorisantes à maîtriser pour la soutenance.

---

### Q109. Pourquoi devrait-on vous croire quand vous dites que telle information "n'est pas disponible" plutôt que de penser que vous ne maîtrisez pas votre sujet ?

**Réponse courte** : Parce que c'est précisément la posture méthodologique adoptée tout au long de la documentation du projet — distinguer ce qui est prouvé par le code de ce qui ne l'est pas, plutôt que d'improviser une réponse plausible mais non vérifiée.

**Réponse détaillée** : Plusieurs incohérences réelles ont été identifiées et signalées explicitement dans la documentation elle-même (seuils différents, libellés contradictoires, mappings incohérents) — la preuve que cette rigueur n'est pas une esquive mais une méthode de travail appliquée de façon cohérente, y compris quand elle révèle des faiblesses du propre projet.

**⚠️ Piège possible** : ne paniquez pas devant cette question méta — elle teste votre posture intellectuelle, pas un point technique précis.

**💡 Conseil** : retournez la question à votre avantage : le fait même de pouvoir citer des incohérences précises de votre propre code (seuils, libellés) prouve une lecture approfondie, pas une méconnaissance.

---

### Q110. Si on vous demande de modifier une fonctionnalité en direct, seriez-vous capable de le faire ?

**Réponse courte** : Cela dépend de la fonctionnalité demandée — pour une modification simple (ex. un seuil, un libellé), oui ; pour une refonte architecturale, ce n'est pas réaliste en direct lors d'une soutenance.

**Réponse détaillée** : Le code étant un monolithe `main.py` de 823 lignes sans tests automatisés, une modification en direct sans pouvoir vérifier l'absence de régression serait risquée à montrer devant un jury. Mieux vaut décrire précisément où et comment vous feriez la modification (fichier, ligne approximative, fonction concernée) que de tenter une démonstration live risquée.

**⚠️ Piège possible** : ne vous engagez jamais à une démonstration de code en direct si vous n'êtes pas certain à 100 % de sa réussite devant le jury — un échec en direct est plus pénalisant qu'une explication verbale précise.

**💡 Conseil** : proposez de "décrire la démarche" plutôt que de "l'exécuter en direct" si la demande vous semble risquée — c'est une réponse professionnelle et prudente, pas une esquive.

---

### Q111. En une phrase, quelle est la plus grande qualité et le plus grand défaut de ce projet ?

**Réponse courte** : Sa plus grande qualité est l'authenticité des données et des métriques utilisées (rien n'est simulé côté ML/données réelles CETUD) ; son plus grand défaut est l'absence de sécurité réelle côté backend.

**Réponse détaillée** : Cette réponse synthétique résume l'esprit de toute la documentation : un travail technique sérieux et vérifiable sur le fond (données réelles, métriques réelles, modèles réellement entraînés et évalués), mais avec des lacunes de maturité attendues dans un cadre de PFE plutôt que de production (sécurité, tests, orchestration).

**⚠️ Piège possible** : évitez une réponse trop vague ou trop générique ("le projet est complet mais pourrait être amélioré") — soyez précis et concret dans cette synthèse finale.

**💡 Conseil** : préparez cette phrase de synthèse à l'avance, mot pour mot si possible — c'est souvent la dernière question ou une question de clôture, et une réponse nette laisse une impression durable sur le jury.

---

## Conseils généraux pour la soutenance

1. **Ne jamais improviser un chiffre.** Si une métrique précise vous est demandée et que vous ne l'avez pas mémorisée avec certitude, dites "je ne veux pas vous donner un chiffre approximatif, mais je sais qu'il est documenté dans [tel fichier de métadonnées]" plutôt que d'inventer une valeur plausible.

2. **Transformez chaque limite en piste d'amélioration.** Le jury valorise davantage une auto-critique structurée et constructive ("voici la limite, voici comment je la résoudrais") qu'une tentative de dissimulation qui serait probablement détectée.

3. **Distinguez toujours "non disponible dans les sources" de "n'existe pas".** Beaucoup de questions pièges jouent sur cette nuance — l'absence de documentation d'un mécanisme ne prouve pas son absence réelle, et il est important de le formuler ainsi.

4. **Préparez un schéma mental à deux blocs (chaîne ML/applicative vs chaîne BI/décisionnelle).** C'est la clé de lecture la plus structurante de tout le projet et elle répond à un grand nombre de questions transversales si elle est bien maîtrisée.

5. **Gérez votre temps de réponse.** Pour les questions à fort enjeu (sécurité, cohérence ML), donnez d'abord la réponse courte (1-3 phrases), puis enrichissez seulement si le jury en demande davantage — ne partez pas directement dans le détail exhaustif.

6. **Si vous ne savez vraiment pas répondre, dites-le sans détour et proposez une piste de raisonnement.** Une phrase comme "je n'ai pas cette information précise en tête, mais voici comment je vérifierais/où je chercherais cette réponse" est largement préférable à un silence gêné ou à une réponse inventée.

7. **Valorisez les incohérences que vous avez vous-même documentées.** Citer spontanément les écarts entre script de recherche et script de production (seuils, libellés) montre une lecture critique et honnête de votre propre travail, ce qui est plus impressionnant qu'un projet présenté comme parfait.

8. **Ne mélangez jamais les deux univers de données (BI et ML) sans le signaler explicitement.** C'est l'erreur la plus fréquente à éviter — toujours préciser de quel système (Knowage/DW ou FastAPI/.pkl) vous parlez avant de citer un chiffre.

9. **Entraînez-vous à esquisser rapidement le schéma global à deux chaînes au tableau.** Une explication verbale seule est moins convaincante qu'un schéma rapide qui ancre visuellement votre propos pour le jury.

10. **Terminez sur une note de vision, pas seulement de bilan.** Conclure par les priorités d'évolution identifiées (sécurité, synchronisation des pipelines ML, documentation BI, nettoyage technique) laisse une impression de maturité et de capacité de recul, plutôt qu'un simple inventaire de ce qui a été fait.

---

## Résumé du travail effectué

Ce document a été construit à partir d'une lecture intégrale des dix fichiers techniques sources (`01_Architecture.md` à `09_Integration.md`, `11_Glossaire.md`), eux-mêmes rédigés à partir d'une lecture directe du code du projet TransportDakar. Il propose 111 questions de soutenance réparties en treize sections (architecture, frontend, backend, sécurité, base de données, ETL, Data Warehouse, Machine Learning, Knowage, intégration, méthodologie, limites, pièges transversaux), chacune avec une réponse courte, une réponse détaillée, un piège possible et un conseil de formulation orale. Aucun fait technique n'a été inventé : les incohérences réelles du projet (seuils de risque différents entre scripts, libellés contradictoires, zones non documentées comme la connexion Knowage-DW) sont présentées explicitement comme des points d'attention à assumer en soutenance plutôt qu'à dissimuler, conformément à la consigne initiale.





