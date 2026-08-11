// 🛡️ V2ProtectionCard — Schutz-Status-Karte nach dem Analyse-Ergebnis (Retention Stufe 1c, 11.08.2026)
//
// Zweck: Die erste Sitzung soll mit einem Portfolio enden, nicht mit einer Analyse.
// Gemessen (10.08.): 91 % Ein-Tages-Nutzer, nur 21,9 % laden je ein zweites Dokument —
// und im Produkt existierte kein einziger Anstoß, weitere Verträge hochzuladen.
// Diese Karte sitzt am Vertrauens-Moment (direkt nach dem Ergebnis) und arbeitet mit
// dem Schutz-Frame („Fristen-Wächter") statt mit einer Arbeits-Aufforderung („lade hoch").
//
// Leitplanken (aus dem 3-Agent-Audit vom 10.08.):
// - NUR bei Vertragsartigen Dokumenten (CONTRACT/AGB) — bei Rechnung/Lohnzettel gibt es
//   nichts zu überwachen (classifyDocType-Gate).
// - Drei Plan-Varianten: Free-mit-Rest (Upload-CTA), Free-am-Limit (ehrlicher Upgrade-
//   Hinweis statt totem Upload-Knopf), Bezahlt (reine Portfolio-Botschaft, null Upsell).
// - Im Enterprise-Mehrfach-Upload unterdrückt (hideProtectionCard) — „lade mehr hoch"
//   wäre absurd, wenn gerade 5 Verträge hochgeladen wurden.
// - Wegklickbar (localStorage, wie V2ConversionBanner) — Fluchtweg senkt Reaktanz.
// - Nordstern-Metrik: „Nutzer mit ≥2 Verträgen nach Sitzung 1" (Basis 21,9 %) —
//   bewegt die Karte die Zahl nicht, fliegt sie wieder raus.

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, Plus, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { isProtectableDocType, resolveProtectionVariant, remainingAnalyses, effectiveAnalysisNumbers } from "./protectionCardLogic";
import styles from "./V2ProtectionCard.module.css";

const DISMISS_KEY = "contractai_protectionCardDismissed";

interface V2ProtectionCardProps {
  docType?: string | null;
  /** Anzahl analysierter Verträge des Nutzers (echte Zahl vom Parent — nie behaupten, immer zählen). */
  protectedCount?: number;
  /** Öffnet die Upload-Fläche direkt (Parent: clearAllUploadFiles + setActiveSection('upload')). */
  onUploadAnother?: () => void;
  /** true im Mehrfach-Upload-Kontext (MultiUploadResultNavigator) — Karte ergibt dort keinen Sinn. */
  hidden?: boolean;
  /** Frische Zähler aus der Analyse-Antwort (result.usage) — AuthContext ist nach einer Analyse veraltet (Live-Test-Fund 11.08.). */
  usage?: { count?: number; limit?: number } | null;
}

export default function V2ProtectionCard({ docType, protectedCount, onUploadAnother, hidden, usage }: V2ProtectionCardProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try { return localStorage.getItem(DISMISS_KEY) === "1"; } catch { return false; }
  });

  // 🔒 TÜV-Fund (11.08.): Ohne geladenen User wäre isPaid=false und left=0 →
  // die Karte würde kurz die "Analysen aufgebraucht"-Variante flackern. Erst
  // rendern, wenn die Auth-Daten da sind.
  if (!user || hidden || dismissed || !isProtectableDocType(docType)) return null;

  const isPaid = user?.subscriptionPlan === "business" || user?.subscriptionPlan === "enterprise";
  // 🐛 Live-Test-Fund 11.08.: usage (frisch, aus der Analyse-Antwort) hat Vorrang vor
  // dem AuthContext (vor der Analyse geladen → zählt einen zu wenig).
  const nums = effectiveAnalysisNumbers(usage, user?.analysisCount, user?.analysisLimit);
  const left = remainingAnalyses(nums.count, nums.limit);
  const variant = resolveProtectionVariant(isPaid, left);
  const count = Math.max(1, protectedCount ?? 1); // der gerade analysierte Vertrag zählt immer

  const handleDismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* privater Modus o.ä. */ }
    setDismissed(true);
  };

  return (
    <div className={styles.card} id="v2-protection-card" data-variant={variant}>
      <button type="button" className={styles.dismiss} onClick={handleDismiss} aria-label="Hinweis ausblenden" title="Ausblenden">
        <X size={16} />
      </button>

      <div className={styles.head}>
        <div className={styles.icon}><ShieldCheck size={21} /></div>
        <div className={styles.headText}>
          <h4 className={styles.title}>Dieser Vertrag ist jetzt im Fristen-Wächter</h4>
          {variant === "free" && (
            <p className={styles.subtitle}>
              Kündigungsfristen, Verlängerungen, Termine — wir erinnern dich{" "}
              <strong>rechtzeitig per E-Mail</strong>, kostenlos.{" "}
              <strong>Verträge, die nicht hier liegen, laufen unbewacht.</strong>
            </p>
          )}
          {variant === "freeLimit" && (
            <p className={styles.subtitle}>
              Deine Fristen bleiben geschützt. Deine <strong>3 kostenlosen Analysen sind aufgebraucht</strong>{" "}
              — weitere Verträge können aktuell nicht geprüft werden. Mit Business analysierst du bis zu
              25 Verträge im Monat, und <strong>Legal Pulse</strong> überwacht sie zusätzlich auf Gesetzesänderungen.
            </p>
          )}
          {variant === "paid" && (
            <p className={styles.subtitle}>
              <strong>{count === 1 ? "1 Vertrag ist" : `${count} deiner Verträge sind`}</strong> im Fristen-Wächter.
              Je vollständiger dein Vertragsordner, desto lückenloser der Schutz.
            </p>
          )}
        </div>
      </div>

      <div className={styles.chips}>
        <span className={`${styles.chip} ${styles.chipGreen}`}>
          🛡 {count === 1 ? "1 Vertrag geschützt" : `${count} Verträge geschützt`}
        </span>
        {variant === "free" && Number.isFinite(left) && (
          <span className={styles.chip}>{left} von {nums.limit ?? 3} kostenlosen Analysen übrig</span>
        )}
        {variant === "freeLimit" && (
          <span className={`${styles.chip} ${styles.chipAmber}`}>0 von {nums.limit ?? 3} Analysen übrig</span>
        )}
      </div>

      <div className={styles.actions}>
        {variant === "freeLimit" ? (
          <button type="button" className={styles.primary} onClick={() => navigate("/pricing")}>
            Pläne ansehen
          </button>
        ) : (
          onUploadAnother && (
            <button type="button" className={styles.primary} onClick={onUploadAnother}>
              <Plus size={16} />
              {variant === "paid" ? "Weitere Verträge schützen" : "Weiteren Vertrag schützen"}
            </button>
          )
        )}
        <button type="button" className={styles.ghost} onClick={handleDismiss}>Später</button>
      </div>
    </div>
  );
}
