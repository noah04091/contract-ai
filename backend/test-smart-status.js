// 🧪 test-smart-status.js - Umfassender Test für Smart Status System
const { MongoClient, ObjectId } = require("mongodb");
const { updateContractStatuses, updateContractStatus, getStatusHistory } = require("./services/smartStatusUpdater");
const { sendStatusChangeNotification } = require("./services/statusNotifier");
require("dotenv").config();

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runTests() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    console.log("\n🚀 =================================================");
    console.log("   SMART STATUS LIFECYCLE SYSTEM - TEST SUITE");
    console.log("   =================================================\n");

    await client.connect();
    console.log("✅ Verbunden mit MongoDB\n");

    const db = client.db("contract_ai");
    const contractsCollection = db.collection("contracts");
    const statusHistoryCollection = db.collection("contract_status_history");

    // ============================================
    // TEST 1: Datenbank-Status prüfen
    // ============================================
    console.log("📊 TEST 1: Datenbank-Status");
    console.log("─────────────────────────────────────────────────");

    const totalContracts = await contractsCollection.countDocuments();
    const activeContracts = await contractsCollection.countDocuments({ status: { $nin: ["gekündigt", "deleted"] } });
    const expiringContracts = await contractsCollection.countDocuments({
      status: { $nin: ["gekündigt", "deleted"] },
      expiryDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // nächste 30 Tage
      }
    });

    console.log(`   📄 Gesamt-Verträge:        ${totalContracts}`);
    console.log(`   ✅ Aktive Verträge:        ${activeContracts}`);
    console.log(`   ⚠️  In 30 Tagen ablaufend: ${expiringContracts}`);

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
      console.log(`      ${emoji} ${s._id || "unknown"}: ${s.count}`);
    });

    const historyCount = await statusHistoryCollection.countDocuments();
    console.log(`\n   📜 Status-History Einträge: ${historyCount}`);

    // ============================================
    // TEST 2: Smart Status Update ausführen
    // ============================================
    console.log("\n\n🧠 TEST 2: Smart Status Update");
    console.log("─────────────────────────────────────────────────");

    const runUpdate = await question("   Möchtest du den Smart Status Update jetzt ausführen? (j/n): ");

    if (runUpdate.toLowerCase() === "j") {
      console.log("\n   ⏳ Starte Smart Status Update...\n");

      const result = await updateContractStatuses(db);

      console.log("\n   📊 ERGEBNIS:");
      console.log(`      ⚠️  Auf "bald_ablaufend" gesetzt: ${result.bald_ablaufend}`);
      console.log(`      🔄 Auto-Renewal durchgeführt:     ${result.auto_renewed}`);
      console.log(`      ❌ Auf "abgelaufen" gesetzt:      ${result.abgelaufen}`);

      // Zeige betroffene Verträge
      if (result.bald_ablaufend > 0 || result.auto_renewed > 0 || result.abgelaufen > 0) {
        console.log("\n   📋 Letzte Status-Änderungen:");
        const recentChanges = await statusHistoryCollection
          .find({ reason: "automatic" })
          .sort({ timestamp: -1 })
          .limit(5)
          .toArray();

        for (const change of recentChanges) {
          const contract = await contractsCollection.findOne({ _id: change.contractId });
          console.log(`      • ${contract?.name || "Unknown"}: ${change.oldStatus} → ${change.newStatus}`);
        }
      }
    } else {
      console.log("   ⏭️  Übersprungen");
    }

    // ============================================
    // TEST 3: Status-History testen
    // ============================================
    console.log("\n\n📜 TEST 3: Status-History");
    console.log("─────────────────────────────────────────────────");

    // Finde einen Vertrag mit History
    const contractWithHistory = await statusHistoryCollection.findOne();

    if (contractWithHistory) {
      const contract = await contractsCollection.findOne({ _id: contractWithHistory.contractId });
      const history = await getStatusHistory(db, contractWithHistory.contractId, contractWithHistory.userId);

      console.log(`   📄 Vertrag: ${contract?.name || "Unknown"}`);
      console.log(`   📊 Anzahl Status-Änderungen: ${history.length}\n`);

      if (history.length > 0) {
        console.log("   📋 Letzte 3 Änderungen:");
        history.slice(0, 3).forEach((h, i) => {
          const emoji = h.reason === "automatic" ? "🤖" :
                       h.reason === "manual" ? "👤" :
                       h.reason === "auto_renewal" ? "🔄" :
                       h.reason === "cancellation" ? "🚫" : "❓";
          console.log(`      ${i + 1}. ${emoji} ${h.oldStatus} → ${h.newStatus}`);
          console.log(`         Grund: ${h.reason} | ${new Date(h.timestamp).toLocaleString("de-DE")}`);
          if (h.notes) console.log(`         Note: ${h.notes}`);
        });
      }
    } else {
      console.log("   ℹ️  Noch keine Status-History vorhanden");
      console.log("   💡 Tipp: Führe TEST 2 aus oder warte auf den nächtlichen Cron-Job");
    }

    // ============================================
    // TEST 4: Manueller Status-Update
    // ============================================
    console.log("\n\n👤 TEST 4: Manueller Status-Update");
    console.log("─────────────────────────────────────────────────");

    const testManual = await question("   Möchtest du einen manuellen Status-Update testen? (j/n): ");

    if (testManual.toLowerCase() === "j") {
      // Finde einen aktiven Vertrag
      const testContract = await contractsCollection.findOne({
        status: { $nin: ["gekündigt", "deleted"] },
        userId: { $exists: true }
      });

      if (testContract) {
        console.log(`\n   📄 Test-Vertrag: ${testContract.name}`);
        console.log(`   📊 Aktueller Status: ${testContract.status}`);

        const newStatus = await question("   ✏️  Neuer Status (aktiv/bald_ablaufend/abgelaufen/gekündigt): ");

        if (["aktiv", "bald_ablaufend", "abgelaufen", "gekündigt"].includes(newStatus)) {
          try {
            const result = await updateContractStatus(
              db,
              testContract._id,
              testContract.userId,
              newStatus,
              "manual",
              "Test über test-smart-status.js"
            );

            console.log(`\n   ✅ Status erfolgreich aktualisiert!`);
            console.log(`      ${result.oldStatus} → ${result.newStatus}`);
          } catch (error) {
            console.log(`\n   ❌ Fehler: ${error.message}`);
          }
        } else {
          console.log("   ❌ Ungültiger Status");
        }
      } else {
        console.log("   ⚠️  Kein passender Test-Vertrag gefunden");
      }
    } else {
      console.log("   ⏭️  Übersprungen");
    }

    // ============================================
    // TEST 5: E-Mail Notifications (Optional)
    // ============================================
    console.log("\n\n📧 TEST 5: E-Mail Notifications");
    console.log("─────────────────────────────────────────────────");

    const hasEmailConfig = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

    if (!hasEmailConfig) {
      console.log("   ⚠️  E-Mail-Konfiguration fehlt in .env");
      console.log("   💡 Benötigt: EMAIL_HOST, EMAIL_USER, EMAIL_PASS");
      console.log("   ⏭️  Test übersprungen\n");
    } else {
      console.log("   ✅ E-Mail-Konfiguration gefunden");

      const testEmail = await question("   Möchtest du eine Test-E-Mail senden? (j/n): ");

      if (testEmail.toLowerCase() === "j") {
        const emailAddress = await question("   📧 E-Mail-Adresse für Test: ");

        // Finde einen Vertrag für Test
        const testContract = await contractsCollection.findOne({
          status: { $nin: ["gekündigt", "deleted"] },
          userId: { $exists: true }
        });

        if (testContract) {
          try {
            console.log("\n   ⏳ Sende Test-Notification...");

            // Simuliere Status-Änderung zu "bald_ablaufend"
            const expiryDate = testContract.expiryDate || new Date(Date.now() + 28 * 24 * 60 * 60 * 1000);
            const daysLeft = Math.ceil((new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24));

            // Temporär User-E-Mail ändern für Test
            const originalUser = await db.collection("users").findOne({ _id: testContract.userId });
            await db.collection("users").updateOne(
              { _id: testContract.userId },
              { $set: { email: emailAddress } }
            );

            await sendStatusChangeNotification(
              db,
              testContract._id,
              testContract.userId,
              "aktiv",
              "bald_ablaufend",
              { daysLeft: daysLeft, expiryDate: expiryDate }
            );

            // E-Mail zurücksetzen
            if (originalUser) {
              await db.collection("users").updateOne(
                { _id: testContract.userId },
                { $set: { email: originalUser.email } }
              );
            }

            console.log("   ✅ Test-E-Mail versendet!");
            console.log(`   📧 Prüfe dein Postfach: ${emailAddress}`);
          } catch (error) {
            console.log(`\n   ❌ Fehler beim E-Mail-Versand: ${error.message}`);
            console.log("   💡 Prüfe deine SMTP-Einstellungen in .env");
          }
        } else {
          console.log("   ⚠️  Kein passender Test-Vertrag gefunden");
        }
      } else {
        console.log("   ⏭️  Übersprungen");
      }
    }

    // ============================================
    // ZUSAMMENFASSUNG
    // ============================================
    console.log("\n\n📊 ZUSAMMENFASSUNG");
    console.log("─────────────────────────────────────────────────");

    // Prüfe Cron-Job in server.js
    const fs = require("fs");
    const serverJs = fs.readFileSync("./server.js", "utf8");
    const hasCronJob = serverJs.includes("Smart Status Update") && serverJs.includes("updateContractStatuses");

    console.log("\n   ✅ System-Status:");
    console.log(`      ${hasCronJob ? "✅" : "❌"} Cron-Job in server.js integriert`);
    console.log(`      ${totalContracts > 0 ? "✅" : "⚠️"} Verträge in Datenbank vorhanden`);
    console.log(`      ${historyCount > 0 ? "✅" : "ℹ️"} Status-History vorhanden`);
    console.log(`      ${hasEmailConfig ? "✅" : "⚠️"} E-Mail-Konfiguration vorhanden`);

    console.log("\n   🔄 Nächster automatischer Lauf: Täglich um 1:00 Uhr");
    console.log("   💡 Starte den Server neu, um den Cron-Job zu aktivieren:\n");
    console.log("      cd backend && node server.js\n");

    console.log("\n✅ =================================================");
    console.log("   ALLE TESTS ABGESCHLOSSEN");
    console.log("   =================================================\n");

  } catch (error) {
    console.error("\n❌ Fehler beim Test:", error);
    console.error(error.stack);
  } finally {
    await client.close();
    rl.close();
    console.log("✅ MongoDB-Verbindung geschlossen\n");
  }
}

// Script starten
console.log("\n🧪 Starte Smart Status System Tests...\n");
runTests().catch(console.error);
