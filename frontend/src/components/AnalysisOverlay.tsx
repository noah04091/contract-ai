// 📁 src/components/AnalysisOverlay.tsx
// Premium Analyse-Overlay mit PDF-Vorschau & Lupen-Animation

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search } from 'lucide-react';
import { Document, Page } from 'react-pdf';
import styles from './AnalysisOverlay.module.css';

interface AnalysisOverlayProps {
  show: boolean;
  contractName: string;
  progress: number;          // 0-100
  currentStep?: string;
  pdfFile?: File;
}

const STEPS = [
  { id: 'upload', label: 'Upload', threshold: 0 },
  { id: 'type', label: 'Typ erkennen', threshold: 15 },
  { id: 'gaps', label: 'Analyse', threshold: 35 },
  { id: 'ai', label: 'KI-Optimierung', threshold: 55 },
  { id: 'qc', label: 'Qualitätscheck', threshold: 85 },
  { id: 'done', label: 'Fertig', threshold: 100 },
];

function getCurrentStep(progress: number): string {
  for (let i = STEPS.length - 1; i >= 0; i--) {
    if (progress >= STEPS[i].threshold) {
      return STEPS[i].label;
    }
  }
  return STEPS[0].label;
}

export default function AnalysisOverlay({ show, contractName, progress, currentStep, pdfFile }: AnalysisOverlayProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Create blob URL for PDF preview
  useEffect(() => {
    if (pdfFile && show) {
      const url = URL.createObjectURL(pdfFile);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPdfUrl(null);
    }
  }, [pdfFile, show]);

  const stepLabel = currentStep || getCurrentStep(progress);

  // Placeholder lines for when no PDF is available
  const placeholderLines = useMemo(() => [
    { width: '85%', top: '8%' },
    { width: '92%', top: '13%' },
    { width: '70%', top: '18%' },
    { width: '88%', top: '25%' },
    { width: '95%', top: '30%' },
    { width: '60%', top: '35%' },
    { width: '90%', top: '42%' },
    { width: '78%', top: '47%' },
    { width: '85%', top: '52%' },
    { width: '65%', top: '59%' },
    { width: '92%', top: '64%' },
    { width: '75%', top: '69%' },
    { width: '88%', top: '76%' },
    { width: '50%', top: '81%' },
  ], []);

  if (!show) return null;

  return createPortal(
    <div className={styles.backdrop}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <h3 className={styles.title}>Vertrag wird analysiert</h3>
          <p className={styles.contractName}>{contractName}</p>
        </div>

        {/* DIN A4 PDF Frame */}
        <div className={styles.pdfFrame}>
          {/* PDF or Placeholder */}
          <div className={styles.pdfContent}>
            {pdfUrl ? (
              <Document file={pdfUrl} loading={null} error={null}>
                <Page
                  pageNumber={1}
                  width={280}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                />
              </Document>
            ) : (
              <div className={styles.placeholder}>
                {placeholderLines.map((line, i) => (
                  <div
                    key={i}
                    className={styles.placeholderLine}
                    style={{ width: line.width, top: line.top }}
                  />
                ))}
              </div>
            )}
            {/* White overlay to keep magnifiers visible */}
            <div className={styles.pdfOverlay} />
          </div>

          {/* Scan line */}
          <div className={styles.scanLine} />

          {/* Magnifying glasses */}
          <div className={styles.magnifier1}>
            <Search size={48} />
          </div>
          <div className={styles.magnifier2}>
            <Search size={36} />
          </div>
          <div className={styles.magnifier3}>
            <Search size={42} />
          </div>
        </div>

        {/* Progress Section */}
        <div className={styles.progressSection}>
          <div className={styles.progressRow}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className={styles.progressPercent}>{progress}%</span>
          </div>
          <p className={styles.stepLabel}>{stepLabel}</p>
          <p className={styles.hint}>
            Die KI analysiert Ihren Vertrag. Dies kann bis zu 30 Sekunden dauern.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
