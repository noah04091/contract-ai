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
// Abgesenkt 26.05.2026 (Problem F, Schritt 1): von 50/60 auf 30/40.
// Begründung: andere Validatoren (Phantom-Filter, Evidence-Validator,
// Plausibility-Check) blocken Halluzinationen schon vorher. Die Konfidenz-
// Schwelle war hardcoded und filterte ehrliche niedrige Werte weg. Jetzt
// liefert GPT echte Konfidenz (0-100), und der Calendar zeigt mehr Datums
// — bei <60 mit visueller Unsicherheits-Warnung (Frontend-Badge, Schritt 2).
const EVENT_CONFIDENCE_THRESHOLDS = {
  CRITICAL_EVENTS: 30,    // Kündigungs-Events: Auch bei niedriger Konfidenz erstellen (Sicherheits-Layer schützt vor Phantomen)
  STANDARD_EVENTS: 40,    // Standard-Events: Niedrigere Schwelle für mehr Sichtbarkeit
  REMINDER_EVENTS: 30     // Reminder: Auch bei niedriger Konfidenz
};

// 🛡️ Whitelist für historische Calendar-Events: Nur "echte Vertragsereignisse"
// landen als Past-Events im Kalender. Metadaten (Ausdruckdatum, Gesetzes-
// Verweise, sonstige Detaildatums) bleiben in contract.importantDates erhalten,
// werden aber nicht als Kalender-Termine angezeigt — das vermeidet Lärm.
// FUTURE-Events (Hauptdatums) werden NICHT durch diese Whitelist gefiltert,
// die durchlaufen wie bisher das vollständige typeMapping.
const HISTORICAL_EVENT_TYPE_WHITELIST = new Set([
  'start_date', 'end_date', 'cancellation_deadline', 'minimum_term_end',
  'probation_end', 'warranty_end', 'renewal_date', 'payment_due',
  'notice_period_start', 'contract_signed', 'service_start',
  'insurance_coverage_end', 'trial_end', 'license_expiry',
  'price_guarantee_end', 'inspection_due', 'lease_end', 'option_deadline',
  'loan_end', 'delivery_date'
  // Bewusst NICHT in Whitelist:
  //   'other'                 → Metadaten (Ausdruckdatum, sonstige Detaildatums)
  //   'interest_rate_change'  → meist historisch + nicht termin-relevant
]);

/**
 * Generiert automatisch Kalenderereignisse basierend auf Vertragsdaten
 * NEU: Unterstützt Auto-Renewal für "alte" aber aktive Verträge
 * 🔒 NEU: Konfidenz-basierte Event-Generierung
 */
