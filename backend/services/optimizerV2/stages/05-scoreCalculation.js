/**
 * Stage 5: Score Calculation
 *
 * Deterministic scoring based on clause analyses and optimizations.
 * No GPT call needed - pure computation.
 */

function runScoreCalculation(clauses, clauseAnalyses, optimizations, onProgress) {
  onProgress(85, 'Berechne Vertrags-Scores...');

  const analysisMap = new Map();
  for (const a of clauseAnalyses) analysisMap.set(a.clauseId, a);

  const optimizationMap = new Map();
  for (const o of optimizations) optimizationMap.set(o.clauseId, o);

  // Per-clause scores
  const perClause = clauses.map(clause => {
    const analysis = analysisMap.get(clause.id);
    if (!analysis) return { clauseId: clause.id, score: 50 };

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
      score: Math.max(0, Math.min(100, Math.round(score)))
    };
  });

  // Aggregate scores
  const clauseScores = perClause.map(c => c.score);
  const avgScore = clauseScores.length > 0
    ? clauseScores.reduce((a, b) => a + b, 0) / clauseScores.length
    : 50;

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

  // Overall score (weighted average)
  const overall = Math.round(
    avgScore * 0.30 +
    riskScore * 0.25 +
    clarityScore * 0.20 +
    completenessScore * 0.15 +
    marketStandardScore * 0.10
  );

  const scores = {
    overall: Math.max(0, Math.min(100, overall)),
    risk: Math.max(0, Math.min(100, riskScore)),
    clarity: Math.max(0, Math.min(100, clarityScore)),
    completeness: Math.max(0, Math.min(100, completenessScore)),
    marketStandard: Math.max(0, Math.min(100, marketStandardScore)),
    perClause
  };

  onProgress(90, `Vertrags-Score: ${scores.overall}/100`);

  return { result: scores };
}

module.exports = { runScoreCalculation };
