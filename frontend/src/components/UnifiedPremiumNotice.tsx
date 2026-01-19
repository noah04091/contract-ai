import { motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";
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
      className={`${styles.premiumBanner} ${className}`}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.bannerLeft}>
        <div className={styles.iconWrapper}>
          <Crown size={24} />
        </div>
        <div className={styles.bannerContent}>
          <h3 className={styles.bannerTitle}>Premium-Feature</h3>
          <p className={styles.bannerSubtitle}>
            {featureName} ist nur mit Premium oder Business verfügbar
          </p>
        </div>
      </div>

      <motion.button
        className={styles.upgradeButton}
        onClick={() => window.location.href = '/pricing'}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
      >
        <Sparkles size={16} />
        <span>Jetzt upgraden</span>
      </motion.button>
    </motion.div>
  );
}
