// ClauseLibraryPage.tsx - Klausel-Bibliothek 2.0 mit 3-Tab-System

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  Search,
  Filter,
  Grid,
  List,
  BookOpen,
  ChevronDown,
  X,
  FileText,
  Scale,
  Bookmark
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
import { MeineKlauselnTab, MusterklauselnTab, RechtslexikonTab } from '../components/ClauseLibrary';
import { templateClauses } from '../data/templateClauses';
import { legalTerms } from '../data/legalTerms';
import styles from '../styles/ClauseLibraryPage.module.css';

type ViewType = 'grid' | 'list';
type SortBy = 'savedAt' | 'usageCount' | 'category';
type TabType = 'meine' | 'musterklauseln' | 'lexikon';

const ClauseLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State - read from URL or default to 'meine'
  const initialTab = (searchParams.get('tab') as TabType) || 'meine';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);

  // Meine Klauseln State
  const [clauses, setClauses] = useState<SavedClause[]>([]);
  const [statistics, setStatistics] = useState<ClauseLibraryStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & View (for Meine Klauseln)
  const [viewType, setViewType] = useState<ViewType>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<ClauseCategory | ''>('');
  const [areaFilter, setAreaFilter] = useState<ClauseArea | ''>('');
  const [sortBy, setSortBy] = useState<SortBy>('savedAt');
  const [showFilters, setShowFilters] = useState(false);

  // Detail View
  const [selectedClause, setSelectedClause] = useState<SavedClause | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Update URL when tab changes
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSelectedClause(null); // Close detail panel when switching tabs
  };

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

  // Tab info for header
  const getTabInfo = () => {
    switch (activeTab) {
      case 'meine':
        return {
          icon: <Bookmark size={24} />,
          title: 'Meine Klauseln',
          subtitle: `${statistics?.total || 0} Klauseln gespeichert`
        };
      case 'musterklauseln':
        return {
          icon: <FileText size={24} />,
          title: 'Musterklauseln',
          subtitle: `${templateClauses.length} Vorlagen verfügbar`
        };
      case 'lexikon':
        return {
          icon: <Scale size={24} />,
          title: 'Rechtslexikon',
          subtitle: `${legalTerms.length} Begriffe erklärt`
        };
    }
  };

  const tabInfo = getTabInfo();

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
            <div className={styles.headerIcon}>
              <BookOpen size={20} />
            </div>
            <div>
              <h1>Klausel-Bibliothek</h1>
              <span className={styles.clauseCount}>{tabInfo.subtitle}</span>
            </div>
          </div>
        </div>

        {/* View Toggle - Only for Meine Klauseln */}
        {activeTab === 'meine' && (
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
        )}
      </header>

      {/* Tab Bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'meine' ? styles.active : ''}`}
          onClick={() => handleTabChange('meine')}
        >
          <Bookmark size={16} />
          <span>Meine Klauseln</span>
          {statistics && statistics.total > 0 && (
            <span className={styles.tabCount}>{statistics.total}</span>
          )}
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'musterklauseln' ? styles.active : ''}`}
          onClick={() => handleTabChange('musterklauseln')}
        >
          <FileText size={16} />
          <span>Musterklauseln</span>
          <span className={styles.tabCount}>{templateClauses.length}+</span>
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'lexikon' ? styles.active : ''}`}
          onClick={() => handleTabChange('lexikon')}
        >
          <Scale size={16} />
          <span>Rechtslexikon</span>
          <span className={styles.tabCount}>{legalTerms.length}+</span>
        </button>
      </div>

      {/* Statistics Bar - Only for Meine Klauseln when there are clauses */}
      {activeTab === 'meine' && statistics && statistics.total > 0 && (
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

      {/* Search & Filters - Only for Meine Klauseln */}
      {activeTab === 'meine' && clauses.length > 0 && (
        <>
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
        </>
      )}

      {/* Content */}
      <main className={styles.content}>
        {activeTab === 'meine' && (
          <MeineKlauselnTab
            clauses={clauses}
            isLoading={isLoading}
            error={error}
            selectedClause={selectedClause}
            isDeleting={isDeleting}
            viewType={viewType}
            onSelectClause={setSelectedClause}
            onDeleteClause={handleDelete}
            onRetry={loadClauses}
            onNavigateToTab={(tab) => handleTabChange(tab === 'musterklauseln' ? 'musterklauseln' : 'lexikon')}
          />
        )}

        {activeTab === 'musterklauseln' && (
          <MusterklauselnTab />
        )}

        {activeTab === 'lexikon' && (
          <RechtslexikonTab />
        )}
      </main>
    </div>
  );
};

export default ClauseLibraryPage;
