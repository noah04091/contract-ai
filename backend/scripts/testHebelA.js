/**
 * Offline-LOGIK-Beweis für Hebel A (Felder aus GPT statt schwachem/implausiblem Regex).
 * node backend/scripts/testHebelA.js
 * Testet die ENTSCHEIDUNGS-Logik (nicht die Inline-Verdrahtung — die ist syntax-geprüft + getraced)
 * an den 3 echten Vertrags-Szenarien aus dem Komplex-Test.
 *
 * A1: feuert das GPT-Ende, wenn das (beibehaltene) Regex-Ende implausibel ist (==Start) → shouldClearExpiry.clear.
 * A2: zieht das GPT-start_date vor, wenn dessen Konfidenz >= Regex UND das Datum abweicht.
 */
const { shouldClearExpiry } = require('../utils/expiryPlausibility');

let pass = 0, fail = 0;
const ok = (n, c, i = '') => { if (c) { pass++; console.log(`  ✅ ${n}${i ? ' — ' + i : ''}`); } else { fail++; console.log(`  ❌ ${n}${i ? ' — ' + i : ''}`); } };

// Replik der Inline-A2-Bedingung (analyze.js): GPT-Start vorziehen?
const preferGptStart = (aiConf, regexConf, aiMs, regexMs) => (aiConf >= (regexConf || 0)) && aiMs !== regexMs;

console.log('\n════════ A1 — Trigger: implausibles Regex-Ende → GPT-Ende holen ════════');
// NovaCloud: Regex las Ende = Start = 2026-09-01 → implausibel → A1 feuert (clear=true)
ok('NovaCloud: Regex-Ende==Start → A1 greift (GPT-Ende wird geholt)',
   shouldClearExpiry({ expiryDate: '2026-09-01', startDate: '2026-09-01', startCandidates: ['2026-09-01'] }).clear === true);
// Gegenprobe: echtes Regex-Ende (Zukunft, != Start) → A1 greift NICHT (Regex bleibt, korrekt)
ok('echtes Regex-Ende (2028, != Start) → A1 greift NICHT',
   shouldClearExpiry({ expiryDate: '2028-06-30', startDate: '2026-07-01', startCandidates: ['2026-07-01'] }).clear === false);
// Vergangenheits-Regex-Ende → A1 greift (clear=true)
ok('Regex-Ende in Vergangenheit → A1 greift',
   shouldClearExpiry({ expiryDate: '2020-01-01', startDate: '2026-01-01', now: new Date('2026-06-17') }).clear === true);

console.log('\n════════ A2 — GPT-Start vorziehen? (3 echte Szenarien) ════════');
const D = (s) => new Date(s).getTime();
// Gewerbemiete: GPT-Start 2026-10-01 (100%) vs Regex 2027-10-01 (40%) → GPT vorziehen
ok('Gewerbemiete: GPT 100% ≥ Regex 40%, Datum abweichend → GPT-Start vorziehen',
   preferGptStart(100, 40, D('2026-10-01'), D('2027-10-01')) === true);
// NovaCloud: GPT 100% vs Regex 80%, SELBES Datum (2026-09-01) → kein Wechsel (no-op)
ok('NovaCloud: gleiches Datum → KEIN Wechsel (no-op)',
   preferGptStart(100, 80, D('2026-09-01'), D('2026-09-01')) === false);
// Aurelis: GPT 100% vs Regex 95%, selbes Datum (2026-11-01) → kein Wechsel
ok('Aurelis: gleiches Datum → KEIN Wechsel (no-op)',
   preferGptStart(100, 95, D('2026-11-01'), D('2026-11-01')) === false);
// Schutz: GPT-Konfidenz NIEDRIGER als Regex → NICHT vorziehen (konservativ)
ok('GPT-Konf < Regex → NICHT vorziehen (Regex behalten)',
   preferGptStart(50, 90, D('2026-01-01'), D('2027-01-01')) === false);

console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────`);
process.exit(fail === 0 ? 0 : 1);
