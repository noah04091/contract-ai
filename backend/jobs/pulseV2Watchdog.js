/**
 * Legal Pulse V2 — WATCHDOG ("der Herz-Monitor")
 *
 * REIN BEOBACHTEND. Verändert KEINE Legal-Pulse-Logik, schreibt nichts in laws/
 * radar/alerts. Liest nur bestehende Spuren (cron_logs, laws) und schlägt Alarm,
 * wenn der Gesetzes-Nachschub oder die Crons lautlos ausfallen.
 *
 * Warum es das braucht: pulseV2RssSync/pulseV2Radar geben bei "0 neue Gesetze"
 * brav "Done." zurück und werfen NICHT — d.h. captureError feuert nie. Wenn die
 * ~22 Behörden-RSS-Feeds (einzige Datenquelle) lautlos sterben, läuft alles
 * "grün" weiter, aber kein User wird je wieder gewarnt. Dieser Wächter macht
 * genau diesen stillen Tod sichtbar.
 *
 * Vier Signale (alle aus durablen, bestehenden Daten — kein neues Hot-Path-Tracking):
 *   A) RSS-Sync lief nicht   → kein status=completed pulse-v2-rss-sync in >SYNC_MAX_AGE_H
 *   B) Feeds trocken         → jüngster Sync: result.inserted + result.updated === 0
 *   C) Gesetze veraltet      → neuestes laws.updatedAt älter als LAWS_MAX_AGE_H
 *   D) Radar lief nicht      → kein status=completed pulse-v2-radar in >RADAR_MAX_AGE_H
 *   X) Wächter blind         → eine Prüfung selbst wirft (DB unlesbar) → eigener Alarm
 *
 * Schwellen aus echten Prod-Daten (25.06.2026): pro Tag ~46–159 laws updated (NIE 0),
 * ~250 neue Gesetze/7T, Sync 03:15 UTC + Radar 07:00 UTC täglich. Darum ist "0" bzw.
 * ">30h kein Lauf" zuverlässig anomal → minimales Fehlalarm-Risiko.
 *
 * An gesunden Tagen: KEINE Mail (kein Lärm). Nur im Ernstfall: eine Mail an den Betreiber.
 */

const HOUR = 60 * 60 * 1000;

// Env-überschreibbare Schwellen (Defaults aus echten Prod-Daten hergeleitet)
const SYNC_MAX_AGE_H = Number(process.env.PULSE_WATCHDOG_SYNC_MAX_AGE_H) || 30;
const RADAR_MAX_AGE_H = Number(process.env.PULSE_WATCHDOG_RADAR_MAX_AGE_H) || 30;
const LAWS_MAX_AGE_H = Number(process.env.PULSE_WATCHDOG_LAWS_MAX_AGE_H) || 48;

/**
 * Empfänger — kann NIEMALS null sein (sonst wäre der Wächter selbst ein stiller Tod).
 */
function resolveRecipient() {
  return (
    process.env.LEGAL_PULSE_WATCHDOG_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.ERROR_ALERT_EMAIL ||
    "liebold.noah@web.de"
  );
}

function ageHours(date) {
  if (!date) return Infinity;
  return (Date.now() - new Date(date).getTime()) / HOUR;
}

/**
 * Liest den jüngsten erfolgreichen Lauf eines Cron-Jobs aus cron_logs.
 */
async function latestCompletedRun(db, jobName) {
  return db
    .collection("cron_logs")
    .find({ jobName, status: "completed" })
    .sort({ startedAt: -1 })
    .limit(1)
    .next();
}

/**
 * Kern: bewertet die Gesundheit. REIN LESEND. Wirft nie — fängt jede Prüfung
 * einzeln ab und macht ein Lese-Problem selbst zum Alarm (X).
 * @returns {{ healthy:boolean, alarms:Array, facts:object }}
 */
