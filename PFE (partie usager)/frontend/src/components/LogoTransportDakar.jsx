/**
 * Logo TransportDakar — recréé en SVG (pas une image bitmap) pour pouvoir
 * adapter dynamiquement ses couleurs au thème :
 *  - Fond clair  -> trait/texte marine foncé (#1a1f2b), comme l'original.
 *  - Mode sombre -> couleurs inversées (icône/texte clairs) pour rester lisible.
 * L'orange (#ff6b35) reste identique dans les deux thèmes (couleur de marque).
 */
export default function LogoTransportDakar({ isDark = false, height = 40, showWordmark = true }) {
  const primary    = isDark ? '#f5f6fa' : '#1a1f2b'; // marine <-> clair (inversé)
  const windowFill = isDark ? '#11151c' : '#ffffff'; // vitres du bus (contraste avec la carrosserie)
  const wheelFill  = isDark ? '#cdd3da' : '#0f1117'; // roues (contraste avec le fond de page)
  const dashColor  = isDark ? '#11151c' : '#ffffff'; // pointillés de la route (contraste avec le trait)
  const orange     = '#ff6b35';
  const skylineA   = '#cdd3da';
  const skylineB   = '#b9c0c9';

  const viewBoxW = showWordmark ? 1450 : 620;

  return (
    <svg
      viewBox={`90 90 ${viewBoxW} 580`}
      height={height}
      style={{ display: 'block', flexShrink: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Badge */}
      <circle cx="380" cy="370" r="270" fill="none" stroke={primary} strokeWidth="8" />

      {/* Ligne de données */}
      <polyline points="170,290 240,225 320,265 410,210 480,245 555,200" fill="none" stroke={primary} strokeWidth="4" />
      <circle cx="170" cy="290" r="9" fill={primary} />
      <circle cx="240" cy="225" r="9" fill={orange} />
      <circle cx="320" cy="265" r="9" fill={primary} />
      <circle cx="410" cy="210" r="9" fill={orange} />
      <circle cx="480" cy="245" r="9" fill={primary} />
      <circle cx="555" cy="200" r="9" fill={orange} />

      {/* Skyline */}
      <rect x="240" y="330" width="34" height="120" fill={skylineA} />
      <rect x="284" y="300" width="34" height="150" fill={skylineB} />
      <rect x="328" y="345" width="34" height="105" fill={skylineA} />
      <rect x="372" y="315" width="34" height="135" fill={skylineB} />
      <rect x="416" y="355" width="34" height="95" fill={skylineA} />
      <rect x="460" y="325" width="34" height="125" fill={skylineB} />

      {/* Mini graphique en barres */}
      <rect x="210" y="400" width="20" height="50" fill={primary} />
      <rect x="236" y="375" width="20" height="75" fill={orange} />
      <rect x="262" y="415" width="20" height="35" fill={primary} />

      {/* Bus */}
      <rect x="295" y="395" width="170" height="80" rx="14" fill={primary} />
      <rect x="312" y="412" width="40" height="32" rx="4" fill={windowFill} />
      <rect x="362" y="412" width="40" height="32" rx="4" fill={windowFill} />
      <rect x="412" y="412" width="38" height="32" rx="4" fill={windowFill} />
      <circle cx="325" cy="480" r="13" fill={wheelFill} />
      <circle cx="435" cy="480" r="13" fill={wheelFill} />

      {/* Route + pin */}
      <path d="M 150 560 C 280 540, 380 600, 520 565 S 620 470, 600 420" fill="none" stroke={primary} strokeWidth="26" strokeLinecap="round" />
      <path d="M 150 560 C 280 540, 380 600, 520 565 S 620 470, 600 420" fill="none" stroke={dashColor} strokeWidth="3" strokeDasharray="14 14" />
      <path d="M600 420 L 575 360 a 30 30 0 1 1 50 0 Z" fill={orange} />
      <circle cx="600" cy="365" r="11" fill="#ffffff" />

      {/* Wordmark */}
      {showWordmark && (
        <text x="660" y="345" fontFamily="Arial, Helvetica, sans-serif" fontWeight="800" fontSize="92" fill={primary}>
          Transport<tspan fill={orange}>Dakar</tspan>
        </text>
      )}
    </svg>
  );
}
