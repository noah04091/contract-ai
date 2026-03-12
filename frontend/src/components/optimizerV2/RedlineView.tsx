import { useRef, useCallback, useMemo } from 'react';
import { FileText, Sparkles } from 'lucide-react';
import NegotiationModeSelector from './NegotiationModeSelector';
import type { Clause, ClauseOptimization, OptimizationMode, DiffOp } from '../../types/optimizerV2';
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
  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  // Build optimization map
  const optMap = useMemo(() => {
    const map = new Map<string, ClauseOptimization>();
    for (const opt of optimizations) map.set(opt.clauseId, opt);
    return map;
  }, [optimizations]);

  // Sync scroll between panels
  const handleScroll = useCallback((source: 'left' | 'right') => {
    if (isSyncing.current) return;
    isSyncing.current = true;

    const sourceEl = source === 'left' ? leftPanelRef.current : rightPanelRef.current;
    const targetEl = source === 'left' ? rightPanelRef.current : leftPanelRef.current;

    if (sourceEl && targetEl) {
      const ratio = sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight || 1);
      targetEl.scrollTop = ratio * (targetEl.scrollHeight - targetEl.clientHeight);
    }

    requestAnimationFrame(() => { isSyncing.current = false; });
  }, []);

  const changedCount = optimizations.filter(o => o.needsOptimization).length;

  return (
    <div className={styles.redlineContainer}>
      {/* Header */}
      <div className={styles.redlineHeader}>
        <div className={styles.redlineHeaderLeft}>
          <h3>Redline-Vergleich</h3>
          <span className={styles.redlineChangedCount}>
            {changedCount} {changedCount === 1 ? 'Änderung' : 'Änderungen'}
          </span>
        </div>
        <NegotiationModeSelector activeMode={activeMode} onModeChange={onModeChange} compact />
      </div>

      {/* Legend */}
      <div className={styles.redlineLegend}>
        <span className={styles.legendItem}>
          <span className={styles.rlRemove}>Entfernt</span>
        </span>
        <span className={styles.legendItem}>
          <span className={styles.rlAdd}>Hinzugefügt</span>
        </span>
      </div>

      {/* Two-panel view */}
      <div className={styles.redlinePanels}>
        {/* Left: Original */}
        <div className={styles.redlinePanel}>
          <div className={styles.redlinePanelHeader}>
            <FileText size={14} />
            <span>Original</span>
          </div>
          <div
            className={styles.redlinePanelContent}
            ref={leftPanelRef}
            onScroll={() => handleScroll('left')}
          >
            {clauses.map(clause => (
              <div
                key={clause.id}
                className={styles.redlineClause}
                onClick={() => onClauseClick(clause.id)}
              >
                <div className={styles.redlineClauseHeader}>
                  {clause.sectionNumber && <span className={styles.rlSection}>{clause.sectionNumber}</span>}
                  <span className={styles.rlTitle}>{clause.title}</span>
                </div>
                <div className={styles.redlineClauseText}>
                  {clause.originalText}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className={styles.redlineDivider} />

        {/* Right: Optimized */}
        <div className={styles.redlinePanel}>
          <div className={styles.redlinePanelHeader}>
            <Sparkles size={14} />
            <span>Optimiert</span>
          </div>
          <div
            className={styles.redlinePanelContent}
            ref={rightPanelRef}
            onScroll={() => handleScroll('right')}
          >
            {clauses.map(clause => {
              const opt = optMap.get(clause.id);
              const version = opt?.versions?.[activeMode];
              const hasDiffs = opt?.needsOptimization && version?.diffs?.length;

              return (
                <div
                  key={clause.id}
                  className={`${styles.redlineClause} ${hasDiffs ? styles.redlineClauseChanged : ''}`}
                  onClick={() => onClauseClick(clause.id)}
                >
                  <div className={styles.redlineClauseHeader}>
                    {clause.sectionNumber && <span className={styles.rlSection}>{clause.sectionNumber}</span>}
                    <span className={styles.rlTitle}>{clause.title}</span>
                    {hasDiffs && <span className={styles.rlChangedBadge}>Optimiert</span>}
                  </div>
                  <div className={styles.redlineClauseText}>
                    {hasDiffs && version?.diffs ? (
                      <DiffRenderer diffs={version.diffs} />
                    ) : (
                      clause.originalText
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
