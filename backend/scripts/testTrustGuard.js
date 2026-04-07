/**
 * Isoliert-Test für isExplanationConsistent.
 * Prüft dass GPT-Halluzinationen erkannt werden.
 */
const fs = require('fs');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'services', 'compareAnalyzer.js'), 'utf-8');

// Extract parseGermanNumber
const pgnMatch = code.match(/function parseGermanNumber\(str\) \{[\s\S]*?^\}/m);
// Extract isExplanationConsistent
const iecMatch = code.match(/function isExplanationConsistent\([^)]*\) \{[\s\S]*?^  return true;\s*\n\}/m);

if (!pgnMatch || !iecMatch) {
  console.error('Konnte Funktionen nicht extrahieren');
  console.error('pgn:', !!pgnMatch, 'iec:', !!iecMatch);
  process.exit(1);
}

eval(pgnMatch[0]);
eval(iecMatch[0]);

const tests = [
  // [label, explanation, v1, v2, expected]
  ['konsistente Werte', 'Vertrag 1 zahlt 100 EUR, Vertrag 2 zahlt 200 EUR.', '100 EUR', '200 EUR', true],
  ['halluzinierte Zahl 500', 'Vertrag 1 zahlt 500 EUR, Vertrag 2 zahlt 200 EUR.', '100 EUR', '200 EUR', false],
  ['keine Zahlen', 'Keine Zahlen hier im Text.', '100 EUR', '200 EUR', true],
  ['Prozent konsistent', '3 % Skonto vs 5 % Skonto', 'Skonto 3%', 'Skonto 5%', true],
  ['Prozent halluziniert', '10 % Rabatt', 'Skonto 3%', 'Skonto 5%', false],
  ['Tausender konsistent', 'V1 3.000 EUR, V2 5.000 EUR', '3.000 EUR', '5.000 EUR', true],
  ['Tausender halluziniert', 'V1 3.500 EUR, V2 5.000 EUR', '3.000 EUR', '5.000 EUR', false],
  ['Paragraph-Nr ignorieren', 'Paragraph 5 Absatz 2', '100 EUR', '200 EUR', true],
  ['leere Erklärung', '', '100 EUR', '200 EUR', true],
  ['Tage konsistent', 'Lieferfrist 14 Tage vs 30 Tage', '14 Tage', '30 Tage', true],
  ['Tage halluziniert', 'Lieferfrist 60 Tage', '14 Tage', '30 Tage', false],
];

let pass = 0, fail = 0;
for (const [label, exp, v1, v2, expected] of tests) {
  const actual = isExplanationConsistent(exp, v1, v2);
  if (actual === expected) {
    pass++;
    console.log('PASS: ' + label);
  } else {
    fail++;
    console.log('FAIL: ' + label + ' | expected=' + expected + ' got=' + actual);
    console.log('      exp: "' + exp + '" | v1: "' + v1 + '" | v2: "' + v2 + '"');
  }
}

console.log('\n' + pass + '/' + (pass + fail) + ' Tests bestanden');
process.exit(fail > 0 ? 1 : 0);
