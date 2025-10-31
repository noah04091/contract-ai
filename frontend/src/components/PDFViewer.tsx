import { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { X, ZoomIn, ZoomOut, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import styles from "../styles/PDFViewer.module.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

interface Signer {
  email: string;
  name: string;
  role: string;
  order: number;
  status: "PENDING" | "SIGNED";
  signedAt?: string;
}

interface PDFViewerProps {
  pdfUrl: string;
  title: string;
  signers: Signer[];
  onClose: () => void;
}

export default function PDFViewer({ pdfUrl, title, signers, onClose }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.2, 2.0));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.2, 0.5));
  };

  const handleNextPage = () => {
    if (numPages && pageNumber < numPages) {
      setPageNumber((prev) => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (pageNumber > 1) {
      setPageNumber((prev) => prev - 1);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
      alert("Fehler beim Herunterladen der PDF");
    }
  };

  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose}>
        <motion.div
          className={styles.modal}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.titleSection}>
              <h2>{title}</h2>
              <p className={styles.subtitle}>
                Seite {pageNumber} von {numPages || "..."}
              </p>
            </div>
            <div className={styles.actions}>
              <button
                className={styles.actionBtn}
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                title="Verkleinern"
              >
                <ZoomOut size={20} />
              </button>
              <button
                className={styles.actionBtn}
                onClick={handleZoomIn}
                disabled={scale >= 2.0}
                title="Vergrößern"
              >
                <ZoomIn size={20} />
              </button>
              <span className={styles.zoomLevel}>{Math.round(scale * 100)}%</span>
              <button
                className={styles.actionBtn}
                onClick={handleDownload}
                title="Herunterladen"
              >
                <Download size={20} />
              </button>
              <button className={styles.closeBtn} onClick={onClose} title="Schließen">
                <X size={20} />
              </button>
            </div>
          </div>

          {/* PDF Content */}
          <div className={styles.content}>
            <div className={styles.pdfContainer}>
              <Document
                file={pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className={styles.loader}>
                    <div className={styles.spinner}></div>
                    <p>PDF wird geladen...</p>
                  </div>
                }
                error={
                  <div className={styles.error}>
                    <p>Fehler beim Laden der PDF</p>
                  </div>
                }
              >
                <Page
                  pageNumber={pageNumber}
                  scale={scale}
                  renderTextLayer={false}
                  renderAnnotationLayer={false}
                  className={styles.page}
                />
              </Document>

              {/* Signature Markers - Positioned on last page */}
              {numPages && pageNumber === numPages && (
                <div className={styles.signatureMarkers}>
                  {signers.map((signer, idx) => {
                    const yOffset = 150 + idx * 100; // Vertically stack signatures
                    return (
                      <div
                        key={idx}
                        className={`${styles.signatureMarker} ${
                          signer.status === "SIGNED" ? styles.signed : styles.pending
                        }`}
                        style={{
                          top: `${yOffset}px`,
                          left: "50%",
                          transform: "translateX(-50%)",
                        }}
                      >
                        <div className={styles.markerContent}>
                          <span className={styles.markerLabel}>
                            {signer.status === "SIGNED" ? "✓" : "○"}
                          </span>
                          <div className={styles.markerInfo}>
                            <strong>{signer.name}</strong>
                            <span>{signer.role}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Footer Navigation */}
          {numPages && numPages > 1 && (
            <div className={styles.footer}>
              <button
                className={styles.navBtn}
                onClick={handlePrevPage}
                disabled={pageNumber === 1}
              >
                <ChevronLeft size={20} />
                Vorherige
              </button>
              <span className={styles.pageInfo}>
                Seite {pageNumber} / {numPages}
              </span>
              <button
                className={styles.navBtn}
                onClick={handleNextPage}
                disabled={pageNumber === numPages}
              >
                Nächste
                <ChevronRight size={20} />
              </button>
            </div>
          )}

          {/* Signer Legend */}
          <div className={styles.legend}>
            <h4>Signatur-Legende:</h4>
            <div className={styles.legendItems}>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.signed}`}></span>
                <span>Signiert</span>
              </div>
              <div className={styles.legendItem}>
                <span className={`${styles.legendDot} ${styles.pending}`}></span>
                <span>Ausstehend</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
