// V2-Score-Detail-Drawer — kleines Modal das aufgeht wenn User auf Score klickt.
// Zeigt wie sich der Score zusammensetzt: scoreReasoning + Asymmetrie + Vollständigkeit.
//
// Anti-Halluzination: nur Felder rendern die tatsächlich Daten haben. Wenn KI etwas
// nicht geliefert hat, weglassen — kein „Nicht angegeben"-Default.

import { X, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect } from "react";
import { classifyDocType, getAnalysisLabel } from "./v2TabLabels";

interface Props {
  open: boolean;
  onClose: () => void;
  score: number | null;
  scoreColor: string;
  scoreRating: string;
  scoreReasoning?: string | null;
  asymmetry?: { rating?: string; favoredParty?: string | null; explanation?: string } | null;
  completeness?: { isComplete?: boolean; observation?: string; openItems?: string[] } | null;
  confidence?: number | string | null;
  qualityScore?: number | string | null;
  // 🎯 NEU 20.05.2026 — für typspezifische Drawer-Headline
  documentType?: string | null;
  contractType?: string | null;
}

const ASYM_LABELS: Record<string, string> = {
  "balanced": "Ausgewogen",
  "mostly-fair": "Größtenteils ausgewogen",
  "one-sided": "Einseitig",
  "heavily-one-sided": "Stark einseitig",
};

function formatPct(v: number | string | null | undefined): string {
  if (v == null || v === "") return "";
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (isNaN(n) || n <= 0) return "";
  return Math.round(n <= 1 ? n * 100 : n) + "%";
}

