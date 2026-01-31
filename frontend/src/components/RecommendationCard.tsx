// 📁 frontend/src/components/RecommendationCard.tsx
// Reusable Recommendation Card Component for Legal Pulse

import { useState } from 'react';
import FeedbackButtons from './FeedbackButtons';
import styles from '../styles/RecommendationCard.module.css';

interface RecommendationObject {
  title: string;
  description?: string;
  priority?: string;
  effort?: string;
  impact?: string;
  steps?: string[];
  affectedClauseRef?: string;
  suggestedText?: string;
  legalBasis?: string;
}

interface RecommendationCardProps {
  recommendation: string | RecommendationObject;
  index: number;
  contractId: string;
  isCompleted: boolean;
  onMarkComplete: (index: number) => void;
  onImplement: (recommendation: string | RecommendationObject) => void;
  onSaveToLibrary?: (rec: RecommendationObject) => void;
  onFeedback?: (feedback: 'helpful' | 'not_helpful') => void;
}

export default function RecommendationCard({
  recommendation,
  index,
  contractId,
  isCompleted,
  onMarkComplete,
  onImplement,
  onSaveToLibrary,
  onFeedback
}: RecommendationCardProps) {
  const [showSuggestedText, setShowSuggestedText] = useState(false);

  // Support both old string format and new object format
  const recTitle = typeof recommendation === 'string' ? recommendation : recommendation.title;
  const recPriority = typeof recommendation === 'object' && recommendation.priority ? recommendation.priority : 'medium';
  const recDescription = typeof recommendation === 'object' && recommendation.description
    ? recommendation.description
    : recTitle;
  const suggestedText = typeof recommendation === 'object' ? recommendation.suggestedText : undefined;
  const legalBasis = typeof recommendation === 'object' ? recommendation.legalBasis : undefined;
  const clauseRef = typeof recommendation === 'object' ? recommendation.affectedClauseRef : undefined;

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
        {clauseRef && (
          <span className={styles.clauseRefBadge}>{clauseRef}</span>
        )}
      </div>
      <p className={styles.recommendationDescription}>
        {recTitle}
        {recDescription && recDescription !== recTitle && (
          <span style={{ display: 'block', marginTop: '8px', fontSize: '0.9em', opacity: 0.8 }}>
            {recDescription}
          </span>
        )}
      </p>
      {legalBasis && (
        <div className={styles.legalBasisInfo}>
          Rechtsgrundlage: {legalBasis}
        </div>
      )}
      {suggestedText && (
        <div className={styles.suggestedTextSection}>
          <button
            className={styles.suggestedTextToggle}
            onClick={() => setShowSuggestedText(!showSuggestedText)}
          >
            {showSuggestedText ? '▼' : '▶'} Klauselvorschlag anzeigen
          </button>
          {showSuggestedText && (
            <div className={styles.suggestedTextBlock}>
              {suggestedText}
            </div>
          )}
        </div>
      )}
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
        {onSaveToLibrary && typeof recommendation === 'object' && (
          <button
            className={`${styles.recommendationActionButton} ${styles.secondary}`}
            onClick={() => onSaveToLibrary(recommendation)}
            title="In Klauselbibliothek speichern"
          >
            Speichern
          </button>
        )}
      </div>
      <FeedbackButtons
        itemId={`${contractId}-recommendation-${index}`}
        itemType="recommendation"
        onFeedback={onFeedback}
      />
    </div>
  );
}
