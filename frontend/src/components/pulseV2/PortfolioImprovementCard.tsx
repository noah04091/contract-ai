import React from 'react';

interface PortfolioSummary {
  hasData: boolean;
  avgScoreNow: number | null;
  avgScorePrevious: number | null;
  delta: number;
  contractsAnalyzed: number;
  contractsImproved: number;
  contractsWorsened: number;
  actionsTotal: number;
  actionsCompleted: number;
  criticalNow: number;
  criticalResolved: number;
  topImprovement: { contractId: string; name: string; delta: number; scoreNow: number } | null;
  topDecline: { contractId: string; name: string; delta: number; scoreNow: number } | null;
}

interface PortfolioImprovementCardProps {
  summary: PortfolioSummary;
  onNavigate?: (contractId: string) => void;
}

export const PortfolioImprovementCard: React.FC<PortfolioImprovementCardProps> = ({ summary, onNavigate }) => {
  if (!summary.hasData || summary.avgScorePrevious === null) return null;

  const isPositive = summary.delta >= 0;
  const accentColor = isPositive ? '#15803d' : '#dc2626';
  const accentBg = isPositive ? '#f0fdf4' : '#fef2f2';
  const actionPct = summary.actionsTotal > 0
    ? Math.round((summary.actionsCompleted / summary.actionsTotal) * 100)
    : 0;

  return (
    <div style={{
      background: '#fff',
      borderRadius: 12,
      border: '1px solid #e5e7eb',
      padding: '20px 24px',
      marginBottom: 20,
    }}>
      {/* Header */}
      <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 16 }}>
        Portfolio-Entwicklung
      </div>

      {/* Main Score Delta */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 20,
        padding: '16px 20px',
        background: accentBg,
        borderRadius: 10,
      }}>
        <div style={{
          width: 56,
          height: 56,
          borderRadius: '50%',
          border: `3px solid ${accentColor}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 22, fontWeight: 800, color: accentColor }}>
            {summary.avgScoreNow}
          </span>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
            {summary.avgScorePrevious} &#8594; {summary.avgScoreNow}
            <span style={{
              marginLeft: 8,
              fontSize: 13,
              fontWeight: 700,
              color: accentColor,
            }}>
              {isPositive ? '+' : ''}{summary.delta} Punkte
            </span>
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>
            Durchschnittlicher Health Score
            {summary.contractsAnalyzed > 1 ? ` (${summary.contractsAnalyzed} Verträge)` : ''}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12,
        marginBottom: summary.topImprovement || summary.topDecline ? 16 : 0,
      }}>
        {summary.contractsImproved > 0 && (
          <MiniStat
            icon="&#9650;"
            label="Verbessert"
            value={summary.contractsImproved}
            color="#15803d"
            bg="#f0fdf4"
          />
        )}
        {summary.contractsWorsened > 0 && (
          <MiniStat
            icon="&#9660;"
            label="Verschlechtert"
            value={summary.contractsWorsened}
            color="#dc2626"
            bg="#fef2f2"
          />
        )}
        {summary.criticalResolved > 0 && (
          <MiniStat
            icon="&#10003;"
            label="Kritische gelöst"
            value={summary.criticalResolved}
            color="#0284c7"
            bg="#f0f9ff"
          />
        )}
        {summary.actionsTotal > 0 && (
          <div style={{
            padding: '12px 14px',
            background: '#f9fafb',
            borderRadius: 8,
            border: '1px solid #f3f4f6',
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
              Aktionen
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>
              {summary.actionsCompleted}/{summary.actionsTotal}
            </div>
            {/* Mini progress bar */}
            <div style={{
              height: 3,
              background: '#e5e7eb',
              borderRadius: 2,
              marginTop: 6,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${actionPct}%`,
                background: actionPct === 100 ? '#22c55e' : '#3b82f6',
                borderRadius: 2,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Top Improvement / Decline Highlights */}
      {(summary.topImprovement || summary.topDecline) && (
        <div style={{
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          {summary.topImprovement && (
            <HighlightChip
              label="Beste Verbesserung"
              name={summary.topImprovement.name}
              delta={summary.topImprovement.delta}
              positive
              onClick={onNavigate ? () => onNavigate(summary.topImprovement!.contractId) : undefined}
            />
          )}
          {summary.topDecline && (
            <HighlightChip
              label="Größter Rückgang"
              name={summary.topDecline.name}
              delta={summary.topDecline.delta}
              positive={false}
              onClick={onNavigate ? () => onNavigate(summary.topDecline!.contractId) : undefined}
            />
          )}
        </div>
      )}
    </div>
  );
};

const MiniStat: React.FC<{
  icon: string;
  label: string;
  value: number;
  color: string;
  bg: string;
}> = ({ icon, label, value, color, bg }) => (
  <div style={{
    padding: '12px 14px',
    background: bg,
    borderRadius: 8,
    border: `1px solid ${color}22`,
  }}>
    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
      <span dangerouslySetInnerHTML={{ __html: icon }} style={{ marginRight: 4, color }} />
      {label}
    </div>
    <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
  </div>
);

const HighlightChip: React.FC<{
  label: string;
  name: string;
  delta: number;
  positive: boolean;
  onClick?: () => void;
}> = ({ label, name, delta, positive, onClick }) => (
  <div
    onClick={onClick}
    style={{
      flex: 1,
      minWidth: 180,
      padding: '10px 14px',
      background: positive ? '#f0fdf4' : '#fef2f2',
      border: `1px solid ${positive ? '#bbf7d0' : '#fecaca'}`,
      borderRadius: 8,
      cursor: onClick ? 'pointer' : 'default',
    }}
  >
    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 2 }}>{label}</div>
    <div style={{
      fontSize: 13,
      fontWeight: 600,
      color: '#111827',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}>
      {name}
      <span style={{
        marginLeft: 6,
        fontSize: 12,
        fontWeight: 700,
        color: positive ? '#15803d' : '#dc2626',
      }}>
        {delta > 0 ? '+' : ''}{delta}
      </span>
    </div>
  </div>
);
