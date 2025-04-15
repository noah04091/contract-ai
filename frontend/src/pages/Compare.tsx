import { useEffect, useState } from "react";
import styles from "../styles/Compare.module.css";
import PremiumNotice from "../components/PremiumNotice";
import html2pdf from "html2pdf.js";

interface ComparisonResult {
  differences: string;
  prosAndCons: string;
  summary: string;
}

export default function Compare() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) throw new Error("Nicht authentifiziert");

        const data = await res.json();
        setIsPremium(data.subscriptionActive === true || data.isPremium === true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("❌ Fehler beim Abo-Check:", err);
        setIsPremium(false);
      }
    };

    fetchStatus();
    return () => controller.abort();
  }, []);

  const handleSubmit = async () => {
    if (!file1 || !file2) {
      alert("❌ Bitte wähle zwei Verträge aus.");
      return;
    }

    setLoading(true);
    setResult(null);

    const formData = new FormData();
    formData.append("file1", file1);
    formData.append("file2", file2);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Vergleich fehlgeschlagen");

      setResult(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Vergleich.";
      alert("❌ Fehler: " + message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile1(null);
    setFile2(null);
    setResult(null);
  };

  const exportToPDF = () => {
    if (!result) return;

    const element = document.createElement("div");
    element.innerHTML = `
      <h2>🔍 Vertragsvergleich</h2>
      <h3>📌 Unterschiede</h3><p>${result.differences}</p>
      <h3>⚖️ Vorteile & Nachteile</h3><p>${result.prosAndCons}</p>
      <h3>🧠 KI-Zusammenfassung</h3><p>${result.summary}</p>
    `;

    // @ts-expect-error: html2pdf ist untypisiert, funktioniert aber zuverlässig
    html2pdf().from(element).save("Vertragsvergleich.pdf");
  };

  if (isPremium === null) {
    return <p style={{ padding: "2rem" }}>⏳ Lade...</p>;
  }

  return (
    <div className={styles.container}>
      <h2>🔍 Vertragsvergleich</h2>

      {!isPremium && <PremiumNotice />}

      <p>
        Wähle zwei Verträge aus und erhalte eine KI-gestützte Analyse zu Unterschieden,
        Stärken & Schwächen.
      </p>

      <div className={styles.uploadBox}>
        <div className={styles.fileInput}>
          <label>📄 Vertrag 1:</label>
          <input
            type="file"
            accept="application/pdf"
            disabled={!isPremium}
            onChange={(e) => setFile1(e.target.files?.[0] || null)}
          />
          {file1 && <span className={styles.filename}>✅ {file1.name}</span>}
        </div>

        <div className={styles.fileInput}>
          <label>📄 Vertrag 2:</label>
          <input
            type="file"
            accept="application/pdf"
            disabled={!isPremium}
            onChange={(e) => setFile2(e.target.files?.[0] || null)}
          />
          {file2 && <span className={styles.filename}>✅ {file2.name}</span>}
        </div>
      </div>

      <div className={styles.actions}>
        <button
          onClick={handleSubmit}
          disabled={!file1 || !file2 || loading || !isPremium}
        >
          {loading ? "🔄 Vergleiche..." : "🚀 Vergleich starten"}
        </button>

        {(file1 || file2 || result) && (
          <button onClick={handleReset} className={styles.resetButton}>
            ❌ Zurücksetzen
          </button>
        )}
      </div>

      {result && (
        <div className={styles.resultBox}>
          <h3>📌 Unterschiede</h3>
          <p>{result.differences}</p>

          <h3>⚖️ Vorteile & Nachteile</h3>
          <p>{result.prosAndCons}</p>

          <h3>🧠 KI-Zusammenfassung</h3>
          <p>{result.summary}</p>

          <button onClick={exportToPDF} style={{ marginTop: "1rem" }}>
            📥 Vergleich als PDF speichern
          </button>
        </div>
      )}
    </div>
  );
}
