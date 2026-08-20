// 📁 components/DashboardV2/DashboardFirstRun.tsx
// 🎯 Erstzustand des Dashboards für Konten ohne Verträge (20.08.2026)
//
// Ersetzt hinter dem Feature-Schalter die bisherige Willkommensbox. Idee:
// Der neue Nutzer sieht die ECHTE Dashboard-Struktur (Zahlen, Bereiche,
// Werkzeuge) — nur eben leer — statt einer Sonderseite, die nach dem ersten
// Vertrag für immer verschwindet. Im Zentrum genau EINE Handlung.
//
// Beantwortet die vier Fragen eines neuen Nutzers:
//   Wo bin ich?      → echte Struktur mit Leerzuständen
//   Was tue ich?     → eine große Handlung (Vertrag hinzufügen)
//   Was passiert?    → der Ablauf in drei Schritten
//   Was kostet es?   → Kontingent + Datenschutz, bevor gefragt wird
//
// Der Upload nutzt dasselbe Muster wie das Onboarding-Fenster (POST /api/upload)
// und übergibt danach an die bestehende ?analyze=-Weiterleitung in ContractsV2.

import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Upload, Search, Bell, FileText, Loader2, AlertCircle, CheckCircle,
  ShieldCheck, Clock, MessageSquare, Zap, GitCompare, PenTool, Radar,
  ChevronDown, PencilLine
} from 'lucide-react';
import styles from './DashboardFirstRun.module.css';

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB — identisch zu upload.js/analyze.js
const ALLOWED = ['application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp'];

interface ChecklistState {
  accountCreated?: boolean;
  emailVerified?: boolean;
  firstContractUploaded?: boolean;
  companyProfileComplete?: boolean;
  firstAnalysisComplete?: boolean;
}

interface Props {
  userName: string;
  analysisUsage: { used: number; total: number; remaining: number; isUnlimited: boolean };
  checklist?: ChecklistState;
  onUploaded?: () => void;
}

const SETUP_TASKS: Array<{ key: keyof ChecklistState; label: string; hint: string }> = [
  { key: 'accountCreated', label: 'Konto erstellt', hint: '' },
  { key: 'emailVerified', label: 'E-Mail bestätigt', hint: '' },
  { key: 'firstContractUploaded', label: 'Ersten Vertrag hinzufügen', hint: 'Das ist der Schritt, der gerade oben ansteht' },
  { key: 'firstAnalysisComplete', label: 'Erste Analyse starten', hint: 'Läuft direkt nach dem Hinzufügen' },
  { key: 'companyProfileComplete', label: 'Profil vervollständigen', hint: 'Nur nötig, wenn du selbst Verträge erstellen möchtest' },
];

