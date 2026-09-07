import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileCheck, RefreshCw, ArrowRight, Scale, Shield, UserCheck, FolderOpen, X, FileText, Loader2 } from 'lucide-react';
import type { OptimizationMode } from '../../types/optimizerV2';
import { PIPELINE_STAGES } from '../../hooks/useOptimizerV2';
import { apiCall } from '../../utils/api';
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

/* ── Frueher geprueft ────────────────────────────────────────────────
   Der Endpunkt /optimizer-v2/history existiert bereits und versorgt
   heute nur die eigene Historie-Seite. Wer zurueckkommt, will meist an
   eine frueher gepruefte Datei anknuepfen, statt bei null anzufangen. */
interface FruehereAnalyse {
  _id: string;
  fileName: string;
  status: string;
  scores?: { overall: number };
  structure?: { contractTypeLabel?: string; recognizedAs?: string };
  performance?: { clauseCount?: number; optimizedCount?: number };
  createdAt: string;
}

/* ── Eigene Vertraege ────────────────────────────────────────────────
   ⚠️ NUR Vertraege MIT hinterlegter Datei anbieten. Der Vorlade-Weg in
   OptimizerV2.tsx bricht bei fehlendem s3Key STILL ab (return ohne
   Meldung), die Ablageflaeche bliebe einfach leer. Wer hier nichts
   auswaehlen kann, versteht wenigstens warum. */
interface EigenerVertrag {
  _id: string;
  name?: string;
  fileName?: string;
  s3Key?: string;
  createdAt?: string;
}

