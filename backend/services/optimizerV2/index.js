/**
 * Optimizer V2 - Pipeline Orchestrator
 *
 * Manages sequential execution of 5 stages, persists intermediate
 * results after each stage, and emits SSE progress events.
 *
 * Pipeline:
 *   Stage 1: Structure Recognition  (gpt-4o-mini)
 *   Stage 2: Clause Extraction      (gpt-4o-mini)
 *   Stage 3: Clause Analysis         (gpt-4o, batched)
 *   Stage 4: Optimization Generation (gpt-4o, batched)
 *   Stage 5: Score Calculation       (deterministic)
 */
const { OpenAI } = require('openai');
const OptimizerV2Result = require('../../models/OptimizerV2Result');
const { runStructureRecognition } = require('./stages/01-structureRecognition');
const { runClauseExtraction } = require('./stages/02-clauseExtraction');
const { runClauseAnalysis } = require('./stages/03-clauseAnalysis');
const { runOptimizationGeneration } = require('./stages/04-optimizationGeneration');
const { runScoreCalculation } = require('./stages/05-scoreCalculation');

let openaiInstance = null;
function getOpenAI() {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 300000,
      maxRetries: 2
    });
  }
  return openaiInstance;
}

/**
 * Run the full optimization pipeline.
 *
 * @param {Object} params
 * @param {string} params.contractText - Full extracted contract text
 * @param {string} params.fileName - Original file name
 * @param {string} params.userId - User ID
 * @param {string} params.requestId - Unique request ID
 * @param {string} params.perspective - 'neutral' | 'creator' | 'recipient'
 * @param {string} [params.s3Key] - S3 key of uploaded file
 * @param {number} [params.fileSize] - File size in bytes
 * @param {Function} onProgress - (progress: number, message: string, stageData?: object) => void
 * @returns {Promise<Object>} Complete analysis result
 */
async function runPipeline({ contractText, fileName, userId, requestId, perspective, s3Key, fileSize, ocrApplied }, onProgress) {
  const openai = getOpenAI();
  const startTime = Date.now();

  // Create initial DB record
  const record = await OptimizerV2Result.create({
    userId,
    requestId,
    fileName,
    fileSize: fileSize || 0,
    textLength: contractText.length,
    s3Key: s3Key || null,
    originalText: contractText,
    ocrApplied: !!ocrApplied,
    status: 'running',
    currentStage: 1,
    perspective: perspective || 'neutral',
    startedAt: new Date()
  });

  const costs = [];

  try {
    // ═══════════════════════════════════════════════
    // STAGE 1: Structure Recognition
    // ═══════════════════════════════════════════════
    onProgress(1, 'Stage 1: Vertragsstruktur wird erkannt...', { stage: 1, stageName: 'Vertragsstruktur' });

    const stage1 = await runStructureRecognition(openai, contractText, fileName, onProgress);
    costs.push({ stage: 1, stageName: 'Vertragsstruktur', ...stage1.usage, durationMs: 0 });

    await OptimizerV2Result.updateOne(
      { _id: record._id },
      { $set: { structure: stage1.result, currentStage: 2, 'costs.perStage': costs } }
    );

    // Language check: warn if non-German contract detected
    const detectedLang = stage1.result?.language;
    if (detectedLang && detectedLang !== 'de') {
      const langNames = { en: 'Englisch', fr: 'Französisch', es: 'Spanisch', it: 'Italienisch', other: 'nicht-deutsch' };
      const langLabel = langNames[detectedLang] || detectedLang;
      onProgress(10, `Hinweis: Vertrag in ${langLabel} erkannt. Die Analyse ist für deutsche Verträge optimiert — Ergebnisse können bei fremdsprachigen Verträgen ungenau sein.`, { warning: true });
    }

    onProgress(11, 'Vertragsstruktur erkannt', { stage: 1, complete: true, result: stage1.result });

    // ═══════════════════════════════════════════════
    // STAGE 2: Clause Extraction
    // ═══════════════════════════════════════════════
    onProgress(12, 'Stage 2: Klauseln werden extrahiert...', { stage: 2, stageName: 'Klauselextraktion' });

    const stage2 = await runClauseExtraction(openai, contractText, stage1.result, onProgress);
    costs.push({ stage: 2, stageName: 'Klauselextraktion', ...stage2.usage, durationMs: 0 });

    await OptimizerV2Result.updateOne(
      { _id: record._id },
      { $set: { clauses: stage2.result, currentStage: 3, 'costs.perStage': costs } }
    );

    onProgress(21, `${stage2.result.length} Klauseln extrahiert`, {
      stage: 2, complete: true, result: { clauseCount: stage2.result.length }
    });

    // ═══════════════════════════════════════════════
    // STAGE 3: Clause Analysis
    // ═══════════════════════════════════════════════
    onProgress(22, 'Stage 3: Tiefenanalyse der Klauseln...', { stage: 3, stageName: 'Tiefenanalyse' });

    const stage3 = await runClauseAnalysis(openai, stage2.result, stage1.result, onProgress);
    costs.push({ stage: 3, stageName: 'Tiefenanalyse', ...stage3.usage, durationMs: 0 });

    await OptimizerV2Result.updateOne(
      { _id: record._id },
      { $set: { clauseAnalyses: stage3.result, currentStage: 4, 'costs.perStage': costs } }
    );

    const weakCount = stage3.result.filter(a => a.strength === 'weak' || a.strength === 'critical').length;
    onProgress(49, `Analyse abgeschlossen: ${weakCount} Klauseln mit Verbesserungsbedarf`, {
      stage: 3, complete: true, result: { analyzedCount: stage3.result.length, weakCount }
    });

    // ═══════════════════════════════════════════════
    // STAGE 4: Optimization Generation
    // ═══════════════════════════════════════════════
    onProgress(50, 'Stage 4: Optimierte Klauseln werden generiert...', { stage: 4, stageName: 'Optimierung' });

    const stage4 = await runOptimizationGeneration(openai, stage2.result, stage3.result, stage1.result, onProgress);
    costs.push({ stage: 4, stageName: 'Optimierung', ...stage4.usage, durationMs: 0 });

    await OptimizerV2Result.updateOne(
      { _id: record._id },
      { $set: { optimizations: stage4.result, currentStage: 5, 'costs.perStage': costs } }
    );

    const optimizedCount = stage4.result.filter(o => o.needsOptimization).length;
    onProgress(83, `${optimizedCount} Klauseln optimiert (je 3 Versionen)`, {
      stage: 4, complete: true, result: { optimizedCount, totalClauses: stage2.result.length }
    });

    // ═══════════════════════════════════════════════
    // STAGE 5: Score Calculation
    // ═══════════════════════════════════════════════
    onProgress(84, 'Stage 5: Scores werden berechnet...', { stage: 5, stageName: 'Scoring' });

    const stage5 = runScoreCalculation(stage2.result, stage3.result, stage4.result, stage1.result, onProgress);

    // Calculate total costs
    const totalCosts = {
      totalTokensInput: costs.reduce((sum, c) => sum + (c.inputTokens || 0), 0),
      totalTokensOutput: costs.reduce((sum, c) => sum + (c.outputTokens || 0), 0),
      totalCostUSD: costs.reduce((sum, c) => sum + (c.costUSD || 0), 0),
      perStage: costs
    };

    // Final update
    await OptimizerV2Result.updateOne(
      { _id: record._id },
      {
        $set: {
          scores: stage5.result,
          costs: totalCosts,
          status: 'completed',
          currentStage: 5,
          completedAt: new Date()
        }
      }
    );

    const totalDurationMs = Date.now() - startTime;

    const fullResult = {
      resultId: record._id.toString(),
      requestId,
      structure: stage1.result,
      clauses: stage2.result,
      clauseAnalyses: stage3.result,
      optimizations: stage4.result,
      scores: stage5.result,
      costs: totalCosts,
      performance: {
        totalDurationMs,
        clauseCount: stage2.result.length,
        optimizedCount: stage4.result.filter(o => o.needsOptimization).length,
        textLength: contractText.length
      }
    };

    onProgress(100, 'Analyse abgeschlossen!', { complete: true, result: fullResult });

    return fullResult;

  } catch (err) {
    console.error(`[OptimizerV2] Pipeline failed at stage ${record.currentStage}:`, err);

    await OptimizerV2Result.updateOne(
      { _id: record._id },
      { $set: { status: 'failed', error: err.message, 'costs.perStage': costs } }
    );

    throw err;
  }
}