export default function DashboardFirstRun({ userName, analysisUsage, checklist, onUploaded }: Props) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [setupOpen, setSetupOpen] = useState(false);

  const done = SETUP_TASKS.filter(t => checklist?.[t.key]).length;
  const totalTasks = SETUP_TASKS.length;
  const openCount = totalTasks - done;
  const ringLength = 76;
  const ringOffset = ringLength - (ringLength * done) / totalTasks;

  const freeLeft = analysisUsage.isUnlimited ? null : Math.max(0, analysisUsage.remaining);

  const handleFile = useCallback(async (file: File) => {
    if (!ALLOWED.includes(file.type)) {
      setErrorMsg('Bitte eine PDF-, Word- oder Bilddatei auswählen.');
      setState('error');
      return;
    }
    if (file.size > MAX_SIZE) {
      setErrorMsg('Die Datei ist größer als 50 MB.');
      setState('error');
      return;
    }

    setState('uploading');
    setErrorMsg(null);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Der Upload hat nicht geklappt.');
      }

      const data = await response.json();
      const contractId = data.contract?._id || data.contractId;
      onUploaded?.();

      // Übergabe an die bestehende Analyse-Weiterleitung (Limit-Prüfung, Overlay,
      // Ergebnis-Ansicht laufen dort). Ohne ID: wenigstens in die Liste führen.
      navigate(contractId ? `/contracts?analyze=${contractId}` : '/contracts');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Der Upload hat nicht geklappt.');
      setState('error');
    }
  }, [navigate, onUploaded]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className={styles.wrap}>
      {/* ===== Einrichtung — zugeklappt, solange die Hauptkarte dasselbe verlangt ===== */}
      {openCount > 0 && (
        <div className={`${styles.setup} ${setupOpen ? styles.setupOpen : ''}`}>
          <button className={styles.setupBar} onClick={() => setSetupOpen(o => !o)} aria-expanded={setupOpen}>
            <span className={styles.ring}>
              <svg width="30" height="30" aria-hidden="true">
                <circle cx="15" cy="15" r="12" fill="none" stroke="#E5E7EB" strokeWidth="2.5" />
                <circle cx="15" cy="15" r="12" fill="none" stroke="#3B82F6" strokeWidth="2.5"
                  strokeLinecap="round" strokeDasharray={ringLength} strokeDashoffset={ringOffset}
                  transform="rotate(-90 15 15)" />
              </svg>
              <span className={styles.ringTxt}>{done}/{totalTasks}</span>
            </span>
            <span className={styles.setupTexts}>
              <b>Einrichtung</b>
              <span>
                {done >= 2 ? 'Konto und E-Mail sind erledigt · ' : ''}
                noch {openCount} {openCount === 1 ? 'Schritt' : 'Schritte'}
              </span>
            </span>
            <ChevronDown size={18} className={styles.chev} />
          </button>

          {setupOpen && (
            <div className={styles.setupBody}>
              {SETUP_TASKS.map(task => {
                const isDone = Boolean(checklist?.[task.key]);
                return (
                  <div key={task.key} className={`${styles.task} ${isDone ? styles.taskDone : ''}`}>
                    <span className={`${styles.tDot} ${isDone ? styles.tDotDone : ''}`}>
                      {isDone && <CheckCircle size={13} />}
                    </span>
                    <span className={styles.tTxt}>
                      <b>{task.label}</b>
                      {!isDone && task.hint && <span>{task.hint}</span>}
                    </span>
                    {!isDone && task.key === 'companyProfileComplete' && (
                      <button className={styles.tBtn} onClick={() => navigate('/company-profile')}>Ausfüllen</button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ===== Zahlenreihe — echte Struktur, nur noch ohne Inhalt ===== */}
      <div className={styles.statsRow}>
        <div className={styles.statCard}>
          <span className={styles.statIcon}><FileText size={18} /></span>
          <span className={styles.statValue}>–</span>
          <span className={styles.statLabel}>Verträge</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconGreen}`}><CheckCircle size={18} /></span>
          <span className={styles.statValue}>–</span>
          <span className={styles.statLabel}>Aktiv</span>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconOrange}`}><Bell size={18} /></span>
          <span className={styles.statValue}>–</span>
          <span className={styles.statLabel}>Fristen</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCardActive}`}>
          <span className={`${styles.statIcon} ${styles.statIconBlue}`}><Zap size={18} /></span>
          <span className={styles.statValue}>
            {analysisUsage.isUnlimited ? '∞' : freeLeft}
          </span>
          <span className={styles.statLabel}>
            {analysisUsage.isUnlimited ? 'Analysen' : 'Analysen frei'}
          </span>
        </div>
      </div>

      {/* ===== Die eine Handlung ===== */}
      <div className={styles.mainRow}>
        <motion.div
          className={styles.main}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className={styles.mainTop}>
            <h2>Willkommen, {userName} — starten wir mit deinem ersten Vertrag</h2>
            <p>Wir erkennen den Vertragstyp automatisch und prüfen ihn auf Risiken, Fristen und Auffälligkeiten.</p>
          </div>

          <div className={styles.flow}>
            <span className={styles.fStep}>
              <span className={`${styles.fNum} ${styles.fNumA}`}>1</span>
              <span className={styles.fTxt}><b>Hinzufügen</b>PDF, Word oder Foto</span>
            </span>
            <span className={styles.fArrow} aria-hidden="true">→</span>
            <span className={styles.fStep}>
              <span className={`${styles.fNum} ${styles.fNumB}`}>2</span>
              <span className={styles.fTxt}><b>Ergebnis in 2–3 Minuten</b>Risiken, Fristen, Bewertung</span>
            </span>
            <span className={styles.fArrow} aria-hidden="true">→</span>
            <span className={styles.fStep}>
              <span className={`${styles.fNum} ${styles.fNumC}`}>3</span>
              <span className={styles.fTxt}>
                <b>Wir passen auf die Fristen auf <span className={styles.fFree}>immer frei</span></b>
                E-Mail vor jeder Kündigungsfrist
              </span>
            </span>
          </div>

          <div
            className={`${styles.dropzone} ${dragOver ? styles.dropzoneOver : ''} ${state === 'error' ? styles.dropzoneError : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => state !== 'uploading' && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && state !== 'uploading') fileInputRef.current?.click(); }}
          >
            {state === 'uploading' ? (
              <>
                <span className={styles.dzIcon}><Loader2 size={22} className={styles.spin} /></span>
                <b>Wird hochgeladen …</b>
                <span>Gleich geht es zur Analyse</span>
              </>
            ) : state === 'error' ? (
              <>
                <span className={`${styles.dzIcon} ${styles.dzIconError}`}><AlertCircle size={22} /></span>
                <b>{errorMsg}</b>
                <span>Klicke hier, um es erneut zu versuchen</span>
              </>
            ) : (
              <>
                <span className={styles.dzIcon}><Upload size={22} /></span>
                <b className={styles.dzTitleDesktop}>Datei hierher ziehen</b>
                <b className={styles.dzTitleMobile}>Vertrag auswählen</b>
                <span className={styles.dzHintDesktop}>PDF, Word oder Foto · bis 50 MB</span>
                <span className={styles.dzHintMobile}>Aus Dateien oder direkt fotografieren</span>
                <span className={styles.dzBtn}>
                  <Search size={15} />
                  Datei auswählen
                </span>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.heic,.webp"
            style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
          />

          <div className={styles.mainFoot}>
            <span className={styles.vItem}><ShieldCheck size={14} className={styles.vGreen} />Server in Deutschland · <b>jederzeit löschbar</b></span>
            <span className={styles.vItem}><Clock size={14} className={styles.vBlue} />Dauert <b>2–3 Minuten</b></span>
            <span className={styles.vItem}><CheckCircle size={14} className={styles.vBlue} /><b>Kein Abo nötig</b></span>
          </div>
        </motion.div>

        {/* ===== Nebenwege ===== */}
        <div className={styles.side}>
          {!analysisUsage.isUnlimited && (
            <div className={styles.quotaCard}>
              <div className={styles.quotaHead}>
                <b>{freeLeft}</b>
                <span>{freeLeft === 1 ? 'Analyse frei' : 'Analysen frei'}</span>
              </div>
              <div className={styles.quotaTrack}>
                <div className={styles.quotaFill} style={{ width: `${(freeLeft ?? 0) / (analysisUsage.total || 3) * 100}%` }} />
              </div>
              <p>Sie verfallen nicht und du brauchst keine Zahlungsdaten.</p>
            </div>
          )}

          <button className={styles.sideCard} onClick={() => navigate('/generate')}>
            <span className={`${styles.sIcon} ${styles.sIconGreen}`}><PencilLine size={16} /></span>
            <h3>Lieber selbst erstellen?</h3>
            <p>Über 17 geprüfte Vorlagen vom Arbeitsvertrag bis zur Geheimhaltungsvereinbarung.</p>
            <span className={styles.sGo}>Vorlagen ansehen →</span>
          </button>
        </div>
      </div>

      {/* ===== Ausblick: das ganze Werkzeug, ohne Preis und ohne Schloss ===== */}
      <div className={styles.outlook}>
        <div className={styles.outlookTop}>
          <b>Das kommt danach</b>
          <span>Sobald dein erster Vertrag da ist, stehen dir diese Werkzeuge offen</span>
        </div>
        <div className={styles.outlookRow}>
          <span className={styles.oItem}>
            <span className={styles.oIcon}><MessageSquare size={14} /></span>
            <span className={styles.oTxt}><b>Fragen stellen</b><span>5 Fragen frei</span></span>
          </span>
          <span className={styles.oItem}>
            <span className={styles.oIcon}><Zap size={14} /></span>
            <span className={styles.oTxt}><b>Optimieren</b><span>Bessere Konditionen</span></span>
          </span>
          <span className={styles.oItem}>
            <span className={styles.oIcon}><GitCompare size={14} /></span>
            <span className={styles.oTxt}><b>Vergleichen</b><span>Zwei Fassungen</span></span>
          </span>
          <span className={styles.oItem}>
            <span className={styles.oIcon}><PenTool size={14} /></span>
            <span className={styles.oTxt}><b>Signieren</b><span>Rechtsgültig</span></span>
          </span>
          <span className={styles.oItem}>
            <span className={styles.oIcon}><Radar size={14} /></span>
            <span className={styles.oTxt}><b>Rechts-Radar</b><span>Gesetzesänderungen</span></span>
          </span>
        </div>
      </div>
    </div>
  );
}
