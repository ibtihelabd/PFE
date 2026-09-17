/**
 * evolutionData.js
 * ─────────────────────────────────────────────────────────────
 * Données historiques simulées pour l'analyse de l'évolution
 * du réseau de transport de Dakar (2010 – 2023).
 *
 * Deux ancres de données réelles, selon le domaine :
 *  - ANCRE 2015 = données réelles EMD CETUD (Enquête Ménage Déplacement) —
 *    s'applique aux ménages, individus, déplacements, partage modal,
 *    inaccessibilité et segmentation/ML (tous dérivés de l'EMD).
 *  - ANCRE 2019 = données réelles de comptage trafic CETUD —
 *    s'applique uniquement au domaine Trafic.
 * Les autres années sont des données reconstituées / projetées
 * à des fins d'analyse comparative et prospective (PFE).
 * ─────────────────────────────────────────────────────────────
 */

export const ANNEES = [2010, 2015, 2019, 2023];

/** Source label affiché dans l'UI — pour les données issues de l'EMD (ménages/individus/déplacements) */
export const SOURCE_LABEL_EMD = {
  2010: 'Données simulées',
  2015: 'Données réelles — EMD CETUD',
  2019: 'Données simulées',
  2023: 'Données projetées',
};

/** Source label affiché dans l'UI — pour les données issues des comptages trafic */
export const SOURCE_LABEL_TRAFIC = {
  2010: 'Données simulées',
  2015: 'Données simulées',
  2019: 'Données réelles — Comptage trafic CETUD',
  2023: 'Données projetées',
};

// ═══════════════════════════════════════════════════════════════
// 1. TRAFIC & ANOMALIES
// ═══════════════════════════════════════════════════════════════
export const TRAFIC = [
  {
    annee: 2010,
    sites_comptage: 32,
    volume_journalier_moy: 8_420,   // véh/jour/site
    total_observations: 270_000,
    anomalies_detectees: 172,
    sites_at_risk: 18,
    taux_anomalie: 13.8,            // %
    accord_modeles: 85.2,           // % accord IF↔LOF↔Z
  },
  {
    annee: 2015,
    sites_comptage: 42,
    volume_journalier_moy: 11_650,
    total_observations: 489_000,
    anomalies_detectees: 241,
    sites_at_risk: 24,
    taux_anomalie: 15.1,
    accord_modeles: 87.9,
  },
  {
    annee: 2019,                    // ← DONNÉES RÉELLES
    sites_comptage: 49,
    volume_journalier_moy: 15_820,
    total_observations: 775_480,
    anomalies_detectees: 316,
    sites_at_risk: 30,
    taux_anomalie: 16.2,
    accord_modeles: 90.6,
  },
  {
    annee: 2023,
    sites_comptage: 49,
    volume_journalier_moy: 19_340,
    total_observations: 947_000,
    anomalies_detectees: 389,
    sites_at_risk: 34,
    taux_anomalie: 17.8,
    accord_modeles: 91.4,
  },
];

// ═══════════════════════════════════════════════════════════════
// 2. MÉNAGES  (enquête socio-démographique)
// ═══════════════════════════════════════════════════════════════
export const MENAGES = [
  {
    annee: 2010,
    nb_menages: 3_120,
    taille_moyenne: 8.2,            // personnes/ménage
    revenu_median: 78_500,          // FCFA/mois
    pct_motorises: 14.3,            // % ménages avec véhicule
    pct_locataires: 62.4,
    pct_proprietaires: 37.6,
    duree_residence_moy: 11.2,      // ans
    pct_enclavement: 38.5,          // % déclarant enclavement
    pct_inondation: 28.1,           // % quartier inondable
  },
  {
    annee: 2015,                    // ← DONNÉES RÉELLES (EMD CETUD)
    nb_menages: 3_840,
    taille_moyenne: 7.5,
    revenu_median: 92_000,
    pct_motorises: 17.8,
    pct_locataires: 58.1,
    pct_proprietaires: 41.9,
    duree_residence_moy: 10.6,
    pct_enclavement: 33.2,
    pct_inondation: 25.6,
  },
  {
    annee: 2019,
    nb_menages: 4_521,
    taille_moyenne: 6.8,
    revenu_median: 112_000,
    pct_motorises: 22.4,
    pct_locataires: 54.7,
    pct_proprietaires: 45.3,
    duree_residence_moy: 9.8,
    pct_enclavement: 27.4,
    pct_inondation: 22.3,
  },
  {
    annee: 2023,
    nb_menages: 5_210,
    taille_moyenne: 6.1,
    revenu_median: 131_000,
    pct_motorises: 27.6,
    pct_locataires: 51.2,
    pct_proprietaires: 48.8,
    duree_residence_moy: 8.9,
    pct_enclavement: 22.8,
    pct_inondation: 19.7,
  },
];

