import type { HoverTooltipProps } from '../../types/legalLensV2';
import RiskBadge from './RiskBadge';
import styles from '../../styles/LegalLensV2.module.css';

export default function HoverTooltip({ analysis, clauseTitle, position, visible }: HoverTooltipProps) {
  if (!visible || !analysis) return null;

  // Tooltip-Position berechnen (nicht aus dem Viewport rausragen)
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x, window.innerWidth - 320),
    top: position.y - 80,
    zIndex: 9999
  };

  // Falls oben kein Platz, darunter anzeigen
  if ((tooltipStyle.top as number) < 10) {
    tooltipStyle.top = position.y + 20;
  }

  return (
    <div className={styles.hoverTooltip} style={tooltipStyle}>
      <div className={styles.hoverTooltipHeader}>
        <RiskBadge actionLevel={analysis.actionLevel} size="small" />
        {clauseTitle && <span className={styles.hoverTooltipTitle}>{clauseTitle}</span>}
      </div>
      <p className={styles.hoverTooltipText}>
        {analysis.explanation.length > 120
          ? analysis.explanation.substring(0, 120) + '...'
          : analysis.explanation
        }
      </p>
      <span className={styles.hoverTooltipHint}>Klicken für Details</span>
    </div>
  );
}
