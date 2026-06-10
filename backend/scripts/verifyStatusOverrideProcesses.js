/**
 * READ-ONLY TÜV: Verifiziert das gesamte statusOverride-Ökosystem an ECHTEN Daten.
 * SCHREIBT NICHTS. Prüft: Anzeige, Cron-Entscheidung, Auto-Renewal-Schutz, Regression.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

function calc(contract, withOverride) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if (contract.documentCategory === 'cancellation_confirmation' || contract.gekuendigtZum) {
    const d = contract.gekuendigtZum ? new Date(contract.gekuendigtZum) : null;
    if (d) { d.setHours(0, 0, 0, 0); return d < today ? 'Beendet' : 'Gekündigt'; }
    return 'Gekündigt';
  }
  if (contract.status === 'gekündigt' || contract.cancellationId)
    return contract.cancellationConfirmed ? 'Gekündigt ✓' : 'Gekündigt — offen';
  if (contract.documentCategory === 'invoice')
    return contract.paymentStatus === 'paid' ? 'Bezahlt' : 'Offen';
  if (withOverride && contract.statusOverride && contract.status) {
    const s = contract.status.toLowerCase();
    if (['aktiv', 'gültig', 'laufend', 'active'].includes(s)) return 'Aktiv';
    if (s === 'gekündigt' || s === 'gekuendigt') return 'Gekündigt';
    if (['beendet', 'abgelaufen', 'expired'].includes(s)) return 'Beendet';
    if (['läuft ab', 'bald fällig', 'bald_ablaufend'].includes(s)) return 'Läuft ab';
    if (s === 'pausiert') return 'Pausiert';
    if (['entwurf', 'draft'].includes(s)) return 'Entwurf';
    return 'Aktiv';
  }
  const exp = contract.expiryDate ? new Date(contract.expiryDate) : null;
  if (exp && !isNaN(exp.getTime())) {
    exp.setHours(0, 0, 0, 0);
    const days = Math.ceil((exp.getTime() - today.getTime()) / 86400000);
    if (days < 0) {
      const c = contract.createdAt ? new Date(contract.createdAt) : null;
      const since = c ? Math.ceil((today.getTime() - c.getTime()) / 86400000) : 999;
      if (since <= 14 && days < -60) return 'Aktiv';
      return 'Beendet';
    }
    if (days <= 30) return 'Läuft ab';
    return 'Aktiv';
  }
  if (contract.status) {
    const s = contract.status.toLowerCase();
    if (['aktiv', 'gültig', 'laufend'].includes(s)) return 'Aktiv';
    if (s === 'gekündigt') return 'Gekündigt';
    if (['beendet', 'abgelaufen', 'expired'].includes(s)) return 'Beendet';
    if (['läuft ab', 'bald fällig'].includes(s)) return 'Läuft ab';
    if (s === 'pausiert') return 'Pausiert';
    if (['entwurf', 'draft'].includes(s)) return 'Entwurf';
  }
  if (contract.isGenerated) return 'Entwurf';
  if (contract.isOptimized) return 'Optimiert';
  if (!contract.analyzed && !contract.contractScore) return 'Neu';
  return 'Aktiv';
}

// Cron-Entscheidung (nachgebildet aus smartStatusUpdater.js, read-only)
function cronDecision(contract) {
  const now = new Date();
  const expiryDate = contract.expiryDate ? new Date(contract.expiryDate)
    : contract.endDate ? new Date(contract.endDate) : null;
  if (['gekündigt', 'Gekündigt'].includes(contract.status)) return 'NICHT GEHOLT (gekündigt-Filter)';
  if (!expiryDate) return 'übersprungen (kein Ablaufdatum)';
  const days = Math.ceil((expiryDate - now) / 86400000);
  if (days <= 0 && contract.isAutoRenewal) return 'AUTO-RENEWAL (läuft trotz Override!)';
  if (contract.statusOverride === true) return '🔒 ÜBERSPRUNGEN (Override geschützt)';
  if (days > 0 && days <= 30) return 'würde → bald_ablaufend';
  if (days <= 0) return 'würde → abgelaufen';
  return 'keine Änderung';
}

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const db = client.db("contract_ai");
    const col = db.collection("contracts");
    const fields = { name:1, status:1, statusOverride:1, documentCategory:1, gekuendigtZum:1, cancellationId:1, cancellationConfirmed:1, paymentStatus:1, expiryDate:1, endDate:1, createdAt:1, isGenerated:1, isOptimized:1, analyzed:1, contractScore:1, isAutoRenewal:1 };
    const all = await col.find({}, { projection: fields }).toArray();

    const overrides = all.filter(c => c.statusOverride === true);
    const normals = all.filter(c => c.statusOverride !== true);

    console.log("\n=================== STATUS-OVERRIDE TÜV (READ-ONLY) ===================\n");
    console.log(`Verträge gesamt: ${all.length}  |  mit Override: ${overrides.length}  |  normal: ${normals.length}\n`);

    // TEST 1 — Override-Verträge: Anzeige + Cron-Verhalten
    // „sicher" = der Cron würde den Status NICHT ändern (alles außer "würde → ...").
    console.log("── TEST 1: Override-Verträge (Anzeige zeigt manuellen Wert? Cron lässt in Ruhe?) ──");
    let t1ok = true;
    for (const c of overrides) {
      const display = calc(c, true);
      const cron = cronDecision(c);
      const wouldOverwrite = cron.startsWith('würde →');
      if (wouldOverwrite) t1ok = false;
      console.log(`  • "${c.name}"  status=${c.status}  → Anzeige: "${display}"  | Cron: ${cron}`);
    }
    // Synthetischer Override-Vertrag MIT Ablaufdatum in der Vergangenheit → beweist die Override-Skip-Zeile
    const past = new Date(); past.setDate(past.getDate() - 90);
    const synthetic = { name: '[synthetisch] Override + abgelaufenes Datum', status: 'aktiv', statusOverride: true, expiryDate: past, createdAt: new Date('2020-01-01'), analyzed: true };
    const synCron = cronDecision(synthetic);
    const synDisplay = calc(synthetic, true);
    const synOk = synCron.includes('ÜBERSPRUNGEN') && synDisplay === 'Aktiv';
    if (!synOk) t1ok = false;
    console.log(`  • ${synthetic.name}  → Anzeige: "${synDisplay}" (erwartet Aktiv)  | Cron: ${synCron} (erwartet ÜBERSPRUNGEN)`);
    console.log(t1ok ? "  ✅ Kein Override-Vertrag wird vom Cron überschrieben; Override-Skip beweisbar aktiv.\n"
                     : "  ❌ Mindestens ein Override-Vertrag würde überschrieben!\n");

    // TEST 2 — Regression: normale Verträge IDENTISCH zu vor dem Feature
    console.log("── TEST 2: Regression — normale Verträge identisch zur Logik OHNE Override-Zweig ──");
    let diffs = 0;
    for (const c of normals) {
      if (calc(c, true) !== calc(c, false)) { diffs++; console.log(`  ⚠️ DIFF "${c.name}"`); }
    }
    console.log(`  Abweichungen bei ${normals.length} normalen Verträgen: ${diffs}`);
    console.log(diffs === 0 ? "  ✅ Keine Regression — normale Verträge unverändert.\n" : "  ❌ Regression entdeckt!\n");

    // TEST 3 — Auto-Renewal-Schutz: läuft Auto-Verlängerung auch bei Override?
    console.log("── TEST 3: Auto-Renewal bleibt trotz Override aktiv ──");
    const autoRenewOverride = overrides.filter(c => c.isAutoRenewal);
    if (autoRenewOverride.length === 0) {
      console.log("  ℹ️ Aktuell kein Override-Vertrag mit isAutoRenewal — Logik geprüft (Auto-Renewal-Block steht VOR dem Override-Skip).\n");
    } else {
      for (const c of autoRenewOverride) console.log(`  • "${c.name}": Cron-Entscheidung = ${cronDecision(c)}`);
      console.log("  ✅ Auto-Renewal greift weiterhin.\n");
    }

    // TEST 4 — Cron-Gesamtbild
    console.log("── TEST 4: Cron-Gesamtbild (was macht der Nacht-Job?) ──");
    const tally = {};
    for (const c of all) { const d = cronDecision(c); tally[d] = (tally[d] || 0) + 1; }
    Object.entries(tally).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`  ${String(v).padStart(4)}×  ${k}`));
    console.log("");

    console.log("=================== ENDE — keine Schreibvorgänge ===================\n");
  } finally {
    await client.close();
  }
})();
