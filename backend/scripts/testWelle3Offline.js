// 🛡️ Welle 3 (08.07.2026) — Offline-Suite: Evidence-Verifikation + Coverage-Formel + Flags.
// GPT-frei. Aufruf: node scripts/testWelle3Offline.js
/* eslint-disable no-console */
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'test-dummy-offline';

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

console.log('A) verifyAnalysisEvidence');
const { verifyAnalysisEvidence } = require('../utils/analysisEvidence');

const fullText = `§ 5 Haftung. Die Haftung des Anbieters ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.
§ 7 Laufzeit. Der Vertrag verlängert sich automatisch um jeweils zwölf Monate, wenn er nicht drei Monate vor Ablauf gekündigt wird.
§ 9 Gerichtsstand ist München.`;

// A1: exaktes Zitat → verified true
const r1 = {
  criticalIssues: [
    { title: 'Haftungsbeschränkung', evidence: 'Die Haftung des Anbieters ist auf Vorsatz und grobe Fahrlässigkeit beschränkt.' },
    { title: 'Auto-Renewal', evidence: 'Der Vertrag verlängert sich automatisch um jeweils zwölf Monate' },
  ]
};
let s = verifyAnalysisEvidence(r1, fullText);
check('exakte Zitate → verified:true (2/2)', s.verified === 2 && r1.criticalIssues.every(i => i.evidenceVerified === true));

// A2: Paraphrase → verified false (STRIKT — kein Fuzzy!)
const r2 = { criticalIssues: [{ title: 'X', evidence: 'Der Anbieter haftet nur bei grober Fahrlässigkeit oder Vorsatz.' }] };
s = verifyAnalysisEvidence(r2, fullText);
check('Paraphrase → verified:false', s.failed === 1 && r2.criticalIssues[0].evidenceVerified === false);

// A3: kein evidence → Felder weg, Fund bleibt
const r3 = { criticalIssues: [{ title: 'Fehlende Regelung', description: 'bleibt' }] };
s = verifyAnalysisEvidence(r3, fullText);
check('ohne evidence → Felder weg, Fund unberührt', s.missing === 1 && !('evidenceVerified' in r3.criticalIssues[0]) && r3.criticalIssues[0].description === 'bleibt');

// A4: Längen-Gates
const r4 = { criticalIssues: [{ title: 'kurz', evidence: 'Haftung' }, { title: 'lang', evidence: 'x'.repeat(500) }] };
s = verifyAnalysisEvidence(r4, fullText);
check('zu kurz/zu lang → verified:false (2 failed)', s.failed === 2);

// A5: Umlaut-/Quote-Toleranz (DateHunt-normalize)
const r5 = { criticalIssues: [{ title: 'Umlaut', evidence: 'wenn er nicht drei Monate vor Ablauf gekuendigt wird' }] };
s = verifyAnalysisEvidence(r5, fullText);
check('Umlaut-Variante (ue↔ü) toleriert → verified:true', s.verified === 1);

// A6: Stray-evidence in recommendations wird gestrippt
const r6 = {
  criticalIssues: [],
  recommendations: [{ title: 'R', evidence: 'gestreutes Zitat' }],
  positiveAspects: [{ title: 'P', evidence: 'auch gestreut' }]
};
verifyAnalysisEvidence(r6, fullText);
check('Stray-Keys gestrippt (recommendations/positiveAspects)', !('evidence' in r6.recommendations[0]) && !('evidence' in r6.positiveAspects[0]));

// A7: defensiv — kaputte Inputs crashen nie
check('null-result crasht nicht', (() => { try { verifyAnalysisEvidence(null, fullText); verifyAnalysisEvidence({}, null); return true; } catch { return false; } })());

console.log('B) Coverage-Formel (Spiegel von optimizeTextForGPT4)');
// Kürz-Entscheidung: ceil(len/4) > budget; analyzedChars = budget*3
const estimate = (t) => Math.ceil(t.length / 4);
const budget = 1000;
const small = 'x'.repeat(3900);  // 975 tok ≤ 1000 → nicht gekürzt
const big = 'x'.repeat(4100);    // 1025 tok > 1000 → gekürzt
check('Formel: kleines Doc → truncated false', !(estimate(small) > budget));
check('Formel: großes Doc → truncated true', estimate(big) > budget);
check('Formel: :811-Pfad tot (4B > 3B)', big.length > budget * 3 === true);

console.log('C) Flag-Semantik (Stale-Schutz-Muster)');
// Explizite Schreibweise: === true / || null — simulate
const mkFlags = (result) => ({
  usedFallbackFormat: result.usedFallbackFormat === true,
  pilotTruncated: result.pilotTruncated === true,
  analysisCoverage: result.analysisCoverage || null
});
check('Flags bei sauberem Ergebnis → false/false/null (überschreibt Altwerte)', JSON.stringify(mkFlags({})) === JSON.stringify({ usedFallbackFormat: false, pilotTruncated: false, analysisCoverage: null }));
check('Flags bei Fallback → true', mkFlags({ usedFallbackFormat: true }).usedFallbackFormat === true);

console.log('D) Prompt-Gate (includeEvidence — Default AUS nach A/B-Beweis 09.07.)');
const { generateDeepLawyerLevelPrompt, generateLetterAnalysisPrompt } = require('../routes/analyze');
const sampleText = 'Testvertrag. '.repeat(50);
const defaultProd = generateDeepLawyerLevelPrompt(sampleText, 'service', 'X', 'w3-test', 40000, {});
const optIn = generateDeepLawyerLevelPrompt(sampleText, 'service', 'X', 'w3-test', 40000, { includeEvidence: true });
check('CONTRACT-Prompt DEFAULT (Prod) enthält KEIN evidence (A/B nicht bestanden)', !defaultProd.includes('"evidence"'));
check('CONTRACT-Prompt Opt-in enthält evidence', optIn.includes('"evidence"'));
const letterDefault = generateLetterAnalysisPrompt(sampleText, 'kuendigung_erhalten', 'X', 'w3-test', 40000, {});
const letterOptIn = generateLetterAnalysisPrompt(sampleText, 'kuendigung_erhalten', 'X', 'w3-test', 40000, { includeEvidence: true });
check('LETTER-Prompt DEFAULT enthält KEIN evidence', !letterDefault.includes('"evidence"'));
check('LETTER-Prompt Opt-in enthält evidence', letterOptIn.includes('"evidence"'));

console.log(`\n${fail === 0 ? '🎉' : '💥'} ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
