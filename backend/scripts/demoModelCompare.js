// 🎬 Demo-Vergleich (21.07.2026) — EIN echter Vertrag, beide Modelle, volle Ergebnisse.
// Zeigt Noah 1:1, was der User HEUTE sieht (gpt-4o, Prod-Config ohne Evidence) vs.
// was er NACH dem Go sähe (gpt-5.4 + Evidence-Feld = Go-Paket).
// Reine Test-Calls, Produktion unberührt. Ergebnis → scripts/demoCompare-result.json
// Aufruf: DOTENV_CONFIG_PATH=<main>/backend/.env node -r dotenv/config scripts/demoModelCompare.js
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { generateDeepLawyerLevelPrompt, resolveSystemPrompt } = require('../routes/analyze');
const { verifyAnalysisEvidence } = require('../utils/analysisEvidence');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TEST_DIR = path.join(__dirname, '..', '..', 'test-contracts');
const FILE = 'real_factoring_eisqueen.pdf'; // ECHTER Vertrag (pdfkit-Fixtures sind pdf-parse-flaky)
const CTYPE = 'factoring';
const OUT = path.join(__dirname, 'demoCompare-result.json');

async function run(modelId, includeEvidence, params) {
  const buf = fs.readFileSync(path.join(TEST_DIR, FILE));
  const text = (await pdfParse(buf)).text;
  const userPrompt = generateDeepLawyerLevelPrompt(text, CTYPE, 'AB', `demo-${modelId}`, 40000, { includeEvidence });
  const systemPrompt = resolveSystemPrompt('CONTRACT', CTYPE);
  const t0 = Date.now();
  const completion = await openai.chat.completions.create({
    model: modelId,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    ...params,
  });
  const latencyMs = Date.now() - t0;
  const raw = completion.choices[0].message.content || '{}';
  const parsed = JSON.parse(raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  const evStats = includeEvidence ? verifyAnalysisEvidence(parsed, text) : null;
  return { model: modelId, latencyMs, evStats, result: parsed };
}

(async () => {
  console.log(`📄 ${FILE} — beide Modelle laufen...`);
  const alt = await run('gpt-4o', false, { temperature: 0.1, seed: 42, max_tokens: 8000 }); // exakt HEUTE
  console.log(`  ✅ gpt-4o fertig (${(alt.latencyMs / 1000).toFixed(0)}s, Score ${alt.result.contractScore})`);
  const neu = await run('gpt-5.4-2026-03-05', true, { max_completion_tokens: 16000 });      // exakt GO-PAKET
  console.log(`  ✅ gpt-5.4 fertig (${(neu.latencyMs / 1000).toFixed(0)}s, Score ${neu.result.contractScore}, Evidence ${neu.evStats.verified}/${neu.evStats.checked})`);
  fs.writeFileSync(OUT, JSON.stringify({ file: FILE, alt, neu }, null, 2));
  console.log(`📄 → ${OUT}`);
  process.exit(0);
})().catch(e => { console.error('💥', e); process.exit(1); });
