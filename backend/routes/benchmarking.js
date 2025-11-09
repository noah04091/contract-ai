// 📁 backend/routes/benchmarking.js
// Legal Pulse 2.0 Phase 3 - Market Benchmarking API Routes

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { getInstance: getBenchmarkingService } = require('../services/marketBenchmarking');

/**
 * GET /api/benchmarking/compare/:contractId
 * Compare contract with market benchmarks
 */
router.get('/compare/:contractId', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;

    const service = getBenchmarkingService();
    const comparison = await service.compareWithMarket(contractId);

    res.json({
      success: true,
      ...comparison
    });

  } catch (error) {
    console.error('[BENCHMARKING-API] Comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Marktvergleich',
      error: error.message
    });
  }
});

/**
 * GET /api/benchmarking/industry-trends/:industry
 * Get industry trends
 */
router.get('/industry-trends/:industry', verifyToken, async (req, res) => {
  try {
    const { industry } = req.params;
    const { months = 12 } = req.query;

    const service = getBenchmarkingService();
    const trends = await service.getIndustryTrends(industry, parseInt(months));

    res.json({
      success: true,
      ...trends
    });

  } catch (error) {
    console.error('[BENCHMARKING-API] Trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Trends',
      error: error.message
    });
  }
});

/**
 * GET /api/benchmarking/clause-popularity/:contractType
 * Get clause popularity rankings
 */
router.get('/clause-popularity/:contractType', verifyToken, async (req, res) => {
  try {
    const { contractType } = req.params;

    const service = getBenchmarkingService();
    const popularity = await service.getClausePopularity(contractType);

    res.json({
      success: true,
      contractType,
      clauses: popularity
    });

  } catch (error) {
    console.error('[BENCHMARKING-API] Clause popularity error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Klausel-Popularität',
      error: error.message
    });
  }
});

/**
 * GET /api/benchmarking/market-overview
 * Get overall market overview
 */
router.get('/market-overview', verifyToken, async (req, res) => {
  try {
    const service = getBenchmarkingService();
    const overview = await service.getMarketOverview();

    res.json({
      success: true,
      ...overview
    });

  } catch (error) {
    console.error('[BENCHMARKING-API] Overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Marktübersicht',
      error: error.message
    });
  }
});

/**
 * POST /api/benchmarking/opt-in/:contractId
 * Opt contract into benchmarking
 */
router.post('/opt-in/:contractId', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { analysis } = req.body;

    if (!analysis) {
      return res.status(400).json({
        success: false,
        message: 'Analysis data is required'
      });
    }

    const service = getBenchmarkingService();
    const result = await service.optInContract(contractId, analysis);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[BENCHMARKING-API] Opt-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Opt-In',
      error: error.message
    });
  }
});

module.exports = router;
