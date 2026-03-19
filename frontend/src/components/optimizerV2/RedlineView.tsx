import { useState, useMemo } from 'react';
import { FileText, Sparkles, ChevronDown, ChevronRight, Minus } from 'lucide-react';
import NegotiationModeSelector from './NegotiationModeSelector';
import type { Clause, ClauseOptimization, OptimizationMode, DiffOp } from '../../types/optimizerV2';
import { CATEGORY_LABELS } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  clauses: Clause[];
  optimizations: ClauseOptimization[];
  activeMode: OptimizationMode;
  onModeChange: (mode: OptimizationMode) => void;
  onClauseClick: (clauseId: string) => void;
}

function DiffRenderer({ diffs }: { diffs: DiffOp[] }) {
  if (!diffs || diffs.length === 0) return null;

  return (
    <>
      {diffs.map((op, i) => {
        if (op.type === 'equal') return <span key={i}>{op.text}</span>;
        if (op.type === 'remove') return <span key={i} className={styles.rlRemove}>{op.text}</span>;
        if (op.type === 'add') return <span key={i} className={styles.rlAdd}>{op.text}</span>;
        return null;
      })}
    </>
  );
}

export default function RedlineView({ clauses, optimizations, activeMode, onModeChange, onClauseClick }: Props) {
  const [collapsedUnchanged, setCollapsedUnchanged] = useState(true);

  // Build optimization map
  const optMap = useMemo(() => {
    const map = new Map<string, ClauseOptimization>();
    for (const opt of optimizations) map.set(opt.clauseId, opt);
    return map;
  }, [optimizations]);

  const changedCount = optimizations.filter(o => o.needsOptimization).length;
  const unchangedCount = clauses.length - changedCount;

  // Separate changed and unchanged clauses while preserving order
  const clauseGroups = useMemo(() => {
    const groups: { clause: Clause; opt: ClauseOptimization | undefined; changed: boolean }[] = [];
    for (const clause of clauses) {
      const opt = optMap.get(clause.id);
      groups.push({ clause, opt, changed: !!opt?.needsOptimization });
    }
    return groups;
  }, [clauses, optMap]);

  return (
    <div className={styles.rlContainer}>
      {/* ── Header ── */}
      <div className={styles.rlHeader}>
        <div className={styles.rlHeaderTop}>
          <div className={styles.rlHeaderTitle}>
            <h3>Redline-Vergleich</h3>
            <div className={styles.rlStats}>
              <span className={styles.rlStatChanged}>{changedCount} Optimierungen</span>
              <span className={styles.rlStatUnchanged}>{unchangedCount} unverändert</span>
            </div>
          </div>
          <NegotiationModeSelector activeMode={activeMode} onModeChange={onModeChange} compact />
        </div>

        {/* Legend */}
        <div className={styles.rlLegendBar}>
          <div className={styles.rlLegendGroup}>
            <span className={styles.rlLegendDot} style={{ background: '#fecaca' }} />
            <span className={styles.rlLegendLabel}>Entfernt</span>
          </div>
          <div className={styles.rlLegendGroup}>
            <span className={styles.rlLegendDot} style={{ background: '#bbf7d0' }} />
            <span className={styles.rlLegendLabel}>Hinzugefügt</span>
          </div>
          <div className={styles.rlLegendSpacer} />
          <div className={styles.rlLegendGroup}>
            <FileText size={12} style={{ color: 'var(--ov2-gray-400)' }} />
            <span className={styles.rlLegendLabel}>Original</span>
          </div>
          <div className={styles.rlLegendGroup}>
            <Sparkles size={12} style={{ color: 'var(--ov2-blue)' }} />
            <span className={styles.rlLegendLabel}>Optimiert</span>
          </div>
        </div>
      </div>

      {/* ── Column Headers ── */}
      <div className={styles.rlColHeaders}>
        <div className={styles.rlColHeader}>
          <FileText size={14} />
          <span>Original</span>
        </div>
        <div className={styles.rlColHeader}>
          <Sparkles size={14} />
          <span>Optimiert</span>
        </div>
      </div>

      {/* ── Clause Rows ── */}
      <div className={styles.rlBody}>
        {clauseGroups.map(({ clause, opt, changed }, idx) => {
          const version = opt?.versions?.[activeMode];
          const hasDiffs = changed && version?.diffs?.length;
          const sectionNum = clause.sectionNumber && clause.sectionNumber !== 'null' ? clause.sectionNumber : '';
          const categoryLabel = CATEGORY_LABELS[clause.category] || clause.category;

          // If unchanged and collapsed, render compact
          if (!changed && collapsedUnchanged) {
            // Show a compact separator for first unchanged clause in a group
            const prevChanged = idx > 0 && clauseGroups[idx - 1].changed;
            const isFirstUnchanged = idx === 0 || prevChanged;

            if (!isFirstUnchanged) return null;

            // Count consecutive unchanged
            let count = 0;
            for (let j = idx; j < clauseGroups.length && !clauseGroups[j].changed; j++) count++;

            return (
              <div
                key={clause.id}
                className={styles.rlUnchangedGroup}
                onClick={() => setCollapsedUnchanged(false)}
              >
                <Minus size={14} />
                <span>{count} unveränderte {count === 1 ? 'Klausel' : 'Klauseln'}</span>
                <ChevronRight size={14} />
              </div>
            );
          }

          return (
            <div
              key={clause.id}
              className={`${styles.rlRow} ${changed ? styles.rlRowChanged : styles.rlRowUnchanged}`}
              onClick={() => onClauseClick(clause.id)}
            >
              {/* Row Header */}
              <div className={styles.rlRowHeader}>
                <div className={styles.rlRowMeta}>
                  {changed && <div className={styles.rlChangeIndicator} />}
                  {sectionNum && <span className={styles.rlSectionBadge}>{sectionNum}</span>}
                  <span className={styles.rlClauseTitle}>{clause.title}</span>
                  <span className={styles.rlCategoryTag}>{categoryLabel}</span>
                  {changed && <span className={styles.rlOptimizedTag}>Optimiert</span>}
                </div>
                {!changed && collapsedUnchanged === false && (
                  <button
                    className={styles.rlCollapseBtn}
                    onClick={(e) => { e.stopPropagation(); setCollapsedUnchanged(true); }}
                  >
                    Ausblenden
                  </button>
                )}
              </div>

              {/* Two-column content */}
              <div className={styles.rlRowContent}>
                <div className={styles.rlCol}>
                  <div className={styles.rlColLabel}>
                    <FileText size={12} /> Original
                  </div>
                  <div className={styles.rlText}>
                    {clause.originalText}
                  </div>
                </div>

                <div className={styles.rlColDivider} />

                <div className={styles.rlCol}>
                  <div className={styles.rlColLabel}>
                    <Sparkles size={12} /> Optimiert
                  </div>
                  <div className={styles.rlText}>
                    {hasDiffs && version?.diffs ? (
                      <DiffRenderer diffs={version.diffs} />
                    ) : (
                      <span className={styles.rlNoChange}>{clause.originalText}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Footer ── */}
      <div className={styles.rlFooter}>
        <button
          className={styles.rlToggleBtn}
          onClick={() => setCollapsedUnchanged(!collapsedUnchanged)}
        >
          {collapsedUnchanged ? (
            <><ChevronDown size={14} /> Alle {clauses.length} Klauseln anzeigen</>
          ) : (
            <><ChevronRight size={14} /> Unveränderte Klauseln ausblenden</>
          )}
        </button>
      </div>
    </div>
  );
}
