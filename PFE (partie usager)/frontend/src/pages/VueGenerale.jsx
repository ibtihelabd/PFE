import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert, BarChart2, Activity, Bus, Brain,
  TrendingDown, Accessibility, Shield, ExternalLink,
  AlertTriangle, CheckCircle, Clock, Cpu, BrainCircuit,
  ArrowUpRight, RefreshCw, Wifi, WifiOff, Users
} from 'lucide-react';
import { getSession, logout as authLogout, authFetch } from '../auth';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../theme';

const API = 'http://localhost:8000';
const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.05 } } };
const iv = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 16 } } };

/* ── Compteur animé ── */
function AnimatedCount({ target, suffix = '', duration = 1400 }) {
  const [val, setVal] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (started.current || target === 0) return;
    started.current = true;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);
  return <>{val.toLocaleString('fr')}{suffix}</>;
}

/* ── Badge de statut API ── */
const ApiBadge = ({ online }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20,
    background: online ? 'rgba(105,219,124,0.08)' : 'rgba(255,107,107,0.08)',
    border: `1px solid ${online ? 'rgba(105,219,124,0.25)' : 'rgba(255,107,107,0.25)'}`,
    fontSize: 11, color: online ? '#69db7c' : '#ff6b6b', fontWeight: 600,
  }}>
    {online ? <Wifi size={11} /> : <WifiOff size={11} />}
    {online ? 'API connectée' : 'API hors ligne'}
  </div>
);

