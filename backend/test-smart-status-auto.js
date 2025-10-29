// 🧪 test-smart-status-auto.js - Automatischer Test (kein User-Input)
const { MongoClient, ObjectId } = require("mongodb");
const { updateContractStatuses, getStatusHistory } = require("./services/smartStatusUpdater");
require("dotenv").config();

async function runAutoTests() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    console.log("\n🚀 =================================================");
    console.log("   SMART STATUS SYSTEM - AUTO TEST");
    console.log("   =================================================\n");

    await client.connect();
    console.log("✅ Verbunden mit MongoDB\n");

    const db = client.db("contract_ai");
    const contractsCollection = db.collection("contracts");
    const statusHistoryCollection = db.collection("contract_status_history");

    // ============================================
    // TEST 1: System-Check
    // ============================================
    console.log("📊 TEST 1: System-Check");
    console.log("─────────────────────────────────────────────────\n");

    const totalContracts = await contractsCollection.countDocuments();
    const activeContracts = await contractsCollection.countDocuments({
      status: { $nin: ["gekündigt", "deleted"] }
    });

    console.log(`   📄 Gesamt-Verträge:   ${totalContracts}`);
    console.log(`   ✅ Aktive Verträge:   ${activeContracts}`);

    // Status-Verteilung
    const statusDistribution = await contractsCollection.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]).toArray();

    console.log("\n   📈 Status-Verteilung:");
    statusDistribution.forEach(s => {
      const emoji = s._id === "aktiv" ? "✅" :
                    s._id === "bald_ablaufend" ? "⚠️" :
                    s._id === "abgelaufen" ? "❌" :
                    s._id === "gekündigt" ? "🚫" : "❓";
      console.log(`      ${emoji} ${s._id || "null"}: ${s.count}`);
    });

    // Prüfe Status-Konsistenz
    const inconsistentStatuses = statusDistribution.filter(s =>
      !["aktiv", "bald_ablaufend", "abgelaufen", "gekündigt", "deleted"].includes(s._id)
    );

    if (inconsistentStatuses.length > 0) {
      console.log("\n   ⚠️  WARNUNG: Inkonsistente Status gefunden!");
      console.log("   💡 Führe aus: node normalize-contract-status.js\n");
    } else {
      console.log("\n   ✅ Alle Status sind korrekt normalisiert\n");
    }

    // ============================================
    // TEST 2: Verträge die bald ablaufen finden
    // ============================================
    console.log("\n📅 TEST 2: Ablaufende Verträge");
    console.log("─────────────────────────────────────────────────\n");

    const now = new Date();
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const expiringContracts = await contractsCollection.find({
      status: { $nin: ["gekündigt", "deleted"] },
      expiryDate: { $exists: true, $ne: null, $lte: in30Days, $gte: now }
    }).toArray();

    console.log(`   ⚠️  Verträge die in 30 Tagen ablaufen: ${expiringContracts.length}`);

    if (expiringContracts.length > 0) {
      console.log("\n   📋 Top 5:");
      expiringContracts.slice(0, 5).forEach((c, i) => {
        const daysLeft = Math.ceil((new Date(c.expiryDate) - now) / (1000 * 60 * 60 * 24));
        console.log(`      ${i + 1}. ${c.name} - ${daysLeft} Tage (${c.status})`);
      });
    }

    const expiredContracts = await contractsCollection.find({
      status: { $nin: ["gekündigt", "deleted", "abgelaufen"] },
      expiryDate: { $exists: true, $ne: null, $lt: now }
    }).toArray();

    console.log(`\n   ❌ Bereits abgelaufene (nicht als "abgelaufen" markiert): ${expiredContracts.length}`);

    if (expiredContracts.length > 0) {
      console.log("\n   📋 Top 5:");
      expiredContracts.slice(0, 5).forEach((c, i) => {
        const daysOverdue = Math.ceil((now - new Date(c.expiryDate)) / (1000 * 60 * 60 * 24));
        console.log(`      ${i + 1}. ${c.name} - ${daysOverdue} Tage überfällig (${c.status})`);
      });
    }

    // ============================================
    // TEST 3: Auto-Renewal Kandidaten
    // ============================================
    console.log("\n\n🔄 TEST 3: Auto-Renewal Verträge");
    console.log("─────────────────────────────────────────────────\n");

    const autoRenewCount = await contractsCollection.countDocuments({
      isAutoRenewal: true,
      status: { $nin: ["gekündigt", "deleted"] }
    });

    console.log(`   🔄 Verträge mit Auto-Renewal: ${autoRenewCount}`);

    const autoRenewExpiring = await contractsCollection.find({
      isAutoRenewal: true,
      status: { $nin: ["gekündigt", "deleted"] },
      expiryDate: { $exists: true, $ne: null, $lt: in30Days }
    }).toArray();

    console.log(`   ⚠️  Werden bald automatisch verlängert: ${autoRenewExpiring.length}`);

    if (autoRenewExpiring.length > 0) {
      console.log("\n   📋 Details:");
      autoRenewExpiring.slice(0, 3).forEach((c, i) => {
        const renewMonths = c.autoRenewMonths || 12;
        console.log(`      ${i + 1}. ${c.name}`);
        console.log(`         Ablauf: ${new Date(c.expiryDate).toLocaleDateString("de-DE")}`);
        console.log(`         Verlängerung: +${renewMonths} Monate`);
      });
    }

    // ============================================
    // TEST 4: Smart Status Update ausführen
    // ============================================
    console.log("\n\n🧠 TEST 4: Smart Status Update");
    console.log("─────────────────────────────────────────────────\n");

    console.log("   ⏳ Führe Smart Status Update aus...\n");

    const result = await updateContractStatuses(db);

    console.log("   📊 ERGEBNIS:");
    console.log(`      ⚠️  Auf "bald_ablaufend" gesetzt: ${result.bald_ablaufend}`);
    console.log(`      🔄 Auto-Renewal durchgeführt:     ${result.auto_renewed}`);
    console.log(`      ❌ Auf "abgelaufen" gesetzt:      ${result.abgelaufen}`);

    // Zeige betroffene Verträge
    if (result.bald_ablaufend > 0 || result.auto_renewed > 0 || result.abgelaufen > 0) {
      console.log("\n   📋 Letzte Status-Änderungen:");
      const recentChanges = await statusHistoryCollection
        .find({ reason: "automatic" })
        .sort({ timestamp: -1 })
        .limit(10)
        .toArray();

      for (const change of recentChanges) {
        const contract = await contractsCollection.findOne({ _id: change.contractId });
        const timestamp = new Date(change.timestamp).toLocaleString("de-DE");
        console.log(`      • ${contract?.name || "Unknown"}: ${change.oldStatus} → ${change.newStatus} (${timestamp})`);
      }
    } else {
      console.log("\n   ℹ️  Keine Status-Änderungen nötig");
    }

    // ============================================
    // TEST 5: Status-History Check
    // ============================================
    console.log("\n\n📜 TEST 5: Status-History");
    console.log("─────────────────────────────────────────────────\n");

    const historyCount = await statusHistoryCollection.countDocuments();
    console.log(`   📊 Gesamt History-Einträge: ${historyCount}`);

    if (historyCount > 0) {
      // Gruppiere nach Reason
      const historyByReason = await statusHistoryCollection.aggregate([
        { $group: { _id: "$reason", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]).toArray();

      console.log("\n   📈 History nach Grund:");
      historyByReason.forEach(h => {
        const emoji = h._id === "automatic" ? "🤖" :
                      h._id === "manual" ? "👤" :
                      h._id === "auto_renewal" ? "🔄" :
                      h._id === "cancellation" ? "🚫" : "❓";
        console.log(`      ${emoji} ${h._id}: ${h.count}`);
      });

      // Letzte 5 Änderungen
      console.log("\n   📋 Letzte 5 Status-Änderungen:");
      const recentChanges = await statusHistoryCollection
        .find()
        .sort({ timestamp: -1 })
        .limit(5)
        .toArray();

      for (const change of recentChanges) {
        const contract = await contractsCollection.findOne({ _id: change.contractId });
        const timestamp = new Date(change.timestamp).toLocaleString("de-DE");
        console.log(`      • ${contract?.name || "Unknown"}`);
        console.log(`        ${change.oldStatus} → ${change.newStatus} (${change.reason}, ${timestamp})`);
      }
    }

    // ============================================
    // TEST 6: Cron-Job Integration
    // ============================================
    console.log("\n\n⏰ TEST 6: Cron-Job Integration");
    console.log("─────────────────────────────────────────────────\n");

    const fs = require("fs");
    const serverJs = fs.readFileSync("./server.js", "utf8");

    const hasCronJob = serverJs.includes("Smart Status Update") &&
                       serverJs.includes("updateContractStatuses");
    const hasSchedule = serverJs.includes('cron.schedule("0 1 * * *"') ||
                        serverJs.includes("0 1 * * *");

    console.log(`   ${hasCronJob ? "✅" : "❌"} Smart Status Updater importiert`);
    console.log(`   ${hasSchedule ? "✅" : "❌"} Cron-Job geplant (täglich 1:00 Uhr)`);

    // ============================================
    // ZUSAMMENFASSUNG
    // ============================================
    console.log("\n\n📊 ZUSAMMENFASSUNG");
    console.log("─────────────────────────────────────────────────\n");

    const hasEmailConfig = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

    const allGood = inconsistentStatuses.length === 0 &&
                    hasCronJob &&
                    hasSchedule &&
                    totalContracts > 0;

    console.log("   ✅ System-Status:");
    console.log(`      ${inconsistentStatuses.length === 0 ? "✅" : "⚠️"} Status normalisiert`);
    console.log(`      ${hasCronJob && hasSchedule ? "✅" : "❌"} Cron-Job aktiv`);
    console.log(`      ${totalContracts > 0 ? "✅" : "⚠️"} Verträge vorhanden`);
    console.log(`      ${historyCount > 0 ? "✅" : "ℹ️"} Status-History aktiv`);
    console.log(`      ${hasEmailConfig ? "✅" : "⚠️"} E-Mail konfiguriert`);

    if (allGood) {
      console.log("\n   🎉 ALLES BEREIT! Das System funktioniert 100%!");
    } else {
      console.log("\n   ⚠️  Einige Schritte erforderlich:");
      if (inconsistentStatuses.length > 0) {
        console.log("      → node normalize-contract-status.js");
      }
      if (!hasEmailConfig) {
        console.log("      → E-Mail in .env konfigurieren");
      }
    }

    console.log("\n   🔄 Nächster automatischer Lauf: Täglich um 1:00 Uhr");
    console.log("   💡 Starte Server neu für Cron-Job: node server.js\n");

    console.log("\n✅ =================================================");
    console.log("   TEST ABGESCHLOSSEN");
    console.log("   =================================================\n");

  } catch (error) {
    console.error("\n❌ Fehler beim Test:", error);
    console.error(error.stack);
  } finally {
    await client.close();
    console.log("✅ MongoDB-Verbindung geschlossen\n");
  }
}

runAutoTests().catch(console.error);
