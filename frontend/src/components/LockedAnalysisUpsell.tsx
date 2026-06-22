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
 */
export interface GatedCounts {
  risks?: number;
  risksShown?: number;
  recommendations?: number;
  suggestions?: number;
  clauses?: number;
}

interface Props {
  counts?: GatedCounts;
  onUnlock?: () => void;
}

// Generische, plausibel klingende Demo-Zeilen — NICHT der echte (server-seitig
// entfernte) Analysetext. Nur als verschwommene Andeutung im Hintergrund.
const DEMO_ITEMS: { dot: string; title: string; lines: string[] }[] = [
  {
    dot: "#ef4444",
    title: "Weitreichende Haftungsbegrenzung zu Ihren Lasten",
    lines: [
      "Die Klausel schließt die Haftung des Anbieters bis auf grobe Fahrlässigkeit aus — im Streitfall ein erhebliches wirtschaftliches Risiko.",
      "Eine Nachverhandlung dieser Passage wird dringend empfohlen.",
    ],
  },
  {
    dot: "#f59e0b",
    title: "Automatische Verlängerung um jeweils 12 Monate",
    lines: [
      "Ohne fristgerechte Kündigung verlängert sich der Vertrag stillschweigend.",
      "Eine kürzere Verlängerungsperiode wäre für Sie deutlich vorteilhafter.",
    ],
  },
  {
    dot: "#8b5cf6",
    title: "Empfehlung: Zahlungsziele und Fristen anpassen",
    lines: [
      "Die vereinbarten Zahlungsziele sind knapp bemessen und einseitig ausgestaltet.",
      "Mehr Spielraum verschafft Ihnen spürbar bessere Liquidität.",
    ],
  },
  {
    dot: "#0ea5e9",
    title: "Marktvergleich: Konditionen unter Branchenschnitt",
    lines: [
      "Im Vergleich zu üblichen Verträgen dieser Art sind mehrere Punkte für Sie ungünstiger ausgestaltet.",
      "Eine Anpassung an den Marktstandard wäre verhandelbar.",
    ],
  },
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
  width: 11,
  height: 11,
  borderRadius: "50%",
  marginTop: 5,
  flex: "none",
  background: bg,
});
const titleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: "#0f172a", WebkitTextFillColor: "#0f172a" };
const lineStyle: React.CSSProperties = { fontSize: 13.5, lineHeight: 1.55, color: "#334155", WebkitTextFillColor: "#334155" };

const LockedAnalysisUpsell: React.FC<Props> = ({ counts = {}, onUnlock }) => {
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

  return (
    <div className={styles.wrap}>
      {/* Verschwommener Demo-Text — visuell kritische Props inline (siehe Kommentar oben) */}
      <div className={styles.blur} style={blurStyle}>
        {DEMO_ITEMS.map((it, i) => (
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
