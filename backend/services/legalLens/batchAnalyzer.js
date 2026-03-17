/**
 * Legal Lens V2 - Batch Analyzer Service
 *
 * Analysiert ALLE Klauseln eines Vertrags parallel mit kontrollierter Concurrency.
 * Nutzt Hash-basiertes Caching um identische Klauseln wiederzuverwenden.
 *
 * @version 1.0.0
 */

const crypto = require('crypto');
const ClauseAnalysis = require('../../models/ClauseAnalysis');
const clauseAnalyzer = require('./clauseAnalyzer');
const costTrackingService = require('../costTracking');

class BatchAnalyzer {
  constructor() {
    this.maxRetries = 2;
    this.baseRetryDelay = 1000; // 1s
  }

  /**
   * Adaptive Concurrency — kleine Verträge schneller, große Rate-Limit-safe
   */
  getConcurrency(clauseCount) {
    if (clauseCount < 50) return 5;
    if (clauseCount <= 150) return 4;
    return 3;
  }

  /**
   * Generiert einen normalisierten Hash für Klauseltext
   */
  generateHash(clauseText) {
    if (!clauseText) return null;
    const normalized = clauseText.toLowerCase().replace(/\s+/g, ' ').trim();
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
  }

  /**
   * Analysiert alle Klauseln eines Vertrags
   *
   * @param {Object} params
   * @param {string} params.contractId - Contract MongoDB ID
   * @param {string} params.userId - User MongoDB ID
   * @param {Array} params.clauses - Geparste Klauseln aus clauseParser
   * @param {string} params.contractContext - Vertragskontext (erste 1000 Zeichen)
   * @param {string} params.industry - Branche (z.B. 'it_software')
   * @param {Function} params.onProgress - Callback: ({ completed, total, clauseId, analysis }) => void
   * @param {Function} params.onError - Callback: ({ clauseId, error }) => void
   * @returns {Promise<Object>} { results: {clauseId: analysis}, stats: {...} }
   */
  async analyzeAll({ contractId, userId, clauses, contractContext = '', industry = 'general', onProgress, onError }) {
    const analyzable = clauses.filter(c => !c.nonAnalyzable);
    const results = {};
    let completed = 0;
    let cached = 0;
    let errors = 0;
    const startTime = Date.now();

    const concurrency = this.getConcurrency(analyzable.length);
    console.log(`🚀 [BatchAnalyzer] Start: ${analyzable.length} Klauseln (von ${clauses.length} gesamt), Concurrency: ${concurrency}, Branche: ${industry}`);

    // Lade bereits vorhandene V2-Analysen für diesen Vertrag
    const existingAnalyses = await ClauseAnalysis.find(
      { contractId, 'v2Analysis.analyzedAt': { $exists: true } },
      { clauseId: 1, v2Analysis: 1 }
    );
    const existingMap = {};
    for (const ea of existingAnalyses) {
      existingMap[ea.clauseId] = ea.v2Analysis;
    }

    // Filtere bereits analysierte Klauseln raus
    const toAnalyze = analyzable.filter(clause => {
      if (existingMap[clause.id]) {
        results[clause.id] = existingMap[clause.id];
        completed++;
        cached++;
        return false;
      }
      return true;
    });

    if (cached > 0) {
      console.log(`⚡ [BatchAnalyzer] ${cached} Klauseln bereits gecacht`);
    }

    if (toAnalyze.length === 0) {
      console.log(`✅ [BatchAnalyzer] Alle Klauseln bereits analysiert`);
      return {
        results,
        stats: { total: analyzable.length, completed, cached, errors: 0, newlyAnalyzed: 0, durationMs: Date.now() - startTime }
      };
    }

    // In Batches à `concurrency` parallel verarbeiten
    for (let i = 0; i < toAnalyze.length; i += concurrency) {
      const batch = toAnalyze.slice(i, i + concurrency);

      const batchResults = await Promise.allSettled(
        batch.map(clause => this.analyzeOne({
          contractId, userId, clause, contractContext, industry
        }))
      );

      for (let j = 0; j < batchResults.length; j++) {
        const clause = batch[j];
        const result = batchResults[j];

        if (result.status === 'fulfilled') {
          results[clause.id] = result.value.analysis;
          completed++;

          if (result.value.fromCache) cached++;

          onProgress?.({
            completed,
            total: analyzable.length,
            clauseId: clause.id,
            analysis: result.value.analysis
          });
        } else {
          errors++;
          console.error(`❌ [BatchAnalyzer] Klausel ${clause.id} fehlgeschlagen:`, result.reason?.message);
          onError?.({ clauseId: clause.id, error: result.reason?.message || 'Unbekannter Fehler' });
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const newlyAnalyzed = completed - cached;

    console.log(`✅ [BatchAnalyzer] Fertig: ${completed}/${analyzable.length} analysiert (${cached} Cache, ${newlyAnalyzed} neu, ${errors} Fehler) in ${durationMs}ms`);

    return {
      results,
      stats: { total: analyzable.length, completed, cached, errors, newlyAnalyzed, durationMs }
    };
  }

  /**
   * Analysiert eine einzelne Klausel mit Cache-Check und Retry
   */
  async analyzeOne({ contractId, userId, clause, contractContext, industry }) {
    const clauseTextHash = this.generateHash(clause.text);

    // Stufe 1: Hash-basierter Cross-Contract-Cache
    if (clauseTextHash) {
      try {
        const hashCached = await ClauseAnalysis.findOne({
          clauseTextHash,
          'v2Analysis.analyzedAt': { $exists: true }
        }).sort({ updatedAt: -1 });

        if (hashCached?.v2Analysis) {
          console.log(`🔄 [BatchAnalyzer] Hash-Cache hit für Klausel ${clause.id}`);

          // Speichere die gecachte Analyse für den aktuellen Vertrag
          await this.saveAnalysis({
            contractId, userId, clause, clauseTextHash, analysis: hashCached.v2Analysis
          });

          return { analysis: hashCached.v2Analysis, fromCache: true };
        }
      } catch (cacheError) {
        console.warn(`⚠️ [BatchAnalyzer] Cache-Lookup fehlgeschlagen:`, cacheError.message);
      }
    }

    // Stufe 2: Neue GPT-Analyse mit Retry
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.baseRetryDelay * Math.pow(2, attempt - 1);
          console.log(`🔄 [BatchAnalyzer] Retry ${attempt}/${this.maxRetries} für Klausel ${clause.id} nach ${delay}ms`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }

        const analysis = await clauseAnalyzer.analyzeClauseV2(clause.text, contractContext, { industry });

        // Metadaten entfernen vor dem Speichern
        const { _metadata, ...analysisData } = analysis;

        // Cost Tracking (non-blocking)
        if (_metadata?.tokensUsed && userId) {
          costTrackingService.trackAPICall({
            userId,
            model: _metadata.model || 'gpt-4o',
            inputTokens: Math.round(_metadata.tokensUsed * 0.65),
            outputTokens: Math.round(_metadata.tokensUsed * 0.35),
            feature: 'legal-lens-v2',
            contractId,
            metadata: { clauseId: clause.id, processingTimeMs: _metadata.processingTimeMs }
          }).catch(() => {}); // Silently ignore tracking errors
        }

        // In DB speichern
        await this.saveAnalysis({
          contractId, userId, clause, clauseTextHash, analysis: analysisData, metadata: _metadata
        });

        return { analysis: analysisData, fromCache: false };

      } catch (error) {
        lastError = error;
        if (error.message?.includes('Rate limit') || error.message?.includes('429')) {
          console.warn(`⏳ [BatchAnalyzer] Rate limit für Klausel ${clause.id}, warte...`);
        }
      }
    }

    throw lastError || new Error(`Analyse für Klausel ${clause.id} fehlgeschlagen nach ${this.maxRetries + 1} Versuchen`);
  }

  /**
   * Speichert eine V2-Analyse in der ClauseAnalysis Collection
   */
  async saveAnalysis({ contractId, userId, clause, clauseTextHash, analysis, metadata }) {
    try {
      await ClauseAnalysis.findOneAndUpdate(
        { contractId, clauseId: clause.id },
        {
          $set: {
            userId,
            clauseText: clause.text,
            clauseTextHash,
            sectionTitle: clause.title || null,
            v2Analysis: analysis,
            // Top-Level-Felder auch setzen für Kompatibilität
            riskLevel: analysis.riskLevel,
            riskScore: analysis.riskScore,
            actionLevel: analysis.actionLevel,
            ...(metadata ? { aiModel: metadata.model, tokensUsed: metadata.tokensUsed, processingTimeMs: metadata.processingTimeMs } : {})
          },
          $setOnInsert: {
            createdAt: new Date()
          }
        },
        { upsert: true, new: true }
      );
    } catch (dbError) {
      console.error(`⚠️ [BatchAnalyzer] DB-Speichern fehlgeschlagen für Klausel ${clause.id}:`, dbError.message);
      // Nicht werfen — Analyse-Ergebnis ist trotzdem gültig
    }
  }

  /**
   * Gibt den Batch-Status für einen Vertrag zurück
   */
  async getStatus(contractId, totalClausesCount) {
    const analyzed = await ClauseAnalysis.countDocuments({
      contractId,
      'v2Analysis.analyzedAt': { $exists: true }
    });

    const riskCounts = await ClauseAnalysis.aggregate([
      { $match: { contractId, 'v2Analysis.analyzedAt': { $exists: true } } },
      { $group: { _id: '$v2Analysis.riskLevel', count: { $sum: 1 } } }
    ]);

    const riskSummary = { high: 0, medium: 0, low: 0 };
    for (const r of riskCounts) {
      if (r._id && riskSummary.hasOwnProperty(r._id)) {
        riskSummary[r._id] = r.count;
      }
    }

    return {
      status: analyzed >= totalClausesCount ? 'complete' : analyzed > 0 ? 'partial' : 'pending',
      progress: {
        completed: analyzed,
        total: totalClausesCount,
        percentage: totalClausesCount > 0 ? Math.round((analyzed / totalClausesCount) * 100) : 0
      },
      riskSummary
    };
  }
}

module.exports = new BatchAnalyzer();
