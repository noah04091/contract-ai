/**
 * AttachmentBlock - Mehrere Anlagen pro Block
 * Unterstützt: PDF, Bilder, Word, Excel
 * PDFs und Bilder werden beim Export automatisch angehängt
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { BlockContent, useContractBuilderStore } from '../../../stores/contractBuilderStore';
import { VariableHighlight } from '../Variables/VariableHighlight';
import {
  Paperclip,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
  AlertTriangle,
  Loader2,
  Plus,
  GripVertical
} from 'lucide-react';
import styles from './AttachmentBlock.module.css';

interface AttachmentBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
  style?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    paddingTop?: number;
    paddingRight?: number;
    paddingBottom?: number;
    paddingLeft?: number;
  };
}

// Typ für einzelne Anlage
interface Attachment {
  id: string;
  title: string;
  description: string;
  file: string;
  fileName: string;
  fileSize: number;
  fileType: string;
}

type EditingState = {
  attachmentId: string;
  field: 'title' | 'description';
} | null;

// Unterstützte Dateitypen
const SUPPORTED_TYPES = {
  pdf: ['application/pdf'],
  image: ['image/jpeg', 'image/png', 'image/webp'],
  word: ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  excel: ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_TYPES.pdf,
  ...SUPPORTED_TYPES.image,
  ...SUPPORTED_TYPES.word,
  ...SUPPORTED_TYPES.excel,
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Helper: Dateityp ermitteln
function getFileCategory(mimeType: string): 'pdf' | 'image' | 'word' | 'excel' | 'unknown' {
  if (SUPPORTED_TYPES.pdf.includes(mimeType)) return 'pdf';
  if (SUPPORTED_TYPES.image.includes(mimeType)) return 'image';
  if (SUPPORTED_TYPES.word.includes(mimeType)) return 'word';
  if (SUPPORTED_TYPES.excel.includes(mimeType)) return 'excel';
  return 'unknown';
}

// Helper: Dateigröße formatieren
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Helper: Eindeutige ID generieren
function generateId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Helper: Titel aus Dateiname extrahieren
function extractTitleFromFilename(filename: string, index: number): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleanName = nameWithoutExt.replace(/[_-]/g, ' ');
  return `Anlage ${index} - ${cleanName}`;
}

export const AttachmentBlock: React.FC<AttachmentBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
  style: blockStyle,
}) => {
  // Legacy-Daten Migration: Alte Einzeldatei zu neuem Array-Format
  const getAttachments = useCallback((): Attachment[] => {
    // Wenn neues attachments-Array existiert, verwende es
    if (content.attachments && content.attachments.length > 0) {
      return content.attachments;
    }

    // Legacy-Migration: Einzelne Datei zu Array konvertieren
    if (content.attachmentFile && content.attachmentFileName) {
      return [{
        id: 'legacy_1',
        title: content.attachmentTitle || 'Anlage 1',
        description: content.attachmentDescription || '',
        file: content.attachmentFile,
        fileName: content.attachmentFileName,
        fileSize: content.attachmentFileSize || 0,
        fileType: content.attachmentFileType || 'application/octet-stream',
      }];
    }

    return [];
  }, [content]);

  const attachments = getAttachments();

  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingState, setEditingState] = useState<EditingState>(null);
  const [editValue, setEditValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Focus auf Input/Textarea wenn Editing startet
  useEffect(() => {
    if (editingState) {
      if (editingState.field === 'description') {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      } else {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
  }, [editingState]);

  // Attachments im Store aktualisieren
  const updateAttachments = useCallback((newAttachments: Attachment[]) => {
    // Lösche Legacy-Felder wenn wir zum neuen Format migrieren
    updateBlockContent(blockId, {
      attachments: newAttachments,
      // Legacy-Felder leeren
      attachmentFile: undefined,
      attachmentFileName: undefined,
      attachmentFileSize: undefined,
      attachmentFileType: undefined,
      attachmentTitle: undefined,
      attachmentDescription: undefined,
    });
    syncVariables();
  }, [blockId, updateBlockContent, syncVariables]);

  // Doppelklick zum Bearbeiten
  const handleDoubleClick = useCallback((attachmentId: string, field: 'title' | 'description', currentValue: string) => {
    if (isPreview) return;
    setEditingState({ attachmentId, field });
    setEditValue(currentValue);
  }, [isPreview]);

  // Bearbeitung speichern
  const handleSave = useCallback(() => {
    if (!editingState) return;

    const newAttachments = attachments.map(att => {
      if (att.id === editingState.attachmentId) {
        return {
          ...att,
          [editingState.field]: editValue,
        };
      }
      return att;
    });

    updateAttachments(newAttachments);
    setEditingState(null);
    setEditValue('');
  }, [editingState, editValue, attachments, updateAttachments]);

  // Keyboard Handler
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingState(null);
      setEditValue('');
    }
  }, [handleSave]);

  // Datei-Upload Handler (unterstützt mehrere Dateien)
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadError(null);
    setIsUploading(true);

    const newAttachments: Attachment[] = [...attachments];
    const errors: string[] = [];

    // Alle ausgewählten Dateien verarbeiten
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validierung: Dateityp
      if (!ALL_SUPPORTED_TYPES.includes(file.type)) {
        errors.push(`${file.name}: Dateityp nicht unterstützt`);
        continue;
      }

      // Validierung: Dateigröße
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name}: Datei zu groß (max. 10 MB)`);
        continue;
      }

      try {
        // Datei als Base64 lesen
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Lesefehler'));
          reader.readAsDataURL(file);
        });

        // Neue Anlage erstellen
        const nextIndex = newAttachments.length + 1;
        const newAttachment: Attachment = {
          id: generateId(),
          title: extractTitleFromFilename(file.name, nextIndex),
          description: '',
          file: base64,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        };

        newAttachments.push(newAttachment);
      } catch {
        errors.push(`${file.name}: Fehler beim Hochladen`);
      }
    }

    // Attachments aktualisieren
    if (newAttachments.length > attachments.length) {
      updateAttachments(newAttachments);
    }

    // Fehler anzeigen
    if (errors.length > 0) {
      setUploadError(errors.join(', '));
    }

    setIsUploading(false);

    // Input zurücksetzen
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [attachments, updateAttachments]);

  // Einzelne Anlage entfernen
  const handleRemoveAttachment = useCallback((attachmentId: string) => {
    const newAttachments = attachments.filter(att => att.id !== attachmentId);
    updateAttachments(newAttachments);
  }, [attachments, updateAttachments]);

  // Titel-Nummer nach oben/unten korrigieren
  const renumberTitles = useCallback(() => {
    const newAttachments = attachments.map((att, index) => {
      // Nur aktualisieren wenn Titel mit "Anlage X" beginnt
      if (att.title.match(/^Anlage \d+/)) {
        return {
          ...att,
          title: att.title.replace(/^Anlage \d+/, `Anlage ${index + 1}`),
        };
      }
      return att;
    });
    updateAttachments(newAttachments);
  }, [attachments, updateAttachments]);

  // Icon basierend auf Dateityp
  const getFileIcon = (fileType: string) => {
    const category = getFileCategory(fileType);
    switch (category) {
      case 'pdf':
        return <FileText size={18} className={styles.iconPdf} />;
      case 'image':
        return <ImageIcon size={18} className={styles.iconImage} />;
      case 'word':
        return <FileText size={18} className={styles.iconWord} />;
      case 'excel':
        return <FileSpreadsheet size={18} className={styles.iconExcel} />;
      default:
        return <File size={18} />;
    }
  };

  // Prüfen ob Office-Datei (wird separat exportiert)
  const isOfficeFile = (fileType: string) => {
    return SUPPORTED_TYPES.word.includes(fileType) || SUPPORTED_TYPES.excel.includes(fileType);
  };

  // Inline-Styles aus Block-Eigenschaften
  const customStyles: React.CSSProperties = {
    ...(blockStyle?.backgroundColor && { backgroundColor: blockStyle.backgroundColor }),
    ...(blockStyle?.borderColor && { borderColor: blockStyle.borderColor }),
    ...(blockStyle?.borderWidth !== undefined && { borderWidth: `${blockStyle.borderWidth}px` }),
    ...(blockStyle?.borderRadius !== undefined && { borderRadius: `${blockStyle.borderRadius}px` }),
    ...(blockStyle?.paddingTop !== undefined && { paddingTop: `${blockStyle.paddingTop}px` }),
    ...(blockStyle?.paddingRight !== undefined && { paddingRight: `${blockStyle.paddingRight}px` }),
    ...(blockStyle?.paddingBottom !== undefined && { paddingBottom: `${blockStyle.paddingBottom}px` }),
    ...(blockStyle?.paddingLeft !== undefined && { paddingLeft: `${blockStyle.paddingLeft}px` }),
  };

  return (
    <div
      className={`${styles.attachment} ${isSelected ? styles.selected : ''} ${isPreview ? styles.preview : ''}`}
      style={customStyles}
    >
      {/* Header - Edit-Modus: Kleiner Header mit Icon */}
      {!isPreview && (
        <div className={styles.attachmentHeader}>
          <Paperclip size={16} className={styles.icon} />
          <span className={styles.attachmentLabel}>
            Anlagen {attachments.length > 0 && `(${attachments.length})`}
          </span>
          {attachments.length > 1 && (
            <button
              className={styles.renumberButton}
              onClick={renumberTitles}
              title="Nummern aktualisieren"
            >
              #
            </button>
          )}
        </div>
      )}

      {/* Header - Preview/PDF-Modus: Professioneller Header wie "UNTERSCHRIFTEN" */}
      {isPreview && attachments.length > 0 && (
        <div className={styles.previewHeader}>
          <div className={styles.previewHeaderLine} />
          <h3 className={styles.previewHeaderTitle}>ANLAGEN</h3>
        </div>
      )}

      {/* Liste der Anlagen */}
      {attachments.length > 0 ? (
        <div className={styles.attachmentList}>
          {attachments.map((attachment, index) => (
            <div key={attachment.id} className={`${styles.attachmentItem} ${isPreview ? styles.previewItem : ''}`}>
              {/* Drag Handle (optional für spätere Sortierung) */}
              {!isPreview && attachments.length > 1 && (
                <div className={styles.dragHandle}>
                  <GripVertical size={14} />
                </div>
              )}

              {/* Preview: Nummerierung links */}
              {isPreview && (
                <div className={styles.previewNumber}>
                  {index + 1}
                </div>
              )}

              {/* Anlage-Inhalt */}
              <div className={styles.attachmentContent}>
                {/* Titel */}
                <div className={styles.attachmentItemTitle}>
                  {editingState?.attachmentId === attachment.id && editingState.field === 'title' ? (
                    <input
                      ref={inputRef}
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={handleSave}
                      onKeyDown={handleKeyDown}
                      className={styles.inlineInput}
                    />
                  ) : (
                    <VariableHighlight
                      text={attachment.title || `Anlage ${index + 1}`}
                      isPreview={isPreview}
                      onDoubleClick={() => handleDoubleClick(attachment.id, 'title', attachment.title)}
                    />
                  )}
                </div>

                {/* Beschreibung - nur anzeigen wenn vorhanden oder im Edit-Modus */}
                {(attachment.description || !isPreview) && (
                  <div className={styles.attachmentItemDescription}>
                    {editingState?.attachmentId === attachment.id && editingState.field === 'description' ? (
                      <textarea
                        ref={textareaRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleSave}
                        onKeyDown={handleKeyDown}
                        className={styles.inlineTextarea}
                        rows={Math.max(2, editValue.split('\n').length)}
                        placeholder="Beschreibung der Anlage..."
                      />
                    ) : (
                      <VariableHighlight
                        text={attachment.description || 'Beschreibung hinzufügen...'}
                        multiline
                        isPreview={isPreview}
                        onDoubleClick={() => handleDoubleClick(attachment.id, 'description', attachment.description)}
                      />
                    )}
                  </div>
                )}

                {/* Datei-Info - nur im Edit-Modus anzeigen */}
                {!isPreview && (
                  <div className={styles.fileInfo}>
                    <div className={styles.fileDetails}>
                      {getFileIcon(attachment.fileType)}
                      <span className={styles.fileName}>{attachment.fileName}</span>
                      <span className={styles.fileSize}>
                        ({formatFileSize(attachment.fileSize)})
                      </span>
                    </div>

                    {/* Office-Warnung */}
                    {isOfficeFile(attachment.fileType) && (
                      <div className={styles.officeWarning}>
                        <AlertTriangle size={14} />
                        <span>Separate Datei</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Entfernen-Button */}
              {!isPreview && (
                <button
                  className={styles.removeButton}
                  onClick={() => handleRemoveAttachment(attachment.id)}
                  title="Anlage entfernen"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyState}>
          <Paperclip size={24} className={styles.emptyIcon} />
          <span>Noch keine Anlagen</span>
        </div>
      )}

      {/* Upload-Bereich (nur im Edit-Modus) */}
      {!isPreview && (
        <div className={styles.uploadSection}>
          <input
            ref={fileInputRef}
            type="file"
            accept={ALL_SUPPORTED_TYPES.join(',')}
            onChange={handleFileSelect}
            className={styles.fileInput}
            disabled={isUploading}
            multiple  // Mehrfachauswahl erlauben
          />
          <button
            className={styles.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                <span>Wird hochgeladen...</span>
              </>
            ) : attachments.length > 0 ? (
              <>
                <Plus size={16} />
                <span>Weitere Anlage hinzufügen</span>
              </>
            ) : (
              <>
                <Upload size={16} />
                <span>Anlagen hochladen</span>
              </>
            )}
          </button>
          <span className={styles.uploadHint}>
            PDF, Bilder (JPG, PNG), Word, Excel - max. 10 MB pro Datei
          </span>
        </div>
      )}

      {/* Fehleranzeige */}
      {uploadError && (
        <div className={styles.error}>
          <AlertTriangle size={16} />
          <span>{uploadError}</span>
          <button
            className={styles.dismissError}
            onClick={() => setUploadError(null)}
          >
            <X size={14} />
          </button>
        </div>
      )}
    </div>
  );
};

export default AttachmentBlock;
