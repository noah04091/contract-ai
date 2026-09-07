/**
 * pulseAbdeckungCap.test.js — 07.09.2026 (Abdeckungs-Plan Stufe 1)
 *
 * Sichert die neue, fest eingebaute Text-Obergrenze der Legal-Pulse-Analyse ab.
 * Vorher: harte 50.000-Kappung → lange Verträge nur ~17 Seiten analysiert UND überwacht.
 * Jetzt: Default 200.000 (deckt alle realen Verträge, längster im System 61k), env-Override
 * möglich, Notbremse bleibt. Diese Tests verhindern ein stilles Zurückfallen auf 50k.
 */

const path = require("path");
const MODUL = "../../services/legalPulseV2/stages/00-documentIntelligence";

// runDocumentIntelligence nutzt nur lokale Funktionen (cleanText, detectStructure,
// classifyContractType, ...) — KEINE KI, KEINE DB. Rein testbar.
function ladeFrisch() {
  jest.resetModules();
  return require(MODUL);
}

// Realistischer Klauseltext, beliebig oft wiederholbar (~1.100 Zeichen je Block)
const block = (n) =>
  `\n§ ${n} Regelung ${n}\nDie Vertragsparteien vereinbaren im Rahmen dieses Vertrages die folgende ` +
  `Regelung. Der Auftragnehmer verpflichtet sich zur ordnungsgemäßen Leistung. ` +
  `Die Haftung ist auf Vorsatz und grobe Fahrlässigkeit beschränkt. Kündigungsfristen ` +
  `betragen drei Monate zum Quartalsende. Änderungen bedürfen der Schriftform. `.repeat(3);

function textMitLaenge(minChars) {
  let t = "VERTRAG\n";
  let i = 1;
  while (t.length < minChars) t += block(i++);
  return t;
}

describe("Legal-Pulse Text-Obergrenze (Stufe 1)", () => {
  const ORIG = process.env.PULSE_MAX_CHARS;
  afterEach(() => {
    if (ORIG === undefined) delete process.env.PULSE_MAX_CHARS;
    else process.env.PULSE_MAX_CHARS = ORIG;
  });

  test("60k-Vertrag wird NICHT mehr gekappt (Default 200k deckt reale Verträge)", () => {
    delete process.env.PULSE_MAX_CHARS;
    const { runDocumentIntelligence } = ladeFrisch();
    const text = textMitLaenge(60000);
    const res = runDocumentIntelligence(text);
    expect(res.document.truncated).toBe(false);
    // voller Text bleibt erhalten (bis auf cleanText-Normalisierung)
    expect(res.document.cleanedTextLength).toBeGreaterThan(55000);
  });

  test("Default-Obergrenze ist 200k, nicht mehr 50k — Regressionswächter", () => {
    delete process.env.PULSE_MAX_CHARS;
    const { runDocumentIntelligence } = ladeFrisch();
    // Ein Text knapp über der ALTEN Grenze (55k) darf nicht mehr gekappt werden.
    const res = runDocumentIntelligence(textMitLaenge(55000));
    expect(res.document.truncated).toBe(false);
  });

  test("Notbremse greift bei einem Extrem-Vertrag über 200k", () => {
    delete process.env.PULSE_MAX_CHARS;
    const { runDocumentIntelligence } = ladeFrisch();
    const res = runDocumentIntelligence(textMitLaenge(260000));
    expect(res.document.truncated).toBe(true);
    expect(res.document.cleanedTextLength).toBeLessThanOrEqual(200000);
    expect(res.document.originalTextLength).toBeGreaterThan(200000);
  });

  test("env-Override kann die Grenze weiterhin ändern (z.B. Rollback auf 50k)", () => {
    process.env.PULSE_MAX_CHARS = "50000";
    const { runDocumentIntelligence } = ladeFrisch();
    const res = runDocumentIntelligence(textMitLaenge(60000));
    expect(res.document.truncated).toBe(true);
    expect(res.document.cleanedTextLength).toBeLessThanOrEqual(50000);
  });
});
