import React, { useState } from 'react';
import type { PulseV2LegalAlert } from '../../types/pulseV2';
import { ImpactGraph } from './ImpactGraph';

interface LegalAlertsPanelProps {
  alerts: PulseV2LegalAlert[];
  onDismiss?: (alertId: string) => void;
  onNavigate?: (contractId: string) => void;
}

interface AlertGroup {
  lawId: string;
  lawTitle: string;
  lawArea: string;
  lawStatus?: string;
  plainSummary: string;
  alerts: PulseV2LegalAlert[];
  highestSeverity: string;
  hasPositive: boolean;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

function groupAlertsByLaw(alerts: PulseV2LegalAlert[]): AlertGroup[] {
  const map = new Map<string, AlertGroup>();
  for (const alert of alerts) {
    const key = alert.lawId || alert.lawTitle;
    if (!map.has(key)) {
      map.set(key, {
        lawId: alert.lawId,
        lawTitle: alert.lawTitle,
        lawArea: alert.lawArea,
        lawStatus: alert.lawStatus,
        plainSummary: alert.plainSummary || alert.impactSummary || '',
        alerts: [],
        highestSeverity: alert.severity,
        hasPositive: false,
      });
    }
    const group = map.get(key)!;
    group.alerts.push(alert);
    if ((SEVERITY_ORDER[alert.severity] || 3) < (SEVERITY_ORDER[group.highestSeverity] || 3)) {
      group.highestSeverity = alert.severity;
    }
    if (alert.impactDirection === 'positive') group.hasPositive = true;
    // Use the best plainSummary available
    if (!group.plainSummary && alert.plainSummary) group.plainSummary = alert.plainSummary;
  }
  // Sort: critical first, then high, then medium, then low
  return Array.from(map.values()).sort(
    (a, b) => (SEVERITY_ORDER[a.highestSeverity] || 3) - (SEVERITY_ORDER[b.highestSeverity] || 3)
  );
}

export const LegalAlertsPanel: React.FC<LegalAlertsPanelProps> = ({ alerts, onDismiss, onNavigate }) => {
  const active = alerts.filter(a => a.status !== 'dismissed' && a.status !== 'resolved');
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;
  if (active.length === 0 && resolvedCount === 0) return null;

  const criticalCount = active.filter(a => a.severity === 'critical' && a.impactDirection !== 'positive').length;
  const highCount = active.filter(a => a.severity === 'high' && a.impactDirection !== 'positive').length;
  const positiveCount = active.filter(a => a.impactDirection === 'positive').length;

  const groups = groupAlertsByLaw(active);

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 18 }}>&#9878;&#65039;</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>
            Legal Radar
          </span>
          {groups.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#fff',
              background: criticalCount > 0 ? '#dc2626' : '#ea580c',
              padding: '2px 8px', borderRadius: 10,
            }}>
              {groups.length} {groups.length === 1 ? 'Gesetz' : 'Gesetze'} &middot; {active.length} {active.length === 1 ? 'Vertrag' : 'Verträge'}
            </span>
          )}
          {resolvedCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#059669',
              background: '#ecfdf5', padding: '2px 8px', borderRadius: 10,
            }}>
              {resolvedCount} behoben
            </span>
          )}
          {criticalCount > 0 && (
            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{criticalCount} kritisch</span>
          )}
          {highCount > 0 && (
            <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 600 }}>{highCount} hoch</span>
          )}
          {positiveCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#059669',
              background: '#ecfdf5', padding: '2px 8px', borderRadius: 10,
            }}>
              {positiveCount} Chance{positiveCount > 1 ? 'n' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Grouped alerts */}
      {active.length === 0 ? (
        <div style={{ fontSize: 13, color: '#059669', textAlign: 'center', padding: 16, background: '#f0fdf4', borderRadius: 8 }}>
          Alle Alerts behoben. {resolvedCount} Klausel(n) wurden angepasst.
        </div>
      ) : (
        <div>
          {groups.slice(0, 8).map(group => (
            <LawGroup key={group.lawId} group={group} onDismiss={onDismiss} onNavigate={onNavigate} />
          ))}
          {groups.length > 8 && (
            <div style={{ fontSize: 13, color: '#6b7280', textAlign: 'center', padding: 8 }}>
              + {groups.length - 8} weitere Gesetze
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ── Single law group with expandable contract details ──
const LAW_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  proposal: { label: 'Entwurf', color: '#6b7280', bg: '#f3f4f6' },
  passed: { label: 'Verabschiedet', color: '#d97706', bg: '#fffbeb' },
  effective: { label: 'In Kraft', color: '#dc2626', bg: '#fef2f2' },
  court_decision: { label: 'Urteil', color: '#7c3aed', bg: '#f5f3ff' },
  guideline: { label: 'Leitlinie', color: '#2563eb', bg: '#eff6ff' },
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626', high: '#ea580c', medium: '#d97706', low: '#6b7280',
};

const LawGroup: React.FC<{
  group: AlertGroup;
  onDismiss?: (alertId: string) => void;
  onNavigate?: (contractId: string) => void;
}> = ({ group, onDismiss, onNavigate }) => {
  const [expanded, setExpanded] = useState(false);
  const sevColor = group.hasPositive ? '#059669' : (SEVERITY_COLORS[group.highestSeverity] || '#6b7280');
  const statusConf = group.lawStatus ? LAW_STATUS_LABELS[group.lawStatus] : null;

  return (
    <div style={{
      border: `1px solid ${sevColor}22`,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 12,
    }}>
      {/* Group header — law title + summary */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '14px 16px',
          background: group.hasPositive ? '#f0fdf4' : '#fafafa',
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: sevColor, flexShrink: 0,
          }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', flex: 1, minWidth: 0 }}>
            {group.lawTitle}
          </div>
          {statusConf && (
            <span style={{
              fontSize: 10, fontWeight: 600,
              color: statusConf.color, background: statusConf.bg,
              padding: '1px 6px', borderRadius: 4, flexShrink: 0,
            }}>
              {statusConf.label}
            </span>
          )}
          <span style={{
            fontSize: 11, fontWeight: 600, color: '#6b7280',
            background: '#f3f4f6', padding: '1px 8px', borderRadius: 8, flexShrink: 0,
          }}>
            {group.alerts.length} {group.alerts.length === 1 ? 'Vertrag' : 'Verträge'}
          </span>
          <span style={{
            fontSize: 14, color: '#9ca3af',
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.15s', flexShrink: 0,
          }}>&#8250;</span>
        </div>

        {/* Plain summary — always visible */}
        {group.plainSummary && (
          <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, paddingLeft: 16 }}>
            {group.plainSummary}
          </div>
        )}

        {/* Quick contract list — always visible */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8, paddingLeft: 16 }}>
          {group.alerts.slice(0, 4).map(a => (
            <span key={a._id} style={{
              fontSize: 11, color: '#6b7280', background: '#f3f4f6',
              padding: '2px 8px', borderRadius: 6, maxWidth: 200,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {a.contractName}
            </span>
          ))}
          {group.alerts.length > 4 && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>+{group.alerts.length - 4} weitere</span>
          )}
        </div>
      </div>

      {/* Expanded: individual contract impacts */}
      {expanded && (
        <div style={{ padding: '0 8px 8px', background: '#fff' }}>
          {group.alerts.map(alert => (
            <div key={alert._id} style={{ position: 'relative' }}>
              <ImpactGraph alert={alert} onNavigate={onNavigate} />
              {onDismiss && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss(alert._id); }}
                  title="Ausblenden"
                  style={{
                    position: 'absolute', top: 14, right: 40,
                    width: 22, height: 22, borderRadius: 4,
                    border: '1px solid #d1d5db', background: '#fff',
                    cursor: 'pointer', fontSize: 11, color: '#9ca3af',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1,
                  }}
                >&#10005;</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
