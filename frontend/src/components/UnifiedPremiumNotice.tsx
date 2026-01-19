import { motion } from "framer-motion";
import { Crown, Sparkles } from "lucide-react";

interface UnifiedPremiumNoticeProps {
  featureName?: string;
  className?: string;
  /**
   * Variante des Banners:
   * - "default": Abgerundeter Banner mit Margin (für normale Seiten)
   * - "fullWidth": Volle Breite, direkt unter Navbar (für Optimizer, Compare)
   */
  variant?: "default" | "fullWidth";
}

/**
 * Einheitlicher Premium Banner - Blauer Style
 * Verwendet auf: Optimizer, Compare, Generate, BetterContracts, LegalLens
 */
export default function UnifiedPremiumNotice({
  featureName = "Diese Funktion",
  className = "",
  variant = "default"
}: UnifiedPremiumNoticeProps) {

  const isFullWidth = variant === "fullWidth";

  // Full-Width: Volle Bildschirmbreite mit negativem Margin
  const fullWidthStyles: React.CSSProperties = {
    width: '100vw',
    marginLeft: 'calc(-50vw + 50%)',
    borderRadius: 0,
    padding: '14px 24px',
    marginBottom: '0',
    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.2)'
  };

  // Default: Abgerundeter Banner
  const defaultStyles: React.CSSProperties = {
    width: '100%',
    borderRadius: '16px',
    padding: '20px 24px',
    marginBottom: '24px',
    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)'
  };

  const containerStyles: React.CSSProperties = {
    ...(isFullWidth ? fullWidthStyles : defaultStyles),
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
    flexWrap: 'wrap' as const
  };

  return (
    <motion.div
      className={className}
      style={containerStyles}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: isFullWidth ? '12px' : '16px',
        maxWidth: '1200px',
        margin: isFullWidth ? '0 auto' : undefined,
        paddingLeft: isFullWidth ? '24px' : undefined
      }}>
        <div style={{
          width: isFullWidth ? '36px' : '48px',
          height: isFullWidth ? '36px' : '48px',
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: isFullWidth ? '8px' : '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          flexShrink: 0
        }}>
          <Crown size={isFullWidth ? 18 : 24} />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
          <h3 style={{
            color: 'white',
            fontSize: isFullWidth ? '14px' : '16px',
            fontWeight: 600,
            margin: 0
          }}>
            Premium-Feature
          </h3>
          <p style={{
            color: 'rgba(255, 255, 255, 0.85)',
            fontSize: isFullWidth ? '13px' : '14px',
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
          borderRadius: isFullWidth ? '8px' : '10px',
          padding: isFullWidth ? '10px 16px' : '12px 20px',
          fontSize: '14px',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          marginRight: isFullWidth ? '24px' : undefined
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
