import React, { useEffect, useState } from 'react';

interface LegalPulseExplainerBannerProps {
  contractsMonitored: number;
  totalContracts: number;
  criticalCount: number;
  openActionsCount: number;
}

const STORAGE_KEY = 'legalPulse.introClosed';

/**
 * Introductory Legal Pulse hero banner.
 * - Left: headline + badge + description + inline stats
 * - Right: three feature tiles (KI-Analyse, Legal Radar, Portfolio Health)
 * - Close (×) button top-right, state persisted in localStorage.
 * - Once closed, banner stays hidden until localStorage is cleared.
 */
export const LegalPulseExplainerBanner: React.FC<LegalPulseExplainerBannerProps> = ({
  contractsMonitored,
  totalContracts,
  criticalCount,
  openActionsCount,
}) => {
  const [visible, setVisible] = useState<boolean>(false); // SSR-safe default
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setVisible(stored !== '1');
    } catch {
      setVisible(true);
    }
  }, []);

  const close = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* ignore */ }
  };

  if (!mounted || !visible) return null;

  return (
    <div style={{
      position: 'relative',
      background: 'linear-gradient(135deg, #f8fafc 0%, #eef2ff 55%, #e0e7ff 100%)',
      border: '1px solid rgba(99,102,241,0.15)',
      borderRadius: 20,
      padding: 'clamp(24px, 3vw, 36px) clamp(24px, 4vw, 44px)',
      marginBottom: 20,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 20px rgba(99,102,241,0.06)',
      overflow: 'hidden',
    }}>
      {/* Close button */}
      <button
        onClick={close}
        aria-label="Banner schließen"
        style={{
          position: 'absolute',
          top: 14,
          right: 14,
          width: 30,
          height: 30,
          borderRadius: '50%',
          border: '1px solid rgba(99,102,241,0.2)',
          background: 'rgba(255,255,255,0.7)',
          cursor: 'pointer',
          color: '#6366f1',
          fontSize: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.7)'; }}
      >
        &#10005;
      </button>

      <div style={{
        display: 'flex',
        gap: 36,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {/* Left: Title + description + stats */}
        <div style={{ flex: '1 1 340px', minWidth: 280 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
            <h2 style={{
              margin: 0,
              fontSize: 34,
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.5px',
              lineHeight: 1.1,
            }}>
              Legal Pulse
            </h2>
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: '#4338ca',
              background: '#e0e7ff',
              padding: '5px 11px',
              borderRadius: 8,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
            }}>
              Laufende Überwachung
            </span>
          </div>

          <p style={{
            margin: '0 0 18px',
            fontSize: 14.5,
            color: '#475569',
            lineHeight: 1.6,
            maxWidth: 480,
          }}>
            Kontinuierliche Überwachung aller Verträge auf rechtliche Risiken,
            Gesetzes&shy;änderungen und Optimierungs&shy;potenzial.
          </p>

          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', fontSize: 14 }}>
            <span>
              <strong style={{ color: '#0f172a', fontSize: 18, fontWeight: 800 }}>{contractsMonitored}</strong>
              <span style={{ color: '#64748b' }}> / {totalContracts} analysiert</span>
            </span>
            {criticalCount > 0 && (
              <span>
                <strong style={{ color: '#dc2626', fontSize: 18, fontWeight: 800 }}>{criticalCount}</strong>
                <span style={{ color: '#64748b' }}> kritisch</span>
              </span>
            )}
            {openActionsCount > 0 && (
              <span>
                <strong style={{ color: '#d97706', fontSize: 18, fontWeight: 800 }}>{openActionsCount}</strong>
                <span style={{ color: '#64748b' }}> offene Empfehlungen</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Feature tiles */}
        <div style={{
          flex: '1 1 320px',
          minWidth: 280,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <FeatureTile
            icon="\u26a1"
            iconBg="linear-gradient(135deg, #f59e0b, #d97706)"
            title="KI-Analyse"
            desc="6-Stufen Deep Analysis Pipeline"
          />
          <FeatureTile
            icon="\ud83d\udee1\ufe0f"
            iconBg="linear-gradient(135deg, #3b82f6, #2563eb)"
            title="Legal Radar"
            desc="Gesetzesänderungen automatisch erkennen"
          />
          <FeatureTile
            icon="\ud83d\udcca"
            iconBg="linear-gradient(135deg, #10b981, #059669)"
            title="Portfolio Health"
            desc="Alle Verträge auf einen Blick"
          />
        </div>
      </div>
    </div>
  );
};

// ── Feature tile (icon + text, white card) ──
const FeatureTile: React.FC<{
  icon: string;
  iconBg: string;
  title: string;
  desc: string;
}> = ({ icon, iconBg, title, desc }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 16px',
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid rgba(0,0,0,0.04)',
    boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
  }}>
    <div style={{
      width: 36,
      height: 36,
      borderRadius: 10,
      background: iconBg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      flexShrink: 0,
    }}>
      {icon}
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
        {title}
      </div>
      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
        {desc}
      </div>
    </div>
  </div>
);
