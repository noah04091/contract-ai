// 🧠 services/smartStatusUpdater.js - Intelligenter Status-Lifecycle Manager
const { ObjectId } = require("mongodb");
const { queueNotification } = require("./notificationQueue"); // 📬 Queue statt direkter Versand

/**
 * 🎯 SMART STATUS UPDATE - Automatische Vertragsstatus-Verwaltung
 *
 * Status-Lifecycle:
 * aktiv → bald_ablaufend → (auto-renewal OR abgelaufen) → gekündigt
 */

/**
 * Hauptfunktion: Aktualisiert alle Vertragsstatus intelligent
 */
async function updateContractStatuses(db) {
  const now = new Date();
  const contractsCollection = db.collection("contracts");
  const statusHistoryCollection = db.collection("contract_status_history");

  let updated = {
    bald_ablaufend: 0,
    auto_renewed: 0,
    abgelaufen: 0
  };

  try {
    console.log("🧠 Smart Status Updater gestartet...");

    // Hole alle aktiven Verträge
    const contracts = await contractsCollection.find({
      status: { $nin: ['gekündigt', 'Gekündigt'] } // Gekündigte nicht ändern
    }).toArray();

    for (const contract of contracts) {
      const expiryDate = contract.expiryDate ? new Date(contract.expiryDate) :
                         contract.endDate ? new Date(contract.endDate) : null;

      if (!expiryDate) {
        console.log(`⚠️ Kein Ablaufdatum für "${contract.name}" - überspringe`);
        continue;
      }

      const daysUntilExpiry = Math.ceil((expiryDate - now) / (1000 * 60 * 60 * 24));
      const oldStatus = contract.status || 'aktiv';
      let newStatus = oldStatus;
      let shouldUpdate = false;
      let autoRenewed = false;

      // 🔄 AUTO-RENEWAL CHECK
      if (daysUntilExpiry <= 0 && contract.isAutoRenewal) {
        console.log(`🔄 Auto-Renewal für "${contract.name}"`);

        // Berechne neues Ablaufdatum
        const autoRenewMonths = contract.autoRenewMonths || 12;
        const newExpiryDate = new Date(expiryDate);
        newExpiryDate.setMonth(newExpiryDate.getMonth() + autoRenewMonths);

        await contractsCollection.updateOne(
          { _id: contract._id },
          {
            $set: {
              expiryDate: newExpiryDate,
              endDate: newExpiryDate,
              lastRenewalDate: now,
              status: 'aktiv',
              updatedAt: now
            },
            $inc: { renewalCount: 1 }
          }
        );

        // Status-History speichern
        await logStatusChange(statusHistoryCollection, contract._id, contract.userId,
          oldStatus, 'aktiv', 'auto_renewal',
          `Automatisch verlängert bis ${newExpiryDate.toLocaleDateString('de-DE')}`);

        // 📬 Notification in Queue
        await queueNotification(db, {
          userId: contract.userId,
          contractId: contract._id,
          type: 'auto_renewed',
          oldStatus: oldStatus,
          newStatus: 'aktiv',
          metadata: {
            oldExpiryDate: expiryDate,
            newExpiryDate: newExpiryDate,
            autoRenewMonths: autoRenewMonths
          }
        });

        updated.auto_renewed++;
        autoRenewed = true;
        console.log(`✅ "${contract.name}" automatisch verlängert bis ${newExpiryDate.toISOString()}`);

        continue; // Nächster Vertrag
      }

      // ⚠️ BALD ABLAUFEND (30 Tage)
      if (daysUntilExpiry > 0 && daysUntilExpiry <= 30 && oldStatus !== 'bald_ablaufend') {
        newStatus = 'bald_ablaufend';
        shouldUpdate = true;
        updated.bald_ablaufend++;
        console.log(`⚠️ "${contract.name}" läuft in ${daysUntilExpiry} Tagen ab → bald_ablaufend`);
      }

      // ❌ ABGELAUFEN (kein Auto-Renewal)
      if (daysUntilExpiry <= 0 && !contract.isAutoRenewal && oldStatus !== 'abgelaufen') {
        newStatus = 'abgelaufen';
        shouldUpdate = true;
        updated.abgelaufen++;
        console.log(`❌ "${contract.name}" ist abgelaufen → abgelaufen`);
      }

      // Update durchführen
      if (shouldUpdate) {
        await contractsCollection.updateOne(
          { _id: contract._id },
          {
            $set: {
              status: newStatus,
              statusUpdatedAt: now,
              updatedAt: now
            }
          }
        );

        // Status-History speichern
        await logStatusChange(statusHistoryCollection, contract._id, contract.userId,
          oldStatus, newStatus, 'automatic',
          `Status automatisch aktualisiert (${daysUntilExpiry} Tage bis Ablauf)`);

        // 📬 Notification in Queue
        await queueNotification(db, {
          userId: contract.userId,
          contractId: contract._id,
          type: newStatus, // 'bald_ablaufend' oder 'abgelaufen'
          oldStatus: oldStatus,
          newStatus: newStatus,
          metadata: {
            daysLeft: daysUntilExpiry,
            expiryDate: expiryDate
          }
        });
      }
    }

    console.log(`✅ Status-Update abgeschlossen:`, updated);
    return updated;

  } catch (error) {
    console.error("❌ Fehler beim Smart Status Update:", error);
    throw error;
  }
}

/**
 * Speichert Status-Änderungen in der Historie
 */
async function logStatusChange(collection, contractId, userId, oldStatus, newStatus, reason, notes = '') {
  try {
    await collection.insertOne({
      contractId,
      userId,
      oldStatus,
      newStatus,
      reason, // 'automatic', 'manual', 'cancellation', 'auto_renewal'
      notes,
      timestamp: new Date()
    });
  } catch (error) {
    console.error("❌ Fehler beim Speichern der Status-History:", error);
  }
}

/**
 * Manueller Status-Update (z.B. externe Kündigung)
 */
async function updateContractStatus(db, contractId, userId, newStatus, reason = 'manual', notes = '') {
  try {
    const contractsCollection = db.collection("contracts");
    const statusHistoryCollection = db.collection("contract_status_history");

    const contract = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(userId)
    });

    if (!contract) {
      throw new Error("Vertrag nicht gefunden");
    }

    const oldStatus = contract.status || 'aktiv';

    // Update Status
    await contractsCollection.updateOne(
      { _id: contract._id },
      {
        $set: {
          status: newStatus,
          statusUpdatedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    // Log History
    await logStatusChange(statusHistoryCollection, contract._id, contract.userId,
      oldStatus, newStatus, reason, notes);

    console.log(`✅ Status manuell aktualisiert: "${contract.name}" → ${newStatus}`);
    return { success: true, oldStatus, newStatus };

  } catch (error) {
    console.error("❌ Fehler beim manuellen Status-Update:", error);
    throw error;
  }
}

/**
 * Holt Status-Historie für einen Vertrag
 */
async function getStatusHistory(db, contractId, userId) {
  try {
    const statusHistoryCollection = db.collection("contract_status_history");

    const history = await statusHistoryCollection
      .find({
        contractId: new ObjectId(contractId),
        userId: new ObjectId(userId)
      })
      .sort({ timestamp: -1 })
      .toArray();

    return history;

  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Status-History:", error);
    throw error;
  }
}

module.exports = {
  updateContractStatuses,
  updateContractStatus,
  getStatusHistory,
  logStatusChange
};
