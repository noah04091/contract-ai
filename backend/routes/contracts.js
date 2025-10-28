// 📁 backend/routes/contracts.js - ERWEITERT mit Calendar Integration und Provider Detection
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const verifyEmailImportKey = require("../middleware/verifyEmailImportKey"); // 🔒 E-Mail-Import Security
const { onContractChange } = require("../services/calendarEvents");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const fsSync = require("fs");
const path = require("path");
const { OpenAI } = require("openai");
const { validateAttachment, generateIdempotencyKey } = require("../utils/emailImportSecurity"); // 🔒 Security Utils
const nodemailer = require("nodemailer"); // 📧 Email Service
const contractAnalyzer = require("../services/contractAnalyzer"); // 🤖 ULTRA-INTELLIGENT Contract Analyzer v10

const router = express.Router();
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);
let contractsCollection;
let analysisCollection;
let eventsCollection; // ✅ NEU: Events Collection

// ===== S3 INTEGRATION (AWS SDK v3) =====
let S3Client, GetObjectCommand, s3Instance;
let S3_AVAILABLE = false;

try {
  const { S3Client: _S3Client, GetObjectCommand: _GetObjectCommand } = require("@aws-sdk/client-s3");
  S3Client = _S3Client;
  GetObjectCommand = _GetObjectCommand;

  s3Instance = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  S3_AVAILABLE = true;
  console.log("✅ [CONTRACTS] S3 configured successfully");
} catch (error) {
  console.error("❌ [CONTRACTS] S3 configuration failed:", error.message);
  S3_AVAILABLE = false;
}

// ===== EMAIL TRANSPORTER =====
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};
const emailTransporter = nodemailer.createTransport(EMAIL_CONFIG);

// ===== OPENAI SETUP =====
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

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

    // 🆕 Envelope/Signature Data enrichment
    try {
      const Envelope = require("../models/Envelope");
      const envelope = await Envelope.findOne({ contractId: contract._id })
        .sort({ createdAt: -1 }) // Get latest envelope
        .lean();

      if (envelope) {
        const signersTotal = envelope.signers?.length || 0;
        const signersSigned = envelope.signers?.filter(s => s.status === 'SIGNED').length || 0;

        contract.envelope = {
          _id: envelope._id,
          signatureStatus: envelope.status, // DRAFT, SENT, SIGNED, COMPLETED, etc.
          signersTotal,
          signersSigned,
          s3KeySealed: envelope.s3KeySealed || null,
          completedAt: envelope.completedAt || null,
          expiresAt: envelope.expiresAt || null
        };

        // Legacy compatibility: keep signatureStatus at root level
        contract.signatureStatus = envelope.status;
        contract.signatureEnvelopeId = envelope._id;
      }
    } catch (envelopeErr) {
      console.warn("⚠️ Could not load envelope data:", envelopeErr.message);
      // Don't fail the whole request if envelope loading fails
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
    // ✅ Pagination: limit & skip aus Query-Parametern (optional, fallback auf ALLE)
    const limit = parseInt(req.query.limit) || 0; // 0 = keine Limitierung (Backward-Compatible!)
    const skip = parseInt(req.query.skip) || 0;

    // ✅ NEU: Filter-Parameter
    const searchQuery = req.query.search || '';
    const statusFilter = req.query.status || 'alle';
    const dateFilter = req.query.dateFilter || 'alle';
    const sortOrder = req.query.sort || 'neueste';
    const sourceFilter = req.query.source || 'alle';
    const folderId = req.query.folderId || null;

    // ✅ MongoDB Filter-Objekt aufbauen
    const mongoFilter = { userId: new ObjectId(req.user.userId) };

    // 🔍 Text-Suche (name, status, kuendigung)
    if (searchQuery.trim()) {
      mongoFilter.$or = [
        { name: { $regex: searchQuery, $options: 'i' } },
        { status: { $regex: searchQuery, $options: 'i' } },
        { kuendigung: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // 📊 Status-Filter
    if (statusFilter !== 'alle') {
      switch (statusFilter) {
        case 'aktiv':
          mongoFilter.status = { $in: ['aktiv', 'Aktiv', 'gültig', 'Gültig'] };
          break;
        case 'bald_ablaufend':
          mongoFilter.status = { $in: ['läuft ab', 'Läuft ab', 'bald fällig', 'Bald fällig'] };
          break;
        case 'abgelaufen':
          mongoFilter.status = { $in: ['abgelaufen', 'Abgelaufen', 'beendet', 'Beendet'] };
          break;
        case 'gekündigt':
          mongoFilter.status = { $in: ['gekündigt', 'Gekündigt'] };
          break;
      }
    }

    // 📅 Datums-Filter
    if (dateFilter !== 'alle') {
      const now = new Date();
      let dateThreshold;

      switch (dateFilter) {
        case 'letzte_7_tage':
          dateThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'letzte_30_tage':
          dateThreshold = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'letztes_jahr':
          dateThreshold = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
      }

      if (dateThreshold) {
        mongoFilter.createdAt = { $gte: dateThreshold };
      }
    }

    // 🏷️ Quelle-Filter (generated / optimized)
    if (sourceFilter === 'generated') {
      mongoFilter.isGenerated = true;
    } else if (sourceFilter === 'optimized') {
      mongoFilter.isOptimized = true;
    }

    // 📁 Folder-Filter
    if (folderId) {
      if (folderId === 'unassigned') {
        mongoFilter.folderId = { $exists: false };
      } else {
        // ✅ FIX: folderId als ObjectId konvertieren (wird in DB als ObjectId gespeichert!)
        mongoFilter.folderId = new ObjectId(folderId);
      }
    }

    // ✅ Total Count MIT den gleichen Filtern
    const totalCount = await contractsCollection.countDocuments(mongoFilter);

    // 🔄 Sortierung
    let sortOptions = {};
    switch (sortOrder) {
      case 'neueste':
        sortOptions = { createdAt: -1 };
        break;
      case 'älteste':
        sortOptions = { createdAt: 1 };
        break;
      case 'name_az':
        sortOptions = { name: 1 };
        break;
      case 'name_za':
        sortOptions = { name: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // ✅ MongoDB Query mit Filtern, Sortierung & Pagination
    let query = contractsCollection
      .find(mongoFilter)
      .sort(sortOptions);

    if (limit > 0) {
      query = query.skip(skip).limit(limit);
    }

    const contracts = await query.toArray();

    const enrichedContracts = await Promise.all(
      contracts.map(contract => enrichContractWithAnalysis(contract))
    );

    console.log(`📦 ${enrichedContracts.length} von ${totalCount} Verträgen geladen (skip: ${skip}, limit: ${limit || 'alle'}, Filter: ${searchQuery ? 'Search' : ''}${statusFilter !== 'alle' ? ' Status' : ''}${dateFilter !== 'alle' ? ' Date' : ''})`);

    // ✅ Response mit Pagination-Info
    res.json({
      contracts: enrichedContracts,
      pagination: {
        total: totalCount,
        limit: limit || totalCount,
        skip: skip,
        hasMore: skip + enrichedContracts.length < totalCount
      }
    });
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
      // 💳 NEU: Payment Tracking Fields
      paymentStatus: null,
      paymentDate: null,
      paymentDueDate: null,
      paymentAmount: null,
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

// 💳 NEU: PATCH /contracts/:id/payment – Payment Status Update
router.patch("/:id/payment", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus, paymentDate, paymentDueDate, paymentAmount } = req.body;

    console.log("💳 Payment Status Update:", {
      contractId: id,
      paymentStatus,
      paymentDate,
      paymentDueDate,
      paymentAmount
    });

    // Validate contract ownership
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Vertrag nicht gefunden"
      });
    }

    // Build update object (only update provided fields)
    const updateData = {
      updatedAt: new Date()
    };

    if (paymentStatus !== undefined) {
      updateData.paymentStatus = paymentStatus;
    }
    if (paymentDate !== undefined) {
      updateData.paymentDate = paymentDate;
    }
    if (paymentDueDate !== undefined) {
      updateData.paymentDueDate = paymentDueDate;
    }
    if (paymentAmount !== undefined) {
      updateData.paymentAmount = paymentAmount;
    }

    // Update contract
    const result = await contractsCollection.updateOne(
      {
        _id: new ObjectId(id),
        userId: new ObjectId(req.user.userId)
      },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      console.log("⚠️ Payment Status nicht geändert (keine Änderungen)");
    } else {
      console.log("✅ Payment Status erfolgreich aktualisiert");
    }

    res.json({
      success: true,
      message: "Zahlungsstatus erfolgreich aktualisiert",
      paymentStatus: updateData.paymentStatus || contract.paymentStatus,
      paymentDate: updateData.paymentDate || contract.paymentDate
    });

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Zahlungsstatus:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren des Zahlungsstatus',
      error: error.message
    });
  }
});

