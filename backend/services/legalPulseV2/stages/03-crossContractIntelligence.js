/**
 * Stage 3: Cross-Contract Intelligence
 * Portfolio-level analysis using GPT-4o-mini.
 */

const OpenAI = require("openai");
const { aggregatePortfolio } = require("../utils/portfolioAggregator");
const { detectRelationships } = require("../utils/contractRelationshipDetector");
const { CROSS_CONTRACT_SYSTEM_PROMPT, CROSS_CONTRACT_SCHEMA } = require("../prompts/crossContractPrompts");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
  maxRetries: 1,
});

const PRICES = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
};

/**
 * Build compact portfolio summary for GPT (keep tokens low)
 */
function buildPortfolioSummary(portfolio, deterministicPatterns) {
  const lines = [];

  lines.push(`PORTFOLIO: ${portfolio.totalContracts} Verträge, ${portfolio.analyzedContracts} analysiert, Durchschnittsscore: ${portfolio.averageScore || "N/A"}`);
  lines.push("");

  // Contracts summary
  lines.push("VERTRÄGE:");
  for (const c of portfolio.contracts) {
    const parts = [`[${c.id}] ${c.name}`];
    if (c.contractType !== "unbekannt") parts.push(`Typ: ${c.contractType}`);
    if (c.provider) parts.push(`Anbieter: ${c.provider}`);
    if (c.score !== null) parts.push(`Score: ${c.score}/100`);
    if (c.daysUntilExpiry !== null) parts.push(`Ablauf: ${c.daysUntilExpiry}d`);
    if (c.autoRenewal) parts.push("AUTO-RENEWAL");
    if (c.criticalFindings > 0) parts.push(`${c.criticalFindings} kritische Befunde`);
    if (c.topFindings.length > 0) {
      parts.push(`Top-Risiken: ${c.topFindings.map(f => f.title).join(", ")}`);
    }
    lines.push(parts.join(" | "));
  }

  // Provider groups
  if (portfolio.byProvider.length > 0) {
    lines.push("");
    lines.push("ANBIETER-GRUPPEN:");
    for (const g of portfolio.byProvider) {
      lines.push(`  ${g.provider}: ${g.contracts.length} Verträge (${g.contracts.map(c => c.name).join(", ")})`);
    }
  }

  // Already detected patterns (deterministic)
  if (deterministicPatterns.length > 0) {
    lines.push("");
    lines.push("BEREITS ERKANNTE MUSTER (deterministisch):");
    for (const p of deterministicPatterns) {
      lines.push(`  [${p.severity}] ${p.title}: ${p.description}`);
    }
  }

  return lines.join("\n");
}

/**
 * Stage 3: Cross-Contract Intelligence
 * @param {string} userId
 * @param {function} onProgress
 * @returns {object} { portfolioInsights, costs }
 */
async function runCrossContractIntelligence(userId, onProgress) {
  // Step 1: Aggregate portfolio (no AI)
  onProgress(72, "Aggregiere Portfolio-Daten...", { stage: 3, stageName: "Portfolio Intelligence" });
  const portfolio = await aggregatePortfolio(userId);

  // Need at least 2 analyzed contracts for cross-contract analysis
  if (portfolio.analyzedContracts < 2) {
    return {
      portfolioInsights: [],
      costs: { stage: 3, stageName: "Portfolio Intelligence", model: "none", inputTokens: 0, outputTokens: 0, costUSD: 0 },
    };
  }

  // Step 2: Deterministic pattern detection (no AI)
  onProgress(74, "Erkenne Beziehungsmuster...", { stage: 3, stageName: "Portfolio Intelligence" });
  const deterministicPatterns = detectRelationships(portfolio);

  // Step 3: GPT analysis for deeper insights (conflicts, opportunities)
  onProgress(76, "Analysiere Portfolio-Zusammenhänge...", { stage: 3, stageName: "Portfolio Intelligence" });

  const summary = buildPortfolioSummary(portfolio, deterministicPatterns);
  const userPrompt = `Analysiere das folgende Vertragsportfolio und identifiziere Zusammenhänge, die über die bereits erkannten Muster hinausgehen.\n\nFokus auf:\n- Widersprüche zwischen Verträgen\n- Verbesserungspotential bei Konditionen\n- Risiken, die nur im Portfolio-Kontext sichtbar sind\n\n${summary}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.0,
    max_tokens: 4000,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "cross_contract_insights",
        strict: true,
        schema: CROSS_CONTRACT_SCHEMA,
      },
    },
    messages: [
      { role: "system", content: CROSS_CONTRACT_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const usage = response.usage || {};

  let result;
  try {
    result = JSON.parse(response.choices[0].message.content);
  } catch (parseErr) {
    console.error("[PulseV2] Stage 3 JSON parse failed:", parseErr.message);
    // Return only deterministic patterns (AI insights lost but system remains functional)
    return {
      portfolioInsights: deterministicPatterns.slice(0, 10),
      parseError: true,
      costs: {
        stage: 3,
        stageName: "Portfolio Intelligence",
        model: "gpt-4o-mini",
        inputTokens: usage.prompt_tokens || 0,
        outputTokens: usage.completion_tokens || 0,
        costUSD: ((usage.prompt_tokens || 0) / 1000) * PRICES["gpt-4o-mini"].input +
          ((usage.completion_tokens || 0) / 1000) * PRICES["gpt-4o-mini"].output,
      },
    };
  }

  // Merge deterministic patterns + AI insights, dedup by title
  const allInsights = [...deterministicPatterns];
  const existingTitles = new Set(allInsights.map(p => p.title.toLowerCase()));

  for (const insight of (result.insights || [])) {
    if (insight.confidence >= 60 && !existingTitles.has(insight.title.toLowerCase())) {
      allInsights.push({
        type: insight.type,
        title: insight.title,
        description: insight.description,
        severity: insight.severity,
        relatedContracts: insight.relatedContractIds || [],
        confidence: insight.confidence,
        reasoning: insight.reasoning,
      });
    }
  }

  // Sort by severity
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  allInsights.sort((a, b) => (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5));

  const costUSD = (usage.prompt_tokens / 1000) * PRICES["gpt-4o-mini"].input +
    (usage.completion_tokens / 1000) * PRICES["gpt-4o-mini"].output;

  return {
    portfolioInsights: allInsights.slice(0, 10),
    costs: {
      stage: 3,
      stageName: "Portfolio Intelligence",
      model: "gpt-4o-mini",
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      costUSD,
    },
  };
}

module.exports = { runCrossContractIntelligence };
