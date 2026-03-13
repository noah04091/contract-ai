/**
 * Stage 0: Document Intelligence
 * PDF Cleaning, Structure Detection, Contract Type Classification — no AI calls.
 */

const { smartTruncate } = require("../../optimizerV2/utils/clauseSplitter");

// Contract type keywords for classifier
const CONTRACT_TYPE_PATTERNS = {
  mietvertrag: ["mietvertrag", "mieter", "vermieter", "mietzins", "mietobjekt", "mietdauer", "nebenkosten", "kaution", "schönheitsreparatur"],
  arbeitsvertrag: ["arbeitsvertrag", "arbeitnehmer", "arbeitgeber", "gehalt", "vergütung", "arbeitszeit", "urlaub", "kündigungsfrist", "probezeit", "sozialversicherung"],
  nda: ["geheimhaltung", "vertraulich", "non-disclosure", "nda", "geheimhaltungsvereinbarung", "vertraulichkeitsvereinbarung", "offenlegende partei", "empfangende partei"],
  dienstleistung: ["dienstleistung", "dienstvertrag", "auftragnehmer", "auftraggeber", "leistungsbeschreibung", "service level", "werkvertrag"],
  saas: ["software as a service", "saas", "cloud", "verfügbarkeit", "uptime", "sla", "service level agreement", "api", "datenspeicherung"],
  versicherung: ["versicherung", "versicherungsnehmer", "versicherer", "prämie", "deckung", "schadenfall", "selbstbeteiligung", "leistungsausschluss"],
  kaufvertrag: ["kaufvertrag", "käufer", "verkäufer", "kaufpreis", "kaufgegenstand", "eigentumsvorbehalt", "gewährleistung", "lieferung"],
  lizenz: ["lizenz", "lizenzgeber", "lizenznehmer", "nutzungsrecht", "lizenzgebühr", "urheberrecht", "unterlizenz"],
  freelancer: ["freiberuf", "freelancer", "selbständig", "honorar", "werkvertrag", "auftragnehmer", "projekt"],
  gesellschaftsvertrag: ["gesellschaftsvertrag", "gesellschafter", "stammkapital", "geschäftsführ", "gewinnverteilung", "gmbh", "ohg", "kg"],
};

/**
 * Classify contract type based on keyword frequency
 */
function classifyContractType(text) {
  const lowerText = text.toLowerCase();
  const scores = {};

  for (const [type, keywords] of Object.entries(CONTRACT_TYPE_PATTERNS)) {
    let count = 0;
    for (const kw of keywords) {
      const regex = new RegExp(kw, "gi");
      const matches = lowerText.match(regex);
      if (matches) count += matches.length;
    }
    if (count > 0) scores[type] = count;
  }

  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return { type: "unbekannt", confidence: 0 };

  const topScore = entries[0][1];
  const secondScore = entries.length > 1 ? entries[1][1] : 0;
  // Confidence based on how dominant the top type is
  const confidence = Math.min(100, Math.round((topScore / (topScore + secondScore + 1)) * 100));

  return { type: entries[0][0], confidence };
}

/**
 * Clean raw PDF text: remove OCR artifacts, fix encoding, normalize whitespace
 */
function cleanText(rawText) {
  if (!rawText) return "";

  let text = rawText;

  // Fix common OCR artifacts
  text = text.replace(/\ufeff/g, ""); // BOM
  text = text.replace(/\u00ad/g, "-"); // soft hyphen
  text = text.replace(/[\u200b-\u200f\u2028-\u202f\u2060\ufeff]/g, ""); // zero-width chars
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n"); // normalize line endings

  // Fix broken words from page breaks (e.g., "Ver-\ntrag" -> "Vertrag")
  text = text.replace(/(\w)-\n(\w)/g, "$1$2");

  // Remove page numbers (common pattern: standalone numbers on a line)
  text = text.replace(/^\s*-?\s*\d{1,3}\s*-?\s*$/gm, "");
  text = text.replace(/^Seite\s+\d+\s*(von\s+\d+)?\s*$/gim, "");

  // Remove excessive blank lines (more than 2 -> 2)
  text = text.replace(/\n{4,}/g, "\n\n\n");

  // Normalize whitespace within lines
  text = text.replace(/[ \t]{3,}/g, "  ");

  return text.trim();
}

/**
 * Detect document structure (headings, paragraphs, numbering)
 */
