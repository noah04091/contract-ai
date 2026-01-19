import { motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";

interface UnifiedPremiumNoticeProps {
  featureName?: string;
  className?: string;
}

/**
 * Einheitlicher Premium Banner - Blauer Style wie Legal Lens
 * Verwendet auf: Optimizer, Compare, Generate, BetterContracts
 */
export default function UnifiedPremiumNotice({
  featureName = "Diese Funktion",
  className = ""
}: UnifiedPremiumNoticeProps) {

  return (
    <motion.div
      className={className}
      style={{
        width: '100%',
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        borderRadius: '16px',
        padding: '20px 24px',
        marginBottom: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '20px',
        flexWrap: 'wrap' as const,
        boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
      }}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{
          width: '48px',
          height: '48px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          flexShrink: 0
        }}>
          <Crown size={24} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '4px' }}>
          <h3 style={{
            color: 'white',
            fontSize: '16px',
            fontWeight: 600,
            margin: 0
          }}>
            Premium-Feature
          </h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: '14px',
            margin: 0
          }}>
            {featureName} ist nur mit Premium oder Business verfügbar
          </p>
        </div>
      </div>

      <motion.button
        style={{
          background: 'white',
          color: '#2563eb',
          border: 'none',
          borderRadius: '10px',
          padding: '12px 20px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}
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
