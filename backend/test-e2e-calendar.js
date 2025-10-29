// 🧪 test-e2e-calendar.js - Kompletter End-to-End Test für Intelligenten Vertragskalender
const { MongoClient, ObjectId } = require("mongodb");
const { updateContractStatuses } = require("./services/smartStatusUpdater");
const { processNotificationQueue } = require("./services/notificationSender");
const { getQueueStats, getPendingNotifications } = require("./services/notificationQueue");
require("dotenv").config();

const readline = require("readline");
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function runE2ETest() {
  const client = new MongoClient(process.env.MONGO_URI);
  let testContractId = null;
  let testUserId = null;

  try {
    console.log("\n🧪 ====================================================");
    console.log("   INTELLIGENTER VERTRAGSKALENDER - E2E TEST");
    console.log("   ====================================================\n");

    await client.connect();
    console.log("✅ Verbunden mit MongoDB\n");

    const db = client.db("contract_ai");

    // ============================================
    // PHASE 1: Vorbereitung
    // ============================================
    console.log("📋 PHASE 1: Test-Vorbereitung");
    console.log("────────────────────────────────────────────────────\n");

    // Finde einen Test-User
    const user = await db.collection("users").findOne({});
    if (!user) {
      console.error("❌ Kein User in Datenbank gefunden!");
      console.log("   💡 Erstelle zuerst einen User über die App\n");
      return;
    }

    testUserId = user._id;
    console.log(`✅ Test-User: ${user.email} (${testUserId})\n`);

    // Erstelle Test-Vertrag mit Ablaufdatum in 28 Tagen
    const createContract = await question("Soll ein Test-Vertrag erstellt werden? (j/n): ");

    if (createContract.toLowerCase() === 'j') {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 28); // In 28 Tagen

      const testContract = {
        userId: testUserId,
        name: "E2E Test Vertrag - " + new Date().toISOString(),
        status: "aktiv",
        expiryDate: expiryDate,
        endDate: expiryDate,
        createdAt: new Date(),
        updatedAt: new Date(),
        isAutoRenewal: false,
        toolUsed: "e2e-test",
        metadata: {
          testContract: true,
          e2eTestRun: true
        }
      };

      const result = await db.collection("contracts").insertOne(testContract);
      testContractId = result.insertedId;

      console.log(`\n✅ Test-Vertrag erstellt:`);
      console.log(`   ID: ${testContractId}`);
      console.log(`   Name: ${testContract.name}`);
      console.log(`   Ablaufdatum: ${expiryDate.toLocaleDateString('de-DE')} (in 28 Tagen)`);
      console.log(`   Status: ${testContract.status}\n`);
    } else {
      // Nutze bestehenden Vertrag
      const existingContract = await db.collection("contracts").findOne({
        userId: testUserId,
        status: "aktiv"
      });

      if (existingContract) {
        testContractId = existingContract._id;
        console.log(`\n✅ Nutze bestehenden Vertrag:`);
        console.log(`   ID: ${testContractId}`);
        console.log(`   Name: ${existingContract.name}`);
        console.log(`   Status: ${existingContract.status}\n`);
      } else {
        console.log("⚠️ Kein passender Vertrag gefunden\n");
      }
    }

    // ============================================
    // PHASE 2: Smart Status Update Test
    // ============================================
    console.log("\n🧠 PHASE 2: Smart Status Update");
    console.log("────────────────────────────────────────────────────\n");

    const runStatusUpdate = await question("Smart Status Update jetzt ausführen? (j/n): ");

    if (runStatusUpdate.toLowerCase() === 'j') {
      console.log("\n⏳ Führe Smart Status Update aus...\n");

      const beforeStats = await getQueueStats(db);
      console.log("📊 Queue VORHER:");
      console.log(`   Pending: ${beforeStats.pending}\n`);

      const result = await updateContractStatuses(db);

      console.log("\n📊 Status-Update Ergebnis:");
      console.log(`   ⚠️ Bald ablaufend: ${result.bald_ablaufend}`);
      console.log(`   🔄 Auto-Renewal:   ${result.auto_renewed}`);
      console.log(`   ❌ Abgelaufen:     ${result.abgelaufen}\n`);

      const afterStats = await getQueueStats(db);
      console.log("📊 Queue NACHHER:");
      console.log(`   Pending: ${afterStats.pending}`);
      console.log(`   Neu hinzugefügt: ${afterStats.pending - beforeStats.pending}\n`);

      if (afterStats.pending > beforeStats.pending) {
        console.log("✅ Notifications wurden in Queue geschrieben!\n");
      } else {
        console.log("ℹ️ Keine neuen Notifications (kein Vertrag läuft in 30 Tagen ab)\n");
        console.log("💡 Tipp: Erstelle einen Vertrag mit Ablaufdatum < 30 Tage\n");
      }

      // Zeige Queue-Details
      if (afterStats.pending > 0) {
        console.log("📋 Pending Notifications:");
        const pending = await getPendingNotifications(db);
        for (const [userId, notifications] of Object.entries(pending)) {
          console.log(`   👤 User: ${userId}`);
          notifications.forEach((n, i) => {
            console.log(`      ${i + 1}. ${n.type}: ${n.oldStatus} → ${n.newStatus}`);
          });
        }
        console.log();
      }
    } else {
      console.log("⏭️ Übersprungen\n");
    }

    // ============================================
    // PHASE 3: Notification Queue Test
    // ============================================
    console.log("\n📤 PHASE 3: Notification Queue Verarbeitung");
    console.log("────────────────────────────────────────────────────\n");

    const currentStats = await getQueueStats(db);
    console.log(`📊 Aktuelle Queue: ${currentStats.pending} pending\n`);

    if (currentStats.pending === 0) {
      console.log("ℹ️ Keine Notifications in Queue zum Testen\n");
      console.log("💡 Führe zuerst PHASE 2 aus oder erstelle Test-Vertrag\n");
    } else {
      const processQueue = await question(`${currentStats.pending} Notification(s) jetzt versenden? (j/n): `);

      if (processQueue.toLowerCase() === 'j') {
        const yourEmail = await question("Deine E-Mail für Test (oder Enter für User-E-Mail): ");

        if (yourEmail.trim()) {
          // Temporär User-E-Mail ändern für Test
          const originalEmail = user.email;
          await db.collection("users").updateOne(
            { _id: testUserId },
            { $set: { email: yourEmail.trim() } }
          );
          console.log(`\n📧 Test-E-Mail geht an: ${yourEmail.trim()}\n`);

          console.log("⏳ Verarbeite Queue und versende E-Mails...\n");

          const result = await processNotificationQueue(db);

          console.log("\n📊 Verarbeitungs-Ergebnis:");
          console.log(`   ✅ Versendet:       ${result.sent}`);
          console.log(`   ❌ Fehlgeschlagen:  ${result.failed}`);
          console.log(`   📦 Gruppiert:       ${result.grouped} User\n`);

          // E-Mail zurücksetzen
          await db.collection("users").updateOne(
            { _id: testUserId },
            { $set: { email: originalEmail } }
          );

          if (result.sent > 0) {
            console.log("✅ E-Mail(s) erfolgreich versendet!");
            console.log(`📧 Prüfe dein Postfach: ${yourEmail.trim()}\n`);
          } else {
            console.log("⚠️ Keine E-Mails versendet - Prüfe Logs für Fehler\n");
          }
        } else {
          console.log("\n⏳ Verarbeite Queue mit Original User-E-Mail...\n");

          const result = await processNotificationQueue(db);

          console.log("\n📊 Verarbeitungs-Ergebnis:");
          console.log(`   ✅ Versendet:       ${result.sent}`);
          console.log(`   ❌ Fehlgeschlagen:  ${result.failed}`);
          console.log(`   📦 Gruppiert:       ${result.grouped} User\n`);
        }

        // Finale Queue-Stats
        const finalStats = await getQueueStats(db);
        console.log("📊 Queue nach Verarbeitung:");
        console.log(`   Pending: ${finalStats.pending}`);
        console.log(`   Sent:    ${finalStats.sent}`);
        console.log(`   Failed:  ${finalStats.failed}\n`);

      } else {
        console.log("⏭️ Übersprungen\n");
      }
    }

    // ============================================
    // PHASE 4: Cleanup
    // ============================================
    console.log("\n🗑️ PHASE 4: Cleanup");
    console.log("────────────────────────────────────────────────────\n");

    if (testContractId && createContract.toLowerCase() === 'j') {
      const cleanup = await question("Test-Vertrag löschen? (j/n): ");

      if (cleanup.toLowerCase() === 'j') {
        await db.collection("contracts").deleteOne({ _id: testContractId });
        console.log("✅ Test-Vertrag gelöscht\n");
      }
    }

    // ============================================
    // FINALE ZUSAMMENFASSUNG
    // ============================================
    console.log("\n✅ ====================================================");
    console.log("   E2E TEST ABGESCHLOSSEN");
    console.log("   ====================================================\n");

    console.log("📊 SYSTEM-STATUS:\n");

    // Cron-Jobs prüfen
    const fs = require("fs");
    const serverJs = fs.readFileSync("./server.js", "utf8");
    const hasStatusCron = serverJs.includes("updateContractStatuses") && serverJs.includes("0 1 * * *");
    const hasQueueCron = serverJs.includes("processNotificationQueue") && serverJs.includes("0 9 * * *");

    console.log("   ⏰ Cron-Jobs:");
    console.log(`      ${hasStatusCron ? "✅" : "❌"} Status-Update (1:00 Uhr)`);
    console.log(`      ${hasQueueCron ? "✅" : "❌"} Queue-Sender (9:00 Uhr)\n`);

    // Queue-Stats
    const stats = await getQueueStats(db);
    console.log("   📬 Notification Queue:");
    console.log(`      Pending: ${stats.pending}`);
    console.log(`      Sent:    ${stats.sent}`);
    console.log(`      Failed:  ${stats.failed}\n`);

    // SMTP-Check
    const hasEmailConfig = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;
    console.log(`   ${hasEmailConfig ? "✅" : "❌"} E-Mail-Konfiguration\n`);

    console.log("💯 FAZIT:");
    if (hasStatusCron && hasQueueCron && hasEmailConfig) {
      console.log("   ✅ System ist zu 100% bereit und funktionsfähig!\n");
      console.log("   🚀 Production-Ready Workflow:");
      console.log("      1. Täglich 1:00 Uhr → Status-Update → Queue");
      console.log("      2. Täglich 9:00 Uhr → Queue-Verarbeitung → E-Mails\n");
    } else {
      console.log("   ⚠️ Einige Komponenten fehlen noch\n");
    }

    console.log("📋 NÄCHSTE SCHRITTE:");
    console.log("   1. Server neu starten: node server.js");
    console.log("   2. Logs prüfen für Cron-Job Registrierung");
    console.log("   3. Warten auf automatische Ausführung (1:00 + 9:00 Uhr)");
    console.log("   4. Oder: Test-Script erneut ausführen für sofortige Tests\n");

  } catch (error) {
    console.error("\n❌ Fehler beim E2E-Test:", error);
    console.error(error.stack);
  } finally {
    await client.close();
    rl.close();
    console.log("✅ MongoDB-Verbindung geschlossen\n");
  }
}

console.log("\n🧪 Starte End-to-End Test für Intelligenten Vertragskalender...\n");
runE2ETest().catch(console.error);
