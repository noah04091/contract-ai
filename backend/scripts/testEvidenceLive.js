// 🛡️ Welle 3 (09.07.2026) — LIVE-A/B-BEWEIS für das evidence-Feld am Herzstück.
// Frage: Verändert das zusätzliche optionale evidence-Feld die Analyse-Qualität?
// Methode: je Vertrag 2× OHNE (Rausch-Baseline) + 2× MIT, gleiche Config wie Prod
// (gpt-4o, json_object, temp 0.1, seed 42). Harte Deploy-Kriterien:
//   K1: |avgScore MIT − avgScore OHNE| ≤ max(3, Baseline-Rauschen)
//   K2: Stabile Kern-Risiken (in BEIDEN OHNE-Läufen) finden sich in MIT wieder (≥ alle−1)
//   K3: Verified-Quote der gelieferten evidence ≥ 60%
// Aufruf: node scripts/testEvidenceLive.js   (braucht .env mit OPENAI_API_KEY)
/* eslint-disable no-console */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { generateDeepLawyerLevelPrompt, resolveSystemPrompt } = require('../routes/analyze');
const { verifyAnalysisEvidence } = require('../utils/analysisEvidence');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TEST_DIR = path.join(__dirname, '..', '..', 'test-contracts');

// Echte PDFs bevorzugt (pdfkit-generierte Testdateien lösen in pdf-parse
// „bad XRef entry" aus — bekannte Harness-Falle, betrifft Prod nicht).
const CANDIDATES = [
  ['real_factoring_eisqueen.pdf', 'factoring'],
  ['real_factoring_adam_reuter.pdf', 'factoring'],
  ['real_versicherungspolice.pdf', 'insurance'],
  ['Mietvertrag_Version_B_Wohnung.pdf', 'rental'],
  ['SaaS_Version_A_CloudPlatform.pdf', 'service'],
];

// 🧪 11.07.2026: Modell via EVIDENCE_AB_MODEL übersteuerbar (Default gpt-4o = bisheriges
// Verhalten 1:1). Reasoning-Modelle (gpt-5.x) bekommen den Shim wie in analyze.js/
// testModelABLive.js: max_completion_tokens, kein temperature/seed/max_tokens.
const AB_MODEL = process.env.EVIDENCE_AB_MODEL || 'gpt-4o';
const AB_IS_REASONING = /^(gpt-5|o[0-9])/.test(AB_MODEL);
if (AB_MODEL !== 'gpt-4o') console.log(`🧪 Evidence-A/B läuft mit Modell: ${AB_MODEL} (reasoning=${AB_IS_REASONING})`);

