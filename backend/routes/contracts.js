// 📁 backend/routes/contracts.js
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);
let contractsCollection;

(async () => {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    contractsCollection = db.collection("contracts");
    console.log("📦 Verbunden mit contracts (GET /contracts)");
  } catch (err) {
    console.error("❌ MongoDB-Fehler (contracts.js):", err);
  }
})();

// GET /contracts – alle Verträge des Nutzers abrufen
router.get("/", verifyToken, async (req, res) => {
  try {
    const contracts = await contractsCollection
      .find({ userId: new ObjectId(req.user.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json(contracts);
  } catch (err) {
    console.error("❌ Fehler beim Laden der Verträge:", err.message);
    res.status(500).json({ message: "Fehler beim Abrufen der Verträge." });
  }
});

// ✅ NEU: POST /contracts – Neuen Vertrag speichern (generiert oder hochgeladen)
router.post("/", verifyToken, async (req, res) => {
  try {
    const {
      name,
      laufzeit,
      kuendigung,
      expiryDate,
      status,
      content,
      signature,
      isGenerated  // ✅ Wichtig: isGenerated aus Request Body lesen
    } = req.body;

    console.log("📝 Speichere Vertrag:", { name, isGenerated }); // Debug-Log

    // Neuen Vertrag erstellen
    const contractDoc = {
      userId: new ObjectId(req.user.userId),
      name: name || "Unbekannter Vertrag",
      laufzeit: laufzeit || "Unbekannt",
      kuendigung: kuendigung || "Unbekannt",
      expiryDate: expiryDate || null,
      status: status || "Aktiv",
      content: content || "",
      signature: signature || null,
      isGenerated: Boolean(isGenerated), // ✅ Explizit als Boolean setzen
      createdAt: new Date(),
      updatedAt: new Date(),
      // Legal Pulse Platzhalter
      legalPulse: {
        riskScore: null,
        riskSummary: '',
        lastChecked: null,
        lawInsights: [],
        marketSuggestions: []
      }
    };

    // In Datenbank speichern
    const result = await contractsCollection.insertOne(contractDoc);
    
    console.log("✅ Vertrag gespeichert mit ID:", result.insertedId);

    // Erfolgreiche Antwort
    res.status(201).json({ 
      success: true, 
      contractId: result.insertedId,
      message: 'Vertrag erfolgreich gespeichert',
      contract: { ...contractDoc, _id: result.insertedId }
    });

  } catch (error) {
    console.error('❌ Fehler beim Speichern des Vertrags:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Fehler beim Speichern des Vertrags',
      error: error.message 
    });
  }
});

// PUT /contracts/:id – Vertrag aktualisieren
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    
    // User-ID aus Update-Daten entfernen (Sicherheit)
    delete updateData.userId;
    delete updateData._id;

    const result = await contractsCollection.updateOne(
      { 
        _id: new ObjectId(id), 
        userId: new ObjectId(req.user.userId) 
      },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }

    res.json({ 
      success: true, 
      message: "Vertrag erfolgreich aktualisiert" 
    });

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Vertrags:', error);
    res.status(500).json({ 
      message: 'Fehler beim Aktualisieren des Vertrags' 
    });
  }
});

// DELETE /contracts/:id – Vertrag löschen
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await contractsCollection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }

    res.json({ 
      success: true, 
      message: "Vertrag erfolgreich gelöscht" 
    });

  } catch (error) {
    console.error('❌ Fehler beim Löschen des Vertrags:', error);
    res.status(500).json({ 
      message: 'Fehler beim Löschen des Vertrags' 
    });
  }
});

// PATCH /contracts/:id/reminder – Erinnerung umschalten
router.patch("/:id/reminder", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Aktuellen Reminder-Status abfragen
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }

    // Reminder-Status umschalten
    const newReminderStatus = !contract.reminder;

    const result = await contractsCollection.updateOne(
      { 
        _id: new ObjectId(id), 
        userId: new ObjectId(req.user.userId) 
      },
      { 
        $set: { 
          reminder: newReminderStatus,
          updatedAt: new Date()
        }
      }
    );

    res.json({ 
      success: true, 
      reminder: newReminderStatus,
      message: `Erinnerung ${newReminderStatus ? 'aktiviert' : 'deaktiviert'}` 
    });

  } catch (error) {
    console.error('❌ Fehler beim Umschalten der Erinnerung:', error);
    res.status(500).json({ 
      message: 'Fehler beim Umschalten der Erinnerung' 
    });
  }
});

module.exports = router;