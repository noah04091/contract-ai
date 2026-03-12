import { useState } from 'react';
import { Download, FileText, File, Loader2 } from 'lucide-react';
import type { AnalysisResult } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  result: AnalysisResult;
}

export default function ExportPanel({ result }: Props) {
  const optimizedCount = result.optimizations.filter(o => o.needsOptimization).length;
  const [downloading, setDownloading] = useState(false);

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
      // silent - could add toast here
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={styles.exportPanel}>
      <h3 className={styles.exportTitle}>Ergebnisse exportieren</h3>
      <p className={styles.exportSubtitle}>
        {result.clauses.length} Klauseln analysiert, {optimizedCount} optimiert
      </p>

      <div className={styles.exportOptions}>
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
            {downloading ? 'Erstelle PDF...' : 'Herunterladen'}
          </button>
        </div>

        <div className={styles.exportOption}>
          <div className={styles.exportOptionIcon}>
            <File size={24} />
          </div>
          <div className={styles.exportOptionInfo}>
            <h4>Optimierter Vertrag (DOCX)</h4>
            <p>Vertrag mit allen übernommenen Optimierungen</p>
          </div>
          <button className={styles.exportBtn} disabled>
            <Download size={14} /> Bald verfügbar
          </button>
        </div>
      </div>

      {/* Analysis summary for reference */}
      <div className={styles.exportSummary}>
        <h4>Analyse-Zusammenfassung</h4>
        <div className={styles.exportSummaryGrid}>
          <div><span>Vertragstyp:</span> {result.structure.contractTypeLabel}</div>
          <div><span>Klauseln:</span> {result.clauses.length}</div>
          <div><span>Optimiert:</span> {optimizedCount}</div>
          <div><span>Score:</span> {result.scores.overall}/100</div>
          <div><span>Analysezeit:</span> {(result.performance.totalDurationMs / 1000).toFixed(1)}s</div>
          <div><span>KI-Kosten:</span> ${result.costs.totalCostUSD.toFixed(3)}</div>
        </div>
      </div>
    </div>
  );
}
