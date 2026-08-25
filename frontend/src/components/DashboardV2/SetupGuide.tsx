// 📁 components/DashboardV2/SetupGuide.tsx
// 🎯 Erststart für neu registrierte Konten (21.08.2026)
//
// Ersetzt die bisherige Kombination aus Checkliste und Willkommensbox durch
// EINE geführte Ansicht. Zwei Blöcke mit klar getrennten Rollen:
//   1. "Deine Einrichtung"  → Wo stehe ich? Was ist jetzt dran?
//   2. "Das kannst du ..."  → Was kann dieses Produkt? (ohne Nummern, damit
//      es nicht mit den Schritten verwechselt wird)
//
// Gestaltungsprinzip: Nur EIN Schritt ist groß. Erledigte stehen als grün
// abgehakte Zeilen da (sichtbarer Fortschritt), der aktuelle Schritt bekommt
// die Bühne samt Ablagefläche, Kommendes bleibt ruhig.
//
// Der Fortschritt zählt vier Kernschritte (Konto, E-Mail, erster Vertrag,
// erste Analyse) und startet dadurch bei 2 von 4 — angefangene Aufgaben
// werden deutlich häufiger beendet als bei null begonnene. Das Profil ist
// bewusst freiwillig und zählt NICHT mit, sonst könnte die Einrichtung bei
// jedem, der nur prüfen will, nie fertig werden.
//
// Upload: dasselbe Muster wie im Onboarding-Fenster (POST /api/upload),
// danach Übergabe an die bestehende ?analyze=-Weiterleitung in ContractsV2 —
// dort laufen Limit-Prüfung, das gewohnte Lade-Overlay und die normale
// Analyse-Ansicht. Bewusst KEINE Zwischenfrage "analysieren oder speichern":
// Der nächste Schritt kündigt die Prüfung an, und die Karte nennt die Kosten
// vorher. Auf der Verträge-Seite bleibt die Wahl unverändert bestehen.

import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check, Upload, Loader2, AlertCircle, Search, Bell, PencilLine,
  MessageSquare, User, ArrowRight, ShieldCheck, Clock, LifeBuoy
} from 'lucide-react';
import styles from './SetupGuide.module.css';
import { checkUploadFile, UPLOAD_ACCEPT_ATTR } from '../../constants/uploadTypes';

// 🔌 EIN-ZEILEN-SCHALTER: auf false setzen, und das Dashboard zeigt sofort
// wieder die bisherige Checkliste samt Willkommensbox. Kein weiterer Eingriff
// nötig, kein Datenverlust.
export const SETUP_GUIDE_ENABLED = true;

// Dateitypen kommen aus der gemeinsamen Quelle, damit dieser Weg und das
// Onboarding-Fenster nicht wieder auseinanderlaufen (siehe constants/uploadTypes.ts).

interface ChecklistState {
  accountCreated?: boolean;
  emailVerified?: boolean;
  firstContractUploaded?: boolean;
  companyProfileComplete?: boolean;
  firstAnalysisComplete?: boolean;
}

interface Props {
  // Kein userName: Die Begrüßung über diesem Bereich nennt den Namen bereits,
  // eine zweite Nennung direkt darunter wirkt aufgesetzt (Noahs Rückmeldung).
  checklist?: ChecklistState;
  freeAnalyses: number | null; // null = unbegrenzt
  // Der Block „Das kannst du machen" nur, solange die Seite sonst leer wäre.
  // Sobald Verträge da sind, zeigt das Dashboard darunter seine eigenen
  // Funktionsbereiche — dann wäre er doppelt.
  showPossibilities?: boolean;
  onUploaded?: () => void;
  onDismiss?: () => void;
}

