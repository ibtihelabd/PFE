import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme';
import { getSession, authFetch } from '../auth';
import {
  ArrowLeft, Smile, ShieldAlert, AlertTriangle, Bus, ThumbsUp, ThumbsDown,
  TrendingDown, Footprints, MessageSquareWarning, CheckCircle, MessageCircleHeart, Star,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';

const API = 'http://localhost:8000';
const cv = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.07 } } };
const iv = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 16 } } };

const CRITERE_LABELS = {
  prix: 'Prix abordable',
  proximite: 'Proximité arrêt',
  attente: "Temps d'attente",
  vitesse: 'Vitesse',
  confort_place: 'Confort / place',
  securite_accidents: 'Sécurité accidents',
};

const GENE_LABELS = {
  encombrement_trottoirs: 'Trottoirs encombrés',
  mauvais_etat_trottoirs: 'Trottoirs en mauvais état',
  inondations: 'Inondations (saison des pluies)',
  manque_eclairage: 'Manque éclairage nocturne',
  risque_accidents: "Risque d'accidents de la route",
  mauvaises_odeurs: 'Mauvaises odeurs / ordures',
  usage_passerelles: 'Usage des passerelles piétons',
};

const REC_CATEGORIES = {
  'Qualite de service':      { label: 'Qualité de service',      color: '#ffa94d', icon: Bus },
  'Securite':                { label: 'Sécurité',                color: '#ff6b6b', icon: ShieldAlert },
  'Inclusion sociale':       { label: 'Inclusion sociale',       color: '#74c0fc', icon: ThumbsDown },
  'Infrastructure pietonne': { label: 'Infrastructure piétonne', color: '#69db7c', icon: Footprints },
};
const REC_DEFAULT = { label: 'Recommandation', color: '#da77f2', icon: AlertTriangle };

// Pertinence des catégories de recommandation par rôle décideur (cf. auth.js)
// — les données restent communes, seul l'ordre/la mise en avant change.
const ROLE_PRIORITY = {
  planificateur: ['Infrastructure pietonne', 'Inclusion sociale', 'Qualite de service', 'Securite'],
  exploitation:  ['Securite', 'Qualite de service', 'Infrastructure pietonne', 'Inclusion sociale'],
};

const INSECURITE_GROUPS = [
  { label: 'À pied (quartier)', jour: 'pied_quartier_jour', nuit: 'pied_quartier_nuit' },
  { label: 'À pied (ailleurs)', jour: 'pied_ailleurs_jour', nuit: 'pied_ailleurs_nuit' },
  { label: 'Transport commun', jour: 'tc_jour', nuit: 'tc_nuit' },
  { label: 'Voiture', jour: 'voiture_jour', nuit: 'voiture_nuit' },
];

const INCIDENT_LABELS = {
  vol_argent_attente: "Vol d'argent (en attente)",
  vol_telephone_attente: 'Vol de téléphone (en attente)',
  agression_verbale_attente: 'Agression verbale (en attente)',
  agression_physique_attente: 'Agression physique (en attente)',
  harcelement_attente: 'Harcèlement (en attente)',
  vol_argent_abord: "Vol d'argent (à bord)",
  agression_verbale_abord: 'Agression verbale (à bord)',
  agression_physique_abord: 'Agression physique (à bord)',
  harcelement_abord: 'Harcèlement (à bord)',
};

function scoreColor(score) {
  if (score === null || score === undefined) return '#94a3b8';
  if (score >= 70) return '#69db7c';
  if (score >= 50) return '#ffd43b';
  if (score >= 35) return '#ffa94d';
  return '#ff6b6b';
}

function KpiCard({ icon: Icon, color, val, label, sub, theme }) {
  return (
    <div className="card-3d" style={{
      flex: 1, minWidth: 150,
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
  );
}

function SectionTitle({ children, theme }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: theme.muted, textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 16 }}>
      {children}
    </div>
  );
}

