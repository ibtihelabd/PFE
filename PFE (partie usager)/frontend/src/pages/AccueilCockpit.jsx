/**
 * AccueilCockpit — Version native React de la page "Acceuil" du cockpit Knowage.
 *
 * Remplace l'onglet Knowage "Acceuil" (jusqu'ici affiché via l'iframe same-origin
 * dans CockpitDakar.jsx) par un composant construit directement dans l'appli :
 * plus besoin du proxy/iframe/clic cross-frame pour cette page précise, et le
 * panneau "Modes de transport" affiche désormais une vraie répartition modale
 * (% des 156 764 déplacements EMD) au lieu de simples étiquettes sans donnée.
 *
 * Les 5 autres onglets (Trafic, Déplacements, Démographie, Accessibilité, IA)
 * restent inchangés, servis par le cockpit Knowage via iframe.
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Route, Home, Users, MapPin, Building2, Calendar, Landmark } from 'lucide-react';
import { useTheme } from '../theme';
import { KPIS, GRAND_DAKAR, MODES_TRANSPORT, SITES_COMPTAGE } from '../data/accueilData';
import SitesComptageMap from '../components/SitesComptageMap';

const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } } };
const iv = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 17 } } };

function AnimatedCount({ target, duration = 1200 }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || !target) return;
    started.current = true;
    const start = Date.now();
    const tick = () => {
      const progress = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <>{val.toLocaleString('fr')}</>;
}

/* ── Bannière KPI (haut de page) ── */
function TopKpi({ icon: Icon, color, label, value }) {
  const { theme } = useTheme();
  return (
    <motion.div variants={iv} style={{
      flex: 1, background: theme.panelSolid, border: `1px solid ${theme.border}`,
      borderRadius: 12, padding: '14px 18px', boxShadow: theme.shadow,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 10, background: `${color}18`,
        border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={18} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 20, fontWeight: 800, color: theme.text, lineHeight: 1.1 }}>
          <AnimatedCount target={value} />
        </div>
        <div style={{ fontSize: 11.5, color: theme.muted, fontWeight: 600, marginTop: 2 }}>{label}</div>
      </div>
    </motion.div>
  );
}

/* ── Tuile stat dans le panneau "Grand Dakar" ── */
function StatTile({ icon: Icon, color, value, label }) {
  return (
    <div style={{
      flex: 1, minWidth: 140, background: `${color}0d`, border: `1px solid ${color}30`,
      borderRadius: 10, padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Icon size={15} color={color} />
        <span style={{ fontSize: 22, fontWeight: 800, color }}>{value}</span>
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{label}</div>
    </div>
  );
}

/* ── Badge mode de transport (avec % réel) ── */
function ModeBadge({ mode }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: `${mode.color}22`, border: `1px solid ${mode.color}`, color: `${mode.color}`,
      padding: '4px 10px', borderRadius: 12, fontSize: 11, fontWeight: 600,
    }}>
      <span>{mode.emoji}</span>
      <span style={{ color: '#fff' }}>{mode.label}</span>
      <span style={{ opacity: 0.85 }}>· {mode.pct.toLocaleString('fr').replace('.', ',')}%</span>
    </span>
  );
}

export default function AccueilCockpit() {
  const { theme } = useTheme();

  return (
    <motion.div variants={cv} initial="hidden" animate="visible" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Bannière KPI */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
        <TopKpi icon={Route} color={theme.accent} label="Total Déplacements" value={KPIS.totalDeplacements} />
        <TopKpi icon={Home}  color={theme.blue}   label="Total Ménages"      value={KPIS.totalMenages} />
        <TopKpi icon={Users} color={theme.green}  label="Total Individus"    value={KPIS.totalIndividus} />
      </div>

      {/* Panneau "Grand Dakar, Sénégal" */}
      <motion.div variants={iv} style={{
        background: 'linear-gradient(135deg, #0d1424 0%, #131b2e 100%)',
        border: `1px solid ${theme.border}`, borderRadius: 16, padding: '20px 22px',
        boxShadow: theme.shadow, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#74c0fc', display: 'inline-block' }} />
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: 0 }}>Grand Dakar, Sénégal</h2>
          </div>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>14.7°N, 17.5°W</span>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <StatTile icon={MapPin}    color="#74c0fc" value={GRAND_DAKAR.sitesComptage}   label="Sites de comptage" />
          <StatTile icon={Building2} color="#69db7c" value={GRAND_DAKAR.departements}    label="Départements" />
          <StatTile icon={Calendar}  color="#ff8787" value={GRAND_DAKAR.anneeEMD}        label="Année EMD" />
          <StatTile icon={Landmark}  color="#ffd43b" value={GRAND_DAKAR.communesLabel}   label="Communes" />
        </div>

        <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: 8 }}>
          Modes de transport <span style={{ opacity: 0.7, fontWeight: 500 }}>— part des 156 764 déplacements EMD</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {MODES_TRANSPORT.map((m) => <ModeBadge key={m.key} mode={m} />)}
        </div>
      </motion.div>

      {/* Carte des sites de comptage */}
      <motion.div variants={iv} style={{
        background: theme.panelSolid, border: `1px solid ${theme.border}`, borderRadius: 16,
        padding: '16px 18px', boxShadow: theme.shadow,
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: theme.text, margin: '0 0 12px 0', textAlign: 'center' }}>
          Carte des sites de comptage ({SITES_COMPTAGE.length} sites GPS)
        </h3>
        <SitesComptageMap sites={SITES_COMPTAGE} height={420} />
      </motion.div>
    </motion.div>
  );
}
