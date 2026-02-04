// 📁 backend/services/legalPulseTrigger.js
// Legal Pulse 2.0 - Impact Evaluation & Alert Generation

const { MongoClient, ObjectId } = require("mongodb");

// Graceful imports
let getLawEmbeddings = null;
let getNotificationService = null;

try {
  getLawEmbeddings = require("./lawEmbeddings").getInstance;
} catch (error) {
  console.warn('[LEGAL-PULSE:TRIGGER] lawEmbeddings nicht verfügbar:', error.message);
}

try {
  getNotificationService = require("./pulseNotificationService").getInstance;
} catch (error) {
  console.warn('[LEGAL-PULSE:TRIGGER] pulseNotificationService nicht verfügbar:', error.message);
}

class LegalPulseTrigger {
  constructor() {
    this.similarityThreshold = 0.75; // Minimum similarity for impact
    this.highImpactThreshold = 0.85; // High impact threshold
    this.riskIncreaseBase = 10; // Base risk score increase
    this.maxRiskIncrease = 25; // Maximum risk increase per change

    // Phase 2: Notification Service (graceful)
    this.notificationService = null;
    this.createNotifications = false;

    try {
      if (getNotificationService) {
        this.notificationService = getNotificationService();
        this.createNotifications = true;
      }
    } catch (error) {
      console.warn('[LEGAL-PULSE:TRIGGER] Notification Service nicht verfügbar:', error.message);
    }

    console.log(`[LEGAL-PULSE:TRIGGER] Initialized (Notifications: ${this.createNotifications ? 'enabled' : 'disabled'})`);
  }

  /**
   * Evaluate impact of law changes on a specific contract
   * @param {Object} contract - Contract object
   * @param {Array} changedSections - Array of changed law sections
   * @returns {Promise<Object>} - Impact evaluation result
   */
  async evaluateImpactForContract(contract, changedSections) {
    console.log(`[LEGAL-PULSE:TRIGGER] Evaluating impact for contract: ${contract.name || contract._id}`);

    try {
      const lawEmbeddings = getLawEmbeddings();
      const impactedChanges = [];
      let maxRelevance = 0;

      // Extract contract text for comparison
      const contractText = this.extractContractText(contract);

      if (!contractText || contractText.length < 50) {
        console.log('[LEGAL-PULSE:TRIGGER] Insufficient contract text for evaluation');
        return {
          hasImpact: false,
          alerts: [],
          updates: {}
        };
      }

      // Generate embedding for contract text
      const contractEmbedding = await lawEmbeddings.generateEmbedding(contractText);

      // Check each changed section for relevance
      for (const change of changedSections) {
        if (!change.embedding || change.embedding.length === 0) {
          continue;
        }

        const similarity = lawEmbeddings.cosineSimilarity(contractEmbedding, change.embedding);

        if (similarity >= this.similarityThreshold) {
          impactedChanges.push({
            ...change,
            relevance: similarity
          });

          maxRelevance = Math.max(maxRelevance, similarity);

          console.log(`[LEGAL-PULSE:TRIGGER] ✓ Impact detected: ${change.lawId} ${change.sectionId} (relevance: ${similarity.toFixed(3)})`);
        }
      }

      // No impact detected
      if (impactedChanges.length === 0) {
        console.log('[LEGAL-PULSE:TRIGGER] No significant impact detected');
        return {
          hasImpact: false,
          alerts: [],
          updates: {}
        };
      }

      // Calculate updated scores
      const currentRiskScore = contract.legalPulse?.riskScore || 50;
      const currentHealthScore = contract.legalPulse?.healthScore || 100;

      const riskIncrease = this.calculateRiskIncrease(impactedChanges, maxRelevance);
      const newRiskScore = Math.min(100, Math.max(0, currentRiskScore + riskIncrease));
      const newHealthScore = this.calculateHealthScore(newRiskScore, contract);

      // Generate alerts
      const alerts = this.generateAlerts(contract, impactedChanges, maxRelevance);

      // Prepare database updates
      const updates = {
        'legalPulse.riskScore': newRiskScore,
        'legalPulse.healthScore': newHealthScore,
        'legalPulse.lastChecked': new Date(),
        $push: {
          'legalPulse.analysisHistory': {
            date: new Date(),
            riskScore: newRiskScore,
            healthScore: newHealthScore,
            changes: impactedChanges.map(c => `Detected: ${c.lawId} ${c.sectionId} Update`),
            triggeredBy: 'law_change'
          },
          'legalPulse.lawInsights': {
            $each: impactedChanges.map(c => ({
              law: c.lawId,
              sectionId: c.sectionId,
              sourceUrl: c.sourceUrl,
              relevance: c.relevance,
              lastUpdate: c.updatedAt,
              area: c.area
            })),
            $slice: -20 // Keep only last 20 insights
          }
        }
      };

      console.log(`[LEGAL-PULSE:TRIGGER] Impact summary: ${impactedChanges.length} changes, risk: ${currentRiskScore} → ${newRiskScore}, health: ${currentHealthScore} → ${newHealthScore}`);

      // Phase 2: Create notifications automatically
      if (this.createNotifications && contract.userId) {
        await this.createNotificationsForAlerts(alerts, contract);
      }

      return {
        hasImpact: true,
        impactedChanges,
        alerts,
        updates,
        metrics: {
          oldRiskScore: currentRiskScore,
          newRiskScore,
          oldHealthScore: currentHealthScore,
          newHealthScore,
          riskIncrease,
          maxRelevance
        }
      };

    } catch (error) {
      console.error('[LEGAL-PULSE:TRIGGER] Error evaluating impact:', error);
      throw error;
    }
  }

