import { motion } from "framer-motion";
import { Crown, ArrowRight } from "lucide-react";
import styles from "./UnifiedPremiumNotice.module.css";

interface UnifiedPremiumNoticeProps {
  featureName?: string;
  className?: string;
}

export default function UnifiedPremiumNotice({
  featureName = "Diese Funktion",
  className = ""
}: UnifiedPremiumNoticeProps) {

  return (
    <motion.div
      className={`${styles.premiumNotice} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.premiumBadge}>
        <Crown size={18} />
        <span>Premium</span>
      </div>

      <div className={styles.premiumContent}>
        <h3 className={styles.premiumTitle}>
          🚀 {featureName} ist nur einen Klick entfernt
        </h3>
        <p className={styles.premiumSubtitle}>
          Schalte alle Profi-Features frei und analysiere unbegrenzt Verträge
        </p>
      </div>

      <motion.button
        className={styles.upgradeButton}
        onClick={() => window.location.href = '/pricing'}
        whileHover={{ scale: 1.05, boxShadow: "0 8px 25px rgba(0, 113, 227, 0.4)" }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <span>Jetzt Premium holen</span>
        <ArrowRight size={18} />
      </motion.button>
    </motion.div>
  );
}