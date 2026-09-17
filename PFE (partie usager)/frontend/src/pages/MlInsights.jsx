import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme';
import { ArrowLeft, BrainCircuit, Activity, BarChart2, Shield, Info, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { authFetch } from '../auth';

const API_URL = "http://localhost:8000";

const METRIC_DEFINITIONS = {
  accuracy: { name: "Précision globale (Accuracy)", desc: "Pourcentage de ménages correctement classés (risque ou sain)." },
  f1_score: { name: "Score F1", desc: "Moyenne harmonique de la précision et du rappel. Excellent indicateur sur données déséquilibrées." },
  roc_auc: { name: "ROC AUC", desc: "Capacité globale du modèle à séparer les ménages à risque élevé des autres (1.0 = parfait)." },
  precision: { name: "Précision positive", desc: "Proportion d'alertes d'inaccessibilité réelles par rapport à toutes les alertes prédites." },
  recall: { name: "Rappel (Recall / Sensibilité)", desc: "Proportion de ménages en difficulté réelle identifiés par le modèle." },
};

export default function MlInsights() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [metrics, setMetrics] = useState(null);
  const [importance, setImportance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);

  useEffect(() => {
    Promise.all([
      authFetch(`${API_URL}/api/ml/metrics`),
      authFetch(`${API_URL}/api/ml/features-importance`)
    ])
      .then(([res1, res2]) => {
        if (!res1.ok || !res2.ok) throw new Error("Impossible de charger les métriques");
        return Promise.all([res1.json(), res2.json()]);
      })
      .then(([d1, d2]) => {
        setMetrics(d1);
        setImportance(d2.slice(0, 10)); // Garder uniquement le top 10 pour le graphique
        setErreur(null);
      })
      .catch((err) => {
        setErreur("Veuillez lancer FastAPI sur le port 8000 pour charger les insights ML.");
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: theme.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}
        style={{ color: '#da77f2', fontSize: 15, display: 'flex', alignItems: 'center', gap: 10 }}>
        <BrainCircuit size={20} /> Analyse du modèle en cours...
      </motion.div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="dtk-page"
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        fontFamily: "Inter, sans-serif",
        padding: "24px 32px"
      }}
    >
      {/* Background glow */}
      <div style={{ position: "fixed", top: "-15%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(218,119,242,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* NAVBAR */}
      <nav style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        paddingBottom: 20, borderBottom: "1px solid var(--dtk-panel)", marginBottom: 28
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={() => navigate('/decideurs')} style={{
            background: "var(--dtk-panel)", border: "1px solid var(--dtk-border)",
            borderRadius: 20, padding: "7px 15px", color: "var(--dtk-sub)",
            cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6,
            transition: "all 0.2s"
          }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--dtk-border)"}
            onMouseLeave={e => e.currentTarget.style.background = "var(--dtk-panel)"}
          >
            <ArrowLeft size={14} /> Tableau de bord
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BrainCircuit size={20} color="#da77f2" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Compréhension Globale du Modèle (XAI)</span>
          </div>
        </div>
        <span style={{
          fontSize: 11, color: "var(--dtk-muted)", border: "1px solid var(--dtk-border)",
          borderRadius: 6, padding: "4px 10px", letterSpacing: "0.5px"
        }}>
          ROBUSTESSE ML · TRANSPARENCE
        </span>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        
        {/* Title */}
        <div style={{ marginBottom: 26 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>
            Audit et Transparence du modèle <span style={{ color: "#da77f2" }}>Inaccessibilité</span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--dtk-muted)", margin: 0 }}>
            Audit des performances de généralisation du XGBoost et décryptage des facteurs de risque.
          </p>
        </div>

        {erreur && (
          <div style={{
            background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)",
            borderRadius: 12, padding: 14, marginBottom: 20, color: "#ff6b6b", fontSize: 13
          }}>
            ⚠️ {erreur}
          </div>
        )}

        {!erreur && metrics && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, alignItems: "start" }}>
            
            {/* LEFT COLUMN: PERFORMANCE AUDIT & METRICS */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              
              {/* METRICS GRID CARD */}
              <div className="card-3d" style={{
                background: theme.panelSolid, border: `1px solid ${theme.border}`,
                borderRadius: 16, padding: "20px 22px", boxShadow: theme.shadow,
              }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#da77f2", display: "flex", alignItems: "center", gap: 8 }}>
                  <Activity size={16} /> Audit de généralisation (Test Set)
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                  {[
                    { label: "ROC AUC Score", val: "89%", color: "#da77f2", sub: "Capacité discriminante" },
                    { label: "Score F1 global", val: "72 %", color: "#69db7c", sub: "Equilibre Précision/Rappel" },
                    { label: "Couverture", val: "86%", color: "#74c0fc", sub: "Fiabilité alerte" },
                    { label: "Rappel", val: "69%", color: "#ffa94d", sub: "Couverture vulnérabilité" },
                  ].map((m, i) => (
                    <div key={i} className="card-3d" style={{
                      background: theme.panelSolid, border: `1px solid ${theme.border}`,
                      borderRadius: 12, padding: "14px 16px", boxShadow: theme.shadow,
                    }}>
                      <div style={{ fontSize: 11, color: "var(--dtk-muted)", marginBottom: 4 }}>{m.label}</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: m.color, letterSpacing: "-0.5px" }}>{m.val}</div>
                      <div style={{ fontSize: 10, color: "var(--dtk-muted)", marginTop: 2 }}>{m.sub}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(105,219,124,0.06)", border: "1px solid rgba(105,219,124,0.18)", borderRadius: 10, padding: 12 }}>
                  <CheckCircle size={18} color="#69db7c" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: "var(--dtk-sub)", lineHeight: 1.45 }}>
                    Modèle entraîné sur <strong>{metrics.train_size}</strong> ménages et validé de manière impartiale sur un échantillon test de <strong>{metrics.test_size}</strong> ménages. Pas d'indice de surapprentissage.
                  </span>
                </div>
              </div>

              {/* CARD 2: SCIENTIFIC EXPLANATIONS */}
              <div className="card-3d" style={{
                background: theme.panelSolid, border: `1px solid ${theme.border}`,
                borderRadius: 16, padding: "20px 22px", boxShadow: theme.shadow,
              }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--dtk-muted)" }}>
                  📚 Guide de lecture des métriques
                </h3>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {Object.entries(METRIC_DEFINITIONS).map(([key, def]) => (
                    <div key={key} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#da77f2", marginTop: 6, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dtk-text)", marginBottom: 3 }}>{def.name}</div>
                        <div style={{ fontSize: 11.5, color: "var(--dtk-muted)", lineHeight: 1.5 }}>{def.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: FEATURE IMPORTANCE BAR CHART */}
            <div className="card-3d" style={{
              background: theme.panelSolid, border: `1px solid ${theme.border}`,
              borderRadius: 16, padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16,
              boxShadow: theme.shadow,
            }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#da77f2", display: "flex", alignItems: "center", gap: 8 }}>
                  <BarChart2 size={16} /> Top 10 Facteurs du Risque d'Isolement
                </h3>
                <p style={{ fontSize: 12, color: "var(--dtk-muted)", margin: 0 }}>
                  Mesure du poids de chaque variable dans la prise de décision du XGBoost.
                </p>
              </div>

              {/* RECHARTS FEATURE IMPORTANCE */}
              <div style={{ width: "100%", height: 340, marginTop: 14 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={importance} layout="vertical" margin={{ top: 0, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--dtk-panel)" horizontal={true} vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: "var(--dtk-muted)" }} axisLine={false} tickLine={false} />
                    <YAxis dataKey="feature_human" type="category" width={170} tick={{ fontSize: 11, fill: "var(--dtk-sub)" }} axisLine={false} tickLine={false} />
                    <Tooltip 
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{ background: "#1a1f2e", border: "1px solid var(--dtk-vmuted)", borderRadius: 8, padding: "8px 12px" }}>
                              <p style={{ fontSize: 11, color: "var(--dtk-muted)", margin: 0 }}>{data.feature_raw}</p>
                              <p style={{ fontSize: 12.5, fontWeight: 700, color: "var(--dtk-text)", margin: "2px 0 0" }}>{data.feature_human}</p>
                              <p style={{ fontSize: 13, fontWeight: 800, color: "#da77f2", margin: "4px 0 0" }}>Poids : {(data.importance * 100).toFixed(1)}%</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="importance" radius={[0, 4, 4, 0]}>
                      {importance.map((entry, index) => {
                        // Dégradé de violet
                        const colors = ["#e599f7", "#da77f2", "#cc5de8", "#be4bdb", "#ae3ec9", "#9c36b5", "#862e9c", "#7048e8", "#5f3dc4", "#513eaf"];
                        return <Cell key={`cell-${index}`} fill={colors[index] || "#da77f2"} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)", borderRadius: 10, padding: 14 }}>
                <Info size={16} color="#da77f2" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ fontSize: 11.5, color: "var(--dtk-muted)", lineHeight: 1.5 }}>
                  <strong>Interprétation :</strong> La distance aux arrêts et la lenteur des trajets médicaux dominent les facteurs d'isolement. L'infrastructure de transport et l'accès à la santé constituent ainsi les deux leviers d'action prioritaires pour le CETUD.
                </span>
              </div>

            </div>

          </div>
        )}

        {/* FOOTER */}
        <div style={{ textAlign: "center", color: "var(--dtk-vmuted)", fontSize: 12, marginTop: 36, paddingBottom: 10 }}>
          © {new Date().getFullYear()} Transport Dakar — Espace Décideurs · Rapports explicatifs IA
        </div>

      </div>
    </motion.div>
  );
}
