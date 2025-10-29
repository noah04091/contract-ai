// 🧪 test-notification-queue.js - Test für Notification Queue System
const { MongoClient } = require("mongodb");
const { queueNotification, getPendingNotifications, getQueueStats, cleanupOldNotifications } = require("./services/notificationQueue");
const { processNotificationQueue } = require("./services/notificationSender");
require("dotenv").config();

async function testNotificationQueue() {
  const client = new MongoClient(process.env.MONGO_URI);

  try {
    console.log("\n🧪 =================================================");
    console.log("   NOTIFICATION QUEUE SYSTEM - TEST");
    console.log("   =================================================\n");

    await client.connect();
    console.log("✅ Verbunden mit MongoDB\n");

    const db = client.db("contract_ai");

    // ============================================
    // TEST 1: Queue Stats
    // ============================================
    console.log("📊 TEST 1: Queue Statistiken");
    console.log("─────────────────────────────────────────────────");

    const stats = await getQueueStats(db);
    console.log(`   📬 Pending:  ${stats.pending}`);
    console.log(`   ✅ Sent:     ${stats.sent}`);
    console.log(`   ❌ Failed:   ${stats.failed}`);

    // ============================================
    // TEST 2: Pending Notifications anzeigen
    // ============================================
    console.log("\n\n📋 TEST 2: Pending Notifications");
    console.log("─────────────────────────────────────────────────");

    const pendingByUser = await getPendingNotifications(db);
    const userCount = Object.keys(pendingByUser).length;

    if (userCount === 0) {
      console.log("   ℹ️  Keine pending Notifications\n");
    } else {
      console.log(`   👥 ${userCount} User mit pending Notifications:\n`);

      for (const [userId, notifications] of Object.entries(pendingByUser)) {
        const user = await db.collection("users").findOne({ _id: notifications[0].userId });
        console.log(`   👤 ${user?.email || userId}`);
        console.log(`      📬 ${notifications.length} Notification(s):`);

        notifications.forEach((n, i) => {
          const emoji = n.type === 'bald_ablaufend' ? '⚠️' :
                       n.type === 'abgelaufen' ? '❌' :
                       n.type === 'auto_renewed' ? '🔄' : '📄';
          console.log(`         ${i + 1}. ${emoji} ${n.type} (${n.oldStatus} → ${n.newStatus})`);
        });
        console.log();
      }
    }

    // ============================================
    // TEST 3: Queue-Verarbeitung
    // ============================================
    console.log("\n📤 TEST 3: Queue Verarbeitung");
    console.log("─────────────────────────────────────────────────");

    if (stats.pending === 0) {
      console.log("   ℹ️  Keine Notifications zu verarbeiten\n");
      console.log("   💡 Führe zuerst aus: node test-smart-status-auto.js");
      console.log("      Um Test-Notifications zu erstellen\n");
    } else {
      const readline = require("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        rl.question(`   Sollen ${stats.pending} Notification(s) jetzt versendet werden? (j/n): `, resolve);
      });
      rl.close();

      if (answer.toLowerCase() === 'j') {
        console.log("\n   ⏳ Verarbeite Queue...\n");

        const result = await processNotificationQueue(db);

        console.log("\n   📊 ERGEBNIS:");
        console.log(`      ✅ Versendet:       ${result.sent}`);
        console.log(`      ❌ Fehlgeschlagen:  ${result.failed}`);
        console.log(`      📦 Gruppiert:       ${result.grouped} User\n`);

        // Neue Stats nach Verarbeitung
        const newStats = await getQueueStats(db);
        console.log("   📊 NEUE QUEUE-STATISTIKEN:");
        console.log(`      📬 Pending:  ${newStats.pending}`);
        console.log(`      ✅ Sent:     ${newStats.sent}`);
        console.log(`      ❌ Failed:   ${newStats.failed}\n`);
      } else {
        console.log("   ⏭️  Übersprungen\n");
      }
    }

    // ============================================
    // TEST 4: Cleanup
    // ============================================
    console.log("\n🗑️ TEST 4: Cleanup alter Notifications");
    console.log("─────────────────────────────────────────────────");

    const deletedCount = await cleanupOldNotifications(db);
    if (deletedCount > 0) {
      console.log(`   ✅ ${deletedCount} alte Notifications gelöscht\n`);
    } else {
      console.log("   ℹ️  Keine alten Notifications zum Löschen\n");
    }

    // ============================================
    // TEST 5: System-Übersicht
    // ============================================
    console.log("\n📊 TEST 5: System-Übersicht");
    console.log("─────────────────────────────────────────────────");

    // Collection prüfen
    const collections = await db.listCollections({ name: "notification_queue" }).toArray();
    const queueExists = collections.length > 0;

    // Indexes prüfen
    let indexCount = 0;
    if (queueExists) {
      const indexes = await db.collection("notification_queue").indexes();
      indexCount = indexes.length;
    }

    // Cron-Job prüfen
    const fs = require("fs");
    const serverJs = fs.readFileSync("./server.js", "utf8");
    const hasQueueCron = serverJs.includes("processNotificationQueue") &&
                          serverJs.includes("0 9 * * *");
    const hasStatusCron = serverJs.includes("updateContractStatuses") &&
                          serverJs.includes("0 1 * * *");

    console.log("   ✅ System-Status:");
    console.log(`      ${queueExists ? "✅" : "❌"} notification_queue Collection existiert`);
    console.log(`      ${indexCount > 0 ? "✅" : "⚠️"} ${indexCount} MongoDB-Indexes`);
    console.log(`      ${hasStatusCron ? "✅" : "❌"} Status-Update Cron (1:00 Uhr)`);
    console.log(`      ${hasQueueCron ? "✅" : "❌"} Queue-Sender Cron (9:00 Uhr)`);

    console.log("\n   🔄 Workflow:");
    console.log("      1. 1:00 Uhr → Status-Update → Notifications in Queue");
    console.log("      2. 9:00 Uhr → Queue-Verarbeitung → E-Mails versenden");
    console.log("      3. Logik:");
    console.log("         • 1-5 Notifications: Separate E-Mails (2-3 Min Pause)");
    console.log("         • 6+ Notifications: EINE gruppierte E-Mail\n");

    // SMTP-Check
    const hasEmailConfig = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;
    console.log(`   ${hasEmailConfig ? "✅" : "⚠️"} E-Mail-Konfiguration ${hasEmailConfig ? "vorhanden" : "fehlt"}\n`);

    console.log("\n✅ =================================================");
    console.log("   TEST ABGESCHLOSSEN");
    console.log("   =================================================\n");

    console.log("💡 NÄCHSTE SCHRITTE:");
    console.log("   1. Server neu starten: node server.js");
    console.log("   2. Warten auf Cron-Jobs:");
    console.log("      • 1:00 Uhr: Status-Update");
    console.log("      • 9:00 Uhr: Queue-Verarbeitung");
    console.log("   3. Oder sofort testen:");
    console.log("      • node test-smart-status-auto.js (erstellt Notifications)");
    console.log("      • node test-notification-queue.js (versendet Queue)\n");

  } catch (error) {
    console.error("\n❌ Fehler beim Test:", error);
    console.error(error.stack);
  } finally {
    await client.close();
    console.log("✅ MongoDB-Verbindung geschlossen\n");
  }
}

testNotificationQueue().catch(console.error);
