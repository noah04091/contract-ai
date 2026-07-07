// V2-Sticky-Mini-Header — fixed top bar, fade-in beim Runter-Scrollen.
//
// Erscheint wenn der Score-Hero out-of-viewport ist (User hat gescrollt).
// Zeigt: Filename, Score-Pille, Optimieren-Button — damit der CTA immer
// in Reichweite bleibt ohne nervige Always-Sticky-Bar.
//
// Implementation: IntersectionObserver auf einem Sentinel-Element im
// V2HeroSection (data-attribute), keine Scroll-Listener (performant).

import { useEffect, useState } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import styles from "./V2StickyMiniHeader.module.css";
import { classifyDocType, getAnalysisLabel, getDocNoun } from "./v2TabLabels";

interface Props {
  filename: string;
  score?: number | null;
  scoreColor?: string; // Hex aus getScoreVariant
  onOptimize?: () => void;
  optimizeLabel?: string;
  isOptimizing?: boolean;
  sentinelSelector?: string;
  // 🎯 NEU 20.05.2026 — für typspezifische UI
  documentType?: string | null;
  contractType?: string | null;
}

function truncate(s: string, max: number): string {
  if (!s) return "";
  if (s.length <= max) return s;
  return s.substring(0, max).trim() + "…";
}

export default function V2StickyMiniHeader({
  filename,
  score,
  scoreColor,
  onOptimize,
  optimizeLabel,
  isOptimizing = false,
  sentinelSelector = "[data-v2-hero-sentinel]",
  documentType,
  contractType,
}: Props) {
  // 🎯 DocClass-spezifische Labels (20.05.2026)
  const docClass = classifyDocType(documentType, contractType);
  const analysisLabel = getAnalysisLabel(docClass);
  const docNoun = getDocNoun(docClass);
  const effectiveOptimizeLabel = optimizeLabel ?? `${docNoun} optimieren`;
  // 📨 Welle 1: Ein empfangenes Schreiben optimiert man nicht — Button ausblenden.
  const showOptimize = docClass !== "LETTER";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // IntersectionObserver auf das Sentinel-Element (am Ende des Heros).
    // Wenn Sentinel out-of-viewport → Mini-Header sichtbar.
    const sentinel = document.querySelector(sentinelSelector);
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Wenn Sentinel NICHT mehr sichtbar → User hat gescrollt → Mini-Header zeigen
        const entry = entries[0];
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: "-60px 0px 0px 0px" }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinelSelector]);

  const displayScore = score != null ? Math.round(score) : null;
  const truncatedFilename = truncate(filename, 50);

  return (
    <div
      className={`${styles.miniHeader} ${visible ? styles.visible : ""}`}
      role="region"
      aria-label="Schnell-Zugriff zur Analyse"
      aria-hidden={!visible}
    >
      <div className={styles.inner}>
        <div className={styles.left}>
          <span className={styles.filename} title={filename}>{truncatedFilename}</span>
        </div>

        {displayScore != null && (
          <div
            className={styles.scorePill}
            style={scoreColor ? { borderColor: scoreColor, color: scoreColor } : undefined}
            title={`${analysisLabel}-Score: ${displayScore} von 100`}
          >
            <span className={styles.scoreLabel}>Score</span>
            <span className={styles.scoreValue}>{displayScore}</span>
          </div>
        )}

        {onOptimize && showOptimize && (
          <button
            type="button"
            className={`${styles.optimizeBtn} ${isOptimizing ? styles.optimizeBtnLoading : ""}`}
            onClick={onOptimize}
            disabled={isOptimizing}
            aria-label={isOptimizing ? "Optimierung läuft" : effectiveOptimizeLabel}
          >
            {isOptimizing ? <RefreshCw size={14} className={styles.spinIcon} aria-hidden="true" /> : <Sparkles size={14} aria-hidden="true" />}
            <span className={styles.optimizeBtnText}>{isOptimizing ? "Optimiere..." : effectiveOptimizeLabel}</span>
          </button>
        )}
      </div>
    </div>
  );
}