export default function SetupGuide({ checklist, freeAnalyses, showPossibilities = true, onUploaded, onDismiss }: Props) {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [state, setState] = useState<'idle' | 'uploading' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const hasContract = Boolean(checklist?.firstContractUploaded);
  const hasAnalysis = Boolean(checklist?.firstAnalysisComplete);
  const hasProfile = Boolean(checklist?.companyProfileComplete);

  // Vier Kernschritte; Profil zählt bewusst nicht mit
  const doneCount = 2 + (hasContract ? 1 : 0) + (hasAnalysis ? 1 : 0);
  const openCount = 4 - doneCount;
  const ringLength = 145; // Umfang bei r=23
  const ringOffset = ringLength - (ringLength * doneCount) / 4;

  // Bewusst OHNE Namen: die Begrüßung darüber nennt ihn bereits
  // („Guten Morgen, Tim") — zweimal wirkt aufgesetzt.
  const headline = openCount === 0
    ? 'Alles eingerichtet'
    : openCount === 1
      ? 'Du bist fast fertig'
      : 'Du bist gleich startklar';

  // Der Abschluss-Fall stand vorher nicht drin: Sobald der vierte Schritt fertig war,
  // verschwand der ganze Bereich sofort. Die Zeile hätte dann fälschlich behauptet,
  // es fehle noch die Prüfung.
  const subline = openCount === 0
    ? 'Du kannst jetzt loslegen. Dieser Bereich verschwindet, sobald du ihn schließt.'
    : hasContract
      ? 'Dein erster Vertrag liegt schon da. Jetzt fehlt nur noch die Prüfung.'
      : 'Noch zwei Schritte, danach verschwindet dieser Bereich und du siehst dein Dashboard.';

  const handleFile = useCallback(async (file: File) => {
    const problem = checkUploadFile(file);
    if (problem) {
      setErrorMsg(problem);
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
      navigate(contractId ? `/contracts?analyze=${contractId}` : '/contracts');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Der Upload hat nicht geklappt.');
      setState('error');
    }
  }, [navigate, onUploaded]);

  return (
    <div className={styles.wrap}>
      {/* ================= EINRICHTUNG ================= */}
      <section className={styles.setup}>
        <header className={styles.setupHead}>
          <span className={styles.ring}>
            <svg width="58" height="58" aria-hidden="true">
              <circle cx="29" cy="29" r="23" fill="none" stroke="#DBE7FB" strokeWidth="5" />
              <circle cx="29" cy="29" r="23" fill="none" stroke="#3B82F6" strokeWidth="5"
                strokeLinecap="round" strokeDasharray={ringLength} strokeDashoffset={ringOffset}
                transform="rotate(-90 29 29)" className={styles.ringProgress} />
            </svg>
            <span className={styles.ringTxt}>{doneCount}/4</span>
          </span>
          <div className={styles.setupHeadTxt}>
            <h2>{headline}</h2>
            <p>{subline}</p>
            {/* 🎨 24.08.2026: Der Ring nennt den Stand ("2/4"), zeigt aber nicht, wie
                weit der Weg noch ist. Der Balken macht daraus eine Strecke — man sieht
                auf einen Blick, dass die Hälfte geschafft ist, ohne zu rechnen.
                Im Abschluss-Zustand entfällt er, dort ist der volle Balken nur Lärm. */}
            {openCount > 0 && (
              <div className={styles.progressTrack} role="presentation">
                <div
                  className={styles.progressFill}
                  style={{ width: `${(doneCount / 4) * 100}%` }}
                />
              </div>
            )}
          </div>
          {/* Im Abschluss-Zustand steht der Knopf unten und heißt deutlicher,
              sonst hätte man hier oben und unten zwei Wege zum selben Ziel. */}
          {onDismiss && openCount > 0 && (
            <button className={styles.dismiss} onClick={onDismiss} title="Diesen Bereich dauerhaft ausblenden">
              Ausblenden
            </button>
          )}
        </header>

        <div className={styles.steps}>
          {/* 1 + 2: erledigt */}
          <div className={styles.stepDone}>
            <span className={styles.sdTick}><Check size={14} strokeWidth={3.5} /></span>
            <span className={styles.sdTxt}>
              <b>Konto erstellt</b>
              <span>Du hast dich erfolgreich registriert</span>
            </span>
            <span className={styles.doneTag}>Erledigt</span>
          </div>

          <div className={styles.stepDone}>
            <span className={styles.sdTick}><Check size={14} strokeWidth={3.5} /></span>
            <span className={styles.sdTxt}>
              <b>E-Mail bestätigt</b>
              <span>Deine Adresse ist verifiziert</span>
            </span>
            <span className={styles.doneTag}>Erledigt</span>
          </div>

          {/* 3: Vertrag */}
          {hasContract ? (
            <div className={styles.stepDone}>
              <span className={styles.sdTick}><Check size={14} strokeWidth={3.5} /></span>
              <span className={styles.sdTxt}>
                <b>Erster Vertrag hinzugefügt</b>
                <span>Er liegt sicher in deiner Verwaltung</span>
              </span>
              <span className={styles.doneTag}>Erledigt</span>
            </div>
          ) : (
            <div className={styles.stepActive}>
              <div className={styles.saHead}>
                <span className={styles.saNum}>3</span>
                <span className={styles.saTxt}>
                  <h3>Ersten Vertrag hinzufügen</h3>
                  <p>Wir erkennen den Vertragstyp automatisch, du musst nichts einstellen.</p>
                </span>
                <span className={styles.nowTag}>Jetzt dran</span>
              </div>

              <div
                className={`${styles.drop} ${dragOver ? styles.dropOver : ''} ${state === 'error' ? styles.dropError : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  const f = e.dataTransfer.files?.[0];
                  if (f) handleFile(f);
                }}
                onClick={() => state !== 'uploading' && fileInputRef.current?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && state !== 'uploading') fileInputRef.current?.click(); }}
              >
                {state === 'uploading' ? (
                  <>
                    <span className={styles.dropIcon}><Loader2 size={20} className={styles.spin} /></span>
                    <b>Wird hochgeladen …</b>
                    <span>Gleich beginnt die Prüfung</span>
                  </>
                ) : state === 'error' ? (
                  <>
                    <span className={`${styles.dropIcon} ${styles.dropIconError}`}><AlertCircle size={20} /></span>
                    <b>{errorMsg}</b>
                    <span>Klicke hier, um es erneut zu versuchen</span>
                  </>
                ) : (
                  <>
                    <span className={styles.dropIcon}><Upload size={20} /></span>
                    <b className={styles.dropTitleDesktop}>Datei hierher ziehen</b>
                    <b className={styles.dropTitleMobile}>Vertrag auswählen</b>
                    <span className={styles.dropHintDesktop}>PDF, Word oder Foto · bis 50 MB</span>
                    <span className={styles.dropHintMobile}>Aus Dateien oder direkt fotografieren</span>
                    <span className={styles.dropBtn}>Datei auswählen</span>
                  </>
                )}
              </div>

              {/* ⚠️ 25.08.2026: Ohne die Prüfung auf > 0 stand hier bei aufgebrauchtem
                  Kontingent wörtlich "nutzt eine deiner 0 freien Analysen". Der Fall
                  tritt auf, sobald jemand seine drei Analysen verbraucht hat, ohne dass
                  das Häkchen für die erste Analyse gesetzt wurde. Dann ist die ehrliche
                  Auskunft wichtiger als das Zählen: Der Vertrag wird gespeichert, die
                  Prüfung braucht ein Paket. */}
              {state === 'idle' && (
                <p className={styles.dropNote}>
                  {freeAnalyses !== null && freeAnalyses <= 0 ? (
                    <>Dein Vertrag wird gespeichert. Für die Prüfung brauchst du ein Paket, deine freien Analysen sind aufgebraucht.</>
                  ) : (
                    <>
                      Die Prüfung startet direkt danach
                      {freeAnalyses !== null && <> und nutzt <b>eine deiner {freeAnalyses} freien Analysen</b></>}.
                    </>
                  )}
                </p>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept={UPLOAD_ACCEPT_ATTR}
                style={{ display: 'none' }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
            </div>
          )}

          {/* 4: Analyse */}
          {hasAnalysis ? (
            <div className={styles.stepDone}>
              <span className={styles.sdTick}><Check size={14} strokeWidth={3.5} /></span>
              <span className={styles.sdTxt}>
                <b>Erste Analyse abgeschlossen</b>
                <span>Risiken und Fristen sind erkannt</span>
              </span>
              <span className={styles.doneTag}>Erledigt</span>
            </div>
          ) : hasContract ? (
            <div className={styles.stepActive}>
              <div className={styles.saHead}>
                <span className={styles.saNum}>4</span>
                <span className={styles.saTxt}>
                  <h3>Erste Analyse starten</h3>
                  <p>Risiken, Kündigungsfristen und eine Bewertung, in wenigen Minuten.</p>
                </span>
                <span className={styles.nowTag}>Jetzt dran</span>
              </div>
              <button className={styles.saBtn} onClick={() => navigate('/contracts')}>
                Zu meinen Verträgen
                <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <div className={styles.stepIdle}>
              <span className={styles.siNum}>4</span>
              <span className={styles.siTxt}>
                <b>Erste Analyse</b>
                <span>Risiken, Fristen und eine Bewertung deines Vertrags</span>
              </span>
              <span className={styles.siNote}>startet automatisch</span>
            </div>
          )}

          {/* Freiwillig: Profil.
              Wichtig (Noahs Rückmeldung 23.08.): Wer das Profil ausfüllt, muss den
              Haken SEHEN. Vorher verschwand die Zeile einfach, und erledigte Arbeit
              fühlte sich an, als wäre sie verpufft. Der Punkt bleibt jetzt stehen und
              wechselt in denselben Erledigt-Zustand wie die Kernschritte. */}
          {hasProfile ? (
            <div className={styles.stepDone}>
              <span className={styles.sdTick}><Check size={14} strokeWidth={3.5} /></span>
              <span className={styles.sdTxt}>
                <b>Profil vervollständigt</b>
                <span>Deine Angaben stehen für erstellte Verträge bereit</span>
              </span>
              <span className={styles.doneTag}>Erledigt</span>
            </div>
          ) : (
            <div className={styles.stepOpt}>
              <span className={styles.soIcon}><User size={14} /></span>
              <span className={styles.siTxt}>
                <b>Profil vervollständigen</b>
                <span>Nur nötig, wenn du selbst Verträge erstellen möchtest</span>
              </span>
              <span className={styles.optTag}>freiwillig</span>
              <button className={styles.optBtn} onClick={() => navigate('/company-profile')}>Ausfüllen</button>
            </div>
          )}
        </div>

        {/* 🏁 Abschluss: Der Nutzer schließt selbst. Vorher löste sich der Bereich
            in dem Moment auf, in dem der letzte Schritt fertig war — ohne Bestätigung
            und samt dem freiwilligen Profil-Punkt, der dann nur noch verschwunden war. */}
        {openCount === 0 && onDismiss && (
          <button className={styles.finishBtn} onClick={onDismiss}>
            <Check size={16} strokeWidth={3} />
            Fertig, ausblenden
          </button>
        )}
      </section>

      {/* ================= MÖGLICHKEITEN ================= */}
      {showPossibilities && (
      <section className={styles.can}>
        <header className={styles.canHead}>
          <h2>Das kannst du mit Contract AI machen</h2>
          <p>
            Kurz gesagt: Du legst deine Verträge hier ab, wir lesen sie für dich und
            passen auf die Fristen auf. Alles Weitere ist freiwillig.
          </p>
        </header>

        {/* 🎨 24.08.2026: Vorher standen hier VIER gleich große Kacheln nebeneinander.
            Damit sagte die Fläche "alle vier sind gleich wichtig" — und das stimmt
            für einen neuen Nutzer nicht. Für ihn zählt genau eine Sache: den ersten
            Vertrag prüfen zu lassen. Alles andere ergibt erst danach Sinn. Der Blick
            musste sich also selbst einen Anfang suchen.
            Jetzt trägt "Verträge prüfen" eine große Karte mit "Fang hier an", die
            drei übrigen stehen als schmalere Reihe daneben: sichtbar, aber ohne vom
            ersten Schritt abzulenken. */}
        <div className={styles.canMix}>
          <button className={styles.heroCard} onClick={() => navigate('/contracts?upload=true')}>
            <span className={styles.heroBadge}>Fang hier an</span>
            <span className={styles.heroIcon}><Search size={22} /></span>
            <h3>Verträge prüfen</h3>
            <p>
              Risiken, Kündigungsfristen und versteckte Klauseln, erklärt in
              verständlichem Deutsch statt in Juristensprache.
            </p>
            <span className={styles.heroMeta}>
              {/* Gleicher Grund wie oben: "0 Analysen frei" wäre kein Werbeversprechen,
                  sondern eine Absage auf der wichtigsten Karte der Seite. */}
              {freeAnalyses !== null && freeAnalyses > 0 && (
                <span className={styles.heroFree}>{freeAnalyses} Analysen frei</span>
              )}
              <span className={styles.heroGo}>Vertrag hochladen <span className={styles.heroArrow}>→</span></span>
            </span>
          </button>

          <div className={styles.sideStack}>
            <button className={styles.sideCard} onClick={() => navigate('/calendar')}>
              <span className={`${styles.sideIcon} ${styles.canIconOrange}`}><Bell size={16} /></span>
              <span className={styles.sideTxt}>
                <h4>Fristen überwachen <span className={styles.miniFree}>inklusive</span></h4>
                <p>Wir melden uns, bevor sich etwas still verlängert.</p>
              </span>
            </button>

            {/* Die Zahl war am 23.08. kurzzeitig entfernt, weil ein Free-Konto
                trotz Versprechen keine Frage stellen konnte. Ursache war eine
                vergessene Business-Wand in ContractAnalysisV2; seit deren
                Entfernung sind die 5 Fragen tatsächlich einlösbar. */}
            <button className={styles.sideCard} onClick={() => navigate('/chat')}>
              <span className={`${styles.sideIcon} ${styles.canIconLight}`}><MessageSquare size={16} /></span>
              <span className={styles.sideTxt}>
                <h4>Fragen stellen <span className={styles.miniFree}>5 Fragen frei</span></h4>
                <p>„Kann ich zum Monatsende kündigen?"</p>
              </span>
            </button>

            {/* Nachgezählt am 23.08.: CONTRACT_TYPES in Generate.tsx enthält genau 16
                Vorlagen. Das Etikett ist ehrlich: Erstellen ist für Free gesperrt
                (PLAN_LIMITS generate = 0). */}
            <button className={styles.sideCard} onClick={() => navigate('/generate')}>
              <span className={`${styles.sideIcon} ${styles.canIconGreen}`}><PencilLine size={16} /></span>
              <span className={styles.sideTxt}>
                <h4>Verträge erstellen <span className={styles.miniPaid}>ab Business</span></h4>
                <p>16 geprüfte Vorlagen, vom Arbeitsvertrag bis zur Geheimhaltung.</p>
              </span>
            </button>
          </div>
        </div>

        {/* Noahs Hinweis: Die Karten sind nicht alles, was das Produkt kann. */}
        <p className={styles.canMore}>
          Und vieles mehr: Verträge vergleichen, optimieren, digital unterschreiben
          und bei Gesetzesänderungen gewarnt werden.{' '}
          <button className={styles.canMoreLink} onClick={() => navigate('/features')}>
            Alle Funktionen ansehen →
          </button>
        </p>

        {/* Abholung zum Schluss: Sicherheit, Aufwand, Hilfe — die drei stillen
            Fragen eines neuen Nutzers, bevor er die erste Datei hochlädt. */}
        <div className={styles.reassure}>
          <span className={styles.reItem}>
            <span className={`${styles.reIcon} ${styles.reIconGreen}`}><ShieldCheck size={15} /></span>
            {/* ⚠️ Hier stand "Server in Deutschland". Das ist gemessen FALSCH
                (S3 liegt in Stockholm, die KI-Verarbeitung in den USA mit
                Standardvertragsklauseln) und darf an dieser Stelle nicht stehen:
                Es ist genau der Satz, auf den ein neuer Nutzer vertraut, bevor er
                seinen ersten Vertrag hochlädt. Siehe project_serverstandort-aussage-falsch.
                Die Ersatzformulierung ist vollständig belegbar. */}
            <span className={styles.reTxt}>
              <b>Deine Daten bleiben deine</b>
              DSGVO-konform, jederzeit löschbar, alle Verarbeiter offengelegt.
            </span>
          </span>
          <span className={styles.reItem}>
            <span className={`${styles.reIcon} ${styles.reIconBlue}`}><Clock size={15} /></span>
            <span className={styles.reTxt}>
              <b>Zwei Minuten reichen</b>
              Datei ablegen genügt, du musst nichts ausfüllen oder einstellen.
            </span>
          </span>
          <span className={styles.reItem}>
            <span className={`${styles.reIcon} ${styles.reIconOrange}`}><LifeBuoy size={15} /></span>
            <span className={styles.reTxt}>
              <b>Du bist nicht allein</b>
              <button className={styles.reLink} onClick={() => navigate('/hilfe')}>Hilfe-Center ansehen</button>
              {' '}oder einfach auf unsere E-Mail antworten.
            </span>
          </span>
        </div>
      </section>
      )}
    </div>
  );
}
