import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Eye, EyeOff, MapPin, Activity,
  Shield, BarChart2, ShieldAlert, BrainCircuit, CheckCircle, AlertCircle
} from 'lucide-react';
import { login } from '../auth';
import { useTheme } from '../theme';
import ThemeToggle from '../components/ThemeToggle';
import LogoTransportDakar from '../components/LogoTransportDakar';

/* ── Carte de rôle cliquable ── */
const RoleCard = ({ icon: Icon, label, desc, color, selected, onClick }) => (
  <motion.button
    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
    onClick={onClick}
    style={{
      flex: 1, padding: '12px 14px', borderRadius: 12, border: `1px solid`,
      borderColor: selected ? `${color}50` : 'var(--dtk-panel)',
      background: selected ? `${color}12` : 'var(--dtk-panel)',
      cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s', position: 'relative',
    }}
  >
    {selected && (
      <div style={{ position: 'absolute', top: 8, right: 8 }}>
        <CheckCircle size={13} color={color} />
      </div>
    )}
    <Icon size={18} color={selected ? color : 'var(--dtk-muted)'} style={{ marginBottom: 6 }} />
    <div style={{ fontSize: 12, fontWeight: 700, color: selected ? 'var(--dtk-text)' : 'var(--dtk-muted)', marginBottom: 2 }}>{label}</div>
    <div style={{ fontSize: 10, color: 'var(--dtk-vmuted)', lineHeight: 1.4 }}>{desc}</div>
  </motion.button>
);

/* ── Stat animée panneau gauche ── */
const StatItem = ({ icon: Icon, value, label, color, delay, isDark }) => (
  <motion.div
    initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
    transition={{ delay, duration: 0.5 }}
    style={{ display: 'flex', alignItems: 'center', gap: 12 }}
  >
    <div style={{
      width: 38, height: 38, borderRadius: 10,
      background: `${color}15`, border: `1px solid ${color}25`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={16} color={color} />
    </div>
    <div>
      <div style={{ fontSize: 16, fontWeight: 800, color: isDark ? 'var(--dtk-text)' : '#0f1117', letterSpacing: '-0.3px' }}>{value}</div>
      <div style={{ fontSize: 11, color: isDark ? 'var(--dtk-muted)' : 'rgba(0,0,0,0.45)' }}>{label}</div>
    </div>
  </motion.div>
);

/* ── Module de fonctionnalité panneau gauche ── */
const FeatureItem = ({ icon, text, color, isDark }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 9,
    background: isDark ? 'var(--dtk-panel)' : 'rgba(0,0,0,0.04)',
    border: isDark ? '1px solid var(--dtk-panel)' : '1px solid rgba(0,0,0,0.08)',
  }}>
    <span style={{ fontSize: 13, flexShrink: 0 }}>{icon}</span>
    <span style={{ fontSize: 10.5, color: isDark ? 'var(--dtk-sub)' : 'rgba(0,0,0,0.6)', lineHeight: 1.3 }}>{text}</span>
    <div style={{ marginLeft: 'auto', width: 5, height: 5, borderRadius: '50%', background: color, flexShrink: 0 }} />
  </div>
);

