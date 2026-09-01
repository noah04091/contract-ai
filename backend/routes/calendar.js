// 📁 backend/routes/calendar.js
const express = require("express");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const verifyToken = require("../middleware/verifyToken");
const { generateEventsForContract, cleanAndRegenerateAIEvents, regenerateAllEvents, completeDanglingLabel } = require("../services/calendarEvents");
const { generateICSFeed, generateCalendarLinks, foldICSLine, escapeICS } = require("../utils/icsGenerator");
const { VISIBLE_EVENT_MATCH } = require("../utils/calendarVisibility"); // 3b: Auto-Vorwarnungen aus Anzeige ausblenden
// Plan-Entscheidungen zentral: normalisiert Alt-Namen (premium/legendary) mit.
const { isBusinessOrHigher } = require("../constants/subscriptionPlans");
// Effektiver Plan inkl. Org-Vererbung (siehe utils/planAccess.js).
const { resolveEffectivePlan } = require("../utils/planAccess");

const router = express.Router();

// ============================================
// 🔒 SUBSCRIPTION CHECK HELPER
// ============================================

/**
 * Pläne mit vollem Kalender-Zugriff (erstellen, bearbeiten, löschen, Benachrichtigungen)
 * Free User können nur Events ANSEHEN
 */
// Nur noch fuer die Anzeige in Fehlermeldungen ("requiredPlans"). Die ENTSCHEIDUNG
// faellt ueber isBusinessOrHigher() aus constants/subscriptionPlans.js — TUEV-Fund
// 12.08.2026: In dieser Liste fehlte "premium" (Alt-Name fuer enterprise), wodurch
// legacy-Premium-Konten den Kalender-Vollzugriff verloren, obwohl sie ueberall sonst
// als business-or-higher gelten. normalizePlan() deckt solche Alt-Namen zentral ab.
const CALENDAR_FULL_ACCESS_PLANS = ["business", "enterprise"];

/**
 * Prüft ob User vollen Kalender-Zugriff hat
 * @param {Object} db - MongoDB Datenbank
 * @param {string} userId - User ID
 * @returns {Promise<{hasAccess: boolean, plan: string, message: string}>}
 */
async function checkCalendarAccess(db, userId) {
  try {
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      // `role` fuer den Admin-Safeguard in resolveEffectivePlan, `_id` liefert Mongo per Default
      { projection: { subscriptionPlan: 1, subscriptionActive: 1, role: 1 } }
    );

    if (!user) {
      return { hasAccess: false, plan: null, message: "Benutzer nicht gefunden" };
    }

    // 11.08.2026: Effektiver Plan inkl. Org-Vererbung — Mitglieder einer zahlenden
    // Organisation haben ihr eigenes Feld auf "free" und hatten daher nur Lese-Zugriff
    // auf den Kalender, obwohl ihre Organisation zahlt.
    const plan = await resolveEffectivePlan(db, user);
    const isActive = user.subscriptionActive !== false; // Default true für Legacy
    const hasAccess = isActive && isBusinessOrHigher(plan);

    return {
      hasAccess,
      plan,
      message: hasAccess
        ? "Vollzugriff"
        : "Kalender-Bearbeitung erfordert ein Business- oder Enterprise-Abo"
    };
  } catch (error) {
    console.error("❌ Error checking calendar access:", error);
    return { hasAccess: false, plan: null, message: "Fehler bei der Berechtigungsprüfung" };
  }
}

// ============================================
// 🛡️ INPUT VALIDATION HELPERS
// ============================================

const VALID_SEVERITIES = ["info", "warning", "critical"];
const VALID_EVENT_STATUSES = ["scheduled", "queued", "notified", "snoozed", "dismissed", "completed"];
const VALID_RECURRENCE_TYPES = ["none", "daily", "weekly", "monthly", "yearly"];

