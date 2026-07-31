/**
 * TÜV Paket B1 (31.07.2026) — "Später erinnern" darf echte Fristen nie mehr verschieben.
 * node backend/scripts/testSnoozeProtection.js
 *
 * Beweist an applySnooze (services/calendarSnooze.js, von allen 3 Snooze-Pfaden genutzt):
 *  1. Vorwarner/eigene Erinnerungen: Datum wandert wie bisher (Juni-Verhalten erhalten).
 *  2. Echte Frist-Termine (LETZTER TAG, Vertrag läuft ab, Klagefrist, unbekannte Typen):
 *     Datum bleibt UNVERÄNDERT — stattdessen Zusatz-Erinnerung (CUSTOM_REMINDER, custom,
 *     feuert exakt am gewählten Tag, verweist auf Original).
 *  3. Doppelklick-Schutz: gleiche Zusatz-Erinnerung entsteht nur einmal.
 */
const { ObjectId } = require("mongodb");
const { applySnooze, isDateShiftable } = require("../services/calendarSnooze");

let pass = 0, fail = 0;
const ok = (n, c, info = "") => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n} ${info}`); } };

// Mini-Mongo mit Punkt-Pfaden + Date-Gleichheit (Snooze braucht metadata.originEventId + date-Equality)
const getPath = (doc, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[k]), doc);
function eq(a, b) {
  if (a instanceof Date || b instanceof Date) return new Date(a).getTime() === new Date(b).getTime();
  if (a instanceof ObjectId || b instanceof ObjectId) return String(a) === String(b);
  return a === b;
}
function matchValue(docVal, cond) {
  if (cond !== null && typeof cond === "object" && !(cond instanceof Date) && !(cond instanceof ObjectId)) {
    return Object.entries(cond).every(([op, v]) => {
      switch (op) {
        case "$ne": return !eq(docVal, v);
        case "$in": return v.some(x => eq(docVal, x));
        case "$lt": return docVal < v;
        case "$gt": return docVal > v;
        default: throw new Error(`Mock kennt Operator ${op} nicht`);
      }
    });
  }
  return eq(docVal, cond);
}
const matches = (doc, query) => Object.entries(query || {}).every(([k, v]) => matchValue(getPath(doc, k), v));
function makeDb(state) {
  return {
    collection(name) {
      const arr = state[name] || (state[name] = []);
      return {
        async findOne(q) { return arr.find(d => matches(d, q)) || null; },
        async updateOne(f, u) {
          const doc = arr.find(d => matches(d, f));
          if (!doc) return { modifiedCount: 0 };
          if (u.$set) Object.assign(doc, u.$set);
          if (u.$unset) Object.keys(u.$unset).forEach(k => delete doc[k]);
          return { modifiedCount: 1 };
        },
        async insertOne(doc) { const _id = new ObjectId(); arr.push({ _id, ...doc }); return { insertedId: _id }; }
      };
    }
  };
}

(async () => {
  const userId = new ObjectId(), contractId = new ObjectId();
  const in3d = new Date(); in3d.setDate(in3d.getDate() + 3); in3d.setHours(12, 0, 0, 0);

  console.log("\n════ 1) Vorwarner & eigene Termine: Datum wandert (Alt-Verhalten erhalten) ════");
  const rem = { _id: new ObjectId(), userId, contractId, type: "CONTRACT_END_REMINDER_7D", title: "⚠️ 7 Tage vorher: Ende", date: new Date(in3d), status: "scheduled" };
  const st1 = { contract_events: [rem] };
  const r1 = await applySnooze(makeDb(st1), rem, 7);
  ok("Vorwarner: mode=shifted, Datum +7 Tage, status scheduled", r1.mode === "shifted" && rem.date > in3d && rem.status === "scheduled");
  ok("Vorwarner: KEIN Zusatz-Event entstanden", st1.contract_events.length === 1);
  const man = { _id: new ObjectId(), userId, type: "CUSTOM", title: "Eigener Termin", date: new Date(in3d), status: "scheduled", isManual: true };
  const r1b = await applySnooze(makeDb({ contract_events: [man] }), man, 3);
  ok("Manueller Termin: bleibt verschiebbar (eigenes Datum, eigene Wahl)", r1b.mode === "shifted");

  console.log("\n════ 2) Echte Fristen: Datum unantastbar, Zusatz-Erinnerung stattdessen ════");
  for (const type of ["LAST_CANCEL_DAY", "CONTRACT_EXPIRY", "KLAGEFRIST", "IRGENDWAS_NEUES"]) {
    const main = { _id: new ObjectId(), userId, contractId, type, title: `🔴 ${type}: Test kündigen!`, date: new Date(in3d), status: "scheduled", severity: "critical", metadata: { contractName: "Test.pdf" } };
    const st = { contract_events: [main] };
    const r = await applySnooze(makeDb(st), main, 7);
    const extra = st.contract_events.find(e => e.type === "CUSTOM_REMINDER");
    ok(`${type}: Datum UNVERÄNDERT`, new Date(main.date).getTime() === in3d.getTime());
    ok(`${type}: Zusatz-Erinnerung angelegt (custom, mit Original-Verweis)`, r.mode === "extraReminder" && !!extra && extra.metadata.reminderType === "custom" && extra.metadata.originEventId === main._id.toString());
    ok(`${type}: Botschaft nennt beides ehrlich`, r.message.includes("Zusätzliche Erinnerung") && r.message.includes("bleibt am"));
  }

  console.log("\n════ 3) Doppelklick-Schutz ════");
  const main2 = { _id: new ObjectId(), userId, contractId, type: "LAST_CANCEL_DAY", title: "🔴 LETZTER TAG", date: new Date(in3d), status: "scheduled", severity: "critical", metadata: {} };
  const st3 = { contract_events: [main2] };
  const db3 = makeDb(st3);
  await applySnooze(db3, main2, 7);
  await applySnooze(db3, main2, 7);
  ok("Zweimal geklickt → trotzdem nur EINE Zusatz-Erinnerung", st3.contract_events.filter(e => e.type === "CUSTOM_REMINDER").length === 1);

  console.log("\n════ 4) Klassifikator-Stichproben ════");
  ok("_REMINDER_30D verschiebbar", isDateShiftable({ type: "CANCEL_DEADLINE_REMINDER_30D" }));
  ok("CANCELLATION_CONFIRMATION_CHECK verschiebbar (Follow-up)", isDateShiftable({ type: "CANCELLATION_CONFIRMATION_CHECK" }));
  ok("PAYMENT_DUE NICHT verschiebbar (echte Zahlung)", !isDateShiftable({ type: "PAYMENT_DUE" }));
  ok("CANCEL_WARNING NICHT verschiebbar (abgeleiteter Frist-Marker)", !isDateShiftable({ type: "CANCEL_WARNING" }));

  console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error("FEHLER:", e); process.exit(1); });