/**
 * Resume a failed pipeline from the last completed stage.
 */
async function resumePipeline(resultId, onProgress) {
  const record = await OptimizerV2Result.findById(resultId);
  if (!record) throw new Error('Analyse nicht gefunden');
  if (record.status !== 'failed') throw new Error('Nur fehlgeschlagene Analysen können fortgesetzt werden');

  // Re-run from the failed stage
  const openai = getOpenAI();
  const costs = record.costs?.perStage || [];

  // Determine what we already have
  const hasStructure = !!record.structure?.contractType;
  const hasClauses = record.clauses?.length > 0;
  const hasAnalyses = record.clauseAnalyses?.length > 0;
  const hasOptimizations = record.optimizations?.length > 0;

  await OptimizerV2Result.updateOne({ _id: record._id }, { $set: { status: 'running' } });

  try {
    let structure = record.structure;
    let clauses = record.clauses;
    let clauseAnalyses = record.clauseAnalyses;
    let optimizations = record.optimizations;

    if (!hasStructure) {
      const stage1 = await runStructureRecognition(openai, record.originalText, record.fileName, onProgress);
      structure = stage1.result;
      costs.push({ stage: 1, stageName: 'Vertragsstruktur', ...stage1.usage, durationMs: 0 });
      await OptimizerV2Result.updateOne({ _id: record._id }, { $set: { structure, currentStage: 2, 'costs.perStage': costs } });
    }

    if (!hasClauses) {
      const stage2 = await runClauseExtraction(openai, record.originalText, structure, onProgress);
      clauses = stage2.result;
      costs.push({ stage: 2, stageName: 'Klauselextraktion', ...stage2.usage, durationMs: 0 });
      await OptimizerV2Result.updateOne({ _id: record._id }, { $set: { clauses, currentStage: 3, 'costs.perStage': costs } });
    }

    if (!hasAnalyses) {
      const stage3 = await runClauseAnalysis(openai, clauses, structure, onProgress);
      clauseAnalyses = stage3.result;
      costs.push({ stage: 3, stageName: 'Tiefenanalyse', ...stage3.usage, durationMs: 0 });
      await OptimizerV2Result.updateOne({ _id: record._id }, { $set: { clauseAnalyses, currentStage: 4, 'costs.perStage': costs } });
    }

    if (!hasOptimizations) {
      const stage4 = await runOptimizationGeneration(openai, clauses, clauseAnalyses, structure, onProgress);
      optimizations = stage4.result;
      costs.push({ stage: 4, stageName: 'Optimierung', ...stage4.usage, durationMs: 0 });
      await OptimizerV2Result.updateOne({ _id: record._id }, { $set: { optimizations, currentStage: 5, 'costs.perStage': costs } });
    }

    const stage5 = runScoreCalculation(clauses, clauseAnalyses, optimizations, structure, onProgress);

    const totalCosts = {
      totalTokensInput: costs.reduce((sum, c) => sum + (c.inputTokens || 0), 0),
      totalTokensOutput: costs.reduce((sum, c) => sum + (c.outputTokens || 0), 0),
      totalCostUSD: costs.reduce((sum, c) => sum + (c.costUSD || 0), 0),
      perStage: costs
    };

    await OptimizerV2Result.updateOne({ _id: record._id }, {
      $set: { scores: stage5.result, costs: totalCosts, status: 'completed', completedAt: new Date() }
    });

    return {
      resultId: record._id.toString(),
      requestId: record.requestId,
      structure, clauses, clauseAnalyses, optimizations,
      scores: stage5.result,
      costs: totalCosts
    };
  } catch (err) {
    await OptimizerV2Result.updateOne({ _id: record._id }, { $set: { status: 'failed', error: err.message } });
    throw err;
  }
}

module.exports = { runPipeline, resumePipeline };
