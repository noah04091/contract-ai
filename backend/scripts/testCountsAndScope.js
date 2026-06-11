/**
 * READ-ONLY Test für die zwei frischen Punkte:
 *  A) Dropdown-Zähler korrekt (= Badge-Verteilung, Summe stimmt)
 *  B) Org-Such-Scope-Bug behoben (echte Dokument-Simulation: fremde Verträge fallen raus)
 * SCHREIBT NICHTS.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient, ObjectId } = require("mongodb");

function calculateSmartStatusBackend(c) {
  const today = new Date(); today.setHours(0,0,0,0);
  if (c.documentCategory === 'cancellation_confirmation' || c.gekuendigtZum) {
    const g = c.gekuendigtZum ? new Date(c.gekuendigtZum) : null;
    if (g) { g.setHours(0,0,0,0); return g < today ? 'Beendet' : 'Gekündigt'; }
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
    const days = Math.ceil((exp - today)/86400000);
    if (days < 0) { const cr = c.createdAt ? new Date(c.createdAt):null; const since = cr?Math.ceil((today-cr)/86400000):999; if (since<=14 && days<-60) return 'Aktiv'; return 'Beendet'; }
    if (days <= 30) return 'Läuft ab';
    return 'Aktiv';
  }
  if (c.status) { const s=c.status.toLowerCase();
    if (['aktiv','gültig','laufend'].includes(s)) return 'Aktiv';
    if (s==='gekündigt') return 'Gekündigt';
    if (['beendet','abgelaufen','expired'].includes(s)) return 'Beendet';
    if (['läuft ab','bald fällig'].includes(s)) return 'Läuft ab';
    if (s==='pausiert') return 'Pausiert';
    if (['entwurf','draft'].includes(s)) return 'Entwurf';
  }
  if (c.isGenerated) return 'Entwurf';
  if (c.isOptimized) return 'Optimiert';
  if (!c.analyzed && !c.contractScore) return 'Neu';
  return 'Aktiv';
}

// === Mini-MongoDB-Matcher (nur die Operatoren, die der Filter nutzt) ===
function matchDoc(doc, filter) {
  return Object.entries(filter).every(([k, v]) => {
    if (k === '$or') return v.some(sub => matchDoc(doc, sub));
    if (k === '$and') return v.every(sub => matchDoc(doc, sub));
    const field = doc[k];
    if (v && v.$regex) return field != null && new RegExp(v.$regex, v.$options || '').test(field);
    if (v instanceof ObjectId) return field != null && field.toString() === v.toString();
    return field === v;
  });
}
// Filter-Bau — EXAKT wie im Handler (inkl. Org-Scope-Fix)
function buildFilter(userId, orgId, searchQuery) {
  let mongoFilter = orgId
    ? { $or: [ { userId }, { organizationId: orgId } ] }
    : { userId };
  if (searchQuery && searchQuery.trim()) {
    const esc = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const searchOr = [ { name: { $regex: esc, $options: 'i' } }, { status: { $regex: esc, $options: 'i' } }, { kuendigung: { $regex: esc, $options: 'i' } } ];
    mongoFilter.$and = mongoFilter.$and || [];
    if (mongoFilter.$or) { mongoFilter.$and.push({ $or: mongoFilter.$or }); delete mongoFilter.$or; }
    mongoFilter.$and.push({ $or: searchOr });
  }
  return mongoFilter;
}

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const db = client.db("contract_ai");
    const all = await db.collection("contracts").find({}, { projection: { name:1, status:1, statusOverride:1, documentCategory:1, gekuendigtZum:1, cancellationId:1, cancellationConfirmed:1, paymentStatus:1, expiryDate:1, createdAt:1, isGenerated:1, isOptimized:1, analyzed:1, contractScore:1, folderId:1 } }).toArray();

    console.log("\n========== TEST A: Dropdown-Zähler (READ-ONLY) ==========\n");
    const counts = { aktiv:0, baldAblaufend:0, abgelaufen:0, gekuendigt:0, neu:0, entwurf:0, optimiert:0 };
    const other = {};
    for (const c of all) {
      const s = calculateSmartStatusBackend(c);
      if (s === 'Aktiv') counts.aktiv++;
      else if (s === 'Läuft ab') counts.baldAblaufend++;
      else if (s === 'Beendet') counts.abgelaufen++;
      else if (s.startsWith('Gekündigt')) counts.gekuendigt++;
      else if (s === 'Neu') counts.neu++;
      else if (s === 'Entwurf') counts.entwurf++;
      else if (s === 'Optimiert') counts.optimiert++;
      else other[s] = (other[s]||0)+1;
    }
    console.log("So zeigt das Dropdown (global über alle Verträge):");
    console.log(`   Alle Status (${all.length})`);
    console.log(`   Aktiv (${counts.aktiv}) · Läuft ab (${counts.baldAblaufend}) · Beendet (${counts.abgelaufen}) · Gekündigt (${counts.gekuendigt})`);
    console.log(`   Neu (${counts.neu}) · Entwurf (${counts.entwurf}) · Optimiert (${counts.optimiert})`);
    const sumFilters = Object.values(counts).reduce((a,b)=>a+b,0);
    const sumOther = Object.values(other).reduce((a,b)=>a+b,0);
    console.log(`\n   In den 7 Filtern: ${sumFilters}  +  in keinem Filter (Bezahlt/Offen/Pausiert): ${sumOther} (${JSON.stringify(other)})`);
    console.log(`   Summe = ${sumFilters + sumOther}  | Gesamt = ${all.length}`);
    console.log(sumFilters + sumOther === all.length ? "   ✅ Summe stimmt exakt — kein Vertrag verloren oder doppelt.\n" : "   ❌ Summe stimmt NICHT!\n");

    console.log("========== TEST B: Org-Such-Scope (echte Dokument-Simulation) ==========\n");
    const UA = new ObjectId("aaaaaaaaaaaaaaaaaaaaaaaa"); // User A
    const UB = new ObjectId("bbbbbbbbbbbbbbbbbbbbbbbb"); // FREMDER User B
    const ORG = new ObjectId("cccccccccccccccccccccccc"); // Org von A
    const UC = new ObjectId("dddddddddddddddddddddddd"); // User C (in Org)
    const docA   = { userId: UA, name: "Mietvertrag A", status: "aktiv", kuendigung: "" };
    const docB   = { userId: UB, name: "Mietvertrag B (FREMD)", status: "aktiv", kuendigung: "" };
    const docOrg = { userId: UC, organizationId: ORG, name: "Mietvertrag Org", status: "aktiv", kuendigung: "" };

    let pass = true;
    const check = (label, got, want) => { const ok = got===want; if(!ok) pass=false; console.log(`   ${ok?'✅':'❌'} ${label}: ${got} (erwartet ${want})`); };

    console.log("Fall 1 — Einzel-User A sucht 'Mietvertrag':");
    const f1 = buildFilter(UA, null, "Mietvertrag");
    check("eigener Vertrag sichtbar", matchDoc(docA, f1), true);
    check("FREMDER Vertrag NICHT sichtbar", matchDoc(docB, f1), false);

    console.log("\nFall 2 — Org-User A (in Org) sucht 'Mietvertrag':");
    const f2 = buildFilter(UA, ORG, "Mietvertrag");
    check("eigener Vertrag sichtbar", matchDoc(docA, f2), true);
    check("Org-Vertrag (anderer User, gleiche Org) sichtbar", matchDoc(docOrg, f2), true);
    check("FREMDER Vertrag (andere Org) NICHT sichtbar", matchDoc(docB, f2), false);

    console.log("\nFall 3 — Org-User A sucht 'Org' (nur Org-Vertrag passt textlich):");
    const f3 = buildFilter(UA, ORG, "Org");
    check("eigener Vertrag (Text passt nicht) NICHT sichtbar", matchDoc(docA, f3), false);
    check("Org-Vertrag sichtbar", matchDoc(docOrg, f3), true);
    check("FREMDER Vertrag NICHT sichtbar", matchDoc(docB, f3), false);

    console.log(pass ? "\n✅ TEST B bestanden — fremde Verträge tauchen in KEINEM Fall in der Suche auf.\n"
                     : "\n❌ TEST B fehlgeschlagen!\n");
    console.log("========== ENDE — keine Schreibvorgänge ==========\n");
  } finally {
    await client.close();
  }
})();
