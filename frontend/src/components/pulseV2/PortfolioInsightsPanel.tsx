import React from 'react';
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

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#d97706',
  low: '#2563eb',
  info: '#6b7280',
};

export const PortfolioInsightsPanel: React.FC<PortfolioInsightsPanelProps> = ({ insights, contractNames }) => {
  if (!insights || insights.length === 0) return null;

  return (
    <div style={{
      background: '#fff',
      border: '1px solid #e5e7eb',
      borderRadius: 12,
      padding: 20,
      marginBottom: 20,
    }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#111827', marginBottom: 16 }}>
        Portfolio-Insights
        <span style={{
          marginLeft: 8,
          fontSize: 12,
          color: '#6b7280',
          fontWeight: 400,
        }}>
          {insights.length} erkannt
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {insights.map((insight, idx) => {
          const config = INSIGHT_TYPE_CONFIG[insight.type] || { icon: '\u2139\ufe0f', label: insight.type };
          const severityColor = SEVERITY_COLORS[insight.severity] || '#6b7280';

          return (
            <div
              key={idx}
              style={{
                padding: '12px 16px',
                background: '#f9fafb',
                borderRadius: 8,
                borderLeft: `4px solid ${severityColor}`,
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
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>
                {insight.title}
              </div>
              <div style={{ fontSize: 13, color: '#4b5563', marginTop: 2 }}>
                {insight.description}
              </div>
              {insight.relatedContracts && insight.relatedContracts.length > 0 && contractNames && (
                <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>
                  Betrifft: {insight.relatedContracts.map(id => contractNames.get(id) || id).join(', ')}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
