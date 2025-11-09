// 📁 backend/routes/mlForecasting.js
// Legal Pulse 2.0 Phase 3 - ML Forecasting API Routes

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { getInstance: getMLForecast } = require('../services/mlForecastingService');

/**
 * POST /api/ml-forecast/train
 * Train the ML forecasting model
 */
router.post('/train', verifyToken, async (req, res) => {
  try {
    const mlForecast = getMLForecast();
    const result = await mlForecast.trainModel();

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('[ML-FORECAST-API] Training error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Trainieren des Modells',
      error: error.message
    });
  }
});

/**
 * POST /api/ml-forecast/predict/:contractId
 * Get ML prediction for contract
 */
router.post('/predict/:contractId', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { months = 6 } = req.body;

    const { MongoClient, ObjectId } = require('mongodb');
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const contract = await client.db('contract_ai')
      .collection('contracts')
      .findOne({ _id: new ObjectId(contractId) });

    await client.close();

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Contract not found'
      });
    }

    const mlForecast = getMLForecast();
    const predictions = await mlForecast.predictRisk(contract, parseInt(months));

    res.json({
      success: true,
      contractId,
      months: parseInt(months),
      predictions
    });

  } catch (error) {
    console.error('[ML-FORECAST-API] Prediction error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Vorhersage',
      error: error.message
    });
  }
});

/**
 * GET /api/ml-forecast/status
 * Get ML model status
 */
router.get('/status', verifyToken, async (req, res) => {
  try {
    const mlForecast = getMLForecast();
    const status = mlForecast.getStatus();

    res.json({
      success: true,
      ...status
    });

  } catch (error) {
    console.error('[ML-FORECAST-API] Status error:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen des Status',
      error: error.message
    });
  }
});

module.exports = router;
