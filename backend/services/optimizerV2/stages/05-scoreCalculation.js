/**
 * Stage 5: Score Calculation
 *
 * Deterministic scoring based on clause analyses and optimizations.
 * No GPT call needed - pure computation.
 * Includes Missing Clause Detection for completeness analysis.
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

// ── Missing Clause Detection ──

// Semantic presence patterns — broader than extraction keywords.
// Detect if a TOPIC exists anywhere in the contract, even in unusual wording.
const CATEGORY_KEYWORDS = {
  termination: /künd|beendig|auflös|rücktritt|vertragsende|laufzeitende|sonderkündig|abberuf|widerruf/i,
  liability: /haftung|schadenersatz|haftungsbeschr|freistellung|schadloshalt|haftet|haften|haftungsausschluss|einstandspflicht/i,
  payment: /vergütung|zahlung|entgelt|preis|honorar|gebühr|faktur|rechnung|fällig|bezahl|kostenübernahme|aufwandserstattung|verzugszins/i,
  data_protection: /datenschutz|dsgvo|personenbezog|privacy|daten.*verarbeit|datensicherheit|auftragsverarbeit|betroffenenrecht/i,
  confidentiality: /vertraulich|geheimhalt|verschwiegenheit|geheim|stillschweigen|betriebsgeheimnis|geschäftsgeheimnis|nda|secret/i,
  warranty: /gewährleist|garantie|mängel|nachbesser|sachmangel|rechtsmangel|mängelansprüch|beschaffenheit/i,
  ip_rights: /urheberrecht|nutzungsrecht|geist.*eigentum|lizenz|patent|markenrecht|verwertungsrecht|schutzrecht|werknutzung/i,
  non_compete: /wettbewerb.*verbot|konkurrenz.*verbot|abwerbe.*verbot|karenz|wettbewerbsbeschränk|konkurrenzklausel/i,
  force_majeure: /höhere gewalt|force majeure|unvorhersehbar.*ereignis|außerhalb.*kontrolle|nicht zu vertreten|unabwendbar|pandemie.*leistungspflicht/i,
  dispute_resolution: /streit|schlichtung|schiedsgericht|gerichtsstand|mediation|schiedsverfahren|anwendbares recht|zuständiges gericht/i,
  sla: /service.level|verfügbarkeit|uptime|sla|reaktionszeit|erreichbarkeit/i,
  deliverables: /lieferung|abnahme|leistungsumfang|deliverable|werkleistung|arbeitsergebnis/i,
  duration: /laufzeit|vertragsdauer|vertragsbeginn|mindestlaufzeit|verlänger|befrist/i
};

// German labels for missing clause recommendations
const CATEGORY_LABELS_DE = {
  termination: 'Kündigung / Vertragsbeendigung',
  liability: 'Haftung / Haftungsbeschränkung',
  payment: 'Vergütung / Zahlungsbedingungen',
  data_protection: 'Datenschutz / DSGVO',
  confidentiality: 'Vertraulichkeit / Geheimhaltung',
  warranty: 'Gewährleistung / Garantie',
  ip_rights: 'Geistiges Eigentum / Urheberrecht',
  non_compete: 'Wettbewerbsverbot',
  force_majeure: 'Höhere Gewalt',
  dispute_resolution: 'Streitbeilegung / Gerichtsstand',
  sla: 'Service Level Agreement',
  deliverables: 'Leistungen / Lieferumfang',
  duration: 'Laufzeit / Vertragsdauer'
};

/**
 * Determine essential categories based on contract type.
 */
function getEssentialCategories(contractType) {
  const type = (contractType || '').toLowerCase();

  if (type.includes('arbeit') || type.includes('employment') || type.includes('anstellung'))
    return ['payment', 'termination', 'liability', 'non_compete', 'confidentiality', 'data_protection', 'duration'];
  if (type.includes('nda') || type.includes('geheimhalt') || type.includes('vertraulich'))
    return ['confidentiality', 'termination', 'liability', 'data_protection', 'duration'];
  if (type.includes('lizenz') || type.includes('license') || type.includes('software'))
    return ['ip_rights', 'payment', 'liability', 'termination', 'warranty', 'data_protection'];
  if (type.includes('saas') || type.includes('cloud') || type.includes('hosting'))
    return ['sla', 'payment', 'liability', 'termination', 'data_protection', 'warranty'];
  if (type.includes('kauf') || type.includes('purchase'))
    return ['payment', 'warranty', 'liability', 'termination', 'deliverables'];
  if (type.includes('miet') || type.includes('pacht') || type.includes('lease'))
    return ['payment', 'termination', 'liability', 'duration', 'warranty'];
  if (type.includes('factor'))
    return ['payment', 'liability', 'termination', 'data_protection', 'confidentiality', 'duration'];
  if (type.includes('dienst') || type.includes('service') || type.includes('beratung') || type.includes('consult'))
    return ['payment', 'termination', 'liability', 'confidentiality', 'data_protection', 'warranty'];
  if (type.includes('werk') || type.includes('project'))
    return ['payment', 'termination', 'liability', 'deliverables', 'warranty', 'data_protection'];
  if (type.includes('kooperation') || type.includes('rahmen'))
    return ['payment', 'termination', 'liability', 'confidentiality', 'data_protection', 'ip_rights', 'duration'];

  // Default: common commercial contract essentials
  return ['payment', 'termination', 'liability', 'confidentiality', 'data_protection'];
}

