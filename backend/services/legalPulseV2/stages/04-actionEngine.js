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
 * Build action context from findings + insights.
 * Language affects only labels in the GPT context; underlying data is identical.
 */
function buildActionContext(clauseFindings, portfolioInsights, context, language = "de") {
  const lang = (language || "de").toLowerCase() === "en" ? "en" : "de";
  const L = lang === "en"
    ? { contract: "CONTRACT", unnamed: "Unnamed", type: "Type", provider: "Provider",
        expiresIn: "Expires in", days: "days", autoRenewal: "AUTO-RENEWAL: YES",
        findingsHdr: "FINDINGS:", legalBasis: "Legal basis", enforceability: "Enforceability",
        portfolioHdr: "PORTFOLIO INSIGHTS:" }
    : { contract: "VERTRAG", unnamed: "Unbenannt", type: "Typ", provider: "Anbieter",
        expiresIn: "Ablauf in", days: "Tagen", autoRenewal: "AUTO-RENEWAL: JA",
        findingsHdr: "BEFUNDE:", legalBasis: "Rechtsgrundlage", enforceability: "Durchsetzbarkeit",
        portfolioHdr: "PORTFOLIO-INSIGHTS:" };

  const lines = [];

  // Contract context
  lines.push(`${L.contract}: ${context.contractName || L.unnamed}`);
  if (context.contractType) lines.push(`${L.type}: ${context.contractType}`);
  if (context.provider) lines.push(`${L.provider}: ${context.provider}`);
  if (context.daysUntilExpiry !== null) lines.push(`${L.expiresIn}: ${context.daysUntilExpiry} ${L.days}`);
  if (context.autoRenewal) lines.push(L.autoRenewal);
  lines.push("");

  // Critical, high, and medium findings
  const actionableFindings = (clauseFindings || []).filter(f =>
    f.severity === "critical" || f.severity === "high" || f.severity === "medium"
  );

  if (actionableFindings.length > 0) {
    lines.push(L.findingsHdr);
    for (const f of actionableFindings) {
      lines.push(`  [${f.severity}] ${f.title}: ${f.description}`);
      if (f.legalBasis) lines.push(`    ${L.legalBasis}: ${f.legalBasis}`);
      if (f.enforceability && f.enforceability !== "valid" && f.enforceability !== "unknown") {
        lines.push(`    ${L.enforceability}: ${f.enforceability}`);
      }
    }
    lines.push("");
  }

  // Portfolio insights
  if (portfolioInsights && portfolioInsights.length > 0) {
    lines.push(L.portfolioHdr);
    for (const i of portfolioInsights) {
      lines.push(`  [${i.severity}] ${i.title}: ${i.description}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}

/**
 * Generate deterministic fallback actions from findings when GPT returns none.
 * Language affects only the title/impact/nextStep wording; structure is identical.
 */
function generateFallbackActions(clauseFindings, context, language = "de") {
  const lang = (language || "de").toLowerCase() === "en" ? "en" : "de";
  const actions = [];
  const severityOrder = { critical: 0, high: 1, medium: 2 };

  // Sort findings by severity
  const sorted = [...(clauseFindings || [])]
    .filter(f => f.severity === "critical" || f.severity === "high" || f.severity === "medium")
    .sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  for (const f of sorted.slice(0, 5)) {
    const priority = f.severity === "critical" ? "now" : f.severity === "high" ? "plan" : "watch";
    const isInvalid = f.enforceability === "likely_invalid" || f.enforceability === "questionable";

    const title = lang === "en"
      ? (isInvalid ? `${f.title} — revise clause` : `${f.title} — review`)
      : (isInvalid ? `${f.title} — Klausel überarbeiten` : `${f.title} — prüfen`);

    const estimatedImpact = lang === "en"
      ? (f.severity === "critical" ? "High risk if not addressed" : f.severity === "high" ? "Medium risk" : "Improvement potential")
      : (f.severity === "critical" ? "Hohes Risiko bei Nichthandlung" : f.severity === "high" ? "Mittleres Risiko" : "Verbesserungspotential");

    const nextStep = lang === "en"
      ? (isInvalid
          ? `Revise clause "${f.title}" with legal counsel. Legal basis: ${f.legalBasis || "to be reviewed"}`
          : `Review clause "${f.title}" internally and renegotiate if appropriate`)
      : (isInvalid
          ? `Klausel "${f.title}" mit Rechtsberater überarbeiten. Rechtsgrundlage: ${f.legalBasis || "prüfen"}`
          : `Klausel "${f.title}" intern prüfen und ggf. nachverhandeln`);

    actions.push({
      id: `fallback_${actions.length + 1}`,
      priority,
      title,
      description: f.description,
      relatedContracts: context.contractId ? [context.contractId] : [],
      estimatedImpact,
      confidence: f.confidence,
      nextStep,
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
  // Language for downstream prompts/fallbacks; "de" preserves existing behavior when unset.
  const language = context.language || "de";

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

  const actionContext = buildActionContext(clauseFindings, portfolioInsights, context, language);
  const userPrompt = language === "en"
    ? `Based on the following findings and insights, generate concrete action recommendations in ENGLISH:\n\n${actionContext}`
    : `Basierend auf den folgenden Befunden und Insights, erstelle konkrete Handlungsempfehlungen:\n\n${actionContext}`;

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
      actions: generateFallbackActions(clauseFindings, context, language),
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
  // GPT returns relatedContractIds as filenames (unreliable) — override with actual contractId from context
  const actualContractId = context.contractId || null;
  let actions = (result.actions || [])
    .filter(a => a.confidence >= 70)
    .map((a, idx) => ({
      id: `action_${idx + 1}`,
      ...a,
      relatedContracts: actualContractId ? [actualContractId] : [],
      status: "open",
    }));

  // Fallback: if GPT returned no actions but we have actionable findings, generate deterministic ones
  if (actions.length === 0 && actionableCount > 0) {
    console.log(`[PulseV2] Action Engine: GPT returned 0 actions, generating ${Math.min(actionableCount, 5)} fallback actions`);
    actions = generateFallbackActions(clauseFindings, context, language);
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
