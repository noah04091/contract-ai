import React, { useState, useEffect, useRef } from 'react';
import type { PulseV2Scores } from '../../types/pulseV2';
import styles from '../../styles/PulseV2.module.css';

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
  const [showScoreInfo, setShowScoreInfo] = useState(false);
  const scoreInfoRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showScoreInfo) return;
    const handler = (e: MouseEvent) => {
      if (scoreInfoRef.current && !scoreInfoRef.current.contains(e.target as Node)) {
        setShowScoreInfo(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showScoreInfo]);

  const isLarge = size === 'large';
  const gaugeSize = isLarge ? 180 : 80;
  const strokeWidth = isLarge ? 12 : 6;
  const radius = (gaugeSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (scores.overall / 100) * circumference;
  const color = getScoreColor(scores.overall);

  return (
    <div style={{ textAlign: 'center' }}>
      <div
        ref={scoreInfoRef}
        style={{ position: 'relative', display: 'inline-block', width: gaugeSize, height: gaugeSize, cursor: isLarge ? 'pointer' : 'default' }}
        onClick={() => { if (isLarge) setShowScoreInfo(!showScoreInfo); }}
      >
        <svg width={gaugeSize} height={gaugeSize} style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx={gaugeSize / 2}
            cy={gaugeSize / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
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
          <div className={isLarge ? styles.scoreNumber : undefined} style={{ fontSize: isLarge ? 36 : 18, fontWeight: 700, color }}>
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

        {/* Score explanation popup — fixed position to avoid clipping by parent overflow */}
        {isLarge && showScoreInfo && (() => {
          const rect = scoreInfoRef.current?.getBoundingClientRect();
          const popupTop = rect ? rect.bottom + 8 : 0;
          const popupLeft = rect ? rect.left + rect.width / 2 - 150 : 0;
          return (
            <div style={{
              position: 'fixed', top: popupTop, left: Math.max(8, popupLeft),
              width: 300, padding: '14px 16px',
              background: '#fff', border: '1px solid #e5e7eb',
              borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              zIndex: 9999, fontSize: 12, color: '#4b5563', lineHeight: 1.6,
              textAlign: 'left',
            }}>
              <div style={{ fontWeight: 600, color: '#111827', marginBottom: 6 }}>
                So wird Ihr Score berechnet
              </div>
              <p style={{ margin: '0 0 6px' }}>
                Der Gesamtscore (0–100) setzt sich aus vier gleichgewichteten Faktoren zusammen:
              </p>
              <p style={{ margin: '0 0 4px' }}>
                <strong>Risiko</strong> — Wie viele und wie schwere rechtliche Risiken wurden erkannt?
              </p>
              <p style={{ margin: '0 0 4px' }}>
                <strong>Compliance</strong> — Entspricht der Vertrag den gesetzlichen Anforderungen (DSGVO, AGB-Recht etc.)?
              </p>
              <p style={{ margin: '0 0 4px' }}>
                <strong>Konditionen</strong> — Sind die Vertragsbedingungen fair und marktüblich?
              </p>
              <p style={{ margin: '0 0 8px' }}>
                <strong>Vollständigkeit</strong> — Fehlen wichtige Klauseln die enthalten sein sollten?
              </p>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 11 }}>
                Je höher der Score, desto besser ist Ihr Vertrag aufgestellt. Ab 80 gilt ein Vertrag als gut, unter 40 als kritisch.
              </p>
              <button
                onClick={(e) => { e.stopPropagation(); setShowScoreInfo(false); }}
                style={{
                  position: 'absolute', top: 8, right: 8,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#9ca3af', fontSize: 14,
                }}
              >&times;</button>
            </div>
          );
        })()}
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
  <div className={styles.miniStatCard} style={{
    padding: '8px 10px',
    background: '#f9fafb',
    borderRadius: 8,
    border: '1px solid #f1f5f9',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}>
    <span style={{ color: '#6b7280' }}>{label}</span>
    <span style={{ fontWeight: 600, color: getScoreColor(value) }}>{value}</span>
  </div>
);
