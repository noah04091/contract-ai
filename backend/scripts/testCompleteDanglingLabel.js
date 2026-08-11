/**
 * testCompleteDanglingLabel.js — Unit-Tests für completeDanglingLabel (calendarEvents.js)
 *
 * Der Helfer vervollständigt KI-Labels mit hängender Präposition
 * ("Kündigungseingang bis") um das Frist-Datum. Regeln:
 *  - Nur bei hängender Präposition am Ende (bis|zum|am|ab|vor|für|von|spätestens)
 *  - Ohne gültiges Datum: Label UNVERÄNDERT (kein Kappen — sonst bricht der
 *    includes()-Abgleich "Ist schon im Kalender?" in ContractDetailsV2)
 *  - Idempotent: Label mit Datum am Ende wird nie doppelt ergänzt
 *
 * Aufruf: node scripts/testCompleteDanglingLabel.js
 */
const { completeDanglingLabel } = require('../services/calendarEvents');

const D = new Date(2026, 7, 23, 12, 0, 0); // 23.08.2026 12:00 lokal

const cases = [
  // [Beschreibung, label, date, erwartet]
  ['Kernfall: "bis" + Datum', 'Kündigungseingang bis', D, 'Kündigungseingang bis 23.08.2026'],
  ['"zum" + Datum', 'Kündigung zum', D, 'Kündigung zum 23.08.2026'],
  ['"spätestens" + Datum', 'Netzanschluss spätestens', D, 'Netzanschluss spätestens 23.08.2026'],
  ['"ab" + Datum', 'Verlängerung ab', D, 'Verlängerung ab 23.08.2026'],
  ['"am" + Datum', 'Fällig am', D, 'Fällig am 23.08.2026'],

  // Nicht-hängende Labels bleiben unangetastet
  ['Vollständiges Label', 'Mindestlaufzeit endet', D, 'Mindestlaufzeit endet'],
  ['Einzelwort', 'Vertragsbeginn', D, 'Vertragsbeginn'],
  ['Label mit Umlaut, kein Dangling', 'Erste Rate fällig', D, 'Erste Rate fällig'],
  ['"vorher" ist KEIN "vor"-Treffer', '30 Tage vorher', D, '30 Tage vorher'],
  ['Wort endet auf "bis" ohne Leerzeichen', 'Anis', D, 'Anis'],
  ['Nur-Präposition ohne führendes Leerzeichen', 'Bis', D, 'Bis'],

  // Idempotenz: bereits vervollständigt → kein Doppel-Anhängen
  ['Idempotenz', 'Kündigungseingang bis 23.08.2026', D, 'Kündigungseingang bis 23.08.2026'],

  // Ohne gültiges Datum: UNVERÄNDERT lassen (kein Kappen!)
  ['Ungültiges Datum → unverändert', 'Kündigungseingang bis', 'quatsch-datum', 'Kündigungseingang bis'],
  ['Invalid-Date-Objekt → unverändert', 'Kündigungseingang bis', new Date('nope'), 'Kündigungseingang bis'],
  ['null-Datum → unverändert (nicht 01.01.1970!)', 'Kündigungseingang bis', null, 'Kündigungseingang bis'],
  ['undefined-Datum → unverändert', 'Kündigungseingang bis', undefined, 'Kündigungseingang bis'],

  // BEWUSSTE Entscheidung (adversarialer Review 11.08.2026): KEINE Satzzeichen-
  // Toleranz. Das Anhängen müsste das Satzzeichen kappen → der Titel enthielte
  // das Label nicht mehr wörtlich → title.includes(label)-Duplikat-Heuristik
  // (ContractDetailsV2/AnalysisImportantDates) bräche → Duplikat-Termine.
  ['Präposition mit Doppelpunkt bleibt UNVERÄNDERT', 'Kündigungseingang bis:', D, 'Kündigungseingang bis:'],
  ['Präposition mit Punkt bleibt UNVERÄNDERT', 'Kündigungseingang bis.', D, 'Kündigungseingang bis.'],
  ['Satzzeichen ohne Präposition bleibt', 'Mindestlaufzeit endet:', D, 'Mindestlaufzeit endet:'],
  ['Datum am Ende + Punkt bleibt unangetastet', 'Kündigungseingang bis 23.08.2026.', D, 'Kündigungseingang bis 23.08.2026.'],

  // BEWUSSTE Entscheidung: vor/für/von NICHT in der Präpositions-Liste —
  // "liegt vor" = "ist eingegangen"; ein Datum dahinter kehrt die Bedeutung um.
  ['Semantik-Schutz: "liegt vor" bleibt', 'Kündigung liegt vor', D, 'Kündigung liegt vor'],
  ['Semantik-Schutz: "für" bleibt', 'Zahlung für', D, 'Zahlung für'],
  ['Semantik-Schutz: "von" bleibt', 'Vollmacht von', D, 'Vollmacht von'],

  // Defensive Eingaben
  ['Leerstring', '', D, ''],
  ['null-Label', null, D, null],
  ['Whitespace am Label-Ende', 'Kündigungseingang bis  ', D, 'Kündigungseingang bis 23.08.2026'],
  ['NBSP vor Präposition', 'Kündigungseingang bis', D, 'Kündigungseingang bis 23.08.2026'],
  ['Datum als ISO-String', 'Kündigungseingang bis', '2026-08-23T12:00:00.000Z', 'Kündigungseingang bis 23.08.2026'],
];

let passed = 0, failed = 0;
for (const [name, label, date, want] of cases) {
  const got = completeDanglingLabel(label, date);
  if (got === want) {
    passed++;
    console.log(`  ✅ ${name}`);
  } else {
    failed++;
    console.log(`  ❌ ${name}: erwartet ${JSON.stringify(want)}, bekommen ${JSON.stringify(got)}`);
  }
}

console.log(`\n──────── Ergebnis: ${passed} bestanden, ${failed} fehlgeschlagen ────────`);
process.exit(failed ? 1 : 0);
