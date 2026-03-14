import React from 'react';
import type { PulseV2LegalAlert } from '../../types/pulseV2';
import { ImpactGraph } from './ImpactGraph';

interface LegalAlertsPanelProps {
  alerts: PulseV2LegalAlert[];
  onDismiss?: (alertId: string) => void;
  onNavigate?: (contractId: string) => void;
}

export const LegalAlertsPanel: React.FC<LegalAlertsPanelProps> = ({ alerts, onDismiss, onNavigate }) => {
  const unread = alerts.filter(a => a.status !== 'dismissed');
  if (unread.length === 0) return null;

  const criticalCount = unread.filter(a => a.severity === 'critical').length;
  const highCount = unread.filter(a => a.severity === 'high').length;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>&#9878;&#65039;</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
            Legal Radar
          </span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#fff',
            background: criticalCount > 0 ? '#dc2626' : '#ea580c',
            padding: '2px 8px',
            borderRadius: 10,
          }}>
            {unread.length} neu
          </span>
          {criticalCount > 0 && (
            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>
              {criticalCount} kritisch
            </span>
          )}
          {highCount > 0 && (
            <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 600 }}>
              {highCount} hoch
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          Klicken zum Aufklappen
        </span>
      </div>

      {/* Impact Graphs */}
      <div>
        {unread.slice(0, 5).map(alert => (
          <div key={alert._id} style={{ position: 'relative' }}>
            <ImpactGraph
              alert={alert}
              onNavigate={onNavigate}
            />
            {onDismiss && (
              <button
                onClick={(e) => { e.stopPropagation(); onDismiss(alert._id); }}
                title="Ausblenden"
                style={{
                  position: 'absolute',
                  top: 14, right: 40,
                  width: 22, height: 22, borderRadius: 4,
                  border: '1px solid #d1d5db', background: '#fff',
                  cursor: 'pointer', fontSize: 11, color: '#9ca3af',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 1,
                }}
              >
                &#10005;
              </button>
            )}
          </div>
        ))}
        {unread.length > 5 && (
          <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: 8 }}>
            + {unread.length - 5} weitere Alerts
          </div>
        )}
      </div>
    </div>
  );
};
