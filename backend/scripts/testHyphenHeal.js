// 🩹 Silbentrennungs-/Umlaut-Heilung (21.07.2026) — Offline-Beweis.
// Testfälle = EXAKTE Strings aus Noahs Live-Analyse des GVP-Tarifwerks (21.07.),
// bei der echte Fristen als evidence_not_in_text verworfen wurden:
//   A) "fol- genden" (Silbentrennung als Hyphen+SPACE, pdf-parse-typisch)
//   B) "Beschäftigungsver- hältnisses" (gleiches Muster)
//   C) "hoherwertigen/ubertragen" (LLM tippt Umlaute ohne Punkte)
// Regressions-Schutz:
//   D) Ergänzungsstrich "Urlaubs- und Weihnachtsgeld" wird NICHT zusammengezogen
//   E) Halluzinationen (nicht im Text) scheitern weiterhin
//   F) bisherige Fälle (Zeilenumbruch-Trennung, \uXXXX, Satzzeichen-Strip) bleiben grün
// Aufruf: node scripts/testHyphenHeal.js
/* eslint-disable no-console */
const { normalize, evidenceMatchesText } = require('../services/dateHuntService');

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ✅ ${name}`); }
  else { fail++; console.error(`  ❌ ${name}${detail ? ` — ${detail}` : ''}`); }
};
const matches = (evidence, text) => evidenceMatchesText(normalize(evidence), normalize(text));

console.log('A) Live-Fall #13: Silbentrennung als Hyphen+Space');
const textA = 'ht. § 4.4 Das Arbeitszeitkonto ist spätestens nach 12 Monaten auszugleichen. Ist der Zeitausgleich in diesem Zeitraum nicht möglich, ist er in den fol- genden drei Monaten vorzunehmen. Dazu hat der Arbeitgeber mit dem';
const evA = 'Das Arbeitszeitkonto ist spätestens nach 12 Monaten auszugleichen. Ist der Zeitausgleich in diesem Zeitraum nicht möglich, ist er in den folgenden drei Monaten vorzunehmen.';
check('„folgenden" matcht „fol- genden"', matches(evA, textA));

console.log('B) Live-Fall #37: „Beschäftigungsver- hältnisses"');
const textB = '17.2 Die Berechnung des ununterbrochenen Bestehens des Beschäftigungsver- hältnisses im Sinne dieses Tarifvertrages erfolgt ab Stichtag 1. Januar 2002. § 18 Inkrafttreten';
const evB = 'Die Berechnung des ununterbrochenen Bestehens des Beschäftigungsverhältnisses im Sinne dieses Tarifvertrages erfolgt ab Stichtag 1. Januar 2002.';
check('„Beschäftigungsverhältnisses" matcht getrennte Form', matches(evB, textB));

console.log('C) Live-Fall #41: LLM ohne Umlaut-Punkte');
const textC = 'Sofern zeitweise Arbeiten einer höherwertigen Entgeltgruppe übertragen werden, ist ab der 6. Woche eine Zulage in Höhe der Differenz zwischen dem tariflichen Entgelt der niedrigeren Entgeltgruppe und dem für die Tätigkeit vorgesehenen Entgelt zu zahlen.';
const evC = 'Sofern zeitweise Arbeiten einer hoherwertigen Entgeltgruppe ubertragen werden, ist ab der 6. Woche eine Zulage in Hohe der Differenz zwischen dem tariflichen Entgelt der niedrigeren Entgeltgruppe und dem fur die Tatigkeit vorgesehenen Entgelt zu zahlen.';
check('umlaut-lose Evidence matcht Umlaut-Text', matches(evC, textC));

console.log('D) Regressions-Schutz: Ergänzungsstrich bleibt erhalten');
check('normalize lässt „urlaubs- und" intakt', normalize('Urlaubs- und Weihnachtsgeld').includes('urlaubs- und'));
check('Zitat „Urlaubs- und Weihnachtsgeld" matcht 1:1', matches('Urlaubs- und Weihnachtsgeld werden gezahlt', 'Das Urlaubs- und Weihnachtsgeld werden gezahlt, wenn'));
check('auch „sowie/oder/bzw." geschützt', normalize('Vor- oder Nachteile sowie Kosten- bzw. Gebührenfragen').includes('vor- oder') && normalize('Kosten- bzw. Gebühren').includes('kosten- bzw'));

console.log('E) Halluzinations-Schutz unverändert');
check('erfundene Frist scheitert weiter', !matches('Die Kündigungsfrist beträgt vier Wochen zum Quartalsende.', textA));
check('erfundener Halbsatz scheitert trotz Umlaut-Fallback', !matches('Der Arbeitnehmer erhaelt eine Abfindung in Hoehe von drei Monatsgehaeltern.', textC));
check('zu kurze umlaut-lose Evidence greift nicht (15-Zeichen-Guard)', !matches('in Hohe', 'völlig anderer Text ohne die Wörter — in Höhle des Löwen'));

console.log('F) Bisherige Toleranzen bleiben grün');
check('Zeilenumbruch-Trennung (alter Fall)', matches('die folgenden drei Monate gelten als Übergangszeit', 'gelten. Danach sind die fol-\ngenden drei Monate gelten als Übergangszeit zu beachten'));
check('doppel-escaptes Unicode (\\u00fc)', matches('Dieser Vertrag tritt f\\u00fcr die Parteien am 1. Januar 2004 in Kraft', 'Kapitel: Dieser Vertrag tritt für die Parteien am 1. Januar 2004 in Kraft.'));
check('Satzend-Punkt-Strip', matches('Die Frist beträgt drei Monate.', 'Es gilt: Die Frist beträgt drei Monate 2. Absatz folgt'));
check('ä/ae-Äquivalenz beidseitig', matches('Kuendigungsfrist betraegt sechs Monate', 'Die Kündigungsfrist beträgt sechs Monate zum Jahresende'));

console.log(`\n${fail === 0 ? '🎉' : '💥'} ${pass} bestanden, ${fail} fehlgeschlagen`);
process.exit(fail === 0 ? 0 : 1);
