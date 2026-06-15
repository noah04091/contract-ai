/**
 * Integrationstest (TÜV-Fund C): Kündigungs-Lifecycle nur bei echtem Grund.
 * node backend/scripts/testCancelLifecycleGate.js
 * Mock-DB, kein echter DB-Zugriff. Ruft generateEventsForContract real auf und prüft das
 * erzeugte Event-Set. Beweist: auslaufender Festvertrag OHNE Kündigungs-/Verlängerungs-Grund
 * bekommt KEINE CANCEL-Events (aber weiter CONTRACT_EXPIRY "läuft ab"); Auto-Renewal + echte
 * Kündigungsfrist bekommen sie weiter; kein falsches "verlängert sich" bei Nicht-Verlängerern.
 */
const { generateEventsForContract } = require('../services/calendarEvents');

const mockDb = {
  collection: () => ({
    findOne: async () => null,
    insertMany: async (docs) => ({ insertedCount: docs.length }),
    find: () => ({ toArray: async () => [] }),
    deleteMany: async () => ({ deletedCount: 0 }),
  }),
};

const DAY = 86400000;
const inDays = (n) => new Date(Date.now() + n * DAY);
const CANCEL_TYPES = ['CANCEL_WINDOW_OPEN', 'LAST_CANCEL_DAY', 'CANCEL_WARNING'];

// Basis: gültiges Zukunfts-Enddatum (~2 Jahre), Start in der Vergangenheit, hohe Konfidenz.
const baseContract = (over = {}) => ({
  _id: 'c1', userId: 'u1', name: 'Test_Festvertrag.pdf',
  startDate: inDays(-30), expiryDate: inDays(730),
  endDateConfidence: 95, dataSource: 'extracted',
  createdAt: inDays(-30), uploadedAt: inDays(-30),
  isAutoRenewal: false,
  ...over,
});

let pass = 0, fail = 0;
const ok = (name, cond, info = '') => { if (cond) { pass++; console.log(`  ✅ ${name}`); } else { fail++; console.log(`  ❌ ${name} ${info}`); } };
const hasType = (evs, t) => evs.some(e => e.type === t);

(async () => {
  // ── Fall 1: Festvertrag, KEIN Auto-Renewal, KEINE Kündigungsfrist → keine CANCEL-Events ──
  const f1 = await generateEventsForContract(mockDb, baseContract());
  console.log('\n=== Fall 1: auslaufender Festvertrag ohne Grund ===');
  ok('keine CANCEL_WINDOW_OPEN/LAST_CANCEL_DAY/CANCEL_WARNING', CANCEL_TYPES.every(t => !hasType(f1, t)),
     `bekommen: ${f1.map(e => e.type).join(',')}`);
  ok('aber CONTRACT_EXPIRY ("läuft ab") bleibt', hasType(f1, 'CONTRACT_EXPIRY'));

  // ── Fall 2: Auto-Renewal → CANCEL-Trio bleibt ──
  const f2 = await generateEventsForContract(mockDb, baseContract({ isAutoRenewal: true, autoRenewMonths: 12 }));
  console.log('\n=== Fall 2: Auto-Renewal-Vertrag ===');
  ok('CANCEL_WINDOW_OPEN + LAST_CANCEL_DAY vorhanden', hasType(f2, 'CANCEL_WINDOW_OPEN') && hasType(f2, 'LAST_CANCEL_DAY'));
  const lcd2 = f2.find(e => e.type === 'LAST_CANCEL_DAY');
  ok('Auto-Renewal-Text nennt "verlängert sich automatisch"', !!lcd2 && /verlängert sich.*automatisch/i.test(lcd2.description));

  // ── Fall 3: echte Kündigungsfrist, KEIN Auto-Renewal → CANCEL da, aber kein "verlängert sich" ──
  const f3 = await generateEventsForContract(mockDb, baseContract({ cancellationPeriod: { inDays: 90 } }));
  console.log('\n=== Fall 3: Festvertrag MIT echter Kündigungsfrist ===');
  ok('CANCEL_WINDOW_OPEN + LAST_CANCEL_DAY vorhanden', hasType(f3, 'CANCEL_WINDOW_OPEN') && hasType(f3, 'LAST_CANCEL_DAY'));
  const lcd3 = f3.find(e => e.type === 'LAST_CANCEL_DAY');
  ok('KEIN falsches "verlängert sich" im Text (Nicht-Verlängerer)', !!lcd3 && !/verlängert sich/i.test(lcd3.description),
     `Text: ${lcd3 && lcd3.description}`);

  // ── Fall 4: Kündigungsfrist als String (Quelle contract.kuendigung) → ebenfalls CANCEL ──
  const f4 = await generateEventsForContract(mockDb, baseContract({ kuendigung: '3 Monate zum Laufzeitende' }));
  console.log('\n=== Fall 4: Grund via contract.kuendigung ===');
  ok('CANCEL_WINDOW_OPEN vorhanden (Grund erkannt)', hasType(f4, 'CANCEL_WINDOW_OPEN'));

  console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });
