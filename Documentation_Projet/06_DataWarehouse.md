# 06 — Data Warehouse : modèle en constellation

## Sommaire
1. [Pourquoi un modèle en constellation](#1-pourquoi-un-modèle-en-constellation)
2. [Vue d'ensemble : 4 faits, 10 dimensions](#2-vue-densemble--4-faits-10-dimensions)
3. [Détail des tables de faits](#3-détail-des-tables-de-faits)
4. [Détail des dimensions](#4-détail-des-dimensions)
5. [Schéma ASCII du modèle en constellation](#5-schéma-ascii-du-modèle-en-constellation)
6. [Granularité de chaque fait](#6-granularité-de-chaque-fait)
7. [Constellation vs étoile simple : justification](#7-constellation-vs-étoile-simple--justification)
8. [À retenir et questions de soutenance](#8-à-retenir-et-questions-de-soutenance)

---

## 1. Pourquoi un modèle en constellation

Le projet CETUD couvre **quatre thématiques métier distinctes mais liées** : la mobilité quotidienne (déplacements individuels), l'accessibilité aux services de proximité (santé, éducation, administration), le comptage du trafic routier sur des sites physiques, et le profil démographique des individus/ménages. L'image validée `modele_constellation_preview.png` confirme que le projet a modélisé ces quatre thématiques par **quatre tables de faits distinctes**, partageant certaines dimensions communes (notamment `Dim_Geographie`, partagée entre `Fait_Deplacement` et `Fait_Accessibilite`). C'est la définition même d'un **modèle en constellation** (ou "galaxie de faits") : plusieurs tables de faits reliées par des dimensions communes.

> 📌 **À retenir** : un modèle en étoile (star schema) ne comporte **qu'une seule** table de faits entourée de ses dimensions. Dès qu'un projet a besoin de plusieurs sujets d'analyse distincts (ici : déplacements, accessibilité, comptage trafic, profils individu/ménage) qui partagent néanmoins certaines dimensions (le temps, la géographie...), on parle de modèle en **constellation**.

---

## 2. Vue d'ensemble : 4 faits, 10 dimensions

D'après l'image `modele_constellation_preview.png` (modèle validé du projet), la constellation est composée de :

**4 tables de faits :**
1. `Fait_Comptage`
2. `Fait_Deplacement`
3. `Fait_Accessibilite`
4. `Fait_IndividuMenage`

**10 tables de dimensions :**
1. `Dim_Site`
2. `Dim_Temps`
3. `Dim_Motif`
4. `Dim_Mode`
5. `Dim_Geographie`
6. `Dim_Transport`
7. `Dim_Difficulte`
8. `Dim_Service`
9. `Dim_Individu`
10. `Dim_Menage`

**Relations visibles sur le schéma validé :**

| Fait | Dimensions reliées (visibles sur le schéma) |
|---|---|
| `Fait_Comptage` | `Dim_Site`, `Dim_Temps` |
| `Fait_Deplacement` | `Dim_Temps`, `Dim_Motif`, `Dim_Mode`, `Dim_Geographie` |
| `Fait_Accessibilite` | `Dim_Geographie`, `Dim_Transport`, `Dim_Difficulte`, `Dim_Service` |
| `Fait_IndividuMenage` | `Dim_Geographie`, `Dim_Individu`, `Dim_Menage` |

**Dimension(s) partagée(s) entre plusieurs faits** : `Dim_Geographie` est, selon le schéma, le point de jonction central — elle est reliée à la fois à `Fait_Deplacement`, `Fait_Accessibilite` et `Fait_IndividuMenage`. C'est la dimension la plus transversale de la constellation, ce qui en fait l'axe d'analyse géographique commun à presque tous les sujets métier du projet.

> 📌 **À retenir** : sur le schéma en constellation, `Dim_Temps` est également partagée entre `Fait_Comptage` et `Fait_Deplacement`, ce qui permettrait (sous réserve d'une granularité temporelle compatible) de croiser comptages trafic et déplacements sur un même axe temporel.

---

## 3. Détail des tables de faits

### 3.1 `Fait_Accessibilite`
**Rôle métier** : mesurer l'accessibilité des ménages aux services de proximité (écoles, santé, marché, administration...) en termes de durée, mode de transport, difficultés rencontrées et contexte du logement.

**Mesures et attributs** (confirmés par `insert_fait_accessibilite.sql`) :
- `duree_marche_arret_tc` (durée de marche jusqu'à l'arrêt de transport en commun)
- `duree_acces` (durée d'accès au service)
- `duree_acces_eau` (durée d'accès à l'eau potable)
- `freq_inondation`, `manque_transport`, `variation_tarif_pluie` (indicateurs qualitatifs de vulnérabilité)
- `nb_pieces` (taille du logement)
- `depenses_menage` (dépenses mensuelles)
- `anciennete_logement` (ancienneté dans le logement)
- `transport_disponible`, `transport_disponible_pluie` (disponibilité de transport, normale et en cas de pluie)

**Clés étrangères** : `FK_id_menage`, `FK_id_transport`, `FK_id_zone_residence`, `FK_id_temps`, `FK_id_difficulte`, `FK_id_service`.

### 3.2 `Fait_Deplacement`
**Rôle métier** : mesurer chaque déplacement individuel déclaré dans l'enquête (origine, destination, durée, coût, mode, motif).

**Mesures et attributs** (confirmés par le tMap `tmap_depl.png`) :
- `duree_trajet` (durée du déplacement)
- `cout_total` (coût du déplacement)
- `heure_depart`, `heure_arrivee` (horaires)
- `Nom_depart`, `Nom_arrivee` (lieux)
- `freq_tc` (fréquence d'utilisation des transports en commun)

**Clés étrangères** : `fk_id_motif`, `fk_id_individu`, `fk_id_transport` (relié à `Dim_Mode` selon le schéma validé).

### 3.3 `Fait_Comptage`
**Rôle métier** : mesurer le trafic routier observé sur des sites de comptage physiques (volumes de véhicules par catégorie, vitesse).

**Mesures et attributs** (confirmés par le tMap `tmap_comptage.png`) :
- `VOLUME_SECT` (mesure principale : volume de véhicules comptés)
- `Amplitude` (amplitude horaire du comptage)
- `GPS_Longitude_site`, `GPS_Latitude_site` (localisation, dupliquée au niveau du fait pour faciliter les requêtes géospatiales sans jointure)

**Clés étrangères** : `FK_id_site`, `FK_id_temps`.

### 3.4 `Fait_IndividuMenage`
**Rôle métier** : mesurer le profil démographique et le comportement de mobilité agrégé par individu, rattaché à son ménage.

**Mesures et attributs** (confirmés par le tMap `tmap_indivmen.png`) :
- `age` (âge de l'individu)
- `nb_deplacements` (nombre de déplacements réalisés par l'individu — mesure agrégée)
- `num_menage` (attribut de rattachement, conservé en plus de la clé technique)

**Clés étrangères** : `FK_id_individu` (et, selon le schéma validé, relation à `Dim_Geographie` et `Dim_Menage`).

> 📌 **À retenir** : ce fait a une granularité différente des trois autres — c'est un fait à dominante "démographique/profil" plutôt qu'un fait "événementiel" (comme un déplacement ou un comptage). Sa mesure `nb_deplacements` est probablement déjà agrégée en amont (calcul du nombre total de déplacements par individu), ce qui en fait un fait de type "agrégat" plutôt qu'un fait "transactionnel" pur.

---

## 4. Détail des dimensions

### 4.1 `Dim_Menage`
**Rôle** : décrire les caractéristiques du logement et du ménage.
**Attributs** (tMap `tmap_dim_men.png`) : `Num_Menage` (clé métier), `Statut_d_occupation_du_logement`, `Type_logement`, `a_eau`, `a_electricite`, `a_internet`, `materiaux`.

### 4.2 `Dim_Individu`
**Rôle** : décrire le profil sociodémographique d'un individu.
**Attributs** (tMap `tmapdim_indiv.png`) : `num_individu`, `num_menage`, `sexe`, `statut_matrimonial`, `niveau_instruction`, `profession`, `nationalite`, `activite`, `permis`.

### 4.3 `Dim_Geographie`
**Rôle** : décrire la zone de résidence (dimension transversale partagée par plusieurs faits).
**Attributs** (tMap `tmap_geo.png`) : `Strate`, `Quartier_du_domicil`.

### 4.4 `Dim_Transport`
**Rôle** : décrire le mode de transport utilisé.
**Attributs déduits** (jointures SQL et tMap `tmap_access.png`/`tmap_depl.png`) : `code_transport` (clé de jointure métier), `pk_id_transport` (clé technique).

### 4.5 `Dim_Difficulte`
**Rôle** : décrire la première difficulté rencontrée pour accéder à un service.
**Attributs** (SQL, tMap `tmap_access.png`) : `libelle_court` (clé de jointure métier, normalisée sans accent pour le rapprochement), `pk_id_difficulte`.

### 4.6 `Dim_Service`
**Rôle** : référentiel des 13 services de proximité enquêtés (école, santé, administration, commerce).
**Attributs déduits** (SQL `CROSS JOIN LATERAL (VALUES (1, ...), (2, ...), ... (13, ...))`) : `pk_id_service` (1 à 13), et un libellé associé à chaque service — les 13 services identifiés dans le SQL sont :
1. Daara / école coranique
2. École primaire publique
3. École primaire privée
4. Enseignement moyen/secondaire public
5. Enseignement moyen/secondaire privé
6. Centre de santé / dispensaire public
7. Centre de santé / dispensaire privé
8. Hôpital public
9. Hôpital / clinique privée
10. Pharmacie
11. Marché de produits alimentaires
12. Mairie
13. Poste / centre financier

### 4.7 `Dim_Site`
**Rôle** : référentiel des sites physiques de comptage du trafic routier.
**Attributs** (tMap `tmzp_site.png`, déduplication `config_dim_site.png`) : `Identifiant_site_comptage`, `Description_site_comptage`, `Outil_Sec` (outil de comptage, transformé en indicateur), `Sens_circulation`, `type_comptage`.

### 4.8 `Dim_Temps`
**Rôle** : axe d'analyse temporel, partagé entre `Fait_Comptage` et `Fait_Deplacement` selon le schéma validé.
**Attributs déduits** (tMap `tmap_comptage.png`) : `heure`, `annee`, `MOIS`, `jour` — calculés par extraction de sous-chaînes de la date de comptage (`Integer.parseInt(row1.date_comptage.subst...)`).

### 4.9 `Dim_Motif`
**Rôle** : décrire le motif/la catégorie du déplacement (travail, étude, achats...).
**Attributs déduits** (tMap `tmap_depl.png`) : `categorie` (clé de jointure avec l'attribut source `motif`), `pk_id_motif`.

### 4.10 `Dim_Mode`
**Rôle** : décrire le mode de transport utilisé pour un déplacement, dans le contexte spécifique du fait `Fait_Deplacement` (selon le schéma validé, distinct visuellement de `Dim_Transport` qui sert plutôt au fait `Fait_Accessibilite`).

> Information non disponible dans les sources fournies : aucune capture ne montre le job de chargement dédié à `Dim_Mode` distinctement de `Dim_Transport` — le tMap du job `fact_deplacement` (`tmap_depl.png`) effectue son lookup mode/transport sur une dimension dont la requête affiche les colonnes `pk_id_transport`/`code_transport`, identiques à celles de `Dim_Transport`. Il est possible que `Dim_Mode` et `Dim_Transport` soient en réalité la même table physique partagée entre les deux faits (ce qui serait cohérent avec le principe même du modèle en constellation), mais cela ne peut pas être confirmé avec certitude à partir des seules sources fournies.

---

## 5. Schéma ASCII du modèle en constellation

```
              Dim_Site            Dim_Temps        Dim_Motif      Dim_Mode
                 │                  │   │              │             │
                 │                  │   └──────┐       │             │
                 ▼                  ▼          │       ▼             ▼
          ┌─────────────┐    ┌─────────────┐    │  ┌─────────────────────┐
          │Fait_Comptage│    │Fait_        │◄───┘  │   Fait_Deplacement   │
          │             │    │  (via Temps)│       │                      │
          └─────────────┘    └─────────────┘       └──────────┬───────────┘
                                                                │
                                                                ▼
                                                       Dim_Geographie
                                                       (dimension PIVOT,
                                                       partagée par 3 faits)
                                                                ▲
                                       ┌────────────────────────┼─────────────────────┐
                                       │                        │                     │
                              ┌────────┴─────────┐    ┌─────────┴──────────┐          │
                              │ Fait_Accessibilite│    │Fait_IndividuMenage │          │
                              └───┬───┬───┬───┬───┘    └─────────┬──────────┘          │
                                  │   │   │   │                  │                     │
                            Dim_  Dim_  Dim_  Dim_          Dim_Individu          Dim_Menage
                            Transport Difficulte Service
```

Vue détaillée (liste complète des arêtes observées sur `modele_constellation_preview.png`) :

```
Dim_Site ─────────────────── Fait_Comptage
Dim_Temps ──────────────────  Fait_Comptage
Dim_Temps ──────────────────  Fait_Deplacement
Dim_Motif ──────────────────  Fait_Deplacement
Dim_Mode ───────────────────  Fait_Deplacement
Fait_Deplacement ───────────  Dim_Geographie
Dim_Geographie ─────────────  Fait_Accessibilite
Dim_Geographie ─────────────  Fait_IndividuMenage
Dim_Transport ──────────────  Fait_Accessibilite
Dim_Difficulte ─────────────  Fait_Accessibilite
Dim_Service ────────────────  Fait_Accessibilite
Dim_Individu ───────────────  Fait_IndividuMenage
Dim_Menage ─────────────────  Fait_IndividuMenage
```

---

## 6. Granularité de chaque fait

| Fait | Granularité (1 ligne =) |
|---|---|
| `Fait_Accessibilite` | 1 couple (ménage, service de proximité fréquenté) |
| `Fait_Deplacement` | 1 déplacement individuel déclaré |
| `Fait_Comptage` | 1 relevé de comptage trafic (site, date/heure, catégorie de véhicule) |
| `Fait_IndividuMenage` | 1 individu (profil + mesure agrégée du nombre de déplacements) |

> 📌 **À retenir** : dans un modèle en constellation, chaque fait peut avoir sa **propre granularité**, adaptée à son sujet d'analyse. C'est une différence fondamentale avec un modèle en étoile unique, où toutes les mesures devraient cohabiter dans une seule table au prix de granularités artificiellement forcées ou de nombreuses valeurs NULL.

---

## 7. Constellation vs étoile simple : justification

| Critère | Étoile simple (1 fait) | Constellation (4 faits, ce projet) |
|---|---|---|
| Nombre de sujets d'analyse métier | 1 seul | 4 (mobilité, accessibilité, trafic, profil démographique) |
| Granularités différentes | Toutes les mesures forcées à la même granularité | Chaque fait conserve sa granularité naturelle (ménage×service, déplacement, comptage, individu) |
| Risque de table de faits "fourre-tout" | Élevé si on tente de tout fusionner | Évité : chaque fait reste lisible et focalisé |
| Dimensions partagées (transversalité) | Non applicable | `Dim_Geographie` et `Dim_Temps` permettent des analyses croisées entre faits |
| Exemple observé justifiant le choix | — | `Dim_Geographie` relie `Fait_Deplacement`, `Fait_Accessibilite` et `Fait_IndividuMenage` : on peut comparer, par quartier, à la fois la mobilité, l'accessibilité aux services et le profil démographique |

**Justification basée sur les besoins métier CETUD observés** :
Le projet CETUD doit répondre à des questions de transport urbain multi-thématiques : *"Quels quartiers ont le moins accès aux transports en commun ?"* (Fait_Accessibilite + Dim_Geographie), *"Quels sont les motifs et modes de déplacement dominants ?"* (Fait_Deplacement + Dim_Motif + Dim_Mode), *"Quels axes routiers sont les plus chargés ?"* (Fait_Comptage + Dim_Site + Dim_Temps), et *"Quel est le profil des ménages/individus enquêtés ?"* (Fait_IndividuMenage + Dim_Individu + Dim_Menage). Ces quatre questions sont de nature différente (granularité, dimensions pertinentes, mesures) — les regrouper dans un schéma en étoile unique aurait nécessité soit une table de faits avec une grille de colonnes incomplète (beaucoup de NULL), soit une perte d'information. Le modèle en constellation permet de garder chaque sujet propre tout en conservant la possibilité d'analyses croisées via les dimensions communes (`Dim_Geographie` en particulier).

---

## 8. À retenir et questions de soutenance

> 📌 **À retenir (synthèse)**
> - Le DW du projet CETUD est un modèle en **constellation** : 4 faits (Comptage, Déplacement, Accessibilité, IndividuMénage) et 10 dimensions.
> - `Dim_Geographie` est la dimension la plus transversale, partagée par 3 des 4 faits — c'est l'axe d'analyse géographique commun du projet.
> - `Dim_Temps` est partagée entre `Fait_Comptage` et `Fait_Deplacement`.
> - Chaque fait a sa propre granularité naturelle : couple ménage-service, déplacement individuel, relevé de comptage, ou profil individuel.
> - Le choix de la constellation plutôt que l'étoile simple est justifié par la diversité des sujets d'analyse métier (mobilité, accessibilité, trafic, démographie) du projet CETUD.

> 🎓 **Questions possibles en soutenance**
> 1. Qu'est-ce qui différencie un modèle en étoile d'un modèle en constellation ? Donnez un exemple concret tiré de votre projet.
> 2. Pourquoi `Dim_Geographie` est-elle reliée à trois faits différents ? Quel type d'analyse cela permet-il ?
> 3. Quelle est la granularité de `Fait_Accessibilite` ? Pourquoi n'est-ce pas "1 ligne par ménage" mais "1 ligne par ménage et par service" ?
> 4. `Dim_Mode` et `Dim_Transport` semblent avoir des colonnes similaires (`pk_id_transport`/`code_transport`) : s'agit-il de la même dimension physique partagée entre deux faits, ou de deux dimensions distinctes ? Comment le vérifieriez-vous techniquement ?
> 5. Pourquoi `Fait_IndividuMenage` contient-il une mesure déjà agrégée (`nb_deplacements`) plutôt que de laisser cette agrégation être calculée à la volée depuis `Fait_Deplacement` ?
> 6. Quels inconvénients aurait eu un modèle en étoile unique pour ce projet, comparé à la constellation retenue ?
> 7. Comment garantiriez-vous la cohérence entre `Dim_Temps` utilisée par `Fait_Comptage` (granularité heure) et celle potentiellement utilisée par `Fait_Deplacement` ?
> 8. Si le CETUD voulait ajouter une cinquième thématique d'analyse (par exemple la sécurité routière), comment l'intégreriez-vous dans cette constellation existante ?

> Information non disponible dans les sources fournies : le type exact de clé technique (entier auto-incrémenté, séquence PostgreSQL...) utilisé pour les clés primaires des dimensions, ainsi que la taille réelle du Data Warehouse (nombre de lignes par table) et la fréquence d'actualisation du DW, ne sont pas précisés dans le SQL, le dictionnaire de données ni les captures fournies.