/**
 * Normalize text for robust keyword matching.
 * Handles Umlaut encoding issues from PDF extraction.
 */
function normalizeText(text) {
  return (text || '')
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
}

/**
 * Count keyword hits for a category across all clause text.
 * Returns { titleHits, bodyHits, totalScore }.
 */
function countKeywordHits(clauses, pattern) {
  let titleHits = 0;
  let bodyHits = 0;

  for (const clause of clauses) {
    const titleNorm = normalizeText(clause.title);
    const bodyNorm = normalizeText(clause.originalText);

    // Count distinct matches in title (each match = 1 hit)
    const titleMatches = titleNorm.match(new RegExp(pattern.source, 'gi'));
    if (titleMatches) titleHits += titleMatches.length;

    const bodyMatches = bodyNorm.match(new RegExp(pattern.source, 'gi'));
    if (bodyMatches) bodyHits += bodyMatches.length;
  }

  return { titleHits, bodyHits, totalScore: titleHits * 2 + bodyHits };
}

/**
 * Detect missing essential clauses with three-tier detection.
 *
 * Results per category:
 *   - present (category assigned)         → full credit (1.0)
 *   - foundInContent, strong (score >= 3) → good credit (0.7)
 *   - foundInContent, weak (score 1-2)    → partial credit (0.4)
 *   - not found                           → no credit (0.0)
 */
function detectMissingClauses(clauses, structure) {
  const contractType = structure?.contractType || '';
  const essentialCategories = getEssentialCategories(contractType);
  const presentCategories = new Set(clauses.map(c => c.category));

  const missingClauses = [];
  let completenessHits = 0;

  // Pre-normalize patterns with Umlaut-safe versions
  const normalizedPatterns = {};
  for (const [cat, pattern] of Object.entries(CATEGORY_KEYWORDS)) {
    // Create Umlaut-safe version of pattern
    const safeSource = pattern.source
      .replace(/ä/g, '(?:ä|ae)').replace(/ö/g, '(?:ö|oe)')
      .replace(/ü/g, '(?:ü|ue)').replace(/ß/g, '(?:ß|ss)');
    normalizedPatterns[cat] = new RegExp(safeSource, 'i');
  }

  for (const cat of essentialCategories) {
    // Direct category match
    if (presentCategories.has(cat)) {
      completenessHits++;
      continue;
    }

    // Semantic presence detection with hit counting
    const pattern = normalizedPatterns[cat] || CATEGORY_KEYWORDS[cat];
    const hits = pattern ? countKeywordHits(clauses, pattern) : { titleHits: 0, bodyHits: 0, totalScore: 0 };

    const severity = CATEGORY_IMPORTANCE_FLOOR[cat] || 'medium';
    const label = CATEGORY_LABELS_DE[cat] || cat;

    if (hits.totalScore >= 3) {
      // Strong presence — topic clearly exists but as part of another clause
      completenessHits += 0.7;
      missingClauses.push({
        category: cat, categoryLabel: label, severity, foundInContent: true,
        recommendation: `Inhalte zu "${label}" sind im Vertrag vorhanden, aber nicht als eigenständige Klausel ausgewiesen.`
      });
    } else if (hits.totalScore >= 1) {
      // Weak presence — topic mentioned but not substantively addressed
      completenessHits += 0.4;
      missingClauses.push({
        category: cat, categoryLabel: label, severity, foundInContent: true,
        recommendation: `"${label}" wird im Vertrag nur am Rande erwähnt. Eine ausführliche Regelung wird empfohlen.`
      });
    } else {
      // Not found at all
      missingClauses.push({
        category: cat, categoryLabel: label, severity, foundInContent: false,
        recommendation: `Keine Regelung zu "${label}" erkannt. Eine explizite Klausel wird dringend empfohlen.`
      });
    }
  }

  const completenessScore = essentialCategories.length > 0
    ? Math.round((completenessHits / essentialCategories.length) * 100)
    : 100;

  return { missingClauses, completenessScore, essentialCount: essentialCategories.length };
}

function runScoreCalculation(clauses, clauseAnalyses, optimizations, structure, onProgress) {
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

  // Completeness score + Missing Clause Detection
  const { missingClauses, completenessScore } = detectMissingClauses(clauses, structure);

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
    perClause,
    missingClauses
  };

  onProgress(90, `Vertrags-Score: ${scores.overall}/100`);

  return { result: scores };
}

module.exports = { runScoreCalculation };
