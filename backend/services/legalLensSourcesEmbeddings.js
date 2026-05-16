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

    // ✅ In-Memory Cache (Perf-Fix 2026-05-16):
    // Vorher lud jeder queryRelevantSections() ~50 MB aus Atlas (4829 Docs × 1536-Dim Embeddings).
    // Bei Klausel-Analyse-Burst → Atlas M0 throttled → Klausel-Analyse 76 Sek statt 6 Sek.
    // Cache lädt alle Embeddings einmal in RAM (async, beim ersten Aufruf), DB-Fallback bei Fehler.
    this.cache = null;              // Array<doc> oder null wenn nicht geladen
    this.cacheWarmupPromise = null; // Verhindert parallele Warmups (Race-Condition-Schutz)
    this.cacheLoadedAt = null;      // Timestamp für Diagnostics

    console.log("[LEGAL-LENS:RAG] Initialized — legalLensSources Collection (in-memory cache enabled)");
  }

  /**
   * Lädt alle aktiven Sources einmalig in den In-Memory-Cache.
   * Idempotent: parallele Aufrufe warten auf denselben Promise.
   * @returns {Promise<void>}
   */
  async _warmupCache() {
    if (this.cache !== null) return; // bereits geladen
    if (this.cacheWarmupPromise) return this.cacheWarmupPromise; // läuft schon

    this.cacheWarmupPromise = (async () => {
      const start = Date.now();
      console.log("[LEGAL-LENS:CACHE] Warmup gestartet ...");
      try {
        const docs = await LegalLensSource.find(
          { isActive: true, embedding: { $exists: true, $ne: [] } },
          // Projection: nur die Felder die RAG-Query oder Frontend braucht
          { code: 1, section: 1, title: 1, text: 1, area: 1, sourceUrl: 1, embedding: 1, isActive: 1 }
        ).lean();

        this.cache = docs;
        this.cacheLoadedAt = Date.now();
        const elapsed = this.cacheLoadedAt - start;
        const sizeMB = (JSON.stringify(docs).length / 1024 / 1024).toFixed(1);
        console.log(`[LEGAL-LENS:CACHE] ✅ Warmup fertig: ${docs.length} Docs in ${elapsed}ms (~${sizeMB} MB)`);
      } catch (error) {
        console.error("[LEGAL-LENS:CACHE] ❌ Warmup fehlgeschlagen:", error.message);
        // Reset Promise damit nächster Aufruf erneut versucht
        this.cacheWarmupPromise = null;
        throw error;
      }
    })();

    return this.cacheWarmupPromise;
  }

  /**
   * Invalidiert den Cache (z.B. nach upsertSources oder manuellem Sync).
   * Nächster queryRelevantSections triggert Warmup neu.
   */
  _invalidateCache() {
    this.cache = null;
    this.cacheWarmupPromise = null;
    this.cacheLoadedAt = null;
    console.log("[LEGAL-LENS:CACHE] Cache invalidiert — nächste Query lädt neu");
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

    // ✅ Cache invalidieren wenn Sources tatsächlich geändert wurden
    if (inserted > 0 || updated > 0) {
      this._invalidateCache();
    }

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

      // 2. Kandidaten aus In-Memory-Cache (mit DB-Fallback)
      let candidates;
      let source;
      try {
        await this._warmupCache();
        candidates = area
          ? this.cache.filter(c => c.area === area)
          : this.cache;
        source = "cache";
      } catch (cacheError) {
        // Fallback auf DB-Query wenn Cache-Warmup fehlschlägt
        console.warn(`[LEGAL-LENS:CACHE] Fallback auf DB-Query (cache warmup failed): ${cacheError.message}`);
        const filter = { isActive: true, embedding: { $exists: true, $ne: [] } };
        if (area) filter.area = area;
        candidates = await LegalLensSource.find(filter).lean();
        source = "db-fallback";
      }

      if (candidates.length === 0) {
        console.log("[LEGAL-LENS:RAG] Keine Kandidaten in legalLensSources Collection");
        return [];
      }

      const scoringStart = Date.now();

      // 3. Cosine-Similarity berechnen
      const scoredResults = candidates
        .filter(c => Array.isArray(c.embedding) && c.embedding.length > 0)
        .map(candidate => ({
          ...candidate,
          relevance: this.cosineSimilarity(queryEmbedding, candidate.embedding)
        }))
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, topK);

      const scoringMs = Date.now() - scoringStart;
      console.log(`[LEGAL-LENS:RAG] ${candidates.length} Kandidaten bewertet in ${scoringMs}ms (source=${source})`);

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
