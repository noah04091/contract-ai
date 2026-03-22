import { useState } from 'react';
import { Check, Scale, Shield, UserCheck, ArrowRight, Lightbulb, BarChart3, Pencil } from 'lucide-react';
import type { ClauseOptimization, OptimizationMode, DiffOp } from '../../types/optimizerV2';
import { MODE_LABELS } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

type TabMode = OptimizationMode | 'custom';

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

/** Parse PROBLEM / ÄNDERUNG / WIRKUNG from reasoning text */
function parseReasoning(reasoning: string | undefined): { problem?: string; change?: string; impact?: string; raw: string } {
  if (!reasoning) return { raw: '' };

  const problemMatch = reasoning.match(/(?:PROBLEM|Problem)[:\s]*(.+?)(?=(?:ÄNDERUNG|Änderung|WIRKUNG|Wirkung|$))/si);
  const changeMatch = reasoning.match(/(?:ÄNDERUNG|Änderung)[:\s]*(.+?)(?=(?:WIRKUNG|Wirkung|$))/si);
  const impactMatch = reasoning.match(/(?:WIRKUNG|Wirkung)[:\s]*(.+?)$/si);

  if (problemMatch || changeMatch || impactMatch) {
    return {
      problem: problemMatch?.[1]?.trim(),
      change: changeMatch?.[1]?.trim(),
      impact: impactMatch?.[1]?.trim(),
      raw: reasoning
    };
  }

  return { raw: reasoning };
}

