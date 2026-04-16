import React, { useState } from 'react';

interface MonitoringStatus {
  lastRadarScan: string | null;
  nextMonitorScan: string;
  nextRadarScan: string;
  contractsMonitored: number;
}

interface RadarHealthData {
  feeds: { total: number; enabled: number; disabled: number };
  laws: { total: number; newThisWeek: number; processed: number; unprocessed: number; withEmbedding: number };
  alertsThisWeek: {
    total: number;
    severity: { critical: number; high: number; medium: number; low: number };
    directions: { negative: number; positive: number; neutral: number };
    resolved: number;
    dismissed: number;
    resolutionRate: number;
    feedbackCount: number;
    usefulRate: number;
  };
  email: { sent: number; failed: number; deliveryRate: number };
  recentRuns: {
    runAt: string;
    lawChanges: number;
    contractsMatched: number;
    alertsSent: number;
    positiveAlerts: number;
    negativeAlerts: number;
    durationMs: number;
  }[];
}

interface SystemStatusPanelProps {
  monitoring?: MonitoringStatus | null;
  radarData?: RadarHealthData | null;
}

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return 'Noch nie';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'vor 1 Tag' : `vor ${days} Tagen`;
}

function formatNext(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('de-DE', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const SystemStatusPanel: React.FC<SystemStatusPanelProps> = ({ monitoring, radarData }) => {
  const [expanded, setExpanded] = useState(false);

  if (!monitoring && !radarData) return null;

  const feedHealthy = radarData ? radarData.feeds.enabled > 0 : true;
  const emailHealthy = radarData ? radarData.email.deliveryRate >= 90 : true;
  const overallHealthy = feedHealthy && emailHealthy;

  return (
    <div style={{
      background: '#fafbfc',
      borderRadius: 14,
      border: '1px solid #e5e7eb',
      marginBottom: 24,
      overflow: 'hidden',
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '12px 18px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 14 }}>&#128295;</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>
          System-Status
        </span>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: overallHealthy ? '#059669' : '#d97706',
          background: overallHealthy ? '#ecfdf5' : '#fffbeb',
          padding: '2px 8px', borderRadius: 10,
          textTransform: 'uppercase', letterSpacing: '0.3px',
        }}>
          {overallHealthy ? 'Alles OK' : 'Eingeschränkt'}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#94a3b8' }}>
          {expanded ? 'Einklappen' : 'Technik-Details anzeigen'}
        </span>
        <span style={{
          fontSize: 12, color: '#94a3b8',
          transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          transition: 'transform 0.15s',
        }}>&#8250;</span>
      </button>

      {expanded && (
        <div style={{ padding: '0 18px 18px' }}>
          {/* Top stats grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 12,
            marginBottom: 16,
            paddingTop: 10,
            borderTop: '1px solid #e5e7eb',
          }}>
            {radarData && (
              <>
                <StatBox
                  label="Feeds aktiv"
                  value={`${radarData.feeds.enabled} / ${radarData.feeds.total}`}
                  color={feedHealthy ? '#059669' : '#d97706'}
                />
                <StatBox
                  label="Gesetze erfasst"
                  value={String(radarData.laws.total)}
                  sub={radarData.laws.newThisWeek > 0 ? `+${radarData.laws.newThisWeek} diese Woche` : undefined}
                  color="#3b82f6"
                />
                <StatBox
                  label="Alerts (7 Tage)"
                  value={String(radarData.alertsThisWeek.total)}
                  sub={radarData.alertsThisWeek.resolutionRate > 0 ? `${radarData.alertsThisWeek.resolutionRate}% behoben` : undefined}
                  color="#ea580c"
                />
                <StatBox
                  label="Delivery-Rate"
                  value={`${radarData.email.deliveryRate}%`}
                  color={emailHealthy ? '#059669' : '#dc2626'}
                />
              </>
            )}
            {monitoring && (
              <>
                <StatBox
                  label="Letzter Radar-Run"
                  value={formatRelative(monitoring.lastRadarScan)}
                  color="#64748b"
                />
                <StatBox
                  label="Nächster Scan"
                  value={formatNext(
                    new Date(monitoring.nextRadarScan).getTime() < new Date(monitoring.nextMonitorScan).getTime()
                      ? monitoring.nextRadarScan
                      : monitoring.nextMonitorScan
                  )}
                  color="#64748b"
                />
              </>
            )}
          </div>

          {/* Recent runs */}
          {radarData && radarData.recentRuns.length > 0 && (
            <>
              <div style={{
                fontSize: 11, fontWeight: 700, color: '#64748b',
                textTransform: 'uppercase', letterSpacing: '0.3px',
                marginBottom: 8,
              }}>
                Letzte Radar-Läufe
              </div>
              <div style={{
                background: '#fff',
                border: '1px solid #e5e7eb',
                borderRadius: 8,
                padding: '4px 12px',
              }}>
                {radarData.recentRuns.slice(0, 5).map((run, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    gap: 14,
                    padding: '6px 0',
                    fontSize: 12,
                    color: '#475569',
                    borderBottom: idx < Math.min(radarData.recentRuns.length, 5) - 1 ? '1px solid #f1f5f9' : 'none',
                    flexWrap: 'wrap',
                  }}>
                    <span style={{ color: '#94a3b8', minWidth: 120 }}>
                      {new Date(run.runAt).toLocaleDateString('de-DE', {
                        day: '2-digit', month: '2-digit',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                    <span>{run.lawChanges} Laws geprüft</span>
                    <span>{run.contractsMatched} Matches</span>
                    <span style={{ color: run.alertsSent > 0 ? '#ea580c' : '#94a3b8' }}>
                      {run.alertsSent} Alert{run.alertsSent === 1 ? '' : 's'}
                      {run.positiveAlerts > 0 && (
                        <span style={{ color: '#059669' }}> ({run.positiveAlerts}+)</span>
                      )}
                    </span>
                    <span style={{ color: '#94a3b8', marginLeft: 'auto' }}>
                      {Math.round(run.durationMs / 1000)}s
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string; sub?: string; color: string }> = ({ label, value, sub, color }) => (
  <div style={{
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '10px 12px',
  }}>
    <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 700, color }}>{value}</div>
    {sub && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
  </div>
);
