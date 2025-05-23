// src/components/InfoTooltip.tsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X } from 'lucide-react';
import styles from './InfoTooltip.module.css';

interface InfoTooltipProps {
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

const InfoTooltip: React.FC<InfoTooltipProps> = ({ 
  title, 
  content, 
  position = 'bottom',
  size = 'md'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleTooltip = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const closeTooltip = () => {
    setIsOpen(false);
  };

  // Mobile: Modal, Desktop: Tooltip
  if (isMobile) {
    return (
      <>
        <button 
          className={styles.infoButton}
          onClick={toggleTooltip}
          aria-label="Weitere Informationen"
        >
          <Info size={16} />
        </button>

        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                className={styles.mobileOverlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={closeTooltip}
              />
              <motion.div
                className={styles.mobileModal}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 500 }}
              >
                <div className={styles.mobileHeader}>
                  <h4>{title}</h4>
                  <button onClick={closeTooltip} className={styles.closeButton}>
                    <X size={18} />
                  </button>
                </div>
                <div className={styles.mobileContent}>
                  <p>{content}</p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </>
    );
  }

  // Desktop: Hover Tooltip
  return (
    <div className={styles.tooltipContainer}>
      <button 
        className={styles.infoButton}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={toggleTooltip}
        aria-label="Weitere Informationen"
      >
        <Info size={16} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className={`${styles.tooltip} ${styles[position]} ${styles[size]}`}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 10 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.tooltipArrow} />
            <div className={styles.tooltipContent}>
              <h4 className={styles.tooltipTitle}>{title}</h4>
              <p className={styles.tooltipText}>{content}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InfoTooltip;