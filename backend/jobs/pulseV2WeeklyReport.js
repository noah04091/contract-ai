/**
 * Legal Pulse V2 — Wöchentlicher Wach-Bericht ("Vigilance Report")
 *
 * Sendet jedem überwachten Nutzer EINMAL pro Woche einen ruhigen Überblick:
 *   "Wir haben diese Woche X relevante Rechtsänderungen gegen deine Y Verträge
 *    geprüft — Ergebnis: alles aktuell / Z Punkte für dich."
 *
 * ZWECK: Vertrauen + Bindung. Legal Pulse meldet sich nicht nur bei Alarm,
 * sondern zeigt ruhig, dass es wacht — auch wenn nichts zu tun ist.
 *
 * ADDITIV: berührt weder Radar-Matching noch andere Mails. Alle Zahlen stammen
 * aus echten Prüfläufen (radar_run_history), echten Analysen (LegalPulseV2Result)
 * und echten Alerts (pulse_v2_legal_alerts) — NICHTS wird erfunden.
 *
 * Schedule: Montag (Kill-Switch: env PULSE_WEEKLY_REPORT_ENABLED muss 'true' sein).
 * Idempotenz: pro Nutzer max. 1 Bericht / 6 Tage (pulse_v2_weekly_report_log).
 */

const LegalPulseV2Result = require("../models/LegalPulseV2Result");
const { queueEmail } = require("../services/emailRetryService");
const { isBusinessOrHigher } = require("../constants/subscriptionPlans");
const {
  generatePulseEmailTemplate, pulseHeadline, pulseLead, pulseSection, pulseReassurance, pulseNote,
} = require("../utils/pulseEmailTemplate");

const WEEK_DAYS = 7;
const COOLDOWN_DAYS = 6;          // verhindert Doppel-Versand (z.B. bei Deploy-Overlap)
const MAX_USERS_PER_RUN = 300;
const MAX_FINDINGS_IN_EMAIL = 6;
const ACCENT = "#2f4bd6";

/**
 * Zählt die in der Woche real ausgewerteten Rechtsänderungen (global, aus den
 * echten täglichen Radar-Läufen — scoped/Admin-Testläufe ausgenommen).
 */
async function countChangesEvaluated(db, weekAgo) {
  try {
    const agg = await db.collection("radar_run_history").aggregate([
      { $match: { runAt: { $gte: weekAgo }, scoped: { $ne: true } } },
      { $group: { _id: null, laws: { $sum: "$lawChanges" } } },
    ]).toArray();
    return agg[0]?.laws || 0;
  } catch (err) {
    console.warn("[PulseV2WeeklyReport] countChangesEvaluated failed:", err.message);
    return 0;
  }
}

/**
 * Ermittelt die echten Kennzahlen eines Nutzers für die Woche.
 */
async function computeUserStats(db, userId, weekAgo) {
  // userId kann als String ODER ObjectId gespeichert sein — beide Formen matchen (robust für Vorschau).
  const { ObjectId } = require("mongodb");
  const idStr = userId?.toString?.() || String(userId);
  const candidates = [userId];
  if (idStr !== userId) candidates.push(idStr);
  try { if (ObjectId.isValid(idStr)) candidates.push(new ObjectId(idStr)); } catch { /* ignore */ }

  const monitored = await LegalPulseV2Result.distinct("contractId", { userId: { $in: candidates }, status: "completed" });
  const monitoredCount = monitored.length;

  const alerts = await db.collection("pulse_v2_legal_alerts").find({
    userId: { $in: candidates },
    createdAt: { $gte: weekAgo },
  }).sort({ createdAt: -1 }).limit(50).toArray();

  const positive = alerts.filter(a => a.impactDirection === "positive");
  const negative = alerts.filter(a => a.impactDirection !== "positive");
  const critical = negative.filter(a => a.severity === "critical");

  return { monitoredCount, alerts, positive, negative, critical };
}

/** Drei Kennzahl-Kacheln (E-Mail-sichere Tabelle, Pulse-Blau). */
function statTiles(tiles) {
  const cells = tiles.map(t => `
        <td width="33%" valign="top" style="padding:5px;">
          <div style="background:#eef2fe; border:1px solid #d7e0fb; border-radius:10px; padding:14px 8px; text-align:center;">
            <div style="font-size:26px; font-weight:700; color:${ACCENT}; line-height:1;">${t.num}</div>
            <div style="font-size:12px; color:#4d586a; margin-top:6px; line-height:1.35;">${t.label}</div>
          </div>
        </td>`).join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 22px;"><tr>${cells}</tr></table>`;
}

