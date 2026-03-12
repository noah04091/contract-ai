import React from 'react';
import { TrendingUp, Shield, Eye, CheckSquare, BarChart3, AlertTriangle } from 'lucide-react';
import type { Scores, AnalysisResult, ContractStructure } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  scores: Scores;
  result: AnalysisResult;
  structure: ContractStructure;
  onNavigate: (tab: string) => void;
}

const SCORE_CONFIGS = [
  { key: 'risk', label: 'Risiko', icon: Shield, color: '#FF3B30' },
  { key: 'clarity', label: 'Klarheit', icon: Eye, color: '#007AFF' },
  { key: 'completeness', label: 'Vollständigkeit', icon: CheckSquare, color: '#34C759' },
  { key: 'marketStandard', label: 'Marktstandard', icon: BarChart3, color: '#FF9500' }
] as const;

function getScoreColor(score: number): string {
  if (score >= 80) return '#34C759';
  if (score >= 60) return '#FF9500';
  if (score >= 40) return '#FF3B30';
  return '#AF52DE';
}

function getScoreLabel(score: number): string {
  if (score >= 80) return 'Sehr gut';
  if (score >= 60) return 'Gut';
  if (score >= 40) return 'Verbesserbar';
  return 'Kritisch';
}

export default function ScoreDashboard({ scores, result, structure, onNavigate }: Props) {
  const optimizedCount = result.optimizations.filter(o => o.needsOptimization).length;
  const criticalCount = result.clauseAnalyses.filter(a => a.strength === 'critical').length;
  const weakCount = result.clauseAnalyses.filter(a => a.strength === 'weak').length;

  return (
    <div className={styles.scoreDashboard}>
      {/* Contract Summary Panel */}
      <div className={styles.summaryPanel}>
        <div className={styles.summaryLeft}>
          <div className={styles.overallScore} style={{ borderColor: getScoreColor(scores.overall) }}>
            <span className={styles.overallScoreNumber}>{scores.overall}</span>
            <span className={styles.overallScoreMax}>/100</span>
          </div>
          <div className={styles.overallScoreInfo}>
            <span className={styles.overallScoreLabel} style={{ color: getScoreColor(scores.overall) }}>
              {getScoreLabel(scores.overall)}
            </span>
            <span className={styles.contractType}>{structure.recognizedAs || structure.contractTypeLabel}</span>
          </div>
        </div>

        <div className={styles.summaryStats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{result.clauses.length}</span>
            <span className={styles.statLabel}>Klauseln</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue} style={{ color: '#FF9500' }}>{optimizedCount}</span>
            <span className={styles.statLabel}>Optimierbar</span>
          </div>
          {criticalCount > 0 && (
            <div className={styles.statItem}>
              <span className={styles.statValue} style={{ color: '#FF3B30' }}>{criticalCount}</span>
              <span className={styles.statLabel}>Kritisch</span>
            </div>
          )}
          {weakCount > 0 && (
            <div className={styles.statItem}>
              <span className={styles.statValue} style={{ color: '#FF9500' }}>{weakCount}</span>
              <span className={styles.statLabel}>Schwach</span>
            </div>
          )}
        </div>

        <div className={styles.summaryActions}>
          <button className={styles.summaryActionBtn} onClick={() => onNavigate('clauses')}>
            Zu den Klauseln
          </button>
          <button className={styles.summaryActionBtn} onClick={() => onNavigate('redline')}>
            Redline ansehen
          </button>
        </div>
      </div>

      {/* Score Cards */}
      <div className={styles.scoreCards}>
        {SCORE_CONFIGS.map(({ key, label, icon: Icon, color }) => {
          const value = scores[key] ?? 0;
          return (
            <div key={key} className={styles.scoreCard}>
              <div className={styles.scoreCardHeader}>
                <Icon size={16} style={{ color }} />
                <span className={styles.scoreCardLabel}>{label}</span>
              </div>
              <div className={styles.scoreCardBar}>
                <div
                  className={styles.scoreCardBarFill}
                  style={{ width: `${value}%`, backgroundColor: getScoreColor(value) }}
                />
              </div>
              <span className={styles.scoreCardValue} style={{ color: getScoreColor(value) }}>
                {value}/100
              </span>
            </div>
          );
        })}
      </div>

      {/* Quick insights */}
      {(criticalCount > 0 || weakCount > 0) && (
        <div className={styles.quickInsights}>
          <AlertTriangle size={16} style={{ color: '#FF9500' }} />
          <span>
            {criticalCount > 0 && `${criticalCount} kritische Klausel${criticalCount > 1 ? 'n' : ''}`}
            {criticalCount > 0 && weakCount > 0 && ' und '}
            {weakCount > 0 && `${weakCount} schwache Klausel${weakCount > 1 ? 'n' : ''}`}
            {' '}gefunden. Klicke auf "Zu den Klauseln" für Details.
          </span>
        </div>
      )}

      {/* Contract metadata */}
      <div className={styles.metadataGrid}>
        {structure.parties?.length > 0 && (
          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Parteien</span>
            <span className={styles.metadataValue}>
              {structure.parties.map(p => p.name || p.role).join(' / ')}
            </span>
          </div>
        )}
        {structure.jurisdiction && (
          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Jurisdiktion</span>
            <span className={styles.metadataValue}>{structure.jurisdiction}</span>
          </div>
        )}
        {structure.duration && (
          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Laufzeit</span>
            <span className={styles.metadataValue}>{structure.duration}</span>
          </div>
        )}
        <div className={styles.metadataItem}>
          <span className={styles.metadataLabel}>Qualität</span>
          <span className={styles.metadataValue}>
            {structure.maturity === 'high' ? 'Professionell' : structure.maturity === 'medium' ? 'Solide' : 'Basis'}
          </span>
        </div>
      </div>
    </div>
  );
}
