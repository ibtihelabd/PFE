import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '../theme';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie,
} from 'recharts';
import {
  TrendingUp, TrendingDown, Activity, Users,
  Bus, Clock, ShieldAlert, BrainCircuit,
  Info, AlertTriangle, CheckCircle, ArrowRight,
} from 'lucide-react';
import {
  ANNEES, SOURCE_LABEL_EMD, SOURCE_LABEL_TRAFIC,
  TRAFIC, MENAGES, DEPLACEMENTS,
  MODES_ANNEES, INACCESSIBILITE,
  SEGMENTATION_ML, RECOMMANDATIONS,
} from '../data/evolutionData';

const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const iv = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 16 } } };

const MODE_COLORS = {
  'Transport Commun': '#74c0fc',
  'Marche':           '#69db7c',
  'Taxi/Clando':      '#ffa94d',
  'Voiture':          '#da77f2',
  'Moto':             '#ff6b6b',
  'Vélo/Autre':       '#94a3b8',
};

const PRIORITE_COLOR = { 'Haute': '#ff6b6b', 'Moyenne': '#ffa94d', 'Faible': '#69db7c' };
const PRIORITE_BG    = { 'Haute': 'rgba(255,107,107,0.08)', 'Moyenne': 'rgba(255,169,77,0.08)', 'Faible': 'rgba(105,219,124,0.08)' };

/* ── Tooltip custom ── */
const CustomTooltip = ({ active, payload, label, theme }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: theme.panelSolid, border: `1px solid ${theme.border}`,
      borderRadius: 10, padding: '10px 14px', fontSize: 12,
      boxShadow: theme.shadow,
    }}>
      <div style={{ fontWeight: 700, color: theme.text, marginBottom: 6 }}>Année {label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
          <span style={{ color: theme.muted }}>{p.name} :</span>
          <span style={{ fontWeight: 700, color: theme.text }}>{p.value}{p.unit || ''}</span>
        </div>
      ))}
    </div>
  );
};

/* ── KPI delta ── */
const Delta = ({ val2010, val2023, suffix = '', inverse = false }) => {
  const pct = Math.round(((val2023 - val2010) / val2010) * 100);
  const isPositive = inverse ? pct < 0 : pct > 0;
  const color = isPositive ? '#69db7c' : '#ff6b6b';
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, color,
      background: `${color}15`, borderRadius: 12,
      padding: '2px 8px', marginLeft: 6,
    }}>
      {pct > 0 ? '↑' : '↓'}{Math.abs(pct)}%
    </span>
  );
};

