// READ-ONLY Unit-Test für dedupeSameDayMilestones (D-1: ENDE-Cluster ±2 Tage).
// Kein DB-Zugriff. Speist die exakten Event-Sets aus den Live-Logs ein und prüft das Ergebnis.
//   node scripts/testDedupeEndeWindow.js
const { dedupeSameDayMilestones } = require('../services/calendarEvents');

let pass = 0, fail = 0;
const D = (s) => new Date(s + 'T12:00:00.000Z');
const ev = (type, date, extra = {}) => ({ contractId: 'C1', type, date: D(date), title: type, ...extra });
const rem = (type, date, originalEvent, daysUntil) =>
  ({ contractId: 'C1', type, date: D(date), title: `${daysUntil} Tage vorher`, metadata: { originalEvent, daysUntil } });

function check(name, cond) { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  ❌ ${name}`); } }
const types = (arr) => arr.map(e => `${e.type}@${e.date.toISOString().slice(0,10)}`).sort();

// ───────── Fall 1: Pixelwerk — 2 CONTRACT_END 1 Tag auseinander (30.06 + 01.07) ─────────
console.log('\n=== Fall 1: Pixelwerk (12 Events, Dopplung 30.06/01.07) ===');
const pixel = [
  ev('CANCEL_WINDOW_OPEN', '2028-03-02'),
  ev('LAST_CANCEL_DAY',    '2028-04-01'),
  ev('CANCEL_WARNING',     '2028-03-25'),
  ev('REVIEW',             '2027-06-15'),
  ev('CONTRACT_START',     '2026-07-01'),
  rem('CONTRACT_START_REMINDER_7D', '2026-06-24', 'CONTRACT_START', 7),
  ev('CONTRACT_END',       '2028-06-30'),                              // ← soll BLEIBEN (früheres Ende)
  rem('CONTRACT_END_REMINDER_30D', '2028-05-31', 'CONTRACT_END', 30),  // target 30.06 → bleibt
  rem('CONTRACT_END_REMINDER_7D',  '2028-06-23', 'CONTRACT_END', 7),   // target 30.06 → bleibt
  ev('CONTRACT_END',       '2028-07-01'),                              // ← soll WEG
  rem('CONTRACT_END_REMINDER_30D', '2028-06-01', 'CONTRACT_END', 30),  // target 01.07 → weg
  rem('CONTRACT_END_REMINDER_7D',  '2028-06-24', 'CONTRACT_END', 7),   // target 01.07 → weg
];
const r1 = dedupeSameDayMilestones(pixel);
check('genau 3 Events entfernt', r1.dropped.length === 3);
check('9 Events bleiben', r1.kept.length === 9);
const keptEnds = r1.kept.filter(e => e.type === 'CONTRACT_END');
check('nur 1 CONTRACT_END bleibt', keptEnds.length === 1);
check('das BLEIBENDE Ende ist der 30.06 (früher)', keptEnds[0] && keptEnds[0].date.toISOString().slice(0,10) === '2028-06-30');
const keptEndReminders = r1.kept.filter(e => /CONTRACT_END_REMINDER/.test(e.type));
check('bleibendes Ende behält BEIDE Vorwarner (30D+7D)', keptEndReminders.length === 2);
check('bleibende Vorwarner sind die 30.06-Serie (31.05 + 23.06)',
  types(keptEndReminders).join(',') === ['CONTRACT_END_REMINDER_30D@2028-05-31','CONTRACT_END_REMINDER_7D@2028-06-23'].join(','));
check('Lifecycle (CANCEL_*/REVIEW) unangetastet',
  ['CANCEL_WINDOW_OPEN','LAST_CANCEL_DAY','CANCEL_WARNING','REVIEW'].every(t => r1.kept.some(e => e.type === t)));
check('CONTRACT_START + sein Vorwarner bleiben',
  r1.kept.some(e => e.type === 'CONTRACT_START') && r1.kept.some(e => e.type === 'CONTRACT_START_REMINDER_7D'));

// ───────── Fall 2: Brennecke — echte verschiedene Termine (nichts darf wegfallen) ─────────
console.log('\n=== Fall 2: Brennecke (11 Events, keine Dopplung) ===');
const bren = [
  ev('CONTRACT_END', '2026-07-31'),
  rem('CONTRACT_END_REMINDER_30D', '2026-07-01', 'CONTRACT_END', 30),
  rem('CONTRACT_END_REMINDER_7D',  '2026-07-24', 'CONTRACT_END', 7),
  ev('SERVICE_START', '2026-07-01'),
  rem('SERVICE_START_REMINDER_7D', '2026-06-24', 'SERVICE_START', 7),
  ev('PAYMENT_DUE', '2026-12-31'),
  rem('PAYMENT_DUE_REMINDER_30D', '2026-12-01', 'PAYMENT_DUE', 30),
  rem('PAYMENT_DUE_REMINDER_7D',  '2026-12-24', 'PAYMENT_DUE', 7),
  ev('PAYMENT_DUE', '2027-01-31'),
  rem('PAYMENT_DUE_REMINDER_30D', '2027-01-01', 'PAYMENT_DUE', 30),
  rem('PAYMENT_DUE_REMINDER_7D',  '2027-01-24', 'PAYMENT_DUE', 7),
];
const r2 = dedupeSameDayMilestones(bren);
check('NICHTS entfernt (alle 11 bleiben)', r2.dropped.length === 0 && r2.kept.length === 11);

// ───────── Fall 3: TerraTech — Start + weit entferntes Ende (keine Berührung) ─────────
console.log('\n=== Fall 3: TerraTech (5 Events, Start + Ende 3 Jahre auseinander) ===');
const terra = [
  ev('CONTRACT_START', '2026-08-01'),
  rem('CONTRACT_START_REMINDER_7D', '2026-07-25', 'CONTRACT_START', 7),
  ev('CONTRACT_END', '2029-08-01'),
  rem('CONTRACT_END_REMINDER_30D', '2029-07-02', 'CONTRACT_END', 30),
  rem('CONTRACT_END_REMINDER_7D',  '2029-07-25', 'CONTRACT_END', 7),
];
const r3 = dedupeSameDayMilestones(terra);
check('NICHTS entfernt (alle 5 bleiben)', r3.dropped.length === 0 && r3.kept.length === 5);

// ───────── Fall 4: Regression — AUTO_RENEWAL taggleich mit CONTRACT_END (Pass 1) ─────────
console.log('\n=== Fall 4: Regression Pass-1 (AUTO_RENEWAL == Tag CONTRACT_END) ===');
const r4set = [
  ev('CONTRACT_END', '2028-06-30'),
  ev('AUTO_RENEWAL', '2028-06-30'),
  rem('AUTO_RENEWAL_REMINDER_30D', '2028-05-31', 'AUTO_RENEWAL', 30),
];
const r4 = dedupeSameDayMilestones(r4set);
check('AUTO_RENEWAL + sein Vorwarner weg, CONTRACT_END bleibt',
  r4.kept.length === 1 && r4.kept[0].type === 'CONTRACT_END');

console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────`);
process.exit(fail === 0 ? 0 : 1);
