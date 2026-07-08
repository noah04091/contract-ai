// 📨 Welle 1.1 (08.07.2026) — LIVE-End-to-End-Test des Kündigungs-Analyse-Prompts.
// Beweist die zwei Fachanwalts-Nachschärfungen am Ferchau-ähnlichen Fall:
//   (1) § 174 BGB Vollmacht-Check erscheint IMMER (Vertreter unterschreibt)
//   (2) § 38 SGB III wird SITUATIV gerechnet: <3 Monate bis Ende ⇒ 3-TAGE-Meldung
// Braucht OPENAI_API_KEY (.env). Kosten: 1× gpt-4o (~2-3 Cent).
// Aufruf: node scripts/testLetterPromptLive.js
/* eslint-disable no-console */
require('dotenv').config();
const OpenAI = require('openai');
const { generateLetterAnalysisPrompt, resolveSystemPrompt } = require('../routes/analyze');
const { tryParseLenient } = require('../utils/jsonRepair');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Ferchau-ähnlicher Fall: Briefdatum vor ~1 Woche, Ende in ~3,5 Wochen
// → Spanne Brief→Ende ≈ 1 Monat < 3 Monate ⇒ 3-TAGE-Meldepflicht MUSS greifen.
// Unterschrift durch Vertreterin ("i.V.") OHNE Vollmachts-Hinweis ⇒ § 174 MUSS erscheinen.
const d = (offsetDays) => { const x = new Date(); x.setDate(x.getDate() + offsetDays); return x; };
const fmt = (x) => x.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
const briefDatum = fmt(d(-9));
const endDatum = fmt(d(23));

const LETTER_TEXT = `TechPersonal Contract GmbH
Niederlassung Nürnberg — Personalabteilung

Herrn Noah Liebold
Musterstraße 12
96450 Coburg

Nürnberg, den ${briefDatum}

Kündigung Ihres Arbeitsverhältnisses

Sehr geehrter Herr Liebold,

hiermit kündigen wir das mit Ihnen bestehende Arbeitsverhältnis vom 01.03.2024
ordentlich und fristgerecht zum ${endDatum}, hilfsweise zum nächstmöglichen Zeitpunkt.

Wir weisen Sie gemäß § 38 SGB III darauf hin, dass Sie verpflichtet sind, sich
bei der Agentur für Arbeit arbeitsuchend zu melden. Ihren Resturlaub gewähren
wir Ihnen innerhalb der Kündigungsfrist. Ihr Arbeitszeugnis erhalten Sie mit
der Schlussabrechnung.

Mit freundlichen Grüßen
TechPersonal Contract GmbH

i.V. Sandra Krüger
Teamleiterin Personal`;

(async () => {
  const userPrompt = generateLetterAnalysisPrompt(LETTER_TEXT, 'kuendigung_erhalten', 'DEEP_LETTER_ANALYSIS', 'live-prompt-test', 40000, {});
  const systemPrompt = resolveSystemPrompt('LETTER', null);

  console.log(`📤 Rufe gpt-4o (Fall: Brief ${briefDatum}, Ende ${endDatum} — Spanne <3 Monate, Vertreterin i.V.)…`);
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o', temperature: 0.1, seed: 42, max_tokens: 4000,
    response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }]
  });
  const raw = completion.choices[0].message.content || '';
  const parsed = tryParseLenient(raw.substring(raw.indexOf('{'), raw.lastIndexOf('}') + 1), 'live-prompt-test');
  const result = parsed.value || parsed.result || parsed;
  const analysis = result && result.contractScore !== undefined ? result : (parsed.parsed || JSON.parse(raw));
  const flat = JSON.stringify(analysis);

  let pass = 0, fail = 0;
  const check = (name, cond, detail = '') => {
    if (cond) { pass++; console.log(`  ✅ ${name}`); }
    else { fail++; console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
  };

  // (1) § 174 Vollmacht-Check muss erscheinen (Vertreterin "i.V." ohne Vollmachtsurkunde)
  check('§ 174 BGB erscheint im Output', /174/.test(flat));
  check('Zurückweisung/Vollmacht thematisiert', /(zurückweis|zurückzuweisen|vollmacht)/i.test(flat));

  // (2) § 38-Weiche: 3-TAGE-Variante muss die operative Empfehlung sein
  check('3-Tage-Meldung erscheint (situativ korrekt)', /(3 Tage|drei Tage|3 Tagen|binnen 3)/i.test(flat));
  const falsche3Monate = /(spätestens 3 Monate vor|drei Monate vor Beendigung)/i.test(flat) && !/(3 Tage|drei Tage|3 Tagen)/i.test(flat);
  check('KEINE unmögliche 3-Monats-Empfehlung als einzige Regel', !falsche3Monate);

  // (3) Klagefrist weiterhin korrekt (Kernfeature-Regression)
  check('Klagefrist § 4 KSchG erscheint', /4 KSchG/.test(flat));

  // (4) Score-Dringlichkeit (soft — nur Warnung, Modell-Varianz möglich)
  const score = analysis.contractScore;
  console.log(`  ℹ️ Score: ${score} (erwartet <35 bei <14 Tagen Restfrist — soft check)`);
  if (typeof score === 'number' && score >= 35) console.warn('  ⚠️ Score ≥35 trotz naher Frist — beobachten, kein Fail');

  // Kontext ausgeben für manuelle Sichtung
  console.log('\n— recommendations —');
  for (const r of (analysis.recommendations || [])) console.log(`  • [${r.priority}] ${r.title}: ${(r.description || '').substring(0, 140)}`);
  console.log('— criticalIssues —');
  for (const c of (analysis.criticalIssues || [])) console.log(`  • [${c.riskLevel}] ${c.title}`);

  console.log(`\n${fail === 0 ? '🎉' : '💥'} LIVE-PROMPT: ${pass} bestanden, ${fail} fehlgeschlagen`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(err => { console.error('💥 Fehler:', err.message); process.exit(1); });
