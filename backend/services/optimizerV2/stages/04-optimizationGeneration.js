/**
 * Stage 4: Optimization Generation
 *
 * Generates THREE versions (neutral, proCreator, proRecipient) for each
 * clause that needs improvement. Uses gpt-4o for maximum quality.
 *
 * This stage has ALL context from stages 1-3, which is why the
 * generated alternatives are dramatically better than a single-call approach.
 */
const { OPTIMIZATION_GENERATION_PROMPT, OPTIMIZATION_GENERATION_SCHEMA } = require('../prompts/systemPrompts');
const { generateClauseDiffs } = require('../utils/diffGenerator');
const { calculateCost } = require('./01-structureRecognition');

const BATCH_SIZE = 3; // Smaller batches for higher quality output

async function runOptimizationGeneration(openai, clauses, clauseAnalyses, structure, onProgress) {
  onProgress(50, 'Generiere optimierte Klauseln...');

  // Build analysis map for quick lookup
  const analysisMap = new Map();
  for (const analysis of clauseAnalyses) {
    analysisMap.set(analysis.clauseId, analysis);
  }

  // Determine which clauses need optimization
  const clausesToOptimize = clauses.filter(clause => {
    const analysis = analysisMap.get(clause.id);
    if (!analysis) return true;
    // Optimize if: weak, critical, has concerns, or risk > 3
    return analysis.strength === 'weak' ||
           analysis.strength === 'critical' ||
           (analysis.concerns && analysis.concerns.length > 0) ||
           analysis.riskLevel > 3;
  });

  // Also include "adequate" clauses that have at least some concerns
  const additionalClauses = clauses.filter(clause => {
    const analysis = analysisMap.get(clause.id);
    if (!analysis) return false;
    if (clausesToOptimize.find(c => c.id === clause.id)) return false;
    return analysis.strength === 'adequate' && analysis.concerns && analysis.concerns.length > 0;
  });

  const allToOptimize = [...clausesToOptimize, ...additionalClauses];

  onProgress(52, `${allToOptimize.length} von ${clauses.length} Klauseln werden optimiert...`);

  // Batch processing
  const batches = [];
  for (let i = 0; i < allToOptimize.length; i += BATCH_SIZE) {
    batches.push(allToOptimize.slice(i, i + BATCH_SIZE));
  }

  const allOptimizations = [];
  let totalUsage = { inputTokens: 0, outputTokens: 0, costUSD: 0 };

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const progressBase = 52 + Math.round((batchIdx / Math.max(batches.length, 1)) * 30);

    onProgress(progressBase, `Optimiere Klauseln ${batchIdx * BATCH_SIZE + 1}-${Math.min((batchIdx + 1) * BATCH_SIZE, allToOptimize.length)}...`);

    // Build rich context for each clause
    const clauseContexts = batch.map(clause => {
      const analysis = analysisMap.get(clause.id);
      return [
        `=== KLAUSEL: ${clause.id} | ${clause.sectionNumber || ''} ${clause.title} ===`,
        `Kategorie: ${clause.category}`,
        ``,
        `ORIGINALTEXT:`,
        clause.originalText,
        ``,
        `ANALYSE:`,
        `- Stärke: ${analysis?.strength || 'unbekannt'}`,
        `- Risiko: ${analysis?.riskLevel || 0}/10 (${analysis?.riskType || 'unbekannt'})`,
        `- Bedenken: ${analysis?.concerns?.join('; ') || 'keine'}`,
        `- Juristische Bewertung: ${analysis?.legalAssessment || 'nicht verfügbar'}`,
        `- Rechtsgrundlagen: ${analysis?.legalReferences?.join(', ') || 'keine'}`,
      ].join('\n');
    }).join('\n\n---\n\n');

    const systemPrompt = OPTIMIZATION_GENERATION_PROMPT(
      structure.contractTypeLabel || structure.contractType,
      structure.jurisdiction,
      structure.parties,
      structure.industry
    );

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.2,
        max_tokens: 12000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'optimization_generation',
            strict: true,
            schema: OPTIMIZATION_GENERATION_SCHEMA
          }
        },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Erstelle optimierte Versionen für diese ${batch.length} Klauseln:\n\n${clauseContexts}`
          }
        ]
      });

      const result = JSON.parse(response.choices[0].message.content);

      // Generate diffs for each optimization
      for (const opt of result.optimizations) {
        const clause = clauses.find(c => c.id === opt.clauseId);
        if (clause && opt.needsOptimization) {
          const diffs = generateClauseDiffs(clause.originalText, {
            neutral: opt.neutral,
            proCreator: opt.proCreator,
            proRecipient: opt.proRecipient
          });

          opt.neutral.diffs = diffs.neutral || [];
          opt.proCreator.diffs = diffs.proCreator || [];
          opt.proRecipient.diffs = diffs.proRecipient || [];
        }

        // Structure for DB storage
        allOptimizations.push({
          clauseId: opt.clauseId,
          needsOptimization: opt.needsOptimization,
          versions: {
            neutral: { text: opt.neutral.text, reasoning: opt.neutral.reasoning, diffs: opt.neutral.diffs || [] },
            proCreator: { text: opt.proCreator.text, reasoning: opt.proCreator.reasoning, diffs: opt.proCreator.diffs || [] },
            proRecipient: { text: opt.proRecipient.text, reasoning: opt.proRecipient.reasoning, diffs: opt.proRecipient.diffs || [] }
          },
          marketBenchmark: opt.marketBenchmark,
          negotiationAdvice: opt.negotiationAdvice
        });
      }

      const batchCost = calculateCost('gpt-4o', response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0);
      totalUsage.inputTokens += response.usage?.prompt_tokens || 0;
      totalUsage.outputTokens += response.usage?.completion_tokens || 0;
      totalUsage.costUSD += batchCost;

    } catch (err) {
      console.error(`[OptimizerV2] Stage 4 batch ${batchIdx + 1} failed:`, err.message);
      // Fallback: mark clauses as not optimizable
      for (const clause of batch) {
        allOptimizations.push({
          clauseId: clause.id,
          needsOptimization: false,
          versions: {
            neutral: { text: clause.originalText, reasoning: 'Optimierung fehlgeschlagen', diffs: [] },
            proCreator: { text: clause.originalText, reasoning: 'Optimierung fehlgeschlagen', diffs: [] },
            proRecipient: { text: clause.originalText, reasoning: 'Optimierung fehlgeschlagen', diffs: [] }
          },
          marketBenchmark: '',
          negotiationAdvice: ''
        });
      }
    }
  }

  // Add "no optimization needed" entries for strong clauses
  for (const clause of clauses) {
    if (!allOptimizations.find(o => o.clauseId === clause.id)) {
      allOptimizations.push({
        clauseId: clause.id,
        needsOptimization: false,
        versions: {
          neutral: { text: clause.originalText, reasoning: 'Klausel ist bereits gut formuliert.', diffs: [] },
          proCreator: { text: clause.originalText, reasoning: 'Keine Optimierung nötig.', diffs: [] },
          proRecipient: { text: clause.originalText, reasoning: 'Keine Optimierung nötig.', diffs: [] }
        },
        marketBenchmark: 'Entspricht dem Marktstandard.',
        negotiationAdvice: ''
      });
    }
  }

  onProgress(82, `${allOptimizations.filter(o => o.needsOptimization).length} Klauseln optimiert`);

  return {
    result: allOptimizations,
    usage: {
      model: 'gpt-4o',
      ...totalUsage
    }
  };
}

module.exports = { runOptimizationGeneration };
