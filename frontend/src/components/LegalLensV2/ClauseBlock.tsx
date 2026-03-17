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

export default function ClauseBlock({
  clause,
  analysis,
  isSelected,
  isHovered,
  onSelect,
  onHoverStart,
  onHoverEnd
}: ClauseBlockProps) {
  const blockRef = useRef<HTMLDivElement>(null);

  const riskLevel = analysis?.riskLevel || clause.riskIndicators?.level || 'none';
  const isAnalyzed = !!analysis;

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
        {clause.title && <h4 className={styles.clauseBlockTitle}>{clause.title}</h4>}
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
      {/* Header mit Titel + Badge */}
      <div className={styles.clauseBlockHeader}>
        {clause.title && <h4 className={styles.clauseBlockTitle}>{clause.title}</h4>}
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
