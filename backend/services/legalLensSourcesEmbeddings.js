// 📁 backend/services/legalLensSourcesEmbeddings.js
// Phase 2.5 — Eigener RAG-Service für Legal Lens.
//
// KRITISCH WICHTIG:
// - Diese Datei ist eine ABSICHTLICHE Kopie/Adaption von lawEmbeddings.js,
//   um Legal Pulse 100% unangetastet zu lassen.
// - Schreibt NUR in die legalLensSources Collection (NICHT laws!)
// - Nutzt eigenen Singleton — kein State-Konflikt mit lawEmbeddings.
// - OpenAI-Client wird neu instanziiert (lightweight, zustandslos).
//
// Audit-bestätigt: 0% Side-Effects auf Legal Pulse.

const { OpenAI } = require("openai");
const LegalLensSource = require("../models/LegalLensSource");

class LegalLensSourcesEmbeddingsService {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("legalLensSourcesEmbeddings: OPENAI_API_KEY fehlt");
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Config — identisch zu lawEmbeddings für Konsistenz beim Embedding-Vergleich
    this.embeddingModel = "text-embedding-3-small";
    this.vectorDimensions = 1536;
    this.rateLimitDelayMs = 100; // 100ms zwischen Calls (OpenAI Soft-Limit-Schutz)

