import { useRef, useCallback, useState, useEffect } from 'react';
import { Home, TrafficCone, Bus, Users, Accessibility, BrainCircuit, RefreshCw, ExternalLink } from 'lucide-react';
import { useTheme } from '../theme';

/**
 * CockpitDakar — intègre le cockpit Knowage "Acceuil" dans l'appli via iframe,
 * avec 5 boutons de navigation (Trafic, Déplacements, Démographie,
 * Accessibilité, IA) gérés par NOTRE code React, et non par Knowage.
 *
 * Pourquoi les boutons sont ici et pas dans Knowage : le widget HTML
 * "Acceuil" du cockpit passe par un sanitizer serveur qui supprime tout
 * <script>/<iframe>/attribut non standard à l'enregistrement du document —
 * donc aucune interactivité ne peut survivre côté Knowage. En revanche,
 * rien n'empêche de cliquer depuis l'EXTÉRIEUR sur les onglets internes
 * du cockpit (les <md-tab-item> de la cockpit-engine Knowage), à condition
 * d'avoir accès au DOM de l'iframe — ce qui exige la même origine
 * (voir src/setupProxy.js).
 */

const KNOWAGE_PATH =
  '/knowage-vue/workspace/document-composite/Acceuil'; // proxifié via setupProxy.js

// Ordre = ordre réel des onglets dans Knowage (Acceuil en premier, page de garde).
const SHEETS = [
  { key: 'acceuil',        label: 'Acceuil',        icon: Home,          color: '#ff6b35' },
  { key: 'trafic',         label: 'Trafic',         icon: TrafficCone,   color: '#ff6b35' },
  { key: 'deplacements',   label: 'Déplacements',   icon: Bus,           color: '#74c0fc' },
  { key: 'demographie',    label: 'Démographie',    icon: Users,         color: '#69db7c' },
  { key: 'accessibilite',  label: 'Accessibilité',  icon: Accessibility, color: '#da77f2' },
  { key: 'ia',             label: 'IA',             icon: BrainCircuit,  color: '#ffd43b' },
];

export default function CockpitDakar() {
  const { theme } = useTheme();
  const iframeRef = useRef(null);
  const [active, setActive] = useState(null);
  const [status, setStatus] = useState('loading'); // loading | ready | blocked

  const handleLoad = useCallback(() => {
    try {
      // Simple sondage d'accès — lève une exception si cross-origin.
      // eslint-disable-next-line no-unused-expressions
      iframeRef.current?.contentDocument?.title;
      setStatus('ready');
    } catch {
      setStatus('blocked');
    }
  }, []);

  // Renvoie true si le clic a pu être effectué (cockpit interne chargé), false sinon.
  const clickTab = useCallback((label) => {
    try {
      const outerDoc = iframeRef.current?.contentDocument;
      if (!outerDoc) { setStatus('blocked'); return false; }

      // Knowage imbrique le vrai cockpit dans une 2e iframe interne.
      const innerFrame = outerDoc.querySelector('iframe.document-execution-iframe');
      const innerDoc = innerFrame?.contentDocument;
      if (!innerDoc) return false; // cockpit pas encore chargé

      const tabs = Array.from(innerDoc.querySelectorAll('md-tab-item'));
      const target = tabs.find((t) => t.textContent.trim().indexOf(label) === 0);
      if (!target) return false;
      target.click();
      return true;
    } catch {
      setStatus('blocked');
      return false;
    }
  }, []);

  const goToSheet = useCallback((sheet) => {
    setActive(sheet.key);
    clickTab(sheet.label);
  }, [clickTab]);

  // Au premier chargement du cockpit, on force l'affichage du sheet "Acceuil"
  // (sinon Knowage reste sur le dernier onglet utilisé lors de l'édition du document).
  useEffect(() => {
    if (status !== 'ready') return;
    let tries = 0;
    const id = setInterval(() => {
      tries += 1;
      const ok = clickTab('Acceuil');
      if (ok || tries > 20) clearInterval(id); // ~10s max d'essais (cockpit interne en cours de chargement)
    }, 500);
    return () => clearInterval(id);
  }, [status, clickTab]);

  return (
    <div className="dtk-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: theme.bg, padding: '20px 24px' }}>
      {/* En-tête */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: theme.text, margin: 0 }}>
            Cockpit <span style={{ color: '#ff6b35' }}>TransportDakar</span>
          </h1>
          <p style={{ fontSize: 12.5, color: theme.muted, marginTop: 3 }}>
            Tableau de bord Knowage intégré — navigation pilotée par l'application
          </p>
        </div>
        <a
          href={KNOWAGE_PATH}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
            color: theme.muted, textDecoration: 'none', border: `1px solid ${theme.border}`,
            borderRadius: 8, padding: '6px 10px',
          }}
        >
          <ExternalLink size={13} /> Ouvrir dans Knowage
        </a>
      </div>

      {status === 'blocked' && (
        <div style={{
          background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)',
          borderRadius: 10, padding: '10px 14px', marginBottom: 14, fontSize: 12.5, color: '#ff6b6b', flexShrink: 0,
        }}>
          Accès au contenu de Knowage bloqué (origines différentes). Vérifie que <code>src/setupProxy.js</code> est
          actif et que l'appli est bien ouverte via <code>http://localhost:3000</code> (le proxy redirige
          <code> /knowage</code> vers Knowage).
        </div>
      )}

      {/* Boutons de navigation — vivent dans le code React, jamais envoyés à Knowage */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap', flexShrink: 0 }}>
        {SHEETS.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => goToSheet(s)}
              className="dtk-card"
              style={{
                flex: '1 1 140px', minWidth: 130, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8, padding: '16px 10px', borderRadius: 12,
                border: `1px solid ${isActive ? `${s.color}55` : theme.border}`,
                background: isActive ? `${s.color}12` : theme.panelSolid,
                cursor: 'pointer', transition: 'all 0.15s', boxShadow: theme.shadow,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${s.color}55`; e.currentTarget.style.background = `${s.color}10`; }}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = theme.panelSolid; } }}
            >
              <Icon size={22} color={s.color} />
              <span style={{ fontSize: 12.5, fontWeight: 700, color: theme.text }}>{s.label}</span>
            </button>
          );
        })}
        <button
          onClick={() => iframeRef.current?.contentWindow?.location.reload()}
          title="Recharger le cockpit"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 44, borderRadius: 12, border: `1px solid ${theme.border}`,
            background: theme.panelSolid, color: theme.muted, cursor: 'pointer',
          }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Iframe Knowage (même origine grâce au proxy) — occupe tout l'espace restant */}
      <div style={{ flex: 1, minHeight: 0, borderRadius: 14, overflow: 'hidden', border: `1px solid ${theme.border}`, boxShadow: theme.shadow }}>
        <iframe
          ref={iframeRef}
          src={KNOWAGE_PATH}
          title="Cockpit Knowage TransportDakar"
          onLoad={handleLoad}
          style={{ width: '100%', height: '100%', border: 'none', display: 'block', background: '#fff' }}
        />
      </div>
    </div>
  );
}
