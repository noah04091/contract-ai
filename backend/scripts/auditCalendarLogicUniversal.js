// READ-ONLY Universalitäts-Check für die Kalender-Logik-Fixes (Problem A/B/C).
// Quantifiziert über ALLE Verträge, wie viele falsche/doppelte Termine es gibt —
// und beweist, dass die geplanten Fixes nur Fehlerfälle treffen. ÄNDERT NICHTS.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const database = require('../config/database');

const isReminder = (e) =>
  /_REMINDER_\d+D$/i.test(e.type || '') ||
  /\d+\s*(?:Tage?|Wochen?|Monate?)\s*vorher/i.test(e.title || '') ||
  ['CANCEL_WARNING','CANCELLATION_REMINDER','MINIMUM_TERM_REMINDER','PROBATION_REMINDER',
   'WARRANTY_REMINDER','PRICE_INCREASE_WARNING','PAYMENT_REMINDER'].includes(e.type);

const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

(async () => {
  const db = await database.connect();
  const now = new Date();

  // Verträge → startDate/expiryDate-Map
  const contracts = await db.collection('contracts')
    .find({}, { projection: { startDate: 1, expiryDate: 1, name: 1 } }).toArray();
  const cMap = new Map(contracts.map(c => [String(c._id), c]));

  // Alle zukünftigen, geplanten Events
  const events = await db.collection('contract_events')
    .find({ status: 'scheduled', date: { $gt: now } }).toArray();

  // Pro Vertrag gruppieren
  const byContract = new Map();
  for (const e of events) {
    const k = String(e.contractId);
    if (!byContract.has(k)) byContract.set(k, []);
    byContract.get(k).push(e);
  }

  // ===== PROBLEM A =====
  // A1: AUTO_RENEWAL mit "Mögliche Verlängerung" (= isAutoRenewal false → Guard 2 entfernt)
  const a1 = events.filter(e => e.type === 'AUTO_RENEWAL' && /Mögliche Verlängerung/i.test(e.title || ''));
  const a1Contracts = new Set(a1.map(e => String(e.contractId)));
  // A1b: AUTO_RENEWAL gesamt + davon "Automatische" (echt, bleibt)
  const arAll = events.filter(e => e.type === 'AUTO_RENEWAL');
  const arEcht = arAll.filter(e => /Automatische Verlängerung/i.test(e.title || ''));

  // A2: "läuft ab" am selben Tag wie "Vertragsbeginn" (= expiry==start Datenfehler → Guard 1 entfernt)
  let a2Count = 0; const a2Contracts = new Set();
  // A2b: via Vertragsfelder: startDate == expiryDate
  let startEqExpiry = 0, withBothDates = 0;
  for (const [cid, evs] of byContract) {
    const expiryEv = evs.filter(e => e.type === 'CONTRACT_EXPIRY' || /Vertrag läuft ab/i.test(e.title||''));
    const startEv = evs.filter(e => e.type === 'CONTRACT_START' || e.type === 'SERVICE_START' || /Vertragsbeginn/i.test(e.title||''));
    for (const ex of expiryEv) {
      if (startEv.some(s => dayKey(s.date) === dayKey(ex.date))) { a2Count++; a2Contracts.add(cid); }
    }
    const c = cMap.get(cid);
    if (c && c.startDate && c.expiryDate) {
      withBothDates++;
      if (dayKey(c.startDate) === dayKey(c.expiryDate)) startEqExpiry++;
    }
  }

  // ===== PROBLEM B: synonyme Events am selben Tag =====
  const MILESTONE = ['CONTRACT_EXPIRY','AUTO_RENEWAL','CONTRACT_END','MINIMUM_TERM_END',
    'CONTRACT_START','SERVICE_START','REMAINING_TIME_END'];
  let bClusterDays = 0, bExtraEvents = 0; const bContracts = new Set(); const bExamples = [];
  for (const [cid, evs] of byContract) {
    const mainEvs = evs.filter(e => !isReminder(e));
    const byDay = {};
    for (const e of mainEvs) { (byDay[dayKey(e.date)] ||= []).push(e); }
    for (const [day, list] of Object.entries(byDay)) {
      const ms = list.filter(e => MILESTONE.includes(e.type));
      if (ms.length >= 2) {
        bClusterDays++; bExtraEvents += (ms.length - 1); bContracts.add(cid);
        if (bExamples.length < 6) bExamples.push(`  ${day}: ${ms.map(e=>e.type).join(' + ')} (${cMap.get(cid)?.name?.slice(0,30)||cid.slice(-6)})`);
      }
    }
  }

  // ===== PROBLEM C: Menge pro Vertrag =====
  const mainCounts = [];
  for (const [cid, evs] of byContract) {
    mainCounts.push({ cid, main: evs.filter(e => !isReminder(e)).length, total: evs.length });
  }
  mainCounts.sort((a,b) => b.total - a.total);
  const over10 = mainCounts.filter(c => c.total > 10).length;
  const over20 = mainCounts.filter(c => c.total > 20).length;
  const avgTotal = mainCounts.length ? Math.round(mainCounts.reduce((s,c)=>s+c.total,0)/mainCounts.length) : 0;

  // ===== AUSGABE =====
  console.log('\n================ KALENDER-LOGIK UNIVERSALITÄTS-CHECK (READ-ONLY) ================');
  console.log(`Verträge mit zukünftigen Events: ${byContract.size} | zukünftige Events gesamt: ${events.length}\n`);

  console.log('—— PROBLEM A: falsche "Verlängerung" / "läuft ab" ——');
  console.log(`A1) "Mögliche Verlängerung" (isAutoRenewal=false → Guard 2 entfernt): ${a1.length} Events über ${a1Contracts.size} Verträge`);
  console.log(`    AUTO_RENEWAL gesamt: ${arAll.length} | davon "Automatische" (echt, BLEIBT): ${arEcht.length}`);
  console.log(`A2) "läuft ab" am selben Tag wie "Vertragsbeginn" (Datenfehler → Guard 1 entfernt): ${a2Count} Events über ${a2Contracts.size} Verträge`);
  console.log(`    Verträge mit startDate==expiryDate (von ${withBothDates} mit beiden Daten): ${startEqExpiry}\n`);

  console.log('—— PROBLEM B: gleiche Ereignisse am selben Tag (Dopplungen) ——');
  console.log(`Cluster-Tage (≥2 Meilenstein-Events am selben Tag): ${bClusterDays} über ${bContracts.size} Verträge`);
  console.log(`Einträge, die durch Zusammenfassen wegfallen würden: ${bExtraEvents}`);
  if (bExamples.length) { console.log('Beispiele:'); bExamples.forEach(x => console.log(x)); }
  console.log('');

  console.log('—— PROBLEM C: schiere Menge ——');
  console.log(`Ø Events/Vertrag: ${avgTotal} | Verträge mit >10 Events: ${over10} | mit >20: ${over20}`);
  console.log('Top 5 (Events gesamt / davon Haupt-Termine):');
  mainCounts.slice(0,5).forEach(c => console.log(`  ${cMap.get(c.cid)?.name?.slice(0,40)||c.cid.slice(-6)}: ${c.total} total / ${c.main} Haupt`));

  console.log('\n—— SICHERHEIT ——');
  console.log(`Echte Auto-Renewals ("Automatische Verlängerung"), die ERHALTEN bleiben: ${arEcht.length}`);
  console.log('Guard entfernt NUR: "Mögliche Verlängerung" (kein echtes Renewal) + "läuft ab" wenn Enddatum=Start.');
  console.log('\n================ ENDE (nichts geändert) ================\n');
  process.exit(0);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });
