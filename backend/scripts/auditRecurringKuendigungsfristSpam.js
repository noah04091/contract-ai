// READ-ONLY: Impact-Zählung für Stufe-1-Cleanup.
// Zählt wiederkehrende Kündigungsfrist-Events (die monatlich mailen), die der
// Cleanup entfernen würde. ÄNDERT NICHTS — nur .find/.countDocuments/.aggregate.
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const database = require('../config/database');

(async () => {
  const db = await database.connect();
  const col = db.collection('contract_events');
  const now = new Date();

  // Der exakte, chirurgische Cleanup-Filter (Teil ②)
  const cleanupFilter = {
    type: 'NOTICE_PERIOD',
    'metadata.source': 'fristHinweis-recurring',
    'metadata.originalType': 'kuendigungsfrist',
    status: 'scheduled',
    date: { $gt: now }
  };

  const total = await col.countDocuments(cleanupFilter);
  const matches = await col.find(cleanupFilter).toArray();

  const contractIds = new Set(matches.map(e => String(e.contractId)));
  const userIds = new Set(matches.map(e => String(e.userId)));

  // Wie viele davon mailen in den nächsten 7 Tagen (akuter Spam)?
  const next7 = matches.filter(e => new Date(e.date) <= new Date(Date.now() + 7 * 86400000)).length;

  // Events pro Vertrag (Verteilung)
  const perContract = {};
  for (const e of matches) { const k = String(e.contractId); perContract[k] = (perContract[k] || 0) + 1; }
  const dist = Object.values(perContract).sort((a, b) => b - a);

  console.log('\n======== STUFE-1 IMPACT (READ-ONLY) ========');
  console.log(`Cleanup-Filter trifft:  ${total} Events`);
  console.log(`Betroffene Verträge:    ${contractIds.size}`);
  console.log(`Betroffene User:        ${userIds.size}`);
  console.log(`Davon mailen in 7 Tagen: ${next7} (akuter Spam)`);
  console.log(`Events pro Vertrag:     [${dist.join(', ')}]`);

  // SICHERHEITS-GEGENPROBE: ohne originalType — fängt der Filter alle recurring-NOTICE_PERIOD?
  const broad = await col.countDocuments({
    type: 'NOTICE_PERIOD', 'metadata.source': 'fristHinweis-recurring',
    status: 'scheduled', date: { $gt: now }
  });
  console.log(`\n[Gegenprobe] recurring-NOTICE_PERIOD gesamt (ohne originalType-Filter): ${broad}`);
  if (broad !== total) {
    console.log(`  ⚠️ Differenz ${broad - total}: recurring-NOTICE_PERIOD ohne originalType=kuendigungsfrist`);
    const others = await col.aggregate([
      { $match: { type: 'NOTICE_PERIOD', 'metadata.source': 'fristHinweis-recurring', status: 'scheduled', date: { $gt: now } } },
      { $group: { _id: '$metadata.originalType', n: { $sum: 1 } } }
    ]).toArray();
    console.log('  originalType-Verteilung:', JSON.stringify(others));
  } else {
    console.log('  ✓ Deckungsgleich — alle recurring-NOTICE_PERIOD sind kuendigungsfrist.');
  }

  // KONTEXT: Wie viele recurring-Events insgesamt (alle Fristtypen)?
  const allRecurring = await col.aggregate([
    { $match: { 'metadata.source': 'fristHinweis-recurring', status: 'scheduled', date: { $gt: now } } },
    { $group: { _id: '$metadata.originalType', n: { $sum: 1 } } }
  ]).toArray();
  console.log('\n[Kontext] ALLE recurring-Events (scheduled, future) nach originalType:', JSON.stringify(allRecurring));

  // FREQUENZ-Aufschlüsselung: was wäre "Flut" (monthly/weekly/biweekly) vs. "sparsam" (quarterly+)?
  const byFreq = await col.aggregate([
    { $match: { 'metadata.source': 'fristHinweis-recurring', status: 'scheduled', date: { $gt: now } } },
    { $group: { _id: { typ: '$metadata.originalType', interval: '$metadata.recurrencePattern.intervalType' }, n: { $sum: 1 }, contracts: { $addToSet: '$contractId' } } },
    { $sort: { n: -1 } }
  ]).toArray();
  console.log('\n[Frequenz] recurring-Events nach (Typ × Intervall):');
  const HIGH = ['weekly', 'biweekly', 'monthly'];
  let floodCount = 0, floodContracts = new Set(), sparseCount = 0;
  for (const g of byFreq) {
    const isFlood = HIGH.includes(g._id.interval);
    if (isFlood) { floodCount += g.n; g.contracts.forEach(c => floodContracts.add(String(c))); } else { sparseCount += g.n; }
    console.log(`  ${isFlood ? '🌊 FLUT ' : '  sparsam'} | ${String(g._id.typ).padEnd(16)} | ${String(g._id.interval).padEnd(12)} | ${g.n} Events, ${g.contracts.length} Vertrag/e`);
  }
  console.log(`\n  → FLUT (monthly/weekly/biweekly): ${floodCount} Events über ${floodContracts.size} Verträge — DIESE würde der Fix entfernen`);
  console.log(`  → sparsam (quarterly+):           ${sparseCount} Events — DIESE blieben erhalten`);

  // Beispiel-Titel (zur Sicht-Kontrolle, was gelöscht würde)
  console.log('\n[Beispiele] erste 5 Treffer:');
  for (const e of matches.slice(0, 5)) {
    console.log(`  ${new Date(e.date).toISOString().slice(0,10)} | "${(e.title||'').slice(0,55)}" | contract=${String(e.contractId).slice(-6)}`);
  }

  console.log('\n======== ENDE (nichts geändert) ========\n');
  process.exit(0);
})().catch(e => { console.error('FEHLER:', e); process.exit(1); });
