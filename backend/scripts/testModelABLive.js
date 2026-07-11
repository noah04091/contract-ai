// 🧪 Welle 4 „Modell-A/B" (11.07.2026) — Beweis-Harness: lohnt ein Herzstück-Modellwechsel?
// Baseline: gpt-4o (Prod-Config: temp 0.1, seed 42, json_object — exakt wie analyze.js:4471).
// Kandidaten: gpt-4.1 (gleiche API-Semantik → risikoarmer Drop-in),
//             gpt-5.4 (Reasoning-Tier → Param-Shim: max_completion_tokens, ohne temp/seed).
// Prompts: EXAKT die Prod-Prompts (generateDeepLawyerLevelPrompt + resolveSystemPrompt).
//
// Objektive Metriken (kein Judge-Modell-Bias):
//   M1 Schema-Vollständigkeit (contractScore/summary/criticalIssues/recommendations/positiveAspects)
//   M2 Score-Stabilität: |score(run1) − score(run2)| je Modell (Determinismus)
//   M3 Kern-Risiken-Recall: stabile Baseline-Risiken (in BEIDEN 4o-Läufen) im Kandidaten wiedergefunden
//   M4 Zitat-Verifizierbarkeit: includeEvidence=true → verifyAnalysisEvidence (W3-Metrik; 4o lag bei 40-50%)
//   M5 Latenz + Completion-Tokens (Kosten-Proxy)
//
// Läufe: 3 Verträge × 3 Modelle × (2 Prod-Läufe + 1 Evidence-Lauf) = 27 Calls.
// Ergebnisse laufend nach scripts/modelAB-results.json (bei Abbruch inspizierbar).
// Aufruf: DOTENV_CONFIG_PATH=<main>/backend/.env node -r dotenv/config scripts/testModelABLive.js
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { generateDeepLawyerLevelPrompt, resolveSystemPrompt } = require('../routes/analyze');
const { verifyAnalysisEvidence } = require('../utils/analysisEvidence');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const TEST_DIR = path.join(__dirname, '..', '..', 'test-contracts');
// Phase 2 via env übersteuerbar (MODEL_AB_OUT / MODEL_AB_CONTRACTS / MODEL_AB_MODELS als JSON).
const OUT_FILE = process.env.MODEL_AB_OUT
  ? path.join(__dirname, process.env.MODEL_AB_OUT)
  : path.join(__dirname, 'modelAB-results.json');

const CONTRACTS = process.env.MODEL_AB_CONTRACTS ? JSON.parse(process.env.MODEL_AB_CONTRACTS) : [
  ['real_factoring_eisqueen.pdf', 'factoring'],
  ['real_versicherungspolice.pdf', 'insurance'],
  ['Mietvertrag_Version_B_Wohnung.pdf', 'rental'],
];

// Param-Builder je Modell-Klasse. Reasoning-Modelle (gpt-5.x) unterstützen
// temperature/seed/max_tokens NICHT → max_completion_tokens großzügig, weil
// Reasoning-Tokens mit ins Budget zählen.
const REASONING_PARAMS = { max_completion_tokens: 16000 };
const CLASSIC_PARAMS = { temperature: 0.1, seed: 42, max_tokens: 8000 };
const MODELS = process.env.MODEL_AB_MODELS
  ? JSON.parse(process.env.MODEL_AB_MODELS).map(id => ({ id, label: id, params: /^gpt-5/.test(id) ? REASONING_PARAMS : CLASSIC_PARAMS }))
  : [
    { id: 'gpt-4o',  label: 'BASELINE gpt-4o (Prod)', params: CLASSIC_PARAMS },
    { id: 'gpt-4.1', label: 'KANDIDAT gpt-4.1 (Drop-in)', params: CLASSIC_PARAMS },
    { id: 'gpt-5.4', label: 'KANDIDAT gpt-5.4 (Reasoning)', params: REASONING_PARAMS },
  ];

