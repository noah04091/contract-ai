import React from "react";
import { Lock, ArrowRight, Check } from "lucide-react";
import styles from "./LockedAnalysisUpsell.module.css";

/**
 * Freemium-Tease Upsell-Karte (Phase 3, 19.06.2026).
 * Wird angezeigt, wenn das Backend die Analyse für einen Free-User redigiert hat
 * (contract.gated === true). Zeigt, WAS gesperrt ist (Zähler) + eine klare
 * „Jetzt freischalten"-CTA. Die echten Inhalte sind server-seitig bereits entfernt —
 * diese Karte ersetzt sie nur sichtbar. Stil: nüchtern, blau (Stripe/DocuSign), kein Schnickschnack.
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

  // Nur Zeilen zeigen, die es real gibt — keine „0 Empfehlungen"-Leerzeilen.
  const items: { label: string }[] = [];
  if (moreRisks > 0) items.push({ label: `${moreRisks} weitere kritische ${moreRisks === 1 ? "Klausel" : "Klauseln"} im Detail` });
  if ((counts.recommendations || 0) > 0) items.push({ label: `${counts.recommendations} konkrete Handlungsempfehlungen` });
  if ((counts.suggestions || 0) > 0) items.push({ label: `${counts.suggestions} Verbesserungsideen` });
  items.push({ label: "Ausführliches Rechtsgutachten" });
  if ((counts.clauses || 0) > 0) items.push({ label: `Klausel-für-Klausel-Analyse · ${counts.clauses} Klauseln` });
  items.push({ label: "Marktvergleich & PDF-Export" });

  const handle = () => {
    if (onUnlock) return onUnlock();
    window.location.href = "/pricing";
  };

  return (
    <div className={styles.card}>
      <div className={styles.head}>
        <span className={styles.lockIco}><Lock size={18} /></span>
        <div>
          <h3 className={styles.title}>Vollständige Analyse freischalten</h3>
          <p className={styles.sub}>Diese Punkte hat die KI in deinem Vertrag gefunden — schalte sie frei, um sie vollständig zu lesen.</p>
        </div>
      </div>

      <ul className={styles.list}>
        {items.map((it, i) => (
          <li key={i} className={styles.item}>
            <Lock size={15} className={styles.itemLock} />
            <span>{it.label}</span>
          </li>
        ))}
      </ul>

      <button className={styles.cta} onClick={handle}>
        Jetzt freischalten <ArrowRight size={18} />
      </button>
      <div className={styles.note}><Check size={14} /> Schon ab dem Business-Tarif · jederzeit kündbar</div>
    </div>
  );
};

export default LockedAnalysisUpsell;
