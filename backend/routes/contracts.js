// 📁 backend/routes/contracts.js - ERWEITERT mit Calendar Integration und Provider Detection
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const { onContractChange } = require("../services/calendarEvents");

const router = express.Router();
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);
let contractsCollection;
let analysisCollection;
let eventsCollection; // ✅ NEU: Events Collection

// Provider Detection Functions - NEU
const providerPatterns = {
  // Versicherungen
  'allianz': {
    name: 'Allianz Versicherungs-AG',
    displayName: 'Allianz',
    email: 'kuendigung@allianz.de',
    phone: '0800 4100 104',
    address: { street: 'Königinstraße 28', zip: '80802', city: 'München' },
    keywords: ['allianz', 'allianz versicherung', 'allianz ag'],
    category: 'Versicherung'
  },
  'axa': {
    name: 'AXA Versicherung AG',
    displayName: 'AXA',
    email: 'kuendigung@axa.de',
    phone: '0221 148 24752',
    address: { street: 'Colonia-Allee 10-20', zip: '51067', city: 'Köln' },
    keywords: ['axa', 'axa versicherung'],
    category: 'Versicherung'
  },
  'huk': {
    name: 'HUK-COBURG',
    displayName: 'HUK-COBURG',
    email: 'kuendigung@huk-coburg.de',
    phone: '09561 960',
    address: { street: 'Bahnhofsplatz', zip: '96444', city: 'Coburg' },
    keywords: ['huk', 'huk-coburg', 'huk coburg', 'huk24'],
    category: 'Versicherung'
  },
  'ergo': {
    name: 'ERGO Group AG',
    displayName: 'ERGO',
    email: 'kuendigung@ergo.de',
    phone: '0211 477 0',
    address: { street: 'ERGO-Platz 1', zip: '40477', city: 'Düsseldorf' },
    keywords: ['ergo', 'ergo versicherung', 'ergo direkt'],
    category: 'Versicherung'
  },
  // Telekommunikation
  'telekom': {
    name: 'Deutsche Telekom AG',
    displayName: 'Telekom',
    email: 'kuendigung@telekom.de',
    phone: '0800 330 1000',
    address: { street: 'Landgrabenweg 151', zip: '53227', city: 'Bonn' },
    keywords: ['telekom', 'deutsche telekom', 't-mobile', 'magenta'],
    category: 'Telekommunikation'
  },
  'vodafone': {
    name: 'Vodafone GmbH',
    displayName: 'Vodafone',
    email: 'kuendigung@vodafone.de',
    phone: '0800 172 1212',
    address: { street: 'Ferdinand-Braun-Platz 1', zip: '40549', city: 'Düsseldorf' },
    keywords: ['vodafone', 'vodafone deutschland'],
    category: 'Telekommunikation'
  },
  'o2': {
    name: 'Telefónica Germany',
    displayName: 'O2',
    email: 'kuendigung@o2online.de',
    phone: '089 2442 0',
    address: { street: 'Georg-Brauchle-Ring 50', zip: '80992', city: 'München' },
    keywords: ['o2', 'o zwei', 'telefonica', 'telefónica'],
    category: 'Telekommunikation'
  },
  '1und1': {
    name: '1&1',
    displayName: '1&1',
    email: 'kuendigung@1und1.de',
    phone: '0721 9600',
    address: { street: 'Elgendorfer Straße 57', zip: '56410', city: 'Montabaur' },
    keywords: ['1&1', '1und1', 'eins und eins', '1 und 1'],
    category: 'Telekommunikation'
  },
  // Energie
  'eon': {
    name: 'E.ON SE',
    displayName: 'E.ON',
    email: 'kuendigung@eon.de',
    phone: '0871 95 38 62 00',
    address: { street: 'Brüsseler Platz 1', zip: '45131', city: 'Essen' },
    keywords: ['eon', 'e.on', 'e-on', 'e on'],
    category: 'Energie'
  },
  'vattenfall': {
    name: 'Vattenfall GmbH',
    displayName: 'Vattenfall',
    email: 'kuendigung@vattenfall.de',
    phone: '040 657 988 630',
    address: { street: 'Überseering 12', zip: '22297', city: 'Hamburg' },
    keywords: ['vattenfall', 'vattenfall europe'],
    category: 'Energie'
  },
  // Streaming
  'netflix': {
    name: 'Netflix',
    displayName: 'Netflix',
    email: 'cancel@netflix.com',
    phone: '0800 724 9451',
    address: { street: 'Friedrichstraße 88', zip: '10117', city: 'Berlin' },
    keywords: ['netflix'],
    category: 'Streaming'
  },
  'spotify': {
    name: 'Spotify',
    displayName: 'Spotify',
    email: 'cancel@spotify.com',
    address: { street: 'Alexanderstraße 1', zip: '10178', city: 'Berlin' },
    keywords: ['spotify', 'spotify premium'],
    category: 'Streaming'
  },
  'amazon': {
    name: 'Amazon',
    displayName: 'Amazon Prime',
    email: 'kuendigung@amazon.de',
    phone: '0800 363 8469',
    address: { street: 'Marcel-Breuer-Straße 12', zip: '80807', city: 'München' },
    keywords: ['amazon prime', 'prime video', 'amazon', 'prime'],
    category: 'Streaming'
  },
  'sky': {
    name: 'Sky Deutschland',
    displayName: 'Sky',
    email: 'kuendigung@sky.de',
    phone: '089 9958 6000',
    address: { street: 'Medienallee 26', zip: '85774', city: 'Unterföhring' },
    keywords: ['sky', 'sky deutschland', 'sky ticket'],
    category: 'Streaming'
  },
  // Fitness
  'mcfit': {
    name: 'McFIT',
    displayName: 'McFIT',
    email: 'kuendigung@mcfit.com',
    phone: '030 2000 497 0',
    address: { street: 'Taubenstraße 7-9', zip: '10117', city: 'Berlin' },
    keywords: ['mcfit', 'mc fit'],
    category: 'Fitness'
  },
  'clever_fit': {
    name: 'clever fit',
    displayName: 'clever fit',
    email: 'kuendigung@clever-fit.com',
    phone: '06152 9295 0',
    address: { street: 'Waldstraße 84', zip: '64569', city: 'Nauheim' },
    keywords: ['clever fit', 'cleverfit', 'clever-fit'],
    category: 'Fitness'
  },
  // Banken
  'sparkasse': {
    name: 'Sparkasse',
    displayName: 'Sparkasse',
    email: 'kuendigung@sparkasse.de',
    keywords: ['sparkasse', 'stadtsparkasse', 'kreissparkasse'],
    category: 'Bank'
  },
  'ing': {
    name: 'ING-DiBa',
    displayName: 'ING',
    email: 'kuendigung@ing.de',
    phone: '069 27 222 0',
    address: { street: 'Theodor-Heuss-Allee 2', zip: '60486', city: 'Frankfurt am Main' },
    keywords: ['ing', 'ing-diba', 'ing diba', 'diba'],
    category: 'Bank'
  }
};

