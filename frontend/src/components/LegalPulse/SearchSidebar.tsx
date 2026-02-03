import { useState, useEffect, useRef, useCallback } from 'react';
import type { ExternalSearchResult } from '../../types/legalPulse';
import styles from '../../pages/LegalPulse.module.css';

interface SearchSidebarProps {
  onClose: () => void;
  onNotification: (notification: { message: string; type: 'success' | 'error' }) => void;
}

export default function SearchSidebar({ onClose, onNotification }: SearchSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSources, setSearchSources] = useState<string[]>(['eulex', 'bundesanzeiger', 'govdata']);
  const [searchArea, setSearchArea] = useState('');
  const [searchResults, setSearchResults] = useState<ExternalSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const sidebarRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Escape key closes sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Focus trap within sidebar
  const handleFocusTrap = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Tab' || !sidebarRef.current) return;

    const focusableElements = sidebarRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey && document.activeElement === firstElement) {
      e.preventDefault();
      lastElement.focus();
    } else if (!e.shiftKey && document.activeElement === lastElement) {
      e.preventDefault();
      firstElement.focus();
    }
  }, []);

  const handleSearch = async (append = false) => {
    if (!searchQuery.trim()) {
      onNotification({ message: "Bitte geben Sie einen Suchbegriff ein", type: "error" });
      return;
    }

    setIsLoading(true);
    try {
      const currentOffset = append ? offset : 0;
      const params = new URLSearchParams({
        query: searchQuery,
        sources: searchSources.join(','),
        limit: '100',
        offset: currentOffset.toString()
      });

      if (searchArea) {
        params.append('area', searchArea);
      }

      const response = await fetch(`/api/external-legal/search?${params.toString()}`, {
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        const newResults = data.results || [];

        if (append) {
          setSearchResults(prev => [...prev, ...newResults]);
        } else {
          setSearchResults(newResults);
          setOffset(0);
        }

        setHasMore(newResults.length === 100);
        setOffset(append ? currentOffset + newResults.length : newResults.length);

        if (!append) {
          onNotification({
            message: `${newResults.length} Ergebnisse gefunden${newResults.length === 100 ? ' (mehr verfügbar)' : ''}`,
            type: "success"
          });
        }
      } else {
        onNotification({ message: data.message || "Fehler bei der Suche", type: "error" });
      }
    } catch (error) {
      console.error('External search error:', error);
      onNotification({ message: "Fehler bei der externen Suche", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSource = (source: string) => {
    setSearchSources(prev =>
      prev.includes(source)
        ? prev.filter(s => s !== source)
        : [...prev, source]
    );
  };

  return (
    <div className={styles.sidebarOverlay} onClick={onClose}>
      <div
        ref={sidebarRef}
        className={`${styles.sidebar} ${styles.wideSidebar}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleFocusTrap}
        role="dialog"
        aria-label="Externe Gesetzessuche"
        aria-modal="true"
      >
        <div className={styles.sidebarHeader}>
          <h2>Externe Gesetzessuche</h2>
          <button className={styles.closeSidebar} onClick={onClose} aria-label="Sidebar schließen">×</button>
        </div>
        <div className={styles.sidebarContent}>
          <div className={styles.externalSearchForm}>
            <div className={styles.searchInputGroup}>
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Suchbegriff eingeben (z.B. DSGVO, Arbeitsrecht, ...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
              <button
                className={styles.searchButton}
                onClick={() => handleSearch(false)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className={styles.spinner} aria-hidden="true"></div>
                    Suche läuft...
                  </>
                ) : (
                  <>
                    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2"/>
                    </svg>
                    Suchen
                  </>
                )}
              </button>
            </div>

            {/* Source Filters */}
            <fieldset className={styles.filterGroup}>
              <legend className={styles.filterLabel}>Datenquellen:</legend>
              <div className={styles.checkboxGroup}>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={searchSources.includes('eulex')}
                    onChange={() => toggleSource('eulex')}
                  />
                  <span>EU-Lex</span>
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={searchSources.includes('bundesanzeiger')}
                    onChange={() => toggleSource('bundesanzeiger')}
                  />
                  <span>Bundesanzeiger</span>
                </label>
                <label className={styles.checkbox}>
                  <input
                    type="checkbox"
                    checked={searchSources.includes('govdata')}
                    onChange={() => toggleSource('govdata')}
                  />
                  <span>GovData</span>
                </label>
              </div>
            </fieldset>

            {/* Area Filter */}
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel} htmlFor="search-area">Rechtsbereich (optional):</label>
              <select
                id="search-area"
                className={styles.areaSelect}
                value={searchArea}
                onChange={(e) => setSearchArea(e.target.value)}
              >
                <option value="">Alle Bereiche</option>
                <option value="Datenschutz">Datenschutz</option>
                <option value="Arbeitsrecht">Arbeitsrecht</option>
                <option value="Vertragsrecht">Vertragsrecht</option>
                <option value="Handelsrecht">Handelsrecht</option>
                <option value="Steuerrecht">Steuerrecht</option>
                <option value="IT-Recht">IT-Recht</option>
              </select>
            </div>
          </div>

          {/* Search Results */}
          <div className={styles.externalSearchResults} aria-live="polite">
            {isLoading && (
              <div role="status" aria-busy="true">
                <span className="sr-only">Suche wird durchgeführt...</span>
              </div>
            )}
            {searchResults.length > 0 ? (
              <div className={styles.resultsTable}>
                <div className={styles.resultsHeader}>
                  <h4>Suchergebnisse ({searchResults.length})</h4>
                </div>
                <div className={styles.resultsList}>
                  {searchResults.map((result, index) => (
                    <div key={index} className={styles.resultCard}>
                      <div className={styles.resultHeader}>
                        <span className={styles.resultSource}>
                          {result.source === 'eulex' && 'EU-Lex'}
                          {result.source === 'bundesanzeiger' && 'Bundesanzeiger'}
                          {result.source === 'govdata' && 'GovData'}
                        </span>
                        {result.date && (
                          <span className={styles.resultDate}>
                            {new Date(result.date).toLocaleDateString('de-DE')}
                          </span>
                        )}
                      </div>
                      <h5 className={styles.resultTitle}>{result.title}</h5>
                      {result.description && (
                        <p className={styles.resultDescription}>{result.description}</p>
                      )}
                      {result.documentId && (
                        <div className={styles.resultMeta}>
                          <span className={styles.metaLabel}>Dokument-ID:</span>
                          <span className={styles.metaValue}>{result.documentId}</span>
                        </div>
                      )}
                      {result.relevance && (
                        <div className={styles.resultRelevance}>
                          <span className={styles.relevanceLabel}>Relevanz:</span>
                          <div className={styles.relevanceBar} role="progressbar" aria-valuenow={result.relevance} aria-valuemin={0} aria-valuemax={100}>
                            <div
                              className={styles.relevanceFill}
                              style={{ width: `${result.relevance}%` }}
                            ></div>
                          </div>
                          <span className={styles.relevanceValue}>{result.relevance}%</span>
                        </div>
                      )}
                      {result.url && (
                        <a
                          href={result.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.resultLink}
                        >
                          Zur Quelle →
                        </a>
                      )}
                    </div>
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className={styles.loadMoreContainer}>
                    <button
                      className={styles.loadMoreButton}
                      onClick={() => handleSearch(true)}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className={styles.spinner} aria-hidden="true"></div>
                          Lädt...
                        </>
                      ) : (
                        <>
                          Mehr laden
                          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 9L12 16L5 9" stroke="currentColor" strokeWidth="2"/>
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              !isLoading && (
                <div className={styles.emptyState}>
                  <svg aria-hidden="true" className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2"/>
                  </svg>
                  <h4>Noch keine Suche durchgeführt</h4>
                  <p>Geben Sie einen Suchbegriff ein, um externe Gesetze und Änderungen zu finden</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
