import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../theme';
import ThemeToggle from '../components/ThemeToggle';
import {
  BusFront, ArrowLeft, MessageCircleHeart, Star, Send, CheckCircle2, Loader2,
} from 'lucide-react';

const API = 'http://localhost:8000';

const fade = { hidden: { opacity: 0, y: 18 }, visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 18 } } };
const stagger = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } } };

const MODES = ['Bus DDD', 'Tata', 'Car rapide', 'Ndiaga Ndiaye', 'Minibus', 'Taxi', 'Taxi clando', 'PTB', 'Autre'];
const PROBLEMES = [
  { value: 'securite', label: 'Sécurité / agression' },
  { value: 'attente', label: "Temps d'attente trop long" },
  { value: 'prix', label: 'Prix trop élevé' },
  { value: 'confort', label: 'Confort / surcharge' },
  { value: 'etat_infrastructure', label: "État de l'arrêt / véhicule" },
  { value: 'ponctualite', label: 'Ponctualité' },
  { value: 'aucun', label: 'Aucun problème particulier' },
  { value: 'autre', label: 'Autre' },
];

export default function AvisCitoyenPage() {
  const navigate = useNavigate();
  const { theme, isDark } = useTheme();
  const [note, setNote] = useState(0);
  const [hoverNote, setHoverNote] = useState(0);
  const [mode, setMode] = useState('');
  const [probleme, setProbleme] = useState('');
  const [quartier, setQuartier] = useState('');
  const [commentaire, setCommentaire] = useState('');
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [envoye, setEnvoye] = useState(false);

  const valid = note > 0 && mode !== '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!valid) { setErreur('Merci de donner une note et de préciser le mode de transport utilisé.'); return; }
    setErreur(null); setLoading(true);
    try {
      const res = await fetch(`${API}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          note_satisfaction: note,
          mode_utilise: mode,
          type_probleme: probleme || null,
          quartier: quartier || null,
          commentaire: commentaire || null,
        }),
      });
      if (!res.ok) throw new Error();
      setEnvoye(true);
    } catch {
      setErreur("Impossible d'envoyer votre avis pour le moment. Réessayez dans un instant.");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setNote(0); setMode(''); setProbleme(''); setQuartier(''); setCommentaire('');
    setEnvoye(false); setErreur(null);
  };

  const inputStyle = {
    width: '100%', padding: '10px 14px', borderRadius: 10,
    background: theme.input || theme.panel, border: `1px solid ${theme.border}`,
    color: theme.text, fontSize: 13.5, fontFamily: 'Inter, sans-serif', outline: 'none',
  };

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger}
      style={{ minHeight: '100vh', background: theme.bg, color: theme.text, fontFamily: 'Inter, sans-serif' }}>

      {/* NAVBAR */}
      <motion.nav variants={fade} style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '18px 32px', borderBottom: `1px solid ${theme.border}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/')} style={{
            background: theme.panel, border: `1px solid ${theme.border}`,
            borderRadius: 20, padding: '7px 15px', color: theme.textSub,
            cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <ArrowLeft size={14} /> Accueil
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BusFront size={18} color="#ff6b35" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>Transport<span style={{ color: '#ff6b35' }}>Dakar</span></span>
          </div>
        </div>
        <ThemeToggle />
      </motion.nav>

      <main style={{ maxWidth: 640, margin: '0 auto', padding: '48px 24px 64px' }}>

        <motion.div variants={fade} style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'rgba(255,212,59,0.12)', border: '1px solid rgba(255,212,59,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <MessageCircleHeart size={26} color="#ffd43b" />
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px', letterSpacing: '-0.3px' }}>
            Cellule d'écoute usagers
          </h1>
          <p style={{ fontSize: 13.5, color: theme.muted, margin: 0, lineHeight: 1.7 }}>
            Votre avis compte. Donnez votre satisfaction sur un trajet récent ou signalez
            un problème — ouvert à tous, sans connexion. Vos retours aident le CETUD à
            améliorer le réseau de transport de Dakar.
          </p>
        </motion.div>

        <AnimatePresence mode="wait">
          {envoye ? (
            <motion.div key="merci" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
              style={{
                background: theme.panelSolid, border: '1px solid rgba(105,219,124,0.3)',
                borderRadius: 16, padding: '36px 28px', textAlign: 'center', boxShadow: theme.shadow,
              }}>
              <CheckCircle2 size={36} color="#69db7c" style={{ marginBottom: 14 }} />
              <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 8px' }}>Merci pour votre avis !</h2>
              <p style={{ fontSize: 13, color: theme.muted, margin: '0 0 20px' }}>
                Votre signalement a bien été enregistré et sera pris en compte dans les analyses du CETUD.
              </p>
              <button onClick={resetForm} style={{
                padding: '10px 22px', borderRadius: 10, background: '#ff6b35', border: 'none',
                color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
                Donner un autre avis
              </button>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={handleSubmit} variants={fade}
              style={{
                background: theme.panelSolid, border: `1px solid ${theme.border}`,
                borderRadius: 16, padding: '28px 26px', boxShadow: theme.shadow,
                display: 'flex', flexDirection: 'column', gap: 18,
              }}>

              {/* Note étoiles */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: theme.textSub, display: 'block', marginBottom: 10 }}>
                  Globalement, votre satisfaction pour ce trajet ?
                </label>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <button type="button" key={n}
                      onClick={() => setNote(n)}
                      onMouseEnter={() => setHoverNote(n)}
                      onMouseLeave={() => setHoverNote(0)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
                    >
                      <Star size={32}
                        fill={(hoverNote || note) >= n ? '#ffd43b' : 'none'}
                        color={(hoverNote || note) >= n ? '#ffd43b' : theme.border}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
                <div style={{ textAlign: 'center', fontSize: 11.5, color: theme.muted, marginTop: 4 }}>
                  {note === 0 && 'Cliquez sur une étoile'}
                  {note === 1 && 'Très insatisfait'}
                  {note === 2 && 'Insatisfait'}
                  {note === 3 && 'Neutre'}
                  {note === 4 && 'Satisfait'}
                  {note === 5 && 'Très satisfait'}
                </div>
              </div>

              {/* Mode */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: theme.textSub, display: 'block', marginBottom: 6 }}>
                  Mode de transport utilisé *
                </label>
                <select value={mode} onChange={e => setMode(e.target.value)} style={inputStyle} required>
                  <option value="">Sélectionner...</option>
                  {MODES.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>

              {/* Problème */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: theme.textSub, display: 'block', marginBottom: 6 }}>
                  Y a-t-il un problème à signaler ?
                </label>
                <select value={probleme} onChange={e => setProbleme(e.target.value)} style={inputStyle}>
                  <option value="">Aucun en particulier</option>
                  {PROBLEMES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              {/* Quartier */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: theme.textSub, display: 'block', marginBottom: 6 }}>
                  Quartier / zone concernée (optionnel)
                </label>
                <input type="text" value={quartier} onChange={e => setQuartier(e.target.value)}
                  placeholder="Ex : Médina, Parcelles Assainies, Pikine..." style={inputStyle} maxLength={80} />
              </div>

              {/* Commentaire */}
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: theme.textSub, display: 'block', marginBottom: 6 }}>
                  Commentaire libre (optionnel)
                </label>
                <textarea value={commentaire} onChange={e => setCommentaire(e.target.value)}
                  placeholder="Décrivez votre expérience..." rows={4} maxLength={600}
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                <div style={{ fontSize: 10.5, color: theme.muted, textAlign: 'right', marginTop: 4 }}>{commentaire.length}/600</div>
              </div>

              {erreur && (
                <div style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.25)', borderRadius: 10, padding: '10px 14px', color: '#ff6b6b', fontSize: 12.5 }}>
                  {erreur}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '13px 24px', borderRadius: 12, border: 'none',
                background: loading ? theme.border : '#ff6b35',
                color: loading ? theme.textSub : '#fff', fontWeight: 700, fontSize: 14,
                cursor: loading ? 'default' : 'pointer', fontFamily: 'Inter, sans-serif',
                boxShadow: loading ? 'none' : '0 4px 18px rgba(255,107,53,0.3)',
              }}>
                {loading
                  ? <motion.span style={{ display: 'flex' }} animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }}><Loader2 size={16} /></motion.span>
                  : <Send size={16} />}
                {loading ? 'Envoi en cours...' : 'Envoyer mon avis'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p style={{ textAlign: 'center', fontSize: 11, color: theme.muted, marginTop: 24 }}>
          Vos avis sont anonymes et utilisés uniquement à des fins d'amélioration du réseau de transport.
        </p>
      </main>
    </motion.div>
  );
}
