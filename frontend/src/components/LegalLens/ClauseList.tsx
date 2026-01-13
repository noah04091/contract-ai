// 📁 components/LegalLens/ClauseList.tsx
// Komponente für die Klausel-Liste (linke Seite)

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { FileText, Eye, ChevronDown, ChevronUp } from 'lucide-react';
import type { ParsedClause, LegalLensProgress, RiskLevel } from '../../types/legalLens';
import { RISK_LABELS } from '../../types/legalLens';
import styles from '../../styles/LegalLens.module.css';

type ViewMode = 'text' | 'pdf';

interface ClauseListProps {
  clauses: ParsedClause[];
  selectedClause: ParsedClause | null;
  progress: LegalLensProgress | null;
  onSelectClause: (clause: ParsedClause) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  cachedClauseIds?: string[];
}

const ClauseList: React.FC<ClauseListProps> = ({
  clauses,
  selectedClause,
  progress,
  onSelectClause,
  viewMode = 'text',
  onViewModeChange,
  cachedClauseIds = []
}) => {
  // ✅ FIX Issue #5: Refs für Auto-Scroll zur ausgewählten Klausel
  const clauseRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  // Refs für Text-Elemente um Überlauf zu prüfen
  const textRefs = useRef<Map<string, HTMLParagraphElement>>(new Map());

  // ✅ Defensiver Check für undefined clauses
  const safeClauses = clauses || [];

  // ✅ Phase 3: State für expandierte Klauseln
  const [expandedClauses, setExpandedClauses] = useState<Set<string>>(new Set());
  const [overflowingClauses, setOverflowingClauses] = useState<Set<string>>(new Set());

  // Prüfe welche Klauseln mehr als 3 Zeilen haben
  useEffect(() => {
    const checkOverflow = () => {
      const newOverflowing = new Set<string>();
      textRefs.current.forEach((el, id) => {
        if (el) {
          // Prüfe ob Text abgeschnitten ist (scrollHeight > clientHeight)
          const isOverflowing = el.scrollHeight > el.clientHeight + 2; // +2 für Rundungsfehler
          if (isOverflowing) {
            newOverflowing.add(id);
          }
        }
      });
      setOverflowingClauses(newOverflowing);
    };

    // Nach kurzem Timeout prüfen (warten auf Render)
    const timer = setTimeout(checkOverflow, 100);
    return () => clearTimeout(timer);
  }, [safeClauses]);

  // Toggle expand/collapse für eine Klausel
  const toggleExpand = useCallback((clauseId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Verhindert dass die Klausel ausgewählt wird
    setExpandedClauses(prev => {
      const newSet = new Set(prev);
      if (newSet.has(clauseId)) {
        newSet.delete(clauseId);
      } else {
        newSet.add(clauseId);
      }
      return newSet;
    });
  }, []);

  // ✅ Auto-Scroll zur ausgewählten Klausel wenn sie sich ändert
  useEffect(() => {
    if (selectedClause && clauseRefs.current.has(selectedClause.id)) {
      const element = clauseRefs.current.get(selectedClause.id);
      if (element) {
        // Smooth scroll zur Klausel mit etwas Abstand vom oberen Rand
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });

        // Kurzes visuelles Highlight für bessere Sichtbarkeit
        element.style.animation = 'pulse-highlight 1s ease-out';
        setTimeout(() => {
          element.style.animation = '';
        }, 1000);
      }
    }
  }, [selectedClause?.id]);
  const isClauseReviewed = (clauseId: string): boolean => {
    return progress?.reviewedClauses?.includes(clauseId) || false;
  };

  const isClauseCached = (clauseId: string): boolean => {
    return cachedClauseIds.includes(clauseId);
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
        <h3 className={styles.contractTitle}>Dokument</h3>

        {/* View Mode Toggle - Centered */}
        {onViewModeChange && (
          <div className={styles.contractHeaderCenter}>
            <button
              onClick={() => onViewModeChange('text')}
              className={`${styles.viewToggleBtn} ${viewMode === 'text' ? styles.active : ''}`}
            >
              <FileText size={14} />
              Text
            </button>
            <button
              onClick={() => onViewModeChange('pdf')}
              className={`${styles.viewToggleBtn} ${viewMode === 'pdf' ? styles.active : ''}`}
            >
              <Eye size={14} />
              PDF
            </button>
          </div>
        )}

        <span className={styles.clauseCount}>
          {safeClauses.length} Klauseln
        </span>
      </div>

      <div className={styles.clauseList}>
        {safeClauses.map((clause) => {
          const isSelected = selectedClause?.id === clause.id;
          const isReviewed = isClauseReviewed(clause.id);
          const isCached = isClauseCached(clause.id);
          const isBookmarked = isClauseBookmarked(clause.id);
          const notesCount = getClauseNotes(clause.id);
          const riskLevel = clause.riskIndicators?.level || 'low';

          // Verwende preAnalysis wenn verfügbar, sonst riskIndicators
          const effectiveRiskLevel = clause.preAnalysis?.riskLevel || riskLevel;

          return (
            <div
              key={clause.id}
              ref={(el) => {
                // ✅ FIX Issue #5: Ref für Auto-Scroll speichern
                if (el) clauseRefs.current.set(clause.id, el);
              }}
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
                <span className={`${styles.clauseRisk} ${styles[effectiveRiskLevel]}`}>
                  {getRiskEmoji(effectiveRiskLevel)} {RISK_LABELS[effectiveRiskLevel]}
                </span>
              </div>

              <div className={styles.clauseTextWrapper}>
                <p
                  ref={(el) => {
                    if (el) textRefs.current.set(clause.id, el);
                  }}
                  className={`${styles.clauseText} ${expandedClauses.has(clause.id) ? styles.expanded : ''}`}
                >
                  {clause.text}
                </p>
                {/* Expand/Collapse Button - nur wenn Text überläuft */}
                {(overflowingClauses.has(clause.id) || expandedClauses.has(clause.id)) && (
                  <button
                    className={styles.expandButton}
                    onClick={(e) => toggleExpand(clause.id, e)}
                    title={expandedClauses.has(clause.id) ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                  >
                    {expandedClauses.has(clause.id) ? (
                      <>
                        <ChevronUp size={14} />
                        <span>Weniger</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown size={14} />
                        <span>Mehr anzeigen</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Voranalyse-Info anzeigen wenn verfügbar */}
              {clause.preAnalysis && (
                <div className={styles.preAnalysisInfo}>
                  <span className={styles.preAnalysisSummary}>
                    {clause.preAnalysis.summary}
                  </span>
                  {clause.preAnalysis.mainRisk && clause.preAnalysis.mainRisk !== 'Kein besonderes Risiko' && (
                    <span className={styles.preAnalysisRisk}>
                      ⚠️ {clause.preAnalysis.mainRisk}
                    </span>
                  )}
                </div>
              )}

              {(isBookmarked || notesCount > 0 || isReviewed || isCached) && (
                <div className={styles.clauseIcons}>
                  {isCached && (
                    <span className={`${styles.clauseIcon} ${styles.cachedIcon}`} title="Bereits geladen - Sofort verfügbar">⚡</span>
                  )}
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

        {safeClauses.length === 0 && (
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
