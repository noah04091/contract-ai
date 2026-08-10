/**
 * Legal Pulse V2 — Betreiber-Feedback-Bilanz (Admin-Digest)
 *
 * REIN LESEND am Kundenpfad: liest pulse_v2_legal_alerts (userFeedback) + users,
 * schreibt NUR eine Mail an den Betreiber in die email_queue. Verändert keine
 * Alerts, keine Kundenmails, keine Legal-Pulse-Logik.
 *
 * ZWECK: Qualitäts-Frühwarnung + Datenbasis für spätere A/B-Entscheidungen.
 * Zeigt wöchentlich, wie die 👍/👎-Stimmen zu Radar-Alerts ausfallen — global
 * über alle Nutzer (die In-App-Metriken /alert-metrics und /radar-health-detail
 * sind bewusst nur nutzer-bezogen).
 *
 * KEIN LÄRM (Watchdog-Prinzip): Mail wird NUR versendet, wenn es in den letzten
 * 7 Tagen mindestens ein neues Feedback gab. Sonst still (nur Log-Zeile).
 *
 * Schedule: Montag, im selben Cron wie der Wach-Bericht (NACH dem Kundenversand,
 * eigener try/catch in server.js — ein Fehler hier kann den Kundenpfad nie stören).
 * Kill-Switch: env PULSE_ADMIN_FEEDBACK_DIGEST_ENABLED muss 'true' sein (Standard AUS).
 * Hinweis: hängt am äußeren PULSE_WEEKLY_REPORT_ENABLED-Gate des Montags-Crons.
 */

const { queueEmail } = require("../services/emailRetryService");
const { cleanContractName } = require("../utils/cleanContractName");
// Gemeinsame Text-Helfer: Ein-/Mehrzahl (siehe utils/mailText.js).
const { plural } = require("../utils/mailText");
const {
  generatePulseEmailTemplate, pulseHeadline, pulseLead, pulseSection,
} = require("../utils/pulseEmailTemplate");

const WINDOW_DAYS = 7;
const MAX_ITEMS_IN_EMAIL = 20;

/** Empfänger-Kette wie beim Watchdog — kann niemals leer sein. */
function resolveRecipient() {
  return (
    process.env.LEGAL_PULSE_WATCHDOG_EMAIL ||
    process.env.ADMIN_EMAIL ||
    process.env.ERROR_ALERT_EMAIL ||
    "liebold.noah@web.de"
  );
}

/** Kürzt lange Gesetzes-/Urteilstitel am Wortende (wie im Wach-Bericht). */
function truncateTitle(title, max = 110) {
  const t = String(title || "").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:\s]+$/, "") + " …";
}

/** users._id ist ObjectId, alerts.userId ein String — immer beide Kandidaten suchen. */
async function findUserRobust(db, userId, projection) {
  const { ObjectId } = require("mongodb");
  const idStr = String(userId);
  const candidates = [userId, idStr];
  if (ObjectId.isValid(idStr)) {
    try { candidates.push(new ObjectId(idStr)); } catch { /* ignore */ }
  }
  return db.collection("users").findOne({ _id: { $in: candidates } }, { projection });
}

/**
 * Kern: sammelt Feedback-Daten und baut/verschickt die Betreiber-Mail.
 * options.dryRun: baut die Mail (auch ohne neues Feedback), sendet NICHTS.
 * @returns {{ sent:number, freshCount:number, reason?:string, subject?:string, html?:string }}
 */
