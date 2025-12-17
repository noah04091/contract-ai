// 📁 frontend/src/components/FeedbackButtons.tsx
// Reusable Feedback Button Component

import { useState, useEffect } from 'react';
import styles from '../styles/FeedbackButtons.module.css';

interface FeedbackButtonsProps {
  itemId: string; // Unique ID for the item (contractId-riskIndex or contractId-recommendationIndex)
  itemType: 'risk' | 'recommendation';
  onFeedback?: (feedback: 'helpful' | 'not_helpful') => void;
  compact?: boolean;
}

export default function FeedbackButtons({ itemId, itemType, onFeedback, compact = false }: FeedbackButtonsProps) {
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load feedback from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`feedback_${itemId}`);
    if (stored) {
      setFeedback(stored as 'helpful' | 'not_helpful');
    }
  }, [itemId]);

  const handleFeedback = async (value: 'helpful' | 'not_helpful') => {
    setIsSubmitting(true);

    // Save to localStorage
    localStorage.setItem(`feedback_${itemId}`, value);
    setFeedback(value);

    // Call callback if provided
    onFeedback?.(value);

    // Simulate async operation (future: call backend API)
    await new Promise(resolve => setTimeout(resolve, 300));
    setIsSubmitting(false);
  };

  if (feedback) {
    return (
      <div className={`${styles.feedbackStatus} ${compact ? styles.compact : ''}`}>
        <span className={styles.statusIcon}>
          {feedback === 'helpful' ? '👍' : '👎'}
        </span>
        <span className={styles.statusText}>
          {feedback === 'helpful'
            ? (itemType === 'risk' ? 'Als hilfreich markiert' : 'Als nützlich markiert')
            : (itemType === 'risk' ? 'Als nicht hilfreich markiert' : 'Als nicht relevant markiert')
          }
        </span>
        <button
          className={styles.resetButton}
          onClick={() => {
            localStorage.removeItem(`feedback_${itemId}`);
            setFeedback(null);
          }}
          disabled={isSubmitting}
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className={`${styles.feedbackButtons} ${compact ? styles.compact : ''}`}>
      <button
        className={`${styles.feedbackButton} ${styles.helpful}`}
        onClick={() => handleFeedback('helpful')}
        disabled={isSubmitting}
        title={itemType === 'risk' ? 'Dieses Risiko ist relevant' : 'Diese Empfehlung ist nützlich'}
      >
        <span className={styles.buttonIcon}>👍</span>
        <span className={styles.buttonText}>
          {itemType === 'risk' ? 'Hilfreich' : 'Nützlich'}
        </span>
      </button>
      <button
        className={`${styles.feedbackButton} ${styles.notHelpful}`}
        onClick={() => handleFeedback('not_helpful')}
        disabled={isSubmitting}
        title={itemType === 'risk' ? 'Dieses Risiko ist nicht relevant' : 'Diese Empfehlung ist nicht relevant'}
      >
        <span className={styles.buttonIcon}>👎</span>
        <span className={styles.buttonText}>
          {itemType === 'risk' ? 'Nicht hilfreich' : 'Nicht relevant'}
        </span>
      </button>
    </div>
  );
}
