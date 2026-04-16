import React, { useEffect, useRef, useState } from 'react';
import styles from '../../styles/PulseV2.module.css';

/** Format a relative "vor X Tagen" label from an ISO date */
function formatRelativeDays(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days < 1) return 'heute analysiert';
  if (days === 1) return 'analysiert vor 1 Tag';
  if (days < 30) return `analysiert vor ${days} Tagen`;
  const months = Math.floor(days / 30);
  if (months === 1) return 'analysiert vor 1 Monat';
  return `analysiert vor ${months} Monaten`;
}

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
  lastAnalysisMap?: Map<string, string>;
  onNavigate?: (contractId: string) => void;
}

export const PortfolioImprovementCard: React.FC<PortfolioImprovementCardProps> = ({ summary, lastAnalysisMap, onNavigate }) => {
  const [expandedSection, setExpandedSection] = useState<'improved' | 'worsened' | 'actions' | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const infoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showInfo) return;
    const handler = (e: MouseEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setShowInfo(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showInfo]);

  if (!summary.hasData || summary.avgScorePrevious === null) return null;

  const isPositive = summary.delta >= 0;
  const accentColor = isPositive ? '#15803d' : '#dc2626';
  const accentBg = isPositive ? '#f0fdf4' : '#fef2f2';

  const toggle = (section: 'improved' | 'worsened') => {
    setExpandedSection(prev => prev === section ? null : section);
  };

  return (
    <div className={`${styles.sectionCard} ${styles.fadeIn}`} style={{
      background: '#fff',
      borderRadius: 16,
      border: '1px solid rgba(0,0,0,0.05)',
      padding: 24,
      marginBottom: 28,
      boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.03)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        fontSize: 14, fontWeight: 600, color: '#374151',
        marginBottom: 16, paddingLeft: 14, borderLeft: '3px solid #3b82f6',
      }}>
        <span>Portfolio-Entwicklung</span>
        <div ref={infoRef} style={{ position: 'relative', display: 'inline-block' }}>
          <button
            onClick={() => setShowInfo(!showInfo)}
            title="Wie wird die Entwicklung berechnet?"
            style={{
              width: 18, height: 18, borderRadius: '50%',
              border: '1px solid #d1d5db', background: showInfo ? '#f3f4f6' : '#fff',
              cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#9ca3af',
              display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            }}
          >
            ?
          </button>
          {showInfo && (
            <div style={{
              position: 'absolute', top: 24, left: -8,
              width: 340, padding: '14px 16px',
              background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 100, fontSize: 12, color: '#4b5563', lineHeight: 1.6,
              fontWeight: 400,
            }}>
              <div style={{ fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                Wie entsteht die Entwicklung?
              </div>
              <p style={{ margin: '0 0 6px' }}>
                Der Score wird bei jeder Vertragsanalyse neu berechnet. Die Entwicklung vergleicht den
                aktuellen Durchschnitt mit dem vorherigen &mdash; Quick-Fixes, manuelle Klausel-Edits und
                erneute Analysen fließen ein.
              </p>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 11 }}>
                Klicken Sie auf „Verbessert“ oder „Verschlechtert“, um die betroffenen Verträge mit Details zu sehen.
              </p>
              <button
                onClick={() => setShowInfo(false)}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: '#9ca3af', padding: 2,
                }}
              >&#10005;</button>
            </div>
          )}
        </div>
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
          lastAnalysisMap={lastAnalysisMap}
          onNavigate={onNavigate}
        />
      )}
      {expandedSection === 'worsened' && (summary.worsenedContracts || []).length > 0 && (
        <ContractList
          contracts={summary.worsenedContracts!}
          positive={false}
          lastAnalysisMap={lastAnalysisMap}
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
  lastAnalysisMap?: Map<string, string>;
  onNavigate?: (contractId: string) => void;
}> = ({ contracts, positive, lastAnalysisMap, onNavigate }) => (
  <div style={{
    padding: '12px 0',
    marginBottom: 12,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  }}>
    {contracts.map(c => {
      const lastAnalysis = lastAnalysisMap?.get(c.contractId);
      return (
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
            gap: 12,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13,
              fontWeight: 500,
              color: '#111827',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {c.name}
            </div>
            {lastAnalysis && (
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
                {formatRelativeDays(lastAnalysis)}
              </div>
            )}
          </div>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            color: positive ? '#15803d' : '#dc2626',
            flexShrink: 0,
          }}>
            {c.delta > 0 ? '+' : ''}{c.delta} &#183; Score {c.scoreNow}
          </span>
        </div>
      );
    })}
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
    className={styles.miniStatCard}
    onClick={onClick}
    style={{
      padding: '12px 14px',
      background: active ? `${color}11` : bg,
      borderRadius: 8,
      border: active ? `1px solid ${color}44` : `1px solid ${color}22`,
      cursor: onClick ? 'pointer' : 'default',
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
    className={styles.highlightChip}
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