function detectStructure(text) {
  const hasNumberedSections = /^(§\s*\d+|Artikel\s+\d+|\d+\.\s+[A-ZÄÖÜ])/m.test(text);
  const hasSubSections = /^\d+\.\d+\s+/m.test(text);
  const hasParagraphs = (text.match(/\n\n/g) || []).length > 3;

  return {
    structureDetected: hasNumberedSections || hasSubSections,
    hasNumberedSections,
    hasSubSections,
    hasParagraphs,
  };
}

/**
 * Extract metadata from document header/footer
 */
function extractDocumentMeta(text) {
  const parties = [];
  const meta = { parties: [], contractDate: null, contractType: null };

  // Extract parties (common patterns)
  const partyPatterns = [
    /(?:zwischen|party|partei|vertragspartner)\s*[:\n]\s*(.+?)(?:\n|$)/gi,
    /(?:auftraggeber|mieter|käufer|arbeitnehmer|lizenznehmer|versicherungsnehmer)\s*[:\n]\s*(.+?)(?:\n|$)/gi,
    /(?:auftragnehmer|vermieter|verkäufer|arbeitgeber|lizenzgeber|versicherer)\s*[:\n]\s*(.+?)(?:\n|$)/gi,
  ];

  for (const pattern of partyPatterns) {
    let match;
    while ((match = pattern.exec(text.substring(0, 3000))) !== null) {
      const party = match[1].trim().replace(/[,;]$/, "").trim();
      if (party.length > 2 && party.length < 150 && !parties.includes(party)) {
        parties.push(party);
      }
    }
  }

  meta.parties = parties.slice(0, 4);

  // Extract date
  const dateMatch = text.substring(0, 3000).match(
    /(?:vom|datiert|datum|date|geschlossen am)\s*[:\s]*(\d{1,2}[./]\d{1,2}[./]\d{2,4})/i
  );
  if (dateMatch) meta.contractDate = dateMatch[1];

  return meta;
}

/**
 * Calculate document quality score
 */
function calculateQualityScore(rawText, cleanedText) {
  let score = 100;

  // Penalty for very short text (might be scanned poorly)
  if (cleanedText.length < 500) score -= 40;
  else if (cleanedText.length < 2000) score -= 15;

  // Penalty for high ratio of special chars (OCR noise)
  const specialCharRatio = (cleanedText.match(/[^\w\s.,;:!?()§äöüÄÖÜß\-"'\/\n]/g) || []).length / cleanedText.length;
  if (specialCharRatio > 0.1) score -= 30;
  else if (specialCharRatio > 0.05) score -= 15;

  // Penalty for no structure detected
  const structure = detectStructure(cleanedText);
  if (!structure.structureDetected) score -= 10;

  // Penalty for text much shorter than raw (heavy cleaning = bad source)
  const cleanRatio = cleanedText.length / Math.max(rawText.length, 1);
  if (cleanRatio < 0.7) score -= 20;
  else if (cleanRatio < 0.85) score -= 10;

  return Math.max(0, Math.min(100, score));
}

/**
 * Stage 0: Document Intelligence
 * @param {string} rawText - Raw text from PDF
 * @returns {object} Document intelligence result
 */
function runDocumentIntelligence(rawText) {
  const cleanedText = cleanText(rawText);
  const truncatedText = smartTruncate(cleanedText, 50000);
  const structure = detectStructure(cleanedText);
  const { type: contractType, confidence: contractTypeConfidence } = classifyContractType(cleanedText);
  const extractedMeta = extractDocumentMeta(cleanedText);
  const qualityScore = calculateQualityScore(rawText, cleanedText);

  // Estimate page count (rough: ~3000 chars per page)
  const pageCount = Math.max(1, Math.round(rawText.length / 3000));

  // Detect language (simple heuristic)
  const germanIndicators = (cleanedText.match(/\b(der|die|das|und|oder|ist|wird|hat|ein|eine|für|mit|auf|von|zu|den|dem|des|nicht|werden|sind|bei|nach|auch|nur)\b/gi) || []).length;
  const language = germanIndicators > 20 ? "de" : "en";

  return {
    cleanedText: truncatedText,
    document: {
      qualityScore,
      pageCount,
      language,
      structureDetected: structure.structureDetected,
      cleanedTextLength: truncatedText.length,
      contractType,
      contractTypeConfidence,
      extractedMeta: {
        parties: extractedMeta.parties,
        contractDate: extractedMeta.contractDate,
        contractType,
      },
    },
  };
}

module.exports = { runDocumentIntelligence, classifyContractType, cleanText };
