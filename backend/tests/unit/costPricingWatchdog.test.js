// 📁 backend/tests/unit/costPricingWatchdog.test.js
// COST_REPORT_VALIDITY_V1 — Watchdog-Invarianten + Static-Coverage-Wächter
// (04.09.2026, Noahs Auflagen 2 + 5).

process.env.NODE_ENV = 'test';

jest.mock('../../services/errorMonitoring', () => ({
  captureError: jest.fn(async () => ({}))
}));
const { captureError } = require('../../services/errorMonitoring');
const { runCostPricingWatchdog } = require('../../services/costPricingWatchdog');
const { PRICING_STATUS_CUTOVER } = require('../../services/costTracking');

const NOW = new Date('2026-09-10T09:50:00Z');
const FRESH = new Date('2026-09-10T02:00:00Z');   // im 26h-Lookback
const STALE = new Date('2026-09-05T00:00:00Z');   // außerhalb des Lookback

function mkDb({ unknown = [], missing = [] } = {}) {
  return { collection: () => ({
    aggregate: (pipeline) => ({
      toArray: async () => {
        const isMissingQuery = JSON.stringify(pipeline).includes('$nin');
        return isMissingQuery ? missing : unknown;
      }
    })
  }) };
}

describe('costPricingWatchdog — Invarianten A/B + Spam-Schutz', () => {
  beforeEach(() => captureError.mockClear());

  test('A: frisches unknown-Modell ⇒ COST_PRICING_UNKNOWN:<model> mit Pflicht-Payload', async () => {
    const db = mkDb({ unknown: [{ _id: 'claude-sonnet-5', recordCount: 7, inputTokens: 9000, outputTokens: 800, firstSeen: FRESH, lastSeen: FRESH }] });
    const r = await runCostPricingWatchdog({ db, now: NOW, log: () => {} });
    expect(r.alarms).toBe(1);
    expect(captureError).toHaveBeenCalledTimes(1);
    const [err, ctx] = captureError.mock.calls[0];
    expect(err.name).toBe('COST_PRICING_UNKNOWN:claude-sonnet-5');
    expect(ctx.metadata).toMatchObject({ model: 'claude-sonnet-5', recordCount: 7, inputTokens: 9000, outputTokens: 800 });
    expect(ctx.metadata.firstSeen).toBeDefined();
    expect(ctx.metadata.lastSeen).toBeDefined();
  });

  test('Spam-Schutz: Altbefund OHNE Neuzugang ⇒ kein neuer Alarm', async () => {
    const db = mkDb({ unknown: [{ _id: 'alt-modell', recordCount: 3, inputTokens: 1, outputTokens: 1, firstSeen: STALE, lastSeen: STALE }] });
    const r = await runCostPricingWatchdog({ db, now: NOW, log: () => {} });
    expect(r.alarms).toBe(0);
    expect(captureError).not.toHaveBeenCalled();
    expect(r.unknownModels[0]).toMatchObject({ model: 'alt-modell', fresh: false });
  });

  test('B: Record nach Cutover ohne pricingStatus ⇒ COST_PRICING_STATUS_MISSING', async () => {
    const db = mkDb({ missing: [{ _id: null, recordCount: 4, models: ['gpt-4o'], inputTokens: 100, outputTokens: 10, firstSeen: FRESH, lastSeen: FRESH }] });
    const r = await runCostPricingWatchdog({ db, now: NOW, log: () => {} });
    expect(r.alarms).toBe(1);
    const [err] = captureError.mock.calls[0];
    expect(err.name).toBe('COST_PRICING_STATUS_MISSING');
    expect(err.message).toContain(PRICING_STATUS_CUTOVER.toISOString());
  });

  test('sauberer Bestand ⇒ 0 Alarme', async () => {
    const r = await runCostPricingWatchdog({ db: mkDb(), now: NOW, log: () => {} });
    expect(r.alarms).toBe(0);
    expect(captureError).not.toHaveBeenCalled();
  });
});

// ── Static-Coverage-Wächter (Auflage 5): keine 7. $sum(totalCost)-Stelle ────
// ohne Pricing-Validity-Felder. Robuste Pattern-Prüfung, kein AST.
describe('COST_REPORT_VALIDITY_V1 — Static Coverage', () => {
  const fs = require('fs');
  const path = require('path');
  const ROOT = path.join(__dirname, '..', '..');
  const SCAN_DIRS = ['services', 'routes', 'jobs', 'middleware'];
  const SUM_RE = /\$sum:\s*['"]\$totalCost['"]/;
  const CONTEXT_LINES = 20;

  function* jsFiles(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) { if (!['node_modules', 'coverage'].includes(e.name)) yield* jsFiles(p); }
      else if (e.name.endsWith('.js')) yield p;
    }
  }

  test('jede $sum($totalCost)-Aggregation trägt die Pricing-Validity-Felder', () => {
    const violations = [];
    let found = 0;
    for (const dir of SCAN_DIRS) {
      const full = path.join(ROOT, dir);
      if (!fs.existsSync(full)) continue;
      for (const file of jsFiles(full)) {
        const lines = fs.readFileSync(file, 'utf8').split('\n');
        lines.forEach((line, i) => {
          if (!SUM_RE.test(line)) return;
          found++;
          const ctx = lines.slice(Math.max(0, i - CONTEXT_LINES), i + CONTEXT_LINES).join('\n');
          if (!/pricingValidityGroupFields|unknownPricingRecords/.test(ctx)) {
            violations.push(`${path.relative(ROOT, file)}:${i + 1} — $sum($totalCost) OHNE Pricing-Validity-Felder (COST_REPORT_VALIDITY_V1 verletzt)`);
          }
        });
      }
    }
    expect(found).toBeGreaterThanOrEqual(6); // die 6 bekannten Stellen müssen gefunden werden (Selbsttest des Scanners)
    expect(violations).toEqual([]);
  });
});
