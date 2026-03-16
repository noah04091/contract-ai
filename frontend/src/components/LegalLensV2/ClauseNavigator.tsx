import { useMemo } from 'react';
import type { ParsedClauseV2, AnalysesMap } from '../../types/legalLensV2';
import styles from '../../styles/LegalLensV2.module.css';

interface ClauseNavigatorProps {
  clauses: ParsedClauseV2[];
  analysesMap: AnalysesMap;
  selectedClauseId: string | null;
  onSelectClause: (clauseId: string, source: 'navigator') => void;
  isOpen: boolean;
  onToggle: () => void;
  filterRiskOnly: boolean;
  searchQuery: string;
}

const RISK_DOT: Record<string, string> = {
  high: '\u{1F534}',
  medium: '\u{1F7E1}',
  low: '\u{1F7E2}',
  none: '\u26AA'
};

export default function ClauseNavigator({
  clauses,
  analysesMap,
  selectedClauseId,
  onSelectClause,
  isOpen,
  onToggle,
  filterRiskOnly,
  searchQuery
}: ClauseNavigatorProps) {
  const filteredClauses = useMemo(() => {
    return clauses.filter(c => {
      if (c.nonAnalyzable) return false;

      if (filterRiskOnly) {
        const analysis = analysesMap[c.id];
        if (!analysis || analysis.riskLevel === 'low') return false;
      }

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (c.title?.toLowerCase().includes(q) || c.text.toLowerCase().includes(q));
      }

      return true;
    });
  }, [clauses, analysesMap, filterRiskOnly, searchQuery]);

  if (!isOpen) {
    return (
      <button className={styles.clauseNavToggle} onClick={onToggle} title="Klausel-Navigation öffnen">
        <span className={styles.clauseNavToggleIcon}>{'\u2630'}</span>
      </button>
    );
  }

  return (
    <div className={styles.clauseNav}>
      <div className={styles.clauseNavHeader}>
        <h3 className={styles.clauseNavTitle}>Klauseln</h3>
        <button className={styles.clauseNavCloseBtn} onClick={onToggle}>&times;</button>
      </div>

      <div className={styles.clauseNavList}>
        {filteredClauses.map(clause => {
          const analysis = analysesMap[clause.id];
          const riskLevel = analysis?.riskLevel || clause.riskIndicators?.level || 'none';
          const isActive = selectedClauseId === clause.id;

          return (
            <button
              key={clause.id}
              className={`${styles.clauseNavItem} ${isActive ? styles.clauseNavItem_active : ''}`}
              onClick={() => onSelectClause(clause.id, 'navigator')}
              title={clause.text.substring(0, 100)}
            >
              <span className={styles.clauseNavDot}>{RISK_DOT[riskLevel]}</span>
              <span className={styles.clauseNavLabel}>
                {clause.title || `Klausel ${clause.number || clause.id.replace('clause_', '')}`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
