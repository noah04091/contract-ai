// 📁 frontend/src/components/ContractRiskGrid.tsx
// Contract Risk Grid - Displays contracts with risk scores in a grid layout

import React from 'react';
import styles from '../styles/ContractRiskGrid.module.css';

interface Contract {
  _id: string;
  name: string;
  laufzeit: string;
  kuendigung: string;
  isGenerated?: boolean;
  legalPulse?: {
    riskScore: number | null;
    lastAnalysis?: string;
    lastRecommendation?: string;
    topRisks?: string[];
    recommendations?: string[];
  };
}

interface RiskLevel {
  level: string;
  color: string;
  icon: string;
}

interface Pagination {
  hasMore: boolean;
  total: number;
}

interface ContractRiskGridProps {
  contracts: Contract[];
  pagination: Pagination;
  isLoadingMore: boolean;
  loadMoreRef: React.RefObject<HTMLDivElement | null>;
  searchQuery?: string;
  riskFilter?: string;
  showTooltip: { [key: string]: boolean };
  getRiskLevel: (score: number | null) => RiskLevel;
  onContractClick: (contract: Contract) => void;
  onMouseEnter: (contractId: string) => void;
  onMouseLeave: (contractId: string) => void;
  onLoadMore: () => void;
  onResetFilters?: () => void;
}

export default function ContractRiskGrid({
  contracts,
  pagination,
  isLoadingMore,
  loadMoreRef,
  showTooltip,
  getRiskLevel,
  onContractClick,
  onMouseEnter,
  onMouseLeave,
  onLoadMore
}: ContractRiskGridProps) {
  return (
    <div className={styles.contractsGrid}>
      {contracts.map((contract) => {
        const riskLevel = getRiskLevel(contract.legalPulse?.riskScore || null);
        return (
          <div
            key={contract._id}
            className={styles.contractCard}
            onClick={() => onContractClick(contract)}
            onMouseEnter={() => onMouseEnter(contract._id)}
            onMouseLeave={() => onMouseLeave(contract._id)}
          >
            <div className={styles.contractCardHeader}>
              <div className={styles.contractInfo}>
                <h3 className={styles.contractName}>
                  {contract.name}
                  {showTooltip[contract._id] && (
                    <div className={styles.nameTooltip}>
                      {contract.name}
                    </div>
                  )}
                </h3>
                {contract.isGenerated && (
                  <span className={styles.generatedBadge}>✨ KI</span>
                )}
              </div>
              <div
                className={styles.riskBadge}
                style={{ '--risk-color': riskLevel.color } as React.CSSProperties}
              >
                <span className={styles.riskIcon}>{riskLevel.icon}</span>
                <span className={styles.riskScore}>
                  {contract.legalPulse?.riskScore || '—'}
                </span>
              </div>
            </div>

            <div className={styles.contractCardBody}>
              <div className={styles.contractMeta}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Letzter Scan:</span>
                  <span className={styles.metaValue}>
                    {contract.legalPulse?.lastAnalysis
                      ? new Date(contract.legalPulse.lastAnalysis).toLocaleDateString('de-DE')
                      : 'Noch nicht analysiert'
                    }
                  </span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Status:</span>
                  <span
                    className={styles.metaValue}
                    style={{ color: riskLevel.color }}
                  >
                    {riskLevel.level}
                  </span>
                </div>
              </div>

              {contract.legalPulse?.lastRecommendation && (
                <div className={styles.lastRecommendation}>
                  <span className={styles.recommendationLabel}>💡 Letzte Empfehlung:</span>
                  <p className={styles.recommendationText}>
                    {contract.legalPulse.lastRecommendation}
                  </p>
                </div>
              )}
            </div>

            <div className={styles.contractCardFooter}>
              <button className={styles.detailsButton}>
                <span>Details ansehen</span>
                <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2"/>
                </svg>
              </button>
            </div>
          </div>
        );
      })}

      {/* Infinite Scroll Trigger & Load More Button */}
      {pagination.hasMore && (
        <div
          ref={loadMoreRef}
          className={styles.loadMoreContainer}
        >
          {isLoadingMore ? (
            <div className={styles.loadingMore}>
              <div className={styles.loadingSpinner}></div>
              <p>Lade weitere Verträge...</p>
            </div>
          ) : (
            <button
              className={styles.loadMoreButton}
              onClick={onLoadMore}
            >
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              Mehr laden ({contracts.length} von {pagination.total})
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// Empty State Component
interface EmptyStateProps {
  hasFilters: boolean;
  searchQuery: string;
  onResetFilters: () => void;
}

export function ContractRiskGridEmptyState({
  hasFilters,
  searchQuery,
  onResetFilters
}: EmptyStateProps) {
  return (
    <div className={styles.emptyState}>
      {hasFilters ? (
        // Keine Suchergebnisse
        <>
          <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <h3>Keine Verträge gefunden</h3>
          <p>Für Ihre Suche "{searchQuery}" und die gewählten Filter wurden keine Ergebnisse gefunden.</p>
          <div className={styles.emptyStateActions}>
            <button
              onClick={onResetFilters}
              className={styles.resetButton}
            >
              Filter zurücksetzen
            </button>
          </div>
        </>
      ) : (
        // Wirklich keine Verträge
        <>
          <svg className={styles.emptyStateIcon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 12H15M9 16H15M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <h3>Noch keine Verträge vorhanden</h3>
          <p>Laden Sie Ihren ersten Vertrag hoch, um mit der Analyse zu beginnen.</p>
        </>
      )}
    </div>
  );
}
