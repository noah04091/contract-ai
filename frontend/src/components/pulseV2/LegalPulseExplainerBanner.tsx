import React, { useEffect, useState } from 'react';

interface LegalPulseExplainerBannerProps {
  contractsMonitored: number;
  totalContracts: number;
}

const STORAGE_KEY = 'legalPulse.explainerCollapsed';

/**
 * Top banner introducing Legal Pulse.
 * - Defaults to OPEN for first-time users (no localStorage key set)
 * - User can collapse → state is persisted
 * - Always reopenable via "Mehr anzeigen"
 */
export const LegalPulseExplainerBanner: React.FC<LegalPulseExplainerBannerProps> = ({
  contractsMonitored,
  totalContracts,
}) => {
  const [collapsed, setCollapsed] = useState<boolean>(true); // safe SSR default

  // Initialise from localStorage on mount (default = open for first-use)
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setCollapsed(stored === '1');
    } catch {
      setCollapsed(false);
    }
  }, []);

  const toggle = () => {
    setCollapsed(prev => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch { /* ignore */ }
      return next;
    });
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #eff6ff 0%, #eef2ff 100%)',
      border: '1px solid rgba(99,102,241,0.18)',
      borderRadius: 14,
      marginBottom: 16,
      overflow: 'hidden',
      boxShadow: '0 1px 3px rgba(99,102,241,0.06)',
    }}>
      <button
        onClick={toggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 18px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 28, height: 28,
          borderRadius: 8,
          background: 'linear-gradient(135deg, #6366f1, #3b82f6)',
          color: '#fff',
          fontSize: 14, fontWeight: 700,
          flexShrink: 0,
        }}>
          &#9889;
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', letterSpacing: '0.2px' }}>
          Legal Pulse aktiv
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#4338ca',
          background: '#e0e7ff',
          padding: '3px 10px',
          borderRadius: 10,
        }}>
          {contractsMonitored} von {totalContracts} Verträgen überwacht
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#6366f1', fontWeight: 600 }}>
          {collapsed ? 'Mehr anzeigen' : 'Weniger anzeigen'}
        </span>
        <span style={{
          fontSize: 13,
          color: '#6366f1',
          transform: collapsed ? 'rotate(0deg)' : 'rotate(90deg)',
          transition: 'transform 0.18s ease',
        }}>
          &#8250;
        </span>
      </button>

      {!collapsed && (
        <div style={{
          padding: '4px 18px 18px',
          borderTop: '1px solid rgba(99,102,241,0.12)',
          background: 'rgba(255,255,255,0.55)',
        }}>
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, marginTop: 12, marginBottom: 14 }}>
            Legal Pulse ist Ihr Frühwarnsystem für lebende Verträge. Wir überwachen Gesetzes&shy;änderungen,
            Fristen und Risiken &mdash; Sie werden informiert, bevor etwas zum Problem wird.
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
          }}>
            {[
              { icon: '\u2696\ufe0f', title: 'Gesetzes-Radar', desc: 'Neue Urteile und Gesetze, die Ihre Klauseln betreffen.' },
              { icon: '\u23f0', title: 'Fristen-Erkennung', desc: 'Auto-Verlängerungen und Ablauftermine rechtzeitig im Blick.' },
              { icon: '\ud83d\udcca', title: 'Portfolio-Gesundheit', desc: 'Score-Entwicklung, kritische Befunde, Handlungsimpulse.' },
              { icon: '\ud83d\udd14', title: 'Proaktive Warnungen', desc: 'Per E-Mail und Dashboard, sobald etwas Relevantes passiert.' },
            ].map(f => (
              <div key={f.title} style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 10,
                padding: '10px 12px',
              }}>
                <div style={{ fontSize: 18, marginBottom: 4 }}>{f.icon}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontSize: 11.5, color: '#64748b', lineHeight: 1.45 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
