import { useMemo } from 'react';
import styles from '../../styles/LegalLensV12.module.css';

interface RiskScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
}

export default function RiskScoreGauge({ score, size = 48, strokeWidth = 4 }: RiskScoreGaugeProps) {
  const { color, bgColor, circumference, offset } = useMemo(() => {
    const radius = (size - strokeWidth) / 2;
    const c = 2 * Math.PI * radius;
    const clampedScore = Math.max(0, Math.min(100, score));
    const o = c - (clampedScore / 100) * c;

    let col: string;
    if (clampedScore < 30) col = '#10b981';
    else if (clampedScore < 60) col = '#f59e0b';
    else col = '#ef4444';

    return { color: col, bgColor: `${col}20`, circumference: c, offset: o };
  }, [score, size, strokeWidth]);

  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  return (
    <div className={styles.riskGauge} title={`Risiko-Score: ${score}/100`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
          className={styles.riskGaugeArc}
        />
      </svg>
      <span className={styles.riskGaugeValue} style={{ color }}>
        {isNaN(score) || !isFinite(score) ? '–' : Math.max(0, Math.min(100, Math.round(score)))}
      </span>
    </div>
  );
}