// 💰 NEU: PATCH /contracts/:id/costs – Cost Tracking Update
router.patch("/:id/costs", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentFrequency, subscriptionStartDate, baseAmount } = req.body;

    console.log("💰 Cost Tracking Update:", {
      contractId: id,
      paymentFrequency,
      subscriptionStartDate,
      baseAmount
    });

    // Validate contract ownership
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Vertrag nicht gefunden"
      });
    }

    // Build update object (only update provided fields)
    const updateData = {
      updatedAt: new Date()
    };

    if (paymentFrequency !== undefined) {
      updateData.paymentFrequency = paymentFrequency;
    }
    if (subscriptionStartDate !== undefined) {
      updateData.subscriptionStartDate = subscriptionStartDate;
    }
    if (baseAmount !== undefined) {
      // Speichere baseAmount als paymentAmount
      updateData.paymentAmount = baseAmount;
    }

    // Update contract
    const result = await contractsCollection.updateOne(
      {
        _id: new ObjectId(id),
        userId: new ObjectId(req.user.userId)
      },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
      console.log("⚠️ Cost Tracking nicht geändert (keine Änderungen)");
    } else {
      console.log("✅ Cost Tracking erfolgreich aktualisiert");
    }

    res.json({
      success: true,
      message: "Kostenübersicht erfolgreich aktualisiert",
      paymentFrequency: updateData.paymentFrequency || contract.paymentFrequency,
      subscriptionStartDate: updateData.subscriptionStartDate || contract.subscriptionStartDate
    });

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren der Kostenübersicht:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren der Kostenübersicht',
      error: error.message
    });
  }
});