async function analyzeOnce(modelCfg, text, contractType, includeEvidence, tag) {
  const userPrompt = generateDeepLawyerLevelPrompt(text, contractType, 'AB', `mab-${tag}`, 40000, { includeEvidence });
  const systemPrompt = resolveSystemPrompt('CONTRACT', contractType);
  const t0 = Date.now();
  const completion = await openai.chat.completions.create({
    model: modelCfg.id,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
    ...modelCfg.params,
  });
  const latencyMs = Date.now() - t0;
  const raw = completion.choices[0].message.content || '{}';
  let parsed = null;
  let parseError = null;
  try {
    parsed = JSON.parse(raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  } catch (e) { parseError = e.message; }
  return {
    parsed, parseError, latencyMs,
    finishReason: completion.choices?.[0]?.finish_reason || null,
    usage: completion.usage ? {
      prompt: completion.usage.prompt_tokens,
      completion: completion.usage.completion_tokens,
      reasoning: completion.usage.completion_tokens_details?.reasoning_tokens ?? null
    } : null
  };
}

// ── Metrik-Helfer (aus W3-Harness übernommen) ──
const normTitle = (t) => String(t || '').toLowerCase().replace(/[^a-zäöüß0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
const titleWords = (t) => normTitle(t).split(' ').filter(w => w.length > 4);
function titlesMatch(a, b) {
  const wa = titleWords(a), wb = titleWords(b);
  if (!wa.length || !wb.length) return normTitle(a) === normTitle(b);
  const overlap = wa.filter(w => wb.includes(w)).length;
  return overlap / Math.min(wa.length, wb.length) >= 0.5;
}
const issueTitles = (r) => (Array.isArray(r?.criticalIssues) ? r.criticalIssues : []).map(i => (typeof i === 'string' ? i : i?.title)).filter(Boolean);

function schemaCheck(r) {
  if (!r) return { ok: false, missing: ['<parse-fail>'] };
  const missing = [];
  if (typeof r.contractScore !== 'number' || r.contractScore < 0 || r.contractScore > 100) missing.push('contractScore');
  if (!r.summary || (Array.isArray(r.summary) && r.summary.length === 0)) missing.push('summary');
  if (!Array.isArray(r.criticalIssues)) missing.push('criticalIssues');
  if (!Array.isArray(r.recommendations)) missing.push('recommendations');
  if (!Array.isArray(r.positiveAspects)) missing.push('positiveAspects');
  return { ok: missing.length === 0, missing };
}

(async () => {
  const results = { startedAt: null, models: {}, contracts: [], errors: [] };
  const save = () => fs.writeFileSync(OUT_FILE, JSON.stringify(results, null, 2));

  for (const [file, ctype] of CONTRACTS) {
    const buf = fs.readFileSync(path.join(TEST_DIR, file));
    const text = (await pdfParse(buf)).text;
    if (!text || text.trim().length < 500) { console.warn(`⏭️ ${file}: zu wenig Text`); continue; }
    console.log(`\n━━━ ${file} (${ctype}, ${text.length} Zeichen) ━━━`);
    const cEntry = { file, ctype, chars: text.length, perModel: {} };
    results.contracts.push(cEntry);

    for (const m of MODELS) {
      const entry = { runs: [], evidence: null, error: null };
      cEntry.perModel[m.id] = entry;
      try {
        // 2 Prod-Läufe (evidence AUS, wie live)
        for (let i = 1; i <= 2; i++) {
          const r = await analyzeOnce(m, text, ctype, false, `${file}-${m.id}-r${i}`);
          const sc = schemaCheck(r.parsed);
          entry.runs.push({
            score: r.parsed?.contractScore ?? null,
            schemaOk: sc.ok, schemaMissing: sc.missing,
            parseError: r.parseError, finishReason: r.finishReason,
            issues: issueTitles(r.parsed),
            nIssues: issueTitles(r.parsed).length,
            latencyMs: r.latencyMs, usage: r.usage
          });
          console.log(`  ${m.id} r${i}: score=${r.parsed?.contractScore ?? '—'} issues=${issueTitles(r.parsed).length} schema=${sc.ok ? 'OK' : 'FEHLT:' + sc.missing.join(',')} ${r.latencyMs}ms${r.usage?.reasoning ? ` (reasoning:${r.usage.reasoning}tok)` : ''}`);
          save();
        }
        // 1 Evidence-Lauf (M4: Zitat-Verifizierbarkeit)
        const ev = await analyzeOnce(m, text, ctype, true, `${file}-${m.id}-ev`);
        if (ev.parsed) {
          const stats = verifyAnalysisEvidence(ev.parsed, text);
          entry.evidence = { ...stats, score: ev.parsed?.contractScore ?? null, latencyMs: ev.latencyMs };
          console.log(`  ${m.id} EVIDENCE: ${stats.verified}/${stats.checked} wörtlich belegt (${stats.checked ? Math.round(100 * stats.verified / stats.checked) : 0}%), missing=${stats.missing}`);
        } else {
          entry.evidence = { parseError: ev.parseError };
          console.log(`  ${m.id} EVIDENCE: Parse-Fehler ${ev.parseError}`);
        }
        save();
      } catch (err) {
        entry.error = err.message;
        results.errors.push(`${file}/${m.id}: ${err.message}`);
        console.error(`  ❌ ${m.id}: ${err.message}`);
        save();
      }
    }
  }

  // ── Auswertung ──
  console.log('\n════════ AUSWERTUNG ════════');
  const agg = {};
  for (const m of MODELS) agg[m.id] = { schemaFails: 0, stabDiffs: [], recallHits: 0, recallTotal: 0, evVerified: 0, evChecked: 0, latencies: [], compTokens: [] };

  for (const c of results.contracts) {
    const base = c.perModel['gpt-4o'];
    // stabile Baseline-Risiken = in BEIDEN 4o-Läufen gefunden
    const stableBaseRisks = (base?.runs?.[0]?.issues || []).filter(t1 => (base?.runs?.[1]?.issues || []).some(t2 => titlesMatch(t1, t2)));
    for (const m of MODELS) {
      const e = c.perModel[m.id];
      if (!e || e.error) continue;
      const a = agg[m.id];
      for (const run of e.runs) { if (!run.schemaOk) a.schemaFails++; a.latencies.push(run.latencyMs); if (run.usage) a.compTokens.push(run.usage.completion); }
      if (e.runs.length === 2 && e.runs[0].score != null && e.runs[1].score != null) a.stabDiffs.push(Math.abs(e.runs[0].score - e.runs[1].score));
      // Recall gegen stabile 4o-Risiken (für 4o selbst = Selbstkonsistenz)
      for (const risk of stableBaseRisks) {
        a.recallTotal++;
        if ((e.runs?.[0]?.issues || []).some(t => titlesMatch(risk, t))) a.recallHits++;
      }
      if (e.evidence && typeof e.evidence.checked === 'number') { a.evChecked += e.evidence.checked; a.evVerified += e.evidence.verified; }
    }
  }

  const fmt = (n) => (typeof n === 'number' && isFinite(n)) ? n.toFixed(1) : '—';
  console.log(`\n${'Modell'.padEnd(10)} ${'Schema'.padEnd(8)} ${'ØScoreDiff'.padEnd(11)} ${'Recall'.padEnd(9)} ${'Evidence'.padEnd(14)} ${'ØLatenz'.padEnd(9)} ØCompTok`);
  for (const m of MODELS) {
    const a = agg[m.id];
    const avg = (arr) => arr.length ? arr.reduce((x, y) => x + y, 0) / arr.length : NaN;
    const evPct = a.evChecked ? Math.round(100 * a.evVerified / a.evChecked) : null;
    console.log(
      `${m.id.padEnd(10)} ${(a.schemaFails === 0 ? 'OK' : a.schemaFails + ' Fails').padEnd(8)} ` +
      `${fmt(avg(a.stabDiffs)).padEnd(11)} ${(a.recallTotal ? Math.round(100 * a.recallHits / a.recallTotal) + '%' : '—').padEnd(9)} ` +
      `${(evPct !== null ? `${a.evVerified}/${a.evChecked} (${evPct}%)` : '—').padEnd(14)} ` +
      `${fmt(avg(a.latencies) / 1000).padEnd(9)}s ${Math.round(avg(a.compTokens)) || '—'}`
    );
  }
  results.aggregate = agg;
  save();
  console.log(`\n📄 Detail-Ergebnisse: ${OUT_FILE}`);
  if (results.errors.length) console.log(`⚠️ Fehler: ${results.errors.length} — ${results.errors.join(' | ')}`);
})().catch(e => { console.error('💥', e); process.exit(1); });
