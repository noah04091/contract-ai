// 📁 backend/routes/legalReferences.js
//
// Lese-Endpoint für Slug-Map + Gesetzes-Titel. Single Source of Truth:
// Nutzt die existierende GesetzImInternetConnector-Singleton aus Legal-Pulse,
// damit Frontend und Backend immer in Sync sind.
//
// SICHERHEIT (Audit 13.05.2026, Phase 2 Update 15.05.2026):
// - READ-ONLY: kein DB-Zugriff, keine Schreibops, keine Mutationen
// - getInstance() wird genutzt — Singleton ist meist schon von Legal Pulse instanziiert
// - conceptMappings + lawInfo werden lt. Audit NIRGENDS mutiert (frozen-by-convention)
// - Response ist immutable (deep-clone) — verhindert dass Client Mutationen propagiert
// - Legal Pulse Core (jobs, services, models) NICHT betroffen
// - Phase 2: Supplemental-Datei wird gemergt für Frontend, Legal Pulse sieht sie NIE
//   (wird nur in dieser Route gelesen, nicht im GesetzImInternetConnector eingebunden)

const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/gesetzImInternetConnector');
const supplemental = require('../data/legalReferencesSupplemental');

/**
 * Merged die Supplemental-Map additiv mit der Singleton-Map.
 * Supplemental wins bei Konflikten (z.B. dsgvo-Eintrag fixt das falsche
 * Singleton-Mapping auf bdsg_2018).
 */
function buildMergedMaps() {
  const connector = getInstance();

  // Deep-Clone der Singleton-Maps — Mutation-Schutz für Legal Pulse.
  const baseConceptMap = JSON.parse(JSON.stringify(connector.conceptMappings || {}));
  const baseLawInfo = JSON.parse(JSON.stringify(connector.lawInfo || {}));

  // Supplemental drauflegen. Bei Concept-Mappings überschreibt Supplemental
  // bewusst (Korrekturen wie dsgvo). Bei lawInfo additiv per spread.
  const mergedConceptMap = { ...baseConceptMap, ...(supplemental.conceptMappings || {}) };
  const mergedLawInfo = { ...baseLawInfo, ...(supplemental.lawInfo || {}) };

  return { slugMap: mergedConceptMap, lawTitles: mergedLawInfo };
}

/**
 * GET /api/legal-references/slug-map
 *
 * Liefert die conceptMappings (Konzept → Slugs[]) und lawInfo (Slug → Titel/Bereich)
 * aus dem GesetzImInternetConnector-Singleton MERGED mit der Supplemental-Datei
 * (EU-Verordnungen, fehlende Spezialgesetze).
 *
 * Frontend nutzt diese Map um Paragraphen-Strings („§ 309 BGB", „Art. 28 DSGVO")
 * zu klickbaren Pillen zu rendern. Jeder Eintrag kann ein urlTemplate enthalten —
 * fehlt das, rendert Frontend Plain-Text (Anti-Halluzination).
 *
 * Cache: 24h public — entlastet Server, Map ändert sich nur bei Backend-Deploy.
 */
router.get('/slug-map', (req, res) => {
  try {
    const { slugMap, lawTitles } = buildMergedMaps();

    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h
    res.json({
      success: true,
      slugMap,
      lawTitles,
      version: '2026-05-15',
      source: 'gesetze-im-internet.de + supplemental (EU, Bau, Honorar)',
    });
  } catch (error) {
    // Fail-safe: leere Map liefern statt Crash. Frontend zeigt dann keine Pillen
    // (Anti-Halluzination), aber UI bricht nicht.
    console.error('[LegalReferences] /slug-map error:', error.message);
    res.json({
      success: false,
      slugMap: {},
      lawTitles: {},
      version: '2026-05-15',
      source: 'gesetze-im-internet.de + supplemental',
      error: 'Slug-Map temporär nicht verfügbar',
    });
  }
});

module.exports = router;
