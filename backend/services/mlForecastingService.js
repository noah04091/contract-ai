// 📁 backend/services/mlForecastingService.js
// Legal Pulse 2.0 Phase 3 - ML-based Forecasting with TensorFlow.js

const tf = require('@tensorflow/tfjs-node');
const { MongoClient, ObjectId } = require('mongodb');

class MLForecastingService {
  constructor() {
    this.model = null;
    this.isModelTrained = false;
    this.modelPath = './models/risk_forecast_model';
    this.minTrainingData = 50; // Minimum contracts needed for training

    console.log('[ML-FORECASTING] Service initialized');
  }

  /**
   * Train risk prediction model
   * @returns {Promise<Object>} - Training results
   */
  async trainModel() {
    console.log('[ML-FORECASTING] 🚀 Starting model training...');

    try {
      // 1. Collect training data
      const trainingData = await this.collectTrainingData();

      if (trainingData.length < this.minTrainingData) {
        console.warn(`[ML-FORECASTING] Insufficient data: ${trainingData.length}/${this.minTrainingData}`);
        return {
          success: false,
          message: `Need at least ${this.minTrainingData} contracts for training`,
          currentCount: trainingData.length
        };
      }

      console.log(`[ML-FORECASTING] Collected ${trainingData.length} training samples`);

      // 2. Prepare data
      const { features, labels } = this.prepareTrainingData(trainingData);

      console.log('[ML-FORECASTING] Data prepared, creating model...');

      // 3. Create model
      this.model = this.createModel();

      // 4. Train model
      const history = await this.model.fit(features, labels, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`[ML-FORECASTING] Epoch ${epoch}: loss = ${logs.loss.toFixed(4)}, val_loss = ${logs.val_loss.toFixed(4)}`);
            }
          }
        }
      });

      // 5. Save model
      await this.model.save(`file://${this.modelPath}`);

      this.isModelTrained = true;

      const finalLoss = history.history.loss[history.history.loss.length - 1];
      const finalValLoss = history.history.val_loss[history.history.val_loss.length - 1];

      console.log('[ML-FORECASTING] ✅ Model training complete');

      // Cleanup tensors
      features.dispose();
      labels.dispose();

      return {
        success: true,
        trainingSamples: trainingData.length,
        epochs: 50,
        finalLoss: finalLoss.toFixed(4),
        finalValLoss: finalValLoss.toFixed(4),
        timestamp: new Date()
      };

    } catch (error) {
      console.error('[ML-FORECASTING] Training error:', error);
      throw error;
    }
  }

  /**
   * Create neural network model
   * @returns {tf.Sequential} - TensorFlow model
   */
  createModel() {
    const model = tf.sequential();

    // Input layer + hidden layers
    model.add(tf.layers.dense({
      units: 64,
      activation: 'relu',
      inputShape: [10] // 10 features
    }));

    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(tf.layers.dense({
      units: 32,
      activation: 'relu'
    }));

    model.add(tf.layers.dropout({ rate: 0.2 }));

    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu'
    }));

    // Output layer (risk score prediction)
    model.add(tf.layers.dense({
      units: 1,
      activation: 'sigmoid' // Outputs 0-1, we'll scale to 0-100
    }));

    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    });

    console.log('[ML-FORECASTING] Model architecture created');

    return model;
  }

  /**
   * Collect training data from contracts
   * @returns {Promise<Array>} - Training data
   */
  async collectTrainingData() {
    const client = new MongoClient(process.env.MONGO_URI);
    await client.connect();

    const contracts = await client.db('contract_ai')
      .collection('contracts')
      .find({
        'legalPulse.riskScore': { $exists: true },
        'legalPulse.analysisHistory': { $exists: true, $not: { $size: 0 } }
      })
      .limit(1000)
      .toArray();

    await client.close();

    return contracts;
  }

  /**
   * Prepare training data (features and labels)
   * @param {Array} contracts - Contracts
   * @returns {Object} - {features, labels} tensors
   */
  prepareTrainingData(contracts) {
    const featuresArray = [];
    const labelsArray = [];

    for (const contract of contracts) {
      const features = this.extractFeatures(contract);
      const label = (contract.legalPulse?.riskScore || 50) / 100; // Normalize to 0-1

      featuresArray.push(features);
      labelsArray.push([label]);
    }

    const featuresTensor = tf.tensor2d(featuresArray);
    const labelsTensor = tf.tensor2d(labelsArray);

    return { features: featuresTensor, labels: labelsTensor };
  }

  /**
   * Extract features from contract for ML
   * @param {Object} contract - Contract object
   * @returns {Array} - Feature vector
   */
  extractFeatures(contract) {
    const uploadDate = new Date(contract.uploadedAt || contract.createdAt || Date.now());
    const ageInDays = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24);

    const analysisHistory = contract.legalPulse?.analysisHistory || [];
    const lastAnalysis = analysisHistory[analysisHistory.length - 1];
    const lawInsights = contract.legalPulse?.lawInsights || [];

    return [
      // Feature 1: Contract age (normalized)
      Math.min(1.0, ageInDays / 365),

      // Feature 2: Current risk score (normalized)
      (contract.legalPulse?.riskScore || 50) / 100,

      // Feature 3: Current health score (normalized)
      (contract.legalPulse?.healthScore || 70) / 100,

      // Feature 4: Number of law insights
      Math.min(1.0, lawInsights.length / 10),

      // Feature 5: Number of analysis runs
      Math.min(1.0, analysisHistory.length / 5),

      // Feature 6: Recent law changes (last 90 days)
      Math.min(1.0, this.countRecentLawChanges(analysisHistory) / 5),

      // Feature 7: Risk trend (increasing/decreasing)
      this.calculateRiskTrend(analysisHistory),

      // Feature 8: Page count (normalized)
      Math.min(1.0, (contract.pageCount || 5) / 50),

      // Feature 9: Contract type diversity (areas covered)
      Math.min(1.0, new Set(lawInsights.map(i => i.area)).size / 5),

      // Feature 10: Last trigger type (0=init, 0.5=periodic, 1=law_change)
      this.encodeTriggerType(lastAnalysis?.triggeredBy)
    ];
  }

  /**
   * Count recent law changes in analysis history
   * @param {Array} history - Analysis history
   * @returns {number} - Count
   */
  countRecentLawChanges(history) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);

    return history.filter(h => {
      return h.triggeredBy === 'law_change' &&
             new Date(h.date) >= cutoff;
    }).length;
  }

  /**
   * Calculate risk trend from history
   * @param {Array} history - Analysis history
   * @returns {number} - Trend value (-1 to 1)
   */
  calculateRiskTrend(history) {
    if (history.length < 2) return 0;

    const recent = history.slice(-3);
    const first = recent[0].riskScore;
    const last = recent[recent.length - 1].riskScore;

    const trend = (last - first) / 100; // Normalized change
    return Math.max(-1, Math.min(1, trend));
  }

  /**
   * Encode trigger type to numeric value
   * @param {string} triggerType - Trigger type
   * @returns {number} - Encoded value
   */
  encodeTriggerType(triggerType) {
    const mapping = {
      'init': 0,
      'manual': 0.33,
      'periodic_scan': 0.66,
      'law_change': 1.0
    };
    return mapping[triggerType] || 0;
  }

  /**
   * Predict risk score for contract
   * @param {Object} contract - Contract object
   * @param {number} monthsAhead - Months to predict ahead
   * @returns {Promise<Array>} - Predictions
   */
  async predictRisk(contract, monthsAhead = 6) {
    console.log(`[ML-FORECASTING] Predicting ${monthsAhead} months for contract`);

    try {
      // Load model if not loaded
      if (!this.model || !this.isModelTrained) {
        await this.loadModel();
      }

      if (!this.model) {
        console.warn('[ML-FORECASTING] No trained model available, using heuristic fallback');
        return this.heuristicFallback(contract, monthsAhead);
      }

      const predictions = [];

      for (let month = 1; month <= monthsAhead; month++) {
        // Extract features and simulate aging
        const features = this.extractFeatures(contract);

        // Adjust age feature for future prediction
        const originalAge = features[0];
        const futureAge = Math.min(1.0, originalAge + (month / 12));
        features[0] = futureAge;

        // Make prediction
        const featureTensor = tf.tensor2d([features]);
        const prediction = this.model.predict(featureTensor);
        const riskScore = (await prediction.data())[0] * 100; // Scale back to 0-100

        predictions.push({
          month,
          date: this.getMonthFromNow(month),
          predictedRisk: Math.round(Math.max(0, Math.min(100, riskScore))),
          predictedHealth: Math.round(100 - (riskScore * 0.6)),
          confidence: this.calculateConfidence(month),
          method: 'ml'
        });

        // Cleanup
        featureTensor.dispose();
        prediction.dispose();
      }

      console.log(`[ML-FORECASTING] Generated ${predictions.length} ML predictions`);

      return predictions;

    } catch (error) {
      console.error('[ML-FORECASTING] Prediction error:', error);
      // Fallback to heuristic
      return this.heuristicFallback(contract, monthsAhead);
    }
  }

  /**
   * Load saved model
   * @returns {Promise<void>}
   */
  async loadModel() {
    try {
      console.log('[ML-FORECASTING] Loading saved model...');
      this.model = await tf.loadLayersModel(`file://${this.modelPath}/model.json`);
      this.isModelTrained = true;
      console.log('[ML-FORECASTING] ✅ Model loaded successfully');
    } catch (error) {
      console.warn('[ML-FORECASTING] Could not load model:', error.message);
      this.model = null;
      this.isModelTrained = false;
    }
  }

  /**
   * Heuristic fallback when ML model not available
   * @param {Object} contract - Contract object
   * @param {number} months - Months ahead
   * @returns {Array} - Predictions
   */
  heuristicFallback(contract, months) {
    console.log('[ML-FORECASTING] Using heuristic fallback');

    const currentRisk = contract.legalPulse?.riskScore || 50;
    const predictions = [];

    for (let month = 1; month <= months; month++) {
      // Simple linear increase
      const predictedRisk = Math.min(100, currentRisk + (month * 1.5));

      predictions.push({
        month,
        date: this.getMonthFromNow(month),
        predictedRisk: Math.round(predictedRisk),
        predictedHealth: Math.round(100 - (predictedRisk * 0.6)),
        confidence: this.calculateConfidence(month),
        method: 'heuristic'
      });
    }

    return predictions;
  }

  /**
   * Calculate prediction confidence
   * @param {number} month - Month offset
   * @returns {number} - Confidence (0-1)
   */
  calculateConfidence(month) {
    // Confidence decreases over time
    return Math.max(0.4, 1 - (month * 0.08));
  }

  /**
   * Get date N months from now
   * @param {number} months - Months offset
   * @returns {string} - ISO date string
   */
  getMonthFromNow(months) {
    const date = new Date();
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split('T')[0];
  }

  /**
   * Get model status
   * @returns {Object} - Status
   */
  getStatus() {
    return {
      modelTrained: this.isModelTrained,
      modelPath: this.modelPath,
      minTrainingData: this.minTrainingData,
      timestamp: new Date()
    };
  }

  /**
   * Cleanup resources
   */
  dispose() {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.isModelTrained = false;
      console.log('[ML-FORECASTING] Model disposed');
    }
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new MLForecastingService();
    }
    return instance;
  },
  MLForecastingService
};
