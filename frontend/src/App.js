import React, { useState } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { ThemeProvider } from './theme';
import WelcomePage      from './pages/WelcomePage';
import FormPage         from './pages/FormPage';
import ZonesRisquePage  from './pages/ZonesRisquePage';
import AnomalyDashboard from './pages/AnomalyDashboard';
import LoginDecideurs   from './pages/LoginDecideurs';
import DecideursLayout  from './pages/DecideursLayout';
import ProtectedRoute   from './components/ProtectedRoute';
import VueGenerale      from './pages/VueGenerale';
import SimulateurRisque  from './pages/SimulateurRisque';
import MlInsights        from './pages/MlInsights';
import SegmentationPage    from './pages/SegmentationPage';
import EvolutionTemporelle from './pages/EvolutionTemporelle';
import SatisfactionPage    from './pages/SatisfactionPage';
import AvisCitoyenPage     from './pages/AvisCitoyenPage';
import CockpitDakar        from './pages/CockpitDakar';

import './App.css';

function App() {
  const location = useLocation();
  const [formData, setFormData] = useState({
    age: 30, sexe: 1, niveau_instruction: 3, actif: 1, etudiant: 2,
    permis: 1, freq_tc: 3, nb_deplacements: 2, nb_vehicules: 1,
    revenu: 150000, duree_estimee: 30, cout_estime: 300,
    quartier_depart: 110401, quartier_arrivee: 110401,
  });
  const [resultat, setResultat]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [erreur, setErreur]       = useState(null);
  const [activeTab, setActiveTab] = useState('form');

  const handleChange = (e) => {
    const val = e.target.name === 'revenu'
      ? parseFloat(e.target.value) || 0
      : parseInt(e.target.value) || 0;

    const updated = { ...formData, [e.target.name]: val };

    // Si l'âge passe sous 18 : réinitialiser les champs masqués
    if (e.target.name === 'age' && val < 18) {
      updated.permis       = 2;   // Non
      updated.nb_vehicules = 0;
      updated.revenu       = 0;
    }

    setFormData(updated);
  };

  const handleSubmit = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    setLoading(true); setErreur(null);
    const dataToSend = {
      ...formData,
      // Forcer revenu et véhicules à 0 pour les mineurs
      revenu:       (formData.age < 18 || formData.etudiant === 1) ? 0 : formData.revenu,
      nb_vehicules: formData.age < 18 ? 0 : formData.nb_vehicules,
      permis:       formData.age < 18 ? 2 : formData.permis,
    };
    try {
      const res = await fetch('http://localhost:8000/recommander', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSend),
      });
      if (!res.ok) throw new Error('Erreur API');
      setResultat(await res.json()); setActiveTab('result');
    } catch (err) { setErreur(err.message); }
    finally { setTimeout(() => setLoading(false), 800); }
  };

  const resetForm = () => { setResultat(null); setActiveTab('form'); setErreur(null); };

  return (
    <ThemeProvider>
    <div className="app-container">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>

          {/* PUBLIC */}
          <Route path="/" element={<WelcomePage />} />
          <Route path="/planning" element={
            <FormPage formData={formData} handleChange={handleChange}
              handleSubmit={handleSubmit} loading={loading} erreur={erreur}
              resultat={resultat} activeTab={activeTab} resetForm={resetForm} />
          } />
          <Route path="/avis" element={<AvisCitoyenPage />} />

          {/* AUTH */}
          <Route path="/login-decideurs" element={<LoginDecideurs />} />

          {/* DÉCIDEURS protégés */}
          <Route path="/decideurs" element={
            <ProtectedRoute><DecideursLayout /></ProtectedRoute>
          }>
            <Route index                element={<VueGenerale />} />
            <Route path="zones-risque" element={<ZonesRisquePage />} />
            <Route path="anomalies"    element={<AnomalyDashboard />} />
            <Route path="simulateur"    element={<SimulateurRisque />} />
            <Route path="ml-insights"  element={<MlInsights />} />
            <Route path="segmentation" element={<SegmentationPage />} />
            <Route path="evolution"    element={<EvolutionTemporelle />} />
            <Route path="satisfaction" element={<SatisfactionPage />} />
            <Route path="cockpit"      element={<CockpitDakar />} />
          </Route>

        </Routes>
      </AnimatePresence>
    </div>
    </ThemeProvider>
  );
}

export default App;