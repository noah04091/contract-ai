// 📝 PDFFieldPlacementEditor.tsx - DocuSign-Style PDF Field Placement
import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, Calendar, Type, FileSignature, Trash2, Plus, ZoomIn, ZoomOut, ExternalLink, MapPin } from 'lucide-react';
import styles from '../styles/PDFFieldPlacementEditor.module.css';
import { toNormalized } from '../utils/fieldCoords';
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
 * ✅ FIXED: Now properly handles cases where wrapper != PDF canvas size
 */
function clientToPdfXY(
  clientX: number,
  clientY: number,
  hostEl: HTMLElement,
  renderedWidth: number,
  originalWidth: number,
  originalHeight: number
): { xPdf: number; yPdf: number; scale: number } {
  // ✅ FIX: Find the actual canvas element inside the wrapper for accurate bounds
  const canvas = hostEl.querySelector('canvas');
  const rect = canvas ? canvas.getBoundingClientRect() : hostEl.getBoundingClientRect();

  // Use actual canvas/rendered width for accurate scale calculation
  const actualRenderedWidth = canvas ? rect.width : renderedWidth;
  const actualRenderedHeight = canvas ? rect.height : (renderedWidth * originalHeight / originalWidth);

  const xRendered = Math.max(0, Math.min(clientX - rect.left, actualRenderedWidth));
  const yRendered = Math.max(0, Math.min(clientY - rect.top, actualRenderedHeight));

  const scale = getScale(actualRenderedWidth, originalWidth);
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
  type: 'signature' | 'initial' | 'date' | 'text' | 'location';
  page: number;
  // Legacy pixel coordinates (still used internally for editing)
  x: number;
  y: number;
  width: number;
  height: number;
  // 🆕 Normalized coordinates (0-1 range, for cross-device consistency)
  nx?: number;
  ny?: number;
  nwidth?: number;
  nheight?: number;
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

// 🔥 FIELD SIZES AS PERCENTAGE OF PDF WIDTH
// Standard PDF A4 is 612pt wide, so we define sizes as percentages
// This ensures fields look proportional regardless of zoom/device
const FIELD_TYPES = [
  {
    type: 'signature' as const,
    label: 'Signatur',
    icon: PenTool,
    // ~15% width, ~3% height (reasonable signature size)
    defaultSizePercent: { width: 0.15, height: 0.03 },
    minSizePercent: { width: 0.08, height: 0.02 },
    maxSizePercent: { width: 0.35, height: 0.08 }
  },
  {
    type: 'initial' as const,
    label: 'Initial',
    icon: FileSignature,
    // ~6% width, ~2.5% height (small initials box)
    defaultSizePercent: { width: 0.06, height: 0.025 },
    minSizePercent: { width: 0.04, height: 0.015 },
    maxSizePercent: { width: 0.12, height: 0.05 }
  },
  {
    type: 'date' as const,
    label: 'Datum',
    icon: Calendar,
    // ~12% width, ~2.5% height (date field)
    defaultSizePercent: { width: 0.12, height: 0.025 },
    minSizePercent: { width: 0.06, height: 0.015 },
    maxSizePercent: { width: 0.25, height: 0.04 }
  },
  {
    type: 'text' as const,
    label: 'Text',
    icon: Type,
    // ~15% width, ~2.5% height (text input)
    defaultSizePercent: { width: 0.15, height: 0.025 },
    minSizePercent: { width: 0.05, height: 0.015 },
    maxSizePercent: { width: 0.5, height: 0.12 }
  },
  {
    type: 'location' as const,
    label: 'Ort',
    icon: MapPin,
    // ~12% width, ~2.5% height (location/city field)
    defaultSizePercent: { width: 0.12, height: 0.025 },
    minSizePercent: { width: 0.06, height: 0.015 },
    maxSizePercent: { width: 0.25, height: 0.04 }
  },
];

// 🔥 Store last used sizes per field type (persists during session)
const lastFieldSizes: Record<string, { width: number; height: number }> = {};

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
  const [selectedFieldType, setSelectedFieldType] = useState<'signature' | 'initial' | 'date' | 'text' | 'location'>('signature');
  const [selectedSigner, setSelectedSigner] = useState<string>(signers[0]?.email || '');
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoomLevel, setZoomLevel] = useState<number>(100); // Zoom in percentage (50%, 75%, 100%, 125%, 150%, 200%)

  // 🔥 NEW: Resizing state
  const [resizingField, setResizingField] = useState<string | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState({ x: 0, y: 0 });
  const [resizeStartSize, setResizeStartSize] = useState({ width: 0, height: 0 });

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

  const onPageLoadSuccess = (page: { width: number; height: number; originalWidth?: number; originalHeight?: number }) => {
    const { width, originalWidth, originalHeight } = page;

    // Store rendered dimensions (for scale calculation)
    setRenderedWidth(width);

    // 🔥 FIX: Always use original PDF dimensions, calculate from rendered if not available
    // react-pdf provides originalWidth/originalHeight which are the TRUE PDF dimensions
    // If not available, we need to calculate them from rendered size and zoom level
    let trueWidth: number;
    let trueHeight: number;

    if (originalWidth && originalHeight) {
      // Best case: react-pdf gives us the original dimensions
      trueWidth = originalWidth;
      trueHeight = originalHeight;
    } else {
      // Fallback: Calculate original dimensions from rendered size and zoom
      // pdfWidth prop is set to (1000 * zoomLevel / 100), so we can reverse it
      // But since we don't have access to zoomLevel here, use a standard approach:
      // A4 PDFs are typically 595pt (72dpi) or 612pt wide, A4 height is 842pt or 792pt
      // We'll detect based on aspect ratio
      const aspectRatio = width / page.height;

      if (aspectRatio > 0.65 && aspectRatio < 0.75) {
        // Portrait A4 (595x842 or 612x792)
        trueWidth = 595.276; // Standard A4 width in points
        trueHeight = 841.890; // Standard A4 height in points
      } else if (aspectRatio > 1.33 && aspectRatio < 1.5) {
        // Landscape A4
        trueWidth = 841.890;
        trueHeight = 595.276;
      } else {
        // Unknown format - use US Letter as fallback
        trueWidth = 612;
        trueHeight = 792;
      }

      console.warn('⚠️ PDF original dimensions not available, using fallback:', { trueWidth, trueHeight });
    }

    setPdfOriginal({ width: trueWidth, height: trueHeight });

    // Notify parent with ORIGINAL dimensions for normalized coordinate calculations
    if (onPdfDimensionsChange) {
      onPdfDimensionsChange({ width: trueWidth, height: trueHeight });
    }
  };

  // 🆕 Helper: Add normalized coordinates to a field
  const withNormalizedCoords = (field: SignatureField): SignatureField => {
    if (!pdfOriginal) return field;

    const normalized = toNormalized(
      field.x,
      field.y,
      field.width,
      field.height,
      pdfOriginal.width,
      pdfOriginal.height
    );

    return {
      ...field,
      nx: normalized.nx,
      ny: normalized.ny,
      nwidth: normalized.nwidth,
      nheight: normalized.nheight,
    };
  };

  // 🆕 Helper: Update fields with normalized coordinates
  const updateFieldsWithNormalized = (newFields: SignatureField[]) => {
    const fieldsWithNormalized = newFields.map(f => withNormalizedCoords(f));
    onFieldsChange(fieldsWithNormalized);
  };

  // Add field to PDF
  const handleAddField = () => {
    if (!selectedSigner || !pdfOriginal) return;

    const fieldType = FIELD_TYPES.find(f => f.type === selectedFieldType);
    if (!fieldType) return;

    // 🔥 Use last saved normalized size, or calculate from percentage defaults
    const savedSize = lastFieldSizes[selectedFieldType];

    // Calculate default size from percentage of PDF dimensions
    const defaultWidth = fieldType.defaultSizePercent.width * pdfOriginal.width;
    const defaultHeight = fieldType.defaultSizePercent.height * pdfOriginal.height;

    const fieldWidth = savedSize?.width || defaultWidth;
    const fieldHeight = savedSize?.height || defaultHeight;

    // Start position: 8% from left, 15% from top
    const startX = pdfOriginal.width * 0.08;
    const startY = pdfOriginal.height * 0.15;

    const newField: SignatureField = {
      id: `field-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: selectedFieldType,
      page: currentPage,
      x: startX,
      y: startY,
      width: fieldWidth,
      height: fieldHeight,
      assigneeEmail: selectedSigner,
      required: true,
      label: fieldType.label,
    };

    // 🆕 Add normalized coordinates
    updateFieldsWithNormalized([...fields, newField]);
  };

  // Delete field
  const handleDeleteField = (fieldId: string) => {
    onFieldsChange(fields.filter(f => f.id !== fieldId));
  };

  // Start dragging field (Mouse)
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

  // Start dragging field (Touch) 📱
  const handleFieldTouchStart = (e: React.TouchEvent, field: SignatureField) => {
    e.preventDefault(); // Prevent scrolling while dragging
    e.stopPropagation();

    if (!pdfPageWrapperRef.current || !pdfOriginal) return;

    const touch = e.touches[0];
    if (!touch) return;

    // Convert touch coordinates to PDF coordinates
    const { xPdf, yPdf } = clientToPdfXY(
      touch.clientX,
      touch.clientY,
      pdfPageWrapperRef.current,
      renderedWidth,
      pdfOriginal.width,
      pdfOriginal.height
    );

    // Calculate offset in PDF coordinates
    setDragOffset({
      x: xPdf - field.x,
      y: yPdf - field.y,
    });
    setDraggingField(field.id);
  };

  // Drag field (Mouse)
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingField || !pdfPageWrapperRef.current || !pdfOriginal) return;

    const field = fields.find(f => f.id === draggingField);
    if (!field) return;

    // Convert client coordinates to PDF coordinates
    const { xPdf, yPdf } = clientToPdfXY(
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

    // Update field position (in PDF coordinates) with normalized coords
    updateFieldsWithNormalized(
      fields.map(f =>
        f.id === draggingField
          ? { ...f, x: constrainedX, y: constrainedY }
          : f
      )
    );
  };

  // Drag field (Touch) 📱
  const handleTouchMove = (e: React.TouchEvent) => {
    if (!draggingField || !pdfPageWrapperRef.current || !pdfOriginal) return;

    e.preventDefault(); // Prevent scrolling while dragging

    const touch = e.touches[0];
    if (!touch) return;

    const field = fields.find(f => f.id === draggingField);
    if (!field) return;

    // Convert touch coordinates to PDF coordinates
    const { xPdf, yPdf } = clientToPdfXY(
      touch.clientX,
      touch.clientY,
      pdfPageWrapperRef.current,
      renderedWidth,
      pdfOriginal.width,
      pdfOriginal.height
    );

    // Calculate raw target position in PDF coordinates
    const rawX = xPdf - dragOffset.x;
    const rawY = yPdf - dragOffset.y;

    // Bounds against original PDF dimensions
    const maxX = pdfOriginal.width - field.width;
    const maxY = pdfOriginal.height - field.height;

    const constrainedX = Math.max(0, Math.min(rawX, maxX));
    const constrainedY = Math.max(0, Math.min(rawY, maxY));

    // Update field position with normalized coords
    updateFieldsWithNormalized(
      fields.map(f =>
        f.id === draggingField
          ? { ...f, x: constrainedX, y: constrainedY }
          : f
      )
    );
  };

  // Stop dragging (Mouse)
  const handleMouseUp = () => {
    setDraggingField(null);
    setResizingField(null);
  };

  // Stop dragging (Touch) 📱
  const handleTouchEnd = () => {
    setDraggingField(null);
    setResizingField(null);
  };

  // 🔥 START RESIZE (Mouse)
  const handleResizeMouseDown = (e: React.MouseEvent, field: SignatureField) => {
    e.preventDefault();
    e.stopPropagation();

    setResizingField(field.id);
    setResizeStartPos({ x: e.clientX, y: e.clientY });
    setResizeStartSize({ width: field.width, height: field.height });
  };

  // 🔥 START RESIZE (Touch)
  const handleResizeTouchStart = (e: React.TouchEvent, field: SignatureField) => {
    e.preventDefault();
    e.stopPropagation();

    const touch = e.touches[0];
    if (!touch) return;

    setResizingField(field.id);
    setResizeStartPos({ x: touch.clientX, y: touch.clientY });
    setResizeStartSize({ width: field.width, height: field.height });
  };

  // 🔥 RESIZE MOVE (Mouse) - Add to existing handleMouseMove
  const handleResizeMouseMove = (e: React.MouseEvent) => {
    if (!resizingField || !pdfOriginal) return;

    const field = fields.find(f => f.id === resizingField);
    if (!field) return;

    // Get field type constraints (as percentages of PDF dimensions)
    const fieldTypeConfig = FIELD_TYPES.find(ft => ft.type === field.type);
    const minWidth = (fieldTypeConfig?.minSizePercent.width || 0.05) * pdfOriginal.width;
    const minHeight = (fieldTypeConfig?.minSizePercent.height || 0.015) * pdfOriginal.height;
    const maxFieldWidth = (fieldTypeConfig?.maxSizePercent.width || 0.35) * pdfOriginal.width;
    const maxFieldHeight = (fieldTypeConfig?.maxSizePercent.height || 0.1) * pdfOriginal.height;

    const scaleFactor = renderedWidth / pdfOriginal.width;

    // Calculate delta in screen pixels, then convert to PDF coordinates
    const deltaX = (e.clientX - resizeStartPos.x) / scaleFactor;
    const deltaY = (e.clientY - resizeStartPos.y) / scaleFactor;

    // Calculate new size
    const rawWidth = resizeStartSize.width + deltaX;
    const rawHeight = resizeStartSize.height + deltaY;

    // Apply min/max constraints for field type
    const newWidth = Math.max(minWidth, Math.min(rawWidth, maxFieldWidth));
    const newHeight = Math.max(minHeight, Math.min(rawHeight, maxFieldHeight));

    // Also constrain to PDF bounds
    const pdfMaxWidth = pdfOriginal.width - field.x;
    const pdfMaxHeight = pdfOriginal.height - field.y;

    const constrainedWidth = Math.min(newWidth, pdfMaxWidth);
    const constrainedHeight = Math.min(newHeight, pdfMaxHeight);

    // Update field size with normalized coords
    updateFieldsWithNormalized(
      fields.map(f =>
        f.id === resizingField
          ? { ...f, width: constrainedWidth, height: constrainedHeight }
          : f
      )
    );

    // 🔥 Save this size for future fields of the same type
    lastFieldSizes[field.type] = { width: constrainedWidth, height: constrainedHeight };
  };

  // 🔥 RESIZE MOVE (Touch)
  const handleResizeTouchMove = (e: React.TouchEvent) => {
    if (!resizingField || !pdfOriginal) return;

    e.preventDefault();

    const touch = e.touches[0];
    if (!touch) return;

    const field = fields.find(f => f.id === resizingField);
    if (!field) return;

    // Get field type constraints (as percentages of PDF dimensions)
    const fieldTypeConfig = FIELD_TYPES.find(ft => ft.type === field.type);
    const minWidth = (fieldTypeConfig?.minSizePercent.width || 0.05) * pdfOriginal.width;
    const minHeight = (fieldTypeConfig?.minSizePercent.height || 0.015) * pdfOriginal.height;
    const maxFieldWidth = (fieldTypeConfig?.maxSizePercent.width || 0.35) * pdfOriginal.width;
    const maxFieldHeight = (fieldTypeConfig?.maxSizePercent.height || 0.1) * pdfOriginal.height;

    const scaleFactor = renderedWidth / pdfOriginal.width;

    // Calculate delta in screen pixels, then convert to PDF coordinates
    const deltaX = (touch.clientX - resizeStartPos.x) / scaleFactor;
    const deltaY = (touch.clientY - resizeStartPos.y) / scaleFactor;

    // Calculate new size
    const rawWidth = resizeStartSize.width + deltaX;
    const rawHeight = resizeStartSize.height + deltaY;

    // Apply min/max constraints for field type
    const newWidth = Math.max(minWidth, Math.min(rawWidth, maxFieldWidth));
    const newHeight = Math.max(minHeight, Math.min(rawHeight, maxFieldHeight));

    // Also constrain to PDF bounds
    const pdfMaxWidth = pdfOriginal.width - field.x;
    const pdfMaxHeight = pdfOriginal.height - field.y;

    const constrainedWidth = Math.min(newWidth, pdfMaxWidth);
    const constrainedHeight = Math.min(newHeight, pdfMaxHeight);

    // Update field size with normalized coords
    updateFieldsWithNormalized(
      fields.map(f =>
        f.id === resizingField
          ? { ...f, width: constrainedWidth, height: constrainedHeight }
          : f
      )
    );

    // 🔥 Save this size for future fields of the same type
    lastFieldSizes[field.type] = { width: constrainedWidth, height: constrainedHeight };
  };

  // Zoom handlers
  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200)); // Max 200%
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 25)); // Min 25% (for mobile)
  };

  // Open PDF in new window
  const handleOpenInNewWindow = () => {
    window.open(pdfUrl, '_blank');
  };

  // Calculate PDF width based on zoom level
  const pdfWidth = Math.round((1000 * zoomLevel) / 100);

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
              onMouseMove={(e) => {
                if (resizingField) {
                  handleResizeMouseMove(e);
                } else {
                  handleMouseMove(e);
                }
              }}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchMove={(e) => {
                if (resizingField) {
                  handleResizeTouchMove(e);
                } else {
                  handleTouchMove(e);
                }
              }}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
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
                  {currentPageFields.map(field => {
                    // 🔥 FIX: Use PERCENTAGE positioning based on normalized coordinates!
                    // This ensures fields stay at the same relative position regardless of zoom
                    const usePercent = field.nx !== undefined && field.ny !== undefined;

                    // Percentage values (0-100%)
                    const leftPercent = usePercent ? (field.nx! * 100) : (field.x / (pdfOriginal?.width || 595) * 100);
                    const topPercent = usePercent ? (field.ny! * 100) : (field.y / (pdfOriginal?.height || 842) * 100);
                    const widthPercent = usePercent ? (field.nwidth! * 100) : (field.width / (pdfOriginal?.width || 595) * 100);
                    const heightPercent = usePercent ? (field.nheight! * 100) : (field.height / (pdfOriginal?.height || 842) * 100);

                    return (
                    <motion.div
                      key={field.id}
                      className={`${styles.signatureField} ${draggingField === field.id ? styles.dragging : ''}`}
                      style={{
                        left: `${leftPercent}%`,
                        top: `${topPercent}%`,
                        width: `${widthPercent}%`,
                        height: `${heightPercent}%`,
                        borderColor: getSignerColor(field.assigneeEmail),
                        backgroundColor: `${getSignerColor(field.assigneeEmail)}15`,
                      }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      onMouseDown={e => handleFieldMouseDown(e, field)}
                      onTouchStart={e => handleFieldTouchStart(e, field)}
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
                      {/* 🔥 RESIZE HANDLE */}
                      <div
                        className={`${styles.resizeHandle} ${resizingField === field.id ? styles.resizing : ''}`}
                        onMouseDown={(e) => handleResizeMouseDown(e, field)}
                        onTouchStart={(e) => handleResizeTouchStart(e, field)}
                        title="Größe ändern"
                      />
                    </motion.div>
                    );
                  })}
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
              disabled={zoomLevel <= 25}
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
