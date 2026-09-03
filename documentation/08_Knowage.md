# 08 — Knowage : l'outil de Business Intelligence du projet CETUD

> Document pédagogique destiné à un lecteur débutant en BI. Toutes les informations factuelles (cockpits, indicateurs, widgets, mécanismes techniques) proviennent exclusivement des sources suivantes : `KNOWAGE.pdf`, `knowage_navigation_darkmode_graphiques.md`, `accueil_knowage_v3.html`, `sheet_accessibilite_v3.html` et l'image `knowadge.png` (logo). Aucun élément n'a été inventé. Lorsqu'une information n'est pas présente dans ces sources, cela est explicitement indiqué.

---

## 0. Avant de commencer : quelques définitions simples

Pour suivre ce document sans connaissances préalables en BI (Business Intelligence) :

| Terme | Explication simple |
|---|---|
| **Outil BI (Business Intelligence)** | Un logiciel qui transforme des données brutes (souvent stockées dans une base de données ou un Data Warehouse) en informations visuelles compréhensibles : tableaux, graphiques, indicateurs. Le but est d'aider à la décision. |
| **Cockpit** | Dans Knowage, un cockpit (appelé aussi "document composite") est une page de tableau de bord qui regroupe plusieurs feuilles ("sheets") et plusieurs widgets, comme le tableau de bord d'une voiture regroupe plusieurs cadrans. |
| **Dashboard / Sheet** | Une feuille (onglet) à l'intérieur d'un cockpit, dédiée à un thème (ex. trafic, démographie). |
| **Widget** | Un composant visuel unitaire à l'intérieur d'une sheet : une carte KPI, un graphique en barres, une carte interactive, un bloc de texte. |
| **Dataset (BI)** | Un ensemble de données préparé et nommé, généralement issu d'une requête sur une base de données, que l'outil BI utilise pour alimenter ses widgets. |
| **KPI (Key Performance Indicator / indicateur clé de performance)** | Un chiffre unique et synthétique qui résume une information importante (ex. "78 % d'accessibilité"). |
| **Data Warehouse (entrepôt de données)** | Une base de données organisée spécifiquement pour l'analyse (souvent en "schéma en étoile" ou "en constellation" avec des tables de faits et des tables de dimensions), par opposition à une base de données de production. |
| **Constellation de faits/dimensions** | Modèle de Data Warehouse où plusieurs tables de faits (mesures, ex. "déplacement", "comptage trafic") partagent des tables de dimensions communes (axes d'analyse, ex. "commune", "date", "mode de transport"). |

📌 **À retenir : Knowage ne stocke pas les données lui-même.** C'est un outil de restitution (visualisation) qui vient lire des données déjà préparées ailleurs (typiquement dans un Data Warehouse) pour les afficher sous forme de cockpits.

---

## 1. Présentation de Knowage et rôle dans l'architecture globale

### 1.1 Qu'est-ce que Knowage ?

D'après le logo observé (`knowadge.png`) et les sources textuelles, **Knowage** est l'outil de Business Intelligence utilisé dans le projet CETUD pour construire le cockpit appelé **"TransportDakar"**. C'est une plateforme open source de BI qui permet de créer des **documents composites** (cockpits) constitués de plusieurs **sheets**, chaque sheet étant un **widget HTML/CSS** géré via un éditeur de widget intégré à Knowage (PDF, p.2 ; markdown, §Contexte).

Le cockpit du projet est accessible à l'URL `workspace/document-composite/Acceuil` et comporte **six feuilles** :

```
┌─────────────────────────────────────────────────────────────────┐
│                Cockpit "TransportDakar" (Knowage)                │
│            workspace/document-composite/Acceuil                  │
├───────────┬─────────┬──────────────┬─────────────┬──────────────┬─────────────┐
│  Acceuil  │ Trafic  │ Déplacements │ Démographie │ Accessibilité│ IA & Prévisions │
└───────────┴─────────┴──────────────┴─────────────┴──────────────┴─────────────┘
```

### 1.2 Pourquoi Knowage a-t-il été choisi ?

Information non disponible dans les sources fournies. Aucun document parmi le PDF, le markdown ou les HTML ne justifie explicitement le choix de Knowage par rapport à d'autres outils BI (ex. Power BI, Tableau, Metabase). Seul le fait que Knowage soit l'outil effectivement utilisé est documenté.

### 1.3 Rôle de Knowage dans l'architecture globale du projet

D'après les sources disponibles, on peut établir le schéma général suivant (uniquement la partie visible depuis Knowage) :

```
   [Sources de données CETUD]                 [Data Warehouse]                [Knowage]
   (enquêtes EMD, comptages                  (constellation de faits          (cockpit TransportDakar :
   trafic, données démographiques...)   →     et dimensions, mentionnée    →   6 sheets / widgets HTML-CSS
                                               dans le contexte du projet)      affichant KPI et graphiques)
```

📌 **À retenir : dans ce document, on documente uniquement le maillon "restitution" (Knowage)**, c'est-à-dire la façon dont les chiffres du Data Warehouse sont affichés à l'utilisateur final sous forme de cockpit. La construction du Data Warehouse lui-même (ETL, modélisation) relève d'un autre document du PFE.

Réponse attendue : un outil BI sert à transformer des données stockées (ici dans le Data Warehouse CETUD) en représentations visuelles exploitables par un décideur. Knowage est la brique de restitution du projet : il affiche, via des cockpits, les indicateurs de mobilité urbaine de Dakar (trafic, déplacements, démographie, accessibilité) sans modifier ni recalculer les données sources.

---

## 2. Datasets utilisés et lien avec le Data Warehouse

### 2.1 Ce qui est explicitement documenté

Les sources fournies (PDF, markdown, fichiers HTML) ne décrivent pas la configuration technique des datasets Knowage (requêtes SQL, connexion JDBC, nom des datasets dans le référentiel Knowage). Elles documentent en revanche les **données effectivement affichées** dans les widgets des sheets "Acceuil" et "Accessibilité", qui sont les deux sheets dont le code HTML réel a été observé.

**Information non disponible dans les sources fournies :** le nom technique exact des datasets Knowage, le mode de connexion à la base de données, et la requête utilisée pour peupler chaque widget.

### 2.2 Ce qui est observable : les indicateurs affichés sur la sheet "Acceuil"

D'après `accueil_knowage_v3.html`, la sheet d'accueil affiche les KPI suivants (cartes `.td-kpi`) :

| KPI affiché | Valeur observée | Libellé secondaire |
|---|---|---|
| 🚶 Déplacements | 156 764 | +12 % vs moyenne |
| 🏠 Ménages | 3 176 | EMD Dakar |
| 👥 Individus | 26 830 | Enquêtés |
| 📍 Sites | 101 | Comptage trafic |
| 🏛️ Communes | 14 | Couverture EMD |

Ces libellés ("EMD Dakar", "Enquêtés", "Comptage trafic", "Couverture EMD") indiquent que les données affichées proviennent vraisemblablement d'une **Enquête Ménages Déplacements (EMD)** et de **sites de comptage du trafic** — ce qui correspond au type de faits qu'on retrouverait dans un Data Warehouse de mobilité urbaine organisé autour de plusieurs tables de faits (ex. fait "déplacement", fait "comptage trafic") et de dimensions partagées (ex. dimension "commune", dimension "individu/ménage", dimension "site").

📌 **À retenir : le lien exact entre chaque widget et une table de faits précise du DW (les "4 faits / 10 dimensions" mentionnés dans le contexte du projet) n'est pas documenté explicitement dans les fichiers fournis pour cette tâche.** On peut seulement constater, par les libellés affichés, une cohérence thématique forte avec une architecture EMD + comptages trafic.

### 2.3 Ce qui est observable : les indicateurs affichés sur la sheet "Accessibilité"

D'après `sheet_accessibilite_v3.html`, les KPI affichés sont :

| KPI affiché | Valeur observée | Libellé secondaire |
|---|---|---|
| ♿ Accessibilité globale | 78 % | Score moyen |
| 🚏 Distance moy. arrêt | 480 m | Domicile → arrêt |
| ⏱️ Temps moyen accès | 12 min | À pied |
| 🏘️ Communes bien desservies | 9 / 14 | Score ≥ 70 % |
| ⚠️ Zones sous-desservies | 3 | Score < 50 % |

Réponse honnête à donner : "Les widgets affichent des indicateurs cohérents avec les données de l'Enquête Ménages Déplacements et des comptages trafic du Data Warehouse CETUD (déplacements, ménages, individus, sites, communes, accessibilité). La configuration technique précise des datasets Knowage (requêtes, connexions) n'a pas été formalisée dans la documentation disponible à ce stade — c'est un point à clarifier/compléter si la question est posée en détail."

---

## 3. Les cockpits/dashboards identifiés réellement dans les sources

D'après le PDF et le markdown, le document composite comporte **six sheets**. Le contenu HTML réel n'a été fourni que pour deux d'entre elles (Acceuil et Accessibilité) ; les quatre autres (Trafic, Déplacements, Démographie, IA & Prévisions) sont nommées et évoquées (notamment via les blocs de navigation et le bloc "IA & Prévisions" visible sur la sheet Acceuil) mais leur contenu HTML détaillé n'a pas été fourni dans les sources de cette tâche.

### 3.1 Sheet "Acceuil" (page d'accueil du cockpit)

**Objectif.** Donner une vue d'ensemble synthétique de la mobilité urbaine à Dakar : volumétrie des déplacements, localisation géographique des sites de comptage, résumé exécutif, aperçus rapides de trafic/déplacements/démographie, et un bloc de prévisions IA.

**Indicateurs affichés (KPI)** : Déplacements (156 764), Ménages (3 176), Individus (26 830), Sites (101), Communes (14).

**Types de graphiques/widgets observés :**
- Une **carte interactive simulée de Dakar** (`#td-map` / `.td-mapmock`) avec des points ("sites") représentant des zones (Plateau, Médina, Pikine, Grand Yoff, Dakar Centre, Parcelles Assainies, Fann, Guédiawaye), des halos de couleur ("glow") représentant visuellement une densité, et une légende explicative ("🟠 Sites de comptage — Halo = densité de déplacements").
- Un bloc **"Résumé exécutif"** sous forme de liste (`.td-resume`) : Zone la plus fréquentée = Plateau, Heure de pointe = 7h-9h, Commune la plus mobile = Pikine, Taux d'accessibilité = 78 %.
- Trois **mini-graphiques en barres** (`.td-bars`, version simple sans axe Y gradué dans ce fichier) :
  - **Trafic** par tranche horaire (6h à 22h, 9 barres, hauteurs de 30 % à 95 %).
  - **Déplacements** par mode (Bus, Marche, Taxi, 2 roues, Voiture — hauteurs 85 %, 55 %, 30 %, 20 %, 15 %).
  - **Démographie** par tranche d'âge (0-17, 18-29, 30-44, 45-59, 60+ — hauteurs 48 %, 52 %, 38 %, 60 %, 25 %).
- Un bloc **"IA & Prévisions"** (`.td-ia`) avec trois cartes textuelles :
  - "Prévision trafic — semaine prochaine" : hausse attendue de 8 % sur les axes Plateau–Pikine en heures de pointe.
  - "Détection d'anomalies" : 3 sites de comptage présentent un comportement atypique cette semaine.
  - "Zones à risque de congestion" : Médina et Grand Yoff classées zones prioritaires d'intervention.
- Un bloc de **navigation visuelle** (`.td-nav`) vers les 5 autres sheets (Trafic, Déplacements, Démographie, Accessibilité, IA).

**Filtres/paramètres observés :** aucun filtre interactif (sélecteur de date, de commune, etc.) n'est visible dans le code HTML fourni pour cette sheet. Le seul élément interactif "structurel" est le bouton de bascule clair/sombre (`#td-dark-toggle`).

**Interprétation métier possible (à partir des seules données affichées) :** le cockpit met en avant Plateau comme zone la plus fréquentée et Pikine comme commune la plus mobile, avec une pointe de trafic en fin de journée (18h-22h selon les hauteurs de barres) et une accessibilité globale jugée correcte (78 %) mais avec des signaux d'alerte localisés (Médina, Grand Yoff) à surveiller.

### 3.2 Sheet "Accessibilité"

**Objectif.** Mesurer et visualiser le niveau d'accès aux transports en commun par commune, par mode de transport et par tranche horaire, et identifier les zones sous-desservies.

**Indicateurs affichés (KPI)** :
- Accessibilité globale : 78 % (score moyen)
- Distance moyenne arrêt : 480 m (domicile → arrêt)
- Temps moyen d'accès : 12 min (à pied)
- Communes bien desservies : 9 / 14 (score ≥ 70 %)
- Zones sous-desservies : 3 (score < 50 %)

**Types de graphiques observés (avec axe Y gradué et étiquette de valeur, version améliorée par rapport à la sheet Acceuil) :**

1. **Accessibilité par commune** (graphique en barres, échelle 0-100) :

```
100 ┤
 75 ┤              92%   85%
 50 ┤                          78%
 25 ┤                                  62%   48%   35%
  0 ┼───────────────────────────────────────────────────
      Plateau  Médina  G.Yoff  Pikine  Guédiaw.  Rufisque
```

2. **Accessibilité par mode de transport** : Bus 82 %, Car rapide 60 %, Taxi 45 %, Marche 30 %.
3. **Accessibilité par tranche horaire** : Matin 90 %, Midi 70 %, Soir 55 %, Nuit 35 %.
4. **Zones sous-desservies** (focus communes périphériques) : Rufisque 35 %, Bargny 28 %, Sébikotane 20 %.

**Résumé accessibilité (bloc `.td-resume`)** : Meilleure commune = Plateau (92 %), Commune à risque = Rufisque (35 %), Mode le plus accessible = Bus, Évolution annuelle = +4 %.

**Bloc "Insights Accessibilité"** (`.td-ia`) :
- "Fracture territoriale" : les communes périphériques (Rufisque, Bargny) restent nettement sous-desservies.
- "Nuit pénalisante" : le score d'accessibilité chute à 35 % en période nocturne, faute d'offre de transport.
- "Bus = mode clé" : le réseau de bus couvre 82 % des besoins d'accès, devant le car rapide et le taxi.

**Filtres/paramètres observés :** aucun filtre interactif de type liste déroulante ou sélecteur n'apparaît dans le code HTML. Seul le bouton clair/sombre est interactif.

**Interprétation métier.** Le cockpit révèle une **fracture territoriale centre-périphérie** : les communes centrales (Plateau, Médina) ont une accessibilité très supérieure (92 %, 85 %) aux communes périphériques (Rufisque 35 %, en dessous du seuil de 50 % considéré comme "sous-desservi"). Le bus apparaît comme le mode de transport le plus structurant pour l'accessibilité, et la nuit est identifiée comme la période la plus pénalisante, ce qui pointe vers un manque d'offre de transport nocturne.

### 3.3 Autres sheets nommées mais non détaillées dans les sources fournies

Les sheets **Trafic**, **Déplacements**, **Démographie** et **IA & Prévisions** existent dans le cockpit (confirmé par le PDF, le markdown, et les cartes de navigation visibles dans le HTML), mais leur contenu HTML détaillé (quels KPI, quels graphiques précis) n'a pas été fourni dans les sources de cette tâche au-delà des aperçus présents sur la sheet Acceuil (mini-graphiques Trafic/Déplacements/Démographie et bloc IA & Prévisions décrits en §3.1).

**Information non disponible dans les sources fournies :** le détail complet (KPI, graphiques, filtres) des sheets Trafic, Déplacements, Démographie et IA & Prévisions pris individuellement.

Réponse attendue : un cockpit unique "TransportDakar" composé de 6 sheets (Acceuil, Trafic, Déplacements, Démographie, Accessibilité, IA & Prévisions). La sheet Acceuil donne une vue de synthèse globale (carte, résumé exécutif, mini-aperçus, prévisions IA), tandis que la sheet Accessibilité approfondit un thème précis (l'accès aux transports par commune, mode et tranche horaire).

Réponse attendue : le graphique "Accessibilité par commune" de la sheet Accessibilité, qui oppose Plateau (92 %) à Rufisque (35 %), complété par le bloc "Zones sous-desservies" qui isole Rufisque, Bargny et Sébikotane.

---

## 4. Widgets et types de visualisation observés réellement

D'après les deux sheets HTML disponibles, l'inventaire réel des types de widgets utilisés est le suivant :

| Type de widget | Description | Où il est observé |
|---|---|---|
| **Carte KPI** (`.td-kpi`) | Carte avec icône, libellé, valeur chiffrée en gros, et une mention de tendance/contexte | Toutes les sheets (5 KPI par sheet observée) |
| **Carte interactive simulée** (`.td-mapmock`) | Représentation visuelle de Dakar avec points géolocalisés stylisés, halos de densité et légende | Sheet Acceuil uniquement |
| **Liste "résumé"** (`.td-resume`) | Liste à puces avec libellé à gauche et valeur mise en avant à droite | Acceuil ("Résumé exécutif"), Accessibilité ("Résumé accessibilité") |
| **Graphique en barres simple** (`.td-bars`, sans axe gradué) | Barres avec hauteur en %, sans étiquette de valeur ni échelle visible | Sheet Acceuil (mini-graphiques Trafic/Déplacements/Démographie) |
| **Graphique en barres avec axe Y gradué + étiquette de valeur** (`.td-chart` + `.td-yaxis` + `.bv`) | Version améliorée : graduation verticale (0/25/50/75/100), valeur numérique affichée au-dessus de chaque barre, quadrillage de fond | Sheet Accessibilité (4 graphiques) |
| **Bloc "Insights" / IA** (`.td-ia`) | Bloc à fond sombre contenant plusieurs cartes textuelles d'analyse ou de prévision | Acceuil ("IA & Prévisions"), Accessibilité ("Insights Accessibilité") |
| **Cartes de navigation** (`.td-navcard`) | Cartes cliquables (visuellement) reproduisant les 6 destinations du cockpit, avec mise en évidence de la sheet active | Toutes les sheets |
| **Bouton de bascule clair/sombre** (`.td-theme-btn` + case à cocher cachée) | Bouton rond en forme de label, basculant l'intégralité des couleurs du sheet | Toutes les sheets |

📌 **À retenir : tous ces widgets sont construits "à la main" en HTML/CSS dans l'éditeur de widget de Knowage**, et non via des widgets graphiques "natifs" préconfigurés de Knowage (type widget chart standard avec assistant). C'est une particularité importante du projet : Knowage est utilisé ici comme moteur d'affichage de documents composites personnalisés en HTML/CSS, plutôt que comme générateur de graphiques automatiques à partir d'un dataset connecté graphiquement.

Réponse honnête à donner : dans la version observée, les graphiques en barres sont du HTML/CSS où la hauteur de chaque barre (`style="height:NN%"`) est définie manuellement à partir de la valeur de la donnée. Ce n'est pas un graphique généré dynamiquement par un moteur de rendu connecté à un dataset Knowage natif — c'est un widget HTML personnalisé affichant les valeurs sous forme de barres. Le lien dynamique automatique avec le Data Warehouse à chaque chargement n'est pas démontré dans les sources fournies.

---

## 5. Navigation et expérience utilisateur

Cette section s'appuie sur `knowage_navigation_darkmode_graphiques.md` et sur le code réel des deux sheets HTML.

### 5.1 Une contrainte technique fondatrice : le filtre de sécurité (sanitizer) de Knowage

Knowage applique, **côté serveur**, au moment de la sauvegarde au niveau du document composite, un filtre de sécurité (sanitizer) qui rejette systématiquement :
- toute balise `<script>` ;
- tout attribut de gestionnaire d'événement inline (`onclick`, `onchange`, etc.).

Si l'un de ces éléments est présent, la sauvegarde échoue avec le message **« Invalid HTML payload »**, même si le bouton **SAVE** de l'éditeur de widget avait semblé fonctionner.

📌 **À retenir : cette contrainte est la clé de voûte de toute l'expérience utilisateur du cockpit.** Elle explique pourquoi la navigation, le mode sombre et les graphiques ont dû être conçus **sans une seule ligne de JavaScript**, uniquement avec HTML et CSS.

> Remarque d'observation technique : le fichier `accueil_knowage_v3.html` contient cependant un bloc `<script>` (lignes 144-170) qui tente de relier les cartes de navigation (`data-sheet`) aux boutons d'onglets natifs de Knowage (`sheetPageButton-X`) par un clic programmatique. Le markdown de référence explique que ce type d'attribut/de script est rejeté par le sanitizer au niveau de la sauvegarde document — il s'agit donc probablement d'une version intermédiaire/expérimentale du widget, antérieure ou parallèle à la version "finale" sans JavaScript décrite dans le guide technique. Le fichier `sheet_accessibilite_v3.html`, lui, ne contient aucun `<script>` ni `onclick`, ce qui est cohérent avec la version validée par le sanitizer.

### 5.2 Deux niveaux de navigation complémentaires

**a) La navigation native de Knowage (barre d'onglets).** Knowage affiche en haut du document composite une barre d'onglets correspondant à chaque sheet. C'est le mécanisme **principal et fonctionnel** : un clic change immédiatement de sheet, sans aucun code nécessaire. Ce mécanisme a été testé et validé pour circuler entre les 6 sheets, dans les deux sens.

**b) Les "cartes de navigation" visuelles internes (`.td-nav` / `.td-navcard`).** En bas de chaque sheet, un bloc de cartes stylisées reproduit visuellement les six destinations (icône + libellé), avec mise en évidence (bordure orange + fond clair, classe `.active`) sur la carte correspondant à la sheet actuellement affichée. **Ces cartes sont purement visuelles** : elles n'ont pas d'attribut `onclick` (interdit par le sanitizer) et ne déclenchent donc pas elles-mêmes le changement de sheet — elles servent de repère "vous êtes ici" cohérent sur toutes les pages, le changement réel de sheet se faisant via la barre d'onglets native.

```
   Barre d'onglets Knowage (native, fonctionnelle)
   [Acceuil] [Trafic] [Déplacements] [Démographie] [Accessibilité] [IA]
        ↓ clic = changement de sheet réel

   En bas de chaque sheet : cartes .td-nav (repère visuel uniquement)
   🚦 Trafic   🚌 Déplacements   👥 Démographie   ♿ Accessibilité (active)   🤖 IA
```

### 5.3 Mode clair / sombre, 100 % CSS

Le bouton 🌓 visible dans l'en-tête de chaque sheet est en réalité un `<label>` relié à une case à cocher invisible (`<input type="checkbox" id="td-dark-toggle" style="display:none">`). Le mécanisme repose sur le sélecteur CSS moderne `:has()` :

```css
#td-home:has(#td-dark-toggle:checked) { background:#0B1220; color:#E2E8F0; }
```

Cette règle se lit : "si le conteneur `#td-home` contient quelque part une case `#td-dark-toggle` cochée, alors appliquer ce style sombre". Tant que l'utilisateur n'a pas cliqué, la condition est fausse et le thème reste clair (par défaut) ; dès le clic, toutes les règles préfixées par ce sélecteur s'appliquent instantanément, **sans rechargement de page et sans JavaScript**.

Les deux sheets observées (Acceuil et Accessibilité) intègrent ce mécanisme et déclinent le thème sombre sur : le fond général, les cartes KPI, les cartes de contenu, les listes résumé, les graphiques (axes, barres, étiquettes) et les cartes de navigation.

### 5.4 Graphiques à axe Y réel et étiquettes de valeur

**Problème initial documenté :** dans une première version, chaque barre n'était positionnée qu'avec une hauteur en pourcentage (`style="height:62%"`), sans aucune indication numérique ni repère sur l'axe vertical — impossible de savoir si 62 % correspondait à 62 trajets, un score, ou autre chose.

**Solution adoptée (visible dans la sheet Accessibilité) :** chaque graphique combine trois blocs côte à côte :
1. `.td-yaxis` : échelle verticale graduée (ex. 100/75/50/25/0), calculée manuellement selon la valeur maximale de la série ;
2. `.td-barswrap > .td-bars` : les barres, chacune avec un `<span class="bv">` affichant la vraie valeur numérique au-dessus de la barre (positionnement CSS pur via `position:absolute; bottom:100%`) ;
3. `.td-barlabels` : les libellés de l'axe horizontal (communes, modes, tranches horaires…).

Un fond hachuré (`repeating-linear-gradient`) simule un quadrillage de lecture à 25/50/75/100 %, en CSS pur, sans SVG ni JavaScript.

📌 **À retenir : l'ensemble de l'expérience utilisateur du cockpit (navigation, thème, graphiques) a été conçu pour respecter une contrainte de sécurité serveur stricte (pas de script, pas de gestionnaire d'événement inline), ce qui a orienté tous les choix techniques vers des solutions 100 % HTML/CSS.**

Réponse attendue : parce que Knowage applique un filtre de sécurité serveur (sanitizer) au moment de la sauvegarde du document composite, qui rejette toute balise `<script>` et tout attribut `onclick`/`onchange`. Toute tentative d'utiliser du JavaScript provoque l'erreur "Invalid HTML payload" et empêche la sauvegarde réelle. La solution a donc consisté à utiliser des techniques purement CSS : sélecteur `:has()` pour le mode sombre, positionnement absolu/flex pour les graphiques, et la barre d'onglets native de Knowage pour la navigation réelle.

Réponse attendue : explication du couple `<input type="checkbox">` caché + `<label for="...">` cliquable + sélecteur CSS `:has()`, qui permet de styliser un conteneur parent selon que la case cachée est cochée ou non, sans aucun script.

Réponse attendue : oui, deux niveaux de sauvegarde existent. Le bouton SAVE de l'éditeur de widget valide la sauvegarde "locale" du widget mais ne garantit rien côté serveur. Seule la sauvegarde au niveau du document (icône disque dans le menu cockpit/hamburger) déclenche le filtre de sécurité serveur, avec confirmation par un toast "Saved" (succès) ou un message "Invalid HTML payload" (échec, nécessitant de retirer tout script/attribut interdit). Il faut ensuite recharger complètement la page pour vérifier que la modification a bien persisté.

---

## 6. Comment Knowage va chercher les données dans le Data Warehouse

### 6.1 Principe général d'un outil BI (explication pédagogique)

De manière générale, dans un outil BI comme Knowage, le principe est le suivant :
1. L'outil BI se connecte à une source de données (souvent un Data Warehouse via une connexion de type JDBC/ODBC, ou un autre type de connecteur).
2. L'administrateur de l'outil BI définit des **datasets** : des requêtes (SQL ou autres) qui extraient un sous-ensemble de données pertinent (ex. "déplacements par commune et par mois").
3. Ces datasets sont ensuite associés à des **widgets** (graphiques, tableaux, KPI) à l'intérieur d'un document/cockpit.
4. Lorsqu'un utilisateur ouvre le cockpit, Knowage exécute (ou réutilise en cache) les requêtes des datasets et alimente dynamiquement les widgets avec les résultats.

### 6.2 Ce qui est explicitement documenté dans les sources de ce projet

Les sources fournies pour cette tâche (PDF, markdown, fichiers HTML) ne décrivent **pas** la chaîne technique réelle de connexion entre Knowage et le Data Warehouse CETUD (pas de configuration de source de données, pas de requête SQL, pas de nom de dataset Knowage). Elles documentent uniquement :
- la structure du document composite (cockpit "TransportDakar" en 6 sheets) ;
- le fait que chaque sheet est un **widget HTML/CSS** géré dans l'éditeur de widget, et non un widget "graphique standard" connecté visuellement à un dataset via l'interface graphique de configuration de Knowage ;
- les valeurs numériques affichées dans ces widgets (probablement saisies/calculées en amont puis intégrées en HTML statique dans le widget, étant donné que les hauteurs de barres sont des valeurs CSS inline fixes et non des liaisons dynamiques visibles dans le code).

**Information non disponible dans les sources fournies :** la chaîne de connexion réelle entre Knowage et la base de données du Data Warehouse CETUD (type de connecteur, requêtes SQL des datasets, fréquence de rafraîchissement, mécanisme de mise à jour automatique des widgets HTML à partir des données vivantes du DW).

📌 **À retenir : dans l'état des sources disponibles, le lien "widget Knowage → Data Warehouse" repose sur le principe général de tout outil BI (dataset = requête sur la base, widget = restitution visuelle de ce dataset), mais la configuration technique précise propre au projet CETUD n'a pas été documentée dans les fichiers remis pour cette tâche.** Il est donc honnête, en soutenance, de présenter le principe général tout en reconnaissant que le détail de l'implémentation (datasets Knowage, requêtes) reste à documenter/clarifier si la question est creusée.

Réponse honnête à donner : "Le principe général d'un outil BI comme Knowage est de définir des datasets connectés au Data Warehouse, que l'on associe ensuite à des widgets. Dans la version observée de nos sheets HTML, les valeurs sont intégrées directement dans le code du widget (par exemple les hauteurs de barres en pourcentage). La configuration précise de la connexion entre Knowage et notre Data Warehouse (requêtes, datasets nommés) n'est pas formalisée dans la documentation que j'ai sous la main actuellement — c'est un point que je peux approfondir si nécessaire."

---

## 7. KPI identifiés réellement

Récapitulatif de tous les KPI réellement observés dans les sources (sheets Acceuil et Accessibilité) :

**Sheet Acceuil :**
- Déplacements : 156 764 (+12 % vs moyenne)
- Ménages : 3 176 (EMD Dakar)
- Individus : 26 830 (Enquêtés)
- Sites : 101 (Comptage trafic)
- Communes : 14 (Couverture EMD)
- (dans le résumé exécutif) Zone la plus fréquentée = Plateau ; Heure de pointe = 7h-9h ; Commune la plus mobile = Pikine ; Taux d'accessibilité = 78 %

**Sheet Accessibilité :**
- Accessibilité globale : 78 % (score moyen)
- Distance moyenne arrêt : 480 m (domicile → arrêt)
- Temps moyen d'accès : 12 min (à pied)
- Communes bien desservies : 9 / 14 (score ≥ 70 %)
- Zones sous-desservies : 3 (score < 50 %)
- (dans le résumé) Meilleure commune = Plateau (92 %) ; Commune à risque = Rufisque (35 %) ; Mode le plus accessible = Bus ; Évolution annuelle = +4 %

**Information non disponible dans les sources fournies :** les KPI précis des sheets Trafic, Déplacements, Démographie et IA & Prévisions pris individuellement (au-delà des mini-aperçus visibles sur la sheet Acceuil).

Réponse possible (argumentée à partir des données observées) : le score d'**accessibilité globale (78 %)** est central car il synthétise en un seul chiffre la qualité de desserte en transport, et il est répété sur plusieurs sheets (Acceuil et Accessibilité), ce qui montre son rôle de KPI transversal du cockpit.

---

## 8. Sécurité et connexions Knowage

**Sécurité applicative du widget (sanitizer HTML) :** documentée précisément en section 5.1 — Knowage rejette toute balise `<script>` et tout attribut de gestionnaire d'événement inline (`onclick`, `onchange`, etc.) au moment de la sauvegarde du document composite, avec un message d'erreur "Invalid HTML payload" en cas de non-conformité.

**Sécurité de la plateforme (utilisateurs, rôles, droits d'accès), installation serveur, et configuration de connexion à la base de données :** Information non disponible dans les sources fournies. Aucun élément du PDF, du markdown ou des fichiers HTML ne documente la gestion des comptes utilisateurs Knowage, les rôles/permissions, le protocole d'authentification, ni les paramètres serveur (installation, ports, configuration de la base de données sous-jacente).

Réponse honnête à donner : "La seule mesure de sécurité documentée et observée concrètement dans notre travail est le filtre de sécurité serveur (sanitizer) qui s'applique à la sauvegarde des widgets HTML, et qui bloque tout JavaScript ou gestionnaire d'événement inline pour éviter les failles de type injection de script (XSS). Les aspects de sécurité applicative plus larges de Knowage (gestion des utilisateurs, droits d'accès, authentification) n'ont pas été documentés dans le cadre de cette partie du projet."

---

## 10. Synthèse visuelle du cockpit (vue d'ensemble)

```
┌────────────────────────────────────────────────────────────────────┐
│  TransportDakar                                            🌓      │
│  Urban Mobility Intelligence Platform                               │
├────────────────────────────────────────────────────────────────────┤
│ [🚶156 764] [🏠3 176] [👥26 830] [📍101] [🏛️14]                    │  ← KPI cards
├──────────────────────────────────────┬───────────────────────────────┤
│   Carte interactive de Dakar          │  Résumé exécutif              │
│   (sites de comptage + densité)       │  Plateau / 7h-9h / Pikine /78%│
├───────────────┬───────────────┬───────┴───────────────────────────────┤
│   Trafic       │  Déplacements │   Démographie                        │
│   (barres/h)   │  (par mode)   │   (par âge)                          │
├────────────────┴───────────────┴───────────────────────────────────────┤
│  🤖 IA & Prévisions : hausse trafic / anomalies / zones à risque       │
├────────────────────────────────────────────────────────────────────────┤
│  🚦Trafic  🚌Déplacements  👥Démographie  ♿Accessibilité  🤖IA          │  ← navigation
└────────────────────────────────────────────────────────────────────────┘
```

---

