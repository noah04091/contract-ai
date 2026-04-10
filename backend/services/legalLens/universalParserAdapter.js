/**
 * Legal Lens - Universal Parser Adapter
 *
 * Orchestriert die 5-Pass Self-Correcting Pipeline und mappt das
 * Ergebnis auf die V1-Shape, die Frontend und nachgelagerte Services
 * erwarten (kompatibel mit clauseParser.parseContract()).
 *
 * Pipeline:
 *   Pass 1: Boundary Detection    -> Wo beginnt/endet der Vertragsinhalt?
 *   Pass 2: Structure Analysis    -> Wie ist der zugeschnittene Text gegliedert?
 *   Pass 3: Guided Segmentation   -> Finde ALLE Klauseln (ohne Ziel-Anzahl)
 *   Pass 4: Validation            -> Automatische Qualitaetspruefung (kein GPT)
 *   Pass 5: Self-Correction       -> Gezielte Nachbesserung (nur wenn noetig)
 *
 * Kosten: 3 GPT Calls (ohne Korrektur), 4-5 mit Korrektur
 *
 * @version 1.0.0
 */

const { boundaryDetector } = require('./boundaryDetector');
const { structureAnalyzer } = require('./structureAnalyzer');
const { guidedSegmenter } = require('./guidedSegmenter');
const { validate } = require('./segmentationValidator');
const { segmentationCorrector } = require('./segmentationCorrector');
const clauseParser = require('./clauseParser');

/**
 * Parsed einen Vertragstext mit der neuen 5-Pass-Pipeline.
 *
 * @param {string} text - Der rohe Vertragstext
 * @param {object} [options]
 * @param {boolean} [options.detectRisk=true] - Risiko-Bewertung pro Klausel
 * @param {number} [options.timeoutMs=90000] - Timeout pro GPT-Call
 * @returns {Promise<object>} V1-Shape: { success, clauses, totalClauses, sections, riskSummary, metadata }
 */
