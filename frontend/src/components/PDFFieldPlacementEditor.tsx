// 📝 PDFFieldPlacementEditor.tsx - DocuSign-Style PDF Field Placement
import React, { useState, useRef, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { motion, AnimatePresence } from 'framer-motion';
import { PenTool, Calendar, Type, FileSignature, Trash2, Plus } from 'lucide-react';
import styles from '../styles/PDFFieldPlacementEditor.module.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [, setPdfLoading] = useState<boolean>(true); // Used by onDocumentLoadSuccess
  const [selectedFieldType, setSelectedFieldType] = useState<'signature' | 'initial' | 'date' | 'text'>('signature');
  const [selectedSigner, setSelectedSigner] = useState<string>(signers[0]?.email || '');
  const [draggingField, setDraggingField] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const pdfPageWrapperRef = useRef<HTMLDivElement>(null);
  const [pdfDimensions, setPdfDimensions] = useState({ width: 0, height: 0 });

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

  const onPageLoadSuccess = (page: { width: number; height: number }) => {
    const { width, height } = page;
    setPdfDimensions({ width, height });
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

    if (!pdfPageWrapperRef.current) return;

    const pageRect = pdfPageWrapperRef.current.getBoundingClientRect();
    const mouseX = e.clientX - pageRect.left;
    const mouseY = e.clientY - pageRect.top;

    // Calculate offset from mouse to field's current position
    setDragOffset({
      x: mouseX - field.x,
      y: mouseY - field.y,
    });
    setDraggingField(field.id);
  };

  // Drag field
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingField || !pdfPageWrapperRef.current) return;

    const pageRect = pdfPageWrapperRef.current.getBoundingClientRect();
    const newX = e.clientX - pageRect.left - dragOffset.x;
    const newY = e.clientY - pageRect.top - dragOffset.y;

    // Constrain to PDF bounds
    const field = fields.find(f => f.id === draggingField);
    if (!field) return;

    const maxX = pdfDimensions.width - field.width;
    const maxY = pdfDimensions.height - field.height;

    const constrainedX = Math.max(0, Math.min(newX, maxX));
    const constrainedY = Math.max(0, Math.min(newY, maxY));

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

  // Get signer color
  const getSignerColor = (email: string): string => {
    const signer = signers.find(s => s.email === email);
    return signer?.color || '#2E6CF6';
  };

  // Filter fields for current page
  const currentPageFields = fields.filter(f => f.page === currentPage);

  return (
    <div className={styles.editorContainer}>
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
                width={800}
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
                        left: field.x,
                        top: field.y,
                        width: field.width,
                        height: field.height,
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