/** Baut Betreff + HTML des Wach-Berichts. */
function buildWeeklyReportEmail({ userName, monitoredCount, changesEvaluated, stats }) {
  const clean = (name) => {
    if (!name) return "Unbenannter Vertrag";
    return name.replace(/\.\w{2,4}$/, "").replace(/^\d{10,13}[-_]/, "").replace(/^\d{6}_/, "").replace(/_/g, " ").trim() || "Unbenannter Vertrag";
  };
  const findingCount = stats.negative.length + stats.positive.length;
  const allClear = findingCount === 0;

  let body = pulseHeadline(
    allClear ? "Deine Verträge sind aktuell. Nichts zu tun." : "Dein Wochen-Überblick von Legal Pulse"
  );
  body += pulseLead(`Hallo ${userName},`);
  body += pulseLead(
    "wir haben diese Woche im Hintergrund für dich weitergearbeitet. Hier dein Überblick in drei Zahlen:"
  );

  body += statTiles([
    { num: monitoredCount, label: monitoredCount === 1 ? "Vertrag überwacht" : "Verträge überwacht" },
    { num: changesEvaluated, label: "relevante Rechtsänderungen geprüft" },
    { num: findingCount, label: findingCount === 1 ? "Hinweis für dich" : "Hinweise für dich" },
  ]);

  if (allClear) {
    body += `
      <div style="background:#e6f6ef; border:1px solid #bfe6d6; border-radius:12px; padding:16px 18px; margin:0 0 22px;">
        <span style="color:#149a6d; font-weight:600;">&#10003; Alles im gr&uuml;nen Bereich.</span>
        <span style="color:#3c4257;"> Keine deiner Klauseln ist von den neuen Gesetzen oder Urteilen dieser Woche betroffen. Du musst nichts unternehmen.</span>
      </div>`;
    body += pulseReassurance({
      text: "Sobald sich das &auml;ndert &mdash; ob Risiko oder neue Chance &mdash; melden wir uns sofort und zeigen dir genau die betroffene Stelle. Bis dahin: einfach zur&uuml;cklehnen.",
      buttonText: "Zu deinem Legal Pulse",
      buttonUrl: "https://contract-ai.de/pulse",
    });
  } else {
    const dringend = stats.critical.length;
    const chancen = stats.positive.length;
    const parts = [];
    if (stats.negative.length) parts.push(`<strong style="color:#1a1f36;">${stats.negative.length} ${stats.negative.length === 1 ? "Punkt" : "Punkte"}</strong> zum Ansehen${dringend > 0 ? ` (davon <span style="color:#dc2626; font-weight:600;">${dringend} dringend</span>)` : ""}`);
    if (chancen) parts.push(`<strong style="color:#149a6d;">${chancen} ${chancen === 1 ? "Chance" : "Chancen"}</strong>`);
    body += pulseLead(`Diese Woche gibt es ${parts.join(" und ")} f&uuml;r dich:`);

    const shown = stats.alerts.slice(0, MAX_FINDINGS_IN_EMAIL);
    shown.forEach((a, idx) => {
      const isPos = a.impactDirection === "positive";
      const st = isPos ? { dot: "#059669", text: "Chance" }
        : a.severity === "critical" ? { dot: "#dc2626", text: "Dringend" }
        : { dot: "#d97706", text: "Beobachten" };
      body += pulseSection({
        name: clean(a.contractName),
        dotColor: st.dot,
        statusText: st.text,
        statusColor: st.dot,
        metaText: a.lawTitle ? String(a.lawTitle).slice(0, 120) : undefined,
        isFirst: idx === 0,
      });
    });
    if (stats.alerts.length > MAX_FINDINGS_IN_EMAIL) {
      body += pulseLead(`<span style="color:#8792a2; font-size:13px;">+ ${stats.alerts.length - MAX_FINDINGS_IN_EMAIL} weitere im Dashboard</span>`);
    }
    body += pulseReassurance({
      text: "&Ouml;ffne Legal Pulse: Wir zeigen dir zu jedem Punkt genau die betroffene Stelle und f&uuml;hren dich durch das, was zu tun ist.",
      buttonText: "Punkte ansehen",
      buttonUrl: "https://contract-ai.de/pulse",
    });
  }

  body += pulseNote(
    "Gepr&uuml;ft werden die f&uuml;r deine Vertragsarten relevantesten Rechts&auml;nderungen aus offiziellen Quellen (Gesetzbl&auml;tter, Bundesgerichte, Ministerien, Aufsichtsbeh&ouml;rden). Alle Zahlen stammen aus den tats&auml;chlichen Pr&uuml;fl&auml;ufen dieser Woche. Du bekommst diesen &Uuml;berblick w&ouml;chentlich &mdash; jederzeit in den Einstellungen abstellbar."
  );

  const subject = allClear
    ? "🛡️ Deine Woche: alle Verträge aktuell"
    : `⚖️ Deine Woche: ${findingCount} ${findingCount === 1 ? "Punkt" : "Punkte"} für dich`;
  const preheader = allClear
    ? `${monitoredCount} Verträge überwacht · ${changesEvaluated} Änderungen geprüft · nichts zu tun`
    : `${findingCount} neue Hinweise aus ${changesEvaluated} geprüften Änderungen`;

  const html = generatePulseEmailTemplate({
    body,
    badge: "Wach-Bericht",
    preheader,
    unsubscribeUrl: "https://contract-ai.de/unsubscribe?type=legal_pulse",
  });

  return { subject, html };
}

