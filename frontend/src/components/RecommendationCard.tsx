// 📁 frontend/src/components/RecommendationCard.tsx
// Reusable Recommendation Card Component for Legal Pulse

import FeedbackButtons from './FeedbackButtons';
import styles from '../styles/RecommendationCard.module.css';

interface RecommendationCardProps {
  recommendation: string;
  index: number;
  contractId: string;
  isCompleted: boolean;
  onMarkComplete: (index: number) => void;
  onImplement: (recommendation: string) => void;
  onFeedback?: (feedback: 'helpful' | 'not_helpful') => void;
}

export default function RecommendationCard({
  recommendation,
  index,
  contractId,
  isCompleted,
  onMarkComplete,
  onImplement,
  onFeedback
}: RecommendationCardProps) {
  return (
    <div className={`${styles.recommendationCard} ${isCompleted ? styles.completed : ''}`}>
      <div className={styles.recommendationHeader}>
        <span className={styles.recommendationIcon}>
          {isCompleted ? '✅' : '💡'}
        </span>
        <span className={styles.recommendationPriority}>
          Empfehlung {index + 1}
          {isCompleted && <span className={styles.completedLabel}> (Erledigt)</span>}
        </span>
      </div>
      <p className={styles.recommendationDescription}>{recommendation}</p>
      <div className={styles.recommendationActions}>
        <button
          className={`${styles.recommendationActionButton} ${isCompleted ? styles.completed : ''}`}
          onClick={() => onMarkComplete(index)}
        >
          {isCompleted ? '✓ Als erledigt markiert' : 'Als erledigt markieren'}
        </button>
        <button
          className={`${styles.recommendationActionButton} ${styles.primary}`}
          onClick={() => onImplement(recommendation)}
        >
          Jetzt umsetzen
        </button>
      </div>
      <FeedbackButtons
        itemId={`${contractId}-recommendation-${index}`}
        itemType="recommendation"
        onFeedback={onFeedback}
      />
    </div>
  );
}
