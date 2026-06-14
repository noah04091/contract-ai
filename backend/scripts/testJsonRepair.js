/**
 * Offline-Beweis Robustheit C (14.06.2026): tolerantes JSON-Parsen (tryParseLenient).
 * node backend/scripts/testJsonRepair.js
 * Beweist: valides JSON unverändert; abgeschnittenes JSON wird konservativ gerettet
 * (ohne Werte zu erfinden); echter Müll → ok:false (klarer Fehler im Aufrufer).
 */
const { tryParseLenient } = require('../utils/jsonRepair');

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}${info ? ' — ' + info : ''}`); }
  else { fail++; console.log(`  ❌ ${name}${info ? ' — ' + info : ''}`); }
};

console.log('\n════════ tryParseLenient ════════');

// 1) Valides JSON → unverändert, NICHT repariert
let r = tryParseLenient('{"contractScore":55,"summary":["ok"],"a":{"b":1}}');
ok('valides JSON → ok, repaired=false', r.ok && r.repaired === false && r.value.contractScore === 55);

// 2) Abgeschnitten: offene Objekte/Arrays nicht geschlossen
r = tryParseLenient('{"contractScore":55,"summary":["Punkt 1","Punkt 2"');
ok('offenes Array/Objekt → gerettet', r.ok && r.repaired === true && r.value.contractScore === 55 && Array.isArray(r.value.summary) && r.value.summary.length === 2, JSON.stringify(r.value && r.value.summary));

// 3) Abgeschnitten mitten in einem String-Wert
r = tryParseLenient('{"contractScore":42,"detailedLegalOpinion":"Dieser Vertrag ist grundsätzlich in Ord');
ok('offene Zeichenkette → gerettet (Wert ggf. mitten abgeschnitten)', r.ok && r.repaired === true && r.value.contractScore === 42 && typeof r.value.detailedLegalOpinion === 'string');

// 4) Abgeschnitten nach Komma + angefangener Property ohne Wert
r = tryParseLenient('{"contractScore":60,"summary":["a"],"criticalIssues":[{"title":"X"}],"recommen');
ok('unvollständige Trailing-Property → letzte abschneiden, Rest gerettet', r.ok && r.repaired === true && r.value.contractScore === 60 && Array.isArray(r.value.criticalIssues), JSON.stringify(r.value && Object.keys(r.value)));

// 5) Tief verschachtelt + abgeschnitten
r = tryParseLenient('{"a":{"b":{"c":[1,2,3]');
ok('tiefe Verschachtelung → gerettet', r.ok && r.repaired === true && r.value.a.b.c.length === 3);

// 6) Erfindet KEINE Werte: gerettetes Objekt enthält nur, was da war
r = tryParseLenient('{"contractScore":55,"summary":["nur das"');
ok('keine erfundenen Felder (nur contractScore+summary)', r.ok && Object.keys(r.value).sort().join(',') === 'contractScore,summary');

// 7) Echter Müll / kein JSON → ok:false (Aufrufer gibt klaren Fehler)
ok('kein JSON ("Es tut mir leid…") → ok:false', tryParseLenient('Es tut mir leid, ich kann nicht...').ok === false);
ok('leer → ok:false', tryParseLenient('').ok === false);
ok('null → ok:false', tryParseLenient(null).ok === false);
ok('kaputt mitten drin (nicht nur Ende) → ok:false', tryParseLenient('{"a":1 "b":2}').ok === false);

console.log('\n════════════════════════════════════════════════');
console.log(`ERGEBNIS: ${pass} bestanden, ${fail} fehlgeschlagen`);
console.log('════════════════════════════════════════════════\n');
process.exit(fail === 0 ? 0 : 1);