function safeObjectId(id) {
  if (!id || !ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

/**
 * Helper: Generiert alle Instanzen eines wiederkehrenden Events im Zeitraum
 */
function generateRecurrenceInstances(masterEvent, fromDate, toDate) {
  const instances = [];
  const recurrence = masterEvent.recurrence;

  if (!recurrence || !recurrence.type || recurrence.type === 'none') {
    return instances;
  }

  const startDate = new Date(masterEvent.date);
  const endDate = recurrence.endDate ? new Date(recurrence.endDate) : toDate;
  const maxOccurrences = recurrence.count || 365; // Safety limit

  let currentDate = new Date(startDate);
  let occurrenceCount = 0;

  while (currentDate <= endDate && currentDate <= toDate && occurrenceCount < maxOccurrences) {
    // Skip the master event itself (it's already in the list)
    if (currentDate.getTime() !== startDate.getTime()) {
      // Only add if within the requested range
      if (currentDate >= fromDate && currentDate <= toDate) {
        instances.push({
          ...masterEvent,
          _id: `${masterEvent._id}_${currentDate.toISOString().split('T')[0]}`, // Virtual ID
          date: new Date(currentDate),
          isRecurringInstance: true,
          masterEventId: masterEvent._id,
          occurrenceIndex: occurrenceCount
        });
      }
    }

    // Calculate next occurrence
    occurrenceCount++;
    switch (recurrence.type) {
      case 'daily':
        currentDate.setDate(currentDate.getDate() + (recurrence.interval || 1));
        break;
      case 'weekly':
        currentDate.setDate(currentDate.getDate() + (7 * (recurrence.interval || 1)));
        break;
      case 'monthly':
        currentDate.setMonth(currentDate.getMonth() + (recurrence.interval || 1));
        break;
      case 'yearly':
        currentDate.setFullYear(currentDate.getFullYear() + (recurrence.interval || 1));
        break;
      default:
        return instances; // Unknown type, stop
    }
  }

  return instances;
}

// GET /api/calendar/events - Alle Events im Zeitraum abrufen
router.get("/events", verifyToken, async (req, res) => {
  try {
    const { from, to, type, severity, status, contractId, envelopeId } = req.query;
    const userId = new ObjectId(req.user.userId);
    
    // Build filter
    const filter = { userId };

    // Exclude dismissed events by default
    filter.status = { $ne: "dismissed" };

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    // Only override status filter if explicitly requested
    if (status && status !== 'all') filter.status = status;

    // Filter by contractId if provided
    if (contractId) {
      const validContractId = safeObjectId(contractId);
      if (!validContractId) return res.status(400).json({ success: false, error: "Ungültige Vertrags-ID" });
      filter.contractId = validContractId;
    }

    // Filter by envelopeId (Signatur-Anfragen) — liefert wie contractId AUCH die gebündelten Vorwarner.
    if (envelopeId) {
      const validEnvelopeId = safeObjectId(envelopeId);
      if (!validEnvelopeId) return res.status(400).json({ success: false, error: "Ungültige Envelope-ID" });
      filter.envelopeId = validEnvelopeId;
    }

    // 3b: Auto-Vorwarnungen ("X Tage vorher"-Staffel + benannte Vorwarner) aus der
    // BREITEN Kalender-Anzeige ausblenden — pro Frist nur 1 Eintrag. Reiner Anzeige-Filter;
    // Events bleiben in der DB + mailen weiter. Sichtbar bleiben Haupt-Termine,
    // Exakt-Datum-/manuelle/Signatur-Einträge (siehe utils/calendarVisibility.js).
    // WICHTIG: NUR ausblenden, wenn nicht nach einem einzelnen Vertrag gefragt wird.
    // Bei ?contractId=… (Vertrags-Detail-/Reminder-Verwaltungs-Modal) zeigen wir ALLE
    // Events inkl. Vorwarnungen — dort werden sie verwaltet, nicht nur angezeigt.
    if (!contractId && !envelopeId) {
      filter.$and = [...(filter.$and || []), VISIBLE_EVENT_MATCH];
    }

    // Fetch events with contract details
    const events = await req.db.collection("contract_events")
      .aggregate([
        { $match: filter },
        {
          $lookup: {
            from: "contracts",
            localField: "contractId",
            foreignField: "_id",
            as: "contract"
          }
        },
        { $unwind: { path: "$contract", preserveNullAndEmptyArrays: true } },
        // 🪶 Große Vertragsfelder raus, BEVOR sortiert/zurückgegeben wird — sonst trägt
        // jedes Event eine ~1MB-Kopie des Vertrags (fullText/analysis/legalLens/...);
        // bei Accounts mit vielen Events sprengt das den Sort + die App. Antwort nutzt
        // aus contract nur name/provider/amount (Transform unten) → byte-identisch.
        { $project: { "contract.fullText": 0, "contract.content": 0, "contract.extractedText": 0, "contract.analysis": 0, "contract.legalLens": 0, "contract.legalPulse": 0 } }
        // ⚠️ KEIN DB-$sort: bei sehr vielen Events sprengt selbst der Sort schlanker Docs
        // das 32MB-Limit (und Atlas-Flex unterstützt allowDiskUse nicht). Die finale
        // Reihenfolge macht ohnehin die JS-Sortierung unten (allEvents.sort nach date) —
        // der DB-$sort war redundant → Fehler strukturell ausgeschlossen, egal wie viele Events.
      ], { allowDiskUse: true })
      .toArray();
    
    // Parse date range for recurrence expansion
    const fromDate = from ? new Date(from) : new Date();
    const toDate = to ? new Date(to) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // Expand recurring events
    let allEvents = [...events];
    for (const event of events) {
      if (event.isRecurringMaster && event.recurrence) {
        const instances = generateRecurrenceInstances(event, fromDate, toDate);
        allEvents = [...allEvents, ...instances];
      }
    }

    // Sort all events by date
    allEvents.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Transform for frontend
    const transformedEvents = allEvents.map(event => ({
      id: event._id.toString(),
      contractId: event.contractId?.toString(),
      contractName: event.contract?.name || event.metadata?.envelopeTitle || (event.isManual ? event.title : "Unbekannter Vertrag"),
      title: event.title,
      description: event.description,
      date: event.date,
      type: event.type,
      severity: event.severity,
      status: event.status,
      notes: event.notes || '',
      metadata: event.metadata,
      provider: event.metadata?.provider || event.contract?.provider,
      amount: event.contract?.amount,
      suggestedAction: event.metadata?.suggestedAction,
      isManual: event.isManual === true, // Explizit boolean
      // 20.08.2026 (Noahs AVV-Befund): Wann ging die Mail WIRKLICH raus? Nötig, damit
      // die UI bei Frühwarnungen (Lookahead für nackte Stichtage) ehrlich "Vorab
      // erinnert am {Datum}" zeigen kann statt "Am Tag selbst ✓ gesendet" mit
      // künftigem Datum — dieser Widerspruch verwirrte real.
      notifiedAt: event.notifiedAt || null,
      // Recurrence fields for frontend
      recurrence: event.recurrence || null,
      isRecurringMaster: event.isRecurringMaster || false,
      isRecurringInstance: event.isRecurringInstance || false,
      masterEventId: event.masterEventId?.toString() || null
    }));

    // 🛡️ Stufe 4 (19.08.2026): Abdeckungs-Auskunft pro Frist — NUR im Listen-Pfad
    // (bei ?contractId/?envelopeId sind die Vorwarner selbst in der Antwort, dort
    // braucht es keine Zusammenfassung). Die Vorwarner bleiben 3b-ausgeblendet;
    // jedes Haupt-Event bekommt `coverage` aus seinen per metadata.deadlineEventId
    // (Stufe 2) verknüpften Vorwarnern. Grundlage der „Überblick"-Ansicht.
    // Fail-safe: ein Fehler hier darf die Kalender-Antwort nie verhindern.
    if (!contractId && !envelopeId && transformedEvents.length > 0) {
      try {
        const { buildCoverageMap } = require("../utils/reminderCoverage");
        const mainIds = allEvents.map(e => e._id).filter(Boolean);
        const linkedReminders = await req.db.collection("contract_events")
          .find({ "metadata.deadlineEventId": { $in: mainIds } })
          .project({ date: 1, status: 1, "metadata.daysUntil": 1, "metadata.deadlineEventId": 1 })
          .toArray();
        const coverageMap = buildCoverageMap(linkedReminders);
        for (const ev of transformedEvents) {
          const cov = coverageMap.get(ev.id);
          if (cov) ev.coverage = cov;
        }
      } catch (covErr) {
        console.error("⚠️ coverage-Anreicherung übersprungen:", covErr.message);
      }
    }

    // 🔒 Prüfe Zugriffsrechte für Frontend UI-State
    const access = await checkCalendarAccess(req.db, req.user.userId);

    res.json({
      success: true,
      events: transformedEvents,
      count: transformedEvents.length,
      // 🔒 Access Info für Frontend
      access: {
        canCreate: access.hasAccess,
        canEdit: access.hasAccess,
        canDelete: access.hasAccess,
        canSnooze: access.hasAccess,
        canDismiss: access.hasAccess,
        plan: access.plan,
        upgradeRequired: !access.hasAccess,
        requiredPlans: CALENDAR_FULL_ACCESS_PLANS
      }
    });

  } catch (error) {
    console.error("❌ Error fetching calendar events:", error);
    res.status(500).json({ 
      success: false, 
      error: "Fehler beim Abrufen der Kalenderereignisse" 
    });
  }
});

// POST /api/calendar/generate/:contractId - Events für einen Vertrag generieren
router.post("/generate/:contractId", verifyToken, async (req, res) => {
  try {
    const contractId = safeObjectId(req.params.contractId);
    if (!contractId) return res.status(400).json({ success: false, error: "Ungültige Vertrags-ID" });
    const userId = new ObjectId(req.user.userId);
    
    // Verify contract ownership
    const contract = await req.db.collection("contracts").findOne({
      _id: contractId,
      userId: userId
    });
    
    if (!contract) {
      return res.status(404).json({ 
        success: false, 
        error: "Vertrag nicht gefunden" 
      });
    }
    
    // Manueller User-Trigger "Events neu generieren": Cleanup alte AI-Events,
    // erzeuge frische — manuelle Termine bleiben unangetastet.
    const { generated } = await cleanAndRegenerateAIEvents(req.db, contract);

    res.json({
      success: true,
      message: `${generated} Ereignisse für Vertrag "${contract.name}" generiert`,
      eventsGenerated: generated
    });
    
  } catch (error) {
    console.error("❌ Error generating events:", error);
    res.status(500).json({ 
      success: false, 
      error: "Fehler beim Generieren der Ereignisse" 
    });
  }
});

// POST /api/calendar/regenerate-all - Alle Events neu generieren
router.post("/regenerate-all", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);
    
    // Get all user contracts
    const contracts = await req.db.collection("contracts")
      .find({ userId })
      .toArray();
    
    // Find contracts that don't have any events yet
    const contractsWithEvents = await req.db.collection("contract_events")
      .distinct("contractId", { userId });

    const contractsWithoutEvents = contracts.filter(c =>
      !contractsWithEvents.some(id => id && id.toString() === c._id.toString())
    );

    // Only generate events for contracts missing them — never delete existing events
    let totalEvents = 0;
    for (const contract of contractsWithoutEvents) {
      const events = await generateEventsForContract(req.db, contract);
      totalEvents += events.length;
    }
    
    res.json({
      success: true,
      message: `${totalEvents} Ereignisse für ${contracts.length} Verträge neu generiert`,
      contractsProcessed: contracts.length,
      eventsGenerated: totalEvents
    });
    
  } catch (error) {
    console.error("❌ Error regenerating all events:", error);
    res.status(500).json({ 
      success: false, 
      error: "Fehler beim Neugenerieren der Ereignisse" 
    });
  }
});

