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
// Invariante 6: nur FRISCHE Abmeldungen alarmieren (Fenster in Stunden). Grund unten.
const RECENT_UNSUB_HOURS = 48;

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
      `versendet noch zurückgesetzt (der 48h-Reaper räumt sie nur ab, wenn CALENDAR_QUEUED_REAPER_ENABLED gesetzt ist). ` +
      `Beispiele: ${sample(stuck.map(e => e._id))}.`,
      { ids: stuck.slice(0, 20).map(e => String(e._id)) });
  }

  // ── 6) Abgemeldete Kunden, die dadurch Fristen verpassen ───────────────────
  // 21.08.2026 (adversarialer Prüfbefund): Seit das Abmelde-Tor VOR dem Claim greift
  // (calendarNotifier.isCalendarUnsubscribed), hinterlässt eine unterdrückte Erinnerung
  // KEINE Spur mehr — vorher gab es wenigstens eine "skipped"-Zeile in email_queue und
  // ein hängendes queued-Event, das Invariante 5 meldete. Fachlich war das ein Fehlalarm,
  // praktisch war es der EINZIGE Melder für "Kunde bekommt stillschweigend nichts mehr".
  // Diese Invariante ersetzt ihn durch das, was wirklich zählt: Ist jemand abgemeldet UND
  // hat noch offene Fristen? Dann fliegt er blind, und das darf nicht still passieren.
  // Bewusst KEIN Alarm bei Abgemeldeten ohne offene Fristen — das ist eine harmlose,
  // legitime Entscheidung.
  // 24.08.2026 NACHGESCHÄRFT, dann VEREINFACHT: Es gab VIER unabhängige Aus-Schalter für
  // Fristen-Mails; seit der Vereinheitlichung am selben Tag sind es DREI. Der vierte
  // (notificationSettings.email.contractDeadlines) blockiert nichts mehr — der Profil-Schalter
  // schreibt jetzt emailPreferences.calendar. Ihn hier weiter abzufragen würde einen FEHLALARM
  // über einen Kunden erzeugen, der in Wahrheit ganz normal Mails bekommt. Historie:
  // nicht zwei. Neben emailOptOut und emailPreferences.calendar (Abmelde-Link) wirken
  // auch die beiden Profil-Schalter notificationSettings.email.enabled und
  // .contractDeadlines — gelesen von calendarNotifier.js:372, calendarDigestService.js:281
  // und notificationSender.js:113/188. Die erste Fassung dieser Invariante kannte nur die
  // ersten beiden; ein per Profil stummgeschalteter Kunde mit offenen Fristen fiel also
  // NICHT auf. Genau die Stille, gegen die diese Invariante gebaut wurde.
  // 27.08.2026 ENTSCHÄRFT (Alarm-Müdigkeit): Diese Invariante feuerte JEDEN Tag als high
  // über DIESELBEN Kunden, die sich bewusst abgemeldet haben (real: 26.+27.08. identischer
  // Alarm über 3 seit Tagen abgemeldete Nutzer). Eine Regel, die täglich einen Dauerzustand
  // meldet, wird ignoriert — dann geht der eine echte Alarm unter. Lösung wie bei Invariante 7:
  // ZEITFENSTER. Nur wer sich in den letzten RECENT_UNSUB_HOURS abgemeldet hat, löst aus.
  // Das passt fachlich sogar exakt: Ein Fehlklick ist frisch umkehrbar; wer nach dem Fenster
  // noch abgemeldet ist, hat es gewollt und wird still honoriert (genau die Frage im Alarmtext).
  // Zeitstempel: emailPreferencesUpdatedAt wird von ALLEN Abmelde-Wegen gesetzt (Abmelde-Link,
  // global, Profil-Speicher spiegelt calendar) — eine frische Abmeldung hat ihn immer ~jetzt.
  // Alle Blinden bleiben für stats/Log sichtbar; nur der ALARM ist auf frische Fälle begrenzt.
  const frischCutoff = new Date(now.getTime() - RECENT_UNSUB_HOURS * 3600 * 1000);
  const unsubscribedUsers = await db.collection('users').find({
    $or: [
      { emailOptOut: true },
      { 'emailPreferences.calendar': false },
      { 'notificationSettings.email.enabled': false }
    ]
  }).project({
    _id: 1, email: 1, emailOptOut: 1, 'emailPreferences.calendar': 1,
    'notificationSettings.email.enabled': 1, emailPreferencesUpdatedAt: 1, emailOptOutAt: 1
  }).toArray();
  const blindeKunden = [];   // ALLE Blinden (für stats/Log — volle Sicht)
  const blindeNeu = [];      // nur FRISCH abgemeldet (für den Alarm)
  for (const u of unsubscribedUsers) {
    const offen = await db.collection('contract_events').countDocuments({
      userId: u._id, status: 'scheduled', date: { $gte: now },
      severity: { $in: ['info', 'warning', 'critical'] }
    });
    if (offen > 0) {
      const grund = u.emailOptOut === true ? 'emailOptOut (global)'
        : u.emailPreferences?.calendar === false ? 'Abmelde-Link (emailPreferences.calendar)'
        : 'Profil: E-Mails gesamt aus';
      const eintrag = { id: String(u._id), offen, grund };
      blindeKunden.push(eintrag);
      const ts = u.emailPreferencesUpdatedAt || u.emailOptOutAt;
      if (ts && new Date(ts) >= frischCutoff) blindeNeu.push(eintrag);
    }
  }
  if (blindeNeu.length > 0) {
    const gesamt = blindeNeu.reduce((s, k) => s + k.offen, 0);
    await alarm('CalendarWatchdogUnsubscribedWithDeadlines', 'high',
      `${blindeNeu.length} Kunde(n) haben sich in den letzten ${RECENT_UNSUB_HOURS}h von Kalender-Mails abgemeldet, ` +
      `haben aber zusammen ${gesamt} offene Frist(en) — sie bekommen dazu KEINE Erinnerung mehr und merken es nicht. ` +
      `Frisch abgemeldet, daher evtl. Fehlklick und noch umkehrbar (ältere, bewusste Abmeldungen werden bewusst NICHT täglich wiederholt gemeldet). ` +
      `Gründe: ${sample([...new Set(blindeNeu.map(k => k.grund))])}. ` +
      `emailPreferences.calendar / emailOptOut zurücksetzen. Betroffen: ${sample(blindeNeu.map(k => k.id))}.`,
      { users: blindeNeu.slice(0, 20), blindeGesamt: blindeKunden.length });
  } else if (blindeKunden.length > 0) {
    console.log(`🐕 Kalender-Wächter: ${blindeKunden.length} bekannte, bewusst abgemeldete Kunde(n) mit offenen Fristen — kein neuer Fall, nicht erneut gemeldet.`);
  }

  // ── 7) Die ZWEITE Versand-Strecke (notification_queue) ─────────────────────
  // 23.08.2026 entdeckt, 24.08.2026 abgesichert: Neben contract_events/email_queue gibt es
  // eine völlig eigene Strecke — notificationSender.js schickt "Vertrag läuft bald ab"-Mails
  // aus notification_queue, an email_queue vorbei. Kein Retry, kein Bounce-Requeue, und bis
  // heute auch keine cron_logs-Spur. Alle sechs Invarianten oben lesen contract_events und
  // konnten sie deshalb NIE prüfen. Folge: 11 echte Kunden bekamen Anfang 2026 ihre Mail nie
  // (Absender-Fehlkonfiguration), und das fiel SIEBEN MONATE lang niemandem auf.
  // "failed" ist dort ein Endzustand — was hier liegen bleibt, wird nie wieder versucht.
  const seitGestern = new Date(now.getTime() - 36 * 3600 * 1000);
  const nqFailed = await db.collection('notification_queue').find({
    status: 'failed', failedAt: { $gte: seitGestern }
  }).project({ _id: 1, type: 1, lastError: 1 }).toArray();
  if (nqFailed.length > 0) {
    const gruende = [...new Set(nqFailed.map(n => String(n.lastError || 'ohne Fehlertext').slice(0, 60)))];
    await alarm('CalendarWatchdogNotificationQueueFailed', 'high',
      `${nqFailed.length} Vertrags-Status-Mail(s) der zweiten Versand-Strecke sind in den letzten ` +
      `36h endgültig fehlgeschlagen (notification_queue). Dort gibt es KEINEN Wiederholversuch — ` +
      `diese Kunden bekommen ihre "Vertrag läuft ab"-Mail nie. Gründe: ${sample(gruende)}. ` +
      `IDs: ${sample(nqFailed.map(n => n._id))}.`,
      { ids: nqFailed.slice(0, 20).map(n => String(n._id)), reasons: gruende.slice(0, 5) });
  }
  // Überfällig und unbearbeitet: der Cron hätte sie längst abholen müssen.
  const nqUeberfaellig = await db.collection('notification_queue').countDocuments({
    status: 'pending', scheduledFor: { $lte: new Date(now.getTime() - 36 * 3600 * 1000) }
  });
  if (nqUeberfaellig > 0) {
    await alarm('CalendarWatchdogNotificationQueueStale', 'high',
      `${nqUeberfaellig} Eintrag/Einträge in notification_queue sind seit über 36h fällig, aber ` +
      `noch "pending" — der 09:00-Lauf holt sie offenbar nicht ab (Sperre hängt, Cron aus, oder ` +
      `Fehler vor der Schleife). Ohne diese Regel bliebe das unsichtbar.`,
      { count: nqUeberfaellig });
  }

  const stats = {
    findings: findings.length,
    sendCronTrace: !!(lock || log),
    unlinkedReminders: unlinkedNew.length,
    deadReferences: deadRefs.length,
    notifiedWithoutMail: notifiedWithoutMail.length,
    stuckQueued: stuck.length,
    unsubscribedWithDeadlines: blindeKunden.length,
    unsubscribedWithDeadlinesNew: blindeNeu.length,
    notificationQueueFailed: nqFailed.length,
    notificationQueueStale: nqUeberfaellig,
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
