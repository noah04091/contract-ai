// 🏋️ Abschluss-Prüfstand (24.07.2026) — Analyse gegen BEKANNTE WAHRHEIT.
// test-contracts/synthetic_komplex_rahmenvertrag.txt enthält 13 gezielt versteckte
// Fallen + 4 bewusst faire Kontroll-Klauseln. Gemessen wird objektiv:
//   RECALL  — wie viele der 13 Fallen findet die Analyse (2 Läufe, Union + je Lauf)?
//   PRECISION — meldet sie fälschlich Kritik an den fairen Klauseln (Titel-Check)?
//   DATES   — findet sie die Kern-Termine (Laufzeitende, Meilensteine)?
//   EVIDENCE — Zitat-Verifikation sauber?
// Exakt Prod-Prompts + Live-Modell. Ergebnisse → scripts/pruefstand-result.json
// Aufruf: DOTENV_CONFIG_PATH=<main>/backend/.env node -r dotenv/config scripts/testAbschlussPruefstand.js
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { generateDeepLawyerLevelPrompt, resolveSystemPrompt } = require('../routes/analyze');
const { verifyAnalysisEvidence } = require('../utils/analysisEvidence');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = 'gpt-5.4-2026-03-05';
const TEXT = fs.readFileSync(path.join(__dirname, '..', '..', 'test-contracts', 'synthetic_komplex_rahmenvertrag.txt'), 'utf8');

// ── Bekannte Wahrheit: 13 Fallen. matcher läuft über den GESAMTEN Analyse-JSON-Text (lowercase). ──
const TRAPS = [
  { id: 'T1',  name: '§12.1 Haftungsausschluss inkl. VORSATZ (nichtig, § 276 III BGB)', hard: false, m: (s) => /vorsatz/.test(s) && /haftung/.test(s) },
  { id: 'T2',  name: '§4.2 (6 Mon) vs. §18.4 (12 Mon) — versteckter Widerspruch Kündigungsfrist', hard: true,  m: (s) => /18\.4/.test(s) || (/zwölf monate|12 monate/.test(s) && /kündigungsfrist|kündigung/.test(s)) || /widerspr/.test(s) && /kündigungsfrist/.test(s) },
  { id: 'T3',  name: '§3.3 stillschweigende Verlängerung um 24 Monate', hard: false, m: (s) => /verlänger/.test(s) && /24 monate/.test(s) },
  { id: 'T4',  name: '§6.4 einseitige Preiserhöhung bis 9 % ohne Kündigungsrecht', hard: false, m: (s) => /9\s?%|9 prozent/.test(s) || (/preisanpassung|preiserhöhung/.test(s) && /kündigungsrecht/.test(s)) },
  { id: 'T5',  name: '§8 Vertragsstrafe 25.000 € verschuldensUNabhängig, ohne Obergrenze', hard: false, m: (s) => /vertragsstrafe/.test(s) },
  { id: 'T6',  name: '§13.1 Verjährung 6 Monate — auch bei Vorsatz (§ 202 I BGB)', hard: false, m: (s) => /verjähr/.test(s) },
  { id: 'T7',  name: '§6.3 Zahlungsziel 90 Tage (§ 271a BGB)', hard: true,  m: (s) => /90 tage/.test(s) },
  { id: 'T8',  name: 'A2.7 VERGRABEN in Anlage: Zahlungsziel Pflege 120 Tage', hard: true,  m: (s) => /120 tage/.test(s) },
  { id: 'T9',  name: 'A2.2 hohles SLA: 99,9 % nur innerhalb Servicezeiten Mo–Fr 10–16 Uhr gemessen', hard: true,  m: (s) => /99,9|99\.9/.test(s) && /servicezeit/.test(s) },
  { id: 'T10', name: '§6.5 Aufrechnungsverbot auch für unbestrittene/rechtskräftige Forderungen', hard: false, m: (s) => /aufrechnung/.test(s) },
  { id: 'T11', name: '§11.2 Nutzungsrechte unter Bedingung Zahlung ALLER (auch künftiger) Forderungen', hard: true,  m: (s) => /nutzungsrecht/.test(s) && (/aufschiebend|bedingung|vollständig.{0,30}bezahl|künftig/.test(s)) },
  { id: 'T12', name: '§4.3 Asymmetrie: AN kündigt jederzeit mit 2 Wochen (Selbstbeurteilung)', hard: true,  m: (s) => /4\.3/.test(s) || /jederzeit.{0,60}zwei wochen|zwei wochen.{0,40}monatsende/.test(s) || (/asymmetr/.test(s) && /kündig/.test(s)) },
  { id: 'T13', name: '§9.2 Genehmigungsfiktion: Anlagen-Änderung gilt nach 2 Wochen Schweigen als genehmigt', hard: true,  m: (s) => /gilt als genehmigt|genehmigungsfiktion|9\.2/.test(s) },
];

