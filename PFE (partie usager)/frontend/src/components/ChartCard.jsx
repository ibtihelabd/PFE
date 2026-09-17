/**
 * ChartCard — panneau standard (titre + cadre thémé) qui enveloppe un graphique
 * recharts, utilisé par toutes les pages natives du cockpit (Trafic, Trajets,
 * Démographie, Accessibilité) pour un rendu visuel cohérent avec le reste de
 * l'appli (mêmes tokens que theme.js).
 */
import { useTheme } from '../theme';

export default function ChartCard({ title, subtitle, height = 300, flex = '1 1 420px', children }) {
  const { theme } = useTheme();
  return (
    <div style={{
      flex, minWidth: 320, background: theme.panelSolid, border: `1px solid ${theme.border}`,
      borderRadius: 14, padding: '16px 18px', boxShadow: theme.shadow,
    }}>
      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: theme.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11, color: theme.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div style={{ height, width: '100%' }}>{children}</div>
    </div>
  );
}

export function tooltipStyle(theme) {
  return {
    contentStyle: {
      background: theme.panelSolid, border: `1px solid ${theme.border}`,
      borderRadius: 8, fontSize: 12, color: theme.text,
    },
    labelStyle: { color: theme.text, fontWeight: 600 },
    itemStyle: { color: theme.text },
  };
}
