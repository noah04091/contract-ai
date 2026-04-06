/**
 * Stage 5b: Executive Summary V2
 *
 * Kompaktes "Anwalt-Freund" TL;DR — ein Block, keine Listen.
 *
 * Hybrid approach:
 *   - Deterministic: Traffic light (Ampel)
 *   - GPT-4o-mini: Verdict + Strengths + Weaknesses + Action
 *   - Fallback: Template-basiert wenn GPT fehlschlägt
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

// ── Top 3 Risks (used internally for GPT context, not stored in result) ──
function extractTopRisks(clauses, clauseAnalyses) {
  const clauseMap = new Map(clauses.map(c => [c.id, c]));

  return clauseAnalyses
    .filter(a => a.riskLevel >= 3 || a.strength === 'weak' || a.strength === 'critical')
    .map(a => {
      const w = IMPORTANCE_WEIGHTS[a.importanceLevel] || 1.0;
      const powerPenalty = { balanced: 0, slightly_one_sided: 1, strongly_one_sided: 3, extremely_one_sided: 5 };
      const compositeRisk = (a.riskLevel || 0) * w + (powerPenalty[a.powerBalance] || 0);
      const clause = clauseMap.get(a.clauseId);
      return { analysis: a, clause, compositeRisk };
    })
    .sort((a, b) => b.compositeRisk - a.compositeRisk)
    .slice(0, 3)
    .map(({ analysis, clause }) => ({
      clauseTitle: clause?.title || 'Unbenannte Klausel',
      riskLevel: analysis.riskLevel,
      concern: analysis.concerns?.[0] || 'Verbesserungsbedarf'
    }));
}

// ── Build compressed GPT context ──
function buildGPTContext(structure, clauseAnalyses, scores, topRisks, criticalGaps, trafficLight, trafficLightLabel) {
  const docCategory = structure.documentCategory || 'bilateral_contract';
  const partiesText = structure.parties?.length > 0
    ? structure.parties.map(p => `${p.role}: ${p.name}`).join(', ')
    : 'nicht identifiziert';

  const topRisksText = topRisks.length > 0
    ? topRisks.map((r, i) => `${i + 1}. ${r.clauseTitle}: ${r.concern} (Risiko ${r.riskLevel}/10)`).join('\n')
    : 'Keine signifikanten Risiken erkannt.';

  const missingText = criticalGaps.length > 0
    ? criticalGaps.map(g => `- ${g}`).join('\n')
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
    trafficLight,
    trafficLightLabel,
    scores: {
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

// ── Fallback Templates (deterministic, used when GPT fails) ──
const FALLBACK = {
  green: {
    bilateral_contract: {
      verdict: 'Dieser Vertrag ist insgesamt solide aufgestellt und professionell formuliert. Einzelne Optimierungsmöglichkeiten sind in der Detailanalyse aufgeführt.',
      strengths: 'Klare Struktur, professionelle Formulierungen und ausgewogene Regelungen.',
      weaknesses: 'Keine wesentlichen Schwächen erkannt.',
      actionRequired: 'Kann in der vorliegenden Form verwendet werden.'
    },
    regulatory_document: {
      verdict: 'Dieses Dokument erfüllt die wesentlichen regulatorischen Anforderungen und ist professionell aufgebaut.',
      strengths: 'Vollständige Regelungen und klare Formulierungen.',
      weaknesses: 'Keine wesentlichen Mängel erkannt.',
      actionRequired: 'Kann in der vorliegenden Form verwendet werden.'
    }
  },
  yellow: {
    bilateral_contract: {
      verdict: 'Dieser Vertrag enthält Klauseln mit Verbesserungsbedarf. Vor Unterzeichnung sollten die markierten Punkte geprüft werden.',
      strengths: 'Professionelle Grundstruktur vorhanden.',
      weaknesses: 'Einzelne Klauseln mit einseitigen Formulierungen oder erhöhtem Risiko.',
      actionRequired: 'Die in der Detailanalyse markierten Klauseln vor Unterzeichnung nachverhandeln.'
    },
    regulatory_document: {
      verdict: 'Dieses Dokument weist Lücken auf, die vor Veröffentlichung geschlossen werden sollten.',
      strengths: 'Grundlegende Regelungen vorhanden.',
      weaknesses: 'Einzelne Bereiche unvollständig oder nicht marktkonform.',
      actionRequired: 'Die markierten Punkte vor Veröffentlichung überarbeiten.'
    }
  },
  red: {
    bilateral_contract: {
      verdict: 'Dieser Vertrag enthält erhebliche Risiken. Eine Unterzeichnung in der aktuellen Form wird nicht empfohlen.',
      strengths: 'Grundlegende Vertragsstruktur vorhanden.',
      weaknesses: 'Mehrere kritische Klauseln mit erheblichem Risikopotential.',
      actionRequired: 'Grundlegende Überarbeitung der kritischen Klauseln erforderlich bevor eine Unterzeichnung in Betracht kommt.'
    },
    regulatory_document: {
      verdict: 'Dieses Dokument weist schwere regulatorische Mängel auf und sollte grundlegend überarbeitet werden.',
      strengths: 'Grundstruktur vorhanden.',
      weaknesses: 'Schwere Mängel in zentralen Bereichen.',
      actionRequired: 'Grundlegende Überarbeitung vor Veröffentlichung oder Verwendung erforderlich.'
    }
  }
};

// ── Main: Run Executive Summary ──
async function runExecutiveSummary(openai, structure, clauses, clauseAnalyses, optimizations, scores, onProgress) {
  const docCategory = structure.documentCategory || 'bilateral_contract';

  // ── Deterministic: Traffic Light ──
  const trafficLight = computeTrafficLight(scores, clauseAnalyses);
  const labels = TRAFFIC_LABELS[docCategory] || TRAFFIC_LABELS.fallback;
  const trafficLightLabel = labels[trafficLight];

  // Internal data for GPT context (not stored in result)
  const topRisks = extractTopRisks(clauses, clauseAnalyses);
  const criticalGapLabels = (scores.missingClauses || [])
    .filter(mc => !mc.foundInContent)
    .map(mc => mc.categoryLabel);

  // ── GPT: Verdict + Strengths + Weaknesses + Action ──
  let verdict, strengths, weaknesses, actionRequired;
  let gptFallback = false;
  let usage = null;

  try {
    const context = buildGPTContext(structure, clauseAnalyses, scores, topRisks, criticalGapLabels, trafficLight, trafficLightLabel);
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
      max_tokens: 600
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    verdict = parsed.verdict;
    strengths = parsed.strengths;
    weaknesses = parsed.weaknesses;
    actionRequired = parsed.actionRequired;

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

    const fallbackSet = FALLBACK[trafficLight] || FALLBACK.yellow;
    const fb = fallbackSet[docCategory] || fallbackSet.bilateral_contract;
    verdict = fb.verdict;
    strengths = fb.strengths;
    weaknesses = fb.weaknesses;
    actionRequired = fb.actionRequired;
  }

  onProgress(95, 'Executive Summary erstellt');

  return {
    result: {
      trafficLight,
      trafficLightLabel,
      verdict,
      strengths,
      weaknesses,
      actionRequired,
      generatedAt: new Date(),
      gptFallback
    },
    usage
  };
}

module.exports = { runExecutiveSummary };
