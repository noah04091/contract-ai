// 🆕 29.05.2026: Multi-Upload-Result-Navigator
// Ersetzt das bisherige Grid-View-Pattern (alle Cards parallel) durch
// fokussierte Single-View + "X von N"-Navigation. User sieht den aktuellen
// Vertrag groß + kann durch alle hochgeladenen durchklicken. Loading-Status
// pro Vertrag oben sichtbar (✓/⏳/❌).
//
// Wichtig: ContractAnalysis wird IMMER nur 1× gleichzeitig gemountet
// (key={currentFile.id} garantiert Re-Mount bei Index-Wechsel). Verhindert
// Memory-/Navigation-Race-Conditions bei 5 parallel gemounteten 1818-LOC-
// Komponenten (Audit-Befund Agent 2).
import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  ChevronLeft, ChevronRight, CheckCircle, Loader2,
  AlertCircle, Copy, FileText, RefreshCw
} from "lucide-react";
import styles from "./MultiUploadResultNavigator.module.css";
import ContractAnalysis from "./ContractAnalysisSwitch";

interface UploadFileItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'analyzing' | 'completed' | 'error' | 'duplicate';
  progress: number;
  analyzed?: boolean;
  result?: {
    success: boolean;
    contractScore?: number;
    summary?: string;
    legalAssessment?: string;
    suggestions?: string;
    comparison?: string;
    analysisId?: string;
    requestId?: string;
    message?: string;
    duplicate?: boolean;
    contractId?: string;
    usage?: { count: number; limit: number; plan: string };
    analysisData?: {
      kuendigung?: string;
      laufzeit?: string;
      expiryDate?: string;
      status?: string;
      risiken?: string[];
      optimierungen?: string[];
    };
  };
  error?: string;
}

interface MultiUploadResultNavigatorProps {
  uploadFiles: UploadFileItem[];
  onReset: () => void;
}

function shortFileName(name: string, max = 30): string {
  if (!name) return '—';
  if (name.length <= max) return name;
  const ext = name.split('.').pop() || '';
  const base = name.slice(0, max - ext.length - 4);
  return `${base}…${ext ? '.' + ext : ''}`;
}

function getStatusIcon(status: UploadFileItem['status']) {
  switch (status) {
    case 'completed':
      return <CheckCircle size={14} className={styles.statusIconDone} />;
    case 'analyzing':
    case 'uploading':
      return <Loader2 size={14} className={styles.statusIconLoading} />;
    case 'error':
      return <AlertCircle size={14} className={styles.statusIconError} />;
    case 'duplicate':
      return <Copy size={14} className={styles.statusIconDuplicate} />;
    case 'pending':
    default:
      return <FileText size={14} className={styles.statusIconPending} />;
  }
}

function getStatusLabel(status: UploadFileItem['status']): string {
  switch (status) {
    case 'completed': return 'Fertig';
    case 'analyzing': return 'Analyse läuft';
    case 'uploading': return 'Wird hochgeladen';
    case 'error': return 'Fehler';
    case 'duplicate': return 'Duplikat';
    case 'pending': return 'Wartet';
    default: return '';
  }
}

