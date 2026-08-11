// 🛡️ V2ProtectionCard — Schutz-Status-Kopf über den Terminen (Retention Stufe 1c, Redesign 11.08.2026)
//
// Zweck: Die erste Sitzung soll mit einem Portfolio enden, nicht mit einer Analyse.
// Gemessen (10.08.): 91 % Ein-Tages-Nutzer, nur 21,9 % laden je ein zweites Dokument —
// und im Produkt existierte kein einziger Anstoß, weitere Verträge hochzuladen.
//
// Redesign (Noahs Mockup-Abnahme 11.08., „Variante 2 — Integriert"): Die Karte ist kein
// frei schwebender Streifen mehr, sondern der GRÜNE KOPF der Termine-Karte — beide leben
// in einem gemeinsamen Container (`sectionGroup`, gerendert vom Parent), weil sie inhaltlich
// zusammengehören: „wird überwacht → hier die Termine als Beweis".
//
// Leitplanken (3-Agent-Audit 10.08. + Live-Tests):
// - NUR bei Vertragsartigen (CONTRACT/AGB) — bei Rechnung/Lohnzettel gibt es nichts zu überwachen.
// - Drei Plan-Varianten: Free-mit-Rest (Upload-CTA) / Free-am-Limit (Pläne statt totem Upload) /
//   Bezahlt (kompakte Einzeiler-Statuszeile, null Werbeton).
// - Im Enterprise-Mehrfach-Upload unterdrückt (hideProtectionCard).
// - Ehrliches Ausblenden (Feedback-Runde 11.08.): „Später" = nur diese Sitzung (sessionStorage),
//   ✕ = dauerhaft (localStorage). Vorher log „Später" — es versteckte für immer.
// - Zahlen frisch aus result.usage (Live-Test-Fund: AuthContext hinkt nach einer Analyse hinterher).
// - Nordstern-Metrik: „Nutzer mit ≥2 Verträgen nach Sitzung 1" (Basis 21,9 %).

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Plus, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { isProtectableDocType, resolveProtectionVariant, remainingAnalyses, effectiveAnalysisNumbers } from "./protectionCardLogic";
import styles from "./V2ProtectionCard.module.css";

const DISMISS_FOREVER_KEY = "contractai_protectionCardDismissed";
const DISMISS_SESSION_KEY = "contractai_protectionCardLater";

function readDismissed(): boolean {
  try {
    if (localStorage.getItem(DISMISS_FOREVER_KEY) === "1") return true;
    if (sessionStorage.getItem(DISMISS_SESSION_KEY) === "1") return true;
  } catch { /* privater Modus o.ä. */ }
  return false;
}

interface V2ProtectionCardProps {
  docType?: string | null;
  /** Anzahl analysierter Verträge des Nutzers (echte Zahl vom Parent — nie behaupten, immer zählen). */
  protectedCount?: number;
  /** Öffnet die Upload-Fläche direkt (Parent: clearAllUploadFiles + setActiveSection('upload')). */
  onUploadAnother?: () => void;
  /** true im Mehrfach-Upload-Kontext (MultiUploadResultNavigator) — Karte ergibt dort keinen Sinn. */
  hidden?: boolean;
  /** Frische Zähler aus der Analyse-Antwort (result.usage) — AuthContext ist nach einer Analyse veraltet. */
  usage?: { count?: number; limit?: number } | null;
}

