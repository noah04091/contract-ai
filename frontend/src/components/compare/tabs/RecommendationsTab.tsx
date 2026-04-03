import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Lightbulb, Copy, Check, ArrowRight,
} from 'lucide-react';
import {
  ClauseRecommendation,
  CLAUSE_AREA_LABELS, ClauseArea,
} from '../../../types/compare';
import styles from '../../../styles/Compare.module.css';

interface RecommendationsTabProps {
  recommendations: ClauseRecommendation[];
  docName?: string;
}

const PRIORITY_CONFIG = {
  critical: { label: 'Kritisch', color: '#d70015', bg: 'rgba(215, 0, 21, 0.08)' },
  high: { label: 'Hoch', color: '#ff453a', bg: 'rgba(255, 69, 58, 0.08)' },
  medium: { label: 'Mittel', color: '#ff9500', bg: 'rgba(255, 149, 0, 0.08)' },
  low: { label: 'Niedrig', color: '#34c759', bg: 'rgba(52, 199, 89, 0.08)' },
};

export default function RecommendationsTab({ recommendations, docName = 'Vertrag' }: RecommendationsTabProps) {
  if (recommendations.length === 0) {
    return (
      <div className={styles.emptyTab}>
        <Lightbulb size={48} strokeWidth={1} />
        <h3>Keine Empfehlungen</h3>
        <p>Die KI hat keine konkreten Verbesserungsvorschläge identifiziert.</p>
      </div>
    );
  }

  // Sort by priority
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...recommendations].sort(
    (a, b) => (priorityOrder[a.priority] ?? 3) - (priorityOrder[b.priority] ?? 3)
  );

  return (
    <div className={styles.recommendationsTab}>
      {sorted.map((rec, index) => (
        <RecommendationCard key={index} rec={rec} index={index} docName={docName} />
      ))}
    </div>
  );
}

function RecommendationCard({ rec, index, docName = 'Vertrag' }: { rec: ClauseRecommendation; index: number; docName?: string }) {
  const [copied, setCopied] = useState(false);
  const config = PRIORITY_CONFIG[rec.priority] || PRIORITY_CONFIG.medium;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rec.suggestedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = rec.suggestedText;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      className={styles.recCard}
      style={{ borderLeftColor: config.color }}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {/* Header */}
      <div className={styles.recCardHeader}>
        <div className={styles.recCardMeta}>
          <span className={styles.recAreaBadge}>
            {CLAUSE_AREA_LABELS[rec.clauseArea as ClauseArea] || rec.clauseArea}
          </span>
          <span className={styles.recPriorityBadge} style={{ backgroundColor: config.bg, color: config.color }}>
            {config.label}
          </span>
          <span className={styles.recTargetBadge}>
            {docName} {rec.targetContract}
          </span>
        </div>
        <h4 className={styles.recTitle}>{rec.title}</h4>
      </div>

      {/* Reason */}
      <p className={styles.recReason}>{rec.reason}</p>

      {/* Current → Suggested */}
      <div className={styles.recComparison}>
        {rec.currentText && (
          <div className={styles.recCurrentBox}>
            <div className={styles.recBoxLabel}>Aktuell</div>
            <p>{rec.currentText}</p>
          </div>
        )}

        <div className={styles.recArrow}>
          <ArrowRight size={20} />
        </div>

        <div className={styles.recSuggestedBox}>
          <div className={styles.recBoxLabel}>Vorschlag</div>
          <p>{rec.suggestedText}</p>
          <button
            className={styles.copyButton}
            onClick={handleCopy}
            title="Text kopieren"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Kopiert!' : 'Kopieren'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
