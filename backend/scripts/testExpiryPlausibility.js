/**
 * Offline-Beweis: Enddatum-Plausibilität (shouldClearExpiry).
 * node backend/scripts/testExpiryPlausibility.js
 * Beweist: leert nur verdächtige Enddaten (Vergangenheit ODER ==Start); echte Enddaten unberührt.
 */
const { shouldClearExpiry } = require('../utils/expiryPlausibility');

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${info ? ' — ' + info : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${info ? ' — ' + info : ''}`); }
};

const NOW = new Date('2026-06-15T12:00:00Z'); // fixer Bezugspunkt für Determinismus
const r = (exp, start) => shouldClearExpiry({ expiryDate: exp, startDate: start, now: NOW });

console.log('\n════════ shouldClearExpiry ════════');

// (b) Ende == Start → leeren (der 40-Verträge-Datenfehler)
ok('Ende == Start (beide Zukunft) → clear equals_start',
   (() => { const x = r('2026-07-01', '2026-07-01'); return x.clear && x.reason === 'equals_start'; })());

// (a) Ende in Vergangenheit → leeren (bisheriges Verhalten, bleibt)
ok('Ende in Vergangenheit → clear past', (() => { const x = r('2024-01-01', '2023-12-01'); return x.clear && x.reason === 'past'; })());

// Echtes Enddatum NACH Start → NICHT leeren (darf nie verloren gehen)
ok('echtes Enddatum (Zukunft, ≠ Start) → KEIN clear', r('2028-06-30', '2026-07-01').clear === false, 'Pixelwerk-artig');
ok('kurzer Vertrag 1 Tag später → KEIN clear', r('2026-07-02', '2026-07-01').clear === false, 'kein Über-Löschen');

// Kein Startdatum vorhanden → equals_start kann nicht feuern
ok('Enddatum Zukunft, Start null → KEIN clear', r('2027-01-01', null).clear === false);

// Kein Enddatum → nichts zu tun
ok('expiry null → KEIN clear', r(null, '2026-07-01').clear === false);

// Robustheit gegen Müll
ok('unparsebares Enddatum → KEIN clear (nicht anfassen)', r('keinDatum', '2026-07-01').clear === false);

// Vergangenheit hat Vorrang, auch wenn == Start
ok('Ende == Start, beide Vergangenheit → clear (past)', (() => { const x = r('2020-01-01', '2020-01-01'); return x.clear === true; })());

console.log('\n════════════════════════════════════════════════');
console.log(`ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen`);
console.log('════════════════════════════════════════════════\n');
process.exit(fail === 0 ? 0 : 1);
