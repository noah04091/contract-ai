// 📁 frontend/src/components/RiskCard.tsx
// Reusable Risk Card Component for Legal Pulse

import FeedbackButtons from './FeedbackButtons';
import styles from '../styles/RiskCard.module.css';

interface RiskObject {
  title: string;
  description?: string;
  severity?: string;
  impact?: string;
  solution?: string;
  recommendation?: string;
  affectedClauses?: string[];
  affectedClauseText?: string;
  replacementText?: string;
  legalBasis?: string;
}

interface RiskCardProps {
  risk: string | RiskObject;
  index: number;
  contractId: string;
  onShowDetails: (risk: string | RiskObject) => void;
  onShowSolution: (risk: string | RiskObject) => void;
  onSaveToLibrary?: (risk: RiskObject) => void;
  onFeedback?: (feedback: 'helpful' | 'not_helpful') => void;
}

export default function RiskCard({
  risk,
  index,
  contractId,
  onShowDetails,
  onShowSolution,
  onSaveToLibrary,
  onFeedback
}: RiskCardProps) {
  // Support both old string format and new object format
  const riskTitle = typeof risk === 'string' ? risk : risk.title;
  const riskSeverity = typeof risk === 'object' && risk.severity ? risk.severity : 'medium';
  const clauseRef = typeof risk === 'object' ? risk.affectedClauseText : undefined;
  const legalBasis = typeof risk === 'object' ? risk.legalBasis : undefined;

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return '🔴';
      case 'high': return '⚠️';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚠️';
    }
  };

  const truncateClause = (text: string, maxLen = 80) => {
    if (text.length <= maxLen) return text;
    return text.substring(0, maxLen) + '…';
  };

  return (
    <div className={styles.riskCard}>
      <div className={styles.riskHeader}>
        <span className={styles.riskIcon}>{getSeverityIcon(riskSeverity)}</span>
        <span className={styles.riskSeverity}>
          {riskSeverity === 'critical' ? 'Kritisch' :
           riskSeverity === 'high' ? 'Hoch' :
           riskSeverity === 'medium' ? 'Mittel' : 'Niedrig'}
        </span>
        {legalBasis && (
          <span className={styles.legalBadge}>{legalBasis.split(' - ')[0]}</span>
        )}
      </div>
      <p className={styles.riskDescription}>{riskTitle}</p>
      {clauseRef && (
        <div className={styles.clauseBadge}>
          <span className={styles.clauseBadgeLabel}>Betrifft:</span>
          <span className={styles.clauseBadgeText}>{truncateClause(clauseRef)}</span>
        </div>
      )}
      <div className={styles.riskActions}>
        <button
          className={styles.riskActionButton}
          onClick={() => onShowDetails(risk)}
        >
          Details anzeigen
        </button>
        <button
          className={`${styles.riskActionButton} ${styles.primary}`}
          onClick={() => onShowSolution(risk)}
        >
          Lösung anzeigen
        </button>
        {onSaveToLibrary && typeof risk === 'object' && (
          <button
            className={`${styles.riskActionButton} ${styles.secondary}`}
            onClick={() => onSaveToLibrary(risk)}
            title="In Klauselbibliothek speichern"
          >
            Speichern
          </button>
        )}
      </div>
      <FeedbackButtons
        itemId={`${contractId}-risk-${index}`}
        itemType="risk"
        onFeedback={onFeedback}
      />
    </div>
  );
}