  /**
   * Extract text from contract for analysis
   * @param {Object} contract - Contract object
   * @returns {string} - Extracted text
   */
  extractContractText(contract) {
    const parts = [
      contract.name || '',
      contract.title || '',
      contract.extractedText || '',
      contract.fullText || '',
      contract.content || '',
      contract.laufzeit || '',
      contract.kuendigung || ''
    ].filter(Boolean);

    return parts.join(' ').substring(0, 8000);
  }

  /**
   * Calculate risk score increase based on impacted changes
   * @param {Array} impactedChanges - Array of impacted changes
   * @param {number} maxRelevance - Maximum relevance score
   * @returns {number} - Risk increase amount
   */
  calculateRiskIncrease(impactedChanges, maxRelevance) {
    // Base increase scaled by relevance
    const relevanceMultiplier = maxRelevance;
    const countMultiplier = Math.min(2, 1 + (impactedChanges.length - 1) * 0.2);

    const increase = this.riskIncreaseBase * relevanceMultiplier * countMultiplier;

    return Math.min(this.maxRiskIncrease, Math.round(increase));
  }

  /**
   * Calculate health score based on risk and contract age
   * @param {number} riskScore - Current risk score
   * @param {Object} contract - Contract object
   * @returns {number} - Health score (0-100)
   */
  calculateHealthScore(riskScore, contract) {
    // Base health = inverse of risk
    let health = 100 - (riskScore * 0.5);

    // Age penalty
    const agePenalty = this.calculateAgePenalty(contract);
    health -= agePenalty;

    // Change density penalty (from analysis history)
    const changeDensityPenalty = this.calculateChangeDensityPenalty(contract);
    health -= changeDensityPenalty;

    return Math.min(100, Math.max(0, Math.round(health)));
  }

  /**
   * Calculate age penalty for health score
   * @param {Object} contract - Contract object
   * @returns {number} - Penalty amount
   */
  calculateAgePenalty(contract) {
    const uploadDate = contract.uploadedAt || contract.createdAt || new Date();
    const ageInDays = (new Date() - new Date(uploadDate)) / (1000 * 60 * 60 * 24);
    const ageInYears = ageInDays / 365;

    // Older contracts get a small penalty (max 10 points for 5+ year old contracts)
    return Math.min(10, ageInYears * 2);
  }

  /**
   * Calculate change density penalty for health score
   * @param {Object} contract - Contract object
   * @returns {number} - Penalty amount
   */
  calculateChangeDensityPenalty(contract) {
    const history = contract.legalPulse?.analysisHistory || [];

    if (history.length < 2) return 0;

    // Count law_change triggers in last 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentChanges = history.filter(h =>
      h.triggeredBy === 'law_change' &&
      new Date(h.date) >= ninetyDaysAgo
    );

