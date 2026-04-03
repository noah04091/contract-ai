import React, { useState } from 'react';

interface ContractDelta {
  contractId: string;
  name: string;
  delta: number;
  scoreNow: number;
}

interface ActionItem {
  title: string;
  priority: string;
  status: string;
}

interface ContractActions {
  contractId: string;
  name: string;
  actions: ActionItem[];
  total: number;
  completed: number;
}

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
  topImprovement: ContractDelta | null;
  topDecline: ContractDelta | null;
  improvedContracts?: ContractDelta[];
  worsenedContracts?: ContractDelta[];
  actionsByContract?: ContractActions[];
}

interface PortfolioImprovementCardProps {
  summary: PortfolioSummary;
  onNavigate?: (contractId: string) => void;
}

export const PortfolioImprovementCard: React.FC<PortfolioImprovementCardProps> = ({ summary, onNavigate }) => {
  const [expandedSection, setExpandedSection] = useState<'improved' | 'worsened' | 'actions' | null>(null);

  if (!summary.hasData || summary.avgScorePrevious === null) return null;

  const isPositive = summary.delta >= 0;
  const accentColor = isPositive ? '#15803d' : '#dc2626';
  const accentBg = isPositive ? '#f0fdf4' : '#fef2f2';
  const actionPct = summary.actionsTotal > 0
    ? Math.round((summary.actionsCompleted / summary.actionsTotal) * 100)
    : 0;

  const toggle = (section: 'improved' | 'worsened' | 'actions') => {
    setExpandedSection(prev => prev === section ? null : section);
  };

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
            onClick={() => toggle('improved')}
            active={expandedSection === 'improved'}
          />
        )}
        {summary.contractsWorsened > 0 && (
          <MiniStat
            icon="&#9660;"
            label="Verschlechtert"
            value={summary.contractsWorsened}
            color="#dc2626"
            bg="#fef2f2"
            onClick={() => toggle('worsened')}
            active={expandedSection === 'worsened'}
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
      </div>

      {/* Expanded Details */}
      {expandedSection === 'improved' && (summary.improvedContracts || []).length > 0 && (
        <ContractList
          contracts={summary.improvedContracts!}
          positive
          onNavigate={onNavigate}
        />
      )}
      {expandedSection === 'worsened' && (summary.worsenedContracts || []).length > 0 && (
        <ContractList
          contracts={summary.worsenedContracts!}
          positive={false}
          onNavigate={onNavigate}
        />
      )}

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
              label="Gr&ouml;&szlig;ter R&uuml;ckgang"
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

// ── Expanded: Contract list (improved/worsened) ──
const ContractList: React.FC<{
  contracts: ContractDelta[];
  positive: boolean;
  onNavigate?: (contractId: string) => void;
}> = ({ contracts, positive, onNavigate }) => (
  <div style={{
    padding: '12px 0',
    marginBottom: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  }}>
    {contracts.map(c => (
      <div
        key={c.contractId}
        onClick={() => onNavigate?.(c.contractId)}
        style={{
          padding: '8px 12px',
          background: positive ? '#f0fdf4' : '#fef2f2',
          border: `1px solid ${positive ? '#bbf7d0' : '#fecaca'}`,
          borderRadius: 8,
          cursor: onNavigate ? 'pointer' : 'default',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{
          fontSize: 13,
          fontWeight: 500,
          color: '#111827',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
          minWidth: 0,
        }}>
          {c.name}
        </span>
        <span style={{
          fontSize: 12,
          fontWeight: 700,
          color: positive ? '#15803d' : '#dc2626',
          marginLeft: 12,
          flexShrink: 0,
        }}>
          {c.delta > 0 ? '+' : ''}{c.delta} &#183; Score {c.scoreNow}
        </span>
      </div>
    ))}
  </div>
);

// ── Expanded: Actions by contract ──
const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  now: { label: 'Sofort', color: '#dc2626' },
  plan: { label: 'Geplant', color: '#d97706' },
  watch: { label: 'Beobachten', color: '#6b7280' },
};

const ActionsDetail: React.FC<{
  actionsByContract: ContractActions[];
  onNavigate?: (contractId: string) => void;
}> = ({ actionsByContract, onNavigate }) => (
  <div style={{
    padding: '12px 0',
    marginBottom: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  }}>
    {actionsByContract.map(ca => (
      <div key={ca.contractId} style={{
        background: '#f9fafb',
        border: '1px solid #f3f4f6',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        {/* Contract header */}
        <div
          onClick={() => onNavigate?.(ca.contractId)}
          style={{
            padding: '8px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            cursor: onNavigate ? 'pointer' : 'default',
          }}
        >
          <span style={{
            fontSize: 13,
            fontWeight: 600,
            color: '#111827',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            minWidth: 0,
          }}>
            {ca.name}
          </span>
          <span style={{
            fontSize: 11,
            color: '#6b7280',
            marginLeft: 12,
            flexShrink: 0,
          }}>
            {ca.completed}/{ca.total}
          </span>
        </div>
        {/* Action items */}
        <div style={{ padding: '0 12px 8px' }}>
          {ca.actions.map((action, idx) => {
            const prio = PRIORITY_CONFIG[action.priority] || PRIORITY_CONFIG.plan;
            const isDone = action.status === 'done';
            return (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '4px 0',
                fontSize: 12,
                color: isDone ? '#9ca3af' : '#374151',
                textDecoration: isDone ? 'line-through' : 'none',
              }}>
                <span style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: isDone ? '#d1d5db' : prio.color,
                  flexShrink: 0,
                }} />
                <span style={{
                  flex: 1,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {action.title}
                </span>
                {!isDone && (
                  <span style={{
                    fontSize: 10,
                    color: prio.color,
                    fontWeight: 600,
                  }}>
                    {prio.label}
                  </span>
                )}
              </div>
            );
          })}
          {ca.total > ca.actions.length && (
            <div style={{ fontSize: 11, color: '#9ca3af', paddingTop: 4 }}>
              + {ca.total - ca.actions.length} weitere
            </div>
          )}
        </div>
      </div>
    ))}
  </div>
);

const MiniStat: React.FC<{
  icon: string;
  label: string;
  value: number;
  color: string;
  bg: string;
  onClick?: () => void;
  active?: boolean;
}> = ({ icon, label, value, color, bg, onClick, active }) => (
  <div
    onClick={onClick}
    style={{
      padding: '12px 14px',
      background: active ? `${color}11` : bg,
      borderRadius: 8,
      border: active ? `1px solid ${color}44` : `1px solid ${color}22`,
      cursor: onClick ? 'pointer' : 'default',
      transition: 'all 0.15s ease',
    }}
  >
    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
      <span dangerouslySetInnerHTML={{ __html: icon }} style={{ marginRight: 4, color }} />
      {label}
      {onClick && <span style={{ marginLeft: 4, fontSize: 10, color: '#9ca3af' }}>&#8250;</span>}
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
