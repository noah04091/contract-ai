// 📁 src/components/LegendaryPremiumNotice.tsx
import React from "react";
import { motion } from "framer-motion";
import { Rocket } from "lucide-react";
import styles from "./LegendaryPremiumNotice.module.css";

interface LegendaryPremiumNoticeProps {
  onUpgrade: () => void;
  className?: string;
}

const LegendaryPremiumNotice: React.FC<LegendaryPremiumNoticeProps> = ({ 
  onUpgrade, 
  className 
}) => {
  return (
    <motion.div 
      className={`${styles.premiumNotice} ${className || ''}`}
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      {/* Animated Background Gradient */}
      <div className={styles.animatedBackground}></div>
      
      <div className={styles.content}>
        <motion.div 
          className={styles.icon}
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          ✨
        </motion.div>
        
        <div className={styles.textContent}>
          <motion.h3 
            className={styles.title}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            KI-Vertragsoptimierung
          </motion.h3>
          
          <motion.p 
            className={styles.description}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            Analysiere Verträge mit fortschrittlicher KI, erkenne Risiken und erhalte 
            professionelle Optimierungsvorschläge auf Kanzlei-Niveau.
          </motion.p>
          
          <motion.button 
            onClick={onUpgrade}
            className={styles.upgradeButton}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <span className={styles.buttonContent}>
              <Rocket size={18} />
              Jetzt Premium aktivieren
            </span>
            <motion.div
              className={styles.buttonShine}
              animate={{ left: ['100%', '-100%'] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
};

export default LegendaryPremiumNotice;