// ═══════════════════════════════════════════════════════════════
// 3. DÉPLACEMENTS — indicateurs moyens par individu
// ═══════════════════════════════════════════════════════════════
export const DEPLACEMENTS = [
  {
    annee: 2010,
    nb_deplacements_moy: 2.1,       // déplacements/personne/jour
    duree_moy_min: 22.4,            // minutes
    cout_moy_fcfa: 168,
    distance_moy_km: 6.2,
    pct_chaine_tc: 61.3,            // % déplacements avec TC
    pct_intermodal: 14.2,           // % impliquant 2+ modes
  },
  {
    annee: 2015,                    // ← DONNÉES RÉELLES (EMD CETUD)
    nb_deplacements_moy: 2.3,
    duree_moy_min: 27.1,
    cout_moy_fcfa: 211,
    distance_moy_km: 7.8,
    pct_chaine_tc: 63.8,
    pct_intermodal: 16.5,
  },
  {
    annee: 2019,
    nb_deplacements_moy: 2.6,
    duree_moy_min: 31.4,
    cout_moy_fcfa: 268,
    distance_moy_km: 9.4,
    pct_chaine_tc: 66.5,
    pct_intermodal: 19.1,
  },
  {
    annee: 2023,
    nb_deplacements_moy: 2.8,
    duree_moy_min: 35.8,
    cout_moy_fcfa: 312,
    distance_moy_km: 10.9,
    pct_chaine_tc: 68.2,
    pct_intermodal: 22.4,
  },
];

// ═══════════════════════════════════════════════════════════════
// 4. RÉPARTITION MODALE  (%)
// ═══════════════════════════════════════════════════════════════
export const MODES_ANNEES = [
  {
    annee: 2010,
    'Transport Commun': 38,
    'Marche': 30,
    'Taxi/Clando': 14,
    'Voiture': 9,
    'Moto': 6,
    'Vélo/Autre': 3,
  },
  {
    annee: 2015,                    // ← DONNÉES RÉELLES (EMD CETUD)
    'Transport Commun': 40,
    'Marche': 27,
    'Taxi/Clando': 15,
    'Voiture': 10,
    'Moto': 6,
    'Vélo/Autre': 2,
  },
  {
    annee: 2019,
    'Transport Commun': 42,
    'Marche': 24,
    'Taxi/Clando': 16,
    'Voiture': 11,
    'Moto': 5,
    'Vélo/Autre': 2,
  },
  {
    annee: 2023,
    'Transport Commun': 44,
    'Marche': 21,
    'Taxi/Clando': 14,
    'Voiture': 14,
    'Moto': 5,
    'Vélo/Autre': 2,
  },
];

