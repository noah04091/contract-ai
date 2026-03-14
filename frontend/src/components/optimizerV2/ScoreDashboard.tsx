import { useMemo } from 'react';
import { Shield, Eye, CheckSquare, BarChart3, AlertTriangle, Flame, Scale, Crosshair } from 'lucide-react';
import type { Scores, AnalysisResult, ContractStructure, ImportanceLevel, PowerBalance } from '../../types/optimizerV2';
import { IMPORTANCE_CONFIG, INDUSTRY_LABELS, CATEGORY_LABELS } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  scores: Scores;
  result: AnalysisResult;
  structure: ContractStructure;
  onNavigate: (tab: string) => void;
}

const SCORE_CONFIGS = [
  { key: 'risk', label: 'Risiko', icon: Shield, color: '#FF3B30' },
  { key: 'fairness', label: 'Fairness', icon: Scale, color: '#AF52DE' },
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

  // Importance distribution
  const importanceCounts: Record<ImportanceLevel, number> = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of result.clauseAnalyses) {
    const level = a.importanceLevel || 'medium';
    if (level in importanceCounts) importanceCounts[level]++;
  }

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

      {/* Importance distribution */}
      <div className={styles.importanceBar}>
        <div className={styles.importanceBarHeader}>
          <Flame size={14} style={{ color: '#FF3B30' }} />
          <span className={styles.importanceBarTitle}>Klausel-Priorität</span>
        </div>
        <div className={styles.importanceItems}>
          {(Object.entries(importanceCounts) as [ImportanceLevel, number][])
            .filter(([, count]) => count > 0)
            .map(([level, count]) => {
              const config = IMPORTANCE_CONFIG[level];
              return (
                <button
                  key={level}
                  className={styles.importanceItem}
                  onClick={() => onNavigate('clauses')}
                  title={`${count} ${config.label}e Klausel${count > 1 ? 'n' : ''} anzeigen`}
                >
                  <span className={styles.importanceDot} style={{ background: config.color }} />
                  <span className={styles.importanceCount} style={{ color: config.color }}>{count}</span>
                  <span className={styles.importanceLabel}>{config.label}</span>
                </button>
              );
            })}
        </div>
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

      {/* Top Risk Clauses */}
      <TopRiskClauses result={result} onNavigate={onNavigate} />

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
        {structure.industry && structure.industry !== 'other' && (
          <div className={styles.metadataItem}>
            <span className={styles.metadataLabel}>Branche</span>
            <span className={styles.metadataValue}>{INDUSTRY_LABELS[structure.industry] || structure.industry}</span>
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

// ── Top Risk Clauses Panel ──
const POWER_BALANCE_LABELS: Record<PowerBalance, string> = {
  balanced: 'Ausgewogen',
  slightly_one_sided: 'Leicht einseitig',
  strongly_one_sided: 'Deutlich einseitig',
  extremely_one_sided: 'Extrem einseitig'
};

const POWER_BALANCE_RANK: Record<PowerBalance, number> = {
  balanced: 0, slightly_one_sided: 1, strongly_one_sided: 2, extremely_one_sided: 3
};

function TopRiskClauses({ result, onNavigate }: { result: AnalysisResult; onNavigate: (tab: string) => void }) {
  const topRisks = useMemo(() => {
    const analysisMap = new Map(result.clauseAnalyses.map(a => [a.clauseId, a]));
    const scoreMap = new Map(result.scores.perClause.map(s => [s.clauseId, s]));

    return result.clauses
      .map(clause => {
        const analysis = analysisMap.get(clause.id);
        const clauseScore = scoreMap.get(clause.id);
        if (!analysis) return null;

        // Composite risk: high importance + high risk + one-sided = higher rank
        const importanceRank = analysis.importanceLevel === 'critical' ? 4 : analysis.importanceLevel === 'high' ? 3 : analysis.importanceLevel === 'medium' ? 1 : 0;
        const pbRank = POWER_BALANCE_RANK[analysis.powerBalance] || 0;
        const riskRank = importanceRank * 3 + analysis.riskLevel + pbRank * 2;

        return { clause, analysis, score: clauseScore?.score, riskRank };
      })
      .filter((item): item is NonNullable<typeof item> => {
        if (!item) return false;
        const a = item.analysis;
        return a.importanceLevel === 'critical'
          || a.importanceLevel === 'high'
          || a.powerBalance === 'strongly_one_sided'
          || a.powerBalance === 'extremely_one_sided'
          || a.riskLevel >= 7;
      })
      .sort((a, b) => b.riskRank - a.riskRank)
      .slice(0, 5);
  }, [result]);

  if (topRisks.length === 0) return null;

  return (
    <div className={styles.topRisks}>
      <div className={styles.topRisksHeader}>
        <Crosshair size={15} style={{ color: '#FF3B30' }} />
        <span className={styles.topRisksTitle}>Kritischste Klauseln</span>
      </div>
      <div className={styles.topRisksList}>
        {topRisks.map(({ clause, analysis, score }, i) => (
          <button
            key={clause.id}
            className={styles.topRiskItem}
            onClick={() => onNavigate('clauses')}
          >
            <span className={styles.topRiskRank}>{i + 1}</span>
            <div className={styles.topRiskInfo}>
              <span className={styles.topRiskName}>
                {clause.sectionNumber && `${clause.sectionNumber} `}{clause.title}
              </span>
              <span className={styles.topRiskCategory}>{CATEGORY_LABELS[clause.category]}</span>
            </div>
            <div className={styles.topRiskTags}>
              {analysis.powerBalance !== 'balanced' && (
                <span
                  className={styles.topRiskTag}
                  style={{
                    color: analysis.powerBalance === 'extremely_one_sided' ? '#FF3B30' :
                           analysis.powerBalance === 'strongly_one_sided' ? '#FF9500' : '#8E8E93',
                    borderColor: analysis.powerBalance === 'extremely_one_sided' ? '#FF3B30' :
                                 analysis.powerBalance === 'strongly_one_sided' ? '#FF9500' : '#8E8E93'
                  }}
                >
                  {POWER_BALANCE_LABELS[analysis.powerBalance]}
                </span>
              )}
              {analysis.riskLevel >= 6 && (
                <span className={styles.topRiskTag} style={{ color: '#FF3B30', borderColor: '#FF3B30' }}>
                  Risiko {analysis.riskLevel}/10
                </span>
              )}
            </div>
            {score !== undefined && (
              <span className={styles.topRiskScore} style={{ color: getScoreColor(score) }}>{score}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
