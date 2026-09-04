// 📁 backend/services/costPricingWatchdog.js
// COST_REPORT_VALIDITY_V1 — automatischer Watchdog (04.09.2026, Noahs Auflage)
// Läuft über den bestehenden Server-Cron (eigener kleiner Watchdog, bewusst
// NICHT in calendarWatchdog vermischt). READ-ONLY auf cost_tracking; meldet
// über errorMonitoring.captureError, damit die bestehende Alarm-Strecke
// (error_logs + Mail) Noah automatisch erreicht. Kein Ersatzpreis, keine Writes.
//
// Invariante A: pricingStatus='unknown' ⇒ COST_PRICING_UNKNOWN:<model>
//               (neues Modell ohne hinterlegten Preis — Kostensummen unvollständig)
// Invariante B: Record NACH PRICING_STATUS_CUTOVER ohne pricingStatus
//               ⇒ COST_PRICING_STATUS_MISSING (Tracker-Invarianzverletzung:
//               neue Records dürfen nicht mehr still ohne Status entstehen)
// Spam-Schutz: gemeldet wird nur, wenn im Lookback-Fenster (Cron-Intervall
// + Puffer) NEUE betroffene Records entstanden sind — ein historischer
// Altbefund ohne Neuzugang erzeugt nur eine Logzeile, keinen neuen Alarm.
// Zusätzlich greift das errorMonitoring-Dedup über den stabilen Fingerprint.

const { captureError } = require('./errorMonitoring');
const { PRICING_STATUS_CUTOVER } = require('./costTracking');
const database = require('../config/database');

const LOOKBACK_MS = 26 * 60 * 60 * 1000; // täglicher Cron + 2h Puffer

async function runCostPricingWatchdog({ db = null, now = new Date(), log = console.log } = {}) {
  const conn = db || await database.connect();
  const since = new Date(now.getTime() - LOOKBACK_MS);
  const findings = { unknownModels: [], statusMissing: null, alarms: 0 };

  // ── Invariante A: unknown-Pricing je Modell ────────────────────────────────
  const unknownAgg = await conn.collection('cost_tracking').aggregate([
    { $match: { pricingStatus: 'unknown' } },
    { $group: {
        _id: '$model', recordCount: { $sum: 1 },
        inputTokens: { $sum: { $ifNull: ['$inputTokens', 0] } },
        outputTokens: { $sum: { $ifNull: ['$outputTokens', 0] } },
        firstSeen: { $min: '$createdAt' }, lastSeen: { $max: '$createdAt' }
      } }
  ]).toArray();
  for (const m of unknownAgg) {
    const fresh = m.lastSeen >= since;
    findings.unknownModels.push({ model: m._id, recordCount: m.recordCount, fresh });
    if (!fresh) {
      log(`ℹ️ [COST-WATCHDOG] Altbefund ohne Neuzugang (kein neuer Alarm): ${m._id} (${m.recordCount} Records, zuletzt ${m.lastSeen.toISOString()})`);
      continue;
    }
    findings.alarms++;
    const err = new Error(`Modell "${m._id}" hat keinen hinterlegten Preis — ${m.recordCount} cost_tracking-Records ohne belastbare Kosten. Preis in costTracking.js ergänzen; Kostensummen sind bis dahin unvollständig.`);
    err.name = `COST_PRICING_UNKNOWN:${m._id}`;
    await captureError(err, {
      route: 'cost-pricing-watchdog', severity: 'high',
      metadata: {
        model: m._id, recordCount: m.recordCount,
        inputTokens: m.inputTokens, outputTokens: m.outputTokens,
        firstSeen: m.firstSeen, lastSeen: m.lastSeen
      }
    });
  }

  // ── Invariante B: fehlender pricingStatus NACH Cutover ────────────────────
  const missingAgg = await conn.collection('cost_tracking').aggregate([
    { $match: { createdAt: { $gt: PRICING_STATUS_CUTOVER }, pricingStatus: { $nin: ['ok', 'unknown'] } } },
    { $group: {
        _id: null, recordCount: { $sum: 1 },
        models: { $addToSet: '$model' },
        inputTokens: { $sum: { $ifNull: ['$inputTokens', 0] } },
        outputTokens: { $sum: { $ifNull: ['$outputTokens', 0] } },
        firstSeen: { $min: '$createdAt' }, lastSeen: { $max: '$createdAt' }
      } }
  ]).toArray();
  if (missingAgg.length && missingAgg[0].recordCount > 0) {
    const m = missingAgg[0];
    findings.statusMissing = { recordCount: m.recordCount, models: m.models };
    if (m.lastSeen >= since) {
      findings.alarms++;
      const err = new Error(`${m.recordCount} cost_tracking-Records NACH dem Pricing-Status-Cutover (${PRICING_STATUS_CUTOVER.toISOString()}) ohne pricingStatus — Tracker-Invarianzverletzung (Modelle: ${m.models.join(', ')}).`);
      err.name = 'COST_PRICING_STATUS_MISSING';
      await captureError(err, {
        route: 'cost-pricing-watchdog', severity: 'high',
        metadata: {
          recordCount: m.recordCount, models: m.models,
          inputTokens: m.inputTokens, outputTokens: m.outputTokens,
          firstSeen: m.firstSeen, lastSeen: m.lastSeen
        }
      });
    } else {
      log(`ℹ️ [COST-WATCHDOG] STATUS_MISSING-Altbefund ohne Neuzugang: ${m.recordCount} Records`);
    }
  }

  log(`🐶 [COST-WATCHDOG] fertig: ${findings.unknownModels.length} unknown-Modelle, statusMissing=${findings.statusMissing ? findings.statusMissing.recordCount : 0}, Alarme=${findings.alarms}`);
  return findings;
}

module.exports = { runCostPricingWatchdog, LOOKBACK_MS };
