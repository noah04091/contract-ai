import React, { useState, useEffect, useRef } from 'react';
import type { PulseV2LegalAlert } from '../../types/pulseV2';
import { ImpactGraph } from './ImpactGraph';

interface LegalAlertsPanelProps {
  alerts: PulseV2LegalAlert[];
  onDismiss?: (alertId: string) => void;
  onRestore?: (alertId: string) => void;
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
    if (!group.plainSummary && alert.plainSummary) group.plainSummary = alert.plainSummary;
  }
  return Array.from(map.values()).sort(
    (a, b) => (SEVERITY_ORDER[a.highestSeverity] || 3) - (SEVERITY_ORDER[b.highestSeverity] || 3)
  );
}

export const LegalAlertsPanel: React.FC<LegalAlertsPanelProps> = ({ alerts, onDismiss, onRestore, onNavigate }) => {
  const [showDismissed, setShowDismissed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showInfo) return;
    const handler = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) {
        setShowInfo(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showInfo]);

  const active = alerts.filter(a => a.status !== 'dismissed' && a.status !== 'resolved');
  const dismissed = alerts.filter(a => a.status === 'dismissed');
  const resolvedCount = alerts.filter(a => a.status === 'resolved').length;
  if (active.length === 0 && resolvedCount === 0 && dismissed.length === 0) return null;

  const criticalCount = active.filter(a => a.severity === 'critical' && a.impactDirection !== 'positive').length;
  const highCount = active.filter(a => a.severity === 'high' && a.impactDirection !== 'positive').length;
  const positiveCount = active.filter(a => a.impactDirection === 'positive').length;

  const displayAlerts = showDismissed ? dismissed : active;
  const groups = groupAlertsByLaw(displayAlerts);

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
          {/* Info icon */}
          <div ref={infoRef} style={{ position: 'relative', display: 'inline-block' }}>
            <button
              onClick={() => setShowInfo(!showInfo)}
              style={{
                width: 18, height: 18, borderRadius: '50%',
                border: '1px solid #d1d5db', background: showInfo ? '#f3f4f6' : '#fff',
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
                color: '#9ca3af', display: 'flex', alignItems: 'center',
                justifyContent: 'center', padding: 0,
              }}
              title="Wie funktioniert der Legal Radar?"
            >
              ?
            </button>
            {showInfo && (
              <div style={{
                position: 'absolute', top: 24, left: -8,
                width: 320, padding: '14px 16px',
                background: '#fff', border: '1px solid #e5e7eb',
                borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                zIndex: 100, fontSize: 12, color: '#4b5563', lineHeight: 1.6,
              }}>
                <div style={{ fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                  So funktioniert der Legal Radar
                </div>
                <p style={{ margin: '0 0 8px' }}>
                  Der Legal Radar pr&uuml;ft automatisch <strong>2x t&auml;glich</strong> aktuelle Gesetzesänderungen,
                  Urteile und EU-Verordnungen gegen Ihre analysierten Vertr&auml;ge.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Datenquellen:</strong> Bundesgesetzblatt, BGH/BAG-Rechtsprechung,
                  EU-Amtsblatt, Fachpublikationen — &uuml;ber 26 RSS-Feeds.
                </p>
                <p style={{ margin: '0 0 8px' }}>
                  <strong>Alerts bleiben</strong> bis Sie sie als &bdquo;behoben&ldquo; markieren (Auto-Fix &uuml;bernehmen)
                  oder ausblenden. Ausgeblendete Alerts k&ouml;nnen Sie jederzeit &uuml;ber den
                  &bdquo;Ausgeblendete&ldquo;-Reiter wiederherstellen.
                </p>
                <p style={{ margin: 0, color: '#9ca3af', fontSize: 11 }}>
                  Neue Alerts erscheinen automatisch, sobald relevante Rechts&auml;nderungen erkannt werden.
                </p>
                <button
                  onClick={() => setShowInfo(false)}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: '#9ca3af', fontSize: 14,
                  }}
                >&times;</button>
              </div>
            )}
          </div>

          {!showDismissed && groups.length > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#fff',
              background: criticalCount > 0 ? '#dc2626' : '#ea580c',
              padding: '2px 8px', borderRadius: 10,
            }}>
              {groups.length} {groups.length === 1 ? 'Gesetz' : 'Gesetze'} &middot; {active.length} {active.length === 1 ? 'Vertrag' : 'Verträge'}
            </span>
          )}
          {!showDismissed && resolvedCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#059669',
              background: '#ecfdf5', padding: '2px 8px', borderRadius: 10,
            }}>
              {resolvedCount} behoben
            </span>
          )}
          {!showDismissed && criticalCount > 0 && (
            <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>{criticalCount} kritisch</span>
          )}
          {!showDismissed && highCount > 0 && (
            <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 600 }}>{highCount} hoch</span>
          )}
          {!showDismissed && positiveCount > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600, color: '#059669',
              background: '#ecfdf5', padding: '2px 8px', borderRadius: 10,
            }}>
              {positiveCount} Chance{positiveCount > 1 ? 'n' : ''}
            </span>
          )}
        </div>

        {/* Dismissed tab */}
        {dismissed.length > 0 && (
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            style={{
              padding: '4px 12px', fontSize: 11, fontWeight: 600,
              color: showDismissed ? '#111827' : '#9ca3af',
              background: showDismissed ? '#f3f4f6' : 'transparent',
              border: `1px solid ${showDismissed ? '#d1d5db' : 'transparent'}`,
              borderRadius: 6, cursor: 'pointer',
            }}
          >
            {showDismissed ? `Aktive (${active.length})` : `Ausgeblendete (${dismissed.length})`}
          </button>
        )}
      </div>

      {/* Dismissed view header */}
      {showDismissed && (
        <div style={{
          padding: '8px 12px', marginBottom: 12,
          background: '#f9fafb', borderRadius: 8,
          fontSize: 12, color: '#6b7280',
        }}>
          Ausgeblendete Alerts werden nicht in Ihren Aktionen berücksichtigt.
          Sie können jeden Alert wiederherstellen.
        </div>
      )}

      {/* Grouped alerts */}
      {displayAlerts.length === 0 ? (
        <div style={{ fontSize: 13, color: showDismissed ? '#6b7280' : '#059669', textAlign: 'center', padding: 16, background: showDismissed ? '#f9fafb' : '#f0fdf4', borderRadius: 8 }}>
          {showDismissed
            ? 'Keine ausgeblendeten Alerts.'
            : `Alle Alerts behoben. ${resolvedCount} Klausel(n) wurden angepasst.`
          }
        </div>
      ) : (
        <div>
          {groups.slice(0, 8).map(group => (
            <LawGroup
              key={group.lawId}
              group={group}
              onDismiss={showDismissed ? undefined : onDismiss}
              onRestore={showDismissed ? onRestore : undefined}
              onNavigate={onNavigate}
            />
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
  onRestore?: (alertId: string) => void;
  onNavigate?: (contractId: string) => void;
}> = ({ group, onDismiss, onRestore, onNavigate }) => {
  const [expanded, setExpanded] = useState(false);
  const [confirmDismiss, setConfirmDismiss] = useState<string | null>(null);
  const dismissRef = useRef<HTMLDivElement>(null);
  const sevColor = group.hasPositive ? '#059669' : (SEVERITY_COLORS[group.highestSeverity] || '#6b7280');

  useEffect(() => {
    if (!confirmDismiss) return;
    const handler = (e: MouseEvent) => {
      if (dismissRef.current && !dismissRef.current.contains(e.target as Node)) {
        setConfirmDismiss(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [confirmDismiss]);
  const statusConf = group.lawStatus ? LAW_STATUS_LABELS[group.lawStatus] : null;

  return (
    <div style={{
      border: `1px solid ${sevColor}22`,
      borderRadius: 10,
      marginBottom: 12,
    }}>
      {/* Group header */}
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '14px 16px',
          background: group.hasPositive ? '#f0fdf4' : '#fafafa',
          borderRadius: expanded ? '10px 10px 0 0' : 10,
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

        {group.plainSummary && (
          <div style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.5, paddingLeft: 16 }}>
            {group.plainSummary}
          </div>
        )}

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

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: '0 8px 8px', background: '#fff' }}>
          {group.alerts.map(alert => (
            <div key={alert._id} style={{ position: 'relative' }}>
              <ImpactGraph alert={alert} onNavigate={onNavigate} />

              {/* Dismiss button with confirmation */}
              {onDismiss && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); setConfirmDismiss(alert._id); }}
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

                  {/* Confirmation popup */}
                  {confirmDismiss === alert._id && (
                    <div ref={dismissRef} style={{
                      position: 'absolute', top: 40, right: 20,
                      width: 260, padding: '12px 14px',
                      background: '#fff', border: '1px solid #e5e7eb',
                      borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                      zIndex: 10,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                        Alert ausblenden?
                      </div>
                      <div style={{ fontSize: 12, color: '#6b7280', lineHeight: 1.5, marginBottom: 10 }}>
                        Der Alert wird aus Ihrer aktiven Ansicht entfernt und nicht mehr in Ihren Aktionen berücksichtigt.
                        Sie können ihn jederzeit über &bdquo;Ausgeblendete&ldquo; wiederherstellen.
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setConfirmDismiss(null); }}
                          style={{
                            padding: '4px 12px', fontSize: 12, fontWeight: 500,
                            color: '#6b7280', background: '#f3f4f6',
                            border: '1px solid #d1d5db', borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >Abbrechen</button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismiss(alert._id);
                            setConfirmDismiss(null);
                          }}
                          style={{
                            padding: '4px 12px', fontSize: 12, fontWeight: 600,
                            color: '#fff', background: '#dc2626',
                            border: 'none', borderRadius: 6,
                            cursor: 'pointer',
                          }}
                        >Ausblenden</button>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Restore button (dismissed view) */}
              {onRestore && (
                <button
                  onClick={(e) => { e.stopPropagation(); onRestore(alert._id); }}
                  title="Wiederherstellen"
                  style={{
                    position: 'absolute', top: 14, right: 40,
                    padding: '2px 10px', borderRadius: 4,
                    border: '1px solid #a7f3d0', background: '#ecfdf5',
                    cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    color: '#059669', zIndex: 1,
                  }}
                >Wiederherstellen</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
