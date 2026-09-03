# 02 — Documentation Frontend React — TransportDakar (CETUD)

> Périmètre de ce document : **uniquement** le frontend React situé dans `frontend/src/`. Toutes les affirmations ci-dessous sont vérifiées directement dans le code source lu intégralement (composants actifs **et** fichiers `.bak` lorsqu'ils diffèrent). Conformément à la règle imposée pour cette documentation : **aucun comportement, endpoint, prop ou logique non observé dans le code n'est inventé**. Lorsque l'information n'est pas disponible dans le code fourni, la mention *« Information non disponible dans le code source fourni »* est utilisée explicitement.

---

## 1. Architecture générale du frontend

Le frontend est une application **React 18.3.1** générée avec **Create React App** (`react-scripts 5.0.1`), utilisant :

| Dépendance | Version | Rôle observé dans le code |
|---|---|---|
| `react` / `react-dom` | 18.3.1 | Cœur de l'application |
| `react-router-dom` | 7.14.1 | Routage (routes imbriquées avec `<Outlet/>`) |
| `framer-motion` | 12.38.0 | Animations (transitions de page, `AnimatePresence`, variants) |
| `lucide-react` | 1.16.0 | Bibliothèque d'icônes SVG |
| `recharts` | 3.8.1 | Graphiques (BarChart, LineChart, RadarChart, PieChart, AreaChart) dans les pages décideurs |
| `react-scripts` | 5.0.1 | Tooling CRA (build, dev server, proxy automatique de `setupProxy.js`) |

Aucune dépendance `axios` n'a été trouvée dans le code lu : **tous les appels réseau utilisent l'API native `fetch`**. De même, `jspdf` est utilisé mais importé **dynamiquement** (`await import('jspdf')`), donc il n'apparaît pas forcément listé de façon classique — sa présence est néanmoins confirmée par les imports dynamiques dans `ExportPDF.jsx` et par le message d'erreur explicite (`npm install jspdf`) en cas d'échec.

### 1.1 Arborescence commentée

```
frontend/
└── src/
    ├── index.js                  # Point d'entrée — monte <App/> dans <BrowserRouter><React.StrictMode>
    ├── index.css                 # Styles globaux, polices Google Fonts (Inter, Plus Jakarta Sans), variables CSS dark/light
    ├── App.js                    # Définition de TOUTES les routes + state global du formulaire usager (formData, resultat...)
    ├── App.css                   # Variables CSS de thème (dark par défaut, overrides [data-theme="light"]), .card-3d, responsive
    ├── auth.js                   # Authentification via JWT serveur (login/logout/session/RBAC)
    ├── theme.js                  # Contexte React de thème clair/sombre (ThemeProvider, useTheme)
    ├── setupProxy.js             # Proxy dev CRA vers Knowage BI (http://localhost:18080) pour l'iframe du Cockpit
    │
    ├── components/
    │   ├── ExportPDF.jsx         # Génération de rapport PDF côté client (jsPDF), pour zones à risque et anomalies
    │   ├── LoadingScreen.jsx(.css) # Écran de chargement plein écran (animation bus, anneaux pulsants) pendant un appel API long
    │   ├── LogoTransportDakar.jsx # Logo SVG vectoriel, s'adapte au thème (props isDark/height/showWordmark)
    │   ├── MapView.jsx           # Carte Leaflet vanilla (pas react-leaflet) pour afficher zones à risque / sites d'anomalies
    │   ├── ProtectedRoute.jsx    # Garde de route : vérifie authentification + droits d'accès (RBAC) avant de rendre l'Outlet
    │   └── ThemeToggle.jsx       # Bouton bascule thème clair/sombre (icône Lune/Soleil animée)
    │
    ├── pages/
    │   ├── WelcomePage.jsx(.css) # Page d'accueil publique (citoyen) — présente les fonctionnalités, mène vers /planning, /avis, /login-decideurs
    │   ├── FormPage.jsx(.css)    # Formulaire usager multi-étapes (planning de transport) + affichage du résultat de recommandation
    │   ├── AvisCitoyenPage.jsx   # Formulaire public de "cellule d'écoute" (avis citoyen, sans authentification)
    │   ├── LoginDecideurs.jsx    # Page de connexion réservée aux décideurs (planificateur / exploitation)
    │   ├── DecideursLayout.jsx  # Layout avec sidebar pour l'espace décideurs (rendu via <Outlet/>), gère session + déconnexion
    │   ├── VueGenerale.jsx       # Dashboard d'accueil de l'espace décideurs (KPI, modules, alertes dynamiques)
    │   ├── ZonesRisquePage.jsx   # Liste/carte des zones à risque d'inaccessibilité, export PDF, recommandations
    │   ├── AnomalyDashboard.jsx  # Détection d'anomalies de trafic (Isolation Forest / LOF / Z-Score), drilldown par site
    │   ├── SimulateurRisque.jsx  # Simulateur interactif (sliders) interrogeant le modèle ML de prédiction d'inaccessibilité en temps réel
    │   ├── MlInsights.jsx        # Audit/transparence du modèle ML (métriques, importance des variables)
    │   ├── SegmentationPage.jsx  # Segmentation des usagers (K-Means) + recommandation de mode (Random Forest)
    │   ├── EvolutionTemporelle.jsx # Analyse comparative 2010-2023 à partir de données **locales simulées** (data/evolutionData.js)
    │   ├── SatisfactionPage.jsx  # Indicateurs de satisfaction et d'écoute usagers (EMD + avis citoyens collectés via /avis)
    │   └── CockpitDakar.jsx      # Intégration d'un cockpit Knowage BI via iframe (proxy same-origin)
    │
    ├── data/
    │   └── evolutionData.js      # Données statiques (constantes JS) pour EvolutionTemporelle.jsx — PAS d'appel API
    │
    └── assets/
        └── logo-transportdakar.png  # Image utilisée dans WelcomePage.jsx
```

📌 **À retenir** : il n'existe **pas** de séparation "services API" centralisée (pas de fichier `api.js` ou `services/`) : chaque page définit sa propre constante `API` ou `API_URL` (toujours `http://localhost:8000`) et appelle `fetch` directement dans ses `useEffect`. C'est une architecture simple, typique d'un PFE, mais qui duplique cette constante dans presque chaque page.

---

## 2. Routing — table complète des routes (`App.js`)

| Route | Composant | Protégée ? | Rôle requis |
|---|---|---|---|
| `/` | `WelcomePage` | Non | Public |
| `/planning` | `FormPage` (avec props `formData`, `handleChange`, `handleSubmit`, `loading`, `erreur`, `resultat`, `activeTab`, `resetForm`) | Non | Public |
| `/avis` | `AvisCitoyenPage` | Non | Public |
| `/login-decideurs` | `LoginDecideurs` | Non | Public |
| `/decideurs` | `DecideursLayout` (wrapper avec `<Outlet/>`) | **Oui** (`ProtectedRoute`) | Tout utilisateur authentifié, RBAC ensuite par sous-route |
| `/decideurs` (index) | `VueGenerale` | Oui (héritée) | planificateur, exploitation |
| `/decideurs/zones-risque` | `ZonesRisquePage` | Oui | selon `allowedRoutes` de l'utilisateur |
| `/decideurs/anomalies` | `AnomalyDashboard` | Oui | selon `allowedRoutes` |
| `/decideurs/simulateur` | `SimulateurRisque` | Oui | selon `allowedRoutes` |
| `/decideurs/ml-insights` | `MlInsights` | Oui | **planificateur uniquement** (confirmé dans `auth.js` — l'utilisateur `exploitation` n'a pas cette route dans `allowedRoutes`) |
| `/decideurs/segmentation` | `SegmentationPage` | Oui | selon `allowedRoutes` |
| `/decideurs/evolution` | `EvolutionTemporelle` | Oui | selon `allowedRoutes` |
| `/decideurs/satisfaction` | `SatisfactionPage` | Oui | selon `allowedRoutes` |
| `/decideurs/cockpit` | `CockpitDakar` | Oui | selon `allowedRoutes` |

Toute l'arborescence `/decideurs/*` est enveloppée par `<ProtectedRoute>`, et l'application entière est enveloppée par `<ThemeProvider>` et `<AnimatePresence mode="wait">` (pour les transitions de page animées par `framer-motion`).

🎓 **Question possible en soutenance — "Pourquoi avez-vous mis `ProtectedRoute` seulement sur `/decideurs` et pas sur chaque sous-route individuellement ?"**
*Réponse courte* : Parce que toutes les sous-routes décideurs partagent le même besoin minimal (être authentifié) ; le contrôle plus fin par rôle (RBAC) est fait **après**, à l'intérieur de `DecideursLayout`/`VueGenerale` via `canAccess()`.
*Réponse détaillée* : `ProtectedRoute.jsx` ne vérifie que `isAuthenticated()` puis `canAccess(session, location.pathname)` pour le chemin exact d'entrée — mais comme `/decideurs` est le point d'entrée englobant, la vérification de premier niveau s'applique à tout l'arbre. La granularité fine (cacher un module ML pour le rôle "exploitation") est ensuite gérée *côté UI*, dans `VueGenerale.jsx` (fonction `hasAccess()`) et dans `DecideursLayout.jsx` (filtrage des éléments de menu), pas par un blocage de route strict supplémentaire sur chaque sous-chemin.

---

## 3. Authentification frontend (`auth.js`) — mécanisme complet

Le système d'authentification s'appuie désormais sur un **vrai JWT signé côté serveur**. `auth.js` appelle `POST http://localhost:8000/auth/login` ; le backend FastAPI vérifie les identifiants contre `DECIDEURS_DB` (désormais côté serveur, voir `03_Backend_FastAPI.md` §4.4) et renvoie un token signé HS256.

### 3.1 Constantes clés
- `TOKEN_KEY = 'dtk_session'` (clé localStorage, stocke désormais le JWT renvoyé par le serveur)
- La durée de session (60 minutes) est portée par le champ `exp` du JWT lui-même, défini côté serveur (`JWT_EXPIRE_MIN = 60`).

### 3.2 Utilisateurs (`USERS`)
`USERS` ne contient plus que des informations d'affichage (login/mot de passe de démonstration pour pré-remplir le formulaire de connexion) :

| id | login | password (démo, pré-remplissage) | role | accès `ml-insights` |
|---|---|---|---|---|
| u1 | `planification` | `plan2025` | `planificateur` (Directeur Planification) | Oui |
| u2 | `exploitation` | `expl2025` | `exploitation` (Chef d'Exploitation) | Non |

La vérification réelle des identifiants se fait désormais côté serveur, contre `DECIDEURS_DB` dans `main.py`, et non plus dans ce fichier frontend.

Chaque utilisateur possède un tableau `allowedRoutes` qui détermine le RBAC (Role-Based Access Control), toujours informatif côté frontend (affichage des routes), sans RBAC fin équivalent côté backend.

### 3.3 Le token JWT (signé côté serveur)
`login(loginInput, passwordInput)` est désormais **asynchrone** : elle appelle `POST /auth/login`, qui renvoie `{access_token, token_type: "bearer", expires_in_min, user: {...}}`. Le `access_token` (un JWT signé HS256) est stocké dans `localStorage` sous la clé `dtk_session`, à la place de l'ancien encodage Base64 maison (`btoa(... + '|' + SALT)`) qui n'existe plus.

`getSession()` décode localement la partie *payload* du JWT (sans vérifier la signature côté client — cette vérification cryptographique réelle se fait côté serveur, à chaque appel vers un endpoint protégé) pour afficher les informations utilisateur dans l'interface, et vérifie le champ `exp` pour détecter une expiration.

🎓 Nuance importante pour la soutenance : décoder la partie payload d'un JWT côté client est normal et ne constitue pas une faille — cette partie est publique par construction. La sécurité réelle vient de la **signature**, vérifiable uniquement avec `JWT_SECRET`, qui reste côté serveur.

### 3.4 Fonctions exposées
- `login(loginInput, passwordInput)` (async) : appelle `POST /auth/login`, stocke le JWT renvoyé dans `localStorage.setItem('dtk_session', token)`.
- `logout()` : `localStorage.removeItem('dtk_session')` — purement local ; le JWT déjà émis reste valide côté serveur jusqu'à son expiration (pas de révocation serveur).
- `getSession()` : lit le localStorage, décode le payload du JWT, vérifie `exp` — si expiré, déconnecte automatiquement et retourne `null` ; sinon retourne l'objet utilisateur fusionné avec les données de session.
- `isAuthenticated()` : `getSession() !== null`.
- `canAccess(session, subPath)` : vérifie que `subPath` est dans `session.allowedRoutes`.
- `getSessionTimeLeft()` : retourne le temps restant en millisecondes avant expiration.
- `authFetch(url, options)` (nouvelle fonction) : wrapper autour de `fetch()` qui attache l'en-tête `Authorization: Bearer <token>` et déconnecte automatiquement (puis redirige vers `/login-decideurs`) si la réponse du serveur est un 401. Les 7 pages décideurs (`ZonesRisquePage.jsx`, `VueGenerale.jsx`, `SegmentationPage.jsx`, `SatisfactionPage.jsx`, `MlInsights.jsx`, `AnomalyDashboard.jsx`, `SimulateurRisque.jsx`) l'utilisent désormais à la place d'un `fetch()` brut pour leurs appels vers les endpoints protégés.

### 3.5 Cycle complet login → accès protégé → logout (ASCII)

```
┌─────────────────┐      submit form       ┌────────────────────┐
│ LoginDecideurs   │ ──────────────────────▶│  login(login, pwd) │
│  (page publique) │                        │     [auth.js]      │
└─────────────────┘                         └──────────┬─────────┘
                                                        │ POST /auth/login
                                                        ▼
                                       ┌─────────────────────────────┐
                                       │ FastAPI vérifie DECIDEURS_DB │
                                       │ → create_access_token (JWT) │
                                       │ → localStorage["dtk_session"]│
                                       └──────────────┬───────────────┘
                                                       │ navigate('/decideurs')
                                                       ▼
                              ┌────────────────────────────────────────┐
                              │  <ProtectedRoute> (components/)        │
                              │  isAuthenticated() ?                   │
                              │   NON → navigate('/login-decideurs')   │
                              │   OUI → canAccess(session, path) ?     │
                              │           NON → "Accès refusé"          │
                              │           OUI → rend <Outlet/>          │
                              └──────────────┬─────────────────────────┘
                                              ▼
                                 ┌─────────────────────────┐
                                 │ DecideursLayout          │
                                 │ - sidebar filtrée RBAC   │
                                 │ - setInterval(30000ms)   │
                                 │   → getSessionTimeLeft() │
                                 │   si <=0 → authLogout()  │
                                 │   + navigate(login)      │
                                 └──────────────┬───────────┘
                                                 │ clic "Déconnexion"
                                                 ▼
                                     logout() → localStorage.removeItem
                                     → navigate('/login-decideurs')
```

🎓 **Question possible en soutenance — "Le token est-il sécurisé ? Peut-on le falsifier ?"**
*Réponse courte* : Le token est désormais un JWT signé HS256 côté serveur : on peut en lire le contenu (payload) mais pas le falsifier sans connaître `JWT_SECRET`, qui n'est jamais envoyé au client.
*Réponse détaillée* : N'importe qui ouvrant les DevTools peut décoder la partie payload du JWT (c'est normal, cette partie est publique par construction, comme pour tout JWT), mais ne peut pas fabriquer un nouveau token valide ni modifier `role` dans le token existant, car la signature serait invalidée et rejetée par `get_current_decideur` côté serveur lors de la prochaine requête. La limite résiduelle n'est donc plus la falsifiabilité du token, mais le fait que les mots de passe de `DECIDEURS_DB` restent stockés en clair côté serveur, et qu'il n'existe pas de refresh token ni de révocation serveur (un JWT déjà émis reste valide jusqu'à expiration, même après "déconnexion").