// ✅ NEU: PATCH /contracts/:id/document-type – Manuelle Dokumenttyp-Überschreibung
router.patch("/:id/document-type", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { documentType, manualOverride } = req.body;

    // Validierung
    const validTypes = ['auto', 'invoice', 'recurring', 'one-time'];
    if (!validTypes.includes(documentType)) {
      return res.status(400).json({
        success: false,
        message: 'Ungültiger Dokumenttyp. Erlaubt: auto, invoice, recurring, one-time'
      });
    }

    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Vertrag nicht gefunden'
      });
    }

    // Update Document Type
    const updateData = {
      documentTypeOverride: documentType,
      manualOverride: manualOverride === true,
      updatedAt: new Date()
    };

    // Bei "auto" → Zurück zu GPT-Erkennung
    if (documentType === 'auto') {
      updateData.documentTypeOverride = null;
      updateData.manualOverride = false;
    }

    await contractsCollection.updateOne(
      { _id: new ObjectId(id), userId: new ObjectId(req.user.userId) },
      { $set: updateData }
    );

    // Fetch updated contract
    const updatedContract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    res.json({
      success: true,
      message: 'Dokumenttyp erfolgreich aktualisiert',
      contract: updatedContract
    });

  } catch (error) {
    console.error('❌ Fehler beim Aktualisieren des Dokumenttyps:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Aktualisieren',
      error: error.message
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

// ✅ NEU: POST /contracts/:id/analyze – Nachträgliche Analyse für bestehenden Vertrag
router.post("/:id/analyze", verifyToken, async (req, res) => {
  const requestId = `ANALYZE-${Date.now()}`;
  console.log(`\n🔍 [${requestId}] Deferred Analysis Request started`);

  try {
    const { id } = req.params;
    console.log(`📄 [${requestId}] Contract ID: ${id}`);

    // Get contract from database
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      console.log(`❌ [${requestId}] Contract not found`);
      return res.status(404).json({
        success: false,
        message: 'Vertrag nicht gefunden'
      });
    }

    // Check if already analyzed
    if (contract.analyzed !== false) {
      console.log(`⚠️ [${requestId}] Contract already analyzed`);
      return res.status(400).json({
        success: false,
        message: 'Vertrag wurde bereits analysiert'
      });
    }

    console.log(`📁 [${requestId}] Contract found:`, {
      name: contract.name,
      uploadType: contract.uploadType,
      s3Key: contract.s3Key || 'none',
      filePath: contract.filePath || 'none'
    });

    // ===== READ PDF FILE =====
    let buffer;

    if (contract.s3Key && S3_AVAILABLE && s3Instance && GetObjectCommand) {
      // Read from S3
      console.log(`📖 [${requestId}] Reading PDF from S3: ${contract.s3Key}`);

      try {
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: contract.s3Key
        });

        const response = await s3Instance.send(command);

        // Convert stream to buffer
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        buffer = Buffer.concat(chunks);

        console.log(`✅ [${requestId}] S3 file read: ${buffer.length} bytes`);
      } catch (s3Error) {
        console.error(`❌ [${requestId}] S3 read error:`, s3Error);
        return res.status(500).json({
          success: false,
          message: 'Fehler beim Laden der Datei aus dem Speicher'
        });
      }
    } else if (contract.filePath) {
      // Read from local file
      const localPath = path.join(__dirname, "..", "uploads", path.basename(contract.filePath));
      console.log(`📖 [${requestId}] Reading PDF from local disk: ${localPath}`);

      if (!fsSync.existsSync(localPath)) {
        console.error(`❌ [${requestId}] Local file not found: ${localPath}`);
        return res.status(404).json({
          success: false,
          message: 'Datei nicht gefunden. Bitte erneut hochladen.'
        });
      }

      try {
        buffer = await fs.readFile(localPath);
        console.log(`✅ [${requestId}] Local file read: ${buffer.length} bytes`);
      } catch (fileError) {
        console.error(`❌ [${requestId}] File read error:`, fileError);
        return res.status(500).json({
          success: false,
          message: 'Fehler beim Laden der Datei'
        });
      }
    } else {
      console.error(`❌ [${requestId}] No file path or S3 key found`);
      return res.status(404).json({
        success: false,
        message: 'Keine Datei gefunden. Bitte erneut hochladen.'
      });
    }

    // ===== PARSE PDF =====
    console.log(`📖 [${requestId}] Parsing PDF content...`);
    let pdfData;

    try {
      pdfData = await pdfParse(buffer);
      console.log(`✅ [${requestId}] PDF parsed: ${pdfData.numpages} pages, ${pdfData.text.length} characters`);
    } catch (parseError) {
      console.error(`❌ [${requestId}] PDF parse error:`, parseError);
      return res.status(400).json({
        success: false,
        message: 'PDF konnte nicht gelesen werden'
      });
    }

    const fullTextContent = pdfData.text;

    console.log(`📝 [${requestId}] Extracted text length: ${fullTextContent.length} characters`);

    // ===== 🆕 CONTRACT ANALYZER (v10) =====
    console.log(`🤖 [${requestId}] Running CONTRACT ANALYZER v10...`);

    let extractedProvider = null;
    let extractedContractNumber = null;
    let extractedCustomerNumber = null;
    let extractedEndDate = null;
    let extractedCancellationPeriod = null;
    let extractedIsAutoRenewal = null;
    let extractedContractDuration = null;
    let extractedStartDate = null;
    let extractedEndDateConfidence = 0;
    let extractedStartDateConfidence = 0;
    let extractedAutoRenewalConfidence = 50;
    let extractedDataSource = null;
    let providerAnalysis = null;

    try {
      providerAnalysis = await contractAnalyzer.analyzeContract(
        fullTextContent,
        contract.name
      );

      if (providerAnalysis.success && providerAnalysis.data) {
        extractedProvider = providerAnalysis.data.provider;
        extractedContractNumber = providerAnalysis.data.contractNumber;
        extractedCustomerNumber = providerAnalysis.data.customerNumber;
        extractedStartDate = providerAnalysis.data.startDate;
        extractedEndDate = providerAnalysis.data.endDate;
        extractedContractDuration = providerAnalysis.data.contractDuration;
        extractedCancellationPeriod = providerAnalysis.data.cancellationPeriod;
        extractedIsAutoRenewal = providerAnalysis.data.isAutoRenewal || false;
        extractedEndDateConfidence = providerAnalysis.data.endDateConfidence || 0;
        extractedStartDateConfidence = providerAnalysis.data.startDateConfidence || 0;
        extractedAutoRenewalConfidence = providerAnalysis.data.autoRenewalConfidence || 50;
        extractedDataSource = providerAnalysis.data.dataSource;

        console.log(`✅ [${requestId}] Contract Analyzer Results:`, {
          provider: extractedProvider?.displayName || 'Nicht erkannt',
          contractNumber: extractedContractNumber || 'Nicht gefunden',
          startDate: extractedStartDate || 'Nicht gefunden',
          endDate: extractedEndDate || 'Nicht gefunden',
          endDateConfidence: `${extractedEndDateConfidence}%`,
          dataSource: extractedDataSource,
          cancellationPeriod: extractedCancellationPeriod ?
            `${extractedCancellationPeriod.value} ${extractedCancellationPeriod.unit}` : 'Nicht gefunden',
          isAutoRenewal: extractedIsAutoRenewal,
          contractType: providerAnalysis.data.contractType
        });
      } else {
        console.warn(`⚠️ [${requestId}] Contract Analyzer failed:`, providerAnalysis.error);
      }
    } catch (analyzerError) {
      console.error(`❌ [${requestId}] Contract Analyzer error:`, analyzerError.message);
    }

    // ===== GPT-4 ANALYSIS =====
    console.log(`🤖 [${requestId}] Starting GPT-4 analysis...`);

    const analysisPrompt = `Du bist ein spezialisierter Rechtsanwalt für Vertragsrecht. Analysiere den folgenden Vertragstext SEHR DETAILLIERT und VOLLSTÄNDIG.

VERTRAGSTEXT:
${fullTextContent.substring(0, 50000)}

Antworte in folgendem JSON-Format:
{
  "summary": "Ausführliche Zusammenfassung in 3-5 Sätzen",
  "contractScore": <Zahl 0-100>,
  "legalAssessment": "Ausführliche rechtliche Bewertung",
  "suggestions": "Konkrete Verbesserungsvorschläge",
  "kuendigung": "Kündigungsfrist (z.B. '3 Monate zum Vertragsende')",
  "laufzeit": "Vertragslaufzeit (z.B. '24 Monate')",
  "status": "Aktiv/Inaktiv/Unbekannt",
  "risiken": ["Risiko 1", "Risiko 2"],
  "optimierungen": ["Optimierung 1", "Optimierung 2"],
  "contractType": "recurring|one-time|null",
  "contractTypeConfidence": "high|medium|low",
  "paymentAmount": <Zahl oder null>,
  "paymentStatus": "paid|unpaid|null",
  "paymentDueDate": "YYYY-MM-DD oder null",
  "paymentMethod": "string oder null",
  "paymentFrequency": "monthly|yearly|weekly|null"
}

WICHTIG - contractTypeConfidence Regeln:
- "high" = 3+ klare Signale, sehr sicher (z.B. "Netflix Abo, monatlich, 9.99€/Monat")
- "medium" = 2 Signale, wahrscheinlich richtig (z.B. "Mietvertrag, monatlich")
- "low" = 1 Signal, unsicher (z.B. nur "monatlich" ohne Kontext)
- Wenn contractType: null → contractTypeConfidence: "low"

🔍 KRITISCH WICHTIG - Payment-Erkennung (lies den KOMPLETTEN Text durch!):

1. contractType Erkennung (PRÄZISE & KONSERVATIV!):

   WICHTIG: Lieber null zurückgeben als falsch klassifizieren!

   ✅ "recurring" NUR wenn MINDESTENS 2 der folgenden Signale zutreffen:
   - Explizite Begriffe: "Abonnement", "Abo", "Subscription", "Mitgliedschaft"
   - Zeitliche Wiederkehr: "monatlich", "jährlich", "wöchentlich", "pro Monat"
   - Vertragslaufzeit: "Mindestlaufzeit", "Kündigungsfrist", "automatische Verlängerung"
   - Spezifische Vertragstypen: "Mietvertrag", "Versicherung", "Leasing"
   - Laufende Kosten: "monatliche Rate", "wiederkehrende Zahlung", "Jahresbeitrag"

   ✅ "one-time" NUR wenn SEHR SICHER:
   - Explizite Begriffe: "einmalig", "einmalige Zahlung", "Einmalzahlung"
   - Kaufvertrag: "Kaufvertrag", "Kaufpreis", "Verkauf von"
   - Werkvertrag: "Werkvertrag", "Dienstleistung gegen Einmalzahlung"
   - UND KEINE Hinweise auf Wiederholung (keine "monatlich", "jährlich", etc.)

   ⚠️ null (nicht setzen) wenn:
   - Unsicher oder mehrdeutig
   - Nur 1 schwaches Signal vorhanden
   - Dokument ist Rechnung (egal ob dahinter Abo oder nicht!)
   - Widersprüchliche Signale (z.B. "monatlich" UND "einmalige Zahlung")

   WICHTIG bei Rechnungen:
   - Wenn Dokument eine Rechnung ist → contractType: null
   - Grund: Rechnung kann von Abo ODER Einmalkauf sein
   - Frontend entscheidet basierend auf Dateiname

2. paymentAmount Erkennung (SEHR WICHTIG!):
   Suche nach folgenden Begriffen im GESAMTEN Text:
   - "Kaufpreis", "Gesamtpreis", "Endbetrag", "Summe", "Betrag", "Preis"
   - "Rechnungsbetrag", "Zahlbetrag", "Kaufsumme", "Verkaufspreis"
   - "EUR", "Euro", "€", gefolgt von einer Zahl
   - Zahlen mit Tausendertrennern: "15.000", "15000", "1.500,00"

   WICHTIG:
   - Extrahiere NUR die Zahl (z.B. 15000 statt "15.000 EUR")
   - Ignoriere Anzahlungen/Raten - nimm den GESAMTBETRAG
   - Bei mehreren Beträgen: nimm den HÖCHSTEN (meist der Gesamtpreis)
   - Konvertiere deutsche Schreibweise: "15.000,50" → 15000.50

3. paymentStatus Erkennung (SEHR WICHTIG!):
   - "paid" = wenn folgende Begriffe im Text:
     * "bezahlt", "beglichen", "gezahlt", "überwiesen", "erfolgt"
     * "FET", "fet", "bereits bezahlt", "Rechnung beglichen"
     * ODER wenn eine Zahlungsmethode + Vergangenheit erwähnt wird:
       "Lastschrift durchgeführt", "PayPal bezahlt", "Bar bezahlt",
       "Kreditkarte belastet", "in bar beglichen", etc.
     * ODER: "Zahlung erfolgt", "Online bezahlt", "Rechnung ausgeglichen"
     * "abgeschlossen", "erledigt", "settled", "paid", "completed"
   - "unpaid" = wenn "ausstehend", "offen", "fällig", "zu zahlen", "bitte überweisen" im Text
   - null = wenn unklar

4. paymentDueDate Erkennung:
   - Suche nach "Zahlungsziel", "fällig am", "Zahlung bis", "Zahlungsfrist"
   - Format: YYYY-MM-DD (z.B. "2025-01-15")

5. paymentMethod Erkennung (NEU - UNIVERSELL!):
   Suche nach JEDER Zahlungsmethode im Text und extrahiere sie:

   Häufige Beispiele (aber nicht limitiert darauf!):
   - "PayPal" → "PayPal"
   - "Lastschrift", "SEPA", "Bankeinzug" → "Lastschrift"
   - "Kreditkarte", "Visa", "Mastercard", "Amex" → "Kreditkarte"
   - "Überweisung", "Banküberweisung" → "Überweisung"
   - "Sofortüberweisung", "Klarna", "Stripe" → extrahiere genau wie genannt
   - "Barzahlung", "Bar bezahlt", "Cash", "in bar" → "Barzahlung"
   - "Scheck", "Verrechnungsscheck" → "Scheck"
   - "PayPal", "Apple Pay", "Google Pay" → extrahiere genau
   - "Vorkasse", "Vorauskasse" → "Vorkasse"

   WICHTIG: Sei flexibel! Wenn IRGENDEINE Zahlungsmethode erwähnt wird, extrahiere sie.
   null = nur wenn KEINE Zahlungsmethode im gesamten Text gefunden wird

6. paymentFrequency Erkennung (NEU!):
   Suche nach Zahlungsrhythmus im Text:
   - "monatlich", "jeden Monat", "pro Monat", "monthly", "/Monat" → "monthly"
   - "jährlich", "pro Jahr", "yearly", "annual", "/Jahr" → "yearly"
   - "wöchentlich", "pro Woche", "weekly", "/Woche" → "weekly"
   - null = wenn keine Frequenz gefunden

WICHTIG für Automatische Bezahlt-Erkennung:
- Wenn Text "Bezahlt mit PayPal" oder "Per Lastschrift bezahlt" enthält
  → paymentStatus: "paid" UND paymentMethod: "PayPal"/"Lastschrift"
- Wenn Text "Online bezahlt" oder "Zahlung erfolgt" enthält
  → paymentStatus: "paid"
- Sei flexibel und erkenne ALLE Varianten von "bezahlt + Methode"

BEISPIELE (Betrag):
- "Der Kaufpreis beträgt 15.000 EUR" → paymentAmount: 15000
- "Gesamtbetrag: 1.234,56 Euro" → paymentAmount: 1234.56
- "Summe: EUR 500,-" → paymentAmount: 500

BEISPIELE (Bezahlt-Status):
- "Bezahlt mit PayPal am 15.01.2025" → paymentStatus: "paid", paymentMethod: "PayPal"
- "Lastschrift wurde durchgeführt" → paymentStatus: "paid", paymentMethod: "Lastschrift"
- "In bar beglichen" → paymentStatus: "paid", paymentMethod: "Barzahlung"
- "Bar bezahlt" → paymentStatus: "paid", paymentMethod: "Barzahlung"
- "Bezahlt mit Klarna" → paymentStatus: "paid", paymentMethod: "Klarna"
- "Kreditkarte belastet" → paymentStatus: "paid", paymentMethod: "Kreditkarte"
- "Vorkasse erhalten" → paymentStatus: "paid", paymentMethod: "Vorkasse"`;

    let analysisResult;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: "Du bist ein Rechtsanwalt. Antworte NUR mit validem JSON." },
          { role: "user", content: analysisPrompt }
        ],
        temperature: 0.1,
        max_tokens: 2000
      });

      const responseText = completion.choices[0].message.content;
      console.log(`✅ [${requestId}] GPT-4 response received: ${responseText.length} chars`);

      // Parse JSON from response
      const jsonStart = responseText.indexOf("{");
      const jsonEnd = responseText.lastIndexOf("}") + 1;
      const jsonText = responseText.substring(jsonStart, jsonEnd);

      analysisResult = JSON.parse(jsonText);
      console.log(`✅ [${requestId}] Analysis parsed successfully`);

    } catch (gptError) {
      console.error(`❌ [${requestId}] GPT-4 analysis error:`, gptError);
      return res.status(500).json({
        success: false,
        message: 'KI-Analyse fehlgeschlagen'
      });
    }

    // ===== UPDATE CONTRACT IN DATABASE =====
    console.log(`💾 [${requestId}] Saving analysis results...`);

    const analysisObject = {
      contractScore: analysisResult.contractScore || 0,
      summary: analysisResult.summary || '',
      legalAssessment: analysisResult.legalAssessment || '',
      suggestions: analysisResult.suggestions || '',
      kuendigung: analysisResult.kuendigung || 'Unbekannt',
      laufzeit: analysisResult.laufzeit || 'Unbekannt',
      status: analysisResult.status || 'Unbekannt',
      risiken: analysisResult.risiken || [],
      optimierungen: analysisResult.optimierungen || [],
      lastAnalyzed: new Date(),
      analysisDate: new Date()
    };

    const updateData = {
      analyzed: true,
      updatedAt: new Date(),
      // ✅ Felder direkt im Contract (für Kompatibilität)
      contractScore: analysisResult.contractScore || 0,
      summary: analysisResult.summary || '',
      legalAssessment: analysisResult.legalAssessment || '',
      suggestions: analysisResult.suggestions || '',
      kuendigung: analysisResult.kuendigung || 'Unbekannt',
      laufzeit: analysisResult.laufzeit || 'Unbekannt',
      status: analysisResult.status || 'Unbekannt',
      risiken: analysisResult.risiken || [],
      optimierungen: analysisResult.optimierungen || [],
      // 💳 NEU: Payment Tracking Fields aus KI-Analyse
      contractType: analysisResult.contractType || null,
      contractTypeConfidence: analysisResult.contractTypeConfidence || 'low',
      paymentAmount: analysisResult.paymentAmount || null,
      paymentStatus: analysisResult.paymentStatus || null,
      paymentDueDate: analysisResult.paymentDueDate || null,
      paymentMethod: analysisResult.paymentMethod || null,
      paymentFrequency: analysisResult.paymentFrequency || null,
      // ✅ CRITICAL: Auch im analysis-Objekt speichern (für ContractDetailsView)
      analysis: analysisObject,
      // ✅ CRITICAL: PDF-Text speichern (für "Inhalt"-Tab in ContractDetailsView)
      content: fullTextContent.substring(0, 100000), // Max 100k chars
      fullText: fullTextContent.substring(0, 100000),

      // 🆕 CONTRACT ANALYZER v10 - Extracted Data with Confidence Scores
      ...(extractedProvider && {
        provider: extractedProvider.displayName || extractedProvider.name,
        providerConfidence: extractedProvider.confidence
      }),
      ...(extractedContractNumber && { contractNumber: extractedContractNumber }),
      ...(extractedCustomerNumber && { customerNumber: extractedCustomerNumber }),
      ...(extractedStartDate && {
        startDate: extractedStartDate,
        startDateConfidence: extractedStartDateConfidence
      }),
      ...(extractedEndDate && {
        expiryDate: extractedEndDate, // ⚡ CRITICAL für Calendar Events!
        expiryDateConfidence: extractedEndDateConfidence,
        dataSource: extractedDataSource
      }),
      ...(extractedCancellationPeriod && {
        cancellationPeriod: extractedCancellationPeriod
      }),
      ...(extractedContractDuration && {
        contractDuration: extractedContractDuration
      }),
      ...(extractedIsAutoRenewal !== null && {
        isAutoRenewal: extractedIsAutoRenewal,
        autoRenewalConfidence: extractedAutoRenewalConfidence
      })
    };

    await contractsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    console.log(`✅ [${requestId}] Contract updated with analysis (both direct fields and analysis object)`);

    // 💳 Log Payment Detection
    if (analysisResult.contractType || analysisResult.paymentAmount) {
      console.log(`💳 [${requestId}] Payment Info detected:`, {
        contractType: analysisResult.contractType,
        paymentAmount: analysisResult.paymentAmount,
        paymentStatus: analysisResult.paymentStatus,
        paymentDueDate: analysisResult.paymentDueDate
      });
    }

    // 🆕 FIXED: Trigger calendar event generation mit korrektem Contract-Objekt
    try {
      // Hole das AKTUALISIERTE Contract-Objekt aus der DB
      const updatedContract = await contractsCollection.findOne({ _id: new ObjectId(id) });

      if (updatedContract) {
        console.log(`📅 [${requestId}] Triggering calendar event generation with updated contract data`);
        await onContractChange(client.db("contract_ai"), updatedContract, "update");
        console.log(`📅 [${requestId}] Calendar events updated successfully`);
      } else {
        console.warn(`⚠️ [${requestId}] Could not find updated contract for calendar events`);
      }
    } catch (calError) {
      console.error(`❌ [${requestId}] Calendar update error:`, calError.message);
    }

    res.json({
      success: true,
      message: 'Analyse erfolgreich abgeschlossen',
      contractId: id,
      analysis: analysisResult
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Error in deferred analysis:`, error);
    res.status(500).json({
      success: false,
      message: 'Fehler bei der Analyse',
      error: error.message
    });
  }
});

// ✅ 📁 PATCH /api/contracts/bulk/folder - Move multiple contracts to folder
// ⚠️ IMPORTANT: Must be BEFORE /:id/folder route to avoid "bulk" matching as :id
router.patch("/bulk/folder", verifyToken, async (req, res) => {
  try {
    const { contractIds, folderId } = req.body;

    // 🔍 DEBUG LOGGING
    console.log("📋 Bulk Move Request:");
    console.log("  - contractIds:", contractIds);
    console.log("  - contractIds type:", typeof contractIds, Array.isArray(contractIds));
    console.log("  - folderId:", folderId);
    console.log("  - req.userId:", req.userId);

    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      console.log("❌ Validation failed: No contracts selected");
      return res.status(400).json({ error: "Keine Verträge ausgewählt" });
    }

    // Validate all contract IDs
    const validIds = contractIds.filter(id => {
      const isValid = ObjectId.isValid(id);
      console.log(`  - Checking ID ${id}: ${isValid ? '✅' : '❌'}`);
      return isValid;
    });

    console.log(`  - Valid IDs: ${validIds.length}/${contractIds.length}`);

    if (validIds.length === 0) {
      console.log("❌ All IDs invalid!");
      return res.status(400).json({ error: "Ungültige Vertrags-IDs" });
    }

    // Validate folderId if provided
    if (folderId && !ObjectId.isValid(folderId)) {
      return res.status(400).json({ error: "Ungültige Ordner-ID" });
    }

    await client.connect();
    const db = client.db("contract_ai");
    const contracts = db.collection("contracts");
    const folders = db.collection("folders");

    // If folderId provided, check if folder exists and belongs to user
    if (folderId) {
      const folder = await folders.findOne({
        _id: new ObjectId(folderId),
        userId: new ObjectId(req.userId)
      });

      if (!folder) {
        return res.status(404).json({ error: "Ordner nicht gefunden" });
      }
    }

    // Update all contracts that belong to the user
    const result = await contracts.updateMany(
      {
        _id: { $in: validIds.map(id => new ObjectId(id)) },
        userId: new ObjectId(req.userId)
      },
      { $set: { folderId: folderId ? new ObjectId(folderId) : null } }
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} Verträge ${folderId ? 'verschoben' : 'aus Ordner entfernt'}`,
      modifiedCount: result.modifiedCount,
      folderId
    });

  } catch (error) {
    console.error("❌ Error moving contracts to folder:", error);
    res.status(500).json({ error: "Fehler beim Verschieben der Verträge" });
  }
});

