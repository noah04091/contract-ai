// 📄 analysisGutachtenPdf.js — Anwalts-Gutachten-PDF-Export für Vertragsanalysen.
// Strikt adaptive Output: nur Sektionen rendern, die echte Daten haben.
// Anti-Halluzinations-Regel: lieber Sektion weglassen als Floskel-Inhalt erfinden.
// Keine Standardtexte wie "Nicht angegeben" — nichts ist besser als nichts.

const ReactPDF = require('@react-pdf/renderer');
const { Document, Page, Text, View, StyleSheet, Image, Link } = ReactPDF;
const React = require('react');
const e = React.createElement;

// Slug-Map laden für klickbare legalBasis-Pillen.
// Lazy + cached, damit erste PDF-Generierung nicht den Singleton blockiert.
let _mergedMaps = null;
function getMergedLegalMaps() {
  if (_mergedMaps) return _mergedMaps;
  try {
    const { getInstance } = require('./gesetzImInternetConnector');
    const supplemental = require('../data/legalReferencesSupplemental');
    const connector = getInstance();
    const baseLawInfo = connector.lawInfo || {};
    _mergedMaps = {
      lawInfo: { ...baseLawInfo, ...(supplemental.lawInfo || {}) },
    };
  } catch (err) {
    console.warn('[analysisGutachtenPdf] Slug-Map nicht ladbar — Pillen bleiben Plain-Text:', err.message);
    _mergedMaps = { lawInfo: {} };
  }
  return _mergedMaps;
}

// Node-Pendant von buildUrl im Frontend-Parser (frontend/src/utils/legalReferenceParser.ts).
// Bewusst dupliziert (kein Shared-Module-Setup), damit PDF-Service unabhängig läuft.
function buildLegalUrl(slug, info, paragraph) {
  if (!info) return null;
  if (info.urlTemplate) {
    return info.urlTemplate.replace(/\{paragraph\}/g, paragraph);
  }
  // VOB/A, VOB/B etc. — Slash/Space in Abkürzung → kein Standard-Slug → null.
  if (info.abbreviation && /[\/\s]/.test(info.abbreviation)) {
    return null;
  }
  return `https://www.gesetze-im-internet.de/${slug}/__${paragraph}.html`;
}

function findLawInfoForAbbr(abbreviation, lawInfo) {
  const abbrLower = String(abbreviation).toLowerCase().trim();
  for (const [slug, info] of Object.entries(lawInfo)) {
    if (info && info.abbreviation && info.abbreviation.toLowerCase() === abbrLower) {
      return { slug, info };
    }
  }
  if (lawInfo[abbrLower]) return { slug: abbrLower, info: lawInfo[abbrLower] };
  return null;
}

// Resolves "§ 309 BGB" oder "Art. 28 DSGVO" zu einer URL — oder null.
// Anti-Halluzination: nicht parsbar → null. Werk unbekannt → null.
const ABBR_PATTERN = '[A-ZÄÖÜ][A-ZÄÖÜa-zäöü0-9]+(?:[\\/\\-][A-ZÄÖÜa-zäöü0-9]+)*';
const PARAGRAPH_REGEX = new RegExp(`§\\s*(\\d+[a-z]?)\\s*(?:Abs\\.?\\s*\\d+\\s*)?(?:Nr\\.?\\s*\\d+\\s*)?(?:Satz\\s*\\d+\\s*)?(${ABBR_PATTERN})`);
const ARTICLE_REGEX = new RegExp(`Art\\.?\\s*(\\d+[a-z]?)\\s*(?:Abs\\.?\\s*\\d+\\s*)?(${ABBR_PATTERN})`);

function resolveLegalUrl(legalBasis) {
  if (!legalBasis || typeof legalBasis !== 'string') return null;
  const maps = getMergedLegalMaps();
  if (!maps.lawInfo) return null;

  for (const regex of [PARAGRAPH_REGEX, ARTICLE_REGEX]) {
    const m = legalBasis.match(regex);
    if (m) {
      const paragraph = m[1];
      const abbreviation = m[2];
      const lookup = findLawInfoForAbbr(abbreviation, maps.lawInfo);
      if (!lookup) return null;
      return buildLegalUrl(lookup.slug, lookup.info, paragraph);
    }
  }
  return null;
}

// Render-Helper: legalBasis-Pille als klickbarer Link (wenn URL ermittelbar) oder
// als statischer Text. Im PDF-Reader wird der Link automatisch anklickbar.
function makeLegalPill(key, legalBasis) {
  const url = resolveLegalUrl(legalBasis);
  if (url) {
    return e(Link, { key, src: url, style: styles.pillLegalLink }, legalBasis);
  }
  return e(Text, { key, style: styles.pillLegal }, legalBasis);
}

// ─────────────────────────────────────────────────────────────────────────────
// Vertragsart-Formatierung (universell)
// ─────────────────────────────────────────────────────────────────────────────
// Map identisch zu CONTRACT_TYPE_LABELS in backend/routes/contracts.js — bewusst
// dupliziert (16 Strings) statt Cross-Module-Import, um Produktiv-Datei
// contracts.js nicht zusätzlich anzufassen.
const CONTRACT_TYPE_LABELS_PDF = {
  mietvertrag: 'Mietvertrag', arbeitsvertrag: 'Arbeitsvertrag', kaufvertrag: 'Kaufvertrag',
  nda: 'NDA', freelancer: 'Freelancer-Vertrag', werkvertrag: 'Werkvertrag',
  berater: 'Beratungsvertrag', aufhebungsvertrag: 'Aufhebungsvertrag',
  pachtvertrag: 'Pachtvertrag', kooperation: 'Kooperationsvertrag',
  softwareVertrieb: 'SaaS-Reseller-Vertrag', softwareEndkunde: 'Software-Endkunde-Vertrag',
  lizenzvertrag: 'Lizenzvertrag', darlehensvertrag: 'Darlehensvertrag',
  gesellschaftsvertrag: 'Gesellschaftsvertrag', individuell: 'Vertrag',
};

// Skip-Set: das sind Subscription-Marker (NICHT Vertragsarten), kommen aus
// contract.contractType (Top-Level, Mongoose-Schema "recurring"|"one-time"|null).
// Würde fälschlich als Vertragsart angezeigt → bewusst weglassen.
const CONTRACT_TYPE_SKIP_VALUES = new Set([
  'recurring', 'one-time', 'one_time', 'onetime',
  'subscription', 'weekly', 'monthly', 'yearly', 'daily',
]);

