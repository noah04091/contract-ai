// 📝 PDFFieldPlacementEditor.tsx - DocuSign-Style PDF Field Placement
import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, Calendar, Type, FileSignature, Trash2, Plus, ZoomIn, ZoomOut, ExternalLink } from 'lucide-react';
import styles from '../styles/PDFFieldPlacementEditor.module.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ===== HELPER FUNCTIONS FOR COORDINATE CONVERSION =====

/**
 * Calculate scale factor from rendered to original PDF dimensions
 */
function getScale(renderedWidth: number, originalWidth: number): number {
  if (!renderedWidth || !originalWidth) return 1;
  return renderedWidth / originalWidth;
}

/**
 * Convert client (mouse/touch) coordinates to PDF coordinates
 * Accounts for zoom/scale and container offset
 */
function clientToPdfXY(
  clientX: number,
  clientY: number,
  hostEl: HTMLElement,
  renderedWidth: number,
  originalWidth: number,
  originalHeight: number
): { xPdf: number; yPdf: number; scale: number } {
  const rect = hostEl.getBoundingClientRect();

  const xRendered = Math.max(0, Math.min(clientX - rect.left, rect.width));
  const yRendered = Math.max(0, Math.min(clientY - rect.top, rect.height));

  const scale = getScale(renderedWidth, originalWidth);
  const xPdf = xRendered / (scale || 1);
  const yPdf = yRendered / (scale || 1);

  return {
    xPdf: Math.max(0, Math.min(xPdf, originalWidth)),
    yPdf: Math.max(0, Math.min(yPdf, originalHeight)),
    scale
  };
}

export interface SignatureField {
  id: string;
  type: 'signature' | 'initial' | 'date' | 'text';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  assigneeEmail: string;
  required: boolean;
  label?: string;
}

export interface Signer {
  email: string;
  name: string;
  color: string;
}

interface PDFFieldPlacementEditorProps {
  pdfUrl: string;
  signers: Signer[];
  fields: SignatureField[];
  onFieldsChange: (fields: SignatureField[]) => void;
  onPdfDimensionsChange?: (dimensions: { width: number; height: number }) => void;
}

const FIELD_TYPES = [
  { type: 'signature' as const, label: 'Signatur', icon: PenTool, defaultSize: { width: 200, height: 60 } },
  { type: 'initial' as const, label: 'Initial', icon: FileSignature, defaultSize: { width: 80, height: 40 } },
  { type: 'date' as const, label: 'Datum', icon: Calendar, defaultSize: { width: 120, height: 40 } },
  { type: 'text' as const, label: 'Text', icon: Type, defaultSize: { width: 150, height: 40 } },
];

