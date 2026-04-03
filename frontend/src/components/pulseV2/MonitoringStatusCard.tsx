import React, { useState, useCallback } from 'react';

interface MonitoringStatus {
  status: 'green' | 'yellow' | 'red' | 'neutral';
  statusLabel: string;
  contractsMonitored: number;
  lastScan: string | null;
  lastScheduledScan: string | null;
  lastRadarScan: string | null;
  nextMonitorScan: string;
  nextRadarScan: string;
  alertsTotal: number;
  severityCounts: { critical: number; high: number; medium: number; low: number };
  recentAlertsCount: number;
}

interface ScanResult {
  verdict: 'green' | 'yellow' | 'neutral';
  verdictMessage: string;
  totalContracts: number;
  freshCount: number;
  staleCount: number;
  staleContracts: { contractId: string; name: string; daysAgo: number; score: number }[];
  unanalyzedCount: number;
  unanalyzedContracts: { contractId: string; name: string }[];
  unresolvedAlerts: number;
  newLawChanges: number;
}

interface ActionSummary {
  openActions: number;
  radarAlerts: number;
  renewalSoon: number;
}

interface MonitoringStatusCardProps {
  monitoring: MonitoringStatus;
  onRefresh?: () => void;
  onNavigate?: (contractId: string) => void;
  actionSummary?: ActionSummary;
  onScrollTo?: (section: 'actions' | 'radar' | 'renewal') => void;
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; dot: string }> = {
  green:   { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' },
  yellow:  { color: '#92400e', bg: '#fffbeb', border: '#fde68a', dot: '#eab308' },
  red:     { color: '#991b1b', bg: '#fef2f2', border: '#fecaca', dot: '#ef4444' },
  neutral: { color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb', dot: '#9ca3af' },
};

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return 'Noch nie';
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Gerade eben';
  if (minutes < 60) return `vor ${minutes} Min.`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `vor ${hours} Std.`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'vor 1 Tag';
  return `vor ${days} Tagen`;
}

function formatNextScan(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const hours = Math.floor(diff / 3600000);

  if (hours < 1) return 'In Kürze';
  if (hours < 24) return `In ${hours} Std.`;

  return date.toLocaleDateString('de-DE', { weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

export const MonitoringStatusCard: React.FC<MonitoringStatusCardProps> = ({ monitoring, onRefresh, onNavigate, actionSummary, onScrollTo }) => {
  const config = STATUS_CONFIG[monitoring.status] || STATUS_CONFIG.neutral;
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  // Determine which "next scan" is sooner
  const nextRadar = new Date(monitoring.nextRadarScan).getTime();
  const nextMonitor = new Date(monitoring.nextMonitorScan).getTime();
  const nextScanDate = nextRadar < nextMonitor ? monitoring.nextRadarScan : monitoring.nextMonitorScan;
  const nextScanType = nextRadar < nextMonitor ? 'Radar' : 'Vollscan';

  const handleScanNow = useCallback(async () => {
    setScanning(true);
    setScanResult(null);
    try {
      const res = await fetch('/api/legal-pulse-v2/scan-now', {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok) {
        setScanResult(data);
        onRefresh?.();
      }
    } catch (err) {
      console.error('[PulseV2] Scan now failed:', err);
    } finally {
      setScanning(false);
    }
  }, [onRefresh]);

  // Build action-oriented summary lines (clickable waypoints to sections below)
  const summaryLines: { icon: string; text: string; color: string; section?: 'actions' | 'radar' | 'renewal' }[] = [];

  if (actionSummary) {
    if (actionSummary.openActions > 0) {
      summaryLines.push({
        icon: '⚡',
        text: `${actionSummary.openActions} offene Aktion${actionSummary.openActions === 1 ? '' : 'en'}`,
        color: '#ea580c',
        section: 'actions',
      });
    }
    if (actionSummary.radarAlerts > 0) {
      summaryLines.push({
        icon: '⚖️',
        text: `${actionSummary.radarAlerts} Gesetz${actionSummary.radarAlerts === 1 ? '' : 'e'} betreffen Ihre Verträge`,
        color: '#7c3aed',
        section: 'radar',
      });
    }
    if (actionSummary.renewalSoon > 0) {
      summaryLines.push({
        icon: '↻',
        text: `${actionSummary.renewalSoon} Vertrag${actionSummary.renewalSoon === 1 ? '' : ' Verträge'} lauf${actionSummary.renewalSoon === 1 ? 't' : 'en'} bald aus`,
        color: '#d97706',
        section: 'renewal',
      });
    }
  }
  if (summaryLines.length === 0 && monitoring.contractsMonitored > 0) {
    summaryLines.push({
      icon: '✔',
      text: 'Keine neuen Risiken seit der letzten Prüfung erkannt',
      color: '#15803d',
    });
  }

  return (
    <div style={{
      background: config.bg,
      border: `1px solid ${config.border}`,
      borderRadius: 12,
      padding: '16px 20px',
      marginBottom: 20,
    }}>
      {/* Header: Status dot + label + scan button */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 14,
      }}>
        {/* Pulsing dot */}
        <div style={{ position: 'relative', width: 12, height: 12, flexShrink: 0 }}>
          {monitoring.status !== 'neutral' && (
            <div style={{
              position: 'absolute',
              inset: -2,
              borderRadius: '50%',
              background: config.dot,
              opacity: 0.3,
              animation: 'pulse 2s ease-in-out infinite',
            }} />
          )}
          <div style={{
            position: 'relative',
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: scanning ? '#3b82f6' : config.dot,
            animation: scanning ? 'pulse 0.8s ease-in-out infinite' : undefined,
          }} />
        </div>
        <span style={{
          fontSize: 15,
          fontWeight: 700,
          color: scanning ? '#1d4ed8' : config.color,
        }}>
          {scanning ? 'Prüfung läuft...' : monitoring.status === 'neutral' ? 'Legal Pulse' : 'Legal Pulse aktiv'}
        </span>

        {/* Right side: badge + scan button */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {monitoring.recentAlertsCount > 0 && !scanning && (
            <span style={{
              fontSize: 11,
              fontWeight: 600,
              color: '#fff',
              background: monitoring.severityCounts.critical > 0 ? '#dc2626' : '#d97706',
              padding: '1px 7px',
              borderRadius: 10,
            }}>
              {monitoring.recentAlertsCount} neu
            </span>
          )}
          {monitoring.contractsMonitored > 0 && (
            <button
              onClick={handleScanNow}
              disabled={scanning}
              style={{
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 600,
                color: scanning ? '#9ca3af' : '#374151',
                background: scanning ? '#f3f4f6' : '#fff',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                cursor: scanning ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              {scanning ? (
                <>
                  <span style={{ animation: 'pulse 1s ease-in-out infinite' }}>&#8987;</span>
                  Prüfe...
                </>
              ) : (
                <>
                  &#128269; Jetzt prüfen
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Stats row */}
      {monitoring.contractsMonitored > 0 && !scanning && (
        <div style={{
          display: 'flex',
          gap: 24,
          fontSize: 13,
          color: '#4b5563',
          marginBottom: 14,
          flexWrap: 'wrap',
        }}>
          <div>
            <span style={{ color: '#9ca3af' }}>Letzte Prüfung: </span>
            <span style={{ fontWeight: 500 }}>
              {scanResult ? 'Gerade eben' : formatRelativeTime(monitoring.lastScan)}
            </span>
          </div>
          <div>
            <span style={{ color: '#9ca3af' }}>Nächste: </span>
            <span style={{ fontWeight: 500 }}>{formatNextScan(nextScanDate)}</span>
            <span style={{ color: '#9ca3af', fontSize: 11, marginLeft: 4 }}>({nextScanType})</span>
          </div>
          <div>
            <span style={{ color: '#9ca3af' }}>Überwacht: </span>
            <span style={{ fontWeight: 500 }}>{monitoring.contractsMonitored} Verträge</span>
          </div>
        </div>
      )}

      {/* Scan Result */}
      {scanResult && !scanning && (
        <>
          <div style={{
            height: 1,
            background: config.border,
            marginBottom: 12,
          }} />

          {/* Verdict */}
          <div style={{
            padding: '10px 14px',
            background: scanResult.verdict === 'green' ? '#f0fdf4' : scanResult.verdict === 'yellow' ? '#fffbeb' : '#f9fafb',
            border: `1px solid ${scanResult.verdict === 'green' ? '#bbf7d0' : scanResult.verdict === 'yellow' ? '#fde68a' : '#e5e7eb'}`,
            borderRadius: 8,
            marginBottom: 12,
            fontSize: 13,
            color: scanResult.verdict === 'green' ? '#15803d' : scanResult.verdict === 'yellow' ? '#92400e' : '#6b7280',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <span style={{ fontSize: 16 }}>
              {scanResult.verdict === 'green' ? '✔️' : scanResult.verdict === 'yellow' ? '⚠️' : 'ℹ️'}
            </span>
            {scanResult.verdictMessage}
          </div>

          {/* New Law Changes Highlight */}
          {scanResult.newLawChanges > 0 && (
            <div style={{
              padding: '8px 12px',
              background: '#f5f3ff',
              border: '1px solid #ddd6fe',
              borderRadius: 6,
              marginBottom: 12,
              fontSize: 13,
              color: '#5b21b6',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <span style={{ fontSize: 15 }}>&#9878;&#65039;</span>
              {scanResult.newLawChanges} neue rechtliche {scanResult.newLawChanges === 1 ? 'Änderung erkannt' : 'Änderungen erkannt'}
            </div>
          )}

          {/* Scan Stats */}
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', marginBottom: scanResult.staleContracts.length > 0 ? 12 : 0, flexWrap: 'wrap' }}>
            <span>{scanResult.freshCount} aktuell</span>
            {scanResult.staleCount > 0 && (
              <span style={{ color: '#d97706', fontWeight: 600 }}>{scanResult.staleCount} veraltet</span>
            )}
            {scanResult.unanalyzedCount > 0 && (
              <span>{scanResult.unanalyzedCount} nicht analysiert</span>
            )}
          </div>

          {/* Stale contracts — clickable to navigate */}
          {scanResult.staleContracts.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {scanResult.staleContracts.map(c => (
                <div
                  key={c.contractId}
                  onClick={() => onNavigate?.(c.contractId)}
                  style={{
                    padding: '8px 12px',
                    background: '#fff',
                    border: '1px solid #fde68a',
                    borderRadius: 6,
                    fontSize: 13,
                    cursor: onNavigate ? 'pointer' : 'default',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ fontWeight: 500, color: '#111827' }}>{c.name}</span>
                  <span style={{ fontSize: 12, color: '#d97706' }}>
                    vor {c.daysAgo} Tagen &#183; Score {c.score}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Default summary (when no scan result showing) */}
      {!scanResult && !scanning && summaryLines.length > 0 && (
        <>
          <div style={{
            height: 1,
            background: config.border,
            marginBottom: 12,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {summaryLines.map((line, idx) => (
              <div
                key={idx}
                onClick={line.section && onScrollTo ? () => onScrollTo(line.section!) : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  color: line.color,
                  fontWeight: 500,
                  cursor: line.section && onScrollTo ? 'pointer' : 'default',
                  padding: '4px 8px',
                  margin: '0 -8px',
                  borderRadius: 6,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => { if (line.section) e.currentTarget.style.background = `${line.color}11`; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: 14, width: 20, textAlign: 'center', flexShrink: 0 }}>{line.icon}</span>
                {line.text}
                {line.section && (
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>&#8595;</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Scanning animation */}
      {scanning && (
        <>
          <div style={{
            height: 1,
            background: '#dbeafe',
            marginBottom: 12,
          }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {['Verträge prüfen...', 'Gesetzesänderungen scannen...', 'Alerts auswerten...'].map((step, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: '#3b82f6',
                fontWeight: 500,
                opacity: 1 - idx * 0.25,
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: '#3b82f6',
                  animation: `pulse 1s ease-in-out infinite ${idx * 0.3}s`,
                  flexShrink: 0,
                }} />
                {step}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Neutral state: no contracts monitored */}
      {!scanning && !scanResult && monitoring.contractsMonitored === 0 && (
        <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>
          Analysieren Sie einen Vertrag, um die automatische Überwachung zu aktivieren.
          Legal Pulse prüft dann regelmäßig auf neue Risiken und Gesetzesänderungen.
        </div>
      )}
    </div>
  );
};
