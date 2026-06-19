/**
 * TÜV (Phase 4) — READ-ONLY End-to-End-Beweis des Freemium-Gate an ECHTEN DB-Daten.
 * Nimmt einen realen analysierten Vertrag und spielt alle Plan-/Szenario-Fälle durch das Gate.
 * node backend/scripts/tuevAnalysisGateLive.js  — 100% lesend, nichts verändert.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');
const { applyAnalysisGate } = require('../utils/analysisGate');

const LOCKED = ['legalAssessment', 'suggestions', 'recommendations', 'detailedLegalOpinion', 'comparison', 'typeSpecificFindings'];
let pass = 0, fail = 0;
const ok = (n, c, i = '') => { if (c) { pass++; console.log(`  ✅ ${n}${i ? ' — ' + i : ''}`); } else { fail++; console.log(`  ❌ ${n}${i ? ' — ' + i : ''}`); } };
const len = (v) => Array.isArray(v) ? v.length : (v ? 1 : 0);

async function main() {
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  const db = client.db('contract_ai');

  // Realen, reich analysierten Vertrag suchen (mehrere Risiken + Gutachten)
  const c = await db.collection('contracts').findOne({
    analyzed: true,
    'criticalIssues.1': { $exists: true },       // ≥2 Risiken
    detailedLegalOpinion: { $type: 'string', $ne: '' }
  });
  if (!c) { console.log('Kein passender Vertrag gefunden (≥2 Risiken + Gutachten).'); await client.close(); return; }

  const riskCount = len(c.criticalIssues);
  const recCount = len(c.recommendations);
  const clauseCount = Array.isArray(c.legalLens?.preParsedClauses) ? c.legalLens.preParsedClauses.length : 0;
  console.log(`\n📄 Test-Vertrag: "${c.name}" — ${riskCount} Risiken, ${recCount} Empfehlungen, ${clauseCount} Legal-Lens-Klauseln, Gutachten ${c.detailedLegalOpinion.length} Zeichen\n`);

  // ── Szenario 1: Free, NICHT erste Analyse → muss redigiert werden ──
  console.log('── Szenario 1: Free-User, zweite Analyse (GESPERRT) ──');
  const g = applyAnalysisGate(c, { plan: 'free', isFirstAnalysis: false, launchDate: '2026-06-20', analyzedAt: '2026-06-25' });
  ok('gated-Marker gesetzt', g.gated === true);
  ok('genau 1 Risiko sichtbar (Kostprobe)', len(g.criticalIssues) === 1, `vorher ${riskCount}`);
  ok('gatedCounts.risks korrekt', g.gatedCounts?.risks === riskCount);
  LOCKED.forEach(f => ok(`${f} entfernt/nicht geleakt`, g[f] == null)); // null ODER undefined = nicht im Response
  ok('Legal-Lens-Klauseln geleert', !g.legalLens || (Array.isArray(g.legalLens.preParsedClauses) && g.legalLens.preParsedClauses.length === 0));
  ok('Score bleibt (Wert-Beweis)', g.contractScore === c.contractScore);
  ok('Zusammenfassung bleibt', JSON.stringify(g.summary) === JSON.stringify(c.summary));
  ok('importantDates bleibt (Kalender frei)', JSON.stringify(g.importantDates) === JSON.stringify(c.importantDates));

  // ── Szenario 2: Free, ERSTE Analyse → voll ──
  console.log('\n── Szenario 2: Free-User, ERSTE Analyse (voll & gratis) ──');
  const g2 = applyAnalysisGate(c, { plan: 'free', isFirstAnalysis: true, launchDate: '2026-06-20', analyzedAt: '2026-06-25' });
  ok('NICHT gated', g2.gated === undefined);
  ok('alle Risiken da', len(g2.criticalIssues) === riskCount);
  ok('Gutachten da', typeof g2.detailedLegalOpinion === 'string' && g2.detailedLegalOpinion.length > 0);

  // ── Szenario 3: Business → unberührt ──
  console.log('\n── Szenario 3: Business-User (unberührt) ──');
  const g3 = applyAnalysisGate(c, { plan: 'business', isFirstAnalysis: false });
  ok('NICHT gated', g3.gated === undefined);
  ok('alle Risiken da', len(g3.criticalIssues) === riskCount);
  ok('Gutachten da', typeof g3.detailedLegalOpinion === 'string' && g3.detailedLegalOpinion.length > 0);
  ok('Legal-Lens-Klauseln da', clauseCount === 0 || (g3.legalLens?.preParsedClauses?.length === clauseCount));

  // ── Szenario 4: Grandfathered (alt) → voll ──
  console.log('\n── Szenario 4: Free, ALT-Analyse vor Launch (grandfathered) ──');
  const g4 = applyAnalysisGate(c, { plan: 'free', isFirstAnalysis: false, launchDate: '2026-06-20', analyzedAt: '2026-06-01' });
  ok('NICHT gated (grandfathered)', g4.gated === undefined);
  ok('alle Risiken da', len(g4.criticalIssues) === riskCount);

  // ── Original-Unversehrtheit ──
  console.log('\n── Original-DB-Objekt unverändert? ──');
  ok('Original criticalIssues unverändert', len(c.criticalIssues) === riskCount);
  ok('Original detailedLegalOpinion unverändert', typeof c.detailedLegalOpinion === 'string' && c.detailedLegalOpinion.length > 0);

  console.log(`\n════════ TÜV-ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen ════════\n`);
  await client.close();
  process.exit(fail === 0 ? 0 : 1);
}
main().catch(e => { console.error('Fehler:', e.message, e.stack); process.exit(1); });
