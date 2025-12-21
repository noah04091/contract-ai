// 📁 pages/ClauseLibraryPage.tsx
// Eigenständige Seite für die Klausel-Bibliothek

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Filter,
  Grid,
  List,
  Tag,
  BookOpen,
  Trash2,
  ExternalLink,
  ChevronDown,
  AlertTriangle,
  Eye,
  Loader2,
  X,
  Plus
} from 'lucide-react';
import type {
  SavedClause,
  ClauseCategory,
  ClauseArea,
  ClauseLibraryFilters,
  ClauseLibraryStatistics
} from '../types/clauseLibrary';
import {
  CATEGORY_INFO,
  CLAUSE_AREA_INFO
} from '../types/clauseLibrary';
import * as clauseLibraryAPI from '../services/clauseLibraryAPI';
import styles from '../styles/ClauseLibraryPage.module.css';

type ViewType = 'grid' | 'list';
type SortBy = 'savedAt' | 'usageCount' | 'category';

const ClauseLibraryPage: React.FC = () => {
  const navigate = useNavigate();

  // State
  const [clauses, setClauses] = useState<SavedClause[]>([]);
  const [statistics, setStatistics] = useState<ClauseLibraryStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & View
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ClauseCategory | ''>('');
  const [areaFilter, setAreaFilter] = useState<ClauseArea | ''>('');
  const [sortBy, setSortBy] = useState<SortBy>('savedAt');
  const [showFilters, setShowFilters] = useState(false);

  // Detail View
  const [selectedClause, setSelectedClause] = useState<SavedClause | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Load clauses
  const loadClauses = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const filters: ClauseLibraryFilters = {
        sortBy,
        sortOrder: 'desc'
      };

      if (searchQuery.trim()) {
        filters.search = searchQuery.trim();
      }

      if (categoryFilter) {
        filters.category = categoryFilter;
      }

      if (areaFilter) {
        filters.clauseArea = areaFilter;
      }

      const response = await clauseLibraryAPI.getSavedClauses(filters);

      if (response.success) {
        setClauses(response.clauses);
      }
    } catch (err) {
      console.error('[ClauseLibrary] Load error:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, categoryFilter, areaFilter, sortBy]);

  // Load statistics
  const loadStatistics = async () => {
    try {
      const response = await clauseLibraryAPI.getStatistics();
      if (response.success) {
        setStatistics(response.statistics);
      }
    } catch (err) {
      console.error('[ClauseLibrary] Stats error:', err);
    }
  };

  useEffect(() => {
    loadClauses();
    loadStatistics();
  }, [loadClauses]);

  // Delete clause
  const handleDelete = async (clauseId: string) => {
    if (!confirm('Klausel wirklich löschen?')) return;

    setIsDeleting(true);
    try {
      await clauseLibraryAPI.deleteClause(clauseId);
      setClauses(prev => prev.filter(c => c._id !== clauseId));
      setSelectedClause(null);
      loadStatistics();
    } catch (err) {
      console.error('[ClauseLibrary] Delete error:', err);
      alert('Fehler beim Löschen');
    } finally {
      setIsDeleting(false);
    }
  };

  // Navigate to contract - öffnet das Modal auf der Contracts-Seite
  const handleNavigateToContract = (contractId: string) => {
    navigate(`/contracts?view=${contractId}`);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button
            className={styles.backButton}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={20} />
          </button>
          <div className={styles.headerTitle}>
            <BookOpen size={24} />
            <div>
              <h1>Klausel-Bibliothek</h1>
              <span className={styles.clauseCount}>
                {statistics?.total || 0} Klauseln gespeichert
              </span>
            </div>
          </div>
        </div>

        {/* View Toggle */}
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewBtn} ${viewType === 'grid' ? styles.active : ''}`}
            onClick={() => setViewType('grid')}
            title="Rasteransicht"
          >
            <Grid size={18} />
          </button>
          <button
            className={`${styles.viewBtn} ${viewType === 'list' ? styles.active : ''}`}
            onClick={() => setViewType('list')}
            title="Listenansicht"
          >
            <List size={18} />
          </button>
        </div>
      </header>

      {/* Statistics Bar - Premium Cards */}
      {statistics && statistics.total > 0 && (
        <div className={styles.statsBar}>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>{CATEGORY_INFO.risky.icon}</span>
            <div>
              <span className={styles.statValue}>{statistics.risky}</span>
              <span className={styles.statLabel}>Riskant</span>
            </div>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>{CATEGORY_INFO.good_practice.icon}</span>
            <div>
              <span className={styles.statValue}>{statistics.goodPractice}</span>
              <span className={styles.statLabel}>Best Practice</span>
            </div>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>{CATEGORY_INFO.important.icon}</span>
            <div>
              <span className={styles.statValue}>{statistics.important}</span>
              <span className={styles.statLabel}>Wichtig</span>
            </div>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statIcon}>{CATEGORY_INFO.unusual.icon}</span>
            <div>
              <span className={styles.statValue}>{statistics.unusual}</span>
              <span className={styles.statLabel}>Ungewöhnlich</span>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Klauseln durchsuchen..."
            className={styles.searchInput}
          />
          {searchQuery && (
            <button
              className={styles.clearSearch}
              onClick={() => setSearchQuery('')}
            >
              <X size={16} />
            </button>
          )}
        </div>

        <button
          className={`${styles.filterBtn} ${showFilters ? styles.active : ''}`}
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} />
          Filter
          <ChevronDown size={16} className={showFilters ? styles.rotated : ''} />
        </button>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <label>Kategorie</label>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value as ClauseCategory | '')}
            >
              <option value="">Alle Kategorien</option>
              {(Object.keys(CATEGORY_INFO) as ClauseCategory[]).map(cat => (
                <option key={cat} value={cat}>
                  {CATEGORY_INFO[cat].icon} {CATEGORY_INFO[cat].label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Bereich</label>
            <select
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value as ClauseArea | '')}
            >
              <option value="">Alle Bereiche</option>
              {(Object.keys(CLAUSE_AREA_INFO) as ClauseArea[]).map(area => (
                <option key={area} value={area}>
                  {CLAUSE_AREA_INFO[area].icon} {CLAUSE_AREA_INFO[area].label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Sortieren nach</label>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortBy)}
            >
              <option value="savedAt">Neueste zuerst</option>
              <option value="usageCount">Häufig verwendet</option>
              <option value="category">Nach Kategorie</option>
            </select>
          </div>

          <button
            className={styles.clearFilters}
            onClick={() => {
              setCategoryFilter('');
              setAreaFilter('');
              setSortBy('savedAt');
              setSearchQuery('');
            }}
          >
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* Content */}
      <main className={styles.content}>
        {isLoading ? (
          <div className={styles.loadingState}>
            <Loader2 className={styles.spinner} size={48} />
            <p>Lade Klauseln...</p>
          </div>
        ) : error ? (
          <div className={styles.errorState}>
            <AlertTriangle size={48} />
            <h3>Fehler beim Laden</h3>
            <p>{error}</p>
            <button onClick={loadClauses} className={styles.retryBtn}>
              Erneut versuchen
            </button>
          </div>
        ) : clauses.length === 0 ? (
          <div className={styles.emptyState}>
            <BookOpen size={64} className={styles.emptyIcon} />
            <h3>Keine Klauseln gespeichert</h3>
            <p>
              Speichere wichtige Klauseln aus deinen Vertragsanalysen,
              um sie später wiederzufinden.
            </p>
            <button
              className={styles.exploreBtn}
              onClick={() => navigate('/contracts')}
            >
              <Plus size={18} />
              Verträge analysieren
            </button>
          </div>
        ) : (
          <div className={viewType === 'grid' ? styles.clauseGrid : styles.clauseList}>
            {clauses.map(clause => {
              const catInfo = CATEGORY_INFO[clause.category];
              const areaInfo = CLAUSE_AREA_INFO[clause.clauseArea];

              return (
                <div
                  key={clause._id}
                  className={`${styles.clauseCard} ${selectedClause?._id === clause._id ? styles.selected : ''}`}
                  onClick={() => setSelectedClause(clause)}
                  style={{ '--cat-color': catInfo.color, '--cat-bg': catInfo.bgColor } as React.CSSProperties}
                >
                  <div className={styles.cardHeader}>
                    <span className={styles.categoryBadge}>
                      {catInfo.icon} {catInfo.label}
                    </span>
                    <span className={styles.areaBadge}>
                      {areaInfo.icon} {areaInfo.label}
                    </span>
                  </div>

                  <p className={styles.clausePreview}>
                    {clause.clausePreview}
                  </p>

                  {clause.tags.length > 0 && (
                    <div className={styles.tagList}>
                      {clause.tags.slice(0, 3).map(tag => (
                        <span key={tag} className={styles.tag}>
                          <Tag size={10} />
                          {tag}
                        </span>
                      ))}
                      {clause.tags.length > 3 && (
                        <span className={styles.moreTag}>+{clause.tags.length - 3}</span>
                      )}
                    </div>
                  )}

                  <div className={styles.cardFooter}>
                    <span className={styles.date}>{formatDate(clause.savedAt)}</span>
                    {clause.usageCount > 0 && (
                      <span className={styles.usageCount}>
                        <Eye size={12} />
                        {clause.usageCount}x
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Detail Panel */}
      {selectedClause && (
        <div className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <h3>Klausel-Details</h3>
            <button
              className={styles.closeDetail}
              onClick={() => setSelectedClause(null)}
            >
              <X size={20} />
            </button>
          </div>

          <div className={styles.detailContent}>
            {/* Category & Area */}
            <div className={styles.detailMeta}>
              <span
                className={styles.detailCategory}
                style={{
                  color: CATEGORY_INFO[selectedClause.category].color,
                  background: CATEGORY_INFO[selectedClause.category].bgColor
                }}
              >
                {CATEGORY_INFO[selectedClause.category].icon}{' '}
                {CATEGORY_INFO[selectedClause.category].label}
              </span>
              <span className={styles.detailArea}>
                {CLAUSE_AREA_INFO[selectedClause.clauseArea].icon}{' '}
                {CLAUSE_AREA_INFO[selectedClause.clauseArea].label}
              </span>
            </div>

            {/* Full Text */}
            <div className={styles.detailSection}>
              <h4>Klauseltext</h4>
              <p className={styles.fullClauseText}>{selectedClause.clauseText}</p>
            </div>

            {/* Original Analysis */}
            {selectedClause.originalAnalysis && (
              <div className={styles.detailSection}>
                <h4>Ursprüngliche Analyse</h4>
                <div className={styles.analysisInfo}>
                  <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>Risiko:</span>
                    <span className={`${styles.riskBadge} ${styles[selectedClause.originalAnalysis.riskLevel || 'medium']}`}>
                      {selectedClause.originalAnalysis.riskLevel === 'high' ? 'Hoch' :
                       selectedClause.originalAnalysis.riskLevel === 'low' ? 'Niedrig' : 'Mittel'}
                      {selectedClause.originalAnalysis.riskScore !== undefined && (
                        <> ({selectedClause.originalAnalysis.riskScore}%)</>
                      )}
                    </span>
                  </div>
                  {selectedClause.originalAnalysis.mainRisk && (
                    <p className={styles.mainRisk}>
                      {selectedClause.originalAnalysis.mainRisk}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* User Notes */}
            {selectedClause.userNotes && (
              <div className={styles.detailSection}>
                <h4>Deine Notizen</h4>
                <p className={styles.userNotes}>{selectedClause.userNotes}</p>
              </div>
            )}

            {/* Tags */}
            {selectedClause.tags.length > 0 && (
              <div className={styles.detailSection}>
                <h4>Tags</h4>
                <div className={styles.detailTags}>
                  {selectedClause.tags.map(tag => (
                    <span key={tag} className={styles.detailTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source Contract */}
            {selectedClause.sourceContractName && (
              <div className={styles.detailSection}>
                <h4>Quelle</h4>
                <div className={styles.sourceInfo}>
                  <span>{selectedClause.sourceContractName}</span>
                  {selectedClause.sourceContractId && (
                    <button
                      className={styles.viewSourceBtn}
                      onClick={() => handleNavigateToContract(selectedClause.sourceContractId!)}
                    >
                      <ExternalLink size={14} />
                      Zum Vertrag
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Meta Info */}
            <div className={styles.detailSection}>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Gespeichert:</span>
                  <span>{formatDate(selectedClause.savedAt)}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Verwendet:</span>
                  <span>{selectedClause.usageCount}x</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Actions */}
          <div className={styles.detailActions}>
            <button
              className={styles.deleteBtn}
              onClick={() => handleDelete(selectedClause._id)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 size={16} className={styles.spinner} />
              ) : (
                <Trash2 size={16} />
              )}
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClauseLibraryPage;
