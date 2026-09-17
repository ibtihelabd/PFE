/**
 * trajetsData.js — Données du sheet "Déplacements" (Trajets), extraites en
 * direct des widgets du cockpit Knowage (DS_TempsParcours_Motif,
 * DS_TempsParcours_Mode, DS_CoutMoyen, DS_HeuresPointe) le 17/09/2026.
 */

// Répartition des déplacements par motif (top 10, tel qu'affiché dans Knowage — limitRows=10)
export const MOTIF_TOP10 = [
  { motif: 'Accompagnement', nb: 1522 },
  { motif: 'Achats alimentaires', nb: 14908 },
  { motif: 'Achats non alimentaires', nb: 3569 },
  { motif: 'Activites sportives/loisirs', nb: 3992 },
  { motif: "Approvisionnement en eau", nb: 653 },
  { motif: 'Association', nb: 669 },
  { motif: 'Autre', nb: 917 },
  { motif: 'Autre motif lie au menage', nb: 1686 },
  { motif: 'Autre motif lie au travail', nb: 4809 },
  { motif: 'Autre motif lie aux etudes', nb: 1726 },
];

// Durée moyenne de déplacement par motif (min), mêmes 10 motifs
export const DUREE_PAR_MOTIF = [
  { motif: 'Accompagnement', duree: 15 },
  { motif: 'Achats alimentaires', duree: 8 },
  { motif: 'Achats non alimentaires', duree: 13 },
  { motif: 'Activites sportives/loisirs', duree: 12 },
  { motif: 'Approvisionnement en eau', duree: 8 },
  { motif: 'Association', duree: 20 },
  { motif: 'Autre', duree: 23 },
  { motif: 'Autre motif lie au menage', duree: 16 },
  { motif: 'Autre motif lie au travail', duree: 23 },
  { motif: 'Autre motif lie aux etudes', duree: 17 },
];

// Coût moyen par mode de transport (FCFA), top 10
export const COUT_PAR_MODE = [
  { mode: 'A pied', cout: 38 },
  { mode: 'Autre', cout: 887 },
  { mode: 'Bicyclette', cout: 19 },
  { mode: 'Bus scolaire/Ramassage employeur', cout: 65 },
  { mode: 'Caleche/Charrette', cout: 110 },
  { mode: 'Car de transport interurbain', cout: 1967 },
  { mode: 'Car rapide', cout: 109 },
  { mode: 'DDD', cout: 163 },
  { mode: 'Minibus (14 places)', cout: 374 },
  { mode: 'Mobylette/Moto conducteur', cout: 51 },
];

// Pics d'affluence aux heures de pointe
export const PICS_AFFLUENCE = [
  { periode: 'Heures creuses', nb: 75599 },
  { periode: 'Pointe matin', nb: 36815 },
  { periode: 'Pointe soir', nb: 44350 },
];

// Répartition modale complète (19 modes), DS_TempsParcours_Mode — sert aussi
// de source à MODES_TRANSPORT (accueilData.js) pour les 5 catégories agrégées.
export const MODAL_SPLIT_COMPLET = [
  { mode: 'A pied', nb: 129796 }, { mode: 'Autre', nb: 311 }, { mode: 'Bicyclette', nb: 188 },
  { mode: 'Bus scolaire/Ramassage employeur', nb: 449 }, { mode: 'Caleche/Charrette', nb: 449 },
  { mode: 'Car de transport interurbain', nb: 30 }, { mode: 'Car rapide', nb: 3423 },
  { mode: 'DDD', nb: 881 }, { mode: 'Minibus (14 places)', nb: 168 },
  { mode: 'Mobylette/Moto conducteur', nb: 1274 }, { mode: 'Mobylette/Moto passager', nb: 96 },
  { mode: 'Ndiaga Ndiaye', nb: 1043 }, { mode: 'Pirogue/Bateau', nb: 35 }, { mode: 'PTB', nb: 52 },
  { mode: 'Tata', nb: 6608 }, { mode: 'Taxi', nb: 2766 }, { mode: 'Taxi clando', nb: 3433 },
  { mode: 'Voiture particuliere conducteur', nb: 4115 }, { mode: 'Voiture particuliere passager', nb: 1647 },
];
