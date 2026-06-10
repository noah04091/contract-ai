/**
 * READ-ONLY Analyse: Wie stark driftet der MongoDB-Datums-FILTER vom Badge
 * (calculateSmartStatusBackend) ab? Quantifiziert pro Eimer. SCHREIBT NICHTS.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

// --- Badge-Logik (calculateSmartStatusBackend, inkl. Override-Prio 2.5) ---
function smartStatus(c) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (c.documentCategory === 'cancellation_confirmation' || c.gekuendigtZum) {
    const d = c.gekuendigtZum ? new Date(c.gekuendigtZum) : null;
    if (d) { d.setHours(0,0,0,0); return d < today ? 'Beendet' : 'Gekündigt'; }
    return 'Gekündigt';
  }
  if (c.status === 'gekündigt' || c.cancellationId) return c.cancellationConfirmed ? 'Gekündigt ✓' : 'Gekündigt — offen';
  if (c.documentCategory === 'invoice') return c.paymentStatus === 'paid' ? 'Bezahlt' : 'Offen';
  if (c.statusOverride && c.status) {
    const s = c.status.toLowerCase();
    if (['aktiv','gültig','laufend','active'].includes(s)) return 'Aktiv';
    if (s === 'gekündigt' || s === 'gekuendigt') return 'Gekündigt';
    if (['beendet','abgelaufen','expired'].includes(s)) return 'Beendet';
    if (['läuft ab','bald fällig','bald_ablaufend'].includes(s)) return 'Läuft ab';
    if (s === 'pausiert') return 'Pausiert';
    if (['entwurf','draft'].includes(s)) return 'Entwurf';
    return 'Aktiv';
  }
  const exp = c.expiryDate ? new Date(c.expiryDate) : null;
  if (exp && !isNaN(exp.getTime())) {
    exp.setHours(0,0,0,0);
    const days = Math.ceil((exp - today) / 86400000);
    if (days < 0) {
      const cr = c.createdAt ? new Date(c.createdAt) : null;
      const since = cr ? Math.ceil((today - cr) / 86400000) : 999;
      if (since <= 14 && days < -60) return 'Aktiv';
      return 'Beendet';
    }
    if (days <= 30) return 'Läuft ab';
    return 'Aktiv';
  }
  if (c.status) {
    const s = c.status.toLowerCase();
    if (['aktiv','gültig','laufend'].includes(s)) return 'Aktiv';
    if (s === 'gekündigt') return 'Gekündigt';
    if (['beendet','abgelaufen','expired'].includes(s)) return 'Beendet';
    if (['läuft ab','bald fällig'].includes(s)) return 'Läuft ab';
    if (s === 'pausiert') return 'Pausiert';
    if (['entwurf','draft'].includes(s)) return 'Entwurf';
  }
  if (c.isGenerated) return 'Entwurf';
  if (c.isOptimized) return 'Optimiert';
  if (!c.analyzed && !c.contractScore) return 'Neu';
  return 'Aktiv';
}
// Badge → Eimer
function smartBucket(c) {
  const s = smartStatus(c);
  if (s === 'Aktiv') return 'aktiv';
  if (s === 'Läuft ab') return 'bald_ablaufend';
  if (s === 'Beendet') return 'abgelaufen';
  if (s.startsWith('Gekündigt')) return 'gekündigt';
  return '(kein Filter-Eimer: ' + s + ')';
}

// --- Alter Datums-FILTER, als JS-Prädikate nachgebildet (1:1 zur MongoDB-Query) ---
function oldFilterMatches(c, bucket) {
  const today = new Date(); today.setHours(0,0,0,0);
  const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
  const exp = c.expiryDate ? new Date(c.expiryDate) : null;
  const gz = c.gekuendigtZum ? new Date(c.gekuendigtZum) : null;
  const cat = c.documentCategory;
  const notInvoiceCanc = !cat || !['cancellation_confirmation','invoice'].includes(cat);
  const noGz = !c.gekuendigtZum;
  const noCancId = !c.cancellationId;
  const statusStr = (c.status || '');
  switch (bucket) {
    case 'aktiv':
      return ((exp && exp > in30) || !c.expiryDate)
        && noGz && notInvoiceCanc && noCancId && !/^gekündigt$/i.test(statusStr);
    case 'bald_ablaufend':
      return (((exp && exp >= today && exp <= in30)) || ['läuft ab','Läuft ab','bald fällig','Bald fällig'].includes(statusStr))
        && noGz && notInvoiceCanc && noCancId;
    case 'abgelaufen':
      return (exp && exp < today) || (gz && gz < today);
    case 'gekündigt':
      return cat === 'cancellation_confirmation' || (gz && gz >= today) || statusStr === 'gekündigt' || !!c.cancellationId;
  }
}

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const db = client.db("contract_ai");
    const fields = { name:1, status:1, statusOverride:1, documentCategory:1, gekuendigtZum:1, cancellationId:1, cancellationConfirmed:1, paymentStatus:1, expiryDate:1, createdAt:1, isGenerated:1, isOptimized:1, analyzed:1, contractScore:1 };
    const all = await db.collection("contracts").find({}, { projection: fields }).toArray();

    console.log("\n========= FILTER-DRIFT-ANALYSE (READ-ONLY) =========\n");
    console.log(`Verträge gesamt: ${all.length}\n`);

    const buckets = ['aktiv','bald_ablaufend','abgelaufen','gekündigt'];
    for (const b of buckets) {
      let both=0, oldOnly=0, smartOnly=0;
      const oldOnlyEx=[], smartOnlyEx=[];
      for (const c of all) {
        const inOld = oldFilterMatches(c, b);
        const inSmart = smartBucket(c) === b;
        if (inOld && inSmart) both++;
        else if (inOld && !inSmart) { oldOnly++; if (oldOnlyEx.length<3) oldOnlyEx.push(`${c.name} → Badge: ${smartStatus(c)}`); }
        else if (!inOld && inSmart) { smartOnly++; if (smartOnlyEx.length<3) smartOnlyEx.push(`${c.name} → Badge: ${smartStatus(c)}`); }
      }
      const oldTotal = both+oldOnly, smartTotal = both+smartOnly;
      console.log(`── Eimer "${b}":  alter Filter zeigt ${oldTotal},  Badge sagt ${smartTotal},  übereinstimmend ${both}`);
      if (oldOnly) { console.log(`   ⚠️ ${oldOnly}× nur im alten Filter (Badge sagt was anderes):`); oldOnlyEx.forEach(e=>console.log(`        - ${e}`)); }
      if (smartOnly) { console.log(`   ⚠️ ${smartOnly}× nur laut Badge (alter Filter verpasst sie):`); smartOnlyEx.forEach(e=>console.log(`        - ${e}`)); }
      if (!oldOnly && !smartOnly) console.log(`   ✅ deckungsgleich`);
      console.log("");
    }

    // Mehrfach-Zuordnung im alten Filter (ein Vertrag in mehreren Eimern?)
    let multi=0;
    for (const c of all) {
      const hits = buckets.filter(b => oldFilterMatches(c, b));
      if (hits.length > 1) { if (multi<5) console.log(`   ⓘ Mehrfach im alten Filter: "${c.name}" → [${hits.join(', ')}]  (Badge: ${smartStatus(c)})`); multi++; }
    }
    console.log(`\nVerträge, die der alte Filter in MEHRERE Eimer steckt: ${multi}  (Badge ordnet immer GENAU einem zu)`);
    console.log("\n========= ENDE — keine Schreibvorgänge =========\n");
  } finally {
    await client.close();
  }
})();