// Provider Detection Function - NEU
function detectProvider(text, filename = '') {
  if (!text && !filename) return null;
  
  const searchText = (text + ' ' + filename).toLowerCase();
  let bestMatch = null;
  let highestScore = 0;
  
  for (const [key, provider] of Object.entries(providerPatterns)) {
    let score = 0;
    
    // Check keywords
    for (const keyword of provider.keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        score += keyword.length * 2;
        // Bonus for exact word match
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(searchText)) {
          score += 10;
        }
      }
    }
    
    // Check display name
    if (searchText.includes(provider.displayName.toLowerCase())) {
      score += 20;
    }
    
    // Check full name
    if (searchText.includes(provider.name.toLowerCase())) {
      score += 15;
    }
    
    if (score > highestScore) {
      highestScore = score;
      bestMatch = provider;
    }
  }
  
  // Return provider with confidence score
  if (bestMatch && highestScore > 10) {
    return {
      ...bestMatch,
      confidence: Math.min(100, Math.round((highestScore / 50) * 100))
    };
  }
  
  return null;
}

// Extract contract details from text - NEU
function extractContractDetails(text) {
  const details = {
    contractNumber: null,
    customerNumber: null
  };
  
  // Contract number patterns
  const contractPatterns = [
    /Vertragsnummer[:\s]+([A-Z0-9\-\/]+)/i,
    /Versicherungsscheinnummer[:\s]+([A-Z0-9\-\/]+)/i,
    /Police[:\s]+([A-Z0-9\-\/]+)/i,
    /Vertrags-?Nr\.?[:\s]+([A-Z0-9\-\/]+)/i,
    /Policennummer[:\s]+([A-Z0-9\-\/]+)/i
  ];
  
  // Customer number patterns
  const customerPatterns = [
    /Kundennummer[:\s]+([A-Z0-9\-\/]+)/i,
    /Kunden-?Nr\.?[:\s]+([A-Z0-9\-\/]+)/i,
    /Mitgliedsnummer[:\s]+([A-Z0-9\-\/]+)/i,
    /Partner-?Nr\.?[:\s]+([A-Z0-9\-\/]+)/i
  ];
  
  // Extract contract number
  for (const pattern of contractPatterns) {
    const match = text.match(pattern);
    if (match) {
      details.contractNumber = match[1].trim();
      break;
    }
  }
  
  // Extract customer number
  for (const pattern of customerPatterns) {
    const match = text.match(pattern);
    if (match) {
      details.customerNumber = match[1].trim();
      break;
    }
  }
  
  return details;
}

