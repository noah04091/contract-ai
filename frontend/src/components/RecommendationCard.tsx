import { useState, useRef } from 'react';
import FeedbackButtons from './FeedbackButtons';
import styles from '../styles/RecommendationCard.module.css';
import type { RecommendationObject, RecommendationState } from '../types/legalPulse';

interface RecommendationCardProps {
  recommendation: string | RecommendationObject;
  index: number;
  contractId: string;
  onSaveToLibrary?: (rec: RecommendationObject) => void;
  onFeedback?: (feedback: 'helpful' | 'not_helpful') => void;
  onImplement?: (recommendation: string | RecommendationObject) => void;
  onRecommendationUpdate?: (index: number, updates: {
    status?: RecommendationState;
    userComment?: string;
    userEdits?: { title?: string; description?: string; priority?: string }
  }) => Promise<void>;
}

export default function RecommendationCard({
  recommendation,
  index,
  contractId,
  onSaveToLibrary,
  onFeedback,
  onImplement,
  onRecommendationUpdate
}: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);

  const recObj = typeof recommendation === 'object' ? recommendation : null;
  const recTitle = recObj?.title || (typeof recommendation === 'string' ? recommendation : '');
  const recPriority = recObj?.userEdits?.priority || recObj?.priority || 'medium';
  const recStatus: RecommendationState = recObj?.status || 'pending';
  const isCompleted = recStatus === 'completed';
  const isDismissed = recStatus === 'dismissed';
  const description = recObj?.userEdits?.description || recObj?.description;
  const displayTitle = recObj?.userEdits?.title || recTitle;
  const effort = recObj?.effort;
  const impact = recObj?.impact;
  const steps = recObj?.steps;
  const suggestedText = recObj?.suggestedText;
  const legalBasis = recObj?.legalBasis;
  const clauseRef = recObj?.affectedClauseRef;
  const userComment = recObj?.userComment || '';

  // Edit state
  const [editTitle, setEditTitle] = useState(displayTitle);
  const [editDescription, setEditDescription] = useState(description || '');
  const [editPriority, setEditPriority] = useState(recPriority);
  const [commentText, setCommentText] = useState(userComment);

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

  const handleToggleComplete = async () => {
    if (!onRecommendationUpdate || isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const newStatus: RecommendationState = isCompleted ? 'pending' : 'completed';
      await onRecommendationUpdate(index, { status: newStatus });
    } catch {
      // Error is handled by parent via onRecommendationUpdate
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleSaveComment = async () => {
    if (!onRecommendationUpdate || isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      await onRecommendationUpdate(index, { userComment: commentText });
    } catch {
      // Error is handled by parent via onRecommendationUpdate
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleSaveEdits = async () => {
    if (!onRecommendationUpdate || isSavingRef.current) return;
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const edits: { title?: string; description?: string; priority?: string } = {};
      if (editTitle !== recTitle) edits.title = editTitle;
      if (editDescription !== (recObj?.description || '')) edits.description = editDescription;
      if (editPriority !== (recObj?.priority || 'medium')) edits.priority = editPriority;
      await onRecommendationUpdate(index, { userEdits: edits });
      setIsEditing(false);
    } catch {
      // Error is handled by parent via onRecommendationUpdate
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditTitle(displayTitle);
    setEditDescription(description || '');
    setEditPriority(recPriority);
    setIsEditing(false);
  };

  return (
    <div
      className={`${styles.recCard} ${isCompleted ? styles.completed : ''} ${isDismissed ? styles.dismissed : ''}`}
      style={{ borderLeftColor: isCompleted ? '#10b981' : isDismissed ? '#9ca3af' : priorityConfig.color }}
    >
      {/* Completed/Dismissed Badge */}
      {(isCompleted || isDismissed) && (
        <div className={styles.statusBadge} style={{ background: isCompleted ? '#10b981' : '#6b7280' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {isCompleted ? 'Erledigt' : 'Ignoriert'}
        </div>
      )}

      {/* Header */}
      <div className={styles.recHeader}>
        {/* Complete Toggle */}
        {onRecommendationUpdate && (
          <button
            className={`${styles.completeToggle} ${isCompleted ? styles.completeToggleActive : ''}`}
            onClick={handleToggleComplete}
            disabled={isSaving}
            title={isCompleted ? 'Als offen markieren' : 'Als erledigt markieren'}
            aria-label={isCompleted ? 'Als offen markieren' : 'Als erledigt markieren'}
          >
            {isSaving ? (
              <div className={styles.miniSpinner} />
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill={isCompleted ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                {isCompleted ? (
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14M22 4L12 14.01l-3-3" />
                ) : (
                  <circle cx="12" cy="12" r="10" />
                )}
              </svg>
            )}
          </button>
        )}

        <span
          className={styles.priorityBadge}
          style={{ background: isCompleted ? '#10b981' : isDismissed ? '#9ca3af' : priorityConfig.color }}
        >
          {isEditing ? (
            <select
              className={styles.prioritySelect}
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            >
              <option value="critical">Kritisch</option>
              <option value="high">Hoch</option>
              <option value="medium">Mittel</option>
              <option value="low">Niedrig</option>
            </select>
          ) : (
            isCompleted ? 'Erledigt' : priorityConfig.label
          )}
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
      {isEditing ? (
        <input
          className={styles.editTitleInput}
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          placeholder="Empfehlungs-Titel"
        />
      ) : (
        <h4 className={`${styles.recTitle} ${isCompleted || isDismissed ? styles.recTitleCompleted : ''}`}>
          {displayTitle}
        </h4>
      )}

      {/* Description */}
      {isEditing ? (
        <textarea
          className={styles.editDescriptionInput}
          value={editDescription}
          onChange={(e) => setEditDescription(e.target.value)}
          placeholder="Beschreibung"
          rows={3}
        />
      ) : (
        description && description !== displayTitle && (
          <p className={`${styles.recDescription} ${isCompleted || isDismissed ? styles.recTextCompleted : ''}`}>
            {description}
          </p>
        )
      )}

      {/* Edit Actions */}
      {isEditing && (
        <div className={styles.editActions}>
          <button className={styles.editSaveBtn} onClick={handleSaveEdits} disabled={isSaving}>
            {isSaving ? 'Speichern...' : 'Speichern'}
          </button>
          <button className={styles.editCancelBtn} onClick={handleCancelEdit}>
            Abbrechen
          </button>
        </div>
      )}

      {/* Expand */}
      {hasExpandableContent && !isEditing && (
        <button
          className={styles.expandButton}
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls={`rec-details-${index}`}
        >
          <svg
            aria-hidden="true"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {expanded ? 'Weniger anzeigen' : 'Umsetzungsschritte & Details'}
        </button>
      )}

      {/* Expanded */}
      {expanded && !isEditing && (
        <div className={styles.expandedContent} id={`rec-details-${index}`}>
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

      {/* User Comment Section */}
      {showComment && (
        <div className={styles.commentSection}>
          <textarea
            className={styles.commentTextarea}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Kommentar hinzufügen (z.B. Notizen zur Umsetzung)..."
            rows={3}
            maxLength={1000}
          />
          <div className={styles.commentActions}>
            <span className={styles.commentCount}>{commentText.length}/1000</span>
            <button
              className={styles.commentSaveBtn}
              onClick={handleSaveComment}
              disabled={isSaving || commentText === userComment}
            >
              {isSaving ? 'Speichern...' : 'Kommentar speichern'}
            </button>
          </div>
        </div>
      )}

      {/* Existing Comment Display (when comment section is closed) */}
      {!showComment && userComment && (
        <div className={styles.existingComment} onClick={() => setShowComment(true)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          <span>{userComment.length > 100 ? userComment.substring(0, 100) + '\u2026' : userComment}</span>
        </div>
      )}

      {/* Actions */}
      <div className={styles.recActions}>
        {onRecommendationUpdate && (
          <>
            <button
              className={styles.actionBtn}
              onClick={() => setShowComment(!showComment)}
              title="Kommentar"
              aria-label="Kommentar hinzufügen"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
              </svg>
              Kommentar
            </button>
            <button
              className={`${styles.actionBtn} ${isEditing ? styles.actionBtnActive : ''}`}
              onClick={() => {
                if (isEditing) {
                  handleCancelEdit();
                } else {
                  setIsEditing(true);
                }
              }}
              title="Bearbeiten"
              aria-label="Empfehlung bearbeiten"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Bearbeiten
            </button>
          </>
        )}
        {onImplement && (
          <button
            className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
            onClick={() => onImplement(recommendation)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            Jetzt umsetzen
          </button>
        )}
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
