/**
 * Direct Extraction Adapter (V4)
 *
 * Mappt den Output von DirectExtractor auf das V1-Shape-Format,
 * das die restliche Legal-Lens-Pipeline erwartet.
 *
 * DirectExtractor liefert: { clauses: [{number, title, text}], documentType, language, metadata }
 * V1-Shape erwartet:       { success, clauses: [{id, sectionTitle, text, number, title, position, matchingData, textHash, riskLevel, riskScore, riskKeywords}], totalClauses, sections, riskSummary, metadata }
 *
 * @version 4.0.0
 */

const { DirectExtractor } = require('./directExtractor');
const clauseParser = require('./clauseParser');

// Lazy init — erst beim ersten Aufruf, nicht bei require()
let _extractor = null;
function getExtractor() {
  if (!_extractor) _extractor = new DirectExtractor();
  return _extractor;
}

/**
 * Parsed einen Vertragstext mit dem Direct Extraction Parser (V4)
 * und normalisiert das Ergebnis auf V1-Shape.
 *
 * @param {string} text - Der rohe Vertragstext
 * @param {object} [options]
 * @param {boolean} [options.detectRisk=true]
 * @returns {Promise<{success, clauses, totalClauses, sections, riskSummary, metadata}>}
 */
async function parseContractDirect(text, options = {}) {
  const { detectRisk = true } = options;
  const startedAt = Date.now();

  console.log(`[DirectAdapter] Start — ${text.length} chars`);

  const result = await getExtractor().extract(text);

  if (!result.clauses || result.clauses.length === 0) {
    console.log(`[DirectAdapter] Keine Klauseln erkannt`);
    return {
      success: true,
      clauses: [],
      totalClauses: 0,
      sections: [],
      riskSummary: { high: 0, medium: 0, low: 0 },
      metadata: {
        originalLength: text.length,
        cleanedLength: text.length,
        parsedAt: new Date().toISOString(),
        parserVersion: '4.0.0-direct-extraction',
        extraction: result.metadata,
        noClausesReason: 'Dokument enthält keine erkennbaren Vertragsklauseln'
      }
    };
  }

  // ── V4 → V1-Shape Mapping ──────────────────────────
  const adaptedClauses = result.clauses.map((c, idx) => {
    const clauseText = (c.text || '').trim();

    // Position: approximiert aus Textposition (kein charOffset nötig)
    const textIndex = text.indexOf(clauseText.substring(0, 80));
    const startOffset = textIndex >= 0 ? textIndex : 0;
    const endOffset = startOffset + clauseText.length;

    const sectionTitle = c.title || c.number || `Abschnitt ${idx + 1}`;

    const clause = {
      id: `clause_v4_${idx + 1}`,
      sectionTitle,
      text: clauseText,
      number: c.number || null,
      title: c.title || null,

      position: {
        start: startOffset,
        end: endOffset,
        paragraph: idx + 1,
        sentence: 0,
        globalStart: startOffset,
        globalEnd: endOffset,
        estimatedPage: text.length > 0
          ? Math.floor(startOffset / Math.max(text.length / Math.max(1, Math.ceil(text.length / 3000)), 1)) + 1
          : 1,
        anchorText: clauseText.substring(0, 80).trim()
      },

      matchingData: {
        firstWords: clauseParser.extractSignificantWords(clauseText, 'first', 5),
        lastWords: clauseParser.extractSignificantWords(clauseText, 'last', 5),
        charLength: clauseText.length
      },

      textHash: clauseParser.generateHash(clauseText)
    };

    if (detectRisk) {
      const riskAssessment = clauseParser.assessClauseRisk(clauseText);
      clause.riskLevel = riskAssessment.level;
      clause.riskScore = riskAssessment.score;
      clause.riskKeywords = riskAssessment.keywords;
    }

    return clause;
  });

  const riskSummary = clauseParser.calculateRiskSummary(adaptedClauses);

  const sections = adaptedClauses.map(cl => ({
    title: cl.sectionTitle,
    clauseCount: 1
  }));

  const elapsedMs = Date.now() - startedAt;
  console.log(`[DirectAdapter] Fertig in ${elapsedMs}ms — ${adaptedClauses.length} Klauseln`);

  return {
    success: true,
    clauses: adaptedClauses,
    totalClauses: adaptedClauses.length,
    sections,
    riskSummary,
    metadata: {
      originalLength: text.length,
      cleanedLength: text.length,
      parsedAt: new Date().toISOString(),
      parserVersion: '4.0.0-direct-extraction',
      documentType: result.documentType,
      language: result.language,
      extraction: result.metadata,
      adapterElapsedMs: elapsedMs
    }
  };
}

module.exports = {
  parseContractDirect
};
