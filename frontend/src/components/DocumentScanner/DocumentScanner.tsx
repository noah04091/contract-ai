/**
 * DocumentScanner
 *
 * Haupt-Modal für die Dokument-Scan-Funktion.
 * State Machine: capturing → adjusting → reviewing → processing → done
 *
 * Full-Screen Overlay mit AnimatePresence.
 */

import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, AlertTriangle, FileText, CheckCircle } from "lucide-react";
import CameraView from "./CameraView";
import CornerAdjustment from "./CornerAdjustment";
import PagePreview from "./PagePreview";
import BatchManager from "./BatchManager";
import { useBatchPages } from "./hooks/useBatchPages";
import type { Point } from "./types";
import type { CaptureResult } from "./hooks/useCamera";
import { applyPerspectiveCrop } from "./utils/perspectiveTransform";
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
    (capture: CaptureResult) => {
      addPage(capture.blob, capture.previewBlob, capture.dataUrl, capture.detectedCorners || null);
      setScannerState("adjusting");
    },
    [addPage]
  );

  // Ecken bestätigt → Review + Perspektiv-Korrektur im Hintergrund
  const handleCornersConfirmed = useCallback(
    (corners: Point[]) => {
      const pageIndex = Math.min(activePage, Math.max(0, pages.length - 1));
      if (pageIndex < 0 || pages.length === 0) return;

      updatePageCorners(pageIndex, corners);
      setScannerState("reviewing");

      // Perspektiv-Korrektur im Hintergrund (non-blocking)
      const imageUrl = pages[pageIndex].previewDataUrl;
      applyPerspectiveCrop(imageUrl, corners)
        .then((blob) => {
          updateCorrectedImage(pageIndex, blob);
        })
        .catch((err) => {
          console.warn("[Scanner] Perspektiv-Korrektur fehlgeschlagen:", err);
        });
    },
    [pages, activePage, updatePageCorners, updateCorrectedImage]
  );

  // Retake aus Corner-Adjustment
  const handleRetakeFromAdjust = useCallback(() => {
    const pageIndex = Math.min(activePage, Math.max(0, pages.length - 1));
    if (pages.length > 0) {
      removePage(pageIndex);
    }
    setScannerState("capturing");
  }, [pages.length, activePage, removePage]);

  // Seite bestätigt in Review → zurück zur Kamera
  const handleConfirmPage = useCallback(() => {
    setScannerState("capturing");
  }, []);

  // Seite wiederholen aus Review → entfernen und zurück zur Kamera
  const handleRetakePage = useCallback(() => {
    const pageIndex = Math.min(activePage, Math.max(0, pages.length - 1));
    if (pages.length > 0) {
      removePage(pageIndex);
    }
    setScannerState("capturing");
  }, [pages.length, activePage, removePage]);

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
    setProcessingProgress("Bilder werden vorbereitet...");
    setError(null);

    try {
      const formData = new FormData();

      // Corners validieren: nur gültige 4-Punkt-Arrays senden
      const cornersArray = pages.map((p) => {
        if (!p.corners || p.corners.length !== 4) return [];
        const valid = p.corners.every(
          (c) => typeof c.x === "number" && typeof c.y === "number" &&
                 c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1
        );
        return valid ? p.corners : [];
      });

      // Bilder ans Backend — correctedBlob bevorzugen (perspektiv-korrigiert),
      // Fallback auf imageBlob (Original) wenn keine Korrektur vorhanden
      let validCount = 0;
      for (let i = 0; i < pages.length; i++) {
        const blob = pages[i].correctedBlob || pages[i].imageBlob;
        if (!blob || blob.size === 0) {
          console.warn(`[Scanner] Seite ${i + 1} übersprungen (leerer Blob)`);
          continue;
        }
        formData.append("images", blob, `scan_${i + 1}.jpg`);
        // Wenn correctedBlob gesendet wird, sind Corners bereits angewendet → leere Corners senden
        if (pages[i].correctedBlob) {
          cornersArray[i] = [];
        }
        validCount++;
      }

      if (validCount === 0) {
        throw new Error("Keine gültigen Bilder zum Verarbeiten");
      }

      formData.append("corners", JSON.stringify(cornersArray));
      formData.append("options", JSON.stringify({
        rotations: pages.map((p) => p.rotation),
        enhance: true,
        enableOCR,
      }));

      setProcessingProgress(`${validCount} ${validCount === 1 ? "Seite wird" : "Seiten werden"} hochgeladen...`);

      // Fetch mit Retry bei transienten Fehlern (408, 429, 503, Netzwerk)
      const token = localStorage.getItem("token");
      const MAX_RETRIES = 2;
      let response: Response | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          response = await fetch(`${API_BASE}/api/scanner/process`, {
            method: "POST",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
          });

          // Bei transienten HTTP-Fehlern → Retry
          if (response.status === 408 || response.status === 429 || response.status === 503) {
            if (attempt < MAX_RETRIES) {
              const waitMs = (attempt + 1) * 2000; // 2s, 4s
              setProcessingProgress(`Server beschäftigt — neuer Versuch in ${waitMs / 1000}s...`);
              await new Promise((r) => setTimeout(r, waitMs));
              continue;
            }
          }
          break; // Erfolg oder nicht-transienter Fehler → kein Retry
        } catch (networkErr) {
          if (attempt < MAX_RETRIES) {
            setProcessingProgress(`Netzwerkfehler — neuer Versuch...`);
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          throw new Error("Netzwerkfehler — bitte Verbindung prüfen");
        }
      }

      if (!response || !response.ok) {
        const errData = await response?.json().catch(() => ({})) || {};
        throw new Error((errData as Record<string, string>).error || `Server-Fehler: ${response?.status}`);
      }

      setProcessingProgress("PDF wird erstellt...");
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Verarbeitung fehlgeschlagen");
      }

      // PDF als File-Objekt erzeugen
      let pdfBlob: Blob;
      if (result.pdfBase64) {
        try {
          const binary = atob(result.pdfBase64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          pdfBlob = new Blob([bytes], { type: "application/pdf" });
        } catch {
          throw new Error("PDF-Daten beschädigt");
        }
      } else if (result.pdfUrl) {
        const pdfResponse = await fetch(result.pdfUrl);
        if (!pdfResponse.ok) throw new Error("PDF konnte nicht heruntergeladen werden");
        pdfBlob = await pdfResponse.blob();
      } else {
        throw new Error("Kein PDF in der Antwort");
      }

      if (pdfBlob.size === 0) {
        throw new Error("PDF ist leer");
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
              <CornerAdjustment
                imageUrl={pages[safeActivePage]?.previewDataUrl || ""}
                initialCorners={pages[safeActivePage]?.corners || null}
                onConfirm={handleCornersConfirmed}
                onRetake={handleRetakeFromAdjust}
              />
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
