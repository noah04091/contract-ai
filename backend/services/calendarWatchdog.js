// 📁 backend/services/calendarWatchdog.js
//
// 🐕 KALENDER-WÄCHTER (Stufe 3, 18.08.2026) — täglicher Selbsttest des Erinnerungs-Systems.
// Nordstern: „User sollen sich blind darauf verlassen können." Fehler sollen sich SELBST
// melden, statt von Noah oder Kunden gefunden zu werden.
//
// Prüft fünf Invarianten (alle read-only) und meldet Verstöße über den bestehenden
// Alarmkanal (services/errorMonitoring.captureError → error_logs + Alarmmail an
// info@contract-ai.de, mit dessen Fingerprint-Gruppierung und Mail-Deckeln):
//   1. VERSAND-CRON LIEF HEUTE — schließt die dokumentiert offene Lücke „Voll-Tag-
//      Cron-Ausfall" (Kalender-Karte, „Option C": Admin-Alarm statt später Kunden-Mail).
//      Spur: cron_locks-Tagesbucket ODER cron_logs-Eintrag von heute (UTC).
//   2. KEINE UNVERKNÜPFTEN VORWARNER — jede _REMINDER_ND muss metadata.deadlineEventId
//      tragen (Stufe 2). Treffer = Generator-Regression. Bekannte Alt-Ausnahme unten.
//   3. KEINE TOTEN REFERENZEN — deadlineEventId aktiver Vorwarner (scheduled/queued)
//      zeigt auf ein existierendes Event.
//   4. GESTERN „notified" ⇒ MAIL EXISTIERT — jedes gestern als benachrichtigt markierte
//      Event hat einen email_queue-Eintrag (Zustell-Abgleich).
//   5. KEINE HÄNGENDEN „queued" > 48h — der Reaper (reapStuckQueuedEvents) ist per
//      Env-Schalter standardmäßig AUS; der Wächter macht Zombies trotzdem sichtbar.
//
// Ein Alarm pro verletzter Invariante mit EIGENEM Fehlernamen (→ eigener Fingerprint,
// keine gegenseitige Verschluckung in der Ruhezeit). Stille, wenn alles sauber ist.
// PURE bezüglich Seiteneffekten: schreibt nichts, deps injizierbar (Unit-Tests).

const { captureError } = require('./errorMonitoring');

// Dokumentierte Alt-Ausnahme (17./18.08.2026): abgelaufener Vorwarner „Ende der
// Datenlöschfrist" auf dem eigenen AVV-Testdokument — seine Frist existierte nie als
// eigenes Event, bewusst ohne Referenz gelassen (kein Raten im Backfill).
const KNOWN_UNLINKED_IDS = ['6a649c84a31ad340c5ef19f8'];

const REMINDER_TYPE = /_REMINDER_\d+D$/i;
const STUCK_QUEUED_HOURS = 48;

function utcDayBucket(d) { return d.toISOString().slice(0, 10); }
function utcDayStart(d) { const x = new Date(d); x.setUTCHours(0, 0, 0, 0); return x; }

