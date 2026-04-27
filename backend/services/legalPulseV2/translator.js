/**
 * Legal Pulse V2 — On-demand result translator.
 *
 * Translates an existing analysis result's user-facing strings (findings,
 * actions, portfolio insights, clause titles) into the requested target
 * language via GPT-4o-mini. Used by the language-toggle endpoint to lazy-
 * populate the per-result translation cache.
 *
 * NEVER touches technical fields:
 *  - clauseId, action.id, insight.idx (stable identifiers)
 *  - severity, type, category, enforceability (German tag IDs used by Stage 5)
 *  - confidence, scores, dates, costs (numeric / structural)
 *
 * Cost: ~3-5k input tokens + ~3-5k output tokens per translation.
 * GPT-4o-mini at $0.15/$0.60 per 1M tokens → ~$0.003 per translation.
 */

const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120000,
  maxRetries: 1,
});

const PRICES = {
  "gpt-4o-mini": { input: 0.00015, output: 0.0006 },
};

function buildSystemPrompt(targetLang) {
  const isEn = targetLang === "en";
  const sourceLangName = isEn ? "German" : "English";
  const targetLangName = isEn ? "English" : "German";

  return `You are a professional legal translator. Translate the provided JSON payload from ${sourceLangName} to ${targetLangName}.

CRITICAL RULES:
1. Translate ONLY the user-facing string fields: title, description, legalBasis, reasoning, nextStep, estimatedImpact.
2. NEVER translate or alter: clauseId, id, idx — these are stable technical identifiers.
3. Preserve legal terminology accurately. Cite legal norms as they appear (e.g. "§ 307 BGB", "UCC § 2-302", "Directive 93/13/EEC") — translate the surrounding sentence but keep statute references intact.
4. Tone: professional, lawyer-briefing-client. Match the existing register; do not add fluff or change meaning.
5. If a field is empty or missing in the source, return an empty string for it.
6. Return the IDENTICAL JSON STRUCTURE with only the human-readable fields translated. Preserve array order.

Respond ONLY in the specified JSON format.`;
}

/**
 * Build a compact source payload from a LegalPulseV2Result document.
 * Plain-old-object input only — pass result.toObject() if it's a Mongoose doc.
 */
function buildSourcePayload(result) {
  return {
    findings: (result.clauseFindings || []).map(f => ({
      clauseId: f.clauseId,
      title: f.title || "",
      description: f.description || "",
      legalBasis: f.legalBasis || "",
      reasoning: f.reasoning || "",
    })),
    actions: (result.actions || []).map(a => ({
      id: a.id,
      title: a.title || "",
      description: a.description || "",
      nextStep: a.nextStep || "",
      estimatedImpact: a.estimatedImpact || "",
    })),
    insights: (result.portfolioInsights || []).map((p, idx) => ({
      idx,
      title: p.title || "",
      description: p.description || "",
      reasoning: p.reasoning || "",
    })),
    clauseTitles: (result.clauses || []).map(c => ({
      id: c.id,
      title: c.title || "",
    })),
  };
}

/**
 * Translate a result's user-facing strings into the target language.
 *
 * @param {object} result - Plain object (not a Mongoose doc). Pass result.toObject().
 * @param {"de"|"en"} targetLang - Target language.
 * @returns {Promise<{ findings, actions, insights, clauseTitles, translatedAt, costs }>}
 */
async function translateResult(result, targetLang) {
  if (targetLang !== "de" && targetLang !== "en") {
    throw new Error(`Invalid targetLang: ${targetLang}`);
  }

  const sourcePayload = buildSourcePayload(result);

  // If there's nothing to translate, return an empty cache entry to avoid pointless GPT calls.
  const totalItems =
    sourcePayload.findings.length +
    sourcePayload.actions.length +
    sourcePayload.insights.length +
    sourcePayload.clauseTitles.length;
  if (totalItems === 0) {
    return {
      findings: [],
      actions: [],
      insights: [],
      clauseTitles: {},
      translatedAt: new Date(),
      costs: { model: "none", inputTokens: 0, outputTokens: 0, costUSD: 0 },
    };
  }

  const systemPrompt = buildSystemPrompt(targetLang);
  const userPrompt = `Translate the following JSON to ${targetLang === "en" ? "English" : "German"}, preserving structure exactly:\n\n${JSON.stringify(sourcePayload)}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.0,
    max_tokens: 8000,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const usage = response.usage || {};
  const costUSD =
    ((usage.prompt_tokens || 0) / 1000) * PRICES["gpt-4o-mini"].input +
    ((usage.completion_tokens || 0) / 1000) * PRICES["gpt-4o-mini"].output;

  let translated;
  try {
    translated = JSON.parse(response.choices[0].message.content);
  } catch (parseErr) {
    console.error("[PulseV2 Translator] JSON parse failed:", parseErr.message);
    throw new Error("Translation response could not be parsed");
  }

  // Convert clauseTitles array to map keyed by clauseId for O(1) frontend lookup
  const clauseTitlesMap = {};
  for (const ct of (translated.clauseTitles || [])) {
    if (ct && ct.id) clauseTitlesMap[ct.id] = ct.title || "";
  }

  return {
    findings: Array.isArray(translated.findings) ? translated.findings : [],
    actions: Array.isArray(translated.actions) ? translated.actions : [],
    insights: Array.isArray(translated.insights) ? translated.insights : [],
    clauseTitles: clauseTitlesMap,
    translatedAt: new Date(),
    costs: {
      model: "gpt-4o-mini",
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      costUSD,
    },
  };
}

module.exports = { translateResult };
