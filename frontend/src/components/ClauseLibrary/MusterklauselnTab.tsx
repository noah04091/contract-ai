// MusterklauselnTab.tsx - Tab für Musterklauseln-Vorlagen

import React, { useState, useMemo } from 'react';
// Navigation entfernt - Generator-Integration kommt später bei Contract Builder / Generate letzter Schritt
import {
  Search,
  Filter,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  X,
  Scale,
  FileText
} from 'lucide-react';
import type { TemplateClause, TemplateClauseCategory, IndustryTag } from '../../types/clauseLibrary';
import {
  TEMPLATE_CLAUSE_CATEGORY_INFO,
  INDUSTRY_TAG_INFO,
  RISK_LEVEL_INFO
} from '../../types/clauseLibrary';
import { templateClauses } from '../../data/templateClauses';
import styles from '../../styles/ClauseLibraryPage.module.css';

const MusterklauselnTab: React.FC = () => {

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<TemplateClauseCategory | ''>('');
  const [industryFilter, setIndustryFilter] = useState<IndustryTag | ''>('');
  const [expandedClause, setExpandedClause] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  // Filter clauses
  const filteredClauses = useMemo(() => {
    return templateClauses.filter(clause => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          clause.title.toLowerCase().includes(query) ||
          clause.clauseText.toLowerCase().includes(query) ||
          clause.usageContext.toLowerCase().includes(query) ||
          clause.legalBasis?.toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Category filter
      if (categoryFilter && clause.category !== categoryFilter) {
        return false;
      }

      // Industry filter
      if (industryFilter && !clause.industryTags.includes(industryFilter)) {
        return false;
      }

      return true;
    });
  }, [searchQuery, categoryFilter, industryFilter]);

  // Copy to clipboard
  const handleCopy = async (clause: TemplateClause) => {
    try {
      await navigator.clipboard.writeText(clause.clauseText);
      setCopiedId(clause.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };


  // Get category counts
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    templateClauses.forEach(clause => {
      counts[clause.category] = (counts[clause.category] || 0) + 1;
    });
    return counts;
  }, []);

  // Group filtered clauses by category
  const groupedClauses = useMemo(() => {
    const groups: Record<TemplateClauseCategory, TemplateClause[]> = {} as Record<TemplateClauseCategory, TemplateClause[]>;
    filteredClauses.forEach(clause => {
      if (!groups[clause.category]) {
        groups[clause.category] = [];
      }
      groups[clause.category].push(clause);
    });
    return groups;
  }, [filteredClauses]);

  // State for expanded categories
  const [expandedCategories, setExpandedCategories] = useState<Set<TemplateClauseCategory>>(
    new Set(Object.keys(TEMPLATE_CLAUSE_CATEGORY_INFO) as TemplateClauseCategory[])
  );

  const toggleCategory = (category: TemplateClauseCategory) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(category)) {
        newSet.delete(category);
      } else {
        newSet.add(category);
      }
      return newSet;
    });
  };

  return (
    <div className={styles.musterklauselnTab}>
      {/* Search & Filters */}
      <div className={styles.templateToolbar}>
        <div className={styles.searchBox}>
          <Search size={18} className={styles.searchIcon} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Musterklauseln durchsuchen..."
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
              onChange={e => setCategoryFilter(e.target.value as TemplateClauseCategory | '')}
            >
              <option value="">Alle Kategorien</option>
              {(Object.keys(TEMPLATE_CLAUSE_CATEGORY_INFO) as TemplateClauseCategory[]).map(cat => (
                <option key={cat} value={cat}>
                  {TEMPLATE_CLAUSE_CATEGORY_INFO[cat].icon} {TEMPLATE_CLAUSE_CATEGORY_INFO[cat].label} ({categoryCounts[cat] || 0})
                </option>
              ))}
            </select>
          </div>

          <div className={styles.filterGroup}>
            <label>Branche</label>
            <select
              value={industryFilter}
              onChange={e => setIndustryFilter(e.target.value as IndustryTag | '')}
            >
              <option value="">Alle Branchen</option>
              {(Object.keys(INDUSTRY_TAG_INFO) as IndustryTag[]).map(ind => (
                <option key={ind} value={ind}>
                  {INDUSTRY_TAG_INFO[ind].icon} {INDUSTRY_TAG_INFO[ind].label}
                </option>
              ))}
            </select>
          </div>

          <button
            className={styles.clearFilters}
            onClick={() => {
              setCategoryFilter('');
              setIndustryFilter('');
              setSearchQuery('');
            }}
          >
            Filter zurücksetzen
          </button>
        </div>
      )}

      {/* Results Count */}
      <div className={styles.resultsInfo}>
        <span>{filteredClauses.length} von {templateClauses.length} Musterklauseln</span>
      </div>

      {/* Clauses List - Grouped by Category */}
      <div className={styles.templateClausesList}>
        {filteredClauses.length === 0 ? (
          <div className={styles.noResults}>
            <FileText size={48} />
            <h3>Keine Klauseln gefunden</h3>
            <p>Versuche andere Suchbegriffe oder Filter.</p>
          </div>
        ) : (
          (Object.keys(groupedClauses) as TemplateClauseCategory[]).map(category => {
            const catInfo = TEMPLATE_CLAUSE_CATEGORY_INFO[category];
            const clausesInCategory = groupedClauses[category];
            const isCategoryExpanded = expandedCategories.has(category);

            if (!clausesInCategory || clausesInCategory.length === 0) return null;

            return (
              <div key={category} className={styles.categorySection}>
                {/* Category Header */}
                <div
                  className={styles.categorySectionHeader}
                  onClick={() => toggleCategory(category)}
                >
                  <div className={styles.categorySectionLeft}>
                    <span className={styles.categorySectionIcon} style={{ background: catInfo.color }}>
                      {catInfo.icon}
                    </span>
                    <h3 className={styles.categorySectionTitle}>{catInfo.label}</h3>
                    <span className={styles.categorySectionCount}>{clausesInCategory.length} Klauseln</span>
                  </div>
                  {isCategoryExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </div>

                {/* Category Clauses */}
                {isCategoryExpanded && (
                  <div className={styles.categorySectionContent}>
                    {clausesInCategory.map(clause => {
                      const riskInfo = RISK_LEVEL_INFO[clause.riskLevel];
                      const isExpanded = expandedClause === clause.id;
                      const isCopied = copiedId === clause.id;

                      return (
                        <div
                          key={clause.id}
                          className={`${styles.templateClauseCard} ${isExpanded ? styles.expanded : ''}`}
                        >
                          {/* Card Header */}
                          <div
                            className={styles.templateCardHeader}
                            onClick={() => setExpandedClause(isExpanded ? null : clause.id)}
                          >
                            <div className={styles.templateCardLeft}>
                              <h4 className={styles.templateTitle}>{clause.title}</h4>
                            </div>
                            <div className={styles.templateCardRight}>
                              <span
                                className={styles.riskLevelBadge}
                                style={{ color: riskInfo.color, background: riskInfo.bgColor }}
                              >
                                <Scale size={12} />
                                {riskInfo.label}
                              </span>
                              {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </div>
                          </div>

                          {/* Card Preview (always visible) */}
                          <div className={styles.templatePreview}>
                            <p>{clause.usageContext}</p>
                            {clause.legalBasis && (
                              <span className={styles.legalBasisBadge}>
                                {clause.legalBasis}
                              </span>
                            )}
                          </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className={styles.templateExpanded}>
                              {/* Full Clause Text */}
                              <div className={styles.templateClauseText}>
                                <h5>Klauseltext</h5>
                                <div className={styles.clauseTextBox}>
                                  {clause.clauseText}
                                </div>
                              </div>

                              {/* Industry Tags */}
                              <div className={styles.templateIndustries}>
                                <h5>Branchen</h5>
                                <div className={styles.industryTags}>
                                  {clause.industryTags.map(tag => (
                                    <span key={tag} className={styles.industryTag}>
                                      {INDUSTRY_TAG_INFO[tag].icon} {INDUSTRY_TAG_INFO[tag].label}
                                    </span>
                                  ))}
                                </div>
                              </div>

                              {/* Warnings */}
                              {clause.warnings && clause.warnings.length > 0 && (
                                <div className={styles.templateWarnings}>
                                  <h5>
                                    <AlertCircle size={14} />
                                    Hinweise
                                  </h5>
                                  <ul>
                                    {clause.warnings.map((warning, idx) => (
                                      <li key={idx}>{warning}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Variations */}
                              {clause.variations && clause.variations.length > 0 && (
                                <div className={styles.templateVariations}>
                                  <h5>Variationen</h5>
                                  {clause.variations.map((variation, idx) => (
                                    <div key={idx} className={styles.variationItem}>
                                      <strong>{variation.title}</strong>
                                      <p className={styles.variationDescription}>{variation.description}</p>
                                      <div className={styles.variationText}>{variation.text}</div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Actions */}
                              <div className={styles.templateActions}>
                                <button
                                  className={`${styles.copyBtn} ${isCopied ? styles.copied : ''}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopy(clause);
                                  }}
                                >
                                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                                  {isCopied ? 'Kopiert!' : 'Kopieren'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default MusterklauselnTab;
