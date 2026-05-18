// V2-Hero-Section — neuer Top-Bereich nach v6-Mockup.
//
// Rendert: File-Header, Banner mit Vollständigkeit/Konfidenz/Qualität-Pills,
// Score-Hero mit Donut + Headline + Stats, Quick-Facts adaptive Spalten,
// Asymmetrie-Pille mit 4 Werten + Erklärung.
//
// Backend-Felder werden defensiv gelesen (data?.X || fallback) — passt zu echten
// Daten aus 40 verifizierten Verträgen (siehe mockups/_validate-render.js).
//
// Liest sowohl result als auch initialResult. Pipeline unangetastet.

import { useState, useEffect, useRef } from "react";
import { CheckCircle, FileText, RefreshCw, Gavel, WifiOff, Info, ShieldCheck, Sparkles, RotateCcw, Scale, CheckSquare, Eye } from "lucide-react";
import styles from "./V2HeroSection.module.css";
import V2ConversionBanner from "./V2ConversionBanner";
import V2ScoreDetailDrawer from "./V2ScoreDetailDrawer";
import V2PdfViewerModal from "./V2PdfViewerModal";

// Render-fähige Datenstruktur — Backend liefert je Vertrag andere Teilmengen
type AnalysisData = {
  contractScore?: number | null;
  scoreReasoning?: string | null;
  analysisMessage?: string | null;
  documentCharacterization?: { description?: string; rationale?: string; documentType?: string; documentStatus?: string } | null;
  completeness?: { isComplete?: boolean; observation?: string; openItems?: string[] } | null;
  asymmetryAssessment?: { rating?: string; favoredParty?: string | null; explanation?: string } | null;
  laymanSummary?: string[] | string | null;
  quickFacts?: Array<{ label?: string; value?: string | number; meta?: string; rating?: string }> | null;
  summary?: string[] | string | null;
  criticalIssues?: unknown[] | null;
  positiveAspects?: unknown[] | null;
  fristHinweise?: unknown[] | null;
  recommendations?: unknown[] | null;
  typeSpecificFindings?: unknown[] | null;
  importantDates?: Array<{ type?: string; date?: string; label?: string; title?: string; description?: string }> | null;
  detailedLegalOpinion?: string | null;
  confidence?: number | string | null;
  qualityScore?: number | string | null;
  documentType?: string | null;
  pageCount?: number | null;
  provider?: { name?: string } | null;
  isReanalysis?: boolean;
  lawyerLevelAnalysis?: boolean;
  requestId?: string;
};

interface Props {
  data: AnalysisData;
  fileName: string;
  serviceHealth?: boolean | null;
  isInitialResult?: boolean;
  // Action-Buttons rechts in der File-Card (statt oben im Header)
  canReanalyze?: boolean;
  analyzing?: boolean;
  onReanalyze?: () => void;
  onReset?: () => void;
  // contractId aus dem Parent — wenn vorhanden, wird der "PDF anzeigen"-Button
  // gezeigt. Backend liefert via /api/s3/view?contractId=X die signed S3-URL.
  contractId?: string | null;
  // Conversion-Banner inline im Hero (Free→Business/Business→Enterprise)
  usage?: { analysisCount?: number; limit?: number; plan?: string } | null;
  userPlan?: string | null;
}

// Erkennt eine kaputte/unvollständige Analyse:
//   - Score 0 (zuverlässiger Backend-Fallback-Indikator)
//   - Score < 30 + alle Inhalts-Felder leer
//   - Inhalt enthält "Ohne Vertragstext"-Hilflos-Antworten der KI
export function isFailedAnalysis(d: AnalysisData): boolean {
  if (d.contractScore === 0) return true;
  const isArrayEmpty = (a: unknown) => !Array.isArray(a) || a.length === 0;
  const helplessRegex = /ohne (den )?vertragstext|kann (ich )?(keine?|nicht)|bitte lade/i;
  const summaryStr = Array.isArray(d.summary) ? d.summary.join(" ") : (typeof d.summary === "string" ? d.summary : "");
  if (d.contractScore != null && d.contractScore < 30 && helplessRegex.test(summaryStr)) return true;
  if (d.contractScore == null || d.contractScore < 30) {
    return isArrayEmpty(d.summary)
      && isArrayEmpty(d.criticalIssues)
      && isArrayEmpty(d.positiveAspects)
      && isArrayEmpty(d.recommendations)
      && !d.scoreReasoning
      && !d.detailedLegalOpinion;
  }
  return false;
}

