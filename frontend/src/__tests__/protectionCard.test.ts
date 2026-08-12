// 🛡️ Beweis-Tests für die Schutz-Status-Karte (Retention Stufe 1c, 11.08.2026).
// Testet die pure Entscheidungslogik — die Leitplanken aus dem 3-Agent-Audit vom 10.08.

import {
  isProtectableDocType,
  isLetterDocType,
  shouldShowProtectionCard,
  resolveProtectionVariant,
  remainingAnalyses,
  effectiveAnalysisNumbers,
} from "../components/contractAnalysisV2/protectionCardLogic";

describe("isProtectableDocType — Karte nur bei Vertragsartigen (Audit-Leitplanke)", () => {
  test("CONTRACT und AGB: Karte erlaubt", () => {
    expect(isProtectableDocType("CONTRACT")).toBe(true);
    expect(isProtectableDocType("contract")).toBe(true);
    expect(isProtectableDocType("CONTRACT", "agb")).toBe(true); // AGB via contractType
  });

  test("Rechnung/Lohnzettel/Tabelle/Finanz: KEINE Karte — nichts zu überwachen", () => {
    expect(isProtectableDocType("INVOICE")).toBe(false);
    expect(isProtectableDocType("RECEIPT")).toBe(false);
    expect(isProtectableDocType("TABLE_DOCUMENT")).toBe(false);
    expect(isProtectableDocType("FINANCIAL_DOCUMENT")).toBe(false);
  });

  test("fehlender documentType fällt auf CONTRACT zurück (bewusst: Quick-Analyse-Altbestand)", () => {
    // Die beiden Quick-Analyse-Builder reichen documentType seit Stufe 1c durch —
    // für Altbestand ohne Feld gilt der classifyDocType-Fallback CONTRACT.
    expect(isProtectableDocType(undefined)).toBe(true);
    expect(isProtectableDocType(null)).toBe(true);
  });
});

describe("isLetterDocType + shouldShowProtectionCard — Schreiben-Variante (Feinschliff 12.08.)", () => {
  test("LETTER wird als Schreiben erkannt, Vertragsartiges nicht", () => {
    expect(isLetterDocType("LETTER")).toBe(true);
    expect(isLetterDocType("CONTRACT")).toBe(false);
    expect(isLetterDocType("INVOICE")).toBe(false);
  });

  test("CONTRACT/AGB: Karte immer — Wortlaut regelt die Termine-Lage, nicht die Sichtbarkeit", () => {
    expect(shouldShowProtectionCard(true, false, true)).toBe(true);
    expect(shouldShowProtectionCard(true, false, false)).toBe(true);
    expect(shouldShowProtectionCard(true, false, null)).toBe(true); // Termine noch nicht geladen
  });

  test("LETTER: Karte NUR bei nachweislich anstehender Frist (Klagefrist-Fall)", () => {
    expect(shouldShowProtectionCard(false, true, true)).toBe(true);
    // Noahs Kündigungsschreiben-Test 11.08.: beide Fristen vergangen → keine Karte (wie bisher)
    expect(shouldShowProtectionCard(false, true, false)).toBe(false);
    // Termine noch nicht geladen → keine Karte (kein Aufblitzen vor Datenlage)
    expect(shouldShowProtectionCard(false, true, null)).toBe(false);
  });

  test("Rechnung & Co.: nie eine Karte, egal was die Termine sagen", () => {
    expect(shouldShowProtectionCard(false, false, true)).toBe(false);
    expect(shouldShowProtectionCard(false, false, false)).toBe(false);
    expect(shouldShowProtectionCard(false, false, null)).toBe(false);
  });
});

describe("resolveProtectionVariant — drei Plan-Varianten (Audit-Leitplanke)", () => {
  test("zahlende Kunden: Portfolio-Variante ohne Upsell", () => {
    expect(resolveProtectionVariant(true, 22)).toBe("paid");
    expect(resolveProtectionVariant(true, 0)).toBe("paid"); // Limit irrelevant für paid-Variante
  });

  test("Free mit Rest: Upload-Variante", () => {
    expect(resolveProtectionVariant(false, 2)).toBe("free");
    expect(resolveProtectionVariant(false, Number.POSITIVE_INFINITY)).toBe("free");
  });

  test("Free am Limit: Upgrade-Variante statt totem Upload-Knopf", () => {
    expect(resolveProtectionVariant(false, 0)).toBe("freeLimit");
  });
});

describe("remainingAnalyses — Infinity-sicher, nie negativ", () => {
  test("normale Fälle", () => {
    expect(remainingAnalyses(1, 3)).toBe(2);
    expect(remainingAnalyses(3, 3)).toBe(0);
    expect(remainingAnalyses(0, 3)).toBe(3);
    expect(remainingAnalyses(undefined, 3)).toBe(3);
  });

  test("Überzahlung (Altdaten count > limit) wird nicht negativ", () => {
    expect(remainingAnalyses(5, 3)).toBe(0);
  });

  test("Enterprise: Infinity-Limit bleibt Infinity (Chip wird dann gar nicht gerendert)", () => {
    expect(remainingAnalyses(100, Number.POSITIVE_INFINITY)).toBe(Number.POSITIVE_INFINITY);
  });

  test("fehlendes Limit: 0 übrig (defensiv — kein Upload-Versprechen ohne Datenbasis)", () => {
    expect(remainingAnalyses(1, undefined)).toBe(0);
  });
});

describe("effectiveAnalysisNumbers — frische usage-Zahl schlägt veralteten AuthContext (Live-Test-Fund 11.08.)", () => {
  test("Reproduktion des Bugs: AuthContext sagt 0 verbraucht, Analyse-Antwort sagt 1 → usage gewinnt", () => {
    // Vorher zeigte die Karte "3 von 3 übrig" nach der 1. Analyse (Footer korrekt "1 von 3")
    const nums = effectiveAnalysisNumbers({ count: 1, limit: 3 }, 0, 3);
    expect(nums).toEqual({ count: 1, limit: 3 });
  });

  test("ohne usage (Quick-Analyse-Pfad ohne Verbrauch): AuthContext-Werte", () => {
    expect(effectiveAnalysisNumbers(undefined, 2, 3)).toEqual({ count: 2, limit: 3 });
    expect(effectiveAnalysisNumbers(null, 2, 3)).toEqual({ count: 2, limit: 3 });
  });

  test("teilweise usage: fehlende Felder fallen einzeln auf den User zurück", () => {
    expect(effectiveAnalysisNumbers({ count: 1 }, 0, 3)).toEqual({ count: 1, limit: 3 });
  });
});