// Ergänze in backend/routes/calendar.js die PATCH Route für Event-Updates:

// PATCH /api/calendar/events/:eventId - Event aktualisieren (ERWEITERT für Manual Edit)
router.patch("/events/:eventId", verifyToken, async (req, res) => {
  try {
    const eventId = safeObjectId(req.params.eventId);
    if (!eventId) return res.status(400).json({ success: false, error: "Ungültige Event-ID" });
    const userId = new ObjectId(req.user.userId);
    const { status, notes, snoozeDays, date, title, description, type, severity, recurrence, deleteRecurrence } = req.body;
    
    // Verify event ownership
    const event = await req.db.collection("contract_events").findOne({
      _id: eventId,
      userId: userId
    });
    
    if (!event) {
      return res.status(404).json({ 
        success: false, 
        error: "Ereignis nicht gefunden" 
      });
    }
    
    // Update event
    const updateData = {
      updatedAt: new Date()
    };

    if (status) {
      updateData.status = status;

      // Handle snooze — 31.07.2026 (TÜV Paket B1): geteilter Helfer. Vorwarner werden
      // verschoben (re-fire am neuen Tag, Juni-Fix bleibt erhalten), echte Frist-Termine
      // bleiben unantastbar (Zusatz-Erinnerung stattdessen; Datum ändert nur "Bearbeiten").
      if (status === 'snoozed' && snoozeDays) {
        const { applySnooze } = require("../services/calendarSnooze");
        await applySnooze(req.db, event, snoozeDays);
        delete updateData.status; // Helfer hat Status/Datum bzw. Zusatz-Event bereits gesetzt
      }
    }

    // ✅ NEW: Allow manual editing of all fields
    // 31.07.2026 (TÜV-Fix): Datum validieren (Invalid Date entkam allen Queries) +
    // severity-Whitelist (anderer Wert = Termin sichtbar, aber Versand-Cron mailt nie).
    if (date !== undefined) {
      const parsedPatchDate = new Date(date);
      if (isNaN(parsedPatchDate.getTime())) {
        return res.status(400).json({ success: false, error: "Ungültiges Datum" });
      }
      updateData.date = parsedPatchDate;
      updateData.manuallyEdited = true; // Mark as manually edited
    }
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (severity !== undefined) {
      const ALLOWED_SEVERITIES = ["info", "warning", "critical"];
      if (!ALLOWED_SEVERITIES.includes(severity)) {
        return res.status(400).json({ success: false, error: "Ungültige severity (erlaubt: info, warning, critical)" });
      }
      updateData.severity = severity;
    }
    if (notes !== undefined) updateData.notes = notes;

    // ✅ Recurrence-Updates
    if (deleteRecurrence) {
      // Remove recurrence from event
      updateData.recurrence = null;
      updateData.isRecurringMaster = false;
    } else if (recurrence !== undefined) {
      if (recurrence && recurrence.type && recurrence.type !== 'none') {
        updateData.recurrence = {
          type: recurrence.type,
          interval: recurrence.interval || 1,
          endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
          count: recurrence.count || null,
          daysOfWeek: recurrence.daysOfWeek || null
        };
        updateData.isRecurringMaster = true;
      } else {
        updateData.recurrence = null;
        updateData.isRecurringMaster = false;
      }
    }

    // ✅ Vertrag zuordnen bei manuellen Events
    if (req.body.contractId !== undefined) {
      if (req.body.contractId) {
        const validCid = safeObjectId(req.body.contractId);
        if (!validCid) return res.status(400).json({ success: false, error: "Ungültige Vertrags-ID" });

        // 🔒 Ownership-Check: User darf nur eigene Verträge zuordnen.
        // Gleiches Pattern wie POST /events (Zeile 477-487) — verhindert Cross-Contract-Binding.
        const ownsContract = await req.db.collection("contracts").findOne({
          _id: validCid,
          userId
        });
        if (!ownsContract) {
          return res.status(404).json({ success: false, error: "Vertrag nicht gefunden" });
        }

        updateData.contractId = validCid;
        updateData.isManual = false; // Nicht mehr manuell wenn Vertrag zugeordnet
      } else {
        // Vertrag entfernen
        updateData.contractId = null;
        updateData.isManual = true;
      }
    }
    
    await req.db.collection("contract_events").updateOne(
      { _id: eventId },
      { $set: updateData }
    );
    
    // Log action if status changed
    if (status && status !== event.status) {
      await req.db.collection("event_logs").insertOne({
        eventId,
        userId,
        action: "status_changed",
        fromStatus: event.status,
        toStatus: status,
        timestamp: new Date()
      });
    }
    
    res.json({
      success: true,
      message: "Ereignis aktualisiert",
      event: { ...event, ...updateData }
    });
    
  } catch (error) {
    console.error("❌ Error updating event:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Aktualisieren des Ereignisses"
    });
  }
});