🎓 **Question possible en soutenance — "Que se passe-t-il si la session expire pendant que l'utilisateur navigue ?"**
*Réponse courte* : Un `setInterval` dans `DecideursLayout.jsx` vérifie le temps restant toutes les 30 secondes et déconnecte automatiquement si la session est expirée.
*Réponse détaillée* : `DecideursLayout.jsx` appelle `getSessionTimeLeft()` toutes les 30000ms ; si la valeur est `<= 0`, il appelle `authLogout()` (alias de `logout()` de `auth.js`) puis `navigate('/login-decideurs')`. Cela signifie qu'un utilisateur déjà sur une page décideur ne sera éjecté qu'à la prochaine vérification (donc jusqu'à 30s de délai après expiration réelle), pas instantanément.

---

## 4. Système de thème (`theme.js`)

`ThemeProvider` lit `localStorage.getItem('dtk_theme')` (`'dark'` par défaut), expose `theme` (objet de palette `DARK` ou `LIGHT`), `toggle()` et `isDark`. À chaque changement, un `useEffect` :
1. Pose l'attribut `document.documentElement.setAttribute('data-theme', mode)`.
2. Injecte/maj une balise `<style id="dtk-theme-vars">` contenant les variables CSS personnalisées (`--dtk-bg`, `--dtk-text`, `--dtk-panel`, `--dtk-border`, etc.), avec des règles forcées pour `.dtk-page`, `.dtk-card`, `.dtk-navbar` en mode clair.

`useTheme()` est le hook consommé dans (quasiment) toutes les pages décideurs pour accéder à `{theme, toggle, isDark}` et adapter dynamiquement les couleurs des graphiques recharts, des fonds, etc.

📌 **À retenir** : le thème n'est pas géré via CSS Modules ni via une librairie comme styled-components — c'est un mélange de **styles inline JS** (objets `style={{...}}` omniprésents dans tous les composants) et de **variables CSS globales** injectées dynamiquement. C'est un choix pragmatique mais qui alourdit fortement chaque composant (fichiers JSX de 300 à 700+ lignes avec du style inline partout).

---

## 5. Composants partagés (`components/`)

### 5.1 `ProtectedRoute.jsx`
Logique : si `!isAuthenticated()` → `<Navigate to="/login-decideurs" replace />`. Sinon, si `!canAccess(session, location.pathname)` → affiche un écran "Accès refusé" stylé (icône cadenas, message, bouton retour). Sinon → rend `children` (l'`<Outlet/>` de `DecideursLayout`).

**Différence active vs `.bak`** : la version active utilise exclusivement les variables CSS de thème (`var(--dtk-bg)`, `var(--dtk-text)`, `var(--dtk-muted)`, `var(--dtk-panel)`, `var(--dtk-border)`, etc.), tandis que `ProtectedRoute.jsx.bak` utilise des couleurs RGBA codées en dur (`#0a0d14`, `rgba(255,255,255,0.4)`, etc.). Le fichier `.bak` est donc une version **antérieure à l'introduction du système de thème clair/sombre** — preuve concrète que le thème a été ajouté après coup et que ce composant a été migré, son ancienne version étant laissée dans le dépôt.

### 5.2 `ThemeToggle.jsx`
Bouton simple basé sur `useTheme()` ; au clic, appelle `toggle()`. Anime visuellement le changement d'icône Lune ↔ Soleil (lucide-react) via un système de clé/`AnimatePresence`-like de `framer-motion`.

### 5.3 `LogoTransportDakar.jsx`
Composant SVG pur (pas une image bitmap). Props : `isDark = false`, `height = 40`, `showWordmark = true`. Les couleurs du logo s'inversent selon `isDark`. Utilisé dans `LoginDecideurs.jsx`.

### 5.4 `LoadingScreen.jsx` + `.css`
Écran plein écran affiché par `FormPage.jsx` quand `loading === true`. Animation : anneaux pulsants concentriques, icône `BusFront` (lucide) qui rebondit, barre de progression indéterminée animée, texte "Génération de votre planning...". Apparition/disparition gérées en fade par `framer-motion`.

### 5.5 `MapView.jsx`
Carte interactive utilisant **Leaflet directement** (pas la librairie `react-leaflet`), avec ce commentaire explicite dans le code : *« Évite le conflit double-instance React de react-leaflet »*. Le CSS et le JS de Leaflet sont injectés dynamiquement via des balises `<link>`/`<script>` pointant vers le CDN unpkg. Le fond de carte est une tuile sombre CartoDB.

**Props** : `{zones = [], anomalies = [], height = 420, showZones = true, showAnomalies = true}`.

Deux `useEffect` :
1. Montage initial — crée l'objet `L.map`, nettoyage (`map.remove()`) au démontage.
2. Réaction aux changements de `[zones, anomalies, showZones, showAnomalies]` — recrée les marqueurs (cercles colorés).

Couleurs des marqueurs zones (`RISK_COLOR`) :
| Niveau | Couleur |
|---|---|
| ÉLEVÉ | `#ff6b6b` |
| MODÉRÉ | `#ffa94d` |
| FAIBLE | `#69db7c` |

Couleurs des marqueurs anomalies (`STATUS_COLOR`) :
| Statut | Couleur |
|---|---|
| CRITIQUE | `#ff4444` |
| ÉLEVÉ | `#ffa94d` |
| MODÉRÉ | `#74c0fc` |

Popups affichant le détail de chaque zone/site, légende superposée sur la carte.

🎓 **Question possible en soutenance — "Pourquoi ne pas avoir utilisé `react-leaflet`, qui est plus idiomatique en React ?"**
*Réponse courte* : Pour éviter un conflit de double instance React, documenté explicitement en commentaire dans le fichier source.
*Réponse détaillée* : Le commentaire dans `MapView.jsx` indique que `react-leaflet` provoquait un problème de double-instanciation de React (probablement lié à une incompatibilité de version entre `react-leaflet` et React 18, ou à un montage du DOM Leaflet en dehors du cycle React strict). La solution adoptée a été de manipuler directement l'API impérative de Leaflet (`L.map(...)`, `L.circleMarker(...)`) dans des `useEffect`, en gérant manuellement la création/destruction de la carte.

### 5.6 `ExportPDF.jsx` — fonctionnement réel de l'export PDF

C'est un composant **100% client-side**, sans aucune dépendance serveur (le commentaire en tête de fichier le précise : *« pas de dépendance serveur »*).

**Props** : `{type = 'zones', data = {}, label = 'Exporter PDF'}`.

**Étapes de `handleExport()`** :
1. `setLoading(true)`.
2. Import dynamique : `const { jsPDF } = await import('jspdf')`.
3. Construction d'un document A4 portrait (`doc = new jsPDF(...)`) sur fond sombre dessiné manuellement (`doc.rect(0,0,W,297,'F')`).
4. Bandeau d'en-tête avec logo texte "Transport Dakar", badge type de rapport (`RAPPORT INACCESSIBILITÉ` ou `RAPPORT ANOMALIES TRAFIC`), date/heure de génération.
5. 4 cartes KPI en colonnes (valeurs tirées de `data` — ex. `data.total_zones`, `data.zones_elevees`, `data.anomalies`, `data.sites_at_risk`).
6. Si `type === 'zones'` : tableau des zones (jusqu'à 20 lignes, issues de `data.zones`), avec colonnes # / Zone / Niveau / Probabilité (barre + %) / Ménages / % à risque / TC disponibles ; puis un encadré "🚨 TOP 5 ZONES PRIORITAIRES" si `data.top5_risque` existe.
7. Si `type !== 'zones'` (anomalies) : tableau des sites les plus anormaux (jusqu'à 15, issus de `data.top_sites`), avec nom du site et nombre d'anomalies/volume max.
8. Section "Recommandations opérationnelles" — **textes français hardcodés** dans le composant (pas générés par une IA ni récupérés du backend), interpolés avec quelques valeurs réelles de `data` (ex. `data.zones_elevees`, `data.sites_at_risk`).
9. Pied de page sur chaque page avec numérotation (`Page X / Y`).
10. `doc.save(filename)` où `filename` = `rapport_zones_risque_${date}.pdf` ou `rapport_anomalies_trafic_${date}.pdf`.

**Gestion d'erreur** : `catch` → `console.error('Erreur PDF:', err)` + `alert('Erreur lors de la génération du PDF. Vérifiez que jsPDF est installé : npm install jspdf')`. `finally` → `setLoading(false)`.

**Affichage du bouton** : pendant `loading`, l'icône `Loader` tourne (animation CSS `spin` injectée inline dans une balise `<style>` du composant) et le texte devient "Génération...".

🎓 **Question possible en soutenance — "Le PDF contient-il des données réelles du backend ou seulement des textes fixes ?"**
*Réponse courte* : Les deux — les KPI et tableaux viennent des données réelles passées en props (`data`), mais le texte des recommandations est hardcodé en français dans le composant.
*Réponse détaillée* : `ExportPDF` reçoit `data` en prop, qui provient des résultats d'appels API faits par la page parente (`ZonesRisquePage` ou `AnomalyDashboard`). Les chiffres affichés (nombre de zones, niveaux de risque, sites à risque, etc.) sont donc réels et dynamiques. En revanche, le texte des recommandations (ex. *« Déployer des dessertes TC complémentaires sur les X zones... »*) est un template de chaîne fixe défini dans le code du composant, où seul le nombre `X` est injecté dynamiquement (`data.zones_elevees`). Ce n'est donc pas un texte généré par le modèle ML, mais une suggestion pré-écrite par l'auteur du PFE et paramétrée par les vraies données.

---

## 6. Pages publiques (sans authentification)

### 6.1 `WelcomePage.jsx` (+ `.css`)
Page d'accueil. Affiche un logo (image PNG `assets/logo-transportdakar.png`), un badge "PFE 2026", `ThemeToggle`, un bouton "Cellule d'écoute" (`navigate('/avis')`), un bouton "Compte professionnel" qui **scroll** (pas de navigation) vers la section décideurs via `decideursSectionRef.current?.scrollIntoView(...)`. 4 cartes `FEATURES` (Réseau de bus, Itinéraires optimisés, Planning temps réel, Cellule d'écoute) — la 4e est cliquable et navigue vers `/avis`. Le CTA principal "Commencer mon planning" navigue vers `/planning`. La section "Système d'aide à la décision" contient un bouton "Se connecter" qui navigue vers `/login-decideurs`.

**Différence avec `WelcomePage.jsx.bak`** : la version `.bak` est une version **antérieure**, sans la fonctionnalité "Cellule d'écoute" (pas d'import `MessageCircleHeart`, pas de route `/avis`, seulement 3 `FEATURES` au lieu de 4, et pas d'import de l'image logo `logoTransportDakar`). Cela confirme que la fonctionnalité d'avis citoyen public a été ajoutée après une première version de la page d'accueil, et que l'ancienne version n'a pas été supprimée du dépôt.

### 6.2 `FormPage.jsx` (+ `.css`)
Composant **purement contrôlé** : il ne définit aucun state métier lui-même pour les données du formulaire, il reçoit tout en props depuis `App.js` : `{formData, handleChange, handleSubmit, loading, erreur, resultat, activeTab, resetForm}`. Seul un state local `currentStep` (0 à 3, wizard à 4 étapes : Profil / Situation / Trajet / Budget) est géré localement.

Sous-composants internes :
- `AnimatedCounter` : anime le défilement d'un nombre via `requestAnimationFrame`.
- `InputCard` : enveloppe icône + label + champ de saisie.

**Logique conditionnelle observée** : si `formData.age < 18`, les champs permis/véhicules/revenu sont masqués et un message d'avertissement s'affiche ; si `formData.etudiant === 1`, le champ revenu est également masqué. La liste des quartiers de départ/arrivée est une liste statique d'environ 19 quartiers de Dakar avec des codes type INSEE (`110101` à `110604`).

Au dernier step, le bouton "Générer mon planning" appelle `handleSubmit` (fonction passée par `App.js`, qui poste vers le backend — voir section 9). Si `loading === true`, `<LoadingScreen/>` est rendu. Si `activeTab === 'result' && resultat`, un tableau de bord de résultat est affiché avec :
- `resultat.segment_label`, `resultat.mode_recommande`, `resultat.mode_icone`
- `resultat.top3_modes` (tableau d'objets avec `mode`, `icone`, `probabilite`, `duree_fourchette`, `cout_fourchette`)
- `resultat.duree_mediane` / `duree_fourchette`
- `resultat.cout_median` / `cout_fourchette` / `cout_mensuel_str` / `part_budget`
- `resultat.segment_conseil`
- `resultat.estimation_source` (`'segment×mode'` ou autre valeur) avec `resultat.nb_reference`

Le bouton "Refaire une simulation" appelle `resetForm()` (toujours fourni par `App.js`) et remet `currentStep` à 0.

⚠️ **Anomalie observée dans le code** : dans `FormPage.css`, une valeur de `padding` semble corrompue — un caractère semblant être un chiffre bengali (« ৬ ») apparaît mêlé à une valeur CSS (`padding: '1৬px 20px'` ou équivalent observé dans `.hero-description`). Ceci ressemble à un artefact de copier-coller/encodage et est documenté ici uniquement comme observation réelle du fichier, sans extrapolation sur sa cause exacte.

### 6.3 `AvisCitoyenPage.jsx`
Formulaire public de "cellule d'écoute", sans authentification requise. `API = 'http://localhost:8000'`.

**États** : `note` (1 à 5, étoiles), `hoverNote`, `mode` (dropdown parmi `MODES`), `probleme` (dropdown parmi `PROBLEMES`), `quartier` (texte libre), `commentaire` (texte libre, max 600 caractères), `loading`, `erreur`, `envoye` (flag succès).

**Validation** : `valid = note > 0 && mode !== ''`.

**Soumission (`handleSubmit`)** : `POST ${API}/api/feedback` avec le corps JSON :
```json
{
  "note_satisfaction": <int 1-5>,
  "mode_utilise": "<string>",
  "type_probleme": "<string ou null>",
  "quartier": "<string ou null>",
  "commentaire": "<string ou null>"
}
```
En cas de succès, affiche un écran de remerciement avec bouton "Donner un autre avis" (réinitialise le formulaire). En cas d'échec, affiche un message d'erreur générique (le détail exact de l'erreur serveur n'est pas exposé à l'utilisateur).

`MODES` disponibles : Bus DDD, Tata, Car rapide, Ndiaga Ndiaye, Minibus, Taxi, Taxi clando, PTB, Autre.
`PROBLEMES` (valeurs) : `securite`, `attente`, `prix`, `confort`, `etat_infrastructure`, `ponctualite`, `aucun`, `autre`.

📌 **À retenir** : cette page **alimente directement** les KPI de la page décideurs `SatisfactionPage.jsx`, qui interroge `GET ${API}/api/feedback/stats` pour afficher les avis citoyens en direct (note moyenne, derniers commentaires, problèmes signalés) dans un panneau intitulé "Avis citoyens en direct (cellule d'écoute publique)". C'est le seul exemple observé dans le code d'un flux de données allant d'une page publique vers une page décideur via le backend.

---

## 7. Pages décideurs (protégées)

### 7.1 `LoginDecideurs.jsx`
Formulaire de connexion. États : `form {login, password}`, `error`, `show` (visibilité mot de passe), `loading`, `role` (sélection visuelle, initialisée à `'gestionnaire'` — un tableau `roles` est défini avec 2 entrées affichées comme "Profils d'accès disponibles" mais ce choix visuel n'est **pas** transmis à `login()`, qui ne reçoit que `form.login`/`form.password`), `attempts` (compteur d'échecs), `showAccounts` (affichage/masquage de la liste des comptes de démo).

**`handleSubmit`** : valide que les deux champs sont non vides, déclenche `loading = true`, puis après un `setTimeout(..., 800)` (délai artificiel, purement visuel — il n'y a pas d'appel réseau réel ici) appelle `login(form.login, form.password)` de `auth.js`. Succès → `navigate('/decideurs')`. Échec → incrémente `attempts`, affiche `result.error`, ou après le 3e échec affiche *« Trop de tentatives. Consultez les comptes de démonstration ci-dessous. »*.

La liste des comptes de démo est rendue à partir de `USERS` (importé directement depuis `auth.js`) — cliquer sur une ligne **pré-remplit automatiquement** les champs du formulaire avec `{login: u.login, password: u.password}`.

### 7.2 `DecideursLayout.jsx`
Layout avec sidebar, rend `<Outlet/>` pour les sous-routes. `NAV_GROUPS` organise le menu en sections : Vue générale (sans titre de groupe), "Reporting (Knowage)" (Cockpit), "Outils IA & Décision" (Zones à risque, Simulateur, Anomalies, Profils usagers/Segmentation, Audit ML), "Suivi & Écoute" (Satisfaction, Évolution temporelle).

Chaque item de menu est filtré par `canAccess(session, subPath)` (de `auth.js`) — si l'utilisateur n'a pas accès, l'item est affiché grisé/désactivé avec une icône de cadenas au lieu d'un `NavLink` cliquable.

États : `collapsed` (réduction sidebar), `mobileOpen` (menu hamburger mobile), `timeLeft` (compte à rebours de session, mis à jour par `setInterval` toutes les 30000ms via `getSessionTimeLeft()` ; déconnexion automatique si `<= 0`).

`logout()` local appelle `authLogout()` (de `auth.js`) puis `navigate('/login-decideurs')`.

Garde redondante : si `!session`, le composant navigue immédiatement ailleurs et retourne `null` — ce qui est en réalité redondant puisque `ProtectedRoute` a déjà filtré l'accès à ce niveau de la route.

### 7.3 `VueGenerale.jsx`
Dashboard d'accueil (`/decideurs` index). `API = 'http://localhost:8000'`.

**Appels réseau (au montage, `Promise.all`)** :
- `GET ${API}/zones-risque/resume`
- `GET ${API}/api/anomalies/summary`
- `GET ${API}/api/ml/metrics`

`apiOnline = r1.ok || r2.ok`. Le bouton "Actualiser" relance `fetchData()` avec une icône qui tourne pendant `refreshing`.

`hasAccess(path)` filtre dynamiquement les KPI et les cartes de modules en fonction de `session?.allowedRoutes`. Le tableau `MODULES` contient 7 cartes (zones-risque, simulateur, anomalies, ml-insights, segmentation, satisfaction, evolution), chacune filtrée par `hasAccess`, affichant un badge "live" avec une statistique tirée des données réellement récupérées.

Une section "Santé du modèle ML" avec barres de progression (roc_auc, f1_score, precision, recall) n'est affichée que `if (metrics && hasAccess('/decideurs/ml-insights'))`.

### 7.4 `ZonesRisquePage.jsx`
`API_URL = "http://localhost:8000"`.

**Appels réseau (montage)** :
- `GET ${API_URL}/zones-risque`
- `GET ${API_URL}/zones-risque/resume`

États : `zones`, `resume`, `loading`, `erreur` (message : *« Impossible de charger les données. Vérifiez que FastAPI tourne sur le port 8000. »*), `filtre` (TOUS/ÉLEVÉ/MODÉRÉ/FAIBLE), `recherche`, `tab` (exploitation/planification), `view` (liste/carte).

`genererRecommandations(zones, resume)` est une fonction **purement frontend** qui génère des textes de recommandation à partir de templates français fixes, interpolés avec les vraies statistiques (top zones, pourcentages). **Important** : ce ne sont pas des recommandations générées par le backend ou par un modèle d'IA — c'est une logique de présentation côté client.

Affiche `<MapView>` (mode carte) avec les zones mappées en `{zone, lat, lon, niveau_risque, prob_risque, nb_menages, dur_sante}`, et `<ExportPDF type="zones" data={{...resume, zones}} />` dans la barre de navigation.

### 7.5 `AnomalyDashboard.jsx`
`API = "http://localhost:8000"`.

**Appels réseau (montage)** :
- `GET ${API}/api/anomalies/summary`
- `GET ${API}/api/anomalies/sites`

**Appel réseau au clic sur un site (drilldown)** :
- `GET ${API}/api/anomalies/sites/${selectedSiteId}/details`

États principaux : `summary`, `sites`, `loading`, `erreur`, `search`, `filterSeverity`, `selectedSiteId`, `siteDetails`, `detailsLoading`, `tab` (exploitation/planification), `viewMode` (liste/carte).

**Flux de clic concret** : cliquer sur un site dans la liste de gauche déclenche `setSelectedSiteId(s.id)`, ce qui provoque (via `useEffect` sur `[selectedSiteId]`) l'appel `GET .../sites/{id}/details`. Le résultat (`siteDetails`) affiche alors un graphique d'anomalies par heure (BarChart recharts), une répartition par type de véhicule, et un historique des 15 pires observations avec les votes des 3 algorithmes (`votes_modeles.if`, `.lof`, `.zscore` — booléens affichés comme badges colorés "Isolation Forest" / "LOF" / "Z-Score"). Le bouton "← Voir la synthèse globale" réinitialise `selectedSiteId` à `null`.

Bascule "Vue tableau" / "Carte réseau" affiche `<MapView anomalies={...} showZones={false} height={500}/>`. Le bouton `<ExportPDF type="anomalies" .../>` est affiché uniquement si `!loading && summary`.

Les graphiques de "consensus entre algorithmes" (Isolation Forest ↔ LOF = 90.6%, etc.) et les recommandations exploitation/planification sont des **valeurs et textes hardcodés** dans le composant (pas issus d'un appel API), bien que cohérents avec les vraies données de consensus mentionnées ailleurs.

### 7.6 `SimulateurRisque.jsx`
`API_URL = "http://localhost:8000"`.

C'est la page la plus "temps réel" : un état `inputs` (objet avec `distance_tc`, `inondations`, `dur_sante`, `dur_hopital`, `dur_marche`, `tc_disponibles`, `revenu`, `budget_transport`, `taille_menage`, `nb_actifs`, `nb_voitures`, `nb_motos`, `nb_velos`, `zone`) est modifié via des sliders/inputs. Un `useEffect` avec **debounce de 250ms** (`setTimeout`) déclenche `runPrediction(inputs)` à chaque changement.

**Appel réseau** :
```
POST ${API_URL}/predict-inaccessibility
Content-Type: application/json
Body: JSON.stringify(inputs)
```
Réponse attendue (utilisée dans le rendu) : `result.prob_risque`, `result.niveau_risk` ou `result.niveau_risque`, `result.conseils` (tableau de chaînes).

Le résultat est visualisé par une **jauge circulaire SVG animée** (cercle de progression dont le `strokeDashoffset` est calculé à partir de `prob_risque`), colorée selon des seuils définis dans le frontend (`getGaugeColor` : ≥65 → rouge `#ff6b6b`, ≥45 → orange `#ffa94d`, sinon vert `#69db7c`).

Le bouton "Réinitialiser" remet `inputs` à ses valeurs par défaut codées en dur.

🎓 **Question possible en soutenance — "Pourquoi un debounce de 250ms sur le simulateur ?"**
*Réponse courte* : Pour éviter de spammer l'API à chaque pixel de déplacement d'un slider.
*Réponse détaillée* : Chaque `<input type="range">` déclenche `onChange` en continu pendant le glissement. Sans debounce, cela génère potentiellement des dizaines d'appels `fetch` par seconde vers `/predict-inaccessibility`. Le `useEffect` du composant utilise `setTimeout(() => runPrediction(inputs), 250)` avec un nettoyage (`clearTimeout`) à chaque nouveau rendu — ce qui annule l'appel précédent si l'utilisateur continue à bouger le slider, et ne lance réellement la requête que 250ms après la dernière modification.

### 7.7 `MlInsights.jsx`
`API_URL = "http://localhost:8000"`.

**Appels réseau (montage, `Promise.all`)** :
- `GET ${API_URL}/api/ml/metrics`
- `GET ${API_URL}/api/ml/features-importance`

Affiche les métriques `roc_auc`, `f1_score`, `precision`, `recall`, `train_size`, `test_size` (issues de `metrics`), un guide de lecture statique (`METRIC_DEFINITIONS`, textes fixes en français), et un graphique en barres horizontales (recharts `BarChart` avec `layout="vertical"`) du top 10 des facteurs d'importance (`importance.slice(0, 10)`), coloré par un dégradé de violets codé en dur.

### 7.8 `SegmentationPage.jsx`
`API = 'http://localhost:8000'`.

**Appel réseau (montage)** :
```
GET ${API}/api/segmentation/profils
```
Réponse attendue : `{k_clusters, rf_accuracy, rf_cv_f1, modes_rf: [...], segments: [...]}`. Le premier segment (`d.segments[0]`) est sélectionné par défaut.

Au clic sur une `SegmentCard`, le segment sélectionné change et un `RadarChart` (recharts) affiche son profil caractéristique — les données du radar (`RADAR_DATA`) sont **hardcodées dans le frontend**, indexées par `selected.label`, et ne proviennent pas de l'API (seule une correspondance texte avec le libellé du segment retourné par le backend est utilisée ; si le libellé ne correspond à aucune clé connue, `DEFAULT_RADAR` est utilisé).

`MODE_STATS` (répartition des modes de transport) est également un tableau **hardcodé** ("Stats du mode de transport (hardcodées depuis EMD)" selon le commentaire du code), affiché en camembert (`PieChart`).

### 7.9 `EvolutionTemporelle.jsx`
**Aucun appel réseau** — c'est la seule page décideur du périmètre qui ne fait pas de `fetch`. Toutes les données viennent de l'import statique :
```js
import { ANNEES, SOURCE_LABEL_EMD, SOURCE_LABEL_TRAFIC, TRAFIC, MENAGES, DEPLACEMENTS, MODES_ANNEES, INACCESSIBILITE, SEGMENTATION_ML, RECOMMANDATIONS } from '../data/evolutionData';
```
Voir section 8 pour le détail de `evolutionData.js`. La page affiche des graphiques recharts (LineChart, BarChart, AreaChart) comparant 2010/2015/2019/2023, des KPI avec deltas calculés (`Delta` component, `pct = (val2023 - val2010) / val2010 * 100`), et des cartes de "Recommandations & Interprétations" cliquables (extensible au clic, `activeReco` state) dont le contenu (`constat`, `recommandation`) est entièrement défini dans `evolutionData.js`.

Un bandeau "Note méthodologique" précise explicitement dans l'UI que seules les données 2015 (EMD) et 2019 (trafic) sont réelles, les autres années étant "reconstituées / projetées à des fins d'analyse comparative et prospective (PFE)".

### 7.10 `SatisfactionPage.jsx`
`API = 'http://localhost:8000'`.

**Appels réseau (montage)** :
- `GET ${API}/api/satisfaction`
- `GET ${API}/api/feedback/stats`

`data.satisfaction_par_mode` alimente un graphique en barres horizontales cliquable (`onClick={(d) => setSelectedMode(d.mode)}`) et un `RadarChart` de détail des critères pour le mode sélectionné. `feedback` (de `/api/feedback/stats`) alimente le panneau "Avis citoyens en direct" (note moyenne, problèmes signalés, derniers commentaires) — **c'est le lien direct observé avec les soumissions de `AvisCitoyenPage.jsx`**.

**Particularité RBAC observée** : `const session = getSession(); const priorityOrder = ROLE_PRIORITY[session?.role] || null;` — les recommandations renvoyées par l'API sont **réordonnées côté client** selon le rôle connecté (le planificateur voit en priorité "Infrastructure piétonne"/"Inclusion sociale", l'exploitant voit en priorité "Sécurité"/"Qualité de service"). Les données sous-jacentes restent les mêmes pour les deux rôles — seul l'ordre d'affichage change, avec un badge "Pertinent pour votre rôle" sur les 2 premières catégories prioritaires.

### 7.11 `CockpitDakar.jsx`
Pas d'appel `fetch` direct vers le backend FastAPI. Cette page intègre un **cockpit Knowage BI externe via iframe**, à l'URL relative `/knowage-vue/workspace/document-composite/Acceuil`, proxifiée par `setupProxy.js` vers `http://localhost:18080` (configuré en dev uniquement).

Logique notable et documentée en commentaire dans le code source lui-même :
- Le widget HTML "Accueil" du cockpit passe par un *sanitizer* serveur côté Knowage qui supprime tout `<script>`/`<iframe>`/attribut non standard à l'enregistrement du document, empêchant toute interactivité native dans Knowage.
- La solution adoptée : cliquer depuis l'EXTÉRIEUR sur les onglets internes du cockpit (`<md-tab-item>` dans une **iframe imbriquée**, `iframe.document-execution-iframe`), ce qui nécessite que le frontend React et Knowage soient sur la **même origine** (raison d'être du proxy `setupProxy.js`).
- `clickTab(label)` parcourt le DOM de l'iframe interne (`outerDoc.querySelector('iframe.document-execution-iframe')` puis son `contentDocument`) pour simuler un clic sur l'onglet correspondant.
- Un `useEffect` avec `setInterval(500ms, max 20 tentatives ≈ 10s)` force l'affichage de l'onglet "Acceuil" au premier chargement (sinon Knowage resterait sur le dernier onglet utilisé lors de l'édition du document côté serveur Knowage).
- En cas d'échec d'accès au DOM de l'iframe (origines différentes, exception levée), `status` passe à `'blocked'` et un message d'erreur explicite invite à vérifier que `setupProxy.js` est actif et que l'app est ouverte via `http://localhost:3000`.

5 boutons de navigation (`SHEETS` : Acceuil, Trafic, Déplacements, Démographie, Accessibilité, IA) sont gérés **entièrement en React**, pas par Knowage, et appellent `clickTab()` pour chaque onglet cible.

🎓 **Question possible en soutenance — "Pourquoi avoir besoin d'un proxy pour le Cockpit Knowage ?"**
*Réponse courte* : Pour que React puisse manipuler le DOM de l'iframe Knowage, il faut que les deux soient sur la même origine (même protocole+domaine+port) — sinon le navigateur bloque l'accès cross-origin par sécurité.
*Réponse détaillée* : Le code de `CockpitDakar.jsx` accède directement à `iframeRef.current.contentDocument`, ce qui n'est possible que si l'iframe est de la **même origine** que la page parente (politique *same-origin* du navigateur). Comme Knowage tourne sur `localhost:18080` et le frontend React sur `localhost:3000`, sans proxy ce serait une requête cross-origin bloquée. `setupProxy.js` (chargé automatiquement par `react-scripts` en dev) intercepte toute URL commençant par `/knowage*` et la redirige côté serveur vers `http://localhost:18080`, ce qui fait que, du point de vue du navigateur, tout reste sur `localhost:3000` — donc même origine, accès DOM autorisé. Le commentaire du fichier précise aussi qu'une configuration nginx équivalente serait nécessaire en production.

---

## 8. Les données de `data/evolutionData.js`

Ce fichier contient des **constantes JavaScript statiques** (pas d'appel réseau) représentant l'évolution du réseau sur 4 années (`ANNEES = [2010, 2015, 2019, 2023]`) :
- `TRAFIC` : sites de comptage, volume journalier, anomalies détectées, taux d'anomalie, accord entre modèles.
- `MENAGES` : nombre de ménages, taille moyenne, revenu médian, % motorisés, etc.
- `DEPLACEMENTS` : nombre de déplacements/jour, durée moyenne, coût moyen, distance moyenne.
- `MODES_ANNEES` : répartition modale (%) par année.
- `INACCESSIBILITE` : nombre de zones par niveau de risque, % ménages à risque.
- `SEGMENTATION_ML` : précision/F1/ROC-AUC du Random Forest et répartition des clusters, par année.
- `RECOMMANDATIONS` : 6 objets de recommandations textuelles (catégorie, constat, recommandation, priorité, horizon) entièrement rédigés à la main.

Le fichier documente lui-même sa méthodologie en commentaire d'en-tête : **seule l'année 2015 est réelle pour les domaines EMD** (ménages, déplacements, partage modal, inaccessibilité, segmentation ML) et **seule l'année 2019 est réelle pour le domaine Trafic** (comptages). Les autres années (2010, 2023) sont explicitement qualifiées de *« données reconstituées / projetées à des fins d'analyse comparative et prospective (PFE) »* et ne constituent pas des relevés officiels — ce message est également répété dans l'UI de `EvolutionTemporelle.jsx`.

📌 **À retenir** : ceci est une nuance essentielle pour la soutenance — la page "Évolution temporelle" présente des graphiques convaincants sur 4 années, mais **seuls 2 points de données sur 4 par domaine sont réels** ; les 2 autres sont des extrapolations volontairement choisies par l'auteur pour illustrer une tendance, pas des mesures.

---

## 9. Le flux du formulaire usager (`App.js` + `FormPage.jsx`)

`App.js` détient l'état global du parcours usager :
```js
const [formData, setFormData] = useState({...});
const [resultat, setResultat] = useState(null);
const [loading, setLoading] = useState(false);
const [erreur, setErreur] = useState(null);
const [activeTab, setActiveTab] = useState(...);
```

**`handleSubmit`** : construit `dataToSend` à partir de `formData`, en forçant `revenu`/`nb_vehicules`/`permis` à 0/2 si l'utilisateur est mineur ou étudiant (logique observée directement dans `App.js`), puis :
```
POST http://localhost:8000/recommander
Content-Type: application/json
Body: JSON.stringify(dataToSend)
```
Le résultat de cette requête alimente `resultat`, consommé ensuite par `FormPage.jsx` pour afficher le tableau de bord de recommandation (segment, mode recommandé, top 3 modes, durée/coût médians, etc. — voir section 6.2).

---

## 10. Gestion des erreurs et notifications

Il n'existe **aucune librairie de toast/notification** (pas de `react-toastify`, `react-hot-toast`, etc. trouvée dans le code lu). La gestion d'erreur observée suit systématiquement le même schéma dans toutes les pages :
1. Un état local `erreur` (ou `setErreur`), initialisé à `null`.
2. Dans le `.catch()` du `fetch`/`Promise.all`, un message d'erreur **en français, écrit à la main**, généralement de la forme *« Impossible de charger les données. Vérifiez que FastAPI tourne sur le port 8000. »* ou équivalent.
3. Affichage conditionnel d'un bandeau rouge (`background: rgba(255,107,107,0.08)`, bordure rouge, icône ⚠️) si `erreur` est défini.

Seule exception : `ExportPDF.jsx` utilise un `alert()` natif du navigateur en cas d'échec de génération PDF — c'est la seule notification "bloquante" (modal natif) du code.

📌 **À retenir** : aucune page ne distingue les erreurs réseau (timeout, CORS) des erreurs HTTP (404, 500) — tous les cas d'échec sont traités de la même façon générique, avec un message statique invitant à vérifier que FastAPI tourne sur le port 8000.

---

## 11. Tableau récapitulatif de toutes les pages

| Page | Objectif | Fichiers | Données affichées | Composants utilisés |
|---|---|---|---|---|
| WelcomePage | Accueil public, orientation usager/décideur | `WelcomePage.jsx`, `.css` | Présentation statique + liens | `ThemeToggle` |
| FormPage | Générer un planning de transport personnalisé | `FormPage.jsx`, `.css` | `resultat` du backend (`/recommander`) | `LoadingScreen` |
| AvisCitoyenPage | Cellule d'écoute publique (avis citoyen) | `AvisCitoyenPage.jsx` | Formulaire (pas d'affichage de données existantes) | — |
| LoginDecideurs | Authentification décideurs | `LoginDecideurs.jsx` | Liste `USERS` (démo) | `ThemeToggle`, `LogoTransportDakar` |
| DecideursLayout | Layout/sidebar de l'espace décideurs | `DecideursLayout.jsx` | Session utilisateur, navigation filtrée RBAC | — (rend `<Outlet/>`) |
| VueGenerale | Dashboard d'accueil décideurs | `VueGenerale.jsx` | `/zones-risque/resume`, `/api/anomalies/summary`, `/api/ml/metrics` | — |
| ZonesRisquePage | Analyse des zones à risque d'inaccessibilité | `ZonesRisquePage.jsx` | `/zones-risque`, `/zones-risque/resume` | `MapView`, `ExportPDF` |
| AnomalyDashboard | Détection d'anomalies de trafic | `AnomalyDashboard.jsx` | `/api/anomalies/summary`, `/api/anomalies/sites`, `/api/anomalies/sites/{id}/details` | `MapView`, `ExportPDF` |
| SimulateurRisque | Simulation temps réel du risque d'inaccessibilité | `SimulateurRisque.jsx` | `/predict-inaccessibility` (POST) | — |
| MlInsights | Audit/transparence du modèle ML | `MlInsights.jsx` | `/api/ml/metrics`, `/api/ml/features-importance` | — |
| SegmentationPage | Segmentation usagers + mode recommandé | `SegmentationPage.jsx` | `/api/segmentation/profils` | — |
| EvolutionTemporelle | Comparatif 2010-2023 | `EvolutionTemporelle.jsx` | `data/evolutionData.js` (statique) | — |
| SatisfactionPage | Satisfaction & écoute usagers | `SatisfactionPage.jsx` | `/api/satisfaction`, `/api/feedback/stats` | — |
| CockpitDakar | Cockpit BI Knowage intégré | `CockpitDakar.jsx` | Iframe Knowage (proxy `/knowage-vue/...`) | — |

---

