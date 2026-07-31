/**
 * TÜV Paket A (31.07.2026) — Beweis-Tests für die Zuverlässigkeits-Fixes.
 * node backend/scripts/testTuevPaketA.js
 *
 * A) LAST_CANCEL_DAY-Mail: "verlängert sich automatisch" NUR noch bei isAutoRenewal=true
 *    (vorher unbedingt → falsche Rechtsauskunft bei Fixverträgen).
 * B) NaN-Landmine: REMINDER_LOOKAHEAD_DAYS="sieben" darf den Versand NICHT mehr stoppen
 *    (vorher: Invalid-Date-Fenster → 0 Events gefunden, lautlos).
 * C) reapStuckQueuedEvents (Schalter-Funktion, Standard AUS): löst hängende queued-Events
 *    statusEHRLICH auf — sent-Mail→notified, aktive Mail→unangetastet, Vergangenheit→expired,
 *    Zukunft→scheduled; frische queued (<48h) bleiben unberührt.
 *
 * Kein dotenv, kein SMTP (processEmailQueue im Modul-Cache neutralisiert).
 */
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-paket-a";

const { ObjectId } = require("mongodb");

const emailRetryService = require("../services/emailRetryService");
emailRetryService.processEmailQueue = async () => ({ processed: 0, sent: 0, retrying: 0, failed: 0 });

const { checkAndSendNotifications, __render } = require("../services/calendarNotifier");
const { reapStuckQueuedEvents } = require("../services/calendarEvents");

let pass = 0, fail = 0;
const ok = (n, c, info = "") => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n} ${info}`); } };

// ─── Mini-Mongo (identisch zum bewährten Harness aus testReminderSecondRun.js) ───
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
  console.log("\n════ A) LAST_CANCEL_DAY-Mail: Auto-Renewal-Aussage nur wenn wahr ════");
  const htmlRenews = __render.generateLastCancelDayEmail({ metadata: { contractName: "T", isAutoRenewal: true, autoRenewMonths: 6 } });
  const htmlFixed = __render.generateLastCancelDayEmail({ metadata: { contractName: "T", isAutoRenewal: false } });
  const htmlLegacy = __render.generateLastCancelDayEmail({ metadata: { contractName: "T" } }); // Alt-Event ohne Flag
  ok("Auto-Renewal-Vertrag: 'verlängert sich automatisch um 6 Monate' enthalten", htmlRenews.includes("verlängert sich der Vertrag automatisch") && htmlRenews.includes("6 Monate"));
  ok("Fixvertrag: KEINE Verlängerungs-Behauptung mehr", !htmlFixed.includes("verlängert sich"));
  ok("Fixvertrag: stattdessen ehrlicher Frist-Satz", htmlFixed.includes("nicht mehr möglich"));
  ok("Alt-Event ohne Flag: neutraler Satz (nie falsch)", !htmlLegacy.includes("verlängert sich") && htmlLegacy.includes("nicht mehr möglich"));

  console.log("\n════ B) NaN-Landmine REMINDER_LOOKAHEAD_DAYS ════");
  const todayNoon = new Date(); todayNoon.setHours(12, 0, 0, 0);
  const user = { _id: new ObjectId(), email: "paket-a@example.invalid", subscriptionPlan: "enterprise" };
  const evToday = { _id: new ObjectId(), userId: user._id, contractId: new ObjectId(), type: "LAST_CANCEL_DAY", title: "🔴 LETZTER TAG: T kündigen!", date: todayNoon, status: "scheduled", severity: "critical", metadata: { contractName: "T.pdf", isAutoRenewal: false } };
  const state = { users: [user], contract_events: [evToday], email_queue: [] };
  process.env.REMINDER_LOOKAHEAD_DAYS = "sieben"; // der Landminen-Fall
  const q = await checkAndSendNotifications(makeDb(state));
  delete process.env.REMINDER_LOOKAHEAD_DAYS;
  ok("Trotz kaputter Env wird das heute fällige Event gemailt (Fallback 7)", q === 1 && state.email_queue.length === 1, `q=${q}`);

  console.log("\n════ C) reapStuckQueuedEvents (Schalter-Funktion) ════");
  const now = Date.now();
  const old = new Date(now - 72 * 3600e3), past = new Date(now - 60 * 3600e3), future = new Date(now + 5 * 86400e3);
  const zSent = { _id: new ObjectId(), status: "queued", queuedAt: old, date: past, title: "sent-mail-zombie" };
  const zActive = { _id: new ObjectId(), status: "queued", queuedAt: old, date: past, title: "active-mail" };
  const zPast = { _id: new ObjectId(), status: "queued", queuedAt: old, date: past, title: "past-zombie" };
  const zFuture = { _id: new ObjectId(), status: "queued", queuedAt: old, date: future, title: "future-zombie" };
  const zFresh = { _id: new ObjectId(), status: "queued", queuedAt: new Date(now - 3600e3), date: past, title: "frisch" };
  const sentAt = new Date(now - 71 * 3600e3);
  const st2 = {
    contract_events: [zSent, zActive, zPast, zFuture, zFresh],
    email_queue: [
      { _id: new ObjectId(), eventId: zSent._id.toString(), status: "sent", sentAt },
      { _id: new ObjectId(), eventId: zActive._id.toString(), status: "pending" }
    ]
  };
  const r = await reapStuckQueuedEvents(makeDb(st2), 48);
  ok("Gesendete-Mail-Zombie → notified (mit echtem Sendezeitpunkt)", zSent.status === "notified" && String(zSent.notifiedAt) === String(sentAt));
  ok("Aktive-Mail-Event bleibt unangetastet (Zustellung läuft)", zActive.status === "queued");
  ok("Vergangenheits-Zombie ohne Mail → expired", zPast.status === "expired");
  ok("Zukunfts-Zombie ohne Mail → zurück auf scheduled (queuedAt entfernt)", zFuture.status === "scheduled" && !("queuedAt" in zFuture));
  ok("Frisch geclaimtes Event (<48h) bleibt unberührt", zFresh.status === "queued");
  ok("Report-Zahlen stimmen", r.checked === 4 && r.notified === 1 && r.expired === 1 && r.rescheduled === 1 && r.activeMail === 1, JSON.stringify(r));

  console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error("FEHLER:", e); process.exit(1); });
