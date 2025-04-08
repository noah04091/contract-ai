// src/components/AnalysisHistory.tsx
import { useEffect, useState } from "react";
import styles from "./AnalysisHistory.module.css";
import axios from "axios";

interface Analysis {
  _id: string;
  contractName: string;
  createdAt: string;
  summary: string;
  legalAssessment: string;
  suggestions: string;
  comparison: string;
  contractScore: number;
  pdfPath?: string;
}

export default function AnalysisHistory() {
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [minScore, setMinScore] = useState(0);

  const fetchAnalyses = async () => {
    try {
      const token = localStorage.getItem("token") || "";
      const res = await axios.get<Analysis[]>("http://https://contract-ai-backend.onrender.com/analyses", {
        headers: { Authorization: token },
      });
      setAnalyses(res.data); // res.data ist jetzt sicher vom Typ Analysis[]
    } catch (err) {
      console.error("❌ Fehler beim Laden der Analyse-Historie:", err);
    }
  };

  useEffect(() => {
    fetchAnalyses();
  }, []);

  const toggleDetails = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const filteredAnalyses = analyses.filter(
    (a) =>
      a.contractName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      a.contractScore >= minScore
  );

  return (
    <div className={styles.historyBox}>
      <h4>🔍 Filter</h4>
      <div className={styles.filters}>
        <input
          type="text"
          placeholder="🔎 Vertragsname..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <input
          type="number"
          placeholder="📊 Mindestscore"
          min={0}
          max={100}
          value={minScore}
          onChange={(e) => setMinScore(Number(e.target.value))}
        />
      </div>

      {filteredAnalyses.length === 0 && <p>Keine passenden Analysen gefunden.</p>}
      {filteredAnalyses.map((a) => (
        <div key={a._id} className={styles.analysisItem}>
          <div className={styles.header} onClick={() => toggleDetails(a._id)}>
            <span>📄 {a.contractName}</span>
            <span>{new Date(a.createdAt).toLocaleString()}</span>
          </div>

          {expandedId === a._id && (
            <div className={styles.details}>
              <p><strong>🧠 Zusammenfassung:</strong> {a.summary}</p>
              <p><strong>⚖️ Rechtssicherheit:</strong> {a.legalAssessment}</p>
              <p><strong>🛠️ Optimierung:</strong> {a.suggestions}</p>
              <p><strong>🌐 Vergleich:</strong> {a.comparison}</p>
              <p><strong>📊 Score:</strong> {a.contractScore}/100</p>
              {a.pdfPath && (
                <a
                  href={`http://https://contract-ai-backend.onrender.com${a.pdfPath}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.downloadBtn}
                >
                  📥 Analyse-PDF herunterladen
                </a>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
