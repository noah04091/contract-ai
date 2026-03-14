import React from 'react';
import type { PulseV2LegalAlert } from '../../types/pulseV2';

interface LegalAlertsPanelProps {
  alerts: PulseV2LegalAlert[];
  onDismiss?: (alertId: string) => void;
  onNavigate?: (contractId: string) => void;
}

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  critical: { color: '#dc2626', bg: '#fef2f2', label: 'Kritisch' },
  high: { color: '#ea580c', bg: '#fff7ed', label: 'Hoch' },
  medium: { color: '#d97706', bg: '#fffbeb', label: 'Mittel' },
  low: { color: '#6b7280', bg: '#f9fafb', label: 'Info' },
};

export const LegalAlertsPanel: React.FC<LegalAlertsPanelProps> = ({ alerts, onDismiss, onNavigate }) => {
  const unread = alerts.filter(a => a.status !== 'dismissed');
  if (unread.length === 0) return null;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 18 }}>&#9878;&#65039;</span>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
          Legal Radar
        </span>
        <span style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#fff',
          background: '#dc2626',
          padding: '2px 8px',
          borderRadius: 10,
        }}>
          {unread.length} neu
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {unread.slice(0, 5).map(alert => {
          const sev = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.low;

          return (
            <div
              key={alert._id}
              style={{
                padding: '12px 16px',
                background: sev.bg,
                borderRadius: 8,
                borderLeft: `4px solid ${sev.color}`,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: sev.color,
                      textTransform: 'uppercase',
                    }}>
                      {sev.label}
                    </span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>
                      {alert.lawArea}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 2 }}>
                    {alert.lawTitle}
                  </div>
                  <div style={{ fontSize: 13, color: '#4b5563' }}>
                    {alert.impactSummary}
                  </div>
                  <div style={{
                    fontSize: 12,
                    color: '#6b7280',
                    marginTop: 4,
                  }}>
                    Betrifft: <span
                      onClick={() => onNavigate?.(alert.contractId)}
                      style={{
                        color: '#2563eb',
                        cursor: onNavigate ? 'pointer' : 'default',
                        textDecoration: 'underline',
                      }}
                    >
                      {alert.contractName}
                    </span>
                  </div>
                  {alert.recommendation && (
                    <div style={{
                      fontSize: 12,
                      color: '#1e40af',
                      marginTop: 4,
                      fontStyle: 'italic',
                    }}>
                      Empfehlung: {alert.recommendation}
                    </div>
                  )}
                </div>
                {onDismiss && (
                  <button
                    onClick={() => onDismiss(alert._id)}
                    title="Ausblenden"
                    style={{
                      width: 24, height: 24, borderRadius: 4,
                      border: '1px solid #d1d5db', background: '#fff',
                      cursor: 'pointer', fontSize: 12, color: '#9ca3af',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    &#10005;
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {unread.length > 5 && (
          <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: 8 }}>
            + {unread.length - 5} weitere Alerts
          </div>
        )}
      </div>
    </div>
  );
};