// POST /api/calendar/events - Neues manuelles Event erstellen
// 🔒 Erfordert Business/Enterprise Abo
router.post("/events", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);

    // 🔒 Subscription Check - Free User können keine Events erstellen
    const access = await checkCalendarAccess(req.db, req.user.userId);
    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        error: access.message,
        upgradeRequired: true,
        requiredPlans: CALENDAR_FULL_ACCESS_PLANS
      });
    }

    const { contractId, title, description, date, type, severity, notes, recurrence } = req.body;

    // Validate required fields
    if (!title || !date) {
      return res.status(400).json({
        success: false,
        error: "Titel und Datum sind erforderlich"
      });
    }

    // 31.07.2026 (TÜV-Fix): Eingaben absichern.
    // (a) Ungültiges Datum ("xxx" → Invalid Date) wurde bisher roh gespeichert und entkam
    //     danach allen Datums-Queries. (b) Datum wie überall im System auf 12:00 lokal ankern
    //     (createLocalDate-Konvention) — roh gespeicherte 00:00-UTC-Zeiten kippen an
    //     Zeitzonen-/DST-Kanten um einen Tag. (c) severity-Whitelist: der Versand-Cron matcht
    //     NUR info/warning/critical — ein anderer Wert hieße "Termin sichtbar, Mail nie".
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: "Ungültiges Datum" });
    }
    const normalizedDate = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate(), 12, 0, 0, 0);
    const ALLOWED_SEVERITIES = ["info", "warning", "critical"];
    const safeSeverity = ALLOWED_SEVERITIES.includes(severity) ? severity : "info";

    let contract = null;
    let eventContractId = null;
    let contractName = "Individuelle Erinnerung";
    let metadata = {};

    // If contractId is provided and not 'NO_CONTRACT', verify contract ownership
    if (contractId && contractId !== 'NO_CONTRACT') {
      const validCid = safeObjectId(contractId);
      if (!validCid) return res.status(400).json({ success: false, error: "Ungültige Vertrags-ID" });

      contract = await req.db.collection("contracts").findOne({
        _id: validCid,
        userId
      });

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: "Vertrag nicht gefunden"
        });
      }

      eventContractId = validCid;
      contractName = contract.name;
      metadata = {
        contractName: contract.name,
        // 31.07.2026 (TÜV-Fix): Provider als String normalisieren (Objekt → "[object Object]" in Mails)
        provider: require("../utils/formatProvider").formatProvider(contract.provider) || null
      };
    }

    // Recurrence validation
    let recurrenceData = null;
    if (recurrence && recurrence.type && recurrence.type !== 'none') {
      recurrenceData = {
        type: recurrence.type, // 'daily', 'weekly', 'monthly', 'yearly'
        interval: recurrence.interval || 1, // Every X days/weeks/months/years
        endDate: recurrence.endDate ? new Date(recurrence.endDate) : null,
        count: recurrence.count || null, // Number of occurrences
        daysOfWeek: recurrence.daysOfWeek || null // For weekly: [0-6] (Sun-Sat)
      };
    }

    // 11.08.2026: Titel durch completeDanglingLabel — schließt den Bypass, dass
    // "In Kalender übernehmen" ein hängendes KI-Label ("Kündigungseingang bis")
    // ungeprüft als Termin-Titel speichert. Vollständige Titel bleiben unverändert.
    // Deckt POST ab (PATCH/Titel-Edit bewusst nicht — explizite User-Eingabe).
    // AUSNAHMEN (adversarialer Review 11.08.):
    //  - Serien (recurrenceData): der Master-Titel wird in ALLE Instanzen
    //    gespreadet — ein eingefrorenes Erst-Datum wäre ab Instanz 2 falsch.
    //    Serien-Titel bleiben datumsfrei (gleiche Regel wie calendarEvents.js Pfad A).
    //  - REMINDER-Typen: deren Datum ist das VORWARN-Datum, nicht die Frist —
    //    Anhängen würde das falsche Datum in den Titel schreiben.
    const completedTitle = (recurrenceData || /REMINDER/i.test(type || ''))
      ? title
      : completeDanglingLabel(title, normalizedDate);

    // Create new event
    const newEvent = {
      userId,
      ...(eventContractId && { contractId: eventContractId }),
      contractName,
      title: completedTitle,
      description: description || '',
      date: normalizedDate,
      type: type || 'CUSTOM',
      severity: safeSeverity,
      status: 'scheduled',
      notes: notes || '',
      manuallyCreated: true,
      isIndividualReminder: !eventContractId,
      isManual: true, // Manuell erstelltes Event (nicht AI-generiert)
      metadata,
      // Recurrence fields
      recurrence: recurrenceData,
      isRecurringMaster: !!recurrenceData, // This is the master event
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await req.db.collection("contract_events").insertOne(newEvent);

    res.json({
      success: true,
      message: "Event erfolgreich erstellt",
      event: { ...newEvent, _id: result.insertedId }
    });

  } catch (error) {
    console.error("❌ Error creating event:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Erstellen des Events"
    });
  }
});