function getScoreVariant(score: number | null | undefined) {
  if (score == null) return { color: "#94a3b8", rating: "Vorläufig", cls: styles.ratingAmber };
  if (score >= 90) return { color: "#10b981", rating: "Exzellent", cls: styles.ratingSuccess };
  if (score >= 70) return { color: "#2563eb", rating: "Solide", cls: styles.ratingPrimary };
  if (score >= 40) return { color: "#f59e0b", rating: "Verbesserung nötig", cls: styles.ratingAmber };
  return { color: "#ef4444", rating: "Kritisch", cls: styles.ratingRed };
}

function formatPercent(v: number | string | null | undefined): string {
  if (v == null || v === "") return "";
  if (typeof v === "string") {
    if (v.includes("%")) return v;
    const n = parseFloat(v);
    if (!isNaN(n)) return Math.round(n <= 1 ? n * 100 : n) + "%";
    return v;
  }
  if (typeof v === "number") return Math.round(v <= 1 ? v * 100 : v) + "%";
  return "";
}

// Backend setzt einen technischen Enum-Marker als top-level `documentType`
// (CONTRACT/INVOICE/RECEIPT/FINANCIAL_DOCUMENT/TABLE_DOCUMENT/UNKNOWN). Diese
// Werte sind interne Detector-Outputs — niemals user-facing zeigen. Sie können
// bei Mis-Klassifikation auch zu Pillen wie "TABLE_DOCUMENT" und Icon-
// Abkürzungen wie "TAB" führen, was Verwirrung erzeugt.
const BACKEND_DOC_TYPE_MARKERS = /^(CONTRACT|INVOICE|RECEIPT|FINANCIAL_DOCUMENT|TABLE_DOCUMENT|UNKNOWN)$/i;
function isBackendDocTypeMarker(s: string | null | undefined): boolean {
  return !!s && BACKEND_DOC_TYPE_MARKERS.test(s);
}

function buildHeroTitle(d: AnalysisData): string {
  // analysisMessage ist eine interne Backend-Strategy-Message (z.B. "Erweiterte
  // Tabellenanalyse" bei Mis-Klassifikation als TABLE_DOCUMENT) — kein User-
  // facing Titel. Wir bauen den Titel stattdessen aus dem sauberen DocType-
  // Label + Score-Variante.
  const cleanDocType = pickDocTypeLabel(d);
  if (d.contractScore == null) return `${cleanDocType} — Bewertung steht aus`;
  // Genus-agnostische Templates: "Vertrag" (m) und "Vereinbarung" (f) sollen
  // beide grammatikalisch sauber passen → Adjektiv hinter Substantiv.
  if (d.contractScore >= 85) return `${cleanDocType} — sehr fair gestaltet`;
  if (d.contractScore >= 70) return `${cleanDocType} — solide, mit kleinen Stellen zum Verhandeln`;
  if (d.contractScore >= 50) return `${cleanDocType} — deutlicher Verbesserungsbedarf`;
  return `${cleanDocType} — kritisch, sorgfältig prüfen vor Unterschrift`;
}

function truncateAtWord(s: string, max = 280): string {
  if (s.length <= max) return s;
  const cut = s.substring(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 200 ? cut.substring(0, lastSpace) : cut) + "…";
}

// Erkennt und bereinigt OCR-Output mit Leerzeichen zwischen jedem Buchstaben:
// "M I E T V E R T R AG" → "Mietvertrag"
// Heuristik: wenn >50 % der Tokens nur 1-2 Zeichen lang sind → Spaces entfernen.
function cleanOcrSpacing(s: string): string {
  if (!s) return s;
  const tokens = s.trim().split(/\s+/);
  if (tokens.length < 3) return s;
  const shortTokens = tokens.filter(t => t.length <= 2).length;
  if (shortTokens / tokens.length < 0.5) return s;
  const joined = tokens.join("");
  // Title-Case: erster Buchstabe groß, Rest klein
  return joined.charAt(0).toUpperCase() + joined.slice(1).toLowerCase();
}