    // Penalty: 2 points per change (max 10)
    return Math.min(10, recentChanges.length * 2);
  }

  /**
   * Generate alerts for impacted changes
   * @param {Object} contract - Contract object
   * @param {Array} impactedChanges - Array of impacted changes
   * @param {number} maxRelevance - Maximum relevance score
   * @returns {Array} - Array of alert objects
   */
  generateAlerts(contract, impactedChanges, maxRelevance) {
    const alerts = [];

    // Determine severity based on relevance
    const severity = maxRelevance >= this.highImpactThreshold ? 'high' :
                     maxRelevance >= this.similarityThreshold ? 'medium' : 'low';

    // Group changes by area
    const byArea = impactedChanges.reduce((acc, change) => {
      if (!acc[change.area]) {
        acc[change.area] = [];
      }
      acc[change.area].push(change);
      return acc;
    }, {});

    // Create alerts per area
    Object.entries(byArea).forEach(([area, changes]) => {
      const topChange = changes.sort((a, b) => b.relevance - a.relevance)[0];

      alerts.push({
        contractId: contract._id,
        type: 'law_change',
        severity,
        title: `${area} Update: ${topChange.lawId}`,
        description: `${changes.length} relevante Änderung(en) in ${area} erkannt. Betroffene Klauseln sollten geprüft werden.`,
        details: {
          lawId: topChange.lawId,
          sectionId: topChange.sectionId,
          area: area,
          relevance: topChange.relevance,
          changeCount: changes.length,
          affectedSections: changes.map(c => `${c.lawId} ${c.sectionId}`)
        },
        actionUrl: `/contracts/${contract._id}?tab=optimizer`,
        sourceUrl: topChange.sourceUrl,
        createdAt: new Date()
      });
    });

    return alerts;
  }

  /**
   * Batch evaluation for multiple contracts
   * @param {Array} contracts - Array of contracts
   * @param {Array} changedSections - Array of changed law sections
   * @returns {Promise<Array>} - Array of evaluation results
   */
  async evaluateBatch(contracts, changedSections) {
    console.log(`[LEGAL-PULSE:TRIGGER] Batch evaluation: ${contracts.length} contracts, ${changedSections.length} law changes`);

    const results = [];

    for (const contract of contracts) {
      try {
        const result = await this.evaluateImpactForContract(contract, changedSections);

        if (result.hasImpact) {
          results.push({
            contractId: contract._id,
            contractName: contract.name,
            ...result
          });
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`[LEGAL-PULSE:TRIGGER] Error evaluating contract ${contract._id}:`, error);
        // Continue with next contract
      }
    }

    console.log(`[LEGAL-PULSE:TRIGGER] Batch complete: ${results.length}/${contracts.length} contracts impacted`);

    return results;
  }

  /**
   * Create notifications for generated alerts (Phase 2)
   * @param {Array} alerts - Array of alert objects
   * @param {Object} contract - Contract object
   * @returns {Promise<Array>} - Created notifications
   */
  async createNotificationsForAlerts(alerts, contract) {
    const notifications = [];

    for (const alert of alerts) {
      try {
        const notification = await this.notificationService.createNotification({
          userId: contract.userId,
          contractId: contract._id,
          type: alert.type || 'law_change',
          severity: alert.severity || 'medium',
          title: alert.title,
          description: alert.description,
          actionUrl: alert.actionUrl,
          actionType: this.determineActionType(alert),
          sourceUrl: alert.sourceUrl,
          lawReference: alert.details ? {
            lawId: alert.details.lawId,
            sectionId: alert.details.sectionId,
            area: alert.details.area
          } : null,
          details: alert.details || {},
          expiresInDays: 30 // Auto-expire after 30 days
        });

        notifications.push(notification);
        console.log(`[LEGAL-PULSE:TRIGGER] ✓ Created notification: ${notification._id}`);

        // Auto-deliver notification (Phase 2)
        await this.deliverNotification(notification, contract);

      } catch (error) {
        console.error(`[LEGAL-PULSE:TRIGGER] ✗ Error creating notification:`, error);
        // Continue with next alert
      }
    }

    return notifications;
  }

  /**
   * Deliver notification to user (Phase 2)
   * @param {Object} notification - Notification object
   * @param {Object} contract - Contract object
   * @returns {Promise<void>}
   */
  async deliverNotification(notification, contract) {
    try {
      // Get User (need email for delivery)
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();

      const user = await client.db('contract_ai')
        .collection('users')
        .findOne({ _id: contract.userId });

      await client.close();

      if (!user) {
        console.log(`[LEGAL-PULSE:TRIGGER] User not found for notification ${notification._id}`);
        return;
      }

      // Deliver via all channels (SSE broadcast removed)
      await this.notificationService.deliverNotification(
        notification,
        user
      );

      console.log(`[LEGAL-PULSE:TRIGGER] ✓ Notification delivered: ${notification._id}`);

    } catch (error) {
      console.error(`[LEGAL-PULSE:TRIGGER] ✗ Error delivering notification:`, error);
      // Don't throw - notification is already created
    }
  }

  /**
   * Determine action type from alert
   * @param {Object} alert - Alert object
   * @returns {string} - Action type
   */
  determineActionType(alert) {
    // Auto-determine based on severity and type
    if (alert.severity === 'high' || alert.severity === 'critical') {
      return 'optimize'; // High severity → optimize contract
    }

    if (alert.type === 'deadline') {
      return 'review';
    }

    if (alert.type === 'law_change') {
      return 'optimize';
    }

    return 'review'; // Default
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new LegalPulseTrigger();
    }
    return instance;
  },
  LegalPulseTrigger
};