async function runAdminFeedbackDigest(db, options = {}) {
  if (!options.dryRun && process.env.PULSE_ADMIN_FEEDBACK_DIGEST_ENABLED !== "true") {
    console.log("[PulseV2AdminFeedbackDigest] deaktiviert (PULSE_ADMIN_FEEDBACK_DIGEST_ENABLED != 'true')");
    return { sent: 0, freshCount: 0, reason: "disabled" };
  }

  const alerts = db.collection("pulse_v2_legal_alerts");
  const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Neue Stimmen der letzten 7 Tage (neueste zuerst)
  const fresh = await alerts
    .find({ "userFeedback.feedbackAt": { $gte: since } })
    .project({ lawTitle: 1, contractName: 1, severity: 1, userFeedback: 1, userId: 1 })
    .sort({ "userFeedback.feedbackAt": -1 })
    .limit(MAX_ITEMS_IN_EMAIL + 30)
    .toArray();

  // Gesamt-Bilanz (alle Zeiten)
  const [totals] = await alerts.aggregate([
    {
      $group: {
        _id: null,
        alertsTotal: { $sum: 1 },
        withFeedback: { $sum: { $cond: [{ $gt: ["$userFeedback.feedbackAt", null] }, 1, 0] } },
        useful: { $sum: { $cond: [{ $eq: ["$userFeedback.useful", true] }, 1, 0] } },
        notUseful: { $sum: { $cond: [{ $eq: ["$userFeedback.useful", false] }, 1, 0] } },
      },
    },
  ]).toArray();
  const t = totals || { alertsTotal: 0, withFeedback: 0, useful: 0, notUseful: 0 };
  const usefulRate = t.withFeedback > 0 ? Math.round((t.useful / t.withFeedback) * 100) : null;

  if (fresh.length === 0 && !options.dryRun) {
    console.log("[PulseV2AdminFeedbackDigest] Kein neues Feedback in 7 Tagen — keine Mail (kein Lärm).");
    return { sent: 0, freshCount: 0, reason: "no_new_feedback" };
  }

  // Nutzer-Kontext (E-Mail + Plan) pro Stimme — Fehler hier nie fatal
  const userCache = new Map();
  for (const a of fresh) {
    const key = String(a.userId);
    if (userCache.has(key)) continue;
    try {
      const u = await findUserRobust(db, a.userId, { email: 1, subscriptionPlan: 1 });
      userCache.set(key, u ? `${u.email || "?"} · ${u.subscriptionPlan || "free"}` : "unbekannter Nutzer");
    } catch {
      userCache.set(key, "unbekannter Nutzer");
    }
  }

  const freshUp = fresh.filter((a) => a.userFeedback?.useful === true).length;
  const freshDown = fresh.length - freshUp;

  let body = pulseHeadline(
    fresh.length > 0
      ? `Feedback der Woche: ${fresh.length} ${fresh.length === 1 ? "neue Stimme" : "neue Stimmen"}`
      : "Feedback-Bilanz (noch keine neuen Stimmen)"
  );
  body += pulseLead(
    `Betreiber-Übersicht der 👍/👎-Stimmen zu Legal-Pulse-Alerts. Diese Woche: ` +
    `<strong>${freshUp}× hilfreich</strong>, <strong>${freshDown}× nicht hilfreich</strong>. ` +
    `Gesamt seit Start: ${t.withFeedback} ${plural(t.withFeedback, "Stimme", "Stimmen")} zu ${t.alertsTotal} ${plural(t.alertsTotal, "Alert", "Alerts")}` +
    (usefulRate === null ? "." : ` — Hilfreich-Rate <strong>${usefulRate}%</strong> (${t.useful}👍/${t.notUseful}👎).`)
  );

  fresh.slice(0, MAX_ITEMS_IN_EMAIL).forEach((a, idx) => {
    const up = a.userFeedback?.useful === true;
    const when = a.userFeedback?.feedbackAt
      ? new Date(a.userFeedback.feedbackAt).toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit" })
      : "";
    body += pulseSection({
      name: cleanContractName(a.contractName) || "Unbenannter Vertrag",
      dotColor: up ? "#059669" : "#dc2626",
      statusText: up ? "Hilfreich" : "Nicht hilfreich",
      statusColor: up ? "#059669" : "#dc2626",
      metaText: `${truncateTitle(a.lawTitle)}${when ? ` · ${when}` : ""} · ${userCache.get(String(a.userId)) || ""}`,
      isFirst: idx === 0,
    });
  });
  if (fresh.length > MAX_ITEMS_IN_EMAIL) {
    const rest = fresh.length - MAX_ITEMS_IN_EMAIL;
    body += pulseLead(`<span style="color:#8792a2; font-size:13px;">+ ${rest} ${plural(rest, "weitere Stimme", "weitere Stimmen")} diese Woche</span>`);
  }
  body += pulseLead(
    `<span style="color:#8792a2; font-size:13px;">Interne Betreiber-Mail — kommt nur montags und nur, wenn es neues Feedback gab. ` +
    `Details auf Zuruf: <code>node backend/scripts/pulseFeedbackReport.js</code></span>`
  );

  const subject = fresh.length > 0
    ? `📊 Legal Pulse Feedback: ${fresh.length} neu (${freshUp}👍/${freshDown}👎)${usefulRate === null ? "" : ` — Rate ${usefulRate}%`}`
    : `📊 Legal Pulse Feedback-Bilanz`;
  const html = generatePulseEmailTemplate({ body, badge: "Feedback-Bilanz", preheader: "Betreiber-Übersicht der Alert-Bewertungen" });

  if (options.dryRun) {
    return { sent: 0, freshCount: fresh.length, subject, html, totals: t, usefulRate };
  }

  await queueEmail(db, {
    to: resolveRecipient(),
    subject,
    html,
    emailType: "legal_pulse_v2_admin_feedback_digest",
  });
  console.log(`[PulseV2AdminFeedbackDigest] Betreiber-Mail eingereiht: ${fresh.length} neue Stimmen (${freshUp}👍/${freshDown}👎) an ${resolveRecipient()}`);
  return { sent: 1, freshCount: fresh.length };
}

module.exports = { runAdminFeedbackDigest };
