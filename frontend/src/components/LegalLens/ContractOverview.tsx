// 📁 components/LegalLens/ContractOverview.tsx
// Premium Enterprise Dashboard für Vertragsübersicht

import React, { useMemo, useState, useCallback } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  Search,
  ChevronRight,
  ChevronDown,
  Grid3X3,
  List,
  ArrowUpDown,
  X,
  Eye,
  Info,
  Shield
} from 'lucide-react';
import type { ParsedClause, ActionLevel, RiskLevel, ClauseAnalysis } from '../../types/legalLens';
import styles from '../../styles/ContractOverview.module.css';

interface ContractOverviewProps {
  clauses: ParsedClause[];
  analysisCache: Record<string, ClauseAnalysis>;
  currentPerspective: string;
  onSelectClause: (clause: ParsedClause) => void;
  onClose: () => void;
}

type ViewMode = 'cards' | 'compact';
type SortType = 'risk' | 'order';
type InfoModalType = 'score' | 'critical' | 'negotiate' | 'ok' | null;

// Info-Modal Inhalte
const INFO_CONTENT = {
  score: {
    title: 'Risiko-Score',
    icon: Shield,
    color: '#3b82f6',
    description: 'Der Risiko-Score zeigt das durchschnittliche Risiko aller Klauseln im Vertrag.',
    details: [
      { label: '0-35', text: 'Solide - Vertrag ist weitgehend ausgewogen', color: '#16a34a' },
      { label: '36-59', text: 'Prüfen - Einige Klauseln sollten verhandelt werden', color: '#d97706' },
      { label: '60-100', text: 'Kritisch - Vertrag enthält erhebliche Risiken', color: '#dc2626' }
    ]
  },
  critical: {
    title: 'Kritische Klauseln',
    icon: AlertTriangle,
    color: '#dc2626',
    description: 'Diese Klauseln stellen erhebliche rechtliche oder finanzielle Risiken dar.',
    details: [
      { label: 'Empfehlung', text: 'Unbedingt vor Vertragsunterzeichnung anpassen lassen', color: '#dc2626' },
      { label: 'Typische Risiken', text: 'Unbegrenzte Haftung, unzumutbare Fristen, einseitige Kündigungsrechte', color: '#64748b' },
      { label: 'Priorität', text: 'HOCH - Sofortige Aufmerksamkeit erforderlich', color: '#dc2626' }
    ]
  },
  negotiate: {
    title: 'Zu verhandeln',
    icon: AlertCircle,
    color: '#d97706',
    description: 'Diese Klauseln sind nicht optimal und sollten im Verhandlungsprozess besprochen werden.',
    details: [
      { label: 'Empfehlung', text: 'Versuchen Sie, bessere Konditionen auszuhandeln', color: '#d97706' },
      { label: 'Typische Punkte', text: 'Zahlungsfristen, Gewährleistungsdauer, Haftungsgrenzen', color: '#64748b' },
      { label: 'Priorität', text: 'MITTEL - Bei Gelegenheit ansprechen', color: '#d97706' }
    ]
  },
  ok: {
    title: 'Unkritische Klauseln',
    icon: CheckCircle,
    color: '#16a34a',
    description: 'Diese Klauseln sind marktüblich und stellen kein besonderes Risiko dar.',
    details: [
      { label: 'Status', text: 'Können so akzeptiert werden', color: '#16a34a' },
      { label: 'Hinweis', text: 'Trotzdem aufmerksam durchlesen empfohlen', color: '#64748b' },
      { label: 'Priorität', text: 'NIEDRIG - Keine Aktion erforderlich', color: '#16a34a' }
    ]
  }
};

/**
 * ✅ FIX Issue #1 & #5: Content-basierter Hash für konsistenten Cache
 * Muss dieselbe Logik verwenden wie useLegalLens.ts
 */
const generateContentHash = (text: string): string => {
  const normalized = text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, 200);

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(16);
};

// Hilfsfunktion um actionLevel aus Cache oder preAnalysis zu ermitteln
const getClauseActionLevel = (
  clause: ParsedClause,
  analysisCache: Record<string, ClauseAnalysis>,
  perspective: string
): ActionLevel => {
  // ✅ FIX Issue #5: Content-basierter Cache-Key statt ID
  const contentHash = generateContentHash(clause.text);
  const cacheKey = `content-${contentHash}-${perspective}`;
  const cached = analysisCache[cacheKey];
  if (cached?.actionLevel) {
    return cached.actionLevel;
  }

  if (clause.preAnalysis) {
    const riskScore = clause.preAnalysis.riskScore;
    if (riskScore >= 70) return 'reject';
    if (riskScore >= 40) return 'negotiate';
    return 'accept';
  }

  const riskLevel = clause.riskIndicators?.level || 'low';
  if (riskLevel === 'high') return 'reject';
  if (riskLevel === 'medium') return 'negotiate';
  return 'accept';
};

