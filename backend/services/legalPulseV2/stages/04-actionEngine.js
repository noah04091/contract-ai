/**
 * Stage 4: Action Engine
 * Translates findings + insights into concrete action recommendations using GPT-4o.
 */

const OpenAI = require("openai");
const { ACTION_ENGINE_SYSTEM_PROMPT, ACTION_ENGINE_SCHEMA } = require("../prompts/crossContractPrompts");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
  maxRetries: 1,
});

const PRICES = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
};

/**
 * Build action context from findings + insights
 */
function buildActionContext(clauseFindings, portfolioInsights, context) {
  const lines = [];

  // Contract context
  lines.push(`VERTRAG: ${context.contractName || "Unbenannt"}`);
  if (context.contractType) lines.push(`Typ: ${context.contractType}`);
  if (context.provider) lines.push(`Anbieter: ${context.provider}`);
  if (context.daysUntilExpiry !== null) lines.push(`Ablauf in: ${context.daysUntilExpiry} Tagen`);
  if (context.autoRenewal) lines.push("AUTO-RENEWAL: JA");
  lines.push("");

  // Critical and high findings
  const urgentFindings = (clauseFindings || []).filter(f =>
    f.severity === "critical" || f.severity === "high"
  );

  if (urgentFindings.length > 0) {
    lines.push("DRINGENDE BEFUNDE:");
    for (const f of urgentFindings) {
      lines.push(`  [${f.severity}] ${f.title}: ${f.description}`);
      if (f.legalBasis) lines.push(`    Rechtsgrundlage: ${f.legalBasis}`);
    }
    lines.push("");
  }

  // Portfolio insights
  if (portfolioInsights && portfolioInsights.length > 0) {
    lines.push("PORTFOLIO-INSIGHTS:");
    for (const i of portfolioInsights) {
      lines.push(`  [${i.severity}] ${i.title}: ${i.description}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Stage 4: Action Engine
 * @param {Array} clauseFindings - From Stage 2
 * @param {Array} portfolioInsights - From Stage 3
 * @param {object} context - From Stage 1
 * @param {function} onProgress
 * @returns {object} { actions, costs }
 */
async function runActionEngine(clauseFindings, portfolioInsights, context, onProgress) {
  // Skip if no significant findings
  const urgentCount = (clauseFindings || []).filter(f =>
    f.severity === "critical" || f.severity === "high"
  ).length;

  const insightCount = (portfolioInsights || []).length;

  if (urgentCount === 0 && insightCount === 0) {
    return {
      actions: [],
      costs: { stage: 4, stageName: "Action Engine", model: "none", inputTokens: 0, outputTokens: 0, costUSD: 0 },
    };
  }

  onProgress(82, "Generiere Handlungsempfehlungen...", { stage: 4, stageName: "Action Engine" });

  const actionContext = buildActionContext(clauseFindings, portfolioInsights, context);
  const userPrompt = `Basierend auf den folgenden Befunden und Insights, erstelle konkrete Handlungsempfehlungen:\n\n${actionContext}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.0,
    max_tokens: 4000,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "action_recommendations",
        strict: true,
        schema: ACTION_ENGINE_SCHEMA,
      },
    },
    messages: [
      { role: "system", content: ACTION_ENGINE_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const result = JSON.parse(response.choices[0].message.content);
  const usage = response.usage || {};

  // Filter by confidence and add IDs
  const actions = (result.actions || [])
    .filter(a => a.confidence >= 70)
    .map((a, idx) => ({
      id: `action_${idx + 1}`,
      ...a,
      relatedContracts: a.relatedContractIds || [],
      status: "open",
    }));

  const costUSD = (usage.prompt_tokens / 1000) * PRICES["gpt-4o"].input +
    (usage.completion_tokens / 1000) * PRICES["gpt-4o"].output;

  return {
    actions,
    costs: {
      stage: 4,
      stageName: "Action Engine",
      model: "gpt-4o",
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      costUSD,
    },
  };
}

module.exports = { runActionEngine };
