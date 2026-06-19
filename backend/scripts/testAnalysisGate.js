/**
 * Offline-Beweis für den Freemium-Tease-Gate (utils/analysisGate.js).
 * node backend/scripts/testAnalysisGate.js
 * Beweist: Free → redigiert (1 Risiko + Zähler, Handlungswissen weg, Wert-Beweis bleibt);
 * Business/Enterprise/Org-Business/grandfathered → UNBERÜHRT (bit-identisch).
 */
const { shouldGateAnalysis, redactAnalysisForFree, applyAnalysisGate, effectivePlan } = require('../utils/analysisGate');

let pass = 0, fail = 0;
const ok = (n, c, i = '') => { if (c) { pass++; console.log(`  ✅ ${n}${i ? ' — ' + i : ''}`); } else { fail++; console.log(`  ❌ ${n}${i ? ' — ' + i : ''}`); } };

const LAUNCH = '2026-06-20T00:00:00.000Z';

// Realistisches angereichertes Contract-Objekt (wie GET /contracts/:id es liefert)
const makeContract = () => ({
  _id: 'x', name: 'Vertrag.pdf', contractScore: 65, scoreReasoning: 'Solide, einige Risiken.',
  summary: ['Punkt A', 'Punkt B'], laymanSummary: ['Einfach erklärt 1'],
  asymmetryAssessment: { rating: 'fair', favoredParty: 'Anbieter' },
  quickFacts: [{ k: 'Laufzeit', v: '12 Monate' }], positiveAspects: ['Stärke 1', 'Stärke 2'],
  importantDates: [{ type: 'end_date', date: '2027-01-01' }], fristHinweise: [{ label: 'Kündigung' }],
  upcomingEvents: [{ type: 'CONTRACT_END' }],
  risiken: [{ title: 'Risiko 1' }, { title: 'Risiko 2' }, { title: 'Risiko 3' }],
  criticalIssues: [{ title: 'Risiko 1' }, { title: 'Risiko 2' }, { title: 'Risiko 3' }],
  recommendations: ['Empf 1', 'Empf 2'], suggestions: ['Idee 1', 'Idee 2', 'Idee 3'],
  legalAssessment: ['Rechtssicherheit Detail A', 'B', 'C'],
  detailedLegalOpinion: 'Sehr langes ausführliches Gutachten...',
  comparison: 'Marktvergleich-Text', typeSpecificFindings: [{ check: 'Pilot 1' }],
  legalLens: { preprocessStatus: 'completed', preParsedClauses: [{ t: 'Klausel 1' }, { t: 'Klausel 2' }], metadata: { x: 1 } },
  analysis: { summary: ['Punkt A'], legalAssessment: ['Detail'], suggestions: ['Idee'], comparison: 'X', contractScore: 65 }
});

console.log('\n════════ shouldGateAnalysis — wer wird gesperrt? ════════');
ok('Free, neu → GESPERRT', shouldGateAnalysis({ plan: 'free', analyzedAt: '2026-06-25', launchDate: LAUNCH }) === true);
ok('Business → NICHT gesperrt', shouldGateAnalysis({ plan: 'business', analyzedAt: '2026-06-25', launchDate: LAUNCH }) === false);
ok('Enterprise → NICHT gesperrt', shouldGateAnalysis({ plan: 'enterprise' }) === false);
ok('Free in Business-Org (höchster Plan) → NICHT gesperrt', shouldGateAnalysis({ plan: 'free', orgPlan: 'business' }) === false);
ok('Free, ALT-Analyse vor Launch (grandfathered) → NICHT gesperrt', shouldGateAnalysis({ plan: 'free', analyzedAt: '2026-06-10', launchDate: LAUNCH }) === false);
ok('Free, kein Plan angegeben → default free → GESPERRT', shouldGateAnalysis({ analyzedAt: '2026-06-25', launchDate: LAUNCH }) === true);
ok('effectivePlan(free, enterprise) === enterprise', effectivePlan('free', 'enterprise') === 'enterprise');
// 🆕 Modell „erste Analyse voll & gratis"
ok('Free, ERSTE Analyse → NICHT gesperrt (voll & gratis)', shouldGateAnalysis({ plan: 'free', isFirstAnalysis: true, analyzedAt: '2026-06-25', launchDate: LAUNCH }) === false);
ok('Free, ZWEITE Analyse (isFirstAnalysis=false) → GESPERRT', shouldGateAnalysis({ plan: 'free', isFirstAnalysis: false, analyzedAt: '2026-06-25', launchDate: LAUNCH }) === true);
ok('Business, erste/nicht-erste egal → NICHT gesperrt', shouldGateAnalysis({ plan: 'business', isFirstAnalysis: false }) === false);

console.log('\n════════ redactAnalysisForFree — was bleibt, was geht? ════════');
const orig = makeContract();
const g = redactAnalysisForFree(orig);

