// 📁 components/LegalLens/ClauseList.tsx
// Komponente für die Klausel-Liste (linke Seite)

import React from 'react';
import type { ParsedClause, LegalLensProgress, RiskLevel } from '../../types/legalLens';
import { RISK_LABELS } from '../../types/legalLens';
import styles from '../../styles/LegalLens.module.css';

interface ClauseListProps {
  clauses: ParsedClause[];
  selectedClause: ParsedClause | null;
  progress: LegalLensProgress | null;
  onSelectClause: (clause: ParsedClause) => void;
}

const ClauseList: React.FC<ClauseListProps> = ({
  clauses,
  selectedClause,
  progress,
  onSelectClause
}) => {
  const isClauseReviewed = (clauseId: string): boolean => {
    return progress?.reviewedClauses?.includes(clauseId) || false;
  };

  const isClauseBookmarked = (clauseId: string): boolean => {
    return progress?.bookmarks?.some(b => b.clauseId === clauseId) || false;
  };

  const getClauseNotes = (clauseId: string): number => {
    return progress?.notes?.filter(n => n.clauseId === clauseId).length || 0;
  };

  const getRiskEmoji = (level: RiskLevel): string => {
    switch (level) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  return (
    <div className={styles.contractPanel}>
      <div className={styles.contractHeader}>
        <h3 className={styles.contractTitle}>Vertragsinhalt</h3>
        <span className={styles.clauseCount}>
          {clauses.length} Klauseln
        </span>
      </div>

      <div className={styles.clauseList}>
        {clauses.map((clause) => {
          const isSelected = selectedClause?.id === clause.id;
          const isReviewed = isClauseReviewed(clause.id);
          const isBookmarked = isClauseBookmarked(clause.id);
          const notesCount = getClauseNotes(clause.id);
          const riskLevel = clause.riskIndicators?.level || 'low';

          return (
            <div
              key={clause.id}
              className={`${styles.clauseItem} ${isSelected ? styles.selected : ''} ${isReviewed ? styles.reviewed : ''}`}
              onClick={() => onSelectClause(clause)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectClause(clause)}
            >
              <div className={styles.clauseHeader}>
                <span className={styles.clauseNumber}>
                  {clause.number || `#${clause.id.slice(-4)}`}
                  {clause.title && ` - ${clause.title}`}
                </span>
                <span className={`${styles.clauseRisk} ${styles[riskLevel]}`}>
                  {getRiskEmoji(riskLevel)} {RISK_LABELS[riskLevel]}
                </span>
              </div>

              <p className={styles.clauseText}>
                {clause.text}
              </p>

              {(isBookmarked || notesCount > 0 || isReviewed) && (
                <div className={styles.clauseIcons}>
                  {isBookmarked && (
                    <span className={styles.clauseIcon} title="Gemerkt">🔖</span>
                  )}
                  {notesCount > 0 && (
                    <span className={styles.clauseIcon} title={`${notesCount} Notiz(en)`}>
                      📝 {notesCount}
                    </span>
                  )}
                  {isReviewed && (
                    <span className={styles.clauseIcon} title="Durchgesehen">✓</span>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {clauses.length === 0 && (
          <div className={styles.analysisPanelEmpty}>
            <span className={styles.emptyIcon}>📄</span>
            <h4 className={styles.emptyTitle}>Keine Klauseln gefunden</h4>
            <p className={styles.emptyText}>
              Der Vertrag enthält keine analysierbaren Klauseln.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClauseList;
