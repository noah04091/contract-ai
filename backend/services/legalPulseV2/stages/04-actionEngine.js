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

  // Critical, high, and medium findings
  const actionableFindings = (clauseFindings || []).filter(f =>
    f.severity === "critical" || f.severity === "high" || f.severity === "medium"
  );

  if (actionableFindings.length > 0) {
    lines.push("BEFUNDE:");
    for (const f of actionableFindings) {
      lines.push(`  [${f.severity}] ${f.title}: ${f.description}`);
      if (f.legalBasis) lines.push(`    Rechtsgrundlage: ${f.legalBasis}`);
      if (f.enforceability && f.enforceability !== "valid" && f.enforceability !== "unknown") {
        lines.push(`    Durchsetzbarkeit: ${f.enforceability}`);
      }
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
 * Generate deterministic fallback actions from findings when GPT returns none
 */
function generateFallbackActions(clauseFindings, context) {
  const actions = [];
  const severityOrder = { critical: 0, high: 1, medium: 2 };

  // Sort findings by severity
  const sorted = [...(clauseFindings || [])]
    .filter(f => f.severity === "critical" || f.severity === "high" || f.severity === "medium")
    .sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  for (const f of sorted.slice(0, 5)) {
    const priority = f.severity === "critical" ? "now" : f.severity === "high" ? "plan" : "watch";
    const isInvalid = f.enforceability === "likely_invalid" || f.enforceability === "questionable";

    actions.push({
      id: `fallback_${actions.length + 1}`,
      priority,
      title: isInvalid
        ? `${f.title} — Klausel überarbeiten`
        : `${f.title} — prüfen`,
      description: f.description,
      relatedContracts: [],
      estimatedImpact: f.severity === "critical"
        ? "Hohes Risiko bei Nichthandlung"
        : f.severity === "high"
          ? "Mittleres Risiko"
          : "Verbesserungspotential",
      confidence: f.confidence,
      nextStep: isInvalid
        ? `Klausel "${f.title}" mit Rechtsberater überarbeiten. Rechtsgrundlage: ${f.legalBasis || "prüfen"}`
        : `Klausel "${f.title}" intern prüfen und ggf. nachverhandeln`,
      status: "open",
    });
  }

  return actions;
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
  // Count actionable findings (critical + high + medium)
  const actionableCount = (clauseFindings || []).filter(f =>
    f.severity === "critical" || f.severity === "high" || f.severity === "medium"
  ).length;

  const insightCount = (portfolioInsights || []).length;

  // Skip only if truly nothing to act on
  if (actionableCount === 0 && insightCount === 0) {
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

  const usage = response.usage || {};

  let result;
  try {
    result = JSON.parse(response.choices[0].message.content);
  } catch (parseErr) {
    console.error("[PulseV2] Stage 4 JSON parse failed:", parseErr.message);
    // Fallback to deterministic actions instead of crashing
    const costUSD = ((usage.prompt_tokens || 0) / 1000) * PRICES["gpt-4o"].input +
      ((usage.completion_tokens || 0) / 1000) * PRICES["gpt-4o"].output;
    return {
      actions: generateFallbackActions(clauseFindings, context),
      parseError: true,
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

  // Filter by confidence and add IDs
  let actions = (result.actions || [])
    .filter(a => a.confidence >= 70)
    .map((a, idx) => ({
      id: `action_${idx + 1}`,
      ...a,
      relatedContracts: a.relatedContractIds || [],
      status: "open",
    }));

  // Fallback: if GPT returned no actions but we have actionable findings, generate deterministic ones
  if (actions.length === 0 && actionableCount > 0) {
    console.log(`[PulseV2] Action Engine: GPT returned 0 actions, generating ${Math.min(actionableCount, 5)} fallback actions`);
    actions = generateFallbackActions(clauseFindings, context);
  }

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
