// READ-ONLY: Analysiert die Dopplungen (Problem B) — gleiche-Tag-Meilenstein-Cluster.
// Zeigt Typ-Kombinationen + ob die Cluster-Mitglieder Vorwarnungs-Kinder haben.
// Damit der Merge (welches Event bleibt, was passiert mit Vorwarnungen) sicher designt wird.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const database = require('../config/database');

// Semantische Gruppen: nur INNERHALB einer Gruppe am selben Tag = synonym → mergebar.
const ENDE = ['CONTRACT_EXPIRY','CONTRACT_END','AUTO_RENEWAL','MINIMUM_TERM_END','REMAINING_TIME_END',
  'LEASE_END','INSURANCE_END','LOAN_END','TRIAL_END','LICENSE_EXPIRY'];
const START = ['CONTRACT_START','SERVICE_START'];
const groupOf = (t) => ENDE.includes(t) ? 'ENDE' : START.includes(t) ? 'START' : null;

const isReminder = (e) =>
  /_REMINDER_\d+D$/i.test(e.type || '') ||
  /\d+\s*(?:Tage?|Wochen?|Monate?)\s*vorher/i.test(e.title || '');
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

(async () => {
  const db = await database.connect();
  const now = new Date();
  const events = await db.collection('contract_events').find({ status:'scheduled', date:{$gt:now} }).toArray();

  const byContract = new Map();
  for (const e of events) { (byContract.get(String(e.contractId)) || byContract.set(String(e.contractId),[]).get(String(e.contractId))).push(e); }

  const comboCount = {};        // "CONTRACT_END+CONTRACT_EXPIRY" -> n
  const childByType = {};       // type -> {withChildren, total} (haben Vorwarnungen?)
  let clusterCount = 0, mergeableExtra = 0;
  const examples = [];

  for (const [cid, evs] of byContract) {
    const mains = evs.filter(e => !isReminder(e));
    const reminders = evs.filter(e => isReminder(e));
    const childCountFor = (e) => reminders.filter(r => r.metadata?.originalEvent === e.type).length;

    // pro Tag + Gruppe
    const byDayGroup = {};
    for (const e of mains) {
      const g = groupOf(e.type); if (!g) continue;
      (byDayGroup[`${dayKey(e.date)}|${g}`] ||= []).push(e);
    }
    for (const [key, list] of Object.entries(byDayGroup)) {
      childByType; // noop
      for (const e of list) {
        childByType[e.type] ||= { withChildren: 0, total: 0 };
        childByType[e.type].total++;
        if (childCountFor(e) > 0) childByType[e.type].withChildren++;
      }
      if (list.length >= 2) {
        clusterCount++; mergeableExtra += list.length - 1;
        const combo = list.map(e=>e.type).sort().join('+');
        comboCount[combo] = (comboCount[combo]||0)+1;
        if (examples.length < 10) {
          examples.push(`  ${key.split('|')[0]} [${key.split('|')[1]}] ${list.map(e=>`${e.type}(${childCountFor(e)}🔔)`).join(' + ')}`);
        }
      }
    }
  }

  console.log('\n================ DOPPLUNGS-ANALYSE (Problem B, READ-ONLY) ================');
  console.log(`Cluster (≥2 synonyme Meilensteine am selben Tag): ${clusterCount}`);
  console.log(`Einträge, die durch Merge wegfielen: ${mergeableExtra}\n`);

  console.log('—— Typ-Kombinationen (wie oft) ——');
  Object.entries(comboCount).sort((a,b)=>b[1]-a[1]).forEach(([c,n]) => console.log(`  ${n}×  ${c}`));

  console.log('\n—— Haben diese Typen Vorwarnungen (Kinder)? ——');
  Object.entries(childByType).sort((a,b)=>b[1].total-a[1].total).forEach(([t,s]) =>
    console.log(`  ${t.padEnd(20)} ${s.withChildren}/${s.total} mit Vorwarnungen`));

  console.log('\n—— Beispiel-Cluster (Typ(AnzahlVorwarnungen)) ——');
  examples.forEach(x => console.log(x));
  console.log('\n================ ENDE (nichts geändert) ================\n');
  process.exit(0);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });
