// 📁 backend/services/courtDecisionEmbeddings.js
// RAG-System für Rechtsprechung (BGH/OLG-Urteile)

const { OpenAI } = require("openai");
const CourtDecision = require("../models/CourtDecision");

class CourtDecisionEmbeddingsService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Config
    this.embeddingModel = "text-embedding-3-small";
    this.vectorDimensions = 1536;

    console.log(`[COURT-RAG] Rechtsprechungs-RAG Service initialized`);
  }

  /**
   * Generate embeddings for text using OpenAI
   * @param {string} text - Text to embed
   * @returns {Promise<number[]>} - Embedding vector
   */
  async generateEmbedding(text) {
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text.substring(0, 8000) // Limit text length
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('[COURT-RAG] Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Upsert court decisions with embeddings
   * @param {Array} decisions - Array of court decisions
   * @returns {Promise<Object>} - Result statistics
   */
  async upsertDecisions(decisions) {
    console.log(`[COURT-RAG] Upserting ${decisions.length} court decisions...`);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const decision of decisions) {
      try {
        // Generate embedding if not provided
        if (!decision.embedding || decision.embedding.length === 0) {
          // Combine headnotes and summary for better embedding
          const embeddingText = [
            `${decision.court} ${decision.caseNumber}`,
            decision.headnotes.join(' '),
            decision.summary,
            decision.relevantLaws.join(', '),
            decision.keywords.join(', ')
          ].join('\n');

          decision.embedding = await this.generateEmbedding(embeddingText);

          // Rate limiting (simple delay)
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Upsert to database
        const result = await CourtDecision.findOneAndUpdate(
          { caseNumber: decision.caseNumber },
          {
            ...decision,
            updatedAt: new Date()
          },
          {
            upsert: true,
            new: true,
            setDefaultsOnInsert: true
          }
        );

        if (result.isNew) {
          inserted++;
        } else {
          updated++;
        }

        console.log(`[COURT-RAG] ✓ ${decision.court} ${decision.caseNumber}`);

      } catch (error) {
        errors++;
        console.error(`[COURT-RAG] ✗ Error upserting ${decision.caseNumber}:`, error.message);
      }
    }

    const stats = { inserted, updated, errors, total: decisions.length };
    console.log(`[COURT-RAG] Upsert complete:`, stats);

    return stats;
  }

  /**
   * Query relevant court decisions using semantic search
   * @param {Object} params - Query parameters
   * @param {string} params.text - Text to search for
   * @param {number} params.topK - Number of results to return
   * @param {string} params.legalArea - Filter by legal area (optional)
   * @param {string} params.court - Filter by court (optional)
   * @returns {Promise<Array>} - Relevant court decisions
   */
  async queryRelevantDecisions({ text, topK = 5, legalArea = null, court = null }) {
    console.log(`[COURT-RAG] Querying for: "${text.substring(0, 50)}..." (topK=${topK}, area=${legalArea}, court=${court})`);

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(text);

      // Build filter query
      const filter = {};
      if (legalArea) {
        filter.legalArea = legalArea;
      }
      if (court) {
        filter.court = court;
      }

      // Retrieve all candidates (with optional filters)
      const candidates = await CourtDecision.find(filter).lean();

      if (candidates.length === 0) {
        console.log('[COURT-RAG] No court decisions found in database');
        return [];
      }

      console.log(`[COURT-RAG] Found ${candidates.length} candidate decisions`);

      // Calculate cosine similarity for each candidate
      const scoredResults = candidates
        .filter(c => c.embedding && c.embedding.length > 0) // Only those with embeddings
        .map(candidate => {
          const similarity = this.cosineSimilarity(queryEmbedding, candidate.embedding);
          return {
            ...candidate,
            relevance: similarity
          };
        })
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, topK);

      if (scoredResults.length > 0) {
        console.log(`[COURT-RAG] Top result: ${scoredResults[0]?.court} ${scoredResults[0]?.caseNumber} (relevance: ${scoredResults[0]?.relevance?.toFixed(3)})`);
      }

      return scoredResults;

    } catch (error) {
      console.error('[COURT-RAG] Error querying decisions:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {number[]} vecA - First vector
   * @param {number[]} vecB - Second vector
   * @returns {number} - Similarity score (0-1)
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);

    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }

  /**
   * Find decisions by legal area
   * @param {string} legalArea - Legal area
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} - Court decisions
   */
  async findByLegalArea(legalArea, limit = 50) {
    return await CourtDecision.findByLegalArea(legalArea, limit);
  }

  /**
   * Find decisions by court
   * @param {string} court - Court name
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} - Court decisions
   */
  async findByCourt(court, limit = 50) {
    return await CourtDecision.findByCourt(court, limit);
  }

  /**
   * Get statistics about the court decisions database
   * @returns {Promise<Object>} - Statistics
   */
  async getStats() {
    const total = await CourtDecision.countDocuments();
    const byCourt = await CourtDecision.aggregate([
      {
        $group: {
          _id: '$court',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const byArea = await CourtDecision.aggregate([
      {
        $group: {
          _id: '$legalArea',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    return {
      total,
      byCourt,
      byArea
    };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new CourtDecisionEmbeddingsService();
    }
    return instance;
  },
  CourtDecisionEmbeddingsService
};
