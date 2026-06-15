/**
 * Offline-Beweis: Enddatum-Plausibilität (shouldClearExpiry).
 * node backend/scripts/testExpiryPlausibility.js
 * Beweist: leert nur verdächtige Enddaten (Vergangenheit ODER ==Start); echte Enddaten unberührt.
 */
const { shouldClearExpiry, isImplausibleAiEndDate } = require('../utils/expiryPlausibility');

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${info ? ' — ' + info : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${info ? ' — ' + info : ''}`); }
};

const NOW = new Date('2026-06-15T12:00:00Z'); // fixer Bezugspunkt für Determinismus
const r = (exp, start) => shouldClearExpiry({ expiryDate: exp, startDate: start, now: NOW });
const rc = (exp, start, cands) => shouldClearExpiry({ expiryDate: exp, startDate: start, startCandidates: cands, now: NOW });

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

// 🆕 TerraTech-Fall (15.06.2026): startDate-Feld LEER, aber KI erkannte Beginn als start_date-Termin.
// Ende == dieser Beginn-Termin → leeren (equals_start), obwohl startDate null ist.
ok('TerraTech: Ende == start_date-Termin (startDate-Feld leer) → clear equals_start',
   (() => { const x = rc('2026-08-01', null, ['2026-08-01']); return x.clear && x.reason === 'equals_start'; })());
// Echtes Enddatum != Beginn-Kandidaten → NICHT leeren (Pixelwerk-artig: Start 01.07., Ende 30.06.2028)
ok('Ende ≠ start_date-Termin → KEIN clear', rc('2028-06-30', '2026-07-01', ['2026-07-01']).clear === false);
// Mehrere Kandidaten, einer passt → clear
ok('Ende == einer von mehreren start-Kandidaten → clear', rc('2026-09-01', null, ['2026-07-01','2026-09-01']).clear === true);
// startCandidates leer/kein Treffer → wie bisher (kein clear)
ok('leere startCandidates, Ende Zukunft → KEIN clear', rc('2027-01-01', null, []).clear === false);
// Rückwärtskompatibel: ohne startCandidates verhält es sich exakt wie vorher
ok('ohne startCandidates: Ende==Start → clear (unverändert)', r('2026-07-01','2026-07-01').clear === true);

// ══════════ TÜV-Fund #1: isImplausibleAiEndDate (KI-Enddatum-Guard) ══════════
console.log('\n════════ isImplausibleAiEndDate (TÜV-Fund #1) ════════');
const sd = [{ type: 'start_date', date: '2026-08-01' }]; // KI-erkannter Beginn
// Bogus KI-Enddaten, die VORHER direkt als expiryDate durchrutschten → jetzt verworfen:
ok('KI-Ende in Vergangenheit → verwerfen', isImplausibleAiEndDate(new Date('2024-01-01'), '2026-08-01', sd) === true);
ok('KI-Ende == Startdatum-Feld → verwerfen', isImplausibleAiEndDate(new Date('2026-08-01'), '2026-08-01', []) === true);
ok('KI-Ende == start_date-Termin (Feld leer) → verwerfen', isImplausibleAiEndDate(new Date('2026-08-01'), null, sd) === true);
ok('KI-Ende VOR Start (Zukunft, ≠Start) → verwerfen (war DIE Lücke)',
   isImplausibleAiEndDate(new Date('2028-01-01'), '2030-01-01', []) === true);
// Echtes KI-Enddatum NACH Start → NICHT verwerfen (darf nie verloren gehen):
ok('echtes KI-Ende (nach Start) → behalten', isImplausibleAiEndDate(new Date('2028-06-30'), '2026-07-01', []) === false);
// Edge (QC 15.06.): startDate-Feld leer, KI-Ende strikt VOR nur-in-importantDates-Beginn → verwerfen
ok('KI-Ende < start_date-Termin (Feld leer, strikt vorher) → verwerfen', isImplausibleAiEndDate(new Date('2026-07-01'), null, sd) === true);
ok('echtes KI-Ende NACH start_date-Termin (Feld leer) → behalten', isImplausibleAiEndDate(new Date('2027-01-01'), null, sd) === false);
ok('kein KI-Ende (null) → behalten (nichts zu tun)', isImplausibleAiEndDate(null, '2026-07-01', []) === false);

console.log('\n════════════════════════════════════════════════');
console.log(`ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen`);
console.log('════════════════════════════════════════════════\n');
process.exit(fail === 0 ? 0 : 1);
