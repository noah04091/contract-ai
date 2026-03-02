// services/cron.js
const { ObjectId } = require("mongodb");
const database = require("../config/database");
require("dotenv").config();
const sendEmail = require("./mailer");
const { checkAndSendNotifications } = require("./calendarNotifier");
const { updateContractStatuses } = require("./smartStatusUpdater"); // 🧠 NEU
const { deleteFiles } = require("./fileStorage"); // 🗑️ S3-Dateien löschen

// DEINE BESTEHENDE FUNKTION - BEHALTEN!
async function checkContractsAndSendReminders() {
  try {
    const db = await database.connect();
    const contractsCollection = db.collection("contracts");

    const today = new Date();
    const contracts = await contractsCollection.find({ reminder: true }).toArray();

    for (const contract of contracts) {
      if (!contract.expiryDate) continue;

      const expiryDate = new Date(contract.expiryDate);
      const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      const lastSent = contract.reminderLastSentAt ? new Date(contract.reminderLastSentAt) : null;
      const alreadyNotifiedToday = lastSent && (today - lastSent < 1000 * 60 * 60 * 24);

      if (daysLeft <= 30 && !alreadyNotifiedToday) {
        console.log(`🔔 Erinnerung fällig für: ${contract.name} (${daysLeft} Tage übrig)`);

        await sendEmail(
          process.env.EMAIL_USER,
          `⏰ Dein Vertrag "${contract.name}" läuft bald ab`,
          `Der Vertrag läuft in ${daysLeft} Tagen ab.\n\n📄 Vertragsname: ${contract.name}\n📆 Ablaufdatum: ${contract.expiryDate}\n📌 Status: ${contract.status || "?"}`
        );

        await contractsCollection.updateOne(
          { _id: new ObjectId(contract._id) },
          { $set: { reminderLastSentAt: new Date() } }
        );
      }
    }
  } catch (err) {
    console.error("❌ Fehler im Reminder-Cronjob:", err);
  }
}

// NEU: Calendar Event Notifications
async function checkCalendarEventsAndSendNotifications() {
  try {
    const db = await database.connect();

    console.log("📅 Prüfe Calendar Events für Benachrichtigungen...");
    const sentCount = await checkAndSendNotifications(db);
    console.log(`✅ ${sentCount} Calendar-Benachrichtigungen versendet`);

  } catch (err) {
    console.error("❌ Fehler im Calendar-Cronjob:", err);
  }
}

// 🧠 NEU: Smart Status Updater - Täglich ausführen
async function updateAllContractStatuses() {
  try {
    const db = await database.connect();

    console.log("🧠 Smart Status Update wird ausgeführt...");
    const result = await updateContractStatuses(db);
    console.log(`✅ Status-Update abgeschlossen:`, result);

  } catch (err) {
    console.error("❌ Fehler beim Smart Status Update:", err);
  }
}

// 🗑️ Auto-Delete: Stornierte Envelopes nach 30 Tagen endgültig löschen
async function autoDeleteOldVoidedEnvelopes() {
  try {
    const db = await database.connect();
    const envelopesCollection = db.collection("envelopes");

    // Finde alle VOIDED Envelopes, die älter als 30 Tage sind
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    console.log("🗑️ Suche nach alten stornierten Envelopes (> 30 Tage)...");

    const oldVoidedEnvelopes = await envelopesCollection.find({
      status: "VOIDED",
      voidedAt: { $lt: thirtyDaysAgo }
    }).toArray();

    if (oldVoidedEnvelopes.length === 0) {
      console.log("✅ Keine alten stornierten Envelopes gefunden.");
      return { deleted: 0 };
    }

    console.log(`🗑️ ${oldVoidedEnvelopes.length} alte stornierte Envelope(s) gefunden. Lösche...`);

    // Sammle S3-Keys für spätere Löschung
    const s3KeysToDelete = [];
    for (const env of oldVoidedEnvelopes) {
      if (env.s3Key) s3KeysToDelete.push(env.s3Key);
      if (env.s3KeySealed) s3KeysToDelete.push(env.s3KeySealed);
    }

    // Lösche aus der Datenbank
    const result = await envelopesCollection.deleteMany({
      status: "VOIDED",
      voidedAt: { $lt: thirtyDaysAgo }
    });

    console.log(`✅ ${result.deletedCount} Envelope(s) aus der Datenbank gelöscht.`);

    // 🗑️ S3-Dateien löschen
    if (s3KeysToDelete.length > 0) {
      console.log(`📦 Lösche ${s3KeysToDelete.length} S3-Dateien...`);
      const s3Result = await deleteFiles(s3KeysToDelete);
      console.log(`📦 S3-Löschung: ${s3Result.deleted} gelöscht, ${s3Result.failed} fehlgeschlagen`);
      return { deleted: result.deletedCount, s3Deleted: s3Result.deleted, s3Failed: s3Result.failed };
    }

    return { deleted: result.deletedCount, s3Deleted: 0, s3Failed: 0 };

  } catch (err) {
    console.error("❌ Fehler beim Auto-Delete von Envelopes:", err);
    return { deleted: 0, error: err.message };
  }
}

// EXPORTIERE ALLE FUNKTIONEN
module.exports = {
  checkContractsAndSendReminders,
  checkCalendarEventsAndSendNotifications,
  updateAllContractStatuses, // 🧠 Smart Status
  autoDeleteOldVoidedEnvelopes // 🗑️ Auto-Delete nach 30 Tagen
};