export default function V2ScoreDetailDrawer({
  open,
  onClose,
  score,
  scoreColor,
  scoreRating,
  scoreReasoning,
  asymmetry,
  completeness,
  confidence,
  qualityScore,
  documentType,
  contractType,
}: Props) {
  // 🎯 Typspezifische Drawer-Headline (20.05.2026)
  const docClass = classifyDocType(documentType, contractType);
  const analysisLabel = getAnalysisLabel(docClass);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const asymKey = asymmetry?.rating ? String(asymmetry.rating).toLowerCase().replace(/_/g, "-") : "";
  const asymLabel = ASYM_LABELS[asymKey];
  const confPct = formatPct(confidence);
  const qualPct = formatPct(qualityScore);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-drawer-title"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.4)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
        animation: "v2ScoreFadeIn 200ms ease-out",
      }}
    >
      <style>{`
        @keyframes v2ScoreFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes v2ScoreSlideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 16,
          width: "min(560px, 92vw)",
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: "0 24px 48px -12px rgba(15, 23, 42, 0.25)",
          animation: "v2ScoreSlideUp 250ms cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Header */}
        <div style={{ padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: `${scoreColor}15`,
                border: `2px solid ${scoreColor}`,
                color: scoreColor,
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                fontWeight: 800,
                letterSpacing: "-0.02em",
                flexShrink: 0,
              }}
            >
              {score != null ? Math.round(score) : "—"}
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 id="score-drawer-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.015em" }}>
                {`So setzt sich dein ${analysisLabel}-Score zusammen`}
              </h3>
              <div style={{ fontSize: 12.5, color: scoreColor, fontWeight: 600, marginTop: 3 }}>{scoreRating}</div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
            style={{
              border: "1px solid #e5e7eb",
              background: "#fff",
              borderRadius: 8,
              padding: 6,
              cursor: "pointer",
              color: "#64748b",
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "18px 24px 24px", display: "flex", flexDirection: "column", gap: 18 }}>
          {/* scoreReasoning — Holistische KI-Begründung */}
          {scoreReasoning && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <Sparkles size={14} style={{ color: "#8b5cf6" }} aria-hidden="true" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" }}>
                  KI-Begründung
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 13.5, color: "#475569", lineHeight: 1.6 }}>{scoreReasoning}</p>
            </div>
          )}

          {/* Asymmetrie */}
          {asymLabel && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <Scale size={14} style={{ color: "#f59e0b" }} aria-hidden="true" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" }}>
                  Ausgewogenheit
                </span>
              </div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a", marginBottom: 4 }}>{asymLabel}</div>
              {asymmetry?.favoredParty && asymmetry.favoredParty !== "null" && (
                <div style={{ fontSize: 12.5, color: "#64748b", marginBottom: 6 }}>
                  Bevorzugte Partei: <strong style={{ color: "#0f172a", fontWeight: 600 }}>{asymmetry.favoredParty}</strong>
                </div>
              )}
              {asymmetry?.explanation && (
                <p style={{ margin: 0, fontSize: 12.5, color: "#64748b", lineHeight: 1.55 }}>{asymmetry.explanation}</p>
              )}
            </div>
          )}

          {/* Vollständigkeit + Konfidenz/Qualität */}
          {(completeness || confPct || qualPct) && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}>
                <ShieldCheck size={14} style={{ color: "#10b981" }} aria-hidden="true" />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" }}>
                  Analyse-Qualität
                </span>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
                {completeness && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "4px 10px",
                    background: completeness.isComplete === false ? "#fffbeb" : "#ecfdf5",
                    color: completeness.isComplete === false ? "#92400e" : "#065f46",
                    border: `1px solid ${completeness.isComplete === false ? "#fde68a" : "#a7f3d0"}`,
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}>
                    {completeness.isComplete === false ? `${(completeness.openItems || []).length} offene Punkte` : "Vollständig"}
                  </span>
                )}
                {confPct && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "4px 10px",
                    background: "#eff6ff",
                    color: "#1e40af",
                    border: "1px solid #bfdbfe",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}>
                    Konfidenz {confPct}
                  </span>
                )}
                {qualPct && (
                  <span style={{
                    display: "inline-flex", alignItems: "center", gap: 4,
                    padding: "4px 10px",
                    background: "#f5f3ff",
                    color: "#5b21b6",
                    border: "1px solid #ddd6fe",
                    borderRadius: 999,
                    fontSize: 11.5,
                    fontWeight: 600,
                  }}>
                    Textqualität {qualPct}
                  </span>
                )}
              </div>
              {completeness?.observation && (
                <p style={{ margin: 0, fontSize: 12.5, color: "#64748b", lineHeight: 1.55 }}>{completeness.observation}</p>
              )}
              {completeness?.openItems && completeness.openItems.length > 0 && (
                <ul style={{ margin: "8px 0 0 0", padding: "0 0 0 18px", fontSize: 12.5, color: "#64748b", lineHeight: 1.55 }}>
                  {completeness.openItems.slice(0, 5).map((item, i) => (
                    <li key={i} style={{ marginBottom: 3 }}>{item}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Fallback wenn gar nichts da */}
          {!scoreReasoning && !asymLabel && !completeness && !confPct && !qualPct && (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.55, textAlign: "center", padding: "12px 0" }}>
              Detaillierte Score-Begründung liegt für diese Analyse nicht vor.
            </p>
          )}

          {/* 🧪 Methodik-Versionshinweis (Lighthouse-Muster, 21.07.2026): ruhige Zeile
              statt Banner — beantwortet „warum ist der Score strenger als früher?"
              genau dort, wo jemand nachschaut. Kein Alarm, keine Bühne. */}
          <p style={{
            margin: "4px 0 0",
            paddingTop: 12,
            borderTop: "1px solid #e2e8f0",
            fontSize: 11.5,
            color: "#94a3b8",
            lineHeight: 1.5,
          }}>
            Score-Methodik Juli 2026: Die Analyse prüft seit Juli 2026 strenger und belegt
            Funde wörtlich im Vertrag. Scores fallen dadurch niedriger aus als bei früheren Analysen.
          </p>
        </div>
      </div>
    </div>
  );
}
