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

  // ── S5: Arbeitsvertrag mit KI-Probezeit-Ende → KEINE berechnete Dopplung ──
  console.log('\n=== S5: Probezeit-Ende (KI vorhanden → kein berechnetes Duplikat) ===');
  const probEnd = at(150);
  const s5 = await generateEventsForContract(mockDb, base({
    name: 'Arbeitsvertrag_X.pdf', startDate: at(-30), expiryDate: null,
    importantDates: [{ type: 'probation_end', label: 'Ende der Probezeit', date: probEnd.toISOString(), confidence: 100 }],
  }));
  const probEnds = s5.filter(e => e.type === 'PROBATION_END');
  ok('genau EIN PROBATION_END (kein Start+6Mon-Duplikat)', probEnds.length === 1, `bekommen: ${probEnds.length} @ ${probEnds.map(e=>day(e.date)).join(',')}`);
  ok('das bleibende PROBATION_END ist das KI-Datum', !!probEnds[0] && day(probEnds[0].date) === day(probEnd));
  ok('kein verwaister Block-A "PROBATION_REMINDER"', !s5.some(e => e.type === 'PROBATION_REMINDER'));

  // ── S6: Miet-Jubiläum zeigt NIE "0 Jahre" ──
  console.log('\n=== S6: Miet-Jubiläum nie "0 Jahre" ===');
  const s6 = await generateEventsForContract(mockDb, base({ name: 'Mietvertrag_Y.pdf', startDate: at(-30), expiryDate: null }));
  ok('Normalfall: kein Titel mit "0 Jahre"', !s6.some(e => /0 Jahre/.test(e.title || '')), `Titel: ${s6.map(e=>e.title).join(' | ')}`);
  const s6b = await generateEventsForContract(mockDb, base({ name: 'Mietvertrag_Z.pdf', startDate: at(400), expiryDate: null }));
  ok('auch bei Zukunfts-/Fehlstart kein "0 Jahre"', !s6b.some(e => /0 Jahre/.test(e.title || '')), `Titel: ${s6b.map(e=>e.title).join(' | ')}`);

  console.log(`\n──────── Ergebnis: ${pass} bestanden, ${fail} fehlgeschlagen ────────`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });
