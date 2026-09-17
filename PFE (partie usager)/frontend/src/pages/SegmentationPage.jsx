import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme';
import { ArrowLeft, Users, Bus, Car, Bike, TrendingUp, BrainCircuit, CheckCircle, ChevronRight } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer,
         BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend } from 'recharts';
import { authFetch } from '../auth';

const API = 'http://localhost:8000';
const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const iv = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 16 } } };

/* ── Stats du mode de transport (hardcodées depuis EMD) ── */
const MODE_STATS = [
  { mode: 'Transport Commun', pct: 42, color: '#74c0fc', icon: '🚌' },
  { mode: 'Marche',           pct: 24, color: '#69db7c', icon: '🚶' },
  { mode: 'Taxi/Clando',      pct: 16, color: '#ffa94d', icon: '🚕' },
  { mode: 'Voiture',          pct: 11, color: '#da77f2', icon: '🚗' },
  { mode: 'Moto',             pct:  5, color: '#ff6b6b', icon: '🏍️' },
  { mode: 'Vélo/Autre',       pct:  2, color: '#94a3b8', icon: '🚲' },
];

/* ── Caractéristiques radar par segment ── */
const RADAR_DATA = {
  'Actifs TC réguliers':      [
    { label: 'Fréq. TC', val: 95 }, { label: 'Revenu', val: 40 }, { label: 'Mobilité', val: 70 },
    { label: 'Âge actif', val: 80 }, { label: 'Permis', val: 20 },
  ],
  'Actifs motorisés':         [
    { label: 'Fréq. TC', val: 20 }, { label: 'Revenu', val: 80 }, { label: 'Mobilité', val: 85 },
    { label: 'Âge actif', val: 75 }, { label: 'Permis', val: 95 },
  ],
  'Étudiants mobilité douce': [
    { label: 'Fréq. TC', val: 65 }, { label: 'Revenu', val: 15 }, { label: 'Mobilité', val: 60 },
    { label: 'Âge actif', val: 25 }, { label: 'Permis', val: 10 },
  ],
  'Piétons de proximité':     [
    { label: 'Fréq. TC', val: 15 }, { label: 'Revenu', val: 30 }, { label: 'Mobilité', val: 35 },
    { label: 'Âge actif', val: 55 }, { label: 'Permis', val: 25 },
  ],
  'Travailleurs informels':   [
    { label: 'Fréq. TC', val: 50 }, { label: 'Revenu', val: 25 }, { label: 'Mobilité', val: 55 },
    { label: 'Âge actif', val: 70 }, { label: 'Permis', val: 30 },
  ],
};

const DEFAULT_RADAR = [
  { label: 'Fréq. TC', val: 50 }, { label: 'Revenu', val: 50 }, { label: 'Mobilité', val: 50 },
  { label: 'Âge actif', val: 50 }, { label: 'Permis', val: 50 },
];

