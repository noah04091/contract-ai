/**
 * radarTitelDeckel.test.js — 07.09.2026 (Abdeckungs-Plan Stufe 3)
 *
 * Sichert den Titel-Netz-Deckel des täglichen Legal-Pulse-Radars ab.
 * Vorher: der Gesetzesabgleich (assessImpact, Stufe 1) sah pro Vertrag nur die ersten 15
 * Klausel-Titel → bei ~45 % der Verträge waren hintere Klauseln unsichtbar. A/B 07.09.:
 * Anheben auf 50 steigert Konfidenz + Klausel-Präzision ohne Regression. Diese Tests
 * verhindern ein stilles Zurückfallen auf 15 und dokumentieren die bewussten Nicht-Änderungen.
 */

const { resolveRadarCaps } = require("../../jobs/pulseV2Radar");

describe("Legal-Pulse Radar Titel-Deckel (Stufe 3)", () => {
  test("Titel-Default ist 50, nicht mehr 15 — Regressionswächter", () => {
    const caps = resolveRadarCaps({}); // leere env = eingebauter Default
    expect(caps.maxClauseTitles).toBe(50);
  });

  test("env-Override kann den Titel-Deckel weiterhin ändern (z.B. Rollback auf 15)", () => {
    expect(resolveRadarCaps({ PULSE_RADAR_MAX_CLAUSE_TITLES: "15" }).maxClauseTitles).toBe(15);
    expect(resolveRadarCaps({ PULSE_RADAR_MAX_CLAUSE_TITLES: "80" }).maxClauseTitles).toBe(80);
  });

  test("Befunde-Deckel bleibt bewusst bei 10 (im A/B nicht sauber belegt)", () => {
    expect(resolveRadarCaps({}).maxFindings).toBe(10);
  });

  test("Verträge-pro-Aufruf bleibt bewusst bei 10 (erst bei Kundenwachstum bindend)", () => {
    expect(resolveRadarCaps({}).maxContracts).toBe(10);
  });

  test("ungültige/leere env-Werte fallen sauber auf die Defaults zurück", () => {
    const caps = resolveRadarCaps({ PULSE_RADAR_MAX_CLAUSE_TITLES: "", PULSE_RADAR_MAX_FINDINGS: "abc" });
    expect(caps.maxClauseTitles).toBe(50);
    expect(caps.maxFindings).toBe(10);
  });
});
