import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, ShieldAlert, Navigation, Info, ArrowLeft, RotateCcw, Wallet, Clock, Bus, AlertTriangle, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme';
import { authFetch } from '../auth';

const API_URL = "http://localhost:8000";

const QUARTIERS = {
    110401: "Colobane / Fass",
    110101: "Cite Bissap / Ouagou Niayes",
    110201: "Mermoz / Sacre Coeur",
    110302: "Camberene Centre",
    110501: "Castor / Dieuppeul",
    110603: "Fann / Point E / Amitie",
};

export default function SimulateurRisque() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [inputs, setInputs] = useState({
    distance_tc: 8.0,
    inondations: "Jamais",
    dur_sante: 20.0,
    dur_hopital: 35.0,
    dur_marche: 12.0,
    tc_disponibles: 3.0,
    revenu: 145000.0,
    budget_transport: 22000.0,
    taille_menage: 6,
    nb_actifs: 2,
    nb_voitures: 0,
    nb_motos: 0,
    nb_velos: 0,
    zone: "110401",
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);

  // Debounced API call for real-time predictions
  const runPrediction = useCallback(async (currentInputs) => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/predict-inaccessibility`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(currentInputs)
      });
      if (!res.ok) throw new Error("Erreur de calcul ML");
      const data = await res.json();
      setResult(data);
      setErreur(null);
    } catch (err) {
      setErreur("L'API FastAPI doit être lancée pour obtenir les calculs ML.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Trigger prediction on inputs change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      runPrediction(inputs);
    }, 250); // Debounce de 250ms

    return () => clearTimeout(delayDebounceFn);
  }, [inputs, runPrediction]);

  const handleChange = (name, val) => {
    setInputs(prev => ({ ...prev, [name]: val }));
  };

  const handleReset = () => {
    setInputs({
      distance_tc: 8.0,
      inondations: "Jamais",
      dur_sante: 20.0,
      dur_hopital: 35.0,
      dur_marche: 12.0,
      tc_disponibles: 3.0,
      revenu: 145000.0,
      budget_transport: 22000.0,
      taille_menage: 6,
      nb_actifs: 2,
      nb_voitures: 0,
      nb_motos: 0,
      nb_velos: 0,
      zone: "110401",
    });
  };

  const getGaugeColor = (prob) => {
    if (prob >= 65) return "#ff6b6b"; // Élevé
    if (prob >= 45) return "#ffa94d"; // Modéré
    return "#69db7c"; // Faible
  };

  const cVal = result ? result.prob_risque : 0;
  const strokeDashoffset = 339.292 - (339.292 * (cVal / 100));

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
      {/* glows background */}
      <div style={{ position: "fixed", top: "-10%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(105,219,124,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-10%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,192,252,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* HEADER NAVBAR */}
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
            <Cpu size={20} color="#69db7c" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Simulateur Interactif d'Inaccessibilité</span>
          </div>
        </div>
        <button onClick={handleReset} style={{
          background: "none", border: "none", color: "var(--dtk-muted)",
          cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 6, transition: "color 0.2s"
        }}
          onMouseEnter={e => e.currentTarget.style.color = "var(--dtk-text)"}
          onMouseLeave={e => e.currentTarget.style.color = "var(--dtk-muted)"}
        >
          <RotateCcw size={14} /> Réinitialiser
        </button>
      </nav>

      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        
        {/* Title */}
        <div style={{ marginBottom: 26 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>
            Calculateur Prédictif <span style={{ color: "#69db7c" }}>en Temps Réel</span>
          </h1>
          <p style={{ fontSize: 13, color: "var(--dtk-muted)", margin: 0 }}>
            Déplacez les curseurs du ménage ou de la zone pour voir le modèle XGBoost classifier le risque d'isolement instantanément.
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

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 24, alignItems: "start" }}>
          
          {/* LEFT COLUMN: SLIDERS & CONTROLS */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            
            {/* CARD 1: INFRASTRUCTURES & ZONE */}
            <div style={{
              background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
              borderRadius: 16, padding: "20px 22px", backdropFilter: "blur(10px)"
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#74c0fc", display: "flex", alignItems: "center", gap: 8 }}>
                <Bus size={16} /> Infrastructures & Localisation
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                {/* Zone Select */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--dtk-muted)" }}>Strate / Zone d'habitation</label>
                  <select 
                    value={inputs.zone} 
                    onChange={e => handleChange('zone', e.target.value)}
                    style={{
                      padding: "10px 12px", borderRadius: 8, background: "var(--dtk-panel)",
                      border: "1px solid var(--dtk-border)", color: "var(--dtk-text)", outline: "none", cursor: "pointer"
                    }}
                  >
                    {Object.entries(QUARTIERS).map(([code, name]) => (
                      <option key={code} value={code} style={{ background: "#1a1f2e" }}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Inondabilité Select */}
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <label style={{ fontSize: 12, color: "var(--dtk-muted)" }}>Fréquence des inondations</label>
                  <select 
                    value={inputs.inondations} 
                    onChange={e => handleChange('inondations', e.target.value)}
                    style={{
                      padding: "10px 12px", borderRadius: 8, background: "var(--dtk-panel)",
                      border: "1px solid var(--dtk-border)", color: "var(--dtk-text)", outline: "none", cursor: "pointer"
                    }}
                  >
                    {["Jamais", "Rarement", "Souvent", "Tous les jours ou presque"].map(opt => (
                      <option key={opt} value={opt} style={{ background: "#1a1f2e" }}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ height: "0.5px", background: "var(--dtk-panel)", margin: "20px 0 16px" }} />

              {/* Sliders Distance and Transport available */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: "var(--dtk-sub)" }}>Distance à pied jusqu'à l'arrêt TC le plus proche</span>
                    <span style={{ fontWeight: 700, color: "#74c0fc" }}>{inputs.distance_tc} min</span>
                  </div>
                  <input 
                    type="range" min="0" max="45" step="0.5" 
                    value={inputs.distance_tc} 
                    onChange={e => handleChange('distance_tc', parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#74c0fc", cursor: "pointer" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: "var(--dtk-sub)" }}>Nombre de lignes TC disponibles (Normal)</span>
                    <span style={{ fontWeight: 700, color: "#74c0fc" }}>{inputs.tc_disponibles} lignes</span>
                  </div>
                  <input 
                    type="range" min="0" max="8" step="1" 
                    value={inputs.tc_disponibles} 
                    onChange={e => handleChange('tc_disponibles', parseInt(e.target.value))}
                    style={{ width: "100%", accentColor: "#74c0fc", cursor: "pointer" }}
                  />
                </div>
              </div>

            </div>

            {/* CARD 2: DURÉE ACCÈS AUX SERVICES */}
            <div style={{
              background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
              borderRadius: 16, padding: "20px 22px", backdropFilter: "blur(10px)"
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#69db7c", display: "flex", alignItems: "center", gap: 8 }}>
                <Clock size={16} /> Temps de trajet vers les services de base (min)
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: "var(--dtk-sub)" }}>Centre de santé le plus proche</span>
                    <span style={{ fontWeight: 700, color: "#69db7c" }}>{inputs.dur_sante} min</span>
                  </div>
                  <input 
                    type="range" min="2" max="90" step="1" 
                    value={inputs.dur_sante} 
                    onChange={e => handleChange('dur_sante', parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#69db7c", cursor: "pointer" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: "var(--dtk-sub)" }}>Hôpital général</span>
                    <span style={{ fontWeight: 700, color: "#69db7c" }}>{inputs.dur_hopital} min</span>
                  </div>
                  <input 
                    type="range" min="5" max="150" step="1" 
                    value={inputs.dur_hopital} 
                    onChange={e => handleChange('dur_hopital', parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#69db7c", cursor: "pointer" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: "var(--dtk-sub)" }}>Marché ou commerce de gros</span>
                    <span style={{ fontWeight: 700, color: "#69db7c" }}>{inputs.dur_marche} min</span>
                  </div>
                  <input 
                    type="range" min="2" max="60" step="1" 
                    value={inputs.dur_marche} 
                    onChange={e => handleChange('dur_marche', parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#69db7c", cursor: "pointer" }}
                  />
                </div>
              </div>
            </div>

            {/* CARD 3: PARAMÈTRES SOCIO-ÉCONOMIQUES & VEHICULES */}
            <div style={{
              background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
              borderRadius: 16, padding: "20px 22px", backdropFilter: "blur(10px)"
            }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#ffa94d", display: "flex", alignItems: "center", gap: 8 }}>
                <Wallet size={16} /> Budget & Ressources du ménage
              </h3>
              
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: "var(--dtk-sub)" }}>Revenu mensuel</span>
                    <span style={{ fontWeight: 700, color: "#ffa94d" }}>{inputs.revenu.toLocaleString("fr")} F</span>
                  </div>
                  <input 
                    type="range" min="20000" max="600000" step="5000" 
                    value={inputs.revenu} 
                    onChange={e => handleChange('revenu', parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#ffa94d", cursor: "pointer" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 12 }}>
                    <span style={{ color: "var(--dtk-sub)" }}>Dépenses de transport</span>
                    <span style={{ fontWeight: 700, color: "#ffa94d" }}>{inputs.budget_transport.toLocaleString("fr")} F</span>
                  </div>
                  <input 
                    type="range" min="0" max="100000" step="1000" 
                    value={inputs.budget_transport} 
                    onChange={e => handleChange('budget_transport', parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#ffa94d", cursor: "pointer" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 10, marginTop: 10 }}>
                {/* Household size */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 10, color: "var(--dtk-muted)" }}>Ménage (nb)</label>
                  <input 
                    type="number" min="1" max="30" 
                    value={inputs.taille_menage} 
                    onChange={e => handleChange('taille_menage', parseInt(e.target.value) || 1)}
                    style={{ padding: 8, borderRadius: 6, background: "var(--dtk-panel)", border: "1px solid var(--dtk-border)", color: "var(--dtk-text)", textAlign: "center" }}
                  />
                </div>
                {/* Actives count */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 10, color: "var(--dtk-muted)" }}>Actifs (nb)</label>
                  <input 
                    type="number" min="0" max="20" 
                    value={inputs.nb_actifs} 
                    onChange={e => handleChange('nb_actifs', parseInt(e.target.value) || 0)}
                    style={{ padding: 8, borderRadius: 6, background: "var(--dtk-panel)", border: "1px solid var(--dtk-border)", color: "var(--dtk-text)", textAlign: "center" }}
                  />
                </div>
                {/* Cars count */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 10, color: "var(--dtk-muted)" }}>Voitures (nb)</label>
                  <input 
                    type="number" min="0" max="5" 
                    value={inputs.nb_voitures} 
                    onChange={e => handleChange('nb_voitures', parseInt(e.target.value) || 0)}
                    style={{ padding: 8, borderRadius: 6, background: "var(--dtk-panel)", border: "1px solid var(--dtk-border)", color: "var(--dtk-text)", textAlign: "center" }}
                  />
                </div>
                {/* Motos count */}
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <label style={{ fontSize: 10, color: "var(--dtk-muted)" }}>Motos (nb)</label>
                  <input 
                    type="number" min="0" max="5" 
                    value={inputs.nb_motos} 
                    onChange={e => handleChange('nb_motos', parseInt(e.target.value) || 0)}
                    style={{ padding: 8, borderRadius: 6, background: "var(--dtk-panel)", border: "1px solid var(--dtk-border)", color: "var(--dtk-text)", textAlign: "center" }}
                  />
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: GAUGE & LIVE RESULT CARD */}
          <div style={{ position: "sticky", top: 90, display: "flex", flexDirection: "column", gap: 20 }}>
            
            {/* PREMIUM RESULT GAUGE */}
            <div className="card-3d" style={{
              background: theme.panelSolid, border: `1px solid ${theme.border}`,
              borderRadius: 16, padding: "30px 24px", display: "flex", flexDirection: "column",
              alignItems: "center", textAlign: "center", boxShadow: theme.shadow,
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "1px", color: "var(--dtk-muted)", textTransform: "uppercase", marginBottom: 20 }}>
                Indice d'inaccessibilité prédit
              </span>

              {/* SVG Circular progress */}
              <div style={{ position: "relative", width: 160, height: 160, marginBottom: 18 }}>
                <svg width="160" height="160" viewBox="0 0 120 120" style={{ transform: "rotate(-90deg)" }}>
                  {/* bg circle */}
                  <circle 
                    cx="60" cy="60" r="54" 
                    fill="transparent" stroke="var(--dtk-panel)" strokeWidth="8" 
                  />
                  {/* progress fill */}
                  <motion.circle 
                    cx="60" cy="60" r="54" 
                    fill="transparent" 
                    stroke={getGaugeColor(cVal)} 
                    strokeWidth="8"
                    strokeDasharray="339.292"
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    animate={{ strokeDashoffset }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </svg>
                <div style={{
                  position: "absolute", inset: 0, display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center"
                }}>
                  <span style={{ fontSize: 34, fontWeight: 800, color: getGaugeColor(cVal), letterSpacing: "-1px" }}>
                    {cVal.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 10, color: "var(--dtk-muted)", textTransform: "uppercase", fontWeight: 700 }}>
                    probabilité
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div style={{ marginBottom: 24 }}>
                <span style={{
                  background: `${getGaugeColor(cVal)}15`, color: getGaugeColor(cVal),
                  border: `1px solid ${getGaugeColor(cVal)}35`, borderRadius: 20,
                  padding: "4px 15px", fontSize: 13, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px"
                }}>
                  Risque {result ? result.niveau_risk || result.niveau_risque : "FAIBLE"}
                </span>
              </div>

              {/* API Status Shimmer */}
              <div style={{ height: 16, display: "flex", alignItems: "center", gap: 6 }}>
                {loading ? (
                  <motion.div 
                    animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }}
                    style={{ fontSize: 11, color: "var(--dtk-muted)", fontStyle: "italic" }}
                  >
                    🧠 recalcul en cours par le modèle...
                  </motion.div>
                ) : (
                  <span style={{ fontSize: 11, color: "rgba(105,219,124,0.6)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#69db7c" }} /> modèle ML synchronisé
                  </span>
                )}
              </div>
            </div>

            {/* RECOMMENDATIONS CARD */}
            <div className="card-3d" style={{
              background: theme.panelSolid, border: `1px solid ${theme.border}`,
              borderRadius: 16, padding: "20px 22px", boxShadow: theme.shadow,
            }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, margin: "0 0 12px", textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--dtk-muted)" }}>
                💡 Diagnostic & Conseils du Modèle
              </h3>
              
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {result && result.conseils && result.conseils.map((c, i) => (
                  <div key={i} style={{ 
                    display: "flex", gap: 10, alignItems: "flex-start", 
                    fontSize: 12.5, lineHeight: 1.5, color: "var(--dtk-sub)" 
                  }}>
                    <span style={{ color: getGaugeColor(cVal), flexShrink: 0, marginTop: 2 }}>
                      {inputs.distance_tc > 15 || inputs.tc_disponibles < 2 ? "⚠️" : "ℹ️"}
                    </span>
                    <span>{c}</span>
                  </div>
                ))}
                
                {(!result || !result.conseils || result.conseils.length === 0) && (
                  <div style={{ fontSize: 12.5, color: "var(--dtk-muted)", fontStyle: "italic" }}>
                    Ajustez les curseurs à gauche pour mettre à jour le diagnostic.
                  </div>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* FOOTER */}
        <div style={{ textAlign: "center", color: "var(--dtk-vmuted)", fontSize: 12, marginTop: 40, paddingBottom: 10 }}>
          © {new Date().getFullYear()} Transport Dakar — Espace Décideurs · Modèle prédictif XGBoost d'accessibilité
        </div>

      </div>
    </motion.div>
  );
}