// ✅ 📁 PATCH /api/contracts/:id/folder - Move contract to folder
router.patch("/:id/folder", verifyToken, async (req, res) => {
  try {
    const { folderId } = req.body; // Can be null to remove from folder
    const contractId = req.params.id;

    // 🔍 DEBUG LOGGING
    console.log("📄 Single Move Request:");
    console.log("  - contractId:", contractId);
    console.log("  - folderId:", folderId);
    console.log("  - req.userId:", req.userId);

    if (!ObjectId.isValid(contractId)) {
      console.log("❌ Invalid contract ID:", contractId);
      return res.status(400).json({ error: "Ungültige Vertrags-ID" });
    }

    // Validate folderId if provided
    if (folderId && !ObjectId.isValid(folderId)) {
      console.log("❌ Invalid folder ID:", folderId);
      return res.status(400).json({ error: "Ungültige Ordner-ID" });
    }

    await client.connect();
    const db = client.db("contract_ai");
    const contracts = db.collection("contracts");
    const folders = db.collection("folders");

    // Check if contract exists and belongs to user
    const contract = await contracts.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(req.userId)
    });

    if (!contract) {
      return res.status(404).json({ error: "Vertrag nicht gefunden" });
    }

    // If folderId provided, check if folder exists and belongs to user
    if (folderId) {
      const folder = await folders.findOne({
        _id: new ObjectId(folderId),
        userId: new ObjectId(req.userId)
      });

      if (!folder) {
        return res.status(404).json({ error: "Ordner nicht gefunden" });
      }
    }

    // Update contract
    await contracts.updateOne(
      { _id: new ObjectId(contractId) },
      { $set: { folderId: folderId ? new ObjectId(folderId) : null } }
    );

    res.json({
      success: true,
      message: folderId
        ? 'Vertrag in Ordner verschoben'
        : 'Vertrag aus Ordner entfernt',
      contractId,
      folderId
    });

  } catch (error) {
    console.error("❌ Error moving contract to folder:", error);
    res.status(500).json({ error: "Fehler beim Verschieben des Vertrags" });
  }
});

