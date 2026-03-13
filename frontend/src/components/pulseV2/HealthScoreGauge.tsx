import React from 'react';
import type { PulseV2Scores } from '../../types/pulseV2';

interface HealthScoreGaugeProps {
  scores: PulseV2Scores;
  riskTrend?: string;
  size?: 'small' | 'large';
}

function getScoreColor(score: number): string {
  if (score >= 80) return '#22c55e';
  if (score >= 60) return '#eab308';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Gut';
  if (score >= 60) return 'Akzeptabel';
  if (score >= 40) return 'Bedenklich';
  return 'Kritisch';
}

function getTrendArrow(trend?: string): string {
  if (trend === 'improving') return '\u2191';
  if (trend === 'declining') return '\u2193';
  return '\u2192';
}

export const HealthScoreGauge: React.FC<HealthScoreGaugeProps> = ({ scores, riskTrend, size = 'large' }) => {
  const isLarge = size === 'large';
  const gaugeSize = isLarge ? 180 : 80;
  const strokeWidth = isLarge ? 12 : 6;
  const radius = (gaugeSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (scores.overall / 100) * circumference;
  const color = getScoreColor(scores.overall);

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', display: 'inline-block', width: gaugeSize, height: gaugeSize }}>
        <svg width={gaugeSize} height={gaugeSize} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={gaugeSize / 2}
            cy={gaugeSize / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={gaugeSize / 2}
            cy={gaugeSize / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: isLarge ? 36 : 18, fontWeight: 700, color }}>
            {scores.overall}
          </div>
          {isLarge && (
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              {getScoreLabel(scores.overall)}
              {riskTrend && (
                <span style={{
                  marginLeft: 4,
                  color: riskTrend === 'improving' ? '#22c55e' : riskTrend === 'declining' ? '#ef4444' : '#6b7280',
                }}>
                  {getTrendArrow(riskTrend)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {isLarge && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginTop: 16,
          fontSize: 13,
        }}>
          <SubScore label="Risiko" value={scores.risk} />
          <SubScore label="Compliance" value={scores.compliance} />
          <SubScore label="Konditionen" value={scores.terms} />
          <SubScore label="Vollständigkeit" value={scores.completeness} />
        </div>
      )}
    </div>
  );
};

const SubScore: React.FC<{ label: string; value: number }> = ({ label, value }) => (
  <div style={{
    padding: '6px 8px',
    background: '#f9fafb',
    borderRadius: 6,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}>
    <span style={{ color: '#6b7280' }}>{label}</span>
    <span style={{ fontWeight: 600, color: getScoreColor(value) }}>{value}</span>
  </div>
);
