/**
 * Stage 2: Clause Extraction
 *
 * Splits the contract into individual clauses/sections.
 * Hybrid approach: regex pre-split + GPT validation/categorization.
 */
const { CLAUSE_EXTRACTION_PROMPT, CLAUSE_EXTRACTION_SCHEMA } = require('../prompts/systemPrompts');
const { preSplitClauses, smartTruncate } = require('../utils/clauseSplitter');
const { calculateCost } = require('./01-structureRecognition');

async function runClauseExtraction(openai, contractText, structure, onProgress) {
  onProgress(12, 'Zerlege Vertrag in Klauseln...');

  // Pre-split as hints
  const preSplit = preSplitClauses(contractText);
  onProgress(14, `${preSplit.length} vorläufige Abschnitte erkannt...`);

  const truncated = smartTruncate(contractText, 50000);

  const contextHint = preSplit.length > 1
    ? `\n\nHINWEIS: Der Vertrag enthält ca. ${preSplit.length} Abschnitte. ` +
      `Erkannte Sektionsnummern: ${preSplit.filter(s => s.sectionNumber).map(s => s.sectionNumber).join(', ')}`
    : '';

  onProgress(16, 'KI extrahiert Klauseln...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.0,
    max_tokens: 8000,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'clause_extraction',
        strict: true,
        schema: CLAUSE_EXTRACTION_SCHEMA
      }
    },
    messages: [
      { role: 'system', content: CLAUSE_EXTRACTION_PROMPT },
      {
        role: 'user',
        content: `Vertragstyp: ${structure.contractTypeLabel || structure.contractType}\n` +
                 `Jurisdiktion: ${structure.jurisdiction || 'Deutschland'}${contextHint}\n\n` +
                 `--- VOLLSTÄNDIGER VERTRAGSTEXT ---\n${truncated}`
      }
    ]
  });

  const result = JSON.parse(response.choices[0].message.content);

  // Assign IDs if not present
  result.clauses = result.clauses.map((clause, i) => ({
    ...clause,
    id: clause.id || `clause_${String(i + 1).padStart(3, '0')}`,
    startPosition: contractText.indexOf(clause.originalText.substring(0, 50)),
    endPosition: null
  }));

  onProgress(20, `${result.clauses.length} Klauseln extrahiert`);

  return {
    result: result.clauses,
    usage: {
      model: 'gpt-4o-mini',
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      costUSD: calculateCost('gpt-4o-mini', response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0)
    }
  };
}

module.exports = { runClauseExtraction };