// ═══════════════════════════════════════════════════════════════
// 5. ZONES D'INACCESSIBILITÉ
// ═══════════════════════════════════════════════════════════════
export const INACCESSIBILITE = [
  {
    annee: 2010,
    total_zones: 41,
    zones_elevees: 9,
    zones_moderees: 18,
    zones_faibles: 14,
    pct_menages_risque: 52.4,       // % ménages en zone à risque
    score_tc_distance_moy: 14.8,    // min à pied moyen jusqu'au TC
    pct_enclavement_declare: 38.5,
    zones_inondables: 12,
  },
  {
    annee: 2015,                    // ← DONNÉES RÉELLES (EMD CETUD)
    total_zones: 41,
    zones_elevees: 7,
    zones_moderees: 16,
    zones_faibles: 18,
    pct_menages_risque: 44.1,
    score_tc_distance_moy: 12.3,
    pct_enclavement_declare: 33.2,
    zones_inondables: 10,
  },
  {
    annee: 2019,
    total_zones: 41,
    zones_elevees: 5,
    zones_moderees: 14,
    zones_faibles: 22,
    pct_menages_risque: 36.6,
    score_tc_distance_moy: 10.2,
    pct_enclavement_declare: 27.4,
    zones_inondables: 8,
  },
  {
    annee: 2023,
    total_zones: 41,
    zones_elevees: 4,
    zones_moderees: 12,
    zones_faibles: 25,
    pct_menages_risque: 31.2,
    score_tc_distance_moy: 8.9,
    pct_enclavement_declare: 22.8,
    zones_inondables: 7,
  },
];

// ═══════════════════════════════════════════════════════════════
// 6. SEGMENTATION & MODÈLES ML
// ═══════════════════════════════════════════════════════════════
export const SEGMENTATION_ML = [
  {
    annee: 2010,
    k_clusters: 4,
    rf_accuracy: 81.2,              // %
    rf_f1_score: 79.4,
    roc_auc: 0.843,
    // Répartition des clusters (%)
    cluster_tc_reguliers: 38,
    cluster_motorises: 12,
    cluster_etudiants: 22,
    cluster_pietons: 28,
    cluster_informels: 0,
  },
  {
    annee: 2015,                    // ← DONNÉES RÉELLES (EMD CETUD)
    k_clusters: 5,
    rf_accuracy: 85.6,
    rf_f1_score: 83.1,
    roc_auc: 0.879,
    cluster_tc_reguliers: 36,
    cluster_motorises: 15,
    cluster_etudiants: 24,
    cluster_pietons: 18,
    cluster_informels: 7,
  },
  {
    annee: 2019,
    k_clusters: 5,
    rf_accuracy: 90.6,
    rf_f1_score: 88.3,
    roc_auc: 0.921,
    cluster_tc_reguliers: 35,
    cluster_motorises: 18,
    cluster_etudiants: 22,
    cluster_pietons: 16,
    cluster_informels: 9,
  },
  {
    annee: 2023,
    k_clusters: 6,
    rf_accuracy: 92.1,
    rf_f1_score: 90.7,
    roc_auc: 0.938,
    cluster_tc_reguliers: 34,
    cluster_motorises: 22,
    cluster_etudiants: 20,
    cluster_pietons: 13,
    cluster_informels: 11,
  },
];

