// 🧪 TÜV Größen-/Typ-Universalität unter gpt-5.4 (24.07.2026) — die 2 unter dem
// NEUEN Modell ungeprüften Kanten vor dem "Haken dran":
//   K1 MONSTER: sehr großes Dokument (~450k Zeichen) → (a) Kürzungs-Fall (Budget 40k
//      wie Free/Business-Kürzung): JSON vollständig? finish_reason ≠ length?
//      (b) Voll-Fall (Budget 110k ≈ Enterprise): Latenz < Timeout-Puffer? JSON ok?
//   K2 MINI: winziges Dokument (~600 Zeichen) → Schema vollständig, kein Absturz.
//   K3 LETTER+EVIDENCE: Kündigungsschreiben durch den LETTER-Prompt MIT Evidence
//      (im A/B nie gemessen) → Schema ok, Zitate wörtlich verifizierbar (≥60%),
//      keine Vertrags-Felder (paymentTerms/comparison) im Output.
// Exakt die Prod-Bausteine: generateDeepLawyerLevelPrompt / generateLetterAnalysisPrompt
// + resolveSystemPrompt + verifyAnalysisEvidence; Modell = Live-Modell (Snapshot).
// Aufruf: DOTENV_CONFIG_PATH=<main>/backend/.env node -r dotenv/config scripts/testTuevGroessenUniversalitaet.js
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const OpenAI = require('openai');
const { generateDeepLawyerLevelPrompt, generateLetterAnalysisPrompt, resolveSystemPrompt } = require('../routes/analyze');
const { verifyAnalysisEvidence } = require('../utils/analysisEvidence');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const MODEL = 'gpt-5.4-2026-03-05'; // exakt das Live-Modell
const TEST_DIR = path.join(__dirname, '..', '..', 'test-contracts');

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};

async function callModel(systemPrompt, userPrompt) {
  const t0 = Date.now();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 16000, // exakt der Prod-Floor
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
  });
  const latencyMs = Date.now() - t0;
  const raw = completion.choices[0].message.content || '{}';
  let parsed = null;
  try { parsed = JSON.parse(raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1)); } catch { /* parsed bleibt null */ }
  return { parsed, latencyMs, finishReason: completion.choices?.[0]?.finish_reason, usage: completion.usage };
}

const coreSchemaOk = (r) => r
  && typeof r.contractScore === 'number'
  && Array.isArray(r.criticalIssues)
  && Array.isArray(r.recommendations)
  && (Array.isArray(r.summary) ? r.summary.length > 0 : !!r.summary);

// ── Fixtures ──
const MINI_WERKVERTRAG = `WERKVERTRAG
zwischen Malermeister Kurt Lang, Ringstraße 2, 34117 Kassel (Auftragnehmer)
und Sabine Vogt, Am Hang 9, 34117 Kassel (Auftraggeberin).
§ 1 Der Auftragnehmer streicht Wohnzimmer und Flur der Wohnung der Auftraggeberin (ca. 55 m² Wandfläche), Farbe weiß matt, inkl. Abkleben und Grundierung.
§ 2 Die Vergütung beträgt pauschal 1.450,00 EUR inkl. USt., fällig binnen 14 Tagen nach Abnahme.
§ 3 Ausführung in KW 34/2026. Es gilt deutsches Recht.
Kassel, den 20.07.2026`;

const KUENDIGUNG_TEXT = `Meyer Logistik GmbH · Industriepark 7 · 28309 Bremen

Herrn Jonas Weber
Feldstraße 11
28203 Bremen

Bremen, den 21.07.2026

Kündigung Ihres Arbeitsverhältnisses

Sehr geehrter Herr Weber,

hiermit kündigen wir das mit Ihnen seit dem 01.03.2023 bestehende Arbeitsverhältnis ordentlich und fristgerecht zum 31.08.2026, hilfsweise zum nächstzulässigen Termin.

Bis zur Beendigung des Arbeitsverhältnisses stellen wir Sie unter Anrechnung noch offener Urlaubsansprüche unwiderruflich von der Verpflichtung zur Arbeitsleistung frei.

Wir weisen Sie darauf hin, dass Sie verpflichtet sind, sich unverzüglich, spätestens jedoch drei Monate vor Beendigung des Arbeitsverhältnisses, persönlich bei der Agentur für Arbeit arbeitsuchend zu melden.

Mit freundlichen Grüßen

i.A. Petra Schulz
Personalabteilung`;

