// 📁 backend/services/lawFingerprinting.js
// Content-Based Fingerprinting for Law Deduplication

const crypto = require('crypto');

class LawFingerprinting {
  /**
   * Generate a content-based fingerprint for a law change
   * Uses normalized title + date to detect duplicates across different sources
   *
   * @param {Object} lawChange - The law change object
   * @returns {string} - SHA256 hash fingerprint
   */
  generateFingerprint(lawChange) {
    // Normalize title (lowercase, remove special chars, extra spaces)
    const normalizedTitle = this.normalizeText(lawChange.title);

    // Use publication date if available (many sources publish same law on same day)
    const dateKey = lawChange.updatedAt
      ? new Date(lawChange.updatedAt).toISOString().split('T')[0] // YYYY-MM-DD
      : 'no-date';

    // Combine normalized title + date for fingerprint
    const fingerprintInput = `${normalizedTitle}|${dateKey}`;

    // Generate SHA256 hash
    return crypto
      .createHash('sha256')
      .update(fingerprintInput, 'utf8')
      .digest('hex')
      .substring(0, 16); // Use first 16 chars for shorter fingerprint
  }

  /**
   * Normalize text for comparison (remove noise)
   * @param {string} text
   * @returns {string} - Normalized text
   */
  normalizeText(text) {
    if (!text) return '';

    return text
      .toLowerCase()
      .trim()
      // Remove common prefixes that vary between sources
      .replace(/^(neu:|neu |änderung:|änderung )/gi, '')
      // Remove special characters and punctuation
      .replace(/[^\w\säöüß]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Check if two law changes are likely duplicates using fuzzy matching
   * This is a secondary check beyond fingerprinting
   *
   * @param {Object} law1
   * @param {Object} law2
   * @returns {boolean} - True if likely duplicates
   */
  areLikelyDuplicates(law1, law2) {
    // Normalize both titles
    const title1 = this.normalizeText(law1.title);
    const title2 = this.normalizeText(law2.title);

    // Check if titles are very similar (Levenshtein distance)
    const similarity = this.calculateSimilarity(title1, title2);

    // Check if published on same day
    const date1 = law1.updatedAt ? new Date(law1.updatedAt).toDateString() : null;
    const date2 = law2.updatedAt ? new Date(law2.updatedAt).toDateString() : null;
    const sameDay = date1 && date2 && date1 === date2;

    // Consider duplicates if:
    // - Titles are >80% similar AND same day
    // - OR titles are >95% similar (regardless of date)
    return (similarity > 0.8 && sameDay) || similarity > 0.95;
  }

  /**
   * Calculate string similarity using simple ratio (Jaccard-like)
   * @param {string} str1
   * @param {string} str2
   * @returns {number} - Similarity score 0-1
   */
  calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    if (str1 === str2) return 1;

    // Simple word-based similarity
    const words1 = new Set(str1.split(' '));
    const words2 = new Set(str2.split(' '));

    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);

    return intersection.size / union.size;
  }

  /**
   * Merge metadata from duplicate law entries
   * When we find a duplicate, we want to keep track of ALL sources
   *
   * @param {Object} existingLaw - Law already in DB
   * @param {Object} newLaw - New law entry (duplicate)
   * @returns {Object} - Merged law with combined metadata
   */
  mergeDuplicates(existingLaw, newLaw) {
    // Keep the earliest createdAt
    const createdAt = existingLaw.createdAt && newLaw.createdAt
      ? (existingLaw.createdAt < newLaw.createdAt ? existingLaw.createdAt : newLaw.createdAt)
      : existingLaw.createdAt || newLaw.createdAt;

    // Keep the latest updatedAt
    const updatedAt = existingLaw.updatedAt && newLaw.updatedAt
      ? (existingLaw.updatedAt > newLaw.updatedAt ? existingLaw.updatedAt : newLaw.updatedAt)
      : existingLaw.updatedAt || newLaw.updatedAt;

    // Combine sources (track all RSS feeds that reported this law)
    const sources = new Set();
    if (existingLaw.metadata?.sources) {
      existingLaw.metadata.sources.forEach(s => sources.add(s));
    }
    if (existingLaw.feedId) sources.add(existingLaw.feedId);
    if (newLaw.feedId) sources.add(newLaw.feedId);

    // Combine URLs (multiple articles about same law)
    const urls = new Set();
    if (existingLaw.url) urls.add(existingLaw.url);
    if (newLaw.url) urls.add(newLaw.url);

    // Use longer description (more informative)
    const description = existingLaw.description && newLaw.description
      ? (existingLaw.description.length > newLaw.description.length
          ? existingLaw.description
          : newLaw.description)
      : existingLaw.description || newLaw.description;

    return {
      ...existingLaw,
      description,
      createdAt,
      updatedAt,
      metadata: {
        ...existingLaw.metadata,
        sources: Array.from(sources),
        urls: Array.from(urls),
        mergeCount: (existingLaw.metadata?.mergeCount || 0) + 1,
        lastMergedAt: new Date()
      }
    };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new LawFingerprinting();
    }
    return instance;
  },
  LawFingerprinting
};
