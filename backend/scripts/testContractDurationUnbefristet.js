/**
 * Offline-Beweis (D-2): extractContractDuration erkennt "unbefristet" korrekt als KEINE feste Laufzeit.
 * node backend/scripts/testContractDurationUnbefristet.js
 * Beweist: TerraTech ("auf unbestimmte Zeit" + "jährlich"-Abrechnung) → null (nicht "1 Jahr").
 * Echte befristete/Jahres-Verträge bleiben unverändert (keine Regression).
 */
const analyzer = require('../services/contractAnalyzer');

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${info ? ' — ' + info : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${info ? ' — ' + info : ''}`); }
};
const dur = (t) => analyzer.extractContractDuration(t);

console.log('\n════════ extractContractDuration — unbefristet-Vorrang ════════');

// 🎯 DER Fall: TerraTech — § 6 "auf unbestimmte Zeit" + § 4 "Abrechnung … jährlich"
const terra = 'Der Vertrag tritt am 01.08.2026 in Kraft und wird auf unbestimmte Zeit geschlossen. ' +
              'Die Abrechnung der Provisionen erfolgt jährlich jeweils zum Jahresende.';
ok('TerraTech (unbestimmte Zeit + "jährlich"-Abrechnung) → NULL (nicht 1 Jahr)', dur(terra) === null,
   `bekommen: ${JSON.stringify(dur(terra))}`);

// "unbefristet" als Stichwort → null
ok('"unbefristet geschlossen" → NULL', dur('Dieser Vertrag wird unbefristet geschlossen.') === null);
ok('"auf unbestimmte Dauer" → NULL', dur('Das Vertragsverhältnis läuft auf unbestimmte Dauer.') === null);

// ⚠️ KEINE Regression: echter Jahresvertrag (kein "unbefristet") → bleibt 1 Jahr
const annual = 'Der Vertrag verlängert sich jeweils um ein Jahr, sofern nicht gekündigt wird.';
ok('echter Jahresvertrag ("um ein Jahr", kein unbefristet) → 1 Jahr (unverändert)',
   (() => { const d = dur(annual); return d && d.unit === 'years' && d.value === 1; })(),
   `bekommen: ${JSON.stringify(dur(annual))}`);

// KEINE Regression auf dem Pattern-Pfad: ein vom Regex matchbares Laufzeit-Muster
// ("Laufzeit: 24 Monate"), kein "unbefristet" → unverändert 24 Monate.
const months24 = 'Laufzeit: 24 Monate ab Vertragsbeginn.';
ok('matchbare "Laufzeit: 24 Monate" (kein unbefristet) → 24 Monate (unverändert)',
   (() => { const d = dur(months24); return d && d.unit === 'months' && d.value === 24; })(),
   `bekommen: ${JSON.stringify(dur(months24))}`);

// Vorrang dokumentiert: feste Laufzeit + "danach auf unbestimmte Zeit" → unbefristet gewinnt (null)
const mixed = 'Laufzeit: 24 Monate, danach läuft der Vertrag auf unbestimmte Zeit weiter.';
ok('"24 Monate, danach auf unbestimmte Zeit" → NULL (unbefristet hat Vorrang, bewusst)', dur(mixed) === null);

// Versicherung ohne Laufzeit-Angabe → Default 1 Jahr (unverändert) — solange NICHT unbefristet
ok('Versicherung ohne Dauer (kein unbefristet) → Default 1 Jahr (unverändert)',
   (() => { const d = dur('Ihre Versicherung Police Nr. 123.'); return d && d.value === 1; })());

// Kein Treffer, kein unbefristet → null (unverändert)
ok('kein Treffer → NULL (unverändert)', dur('Irgendein Text ohne Laufzeit-Angabe.') === null);

console.log('\n════════════════════════════════════════════════');
console.log(`ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen`);
console.log('════════════════════════════════════════════════\n');
process.exit(fail === 0 ? 0 : 1);
