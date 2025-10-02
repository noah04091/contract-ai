import { motion } from "framer-motion";
import { Sparkles, Crown, Zap } from "lucide-react";
import styles from "./UnifiedPremiumNotice.module.css";

interface UnifiedPremiumNoticeProps {
  title?: string;
  description?: string;
  featureName?: string;
  className?: string;
}

export default function UnifiedPremiumNotice({
  title = "Premium-Funktion",
  description,
  featureName,
  className = ""
}: UnifiedPremiumNoticeProps) {
  const defaultDescription = featureName
    ? `${featureName} ist eine Premium-Funktion. Mit einem Premium-Abonnement kannst du unbegrenzt Verträge analysieren und bekommst Zugang zu erweiterten KI-Funktionen.`
    : "Mit einem Premium-Abonnement kannst du unbegrenzt Verträge analysieren und bekommst Zugang zu erweiterten KI-Funktionen.";

  const finalDescription = description || defaultDescription;

  return (
    <motion.div
      className={`${styles.premiumNotice} ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className={styles.premiumIcon}>
        <Crown size={32} />
      </div>
      <div className={styles.premiumContent}>
        <h3 className={styles.premiumTitle}>{title}</h3>
        <p className={styles.premiumDescription}>
          {finalDescription}
        </p>
        <motion.button
          className={styles.upgradeButton}
          onClick={() => window.location.href = '/pricing'}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          transition={{ type: "spring", stiffness: 400, damping: 17 }}
        >
          <Zap size={16} />
          Jetzt upgraden
        </motion.button>
      </div>
      <div className={styles.premiumBadge}>
        <Sparkles size={16} />
        <span>Premium</span>
      </div>
    </motion.div>
  );
}