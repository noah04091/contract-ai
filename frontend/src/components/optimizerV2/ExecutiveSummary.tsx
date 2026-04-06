import { CheckCircle2, AlertTriangle, XCircle, ThumbsUp, AlertOctagon, ArrowRight } from 'lucide-react';
import type { ExecutiveSummary as ExecutiveSummaryType } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  summary: ExecutiveSummaryType;
}

const TRAFFIC_CONFIG = {
  green: { icon: CheckCircle2, color: '#34C759', bg: '#f0fdf4', border: '#bbf7d0' },
  yellow: { icon: AlertTriangle, color: '#FF9500', bg: '#fffbeb', border: '#fde68a' },
  red: { icon: XCircle, color: '#FF3B30', bg: '#fef2f2', border: '#fecaca' }
};

export default function ExecutiveSummary({ summary }: Props) {
  const config = TRAFFIC_CONFIG[summary.trafficLight];
  const TrafficIcon = config.icon;

  return (
    <div
      className={styles.execSummary}
      style={{ background: config.bg, borderColor: config.border }}
    >
      {/* Ampel + Label + Verdict */}
      <div className={styles.execHeader}>
        <div className={styles.execAmpel} style={{ background: config.color }}>
          <TrafficIcon size={20} color="white" />
        </div>
        <div className={styles.execHeaderText}>
          <span className={styles.execLabel} style={{ color: config.color }}>
            {summary.trafficLightLabel}
          </span>
          <p className={styles.execVerdict}>{summary.verdict}</p>
        </div>
      </div>

      {/* Strengths / Weaknesses / Action */}
      <div className={styles.execBullets}>
        <div className={styles.execBullet}>
          <ThumbsUp size={14} style={{ color: '#34C759', flexShrink: 0, marginTop: 1 }} />
          <span className={styles.execBulletText}>
            <strong>Stärken:</strong> {summary.strengths}
          </span>
        </div>
        {summary.weaknesses && summary.weaknesses !== 'Keine wesentlichen Schwächen erkannt.' && (
          <div className={styles.execBullet}>
            <AlertOctagon size={14} style={{ color: '#FF9500', flexShrink: 0, marginTop: 1 }} />
            <span className={styles.execBulletText}>
              <strong>Schwächen:</strong> {summary.weaknesses}
            </span>
          </div>
        )}
        <div className={styles.execBullet}>
          <ArrowRight size={14} style={{ color: config.color, flexShrink: 0, marginTop: 1 }} />
          <span className={styles.execBulletText}>
            <strong>Handlung:</strong> {summary.actionRequired}
          </span>
        </div>
      </div>
    </div>
  );
}
