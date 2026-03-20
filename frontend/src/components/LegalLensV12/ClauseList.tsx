// 📁 components/LegalLens/ClauseList.tsx
// Komponente für die Klausel-Liste (linke Seite)

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { FileText, Eye, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import type { ParsedClause, LegalLensProgress, RiskLevel } from '../../types/legalLens';
import { RISK_LABELS, NON_ANALYZABLE_LABELS } from '../../types/legalLens';
import styles from '../../styles/LegalLensV12.module.css';

/**
 * Formatiert Klausel-Text für bessere Lesbarkeit
 * - Fügt Zeilenumbrüche nach Satzenden ein
 * - Erkennt §-Paragraphen und Aufzählungen
 * - Begrenzt auf max. 3 Absätze für Vorschau
 */
const formatClauseText = (text: string, maxParagraphs: number = 3): React.ReactNode => {
  if (!text) return null;

  // Normalisiere Whitespace
  let formatted = text.replace(/\s+/g, ' ').trim();

  // Füge Zeilenumbrüche ein bei:
  // 1. Satzende gefolgt von Großbuchstabe (aber nicht bei Abkürzungen)
  formatted = formatted.replace(/([.!?])\s+([A-ZÄÖÜ])/g, '$1\n$2');

  // 2. Vor §-Zeichen oder "Art." / "Artikel"
  formatted = formatted.replace(/\s+(§\s*\d)/g, '\n$1');
  formatted = formatted.replace(/\s+(Art\.\s*\d)/g, '\n$1');

  // 3. Bei Aufzählungen (a), (b), (1), (2), etc.
  formatted = formatted.replace(/\s+(\([a-z]\)|\(\d+\)|\d+\.)\s+/g, '\n$1 ');

  // 4. Bei Bindestrichen am Zeilenanfang (Aufzählung)
  formatted = formatted.replace(/\s+-\s+([A-ZÄÖÜ])/g, '\n- $1');

  // Teile in Absätze
  const paragraphs = formatted.split('\n').filter(p => p.trim().length > 0);

  // Begrenze auf maxParagraphs für Vorschau
  const displayParagraphs = paragraphs.slice(0, maxParagraphs);
  const hasMore = paragraphs.length > maxParagraphs;

  return (
    <>
      {displayParagraphs.map((paragraph, index) => (
        <span key={index} className={styles.clauseParagraph}>
          {paragraph.trim()}
          {index < displayParagraphs.length - 1 && <br />}
        </span>
      ))}
      {hasMore && <span className={styles.clauseMoreIndicator}>...</span>}
    </>
  );
};

type ViewMode = 'text' | 'pdf';

interface ClauseListProps {
  clauses: ParsedClause[];
  selectedClause: ParsedClause | null;
  progress: LegalLensProgress | null;
  onSelectClause: (clause: ParsedClause) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  cachedClauseIds?: string[];
  isStreaming?: boolean;
  streamingProgress?: number;
}

const ClauseList: React.FC<ClauseListProps> = ({
  clauses,
  selectedClause,
  progress,
  onSelectClause,
  viewMode = 'text',
  onViewModeChange,
  cachedClauseIds = [],
  isStreaming = false,
  streamingProgress = 0
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

  // ✅ Opt 4: Klausel-Suche
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Gefilterte Klauseln basierend auf Suchanfrage
  const filteredClauses = useMemo(() => {
    if (!searchQuery.trim()) return safeClauses;

    const query = searchQuery.toLowerCase().trim();

    return safeClauses.filter(clause => {
      // Suche in Text
      if (clause.text.toLowerCase().includes(query)) return true;
      // Suche in Titel
      if (clause.title?.toLowerCase().includes(query)) return true;
      // Suche in Nummer
      if (clause.number?.toLowerCase().includes(query)) return true;
      // Suche in PreAnalysis Summary
      if (clause.preAnalysis?.summary?.toLowerCase().includes(query)) return true;
      // Suche in Risk-Level (z.B. "hoch" oder "niedrig")
      const riskLevel = clause.preAnalysis?.riskLevel || clause.riskIndicators?.level;
      if (riskLevel) {
        const riskLabels: Record<string, string[]> = {
          high: ['hoch', 'high', 'rot', 'kritisch', 'gefährlich'],
          medium: ['mittel', 'medium', 'gelb', 'moderat'],
          low: ['niedrig', 'low', 'grün', 'unbedenklich', 'sicher']
        };
        if (riskLabels[riskLevel]?.some(label => label.includes(query) || query.includes(label))) {
          return true;
        }
      }
      return false;
    });
  }, [safeClauses, searchQuery]);

  // Keyboard shortcut: Ctrl+F oder Cmd+F zum Fokussieren der Suche
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        // Nur abfangen wenn wir im ClauseList-Bereich sind
        const target = e.target as HTMLElement;
        if (!target.closest('.react-pdf__Page')) {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
      // Escape zum Leeren der Suche
      if (e.key === 'Escape' && searchQuery) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery]);

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

        // Kurzes visuelles Highlight für bessere Sichtbarkeit (CSS Module class)
        element.classList.add(styles.pulseHighlight);
        setTimeout(() => {
          element.classList.remove(styles.pulseHighlight);
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

      {/* ✅ Opt 4: Suchfeld */}
      <div className={`${styles.clauseSearchWrapper} ${isSearchFocused ? styles.focused : ''}`}>
        <Search size={16} className={styles.clauseSearchIcon} />
        <input
          ref={searchInputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="Klauseln durchsuchen... (Ctrl+F)"
          className={styles.clauseSearchInput}
        />
        {searchQuery && (
          <button
            className={styles.clauseSearchClear}
            onClick={() => {
              setSearchQuery('');
              searchInputRef.current?.focus();
            }}
            title="Suche leeren"
          >
            <X size={14} />
          </button>
        )}
        {searchQuery && (
          <span className={styles.clauseSearchCount}>
            {filteredClauses.length} / {safeClauses.length}
          </span>
        )}
      </div>

      <div className={styles.clauseList}>
        {filteredClauses.map((clause) => {
          const isSelected = selectedClause?.id === clause.id;
          const isReviewed = isClauseReviewed(clause.id);
          const isCached = isClauseCached(clause.id);
          const isBookmarked = isClauseBookmarked(clause.id);
          const notesCount = getClauseNotes(clause.id);
          const riskLevel = clause.riskIndicators?.level || 'low';
          const isNonAnalyzable = clause.nonAnalyzable === true;

          // Verwende preAnalysis wenn verfügbar, sonst riskIndicators
          const effectiveRiskLevel = isNonAnalyzable ? 'none' : (clause.preAnalysis?.riskLevel || riskLevel);

          // Nicht-analysierbare Klauseln: ausgegraut, nicht klickbar
          if (isNonAnalyzable) {
            return (
              <div
                key={clause.id}
                ref={(el) => {
                  if (el) clauseRefs.current.set(clause.id, el);
                }}
                className={`${styles.clauseItem} ${styles.nonAnalyzable}`}
              >
                <div className={styles.clauseHeader}>
                  <span className={styles.clauseNumber}>
                    {clause.number || `#${clause.id.slice(-4)}`}
                    {clause.title && ` - ${clause.title}`}
                  </span>
                  <span className={`${styles.clauseRisk} ${styles.none}`}>
                    {clause.nonAnalyzableReason && NON_ANALYZABLE_LABELS[clause.nonAnalyzableReason]
                      ? NON_ANALYZABLE_LABELS[clause.nonAnalyzableReason]
                      : 'Info'}
                  </span>
                </div>
                <p className={`${styles.clauseText} ${styles.nonAnalyzableText}`}>
                  {clause.text}
                </p>
              </div>
            );
          }

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
                <div
                  ref={(el) => {
                    if (el) textRefs.current.set(clause.id, el as unknown as HTMLParagraphElement);
                  }}
                  className={`${styles.clauseText} ${expandedClauses.has(clause.id) ? styles.expanded : ''}`}
                >
                  {expandedClauses.has(clause.id)
                    ? formatClauseText(clause.text, 999) // Alle Absätze wenn expanded
                    : formatClauseText(clause.text, 3)   // Max 3 Absätze für Vorschau
                  }
                </div>
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

        {/* Keine Suchergebnisse */}
        {filteredClauses.length === 0 && safeClauses.length > 0 && searchQuery && (
          <div className={styles.analysisPanelEmpty}>
            <span className={styles.emptyIcon}>🔍</span>
            <h4 className={styles.emptyTitle}>Keine Treffer</h4>
            <p className={styles.emptyText}>
              Keine Klauseln für „{searchQuery}" gefunden.
            </p>
            <button
              className={styles.clearSearchButton}
              onClick={() => setSearchQuery('')}
            >
              Suche zurücksetzen
            </button>
          </div>
        )}

        {/* Keine Klauseln vorhanden */}
        {safeClauses.length === 0 && (
          <div className={styles.analysisPanelEmpty}>
            {isStreaming ? (
              <>
                {/* Streaming in Progress - Lade-Animation */}
                <div className={styles.streamingLoader}>
                  <div className={styles.streamingPulse} />
                </div>
                <h4 className={styles.emptyTitle}>Klauseln werden erkannt...</h4>
                <p className={styles.emptyText}>
                  Die KI analysiert den Vertrag. Klauseln erscheinen hier sobald sie erkannt werden.
                </p>
                <div className={styles.streamingMiniProgress}>
                  <div
                    className={styles.streamingMiniBar}
                    style={{ width: `${streamingProgress}%` }}
                  />
                </div>
                <span className={styles.streamingPercent}>{streamingProgress}% analysiert</span>
              </>
            ) : (
              <>
                {/* Wirklich keine Klauseln gefunden */}
                <FileText size={48} strokeWidth={1} className={styles.emptyIconSvg} />
                <h4 className={styles.emptyTitle}>Keine Klauseln erkannt</h4>
                <p className={styles.emptyText}>Versuchen Sie:</p>
                <ul className={styles.emptyHintList}>
                  <li>Das Dokument erneut hochzuladen</li>
                  <li>Eine bessere Scan-Qualität (mind. 300 DPI)</li>
                  <li>Die PDF-Ansicht zu nutzen und Klauseln manuell zu markieren</li>
                </ul>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClauseList;
