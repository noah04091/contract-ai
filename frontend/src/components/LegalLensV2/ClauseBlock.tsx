import { useCallback, useRef } from 'react';
import type { ClauseBlockProps } from '../../types/legalLensV2';
import type { V2Analysis } from '../../types/legalLensV2';
import RiskBadge from './RiskBadge';
import styles from '../../styles/LegalLensV2.module.css';

function truncateExplanation(analysis: V2Analysis): string {
  const text = analysis.explanation || '';
  if (text.length <= 90) return text;
  return text.substring(0, 87) + '...';
}

// Generate a display label for the clause (§1, §2, etc.)
function getClauseLabel(clause: ClauseBlockProps['clause'], index?: number): string {
  // If clause has a number field, use it
  if (clause.number) return `§ ${clause.number}`;
  // If title starts with § or Art, use it as-is
  if (clause.title && /^(§|Art\.?\s)/i.test(clause.title)) return clause.title;
  // If the text starts with a paragraph indicator, extract it
  const match = clause.text.match(/^(§\s*\d+[a-z]?|Art\.?\s*\d+|Artikel\s*\d+|\d+\.\d*)/);
  if (match) return match[0];
  // Fallback: numbered position
  if (index != null) return `§ ${index + 1}`;
  return '';
}

export default function ClauseBlock({
  clause,
  analysis,
  isSelected,
  isHovered,
  onSelect,
  onHoverStart,
  onHoverEnd,
  index
}: ClauseBlockProps & { index?: number }) {
  const blockRef = useRef<HTMLDivElement>(null);

  const riskLevel = analysis?.riskLevel || clause.riskIndicators?.level || 'none';
  const isAnalyzed = !!analysis;
  const clauseLabel = getClauseLabel(clause, index);

  const handleClick = useCallback(() => {
    onSelect(clause.id);
  }, [clause.id, onSelect]);

  const handleMouseEnter = useCallback(() => {
    onHoverStart(clause.id);
  }, [clause.id, onHoverStart]);

  // Klauseltext formatieren — Zeilenumbrüche bei Sätzen
  const formattedText = clause.text
    .replace(/\.\s+/g, '.\n')
    .replace(/;\s+/g, ';\n')
    .split('\n')
    .filter(line => line.trim().length > 0);

  const classNames = [
    styles.clauseBlock,
    styles[`clauseBlock_${riskLevel}`],
    isSelected && styles.clauseBlock_selected,
    isHovered && styles.clauseBlock_hovered,
    !isAnalyzed && styles.clauseBlock_pending,
    clause.nonAnalyzable && styles.clauseBlock_nonAnalyzable
  ].filter(Boolean).join(' ');

  if (clause.nonAnalyzable) {
    return (
      <div
        ref={blockRef}
        className={classNames}
        data-clause-id={clause.id}
      >
        <div className={styles.clauseBlockHeader}>
          <div className={styles.clauseBlockTitleRow}>
            {clauseLabel && <span className={styles.clauseBlockLabel}>{clauseLabel}</span>}
            {clause.title && <h4 className={styles.clauseBlockTitle}>{clause.title}</h4>}
          </div>
        </div>
        <p className={styles.clauseBlockText}>{clause.text}</p>
      </div>
    );
  }

  return (
    <div
      ref={blockRef}
      className={classNames}
      data-clause-id={clause.id}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onHoverEnd}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') handleClick(); }}
    >
      {/* Header mit § Label + Titel + Badge */}
      <div className={styles.clauseBlockHeader}>
        <div className={styles.clauseBlockTitleRow}>
          {clauseLabel && <span className={styles.clauseBlockLabel}>{clauseLabel}</span>}
          {clause.title && !clause.title.startsWith('§') && (
            <h4 className={styles.clauseBlockTitle}>{clause.title}</h4>
          )}
        </div>
        {isAnalyzed && (
          <RiskBadge actionLevel={analysis.actionLevel} size="small" />
        )}
        {!isAnalyzed && <span className={styles.clauseBlockPendingDot} />}
      </div>

      {/* Klauseltext */}
      <div className={styles.clauseBlockText}>
        {formattedText.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>

      {/* Analyse-Vorschau — eine Zeile */}
      {isAnalyzed && (
        <div className={styles.clauseBlockPreview}>
          <span className={styles.clauseBlockPreviewText}>
            {truncateExplanation(analysis as V2Analysis)}
          </span>
        </div>
      )}
    </div>
  );
}
