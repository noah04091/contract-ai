/**
 * Stage 3: Clause-by-Clause Deep Analysis
 *
 * Analyzes each clause individually with a specialized expert prompt.
 * Uses batched GPT-4o calls (3-4 clauses per batch) for quality.
 */
const { CLAUSE_ANALYSIS_PROMPT, CLAUSE_ANALYSIS_SCHEMA } = require('../prompts/systemPrompts');
const { calculateCost } = require('./01-structureRecognition');

const BATCH_SIZE = 4;

async function runClauseAnalysis(openai, clauses, structure, onProgress) {
  onProgress(22, 'Starte Tiefenanalyse der Klauseln...');

  const batches = [];
  for (let i = 0; i < clauses.length; i += BATCH_SIZE) {
    batches.push(clauses.slice(i, i + BATCH_SIZE));
  }

  const allAnalyses = [];
  let totalUsage = { inputTokens: 0, outputTokens: 0, costUSD: 0 };

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const progressBase = 22 + Math.round((batchIdx / batches.length) * 25);
    const clauseRange = `${batchIdx * BATCH_SIZE + 1}-${Math.min((batchIdx + 1) * BATCH_SIZE, clauses.length)}`;

    onProgress(progressBase, `Analysiere Klauseln ${clauseRange} von ${clauses.length}...`);

    const clauseTexts = batch.map(c =>
      `--- KLAUSEL: ${c.id} | ${c.sectionNumber || ''} ${c.title} ---\nKategorie: ${c.category}\n\n${c.originalText}`
    ).join('\n\n');

    const systemPrompt = CLAUSE_ANALYSIS_PROMPT(
      structure.contractTypeLabel || structure.contractType,
      structure.jurisdiction,
      structure.parties
    );

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 4000,
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'clause_analysis',
            strict: true,
            schema: CLAUSE_ANALYSIS_SCHEMA
          }
        },
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: `Analysiere diese ${batch.length} Klauseln:\n\n${clauseTexts}`
          }
        ]
      });

      const result = JSON.parse(response.choices[0].message.content);
      allAnalyses.push(...result.analyses);

      const batchCost = calculateCost('gpt-4o', response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0);
      totalUsage.inputTokens += response.usage?.prompt_tokens || 0;
      totalUsage.outputTokens += response.usage?.completion_tokens || 0;
      totalUsage.costUSD += batchCost;

    } catch (err) {
      console.error(`[OptimizerV2] Stage 3 batch ${batchIdx + 1} failed:`, err.message);
      // Create fallback analyses for failed batch
      for (const clause of batch) {
        allAnalyses.push({
          clauseId: clause.id,
          summary: 'Analyse konnte nicht durchgeführt werden.',
          plainLanguage: 'Diese Klausel konnte nicht analysiert werden.',
          legalAssessment: 'Fehler bei der Analyse. Bitte manuell prüfen.',
          strength: 'adequate',
          concerns: ['Automatische Analyse fehlgeschlagen'],
          riskLevel: 5,
          riskType: 'legal',
          keyTerms: [],
          legalReferences: []
        });
      }
    }
  }

  onProgress(48, `${allAnalyses.length} Klauseln analysiert`);

  return {
    result: allAnalyses,
    usage: {
      model: 'gpt-4o',
      ...totalUsage
    }
  };
}

module.exports = { runClauseAnalysis };
