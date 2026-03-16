import type { ActionLevel, RiskLevel } from '../../types/legalLensV2';
import styles from '../../styles/LegalLensV2.module.css';

interface RiskBadgeProps {
  actionLevel?: ActionLevel;
  riskLevel?: RiskLevel;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

const ACTION_CONFIG = {
  accept: { label: 'Akzeptieren', emoji: '\u{1F7E2}', className: 'accept' },
  negotiate: { label: 'Verhandeln', emoji: '\u{1F7E1}', className: 'negotiate' },
  reject: { label: 'Ablehnen', emoji: '\u{1F534}', className: 'reject' }
} as const;

const RISK_FALLBACK = {
  low: 'accept',
  medium: 'negotiate',
  high: 'reject',
  none: 'accept'
} as const;

export default function RiskBadge({ actionLevel, riskLevel, size = 'medium', showLabel = true }: RiskBadgeProps) {
  const level = actionLevel || (riskLevel ? RISK_FALLBACK[riskLevel] : 'accept');
  const config = ACTION_CONFIG[level];

  return (
    <span
      className={`${styles.riskBadge} ${styles[`riskBadge_${config.className}`]} ${styles[`riskBadge_${size}`]}`}
      title={config.label}
    >
      <span className={styles.riskBadgeEmoji}>{config.emoji}</span>
      {showLabel && <span className={styles.riskBadgeLabel}>{config.label}</span>}
    </span>
  );
}
