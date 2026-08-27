// 📁 frontend/src/components/Celebration/AchievementToast.tsx
// 🏆 Premium Achievement Toast - Like Duolingo/Notion

import { motion, AnimatePresence } from 'framer-motion';
import styles from './AchievementToast.module.css';

interface AchievementToastProps {
  isVisible: boolean;
  title: string;
  description: string;
  icon: string;
  onClose: () => void;
}

// ⚠️ 27.08.2026 (Noahs Handy-Test: "links abgeschnitten"):
// In den drei Bewegungs-Zuständen stand zusätzlich x: "-50%". Das war die
// Zentrierung für den Desktop — framer-motion schreibt sie aber als INLINE-Style
// ins Element, und dagegen kommt keine CSS-Regel an. Die Handy-Regel
// (left/right: 16px, transform: none) lief deshalb ins Leere: Die Meldung wurde
// weiterhin um die halbe eigene Breite nach links geschoben und ragte aus dem Bild.
// Die Zentrierung übernimmt jetzt vollständig das Stylesheet, ohne transform.
// Der Bewegung bleiben nur y und scale, und beides stört die Position nicht.
export function AchievementToast({
  isVisible,
  title,
  description,
  icon,
  onClose
}: AchievementToastProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={styles.toastContainer}
          initial={{ opacity: 0, y: -100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.8 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 25
          }}
        >
          <div className={styles.toast}>
            {/* Glow effect */}
            <div className={styles.glow} />

            {/* Icon */}
            <motion.div
              className={styles.iconContainer}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{
                type: 'spring',
                stiffness: 400,
                damping: 15,
                delay: 0.2
              }}
            >
              <span className={styles.icon}>{icon}</span>
            </motion.div>

            {/* Content */}
            <div className={styles.content}>
              <motion.h4
                className={styles.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                {title}
              </motion.h4>
              <motion.p
                className={styles.description}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                {description}
              </motion.p>
            </div>

            {/* Close button */}
            <motion.button
              className={styles.closeButton}
              onClick={onClose}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              ×
            </motion.button>

            {/* Progress bar for auto-close */}
            <motion.div
              className={styles.progressBar}
              initial={{ scaleX: 1 }}
              animate={{ scaleX: 0 }}
              transition={{ duration: 5, ease: 'linear' }}
              onAnimationComplete={onClose}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default AchievementToast;
