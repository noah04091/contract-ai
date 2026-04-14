// ClauseLibraryPage.tsx - Klausel-Bibliothek mit 3 festen Tabs + dynamische Sammlungs-Tabs

import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet-async';
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
  Bookmark,
  Plus,
  FolderOpen
} from 'lucide-react';
import type {
  SavedClause,
  ClauseCategory,
  ClauseArea,
  ClauseLibraryFilters,
  ClauseLibraryStatistics,
  ClauseCollection
} from '../types/clauseLibrary';
import {
  CATEGORY_INFO,
  CLAUSE_AREA_INFO
} from '../types/clauseLibrary';
import * as clauseLibraryAPI from '../services/clauseLibraryAPI';
import * as clauseCollectionAPI from '../services/clauseCollectionAPI';
import {
  MeineKlauselnTab,
  MusterklauselnTab,
  RechtslexikonTab,
  SammlungTab,
  CreateCollectionModal
} from '../components/ClauseLibrary';
import { templateClauses } from '../data/templateClauses';
import { legalTerms } from '../data/legalTerms';
import styles from '../styles/ClauseLibraryPage.module.css';

type ViewType = 'grid' | 'list';
type SortBy = 'savedAt' | 'usageCount' | 'category';

const ClauseLibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State - read from URL
  const initialTab = searchParams.get('tab') || 'meine';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Sammlungen
  const [collections, setCollections] = useState<ClauseCollection[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);

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

  // Sammlungen laden
  const loadCollections = useCallback(async () => {
    try {
      const response = await clauseCollectionAPI.getCollections();
      if (response.success) {
        setCollections(response.collections);
      }
    } catch (err) {
      console.error('[ClauseLibrary] Collections load error:', err);
    }
  }, []);

  useEffect(() => {
    loadCollections();
  }, [loadCollections]);

  // Update URL when tab changes
  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSearchParams({ tab });
    setSelectedClause(null);
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

  // Collection erstellt
  const handleCollectionCreated = (collection: ClauseCollection) => {
    setCollections(prev => [collection, ...prev]);
    setShowCreateModal(false);
    handleTabChange(`collection_${collection._id}`);
  };

  // Collection geloescht
  const handleCollectionDeleted = (collectionId: string) => {
    setCollections(prev => prev.filter(c => c._id !== collectionId));
    handleTabChange('meine');
  };

  // Pruefen ob aktiver Tab eine Sammlung ist
  const isCollectionTab = activeTab.startsWith('collection_');
  const activeCollectionId = isCollectionTab ? activeTab.replace('collection_', '') : null;

  // Tab info for header
  const getTabInfo = () => {
    if (isCollectionTab) {
      const col = collections.find(c => c._id === activeCollectionId);
      if (col) {
        return {
          icon: <FolderOpen size={24} />,
          title: col.name,
          subtitle: `${col.itemCount || 0} Einträge`
        };
      }
    }

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
      default:
        return {
          icon: <BookOpen size={24} />,
          title: 'Klausel-Bibliothek',
          subtitle: ''
        };
    }
  };

  const tabInfo = getTabInfo();

  return (
    <>
    <Helmet>
      <title>Klausel-Bibliothek – Vertragsklauseln verwalten | Contract AI</title>
      <meta name="description" content="Verwalten Sie Ihre Vertragsklauseln: Eigene Klauseln speichern, Musterklauseln nutzen und das Rechtslexikon durchsuchen." />
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
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

        {/* View Toggle - for Meine Klauseln and Collection Tabs */}
        {(activeTab === 'meine' || isCollectionTab) && (
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
        {/* Feste Tabs */}
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

        {/* Divider + Dynamische Sammlungs-Tabs */}
        {collections.length > 0 && (
          <div className={styles.tabDivider} />
        )}

        {collections.map(col => (
          <button
            key={col._id}
            className={`${styles.tabBtn} ${styles.collectionTab} ${activeTab === `collection_${col._id}` ? styles.active : ''}`}
            onClick={() => handleTabChange(`collection_${col._id}`)}
            style={
              activeTab === `collection_${col._id}`
                ? { background: `linear-gradient(135deg, ${col.color || '#6366f1'} 0%, ${col.color || '#6366f1'}dd 100%)` }
                : undefined
            }
          >
            <span style={{ fontSize: '1rem' }}>{col.icon || '📁'}</span>
            <span>{col.name}</span>
            <span className={styles.tabCount}>{col.itemCount || 0}</span>
          </button>
        ))}

        {/* "+" Button */}
        <button
          className={styles.addTabBtn}
          onClick={() => setShowCreateModal(true)}
          title="Neue Sammlung erstellen"
        >
          <Plus size={18} />
        </button>
      </div>

      {/* Search, Filters & Stats - Only for Meine Klauseln */}
      {activeTab === 'meine' && (clauses.length > 0 || categoryFilter || areaFilter || searchQuery.trim()) && (
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

            {/* Stats-Badges inline */}
            {statistics && statistics.total > 0 && (
              <div className={styles.statsInline}>
                {([
                  { key: 'risky' as const, value: statistics.risky, label: 'Riskant' },
                  { key: 'good_practice' as const, value: statistics.goodPractice, label: 'Best Practice' },
                  { key: 'important' as const, value: statistics.important, label: 'Wichtig' },
                  { key: 'unusual' as const, value: statistics.unusual, label: 'Ungewöhnlich' }
                ]).map(stat => (
                  <button
                    key={stat.key}
                    className={`${styles.statBadge} ${categoryFilter === stat.key ? styles.statBadgeActive : ''}`}
                    onClick={() => setCategoryFilter(categoryFilter === stat.key ? '' : stat.key)}
                  >
                    <span>{CATEGORY_INFO[stat.key].icon}</span>
                    <span className={styles.statBadgeValue}>{stat.value}</span>
                    <span className={styles.statBadgeLabel}>{stat.label}</span>
                  </button>
                ))}
              </div>
            )}
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
            hasActiveFilter={!!(categoryFilter || areaFilter || searchQuery.trim())}
            onSelectClause={setSelectedClause}
            onDeleteClause={handleDelete}
            onRetry={loadClauses}
            onNavigateToTab={(tab) => handleTabChange(tab === 'musterklauseln' ? 'musterklauseln' : 'lexikon')}
            onClearFilters={() => {
              setCategoryFilter('');
              setAreaFilter('');
              setSearchQuery('');
            }}
          />
        )}

        {activeTab === 'musterklauseln' && (
          <MusterklauselnTab />
        )}

        {activeTab === 'lexikon' && (
          <RechtslexikonTab />
        )}

        {isCollectionTab && activeCollectionId && (
          <SammlungTab
            key={activeCollectionId}
            collectionId={activeCollectionId}
            viewType={viewType}
            onCollectionDeleted={() => handleCollectionDeleted(activeCollectionId)}
            onCollectionUpdated={loadCollections}
          />
        )}
      </main>

      {/* Create Collection Modal */}
      {showCreateModal && (
        <CreateCollectionModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCollectionCreated}
        />
      )}
    </div>
    </>
  );
};

export default ClauseLibraryPage;
