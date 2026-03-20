/**
 * Stage 2: Deep Contract Analysis
 * Clause-by-clause AI analysis using GPT-4o with Decision-First logic.
 */

const OpenAI = require("openai");
const { preSplitClauses } = require("../../optimizerV2/utils/clauseSplitter");
const { DEEP_ANALYSIS_SYSTEM_PROMPT, DEEP_ANALYSIS_SCHEMA, getContractTypeHint } = require("../prompts/systemPrompts");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 60000,
  maxRetries: 1,
});

const BATCH_SIZE = 4; // clauses per AI call
const MAX_TOTAL_INPUT_TOKENS = 120000; // safety budget

const PRICES = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
};

function calculateCost(model, inputTokens, outputTokens) {
  const p = PRICES[model] || PRICES["gpt-4o"];
  return (inputTokens / 1000) * p.input + (outputTokens / 1000) * p.output;
}

/**
 * Split text into clauses with IDs
 */
function buildClauseList(cleanedText) {
  const rawClauses = preSplitClauses(cleanedText);

  return rawClauses.map((clause, idx) => ({
    id: `clause_${idx + 1}`,
    title: extractClauseTitle(clause.text),
    originalText: clause.text,
    category: categorizeClause(clause.text, clause.sectionNumber),
    sectionNumber: clause.sectionNumber || `${idx + 1}`,
  }));
}

/**
 * Extract title from first line of clause text
 */
function extractClauseTitle(text) {
  const firstLine = text.split("\n")[0].trim();
  // Remove section numbers from title
  const cleaned = firstLine
    .replace(/^(§\s*\d+[a-z]?\s*[.:\-–]\s*)/i, "")
    .replace(/^(\d+\.?\d*\s*[.:\-–]?\s*)/i, "")
    .replace(/^(Artikel\s+\d+\s*[.:\-–]\s*)/i, "")
    .trim();
  // Truncate long titles
  return cleaned.length > 80 ? cleaned.substring(0, 77) + "..." : cleaned || "Abschnitt";
}

/**
 * Basic clause categorization based on keywords
 */
function categorizeClause(text, sectionNumber) {
  const lower = text.toLowerCase();
  if (/haftung|schadenersatz|gewährleistung/i.test(lower)) return "haftung";
  if (/kündigung|beendigung|laufzeit|vertragsdauer/i.test(lower)) return "kuendigung";
  if (/datenschutz|dsgvo|personenbezogen|daten/i.test(lower)) return "datenschutz";
  if (/geistiges eigentum|urheberrecht|lizenz|patent|marke/i.test(lower)) return "geistiges_eigentum";
  if (/vergütung|zahlung|preis|gebühr|entgelt|honorar/i.test(lower)) return "zahlungen";
  if (/geheimhaltung|vertraulich|verschwiegenheit/i.test(lower)) return "geheimhaltung";
  if (/wettbewerb|konkurrenz|wettbewerbsverbot/i.test(lower)) return "wettbewerb";
  if (/compliance|gesetz|vorschrift|regulierung/i.test(lower)) return "compliance";
  if (/präambel|vorbemerkung|gegenstand|zweck/i.test(lower)) return "vertragsbedingungen";
  return "sonstiges";
}

/**
 * Validate that affectedText actually appears in the clause text.
 * Prevents hallucinated quotes from reaching the user.
 */
function validateAffectedText(finding, clauseOriginalTexts) {
  if (!finding.affectedText || !finding.clauseId) return finding;

  const clauseText = clauseOriginalTexts[finding.clauseId];
  if (!clauseText) return { ...finding, affectedTextVerified: false };

  const affected = finding.affectedText.trim().toLowerCase();
  const clause = clauseText.toLowerCase();

  // Exact substring match
  if (clause.includes(affected)) {
    return { ...finding, affectedTextVerified: true };
  }

  // Fuzzy: check if 60%+ of significant words (length > 3) match
  const words = affected.split(/\s+/).filter(w => w.length > 3);
  if (words.length === 0) return { ...finding, affectedTextVerified: true };
  const matched = words.filter(w => clause.includes(w));
  if (matched.length / words.length >= 0.6) {
    return { ...finding, affectedTextVerified: true, affectedTextApproximate: true };
  }

  // Failed validation — mark as unverified (still included, but flagged)
  return { ...finding, affectedTextVerified: false };
}