export default function V2ProtectionCard({ docType, protectedCount, onUploadAnother, hidden, usage }: V2ProtectionCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<boolean>(readDismissed);

  // 🔒 TÜV-Fund (11.08.): Ohne geladenen User würde kurz die "aufgebraucht"-Variante flackern.
  if (!user || hidden || dismissed || !isProtectableDocType(docType)) return null;

  const isPaid = user?.subscriptionPlan === "business" || user?.subscriptionPlan === "enterprise";
  const nums = effectiveAnalysisNumbers(usage, user?.analysisCount, user?.analysisLimit);
  const left = remainingAnalyses(nums.count, nums.limit);
  const variant = resolveProtectionVariant(isPaid, left);
  const count = Math.max(1, protectedCount ?? 1); // der gerade analysierte Vertrag zählt immer

  const dismissForever = () => {
    try { localStorage.setItem(DISMISS_FOREVER_KEY, "1"); } catch { /* egal */ }
    setDismissed(true);
  };
  const dismissForSession = () => {
    try { sessionStorage.setItem(DISMISS_SESSION_KEY, "1"); } catch { /* egal */ }
    setDismissed(true);
  };

  const protectedChip = (
    <span className={`${styles.chip} ${styles.chipGreen}`}>
      🛡 {count === 1 ? "1 Vertrag geschützt" : `${count} Verträge geschützt`}
    </span>
  );

  // 💼 Bezahlte Pläne: kompakte Status-Zeile — Titel + Chip inline, Knopf rechts.
  // Kein Werbeton, minimale Höhe (nach dem 27. Vertrag darf es nicht nerven).
  if (variant === "paid") {
    // Redesign-Iteration 2 (Noahs Screenshot-Feedback 11.08. abends): Die kompakte
    // Kopfzeile wirkte wie eine ZWEITE Überschrift über dem Termine-Kopf — Icon-Kachel
    // über Icon-Kachel, Primär-Knopf über Primär-Knopf. Jetzt: schmales STATUS-BAND
    // ohne Kachel und ohne Primär-Knopf — liest sich als grünes Band der Termine-Karte,
    // nicht als konkurrierender Header. Aktion ist ein dezenter Text-Link.
    return (
      <div className={styles.statusStrip} id="v2-protection-card" data-variant={variant}>
        <ShieldCheck size={15} className={styles.stripShield} aria-hidden="true" />
        <span className={styles.stripText}>
          <strong>Im Fristen-Wächter</strong>
          <span className={styles.stripDot}>·</span>
          {count === 1 ? "1 Vertrag geschützt" : `${count} Verträge geschützt`}
        </span>
        <span className={styles.spacer} />
        {onUploadAnother && (
          <button type="button" className={styles.stripLink} onClick={onUploadAnother}>
            <Plus size={13} />
            Weitere Verträge schützen
          </button>
        )}
        <button type="button" className={styles.stripDismiss} onClick={dismissForever} aria-label="Dauerhaft ausblenden" title="Dauerhaft ausblenden">
          <X size={14} />
        </button>
      </div>
    );
  }

  // 🆓 Free (mit Rest / am Limit): voller Kopf mit Verlust-Satz bzw. Pulse-Treppe.
  return (
    <div className={styles.header} id="v2-protection-card" data-variant={variant}>
      <button type="button" className={styles.dismiss} onClick={dismissForever} aria-label="Dauerhaft ausblenden" title="Dauerhaft ausblenden">
        <X size={15} />
      </button>

      {/* Iteration 3 (Noahs Feedback 11.08.): Auch im Free-Kopf KEINE Icon-Kachel mehr —
          das Schild ist Inline-Symbol neben dem Titel (gleiche Formsprache wie das
          Paid-Band). Die einzige Icon-Kachel der Seite bleibt der Kalender-Anker
          des Termine-Kopfs → kein "Icon unter Icon" mehr. */}
      <div className={styles.headText}>
        <h4 className={styles.titleInline}>
          <ShieldCheck size={17} className={styles.inlineShield} aria-hidden="true" />
          Dieser Vertrag ist jetzt im Fristen-Wächter
        </h4>
          {variant === "free" ? (
            <p className={styles.subtitle}>
              Kündigungsfristen, Verlängerungen, Termine — wir erinnern dich{" "}
              <strong>rechtzeitig per E-Mail, kostenlos</strong>.{" "}
              <strong>Verträge, die nicht hier liegen, laufen unbewacht.</strong>
            </p>
          ) : (
            <p className={styles.subtitle}>
              Deine Fristen bleiben geschützt. Deine <strong>3 kostenlosen Analysen sind aufgebraucht</strong>{" "}
              — mit Business analysierst du bis zu 25 Verträge im Monat, und{" "}
              <strong>Legal Pulse</strong> überwacht sie zusätzlich auf Gesetzesänderungen.
            </p>
          )}

          <div className={styles.bottomRow}>
            {protectedChip}
            {variant === "free" && Number.isFinite(left) && (
              <span className={styles.chip}>{left} von {nums.limit ?? 3} kostenlosen Analysen übrig</span>
            )}
            {variant === "freeLimit" && (
              <span className={`${styles.chip} ${styles.chipAmber}`}>0 von {nums.limit ?? 3} Analysen übrig</span>
            )}
            <span className={styles.spacer} />
            {variant === "freeLimit" ? (
              <button type="button" className={styles.primary} onClick={() => navigate("/pricing")}>
                Pläne ansehen
              </button>
            ) : (
              onUploadAnother && (
                <button type="button" className={styles.primary} onClick={onUploadAnother}>
                  <Plus size={15} />
                  Weiteren Vertrag schützen
                </button>
              )
            )}
            <button type="button" className={styles.ghost} onClick={dismissForSession} title="Für diese Sitzung ausblenden">
              Später
            </button>
          </div>
      </div>
    </div>
  );
}
