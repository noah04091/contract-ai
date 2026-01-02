// 🧪 smartVariables.test.ts - Tests für Smart Variables Utility

import {
  SYSTEM_VARIABLES,
  SYSTEM_VARIABLES_MAP,
  isComputedVariable,
  evaluateExpression,
  resolveSmartVariable,
  formatCurrency,
  calculateMwSt
} from "../smartVariables";

describe("smartVariables", () => {
  describe("SYSTEM_VARIABLES", () => {
    test("enthält erwartete System-Variablen", () => {
      const names = SYSTEM_VARIABLES.map(v => v.name);

      expect(names).toContain("heute");
      expect(names).toContain("morgen");
      expect(names).toContain("jahr");
      expect(names).toContain("monat");
      expect(names).toContain("uhrzeit");
    });

    test("alle Variablen haben gültige getValue-Funktion", () => {
      for (const variable of SYSTEM_VARIABLES) {
        expect(typeof variable.getValue).toBe("function");
        const value = variable.getValue();
        expect(typeof value).toBe("string");
        expect(value.length).toBeGreaterThan(0);
      }
    });

    test("'heute' gibt Datum im Format DD.MM.YYYY zurück", () => {
      const heute = SYSTEM_VARIABLES_MAP.get("heute");
      expect(heute).toBeDefined();

      const value = heute!.getValue();
      // Format: DD.MM.YYYY
      expect(value).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });

    test("'jahr' gibt aktuelles Jahr zurück", () => {
      const jahr = SYSTEM_VARIABLES_MAP.get("jahr");
      expect(jahr).toBeDefined();

      const value = jahr!.getValue();
      expect(value).toBe(new Date().getFullYear().toString());
    });

    test("'monat' gibt deutschen Monatsnamen zurück", () => {
      const monat = SYSTEM_VARIABLES_MAP.get("monat");
      expect(monat).toBeDefined();

      const value = monat!.getValue();
      const germanMonths = [
        "Januar", "Februar", "März", "April", "Mai", "Juni",
        "Juli", "August", "September", "Oktober", "November", "Dezember"
      ];
      expect(germanMonths).toContain(value);
    });

    test("alle Variablen haben gültige Gruppe", () => {
      const validGroups = ["Datum", "Zeit", "System"];
      for (const variable of SYSTEM_VARIABLES) {
        expect(validGroups).toContain(variable.group);
      }
    });
  });

  describe("isComputedVariable()", () => {
    test("erkennt Addition", () => {
      expect(isComputedVariable("a + b")).toBe(true);
    });

    test("erkennt Subtraktion", () => {
      expect(isComputedVariable("a - b")).toBe(true);
    });

    test("erkennt Multiplikation", () => {
      expect(isComputedVariable("preis * 1.19")).toBe(true);
    });

    test("erkennt Division", () => {
      expect(isComputedVariable("summe / 2")).toBe(true);
    });

    test("erkennt Klammern", () => {
      expect(isComputedVariable("(a + b) * c")).toBe(true);
    });

    test("gibt false für einfache Variablennamen zurück", () => {
      expect(isComputedVariable("preis")).toBe(false);
      expect(isComputedVariable("firmenname")).toBe(false);
      expect(isComputedVariable("heute")).toBe(false);
    });
  });

  describe("evaluateExpression()", () => {
    test("berechnet einfache Addition", () => {
      const variables = new Map<string, string | number>([
        ["a", 10],
        ["b", 5]
      ]);

      const result = evaluateExpression("a + b", variables);
      expect(result).toBe("15,00");
    });

    test("berechnet Multiplikation (MwSt-Berechnung)", () => {
      const variables = new Map<string, string | number>([
        ["netto", 100]
      ]);

      const result = evaluateExpression("netto * 1.19", variables);
      expect(result).toBe("119,00");
    });

    test("berechnet komplexe Ausdrücke mit Klammern", () => {
      const variables = new Map<string, string | number>([
        ["a", 10],
        ["b", 5],
        ["c", 2]
      ]);

      const result = evaluateExpression("(a + b) * c", variables);
      expect(result).toBe("30,00");
    });

    test("verarbeitet String-Werte mit Währungszeichen", () => {
      const variables = new Map<string, string | number>([
        ["preis", "100,00 €"]
      ]);

      const result = evaluateExpression("preis * 1.19", variables);
      expect(result).toBe("119,00");
    });

    test("gibt null zurück bei fehlender Variable", () => {
      const variables = new Map<string, string | number>([
        ["a", 10]
      ]);

      const result = evaluateExpression("a + unbekannt", variables);
      expect(result).toBeNull();
    });

    test("gibt null zurück bei ungültigem Wert", () => {
      const variables = new Map<string, string | number>([
        ["text", "nicht-numerisch"]
      ]);

      const result = evaluateExpression("text * 2", variables);
      expect(result).toBeNull();
    });
  });

  describe("resolveSmartVariable()", () => {
    const userVariables = new Map<string, string | number>([
      ["firmenname", "Test GmbH"],
      ["preis", 100]
    ]);

    test("löst System-Variable auf", () => {
      const result = resolveSmartVariable("heute", userVariables);

      expect(result.type).toBe("system");
      expect(result.value).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    });

    test("löst berechnete Variable auf", () => {
      const result = resolveSmartVariable("preis * 1.19", userVariables);

      expect(result.type).toBe("computed");
      expect(result.value).toBe("119,00");
    });

    test("löst User-Variable auf", () => {
      const result = resolveSmartVariable("firmenname", userVariables);

      expect(result.type).toBe("user");
      expect(result.value).toBe("Test GmbH");
    });

    test("gibt null für unbekannte Variable zurück", () => {
      const result = resolveSmartVariable("unbekannt", userVariables);

      expect(result.type).toBe("user");
      expect(result.value).toBeNull();
    });
  });

  describe("formatCurrency()", () => {
    test("formatiert Zahl als Euro", () => {
      expect(formatCurrency(100)).toBe("100,00 €");
    });

    test("formatiert mit Dezimalstellen", () => {
      expect(formatCurrency(99.99)).toBe("99,99 €");
    });

    test("rundet auf 2 Dezimalstellen", () => {
      expect(formatCurrency(99.999)).toBe("100,00 €");
    });

    test("verwendet angegebenes Währungssymbol", () => {
      expect(formatCurrency(100, "$")).toBe("100,00 $");
    });

    test("verarbeitet String-Eingabe", () => {
      expect(formatCurrency("100")).toBe("100,00 €");
    });

    test("verarbeitet String mit Komma als Dezimaltrenner", () => {
      expect(formatCurrency("99,99")).toBe("99,99 €");
    });

    test("gibt Original zurück bei ungültiger Eingabe", () => {
      expect(formatCurrency("ungültig")).toBe("ungültig");
    });
  });

  describe("calculateMwSt()", () => {
    test("berechnet 19% MwSt korrekt", () => {
      const result = calculateMwSt(100);

      expect(result.mwst).toBe(19);
      expect(result.brutto).toBe(119);
    });

    test("berechnet 7% MwSt korrekt", () => {
      const result = calculateMwSt(100, 7);

      expect(result.mwst).toBeCloseTo(7, 2);
      expect(result.brutto).toBeCloseTo(107, 2);
    });

    test("berechnet mit Dezimalwerten", () => {
      const result = calculateMwSt(99.50, 19);

      expect(result.mwst).toBeCloseTo(18.905, 2);
      expect(result.brutto).toBeCloseTo(118.405, 2);
    });
  });
});
