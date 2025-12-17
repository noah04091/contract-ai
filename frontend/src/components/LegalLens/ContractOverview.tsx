// 📁 components/LegalLens/ContractOverview.tsx
// Dashboard-Übersicht aller Klauseln nach Risiko gruppiert

import React, { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle, AlertCircle, Filter, SortDesc, ChevronRight } from 'lucide-react';
import type { ParsedClause, ActionLevel, RiskLevel, ClauseAnalysis } from '../../types/legalLens';
import { ACTION_LABELS } from '../../types/legalLens';
import styles from '../../styles/ContractOverview.module.css';

interface ContractOverviewProps {
  clauses: ParsedClause[];
  analysisCache: Record<string, ClauseAnalysis>;
  currentPerspective: string;
  onSelectClause: (clause: ParsedClause) => void;
  onClose: () => void;
}

type FilterType = 'all' | 'critical' | 'negotiate' | 'ok';
type SortType = 'risk' | 'order';

// Hilfsfunktion um actionLevel aus Cache oder preAnalysis zu ermitteln
const getClauseActionLevel = (
  clause: ParsedClause,
  analysisCache: Record<string, ClauseAnalysis>,
  perspective: string
): ActionLevel => {
  // Erst im Cache schauen
  const cacheKey = `${clause.id}-${perspective}`;
  const cached = analysisCache[cacheKey];
  if (cached?.actionLevel) {
    return cached.actionLevel;
  }

  // Dann preAnalysis verwenden
  if (clause.preAnalysis) {
    const riskScore = clause.preAnalysis.riskScore;
    if (riskScore >= 70) return 'reject';
    if (riskScore >= 40) return 'negotiate';
    return 'accept';
  }

  // Fallback auf riskIndicators
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
  // Fallback basierend auf riskLevel
  const level = clause.riskIndicators?.level || 'low';
  if (level === 'high') return 75;
  if (level === 'medium') return 50;
  return 25;
};

