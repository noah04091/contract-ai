/**
 * radarVertragsGruppen.test.js — 08.09.2026 (Abdeckungs-Plan Wachstumsfix)
 *
 * Sichert, dass der Gesetzesabgleich ALLE betroffenen Verträge prüft, nicht nur die ersten 10.
 * Vorher: assessImpact schnitt mit slice(0,10) alles jenseits Vertrag 10 ab → bei breiten Gesetzen
 * fielen die ältesten Verträge still aus der Überwachung. Jetzt: Gruppierung à 10, keiner fällt weg.
 * Diese Tests verhindern ein stilles Zurückfallen auf eine Kappung.
 */

const { groupContractsForAssessment } = require("../../jobs/pulseV2Radar");

const mk = (n) => Array.from({ length: n }, (_, i) => ({ contractId: `c${i}` }));

describe("Radar-Vertragsgruppen (Wachstumsfix)", () => {
  test("23 Verträge → 3 Gruppen à 10, KEIN Vertrag geht verloren", () => {
    const groups = groupContractsForAssessment(mk(23), 10);
    expect(groups.length).toBe(3);
    expect(groups.map((g) => g.length)).toEqual([10, 10, 3]);
    // Flach zusammengesetzt = wieder alle 23, in Originalreihenfolge
    const flat = groups.flat().map((c) => c.contractId);
    expect(flat).toEqual(mk(23).map((c) => c.contractId));
  });

  test("genau 10 Verträge → 1 Gruppe (kein Overhead)", () => {
    expect(groupContractsForAssessment(mk(10), 10).length).toBe(1);
  });

  test("11 Verträge (der reale Grenzfall) → 2 Gruppen, Vertrag 11 NICHT mehr abgeschnitten", () => {
    const groups = groupContractsForAssessment(mk(11), 10);
    expect(groups.length).toBe(2);
    expect(groups.flat().length).toBe(11); // vorher wären nur 10 geprüft worden
  });

  test("0 Verträge → 0 Gruppen", () => {
    expect(groupContractsForAssessment([], 10).length).toBe(0);
  });

  test("große Menge bleibt vollständig (200 → 20 Gruppen, 200 Verträge)", () => {
    const groups = groupContractsForAssessment(mk(200), 10);
    expect(groups.length).toBe(20);
    expect(groups.flat().length).toBe(200);
  });
});