/**
 * Formatiert den contractType-Wert für die Anzeige im PDF-Cover.
 * Universell: deckt alle 5 möglichen Fälle ab.
 *
 * @returns string — formatierter Wert ODER '' (leer = nicht anzeigen)
 */
function formatContractType(value) {
  const v = safeStr(value);
  if (!v) return '';

  const lower = v.toLowerCase();

  // (1) Skip-Set: Subscription-Marker → nicht als Vertragsart anzeigen
  if (CONTRACT_TYPE_SKIP_VALUES.has(lower)) return '';

  // (2) Direkter Map-Hit (Slug → schöner Begriff)
  if (CONTRACT_TYPE_LABELS_PDF[lower]) return CONTRACT_TYPE_LABELS_PDF[lower];

  // (3) Bereits formatiert (beginnt mit Großbuchstaben, kein reiner Slug)
  // Beispiele: „Mietvertrag", „Wohnraummietvertrag", „Service Agreement"
  const firstChar = v.charAt(0);
  if (firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase()) {
    return v;
  }

  // (4) Unbekannter Slug → Capitalize-First-Letter
  return v.charAt(0).toUpperCase() + v.slice(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Palette — abgeglichen mit der V2-Frontend-Design-Sprache.
// ─────────────────────────────────────────────────────────────────────────────

const C = {
  ink: '#0f172a',
  text: '#334155',
  muted: '#64748b',
  faint: '#94a3b8',
  border: '#e5e7eb',
  hairline: '#f1f5f9',
  panel: '#f8fafc',
  brand: '#1d4ed8',
  brandLight: '#eff6ff',
  scoreGreen: '#10b981',
  scoreYellow: '#f59e0b',
  scoreRed: '#ef4444',
  amber: '#f59e0b',
  amberBg: '#fffbeb',
  amberBorder: '#fde68a',
  amberInk: '#92400e',
  greenBg: '#ecfdf5',
  greenBorder: '#a7f3d0',
  greenInk: '#065f46',
};

const ASYM_LABELS = {
  'balanced': 'Ausgewogen',
  'mostly-fair': 'Größtenteils ausgewogen',
  'one-sided': 'Einseitig',
  'heavily-one-sided': 'Stark einseitig',
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function safeStr(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'number') return String(v);
  return '';
}

function formatDate(d) {
  if (!d) return '';
  const dt = d instanceof Date ? d : new Date(d);
  if (isNaN(dt.getTime())) return '';
  const dd = String(dt.getDate()).padStart(2, '0');
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const yyyy = dt.getFullYear();
  return `${dd}.${mm}.${yyyy}`;
}

function scoreColor(n) {
  if (n == null || isNaN(n)) return C.muted;
  if (n >= 75) return C.scoreGreen;
  if (n >= 50) return C.scoreYellow;
  return C.scoreRed;
}

function scoreRating(n) {
  if (n == null || isNaN(n)) return '';
  if (n >= 85) return 'Sehr gut';
  if (n >= 70) return 'Gut';
  if (n >= 50) return 'Akzeptabel';
  if (n >= 30) return 'Kritisch';
  return 'Sehr kritisch';
}

function formatPct(v) {
  if (v == null || v === '') return '';
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  if (isNaN(n) || n <= 0) return '';
  return Math.round(n <= 1 ? n * 100 : n) + '%';
}

// Picker-Reihenfolge ist defensiv: zuerst die echte V2-Analyzer-Quelle
// (criticalIssues / recommendations als Object-Arrays mit reichen Feldern),
// dann analyse-Subschema-Fallback, ganz zuletzt String-Array-Fallback.

function normalizeItem(x) {
  // Akzeptiert sowohl Objekt als auch nackten String. Bei Object werden alle
  // möglichen Felder eingelesen — leere Strings werden später nicht gerendert.
  if (typeof x === 'string') {
    const s = x.trim();
    return s ? { title: '', description: s, riskLevel: '', priority: '', legalBasis: '', consequence: '', timeframe: '', effort: '', impact: '' } : null;
  }
  if (x && typeof x === 'object') {
    return {
      title: safeStr(x.title),
      description: safeStr(x.description),
      riskLevel: safeStr(x.riskLevel),
      priority: safeStr(x.priority),
      legalBasis: safeStr(x.legalBasis),
      consequence: safeStr(x.consequence),
      timeframe: safeStr(x.timeframe),
      effort: safeStr(x.effort),
      impact: safeStr(x.impact),
    };
  }
  return null;
}

function pickRisks(contract) {
  // Quelle 1: criticalIssues (V2-Analyzer Standard-Feld, Objekt-Array mit legalBasis/consequence)
  const ci = Array.isArray(contract?.criticalIssues) ? contract.criticalIssues : [];
  if (ci.length) {
    const norm = ci.map(normalizeItem).filter(x => x && (x.title || x.description));
    if (norm.length) return norm;
  }
  // Quelle 2: analysis.concerningAspects (älteres Schema)
  const ca = Array.isArray(contract?.analysis?.concerningAspects) ? contract.analysis.concerningAspects : [];
  if (ca.length) {
    const norm = ca.map(normalizeItem).filter(x => x && (x.title || x.description));
    if (norm.length) return norm;
  }
  // Quelle 3: risiken (kann Object-Array sein — Alias für criticalIssues — oder String-Array)
  const r = Array.isArray(contract?.risiken) ? contract.risiken : [];
  if (r.length) {
    const norm = r.map(normalizeItem).filter(x => x && (x.title || x.description));
    if (norm.length) return norm;
  }
  return [];
}

function pickRecommendations(contract) {
  // Quelle 1: recommendations (V2-Analyzer Standard, Objekt-Array mit priority/timeframe/effort)
  const rec = Array.isArray(contract?.recommendations) ? contract.recommendations : [];
  if (rec.length) {
    const norm = rec.map(normalizeItem).filter(x => x && (x.title || x.description));
    if (norm.length) return norm;
  }
  // Quelle 2: analysis.recommendations (älteres Schema, String-Array)
  const a = Array.isArray(contract?.analysis?.recommendations) ? contract.analysis.recommendations : [];
  if (a.length) {
    const norm = a.map(normalizeItem).filter(x => x && (x.title || x.description));
    if (norm.length) return norm;
  }
  // Quelle 3: optimierungen (Optimizer-Output, String-Array)
  const opt = Array.isArray(contract?.optimierungen) ? contract.optimierungen : [];
  if (opt.length) {
    const norm = opt.map(normalizeItem).filter(x => x && (x.title || x.description));
    if (norm.length) return norm;
  }
  return [];
}

const RISK_LEVEL_STYLES = {
  critical: { label: 'Kritisch', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  high:     { label: 'Hoch',     bg: '#ffedd5', color: '#9a3412', border: '#fdba74' },
  medium:   { label: 'Mittel',   bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  low:      { label: 'Niedrig',  bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
};

const PRIORITY_STYLES = {
  urgent: { label: 'Dringend', bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  high:   { label: 'Hoch',     bg: '#ffedd5', color: '#9a3412', border: '#fdba74' },
  medium: { label: 'Mittel',   bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  low:    { label: 'Optional', bg: '#dbeafe', color: '#1e40af', border: '#bfdbfe' },
};

const IMPACT_STYLES = {
  high:   { label: 'Hoher Nutzen',    bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  medium: { label: 'Mittlerer Nutzen', bg: '#ecfdf5', color: '#065f46', border: '#a7f3d0' },
  low:    { label: 'Geringer Nutzen', bg: '#f0fdfa', color: '#0f766e', border: '#99f6e4' },
};

// Status-Badges für typeSpecificFindings (Pilot-Tiefenprüfung).
// Mapping ist großzügig wegen AI-Variabilität (ok/pass/conform → ok, issue/warn → issue, etc.).
const FINDING_STATUS_STYLES = {
  ok:              { label: 'Konform',       bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  pass:            { label: 'Konform',       bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  conform:         { label: 'Konform',       bg: '#d1fae5', color: '#065f46', border: '#6ee7b7' },
  issue:           { label: 'Auffällig',     bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  warning:         { label: 'Auffällig',     bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  warn:            { label: 'Auffällig',     bg: '#fef3c7', color: '#92400e', border: '#fde68a' },
  critical:        { label: 'Kritisch',      bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  fail:            { label: 'Kritisch',      bg: '#fee2e2', color: '#991b1b', border: '#fca5a5' },
  not_applicable:  { label: 'Nicht zutreffend', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  'not-applicable':{ label: 'Nicht zutreffend', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  n_a:             { label: 'Nicht zutreffend', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
  na:              { label: 'Nicht zutreffend', bg: '#f1f5f9', color: '#475569', border: '#e2e8f0' },
};

function lookupStyle(map, key) {
  if (!key) return null;
  return map[String(key).toLowerCase()] || null;
}

// Englische AI-Felder ins Deutsche übersetzen. Unbekannte Werte werden 1:1
// durchgereicht (Anti-Halluzination: nichts erfinden).
const EFFORT_DE = { low: 'gering', medium: 'mittel', high: 'hoch' };
function germanize(map, val) {
  if (!val) return '';
  const lower = String(val).toLowerCase().trim();
  return map[lower] || val;
}

function pickPositiveAspects(contract) {
  const pa = Array.isArray(contract?.positiveAspects) ? contract.positiveAspects : [];
  if (pa.length) {
    const norm = pa.map(normalizeItem).filter(x => x && (x.title || x.description));
    if (norm.length) return norm;
  }
  const pa2 = Array.isArray(contract?.analysis?.positiveAspects) ? contract.analysis.positiveAspects : [];
  if (pa2.length) {
    const norm = pa2.map(normalizeItem).filter(x => x && (x.title || x.description));
    if (norm.length) return norm;
  }
  return [];
}

// Generischer String-Array-Picker für summary/legalAssessment/comparison.
// Akzeptiert String oder String[]. Leere Strings/Whitespace werden gefiltert.
function pickStringArray(src) {
  if (!src) return [];
  const arr = Array.isArray(src) ? src : [src];
  return arr.map(safeStr).filter(s => s.length > 0);
}

function pickSummary(contract) {
  const a = pickStringArray(contract?.summary);
  if (a.length) return a;
  return pickStringArray(contract?.analysis?.summary);
}

function pickLegalAssessment(contract) {
  return pickStringArray(contract?.legalAssessment);
}

function pickComparison(contract) {
  return pickStringArray(contract?.comparison);
}

function pickTypeSpecificFindings(contract) {
  const arr = Array.isArray(contract?.typeSpecificFindings) ? contract.typeSpecificFindings : [];
  return arr
    .map(x => ({
      checkpoint: safeStr(x?.checkpoint),
      status: safeStr(x?.status),
      finding: safeStr(x?.finding),
      legalBasis: safeStr(x?.legalBasis),
      clauseRef: safeStr(x?.clauseRef),
    }))
    .filter(x => x.checkpoint || x.finding);
}

function pickFristHinweise(contract) {
  const arr = Array.isArray(contract?.fristHinweise) ? contract.fristHinweise : [];
  return arr
    .map(x => ({
      type: safeStr(x?.type),
      title: safeStr(x?.title),
      description: safeStr(x?.description),
      legalBasis: safeStr(x?.legalBasis),
      evidence: safeStr(x?.evidence),
    }))
    .filter(x => x.title || x.description);
}

// detailedLegalOpinion ist ein langer Fließtext. Split nach Paragraphen,
// damit react-pdf sauber umbrechen kann und das Anwalts-Gutachten-Feel
// stimmt (Absätze statt Wall-of-Text).
function pickDetailedOpinion(contract) {
  const txt = safeStr(contract?.detailedLegalOpinion);
  if (!txt) return [];
  // Erst nach Doppel-Newline splitten (echte Absätze), sonst nach Single-Newline.
  const parts = txt.includes('\n\n') ? txt.split(/\n{2,}/) : txt.split(/\n+/);
  return parts.map(s => s.trim()).filter(s => s.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  page: {
    paddingTop: 64,
    paddingBottom: 56,
    paddingHorizontal: 56,
    fontFamily: 'Helvetica',
    fontSize: 10.5,
    color: C.text,
    lineHeight: 1.55,
  },
  headerFixed: {
    position: 'absolute',
    top: 28,
    left: 56,
    right: 56,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
    fontSize: 8.5,
    color: C.faint,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBrand: {
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  headerSep: {
    color: C.border,
  },
  headerContract: {
    color: C.muted,
    fontSize: 8.5,
  },
  // Minimalist footer — nur Seitenzahl rechts unten. Das eigentliche RDG-Disclaimer
  // hat seinen eigenen Block am Ende des Gutachtens, hier nur dezente Pagination.
  // Wichtig: `top` statt `bottom` benutzen — react-pdf positioniert fixed-Elemente
  // mit `bottom: X` auf der letzten Seite unzuverlässig (bekannter Page-Break-Bug).
  // A4 = 842pt hoch, 810 ergibt ~32pt vom unteren Rand → konstant auf jeder Seite.
  footerFixed: {
    position: 'absolute',
    top: 810,
    right: 56,
  },
  footerPage: {
    color: C.faint,
    fontSize: 8,
  },

  // Cover
  coverWrap: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  coverTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  coverBrandStack: {
    flexDirection: 'column',
  },
  coverBrandMark: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    letterSpacing: 1,
  },
  coverBrandSub: {
    fontSize: 8.5,
    color: C.faint,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  coverLogo: {
    maxHeight: 38,
    maxWidth: 130,
    objectFit: 'contain',
  },
  coverCenter: {
    marginTop: 80,
  },
  coverKicker: {
    fontSize: 9.5,
    color: C.brand,
    letterSpacing: 2,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    marginBottom: 14,
    textTransform: 'uppercase',
  },
  coverTitle: {
    fontSize: 26,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    letterSpacing: -0.5,
    lineHeight: 1.2,
  },
  coverContractName: {
    marginTop: 18,
    fontSize: 14,
    color: C.text,
    lineHeight: 1.4,
  },
  coverMeta: {
    marginTop: 36,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 26,
  },
  coverMetaItem: {
    flexDirection: 'column',
  },
  coverMetaLabel: {
    fontSize: 8,
    color: C.faint,
    letterSpacing: 1.2,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  coverMetaValue: {
    fontSize: 11,
    color: C.ink,
  },
  coverFooter: {
    marginTop: 30,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
    fontSize: 8,
    color: C.faint,
    lineHeight: 1.5,
  },

  // Section
  sectionWrap: {
    marginTop: 14,
  },
  sectionHeader: {
    marginBottom: 10,
  },
  sectionKicker: {
    fontSize: 8,
    color: C.faint,
    letterSpacing: 1.4,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    letterSpacing: -0.2,
  },

  // Score block
  scoreBlock: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 22,
    marginTop: 4,
    marginBottom: 14,
  },
  scoreNum: {
    fontSize: 56,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    letterSpacing: -2,
    lineHeight: 1,
  },
  scoreSide: {
    flex: 1,
    paddingTop: 6,
  },
  scoreRatingLine: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  scoreBarTrack: {
    height: 6,
    backgroundColor: C.hairline,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  scoreBarFill: {
    height: 6,
    borderRadius: 3,
  },
  scoreScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 7.5,
    color: C.faint,
  },
  scoreReasoning: {
    marginTop: 4,
    fontSize: 10.5,
    color: C.text,
    lineHeight: 1.6,
  },

  // Sub-blocks (asymmetry, completeness)
  subBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  subLabel: {
    fontSize: 8,
    color: C.faint,
    letterSpacing: 1.2,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  subValue: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    marginBottom: 4,
  },
  subDetail: {
    fontSize: 10,
    color: C.muted,
    marginBottom: 3,
  },
  subText: {
    fontSize: 10,
    color: C.text,
    lineHeight: 1.55,
    marginTop: 3,
  },

  // Badges (inline pill row)
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 9,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
  },

  // Risks / Recommendations list
  itemWrap: {
    marginBottom: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  itemFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 4,
  },
  itemNum: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.faint,
    width: 22,
    paddingTop: 1,
  },
  itemBody: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 11.5,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    marginBottom: 3,
    lineHeight: 1.35,
  },
  itemDesc: {
    fontSize: 10.5,
    color: C.text,
    lineHeight: 1.55,
  },
  itemImpact: {
    marginTop: 4,
    fontSize: 9.5,
    color: C.muted,
    fontStyle: 'italic',
    lineHeight: 1.5,
  },

  // Inline pill row für Severity + Meta + LegalBasis
  itemPillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginBottom: 6,
    alignItems: 'center',
  },
  pill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    letterSpacing: 0.2,
  },
  pillLegal: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: C.hairline,
    color: '#475569',
    fontSize: 8.5,
    fontFamily: 'Helvetica',
  },
  // Klickbare Variante — leichte Blau-Tönung signalisiert „Quellenlink".
  // Visuell dezent, damit das Gutachten nicht wie eine Linkfarm aussieht.
  pillLegalLink: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: '#eff6ff',
    color: '#1e40af',
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    textDecoration: 'none',
  },
  metaText: {
    fontSize: 8.5,
    color: C.muted,
    fontFamily: 'Helvetica',
  },
  consequenceBox: {
    marginTop: 6,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: '#fca5a5',
    backgroundColor: '#fef2f2',
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: 8,
    borderRadius: 2,
  },
  consequenceLabel: {
    fontSize: 8,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: '#991b1b',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  consequenceText: {
    fontSize: 9.5,
    color: '#7f1d1d',
    lineHeight: 1.5,
  },

  // Bullet-Liste für summary/legalAssessment/comparison
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 6,
  },
  bulletDot: {
    fontSize: 11,
    color: C.brand,
    paddingTop: 2,
    width: 8,
  },
  bulletText: {
    flex: 1,
    fontSize: 10.5,
    color: C.text,
    lineHeight: 1.6,
  },
  subSectionTitle: {
    fontSize: 11.5,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    marginBottom: 8,
    marginTop: 14,
  },

  // Fristen-Sektion: kompaktere Karten
  fristItem: {
    marginBottom: 10,
    paddingTop: 10,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: C.hairline,
  },
  fristItemFirst: {
    borderTopWidth: 0,
    paddingTop: 0,
  },
  fristTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    marginBottom: 3,
  },
  fristDesc: {
    fontSize: 10.5,
    color: C.text,
    lineHeight: 1.55,
    marginBottom: 4,
  },

  // Detailed Legal Opinion — Fließtext-Layout
  opinionParagraph: {
    fontSize: 11,
    color: C.text,
    lineHeight: 1.7,
    marginBottom: 10,
    textAlign: 'justify',
  },

  // Sammelzeile für "Nicht zutreffend"-Checkpoints am Ende der Tiefenprüfung.
  // Bewusst dezent: signalisiert "wurde geprüft", nimmt aber nicht den Raum
  // eines vollen Cards-Items ein.
  notApplicableRow: {
    marginTop: 14,
    paddingTop: 10,
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: C.panel,
    borderRadius: 4,
  },
  notApplicableLabel: {
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.faint,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  notApplicableList: {
    fontSize: 10,
    color: C.muted,
    lineHeight: 1.5,
  },

  // Disclaimer — dezent: graue Border-Linie statt blauer Akzent (RDG-Polish 16.05.2026).
  // Juristisch unverändert: Box bleibt als Disclaimer-Zone erkennbar (Hintergrund + Linie).
  disclaimerWrap: {
    marginTop: 24,
    padding: 14,
    backgroundColor: C.panel,
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: C.border,
  },
  disclaimerTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    fontWeight: 'bold',
    color: C.ink,
    letterSpacing: 0.4,
    marginBottom: 5,
  },
  disclaimerText: {
    fontSize: 8.5,
    color: C.muted,
    lineHeight: 1.55,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────────────────────

function HeaderFixed({ contractName }) {
  return e(View, { style: styles.headerFixed, fixed: true },
    e(View, { style: styles.headerLeft },
      e(Text, { style: styles.headerBrand }, 'CONTRACT AI'),
      e(Text, { style: styles.headerSep }, '·'),
      e(Text, { style: styles.headerContract }, 'Rechtliche Vorprüfung'),
    ),
    e(Text, { style: styles.headerContract }, contractName || ''),
  );
}

function FooterFixed() {
  return e(View, { style: styles.footerFixed, fixed: true },
    e(Text, {
      style: styles.footerPage,
      render: ({ pageNumber, totalPages }) => `Seite ${pageNumber} / ${totalPages}`,
    }),
  );
}

function CoverPage({ contract, companyProfile, analysisDate }) {
  const score = typeof contract?.contractScore === 'number' ? contract.contractScore : null;
  // Vertragsart-Wert universell formatieren — siehe formatContractType-Helper.
  // Skip-Set verhindert, dass Subscription-Marker („recurring", „one-time")
  // fälschlich als Vertragsart angezeigt werden.
  const contractType = formatContractType(
    safeStr(contract?.analysis?.contractType) || safeStr(contract?.contractType)
  );
  const provider = safeStr(contract?.analysis?.parties?.provider) || safeStr(contract?.provider?.name);
  const customer = safeStr(contract?.analysis?.parties?.customer);
  const company = safeStr(companyProfile?.companyName);
  const hasLogo = !!safeStr(companyProfile?.logoUrl);

  const metaItems = [];
  if (analysisDate) metaItems.push({ label: 'Analyse erstellt', value: formatDate(analysisDate) });
  if (contractType) metaItems.push({ label: 'Vertragsart', value: contractType });
  if (provider) metaItems.push({ label: 'Anbieter', value: provider });
  if (customer) metaItems.push({ label: 'Vertragspartner', value: customer });
  if (score != null) metaItems.push({ label: 'Score', value: `${Math.round(score)} / 100` });

  return e(View, { style: styles.coverWrap },
    e(View, { style: styles.coverTopRow },
      e(View, { style: styles.coverBrandStack },
        e(Text, { style: styles.coverBrandMark }, 'CONTRACT AI'),
        e(Text, { style: styles.coverBrandSub }, 'Rechtliche Vorprüfung'),
      ),
      hasLogo
        ? e(Image, { src: companyProfile.logoUrl, style: styles.coverLogo })
        : (company ? e(Text, { style: styles.coverBrandMark }, company.toUpperCase()) : null),
    ),

    e(View, { style: styles.coverCenter },
      e(Text, { style: styles.coverKicker }, 'Rechtliche Vorprüfung · Vertragsanalyse'),
      e(Text, { style: styles.coverTitle }, 'Rechtliche Einordnung\nIhres Vertrags'),
      e(Text, { style: styles.coverContractName }, safeStr(contract?.name) || safeStr(contract?.title) || 'Unbenannter Vertrag'),

      metaItems.length > 0 && e(View, { style: styles.coverMeta },
        ...metaItems.map((it, i) =>
          e(View, { key: `meta-${i}`, style: styles.coverMetaItem },
            e(Text, { style: styles.coverMetaLabel }, it.label),
            e(Text, { style: styles.coverMetaValue }, it.value),
          ),
        ),
      ),
    ),

    e(View, { style: styles.coverFooter },
      e(Text, null,
        'Erstellt durch Contract AI auf Basis Ihrer hochgeladenen Vertragsdaten. Die rechtliche Einordnung erfolgt KI-gestützt und ersetzt keine anwaltliche Beratung. Für verbindliche Auskünfte konsultieren Sie bitte einen Rechtsanwalt.',
      ),
    ),
  );
}

function ScoreSection({ contract }) {
  const score = typeof contract?.contractScore === 'number' ? contract.contractScore : null;
  const reasoning = safeStr(contract?.scoreReasoning);
  const asym = contract?.asymmetryAssessment || null;
  const completeness = contract?.completeness || null;

  if (score == null && !reasoning && !asym && !completeness) return null;

  const color = scoreColor(score);
  const rating = scoreRating(score);
  const pct = score != null ? Math.max(0, Math.min(100, score)) : 0;

  const asymKey = asym?.rating ? String(asym.rating).toLowerCase().replace(/_/g, '-') : '';
  const asymLabel = ASYM_LABELS[asymKey];
  const asymFav = safeStr(asym?.favoredParty);
  const asymExp = safeStr(asym?.explanation);
  const showAsym = !!asymLabel;

  const compObs = safeStr(completeness?.observation);
  const compIsComplete = completeness?.isComplete;
  const compOpen = Array.isArray(completeness?.openItems) ? completeness.openItems.filter(safeStr) : [];
  const showCompleteness = compIsComplete != null || compObs || compOpen.length > 0;

  return e(View, { style: styles.sectionWrap },
    e(View, { style: styles.sectionHeader },
      e(Text, { style: styles.sectionKicker }, '01 · Gesamtbewertung'),
      e(Text, { style: styles.sectionTitle }, 'Score und rechtliche Einordnung'),
    ),

    e(View, { style: styles.scoreBlock },
      score != null
        ? e(Text, { style: [styles.scoreNum, { color }] }, String(Math.round(score)))
        : e(Text, { style: [styles.scoreNum, { color: C.faint }] }, '—'),

      e(View, { style: styles.scoreSide },
        rating && e(Text, { style: [styles.scoreRatingLine, { color }] }, rating),
        e(View, { style: styles.scoreBarTrack },
          e(View, { style: [styles.scoreBarFill, { width: `${pct}%`, backgroundColor: color }] }),
        ),
        e(View, { style: styles.scoreScale },
          e(Text, null, '0 kritisch'),
          e(Text, null, '50 akzeptabel'),
          e(Text, null, '100 optimal'),
        ),
      ),
    ),

    reasoning && e(Text, { style: styles.scoreReasoning }, reasoning),

    showAsym && e(View, { style: styles.subBlock },
      e(Text, { style: styles.subLabel }, 'Ausgewogenheit der Vertragsgestaltung'),
      e(Text, { style: styles.subValue }, asymLabel),
      asymFav && asymFav !== 'null' && e(Text, { style: styles.subDetail }, `Bevorzugte Partei: ${asymFav}`),
      asymExp && e(Text, { style: styles.subText }, asymExp),
    ),

    showCompleteness && e(View, { style: styles.subBlock },
      e(Text, { style: styles.subLabel }, 'Vollständigkeit der Analyse'),
      compIsComplete != null && e(Text, { style: styles.subValue },
        compIsComplete === false
          ? `Eingeschränkt — ${compOpen.length} offene${compOpen.length === 1 ? 'r' : ''} Punkt${compOpen.length === 1 ? '' : 'e'}`
          : 'Vollständig',
      ),
      compObs && e(Text, { style: styles.subText }, compObs),
      compOpen.length > 0 && e(View, { style: { marginTop: 6 } },
        ...compOpen.slice(0, 6).map((it, i) =>
          e(Text, { key: `co-${i}`, style: { fontSize: 9.5, color: C.muted, lineHeight: 1.55 } },
            `•  ${it}`,
          ),
        ),
      ),
    ),
  );
}

function BulletList({ items, keyPrefix }) {
  return e(View, null,
    ...items.map((s, i) =>
      e(View, { key: `${keyPrefix}-${i}`, style: styles.bulletItem },
        e(Text, { style: styles.bulletDot }, '•'),
        e(Text, { style: styles.bulletText }, s),
      ),
    ),
  );
}

function OverviewSection({ contract, sectionNumber }) {
  const summary = pickSummary(contract);
  const assess = pickLegalAssessment(contract);
  const comp = pickComparison(contract);
  if (!summary.length && !assess.length && !comp.length) return null;

  return e(View, { style: styles.sectionWrap, break: true },
    e(View, { style: styles.sectionHeader },
      e(Text, { style: styles.sectionKicker }, `${String(sectionNumber).padStart(2, '0')} · Überblick`),
      e(Text, { style: styles.sectionTitle }, 'Zusammenfassung und rechtliche Einordnung'),
    ),

    summary.length > 0 && e(View, null,
      e(Text, { style: styles.subSectionTitle }, 'Zusammenfassung'),
      e(BulletList, { items: summary, keyPrefix: 'sum' }),
    ),

    assess.length > 0 && e(View, null,
      e(Text, { style: styles.subSectionTitle }, 'Rechtliche Einordnung'),
      e(BulletList, { items: assess, keyPrefix: 'la' }),
    ),

    comp.length > 0 && e(View, null,
      e(Text, { style: styles.subSectionTitle }, 'Marktvergleich'),
      e(BulletList, { items: comp, keyPrefix: 'cmp' }),
    ),
  );
}

function isNotApplicableStatus(status) {
  const s = String(status || '').toLowerCase().trim();
  return s === 'not_applicable' || s === 'not-applicable' || s === 'n_a' || s === 'na';
}

function TypeSpecificFindingsSection({ contract, sectionNumber }) {
  const allItems = pickTypeSpecificFindings(contract);
  if (!allItems.length) return null;

  // Trennung: relevante Checkpoints kriegen volles Rendering,
  // "Nicht zutreffend"-Punkte werden am Ende als eine Sammelzeile
  // zusammengefasst — spart Platz und liest sich professioneller.
  const relevant = allItems.filter(it => !isNotApplicableStatus(it.status));
  const notApplicable = allItems.filter(it => isNotApplicableStatus(it.status));

  // Sektion-Headline reflektiert die GESAMT-Zahl (auch n.a. wurde geprüft → Trust-Signal).
  const total = allItems.length;

  return e(View, { style: styles.sectionWrap, break: true },
    e(View, { style: styles.sectionHeader },
      e(Text, { style: styles.sectionKicker }, `${String(sectionNumber).padStart(2, '0')} · Spezifische Tiefenprüfung`),
      e(Text, { style: styles.sectionTitle },
        total === 1 ? 'Geprüfter Vertragspunkt' : `${total} geprüfte Vertragspunkte`,
      ),
    ),

    ...relevant.map((it, i) => {
      const statusStyle = lookupStyle(FINDING_STATUS_STYLES, it.status);
      const pills = [];
      if (statusStyle) {
        pills.push(e(Text, {
          key: 'status',
          style: [styles.pill, { backgroundColor: statusStyle.bg, color: statusStyle.color, borderColor: statusStyle.border }],
        }, statusStyle.label));
      }
      if (it.legalBasis) {
        pills.push(makeLegalPill('legal', it.legalBasis));
      }

      return e(View, { key: `tsf-${i}`, style: [styles.itemWrap, i === 0 && styles.itemFirst].filter(Boolean), wrap: false },
        e(View, { style: styles.itemHeaderRow },
          e(Text, { style: styles.itemNum }, String(i + 1).padStart(2, '0')),
          e(View, { style: styles.itemBody },
            it.checkpoint && e(Text, { style: styles.itemTitle }, it.checkpoint),
            pills.length > 0 && e(View, { style: styles.itemPillRow }, ...pills),
            it.finding && e(Text, { style: styles.itemDesc }, it.finding),
            it.clauseRef && e(Text, { style: [styles.metaText, { marginTop: 4 }] }, `Klausel-Bezug: ${it.clauseRef}`),
          ),
        ),
      );
    }),

    notApplicable.length > 0 && e(View, { style: styles.notApplicableRow, wrap: false },
      e(Text, { style: styles.notApplicableLabel }, 'Nicht zutreffend (geprüft, im Vertrag nicht geregelt):'),
      e(Text, { style: styles.notApplicableList },
        notApplicable.map(it => safeStr(it.checkpoint)).filter(Boolean).join('  ·  '),
      ),
    ),
  );
}

function FristHinweiseSection({ contract, sectionNumber }) {
  const items = pickFristHinweise(contract);
  if (!items.length) return null;

  return e(View, { style: styles.sectionWrap, break: true },
    e(View, { style: styles.sectionHeader },
      e(Text, { style: styles.sectionKicker }, `${String(sectionNumber).padStart(2, '0')} · Fristen und rechtliche Hinweise`),
      e(Text, { style: styles.sectionTitle },
        items.length === 1 ? 'Wichtiger Hinweis' : `${items.length} wichtige Hinweise`,
      ),
    ),

    ...items.map((it, i) => {
      const pills = [];
      if (it.legalBasis) {
        pills.push(makeLegalPill('legal', it.legalBasis));
      }
      return e(View, { key: `frist-${i}`, style: [styles.fristItem, i === 0 && styles.fristItemFirst].filter(Boolean), wrap: false },
        it.title && e(Text, { style: styles.fristTitle }, it.title),
        it.description && e(Text, { style: styles.fristDesc }, it.description),
        pills.length > 0 && e(View, { style: styles.itemPillRow }, ...pills),
      );
    }),
  );
}

function DetailedOpinionSection({ contract, sectionNumber }) {
  const paragraphs = pickDetailedOpinion(contract);
  if (!paragraphs.length) return null;

  return e(View, { style: styles.sectionWrap, break: true },
    e(View, { style: styles.sectionHeader },
      e(Text, { style: styles.sectionKicker }, `${String(sectionNumber).padStart(2, '0')} · Ausführliche rechtliche Würdigung`),
      e(Text, { style: styles.sectionTitle }, 'Vollständige rechtliche Würdigung'),
    ),

    ...paragraphs.map((p, i) =>
      e(Text, { key: `op-${i}`, style: styles.opinionParagraph }, p),
    ),
  );
}

function PositiveAspectsSection({ contract, sectionNumber }) {
  const items = pickPositiveAspects(contract);
  if (!items.length) return null;

  return e(View, { style: styles.sectionWrap, break: true },
    e(View, { style: styles.sectionHeader },
      e(Text, { style: styles.sectionKicker }, `${String(sectionNumber).padStart(2, '0')} · Positive Aspekte`),
      e(Text, { style: styles.sectionTitle },
        items.length === 1 ? 'Vorteilhafte Vertragsregelung' : `${items.length} vorteilhafte Regelungen`,
      ),
    ),

    ...items.map((it, i) => {
      const impactStyle = lookupStyle(IMPACT_STYLES, it.impact);
      const pills = impactStyle ? [
        e(Text, {
          key: 'impact',
          style: [styles.pill, { backgroundColor: impactStyle.bg, color: impactStyle.color, borderColor: impactStyle.border }],
        }, impactStyle.label),
      ] : [];

      return e(View, { key: `pos-${i}`, style: [styles.itemWrap, i === 0 && styles.itemFirst].filter(Boolean), wrap: false },
        e(View, { style: styles.itemHeaderRow },
          e(Text, { style: styles.itemNum }, String(i + 1).padStart(2, '0')),
          e(View, { style: styles.itemBody },
            it.title && e(Text, { style: styles.itemTitle }, it.title),
            pills.length > 0 && e(View, { style: styles.itemPillRow }, ...pills),
            it.description && e(Text, { style: styles.itemDesc }, it.description),
          ),
        ),
      );
    }),
  );
}

function RisksSection({ contract, sectionNumber }) {
  const risks = pickRisks(contract);
  if (!risks.length) return null;

  return e(View, { style: styles.sectionWrap, break: true },
    e(View, { style: styles.sectionHeader },
      e(Text, { style: styles.sectionKicker }, `${String(sectionNumber).padStart(2, '0')} · Risiken und kritische Punkte`),
      e(Text, { style: styles.sectionTitle },
        risks.length === 1 ? 'Identifiziertes Risiko' : `${risks.length} identifizierte Risiken`,
      ),
    ),

    ...risks.map((r, i) => {
      const levelStyle = lookupStyle(RISK_LEVEL_STYLES, r.riskLevel);
      const pills = [];
      if (levelStyle) {
        pills.push(e(Text, {
          key: 'level',
          style: [styles.pill, { backgroundColor: levelStyle.bg, color: levelStyle.color, borderColor: levelStyle.border }],
        }, levelStyle.label));
      }
      if (r.legalBasis) {
        pills.push(makeLegalPill('legal', r.legalBasis));
      }

      return e(View, { key: `risk-${i}`, style: [styles.itemWrap, i === 0 && styles.itemFirst].filter(Boolean), wrap: false },
        e(View, { style: styles.itemHeaderRow },
          e(Text, { style: styles.itemNum }, String(i + 1).padStart(2, '0')),
          e(View, { style: styles.itemBody },
            r.title && e(Text, { style: styles.itemTitle }, r.title),
            pills.length > 0 && e(View, { style: styles.itemPillRow }, ...pills),
            r.description && e(Text, { style: styles.itemDesc }, r.description),
            r.impact && e(Text, { style: styles.itemImpact }, `Auswirkung: ${r.impact}`),
            r.consequence && e(View, { style: styles.consequenceBox },
              e(Text, { style: styles.consequenceLabel }, 'Mögliche Folge'),
              e(Text, { style: styles.consequenceText }, r.consequence),
            ),
          ),
        ),
      );
    }),
  );
}

function RecommendationsSection({ contract, sectionNumber }) {
  const recs = pickRecommendations(contract);
  if (!recs.length) return null;

  return e(View, { style: styles.sectionWrap, break: true },
    e(View, { style: styles.sectionHeader },
      e(Text, { style: styles.sectionKicker }, `${String(sectionNumber).padStart(2, '0')} · Handlungsempfehlungen`),
      e(Text, { style: styles.sectionTitle },
        recs.length === 1 ? 'Empfohlene Maßnahme' : `${recs.length} empfohlene Maßnahmen`,
      ),
    ),

    ...recs.map((r, i) => {
      const priStyle = lookupStyle(PRIORITY_STYLES, r.priority);
      const pills = [];
      if (priStyle) {
        pills.push(e(Text, {
          key: 'pri',
          style: [styles.pill, { backgroundColor: priStyle.bg, color: priStyle.color, borderColor: priStyle.border }],
        }, priStyle.label));
      }
      const metaParts = [];
      if (r.timeframe) metaParts.push(`Zeitrahmen: ${r.timeframe}`);
      if (r.effort) metaParts.push(`Aufwand: ${germanize(EFFORT_DE, r.effort)}`);
      const metaLine = metaParts.join('  ·  ');

      return e(View, { key: `rec-${i}`, style: [styles.itemWrap, i === 0 && styles.itemFirst].filter(Boolean), wrap: false },
        e(View, { style: styles.itemHeaderRow },
          e(Text, { style: styles.itemNum }, String(i + 1).padStart(2, '0')),
          e(View, { style: styles.itemBody },
            r.title && e(Text, { style: styles.itemTitle }, r.title),
            pills.length > 0 && e(View, { style: styles.itemPillRow }, ...pills),
            r.description && e(Text, { style: styles.itemDesc }, r.description),
            metaLine && e(Text, { style: [styles.metaText, { marginTop: 4 }] }, metaLine),
          ),
        ),
      );
    }),
  );
}

function DisclaimerBlock({ contract } = {}) {
  // 🛡️ Welle 3 (Vertrauens-Schicht): Ehrlichkeits-Notizen — das PDF wirkt
  // autoritativer als jedes UI-Banner und darf Kürzung/Fallback nicht verschweigen.
  const coverageNote = contract?.analysisCoverage?.truncated
    ? ` Hinweis: Das Dokument ist sehr umfangreich (${Number(contract.analysisCoverage.originalChars || 0).toLocaleString('de-DE')} Zeichen); die Analyse basiert auf den wichtigsten ca. ${Number(contract.analysisCoverage.analyzedChars || 0).toLocaleString('de-DE')} Zeichen (Anfang, Kernabschnitte, Ende).`
    : '';
  const fallbackNote = contract?.usedFallbackFormat === true
    ? ' Hinweis: Diese Analyse konnte nur eingeschränkt erstellt werden und enthält teilweise generische Formulierungen — eine erneute Analyse wird empfohlen.'
    : '';
  return e(View, { style: styles.disclaimerWrap, wrap: false },
    e(Text, { style: styles.disclaimerTitle }, 'RECHTLICHER HINWEIS'),
    e(Text, { style: styles.disclaimerText },
      'Diese rechtliche Vorprüfung wurde KI-gestützt erstellt und stellt keine individuelle Rechtsberatung im Sinne des Rechtsdienstleistungsgesetzes (RDG) dar. Sie ersetzt keine Beratung durch einen zugelassenen Rechtsanwalt. Die rechtliche Einordnung basiert auf dem hochgeladenen Vertragstext und kann durch Aspekte beeinflusst werden, die der KI nicht zugänglich waren. Für verbindliche rechtliche Auskünfte konsultieren Sie bitte einen Fachanwalt.'
      + coverageNote + fallbackNote,
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Document
// ─────────────────────────────────────────────────────────────────────────────

function GutachtenDocument({ contract, companyProfile }) {
  const contractName = safeStr(contract?.name) || safeStr(contract?.title) || 'Vertragsanalyse';
  const analysisDate =
    contract?.analysisCompletedAt ||
    contract?.analysis?.analyzedAt ||
    contract?.updatedAt ||
    contract?.createdAt ||
    new Date();

  // Section-Reihenfolge (adaptive, nur wenn Daten da):
  // 01 Gesamtbewertung (Score) — immer wenn überhaupt analysiert
  // 02 Überblick (summary + legalAssessment + comparison)
  // 03 Risiken
  // 04 Handlungsempfehlungen
  // 05 Spezifische Tiefenprüfung (typeSpecificFindings, nur Pilot-Typen)
  // 06 Fristen & Hinweise
  // 07 Positive Aspekte
  // 08 Ausführliche rechtliche Würdigung (detailedLegalOpinion)
  const hasOverview = pickSummary(contract).length > 0 || pickLegalAssessment(contract).length > 0 || pickComparison(contract).length > 0;
  const hasRisks = pickRisks(contract).length > 0;
  const hasRecs = pickRecommendations(contract).length > 0;
  const hasTsf = pickTypeSpecificFindings(contract).length > 0;
  const hasFrist = pickFristHinweise(contract).length > 0;
  const hasPos = pickPositiveAspects(contract).length > 0;
  const hasOpinion = pickDetailedOpinion(contract).length > 0;

  let nextNum = 2;
  const overviewNum = hasOverview ? nextNum++ : null;
  const risksNum = hasRisks ? nextNum++ : null;
  const recsNum = hasRecs ? nextNum++ : null;
  const tsfNum = hasTsf ? nextNum++ : null;
  const fristNum = hasFrist ? nextNum++ : null;
  const posNum = hasPos ? nextNum++ : null;
  const opinionNum = hasOpinion ? nextNum++ : null;

  return e(Document, {
    title: `Rechtliche Vorprüfung · ${contractName}`,
    author: 'Contract AI',
    subject: 'KI-gestützte Vertragsanalyse',
    creator: 'Contract AI',
  },
    // Page 1: Cover (kein Header/Footer)
    e(Page, { size: 'A4', style: [styles.page, { paddingTop: 56, paddingBottom: 48 }] },
      e(CoverPage, { contract, companyProfile, analysisDate }),
    ),

    // Page 2+: Content mit Header/Footer
    e(Page, { size: 'A4', style: styles.page },
      e(HeaderFixed, { contractName }),
      e(FooterFixed),
      e(ScoreSection, { contract }),
      hasOverview && e(OverviewSection, { contract, sectionNumber: overviewNum }),
      hasRisks && e(RisksSection, { contract, sectionNumber: risksNum }),
      hasRecs && e(RecommendationsSection, { contract, sectionNumber: recsNum }),
      hasTsf && e(TypeSpecificFindingsSection, { contract, sectionNumber: tsfNum }),
      hasFrist && e(FristHinweiseSection, { contract, sectionNumber: fristNum }),
      hasPos && e(PositiveAspectsSection, { contract, sectionNumber: posNum }),
      hasOpinion && e(DetailedOpinionSection, { contract, sectionNumber: opinionNum }),
      e(DisclaimerBlock, { contract }),
    ),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry
// ─────────────────────────────────────────────────────────────────────────────

async function generateGutachtenPdf({ contract, companyProfile }) {
  if (!contract) throw new Error('generateGutachtenPdf: contract is required');
  const docElement = e(GutachtenDocument, { contract, companyProfile: companyProfile || null });
  return await ReactPDF.renderToBuffer(docElement);
}

module.exports = {
  generateGutachtenPdf,
};
