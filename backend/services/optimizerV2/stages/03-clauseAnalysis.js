/**
 * Stage 3: Clause-by-Clause Deep Analysis
 *
 * Analyzes each clause individually with a specialized expert prompt.
 * Uses batched GPT-4o calls (3-4 clauses per batch) for quality.
 */
const { CLAUSE_ANALYSIS_PROMPT, CLAUSE_ANALYSIS_SCHEMA } = require('../prompts/systemPrompts');
const { calculateCost } = require('./01-structureRecognition');

const BATCH_SIZE = 4;

// Heuristic importance overrides based on category
const CATEGORY_IMPORTANCE_FLOOR = {
  liability: 'critical',
  ip_rights: 'critical',
  data_protection: 'critical',
  non_compete: 'critical',
  payment: 'high',
  termination: 'high',
  warranty: 'high',
  penalties: 'high',
  duration: 'high',
  confidentiality: 'high',
  insurance: 'medium',
  compliance: 'medium',
  sla: 'medium',
  deliverables: 'medium',
  force_majeure: 'medium',
  dispute_resolution: 'medium',
  subject: 'medium',
  parties: 'low',
  general_provisions: 'low',
  amendments: 'low',
  other: 'low'
};

const IMPORTANCE_RANK = { critical: 3, high: 2, medium: 1, low: 0 };

/**
 * Ensures GPT's importance isn't lower than the category-based floor.
 * GPT can rate higher (e.g. "definitions" clause with unusual terms → medium),
 * but can't rate a liability clause as "low".
 */
function reinforceImportance(analysis, clause) {
  const floor = CATEGORY_IMPORTANCE_FLOOR[clause.category] || 'low';
  const gptLevel = analysis.importanceLevel || 'medium';
  if (IMPORTANCE_RANK[gptLevel] < IMPORTANCE_RANK[floor]) {
    return floor;
  }
  return gptLevel;
}

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
      structure.parties,
      structure.industry
    );

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0.1,
        max_tokens: 8000,
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
      // Reinforce importance levels with category-based heuristics
      for (const analysis of result.analyses) {
        const clause = batch.find(c => c.id === analysis.clauseId);
        if (clause) {
          analysis.importanceLevel = reinforceImportance(analysis, clause);
        }
      }
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
          importanceLevel: CATEGORY_IMPORTANCE_FLOOR[clause.category] || 'medium',
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