// DELETE /api/calendar/events/:eventId - Event löschen
// 🔒 Erfordert Business/Enterprise Abo
router.delete("/events/:eventId", verifyToken, async (req, res) => {
  try {
    const eventId = safeObjectId(req.params.eventId);
    if (!eventId) return res.status(400).json({ success: false, error: "Ungültige Event-ID" });
    const userId = new ObjectId(req.user.userId);

    // 🔒 Subscription Check - Free User können keine Events löschen
    const access = await checkCalendarAccess(req.db, req.user.userId);
    if (!access.hasAccess) {
      return res.status(403).json({
        success: false,
        error: access.message,
        upgradeRequired: true,
        requiredPlans: CALENDAR_FULL_ACCESS_PLANS
      });
    }

    // Verify event ownership
    const event = await req.db.collection("contract_events").findOne({
      _id: eventId,
      userId
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Ereignis nicht gefunden"
      });
    }

    // Delete event
    await req.db.collection("contract_events").deleteOne({ _id: eventId });

    res.json({
      success: true,
      message: "Event gelöscht"
    });

  } catch (error) {
    console.error("❌ Error deleting event:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Löschen des Events"
    });
  }
});

// GET /api/calendar/upcoming - Kommende wichtige Events
router.get("/upcoming", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);
    const { days = 30 } = req.query;

    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + parseInt(days));

    const events = await req.db.collection("contract_events")
      .aggregate([
        {
          $match: {
            userId,
            date: { $gte: now, $lte: future },
            status: { $in: ["scheduled", "notified"] },
            // Show all severities: info, warning, critical
            // 3b: Auto-Vorwarnungen ausblenden (nur Anzeige) — siehe utils/calendarVisibility.js
            $and: [VISIBLE_EVENT_MATCH]
          }
        },
        {
          // 🛟 32MB-Sort-Fix: NUR contract.name holen (Sub-Pipeline), statt das ganze
          // ~5MB-Vertrags-Doc an jedes Event zu hängen. Sonst sprengt der nachfolgende
          // $sort das 32MB-Limit (Atlas-Flex ohne allowDiskUse). Antwort nutzt nur
          // contract.name (Z. weiter unten) → Verhalten unverändert.
          // (Großfelder einzeln strippen reicht NICHT — Vertrag hat zu viele große Felder.)
          $lookup: {
            from: "contracts",
            let: { cid: "$contractId" },
            pipeline: [
              { $match: { $expr: { $eq: ["$_id", "$$cid"] } } },
              { $project: { name: 1 } }
            ],
            as: "contract"
          }
        },
        { $unwind: { path: "$contract", preserveNullAndEmptyArrays: true } },
        { $sort: { date: 1, severity: -1 } },
        { $limit: 10 }
      ])
      .toArray();

    res.json({
      success: true,
      events: events.map(e => ({
        id: e._id.toString(),
        title: e.title,
        date: e.date,
        severity: e.severity,
        contractName: e.contract?.name,
        daysUntil: Math.ceil((new Date(e.date) - now) / (1000 * 60 * 60 * 24))
      }))
    });
    
  } catch (error) {
    console.error("❌ Error fetching upcoming events:", error);
    res.status(500).json({ 
      success: false, 
      error: "Fehler beim Abrufen kommender Ereignisse" 
    });
  }
});

// GET /api/calendar/ics - ICS-Feed für externe Kalender
// WICHTIG: Dieser Endpoint muss IMMER valides ICS zurückgeben, auch bei Fehlern!
router.get("/ics", async (req, res) => {
  // Setze ICS-Header immer zuerst - damit externe Kalender die Datei akzeptieren
  res.setHeader("Content-Type", "text/calendar; charset=utf-8");
  res.setHeader("Content-Disposition", 'inline; filename="contract-ai-calendar.ics"');
  // CORS für externe Kalender-Apps erlauben
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");

  try {
    const { token } = req.query;

    if (!token) {
      // Leerer Kalender bei fehlendem Token
      return res.send(generateEmptyICS("Token fehlt - bitte neu synchronisieren"));
    }

    // Decode and verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtError) {
      console.error("❌ JWT verification failed:", jwtError.message);
      return res.send(generateEmptyICS("Token ungültig oder abgelaufen - bitte neu synchronisieren"));
    }

    // 🔒 01.09.2026 (Stufe 0): identische Härtung wie in der AKTIVEN Route in
    // server.js (~Z.514, die zuerst registriert ist und deshalb immer gewinnt —
    // diese Fassung hier ist toter Code, wird aber konsistent gehalten, damit ein
    // späteres Umhängen keine ungehärtete Route reaktiviert). Details: utils/tokenShape.js.
    const { isCalendarSyncPayload, isStoredSyncToken } = require("../utils/tokenShape");
    if (!isCalendarSyncPayload(decoded) || !ObjectId.isValid(decoded.userId)) {
      return res.send(generateEmptyICS("Token ungültig - bitte neu synchronisieren"));
    }

    const userId = new ObjectId(decoded.userId);

    const feedUser = await req.db.collection("users").findOne(
      { _id: userId },
      { projection: { calendarSyncToken: 1 } }
    );
    if (!isStoredSyncToken(token, feedUser)) {
      return res.send(generateEmptyICS("Token widerrufen - bitte neu synchronisieren"));
    }

    // 03.08.2026 (TÜV-Nachzügler, Noah-Wunsch): Derselbe Sichtbarkeits-Filter wie in
    // ALLEN App-Ansichten (Kalender, "Bald fällig", Glocke) — der Filter-Kommentar in
    // calendarVisibility.js nannte den ICS-Export von Anfang an als Ziel, er war nur
    // nie angeschlossen. Ohne ihn erschien JEDE Frist im externen Google/Apple-Kalender
    // als 3-4 Einzeltermine ("In 2 Wochen: …", "7 Tage vorher: …"). Die Weck-Funktion
    // bleibt: Haupt-Termine tragen im ICS eigene VALARM-Alarme (24h/1h vorher), eigene
    // Erinnerungen (custom/manuell) bleiben als Termine sichtbar. Reine Anzeige.
    const allEvents = await req.db.collection("contract_events")
      .find({ userId, status: { $ne: "dismissed" }, ...VISIBLE_EVENT_MATCH })
      .sort({ date: 1 })
      .toArray();

    // Step 2: Enrich with contract data
    const contractIds = [...new Set(allEvents.filter(e => e.contractId).map(e => e.contractId.toString()))];
    const contracts = contractIds.length > 0
      ? await req.db.collection("contracts")
          // 🛟 Speicher-Schutz: nur die 3 vom ICS-Generator genutzten Felder
          // (_id/name/provider) holen, nicht das ganze ~5MB-Vertrags-Doc.
          .find({ _id: { $in: contractIds.map(id => new ObjectId(id)) } }, { projection: { name: 1, provider: 1 } })
          .toArray()
      : [];
    const contractMap = new Map(contracts.map(c => [c._id.toString(), c]));

    const events = allEvents.map(e => ({
      ...e,
      contract: e.contractId ? contractMap.get(e.contractId.toString()) || null : null
    }));

    console.log(`📅 ICS Feed: ${events.length} Events für User ${userId}`);

    // Generate ICS content
    const icsContent = generateICSFeed(events);
    res.send(icsContent);

  } catch (error) {
    console.error("❌ Error generating ICS feed:", error);
    // Bei Fehlern trotzdem gültiges ICS zurückgeben
    res.send(generateEmptyICS("Fehler beim Laden - bitte später erneut versuchen"));
  }
});

