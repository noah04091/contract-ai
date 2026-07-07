import React from "react";
import { Lock, ArrowRight } from "lucide-react";
import styles from "./LockedAnalysisUpsell.module.css";

/**
 * Freemium-Tease — Frosted-Glass-Teaser (Phase 3, 20.06.2026; Optik 22.06.2026).
 * Wird angezeigt, wenn das Backend die Analyse für einen Free-User redigiert hat
 * (contract.gated === true).
 *
 * 🔒 SICHERHEIT: Der verschwommene Text ist GENERISCHER Demo-Platzhalter (keine
 * echten Vertragsdaten) — echter Inhalt verlässt den Server nie. Kein Bypass.
 *
 * ⚙️ Die visuell kritischen Eigenschaften des Demo-Hintergrunds (Farbe, Blur,
 * Sichtbarkeit) werden BEWUSST inline gesetzt, damit KEINE übergeordnete/globale
 * CSS-Regel sie überschreiben oder ausblenden kann (22.06. — Demo-Text war live
 * unsichtbar trotz korrektem DOM; Inline-Styles schlagen jede Stylesheet-Regel).
 *
 * `variant` steuert, WELCHER Demo-Text durchscheint — passend zum gesperrten Tab,
 * damit es wirkt, als läge der echte Inhalt des jeweiligen Bereichs darunter.
 */
export interface GatedCounts {
  risks?: number;
  risksShown?: number;
  recommendations?: number;
  suggestions?: number;
  clauses?: number;
  // Hatte das jeweilige GESPERRTE Feld überhaupt Inhalt? Nur dann Teaser zeigen.
  hadComparison?: boolean;
  hadOpinion?: boolean;
  hadLegalAssessment?: boolean;
  hadTypeSpecific?: boolean;
}

export type TeaserVariant = "risks" | "recommendations" | "suggestions" | "market" | "opinion" | "default";

interface Props {
  counts?: GatedCounts;
  variant?: TeaserVariant;
  onUnlock?: () => void;
  /** 📨 Welle 1 (07.07.2026): "LETTER" → Schreiben-Demo-Texte (Fristen/Optionen)
   *  statt Vertrags-Verhandlungs-Demo — sonst schimmert über einer Kündigung
   *  sichtbar falscher Inhalt („Nachverhandlung vor Unterzeichnung") durch. */
  docClass?: string;
}

interface DemoItem { dot: string; title: string; lines: string[]; }

