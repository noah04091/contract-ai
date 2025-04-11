// 📁 src/pages/BetterContracts.tsx
import React, { useState } from "react";
import UniversalContractComparison from "../components/UniversalContractComparison";
import API_BASE_URL from "../utils/api";

const BetterContracts: React.FC = () => {
  const [contractText, setContractText] = useState("");
  const [contractType, setContractType] = useState("");
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAnalyze = async () => {
    setError("");
    if (!contractText || !currentPrice) {
      setError("Bitte Vertragstext und Preis eingeben.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/analyze-type`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: contractText })
      });

      const data = await res.json();
      if (data.contractType) setContractType(data.contractType);
      else setError("Vertragstyp konnte nicht erkannt werden.");
    } catch (err) {
      console.error("Fehler bei Vertragstyp-Erkennung:", err);
      setError("Serverfehler – bitte später erneut versuchen.");
    }

    setLoading(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${API_BASE_URL}/extract-text`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      setContractText(data.text);
    } catch (err) {
      console.error("Fehler beim Extrahieren:", err);
      setError("Fehler beim Datei-Upload.");
    }
  };

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <h1>🔍 Bessere Alternativen zu deinem Vertrag</h1>
      <p>
        Lade deinen Vertrag hoch oder füge Text manuell ein. Wir erkennen den
        Vertragstyp und zeigen dir bessere Anbieter.
      </p>

      <input
        type="file"
        accept=".pdf"
        onChange={handleFileUpload}
        style={{ marginTop: "1rem" }}
      />

      <textarea
        value={contractText}
        onChange={(e) => setContractText(e.target.value)}
        placeholder="Vertragstext hier einfügen oder PDF hochladen..."
        rows={8}
        style={{
          width: "100%",
          padding: "1rem",
          marginTop: "1rem",
          border: "1px solid #ccc",
          borderRadius: "8px"
        }}
      />

      <input
        type="number"
        placeholder="Monatlicher Preis (€)"
        value={currentPrice ?? ""}
        onChange={(e) => setCurrentPrice(parseFloat(e.target.value))}
        style={{
          padding: "0.5rem",
          marginTop: "1rem",
          width: "100%",
          border: "1px solid #ccc",
          borderRadius: "8px"
        }}
      />

      <button
        onClick={handleAnalyze}
        style={{
          marginTop: "1rem",
          padding: "0.75rem 1.5rem",
          background: "#4CAF50",
          color: "white",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontWeight: "bold"
        }}
      >
        ✅ Vertrag analysieren & bessere Anbieter finden
      </button>

      {loading && <p style={{ marginTop: "1rem" }}>🔄 Analysiere Vertragstyp...</p>}
      {error && <p style={{ color: "red", marginTop: "1rem" }}>❌ {error}</p>}

      {contractType && currentPrice !== null && (
        <div style={{ marginTop: "2rem" }}>
          <h3>
            📄 Erkannter Vertragstyp:{" "}
            <strong style={{ color: "#4CAF50" }}>{contractType}</strong>
          </h3>
          <UniversalContractComparison
            contractType={contractType}
            currentPrice={currentPrice}
          />
        </div>
      )}
    </div>
  );
};

export default BetterContracts;