export default function LoginDecideurs() {
  const navigate = useNavigate();
  const { theme, isDark } = useTheme();
  const [form, setForm]       = useState({ login: '', password: '' });
  const [error, setError]     = useState('');
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole]       = useState('gestionnaire');
  const [attempts, setAttempts] = useState(0);

  const roles = [
    { id: 'planificateur', icon: BarChart2,   label: 'Directeur Planification', desc: 'Stratégie, anomalies & audit ML', color: '#74c0fc' },
    { id: 'exploitation',  icon: Shield,      label: "Chef d'Exploitation",     desc: 'Opérationnel & trafic réseau',  color: '#ff6b35' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.login || !form.password) {
      setError('Veuillez remplir tous les champs.');
      return;
    }
    setLoading(true);
    setError('');
    const result = await login(form.login, form.password);
    if (result.success) {
      navigate('/decideurs');
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setError(
        newAttempts >= 3
          ? `Trop de tentatives. Consultez les comptes de démonstration ci-dessous.`
          : result.error
      );
      setLoading(false);
    }
  };

  const inputBase = {
    width: '100%', padding: '12px 16px', borderRadius: 10, fontSize: 14,
    background: isDark ? 'var(--dtk-panel)' : theme.input,
    color: theme.text,
    outline: 'none', boxSizing: 'border-box', transition: 'all 0.2s',
    fontFamily: 'Inter, sans-serif',
  };

  /* Couleurs dynamiques panneau gauche */
  const leftBg     = isDark
    ? 'linear-gradient(135deg, var(--dtk-bg) 0%, var(--dtk-bg2) 40%, var(--dtk-solid) 100%)'
    : 'linear-gradient(135deg, #eef4ff 0%, #e8e0ff 60%, #f0f4ff 100%)';
  const leftText   = isDark ? 'var(--dtk-text)' : '#0f1117';
  const leftSub    = isDark ? 'var(--dtk-muted)' : 'rgba(0,0,0,0.55)';
  const leftMuted  = isDark ? 'var(--dtk-vmuted)'  : 'rgba(0,0,0,0.35)';
  const leftBorder = isDark ? 'var(--dtk-panel)' : 'rgba(0,0,0,0.08)';
  const gridLine   = isDark ? 'var(--dtk-panel)' : 'rgba(0,0,0,0.04)';

  return (
    <div style={{
      minHeight: '100vh',
      background: leftBg,
      display: 'flex', fontFamily: 'Inter, sans-serif', overflow: 'hidden',
      transition: 'background 0.3s',
    }}>

      {/* ═══ PANNEAU GAUCHE ═══ */}
      <motion.div
        initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '40px 48px', position: 'relative', overflow: 'hidden',
          borderRight: `1px solid ${leftBorder}`,
        }}
      >
        {/* glows */}
        <div style={{ position: 'absolute', top: '-10%', left: '-5%', width: 500, height: 500, borderRadius: '50%', background: isDark ? 'radial-gradient(circle, rgba(116,192,252,0.06) 0%, transparent 65%)' : 'radial-gradient(circle, rgba(116,192,252,0.18) 0%, transparent 65%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-5%', width: 400, height: 400, borderRadius: '50%', background: isDark ? 'radial-gradient(circle, rgba(255,107,53,0.06) 0%, transparent 65%)' : 'radial-gradient(circle, rgba(255,107,53,0.12) 0%, transparent 65%)', pointerEvents: 'none' }} />

        {/* Grid décoratif */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: `linear-gradient(${gridLine} 1px, transparent 1px), linear-gradient(90deg, ${gridLine} 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }} />

        {/* Logo */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          style={{ display: 'flex', alignItems: 'center', gap: 10, zIndex: 2 }}>
          <LogoTransportDakar isDark={isDark} height={48} />
        </motion.div>

        {/* Bloc central */}
        <div style={{ zIndex: 2 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'rgba(255,107,53,0.7)', marginBottom: 14 }}>
              Système Décisionnel · Optimisation Transport Urbain
            </div>
            <h2 style={{ fontSize: 30, fontWeight: 800, color: leftText, margin: '0 0 12px', letterSpacing: '-0.5px', lineHeight: 1.2 }}>
              Plateforme d'aide<br />à la décision
            </h2>
            <p style={{ fontSize: 13.5, color: leftSub, margin: '0 0 36px', lineHeight: 1.7, maxWidth: 360 }}>
              Exploitez les données EMD CETUD pour analyser l'accessibilité, détecter les anomalies de trafic et planifier les interventions sur le réseau de Dakar.
            </p>
          </motion.div>

          {/* Modules disponibles */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }}
            style={{ marginBottom: 28 }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: leftMuted, marginBottom: 8 }}>Modules disponibles</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <FeatureItem icon="🏠" text="Vue générale du réseau" color="#74c0fc" isDark={isDark} />
              <FeatureItem icon="🗺️" text="Zones à risque d'inaccessibilité" color="#ff6b6b" isDark={isDark} />
              <FeatureItem icon="📡" text="Anomalies de trafic (IF·LOF·Z-Score)" color="#74c0fc" isDark={isDark} />
              <FeatureItem icon="🧠" text="Simulateur prédictif ML temps réel" color="#69db7c" isDark={isDark} />
              <FeatureItem icon="📊" text="Audit & transparence (XAI)" color="#da77f2" isDark={isDark} />
              <FeatureItem icon="👥" text="Segmentation des usagers" color="#ffa94d" isDark={isDark} />
              <FeatureItem icon="📈" text="Évolution temporelle" color="#69db7c" isDark={isDark} />
              <FeatureItem icon="⭐" text="Satisfaction citoyenne" color="#da77f2" isDark={isDark} />
              <FeatureItem icon="📋" text="Cockpit décisionnel Knowage" color="#ff6b35" isDark={isDark} />
            </div>
          </motion.div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <StatItem icon={Activity}    value="37 248"   label="Observations EMD"   color="#74c0fc" delay={0.6}  isDark={isDark} />
            <StatItem icon={MapPin}      value="49 sites"  label="Points de comptage" color="#ffa94d" delay={0.65} isDark={isDark} />
            <StatItem icon={ShieldAlert} value="41 zones"  label="Zones analysées"    color="#ff6b6b" delay={0.7}  isDark={isDark} />
           
          </div>
        </div>

        {/* Footer gauche */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
          style={{ fontSize: 11, color: leftMuted, zIndex: 2 }}>
          © 2026 PFE · Ibtihel Abdellaoui · CETUD · Données EMD 2015/2019
        </motion.div>
      </motion.div>

      {/* ═══ PANNEAU DROIT — FORMULAIRE ═══ */}
      <motion.div
        initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
        style={{
          width: 500, display: 'flex', flexDirection: 'column', justifyContent: 'center',
          padding: '48px 56px', position: 'relative',
          background: isDark ? 'var(--dtk-panel)' : theme.bg,
          borderLeft: isDark ? 'none' : `1px solid ${theme.border}`,
          transition: 'background 0.3s',
        }}
      >
        {/* ThemeToggle — coin haut droit */}
        <div style={{ position: 'absolute', top: 24, right: 24 }}>
          <ThemeToggle />
        </div>

        {/* glow formulaire */}
        <div style={{ position: 'absolute', top: '20%', right: '-20%', width: 350, height: 350, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,107,53,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* En-tête formulaire */}
        <div style={{ marginBottom: 32 }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(255,107,53,0.2), rgba(255,140,66,0.1))',
              border: '1px solid rgba(255,107,53,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 24,
              boxShadow: '0 0 30px rgba(255,107,53,0.12)',
            }}>
            <Lock size={24} color="#ff6b35" />
          </motion.div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: theme.text, margin: '0 0 8px', letterSpacing: '-0.5px' }}>
            Connexion sécurisée
          </h1>
          <p style={{ fontSize: 13, color: theme.muted, margin: 0, lineHeight: 1.6 }}>
            Accès réservé aux décideurs et gestionnaires du réseau CETUD
          </p>
        </div>

        {/* Aperçu des profils disponibles */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: theme.muted, marginBottom: 10 }}>
            Profils d'accès disponibles
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {roles.map(r => (
              <div key={r.id} style={{
                flex: 1, padding: '12px 14px', borderRadius: 12,
                background: `${r.color}08`, border: `1px solid ${r.color}25`,
              }}>
                <r.icon size={16} color={r.color} style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: theme.text, marginBottom: 2 }}>{r.label}</div>
                <div style={{ fontSize: 10, color: theme.muted, lineHeight: 1.4 }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Séparateur */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 1, background: theme.border }} />
          <span style={{ fontSize: 10, color: theme.muted, letterSpacing: '0.5px' }}>IDENTIFIANTS</span>
          <div style={{ flex: 1, height: 1, background: theme.border }} />
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Identifiant */}
          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: theme.muted, display: 'block', marginBottom: 8 }}>
              Identifiant
            </label>
            <input
              placeholder="Votre identifiant CETUD"
              value={form.login}
              onChange={e => { setForm({ ...form, login: e.target.value }); setError(''); }}
              style={{ ...inputBase, border: `1px solid ${error && !form.login ? 'rgba(255,107,107,0.5)' : theme.inputBorder}` }}
              onFocus={e => { e.target.style.borderColor = 'rgba(255,107,53,0.5)'; e.target.style.background = isDark ? 'var(--dtk-panel)' : 'rgba(255,107,53,0.04)'; }}
              onBlur={e => { e.target.style.borderColor = theme.inputBorder; e.target.style.background = inputBase.background; }}
            />
          </div>

          {/* Mot de passe */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: theme.muted }}>
                Mot de passe
              </label>

            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={show ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={form.password}
                onChange={e => { setForm({ ...form, password: e.target.value }); setError(''); }}
                style={{ ...inputBase, paddingRight: 46, border: `1px solid ${error && !form.password ? 'rgba(255,107,107,0.5)' : theme.inputBorder}` }}
                onFocus={e => { e.target.style.borderColor = 'rgba(255,107,53,0.5)'; e.target.style.background = isDark ? 'var(--dtk-panel)' : 'rgba(255,107,53,0.04)'; }}
                onBlur={e => { e.target.style.borderColor = theme.inputBorder; e.target.style.background = inputBase.background; }}
              />
              <button type="button" onClick={() => setShow(!show)} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: theme.muted, padding: 0, transition: 'color 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.color = theme.text}
                onMouseLeave={e => e.currentTarget.style.color = theme.muted}
              >
                {show ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Message d'erreur */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -6, height: 0 }} transition={{ duration: 0.2 }}
                style={{
                  background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)',
                  borderRadius: 10, padding: '11px 14px', display: 'flex', alignItems: 'flex-start', gap: 9,
                }}
              >
                <AlertCircle size={15} color="#ff6b6b" style={{ flexShrink: 0, marginTop: 1 }} />
                <span style={{ color: '#ff6b6b', fontSize: 12.5, lineHeight: 1.5 }}>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bouton connexion */}
          <motion.button
            type="submit" disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.015 }}
            whileTap={{ scale: loading ? 1 : 0.985 }}
            style={{
              marginTop: 4, padding: '14px', borderRadius: 12, border: 'none',
              background: loading
                ? 'rgba(255,107,53,0.35)'
                : 'linear-gradient(135deg, #ff6b35 0%, #ff8c42 100%)',
              color: 'var(--dtk-text)', fontWeight: 700, fontSize: 14,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 6px 20px rgba(255,107,53,0.28)',
              transition: 'all 0.2s', letterSpacing: '0.2px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? (
              <>
                <motion.span
                  animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.9, ease: 'linear' }}
                  style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid var(--dtk-vmuted)', borderTopColor: 'var(--dtk-text)', borderRadius: '50%' }}
                />
                Authentification en cours...
              </>
            ) : (
              <>
                <Lock size={15} />
                Accéder au tableau de bord
              </>
            )}
          </motion.button>
        </form>

        {/* Badges sécurité */}
        <div style={{ display: 'flex', gap: 8, marginTop: 24, flexWrap: 'wrap' }}>
          {[
            { icon: '🔒', text: 'Session sécurisée' },
            { icon: '🛡️', text: 'Accès CETUD' },
            { icon: '📊', text: 'Données EMD 2015/2019' },
          ].map(({ icon, text }) => (
            <div key={text} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, padding: '5px 11px', borderRadius: 20,
              background: theme.panel, border: `1px solid ${theme.border}`,
              color: theme.muted,
            }}>
              <span>{icon}</span> {text}
            </div>
          ))}
        </div>


        {/* Retour accueil */}
        <button
          onClick={() => navigate('/')}
          style={{
            marginTop: 20, background: 'none', border: 'none',
            color: theme.muted, fontSize: 12.5, cursor: 'pointer',
            textAlign: 'left', padding: 0, transition: 'color 0.2s',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => e.currentTarget.style.color = theme.text}
          onMouseLeave={e => e.currentTarget.style.color = theme.muted}
        >
          ← Retour à l'espace citoyen
        </button>
      </motion.div>
    </div>
  );
}