/**
 * Haupteinstieg — vom Cron aufgerufen.
 * @param {import('mongodb').Db} db
 * @param {{ userId?: any, dryRun?: boolean }} [options]
 *   userId  → nur diesen Nutzer verarbeiten (Vorschau)
 *   dryRun  → NICHT senden/loggen, sondern { subject, html, stats } zurückgeben
 */
async function runWeeklyReport(db, options = {}) {
  const startTime = Date.now();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - WEEK_DAYS * 24 * 60 * 60 * 1000);
  const cooldownThreshold = new Date(now.getTime() - COOLDOWN_DAYS * 24 * 60 * 60 * 1000);

  const changesEvaluated = await countChangesEvaluated(db, weekAgo);

  // ── Vorschau / Einzelnutzer (kein Senden) ────────────────────────────────
  if (options.dryRun) {
    const userId = options.userId;
    const user = await db.collection("users").findOne(
      { $or: [{ _id: userId }, { userId }] },
      { projection: { email: 1, name: 1, firstName: 1 } }
    );
    const stats = await computeUserStats(db, userId, weekAgo);
    const { subject, html } = buildWeeklyReportEmail({
      userName: user?.firstName || user?.name || "Nutzer",
      monitoredCount: stats.monitoredCount,
      changesEvaluated,
      stats,
    });
    return { subject, html, monitoredCount: stats.monitoredCount, changesEvaluated, findings: stats.negative.length + stats.positive.length };
  }

  // ── Regulärer Wochenlauf ──────────────────────────────────────────────────
  const reportLog = db.collection("pulse_v2_weekly_report_log");
  await reportLog.createIndex({ userId: 1, sentAt: -1 }, { background: true }).catch(() => {});

  const usersWithResults = await LegalPulseV2Result.aggregate([
    { $match: { status: "completed" } },
    { $group: { _id: "$userId" } },
  ]);
  let userIds = usersWithResults.map(u => u._id);
  if (options.userId) userIds = userIds.filter(id => String(id) === String(options.userId));

  if (userIds.length === 0) {
    return { usersChecked: 0, sent: 0, changesEvaluated, durationMs: Date.now() - startTime };
  }

  // Cooldown (bereits diese Woche verschickt?)
  const recent = await reportLog.find({
    userId: { $in: userIds },
    sentAt: { $gte: cooldownThreshold },
  }).project({ userId: 1 }).toArray();
  const cooled = new Set(recent.map(r => String(r.userId)));
  const eligible = userIds.filter(id => !cooled.has(String(id)));

  let sent = 0, skipped = 0;
  for (const userId of eligible.slice(0, MAX_USERS_PER_RUN)) {
    try {
      const user = await db.collection("users").findOne(
        { $or: [{ _id: userId }, { userId }] },
        { projection: { email: 1, name: 1, firstName: 1, subscriptionPlan: 1, legalPulseSettings: 1 } }
      );
      if (!user?.email) { skipped++; continue; }

      // Nur zahlende Pläne (Legal Pulse = Business+)
      if (!isBusinessOrHigher(user.subscriptionPlan || "free")) { skipped++; continue; }

      // Opt-out respektieren (fail-open: fehlende Einstellung = senden)
      const s = user.legalPulseSettings;
      if (s && (s.enabled === false || s.emailNotifications === false)) { skipped++; continue; }

      const stats = await computeUserStats(db, userId, weekAgo);
      if (stats.monitoredCount === 0) { skipped++; continue; } // nichts zu berichten

      const { subject, html } = buildWeeklyReportEmail({
        userName: user.firstName || user.name || "Nutzer",
        monitoredCount: stats.monitoredCount,
        changesEvaluated,
        stats,
      });

      await queueEmail(db, { to: user.email, subject, html, userId: String(userId), emailType: "legal_pulse_v2_weekly_report" });
      await reportLog.insertOne({
        userId,
        sentAt: now,
        monitoredCount: stats.monitoredCount,
        changesEvaluated,
        findings: stats.negative.length + stats.positive.length,
      });
      sent++;
    } catch (err) {
      console.error(`[PulseV2WeeklyReport] Error for user ${userId}:`, err.message);
    }
  }

  const durationMs = Date.now() - startTime;
  console.log(`[PulseV2WeeklyReport] Done. ${eligible.length} eligible, ${sent} sent, ${skipped} skipped, ${changesEvaluated} changes evaluated. ${Math.round(durationMs / 1000)}s`);
  return { usersChecked: userIds.length, eligible: eligible.length, sent, skipped, changesEvaluated, durationMs };
}

module.exports = { runWeeklyReport, buildWeeklyReportEmail, computeUserStats };