export default function SatisfactionPage() {
  const navigate = useNavigate();
  const { theme, isDark } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  const [selectedMode, setSelectedMode] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    authFetch(`${API}/api/satisfaction`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        setData(d);
        const firstMode = Object.keys(d.satisfaction_par_mode || {})[0];
        setSelectedMode(firstMode || null);
      })
      .catch(() => setErreur("API non disponible, ou satisfaction.json absent — exécuter satisfaction_ecoute_usagers.py puis relancer FastAPI."))
      .finally(() => setLoading(false));

    authFetch(`${API}/api/feedback/stats`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setFeedback)
      .catch(() => setFeedback(null));
  }, []);

  const chartGrid = isDark ? 'var(--dtk-panel)' : 'rgba(0,0,0,0.07)';
  const chartTick = isDark ? 'var(--dtk-muted)' : 'rgba(0,0,0,0.5)';
  const tooltipBg = isDark ? '#1a1d27' : theme.panelSolid;

  if (loading) return (
    <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}
        style={{ color: '#ffd43b', fontSize: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
        <Smile size={18} /> Chargement des indicateurs de satisfaction...
      </motion.div>
    </div>
  );

  const modesList = data ? Object.entries(data.satisfaction_par_mode || {}) : [];
  const barModesData = modesList.map(([mode, v]) => ({ mode, score: v.score_global, n: v.n }));

  // Recommandations : données communes aux 2 rôles décideurs, mais mises en
  // avant selon le périmètre du rôle connecté (cf. ROLE_PRIORITY).
  const session = getSession();
  const priorityOrder = ROLE_PRIORITY[session?.role] || null;
  const sortedRecommandations = (() => {
    const recs = data?.recommandations || [];
    if (!priorityOrder) return recs;
    return [...recs].sort((a, b) => {
      const catA = a && typeof a === 'object' ? a.categorie : null;
      const catB = b && typeof b === 'object' ? b.categorie : null;
      const idxA = priorityOrder.indexOf(catA);
      const idxB = priorityOrder.indexOf(catB);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    });
  })();

  const insecuriteChartData = data ? INSECURITE_GROUPS.map(g => ({
    label: g.label,
    Jour: data.insecurite_percue?.[g.jour] ?? 0,
    Nuit: data.insecurite_percue?.[g.nuit] ?? 0,
  })) : [];

  const radarData = (selectedMode && data?.satisfaction_par_mode?.[selectedMode])
    ? Object.entries(data.satisfaction_par_mode[selectedMode].criteres).map(([k, v]) => ({
        subject: CRITERE_LABELS[k] || k, A: v ?? 0,
      }))
    : [];

  const genesData = data ? Object.entries(data.genes_pietonnes || {})
    .map(([k, v]) => ({ label: GENE_LABELS[k] || k, val: v }))
    .sort((a, b) => (b.val ?? 0) - (a.val ?? 0)) : [];

  const incidentsData = data ? Object.entries(data.incidents_subis || {})
    .map(([k, v]) => ({ label: INCIDENT_LABELS[k] || k, val: v }))
    .sort((a, b) => (b.val ?? 0) - (a.val ?? 0)) : [];

  const difficultesData = data ? Object.entries(data.difficultes_deplacement || {}).slice(0, 7) : [];
  const maxDiff = difficultesData.length ? Math.max(...difficultesData.map(([, n]) => n)) : 1;

  return (
    <motion.div initial="hidden" animate="visible" variants={cv}
      className="dtk-page"
      style={{ minHeight: '100vh', background: theme.bg, fontFamily: 'Inter, sans-serif', color: theme.text, padding: '24px 32px' }}>

      <div style={{ position: 'fixed', top: '-10%', right: '-10%', width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,212,59,0.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* NAVBAR */}
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
            <Smile size={20} color="#ffd43b" />
            <span style={{ fontWeight: 700, fontSize: 15, color: theme.text }}>Satisfaction & Écoute usagers</span>
          </div>
        </div>
        <span style={{ fontSize: 11, color: theme.muted, border: `1px solid ${theme.border}`, borderRadius: 6, padding: '4px 10px' }}>
          EMD INDIVIDU · {data?.n_individus?.toLocaleString('fr-FR') || '—'} répondants
        </span>
      </motion.nav>

      <motion.div variants={iv} style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 6px', color: theme.text }}>
          Ce que les usagers <span style={{ color: '#ffd43b' }}>ressentent vraiment</span>
        </h1>
        <p style={{ fontSize: 13, color: theme.muted, margin: 0 }}>
          Cellule d'écoute basée sur l'enquête EMD individu : satisfaction par mode de TC, sentiment d'insécurité, freins à la mobilité.
        </p>
      </motion.div>

      {erreur && (
        <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 12, padding: 14, marginBottom: 20, color: '#ff6b6b', fontSize: 13 }}>
          ⚠️ {erreur}
        </div>
      )}

      {data && (
        <>
          {/* KPI STRIP */}
          <motion.div variants={iv} style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <KpiCard theme={theme} icon={Smile} color={scoreColor(data.score_satisfaction_global)}
              val={data.score_satisfaction_global != null ? `${data.score_satisfaction_global}/100` : '—'}
              label="Satisfaction globale réseau" sub="Moyenne pondérée tous modes" />
            <KpiCard theme={theme} icon={ShieldAlert} color="#ff6b6b"
              val={data.insecurite_tc_globale != null ? `${data.insecurite_tc_globale}%` : '—'}
              label="Craignent une agression en TC" sub="Moyenne jour / nuit" />
            <KpiCard theme={theme} icon={TrendingDown} color="#ffa94d"
              val={data.pct_activites_non_realisees != null ? `${data.pct_activites_non_realisees}%` : '—'}
              label="Activités non réalisées" sub="Faute de moyen de transport (7j)" />
            <KpiCard theme={theme} icon={Bus} color="#74c0fc"
              val={modesList.length} label="Modes de TC analysés" sub="Échantillon ≥ 15 répondants" />
          </motion.div>

          {/* AVIS CITOYENS EN DIRECT — cellule d'écoute publique /avis */}
          <motion.div variants={iv} style={{ marginBottom: 24 }}>
            <div className="card-3d" style={{
              background: theme.panelSolid, border: '1px solid rgba(255,212,59,0.22)',
              borderRadius: 14, padding: '20px 22px', boxShadow: theme.shadow,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <SectionTitle theme={theme}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageCircleHeart size={14} color="#ffd43b" /> Avis citoyens en direct (cellule d'écoute publique)
                  </span>
                </SectionTitle>
                <span style={{ fontSize: 10.5, color: theme.muted, border: `1px solid ${theme.border}`, borderRadius: 6, padding: '3px 9px' }}>
                  Flux ouvert · page /avis, sans connexion
                </span>
              </div>

              {!feedback || feedback.n_avis === 0 ? (
                <div style={{ fontSize: 12.5, color: theme.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
                  Aucun avis citoyen déposé pour le moment. Les retours soumis via la page publique « Donner mon avis » apparaîtront ici en temps réel.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(255,212,59,0.12)', border: '1px solid rgba(255,212,59,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Star size={20} color="#ffd43b" fill="#ffd43b" />
                    </div>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#ffd43b' }}>{feedback.note_moyenne}/5</div>
                      <div style={{ fontSize: 11.5, color: theme.muted }}>{feedback.n_avis} avis reçus</div>
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Problèmes signalés</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {Object.entries(feedback.par_probleme || {}).slice(0, 4).map(([p, n]) => (
                        <div key={p} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: theme.textSub }}>
                          <span>{p}</span><span style={{ fontWeight: 700, color: theme.text }}>{n}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: theme.muted, marginBottom: 6 }}>Derniers commentaires</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 110, overflowY: 'auto' }}>
                      {(feedback.derniers_avis || []).filter(a => a.commentaire).slice(0, 4).map(a => (
                        <div key={a.id} style={{ fontSize: 11.5, color: theme.textSub, lineHeight: 1.5 }}>
                          <span style={{ color: '#ffd43b', fontWeight: 700 }}>{'★'.repeat(a.note_satisfaction)}</span> — {a.commentaire}
                        </div>
                      ))}
                      {(feedback.derniers_avis || []).filter(a => a.commentaire).length === 0 && (
                        <span style={{ fontSize: 11.5, color: theme.muted }}>Aucun commentaire texte pour l'instant.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* SATISFACTION PAR MODE + RADAR */}
          <motion.div variants={iv} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card-3d" style={{ background: theme.panelSolid, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: theme.shadow }}>
              <SectionTitle theme={theme}>Score de satisfaction par mode de TC (cliquer pour le détail)</SectionTitle>
              <ResponsiveContainer width="100%" height={Math.max(220, barModesData.length * 34)}>
                <BarChart data={barModesData} layout="vertical" margin={{ left: 10, right: 20 }}>
                  <CartesianGrid stroke={chartGrid} horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fill: chartTick, fontSize: 11 }} />
                  <YAxis type="category" dataKey="mode" width={110} tick={{ fill: chartTick, fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{ background: tooltipBg, border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.text, fontSize: 12 }}
                    formatter={(v, n, p) => [`${v}/100`, `${p.payload.n} répondants`]}
                  />
                  <Bar dataKey="score" radius={[0, 6, 6, 0]} barSize={18}
                    onClick={(d) => setSelectedMode(d.mode)}
                    style={{ cursor: 'pointer' }}>
                    {barModesData.map((d, i) => (
                      <Cell key={i} fill={scoreColor(d.score)} opacity={selectedMode === d.mode ? 1 : 0.65} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card-3d" style={{ background: theme.panelSolid, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: theme.shadow }}>
              <SectionTitle theme={theme}>Détail des critères — {selectedMode || '—'}</SectionTitle>
              <ResponsiveContainer width="100%" height={230}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke={chartGrid} />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: chartTick, fontSize: 10.5 }} />
                  <Radar name={selectedMode} dataKey="A" stroke="#ffd43b" fill="#ffd43b" fillOpacity={0.18} strokeWidth={2} />
                </RadarChart>
              </ResponsiveContainer>
              {selectedMode && data.satisfaction_par_mode[selectedMode] && (
                <div style={{ marginTop: 6, fontSize: 11, color: theme.muted, textAlign: 'center' }}>
                  {data.satisfaction_par_mode[selectedMode].n} répondants · score global {data.satisfaction_par_mode[selectedMode].score_global}/100
                </div>
              )}
            </div>
          </motion.div>

          {/* INSÉCURITÉ JOUR/NUIT */}
          <motion.div variants={iv} style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card-3d" style={{ background: theme.panelSolid, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: theme.shadow }}>
              <SectionTitle theme={theme}>Sentiment d'insécurité (vol / agression) — jour vs nuit</SectionTitle>
              <ResponsiveContainer width="100%" height={230}>
                <BarChart data={insecuriteChartData} margin={{ left: -10 }}>
                  <CartesianGrid stroke={chartGrid} vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: chartTick, fontSize: 10.5 }} />
                  <YAxis tick={{ fill: chartTick, fontSize: 11 }} unit="%" />
                  <Tooltip contentStyle={{ background: tooltipBg, border: `1px solid ${theme.border}`, borderRadius: 8, color: theme.text, fontSize: 12 }} formatter={(v) => `${v}%`} />
                  <Bar dataKey="Jour" fill="#74c0fc" radius={[4, 4, 0, 0]} barSize={16} />
                  <Bar dataKey="Nuit" fill="#3b3f72" radius={[4, 4, 0, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: theme.muted }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: '#74c0fc', display: 'inline-block' }} /> Jour</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 9, height: 9, borderRadius: 3, background: '#3b3f72', display: 'inline-block' }} /> Nuit</span>
              </div>
            </div>

            <div className="card-3d" style={{ background: theme.panelSolid, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: theme.shadow }}>
              <SectionTitle theme={theme}>Incidents réellement subis (depuis 2014, autour des TC)</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7, maxHeight: 230, overflowY: 'auto' }}>
                {incidentsData.map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MessageSquareWarning size={12} color="#ff6b6b" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: theme.textSub, flex: 1 }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#ff6b6b', width: 40, textAlign: 'right' }}>{val != null ? `${val}%` : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* DIFFICULTÉS + GÊNES PIÉTONNES */}
          <motion.div variants={iv} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
            <div className="card-3d" style={{ background: theme.panelSolid, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: theme.shadow }}>
              <SectionTitle theme={theme}>Principales difficultés de déplacement citées</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {difficultesData.map(([label, n]) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: theme.textSub, marginBottom: 4 }}>
                      <span>{label}</span><span style={{ fontWeight: 700, color: theme.text }}>{n}</span>
                    </div>
                    <div style={{ background: theme.border, borderRadius: 999, height: 6 }}>
                      <div style={{ background: '#ffa94d', borderRadius: 999, height: 6, width: `${(n / maxDiff) * 100}%`, transition: 'width 0.8s ease' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-3d" style={{ background: theme.panelSolid, border: `1px solid ${theme.border}`, borderRadius: 14, padding: '20px 22px', boxShadow: theme.shadow }}>
              <SectionTitle theme={theme}>Gênes signalées par les piétons</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                {genesData.map(({ label, val }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Footprints size={12} color="#74c0fc" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: 11.5, color: theme.textSub, flex: 1 }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: theme.text, width: 40, textAlign: 'right' }}>{val != null ? `${val}%` : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* RECOMMANDATIONS — style aligné sur les cartes "Modules" de la vue générale */}
          <motion.div variants={iv} style={{ marginBottom: 24 }}>
            <SectionTitle theme={theme}>Recommandations pour les décideurs</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 12 }}>
              {sortedRecommandations.map((rec, i) => {
                const isObj = rec && typeof rec === 'object';
                const cat = isObj ? (REC_CATEGORIES[rec.categorie] || REC_DEFAULT) : REC_DEFAULT;
                const Icon = cat.icon;
                const texte = isObj ? rec.texte : rec;
                const isPriority = priorityOrder && isObj && priorityOrder.slice(0, 2).includes(rec.categorie);
                return (
                  <motion.div key={i}
                    whileHover={{ y: -4, scale: 1.01, transition: { duration: 0.15 } }}
                    style={{
                      background: theme.panelSolid,
                      border: `1px solid ${isPriority ? `${cat.color}55` : theme.border}`,
                      borderRadius: 14, padding: '18px 18px',
                      position: 'relative', overflow: 'hidden',
                      boxShadow: theme.shadow,
                    }}
                  >
                    {/* Glow coin supérieur droit */}
                    <div style={{ position: 'absolute', top: -25, right: -25, width: 90, height: 90, borderRadius: '50%', background: `radial-gradient(circle, ${cat.color}20 0%, transparent 70%)`, pointerEvents: 'none' }} />
                    {/* Barre de couleur en bas */}
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${cat.color}80, ${cat.color}20)`, borderRadius: '0 0 14px 14px' }} />

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${cat.color}18`, border: `1px solid ${cat.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px ${cat.color}20` }}>
                        <Icon size={18} color={cat.color} />
                      </div>
                      {isPriority && (
                        <span style={{ fontSize: 9.5, fontWeight: 700, color: cat.color, background: `${cat.color}12`, border: `1px solid ${cat.color}28`, borderRadius: 20, padding: '3px 9px' }}>
                          Pertinent pour votre rôle
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: theme.muted, marginBottom: 5, fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase' }}>
                      {cat.label}
                    </div>
                    <div style={{ fontSize: 12.5, color: theme.textSub, lineHeight: 1.6 }}>{texte}</div>
                  </motion.div>
                );
              })}
              {sortedRecommandations.length === 0 && (
                <div style={{ fontSize: 12.5, color: theme.muted, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircle size={14} color="#69db7c" /> Aucune alerte majeure détectée sur cet échantillon.
                </div>
              )}
            </div>
          </motion.div>

          <motion.div variants={iv} style={{ textAlign: 'center', color: theme.muted, fontSize: 12, paddingBottom: 10 }}>
            © {new Date().getFullYear()} Transport Dakar — Espace Décideurs · Cellule d'écoute usagers EMD CETUD
          </motion.div>
        </>
      )}
    </motion.div>
  );
}