(async () => {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    contractsCollection = db.collection("contracts");
    analysisCollection = db.collection("analyses");
    eventsCollection = db.collection("contract_events"); // ✅ NEU
    console.log("📦 Verbunden mit contracts, analyses UND contract_events");
  } catch (err) {
    console.error("❌ MongoDB-Fehler (contracts.js):", err);
  }
})();

// Helper: Analyse-Daten laden
async function enrichContractWithAnalysis(contract) {
  try {
    let analysis = null;
    
    if (contract.analysisId) {
      analysis = await analysisCollection.findOne({ 
        _id: new ObjectId(contract.analysisId) 
      });
    }
    
    if (!analysis && contract.name) {
      analysis = await analysisCollection.findOne({
        userId: contract.userId.toString(),
        $or: [
          { contractName: contract.name },
          { originalFileName: contract.name }
        ]
      });
    }
    
    if (analysis) {
      console.log(`✅ Analyse gefunden für Vertrag: ${contract.name}`);
      
      contract.analysis = {
        summary: analysis.summary,
        legalAssessment: analysis.legalAssessment,
        suggestions: analysis.suggestions,
        comparison: analysis.comparison,
        contractScore: analysis.contractScore,
        analysisId: analysis._id,
        lastAnalyzed: analysis.createdAt
      };
      
      if (analysis.fullText) {
        contract.fullText = analysis.fullText;
      } else if (analysis.extractedText) {
        contract.fullText = analysis.extractedText;
      }
    }
    
    if (!contract.fullText) {
      if (contract.content) {
        contract.fullText = contract.content;
      } else if (contract.extractedText) {
        contract.fullText = contract.extractedText;
      }
    }
    
    // ✅ NEU: Calendar Events hinzufügen
    const events = await eventsCollection
      .find({ 
        contractId: contract._id,
        status: { $ne: "dismissed" }
      })
      .sort({ date: 1 })
      .limit(5)
      .toArray();
    
    if (events.length > 0) {
      contract.upcomingEvents = events.map(e => ({
        id: e._id,
        type: e.type,
        title: e.title,
        date: e.date,
        severity: e.severity,
        status: e.status
      }));
    }
    
    return contract;
  } catch (err) {
    console.error("❌ Fehler beim Laden der Analyse/Events:", err.message);
    return contract;
  }
}

// GET /contracts – alle Verträge mit Events
router.get("/", verifyToken, async (req, res) => {
  try {
    const contracts = await contractsCollection
      .find({ userId: new ObjectId(req.user.userId) })
      .sort({ createdAt: -1 })
      .toArray();

    const enrichedContracts = await Promise.all(
      contracts.map(contract => enrichContractWithAnalysis(contract))
    );

    console.log(`📦 ${enrichedContracts.length} Verträge geladen (mit Analyse & Events)`);
    res.json(enrichedContracts);
  } catch (err) {
    console.error("❌ Fehler beim Laden der Verträge:", err.message);
    res.status(500).json({ message: "Fehler beim Abrufen der Verträge." });
  }
});

// GET /contracts/:id – Einzelvertrag mit Events
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({ 
        message: "Vertrag nicht gefunden",
        error: "Contract not found" 
      });
    }

    const enrichedContract = await enrichContractWithAnalysis(contract);
    
    console.log("✅ Vertrag gefunden:", enrichedContract.name, 
                "| Analyse:", !!enrichedContract.analysis,
                "| Events:", enrichedContract.upcomingEvents?.length || 0);
    
    res.json(enrichedContract);

  } catch (err) {
    console.error("❌ Fehler beim Laden des Vertrags:", err.message);
    res.status(500).json({ 
      message: "Fehler beim Abrufen des Vertrags",
      error: err.message 
    });
  }
});

