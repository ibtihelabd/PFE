import React, { useState, useEffect, Suspense } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, AlertTriangle, CheckCircle, Info, MapPin, Clock, Bus, Search, Lightbulb, TrendingUp, Map, List } from 'lucide-react';
import MapView from '../components/MapView';
import ExportPDF from '../components/ExportPDF';
import { useTheme } from '../theme';
import { authFetch, getSession } from '../auth';

const API_URL = "http://localhost:8000";

/* ── variants ───────────────────────────────────────────── */
const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
  exit:    { opacity: 0, x: 50, transition: { duration: 0.3 } },
};
const itemVariants = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 100, damping: 15 } },
};

/* ── helpers ────────────────────────────────────────────── */
const getRisqueConfig = (niveau) => ({
  'ÉLEVÉ':  { color: '#ff6b6b', bg: 'rgba(255,107,107,0.12)', border: 'rgba(255,107,107,0.3)',  dot: '#ff6b6b' },
  'MODÉRÉ': { color: '#ffa94d', bg: 'rgba(255,169,77,0.12)',  border: 'rgba(255,169,77,0.3)',   dot: '#ffa94d' },
  'FAIBLE': { color: '#69db7c', bg: 'rgba(105,219,124,0.12)', border: 'rgba(105,219,124,0.3)',  dot: '#69db7c' },
}[niveau] || { color: '#69db7c', bg: 'rgba(105,219,124,0.12)', border: 'rgba(105,219,124,0.3)', dot: '#69db7c' });

/* ── sub-components ─────────────────────────────────────── */
const NiveauBadge = ({ niveau }) => {
  const c = getRisqueConfig(niveau);
  return (
    <span style={{
      background: c.bg, color: c.color, border: `1px solid ${c.border}`,
      borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
      display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
      {niveau}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, color }) => {
  const { theme } = useTheme();
  return (
    <motion.div variants={itemVariants} style={{
      background: theme.panelSolid, border: `1px solid ${theme.border}`,
      borderRadius: 14, padding: '18px 20px', flex: 1, minWidth: 140,
      boxShadow: theme.shadow, display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{ width: 42, height: 42, borderRadius: 10, background: `${color}20`, border: `1px solid ${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} color={color} />
      </div>
      <div>
        <div style={{ fontSize: 26, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, color: theme.muted, marginTop: 4 }}>{label}</div>
      </div>
    </motion.div>
  );
};

const ProgressBar = ({ value, color }) => {
  const { theme } = useTheme();
  return (
    <div style={{ background: theme.border, borderRadius: 999, height: 5, flex: 1 }}>
      <motion.div style={{ background: color, borderRadius: 999, height: 5 }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(value * 100, 100)}%` }}
        transition={{ duration: 0.9, ease: 'easeOut' }} />
    </div>
  );
};

/* ════════════════════════════════════════════════════════ */
const ZonesRisquePage = () => {
  const navigate = useNavigate();
  const [zones, setZones]         = useState([]);
  const [resume, setResume]       = useState(null);
  const [loading, setLoading]     = useState(true);
  const [erreur, setErreur]       = useState(null);
  const { theme } = useTheme();

  // Styles basés sur le thème
  const card = {
    background: theme.panelSolid, border: `1px solid ${theme.border}`,
    borderRadius: 16, boxShadow: theme.shadow, overflow: 'hidden',
  };
  const cardHeader = {
    padding: '14px 22px', borderBottom: `1px solid ${theme.border}`,
    display: 'flex', alignItems: 'center', gap: 10,
  };
  const [filtre, setFiltre]       = useState('TOUS');
  const [recherche, setRecherche] = useState('');
  const [tab, setTab]             = useState('exploitation');
  const [view, setView]           = useState('liste'); // 'liste' | 'carte'
  const [page, setPage]           = useState(1);
  const PAGE_SIZE = 10;

  useEffect(() => {
    Promise.all([
      authFetch(`${API_URL}/zones-risque`),
      authFetch(`${API_URL}/zones-risque/resume`),
    ])
      .then(([r1, r2]) => Promise.all([r1.json(), r2.json()]))
      .then(([d1, d2]) => { setZones(d1.zones); setResume(d2); })
      .catch(() => setErreur("Impossible de charger les données. Vérifiez que FastAPI tourne sur le port 8000."))
      .finally(() => setLoading(false));
  }, []);

  const zonesFiltrees = zones.filter(z =>
    (filtre === 'TOUS' || z.niveau_risque === filtre) &&
    z.zone.toLowerCase().includes(recherche.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(zonesFiltrees.length / PAGE_SIZE));
  const zonesPaginees = zonesFiltrees.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filter/search changes
  const handleFiltre = (f) => { setFiltre(f); setPage(1); };
  const handleRecherche = (v) => { setRecherche(v); setPage(1); };

  // Recommandations dynamiques générées à partir des données réelles
  const genererRecommandations = (zones, resume) => {
    if (!zones.length || !resume) return { exploitation: [], planification: [] };

    const zonesElevees  = zones.filter(z => z.niveau_risque === 'ÉLEVÉ');
    const top1          = zones[0];
    const top2          = zones[1];
    const moyTc         = zones.reduce((s, z) => s + (z.tc_disponibles || 0), 0) / zones.length;
    const moyEnclav     = zones.filter(z => z.enclavement_pct !== undefined)
                               .reduce((s, z) => s + (z.enclavement_pct || 0), 0) / Math.max(zones.length, 1);
    const zonesInond    = zones.filter(z => (z.score_inond_moy || 0) > 1.5);
    const zonesFaibleTc = zones.filter(z => (z.tc_disponibles || 0) < 2);

    return {
      exploitation: [
        {
          type: 'ALERTE PRIORITAIRE', icon: '🚨',
          color: '#ff6b6b', bg: 'rgba(255,107,107,0.1)', border: 'rgba(255,107,107,0.25)',
          title: `Intervention immédiate — ${top1?.zone || 'Zone critique'}`,
          text: `${top1?.zone} affiche le risque d'inaccessibilité le plus élevé (${Math.round((top1?.prob_risque || 0) * 100)}%, ${Math.round(top1?.pct_risque || 0)}% des ménages touchés). Déployer en urgence des dessertes complémentaires et évaluer les obstacles physiques (inondations, routes dégradées).`
        },
        {
          type: 'POINT SENSIBLE', icon: '⚠️',
          color: '#ffa94d', bg: 'rgba(255,169,77,0.1)', border: 'rgba(255,169,77,0.25)',
          title: `Surveillance renforcée — ${top2?.zone || 'Zone 2'}`,
          text: `${top2?.zone} est classée 2ème zone à risque (${Math.round((top2?.prob_risque || 0) * 100)}%, ${Math.round(top2?.pct_risque || 0)}% des ménages touchés). Une mission de terrain est recommandée pour diagnostiquer les ruptures de service TC et l'état des voiries.`
        },
        zonesInond.length > 0 ? {
          type: 'INONDATIONS', icon: '🌊',
          color: '#74c0fc', bg: 'rgba(116,192,252,0.1)', border: 'rgba(116,192,252,0.25)',
          title: `${zonesInond.length} zone(s) vulnérables aux inondations`,
          text: `Les zones ${zonesInond.slice(0, 3).map(z => z.zone).join(', ')} présentent une fréquence d'inondation élevée qui paralyse les TC. Coordonner avec la Direction de la Gestion des Inondations (DGI) pour des travaux de drainage avant la saison des pluies.`
        } : {
          type: 'ÉTAT DES SERVICES', icon: '✅',
          color: '#69db7c', bg: 'rgba(105,219,124,0.1)', border: 'rgba(105,219,124,0.25)',
          title: 'Zones à risque faible stables',
          text: `${resume.zones_faibles} zones présentent un risque faible. Maintenir le niveau de service TC actuel et anticiper toute réduction de desserte.`
        },
      ],
      planification: [
        {
          type: 'INFRASTRUCTURE TC', icon: '🚌',
          color: '#ffa94d', bg: 'rgba(255,169,77,0.1)', border: 'rgba(255,169,77,0.25)',
          title: `Extension des lignes TC (moyenne ${moyTc.toFixed(1)} lignes/zone)`,
          text: `La moyenne de ${moyTc.toFixed(1)} ligne(s) TC par zone est insuffisante. ${zonesFaibleTc.length} zone(s) disposent de moins de 2 lignes. Planifier l'ouverture de nouvelles dessertes DDD/Tata sur les axes périphériques sous-couverts.`
        },
        {
          type: 'DÉSENCLAVEMENT', icon: '🛣️',
          color: '#da77f2', bg: 'rgba(218,119,242,0.1)', border: 'rgba(218,119,242,0.25)',
          title: `${resume.zones_elevees} zones à désenclaver en priorité`,
          text: `Les ${resume.zones_elevees} zones à risque ÉLEVÉ nécessitent un plan de désenclavement intégré : voiries carrossables, éclairage public et arrêts TC sécurisés. Inscrire ces zones dans le Programme de Modernisation des Transports (PMT).`
        },
        {
          type: 'RÉSILIENCE CLIMATIQUE', icon: '🌧️',
          color: '#69db7c', bg: 'rgba(105,219,124,0.1)', border: 'rgba(105,219,124,0.25)',
          title: 'Plan d\'adaptation aux inondations saisonnières',
          text: `L'analyse EMD révèle que les inondations sont la 2ème cause d'inaccessibilité. Recommander la mise en place d'itinéraires TC alternatifs activés automatiquement lors des alertes météo, en partenariat avec ANACIM et ONAS.`
        },
      ]
    };
  };

  /* ── loading ── */
  if (loading) return (
    <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}
        style={{ color: '#74c0fc', fontSize: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
        <MapPin size={20} /> Chargement des zones...
      </motion.div>
    </div>
  );

  return (
    <motion.div
      initial="hidden" animate="visible" exit="exit"
      variants={containerVariants}
      className="dtk-page"
      style={{ minHeight: '100vh', background: theme.bg, fontFamily: 'Inter, sans-serif', color: theme.text, position: 'relative', overflow: 'hidden' }}
    >
      {/* glows */}
      <div style={{ position: 'fixed', top: '-15%', right: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,107,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-20%', left: '-10%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(116,192,252,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── NAVBAR ── */}
      <motion.nav variants={itemVariants} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 32px', borderBottom: '1px solid var(--dtk-panel)',
        backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--dtk-navbar)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/')} style={{
            background: 'var(--dtk-panel)', border: '1px solid var(--dtk-vmuted)',
            borderRadius: 20, padding: '7px 14px', color: 'var(--dtk-sub)',
            cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.2s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--dtk-border)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--dtk-panel)'}
          >
            <ArrowLeft size={14} /> Retour
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff6b6b', boxShadow: '0 0 8px #ff6b6b' }} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>Zones à Risque d'Inaccessibilité</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {!loading && !erreur && resume && (
            <ExportPDF type="zones" label="Exporter PDF" data={{ ...resume, zones: zones }} />
          )}
          <span style={{
            fontSize: 11, color: 'var(--dtk-vmuted)', border: '1px solid var(--dtk-border)',
            borderRadius: 6, padding: '4px 10px', letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            CETUD · Décideurs
          </span>
        </div>
      </motion.nav>

      <div style={{ maxWidth: 1260, margin: '0 auto', padding: '30px 32px' }}>

        {/* titre */}
        <motion.div variants={itemVariants} style={{ marginBottom: 26 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px' }}>
            Analyse des zones à risque <span style={{ color: '#ff6b6b' }}>d'inaccessibilité</span>
          </h1>
          <p style={{ fontSize: 13, color: 'var(--dtk-muted)', margin: 0 }}>
            Classement des zones de Dakar selon leur niveau de risque d'inaccessibilité aux transports — données EMD CETUD
          </p>
        </motion.div>

        {erreur && (
          <motion.div variants={itemVariants} style={{
            background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.3)',
            borderRadius: 10, padding: 16, marginBottom: 22, color: '#ff6b6b', fontSize: 13,
          }}>⚠️ {erreur}</motion.div>
        )}

        {!loading && !erreur && resume && (<>

          {/* KPIs */}
          <motion.div variants={itemVariants} style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard icon={MapPin}        label="Zones analysées"      value={resume.total_zones}    color="#74c0fc" />
            <StatCard icon={AlertTriangle} label="Zones à risque élevé" value={resume.zones_elevees}  color="#ff6b6b" />
            <StatCard icon={Info}          label="Zones modérées"        value={resume.zones_moderees} color="#ffa94d" />
            <StatCard icon={CheckCircle}   label="Zones faibles risque"  value={resume.zones_faibles}  color="#69db7c" />
          </motion.div>

          {/* Top 5 */}
          <motion.div variants={itemVariants} className="card-3d" style={{ ...card, marginBottom: 20 }}>
            <div style={cardHeader}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(255,107,107,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🚨</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dtk-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Top 5 zones prioritaires</span>
            </div>
            <div style={{ padding: '16px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {resume.top5_risque.map((z, i) => {
                const c = getRisqueConfig(z.niveau_risque);
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                      background: i === 0 ? '#ff6b6b' : 'var(--dtk-panel)',
                      color: i === 0 ? 'var(--dtk-text)' : 'var(--dtk-muted)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 700,
                    }}>{i + 1}</span>
                    <span style={{ fontSize: 13, fontWeight: 500, width: 240, flexShrink: 0, color: 'var(--dtk-text)' }}>{z.zone}</span>
                    <ProgressBar value={z.prob_risque} color={c.color} />
                    <span style={{ fontSize: 13, fontWeight: 700, color: c.color, width: 40, textAlign: 'right', flexShrink: 0 }}>
                      {Math.round(z.prob_risque * 100)}%
                    </span>
                    <NiveauBadge niveau={z.niveau_risque} />
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* ── RECOMMANDATIONS DÉCIDEURS ── */}
          {(() => {
            const reco = genererRecommandations(zones, resume);
            const session = getSession();
            const activeTab = (session?.role === 'planificateur') ? 'planification' : 'exploitation';
            const cards = reco[activeTab] || [];
            
            return (
              <motion.div variants={itemVariants} className="card-3d" style={{ ...card, marginBottom: 20 }}>
                <div style={{ ...cardHeader, justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(116,192,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>
                      <Lightbulb size={15} color="#74c0fc" />
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dtk-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                      Recommandations opérationnelles — Zones d'inaccessibilité ({activeTab})
                    </span>
                  </div>
                  {/* Onglets masqués pour forcer la séparation par rôle */}
                </div>

                <div style={{ padding: '18px 22px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
                  {cards.map((r, i) => (
                    <motion.div key={i}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: i * 0.07 }}
                      className="card-3d"
                      style={{
                        background: r.bg, border: `1px solid ${r.border}`,
                        borderRadius: 12, padding: '14px 16px',
                      }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 16 }}>{r.icon}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 800, letterSpacing: '0.8px',
                          color: r.color, textTransform: 'uppercase',
                          background: `${r.color}20`, borderRadius: 6, padding: '2px 8px',
                        }}>{r.type}</span>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--dtk-text)', marginBottom: 6 }}>{r.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--dtk-sub)', lineHeight: 1.55 }}>{r.text}</div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            );
          })()}

          {/* Filtres + toggle vue */}
          <motion.div variants={itemVariants} style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: 'var(--dtk-panel)', border: '1px solid var(--dtk-border)',
              borderRadius: 20, padding: '0 14px', height: 38,
            }}>
              <Search size={14} color="var(--dtk-muted)" />
              <input
                type="text" placeholder="Rechercher une zone..."
                value={recherche} onChange={e => handleRecherche(e.target.value)}
                style={{
                  background: 'none', border: 'none', outline: 'none',
                  color: 'var(--dtk-text)', fontSize: 13, width: 180,
                  '::placeholder': { color: 'var(--dtk-vmuted)' }
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 6, background: 'var(--dtk-panel)', border: '1px solid var(--dtk-border)', borderRadius: 20, padding: 4 }}>
              {['TOUS', 'ÉLEVÉ', 'MODÉRÉ', 'FAIBLE'].map(f => {
                const activeColor = f === 'ÉLEVÉ' ? '#ff6b6b' : f === 'MODÉRÉ' ? '#ffa94d' : f === 'FAIBLE' ? '#69db7c' : null;
                return (
                  <button key={f} onClick={() => handleFiltre(f)} style={{
                    height: 30, padding: '0 14px', borderRadius: 16, border: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                    background: filtre === f ? (activeColor || 'var(--dtk-vmuted)') : 'transparent',
                    color: filtre === f ? 'var(--dtk-text)' : 'var(--dtk-muted)',
                  }}>{f}</button>
                );
              })}
            </div>
            {/* Toggle liste / carte */}
            <div style={{ display: 'flex', gap: 4, background: 'var(--dtk-panel)', border: '1px solid var(--dtk-border)', borderRadius: 20, padding: 4, marginLeft: 'auto' }}>
              {[{ id: 'liste', icon: List, label: 'Liste' }, { id: 'carte', icon: Map, label: 'Carte' }].map(({ id, icon: Icon, label }) => (
                <button key={id} onClick={() => setView(id)} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  height: 30, padding: '0 12px', borderRadius: 16, border: 'none',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                  background: view === id ? 'var(--dtk-vmuted)' : 'transparent',
                  color: view === id ? 'var(--dtk-text)' : 'var(--dtk-muted)',
                }}>
                  <Icon size={13} /> {label}
                </button>
              ))}
            </div>

            <span style={{ fontSize: 12, color: 'var(--dtk-vmuted)' }}>
              {zonesFiltrees.length} zone{zonesFiltrees.length > 1 ? 's' : ''}
            </span>
          </motion.div>

          {/* Vue Carte */}
          {view === 'carte' && (
            <motion.div variants={itemVariants} className="card-3d" style={{ ...card, marginBottom: 20, overflow: 'hidden' }}>
              <div style={{ ...cardHeader }}>
                <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(116,192,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Map size={15} color="#74c0fc" />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dtk-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                  Carte géographique des zones — {zonesFiltrees.length} zone{zonesFiltrees.length > 1 ? 's' : ''} affichée{zonesFiltrees.length > 1 ? 's' : ''}
                </span>
              </div>
              <MapView
                zones={zonesFiltrees.map(z => ({
                  zone: z.zone,
                  lat: z.lat,
                  lon: z.lon,
                  niveau_risque: z.niveau_risque,
                  prob_risque: z.prob_risque,
                  nb_menages: z.nb_menages,
                  dur_sante: z.dur_sante,
                }))}
                showAnomalies={false}
                height={480}
              />
            </motion.div>
          )}

          {/* Vue Tableau */}
          {view === 'liste' && (
          <>{/* Tableau */}
          <motion.div variants={itemVariants} style={card}>
            <div style={cardHeader}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: 'rgba(105,219,124,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>📊</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--dtk-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Classement complet des zones</span>
            </div>

            {/* thead */}
            <div style={{
              display: 'grid', gridTemplateColumns: '44px 1fr 120px 90px 90px 110px 110px 110px',
              padding: '10px 22px', borderBottom: '1px solid var(--dtk-panel)',
              fontSize: 10, fontWeight: 700, color: 'var(--dtk-vmuted)',
              textTransform: 'uppercase', letterSpacing: '0.6px', background: 'var(--dtk-panel)',
            }}>
              <span>#</span><span>Zone / Strate</span><span>Niveau risque</span>
              <span>Probabilité</span><span>Ménages</span><span>% à risque</span>
              <span>TC disponibles</span><span>Durée santé</span>
            </div>

            {/* rows */}
            {zonesPaginees.map((z, i) => {
              const c = getRisqueConfig(z.niveau_risque);
              const globalIndex = (page - 1) * PAGE_SIZE + i;
              return (
                <motion.div key={z.rang ?? i}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: i * 0.025 }}
                  style={{
                    display: 'grid', gridTemplateColumns: '44px 1fr 120px 90px 90px 110px 110px 110px',
                    padding: '13px 22px', borderBottom: '1px solid var(--dtk-panel)',
                    alignItems: 'center',
                    background: globalIndex % 2 === 0 ? 'transparent' : 'var(--dtk-panel)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--dtk-panel)'}
                  onMouseLeave={e => e.currentTarget.style.background = globalIndex % 2 === 0 ? 'transparent' : 'var(--dtk-panel)'}
                >
                  <span style={{ fontSize: 12, color: 'var(--dtk-vmuted)', fontWeight: 600 }}>{z.rang}</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--dtk-text)', paddingRight: 12 }}>{z.zone}</span>
                  <span><NiveauBadge niveau={z.niveau_risque} /></span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: c.color }}>{Math.round(z.prob_risque * 100)}%</span>
                  <span style={{ fontSize: 13, color: 'var(--dtk-sub)' }}>{z.nb_menages}</span>
                  <span style={{ fontSize: 13, color: 'var(--dtk-sub)' }}>{z.pct_risque?.toFixed(1)}%</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Bus size={12} color="var(--dtk-muted)" />
                    <span style={{ fontSize: 13, color: 'var(--dtk-sub)' }}>{z.tc_disponibles?.toFixed(1)}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Clock size={12} color="var(--dtk-muted)" />
                    <span style={{ fontSize: 13, color: 'var(--dtk-sub)' }}>{z.dur_sante?.toFixed(0)} min</span>
                  </div>
                </motion.div>
              );
            })}

            {zonesFiltrees.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--dtk-vmuted)', fontSize: 14 }}>
                Aucune zone trouvée
              </div>
            )}

            {/* ── PAGINATION ── */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 22px', borderTop: '1px solid var(--dtk-panel)',
                background: 'var(--dtk-panel)',
              }}>
                {/* Info lignes */}
                <span style={{ fontSize: 12, color: 'var(--dtk-vmuted)' }}>
                  Lignes {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, zonesFiltrees.length)} sur {zonesFiltrees.length}
                </span>

                {/* Boutons pages */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {/* Précédent */}
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid var(--dtk-border)',
                      background: page === 1 ? 'transparent' : 'var(--dtk-panelSolid)',
                      color: page === 1 ? 'var(--dtk-vmuted)' : 'var(--dtk-text)',
                      cursor: page === 1 ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                    }}
                  >
                    ← Précédent
                  </button>

                  {/* Numéros de pages */}
                  {Array.from({ length: totalPages }, (_, idx) => idx + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                    .reduce((acc, p, i, arr) => {
                      if (i > 0 && p - arr[i - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === '...' ? (
                        <span key={`ellipsis-${idx}`} style={{ fontSize: 12, color: 'var(--dtk-vmuted)', padding: '0 4px' }}>…</span>
                      ) : (
                        <button
                          key={p}
                          onClick={() => setPage(p)}
                          style={{
                            width: 34, height: 34, borderRadius: 8,
                            border: `1px solid ${p === page ? '#ff6b6b' : 'var(--dtk-border)'}`,
                            background: p === page ? 'rgba(255,107,107,0.15)' : 'transparent',
                            color: p === page ? '#ff6b6b' : 'var(--dtk-muted)',
                            cursor: 'pointer', fontSize: 12, fontWeight: 700, transition: 'all 0.2s',
                          }}
                        >
                          {p}
                        </button>
                      )
                    )
                  }

                  {/* Suivant */}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: '6px 14px', borderRadius: 8, border: '1px solid var(--dtk-border)',
                      background: page === totalPages ? 'transparent' : 'var(--dtk-panelSolid)',
                      color: page === totalPages ? 'var(--dtk-vmuted)' : 'var(--dtk-text)',
                      cursor: page === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
                    }}
                  >
                    Suivant →
                  </button>
                </div>
              </div>
            )}
          </motion.div>
          </>)}

        </>)}

        <motion.div variants={itemVariants} style={{ textAlign: 'center', color: 'var(--dtk-vmuted)', fontSize: 12, marginTop: 28, paddingBottom: 20 }}>
          © {new Date().getFullYear()} Transport Dakar — PFE · Données CETUD 2015
        </motion.div>

      </div>
    </motion.div>
  );
};

export default ZonesRisquePage;