// ═══════════════════════════════════════════════════════════════
// 7. RECOMMANDATIONS & INTERPRÉTATIONS GÉNÉRÉES
//    (logique basée sur les tendances détectées)
// ═══════════════════════════════════════════════════════════════
export const RECOMMANDATIONS = [
  {
    id: 'trafic_hausse',
    categorie: 'Trafic',
    icone: '📈',
    couleur: '#ff6b6b',
    badge: 'TENDANCE CRITIQUE',
    titre: 'Croissance soutenue des anomalies de trafic',
    constat: '+126% d\'anomalies entre 2010 et 2023 (172 → 389). Le taux d\'anomalie progresse de 13.8% à 17.8%, signalant une dégradation structurelle de la fluidité du réseau.',
    recommandation: 'Déploiement prioritaire de capteurs intelligents (ITS) sur les 34 sites à risque identifiés. Révision des cycles de signalisation sur les axes RN1/VDN. Coordination renforcée entre CETUD et DAKAR DEM DIKK.',
    priorite: 'Haute',
    horizon: 'Court terme (0–2 ans)',
  },
  {
    id: 'modalite_tc',
    categorie: 'Modal Split',
    icone: '🚌',
    couleur: '#69db7c',
    badge: 'ÉVOLUTION POSITIVE',
    titre: 'Progression continue des transports en commun',
    constat: 'La part modale TC passe de 38% (2010) à 44% (2023), confirmant la tendance à la dépendance TC de la population dakaroise. La marche régresse (30%→21%), signe d\'étalement urbain.',
    recommandation: 'Renforcer la flotte TC sur les corridors périphériques (Keur Massar, Pikine Est). Développer des pôles d\'échange intermodaux pour réduire les temps de correspondance. Envisager un BRT sur l\'axe Guédiawaye–Plateau.',
    priorite: 'Haute',
    horizon: 'Moyen terme (2–5 ans)',
  },
  {
    id: 'inaccessibilite_amelioration',
    categorie: 'Inaccessibilité',
    icone: '✅',
    couleur: '#74c0fc',
    badge: 'AMÉLIORATION CONFIRMÉE',
    titre: 'Réduction progressive des zones à risque élevé',
    constat: 'Les zones ÉLEVÉ passent de 9 (2010) à 4 (2023), et 52.4%→31.2% des ménages sont en zone à risque. La distance TC moyenne diminue de 14.8 à 8.9 min. Les investissements en infrastructure portent leurs fruits.',
    recommandation: 'Maintenir les efforts sur les 4 zones encore ÉLEVÉ (principalement périphérie Est). Cibler spécifiquement les zones inondables (encore 7 en 2023) avec des voiries alternatives. Flécher les budgets PUDC sur ces zones.',
    priorite: 'Moyenne',
    horizon: 'Court terme (0–2 ans)',
  },
  {
    id: 'motorisation',
    categorie: 'Ménages',
    icone: '🚗',
    couleur: '#ffa94d',
    badge: 'RISQUE ÉMERGENT',
    titre: 'Motorisation en forte hausse — pression sur le réseau',
    constat: 'Le taux de motorisation des ménages double entre 2010 et 2023 (14.3%→27.6%). Corrélation directe avec l\'augmentation des anomalies trafic et la montée de la part voiture (9%→14% du modal split).',
    recommandation: 'Mettre en place une tarification dynamique du stationnement dans le Plateau et les zones denses. Développer des incitatifs fiscaux pour le covoiturage. Réviser la politique de délivrance du permis de conduire pour y intégrer la sensibilisation TC.',
    priorite: 'Moyenne',
    horizon: 'Moyen terme (2–5 ans)',
  },
  {
    id: 'duree_deplacement',
    categorie: 'Déplacements',
    icone: '⏱️',
    couleur: '#da77f2',
    badge: 'DÉGRADATION CONTINUE',
    titre: 'Allongement significatif des temps de parcours',
    constat: 'La durée moyenne d\'un déplacement augmente de 22.4 min (2010) à 35.8 min (2023), soit +60% en 13 ans. Le coût moyen progresse de 168 à 312 FCFA (+86%), pesant sur les ménages les plus modestes.',
    recommandation: 'Développer des couloirs TC dédiés sur les axes les plus congestionnés. Introduire un tarif social plafonné à 200 FCFA pour les trajets intra-urbains de moins de 10 km. Digitaliser les systèmes de paiement pour réduire les pertes de temps aux arrêts.',
    priorite: 'Haute',
    horizon: 'Court terme (0–2 ans)',
  },
  {
    id: 'ml_performance',
    categorie: 'Modèles ML',
    icone: '🧠',
    couleur: '#69db7c',
    badge: 'PERFORMANCE CROISSANTE',
    titre: 'Amélioration des performances prédictives des modèles',
    constat: 'La précision du Random Forest passe de 81.2% (2010) à 92.1% (2023), et le ROC AUC de 0.843 à 0.938. L\'enrichissement des données et l\'affinage des features expliquent cette progression.',
    recommandation: 'Intégrer des features temporelles (heure de pointe, saison) pour améliorer encore la détection d\'anomalies. Déployer le modèle d\'inaccessibilité dans un système d\'alertes automatiques pour les gestionnaires. Envisager un réentraînement annuel sur les nouvelles enquêtes.',
    priorite: 'Faible',
    horizon: 'Long terme (5+ ans)',
  },
];