/**
 * Run deep analysis on a batch of clauses
 */
async function analyzeClauseBatch(clauses, contractType, parties, batchIndex, totalBatches) {
  const clauseTexts = clauses.map(c =>
    `[Klausel ID: ${c.id}] [Abschnitt: ${c.sectionNumber}]\n${c.originalText}`
  ).join("\n\n---\n\n");

  const typeHint = getContractTypeHint(contractType);
  const systemPrompt = DEEP_ANALYSIS_SYSTEM_PROMPT(contractType, "Deutschland", parties);
  const userPrompt = `${typeHint ? `\nSPEZIFISCHER KONTEXT: ${typeHint}\n\n` : ""}Analysiere die folgenden ${clauses.length} Klauseln (Batch ${batchIndex + 1}/${totalBatches}):\n\n${clauseTexts}`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.0,
    max_tokens: 8000,
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "deep_analysis",
        strict: true,
        schema: DEEP_ANALYSIS_SCHEMA,
      },
    },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const usage = response.usage || {};

  let result;
  try {
    result = JSON.parse(response.choices[0].message.content);
  } catch (parseErr) {
    console.error(`[PulseV2] JSON parse failed for batch ${batchIndex + 1}/${totalBatches}:`, parseErr.message);
    return {
      findings: [],
      inputTokens: usage.prompt_tokens || 0,
      outputTokens: usage.completion_tokens || 0,
      parseError: true,
      failedClauseIds: clauses.map(c => c.id),
    };
  }

  return {
    findings: result.findings || [],
    inputTokens: usage.prompt_tokens || 0,
    outputTokens: usage.completion_tokens || 0,
  };
}

/**
 * Stage 2: Deep Analysis
 * @param {string} cleanedText - Cleaned contract text from Stage 0
 * @param {object} context - Context from Stage 1
 * @param {function} onProgress - Progress callback
 * @returns {object} { clauses, clauseFindings, costs }
 */