export default function ClauseAlternatives({ clauseId, originalText, optimization, activeMode, onAcceptVersion }: Props) {
  const [selectedTab, setSelectedTab] = useState<TabMode>(activeMode);
  const [viewMode, setViewMode] = useState<'sideBySide' | 'diff'>('sideBySide');
  const [customText, setCustomText] = useState(() => {
    // Pre-fill with the active mode's optimized text
    return optimization.versions[activeMode]?.text || originalText;
  });

  const isCustomTab = selectedTab === 'custom';
  const version = isCustomTab ? null : optimization.versions[selectedTab as OptimizationMode];
  const diffs = version?.diffs || [];
  const reasoning = parseReasoning(version?.reasoning);

  return (
    <div className={styles.alternatives}>
      <div className={styles.alternativesHeader}>
        <h4 className={styles.alternativesTitle}>Klauselvergleich</h4>
        <div className={styles.viewToggle}>
          <button
            className={`${styles.viewToggleBtn} ${viewMode === 'sideBySide' ? styles.viewToggleBtnActive : ''}`}
            onClick={() => setViewMode('sideBySide')}
          >
            Vergleich
          </button>
          <button
            className={`${styles.viewToggleBtn} ${viewMode === 'diff' ? styles.viewToggleBtnActive : ''}`}
            onClick={() => setViewMode('diff')}
          >
            Diff
          </button>
        </div>
      </div>

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
        <button
          className={`${styles.altTab} ${isCustomTab ? styles.altTabActive : ''}`}
          style={isCustomTab ? { borderBottomColor: '#8B5CF6' } : undefined}
          onClick={() => setSelectedTab('custom')}
        >
          <Pencil size={13} />
          Eigener Text
        </button>
      </div>

      {/* Custom text editor */}
      {isCustomTab ? (
        <div className={styles.customEditor}>
          <div className={styles.customEditorHeader}>
            <span>Klauseltext bearbeiten</span>
            <div className={styles.customEditorActions}>
              {(Object.keys(MODE_LABELS) as OptimizationMode[]).map(mode => (
                <button
                  key={mode}
                  className={styles.customPresetBtn}
                  onClick={() => setCustomText(optimization.versions[mode]?.text || originalText)}
                  title={`${MODE_LABELS[mode].label}-Version als Basis verwenden`}
                >
                  {MODE_LABELS[mode].label}
                </button>
              ))}
              <button
                className={styles.customPresetBtn}
                onClick={() => setCustomText(originalText)}
                title="Original wiederherstellen"
              >
                Original
              </button>
            </div>
          </div>
          <textarea
            className={styles.customTextarea}
            value={customText}
            onChange={e => setCustomText(e.target.value)}
            rows={Math.max(6, customText.split('\n').length + 2)}
          />
        </div>
      ) : viewMode === 'sideBySide' ? (
        <div className={styles.comparisonGrid}>
          <div className={styles.comparisonCol}>
            <div className={styles.comparisonLabel}>
              <span className={styles.comparisonLabelDot} style={{ background: '#8E8E93' }} />
              Original
            </div>
            <div className={styles.comparisonText}>
              {originalText}
            </div>
          </div>
          <div className={styles.comparisonArrow}>
            <ArrowRight size={16} />
          </div>
          <div className={styles.comparisonCol}>
            <div className={styles.comparisonLabel}>
              <span className={styles.comparisonLabelDot} style={{ background: MODE_LABELS[selectedTab as OptimizationMode].color }} />
              {MODE_LABELS[selectedTab as OptimizationMode].label}
            </div>
            <div className={`${styles.comparisonText} ${styles.comparisonTextOptimized}`}>
              {version?.text || originalText}
            </div>
          </div>
        </div>
      ) : (
        /* Inline diff view */
        <div className={styles.alternativeContent}>
          {diffs.length > 0 ? (
            renderDiff(diffs)
          ) : (
            <p className={styles.alternativeText}>{version?.text || originalText}</p>
          )}
        </div>
      )}

      {/* Structured reasoning (PROBLEM → ÄNDERUNG → WIRKUNG) */}
      {reasoning.problem || reasoning.change || reasoning.impact ? (
        <div className={styles.reasoningStructured}>
          {reasoning.problem && (
            <div className={styles.reasoningStep}>
              <span className={styles.reasoningStepIcon} style={{ color: '#FF3B30' }}>Problem</span>
              <span className={styles.reasoningStepText}>{reasoning.problem}</span>
            </div>
          )}
          {reasoning.change && (
            <div className={styles.reasoningStep}>
              <span className={styles.reasoningStepIcon} style={{ color: '#007AFF' }}>Änderung</span>
              <span className={styles.reasoningStepText}>{reasoning.change}</span>
            </div>
          )}
          {reasoning.impact && (
            <div className={styles.reasoningStep}>
              <span className={styles.reasoningStepIcon} style={{ color: '#34C759' }}>Wirkung</span>
              <span className={styles.reasoningStepText}>{reasoning.impact}</span>
            </div>
          )}
        </div>
      ) : reasoning.raw ? (
        <p className={styles.alternativeReasoning}>{reasoning.raw}</p>
      ) : null}

      {/* Market benchmark */}
      {optimization.marketBenchmark && (
        <div className={styles.benchmarkCard}>
          <BarChart3 size={13} style={{ color: '#FF9500', flexShrink: 0, marginTop: 1 }} />
          <div>
            <span className={styles.benchmarkLabel}>Marktstandard</span>
            <span className={styles.benchmarkText}>{optimization.marketBenchmark}</span>
          </div>
        </div>
      )}

      {/* Negotiation advice */}
      {optimization.negotiationAdvice && (
        <div className={styles.adviceCard}>
          <Lightbulb size={13} style={{ color: '#34C759', flexShrink: 0, marginTop: 1 }} />
          <div>
            <span className={styles.adviceLabel}>Verhandlungstipp</span>
            <span className={styles.adviceText}>{optimization.negotiationAdvice}</span>
          </div>
        </div>
      )}

      {/* Accept button */}
      <button
        className={styles.acceptButton}
        onClick={() => isCustomTab
          ? onAcceptVersion(clauseId, 'custom', customText)
          : onAcceptVersion(clauseId, selectedTab as OptimizationMode)
        }
      >
        <Check size={14} />
        {isCustomTab ? 'Eigenen Text übernehmen' : 'Version übernehmen'}
      </button>
    </div>
  );
}
