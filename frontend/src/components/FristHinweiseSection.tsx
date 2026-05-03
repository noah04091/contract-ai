import { useState } from "react";
import styles from "../styles/FristHinweiseSection.module.css";

// Universelle Frist-Hinweise aus Date Hunt (Backend-Service).
// Werden im Contract-Doc als Mongoose Mixed-Type gespeichert — Frontend
// rendert nur, was tatsächlich da ist (render-if-present).
interface FristHinweis {
  type: string;
  title: string;
  description?: string;
  legalBasis?: string;
  evidence?: string;
}

interface FristHinweiseSectionProps {
  fristHinweise?: FristHinweis[];
}

// Icon-Mapping je Frist-Typ. Gleicher Stand wie in AnalysisImportantDates,
// damit der User in Analyse-Seite und Verwaltung dieselbe visuelle Sprache sieht.
const FRIST_ICON: Record<string, string> = {
  kuendigungsfrist: "🚪",
  widerrufsfrist: "↩️",
  gewaehrleistungsfrist: "🛡️",
  verjaehrungsfrist: "⏳",
  probezeit: "👔",
  maengelruegepflicht: "⚠️",
  lieferfrist: "📦",
  annahmefrist: "✍️",
  karenzentschaedigung: "💼",
  optionsfrist: "⏰",
  reaktionsfrist: "⚡",
  wartungsfrist: "🔧",
  anpassungsfrist: "📈",
  zahlungsfrist: "💰",
  ruegefrist: "📣",
  einwendungsfrist: "⚖️",
  sperrfrist: "🔒",
  sonstige: "📌",
};

const fristIcon = (type?: string): string => {
  if (!type) return "📌";
  return FRIST_ICON[type.toLowerCase()] || "📌";
};

// Standard: erste 4 zeigen, Rest hinter Toggle. Identisch zur Analyse-Seite.
const COLLAPSED_LIMIT = 4;

export default function FristHinweiseSection({ fristHinweise }: FristHinweiseSectionProps) {
  const [expanded, setExpanded] = useState(false);

  // Render-if-present: keine Anzeige bei leerer/fehlender Liste.
  if (!Array.isArray(fristHinweise) || fristHinweise.length === 0) {
    return null;
  }

  const visible = expanded
    ? fristHinweise
    : fristHinweise.slice(0, COLLAPSED_LIMIT);
  const hiddenCount = fristHinweise.length - COLLAPSED_LIMIT;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.headerIcon}>⏰</span>
        <h3 className={styles.title}>Wichtige Fristen & Hinweise</h3>
        <span className={styles.badge}>{fristHinweise.length}</span>
      </div>

      <div className={styles.list}>
        {visible.map((fh, idx) => (
          <div key={`${fh.type}-${idx}`} className={styles.item}>
            <div className={styles.iconWrap}>{fristIcon(fh.type)}</div>
            <div className={styles.content}>
              <div className={styles.itemTitle}>{fh.title}</div>
              {fh.description && (
                <div className={styles.description}>{fh.description}</div>
              )}
              {fh.legalBasis && (
                <div className={styles.legalBasis}>📖 {fh.legalBasis}</div>
              )}
            </div>
          </div>
        ))}
      </div>

      {hiddenCount > 0 && (
        <button
          type="button"
          className={styles.toggleButton}
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
        >
          {expanded
            ? "Weniger anzeigen"
            : `+ ${hiddenCount} weitere Fristen anzeigen`}
        </button>
      )}
    </div>
  );
}