const ContractOverview: React.FC<ContractOverviewProps> = ({
  clauses,
  analysisCache,
  currentPerspective,
  onSelectClause,
  onClose
}) => {
  const [filter, setFilter] = useState<FilterType>('all');
  const [sort, setSort] = useState<SortType>('risk');

  // Klauseln mit actionLevel anreichern und gruppieren
  const enrichedClauses = useMemo(() => {
    return clauses.map(clause => ({
      ...clause,
      actionLevel: getClauseActionLevel(clause, analysisCache, currentPerspective),
      riskScore: getClauseRiskScore(clause)
    }));
  }, [clauses, analysisCache, currentPerspective]);

  // Statistiken berechnen
  const stats = useMemo(() => {
    const critical = enrichedClauses.filter(c => c.actionLevel === 'reject').length;
    const negotiate = enrichedClauses.filter(c => c.actionLevel === 'negotiate').length;
    const ok = enrichedClauses.filter(c => c.actionLevel === 'accept').length;
    return { critical, negotiate, ok, total: clauses.length };
  }, [enrichedClauses, clauses.length]);

  // Gefilterte und sortierte Klauseln
  const displayedClauses = useMemo(() => {
    let filtered = [...enrichedClauses];

    // Filter anwenden
    if (filter === 'critical') {
      filtered = filtered.filter(c => c.actionLevel === 'reject');
    } else if (filter === 'negotiate') {
      filtered = filtered.filter(c => c.actionLevel === 'negotiate');
    } else if (filter === 'ok') {
      filtered = filtered.filter(c => c.actionLevel === 'accept');
    }

    // Sortierung anwenden
    if (sort === 'risk') {
      filtered.sort((a, b) => b.riskScore - a.riskScore);
    }
    // Bei 'order' bleibt die ursprüngliche Reihenfolge

    return filtered;
  }, [enrichedClauses, filter, sort]);

  // Gesamt-Risiko-Score berechnen
  const overallRiskScore = useMemo(() => {
    if (enrichedClauses.length === 0) return 0;
    const avg = enrichedClauses.reduce((sum, c) => sum + c.riskScore, 0) / enrichedClauses.length;
    return Math.round(avg);
  }, [enrichedClauses]);

  // Risiko-Level basierend auf Score
  const overallRiskLevel: RiskLevel = overallRiskScore >= 60 ? 'high' : overallRiskScore >= 35 ? 'medium' : 'low';

  return (
    <div className={styles.overviewContainer}>
      {/* Header mit Statistiken */}
      <div className={styles.overviewHeader}>
        <div className={styles.headerTop}>
          <h2 className={styles.overviewTitle}>Vertrags-Übersicht</h2>
          <button className={styles.closeButton} onClick={onClose}>
            Zur Detail-Ansicht
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Gesamt-Score */}
        <div className={styles.overallScore}>
          <div
            className={styles.scoreCircle}
            style={{
              '--score-color': overallRiskLevel === 'high' ? '#dc2626' :
                               overallRiskLevel === 'medium' ? '#d97706' : '#16a34a'
            } as React.CSSProperties}
          >
            <span className={styles.scoreValue}>{overallRiskScore}</span>
            <span className={styles.scoreLabel}>Risiko</span>
          </div>
          <div className={styles.scoreInfo}>
            <h3 className={styles.scoreTitle}>
              {overallRiskLevel === 'high' ? 'Hohe Aufmerksamkeit erforderlich' :
               overallRiskLevel === 'medium' ? 'Einige Punkte prüfen' :
               'Vertrag erscheint solide'}
            </h3>
            <p className={styles.scoreDescription}>
              {stats.total} Klauseln analysiert
            </p>
          </div>
        </div>

        {/* Statistik-Karten */}
        <div className={styles.statsGrid}>
          <button
            className={`${styles.statCard} ${styles.critical} ${filter === 'critical' ? styles.active : ''}`}
            onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}
          >
            <AlertTriangle size={20} />
            <span className={styles.statNumber}>{stats.critical}</span>
            <span className={styles.statLabel}>Kritisch</span>
          </button>
          <button
            className={`${styles.statCard} ${styles.negotiate} ${filter === 'negotiate' ? styles.active : ''}`}
            onClick={() => setFilter(filter === 'negotiate' ? 'all' : 'negotiate')}
          >
            <AlertCircle size={20} />
            <span className={styles.statNumber}>{stats.negotiate}</span>
            <span className={styles.statLabel}>Verhandeln</span>
          </button>
          <button
            className={`${styles.statCard} ${styles.ok} ${filter === 'ok' ? styles.active : ''}`}
            onClick={() => setFilter(filter === 'ok' ? 'all' : 'ok')}
          >
            <CheckCircle size={20} />
            <span className={styles.statNumber}>{stats.ok}</span>
            <span className={styles.statLabel}>OK</span>
          </button>
        </div>

        {/* Filter & Sort Controls */}
        <div className={styles.controls}>
          <div className={styles.filterInfo}>
            {filter !== 'all' && (
              <span className={styles.activeFilter}>
                <Filter size={14} />
                {filter === 'critical' ? 'Kritische' : filter === 'negotiate' ? 'Zu verhandeln' : 'Unkritische'}
                <button onClick={() => setFilter('all')} className={styles.clearFilter}>×</button>
              </span>
            )}
            <span className={styles.resultCount}>
              {displayedClauses.length} von {stats.total} Klauseln
            </span>
          </div>
          <button
            className={`${styles.sortButton} ${sort === 'risk' ? styles.active : ''}`}
            onClick={() => setSort(sort === 'risk' ? 'order' : 'risk')}
          >
            <SortDesc size={14} />
            {sort === 'risk' ? 'Nach Risiko' : 'Nach Reihenfolge'}
          </button>
        </div>
      </div>

      {/* Klausel-Liste */}
      <div className={styles.clauseGrid}>
        {displayedClauses.map((clause) => {
          const actionInfo = ACTION_LABELS[clause.actionLevel] || ACTION_LABELS.accept;

          return (
            <button
              key={clause.id}
              className={styles.clauseCard}
              onClick={() => onSelectClause(clause)}
              style={{
                '--action-color': actionInfo.color,
                '--action-bg': actionInfo.bgColor
              } as React.CSSProperties}
            >
              <div className={styles.cardHeader}>
                <span className={styles.clauseNumber}>
                  {clause.number || `§${clause.id.slice(-3)}`}
                </span>
                <span className={styles.actionBadge}>
                  {actionInfo.emoji} {actionInfo.text}
                </span>
              </div>

              <div className={styles.cardContent}>
                {clause.title && (
                  <h4 className={styles.clauseTitle}>{clause.title}</h4>
                )}
                <p className={styles.clauseText}>
                  {clause.preAnalysis?.summary || clause.text.slice(0, 120)}...
                </p>
              </div>

              {clause.preAnalysis?.mainRisk && (
                <div className={styles.mainRisk}>
                  <AlertTriangle size={12} />
                  <span>{clause.preAnalysis.mainRisk}</span>
                </div>
              )}

              <div className={styles.cardFooter}>
                <div className={styles.riskBar}>
                  <div
                    className={styles.riskFill}
                    style={{ width: `${clause.riskScore}%` }}
                  />
                </div>
                <span className={styles.riskScore}>{clause.riskScore}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Empty State */}
      {displayedClauses.length === 0 && (
        <div className={styles.emptyState}>
          <CheckCircle size={48} />
          <h3>Keine Klauseln in dieser Kategorie</h3>
          <p>
            {filter === 'critical' && 'Keine kritischen Klauseln gefunden.'}
            {filter === 'negotiate' && 'Keine Klauseln zum Verhandeln gefunden.'}
            {filter === 'ok' && 'Keine unkritischen Klauseln gefunden.'}
          </p>
          <button onClick={() => setFilter('all')} className={styles.showAllButton}>
            Alle anzeigen
          </button>
        </div>
      )}
    </div>
  );
};

export default ContractOverview;