// Wert-Beweis bleibt
ok('Score bleibt', g.contractScore === 65);
ok('scoreReasoning bleibt', g.scoreReasoning === 'Solide, einige Risiken.');
ok('laymanSummary bleibt', Array.isArray(g.laymanSummary) && g.laymanSummary.length === 1);
ok('asymmetryAssessment bleibt', g.asymmetryAssessment && g.asymmetryAssessment.rating === 'fair');
ok('quickFacts bleibt', Array.isArray(g.quickFacts) && g.quickFacts.length === 1);
ok('positiveAspects bleibt', Array.isArray(g.positiveAspects) && g.positiveAspects.length === 2);
ok('importantDates bleibt (Kalender frei)', Array.isArray(g.importantDates) && g.importantDates.length === 1);
ok('fristHinweise bleibt (Kalender frei)', Array.isArray(g.fristHinweise) && g.fristHinweise.length === 1);
ok('upcomingEvents bleibt (Kalender frei)', Array.isArray(g.upcomingEvents) && g.upcomingEvents.length === 1);

// 1 Risiko-Kostprobe, Rest gesperrt
ok('genau 1 Top-Risiko sichtbar (Kostprobe)', Array.isArray(g.risiken) && g.risiken.length === 1 && g.risiken[0].title === 'Risiko 1');
ok('criticalIssues ebenfalls auf 1 reduziert', Array.isArray(g.criticalIssues) && g.criticalIssues.length === 1);

// Handlungswissen weg
ok('recommendations entfernt', g.recommendations === null);
ok('suggestions entfernt', g.suggestions === null);
ok('detailedLegalOpinion entfernt', g.detailedLegalOpinion === null);
ok('legalAssessment entfernt', g.legalAssessment === null);
ok('comparison entfernt', g.comparison === null);
ok('typeSpecificFindings entfernt', g.typeSpecificFindings === null);
ok('analysis.legalAssessment entfernt (Sub-Objekt)', g.analysis.legalAssessment === null);
ok('analysis.summary bleibt (Wert-Beweis im Sub-Objekt)', Array.isArray(g.analysis.summary));

// Legal Lens: eingebettete Klauseln raus (Bypass übers Vertrags-Objekt geschlossen), Anzahl bleibt
ok('legalLens.preParsedClauses geleert', Array.isArray(g.legalLens.preParsedClauses) && g.legalLens.preParsedClauses.length === 0);
ok('legalLens.preprocessStatus bleibt (harmlos)', g.legalLens.preprocessStatus === 'completed');
ok('gatedCounts.clauses === 2', g.gatedCounts.clauses === 2);
ok('ORIGINAL legalLens unverändert (2 Klauseln)', orig.legalLens.preParsedClauses.length === 2);

// Marker + Zähler korrekt
ok('gated-Marker gesetzt', g.gated === true);
ok('gatedCounts.risks === 3', g.gatedCounts.risks === 3);
ok('gatedCounts.recommendations === 2', g.gatedCounts.recommendations === 2);
ok('gatedCounts.suggestions === 3', g.gatedCounts.suggestions === 3);

// Original unberührt (flache Kopie)
ok('ORIGINAL unverändert: recommendations noch da', Array.isArray(orig.recommendations) && orig.recommendations.length === 2);
ok('ORIGINAL unverändert: 3 Risiken noch da', Array.isArray(orig.risiken) && orig.risiken.length === 3);

console.log('\n════════ applyAnalysisGate — No-Op für Zahler ════════');
const paid = applyAnalysisGate(makeContract(), { plan: 'business' });
ok('Business: detailedLegalOpinion UNBERÜHRT', typeof paid.detailedLegalOpinion === 'string' && paid.detailedLegalOpinion.length > 0);
ok('Business: 3 Risiken UNBERÜHRT', paid.risiken.length === 3);
ok('Business: kein gated-Marker', paid.gated === undefined);
ok('Business: legalLens-Klauseln UNBERÜHRT', paid.legalLens.preParsedClauses.length === 2);
const grand = applyAnalysisGate(makeContract(), { plan: 'free', analyzedAt: '2026-06-10', launchDate: LAUNCH });
ok('Grandfathered: 3 Risiken UNBERÜHRT', grand.risiken.length === 3 && grand.gated === undefined);
// 🛡️ Regress-Schutz: Wrapper MUSS isFirstAnalysis durchreichen (Live-TÜV-Bug 19.06.)
const firstViaWrapper = applyAnalysisGate(makeContract(), { plan: 'free', isFirstAnalysis: true, analyzedAt: '2026-06-25', launchDate: LAUNCH });
ok('applyAnalysisGate reicht isFirstAnalysis durch → erste Analyse UNBERÜHRT', firstViaWrapper.risiken.length === 3 && firstViaWrapper.gated === undefined);
const secondViaWrapper = applyAnalysisGate(makeContract(), { plan: 'free', isFirstAnalysis: false, analyzedAt: '2026-06-25', launchDate: LAUNCH });
ok('applyAnalysisGate: zweite Analyse → GESPERRT', secondViaWrapper.gated === true && secondViaWrapper.risiken.length === 1);

console.log('\n════════════════════════════════════════════════');
console.log(`ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen`);
console.log('════════════════════════════════════════════════\n');
process.exit(fail === 0 ? 0 : 1);
