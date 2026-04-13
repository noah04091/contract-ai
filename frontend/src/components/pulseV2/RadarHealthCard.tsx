import React, { useState, useEffect } from 'react';
import styles from '../../styles/PulseV2.module.css';

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

// ── Hook: fetch radar health data ──
export function useRadarHealth() {
  const [data, setData] = useState<RadarHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/legal-pulse-v2/radar-health-detail', { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => setData(d))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  return { data, loading };
}

// ── Compact inline radar status (for embedding in Contract Health card) ──
export const RadarHealthCompact: React.FC<{
  data: RadarHealthData;
  expanded: boolean;
  onToggle: () => void;
}> = ({ data, expanded, onToggle }) => {
  const feedHealthy = data.feeds.enabled > 0;
  const emailHealthy = data.email.deliveryRate >= 90;
  const overallHealthy = feedHealthy && emailHealthy;

  return (
    <div style={{ flexShrink: 0, minWidth: 200, borderLeft: '1px solid #f1f5f9', paddingLeft: 28 }}>
      {/* Compact header */}
      <div
        onClick={onToggle}
        style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', marginBottom: 10 }}
      >
        <span style={{ fontSize: 14 }}>&#128225;</span>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Radar</span>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          color: overallHealthy ? '#059669' : '#d97706',
          background: overallHealthy ? '#ecfdf5' : '#fffbeb',
          padding: '1px 6px',
          borderRadius: 8,
        }}>
          {overallHealthy ? 'Aktiv' : 'Eingeschr.'}
        </span>
        <span style={{
          fontSize: 12, color: '#9ca3af', marginLeft: 'auto',
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.15s',
        }}>
          &#8250;
        </span>
      </div>

      {/* Compact mini stats — 2x2 grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        <MiniStatCompact label="Feeds" value={`${data.feeds.enabled}/${data.feeds.total}`} color={feedHealthy ? '#059669' : '#d97706'} />
        <MiniStatCompact label="Laws" value={String(data.laws.total)} color="#3b82f6" />
        <MiniStatCompact label="Alerts" value={String(data.alertsThisWeek.total)} color="#ea580c" />
        <MiniStatCompact label="Delivery" value={`${data.email.deliveryRate}%`} color={emailHealthy ? '#059669' : '#dc2626'} />
      </div>
    </div>
  );
};

// ── Expanded details panel (renders full-width below the flex row) ──
export const RadarHealthExpanded: React.FC<{ data: RadarHealthData }> = ({ data }) => (
  <div style={{ marginTop: 24, background: '#fafbfe', borderRadius: 12, padding: 20 }}>
    {/* Laws coverage */}
    <SectionHeader title="Rechtsquellen-Abdeckung" />
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
      <MiniStat label="Neu diese Woche" value={String(data.laws.newThisWeek)} color="#2563eb" />
      <MiniStat label="Verarbeitet" value={String(data.laws.processed)} color="#059669" />
      <MiniStat label="Unverarbeitet" value={String(data.laws.unprocessed)} color="#d97706" />
      <MiniStat label="Mit Embedding" value={String(data.laws.withEmbedding)} color="#7c3aed" />
    </div>

    {/* Alert pipeline */}
    <SectionHeader title="Deine Alerts (diese Woche)" />
    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
      <MiniStat label="Negativ" value={String(data.alertsThisWeek.directions.negative)} color="#dc2626" />
      <MiniStat label="Positiv" value={String(data.alertsThisWeek.directions.positive)} color="#059669" />
      <MiniStat label="Behoben" value={`${data.alertsThisWeek.resolutionRate}%`} color="#2563eb" />
      {data.alertsThisWeek.feedbackCount > 0 && (
        <MiniStat label="Hilfreich-Rate" value={`${data.alertsThisWeek.usefulRate}%`} color="#7c3aed" />
      )}
    </div>

    {/* Recent runs */}
    {data.recentRuns.length > 0 && (
      <>
        <SectionHeader title="Letzte Radar-Läufe" />
        <div style={{ fontSize: 12, color: '#6b7280' }}>
          {data.recentRuns.map((run, idx) => (
            <div key={idx} style={{
              display: 'flex', gap: 12, padding: '4px 0',
              borderBottom: idx < data.recentRuns.length - 1 ? '1px solid #f3f4f6' : 'none',
            }}>
              <span style={{ color: '#9ca3af', minWidth: 100 }}>
                {new Date(run.runAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              </span>
              <span>{run.lawChanges} Laws</span>
              <span>{run.contractsMatched} Matches</span>
              <span style={{ color: run.alertsSent > 0 ? '#ea580c' : '#9ca3af' }}>
                {run.alertsSent} Alerts
                {run.positiveAlerts > 0 && <span style={{ color: '#059669' }}> ({run.positiveAlerts}+)</span>}
              </span>
              <span style={{ color: '#9ca3af' }}>{Math.round(run.durationMs / 1000)}s</span>
            </div>
          ))}
        </div>
      </>
    )}
  </div>
);

// ── Standalone card (backward compat, not currently used) ──
export const RadarHealthCard: React.FC<{ embedded?: boolean }> = () => {
  const { data, loading } = useRadarHealth();
  const [expanded, setExpanded] = useState(false);

  if (loading || !data) return null;

  const feedHealthy = data.feeds.enabled > 0;
  const emailHealthy = data.email.deliveryRate >= 90;
  const overallHealthy = feedHealthy && emailHealthy;

  return (
    <div className={`${styles.sectionCard} ${styles.fadeIn}`} style={{
      background: '#ffffff',
      border: '1px solid rgba(0,0,0,0.05)',
      borderRadius: 16,
      padding: 24,
      marginBottom: 28,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>&#128225;</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: '#111827' }}>Radar Status</span>
          <span style={{
            fontSize: 11, fontWeight: 600,
            color: overallHealthy ? '#059669' : '#d97706',
            background: overallHealthy ? '#ecfdf5' : '#fffbeb',
            padding: '2px 8px', borderRadius: 10,
          }}>
            {overallHealthy ? 'Aktiv' : 'Eingeschränkt'}
          </span>
        </div>
        <span style={{
          fontSize: 14, color: '#9ca3af',
          transform: expanded ? 'rotate(90deg)' : 'none',
          transition: 'transform 0.15s',
        }}>&#8250;</span>
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
        <MiniStat label="Feeds aktiv" value={`${data.feeds.enabled}/${data.feeds.total}`} color={feedHealthy ? '#059669' : '#d97706'} />
        <MiniStat label="Laws in DB" value={String(data.laws.total)} color="#3b82f6" />
        <MiniStat label="Deine Alerts" value={String(data.alertsThisWeek.total)} color="#ea580c" />
        <MiniStat label="Email Delivery" value={`${data.email.deliveryRate}%`} color={emailHealthy ? '#059669' : '#dc2626'} />
      </div>
      {expanded && <RadarHealthExpanded data={data} />}
    </div>
  );
};

const MiniStat: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ textAlign: 'center', minWidth: 70 }}>
    <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{label}</div>
  </div>
);

const MiniStatCompact: React.FC<{ label: string; value: string; color: string }> = ({ label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
    <span style={{ fontSize: 14, fontWeight: 700, color }}>{value}</span>
    <span style={{ fontSize: 10, color: '#9ca3af' }}>{label}</span>
  </div>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', marginBottom: 8 }}>
    {title}
  </div>
);
