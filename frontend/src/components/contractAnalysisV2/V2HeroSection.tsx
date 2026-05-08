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

import { useState } from "react";
import { CheckCircle, FileText, RefreshCw, Gavel, WifiOff, Info, ShieldCheck, Sparkles } from "lucide-react";
import styles from "./V2HeroSection.module.css";

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

function buildHeroTitle(d: AnalysisData): string {
  if (d.analysisMessage) return d.analysisMessage;
  const rawDocType = d.documentCharacterization?.description || d.documentType || "Vertrag";
  const cleanDocType = cleanOcrSpacing(rawDocType)
    .replace(/^(aktiver,?\s*beidseitig\s*unterzeichneter\s*)/i, "")
    .replace(/\s+über\s+.*/i, "")
    .substring(0, 60);
  if (d.contractScore == null) return `${cleanDocType} — Bewertung steht aus`;
  if (d.contractScore >= 85) return `Sehr fair gestalteter ${cleanDocType}`;
  if (d.contractScore >= 70) return `Solider ${cleanDocType} mit kleinen Stellen zum Verhandeln`;
  if (d.contractScore >= 50) return `${cleanDocType} mit deutlichem Verbesserungsbedarf`;
  return `Kritischer ${cleanDocType} — sorgfältig prüfen vor Unterschrift`;
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
  if (docTypeRaw) {
    const cleaned = cleanOcrSpacing(docTypeRaw);
    if (cleaned.length <= 40) return cleaned;
  }
  return d.documentType || "Vertrag";
}

export default function V2HeroSection({ data, fileName, serviceHealth, isInitialResult }: Props) {
  const d = data;
  const score = d.contractScore;
  const variant = getScoreVariant(score);
  const [laymanMode, setLaymanMode] = useState(false);

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
        <div style={{
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
  const displayScore = score == null ? "—" : Math.round(score);
  const offset = score == null
    ? circumference
    : circumference - (Math.min(100, Math.max(0, score)) / 100) * circumference;

  // Layman-Modus: laymanSummary statt scoreReasoning anzeigen
  const laymanArr = Array.isArray(d.laymanSummary) ? d.laymanSummary : (typeof d.laymanSummary === "string" ? [d.laymanSummary] : []);
  const hasLayman = laymanArr.length > 0;
  let heroSub: string;
  if (laymanMode && hasLayman) {
    heroSub = laymanArr.join(" ");
  } else {
    heroSub = d.scoreReasoning || laymanArr[0] || "";
  }
  if (heroSub) heroSub = truncateAtWord(heroSub, laymanMode ? 600 : 280);

  // Counts für Hero-Stats
  const critCount = Array.isArray(d.criticalIssues) ? d.criticalIssues.length : 0;
  const fristCount = Array.isArray(d.fristHinweise) ? d.fristHinweise.length : 0;
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
  const conf = formatPercent(d.confidence);
  const qual = formatPercent(d.qualityScore);

  // File-Type-Icon-Text
  const fileIconText = (d.documentType || "PDF").substring(0, 3).toUpperCase();
  const docTypeLabel = pickDocTypeLabel(d);

  // Banner-Headline
  const bannerHead = d.analysisMessage
    || (d.lawyerLevelAnalysis ? "Tiefenanalyse abgeschlossen · Anwaltsniveau" : "Analyse abgeschlossen");

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
                  {d.provider.name}
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
                <span className={styles.fcStatusPill} style={{ background: "#f5f3ff", color: "#8b5cf6" }}>
                  <Gavel size={10} /> Anwaltsniveau
                </span>
              )}
              {serviceHealth === false && (
                <span className={`${styles.fcStatusPill} ${styles.statusService}`}>
                  <WifiOff size={10} /> Service nicht erreichbar
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

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
            <div className={styles.scoreDonut}>
              <svg viewBox="0 0 160 160" role="img" aria-label={`Vertragsscore: ${displayScore} von 100, Bewertung: ${variant.rating}`}>
                <circle cx="80" cy="80" r={radius} fill="none" stroke="#f1f5f9" strokeWidth="11" />
                <circle
                  cx="80" cy="80" r={radius} fill="none"
                  stroke={variant.color} strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={circumference.toFixed(2)}
                  strokeDashoffset={offset.toFixed(2)}
                  transform="rotate(-90 80 80)"
                />
              </svg>
              <div className={styles.scoreTextWrap}>
                <div className={styles.scoreNum} aria-hidden="true">{displayScore}</div>
                <div className={styles.scoreOf} aria-hidden="true">VON 100</div>
              </div>
            </div>
            <div className={`${styles.scoreRating} ${variant.cls}`}>{variant.rating}</div>
          </div>
          <div>
            <div className={styles.heroEye}>Anwaltliche Gesamtbewertung</div>
            <h2 className={styles.heroTitle}>{buildHeroTitle(d)}</h2>
            {heroSub && <p className={styles.heroSub}>{heroSub}</p>}
            <div className={styles.heroStats}>
              <div className={styles.hsItem}>
                <span className={`${styles.hsDot} ${styles.hsDotRed}`} />
                <strong>{critCount}</strong>&nbsp;{critCount === 1 ? "kritische Klausel" : "kritische Klauseln"}
              </div>
              <div className={styles.hsItem}>
                <span className={`${styles.hsDot} ${styles.hsDotAmber}`} />
                <strong>{fristCount}</strong>&nbsp;{fristCount === 1 ? "Frist" : "Fristen"}
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
                {asym.favoredParty && asym.favoredParty !== "null" && (
                  <strong>Bevorzugte Partei: {asym.favoredParty}.</strong>
                )}
                {asym.favoredParty && asym.favoredParty !== "null" ? " " : ""}
                {asym.explanation}
              </div>
            )}
          </>
        )}

      </div>
    </>
  );
}
