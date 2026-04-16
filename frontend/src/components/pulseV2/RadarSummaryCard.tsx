import React from 'react';

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
}

interface RadarSummaryCardProps {
  data: RadarHealthData;
}

/**
 * Slim "Legal Radar läuft" strip showing the 4 key trust metrics
 * (Feeds / Laws / Alerts / Delivery) — replaces the old Contract Health
 * card's radar side panel. Full history lives in SystemStatusPanel.
 */
export const RadarSummaryCard: React.FC<RadarSummaryCardProps> = ({ data }) => {
  const feedHealthy = data.feeds.enabled > 0;
  const emailHealthy = data.email.deliveryRate >= 90;
  const healthy = feedHealthy && emailHealthy;

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 14,
      border: '1px solid rgba(0,0,0,0.05)',
      padding: '16px 22px',
      marginBottom: 24,
      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      display: 'flex',
      alignItems: 'center',
      gap: 22,
      flexWrap: 'wrap',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 34, height: 34,
          borderRadius: 10,
          background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 16,
          flexShrink: 0,
        }}>
          &#128737;&#65039;
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>
            Legal Radar
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 11,
            fontWeight: 600,
            color: healthy ? '#059669' : '#d97706',
            marginTop: 2,
          }}>
            <span style={{
              width: 6, height: 6,
              borderRadius: '50%',
              background: healthy ? '#22c55e' : '#eab308',
              boxShadow: healthy ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
            }} />
            {healthy ? 'Frühwarnsystem aktiv' : 'Eingeschränkt'}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ width: 1, alignSelf: 'stretch', background: '#e5e7eb', minHeight: 36 }} />

      {/* Stats */}
      <div style={{
        display: 'flex',
        gap: 22,
        flex: 1,
        flexWrap: 'wrap',
      }}>
        <StatChip
          value={`${data.feeds.enabled}/${data.feeds.total}`}
          label="Feeds aktiv"
          color={feedHealthy ? '#059669' : '#d97706'}
        />
        <StatChip
          value={formatNumber(data.laws.total)}
          label="Gesetze"
          color="#3b82f6"
          sub={data.laws.newThisWeek > 0 ? `+${data.laws.newThisWeek} diese Woche` : undefined}
        />
        <StatChip
          value={String(data.alertsThisWeek.total)}
          label="Alerts (7T)"
          color={data.alertsThisWeek.total > 0 ? '#ea580c' : '#64748b'}
          sub={data.alertsThisWeek.resolutionRate > 0 ? `${data.alertsThisWeek.resolutionRate}% behoben` : undefined}
        />
        <StatChip
          value={`${data.email.deliveryRate}%`}
          label="Delivery"
          color={emailHealthy ? '#059669' : '#dc2626'}
        />
      </div>
    </div>
  );
};

const StatChip: React.FC<{ value: string; label: string; color: string; sub?: string }> = ({
  value, label, color, sub,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontSize: 17, fontWeight: 800, color, lineHeight: 1 }}>
        {value}
      </span>
      <span style={{ fontSize: 11.5, color: '#64748b' }}>{label}</span>
    </div>
    {sub && (
      <div style={{ fontSize: 10.5, color: '#94a3b8' }}>{sub}</div>
    )}
  </div>
);

function formatNumber(n: number): string {
  return n.toLocaleString('de-DE');
}
