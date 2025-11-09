// 📁 backend/services/lawChangeDetector.js
// Legal Pulse 2.0 - Law Change Detection Service

const Law = require("../models/Law");

class LawChangeDetector {
  constructor() {
    this.checkIntervalDays = 7; // Default check interval
    console.log('[LEGAL-PULSE:CHANGE-DETECTOR] Initialized');
  }

  /**
   * Detect law changes within a specified time period
   * @param {number} daysBack - Number of days to look back (default: 7)
   * @returns {Promise<Array>} - Array of changed law sections
   */
  async detectLawChanges(daysBack = null) {
    const days = daysBack || this.checkIntervalDays;
    console.log(`[LEGAL-PULSE:CHANGE-DETECTOR] Detecting law changes (${days} days back)...`);

    try {
      // Calculate cutoff date
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      // Find recently updated laws
      const changes = await Law.find({
        updatedAt: { $gte: cutoffDate }
      })
        .sort({ updatedAt: -1 })
        .lean();

      console.log(`[LEGAL-PULSE:CHANGE-DETECTOR] Found ${changes.length} law changes`);

      // Transform to standardized change format
      const standardizedChanges = changes.map(law => ({
        lawId: law.lawId,
        sectionId: law.sectionId,
        title: law.title,
        text: law.text,
        area: law.area,
        sourceUrl: law.sourceUrl,
        updatedAt: law.updatedAt,
        embedding: law.embedding,
        changeType: this.determineChangeType(law)
      }));

      // Group by area for better logging
      const byArea = this.groupByArea(standardizedChanges);
      console.log('[LEGAL-PULSE:CHANGE-DETECTOR] Changes by area:');
      Object.entries(byArea).forEach(([area, count]) => {
        console.log(`  - ${area}: ${count} changes`);
      });

      return standardizedChanges;

    } catch (error) {
      console.error('[LEGAL-PULSE:CHANGE-DETECTOR] Error detecting changes:', error);
      throw error;
    }
  }

  /**
   * Detect changes for specific legal area
   * @param {string} area - Legal area (e.g., "DSGVO", "BGB")
   * @param {number} daysBack - Number of days to look back
   * @returns {Promise<Array>} - Array of changes in that area
   */
  async detectChangesByArea(area, daysBack = 7) {
    console.log(`[LEGAL-PULSE:CHANGE-DETECTOR] Detecting changes for area: ${area}`);

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    try {
      const changes = await Law.find({
        area: area,
        updatedAt: { $gte: cutoffDate }
      })
        .sort({ updatedAt: -1 })
        .lean();

      console.log(`[LEGAL-PULSE:CHANGE-DETECTOR] Found ${changes.length} changes in ${area}`);

      return changes.map(law => ({
        lawId: law.lawId,
        sectionId: law.sectionId,
        title: law.title,
        text: law.text,
        area: law.area,
        sourceUrl: law.sourceUrl,
        updatedAt: law.updatedAt,
        embedding: law.embedding,
        changeType: this.determineChangeType(law)
      }));

    } catch (error) {
      console.error(`[LEGAL-PULSE:CHANGE-DETECTOR] Error detecting changes for ${area}:`, error);
      throw error;
    }
  }

  /**
   * Get change statistics
   * @param {number} daysBack - Number of days to analyze
   * @returns {Promise<Object>} - Statistics object
   */
  async getChangeStats(daysBack = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);

    try {
      const stats = await Law.aggregate([
        {
          $match: {
            updatedAt: { $gte: cutoffDate }
          }
        },
        {
          $group: {
            _id: '$area',
            count: { $sum: 1 },
            latest: { $max: '$updatedAt' }
          }
        },
        {
          $sort: { count: -1 }
        }
      ]);

      const total = stats.reduce((sum, s) => sum + s.count, 0);

      return {
        total,
        period: `${daysBack} days`,
        byArea: stats,
        mostActive: stats[0] || null
      };

    } catch (error) {
      console.error('[LEGAL-PULSE:CHANGE-DETECTOR] Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Determine change type based on metadata (placeholder)
   * @param {Object} law - Law object
   * @returns {string} - Change type
   */
  determineChangeType(law) {
    // Placeholder logic - can be enhanced with versioning
    const daysSinceCreation = (new Date() - new Date(law.createdAt)) / (1000 * 60 * 60 * 24);

    if (daysSinceCreation < 7) {
      return 'new';
    } else {
      return 'updated';
    }
  }

  /**
   * Group changes by area
   * @param {Array} changes - Array of law changes
   * @returns {Object} - Grouped by area
   */
  groupByArea(changes) {
    return changes.reduce((acc, change) => {
      acc[change.area] = (acc[change.area] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Check if a specific law section has been updated
   * @param {string} lawId - Law ID
   * @param {string} sectionId - Section ID
   * @param {Date} since - Check since this date
   * @returns {Promise<boolean>} - True if updated
   */
  async hasBeenUpdated(lawId, sectionId, since) {
    const law = await Law.findOne({
      lawId,
      sectionId,
      updatedAt: { $gte: since }
    });

    return !!law;
  }

  /**
   * Get latest change for a specific law
   * @param {string} lawId - Law ID
   * @returns {Promise<Object|null>} - Latest change or null
   */
  async getLatestChange(lawId) {
    return await Law.findOne({ lawId })
      .sort({ updatedAt: -1 })
      .lean();
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new LawChangeDetector();
    }
    return instance;
  },
  LawChangeDetector
};
