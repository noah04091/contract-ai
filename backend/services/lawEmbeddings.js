// 📁 backend/services/lawEmbeddings.js
// Legal Pulse 2.0 - RAG-System für juristische Texte

const { OpenAI } = require("openai");
const Law = require("../models/Law");

class LawEmbeddingsService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Config
    this.embeddingModel = "text-embedding-3-small";
    this.vectorDimensions = 1536;
    this.ragProvider = process.env.RAG_PROVIDER || "mongodb"; // mongodb, chroma, pinecone

    console.log(`[LEGAL-PULSE:RAG] Initialized with provider: ${this.ragProvider}`);
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
      console.error('[LEGAL-PULSE:RAG] Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Upsert law sections with embeddings
   * @param {Array} sections - Array of law sections
   * @returns {Promise<Object>} - Result statistics
   */
  async upsertLawSections(sections) {
    console.log(`[LEGAL-PULSE:RAG] Upserting ${sections.length} law sections...`);

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const section of sections) {
      try {
        // Generate embedding if not provided
        if (!section.embedding || section.embedding.length === 0) {
          const embeddingText = `${section.title}\n${section.text}`;
          section.embedding = await this.generateEmbedding(embeddingText);

          // Rate limiting (simple delay)
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // Upsert to database
        const result = await Law.findOneAndUpdate(
          { lawId: section.lawId, sectionId: section.sectionId },
          {
            ...section,
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

        console.log(`[LEGAL-PULSE:RAG] ✓ ${section.lawId} ${section.sectionId}`);

      } catch (error) {
        errors++;
        console.error(`[LEGAL-PULSE:RAG] ✗ Error upserting ${section.lawId}:`, error.message);
      }
    }

    const stats = { inserted, updated, errors, total: sections.length };
    console.log(`[LEGAL-PULSE:RAG] Upsert complete:`, stats);

    return stats;
  }

  /**
   * Query relevant law sections using semantic search
   * @param {Object} params - Query parameters
   * @param {string} params.text - Text to search for
   * @param {number} params.topK - Number of results to return
   * @param {string} params.area - Filter by legal area (optional)
   * @returns {Promise<Array>} - Relevant law sections
   */
  async queryRelevantSections({ text, topK = 10, area = null }) {
    console.log(`[LEGAL-PULSE:RAG] Querying for: "${text.substring(0, 50)}..." (topK=${topK}, area=${area})`);

    try {
      // Generate query embedding
      const queryEmbedding = await this.generateEmbedding(text);

      // Build filter query
      const filter = {};
      if (area) {
        filter.area = area;
      }

      // Retrieve all candidates (with optional area filter)
      const candidates = await Law.find(filter).lean();

      if (candidates.length === 0) {
        console.log('[LEGAL-PULSE:RAG] No law sections found in database');
        return [];
      }

      console.log(`[LEGAL-PULSE:RAG] Found ${candidates.length} candidate sections`);

      // Calculate cosine similarity for each candidate
      const scoredResults = candidates
        .map(candidate => {
          const similarity = this.cosineSimilarity(queryEmbedding, candidate.embedding);
          return {
            ...candidate,
            relevance: similarity
          };
        })
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, topK);

      console.log(`[LEGAL-PULSE:RAG] Top result: ${scoredResults[0]?.lawId} (relevance: ${scoredResults[0]?.relevance?.toFixed(3)})`);

      return scoredResults;

    } catch (error) {
      console.error('[LEGAL-PULSE:RAG] Error querying sections:', error);
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
   * Find law sections by area
   * @param {string} area - Legal area
   * @param {number} limit - Maximum results
   * @returns {Promise<Array>} - Law sections
   */
  async findByArea(area, limit = 100) {
    return await Law.findByArea(area, limit);
  }

  /**
   * Find recently updated law sections
   * @param {number} daysBack - Number of days to look back
   * @returns {Promise<Array>} - Recent law sections
   */
  async findRecentChanges(daysBack = 30) {
    return await Law.findRecentChanges(daysBack);
  }

  /**
   * Get statistics about the law database
   * @returns {Promise<Object>} - Statistics
   */
  async getStats() {
    const total = await Law.countDocuments();
    const byArea = await Law.aggregate([
      {
        $group: {
          _id: '$area',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const recentChanges = await Law.countDocuments({
      updatedAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
    });

    return {
      total,
      byArea,
      recentChanges30Days: recentChanges
    };
  }
}

// Singleton instance
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new LawEmbeddingsService();
    }
    return instance;
  },
  LawEmbeddingsService
};
