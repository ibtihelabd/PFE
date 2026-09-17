# 05 — ETL avec Talend

## Sommaire
1. [Vue d'ensemble du pipeline](#1-vue-densemble-du-pipeline)
2. [Étape 1 — Extraction vers la zone de staging (SA)](#2-étape-1--extraction-vers-la-zone-de-staging-sa)
3. [Étape 2 — Chargement des dimensions](#3-étape-2--chargement-des-dimensions)
4. [Étape 3 — Chargement des faits](#4-étape-3--chargement-des-faits)
5. [Composants Talend observés : rôle et pertinence](#5-composants-talend-observés--rôle-et-pertinence)
6. [Schéma ASCII du pipeline global](#6-schéma-ascii-du-pipeline-global)
7. [À retenir et questions de soutenance](#7-à-retenir-et-questions-de-soutenance)

---

## 1. Vue d'ensemble du pipeline

Les captures d'écran fournies montrent des **jobs Talend Open Studio for Data Integration**, organisés en deux familles :

1. **Jobs d'alimentation du staging** (`SA_individu`, `SA_men` / `Job deplacement`) : ils lisent un fichier source et écrivent dans le schéma `SA` de PostgreSQL.
2. **Jobs d'alimentation du Data Warehouse** (`Dim_geographie`, `Dim_individu`, `Dim_menage`, `Dim_site`, `fait_accessibilite`, `fact_deplacement` (déduit), `fact_comptage` (déduit), `fact_indivMen` (déduit)) : ils lisent depuis `SA` (et parfois depuis `DW` pour des lookups), transforment via un `tMap`, et écrivent dans `DW`.

Le pipeline global suit donc la logique :

```
Source brute → Extraction (tDBInput/connecteur fichier) → Nettoyage léger (tFilterColumns)
   → Chargement Staging (SA) → Extraction Staging + Lookups dimensions (tDBInput multiples)
   → Transformation/Mapping (tMap) → Dédoublonnage si besoin (tSortRow + tUniqRow)
   → Chargement Data Warehouse (tDBOutput, schéma DW)
```

> 📌 **À retenir** : Talend Open Studio fonctionne par **jobs graphiques** : chaque rectangle bleu clair est un "Job", chaque icône est un "composant" (tDBInput, tMap, tDBOutput...), et chaque flèche orange représente un flux de données nommé (`row1 (Main)`, `row2 (Lookup)`...). Le type de flux (`Main` vs `Lookup`) indique le rôle du flux dans le composant `tMap` qui suit.

---

## 2. Étape 1 — Extraction vers la zone de staging (SA)

### 2.1 Job `SA_individu` (capture `SA_indiv.png`)

```
INDIVIDU ──row1 (Main)──► tFilterColumns_1 ──row2 (Main)──► tDBOutput_1
```

- **Entrée** : composant source nommé `INDIVIDU` (icône violette, probablement un fichier délimité/Excel représentant `CETUD_BD_EMD_INDIVIDU_COMPILE.xls` selon les fichiers sources mentionnés).
- **Transformation visible** : `tFilterColumns_1`, qui sélectionne/filtre un sous-ensemble de colonnes du fichier source brut.
- **Sortie** : `tDBOutput_1`, écriture dans la table `SA.individu` (PostgreSQL).
- **Pourquoi ce choix** : un `tFilterColumns` à ce stade permet d'éliminer dès l'extraction les colonnes inutiles du fichier source (souvent très large dans les enquêtes EMD), réduisant le volume stocké en staging sans perdre l'information utile au DW.

### 2.2 Job `SA_men` (capture `SA_men  men job.png`)

```
deplacement ──row1 (Main)──► tFilterColumns_1 ──row2 (Main)──► tDBOutput_1
```
*(Note : malgré le nom du fichier capture, le composant source visible dans cette image est étiqueté `deplacement` et le job s'intitule "Job deplacement 0.1" — cf. capture `SA_deplacement.png` qui montre le même schéma avec le même nommage)*

- **Entrée** : composant source `deplacement`.
- **Transformation** : `tFilterColumns_1`.
- **Sortie** : `tDBOutput_1` → table `SA.deplacement`.
- Le schéma observé est identique à celui de `SA_individu` : extraction → filtre colonnes → chargement staging. C'est un pattern Talend répété pour chaque source (ménage, individu, déplacement, trafic), ce qui assure une cohérence et une maintenabilité du pipeline (le même squelette de job est dupliqué pour chaque entité).

> 📌 **À retenir** : la présence systématique du composant `tFilterColumns` entre la source et le `tDBOutput` montre que même au stade du staging, un minimum de nettoyage structurel (sélection de colonnes) est appliqué — le staging n'est pas une copie 100% brute, mais une "quasi-brute" légèrement filtrée.

---

## 3. Étape 2 — Chargement des dimensions

### 3.1 Job `Dim_geographie` (capture `dim_geoo.png`, `dim_geo.png`)

```
tDBInput_2 (SA.menage) ──row1 (Main)──► tMap_1 ──dim_geo (Main)──► tDBOutput_1 (DW.Dim_Geographie)
```

- **Composant source `tDBInput_2`** : configuré sur PostgreSQL, base `CETUD_PFE`, schéma `SA`, hôte `localhost:5432`, utilisateur `postgres`. Sa requête SQL est :
  ```sql
  SELECT DISTINCT "Strate", "Quartier_du_domicile" FROM "SA"."menage" WHERE ...
  ```
  Le mot-clé `DISTINCT` est essentiel : il garantit que la dimension géographique ne contient qu'une ligne par combinaison unique (Strate, Quartier), évitant les doublons issus des milliers de lignes ménages.
- **tMap_1** : mapping direct, `row1.Strate` → `dim_geo.Strate`, `row1.Quartier_du_domicile` → `dim_geo.Quartier_du_domicil` (renommage de colonne visible).
- **tDBOutput_1** : écrit dans `DW.Dim_Geographie`.
- **Pertinence** : extraire la dimension géographique directement de la table de faits source (plutôt que d'un référentiel séparé) est pragmatique quand aucun référentiel géographique normalisé n'existe en amont — mais cela suppose une bonne qualité de saisie du champ `Quartier_du_domicile` (texte libre), point de vigilance qualité.

### 3.2 Job `Dim_individu` (capture `dim_indiv.png`)

```
tDBInput_1 (SA.individu) ──row1 (Main)──► tMap_1 ──DIM_INDIVIDU (Main)──► tDBOutput_1 (DW.Dim_Individu)
```

- **Composant source `tDBInput_1`** : requête SQL visible :
  ```sql
  SELECT "_Numero_de_l_Individu" AS num_individu,
         "_Numero_du_Menage"     AS num_menage, ...
  ```
  Le renommage des colonnes (`AS num_individu`) est effectué dès l'extraction SQL, plutôt que dans le `tMap` — choix de simplification qui évite un mapping supplémentaire.
- **tMap_1** (capture `tmapdim_indiv.png`) : mapping 1-pour-1 de toutes les colonnes (`num_individu`, `num_menage`, `sexe`, `statut_matrimonial`, `niveau_instruction`, `profession`, `nationalite`, `activite`, `permis`) vers `DIM_INDIVIDU`. Aucune transformation de valeur n'est visible (pas d'expression Java personnalisée) : c'est un mapping "passe-plat".
- **tDBOutput_1** : écrit dans `DW.Dim_Individu`.

### 3.3 Job `Dim_menage` (capture `dim_menage.png`)

```
tDBInput_1 (SA.menage) ──row1 (Main)──► tMap_1 ──dim_menage (Main)──► tDBOutput_1 (DW.Dim_Menage)
```

- **Requête SQL du `tDBInput_1`** : `SELECT DISTINCT "Numero_du_Menage", "Statut_d_occupation_du_logement", "Typ...` — encore une fois `DISTINCT` pour garantir l'unicité de la dimension.
- **tMap_1** (capture `tmap_dim_men.png`) : mapping avec renommage de colonnes :
  - `Numero_du_Menage` → `Num_Menage`
  - `Statut_d_occupation_du_logement` → `Statut_d_occupation_du_logement`
  - `Type_de_logement` → `Type_logement`
  - `Adduction_d_eau_potable_dans_le_logement_la_concession` → `a_eau`
  - `Votre_logement_est_il_raccorde_au_reseau_electrique` → `a_electricite`
  - `Votre_menage_a_t_il_un_acces_internet_wifi` → `a_internet`
  - `Materiaux_des_murs_du_logement` → `materiaux`
- **Pertinence** : ce renommage en noms courts et normalisés (`a_eau`, `a_electricite`, `a_internet`, `materiaux`) rend le modèle DW plus lisible et plus simple à requêter pour les rapports BI, en s'affranchissant des noms de colonnes verbeux issus du questionnaire d'enquête.

### 3.4 Job `Dim_site` (captures `dim_site.png`, `config_dim_site.png`, `tmzp_site.png`)

```
tDBInput_1 (SA.trafic) ──row1 (Main)──► tMap_1 ──dim_site (Main)──► tSortRow_1
   ──row2 (Main)──► tUniqRow_1 ──row3 (Uniques)──► tDBOutput_1 (DW.Dim_Site)
```

C'est le job de dimension le plus élaboré observé, avec **4 composants après l'extraction** :

1. **`tDBInput_1`** : requête `SELECT DISTINCT "SA"."trafic"."Identifiant_site_comptage", "SA"."trafic"."Desc...` sur la table `SA.trafic`.
2. **`tMap_1`** (capture `tmzp_site.png`) : mapping avec une logique conditionnelle visible dans les expressions :
   - `row1.Identifiant_site_comptage` → `Identifiant_site_comptage`
   - `row1.Description_site_comptage` → `Description_site_comptage`
   - `"1".equals(String.valueOf(row1.Type_outil_compta...))` → `Outil_Sec` *(expression Java conditionnelle : transformation d'un code en booléen/texte normalisé)*
   - `row1.Description_sens_circulation` → `Sens_circulation`
   - `"1".equals(String.valueOf(row1.Type_comptage)) ?...` → `type_comptage` *(idem, expression ternaire conditionnelle)*
3. **`tSortRow_1`** : tri des lignes (préparation nécessaire avant dédoublonnage, car `tUniqRow` fonctionne plus efficacement/correctement sur des données triées).
4. **`tUniqRow_1`** : dédoublonnage explicite. La capture `config_dim_site.png` montre la configuration : les 5 colonnes (`Identifiant_site_comptage`, `Description_site_comptage`, `Outil_Sec`, `Sens_circulation`, `type_comptage`) sont toutes cochées comme **"Attribut de clé"**, ce qui signifie que l'unicité est vérifiée sur la combinaison de ces 5 champs. Le flux de sortie `row3 (Uniques)` ne contient que les lignes uniques.
5. **`tDBOutput_1`** : écrit dans `DW.Dim_Site`.

> 📌 **À retenir** : ce job illustre un pattern ETL classique pour construire une dimension à partir d'une table de mesures répétées (la table trafic peut contenir plusieurs comptages pour le même site) : `tMap` (calcul/normalisation) → `tSortRow` (tri) → `tUniqRow` (dédoublonnage) → `tDBOutput` (chargement). C'est plus rigoureux que les autres jobs de dimension qui se contentent d'un `DISTINCT` SQL en amont — ici la déduplication est faite explicitement côté Talend, probablement parce que la combinaison de colonnes nécessaire (5 attributs avec logique conditionnelle calculée) ne peut pas être dédupliquée directement par un simple `SELECT DISTINCT` SQL en amont.

---

## 4. Étape 3 — Chargement des faits

### 4.1 Job `fait_accessibilite` (captures `fact_accessibilite.png`, `tmap1_access.png`, `tmap_access.png`)

```
tDBInput_1 (Main, SA.menage + 13 services) ──row1──┐
tDBInput_4 (Lookup, DW.Dim_Menage)        ──row2──┤
tDBInput_3 (Lookup, DW.Dim_Transport)     ──row3──┼──► tMap_1 ──Fact_accessibilite (Main)──► tDBOutput_1
tDBInput_2 (Lookup, DW.Dim_Geographie)    ──row4──┤
tDBInput_5 (Lookup, DW.Dim_Difficulte)    ──row5──┤
tDBInput_6 (Lookup, DW.Dim_Service)       ──row6──┘
```

C'est le job le **plus complexe** observé : **1 flux principal + 5 flux de lookup**, tous convergeant dans un seul `tMap_1`.

- **`tDBInput_1` (Main)** : exécute la requête de dépivotage décrite dans `tDBInput1_fait_accessibilite.sql` — un grand `UNION ALL` de 13 `SELECT` (un par service de proximité), chacun filtré par `WHERE <Service>_frequence IS NOT NULL AND ... NOT ILIKE '%pas n%'`. C'est cette requête qui transforme la table large `SA.menage` en un flux "long" exploitable.
- **`tDBInput_4`, `tDBInput_3`, `tDBInput_2`, `tDBInput_5`, `tDBInput_6`** : 5 lectures de lookup vers les dimensions déjà chargées (`Dim_Menage`, `Dim_Transport`, `Dim_Geographie`, `Dim_Difficulte`, `Dim_Service`), connectées en pointillés (flux `Lookup`) au `tMap_1`.
- **`tMap_1`** (détaillé dans `tmap1_access.png` et `tmap_access.png`) : pour chaque ligne, le tMap réalise 4 lookups par clé d'expression :
  - `row1.Numero_du_Menage = row2.Num_Menage` → récupère `pk_id_menage`
  - `row1.mode = row3.code_transport` → récupère `pk_id_transport`
  - `row1.Quartier_du_domicile = row4.Quartier_du_domicil` → récupère `pk_id_zone_residence`
  - `row1.difficulte = row5.libelle_court` → récupère `pk_id_difficulte`
  - `row1.id_svc = row6.pk_id_service` → récupère `pk_id_service`
  - Puis il assemble la ligne de fait `Fact_accessibilite` avec ses 12 mesures/attributs directs (`freq_inondation`, `manque_transport`, `variation_tarif_pluie`, `nb_pieces`, `duree_acces_eau`, `depenses_menage`, `anciennete_logement`, `duree_tc`).
- **`tDBOutput_1`** : écrit dans `DW.Fait_accessibilite`.

> Cette configuration Talend (visible dans les captures) correspond exactement à la logique du fichier `insert_fait_accessibilite.sql` fourni, qui réalise la même opération en SQL pur (`CROSS JOIN LATERAL` + `LEFT JOIN` multiples). Les deux versions (SQL direct et job Talend) implémentent la même transformation — il est probable que l'une soit un prototype/validation de l'autre.

> 📌 **À retenir** : un `tMap` Talend peut recevoir **un flux principal (Main)** et **plusieurs flux secondaires (Lookup)**. Les flux Lookup servent uniquement à résoudre des clés étrangères (recherche de `pk_id_...` à partir d'un attribut métier comme un libellé ou un code) — ils ne sont jamais la source du volume de données, seul le flux Main détermine le nombre de lignes en sortie.

### 4.2 Job de fait déplacement (capture `Fact_depla.png`, tMap `tmap_depl.png`)

```
tDBInput_4 (Main) ──row1──┐
tDBInput_3 (Lookup, Dim_Motif)     ──row2──┤
tDBInput_2 (Lookup, Dim_Individu)  ──row3──┼──► tMap_1 ──fact_deplacement (Main)──► tDBOutput_1
tDBInput_5 (Lookup, Dim_Transport) ──row5──┘
```

- **Lookups réalisés dans `tMap_1`** (capture `tmap_depl.png`) :
  - `row1.motif = row2.categorie` → `pk_id_motif`
  - `row1.num_individu + "|" + row1.num_menage = row3.cle_individu` → `pk_id_individu` *(clé composite, voir justification en `04_Base_de_donnees.md`)*
  - `row1.mode = row5.code_transport` → `pk_id_transport`
- **Sortie `fact_deplacement`** : `fk_id_motif`, `fk_id_individu`, `fk_id_transport`, `num_individu`, `duree_trajet`, `Nom_depart`, `Nom_arrivee`, `cout_total`, `heure_depart`, `heure_arrivee`, `num_menage`, `freq_tc`.
- **Pertinence du choix de clé composite** : un même `num_individu` (ex. "1", "2"...) est répété dans chaque ménage ; sans concaténation avec `num_menage`, le lookup produirait des correspondances ambiguës ou erronées. Le `tMap` calcule la même clé composite côté dimension (`cle_individu`) pour garantir une correspondance fiable en `Inner Join`/`Correspondance unique`.

### 4.3 Job de fait comptage (capture `fact_compt.png`, tMap `tmap_comptage.png`)

```
tDBInput_1 (Main, table trafic) ──row1──┐
tDBInput_2 (Lookup, Dim_Site)   ──row2──┼──► tMap_1 ──fact_compt (Main)──► tDBOutput_1
tDBInput_3 (Lookup, Dim_Temps)  ──row3──┘
```

- **Lookups** :
  - `row1.Description_site_comptage = row2.desc_site` → `id_site` (alias `FK_id_site`)
  - Clé de jointure temporelle calculée par expression Java :
    - `row1.Heure_debut_comptage` → `heure`
    - `Integer.parseInt(row1.date_comptage.subst...)` (×3, pour année/mois/jour) → `annee`, `MOIS`, `jour`
  - Ces composantes calculées (`heure`, `annee`, `MOIS`, `jour`) servent de clé d'expression pour récupérer `pk_id_temps` dans `Dim_Temps`.
- **Sortie `fact_compt`** : `FK_id_site`, `FK_id_temps`, `GPS_Longitude_site`, `GPS_Latitude_site`, `Amplitude_comptage` (alias `Amplitude`), `VOLUME_SECT`.
- **Pertinence** : le découpage de la date en année/mois/jour par extraction de sous-chaîne (`substring` + `parseInt`) est un pattern ETL classique pour alimenter une dimension temps avec une granularité fine (jour, voire heure).

### 4.4 Job de fait individu-ménage (capture `fact_indivmen.png`, tMap `tmap_indivmen.png`)

```
tDBInput_1 (Main) ──row1 (Main)──┐
tDBInput_2 (Lookup, Dim_Individu)──row2──┼──► tMap_1 ──fact_indivMen (Main)──► tDBOutput_1
```

- **Lookup** : `row1.num_individu + "|" + row1.num_menage = row2.cle_individu` → `pk_id_individu` (alias `FK_id_individu`). Configuration explicite visible : `Lookup Model = Charger une fois`, `Match Model = Correspondance unique`, `Join Model = Inner Join`, `Store temp data = false`.
- **Sortie `fact_indivMen`** : `FK_id_individu`, `age`, `num_menage`, `nb_deplacements`.
- **Pertinence du `Inner Join` strict** : contrairement aux jointures `LEFT JOIN`/`COALESCE` du SQL d'accessibilité, ici un `Inner Join` est utilisé — ce qui signifie que seuls les individus pour lesquels une correspondance existe réellement dans `Dim_Individu` sont conservés dans le fait. C'est cohérent puisque la dimension individu est censée être chargée avant ce job (ordre de dépendance du pipeline).

---

## 5. Composants Talend observés : rôle et pertinence

| Composant | Icône / type | Rôle observé dans les jobs CETUD | Pourquoi ce choix est pertinent |
|---|---|---|---|
| **Source fichier** (`INDIVIDU`, `deplacement`) | icône violette/verte de connecteur fichier | Lit le fichier source brut (Excel/CSV des enquêtes EMD) | Premier point d'entrée du pipeline ; Talend gère nativement la lecture de multiples formats fichiers sans code |
| **`tFilterColumns`** | icône bleue avec filtre | Sélectionne un sous-ensemble de colonnes du fichier source avant écriture en staging | Réduit le volume stocké, élimine les colonnes inexploitées dès l'extraction |
| **`tDBInput`** | icône bleue base de données | Lit une table PostgreSQL (`SA.*` ou `DW.*`) via une requête SQL paramétrée | Permet d'écrire des requêtes SQL avancées (DISTINCT, UNION ALL, alias) directement à la source, réduisant la charge de transformation dans le tMap |
| **`tMap`** | icône avec flèches croisées | Composant central de transformation : mapping de colonnes, expressions Java, lookups multiples, jointures (Inner/Left), gestion des clés composites | Cœur de la logique ETL : centralise toutes les règles de transformation et de résolution de clés étrangères dans un éditeur visuel |
| **`tSortRow`** | icône avec flèches de tri | Trie les lignes avant un traitement de dédoublonnage | Le tri améliore la performance et la fiabilité du composant `tUniqRow` qui suit |
| **`tUniqRow`** | icône avec croix rouge | Filtre les lignes pour ne garder que les combinaisons uniques sur les colonnes déclarées "clé" | Garantit qu'une dimension (ici `Dim_Site`) ne contient aucun doublon avant chargement, condition essentielle à l'intégrité du modèle en étoile/constellation |
| **`tDBOutput`** | icône bleue/verte base de données | Écrit le flux final dans la table cible PostgreSQL (`SA.*` en staging, `DW.*` en final) | Point de sortie du job, charge effectivement les données dans la base |

> 📌 **À retenir** : Talend matérialise visuellement la distinction **Extract – Transform – Load** : `tDBInput`/connecteurs fichiers = Extract, `tMap`/`tSortRow`/`tUniqRow` = Transform, `tDBOutput` = Load. Chaque job correspond généralement à une seule table cible, ce qui facilite la maintenance (un job = une responsabilité).

---

## 6. Schéma ASCII du pipeline global

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SOURCES BRUTES (fichiers CETUD)                      │
│   CETUD_BD_EMD_MENAGE_COMPILE.xls │ CETUD_BD_EMD_INDIVIDU_COMPILE.xls        │
│   Deplacement.csv                  │ CETUD_BD_TRAFIC_SECTION_COMPILE.xls     │
└──────────────────────┬────────────────────────────────────────────────────-─┘
                       │  EXTRACTION (connecteurs fichiers Talend)
                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   Job SA_men/deplacement   Job SA_individu     (jobs équivalents : trafic)  │
│   source ─► tFilterColumns ─► tDBOutput          (NETTOYAGE structurel léger)│
└──────────────────────┬────────────────────────────────────────────────────-─┘
                       │  CHARGEMENT STAGING
                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SCHÉMA "SA" — Staging Area (PostgreSQL)                  │
│         SA.menage   │   SA.individu   │   SA.deplacement   │  SA.trafic     │
└──────────────────────┬────────────────────────────────────────────────────-─┘
                       │  EXTRACTION + LOOKUPS (tDBInput multiples)
                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   Jobs DIMENSIONS :                                                         │
│   Dim_geographie (DISTINCT + tMap)                                          │
│   Dim_individu   (SQL alias + tMap passe-plat)                              │
│   Dim_menage      (DISTINCT + tMap renommage)                               │
│   Dim_site        (tMap calculs conditionnels + tSortRow + tUniqRow)        │
│   [Dim_temps, Dim_motif, Dim_mode, Dim_transport, Dim_difficulte, Dim_service│
│     — alimentées selon le même pattern]                                     │
└──────────────────────┬────────────────────────────────────────────────────-─┘
                       │  CHARGEMENT DIMENSIONS
                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│   Jobs FAITS (1 flux Main + N flux Lookup vers les dimensions déjà chargées)│
│   fait_accessibilite : Main(SA.menage dépivoté) + 5 Lookups                 │
│   fact_deplacement   : Main(SA.deplacement) + 3 Lookups                     │
│   fact_comptage      : Main(SA.trafic) + 2 Lookups                         │
│   fact_indivMen      : Main(SA.individu) + 1 Lookup                        │
└──────────────────────┬────────────────────────────────────────────────────-─┘
                       │  TRANSFORMATION (tMap) + VALIDATION (lookups, COALESCE,
                       │  normalisation accents) + CHARGEMENT (tDBOutput)
                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                  SCHÉMA "DW" — Data Warehouse (PostgreSQL)                  │
│     4 tables de FAITS  +  10 tables de DIMENSIONS (modèle en constellation) │
│              ──────► Exploitation par les outils de restitution BI ◄──────  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. À retenir et questions de soutenance

> 📌 **À retenir (synthèse)**
> - Le pipeline Talend suit le cycle Extract (fichiers/tDBInput) → Transform (tMap, tSortRow, tUniqRow) → Load (tDBOutput), répété pour chaque table source et chaque table cible.
> - Les jobs de dimension utilisent `DISTINCT` (SQL) ou `tUniqRow` (Talend) pour garantir l'unicité des lignes de dimension.
> - Les jobs de fait combinent systématiquement un flux principal (Main) avec plusieurs flux de lookup (un par dimension à résoudre), tous fusionnés dans un seul `tMap`.
> - Une clé composite (`num_individu + "|" + num_menage`) est recalculée à la fois côté fait et côté dimension pour fiabiliser les jointures sur l'individu.
> - Les choix de jointure (`Inner Join` strict vs `LEFT JOIN` + `COALESCE`) varient selon le besoin métier : strict quand la dimension est garantie complète, permissif avec valeur par défaut quand des valeurs manquantes sont à anticiper.

> 🎓 **Questions possibles en soutenance**
> 1. Quelle est la différence entre un flux `Main` et un flux `Lookup` dans un `tMap` Talend, et pourquoi cette distinction est-elle structurante pour le pipeline ?
> 2. Pourquoi le job `Dim_site` nécessite-t-il un `tSortRow` suivi d'un `tUniqRow`, alors que les autres jobs de dimension se contentent d'un `SELECT DISTINCT` ?
> 3. Expliquez le rôle du `tFilterColumns` dans les jobs d'alimentation du staging (`SA_individu`, `SA_men`). Que se passerait-il si on le supprimait ?
> 4. Dans le job `fait_accessibilite`, combien de flux convergent vers le `tMap_1` ? Quel est le rôle de chacun ?
> 5. Pourquoi le job `fact_indivMen` utilise-t-il un `Inner Join` strict pour son lookup, alors que `fait_accessibilite` utilise des `LEFT JOIN` avec valeurs par défaut ?
> 6. Comment la date de comptage (`date_comptage`) est-elle décomposée en année/mois/jour dans le tMap du job de comptage, et pourquoi ce découpage est-il utile pour `Dim_Temps` ?
> 7. Quel est l'ordre de dépendance obligatoire entre les jobs Talend (quel job doit s'exécuter avant quel autre) ? Pourquoi ?
> 8. Si une nouvelle source de données arrivait (par exemple une enquête de satisfaction usagers), comment l'intégreriez-vous dans ce pipeline en respectant les mêmes patterns observés ?

> Information non disponible dans les sources fournies : l'orchestration globale des jobs (existence d'un job "maître" / `tRunJob` enchaînant automatiquement tous les jobs dans l'ordre, planification/fréquence d'exécution, gestion des erreurs au niveau du job, journalisation) n'apparaît dans aucune capture fournie.
