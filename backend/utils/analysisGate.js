/**
 * Freemium-Tease Gate (Phase 1, 19.06.2026) — PURE, deterministisch, ohne Abhängigkeiten.
 * Entscheidet + redigiert: Free-User sehen den Wert-BEWEIS, das Handlungswissen wird
 * server-seitig entfernt (verlässt den Server nie → kein CSS-/Quelltext-Bypass).
 *
 * NOCH NICHT EINGEHÄNGT — nur Baustein + Offline-Test. Wiring/Deploy erst nach Freigabe.
 *
 * Entscheidungen (fixiert mit User 19.06.):
 *  - FREI (Wert-Beweis): Score+Begründung, Kurz-Zusammenfassung, "In einfachen Worten",
 *    Ausgewogenheit, Eckdaten/QuickFacts, Stärken, Termine+Kalender-Erinnerungen, 1 Top-Risiko.
 *  - GESPERRT (Kaufanreiz): restliche Risiken-Details, Empfehlungen, Verbesserungsideen,
 *    ausführliches Gutachten, Rechtssicherheits-Assessment, Marktvergleich, Pilot-Findings.
 *  - Kalender-Erinnerungen bleiben FREI (Retention-Hebel).
 *  - Business/Enterprise: KEIN Gate (No-Op). Org: höchster Plan zählt. Alt-Analysen: grandfathered.
 */

const PAID_PLANS = new Set(['business', 'enterprise']);

// Felder, die für Free komplett entfernt werden (Handlungswissen).
const LOCKED_FIELDS = [
  'legalAssessment', 'suggestions', 'recommendations',
  'detailedLegalOpinion', 'comparison', 'typeSpecificFindings'
];
// Felder, die frei sichtbar bleiben (Wert-Beweis) — NUR zur Doku/Lesbarkeit, nicht angefasst:
//   contractScore, scoreReasoning, summary, laymanSummary, asymmetryAssessment,
//   quickFacts, importantDates, fristHinweise, positiveAspects, upcomingEvents
// Risiken: 1 Top-Risiko bleibt als Kostprobe, Rest wird durch Zähler ersetzt.

function norm(p) { return (p || 'free').toString().toLowerCase(); }

/**
 * Höchster Plan aus User-Plan und (optional) Org-Plan.
 */
function effectivePlan(plan, orgPlan) {
  const a = norm(plan), b = norm(orgPlan);
  if (PAID_PLANS.has(a) || PAID_PLANS.has(b)) {
    // enterprise > business
    if (a === 'enterprise' || b === 'enterprise') return 'enterprise';
    return 'business';
  }
  return 'free';
}

/**
 * Soll für diesen Aufruf gesperrt werden?
 * Modell (19.06.2026, mit User fixiert): Free-User bekommt seine ERSTE Analyse VOLL & gratis
 * (ehrlich zu „erste vollständige Analyse kostenlos" + SEO); ab der 2. Analyse → Tease.
 * @param {{plan?:string, orgPlan?:string, analyzedAt?:Date|string|null, launchDate?:Date|string|null, isFirstAnalysis?:boolean, isUnlocked?:boolean}} o
 * @returns {boolean} true = redigieren
 */
/**
 * Stufe 2: Wurde DIESE Analyse einmalig freigekauft? Liest den Unlock-Marker, den der
 * Stripe-Webhook nach erfolgreichem Einmalkauf am Vertrag setzt (contract.unlock.paid).
 * Defensiv: nimmt das (angereicherte) Contract-Objekt; null/undefined → false.
 */
function isContractUnlocked(contract) {
  return !!(contract && contract.unlock && contract.unlock.paid === true);
}

function shouldGateAnalysis({ plan, orgPlan, analyzedAt, launchDate, isFirstAnalysis, isUnlocked } = {}) {
  if (effectivePlan(plan, orgPlan) !== 'free') return false; // Zahler/Org → nie sperren
  if (isUnlocked === true) return false;                     // Stufe 2: diese Analyse wurde einmalig freigekauft → voll
  if (isFirstAnalysis === true) return false;                // erste Analyse des Free-Users → voll & gratis
  // Grandfathering: vor dem Launch analysierte Verträge bleiben voll sichtbar (kein Wegnehmen).
  if (analyzedAt && launchDate) {
    const a = new Date(analyzedAt).getTime();
    const l = new Date(launchDate).getTime();
    if (!isNaN(a) && !isNaN(l) && a < l) return false;
  }
  return true;
}

/**
 * Entfernt die gesperrten Felder aus einem (angereicherten) Contract-Objekt und
 * ersetzt sie durch Zähler + Marker. Gibt eine FLACHE KOPIE zurück (Original unberührt).
 * 1 Top-Risiko bleibt als Kostprobe.
 */
