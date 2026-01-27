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

// 🔒 KONFIDENZ-SCHWELLENWERTE für Event-Generierung
const EVENT_CONFIDENCE_THRESHOLDS = {
  CRITICAL_EVENTS: 50,    // Kündigungs-Events: Auch bei niedrigerer Konfidenz erstellen (wichtig!)
  STANDARD_EVENTS: 60,    // Standard-Events: Mittlere Konfidenz erforderlich
  REMINDER_EVENTS: 50     // Reminder: Auch bei niedrigerer Konfidenz
};

/**
 * Generiert automatisch Kalenderereignisse basierend auf Vertragsdaten
 * NEU: Unterstützt Auto-Renewal für "alte" aber aktive Verträge
 * 🔒 NEU: Konfidenz-basierte Event-Generierung
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

      // 🔔 7. Custom Reminder Events (User-defined)
      if (contract.reminderDays && Array.isArray(contract.reminderDays) && contract.reminderDays.length > 0) {
        console.log(`🔔 Generiere ${contract.reminderDays.length} Custom Reminders für "${contract.name}"`);

        for (const days of contract.reminderDays) {
          const tempReminderDate = new Date(expiryDate);
          tempReminderDate.setDate(tempReminderDate.getDate() - days);
          const customReminderDate = createLocalDate(tempReminderDate);

          // Nur zukünftige Reminders erstellen
          if (customReminderDate > now) {
            const severity = days <= 7 ? "critical" : days <= 30 ? "warning" : "info";

            events.push({
              userId: contract.userId,
              contractId: contract._id,
              type: "CUSTOM_REMINDER",
              title: `🔔 Erinnerung: ${contract.name} läuft in ${days} Tagen ab`,
              description: `"${contract.name}" läuft in ${days} Tagen ab (am ${expiryDate.toLocaleDateString('de-DE')}).${isAutoRenewal ? ' Dieser Vertrag verlängert sich automatisch, falls nicht gekündigt!' : ' Jetzt handeln!'}`,
              date: customReminderDate,
              severity: severity,
              status: "scheduled",
              confidence: confidence,
              dataSource: dataSource,
              isEstimated: isEstimated,
              metadata: {
                provider: contract.provider,
                daysUntilExpiry: days,
                expiryDate: expiryDate,
                suggestedAction: "review",
                contractName: contract.name,
                isAutoRenewal,
                customReminder: true
              },
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }
        }
      }
    }

    // 💰 8. Recurring Payment Events (Wiederkehrende Zahlungen)
    if (contract.paymentFrequency && contract.amount) {
      console.log(`💰 Generiere Recurring Payment Events für "${contract.name}" (${contract.paymentFrequency})`);

      const recurringEvents = generateRecurringPaymentEvents(contract, now, confidence, dataSource, isEstimated);
      events.push(...recurringEvents);
    }

    // 🆕 9. DYNAMISCHE QUICKFACTS-FELDER Events

    // 9a. Gekündigt zum - Event für bestätigte Kündigung
    // Das gekuendigtZum ist das ZUKÜNFTIGE Datum wann der Vertrag endet (nach erfolgter Kündigung)
    if (contract.gekuendigtZum) {
      const gekuendigtDate = createLocalDate(contract.gekuendigtZum);

      // Nur für zukünftige Kündigungsdaten Events erstellen
      if (gekuendigtDate > now) {
        console.log(`📅 Kündigungsbestätigung: Vertragsende am ${gekuendigtDate.toLocaleDateString('de-DE')}`);

        events.push({
          userId: contract.userId,
          contractId: contract._id,
          type: "CANCELLATION_DATE",
          title: `✅ Vertragsende: ${contract.name}`,
          description: `"${contract.name}" endet heute wie bestätigt. Der Vertrag wurde erfolgreich gekündigt.`,
          date: gekuendigtDate,
          severity: "info",
          status: "scheduled",
          confidence: confidence,
          dataSource: dataSource,
          isEstimated: isEstimated,
          metadata: {
            provider: contract.provider,
            contractName: contract.name,
            suggestedAction: "archive",
            isCancelled: true
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Reminder 30 Tage vorher
        const tempReminder30 = new Date(gekuendigtDate);
        tempReminder30.setDate(tempReminder30.getDate() - 30);
        const reminder30Date = createLocalDate(tempReminder30);

        if (reminder30Date > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "CANCELLATION_REMINDER",
            title: `📅 Vertrag endet in 30 Tagen: ${contract.name}`,
            description: `"${contract.name}" endet in 30 Tagen (am ${gekuendigtDate.toLocaleDateString('de-DE')}). Ggf. nach Alternativen suchen!`,
            date: reminder30Date,
            severity: "info",
            status: "scheduled",
            confidence: confidence,
            dataSource: dataSource,
            isEstimated: isEstimated,
            metadata: {
              provider: contract.provider,
              contractName: contract.name,
              daysUntil: 30,
              suggestedAction: "prepare"
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        // Reminder 7 Tage vorher
        const tempReminder7 = new Date(gekuendigtDate);
        tempReminder7.setDate(tempReminder7.getDate() - 7);
        const reminder7Date = createLocalDate(tempReminder7);

        if (reminder7Date > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "CANCELLATION_REMINDER",
            title: `⏰ Vertrag endet in 7 Tagen: ${contract.name}`,
            description: `"${contract.name}" endet in 7 Tagen! Zeit für letzte Vorbereitungen.`,
            date: reminder7Date,
            severity: "warning",
            status: "scheduled",
            confidence: confidence,
            dataSource: dataSource,
            isEstimated: isEstimated,
            metadata: {
              provider: contract.provider,
              contractName: contract.name,
              daysUntil: 7,
              suggestedAction: "finalize"
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } else {
        console.log(`⚠️ gekuendigtZum in der Vergangenheit - kein Event erstellt: ${gekuendigtDate.toLocaleDateString('de-DE')}`);
      }
    }

    // 🆕 9b. MINDESTLAUFZEIT ENDE - "Jetzt kündbar!" Event
    // Wenn canCancelAfterDate gesetzt ist (z.B. "Kündigung ab 6. Monat möglich")
    if (contract.canCancelAfterDate) {
      const canCancelDate = createLocalDate(contract.canCancelAfterDate);

      if (canCancelDate > now) {
        console.log(`📅 Mindestlaufzeit: Kündbar ab ${canCancelDate.toLocaleDateString('de-DE')}`);

        // Haupt-Event: Jetzt kündbar!
        events.push({
          userId: contract.userId,
          contractId: contract._id,
          type: "MINIMUM_TERM_END",
          title: `🔓 Jetzt kündbar: ${contract.name}`,
          description: `"${contract.name}" kann ab heute gekündigt werden! Die Mindestlaufzeit ist abgelaufen.`,
          date: canCancelDate,
          severity: "info",
          status: "scheduled",
          confidence: confidence,
          dataSource: dataSource,
          isEstimated: isEstimated,
          metadata: {
            provider: contract.provider,
            contractName: contract.name,
            minimumTermMonths: contract.minimumTerm?.months || null,
            suggestedAction: "review_cancel"
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Reminder 14 Tage vorher
        const tempReminder14 = new Date(canCancelDate);
        tempReminder14.setDate(tempReminder14.getDate() - 14);
        const reminder14Date = createLocalDate(tempReminder14);

        if (reminder14Date > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "MINIMUM_TERM_REMINDER",
            title: `📅 In 2 Wochen kündbar: ${contract.name}`,
            description: `"${contract.name}" kann in 2 Wochen gekündigt werden. Die Mindestlaufzeit endet am ${canCancelDate.toLocaleDateString('de-DE')}.`,
            date: reminder14Date,
            severity: "info",
            status: "scheduled",
            confidence: confidence,
            dataSource: dataSource,
            isEstimated: isEstimated,
            metadata: {
              provider: contract.provider,
              contractName: contract.name,
              daysUntil: 14,
              suggestedAction: "prepare"
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }

        // Reminder 7 Tage vorher
        const tempReminder7 = new Date(canCancelDate);
        tempReminder7.setDate(tempReminder7.getDate() - 7);
        const reminder7Date = createLocalDate(tempReminder7);

        if (reminder7Date > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "MINIMUM_TERM_REMINDER",
            title: `⏰ In 7 Tagen kündbar: ${contract.name}`,
            description: `"${contract.name}" kann in 7 Tagen gekündigt werden. Überlege ob du kündigen möchtest!`,
            date: reminder7Date,
            severity: "warning",
            status: "scheduled",
            confidence: confidence,
            dataSource: dataSource,
            isEstimated: isEstimated,
            metadata: {
              provider: contract.provider,
              contractName: contract.name,
              daysUntil: 7,
              suggestedAction: "decide"
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      } else {
        // Mindestlaufzeit bereits abgelaufen - noch keinen "jetzt kündbar" Status setzen?
        console.log(`ℹ️ Mindestlaufzeit bereits abgelaufen: ${canCancelDate.toLocaleDateString('de-DE')} - Vertrag ist jetzt kündbar`);
      }
    }

    // 9c. Probezeit-Ende (bei Arbeitsverträgen mit startDate)
    // Fallback: Wenn probezeit oder arbeitsbeginn gesetzt ist, ist es ein Arbeitsvertrag
    const isArbeitsvertrag = contract.documentCategory === 'arbeitsvertrag' ||
                             contract.probezeit ||
                             contract.arbeitsbeginn ||
                             (contract.name && contract.name.toLowerCase().includes('arbeitsvertrag'));
    if (contract.startDate && isArbeitsvertrag) {
      const startDate = new Date(contract.startDate);
      const probezeitEnde = new Date(startDate);
      probezeitEnde.setMonth(probezeitEnde.getMonth() + 6); // Standard: 6 Monate
      const probezeitDate = createLocalDate(probezeitEnde);

      if (probezeitDate > now) {
        events.push({
          userId: contract.userId,
          contractId: contract._id,
          type: "PROBATION_END",
          title: `👔 Probezeit endet: ${contract.name}`,
          description: `Die Probezeit für "${contract.name}" endet heute. Ab jetzt gelten die normalen Kündigungsfristen.`,
          date: probezeitDate,
          severity: "info",
          status: "scheduled",
          confidence: confidence,
          dataSource: dataSource,
          isEstimated: isEstimated,
          metadata: {
            provider: contract.provider,
            contractName: contract.name,
            startDate: startDate,
            suggestedAction: "review"
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Reminder 14 Tage vorher
        const tempReminderDate = new Date(probezeitDate);
        tempReminderDate.setDate(tempReminderDate.getDate() - 14);
        const reminderDate = createLocalDate(tempReminderDate);

        if (reminderDate > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "PROBATION_REMINDER",
            title: `📅 Probezeit endet in 2 Wochen: ${contract.name}`,
            description: `In 2 Wochen endet die Probezeit für "${contract.name}". Zeit für ein Gespräch!`,
            date: reminderDate,
            severity: "info",
            status: "scheduled",
            confidence: confidence,
            dataSource: dataSource,
            isEstimated: isEstimated,
            metadata: {
              provider: contract.provider,
              contractName: contract.name,
              daysUntil: 14,
              suggestedAction: "prepare"
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }

    // 9c. Gewährleistung-Ende (bei Kaufverträgen)
    // Fallback: Wenn kaufdatum oder kaufpreis gesetzt ist, oder Name "Kaufvertrag" enthält
    const isKaufvertrag = contract.documentCategory === 'kaufvertrag' ||
                          contract.kaufdatum ||
                          contract.kaufpreis ||
                          (contract.name && contract.name.toLowerCase().includes('kaufvertrag'));
    if (contract.kaufdatum || (contract.startDate && isKaufvertrag)) {
      const kaufDate = new Date(contract.kaufdatum || contract.startDate);
      const gewaehrleistungEnde = new Date(kaufDate);
      gewaehrleistungEnde.setFullYear(gewaehrleistungEnde.getFullYear() + 2); // 2 Jahre Gewährleistung
      const gewaehrleistungDate = createLocalDate(gewaehrleistungEnde);

      if (gewaehrleistungDate > now) {
        events.push({
          userId: contract.userId,
          contractId: contract._id,
          type: "WARRANTY_END",
          title: `🛡️ Gewährleistung endet: ${contract.name}`,
          description: `Die gesetzliche Gewährleistung für "${contract.name}" endet heute (2 Jahre nach Kauf).`,
          date: gewaehrleistungDate,
          severity: "warning",
          status: "scheduled",
          confidence: confidence,
          dataSource: dataSource,
          isEstimated: isEstimated,
          metadata: {
            provider: contract.provider,
            contractName: contract.name,
            purchaseDate: kaufDate,
            suggestedAction: "check"
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Reminder 30 Tage vorher
        const tempReminderDate = new Date(gewaehrleistungDate);
        tempReminderDate.setDate(tempReminderDate.getDate() - 30);
        const reminderDate = createLocalDate(tempReminderDate);

        if (reminderDate > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "WARRANTY_REMINDER",
            title: `📅 Gewährleistung endet in 30 Tagen: ${contract.name}`,
            description: `In 30 Tagen endet die Gewährleistung für "${contract.name}". Prüfen Sie, ob alles in Ordnung ist!`,
            date: reminderDate,
            severity: "info",
            status: "scheduled",
            confidence: confidence,
            dataSource: dataSource,
            isEstimated: isEstimated,
            metadata: {
              provider: contract.provider,
              contractName: contract.name,
              daysUntil: 30,
              suggestedAction: "check"
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }

    // 9d. Mietvertrag-Jubiläum (bei Mietverträgen)
    // Fallback: Wenn mietbeginn, miete oder Name "Mietvertrag" enthält
    const isMietvertrag = contract.documentCategory === 'mietvertrag' ||
                          contract.mietbeginn ||
                          contract.monatlicheMiete ||
                          (contract.name && contract.name.toLowerCase().includes('mietvertrag'));
    if (contract.mietbeginn || (contract.startDate && isMietvertrag)) {
      const mietbeginnDate = new Date(contract.mietbeginn || contract.startDate);

      // Jährliches Jubiläum für die nächsten 2 Jahre
      for (let i = 1; i <= 2; i++) {
        const jubilaeumDate = new Date(mietbeginnDate);
        jubilaeumDate.setFullYear(now.getFullYear() + i);

        // Nur wenn das Jubiläum in der Zukunft liegt
        if (jubilaeumDate > now) {
          const yearsRented = now.getFullYear() + i - mietbeginnDate.getFullYear();
          const jubiDate = createLocalDate(jubilaeumDate);

          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "RENT_ANNIVERSARY",
            title: `🏠 ${yearsRented} Jahre Mietverhältnis: ${contract.name}`,
            description: `Heute vor ${yearsRented} Jahren begann das Mietverhältnis für "${contract.name}". Zeit für eine Bestandsaufnahme!`,
            date: jubiDate,
            severity: "info",
            status: "scheduled",
            confidence: confidence,
            dataSource: dataSource,
            isEstimated: isEstimated,
            metadata: {
              provider: contract.provider,
              contractName: contract.name,
              yearsRented: yearsRented,
              mietbeginn: mietbeginnDate,
              suggestedAction: "review"
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
          break; // Nur das nächste Jubiläum
        }
      }
    }

    // 9e. Restlaufzeit-Erinnerung (bei Verträgen mit Restlaufzeit)
    if (contract.restlaufzeit) {
      // Parse Restlaufzeit (z.B. "3 Monate", "45 Tage")
      const restTage = parseRestlaufzeit(contract.restlaufzeit);

      if (restTage > 0) {
        const restlaufzeitEnde = new Date(now);
        restlaufzeitEnde.setDate(restlaufzeitEnde.getDate() + restTage);
        const restlaufzeitDate = createLocalDate(restlaufzeitEnde);

        events.push({
          userId: contract.userId,
          contractId: contract._id,
          type: "REMAINING_TIME_END",
          title: `⏰ Restlaufzeit endet: ${contract.name}`,
          description: `Die Restlaufzeit von "${contract.name}" (${contract.restlaufzeit}) endet heute.`,
          date: restlaufzeitDate,
          severity: "warning",
          status: "scheduled",
          confidence: confidence,
          dataSource: dataSource,
          isEstimated: isEstimated,
          metadata: {
            provider: contract.provider,
            contractName: contract.name,
            restlaufzeit: contract.restlaufzeit,
            suggestedAction: "review"
          },
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    }

    if (!expiryDate && !contract.paymentFrequency && !contract.gekuendigtZum && !contract.startDate && !contract.kaufdatum && !contract.mietbeginn) {
      // 🔧 FIX: Log wenn keine Daten vorhanden
      console.log(`⚠️ Keine Ablaufdaten für "${contract.name}" gefunden. Events können nicht generiert werden.`);
    }

    // 🆕 10. KI-ERKANNTE WICHTIGE DATUMS (importantDates von GPT-4)
    // Diese Datums wurden von der KI aus dem Vertragstext extrahiert oder berechnet
    if (contract.importantDates && Array.isArray(contract.importantDates)) {
      console.log(`🤖 ${contract.importantDates.length} KI-erkannte Datums für "${contract.name}" gefunden`);

      // Mapping von KI-Typen zu Event-Typen (VOLLSTÄNDIG für alle Vertragsarten)
      const typeMapping = {
        // 📋 STANDARD-DATUMS
        'start_date': { eventType: 'CONTRACT_START', emoji: '📝', severity: 'info' },
        'end_date': { eventType: 'CONTRACT_END', emoji: '📅', severity: 'warning' },
        'cancellation_deadline': { eventType: 'CANCEL_DEADLINE', emoji: '⚠️', severity: 'critical' },
        'minimum_term_end': { eventType: 'MINIMUM_TERM_END', emoji: '🔓', severity: 'info' },
        'probation_end': { eventType: 'PROBATION_END', emoji: '👔', severity: 'warning' },
        'warranty_end': { eventType: 'WARRANTY_END', emoji: '🛡️', severity: 'warning' },
        'renewal_date': { eventType: 'AUTO_RENEWAL', emoji: '🔄', severity: 'warning' },
        'payment_due': { eventType: 'PAYMENT_DUE', emoji: '💰', severity: 'warning' },
        'notice_period_start': { eventType: 'NOTICE_PERIOD', emoji: '📬', severity: 'critical' },
        'contract_signed': { eventType: 'CONTRACT_SIGNED', emoji: '✍️', severity: 'info' },
        'service_start': { eventType: 'SERVICE_START', emoji: '▶️', severity: 'info' },

        // 🛡️ VERSICHERUNGEN
        'insurance_coverage_end': { eventType: 'INSURANCE_END', emoji: '🛡️', severity: 'critical' },

        // 📦 ABOS/SOFTWARE
        'trial_end': { eventType: 'TRIAL_END', emoji: '⏳', severity: 'critical' },
        'license_expiry': { eventType: 'LICENSE_EXPIRY', emoji: '🔑', severity: 'critical' },

        // ⚡ ENERGIE/TELEKOM
        'price_guarantee_end': { eventType: 'PRICE_GUARANTEE_END', emoji: '💶', severity: 'warning' },

        // 🚗 KFZ/LEASING
        'inspection_due': { eventType: 'INSPECTION_DUE', emoji: '🔧', severity: 'warning' },
        'lease_end': { eventType: 'LEASE_END', emoji: '🚗', severity: 'critical' },
        'option_deadline': { eventType: 'OPTION_DEADLINE', emoji: '⏰', severity: 'critical' },

        // 🏦 KREDITE/FINANZIERUNG
        'loan_end': { eventType: 'LOAN_END', emoji: '🏦', severity: 'info' },
        'interest_rate_change': { eventType: 'INTEREST_RATE_CHANGE', emoji: '📈', severity: 'critical' },

        // 📦 LIEFERUNGEN
        'delivery_date': { eventType: 'DELIVERY', emoji: '📦', severity: 'info' },

        // 🔄 SONSTIGE
        'other': { eventType: 'CUSTOM_DATE', emoji: '📌', severity: 'info' }
      };

      for (const importantDate of contract.importantDates) {
        if (!importantDate.date) continue;

        const dateObj = createLocalDate(importantDate.date);
        const mapping = typeMapping[importantDate.type] || typeMapping['other'];

        // Nur zukünftige Datums als Events
        if (dateObj > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: mapping.eventType,
            title: `${mapping.emoji} ${importantDate.label}: ${contract.name}`,
            description: importantDate.description || `KI-erkanntes Datum für "${contract.name}"`,
            date: dateObj,
            severity: mapping.severity,
            status: "scheduled",
            confidence: importantDate.calculated ? 75 : 95,
            dataSource: importantDate.calculated ? 'ai_calculated' : 'ai_extracted',
            isEstimated: importantDate.calculated || false,
            metadata: {
              provider: contract.provider,
              contractName: contract.name,
              aiExtracted: true,
              source: importantDate.source || 'KI-Analyse',
              originalType: importantDate.type
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });

          // 🏛️ KANZLEI-NIVEAU: Professionelle Reminder-Staffelung
          // Kritische Termine: 30, 14, 7, 3 Tage vorher
          // Wichtige Termine: 14, 7 Tage vorher
          // Normale Termine: 7 Tage vorher

          const reminderConfig = {
            critical: [
              { days: 30, emoji: '📅', urgency: 'info', label: 'In 30 Tagen' },
              { days: 14, emoji: '⚠️', urgency: 'warning', label: 'In 2 Wochen' },
              { days: 7, emoji: '🚨', urgency: 'warning', label: 'In 7 Tagen' },
              { days: 3, emoji: '🔴', urgency: 'critical', label: 'In 3 Tagen - DRINGEND' }
            ],
            warning: [
              { days: 14, emoji: '📅', urgency: 'info', label: 'In 2 Wochen' },
              { days: 7, emoji: '⚠️', urgency: 'warning', label: 'In 7 Tagen' }
            ],
            info: [
              { days: 7, emoji: '📅', urgency: 'info', label: 'In 7 Tagen' }
            ]
          };

          const reminders = reminderConfig[mapping.severity] || reminderConfig.info;

          for (const reminder of reminders) {
            const reminderDate = new Date(dateObj);
            reminderDate.setDate(reminderDate.getDate() - reminder.days);

            if (reminderDate > now) {
              events.push({
                userId: contract.userId,
                contractId: contract._id,
                type: `${mapping.eventType}_REMINDER_${reminder.days}D`,
                title: `${reminder.emoji} ${reminder.label}: ${importantDate.label}`,
                description: `"${contract.name}": ${importantDate.description || importantDate.label} - Noch ${reminder.days} Tage!`,
                date: createLocalDate(reminderDate),
                severity: reminder.urgency,
                status: "scheduled",
                confidence: importantDate.calculated ? 70 : 90,
                dataSource: 'ai_reminder',
                isEstimated: true,
                metadata: {
                  provider: contract.provider,
                  contractName: contract.name,
                  daysUntil: reminder.days,
                  originalEvent: mapping.eventType,
                  reminderType: `${reminder.days}_days`
                },
                createdAt: new Date(),
                updatedAt: new Date()
              });
            }
          }

          console.log(`  ✅ KI-Datum: ${importantDate.type} → ${dateObj.toLocaleDateString('de-DE')} (${importantDate.label})`);
        } else {
          console.log(`  ⚠️ KI-Datum in Vergangenheit übersprungen: ${importantDate.type} → ${dateObj.toLocaleDateString('de-DE')}`);
        }
      }
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
 * Parst Restlaufzeit-Strings und gibt die Anzahl der Tage zurück
 * z.B. "3 Monate" → 90, "45 Tage" → 45, "1 Jahr" → 365
 */