// Generische, plausibel klingende Demo-Inhalte je Bereich — NICHT der echte
// (server-seitig entfernte) Analysetext. Nur verschwommene Andeutung.
const DEMO_SETS: Record<Exclude<TeaserVariant, "opinion">, DemoItem[]> = {
  risks: [
    { dot: "#ef4444", title: "Weitreichende Haftungsbegrenzung zu Ihren Lasten", lines: ["Die Haftung des Anbieters ist bis auf grobe Fahrlässigkeit ausgeschlossen — im Streitfall ein erhebliches Risiko.", "Diese Klausel hält einer AGB-Kontrolle vermutlich nicht stand."] },
    { dot: "#f59e0b", title: "Automatische Verlängerung um jeweils 12 Monate", lines: ["Ohne fristgerechte Kündigung verlängert sich der Vertrag stillschweigend.", "Die Kündigungsfrist ist einseitig zu Ihren Lasten ausgestaltet."] },
    { dot: "#ef4444", title: "Einseitiges Leistungsbestimmungsrecht des Anbieters", lines: ["Der Anbieter kann Leistungen nachträglich anpassen, ohne Ihre Zustimmung.", "Eine klare Begrenzung dieses Rechts fehlt."] },
  ],
  recommendations: [
    { dot: "#8b5cf6", title: "Haftungsklausel nachverhandeln", lines: ["Bestehen Sie auf einer Haftung auch bei einfacher Fahrlässigkeit für wesentliche Pflichten.", "Das senkt Ihr wirtschaftliches Risiko deutlich."] },
    { dot: "#8b5cf6", title: "Kündigungsfristen symmetrisch gestalten", lines: ["Vereinbaren Sie für beide Seiten dieselbe Frist.", "So vermeiden Sie eine einseitige Bindung."] },
    { dot: "#8b5cf6", title: "Zahlungsziele auf 30 Tage anheben", lines: ["Die aktuellen Fristen sind knapp bemessen.", "Mehr Spielraum verbessert Ihre Liquidität."] },
  ],
  suggestions: [
    { dot: "#f59e0b", title: "Salvatorische Klausel ergänzen", lines: ["Stellt sicher, dass der Vertrag bei Unwirksamkeit einzelner Punkte wirksam bleibt."] },
    { dot: "#f59e0b", title: "Gerichtsstand zu Ihren Gunsten festlegen", lines: ["Ein wohnortnaher Gerichtsstand spart im Streitfall Aufwand und Kosten."] },
    { dot: "#f59e0b", title: "Leistungsumfang konkret beschreiben", lines: ["Klare Leistungsdefinitionen beugen späteren Streitigkeiten vor."] },
  ],
  market: [
    { dot: "#0ea5e9", title: "Konditionen unter Branchenschnitt", lines: ["Mehrere Punkte sind im Vergleich zu üblichen Verträgen dieser Art für Sie ungünstiger.", "Eine Anpassung an den Marktstandard wäre verhandelbar."] },
    { dot: "#0ea5e9", title: "Haftungsregelung strenger als marktüblich", lines: ["Vergleichbare Verträge räumen dem Kunden mehr Schutz ein."] },
    { dot: "#0ea5e9", title: "Laufzeit länger als bei Wettbewerbern", lines: ["Kürzere Mindestlaufzeiten sind in der Branche üblich."] },
  ],
  default: [
    { dot: "#ef4444", title: "Weitreichende Haftungsbegrenzung zu Ihren Lasten", lines: ["Die Haftung des Anbieters ist bis auf grobe Fahrlässigkeit ausgeschlossen — im Streitfall ein erhebliches Risiko.", "Eine Nachverhandlung wird dringend empfohlen."] },
    { dot: "#f59e0b", title: "Automatische Verlängerung um jeweils 12 Monate", lines: ["Ohne fristgerechte Kündigung verlängert sich der Vertrag stillschweigend.", "Eine kürzere Verlängerungsperiode wäre vorteilhafter."] },
    { dot: "#8b5cf6", title: "Empfehlung: Zahlungsziele anpassen", lines: ["Die vereinbarten Fristen sind knapp bemessen.", "Mehr Spielraum verschafft bessere Liquidität."] },
  ],
};

