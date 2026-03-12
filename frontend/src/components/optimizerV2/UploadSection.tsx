import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileText, X } from 'lucide-react';
import NegotiationModeSelector from './NegotiationModeSelector';
import type { OptimizationMode } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onStartAnalysis: (file: File, perspective: string) => void;
  isAnalyzing: boolean;
}

export default function UploadSection({ file, onFileSelect, onStartAnalysis, isAnalyzing }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [perspective, setPerspective] = useState<OptimizationMode>('neutral');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === 'application/pdf' || droppedFile.name.endsWith('.docx'))) {
      onFileSelect(droppedFile);
    }
  }, [onFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFileSelect(selected);
  }, [onFileSelect]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className={styles.uploadSection}>
      {!file ? (
        <div
          className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload size={32} className={styles.dropZoneIcon} />
          <p className={styles.dropZoneTitle}>Vertrag hochladen</p>
          <p className={styles.dropZoneSubtitle}>PDF oder DOCX hierher ziehen oder klicken</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>
      ) : (
        <div className={styles.fileSelected}>
          <div className={styles.fileInfo}>
            <FileText size={24} className={styles.fileIcon} />
            <div>
              <p className={styles.fileName}>{file.name}</p>
              <p className={styles.fileSize}>{formatFileSize(file.size)}</p>
            </div>
            {!isAnalyzing && (
              <button className={styles.fileRemove} onClick={() => onFileSelect(null)}>
                <X size={16} />
              </button>
            )}
          </div>

          <div className={styles.perspectiveSection}>
            <p className={styles.perspectiveLabel}>Optimierungsperspektive:</p>
            <NegotiationModeSelector
              activeMode={perspective}
              onModeChange={setPerspective}
              compact
            />
          </div>

          <button
            className={styles.analyzeButton}
            onClick={() => onStartAnalysis(file, perspective === 'proCreator' ? 'creator' : perspective === 'proRecipient' ? 'recipient' : 'neutral')}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyse läuft...' : 'Vertrag analysieren'}
          </button>
        </div>
      )}
    </div>
  );
}
