/**
 * Integrationstest (G1): cleanAndRegenerateAIEvents räumt bei Re-Analyse auch die
 * neu-erzeugbaren Lifecycle-Events auf → keine Geister-Termine auf altem Datum,
 * aber manuelle / ausgeblendete / Kündigungs-Nachfrage / erledigte Termine überleben.
 * node backend/scripts/testCleanupRegenLifecycle.js
 *
 * Nutzt eine echte In-Memory-Mock-Collection (deleteMany/insertMany/findOne filtern wirklich).
 */
const { cleanAndRegenerateAIEvents } = require('../services/calendarEvents');

// ── Mini Mongo-Query-Matcher (nur die genutzten Operatoren) ──
const eq = (a, b) => (a instanceof Date && b instanceof Date) ? a.getTime() === b.getTime() : a === b;
const getPath = (doc, path) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), doc);
function matchVal(v, cond) {
  if (cond && typeof cond === 'object' && !(cond instanceof Date)) {
    if ('$ne' in cond) return !eq(v, cond.$ne);
    if ('$in' in cond) return cond.$in.some(x => eq(v, x));
  }
  return eq(v, cond);
}
function matchQuery(doc, q) {
  for (const [k, v] of Object.entries(q)) {
    if (k === '$or') { if (!v.some(sub => matchQuery(doc, sub))) return false; continue; }
    if (!matchVal(getPath(doc, k), v)) return false;
  }
  return true;
}

const DAY = 86400000;
const d = (n) => new Date(Date.now() + n * DAY);
const oldExpiry = d(400);
const newExpiry = d(800);

// Zustand VOR der Re-Analyse (für das alte Enddatum erzeugt) + geschützte Events:
const seed = () => [
  { _id: 'g1', contractId: 'C1', type: 'CANCEL_WINDOW_OPEN', date: d(280), status: 'scheduled', dataSource: 'unknown' }, // Geist
  { _id: 'g2', contractId: 'C1', type: 'LAST_CANCEL_DAY',   date: d(310), status: 'scheduled', dataSource: 'unknown' }, // Geist
  { _id: 'g3', contractId: 'C1', type: 'CONTRACT_EXPIRY',   date: oldExpiry, status: 'scheduled', dataSource: 'unknown' }, // Geist
  { _id: 'g4', contractId: 'C1', type: 'CONTRACT_END',      date: oldExpiry, status: 'scheduled', dataSource: 'ai_extracted', metadata: { aiExtracted: true } }, // KI → weg (Altpfad)
  { _id: 'm1', contractId: 'C1', type: 'CUSTOM',            date: d(120), status: 'scheduled', isManual: true }, // manuell → bleibt
  { _id: 'x1', contractId: 'C1', type: 'CANCEL_WINDOW_OPEN', date: d(50), status: 'dismissed', dataSource: 'unknown' }, // ausgeblendet → bleibt
  { _id: 'cc', contractId: 'C1', type: 'CANCELLATION_CONFIRMATION_CHECK', date: d(14), status: 'scheduled', dataSource: 'unknown' }, // Nachfrage → bleibt
  { _id: 'cp', contractId: 'C1', type: 'LAST_CANCEL_DAY',   date: d(-30), status: 'completed', dataSource: 'unknown' }, // erledigt → bleibt
];

let store = seed();
const col = {
  deleteMany: async (q) => { const b = store.length; store = store.filter(doc => !matchQuery(doc, q)); return { deletedCount: b - store.length }; },
  findOne: async (q) => store.find(doc => matchQuery(doc, q)) || null,
  insertMany: async (docs) => { store.push(...docs); return { insertedCount: docs.length }; },
  find: () => ({ toArray: async () => store.slice() }),
};
const mockDb = { collection: () => col };

const contract = {
  _id: 'C1', userId: 'U1', name: 'Test_ReAnalyse.pdf',
  startDate: d(-30), expiryDate: newExpiry,      // ← NEUES Enddatum
  isAutoRenewal: true, autoRenewMonths: 12,
  endDateConfidence: 95, dataSource: 'extracted',
  createdAt: d(-30), uploadedAt: d(-30),
};

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  ❌ ${name} ${info}`); } };
const has = (pred) => store.some(pred);
const sameDay = (a, b) => new Date(a).toISOString().slice(0, 10) === new Date(b).toISOString().slice(0, 10);

(async () => {
  await cleanAndRegenerateAIEvents(mockDb, contract);

  console.log('\n=== G1: Re-Analyse mit geändertem Enddatum ===');
  // Geister-Termine auf ALTEM Datum müssen weg sein:
  ok('alter CONTRACT_EXPIRY @ altes Datum WEG',
     !has(e => e.type === 'CONTRACT_EXPIRY' && sameDay(e.date, oldExpiry)));
  ok('alter LAST_CANCEL_DAY (scheduled) @ +310 WEG',
     !has(e => e._id === 'g2'));
  ok('alter CANCEL_WINDOW_OPEN (scheduled) @ +280 WEG',
     !has(e => e._id === 'g1'));
  ok('alter KI-CONTRACT_END @ altes Datum WEG (Altpfad)',
     !has(e => e._id === 'g4'));

  // Neue Lifecycle-Events am NEUEN Datum müssen da sein:
  // (Bei Auto-Renewal fasst der Problem-B-Dedupe CONTRACT_EXPIRY + AUTO_RENEWAL am selben Tag
  //  zusammen → behält AUTO_RENEWAL. Daher: irgendein Ende-Event am neuen Datum.)
  ok('neues Ende-Event (CONTRACT_EXPIRY/AUTO_RENEWAL/CONTRACT_END) @ neues Datum DA',
     has(e => ['CONTRACT_EXPIRY', 'AUTO_RENEWAL', 'CONTRACT_END'].includes(e.type) && sameDay(e.date, newExpiry)));
  ok('neuer LAST_CANCEL_DAY (am neuen Enddatum − Frist) DA',
     has(e => e.type === 'LAST_CANCEL_DAY' && new Date(e.date) > d(600)));

  // Geschützte Events müssen ÜBERLEBEN:
  ok('manuelles Event bleibt', has(e => e._id === 'm1'));
  ok('ausgeblendetes (dismissed) Event bleibt', has(e => e._id === 'x1'));
  ok('Kündigungs-Nachfrage (CONFIRMATION_CHECK) bleibt', has(e => e._id === 'cc'));
  ok('erledigtes (completed) Lifecycle-Event bleibt', has(e => e._id === 'cp'));

  console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });
