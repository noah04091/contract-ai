// 📁 backend/routes/calendar.js
const express = require("express");
const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const verifyToken = require("../middleware/verifyToken");
const { generateEventsForContract, regenerateAllEvents } = require("../services/calendarEvents");
const { generateICSFeed } = require("../utils/icsGenerator");

const router = express.Router();

// GET /api/calendar/events - Alle Events im Zeitraum abrufen
router.get("/events", verifyToken, async (req, res) => {
  try {
    const { from, to, type, severity, status } = req.query;
    const userId = new ObjectId(req.user.userId);
    
    // Build filter
    const filter = { userId };
    
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }
    
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    if (status) filter.status = status;
    
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
    if (!contractId || !title || !date) {
      return res.status(400).json({
        success: false,
        error: "ContractId, Titel und Datum sind erforderlich"
      });
    }

    // Verify contract ownership
    const contract = await req.db.collection("contracts").findOne({
      _id: new ObjectId(contractId),
      userId
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: "Vertrag nicht gefunden"
      });
    }

    // Create new event
    const newEvent = {
      userId,
      contractId: new ObjectId(contractId),
      contractName: contract.name,
      title,
      description: description || '',
      date: new Date(date),
      type: type || 'CUSTOM',
      severity: severity || 'info',
      status: 'scheduled',
      notes: notes || '',
      manuallyCreated: true,
      metadata: {
        contractName: contract.name,
        provider: contract.provider
      },
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

    console.log(`📅 [Upcoming] Fetching events for user ${userId}`);
    console.log(`📅 [Upcoming] Date range: ${now.toISOString()} to ${future.toISOString()}`);

    // First, check ALL events for this user
    const allEvents = await req.db.collection("contract_events")
      .find({ userId })
      .limit(5)
      .toArray();
    console.log(`📅 [Upcoming] Total events for user: ${allEvents.length}`);
    if (allEvents.length > 0) {
      console.log(`📅 [Upcoming] Sample event:`, {
        type: allEvents[0].type,
        date: allEvents[0].date,
        status: allEvents[0].status,
        severity: allEvents[0].severity
      });
    }

    const events = await req.db.collection("contract_events")
      .aggregate([
        {
          $match: {
            userId,
            date: { $gte: now, $lte: future },
            status: { $in: ["scheduled", "notified"] },
            severity: { $in: ["warning", "critical"] }
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

    console.log(`📅 [Upcoming] Filtered events: ${events.length}`);
    
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
router.get("/ics", async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).json({ 
        success: false, 
        error: "Token erforderlich" 
      });
    }
    
    // Decode and verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
    
    // Generate ICS content
    const icsContent = generateICSFeed(events);
    
    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="contract-ai-calendar.ics"');
    res.send(icsContent);
    
  } catch (error) {
    console.error("❌ Error generating ICS feed:", error);
    res.status(500).json({ 
      success: false, 
      error: "Fehler beim Generieren des Kalender-Feeds" 
    });
  }
});

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
      redirect: `/cancel/${cancellation.insertedId}`
    };
    
  } catch (error) {
    console.error("Error triggering cancellation:", error);
    throw error;
  }
}

module.exports = router;