// 📨 Welle 1: Demo-Inhalte für einseitige Schreiben (Kündigung/Abmahnung/Bescheid) —
// Fristen- und Options-Framing statt Vertrags-Verhandlung, durchgängig „du".
const LETTER_DEMO_SETS: Record<Exclude<TeaserVariant, "opinion">, DemoItem[]> = {
  risks: [
    { dot: "#ef4444", title: "Wichtige Frist läuft — Rechtsverlust möglich", lines: ["In diesem Schreiben läuft eine Frist, nach deren Ablauf du deine Rechte verlieren kannst.", "Das genaue Datum und was es bedeutet, findest du in der vollständigen Analyse."] },
    { dot: "#f59e0b", title: "Formale Wirksamkeit prüfenswert", lines: ["Es gibt Anhaltspunkte, dass das Schreiben formale Anforderungen nicht vollständig erfüllt.", "Das kann deine Position deutlich stärken."] },
    { dot: "#ef4444", title: "Konkrete Forderung an dich", lines: ["Das Schreiben verlangt eine Reaktion von dir — mit Konsequenzen bei Untätigkeit."] },
  ],
  recommendations: [
    { dot: "#8b5cf6", title: "Frist notieren und rechtzeitig handeln", lines: ["Die wichtigste Frist mit konkretem Datum und deinen Optionen findest du in der vollständigen Analyse."] },
    { dot: "#8b5cf6", title: "Wirksamkeit prüfen lassen", lines: ["Bestimmte formale Mängel können das Schreiben angreifbar machen — wir zeigen dir, welche."] },
    { dot: "#8b5cf6", title: "Deine Reaktions-Optionen abwägen", lines: ["Reagieren, widersprechen oder abwarten — jede Option hat Konsequenzen, die wir für dich aufbereitet haben."] },
  ],
  suggestions: [
    { dot: "#f59e0b", title: "Empfangsdatum dokumentieren", lines: ["Viele Fristen laufen ab Zugang — halte fest, wann du das Schreiben erhalten hast."] },
    { dot: "#f59e0b", title: "Unterlagen sichern", lines: ["Umschlag, Datum und Anlagen können später als Beweis wichtig sein."] },
    { dot: "#f59e0b", title: "Nicht vorschnell unterschreiben oder zahlen", lines: ["Erst prüfen, dann reagieren — manche Forderungen sind angreifbar."] },
  ],
  market: [
    { dot: "#0ea5e9", title: "Einordnung deines Schreibens", lines: ["Wie üblich oder ungewöhnlich dieses Schreiben ist, zeigt dir die vollständige Analyse."] },
    { dot: "#0ea5e9", title: "Typische Reaktionswege", lines: ["Was Empfänger in vergleichbaren Fällen tun, findest du in den Optionen."] },
    { dot: "#0ea5e9", title: "Häufige Fehler vermeiden", lines: ["Die typischen Fallen bei dieser Art Schreiben haben wir für dich markiert."] },
  ],
  default: [
    { dot: "#ef4444", title: "Wichtige Frist läuft — Rechtsverlust möglich", lines: ["In diesem Schreiben läuft eine Frist, nach deren Ablauf du Rechte verlieren kannst.", "Datum und Bedeutung stehen in der vollständigen Analyse."] },
    { dot: "#f59e0b", title: "Formale Wirksamkeit prüfenswert", lines: ["Anhaltspunkte für formale Mängel können deine Position stärken."] },
    { dot: "#8b5cf6", title: "Deine Optionen im Überblick", lines: ["Reagieren, widersprechen oder abwarten — mit Konsequenzen und Fristen aufbereitet."] },
  ],
};

const LETTER_OPINION_PARAS: string[] = [
  "Das Schreiben ist rechtlich einzuordnen und auf seine formale und inhaltliche Wirksamkeit zu prüfen — einschließlich der Frage, ob alle Anforderungen an Form und Berechtigung des Absenders erfüllt sind.",
  "Im Zentrum steht die Fristenlage: Aus dem Schreiben ergeben sich konkrete Reaktionsfristen, deren Versäumnis erhebliche rechtliche Nachteile bis hin zum Rechtsverlust nach sich ziehen kann.",
  "Im Ergebnis bestehen mehrere Handlungsoptionen mit unterschiedlichen Konsequenzen, die in der vollständigen Analyse mit konkreten Daten und Prioritäten dargestellt werden.",
];

// Rechtsgutachten = Fließtext-Absätze statt Karten.
const OPINION_PARAS: string[] = [
  "Der Vertrag ist insgesamt wirksam geschlossen, weist jedoch in mehreren Punkten ein deutliches Ungleichgewicht zu Lasten des Kunden auf, das im Folgenden klauselweise bewertet wird.",
  "Insbesondere die Haftungs- und Verlängerungsregelungen dürften einer AGB-rechtlichen Inhaltskontrolle nach §§ 305 ff. BGB nicht in vollem Umfang standhalten und sind daher kritisch zu sehen.",
  "Im Ergebnis empfiehlt sich vor Unterzeichnung eine gezielte Nachverhandlung der benannten Klauseln, um spätere Auseinandersetzungen und wirtschaftliche Nachteile zu vermeiden.",
];

