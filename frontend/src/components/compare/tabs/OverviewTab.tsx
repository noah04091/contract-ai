import { motion } from 'framer-motion';
import {
  Star, AlertTriangle, AlertCircle, CheckCircle,
  ThumbsUp, ThumbsDown, Award, TrendingUp, BarChart3
} from 'lucide-react';
import {
  ComparisonResult, ComparisonResultV2, isV2Result,
  CategoryScores, SCORE_LABELS,
  BenchmarkMetric, BENCHMARK_RATING_COLORS,
} from '../../../types/compare';
import styles from '../../../styles/Compare.module.css';

interface OverviewTabProps {
  result: ComparisonResult;
}

export default function OverviewTab({ result }: OverviewTabProps) {
  const v2 = isV2Result(result);
  const v2Result = v2 ? (result as ComparisonResultV2) : null;

  return (
    <div className={styles.overviewTab}>
      {/* TL;DR Box */}
      {v2Result && (
        <motion.div
          className={styles.tldrBox}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <TrendingUp size={20} />
          <p>{v2Result.summary.tldr}</p>
        </motion.div>
      )}

      {/* Category Scores (V2) */}
      {v2Result && (
        <div className={styles.scoresGrid}>
          <ScoreCard
            title="Vertrag 1"
            scores={v2Result.scores.contract1}
            isRecommended={v2Result.overallRecommendation.recommended === 1}
            analysis={v2Result.contract1Analysis}
          />
          <ScoreCard
            title="Vertrag 2"
            scores={v2Result.scores.contract2}
            isRecommended={v2Result.overallRecommendation.recommended === 2}
            analysis={v2Result.contract2Analysis}
          />
        </div>
      )}

      {/* V1 fallback: simple scores */}
      {!v2 && (
        <div className={styles.scoresGrid}>
          <V1ScoreCard
            title="Vertrag 1"
            analysis={result.contract1Analysis}
            isRecommended={result.overallRecommendation.recommended === 1}
          />
          <V1ScoreCard
            title="Vertrag 2"
            analysis={result.contract2Analysis}
            isRecommended={result.overallRecommendation.recommended === 2}
          />
        </div>
      )}

      {/* Quick Stats */}
      {v2Result && (
        <div className={styles.quickStats}>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{v2Result.differences.length}</span>
            <span className={styles.quickStatLabel}>Unterschiede</span>
          </div>
          <div className={styles.quickStat}>
            <span className={`${styles.quickStatValue} ${styles.quickStatCritical}`}>
              {v2Result.risks.filter(r => r.severity === 'critical' || r.severity === 'high').length}
            </span>
            <span className={styles.quickStatLabel}>Kritische Risiken</span>
          </div>
          <div className={styles.quickStat}>
            <span className={styles.quickStatValue}>{v2Result.recommendations.length}</span>
            <span className={styles.quickStatLabel}>Empfehlungen</span>
          </div>
        </div>
      )}

      {/* Market Benchmark (V2) */}
      {v2Result?.benchmark && v2Result.benchmark.metrics.length > 0 && (
        <motion.div
          className={styles.benchmarkSection}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className={styles.benchmarkHeader}>
            <BarChart3 size={18} />
            <h4>Marktvergleich — {v2Result.benchmark.contractTypeLabel}</h4>
          </div>
          <div className={styles.benchmarkGrid}>
            {v2Result.benchmark.metrics.map((metric) => (
              <BenchmarkRow key={metric.metricId} metric={metric} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Verdict / Recommendation Box */}
      <motion.div
        className={styles.verdictBox}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className={styles.verdictHeader}>
          <Star size={20} />
          <h4>Empfehlung: Vertrag {result.overallRecommendation.recommended}</h4>
        </div>
        <p className={styles.verdictText}>
          {v2Result
            ? v2Result.summary.verdict || v2Result.overallRecommendation.reasoning
            : result.overallRecommendation.reasoning
          }
        </p>
        {v2Result?.overallRecommendation.conditions && v2Result.overallRecommendation.conditions.length > 0 && (
          <div className={styles.verdictConditions}>
            <strong>Bedingungen:</strong>
            <ul>
              {v2Result.overallRecommendation.conditions.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}
        <div className={styles.verdictConfidence}>
          Konfidenz: {result.overallRecommendation.confidence}%
        </div>
      </motion.div>

      {/* Detailed Summary (V2) */}
      {v2Result?.summary.detailedSummary && (
        <div className={styles.detailedSummary}>
          <h4>Zusammenfassung</h4>
          <p>{v2Result.summary.detailedSummary}</p>
        </div>
      )}

      {/* V1 Summary */}
      {!v2 && 'summary' in result && typeof result.summary === 'string' && (
        <div className={styles.detailedSummary}>
          <h4>Zusammenfassung</h4>
          <p>{result.summary}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// V2 Score Card
// ============================================
function ScoreCard({
  title,
  scores,
  isRecommended,
  analysis,
}: {
  title: string;
  scores: CategoryScores;
  isRecommended: boolean;
  analysis: { strengths: string[]; weaknesses: string[]; riskLevel: string };
}) {
  const scoreKeys = ['fairness', 'riskProtection', 'flexibility', 'completeness', 'clarity'] as const;

  return (
    <motion.div
      className={`${styles.scoreCard} ${isRecommended ? styles.scoreCardRecommended : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={styles.scoreCardHeader}>
        <h4>{title}</h4>
        {isRecommended && (
          <span className={styles.recommendedBadge}>
            <Award size={14} />
            Empfohlen
          </span>
        )}
      </div>

      {/* Overall Score Circle */}
      <div className={styles.overallScoreCircle}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="30" fill="none" stroke="#e8e8ed" strokeWidth="8" />
          <circle
            cx="40" cy="40" r="30" fill="none"
            stroke={getScoreColor(scores.overall)}
            strokeWidth="8"
            strokeDasharray={`${scores.overall * 1.88} 188`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
          />
        </svg>
        <div className={styles.scoreCircleText}>
          <span className={styles.scoreNumber}>{scores.overall}</span>
          <span className={styles.scoreLabel}>/ 100</span>
        </div>
      </div>

      {/* Category Score Bars */}
      <div className={styles.categoryScores}>
        {scoreKeys.map((key) => (
          <div key={key} className={styles.categoryScoreRow}>
            <span className={styles.categoryScoreName}>
              {SCORE_LABELS[key]}
            </span>
            <div className={styles.scoreBarTrack}>
              <motion.div
                className={styles.scoreBarFill}
                style={{ backgroundColor: getScoreColor(scores[key]) }}
                initial={{ width: 0 }}
                animate={{ width: `${scores[key]}%` }}
                transition={{ duration: 0.6, delay: 0.1 }}
              />
            </div>
            <span className={styles.categoryScoreValue}>{scores[key]}</span>
          </div>
        ))}
      </div>

      {/* Strengths & Weaknesses */}
      <div className={styles.swSection}>
        <div className={styles.strengthsList}>
          <h5><ThumbsUp size={13} /> Stärken</h5>
          <ul>
            {analysis.strengths.slice(0, 3).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div className={styles.weaknessesList}>
          <h5><ThumbsDown size={13} /> Schwächen</h5>
          <ul>
            {analysis.weaknesses.slice(0, 3).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// V1 Score Card (simple)
// ============================================
function V1ScoreCard({
  title,
  analysis,
  isRecommended,
}: {
  title: string;
  analysis: { strengths: string[]; weaknesses: string[]; riskLevel: string; score: number };
  isRecommended: boolean;
}) {
  return (
    <motion.div
      className={`${styles.scoreCard} ${isRecommended ? styles.scoreCardRecommended : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className={styles.scoreCardHeader}>
        <h4>{title}</h4>
        {isRecommended && (
          <span className={styles.recommendedBadge}>
            <Award size={14} />
            Empfohlen
          </span>
        )}
      </div>

      <div className={styles.overallScoreCircle}>
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="30" fill="none" stroke="#e8e8ed" strokeWidth="8" />
          <circle
            cx="40" cy="40" r="30" fill="none"
            stroke={getScoreColor(analysis.score)}
            strokeWidth="8"
            strokeDasharray={`${analysis.score * 1.88} 188`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
          />
        </svg>
        <div className={styles.scoreCircleText}>
          <span className={styles.scoreNumber}>{analysis.score}</span>
          <span className={styles.scoreLabel}>/ 100</span>
        </div>
      </div>

      <div className={styles.riskBadge} data-level={analysis.riskLevel}>
        {analysis.riskLevel === 'low' && <CheckCircle size={14} />}
        {analysis.riskLevel === 'medium' && <AlertTriangle size={14} />}
        {analysis.riskLevel === 'high' && <AlertCircle size={14} />}
        <span>Risiko: {analysis.riskLevel === 'low' ? 'Niedrig' : analysis.riskLevel === 'medium' ? 'Mittel' : 'Hoch'}</span>
      </div>

      <div className={styles.swSection}>
        <div className={styles.strengthsList}>
          <h5><ThumbsUp size={13} /> Stärken</h5>
          <ul>
            {analysis.strengths.slice(0, 3).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
        <div className={styles.weaknessesList}>
          <h5><ThumbsDown size={13} /> Schwächen</h5>
          <ul>
            {analysis.weaknesses.slice(0, 3).map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Benchmark Row
// ============================================
function BenchmarkRow({ metric }: { metric: BenchmarkMetric }) {
  const v1 = metric.contract1;
  const v2 = metric.contract2;
  const typical = typeof metric.marketTypical === 'number' ? metric.marketTypical : null;

  // Generate insight text for the most notable value
  const insight = generateInsight(v1, v2, typical, metric);

  return (
    <div className={styles.benchmarkRow}>
      <div className={styles.benchmarkLabel}>
        <span className={styles.benchmarkMetricName}>{metric.label}</span>
        <span className={styles.benchmarkMarket}>Markt: {metric.marketTypical} {metric.unit}</span>
        {typical !== null && (v1 || v2) && (
          <BenchmarkBar v1={v1?.value ?? null} v2={v2?.value ?? null} typical={typical} direction={metric.direction} />
        )}
      </div>
      <div className={styles.benchmarkValues}>
        <BenchmarkValueCell value={v1} unit={metric.unit} label="V1" />
        <BenchmarkValueCell value={v2} unit={metric.unit} label="V2" />
      </div>
      {insight && (
        <div className={styles.benchmarkInsight}>
          <span>💡</span>
          <span>{insight}</span>
        </div>
      )}
    </div>
  );
}

function generateInsight(
  v1: BenchmarkMetric['contract1'],
  v2: BenchmarkMetric['contract2'],
  typical: number | null,
  metric: BenchmarkMetric,
): string | null {
  if (!typical || typical === 0) return null;
  if (metric.direction === 'info_only') return null;

  // Pick the most interesting value (biggest deviation from typical)
  const vals: { value: number; label: string }[] = [];
  if (v1) vals.push({ value: v1.value, label: 'Vertrag 1' });
  if (v2) vals.push({ value: v2.value, label: 'Vertrag 2' });
  if (vals.length === 0) return null;

  const mostDeviated = vals.reduce((best, curr) =>
    Math.abs(curr.value - typical) > Math.abs(best.value - typical) ? curr : best
  );

  const diff = mostDeviated.value - typical;
  const pctDiff = Math.round(Math.abs(diff / typical) * 100);

  // Only show insight if deviation is meaningful (>= 10%)
  if (pctDiff < 10) return null;

  if (metric.direction === 'lower_better') {
    if (diff > 0) {
      return `${mostDeviated.label} liegt ${pctDiff}% über dem Marktdurchschnitt — das bedeutet höhere Kosten.`;
    } else {
      return `${mostDeviated.label} liegt ${pctDiff}% unter dem Marktdurchschnitt — ein guter Wert.`;
    }
  }

  if (metric.direction === 'higher_better') {
    if (diff > 0) {
      return `${mostDeviated.label} bietet ${pctDiff}% mehr als marktüblich bei ${metric.label}.`;
    } else {
      return `${mostDeviated.label} liegt ${pctDiff}% unter dem Marktstandard bei ${metric.label}.`;
    }
  }

  return null;
}

function BenchmarkBar({
  v1,
  v2,
  typical,
  direction,
}: {
  v1: number | null;
  v2: number | null;
  typical: number;
  direction: string;
}) {
  if (typical === 0) return null;

  // Calculate positions on a 0-100% bar where typical is at 50%
  const scale = (val: number) => {
    const ratio = val / typical;
    // Map ratio to 0-100 where 1.0 = 50%
    return Math.min(Math.max(ratio * 50, 2), 98);
  };

  const typicalPos = 50;
  const v1Pos = v1 !== null ? scale(v1) : null;
  const v2Pos = v2 !== null ? scale(v2) : null;

  const getColor = (pos: number) => {
    if (direction === 'lower_better') {
      return pos < typicalPos ? '#34c759' : pos > typicalPos + 10 ? '#ff453a' : '#ff9500';
    }
    if (direction === 'higher_better') {
      return pos > typicalPos ? '#34c759' : pos < typicalPos - 10 ? '#ff453a' : '#ff9500';
    }
    return '#8e8e93';
  };

  return (
    <div className={styles.benchmarkBarContainer}>
      <div className={styles.benchmarkBarTrack}>
        {/* Market typical marker */}
        <div className={styles.benchmarkBarTypical} style={{ left: `${typicalPos}%` }} />
        {/* V1 dot */}
        {v1Pos !== null && (
          <div className={styles.benchmarkBarDot} style={{ left: `${v1Pos}%`, background: getColor(v1Pos) }} title={`V1: ${v1}`} />
        )}
        {/* V2 dot */}
        {v2Pos !== null && (
          <div className={styles.benchmarkBarDot} style={{ left: `${v2Pos}%`, background: getColor(v2Pos), borderColor: '#fff' }} title={`V2: ${v2}`} />
        )}
      </div>
    </div>
  );
}

function BenchmarkValueCell({
  value,
  unit,
  label,
}: {
  value: BenchmarkMetric['contract1'];
  unit: string;
  label: string;
}) {
  if (!value) {
    return (
      <div className={styles.benchmarkCell}>
        <span className={styles.benchmarkCellLabel}>{label}</span>
        <span className={styles.benchmarkCellValue} style={{ color: '#a1a1a6', fontSize: '0.78rem', fontStyle: 'italic' }}>
          Nicht im Vertrag erkennbar
        </span>
      </div>
    );
  }

  const color = value.assessment
    ? BENCHMARK_RATING_COLORS[value.assessment.rating] || '#8e8e93'
    : '#8e8e93';

  return (
    <div className={styles.benchmarkCell}>
      <span className={styles.benchmarkCellLabel}>{label}</span>
      <span className={styles.benchmarkCellValue} style={{ color }}>
        {value.value} {unit}
      </span>
      {value.source && (
        <span className={styles.benchmarkSource}>{value.source}</span>
      )}
      {value.assessment && value.assessment.rating !== 'info' && (
        <span className={styles.benchmarkRating} style={{ color, borderColor: `${color}30` }}>
          {value.assessment.label}
        </span>
      )}
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 75) return '#34c759';
  if (score >= 50) return '#ff9500';
  return '#ff453a';
}
