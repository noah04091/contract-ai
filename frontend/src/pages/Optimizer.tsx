import { useEffect, useState } from "react";
import styles from "../styles/Optimizer.module.css";
import PremiumNotice from "../components/PremiumNotice";

interface Optimization {
  problem: string;
  suggestion: string;
}

export default function Optimizer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizations, setOptimizations] = useState<Optimization[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);

  // ✅ Abostatus abrufen (vom Server, nicht localStorage)
  useEffect(() => {
    const fetchStatus = async () => {
      const token = localStorage.getItem("token");
      if (!token) return setIsPremium(false);

      try {
        const res = await fetch("https://contract-ai-backend.onrender.com/auth/me", {
          headers: {
            Authorization: token,
          },
        });

        const data = await res.json();
        setIsPremium(data.subscriptionActive === true);
      } catch (err) {
        console.error("❌ Fehler beim Laden des Abostatus:", err);
        setIsPremium(false);
      }
    };

    fetchStatus();
  }, []);

  const handleUpload = async () => {
    if (!file || !isPremium) return;
    setLoading(true);
    setOptimizations(null);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    const token = localStorage.getItem("token") || "";

    try {
      const res = await fetch("https://contract-ai-backend.onrender.com/optimize", {
        method: "POST",
        headers: { Authorization: token },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Unbekannter Fehler");

      if (!data.optimizations || data.optimizations.length === 0) {
        setError("Keine Optimierungsvorschläge gefunden.");
      } else {
        setOptimizations(data.optimizations);
      }
    } catch (err: any) {
      setError("❌ Fehler: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setOptimizations(null);
    setError(null);
  };

  if (isPremium === null) return <p style={{ padding: "2rem" }}>⏳ Lade...</p>;

  return (
    <div className={styles.container}>
      <h2>🧠 KI-Vertragsoptimierung</h2>
      {!isPremium && <PremiumNotice />}

      <input
        type="file"
        accept="application/pdf"
        disabled={!isPremium}
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />

      <div className={styles.buttonRow}>
        <button onClick={handleUpload} disabled={!file || loading || !isPremium}>
          {loading ? "🔄 Wird analysiert..." : "📄 Vertrag analysieren"}
        </button>
        {file && (
          <button onClick={handleReset} className={styles.resetButton}>
            🔁 Neu starten
          </button>
        )}
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {optimizations && (
        <div className={styles.resultBox}>
          <h3>✅ Optimierungsvorschläge</h3>
          {optimizations.map((opt, index) => (
            <div key={index} className={styles.card}>
              <p>
                <strong>❌ Problem:</strong> {opt.problem}
              </p>
              <p>
                <strong>✅ Vorschlag:</strong> {opt.suggestion}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
