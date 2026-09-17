/**
 * demographieData.js — Données du sheet "Démographie", extraites en direct
 * des widgets du cockpit Knowage (EMD CETUD 2015) le 17/09/2026.
 */

export const PROFIL_SEXE = [
  { label: 'Femme', nb: 14518 },
  { label: 'Homme', nb: 12312 },
];

export const STATUT_MATRIMONIAL = [
  { label: 'Celibataire', nb: 12684 },
  { label: 'Divorce Separe', nb: 678 },
  { label: 'Marie Monogame', nb: 9710 },
  { label: 'Marie Polygame', nb: 2626 },
  { label: 'Veuf', nb: 1132 },
];

export const ORIGINE_NATIONALITE = [
  { label: 'Senegalaise', nb: 25874 },
  { label: 'Autre', nb: 646 },
  { label: 'Pas de réponse', nb: 310 },
];

export const NIVEAU_INSTRUCTION = [
  { label: 'Elementaire Primaire', nb: 6124 },
  { label: 'Moyen College', nb: 5560 },
  { label: 'Pas de réponse', nb: 7178 },
  { label: 'Sans Etude', nb: 512 },
  { label: 'Secondaire', nb: 3690 },
  { label: 'Superieur', nb: 3766 },
];

export const PROFIL_ECONOMIQUE = [
  { label: 'AutreInactif', nb: 1468 },
  { label: 'Chomeur Ayant Travaille', nb: 528 },
  { label: 'EleveEtudiant', nb: 7200 },
  { label: 'Menagere', nb: 4364 },
  { label: 'Pas de réponse', nb: 12190 },
  { label: 'RecherchePremierEmploi', nb: 246 },
  { label: 'Retraite', nb: 834 },
];

// Motifs de déplacement les plus fréquents — liste complète (24 motifs, sans limite)
export const MOTIFS_FREQUENTS = [
  { motif: 'Accompagnement', nb: 1522 }, { motif: 'Achats alimentaires', nb: 14908 },
  { motif: 'Achats non alimentaires', nb: 3569 }, { motif: 'Activites sportives/loisirs', nb: 3992 },
  { motif: 'Approvisionnement en eau', nb: 653 }, { motif: 'Association', nb: 669 },
  { motif: 'Autre', nb: 917 }, { motif: 'Autre motif lie au menage', nb: 1686 },
  { motif: 'Autre motif lie au travail', nb: 4809 }, { motif: 'Autre motif lie aux etudes', nb: 1726 },
  { motif: 'Ceremonies', nb: 1652 }, { motif: 'Demarches administratives', nb: 696 },
  { motif: 'Etudes', nb: 13636 }, { motif: 'Priere/Religion', nb: 3349 },
  { motif: 'Recherche de travail', nb: 384 }, { motif: "Repas a l'exterieur", nb: 2675 },
  { motif: 'Retour au domicile', nb: 67848 }, { motif: 'Sante', nb: 769 },
  { motif: 'Services', nb: 1340 }, { motif: 'Travail ambulant', nb: 512 },
  { motif: 'Travail habituel', nb: 18372 }, { motif: 'Visite a des amis', nb: 6656 },
  { motif: 'Visite a des voisins', nb: 985 }, { motif: 'Visite a la famille', nb: 3439 },
];

// "Mobilité selon X" (sexe / activité / instruction) reproduit fidèlement Knowage,
// où ces 3 widgets affichent en réalité la même répartition démographique brute
// (pas de croisement réel avec les déplacements dans les datasets sources).
export const MOBILITE_SEXE = PROFIL_SEXE;
export const MOBILITE_ACTIVITE = PROFIL_ECONOMIQUE;
export const MOBILITE_INSTRUCTION = NIVEAU_INSTRUCTION;
