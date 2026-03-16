import { useCallback } from 'react';
import type { ClauseRegion, V2Analysis } from '../../types/legalLensV2';
import styles from '../../styles/LegalLensV2.module.css';

interface PdfClauseOverlayProps {
  region: ClauseRegion;
  analysis: V2Analysis | null;
  isSelected: boolean;
  isHovered: boolean;
  clauseTitle: string | null;
  onSelect: (clauseId: string) => void;
  onHoverStart: (clauseId: string) => void;
  onHoverEnd: () => void;
}

const ACTION_EMOJI: Record<string, string> = {
  accept: '\u{1F7E2}',
  negotiate: '\u{1F7E1}',
  reject: '\u{1F534}'
};

export default function PdfClauseOverlay({
  region,
  analysis,
  isSelected,
  isHovered,
  clauseTitle,
  onSelect,
  onHoverStart,
  onHoverEnd
}: PdfClauseOverlayProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(region.clauseId);
  }, [region.clauseId, onSelect]);

  const handleMouseEnter = useCallback(() => {
    onHoverStart(region.clauseId);
  }, [region.clauseId, onHoverStart]);

  const riskLevel = analysis?.riskLevel || region.riskLevel || 'none';
  const actionLevel = analysis?.actionLevel;

  const classNames = [
    styles.pdfOverlay,
    styles[`pdfOverlay_${riskLevel}`],
    isSelected && styles.pdfOverlay_selected,
    isHovered && styles.pdfOverlay_hovered
  ].filter(Boolean).join(' ');

  // Badge-Text: z.B. "🟡 § 6 Haftung"
  const badgeText = clauseTitle
    ? `${ACTION_EMOJI[actionLevel || 'accept'] || ''} ${clauseTitle}`
    : '';

  return (
    <div
      className={classNames}
      data-clause-id={region.clauseId}
      data-risk={riskLevel}
      style={{
        position: 'absolute',
        top: region.boundingBox.top,
        left: region.boundingBox.left,
        width: region.boundingBox.width,
        height: region.boundingBox.height,
        pointerEvents: 'all'
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={onHoverEnd}
    >
      {/* Badge — erscheint bei Hover */}
      {badgeText && (
        <span className={styles.pdfOverlayBadge} data-risk={riskLevel}>
          {badgeText}
        </span>
      )}
    </div>
  );
}