async function runDeepAnalysis(cleanedText, context, onProgress) {
  // Build clause list
  const clauses = buildClauseList(cleanedText);
  if (clauses.length === 0) {
    throw new Error("Keine Klauseln im Vertrag gefunden");
  }

  onProgress(25, `${clauses.length} Klauseln erkannt, starte Analyse...`, {
    stage: 2,
    stageName: "Deep Analysis",
    clauseCount: clauses.length,
  });

  // Create batches
  const batches = [];
  for (let i = 0; i < clauses.length; i += BATCH_SIZE) {
    batches.push(clauses.slice(i, i + BATCH_SIZE));
  }

  // Determine contract type and parties for prompts
  const contractType = context.contractType || context._contract?.contractType || "unbekannt";
  const parties = context.parties?.length ? context.parties : (context._contract?.parties || []);

  const allFindings = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  const analyzedClauseIds = new Set();

  // Process batches sequentially (to respect rate limits and track progress)
  for (let i = 0; i < batches.length; i++) {
    // Token budget safety check
    if (totalInputTokens > MAX_TOTAL_INPUT_TOKENS) {
      console.log(`[PulseV2] Token budget exceeded at batch ${i + 1}/${batches.length}, ${clauses.length - analyzedClauseIds.size} clauses skipped`);
      break;
    }

    const progress = 25 + Math.round((i / batches.length) * 40); // 25-65% range
    onProgress(progress, `Analysiere Klauseln ${i * BATCH_SIZE + 1}-${Math.min((i + 1) * BATCH_SIZE, clauses.length)} von ${clauses.length}...`, {
      stage: 2,
      stageName: "Deep Analysis",
      batchProgress: `${i + 1}/${batches.length}`,
    });

    try {
      const result = await analyzeClauseBatch(batches[i], contractType, parties, i, batches.length);
      totalInputTokens += result.inputTokens;
      totalOutputTokens += result.outputTokens;

      // Handle parse errors from batch (JSON parsing failed)
      if (result.parseError) {
        console.warn(`[PulseV2] Batch ${i + 1}: JSON parse failed, ${result.failedClauseIds.length} clauses not analyzed`);
        continue;
      }

      // Mark clauses as successfully analyzed
      for (const c of batches[i]) analyzedClauseIds.add(c.id);

      // Decision Gate validation + confidence filter (>= 60)
      const batchFindings = (result.findings || []).filter(f => {
        // Gate: reject if risk is not grounded in text
        if (f.riskGroundedInText === false) return false;
        // Gate: reject if legal relevance is not clear (except info/opportunity types)
        if (f.legalRelevanceClear === false && f.type !== 'information' && f.type !== 'opportunity') return false;
        // Confidence threshold
        if (f.confidence < 60) return false;
        return true;
      });

      // Confidence-based severity downgrade: 60-69 confidence → cap at "low"
      for (const f of batchFindings) {
        if (f.confidence < 70 && (f.severity === 'medium' || f.severity === 'high')) {
          f.severity = 'low';
        }
      }
      allFindings.push(...batchFindings);

      // Stream findings to frontend after each batch (Progressive Rendering)
      if (batchFindings.length > 0) {
        const batchClauses = batches[i];
        const progressAfter = 25 + Math.round(((i + 1) / batches.length) * 40);
        onProgress(progressAfter, `${allFindings.length} Befunde bisher...`, {
          stage: 2,
          stageName: "Deep Analysis",
          batchProgress: `${i + 1}/${batches.length}`,
          // Progressive data
          findingsBatch: batchFindings,
          clausesBatch: batchClauses.map(c => ({ id: c.id, title: c.title, category: c.category, sectionNumber: c.sectionNumber })),
          totalFindingsSoFar: allFindings.length,
        });
      }
    } catch (err) {
      console.error(`[PulseV2] Batch ${i + 1} failed:`, err.message);
      // Continue with remaining batches
    }
  }

  // Final filter (redundant safety — already filtered per batch, but ensures consistency)
  const filteredFindings = allFindings.filter(f => f.confidence >= 60);

  // Validate affectedText against actual clause text (prevent hallucinated quotes)
  const clauseOriginalTexts = {};
  for (const c of clauses) clauseOriginalTexts[c.id] = c.originalText;
  const validatedFindings = filteredFindings.map(f => validateAffectedText(f, clauseOriginalTexts));

  // Log unverified quotes for monitoring
  const unverifiedCount = validatedFindings.filter(f => f.affectedTextVerified === false).length;
  if (unverifiedCount > 0) {
    console.warn(`[PulseV2] ${unverifiedCount}/${validatedFindings.length} findings have unverified affectedText`);
  }

  // Sort by severity (critical first)
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3, info: 4 };
  validatedFindings.sort((a, b) => (severityOrder[a.severity] || 5) - (severityOrder[b.severity] || 5));

  // Coverage tracking — transparent reporting of analysis completeness
  const coverage = {
    total: clauses.length,
    analyzed: analyzedClauseIds.size,
    notAnalyzed: clauses.length - analyzedClauseIds.size,
    percentage: clauses.length > 0 ? Math.round((analyzedClauseIds.size / clauses.length) * 100) : 100,
  };

  if (coverage.percentage < 100) {
    console.warn(`[PulseV2] Incomplete coverage: ${coverage.analyzed}/${coverage.total} clauses analyzed (${coverage.percentage}%)`);
  }

  const costUSD = calculateCost("gpt-4o", totalInputTokens, totalOutputTokens);

  return {
    clauses,
    clauseFindings: validatedFindings,
    coverage,
    costs: {
      stage: 2,
      stageName: "Deep Analysis",
      model: "gpt-4o",
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      costUSD,
    },
  };
}

module.exports = { runDeepAnalysis, buildClauseList };
