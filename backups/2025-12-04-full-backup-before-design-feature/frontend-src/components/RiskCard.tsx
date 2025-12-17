// 📁 frontend/src/components/RiskCard.tsx
// Reusable Risk Card Component for Legal Pulse

import FeedbackButtons from './FeedbackButtons';
import styles from '../styles/RiskCard.module.css';

interface RiskObject {
  title: string;
  description?: string;
  severity?: string;
  impact?: string;
  solution?: string;
  recommendation?: string;
  affectedClauses?: string[];
}

interface RiskCardProps {
  risk: string | RiskObject;
  index: number;
  contractId: string;
  onShowDetails: (risk: string | RiskObject) => void;
  onShowSolution: (risk: string | RiskObject) => void;
  onFeedback?: (feedback: 'helpful' | 'not_helpful') => void;
}

export default function RiskCard({
  risk,
  index,
  contractId,
  onShowDetails,
  onShowSolution,
  onFeedback
}: RiskCardProps) {
  // Support both old string format and new object format
  const riskTitle = typeof risk === 'string' ? risk : risk.title;
  const riskSeverity = typeof risk === 'object' && risk.severity ? risk.severity : 'medium';

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '⚠️';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚠️';
    }
  };

  return (
    <div className={styles.riskCard}>
      <div className={styles.riskHeader}>
        <span className={styles.riskIcon}>{getSeverityIcon(riskSeverity)}</span>
        <span className={styles.riskSeverity}>
          {riskSeverity === 'critical' ? 'Kritisch' :
           riskSeverity === 'high' ? 'Hoch' :
           riskSeverity === 'medium' ? 'Mittel' : 'Niedrig'}
        </span>
      </div>
      <p className={styles.riskDescription}>{riskTitle}</p>
      <div className={styles.riskActions}>
        <button
          className={styles.riskActionButton}
          onClick={() => onShowDetails(risk)}
        >
          Details anzeigen
        </button>
        <button
          className={`${styles.riskActionButton} ${styles.primary}`}
          onClick={() => onShowSolution(risk)}
        >
          Lösung anzeigen
        </button>
      </div>
      <FeedbackButtons
        itemId={`${contractId}-risk-${index}`}
        itemType="risk"
        onFeedback={onFeedback}
      />
    </div>
  );
}
