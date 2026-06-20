import React from "react";
import { Lock, ArrowRight } from "lucide-react";
import styles from "./LockedAnalysisUpsell.module.css";

/**
 * Freemium-Tease — Frosted-Glass-Teaser (Phase 3, 20.06.2026).
 * Wird angezeigt, wenn das Backend die Analyse für einen Free-User redigiert hat
 * (contract.gated === true). Die echten Inhalte sind server-seitig ENTFERNT — hier
 * liegen nur DEKORATIVE, verschwommene Platzhalter (kein echter Text → kein Bypass),
 * darüber ein scharfes Schloss-Overlay mit "Jetzt freischalten"-CTA.
 * Stil: ruhig, blau, professionell (Stripe/DocuSign-Niveau).
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
      {/* Dekorativer, verschwommener Platzhalter — KEIN echter Inhalt (server-seitig gesperrt) */}
      <div className={styles.blur} aria-hidden={true}>
        {[0, 1, 2].map((i) => (
          <div key={i} className={styles.ghostCard}>
            <div className={styles.ghostHeadRow}>
              <span className={styles.ghostDot} />
              <span
                className={styles.ghostBar}
                style={{ width: i === 0 ? "55%" : i === 1 ? "44%" : "62%" }}
              />
            </div>
            <span className={styles.ghostLine} style={{ width: "94%" }} />
            <span className={styles.ghostLine} style={{ width: "80%" }} />
          </div>
        ))}
      </div>

      {/* Scharfes Overlay mit Schloss + CTA */}
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
