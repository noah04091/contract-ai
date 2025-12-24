// 📁 backend/routes/calendar.js
const express = require("express");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const verifyToken = require("../middleware/verifyToken");
const { generateEventsForContract, regenerateAllEvents } = require("../services/calendarEvents");
const { generateICSFeed, generateCalendarLinks } = require("../utils/icsGenerator");

const router = express.Router();

// GET /api/calendar/events - Alle Events im Zeitraum abrufen
router.get("/events", verifyToken, async (req, res) => {
  try {
    const { from, to, type, severity, status } = req.query;
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
        { $sort: { date: 1 } }
      ])
      .toArray();
    
    // Transform for frontend
    const transformedEvents = events.map(event => ({
      id: event._id.toString(),
      contractId: event.contractId?.toString(),
      contractName: event.contract?.name || "Unbekannter Vertrag",
      title: event.title,
      description: event.description,
      date: event.date,
      type: event.type,
      severity: event.severity,
      status: event.status,
      metadata: event.metadata,
      provider: event.metadata?.provider || event.contract?.provider,
      amount: event.contract?.amount,
      suggestedAction: event.metadata?.suggestedAction
    }));
    
    res.json({
      success: true,
      events: transformedEvents,
      count: transformedEvents.length
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
    const contractId = new ObjectId(req.params.contractId);
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
    
    // Generate events
    const events = await generateEventsForContract(req.db, contract);
    
    res.json({
      success: true,
      message: `${events.length} Ereignisse für Vertrag "${contract.name}" generiert`,
      events: events
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
    
    // Delete old events
    await req.db.collection("contract_events").deleteMany({ userId });
    
    // Generate new events for all contracts
    let totalEvents = 0;
    for (const contract of contracts) {
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
    const eventId = new ObjectId(req.params.eventId);
    const userId = new ObjectId(req.user.userId);
    const { status, notes, snoozeDays, date, title, description, type, severity } = req.body;
    
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

      // Handle snooze
      if (status === 'snoozed' && snoozeDays) {
        const newDate = new Date(event.date);
        newDate.setDate(newDate.getDate() + snoozeDays);
        updateData.date = newDate;
        updateData.snoozedUntil = newDate;
      }
    }

    // ✅ NEW: Allow manual editing of all fields
    if (date !== undefined) {
      updateData.date = new Date(date);
      updateData.manuallyEdited = true; // Mark as manually edited
    }
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (severity !== undefined) updateData.severity = severity;
    if (notes !== undefined) updateData.notes = notes;
    
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
router.post("/events", verifyToken, async (req, res) => {
  try {
    const userId = new ObjectId(req.user.userId);
    const { contractId, title, description, date, type, severity, notes } = req.body;

    // Validate required fields
    if (!title || !date) {
      return res.status(400).json({
        success: false,
        error: "Titel und Datum sind erforderlich"
      });
    }

    let contract = null;
    let eventContractId = null;
    let contractName = "Individuelle Erinnerung";
    let metadata = {};

    // If contractId is provided and not 'NO_CONTRACT', verify contract ownership
    if (contractId && contractId !== 'NO_CONTRACT') {
      contract = await req.db.collection("contracts").findOne({
        _id: new ObjectId(contractId),
        userId
      });

      if (!contract) {
        return res.status(404).json({
          success: false,
          error: "Vertrag nicht gefunden"
        });
      }

      eventContractId = new ObjectId(contractId);
      contractName = contract.name;
      metadata = {
        contractName: contract.name,
        provider: contract.provider
      };
    }

    // Create new event
    const newEvent = {
      userId,
      ...(eventContractId && { contractId: eventContractId }),
      contractName,
      title,
      description: description || '',
      date: new Date(date),
      type: type || 'CUSTOM',
      severity: severity || 'info',
      status: 'scheduled',
      notes: notes || '',
      manuallyCreated: true,
      isIndividualReminder: !eventContractId,
      metadata,
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
router.delete("/events/:eventId", verifyToken, async (req, res) => {
  try {
    const eventId = new ObjectId(req.params.eventId);
    const userId = new ObjectId(req.user.userId);

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
            status: { $in: ["scheduled", "notified"] }
            // Show all severities: info, warning, critical
          }
        },
        {
          $lookup: {
            from: "contracts",
            localField: "contractId",
            foreignField: "_id",
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

    const userId = new ObjectId(decoded.userId);

    // Get all future events
    const events = await req.db.collection("contract_events")
      .aggregate([
        {
          $match: {
            userId,
            date: { $gte: new Date() },
            status: { $ne: "dismissed" }
          }
        },
        {
          $lookup: {
            from: "contracts",
            localField: "contractId",
            foreignField: "_id",
            as: "contract"
          }
        },
        { $unwind: { path: "$contract", preserveNullAndEmptyArrays: true } }
      ])
      .toArray();

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
    `SUMMARY:Contract AI - ${message}`,
    `DESCRIPTION:Bitte öffnen Sie contract-ai.de und synchronisieren Sie den Kalender erneut.`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

// POST /api/calendar/quick-action - Quick Actions aus dem Kalender
router.post("/quick-action", verifyToken, async (req, res) => {
  try {
    const { eventId, action, data } = req.body;
    const userId = new ObjectId(req.user.userId);
    
    // Verify event ownership
    const event = await req.db.collection("contract_events").findOne({
      _id: new ObjectId(eventId),
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
        
      case "snooze":
        // Snooze event for X days
        const snoozeDays = data?.days || 7;
        const newDate = new Date(event.date);
        newDate.setDate(newDate.getDate() + snoozeDays);
        
        await req.db.collection("contract_events").updateOne(
          { _id: event._id },
          { 
            $set: { 
              date: newDate,
              status: "snoozed",
              snoozedUntil: newDate,
              updatedAt: new Date()
            } 
          }
        );
        
        result = { 
          message: `Erinnerung um ${snoozeDays} Tage verschoben` 
        };
        break;
        
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

    // Generate new sync token if none exists
    if (!syncToken) {
      syncToken = generateSyncToken(userId);

      await req.db.collection("users").updateOne(
        { _id: userId },
        {
          $set: {
            calendarSyncToken: syncToken,
            calendarSyncTokenCreatedAt: new Date()
          }
        }
      );
    }

    // Generate calendar links using the sync token
    const links = generateCalendarLinks(syncToken);

    res.json({
      success: true,
      links,
      tokenCreatedAt: user.calendarSyncTokenCreatedAt
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

    await req.db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          calendarSyncToken: syncToken,
          calendarSyncTokenCreatedAt: new Date()
        }
      }
    );

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

module.exports = router;