// Hilfsfunktion für Risiko-Score
const getClauseRiskScore = (clause: ParsedClause): number => {
  if (clause.preAnalysis?.riskScore) {
    return clause.preAnalysis.riskScore;
  }
  if (clause.riskIndicators?.score) {
    return clause.riskIndicators.score;
  }
  const level = clause.riskIndicators?.level || 'low';
  if (level === 'high') return 75;
  if (level === 'medium') return 50;
  return 25;
};

// Items pro Sektion initial anzeigen
const ITEMS_PER_SECTION = 10;
const ITEMS_LOAD_MORE = 20;

const ContractOverview: React.FC<ContractOverviewProps> = ({
  clauses,
  analysisCache,
  currentPerspective,
  onSelectClause,
  onClose
}) => {
  // State
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sort, setSort] = useState<SortType>('risk');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['critical', 'negotiate']));
  const [visibleCounts, setVisibleCounts] = useState({
    critical: ITEMS_PER_SECTION,
    negotiate: ITEMS_PER_SECTION,
    ok: ITEMS_PER_SECTION
  });
  const [activeModal, setActiveModal] = useState<InfoModalType>(null);

  // Klauseln mit actionLevel anreichern
  const enrichedClauses = useMemo(() => {
    return clauses.map(clause => ({
      ...clause,
      actionLevel: getClauseActionLevel(clause, analysisCache, currentPerspective),
      riskScore: getClauseRiskScore(clause)
    }));
  }, [clauses, analysisCache, currentPerspective]);

  // Suche anwenden
  const filteredClauses = useMemo(() => {
    if (!searchTerm.trim()) return enrichedClauses;

    const term = searchTerm.toLowerCase();
    return enrichedClauses.filter(c =>
      c.text.toLowerCase().includes(term) ||
      c.title?.toLowerCase().includes(term) ||
      c.preAnalysis?.summary?.toLowerCase().includes(term) ||
      c.preAnalysis?.mainRisk?.toLowerCase().includes(term)
    );
  }, [enrichedClauses, searchTerm]);

  // Nach Risiko-Level gruppieren
  const groupedClauses = useMemo(() => {
    const groups = {
      critical: filteredClauses.filter(c => c.actionLevel === 'reject'),
      negotiate: filteredClauses.filter(c => c.actionLevel === 'negotiate'),
      ok: filteredClauses.filter(c => c.actionLevel === 'accept')
    };

    // Sortierung anwenden
    if (sort === 'risk') {
      groups.critical.sort((a, b) => b.riskScore - a.riskScore);
      groups.negotiate.sort((a, b) => b.riskScore - a.riskScore);
      groups.ok.sort((a, b) => b.riskScore - a.riskScore);
    }

    return groups;
  }, [filteredClauses, sort]);

  // Statistiken
  const stats = useMemo(() => ({
    critical: groupedClauses.critical.length,
    negotiate: groupedClauses.negotiate.length,
    ok: groupedClauses.ok.length,
    total: filteredClauses.length,
    originalTotal: clauses.length
  }), [groupedClauses, filteredClauses.length, clauses.length]);

  // Gesamt-Risiko-Score
  const overallRiskScore = useMemo(() => {
    if (enrichedClauses.length === 0) return 0;
    const avg = enrichedClauses.reduce((sum, c) => sum + c.riskScore, 0) / enrichedClauses.length;
    return Math.round(avg);
  }, [enrichedClauses]);

  const overallRiskLevel: RiskLevel = overallRiskScore >= 60 ? 'high' : overallRiskScore >= 35 ? 'medium' : 'low';

  // Section Toggle
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  // Load More
  const loadMore = useCallback((section: 'critical' | 'negotiate' | 'ok') => {
    setVisibleCounts(prev => ({
      ...prev,
      [section]: prev[section] + ITEMS_LOAD_MORE
    }));
  }, []);

  // Info Modal rendern
  const renderInfoModal = () => {
    if (!activeModal) return null;

    const content = INFO_CONTENT[activeModal];
    const IconComponent = content.icon;

    return (
      <div className={styles.modalOverlay} onClick={() => setActiveModal(null)}>
        <div className={styles.infoModal} onClick={e => e.stopPropagation()}>
          <button className={styles.modalClose} onClick={() => setActiveModal(null)}>
            <X size={20} />
          </button>

          <div className={styles.modalHeader} style={{ '--modal-color': content.color } as React.CSSProperties}>
            <div className={styles.modalIcon}>
              <IconComponent size={28} />
            </div>
            <h3>{content.title}</h3>
          </div>

          <p className={styles.modalDescription}>{content.description}</p>

          <div className={styles.modalDetails}>
            {content.details.map((detail, i) => (
              <div key={i} className={styles.modalDetailRow}>
                <span className={styles.modalDetailLabel} style={{ color: detail.color }}>
                  {detail.label}
                </span>
                <span className={styles.modalDetailText}>{detail.text}</span>
              </div>
            ))}
          </div>

          <button className={styles.modalButton} onClick={() => setActiveModal(null)}>
            Verstanden
          </button>
        </div>
      </div>
    );
  };

  // Rendere eine Sektion
  const renderSection = (
    key: 'critical' | 'negotiate' | 'ok',
    title: string,
    icon: React.ReactNode,
    color: string,
    bgColor: string
  ) => {
    const items = groupedClauses[key];
    const isExpanded = expandedSections.has(key);
    const visibleItems = items.slice(0, visibleCounts[key]);
    const hasMore = items.length > visibleCounts[key];

    if (items.length === 0) return null;

    return (
      <div className={styles.riskSection} key={key}>
        <button
          className={styles.sectionHeader}
          onClick={() => toggleSection(key)}
          style={{ '--section-color': color, '--section-bg': bgColor } as React.CSSProperties}
        >
          <div className={styles.sectionLeft}>
            {icon}
            <span className={styles.sectionTitle}>{title}</span>
            <span className={styles.sectionCount}>{items.length}</span>
          </div>
          <div className={styles.sectionRight}>
            {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
          </div>
        </button>

        {isExpanded && (
          <div className={styles.sectionContent}>
            {viewMode === 'cards' ? (
              <div className={styles.cardsGrid}>
                {visibleItems.map((clause) => renderClauseCard(clause, color))}
              </div>
            ) : (
              <div className={styles.compactList}>
                {visibleItems.map((clause) => renderCompactRow(clause, color))}
              </div>
            )}

            {hasMore && (
              <button
                className={styles.loadMoreButton}
                onClick={() => loadMore(key)}
              >
                Weitere {Math.min(ITEMS_LOAD_MORE, items.length - visibleCounts[key])} von {items.length - visibleCounts[key]} laden
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  // Klausel-Karte rendern
  const renderClauseCard = (clause: ParsedClause & { actionLevel: ActionLevel; riskScore: number }, color: string) => {
    return (
      <button
        key={clause.id}
        className={styles.clauseCard}
        onClick={() => onSelectClause(clause)}
        style={{ '--card-accent': color } as React.CSSProperties}
      >
        <div className={styles.cardTop}>
          <span className={styles.clauseNumber}>
            {clause.number || `#${clause.id.slice(-4)}`}
          </span>
          <span className={styles.riskBadge}>{clause.riskScore}</span>
        </div>

        {clause.title && (
          <h4 className={styles.clauseTitle}>{clause.title}</h4>
        )}

        <p className={styles.clausePreview}>
          {clause.preAnalysis?.summary || clause.text.slice(0, 100)}...
        </p>

        {clause.preAnalysis?.mainRisk && (
          <div className={styles.riskHint}>
            <AlertTriangle size={12} />
            {clause.preAnalysis.mainRisk}
          </div>
        )}

        <div className={styles.cardAction}>
          <Eye size={14} />
          <span>Analysieren</span>
        </div>
      </button>
    );
  };

  // Kompakte Zeile rendern
  const renderCompactRow = (clause: ParsedClause & { actionLevel: ActionLevel; riskScore: number }, color: string) => {
    return (
      <button
        key={clause.id}
        className={styles.compactRow}
        onClick={() => onSelectClause(clause)}
        style={{ '--row-accent': color } as React.CSSProperties}
      >
        <span className={styles.rowNumber}>{clause.number || `#${clause.id.slice(-4)}`}</span>
        <span className={styles.rowTitle}>{clause.title || clause.text.slice(0, 50)}</span>
        <span className={styles.rowRisk}>{clause.preAnalysis?.mainRisk?.slice(0, 30) || '-'}</span>
        <span className={styles.rowScore}>{clause.riskScore}</span>
        <ChevronRight size={16} className={styles.rowArrow} />
      </button>
    );
  };

  return (
    <div className={styles.overviewContainer}>
      {/* Info Modal */}
      {renderInfoModal()}

      {/* Sticky Header */}
      <div className={styles.stickyHeader}>
        {/* Top Bar */}
        <div className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <h2 className={styles.mainTitle}>Vertrags-Dashboard</h2>
            <span className={styles.clauseCounter}>{stats.originalTotal} Klauseln</span>
          </div>
          <button className={styles.detailButton} onClick={onClose}>
            Zur Detailansicht
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Premium Stats Row */}
        <div className={styles.statsRow}>
          {/* Risk Score Card - Clickable */}
          <button
            className={styles.scoreCard}
            onClick={() => setActiveModal('score')}
            style={{
              '--score-color': overallRiskLevel === 'high' ? '#dc2626' :
                              overallRiskLevel === 'medium' ? '#d97706' : '#16a34a'
            } as React.CSSProperties}
          >
            <div className={styles.scoreRing}>
              <svg viewBox="0 0 36 36" className={styles.scoreSvg}>
                <path
                  className={styles.scoreBg}
                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className={styles.scoreFill}
                  strokeDasharray={`${overallRiskScore}, 100`}
                  d="M18 2.0845a 15.9155 15.9155 0 0 1 0 31.831a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className={styles.scoreNumber}>{overallRiskScore}</span>
            </div>
            <div className={styles.scoreInfo}>
              <span className={styles.scoreLabel}>Risiko-Score</span>
              <span className={styles.scoreStatus}>
                {overallRiskLevel === 'high' ? 'Kritisch' :
                 overallRiskLevel === 'medium' ? 'Prüfen' : 'Solide'}
              </span>
            </div>
            <Info size={16} className={styles.infoIcon} />
          </button>

          {/* Stat Cards - Clickable */}
          <div className={styles.statCards}>
            <button
              className={`${styles.statCard} ${styles.criticalCard}`}
              onClick={() => setActiveModal('critical')}
            >
              <AlertTriangle size={20} />
              <div className={styles.statContent}>
                <span className={styles.statNum}>{stats.critical}</span>
                <span className={styles.statLabel}>Kritisch</span>
              </div>
              <Info size={14} className={styles.statInfo} />
            </button>

            <button
              className={`${styles.statCard} ${styles.negotiateCard}`}
              onClick={() => setActiveModal('negotiate')}
            >
              <AlertCircle size={20} />
              <div className={styles.statContent}>
                <span className={styles.statNum}>{stats.negotiate}</span>
                <span className={styles.statLabel}>Verhandeln</span>
              </div>
              <Info size={14} className={styles.statInfo} />
            </button>

            <button
              className={`${styles.statCard} ${styles.okCard}`}
              onClick={() => setActiveModal('ok')}
            >
              <CheckCircle size={20} />
              <div className={styles.statContent}>
                <span className={styles.statNum}>{stats.ok}</span>
                <span className={styles.statLabel}>OK</span>
              </div>
              <Info size={14} className={styles.statInfo} />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controlsBar}>
          <div className={styles.searchBox}>
            <Search size={16} />
            <input
              type="text"
              placeholder="Klauseln durchsuchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={styles.searchInput}
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className={styles.clearSearch}>
                <X size={14} />
              </button>
            )}
          </div>

          <div className={styles.controlButtons}>
            <button
              className={`${styles.viewToggle} ${viewMode === 'cards' ? styles.active : ''}`}
              onClick={() => setViewMode('cards')}
              title="Karten-Ansicht"
            >
              <Grid3X3 size={16} />
            </button>
            <button
              className={`${styles.viewToggle} ${viewMode === 'compact' ? styles.active : ''}`}
              onClick={() => setViewMode('compact')}
              title="Kompakt-Ansicht"
            >
              <List size={16} />
            </button>

            <button
              className={styles.sortButton}
              onClick={() => setSort(s => s === 'risk' ? 'order' : 'risk')}
            >
              <ArrowUpDown size={14} />
              {sort === 'risk' ? 'Nach Risiko' : 'Original'}
            </button>
          </div>
        </div>

        {/* Search Results Info */}
        {searchTerm && (
          <div className={styles.searchInfo}>
            {stats.total} Treffer für "{searchTerm}"
          </div>
        )}
      </div>

      {/* Scrollable Content */}
      <div className={styles.scrollContent}>
        {renderSection(
          'critical',
          'Kritische Klauseln',
          <AlertTriangle size={18} />,
          '#dc2626',
          '#fef2f2'
        )}

        {renderSection(
          'negotiate',
          'Zu verhandeln',
          <AlertCircle size={18} />,
          '#d97706',
          '#fffbeb'
        )}

        {renderSection(
          'ok',
          'Unkritisch',
          <CheckCircle size={18} />,
          '#16a34a',
          '#f0fdf4'
        )}

        {/* Empty State */}
        {stats.total === 0 && searchTerm && (
          <div className={styles.emptyState}>
            <Search size={48} />
            <h3>Keine Treffer</h3>
            <p>Keine Klauseln gefunden für "{searchTerm}"</p>
            <button onClick={() => setSearchTerm('')} className={styles.resetButton}>
              Suche zurücksetzen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractOverview;
