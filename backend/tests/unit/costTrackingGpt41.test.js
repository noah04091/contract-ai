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
