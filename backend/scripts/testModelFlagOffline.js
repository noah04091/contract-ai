// 🧪 Modell-Flag (11.07.2026) — Offline-Beweis ohne API-Call:
// (A) OHNE ANALYZE_MODEL → Request-Params BYTE-IDENTISCH zu vorher
//     (model gpt-4o, temperature 0.1, seed 42, max_tokens adaptiv).
// (B) ANALYZE_MODEL=gpt-5.4 → Reasoning-Shim (max_completion_tokens Floor 16k,
//     KEIN temperature/seed/max_tokens), Timeout 240s.
// Methode: makeRateLimitedGPT4Request mit Fake-openai-Client aufrufen, der den
// Request einfängt. Kindprozess je Flag-Zustand (Konstante wird beim Laden gelesen).
// Aufruf: node scripts/testModelFlagOffline.js
/* eslint-disable no-console */
const { execFileSync } = require('child_process');
const path = require('path');

if (process.argv[2] === 'child') {
  // ── Kindprozess: fängt den OpenAI-Request ab, schreibt ihn in Datei
  //    (stdout ist durch Modul-Lade-Logs von analyze.js verschmutzt) ──
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-dummy-offline';
  const fsChild = require('fs');
  const analyze = require('../routes/analyze');
  const fakeOpenai = {
    captured: null,
    chat: { completions: { create: async (params) => {
      fakeOpenai.captured = params;
      // Minimal gültige Antwort, damit die Funktion sauber durchläuft
      return {
        choices: [{ message: { content: JSON.stringify({ contractScore: 50, summary: ['x'], criticalIssues: [], recommendations: [], positiveAspects: [] }) + ' '.repeat(120), }, finish_reason: 'stop' }],
        usage: { total_tokens: 1, prompt_tokens: 1, completion_tokens: 1 }
      };
    } } }
  };
  (async () => {
    await analyze.makeRateLimitedGPT4Request('Testprompt', 'flagtest', fakeOpenai, 1, 'CONTRACT', 'rental', 7777);
    fsChild.writeFileSync(process.argv[3], JSON.stringify(fakeOpenai.captured));
    process.exit(0); // hart raus — offene DB-/S3-Handles nicht abwarten
  })().catch(e => { console.error('CHILD-ERR:', e.message); process.exit(1); });
  return;
}

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

function runChild(env) {
  const fs = require('fs');
  const os = require('os');
  const outFile = path.join(os.tmpdir(), `modelflag-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
  execFileSync(process.execPath, [__filename, 'child', outFile], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
    timeout: 120000,
    stdio: 'ignore' // Modul-Lade-Logs unterdrücken
  });
  const parsed = JSON.parse(fs.readFileSync(outFile, 'utf8'));
  fs.unlinkSync(outFile);
  return parsed;
}

console.log('A) Default (kein Flag) — Params byte-identisch zu vorher');
const a = runChild({ ANALYZE_MODEL: '' });
check('model = gpt-4o', a.model === 'gpt-4o');
check('temperature = 0.1', a.temperature === 0.1);
check('seed = 42', a.seed === 42);
check('max_tokens = 7777 (adaptiv, wie übergeben)', a.max_tokens === 7777);
check('KEIN max_completion_tokens', !('max_completion_tokens' in a));
check('response_format json_object', a.response_format && a.response_format.type === 'json_object');
check('Param-Menge exakt wie vorher (model/messages/response_format/temperature/seed/max_tokens)',
  Object.keys(a).sort().join(',') === ['max_tokens', 'messages', 'model', 'response_format', 'seed', 'temperature'].join(','));

console.log('\nB) ANALYZE_MODEL=gpt-5.4 — Reasoning-Shim');
const b = runChild({ ANALYZE_MODEL: 'gpt-5.4' });
check('model = gpt-5.4', b.model === 'gpt-5.4');
check('KEIN temperature', !('temperature' in b));
check('KEIN seed', !('seed' in b));
check('KEIN max_tokens', !('max_tokens' in b));
check('max_completion_tokens = 16000 (Floor greift bei 7777)', b.max_completion_tokens === 16000);
check('response_format json_object bleibt', b.response_format && b.response_format.type === 'json_object');

console.log('\nC) ANALYZE_MODEL=gpt-4.1 — klassisches Modell via Flag (kein Shim)');
const c = runChild({ ANALYZE_MODEL: 'gpt-4.1' });
check('model = gpt-4.1', c.model === 'gpt-4.1');
check('temperature/seed/max_tokens bleiben (klassische Semantik)', c.temperature === 0.1 && c.seed === 42 && c.max_tokens === 7777);

console.log(`\n${fail === 0 ? '🎉' : '💥'} ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
