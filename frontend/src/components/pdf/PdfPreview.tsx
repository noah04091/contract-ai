// frontend/src/components/pdf/PdfPreview.tsx
import React, { useEffect, useRef, useState, useCallback } from 'react';
import styles from '../../styles/Chat.module.css';

interface PdfPreviewProps {
  contractId?: string;
  currentPage?: number;
  highlightSpan?: [number, number];
  onPageChange?: (page: number) => void;
  className?: string;
}

interface PdfDocument {
  getPage: (pageNumber: number) => Promise<PdfPage>;
  numPages: number;
}

interface PdfPage {
  render: (context: { canvasContext: CanvasRenderingContext2D; viewport: any }) => Promise<void>;
  getViewport: (options: { scale: number }) => any;
  getTextContent: () => Promise<{ items: Array<{ str: string; transform: number[] }> }>;
}

const PdfPreview: React.FC<PdfPreviewProps> = ({
  contractId,
  currentPage = 1,
  highlightSpan,
  onPageChange,
  className
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<PdfDocument | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.5);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  
  // PDF.js will be loaded dynamically
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);

  /**
   * Load PDF.js dynamically
   */
  useEffect(() => {
    const loadPdfJs = async () => {
      try {
        const pdfjs = await import('pdfjs-dist');
        
        // Set worker source - use the installed package's worker
        pdfjs.GlobalWorkerOptions.workerSrc = new URL(
          'pdfjs-dist/build/pdf.worker.min.mjs',
          import.meta.url
        ).href;
        
        setPdfjsLib(pdfjs);
      } catch (err) {
        console.error('Failed to load PDF.js:', err);
        setError('PDF-Viewer konnte nicht geladen werden');
      }
    };

    loadPdfJs();
  }, []);

  /**
   * Get signed URL for PDF from backend
   */
  const fetchPdfUrl = useCallback(async (contractId: string): Promise<string> => {
    try {
      const response = await fetch(`/api/s3/download-url/${contractId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.success || !data.downloadUrl) {
        throw new Error(data.message || 'Keine Download-URL erhalten');
      }
      
      return data.downloadUrl;
    } catch (error) {
      console.error('Failed to fetch PDF URL:', error);
      throw error;
    }
  }, []);

  /**
   * Load PDF document
   */
  const loadPdf = useCallback(async () => {
    if (!pdfjsLib || !contractId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Get signed URL for PDF
      const url = await fetchPdfUrl(contractId);
      setPdfUrl(url);
      
      // Load PDF document
      const loadingTask = pdfjsLib.getDocument({
        url,
        cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
        cMapPacked: true
      });
      
      const pdf = await loadingTask.promise;
      setPdfDoc(pdf);
      setTotalPages(pdf.numPages);
      
      console.log('PDF loaded successfully:', pdf.numPages, 'pages');
      
    } catch (err: any) {
      console.error('PDF loading failed:', err);
      setError(err.message || 'PDF konnte nicht geladen werden');
      setPdfDoc(null);
    } finally {
      setLoading(false);
    }
  }, [pdfjsLib, contractId, fetchPdfUrl]);

  /**
   * Load PDF when dependencies are ready
   */
  useEffect(() => {
    if (pdfjsLib && contractId) {
      loadPdf();
    }
  }, [pdfjsLib, contractId, loadPdf]);

  /**
   * Render specific page
   */
  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDoc || !canvasRef.current) return;
    
    try {
      const page = await pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (!context) return;
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Clear canvas
      context.clearRect(0, 0, canvas.width, canvas.height);
      
      // Render page
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      // Handle text highlighting if span is provided
      if (highlightSpan) {
        await highlightText(page, viewport, context, highlightSpan);
      }
      
    } catch (err) {
      console.error('Page rendering failed:', err);
      setError('Seite konnte nicht gerendert werden');
    }
  }, [pdfDoc, scale, highlightSpan]);

  /**
   * Highlight text in the PDF (simplified implementation)
   */
  const highlightText = async (
    page: PdfPage, 
    viewport: any, 
    context: CanvasRenderingContext2D,
    span: [number, number]
  ) => {
    try {
      const textContent = await page.getTextContent();
      const [startChar, endChar] = span;
      
      let charCount = 0;
      const highlights: Array<{ x: number; y: number; width: number; height: number }> = [];
      
      for (const item of textContent.items) {
        const itemLength = item.str.length;
        const itemStart = charCount;
        const itemEnd = charCount + itemLength;
        
        // Check if this text item overlaps with highlight span
        if (itemEnd >= startChar && itemStart <= endChar) {
          const transform = item.transform;
          const x = transform[4];
          const y = transform[5];
          const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]);
          
          highlights.push({
            x: x * viewport.scale,
            y: (viewport.height - y) * viewport.scale,
            width: (item.str.length * fontSize * 0.6) * viewport.scale,
            height: fontSize * viewport.scale
          });
        }
        
        charCount += itemLength;
      }
      
      // Draw highlights
      context.globalAlpha = 0.3;
      context.fillStyle = '#ffff00'; // Yellow highlight
      
      highlights.forEach(highlight => {
        context.fillRect(highlight.x, highlight.y - highlight.height, highlight.width, highlight.height);
      });
      
      context.globalAlpha = 1.0;
      
    } catch (err) {
      console.error('Text highlighting failed:', err);
    }
  };

  /**
   * Render current page when page number or document changes
   */
  useEffect(() => {
    if (pdfDoc && currentPage > 0 && currentPage <= totalPages) {
      renderPage(currentPage);
    }
  }, [pdfDoc, currentPage, totalPages, renderPage]);

  /**
   * Scroll to page
   */
  const scrollToPage = useCallback((pageNumber: number) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      onPageChange?.(pageNumber);
      
      // Scroll container to top if it exists
      if (containerRef.current) {
        containerRef.current.scrollTop = 0;
      }
    }
  }, [totalPages, onPageChange]);

  /**
   * Handle zoom controls
   */
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1.5);
  };

  /**
   * Handle page navigation
   */
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      scrollToPage(currentPage + 1);
    }
  };

  /**
   * Handle retry
   */
  const handleRetry = () => {
    setError(null);
    loadPdf();
  };

  if (!contractId) {
    return (
      <div className={`${styles.pdfPreview} ${className || ''}`}>
        <div className={styles.pdfPlaceholder}>
          <div className={styles.placeholderIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6C4.89543 2 4 2.89543 4 4V20C4 21.1046 4.89543 22 6 22H18C19.1046 22 20 21.1046 20 20V8L14 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 2V8H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p>Laden Sie einen Vertrag hoch, um ihn hier anzuzeigen</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.pdfPreview} ${className || ''}`}>
        <div className={styles.pdfError}>
          <div className={styles.errorIcon}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="8" x2="12" y2="12" stroke="currentColor" strokeWidth="2"/>
              <line x1="12" y1="16" x2="12.01" y2="16" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </div>
          <h3>PDF-Vorschau nicht verfügbar</h3>
          <p>{error}</p>
          <button className={styles.retryButton} onClick={handleRetry}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`${styles.pdfPreview} ${className || ''}`}>
        <div className={styles.pdfLoading}>
          <div className={styles.loadingSpinner}>
            <div></div><div></div><div></div>
          </div>
          <p>PDF wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.pdfPreview} ${className || ''}`}>
      {/* PDF Controls */}
      <div className={styles.pdfControls}>
        <div className={styles.pageControls}>
          <button 
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className={styles.pageButton}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          
          <span className={styles.pageInfo}>
            {currentPage} / {totalPages}
          </span>
          
          <button 
            onClick={goToNextPage}
            disabled={currentPage >= totalPages}
            className={styles.pageButton}
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 18L15 12L9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.zoomControls}>
          <button onClick={handleZoomOut} className={styles.zoomButton}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
              <line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
          
          <button onClick={handleResetZoom} className={styles.zoomReset}>
            {Math.round(scale * 100)}%
          </button>
          
          <button onClick={handleZoomIn} className={styles.zoomButton}>
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="2"/>
              <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2"/>
              <line x1="11" y1="8" x2="11" y2="14" stroke="currentColor" strokeWidth="2"/>
              <line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* PDF Content */}
      <div className={styles.pdfContainer} ref={containerRef}>
        <canvas 
          ref={canvasRef} 
          className={styles.pdfCanvas}
          style={{ 
            maxWidth: '100%',
            height: 'auto',
            border: '1px solid var(--border-color, #e5e7eb)'
          }}
        />
      </div>
    </div>
  );
};

export default PdfPreview;