// 📅 backend/services/calendarEvents.js - WITH AUTO-RENEWAL SUPPORT
const { ObjectId } = require("mongodb");

/**
 * Helper: Erstellt ein Datum in lokaler Timezone (Deutschland/Europa)
 * Verhindert Timezone-Shifts bei der Anzeige im Kalender
 */
function createLocalDate(dateString) {
  const d = new Date(dateString);
  // Setze auf Mitternacht in Europa/Berlin Timezone
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
}

/**
 * Generiert automatisch Kalenderereignisse basierend auf Vertragsdaten
 * NEU: Unterstützt Auto-Renewal für "alte" aber aktive Verträge
 */
async function generateEventsForContract(db, contract) {
  const events = [];
  const now = new Date();
  
  try {
    // 🔧 FIX: Flexible Feldnamen-Unterstützung für verschiedene Datenquellen
    let expiryDate = contract.expiryDate 
      ? new Date(contract.expiryDate) 
      : contract.endDate 
        ? new Date(contract.endDate)
        : null;
    
    // 🆕 AUTO-RENEWAL HANDLING
    const isAutoRenewal = contract.isAutoRenewal || false;
    
    // Wenn Auto-Renewal und Datum in Vergangenheit → Berechne nächstes Ablaufdatum
    if (isAutoRenewal && expiryDate && expiryDate < now) {
      console.log(`🔄 Auto-Renewal Vertrag "${contract.name}" - berechne nächste Periode`);
      const originalExpiry = new Date(expiryDate);
      
      // Berechne nächstes Ablaufdatum (jährliche Verlängerung)
      while (expiryDate < now) {
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      }
      
      console.log(`📅 Ablaufdatum angepasst von ${originalExpiry.toISOString()} auf ${expiryDate.toISOString()}`);
    }
    
    const createdDate = new Date(contract.createdAt || contract.uploadedAt);
    
    // 🔧 FIX: Extrahiere Notice Period aus verschiedenen Quellen
    let noticePeriodDays = 90; // Default
    
    if (contract.cancellationPeriod) {
      if (typeof contract.cancellationPeriod === 'object') {
        // Neues Format vom contractAnalyzer
        noticePeriodDays = contract.cancellationPeriod.inDays || 90;
      } else if (typeof contract.cancellationPeriod === 'string') {
        // String-Format
        noticePeriodDays = extractNoticePeriod(contract.cancellationPeriod);
      } else if (typeof contract.cancellationPeriod === 'number') {
        // Direkte Anzahl Tage
        noticePeriodDays = contract.cancellationPeriod;
      }
    } else if (contract.kuendigung) {
      // Fallback auf altes Feld
      noticePeriodDays = extractNoticePeriod(contract.kuendigung);
    }
    
    const autoRenewMonths = contract.autoRenewMonths || 12;
    
    // 🎯 Extract confidence data from contract
    const confidence = contract.endDateConfidence || contract.startDateConfidence || 100; // Default to 100 if not available
    const dataSource = contract.dataSource || 'unknown';
    const isEstimated = dataSource === 'estimated' || dataSource === 'calculated' || confidence < 60;

    // 📊 DEBUG LOG
    console.log(`📊 Event Generation für "${contract.name}":`, {
      expiryDate: expiryDate?.toISOString(),
      noticePeriodDays,
      autoRenewMonths,
      isAutoRenewal,
      confidence: `${confidence}%`,
      dataSource,
      isEstimated,
      provider: contract.provider?.displayName || contract.provider || 'Unbekannt'
    });
    
    // 🆕 GENERIERE EVENTS AUCH FÜR "ALTE" AKTIVE VERTRÄGE
    if (expiryDate) { // Entfernt die "> now" Prüfung!
      
      // 1. Kündigungsfenster öffnet
      if (noticePeriodDays > 0) {
        const tempDate = new Date(expiryDate);
        tempDate.setDate(tempDate.getDate() - noticePeriodDays);
        const cancelWindowDate = createLocalDate(tempDate);

        // Nur zukünftige Events erstellen
        if (cancelWindowDate > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "CANCEL_WINDOW_OPEN",
            title: `🟢 Kündigungsfenster öffnet: ${contract.name}`,
            description: `Ab heute können Sie "${contract.name}" kündigen. Die Kündigungsfrist beträgt ${noticePeriodDays} Tage.${isAutoRenewal ? ' (Auto-Renewal Vertrag)' : ''}`,
            date: cancelWindowDate,
            severity: "info",
            status: "scheduled",
            confidence: confidence, // ✅ Add confidence
            dataSource: dataSource, // ✅ Add data source
            isEstimated: isEstimated, // ✅ Add estimation flag
            metadata: {
              provider: contract.provider,
              noticePeriodDays,
              suggestedAction: "cancel",
              contractName: contract.name,
              expiryDate: expiryDate,
              isAutoRenewal
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Reminder 30 Tage vorher
          const tempReminderDate = new Date(cancelWindowDate);
          tempReminderDate.setDate(tempReminderDate.getDate() - 30);
          const reminderDate = createLocalDate(tempReminderDate);

          if (reminderDate > now) {
            events.push({
              userId: contract.userId,
              contractId: contract._id,
              type: "CANCEL_REMINDER",
              title: `📅 Kündigungsfrist naht: ${contract.name}`,
              description: `In 30 Tagen öffnet sich das Kündigungsfenster für "${contract.name}".${isAutoRenewal ? ' Dieser Vertrag verlängert sich automatisch!' : ''}`,
              date: reminderDate,
              severity: "info",
              status: "scheduled",
              confidence: confidence,
              dataSource: dataSource,
              isEstimated: isEstimated,
              metadata: {
                provider: contract.provider,
                daysUntilWindow: 30,
                suggestedAction: "prepare",
                contractName: contract.name,
                isAutoRenewal
              },
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
      
      // 2. Letzter Kündigungstag
      if (noticePeriodDays > 0) {
        const tempLastDate = new Date(expiryDate);
        tempLastDate.setDate(tempLastDate.getDate() - noticePeriodDays); // Letzter Tag der Kündigungsfrist
        const lastCancelDate = createLocalDate(tempLastDate);

        if (lastCancelDate > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "LAST_CANCEL_DAY",
            title: `🔴 LETZTER TAG: ${contract.name} kündigen!`,
            description: `Heute ist die letzte Chance, "${contract.name}" zu kündigen. ${isAutoRenewal ? `Der Vertrag verlängert sich sonst automatisch um ${autoRenewMonths} Monate!` : 'Sonst verlängert sich der Vertrag!'}`,
            date: lastCancelDate,
            severity: "critical",
            status: "scheduled",
            confidence: confidence,
            dataSource: dataSource,
            isEstimated: isEstimated,
            metadata: {
              provider: contract.provider,
              autoRenewMonths,
              suggestedAction: "cancel",
              urgent: true,
              contractName: contract.name,
              expiryDate: expiryDate,
              isAutoRenewal
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Warnung 7 Tage vorher
          const tempWarningDate = new Date(lastCancelDate);
          tempWarningDate.setDate(tempWarningDate.getDate() - 7);
          const warningDate = createLocalDate(tempWarningDate);

          if (warningDate > now) {
            events.push({
              userId: contract.userId,
              contractId: contract._id,
              type: "CANCEL_WARNING",
              title: `⚠️ Nur noch 7 Tage: ${contract.name}`,
              description: `In 7 Tagen endet die Kündigungsfrist für "${contract.name}". ${isAutoRenewal ? 'Auto-Renewal Vertrag - handeln Sie jetzt!' : 'Handeln Sie jetzt!'}`,
              date: warningDate,
              severity: "warning",
              status: "scheduled",
              confidence: confidence,
              dataSource: dataSource,
              isEstimated: isEstimated,
              metadata: {
                provider: contract.provider,
                daysLeft: 7,
                suggestedAction: "cancel",
                contractName: contract.name,
                isAutoRenewal
              },
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
      
      // 3. Automatische Verlängerung
      if (expiryDate > now) {
        const renewalDate = createLocalDate(expiryDate);
        events.push({
          userId: contract.userId,
          contractId: contract._id,
          type: "AUTO_RENEWAL",
          title: `🔄 ${isAutoRenewal ? 'Automatische' : 'Mögliche'} Verlängerung: ${contract.name}`,
          description: `"${contract.name}" ${isAutoRenewal ? 'verlängert sich heute automatisch' : 'könnte sich heute verlängern'} um ${autoRenewMonths} Monate, falls nicht gekündigt wurde.`,
          date: renewalDate,
          severity: isAutoRenewal ? "critical" : "warning",
          status: "scheduled",
          confidence: confidence,
          dataSource: dataSource,
          isEstimated: isEstimated,
          metadata: {
            provider: contract.provider,
            autoRenewMonths,
            newExpiryDate: calculateNewExpiryDate(expiryDate, autoRenewMonths),
            suggestedAction: "review",
            contractName: contract.name,
            isAutoRenewal
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // 4. Preissteigerung (falls erkannt)
      if (contract.priceIncreaseDate) {
        const priceIncreaseDate = createLocalDate(contract.priceIncreaseDate);

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
            confidence: confidence,
            dataSource: dataSource,
            isEstimated: isEstimated,
            metadata: {
              provider: contract.provider,
              oldPrice: contract.amount,
              newPrice: contract.newPrice,
              suggestedAction: "compare",
              contractName: contract.name,
              isAutoRenewal
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
          
          // Vorwarnung 30 Tage vorher
          const tempPriceWarningDate = new Date(priceIncreaseDate);
          tempPriceWarningDate.setDate(tempPriceWarningDate.getDate() - 30);
          const priceWarningDate = createLocalDate(tempPriceWarningDate);

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
              confidence: confidence,
              dataSource: dataSource,
              isEstimated: isEstimated,
              metadata: {
                provider: contract.provider,
                daysUntilIncrease: 30,
                suggestedAction: "compare",
                contractName: contract.name,
                isAutoRenewal
              },
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
      
      // 5. Jährliches Review (für langfristige Verträge)
      const tempReviewDate = new Date(createdDate);
      tempReviewDate.setFullYear(tempReviewDate.getFullYear() + 1);
      const oneYearFromCreation = createLocalDate(tempReviewDate);

      if (oneYearFromCreation > now && oneYearFromCreation < expiryDate) {
        events.push({
          userId: contract.userId,
          contractId: contract._id,
          type: "REVIEW",
          title: `🔍 Jahres-Review: ${contract.name}`,
          description: `Zeit für einen Check: Ist "${contract.name}" noch optimal für Sie? ${isAutoRenewal ? 'Dieser Vertrag verlängert sich automatisch.' : 'Prüfen Sie Alternativen!'}`,
          date: oneYearFromCreation,
          severity: "info",
          status: "scheduled",
          confidence: confidence,
          dataSource: dataSource,
          isEstimated: isEstimated,
          metadata: {
            provider: contract.provider,
            contractAge: "1 Jahr",
            suggestedAction: "review",
            contractName: contract.name,
            isAutoRenewal
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
      
      // 6. Vertragsablauf
      if (expiryDate > now) {
        const contractExpiryDate = createLocalDate(expiryDate);
        events.push({
          userId: contract.userId,
          contractId: contract._id,
          type: "CONTRACT_EXPIRY",
          title: `📋 Vertrag ${isAutoRenewal ? 'verlängert sich' : 'läuft ab'}: ${contract.name}`,
          description: `"${contract.name}" ${isAutoRenewal ? 'verlängert sich heute automatisch, falls nicht gekündigt' : 'läuft heute ab'}.`,
          date: contractExpiryDate,
          severity: isAutoRenewal ? "warning" : "info",
          status: "scheduled",
          confidence: confidence,
          dataSource: dataSource,
          isEstimated: isEstimated,
          metadata: {
            provider: contract.provider,
            suggestedAction: isAutoRenewal ? "check" : "archive",
            contractName: contract.name,
            isAutoRenewal
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } else if (!expiryDate) {
      // 🔧 FIX: Log wenn keine Daten vorhanden
      console.log(`⚠️ Keine Ablaufdaten für "${contract.name}" gefunden. Events können nicht generiert werden.`);
    }
    
    // Speichere Events in DB (update or insert)
    if (events.length > 0) {
      // 🔍 DEBUG: Log event data BEFORE saving to DB
      console.log(`🔍 DEBUG: Speichere ${events.length} Events:`);
      events.forEach((e, idx) => {
        console.log(`  Event ${idx + 1}: ${e.type} - Datum: ${e.date.toISOString()} (Local: ${e.date})`);
      });

      // Lösche alte Events für diesen Vertrag
      await db.collection("contract_events").deleteMany({
        contractId: contract._id,
        status: "scheduled" // Nur geplante Events löschen, nicht bereits bearbeitete
      });

      // Füge neue Events ein
      const result = await db.collection("contract_events").insertMany(events);
      console.log(`✅ ${result.insertedCount} Events für Vertrag "${contract.name}" generiert${isAutoRenewal ? ' (Auto-Renewal)' : ''}`);
    } else {
      console.log(`ℹ️ Keine Events für "${contract.name}" generiert (keine relevanten Daten oder alle Events in Vergangenheit)`);
    }
    
  } catch (error) {
    console.error(`❌ Fehler beim Generieren von Events für Vertrag ${contract._id}:`, error);
  }
  
  return events;
}

/**
 * Extrahiert die Kündigungsfrist in Tagen aus dem Kündigungstext
 * 🔧 FIX: Unterstützt jetzt Object-Format vom contractAnalyzer
 */
function extractNoticePeriod(input) {
  // Handle object format from contractAnalyzer
  if (typeof input === 'object' && input !== null) {
    if (input.inDays) return input.inDays;
    if (input.value && input.unit) {
      const multipliers = {
        'days': 1,
        'day': 1,
        'weeks': 7,
        'week': 7,
        'months': 30,
        'month': 30
      };
      return input.value * (multipliers[input.unit] || 30);
    }
  }
  
  // Handle string format (legacy)
  if (!input || typeof input !== 'string') return 90; // Default: 3 Monate
  
  const text = input.toLowerCase();
  
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
    console.log(`📅 Calendar Hook: ${action} für Vertrag "${contract.name}"${contract.isAutoRenewal ? ' (Auto-Renewal)' : ''}`);
    
    // Generiere Events für den Vertrag
    await generateEventsForContract(db, contract);
    
    // Optional: Sende Bestätigungs-Email
    if (action === "create") {
      // TODO: Email-Service benachrichtigen
      console.log(`📧 Neue Events für "${contract.name}" erstellt${contract.isAutoRenewal ? ' (Auto-Renewal Vertrag)' : ''}`);
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