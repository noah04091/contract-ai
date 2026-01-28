/**
 * useDocumentScanner Hook
 *
 * Shared Hook für die Integration des Document Scanners
 * in alle Upload-Seiten.
 *
 * Usage:
 * ```tsx
 * const { openScanner, ScannerModal } = useDocumentScanner((file) => {
 *   handleUploadFiles([file]);
 * });
 *
 * // Im JSX:
 * <button onClick={openScanner}>Scannen</button>
 * {ScannerModal}
 * ```
 */

import React, { useState, useCallback, useMemo } from "react";
import { DocumentScanner } from "../components/DocumentScanner";

interface UseDocumentScannerOptions {
  maxPages?: number;
  enableOCR?: boolean;
}

interface UseDocumentScannerReturn {
  /** Scanner öffnen */
  openScanner: () => void;
  /** Scanner schließen */
  closeScanner: () => void;
  /** Ob der Scanner geöffnet ist */
  isScannerOpen: boolean;
  /** Scanner Modal JSX — in den Render-Tree einfügen */
  ScannerModal: React.ReactNode;
  /** Ob die Kamera-API verfügbar ist (grobe Prüfung) */
  isScannerSupported: boolean;
}

export function useDocumentScanner(
  onScanComplete: (file: File) => void,
  options: UseDocumentScannerOptions = {}
): UseDocumentScannerReturn {
  const { maxPages = 50, enableOCR = true } = options;
  const [isOpen, setIsOpen] = useState(false);

  const openScanner = useCallback(() => setIsOpen(true), []);
  const closeScanner = useCallback(() => setIsOpen(false), []);

  const handleComplete = useCallback(
    (file: File) => {
      setIsOpen(false);
      onScanComplete(file);
    },
    [onScanComplete]
  );

  // Grobe Prüfung ob Kamera möglich ist (Desktop + Mobile)
  const isScannerSupported = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    // getUserMedia ODER <input capture> (Mobile)
    return !!(navigator.mediaDevices?.getUserMedia) || /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
  }, []);

  const ScannerModal = useMemo(
    () => (
      <DocumentScanner
        isOpen={isOpen}
        onClose={closeScanner}
        onComplete={handleComplete}
        maxPages={maxPages}
        enableOCR={enableOCR}
      />
    ),
    [isOpen, closeScanner, handleComplete, maxPages, enableOCR]
  );

  return {
    openScanner,
    closeScanner,
    isScannerOpen: isOpen,
    ScannerModal,
    isScannerSupported,
  };
}
