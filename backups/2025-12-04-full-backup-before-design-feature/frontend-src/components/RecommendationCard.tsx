// 📁 frontend/src/components/RecommendationCard.tsx
// Reusable Recommendation Card Component for Legal Pulse

import FeedbackButtons from './FeedbackButtons';
import styles from '../styles/RecommendationCard.module.css';

interface RecommendationObject {
  title: string;
  description?: string;
  priority?: string;
  effort?: string;
  impact?: string;
  steps?: string[];
}

interface RecommendationCardProps {
  recommendation: string | RecommendationObject;
  index: number;
  contractId: string;
  isCompleted: boolean;
  onMarkComplete: (index: number) => void;
  onImplement: (recommendation: string | RecommendationObject) => void;
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
  // Support both old string format and new object format
  const recTitle = typeof recommendation === 'string' ? recommendation : recommendation.title;
  const recPriority = typeof recommendation === 'object' && recommendation.priority ? recommendation.priority : 'medium';
  const recDescription = typeof recommendation === 'object' && recommendation.description
    ? recommendation.description
    : recTitle;

  const getPriorityIcon = (priority: string) => {
    if (isCompleted) return '✅';
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '⚠️';
      case 'medium': return '💡';
      case 'low': return '🟢';
      default: return '💡';
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'Kritisch';
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      default: return '';
    }
  };

  return (
    <div className={`${styles.recommendationCard} ${isCompleted ? styles.completed : ''}`}>
      <div className={styles.recommendationHeader}>
        <span className={styles.recommendationIcon}>
          {getPriorityIcon(recPriority)}
        </span>
        <span className={styles.recommendationPriority}>
          {getPriorityLabel(recPriority) || `Empfehlung ${index + 1}`}
          {isCompleted && <span className={styles.completedLabel}> (Erledigt)</span>}
        </span>
      </div>
      <p className={styles.recommendationDescription}>
        {recTitle}
        {recDescription && recDescription !== recTitle && (
          <span style={{ display: 'block', marginTop: '8px', fontSize: '0.9em', opacity: 0.8 }}>
            {recDescription}
          </span>
        )}
      </p>
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
