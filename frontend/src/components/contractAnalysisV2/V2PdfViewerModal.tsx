import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FileText, X } from "lucide-react";
import styles from "./V2PdfViewerModal.module.css";

// Vollbild-Modal zur Vorschau der hochgeladenen Original-PDF.
// Nutzt /api/s3/view?contractId=X&type=original — Backend liefert eine
// signed S3-URL (24h Lifetime), die im iframe angezeigt wird. Browser
// rendert PDF nativ inkl. eigener Toolbar (Zoom/Print/Download).
//
// Bewusst KEIN react-pdf — iframe ist robuster, leichter und der
// User-Wunsch ist eine vollwertige Vorschau, nicht selbst gerendertes PDF.

interface Props {
  contractId: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function V2PdfViewerModal({ contractId, fileName, isOpen, onClose }: Props) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ESC schließt das Modal.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // PDF-URL holen, sobald Modal öffnet.
  useEffect(() => {
    if (!isOpen || !contractId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPdfUrl(null);
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          `/api/s3/view?contractId=${encodeURIComponent(contractId)}&type=original`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            credentials: "include",
          }
        );
        if (!res.ok) {
          let serverMsg = "";
          try {
            const data = await res.json();
            serverMsg = data?.error || data?.message || "";
          } catch {
            /* non-json body */
          }
          throw new Error(serverMsg || `Server antwortete mit Status ${res.status}`);
        }
        const data = await res.json();
        const url = data.fileUrl || data.url;
        if (!url) throw new Error("Keine PDF-URL erhalten");
        if (!cancelled) setPdfUrl(url);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Unbekannter Fehler");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, contractId]);

  // Body-Scroll-Lock, damit der Hintergrund nicht mitscrollt.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  // Säubere Filename: entferne Unix-Timestamp-Präfix wie "1775294941492-",
  // die der Backend-Upload anhängt, damit der User den lesbaren Dateinamen sieht.
  const displayName = fileName.replace(/^\d{10,}[-_]/, "");

  // Render via Portal direkt unter document.body. Damit liegt das Modal
  // außerhalb aller App-Container-Stacking-Contexts (z.B. transform-/filter-
  // basierte Stacking-Contexts) und überdeckt zuverlässig die globale Navbar.
  return createPortal(
    <div
      className={styles.backdrop}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="PDF-Vorschau"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <FileText size={16} color="#2563eb" aria-hidden="true" />
            <span className={styles.title}>{displayName}</span>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="PDF-Vorschau schließen"
          >
            <X size={18} color="#475569" aria-hidden="true" />
          </button>
        </div>
        <div className={styles.body}>
          {loading && (
            <div className={styles.stateCenter}>
              <div className={styles.spinner} aria-hidden="true" />
              <div>PDF wird geladen…</div>
            </div>
          )}
          {error && !loading && (
            <div className={styles.stateCenter}>
              <div className={styles.errorTitle}>PDF konnte nicht geladen werden</div>
              <div className={styles.errorHint}>{error}</div>
            </div>
          )}
          {pdfUrl && !loading && !error && (
            <iframe
              src={pdfUrl}
              className={styles.iframe}
              title={`PDF-Vorschau: ${fileName}`}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