// ✅ NEU: GET /contracts/:id/analysis-report – Analyse als PDF herunterladen
router.get("/:id/analysis-report", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;

    // Get contract from database
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: 'Vertrag nicht gefunden'
      });
    }

    // Get analysis data
    let analysis = null;

    if (contract.analysisId) {
      analysis = await analysisCollection.findOne({
        _id: new ObjectId(contract.analysisId)
      });
    }

    // Fallback to embedded analysis
    if (!analysis && contract.analysis) {
      analysis = contract.analysis;
    }

    // Check if analysis exists
    if (!analysis && !contract.summary) {
      return res.status(404).json({
        success: false,
        message: 'Keine Analyse gefunden für diesen Vertrag'
      });
    }

    // Create analysis object from available data
    const analysisData = {
      contractScore: analysis?.contractScore || contract.contractScore || 0,
      summary: analysis?.summary || contract.summary || '',
      legalAssessment: analysis?.legalAssessment || contract.legalAssessment || '',
      comparison: analysis?.comparison || contract.comparison || '',
      suggestions: analysis?.suggestions || contract.suggestions || '',
      risiken: analysis?.risiken || contract.risiken || [],
      optimierungen: analysis?.optimierungen || contract.optimierungen || []
    };

    console.log("📄 Generating PDF analysis report for:", contract.name);

    // Import PDFKit
    const PDFDocument = require('pdfkit');

    // Create PDF document
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${contract.name}_Analyse.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // PDF Header
    doc.fontSize(24)
       .fillColor('#3b82f6')
       .text('Vertragsanalyse', { align: 'center' })
       .moveDown(0.5);

    doc.fontSize(14)
       .fillColor('#6b7280')
       .text(contract.name, { align: 'center' })
       .moveDown(1);

    // Contract Score Section
    doc.fontSize(16)
       .fillColor('#111827')
       .text('Vertragsbewertung', { underline: true })
       .moveDown(0.5);

    doc.fontSize(12)
       .fillColor('#374151')
       .text(`Score: ${analysisData.contractScore}/100`, { indent: 20 })
       .moveDown(1);

    // Summary Section
    if (analysisData.summary) {
      doc.fontSize(16)
         .fillColor('#111827')
         .text('Zusammenfassung', { underline: true })
         .moveDown(0.5);

      doc.fontSize(11)
         .fillColor('#374151')
         .text(analysisData.summary, {
           align: 'justify',
           indent: 20,
           lineGap: 5
         })
         .moveDown(1);
    }

    // Legal Assessment Section
    if (analysisData.legalAssessment) {
      doc.fontSize(16)
         .fillColor('#111827')
         .text('Rechtliche Bewertung', { underline: true })
         .moveDown(0.5);

      doc.fontSize(11)
         .fillColor('#374151')
         .text(analysisData.legalAssessment, {
           align: 'justify',
           indent: 20,
           lineGap: 5
         })
         .moveDown(1);
    }

    // Comparison Section
    if (analysisData.comparison) {
      // Check if we need a new page
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.fontSize(16)
         .fillColor('#111827')
         .text('Vergleich & Analyse', { underline: true })
         .moveDown(0.5);

      doc.fontSize(11)
         .fillColor('#374151')
         .text(analysisData.comparison, {
           align: 'justify',
           indent: 20,
           lineGap: 5
         })
         .moveDown(1);
    }

    // Risks Section
    if (analysisData.risiken && analysisData.risiken.length > 0) {
      // Check if we need a new page
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.fontSize(16)
         .fillColor('#111827')
         .text('Risiken', { underline: true })
         .moveDown(0.5);

      analysisData.risiken.forEach((risk, index) => {
        doc.fontSize(11)
           .fillColor('#374151')
           .text(`${index + 1}. ${risk}`, {
             indent: 20,
             lineGap: 3
           });
      });

      doc.moveDown(1);
    }

    // Suggestions/Recommendations Section
    if (analysisData.suggestions) {
      // Check if we need a new page
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.fontSize(16)
         .fillColor('#111827')
         .text('Empfehlungen', { underline: true })
         .moveDown(0.5);

      doc.fontSize(11)
         .fillColor('#374151')
         .text(analysisData.suggestions, {
           align: 'justify',
           indent: 20,
           lineGap: 5
         })
         .moveDown(1);
    }

    // Optimizations Section
    if (analysisData.optimierungen && analysisData.optimierungen.length > 0) {
      // Check if we need a new page
      if (doc.y > 650) {
        doc.addPage();
      }

      doc.fontSize(16)
         .fillColor('#111827')
         .text('Optimierungen', { underline: true })
         .moveDown(0.5);

      analysisData.optimierungen.forEach((opt, index) => {
        doc.fontSize(11)
           .fillColor('#374151')
           .text(`${index + 1}. ${opt}`, {
             indent: 20,
             lineGap: 3
           });
      });

      doc.moveDown(1);
    }

    // Footer
    doc.fontSize(9)
       .fillColor('#9ca3af')
       .text(
         `Erstellt am ${new Date().toLocaleDateString('de-DE')} | Contract AI`,
         50,
         doc.page.height - 50,
         { align: 'center' }
       );

    // Finalize PDF
    doc.end();

    console.log("✅ PDF analysis report generated successfully");

  } catch (error) {
    console.error('❌ Fehler beim Generieren des Analyse-Reports:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Generieren des Analyse-Reports',
      error: error.message
    });
  }
});

// ===== 📧 E-MAIL-IMPORT ENDPOINT (SECURED) =====

/**
 * 🔒 GESICHERTER Endpoint für E-Mail-Import via Lambda
 * Middleware: verifyEmailImportKey (API-Key + IP-Allowlist)
 */
