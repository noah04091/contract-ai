/**
 * Direct Extraction Adapter (V4)
 *
 * Mappt den Output von DirectExtractor auf das V1-Shape-Format,
 * das die restliche Legal-Lens-Pipeline erwartet.
 *
 * DirectExtractor liefert: { clauses: [{number, title, text}], documentType, language, metadata }
 * V1-Shape erwartet:       { success, clauses: [{id, sectionTitle, text, number, title, position, matchingData, textHash, riskLevel, riskScore, riskKeywords, category}], totalClauses, sections, riskSummary, metadata }
 *
 * @version 4.2.0 — GPT-basiertes Risk-Assessment + Kategorisierung + Titel-Generierung + Anhang-Extraktion
 */

const { DirectExtractor } = require('./directExtractor');
const clauseParser = require('./clauseParser');
const { assessRiskBatch } = require('./riskAssessor');
const { extractAttachments } = require('./attachmentExtractor');

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
        parserVersion: '4.1.0-direct-extraction',
        extraction: result.metadata,
        noClausesReason: 'Dokument enthält keine erkennbaren Vertragsklauseln'
      }
    };
  }

  // ── GPT-basiertes Risk-Assessment + Kategorisierung (P1+P2+P4) ──
  let gptAssessment = null;
  if (detectRisk) {
    gptAssessment = await assessRiskBatch(result.clauses);
    if (gptAssessment) {
      console.log(`[DirectAdapter] GPT Risk-Assessment erfolgreich für ${gptAssessment.length} Klauseln`);
    } else {
      console.log(`[DirectAdapter] GPT Risk-Assessment fehlgeschlagen — Fallback auf Keywords`);
    }
  }

  // ── V4 → V1-Shape Mapping ──────────────────────────
  const adaptedClauses = result.clauses.map((c, idx) => {
    const clauseText = (c.text || '').trim();

    // Position: approximiert aus Textposition (kein charOffset nötig)
    const textIndex = text.indexOf(clauseText.substring(0, 80));
    const startOffset = textIndex >= 0 ? textIndex : 0;
    const endOffset = startOffset + clauseText.length;

    // Titel: GPT-generiert wenn kein Original vorhanden (P4)
    const gptResult = gptAssessment?.[idx];
    const effectiveTitle = c.title || gptResult?.suggestedTitle || null;

    const sectionTitle = effectiveTitle || c.number || `Abschnitt ${idx + 1}`;

    const clause = {
      id: `clause_v4_${idx + 1}`,
      sectionTitle,
      text: clauseText,
      number: c.number || null,
      title: effectiveTitle,

      // Kategorie: GPT-basiert (P2), Fallback auf null (Frontend-Regex greift)
      category: gptResult?.category || null,

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

    // Risk-Assessment: GPT-basiert (P1), Fallback auf Keyword-Matching
    if (detectRisk) {
      if (gptResult) {
        clause.riskLevel = gptResult.riskLevel;
        clause.riskScore = gptResult.riskScore;
        clause.riskReason = gptResult.riskReason;
        clause.riskKeywords = []; // GPT liefert riskReason statt Keywords
      } else {
        const riskAssessment = clauseParser.assessClauseRisk(clauseText);
        clause.riskLevel = riskAssessment.level;
        clause.riskScore = riskAssessment.score;
        clause.riskKeywords = riskAssessment.keywords;
      }
    }

    return clause;
  });

  // ── Anhang-Extraktion (additiv, nach Hauptklauseln) ──────────
  let attachmentCount = 0;
  try {
    const attachments = await extractAttachments(text, result.clauses);
    if (attachments && attachments.length > 0) {
      // Alle Anhang-Klauseln sammeln fuer Batch-Risk-Assessment
      const allAttachmentRawClauses = [];
      const attachmentMeta = []; // {attachIdx, clauseIdx, attachmentName}

      for (let aIdx = 0; aIdx < attachments.length; aIdx++) {
        const att = attachments[aIdx];
        for (let cIdx = 0; cIdx < att.clauses.length; cIdx++) {
          allAttachmentRawClauses.push(att.clauses[cIdx]);
          attachmentMeta.push({ attachIdx: aIdx, clauseIdx: cIdx, attachmentName: att.name });
        }
      }

      // GPT Risk-Assessment fuer Anhang-Klauseln (wenn detectRisk aktiv)
      let attachRiskAssessment = null;
      if (detectRisk && allAttachmentRawClauses.length > 0) {
        attachRiskAssessment = await assessRiskBatch(allAttachmentRawClauses);
        if (attachRiskAssessment) {
          console.log(`[DirectAdapter] Anhang-Risk-Assessment: ${attachRiskAssessment.filter(x => x).length}/${allAttachmentRawClauses.length} bewertet`);
        }
      }

      // Anhang-Klauseln auf V1-Shape mappen und an adaptedClauses anhaengen
      for (let i = 0; i < allAttachmentRawClauses.length; i++) {
        const c = allAttachmentRawClauses[i];
        const meta = attachmentMeta[i];
        const clauseText = (c.text || '').trim();
        if (clauseText.length < 20) continue;

        const mainClauseCount = adaptedClauses.length;
        const globalIdx = mainClauseCount; // wird mit push aktualisiert

        const textIndex = text.indexOf(clauseText.substring(0, 80));
        const startOffset = textIndex >= 0 ? textIndex : 0;
        const endOffset = startOffset + clauseText.length;

        const effectiveTitle = c.title || null;
        const sectionTitle = effectiveTitle || c.number || `Klausel ${i + 1}`;

        const attachClause = {
          id: `clause_v4_attach_${meta.attachIdx + 1}_${meta.clauseIdx + 1}`,
          sectionTitle,
          text: clauseText,
          number: c.number || null,
          title: effectiveTitle,
          category: null, // wird durch Risk-Assessment gesetzt
          attachment: meta.attachmentName, // NEU: Anhang-Zuordnung

          position: {
            start: startOffset,
            end: endOffset,
            paragraph: globalIdx + 1,
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

        // Risk-Assessment fuer Anhang-Klausel
        if (detectRisk) {
          const riskResult = attachRiskAssessment?.[i];
          if (riskResult) {
            attachClause.riskLevel = riskResult.riskLevel;
            attachClause.riskScore = riskResult.riskScore;
            attachClause.riskReason = riskResult.riskReason;
            attachClause.riskKeywords = [];
            if (riskResult.category) attachClause.category = riskResult.category;
          } else {
            const riskAssessment = clauseParser.assessClauseRisk(clauseText);
            attachClause.riskLevel = riskAssessment.level;
            attachClause.riskScore = riskAssessment.score;
            attachClause.riskKeywords = riskAssessment.keywords;
          }
        }

        adaptedClauses.push(attachClause);
        attachmentCount++;
      }

      console.log(`[DirectAdapter] ${attachmentCount} Anhang-Klauseln aus ${attachments.length} Anlagen hinzugefuegt`);
    }
  } catch (attachErr) {
    console.warn(`[DirectAdapter] Anhang-Extraktion fehlgeschlagen (nicht kritisch):`, attachErr.message);
    // Kein Abbruch — Hauptklauseln sind bereits extrahiert
  }

  const riskSummary = clauseParser.calculateRiskSummary(adaptedClauses);

  const sections = adaptedClauses.map(cl => ({
    title: cl.sectionTitle,
    clauseCount: 1
  }));

  const elapsedMs = Date.now() - startedAt;
  console.log(`[DirectAdapter] Fertig in ${elapsedMs}ms — ${adaptedClauses.length} Klauseln (${attachmentCount} aus Anhaengen)`);

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
      parserVersion: '4.1.0-direct-extraction',
      documentType: result.documentType,
      language: result.language,
      extraction: result.metadata,
      riskSource: gptAssessment ? 'gpt' : 'keywords',
      attachmentClauses: attachmentCount,
      adapterElapsedMs: elapsedMs
    }
  };
}

module.exports = {
  parseContractDirect
};