// Faire Kontroll-Klauseln: dürfen NICHT als kritisches Risiko auftauchen (Titel-Check).
const FAIR = [
  { id: 'F1', name: '§14 beidseitige Vertraulichkeit (3 Jahre)', bad: (t) => /vertraulich/.test(t) && !/vertragsstrafe/.test(t) },
  { id: 'F2', name: '§16 beidseitige Force Majeure', bad: (t) => /höhere gewalt|force majeure/.test(t) },
  { id: 'F3', name: '§17 Eskalation + Mediation', bad: (t) => /mediation|streitbeilegung/.test(t) },
  { id: 'F4', name: 'Anlage 3 ordentliche AVV', bad: (t) => /auftragsverarbeitung|avv/.test(t) && /fehlt|nicht beigefügt/.test(t) },
];

const KEY_DATES = [
  { id: 'D1', name: 'Laufzeitende 30.09.2029', m: (s) => /30\.09\.2029|2029-09-30/.test(s) },
  { id: 'D2', name: 'mind. ein Meilenstein 2027', m: (s) => /2027/.test(s) },
  { id: 'D3', name: 'Vertragsbeginn 01.10.2026', m: (s) => /01\.10\.2026|2026-10-01/.test(s) },
];

async function analyzeOnce(tag) {
  const userPrompt = generateDeepLawyerLevelPrompt(TEXT, 'service', 'AB', `pruefstand-${tag}`, 40000, { includeEvidence: true });
  const systemPrompt = resolveSystemPrompt('CONTRACT', 'service');
  const t0 = Date.now();
  const completion = await openai.chat.completions.create({
    model: MODEL, max_completion_tokens: 16000,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
  });
  const raw = completion.choices[0].message.content || '{}';
  const parsed = JSON.parse(raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  return { parsed, latencyMs: Date.now() - t0 };
}

(async () => {
  console.log(`📚 Prüfstands-Vertrag: ${TEXT.length} Zeichen — 13 Fallen, 4 faire Kontrollen. 2 Läufe mit ${MODEL}...`);
  const runs = [];
  for (let i = 1; i <= 2; i++) {
    const r = await analyzeOnce(`r${i}`);
    runs.push(r);
    console.log(`  Lauf ${i}: Score=${r.parsed?.contractScore}, Issues=${(r.parsed?.criticalIssues || []).length}, ${(r.latencyMs / 1000).toFixed(0)}s`);
  }

  const results = { perTrap: [], falsePositives: [], dates: [], scores: runs.map(r => r.parsed?.contractScore) };
  const fullTexts = runs.map(r => JSON.stringify(r.parsed).toLowerCase());
  const unionText = fullTexts.join(' ');

  console.log('\n════ RECALL — 13 Fallen ════');
  let found = 0, hardFound = 0, hardTotal = TRAPS.filter(t => t.hard).length;
  for (const t of TRAPS) {
    const inR1 = t.m(fullTexts[0]);
    const inR2 = t.m(fullTexts[1]);
    const hit = t.m(unionText);
    if (hit) { found++; if (t.hard) hardFound++; }
    results.perTrap.push({ id: t.id, name: t.name, hard: t.hard, r1: inR1, r2: inR2 });
    console.log(`  ${hit ? '✅' : '❌'} ${t.id}${t.hard ? ' [SCHWER]' : ''} ${t.name}  (r1:${inR1 ? '✓' : '–'} r2:${inR2 ? '✓' : '–'})`);
  }

  console.log('\n════ PRECISION — faire Kontroll-Klauseln (dürfen NICHT kritisch sein) ════');
  let fp = 0;
  for (const f of FAIR) {
    const titles = runs.flatMap(r => (r.parsed?.criticalIssues || []).map(i => String(i.title || '').toLowerCase()));
    const flagged = titles.some(t => f.bad(t));
    if (flagged) fp++;
    results.falsePositives.push({ id: f.id, name: f.name, flagged });
    console.log(`  ${flagged ? '❌ FEHLALARM' : '✅ still'} ${f.id} ${f.name}`);
  }

  console.log('\n════ TERMINE (importantDates + Volltext) ════');
  for (const d of KEY_DATES) {
    const hit = d.m(unionText);
    results.dates.push({ id: d.id, name: d.name, hit });
    console.log(`  ${hit ? '✅' : '❌'} ${d.name}`);
  }

  console.log('\n════ EVIDENCE ════');
  let evChecked = 0, evVerified = 0;
  for (let i = 0; i < runs.length; i++) {
    const ev = verifyAnalysisEvidence(runs[i].parsed, TEXT);
    evChecked += ev.checked; evVerified += ev.verified;
    console.log(`  Lauf ${i + 1}: ${ev.verified}/${ev.checked} wörtlich verifiziert`);
  }

  fs.writeFileSync(path.join(__dirname, 'pruefstand-result.json'), JSON.stringify({ results, runs: runs.map(r => r.parsed) }, null, 2));
  console.log('\n════ SCORECARD ════');
  console.log(`  Fallen gefunden:   ${found}/13 gesamt · davon SCHWERE: ${hardFound}/${hardTotal}`);
  console.log(`  Fehlalarme:        ${fp}/4 fairen Klauseln`);
  console.log(`  Scores (Stabilität): ${results.scores.join(' / ')}`);
  console.log(`  Evidence:          ${evVerified}/${evChecked} wörtlich`);
  console.log(`  📄 Details: scripts/pruefstand-result.json`);
  process.exit(0);
})().catch(e => { console.error('💥', e); process.exit(1); });
