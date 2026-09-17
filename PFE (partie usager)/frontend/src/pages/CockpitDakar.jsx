import { useState } from 'react';
import { Home, TrafficCone, Bus, Users, Accessibility } from 'lucide-react';
import { useTheme } from '../theme';
import AccueilCockpit from './AccueilCockpit';
import TraficCockpit from './TraficCockpit';
import TrajetsCockpit from './TrajetsCockpit';
import DemographieCockpit from './DemographieCockpit';
import AccessibiliteCockpit from './AccessibiliteCockpit';

/**
 * CockpitDakar — les 5 sheets (Acceuil, Trafic, Déplacements, Démographie,
 * Accessibilité) sont désormais tous rendus nativement en React, à partir des
 * données extraites du cockpit Knowage (EMD CETUD 2015 + comptages trafic).
 * Plus d'iframe, plus de proxy same-origin, plus de clic cross-frame sur les
 * <md-tab-item> — le cockpit Knowage n'est plus sollicité par cette page.
 *
 * L'onglet "IA" a été retiré (demande explicite).
 */

const SHEETS = [
  { key: 'acceuil',        label: 'Acceuil',        icon: Home,          color: '#ff6b35', Component: AccueilCockpit },
  { key: 'trafic',         label: 'Trafic',         icon: TrafficCone,   color: '#ff6b35', Component: TraficCockpit },
  { key: 'deplacements',   label: 'Déplacements',   icon: Bus,           color: '#74c0fc', Component: TrajetsCockpit },
  { key: 'demographie',    label: 'Démographie',    icon: Users,         color: '#69db7c', Component: DemographieCockpit },
  { key: 'accessibilite',  label: 'Accessibilité',  icon: Accessibility, color: '#da77f2', Component: AccessibiliteCockpit },
];

export default function CockpitDakar() {
  const { theme } = useTheme();
  const [active, setActive] = useState('acceuil');
  const current = SHEETS.find((s) => s.key === active) || SHEETS[0];
  const CurrentPage = current.Component;

  return (
    <div className="dtk-page" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: theme.bg, padding: '20px 24px', overflowY: 'auto' }}>
      {/* En-tête */}
      <div style={{ marginBottom: 14, flexShrink: 0 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: theme.text, margin: 0 }}>
          Cockpit <span style={{ color: '#ff6b35' }}>TransportDakar</span>
        </h1>
        <p style={{ fontSize: 12.5, color: theme.muted, marginTop: 3 }}>
          Tableau de bord — rendu natif, données EMD CETUD 2015
        </p>
      </div>

      {/* Boutons de navigation */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', flexShrink: 0 }}>
        {SHEETS.map((s) => {
          const Icon = s.icon;
          const isActive = active === s.key;
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
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
      </div>

      {/* Page active — rendu natif React */}
      <CurrentPage />
    </div>
  );
}
