import { useState, useEffect, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BusFront, ShieldAlert, BarChart2, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, Cpu, BrainCircuit, Clock, Users, TrendingUp, Smile, MonitorSmartphone } from 'lucide-react';
import { getSession, logout as authLogout, getSessionTimeLeft, canAccess } from '../auth';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../theme';

// Regroupé en 3 sections : Accueil / Reporting (Knowage) / Outils IA & Décision / Suivi & Écoute.
// Distinction technique : "Reporting" = dashboards Knowage (BI/SQL, lecture passive de KPIs
// historiques). "Outils IA & Décision" = pages qui appellent en direct un modèle ML servi par
// l'API FastAPI (prédiction, classification, clustering en temps réel). "Suivi & Écoute" =
// pages d'analyse/suivi sans modèle ML live (statistiques descriptives, feedback).
const NAV_GROUPS = [
  {
    section: null, // pas de header pour l'item d'accueil
    items: [
      { label: 'Vue générale', path: '/decideurs', icon: LayoutDashboard, color: '#ffa94d' },
    ],
  },
  {
    section: 'Reporting (Knowage)',
    items: [
      { label: 'Cockpit Knowage', path: '/decideurs/cockpit', icon: MonitorSmartphone, color: '#ff6b35' },
    ],
  },
  {
    section: 'Outils IA & Décision',
    items: [
      { label: 'Zones à risque',      path: '/decideurs/zones-risque', icon: ShieldAlert,  color: '#ff6b6b' },
      { label: 'Simulateur Risque',   path: '/decideurs/simulateur',   icon: Cpu,           color: '#69db7c' },
      { label: 'Anomalies trafic',    path: '/decideurs/anomalies',    icon: BarChart2,     color: '#74c0fc' },
      { label: 'Profils usagers',     path: '/decideurs/segmentation', icon: Users,         color: '#69db7c' },
      { label: 'Audit & Insights ML', path: '/decideurs/ml-insights',  icon: BrainCircuit,  color: '#da77f2' },
    ],
  },
  {
    section: 'Suivi & Écoute',
    items: [
      { label: 'Satisfaction & Écoute', path: '/decideurs/satisfaction', icon: Smile,       color: '#ffd43b' },
      { label: 'Évolution temporelle',  path: '/decideurs/evolution',   icon: TrendingUp,   color: '#74c0fc' },
    ],
  },
];

