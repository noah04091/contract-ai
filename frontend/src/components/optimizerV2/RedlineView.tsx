import { useState, useMemo, useRef, useCallback } from 'react';
import {
  FileText, Sparkles, ChevronDown, ChevronRight, Minus, X,
  ArrowUp, ArrowDown, Filter, Download, AlertTriangle,
  BookOpen, Lightbulb, Scale
} from 'lucide-react';
import NegotiationModeSelector from './NegotiationModeSelector';
import type { Clause, ClauseOptimization, ClauseAnalysis, OptimizationMode, DiffOp } from '../../types/optimizerV2';
import { CATEGORY_LABELS, MODE_LABELS } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  clauses: Clause[];
  optimizations: ClauseOptimization[];
  clauseAnalyses?: ClauseAnalysis[];
  activeMode: OptimizationMode;
  onModeChange: (mode: OptimizationMode) => void;
  onClauseClick: (clauseId: string) => void;
  resultId?: string;
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

export default function RedlineView({
  clauses, optimizations, clauseAnalyses, activeMode, onModeChange, onClauseClick, resultId
}: Props) {
  const [collapsedUnchanged, setCollapsedUnchanged] = useState(true);
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [focusedChangeIdx, setFocusedChangeIdx] = useState(-1);
  const [selectedClauseId, setSelectedClauseId] = useState<string | null>(null);
  const [modeTransition, setModeTransition] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const changeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Build maps
  const optMap = useMemo(() => {
    const map = new Map<string, ClauseOptimization>();
    for (const opt of optimizations) map.set(opt.clauseId, opt);
    return map;
  }, [optimizations]);

  const analysisMap = useMemo(() => {
    const map = new Map<string, ClauseAnalysis>();
    if (clauseAnalyses) {
      for (const a of clauseAnalyses) map.set(a.clauseId, a);
    }
    return map;
  }, [clauseAnalyses]);

  const changedCount = optimizations.filter(o => o.needsOptimization).length;
  const unchangedCount = clauses.length - changedCount;

  const clauseGroups = useMemo(() => {
    const groups: { clause: Clause; opt: ClauseOptimization | undefined; changed: boolean }[] = [];
    for (const clause of clauses) {
      const opt = optMap.get(clause.id);
      groups.push({ clause, opt, changed: !!opt?.needsOptimization });
    }
    return groups;
  }, [clauses, optMap]);

  // Changed clause IDs for navigation
  const changedIds = useMemo(() =>
    clauseGroups.filter(g => g.changed).map(g => g.clause.id),
    [clauseGroups]
  );

  // ── Feature 1: Jump navigation ──
  const jumpToChange = useCallback((direction: 'prev' | 'next') => {
    if (changedIds.length === 0) return;
    let newIdx: number;
    if (direction === 'next') {
      newIdx = focusedChangeIdx < changedIds.length - 1 ? focusedChangeIdx + 1 : 0;
    } else {
      newIdx = focusedChangeIdx > 0 ? focusedChangeIdx - 1 : changedIds.length - 1;
    }
    setFocusedChangeIdx(newIdx);
    const el = changeRefs.current.get(changedIds[newIdx]);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [changedIds, focusedChangeIdx]);

  // ── Feature 5: Mode-switch animation ──
  const handleModeChange = useCallback((mode: OptimizationMode) => {
    setModeTransition(true);
    setTimeout(() => {
      onModeChange(mode);
      setTimeout(() => setModeTransition(false), 50);
    }, 150);
  }, [onModeChange]);

  // ── Feature 3: Side panel ──
  const handleClauseClick = useCallback((clauseId: string) => {
    setSelectedClauseId(prev => prev === clauseId ? null : clauseId);
  }, []);

  const selectedClause = selectedClauseId ? clauses.find(c => c.id === selectedClauseId) : null;
  const selectedOpt = selectedClauseId ? optMap.get(selectedClauseId) : null;
  const selectedAnalysis = selectedClauseId ? analysisMap.get(selectedClauseId) : null;
  const selectedVersion = selectedOpt?.versions?.[activeMode];

  // ── Feature 4: Redline PDF export ──
  const handleRedlinePdf = async () => {
    if (!resultId || exportingPdf) return;
    setExportingPdf(true);
    try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env?.VITE_API_URL || (window.location.hostname === 'localhost' ? '' : 'https://api.contract-ai.de');
      const response = await fetch(`${apiBase}/api/optimizer-v2/results/${resultId}/redline-pdf?mode=${activeMode}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Export fehlgeschlagen');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Redline_${MODE_LABELS[activeMode].label.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setExportingPdf(false);
    }
  };

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
          <div className={styles.rlHeaderActions}>
            {/* Feature 1: Navigation */}
            <div className={styles.rlNavGroup}>
              <button className={styles.rlNavBtn} onClick={() => jumpToChange('prev')} title="Vorherige Änderung">
                <ArrowUp size={14} />
              </button>
              <span className={styles.rlNavLabel}>
                {focusedChangeIdx >= 0 ? `${focusedChangeIdx + 1}/${changedIds.length}` : `${changedIds.length}`}
              </span>
              <button className={styles.rlNavBtn} onClick={() => jumpToChange('next')} title="Nächste Änderung">
                <ArrowDown size={14} />
              </button>
            </div>

            {/* Feature 2: Filter toggle */}
            <button
              className={`${styles.rlFilterBtn} ${showOnlyChanges ? styles.rlFilterBtnActive : ''}`}
              onClick={() => { setShowOnlyChanges(!showOnlyChanges); setCollapsedUnchanged(true); }}
              title={showOnlyChanges ? 'Alle Klauseln anzeigen' : 'Nur Änderungen'}
            >
              <Filter size={14} />
              <span>{showOnlyChanges ? 'Nur Änderungen' : 'Alle'}</span>
            </button>

            {/* Feature 4: PDF Export */}
            {resultId && (
              <button
                className={styles.rlExportBtn}
                onClick={handleRedlinePdf}
                disabled={exportingPdf}
                title="Redline als PDF exportieren"
              >
                <Download size={14} />
                <span>{exportingPdf ? 'Export...' : 'PDF'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mode selector row */}
        <div className={styles.rlModeRow}>
          <NegotiationModeSelector activeMode={activeMode} onModeChange={handleModeChange} compact />
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
          // Feature 2: hide unchanged when filter is active
          if (!changed && showOnlyChanges) return null;

          const version = opt?.versions?.[activeMode];
          const hasDiffs = changed && version?.diffs?.length;
          const sectionNum = clause.sectionNumber && clause.sectionNumber !== 'null' ? clause.sectionNumber : '';
          const categoryLabel = CATEGORY_LABELS[clause.category] || clause.category;
          const isFocused = changedIds[focusedChangeIdx] === clause.id;
          const isSelected = selectedClauseId === clause.id;

          // Collapsed unchanged
          if (!changed && !showOnlyChanges && collapsedUnchanged) {
            const prevChanged = idx > 0 && clauseGroups[idx - 1].changed;
            const isFirstUnchanged = idx === 0 || prevChanged;
            if (!isFirstUnchanged) return null;

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
              ref={changed ? (el) => { if (el) changeRefs.current.set(clause.id, el); } : undefined}
              className={`${styles.rlRow} ${changed ? styles.rlRowChanged : styles.rlRowUnchanged} ${isFocused ? styles.rlRowFocused : ''} ${isSelected ? styles.rlRowSelected : ''}`}
              onClick={() => handleClauseClick(clause.id)}
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
              </div>

              {/* Two-column content */}
              <div className={`${styles.rlRowContent} ${modeTransition ? styles.rlModeTransition : ''}`}>
                <div className={styles.rlCol}>
                  <div className={styles.rlText}>{clause.originalText}</div>
                </div>
                <div className={styles.rlColDivider} />
                <div className={styles.rlCol}>
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
      {!showOnlyChanges && (
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
      )}

      {/* ── Feature 3: Detail Side Panel ── */}
      {selectedClause && (
        <>
          <div className={styles.rlPanelBackdrop} onClick={() => setSelectedClauseId(null)} />
          <div className={styles.rlPanel}>
            <div className={styles.rlPanelHeader}>
              <div>
                <h4 className={styles.rlPanelTitle}>
                  {selectedClause.sectionNumber && selectedClause.sectionNumber !== 'null' && (
                    <span className={styles.rlSectionBadge} style={{ marginRight: 8 }}>{selectedClause.sectionNumber}</span>
                  )}
                  {selectedClause.title}
                </h4>
                <span className={styles.rlCategoryTag}>
                  {CATEGORY_LABELS[selectedClause.category] || selectedClause.category}
                </span>
              </div>
              <button className={styles.rlPanelClose} onClick={() => setSelectedClauseId(null)}>
                <X size={18} />
              </button>
            </div>

            <div className={styles.rlPanelBody}>
              {/* Analysis info */}
              {selectedAnalysis && (
                <div className={styles.rlPanelSection}>
                  <div className={styles.rlPanelSectionTitle}>
                    <BookOpen size={14} /> Analyse
                  </div>
                  <p className={styles.rlPanelText}>{selectedAnalysis.plainLanguage}</p>
                  {selectedAnalysis.concerns.length > 0 && (
                    <div className={styles.rlPanelConcerns}>
                      <AlertTriangle size={12} />
                      <ul>
                        {selectedAnalysis.concerns.map((c, i) => <li key={i}>{c}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Optimization reasoning */}
              {selectedOpt?.needsOptimization && selectedVersion && (
                <div className={styles.rlPanelSection}>
                  <div className={styles.rlPanelSectionTitle}>
                    <Lightbulb size={14} /> Optimierung ({MODE_LABELS[activeMode].label})
                  </div>
                  <p className={styles.rlPanelText}>{selectedVersion.reasoning}</p>
                </div>
              )}

              {/* Market benchmark */}
              {selectedOpt?.marketBenchmark && (
                <div className={styles.rlPanelSection}>
                  <div className={styles.rlPanelSectionTitle}>
                    <Scale size={14} /> Marktvergleich
                  </div>
                  <p className={styles.rlPanelText}>{selectedOpt.marketBenchmark}</p>
                </div>
              )}

              {/* Diff preview */}
              {selectedOpt?.needsOptimization && selectedVersion?.diffs && (
                <div className={styles.rlPanelSection}>
                  <div className={styles.rlPanelSectionTitle}>
                    <Sparkles size={14} /> Änderungen
                  </div>
                  <div className={styles.rlPanelDiff}>
                    <DiffRenderer diffs={selectedVersion.diffs} />
                  </div>
                </div>
              )}

              {/* Go to full view */}
              <button
                className={styles.rlPanelDetailBtn}
                onClick={() => { onClauseClick(selectedClauseId!); setSelectedClauseId(null); }}
              >
                Zur vollständigen Ansicht
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
