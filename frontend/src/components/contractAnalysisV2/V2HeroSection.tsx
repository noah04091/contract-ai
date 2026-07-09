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
import { CheckCircle, FileText, RefreshCw, WifiOff, Sparkles, Scale, Eye, AlertTriangle, PenLine, MessageSquare } from "lucide-react";
import styles from "./V2HeroSection.module.css";
import V2ConversionBanner from "./V2ConversionBanner";
import V2ScoreDetailDrawer from "./V2ScoreDetailDrawer";
import V2PdfViewerModal from "./V2PdfViewerModal";
import { classifyDocType, getDocNoun, type DocClass } from "./v2TabLabels";

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
  contractType?: string | null; // 🎯 NEU 20.05.2026 — für typspezifische UI
  contractTypeLabel?: string | null; // 🎯 NEU 28.05.2026 (A1) — Backend liefert sauberes deutsches Label via pilotTypeToLabel
  textLength?: number | null; // 🎯 NEU 20.05.2026 Finding 2 — für Min-Text-Banner
  pageCount?: number | null;
  provider?: { name?: string } | null;
  providerConfidence?: number | null; // 0-100 (Backend-Skala). <75 → Warn-Badge im UI
  providerDetected?: boolean | null;
  // ✍️ Unterschrifts-Status aus Textract SIGNATURES (nur gesetzt, wenn Erkennung lief).
  signatureDetection?: {
    detected?: boolean;
    count?: number;
    pages?: number[];
    source?: string;
  } | null;
  isReanalysis?: boolean;
  lawyerLevelAnalysis?: boolean;
  requestId?: string;
  // 🛡️ Welle 3 „Vertrauens-Schicht" (07/2026) — Transparenz-Felder, render-if-present
  analysisCoverage?: { originalChars: number; analyzedChars: number; truncated: boolean } | null;
  pilotTruncated?: boolean;
  usedFallbackFormat?: boolean;
  // 🌍 Welle 4b — Warnung bei nicht-deutschem Recht/Sprache (render-if-present)
  jurisdictionWarning?: { language?: string; jurisdiction?: string } | null;
};