async function runCalendarWatchdog(db, opts = {}) {
  const now = opts.now || new Date();
  const capture = opts.capture || captureError;
  const findings = [];

  const alarm = (name, severity, message, details) => {
    findings.push({ name, severity, message, details });
    const err = new Error(message);
    err.name = name;
    // ohne await-Kette abbrechen zu lassen: Alarmfehler dürfen den Wächter nicht stoppen
    return Promise.resolve(capture(err, { route: 'CRON:calendar-watchdog', method: 'SCHEDULED', severity }))
      .catch(e => console.error(`⚠️ Wächter-Alarm "${name}" konnte nicht gemeldet werden:`, e.message));
  };
  const sample = (arr) => arr.slice(0, 5).map(x => String(x)).join(', ');

  // ── 1) Versand-Cron lief heute ─────────────────────────────────────────────
  const bucket = utcDayBucket(now);
  const lock = await db.collection('cron_locks').findOne({ _id: `reminder-calendar:${bucket}` });
  const log = lock ? null : await db.collection('cron_logs').findOne({
    jobName: 'reminder-calendar', startedAt: { $gte: utcDayStart(now) }
  });
  if (!lock && !log) {
    await alarm('CalendarWatchdogSendCronMissing', 'critical',
      `Der 09:00-Versand-Cron (reminder-calendar) hat HEUTE (${bucket}) keine Spur hinterlassen — ` +
      `weder cron_locks noch cron_logs. Fällige Erinnerungen wurden möglicherweise nicht versendet. ` +
      `Kein automatisches Nachsenden (bewusste Entscheidung „keine späten Mails") — manuell prüfen!`);
  }

  // ── 2) Unverknüpfte Vorwarner (Stufe-2-Invariante) ─────────────────────────
  const unlinked = await db.collection('contract_events').find({
    type: { $regex: REMINDER_TYPE },
    'metadata.seedTest': { $ne: true },
    'metadata.deadlineEventId': { $exists: false }
  }).project({ _id: 1, type: 1, title: 1 }).toArray();
  const unlinkedNew = unlinked.filter(e => !KNOWN_UNLINKED_IDS.includes(String(e._id)));
  if (unlinkedNew.length > 0) {
    await alarm('CalendarWatchdogUnlinkedReminders', 'high',
      `${unlinkedNew.length} Vorwarn-Event(s) ohne metadata.deadlineEventId — der Generator ` +
      `(assignDeadlineRefs) oder ein fremder Schreibpfad erzeugt wieder unverknüpfte Erinnerungen. ` +
      `Beispiele: ${sample(unlinkedNew.map(e => e._id))}. ` +
      `Abhilfe: scripts/_backfillDeadlineRefs.js (idempotent) + Erzeuger finden.`,
      { ids: unlinkedNew.slice(0, 20).map(e => String(e._id)) });
  }

  // ── 3) Tote Referenzen aktiver Vorwarner ───────────────────────────────────
  const active = await db.collection('contract_events').find({
    type: { $regex: REMINDER_TYPE },
    status: { $in: ['scheduled', 'queued'] },
    'metadata.deadlineEventId': { $exists: true }
  }).project({ _id: 1, 'metadata.deadlineEventId': 1 }).toArray();
  const refIds = [...new Set(active.map(e => String(e.metadata.deadlineEventId)))];
  let deadRefs = [];
  if (refIds.length > 0) {
    const { ObjectId } = require('mongodb');
    const existing = await db.collection('contract_events')
      .find({ _id: { $in: refIds.map(i => new ObjectId(i)) } })
      .project({ _id: 1 }).toArray();
    const existingSet = new Set(existing.map(e => String(e._id)));
    deadRefs = active.filter(e => !existingSet.has(String(e.metadata.deadlineEventId)));
  }
  if (deadRefs.length > 0) {
    await alarm('CalendarWatchdogDeadReferences', 'high',
      `${deadRefs.length} aktive Vorwarner zeigen auf eine nicht (mehr) existierende Frist ` +
      `(deadlineEventId ohne Ziel) — vermutlich Frist gelöscht/regeneriert, Vorwarner blieb. ` +
      `Beispiele: ${sample(deadRefs.map(e => e._id))}.`,
      { ids: deadRefs.slice(0, 20).map(e => String(e._id)) });
  }

  // ── 4) Gestern „notified" ⇒ Mail existiert ─────────────────────────────────
  const todayStart = utcDayStart(now);
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 3600 * 1000);
  const notifiedYesterday = await db.collection('contract_events').find({
    notifiedAt: { $gte: yesterdayStart, $lt: todayStart }
  }).project({ _id: 1, title: 1 }).toArray();
  let notifiedWithoutMail = [];
  if (notifiedYesterday.length > 0) {
    const mailDocs = await db.collection('email_queue')
      .find({ eventId: { $in: notifiedYesterday.map(e => String(e._id)) } })
      .project({ eventId: 1 }).toArray();
    const mailed = new Set(mailDocs.map(m => m.eventId));
    notifiedWithoutMail = notifiedYesterday.filter(e => !mailed.has(String(e._id)));
  }
  if (notifiedWithoutMail.length > 0) {
    await alarm('CalendarWatchdogNotifiedWithoutMail', 'high',
      `${notifiedWithoutMail.length} Event(s) wurden gestern als "notified" markiert, aber in ` +
      `email_queue existiert KEINE zugehörige Mail — Zustell-Abgleich verletzt. ` +
      `Beispiele: ${sample(notifiedWithoutMail.map(e => e._id))}.`,
      { ids: notifiedWithoutMail.slice(0, 20).map(e => String(e._id)) });
  }

  // ── 5) Hängende „queued" ────────────────────────────────────────────────────
  const stuckCutoff = new Date(now.getTime() - STUCK_QUEUED_HOURS * 3600 * 1000);
  const stuck = await db.collection('contract_events').find({
    status: 'queued', queuedAt: { $lt: stuckCutoff }
  }).project({ _id: 1, title: 1, queuedAt: 1 }).toArray();
  if (stuck.length > 0) {
    await alarm('CalendarWatchdogStuckQueued', 'high',
      `${stuck.length} Event(s) hängen seit >${STUCK_QUEUED_HOURS}h im Status "queued" — weder ` +
      `versendet noch zurückgesetzt (Reaper ist standardmäßig aus, CALENDAR_QUEUED_REAPER_ENABLED). ` +
      `Beispiele: ${sample(stuck.map(e => e._id))}.`,
      { ids: stuck.slice(0, 20).map(e => String(e._id)) });
  }

  const stats = {
    findings: findings.length,
    sendCronTrace: !!(lock || log),
    unlinkedReminders: unlinkedNew.length,
    deadReferences: deadRefs.length,
    notifiedWithoutMail: notifiedWithoutMail.length,
    stuckQueued: stuck.length,
    checkedActiveRefs: active.length,
    notifiedYesterday: notifiedYesterday.length
  };
  if (findings.length === 0) {
    console.log(`🐕 Kalender-Wächter: alles sauber (${active.length} aktive Referenzen, ` +
      `${notifiedYesterday.length} Zustellungen gestern, Cron-Spur ok)`);
  } else {
    console.warn(`🐕 Kalender-Wächter: ${findings.length} Befund(e) gemeldet:`,
      findings.map(f => f.name).join(', '));
  }
  return stats;
}

module.exports = { runCalendarWatchdog, KNOWN_UNLINKED_IDS, STUCK_QUEUED_HOURS };
