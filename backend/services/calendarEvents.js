// 📁 backend/services/calendarEvents.js
const { ObjectId } = require("mongodb");

/**
 * Generiert automatisch Kalenderereignisse basierend auf Vertragsdaten
 */
async function generateEventsForContract(db, contract) {
  const events = [];
  const now = new Date();
  
  try {
    // Parse contract dates
    const expiryDate = contract.expiryDate ? new Date(contract.expiryDate) : null;
    const createdDate = new Date(contract.createdAt || contract.uploadedAt);
    
    // Extract notice period from contract (defaults)
    const noticePeriodDays = extractNoticePeriod(contract.kuendigung);
    const autoRenewMonths = contract.autoRenewMonths || 12;
    
    if (expiryDate && expiryDate > now) {
      // 1. Kündigungsfenster öffnet
      if (noticePeriodDays > 0) {
        const cancelWindowDate = new Date(expiryDate);
        cancelWindowDate.setDate(cancelWindowDate.getDate() - noticePeriodDays);
        
        if (cancelWindowDate > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "CANCEL_WINDOW_OPEN",
            title: `🟢 Kündigungsfenster öffnet: ${contract.name}`,
            description: `Ab heute können Sie "${contract.name}" kündigen. Die Kündigungsfrist beträgt ${noticePeriodDays} Tage.`,
            date: cancelWindowDate,
            severity: "info",
            status: "scheduled",
            metadata: {
              provider: contract.provider,
              noticePeriodDays,
              suggestedAction: "cancel",
              contractName: contract.name,
              expiryDate: expiryDate
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Reminder 30 Tage vorher
          const reminderDate = new Date(cancelWindowDate);
          reminderDate.setDate(reminderDate.getDate() - 30);
          
          if (reminderDate > now) {
            events.push({
              userId: contract.userId,
              contractId: contract._id,
              type: "CANCEL_REMINDER",
              title: `📅 Kündigungsfrist naht: ${contract.name}`,
              description: `In 30 Tagen öffnet sich das Kündigungsfenster für "${contract.name}".`,
              date: reminderDate,
              severity: "info",
              status: "scheduled",
              metadata: {
                provider: contract.provider,
                daysUntilWindow: 30,
                suggestedAction: "prepare",
                contractName: contract.name
              },
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
      
      // 2. Letzter Kündigungstag
      if (noticePeriodDays > 0) {
        const lastCancelDate = new Date(expiryDate);
        lastCancelDate.setDate(lastCancelDate.getDate() - 1); // Tag vor Ablauf
        
        if (lastCancelDate > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "LAST_CANCEL_DAY",
            title: `🔴 LETZTER TAG: ${contract.name} kündigen!`,
            description: `Heute ist die letzte Chance, "${contract.name}" zu kündigen. Sonst verlängert sich der Vertrag automatisch um ${autoRenewMonths} Monate!`,
            date: lastCancelDate,
            severity: "critical",
            status: "scheduled",
            metadata: {
              provider: contract.provider,
              autoRenewMonths,
              suggestedAction: "cancel",
              urgent: true,
              contractName: contract.name,
              expiryDate: expiryDate
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Warnung 7 Tage vorher
          const warningDate = new Date(lastCancelDate);
          warningDate.setDate(warningDate.getDate() - 7);
          
          if (warningDate > now) {
            events.push({
              userId: contract.userId,
              contractId: contract._id,
              type: "CANCEL_WARNING",
              title: `⚠️ Nur noch 7 Tage: ${contract.name}`,
              description: `In 7 Tagen endet die Kündigungsfrist für "${contract.name}". Handeln Sie jetzt!`,
              date: warningDate,
              severity: "warning",
              status: "scheduled",
              metadata: {
                provider: contract.provider,
                daysLeft: 7,
                suggestedAction: "cancel",
                contractName: contract.name
              },
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
      
      // 3. Automatische Verlängerung
      events.push({
        userId: contract.userId,
        contractId: contract._id,
        type: "AUTO_RENEWAL",
        title: `🔄 Automatische Verlängerung: ${contract.name}`,
        description: `"${contract.name}" verlängert sich heute automatisch um ${autoRenewMonths} Monate, falls nicht gekündigt wurde.`,
        date: expiryDate,
        severity: "warning",
        status: "scheduled",
        metadata: {
          provider: contract.provider,
          autoRenewMonths,
          newExpiryDate: calculateNewExpiryDate(expiryDate, autoRenewMonths),
          suggestedAction: "review",
          contractName: contract.name
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // 4. Preissteigerung (falls erkannt)
      if (contract.priceIncreaseDate) {
        const priceIncreaseDate = new Date(contract.priceIncreaseDate);
        
        if (priceIncreaseDate > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "PRICE_INCREASE",
            title: `💰 Preiserhöhung: ${contract.name}`,
            description: `Der Preis für "${contract.name}" steigt heute${contract.newPrice ? ` auf ${contract.newPrice}€` : ''}.`,
            date: priceIncreaseDate,
            severity: "warning",
            status: "scheduled",
            metadata: {
              provider: contract.provider,
              oldPrice: contract.amount,
              newPrice: contract.newPrice,
              suggestedAction: "compare",
              contractName: contract.name
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Vorwarnung 30 Tage vorher
          const priceWarningDate = new Date(priceIncreaseDate);
          priceWarningDate.setDate(priceWarningDate.getDate() - 30);
          
          if (priceWarningDate > now) {
            events.push({
              userId: contract.userId,
              contractId: contract._id,
              type: "PRICE_INCREASE_WARNING",
              title: `📈 Preiserhöhung in 30 Tagen: ${contract.name}`,
              description: `In 30 Tagen steigt der Preis für "${contract.name}". Jetzt Alternativen prüfen!`,
              date: priceWarningDate,
              severity: "info",
              status: "scheduled",
              metadata: {
                provider: contract.provider,
                daysUntilIncrease: 30,
                suggestedAction: "compare",
                contractName: contract.name
              },
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
      
      // 5. Jährliches Review (für langfristige Verträge)
      const oneYearFromCreation = new Date(createdDate);
      oneYearFromCreation.setFullYear(oneYearFromCreation.getFullYear() + 1);
      
      if (oneYearFromCreation > now && oneYearFromCreation < expiryDate) {
        events.push({
          userId: contract.userId,
          contractId: contract._id,
          type: "REVIEW",
          title: `🔍 Jahres-Review: ${contract.name}`,
          description: `Zeit für einen Check: Ist "${contract.name}" noch optimal für Sie? Prüfen Sie Alternativen!`,
          date: oneYearFromCreation,
          severity: "info",
          status: "scheduled",
          metadata: {
            provider: contract.provider,
            contractAge: "1 Jahr",
            suggestedAction: "review",
            contractName: contract.name
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // 6. Vertragsablauf
      if (expiryDate > now) {
        events.push({
          userId: contract.userId,
          contractId: contract._id,
          type: "CONTRACT_EXPIRY",
          title: `📋 Vertrag läuft ab: ${contract.name}`,
          description: `"${contract.name}" läuft heute ab.`,
          date: expiryDate,
          severity: "info",
          status: "scheduled",
          metadata: {
            provider: contract.provider,
            suggestedAction: "archive",
            contractName: contract.name
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }
    
    // Speichere Events in DB (update or insert)
    if (events.length > 0) {
      // Lösche alte Events für diesen Vertrag
      await db.collection("contract_events").deleteMany({
        contractId: contract._id,
        status: "scheduled" // Nur geplante Events löschen, nicht bereits bearbeitete
      });
      
      // Füge neue Events ein
      const result = await db.collection("contract_events").insertMany(events);
      console.log(`✅ ${result.insertedCount} Events für Vertrag "${contract.name}" generiert`);
    }
    
  } catch (error) {
    console.error(`❌ Fehler beim Generieren von Events für Vertrag ${contract._id}:`, error);
  }
  
  return events;
}

/**
 * Extrahiert die Kündigungsfrist in Tagen aus dem Kündigungstext
 */
function extractNoticePeriod(kuendigungsText) {
  if (!kuendigungsText) return 90; // Default: 3 Monate
  
  const text = kuendigungsText.toLowerCase();
  
  // Suche nach Mustern wie "3 Monate", "90 Tage", "6 Wochen"
  const patterns = [
    { regex: /(\d+)\s*monat/i, multiplier: 30 },
    { regex: /(\d+)\s*woche/i, multiplier: 7 },
    { regex: /(\d+)\s*tag/i, multiplier: 1 }
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      return parseInt(match[1]) * pattern.multiplier;
    }
  }
  
  // Spezielle Fälle
  if (text.includes("quartal")) return 90;
  if (text.includes("halbjahr")) return 180;
  if (text.includes("jahr")) return 365;
  
  return 90; // Default
}

/**
 * Berechnet das neue Ablaufdatum nach automatischer Verlängerung
 */
function calculateNewExpiryDate(currentExpiry, renewMonths) {
  const newDate = new Date(currentExpiry);
  newDate.setMonth(newDate.getMonth() + renewMonths);
  return newDate;
}

/**
 * Regeneriert alle Events für alle Verträge eines Users
 */
async function regenerateAllEvents(db, userId) {
  try {
    // Hole alle Verträge des Users
    const contracts = await db.collection("contracts")
      .find({ userId: new ObjectId(userId) })
      .toArray();
    
    let totalEvents = 0;
    
    for (const contract of contracts) {
      const events = await generateEventsForContract(db, contract);
      totalEvents += events.length;
    }
    
    console.log(`✅ ${totalEvents} Events für ${contracts.length} Verträge regeneriert`);
    return totalEvents;
    
  } catch (error) {
    console.error("❌ Fehler beim Regenerieren aller Events:", error);
    throw error;
  }
}

/**
 * Prüft und aktualisiert abgelaufene Events
 */
async function updateExpiredEvents(db) {
  try {
    const now = new Date();
    
    // Markiere abgelaufene Events
    const result = await db.collection("contract_events").updateMany(
      {
        date: { $lt: now },
        status: "scheduled"
      },
      {
        $set: {
          status: "expired",
          expiredAt: now,
          updatedAt: now
        }
      }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`✅ ${result.modifiedCount} abgelaufene Events aktualisiert`);
    }
    
  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren abgelaufener Events:", error);
  }
}

/**
 * Hook für Contract-Upload/Update
 */
async function onContractChange(db, contract, action = "create") {
  try {
    console.log(`📅 Calendar Hook: ${action} für Vertrag "${contract.name}"`);
    
    // Generiere Events für den Vertrag
    await generateEventsForContract(db, contract);
    
    // Optional: Sende Bestätigungs-Email
    if (action === "create") {
      // TODO: Email-Service benachrichtigen
      console.log(`📧 Neue Events für "${contract.name}" erstellt`);
    }
    
  } catch (error) {
    console.error("❌ Calendar Hook Fehler:", error);
    // Fehler nicht werfen, um Upload nicht zu blockieren
  }
}

module.exports = {
  generateEventsForContract,
  regenerateAllEvents,
  updateExpiredEvents,
  onContractChange,
  extractNoticePeriod
};