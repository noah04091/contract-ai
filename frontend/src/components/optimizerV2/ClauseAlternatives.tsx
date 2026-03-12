import { useState } from 'react';
import { Check, Scale, Shield, UserCheck } from 'lucide-react';
import type { ClauseOptimization, OptimizationMode, DiffOp } from '../../types/optimizerV2';
import { MODE_LABELS } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  clauseId: string;
  originalText: string;
  optimization: ClauseOptimization;
  activeMode: OptimizationMode;
  onAcceptVersion: (clauseId: string, version: 'neutral' | 'proCreator' | 'proRecipient' | 'original' | 'custom', customText?: string) => void;
}

const MODE_ICONS = {
  neutral: Scale,
  proCreator: Shield,
  proRecipient: UserCheck
};

function renderDiff(diffs: DiffOp[]) {
  if (!diffs || diffs.length === 0) return null;

  return (
    <div className={styles.diffContent}>
      {diffs.map((op, i) => {
        if (op.type === 'equal') return <span key={i}>{op.text}</span>;
        if (op.type === 'remove') return <span key={i} className={styles.diffRemove}>{op.text}</span>;
        if (op.type === 'add') return <span key={i} className={styles.diffAdd}>{op.text}</span>;
        return null;
      })}
    </div>
  );
}

export default function ClauseAlternatives({ clauseId, originalText, optimization, activeMode, onAcceptVersion }: Props) {
  const [selectedTab, setSelectedTab] = useState<OptimizationMode>(activeMode);

  const version = optimization.versions[selectedTab];
  const diffs = version?.diffs || [];

  return (
    <div className={styles.alternatives}>
      <h4 className={styles.alternativesTitle}>Optimierte Versionen</h4>

      {/* Mode tabs */}
      <div className={styles.alternativesTabs}>
        {(Object.keys(MODE_LABELS) as OptimizationMode[]).map(mode => {
          const Icon = MODE_ICONS[mode];
          const config = MODE_LABELS[mode];
          const isActive = selectedTab === mode;

          return (
            <button
              key={mode}
              className={`${styles.altTab} ${isActive ? styles.altTabActive : ''}`}
              style={isActive ? { borderBottomColor: config.color } : undefined}
              onClick={() => setSelectedTab(mode)}
            >
              <Icon size={13} />
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Diff view */}
      <div className={styles.alternativeContent}>
        {diffs.length > 0 ? (
          renderDiff(diffs)
        ) : (
          <p className={styles.alternativeText}>{version?.text || originalText}</p>
        )}
      </div>

      {/* Reasoning */}
      {version?.reasoning && (
        <p className={styles.alternativeReasoning}>{version.reasoning}</p>
      )}

      {/* Market benchmark */}
      {optimization.marketBenchmark && (
        <p className={styles.alternativeBenchmark}>{optimization.marketBenchmark}</p>
      )}

      {/* Negotiation advice */}
      {optimization.negotiationAdvice && (
        <p className={styles.alternativeAdvice}>
          <strong>Verhandlungstipp:</strong> {optimization.negotiationAdvice}
        </p>
      )}

      {/* Accept button */}
      <button
        className={styles.acceptButton}
        onClick={() => onAcceptVersion(clauseId, selectedTab)}
      >
        <Check size={14} />
        Version übernehmen
      </button>
    </div>
  );
}