// Inline-Styles (überschreiben jede Stylesheet-Regel) für den Demo-Hintergrund.
const blurStyle: React.CSSProperties = {
  filter: "blur(3.5px)",
  opacity: 1,
  padding: "22px 22px 28px",
  display: "flex",
  flexDirection: "column",
  gap: 16,
  userSelect: "none",
  pointerEvents: "none",
};
const dotStyle = (bg: string): React.CSSProperties => ({
  width: 11, height: 11, borderRadius: "50%", marginTop: 5, flex: "none", background: bg,
});
const titleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "#0f172a", WebkitTextFillColor: "#0f172a" };
const lineStyle: React.CSSProperties = { fontSize: 13.5, lineHeight: 1.55, color: "#334155", WebkitTextFillColor: "#334155" };
const paraStyle: React.CSSProperties = { ...lineStyle, fontSize: 14 };

const LockedAnalysisUpsell: React.FC<Props> = ({ counts = {}, variant = "default", onUnlock, docClass }) => {
  const isLetter = docClass === "LETTER";
  const moreRisks = Math.max(0, (counts.risks || 0) - (counts.risksShown || 0));

  // Zusammenfassungszeile NUR aus tatsächlich gesperrtem Inhalt bauen (ehrlich —
  // nichts versprechen, was nicht da ist).
  const parts: string[] = [];
  if (moreRisks > 0) parts.push(isLetter
    ? `${moreRisks} ${moreRisks === 1 ? "weiterer kritischer Punkt" : "weitere kritische Punkte"}`
    : `${moreRisks} ${moreRisks === 1 ? "weitere kritische Klausel" : "weitere kritische Klauseln"}`);
  if ((counts.recommendations || 0) > 0) parts.push(`${counts.recommendations} Empfehlungen`);
  if ((counts.suggestions || 0) > 0) parts.push(`${counts.suggestions} Verbesserungsideen`);
  if (counts.hadComparison) parts.push("Marktvergleich");
  if ((counts.clauses || 0) > 0) parts.push(`${counts.clauses} Klauseln`);
  if (counts.hadOpinion) parts.push("ausführliches Gutachten");
  const summaryLine = parts.length ? parts.join(" · ") : "die vollständige Analyse";

  const handle = () => {
    if (onUnlock) return onUnlock();
    window.location.href = "/pricing";
  };

  const demoSets = isLetter ? LETTER_DEMO_SETS : DEMO_SETS;
  const opinionParas = isLetter ? LETTER_OPINION_PARAS : OPINION_PARAS;
  const items = variant !== "opinion" ? demoSets[variant] || demoSets.default : null;

  return (
    <div className={styles.wrap}>
      {/* Verschwommener Demo-Text — visuell kritische Props inline (siehe Kommentar oben) */}
      <div className={styles.blur} style={blurStyle}>
        {variant === "opinion"
          ? opinionParas.map((p, i) => <div key={i} style={paraStyle}>{p}</div>)
          : items!.map((it, i) => (
              <div key={i} style={{ display: "flex", gap: 12 }}>
                <span style={dotStyle(it.dot)} />
                <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <div style={titleStyle}>{it.title}</div>
                  {it.lines.map((l, j) => (
                    <div key={j} style={lineStyle}>{l}</div>
                  ))}
                </div>
              </div>
            ))}
      </div>

      {/* Schloss + CTA direkt über dem Blur */}
      <div className={styles.overlay}>
        <div className={styles.lockBadge}><Lock size={22} /></div>
        <h3 className={styles.title}>Vollständige Analyse freischalten</h3>
        <p className={styles.sub}>{summaryLine}</p>
        <button className={styles.cta} onClick={handle}>
          Jetzt freischalten <ArrowRight size={17} />
        </button>
        <div className={styles.note}>
          {onUnlock
            ? "Diese Analyse einmalig freischalten — oder mit Business alle"
            : "Schon ab dem Business-Tarif · jederzeit kündbar"}
        </div>
      </div>
    </div>
  );
};

export default LockedAnalysisUpsell;