async function parseContractUniversal(text, options = {}) {
  const { detectRisk = true, timeoutMs = 90000 } = options;
  const startedAt = Date.now();

  if (!text || typeof text !== 'string' || text.trim().length < 100) {
    return _emptyResult(text, 'Text zu kurz oder leer');
  }

  // ── Pass 1: Boundary Detection ─────────────────────
  console.log(`[UniversalParser] Pass 1: Boundary Detection (${text.length} chars)`);
  const boundaryResult = await boundaryDetector.detect(text, { timeoutMs });
  const { croppedText, startOffset, frameInfo } = boundaryResult;
  console.log(
    `   Pass 1 done: ${croppedText.length} chars ` +
    `(${(boundaryResult.metadata.coverageRatio * 100).toFixed(1)}% des Originals)` +
    `${boundaryResult.metadata.fallback ? ' [FALLBACK]' : ''}`
  );

  // ── Pass 2: Structure Analysis ─────────────────────
  console.log(`[UniversalParser] Pass 2: Structure Analysis`);
  const structureResult = await structureAnalyzer.analyze(croppedText, { timeoutMs });
  const structure = structureResult.structure;
  console.log(
    `   Pass 2 done: type=${structure.documentType}, scheme=${structure.scheme}, ` +
    `${structure.exampleMarkers.length} Beispiel-Marker`
  );

  // Merge frameInfo: repeatingPageHeaders aus Pass 1 + Pass 2
  const allFrameLines = [
    ...(frameInfo.repeatingPageHeaders || []),
    ...(structure.repeatingPageHeaders || [])
  ].filter((v, i, a) => a.indexOf(v) === i); // Deduplizieren

  const mergedStructure = {
    ...structure,
    repeatingPageHeaders: allFrameLines
  };

  // ── Pass 3: Guided Segmentation ────────────────────
  console.log(`[UniversalParser] Pass 3: Guided Segmentation`);
  const segResult = await guidedSegmenter.segmentUniversal(croppedText, { structure: mergedStructure }, {
    startOffset,
    rawTextLength: text.length,
    timeoutMs
  });
  console.log(
    `   Pass 3 done: ${segResult.clauses.length} Klauseln, ` +
    `${segResult.metadata.markersVerified} Marker verifiziert, ` +
    `Coverage ${(segResult.metadata.coverage * 100).toFixed(1)}%`
  );

  if (segResult.clauses.length === 0) {
    return _emptyResult(text, 'Keine Klauseln erkannt', {
      boundaryResult, structureResult, segResult
    });
  }

  // ── Pass 4: Validation ────────────────────────────
  console.log(`[UniversalParser] Pass 4: Validation`);
  const validationResult = validate(segResult.clauses, croppedText);
  console.log(
    `   Pass 4 done: qualityScore=${validationResult.qualityScore}, ` +
    `needsCorrection=${validationResult.needsCorrection}` +
    `${validationResult.issues.length > 0 ? ` — ${validationResult.issues.join(', ')}` : ''}`
  );

  // ── Pass 5: Self-Correction (nur wenn noetig) ─────
  let finalClauses = segResult.clauses;
  let correctionResult = null;

  if (validationResult.needsCorrection) {
    console.log(`[UniversalParser] Pass 5: Self-Correction`);
    try {
      correctionResult = await segmentationCorrector.correct(
        segResult.clauses, croppedText, validationResult,
        { startOffset, frameLines: allFrameLines, timeoutMs }
      );
      finalClauses = correctionResult.clauses;
      console.log(
        `   Pass 5 done: ${correctionResult.corrections.length} Korrekturen, ` +
        `${finalClauses.length} Klauseln (vorher: ${segResult.clauses.length})`
      );

      // Re-validate nach Korrektur
      const revalidation = validate(finalClauses, croppedText);
      console.log(
        `   Re-Validation: qualityScore=${revalidation.qualityScore} ` +
        `(vorher: ${validationResult.qualityScore})`
      );
    } catch (err) {
      console.error(`[UniversalParser] Pass 5 fehlgeschlagen:`, err.message);
      // Weiter mit unkorrgierten Klauseln
    }
  } else {
    console.log(`[UniversalParser] Pass 5: Uebersprungen (qualityScore=${validationResult.qualityScore})`);
  }

  // ── Adapter: V2 -> V1-Shape ────────────────────────
  const adaptedClauses = finalClauses.map((c, idx) => {
    const clauseStartOffset = typeof c.startOffset === 'number' && c.startOffset >= 0 ? c.startOffset : 0;
    const endOffset = clauseStartOffset + (c.charLength || (c.text || '').length);
    const sectionTitle = c.title || c.number || `Abschnitt ${idx + 1}`;

    const clause = {
      id: c.id || `clause_v2_${idx + 1}`,
      sectionTitle,
      text: c.text || '',
      number: c.number || null,
      title: c.title || null,
      startMarker: c.startMarker || null,
      startMarkerFound: !!c.startMarkerFound,
      position: {
        start: clauseStartOffset,
        end: endOffset,
        paragraph: idx + 1,
        sentence: 0,
        globalStart: clauseStartOffset,
        globalEnd: endOffset,
        estimatedPage: text.length > 0
          ? Math.floor(clauseStartOffset / Math.max(text.length / Math.max(1, Math.ceil(text.length / 3000)), 1)) + 1
          : 1,
        anchorText: (c.text || '').substring(0, 80).trim()
      },
      matchingData: {
        firstWords: clauseParser.extractSignificantWords(c.text || '', 'first', 5),
        lastWords: clauseParser.extractSignificantWords(c.text || '', 'last', 5),
        charLength: (c.text || '').length
      },
      textHash: clauseParser.generateHash(c.text || '')
    };

    if (detectRisk) {
      const riskAssessment = clauseParser.assessClauseRisk(clause.text);
      clause.riskLevel = riskAssessment.level;
      clause.riskScore = riskAssessment.score;
      clause.riskKeywords = riskAssessment.keywords;
    }

    return clause;
  });

  const riskSummary = clauseParser.calculateRiskSummary(adaptedClauses);
  const sections = adaptedClauses.map(cl => ({ title: cl.sectionTitle, clauseCount: 1 }));

  const elapsedMs = Date.now() - startedAt;
  console.log(`[UniversalParser] Fertig in ${elapsedMs}ms (${adaptedClauses.length} Klauseln)`);

  return {
    success: true,
    clauses: adaptedClauses,
    totalClauses: adaptedClauses.length,
    sections,
    riskSummary,
    metadata: {
      originalLength: text.length,
      cleanedLength: croppedText.length,
      parsedAt: new Date().toISOString(),
      parserVersion: '3.0.0-universal-parser',
      pipeline: {
        boundary: {
          croppedLength: croppedText.length,
          coverageRatio: boundaryResult.metadata.coverageRatio,
          fallback: boundaryResult.metadata.fallback,
          elapsedMs: boundaryResult.metadata.elapsedMs
        },
        structure: {
          documentType: structure.documentType,
          scheme: structure.scheme,
          language: structure.language,
          exampleMarkers: structure.exampleMarkers.length,
          hasNestedStructure: structure.hasNestedStructure,
          elapsedMs: structureResult.metadata.elapsedMs
        },
        segmentation: {
          actualSegmentCount: segResult.metadata.actualSegmentCount,
          markersVerified: segResult.metadata.markersVerified,
          coverage: segResult.metadata.coverage,
          batchCount: segResult.metadata.batchCount || 1,
          elapsedMs: segResult.metadata.elapsedMs
        },
        validation: {
          qualityScore: validationResult.qualityScore,
          needsCorrection: validationResult.needsCorrection,
          issues: validationResult.issues,
          checks: validationResult.checks
        },
        correction: correctionResult ? {
          corrections: correctionResult.corrections,
          clausesBefore: correctionResult.metadata.clausesBefore,
          clausesAfter: correctionResult.metadata.clausesAfter,
          elapsedMs: correctionResult.metadata.elapsedMs
        } : null
      },
      // Kompatibilitaet mit bestehendem Format
      discovery: {
        documentType: structure.documentType,
        scheme: structure.scheme,
        confidence: null, // Nicht mehr in der neuen Pipeline
        expectedSegmentCount: null  // Absichtlich entfernt
      },
      segmentation: {
        actualSegmentCount: adaptedClauses.length,
        markersVerified: segResult.metadata.markersVerified,
        elapsedMs: segResult.metadata.elapsedMs,
        cropped: startOffset > 0
      },
      adapterElapsedMs: elapsedMs
    }
  };
}

function _emptyResult(text, reason, pipelineData = {}) {
  return {
    success: true,
    clauses: [],
    totalClauses: 0,
    sections: [],
    riskSummary: { high: 0, medium: 0, low: 0 },
    metadata: {
      originalLength: (text || '').length,
      cleanedLength: (text || '').length,
      parsedAt: new Date().toISOString(),
      parserVersion: '3.0.0-universal-parser',
      noClausesReason: reason,
      pipeline: pipelineData
    }
  };
}

module.exports = {
  parseContractUniversal
};
