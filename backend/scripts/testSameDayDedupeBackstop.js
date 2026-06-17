/**
 * Test für den Same-Day-Dedup-Backstop (Pass 3 in dedupeSameDayMilestones).
 * Deckt die zwei KI-Doppel-Extraktions-Muster aus dem Komplex-Test 17.06.2026 ab,
 * die Pass 1/2 (MILESTONE_SEM_GROUP) NICHT erfassen.
 *   node backend/scripts/testSameDayDedupeBackstop.js
 *
 *  S7  Aurelis-Muster: NOTICE_PERIOD 2× (gleicher Typ+Tag+Titel) → 1 bleibt
 *  S7b kein Over-Merge: gleicher Typ+Tag, ABER verschiedener Titel → beide bleiben
 *  S8  Gewerbemiete-Muster: PAYMENT_DUE + renewal_date-AUTO_RENEWAL selber Tag (kein Auto-Renewal)
 *      → spurious AUTO_RENEWAL + seine Vorwarnungen raus, PAYMENT_DUE + Vorwarnungen bleiben
 *  S8b Guard Auto-Renewal=true: beide bleiben (echter Verlängerungs-Vertrag wird nicht angefasst)
 *  S8c Guard Rückwärtskompat: ohne opts (Alt-Aufruf) feuert 3b NICHT → beide bleiben
 */
const { dedupeSameDayMilestones } = require('../services/calendarEvents');

let pass = 0, fail = 0;
const ok = (n, c, info = '') => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n} ${info}`); } };
const D = (s) => new Date(s);
const main = (type, date, title, originalType) => ({
  contractId: 'C', userId: 'U', type, date: D(date), title,
  metadata: { originalType }, severity: 'warning', status: 'scheduled',
});
const rem = (type, date, originalEvent, daysUntil) => ({
  contractId: 'C', userId: 'U', type, date: D(date), title: `${daysUntil} Tage vorher: x`,
  metadata: { originalEvent, daysUntil }, severity: 'info', status: 'scheduled',
});
const count = (evs, t) => evs.filter(e => e.type === t).length;

// ── S7: NOTICE_PERIOD doppelt (gleicher Typ+Tag+Titel) ──
console.log('\n=== S7: NOTICE_PERIOD 2× (Aurelis-Probezeit-Kündigungsfrist) ===');
{
  const T = '📬 Kündigungsfrist während der Probezeit';
  const evs = [
    main('NOTICE_PERIOD', '2026-11-15', T, 'kuendigungsfrist'),
    main('NOTICE_PERIOD', '2026-11-15', T, 'kuendigungsfrist'),
  ];
  const { kept, dropped } = dedupeSameDayMilestones(evs, { isAutoRenewal: false });
  ok('genau EIN NOTICE_PERIOD bleibt', count(kept, 'NOTICE_PERIOD') === 1, `bekommen: ${count(kept, 'NOTICE_PERIOD')}`);
  ok('genau EINS verworfen', dropped.length === 1, `bekommen: ${dropped.length}`);
}

// ── S7b: gleicher Typ+Tag, ABER anderer Titel → KEIN Merge ──
console.log('\n=== S7b: gleicher Typ+Tag, anderer Titel → beide bleiben (kein Over-Merge) ===');
{
  const evs = [
    main('PAYMENT_DUE', '2027-01-01', '💰 Miete Januar', 'payment_due'),
    main('PAYMENT_DUE', '2027-01-01', '💰 Stellplatz Januar', 'payment_due'),
  ];
  const { kept } = dedupeSameDayMilestones(evs, { isAutoRenewal: false });
  ok('beide PAYMENT_DUE bleiben (verschiedene Titel)', count(kept, 'PAYMENT_DUE') === 2, `bekommen: ${count(kept, 'PAYMENT_DUE')}`);
}

// ── S8: Staffelmiete doppelt (PAYMENT_DUE + renewal_date-AUTO_RENEWAL) ohne Auto-Renewal ──
console.log('\n=== S8: PAYMENT_DUE + renewal-AUTO_RENEWAL selber Tag, kein Auto-Renewal ===');
{
  const evs = [
    main('PAYMENT_DUE', '2027-10-01', '💰 Erhöhung der Grundmiete 2027', 'payment_due'),
    rem('PAYMENT_DUE_REMINDER_30D', '2027-09-01', 'PAYMENT_DUE', 30),
    rem('PAYMENT_DUE_REMINDER_7D', '2027-09-24', 'PAYMENT_DUE', 7),
    main('AUTO_RENEWAL', '2027-10-01', '🔄 Staffelmiete Erhöhung auf 8900 EUR', 'renewal_date'),
    rem('AUTO_RENEWAL_REMINDER_30D', '2027-09-01', 'AUTO_RENEWAL', 30),
    rem('AUTO_RENEWAL_REMINDER_7D', '2027-09-24', 'AUTO_RENEWAL', 7),
  ];
  const { kept } = dedupeSameDayMilestones(evs, { isAutoRenewal: false });
  ok('spurious AUTO_RENEWAL (renewal_date) ist raus', count(kept, 'AUTO_RENEWAL') === 0, `bekommen: ${count(kept, 'AUTO_RENEWAL')}`);
  ok('beide AUTO_RENEWAL-Vorwarnungen sind raus (Waisen)',
     count(kept, 'AUTO_RENEWAL_REMINDER_30D') === 0 && count(kept, 'AUTO_RENEWAL_REMINDER_7D') === 0);
  ok('PAYMENT_DUE bleibt', count(kept, 'PAYMENT_DUE') === 1, `bekommen: ${count(kept, 'PAYMENT_DUE')}`);
  ok('beide PAYMENT_DUE-Vorwarnungen bleiben',
     count(kept, 'PAYMENT_DUE_REMINDER_30D') === 1 && count(kept, 'PAYMENT_DUE_REMINDER_7D') === 1);
  ok('Ergebnis = genau 3 Events (1 Main + 2 Vorwarnungen)', kept.length === 3, `bekommen: ${kept.length}`);
}

// ── S8b: gleiches Muster, ABER Auto-Renewal=true → beide bleiben ──
console.log('\n=== S8b: Guard — echter Auto-Renewal-Vertrag bleibt unangetastet ===');
{
  const evs = [
    main('PAYMENT_DUE', '2027-10-01', '💰 Zahlung', 'payment_due'),
    main('AUTO_RENEWAL', '2027-10-01', '🔄 Verlängerung', 'renewal_date'),
  ];
  const { kept } = dedupeSameDayMilestones(evs, { isAutoRenewal: true });
  ok('AUTO_RENEWAL bleibt (isAutoRenewal=true)', count(kept, 'AUTO_RENEWAL') === 1);
  ok('PAYMENT_DUE bleibt', count(kept, 'PAYMENT_DUE') === 1);
}

// ── S8c: Rückwärtskompat — ohne opts feuert 3b nicht ──
console.log('\n=== S8c: Guard — Alt-Aufruf ohne opts lässt 3b inaktiv ===');
{
  const evs = [
    main('PAYMENT_DUE', '2027-10-01', '💰 Zahlung', 'payment_due'),
    main('AUTO_RENEWAL', '2027-10-01', '🔄 Verlängerung', 'renewal_date'),
  ];
  const { kept } = dedupeSameDayMilestones(evs); // kein opts
  ok('ohne opts bleiben beide (kein versehentliches Droppen)', kept.length === 2, `bekommen: ${kept.length}`);
}

console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────`);
process.exit(fail === 0 ? 0 : 1);
