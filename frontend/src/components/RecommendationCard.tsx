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
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const recObj = typeof recommendation === 'object' ? recommendation : null;
  const recTitle = recObj?.title || (typeof recommendation === 'string' ? recommendation : '');
  const recPriority = recObj?.priority || 'medium';
  const description = recObj?.description;
  const effort = recObj?.effort;
  const impact = recObj?.impact;
  const steps = recObj?.steps;
  const suggestedText = recObj?.suggestedText;
  const legalBasis = recObj?.legalBasis;
  const clauseRef = recObj?.affectedClauseRef;

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'critical': return { label: 'Kritisch', color: '#dc2626', bg: '#fef2f2' };
      case 'high': return { label: 'Hoch', color: '#ea580c', bg: '#fff7ed' };
      case 'medium': return { label: 'Mittel', color: '#0284c7', bg: '#f0f9ff' };
      case 'low': return { label: 'Niedrig', color: '#16a34a', bg: '#f0fdf4' };
      default: return { label: 'Mittel', color: '#0284c7', bg: '#f0f9ff' };
    }
  };

  const priorityConfig = getPriorityConfig(recPriority);
  const hasExpandableContent = steps?.length || suggestedText || clauseRef;

  const handleCopy = async () => {
    if (suggestedText) {
      try {
        await navigator.clipboard.writeText(suggestedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        const textarea = document.createElement('textarea');
        textarea.value = suggestedText;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  return (
    <div
      className={`${styles.recCard} ${isCompleted ? styles.completed : ''}`}
      style={{ borderLeftColor: isCompleted ? '#d1d5db' : priorityConfig.color }}
    >
      {/* Header */}
      <div className={styles.recHeader}>
        <span
          className={styles.priorityBadge}
          style={{ background: isCompleted ? '#d1d5db' : priorityConfig.color }}
        >
          {isCompleted ? '\u2713 Erledigt' : priorityConfig.label}
        </span>

        {/* Tags */}
        <div className={styles.recTags}>
          {effort && (
            <span className={styles.recTag}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Aufwand: {effort}
            </span>
          )}
          {impact && (
            <span className={styles.recTag}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              </svg>
              Wirkung: {impact}
            </span>
          )}
          {legalBasis && (
            <span className={styles.recTagLegal}>
              {legalBasis.split(' - ')[0]}
            </span>
          )}
        </div>
      </div>

      {/* Title */}
      <h4 className={styles.recTitle}>{recTitle}</h4>

      {/* Description */}
      {description && description !== recTitle && (
        <p className={styles.recDescription}>{description}</p>
      )}

      {/* Expand */}
      {hasExpandableContent && (
        <button
          className={styles.expandButton}
          onClick={() => setExpanded(!expanded)}
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {expanded ? 'Weniger anzeigen' : 'Umsetzungsschritte & Details'}
        </button>
      )}

      {/* Expanded */}
      {expanded && (
        <div className={styles.expandedContent}>
          {/* Steps */}
          {steps && steps.length > 0 && (
            <div className={styles.stepsSection}>
              <div className={styles.stepsLabel}>Umsetzungsschritte</div>
              <ol className={styles.stepsList}>
                {steps.map((step, i) => (
                  <li key={i} className={styles.stepItem}>
                    <span className={styles.stepNumber}>{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Suggested Text */}
          {suggestedText && (
            <div className={styles.suggestedSection}>
              <div className={styles.suggestedLabel}>
                Vorgeschlagener Klauseltext
                <button className={styles.copyButton} onClick={handleCopy}>
                  {copied ? '\u2713 Kopiert' : 'Kopieren'}
                </button>
              </div>
              <div className={styles.suggestedBlock}>
                {suggestedText}
              </div>
            </div>
          )}

          {/* Clause Ref */}
          {clauseRef && (
            <div className={styles.clauseRefSection}>
              <strong>Betroffene Klausel:</strong> {clauseRef}
            </div>
          )}

          {/* Legal Basis Full */}
          {legalBasis && (
            <div className={styles.legalBasisSection}>
              <strong>Rechtsgrundlage:</strong> {legalBasis}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className={styles.recActions}>
        <button
          className={`${styles.actionBtn} ${isCompleted ? styles.actionBtnCompleted : ''}`}
          onClick={() => onMarkComplete(index)}
        >
          {isCompleted ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12"/></svg> Erledigt</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg> Als erledigt</>
          )}
        </button>
        <button
          className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
          onClick={() => onImplement(recommendation)}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
          </svg>
          Jetzt umsetzen
        </button>
        {onSaveToLibrary && recObj && (
          <button
            className={styles.actionBtn}
            onClick={() => onSaveToLibrary(recObj)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/>
            </svg>
            Speichern
          </button>
        )}
        <FeedbackButtons
          itemId={`${contractId}-recommendation-${index}`}
          itemType="recommendation"
          onFeedback={onFeedback}
        />
      </div>
    </div>
  );
}