    console.log("[LEGAL-LENS:RAG] Initialized — legalLensSources Collection");
  }

  /**
   * Generate embedding for a text via OpenAI text-embedding-3-small.
   * @param {string} text
   * @returns {Promise<number[]>} 1536-Dim Vector
   */
  async generateEmbedding(text) {
    if (!text || typeof text !== "string") {
      throw new Error("generateEmbedding: text required");
    }
    try {
      const response = await this.openai.embeddings.create({
        model: this.embeddingModel,
        input: text.substring(0, 8000) // OpenAI-Limit: 8k Tokens
      });
      return response.data[0].embedding;
    } catch (error) {
      console.error("[LEGAL-LENS:RAG] Embedding-Generation fehlgeschlagen:", error.message);
      throw error;
    }
  }

  /**
   * Upsert Legal-Lens-Sources mit Embedding-Generation.
   * Verwendet contentHash für Skip-Logik (bereits importierte unveränderte §§).
   *
   * @param {Array<Object>} sections - Array of section objects
   * @param {Object} options
   * @param {boolean} options.skipUnchanged - default true, überspringe §§ mit gleichem contentHash
   * @returns {Promise<{inserted, updated, skipped, errors, total}>}
   */
  async upsertSources(sections, options = {}) {
    const { skipUnchanged = true } = options;
    console.log(`[LEGAL-LENS:RAG] Upsert für ${sections.length} §§ gestartet...`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const section of sections) {
      try {
        // Validierung: Mindest-Felder
        if (!section.code || !section.section || !section.title || !section.text) {
          console.warn(`[LEGAL-LENS:RAG] ⚠ Skip — fehlende Felder: ${JSON.stringify({ code: section.code, section: section.section })}`);
          errors++;
          continue;
        }

        // Skip-Logik: existierende § mit gleichem contentHash?
        if (skipUnchanged && section.contentHash) {
          const existing = await LegalLensSource.findOne(
            { code: section.code, section: section.section },
            { contentHash: 1 }
          ).lean();
          if (existing && existing.contentHash === section.contentHash) {
            skipped++;
            continue;
          }
        }

        // Embedding generieren (wenn noch nicht vorhanden)
        if (!section.embedding || section.embedding.length === 0) {
          const embeddingText = `${section.title}\n${section.text}`;
          section.embedding = await this.generateEmbedding(embeddingText);
          // Rate-Limit Pause
          await new Promise(resolve => setTimeout(resolve, this.rateLimitDelayMs));
        }

        // Upsert in eigene Collection
        const isNew = !(await LegalLensSource.exists({ code: section.code, section: section.section }));

        await LegalLensSource.findOneAndUpdate(
          { code: section.code, section: section.section },
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

        if (isNew) inserted++;
        else updated++;

      } catch (error) {
        errors++;
        console.error(`[LEGAL-LENS:RAG] ✗ Upsert-Fehler bei ${section.code} ${section.section}: ${error.message}`);
      }
    }

    const stats = { inserted, updated, skipped, errors, total: sections.length };
    console.log(`[LEGAL-LENS:RAG] Upsert-Stats:`, stats);
    return stats;
  }

  /**
   * RAG-Query: Suche relevante §§ via Cosine-Similarity.
   * Hauptmethode für Legal-Lens-Klausel-Analyse.
   *
   * @param {Object} params
   * @param {string} params.text - Klausel-Text
   * @param {number} params.topK - Anzahl Top-Treffer (default 5)
   * @param {string} params.area - Optional Filter nach area
   * @returns {Promise<Array>} Array of { code, section, title, text, area, sourceUrl, relevance, ... }
   */
  async queryRelevantSections({ text, topK = 5, area = null }) {
    console.log(`[LEGAL-LENS:RAG] Query: "${text.substring(0, 50)}..." (topK=${topK}, area=${area})`);

    try {
      // 1. Query-Embedding generieren
      const queryEmbedding = await this.generateEmbedding(text);

      // 2. Kandidaten aus DB laden (nur aktive mit Embedding)
      const filter = { isActive: true, embedding: { $exists: true, $ne: [] } };
      if (area) filter.area = area;

      const candidates = await LegalLensSource.find(filter).lean();

      if (candidates.length === 0) {
        console.log("[LEGAL-LENS:RAG] Keine Kandidaten in legalLensSources Collection");
        return [];
      }

      console.log(`[LEGAL-LENS:RAG] ${candidates.length} Kandidaten zur Bewertung`);

      // 3. Cosine-Similarity berechnen
      const scoredResults = candidates
        .filter(c => Array.isArray(c.embedding) && c.embedding.length > 0)
        .map(candidate => ({
          ...candidate,
          relevance: this.cosineSimilarity(queryEmbedding, candidate.embedding)
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, topK);

      if (scoredResults.length > 0) {
        const top = scoredResults[0];
        console.log(`[LEGAL-LENS:RAG] Top-Treffer: ${top.section} ${top.code} (relevance=${top.relevance.toFixed(3)})`);
      }

      return scoredResults;

    } catch (error) {
      console.error("[LEGAL-LENS:RAG] Query-Fehler:", error.message);
      throw error;
    }
  }

  /**
   * Cosine-Similarity zwischen zwei Vektoren.
   * @param {number[]} vecA
   * @param {number[]} vecB
   * @returns {number} 0-1
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
   * Stats über die Collection.
   * @returns {Promise<{total, byCode, byArea, withEmbedding}>}
   */
  async getStats() {
    const total = await LegalLensSource.countDocuments({ isActive: true });
    const withEmbedding = await LegalLensSource.countDocuments({
      isActive: true,
      embedding: { $exists: true, $ne: [] }
    });

    const byCode = await LegalLensSource.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$code", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    const byArea = await LegalLensSource.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: "$area", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    return { total, withEmbedding, byCode, byArea };
  }

  /**
   * Findet § via Code + Section (z.B. "BGB" + "§ 305c")
   * @returns {Promise<Object|null>}
   */
  async findByCodeAndSection(code, section) {
    return await LegalLensSource.findOne({ code, section, isActive: true }).lean();
  }
}

// ──────────────────────────────────────────────
// Singleton-Pattern (separat von lawEmbeddings!)
// ──────────────────────────────────────────────
let instance = null;

module.exports = {
  getInstance: () => {
    if (!instance) {
      instance = new LegalLensSourcesEmbeddingsService();
    }
    return instance;
  },
  LegalLensSourcesEmbeddingsService
};
