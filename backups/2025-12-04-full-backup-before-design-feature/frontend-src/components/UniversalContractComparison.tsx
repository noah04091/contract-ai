// 📁 src/components/UniversalContractComparison.tsx

import React from "react";

interface Anbieter {
  name: string;
  preis: number;
  link: string;
  leistungen: string[];
}

interface Props {
  contractType: string;
  currentPrice: number;
}

const UniversalContractComparison: React.FC<Props> = ({ contractType, currentPrice }) => {
  // Beispielhafte Anbieter (kann später dynamisch von DB oder API kommen)
  const daten: Record<string, Anbieter[]> = {
    internet: [
      {
        name: "1&1 Internet",
        preis: 34.99,
        link: "https://www.1und1.de/",
        leistungen: ["250 Mbit/s", "Router inkl.", "24 Monate Laufzeit"],
      },
      {
        name: "Vodafone Kabel",
        preis: 29.99,
        link: "https://www.vodafone.de/",
        leistungen: ["500 Mbit/s", "Gratis WLAN-Router", "12 Monate"],
      },
      {
        name: "o2 MyHome",
        preis: 24.99,
        link: "https://www.o2online.de/",
        leistungen: ["100 Mbit/s", "Flexibel kündbar", "ohne Anschlussgebühr"],
      },
    ],
    versicherung: [
      {
        name: "HUK24",
        preis: 19.90,
        link: "https://www.huk24.de/",
        leistungen: ["Haftpflicht", "Ohne Selbstbeteiligung", "monatlich kündbar"],
      },
      {
        name: "Allianz Direct",
        preis: 25.00,
        link: "https://www.allianzdirect.de/",
        leistungen: ["Schutzbrief inkl.", "Online-Support", "Rabatte für Neukunden"],
      },
    ],
    // Weitere Typen möglich...
  };

  const angebote = daten[contractType] || [];

  const filtered = angebote
    .filter((a) => a.preis <= currentPrice * 0.95)
    .sort((a, b) => a.preis - b.preis);

  if (angebote.length === 0) {
    return <p>🧐 Für diesen Vertragstyp sind aktuell keine Anbieter verfügbar.</p>;
  }

  return (
    <div style={{ marginTop: "1rem" }}>
      <h4>💰 Angebote, die günstiger als dein aktueller Vertrag sind:</h4>

      {filtered.length === 0 && (
        <p>Keine Anbieter gefunden, die deutlich günstiger als dein Vertrag sind.</p>
      )}

      <ul style={{ listStyle: "none", padding: 0 }}>
        {filtered.map((a, index) => (
          <li
            key={a.name}
            style={{
              margin: "1rem 0",
              padding: "1rem",
              border: "1px solid #ccc",
              borderRadius: "8px",
              background: "#f9f9f9",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{a.name}</strong>
              <span>
                💶 <b>{a.preis.toFixed(2)} €</b>{" "}
                {index === 0 && <span style={{ color: "#4CAF50" }}>💡 Beste Option</span>}
              </span>
            </div>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.2rem" }}>
              {a.leistungen.map((l, i) => (
                <li key={i}>✅ {l}</li>
              ))}
            </ul>
            <a
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "inline-block",
                marginTop: "0.5rem",
                background: "#4CAF50",
                color: "#fff",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                textDecoration: "none",
              }}
            >
              🔗 Zum Anbieter
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default UniversalContractComparison;