/* ── Section title ── */
const SectionTitle = ({ icon: Icon, color, children, theme }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${color}18`, border: `1px solid ${color}28`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Icon size={16} color={color} />
    </div>
    <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: theme.text, letterSpacing: '-0.2px' }}>{children}</h2>
  </div>
);

/* ══════════════════════════════════════════════════════════════ */
export default function EvolutionTemporelle() {
  const { theme, isDark } = useTheme();
  const [activeReco, setActiveReco] = useState(null);

  const gridColor  = isDark ? 'var(--dtk-panel)' : 'rgba(0,0,0,0.06)';
  const axisColor  = isDark ? 'var(--dtk-muted)' : 'rgba(0,0,0,0.45)';
  const dotFill    = isDark ? 'var(--dtk-bg)' : 'var(--dtk-text)';

  /* ── Totaux pour les KPI ── */
  const t2010 = TRAFIC[0], t2023 = TRAFIC[3];
  const m2010 = MENAGES[0], m2023 = MENAGES[3];
  const d2010 = DEPLACEMENTS[0], d2023 = DEPLACEMENTS[3];
  const i2010 = INACCESSIBILITE[0], i2023 = INACCESSIBILITE[3];

  return (
    <motion.div initial="hidden" animate="visible" variants={cv}
      className="dtk-page"
      style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: 'Inter, sans-serif', padding: '28px 36px' }}>

      {/* ─── HEADER ─── */}
      <motion.div variants={iv} style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(116,192,252,0.12)', border: '1px solid rgba(116,192,252,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <TrendingUp size={20} color="#74c0fc" />
              </div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: '-0.5px', color: theme.text }}>
                Évolution temporelle du réseau
              </h1>
            </div>
            <p style={{ fontSize: 13, color: theme.muted, margin: 0 }}>
              Analyse comparative 2010 – 2023 · Trafic, Mobilité, Inaccessibilité, Ménages
            </p>
          </div>

          {/* Légende sources */}
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: theme.muted }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#69db7c', flexShrink: 0 }} />
              EMD réelle (2015)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: theme.muted }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#74c0fc', flexShrink: 0 }} />
              Trafic réel (2019)
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: theme.muted }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: theme.muted, flexShrink: 0 }} />
              Données simulées
            </div>
          </div>
        </div>

        {/* Bandeau avertissement */}
        <div style={{
          marginTop: 16, padding: '10px 16px', borderRadius: 10,
          background: 'rgba(116,192,252,0.07)', border: '1px solid rgba(116,192,252,0.2)',
          display: 'flex', alignItems: 'flex-start', gap: 10,
        }}>
          <Info size={14} color="#74c0fc" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 12, color: theme.muted, lineHeight: 1.55 }}>
            <strong style={{ color: theme.text }}>Note méthodologique :</strong> Les indicateurs ménages, individus, déplacements,
            partage modal, inaccessibilité et segmentation ML proviennent de l'Enquête Ménage Déplacement (EMD) CETUD <strong style={{ color: theme.text }}>2015</strong>.
            Les indicateurs de trafic proviennent des comptages réels CETUD <strong style={{ color: theme.text }}>2019</strong>.
            Les autres années sont des données <em>reconstituées / projetées</em> à des fins d'analyse comparative et prospective (PFE).
            Elles ne constituent pas des relevés officiels.
          </span>
        </div>
      </motion.div>

      {/* ─── KPI STRIP ─── */}
      <motion.div variants={iv} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 32 }}>
        {[
          {
            icon: Activity, color: '#ff6b6b',
            label: 'Anomalies détectées',
            val2010: t2010.anomalies_detectees, val2023: t2023.anomalies_detectees,
            suffix: '', inverse: false,
          },
          {
            icon: Bus, color: '#74c0fc',
            label: 'Part modale TC',
            val2010: MODES_ANNEES[0]['Transport Commun'], val2023: MODES_ANNEES[3]['Transport Commun'],
            suffix: '%', inverse: true,
          },
          {
            icon: ShieldAlert, color: '#ffa94d',
            label: 'Zones à risque élevé',
            val2010: i2010.zones_elevees, val2023: i2023.zones_elevees,
            suffix: '', inverse: true,
          },
          {
            icon: Clock, color: '#da77f2',
            label: 'Durée moy. déplacement',
            val2010: d2010.duree_moy_min, val2023: d2023.duree_moy_min,
            suffix: ' min', inverse: false,
          },
        ].map(({ icon: Icon, color, label, val2010, val2023, suffix, inverse }) => (
          <div key={label} className="card-3d" style={{
            background: theme.panelSolid, border: `1px solid ${theme.border}`,
            borderRadius: 14, padding: '16px 18px', boxShadow: theme.shadow,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={15} color={color} />
              </div>
              <span style={{ fontSize: 11, color: theme.muted }}>{label}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 11, color: theme.muted }}>2010 : <strong style={{ color: theme.textSub }}>{val2010}{suffix}</strong></span>
              <ArrowRight size={12} color={theme.muted} />
              <span style={{ fontSize: 11, color: theme.muted }}>2023 : <strong style={{ color }}>{val2023}{suffix}</strong></span>
              <Delta val2010={val2010} val2023={val2023} suffix={suffix} inverse={inverse} />
            </div>
          </div>
        ))}
      </motion.div>

      {/* ─── ROW 1 : Trafic + Modes ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Volume trafic & anomalies */}
        <motion.div variants={iv} className="card-3d" style={{
          background: theme.panelSolid, border: `1px solid ${theme.border}`,
          borderRadius: 16, padding: '22px 22px', boxShadow: theme.shadow,
        }}>
          <SectionTitle icon={Activity} color="#ff6b6b" theme={theme}>Trafic & Anomalies détectées</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={TRAFIC} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="annee" tick={{ fill: axisColor, fontSize: 11 }} />
              <YAxis yAxisId="left"  tick={{ fill: axisColor, fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: axisColor, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: theme.muted }} />
              <Line yAxisId="left"  type="monotone" dataKey="anomalies_detectees" name="Anomalies" stroke="#ff6b6b" strokeWidth={2.5} dot={{ fill: dotFill, stroke: '#ff6b6b', r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line yAxisId="right" type="monotone" dataKey="taux_anomalie" name="Taux (%)" stroke="#ffa94d" strokeWidth={2} strokeDasharray="5 3" dot={{ fill: dotFill, stroke: '#ffa94d', r: 3, strokeWidth: 2 }} />
            </LineChart>
          </ResponsiveContainer>
          {/* Dot 2019 marker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 10.5, color: theme.muted }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#74c0fc', flexShrink: 0 }} />
            2019 = données réelles (comptage trafic CETUD) · autres années simulées
          </div>
        </motion.div>

        {/* Répartition modale */}
        <motion.div variants={iv} className="card-3d" style={{
          background: theme.panelSolid, border: `1px solid ${theme.border}`,
          borderRadius: 16, padding: '22px 22px', boxShadow: theme.shadow,
        }}>
          <SectionTitle icon={Bus} color="#74c0fc" theme={theme}>Évolution du partage modal (%)</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={MODES_ANNEES} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="annee" tick={{ fill: axisColor, fontSize: 11 }} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Legend wrapperStyle={{ fontSize: 10, color: theme.muted }} />
              {Object.entries(MODE_COLORS).map(([mode, color]) => (
                <Bar key={mode} dataKey={mode} stackId="a" fill={color} name={mode} radius={mode === 'Vélo/Autre' ? [4, 4, 0, 0] : undefined} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ─── ROW 2 : Inaccessibilité + Ménages ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

        {/* Zones inaccessibilité */}
        <motion.div variants={iv} className="card-3d" style={{
          background: theme.panelSolid, border: `1px solid ${theme.border}`,
          borderRadius: 16, padding: '22px 22px', boxShadow: theme.shadow,
        }}>
          <SectionTitle icon={ShieldAlert} color="#ffa94d" theme={theme}>Zones d'inaccessibilité par niveau de risque</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={INACCESSIBILITE} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="annee" tick={{ fill: axisColor, fontSize: 11 }} />
              <YAxis tick={{ fill: axisColor, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: theme.muted }} />
              <Area type="monotone" dataKey="zones_elevees"  name="ÉLEVÉ"  stackId="a" stroke="#ff6b6b" fill="rgba(255,107,107,0.25)" strokeWidth={2} />
              <Area type="monotone" dataKey="zones_moderees" name="MODÉRÉ" stackId="a" stroke="#ffa94d" fill="rgba(255,169,77,0.18)"  strokeWidth={2} />
              <Area type="monotone" dataKey="zones_faibles"  name="FAIBLE" stackId="a" stroke="#69db7c" fill="rgba(105,219,124,0.12)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Indicateurs ménages */}
        <motion.div variants={iv} className="card-3d" style={{
          background: theme.panelSolid, border: `1px solid ${theme.border}`,
          borderRadius: 16, padding: '22px 22px', boxShadow: theme.shadow,
        }}>
          <SectionTitle icon={Users} color="#da77f2" theme={theme}>Indicateurs socio-démographiques ménages</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={MENAGES} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="annee" tick={{ fill: axisColor, fontSize: 11 }} />
              <YAxis yAxisId="left"  tick={{ fill: axisColor, fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: axisColor, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: theme.muted }} />
              <Line yAxisId="left"  type="monotone" dataKey="pct_motorises"    name="% Motorisés"    stroke="#da77f2" strokeWidth={2.5} dot={{ fill: dotFill, stroke: '#da77f2', r: 4, strokeWidth: 2 }} />
              <Line yAxisId="right" type="monotone" dataKey="taille_moyenne"   name="Taille ménage"  stroke="#74c0fc" strokeWidth={2}   dot={{ fill: dotFill, stroke: '#74c0fc', r: 3, strokeWidth: 2 }} strokeDasharray="5 3" />
              <Line yAxisId="left"  type="monotone" dataKey="pct_enclavement"  name="% Enclavement"  stroke="#ffa94d" strokeWidth={2}   dot={{ fill: dotFill, stroke: '#ffa94d', r: 3, strokeWidth: 2 }} strokeDasharray="3 4" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* ─── ROW 3 : Déplacements + ML ─── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 32 }}>

        {/* Durée & coût déplacements */}
        <motion.div variants={iv} className="card-3d" style={{
          background: theme.panelSolid, border: `1px solid ${theme.border}`,
          borderRadius: 16, padding: '22px 22px', boxShadow: theme.shadow,
        }}>
          <SectionTitle icon={Clock} color="#69db7c" theme={theme}>Durée et coût moyen des déplacements</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={DEPLACEMENTS} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="annee" tick={{ fill: axisColor, fontSize: 11 }} />
              <YAxis yAxisId="left"  tick={{ fill: axisColor, fontSize: 11 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: axisColor, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: theme.muted }} />
              <Line yAxisId="left"  type="monotone" dataKey="duree_moy_min"  name="Durée (min)"     stroke="#69db7c" strokeWidth={2.5} dot={{ fill: dotFill, stroke: '#69db7c', r: 4, strokeWidth: 2 }} />
              <Line yAxisId="right" type="monotone" dataKey="cout_moy_fcfa"  name="Coût (FCFA)"     stroke="#ff6b35" strokeWidth={2}   dot={{ fill: dotFill, stroke: '#ff6b35', r: 3, strokeWidth: 2 }} strokeDasharray="5 3" />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Performance modèles ML */}
        <motion.div variants={iv} className="card-3d" style={{
          background: theme.panelSolid, border: `1px solid ${theme.border}`,
          borderRadius: 16, padding: '22px 22px', boxShadow: theme.shadow,
        }}>
          <SectionTitle icon={BrainCircuit} color="#da77f2" theme={theme}>Performance des modèles ML au fil du temps</SectionTitle>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={SEGMENTATION_ML} margin={{ top: 4, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={gridColor} strokeDasharray="3 3" />
              <XAxis dataKey="annee" tick={{ fill: axisColor, fontSize: 11 }} />
              <YAxis domain={[75, 95]} tick={{ fill: axisColor, fontSize: 11 }} />
              <Tooltip content={<CustomTooltip theme={theme} />} />
              <Legend wrapperStyle={{ fontSize: 11, color: theme.muted }} />
              <Bar dataKey="rf_accuracy" name="Accuracy RF (%)" fill="#da77f2" radius={[6, 6, 0, 0]}>
                {SEGMENTATION_ML.map((entry) => (
                  <Cell key={entry.annee} fill={entry.annee === 2015 ? '#69db7c' : '#da77f2'} />
                ))}
              </Bar>
              <Bar dataKey="rf_f1_score" name="F1-Score (%)" fill="rgba(218,119,242,0.4)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div style={{ fontSize: 10.5, color: theme.muted, marginTop: 8 }}>
            <span style={{ color: '#69db7c', fontWeight: 700 }}>■ vert</span> = données réelles EMD 2015
          </div>
        </motion.div>
      </div>

      {/* ─── RECOMMANDATIONS ─── */}
      <motion.div variants={iv} style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertTriangle size={16} color="#ff6b35" />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, margin: 0, color: theme.text }}>Recommandations & Interprétations</h2>
            <p style={{ fontSize: 12, color: theme.muted, margin: 0 }}>Basées sur les tendances observées 2010–2023 · Cliquez sur une carte pour développer</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {RECOMMANDATIONS.map((r) => {
            const isOpen = activeReco === r.id;
            return (
              <motion.div
                key={r.id}
                className="card-3d"
                onClick={() => setActiveReco(isOpen ? null : r.id)}
                style={{
                  background: isOpen ? `${r.couleur}08` : theme.panelSolid,
                  border: `1px solid ${isOpen ? r.couleur + '40' : theme.border}`,
                  borderRadius: 14, padding: '18px 18px', cursor: 'pointer',
                  boxShadow: theme.shadow, transition: 'border-color 0.2s',
                }}
              >
                {/* Header carte */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 20 }}>{r.icone}</span>
                    <span style={{
                      fontSize: 9, fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase',
                      color: r.couleur, background: `${r.couleur}15`, border: `1px solid ${r.couleur}30`,
                      borderRadius: 20, padding: '2px 8px',
                    }}>{r.badge}</span>
                  </div>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: PRIORITE_BG[r.priorite], color: PRIORITE_COLOR[r.priorite],
                    border: `1px solid ${PRIORITE_COLOR[r.priorite]}30`,
                  }}>{r.priorite}</span>
                </div>

                <h3 style={{ fontSize: 13, fontWeight: 700, color: theme.text, margin: '0 0 8px', lineHeight: 1.4 }}>{r.titre}</h3>
                <div style={{ fontSize: 11, color: theme.muted, lineHeight: 1.6, marginBottom: 10 }}>{r.constat}</div>

                {/* Détail développé */}
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    style={{
                      borderTop: `1px solid ${r.couleur}25`, paddingTop: 12, marginTop: 4,
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: r.couleur, marginBottom: 8 }}>
                      💡 Recommandation
                    </div>
                    <div style={{ fontSize: 12, color: theme.textSub, lineHeight: 1.65 }}>{r.recommandation}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                      <span style={{ fontSize: 10, color: theme.muted, background: theme.panel, border: `1px solid ${theme.border}`, borderRadius: 20, padding: '3px 10px' }}>
                        ⏱ {r.horizon}
                      </span>
                      <span style={{ fontSize: 10, color: r.couleur, background: `${r.couleur}10`, border: `1px solid ${r.couleur}25`, borderRadius: 20, padding: '3px 10px' }}>
                        {r.categorie}
                      </span>
                    </div>
                  </motion.div>
                )}

                <div style={{ marginTop: 8, fontSize: 11, color: r.couleur, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  {isOpen ? '▲ Réduire' : '▼ Voir la recommandation'}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* ─── FOOTER ─── */}
      <motion.div variants={iv} style={{ textAlign: 'center', color: theme.muted, fontSize: 11.5, paddingBottom: 10, borderTop: `1px solid ${theme.border}`, paddingTop: 16 }}>
        © {new Date().getFullYear()} Transport Dakar — Analyse temporelle · EMD CETUD 2015 (ménages/déplacements, réel) · Trafic CETUD 2019 (comptages, réel) · Autres années simulées (PFE)
      </motion.div>
    </motion.div>
  );
}