export default function MultiUploadResultNavigator({ uploadFiles, onReset }: MultiUploadResultNavigatorProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // ⚠️ Alle Hooks MÜSSEN vor jeglichem early-return aufgerufen werden
  // (react-hooks/rules-of-hooks). Daher Summary unconditional berechnen.
  const summary = useMemo(() => {
    const done = uploadFiles.filter(f => f.status === 'completed').length;
    const analyzing = uploadFiles.filter(f => f.status === 'analyzing' || f.status === 'uploading').length;
    const failed = uploadFiles.filter(f => f.status === 'error').length;
    const duplicate = uploadFiles.filter(f => f.status === 'duplicate').length;
    return { done, analyzing, failed, duplicate, total: uploadFiles.length };
  }, [uploadFiles]);

  // Single-Upload: zeige direkt die normale ContractAnalysis (wie bisher beim BatchAnalysisResults)
  if (uploadFiles.length === 1) {
    const onlyFile = uploadFiles[0];
    if (onlyFile.status === 'completed' && onlyFile.result?.success) {
      return (
        <div className={styles.singleContainer}>
          <ContractAnalysis
            file={onlyFile.file}
            onReset={onReset}
            initialResult={onlyFile.result}
          />
        </div>
      );
    }
    // Single-Upload + nicht erfolgreich → nichts rendern (Parent zeigt Status-View)
    return null;
  }

  // Multi-Upload: Navigator-View
  // currentIndex clampen falls Array sich verändert hat
  const safeIndex = Math.min(currentIndex, uploadFiles.length - 1);
  const currentFile = uploadFiles[safeIndex];

  const goPrev = () => setCurrentIndex(i => Math.max(0, i - 1));
  const goNext = () => setCurrentIndex(i => Math.min(uploadFiles.length - 1, i + 1));

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Header mit Gesamt-Status */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>
            Mehrere Verträge analysiert
          </h2>
          <div className={styles.summary}>
            {summary.done > 0 && <span className={styles.summaryItem}>✓ {summary.done} fertig</span>}
            {summary.analyzing > 0 && <span className={styles.summaryItem}>⏳ {summary.analyzing} läuft</span>}
            {summary.duplicate > 0 && <span className={styles.summaryItem}>📋 {summary.duplicate} Duplikat</span>}
            {summary.failed > 0 && <span className={styles.summaryItemError}>✕ {summary.failed} Fehler</span>}
          </div>
        </div>
        <button className={styles.resetButton} onClick={onReset} title="Neue Analyse starten">
          <RefreshCw size={14} /> Neu starten
        </button>
      </div>

      {/* Status-Streifen — alle Verträge mit Status */}
      <div className={styles.statusStrip} role="tablist" aria-label="Vertrags-Liste">
        {uploadFiles.map((file, idx) => {
          const isActive = idx === safeIndex;
          return (
            <button
              key={file.id}
              role="tab"
              aria-selected={isActive}
              className={`${styles.statusChip} ${isActive ? styles.statusChipActive : ''} ${styles[`status_${file.status}`] || ''}`}
              onClick={() => setCurrentIndex(idx)}
              title={`${file.file.name} — ${getStatusLabel(file.status)}`}
            >
              <span className={styles.chipNumber}>{idx + 1}</span>
              {getStatusIcon(file.status)}
              <span className={styles.chipFilename}>{shortFileName(file.file.name, 20)}</span>
            </button>
          );
        })}
      </div>

      {/* Navigation: Prev/Next + "X von N" */}
      <div className={styles.navBar}>
        <button
          className={styles.navButton}
          onClick={goPrev}
          disabled={safeIndex === 0}
          aria-label="Vorheriger Vertrag"
        >
          <ChevronLeft size={18} /> Vorheriger
        </button>
        <div className={styles.navCenter}>
          <span className={styles.navIndex}>
            {safeIndex + 1} <span className={styles.navIndexSep}>von</span> {uploadFiles.length}
          </span>
          <span className={styles.navFilename}>{shortFileName(currentFile.file.name, 50)}</span>
        </div>
        <button
          className={styles.navButton}
          onClick={goNext}
          disabled={safeIndex === uploadFiles.length - 1}
          aria-label="Nächster Vertrag"
        >
          Nächster <ChevronRight size={18} />
        </button>
      </div>

      {/* Body: aktueller Vertrag — IMMER nur 1× gemountet via key={file.id} */}
      <div className={styles.body} key={currentFile.id}>
        {currentFile.status === 'completed' && currentFile.result?.success ? (
          <ContractAnalysis
            file={currentFile.file}
            onReset={onReset}
            initialResult={currentFile.result}
          />
        ) : currentFile.status === 'analyzing' || currentFile.status === 'uploading' ? (
          <div className={styles.placeholder}>
            <Loader2 className={styles.placeholderSpinner} size={48} />
            <h3>Analyse läuft…</h3>
            <p>
              {currentFile.status === 'uploading' ? 'Vertrag wird hochgeladen.' : 'KI analysiert den Vertrag.'}
              {' '}
              Du kannst inzwischen einen anderen bereits fertigen Vertrag oben in der Liste anklicken.
            </p>
            {currentFile.progress > 0 && (
              <div className={styles.placeholderProgress}>
                <div className={styles.placeholderProgressBar} style={{ width: `${Math.min(99, currentFile.progress)}%` }} />
              </div>
            )}
          </div>
        ) : currentFile.status === 'duplicate' ? (
          <div className={styles.placeholder}>
            <Copy className={styles.placeholderIconWarn} size={48} />
            <h3>Bereits hochgeladen</h3>
            <p>{currentFile.result?.message || 'Dieser Vertrag wurde schon einmal analysiert.'}</p>
            {currentFile.result?.contractId && (
              <a className={styles.placeholderLink} href={`/contracts/${currentFile.result.contractId}`}>
                Vorhandene Analyse öffnen →
              </a>
            )}
          </div>
        ) : currentFile.status === 'error' ? (
          <div className={styles.placeholder}>
            <AlertCircle className={styles.placeholderIconError} size={48} />
            <h3>Analyse fehlgeschlagen</h3>
            <p>{currentFile.error || 'Es ist ein Fehler aufgetreten. Bitte versuche es erneut.'}</p>
          </div>
        ) : (
          <div className={styles.placeholder}>
            <FileText className={styles.placeholderIconPending} size={48} />
            <h3>Wartet auf Analyse</h3>
            <p>Sobald die vorherigen Verträge fertig sind, startet dieser hier.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