function parseRestlaufzeit(restlaufzeit) {
  if (!restlaufzeit || typeof restlaufzeit !== 'string') return 0;

  const text = restlaufzeit.toLowerCase().trim();

  // Suche nach Mustern
  const patterns = [
    { regex: /(\d+)\s*jahr/i, multiplier: 365 },
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

  // Versuche direkte Zahl zu parsen
  const directNumber = parseInt(text);
  if (!isNaN(directNumber)) {
    return directNumber; // Annahme: Tage
  }

  return 0;
}

/**
 * Generiert wiederkehrende Zahlungs-Events für Abonnements
 * Erstellt Events für die nächsten 12 Monate basierend auf paymentFrequency
 */
function generateRecurringPaymentEvents(contract, now, confidence, dataSource, isEstimated) {
  const events = [];
  const paymentFrequency = contract.paymentFrequency?.toLowerCase();
  const amount = contract.amount || contract.paymentAmount;

  if (!paymentFrequency || !amount) return events;

  // Bestimme Startdatum für Zahlungs-Events
  let startDate = contract.subscriptionStartDate
    ? new Date(contract.subscriptionStartDate)
    : contract.createdAt
      ? new Date(contract.createdAt)
      : now;

  // Wenn das Startdatum in der Vergangenheit liegt, finde das nächste zukünftige Zahlungsdatum
  if (startDate < now) {
    startDate = calculateNextPaymentDate(startDate, now, paymentFrequency);
  }

  // Generiere Events für die nächsten 12 Monate
  const endDate = new Date(now);
  endDate.setMonth(endDate.getMonth() + 12);

  let currentPaymentDate = new Date(startDate);
  let paymentCount = 0;
  const maxPayments = 50; // Sicherheitslimit

  while (currentPaymentDate <= endDate && paymentCount < maxPayments) {
    // Nur zukünftige Events erstellen
    if (currentPaymentDate > now) {
      const paymentDate = createLocalDate(currentPaymentDate);
      const daysUntilPayment = Math.ceil((paymentDate - now) / (1000 * 60 * 60 * 24));

      // Bestimme Severity basierend auf Nähe
      const severity = daysUntilPayment <= 3 ? "warning" : "info";

      events.push({
        userId: contract.userId,
        contractId: contract._id,
        type: "RECURRING_PAYMENT",
        title: `💳 Zahlung fällig: ${contract.name}`,
        description: `${getPaymentFrequencyText(paymentFrequency)} Zahlung von ${amount.toFixed(2)}€ für "${contract.name}" wird heute fällig.`,
        date: paymentDate,
        severity: severity,
        status: "scheduled",
        confidence: confidence,
        dataSource: dataSource,
        isEstimated: isEstimated,
        metadata: {
          provider: contract.provider,
          amount: amount,
          paymentFrequency: paymentFrequency,
          suggestedAction: "review",
          contractName: contract.name,
          isRecurring: true,
          paymentNumber: paymentCount + 1
        },
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Reminder 3 Tage vorher (nur für höhere Beträge)
      if (amount >= 50 && daysUntilPayment > 3) {
        const tempReminderDate = new Date(paymentDate);
        tempReminderDate.setDate(tempReminderDate.getDate() - 3);
        const reminderDate = createLocalDate(tempReminderDate);

        if (reminderDate > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "PAYMENT_REMINDER",
            title: `🔔 Zahlung in 3 Tagen: ${contract.name}`,
            description: `In 3 Tagen wird eine Zahlung von ${amount.toFixed(2)}€ für "${contract.name}" fällig.`,
            date: reminderDate,
            severity: "info",
            status: "scheduled",
            confidence: confidence,
            dataSource: dataSource,
            isEstimated: isEstimated,
            metadata: {
              provider: contract.provider,
              amount: amount,
              daysUntilPayment: 3,
              suggestedAction: "prepare",
              contractName: contract.name,
              isRecurring: true
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
        }
      }
    }

    // Berechne nächstes Zahlungsdatum
    currentPaymentDate = getNextPaymentDate(currentPaymentDate, paymentFrequency);
    paymentCount++;
  }

  return events;
}

/**
 * Berechnet das nächste Zahlungsdatum basierend auf Frequenz
 */
function getNextPaymentDate(currentDate, frequency) {
  const nextDate = new Date(currentDate);

  switch (frequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'biweekly':
      nextDate.setDate(nextDate.getDate() + 14);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'semiannually':
      nextDate.setMonth(nextDate.getMonth() + 6);
      break;
    case 'yearly':
    case 'annually':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
    default:
      // Default to monthly
      nextDate.setMonth(nextDate.getMonth() + 1);
  }

  return nextDate;
}

/**
 * Findet das nächste zukünftige Zahlungsdatum ausgehend von einem vergangenen Startdatum
 */
function calculateNextPaymentDate(startDate, now, frequency) {
  let nextDate = new Date(startDate);
  const maxIterations = 1000; // Sicherheitslimit
  let iterations = 0;

  // Iteriere bis wir ein zukünftiges Datum haben
  while (nextDate <= now && iterations < maxIterations) {
    nextDate = getNextPaymentDate(nextDate, frequency);
    iterations++;
  }

  return nextDate;
}

/**
 * Gibt einen lesbaren Text für die Zahlungsfrequenz zurück
 */
function getPaymentFrequencyText(frequency) {
  const texts = {
    'weekly': 'Wöchentliche',
    'biweekly': 'Zweiwöchentliche',
    'monthly': 'Monatliche',
    'quarterly': 'Vierteljährliche',
    'semiannually': 'Halbjährliche',
    'yearly': 'Jährliche',
    'annually': 'Jährliche'
  };

  return texts[frequency] || 'Regelmäßige';
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