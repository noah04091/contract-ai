import React from "react";
import { Lock, ArrowRight } from "lucide-react";
import styles from "./LockedAnalysisUpsell.module.css";

/**
 * Freemium-Tease — Frosted-Glass-Teaser (Phase 3, 20.06.2026; Optik 22.06.2026).
 * Wird angezeigt, wenn das Backend die Analyse für einen Free-User redigiert hat
 * (contract.gated === true). Die echten Inhalte sind server-seitig ENTFERNT.
 *
 * 🔒 SICHERHEIT: Der verschwommene Text unten ist GENERISCHER Demo-Platzhalter
 * (keine echten Vertragsdaten) — er deutet nur "da ist mehr" an und macht neugierig.
 * Echter Inhalt verlässt den Server nie → kein CSS-/Quelltext-Bypass.
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
// entfernte) Analysetext. Nur verschwommene "da-steckt-mehr-drin"-Andeutung.
const DEMO_ITEMS: { dot: string; title: string; lines: string[] }[] = [
  {
    dot: "#ef4444",
    title: "Weitreichende Haftungsbegrenzung zu Ihren Lasten",
    lines: [
      "Die Klausel schließt die Haftung des Anbieters bis auf grobe Fahrlässigkeit aus — im Streitfall ein erhebliches wirtschaftliches Risiko für Sie.",
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
];

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
      {/* Verschwommener Demo-Text (aria-hidden, generisch, kein echter Inhalt) */}
      <div className={styles.blur} aria-hidden={true}>
        {DEMO_ITEMS.map((it, i) => (
          <div key={i} className={styles.demoCard}>
            <span className={styles.demoDot} style={{ background: it.dot }} />
            <div className={styles.demoBody}>
              <div className={styles.demoTitle}>{it.title}</div>
              {it.lines.map((l, j) => (
                <div key={j} className={styles.demoLine}>{l}</div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Scharfe, lesbare Unlock-Karte über dem Blur */}
      <div className={styles.overlay}>
        <div className={styles.lockCard}>
          <div className={styles.lockBadge}><Lock size={20} /></div>
          <h3 className={styles.title}>Vollständige Analyse freischalten</h3>
          <p className={styles.sub}>{summaryLine}</p>
          <button className={styles.cta} onClick={handle}>
            Jetzt freischalten <ArrowRight size={17} />
          </button>
          <div className={styles.note}>Schon ab dem Business-Tarif · jederzeit kündbar</div>
        </div>
      </div>
    </div>
  );
};

export default LockedAnalysisUpsell;
