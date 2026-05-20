// V2-Conversion-Banner — Plan-spezifischer CTA innerhalb der Analyse-Card.
//
//   Free       → schwarz, "Hol dir die volle Tiefe — ab 19 €/Monat"
//   Business   → blau, "Mehrere Verträge gleichzeitig?" → Enterprise
//   Enterprise → null (kein Banner — dafür dezenter Footer in der Action-Bar)

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
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

  const stackStyle = isMobile ? { flexDirection: "column" as const, alignItems: "flex-start" as const, gap: 12 } : {};
  const ctaStyle = isMobile ? { width: "100%", justifyContent: "center" as const } : {};

  if (plan === "enterprise") return null;

  if (plan === "business") {
    const eye = count != null && limit ? `Business · ${count} von ${limitDisplay} Analysen` : "Business-Account";
    return (
      <div style={{
        margin: isMobile ? "0 12px 20px" : "0 24px 20px",
        background: "linear-gradient(135deg,#1e40af,#1e3a8a)",
        borderRadius: 12,
        padding: isMobile ? "14px 16px" : "18px 22px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 18,
        color: "#fff",
        flexWrap: "wrap",
        ...stackStyle,
      }}>
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
      background: "linear-gradient(135deg,#1e293b,#0f172a)",
      borderRadius: 12,
      padding: isMobile ? "14px 16px" : "18px 22px",
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
      <div style={{
        content: '""',
        position: "absolute",
        top: "-50%", right: "-20%",
        width: "60%", height: "200%",
        background: "radial-gradient(ellipse,rgba(245,158,11,.18),transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{ position: "relative", zIndex: 1 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: "#f59e0b", marginBottom: 4 }}>{eye}</div>
        <div style={{ fontSize: 15.5, fontWeight: 700, marginBottom: 4, letterSpacing: "-.015em" }}>Hol dir die volle Tiefe</div>
        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.7)" }}>Business: 25 Analysen/Monat · Pilotprüfung · Vorprüfungs-PDFs · ab 19 €/Monat</div>
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
