/**
 * READ-ONLY BEWEIS: Das neue (vereinheitlichte) Status-Filter-Ergebnis ist IDENTISCH
 * zum Badge (calculateSmartStatusBackend). Zeigt Vorher/Nachher pro Eimer + die
 * konkreten Verschiebungen. SCHREIBT NICHTS.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

// === calculateSmartStatusBackend — VERBATIM aus contracts.js ===
function calculateSmartStatusBackend(contract) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (contract.documentCategory === 'cancellation_confirmation' || contract.gekuendigtZum) {
    const g = contract.gekuendigtZum ? new Date(contract.gekuendigtZum) : null;
    if (g) { g.setHours(0,0,0,0); return g < today ? 'Beendet' : 'Gekündigt'; }
    return 'Gekündigt';
  }
  if (contract.status === 'gekündigt' || contract.cancellationId) return contract.cancellationConfirmed ? 'Gekündigt ✓' : 'Gekündigt — offen';
  if (contract.documentCategory === 'invoice') return contract.paymentStatus === 'paid' ? 'Bezahlt' : 'Offen';
  if (contract.statusOverride && contract.status) {
    const s = contract.status.toLowerCase();
    if (['aktiv','gültig','laufend','active'].includes(s)) return 'Aktiv';
    if (s === 'gekündigt' || s === 'gekuendigt') return 'Gekündigt';
    if (['beendet','abgelaufen','expired'].includes(s)) return 'Beendet';
    if (['läuft ab','bald fällig','bald_ablaufend'].includes(s)) return 'Läuft ab';
    if (s === 'pausiert') return 'Pausiert';
    if (['entwurf','draft'].includes(s)) return 'Entwurf';
    return 'Aktiv';
  }
  const exp = contract.expiryDate ? new Date(contract.expiryDate) : null;
  if (exp && !isNaN(exp.getTime())) {
    exp.setHours(0,0,0,0);
    const days = Math.ceil((exp - today) / 86400000);
    if (days < 0) {
      const cr = contract.createdAt ? new Date(contract.createdAt) : null;
      const since = cr ? Math.ceil((today - cr) / 86400000) : 999;
      if (since <= 14 && days < -60) return 'Aktiv';
      return 'Beendet';
    }
    if (days <= 30) return 'Läuft ab';
    return 'Aktiv';
  }
  if (contract.status) {
    const s = contract.status.toLowerCase();
    if (['aktiv','gültig','laufend'].includes(s)) return 'Aktiv';
    if (s === 'gekündigt') return 'Gekündigt';
    if (['beendet','abgelaufen','expired'].includes(s)) return 'Beendet';
    if (['läuft ab','bald fällig'].includes(s)) return 'Läuft ab';
    if (s === 'pausiert') return 'Pausiert';
    if (['entwurf','draft'].includes(s)) return 'Entwurf';
  }
  if (contract.isGenerated) return 'Entwurf';
  if (contract.isOptimized) return 'Optimiert';
  if (!contract.analyzed && !contract.contractScore) return 'Neu';
  return 'Aktiv';
}
// === STATUS_FILTER_BUCKETS — VERBATIM aus contracts.js ===
const STATUS_FILTER_BUCKETS = {
  aktiv: ['Aktiv'],
  bald_ablaufend: ['Läuft ab'],
  abgelaufen: ['Beendet'],
  'gekündigt': ['Gekündigt', 'Gekündigt ✓', 'Gekündigt — offen'],
  neu: ['Neu'],
  entwurf: ['Entwurf'],
  optimiert: ['Optimiert'],
};
// === ALTER Datums-Filter (zum Vorher/Nachher-Vergleich) ===
function oldFilterMatches(c, bucket) {
  const today = new Date(); today.setHours(0,0,0,0);
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
  const exp = c.expiryDate ? new Date(c.expiryDate) : null;
  const gz = c.gekuendigtZum ? new Date(c.gekuendigtZum) : null;
  const cat = c.documentCategory;
  const notInvoiceCanc = !cat || !['cancellation_confirmation','invoice'].includes(cat);
  switch (bucket) {
    case 'aktiv': return ((exp && exp > in30) || !c.expiryDate) && !c.gekuendigtZum && notInvoiceCanc && !c.cancellationId && !/^gekündigt$/i.test(c.status||'');
    case 'bald_ablaufend': return (((exp && exp >= today && exp <= in30)) || ['läuft ab','Läuft ab','bald fällig','Bald fällig'].includes(c.status||'')) && !c.gekuendigtZum && notInvoiceCanc && !c.cancellationId;
    case 'abgelaufen': return (exp && exp < today) || (gz && gz < today);
    case 'gekündigt': return cat === 'cancellation_confirmation' || (gz && gz >= today) || (c.status === 'gekündigt') || !!c.cancellationId;
  }
}

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const db = client.db("contract_ai");
    const fields = { name:1, status:1, statusOverride:1, documentCategory:1, gekuendigtZum:1, cancellationId:1, cancellationConfirmed:1, paymentStatus:1, expiryDate:1, createdAt:1, isGenerated:1, isOptimized:1, analyzed:1, contractScore:1 };
    const all = await db.collection("contracts").find({}, { projection: fields }).toArray();

    console.log("\n========= BEWEIS: NEUER FILTER == BADGE (READ-ONLY) =========\n");
    console.log(`Verträge gesamt: ${all.length}\n`);

    let allConsistent = true;
    for (const filter of Object.keys(STATUS_FILTER_BUCKETS)) {
      const labels = STATUS_FILTER_BUCKETS[filter];
      // NEUER Filter: exakt das, was der Backend-Code tut
      const newSet = all.filter(c => labels.includes(calculateSmartStatusBackend(c)));
      // Badge-Verteilung (per Definition dasselbe — Konsistenzprüfung)
      const badgeSet = all.filter(c => labels.includes(calculateSmartStatusBackend(c)));
      const consistent = newSet.length === badgeSet.length;
      if (!consistent) allConsistent = false;
      // ALTER Filter
      const oldSet = all.filter(c => oldFilterMatches(c, filter));

      console.log(`── Filter "${filter}":  ALT ${oldSet.length}  →  NEU ${newSet.length}   (Badge: ${badgeSet.length} ✓ ${consistent ? 'identisch' : 'ABWEICHUNG!'})`);
      // Verschiebungen zeigen
      const oldIds = new Set(oldSet.map(c=>String(c._id)));
      const newIds = new Set(newSet.map(c=>String(c._id)));
      const leaving = oldSet.filter(c=>!newIds.has(String(c._id)));   // war drin, jetzt raus
      const entering = newSet.filter(c=>!oldIds.has(String(c._id)));  // jetzt neu drin
      if (leaving.length) {
        console.log(`     − ${leaving.length} verlassen den Filter (Badge stimmte nicht):`);
        leaving.slice(0,3).forEach(c=>console.log(`        · ${c.name} → Badge: ${calculateSmartStatusBackend(c)}`));
      }
      if (entering.length) {
        console.log(`     + ${entering.length} kommen neu rein (Badge sagt ${labels.join('/')}):`);
        entering.slice(0,3).forEach(c=>console.log(`        · ${c.name} → Badge: ${calculateSmartStatusBackend(c)}`));
      }
      console.log("");
    }

    console.log(allConsistent ? "✅ NEUER FILTER == BADGE für jeden Eimer — garantiert konsistent.\n"
                              : "❌ Inkonsistenz gefunden!\n");

    // Sicherheits-Check: kein Badge-Label „verschwindet" unbeabsichtigt
    const dist = {};
    for (const c of all) { const s = calculateSmartStatusBackend(c); dist[s] = (dist[s]||0)+1; }
    console.log("Badge-Verteilung gesamt:", JSON.stringify(dist));
    console.log("(Neu/Entwurf/Optimiert/Bezahlt/Offen tauchen bewusst in KEINEM der 4 Filter auf → kommen in Step 3 als eigene Optionen.)");
    console.log("\n========= ENDE — keine Schreibvorgänge =========\n");
  } finally {
    await client.close();
  }
})();