// Wählt den besten Doc-Type für die File-Card-Pille:
// 1. documentCharacterization.description, gekürzt + OCR-bereinigt
// 2. documentCharacterization.documentType, OCR-bereinigt
// 3. documentType (top-level) — niemals leer
function pickDocTypeLabel(d: AnalysisData): string {
  const desc = d.documentCharacterization?.description;
  if (desc) {
    const cleanDesc = cleanOcrSpacing(desc)
      .replace(/^aktiver,?\s*beidseitig\s*unterzeichneter\s*/i, "")
      .replace(/\s+über\s+.*/i, "")
      .trim();
    if (cleanDesc.length > 0 && cleanDesc.length <= 40) return cleanDesc;
  }
  const docTypeRaw = d.documentCharacterization?.documentType;
  if (docTypeRaw && !isBackendDocTypeMarker(docTypeRaw)) {
    const cleaned = cleanOcrSpacing(docTypeRaw);
    if (cleaned.length <= 40) return cleaned;
  }
  // Backend-Enum-Marker (CONTRACT/INVOICE/RECEIPT/FINANCIAL_DOCUMENT/
  // TABLE_DOCUMENT/UNKNOWN) sind interne Tech-Strings und werden niemals
  // user-facing gezeigt → Fallback "Vertrag".
  const fallback = d.documentType;
  if (!fallback || isBackendDocTypeMarker(fallback)) return "Vertrag";
  return fallback;
}

