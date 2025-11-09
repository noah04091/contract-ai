// 📁 backend/services/autoTriggerService.js
// Legal Pulse 2.0 Phase 2 - Auto-Trigger bei Law Changes

const { MongoClient } = require("mongodb");
const { getInstance: getLawChangeDetector } = require("./lawChangeDetector");
const { getInstance: getLegalPulseTrigger } = require("./legalPulseTrigger");

class AutoTriggerService {
  constructor() {
    this.isRunning = false;
    this.lastRun = null;
    this.intervalDays = 7; // Check every 7 days

    console.log('[AUTO-TRIGGER] Service initialized');
  }

  /**
   * Run automatic trigger check for all users
   * @returns {Promise<Object>} - Trigger results
   */
  async runAutoTrigger() {
    if (this.isRunning) {
      console.log('[AUTO-TRIGGER] Already running, skipping...');
      return { skipped: true };
    }

    this.isRunning = true;
    console.log('[AUTO-TRIGGER] 🚀 Starting automatic trigger check...');

    try {
      // 1. Detect law changes
      const detector = getLawChangeDetector();
      const changes = await detector.detectLawChanges(this.intervalDays);

      console.log(`[AUTO-TRIGGER] Found ${changes.length} law changes`);

      if (changes.length === 0) {
        this.lastRun = new Date();
        this.isRunning = false;
        return {
          success: true,
          lawChanges: 0,
          impactedContracts: 0,
          notificationsCreated: 0
        };
      }

      // 2. Get all active contracts
      const client = new MongoClient(process.env.MONGO_URI);
      await client.connect();

      const contracts = await client.db('contract_ai')
        .collection('contracts')
        .find({
          // Only active contracts
          $or: [
            { status: { $ne: 'Abgelaufen' } },
            { status: { $exists: false } }
          ]
        })
        .toArray();

      await client.close();

      console.log(`[AUTO-TRIGGER] Checking ${contracts.length} contracts`);

      // 3. Evaluate impact for each contract
      const trigger = getLegalPulseTrigger();
      const results = await trigger.evaluateBatch(contracts, changes);

      // 4. Update contracts in database
      let updatedContracts = 0;
      let notificationsCreated = 0;

      for (const result of results) {
        if (result.hasImpact && result.updates) {
          const client2 = new MongoClient(process.env.MONGO_URI);
          await client2.connect();

          await client2.db('contract_ai')
            .collection('contracts')
            .updateOne(
              { _id: result.contractId },
              result.updates
            );

          await client2.close();

          updatedContracts++;
          notificationsCreated += (result.alerts?.length || 0);
        }
      }

      this.lastRun = new Date();
      this.isRunning = false;

      const summary = {
        success: true,
        timestamp: this.lastRun,
        lawChanges: changes.length,
        contractsChecked: contracts.length,
        impactedContracts: results.length,
        updatedContracts,
        notificationsCreated
      };

      console.log('[AUTO-TRIGGER] ✅ Completed:', summary);

      return summary;

    } catch (error) {
      this.isRunning = false;
      console.error('[AUTO-TRIGGER] ❌ Error:', error);
      throw error;
    }
  }

  /**
   * Schedule auto-trigger (call this from cron)
   * @returns {Promise<void>}
   */
  async schedule() {
    console.log(`[AUTO-TRIGGER] Scheduling next run in ${this.intervalDays} days`);

    // In production, use a proper cron scheduler
    // For now, this is just a placeholder
    setInterval(async () => {
      await this.runAutoTrigger();
    }, this.intervalDays * 24 * 60 * 60 * 1000);
  }

  /**
   * Get status
   * @returns {Object} - Status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastRun: this.lastRun,
      intervalDays: this.intervalDays
    };
  }
}

// Singleton
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new AutoTriggerService();
    }
    return instance;
  },
  AutoTriggerService
};