// Helper: Generiert leeren ICS-Kalender mit Info-Event
function generateEmptyICS(message) {
  const now = new Date();
  const dateStr = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Contract AI//Calendar Feed//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Contract AI Kalender',
    'X-WR-CALDESC:Vertragserinnerungen von Contract AI',
    'BEGIN:VEVENT',
    `UID:info-${Date.now()}@contract-ai.de`,
    `DTSTAMP:${dateStr}`,
    `DTSTART:${dateStr}`,
    `DTEND:${dateStr}`,
    `SUMMARY:Contract AI - ${escapeICS(message)}`,
    `DESCRIPTION:Bitte öffnen Sie contract-ai.de und synchronisieren Sie den Kalender erneut.`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
    // 11.08.2026: auch der Fehlerpfad muss RFC-5545-konform falten (75 Oktette)
  ].map(foldICSLine).join('\r\n');
}

// POST /api/calendar/quick-action - Quick Actions aus dem Kalender
// 🔒 Bestimmte Aktionen erfordern Business/Enterprise Abo
router.post("/quick-action", verifyToken, async (req, res) => {
  try {
    const { eventId, action, data } = req.body;
    const userId = new ObjectId(req.user.userId);

    // 🔒 Aktionen die Daten ändern erfordern Business/Enterprise
    const RESTRICTED_ACTIONS = ["snooze", "dismiss", "cancel", "complete", "edit"];
    if (RESTRICTED_ACTIONS.includes(action)) {
      const access = await checkCalendarAccess(req.db, req.user.userId);
      if (!access.hasAccess) {
        return res.status(403).json({
          success: false,
          error: access.message,
          upgradeRequired: true,
          requiredPlans: CALENDAR_FULL_ACCESS_PLANS
        });
      }
    }

    // Verify event ownership
    const validEventId = safeObjectId(eventId);
    if (!validEventId) return res.status(400).json({ success: false, error: "Ungültige Event-ID" });

    const event = await req.db.collection("contract_events").findOne({
      _id: validEventId,
      userId
    });

    if (!event) {
      return res.status(404).json({
        success: false,
        error: "Ereignis nicht gefunden"
      });
    }

    let result = {};
    
    switch (action) {
      case "cancel":
        // Trigger cancellation workflow
        result = await triggerCancellation(req.db, event.contractId, userId);
        break;
        
      case "compare":
        // Open comparison tool
        result = { 
          redirect: `/compare?contractId=${event.contractId}` 
        };
        break;
        
      case "optimize":
        // Open optimizer
        result = { 
          redirect: `/optimize/${event.contractId}` 
        };
        break;
        
      case "snooze": {
        // 31.07.2026 (TÜV Paket B1): geteilter Helfer — Vorwarner werden verschoben,
        // echte Frist-Termine bleiben unantastbar (Zusatz-Erinnerung stattdessen).
        const { applySnooze } = require("../services/calendarSnooze");
        const snoozeResult = await applySnooze(req.db, event, data?.days || 7);
        result = {
          message: snoozeResult.message,
          mode: snoozeResult.mode
        };
        break;
      }

      case "dismiss":
        // Dismiss event
        await req.db.collection("contract_events").updateOne(
          { _id: event._id },
          {
            $set: {
              status: "dismissed",
              dismissedAt: new Date(),
              updatedAt: new Date()
            }
          }
        );

        result = {
          message: "Erinnerung verworfen"
        };
        break;

      case "edit":
        // Open contract edit page
        result = {
          redirect: `/contracts?view=${event.contractId}`
        };
        break;

      default:
        return res.status(400).json({
          success: false,
          error: "Unbekannte Aktion"
        });
    }
    
    res.json({
      success: true,
      action,
      result
    });
    
  } catch (error) {
    console.error("❌ Error executing quick action:", error);
    res.status(500).json({ 
      success: false, 
      error: "Fehler beim Ausführen der Aktion" 
    });
  }
});

// GET /api/calendar/quick-action - Quick Actions aus E-Mail-Links (snooze/dismiss)
router.get("/quick-action", async (req, res) => {
  try {
    const { token, action, days } = req.query;
    const baseUrl = process.env.FRONTEND_URL || "https://contract-ai.de";

    if (!token || !action) {
      return res.redirect(`${baseUrl}/calendar?error=invalid_link`);
    }

    // Nur snooze und dismiss via E-Mail-Link erlaubt
    if (!["snooze", "dismiss"].includes(action)) {
      return res.redirect(`${baseUrl}/calendar?error=invalid_action`);
    }

    // JWT aus Query-Param verifizieren (nicht aus Authorization Header)
    const jwt = require("jsonwebtoken");
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      return res.redirect(`${baseUrl}/calendar?error=token_expired`);
    }

    const { eventId, userId } = payload;
    const db = req.db;
    const validEventId = safeObjectId(eventId);
    const validUserId = safeObjectId(userId);
    if (!validEventId || !validUserId) {
      return res.redirect(`${baseUrl}/calendar?error=invalid_link`);
    }
    const event = await db.collection("contract_events").findOne({
      _id: validEventId,
      userId: validUserId
    });

    if (!event) {
      return res.redirect(`${baseUrl}/calendar?error=event_not_found`);
    }

    if (action === "snooze") {
      // 31.07.2026 (TÜV Paket B1): geteilter Helfer — Mail-Link "Erinnern in 7 Tagen"
      // verschiebt keine echten Frist-Termine mehr (Zusatz-Erinnerung stattdessen).
      const { applySnooze } = require("../services/calendarSnooze");
      const snoozeResult = await applySnooze(db, event, parseInt(days) || 7);
      return res.redirect(`${baseUrl}/calendar?success=snoozed&days=${parseInt(days) || 7}&mode=${snoozeResult.mode}`);
    }

    if (action === "dismiss") {
      await db.collection("contract_events").updateOne(
        { _id: event._id },
        { $set: { status: "dismissed", dismissedAt: new Date(), updatedAt: new Date() } }
      );
      return res.redirect(`${baseUrl}/calendar?success=dismissed`);
    }

  } catch (error) {
    console.error("❌ Error in email quick action:", error);
    const baseUrl = process.env.FRONTEND_URL || "https://contract-ai.de";
    return res.redirect(`${baseUrl}/calendar?error=server_error`);
  }
});