(async () => {
  // Monster-Text aus echten Verträgen zusammensetzen (~450k Zeichen) mit Markern,
  // um Anfangs-Abdeckung nachweisen zu können.
  const f1 = (await pdfParse(fs.readFileSync(path.join(TEST_DIR, 'real_factoring_eisqueen.pdf')))).text;
  const f2 = (await pdfParse(fs.readFileSync(path.join(TEST_DIR, 'real_factoring_adam_reuter.pdf')))).text;
  let monster = 'RAHMENVERTRAGSWERK NORDSTERN-GRUPPE — KONSOLIDIERTE FASSUNG\n\n';
  while (monster.length < 450000) monster += f1 + '\n\n' + f2 + '\n\n';
  console.log(`📚 Monster-Dokument: ${monster.length} Zeichen (~${Math.ceil(monster.length / 4)} Tokens)`);

  // ── K1a: Monster im KÜRZUNGS-Fall (Budget 40k Tokens) ──
  console.log('\nK1a) Monster + Kürzung (Budget 40k) — degradiert die Pipeline würdevoll?');
  {
    const userPrompt = generateDeepLawyerLevelPrompt(monster, 'factoring', 'AB', 'tuev-k1a', 40000, {});
    check('Prompt-Builder kürzt auf Budget (Prompt < 200k Zeichen)', userPrompt.length < 200000, `ist ${userPrompt.length}`);
    const r = await callModel(resolveSystemPrompt('CONTRACT', 'factoring'), userPrompt);
    check('JSON geparst', !!r.parsed);
    check('Kern-Schema vollständig (Score/Risiken/Empfehlungen/Summary)', coreSchemaOk(r.parsed));
    check(`finish_reason=stop (kein Abschneiden; ist ${r.finishReason})`, r.finishReason === 'stop');
    check(`Latenz ${(r.latencyMs / 1000).toFixed(0)}s < 200s (Puffer zum 240s-Timeout)`, r.latencyMs < 200000);
    console.log(`    → Score=${r.parsed?.contractScore}, Issues=${(r.parsed?.criticalIssues || []).length}, CompTok=${r.usage?.completion_tokens}`);
  }

  // ── K1b: Monster im VOLL-Fall (Budget 110k ≈ Enterprise) ──
  console.log('\nK1b) Monster voll (Budget 110k) — Enterprise-Extremfall');
  {
    const userPrompt = generateDeepLawyerLevelPrompt(monster, 'factoring', 'AB', 'tuev-k1b', 110000, {});
    const r = await callModel(resolveSystemPrompt('CONTRACT', 'factoring'), userPrompt);
    check('JSON geparst', !!r.parsed);
    check('Kern-Schema vollständig', coreSchemaOk(r.parsed));
    check(`finish_reason=stop (ist ${r.finishReason})`, r.finishReason === 'stop');
    check(`Latenz ${(r.latencyMs / 1000).toFixed(0)}s < 200s`, r.latencyMs < 200000);
    console.log(`    → Score=${r.parsed?.contractScore}, Issues=${(r.parsed?.criticalIssues || []).length}, PromptTok=${r.usage?.prompt_tokens}, CompTok=${r.usage?.completion_tokens}`);
  }

  // ── K2: Mini-Dokument ──
  console.log('\nK2) Mini-Werkvertrag (~600 Zeichen) — kleinste sinnvolle Einheit');
  {
    const userPrompt = generateDeepLawyerLevelPrompt(MINI_WERKVERTRAG, 'service', 'AB', 'tuev-k2', 40000, { includeEvidence: true });
    const r = await callModel(resolveSystemPrompt('CONTRACT', 'service'), userPrompt);
    check('JSON geparst', !!r.parsed);
    check('Kern-Schema vollständig', coreSchemaOk(r.parsed));
    check('Score plausibel für simplen fairen Handwerksvertrag (≥60)', (r.parsed?.contractScore ?? 0) >= 60, `ist ${r.parsed?.contractScore}`);
    const ev = verifyAnalysisEvidence(r.parsed, MINI_WERKVERTRAG);
    check(`Evidence auf Mini-Text sauber (${ev.verified}/${ev.checked} wörtlich, 0 Halluzinations-Durchrutscher)`, ev.checked === 0 || ev.verified + ev.failed === ev.checked);
    console.log(`    → Score=${r.parsed?.contractScore}, Issues=${(r.parsed?.criticalIssues || []).length}, ${(r.latencyMs / 1000).toFixed(0)}s`);
  }

  // ── K3: LETTER (Kündigung) + Evidence — der ungeprüfte Übergabe-Punkt ──
  console.log('\nK3) Kündigungsschreiben durch LETTER-Prompt MIT Evidence (2 Läufe)');
  {
    let evTotal = 0, evVerified = 0;
    for (let i = 1; i <= 2; i++) {
      const userPrompt = generateLetterAnalysisPrompt(KUENDIGUNG_TEXT, 'kuendigung_erhalten', 'AB', `tuev-k3-${i}`, 40000, { includeEvidence: true });
      const r = await callModel(resolveSystemPrompt('LETTER', 'kuendigung_erhalten'), userPrompt);
      check(`r${i}: JSON geparst`, !!r.parsed);
      check(`r${i}: Score + criticalIssues vorhanden`, typeof r.parsed?.contractScore === 'number' && Array.isArray(r.parsed?.criticalIssues));
      check(`r${i}: KEINE Vertrags-Felder (paymentTerms/comparison — LETTER-Hygiene)`, !r.parsed?.paymentTerms && !r.parsed?.comparison);
      const ev = verifyAnalysisEvidence(r.parsed, KUENDIGUNG_TEXT);
      evTotal += ev.checked; evVerified += ev.verified;
      console.log(`    r${i} → Score=${r.parsed?.contractScore}, Issues=${(r.parsed?.criticalIssues || []).length}, Evidence ${ev.verified}/${ev.checked}, ${(r.latencyMs / 1000).toFixed(0)}s`);
    }
    const quote = evTotal ? evVerified / evTotal : 1;
    check(`K3-Zitat-Quote ≥60% (W3-Schwelle): ${evVerified}/${evTotal} (${Math.round(quote * 100)}%)`, quote >= 0.6);
  }

  console.log(`\n${fail === 0 ? '🎉 TÜV BESTANDEN' : '💥 TÜV NICHT bestanden'} — ${pass} bestanden, ${fail} fehlgeschlagen`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('💥', e); process.exit(1); });
