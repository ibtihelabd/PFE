import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BusFront, ArrowLeft, ArrowRight, User, Users, GraduationCap, 
  Briefcase, BookOpen, Car, Bus, Navigation, Truck, 
  Wallet, Clock, CreditCard, Check, Lightbulb, Map, RotateCcw, Info, Zap, Leaf
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingScreen from '../components/LoadingScreen';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../theme';
import './FormPage.css';

// ==========================================
// Animated Counter Component
// ==========================================
const AnimatedCounter = ({ value, duration = 1 }) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (start === end) return;

    let startTime = null;

    const animateNumber = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressRatio = Math.min(progress / (duration * 1000), 1);
      const easeOut = 1 - Math.pow(1 - progressRatio, 3);
      
      setCount(start + easeOut * (end - start));

      if (progressRatio < 1) {
        window.requestAnimationFrame(animateNumber);
      } else {
        setCount(end);
      }
    };

    window.requestAnimationFrame(animateNumber);
  }, [value, duration]);

  return <span>{count.toFixed(1)}</span>;
};

// ==========================================
// Constants
// ==========================================
const STEPS = [
  { id: 0, title: "Profil", fullName: "Votre Profil" },
  { id: 1, title: "Sit.", fullName: "Situation" },
  { id: 2, title: "Trajet", fullName: "Votre Trajet" },
  { id: 3, title: "Budget", fullName: "Budget & Temps" }
];

const LEFT_PANEL_CONTENT = [
  {
    title: "Parlez-nous de vous",
    description: "Vos informations de base nous aident à cerner vos besoins."
  },
  {
    title: "Votre situation",
    description: "Votre statut impacte le coût et le temps de transport."
  },
  {
    title: "Votre trajet",
    description: "Indiquez vos points de départ et d'arrivée pour optimiser votre itinéraire."
  },
  {
    title: "Budget & contraintes de temps",
    description: "Vos préférences financières et temporelles."
  }
];

// ==========================================
// Sub-components
// ==========================================
const InputCard = ({ icon: Icon, label, note, children }) => (
  <div className="input-card">
    <div className="input-card-header">
      <Icon size={18} className="input-card-icon" />
      <span className="input-card-label">{label}</span>
      <div className="input-card-line"></div>
    </div>
    <div className="input-card-body">
      {children}
    </div>
    {note && (
      <div className="input-card-note">
        <Lightbulb size={12} className="note-icon" />
        <span>{note}</span>
      </div>
    )}
  </div>
);