router.post("/email-import", verifyEmailImportKey, async (req, res) => {
  try {
    const {
      recipientEmail,  // z.B. "u_123abc.def456@upload.contract-ai.de"
      senderEmail,     // Absender
      subject,         // Betreff
      bodyText,        // E-Mail Text
      attachments,     // Array von { filename, contentType, data: base64 }
      messageId        // SES Message ID (für Idempotenz)
    } = req.body;

    console.log("📧 E-Mail-Import empfangen:", {
      recipientEmail,
      senderEmail,
      subject,
      attachmentCount: attachments?.length || 0,
      messageId
    });

    // Validierung
    if (!recipientEmail || !senderEmail || !messageId) {
      return res.status(400).json({
        success: false,
        message: "Fehlende Pflichtfelder: recipientEmail, senderEmail, messageId"
      });
    }

    // 1. User anhand E-Mail-Adresse finden
    const db = client.db("contract_ai");  // ✅ FIX: Korrekter DB-Name (Unterstrich statt Bindestrich)
    const usersCollection = db.collection("users");
    const contractsCollection = db.collection("contracts");

    // 🔍 DEBUG: Detaillierte Logs
    console.log("🔍 Suche User mit:", {
      emailInboxAddress: recipientEmail,
      emailInboxEnabled: true
    });

    const user = await usersCollection.findOne({
      emailInboxAddress: recipientEmail,
      emailInboxEnabled: true
    });

    console.log("🔍 User gefunden:", user ? `✅ ${user.email}` : "❌ NICHT GEFUNDEN");

    if (!user) {
      // 🔍 Erweiterte Fehlersuche: Gibt es den User mit dieser Adresse OHNE emailInboxEnabled?
      const userWithoutEnabled = await usersCollection.findOne({
        emailInboxAddress: recipientEmail
      });

      console.warn("⚠️ User nicht gefunden oder Inbox deaktiviert:", recipientEmail);
      console.warn("🔍 User mit Adresse (ohne enabled-Check):", userWithoutEnabled ? `✅ ${userWithoutEnabled.email} (enabled: ${userWithoutEnabled.emailInboxEnabled})` : "❌ NICHT GEFUNDEN");

      return res.status(404).json({
        success: false,
        message: "User nicht gefunden oder Inbox deaktiviert"
      });
    }

    // 2. Rate Limiting Check basierend auf Subscription Plan
    const rateLimits = {
      free: { limit: 1, window: 3600000 },      // 1 Email pro Stunde
      premium: { limit: 10, window: 3600000 },  // 10 Emails pro Stunde
      business: { limit: 20, window: 3600000 }  // 20 Emails pro Stunde
    };

    const userPlan = user.subscriptionPlan || 'free';
    const rateLimit = rateLimits[userPlan] || rateLimits.free;

    // Email-Import History initialisieren falls nicht vorhanden
    if (!user.emailImportHistory) {
      user.emailImportHistory = [];
    }

    // Nur Imports der letzten Stunde zählen (Sliding Window)
    const oneHourAgo = Date.now() - rateLimit.window;
    const recentImports = user.emailImportHistory.filter(
      (entry) => new Date(entry.timestamp).getTime() > oneHourAgo
    );

    console.log(`🔍 Rate Limit Check: User ${user.email} (${userPlan}) hat ${recentImports.length}/${rateLimit.limit} Emails in der letzten Stunde importiert`);

    // Rate Limit überschritten?
    if (recentImports.length >= rateLimit.limit) {
      console.warn(`⚠️ Rate Limit erreicht für User ${user.email}: ${recentImports.length}/${rateLimit.limit}`);

      // 📧 Email-Benachrichtigung senden (nur 1x pro Stunde = Spam-Schutz)
      const lastEmailSent = user.lastRateLimitEmailSent ? new Date(user.lastRateLimitEmailSent).getTime() : 0;
      const shouldSendEmail = Date.now() - lastEmailSent > rateLimit.window; // Nur wenn letzte Email > 1h her

      if (shouldSendEmail) {
        try {
          const upgradeUrl = userPlan === 'free'
            ? 'https://www.contract-ai.de/subscribe?plan=premium'
            : 'https://www.contract-ai.de/subscribe?plan=business';

          const planUpgradeName = userPlan === 'free' ? 'Premium' : 'Business';
          const nextPlanLimit = userPlan === 'free' ? 10 : 20;

          const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <style>
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                  line-height: 1.6;
                  color: #1a202c;
                  background-color: #f7fafc;
                }
                .email-wrapper { background-color: #f7fafc; padding: 40px 20px; }
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  background: white;
                  border-radius: 12px;
                  overflow: hidden;
                  box-shadow: 0 4px 6px rgba(0,0,0,0.07);
                }
                .header {
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white;
                  padding: 40px 30px;
                  text-align: center;
                }
                .header h1 {
                  font-size: 28px;
                  font-weight: 700;
                  margin-bottom: 10px;
                  letter-spacing: -0.5px;
                }
                .header p {
                  font-size: 16px;
                  opacity: 0.95;
                  margin: 0;
                }
                .content {
                  padding: 40px 30px;
                  background: white;
                }
                .greeting {
                  font-size: 18px;
                  color: #2d3748;
                  margin-bottom: 24px;
                  font-weight: 500;
                }
                .alert-box {
                  background: #fef5e7;
                  border-left: 4px solid #f59e0b;
                  padding: 20px;
                  margin: 24px 0;
                  border-radius: 6px;
                }
                .alert-box strong {
                  color: #b45309;
                  display: block;
                  margin-bottom: 8px;
                  font-size: 16px;
                }
                .alert-box p {
                  color: #78350f;
                  margin: 0;
                  font-size: 14px;
                }
                .section-title {
                  font-size: 20px;
                  font-weight: 600;
                  color: #1a202c;
                  margin: 32px 0 20px 0;
                  text-align: center;
                }
                .plans-container {
                  display: table;
                  width: 100%;
                  margin: 24px 0;
                  border-collapse: collapse;
                }
                .plan-card {
                  display: table-cell;
                  background: #f8f9fa;
                  padding: 24px 20px;
                  border: 2px solid #e2e8f0;
                  border-radius: 8px;
                  text-align: center;
                  vertical-align: top;
                  width: 50%;
                }
                .plan-card:first-child {
                  margin-right: 12px;
                }
                .plan-card.featured {
                  background: linear-gradient(135deg, #f0f4ff 0%, #e8ecff 100%);
                  border: 2px solid #667eea;
                  position: relative;
                }
                .plan-badge {
                  background: #667eea;
                  color: white;
                  padding: 4px 12px;
                  border-radius: 12px;
                  font-size: 11px;
                  font-weight: 600;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  display: inline-block;
                  margin-bottom: 12px;
                }
                .plan-name {
                  font-size: 20px;
                  font-weight: 700;
                  color: #1a202c;
                  margin-bottom: 12px;
                }
                .plan-limit {
                  font-size: 32px;
                  font-weight: 800;
                  color: #667eea;
                  margin-bottom: 4px;
                }
                .plan-limit-text {
                  font-size: 13px;
                  color: #64748b;
                  margin-bottom: 16px;
                }
                .plan-features {
                  list-style: none;
                  padding: 0;
                  margin: 16px 0;
                  text-align: left;
                }
                .plan-features li {
                  font-size: 13px;
                  color: #475569;
                  margin-bottom: 8px;
                  padding-left: 20px;
                  position: relative;
                }
                .plan-features li:before {
                  content: "✓";
                  color: #10b981;
                  font-weight: bold;
                  position: absolute;
                  left: 0;
                }
                .cta-button {
                  display: inline-block;
                  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                  color: white !important;
                  padding: 14px 32px;
                  text-decoration: none;
                  border-radius: 8px;
                  font-weight: 600;
                  font-size: 15px;
                  margin-top: 24px;
                  transition: transform 0.2s;
                  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }
                .cta-secondary {
                  background: white;
                  color: #667eea !important;
                  border: 2px solid #667eea;
                  box-shadow: none;
                }
                .info-box {
                  background: #eff6ff;
                  border-left: 4px solid #3b82f6;
                  padding: 16px;
                  margin: 24px 0;
                  border-radius: 6px;
                }
                .info-box p {
                  margin: 0;
                  font-size: 14px;
                  color: #1e40af;
                }
                .footer {
                  text-align: center;
                  padding: 32px 30px;
                  background: #f8f9fa;
                  border-top: 1px solid #e2e8f0;
                }
                .footer p {
                  font-size: 13px;
                  color: #64748b;
                  margin: 4px 0;
                }
                .footer a {
                  color: #667eea;
                  text-decoration: none;
                  font-weight: 500;
                }
              </style>
            </head>
            <body>
              <div class="email-wrapper">
                <div class="container">
                  <div class="header">
                    <h1>⚠️ Upload-Limit erreicht</h1>
                    <p>Erweitern Sie Ihre Möglichkeiten mit einem Upgrade</p>
                  </div>

                  <div class="content">
                    <p class="greeting">Guten Tag,</p>

                    <div class="alert-box">
                      <strong>Ihr Email-Upload Limit wurde erreicht</strong>
                      <p>Sie haben das Limit von <strong>${rateLimit.limit} ${rateLimit.limit === 1 ? 'Email' : 'Emails'} pro Stunde</strong> für Ihren <strong>${userPlan.charAt(0).toUpperCase() + userPlan.slice(1)}</strong>-Plan erreicht. Weitere Uploads sind derzeit nicht möglich.</p>
                    </div>

                    <h2 class="section-title">🚀 Upgraden Sie für mehr Uploads</h2>

                    <table class="plans-container">
                      <tr>
                        <td style="width: 48%; padding-right: 6px;">
                          <div class="plan-card">
                            <div class="plan-name">Premium</div>
                            <div class="plan-limit">10</div>
                            <div class="plan-limit-text">Emails pro Stunde</div>
                            <ul class="plan-features">
                              <li>KI-Vertragsanalyse</li>
                              <li>Optimierungsvorschläge</li>
                              <li>Email-Upload</li>
                              <li>Prioritäts-Support</li>
                            </ul>
                            <center>
                              <a href="https://www.contract-ai.de/subscribe?plan=premium" class="cta-button ${userPlan === 'free' ? '' : 'cta-secondary'}">
                                ${userPlan === 'free' ? 'Jetzt upgraden →' : 'Details ansehen'}
                              </a>
                            </center>
                          </div>
                        </td>
                        <td style="width: 48%; padding-left: 6px;">
                          <div class="plan-card ${userPlan === 'premium' || userPlan === 'free' ? 'featured' : ''}">
                            ${userPlan !== 'business' ? '<div class="plan-badge">Empfohlen</div>' : ''}
                            <div class="plan-name">Business</div>
                            <div class="plan-limit">20</div>
                            <div class="plan-limit-text">Emails pro Stunde</div>
                            <ul class="plan-features">
                              <li>Alle Premium-Features</li>
                              <li>Team-Verwaltung</li>
                              <li>API-Zugang</li>
                              <li>Dedizierter Support</li>
                            </ul>
                            <center>
                              <a href="https://www.contract-ai.de/subscribe?plan=business" class="cta-button">
                                ${userPlan === 'business' ? 'Aktueller Plan' : 'Jetzt upgraden →'}
                              </a>
                            </center>
                          </div>
                        </td>
                      </tr>
                    </table>

                    <div class="info-box">
                      <p><strong>💡 Hinweis:</strong> Ihr Email-Limit wird automatisch in <strong>${Math.ceil((new Date(recentImports[0].timestamp).getTime() + rateLimit.window - Date.now()) / 60000)} Minuten</strong> zurückgesetzt.</p>
                    </div>
                  </div>

                  <div class="footer">
                    <p><strong>Contract AI</strong> – Intelligente Vertragsanalyse</p>
                    <p><a href="https://www.contract-ai.de">www.contract-ai.de</a> · <a href="https://www.contract-ai.de/support">Support</a></p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;

          await emailTransporter.sendMail({
            from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
            to: user.email,
            subject: "⚠️ Email-Upload Limit erreicht - Jetzt upgraden",
            html: emailHtml
          });

          // Timestamp speichern (async, ohne auf Erfolg zu warten)
          usersCollection.updateOne(
            { _id: user._id },
            { $set: { lastRateLimitEmailSent: new Date() } }
          ).catch(err => console.error("❌ Fehler beim Speichern von lastRateLimitEmailSent:", err));

          console.log(`✅ Rate-Limit Email gesendet an ${user.email}`);
        } catch (emailError) {
          console.error(`❌ Fehler beim Senden der Rate-Limit Email:`, emailError.message);
          // Fehler nicht nach außen werfen - Rate Limit Response soll trotzdem gesendet werden
        }
      } else {
        console.log(`ℹ️ Rate-Limit Email wurde bereits gesendet (vor ${Math.round((Date.now() - lastEmailSent) / 60000)} Min)`);
      }

      return res.status(429).json({
        success: false,
        message: `Rate Limit erreicht: Maximal ${rateLimit.limit} Email-Imports pro Stunde für ${userPlan}-Plan`,
        rateLimitInfo: {
          plan: userPlan,
          limit: rateLimit.limit,
          current: recentImports.length,
          resetIn: Math.ceil((new Date(recentImports[0].timestamp).getTime() + rateLimit.window - Date.now()) / 60000) // Minuten bis Reset
        }
      });
    }

    // Import zur History hinzufügen (wird später nach erfolgreichem Upload gespeichert)
    const importEntry = {
      timestamp: new Date(),
      messageId: messageId,
      senderEmail: senderEmail
    };

    // 3. Attachments validieren und filtern
    if (!attachments || attachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine Anhänge gefunden"
      });
    }

    const validAttachments = [];
    const errors = [];

    for (const attachment of attachments) {
      const validation = validateAttachment(attachment, 15); // Max 15 MB

      if (validation.valid) {
        validAttachments.push({
          ...attachment,
          sanitizedFilename: validation.sanitizedFilename,
          detectedMimeType: validation.detectedMimeType,
          buffer: validation.buffer,
          sizeMB: validation.sizeMB
        });
      } else {
        errors.push({
          filename: attachment.filename,
          error: validation.error
        });
        console.warn(`⚠️ Attachment abgelehnt: ${attachment.filename} - ${validation.error}`);
      }
    }

    if (validAttachments.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine gültigen PDF-Anhänge (max 15 MB)",
        errors
      });
    }

    const importedContracts = [];

    // 3. Jeden validen Anhang verarbeiten
    for (const attachment of validAttachments) {
      const { buffer, sanitizedFilename, detectedMimeType, sizeMB } = attachment;

      // 🔒 Idempotenz: Check ob dieser Anhang schon importiert wurde
      const idempotencyKey = generateIdempotencyKey(messageId, buffer);

      const existingContract = await contractsCollection.findOne({
        'emailImport.idempotencyKey': idempotencyKey
      });

      if (existingContract) {
        console.log(`ℹ️ Contract bereits importiert (idempotent): ${sanitizedFilename}`);
        importedContracts.push({
          contractId: existingContract._id,
          filename: sanitizedFilename,
          duplicate: true
        });
        continue; // Skip, aber als erfolgreich zählen
      }

      // S3-Upload vorbereiten
      const timestamp = Date.now();
      const s3Key = `contracts/${user._id}/${timestamp}_${sanitizedFilename}`;

      try {
        // Upload zu S3
        if (!S3_AVAILABLE) {
          throw new Error("S3 nicht verfügbar");
        }

        const { PutObjectCommand } = require("@aws-sdk/client-s3");

        const uploadCommand = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3Key,
          Body: buffer,
          ContentType: detectedMimeType,
          // 🔒 Server-side Encryption
          ServerSideEncryption: 'AES256'
        });

        await s3Instance.send(uploadCommand);

        console.log(`✅ S3-Upload erfolgreich: ${s3Key}`);

        // Contract-Dokument erstellen
        const newContract = {
          userId: user._id,
          name: sanitizedFilename.replace('.pdf', ''),
          s3Key: s3Key,
          s3Bucket: process.env.S3_BUCKET_NAME,
          uploadType: 'EMAIL_IMPORT',
          analyzed: false, // Wird später analysiert
          uploadedAt: new Date(),
          createdAt: new Date(),
          notes: `Per E-Mail importiert von ${senderEmail}\n\nBetreff: ${subject || '(kein Betreff)'}\n\n${bodyText || ''}`.trim(),
          // 📧 E-Mail-Metadaten
          emailImport: {
            messageId: messageId,
            idempotencyKey: idempotencyKey, // 🔒 Für Deduplizierung
            sender: senderEmail,
            subject: subject || null,
            receivedAt: new Date(),
            fileSize: `${sizeMB} MB`
          }
        };

        const result = await contractsCollection.insertOne(newContract);

        importedContracts.push({
          contractId: result.insertedId,
          filename: sanitizedFilename,
          duplicate: false
        });

        console.log(`✅ Contract erstellt: ${result.insertedId}`);

      } catch (uploadError) {
        console.error(`❌ Fehler beim Upload von ${sanitizedFilename}:`, uploadError);
        errors.push({
          filename: sanitizedFilename,
          error: `Upload fehlgeschlagen: ${uploadError.message}`
        });
      }
    }

    // Response
    const successCount = importedContracts.filter(c => !c.duplicate).length;
    const duplicateCount = importedContracts.filter(c => c.duplicate).length;

    // ✅ Rate Limiting: Import zur History hinzufügen (nur bei Erfolg)
    if (successCount > 0) {
      await usersCollection.updateOne(
        { _id: user._id },
        {
          $push: {
            emailImportHistory: {
              $each: [importEntry],
              $slice: -100  // Maximal 100 Einträge behalten (automatisches Cleanup)
            }
          }
        }
      );
      console.log(`✅ Email-Import zur History hinzugefügt für User ${user.email}`);

      // 📧 Success-Email senden
      try {
        const successContracts = importedContracts.filter(c => !c.duplicate);
        const contractsList = successContracts.map(c => `<li><strong>${c.filename}</strong></li>`).join('');

        const successEmailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1a202c;
                background-color: #f7fafc;
              }
              .email-wrapper { background-color: #f7fafc; padding: 40px 20px; }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.07);
              }
              .header {
                background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 10px;
              }
              .header p {
                font-size: 16px;
                opacity: 0.95;
                margin: 0;
              }
              .content {
                padding: 40px 30px;
                background: white;
              }
              .success-box {
                background: #d1fae5;
                border-left: 4px solid #10b981;
                padding: 20px;
                margin: 24px 0;
                border-radius: 6px;
              }
              .success-box strong {
                color: #065f46;
                display: block;
                margin-bottom: 8px;
                font-size: 16px;
              }
              .contracts-list {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .contracts-list h3 {
                font-size: 16px;
                color: #1a202c;
                margin-bottom: 12px;
              }
              .contracts-list ul {
                list-style: none;
                padding: 0;
                margin: 0;
              }
              .contracts-list li {
                padding: 8px 0;
                border-bottom: 1px solid #e2e8f0;
                color: #475569;
                padding-left: 24px;
                position: relative;
              }
              .contracts-list li:before {
                content: "📄";
                position: absolute;
                left: 0;
              }
              .contracts-list li:last-child {
                border-bottom: none;
              }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white !important;
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 15px;
                margin-top: 24px;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
              }
              .info-box {
                background: #eff6ff;
                border-left: 4px solid #3b82f6;
                padding: 16px;
                margin: 24px 0;
                border-radius: 6px;
                font-size: 14px;
                color: #1e40af;
              }
              .footer {
                text-align: center;
                padding: 32px 30px;
                background: #f8f9fa;
                border-top: 1px solid #e2e8f0;
                font-size: 13px;
                color: #64748b;
              }
              .footer a {
                color: #667eea;
                text-decoration: none;
                font-weight: 500;
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="container">
                <div class="header">
                  <h1>✅ Import erfolgreich</h1>
                  <p>Ihre Verträge wurden erfolgreich hochgeladen</p>
                </div>

                <div class="content">
                  <div class="success-box">
                    <strong>Erfolgreich importiert!</strong>
                    <p>${successCount} ${successCount === 1 ? 'Vertrag wurde' : 'Verträge wurden'} per Email importiert und ${duplicateCount > 0 ? `${duplicateCount} ${duplicateCount === 1 ? 'Duplikat wurde' : 'Duplikate wurden'} übersprungen` : 'stehen bereit zur Analyse'}.</p>
                  </div>

                  <div class="contracts-list">
                    <h3>📄 Importierte Verträge:</h3>
                    <ul>
                      ${contractsList}
                    </ul>
                  </div>

                  <div class="info-box">
                    <strong>💡 Nächster Schritt:</strong> Öffnen Sie Ihr Dashboard und starten Sie die KI-Analyse für detaillierte Einblicke.
                  </div>

                  <center>
                    <a href="https://www.contract-ai.de/contracts" class="cta-button">Zum Dashboard →</a>
                  </center>
                </div>

                <div class="footer">
                  <p><strong>Contract AI</strong> – Intelligente Vertragsanalyse</p>
                  <p><a href="https://www.contract-ai.de">www.contract-ai.de</a> · <a href="https://www.contract-ai.de/support">Support</a></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        await emailTransporter.sendMail({
          from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
          to: user.email,
          subject: `✅ ${successCount} ${successCount === 1 ? 'Vertrag' : 'Verträge'} erfolgreich importiert`,
          html: successEmailHtml
        });

        console.log(`✅ Success-Email gesendet an ${user.email}`);
      } catch (emailError) {
        console.error(`❌ Fehler beim Senden der Success-Email:`, emailError.message);
        // Fehler nicht nach außen werfen - Import war erfolgreich
      }
    }

    // 📧 Error-Email senden wenn Fehler aufgetreten sind
    if (errors.length > 0 && successCount === 0) {
      try {
        const errorsList = errors.map(e => `<li><strong>${e.filename}:</strong> ${e.error}</li>`).join('');

        const errorEmailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                line-height: 1.6;
                color: #1a202c;
                background-color: #f7fafc;
              }
              .email-wrapper { background-color: #f7fafc; padding: 40px 20px; }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: white;
                border-radius: 12px;
                overflow: hidden;
                box-shadow: 0 4px 6px rgba(0,0,0,0.07);
              }
              .header {
                background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                color: white;
                padding: 40px 30px;
                text-align: center;
              }
              .header h1 {
                font-size: 28px;
                font-weight: 700;
                margin-bottom: 10px;
              }
              .header p {
                font-size: 16px;
                opacity: 0.95;
                margin: 0;
              }
              .content {
                padding: 40px 30px;
                background: white;
              }
              .error-box {
                background: #fee;
                border-left: 4px solid #ef4444;
                padding: 20px;
                margin: 24px 0;
                border-radius: 6px;
              }
              .error-box strong {
                color: #991b1b;
                display: block;
                margin-bottom: 8px;
                font-size: 16px;
              }
              .errors-list {
                background: #f8f9fa;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
              }
              .errors-list h3 {
                font-size: 16px;
                color: #1a202c;
                margin-bottom: 12px;
              }
              .errors-list ul {
                list-style: none;
                padding: 0;
                margin: 0;
              }
              .errors-list li {
                padding: 8px 0;
                border-bottom: 1px solid #e2e8f0;
                color: #dc2626;
                font-size: 14px;
              }
              .errors-list li:last-child {
                border-bottom: none;
              }
              .info-box {
                background: #eff6ff;
                border-left: 4px solid #3b82f6;
                padding: 16px;
                margin: 24px 0;
                border-radius: 6px;
                font-size: 14px;
                color: #1e40af;
              }
              .cta-button {
                display: inline-block;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white !important;
                padding: 14px 32px;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
                font-size: 15px;
                margin-top: 24px;
                box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
              }
              .footer {
                text-align: center;
                padding: 32px 30px;
                background: #f8f9fa;
                border-top: 1px solid #e2e8f0;
                font-size: 13px;
                color: #64748b;
              }
              .footer a {
                color: #667eea;
                text-decoration: none;
                font-weight: 500;
              }
            </style>
          </head>
          <body>
            <div class="email-wrapper">
              <div class="container">
                <div class="header">
                  <h1>⚠️ Import fehlgeschlagen</h1>
                  <p>Einige Dateien konnten nicht verarbeitet werden</p>
                </div>

                <div class="content">
                  <div class="error-box">
                    <strong>Fehler beim Email-Import</strong>
                    <p>${errors.length} ${errors.length === 1 ? 'Datei konnte' : 'Dateien konnten'} nicht verarbeitet werden. Bitte überprüfen Sie die Dateien und versuchen Sie es erneut.</p>
                  </div>

                  <div class="errors-list">
                    <h3>❌ Fehlgeschlagene Dateien:</h3>
                    <ul>
                      ${errorsList}
                    </ul>
                  </div>

                  <div class="info-box">
                    <strong>💡 Häufige Ursachen:</strong><br>
                    • Datei ist kein PDF oder beschädigt<br>
                    • Datei ist zu groß (max. 15 MB)<br>
                    • Datei ist passwortgeschützt<br>
                    • Ungültiger Dateiname
                  </div>

                  <center>
                    <a href="https://www.contract-ai.de/contracts" class="cta-button">Verträge manuell hochladen →</a>
                  </center>
                </div>

                <div class="footer">
                  <p><strong>Contract AI</strong> – Intelligente Vertragsanalyse</p>
                  <p><a href="https://www.contract-ai.de">www.contract-ai.de</a> · <a href="https://www.contract-ai.de/support">Support</a></p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `;

        await emailTransporter.sendMail({
          from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
          to: user.email,
          subject: `⚠️ Email-Import fehlgeschlagen: ${errors.length} ${errors.length === 1 ? 'Datei' : 'Dateien'}`,
          html: errorEmailHtml
        });

        console.log(`📧 Error-Email gesendet an ${user.email}`);
      } catch (emailError) {
        console.error(`❌ Fehler beim Senden der Error-Email:`, emailError.message);
      }
    }

    res.json({
      success: true,
      message: `${successCount} neue Verträge importiert${duplicateCount > 0 ? `, ${duplicateCount} Duplikate übersprungen` : ''}`,
      imported: successCount,
      duplicates: duplicateCount,
      total: importedContracts.length,
      contracts: importedContracts,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error("❌ E-Mail-Import Fehler:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim E-Mail-Import",
      error: error.message
    });
  }
});

module.exports = router;