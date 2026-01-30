/**
 * DocumentScanner
 *
 * Haupt-Modal für die Dokument-Scan-Funktion.
 * State Machine: capturing → adjusting → reviewing → processing → done
 *
 * Full-Screen Overlay mit AnimatePresence.
 */

import React, { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertTriangle, FileText, CheckCircle } from "lucide-react";
import CameraView from "./CameraView";
import CornerAdjustment from "./CornerAdjustment";
import PagePreview from "./PagePreview";
import BatchManager from "./BatchManager";
import { useBatchPages } from "./hooks/useBatchPages";
import { useOpenCV } from "./hooks/useOpenCV";
import { applyPerspectiveCorrection } from "./utils/perspectiveCorrection";
import type { DetectedEdges, Point } from "./utils/imageProcessing";
import type { CaptureResult } from "./hooks/useCamera";
import styles from "./DocumentScanner.module.css";

export interface DocumentScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (file: File) => void;
  maxPages?: number;
  enableOCR?: boolean;
}

type ScannerState = "capturing" | "adjusting" | "reviewing" | "processing" | "done" | "error";

const API_BASE = import.meta.env.VITE_API_URL || "";

const DocumentScanner: React.FC<DocumentScannerProps> = ({
  isOpen,
  onClose,
  onComplete,
  maxPages = 50,
  enableOCR = true,
}) => {
  const [scannerState, setScannerState] = useState<ScannerState>("capturing");
  const [processingProgress, setProcessingProgress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isCorrectingPerspective, setIsCorrectingPerspective] = useState(false);
  const lastCapturedEdgesRef = useRef<DetectedEdges | null>(null);

  const { cv } = useOpenCV();

  const {
    pages,
    activePage,
    addPage,
    removePage,
    updatePageCorners,
    updatePageRotation,
    updateCorrectedImage,
    setActivePage,
    clearPages,
    pageCount,
  } = useBatchPages(maxPages);

  // Foto aufgenommen → zur Ecken-Anpassung wechseln
  const handleCapture = useCallback(
    (capture: CaptureResult, edges: DetectedEdges | null) => {
      lastCapturedEdgesRef.current = edges;
      addPage(capture.blob, capture.dataUrl, edges?.corners || null);
      setScannerState("adjusting");
    },
    [addPage]
  );

  // Ecken bestätigt → Perspektiv-Korrektur → Review
  const handleCornersConfirmed = useCallback(
    async (corners: Point[]) => {
      const pageIndex = pages.length - 1;
      if (pageIndex < 0) return;

      updatePageCorners(pageIndex, corners);

      // Perspektiv-Korrektur anwenden wenn OpenCV verfügbar
      if (cv) {
        setIsCorrectingPerspective(true);
        try {
          const correctedBlob = await applyPerspectiveCorrection(
            pages[pageIndex].imageBlob,
            corners,
            cv
          );
          updateCorrectedImage(pageIndex, correctedBlob);
        } catch (err) {
          console.warn("[Scanner] Perspective correction failed:", err);
          // Fallback: Original-Bild beibehalten
        } finally {
          setIsCorrectingPerspective(false);
        }
      }

      setScannerState("reviewing");
    },
    [pages, cv, updatePageCorners, updateCorrectedImage]
  );

  // Retake aus Corner-Adjustment
  const handleRetakeFromAdjust = useCallback(() => {
    if (pages.length > 0) {
      removePage(pages.length - 1);
    }
    setScannerState("capturing");
  }, [pages.length, removePage]);

  // Seite bestätigt in Review → zurück zur Kamera
  const handleConfirmPage = useCallback(() => {
    setScannerState("capturing");
  }, []);

  // Seite wiederholen aus Review → entfernen und zurück zur Kamera
  const handleRetakePage = useCallback(() => {
    if (pages.length > 0) {
      removePage(pages.length - 1);
    }
    setScannerState("capturing");
  }, [pages.length, removePage]);

  // Zurück zu Ecken-Anpassung aus Review
  const handleAdjustCorners = useCallback(() => {
    setScannerState("adjusting");
  }, []);

  // Weitere Seite aus BatchManager
  const handleAddPage = useCallback(() => {
    setScannerState("capturing");
  }, []);

  // Seite in BatchManager auswählen → Review
  const handleSelectPage = useCallback(
    (index: number) => {
      setActivePage(index);
      setScannerState("reviewing");
    },
    [setActivePage]
  );

  // Fertig → PDF generieren
  const handleFinish = useCallback(async () => {
    if (pageCount === 0) return;

    setScannerState("processing");
    setProcessingProgress("Bilder werden verarbeitet...");
    setError(null);

    try {
      const formData = new FormData();

      // Bilder hinzufügen (korrigiert wenn verfügbar, sonst original)
      for (let i = 0; i < pages.length; i++) {
        const blob = pages[i].correctedBlob || pages[i].imageBlob;
        formData.append("images", blob, `scan_${i + 1}.jpg`);
      }

      // Corners + Options
      const cornersArray = pages.map((p) => p.corners || []);
      formData.append("corners", JSON.stringify(cornersArray));

      const options = {
        rotations: pages.map((p) => p.rotation),
        enhance: true,
        enableOCR,
      };
      formData.append("options", JSON.stringify(options));

      setProcessingProgress(`${pageCount} Seiten werden verarbeitet...`);

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_BASE}/api/scanner/process`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server-Fehler: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Verarbeitung fehlgeschlagen");
      }

      setProcessingProgress("PDF wird erstellt...");

      // PDF als File-Objekt erzeugen
      let pdfBlob: Blob;
      if (result.pdfBase64) {
        const binary = atob(result.pdfBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        pdfBlob = new Blob([bytes], { type: "application/pdf" });
      } else if (result.pdfUrl) {
        const pdfResponse = await fetch(result.pdfUrl);
        pdfBlob = await pdfResponse.blob();
      } else {
        throw new Error("Kein PDF in der Antwort");
      }

      const pdfFile = new File(
        [pdfBlob],
        `scan_${new Date().toISOString().slice(0, 10)}_${pageCount}s.pdf`,
        { type: "application/pdf" }
      );

      setScannerState("done");
      setProcessingProgress(
        result.ocrApplied
          ? `PDF mit ${pageCount} Seiten erstellt (mit Textlayer)`
          : `PDF mit ${pageCount} Seiten erstellt`
      );

      setTimeout(() => {
        onComplete(pdfFile);
        handleClose();
      }, 1200);
    } catch (err: unknown) {
      console.error("[Scanner] Processing Error:", err);
      setError(err instanceof Error ? err.message : "Verarbeitung fehlgeschlagen");
      setScannerState("error");
    }
  }, [pageCount, pages, enableOCR, onComplete]);

  const handleClose = useCallback(() => {
    clearPages();
    setScannerState("capturing");
    setError(null);
    setProcessingProgress("");
    onClose();
  }, [clearPages, onClose]);

  const handleRetry = useCallback(() => {
    setError(null);
    setScannerState("capturing");
  }, []);

  if (!isOpen) return null;

  const safeActivePage = Math.min(activePage, Math.max(0, pages.length - 1));

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className={styles.scannerModal}>
            {/* CAPTURING STATE */}
            {scannerState === "capturing" && (
              <CameraView
                onCapture={handleCapture}
                onClose={handleClose}
                pageCount={pageCount}
                maxPages={maxPages}
                onFinish={handleFinish}
              />
            )}

            {/* ADJUSTING STATE — Ecken-Anpassung */}
            {scannerState === "adjusting" && pages.length > 0 && (
              <>
                {isCorrectingPerspective ? (
                  <div className={styles.statusContainer}>
                    <Loader2 size={48} className={styles.spinner} />
                    <p className={styles.statusText}>Perspektive wird korrigiert...</p>
                  </div>
                ) : (
                  <CornerAdjustment
                    imageUrl={pages[safeActivePage]?.previewDataUrl || ""}
                    initialCorners={pages[safeActivePage]?.corners || null}
                    onConfirm={handleCornersConfirmed}
                    onRetake={handleRetakeFromAdjust}
                  />
                )}
              </>
            )}

            {/* REVIEWING STATE */}
            {scannerState === "reviewing" && pages.length > 0 && (
              <div className={styles.reviewContainer}>
                <PagePreview
                  page={pages[safeActivePage]}
                  onRotate={(deg) => updatePageRotation(safeActivePage, deg)}
                  onRetake={handleRetakePage}
                  onConfirm={handleConfirmPage}
                  onAdjustCorners={handleAdjustCorners}
                />

                <BatchManager
                  pages={pages}
                  activePage={activePage}
                  onSelectPage={handleSelectPage}
                  onRemovePage={removePage}
                  onAddPage={handleAddPage}
                  maxPages={maxPages}
                />

                <div className={styles.reviewFooter}>
                  <button
                    className={styles.finishBtnLarge}
                    onClick={handleFinish}
                    disabled={pageCount === 0}
                  >
                    <FileText size={20} />
                    PDF erstellen ({pageCount} {pageCount === 1 ? "Seite" : "Seiten"})
                  </button>
                </div>
              </div>
            )}

            {/* PROCESSING STATE */}
            {scannerState === "processing" && (
              <div className={styles.statusContainer}>
                <Loader2 size={48} className={styles.spinner} />
                <p className={styles.statusText}>{processingProgress}</p>
              </div>
            )}

            {/* DONE STATE */}
            {scannerState === "done" && (
              <div className={styles.statusContainer}>
                <CheckCircle size={48} className={styles.successIcon} />
                <p className={styles.statusText}>{processingProgress}</p>
              </div>
            )}

            {/* ERROR STATE */}
            {scannerState === "error" && (
              <div className={styles.statusContainer}>
                <AlertTriangle size={48} className={styles.errorIcon} />
                <p className={styles.statusText}>{error}</p>
                <div className={styles.errorActions}>
                  <button className={styles.retryBtn} onClick={handleRetry}>
                    Erneut versuchen
                  </button>
                  <button className={styles.cancelBtn} onClick={handleClose}>
                    Abbrechen
                  </button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DocumentScanner;
