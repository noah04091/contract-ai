// 📅 backend/services/envelopeCalendarEvents.js
// Service für automatische Kalender-Events bei Signaturprozessen

const { ObjectId } = require("mongodb");

/**
 * Helper: Erstellt ein Datum in lokaler Timezone (Deutschland/Europa)
 */
function createLocalDate(dateString) {
  const d = new Date(dateString);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

/**
 * Generiert Kalender-Events für einen Envelope (Signaturprozess)
 *
 * Event Types:
 * - SIGNATURE_EXPIRING: Hauptevent - Signatur läuft ab
 * - SIGNATURE_REMINDER_3DAY: Erinnerung 3 Tage vor Ablauf
 * - SIGNATURE_REMINDER_1DAY: Erinnerung 1 Tag vor Ablauf
 * - SIGNATURE_COMPLETED: Signatur abgeschlossen (für historische Übersicht)
 *
 * @param {Object} db - MongoDB database instance
 * @param {Object} envelope - Envelope document from MongoDB
 * @returns {Promise<Array>} Array of created events
 */
async function generateEventsForEnvelope(db, envelope) {
  const events = [];
  const now = new Date();

  try {
    // 🔧 FIX: Validate required fields before processing
    if (!envelope) {
      console.error('❌ generateEventsForEnvelope: envelope is null/undefined');
      return events;
    }

    if (!envelope.expiresAt) {
      console.error(`❌ generateEventsForEnvelope: envelope.expiresAt is missing for "${envelope.title}"`);
      return events;
    }

    if (!envelope.ownerId) {
      console.error(`❌ generateEventsForEnvelope: envelope.ownerId is missing for "${envelope.title}"`);
      return events;
    }

    const expiresAt = new Date(envelope.expiresAt);

    // 🔧 FIX: Ensure ownerId is a proper ObjectId (handle both Mongoose and native ObjectId)
    const ownerId = envelope.ownerId instanceof ObjectId
      ? envelope.ownerId
      : new ObjectId(envelope.ownerId.toString());

    // 🔧 FIX: Ensure envelopeId is a proper ObjectId
    const envelopeId = envelope._id instanceof ObjectId
      ? envelope._id
      : new ObjectId(envelope._id.toString());

    // 🔍 Log für Debugging
    console.log(`📅 Generiere Calendar Events für Envelope "${envelope.title}":`, {
      envelopeId: envelopeId.toString(),
      ownerId: ownerId.toString(),
      status: envelope.status,
      expiresAt: expiresAt.toISOString(),
      signers: envelope.signers?.length || 0
    });

    // ✅ Nur für aktive Envelopes Events erstellen
    if (!["SENT", "AWAITING_SIGNER_1", "AWAITING_SIGNER_2"].includes(envelope.status)) {
      console.log(`ℹ️ Envelope "${envelope.title}" ist nicht aktiv (Status: ${envelope.status}), keine Events erstellen`);
      return events;
    }

    // ✅ Nur wenn Ablaufdatum in der Zukunft liegt
    if (isNaN(expiresAt.getTime())) {
      console.error(`❌ generateEventsForEnvelope: Invalid expiresAt date for "${envelope.title}"`);
      return events;
    }

    if (expiresAt <= now) {
      console.log(`⏰ Envelope "${envelope.title}" ist bereits abgelaufen, keine Events erstellen`);
      return events;
    }

    // 🔔 1. SIGNATURE_REMINDER_3DAY - 3 Tage vor Ablauf
    const threeDaysBeforeExpiry = new Date(expiresAt);
    threeDaysBeforeExpiry.setDate(threeDaysBeforeExpiry.getDate() - 3);
    const reminder3DayDate = createLocalDate(threeDaysBeforeExpiry);

    if (reminder3DayDate > now) {
      events.push({
        userId: ownerId, // 🔧 FIX: Now properly converted to ObjectId
        envelopeId: envelopeId, // 🔧 FIX: Now properly converted to ObjectId
        sourceType: "ENVELOPE",
        type: "SIGNATURE_REMINDER_3DAY",
        title: `🔔 Signatur läuft bald ab: ${envelope.title}`,
        description: `Die Signaturanfrage "${envelope.title}" läuft in 3 Tagen ab. ${getPendingSignersText(envelope.signers)}`,
        date: reminder3DayDate,
        severity: "warning",
        status: "scheduled",
        metadata: {
          envelopeId: envelopeId.toString(),
          envelopeTitle: envelope.title,
          signingMode: envelope.signingMode,
          pendingSigners: getPendingSignersCount(envelope.signers),
          totalSigners: envelope.signers?.length || 0,
          expiresAt: expiresAt,
          daysUntilExpiry: 3,
          suggestedAction: "remind"
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // 🔔 2. SIGNATURE_REMINDER_1DAY - 1 Tag vor Ablauf
    const oneDayBeforeExpiry = new Date(expiresAt);
    oneDayBeforeExpiry.setDate(oneDayBeforeExpiry.getDate() - 1);
    const reminder1DayDate = createLocalDate(oneDayBeforeExpiry);

    if (reminder1DayDate > now) {
      events.push({
        userId: ownerId, // 🔧 FIX: Properly converted ObjectId
        envelopeId: envelopeId, // 🔧 FIX: Properly converted ObjectId
        sourceType: "ENVELOPE",
        type: "SIGNATURE_REMINDER_1DAY",
        title: `⚠️ Signatur läuft morgen ab: ${envelope.title}`,
        description: `Die Signaturanfrage "${envelope.title}" läuft morgen ab! ${getPendingSignersText(envelope.signers)}`,
        date: reminder1DayDate,
        severity: "critical",
        status: "scheduled",
        metadata: {
          envelopeId: envelopeId.toString(),
          envelopeTitle: envelope.title,
          signingMode: envelope.signingMode,
          pendingSigners: getPendingSignersCount(envelope.signers),
          totalSigners: envelope.signers?.length || 0,
          expiresAt: expiresAt,
          daysUntilExpiry: 1,
          suggestedAction: "remind"
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // 📋 3. SIGNATURE_EXPIRING - Hauptevent am Ablaufdatum
    const expiryDate = createLocalDate(expiresAt);

    if (expiryDate > now) {
      events.push({
        userId: ownerId, // 🔧 FIX: Properly converted ObjectId
        envelopeId: envelopeId, // 🔧 FIX: Properly converted ObjectId
        sourceType: "ENVELOPE",
        type: "SIGNATURE_EXPIRING",
        title: `🔴 Signatur läuft heute ab: ${envelope.title}`,
        description: `Die Signaturanfrage "${envelope.title}" läuft heute ab. ${getPendingSignersText(envelope.signers)}`,
        date: expiryDate,
        severity: "critical",
        status: "scheduled",
        metadata: {
          envelopeId: envelopeId.toString(),
          envelopeTitle: envelope.title,
          signingMode: envelope.signingMode,
          pendingSigners: getPendingSignersCount(envelope.signers),
          totalSigners: envelope.signers?.length || 0,
          expiresAt: expiresAt,
          daysUntilExpiry: 0,
          suggestedAction: "check"
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }

    // 💾 Events in Datenbank speichern
    if (events.length > 0) {
      // Lösche alte Events für diesen Envelope (falls vorhanden)
      await db.collection("contract_events").deleteMany({
        envelopeId: envelopeId, // 🔧 FIX: Use properly converted ObjectId
        sourceType: "ENVELOPE",
        status: "scheduled"
      });

      // Füge neue Events ein
      const result = await db.collection("contract_events").insertMany(events);
      console.log(`✅ ${result.insertedCount} Calendar Events für Envelope "${envelope.title}" erstellt`);
    } else {
      console.log(`ℹ️ Keine Calendar Events für Envelope "${envelope.title}" erstellt (alle Daten in Vergangenheit)`);
    }

  } catch (error) {
    console.error(`❌ Fehler beim Generieren von Calendar Events für Envelope ${envelope._id}:`, error);
  }

  return events;
}

/**
 * Erstellt ein "COMPLETED" Event wenn alle Signaturen eingegangen sind
 */
async function markEnvelopeAsCompleted(db, envelope) {
  try {
    // 🔧 FIX: Properly convert ObjectIds
    const envelopeId = envelope._id instanceof ObjectId
      ? envelope._id
      : new ObjectId(envelope._id.toString());
    const ownerId = envelope.ownerId instanceof ObjectId
      ? envelope.ownerId
      : new ObjectId(envelope.ownerId.toString());

    const completedDate = createLocalDate(envelope.completedAt || new Date());

    // Lösche alle ausstehenden Events
    await db.collection("contract_events").deleteMany({
      envelopeId: envelopeId,
      sourceType: "ENVELOPE",
      status: "scheduled"
    });

    // Erstelle "Completed" Event für historische Übersicht
    const completedEvent = {
      userId: ownerId,
      envelopeId: envelopeId,
      sourceType: "ENVELOPE",
      type: "SIGNATURE_COMPLETED",
      title: `✅ Signatur abgeschlossen: ${envelope.title}`,
      description: `Die Signaturanfrage "${envelope.title}" wurde erfolgreich von allen ${envelope.signers?.length || 0} Unterzeichnern abgeschlossen.`,
      date: completedDate,
      severity: "info",
      status: "completed",
      metadata: {
        envelopeId: envelopeId.toString(),
        envelopeTitle: envelope.title,
        completedAt: envelope.completedAt,
        totalSigners: envelope.signers?.length || 0,
        suggestedAction: "view"
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await db.collection("contract_events").insertOne(completedEvent);
    console.log(`✅ "Completed" Calendar Event für Envelope "${envelope.title}" erstellt`);

  } catch (error) {
    console.error(`❌ Fehler beim Erstellen des Completed-Events für Envelope ${envelope._id}:`, error);
  }
}

/**
 * Löscht alle Calendar Events für einen Envelope (bei VOIDED/DECLINED)
 */
async function deleteEnvelopeEvents(db, envelopeId) {
  try {
    const result = await db.collection("contract_events").deleteMany({
      envelopeId: new ObjectId(envelopeId),
      sourceType: "ENVELOPE"
    });

    console.log(`🗑️ ${result.deletedCount} Calendar Events für Envelope ${envelopeId} gelöscht`);
  } catch (error) {
    console.error(`❌ Fehler beim Löschen der Calendar Events für Envelope ${envelopeId}:`, error);
  }
}

/**
 * Helper: Zählt ausstehende Signaturen
 */
function getPendingSignersCount(signers) {
  if (!signers || !Array.isArray(signers)) return 0;
  return signers.filter(s => s.status === "PENDING").length;
}

/**
 * Helper: Erstellt Text über ausstehende Signaturen
 */
function getPendingSignersText(signers) {
  const pendingCount = getPendingSignersCount(signers);
  const totalCount = signers?.length || 0;

  if (pendingCount === 0) {
    return "Alle Signaturen eingegangen.";
  }

  if (pendingCount === 1) {
    return `Noch 1 von ${totalCount} Signaturen ausstehend.`;
  }

  return `Noch ${pendingCount} von ${totalCount} Signaturen ausstehend.`;
}

/**
 * Hook für Envelope Lifecycle
 * Wird aufgerufen bei Envelope-Statusänderungen
 */
async function onEnvelopeStatusChange(db, envelope, oldStatus, newStatus) {
  try {
    console.log(`📅 Envelope Status Change Hook: "${envelope.title}" ${oldStatus} → ${newStatus}`);

    if (newStatus === "SENT" || newStatus === "AWAITING_SIGNER_1" || newStatus === "AWAITING_SIGNER_2") {
      // Erstelle Calendar Events
      await generateEventsForEnvelope(db, envelope);
    } else if (newStatus === "COMPLETED" || newStatus === "SIGNED") {
      // Markiere als abgeschlossen
      await markEnvelopeAsCompleted(db, envelope);
    } else if (newStatus === "VOIDED" || newStatus === "DECLINED" || newStatus === "EXPIRED") {
      // Lösche alle Events
      await deleteEnvelopeEvents(db, envelope._id);
    }

  } catch (error) {
    console.error(`❌ Envelope Calendar Hook Fehler:`, error);
    // Fehler nicht werfen, um Envelope-Operation nicht zu blockieren
  }
}

module.exports = {
  generateEventsForEnvelope,
  markEnvelopeAsCompleted,
  deleteEnvelopeEvents,
  onEnvelopeStatusChange
};
