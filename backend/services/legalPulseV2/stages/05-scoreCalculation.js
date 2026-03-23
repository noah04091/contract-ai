/**
 * Stage 5: Health Score Calculation
 * Deterministic scoring — no AI calls.
 */

const SEVERITY_WEIGHTS = {
  critical: 25,
  high: 15,
  medium: 8,
  low: 3,
  info: 0,
};

const CATEGORY_IMPORTANCE = {
  haftung: 2.0,
  kuendigung: 1.8,
  datenschutz: 1.7,
  compliance: 1.6,
  zahlungen: 1.6,
  geheimhaltung: 1.3,
  wettbewerb: 1.3,
  geistiges_eigentum: 1.2,
  vertragsbedingungen: 1.0,
  sonstiges: 0.8,
};

const ENFORCEABILITY_PENALTY = {
  likely_invalid: 15,
  questionable: 7,
  valid: 0,
  unknown: 0,
};

/**
 * Calculate risk sub-score from findings
 */
function calculateRiskScore(findings) {
  if (!findings || findings.length === 0) return 100;

  // Track occurrence count per severity for diminishing returns
  const severityCounts = {};

  let totalPenalty = 0;
  for (const f of findings) {
    if (f.type !== "risk" && f.type !== "compliance") continue;
    const severity = f.severity || "medium";
    severityCounts[severity] = (severityCounts[severity] || 0) + 1;

    const severityWeight = SEVERITY_WEIGHTS[severity] || 0;
    const categoryWeight = CATEGORY_IMPORTANCE[f.category] || 1.0;
    const confidenceFactor = (f.confidence || 70) / 100;
    const enforceabilityPenalty = ENFORCEABILITY_PENALTY[f.enforceability] || 0;

    // Diminishing returns: each additional finding of same severity has less impact
    // 1st = 100%, 2nd = 71%, 3rd = 58%, 4th = 50%, 5th = 45%...
    const diminishingFactor = 1 / Math.sqrt(severityCounts[severity]);

    totalPenalty += (severityWeight * categoryWeight * confidenceFactor * diminishingFactor) + enforceabilityPenalty;
  }

  // Cap penalty at 90 (never go fully to 0)
  return Math.max(10, Math.round(100 - Math.min(90, totalPenalty)));
}

/**
 * Calculate compliance sub-score
 */
function calculateComplianceScore(findings) {
  const complianceFindings = (findings || []).filter(f => f.type === "compliance");
  if (complianceFindings.length === 0) return 95;

  let penalty = 0;
  for (const f of complianceFindings) {
    penalty += SEVERITY_WEIGHTS[f.severity] || 0;
  }

  return Math.max(10, Math.round(100 - Math.min(80, penalty * 1.5)));
}

/**
 * Calculate terms sub-score (how favorable are the terms)
 * A contract with standard terms but no opportunities is still "okay" (65-70),
 * not punished to 40 just because there are no explicit opportunities.
 */
function calculateTermsScore(findings) {
  const opportunities = (findings || []).filter(f => f.type === "opportunity").length;
  const risks = (findings || []).filter(f => f.type === "risk").length;
  const infos = (findings || []).filter(f => f.type === "information").length;

  // Base: 75 (a standard contract with no notable issues starts here)
  let score = 75;

  // Each risk finding penalizes (weighted by severity)
  for (const f of (findings || [])) {
    if (f.type !== "risk") continue;
    const penalty = { critical: 15, high: 10, medium: 5, low: 2, info: 0 }[f.severity] || 3;
    score -= penalty;
  }

  // Opportunities improve the score
  score += opportunities * 5;

  // Info findings about branchenstandard are slightly positive (contract is well-documented)
  score += Math.min(infos * 1, 10);

  return Math.max(20, Math.min(100, Math.round(score)));
}

/**
 * Calculate completeness sub-score (are all important categories covered?)
 * Uses contract-type-specific essential categories so an NDA isn't penalized
 * for missing "zahlungen" while a SaaS contract IS penalized for missing "datenschutz".
 */
