import React, { useCallback, useState, useRef } from 'react';
import { Upload, Shield, Lightbulb, Download, Sparkles, CheckCircle, RefreshCw } from 'lucide-react';
import NegotiationModeSelector from './NegotiationModeSelector';
import type { OptimizationMode } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onStartAnalysis: (file: File, perspective: string) => void;
  isAnalyzing: boolean;
  disabled?: boolean;
}

const FEATURE_PILLS = [
  { icon: Shield, label: 'Risiko-Erkennung' },
  { icon: Lightbulb, label: 'Klausel-Vorschläge' },
  { icon: Download, label: 'PDF-Export' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/heic',
  'image/heif',
  'image/webp',
  'image/tiff'
];

export default function UploadSection({ file, onFileSelect, onStartAnalysis, isAnalyzing, disabled }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [perspective, setPerspective] = useState<OptimizationMode>('neutral');
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((f: File): string | null => {
    const isImage = f.type.startsWith('image/');
    if (!ALLOWED_TYPES.includes(f.type) && !f.name.endsWith('.docx') && !isImage) {
      return 'Nur PDF, DOCX und Bilddateien (JPG, PNG) werden unterstützt';
    }
    if (f.size > MAX_FILE_SIZE) {
      return 'Datei ist zu groß (max. 10 MB)';
    }
    return null;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;
    const error = validateFile(droppedFile);
    if (error) {
      setFileError(error);
      return;
    }
    setFileError(null);
    onFileSelect(droppedFile);
  }, [onFileSelect, validateFile]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    const error = validateFile(selected);
    if (error) {
      setFileError(error);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFileError(null);
    onFileSelect(selected);
  }, [onFileSelect, validateFile]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className={styles.uploadPage}>
      {/* Hero Header — floats on gradient background, NOT inside a card */}
      <div className={styles.uploadHero}>
        <div className={styles.uploadHeroIcon}>
          <Sparkles size={36} />
        </div>
        <h1 className={styles.uploadHeroTitle}>
          <span className={styles.uploadHeroGradient}>Contract Intelligence</span>
        </h1>
        <p className={styles.uploadHeroDesc}>
          Lade deinen Vertrag hoch für eine KI-gestützte Tiefenanalyse mit Risikobewertung, Scoring und Optimierungsvorschlägen.
        </p>
        <div className={styles.uploadFeaturePills}>
          {FEATURE_PILLS.map(({ icon: Icon, label }) => (
            <div key={label} className={styles.uploadFeaturePill}>
              <Icon size={16} />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upload Card — separate glassmorphism card */}
      <div className={styles.uploadCard}>
        {!file ? (
          <>
            <div
              className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
              onDragOver={(e) => { if (!disabled) { e.preventDefault(); setIsDragging(true); } }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={disabled ? undefined : handleDrop}
              onClick={() => !disabled && fileInputRef.current?.click()}
              style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
            >
              <div className={styles.dropZoneIconWrapper}>
                <Upload size={32} />
              </div>
              <p className={styles.dropZoneTitle}>Vertrag hochladen</p>
              <p className={styles.dropZoneSubtitle}>Datei hierher ziehen oder klicken</p>
              <div className={styles.uploadFormats}>
                <span className={styles.formatTag}>PDF</span>
                <span className={styles.formatTag}>DOCX</span>
                <span className={styles.formatTag}>JPG</span>
                <span className={styles.formatTag}>PNG</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,.tiff"
                onChange={handleFileInput}
                style={{ display: 'none' }}
              />
            </div>

            {fileError && (
              <p style={{ color: '#ef4444', fontSize: '0.875rem', margin: '0.5rem 0 0' }}>{fileError}</p>
            )}

            <button
              className={styles.analyzeButton}
              onClick={() => fileInputRef.current?.click()}
              disabled={isAnalyzing || disabled}
            >
              Jetzt analysieren
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <div className={styles.dropZoneFile}>
              <div className={styles.dropZoneIconWrapperSuccess}>
                <CheckCircle size={32} />
              </div>
              <p className={styles.dropZoneTitle}>{file.name}</p>
              <p className={styles.dropZoneSubtitle}>
                {formatFileSize(file.size)} &bull; Bereit zur Analyse
              </p>
              {!isAnalyzing && (
                <button className={styles.changeFileBtn} onClick={() => onFileSelect(null)}>
                  <RefreshCw size={14} />
                  Andere Datei wählen
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
              disabled={isAnalyzing || disabled}
            >
              {isAnalyzing ? 'Analysiere...' : 'Jetzt analysieren'}
              {!isAnalyzing && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
