/**
 * traficData.js — Données du sheet "Trafic", extraites en direct des widgets
 * du cockpit Knowage (DS_Trafic_Horaire, DS_Volume_Horaire, DS_Trafic_ParSite,
 * DS_FluxZones, DS_Trafic_ParSens) le 17/09/2026, après les corrections
 * appliquées cette session (troncature des libellés longs, mapping
 * catégorie/zone). Sert de socle au rendu natif React de ce sheet.
 */
import { SITES_COMPTAGE } from './accueilData';

export { SITES_COMPTAGE };

// Évolution horaire du trafic (volume total véhicules, comptages routiers 7h-19h)
export const EVOLUTION_HORAIRE = [
  { heure: '7', volume: 131474 }, { heure: '8', volume: 268117 }, { heure: '9', volume: 271690 },
  { heure: '10', volume: 265393 }, { heure: '11', volume: 247595 }, { heure: '12', volume: 254683 },
  { heure: '13', volume: 243589 }, { heure: '14', volume: 229819 }, { heure: '15', volume: 243624 },
  { heure: '16', volume: 257470 }, { heure: '17', volume: 268629 }, { heure: '18', volume: 261067 },
  { heure: '19', volume: 121299 },
];

// Évolution des déplacements EMD au fil de la journée (nb de déplacements, 0h-23h)
export const EVOLUTION_DEPLACEMENTS = [
  { heure: '0', nb: 498 }, { heure: '1', nb: 199 }, { heure: '2', nb: 72 }, { heure: '3', nb: 111 },
  { heure: '4', nb: 150 }, { heure: '5', nb: 1080 }, { heure: '6', nb: 3002 }, { heure: '7', nb: 14564 },
  { heure: '8', nb: 8622 }, { heure: '9', nb: 10627 }, { heure: '10', nb: 12410 }, { heure: '11', nb: 7807 },
  { heure: '12', nb: 9196 }, { heure: '13', nb: 8886 }, { heure: '14', nb: 9170 }, { heure: '15', nb: 6222 },
  { heure: '16', nb: 7334 }, { heure: '17', nb: 13226 }, { heure: '18', nb: 12063 }, { heure: '19', nb: 11727 },
  { heure: '20', nb: 8558 }, { heure: '21', nb: 5878 }, { heure: '22', nb: 3418 }, { heure: '23', nb: 1944 },
];

// Flux de déplacement inter-zones (DS_FluxZones, 15 zones, LEFT(zone,25))
export const FLUX_ZONES = [
  { zone: 'Aïnoumady et Cites reside', flux_total: 17714 },
  { zone: 'Medina Gounass Centre', flux_total: 7364 },
  { zone: 'Champ de courses Arafat G', flux_total: 6549 },
  { zone: 'Diamaguene SICAP Mbao Cen', flux_total: 5938 },
  { zone: 'Colobane', flux_total: 5724 },
  { zone: 'Liberte V - VI & Sacre cœ', flux_total: 4433 },
  { zone: 'Notaire', flux_total: 4100 },
  { zone: 'Dangou Santiaba', flux_total: 4024 },
  { zone: 'Plateau Centre', flux_total: 3818 },
  { zone: 'Extensions Nord', flux_total: 3740 },
  { zone: 'Yeumbeul Nord (Centre-Sud', flux_total: 3688 },
  { zone: 'Diamaguene SICAP Mbao Nor', flux_total: 3686 },
  { zone: 'Plateau Quartier administ', flux_total: 3684 },
  { zone: 'Thiaroye sur Mer Extensio', flux_total: 3566 },
  { zone: 'Extensions Nord-ouest', flux_total: 3544 },
];

// Répartition du trafic par sens de circulation
export const SENS_CIRCULATION = [
  { label: 'Vers banlieue', value: 1740591 },
  { label: 'Vers ville', value: 1323858 },
];
