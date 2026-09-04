// 📁 backend/tests/unit/costTrackingGpt41.test.js
// 04.09.2026 (Kosten-Akte 8b): Wächter gegen die 65x-Falle. date-hunt läuft seit
// 01.09. auf gpt-4.1-mini; ohne eigenen Preiseintrag matchte die Präfix-Suche
// 'gpt-4' ($30/$60 je 1M) und das Dashboard zeigte ~$580 statt ~$9 im Monat.

process.env.NODE_ENV = 'test';

const { CostTrackingService } = require('../../services/costTracking');

function mkService() {
  const svc = new CostTrackingService();
  const inserts = [];
  svc.db = { collection: () => ({ insertOne: async (doc) => { inserts.push(doc); return { insertedId: 'x' }; }, createIndex: async () => {} }) };
  svc.isInitialized = true;
  return { svc, inserts };
}

describe('costTracking — gpt-4.1-Familie (Kosten-Akte 8b)', () => {
  test('Preistabelle kennt die 4.1-Familie mit den korrekten Werten', () => {
    const { svc } = mkService();
    expect(svc.pricing['gpt-4.1-mini']).toEqual({ input: 0.0004 / 1000, output: 0.0016 / 1000 });
    expect(svc.pricing['gpt-4.1']).toEqual({ input: 0.002 / 1000, output: 0.008 / 1000 });
    expect(svc.pricing['gpt-4.1-nano']).toEqual({ input: 0.0001 / 1000, output: 0.0004 / 1000 });
  });

  test('typischer date-hunt-Call wird als ~$0.0012 verbucht, NICHT als ~$0.08 (65x-Falle)', async () => {
    const { svc, inserts } = mkService();
    await svc.trackAPICall({ userId: 'u1', model: 'gpt-4.1-mini', inputTokens: 2554, outputTokens: 130, feature: 'date-hunt' });
    expect(inserts.length).toBe(1);
    const kosten = inserts[0].totalCost;
    expect(kosten).toBeGreaterThan(0.0009);
    expect(kosten).toBeLessThan(0.002);   // mit gpt-4-Preis wären es ~$0.084
  });

  test('Snapshot-Namen ("gpt-4.1-mini-2026-04-14") treffen den mini-Preis, nicht gpt-4', async () => {
    const { svc, inserts } = mkService();
    await svc.trackAPICall({ userId: 'u1', model: 'gpt-4.1-mini-2026-04-14', inputTokens: 1000000, outputTokens: 0, feature: 'date-hunt' });
    expect(inserts[0].totalCost).toBeCloseTo(0.40, 4); // $0.40 je 1M Input
  });

  test('gpt-4 selbst bleibt beim Urtarif (keine Regressionsverbilligung)', async () => {
    const { svc, inserts } = mkService();
    await svc.trackAPICall({ userId: 'u1', model: 'gpt-4', inputTokens: 1000, outputTokens: 0, feature: 'x' });
    expect(inserts[0].totalCost).toBeCloseTo(0.03, 5);
  });
});

// ── 04.09.2026 (Noahs Auflage): Resolver-Fehlerklasse — kein stiller Fallback ──
describe('costTracking — robuster Preis-Resolver (kein gpt-4-Fallback)', () => {
  test('exakte Matches für die gesamte genutzte Modellpalette', () => {
    const { svc } = mkService();
    for (const m of ['gpt-4.1-mini', 'gpt-4', 'gpt-4-turbo', 'gpt-5.4', 'gpt-5.4-mini']) {
      const r = svc.resolveModelPricing(m);
      expect(r).not.toBeNull();
      expect(r.key).toBe(m);
    }
  });

  test('Snapshot-Name löst auf den LÄNGSTEN Präfix auf', () => {
    const { svc } = mkService();
    expect(svc.resolveModelPricing('gpt-4.1-mini-2025-04-14').key).toBe('gpt-4.1-mini');
    expect(svc.resolveModelPricing('gpt-5.4-2026-03-05').key).toBe('gpt-5.4');
  });

  test('Reihenfolge der Preis-Map verändert das Ergebnis NICHT', () => {
    const { svc } = mkService();
    const reversed = {};
    for (const k of Object.keys(svc.pricing).reverse()) reversed[k] = svc.pricing[k];
    const svc2 = { pricing: reversed, resolveModelPricing: svc.resolveModelPricing };
    for (const m of ['gpt-4.1-mini', 'gpt-4.1-mini-2025-04-14', 'gpt-4-turbo-2024-04-09', 'gpt-5.4-mini']) {
      expect(svc2.resolveModelPricing(m).key).toBe(svc.resolveModelPricing(m).key);
    }
  });

  test('unbekanntes Modell: KEIN gpt-4-Fallback — Kosten 0 + pricingStatus=unknown', async () => {
    const { svc, inserts } = mkService();
    await svc.trackAPICall({ userId: 'u1', model: 'claude-sonnet-5', inputTokens: 1000000, outputTokens: 100000, feature: 'x' });
    expect(inserts.length).toBe(1);
    expect(inserts[0].totalCost).toBe(0);           // nie $30/1M erfinden
    expect(inserts[0].pricingStatus).toBe('unknown');
    expect(inserts[0].pricingModelKey).toBeNull();
    expect(inserts[0].inputTokens).toBe(1000000);    // Rohdaten bleiben für Nachbewertung
  });

  test('bekanntes Modell trägt pricingStatus=ok + aufgelösten Key', async () => {
    const { svc, inserts } = mkService();
    await svc.trackAPICall({ userId: 'u1', model: 'gpt-4.1-mini-2025-04-14', inputTokens: 100, outputTokens: 10, feature: 'x' });
    expect(inserts[0].pricingStatus).toBe('ok');
    expect(inserts[0].pricingModelKey).toBe('gpt-4.1-mini');
  });
});

