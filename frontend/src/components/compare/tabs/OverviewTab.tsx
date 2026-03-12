import { motion } from 'framer-motion';
import {
  Star, AlertTriangle, AlertCircle, CheckCircle,
  ThumbsUp, ThumbsDown, Award, TrendingUp
} from 'lucide-react';
import {
  ComparisonResult, ComparisonResultV2, isV2Result,
  CategoryScores, SCORE_LABELS,
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

function getScoreColor(score: number): string {
  if (score >= 75) return '#34c759';
  if (score >= 50) return '#ff9500';
  return '#ff453a';
}