async function evaluateHealth(db) {
  const alarms = [];
  const facts = {};

  // --- A) Lief der RSS-Sync? + B) Hat er etwas geliefert? ---
  try {
    const sync = await latestCompletedRun(db, "pulse-v2-rss-sync");
    facts.lastSyncAt = sync?.startedAt || null;
    facts.lastSyncResult = sync?.result || null;

    if (!sync) {
      alarms.push({
        code: "A",
        severity: "critical",
        title: "RSS-Sync hat NIE erfolgreich gelaufen (kein Log)",
        detail: "Kein einziger erfolgreicher pulse-v2-rss-sync in cron_logs.",
      });
    } else if (ageHours(sync.startedAt) > SYNC_MAX_AGE_H) {
      alarms.push({
        code: "A",
        severity: "critical",
        title: "RSS-Sync läuft nicht mehr",
        detail: `Letzter erfolgreicher Sync vor ${ageHours(sync.startedAt).toFixed(1)} h (Grenze ${SYNC_MAX_AGE_H} h). Cron/Prozess vermutlich tot.`,
      });
    } else {
      const ins = Number(sync.result?.inserted || 0);
      const upd = Number(sync.result?.updated || 0);
      facts.lastSyncFresh = ins + upd;
      if (ins + upd === 0) {
        alarms.push({
          code: "B",
          severity: "critical",
          title: "RSS-Feeds liefern nichts mehr",
          detail: `Jüngster Sync (${new Date(sync.startedAt).toISOString()}) brachte 0 neue + 0 aktualisierte Gesetze. An gesunden Tagen sind das 46–159. Feeds vermutlich tot.`,
        });
      }
    }
  } catch (err) {
    alarms.push({
      code: "X",
      severity: "high",
      title: "Wächter konnte cron_logs (Sync) nicht lesen",
      detail: err.message,
    });
  }

  // --- C) Sind die Gesetze in der DB frisch? ---
  try {
    const newest = await db
      .collection("laws")
      .find({})
      .sort({ updatedAt: -1 })
      .limit(1)
      .next();
    facts.newestLawAt = newest?.updatedAt || null;
    facts.newestLawTitle = (newest?.title || "").slice(0, 80);
    if (!newest) {
      alarms.push({
        code: "C",
        severity: "critical",
        title: "laws-Collection ist LEER",
        detail: "Keine einzige Gesetzes-/Urteils-Quelle vorhanden — Radar hat nichts zu prüfen.",
      });
    } else if (ageHours(newest.updatedAt) > LAWS_MAX_AGE_H) {
      alarms.push({
        code: "C",
        severity: "critical",
        title: "Gesetze veraltet",
        detail: `Neuestes Gesetz vor ${ageHours(newest.updatedAt).toFixed(1)} h aktualisiert (Grenze ${LAWS_MAX_AGE_H} h). Nachschub ist versiegt.`,
      });
    }
  } catch (err) {
    alarms.push({
      code: "X",
      severity: "high",
      title: "Wächter konnte laws nicht lesen",
      detail: err.message,
    });
  }

  // --- D) Lief der Radar? ---
  try {
    const radar = await latestCompletedRun(db, "pulse-v2-radar");
    facts.lastRadarAt = radar?.startedAt || null;
    facts.lastRadarResult = radar?.result || null;
    if (!radar) {
      alarms.push({
        code: "D",
        severity: "critical",
        title: "Radar hat NIE erfolgreich gelaufen (kein Log)",
        detail: "Kein einziger erfolgreicher pulse-v2-radar in cron_logs.",
      });
    } else if (ageHours(radar.startedAt) > RADAR_MAX_AGE_H) {
      alarms.push({
        code: "D",
        severity: "critical",
        title: "Radar läuft nicht mehr",
        detail: `Letzter erfolgreicher Radar-Lauf vor ${ageHours(radar.startedAt).toFixed(1)} h (Grenze ${RADAR_MAX_AGE_H} h). Es werden keine Alerts mehr erzeugt.`,
      });
    }
  } catch (err) {
    alarms.push({
      code: "X",
      severity: "high",
      title: "Wächter konnte cron_logs (Radar) nicht lesen",
      detail: err.message,
    });
  }

  return { healthy: alarms.length === 0, alarms, facts };
}

/**
 * Baut die Alarm-Mail (nutzt die bestehende Basis-Vorlage → Branding + Responsive-Fix).
 */