// ── COST_REPORT_VALIDITY_V1 (04.09.2026): unknown darf nie als "kostenlos" untergehen ──
describe('costTracking — COST_REPORT_VALIDITY_V1', () => {
  test('pricingValidityGroupFields liefert die 4 Pflichtfelder als $cond-Summen', () => {
    const f = CostTrackingService.pricingValidityGroupFields();
    for (const k of ['knownPricingRecords', 'unknownPricingRecords', 'unknownPricingInputTokens', 'unknownPricingOutputTokens']) {
      expect(f[k]).toBeDefined();
      expect(f[k].$sum).toBeDefined();
    }
  });

  test('withPricingCoverage: nur unknown ⇒ incomplete_unknown + Hinweis', () => {
    const v = CostTrackingService.withPricingCoverage({ unknownPricingRecords: 3, legacyUnverifiedPricingRecords: 0 });
    expect(v.pricingCoverage).toBe('incomplete_unknown');
    expect(v.pricingCoverageHint).toMatch(/3 API-Datensätze/);
  });

  test('withPricingCoverage: nur Legacy ⇒ legacy_unverified (fehlender Status ist NICHT known)', () => {
    const v = CostTrackingService.withPricingCoverage({ unknownPricingRecords: 0, legacyUnverifiedPricingRecords: 7 });
    expect(v.pricingCoverage).toBe('legacy_unverified');
    expect(v.pricingCoverageHint).toMatch(/7 Alt-Datensätze/);
  });

  test('withPricingCoverage: beides ⇒ incomplete_mixed', () => {
    const v = CostTrackingService.withPricingCoverage({ unknownPricingRecords: 1, legacyUnverifiedPricingRecords: 2 });
    expect(v.pricingCoverage).toBe('incomplete_mixed');
  });

  test('withPricingCoverage: complete NUR wenn unknown=0 UND legacy=0', () => {
    const v = CostTrackingService.withPricingCoverage({ unknownPricingRecords: 0, legacyUnverifiedPricingRecords: 0 });
    expect(v.pricingCoverage).toBe('complete');
    expect(v.pricingCoverageHint).toBeUndefined();
  });

  test('pricingValidityGroupFields liefert auch die Legacy-Felder', () => {
    const f = CostTrackingService.pricingValidityGroupFields();
    for (const k of ['legacyUnverifiedPricingRecords', 'legacyUnverifiedInputTokens', 'legacyUnverifiedOutputTokens']) {
      expect(f[k]).toBeDefined();
    }
  });

  test('checkDailyBudget reicht Validity-Felder + Coverage durch (Aggregat gemockt)', async () => {
    const svc = new CostTrackingService();
    svc.isInitialized = true;
    svc.db = { collection: () => ({
      aggregate: () => ({ toArray: async () => [{ totalCost: 1.23, totalCalls: 10, knownPricingRecords: 8, unknownPricingRecords: 2, legacyUnverifiedPricingRecords: 0, unknownPricingInputTokens: 5000, unknownPricingOutputTokens: 700 }] })
    }) };
    const b = await svc.checkDailyBudget();
    expect(b.unknownPricingRecords).toBe(2);
    expect(b.knownPricingRecords).toBe(8);
    expect(b.unknownPricingInputTokens).toBe(5000);
    expect(b.pricingCoverage).toBe('incomplete_unknown');
    expect(b.pricingCoverageHint).toBeDefined();
    expect(b.spent).toBe(1.23); // Summe bleibt, wird aber als unvollständig markiert
  });
});
