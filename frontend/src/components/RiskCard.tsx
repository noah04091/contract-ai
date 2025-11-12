// 📁 frontend/src/components/RiskCard.tsx
// Reusable Risk Card Component for Legal Pulse

import FeedbackButtons from './FeedbackButtons';
import styles from '../styles/RiskCard.module.css';

interface RiskCardProps {
  risk: string;
  index: number;
  contractId: string;
  onShowDetails: (risk: string) => void;
  onShowSolution: (risk: string) => void;
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
  return (
    <div className={styles.riskCard}>
      <div className={styles.riskHeader}>
        <span className={styles.riskIcon}>⚠️</span>
        <span className={styles.riskSeverity}>Risiko {index + 1}</span>
      </div>
      <p className={styles.riskDescription}>{risk}</p>
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
