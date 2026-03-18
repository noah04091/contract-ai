import { useState, useMemo } from 'react';
import { Download, FileText, File, Loader2 } from 'lucide-react';
import type { AnalysisResult, OptimizationMode } from '../../types/optimizerV2';
import { CATEGORY_LABELS, MODE_LABELS } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  result: AnalysisResult;
}

type DocxStep = 'idle' | 'selecting' | 'generating';

export default function ExportPanel({ result }: Props) {
  const optimizedCount = result.optimizations.filter(o => o.needsOptimization).length;
  const [downloading, setDownloading] = useState(false);

  // DOCX flow state
  const [docxStep, setDocxStep] = useState<DocxStep>('idle');
  const [docxMode, setDocxMode] = useState<OptimizationMode>('neutral');
  const [selectedClauses, setSelectedClauses] = useState<Set<string>>(() => {
    // Pre-select all clauses that need optimization
    return new Set(result.optimizations.filter(o => o.needsOptimization).map(o => o.clauseId));
  });
  const [generating, setGenerating] = useState(false);

  // Optimizable clauses with their data
  const optimizableClauses = useMemo(() => {
    return result.optimizations
      .filter(o => o.needsOptimization)
      .map(opt => {
        const clause = result.clauses.find(c => c.id === opt.clauseId);
        const analysis = result.clauseAnalyses.find(a => a.clauseId === opt.clauseId);
        return { opt, clause, analysis };
      })
      .filter(item => item.clause);
  }, [result]);

  const handlePdfExport = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env?.VITE_API_URL || (window.location.hostname === 'localhost' ? '' : 'https://api.contract-ai.de');
      const response = await fetch(`${apiBase}/api/optimizer-v2/results/${result.resultId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Export fehlgeschlagen');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(result.structure?.contractTypeLabel || 'Analyse').replace(/\s+/g, '_')}_Bericht.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // silent
    } finally {
      setDownloading(false);
    }
  };

  const handleDocxGenerate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const apiBase = import.meta.env?.VITE_API_URL || (window.location.hostname === 'localhost' ? '' : 'https://api.contract-ai.de');
      const selections = Array.from(selectedClauses).map(clauseId => ({ clauseId, mode: docxMode }));

      const response = await fetch(`${apiBase}/api/optimizer-v2/results/${result.resultId}/docx`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ selections, mode: docxMode })
      });

      if (!response.ok) throw new Error('DOCX-Export fehlgeschlagen');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(result.structure?.contractTypeLabel || 'Vertrag').replace(/\s+/g, '_')}_optimiert.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setDocxStep('idle');
    } catch {
      // silent
    } finally {
      setGenerating(false);
    }
  };

  const toggleClause = (clauseId: string) => {
    setSelectedClauses(prev => {
      const next = new Set(prev);
      if (next.has(clauseId)) next.delete(clauseId);
      else next.add(clauseId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedClauses.size === optimizableClauses.length) {
      setSelectedClauses(new Set());
    } else {
      setSelectedClauses(new Set(optimizableClauses.map(c => c.opt.clauseId)));
    }
  };

  return (
    <div className={styles.exportPanel}>
      <h3 className={styles.exportTitle}>Ergebnisse exportieren</h3>
      <p className={styles.exportSubtitle}>
        {result.clauses.length} Klauseln analysiert, {optimizedCount} optimiert
      </p>

      <div className={styles.exportOptions}>
        {/* PDF Export */}
        <div className={styles.exportOption}>
          <div className={styles.exportOptionIcon}>
            <FileText size={24} />
          </div>
          <div className={styles.exportOptionInfo}>
            <h4>Analyse-Bericht (PDF)</h4>
            <p>Vollständiger Bericht mit Scores, Risiken und Empfehlungen</p>
          </div>
          <button
            className={styles.exportBtnActive}
            onClick={handlePdfExport}
            disabled={downloading}
          >
            {downloading ? <Loader2 size={14} className={styles.spinIcon} /> : <Download size={14} />}
            {downloading ? 'Erstelle...' : 'Herunterladen'}
          </button>
        </div>

        {/* DOCX Export */}
        <div className={`${styles.exportOption} ${docxStep === 'selecting' ? styles.exportOptionExpanded : ''}`}>
          <div className={styles.exportOptionIcon}>
            <File size={24} />
          </div>
          <div className={styles.exportOptionInfo}>
            <h4>Optimierter Vertrag (DOCX)</h4>
            <p>Vertrag mit ausgewählten Optimierungen als Word-Dokument</p>
          </div>
          {docxStep === 'idle' ? (
            <button
              className={styles.exportBtnActive}
              onClick={() => setDocxStep('selecting')}
              disabled={optimizedCount === 0}
            >
              <File size={14} /> Erstellen
            </button>
          ) : (
            <button
              className={styles.exportBtn}
              onClick={() => setDocxStep('idle')}
              style={{ cursor: 'pointer' }}
            >
              Abbrechen
            </button>
          )}
        </div>
      </div>

      {/* ── DOCX Selection Panel ── */}
      {docxStep === 'selecting' && (
        <div className={styles.docxSelection}>
          <div className={styles.docxSelectionHeader}>
            <h4>Welche Optimierungen übernehmen?</h4>
            <p>Wähle die Klauseln aus, die im DOCX optimiert werden sollen.</p>
          </div>

          {/* Mode selector */}
          <div className={styles.docxModeRow}>
            <span className={styles.docxModeLabel}>Perspektive:</span>
            <div className={styles.docxModeButtons}>
              {(['neutral', 'proCreator', 'proRecipient'] as OptimizationMode[]).map(m => (
                <button
                  key={m}
                  className={`${styles.docxModeBtn} ${docxMode === m ? styles.docxModeBtnActive : ''}`}
                  onClick={() => setDocxMode(m)}
                  style={docxMode === m ? { borderColor: MODE_LABELS[m].color, color: MODE_LABELS[m].color } : {}}
                >
                  {MODE_LABELS[m].label}
                </button>
              ))}
            </div>
          </div>

          {/* Select all / none */}
          <div className={styles.docxSelectAll}>
            <button onClick={toggleAll} className={styles.docxSelectAllBtn}>
              {selectedClauses.size === optimizableClauses.length ? 'Alle abwählen' : 'Alle auswählen'}
            </button>
            <span className={styles.docxCount}>
              {selectedClauses.size} von {optimizableClauses.length} ausgewählt
            </span>
          </div>

          {/* Clause list */}
          <div className={styles.docxClauseList}>
            {optimizableClauses.map(({ opt, clause, analysis }) => {
              const isSelected = selectedClauses.has(opt.clauseId);
              const sectionNum = clause!.sectionNumber && clause!.sectionNumber !== 'null' ? clause!.sectionNumber : '';
              const categoryLabel = CATEGORY_LABELS[clause!.category] || clause!.category;

              return (
                <label
                  key={opt.clauseId}
                  className={`${styles.docxClauseItem} ${isSelected ? styles.docxClauseItemSelected : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleClause(opt.clauseId)}
                    className={styles.docxCheckbox}
                  />
                  <div className={styles.docxClauseInfo}>
                    <span className={styles.docxClauseTitle}>
                      {sectionNum && <span className={styles.docxClauseSection}>{sectionNum}</span>}
                      {clause!.title}
                    </span>
                    <span className={styles.docxClauseMeta}>
                      {categoryLabel}
                      {analysis?.importanceLevel === 'critical' && ' • Kritisch'}
                      {analysis?.importanceLevel === 'high' && ' • Wichtig'}
                    </span>
                  </div>
                  <div className={styles.docxClausePreview}>
                    {opt.versions?.[docxMode]?.text
                      ? opt.versions[docxMode].text.substring(0, 80) + '...'
                      : '–'}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Generate button */}
          <button
            className={styles.docxGenerateBtn}
            onClick={handleDocxGenerate}
            disabled={generating || selectedClauses.size === 0}
          >
            {generating ? (
              <><Loader2 size={16} className={styles.spinIcon} /> DOCX wird erstellt...</>
            ) : (
              <><Download size={16} /> DOCX generieren ({selectedClauses.size} Optimierungen)</>
            )}
          </button>
        </div>
      )}

      {/* Analysis summary */}
      <div className={styles.exportSummary}>
        <h4>Analyse-Zusammenfassung</h4>
        <div className={styles.exportSummaryGrid}>
          <div><span>Vertragstyp:</span> {result.structure.contractTypeLabel}</div>
          <div><span>Klauseln:</span> {result.clauses.length}</div>
          <div><span>Optimiert:</span> {optimizedCount}</div>
          <div><span>Score:</span> {result.scores.overall}/100</div>
          <div><span>Analysezeit:</span> {result.performance ? `${(result.performance.totalDurationMs / 1000).toFixed(1)}s` : '-'}</div>
          <div><span>KI-Kosten:</span> {result.costs ? `$${result.costs.totalCostUSD.toFixed(3)}` : '-'}</div>
        </div>
      </div>
    </div>
  );
}
