import { AlertTriangle, CheckCircle2, XCircle, Scale, ShieldAlert, FileWarning, ArrowRight, Zap } from 'lucide-react';
import type { ExecutiveSummary as ExecutiveSummaryType } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  summary: ExecutiveSummaryType;
  onNavigate: (tab: string, clauseId?: string) => void;
}

const TRAFFIC_CONFIG = {
  green: { icon: CheckCircle2, color: '#34C759', bg: '#f0fdf4', border: '#bbf7d0', label: 'Empfehlung' },
  yellow: { icon: AlertTriangle, color: '#FF9500', bg: '#fffbeb', border: '#fde68a', label: 'Hinweis' },
  red: { icon: XCircle, color: '#FF3B30', bg: '#fef2f2', border: '#fecaca', label: 'Warnung' }
};

export default function ExecutiveSummary({ summary, onNavigate }: Props) {
  const config = TRAFFIC_CONFIG[summary.trafficLight];
  const TrafficIcon = config.icon;

  return (
    <div className={styles.execSummary}>
      {/* ── Verdict Card ── */}
      <div
        className={styles.execVerdictCard}
        style={{ background: config.bg, borderColor: config.border }}
      >
        <div className={styles.execVerdictIcon} style={{ background: config.color }}>
          <TrafficIcon size={22} color="white" />
        </div>
        <div className={styles.execVerdictContent}>
          <div className={styles.execVerdictBadge} style={{ color: config.color }}>
            {summary.trafficLightLabel}
          </div>
          <p className={styles.execVerdictText}>{summary.verdict}</p>
        </div>
      </div>

      {/* ── Top Risks ── */}
      {summary.topRisks.length > 0 && (
        <div className={styles.execSection}>
          <div className={styles.execSectionHeader}>
            <ShieldAlert size={16} />
            <span>Wichtigste Risiken</span>
          </div>
          <div className={styles.execRiskList}>
            {summary.topRisks.map((risk, i) => (
              <button
                key={risk.clauseId || i}
                className={styles.execRiskItem}
                onClick={() => risk.clauseId && onNavigate('clauses', risk.clauseId)}
              >
                <span className={styles.execRiskDot} style={{
                  background: risk.riskLevel >= 7 ? '#FF3B30' : risk.riskLevel >= 5 ? '#FF9500' : '#FFCC00'
                }} />
                <div className={styles.execRiskContent}>
                  <span className={styles.execRiskTitle}>{risk.clauseTitle}</span>
                  <span className={styles.execRiskImpact}>{risk.businessImpact}</span>
                </div>
                <ArrowRight size={14} className={styles.execRiskArrow} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Fairness ── */}
      <div className={styles.execSection}>
        <div className={styles.execSectionHeader}>
          <Scale size={16} />
          <span>Fairness</span>
        </div>
        <p className={styles.execFairnessText}>{summary.fairnessVerdict}</p>
      </div>

      {/* ── Critical Gaps ── */}
      {summary.criticalGaps.length > 0 && (
        <div className={styles.execSection}>
          <div className={styles.execSectionHeader}>
            <FileWarning size={16} />
            <span>Fehlende Regelungen</span>
          </div>
          <div className={styles.execGapList}>
            {summary.criticalGaps.map((gap, i) => (
              <div key={gap.category || i} className={styles.execGapItem}>
                <span className={styles.execGapBadge} data-severity={gap.severity}>
                  {gap.categoryLabel}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Negotiation Priorities ── */}
      {summary.negotiationPriorities.length > 0 && (
        <div className={styles.execSection}>
          <div className={styles.execSectionHeader}>
            <Zap size={16} />
            <span>Handlungsempfehlungen</span>
          </div>
          <div className={styles.execPriorityList}>
            {summary.negotiationPriorities.map((np, i) => (
              <div key={i} className={styles.execPriorityItem}>
                <span className={styles.execPriorityNum}>{np.priority}</span>
                <div className={styles.execPriorityContent}>
                  <span className={styles.execPriorityTitle}>{np.clauseTitle}</span>
                  <span className={styles.execPriorityAction}>{np.action}</span>
                  <span className={styles.execPriorityImpact}>{np.businessImpact}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