/* ── KPI Card ── */
const KpiCard = ({ icon: Icon, color, label, value, sub, suffix, trend, onClick }) => {
  const { theme } = useTheme();
  return (
    <motion.div variants={iv}
      whileHover={{ y: -7, rotateX: 4, rotateY: -2, scale: 1.025, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] } }}
      onClick={onClick}
      style={{
        background: theme.panelSolid, border: `1px solid ${theme.border}`,
        borderRadius: 14, padding: '18px 20px', cursor: onClick ? 'pointer' : 'default',
        position: 'relative', overflow: 'hidden',
        boxShadow: theme.shadow,
        transformPerspective: 700,
      }}
      onMouseEnter={e => { if (onClick) { e.currentTarget.style.borderColor = `${color}35`; e.currentTarget.style.background = `${color}08`; } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.background = theme.panel; }}
    >
      <div style={{ position: 'absolute', top: -15, right: -15, width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle, ${color}18 0%, transparent 70%)`, pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color} />
        </div>
        {trend !== undefined && (
          <span style={{ fontSize: 11, fontWeight: 700, color: trend > 0 ? '#ff6b6b' : '#69db7c', background: trend > 0 ? 'rgba(255,107,107,0.1)' : 'rgba(105,219,124,0.1)', borderRadius: 20, padding: '2px 8px' }}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1 }}>
        {value !== null && value !== undefined
          ? <AnimatedCount target={typeof value === 'number' ? value : 0} suffix={suffix || ''} />
          : <span style={{ fontSize: 14, color: theme.muted }}>—</span>
        }
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: theme.text, marginTop: 6, marginBottom: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: theme.muted }}>{sub}</div>}
      {onClick && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 10, color, fontSize: 11, fontWeight: 600 }}>
          <ArrowUpRight size={12} /> Voir le détail
        </div>
      )}
    </motion.div>
  );
};

/* ── Alerte card ── */
const AlertCard = ({ level, icon, title, desc, color, bg, border }) => {
  const { theme } = useTheme();
  return (
    <motion.div initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
      style={{ display: 'flex', gap: 12, padding: '12px 14px', background: bg, border: `1px solid ${border}`, borderRadius: 10 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 16 }}>
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3 }}>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.6px', textTransform: 'uppercase', color }}>{level}</span>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.text, marginBottom: 3 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.5 }}>{desc}</div>
      </div>
    </motion.div>
  );
};

/* ── Barre de progression ── */
const ProgressBar = ({ value, max, color, label }) => {
  const { theme } = useTheme();
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 11, color: theme.muted }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>{value}/{max}</span>
      </div>
      <div style={{ background: theme.border, borderRadius: 999, height: 5 }}>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${Math.min((value / max) * 100, 100)}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
          style={{ background: color, borderRadius: 999, height: 5 }}
        />
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════ */
export default function VueGenerale() {
  const navigate = useNavigate();
  const session = getSession();
  const { theme } = useTheme();

  const [zones, setZones] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [metrics, setMetrics] = useState(null);
  const [apiOnline, setApiOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [refreshing, setRefreshing] = useState(false);

  const heure = new Date().getHours();
  const greeting = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir';
  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const fetchData = async () => {
    setRefreshing(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        authFetch(`${API}/zones-risque/resume`),
        authFetch(`${API}/api/anomalies/summary`),
        authFetch(`${API}/api/ml/metrics`),
      ]);
      if (r1.ok) setZones(await r1.json());
      if (r2.ok) setAnomalies(await r2.json());
      if (r3.ok) setMetrics(await r3.json());
      setApiOnline(r1.ok || r2.ok);
      setLastRefresh(new Date());
    } catch {
      setApiOnline(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Accès RBAC : un module/KPI n'est affiché que si le rôle connecté y a droit
  // (cf. session.allowedRoutes dans auth.js) — évite les liens morts/"Accès refusé"
  // et généralise la vue aux 2 rôles décideurs (Directeur Planification / Chef d'Exploitation).
  const hasAccess = (path) => {
    const subPath = path.replace('/decideurs', '') || '/';
    return session?.allowedRoutes?.includes(subPath);
  };

  // Alertes dynamiques basées sur les vraies données
  const alertes = [
    zones?.zones_elevees > 0 && {
      level: 'CRITIQUE', icon: '🚨', color: '#ff6b6b',
      bg: 'rgba(255,107,107,0.07)', border: 'rgba(255,107,107,0.2)',
      title: `${zones.zones_elevees} zone(s) à risque élevé d'inaccessibilité`,
      desc: `${zones.top5_risque?.[0]?.zone || 'Zone critique'} est la zone la plus vulnérable. Intervention prioritaire recommandée.`,
    },
    anomalies?.anomalies > 0 && {
      level: 'ALERTE', icon: '⚡', color: '#ffa94d',
      bg: 'rgba(255,169,77,0.07)', border: 'rgba(255,169,77,0.2)',
      title: `${anomalies.anomalies} anomalies de trafic détectées`,
      desc: `${anomalies.sites_at_risk} site(s) de comptage présentent des comportements anormaux sur le réseau routier.`,
    },
    metrics && hasAccess('/decideurs/ml-insights') && {
      level: 'MODÈLE ML', icon: '🧠', color: '#69db7c',
      bg: 'rgba(105,219,124,0.07)', border: 'rgba(105,219,124,0.2)',
      title: `Modèle opérationnel — AUC ${(metrics.roc_auc * 100).toFixed(1)}%`,
      desc: `Précision ${(metrics.precision * 100).toFixed(1)}% · Rappel ${(metrics.recall * 100).toFixed(1)}% · F1 ${(metrics.f1_score * 100).toFixed(1)}%`,
    },
  ].filter(Boolean);

  const MODULES = [
    {
      path: '/decideurs/zones-risque', icon: ShieldAlert, color: '#ff6b6b',
      bg: 'rgba(255,107,107,0.1)', border: 'rgba(255,107,107,0.22)',
      label: 'Random Forest', title: "Zones à risque d'inaccessibilité",
      desc: 'Classement ML des zones par niveau de vulnérabilité aux transports.',
      live: zones ? `${zones.zones_elevees} élevées · ${zones.zones_moderees} modérées` : null,
    },
    {
      path: '/decideurs/simulateur', icon: Cpu, color: '#69db7c',
      bg: 'rgba(105,219,124,0.1)', border: 'rgba(105,219,124,0.22)',
      label: 'XGBOOST', title: 'Simulateur prédictif interactif',
      desc: 'Calculez en temps réel le risque d\'inaccessibilité pour n\'importe quel profil de ménage.',
      
    },
    {
      path: '/decideurs/anomalies', icon: BarChart2, color: '#74c0fc',
      bg: 'rgba(116,192,252,0.1)', border: 'rgba(116,192,252,0.22)',
      label: 'IF · LOF · Z-Score', title: "Détection d'anomalies trafic",
      desc: 'Identification multi-modèles des comportements anormaux sur les 49 sites de comptage.',
      live: anomalies ? `${anomalies.anomalies} anomalies · ${anomalies.sites_at_risk} sites` : null,
    },
    {
      path: '/decideurs/ml-insights', icon: BrainCircuit, color: '#da77f2',
      bg: 'rgba(218,119,242,0.1)', border: 'rgba(218,119,242,0.22)',
      label: 'XAI · SHAP', title: 'Audit & Transparence ML',
      desc: 'Décryptage des facteurs de risque et validation scientifique des modèles.',
      live: metrics ? `F1 ${(metrics.f1_score * 100).toFixed(1)}%` : null,
    },
    {
      path: '/decideurs/segmentation', icon: Users, color: '#69db7c',
      bg: 'rgba(105,219,124,0.1)', border: 'rgba(105,219,124,0.22)',
      label: 'K-Means · RF', title: 'Profils & Segmentation Usagers',
      desc: 'Analyse des segments de mobilité et recommandation de mode de transport personnalisée.',
      live: 'EMD 2015',
    },
    {
      path: '/decideurs/satisfaction', icon: Activity, color: '#ffa94d',
      bg: 'rgba(255,169,77,0.1)', border: 'rgba(255,169,77,0.22)',
      label: 'EMD Individu', title: 'Satisfaction & Écoute Usagers',
      desc: 'Indicateurs de satisfaction, insécurité perçue et recommandations issus des avis usagers.',
      live: 'Cellule d\'écoute',
    },
    {
      path: '/decideurs/evolution', icon: TrendingDown, color: '#74c0fc',
      bg: 'rgba(116,192,252,0.1)', border: 'rgba(116,192,252,0.22)',
      label: 'Séries temporelles', title: 'Évolution temporelle',
      desc: 'Suivi des indicateurs clés du réseau dans le temps.',
      live: null,
    },
  ].filter(mod => hasAccess(mod.path));

  return (
    <motion.div initial="hidden" animate="visible" variants={cv} className="dtk-page"
      style={{ minHeight: '100vh', background: theme.bg, fontFamily: 'Inter, sans-serif', color: theme.text }}>

      {/* ── HEADER ── */}
      <motion.div variants={iv} style={{
        padding: '22px 36px 20px', borderBottom: `1px solid ${theme.border}`,
        background: theme.navbar, backdropFilter: 'blur(20px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        <div>
          <div style={{ fontSize: 11, color: theme.muted, marginBottom: 4, textTransform: 'capitalize' }}>{dateStr}</div>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0, letterSpacing: '-0.3px' }}>
            {greeting},{' '}
            <span style={{ color: session?.roleColor || '#ff6b35' }}>{session?.nom?.split(' ')[0] || 'Décideur'}</span> 👋
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle />
          <ApiBadge online={apiOnline} />
          <div style={{ fontSize: 11, color: theme.muted }}>
            Mis à jour {lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
          </div>
          <button onClick={fetchData} disabled={refreshing} style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px',
            background: theme.panel, border: `1px solid ${theme.border}`,
            borderRadius: 8, color: theme.muted, fontSize: 12, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--dtk-text)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--dtk-muted)'}
          >
            <motion.span animate={refreshing ? { rotate: 360 } : { rotate: 0 }}
              transition={refreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}>
              <RefreshCw size={13} />
            </motion.span>
            Actualiser
          </button>
        </div>
      </motion.div>

      <div style={{ padding: '28px 36px', maxWidth: 1280, margin: '0 auto' }}>

        {/* ── KPI GRID (filtré selon les droits du rôle connecté) ── */}
        {(() => {
          const kpis = [
            { key: 'zones', icon: Shield, color: '#ff6b6b', label: 'Zones analysées', value: zones?.total_zones, sub: 'EMD CETUD Dakar', path: '/decideurs/zones-risque' },
            { key: 'risque', icon: AlertTriangle, color: '#ffa94d', label: 'Zones à risque élevé', value: zones?.zones_elevees, sub: 'Intervention prioritaire', trend: zones?.zones_elevees > 5 ? 12 : -8, path: '/decideurs/zones-risque' },
            { key: 'anomalies', icon: Activity, color: '#74c0fc', label: 'Anomalies détectées', value: anomalies?.anomalies, sub: 'Consensus 2/3 modèles', path: '/decideurs/anomalies' },
          ].filter(k => hasAccess(k.path));
          return (
            <motion.div variants={iv} style={{ display: 'grid', gridTemplateColumns: `repeat(${kpis.length}, 1fr)`, gap: 14, marginBottom: 24 }}>
              {kpis.map(k => (
                <KpiCard key={k.key} icon={k.icon} color={k.color} label={k.label} value={k.value} sub={k.sub} suffix={k.suffix} trend={k.trend} onClick={() => navigate(k.path)} />
              ))}
            </motion.div>
          );
        })()}

        {/* ── CONTENU PRINCIPAL : modules + objectifs ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 24 }}>

          {/* Modules */}
          <motion.div variants={iv}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: 'var(--dtk-vmuted)', marginBottom: 14 }}>
              Modules disponibles
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {MODULES.map(mod => (
                <motion.div key={mod.path}
                  whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.15 } }}
                  onClick={() => navigate(mod.path)}
                  style={{
                    background: theme.panelSolid,
                    border: `1px solid ${theme.border}`,
                    borderRadius: 14, padding: '18px 18px', cursor: 'pointer',
                    transition: 'all 0.22s', position: 'relative', overflow: 'hidden',
                    boxShadow: theme.shadow,
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = `${mod.color}45`;
                    e.currentTarget.style.boxShadow = `0 8px 28px ${mod.color}18, ${theme.shadow}`;
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = theme.border;
                    e.currentTarget.style.boxShadow = theme.shadow;
                  }}
                >
                  {/* Glow coin supérieur droit */}
                  <div style={{ position: 'absolute', top: -25, right: -25, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle, ${mod.color}20 0%, transparent 70%)`, pointerEvents: 'none' }} />
                  {/* Barre de couleur en bas */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${mod.color}80, ${mod.color}20)`, borderRadius: '0 0 14px 14px' }} />

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 10, background: `${mod.color}18`, border: `1px solid ${mod.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${mod.color}20` }}>
                      <mod.icon size={18} color={mod.color} />
                    </div>
                    {mod.live && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: mod.color, background: `${mod.color}12`, border: `1px solid ${mod.color}28`, borderRadius: 20, padding: '3px 9px' }}>
                        {mod.live}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: theme.muted, marginBottom: 5, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>{mod.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 6, lineHeight: 1.3 }}>{mod.title}</div>
                  <div style={{ fontSize: 11.5, color: theme.muted, lineHeight: 1.55, marginBottom: 14 }}>{mod.desc}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: mod.color, fontSize: 11, fontWeight: 700 }}>
                    <ExternalLink size={11} /> Ouvrir le module
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>


          {/* Panneau droit : Objectifs */}
          <motion.div variants={iv} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: 'var(--dtk-panel)', border: '1px solid var(--dtk-panel)', borderRadius: 13, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--dtk-muted)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
                <Brain size={13} color="#74c0fc" /> Objectifs du projet PFE
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  { icon: TrendingDown, color: '#ff6b6b', title: 'Réduire la congestion', desc: 'Fluidifier le trafic et diminuer les temps de parcours.' },
                  { icon: Accessibility, color: '#74c0fc', title: "Améliorer l'accessibilité", desc: "Garantir un accès équitable aux services de transport." },
                  { icon: Brain, color: '#ffa94d', title: 'Comprendre les déplacements', desc: "Analyser les comportements et besoins des usagers." },
                  { icon: Shield, color: '#69db7c', title: 'Aider la décision', desc: 'Insights fiables pour des décisions efficaces.' },
                ].map(({ icon: Icon, color, title, desc }) => (
                  <div key={title} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}15`, border: `1px solid ${color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon size={14} color={color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: theme.text, marginBottom: 2 }}>{title}</div>
                      <div style={{ fontSize: 11, color: 'var(--dtk-muted)', lineHeight: 1.5 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

        </div>

        {/* ── FOOTER ── */}
        <motion.div variants={iv} style={{
          borderTop: '1px solid var(--dtk-panel)', paddingTop: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
        }}>

          <div style={{ fontSize: 11, color: 'var(--dtk-vmuted)' }}>
            © {new Date().getFullYear()} TransportDakar · PFE · Ibtihel Abdellaoui · CETUD
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