// ==========================================
// Main FormPage Component
// ==========================================
const FormPage = ({ 
  formData, 
  handleChange, 
  handleSubmit, 
  loading, 
  erreur, 
  resultat, 
  activeTab, 
  resetForm 
}) => {
  const navigate = useNavigate();
  const { theme, isDark } = useTheme();
  const [currentStep, setCurrentStep] = useState(0);

  const nextStep = () => {
    if (currentStep < 3) setCurrentStep(c => c + 1);
  };

  const prevStep = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  if (loading) return <LoadingScreen />;

  // ==========================================
  // RESULT DASHBOARD
  // ==========================================
  if (activeTab === 'result' && resultat) {
    const mainProb = resultat.probabilite || (resultat.top3_modes && resultat.top3_modes.length > 0 ? resultat.top3_modes[0].probabilite : 0);

    return (
      <div className="dashboard-container">
        <motion.div 
          className="dashboard-hero"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="hero-particles"></div>
          
          <div className="hero-content">
            <motion.div 
              className="badge-profil-premium"
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.5, delay: 0.1 }}
            >
              <div className="shimmer-effect"></div>
              PROFIL : {resultat.segment_label}
            </motion.div>

            <motion.h2 
              className="hero-title-result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              🏆 Votre meilleur mode de transport
            </motion.h2>

            <motion.div 
              className="hero-card-premium"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", bounce: 0.4, delay: 0.4 }}
            >
              <motion.div 
                className="hero-icon-wrapper"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.6, delay: 0.5 }}
              >
                <div className="glow-pulse"></div>
                <span className="hero-icon-emoji">{resultat.mode_icone}</span>
              </motion.div>
              
              <h1 className="hero-mode-name">{resultat.mode_recommande}</h1>

              <motion.div 
                className="hero-match-badge"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                 <AnimatedCounter value={mainProb} />% de match
              </motion.div>

              <div className="hero-stats-row">
                <motion.div
                  className="hero-stat-pill"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.7 }}
                >
                  <span className="pill-icon">⏱️</span>
                  <div className="pill-text">
                    <span className="pill-label">Durée médiane</span>
                    <span className="pill-val">{resultat.duree_mediane || resultat.duree_fourchette}</span>
                  </div>
                </motion.div>

                <motion.div
                  className="hero-stat-pill"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.85 }}
                >
                  <span className="pill-icon">💰</span>
                  <div className="pill-text">
                    <span className="pill-label">Coût / trajet</span>
                    <span className="pill-val">{resultat.cout_median || resultat.cout_fourchette}</span>
                  </div>
                </motion.div>
                {resultat.cout_mensuel_str && (
                  <motion.div
                    className="hero-stat-pill"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 1.0 }}
                  >
                    <span className="pill-icon">📅</span>
                    <div className="pill-text">
                      <span className="pill-label">Budget mensuel</span>
                      <span className="pill-val">{resultat.cout_mensuel_str}</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </motion.div>

            <motion.div 
              className="hero-description"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
               <Info size={18} className="info-icon" />
               <p>{resultat.segment_conseil}</p>
            </motion.div>
          </div>
        </motion.div>

        <motion.div 
          className="dashboard-details"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.9 }}
        >
          <div className="details-content">
            <div className="section-title-wrapper">
              <h2>Comparatif des alternatives</h2>
              <p>Classement basé sur votre profil</p>
              <div className="title-separator"></div>
            </div>

            <div className="alternatives-wrapper">
              {resultat.top3_modes && resultat.top3_modes.map((mode, idx) => {
                const rankColor = idx === 0 ? "orange" : idx === 1 ? "blue" : "grey";
                return (
                  <motion.div 
                    key={idx} 
                    className="alternative-rank-card"
                    initial={{ y: 30, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 1.0 + (idx * 0.15) }}
                  >
                    <div className="rank-card-header">
                      <div className={`rank-badge rank-${rankColor}`}>#{idx + 1}</div>
                      <span className="rank-emoji">{mode.icone}</span>
                      <h4 className="rank-name">{mode.mode}</h4>
                      
                      <div className="rank-match">
                        <span className="match-big"><AnimatedCounter value={mode.probabilite} />%</span>
                        <span className="match-sub">match</span>
                      </div>
                    </div>

                    <div className="rank-stats">
                      <span>⏱️ {mode.duree_fourchette}</span>
                      <span>💰 {mode.cout_fourchette}</span>
                    </div>

                    <div className="progress-track">
                      <motion.div 
                        className={`progress-fill fill-${rankColor}`}
                        initial={{ width: "0%" }}
                        animate={{ width: `${mode.probabilite}%` }}
                        transition={{ duration: 0.8, delay: 1.2 + (idx * 0.2), ease: "easeOut" }}
                      ></motion.div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              className="insights-wrapper"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.4 }}
            >
              {/* Fourchette durée Q1-Q3 */}
              <div className="insight-card">
                <Zap size={20} className="insight-icon text-blue" />
                <div className="insight-body">
                  <h3>Durée (Q1–Q3)</h3>
                  <p>{resultat.duree_fourchette}</p>
                </div>
              </div>
              {/* Fourchette coût Q1-Q3 */}
              <div className="insight-card">
                <Wallet size={20} className="insight-icon text-orange" />
                <div className="insight-body">
                  <h3>Coût trajet (Q1–Q3)</h3>
                  <p>{resultat.cout_fourchette}</p>
                </div>
              </div>
             
              {/* Part du revenu si disponible */}
              {resultat.part_budget && (
                <div className="insight-card">
                  <Leaf size={20} className="insight-icon text-green" />
                  <div className="insight-body">
                    <h3>Part du revenu</h3>
                    <p>{resultat.part_budget}</p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Source de l'estimation */}
            {resultat.estimation_source && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 1.7 }}
                style={{
                  margin: '0 auto 16px', maxWidth: 580,
                  padding: '8px 14px', borderRadius: 8,
                  background: 'rgba(116,192,252,0.06)',
                  border: '1px solid rgba(116,192,252,0.18)',
                  display: 'flex', alignItems: 'center', gap: 8, fontSize: 11,
                  color: isDark ? 'var(--dtk-muted)' : 'rgba(0,0,0,0.6)',
                }}
              >
                <Info size={13} style={{ color: '#74c0fc', flexShrink: 0 }} />
                Estimation basée sur {resultat.estimation_source === 'segment×mode'
                  ? `${resultat.nb_reference} usagers au profil similaire (stats segment × mode)`
                  : `${resultat.nb_reference} usagers utilisant ce mode`}
              </motion.div>
            )}

            <motion.div 
              className="reset-wrapper"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.6 }}
            >
              <button onClick={() => { setCurrentStep(0); resetForm(); }} className="premium-reset-btn">
                <RotateCcw size={20} className="reset-icon" />
                Refaire une simulation
              </button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    );
  }

  // ==========================================
  // FORM LOGIC
  // ==========================================

  const progressPercentage = ((currentStep + 1) / 4) * 100;
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

  const renderStepContent = () => {
    switch(currentStep) {
      case 0:
        return (
          <motion.div 
            key="step0"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="step-content"
          >
            <div className="step-header">
              <User size={24} className="step-header-icon" />
              <h3>{STEPS[0].fullName}</h3>
            </div>
            
            <motion.div className="step-grid" initial="hidden" animate="visible" variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}>
              {/* Âge */}
              <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                <InputCard icon={User} label="Âge">
                  <input 
                    type="number" 
                    name="age" 
                    value={formData.age} 
                    onChange={handleChange} 
                    min="5" 
                    max="100" 
                    required 
                    className="stepper-input" 
                  />
                </InputCard>
              </motion.div>

              <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                <InputCard icon={Users} label="Sexe">
                  <select name="sexe" value={formData.sexe} onChange={handleChange} className="stepper-select">
                    <option value="1">Homme</option>
                    <option value="2">Femme</option>
                  </select>
                </InputCard>
              </motion.div>

              <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                <InputCard icon={GraduationCap} label="Niveau d'instruction">
                  <select name="niveau_instruction" value={formData.niveau_instruction} onChange={handleChange} className="stepper-select">
                    <option value="1">Aucun</option>
                    <option value="2">Primaire</option>
                    <option value="3">Secondaire</option>
                    <option value="4">Supérieur</option>
                  </select>
                </InputCard>
              </motion.div>
            </motion.div>
          </motion.div>
        );
      case 1:
        return (
          <motion.div 
            key="step1"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="step-content"
          >
            <div className="step-header">
              <Briefcase size={24} className="step-header-icon" />
              <h3>{STEPS[1].fullName}</h3>
            </div>

            <motion.div className="step-grid" initial="hidden" animate="visible" variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}>
              <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                <InputCard icon={Briefcase} label="Actif professionnel">
                  <select name="actif" value={formData.actif} onChange={handleChange} className="stepper-select">
                    <option value="1">Oui</option>
                    <option value="2">Non</option>
                  </select>
                </InputCard>
              </motion.div>

              <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                <InputCard icon={BookOpen} label="Étudiant">
                  <select name="etudiant" value={formData.etudiant} onChange={handleChange} className="stepper-select">
                    <option value="1">Oui</option>
                    <option value="2">Non</option>
                  </select>
                </InputCard>
              </motion.div>

              {/* Permis - masqué si mineur (< 18 ans) ou étudiant */}
              {formData.age >= 18 && formData.etudiant !== 1 && (
                <motion.div
                  variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <InputCard icon={Car} label="Permis de conduire" note="Si oui, nous pourrions envisager d'autres moyens de transports.">
                    <select name="permis" value={formData.permis} onChange={handleChange} className="stepper-select">
                      <option value="1">Oui</option>
                      <option value="2">Non</option>
                    </select>
                  </InputCard>
                </motion.div>
              )}

              {/* Message mineur */}
              {formData.age < 18 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(255,169,77,0.08)', border: '1px solid rgba(255,169,77,0.25)',
                    display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5,
                    color: '#ffa94d', fontFamily: 'Inter, sans-serif',
                  }}
                >
                  <span style={{ fontSize: 16 }}>🔒</span>
                  Les champs <strong>permis</strong>, <strong>véhicules</strong> et <strong>revenu</strong> ne s'appliquent pas aux mineurs.
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div 
            key="step2"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="step-content"
          >
            <div className="step-header">
              <Map size={24} className="step-header-icon" />
              <h3>{STEPS[2].fullName}</h3>
            </div>

            <motion.div className="step-grid" initial="hidden" animate="visible" variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}>
              <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                <InputCard icon={Map} label="Quartier de départ" note="Sélectionnez votre point de départ">
                  <select name="quartier_depart" value={formData.quartier_depart} onChange={handleChange} className="stepper-select">
                    <option value="110101">Cite Bissap</option>
                    <option value="110102">Ouagou Niayes</option>
                    <option value="110103">Usine Bene Tali</option>
                    <option value="110104">Usine Niari Tali</option>
                    <option value="110105">Usine Park Kayes</option>
                    <option value="110201">Mermoz</option>
                    <option value="110202">Sacre Coeur VDN</option>
                    <option value="110203">SICAP Baobab</option>
                    <option value="110301">Camberene Est</option>
                    <option value="110302">Camberene Centre</option>
                    <option value="110303">Camberene Ouest</option>
                    <option value="110401">Colobane</option>
                    <option value="110402">Fass</option>
                    <option value="110403">Gueule Tapee</option>
                    <option value="110501">Castor Derkle</option>
                    <option value="110502">Dieuppeul</option>
                    <option value="110601">Amitie Rue 10</option>
                    <option value="110602">Fann Hock</option>
                    <option value="110603">Fann Residence</option>
                    <option value="110604">Hopital Fann/Universite</option>
                  </select>
                </InputCard>
              </motion.div>

              <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                <InputCard icon={Map} label="Quartier d'arrivée" note="Sélectionnez votre destination">
                  <select name="quartier_arrivee" value={formData.quartier_arrivee} onChange={handleChange} className="stepper-select">
                    <option value="110101">Cite Bissap</option>
                    <option value="110102">Ouagou Niayes</option>
                    <option value="110103">Usine Bene Tali</option>
                    <option value="110104">Usine Niari Tali</option>
                    <option value="110105">Usine Park Kayes</option>
                    <option value="110201">Mermoz</option>
                    <option value="110202">Sacre Coeur VDN</option>
                    <option value="110203">SICAP Baobab</option>
                    <option value="110301">Camberene Est</option>
                    <option value="110302">Camberene Centre</option>
                    <option value="110303">Camberene Ouest</option>
                    <option value="110401">Colobane</option>
                    <option value="110402">Fass</option>
                    <option value="110403">Gueule Tapee</option>
                    <option value="110501">Castor Derkle</option>
                    <option value="110502">Dieuppeul</option>
                    <option value="110601">Amitie Rue 10</option>
                    <option value="110602">Fann Hock</option>
                    <option value="110603">Fann Residence</option>
                    <option value="110604">Hopital Fann/Universite</option>
                  </select>
                </InputCard>
              </motion.div>

              <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                <InputCard icon={Bus} label="Fréquence Transport en Commun">
                  <select name="freq_tc" value={formData.freq_tc} onChange={handleChange} className="stepper-select">
                    <option value="1">Tous les jours</option>
                    <option value="2">1x/semaine</option>
                    <option value="3">1x/mois</option>
                    <option value="4">Rarement</option>
                    <option value="5">Jamais</option>
                  </select>
                </InputCard>
              </motion.div>

              <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                <InputCard icon={Navigation} label="Nb de déplacements par jour">
                  <input type="number" name="nb_deplacements" value={formData.nb_deplacements} onChange={handleChange} min="1" max="10" required className="stepper-input" />
                </InputCard>
              </motion.div>

              {/* Véhicules — masqué si mineur */}
              {formData.age >= 18 && (
                <motion.div
                  variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <InputCard icon={Truck} label="Nb de véhicules possédés">
                    <input type="number" name="nb_vehicules" value={formData.nb_vehicules} onChange={handleChange} min="0" max="10" className="stepper-input" />
                  </InputCard>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        );
      case 3:
        return (
          <motion.div 
            key="step3"
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.3 }}
            className="step-content"
          >
            <div className="step-header">
              <CreditCard size={24} className="step-header-icon" />
              <h3>{STEPS[3].fullName}</h3>
            </div>

            <motion.div className="step-grid" initial="hidden" animate="visible" variants={{
              visible: { transition: { staggerChildren: 0.1 } }
            }}>
              {/* Revenu — masqué si mineur OU étudiant */}
              {formData.age >= 18 && formData.etudiant !== 1 && (
                <motion.div
                  variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <InputCard icon={Wallet} label="Revenu mensuel (FCFA)" note="Pour vous proposer des solutions abordables.">
                    <input
                      type="number"
                      name="revenu"
                      value={formData.revenu}
                      onChange={handleChange}
                      step="10000"
                      className="stepper-input"
                    />
                  </InputCard>
                </motion.div>
              )}

              <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                <InputCard icon={Clock} label="Durée estimée (min)">
                  <input 
                    type="number" 
                    name="duree_estimee" 
                    value={formData.duree_estimee} 
                    onChange={handleChange} 
                    min="1" 
                    max="300" 
                    className="stepper-input" 
                  />
                </InputCard>
              </motion.div>

              <motion.div variants={{ hidden: { y: 20, opacity: 0 }, visible: { y: 0, opacity: 1 } }}>
                <InputCard icon={CreditCard} label="Coût estimé (FCFA)">
                  <input 
                    type="number" 
                    name="cout_estime" 
                    value={formData.cout_estime} 
                    onChange={handleChange} 
                    min="0" 
                    step="50" 
                    className="stepper-input" 
                  />
                </InputCard>
              </motion.div>
            </motion.div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div 
      className="split-layout"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Left Panel - Hero/Illustration */}
      <div className="left-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="panel-back-btn" onClick={() => navigate('/')}>
            <ArrowLeft size={20} /> Retour
          </button>
          <ThemeToggle />
        </div>
        
        <div className="left-panel-header">
          <BusFront size={32} className="text-primary" />
          <h2>DakarTransit</h2>
        </div>

        <div className="illustration-wrapper">
          <svg viewBox="0 0 200 200" className="network-svg">
            <motion.path 
              d="M 20 100 Q 80 20 150 120 T 180 60" 
              fill="transparent" 
              stroke="rgba(255,107,53,0.3)" 
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
            />
            <motion.path 
              d="M 40 180 Q 90 150 160 180 T 190 100" 
              fill="transparent" 
              stroke="rgba(247,201,72,0.3)" 
              strokeWidth="2"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 4, repeat: Infinity, repeatType: "reverse", delay: 1 }}
            />
            <circle cx="20" cy="100" r="4" fill="var(--primary)" />
            <circle cx="150" cy="120" r="4" fill="var(--white)" />
            <circle cx="180" cy="60" r="4" fill="var(--accent)" />
            <circle cx="40" cy="180" r="4" fill="var(--white)" />
            <circle cx="160" cy="180" r="4" fill="var(--primary)" />
            <circle cx="190" cy="100" r="4" fill="var(--accent)" />
          </svg>

          <div className="progress-ring-container">
            <svg width="140" height="140" viewBox="0 0 140 140">
              <circle 
                cx="70" cy="70" r={radius} 
                className="progress-ring-bg" 
                strokeWidth="8" fill="transparent"
              />
              <motion.circle 
                cx="70" cy="70" r={radius} 
                className="progress-ring-fill" 
                strokeWidth="8" fill="transparent"
                strokeDasharray={circumference}
                animate={{ strokeDashoffset }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </svg>
            <div className="progress-percentage">
              {Math.round(progressPercentage)}%
            </div>
          </div>
        </div>

        <div className="dynamic-text">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <h3>{LEFT_PANEL_CONTENT[currentStep].title}</h3>
              <p>{LEFT_PANEL_CONTENT[currentStep].description}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mini-stats">
          <span className="stat-pill">12 champs</span>
          <span className="stat-pill">~2 min</span>
          <span className="stat-pill">100% IA</span>
        </div>
      </div>

      {/* Right Panel - Form Stepper */}
      <div className="right-panel">
        <div className="mobile-progress-bar">
          <div className="mobile-progress-fill" style={{ width: `${progressPercentage}%` }}></div>
        </div>

        <div className="right-panel-content">
          <div className="stepper-indicator">
            {STEPS.map((step, index) => (
              <div 
                key={step.id} 
                className={`stepper-item ${currentStep === step.id ? 'active' : ''} ${currentStep > step.id ? 'completed' : ''}`}
              >
                <div className="stepper-circle">
                  {currentStep > step.id ? <Check size={16} /> : step.id + 1}
                </div>
                <span className="stepper-label">{step.title}</span>
                {index < STEPS.length - 1 && (
                  <div className={`stepper-line ${currentStep > index ? 'filled' : ''}`}></div>
                )}
              </div>
            ))}
          </div>

          <form 
            onSubmit={(e) => e.preventDefault()} 
            className="form-wizard"
          >
            <AnimatePresence mode="wait">
              {renderStepContent()}
            </AnimatePresence>

            {erreur && (
              <div className="error-alert">
                <span className="error-icon">⚠️</span>
                {erreur}
              </div>
            )}

            <div className="form-navigation">
              <button 
                type="button" 
                onClick={prevStep} 
                className="nav-btn prev-btn"
                disabled={currentStep === 0}
              >
                <ArrowLeft size={18} className="nav-icon-left" /> Précédent
              </button>
              
              {currentStep < 3 ? (
                <button 
                  type="button" 
                  onClick={(e) => {
                    e.preventDefault();
                    nextStep();
                  }} 
                  className="nav-btn next-btn"
                >
                  Suivant <ArrowRight size={18} className="nav-icon-right" />
                </button>
              ) : (
                <button 
                  type="button" 
                  onClick={handleSubmit}
                  className="nav-btn submit-final-btn"
                >
                  <span>Générer mon planning</span>
                  <ArrowRight size={18} className="nav-icon-right" />
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </motion.div>
  );
};

export default FormPage;