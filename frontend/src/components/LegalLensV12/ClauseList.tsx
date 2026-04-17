// 📁 components/LegalLens/ClauseList.tsx
// Komponente für die Klausel-Liste (linke Seite)

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { FileText, Eye, ChevronDown, ChevronUp, ChevronRight, Search, X, Check, MessageSquare, Ban, StickyNote, Keyboard } from 'lucide-react';
import type { ParsedClause, LegalLensProgress, RiskLevel, ActionLevel } from '../../types/legalLens';
import { RISK_LABELS, NON_ANALYZABLE_LABELS } from '../../types/legalLens';
import { detectClauseSections, type ClauseSection } from '../../utils/clauseSectionDetector';
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
  focusMode?: boolean;
  contractId?: string;
  onRetry?: () => void;
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
  currentPerspective = 'contractor',
  focusMode = false,
  contractId = '',
  onRetry
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
  const [showKeyHints, setShowKeyHints] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Quick-Filter Tabs
  type RiskFilter = 'all' | 'high' | 'medium' | 'low';
  const [riskFilter, setRiskFilter] = useState<RiskFilter>('all');

  // Clause Decision Tracking (localStorage-persisted, scoped by contractId)
  type ClauseDecision = 'accepted' | 'negotiate' | 'rejected';
  const decisionsKey = contractId ? `legalLens_decisions_${contractId}` : 'legalLens_decisions';
  const [clauseDecisions, setClauseDecisions] = useState<Record<string, ClauseDecision>>(() => {
    try {
      const stored = localStorage.getItem(decisionsKey);
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
      localStorage.setItem(decisionsKey, JSON.stringify(next));
      return next;
    });
  }, [decisionsKey]);

  // Clause Annotations (localStorage-persisted, scoped by contractId)
  const annotationsKey = contractId ? `legalLens_annotations_${contractId}` : 'legalLens_annotations';
  const [clauseAnnotations, setClauseAnnotations] = useState<Record<string, string>>(() => {
    try {
      const stored = localStorage.getItem(annotationsKey);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const [editingAnnotation, setEditingAnnotation] = useState<string | null>(null);
  const [annotationDraft, setAnnotationDraft] = useState('');
  const annotationInputRef = useRef<HTMLTextAreaElement>(null);

  const saveAnnotation = useCallback((clauseId: string) => {
    setClauseAnnotations(prev => {
      const next = { ...prev };
      if (annotationDraft.trim()) {
        next[clauseId] = annotationDraft.trim();
      } else {
        delete next[clauseId];
      }
      localStorage.setItem(annotationsKey, JSON.stringify(next));
      return next;
    });
    setEditingAnnotation(null);
    setAnnotationDraft('');
  }, [annotationDraft, annotationsKey]);

  const startAnnotation = useCallback((clauseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAnnotation(clauseId);
    setAnnotationDraft(clauseAnnotations[clauseId] || '');
    setTimeout(() => annotationInputRef.current?.focus(), 50);
  }, [clauseAnnotations]);

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

  // ✅ Section Grouping: Collapsible Sections für große Verträge (15+ Klauseln)
  const collapsedKey = contractId ? `legalLens_sections_${contractId}` : 'legalLens_sections';
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    try {
      const stored = localStorage.getItem(collapsedKey);
      return stored ? new Set(JSON.parse(stored)) : new Set();
    } catch { return new Set(); }
  });

  const toggleSection = useCallback((sectionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      localStorage.setItem(collapsedKey, JSON.stringify([...next]));
      return next;
    });
  }, [collapsedKey]);

  // Hauptklauseln vs. Anhang-Klauseln trennen
  const { mainClauses: mainFilteredClauses, attachmentMap } = useMemo(() => {
    const main: typeof filteredClauses = [];
    const attMap = new Map<string, { firstClauseId: string; count: number }>();

    for (const c of filteredClauses) {
      if (c.attachment) {
        if (!attMap.has(c.attachment)) {
          attMap.set(c.attachment, { firstClauseId: c.id, count: 0 });
        }
        attMap.get(c.attachment)!.count++;
      } else {
        main.push(c);
      }
    }

    return { mainClauses: main, attachmentMap: attMap };
  }, [filteredClauses]);

  // Clause Grouping — nutzt GPT-basierte Freiform-Kategorien (NUR Hauptklauseln)
  const clauseGroups = useMemo(() => {
    if (mainFilteredClauses.length < 4 || searchQuery || riskFilter !== 'all') return null;

    // Prüfe ob GPT-Kategorien vorhanden sind (mindestens 30% der Klauseln)
    const withCategory = mainFilteredClauses.filter(c => c.category && c.category.trim());
    if (withCategory.length < mainFilteredClauses.length * 0.3) return null;

    // Gruppiere nach dem Kategorie-String den GPT geliefert hat
    const categoryMap = new Map<string, typeof mainFilteredClauses>();
    const categoryOrder: string[] = [];

    for (const c of mainFilteredClauses) {
      const cat = (c.category || '').trim() || 'Sonstiges';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
        categoryOrder.push(cat);
      }
      categoryMap.get(cat)!.push(c);
    }

    // Reihenfolge: In der Reihenfolge wie sie im Vertrag vorkommen (erste Klausel pro Kategorie)
    const groups = categoryOrder.map(cat => ({
      label: cat,
      clauses: categoryMap.get(cat)!
    }));

    return groups.length >= 2 ? groups : null;
  }, [mainFilteredClauses, searchQuery, riskFilter]);

  // Section Detection — erkennt Sektionen anhand Nummernschema-Wechseln (nur Hauptklauseln, ungefilter)
  const detectedSections = useMemo((): ClauseSection[] | null => {
    // Nur auf die ungefilterten Hauptklauseln anwenden
    const mainOnly = safeClauses.filter(c => !c.attachment);
    if (mainOnly.length < 15) return null;
    return detectClauseSections(mainOnly);
  }, [safeClauses]);

  // Lookup: clauseId → sectionId (für schnellen Zugriff beim Rendern)
  const clauseSectionMap = useMemo(() => {
    if (!detectedSections) return null;
    const map = new Map<string, string>();
    for (const section of detectedSections) {
      for (const clause of section.clauses) {
        map.set(clause.id, section.id);
      }
    }
    return map;
  }, [detectedSections]);

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
          {detectedSections && detectedSections.length > 0 && !searchQuery && riskFilter === 'all' && (
            <button
              className={styles.sectionCollapseAll}
              onClick={() => {
                if (collapsedSections.size >= detectedSections.length) {
                  // Alle aufklappen
                  setCollapsedSections(new Set());
                  localStorage.removeItem(collapsedKey);
                } else {
                  // Alle zuklappen
                  const allIds = new Set(detectedSections.map(s => s.id));
                  setCollapsedSections(allIds);
                  localStorage.setItem(collapsedKey, JSON.stringify([...allIds]));
                }
              }}
              title={collapsedSections.size >= (detectedSections?.length || 0) ? 'Alle aufklappen' : 'Alle zuklappen'}
            >
              {collapsedSections.size >= detectedSections.length ? '▶ Alle' : '▼ Alle'}
            </button>
          )}
        </span>
      </div>

      {/* ✅ Search + Filter Row */}
      <div className={styles.searchFilterRow}>
        <div className={`${styles.clauseSearchWrapper} ${isSearchFocused ? styles.focused : ''}`}>
          <Search size={14} className={styles.clauseSearchIcon} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            placeholder="Suchen... (Ctrl+F)"
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
              {filteredClauses.length}/{safeClauses.length}
            </span>
          )}
        </div>

        {/* Quick-Filter Tabs */}
        <div className={styles.filterTabs}>
          <button
            className={`${styles.filterTab} ${riskFilter === 'all' ? styles.filterTabActive : ''}`}
            onClick={() => setRiskFilter('all')}
          >
            {filterCounts.all}
          </button>
          {filterCounts.high > 0 && (
            <button
              className={`${styles.filterTab} ${styles.filterTabHigh} ${riskFilter === 'high' ? styles.filterTabActive : ''}`}
              onClick={() => setRiskFilter(riskFilter === 'high' ? 'all' : 'high')}
              title="Hohes Risiko"
            >
              🔴 {filterCounts.high}
            </button>
          )}
          {filterCounts.medium > 0 && (
            <button
              className={`${styles.filterTab} ${styles.filterTabMedium} ${riskFilter === 'medium' ? styles.filterTabActive : ''}`}
              onClick={() => setRiskFilter(riskFilter === 'medium' ? 'all' : 'medium')}
              title="Mittleres Risiko"
            >
              🟡 {filterCounts.medium}
            </button>
          )}
          {filterCounts.low > 0 && (
            <button
              className={`${styles.filterTab} ${styles.filterTabLow} ${riskFilter === 'low' ? styles.filterTabActive : ''}`}
              onClick={() => setRiskFilter(riskFilter === 'low' ? 'all' : 'low')}
              title="Niedriges Risiko"
            >
              🟢 {filterCounts.low}
            </button>
          )}
          {/* Inline batch accept */}
          {filterCounts.low > 0 && Object.keys(clauseDecisions).length < filterCounts.all && (
            <button
              className={styles.batchAcceptInline}
              onClick={() => {
                const lowRisk = safeClauses.filter(c =>
                  !c.nonAnalyzable &&
                  (c.preAnalysis?.riskLevel || c.riskIndicators?.level || 'low') === 'low' &&
                  !clauseDecisions[c.id]
                );
                if (lowRisk.length === 0) return;
                setClauseDecisions(prev => {
                  const next = { ...prev };
                  lowRisk.forEach(c => { next[c.id] = 'accepted'; });
                  localStorage.setItem(decisionsKey, JSON.stringify(next));
                  return next;
                });
              }}
              title="Alle grünen Klauseln akzeptieren"
            >
              <Check size={10} /> Alle 🟢
            </button>
          )}
        </div>
      </div>

      {/* Keyboard Shortcut Hint — collapsible */}
      <div className={`${styles.keyboardHint} ${showKeyHints ? styles.keyboardHintOpen : ''}`}>
        <button className={styles.keyHintToggle} onClick={() => setShowKeyHints(p => !p)} title="Tastenkürzel">
          <Keyboard size={12} />
        </button>
        {showKeyHints && (
          <>
            <kbd>↑</kbd><kbd>↓</kbd> Nav
            <kbd>n</kbd> Risiko
            <kbd>f</kbd> Fokus
            <kbd>?</kbd> Hilfe
          </>
        )}
      </div>

      <div className={styles.clauseList}>
        {/* Section Headers + Collapsible Sections für große Verträge */}
        {filteredClauses.map((clause, clauseIdx) => {
          // ── Section Header: Collapsible Section-Trenner ──
          const sectionHeader = (() => {
            if (clause.attachment) return null;
            if (!detectedSections || !clauseSectionMap || searchQuery || riskFilter !== 'all') return null;

            // Finde die Section zu dieser Klausel
            const sectionId = clauseSectionMap.get(clause.id);
            if (!sectionId) return null;

            const section = detectedSections.find(s => s.id === sectionId);
            if (!section || section.clauses[0]?.id !== clause.id) return null;

            const isCollapsed = collapsedSections.has(sectionId);
            const sIdx = detectedSections.indexOf(section);

            return (
              <div
                key={`section-${sectionId}`}
                className={`${styles.sectionHeader} ${isCollapsed ? styles.sectionCollapsed : ''}`}
                onClick={(e) => toggleSection(sectionId, e)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && toggleSection(sectionId, e as unknown as React.MouseEvent)}
              >
                <span className={styles.sectionToggle}>
                  {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                </span>
                <span className={styles.sectionNumber}>{sIdx + 1}</span>
                <span className={styles.sectionLabel}>{section.label}</span>
                <span className={styles.sectionMeta}>
                  {section.clauses.length} Klauseln
                </span>
                <div className={styles.sectionRiskBadges}>
                  {section.riskCounts.high > 0 && (
                    <span className={`${styles.sectionRiskBadge} ${styles.sectionRiskHigh}`}>
                      {section.riskCounts.high}
                    </span>
                  )}
                  {section.riskCounts.medium > 0 && (
                    <span className={`${styles.sectionRiskBadge} ${styles.sectionRiskMedium}`}>
                      {section.riskCounts.medium}
                    </span>
                  )}
                  {section.riskCounts.low > 0 && (
                    <span className={`${styles.sectionRiskBadge} ${styles.sectionRiskLow}`}>
                      {section.riskCounts.low}
                    </span>
                  )}
                </div>
              </div>
            );
          })();

          // ── Skip collapsed section clauses ──
          const isInCollapsedSection = (() => {
            if (!clauseSectionMap || !detectedSections || searchQuery || riskFilter !== 'all') return false;
            const sectionId = clauseSectionMap.get(clause.id);
            return sectionId ? collapsedSections.has(sectionId) : false;
          })();

          if (isInCollapsedSection) {
            // Nur den Section-Header rendern, Klauseln überspringen
            const sectionId = clauseSectionMap?.get(clause.id);
            const section = sectionId ? detectedSections?.find(s => s.id === sectionId) : null;
            if (section && section.clauses[0]?.id === clause.id) {
              return <React.Fragment key={clause.id}>{sectionHeader}</React.Fragment>;
            }
            return null;
          }

          // Anhang-Section-Header: Visueller Separator wenn Anhang beginnt
          const attachmentSectionHeader = (() => {
            if (!clause.attachment) return null;
            // Prüfe ob dies die erste Klausel dieses Anhangs ist
            const info = attachmentMap.get(clause.attachment);
            if (!info || info.firstClauseId !== clause.id) return null;
            // Prüfe ob wir einen "Anhänge & Anlagen"-Hauptheader brauchen (erster Anhang überhaupt)
            const isFirstAttachment = clauseIdx === 0 || !filteredClauses[clauseIdx - 1]?.attachment;
            return (
              <>
                {isFirstAttachment && (
                  <div className={styles.attachmentSectionDivider}>
                    <span className={styles.attachmentSectionLine} />
                    <span className={styles.attachmentSectionTitle}>Anh&auml;nge &amp; Anlagen</span>
                    <span className={styles.attachmentSectionLine} />
                  </div>
                )}
                <div className={styles.attachmentGroupHeader}>
                  <span className={styles.attachmentGroupIcon}>&#128206;</span>
                  <span className={styles.attachmentGroupName}>{clause.attachment}</span>
                  <span className={styles.attachmentGroupCount}>{info.count} Klauseln</span>
                </div>
              </>
            );
          })();

          // Group headers — nur wenn KEINE Sektionen erkannt wurden (Fallback für kleine Verträge)
          const groupLabel = (() => {
            if (clause.attachment) return null;
            if (detectedSections) return null; // Sektionen haben Vorrang
            if (!clauseGroups) return null;
            for (const group of clauseGroups) {
              if (group.clauses.length > 0 && group.clauses[0].id === clause.id) {
                return group.label;
              }
            }
            return null;
          })();

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
          const groupHeaderEl = groupLabel ? (
            <div key={`group-${clause.id}`} className={styles.clauseGroupHeader}>
              <span className={styles.clauseGroupLine} />
              <span className={styles.clauseGroupLabel}>{groupLabel}</span>
              <span className={styles.clauseGroupLine} />
            </div>
          ) : null;

          if (isNonAnalyzable) {
            return (
              <React.Fragment key={clause.id}>
                {sectionHeader}
                {attachmentSectionHeader}
                {groupHeaderEl}
                <div
                  ref={(el) => {
                    if (el) clauseRefs.current.set(clause.id, el);
                  }}
                  className={`${styles.clauseItem} ${styles.nonAnalyzable}`}
                >
                  <div className={styles.clauseHeader}>
                    <span className={styles.clauseNumber}>
                      {clause.number || ''}
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
              </React.Fragment>
            );
          }

          return (
            <React.Fragment key={clause.id}>
            {sectionHeader}
            {attachmentSectionHeader}
            {groupHeaderEl}
            <div
              ref={(el) => {
                // ✅ FIX Issue #5: Ref für Auto-Scroll speichern
                if (el) clauseRefs.current.set(clause.id, el);
              }}
              className={`${styles.clauseItem} ${isSelected ? styles.selected : ''} ${isReviewed ? styles.reviewed : ''} ${!isCached && !isSelected ? styles.pending : ''} ${focusMode && !isSelected && selectedClause ? styles.focusDimmed : ''}`}
              onClick={() => onSelectClause(clause)}
              onMouseEnter={(e) => handleClauseMouseEnter(clause.id, e)}
              onMouseLeave={handleClauseMouseLeave}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelectClause(clause)}
            >
              <div className={styles.clauseHeader}>
                <span className={styles.clauseNumber}>
                  {clause.number || ''}
                  {clause.title && ` - ${clause.title}`}
                </span>
                <span
                  className={`${styles.clauseRisk} ${styles[effectiveRiskLevel]}`}
                  title={clause.riskReason || ''}
                >
                  {getRiskEmoji(effectiveRiskLevel)} {RISK_LABELS[effectiveRiskLevel]}
                </span>
              </div>

              {clause.riskReason && effectiveRiskLevel !== 'low' && (
                <div className={styles.riskReasonHint}>
                  {clause.riskReason}
                </div>
              )}

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

                {/* Annotation Button — far right */}
                <button
                  className={`${styles.decisionBtn} ${styles.annotationBtn} ${clauseAnnotations[clause.id] ? styles.annotationActive : ''}`}
                  onClick={(e) => startAnnotation(clause.id, e)}
                  title={clauseAnnotations[clause.id] ? 'Notiz bearbeiten' : 'Notiz hinzufügen'}
                >
                  <StickyNote size={12} />
                </button>
              </div>

              {/* Annotation Display / Editor */}
              {clauseAnnotations[clause.id] && editingAnnotation !== clause.id && (
                <div
                  className={styles.annotationDisplay}
                  onClick={(e) => startAnnotation(clause.id, e)}
                >
                  <StickyNote size={10} />
                  <span>{clauseAnnotations[clause.id]}</span>
                </div>
              )}
              {editingAnnotation === clause.id && (
                <div className={styles.annotationEditor} onClick={(e) => e.stopPropagation()}>
                  <textarea
                    ref={annotationInputRef}
                    className={styles.annotationInput}
                    value={annotationDraft}
                    onChange={(e) => setAnnotationDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveAnnotation(clause.id); }
                      if (e.key === 'Escape') { setEditingAnnotation(null); }
                    }}
                    placeholder="Notiz hinzufügen..."
                    rows={2}
                  />
                  <div className={styles.annotationActions}>
                    <button className={styles.annotationSaveBtn} onClick={() => saveAnnotation(clause.id)}>
                      <Check size={12} /> Speichern
                    </button>
                    <button className={styles.annotationCancelBtn} onClick={() => setEditingAnnotation(null)}>
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
            </React.Fragment>
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
                {/* Keine Klauseln gefunden — mögliche Ursachen: Timeout, Nicht-Vertrag, OCR-Problem */}
                <FileText size={48} strokeWidth={1} className={styles.emptyIconSvg} />
                <h4 className={styles.emptyTitle}>Keine Klauseln erkannt</h4>
                <p className={styles.emptyText}>
                  Die Analyse konnte keine Klauseln extrahieren. Mögliche Ursachen:
                </p>
                <ul className={styles.emptyHintList}>
                  <li>Verbindung unterbrochen bei großen Dokumenten</li>
                  <li>Dokument enthält keinen Vertragstext</li>
                  <li>Gescanntes PDF ohne Texterkennung</li>
                </ul>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    style={{
                      marginTop: '1rem',
                      padding: '0.625rem 1.5rem',
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
                    }}
                  >
                    Erneut versuchen
                  </button>
                )}
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
