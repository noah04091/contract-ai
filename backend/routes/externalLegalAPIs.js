// 📁 backend/routes/externalLegalAPIs.js
// Legal Pulse 2.0 Phase 3 - External Legal APIs Routes

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { getInstance: getExternalAPIs } = require('../services/externalLegalAPIs');

/**
 * GET /api/external-legal/search
 * Search across all external legal sources
 */
router.get('/search', verifyToken, async (req, res) => {
  try {
    const { query, area, sources, limit = 30 } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Query parameter is required'
      });
    }

    // Parse sources filter (comma-separated string from frontend)
    const sourcesFilter = sources ? sources.split(',').map(s => s.trim()).filter(Boolean) : null;

    const externalAPIs = getExternalAPIs();
    const results = await externalAPIs.searchAllSources({
      query,
      area,
      sources: sourcesFilter,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('[EXTERNAL-LEGAL-API] Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Suche in externen Quellen',
      error: error.message
    });
  }
});

/**
 * GET /api/external-legal/recent-changes
 * Get recent legal changes from all sources
 */
router.get('/recent-changes', verifyToken, async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const externalAPIs = getExternalAPIs();
    const changes = await externalAPIs.getRecentChanges(parseInt(days));

    res.json({
      success: true,
      ...changes
    });

  } catch (error) {
    console.error('[EXTERNAL-LEGAL-API] Recent changes error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Änderungen',
      error: error.message
    });
  }
});

/**
 * POST /api/external-legal/sync
 * Sync external changes to local database
 */
router.post('/sync', verifyToken, async (req, res) => {
  try {
    const { days = 7 } = req.body;

    const externalAPIs = getExternalAPIs();
    const syncResult = await externalAPIs.syncToLocalDatabase(parseInt(days));

    res.json({
      success: true,
      ...syncResult
    });

  } catch (error) {
    console.error('[EXTERNAL-LEGAL-API] Sync error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Synchronisierung',
      error: error.message
    });
  }
});

/**
 * POST /api/external-legal/contract-relevant
 * Get relevant external laws for contract
 */
router.post('/contract-relevant', verifyToken, async (req, res) => {
  try {
    const { contractText, area } = req.body;

    if (!contractText) {
      return res.status(400).json({
        success: false,
        message: 'Contract text is required'
      });
    }

    const externalAPIs = getExternalAPIs();
    const relevantLaws = await externalAPIs.getRelevantLawsForContract(
      contractText,
      area
    );

    res.json({
      success: true,
      count: relevantLaws.length,
      laws: relevantLaws
    });

  } catch (error) {
    console.error('[EXTERNAL-LEGAL-API] Relevant laws error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Analyse',
      error: error.message
    });
  }
});

/**
 * GET /api/external-legal/health
 * Check health of all external APIs
 */
router.get('/health', verifyToken, async (req, res) => {
  try {
    const externalAPIs = getExternalAPIs();
    const health = await externalAPIs.checkAllAPIsHealth();

    res.json({
      success: true,
      ...health
    });

  } catch (error) {
    console.error('[EXTERNAL-LEGAL-API] Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Gesundheitscheck',
      error: error.message
    });
  }
});

/**
 * GET /api/external-legal/stats
 * Get statistics about external sources
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const externalAPIs = getExternalAPIs();
    const stats = await externalAPIs.getStatistics();

    res.json({
      success: true,
      ...stats
    });

  } catch (error) {
    console.error('[EXTERNAL-LEGAL-API] Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei Statistik-Abruf',
      error: error.message
    });
  }
});

/**
 * GET /api/external-legal/eu-lex/document/:celex
 * Get specific EU-Lex document by CELEX number
 */
router.get('/eu-lex/document/:celex', verifyToken, async (req, res) => {
  try {
    const { celex } = req.params;
    const externalAPIs = getExternalAPIs();

    const document = await externalAPIs.euLex.fetchDocumentByCelex(celex);

    res.json({
      success: true,
      document
    });

  } catch (error) {
    console.error('[EXTERNAL-LEGAL-API] EU-Lex document error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des EU-Dokuments',
      error: error.message
    });
  }
});

/**
 * GET /api/external-legal/bundesanzeiger/company/:company
 * Get Bundesanzeiger company publications
 */
router.get('/bundesanzeiger/company/:company', verifyToken, async (req, res) => {
  try {
    const { company } = req.params;
    const externalAPIs = getExternalAPIs();

    const publications = await externalAPIs.bundesanzeiger.getCompanyPublications(company);

    res.json({
      success: true,
      company,
      count: publications.length,
      publications
    });

  } catch (error) {
    console.error('[EXTERNAL-LEGAL-API] Bundesanzeiger company error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Unternehmensveröffentlichungen',
      error: error.message
    });
  }
});

/**
 * GET /api/external-legal/govdata/dataset/:id
 * Get specific GovData dataset
 */
router.get('/govdata/dataset/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const externalAPIs = getExternalAPIs();

    const dataset = await externalAPIs.govData.getDataset(id);

    res.json({
      success: true,
      dataset
    });

  } catch (error) {
    console.error('[EXTERNAL-LEGAL-API] GovData dataset error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Datensatzes',
      error: error.message
    });
  }
});

module.exports = router;