function alterText(iso: string): string {
  const tage = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (tage <= 0) return 'heute';
  if (tage === 1) return 'gestern';
  if (tage < 7) return `vor ${tage} Tagen`;
  if (tage < 14) return 'vor 1 Woche';
  if (tage < 31) return `vor ${Math.floor(tage / 7)} Wochen`;
  return new Date(iso).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function wertStufe(score: number): 'Gut' | 'Mittel' | 'Schlecht' {
  if (score >= 75) return 'Gut';
  if (score >= 50) return 'Mittel';
  return 'Schlecht';
}

export default function UploadSection({ file, onFileSelect, onStartAnalysis, isAnalyzing, disabled }: Props) {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [perspective, setPerspective] = useState<OptimizationMode>('neutral');
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [frueher, setFrueher] = useState<FruehereAnalyse[]>([]);
  const [wahlOffen, setWahlOffen] = useState(false);
  const [vertraege, setVertraege] = useState<EigenerVertrag[] | null>(null);
  const [vertraegeLaden, setVertraegeLaden] = useState(false);

  /* Frueher geprueft laden. Faellt der Aufruf aus, bleibt der Abschnitt
     einfach weg; er ist eine Zugabe, kein Teil des Ablaufs. */
  useEffect(() => {
    // Ohne Premium antwortet /optimizer-v2/history mit einer Absage
    // (checkSubscription am Mount). Dann gar nicht erst fragen.
    if (disabled) return;
    let abgebrochen = false;
    (async () => {
      try {
        const daten = await apiCall('/optimizer-v2/history') as { success?: boolean; results?: FruehereAnalyse[] };
        if (abgebrochen) return;
        const fertige = (daten?.results || []).filter(r => r.status === 'completed' && r.scores?.overall);
        setFrueher(fertige.slice(0, 3));
      } catch {
        /* stumm: der Abschnitt entfaellt dann */
      }
    })();
    return () => { abgebrochen = true; };
  }, [disabled]);

  const oeffneWahl = useCallback(async () => {
    setWahlOffen(true);
    if (vertraege !== null) return;
    setVertraegeLaden(true);
    try {
      const daten = await apiCall('/contracts?limit=60') as { contracts?: EigenerVertrag[] };
      // Nur mit Datei: sonst laeuft der Vorlade-Weg ins Leere.
      setVertraege((daten?.contracts || []).filter(v => Boolean(v.s3Key)));
    } catch {
      setVertraege([]);
    } finally {
      setVertraegeLaden(false);
    }
  }, [vertraege]);

  /* Bewusst ueber die Adresszeile statt eigener Ladelogik: den Weg
     /optimizer?contractId=… gibt es schon und er ist erprobt. */
  const waehleVertrag = useCallback((id: string) => {
    setWahlOffen(false);
    navigate(`/optimizer?contractId=${id}`, { replace: true });
  }, [navigate]);

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
          <h1 className={styles.owTitel}>Vertrag optimieren</h1>
          <p className={styles.owUnter}>
            Die KI prüft jede Klausel einzeln, erklärt sie und schlägt eine bessere Formulierung vor.
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
            <>
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

              <div className={styles.owOder}>oder</div>

              <button
                className={styles.owAusVertraegen}
                onClick={oeffneWahl}
                disabled={disabled || isAnalyzing}
              >
                <span className={styles.owAusVertraegenLinks}>
                  <FolderOpen size={16} />
                  <span>Aus <span className={styles.owAusVertraegenStark}>meinen Verträgen</span> wählen</span>
                </span>
                <ArrowRight size={15} />
              </button>
            </>
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

      {/* ── Was dann passiert ──────────────────────────────────────── */}
      <div className={styles.owAblauf}>
        <p className={styles.owZonenTitel}>Was dann passiert</p>
        <div className={styles.owStufen}>
          {PIPELINE_STAGES.map(stufe => (
            <div key={stufe.number} className={styles.owStufe}>
              <span className={styles.owStufeNr}>{stufe.number}</span>
              <p className={styles.owStufeName}>{stufe.name}</p>
              <p className={styles.owStufeText}>{stufe.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Zuletzt geprüft ────────────────────────────────────────── */}
      {frueher.length > 0 && (
        <div className={styles.owHist}>
          <div className={styles.owHistKopf}>
            <p className={styles.owZonenTitel}>Zuletzt geprüft</p>
            <button className={styles.owHistAlle} onClick={() => navigate('/optimizer-history')}>
              Alle ansehen →
            </button>
          </div>
          <div className={styles.owHistKarten}>
            {frueher.map(eintrag => {
              const wert = eintrag.scores?.overall ?? 0;
              const stufe = wertStufe(wert);
              const klauseln = eintrag.performance?.clauseCount;
              const vorschlaege = eintrag.performance?.optimizedCount;
              return (
                <button
                  key={eintrag._id}
                  className={styles.owHistKarte}
                  onClick={() => navigate(`/optimizer?result=${eintrag._id}`)}
                >
                  <span className={styles.owHistOben}>
                    <span className={styles.owHistText}>
                      <span className={styles.owHistName} title={eintrag.fileName}>{eintrag.fileName}</span>
                      {(eintrag.structure?.contractTypeLabel || eintrag.structure?.recognizedAs) && (
                        <span className={styles.owHistTyp}>
                          {eintrag.structure.recognizedAs || eintrag.structure.contractTypeLabel}
                        </span>
                      )}
                    </span>
                    <span className={`${styles.owHistWert} ${styles['owWert' + stufe]}`}>{wert}</span>
                  </span>
                  <span className={styles.owHistBalken}>
                    <span
                      className={`${styles.owHistBalkenFuell} ${styles['owFuell' + stufe]}`}
                      style={{ width: `${Math.max(0, Math.min(100, wert))}%` }}
                    />
                  </span>
                  <span className={styles.owHistUnten}>
                    <span className={styles.owHistUntenLinks}>
                      {typeof klauseln === 'number' ? `${klauseln} Klauseln` : 'Analyse'}
                      {typeof vorschlaege === 'number' ? ` · ${vorschlaege} Vorschläge` : ''}
                    </span>
                    <span className={styles.owHistUntenRechts}>{alterText(eintrag.createdAt)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Auswahl aus den eigenen Verträgen ──────────────────────── */}
      {wahlOffen && (
        <div
          className={styles.owWahlHuelle}
          onClick={() => setWahlOffen(false)}
          role="presentation"
        >
          <div
            className={styles.owWahl}
            onClick={e => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Vertrag auswählen"
          >
            <div className={styles.owWahlKopf}>
              <div>
                <p className={styles.owWahlTitel}>Aus meinen Verträgen</p>
                <p className={styles.owWahlUnter}>
                  Nur Verträge mit hinterlegter Datei lassen sich prüfen.
                </p>
              </div>
              <button className={styles.owWahlZu} onClick={() => setWahlOffen(false)} aria-label="Schließen">
                <X size={17} />
              </button>
            </div>

            <div className={styles.owWahlListe}>
              {vertraegeLaden && (
                <p className={styles.owWahlLeer}>
                  <Loader2 size={18} className={styles.spinIcon} />
                  <br />Verträge werden geladen…
                </p>
              )}
              {!vertraegeLaden && vertraege !== null && vertraege.length === 0 && (
                <p className={styles.owWahlLeer}>
                  Keiner deiner Verträge hat eine hinterlegte Datei.
                  <br />Lade den Vertrag oben direkt hoch.
                </p>
              )}
              {!vertraegeLaden && (vertraege || []).map(vertrag => (
                <button
                  key={vertrag._id}
                  className={styles.owWahlEintrag}
                  onClick={() => waehleVertrag(vertrag._id)}
                >
                  <span className={styles.owWahlSymbol}>
                    <FileText size={15} />
                  </span>
                  <span className={styles.owWahlText}>
                    <span
                      className={styles.owWahlName}
                      title={vertrag.name || vertrag.fileName || 'Unbenannter Vertrag'}
                    >
                      {vertrag.name || vertrag.fileName || 'Unbenannter Vertrag'}
                    </span>
                    {vertrag.createdAt && (
                      <span className={styles.owWahlMeta}>hinzugefügt {alterText(vertrag.createdAt)}</span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
