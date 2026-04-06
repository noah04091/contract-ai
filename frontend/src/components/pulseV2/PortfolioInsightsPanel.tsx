import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PulseV2PortfolioInsight } from '../../types/pulseV2';

interface PortfolioInsightsPanelProps {
  insights: PulseV2PortfolioInsight[];
  contractNames?: Map<string, string>;
}

const INSIGHT_TYPE_CONFIG: Record<string, { icon: string; label: string }> = {
  concentration_risk: { icon: '\u26a0\ufe0f', label: 'Konzentrationsrisiko' },
  conflict: { icon: '\u274c', label: 'Widerspruch' },
  renewal_cluster: { icon: '\u23f0', label: 'Fristen-Cluster' },
  opportunity: { icon: '\ud83d\udca1', label: 'Chance' },
  benchmark_gap: { icon: '\ud83d\udcca', label: 'Benchmark-Abweichung' },
};

/** Replace UUID filenames in AI-generated text with friendly label */
const UUID_FILE_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.\w+/gi;
function cleanInsightText(text: string): string {
  return text.replace(UUID_FILE_RE, 'Unbenannter Vertrag');
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#2563eb',
  info: '#6b7280',
};


function InsightCard({
  insight,
  contractNames,
}: {
  insight: PulseV2PortfolioInsight;
  contractNames?: Map<string, string>;
}) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const config = INSIGHT_TYPE_CONFIG[insight.type] || { icon: '\u2139\ufe0f', label: insight.type };
  const severityColor = SEVERITY_COLORS[insight.severity] || '#6b7280';
  const hasContracts = insight.relatedContracts && insight.relatedContracts.length > 0 && contractNames;

  return (
    <div
      style={{
        background: '#f9fafb',
        borderRadius: 8,
        borderLeft: `4px solid ${severityColor}`,
        overflow: 'hidden',
      }}
    >
      {/* Header — always visible, clickable to expand */}
      <div
        onClick={() => hasContracts && setExpanded(!expanded)}
        style={{
          padding: '12px 16px',
          cursor: hasContracts ? 'pointer' : 'default',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 16 }}>{config.icon}</span>
          <span style={{
            fontSize: 11,
            fontWeight: 600,
            color: severityColor,
            textTransform: 'uppercase',
          }}>
            {config.label}
          </span>
          {insight.confidence < 85 && (
            <span style={{ fontSize: 11, color: '#9ca3af' }}>{insight.confidence}%</span>
          )}
          {hasContracts && (
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#9ca3af' }}>
              {insight.relatedContracts.length} {insight.relatedContracts.length === 1 ? 'Vertrag' : 'Verträge'}
            </span>
          )}
          {hasContracts && (
            <span style={{
              fontSize: 14, color: '#9ca3af',
              transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease',
            }}>
              ›
            </span>
          )}
        </div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
          {cleanInsightText(insight.title)}
        </div>
        <div style={{ fontSize: 13, color: '#4b5563', marginTop: 2 }}>
          {cleanInsightText(insight.description)}
        </div>
        {hasContracts && !expanded && (
          <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
            Betrifft: {insight.relatedContracts.map(id => contractNames.get(id) || cleanInsightText(id)).join(', ')}
          </div>
        )}
      </div>

      {/* Expanded — individual contracts */}
      {expanded && hasContracts && (
        <div style={{
          padding: '0 16px 12px',
          display: 'flex', flexDirection: 'column', gap: 6,
        }}>
          <div style={{ height: 1, background: '#e5e7eb', marginBottom: 4 }} />
          {insight.relatedContracts.map((contractId) => {
            const name = contractNames.get(contractId) || cleanInsightText(contractId);
            return (
              <div
                key={contractId}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/contracts?view=${contractId}`);
                }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px',
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  cursor: 'pointer',
                  transition: 'border-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#3b82f6')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#e5e7eb')}
              >
                <span style={{ fontSize: 14 }}>📄</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', flex: 1 }}>
                  {name}
                </span>
                <span style={{ fontSize: 12, color: '#3b82f6', fontWeight: 500 }}>
                  Öffnen →
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const PortfolioInsightsPanel: React.FC<PortfolioInsightsPanelProps> = ({ insights, contractNames }) => {
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

  if (!insights || insights.length === 0) return null;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
        Portfolio-Insights
        <span style={{
          fontSize: 12,
          color: '#6b7280',
          fontWeight: 400,
        }}>
          {insights.length} erkannt
        </span>
        {/* Info tooltip */}
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
            title="Was sind Portfolio-Insights?"
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
                Was sind Portfolio-Insights?
              </div>
              <p style={{ margin: '0 0 8px' }}>
                Portfolio-Insights analysieren Ihre Vertr&auml;ge <strong>im Zusammenhang</strong> und
                erkennen Muster, die bei Einzelbetrachtung nicht sichtbar w&auml;ren.
              </p>
              <p style={{ margin: '0 0 8px' }}>
                <strong>Fristen-Cluster:</strong> Warnung wenn mehrere Vertr&auml;ge gleichzeitig auslaufen
                — damit Sie rechtzeitig Neuverhandlungen planen k&ouml;nnen.
              </p>
              <p style={{ margin: '0 0 8px' }}>
                <strong>Konzentrationsrisiko:</strong> Erkennt wenn sich Vertr&auml;ge zu stark auf einen
                Anbieter oder Vertragstyp konzentrieren.
              </p>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 11 }}>
                Klicken Sie auf ein Insight um die betroffenen Vertr&auml;ge zu sehen
                und direkt zum Vertrag zu navigieren.
              </p>
              <button
                onClick={() => setShowInfo(false)}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 14, color: '#9ca3af', padding: 2,
                }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {insights.map((insight, idx) => (
          <InsightCard
            key={idx}
            insight={insight}
            contractNames={contractNames}
          />
        ))}
      </div>
    </div>
  );
};
