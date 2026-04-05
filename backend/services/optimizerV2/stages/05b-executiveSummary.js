/**
 * Stage 5b: Executive Summary
 *
 * Hybrid approach:
 *   - Deterministic: Traffic light, top risks, fairness verdict, critical gaps
 *   - GPT-4o-mini: Verdict (Gesamtfazit) + Negotiation priorities
 *
 * Falls GPT fehlschlägt → rein deterministischer Fallback.
 */

const { EXECUTIVE_SUMMARY_PROMPT, EXECUTIVE_SUMMARY_SCHEMA } = require('../prompts/systemPrompts');

// ── Importance weights (same as Stage 5) ──
const IMPORTANCE_WEIGHTS = { critical: 2.0, high: 1.5, medium: 1.0, low: 0.5 };

// ── Traffic Light Thresholds ──
function computeTrafficLight(scores, clauseAnalyses) {
  const criticalCount = clauseAnalyses.filter(a =>
    a.strength === 'critical' || a.riskLevel >= 8
  ).length;

  if (scores.overall < 40 || scores.risk < 30 || criticalCount >= 3) {
    return 'red';
  }
  if (scores.overall >= 70 && scores.risk >= 60 && scores.fairness >= 50) {
    return 'green';
  }
  return 'yellow';
}

// ── Traffic Light Labels (document-type aware) ──
const TRAFFIC_LABELS = {
  bilateral_contract: { green: 'Empfehlenswert', yellow: 'Nachverhandeln empfohlen', red: 'Nicht unterschreiben' },
  regulatory_document: { green: 'Konform', yellow: 'Nachbesserungsbedarf', red: 'Schwere Mängel' },
  fallback: { green: 'Gut aufgestellt', yellow: 'Verbesserungsbedarf', red: 'Kritisch' }
};

// ── Top 3 Risks (deterministic) ──
function extractTopRisks(clauses, clauseAnalyses, optimizations) {
  const clauseMap = new Map(clauses.map(c => [c.id, c]));
  const optMap = new Map(optimizations.map(o => [o.clauseId, o]));

  const ranked = clauseAnalyses
    .filter(a => a.riskLevel >= 3 || a.strength === 'weak' || a.strength === 'critical')
    .map(a => {
      const w = IMPORTANCE_WEIGHTS[a.importanceLevel] || 1.0;
      const powerPenalty = { balanced: 0, slightly_one_sided: 1, strongly_one_sided: 3, extremely_one_sided: 5 };
      const compositeRisk = (a.riskLevel || 0) * w + (powerPenalty[a.powerBalance] || 0);
      const clause = clauseMap.get(a.clauseId);
      return { analysis: a, clause, compositeRisk };
    })
    .sort((a, b) => b.compositeRisk - a.compositeRisk)
    .slice(0, 3);

  return ranked.map(({ analysis, clause }) => ({
    clauseId: analysis.clauseId,
    clauseTitle: clause?.title || 'Unbenannte Klausel',
    category: clause?.category || 'other',
    riskLevel: analysis.riskLevel,
    businessImpact: analysis.economicRiskAssessment || analysis.concerns?.[0] || 'Erhöhtes Risiko',
    concern: analysis.concerns?.[0] || 'Verbesserungsbedarf'
  }));
}

// ── Fairness Verdict (deterministic template) ──
function buildFairnessVerdict(scores, clauseAnalyses) {
  const fairness = scores.fairness;
  const oneSidedCount = clauseAnalyses.filter(a =>
    a.powerBalance === 'strongly_one_sided' || a.powerBalance === 'extremely_one_sided'
  ).length;

  if (fairness >= 80 && oneSidedCount === 0) {
    return 'Die Regelungen sind weitgehend ausgewogen — keine einseitigen Klauseln erkannt.';
  }
  if (fairness >= 65) {
    return oneSidedCount > 0
      ? `Überwiegend ausgewogen, jedoch ${oneSidedCount === 1 ? 'enthält eine Klausel' : `enthalten ${oneSidedCount} Klauseln`} einseitige Formulierungen.`
      : 'Insgesamt fair formuliert mit einzelnen Optimierungsmöglichkeiten.';
  }
  if (fairness >= 45) {
    return `Teilweise einseitig formuliert — ${oneSidedCount} Klausel${oneSidedCount !== 1 ? 'n' : ''} weichen vom Marktstandard ab.`;
  }
  return `Deutlich einseitig formuliert — ${oneSidedCount} Klausel${oneSidedCount !== 1 ? 'n' : ''} sind stark zugunsten einer Partei gestaltet.`;
}

// ── Critical Gaps (deterministic) ──
function extractCriticalGaps(scores) {
  return (scores.missingClauses || [])
    .filter(mc => !mc.foundInContent)
    .map(mc => ({
      category: mc.category,
      categoryLabel: mc.categoryLabel,
      severity: mc.severity,
      recommendation: mc.recommendation
    }));
}

// ── Fallback Verdicts ──
const FALLBACK_VERDICTS = {
  green: {
    bilateral_contract: 'Dieser Vertrag ist insgesamt solide aufgestellt. Einzelne Optimierungspunkte sind in der Detailanalyse aufgeführt.',
    regulatory_document: 'Dieses Dokument erfüllt die wesentlichen regulatorischen Anforderungen.'
  },
  yellow: {
    bilateral_contract: 'Dieser Vertrag enthält Klauseln mit Verbesserungsbedarf. Vor Unterzeichnung sollten die markierten Punkte geprüft werden.',
    regulatory_document: 'Dieses Dokument weist Compliance-Lücken auf, die vor Veröffentlichung geschlossen werden sollten.'
  },
  red: {
    bilateral_contract: 'Dieser Vertrag enthält erhebliche Risiken. Eine Unterzeichnung in der aktuellen Form wird nicht empfohlen.',
    regulatory_document: 'Dieses Dokument weist schwere regulatorische Mängel auf und sollte grundlegend überarbeitet werden.'
  }
};

