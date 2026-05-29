// V2-Conversion-Banner — Plan-spezifischer CTA innerhalb der Analyse-Card.
//
//   Free       → Brand-Blau, "Hol dir die volle Tiefe — ab 19 €/Monat"
//   Business   → Brand-Blau (dunkler), "Mehrere Verträge gleichzeitig?" → Enterprise
//   Enterprise → null (kein Banner — dafür dezenter Footer in der Action-Bar)
//
// 🆕 29.05.2026: X-Button + 30-Tage-Dismiss-Frequenz (localStorage).
// User kann Banner pro Plan einmal monatlich wegklicken — danach erscheint er
// erst wieder nach 30 Tagen bei der nächsten Analyse. Memory-key: pro Plan
// separat (`v2BannerDismissedAt_free`, `v2BannerDismissedAt_business`).
import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { classifyDocType, getDocNounPlural } from "./v2TabLabels";

interface UsageData {
  analysisCount?: number;
  limit?: number;
  plan?: string;
}

interface Props {
  usage?: UsageData | null;
  userPlan?: string | null;
  // 🎯 NEU 20.05.2026 — für typspezifische Banner-Headline
  documentType?: string | null;
  contractType?: string | null;
}

const DISMISS_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 Tage
const DISMISS_KEY_PREFIX = "v2BannerDismissedAt_";

function isBannerDismissed(plan: string): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY_PREFIX + plan);
    if (!raw) return false;
    const dismissedAt = parseInt(raw, 10);
    if (!isFinite(dismissedAt)) return false;
    return Date.now() - dismissedAt < DISMISS_DURATION_MS;
  } catch {
    return false;
  }
}

function dismissBanner(plan: string): void {
  try {
    localStorage.setItem(DISMISS_KEY_PREFIX + plan, String(Date.now()));
  } catch { /* Safari private mode / quota */ }
}

export default function V2ConversionBanner({ usage, userPlan, documentType, contractType }: Props) {
  // 🎯 Typspezifischer Plural (20.05.2026)
  const docClass = classifyDocType(documentType, contractType);
  const docPlural = getDocNounPlural(docClass);
  const plan = (usage?.plan || userPlan || "").toLowerCase();
  const count = usage?.analysisCount;
  const limit = usage?.limit;
  const limitDisplay = limit && isFinite(limit) ? limit : "∞";

  // Responsive: stack bei <600px
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 600);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // 🆕 Dismiss-State: bei Mount aus localStorage lesen
  const [dismissed, setDismissed] = useState<boolean>(() => isBannerDismissed(plan || "free"));
  useEffect(() => {
    // Plan-Wechsel (z.B. Upgrade während Session) → erneut prüfen
    setDismissed(isBannerDismissed(plan || "free"));
  }, [plan]);

  const handleDismiss = () => {
    dismissBanner(plan || "free");
    setDismissed(true);
  };

  const stackStyle = isMobile ? { flexDirection: "column" as const, alignItems: "flex-start" as const, gap: 12 } : {};
  const ctaStyle = isMobile ? { width: "100%", justifyContent: "center" as const } : {};

  if (plan === "enterprise") return null;
  if (dismissed) return null;

  // Close-Button gemeinsamer Style
  const closeButton = (
    <button
      onClick={handleDismiss}
      aria-label="Banner schließen (30 Tage ausblenden)"
      title="Banner für 30 Tage ausblenden"
      style={{
        position: "absolute",
        top: 8,
        right: 8,
        background: "rgba(255,255,255,.15)",
        border: "none",
        borderRadius: 6,
        width: 26,
        height: 26,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "rgba(255,255,255,.85)",
        transition: "background 0.15s ease",
        zIndex: 2,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.25)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,.15)"; }}
    >
      <X size={14} />
    </button>
  );

  if (plan === "business") {
    const eye = count != null && limit ? `Business · ${count} von ${limitDisplay} Analysen` : "Business-Account";
    return (
      <div style={{
        margin: isMobile ? "0 12px 20px" : "0 24px 20px",
        background: "linear-gradient(135deg,#2563eb,#1d4ed8)",
        borderRadius: 12,
        padding: isMobile ? "14px 16px" : "18px 22px",
        paddingRight: isMobile ? "44px" : "48px", // Platz für X-Button
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        color: "#fff",
        flexWrap: "wrap",
        position: "relative",
        ...stackStyle,
      }}>
        {closeButton}
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#bfdbfe", marginBottom: 4 }}>{eye}</div>
          <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 4, letterSpacing: "-.015em" }}>{`Mehrere ${docPlural} gleichzeitig?`}</div>
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)" }}>Enterprise: unbegrenzt · Team-Funktionen · Custom-Playbooks</div>
        </div>
        <a href="/pricing" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "9px 16px", background: "#fff", color: "#0f172a",
          borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none",
          flexShrink: 0,
          ...ctaStyle,
        }}>
          Enterprise ansehen <ArrowRight size={13} />
        </a>
      </div>
    );
  }

  // Default: Free
  const eye = count != null && limit ? `Free-Account · ${count} von ${limitDisplay} Analysen` : "Free-Account";
  return (
    <div style={{
      margin: isMobile ? "0 12px 20px" : "0 24px 20px",
      background: "linear-gradient(135deg,#3b82f6,#2563eb)",
      borderRadius: 12,
      padding: isMobile ? "14px 16px" : "18px 22px",
      paddingRight: isMobile ? "44px" : "48px", // Platz für X-Button
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 18,
      color: "#fff",
      position: "relative",
      overflow: "hidden",
      flexWrap: "wrap",
      ...stackStyle,
    }}>
      {closeButton}
      <div style={{
        content: '""',
        position: "absolute",
        top: "-50%", right: "-20%",
        width: "60%", height: "200%",
        background: "radial-gradient(ellipse,rgba(255,255,255,.15),transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#dbeafe", marginBottom: 4 }}>{eye}</div>
        <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 4, letterSpacing: "-.015em" }}>Hol dir die volle Tiefe</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.8)" }}>Business: 25 Analysen/Monat · Pilotprüfung · Vorprüfungs-PDFs · ab 19 €/Monat</div>
      </div>
      <a href="/pricing" style={{
        position: "relative", zIndex: 1,
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "9px 16px", background: "#fff", color: "#0f172a",
        borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: "none",
        flexShrink: 0,
        ...ctaStyle,
      }}>
        Plan ansehen <ArrowRight size={13} />
      </a>
    </div>
  );
}
