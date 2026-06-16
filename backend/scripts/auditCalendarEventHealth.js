/**
 * READ-ONLY Audit des LIVE Event-Bestands (contract_events) gegen unsere Fix-Muster.
 * KEIN Schreibzugriff — nur find()/Zählen. node backend/scripts/auditCalendarEventHealth.js
 *
 * Prüft pro Vertrag (zukünftige, scheduled Events):
 *  A) Fund-C-Verstoß:  CANCEL_*-Events, obwohl Vertrag NICHT auto-renewal UND keine cancellationPeriod
 *  B) läuft-ab ohne Enddatum: Lifecycle-Events, obwohl kein gültiges expiryDate (>Start)
 *  C) Geister/Dopplung: gleicher End-/Kündigungs-Typ mit ≥2 Events an VERSCHIEDENEN Tagen
 *  D) verwaiste Events:  Event verweist auf nicht-existenten Vertrag (Delete-Cascade-Loch)
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const database = require('../config/database');

const CANCEL = ['CANCEL_WINDOW_OPEN', 'LAST_CANCEL_DAY', 'CANCEL_WARNING'];
const LIFECYCLE = [...CANCEL, 'CONTRACT_EXPIRY', 'AUTO_RENEWAL'];
const END_TYPES = ['CONTRACT_END', 'CONTRACT_EXPIRY', 'AUTO_RENEWAL', 'LAST_CANCEL_DAY', 'CANCEL_WINDOW_OPEN'];
const isReminder = (e) => /_REMINDER_\d+D$/i.test(e.type || '');
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);
const nm = (c) => (c && c.name) ? c.name.slice(0, 42) : '(?)';

(async () => {
  const db = await database.connect();
  const now = new Date();

  const contracts = await db.collection('contracts')
    .find({}, { projection: { name: 1, userId: 1, isAutoRenewal: 1, cancellationPeriod: 1, kuendigung: 1, expiryDate: 1, endDate: 1, startDate: 1, status: 1 } })
    .toArray();
  const cMap = new Map(contracts.map(c => [String(c._id), c]));

  const futureScheduled = await db.collection('contract_events')
    .find({ status: 'scheduled', date: { $gt: now } }).toArray();

  const byContract = new Map();
  for (const e of futureScheduled) {
    const k = String(e.contractId);
    if (!byContract.has(k)) byContract.set(k, []);
    byContract.get(k).push(e);
  }

  const fundC = [], noExpiry = [], ghosts = [], orphans = [];

  for (const [cid, evs] of byContract) {
    const c = cMap.get(cid);
    if (!c) { orphans.push({ cid, n: evs.length }); continue; }
    const mains = evs.filter(e => !isReminder(e));

    const hasCancelReason = !!c.isAutoRenewal || !!c.cancellationPeriod || !!c.kuendigung;
    const cancelEvents = mains.filter(e => CANCEL.includes(e.type));
    if (cancelEvents.length && !hasCancelReason) fundC.push({ c, n: cancelEvents.length });

    const expiry = c.expiryDate || c.endDate;
    const validExpiry = !!expiry && (!c.startDate || new Date(expiry) > new Date(c.startDate));
    const lifecycle = mains.filter(e => LIFECYCLE.includes(e.type));
    if (lifecycle.length && !validExpiry) noExpiry.push({ c, n: lifecycle.length });

    for (const t of END_TYPES) {
      const days = new Set(mains.filter(e => e.type === t).map(e => dayKey(e.date)));
      if (days.size >= 2) ghosts.push({ c, t, days: [...days].sort() });
    }
  }

  const line = (s) => console.log(s);
  line('\n════════ KALENDER-EVENT-GESUNDHEIT (read-only) ════════');
  line(`Verträge gesamt: ${contracts.length} | zukünftige scheduled Events: ${futureScheduled.length} | Verträge mit Events: ${byContract.size}`);

  line(`\nA) 🔴 Fund-C-Verstoß (Kündigungsdruck ohne Grund): ${fundC.length}`);
  fundC.slice(0, 12).forEach(x => line(`   • "${nm(x.c)}" — ${x.n} CANCEL-Events, aber kein Auto-Renewal/Kündigungsfrist`));

  line(`\nB) 🔴 Lifecycle ohne gültiges Enddatum (falsches "läuft ab"): ${noExpiry.length}`);
  noExpiry.slice(0, 12).forEach(x => line(`   • "${nm(x.c)}" — ${x.n} Lifecycle-Events, expiry=${x.c.expiryDate || x.c.endDate || 'null'}`));

  line(`\nC) 🟠 Geister/Dopplung (gleicher Typ, ≥2 verschiedene Tage): ${ghosts.length}`);
  ghosts.slice(0, 15).forEach(x => line(`   • "${nm(x.c)}" — ${x.t} @ ${x.days.join(' + ')}`));

  line(`\nD) 🟠 Verwaiste Events (Vertrag existiert nicht mehr): ${orphans.length} Verträge`);
  const orphanTotal = orphans.reduce((s, o) => s + o.n, 0);
  if (orphans.length) line(`   • betroffene Event-Anzahl: ${orphanTotal}`);

  line('\n════════ FAZIT ════════');
  const clean = fundC.length === 0 && noExpiry.length === 0 && ghosts.length === 0;
  line(clean
    ? '✅ Aktive Event-Logik sauber (A=0, B=0, C=0).' + (orphans.length ? ` ⚠️ Nur verwaiste Events (D=${orphans.length}) — separates Cascade-Thema.` : '')
    : `⚠️ Befunde: A=${fundC.length} B=${noExpiry.length} C=${ghosts.length} D=${orphans.length} — Details oben.`);
  line('(Read-only — nichts verändert.)\n');
  process.exit(0);
})().catch(e => { console.error('FEHLER:', e.message); process.exit(1); });
