import React, { useCallback, useState, useRef } from 'react';
import { Upload, FileCheck, RefreshCw, ArrowRight, Scale, Shield, UserCheck } from 'lucide-react';
import type { OptimizationMode } from '../../types/optimizerV2';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  file: File | null;
  onFileSelect: (file: File | null) => void;
  onStartAnalysis: (file: File, perspective: string) => void;
  isAnalyzing: boolean;
  disabled?: boolean;
}

/**
 * 07.09.2026: Die Perspektive stand bisher klein unter der Ablageflaeche
 * und erschien erst NACH dem Hochladen. Sie ist aber die folgenreichste
 * Entscheidung der Strecke, denn sie bestimmt, welche der drei erzeugten
 * Fassungen jeder Klausel angezeigt wird. Deshalb steht sie jetzt
 * gleichberechtigt neben der Ablageflaeche und ist von Anfang an sichtbar.
 *
 * Die Beschriftungen sind aus Sicht des Nutzers formuliert. Wer einen
 * Vertrag zugeschickt bekommt, konnte bei "Pro Ersteller" / "Pro
 * Empfaenger" nicht wissen, was er selbst ist.
 *
 * WICHTIG: Die Werte, die an den Server gehen, bleiben unveraendert
 * (neutral / creator / recipient). Nur die Beschriftung aendert sich.
 */
const PERSPEKTIVEN: { wert: OptimizationMode; name: string; text: string; icon: React.ElementType }[] = [
  {
    wert: 'neutral',
    name: 'Ausgewogen',
    text: 'Formulierungen, die für beide Seiten tragbar sind.',
    icon: Scale
  },
  {
    wert: 'proCreator',
    name: 'Für mich als Anbieter',
    text: 'Ich stelle den Vertrag und will meine Position stärken.',
    icon: Shield
  },
  {
    wert: 'proRecipient',
    name: 'Für mich als Kunde',
    text: 'Ich habe den Vertrag bekommen und will ihn nicht so unterschreiben.',
    icon: UserCheck
  }
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

  /* Unveraendert gegenueber vorher: die drei internen Namen werden auf die
     Werte abgebildet, die der Server erwartet. */
  const serverWert = (m: OptimizationMode) =>
    m === 'proCreator' ? 'creator' : m === 'proRecipient' ? 'recipient' : 'neutral';

  return (
    <div className={styles.owSeite}>
      <div className={styles.owKopf}>
        <div className={styles.owKopfText}>
          <h1 className={styles.owTitel}>Vertrag verbessern</h1>
          <p className={styles.owUnter}>
            Die KI prüft jede Klausel einzeln und schlägt eine bessere Formulierung vor.
          </p>
        </div>
      </div>

      <div className={styles.owSchritte}>
        {/* ── Schritt 1: die Datei ─────────────────────────────────── */}
        <div>
          <div className={styles.owSchrittKopf}>
            <span className={styles.owNummer}>1</span>
            <span className={styles.owSchrittTitel}>Dein Vertrag</span>
          </div>

          {!file ? (
            <div
              className={`${styles.owAblage} ${isDragging ? styles.owAblageAktiv : ''} ${disabled ? styles.owAblageGesperrt : ''}`}
              onDragOver={(e) => { if (!disabled) { e.preventDefault(); setIsDragging(true); } }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={disabled ? undefined : handleDrop}
              onClick={() => !disabled && fileInputRef.current?.click()}
              role="button"
              tabIndex={disabled ? -1 : 0}
              onKeyDown={(e) => {
                if (!disabled && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
            >
              <div className={styles.owAblageSymbol}>
                <Upload size={21} />
              </div>
              <p className={styles.owAblageTitel}>Datei hierher ziehen</p>
              <p className={styles.owAblageUnter}>oder klicken zum Auswählen</p>
              <div className={styles.owFormate}>
                <span className={styles.owFormat}>PDF</span>
                <span className={styles.owFormat}>DOCX</span>
                <span className={styles.owFormat}>JPG</span>
                <span className={styles.owFormat}>PNG</span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.jpg,.jpeg,.png,.heic,.heif,.webp,.tiff"
                onChange={handleFileInput}
                hidden
              />
            </div>
          ) : (
            <div className={styles.owDatei}>
              <div className={styles.owDateiSymbol}>
                <FileCheck size={21} />
              </div>
              <p className={styles.owDateiName}>{file.name}</p>
              <p className={styles.owDateiInfo}>
                {formatFileSize(file.size)} &bull; bereit zur Analyse
              </p>
              {!isAnalyzing && (
                <button className={styles.owDateiWechseln} onClick={() => onFileSelect(null)}>
                  <RefreshCw size={13} />
                  Andere Datei wählen
                </button>
              )}
            </div>
          )}

          {fileError && <p className={styles.owFehler} role="alert">{fileError}</p>}
        </div>

        {/* ── Schritt 2: die Perspektive ───────────────────────────── */}
        <div>
          <div className={styles.owSchrittKopf}>
            <span className={styles.owNummer}>2</span>
            <span className={styles.owSchrittTitel}>Aus wessen Sicht?</span>
          </div>

          <div className={styles.owPerspektiven} role="radiogroup" aria-label="Aus wessen Sicht soll optimiert werden?">
            {PERSPEKTIVEN.map(({ wert, name, text, icon: Icon }) => {
              const aktiv = perspective === wert;
              return (
                <button
                  key={wert}
                  type="button"
                  role="radio"
                  aria-checked={aktiv}
                  className={`${styles.owKarte} ${aktiv ? styles.owKarteAn : ''}`}
                  onClick={() => setPerspective(wert)}
                  disabled={disabled || isAnalyzing}
                >
                  <span className={styles.owRadio} />
                  <span className={styles.owKarteInhalt}>
                    <span className={styles.owKarteName}>
                      <Icon size={13} className={styles.owKarteIcon} />
                      {name}
                    </span>
                    <span className={styles.owKarteText}>{text}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Startzeile ─────────────────────────────────────────────── */}
      <div className={styles.owStart}>
        <span className={styles.owStartHinweis}>
          {!file
            ? 'Noch keine Datei ausgewählt'
            : isAnalyzing
              ? 'Die Analyse läuft'
              : `${file.name} wird ${PERSPEKTIVEN.find(p => p.wert === perspective)?.name.toLowerCase()} geprüft`}
        </span>
        <button
          className={styles.owStartKnopf}
          onClick={() => file && onStartAnalysis(file, serverWert(perspective))}
          disabled={!file || isAnalyzing || disabled}
        >
          {isAnalyzing ? 'Analysiere…' : 'Analyse starten'}
          {!isAnalyzing && <ArrowRight size={16} />}
        </button>
      </div>
    </div>
  );
}
