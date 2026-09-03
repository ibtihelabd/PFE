# 04 — Base de données

## Sommaire
1. [Contexte et architecture générale](#1-contexte-et-architecture-générale)
2. [La zone de Staging (schéma `SA`)](#2-la-zone-de-staging-schéma-sa)
3. [Le Data Warehouse (schéma `DW`)](#3-le-data-warehouse-schéma-dw)
4. [Schéma relationnel ASCII](#4-schéma-relationnel-ascii)
5. [Choix de modélisation observés](#5-choix-de-modélisation-observés)
6. [Tableau récapitulatif des tables](#6-tableau-récapitulatif-des-tables)
7. [À retenir et questions de soutenance](#7-à-retenir-et-questions-de-soutenance)

---

## 1. Contexte et architecture générale

D'après les captures d'écran Talend (composants `tDBInput`/`tDBOutput` PostgreSQL) et le fichier SQL `insert_fait_accessibilite.sql`, la base de données du projet est organisée en **deux schémas distincts** au sein d'une même base PostgreSQL nommée `CETUD_PFE` :

- **Schéma `SA`** (Staging Area / zone de préparation) : il contient les tables brutes ou quasi brutes issues des fichiers sources CETUD (enquêtes ménages-déplacements EMD, comptages trafic). On y trouve par exemple les tables `"SA"."menage"`, `"SA"."individu"`, `"SA"."deplacement"`, `"SA"."trafic"`.
- **Schéma `DW`** (Data Warehouse) : il contient les tables de dimensions et de faits du modèle décisionnel final, utilisées pour l'analyse. On y trouve par exemple `"DW"."Dim_Menage"`, `"DW"."Dim_Transport"`, `"DW"."Dim_Geographie"`, `"DW"."Dim_Difficulte"`, `"DW"."Fait_accessibilite"`.

Ces informations sont directement visibles :
- dans le SQL fourni (`INSERT INTO "DW"."Fait_accessibilite" (...) SELECT ... FROM "SA"."menage" m ... LEFT JOIN "DW"."Dim_Menage" dm ...`) ;
- dans les propriétés des composants `tDBInput` des jobs Talend (capture `dim_geoo.png`, `dim_indiv.png`, `dim_menage.png`, `dim_site.png`) qui affichent explicitement : Base de données = `"CETUD_PFE"`, Schéma = `"SA"`, Hôte = `"localhost"`, Port = `"5432"`, Utilisateur = `"postgres"`.

> 📌 **À retenir** : la base de données CETUD repose sur PostgreSQL (confirmé par le composant Talend `tDBInput` configuré en `PostgreSQL`, version "V9 et plus") et adopte une séparation classique en deux zones : une zone brute de staging (`SA`) et un entrepôt de données structuré en faits/dimensions (`DW`). Cette séparation est une bonne pratique ETL : elle isole les données sources (souvent sales, hétérogènes, en français avec accents, valeurs libres) du modèle décisionnel propre et normalisé.

---

## 2. La zone de Staging (schéma `SA`)

Le schéma `SA` reçoit l'image quasi brute des fichiers sources CETUD (déplacements, individus, ménages, trafic). Les jobs Talend `SA_individu`, `SA_men`, `Job deplacement` (visibles dans les captures `SA_indiv.png`, `SA_men  job.png`, `SA_deplacement.png`) chargent ces données via un pipeline simple : `Source (fichier) → tFilterColumns → tDBOutput`.

### 2.1 Table `SA.menage`

C'est la table la plus large observée. Elle est utilisée comme source principale du job `fait_accessibilite` (cf. `insert_fait_accessibilite.sql` et `tDBInput1_fait_accessibilite.sql`).

Colonnes identifiées explicitement dans le SQL fourni :

| Colonne (telle qu'écrite dans le SQL) | Rôle |
|---|---|
| `Numero_du_Menage` | Identifiant métier du ménage (texte, peut contenir des caractères non numériques — nettoyé ensuite par `REGEXP_REPLACE`) |
| `Quartier_du_domicile` | Quartier de résidence du ménage (clé de jointure vers la géographie) |
| `La_duree_pour_aller_a_pied_du_domicile_a_l_arret_des_TC_le_plus` | Durée de marche jusqu'à l'arrêt de transport en commun le plus proche |
| `En_saison_des_pluies_est_ce_qu_il_arrive_que_votre_quartier_soi` | Fréquence d'inondation du quartier en saison des pluies |
| `Les_manquements_a_ameliorer_dans_le_quartier___transports_en_co` | Manquements en transport en commun signalés |
| `Les_tarrifs_appliques_par_ces_TC_en_cas_de_fortes_pluies_ou_ino` | Variation de tarif des TC en cas de pluie/inondation |
| `Nombre_de_pieces_a_usage_d_habitation` | Nombre de pièces du logement |
| `Combien_de_temps_faut_il_pour_y_aller_a_pied__minutes` | Durée d'accès à pied à un point d'eau (utilisé comme `duree_acces_eau`) |
| `Montant_des_depenses_du_menage` | Dépenses mensuelles du ménage |
| `Depuis_combien_d_annees_habitez_vous_dans_ce_logement` | Ancienneté dans le logement |
| `pluie_arret_taxi`, `pluie_arret_clando`, `pluie_arret_minibus` | Disponibilité de transport (taxi/clando/minibus) en cas de pluie |
| `TC_arret_taxi`, `TC_arret_clando`, `TC_arret_minibus` | Disponibilité de transport en commun (taxi/clando/minibus) hors pluie |
| `Statut_d_occupation_du_logement` | Statut d'occupation (propriétaire, locataire…) — visible dans `dim_menage.png` |
| `Type_de_logement` | Type de logement — visible dans `dim_menage.png` |
| `Adduction_d_eau_potable_dans_le_logement_la_concession` | Accès à l'eau potable |
| `Votre_logement_est_il_raccorde_au_reseau_electrique` | Accès à l'électricité |
| `Votre_menage_a_t_il_un_acces_internet_wifi` | Accès Internet/wifi |
| `Materiaux_des_murs_du_logement` | Matériaux des murs |
| `Strate` | Strate géographique (urbain/rural ou zone d'enquête) — visible dans `dim_geoo.png` |

Par ailleurs, pour **chacun des 13 services de proximité enquêtés** (Daara/école coranique, écoles primaires publique/privée, enseignement secondaire public/privé, centres de santé public/privé, hôpital public, hôpital/clinique privé, pharmacie, marché alimentaire, mairie, poste/centre financier), la table `SA.menage` contient un **groupe de 4 colonnes répétées** :
- `<Service>___mode_1` (mode de transport principal utilisé),
- `<Service>___duree_deplacement` (durée du déplacement vers ce service),
- `<Service>___1ere_difficulte` (première difficulté rencontrée),
- `<Service>___frequence` (fréquence de fréquentation du service).

> 📌 **À retenir** : cette structure « large » (une colonne par service × attribut) est typique des exports de formulaires d'enquête (Kobo/ODK, Excel). C'est précisément ce que le pipeline ETL doit transformer en lignes (un enregistrement par couple ménage × service) pour alimenter `Fait_accessibilite` — voir le fichier `05_ETL.md` pour le détail du `CROSS JOIN LATERAL`.

### 2.2 Table `SA.individu`

Visible dans la capture `dim_indiv.png` (requête SQL du composant `tDBInput_1` du job `Dim_individu`) :

```sql
SELECT
    "_Numero_de_l_Individu" AS num_individu,
    "_Numero_du_Menage"     AS num_menage,
    ...
```

Colonnes confirmées par le tMap `tmapdim_indiv.png` (schéma de `row1` en entrée du tMap) :

| Colonne | Rôle |
|---|---|
| `num_individu` | Identifiant de l'individu (alias de `_Numero_de_l_Individu`) |
| `num_menage` | Clé de rattachement au ménage (alias de `_Numero_du_Menage`) |
| `sexe` | Sexe de l'individu |
| `statut_matrimonial` | Statut matrimonial |
| `niveau_instruction` | Niveau d'instruction |
| `profession` | Profession |
| `nationalite` | Nationalité |
| `activite` | Type d'activité |
| `permis` | Détention du permis de conduire |

> Le job `SA_individu` (capture `SA_indiv.png`) charge ces données brutes via `individu → tFilterColumns_1 → tDBOutput_1`.

### 2.3 Table `SA.deplacement`

Job `Job deplacement 0.1` (capture `SA_deplacement.png`) : `deplacement → tFilterColumns_1 → tDBOutput_1`. Les colonnes précises de la table brute ne sont pas visibles dans cette capture (le composant source n'affiche pas son schéma détaillé), mais le tMap du job de fait `fact_deplacement` (capture `tmap_depl.png`) révèle le schéma de sortie attendu — voir section 3.

### 2.4 Table `SA.trafic`

Visible dans `dim_site.png` (requête SQL du `tDBInput_1` du job `Dim_site`) :

```sql
SELECT DISTINCT "SA"."trafic"."Identifiant_site_comptage", "SA"."trafic"."Desc...
```

Colonnes confirmées par le schéma `row1` du tMap (`tmzp_site.png`) :

| Colonne | Rôle |
|---|---|
| `Identifiant_site_comptage` | Identifiant du site de comptage trafic |
| `Description_site_comptage` | Description/libellé du site |
| `Type_comptage` | Type de comptage |
| `Type_outil_comptage` | Outil utilisé pour le comptage |
| `Description_sens_circulation` | Sens de circulation décrit |

Et, d'après le tMap `tmap_comptage.png` (schéma `row1` en entrée du job `fact_comptage`), la table source de comptage trafic comporte également :

| Colonne | Rôle |
|---|---|
| `GPS_Longitude_site` / `GPS_Latitude_site` | Coordonnées GPS du site |
| `Sens_circulation` | Sens de circulation (code) |
| `Jour_comptage` / `date_comptage` | Date du comptage |
| `Heure_debut_comptage` / `Minute_debut_comptage` | Heure/minute de début du comptage |
| `Amplitude_comptage` | Amplitude horaire du comptage |
| `Categorie_vehicule` | Catégorie de véhicule comptée |
| `Vitesse_moyenne_amplitude` | Vitesse moyenne sur l'amplitude |
| `VOLUME_SECT` | Volume de véhicules comptés (mesure) |

---

## 3. Le Data Warehouse (schéma `DW`)

D'après le SQL fourni et les captures Talend des jobs de dimensions/faits, les tables suivantes du schéma `DW` sont confirmées.

### 3.1 Dimensions

#### `DW.Dim_Menage`
- **Clé primaire** : `pk_id_menage` (utilisée dans le `LEFT JOIN` du SQL : `ON m."Numero_du_Menage" = dm."Num_Menage"`).
- **Attributs** (d'après le tMap `tmap_dim_men.png`) :

| Colonne cible | Origine (SA.menage) |
|---|---|
| `Num_Menage` | `Numero_du_Menage` |
| `Statut_d_occupation_du_logement` | `Statut_d_occupation_du_logement` |
| `Type_logement` | `Type_de_logement` |
| `a_eau` | `Adduction_d_eau_potable_dans_le_logement_la_concession` |
| `a_electricite` | `Votre_logement_est_il_raccorde_au_reseau_electrique` |
| `a_internet` | `Votre_menage_a_t_il_un_acces_internet_wifi` |
| `materiaux` | `Materiaux_des_murs_du_logement` |

#### `DW.Dim_Individu`
- **Attributs** (d'après le tMap `tmapdim_indiv.png`, colonnes de sortie `DIM_INDIVIDU`) : `num_individu`, `num_menage`, `sexe`, `statut_matrimonial`, `niveau_instruction`, `profession`, `nationalite`, `activite`, `permis`.
- Pas de clé `pk_` visible explicitement dans cette capture (le mapping est un transfert direct sans transformation de clé), mais `fact_indivmen.png`/`tmap_indivmen.png` utilisent `pk_id_individu` en lookup, ce qui confirme l'existence d'une clé technique générée côté DW (probablement par séquence ou identité auto-générée à l'insertion).

#### `DW.Dim_Geographie`
- **Attributs** (d'après le tMap `tmap_geo.png`, job `Dim_geographie`) : `Strate`, `Quartier_du_domicil`.
- **Clé primaire déduite** : `pk_id_zone_residence` (utilisée dans le SQL : `dg.pk_id_zone_residence`, et dans le tMap `tmap_access.png` : `row4.pk_id_zone_residence`).
- La requête source du composant `tDBInput_2` (capture `dim_geoo.png`) est : `SELECT DISTINCT "Strate", "Quartier_du_domicile" FROM "SA"."menage" WHERE...` — confirmant que la dimension géographique dérive (par `DISTINCT`) de la table `SA.menage`, et non d'un référentiel géographique séparé.

#### `DW.Dim_Transport`
- **Attributs déduits** des jointures du SQL et du tMap `tmap_access.png` (row3) : `pk_id_transport`, `code_transport`.
- Valeur par défaut visible dans le SQL : `COALESCE(dt.pk_id_transport, 1)` → l'identifiant 1 sert de valeur "transport inconnu/par défaut".

#### `DW.Dim_Difficulte`
- **Attributs** : `pk_id_difficulte`, `libelle_court`.
- Jointure complexe visible dans le SQL, avec normalisation des accents :
```sql
LEFT JOIN "DW"."Dim_Difficulte" dd
    ON LOWER(TRANSLATE(COALESCE(svc.difficulte,''), 'éèêëàâùûîïôç', 'eeeeaauuiioc'))
     = LOWER(TRANSLATE(dd.libelle_court, 'éèêëàâùûîïôç', 'eeeeaauuiioc'))
```
- Valeur par défaut : `COALESCE(dd.pk_id_difficulte, 10)` (identifiant 10 = "difficulté inconnue/non précisée").

#### `DW.Dim_Service`
- **Attributs déduits** : `pk_id_service` (clé numérique 1 à 13, une valeur par service de proximité), correspond au `id_svc` généré par le `CROSS JOIN LATERAL` (cf. `05_ETL.md`).

#### `DW.Dim_Site`
- **Attributs** (tMap `tmzp_site.png`, sortie `dim_site`) : `Identifiant_site_comptage`, `Description_site_comptage`, `Outil_Sec` (calculé via expression conditionnelle `"1".equals(...)`), `Sens_circulation`, `type_comptage`.
- **Clé unique déclarée** : la capture `config_dim_site.png` montre la configuration du composant `tUniqRow` avec toutes les colonnes (`Identifiant_site_comptage`, `Description_site_comptage`, `Outil_Sec`, `Sens_circulation`, `type_comptage`) cochées comme « Attribut de clé », ce qui garantit la déduplication de la dimension avant chargement.

#### `DW.Dim_Temps`, `DW.Dim_Motif`, `DW.Dim_Mode`
- Présentes dans le modèle en constellation validé (`modele_constellation_preview.png`), liées respectivement au `Fait_Comptage` et au `Fait_Deplacement`.
- `Dim_Temps` : attributs déduits du tMap `tmap_comptage.png` (`row3`) : `heure`, `annee`, `MOIS`, `jour` — calculés à partir de `Heure_debut_comptage` et `date_comptage` via `Integer.parseInt(...)`.
- `Dim_Motif` : attribut déduit du tMap `tmap_depl.png` (`row2`) : `categorie` (clé de jointure : `motif`).
- `Dim_Mode` : déduit du tMap `tmap_depl.png` (`row5`) : `code_transport` (clé de jointure : `mode`). *Remarque : dans le job de déplacement, le mapping vers le mode de transport réutilise la même dimension que `Dim_Transport` (`pk_id_transport`/`code_transport`), ce qui suggère que `Dim_Mode` et `Dim_Transport` pourraient être la même dimension partagée entre faits (cohérent avec un modèle en constellation).*

> Information non disponible dans les sources fournies : les colonnes exhaustives de `Dim_Temps` (granularité semaine ?), `Dim_Motif` et `Dim_Mode` n'ont pas de capture de tMap dédiée montrant leur job de chargement complet (seules les colonnes utilisées en jointure sont visibles dans les tMap des faits qui les consomment).

### 3.2 Tables de faits

#### `DW.Fait_accessibilite`
Table entièrement documentée par le SQL fourni. Colonnes de la clause `INSERT INTO` :

| Colonne | Type déduit | Origine |
|---|---|---|
| `FK_id_menage` | int (FK → Dim_Menage.pk_id_menage) | `dm.pk_id_menage` |
| `FK_id_transport` | int (FK → Dim_Transport.pk_id_transport) | `COALESCE(dt.pk_id_transport, 1)` |
| `FK_id_zone_residence` | int (FK → Dim_Geographie.pk_id_zone_residence) | `dg.pk_id_zone_residence` |
| `FK_id_temps` | int (FK → Dim_Temps, nullable) | `NULL` (non renseigné dans cet INSERT) |
| `FK_id_difficulte` | int (FK → Dim_Difficulte.pk_id_difficulte) | `COALESCE(dd.pk_id_difficulte, 10)` |
| `FK_id_service` | int (FK → Dim_Service) | `svc.id_svc` |
| `num_menage` | int | Nettoyage regex de `Numero_du_Menage` |
| `duree_marche_arret_tc` | int | Nettoyage regex de la durée à pied vers l'arrêt TC |
| `freq_inondation` | texte | Valeur brute |
| `manque_transport` | texte | Valeur brute |
| `variation_tarif_pluie` | texte | Valeur brute |
| `duree_acces` | int | Durée du service (nettoyée) |
| `transport_disponible_pluie` | texte concaténé | `CONCAT_WS` taxi/clando/minibus pluie |
| `transport_disponible` | texte concaténé | `CONCAT_WS` taxi/clando/minibus hors pluie |
| `nb_pieces` | int | Nettoyage regex |
| `duree_acces_eau` | int | Nettoyage regex |
| `depenses_menage` | numeric | Nettoyage regex |
| `anciennete_logement` | int | Nettoyage regex |

**Granularité** : 1 ligne = 1 couple (ménage, service de proximité), filtré pour ne garder que les services effectivement fréquentés (`WHERE svc.frequence IS NOT NULL AND svc.frequence NOT ILIKE '%pas n%'`).

#### `DW.Fait_deplacement`
D'après le tMap `tmap_depl.png` (colonnes de sortie `fact_deplacement`) :

| Colonne | Origine |
|---|---|
| `fk_id_motif` | `row2.pk_id_motif` (lookup sur `motif`) |
| `fk_id_individu` | `row3.pk_id_individu` (lookup sur clé composite `num_individu + "|" + num_menage`) |
| `fk_id_transport` | `row5.pk_id_transport` (lookup sur `mode`) |
| `num_individu` | direct |
| `duree_trajet` | direct |
| `Nom_depart` / `Nom_arrivee` | direct (`lieu_depart`/`lieu_arrivee`) |
| `cout_total` | direct |
| `heure_depart` / `heure_arrivee` | direct |
| `num_menage` | direct |
| `freq_tc` | direct |

**Granularité** : 1 ligne = 1 déplacement individuel déclaré dans l'enquête EMD.

#### `DW.Fait_comptage` (nommé `fact_compt` dans le tMap)
D'après le tMap `tmap_comptage.png` :

| Colonne | Origine |
|---|---|
| `FK_id_site` | `row2.id_site` (lookup sur `Description_site_comptage`) |
| `FK_id_temps` | `row3.pk_id_temps` (lookup sur `heure` calculée) |
| `GPS_Longitude_site` / `GPS_Latitude_site` | direct |
| `Amplitude` | `Amplitude_comptage` |
| `VOLUME_SECT` | direct (mesure principale du comptage) |

**Granularité** : 1 ligne = 1 relevé de comptage trafic pour un site, une date/heure et une catégorie de véhicule donnés.

#### `DW.Fait_indivMen` (nommé `fact_indivMen`)
D'après le tMap `tmap_indivmen.png` :

| Colonne | Origine |
|---|---|
| `FK_id_individu` | `row2.pk_id_individu` (lookup `Inner Join`, `Correspondance unique`, sur clé composite `num_individu + "|" + num_menage`) |
| `age` | direct |
| `num_menage` | direct |
| `nb_deplacements` | direct |

**Granularité** : 1 ligne = 1 individu (agrégat de profil démographique + nombre de déplacements), rattaché à son ménage.

> 📌 **À retenir** : les 4 tables de faits ont des granularités différentes (ménage×service, déplacement individuel, relevé de comptage, individu). C'est précisément ce qui justifie un modèle en **constellation** plutôt qu'une étoile unique — voir `06_DataWarehouse.md`.

---

## 4. Schéma relationnel ASCII

```
                         SCHEMA "SA" (Staging Area)
   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
   │  SA.menage    │   │  SA.individu  │   │ SA.deplacement│   │  SA.trafic    │
   │───────────────│   │───────────────│   │───────────────│   │───────────────│
   │ Numero_du_    │   │ num_individu  │   │ (cf. dim &    │   │ Identifiant_  │
   │  Menage       │   │ num_menage    │   │  fait associés│   │  site_        │
   │ Quartier_du_  │   │ sexe          │   │  pour détail) │   │  comptage     │
   │  domicile     │   │ statut_       │   │               │   │ GPS_Longitude │
   │ Strate        │   │  matrimonial  │   │               │   │ GPS_Latitude  │
   │ 13×(mode,duree│   │ niveau_       │   │               │   │ Sens_         │
   │  difficulte,  │   │  instruction  │   │               │   │  circulation  │
   │  frequence)   │   │ profession    │   │               │   │ date_comptage │
   │ ... (eau,     │   │ nationalite   │   │               │   │ VOLUME_SECT   │
   │  électricité, │   │ activite      │   │               │   │ ...           │
   │  internet...) │   │ permis        │   │               │   │               │
   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘   └───────┬───────┘
           │                   │                   │                   │
           │  (ETL Talend : extraction, nettoyage, transformation)     │
           ▼                   ▼                   ▼                   ▼
                         SCHEMA "DW" (Data Warehouse)

  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
  │ DW.Dim_Menage   │  │ DW.Dim_Individu│  │ DW.Dim_         │  │ DW.Dim_Site     │
  │ PK pk_id_menage │  │ PK pk_id_      │  │   Geographie    │  │ PK pk_id_site   │
  │ Num_Menage      │  │   individu     │  │ PK pk_id_zone_  │  │ Identifiant_    │
  │ Statut_         │  │ num_individu   │  │   residence     │  │   site_comptage │
  │  occupation     │  │ num_menage     │  │ Strate          │  │ Description_    │
  │ Type_logement   │  │ sexe, age...   │  │ Quartier_du_    │  │   site_comptage │
  │ a_eau/elec/     │  │ profession...  │  │   domicil       │  │ Outil_Sec       │
  │  internet       │  │                │  │                 │  │ Sens_circulation│
  └───────┬─────────┘  └───────┬────────┘  └───────┬─────────┘  └────────┬────────┘
          │                    │                    │                     │
          │     ┌──────────────┴──────────┐         │                     │
          │     │                         │         │                     │
          ▼     ▼                         ▼         ▼                     ▼
  ┌──────────────────────┐      ┌──────────────────────┐      ┌──────────────────────┐
  │ DW.Fait_accessibilite│      │  DW.Fait_indivMen     │      │  DW.Fait_comptage     │
  │ FK_id_menage          │      │ FK_id_individu        │      │ FK_id_site            │
  │ FK_id_transport ──────┼──┐   │ age                   │      │ FK_id_temps ──────┐   │
  │ FK_id_zone_residence  │  │   │ num_menage            │      │ GPS_Longitude     │   │
  │ FK_id_temps           │  │   │ nb_deplacements       │      │ GPS_Latitude      │   │
  │ FK_id_difficulte ─────┼─┐│   └──────────────────────┘      │ Amplitude         │   │
  │ FK_id_service ────────┼┐││                                  │ VOLUME_SECT       │   │
  │ duree_marche_arret_tc ││││                                  └───────────────────┼───┘
  │ freq_inondation       ││││         ┌──────────────────────┐                     │
  │ manque_transport      ││││         │  DW.Fait_deplacement  │                     │
  │ depenses_menage...    ││││         │ FK_id_motif ──────────┼──► DW.Dim_Motif     │
  └────────────────────────┘│││        │ FK_id_individu        │                     │
                             │││        │ FK_id_transport ──────┼──► DW.Dim_Transport│
       DW.Dim_Service ◄──────┘││        │ duree_trajet          │     (= Dim_Mode ?) │
       DW.Dim_Difficulte ◄────┘│        │ Nom_depart/arrivee    │                     │
       DW.Dim_Transport ◄──────┘        │ cout_total, freq_tc   │                     │
                                          └──────────────────────┘                     │
                                                                                        │
                                          DW.Dim_Temps ◄───────────────────────────────┘
```

---

## 5. Choix de modélisation observés

| Choix observé | Preuve dans les sources | Justification pédagogique |
|---|---|---|
| Séparation `SA` / `DW` | Schémas distincts visibles dans tous les `tDBInput`/`tDBOutput` | Isoler les données brutes (souvent incomplètes, en texte libre) du modèle analytique propre. Permet de relancer le chargement du DW sans toucher aux sources. |
| Nettoyage par expressions régulières (`REGEXP_REPLACE`) | SQL `insert_fait_accessibilite.sql`, lignes 21-32 | Les champs sources contiennent des unités textuelles ("12 minutes", "3 ans") qu'il faut convertir en numérique exploitable pour l'analyse. |
| Valeurs par défaut via `COALESCE` | `COALESCE(dt.pk_id_transport, 1)`, `COALESCE(dd.pk_id_difficulte, 10)` | Évite les valeurs NULL en clé étrangère (respect de l'intégrité référentielle) en pointant vers un enregistrement "Inconnu/Non précisé" dans la dimension. |
| Normalisation des accents pour les jointures textuelles | `TRANSLATE(..., 'éèêëàâùûîïôç', 'eeeeaauuiioc')` | Les libellés de difficulté saisis dans l'enquête varient en orthographe (accents). Cette normalisation fiabilise le rapprochement entre la donnée source et le référentiel `Dim_Difficulte`. |
| Dédoublonnement par `tUniqRow` sur la dimension site | `config_dim_site.png` (Attribut de clé sur 5 colonnes) | Une dimension ne doit contenir que des valeurs uniques ; le comptage trafic source contient potentiellement plusieurs lignes par site. |
| Transformation "large → long" (dépivotage) | `CROSS JOIN LATERAL (VALUES ...)` ou `UNION ALL` répété 13 fois | La table source `SA.menage` stocke les services en colonnes (format large) ; le fait `Fait_accessibilite` a besoin d'une ligne par service (format long), conforme à la granularité voulue. |
| Clé composite pour les individus | `row1.num_individu + "|" + row1.num_menage` (tMap `tmap_depl.png`, `tmap_indivmen.png`) | Un numéro d'individu seul n'est pas unique au niveau global (il est unique seulement au sein d'un ménage) ; la composition avec `num_menage` garantit l'unicité avant le lookup vers `Dim_Individu`. |

---

## 6. Tableau récapitulatif des tables

| Table | Schéma | Rôle | Clé primaire | Clés étrangères | Granularité / remarque |
|---|---|---|---|---|---|
| `menage` | SA | Données brutes ménage + 13 services de proximité | Numero_du_Menage (texte) | — | 1 ligne = 1 ménage enquêté |
| `individu` | SA | Données brutes individu | num_individu (avec num_menage) | num_menage → menage | 1 ligne = 1 individu |
| `deplacement` | SA | Déplacements bruts | non visible explicitement | num_individu, num_menage (déduit) | 1 ligne = 1 déplacement |
| `trafic` | SA | Comptages trafic bruts | non visible explicitement | — | 1 ligne = 1 relevé de comptage |
| `Dim_Menage` | DW | Dimension ménage | pk_id_menage | — | 1 ligne = 1 ménage |
| `Dim_Individu` | DW | Dimension individu | pk_id_individu (déduit) | num_menage | 1 ligne = 1 individu |
| `Dim_Geographie` | DW | Dimension zone de résidence | pk_id_zone_residence | — | 1 ligne = 1 (Strate, Quartier) distinct |
| `Dim_Transport` | DW | Dimension mode de transport | pk_id_transport | — | 1 ligne = 1 mode/code transport |
| `Dim_Difficulte` | DW | Dimension difficulté rencontrée | pk_id_difficulte | — | 1 ligne = 1 libellé de difficulté |
| `Dim_Service` | DW | Dimension service de proximité (13 valeurs) | pk_id_service (déduit) | — | 1 ligne = 1 service (école, santé...) |
| `Dim_Site` | DW | Dimension site de comptage trafic | pk_id_site (déduit) | — | 1 ligne = 1 site de comptage unique |
| `Dim_Temps` | DW | Dimension temporelle | pk_id_temps (déduit) | — | granularité = heure (cf. tMap comptage) |
| `Dim_Motif` | DW | Dimension motif de déplacement | pk_id_motif (déduit) | — | 1 ligne = 1 motif/catégorie |
| `Dim_Mode` | DW | Dimension mode de déplacement (fait Déplacement) | pk_id_transport (partagée ?) | — | Information non disponible dans les sources fournies pour confirmer si distincte de Dim_Transport |
| `Fait_accessibilite` | DW | Mesures d'accessibilité aux services par ménage | — (table de faits) | FK_id_menage, FK_id_transport, FK_id_zone_residence, FK_id_temps, FK_id_difficulte, FK_id_service | 1 ligne = 1 (ménage, service fréquenté) |
| `Fait_deplacement` | DW | Mesures des déplacements individuels | — | fk_id_motif, fk_id_individu, fk_id_transport | 1 ligne = 1 déplacement |
| `Fait_comptage` | DW | Mesures de comptage trafic | — | FK_id_site, FK_id_temps | 1 ligne = 1 relevé de comptage |
| `Fait_indivMen` | DW | Mesures démographiques/mobilité par individu | — | FK_id_individu | 1 ligne = 1 individu |

---

## 7. À retenir et questions de soutenance

> 📌 **À retenir (synthèse)**
> - La base CETUD repose sur PostgreSQL et deux schémas : `SA` (staging, données brutes) et `DW` (entrepôt, faits/dimensions).
> - La table `SA.menage` est en format "large" (colonnes répétées par service) ; elle est dépivotée vers `Fait_accessibilite` en format "long".
> - Les jointures vers les dimensions utilisent systématiquement des `LEFT JOIN` avec `COALESCE` pour ne jamais produire de clé étrangère NULL.
> - Les libellés textuels (difficulté) sont normalisés (accents) avant comparaison pour fiabiliser les jointures.
> - Une clé composite (`num_individu + num_menage`) est nécessaire car l'identifiant individuel seul n'est pas globalement unique.
> - Une dimension comme `Dim_Site` est dédoublonnée explicitement via `tUniqRow` avant chargement.

> 🎓 **Questions possibles en soutenance**
> 1. Pourquoi avoir séparé les données en deux schémas `SA` et `DW` plutôt qu'un seul schéma unique ?
> 2. Pourquoi utilisez-vous `COALESCE(dt.pk_id_transport, 1)` plutôt que de laisser la valeur NULL en cas de transport inconnu ?
> 3. Expliquez la nécessité du `CROSS JOIN LATERAL (VALUES ...)` dans la requête d'insertion de `Fait_accessibilite`. Que se passerait-il si on ne faisait pas ce dépivotage ?
> 4. Pourquoi la clé de jointure vers `Dim_Individu` combine-t-elle `num_individu` ET `num_menage` ?
> 5. Pourquoi la fonction `TRANSLATE` est-elle utilisée sur les libellés de difficulté avant la comparaison `LOWER(...) = LOWER(...)` ?
> 6. Quelle est la granularité exacte de la table `Fait_accessibilite` ? Pourquoi le filtre `WHERE svc.frequence IS NOT NULL AND svc.frequence NOT ILIKE '%pas n%'` est-il appliqué ?
> 7. Quels types de données PostgreSQL avez-vous utilisés pour les colonnes nettoyées (`::int`, `::numeric`) et pourquoi ce choix après un `REGEXP_REPLACE` ?
> 8. Si l'on devait ajouter une nouvelle dimension (par exemple `Dim_Periode_Enquete`), quelles tables faudrait-il modifier et selon quelle démarche ?
