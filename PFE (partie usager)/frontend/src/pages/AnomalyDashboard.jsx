import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { BusFront, ArrowLeft, AlertTriangle, MapPin, Activity, CheckCircle, Clock, TrendingUp, Search, Info, BarChart2, Calendar, ShieldCheck, Map, List } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import ExportPDF from '../components/ExportPDF';
import MapView from '../components/MapView';
import { useTheme } from '../theme';
import { authFetch, getSession } from '../auth';

const API = "http://localhost:8000";

const itemVariants = {
  hidden:  { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100, damping: 15 } }
};
const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
  exit:    { opacity: 0, x: -50, transition: { duration: 0.25 } }
};

export default function AnomalyDashboard() {
  const navigate = useNavigate();
  
  // Dashboard states
  const [summary, setSummary] = useState(null);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(null);
  
  // Search and filter
  const [search, setSearch] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("critique");
  
  // Pagination
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 8;
  
  // Selected site for drilldown
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [siteDetails, setSiteDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Recommendation view mode
  const [tab, setTab] = useState(() => {
    const session = getSession();
    return session?.role === "planificateur" ? "planification" : "exploitation";
  });
  const { theme } = useTheme();
  const [viewMode, setViewMode] = useState("liste"); // "liste" | "carte"

  // Initial loading
  useEffect(() => {
    Promise.all([
      authFetch(`${API}/api/anomalies/summary`),
      authFetch(`${API}/api/anomalies/sites`)
    ])
      .then(([res1, res2]) => {
        if (!res1.ok || !res2.ok) throw new Error("Erreur de communication API");
        return Promise.all([res1.json(), res2.json()]);
      })
      .then(([sumData, sitesData]) => {
        setSummary(sumData);
        setSites(sitesData);
        setErreur(null);
      })
      .catch((err) => {
        setErreur("Le serveur FastAPI doit tourner sur le port 8000 pour charger le dashboard.");
      })
      .finally(() => setLoading(false));
  }, []);

  // Fetch site details when selected
  useEffect(() => {
    if (!selectedSiteId) {
      setSiteDetails(null);
      return;
    }
    
    setDetailsLoading(true);
    authFetch(`${API}/api/anomalies/sites/${selectedSiteId}/details`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        setSiteDetails(data);
      })
      .catch(() => {
        setErreur("Impossible de charger le détail du site.");
      })
      .finally(() => setDetailsLoading(false));
  }, [selectedSiteId]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: theme.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }}
        style={{ color: "#74c0fc", fontSize: 16, display: "flex", alignItems: "center", gap: 10 }}>
        <Activity size={20} /> Initialisation du dashboard trafic...
      </motion.div>
    </div>
  );

  // Helper for status styling
  const getStatusConfig = (status) => {
    if (status === "CRITIQUE") return { color: "#ff6b6b", bg: "rgba(255,107,107,0.18)", border: "rgba(255,107,107,0.50)" };
    if (status === "ÉLEVÉ")   return { color: "#ffa94d", bg: "rgba(255,169,77,0.18)",  border: "rgba(255,169,77,0.50)"  };
    return                        { color: "#74c0fc", bg: "rgba(116,192,252,0.18)", border: "rgba(116,192,252,0.50)" };
  };

  // Filter sites based on search and dropdown filter
  const filteredSites = sites.filter(s => {
    const matchesSearch = s.nom.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filterSeverity === "all" || 
      (filterSeverity === "critique" && s.status === "CRITIQUE") ||
      (filterSeverity === "eleve" && s.status === "ÉLEVÉ") ||
      (filterSeverity === "modere" && s.status === "MODÉRÉ");
    return matchesSearch && matchesFilter;
  });

  const totalPages = Math.max(1, Math.ceil(filteredSites.length / PAGE_SIZE));
  const paginatedSites = filteredSites.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange = (val) => { setSearch(val); setPage(1); };
  const handleFilterChange = (val) => { setFilterSeverity(val); setPage(1); };

  const overallHourData = summary ? Object.entries(summary.by_hour)
    .map(([h, v]) => ({ heure: `${h}h`, count: v }))
    .sort((a, b) => parseInt(a.heure) - parseInt(b.heure)) : [];

  const recommendations = {
    exploitation: [
      {
        type: "INTERVENTION IMMÉDIATE", icon: "🚨",
        color: "#ff6b6b", bg: "rgba(255,107,107,0.1)", border: "rgba(255,107,107,0.25)",
        title: "Régulation d'urgence — Corniche Est & Gibraltar",
        text: "Déployer des agents régulateurs sur la Corniche Est et l'Autoroute Gibraltar dès la prochaine heure de pointe (7h–9h / 17h–19h). Ces deux axes concentrent le plus grand nombre d'anomalies CRITIQUES confirmées par au moins 2 algorithmes."
      },
      {
        type: "SURVEILLANCE RENFORCÉE", icon: "👁️",
        color: "#ffa94d", bg: "rgba(255,169,77,0.1)", border: "rgba(255,169,77,0.25)",
        title: "Point chaud — Aéroport / RN1 Cambérène",
        text: "Pic atypique de deux-roues et minibus détecté sur le croisement Cambérène–Aéroport. Mettre en place une observation terrain et vérifier l'état de la signalisation aux carrefours concernés."
      },
      {
        type: "DÉLESTAGE TRAFIC", icon: "🛣️",
        color: "#da77f2", bg: "rgba(218,119,242,0.1)", border: "rgba(218,119,242,0.25)",
        title: "Réorientation des flux — Port & Bel Air",
        text: "Les axes Port/Corniche Ouest et Bel Air enregistrent des saturations récurrentes de poids lourds. Activer les itinéraires de délestage secondaires et communiquer les déviations aux transporteurs via la radio SENBUS."
      },
      {
        type: "RAPPORT D'EXPLOITATION", icon: "📋",
        color: "#74c0fc", bg: "rgba(116,192,252,0.1)", border: "rgba(116,192,252,0.25)",
        title: "Synthèse de service à transmettre",
        text: `${summary ? summary.sites_at_risk : '--'} points du réseau sont en situation anormale. Générer le rapport d'exploitation PDF et le transmettre au Directeur de Planification avant 20h pour décision de déploiement supplémentaire.`
      },
    ],
    planification: [
      {
        type: "SATURATION STRUCTURELLE", icon: "🚧",
        color: "#ff6b6b", bg: "rgba(255,107,107,0.1)", border: "rgba(255,107,107,0.25)",
        title: "Délestage poids lourds — Corniche Ouest",
        text: "Les axes menant au port (Corniche Ouest, Bel Air) saturent de manière structurelle. Planifier un schéma de contournement des poids lourds et inscrire l'élargissement de la voirie dans le Programme de Modernisation des Transports."
      },
      {
        type: "ANALYSE ML", icon: "🤖",
        color: "#69db7c", bg: "rgba(105,219,124,0.1)", border: "rgba(105,219,124,0.25)",
        title: "Fiabilité consensus 90.6% — Données exploitables",
        text: "L'accord de 90.6% entre Isolation Forest et LOF valide scientifiquement les données d'anomalies. Ces données peuvent servir de base aux études de capacité routière et aux projets d'extension du réseau TC."
      },
      {
        type: "PLANIFICATION HORAIRE", icon: "⏱️",
        color: "#ffa94d", bg: "rgba(255,169,77,0.1)", border: "rgba(255,169,77,0.25)",
        title: "Révision des fréquences TC aux heures de pointe",
        text: "Les pics d'anomalies à 7h–9h et 17h–19h suggèrent une inadéquation entre l'offre TC et la demande. Planifier une révision des fréquences DDD/Tata sur les axes saturés pour la prochaine grille horaire semestrielle."
      },
    ],
  };

  return (
    <motion.div
      initial="hidden" animate="visible" exit="exit"
      variants={containerVariants}
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
      <div style={{ position: "fixed", top: "-10%", left: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(116,192,252,0.04) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "fixed", bottom: "-10%", right: "-10%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,107,0.03) 0%, transparent 70%)", pointerEvents: "none" }} />

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
            <ArrowLeft size={14} /> Accueil
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle size={20} color="#74c0fc" />
            <span style={{ fontWeight: 700, fontSize: 15 }}>Détection des Anomalies de Trafic</span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!loading && summary && (
            <ExportPDF type="anomalies" label="Exporter PDF" data={summary} />
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 1300, margin: "0 auto" }}>
        
        {/* Title */}
        <div style={{ marginBottom: 26, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 6px" }}>
              Détection Multi-Modèles sur le Réseau de Dakar
            </h1>
            <p style={{ fontSize: 13, color: "var(--dtk-muted)", margin: 0 }}>
              Analyse par Isolation Forest, LOF, et Z-Score — Les anomalies affichées requièrent un consensus minimal de 2 modèles sur 3.
            </p>
          </div>
          {selectedSiteId && (
            <button 
              onClick={() => setSelectedSiteId(null)} 
              style={{
                background: "rgba(116,192,252,0.12)", border: "1px solid rgba(116,192,252,0.25)",
                color: "#74c0fc", padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer"
              }}
            >
              ← Voir la synthèse globale
            </button>
          )}
        </div>

        {erreur && (
          <div style={{
            background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.25)",
            borderRadius: 12, padding: 14, marginBottom: 20, color: "#ff6b6b", fontSize: 13
          }}>
            ⚠️ {erreur}
          </div>
        )}

        {/* KPIs ROW */}
        {summary && !selectedSiteId && (
          <motion.div variants={itemVariants} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            {[
              { label: "Observations analysées", val: summary.total.toLocaleString("fr"), sub: "49 sites routiers majeurs", color: "#74c0fc", icon: Activity },
              { label: "Anomalies confirmées", val: summary.anomalies.toLocaleString("fr"), sub: `${((summary.anomalies / summary.total) * 100).toFixed(1)}% du trafic total`, color: "#ff6b6b", icon: AlertTriangle },
              { label: "Points du réseau à risque", val: `${summary.sites_at_risk} / 49`, sub: "Axe à congestion atypique", color: "#ffa94d", icon: MapPin },
              { label: "Accord IF ↔ LOF ↔ Z", val: "90.6%", sub: "Fiabilité optimale du consensus", color: "#69db7c", icon: CheckCircle },
            ].map((k, i) => {
              const Icon = k.icon;
              return (
                <div key={i} className="card-3d" style={{
                  background: theme.panelSolid, border: `1px solid ${theme.border}`,
                  borderRadius: 14, padding: "16px 20px", display: "flex", flexDirection: "column", gap: 5,
                  boxShadow: theme.shadow,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--dtk-muted)", fontSize: 11.5 }}>
                    <Icon size={14} color={k.color} /> {k.label}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: k.color, letterSpacing: "-0.5px", marginTop: 4 }}>{k.val}</div>
                  <div style={{ fontSize: 10.5, color: "var(--dtk-muted)" }}>{k.sub}</div>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* ── TWO COLUMN MAIN PANEL ── */}
        {/* ── TOGGLE VUE + CARTE ── */}
        {!selectedSiteId && (
          <motion.div variants={itemVariants} style={{ marginBottom: 20 }}>
            {/* Barre toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: viewMode === "carte" ? 14 : 0 }}>
              <div style={{ display: "flex", gap: 4, background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)", borderRadius: 20, padding: 4 }}>
                {[
                  { id: "liste", icon: List,  label: "Vue tableau" },
                  { id: "carte", icon: Map,   label: "Carte réseau" },
                ].map(({ id, icon: Icon, label }) => (
                  <button key={id} onClick={() => setViewMode(id)} style={{
                    display: "flex", alignItems: "center", gap: 6,
                    height: 30, padding: "0 14px", borderRadius: 16, border: "none",
                    cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.2s",
                    background: viewMode === id ? "rgba(116,192,252,0.2)" : "transparent",
                    color: viewMode === id ? "#74c0fc" : "var(--dtk-muted)",
                  }}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
              {viewMode === "carte" && (
                <span style={{ fontSize: 12, color: "var(--dtk-muted)" }}>
                  {sites.length} sites affichés · {sites.filter(s => s.anom_counts > 0).length} avec anomalies
                </span>
              )}
            </div>

            {/* ── CARTE LEAFLET ── */}
            {viewMode === "carte" && (
              <motion.div
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                style={{
                  background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
                  borderRadius: 16, overflow: "hidden",
                }}
              >
                {/* En-tête carte */}
                <div style={{
                  padding: "14px 20px", borderBottom: "1px solid var(--dtk-panel)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(116,192,252,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Map size={15} color="#74c0fc" />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dtk-muted)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
                    Localisation géographique des anomalies — Réseau Dakar
                  </span>
                  {/* Légende statut */}
                  <div style={{ marginLeft: "auto", display: "flex", gap: 14 }}>
                    {[["#ff4444","CRITIQUE"], ["#ffa94d","ÉLEVÉ"], ["#74c0fc","MODÉRÉ"]].map(([c, l]) => (
                      <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                        <span style={{ fontSize: 10, color: "var(--dtk-muted)" }}>{l}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <MapView
                  anomalies={sites.map(s => ({
                    id:          s.id,
                    nom:         s.nom,
                    lat:         s.lat,
                    lon:         s.lon,
                    anom_counts: s.anom_counts,
                    max_vol:     s.max_vol,
                    status:      s.status,
                  }))}
                  showZones={false}
                  height={500}
                />
              </motion.div>
            )}
          </motion.div>
        )}

        <div style={{ display: viewMode === "carte" ? "none" : "grid", gridTemplateColumns: "1.1fr 1.5fr", gap: 24, alignItems: "start" }}>
          
          {/* LEFT SIDE: SITES LIST SELECTION */}
          <div style={{
            background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
            borderRadius: 16, padding: "20px 22px", backdropFilter: "blur(10px)"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--dtk-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                <MapPin size={16} /> Points d'observation ({filteredSites.length})
              </h3>
              
              <select 
                value={filterSeverity} 
                onChange={e => handleFilterChange(e.target.value)}
                style={{
                  fontSize: 11, border: "1px solid var(--dtk-border)", borderRadius: 16, padding: "4px 10px",
                  background: "var(--dtk-panel)", color: "var(--dtk-text)", cursor: "pointer", outline: "none"
                }}
              >
                <option value="all" style={{ background: "#1a1f2e" }}>Tous</option>
                <option value="critique" style={{ background: "#1a1f2e" }}>Critique (≥20)</option>
                <option value="eleve" style={{ background: "#1a1f2e" }}>Élevé (8–19)</option>
                <option value="modere" style={{ background: "#1a1f2e" }}>Modéré (&lt;8)</option>
              </select>
            </div>

            {/* Search Input */}
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
              borderRadius: 10, padding: "8px 12px", marginBottom: 16
            }}>
              <Search size={14} color="var(--dtk-muted)" />
              <input 
                type="text" 
                placeholder="Filtrer les sites de Dakar..." 
                value={search} 
                onChange={e => handleSearchChange(e.target.value)}
                style={{
                  background: "none", border: "none", outline: "none",
                  color: "var(--dtk-text)", fontSize: 12.5, width: "100%"
                }}
              />
            </div>

            {/* Scrollable sites list */}
            <div style={{
              maxHeight: 560, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8,
              scrollbarWidth: "thin", scrollbarColor: "var(--dtk-border) transparent", paddingBottom: 10
            }}>
              {paginatedSites.map((s) => {
                const isSelected = selectedSiteId === s.id;
                const statusStyle = getStatusConfig(s.status);
                
                return (
                  <div 
                    key={s.id}
                    onClick={() => setSelectedSiteId(s.id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12, padding: "12px 14px",
                      borderRadius: 12, cursor: "pointer",
                      border: isSelected
                        ? `2px solid ${statusStyle.color}`
                        : `1px solid ${statusStyle.border}`,
                      background: statusStyle.bg,
                      transition: "all 0.18s",
                      boxShadow: isSelected
                        ? `0 0 0 3px ${statusStyle.color}33`
                        : `0 1px 4px ${statusStyle.color}18`,
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.border = `1px solid ${statusStyle.color}`;
                        e.currentTarget.style.boxShadow = `0 4px 16px ${statusStyle.color}33`;
                        e.currentTarget.style.background = statusStyle.bg.replace("0.18", "0.26");
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.border = `1px solid ${statusStyle.border}`;
                        e.currentTarget.style.boxShadow = `0 1px 4px ${statusStyle.color}18`;
                        e.currentTarget.style.background = statusStyle.bg;
                      }
                    }}
                  >
                    {/* Dot indicateur */}
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      background: statusStyle.color,
                      boxShadow: `0 0 8px ${statusStyle.color}cc`,
                      flexShrink: 0
                    }} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 12.5, fontWeight: 700, color: "var(--dtk-text)",
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
                      }}>
                        {s.nom}
                      </div>
                      <div style={{ fontSize: 11, color: statusStyle.color, marginTop: 2, fontWeight: 600, opacity: 0.85 }}>
                        {s.anom_counts} anomalies · Vol max {s.max_vol.toLocaleString("fr")} veh
                      </div>
                    </div>
                    
                    <span style={{
                      fontSize: 9.5, fontWeight: 800, padding: "3px 9px", borderRadius: 20,
                      background: `${statusStyle.color}22`,
                      color: statusStyle.color,
                      border: `1px solid ${statusStyle.color}`,
                      flexShrink: 0, letterSpacing: "0.5px",
                      textShadow: `0 0 8px ${statusStyle.color}88`
                    }}>
                      {s.status}
                    </span>
                  </div>
                );
              })}

              {filteredSites.length === 0 && (
                <div style={{ padding: 30, textAlign: "center", color: "var(--dtk-muted)", fontSize: 13 }}>
                  Aucun site de comptage ne correspond.
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--dtk-border)" }}>
                <span style={{ fontSize: 11.5, color: "var(--dtk-muted)" }}>
                  Affichage de {(page - 1) * PAGE_SIZE + 1} à {Math.min(page * PAGE_SIZE, filteredSites.length)} sur {filteredSites.length}
                </span>
                <div style={{ display: "flex", gap: 6 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "1px solid var(--dtk-border)",
                      background: page === 1 ? "transparent" : "var(--dtk-panelSolid)",
                      color: page === 1 ? "var(--dtk-vmuted)" : "var(--dtk-text)",
                      cursor: page === 1 ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600
                    }}
                  >
                    Précédent
                  </button>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                      if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
                        return (
                          <button key={p} onClick={() => setPage(p)} style={{
                            width: 24, height: 24, borderRadius: 6,
                            border: p === page ? "1px solid #74c0fc" : "1px solid var(--dtk-border)",
                            background: p === page ? "rgba(116,192,252,0.15)" : "transparent",
                            color: p === page ? "#74c0fc" : "var(--dtk-muted)",
                            cursor: "pointer", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center"
                          }}>
                            {p}
                          </button>
                        );
                      } else if (p === 2 && page > 3) {
                        return <span key="start-ellipsis" style={{ fontSize: 10, color: "var(--dtk-muted)" }}>...</span>;
                      } else if (p === totalPages - 1 && page < totalPages - 2) {
                        return <span key="end-ellipsis" style={{ fontSize: 10, color: "var(--dtk-muted)" }}>...</span>;
                      }
                      return null;
                    })}
                  </div>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{
                      padding: "4px 10px", borderRadius: 6, border: "1px solid var(--dtk-border)",
                      background: page === totalPages ? "transparent" : "var(--dtk-panelSolid)",
                      color: page === totalPages ? "var(--dtk-vmuted)" : "var(--dtk-text)",
                      cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: 11, fontWeight: 600
                    }}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT SIDE: GENERAL SYNTHESIS OR DRILL DOWN */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            
            {/* DRILLDOWN VIEW: SITE SPECIFIC DETAILS */}
            <AnimatePresence mode="wait">
              {selectedSiteId && (
                <motion.div
                  key={selectedSiteId}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                >
                  {detailsLoading || !siteDetails ? (
                    <div style={{
                      background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
                      borderRadius: 16, padding: 80, display: "flex", justifyContent: "center", alignItems: "center"
                    }}>
                      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}
                        style={{ width: 28, height: 28, border: "3px solid rgba(116,192,252,0.15)", borderTopColor: "#74c0fc", borderRadius: "50%" }} />
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      
                      {/* SITE IDENTIFICATION */}
                      <div style={{
                        background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
                        borderRadius: 16, padding: "20px 22px"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                          <div>
                            <span style={{ fontSize: 10, fontWeight: 800, color: "#74c0fc", background: "rgba(116,192,252,0.12)", border: "1px solid rgba(116,192,252,0.25)", borderRadius: 12, padding: "2px 8px", textTransform: "uppercase" }}>
                              ID: {siteDetails.site_id}
                            </span>
                            <h2 style={{ fontSize: 18, fontWeight: 800, margin: "6px 0 2px", color: "var(--dtk-text)" }}>
                              {siteDetails.nom}
                            </h2>
                            <span style={{ fontSize: 11.5, color: "var(--dtk-muted)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                              📍 Lat: {siteDetails.lat} · Lon: {siteDetails.lon}
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: 24, fontWeight: 800, color: "#ff6b6b" }}>
                              {siteDetails.total_anom}
                            </div>
                            <div style={{ fontSize: 10.5, color: "var(--dtk-muted)" }}>
                              anomalies ({siteDetails.pct_anom}% du trafic)
                            </div>
                          </div>
                        </div>

                        <div style={{ height: "0.5px", background: "var(--dtk-panel)", margin: "16px 0" }} />

                        {/* GRAPH: Site Hourly Distribution */}
                        <div style={{ marginBottom: 14 }}>
                          <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "var(--dtk-muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                            <Clock size={13} /> Distribution des anomalies par heure (ce site)
                          </span>
                          
                          <div style={{ width: "100%", height: 130 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart 
                                data={Object.entries(siteDetails.by_hour)
                                  .map(([h, v]) => ({ heure: `${h}h`, count: v }))
                                  .sort((a, b) => parseInt(a.heure) - parseInt(b.heure))}
                                margin={{ top: 0, right: 0, left: -22, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--dtk-panel)" vertical={false} />
                                <XAxis dataKey="heure" tick={{ fontSize: 10, fill: "var(--dtk-muted)" }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: "var(--dtk-muted)" }} axisLine={false} tickLine={false} />
                                <Tooltip 
                                  content={({ active, payload }) => {
                                    if (active && payload?.length) {
                                      return (
                                        <div style={{ background: "#1a1f2e", border: "1px solid var(--dtk-vmuted)", borderRadius: 8, padding: "6px 10px", fontSize: 11.5 }}>
                                          <p style={{ margin: 0, color: "var(--dtk-text)" }}>{payload[0].value} anomalies</p>
                                        </div>
                                      );
                                    }
                                    return null;
                                  }}
                                />
                                <Bar dataKey="count" fill="#74c0fc" radius={[3, 3, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* GRAPH: Site Vehicle breakdown */}
                        {Object.keys(siteDetails.by_category).length > 0 && (
                          <div>
                            <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", color: "var(--dtk-muted)", display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                              🚌 Véhicules les plus concernés (anomalies)
                            </span>
                            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                              {Object.entries(siteDetails.by_category).map(([cat, val]) => (
                                <span key={cat} style={{
                                  fontSize: 11.5, padding: "4px 10px", borderRadius: 20,
                                  background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
                                  color: "var(--dtk-sub)", display: "inline-flex", alignItems: "center", gap: 6
                                }}>
                                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ff8c42" }} />
                                  <strong>{cat}</strong>: {val} cas
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                      </div>

                      {/* DETAILED OBSERVATIONS TABLE */}
                      <div style={{
                        background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
                        borderRadius: 16, padding: "20px 22px"
                      }}>
                        <h3 style={{ fontSize: 13, fontWeight: 700, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--dtk-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                          <Calendar size={15} /> Historique des pires observations d'anomalies (Top 15)
                        </h3>

                        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 310, overflowY: "auto" }}>
                          {siteDetails.top_anomalies.map((obs, idx) => (
                            <div key={idx} style={{
                              padding: "12px 14px", borderRadius: 10, background: "var(--dtk-panel)",
                              border: "1px solid var(--dtk-panel)", fontSize: 12
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontWeight: 700 }}>
                                <span style={{ color: "#74c0fc" }}>{obs.heure} · {obs.vehicule}</span>
                                <span style={{ color: "#ff6b6b" }}>{obs.volume} véh / 30min</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", color: "var(--dtk-muted)", fontSize: 11, marginBottom: 8 }}>
                                <span>Dir: {obs.direction}</span>
                                <span>Vol moyen attendu : {obs.vol_moyen} véh (zscore: {obs.zscore})</span>
                              </div>
                              {/* Model Votes */}
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 10, color: "var(--dtk-muted)" }}>Votes des algorithmes :</span>
                                <span style={{
                                  fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6,
                                  background: obs.votes_modeles.if ? "rgba(105,219,124,0.12)" : "var(--dtk-panel)",
                                  color: obs.votes_modeles.if ? "#69db7c" : "var(--dtk-vmuted)"
                                }}>
                                  Isolation Forest
                                </span>
                                <span style={{
                                  fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6,
                                  background: obs.votes_modeles.lof ? "rgba(105,219,124,0.12)" : "var(--dtk-panel)",
                                  color: obs.votes_modeles.lof ? "#69db7c" : "var(--dtk-vmuted)"
                                }}>
                                  LOF
                                </span>
                                <span style={{
                                  fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 6,
                                  background: obs.votes_modeles.zscore ? "rgba(105,219,124,0.12)" : "var(--dtk-panel)",
                                  color: obs.votes_modeles.zscore ? "#69db7c" : "var(--dtk-vmuted)"
                                }}>
                                  Z-Score
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* SYNTHESIS VIEW: GLOBAL CHART & STATS */}
            <AnimatePresence mode="wait">
              {!selectedSiteId && (
                <motion.div
                  key="global"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                  style={{ display: "flex", flexDirection: "column", gap: 16 }}
                >
                  {/* OVERALL CHART */}
                  <div style={{
                    background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
                    borderRadius: 16, padding: "20px 22px", backdropFilter: "blur(10px)"
                  }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 16px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#74c0fc", display: "flex", alignItems: "center", gap: 8 }}>
                      <Clock size={16} /> Volume horaire des anomalies sur le réseau
                    </h3>
                    
                    <div style={{ width: "100%", height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={overallHourData} margin={{ top: 0, right: 0, left: -22, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--dtk-panel)" vertical={false} />
                          <XAxis dataKey="heure" tick={{ fontSize: 10, fill: "var(--dtk-muted)" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "var(--dtk-muted)" }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            content={({ active, payload, label }) => {
                              if (active && payload?.length) {
                                return (
                                  <div style={{ background: "#1a1f2e", border: "1px solid var(--dtk-vmuted)", borderRadius: 8, padding: "8px 12px", fontSize: 12 }}>
                                    <p style={{ margin: 0, color: "var(--dtk-muted)" }}>{label}</p>
                                    <p style={{ margin: "2px 0 0", color: "var(--dtk-text)", fontWeight: 700 }}>{payload[0].value} anomalies globales</p>
                                  </div>
                                );
                              }
                              return null;
                            }}
                          />
                          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                            {overallHourData.map((e, i) => (
                              <Cell key={i} fill={e.count >= 50 ? "#ff6b6b" : e.count >= 20 ? "#ffa94d" : "#74c0fc"} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* ALGORITHMS CORRELATION / VOTES ACCORD */}
                  <div style={{
                    background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
                    borderRadius: 16, padding: "20px 22px", backdropFilter: "blur(10px)"
                  }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 14px", textTransform: "uppercase", letterSpacing: "0.5px", color: "#69db7c", display: "flex", alignItems: "center", gap: 8 }}>
                      <TrendingUp size={16} /> Accord de Consensus entre Algorithmes
                    </h3>
                    
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {[
                        { label: "Isolation Forest ↔ LOF", pct: 90.6, color: "#74c0fc" },
                        { label: "Isolation Forest ↔ Z-Score", pct: 95.0, color: "#69db7c" },
                        { label: "LOF ↔ Z-Score", pct: 95.0, color: "#da77f2" }
                      ].map((item, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 180, fontSize: 12, color: "var(--dtk-sub)" }}>{item.label}</span>
                          <div style={{ flex: 1, height: 6, background: "var(--dtk-panel)", borderRadius: 3, overflow: "hidden" }}>
                            <motion.div 
                              initial={{ width: 0 }} 
                              animate={{ width: `${item.pct}%` }} 
                              transition={{ duration: 0.6, delay: idx * 0.1 }}
                              style={{ height: "100%", background: item.color, borderRadius: 3 }} 
                            />
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, width: 40, textAlign: "right", color: item.color }}>{item.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ── RECOMMANDATIONS PAR RÔLE ── */}
                  <div style={{
                    background: "var(--dtk-panel)", border: "1px solid var(--dtk-panel)",
                    borderRadius: 16, padding: "20px 22px", backdropFilter: "blur(10px)"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: "rgba(116,192,252,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ShieldCheck size={15} color="#74c0fc" />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "var(--dtk-muted)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
                        Recommandations opérationnelles — {tab === "exploitation" ? "Chef d'Exploitation" : "Directeur Planification"}
                      </span>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                      {recommendations[tab].map((r, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, delay: i * 0.07 }}
                          style={{
                            background: r.bg,
                            border: `1px solid ${r.border}`,
                            borderRadius: 12,
                            padding: "14px 16px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 16 }}>{r.icon}</span>
                            <span style={{
                              fontSize: 10, fontWeight: 800, letterSpacing: "0.8px",
                              color: r.color, textTransform: "uppercase",
                              background: `${r.color}20`, borderRadius: 6, padding: "2px 8px",
                            }}>{r.type}</span>
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--dtk-text)", marginBottom: 6 }}>{r.title}</div>
                          <div style={{ fontSize: 12, color: "var(--dtk-sub)", lineHeight: 1.55 }}>{r.text}</div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                </motion.div>
              )}
            </AnimatePresence>



          </div>

        </div>{/* fin grid liste */}

        {/* FOOTER */}
        <div style={{ textAlign: "center", color: "var(--dtk-vmuted)", fontSize: 12, marginTop: 40, paddingBottom: 10 }}>
          © {new Date().getFullYear()} Transport Dakar — Espace Décideurs · Données CETUD
        </div>

      </div>
    </motion.div>
  );
}
