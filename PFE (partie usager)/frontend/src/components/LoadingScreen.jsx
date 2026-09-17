import React from 'react';
import { motion } from 'framer-motion';
import { BusFront } from 'lucide-react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <motion.div 
      className="loading-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.5 } }}
    >
      <div className="loading-content">
        <div className="loading-anim-wrapper">
          <div className="pulse-ring"></div>
          <div className="pulse-ring delay"></div>
          <div className="bus-wrapper">
             <BusFront size={48} className="loading-icon" color="var(--primary)" />
          </div>
        </div>
        
        <h2 className="loading-text">
          Génération de votre planning<span className="dots"></span>
        </h2>
        
        <div className="progress-bar-container">
          <div className="progress-bar-indeterminate"></div>
        </div>
      </div>
    </motion.div>
  );
};

export default LoadingScreen;
