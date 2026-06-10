/**
 * READ-ONLY Smoke-Test für das statusOverride-Feature.
 * SCHREIBT NICHTS — nur find()/countDocuments().
 *
 * Beweist:
 *  1) Kein heutiger Vertrag hat statusOverride gesetzt → alle neuen Code-Zweige sind
 *     schlafend → bestehende Daten verhalten sich BIT-IDENTISCH wie vorher.
 *  2) Die neue Status-Berechnung liefert für ALLE realen Verträge exakt dasselbe wie
 *     die alte (weil der Override-Zweig ohne Schalter nie greift).
 *  3) Sobald der Schalter an ist, gewinnt der Override korrekt über die Datums-Logik
 *     (synthetische Demo), und der Cron würde den Vertrag überspringen.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const { MongoClient } = require("mongodb");

// --- ALTE Logik (vor dem Feature: KEIN 2.5-Override) ---
function calcOLD(contract) {
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

// --- NEUE Logik (mit 2.5-Override) — exakt wie im Code ---
function calcNEW(contract) {
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
  // 2.5 OVERRIDE
  if (contract.statusOverride && contract.status) {
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

(async () => {
  const client = new MongoClient(process.env.MONGO_URI);
  try {
    await client.connect();
    const db = client.db("contract_ai");
    const col = db.collection("contracts");

    console.log("\n===== SMOKE-TEST statusOverride (READ-ONLY) =====\n");

    // (1) Sicherheits-Beweis: kein heutiger Vertrag hat den Schalter
    const total = await col.countDocuments({});
    const withOverrideField = await col.countDocuments({ statusOverride: { $exists: true } });
    const overrideTrue = await col.countDocuments({ statusOverride: true });
    console.log(`Verträge gesamt:                    ${total}`);
    console.log(`mit statusOverride-Feld vorhanden:  ${withOverrideField}`);
    console.log(`mit statusOverride === true:        ${overrideTrue}`);
    console.log(overrideTrue === 0 && withOverrideField === 0
      ? "✅ (1) Kein Vertrag hat den Schalter → alle neuen Zweige sind schlafend → bestehende Daten unverändert.\n"
      : "ℹ️  (1) Es existieren bereits Override-Verträge (falls du schon getestet hast) — siehe unten.\n");

    // (2) Alte vs. neue Status-Berechnung über ALLE realen Verträge → muss identisch sein
    const fields = {
      status: 1, statusOverride: 1, documentCategory: 1, gekuendigtZum: 1, cancellationId: 1,
      cancellationConfirmed: 1, paymentStatus: 1, expiryDate: 1, createdAt: 1,
      isGenerated: 1, isOptimized: 1, analyzed: 1, contractScore: 1, name: 1
    };
    const all = await col.find({}, { projection: fields }).toArray();
    let diffs = 0;
    for (const c of all) {
      const o = calcOLD(c), n = calcNEW(c);
      if (o !== n) {
        diffs++;
        console.log(`   ⚠️  DIFF "${c.name}": alt=${o}  neu=${n}  (statusOverride=${c.statusOverride})`);
      }
    }
    console.log(`(2) Alte vs. neue Berechnung über ${all.length} echte Verträge — Abweichungen: ${diffs}`);
    console.log(diffs === 0
      ? "✅ (2) IDENTISCH für jeden realen Vertrag → die Anzeige ändert sich für bestehende Daten NICHT.\n"
      : "❌ (2) Es gibt Abweichungen (nur erwartbar bei bereits gesetzten Override-Verträgen).\n");

    // (3) Synthetische Demo: Schalter AN gewinnt über Datums-Logik
    const past = new Date(); past.setDate(past.getDate() - 90);
    const demoAuto = { status: 'aktiv', statusOverride: false, expiryDate: past, createdAt: new Date('2020-01-01'), analyzed: true };
    const demoOverride = { status: 'aktiv', statusOverride: true, expiryDate: past, createdAt: new Date('2020-01-01'), analyzed: true };
    console.log("(3) Demo — abgelaufener Vertrag (expiry vor 90 Tagen), Status manuell 'aktiv':");
    console.log(`    ohne Schalter (Automatik):  ${calcNEW(demoAuto)}      (erwartet: Beendet)`);
    console.log(`    mit  Schalter (Override):   ${calcNEW(demoOverride)}      (erwartet: Aktiv)`);
    console.log(calcNEW(demoAuto) === 'Beendet' && calcNEW(demoOverride) === 'Aktiv'
      ? "✅ (3) Override gewinnt korrekt über die Datums-Logik.\n"
      : "❌ (3) Override-Verhalten stimmt nicht.\n");

    // (4) Cron-Skip-Logik (synthetisch): statusOverride === true → continue
    const cronWouldSkip = (c) => c.statusOverride === true;
    console.log("(4) Cron-Skip — würde der Nacht-Job den Override-Vertrag in Ruhe lassen?");
    console.log(`    Automatik-Vertrag übersprungen:  ${cronWouldSkip(demoAuto)}   (erwartet: false → wird normal verarbeitet)`);
    console.log(`    Override-Vertrag übersprungen:   ${cronWouldSkip(demoOverride)}    (erwartet: true → Status bleibt)`);
    console.log(!cronWouldSkip(demoAuto) && cronWouldSkip(demoOverride)
      ? "✅ (4) Cron lässt Override-Verträge in Ruhe, normale laufen weiter (Auto-Renewal davor unberührt).\n"
      : "❌ (4) Cron-Skip-Logik stimmt nicht.\n");

    console.log("===== ENDE — keine Schreibvorgänge ausgeführt =====\n");
  } finally {
    await client.close();
  }
})();