interface Props {
  data: AnalysisData;
  fileName: string;
  serviceHealth?: boolean | null;
  isInitialResult?: boolean;
  // Action-Buttons rechts in der File-Card (statt oben im Header)
  canReanalyze?: boolean;
  // 📨 Welle 2.1: Chat-Einstieg direkt in der File-Card (neben PDF/Erneut analysieren)
  onOpenChat?: () => void;
  openingChat?: boolean;
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

function getScoreVariant(score: number | null | undefined, dc?: DocClass) {
  if (score == null) return { color: "#94a3b8", rating: "Vorläufig", cls: styles.ratingAmber };
  // 📨 Welle 1: Bei empfangenen Schreiben bedeutet der Score "Wie unkritisch ist
  // die Lage für dich" — Vertrags-Wörter wie "Verbesserung nötig" wären absurd
  // ("verbessere deine Kündigung"?). Eigene Handlungs-Wörter.
  if (dc === "LETTER") {
    if (score >= 85) return { color: "#10b981", rating: "Kein akuter Handlungsbedarf", cls: styles.ratingSuccess };
    if (score >= 60) return { color: "#2563eb", rating: "Aufmerksam bleiben", cls: styles.ratingPrimary };
    if (score >= 35) return { color: "#f59e0b", rating: "Handeln empfohlen", cls: styles.ratingAmber };
    return { color: "#ef4444", rating: "Dringend handeln", cls: styles.ratingRed };
  }
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
const BACKEND_DOC_TYPE_MARKERS = /^(CONTRACT|INVOICE|RECEIPT|FINANCIAL_DOCUMENT|TABLE_DOCUMENT|LETTER|UNKNOWN)$/i;
function isBackendDocTypeMarker(s: string | null | undefined): boolean {
  return !!s && BACKEND_DOC_TYPE_MARKERS.test(s);
}

// 🎯 Hero-H1 = Tätigkeits-Wort je Dokumentklasse (29.05.2026, RDG-sicher).
// Ersetzt frühere wertende Headlines ("Vertrag — deutlicher Verbesserungsbedarf").
// Wertung wandert ins Score-Donut + Bewertungs-Card unten. Vermeidet RDG-Konflikt
// (kein "anwaltlich"), keine User-Anklage, skaliert für alle Dokumenttypen.
function buildHeroActivity(dc: DocClass): string {
  switch (dc) {
    case "INVOICE": return "Rechnungsprüfung";
    case "RECEIPT": return "Belegprüfung";
    case "LETTER": return "Schreiben-Prüfung";
    case "TABLE_DOCUMENT":
    case "FINANCIAL_DOCUMENT":
    case "UNKNOWN":
      return "Dokumentprüfung";
    case "AGB":
    case "CONTRACT":
    default:
      return "Vertragsprüfung";
  }
}

// 🎯 Genus + Numerus + Action-Verb je DocClass für grammatikalisch saubere
// Sub-Texts ("Die AGB sind solide" vs "Der Vertrag ist solide" vs "Die Rechnung wirkt…").
function getDocSubject(dc: DocClass): { artikel: string; noun: string; verb_3p: string; action_verb: string } {
  switch (dc) {
    case "AGB":
      return { artikel: "Die", noun: "AGB", verb_3p: "wirken", action_verb: "vor Einsatz" };
    case "INVOICE":
      return { artikel: "Die", noun: "Rechnung", verb_3p: "wirkt", action_verb: "vor der Zahlung" };
    case "RECEIPT":
      return { artikel: "Der", noun: "Beleg", verb_3p: "wirkt", action_verb: "vor der Ablage" };
    case "TABLE_DOCUMENT":
      return { artikel: "Die", noun: "Tabelle", verb_3p: "wirkt", action_verb: "bei der Weiterverarbeitung" };
    case "FINANCIAL_DOCUMENT":
      return { artikel: "Das", noun: "Finanzdokument", verb_3p: "wirkt", action_verb: "bei der Weiterverarbeitung" };
    case "UNKNOWN":
      return { artikel: "Das", noun: "Dokument", verb_3p: "wirkt", action_verb: "vor weiterer Nutzung" };
    case "LETTER":
      // action_verb bewusst OHNE "Unterschrift" — man reagiert auf ein Schreiben.
      return { artikel: "Das", noun: "Schreiben", verb_3p: "betrifft", action_verb: "vor deiner Reaktion" };
    case "CONTRACT":
    default:
      return { artikel: "Der", noun: "Vertrag", verb_3p: "wirkt", action_verb: "vor Unterschrift" };
  }
}

// Pluralisierung mit Cap bei >5 → "mehrere" (sonst absurd "15 Punkte").
function formatPunkte(n: number): string {
  if (n === 1) return "1 Punkt";
  if (n > 5) return "mehrere Punkte";
  return `${n} Punkte`;
}

// 🎯 Konstruktiver, kurzer Hero-Sub-Text (29.05.2026). Ersetzt den langen
// KI-`scoreReasoning`-Text im Hero. Der Volltext bleibt im Score-Drawer +
// Bewertungs-Card unten verfügbar. Hier nur die Kernaussage in einem Satz.
// WICHTIG: Sub-Text darf NICHT mit Bracket-Wort ("Verbesserung", "Solide",
// "Kritisch") starten — sonst doppelt mit Score-Rating links neben dem Donut.
function buildHeroSubtext(d: AnalysisData, dc: DocClass): string {
  if (isFailedAnalysis(d)) {
    return "Die Analyse ist unvollständig. Bitte erneut analysieren oder das Dokument prüfen.";
  }
  const score = d.contractScore;
  if (score == null) {
    return "Die Analyse ist abgeschlossen. Die Details findest du in den Abschnitten unten.";
  }
  const critCount = Array.isArray(d.criticalIssues) ? d.criticalIssues.length : 0;
  const subj = getDocSubject(dc);

  // 📨 LETTER: eigene Branch (Welle 1) — keine Kopula-Sätze ("wirkt ausgewogen"),
  // sondern Handlungs-Framing. Fristen sind die Kernaussage.
  if (dc === "LETTER") {
    if (score >= 85) {
      return critCount === 0
        ? "Aus diesem Schreiben ergibt sich für dich kein akuter Handlungsbedarf. Details findest du unten."
        : `Kein akuter Handlungsdruck erkennbar — wir haben aber ${formatPunkte(critCount)} für dich markiert.`;
    }
    if (score >= 60) {
      return critCount === 0
        ? "Behalte dieses Schreiben im Blick. Prüfe die Einordnung und die Fristen unten."
        : `Wir haben ${formatPunkte(critCount)} markiert. Prüfe besonders die Fristen unten.`;
    }
    if (score >= 35) {
      return `Dieses Schreiben verlangt eine Reaktion von dir. Wir haben ${critCount === 0 ? "die wichtigen Punkte" : formatPunkte(critCount)} und deine Optionen unten aufbereitet.`;
    }
    return `Hier läuft eine wichtige Frist — bitte kümmere dich zeitnah darum. Deine Optionen und alle Fristen findest du unten.`;
  }

  // TABLE/FINANCIAL: eigene Branch — "Vertrag" passt nicht, "ausgewogen" auch nicht
  if (dc === "TABLE_DOCUMENT" || dc === "FINANCIAL_DOCUMENT") {
    if (score >= 70) {
      return critCount === 0
        ? `${subj.artikel} ${subj.noun} ${subj.verb_3p} plausibel. Details findest du in den Abschnitten unten.`
        : `${subj.artikel} ${subj.noun} ${subj.verb_3p} überwiegend plausibel. Wir haben ${formatPunkte(critCount)} für dich markiert.`;
    }
    // Relativsatz vermieden: bei N=1 würde "die geprüft werden sollten" grammatikalisch nicht passen
    return critCount === 0
      ? `Wir haben einige Auffälligkeiten markiert. Bitte ${subj.action_verb} prüfen.`
      : `Wir haben ${formatPunkte(critCount)} markiert. Bitte ${subj.action_verb} prüfen.`;
  }

  // Standard-Branches (CONTRACT, AGB, INVOICE, RECEIPT, UNKNOWN)
  // Singular/Plural-sicher: KEIN Relativsatz mit Pronomen-Bezug auf "Punkt"/"Punkte",
  // weil Akkusativ-Singular-Maskulin ("den") und Plural ("die") sich unterscheiden.
  if (score >= 85) {
    return critCount === 0
      ? `${subj.artikel} ${subj.noun} ${subj.verb_3p} ausgewogen — keine Auffälligkeiten gefunden.`
      : `${subj.artikel} ${subj.noun} ${subj.verb_3p} überwiegend solide. Wir haben ${formatPunkte(critCount)} für dich markiert.`;
  }
  if (score >= 70) {
    return critCount === 0
      ? `${subj.artikel} ${subj.noun} ${subj.verb_3p} solide. Schau dir die Empfehlungen in den Abschnitten unten an.`
      : `Wir haben ${formatPunkte(critCount)} markiert. Schau dir die Details ${subj.action_verb} an.`;
  }
  if (score >= 50) {
    return critCount === 0
      ? `Wir haben einige Punkte im Detail markiert. Schau dir die Details ${subj.action_verb} an.`
      : `Wir haben ${formatPunkte(critCount)} gefunden. Bitte ${subj.action_verb} klären.`;
  }
  // <50
  return critCount === 0
    ? `Wir haben mehrere Punkte für dich markiert. Eine sorgfältige Prüfung ${subj.action_verb} wird empfohlen.`
    : `Wir haben ${formatPunkte(critCount)} gefunden. Eine sorgfältige Prüfung ${subj.action_verb} wird empfohlen.`;
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
// 🎯 Non-Final-Status (30.05.2026) — ersetzt den alten Recognition-Banner.
// Mappt Backend-Hinweise auf eine kompakte Status-Pille in der File-Card.
// Trigger-Logik identisch zum alten Banner — nur das Rendering ist neu (Pille statt Box).
type NonFinalStatus = { label: string; icon: string; tooltip: string } | null;
function getNonFinalStatus(
  desc: string | undefined | null,
  completeness: { isComplete?: boolean } | null | undefined
): NonFinalStatus {
  const lower = (desc || "").toLowerCase();
  if (/\b(letter of intent|loi|memorandum of understanding|mou|term sheet|vorvertrag)\b/.test(lower)) {
    return { label: "Vorvertrag", icon: "📋", tooltip: desc || "Vorvertrag / Letter of Intent — noch keine bindende Vereinbarung" };
  }
  if (/\bside letter\b/.test(lower)) {
    return { label: "Side Letter", icon: "📝", tooltip: desc || "Side Letter — Zusatzvereinbarung zum Hauptvertrag" };
  }
  if (/\b(muster|mustervertrag|vorlage|template|entwurf|draft|placeholder|noch nicht ausgefüllt)\b/.test(lower)) {
    return { label: "Entwurf", icon: "📝", tooltip: desc || "Dieses Dokument ist ein Entwurf / eine Vorlage — Bewertung mit Vorbehalt" };
  }
  if (completeness?.isComplete === false) {
    return { label: "Unvollständig", icon: "⚠", tooltip: desc || "Dem Dokument fehlen Pflicht-Elemente — Details siehe unten" };
  }
  return null;
}

// 1. documentCharacterization.description, gekürzt + OCR-bereinigt MIT truncate
//    (vorher: bei >40 Chars gesilent-skipped — User sah "Vertrag" statt "Negativerklärung
//    im Rahmen eines Factoringvertrages". Jetzt: truncateAtWord auf 40)
// 2. contractTypeLabel (Backend-Feld seit 28.05.2026 via pilotTypeToLabel —
//    saubere deutsche Strings wie "Mietvertrag", "Factoringvertrag", "NDA-Vertrag")
// 3. documentType (top-level) → getDocNoun(classify) — Fallback wie bisher
// (Alter Pfad documentCharacterization.documentType entfernt: toter Code,
//  Backend-Prompt setzt das Feld nicht — TÜV-Audit 29.05.)
function pickDocTypeLabel(d: AnalysisData): string {
  const desc = d.documentCharacterization?.description;
  if (desc) {
    const cleanDesc = cleanOcrSpacing(desc)
      .replace(/^aktiver,?\s*beidseitig\s*unterzeichneter\s*/i, "")
      .replace(/\s+über\s+.*/i, "")
      .trim();
    if (cleanDesc.length > 0) {
      // Cap 30 für KI-descriptions (knackiger als 40, weniger Layout-Risiko).
      // contractTypeLabel-Pfad behält 40 weil kuratierte Labels (AVV/AGB sind 32-37 Chars lang).
      return cleanDesc.length <= 30 ? cleanDesc : truncateAtWord(cleanDesc, 30);
    }
  }
  const ctl = d.contractTypeLabel;
  if (ctl && typeof ctl === "string") {
    const cleanCtl = ctl.trim();
    if (cleanCtl.length > 0 && cleanCtl.length <= 40 && !isBackendDocTypeMarker(cleanCtl)) {
      return cleanCtl;
    }
  }
  const fallback = d.documentType;
  if (!fallback || isBackendDocTypeMarker(fallback)) {
    const dc = classifyDocType(d.documentType, d.contractType);
    return getDocNoun(dc);
  }
  return fallback;
}

export default function V2HeroSection({ data, fileName, serviceHealth, isInitialResult, canReanalyze, analyzing, onReanalyze, onReset, contractId, usage, userPlan, onOpenChat, openingChat }: Props) {
  const d = data;
  // 🛡️ Kaputte/Platzhalter-Dateinamen (z.B. "$value.pdf" aus fremden Lohn-Systemen,
  // "undefined.pdf", leere Namen) NICHT roh anzeigen — stattdessen sinnvoller Fallback.
  const cleanTitle = (raw: string | undefined | null, fallback: string): string => {
    const t = (raw ?? "").trim();
    if (!t || /[${}]/.test(t) || /^(undefined|null)(\.|$)/i.test(t) || /^\.[a-z0-9]{1,5}$/i.test(t)) {
      return fallback || "Dokument";
    }
    return raw as string;
  };
  const score = d.contractScore;
  // 🎯 DocClass für typspezifische UI (20.05.2026) — vor getScoreVariant,
  // damit LETTER eigene Rating-Wörter bekommt (Welle 1).
  const docClass: DocClass = classifyDocType(d.documentType, d.contractType);
  const variant = getScoreVariant(score, docClass);
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
              <div className={styles.fcName}>{cleanTitle(fileName, "Dokument")}</div>
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

  // Layman-Modus: laymanSummary mit Truncate-Toggle (KI-Volltext, kann lang sein)
  // Normal-Modus: konstruktiver Frontend-Sub-Text (kurz, kein Toggle nötig)
  // Vorher: scoreReasoning direkt im Hero — wandert jetzt in Score-Drawer + Card unten
  const laymanArr = Array.isArray(d.laymanSummary) ? d.laymanSummary : (typeof d.laymanSummary === "string" ? [d.laymanSummary] : []);
  const hasLayman = laymanArr.length > 0;
  let heroSubFull: string;
  let isHeroSubTruncated: boolean;
  let heroSub: string;
  if (laymanMode && hasLayman) {
    heroSubFull = laymanArr.join(" ");
    isHeroSubTruncated = heroSubFull.length > 600;
    heroSub = heroSubExpanded || !isHeroSubTruncated ? heroSubFull : truncateAtWord(heroSubFull, 600);
  } else {
    heroSubFull = buildHeroSubtext(d, docClass);
    isHeroSubTruncated = false;
    heroSub = heroSubFull;
  }

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

  return (
    <>
      {/* FILE-HEADER */}
      <div className={styles.fileCard}>
        <div className={styles.fcLeft}>
          <div className={styles.fcIcon}>{fileIconText}</div>
          <div className={styles.fcMeta}>
            <div className={styles.fcName}>{cleanTitle(fileName, d.documentCharacterization?.description?.trim() || docTypeLabel)}</div>
            <div className={styles.fcPartners}>
              <span className={styles.fcDoctype} title={d.documentCharacterization?.description || docTypeLabel}>
                <FileText size={11} />
                {docTypeLabel}
                {d.pageCount ? ` · ${d.pageCount} Seiten` : ""}
              </span>
              {d.provider?.name && (
                <span
                  className={styles.fcStatusPill}
                  style={(d.providerConfidence ?? 100) < 75
                    ? { background: "#fef3c7", color: "#92400e" }
                    : { background: "#eff6ff", color: "#2563eb" }}
                  title={(d.providerConfidence ?? 100) < 75
                    ? `Vertragspartei mit niedriger Konfidenz erkannt (${d.providerConfidence}%) — bitte prüfen`
                    : undefined}
                >
                  {cleanOcrSpacing(d.provider.name)}
                  {(d.providerConfidence ?? 100) < 75 && " ?"}
                </span>
              )}
              {/* 🆕 Problem H (27.05.2026): Warn-Badge wenn Vertragspartei nicht erkannt.
                  Triggert bei provider=null, damit User die Lücke nicht übersieht. */}
              {!d.provider?.name && d.providerDetected === false && (
                <span
                  className={styles.fcStatusPill}
                  style={{ background: "#fef3c7", color: "#92400e" }}
                  title="Vertragspartei konnte nicht eindeutig erkannt werden — bitte im Vertrag prüfen"
                >
                  Vertragspartei nicht erkannt
                </span>
              )}
              {/* ✍️ Unterschrifts-Status (nur wenn Erkennung lief — Backend setzt signatureDetection
                  ausschließlich bei aktivem Flag + OCR). detected=true → grün; false → neutral-amber. */}
              {d.signatureDetection && (
                d.signatureDetection.detected ? (
                  <span
                    className={styles.fcStatusPill}
                    style={{ background: "#ecfdf5", color: "#047857" }}
                    title={`${d.signatureDetection.count || 1} Unterschrift(en) im Dokument erkannt${d.signatureDetection.pages?.length ? ` (Seite ${d.signatureDetection.pages.join(", ")})` : ""}. Hinweis: erkennt nur, dass unterschrieben wurde — nicht von wem.`}
                  >
                    <PenLine size={10} /> {(d.signatureDetection.count || 1) > 1 ? `${d.signatureDetection.count} Unterschriften` : "Unterschrift"} erkannt
                  </span>
                ) : (
                  <span
                    className={styles.fcStatusPill}
                    style={{ background: "#fef3c7", color: "#92400e" }}
                    title="Im gescannten Vertrag wurde keine Unterschrift als Bild erkannt — möglicherweise noch nicht unterschrieben (Entwurf) oder die Scan-Qualität war zu niedrig. Bitte am Original prüfen."
                  >
                    <PenLine size={10} /> Keine Unterschrift erkannt — am Original prüfen
                  </span>
                )
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
                <span
                  className={styles.fcStatusPill}
                  style={{ background: "#f5f3ff", color: "#8b5cf6" }}
                  title="Premium-Analyse mit 7-Punkte-Check, Tiefenanalyse und Vollständigkeitsgarantie"
                >
                  <Scale size={10} /> Premium-Analyse
                </span>
              )}
              {/* 🎯 Non-Final-Status-Pille (30.05.2026) — ersetzt den alten Recognition-Banner.
                  Trigger über getNonFinalStatus(). Tooltip zeigt KI-description.
                  Mutex: bei Min-Text-Banner (<200 chars) NICHT zeigen — dort hat der
                  Wenig-Text-Hinweis Priorität. */}
              {(() => {
                if (typeof d.textLength === "number" && d.textLength > 0 && d.textLength < 200) return null;
                const nfs = getNonFinalStatus(d.documentCharacterization?.description, d.completeness);
                if (!nfs) return null;
                return (
                  <span
                    className={styles.fcStatusPill}
                    style={{ background: "#fef3c7", color: "#92400e", border: "1px solid #fcd34d" }}
                    title={nfs.tooltip}
                  >
                    {nfs.icon} {nfs.label}
                  </span>
                );
              })()}
              {/* Alte Warn-Pille entfernt (30.05.2026) — wird jetzt durch
                  getNonFinalStatus oben + Pflichtangaben-Sektion unter dem Hero abgedeckt. */}
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
            {/* 📨 Welle 2.1: Chat-Einstieg direkt oben in der File-Card — der
                Moment „ich hab noch Fragen" entsteht hier, nicht erst an der
                Action-Bar ganz unten. Gleicher Handler wie der Bar-Button
                (öffnet den Inline-Drawer, Backend erzwingt das Kontingent). */}
            {contractId && onOpenChat && (
              <button
                type="button"
                className={`${styles.fcBtn} ${styles.fcBtnInfo} ${openingChat ? styles.fcBtnLoading : ""}`}
                onClick={onOpenChat}
                disabled={analyzing || openingChat}
                aria-label="Fragen zum Dokument im Chat stellen"
                aria-busy={openingChat || undefined}
              >
                <MessageSquare size={14} aria-hidden="true" />
                <span>{openingChat ? "Öffne Chat..." : "Fragen stellen"}</span>
              </button>
            )}
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
          </div>
        )}
      </div>

      {/* MIN-TEXT-HINWEIS (20.05.2026 Finding 2) — höchste Priorität, suppressed
          alle anderen Banner. Wenn das Dokument <200 Zeichen Text hat, ist das
          die fundamentalste Aussage (UNKNOWN/Recognition wären redundant).
          200 chars = konsistent mit OCR-Trigger-Schwelle im Backend. */}
      {typeof d.textLength === "number" && d.textLength > 0 && d.textLength < 200 && (
        <div className={styles.lowTextBanner} role="alert">
          <div className={styles.lowTextIcon} aria-hidden="true">ℹ️</div>
          <div className={styles.lowTextBody}>
            <div className={styles.lowTextTitle}>Wenig Text im Dokument ({d.textLength} Zeichen)</div>
            <div className={styles.lowTextDesc}>
              Wir haben eine Analyse versucht, aber das Dokument enthält sehr wenig Text. Manche Felder können unvollständig sein — die KI liefert lieber leere Felder als erfundene Inhalte. Für eine ausführliche Analyse empfehlen wir Dokumente mit mindestens 500 Zeichen.
            </div>
          </div>
        </div>
      )}

      {/* UNKNOWN-DOKUMENT-HINWEIS (20.05.2026) — erscheint wenn das System den
          Dokumenttyp nicht eindeutig zuordnen konnte. Der Score-Donut wird weiterhin
          gezeigt (Inhalt wurde ja analysiert), aber der User bekommt klare Info
          über die Klassifikations-Unsicherheit + Action-Buttons.
          Mutex: bei Min-Text-Banner (<300 chars) wird dieser Banner suppressed. */}
      {docClass === "UNKNOWN" && !(typeof d.textLength === "number" && d.textLength > 0 && d.textLength < 200) && (
        <div className={styles.unknownBanner} role="alert">
          <div className={styles.unknownIcon} aria-hidden="true">🤔</div>
          <div className={styles.unknownBody}>
            <div className={styles.unknownTitle}>Dokument nicht eindeutig erkannt</div>
            <div className={styles.unknownDesc}>
              Wir haben dein Dokument analysiert, konnten den Typ aber nicht eindeutig zuordnen.
              Unsere Spezialisten-Profile gibt es für: Verträge (Miete, Arbeit, NDA, Kauf, …), AGB,
              Schreiben (Kündigung, Abmahnung, Bescheid, Mahnung), Rechnungen, Quittungen, Tabellen
              und Finanzdokumente. Du kannst eine erneute Analyse versuchen oder ein anderes Dokument hochladen.
            </div>
            {(canReanalyze && onReanalyze) || onReset ? (
              <div className={styles.unknownActions}>
                {canReanalyze && onReanalyze && (
                  <button
                    type="button"
                    className={styles.unknownBtnPrimary}
                    onClick={onReanalyze}
                    disabled={analyzing}
                  >
                    Erneut analysieren
                  </button>
                )}
                {onReset && (
                  <button
                    type="button"
                    className={styles.unknownBtnSecondary}
                    onClick={onReset}
                    disabled={analyzing}
                  >
                    Anderes Dokument hochladen
                  </button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* 🛡️ VERTRAUENS-BANNER (Welle 3, 07/2026) — drei Transparenz-Hinweise,
          Struktur/Klassen 1:1 vom lowTextBanner-Muster (keine neuen CSS-Klassen).
          Mutex: wenn der UNKNOWN-Banner rendert, keinen der drei zeigen (UNKNOWN
          ist fundamentaler). Untereinander max. 1 sichtbar — Priorität:
          Fallback > Kürzung > Pilot. Render-if-present: alte Analysen ohne die
          Felder rendern exakt wie bisher. */}
      {(() => {
        const lowTextShown = typeof d.textLength === "number" && d.textLength > 0 && d.textLength < 200;
        // TÜV: lowText unterdrückt auch die Vertrauens-Banner (fundamentalere
        // Aussage; verhindert Banner-Stapel bei Mini-Scan + Fallback).
        if (lowTextShown) return null;
        const unknownShown = docClass === "UNKNOWN";
        if (unknownShown) return null;

        // 1) Fallback-Banner (wichtigster): Analyse nur eingeschränkt erstellt
        if (d.usedFallbackFormat === true) {
          return (
            <div className={styles.lowTextBanner} role="alert">
              <div className={styles.lowTextIcon} aria-hidden="true">⚠️</div>
              <div className={styles.lowTextBody}>
                <div className={styles.lowTextTitle}>Diese Analyse konnte nur eingeschränkt erstellt werden</div>
                <div className={styles.lowTextDesc}>
                  Die Inhalte sind teilweise generisch statt dokumentspezifisch. {canReanalyze && onReanalyze
                    ? "Klicke auf „Erneut analysieren“ — meistens reicht ein zweiter Versuch."
                    : "Nutze „Erneut analysieren“ in der Vertragsansicht."}
                </div>
                {canReanalyze && onReanalyze && (
                  <div className={styles.unknownActions}>
                    <button
                      type="button"
                      className={styles.unknownBtnPrimary}
                      onClick={onReanalyze}
                      disabled={analyzing}
                    >
                      Erneut analysieren
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        }

        // 2) Kürzungs-Banner: sehr großes Dokument, Analyse auf Kernabschnitten
        if (d.analysisCoverage?.truncated) {
          return (
            <div className={styles.lowTextBanner} role="status">
              <div className={styles.lowTextIcon} aria-hidden="true">ℹ️</div>
              <div className={styles.lowTextBody}>
                <div className={styles.lowTextTitle}>Sehr großes Dokument — Analyse basiert auf den Kernabschnitten</div>
                <div className={styles.lowTextDesc}>
                  Dein Dokument hat {d.analysisCoverage.originalChars.toLocaleString("de-DE")} Zeichen; analysiert wurden die wichtigsten ≈{d.analysisCoverage.analyzedChars.toLocaleString("de-DE")} Zeichen (Anfang, Kernabschnitte, Ende).
                </div>
              </div>
            </div>
          );
        }

        // 3) Pilot-Hinweis (dezenteste Stufe): nur Zusatz-Tiefenprüfung gekürzt
        if (d.pilotTruncated === true && !d.analysisCoverage?.truncated) {
          return (
            <div className={styles.lowTextBanner} role="status">
              <div className={styles.lowTextIcon} aria-hidden="true">ℹ️</div>
              <div className={styles.lowTextBody}>
                <div className={styles.lowTextTitle}>Hinweis zur Zusatz-Tiefenprüfung</div>
                <div className={styles.lowTextDesc}>
                  Die Hauptanalyse hat dein gesamtes Dokument gelesen. Nur die typspezifische Zusatz-Tiefenprüfung basiert auf den ersten 60.000 Zeichen.
                </div>
              </div>
            </div>
          );
        }

        return null;
      })()}

      {/* 🌍 Welle 4b: Jurisdiktions-Warnung — EIGENER Block AUSSERHALB der Trust-
          Kaskade oben (andere Achse: „welches Recht" vs. „wie vollständig"), damit
          er die Fallback-/Kürzungs-Banner NICHT verdrängt (stapeln statt verdrängen).
          Haftungsrelevant → role="alert". Render-if-present. */}
      {d.jurisdictionWarning && (() => {
        const jw = d.jurisdictionWarning;
        const isForeignLang = jw.language && jw.language !== "de";
        const jurNames: Record<string, string> = {
          AT: "österreichischem Recht", CH: "Schweizer Recht", US: "US-amerikanischem Recht",
          UK: "englischem/britischem Recht", other: "ausländischem Recht",
        };
        const jurLabel = jurNames[jw.jurisdiction || "other"] || "ausländischem Recht";
        return (
          <div className={styles.lowTextBanner} role="alert" style={{ borderColor: "#f59e0b" }}>
            <div className={styles.lowTextIcon} aria-hidden="true">🌍</div>
            <div className={styles.lowTextBody}>
              <div className={styles.lowTextTitle}>
                {isForeignLang
                  ? "Dieses Dokument scheint nicht deutschsprachig zu sein"
                  : `Dieses Dokument unterliegt offenbar ${jurLabel}`}
              </div>
              <div className={styles.lowTextDesc}>
                Unsere Analyse orientiert sich an <strong>deutschem Recht</strong> und ist hier mit Vorsicht zu genießen —
                die genannten Paragraphen und Bewertungen treffen für {jurLabel} möglicherweise nicht zu.
                Für eine verbindliche Prüfung wende dich an eine im jeweiligen Rechtsraum zugelassene Beratung.
              </div>
            </div>
          </div>
        );
      })()}

      {/* Recognition-Banner-Block entfernt (30.05.2026) — komplett ersetzt durch
          Status-Pille in File-Card oben + Pflichtangaben-Sektion unter dem Hero. */}

      {/* ANALYSIS-CARD */}
      <div className={styles.analysisCard}>

        {/* HERO mit Score-Donut */}
        <div className={styles.acHero}>
          <div>
            {/* Inline-Styles als Cache-Safe-Backup zusätzlich zum CSS-Modul.
                Score-Donut ist klickbar — öffnet Drawer mit Score-Zusammensetzung. */}
            <button
              type="button"
              onClick={() => setScoreDrawerOpen(true)}
              aria-label={`Score ${displayScore} von 100, klicken für Details zur Zusammensetzung`}
              title={[
                "So setzt sich dein Score zusammen — klick für Details",
                conf && `Konfidenz: ${conf}`,
                qual && `Qualität: ${qual}`,
                d.requestId && `ID: ${d.requestId}`,
              ].filter(Boolean).join(" · ")}
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
              <svg viewBox="0 0 160 160" role="img" aria-label={`${docClass === "LETTER" ? "Einschätzung" : "Vertragsscore"}: ${displayScore} von 100, Bewertung: ${variant.rating}`} style={{ width: "100%", height: "100%", position: "relative", zIndex: 1 }}>
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
            <div className={styles.heroEye}>Zusammenfassung</div>
            <h2 className={styles.heroTitle}>{buildHeroActivity(docClass)}</h2>
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
                <strong>{critCount}</strong>&nbsp;{docClass === "LETTER"
                  ? (critCount === 1 ? "kritischer Punkt" : "kritische Punkte")
                  : (critCount === 1 ? "kritische Klausel" : "kritische Klauseln")}
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

        {/* 🎯 PFLICHTANGABEN-SEKTION (30.05.2026) — ersetzt openItems aus altem
            Recognition-Banner. Strukturell zwischen Hero und Quick-Facts, als
            gleichwertiges Analyse-Finding. Mutex bei <200 Chars Text. */}
        {(() => {
          if (typeof d.textLength === "number" && d.textLength > 0 && d.textLength < 200) return null;
          const openItems = Array.isArray(d.completeness?.openItems) ? d.completeness.openItems : [];
          if (openItems.length === 0) return null;
          return (
            <div className={styles.openItemsSection} role="status" aria-live="polite">
              <div className={styles.openItemsHeader}>
                <AlertTriangle size={14} style={{ color: "#d97706", flexShrink: 0 }} aria-hidden="true" />
                <span className={styles.openItemsTitle}>Mögliche offene Punkte</span>
                <span className={styles.openItemsCount}>{openItems.length}</span>
              </div>
              <div className={styles.openItemsList}>
                {openItems.map((item, i) => (
                  <span key={i} className={styles.openItemsPill} title={item}>{item}</span>
                ))}
              </div>
              <div className={styles.openItemsHint}>
                Diese Angaben konnten im Dokument nicht eindeutig erkannt werden — bitte am Original prüfen.
              </div>
            </div>
          );
        })()}

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

          // 📨 Welle 1: Bei Schreiben ist die FRIST der „Gold wert"-Moment —
          // Frist-Karte zuerst, mit Rest-Tagen groß („⚖️ Klagefrist — noch 12 Tage").
          // Kalendertage-Rechnung: Datum auf LOKALE Mitternacht normalisieren + round,
          // sonst überschätzt der UTC-Parse von "YYYY-MM-DD" die Frist um 1 Tag
          // (dieselbe Off-by-one-Klasse wie utils/calendarDaysUntil.js im Backend).
          const daysLeft = topDate ? (() => {
            const d = new Date(topDate.date);
            d.setHours(0, 0, 0, 0);
            return Math.round((d.getTime() - now.getTime()) / 86400000);
          })() : null;
          const dateCard = topDate && (
            <div className={`${styles.glanceCard} ${styles.glanceCardDate}`}>
              <div className={styles.glanceIcon} aria-hidden="true">{docClass === "LETTER" ? "⚖️" : "⏰"}</div>
              <div className={styles.glanceLabel}>{docClass === "LETTER" ? "Wichtigste Frist" : "Kritischster Termin"}</div>
              <div className={styles.glanceText}>
                {topDate.ev.label || topDate.ev.title || "Termin"} · {topDate.date.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "2-digit" })}
                {docClass === "LETTER" && daysLeft != null && (
                  <> · <strong>{daysLeft === 0 ? "HEUTE" : daysLeft === 1 ? "noch 1 Tag" : `noch ${daysLeft} Tage`}</strong></>
                )}
              </div>
            </div>
          );
          const riskCard = topRisk && (
            <div className={`${styles.glanceCard} ${styles.glanceCardRisk}`}>
              <div className={styles.glanceIcon} aria-hidden="true">⚠️</div>
              <div className={styles.glanceLabel}>{docClass === "LETTER" ? "Wichtigster Punkt" : "Top-Risiko"}</div>
              <div className={styles.glanceText}>{truncate(getInsightText(topRisk), 90)}</div>
            </div>
          );
          const recoCard = topReco && (
            <div className={`${styles.glanceCard} ${styles.glanceCardReco}`}>
              <div className={styles.glanceIcon} aria-hidden="true">💡</div>
              <div className={styles.glanceLabel}>{docClass === "LETTER" ? "Wichtigste Option" : "Wichtigste Empfehlung"}</div>
              <div className={styles.glanceText}>{truncate(getInsightText(topReco), 90)}</div>
            </div>
          );

          return (
            <div className={styles.atAGlance}>
              <div className={styles.atAGlanceTitle}>Auf einen Blick</div>
              <div className={styles.atAGlanceGrid}>
                {docClass === "LETTER" ? (
                  <>
                    {dateCard}
                    {riskCard}
                    {recoCard}
                  </>
                ) : (
                  <>
                    {riskCard}
                    {recoCard}
                    {dateCard}
                  </>
                )}
              </div>
            </div>
          );
        })()}

        {/* Conversion-Banner inline im Hero — direkt nach Asymmetrie, max
            Sichtbarkeit für Free→Business-Conversion (Wow-Effekt-Moment).
            Banner rendert nur für Free/Business — Enterprise = null. */}
        {(usage || userPlan) && (
          <V2ConversionBanner
            usage={usage as Parameters<typeof V2ConversionBanner>[0]['usage']}
            userPlan={userPlan}
            documentType={d.documentType}
            contractType={d.contractType}
          />
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
        documentType={d.documentType}
        contractType={d.contractType}
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
