import React from 'react';
import type { ActionLevel } from '../../types/legalLens';
import { ACTION_LABELS } from '../../types/legalLens';
import styles from '../../styles/LegalLensV12.module.css';

interface HoverTooltipProps {
  actionLevel: ActionLevel;
  explanation: string;
  clauseTitle?: string;
  position: { x: number; y: number };
  visible: boolean;
}

const HoverTooltip: React.FC<HoverTooltipProps> = ({ actionLevel, explanation, clauseTitle, position, visible }) => {
  if (!visible) return null;

  const actionInfo = ACTION_LABELS[actionLevel] || ACTION_LABELS.negotiate;

  const tooltipWidth = Math.min(320, window.innerWidth * 0.85);
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - tooltipWidth - 16),
    top: position.y - 80,
    maxWidth: tooltipWidth,
    zIndex: 9999
  };

  if ((tooltipStyle.top as number) < 10) {
    tooltipStyle.top = position.y + 20;
  }

  return (
    <div className={styles.hoverTooltip} style={tooltipStyle}>
      <div className={styles.hoverTooltipHeader}>
        <span className={styles.hoverTooltipBadge} data-level={actionLevel}>
          {actionInfo.emoji} {actionInfo.text}
        </span>
        {clauseTitle && <span className={styles.hoverTooltipTitle}>{clauseTitle}</span>}
      </div>
      <p className={styles.hoverTooltipText}>
        {explanation.length > 120 ? explanation.substring(0, 120) + '...' : explanation}
      </p>
      <span className={styles.hoverTooltipHint}>Klicken für Details</span>
    </div>
  );
};

export default HoverTooltip;