function buildAlertEmail(verdict) {
  const { generateEmailTemplate } = require("../utils/emailTemplate");
  const { alarms, facts } = verdict;

  const rows = alarms
    .map(
      (a) => `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #fee2e2; vertical-align:top;">
          <strong style="color:#b91c1c;">[${a.code}/${a.severity}]</strong>
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #fee2e2; vertical-align:top;">
          <strong>${a.title}</strong><br>
          <span style="color:#6b7280; font-size:13px;">${a.detail}</span>
        </td>
      </tr>`
    )
    .join("");

  const f = facts || {};
  const factLine = (label, val) =>
    `<li style="margin-bottom:6px;"><strong>${label}:</strong> ${val ?? "—"}</li>`;

  const body = `
    <p>Der <strong>Legal-Pulse-Wächter</strong> hat ein Problem mit dem Herzstück erkannt.
    Solange das besteht, werden Nutzer <strong>möglicherweise nicht</strong> über relevante
    Gesetzesänderungen informiert.</p>

    <div style="background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:8px 4px; margin:18px 0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;">${rows}</table>
    </div>

    <p style="margin:18px 0 6px;"><strong>Letzter Stand:</strong></p>
    <ul style="font-size:14px; color:#334155; padding-left:18px; margin:0;">
      ${factLine("Letzter RSS-Sync", f.lastSyncAt ? new Date(f.lastSyncAt).toISOString() : null)}
      ${factLine("Davon neu+aktualisiert", f.lastSyncFresh)}
      ${factLine("Neuestes Gesetz", f.newestLawAt ? new Date(f.newestLawAt).toISOString() : null)}
      ${factLine("Letzter Radar-Lauf", f.lastRadarAt ? new Date(f.lastRadarAt).toISOString() : null)}
    </ul>

    <p style="margin-top:18px;">Bitte prüfen: Render-Logs der Cron-Jobs sowie die RSS-Feed-URLs
    (<code>backend/services/rssService.js</code>). Diese Mail kommt nur, wenn wirklich etwas faul ist.</p>
  `;

  const html = generateEmailTemplate({
    title: "⚠️ Legal Pulse: Herzschlag gestört",
    body,
    preheader: `${alarms.length} Problem(e) im Legal-Pulse-Nachschub erkannt`,
    badge: "Watchdog",
  });

  return {
    subject: `⚠️ [Legal Pulse] Wächter-Alarm: ${alarms.map((a) => a.code).join("+")} (${alarms.length} Problem(e))`,
    html,
  };
}

/**
 * Haupt-Einstieg (vom Cron aufgerufen).
 * @param {import('mongodb').Db} db
 * @param {{ dryRun?: boolean, forceSend?: boolean }} opts
 *   dryRun   = niemals senden (nur Verdikt zurückgeben) — für Tests gegen Prod-Daten
 *   forceSend= auch bei "gesund" eine (Test-)Mail senden — um den Mailweg zu prüfen
 */
async function runPulseV2Watchdog(db, opts = {}) {
  const { dryRun = false, forceSend = false } = opts;
  const verdict = await evaluateHealth(db);

  if (verdict.healthy && !forceSend) {
    console.log("[PulseV2Watchdog] 🟢 Gesund — keine Mail.", JSON.stringify(verdict.facts));
    return { ...verdict, mailed: false };
  }

  if (dryRun) {
    console.log(
      `[PulseV2Watchdog] ${verdict.healthy ? "🟢 gesund" : "🔴 UNGESUND"} (dryRun, keine Mail). Alarme:`,
      verdict.alarms.map((a) => `${a.code}:${a.title}`)
    );
    return { ...verdict, mailed: false };
  }

  // Echter Versand nur hier.
  const recipient = resolveRecipient();
  try {
    const sendEmail = require("../utils/sendEmail");
    const { subject, html } = forceSend && verdict.healthy
      ? {
          subject: "✅ [Legal Pulse] Wächter-Testmail — Herz schlägt",
          html: require("../utils/emailTemplate").generateEmailTemplate({
            title: "✅ Legal Pulse: Wächter aktiv",
            body: `<p>Dies ist eine <strong>Test-Mail</strong> des Legal-Pulse-Wächters. Der Mailweg funktioniert.</p>
                   <p>Aktueller Stand: Letztes Gesetz ${verdict.facts.newestLawAt ? new Date(verdict.facts.newestLawAt).toISOString() : "—"}, letzter Sync brachte ${verdict.facts.lastSyncFresh ?? "—"} neue/aktualisierte Gesetze. 🟢</p>`,
            badge: "Watchdog-Test",
          }),
        }
      : buildAlertEmail(verdict);

    await sendEmail({ to: recipient, subject, html });
    console.log(`[PulseV2Watchdog] 📧 Alarm-Mail an ${recipient} gesendet (${verdict.alarms.length} Alarm(e)).`);
  } catch (err) {
    console.error("[PulseV2Watchdog] ❌ Mailversand fehlgeschlagen:", err.message);
    // Sekundärer Kanal: bestehendes Error-Monitoring (zeigt im Dashboard, mailt ggf. separat)
    try {
      const { captureError } = require("../services/errorMonitoring");
      await captureError(new Error(`Legal-Pulse-Wächter konnte Alarm nicht mailen: ${err.message}`), {
        route: "CRON:pulse-v2-watchdog",
        method: "SCHEDULED",
        severity: "critical",
      });
    } catch { /* letzter Fallback: nur Log */ }
    return { ...verdict, mailed: false, mailError: err.message };
  }

  return { ...verdict, mailed: true, recipient };
}

module.exports = { runPulseV2Watchdog, evaluateHealth, buildAlertEmail, resolveRecipient };
