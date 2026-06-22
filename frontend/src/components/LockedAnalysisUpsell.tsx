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
}

export type TeaserVariant = "risks" | "recommendations" | "suggestions" | "market" | "opinion" | "default";

interface Props {
  counts?: GatedCounts;
  variant?: TeaserVariant;
  onUnlock?: () => void;
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

const LockedAnalysisUpsell: React.FC<Props> = ({ counts = {}, variant = "default", onUnlock }) => {
  const moreRisks = Math.max(0, (counts.risks || 0) - (counts.risksShown || 0));

  const parts: string[] = [];
  if (moreRisks > 0) parts.push(`${moreRisks} ${moreRisks === 1 ? "weitere kritische Klausel" : "weitere kritische Klauseln"}`);
  if ((counts.recommendations || 0) > 0) parts.push(`${counts.recommendations} Empfehlungen`);
  if ((counts.clauses || 0) > 0) parts.push(`${counts.clauses} Klauseln`);
  const summaryLine = parts.length
    ? `${parts.join(" · ")} · ausführliches Gutachten`
    : "Alle Risiken im Detail, Empfehlungen & ausführliches Gutachten";

  const handle = () => {
    if (onUnlock) return onUnlock();
    window.location.href = "/pricing";
  };

  const items = variant !== "opinion" ? DEMO_SETS[variant] || DEMO_SETS.default : null;

  return (
    <div className={styles.wrap}>
      {/* Verschwommener Demo-Text — visuell kritische Props inline (siehe Kommentar oben) */}
      <div className={styles.blur} style={blurStyle}>
        {variant === "opinion"
          ? OPINION_PARAS.map((p, i) => <div key={i} style={paraStyle}>{p}</div>)
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
        <div className={styles.note}>Schon ab dem Business-Tarif · jederzeit kündbar</div>
      </div>
    </div>
  );
};

export default LockedAnalysisUpsell;
