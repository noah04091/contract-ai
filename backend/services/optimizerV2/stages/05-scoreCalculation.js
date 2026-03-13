/**
 * Stage 5: Score Calculation
 *
 * Deterministic scoring based on clause analyses and optimizations.
 * No GPT call needed - pure computation.
 */

// Category-based importance fallback (mirrors Stage 3 heuristic)
const CATEGORY_IMPORTANCE_FLOOR = {
  liability: 'critical', ip_rights: 'critical', data_protection: 'critical', non_compete: 'critical',
  payment: 'high', termination: 'high', warranty: 'high', penalties: 'high',
  duration: 'high', confidentiality: 'high',
  insurance: 'medium', compliance: 'medium', sla: 'medium', deliverables: 'medium',
  force_majeure: 'medium', dispute_resolution: 'medium', subject: 'medium',
  parties: 'low', general_provisions: 'low', amendments: 'low', other: 'low'
};

function runScoreCalculation(clauses, clauseAnalyses, optimizations, onProgress) {
  onProgress(85, 'Berechne Vertrags-Scores...');

  const analysisMap = new Map();
  for (const a of clauseAnalyses) analysisMap.set(a.clauseId, a);

  const optimizationMap = new Map();
  for (const o of optimizations) optimizationMap.set(o.clauseId, o);

  // Importance weights for overall score calculation
  const importanceWeights = { critical: 2.0, high: 1.5, medium: 1.0, low: 0.5 };

  // Per-clause scores
  const perClause = clauses.map(clause => {
    const analysis = analysisMap.get(clause.id);
    if (!analysis) return { clauseId: clause.id, score: 50, importanceLevel: CATEGORY_IMPORTANCE_FLOOR[clause.category] || 'medium' };

    let score = 50; // baseline

    // Strength bonus/penalty
    const strengthScores = { strong: 30, adequate: 15, weak: -10, critical: -25 };
    score += strengthScores[analysis.strength] || 0;

    // Risk penalty (0-10 scale → 0-20 penalty)
    score -= (analysis.riskLevel || 0) * 2;

    // Concerns penalty
    score -= Math.min((analysis.concerns?.length || 0) * 3, 15);

    // Legal references bonus (well-researched clause)
    score += Math.min((analysis.legalReferences?.length || 0) * 2, 10);

    return {
      clauseId: clause.id,
      score: Math.max(0, Math.min(100, Math.round(score))),
      importanceLevel: analysis.importanceLevel || CATEGORY_IMPORTANCE_FLOOR[clause.category] || 'medium'
    };
  });

  // Weighted average score (important clauses count more)
  let weightedSum = 0;
  let weightTotal = 0;
  for (const pc of perClause) {
    const w = importanceWeights[pc.importanceLevel] || 1.0;
    weightedSum += pc.score * w;
    weightTotal += w;
  }
  const avgScore = weightTotal > 0 ? weightedSum / weightTotal : 50;

  // Risk score (inverse of average risk)
  const risks = clauseAnalyses.map(a => a.riskLevel || 0);
  const avgRisk = risks.length > 0 ? risks.reduce((a, b) => a + b, 0) / risks.length : 0;
  const riskScore = Math.round(100 - (avgRisk * 10));

  // Clarity score (based on strength distribution)
  const strengthCounts = { strong: 0, adequate: 0, weak: 0, critical: 0 };
  for (const a of clauseAnalyses) {
    if (a.strength && strengthCounts.hasOwnProperty(a.strength)) {
      strengthCounts[a.strength]++;
    }
  }
  const total = clauseAnalyses.length || 1;
  const clarityScore = Math.round(
    (strengthCounts.strong / total * 100) +
    (strengthCounts.adequate / total * 70) +
    (strengthCounts.weak / total * 30) +
    (strengthCounts.critical / total * 10)
  );

  // Completeness score (based on key categories present)
  const essentialCategories = ['termination', 'liability', 'payment', 'data_protection', 'confidentiality'];
  const presentCategories = new Set(clauses.map(c => c.category));
  const completenessHits = essentialCategories.filter(cat => presentCategories.has(cat)).length;
  const completenessScore = Math.round((completenessHits / essentialCategories.length) * 100);

  // Market standard score (based on optimization needs)
  const optimizable = optimizations.filter(o => o.needsOptimization).length;
  const marketStandardScore = Math.round(100 - (optimizable / Math.max(clauses.length, 1) * 60));

  // ── NEW: Fairness score (based on power balance + market comparison) ──
  const powerBalanceScores = { balanced: 100, slightly_one_sided: 70, strongly_one_sided: 35, extremely_one_sided: 10 };
  const marketComparisonScores = { below_market: 90, market_standard: 80, slightly_strict: 55, significantly_strict: 30, unusually_disadvantageous: 10 };

  let fairnessWeightedSum = 0;
  let fairnessWeightTotal = 0;
  for (const a of clauseAnalyses) {
    const imp = importanceWeights[a.importanceLevel || 'medium'] || 1.0;
    const pbScore = powerBalanceScores[a.powerBalance] || 70;
    const mcScore = marketComparisonScores[a.marketComparison] || 80;
    // Combine power balance (60%) and market comparison (40%)
    const clauseFairness = pbScore * 0.6 + mcScore * 0.4;
    fairnessWeightedSum += clauseFairness * imp;
    fairnessWeightTotal += imp;
  }
  const fairnessScore = fairnessWeightTotal > 0 ? Math.round(fairnessWeightedSum / fairnessWeightTotal) : 70;

  // Overall score (weighted average — fairness is now a major factor)
  const overall = Math.round(
    avgScore * 0.25 +
    riskScore * 0.20 +
    fairnessScore * 0.20 +
    clarityScore * 0.15 +
    completenessScore * 0.10 +
    marketStandardScore * 0.10
  );

  const scores = {
    overall: Math.max(0, Math.min(100, overall)),
    risk: Math.max(0, Math.min(100, riskScore)),
    fairness: Math.max(0, Math.min(100, fairnessScore)),
    clarity: Math.max(0, Math.min(100, clarityScore)),
    completeness: Math.max(0, Math.min(100, completenessScore)),
    marketStandard: Math.max(0, Math.min(100, marketStandardScore)),
    perClause
  };

  onProgress(90, `Vertrags-Score: ${scores.overall}/100`);

  return { result: scores };
}

module.exports = { runScoreCalculation };
