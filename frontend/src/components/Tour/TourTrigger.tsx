// 📁 frontend/src/components/Tour/TourTrigger.tsx
// 🎯 Tour Trigger Button - Allows users to restart tours

import { useState } from 'react';
import { HelpCircle, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TourId } from '../../config/tourConfig';
import { getTourById } from '../../config/tourConfig';
import styles from './TourTrigger.module.css';

interface TourTriggerProps {
  tourId: TourId;
  onStartTour: () => void;
  variant?: 'icon' | 'button' | 'floating';
  className?: string;
}

export function TourTrigger({
  tourId,
  onStartTour,
  variant = 'icon',
  className = '',
}: TourTriggerProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const tour = getTourById(tourId);

  if (!tour) return null;

  if (variant === 'floating') {
    return (
      <motion.button
        className={`${styles.floatingButton} ${className}`}
        onClick={onStartTour}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        title={`${tour.name} starten`}
      >
        <HelpCircle size={20} />

        <AnimatePresence>
          {showTooltip && (
            <motion.div
              className={styles.floatingTooltip}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
            >
              <span className={styles.tooltipTitle}>Hilfe</span>
              <span className={styles.tooltipDesc}>Tour starten</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  if (variant === 'button') {
    return (
      <button
        className={`${styles.button} ${className}`}
        onClick={onStartTour}
      >
        <Play size={16} />
        <span>{tour.name}</span>
      </button>
    );
  }

  // Default: icon variant
  return (
    <button
      className={`${styles.iconButton} ${className}`}
      onClick={onStartTour}
      title={`${tour.name} starten`}
    >
      <HelpCircle size={18} />
    </button>
  );
}

export default TourTrigger;
