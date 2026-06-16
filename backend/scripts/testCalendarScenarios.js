/**
 * Szenario-Matrix-Test: prüft die KERN-PROZESSE der Event-/Erinnerungs-Erzeugung
 * end-to-end durch generateEventsForContract (Mock-DB, kein GPT/Live).
 * node backend/scripts/testCalendarScenarios.js
 *
 * Deckt ab, WAS/WANN/WO Erinnerungen entstehen:
 *  S1 unbefristet            → KEIN falsches "läuft ab"/Kündigungs-Lifecycle
 *  S2 KI-Stichtage           → korrekte Vorwarn-Staffel (Tage vorher, alle vor dem Termin, nur Zukunft)
 *  S3 gekündigt              → GAR KEINE Events
 *  S4 monatlich wiederkehrend → Anti-Flut (kein Termin, nur UI-Hinweis)
 */
const { generateEventsForContract } = require('../services/calendarEvents');

const mockDb = { collection: () => ({
  findOne: async () => null,
  insertMany: async (d) => ({ insertedCount: d.length }),
  find: () => ({ toArray: async () => [] }),
  deleteMany: async () => ({ deletedCount: 0 }),
}) };

const DAY = 86400000;
const at = (n) => new Date(Date.now() + n * DAY);
const base = (over = {}) => ({
  _id: 'C', userId: 'U', name: 'T.pdf',
  endDateConfidence: 95, dataSource: 'extracted',
  createdAt: at(-10), uploadedAt: at(-10), isAutoRenewal: false, ...over,
});

let pass = 0, fail = 0;
const ok = (n, c, info = '') => { if (c) { pass++; console.log(`  ✅ ${n}`); } else { fail++; console.log(`  ❌ ${n} ${info}`); } };
const types = (evs) => evs.map(e => e.type);
const day = (d) => new Date(d).toISOString().slice(0, 10);

(async () => {
  // ── S1: unbefristet (kein Enddatum) → kein Lifecycle, kein falsches "läuft ab" ──
  console.log('\n=== S1: unbefristet ===');
  const s1 = await generateEventsForContract(mockDb, base({ startDate: at(-30), expiryDate: null, isAutoRenewal: true }));
  ok('keine CANCEL/EXPIRY/AUTO_RENEWAL-Events (kein echtes Enddatum)',
     !s1.some(e => /CANCEL_|CONTRACT_EXPIRY|AUTO_RENEWAL/.test(e.type)), `bekommen: ${types(s1).join(',') || '(0)'}`);

  // ── S2: KI-Stichtage → Vorwarn-Staffel ──
  console.log('\n=== S2: KI-Stichtage → Vorwarn-Erinnerungen ===');
  const end = at(200), start = at(150);
  const s2 = await generateEventsForContract(mockDb, base({
    startDate: at(-10), expiryDate: null,
    importantDates: [
      { type: 'end_date',   label: 'Vertragsende', date: end.toISOString(),   confidence: 90 },
      { type: 'start_date', label: 'Vertragsbeginn', date: start.toISOString(), confidence: 90 },
    ],
  }));
  const mainEnd = s2.find(e => e.type === 'CONTRACT_END');
  ok('Haupt-Termin CONTRACT_END am Stichtag', !!mainEnd && day(mainEnd.date) === day(end));
  const endRems = s2.filter(e => /CONTRACT_END_REMINDER_\d+D/.test(e.type));
  ok('CONTRACT_END hat Vorwarnungen (30 & 7 Tage vorher dabei)',
     endRems.some(e => e.metadata.daysUntil === 30) && endRems.some(e => e.metadata.daysUntil === 7),
     `Stufen: ${endRems.map(e => e.metadata.daysUntil).join('/')}`);
  ok('jede Vorwarnung liegt VOR dem Termin (Datum = Stichtag − Tage)',
     endRems.every(e => { const t = new Date(e.date); t.setDate(t.getDate() + e.metadata.daysUntil); return day(t) === day(end); }));
  ok('alle Vorwarnungen in der Zukunft (keine vergangenen)', endRems.every(e => new Date(e.date) > new Date()));
  const startRem = s2.filter(e => /CONTRACT_START_REMINDER_\d+D/.test(e.type));
  ok('Vertragsbeginn (Info) hat 7-Tage-Vorwarnung', startRem.some(e => e.metadata.daysUntil === 7));

  // ── S3: gekündigt → keine Events ──
  console.log('\n=== S3: gekündigter Vertrag ===');
  const s3 = await generateEventsForContract(mockDb, base({ startDate: at(-30), expiryDate: at(300), status: 'gekündigt' }));
  ok('GAR KEINE Events bei gekündigtem Vertrag', s3.length === 0, `bekommen: ${s3.length}`);

  // ── S4: monatlich wiederkehrende Frist → Anti-Flut ──
  console.log('\n=== S4: monatlich wiederkehrende Kündigungsfrist ===');
  const s4 = await generateEventsForContract(mockDb, base({
    startDate: at(-10), expiryDate: null,
    fristHinweise: [{ type: 'kuendigungsfrist', actionable: true, title: 'Monatlich kündbar',
      recurrencePattern: { intervalType: 'monthly', intervalCount: 1 } }],
  }));
  ok('keine Termin-Flut (monatlich = Dauerzustand → 0 Events)', s4.length === 0, `bekommen: ${types(s4).join(',') || '(0)'}`);

  console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });
