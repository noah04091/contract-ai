/**
 * AttachmentBlock - Anlage-Verweis mit Datei-Upload
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
  Loader2
} from 'lucide-react';
import styles from './AttachmentBlock.module.css';

interface AttachmentBlockProps {
  blockId: string;
  content: BlockContent;
  isSelected: boolean;
  isPreview: boolean;
}

type EditingField = 'title' | 'description' | null;

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

// Helper: Titel aus Dateiname extrahieren
function extractTitleFromFilename(filename: string, existingNumber?: string): string {
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  const cleanName = nameWithoutExt.replace(/[_-]/g, ' ');
  const number = existingNumber || 'Anlage 1';
  return `${number} - ${cleanName}`;
}

export const AttachmentBlock: React.FC<AttachmentBlockProps> = ({
  blockId,
  content,
  isSelected,
  isPreview,
}) => {
  const {
    attachmentTitle,
    attachmentDescription,
    attachmentFile,
    attachmentFileName,
    attachmentFileSize,
    attachmentFileType
  } = content;

  const updateBlockContent = useContractBuilderStore((state) => state.updateBlockContent);
  const syncVariables = useContractBuilderStore((state) => state.syncVariables);

  const [editingField, setEditingField] = useState<EditingField>(null);
  const [editValue, setEditValue] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingField) {
      if (editingField === 'description') {
        textareaRef.current?.focus();
        textareaRef.current?.select();
      } else {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }
  }, [editingField]);

  const handleDoubleClick = useCallback((field: EditingField, currentValue: string) => {
    if (isPreview) return;
    setEditingField(field);
    setEditValue(currentValue);
  }, [isPreview]);

  const handleSave = useCallback(() => {
    if (!editingField) return;

    if (editingField === 'title') {
      updateBlockContent(blockId, { attachmentTitle: editValue });
    } else if (editingField === 'description') {
      updateBlockContent(blockId, { attachmentDescription: editValue });
    }

    syncVariables();
    setEditingField(null);
    setEditValue('');
  }, [editingField, editValue, blockId, updateBlockContent, syncVariables]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setEditingField(null);
      setEditValue('');
    }
  }, [handleSave]);

  // Datei-Upload Handler
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validierung: Dateityp
    if (!ALL_SUPPORTED_TYPES.includes(file.type)) {
      setUploadError('Dateityp nicht unterstützt. Erlaubt: PDF, JPG, PNG, WebP, Word, Excel');
      return;
    }

    // Validierung: Dateigröße
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('Datei zu groß. Maximal 10 MB erlaubt.');
      return;
    }

    setIsUploading(true);

    try {
      // Datei als Base64 lesen
      const reader = new FileReader();

      reader.onload = () => {
        const base64 = reader.result as string;

        // Automatischen Titel aus Dateiname extrahieren
        const currentTitle = attachmentTitle || 'Anlage 1';
        const numberMatch = currentTitle.match(/^(Anlage \d+)/);
        const number = numberMatch ? numberMatch[1] : 'Anlage 1';
        const newTitle = extractTitleFromFilename(file.name, number);

        updateBlockContent(blockId, {
          attachmentFile: base64,
          attachmentFileName: file.name,
          attachmentFileSize: file.size,
          attachmentFileType: file.type,
          attachmentTitle: newTitle,
        });

        syncVariables();
        setIsUploading(false);
      };

      reader.onerror = () => {
        setUploadError('Fehler beim Lesen der Datei.');
        setIsUploading(false);
      };

      reader.readAsDataURL(file);
    } catch {
      setUploadError('Fehler beim Hochladen der Datei.');
      setIsUploading(false);
    }

    // Input zurücksetzen
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [blockId, attachmentTitle, updateBlockContent, syncVariables]);

  // Datei entfernen
  const handleRemoveFile = useCallback(() => {
    updateBlockContent(blockId, {
      attachmentFile: undefined,
      attachmentFileName: undefined,
      attachmentFileSize: undefined,
      attachmentFileType: undefined,
    });
  }, [blockId, updateBlockContent]);

  // Icon basierend auf Dateityp
  const getFileIcon = () => {
    if (!attachmentFileType) return <File size={20} />;

    const category = getFileCategory(attachmentFileType);
    switch (category) {
      case 'pdf':
        return <FileText size={20} className={styles.iconPdf} />;
      case 'image':
        return <ImageIcon size={20} className={styles.iconImage} />;
      case 'word':
        return <FileText size={20} className={styles.iconWord} />;
      case 'excel':
        return <FileSpreadsheet size={20} className={styles.iconExcel} />;
      default:
        return <File size={20} />;
    }
  };

  // Prüfen ob Office-Datei (wird separat exportiert)
  const isOfficeFile = attachmentFileType &&
    (SUPPORTED_TYPES.word.includes(attachmentFileType) ||
     SUPPORTED_TYPES.excel.includes(attachmentFileType));

  return (
    <div className={`${styles.attachment} ${isSelected ? styles.selected : ''}`}>
      <div className={styles.attachmentHeader}>
        <Paperclip size={16} className={styles.icon} />
        <span className={styles.attachmentLabel}>Anlage</span>
      </div>

      <h4 className={styles.attachmentTitle}>
        {editingField === 'title' ? (
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
            text={attachmentTitle || 'Anlage 1'}
            isPreview={isPreview}
            onDoubleClick={() => handleDoubleClick('title', attachmentTitle || 'Anlage 1')}
          />
        )}
      </h4>

      <div className={styles.attachmentDescription}>
        {editingField === 'description' ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            className={styles.inlineTextarea}
            rows={Math.max(2, editValue.split('\n').length)}
          />
        ) : (
          <VariableHighlight
            text={attachmentDescription || 'Beschreibung der Anlage...'}
            multiline
            isPreview={isPreview}
            onDoubleClick={() => handleDoubleClick('description', attachmentDescription || '')}
          />
        )}
      </div>

      {/* Datei-Info anzeigen wenn vorhanden */}
      {attachmentFile && attachmentFileName && (
        <div className={styles.fileInfo}>
          <div className={styles.fileDetails}>
            {getFileIcon()}
            <span className={styles.fileName}>{attachmentFileName}</span>
            <span className={styles.fileSize}>
              ({formatFileSize(attachmentFileSize || 0)})
            </span>
          </div>
          {!isPreview && (
            <button
              className={styles.removeButton}
              onClick={handleRemoveFile}
              title="Datei entfernen"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Office-Warnung */}
      {isOfficeFile && (
        <div className={styles.officeWarning}>
          <AlertTriangle size={16} />
          <span>Wird als separate Datei exportiert (nicht in PDF konvertierbar)</span>
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
            ) : (
              <>
                <Upload size={16} />
                <span>{attachmentFile ? 'Datei ersetzen' : 'Datei hochladen'}</span>
              </>
            )}
          </button>
          <span className={styles.uploadHint}>
            PDF, Bilder (JPG, PNG), Word, Excel - max. 10 MB
          </span>
        </div>
      )}

      {/* Fehleranzeige */}
      {uploadError && (
        <div className={styles.error}>
          <AlertTriangle size={16} />
          <span>{uploadError}</span>
        </div>
      )}
    </div>
  );
};

export default AttachmentBlock;