/* ── Composant carte segment ── */
function SegmentCard({ seg, selected, onClick, theme }) {
  return (
    <motion.div
      whileHover={{ y: -7, rotateX: 4, rotateY: -2, scale: 1.025, transition: { duration: 0.22, ease: [0.23,1,0.32,1] } }}
      onClick={onClick}
      style={{
        transformPerspective: 700,
        background: selected ? `${seg.color}15` : theme.panel,
        border: `1px solid ${selected ? seg.color + '45' : theme.border}`,
        borderRadius: 14, padding: '18px 18px', cursor: 'pointer',
        position: 'relative', overflow: 'hidden',
        boxShadow: theme.shadow,
      }}>
      {selected && (
        <div style={{ position: 'absolute', top: 10, right: 10 }}>
          <CheckCircle size={14} color={seg.color} />
        </div>
      )}
      <div style={{ position: 'absolute', top: -15, right: -15, width: 70, height: 70, borderRadius: '50%', background: `radial-gradient(circle, ${seg.color}15 0%, transparent 70%)`, pointerEvents: 'none' }} />

      <div style={{ fontSize: 26, marginBottom: 10 }}>{seg.icon}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: theme.text, marginBottom: 5 }}>{seg.label}</div>
      <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5, marginBottom: 12 }}>{seg.desc}</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: seg.color, fontSize: 11, fontWeight: 700 }}>
        <ChevronRight size={12} /> Voir le profil
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════ */
export default function SegmentationPage() {
  const navigate = useNavigate();
  const { theme, isDark } = useTheme();
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [erreur,   setErreur]   = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    authFetch(`${API}/api/segmentation/profils`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { setData(d); setSelected(d.segments[0]); })
      .catch(() => setErreur('API non disponible — relancez FastAPI sur le port 8000.'))
      .finally(() => setLoading(false));
  }, []);

  const radarData = selected
    ? (RADAR_DATA[selected.label] || DEFAULT_RADAR).map(d => ({ subject: d.label, A: d.val }))
    : [];

  /* Couleurs adaptatives pour les graphiques */
  const chartGrid    = isDark ? 'var(--dtk-panel)' : 'rgba(0,0,0,0.07)';
  const chartTick    = isDark ? 'var(--dtk-muted)'  : 'rgba(0,0,0,0.5)';
  const tooltipBg    = isDark ? '#1a1d27' : 'var(--dtk-text)';
  const tooltipBorder = theme.border;
  const barBg        = isDark ? 'var(--dtk-panel)' : 'rgba(0,0,0,0.06)';

  if (loading) return (
    <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}
        style={{ color: '#74c0fc', fontSize: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Users size={18} /> Chargement des segments...
      </motion.div>
    </div>
  );

  return (
    <motion.div initial="hidden" animate="visible" variants={cv}
      className="dtk-page"
      style={{ minHeight: '100vh', background: theme.bg, fontFamily: 'Inter, sans-serif', color: theme.text, padding: '24px 32px' }}>

      {/* glows */}
      <div style={{ position: 'fixed', top: '-10%', left: '-10%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(116,192,252,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-10%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(105,219,124,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* ── NAVBAR ── */}
      <motion.nav variants={iv} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        paddingBottom: 20, borderBottom: `1px solid ${theme.border}`, marginBottom: 28,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/decideurs')} style={{
            background: theme.panel, border: `1px solid ${theme.border}`,
            borderRadius: 20, padding: '7px 15px', color: theme.textSub,
            cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}
            onMouseEnter={e => e.currentTarget.style.background = theme.inputBorder}
            onMouseLeave={e => e.currentTarget.style.background = theme.panel}
          >
            <ArrowLeft size={14} /> Tableau de bord
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Users size={20} color="#69db7c" />
            <span style={{ fontWeight: 700, fontSize: 15, color: theme.text }}>Segmentation & Profils Usagers</span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: theme.muted, border: `1px solid ${theme.border}`, borderRadius: 6, padding: '4px 10px' }}>
          K-MEANS · EMD DAKAR 2015
        </span>
      </motion.nav>

      {/* Titre */}
      <motion.div variants={iv} style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px', color: theme.text }}>
          Analyse des profils <span style={{ color: '#69db7c' }}>d'usagers</span>
        </h1>
        <p style={{ fontSize: 13, color: theme.muted, margin: 0 }}>
          Segmentation par K-Means ({data?.k_clusters || '?'} clusters) · Classification du mode de transport par Random Forest
        </p>
      </motion.div>

      {erreur && (
        <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 12, padding: 14, marginBottom: 20, color: '#ff6b6b', fontSize: 13 }}>
          ⚠️ {erreur}
        </div>
      )}

      {data && (
        <>
          {/* ── KPI STRIP ── */}
          <motion.div variants={iv} style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            {[
              { icon: Users,        color: '#69db7c', val: data.k_clusters,                                            label: 'Segments identifiés', sub: 'K-Means optimal' },
              { icon: BrainCircuit, color: '#da77f2', val: data.rf_accuracy ? `${(data.rf_accuracy*100).toFixed(1)}%` : '—', label: 'Accuracy RF',    sub: 'Recommandation mode' },
              { icon: TrendingUp,   color: '#74c0fc', val: data.rf_cv_f1    ? `${(data.rf_cv_f1*100).toFixed(1)}%`    : '—', label: 'F1-Score CV',    sub: 'Validation croisée' },
              { icon: Bus,          color: '#ffa94d', val: data.modes_rf?.length || '?',                               label: 'Modes recommandés', sub: 'Classes RF' },
            ].map(({ icon: Icon, color, val, label, sub }) => (
              <div key={label} className="card-3d" style={{
                flex: 1, minWidth: 140,
                background: theme.panelSolid, border: `1px solid ${theme.border}`,
                borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
                boxShadow: theme.shadow,
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={17} color={color} />
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color, letterSpacing: '-0.3px' }}>{val}</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: theme.text }}>{label}</div>
                  <div style={{ fontSize: 10, color: theme.muted }}>{sub}</div>
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── GRILLE SEGMENTS ── */}
          <motion.div variants={iv} style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase', color: theme.muted, marginBottom: 14 }}>
              Cliquez sur un segment pour explorer son profil
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {data.segments.map(seg => (
                <SegmentCard key={seg.id} seg={seg} selected={selected?.id === seg.id} onClick={() => setSelected(seg)} theme={theme} />
              ))}
            </div>
          </motion.div>

          {/* ── DÉTAIL SEGMENT SÉLECTIONNÉ ── */}
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div key={selected.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>

                {/* Profil + conseil */}
                <div className="card-3d" style={{ background: theme.panelSolid, border: `1px solid ${selected.color}30`, borderRadius: 14, padding: '22px 22px', boxShadow: theme.shadow }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: `${selected.color}18`, border: `1px solid ${selected.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                      {selected.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: theme.text }}>{selected.label}</div>
                      <div style={{ fontSize: 11, color: selected.color, fontWeight: 600 }}>Segment {selected.id}</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12.5, color: theme.textSub, lineHeight: 1.6, marginBottom: 18 }}>
                    {selected.desc}
                  </div>

                  <div style={{ background: `${selected.color}10`, border: `1px solid ${selected.color}25`, borderRadius: 10, padding: '14px 16px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: selected.color, marginBottom: 8 }}>
                      💡 Conseil personnalisé
                    </div>
                    <div style={{ fontSize: 12, color: theme.textSub, lineHeight: 1.65 }}>
                      {selected.conseil || 'Aucun conseil disponible.'}
                    </div>
                  </div>
                </div>

                {/* Radar du profil */}
                <div className="card-3d" style={{ background: theme.panelSolid, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '22px 22px', boxShadow: theme.shadow }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 14 }}>
                    Profil caractéristique
                  </div>
                  <ResponsiveContainer width="100%" height={240}>
                    <RadarChart data={radarData}>
                      <PolarGrid stroke={chartGrid} />
                      <PolarAngleAxis dataKey="subject" tick={{ fill: chartTick, fontSize: 11 }} />
                      <Radar name={selected.label} dataKey="A" stroke={selected.color} fill={selected.color} fillOpacity={0.18} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── RÉPARTITION DES MODES ── */}
          <motion.div variants={iv} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

            {/* Camembert modes */}
            <div className="card-3d" style={{ background: theme.panelSolid, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: theme.shadow }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 16 }}>
                Répartition des modes de transport — EMD Dakar
              </div>
              <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
                <ResponsiveContainer width="55%" height={180}>
                  <PieChart>
                    <Pie data={MODE_STATS} dataKey="pct" nameKey="mode" cx="50%" cy="50%" outerRadius={75} innerRadius={40} strokeWidth={2} stroke={theme.bg}>
                      {MODE_STATS.map((m, i) => <Cell key={i} fill={m.color} />)}
                    </Pie>
                    <Tooltip formatter={(v) => [`${v}%`]} contentStyle={{ background: tooltipBg, border: `1px solid ${tooltipBorder}`, borderRadius: 8, color: theme.text, fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {MODE_STATS.map(m => (
                    <div key={m.mode} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 14 }}>{m.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: theme.text, fontWeight: 500 }}>{m.mode}</div>
                        <div style={{ background: barBg, borderRadius: 999, height: 3, marginTop: 3 }}>
                          <div style={{ background: m.color, borderRadius: 999, height: 3, width: `${m.pct * 2.3}%`, transition: 'width 0.8s ease' }} />
                        </div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: m.color, width: 30, textAlign: 'right' }}>{m.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modes RF disponibles */}
            <div className="card-3d" style={{ background: theme.panelSolid, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: theme.shadow }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 16 }}>
                Modes recommandés par le modèle RF
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(data.modes_rf || []).map((mode, i) => {
                  const modeData = MODE_STATS.find(m => m.mode === mode);
                  const color = modeData?.color || '#94a3b8';
                  const icon  = modeData?.icon  || '🚌';
                  return (
                    <div key={mode} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', background: `${color}10`,
                      border: `1px solid ${color}25`, borderRadius: 9,
                    }}>
                      <span style={{ fontSize: 16 }}>{icon}</span>
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: theme.text, flex: 1 }}>{mode}</span>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(218,119,242,0.07)', border: '1px solid rgba(218,119,242,0.2)', borderRadius: 9, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <BrainCircuit size={14} color="#da77f2" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11, color: theme.muted, lineHeight: 1.5 }}>
                  Le Random Forest prédit le mode de transport optimal pour chaque usager en fonction de son âge, revenu, niveau d'instruction et habitudes de mobilité.
                </span>
              </div>
            </div>
          </motion.div>

          {/* FOOTER */}
          <motion.div variants={iv} style={{ textAlign: 'center', color: theme.muted, fontSize: 12, paddingBottom: 10 }}>
            © {new Date().getFullYear()} Transport Dakar — Espace Décideurs · Segmentation EMD CETUD 2015
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