function redactAnalysisForFree(contract) {
  if (!contract || typeof contract !== 'object') return contract;
  const out = { ...contract };

  // Zähler aus Top-Level ODER (Fallback) aus dem nested analysis-Objekt — je nachdem
  // wo die Daten liegen. So stimmt die "X weitere"-Anzeige im Teaser in beiden Formen.
  const a = (out.analysis && typeof out.analysis === 'object') ? out.analysis : {};
  const pickArr = (top, nested) => Array.isArray(top) && top.length ? top
    : (Array.isArray(nested) && nested.length ? nested : (Array.isArray(top) ? top : []));
  const risksRaw = pickArr(
    Array.isArray(out.risiken) ? out.risiken : out.criticalIssues,
    Array.isArray(a.risiken) ? a.risiken : a.criticalIssues
  );
  const recsRaw = pickArr(out.recommendations, a.recommendations);
  const sugsRaw = pickArr(out.suggestions, a.suggestions);

  // 🔎 Welche GESPERRTEN Felder hatten ÜBERHAUPT Inhalt (vor dem Redigieren)? Nur dann
  // darf das Frontend dort einen Blur-/Schloss-Teaser zeigen — sonst zahlt der User für
  // eine leere Hülle ("noch nicht verfügbar"). Top-Level ODER nested zählt.
  const has = (top, nested) => {
    const pick = (x) => Array.isArray(x) ? x.length > 0 : (typeof x === 'string' ? x.trim().length > 0 : !!x);
    return pick(top) || pick(nested);
  };
  const hadComparison = has(out.comparison, a.comparison);
  const hadOpinion = has(out.detailedLegalOpinion, a.detailedLegalOpinion);
  const hadLegalAssessment = has(out.legalAssessment, a.legalAssessment);
  const hadTypeSpecific = has(out.typeSpecificFindings, a.typeSpecificFindings);

  // 1 Top-Risiko als Kostprobe behalten, Rest sperren
  const teaser = risksRaw.length > 0 ? [risksRaw[0]] : [];
  out.risiken = teaser;
  out.criticalIssues = teaser;

  // Gesperrte Felder entfernen (nicht an den Client senden)
  for (const f of LOCKED_FIELDS) {
    if (f in out) out[f] = null;
  }

  // Auch das verschachtelte analysis-Sub-Objekt säubern.
  // WICHTIG: Das Frontend liest nach (Re-)Analyse BEVORZUGT aus contract.analysis.*
  // (siehe ContractsV2 quickAnalysisModal) — deshalb muss das nested-Objekt GENAU
  // wie die Top-Level-Felder redigiert werden, sonst leakt die volle Analyse.
  if (out.analysis && typeof out.analysis === 'object') {
    out.analysis = { ...out.analysis };
    const nestedRisksRaw = Array.isArray(out.analysis.risiken) ? out.analysis.risiken
      : (Array.isArray(out.analysis.criticalIssues) ? out.analysis.criticalIssues : []);
    const nestedTeaser = nestedRisksRaw.length > 0 ? [nestedRisksRaw[0]] : teaser;
    out.analysis.risiken = nestedTeaser;
    out.analysis.criticalIssues = nestedTeaser;
    for (const f of ['legalAssessment', 'suggestions', 'comparison', 'recommendations', 'detailedLegalOpinion', 'typeSpecificFindings']) {
      if (f in out.analysis) out.analysis[f] = null;
    }
  }

  // 🔒 Legal Lens: eingebettete Klauseln (contract.legalLens.preParsedClauses) sind Premium.
  // Sie kommen sonst über das Vertrags-Objekt am Route-Gate (/api/legal-lens) vorbei → entfernen.
  // Status/Metadaten bleiben (harmlos); nur der Klausel-Inhalt geht raus, Anzahl bleibt als Tease.
  let clauseCount = 0;
  if (out.legalLens && typeof out.legalLens === 'object') {
    const clauses = out.legalLens.preParsedClauses;
    clauseCount = Array.isArray(clauses) ? clauses.length : 0;
    out.legalLens = { ...out.legalLens, preParsedClauses: [] };
  }

  // Marker + Zähler für die Upsell-Anzeige
  out.gated = true;
  out.gatedCounts = {
    risks: risksRaw.length,
    risksShown: teaser.length,
    recommendations: recsRaw.length,
    suggestions: sugsRaw.length,
    clauses: clauseCount,
    // Teaser pro Tab nur zeigen, wenn dort echter Inhalt gesperrt wurde:
    hadComparison,
    hadOpinion,
    hadLegalAssessment,
    hadTypeSpecific
  };

  return out;
}

/**
 * Bequemer Wrapper: gated-Kopie wenn nötig, sonst Original (No-Op für Zahler).
 */
function applyAnalysisGate(contract, opts = {}) {
  // WICHTIG: opts komplett durchreichen (inkl. isFirstAnalysis) — sonst würde die erste
  // Analyse fälschlich gesperrt. (Vom Live-TÜV 19.06. gefangen.)
  if (!shouldGateAnalysis(opts)) return contract;
  return redactAnalysisForFree(contract);
}

module.exports = {
  PAID_PLANS, LOCKED_FIELDS,
  effectivePlan, shouldGateAnalysis, redactAnalysisForFree, applyAnalysisGate, isContractUnlocked
};
