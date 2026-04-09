/**
 * Guided Segmenter Adapter
 *
 * Führt die neue 3-Pass-Parser-Pipeline (structuralDiscovery → guidedSegmenter)
 * aus und normalisiert das Ergebnis auf die Form, die die restliche Legal-Lens-
 * Pipeline erwartet (kompatibel mit clauseParser.parseContract()).
 *
 * Hintergrund: Der neue Parser gibt pro Klausel { id, index, number, title,
 * text, startMarker, startMarkerFound, startOffset, charLength } zurück. Der
 * alte Parser liefert zusätzlich { sectionTitle, position, riskLevel,
 * riskScore, riskKeywords, matchingData, textHash }. Dieser Adapter schließt
 * die Lücke, damit Batch-Voranalyse, Progress-Tracking, Caching und Frontend
 * unverändert weiterlaufen.
 *
 * Risiko-Bewertung: Der neue Parser macht bewusst KEINE Risiko-Einschätzung
 * (das ist in Pass 3 der Pipeline verortet). Für Kompatibilität mit dem
 * bestehenden Frontend-Flow rufen wir hier weiterhin clauseParser.assessClauseRisk
 * pro Klausel auf — identisch zu dem, was parseContract() macht.
 */

const { structuralDiscovery } = require('./structuralDiscovery');
const { guidedSegmenter } = require('./guidedSegmenter');
const clauseParser = require('./clauseParser');

/**
 * Parsed einen Vertragstext mit dem neuen 3-Pass-Parser und normalisiert das
 * Ergebnis auf das Format, das clauseParser.parseContract() liefert.
 *
 * @param {string} text - Der rohe Vertragstext
 * @param {object} options
 * @param {boolean} [options.detectRisk=true] - Risiko-Bewertung pro Klausel anhängen
 * @returns {Promise<{success, clauses, totalClauses, sections, riskSummary, metadata}>}
 */
async function parseContractWithGuidedSegmenter(text, options = {}) {
  const { detectRisk = true } = options;
  const startedAt = Date.now();

  // ── Pass 1: Structural Discovery ─────────────────────
  console.log(`🔬 [GuidedSegmenter] Pass 1: Discovery (${text.length} chars)`);
  const discoveryResult = await structuralDiscovery.discover(text);
  const discovery = discoveryResult.discovery;
  console.log(`   ✓ documentType=${discovery.documentType}, scheme=${discovery.segmentation?.scheme}, expected=${discovery.segmentation?.estimatedSegmentCount}`);

  // ── Pass 2: Guided Segmentation ─────────────────────
  console.log(`🔬 [GuidedSegmenter] Pass 2: Segmentation`);
  const segmentationResult = await guidedSegmenter.segment(text, discoveryResult);
  const { clauses: rawClauses, metadata: segMeta } = segmentationResult;
  console.log(`   ✓ ${segMeta.actualSegmentCount} Klauseln, ${segMeta.markersVerified} Marker verifiziert`);

  // Kein Inhalt erkannt → success: true aber 0 Klauseln (Rechnungen, Formulare)
  if (rawClauses.length === 0) {
    console.log(`⚠️ [GuidedSegmenter] Keine Klauseln erkannt — Dokument ist vermutlich kein Vertrag`);
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
        parserVersion: '2.0.0-guided-segmenter',
        discovery: {
          documentType: discovery.documentType,
          scheme: discovery.segmentation?.scheme,
          confidence: discovery.overallConfidence,
          expectedSegmentCount: discovery.segmentation?.estimatedSegmentCount
        },
        segmentation: segMeta,
        noClausesReason: 'Dokument enthält keine erkennbaren Vertragsklauseln'
      }
    };
  }

  // ── Adapter: V2 → V1-Shape ─────────────────────
  const adaptedClauses = rawClauses.map((c, idx) => {
    const startOffset = typeof c.startOffset === 'number' && c.startOffset >= 0 ? c.startOffset : 0;
    const endOffset = startOffset + (c.charLength || (c.text || '').length);

    // Sectionless → Titel als sectionTitle nehmen (oder Nummer als Fallback)
    const sectionTitle = c.title || c.number || `Abschnitt ${idx + 1}`;

    const clause = {
      id: c.id || `clause_v2_${idx + 1}`,
      sectionTitle,
      text: c.text || '',
      number: c.number || null,
      title: c.title || null,

      // V2-spezifisch: für Debugging/Diagnose behalten
      startMarker: c.startMarker || null,
      startMarkerFound: !!c.startMarkerFound,

      // Position — aus Offset + Länge rekonstruiert
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
        anchorText: (c.text || '').substring(0, 80).trim()
      },

      // Matching-Daten — dieselbe Logik wie parseContract()
      matchingData: {
        firstWords: clauseParser.extractSignificantWords(c.text || '', 'first', 5),
        lastWords: clauseParser.extractSignificantWords(c.text || '', 'last', 5),
        charLength: (c.text || '').length
      },

      // Hash für Caching
      textHash: clauseParser.generateHash(c.text || '')
    };

    // Risiko-Bewertung anhängen (gleiche Logik wie parseContract)
    if (detectRisk) {
      const riskAssessment = clauseParser.assessClauseRisk(clause.text);
      clause.riskLevel = riskAssessment.level;
      clause.riskScore = riskAssessment.score;
      clause.riskKeywords = riskAssessment.keywords;
    }

    return clause;
  });

  // Risiko-Zusammenfassung — dieselbe Berechnung wie parseContract
  const riskSummary = clauseParser.calculateRiskSummary(adaptedClauses);

  // Sections aus Discovery ableiten, falls verfügbar, sonst leere Liste
  const sections = adaptedClauses.map(cl => ({
    title: cl.sectionTitle,
    clauseCount: 1
  }));

  const elapsedMs = Date.now() - startedAt;
  console.log(`✅ [GuidedSegmenter] Adapter fertig in ${elapsedMs}ms (${adaptedClauses.length} Klauseln)`);

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
      parserVersion: '2.0.0-guided-segmenter',
      discovery: {
        documentType: discovery.documentType,
        scheme: discovery.segmentation?.scheme,
        confidence: discovery.overallConfidence,
        expectedSegmentCount: discovery.segmentation?.estimatedSegmentCount
      },
      segmentation: {
        actualSegmentCount: segMeta.actualSegmentCount,
        markersVerified: segMeta.markersVerified,
        elapsedMs: segMeta.elapsedMs,
        cropped: segMeta.cropped
      },
      adapterElapsedMs: elapsedMs
    }
  };
}

module.exports = {
  parseContractWithGuidedSegmenter
};
