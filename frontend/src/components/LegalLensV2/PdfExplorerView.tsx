import { useState, useCallback, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type { ParsedClauseV2, AnalysesMap, V2Analysis } from '../../types/legalLensV2';
import { useClauseMapping } from '../../hooks/useClauseMapping';
import PdfClauseOverlay from './PdfClauseOverlay';
import HoverTooltip from './HoverTooltip';
import styles from '../../styles/LegalLensV2.module.css';

// PDF.js Worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfExplorerViewProps {
  pdfUrl: string | null;
  clauses: ParsedClauseV2[];
  analysesMap: AnalysesMap;
  selectedClauseId: string | null;
  hoveredClauseId: string | null;
  onSelectClause: (clauseId: string, source: 'pdf') => void;
  onHoverClause: (clauseId: string | null) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

export default function PdfExplorerView({
  pdfUrl,
  clauses,
  analysesMap,
  selectedClauseId,
  hoveredClauseId,
  onSelectClause,
  onHoverClause,
  containerRef
}: PdfExplorerViewProps) {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [tooltipData, setTooltipData] = useState<{ analysis: V2Analysis; title: string | null } | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  const { regionsByPage, mapPageClauses, updateRegionRiskLevels, resetMappings } = useClauseMapping();

  // Risiko-Level updaten wenn neue Analysen eintreffen
  useEffect(() => {
    if (Object.keys(analysesMap).length > 0) {
      updateRegionRiskLevels(analysesMap);
    }
  }, [analysesMap, updateRegionRiskLevels]);

  // Bei Zoom-Änderung: Mappings zurücksetzen
  useEffect(() => {
    resetMappings();
  }, [scale, resetMappings]);

  const handleDocumentLoad = useCallback(({ numPages: n }: { numPages: number }) => {
    setNumPages(n);
  }, []);

  const handlePageRender = useCallback((pageNumber: number) => {
    const pageEl = pageRefs.current.get(pageNumber);
    if (pageEl && clauses.length > 0) {
      // Kurzer Delay damit die Text-Layer fertig gerendert ist
      setTimeout(() => {
        mapPageClauses(pageNumber, pageEl, clauses);
      }, 200);
    }
  }, [clauses, mapPageClauses]);

  const handleOverlaySelect = useCallback((clauseId: string) => {
    onSelectClause(clauseId, 'pdf');
    setTooltipData(null);
  }, [onSelectClause]);

  const handleOverlayHoverStart = useCallback((clauseId: string) => {
    onHoverClause(clauseId);
    clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      const analysis = analysesMap[clauseId];
      const clause = clauses.find(c => c.id === clauseId);
      if (analysis) {
        setTooltipData({ analysis, title: clause?.title || null });
      }
    }, 300);
  }, [onHoverClause, analysesMap, clauses]);

  const handleOverlayHoverEnd = useCallback(() => {
    onHoverClause(null);
    clearTimeout(hoverTimeoutRef.current);
    setTooltipData(null);
  }, [onHoverClause]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    setTooltipPos({ x: e.clientX, y: e.clientY });
  }, []);

  const zoomIn = useCallback(() => setScale(s => Math.min(s + 0.2, 3)), []);
  const zoomOut = useCallback(() => setScale(s => Math.max(s - 0.2, 0.5)), []);
  const zoomReset = useCallback(() => setScale(1.2), []);

  if (!pdfUrl) {
    return (
      <div className={styles.pdfExplorer}>
        <div className={styles.pdfExplorerEmpty}>
          Kein PDF verfügbar. Bitte nutzen Sie die Textansicht.
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={styles.pdfExplorer}
      onMouseMove={handleMouseMove}
    >
      {/* Zoom Controls */}
      <div className={styles.pdfZoomControls}>
        <button onClick={zoomOut} className={styles.pdfZoomBtn} title="Verkleinern">-</button>
        <button onClick={zoomReset} className={styles.pdfZoomBtn} title="Zurücksetzen">
          {Math.round(scale * 100)}%
        </button>
        <button onClick={zoomIn} className={styles.pdfZoomBtn} title="Vergrößern">+</button>
      </div>

      {/* PDF Document */}
      <div className={styles.pdfDocumentContainer}>
        <Document
          file={pdfUrl}
          onLoadSuccess={handleDocumentLoad}
          loading={<div className={styles.pdfLoading}>PDF wird geladen...</div>}
          error={<div className={styles.pdfError}>PDF konnte nicht geladen werden</div>}
        >
          {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
            <div
              key={pageNum}
              className={styles.pdfPageWrapper}
              ref={(el) => { if (el) pageRefs.current.set(pageNum, el); }}
              style={{ position: 'relative' }}
            >
              <Page
                pageNumber={pageNum}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                onRenderSuccess={() => handlePageRender(pageNum)}
              />

              {/* Clause Overlays für diese Seite */}
              {(regionsByPage[pageNum] || []).map(region => {
                const clause = clauses.find(c => c.id === region.clauseId);
                return (
                  <PdfClauseOverlay
                    key={region.clauseId}
                    region={region}
                    analysis={analysesMap[region.clauseId] || null}
                    isSelected={selectedClauseId === region.clauseId}
                    isHovered={hoveredClauseId === region.clauseId}
                    clauseTitle={clause?.title || null}
                    onSelect={handleOverlaySelect}
                    onHoverStart={handleOverlayHoverStart}
                    onHoverEnd={handleOverlayHoverEnd}
                  />
                );
              })}
            </div>
          ))}
        </Document>
      </div>

      {/* Hover Tooltip */}
      {tooltipData && (
        <HoverTooltip
          analysis={tooltipData.analysis}
          clauseTitle={tooltipData.title}
          position={tooltipPos}
          visible={!!tooltipData}
        />
      )}
    </div>
  );
}