// GET /api/calendar/sync-links - Sync-Links für externe Kalender abrufen
router.get("/sync-links", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);

    // Check if user has a sync token, create one if not
    let user = await req.db.collection("users").findOne({ _id: userId });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Benutzer nicht gefunden"
      });
    }

    let syncToken = user.calendarSyncToken;
    let tokenCreatedAt = user.calendarSyncTokenCreatedAt;

    // Generate new sync token if none exists
    // 🔒 01.09.2026 (Stufe 0): Seit dem Widerrufs-Abgleich im ICS-Feed liefert NUR
    // noch der in der DB gespeicherte Token Termine. Das alte Lese-dann-Schreib-
    // Muster konnte bei zwei parallelen Erst-Aufrufen (zwei Tabs/Geräte) zwei
    // verschiedene Tokens ausliefern, von denen nur einer gespeichert wurde —
    // vorher harmlos, jetzt wäre der Verlierer-Link tot. Deshalb: Schreiben nur,
    // wenn noch keiner existiert (Filter matcht fehlend UND null), danach den
    // tatsächlich gespeicherten Wert lesen und GENAU DEN ausliefern.
    if (!syncToken) {
      const kandidat = generateSyncToken(userId);

      await req.db.collection("users").updateOne(
        { _id: userId, calendarSyncToken: null },
        {
          $set: {
            calendarSyncToken: kandidat,
            calendarSyncTokenCreatedAt: new Date()
          }
        }
      );

      const fresh = await req.db.collection("users").findOne(
        { _id: userId },
        { projection: { calendarSyncToken: 1, calendarSyncTokenCreatedAt: 1 } }
      );
      syncToken = fresh?.calendarSyncToken;
      tokenCreatedAt = fresh?.calendarSyncTokenCreatedAt;

      if (!syncToken) {
        // Sollte nie eintreten (User existiert, s. Check oben) — lieber ehrlicher
        // Fehler als ein Link, den der Feed sofort ablehnt.
        return res.status(500).json({ success: false, error: "Sync-Token konnte nicht gespeichert werden" });
      }
    }

    // Generate calendar links using the sync token
    const links = generateCalendarLinks(syncToken);

    res.json({
      success: true,
      links,
      tokenCreatedAt
    });

  } catch (error) {
    console.error("❌ Error fetching sync links:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Abrufen der Sync-Links"
    });
  }
});

// POST /api/calendar/regenerate-sync-token - Neuen Sync-Token generieren
router.post("/regenerate-sync-token", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);

    // Generate new sync token
    const syncToken = generateSyncToken(userId);

    const schreibErgebnis = await req.db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          calendarSyncToken: syncToken,
          calendarSyncTokenCreatedAt: new Date()
        }
      }
    );

    // 🔒 01.09.2026 (Stufe 0): Seit dem Widerrufs-Abgleich liefert nur der
    // GESPEICHERTE Token den Feed. Traf das Update niemanden (User-Doc weg),
    // wäre der frisch signierte Link sofort tot — dann ehrlich 404 statt
    // "success" mit unbrauchbaren Links.
    if (schreibErgebnis.matchedCount !== 1) {
      return res.status(404).json({ success: false, error: "Benutzer nicht gefunden" });
    }

    // Generate calendar links using the new sync token
    const links = generateCalendarLinks(syncToken);

    res.json({
      success: true,
      message: "Neuer Sync-Token generiert",
      links,
      tokenCreatedAt: new Date()
    });

  } catch (error) {
    console.error("❌ Error regenerating sync token:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Generieren des Sync-Tokens"
    });
  }
});

/**
 * Generiert einen sicheren Sync-Token für den ICS-Feed
 * Der Token ist ein JWT mit langer Gültigkeit (1 Jahr)
 */
function generateSyncToken(userId) {
  // Create a special sync token with extended validity
  const token = jwt.sign(
    {
      userId: userId.toString(),
      type: 'calendar_sync',
      // Add a random component for uniqueness
      nonce: crypto.randomBytes(8).toString('hex')
    },
    process.env.JWT_SECRET,
    { expiresIn: '365d' } // 1 year validity
  );

  return token;
}

// POST /api/calendar/regenerate-events - Events für alle Verträge neu generieren
router.post("/regenerate-events", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);

    // Import calendarEvents service
    const { regenerateAllEvents } = require('../services/calendarEvents');

    // Regenerate all events
    const totalEvents = await regenerateAllEvents(req.db, userId);

    res.json({
      success: true,
      message: `${totalEvents} Events für Ihre Verträge generiert`,
      eventsGenerated: totalEvents
    });

  } catch (error) {
    console.error("❌ Error regenerating events:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Regenerieren der Events"
    });
  }
});

