import { useEffect, useState } from "react";
import styles from "./ContractAnalysis.module.css";
import ResultCard from "./ResultCard";
import html2pdf from "html2pdf.js";

interface ContractAnalysisProps {
  file: File;
  onReset: () => void;
}

interface AnalysisResult {
  summary: string;
  legalAssessment: string;
  suggestions: string;
  comparison: string;
  contractScore: number;
  pdfPath?: string;
}

export default function ContractAnalysis({ file, onReset }: ContractAnalysisProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const analyze = async () => {
      setLoading(true);
      setResult(null);

      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Fehler bei Analyse");
        setResult(data);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unbekannter Fehler";
        alert("❌ Fehler: " + message);
        console.error("❌ Analysefehler:", message);
      } finally {
        setLoading(false);
      }
    };

    analyze();
  }, [file]);

  useEffect(() => {
    if (result?.contractScore != null) {
      let current = 0;
      const target = result.contractScore;
      const stepTime = 1000 / target;

      const interval = setInterval(() => {
        current += 1;
        setAnimatedScore(current);
        if (current >= target) clearInterval(interval);
      }, stepTime);

      return () => clearInterval(interval);
    }
  }, [result?.contractScore]);

  const handleExportPDF = () => {
    if (!result) return;

    const element = document.createElement("div");
    element.innerHTML = `
      <h2>Vertragsanalyse</h2>
      <h3>🧠 Zusammenfassung</h3><p>${result.summary}</p>
      <h3>⚖️ Rechtssicherheit</h3><p>${result.legalAssessment}</p>
      <h3>🛠️ Optimierungsvorschläge</h3><p>${result.suggestions}</p>
      <h3>🌐 Vergleichbare Verträge</h3><p>${result.comparison}</p>
      <h3>📊 Contract Score</h3><p>${result.contractScore}/100</p>
    `;

    // @ts-expect-error – html2pdf Typen existieren nicht offiziell
    html2pdf().from(element).save("Vertragsanalyse.pdf");
  };

  return (
    <div className={styles.container}>
      <h2>📊 Analyse-Ergebnis</h2>

      {loading && <p>🔄 Analyse wird durchgeführt...</p>}

      {result && (
        <div className={styles.resultBox}>
          <ResultCard title="🧠 Zusammenfassung" content={result.summary} />
          <ResultCard title="⚖️ Rechtssicherheit" content={result.legalAssessment} />
          <ResultCard title="🛠️ Optimierungsvorschläge" content={result.suggestions} />
          <ResultCard title="🌐 Vergleichbare Verträge" content={result.comparison} />

          <div className={styles.scoreContainer}>
            <div className={styles.scoreLabel}>📊 Contract Score</div>
            <div className={styles.scoreBarOuter}>
              <div
                className={styles.scoreBarInner}
                style={{ width: `${animatedScore}%` }}
              />
            </div>
            <div className={styles.scoreValue}>{animatedScore} / 100</div>
          </div>

          <button onClick={handleExportPDF} className={styles.exportButton}>
            📄 Analyse lokal als PDF speichern
          </button>

          {result.pdfPath && (
            <a
              href={`/api${result.pdfPath}`}
              download
              className={styles.downloadButton}
            >
              📥 Analyse als PDF herunterladen
            </a>
          )}

          <button className={styles.resetButton} onClick={onReset}>
            🔄 Neue Analyse starten
          </button>
        </div>
      )}
    </div>
  );
}