export default function V2HeroSection({ data, fileName, serviceHealth, isInitialResult, canReanalyze, analyzing, onReanalyze, onReset, contractId, usage, userPlan }: Props) {
  const d = data;
  const score = d.contractScore;
  const variant = getScoreVariant(score);
  const [laymanMode, setLaymanMode] = useState(false);
  const [heroSubExpanded, setHeroSubExpanded] = useState(false);
  const [scoreDrawerOpen, setScoreDrawerOpen] = useState(false);
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);

  // Score-Counter-Animation: 0 → finaler Wert in 1.4s mit ease-out.
  // ALLE Hooks MÜSSEN vor dem isFailedAnalysis-early-return stehen (React Rules-of-Hooks).
  // Accessibility: respektiert prefers-reduced-motion (WCAG 2.3.3) — bei aktivierter
  // Reduced-Motion-Präferenz wird der finale Score sofort gesetzt, keine Animation.
  const [animatedScore, setAnimatedScore] = useState<number | null>(score == null ? null : 0);
  const animRef = useRef<number | null>(null);
  useEffect(() => {
    if (score == null) {
      setAnimatedScore(null);
      return;
    }
    const targetScore = Math.round(score);

    // Reduced-Motion-Check: kein Counter, direkt finalen Wert setzen.
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setAnimatedScore(targetScore);
      return;
    }

    const duration = 1400;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(targetScore * eased));
      if (progress < 1) animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current != null) cancelAnimationFrame(animRef.current);
    };
  }, [score]);

  // Spezialfall: Analyse fehlgeschlagen → eigener roter Banner statt peinlich leeres Layout
  if (isFailedAnalysis(d)) {
    return (
      <>
        <div className={styles.fileCard}>
          <div className={styles.fcLeft}>
            <div className={styles.fcIcon} style={{ background: "linear-gradient(135deg,#fef2f2,#fecaca)", color: "#ef4444" }}>!</div>
            <div className={styles.fcMeta}>
              <div className={styles.fcName}>{fileName}</div>
              <div className={styles.fcPartners}>
                <span className={styles.fcDoctype} style={{ background: "#fef2f2", color: "#ef4444" }}>Analyse unvollständig</span>
              </div>
            </div>
          </div>
        </div>
        <div role="alert" aria-live="polite" style={{
          background: "#fef2f2",
          border: "1px solid #fca5a5",
          borderRadius: 14,
          padding: "20px 24px",
          marginBottom: 16,
          display: "flex",
          alignItems: "flex-start",
          gap: 14,
        }}>
          <div style={{
            width: 40, height: 40,
            background: "#ef4444",
            color: "#fff",
            borderRadius: 10,
            display: "grid", placeItems: "center",
            flexShrink: 0,
            fontSize: 20, fontWeight: 700,
          }}>!</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
              Analyse konnte nicht abgeschlossen werden
            </div>
            <div style={{ fontSize: 13.5, color: "#475569", lineHeight: 1.55 }}>
              Für diesen Vertrag liegen keine Analyse-Ergebnisse vor — vermutlich konnte die KI den Vertragstext nicht ausreichend extrahieren oder die Pipeline ist während der Verarbeitung abgebrochen. <strong>Bitte erneut analysieren.</strong>
            </div>
          </div>
        </div>
      </>
    );
  }

  // SVG Donut Math
  const radius = 68;
  const circumference = 2 * Math.PI * radius;

  const displayScore = animatedScore == null ? "—" : animatedScore;
  const offset = score == null
    ? circumference
    : circumference - (Math.min(100, Math.max(0, animatedScore ?? 0)) / 100) * circumference;

  // Layman-Modus: laymanSummary statt scoreReasoning anzeigen
  const laymanArr = Array.isArray(d.laymanSummary) ? d.laymanSummary : (typeof d.laymanSummary === "string" ? [d.laymanSummary] : []);
  const hasLayman = laymanArr.length > 0;
  let heroSubFull: string;
  if (laymanMode && hasLayman) {
    heroSubFull = laymanArr.join(" ");
  } else {
    heroSubFull = d.scoreReasoning || laymanArr[0] || "";
  }
  // Truncate-Threshold abhängig von Modus + Expand-State.
  // Wenn User „Mehr anzeigen" geklickt → vollständig, sonst gekürzt.
  const truncateAt = laymanMode ? 600 : 280;
  const isHeroSubTruncated = heroSubFull.length > truncateAt;
  const heroSub = heroSubExpanded || !isHeroSubTruncated
    ? heroSubFull
    : truncateAtWord(heroSubFull, truncateAt);

  // Counts für Hero-Stats
  const critCount = Array.isArray(d.criticalIssues) ? d.criticalIssues.length : 0;
  // Termin-Count = importantDates (konkrete Kalenderdaten) + fristHinweise
  // (universelle Frist-Hinweise aus Date Hunt). Bei Rahmenverträgen gibt's
  // oft wenige konkrete Datums, aber viele Frist-Hinweise — der User soll die
  // gesamte Menge an termin-relevanten Items im Hero sehen, nicht nur einen
  // Teil. Beide Quellen werden unten in der Termine-Sektion gerendert.
  const importantDatesCount = Array.isArray(d.importantDates) ? d.importantDates.length : 0;
  const fristHinweiseCount = Array.isArray(d.fristHinweise) ? d.fristHinweise.length : 0;
  const terminCount = importantDatesCount + fristHinweiseCount;
  const recoCount = Array.isArray(d.recommendations) ? d.recommendations.length : 0;
  const tsfCount = Array.isArray(d.typeSpecificFindings) ? d.typeSpecificFindings.length : 0;

  // Asymmetrie — 4 Werte plus 'not_applicable' (dann nicht rendern)
  const asym = d.asymmetryAssessment;
  const asymRating = (asym?.rating || "").toLowerCase().replace(/_/g, "-");
  const asymKnown = ["balanced", "mostly-fair", "one-sided", "heavily-one-sided"].includes(asymRating);
  const asymLabels: Record<string, string> = {
    "balanced": "Ausgewogen",
    "mostly-fair": "Größtenteils ausgewogen",
    "one-sided": "Einseitig — eine Partei bevorzugt",
    "heavily-one-sided": "Stark einseitig — kritisch",
  };
  const asymCls: Record<string, string> = {
    "balanced": styles.pillBalanced,
    "mostly-fair": styles.pillMostlyFair,
    "one-sided": styles.pillOneSided,
    "heavily-one-sided": styles.pillHeavilyOneSided,
  };
  const asymIconCls: Record<string, string> = {
    "balanced": styles.iconBalanced,
    "mostly-fair": styles.iconMostlyFair,
    "one-sided": styles.iconOneSided,
    "heavily-one-sided": styles.iconHeavilyOneSided,
  };

  // Quick-Facts adaptive Spalten
  const qf = Array.isArray(d.quickFacts) ? d.quickFacts.slice(0, 6) : [];
  const cols = qf.length;
  const factsCls = cols === 6 ? styles.facts6 : cols === 5 ? styles.facts5 : cols === 4 ? styles.facts4 : cols === 3 ? styles.facts3 : cols >= 2 ? styles.facts2 : "";

  // Banner-Pills
  const completeness = d.completeness;
  const isIncomplete = completeness?.isComplete === false;
  // 0% ist ein Backend-Fallback wenn Validation nicht lief — nicht zeigen, das verwirrt mehr als es informiert
  const isMeaningfulPercent = (v: number | string | null | undefined) => {
    if (v == null || v === "") return false;
    const n = typeof v === "number" ? v : parseFloat(String(v));
    return !isNaN(n) && n > 0;
  };
  const conf = isMeaningfulPercent(d.confidence) ? formatPercent(d.confidence) : "";
  const qual = isMeaningfulPercent(d.qualityScore) ? formatPercent(d.qualityScore) : "";

  // File-Type-Icon-Text — Backend-Enum-Marker (z.B. "TABLE_DOCUMENT" → "TAB",
  // "INVOICE" → "INV") sind interne Tech-Marker. Statt die abzukürzen lieber
  // die Dateiendung (PDF/DOCX) zeigen — die ist für User aussagekräftig.
  const dt = d.documentType;
  const fileExt = (fileName.match(/\.([a-z0-9]{1,4})$/i)?.[1] || "PDF").toUpperCase();
  const fileIconText = (!dt || isBackendDocTypeMarker(dt) ? fileExt : dt).substring(0, 3).toUpperCase();
  const docTypeLabel = pickDocTypeLabel(d);

  // Banner-Headline — analysisMessage (Backend-Strategy-Marker) wird hier
  // bewusst nicht verwendet, weil er bei Mis-Klassifikation irreführend wird
  // ("Erweiterte Tabellenanalyse" für einen NDA).
  const bannerHead = d.lawyerLevelAnalysis
    ? "Juristische Tiefenanalyse abgeschlossen"
    : "Analyse abgeschlossen";

  return (
    <>
      {/* FILE-HEADER */}
      <div className={styles.fileCard}>
        <div className={styles.fcLeft}>
          <div className={styles.fcIcon}>{fileIconText}</div>
          <div className={styles.fcMeta}>
            <div className={styles.fcName}>{fileName}</div>
            <div className={styles.fcPartners}>
              <span className={styles.fcDoctype}>
                <FileText size={11} />
                {docTypeLabel}
                {d.pageCount ? ` · ${d.pageCount} Seiten` : ""}
              </span>
              {d.provider?.name && (
                <span className={styles.fcStatusPill} style={{ background: "#eff6ff", color: "#2563eb" }}>
                  {cleanOcrSpacing(d.provider.name)}
                </span>
              )}
              {d.isReanalysis && (
                <span className={`${styles.fcStatusPill} ${styles.statusReanalyze}`}>
                  <RefreshCw size={10} /> Aktualisiert
                </span>
              )}
              {isInitialResult && !d.isReanalysis && (
                <span className={`${styles.fcStatusPill} ${styles.statusInitial}`}>
                  <CheckCircle size={10} /> Bereits analysiert
                </span>
              )}
              {d.lawyerLevelAnalysis && (
                <>
                  <span className={styles.fcStatusPill} style={{ background: "#f5f3ff", color: "#8b5cf6" }}>
                    <Scale size={10} /> 7-Punkte-Analyse
                  </span>
                  <span className={styles.fcStatusPill} style={{ background: "#f5f3ff", color: "#8b5cf6" }}>
                    <Gavel size={10} /> Tiefenanalyse
                  </span>
                  <span className={styles.fcStatusPill} style={{ background: "#f5f3ff", color: "#8b5cf6" }}>
                    <CheckSquare size={10} /> Vollständigkeitsgarantie
                  </span>
                </>
              )}
              {serviceHealth === false && (
                <span className={`${styles.fcStatusPill} ${styles.statusService}`}>
                  <WifiOff size={10} /> Service nicht erreichbar
                </span>
              )}
            </div>
          </div>
        </div>
        {(onReanalyze || onReset || contractId) && (
          <div className={styles.fcActions}>
            {contractId && (
              <button
                type="button"
                className={`${styles.fcBtn} ${styles.fcBtnInfo}`}
                onClick={() => setPdfViewerOpen(true)}
                disabled={analyzing}
                aria-label="Original-PDF in Vorschau anzeigen"
              >
                <Eye size={14} aria-hidden="true" />
                <span>PDF anzeigen</span>
              </button>
            )}
            {canReanalyze && onReanalyze && (
              <button
                type="button"
                className={`${styles.fcBtn} ${styles.fcBtnPrimary} ${analyzing ? styles.fcBtnLoading : ""}`}
                onClick={onReanalyze}
                disabled={analyzing}
                aria-label={analyzing ? "Analyse läuft" : "Analyse erneut durchführen"}
                aria-busy={analyzing || undefined}
              >
                <RefreshCw size={14} aria-hidden="true" className={analyzing ? styles.spinIcon : ""} />
                <span>{analyzing ? "Analysiere..." : "Erneut analysieren"}</span>
              </button>
            )}
            {onReset && (
              <button
                type="button"
                className={styles.fcBtn}
                onClick={onReset}
                disabled={analyzing}
                aria-label="Analyse zurücksetzen"
              >
                <RotateCcw size={14} aria-hidden="true" />
                <span>Zurücksetzen</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* RECOGNITION-BANNER — erscheint VOR der Analyse-Card, wenn die KI
          einen non-finalen Dokument-Status erkennt (Muster/Entwurf/LOI/etc.)
          oder completeness.isComplete === false meldet. Render-if-present. */}
      {(() => {
        const docChar = d.documentCharacterization;
        const completeness = d.completeness;
        const desc = docChar?.description || "";
        const lowerDesc = desc.toLowerCase();
        const nonFinalSignals = [
          "muster", "mustervertrag", "template", "vorlage",
          "entwurf", "draft",
          "vorvertrag", "letter of intent", "loi",
          "term sheet", "memorandum of understanding", "mou",
          "side letter",
          "unvollständ", "incomplete", "noch nicht ausgefüllt", "placeholder",
        ];
        const isNonFinal = nonFinalSignals.some(s => lowerDesc.includes(s))
          || completeness?.isComplete === false;
        if (!isNonFinal || !desc) return null;
        return (
          <div className={styles.recognitionBanner} role="alert">
            <div className={styles.recognitionIcon} aria-hidden="true">⚠️</div>
            <div className={styles.recognitionBody}>
              <div className={styles.recognitionTitle}>Hinweis zum Dokument-Status</div>
              <div className={styles.recognitionDesc}>{desc}</div>
              {docChar?.rationale && (
                <div className={styles.recognitionRationale}>{docChar.rationale}</div>
              )}
              {completeness?.openItems && completeness.openItems.length > 0 && (
                <div className={styles.recognitionOpenItems}>
                  <strong>Noch offen:</strong> {completeness.openItems.join(" • ")}
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ANALYSIS-CARD */}
      <div className={styles.analysisCard}>

        {/* BANNER */}
        <div className={styles.acBanner}>
          <div className={styles.acBannerLeft}>
            <div className={styles.acBannerIcon}><CheckCircle size={14} /></div>
            <div className={styles.acBannerText}><strong>{bannerHead}</strong></div>
          </div>
          <div className={styles.acBannerMeta}>
            <span className={styles.acBannerPill} title="Vollständigkeit: alle Pflicht-Elemente vorhanden">
              <CheckCircle size={11} />
              {isIncomplete ? `${(completeness?.openItems || []).length} offene Punkte` : "Vollständig"}
            </span>
            {conf && (
              <span className={styles.acBannerPill} title="Konfidenz: wie sicher ist die KI bei den extrahierten Werten">
                <Info size={11} />Konfidenz {conf}
              </span>
            )}
            {qual && (
              <span className={styles.acBannerPill} title="Qualität der Text-Extraktion">
                <ShieldCheck size={11} />Qualität {qual}
              </span>
            )}
            {d.requestId && <span className={styles.acBannerId}>ID: {d.requestId}</span>}
          </div>
        </div>

        {/* HERO mit Score-Donut */}
        <div className={styles.acHero}>
          <div>
            {/* Inline-Styles als Cache-Safe-Backup zusätzlich zum CSS-Modul.
                Score-Donut ist klickbar — öffnet Drawer mit Score-Zusammensetzung. */}
            <button
              type="button"
              onClick={() => setScoreDrawerOpen(true)}
              aria-label={`Score ${displayScore} von 100, klicken für Details zur Zusammensetzung`}
              title="So setzt sich dein Score zusammen — klick für Details"
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                borderRadius: "50%",
                transition: "transform 200ms ease",
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.03)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
            <div className={styles.scoreDonut} style={{ position: "relative", width: 160, height: 160 }}>
              <svg viewBox="0 0 160 160" role="img" aria-label={`Vertragsscore: ${displayScore} von 100, Bewertung: ${variant.rating}`} style={{ width: "100%", height: "100%", position: "relative", zIndex: 1 }}>
                <circle cx="80" cy="80" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="11" />
                <circle
                  cx="80" cy="80" r={radius} fill="none"
                  stroke={variant.color} strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={circumference.toFixed(2)}
                  strokeDashoffset={offset.toFixed(2)}
                  transform="rotate(-90 80 80)"
                />
                {/* Score-Zahl + "VON 100" als optische Gruppe.
                    Score y=74 statt 80 + VON-100 y=104 statt 112 verschiebt
                    die Gruppe leicht nach oben, damit sie visuell zentriert im
                    Kreis sitzt (sonst wirkt sie durch das Label darunter zu tief).
                    dominantBaseline=middle ist robuster über Browser hinweg als
                    central für Zahlen-Glyphen ohne Descender. */}
                <text
                  x="80"
                  y="74"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#0f172a"
                  fontSize="44"
                  fontWeight="700"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif"
                  style={{ letterSpacing: "-0.04em" }}
                >
                  {displayScore}
                </text>
                <text
                  x="80"
                  y="104"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="#94a3b8"
                  fontSize="10"
                  fontWeight="600"
                  fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif"
                  style={{ letterSpacing: "1px" }}
                >
                  VON 100
                </text>
              </svg>
            </div>
            </button>
            <div className={`${styles.scoreRating} ${variant.cls}`}>{variant.rating}</div>
            <div style={{ fontSize: 10.5, color: "#94a3b8", fontWeight: 600, letterSpacing: 0.5, textAlign: "center", marginTop: 4 }}>
              ⓘ Klick für Details
            </div>
          </div>
          <div>
            <div className={styles.heroEye}>Rechtliche Gesamtbewertung</div>
            <h2 className={styles.heroTitle}>{buildHeroTitle(d)}</h2>
            {heroSub && (
              <p className={styles.heroSub}>
                {heroSub}
                {isHeroSubTruncated && (
                  <button
                    type="button"
                    onClick={() => setHeroSubExpanded((v) => !v)}
                    style={{
                      marginLeft: 6,
                      background: "none",
                      border: "none",
                      color: "#2563eb",
                      fontSize: "inherit",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      textDecoration: "underline",
                      fontFamily: "inherit",
                    }}
                  >
                    {heroSubExpanded ? "Weniger" : "Mehr anzeigen"}
                  </button>
                )}
              </p>
            )}
            <div className={styles.heroStats}>
              <div className={styles.hsItem}>
                <span className={`${styles.hsDot} ${styles.hsDotRed}`} />
                <strong>{critCount}</strong>&nbsp;{critCount === 1 ? "kritische Klausel" : "kritische Klauseln"}
              </div>
              <div className={styles.hsItem}>
                <span className={`${styles.hsDot} ${styles.hsDotAmber}`} />
                <strong>{terminCount}</strong>&nbsp;{terminCount === 1 ? "Termin / Frist" : "Termine & Fristen"}
              </div>
              {tsfCount > 0 ? (
                <div className={styles.hsItem}>
                  <span className={`${styles.hsDot} ${styles.hsDotViolet}`} />
                  <strong>{tsfCount}</strong>&nbsp;Pilot-Checks
                </div>
              ) : (
                <div className={styles.hsItem}>
                  <span className={`${styles.hsDot} ${styles.hsDotViolet}`} />
                  <strong>{recoCount}</strong>&nbsp;{recoCount === 1 ? "Empfehlung" : "Empfehlungen"}
                </div>
              )}
            </div>
            {hasLayman && (
              <button
                type="button"
                className={`${styles.laymanToggle} ${laymanMode ? styles.laymanToggleActive : ""}`}
                onClick={() => setLaymanMode(v => !v)}
                aria-pressed={laymanMode}
                title={laymanMode ? "Zurück zur Anwalts-Sprache" : "In einfacher Sprache erklären"}
              >
                <Sparkles size={13} />
                {laymanMode ? "Anwalts-Sprache" : "In einfachen Worten"}
              </button>
            )}
          </div>
        </div>

        {/* Sentinel für V2StickyMiniHeader — IntersectionObserver beobachtet
            dieses Element. Sobald es out-of-viewport ist (User scrollt) erscheint
            der Mini-Header oben mit Filename + Score + Optimieren-Button. */}
        <div data-v2-hero-sentinel aria-hidden="true" style={{ width: 1, height: 1 }} />

        {/* QUICK-FACTS adaptive Spalten */}
        {qf.length > 0 && (
          <div className={`${styles.acFacts} ${factsCls}`}>
            {qf.map((f, i) => (
              <div className={styles.fact} key={i}>
                <div className={styles.factLabel}>{f.label || ""}</div>
                <div className={styles.factValue}>{f.value != null ? String(f.value) : ""}</div>
                {f.meta && <div className={styles.factMeta}>{f.meta}</div>}
              </div>
            ))}
          </div>
        )}

        {/* ASYMMETRIE-PILLE — 4 Werte, 'not_applicable' wird ausgeblendet */}
        {asymKnown && (
          <>
            <div className={styles.acBalance}>
              <div className={`${styles.balanceIcon} ${asymIconCls[asymRating]}`}>⚖️</div>
              <span className={styles.balanceLabel}>Vertrags-Ausgewogenheit</span>
              <span className={`${styles.balancePill} ${asymCls[asymRating]}`}>{asymLabels[asymRating]}</span>
            </div>
            {asym?.explanation && (
              <div className={styles.balanceExpl}>
                {asym.favoredParty && asym.favoredParty !== "null" && asym.favoredParty !== null && (
                  <strong>Bevorzugte Partei: {asym.favoredParty}.</strong>
                )}
                {asym.favoredParty && asym.favoredParty !== "null" && asym.favoredParty !== null ? " " : ""}
                {asym.explanation}
              </div>
            )}
          </>
        )}

        {/* AUF EINEN BLICK — 3 wichtigste Findings als Hero-Cards.
            User sieht in 3 Sekunden ohne klicken: Top-Risiko, Empfehlung, Termin.
            Render-if-present: wenn keins der 3 vorhanden → Block weglassen. */}
        {(() => {
          type InsightLike = { title?: string; description?: string; severity?: string; priority?: string; riskLevel?: string };
          const criticals = (Array.isArray(d.criticalIssues) ? d.criticalIssues : []) as InsightLike[];
          const recos = (Array.isArray(d.recommendations) ? d.recommendations : []) as InsightLike[];
          const dates = Array.isArray(d.importantDates) ? d.importantDates : [];

          const isHigh = (item: InsightLike) => /high|hoch|dringend|kritisch/i.test(String(item.severity || item.priority || item.riskLevel || ""));
          const topRisk = criticals.find(isHigh) || criticals[0];
          const topReco = recos.find(isHigh) || recos[0];

          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const upcoming = dates
            .map(ev => ({ ev, date: ev.date ? new Date(ev.date) : null }))
            .filter((x): x is { ev: typeof dates[0]; date: Date } => x.date != null && !isNaN(x.date.getTime()) && x.date >= now)
            .sort((a, b) => a.date.getTime() - b.date.getTime());
          const topDate = upcoming[0];

          if (!topRisk && !topReco && !topDate) return null;

          const truncate = (s: string, max: number) => s.length <= max ? s : s.substring(0, max).trim() + "…";
          const getInsightText = (item: InsightLike | undefined) => {
            if (!item) return "";
            return item.title || item.description || "";
          };

          return (
            <div className={styles.atAGlance}>
              <div className={styles.atAGlanceTitle}>Auf einen Blick</div>
              <div className={styles.atAGlanceGrid}>
                {topRisk && (
                  <div className={`${styles.glanceCard} ${styles.glanceCardRisk}`}>
                    <div className={styles.glanceIcon} aria-hidden="true">⚠️</div>
                    <div className={styles.glanceLabel}>Top-Risiko</div>
                    <div className={styles.glanceText}>{truncate(getInsightText(topRisk), 90)}</div>
                  </div>
                )}
                {topReco && (
                  <div className={`${styles.glanceCard} ${styles.glanceCardReco}`}>
                    <div className={styles.glanceIcon} aria-hidden="true">💡</div>
                    <div className={styles.glanceLabel}>Wichtigste Empfehlung</div>
                    <div className={styles.glanceText}>{truncate(getInsightText(topReco), 90)}</div>
                  </div>
                )}
                {topDate && (
                  <div className={`${styles.glanceCard} ${styles.glanceCardDate}`}>
                    <div className={styles.glanceIcon} aria-hidden="true">⏰</div>
                    <div className={styles.glanceLabel}>Kritischster Termin</div>
                    <div className={styles.glanceText}>
                      {topDate.ev.label || topDate.ev.title || "Termin"} · {topDate.date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Conversion-Banner inline im Hero — direkt nach Asymmetrie, max
            Sichtbarkeit für Free→Business-Conversion (Wow-Effekt-Moment).
            Banner rendert nur für Free/Business — Enterprise = null. */}
        {(usage || userPlan) && (
          <V2ConversionBanner usage={usage as Parameters<typeof V2ConversionBanner>[0]['usage']} userPlan={userPlan} />
        )}
      </div>

      {/* Score-Detail-Drawer — öffnet beim Klick auf Score-Donut */}
      <V2ScoreDetailDrawer
        open={scoreDrawerOpen}
        onClose={() => setScoreDrawerOpen(false)}
        score={score ?? null}
        scoreColor={variant.color}
        scoreRating={variant.rating}
        scoreReasoning={d.scoreReasoning}
        asymmetry={d.asymmetryAssessment}
        completeness={d.completeness}
        confidence={d.confidence}
        qualityScore={d.qualityScore}
      />

      {/* PDF-Viewer-Modal — öffnet beim Klick auf "PDF anzeigen" */}
      {contractId && (
        <V2PdfViewerModal
          contractId={contractId}
          fileName={fileName}
          isOpen={pdfViewerOpen}
          onClose={() => setPdfViewerOpen(false)}
        />
      )}
    </>
  );
}
