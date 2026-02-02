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

/** Max pixel dimension for images before upload (saves bandwidth on mobile) */
const UPLOAD_MAX_DIM = 2000;
const UPLOAD_JPEG_QUALITY = 0.85;

/**
 * Compress a Blob image to max UPLOAD_MAX_DIM px and JPEG quality before upload.
 * Returns original if already small enough or if compression fails.
 */
async function compressForUpload(blob: Blob): Promise<Blob> {
  // Skip tiny images (already compressed or preview-only)
  if (blob.size < 200_000) return blob;

  try {
    const bmp = await createImageBitmap(blob);
    const { width, height } = bmp;

    // Already within limits and small enough — skip
    if (width <= UPLOAD_MAX_DIM && height <= UPLOAD_MAX_DIM && blob.size < 1_500_000) {
      bmp.close();
      return blob;
    }

    // Calculate scale to fit within UPLOAD_MAX_DIM
    const scale = Math.min(1, UPLOAD_MAX_DIM / Math.max(width, height));
    const outW = Math.round(width * scale);
    const outH = Math.round(height * scale);

    const canvas = new OffscreenCanvas(outW, outH);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bmp.close();
      return blob;
    }

    ctx.drawImage(bmp, 0, 0, outW, outH);
    bmp.close();

    const compressed = await canvas.convertToBlob({ type: "image/jpeg", quality: UPLOAD_JPEG_QUALITY });

    // Only use compressed if it's actually smaller
    if (compressed.size < blob.size) {
      return compressed;
    }
    return blob;
  } catch {
    // OffscreenCanvas not supported (older browsers) — use original
    return blob;
  }
}

export interface DocumentScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (file: File) => void;
  maxPages?: number;
  enableOCR?: boolean;
}

type ScannerState = "capturing" | "adjusting" | "correcting" | "reviewing" | "processing" | "done" | "error";

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
  // isCorrecting no longer needed - correction completes before review renders
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

  // Ecken bestätigt → Korrektur abwarten → dann erst Review zeigen
  const handleCornersConfirmed = useCallback(
    async (corners: Point[]) => {
      const pageIndex = Math.min(activePage, Math.max(0, pages.length - 1));
      if (pageIndex < 0 || pages.length === 0) return;

      updatePageCorners(pageIndex, corners);

      // Lade-Screen zeigen während Korrektur läuft
      setScannerState("correcting");
      setProcessingProgress("Dokument wird zugeschnitten...");

      const imageUrl = pages[pageIndex].previewDataUrl;
      try {
        if (!imageUrl || imageUrl.length < 100) {
          throw new Error(`previewDataUrl ungültig (Länge: ${imageUrl?.length || 0})`);
        }
        console.log("[Scanner] Starte Perspektiv-Korrektur, corners:", JSON.stringify(corners));
        const blob = await applyPerspectiveCrop(imageUrl, corners);
        if (!blob || blob.size === 0) {
          throw new Error("Korrektur lieferte leeren Blob");
        }

        // Blob → DataURL konvertieren (zuverlässiger als Blob-URL)
        const correctedDataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error("FileReader fehlgeschlagen"));
          reader.readAsDataURL(blob);
        });

        console.log("[Scanner] Korrektur erfolgreich:", Math.round(blob.size / 1024), "KB, DataURL Länge:", correctedDataUrl.length);
        setProcessingProgress(`Korrektur erfolgreich (${Math.round(blob.size / 1024)}KB)`);
        updateCorrectedImage(pageIndex, blob, correctedDataUrl);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error("[Scanner] Perspektiv-Korrektur fehlgeschlagen:", errMsg);
        setProcessingProgress(`Korrektur fehlgeschlagen: ${errMsg}`);
        // Warte kurz damit User die Fehlermeldung sehen kann
        await new Promise((r) => setTimeout(r, 2000));
      }

      // ERST JETZT zur Review wechseln (korrigiertes Bild ist bereits im State)
      setScannerState("reviewing");
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

  const [uploadProgress, setUploadProgress] = useState(0); // 0-100

  // Fertig → PDF generieren
  const handleFinish = useCallback(async () => {
    if (pageCount === 0) return;

    setScannerState("processing");
    setProcessingProgress("Bilder werden vorbereitet...");
    setUploadProgress(0);
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

      // Bilder komprimieren und ans Backend senden
      let validCount = 0;
      for (let i = 0; i < pages.length; i++) {
        const rawBlob = pages[i].correctedBlob || pages[i].imageBlob;
        if (!rawBlob || rawBlob.size === 0) {
          console.warn(`[Scanner] Seite ${i + 1} übersprungen (leerer Blob)`);
          continue;
        }
        setProcessingProgress(`Bild ${i + 1}/${pages.length} wird komprimiert...`);
        const blob = await compressForUpload(rawBlob);
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

      // Upload mit XMLHttpRequest für echtes Progress-Tracking + Retry
      const token = localStorage.getItem("token");
      const MAX_RETRIES = 2;

      const doUpload = (): Promise<{ status: number; body: string }> =>
        new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", `${API_BASE}/api/scanner/process`);
          if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const pct = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(pct);
              setProcessingProgress(
                pct < 100
                  ? `Hochladen... ${pct}%`
                  : "Server verarbeitet..."
              );
            }
          };

          xhr.onload = () => resolve({ status: xhr.status, body: xhr.responseText });
          xhr.onerror = () => reject(new Error("network"));
          xhr.ontimeout = () => reject(new Error("timeout"));
          xhr.timeout = 120_000;
          xhr.send(formData);
        });

      let lastResult: { status: number; body: string } | null = null;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          lastResult = await doUpload();

          if (lastResult.status === 408 || lastResult.status === 429 || lastResult.status === 503) {
            if (attempt < MAX_RETRIES) {
              const waitMs = (attempt + 1) * 2000;
              setProcessingProgress(`Server beschäftigt — neuer Versuch in ${waitMs / 1000}s...`);
              setUploadProgress(0);
              await new Promise((r) => setTimeout(r, waitMs));
              continue;
            }
          }
          break;
        } catch {
          if (attempt < MAX_RETRIES) {
            setProcessingProgress("Netzwerkfehler — neuer Versuch...");
            setUploadProgress(0);
            await new Promise((r) => setTimeout(r, 2000));
            continue;
          }
          throw new Error("Netzwerkfehler — bitte Verbindung prüfen");
        }
      }

      if (!lastResult || lastResult.status < 200 || lastResult.status >= 300) {
        let errMsg = `Server-Fehler: ${lastResult?.status}`;
        try {
          const errData = JSON.parse(lastResult?.body || "{}");
          if (errData.error) errMsg = errData.error;
        } catch { /* ignore parse error */ }
        throw new Error(errMsg);
      }

      setProcessingProgress("PDF wird erstellt...");
      setUploadProgress(100);
      const result = JSON.parse(lastResult.body);

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

            {/* CORRECTING STATE — Perspektiv-Korrektur läuft */}
            {scannerState === "correcting" && (
              <div className={styles.statusContainer}>
                <Loader2 size={48} className={styles.spinner} />
                <p className={styles.statusText}>{processingProgress || "Dokument wird zugeschnitten..."}</p>
              </div>
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
                  isCorrecting={false}
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
                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className={styles.progressBarOuter}>
                    <div
                      className={styles.progressBarInner}
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
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