export default function DecideursLayout() {
  const navigate  = useNavigate();
  const { theme, isDark } = useTheme();
  const [collapsed, setCollapsed]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [timeLeft, setTimeLeft]   = useState(getSessionTimeLeft());
  const session = getSession();

  // Timer de session — mise à jour chaque minute
  useEffect(() => {
    const tick = setInterval(() => {
      const left = getSessionTimeLeft();
      setTimeLeft(left);
      if (left <= 0) { authLogout(); navigate('/login-decideurs'); }
    }, 30000); // toutes les 30s
    return () => clearInterval(tick);
  }, [navigate]);

  const logout = () => { authLogout(); navigate('/login-decideurs'); };

  const formatTime = (ms) => {
    const m = Math.floor(ms / 60000);
    return m > 60 ? `${Math.floor(m / 60)}h${m % 60}m` : `${m}min`;
  };

  if (!session) { navigate('/login-decideurs'); return null; }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'Inter, sans-serif', background: theme.bg }}>

      {/* ── OVERLAY mobile ── */}
      {mobileOpen && (
        <div onClick={() => setMobileOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 99, backdropFilter: 'blur(2px)',
        }} />
      )}

      {/* ── BOUTON hamburger mobile ── */}
      <button onClick={() => setMobileOpen(o => !o)} style={{
        display: isMobile ? 'flex' : 'none',
        position: 'fixed', top: 14, left: 14, zIndex: 200,
        width: 40, height: 40, borderRadius: 10,
        background: theme.panelSolid, border: `1px solid ${theme.border}`,
        alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', color: theme.text, fontSize: 18,
        boxShadow: theme.shadow,
      }}>
        {mobileOpen ? '✕' : '☰'}
      </button>

      {/* ── SIDEBAR ── */}
      <aside style={{
        width: isMobile ? 228 : (collapsed ? 68 : 228),
        flexShrink: 0, transition: 'transform 0.25s ease, width 0.25s ease',
        background: theme.panelSolid,
        borderRight: `1px solid ${theme.border}`,
        display: 'flex', flexDirection: 'column',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0, height: '100vh', zIndex: isMobile ? 100 : 'auto',
        transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
      }}>

        {/* Logo */}
        <div style={{
          padding: collapsed ? '18px 0' : '18px 16px',
          display: 'flex', alignItems: 'center', gap: 9,
          borderBottom: `1px solid ${theme.border}`,
          justifyContent: collapsed ? 'center' : 'flex-start',
        }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(255,107,53,0.15)', border: '1px solid rgba(255,107,53,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <BusFront size={17} color="#ff6b35" />
          </div>
          {!collapsed && (
            <span style={{ fontWeight: 800, fontSize: 14, color: theme.text, whiteSpace: 'nowrap', letterSpacing: '-0.2px' }}>
              Transport<span style={{ color: '#ff6b35' }}>Dakar</span>
            </span>
          )}
        </div>

        {/* Badge rôle + utilisateur */}
        {!collapsed && (
          <div style={{ padding: '10px 12px', borderBottom: `1px solid ${theme.border}` }}>
            {/* Avatar + nom */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: `${session.roleColor}20`, border: `1px solid ${session.roleColor}35`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: session.roleColor,
              }}>
                {session.avatar}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: theme.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {session.nom}
                </div>
                <div style={{ fontSize: 10, color: session.roleColor, fontWeight: 600 }}>{session.roleLabel}</div>
              </div>
            </div>
            {/* Timer session */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              background: timeLeft < 600000 ? 'rgba(255,107,107,0.08)' : theme.panel,
              border: `1px solid ${timeLeft < 600000 ? 'rgba(255,107,107,0.2)' : theme.border}`,
              borderRadius: 6, padding: '5px 8px',
            }}>
              <Clock size={10} color={timeLeft < 600000 ? '#ff6b6b' : theme.veryMuted} />
              <span style={{ fontSize: 10, color: timeLeft < 600000 ? '#ff6b6b' : theme.muted }}>
                Session : {formatTime(timeLeft)}
              </span>
            </div>
          </div>
        )}

        {/* Nav items — groupés par section, filtrés selon le rôle */}
        <nav style={{ flex: 1, padding: '6px 8px', display: 'flex', flexDirection: 'column', gap: 3, overflowY: 'auto' }}>
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.section ?? `g${gi}`}>
              {!collapsed && group.section && (
                <div style={{
                  padding: '14px 12px 6px', fontSize: 9, fontWeight: 800,
                  letterSpacing: '1.2px', color: theme.muted, textTransform: 'uppercase',
                }}>
                  {group.section}
                </div>
              )}
              {collapsed && group.section && gi > 0 && (
                <div style={{ height: 1, background: theme.border, margin: '8px 6px' }} />
              )}
              {group.items.map(({ label, path, icon: Icon, color }) => {
                const subPath = path.replace('/decideurs', '').replace(/^\//, '');
                const allowed = canAccess(session, subPath);

                if (!allowed) {
                  return (
                    <div key={path} title={`Accès refusé — rôle ${session.roleLabel}`} style={{
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: collapsed ? '11px 0' : '10px 12px',
                      borderRadius: 9, opacity: 0.3, cursor: 'not-allowed',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                    }}>
                      <Icon size={16} color={theme.textSub} style={{ flexShrink: 0 }} />
                      {!collapsed && <span style={{ fontSize: 13, fontWeight: 600, color: theme.textSub, whiteSpace: 'nowrap' }}>{label}</span>}
                      {!collapsed && <span style={{ marginLeft: 'auto', fontSize: 10 }}>🔒</span>}
                    </div>
                  );
                }

                return (
                  <NavLink key={path} to={path} end={path === '/decideurs'}
                    onClick={() => isMobile && setMobileOpen(false)}
                    style={({ isActive }) => ({
                      display: 'flex', alignItems: 'center', gap: 9,
                      padding: collapsed ? '11px 0' : '10px 12px',
                      borderRadius: 9, textDecoration: 'none', transition: 'all 0.15s',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      background: isActive ? `${color}15` : 'transparent',
                      border: `1px solid ${isActive ? `${color}30` : 'transparent'}`,
                    })}
                    title={collapsed ? label : undefined}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon size={16} color={isActive ? color : theme.textSub} style={{ flexShrink: 0 }} />
                        {!collapsed && (
                          <span style={{ fontSize: 13, fontWeight: isActive ? 700 : 600, color: isActive ? theme.text : theme.textSub, whiteSpace: 'nowrap' }}>
                            {label}
                          </span>
                        )}
                        {!collapsed && isActive && (
                          <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: color }} />
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Bas sidebar */}
        <div style={{ padding: '10px 8px', borderTop: `1px solid ${theme.border}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button onClick={logout} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: collapsed ? '10px 0' : '10px 12px',
            borderRadius: 9, background: 'none', border: 'none',
            cursor: 'pointer', color: theme.muted,
            fontSize: 12.5, transition: 'all 0.15s',
            justifyContent: collapsed ? 'center' : 'flex-start', width: '100%',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,107,107,0.08)'; e.currentTarget.style.color = '#ff6b6b'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = theme.muted; }}
            title={collapsed ? 'Déconnexion' : undefined}
          >
            <LogOut size={15} style={{ flexShrink: 0 }} />
            {!collapsed && <span>Déconnexion</span>}
          </button>

          <ThemeToggle style={{ width: '100%', borderRadius: 9, marginBottom: 4 }} />
          <button onClick={() => setCollapsed(!collapsed)} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '7px', borderRadius: 9,
            background: theme.panel, border: `1px solid ${theme.border}`,
            cursor: 'pointer', color: theme.muted, width: '100%', transition: 'all 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = theme.inputBorder; e.currentTarget.style.color = theme.text; }}
            onMouseLeave={e => { e.currentTarget.style.background = theme.panel; e.currentTarget.style.color = theme.muted; }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>
      </aside>

      {/* ── CONTENU ── */}
      <main style={{
        flex: 1, overflow: 'auto', background: theme.bg,
        paddingTop: isMobile ? 64 : 0,   /* espace pour le bouton hamburger */
      }}>
        <Outlet />
      </main>
    </div>
  );
}
