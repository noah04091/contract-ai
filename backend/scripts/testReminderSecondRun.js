/**
 * TÜV für den ZWEITEN Kalender-Versand-Lauf (Same-Day-Lücke, 28.07.2026).
 * node backend/scripts/testReminderSecondRun.js
 *
 * Beweist an checkAndSendNotifications (der ECHTEN Funktion, Mock-DB):
 *  1. Ein morgens verarbeitetes Event (queued/notified) wird im zweiten Lauf NICHT
 *     erneut gemailt (Doppel-Mail strukturell ausgeschlossen: Query nimmt nur
 *     status:"scheduled", der atomare Claim macht Verarbeitetes unsichtbar).
 *  2. Ein NACH dem ersten Lauf erzeugtes, heute fälliges Event wird im zweiten
 *     Lauf gemailt (genau die Lücke, die der 17:00-Cron schließt — real passiert
 *     25.07.2026: Analyse 13:22 → LAST_CANCEL_DAY heute → nie gemailt, expired).
 *  3. Klasse-A-Skips (Haupt-Event mit Reminder-Coverage) bleiben in BEIDEN Läufen
 *     Skips — der zweite Lauf erzeugt keine neuen Vorab-Mails.
 *  4. Free-User bleiben in beiden Läufen übersprungen.
 *
 * Kein dotenv, kein SMTP: processEmailQueue wird VOR dem Laden des Notifiers im
 * Modul-Cache auf No-Op gepatcht → es verlässt keine einzige echte Mail den Test.
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-second-run";

const { ObjectId } = require("mongodb");

// ⛔ SMTP-Schutz: emailRetryService ZUERST laden und processEmailQueue neutralisieren —
// calendarNotifier destrukturiert beim eigenen Laden und erwischt damit den No-Op.
const emailRetryService = require("../services/emailRetryService");
emailRetryService.processEmailQueue = async () => ({ processed: 0, sent: 0, retrying: 0, failed: 0 });

const { checkAndSendNotifications } = require("../services/calendarNotifier");

let pass = 0, fail = 0;
const ok = (n, c, info = "") => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n} ${info}`); } };

// ─── Mini-Mongo (nur die vom Notifier genutzten Operationen/Operatoren) ───
function matchValue(docVal, cond) {
  if (cond instanceof RegExp) return cond.test(String(docVal ?? ""));
  if (cond !== null && typeof cond === "object" && !(cond instanceof Date) && !(cond instanceof ObjectId)) {
    return Object.entries(cond).every(([op, v]) => {
      switch (op) {
        case "$gte": return docVal >= v;
        case "$lte": return docVal <= v;
        case "$lt": return docVal < v;
        case "$gt": return docVal > v;
        case "$in": return v.some(x => String(x) === String(docVal));
        case "$nin": return !v.some(x => String(x) === String(docVal));
        case "$ne": return String(docVal) !== String(v);
        case "$regex": return (v instanceof RegExp ? v : new RegExp(v, cond.$options || "")).test(String(docVal ?? ""));
        case "$options": return true;
        default: throw new Error(`Mock kennt Operator ${op} nicht`);
      }
    });
  }
  if (docVal instanceof ObjectId || cond instanceof ObjectId) return String(docVal) === String(cond);
  return docVal === cond;
}
const matches = (doc, query) => Object.entries(query || {}).every(([k, v]) => matchValue(doc[k], v));

function makeDb(state) {
  return {
    collection(name) {
      const arr = state[name] || (state[name] = []);
      return {
        aggregate(pipeline) {
          return {
            async toArray() {
              let docs = arr.map(d => ({ ...d }));
              for (const stage of pipeline) {
                if (stage.$match) docs = docs.filter(d => matches(d, stage.$match));
                else if (stage.$lookup) {
                  const from = state[stage.$lookup.from] || [];
                  docs.forEach(d => { d[stage.$lookup.as] = from.filter(f => String(f[stage.$lookup.foreignField]) === String(d[stage.$lookup.localField])); });
                } else if (stage.$unwind) {
                  const path = (stage.$unwind.path || stage.$unwind).replace(/^\$/, "");
                  docs = docs.flatMap(d => {
                    const v = d[path];
                    if (Array.isArray(v) && v.length) return v.map(item => ({ ...d, [path]: item }));
                    return stage.$unwind.preserveNullAndEmptyArrays ? [{ ...d, [path]: undefined }] : [];
                  });
                } else if (stage.$sort) {
                  const [[key, dir]] = Object.entries(stage.$sort);
                  docs.sort((a, b) => (a[key] > b[key] ? dir : a[key] < b[key] ? -dir : 0));
                }
              }
              return docs;
            }
          };
        },
        find(query) {
          return {
            project() { return this; },
            async toArray() { return arr.filter(d => matches(d, query)); }
          };
        },
        async findOne(query) { return arr.find(d => matches(d, query)) || null; },
        async findOneAndUpdate(filter, update) {
          const doc = arr.find(d => matches(d, filter));
          if (!doc) return null;
          if (update.$set) Object.assign(doc, update.$set);
          if (update.$unset) Object.keys(update.$unset).forEach(k => delete doc[k]);
          return doc;
        },
        async updateOne(filter, update) {
          const doc = arr.find(d => matches(d, filter));
          if (!doc) return { modifiedCount: 0 };
          if (update.$set) Object.assign(doc, update.$set);
          if (update.$unset) Object.keys(update.$unset).forEach(k => delete doc[k]);
          if (update.$inc) Object.keys(update.$inc).forEach(k => { doc[k] = (doc[k] || 0) + update.$inc[k]; });
          return { modifiedCount: 1 };
        },
        async insertOne(doc) { const _id = new ObjectId(); arr.push({ _id, ...doc }); return { insertedId: _id }; },
        async countDocuments(query) { return arr.filter(d => matches(d, query)).length; }
      };
    }
  };
}

(async () => {
  const todayNoon = new Date(); todayNoon.setHours(12, 0, 0, 0);
  const inDays = (n) => { const d = new Date(todayNoon); d.setDate(d.getDate() + n); return d; };

  const paidUser = { _id: new ObjectId(), email: "secondrun-test@example.invalid", subscriptionPlan: "enterprise" };
  const freeUser = { _id: new ObjectId(), email: "secondrun-free@example.invalid", subscriptionPlan: "free" };
  const c1 = new ObjectId(), c2 = new ObjectId(), c3 = new ObjectId();

  // Heute fällig, vor "Lauf 1" vorhanden (der 09:00-Fall)
  const e1 = { _id: new ObjectId(), userId: paidUser._id, contractId: c1, type: "LAST_CANCEL_DAY", title: "🔴 LETZTER TAG: Test kündigen!", date: todayNoon, status: "scheduled", severity: "critical", metadata: { contractName: "Test.pdf" } };
  // Klasse A: Haupt-Event in 3 Tagen MIT Reminder-Coverage → beide Läufe skippen
  const e3main = { _id: new ObjectId(), userId: paidUser._id, contractId: c2, type: "CONTRACT_END", title: "📅 Ende: Test", date: inDays(3), status: "scheduled", severity: "warning", metadata: { contractName: "Test.pdf" } };
  const e3cov = { _id: new ObjectId(), userId: paidUser._id, contractId: c2, type: "CONTRACT_END_REMINDER_7D", title: "⚠️ 7 Tage vorher: Ende", date: inDays(-4), status: "notified", severity: "warning", metadata: { daysUntil: 7 } };
  // Free-User, heute fällig → beide Läufe skippen
  const e4 = { _id: new ObjectId(), userId: freeUser._id, contractId: c3, type: "CANCEL_DEADLINE", title: "⚠️ Kündigungseingang bis: Free", date: todayNoon, status: "scheduled", severity: "warning", metadata: { contractName: "Free.pdf" } };

  // 📭 21.08.2026: Abgemeldeter zahlender Nutzer, heute fällig. Beweist die EINZIGE Aussage,
  // die das neue Vor-Claim-Tor rechtfertigt: Das Event darf NICHT geclaimt werden (bleibt
  // "scheduled", nicht "queued") und es darf KEINE email_queue-Zeile entstehen. Stünde die
  // Prüfung erst in der Warteschlange, wäre das Event hier "queued" und bliebe dort hängen.
  const unsubUser = { _id: new ObjectId(), email: "secondrun-unsub@example.invalid", subscriptionPlan: "enterprise", emailPreferences: { calendar: false } };
  const c4 = new ObjectId();
  const e5 = { _id: new ObjectId(), userId: unsubUser._id, contractId: c4, type: "CANCEL_DEADLINE", title: "⚠️ Kündigungseingang bis: Abgemeldet", date: todayNoon, status: "scheduled", severity: "critical", metadata: { contractName: "Abgemeldet.pdf" } };

  const state = { users: [paidUser, freeUser, unsubUser], contract_events: [e1, e3main, e3cov, e4, e5], email_queue: [] };
  const db = makeDb(state);

  console.log("\n════ Lauf 1 (09:00-Äquivalent) ════");
  const q1 = await checkAndSendNotifications(db);
  const mailsFor = (ev) => state.email_queue.filter(m => m.eventId === ev._id.toString());
  ok("L1: genau 1 Mail gequeued (nur das heute fällige Paid-Event)", q1 === 1 && state.email_queue.length === 1, `q1=${q1} queue=${state.email_queue.length}`);
  ok("L1: E1 wurde beansprucht (scheduled → queued)", e1.status === "queued", `status=${e1.status}`);
  ok("L1: Klasse-A-Hauptevent bleibt scheduled (geskippt, keine Mail)", e3main.status === "scheduled" && mailsFor(e3main).length === 0);
  ok("L1: Free-User-Event bleibt scheduled, keine Mail", e4.status === "scheduled" && mailsFor(e4).length === 0);
  ok("L1: Abgemeldeter Nutzer — Event wurde NICHT beansprucht (Tor steht VOR dem Claim)", e5.status === "scheduled", `status=${e5.status} (bei "queued" stünde die Prüfung zu spät)`);
  ok("L1: Abgemeldeter Nutzer — KEINE Mail in der Warteschlange", mailsFor(e5).length === 0, `mails=${mailsFor(e5).length}`);

  // Zwischen den Läufen: Analyse um 13:22 erzeugt ein heute fälliges Event (der 25.07.-Fall)
  const e2 = { _id: new ObjectId(), userId: paidUser._id, contractId: c1, type: "CONTRACT_END_REMINDER_30D", title: "📅 30 Tage vorher: Ende der Datenlöschfrist", date: todayNoon, status: "scheduled", severity: "info", metadata: { daysUntil: 30, contractName: "Test.pdf" } };
  state.contract_events.push(e2);

  console.log("\n════ Lauf 2 (17:00-Äquivalent, identischer Aufruf) ════");
  const q2 = await checkAndSendNotifications(db);
  ok("L2: genau 1 NEUE Mail (das nachträglich erzeugte Event) — Lücke geschlossen", q2 === 1 && mailsFor(e2).length === 1, `q2=${q2} e2Mails=${mailsFor(e2).length}`);
  ok("L2: KEINE Doppel-Mail für E1 (queued ist für Lauf 2 unsichtbar)", mailsFor(e1).length === 1, `e1Mails=${mailsFor(e1).length}`);
  ok("L2: Klasse-A-Skip identisch wiederholt (keine Mail, bleibt scheduled)", e3main.status === "scheduled" && mailsFor(e3main).length === 0);
  ok("L2: Free-User weiterhin übersprungen", mailsFor(e4).length === 0);
  ok("L2: Abgemeldeter bleibt scheduled und ohne Mail (auch im zweiten Lauf)", e5.status === "scheduled" && mailsFor(e5).length === 0);
  ok("L2: Gesamt-Queue = exakt 2 Mails (E1 aus Lauf 1, E2 aus Lauf 2)", state.email_queue.length === 2, `queue=${state.email_queue.length}`);

  // Härtetest: E1 inzwischen "notified" (Mail bestätigt raus) → dritter Lauf fasst nichts an
  e1.status = "notified";
  console.log("\n════ Lauf 3 (Gegenprobe: alles verarbeitet) ════");
  const q3 = await checkAndSendNotifications(db);
  ok("L3: 0 neue Mails — verarbeitete/notified Events bleiben unsichtbar", q3 === 0 && state.email_queue.length === 2, `q3=${q3} queue=${state.email_queue.length}`);

  console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error("FEHLER:", e); process.exit(1); });