async function analyzeOnce(text, contractType, includeEvidence, tag) {
  const userPrompt = generateDeepLawyerLevelPrompt(text, contractType, 'AB', `ab-${tag}`, 40000, { includeEvidence });
  const systemPrompt = resolveSystemPrompt('CONTRACT', contractType);
  const completion = await openai.chat.completions.create({
    model: AB_MODEL,
    ...(AB_IS_REASONING ? { max_completion_tokens: 16000 } : { temperature: 0.1, seed: 42, max_tokens: 8000 }),
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
  });
  const raw = completion.choices[0].message.content || '{}';
  const parsed = JSON.parse(raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  return parsed;
}

const normTitle = (t) => String(t || '').toLowerCase().replace(/[^a-zäöüß0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const titleWords = (t) => normTitle(t).split(' ').filter(w => w.length > 4);
function titlesMatch(a, b) {
  const wa = titleWords(a), wb = titleWords(b);
  if (!wa.length || !wb.length) return normTitle(a) === normTitle(b);
  const overlap = wa.filter(w => wb.includes(w)).length;
  return overlap / Math.min(wa.length, wb.length) >= 0.5;
}
const issueTitles = (r) => (Array.isArray(r.criticalIssues) ? r.criticalIssues : []).map(i => (typeof i === 'string' ? i : i?.title)).filter(Boolean);

(async () => {
  const files = CANDIDATES.filter(([f]) => fs.existsSync(path.join(TEST_DIR, f)));
  if (files.length < 2) { console.error(`💥 Zu wenige Test-PDFs in ${TEST_DIR} gefunden (${files.length})`); process.exit(1); }
  console.log(`📚 ${files.length} Test-Verträge: ${files.map(f => f[0]).join(', ')}\n`);

  let k1Fail = 0, k2Fail = 0;
  let totalEvidence = 0, totalVerified = 0;
  const scoreDiffs = [], baselineNoises = [];

  let analyzed = 0;
  for (const [file, ctype] of files) {
    if (analyzed >= 3) break; // 3 Verträge reichen (12 Calls)
    let text;
    try {
      const buf = fs.readFileSync(path.join(TEST_DIR, file));
      text = (await pdfParse(buf)).text;
      if (!text || text.trim().length < 500) { console.warn(`⏭️ ${file}: zu wenig Text — übersprungen`); continue; }
    } catch (parseErr) {
      console.warn(`⏭️ ${file}: pdf-parse-Fehler (${parseErr.message}) — übersprungen (Harness-Falle, nicht Prod)`);
      continue;
    }
    analyzed++;
    console.log(`\n━━━ ${file} (${ctype}, ${text.length} Zeichen) ━━━`);

    const [o1, o2, m1, m2] = [
      await analyzeOnce(text, ctype, false, `${file}-o1`),
      await analyzeOnce(text, ctype, false, `${file}-o2`),
      await analyzeOnce(text, ctype, true, `${file}-m1`),
      await analyzeOnce(text, ctype, true, `${file}-m2`),
    ];

    // K1: Score
    const so = [o1.contractScore, o2.contractScore].filter(n => typeof n === 'number');
    const sm = [m1.contractScore, m2.contractScore].filter(n => typeof n === 'number');
    const avgO = so.reduce((a, b) => a + b, 0) / so.length;
    const avgM = sm.reduce((a, b) => a + b, 0) / sm.length;
    const noise = Math.abs((so[0] ?? 0) - (so[1] ?? so[0] ?? 0));
    const diff = Math.abs(avgO - avgM);
    baselineNoises.push(noise); scoreDiffs.push(diff);
    const k1ok = diff <= Math.max(3, noise);
    if (!k1ok) k1Fail++;
    console.log(`  Score OHNE: ${so.join('/')} (Rauschen ${noise}) | MIT: ${sm.join('/')} | Δavg ${diff.toFixed(1)} → ${k1ok ? '✅' : '❌'} K1`);

    // K2: stabile Kern-Risiken (in beiden OHNE-Läufen) müssen in MIT auftauchen
    const t1 = issueTitles(o1), t2 = issueTitles(o2);
    const core = t1.filter(t => t2.some(x => titlesMatch(t, x)));
    const mitAll = [...issueTitles(m1), ...issueTitles(m2)];
    const missing = core.filter(c => !mitAll.some(x => titlesMatch(c, x)));
    const k2ok = missing.length <= Math.max(0, 1); // max 1 Ausreißer erlaubt
    if (!k2ok) k2Fail++;
    console.log(`  Kern-Risiken (stabil in OHNE): ${core.length} | fehlen in MIT: ${missing.length}${missing.length ? ` (${missing.join(' | ')})` : ''} → ${k2ok ? '✅' : '❌'} K2`);
    console.log(`  Issues-Anzahl OHNE ${t1.length}/${t2.length} vs MIT ${issueTitles(m1).length}/${issueTitles(m2).length}`);

    // K3: Verified-Quote der MIT-Arme
    for (const m of [m1, m2]) {
      const stats = verifyAnalysisEvidence(m, text);
      totalEvidence += stats.checked;
      totalVerified += stats.verified;
      console.log(`  Evidence: ${stats.verified}/${stats.checked} wörtlich belegt, ${stats.missing} ohne Beleg`);
    }
  }

  const quote = totalEvidence > 0 ? totalVerified / totalEvidence : 0;
  const k3ok = quote >= 0.6;
  console.log(`\n━━━ GESAMT ━━━`);
  console.log(`K1 Score-Stabilität: ${k1Fail === 0 ? '✅' : `❌ (${k1Fail} Verträge)`} — Δ ${scoreDiffs.map(d => d.toFixed(1)).join(', ')} vs Rauschen ${baselineNoises.join(', ')}`);
  console.log(`K2 Kern-Risiken erhalten: ${k2Fail === 0 ? '✅' : `❌ (${k2Fail} Verträge)`}`);
  console.log(`K3 Verified-Quote: ${(quote * 100).toFixed(0)}% (${totalVerified}/${totalEvidence}) ${k3ok ? '✅' : '❌ (<60% — Prompt nachschärfen oder Feature hinter Schalter lassen)'}`);
  const allOk = k1Fail === 0 && k2Fail === 0 && k3ok;
  console.log(`\n${allOk ? '🎉 A/B-BEWEIS BESTANDEN — evidence-Feld deploybar (Default AN).' : '💥 A/B NICHT bestanden — includeEvidence-Default auf false lassen / nachschärfen.'}`);
  process.exit(allOk ? 0 : 1);
})().catch(e => { console.error('💥', e); process.exit(1); });