function calculateCompletenessScore(clauses, contractType) {
  // Universal essentials — every contract should address liability and termination
  const baseEssentials = ["haftung", "kuendigung"];

  // Type-specific additions
  const typeSpecific = {
    saas: ["datenschutz", "zahlungen"],
    hosting: ["datenschutz", "zahlungen"],
    arbeitsvertrag: ["zahlungen", "datenschutz"],
    mietvertrag: ["zahlungen"],
    dienstleistung: ["zahlungen"],
    factoring: ["zahlungen"],
    leasing: ["zahlungen"],
    darlehen: ["zahlungen"],
    versicherung: ["zahlungen"],
    nda: ["geheimhaltung"],
    freelancer: ["zahlungen"],
    bauvertrag: ["zahlungen"],
    pachtvertrag: ["zahlungen"],
    maklervertrag: ["zahlungen"],
    franchisevertrag: ["zahlungen", "wettbewerb"],
    handelsvertreter: ["zahlungen", "wettbewerb"],
  };

  const type = (contractType || "").toLowerCase().replace(/[-\s]/g, "");
  const extras = typeSpecific[type] || ["zahlungen", "datenschutz"];
  const essentials = [...new Set([...baseEssentials, ...extras])];

  const presentCategories = new Set((clauses || []).map(c => c.category));
  let covered = 0;
  for (const cat of essentials) {
    if (presentCategories.has(cat)) covered++;
  }

  return Math.round((covered / essentials.length) * 100);
}

/**
 * Calculate contract age factor (0-100, older = lower)
 */
function calculateContractAgeFactor(startDate) {
  if (!startDate) return 50;
  const ageYears = (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24 * 365);
  if (ageYears < 1) return 100;
  if (ageYears < 3) return 80;
  if (ageYears < 5) return 60;
  if (ageYears < 10) return 40;
  return 20;
}

/**
 * Calculate deadline proximity factor (0-100, closer = lower)
 */
function calculateDeadlineProximityFactor(daysUntilExpiry) {
  if (daysUntilExpiry === null || daysUntilExpiry === undefined) return 50;
  if (daysUntilExpiry < 0) return 10; // expired
  if (daysUntilExpiry < 30) return 25;
  if (daysUntilExpiry < 90) return 50;
  if (daysUntilExpiry < 180) return 70;
  return 90;
}

/**
 * Calculate historical trend factor (0-100)
 */
function calculateHistoricalTrendFactor(riskTrend) {
  switch (riskTrend) {
    case "improving": return 80;
    case "stable": return 60;
    case "declining": return 30;
    default: return 50;
  }
}

/**
 * Stage 5: Calculate Health Score
 * @param {Array} clauses - Clause list from Stage 2
 * @param {Array} findings - Findings from Stage 2
 * @param {object} context - Context from Stage 1
 * @returns {object} Scores object
 */
function runScoreCalculation(clauses, findings, context) {
  const risk = calculateRiskScore(findings);
  const compliance = calculateComplianceScore(findings);
  const terms = calculateTermsScore(findings);
  const completeness = calculateCompletenessScore(clauses, context.contractType);

  const riskSeverity = risk;
  const contractAge = calculateContractAgeFactor(context.startDate);
  const deadlineProximity = calculateDeadlineProximityFactor(context.daysUntilExpiry);
  const historicalTrend = calculateHistoricalTrendFactor(context.riskTrend);

  // Weighted overall score (completeness 15%, compliance 20%)
  const rawOverall = Math.round(
    risk * 0.35 +
    compliance * 0.20 +
    terms * 0.15 +
    completeness * 0.15 +
    contractAge * 0.05 +
    deadlineProximity * 0.05 +
    historicalTrend * 0.05
  );

  // Completeness cap: contracts missing essential clauses cannot score above a threshold.
  // Prevents "false healthy" scores when important sections are simply absent.
  const maxFromCompleteness = completeness >= 100 ? 100 : Math.round(50 + completeness * 0.5);
  const overall = Math.min(rawOverall, maxFromCompleteness);

  return {
    overall: Math.max(0, Math.min(100, overall)),
    risk,
    compliance,
    terms,
    completeness,
    factors: {
      riskSeverity,
      contractAge,
      deadlineProximity,
      historicalTrend,
    },
  };
}

module.exports = { runScoreCalculation };
