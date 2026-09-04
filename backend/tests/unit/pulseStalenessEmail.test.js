/**
 * pulseStalenessEmail.test.js — 04.09.2026 (Pulse-Masterplan Phase 4)
 *
 * Sichert drei Fixes an der Prüf-Erinnerung ab:
 *  1. Sortierung: ÄLTESTER Vertrag zuerst (vorher andersherum — bei >5 Verträgen
 *     fiel ausgerechnet der am längsten ungeprüfte aus der Mail).
 *  2. Betreff nennt dieselbe Gesamtzahl wie der Fließtext (Mail vom 31.08.:
 *     Betreff „2", Text „3" — zwei Zahlen in derselben Mail).
 *  3. Ein fehlgeschlagener letzter Versuch wird ehrlich benannt statt
 *     „Ein Klick genügt" für eine Prüfung, die nicht funktionieren kann.
 */

const { buildStalenessEmail, sortStaleContracts } = require("../../jobs/pulseV2StalenessReminder");

function vertrag(overrides = {}) {
  return {
    contractId: "c1",
    name: "Testvertrag.pdf",
    contractType: null,
    lastScore: 60,
    daysStale: 30,
    criticalCount: 0,
    highCount: 0,
    riskLevel: "low",
    lastAttemptFailed: false,
    ...overrides,
  };
}

describe("sortStaleContracts", () => {
  test("gleiches Risiko + gleicher Score: ältester zuerst", () => {
    const liste = [
      vertrag({ contractId: "jung", daysStale: 20 }),
      vertrag({ contractId: "alt", daysStale: 145 }),
      vertrag({ contractId: "mittel", daysStale: 90 }),
    ];
    sortStaleContracts(liste);
    expect(liste.map(c => c.contractId)).toEqual(["alt", "mittel", "jung"]);
  });

  test("Risiko schlägt Alter (kritisch vor alt)", () => {
    const liste = [
      vertrag({ contractId: "alt-harmlos", daysStale: 200, riskLevel: "low" }),
      vertrag({ contractId: "jung-kritisch", daysStale: 15, riskLevel: "critical" }),
    ];
    sortStaleContracts(liste);
    expect(liste[0].contractId).toBe("jung-kritisch");
  });
});

describe("buildStalenessEmail — Betreff", () => {
  test("Betreff zählt ALLE Verträge, Risiko als Zusatz (31.08.-Fall: 3 gesamt, 2 Risiko)", () => {
    const { subject, html } = buildStalenessEmail("kunde@test.de", "Noah", [
      vertrag({ riskLevel: "high", daysStale: 106 }),
      vertrag({ riskLevel: "high", daysStale: 134 }),
      vertrag({ riskLevel: "low", daysStale: 145 }),
    ]);
    expect(subject).toBe("3 Verträge seit über 14 Tagen nicht geprüft — 2 mit Risiko");
    expect(html).toContain("3 deiner Verträge");
  });

  test("alle mit Risiko: keine doppelte Zahl im Betreff", () => {
    const { subject } = buildStalenessEmail("kunde@test.de", "Noah", [
      vertrag({ riskLevel: "critical" }),
    ]);
    expect(subject).toBe("1 Vertrag mit Risiko seit über 14 Tagen nicht geprüft");
  });

  test("ohne Risiko: schlichter Betreff", () => {
    const { subject } = buildStalenessEmail("kunde@test.de", null, [vertrag(), vertrag({ contractId: "c2" })]);
    expect(subject).toBe("2 Verträge seit über 14 Tagen nicht geprüft");
  });
});

describe("buildStalenessEmail — Fehlschlag-Ehrlichkeit", () => {
  test("fehlgeschlagener letzter Versuch wird am Vertrag UND als Hinweis benannt", () => {
    const { html } = buildStalenessEmail("kunde@test.de", "Noah", [
      vertrag({ lastAttemptFailed: true, daysStale: 106 }),
      vertrag({ contractId: "c2", daysStale: 30 }),
    ]);
    expect(html).toContain("letzter automatischer Versuch fehlgeschlagen");
    expect(html).toContain("Bei 1 von 2 Verträgen ist die letzte automatische Prüfung fehlgeschlagen");
  });

  test("ohne Fehlschlag: kein Fehlschlag-Hinweis, ehrlicher Knopf-Text", () => {
    const { html } = buildStalenessEmail("kunde@test.de", "Noah", [vertrag()]);
    expect(html).not.toContain("fehlgeschlagen");
    expect(html).not.toContain("Ein Klick genügt");
    expect(html).toContain("Öffne Legal Pulse und starte dort die erneute Prüfung");
    // Meta-Zeile heißt jetzt ehrlich "zuletzt ERFOLGREICH geprüft"
    expect(html).toContain("zuletzt erfolgreich geprüft vor 30 Tagen");
  });
});
