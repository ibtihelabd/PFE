import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Map, Clock, BusFront, ArrowRight, Lock,
  Shield, MessageCircleHeart,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../theme';
import logoTransportDakar from '../assets/logo-transportdakar.png';
import './WelcomePage.css';

const fade  = { hidden: { opacity: 0, y: 22 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 18 } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.15 } } };

/* ── Services usagers ── */
const FEATURES = [
  {
    icon: BusFront,
    title: 'Réseau de bus',
    desc: 'Explorez toutes les lignes de bus urbaines et suburbaines du réseau CETUD.',
    color: '#ff6b35',
  },
  {
    icon: Map,
    title: 'Itinéraires optimisés',
    desc: 'Calculez le trajet le plus rapide et économique entre deux points de Dakar.',
    color: '#74c0fc',
  },
  {
    icon: Clock,
    title: 'Planning en temps réel',
    desc: 'Générez un planning personnalisé basé sur des données fiables et actualisées.',
    color: '#69db7c',
  },
  {
    icon: MessageCircleHeart,
    title: "Cellule d'écoute",
    desc: 'Donnez votre avis sur un trajet ou signalez un problème — ouvert à tous, sans connexion.',
    color: '#ffd43b',
    path: '/avis',
  },
];

const WelcomePage = () => {
  const navigate = useNavigate();
  const { theme, isDark } = useTheme();
  const [adminHover, setAdminHover] = useState(false);
  const decideursSectionRef = useRef(null);

  const scrollToDecideurs = () => {
    decideursSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <motion.div
      className="welcome-container"
      initial="hidden" animate="visible" exit="exit"
      variants={stagger}
      style={{ background: theme.bg, color: theme.text }}
    >
      {/* ── Arrière-plan ── */}
      <div className="welcome-bg">
        <div className="bg-pattern" />
        <div className="glow glow-1" />
        <div className="glow glow-2" />
      </div>

      {/* ══════════════════════════════════════════
          NAVBAR
      ══════════════════════════════════════════ */}
      <nav className="welcome-navbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 32px' }}>

        {/* Logo */}
        <motion.div className="logo" variants={fade} style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          <img
            src={logoTransportDakar}
            alt="TransportDakar"
            style={{ height: 72, width: 'auto', display: 'block' }}
          />
          <span style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase',
            color: theme.muted, background: theme.panel, border: `1px solid ${theme.border}`,
            borderRadius: 20, padding: '3px 9px',
          }}></span>
        </motion.div>

        {/* Nav right */}
        <motion.div variants={fade} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ThemeToggle />

          {/* Cellule d'écoute — accessible à tout citoyen, sans connexion */}
          <button
            onClick={() => navigate('/avis')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 30,
              background: 'rgba(255,212,59,0.1)',
              border: '1px solid rgba(255,212,59,0.3)',
              color: '#ffd43b', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s ease', fontFamily: 'Inter, sans-serif',
            }}
          >
            <MessageCircleHeart size={14} />
            <span>Cellule d'écoute</span>
          </button>

          {/* Bouton Compte Professionnel — ramène vers la section décideurs en bas de page */}
          <button
            onClick={scrollToDecideurs}
            onMouseEnter={() => setAdminHover(true)}
            onMouseLeave={() => setAdminHover(false)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '9px 18px', borderRadius: 30,
              background: adminHover
                ? 'rgba(255,107,53,0.12)'
                : theme.panel,
              border: `1px solid ${adminHover ? 'rgba(255,107,53,0.4)' : theme.border}`,
              color: adminHover ? '#ff6b35' : theme.textSub,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s ease',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            <Lock size={14} />
            <span>Compte professionnel</span>
          </button>
        </motion.div>
      </nav>

      {/* ══════════════════════════════════════════
          HERO
      ══════════════════════════════════════════ */}
      <main className="hero-section">

        {/* Badge */}
        <motion.div className="badge-wrapper" variants={fade}>
          <div className="badge">
            <span className="badge-icon">🗺️</span>
            <span className="badge-text">Dakar Transport Intelligence · CETUD</span>
            <div className="badge-shimmer" />
          </div>
        </motion.div>

        {/* Titre principal */}
        <motion.h1 className="hero-title" variants={fade}>
          Planifiez votre mobilité
          <br />
          <span className="text-gradient">urbaine intelligemment</span>
        </motion.h1>

        <motion.p className="hero-subtitle" variants={fade}>
          Accédez aux données de transport de Dakar, générez vos itinéraires
          et optimisez vos déplacements quotidiens.
        </motion.p>

        {/* CTA */}
        <motion.div variants={fade} className="cta-wrapper" style={{ display: 'flex', gap: 14, alignItems: 'center', justifyContent: 'center' }}>
          <button className="cta-button" onClick={() => navigate('/planning')}>
            <span>Commencer mon planning</span>
            <ArrowRight size={18} className="cta-icon" />
          </button>
        </motion.div>

        {/* ── Cartes features ── */}
        <motion.div className="features-grid" variants={stagger}>
          {FEATURES.map(({ icon: Icon, title, desc, color, path }) => (
            <motion.div className="feature-card" variants={fade} key={title}
              onClick={path ? () => navigate(path) : undefined}
              style={{
                background: theme.panelSolid, border: `1px solid ${theme.border}`,
                cursor: path ? 'pointer' : 'default',
              }}
            >
              <div className="feature-icon-wrapper" style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}>
                <Icon size={22} />
              </div>
              <h3 style={{ color: theme.text }}>{title}</h3>
              <p style={{ color: theme.muted }}>{desc}</p>
            </motion.div>
          ))}
        </motion.div>

      </main>

      {/* ══════════════════════════════════════════
          SECTION INSTITUTION  (remplace l'ancien
          bloc "Espace décideurs" public)
      ══════════════════════════════════════════ */}
      <motion.section ref={decideursSectionRef} variants={fade} style={{
        position: 'relative', zIndex: 10,
        maxWidth: 900, margin: '0 auto', width: '100%',
        padding: '0 0 72px',
      }}>
        <div style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(255,107,53,0.06) 0%, rgba(116,192,252,0.04) 100%)'
            : 'linear-gradient(135deg, rgba(255,107,53,0.05) 0%, rgba(116,192,252,0.04) 100%)',
          border: `1px solid ${theme.border}`,
          borderRadius: 20, padding: '36px 40px',
          display: 'flex', alignItems: 'center', gap: 40,
          boxShadow: theme.shadow,
        }}>

          {/* Icône */}
          <div style={{
            width: 64, height: 64, borderRadius: 18, flexShrink: 0,
            background: 'rgba(255,107,53,0.12)', border: '1px solid rgba(255,107,53,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={30} color="#ff6b35" />
          </div>

          {/* Texte */}
          <div style={{ flex: 1 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
              color: '#ff6b35', marginBottom: 8,
            }}>
              Système d'aide à la décision · CETUD
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: theme.text, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
              Plateforme décisionnelle Transport Dakar
            </h2>
            <p style={{ fontSize: 13, color: theme.muted, margin: 0, lineHeight: 1.7 }}>
              Ce projet PFE intègre des modèles de Machine Learning (Isolation Forest, LOF,
              Gradient Boosting, K-Means) pour l'analyse du réseau de transport urbain de Dakar.
              Accès réservé aux gestionnaires et décideurs habilités.
            </p>
          </div>

          {/* Bouton accès */}
          <div style={{ flexShrink: 0 }}>
            <button
              onClick={() => navigate('/login-decideurs')}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 22px', borderRadius: 12,
                background: '#ff6b35', border: 'none',
                color: 'var(--dtk-text)', fontSize: 13, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                boxShadow: '0 4px 18px rgba(255,107,53,0.35)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#e85a1a'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#ff6b35'; e.currentTarget.style.transform = 'none'; }}
            >
              <Lock size={14} />
              Se connecter
            </button>
            <p style={{ fontSize: 10.5, color: theme.muted, textAlign: 'center', margin: '8px 0 0' }}>
              Accès restreint · Décideurs uniquement
            </p>
          </div>
        </div>
      </motion.section>

      {/* ── Footer ── */}
      <motion.footer className="welcome-footer" variants={fade}
        style={{ color: theme.muted, borderTop: `1px solid ${theme.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: 900, margin: '0 auto', width: '100%' }}>
          <span>© {new Date().getFullYear()} Transport Dakar — Projet de Fin d'Études</span>
          <span style={{ fontSize: 12 }}>Données CETUD · EMD Dakar 2015 · Trafic 2019</span>
        </div>
      </motion.footer>

    </motion.div>
  );
};

export default WelcomePage;
