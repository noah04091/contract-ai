/**
 * Stage 1: Structure Recognition
 *
 * Identifies contract type, parties, jurisdiction, dates, and overall maturity.
 * Uses gpt-4o-mini for speed (structural task, not reasoning).
 */
const { STRUCTURE_RECOGNITION_PROMPT, STRUCTURE_RECOGNITION_SCHEMA } = require('../prompts/systemPrompts');
const { smartTruncate } = require('../utils/clauseSplitter');

async function runStructureRecognition(openai, contractText, fileName, onProgress) {
  onProgress(2, 'Erkenne Vertragsstruktur...');

  // Truncate for structure recognition (first 15k chars is enough)
  const truncated = smartTruncate(contractText, 15000);

  onProgress(5, 'Analysiere Vertragstyp und Parteien...');

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.0,
    max_tokens: 1500,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'structure_recognition',
        strict: true,
        schema: STRUCTURE_RECOGNITION_SCHEMA
      }
    },
    messages: [
      { role: 'system', content: STRUCTURE_RECOGNITION_PROMPT },
      {
        role: 'user',
        content: `Analysiere die Struktur dieses Vertrags:\n\nDateiname: ${fileName}\n\n--- VERTRAGSTEXT ---\n${truncated}`
      }
    ]
  });

  let result;
  try {
    result = JSON.parse(response.choices[0].message.content);
  } catch (parseErr) {
    console.error('[OptimizerV2] Stage 1: JSON.parse failed:', parseErr.message, '| Raw content:', (response.choices[0].message.content || '').substring(0, 200));
    result = {
      contractType: 'unknown',
      contractTypeLabel: 'Unbekannter Vertragstyp',
      contractTypeConfidence: 0,
      jurisdiction: 'Deutschland',
      parties: { party1: 'Unbekannt', party2: 'Unbekannt' },
      industry: 'Unbekannt',
      maturityLevel: 'amateur',
      dates: {},
      specialFeatures: []
    };
  }

  onProgress(10, `${result.contractTypeLabel || result.contractType} erkannt (${result.contractTypeConfidence}% Sicherheit)`);

  return {
    result,
    usage: {
      model: 'gpt-4o-mini',
      inputTokens: response.usage?.prompt_tokens || 0,
      outputTokens: response.usage?.completion_tokens || 0,
      costUSD: calculateCost('gpt-4o-mini', response.usage?.prompt_tokens || 0, response.usage?.completion_tokens || 0)
    }
  };
}

function calculateCost(model, inputTokens, outputTokens) {
  const prices = {
    'gpt-4o-mini': { input: 0.00015, output: 0.0006 },  // per 1K tokens
    'gpt-4o': { input: 0.0025, output: 0.01 }
  };
  const p = prices[model] || prices['gpt-4o'];
  return (inputTokens / 1000 * p.input) + (outputTokens / 1000 * p.output);
}

module.exports = { runStructureRecognition, calculateCost };
