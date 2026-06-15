/**
 * Offline-Beweis: Meilenstein-Plausibilität (isMilestoneBeforeStart).
 * node backend/scripts/testMilestonePlausibility.js
 * Beweist: verwirft nur logisch unmögliche Termine (Ende/Frist vor Vertragsbeginn);
 * legitime Termine (echtes Ende nach Start, Unterzeichnung/Anzahlung vor Start) bleiben.
 */
const { isMilestoneBeforeStart } = require('../utils/milestonePlausibility');

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${info ? ' — ' + info : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${info ? ' — ' + info : ''}`); }
};
const r = (type, date, startDate) => isMilestoneBeforeStart({ type, date, startDate });

console.log('\n════════ isMilestoneBeforeStart ════════');

// 🎯 Brennecke: lease_end 12.02.2011, Start 01.07.2026 → verwerfen (DER Hauptfall)
ok('Brennecke: lease_end 2011 vor Start 2026 → verwerfen', r('lease_end', '2011-02-12', '2026-07-01') === true);

// Pixelwerk: echtes end_date 30.06.2028, Start 01.07.2026 → NICHT verwerfen (echtes Ende!)
ok('Pixelwerk: end_date 2028 nach Start 2026 → behalten', r('end_date', '2028-06-30', '2026-07-01') === false);

// Generischer Fall: irgendein Ende vor Start → verwerfen
ok('end_date vor Start → verwerfen', r('end_date', '2025-01-01', '2026-07-01') === true);
ok('renewal_date vor Start → verwerfen', r('renewal_date', '2020-01-01', '2026-07-01') === true);
ok('minimum_term_end vor Start → verwerfen', r('minimum_term_end', '2026-01-01', '2026-07-01') === true);
ok('license_expiry vor Start → verwerfen', r('license_expiry', '2024-01-01', '2026-07-01') === true);

// 🆕 15.06.2026 (TÜV): korrigiertes Vokabular — diese ECHTEN Typen (vorher fehlend/fehl-benannt)
// müssen jetzt greifen, sonst lebt der lease_end-Bypass über sie weiter:
ok('warranty_end vor Start → verwerfen (war Bypass-Lücke)', r('warranty_end', '2025-01-01', '2026-07-01') === true);
ok('probation_end vor Start → verwerfen', r('probation_end', '2026-01-01', '2026-07-01') === true);
ok('price_guarantee_end vor Start → verwerfen', r('price_guarantee_end', '2025-06-01', '2026-07-01') === true);
ok('option_deadline vor Start → verwerfen', r('option_deadline', '2024-01-01', '2026-07-01') === true);
ok('insurance_coverage_end (korrekter Name) vor Start → verwerfen', r('insurance_coverage_end', '2020-01-01', '2026-07-01') === true);
ok('notice_period_start (korrekter Name) vor Start → verwerfen', r('notice_period_start', '2025-01-01', '2026-07-01') === true);
ok('inspection_due vor Start → verwerfen', r('inspection_due', '2025-01-01', '2026-07-01') === true);
ok('interest_rate_change vor Start → verwerfen', r('interest_rate_change', '2025-01-01', '2026-07-01') === true);

// 🛡️ Ausnahmen — dürfen vor/am Start liegen, NICHT verwerfen:
ok('payment_due (Anzahlung) vor Start → behalten (nicht im Set)', r('payment_due', '2026-06-15', '2026-07-01') === false);
ok('delivery_date vor Start → behalten (nicht im Set)', r('delivery_date', '2026-06-15', '2026-07-01') === false);
ok('contract_signed VOR Start → behalten (Unterzeichnung legitim vor Inkrafttreten)', r('contract_signed', '2026-06-20', '2026-07-01') === false);
ok('start_date == Start → behalten', r('start_date', '2026-07-01', '2026-07-01') === false);
ok('service_start == Start → behalten', r('service_start', '2026-07-01', '2026-07-01') === false);
ok('payment_due (Anzahlung) vor Start → behalten (legitim)', r('payment_due', '2026-06-15', '2026-07-01') === false);

// Grenzfälle / Robustheit:
ok('Ende == Start (nicht VOR) → behalten', r('end_date', '2026-07-01', '2026-07-01') === false);
ok('kein startDate → nicht anfassen (behalten)', r('lease_end', '2011-02-12', null) === false);
ok('unparsebares Datum → nicht anfassen (behalten)', r('end_date', 'keinDatum', '2026-07-01') === false);
ok('unbekannter Typ vor Start → nicht in Liste, behalten', r('some_other_type', '2020-01-01', '2026-07-01') === false);

console.log('\n════════════════════════════════════════════════');
console.log(`ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen`);
console.log('════════════════════════════════════════════════\n');
process.exit(fail === 0 ? 0 : 1);
