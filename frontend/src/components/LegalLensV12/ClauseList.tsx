// 📁 components/LegalLens/ClauseList.tsx
// Komponente für die Klausel-Liste (linke Seite)

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { FileText, Eye, ChevronDown, ChevronUp, Search, X, Check, MessageSquare, Ban } from 'lucide-react';
import type { ParsedClause, LegalLensProgress, RiskLevel, ActionLevel } from '../../types/legalLens';
import { RISK_LABELS, NON_ANALYZABLE_LABELS } from '../../types/legalLens';
import HoverTooltip from './HoverTooltip';
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
  analysisCache?: { [key: string]: unknown };
  currentPerspective?: string;
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
  streamingProgress = 0,
  analysisCache = {},
  currentPerspective = 'contractor'
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

  // Quick-Filter Tabs
  type RiskFilter = 'all' | 'high' | 'medium' | 'low';
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');

  // Clause Decision Tracking (localStorage-persisted)
  type ClauseDecision = 'accepted' | 'negotiate' | 'rejected';
  const [clauseDecisions, setClauseDecisions] = useState<Record<string, ClauseDecision>>(() => {
    try {
      const stored = localStorage.getItem('legalLens_decisions');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });

  const setDecision = useCallback((clauseId: string, decision: ClauseDecision) => {
    setClauseDecisions(prev => {
      const next = { ...prev };
      if (next[clauseId] === decision) {
        delete next[clauseId]; // Toggle off
      } else {
        next[clauseId] = decision;
      }
      localStorage.setItem('legalLens_decisions', JSON.stringify(next));
      return next;
    });
  }, []);

  // ✅ Feature 3: Hover-Tooltip
  const [tooltipClauseId, setTooltipClauseId] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getTooltipData = useCallback((clauseId: string) => {
    const cacheKey = `${clauseId}-${currentPerspective}`;
    const cached = analysisCache[cacheKey] as {
      actionLevel?: ActionLevel;
      actionReason?: string;
      explanation?: { simple?: string; summary?: string };
      perspectives?: Record<string, { actionLevel?: ActionLevel; actionReason?: string; explanation?: { simple?: string; summary?: string } }>;
    } | undefined;
    if (!cached) return null;
    const perspective = cached.perspectives?.[currentPerspective] || cached;
    return {
      actionLevel: (perspective.actionLevel || 'negotiate') as ActionLevel,
      explanation: perspective.explanation?.simple || perspective.explanation?.summary || perspective.actionReason || ''
    };
  }, [analysisCache, currentPerspective]);

  const handleClauseMouseEnter = useCallback((clauseId: string, e: React.MouseEvent) => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    tooltipTimerRef.current = setTimeout(() => {
      setTooltipClauseId(clauseId);
      setTooltipPosition({ x: e.clientX, y: e.clientY });
    }, 300);
  }, []);

  const handleClauseMouseLeave = useCallback(() => {
    if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    setTooltipClauseId(null);
  }, []);

  // Gefilterte Klauseln basierend auf Suchanfrage + Risiko-Filter
  const filteredClauses = useMemo(() => {
    let result = safeClauses;

    // Risk filter
    if (riskFilter !== 'all') {
      result = result.filter(clause => {
        if (clause.nonAnalyzable) return false;
        const level = clause.preAnalysis?.riskLevel || clause.riskIndicators?.level || 'low';
        return level === riskFilter;
      });
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(clause => {
        if (clause.text.toLowerCase().includes(query)) return true;
        if (clause.title?.toLowerCase().includes(query)) return true;
        if (clause.number?.toLowerCase().includes(query)) return true;
        if (clause.preAnalysis?.summary?.toLowerCase().includes(query)) return true;
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
    }

    return result;
  }, [safeClauses, searchQuery, riskFilter]);

  // Filter counts for badges
  const filterCounts = useMemo(() => {
    const analyzable = safeClauses.filter(c => !c.nonAnalyzable);
    return {
      all: analyzable.length,
      high: analyzable.filter(c => (c.preAnalysis?.riskLevel || c.riskIndicators?.level) === 'high').length,
      medium: analyzable.filter(c => (c.preAnalysis?.riskLevel || c.riskIndicators?.level) === 'medium').length,
      low: analyzable.filter(c => (c.preAnalysis?.riskLevel || c.riskIndicators?.level) === 'low').length
    };
  }, [safeClauses]);

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

  // Risk Minimap data
  const minimapSegments = useMemo(() => {
    const analyzable = safeClauses.filter(c => !c.nonAnalyzable);
    return analyzable.map(clause => {
      const riskLevel = clause.preAnalysis?.riskLevel || clause.riskIndicators?.level || 'low';
      return {
        id: clause.id,
        risk: riskLevel as RiskLevel,
        color: riskLevel === 'high' ? '#ef4444' : riskLevel === 'medium' ? '#f59e0b' : '#10b981'
      };
    });
  }, [safeClauses]);

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

      {/* Quick-Filter Tabs */}
      <div className={styles.filterTabs}>
        <button
          className={`${styles.filterTab} ${riskFilter === 'all' ? styles.filterTabActive : ''}`}
          onClick={() => setRiskFilter('all')}
        >
          Alle <span className={styles.filterCount}>{filterCounts.all}</span>
        </button>
        {filterCounts.high > 0 && (
          <button
            className={`${styles.filterTab} ${styles.filterTabHigh} ${riskFilter === 'high' ? styles.filterTabActive : ''}`}
            onClick={() => setRiskFilter(riskFilter === 'high' ? 'all' : 'high')}
          >
            🔴 {filterCounts.high}
          </button>
        )}
        {filterCounts.medium > 0 && (
          <button
            className={`${styles.filterTab} ${styles.filterTabMedium} ${riskFilter === 'medium' ? styles.filterTabActive : ''}`}
            onClick={() => setRiskFilter(riskFilter === 'medium' ? 'all' : 'medium')}
          >
            🟡 {filterCounts.medium}
          </button>
        )}
        {filterCounts.low > 0 && (
          <button
            className={`${styles.filterTab} ${styles.filterTabLow} ${riskFilter === 'low' ? styles.filterTabActive : ''}`}
            onClick={() => setRiskFilter(riskFilter === 'low' ? 'all' : 'low')}
          >
            🟢 {filterCounts.low}
          </button>
        )}
      </div>

      {/* Keyboard Shortcut Hint */}
      <div className={styles.keyboardHint}>
        <kbd>↑</kbd><kbd>↓</kbd> Navigation
        <kbd>Esc</kbd> Schließen
        <kbd>j</kbd><kbd>k</kbd> Vim
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
              className={`${styles.clauseItem} ${isSelected ? styles.selected : ''} ${isReviewed ? styles.reviewed : ''} ${!isCached && !isSelected ? styles.pending : ''}`}
              onClick={() => onSelectClause(clause)}
              onMouseEnter={(e) => handleClauseMouseEnter(clause.id, e)}
              onMouseLeave={handleClauseMouseLeave}
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

              {/* Decision + Status Row */}
              <div className={styles.clauseFooter}>
                {/* Decision Buttons */}
                <div className={styles.decisionBtns}>
                  <button
                    className={`${styles.decisionBtn} ${styles.decisionAccept} ${clauseDecisions[clause.id] === 'accepted' ? styles.decisionActive : ''}`}
                    onClick={(e) => { e.stopPropagation(); setDecision(clause.id, 'accepted'); }}
                    title="Akzeptieren"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    className={`${styles.decisionBtn} ${styles.decisionNegotiate} ${clauseDecisions[clause.id] === 'negotiate' ? styles.decisionActive : ''}`}
                    onClick={(e) => { e.stopPropagation(); setDecision(clause.id, 'negotiate'); }}
                    title="Verhandeln"
                  >
                    <MessageSquare size={12} />
                  </button>
                  <button
                    className={`${styles.decisionBtn} ${styles.decisionReject} ${clauseDecisions[clause.id] === 'rejected' ? styles.decisionActive : ''}`}
                    onClick={(e) => { e.stopPropagation(); setDecision(clause.id, 'rejected'); }}
                    title="Ablehnen"
                  >
                    <Ban size={12} />
                  </button>
                </div>

                {/* Status Icons */}
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
              </div>
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

      {/* Risk Minimap — vertikale Übersicht */}
      {minimapSegments.length > 3 && (
        <div className={styles.riskMinimap} title="Risiko-Übersicht">
          {minimapSegments.map((seg) => (
            <div
              key={seg.id}
              className={`${styles.minimapSegment} ${selectedClause?.id === seg.id ? styles.minimapActive : ''}`}
              style={{ backgroundColor: seg.color, flex: 1 }}
              onClick={() => {
                const clause = safeClauses.find(c => c.id === seg.id);
                if (clause && !clause.nonAnalyzable) onSelectClause(clause);
              }}
            />
          ))}
        </div>
      )}

      {/* Hover Tooltip */}
      {tooltipClauseId && (() => {
        const data = getTooltipData(tooltipClauseId);
        if (!data) return null;
        const clause = safeClauses.find(c => c.id === tooltipClauseId);
        return (
          <HoverTooltip
            actionLevel={data.actionLevel}
            explanation={data.explanation}
            clauseTitle={clause?.title || clause?.number}
            position={tooltipPosition}
            visible={true}
          />
        );
      })()}
    </div>
  );
};

export default ClauseList;
