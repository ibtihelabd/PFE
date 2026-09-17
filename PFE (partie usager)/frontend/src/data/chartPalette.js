/** Palette catégorielle partagée par tous les graphiques natifs du cockpit. */
export const PALETTE = [
  '#ff6b35', '#74c0fc', '#69db7c', '#ffd43b', '#da77f2',
  '#ff6b6b', '#22d3ee', '#f783ac', '#a9e34b', '#748ffc',
  '#ffa94d', '#63e6be', '#e599f7', '#4dabf7', '#ffe066',
  '#ff8787', '#66d9e8', '#b2f2bb', '#d0bfff', '#ffc078',
  '#fcc2d7', '#c0eb75', '#99e9f2', '#e9ecef',
];

export const colorAt = (i) => PALETTE[i % PALETTE.length];