const PDFFieldPlacementEditor: React.FC<PDFFieldPlacementEditorProps> = ({
  pdfUrl,
  signers,
  fields,
  onFieldsChange,
  onPdfDimensionsChange,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [, setPdfLoading] = useState<boolean>(true); // Used by onDocumentLoadSuccess
  const [selectedFieldType, setSelectedFieldType] = useState<'signature' | 'initial' | 'date' | 'text'>('signature');
  const [selectedSigner, setSelectedSigner] = useState<string>(signers[0]?.email || '');
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState<number>(100); // Zoom in percentage (50%, 75%, 100%, 125%, 150%, 200%)

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfPageWrapperRef = useRef<HTMLDivElement>(null);

  // ✅ NEW: Separate original PDF dimensions (viewport-independent) from rendered dimensions
  const [pdfOriginal, setPdfOriginal] = useState<{ width: number; height: number } | null>(null);
  const [renderedWidth, setRenderedWidth] = useState<number>(0);

  // Update selected signer when signers change
  useEffect(() => {
    if (signers.length > 0 && !selectedSigner) {
      setSelectedSigner(signers[0].email);
    }
  }, [signers, selectedSigner]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfLoading(false);
  };

  const onPageLoadSuccess = (page: any) => {
    const { width, height, originalWidth, originalHeight } = page;

    // Store rendered dimensions (for scale calculation)
    setRenderedWidth(width);

    // Store original PDF dimensions (viewport-independent, for bounds)
    if (originalWidth && originalHeight) {
      setPdfOriginal({ width: originalWidth, height: originalHeight });

      // Notify parent with ORIGINAL dimensions for normalized coordinate calculations
      if (onPdfDimensionsChange) {
        onPdfDimensionsChange({ width: originalWidth, height: originalHeight });
      }
    } else {
      // Fallback: if originalWidth/originalHeight not available, use rendered
      setPdfOriginal({ width, height });

      if (onPdfDimensionsChange) {
        onPdfDimensionsChange({ width, height });
      }
    }

    console.log('📐 PDF Dimensions loaded:', {
      rendered: { width, height },
      original: originalWidth && originalHeight ? { width: originalWidth, height: originalHeight } : { width, height },
      zoomLevel
    });
  };

  // Add field to PDF
  const handleAddField = () => {
    if (!selectedSigner) return;

    const fieldType = FIELD_TYPES.find(f => f.type === selectedFieldType);
    if (!fieldType) return;

    const newField: SignatureField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: selectedFieldType,
      page: currentPage,
      x: 50, // Start position
      y: 100,
      width: fieldType.defaultSize.width,
      height: fieldType.defaultSize.height,
      assigneeEmail: selectedSigner,
      required: true,
      label: fieldType.label,
    };

    onFieldsChange([...fields, newField]);
  };

  // Delete field
  const handleDeleteField = (fieldId: string) => {
    onFieldsChange(fields.filter(f => f.id !== fieldId));
  };

  // Start dragging field
  const handleFieldMouseDown = (e: React.MouseEvent, field: SignatureField) => {
    e.preventDefault();

    if (!pdfPageWrapperRef.current || !pdfOriginal) return;

    // Convert client coordinates to PDF coordinates
    const { xPdf, yPdf } = clientToPdfXY(
      e.clientX,
      e.clientY,
      pdfPageWrapperRef.current,
      renderedWidth,
      pdfOriginal.width,
      pdfOriginal.height
    );

    // Calculate offset in PDF coordinates (not screen pixels!)
    setDragOffset({
      x: xPdf - field.x,
      y: yPdf - field.y,
    });
    setDraggingField(field.id);
  };

  // Drag field
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingField || !pdfPageWrapperRef.current || !pdfOriginal) return;

    const field = fields.find(f => f.id === draggingField);
    if (!field) return;

    // Convert client coordinates to PDF coordinates
    const { xPdf, yPdf, scale } = clientToPdfXY(
      e.clientX,
      e.clientY,
      pdfPageWrapperRef.current,
      renderedWidth,
      pdfOriginal.width,
      pdfOriginal.height
    );

    // Calculate raw target position in PDF coordinates
    const rawX = xPdf - dragOffset.x;
    const rawY = yPdf - dragOffset.y;

    // ✅ BOUNDS AGAINST ORIGINAL PDF DIMENSIONS (not rendered/zoomed dimensions!)
    const maxX = pdfOriginal.width - field.width;
    const maxY = pdfOriginal.height - field.height;

    const constrainedX = Math.max(0, Math.min(rawX, maxX));
    const constrainedY = Math.max(0, Math.min(rawY, maxY));

    // 🐛 DEBUG: Log constraint behavior (keeping until invisible wall is confirmed fixed)
    console.log('🐛 Field Drag Debug (FIXED):', {
      fieldType: field.type,
      fieldLabel: field.label,
      fieldWidth: field.width,
      pdfOriginal: { width: pdfOriginal.width, height: pdfOriginal.height },
      renderedWidth: renderedWidth,
      scale: scale,
      maxX: maxX,
      maxY: maxY,
      rawX: rawX,
      rawY: rawY,
      constrainedX: constrainedX,
      constrainedY: constrainedY,
      isHittingXBoundary: rawX > maxX || rawX < 0,
      isHittingYBoundary: rawY > maxY || rawY < 0,
    });

    // Update field position (in PDF coordinates)
    onFieldsChange(
      fields.map(f =>
        f.id === draggingField
          ? { ...f, x: constrainedX, y: constrainedY }
          : f
      )
    );
  };

  // Stop dragging
  const handleMouseUp = () => {
    setDraggingField(null);
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200)); // Max 200%
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50)); // Min 50%
  };

  // Open PDF in new window
  const handleOpenInNewWindow = () => {
    window.open(pdfUrl, '_blank');
  };

  // Calculate PDF width based on zoom level
  const pdfWidth = Math.round((1000 * zoomLevel) / 100);

  // ✅ Calculate ACTUAL scale factor from rendered to original PDF dimensions
  // This accounts for zoom AND viewport changes
  const scaleFactor = pdfOriginal && renderedWidth
    ? getScale(renderedWidth, pdfOriginal.width)
    : zoomLevel / 100; // Fallback during initialization

  // Get signer color
  const getSignerColor = (email: string): string => {
    const signer = signers.find(s => s.email === email);
    return signer?.color || '#2E6CF6';
  };

  // Filter fields for current page
  const currentPageFields = fields.filter(f => f.page === currentPage);

  return (
    <div className={`${styles.editorContainer} pdfEditor`}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarSection}>
          <label className={styles.toolbarLabel}>Feld-Typ:</label>
          <div className={styles.fieldTypeButtons}>
            {FIELD_TYPES.map(fieldType => {
              const Icon = fieldType.icon;
              return (
                <button
                  key={fieldType.type}
                  className={`${styles.fieldTypeButton} ${selectedFieldType === fieldType.type ? styles.active : ''}`}
                  onClick={() => setSelectedFieldType(fieldType.type)}
                  title={fieldType.label}
                >
                  <Icon size={16} />
                  <span>{fieldType.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.toolbarSection}>
          <label className={styles.toolbarLabel}>Empfänger:</label>
          <select
            className={styles.signerSelect}
            value={selectedSigner}
            onChange={e => setSelectedSigner(e.target.value)}
          >
            {signers.map(signer => (
              <option key={signer.email} value={signer.email}>
                {signer.name} ({signer.email})
              </option>
            ))}
          </select>
        </div>

        <button
          className={styles.addFieldButton}
          onClick={handleAddField}
          disabled={!selectedSigner || signers.length === 0}
        >
          <Plus size={16} />
          <span>Feld hinzufügen</span>
        </button>
      </div>

      {/* PDF Viewer */}
      <div className={styles.pdfViewerContainer}>
        {/* Page Navigation */}
        {numPages > 1 && (
          <div className={styles.pageNav}>
            <button
              className={styles.pageButton}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              ‹
            </button>
            <span className={styles.pageInfo}>
              Seite {currentPage} von {numPages}
            </span>
            <button
              className={styles.pageButton}
              onClick={() => setCurrentPage(p => Math.min(numPages, p + 1))}
              disabled={currentPage === numPages}
            >
              ›
            </button>
          </div>
        )}

        {/* PDF Document */}
        <div
          ref={pdfContainerRef}
          className={styles.pdfContainer}
        >
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={<div className={styles.pdfLoading}>PDF wird geladen...</div>}
            error={<div className={styles.pdfError}>Fehler beim Laden des PDFs</div>}
          >
            {/* Wrapper for PDF Page + Overlay */}
            <div
              ref={pdfPageWrapperRef}
              className={styles.pdfPageWrapper}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              <Page
                pageNumber={currentPage}
                width={pdfWidth}
                onLoadSuccess={onPageLoadSuccess}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />

              {/* Signature Fields Overlay */}
              <div className={styles.fieldsOverlay}>
                <AnimatePresence>
                  {currentPageFields.map(field => (
                    <motion.div
                      key={field.id}
                      className={`${styles.signatureField} ${draggingField === field.id ? styles.dragging : ''}`}
                      style={{
                        left: field.x * scaleFactor,
                        top: field.y * scaleFactor,
                        width: field.width * scaleFactor,
                        height: field.height * scaleFactor,
                        borderColor: getSignerColor(field.assigneeEmail),
                        backgroundColor: `${getSignerColor(field.assigneeEmail)}15`,
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onMouseDown={e => handleFieldMouseDown(e, field)}
                    >
                      <div className={styles.fieldLabel}>
                        {field.label || field.type}
                      </div>
                      <div className={styles.fieldSigner}>
                        {signers.find(s => s.email === field.assigneeEmail)?.name || field.assigneeEmail}
                      </div>
                      <button
                        className={styles.deleteFieldButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteField(field.id);
                        }}
                        title="Feld löschen"
                      >
                        <Trash2 size={12} />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </Document>

          {/* Floating Controls */}
          {/* Open in New Window Button - Top Right */}
          <button
            className={styles.floatingOpenButton}
            onClick={handleOpenInNewWindow}
            title="In neuem Fenster öffnen"
          >
            <ExternalLink size={18} />
          </button>

          {/* Floating Zoom Controls - Bottom Right */}
          <div className={styles.floatingZoomControls}>
            <button
              className={styles.floatingZoomButton}
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              title="Hineinzoomen"
            >
              <ZoomIn size={18} />
            </button>
            <div className={styles.floatingZoomLevel}>{zoomLevel}%</div>
            <button
              className={styles.floatingZoomButton}
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              title="Herauszoomen"
            >
              <ZoomOut size={18} />
            </button>
          </div>
        </div>

        {/* Field Count Info */}
        <div className={styles.fieldCount}>
          {fields.length} {fields.length === 1 ? 'Feld' : 'Felder'} platziert
          {numPages > 1 && ` (${currentPageFields.length} auf dieser Seite)`}
        </div>
      </div>
    </div>
  );
};

export default PDFFieldPlacementEditor;