async function generateEventsForContract(db, contract) {
  const events = [];
  const now = new Date();

  try {
    // 🔴 Gekündigte Verträge: Keine Kündigungs-Erinnerungen mehr erstellen
    // (CANCELLATION_CONFIRMATION_CHECK wird separat in cancellations.js erstellt)
    if (contract.status === 'gekündigt' || contract.cancellationId) {
      console.log(`⏭️ Vertrag "${contract.name}" ist gekündigt — überspringe Event-Generierung`);
      return events;
    }

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
      
      // Berechne nächstes Ablaufdatum (nutzt autoRenewMonths, Default: 12 Monate)
      const autoRenewMonths = contract.autoRenewMonths || 12;
      while (expiryDate < now) {
        expiryDate.setMonth(expiryDate.getMonth() + autoRenewMonths);
      }
      
      console.log(`📅 Ablaufdatum angepasst von ${originalExpiry.toISOString()} auf ${expiryDate.toISOString()}`);
    }
    
    // 🆕 14.06.2026 Guard (Problem A): "echtes" Enddatum = existiert UND liegt NACH dem Start.
    // Stoppt "Vertrag läuft ab"/"Verlängerung" am Starttag bei Verträgen, deren Enddatum
    // fälschlich = Startdatum gesetzt wurde (unbefristet / Aufhebungsvertrag). Verträge mit
    // echtem zukünftigem Enddatum (auch Auto-Renewals) sind davon NICHT betroffen.
    const startDate = contract.startDate ? new Date(contract.startDate) : null;
    const hasValidExpiry = !!expiryDate && (!startDate || expiryDate.getTime() > startDate.getTime());

    const createdDate = new Date(contract.createdAt || contract.uploadedAt);
    
    // 🔧 FIX: Extrahiere Notice Period aus verschiedenen Quellen
    let noticePeriodDays = 90; // Default
    let noticePeriodMonths = 0; // Für kalendermonatsgenaue Berechnung

    if (contract.cancellationPeriod) {
      if (typeof contract.cancellationPeriod === 'object') {
        noticePeriodDays = contract.cancellationPeriod.inDays || 90;
      } else if (typeof contract.cancellationPeriod === 'string') {
        noticePeriodDays = extractNoticePeriod(contract.cancellationPeriod);
        noticePeriodMonths = extractNoticeMonths(contract.cancellationPeriod);
      } else if (typeof contract.cancellationPeriod === 'number') {
        noticePeriodDays = contract.cancellationPeriod;
      }
    } else if (contract.kuendigung) {
      noticePeriodDays = extractNoticePeriod(contract.kuendigung);
      noticePeriodMonths = extractNoticeMonths(contract.kuendigung);
    }
    
    const autoRenewMonths = contract.autoRenewMonths || 12;
    
    // 🆕 15.06.2026 (TÜV-Fund C): Kündigungs-Lifecycle (CANCEL_WINDOW_OPEN/LAST_CANCEL_DAY/
    // CANCEL_WARNING) nur bei echtem Kündigungs-/Verlängerungs-Grund — Auto-Renewal ODER eine
    // WIRKLICH extrahierte Kündigungsfrist. Sonst erzeugte der Default noticePeriodDays=90 für
    // JEDEN Festvertrag ein erfundenes "kündige sonst verlängert sich" — auch für auslaufende
    // Verträge, die sich gar nicht verlängern. CONTRACT_EXPIRY ("läuft ab") bleibt unberührt →
    // der Vertrag zeigt weiter sein Ende, nur ohne den falschen Kündigungsdruck.
    const hasCancelReason = isAutoRenewal || !!contract.cancellationPeriod || !!contract.kuendigung;

    // 🎯 Extract confidence data from contract
    // 🔒 NEU: Kein Default mehr auf 100 - wenn keine Konfidenz, dann 0 (alte Daten)
    const confidence = contract.endDateConfidence || contract.startDateConfidence || 0;
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

    // 🔒 KONFIDENZ-CHECK für Haupt-Events
    // Kündigungs-Events sind kritisch - bei zu niedriger Konfidenz WARNUNG loggen
    const shouldCreateCriticalEvents = confidence === 0 || confidence >= EVENT_CONFIDENCE_THRESHOLDS.CRITICAL_EVENTS;

    if (confidence > 0 && confidence < EVENT_CONFIDENCE_THRESHOLDS.CRITICAL_EVENTS) {
      console.log(`⚠️ Niedrige Konfidenz (${confidence}%) für "${contract.name}" - Events werden trotzdem erstellt aber als geschätzt markiert`);
    }

    // 🆕 GENERIERE EVENTS AUCH FÜR "ALTE" AKTIVE VERTRÄGE
    if (hasValidExpiry && shouldCreateCriticalEvents) { // 🔒 Konfidenz-Check + echtes Enddatum (Problem-A-Guard)
      
      // 1. Kündigungsfenster öffnet (30 Tage VOR der Deadline)
      if (noticePeriodDays > 0 && hasCancelReason) {
        // Deadline = letzter Kündigungstag (kalendermonatgenau)
        const tempDeadline = subtractNoticePeriod(expiryDate, noticePeriodDays, noticePeriodMonths);
        const deadlineStr = tempDeadline.toLocaleDateString('de-DE');
        const noticePeriodLabel = noticePeriodMonths > 0 ? `${noticePeriodMonths} Monat${noticePeriodMonths > 1 ? 'e' : ''}` : `${noticePeriodDays} Tage`;

        // Fenster öffnet 30 Tage vor Deadline
        const tempWindowDate = new Date(tempDeadline);
        tempWindowDate.setDate(tempWindowDate.getDate() - 30);
        const cancelWindowDate = createLocalDate(tempWindowDate);

        // Nur zukünftige Events erstellen
        if (cancelWindowDate > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "CANCEL_WINDOW_OPEN",
            title: `🟢 Kündigungsfenster öffnet: ${contract.name}`,
            description: `Ab jetzt sollten Sie sich um die Kündigung von "${contract.name}" kümmern. Letzte Möglichkeit: ${deadlineStr}. Kündigungsfrist: ${noticePeriodLabel}.${isAutoRenewal ? ' (Auto-Renewal Vertrag)' : ''}`,
            date: cancelWindowDate,
            severity: "info",
            status: "scheduled",
            confidence: confidence,
            dataSource: dataSource,
            isEstimated: isEstimated,
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
        }
      }

      // 2. Letzter Kündigungstag (kalendermonatgenau)
      if (noticePeriodDays > 0 && hasCancelReason) {
        const tempLastDate = subtractNoticePeriod(expiryDate, noticePeriodDays, noticePeriodMonths);
        const lastCancelDate = createLocalDate(tempLastDate);

        if (lastCancelDate > now) {
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "LAST_CANCEL_DAY",
            title: `🔴 LETZTER TAG: ${contract.name} kündigen!`,
            description: `Heute ist die letzte Chance, "${contract.name}" zu kündigen. ${isAutoRenewal ? `Der Vertrag verlängert sich sonst automatisch um ${autoRenewMonths} Monate!` : 'Danach ist eine fristgerechte Kündigung nicht mehr möglich.'}`,
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
      
      // 3. Automatische Verlängerung — NUR bei echtem Auto-Renewal (Problem-A-Guard):
      // verhindert falsche "Mögliche Verlängerung" bei Verträgen, die sich gar nicht
      // verlängern (z.B. Aufhebungsvertrag, befristet-ohne-Verlängerung). Echte
      // Auto-Renewals (isAutoRenewal=true) bleiben unberührt.
      if (expiryDate > now && isAutoRenewal) {
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

    }

    // 🔔 7. Custom Reminder Events (User-defined) — supports new reminderSettings format.
    // Läuft UNABHÄNGIG vom äußeren expiryDate-Check, weil User-eigene Datumsvorgaben
    // (type='custom') semantisch nichts mit dem Vertrags-Ablaufdatum zu tun haben.
    // expiry/cancellation-Typen brauchen expiryDate und skippen defensiv per `continue`.
    const reminderSettingsArr = contract.reminderSettings && Array.isArray(contract.reminderSettings) && contract.reminderSettings.length > 0
      ? contract.reminderSettings
      : (contract.reminderDays && Array.isArray(contract.reminderDays) && contract.reminderDays.length > 0)
        ? contract.reminderDays.map(d => ({ type: 'expiry', days: d }))
        : [];

    if (reminderSettingsArr.length > 0) {
      console.log(`🔔 Generiere ${reminderSettingsArr.length} Custom Reminders für "${contract.name}"`);

      // Calculate cancellation deadline only when expiryDate exists (kalendermonatgenau)
      const cancellationDeadline = expiryDate
        ? subtractNoticePeriod(expiryDate, noticePeriodDays, noticePeriodMonths)
        : null;

      for (const setting of reminderSettingsArr) {
        let reminderDate;
        let title;
        let description;

        if (setting.type === 'expiry') {
          if (!expiryDate) continue;
          const tempDate = new Date(expiryDate);
          tempDate.setDate(tempDate.getDate() - setting.days);
          reminderDate = createLocalDate(tempDate);
          title = `🔔 Erinnerung: ${contract.name} läuft in ${setting.days} Tagen ab`;
          description = `"${contract.name}" läuft in ${setting.days} Tagen ab (am ${expiryDate.toLocaleDateString('de-DE')}).${isAutoRenewal ? ' Dieser Vertrag verlängert sich automatisch, falls nicht gekündigt!' : ' Jetzt handeln!'}`;
        } else if (setting.type === 'cancellation') {
          if (!cancellationDeadline) continue;
          const tempDate = new Date(cancellationDeadline);
          tempDate.setDate(tempDate.getDate() - setting.days);
          reminderDate = createLocalDate(tempDate);
          title = `🔔 Erinnerung: Kündigungsfrist für ${contract.name} endet in ${setting.days} Tagen`;
          description = `Die Kündigungsfrist für "${contract.name}" endet in ${setting.days} Tagen (am ${cancellationDeadline.toLocaleDateString('de-DE')}). Vertrag läuft ab am ${expiryDate.toLocaleDateString('de-DE')}.`;
        } else if (setting.type === 'custom' && setting.targetDate) {
          reminderDate = createLocalDate(new Date(setting.targetDate));
          const labelText = setting.label || 'Eigene Erinnerung';
          title = `🔔 Erinnerung: ${labelText} für ${contract.name}`;
          description = `Eigene Erinnerung "${labelText}" für "${contract.name}" am ${reminderDate.toLocaleDateString('de-DE')}.`;
        } else {
          continue; // Skip invalid settings
        }

        // Nur zukünftige Reminders erstellen
        if (reminderDate > now) {
          const daysUntil = setting.type === 'custom'
            ? Math.ceil((reminderDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : setting.days;
          const severity = daysUntil <= 7 ? "critical" : daysUntil <= 30 ? "warning" : "info";

          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "CUSTOM_REMINDER",
            title,
            description,
            date: reminderDate,
            severity: severity,
            status: "scheduled",
            confidence: confidence,
            dataSource: dataSource,
            isEstimated: isEstimated,
            metadata: {
              provider: contract.provider,
              daysUntilExpiry: setting.days || 0,
              expiryDate: expiryDate,
              suggestedAction: "review",
              contractName: contract.name,
              isAutoRenewal,
              customReminder: true,
              reminderType: setting.type,
              reminderLabel: setting.label || null
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
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
          title: `✅ Kündigung wirksam: ${contract.name}`,
          description: `Die Kündigung von "${contract.name}" wird heute wirksam. Der Vertrag wurde erfolgreich gekündigt.`,
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
    // 🆕 17.06.2026 (Hebel B): Diese Berechnung (Start+6 Monate) ist ein FALLBACK. Wenn die KI das
    // echte Probezeit-Ende als importantDate (probation_end) geliefert hat, NICHT zusätzlich berechnen
    // — sonst zwei PROBATION_END ~1 Tag auseinander (Aurelis: KI 30.04 vs berechnet 01.05) + ein
    // verwaister "in 2 Wochen"-Vorwarner. Die KI-Variante (Block 10) ist genauer + trägt Vorwarnungen.
    const kiHasProbationEnd = Array.isArray(contract.importantDates) &&
      contract.importantDates.some(d => d && d.type === 'probation_end' && d.date);
    if (contract.startDate && isArbeitsvertrag && !kiHasProbationEnd) {
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
    // 🆕 17.06.2026 (Hebel B): Fallback — nicht zusätzlich berechnen, wenn die KI das echte
    // Gewährleistungs-Ende (warranty_end) bereits geliefert hat (analog zur Probezeit oben).
    const kiHasWarrantyEnd = Array.isArray(contract.importantDates) &&
      contract.importantDates.some(d => d && d.type === 'warranty_end' && d.date);
    if ((contract.kaufdatum || (contract.startDate && isKaufvertrag)) && !kiHasWarrantyEnd) {
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
          // 🆕 17.06.2026 (Hebel B): nie ein "0 Jahre"-Jubiläum zeigen (entsteht z.B. wenn der
          // Mietbeginn unzuverlässig extrahiert wurde) — nächstes echtes Jubiläum prüfen.
          if (yearsRented < 1) continue;
          const jubiDate = createLocalDate(jubilaeumDate);

          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: "RENT_ANNIVERSARY",
            title: `🏠 ${yearsRented} Jahre Mietverhältnis: ${contract.name}`,
            description: jubilaeumDate > now
              ? `Am ${jubilaeumDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} feierst du das ${yearsRented}-jährige Mietverhältnis für "${contract.name}". Zeit für eine Bestandsaufnahme!`
              : `Vor ${yearsRented} Jahren begann das Mietverhältnis für "${contract.name}". Zeit für eine Bestandsaufnahme!`,
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

        // 🔒 KONFIDENZ-CHECK: Nur Events erstellen wenn Konfidenz ausreichend
        const dateConfidence = importantDate.confidence || (importantDate.calculated ? 70 : 90);
        const requiredConfidence = mapping.severity === 'critical'
          ? EVENT_CONFIDENCE_THRESHOLDS.CRITICAL_EVENTS
          : EVENT_CONFIDENCE_THRESHOLDS.STANDARD_EVENTS;

        if (dateConfidence < requiredConfidence) {
          console.log(`  ⚠️ KI-Datum übersprungen (Konfidenz ${dateConfidence}% < ${requiredConfidence}%): ${importantDate.type}`);
          continue;
        }

        // Zukünftige Datums: vollwertige Events MIT Reminder-Staffelung.
        // Vergangene Datums (else-Branch unten): rein historische Read-Only-Events
        // mit isHistorical-Flag, ohne Reminder.
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

          // Labels mit "vorher"-Suffix: macht klar, dass es VORWARNUNGEN sind,
          // nicht Termine, die in X Tagen ab heute liegen. "In 30 Tagen: Kündigungsfristende"
          // wurde sonst mit dem absoluten Datum + "In 7 Monaten"-Anzeige als widersprüchlich
          // wahrgenommen. "30 Tage vorher: Kündigungsfristende" ist eindeutig.
          // 3a — KANONISCHER VORWARN-SATZ: nur noch 30 / 7 / 1 Tage vorher.
          // Der Stichtag selbst (Vorlauf 0 / „am Tag") wird durch das Haupt-Event abgedeckt,
          // das am Frist-Tag liegt und vom „Am Stichtag"-Schalter (daysSame) gesteuert wird —
          // darum hier KEINE 0-Stufe (sonst Doppel-Mail am Frist-Tag).
          // Frühere 14- und 3-Tage-Stufen entfernt: sie hatten keinen eigenen Schalter und
          // ließen das Etikett lügen. Jetzt mappt jede erzeugte Stufe 1:1 auf einen Schalter.
          const reminderConfig = {
            critical: [
              { days: 30, emoji: '📅', urgency: 'info', label: '30 Tage vorher' },
              { days: 7, emoji: '🚨', urgency: 'warning', label: '7 Tage vorher' },
              { days: 1, emoji: '🔴', urgency: 'critical', label: '1 Tag vorher – DRINGEND' }
            ],
            warning: [
              { days: 30, emoji: '📅', urgency: 'info', label: '30 Tage vorher' },
              { days: 7, emoji: '⚠️', urgency: 'warning', label: '7 Tage vorher' }
            ],
            info: [
              { days: 7, emoji: '📅', urgency: 'info', label: '7 Tage vorher' }
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
          // 🛡️ Whitelist-Filter: Nur "echte Vertragsereignisse" werden als
          // historische Calendar-Events erzeugt. Metadaten (Ausdruckdatum etc.)
          // bleiben in contract.importantDates abrufbar, tauchen aber nicht
          // als Kalender-Termine auf — das vermeidet Lärm im Kalender.
          if (!HISTORICAL_EVENT_TYPE_WHITELIST.has(importantDate.type)) {
            console.log(`  ⏭️ KI-Datum (historisch, gefiltert): ${importantDate.type} → ${dateObj.toLocaleDateString('de-DE')} — nicht kalenderwürdig`);
            continue;
          }
          // 📜 HISTORICAL EVENT: Vergangene KI-Datums werden als Read-Only-Events
          // gespeichert, damit "Vertragshistorie" auch im zentralen Kalender sichtbar
          // ist. Severity 'info' (kein Alarm), KEINE Reminder-Vorwarnungen,
          // isHistorical=true schützt vor updateExpiredEvents-Cron.
          // Email-Notifier filtert eh date >= now → kein Spam für vergangene Daten.
          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: mapping.eventType,
            title: `📜 ${importantDate.label}: ${contract.name}`,
            description: importantDate.description || `Historisches Datum für "${contract.name}"`,
            date: dateObj,
            severity: 'info',
            status: "scheduled",
            isHistorical: true,
            confidence: importantDate.calculated ? 75 : 95,
            dataSource: importantDate.calculated ? 'ai_calculated' : 'ai_extracted',
            isEstimated: importantDate.calculated || false,
            metadata: {
              provider: contract.provider,
              contractName: contract.name,
              aiExtracted: true,
              source: importantDate.source || 'KI-Analyse',
              originalType: importantDate.type,
              historical: true
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
          console.log(`  📜 KI-Datum (historisch): ${importantDate.type} → ${dateObj.toLocaleDateString('de-DE')} (${importantDate.label})`);
        }
      }
    }

    // 🆕 11. KI-ERKANNTE WIEDERKEHRENDE/ANKER-BASIERTE FRISTEN (Tier 2, Problem F, 27.05.2026)
    // Übersetzt actionable=true fristHinweise zu Calendar-Events. Konditionale
    // Fristen (actionable=false) bleiben nur im UI sichtbar. Validierung in
    // dateHuntService.validateFristHinweis hat Anti-Patterns + Whitelists.
    if (contract.fristHinweise && Array.isArray(contract.fristHinweise)) {
      const actionableFristen = contract.fristHinweise.filter(f => f && f.actionable === true);
      console.log(`🤖 ${actionableFristen.length} actionable Fristen (von ${contract.fristHinweise.length} gesamt) für "${contract.name}"`);

      const MAX_EVENTS_PER_FRIST = 12;        // Schutz gegen Calendar-Flutung pro Frist
      const MAX_FRIST_EVENTS_TOTAL = 50;      // Globaler Cap pro Vertrag (TÜV Schritt 2)
      const HORIZON_MONTHS = 12;              // 12 Monate Vorschau (Pfad A recurring)
      const PFADB_HORIZON_YEARS = 5;          // Max 5 Jahre Future für Anker-Events (TÜV Schritt 4)
      const horizonEnd = new Date(now.getFullYear(), now.getMonth() + HORIZON_MONTHS, now.getDate());
      const pfadBHorizonEnd = new Date(now.getFullYear() + PFADB_HORIZON_YEARS, now.getMonth(), now.getDate());
      let fristEventsCreated = 0;             // Counter für globalen Cap

      // 🆕 Hybrid Tage/Monate (Bugfix 27.05.2026): weekly/biweekly funktionieren
      // nur mit Tage-Arithmetik korrekt. Vorher wurden 0.25/0.5 Monate via
      // Math.ceil/Math.round zu MONATLICHEN Events gerundet.
      const intervalConfig = {
        weekly:       { unit: 'days', value: 7 },
        biweekly:     { unit: 'days', value: 14 },
        monthly:      { unit: 'months', value: 1 },
        quarterly:    { unit: 'months', value: 3 },
        semiannually: { unit: 'months', value: 6 },
        yearly:       { unit: 'months', value: 12 }
      };

      const fristTypeMapping = {
        anpassungsfrist: { eventType: 'CONDITION_REVIEW', emoji: '📈', severity: 'info' },
        wartungsfrist: { eventType: 'MAINTENANCE_CHECK', emoji: '🔧', severity: 'info' },
        kuendigungsfrist: { eventType: 'NOTICE_PERIOD', emoji: '📬', severity: 'critical' },
        zahlungsfrist: { eventType: 'PAYMENT_DUE', emoji: '💰', severity: 'warning' },
        probezeit: { eventType: 'PROBATION_END', emoji: '👔', severity: 'warning' },
        gewaehrleistungsfrist: { eventType: 'WARRANTY_END', emoji: '🛡️', severity: 'warning' },
        verjaehrungsfrist: { eventType: 'STATUTE_LIMITATION', emoji: '⏳', severity: 'info' },
        karenzentschaedigung: { eventType: 'KARENZ_END', emoji: '🚪', severity: 'warning' },
        optionsfrist: { eventType: 'OPTION_DEADLINE', emoji: '⏰', severity: 'critical' },
        sonstige: { eventType: 'CUSTOM_DEADLINE', emoji: '📅', severity: 'info' }
      };

      for (const frist of actionableFristen) {
        // Globaler Cap: Notfall-Schutz wenn KI sehr viele actionable Fristen liefert.
        // Bricht ab bevor weitere Events erzeugt werden — bestehende bleiben unangetastet.
        if (fristEventsCreated >= MAX_FRIST_EVENTS_TOTAL) {
          console.log(`  ⚠️ Globaler Frist-Event-Cap erreicht (${MAX_FRIST_EVENTS_TOTAL}) — weitere Fristen übersprungen`);
          break;
        }

        const mapping = fristTypeMapping[frist.type] || fristTypeMapping.sonstige;

        // Pfad A: WIEDERKEHRENDE Frist (recurrencePattern gesetzt)
        if (frist.recurrencePattern && frist.recurrencePattern.intervalType) {
          // 🆕 11.06.2026 / erweitert 14.06.2026 Anti-Flut: Hochfrequent wiederkehrende Fristen
          // NICHT als bis zu 12 identische Monats-Events ausrollen. Das ist (a) reines Zeitstrahl-
          // Rauschen in Kalender/Liste/Dashboard UND (b) monatlicher Mail-Spam (der Notifier feuert
          // jede Monats-Instanz am eigenen Tag — Klasse C überspringt nur das VORZIEHEN, nicht den
          // Tag-of-Versand). Eine hochfrequente Frist (monatlich/wöchentlich) ist ein DAUERZUSTAND
          // ("monatlich kündbar") → bleibt als Hinweis in "Wichtige Fristen & Hinweise" sichtbar,
          // statt als Termin-Flut. Niederfrequente (quartalsweise/halbjährlich/jährlich) bleiben
          // erhalten (1–4×/Jahr = sinnvolle Erinnerung, kein Spam). zahlungsfrist bleibt wie bisher
          // komplett ausgenommen (jede Frequenz). WICHTIG: betrifft NUR den Wiederhol-Pfad (Pfad A) —
          // Extraktion, einmalige Anker-Fristen (Pfad B) und alle anderen Event-Typen bleiben unberührt.
          const HIGH_FREQ_INTERVALS = ['weekly', 'biweekly', 'monthly'];
          if (frist.type === 'zahlungsfrist' || HIGH_FREQ_INTERVALS.includes(frist.recurrencePattern.intervalType)) {
            console.log(`  ⏭️ Wiederkehrende ${frist.type} (${frist.recurrencePattern.intervalType}) NICHT als Kalender-Events ausgerollt (Anti-Flut) — bleibt UI-Hinweis`);
            continue;
          }
          const cfg = intervalConfig[frist.recurrencePattern.intervalType];
          if (!cfg) {
            console.log(`  ⚠️ Frist übersprungen: unbekannter intervalType=${frist.recurrencePattern.intervalType} (${frist.type})`);
            continue;
          }
          const totalStep = cfg.value * (frist.recurrencePattern.intervalCount || 1);
          if (!Number.isFinite(totalStep) || totalStep <= 0) {
            console.log(`  ⚠️ Frist übersprungen: ungültiges Intervall (${frist.type})`);
            continue;
          }

          // Erstes Event berechnen (Tage- vs. Monats-Arithmetik je nach Intervall)
          let eventDate;
          if (cfg.unit === 'days') {
            eventDate = new Date(now);
            eventDate.setDate(eventDate.getDate() + totalStep);
          } else {
            eventDate = new Date(now.getFullYear(), now.getMonth() + totalStep, 1);
          }

          let eventCount = 0;
          while (eventDate <= horizonEnd && eventCount < MAX_EVENTS_PER_FRIST && fristEventsCreated < MAX_FRIST_EVENTS_TOTAL) {
            const localDate = createLocalDate(eventDate);
            events.push({
              userId: contract.userId,
              contractId: contract._id,
              type: mapping.eventType,
              title: `${mapping.emoji} ${frist.title}`,
              description: frist.description || `Wiederkehrende ${frist.type}-Erinnerung für "${contract.name}".`,
              date: localDate,
              severity: mapping.severity,
              status: 'scheduled',
              confidence: 60,        // Berechnete Events: niedriger als direkte Datums
              dataSource: 'ai_calculated',
              isEstimated: true,
              metadata: {
                provider: contract.provider,
                contractName: contract.name,
                aiExtracted: true,           // wichtig für Cleanup-Filter
                source: 'fristHinweis-recurring',
                originalType: frist.type,
                recurrencePattern: frist.recurrencePattern,
                legalBasis: frist.legalBasis || ''
              },
              createdAt: new Date(),
              updatedAt: new Date()
            });
            eventCount++;
            fristEventsCreated++;        // Globaler Cap-Counter
            // Nächstes Event (gleiche Tage/Monate-Arithmetik wie für das erste)
            if (cfg.unit === 'days') {
              eventDate = new Date(eventDate);
              eventDate.setDate(eventDate.getDate() + totalStep);
            } else {
              eventDate = new Date(eventDate.getFullYear(), eventDate.getMonth() + totalStep, eventDate.getDate());
            }
          }
          console.log(`  ✅ Frist wiederkehrend → ${eventCount} Events: ${frist.type} (${frist.recurrencePattern.intervalType}/${frist.recurrencePattern.intervalCount})`);

        // Pfad B: EINMALIGE Frist mit Anker (anchorType + durationDays)
        } else if (frist.anchorType && frist.durationDays) {
          // 🆕 15.06.2026: Eine KÜNDIGUNGSFRIST mit Anker am Vertrags-ENDE ("X Monate zum
          // Laufzeitende") wird hier NICHT als eigenes Event erzeugt. Grund: (1) Der Kündigungs-
          // Lifecycle (CANCEL_WINDOW_OPEN/CANCEL_WARNING/LAST_CANCEL_DAY = expiryDate − Kündigungsfrist)
          // bildet genau diese Frist bereits KORREKT + mehrstufig ab. (2) Die generische
          // "+durationDays"-Rechnung unten läge bei einer Kündigungsfrist FALSCH — die Frist liegt
          // VOR dem Ende, nicht danach (erzeugte sonst ein Datum NACH Vertragsende, z.B.
          // Pixelwerk 28.09.2028 statt davor). Frist bleibt als UI-Hinweis in "Wichtige Fristen".
          if (frist.type === 'kuendigungsfrist' && frist.anchorType === 'contract_end') {
            console.log(`  ⏭️ Kündigungsfrist (Anker=Ende) NICHT als Anker-Event — Kündigungs-Lifecycle deckt sie korrekt ab: "${frist.title}"`);
            continue;
          }
          let anchorDate = null;
          if (frist.anchorType === 'contract_start' && contract.startDate) {
            anchorDate = new Date(contract.startDate);
          } else if (frist.anchorType === 'contract_end' && contract.expiryDate) {
            anchorDate = new Date(contract.expiryDate);
          }
          if (!anchorDate || isNaN(anchorDate.getTime())) {
            console.log(`  ⚠️ Frist übersprungen: ${frist.anchorType}-Anker nicht verfügbar (${frist.type})`);
            continue;
          }
          const eventDate = new Date(anchorDate);
          eventDate.setDate(eventDate.getDate() + frist.durationDays);

          if (eventDate <= now) {
            console.log(`  ⏭️ Frist übersprungen: Ergebnis-Datum ${eventDate.toLocaleDateString('de-DE')} liegt in Vergangenheit (${frist.type})`);
            continue;
          }

          // Future-Cap: keine Calendar-Events >5 Jahre in der Zukunft.
          // Aufbewahrungsfristen 10 Jahre etc. bleiben im UI als Frist-Hinweis
          // sichtbar, aber Calendar wird nicht mit 2036er-Events vollgemuellt.
          if (eventDate > pfadBHorizonEnd) {
            console.log(`  ⏭️ Frist übersprungen: Ergebnis-Datum ${eventDate.toLocaleDateString('de-DE')} > ${PFADB_HORIZON_YEARS} Jahre in Zukunft (${frist.type})`);
            continue;
          }

          events.push({
            userId: contract.userId,
            contractId: contract._id,
            type: mapping.eventType,
            title: `${mapping.emoji} ${frist.title}`,
            description: frist.description || `${frist.type}-Termin für "${contract.name}".`,
            date: createLocalDate(eventDate),
            severity: mapping.severity,
            status: 'scheduled',
            confidence: 55,        // Berechnete Anker-Events: konservativ
            dataSource: 'ai_calculated',
            isEstimated: true,
            metadata: {
              provider: contract.provider,
              contractName: contract.name,
              aiExtracted: true,           // wichtig für Cleanup-Filter
              source: 'fristHinweis-anchor',
              originalType: frist.type,
              anchorType: frist.anchorType,
              durationDays: frist.durationDays,
              legalBasis: frist.legalBasis || ''
            },
            createdAt: new Date(),
            updatedAt: new Date()
          });
          fristEventsCreated++;        // Globaler Cap-Counter
          console.log(`  ✅ Frist anker-basiert → 1 Event: ${frist.type} (${eventDate.toLocaleDateString('de-DE')})`);
        } else {
          console.log(`  ⏭️ Frist übersprungen: actionable=true aber weder recurrencePattern noch anchorType+durationDays (${frist.type})`);
        }
      }
    }

    // 🆕 Problem B: synonyme Meilenstein-Events am selben Tag zusammenfassen (vor dem Speichern)
    {
      const { kept, dropped } = dedupeSameDayMilestones(events, { isAutoRenewal });
      if (dropped.length > 0) {
        console.log(`🔗 Problem-B-Merge: ${dropped.length} synonyme Dopplungs-Events zusammengefasst für "${contract.name}"`);
        events.length = 0;
        events.push(...kept);
      }
    }

    // Speichere Events in DB (update or insert)
    if (events.length > 0) {
      // 🔍 DEBUG: Log event data BEFORE saving to DB
      console.log(`🔍 DEBUG: Speichere ${events.length} Events:`);
      events.forEach((e, idx) => {
        console.log(`  Event ${idx + 1}: ${e.type} - Datum: ${e.date.toISOString()} (Local: ${e.date})`);
      });

      // Nur neue Events einfügen, die noch nicht existieren (keine Löschung!)
      // Prüfe pro Event ob schon ein gleiches existiert (gleicher Vertrag + Typ + Datum)
      const newEvents = [];
      for (const event of events) {
        const exists = await db.collection("contract_events").findOne({
          contractId: contract._id,
          type: event.type,
          date: event.date
        });
        if (!exists) {
          newEvents.push(event);
        }
      }

      if (newEvents.length === 0) {
        console.log(`ℹ️ Alle Events für "${contract.name}" existieren bereits`);
        return events;
      }

      const result = await db.collection("contract_events").insertMany(newEvents);
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
 * Extrahiert die Kündigungsfrist in Monaten (0 wenn nicht in Monaten angegeben)
 * z.B. "1 Monat" → 1, "3 Monate" → 3, "90 Tage" → 0
 */
function extractNoticeMonths(input) {
  if (!input || typeof input !== 'string') return 0;
  const text = input.toLowerCase().trim();
  const match = text.match(/(\d+)\s*monat/i);
  if (match) return parseInt(match[1]);
  if (text.includes("quartal")) return 3;
  if (text.includes("halbjahr")) return 6;
  if (text.includes("jahr")) {
    const yearMatch = text.match(/(\d+)\s*jahr/i);
    return yearMatch ? parseInt(yearMatch[1]) * 12 : 12;
  }
  return 0;
}

/**
 * Subtrahiert die Kündigungsfrist vom Ablaufdatum — kalendermonatgenau wenn möglich
 * z.B. 01.06.2026 - 1 Monat = 01.05.2026 (nicht 02.05.2026)
 */
function subtractNoticePeriod(expiryDate, noticePeriodDays, noticePeriodMonths) {
  const result = new Date(expiryDate);
  if (noticePeriodMonths > 0) {
    result.setMonth(result.getMonth() - noticePeriodMonths);
  } else {
    result.setDate(result.getDate() - noticePeriodDays);
  }
  return result;
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
    
    // Markiere abgelaufene Events.
    // 📜 isHistorical-Events sind ABSICHTLICH in der Vergangenheit (Vertragshistorie)
    // und dürfen NICHT als "expired" markiert werden — sonst verschwinden sie aus dem
    // Kalender bzw. werden als ungültig gerendert.
    const result = await db.collection("contract_events").updateMany(
      {
        date: { $lt: now },
        status: "scheduled",
        isHistorical: { $ne: true }
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

/**
 * 🧹 Cleanup + Regenerate für AI-erzeugte Events eines einzelnen Vertrags.
 *
 * Verwendung: Re-Analyse, Reminder-Settings-Update, Vertrags-Reaktivierung,
 * manueller User-Trigger "Events neu generieren".
 *
 * Garantien:
 *   • Manuelle Termine (isManual === true) werden NIEMALS gelöscht.
 *   • Cancellation-Confirmation-Checks (eigenes Subsystem) bleiben unangetastet.
 *   • Nur Events mit metadata.aiExtracted === true ODER
 *     dataSource ∈ {ai_extracted, ai_calculated, ai_reminder} werden entfernt.
 *
 * Single Source of Truth — alle Aufrufer (analyze.js, contracts.js,
 * cancellations.js, calendar.js) verwenden diesen Helper, damit Filter-Logik
 * nur an einer Stelle gepflegt wird.
 *
 * @param {Db} db - MongoDB Database Connection
 * @param {Object} contract - Contract Document (muss _id und userId haben)
 * @returns {Promise<{deleted: number, generated: number}>}
 */
async function cleanAndRegenerateAIEvents(db, contract) {
  if (!contract || !contract._id) {
    throw new Error('cleanAndRegenerateAIEvents: contract._id required');
  }

  // 🛡️ User-Dismissed-Events bleiben erhalten (wiederhergestellt 13.05.2026):
  //   Wenn ein User einen AI-Reminder per UI gelöscht hat, wurde er auf
  //   status='dismissed' gesetzt. Diese Entscheidung bleibt persistent —
  //   auch bei Re-Analyse. Grund: GPT-Variabilität bei Date-Extraction
  //   (Junior-Timeouts, inkonsistente Kündigungsfrist-Interpretation) kann
  //   bei „frischem Start" alle bestehenden Reminder zerstören. Lieber
  //   „einmal bewusst gelöscht bleibt gelöscht" als „GPT-Inkonsistenz killt
  //   Termine-Liste komplett". User wird im Delete-Modal klar gewarnt.
  // 🆕 16.06.2026 (G1): Auch die deterministisch NEU-ERZEUGBAREN Lifecycle-Events dieses Vertrags
  // mit aufräumen. Sie tragen KEIN aiExtracted/ai_*-Kennzeichen (dataSource meist 'unknown') und
  // wurden daher bei Re-Analyse NICHT gelöscht → bei GEÄNDERTEM Datum blieb der ALTE "läuft ab"/
  // "LETZTER TAG kündigen" als Geister-Termin auf falschem Datum stehen (neuer kam dazu). Nur
  // status:'scheduled' (aktiv/zukünftig) — historische completed/expired/notified bleiben unberührt.
  // BEWUSST NICHT enthalten (werden NICHT von generateEventsForContract neu erzeugt → sonst verloren):
  // CANCELLATION_CONFIRMATION_CHECK + SIGNATURE_* (Envelope nutzt ohnehin envelopeId, kein contractId).
  // Manuelle (isManual) + ausgeblendete (dismissed) Events bleiben durch die Top-Level-Guards geschützt.
  const REGENERABLE_LIFECYCLE_TYPES = [
    'CANCEL_WINDOW_OPEN', 'LAST_CANCEL_DAY', 'CANCEL_WARNING', 'AUTO_RENEWAL',
    'PRICE_INCREASE', 'PRICE_INCREASE_WARNING', 'REVIEW', 'CONTRACT_EXPIRY',
    'CUSTOM_REMINDER', 'RECURRING_PAYMENT', 'PAYMENT_REMINDER',
    'CANCELLATION_DATE', 'CANCELLATION_REMINDER',
    'MINIMUM_TERM_END', 'MINIMUM_TERM_REMINDER', 'PROBATION_END', 'PROBATION_REMINDER',
    'WARRANTY_END', 'WARRANTY_REMINDER', 'RENT_ANNIVERSARY', 'REMAINING_TIME_END'
  ];
  const cleanupFilter = {
    contractId: contract._id,
    isManual: { $ne: true },
    status: { $ne: 'dismissed' },
    $or: [
      { 'metadata.aiExtracted': true },
      { dataSource: { $in: ['ai_extracted', 'ai_calculated', 'ai_reminder'] } },
      { type: { $in: REGENERABLE_LIFECYCLE_TYPES }, status: 'scheduled' }
    ]
  };

  const deleteResult = await db.collection('contract_events').deleteMany(cleanupFilter);
  const events = await generateEventsForContract(db, contract);

  console.log(
    `🧹 Calendar Cleanup für "${contract.name || contract._id}": ` +
    `${deleteResult.deletedCount} alte AI-Events entfernt, ${events.length} neue erzeugt`
  );

  return {
    deleted: deleteResult.deletedCount,
    generated: events.length
  };
}

// ============================================================================
// 🆕 14.06.2026 Problem B: Synonyme Meilenstein-Events am selben Tag zusammenfassen.
// Pro (Vertrag, Kalendertag, Semantik-Gruppe) bleibt EIN Event übrig — das höchst-
// priorisierte (spezifischer End-/Start-Typ MIT Vorwarnungen vor generischem ohne).
// Die übrigen + ihre Vorwarn-Kinder werden entfernt. Zwei VERSCHIEDENE echte Termine
// (andere Gruppe / anderer Tag) bleiben getrennt → kein echter Termin geht verloren.
// Wird von der Erzeugung UND vom Cleanup-Script genutzt (deckungsgleich).
const MILESTONE_SEM_GROUP = {
  CONTRACT_END: 'ENDE', MINIMUM_TERM_END: 'ENDE', LEASE_END: 'ENDE', INSURANCE_END: 'ENDE',
  LOAN_END: 'ENDE', LICENSE_EXPIRY: 'ENDE', TRIAL_END: 'ENDE', AUTO_RENEWAL: 'ENDE',
  CONTRACT_EXPIRY: 'ENDE', REMAINING_TIME_END: 'ENDE',
  CONTRACT_START: 'START', SERVICE_START: 'START'
};
// Höhere Zahl = behalten. Tatsächliche End-Typen (spezifisch + mit Vorwarnungen) ganz oben;
// "ab jetzt kündbar" darunter; Verlängerung/generisch/abgeleitet unten.
const MILESTONE_PRIORITY = {
  CONTRACT_END: 100, LEASE_END: 99, LOAN_END: 98, INSURANCE_END: 97, LICENSE_EXPIRY: 96, TRIAL_END: 95,
  MINIMUM_TERM_END: 60,
  AUTO_RENEWAL: 50, CONTRACT_EXPIRY: 20, REMAINING_TIME_END: 10,
  CONTRACT_START: 100, SERVICE_START: 50
};
function isReminderEventB(e) {
  return /_REMINDER_\d+D$/i.test(e.type || '') ||
    /\d+\s*(?:Tage?|Wochen?|Monate?)\s*vorher/i.test(e.title || '');
}
// ENDE-Meilensteine, die nur 1–2 Tage auseinander liegen, meinen denselben Stichtag
// (GPT-Varianz, z.B. "Ende der festen Laufzeit" 30.06 vs abgeleitetes "Vertragsende" 01.07).
const ENDE_WINDOW_DAYS = 2;
function dedupeSameDayMilestones(events, opts = {}) {
  const DAY_MS = 86400000;
  const dayStr = (d) => new Date(d).toISOString().slice(0, 10);
  const prio = (e) => MILESTONE_PRIORITY[e.type] || 0;
  const mains = events.filter(e => !isReminderEventB(e));
  const reminders = events.filter(e => isReminderEventB(e));

  const droppedMains = [];

  // Pass 1: exakt taggleich pro (Vertrag, Tag, Semantik-Gruppe) — höchste Priorität bleibt
  const groups = new Map();
  for (const e of mains) {
    const g = MILESTONE_SEM_GROUP[e.type];
    if (!g) continue;
    const key = `${String(e.contractId)}|${dayStr(e.date)}|${g}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(e);
  }
  for (const list of groups.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => prio(b) - prio(a));
    for (let i = 1; i < list.length; i++) droppedMains.push(list[i]); // [0] bleibt
  }

  // Pass 2: ENDE-Meilensteine, die nur ±2 Tage auseinander liegen, meinen denselben Stichtag.
  // Pro Cluster bleibt EINER: höchste Priorität, bei Gleichstand der FRÜHESTE (= echter,
  // vorwarn-tragender Stichtag). NUR innerhalb der ENDE-Gruppe, nie gruppenübergreifend →
  // zwei wirklich verschiedene Termine (START/ENDE oder weit auseinander) bleiben getrennt.
  const dropped1 = new Set(droppedMains);
  const endeByContract = new Map();
  for (const e of mains) {
    if (dropped1.has(e) || MILESTONE_SEM_GROUP[e.type] !== 'ENDE') continue;
    const k = String(e.contractId);
    if (!endeByContract.has(k)) endeByContract.set(k, []);
    endeByContract.get(k).push(e);
  }
  for (const list of endeByContract.values()) {
    if (list.length < 2) continue;
    list.sort((a, b) => new Date(a.date) - new Date(b.date));
    let cluster = [list[0]];
    const flush = () => {
      if (cluster.length < 2) return;
      const winner = cluster.reduce((best, e) =>
        (prio(e) > prio(best) || (prio(e) === prio(best) && new Date(e.date) < new Date(best.date))) ? e : best,
        cluster[0]);
      for (const e of cluster) if (e !== winner) droppedMains.push(e);
    };
    for (let i = 1; i < list.length; i++) {
      if (Math.abs(new Date(list[i].date) - new Date(list[i - 1].date)) <= ENDE_WINDOW_DAYS * DAY_MS) {
        cluster.push(list[i]);
      } else { flush(); cluster = [list[i]]; }
    }
    flush();
  }

  // Pass 3 (Backstop gegen KI-Doppel-Extraktion, 17.06.2026): Same-Day-Dubletten, die NICHT in
  // einer MILESTONE_SEM_GROUP liegen → Pass 1/2 erfassen sie nicht. Zwei Fälle aus dem Komplex-Test:
  //   (3a) Dieselbe Klausel doppelt extrahiert → identischer Typ+Tag+Titel (z.B. Probezeit-
  //        Kündigungsfrist 2× → NOTICE_PERIOD 2× am selben Tag). Eines bleibt.
  //   (3b) Dieselbe Preis-/Staffel-Erhöhung von GPT doppelt klassifiziert — als payment_due
  //        (→PAYMENT_DUE) UND renewal_date (→AUTO_RENEWAL) am selben Tag. Bei einem Vertrag OHNE
  //        Auto-Renewal ist das renewal_date-AUTO_RENEWAL nachweislich spurious → raus, das
  //        semantisch korrekte PAYMENT_DUE bleibt. Verwaiste Vorwarnungen putzt der Block unten mit.
  {
    const dropped12 = new Set(droppedMains);

    // 3a — exakte Dublette (Vertrag + Tag + Typ + Titel). Titel-genau = nur echte Doppel,
    // nie zwei wirklich verschiedene Termine gleichen Typs am selben Tag.
    const seen3a = new Map();
    for (const e of mains) {
      if (dropped12.has(e)) continue;
      const key = `${String(e.contractId)}|${dayStr(e.date)}|${e.type}|${e.title || ''}`;
      const prev = seen3a.get(key);
      if (!prev) { seen3a.set(key, e); continue; }
      const winner = prio(e) > prio(prev) ? e : prev;
      droppedMains.push(winner === e ? prev : e);
      seen3a.set(key, winner);
    }

    // 3b — KI-Doppel-Klassifikation payment_due + renewal_date am selben Tag, NUR bei Verträgen
    // ohne Auto-Renewal (dann ist das renewal_date provably spurious). originalType-Targeting
    // trifft ausschließlich KI-renewal-Events, nie den echten Block-A-Lifecycle-AUTO_RENEWAL.
    if (opts.isAutoRenewal === false) {
      const dropped3a = new Set(droppedMains);
      const byDay = new Map();
      for (const m of mains) {
        if (dropped3a.has(m)) continue;
        const k = `${String(m.contractId)}|${dayStr(m.date)}`;
        if (!byDay.has(k)) byDay.set(k, []);
        byDay.get(k).push(m);
      }
      for (const list of byDay.values()) {
        const hasPayment = list.some(m => m.metadata?.originalType === 'payment_due' || m.type === 'PAYMENT_DUE');
        if (!hasPayment) continue;
        for (const m of list) {
          if (m.metadata?.originalType === 'renewal_date') droppedMains.push(m);
        }
      }
    }
  }

  // Vorwarn-Kinder: jede Erinnerung gehört zum NÄCHSTGELEGENEN Main GLEICHEN Typs (Stichtag =
  // Erinnerungsdatum + daysUntil). Entfernt wird sie nur, wenn dieser Eltern-Main entfernt wurde.
  // So behält der bleibende Stichtag genau EIN Vorwarn-Set, und bei zwei fast-gleichen Enden
  // verschwinden nur die Vorwarner des verworfenen Endes (keine doppelten, keine fehlenden).
  const dropMainSet = new Set(droppedMains);
  const mainsByType = new Map();
  for (const m of mains) {
    if (!mainsByType.has(m.type)) mainsByType.set(m.type, []);
    mainsByType.get(m.type).push(m);
  }
  const droppedReminders = [];
  for (const r of reminders) {
    const candidates = (mainsByType.get(r.metadata?.originalEvent) || [])
      .filter(m => String(m.contractId) === String(r.contractId));
    if (candidates.length === 0) continue; // kein passender Main → unverändert lassen
    const lead = Number(r.metadata?.daysUntil);
    if (!Number.isFinite(lead)) {
      // ohne Stichtag-Anker: nur entfernen, wenn der ganze Typ verschwindet
      if (candidates.every(m => dropMainSet.has(m))) droppedReminders.push(r);
      continue;
    }
    const target = new Date(r.date); target.setDate(target.getDate() + lead);
    const owner = candidates.reduce((best, m) => {
      const dM = Math.abs(new Date(m.date) - target);
      const dB = Math.abs(new Date(best.date) - target);
      if (dM < dB) return m;
      if (dM === dB && dropMainSet.has(best) && !dropMainSet.has(m)) return m; // Gleichstand → bleibenden bevorzugen
      return best;
    }, candidates[0]);
    if (dropMainSet.has(owner)) droppedReminders.push(r);
  }

  const dropSet = new Set([...droppedMains, ...droppedReminders]);
  const kept = events.filter(e => !dropSet.has(e));
  return { kept, dropped: [...dropSet] };
}

module.exports = {
  generateEventsForContract,
  cleanAndRegenerateAIEvents,
  regenerateAllEvents,
  updateExpiredEvents,
  onContractChange,
  extractNoticePeriod,
  dedupeSameDayMilestones
};