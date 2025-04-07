// services/cron.js
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const sendEmail = require("./mailer");

const client = new MongoClient(process.env.MONGO_URI);

async function checkContractsAndSendReminders() {
  try {
    await client.connect();
    const db = client.db("contract_ai");
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
  } finally {
    await client.close();
  }
}

module.exports = checkContractsAndSendReminders;