// POST /contracts – Neuen Vertrag mit Event-Generierung und Provider Detection
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
      isGenerated,
      provider,
      amount,
      priceIncreaseDate,
      newPrice,
      autoRenewMonths,
      contractNumber,
      customerNumber,
      // 🔍 NEU: Metadaten für Company Profile Support
      contractType,
      hasCompanyProfile,
      designVariant,
      metadata,
      contractHTML,
      formData
    } = req.body;

    console.log("📁 Speichere Vertrag:", { name, isGenerated });

    // ✅ NEU: Provider Detection
    let detectedProvider = provider;
    let extractedDetails = { contractNumber, customerNumber };
    
    if (!provider && content) {
      // Try to detect provider from content
      detectedProvider = detectProvider(content, name);
      console.log("🔍 Provider Detection:", detectedProvider?.displayName || "Nicht erkannt");
      
      // Extract contract details
      extractedDetails = extractContractDetails(content);
      console.log("📋 Extrahierte Details:", extractedDetails);
    }

    const contractDoc = {
      userId: new ObjectId(req.user.userId),
      name: name || "Unbekannter Vertrag",
      laufzeit: laufzeit || "Unbekannt",
      kuendigung: kuendigung || "Unbekannt",
      expiryDate: expiryDate || null,
      status: status || "Aktiv",
      content: content || "",
      signature: signature || null,
      isGenerated: Boolean(isGenerated),
      provider: detectedProvider || provider || null,
      amount: amount || null,
      priceIncreaseDate: priceIncreaseDate || null,
      newPrice: newPrice || null,
      autoRenewMonths: autoRenewMonths || 12,
      contractNumber: extractedDetails.contractNumber || contractNumber || null,
      customerNumber: extractedDetails.customerNumber || customerNumber || null,
      // 🔍 NEU: Metadaten für Company Profile Support
      contractType: contractType || null,
      hasCompanyProfile: hasCompanyProfile || false,
      designVariant: designVariant || 'executive',
      metadata: metadata || null,
      contractHTML: contractHTML || null,
      formData: formData || null,
      createdAt: new Date(),
      updatedAt: new Date(),
      legalPulse: {
        riskScore: null,
        riskSummary: '',
        lastChecked: null,
        lawInsights: [],
        marketSuggestions: []
      }
    };

    const result = await contractsCollection.insertOne(contractDoc);
    const contractId = result.insertedId;
    
    console.log("✅ Vertrag gespeichert mit ID:", contractId);
    
    // ✅ NEU: Calendar Events generieren
    try {
      const fullContract = { ...contractDoc, _id: contractId };
      await onContractChange(client.db("contract_ai"), fullContract, "create");
      console.log("📅 Calendar Events generiert für:", name);
    } catch (eventError) {
      console.warn("⚠️ Calendar Events konnten nicht generiert werden:", eventError.message);
      // Fehler nicht werfen - Contract wurde trotzdem gespeichert
    }

    res.status(201).json({ 
      success: true, 
      contractId: contractId,
      message: 'Vertrag erfolgreich gespeichert',
      contract: { ...contractDoc, _id: contractId }
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

// PUT /contracts/:id – Vertrag mit Event-Update und Provider Re-Detection
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    
    delete updateData.userId;
    delete updateData._id;

    // ✅ NEU: Provider Re-Detection wenn content aktualisiert wird
    if (updateData.content && !updateData.provider) {
      const detectedProvider = detectProvider(updateData.content, updateData.name);
      if (detectedProvider) {
        updateData.provider = detectedProvider;
        console.log("🔍 Provider neu erkannt:", detectedProvider.displayName);
      }
      
      // Re-extract contract details
      const extractedDetails = extractContractDetails(updateData.content);
      if (extractedDetails.contractNumber && !updateData.contractNumber) {
        updateData.contractNumber = extractedDetails.contractNumber;
      }
      if (extractedDetails.customerNumber && !updateData.customerNumber) {
        updateData.customerNumber = extractedDetails.customerNumber;
      }
    }

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
    
    // ✅ NEU: Calendar Events aktualisieren
    if (result.modifiedCount > 0) {
      try {
        const updatedContract = await contractsCollection.findOne({ 
          _id: new ObjectId(id) 
        });
        
        if (updatedContract) {
          await onContractChange(client.db("contract_ai"), updatedContract, "update");
          console.log("📅 Calendar Events aktualisiert für:", updatedContract.name);
        }
      } catch (eventError) {
        console.warn("⚠️ Calendar Events Update fehlgeschlagen:", eventError.message);
      }
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

// DELETE /contracts/:id – Vertrag mit Event-Löschung
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // ✅ NEU: Zugehörige Events löschen
    try {
      await eventsCollection.deleteMany({
        contractId: new ObjectId(id),
        userId: new ObjectId(req.user.userId)
      });
      console.log("📅 Calendar Events gelöscht für Contract:", id);
    } catch (eventError) {
      console.warn("⚠️ Calendar Events konnten nicht gelöscht werden:", eventError.message);
    }

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

// PATCH /contracts/:id/reminder – Erinnerung mit Event-Update
router.patch("/:id/reminder", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }

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
    
    // ✅ NEU: Events aktivieren/deaktivieren basierend auf Reminder-Status
    if (newReminderStatus === false) {
      // Reminder deaktiviert - Events auf "muted" setzen
      await eventsCollection.updateMany(
        {
          contractId: new ObjectId(id),
          status: { $in: ["scheduled", "notified"] }
        },
        {
          $set: {
            status: "muted",
            mutedAt: new Date()
          }
        }
      );
    } else {
      // Reminder aktiviert - Events reaktivieren
      await eventsCollection.updateMany(
        {
          contractId: new ObjectId(id),
          status: "muted"
        },
        {
          $set: {
            status: "scheduled"
          },
          $unset: {
            mutedAt: ""
          }
        }
      );
    }

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

// ✅ NEU: GET /contracts/:id/events – Events für einen Vertrag
router.get("/:id/events", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verify contract ownership
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });
    
    if (!contract) {
      return res.status(404).json({ 
        message: "Vertrag nicht gefunden" 
      });
    }
    
    // Get all events for this contract
    const events = await eventsCollection
      .find({ 
        contractId: new ObjectId(id)
      })
      .sort({ date: 1 })
      .toArray();
    
    res.json({
      success: true,
      contractName: contract.name,
      events: events
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Abrufen der Events:', error);
    res.status(500).json({ 
      message: 'Fehler beim Abrufen der Events' 
    });
  }
});

// ✅ NEU: POST /contracts/:id/regenerate-events – Events neu generieren
router.post("/:id/regenerate-events", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });
    
    if (!contract) {
      return res.status(404).json({ 
        message: "Vertrag nicht gefunden" 
      });
    }
    
    // Delete old events
    await eventsCollection.deleteMany({
      contractId: new ObjectId(id),
      status: "scheduled"
    });
    
    // Generate new events
    await onContractChange(client.db("contract_ai"), contract, "update");
    
    // Get new events
    const newEvents = await eventsCollection
      .find({ 
        contractId: new ObjectId(id)
      })
      .sort({ date: 1 })
      .toArray();
    
    res.json({
      success: true,
      message: `${newEvents.length} Events neu generiert`,
      events: newEvents
    });
    
  } catch (error) {
    console.error('❌ Fehler beim Regenerieren der Events:', error);
    res.status(500).json({ 
      message: 'Fehler beim Regenerieren der Events' 
    });
  }
});

// ✅ NEU: POST /contracts/:id/detect-provider – Provider für bestehenden Vertrag erkennen
router.post("/:id/detect-provider", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });
    
    if (!contract) {
      return res.status(404).json({ 
        message: "Vertrag nicht gefunden" 
      });
    }
    
    // Detect provider from contract content
    const detectedProvider = detectProvider(
      contract.content || contract.fullText || '', 
      contract.name
    );
    
    if (detectedProvider) {
      // Update contract with detected provider
      await contractsCollection.updateOne(
        { _id: new ObjectId(id) },
        { 
          $set: { 
            provider: detectedProvider,
            updatedAt: new Date()
          } 
        }
      );
      
      console.log(`✅ Provider erkannt für ${contract.name}: ${detectedProvider.displayName}`);
      
      res.json({
        success: true,
        message: `Anbieter erkannt: ${detectedProvider.displayName}`,
        provider: detectedProvider
      });
    } else {
      res.json({
        success: false,
        message: 'Kein Anbieter erkannt',
        provider: null
      });
    }
    
  } catch (error) {
    console.error('❌ Fehler bei Provider-Erkennung:', error);
    res.status(500).json({ 
      message: 'Fehler bei der Anbieter-Erkennung' 
    });
  }
});

module.exports = router;