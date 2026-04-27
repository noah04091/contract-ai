/**
 * Lightweight i18n helper for Legal Pulse V2.
 *
 * Used to localize backend-generated user-facing strings (progress messages,
 * error messages, summary fragments) based on the contract's detected language.
 *
 * SCOPE: Legal Pulse V2 ONLY. The application has no global i18n system.
 * Other parts of the backend (auth, billing, generic API errors) intentionally
 * keep their existing German strings — Contract AI is a German-market product
 * with English support added only for contract-content-related output.
 *
 * SAFETY:
 * - Default language is "de" — every string is byte-identical to the previous
 *   hardcoded German wording for unchanged behavior on the German path.
 * - Unknown language values fall back to "de".
 * - Missing keys fall back to the German entry, then to the key itself, so
 *   the helper can never crash the pipeline.
 */

const translations = {
  de: {
    // ── Errors & failures ─────────────────────────────────────────
    "error.noContractText": "Kein Vertragstext verfügbar. Bitte laden Sie den Vertrag erneut hoch.",
    "error.qualityTooLow": "Dokumentqualität zu niedrig für eine zuverlässige Analyse (Score: {score}/100). Bitte laden Sie eine bessere PDF-Version hoch.",
    "error.qualityWarning": "Eingeschränkte Dokumentqualität — Ergebnisse können unvollständig sein",
    "error.notAContract": "Dokument ist kein Vertrag",
    "error.contractNotFound": "Vertrag {contractId} nicht gefunden",
    "error.resultNotFound": "Ergebnis nicht gefunden",
    "error.loadingResult": "Fehler beim Laden des Ergebnisses",

    // ── Progress messages (SSE → frontend) ────────────────────────
    "progress.collectingContext": "Sammle Vertragskontext...",
    "progress.contextCollected": "Kontext gesammelt",
    "progress.loadingText": "Lade und bereinige Vertragstext...",
    "progress.analysisAborted.qualityLow": "Analyse abgebrochen: Dokumentqualität zu niedrig",
    "progress.analysisAborted.reason": "Analyse abgebrochen: {reason}",
    "progress.documentCleaned": "Dokument bereinigt ({chars} Zeichen, Typ: {type}){suffix}",
    "progress.qualityLimitedSuffix": " — Eingeschränkte Qualität",
    "progress.startingDeepAnalysis": "Starte tiefgehende Klauselanalyse...",
    "progress.findingsIdentified": "{count} Befunde identifiziert{coverage}",
    "progress.coverageDetail": " ({analyzed}/{total} Klauseln analysiert)",
    "progress.startingPortfolio": "Starte Portfolio-Analyse...",
    "progress.portfolioInsights": "{count} Portfolio-Insights erkannt",
    "progress.portfolioUnavailable": "Portfolio-Analyse nicht verfügbar",
    "progress.portfolioFailed": "Portfolio-Analyse konnte nicht durchgeführt werden",
    "progress.generatingActions": "Generiere Handlungsempfehlungen...",
    "progress.actionsGenerated": "{count} Handlungsempfehlungen generiert",
    "progress.actionsUnavailable": "Empfehlungen nicht verfügbar",
    "progress.actionsFailed": "Handlungsempfehlungen konnten nicht generiert werden",
    "progress.calculatingScore": "Berechne Health Score...",
    "progress.healthScore": "Health Score: {score}/100",

    // ── Pipeline / SSE ────────────────────────────────────────────
    "sse.analysisComplete": "Analyse abgeschlossen",
  },
  en: {
    // ── Errors & failures ─────────────────────────────────────────
    "error.noContractText": "Contract text not available. Please re-upload the contract.",
    "error.qualityTooLow": "Document quality too low for reliable analysis (score: {score}/100). Please upload a higher-quality PDF version.",
    "error.qualityWarning": "Limited document quality — results may be incomplete",
    "error.notAContract": "This document is not a contract",
    "error.contractNotFound": "Contract {contractId} not found",
    "error.resultNotFound": "Result not found",
    "error.loadingResult": "Error loading result",

    // ── Progress messages (SSE → frontend) ────────────────────────
    "progress.collectingContext": "Collecting contract context...",
    "progress.contextCollected": "Context collected",
    "progress.loadingText": "Loading and cleaning contract text...",
    "progress.analysisAborted.qualityLow": "Analysis aborted: document quality too low",
    "progress.analysisAborted.reason": "Analysis aborted: {reason}",
    "progress.documentCleaned": "Document cleaned ({chars} characters, type: {type}){suffix}",
    "progress.qualityLimitedSuffix": " — Limited quality",
    "progress.startingDeepAnalysis": "Starting deep clause analysis...",
    "progress.findingsIdentified": "{count} findings identified{coverage}",
    "progress.coverageDetail": " ({analyzed}/{total} clauses analyzed)",
    "progress.startingPortfolio": "Starting portfolio analysis...",
    "progress.portfolioInsights": "{count} portfolio insights detected",
    "progress.portfolioUnavailable": "Portfolio analysis unavailable",
    "progress.portfolioFailed": "Portfolio analysis could not be completed",
    "progress.generatingActions": "Generating action recommendations...",
    "progress.actionsGenerated": "{count} action recommendations generated",
    "progress.actionsUnavailable": "Recommendations unavailable",
    "progress.actionsFailed": "Action recommendations could not be generated",
    "progress.calculatingScore": "Calculating health score...",
    "progress.healthScore": "Health score: {score}/100",

    // ── Pipeline / SSE ────────────────────────────────────────────
    "sse.analysisComplete": "Analysis complete",
  },
};

/**
 * Translate a key with optional template parameters.
 *
 * @param {string} key - Translation key (e.g. "progress.contextCollected")
 * @param {string} [language="de"] - "de" or "en" (case-insensitive). Anything else falls back to "de".
 * @param {object} [params] - Template values for {placeholder} substitution.
 * @returns {string} Translated string with placeholders substituted.
 */
function t(key, language = "de", params) {
  const lang = String(language || "de").toLowerCase() === "en" ? "en" : "de";
  const map = translations[lang] || translations.de;

  // Defensive fallback: missing key in selected language → German → key itself.
  // Should never happen in production but keeps the pipeline alive on a typo.
  let str = map[key];
  if (str === undefined) str = translations.de[key];
  if (str === undefined) str = key;

  if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      // Use split/join to replace ALL occurrences without regex-escaping the value
      str = str.split(`{${k}}`).join(v === null || v === undefined ? "" : String(v));
    }
  }

  return str;
}

module.exports = { t, translations };
