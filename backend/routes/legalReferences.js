// 📁 backend/routes/legalReferences.js
//
// Lese-Endpoint für Slug-Map + Gesetzes-Titel. Single Source of Truth:
// Nutzt die existierende GesetzImInternetConnector-Singleton aus Legal-Pulse,
// damit Frontend und Backend immer in Sync sind.
//
// SICHERHEIT (Audit 13.05.2026):
// - READ-ONLY: kein DB-Zugriff, keine Schreibops, keine Mutationen
// - getInstance() wird genutzt — Singleton ist meist schon von Legal Pulse instanziiert
// - conceptMappings + lawInfo werden lt. Audit NIRGENDS mutiert (frozen-by-convention)
// - Response ist immutable (deep-clone) — verhindert dass Client Mutationen propagiert
// - Legal Pulse Core (jobs, services, models) NICHT betroffen

const express = require('express');
const router = express.Router();
const { getInstance } = require('../services/gesetzImInternetConnector');

/**
 * GET /api/legal-references/slug-map
 *
 * Liefert die conceptMappings (Konzept → Slugs[]) und lawInfo (Slug → Titel/Bereich)
 * aus dem GesetzImInternetConnector-Singleton.
 *
 * Frontend nutzt diese Map um Paragraphen-Strings („§ 309 BGB") zu klickbaren
 * Pillen mit Links zu gesetze-im-internet.de zu rendern.
 *
 * Cache: 24h public — entlastet Server, Map ändert sich nur bei Backend-Deploy.
 */
router.get('/slug-map', (req, res) => {
  try {
    const connector = getInstance();

    // Deep-Clone via JSON: verhindert dass irgendwer die Singleton-Maps mutiert.
    // Bei ~100 Einträgen + Strings ist das vernachlässigbar (< 1ms).
    const slugMap = JSON.parse(JSON.stringify(connector.conceptMappings || {}));
    const lawTitles = JSON.parse(JSON.stringify(connector.lawInfo || {}));

    res.setHeader('Cache-Control', 'public, max-age=86400'); // 24h
    res.json({
      success: true,
      slugMap,
      lawTitles,
      version: '2026-05-13',
      source: 'gesetze-im-internet.de',
    });
  } catch (error) {
    // Fail-safe: leere Map liefern statt Crash. Frontend zeigt dann keine Pillen
    // (Anti-Halluzination), aber UI bricht nicht.
    console.error('[LegalReferences] /slug-map error:', error.message);
    res.json({
      success: false,
      slugMap: {},
      lawTitles: {},
      version: '2026-05-13',
      source: 'gesetze-im-internet.de',
      error: 'Slug-Map temporär nicht verfügbar',
    });
  }
});

module.exports = router;
