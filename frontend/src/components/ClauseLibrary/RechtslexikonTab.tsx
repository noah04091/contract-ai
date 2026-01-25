// RechtslexikonTab.tsx - Tab für das Rechtslexikon

import React, { useState, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Scale,
  ExternalLink,
  X
} from 'lucide-react';
import type { LegalTerm, LegalArea } from '../../types/clauseLibrary';
import { LEGAL_AREA_INFO } from '../../types/clauseLibrary';
import { legalTerms, getLetterGroups, getRelatedTerms } from '../../data/legalTerms';
import styles from '../../styles/ClauseLibraryPage.module.css';

const RechtslexikonTab: React.FC = () => {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState<LegalArea | ''>('');
  const [expandedTerm, setExpandedTerm] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  // Refs for scrolling
  const letterRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // Get all letter groups
  const letterGroups = useMemo(() => getLetterGroups(), []);

  // Filter terms
  const filteredTerms = useMemo(() => {
    return legalTerms.filter(term => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          term.term.toLowerCase().includes(query) ||
          term.simpleExplanation.toLowerCase().includes(query) ||
          term.legalDefinition.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Area filter
      if (areaFilter && term.legalArea !== areaFilter) {
        return false;
      }

      return true;
    });
  }, [searchQuery, areaFilter]);

  // Group terms by letter
  const groupedTerms = useMemo(() => {
    const groups: Record<string, LegalTerm[]> = {};
    filteredTerms.forEach(term => {
      if (!groups[term.letterGroup]) {
        groups[term.letterGroup] = [];
      }
      groups[term.letterGroup].push(term);
    });
    // Sort terms within each group
    Object.keys(groups).forEach(letter => {
      groups[letter].sort((a, b) => a.term.localeCompare(b.term, 'de'));
    });
    return groups;
  }, [filteredTerms]);

  // Available letters (only those with terms)
  const availableLetters = useMemo(() => {
    return letterGroups.filter(letter => groupedTerms[letter]?.length > 0);
  }, [letterGroups, groupedTerms]);

  // Scroll to letter
  const scrollToLetter = (letter: string) => {
    setActiveLetter(letter);
    const element = letterRefs.current[letter];
    if (element && containerRef.current) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Handle term click (navigate to related term)
  const handleRelatedTermClick = (termId: string) => {
    const term = legalTerms.find(t => t.id === termId);
    if (term) {
      setExpandedTerm(term.id);
      // Scroll to the term
      setTimeout(() => {
        const element = document.getElementById(`term-${term.id}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // Get area counts
  const areaCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    legalTerms.forEach(term => {
      counts[term.legalArea] = (counts[term.legalArea] || 0) + 1;
    });
    return counts;
  }, []);

  return (
    <div className={styles.lexikonTab}>
      {/* Combined Toolbar: Search, Filter & A-Z */}
      <div className={styles.lexikonToolbar}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Begriff suchen..."
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
          Rechtsgebiet
          <ChevronDown size={16} className={showFilters ? styles.rotated : ''} />
        </button>

        {/* A-Z Navigation inline */}
        <div className={styles.alphabetNavInline}>
          {letterGroups.map(letter => {
            const isAvailable = availableLetters.includes(letter);
            const isActive = activeLetter === letter;
            return (
              <button
                key={letter}
                className={`${styles.alphabetBtnSmall} ${isActive ? styles.active : ''} ${!isAvailable ? styles.disabled : ''}`}
                onClick={() => isAvailable && scrollToLetter(letter)}
                disabled={!isAvailable}
              >
                {letter}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expanded Filters */}
      {showFilters && (
        <div className={styles.filtersPanel}>
          <div className={styles.filterGroup}>
            <label>Rechtsgebiet</label>
            <select
              value={areaFilter}
              onChange={e => setAreaFilter(e.target.value as LegalArea | '')}
            >
              <option value="">Alle Rechtsgebiete</option>
              {(Object.keys(LEGAL_AREA_INFO) as LegalArea[]).map(area => (
                <option key={area} value={area}>
                  {LEGAL_AREA_INFO[area].icon} {LEGAL_AREA_INFO[area].label} ({areaCounts[area] || 0})
                </option>
              ))}
            </select>
          </div>

          <button
            className={styles.clearFilters}
            onClick={() => {
              setAreaFilter('');
              setSearchQuery('');
            }}
          >
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* Results Count */}
      <div className={styles.resultsInfo}>
        <span>{filteredTerms.length} von {legalTerms.length} Begriffen</span>
      </div>

      {/* Terms List */}
      <div className={styles.lexikonContent} ref={containerRef}>
        {filteredTerms.length === 0 ? (
          <div className={styles.noResults}>
            <BookOpen size={48} />
            <h3>Keine Begriffe gefunden</h3>
            <p>Versuche andere Suchbegriffe oder Filter.</p>
          </div>
        ) : (
          availableLetters.map(letter => (
            <div
              key={letter}
              className={styles.letterSection}
              ref={el => { letterRefs.current[letter] = el; }}
            >
              <div className={styles.letterHeader}>
                <span className={styles.letterBadge}>{letter}</span>
                <span className={styles.letterCount}>
                  {groupedTerms[letter]?.length || 0} Begriffe
                </span>
              </div>

              <div className={styles.termsGrid}>
                {groupedTerms[letter]?.map(term => {
                  const areaInfo = LEGAL_AREA_INFO[term.legalArea];
                  const isExpanded = expandedTerm === term.id;
                  const relatedTermsData = getRelatedTerms(term);

                  return (
                    <div
                      key={term.id}
                      id={`term-${term.id}`}
                      className={`${styles.termCard} ${isExpanded ? styles.expanded : ''}`}
                    >
                      {/* Term Header */}
                      <div
                        className={styles.termHeader}
                        onClick={() => setExpandedTerm(isExpanded ? null : term.id)}
                      >
                        <div className={styles.termHeaderLeft}>
                          <h4 className={styles.termTitle}>{term.term}</h4>
                          <span
                            className={styles.legalAreaBadge}
                            style={{ color: areaInfo.color, background: `${areaInfo.color}15` }}
                          >
                            {areaInfo.icon} {areaInfo.label}
                          </span>
                        </div>
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>

                      {/* Simple Explanation (always visible) */}
                      <p className={styles.simpleExplanation}>
                        {term.simpleExplanation}
                      </p>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className={styles.termExpanded}>
                          {/* Legal Definition */}
                          <div className={styles.termSection}>
                            <h5>
                              <Scale size={14} />
                              Juristische Definition
                            </h5>
                            <p className={styles.legalDefinition}>{term.legalDefinition}</p>
                          </div>

                          {/* Legal Basis */}
                          {term.legalBasis && (
                            <div className={styles.termSection}>
                              <h5>Rechtsgrundlage</h5>
                              <span className={styles.legalBasisTag}>{term.legalBasis}</span>
                            </div>
                          )}

                          {/* Examples */}
                          {term.examples.length > 0 && (
                            <div className={styles.termSection}>
                              <h5>Beispiele</h5>
                              <ul className={styles.examplesList}>
                                {term.examples.map((example, idx) => (
                                  <li key={idx}>{example}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Related Terms */}
                          {relatedTermsData.length > 0 && (
                            <div className={styles.termSection}>
                              <h5>Verwandte Begriffe</h5>
                              <div className={styles.relatedTerms}>
                                {relatedTermsData.map(related => (
                                  <button
                                    key={related.id}
                                    className={styles.relatedTermBtn}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRelatedTermClick(related.id);
                                    }}
                                  >
                                    <ExternalLink size={12} />
                                    {related.term}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default RechtslexikonTab;
