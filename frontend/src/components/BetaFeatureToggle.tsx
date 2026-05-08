// BetaFeatureToggle — Beta-Feature-Schalter im Profil.
//
// Nur für Whitelist-User sichtbar. Aktuell ein Toggle: „Neue Analyse-Ansicht (Beta)".
// Wenn ein User nicht in der Whitelist ist, rendert die Komponente NULL — kein Hinweis,
// dass es so etwas gibt. Damit bleibt das Beta unsichtbar für normale User.

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { canSeeAnalysisV2, isAnalysisV2Enabled, setAnalysisV2Enabled } from "../utils/featureFlags";

export default function BetaFeatureToggle() {
  const { user } = useAuth();
  const [v2On, setV2On] = useState<boolean>(false);

  useEffect(() => {
    setV2On(isAnalysisV2Enabled(user));
  }, [user]);

  if (!canSeeAnalysisV2(user)) return null;

  const toggle = () => {
    const next = !v2On;
    setAnalysisV2Enabled(next);
    setV2On(next);
    // Hard reload für sauberen State-Reset (Komponenten-Cache leeren)
    window.location.reload();
  };

  return (
    <div style={{
      background: "linear-gradient(135deg,#fffbeb,#fef3c7)",
      border: "1px solid #fde68a",
      borderRadius: 12,
      padding: "16px 20px",
      margin: "20px 0",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 16,
      flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "#92400e", marginBottom: 4 }}>
          🧪 Beta · nur für dich sichtbar
        </div>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: "#0f172a", marginBottom: 2 }}>
          Neue Analyse-Ansicht
        </div>
        <div style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.5 }}>
          {v2On
            ? "Aktiv — du siehst gerade die neue Ansicht. Bei Problemen einfach hier wieder ausschalten."
            : "Inaktiv — du siehst die normale Ansicht. Klick auf den Schalter, um die neue Ansicht auszuprobieren."}
        </div>
      </div>
      <button
        onClick={toggle}
        aria-pressed={v2On}
        aria-label={v2On ? "Neue Analyse-Ansicht ausschalten" : "Neue Analyse-Ansicht einschalten"}
        style={{
          width: 52,
          height: 30,
          borderRadius: 999,
          border: "none",
          cursor: "pointer",
          background: v2On ? "#10b981" : "#cbd5e1",
          position: "relative",
          transition: "background 0.2s ease",
          flexShrink: 0,
        }}
      >
        <span style={{
          position: "absolute",
          top: 3,
          left: v2On ? 25 : 3,
          width: 24,
          height: 24,
          borderRadius: "50%",
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transition: "left 0.2s ease",
        }} />
      </button>
    </div>
  );
}