// ── Build compressed GPT context ──
function buildGPTContext(structure, clauseAnalyses, scores, topRisks, criticalGaps) {
  const docCategory = structure.documentCategory || 'bilateral_contract';
  const partiesText = structure.parties?.length > 0
    ? structure.parties.map(p => `${p.role}: ${p.name}`).join(', ')
    : 'nicht identifiziert';

  const topRisksText = topRisks.length > 0
    ? topRisks.map((r, i) => `${i + 1}. ${r.clauseTitle}: ${r.concern} (Risiko ${r.riskLevel}/10)`).join('\n')
    : 'Keine signifikanten Risiken erkannt.';

  const missingText = criticalGaps.length > 0
    ? criticalGaps.map(g => `- ${g.categoryLabel}`).join('\n')
    : 'Keine essentiellen Regelungen fehlen.';

  // Power balance summary
  const pbCounts = { balanced: 0, slightly: 0, strongly: 0, extremely: 0 };
  for (const a of clauseAnalyses) {
    if (a.powerBalance === 'balanced') pbCounts.balanced++;
    else if (a.powerBalance === 'slightly_one_sided') pbCounts.slightly++;
    else if (a.powerBalance === 'strongly_one_sided') pbCounts.strongly++;
    else if (a.powerBalance === 'extremely_one_sided') pbCounts.extremely++;
  }
  const total = clauseAnalyses.length || 1;
  const powerBalanceSummary = `${Math.round(pbCounts.balanced / total * 100)}% ausgewogen, ${Math.round((pbCounts.strongly + pbCounts.extremely) / total * 100)}% einseitig`;

  return {
    contractTypeLabel: structure.contractTypeLabel || structure.contractType || 'Unbekannter Vertragstyp',
    documentCategory: docCategory,
    industry: structure.industry || 'nicht spezifiziert',
    partiesText,
    scores: {
      overall: scores.overall,
      risk: scores.risk,
      fairness: scores.fairness,
      clarity: scores.clarity,
      completeness: scores.completeness
    },
    topRisksText,
    missingClausesText: missingText,
    powerBalanceSummary
  };
}

// ── Main: Run Executive Summary ──
async function runExecutiveSummary(openai, structure, clauses, clauseAnalyses, optimizations, scores, onProgress) {
  const docCategory = structure.documentCategory || 'bilateral_contract';

  // ── Deterministic parts ──
  const trafficLight = computeTrafficLight(scores, clauseAnalyses);
  const labels = TRAFFIC_LABELS[docCategory] || TRAFFIC_LABELS.fallback;
  const trafficLightLabel = labels[trafficLight];
  const topRisks = extractTopRisks(clauses, clauseAnalyses, optimizations);
  const fairnessVerdict = buildFairnessVerdict(scores, clauseAnalyses);
  const criticalGaps = extractCriticalGaps(scores);

  // ── GPT parts (with fallback) ──
  let verdict;
  let negotiationPriorities = [];
  let gptFallback = false;
  let usage = null;

  try {
    const context = buildGPTContext(structure, clauseAnalyses, scores, topRisks, criticalGaps);
    const prompt = EXECUTIVE_SUMMARY_PROMPT(context);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: 'Erstelle die Executive Summary basierend auf den bereitgestellten Analysedaten.' }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'executive_summary', schema: EXECUTIVE_SUMMARY_SCHEMA, strict: true }
      },
      temperature: 0.3,
      max_tokens: 800
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    verdict = parsed.verdict;
    negotiationPriorities = (parsed.negotiationPriorities || []).map((np, i) => ({
      priority: np.priority || i + 1,
      clauseTitle: np.clauseTitle,
      action: np.action,
      businessImpact: np.businessImpact,
      clauseId: topRisks[i]?.clauseId || null
    }));

    const u = response.usage;
    usage = {
      model: 'gpt-4o-mini',
      inputTokens: u?.prompt_tokens || 0,
      outputTokens: u?.completion_tokens || 0,
      costUSD: ((u?.prompt_tokens || 0) * 0.00000015 + (u?.completion_tokens || 0) * 0.0000006)
    };
  } catch (err) {
    console.warn('[OptimizerV2] Executive Summary GPT call failed (using fallback):', err.message);
    gptFallback = true;

    // Fallback verdict
    const fallbackSet = FALLBACK_VERDICTS[trafficLight] || FALLBACK_VERDICTS.yellow;
    verdict = fallbackSet[docCategory] || fallbackSet.bilateral_contract;

    // Fallback negotiation priorities from top risks
    negotiationPriorities = topRisks.map((r, i) => ({
      priority: i + 1,
      clauseTitle: r.clauseTitle,
      action: r.concern,
      businessImpact: r.businessImpact,
      clauseId: r.clauseId
    }));
  }

  onProgress(95, 'Executive Summary erstellt');

  return {
    result: {
      trafficLight,
      trafficLightLabel,
      verdict,
      topRisks,
      fairnessVerdict,
      criticalGaps,
      negotiationPriorities,
      generatedAt: new Date(),
      gptFallback
    },
    usage
  };
}

module.exports = { runExecutiveSummary };