// GET /api/calendar/debug - Debug-Info für ICS-Feed
router.get("/debug", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);

    // 1. Count contracts
    const contractCount = await req.db.collection("contracts").countDocuments({ userId });

    // 2. Get all events for this user
    const allEvents = await req.db.collection("contract_events")
      .find({ userId })
      .sort({ date: 1 })
      .toArray();

    // 3. Get future events only (what ICS shows)
    const now = new Date();
    const futureEvents = allEvents.filter(e => new Date(e.date) >= now && e.status !== "dismissed");

    // 4. Get contracts with their expiryDate
    const contracts = await req.db.collection("contracts")
      .find({ userId })
      .project({ name: 1, expiryDate: 1, endDate: 1, provider: 1 })
      .toArray();

    res.json({
      success: true,
      debug: {
        userId: userId.toString(),
        contractCount,
        totalEvents: allEvents.length,
        futureEvents: futureEvents.length,
        pastEvents: allEvents.length - futureEvents.length,
        contracts: contracts.map(c => ({
          name: c.name,
          provider: c.provider,
          expiryDate: c.expiryDate || c.endDate || "NICHT GESETZT",
          hasExpiryDate: !!(c.expiryDate || c.endDate)
        })),
        futureEventsList: futureEvents.slice(0, 10).map(e => ({
          title: e.title,
          date: e.date,
          type: e.type,
          status: e.status
        })),
        hint: futureEvents.length === 0
          ? "Keine zukünftigen Events vorhanden. Mögliche Gründe: 1) Verträge haben kein expiryDate, 2) Alle Events liegen in der Vergangenheit, 3) Events wurden noch nicht generiert - nutze POST /api/calendar/regenerate-events"
          : "Events vorhanden - ICS-Feed sollte funktionieren"
      }
    });

  } catch (error) {
    console.error("❌ Error in debug endpoint:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Abrufen der Debug-Infos"
    });
  }
});

// Helper function for cancellation
async function triggerCancellation(db, contractId, userId) {
  try {
    const contract = await db.collection("contracts").findOne({
      _id: contractId,
      userId
    });

    if (!contract) {
      throw new Error("Vertrag nicht gefunden");
    }

    // Create cancellation record
    const cancellation = await db.collection("cancellations").insertOne({
      contractId,
      userId,
      contractName: contract.name,
      provider: contract.provider,
      status: "draft",
      createdAt: new Date()
    });

    return {
      cancellationId: cancellation.insertedId,
      redirect: `/cancel/${contractId}`
    };

  } catch (error) {
    console.error("Error triggering cancellation:", error);
    throw error;
  }
}

// ==============================================================================
// E-MAIL PRÄFERENZEN
// ==============================================================================

// GET /api/calendar/email-preferences - Aktuelle E-Mail-Einstellungen abrufen
router.get("/email-preferences", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);

    const user = await req.db.collection("users").findOne(
      { _id: userId },
      // `role` fuer den Admin-Safeguard in resolveEffectivePlan; `_id` liefert Mongo per Default
      { projection: { emailDigestMode: 1, subscriptionPlan: 1, subscriptionActive: 1, role: 1 } }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        error: "Benutzer nicht gefunden"
      });
    }

    // 🔒 E-Mail Digest ist nur für Business/Enterprise verfügbar
    // TUEV-Fund 12.08.2026: Diese Stelle las das ROHE Feld und widersprach damit dem
    // PUT-Handler derselben Datei (der ueber checkCalendarAccess laeuft): Ein Mitglied
    // einer zahlenden Organisation bekam hier isPremiumOrHigher:false, durfte die
    // Einstellung per PUT aber sehr wohl aendern. Ausserdem war `subscriptionActive`
    // hier strikt truthy geprueft statt `!== false` wie in checkCalendarAccess —
    // Konten ohne dieses Feld fielen dadurch zusaetzlich durch.
    const effektiverPlan = await resolveEffectivePlan(req.db, user);
    const istAktiv = user.subscriptionActive !== false; // Default true fuer Legacy, wie in checkCalendarAccess
    const hasFullAccess = istAktiv && isBusinessOrHigher(effektiverPlan);
    const isPremiumOrHigher = hasFullAccess; // Alias für Abwärtskompatibilität

    res.json({
      success: true,
      emailDigestMode: user.emailDigestMode || "instant", // instant, daily, weekly
      isPremiumOrHigher,
      availableModes: isPremiumOrHigher
        ? ["instant", "daily", "weekly"]
        : ["instant"]
    });

  } catch (error) {
    console.error("❌ Error fetching email preferences:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Abrufen der E-Mail-Einstellungen"
    });
  }
});

// PUT /api/calendar/email-preferences - E-Mail-Einstellungen aktualisieren
router.put("/email-preferences", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);
    const { emailDigestMode } = req.body;

    // Validate mode
    // 20.08.2026: "weekly" wird NICHT mehr angenommen. Der Versand-Cron hätte solche
    // Nutzer übersprungen, aber der Digest-Dienst (processDigests) verarbeitet
    // ausschließlich "daily" → wer weekly gesetzt hätte, wäre ohne jede Fehlermeldung
    // dauerhaft ohne Erinnerungen geblieben. Erst wieder erlauben, wenn die Sammel-Mail
    // den Modus wirklich beherrscht (dann auch DIGEST_MODES_HANDLED im Notifier ergänzen).
    // Bestand geprüft: 0 von 559 Nutzern hatten den Wert je gesetzt, kein UI ruft die Route.
    const validModes = ["instant", "daily"];
    if (!validModes.includes(emailDigestMode)) {
      return res.status(400).json({
        success: false,
        error: emailDigestMode === "weekly"
          ? "Die wöchentliche Zusammenfassung steht derzeit nicht zur Verfügung. Erlaubt: instant, daily"
          : "Ungültiger Modus. Erlaubt: instant, daily"
      });
    }

    // 🔒 Check subscription for digest modes (Business/Enterprise only)
    if (emailDigestMode !== "instant") {
      const access = await checkCalendarAccess(req.db, req.user.userId);
      if (!access.hasAccess) {
        return res.status(403).json({
          success: false,
          error: "E-Mail Digest erfordert ein Business- oder Enterprise-Abo",
          upgradeRequired: true,
          requiredPlans: CALENDAR_FULL_ACCESS_PLANS
        });
      }
    }

    // Update user preferences
    await req.db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          emailDigestMode,
          emailPreferencesUpdatedAt: new Date()
        }
      }
    );

    console.log(`📧 E-Mail-Präferenz aktualisiert: User ${userId} -> ${emailDigestMode}`);

    res.json({
      success: true,
      emailDigestMode,
      message: emailDigestMode === "instant"
        ? "Du erhältst jetzt E-Mails sofort bei jedem Event."
        : "Du erhältst jetzt eine tägliche Zusammenfassung um 7 Uhr."
    });

  } catch (error) {
    console.error("❌ Error updating email preferences:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Aktualisieren der E-Mail-Einstellungen"
    });
  }
});

module.exports = router;