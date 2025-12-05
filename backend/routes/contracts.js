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
const generateEmailTemplate = require("../utils/emailTemplate"); // 📧 V4 Email Template
const contractAnalyzer = require("../services/contractAnalyzer"); // 🤖 ULTRA-INTELLIGENT Contract Analyzer v10
const AILegalPulse = require("../services/aiLegalPulse"); // ⚡ Legal Pulse Risk Analysis
const analyzeRoute = require("./analyze"); // 🚀 V2 Analysis Functions
const OrganizationMember = require("../models/OrganizationMember"); // 👥 Team-Management
const { generateDeepLawyerLevelPrompt, getContractTypeAwareness } = analyzeRoute; // 🚀 Import V2 functions

const router = express.Router();
const aiLegalPulse = new AILegalPulse(); // ⚡ Initialize Legal Pulse analyzer
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);
let contractsCollection;
let analysisCollection;
let eventsCollection; // ✅ NEU: Events Collection
let usersCollection; // ✅ NEU: Users Collection für Bulk-Ops

// ===== S3 INTEGRATION (AWS SDK v3) =====
let S3Client, GetObjectCommand, PutObjectCommand, s3Instance;
let S3_AVAILABLE = false;

try {
  const { S3Client: _S3Client, GetObjectCommand: _GetObjectCommand, PutObjectCommand: _PutObjectCommand } = require("@aws-sdk/client-s3");
  S3Client = _S3Client;
  GetObjectCommand = _GetObjectCommand;
  PutObjectCommand = _PutObjectCommand;

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

// ===== PUPPETEER FÜR AUTO-PDF =====
let puppeteer;
let chromium;

try {
  chromium = require('@sparticuz/chromium');
  puppeteer = require('puppeteer-core');
  console.log("✅ [CONTRACTS] Puppeteer-core mit chromium für Render");
} catch (error) {
  try {
    puppeteer = require('puppeteer');
    console.log("✅ [CONTRACTS] Puppeteer für lokale Entwicklung");
  } catch (puppeteerError) {
    console.warn("⚠️ [CONTRACTS] Puppeteer nicht verfügbar - Auto-PDF deaktiviert");
  }
}

// ============================================
// 🆕 AUTO-PDF FUNKTION FÜR GENERIERTE VERTRÄGE
// ============================================
const generatePDFAndUploadToS3ForContract = async (contractId, userId, htmlContent, contractName) => {
  if (!puppeteer || !S3_AVAILABLE) {
    console.warn(`⚠️ [AUTO-PDF] Übersprungen - Puppeteer oder S3 nicht verfügbar`);
    return { success: false, error: 'Puppeteer oder S3 nicht verfügbar' };
  }

  console.log(`🚀 [AUTO-PDF] Starte für Contract: ${contractId}`);
  let browser = null;

  try {
    if (chromium) {
      browser = await puppeteer.launch({
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--no-zygote', '--single-process'],
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless || 'new',
        ignoreHTTPSErrors: true
      });
    } else {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
    await page.setContent(htmlContent, { waitUntil: ['networkidle0', 'domcontentloaded'], timeout: 30000 });
    await page.evaluateHandle('document.fonts.ready');

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '25.4mm', bottom: '25.4mm', left: '25.4mm', right: '25.4mm' }
    });

    await browser.close();
    browser = null;

    console.log(`✅ [AUTO-PDF] PDF generiert: ${Math.round(pdfBuffer.length / 1024)} KB`);

    const timestamp = Date.now();
    const sanitizedName = (contractName || 'vertrag').replace(/[^a-zA-Z0-9äöüÄÖÜß.-]/g, '-');
    const fileName = `${sanitizedName}-${timestamp}.pdf`;
    const s3Key = `contracts/${userId}/${fileName}`;

    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: { contractId: contractId.toString(), userId: userId.toString(), source: 'auto-generated' }
    });

    await s3Instance.send(uploadCommand);
    console.log(`✅ [AUTO-PDF] S3 Upload: ${s3Key}`);

    await contractsCollection.updateOne(
      { _id: new ObjectId(contractId) },
      { $set: { s3Key: s3Key, pdfUploaded: true, pdfUploadedAt: new Date(), pdfAutoGenerated: true } }
    );

    console.log(`✅ [AUTO-PDF] Contract ${contractId} mit s3Key aktualisiert`);
    return { success: true, s3Key };

  } catch (error) {
    console.error(`❌ [AUTO-PDF] Fehler:`, error.message);
    if (browser) { try { await browser.close(); } catch (e) {} }
    return { success: false, error: error.message };
  }
};

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
    usersCollection = db.collection("users"); // ✅ NEU: Für Bulk-Ops Enterprise-Check
    console.log("📦 Verbunden mit contracts, analyses, contract_events UND users");
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
    const riskFilter = req.query.riskFilter || 'all'; // ✅ Legal Pulse: Risk Level Filter

    // 👥 Team-Management: Prüfe ob User zu einer Organisation gehört
    const membership = await OrganizationMember.findOne({
      userId: new ObjectId(req.user.userId),
      isActive: true
    });

    // ✅ MongoDB Filter-Objekt aufbauen
    let mongoFilter;
    if (membership) {
      // User ist in einer Organisation → zeige eigene + Org-Verträge
      mongoFilter = {
        $or: [
          { userId: new ObjectId(req.user.userId) },
          { organizationId: membership.organizationId }
        ]
      };
    } else {
      // User ist nicht in einer Organisation → nur eigene Verträge
      mongoFilter = { userId: new ObjectId(req.user.userId) };
    }

    // 🔍 Text-Suche (name, status, kuendigung)
    if (searchQuery.trim()) {
      // ✅ Escape special regex characters (., *, +, ?, ^, $, {, }, (, ), |, [, ], \)
      const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      mongoFilter.$or = [
        { name: { $regex: escapedQuery, $options: 'i' } },
        { status: { $regex: escapedQuery, $options: 'i' } },
        { kuendigung: { $regex: escapedQuery, $options: 'i' } }
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

    // 📅 Datums-Filter (erweitert für Mobile UI)
    if (dateFilter !== 'alle') {
      const now = new Date();
      let dateThreshold;

      switch (dateFilter) {
        // Neue Filter-Werte (Mobile UI)
        case 'heute':
          // Heute 00:00:00
          dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'woche':
          // Diese Woche (Montag 00:00:00)
          const dayOfWeek = now.getDay();
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Montag als Wochenstart
          dateThreshold = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff);
          break;
        case 'monat':
          // Dieser Monat (1. des Monats 00:00:00)
          dateThreshold = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quartal':
          // Dieses Quartal (1. des Quartals)
          const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
          dateThreshold = new Date(now.getFullYear(), quarterMonth, 1);
          break;
        case 'jahr':
          // Dieses Jahr (1. Januar 00:00:00)
          dateThreshold = new Date(now.getFullYear(), 0, 1);
          break;
        // Legacy Filter-Werte (für Abwärtskompatibilität)
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
        console.log(`📅 Date Filter: ${dateFilter} -> Verträge ab ${dateThreshold.toISOString()}`);
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

    // 🎯 Legal Pulse: Risk Level Filter
    if (riskFilter !== 'all') {
      // Zugriff auf nested field: legalPulse.riskScore
      switch (riskFilter) {
        case 'low':
          mongoFilter['legalPulse.riskScore'] = { $lte: 30, $ne: null };
          break;
        case 'medium':
          mongoFilter['legalPulse.riskScore'] = { $gt: 30, $lte: 60 };
          break;
        case 'high':
          mongoFilter['legalPulse.riskScore'] = { $gt: 60 };
          break;
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
      case 'risk':
        // Legal Pulse: Höchstes Risiko zuerst
        sortOptions = { 'legalPulse.riskScore': -1 };
        break;
      case 'name':
        // Legal Pulse: Name A-Z
        sortOptions = { name: 1 };
        break;
      case 'date':
        // Legal Pulse: Neueste zuerst
        sortOptions = { createdAt: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // ✅ MongoDB Query mit Filtern, Sortierung & Pagination
    // 🔧 FIX: Verwende aggregate() mit allowDiskUse für große Datensätze
    const pipeline = [
      { $match: mongoFilter },
      { $sort: sortOptions },
    ];

    // Skip und Limit hinzufügen
    if (skip > 0) {
      pipeline.push({ $skip: skip });
    }
    if (limit > 0) {
      pipeline.push({ $limit: limit });
    }

    const contracts = await contractsCollection.aggregate(pipeline, { allowDiskUse: true }).toArray();

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

/**
 * GET /api/contracts/debug-company-profile
 * Debug-Route um Company Profile Daten zu prüfen
 * WICHTIG: Muss VOR /:id Route stehen!
 */
router.get('/debug-company-profile', verifyToken, async (req, res) => {
  try {
    // WICHTIG: req.db verwenden (gleiche Connection wie companyProfile.js)
    const db = req.db || client.db("contractai");
    const userId = req.user.userId;

    // 0. DB-Name und alle Collections auflisten
    const dbName = db.databaseName;
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    // 1. Alle möglichen userId-Formate prüfen
    const queries = [
      { userId: new ObjectId(userId) },
      { userId: userId },
      { userId: userId.toString() }
    ];

    let foundProfile = null;
    let matchedQuery = null;

    for (const query of queries) {
      const profile = await db.collection("company_profiles").findOne(query);
      if (profile) {
        foundProfile = profile;
        matchedQuery = JSON.stringify(query);
        break;
      }
    }

    // 2. Alle Profile in der Collection zählen
    const totalProfiles = await db.collection("company_profiles").countDocuments();

    // 3. Alle userIds in der Collection auflisten (nur die ersten 10)
    const allProfiles = await db.collection("company_profiles").find({}, { projection: { userId: 1, companyName: 1 } }).limit(10).toArray();

    // 4. User-Daten prüfen (hat der User companyProfile embedded?)
    const user = await db.collection("users").findOne({ _id: new ObjectId(userId) });

    res.json({
      debug: true,
      databaseName: dbName,
      allCollections: collectionNames,
      hasCompanyProfilesCollection: collectionNames.includes('company_profiles'),
      currentUserId: userId,
      currentUserIdType: typeof userId,
      totalProfilesInDB: totalProfiles,
      userHasEmbeddedProfile: user?.companyProfile ? true : false,
      userEmbeddedProfile: user?.companyProfile || null,
      foundProfile: foundProfile ? {
        _id: foundProfile._id,
        odUserId: foundProfile.userId,
        userIdType: typeof foundProfile.userId,
        userIdIsObjectId: foundProfile.userId instanceof ObjectId,
        companyName: foundProfile.companyName,
        street: foundProfile.street,
        postalCode: foundProfile.postalCode,
        city: foundProfile.city,
        hasLogoKey: !!foundProfile.logoKey,
        hasLogoUrl: !!foundProfile.logoUrl,
        logoKeyValue: foundProfile.logoKey || null,
        allFields: Object.keys(foundProfile)
      } : null,
      matchedQuery: matchedQuery,
      sampleProfiles: allProfiles.map(p => ({
        odId: p._id?.toString(),
        odUserId: p.userId?.toString(),
        userIdType: typeof p.userId,
        companyName: p.companyName
      }))
    });
  } catch (error) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
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
      htmlContent, // 🆕 Frontend sendet auch als htmlContent
      formData
    } = req.body;

    // 🆕 Verwende contractHTML oder htmlContent (Frontend-Kompatibilität)
    const finalHTML = contractHTML || htmlContent;

    console.log("📁 Speichere Vertrag:", { name, isGenerated, hasHTML: !!(contractHTML || htmlContent), htmlLength: finalHTML?.length || 0 });

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

    // 👥 Team-Management: Prüfe ob User zu einer Organisation gehört
    const membership = await OrganizationMember.findOne({
      userId: new ObjectId(req.user.userId),
      isActive: true
    });

    const contractDoc = {
      userId: new ObjectId(req.user.userId),
      organizationId: membership ? membership.organizationId : null, // 👥 Org-Zugehörigkeit
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

    // 🆕 AUTO-PDF: Für generierte Verträge mit HTML automatisch PDF erstellen und zu S3 hochladen
    if (isGenerated && finalHTML && finalHTML.length > 100) {
      console.log("🚀 [AUTO-PDF] Starte automatische PDF-Generierung für generierten Vertrag...");
      console.log(`📄 [AUTO-PDF] HTML-Länge: ${finalHTML.length} Zeichen`);
      generatePDFAndUploadToS3ForContract(
        contractId.toString(),
        req.user.userId,
        finalHTML,
        name
      ).then(pdfResult => {
        if (pdfResult.success) {
          console.log(`✅ [AUTO-PDF] Erfolgreich für ${name}: ${pdfResult.s3Key}`);
        } else {
          console.error(`❌ [AUTO-PDF] Fehlgeschlagen für ${name}:`, pdfResult.error);
        }
      }).catch(err => {
        console.error(`❌ [AUTO-PDF] Exception für ${name}:`, err);
      });
    } else if (isGenerated) {
      console.log(`⚠️ [AUTO-PDF] Übersprungen - kein HTML vorhanden (isGenerated: ${isGenerated}, hasHTML: ${!!finalHTML}, htmlLength: ${finalHTML?.length || 0})`);
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

    // ===== GPT-4 ANALYSIS V2 =====
    console.log(`🤖 [${requestId}] Starting GPT-4 V2 analysis...`);

    // 🚀 V2: Use new deep lawyer-level prompt
    const documentType = providerAnalysis?.data?.contractType || 'other';
    const analysisPrompt = generateDeepLawyerLevelPrompt(
      fullTextContent,
      documentType,
      'deep-lawyer-level',
      requestId
    );

    console.log(`📋 [${requestId}] Using V2 prompt for contract type: ${documentType}`);

    let analysisResult;

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o", // 🚀 GPT-4o for 128k context + 16k output tokens
        messages: [
          {
            role: "system",
            content: "Du bist ein hochspezialisierter Vertragsanwalt mit 20+ Jahren Erfahrung. Antworte AUSSCHLIESSLICH in korrektem JSON-Format ohne Markdown-Blöcke. Alle Sätze müssen vollständig ausformuliert sein. Sei präzise, konkret und vermeide Standardphrasen."
          },
          { role: "user", content: analysisPrompt }
        ],
        response_format: { type: "json_object" }, // 🚀 V2: Force valid JSON output
        temperature: 0.1,
        max_tokens: 16000 // 🚀 GPT-4o: 16k tokens für tiefe Analysen (bis 100 Seiten Verträge)
      });

      const responseText = completion.choices[0].message.content;
      console.log(`✅ [${requestId}] GPT-4 response received: ${responseText.length} chars`);

      // Parse JSON from response
      const jsonStart = responseText.indexOf("{");
      const jsonEnd = responseText.lastIndexOf("}") + 1;
      const jsonText = responseText.substring(jsonStart, jsonEnd);

      analysisResult = JSON.parse(jsonText);
      console.log(`✅ [${requestId}] Analysis parsed successfully`);
      console.log(`🔍 [${requestId}] detailedLegalOpinion length: ${analysisResult.detailedLegalOpinion?.length || 0} characters`);

    } catch (gptError) {
      console.error(`❌ [${requestId}] GPT-4 analysis error:`, gptError);
      return res.status(500).json({
        success: false,
        message: 'KI-Analyse fehlgeschlagen'
      });
    }

    // ===== UPDATE CONTRACT IN DATABASE =====
    console.log(`💾 [${requestId}] Saving V2 analysis results...`);

    const analysisObject = {
      contractScore: analysisResult.contractScore || 0,
      // 🚀 V2: New structured fields
      laymanSummary: analysisResult.laymanSummary || [],
      summary: analysisResult.summary || [],
      legalAssessment: analysisResult.legalAssessment || [],
      suggestions: analysisResult.suggestions || [],
      comparison: analysisResult.comparison || [],
      positiveAspects: analysisResult.positiveAspects || [],
      criticalIssues: analysisResult.criticalIssues || [],
      recommendations: analysisResult.recommendations || [],
      quickFacts: analysisResult.quickFacts || [],
      legalPulseHooks: analysisResult.legalPulseHooks || [],
      detailedLegalOpinion: analysisResult.detailedLegalOpinion || '', // ✅ NEU: Ausführliches Rechtsgutachten
      // Legacy fields (for backward compatibility)
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
      // 🚀 V2: New structured fields (stored directly for easy access)
      contractScore: analysisResult.contractScore || 0,
      laymanSummary: analysisResult.laymanSummary || [],
      summary: analysisResult.summary || [],
      legalAssessment: analysisResult.legalAssessment || [],
      suggestions: analysisResult.suggestions || [],
      comparison: analysisResult.comparison || [],
      positiveAspects: analysisResult.positiveAspects || [],
      criticalIssues: analysisResult.criticalIssues || [],
      recommendations: analysisResult.recommendations || [],
      quickFacts: analysisResult.quickFacts || [],
      legalPulseHooks: analysisResult.legalPulseHooks || [],
      // Legacy fields (for backward compatibility)
      kuendigung: analysisResult.kuendigung || 'Unbekannt',
      laufzeit: analysisResult.laufzeit || 'Unbekannt',
      status: analysisResult.status || 'Unbekannt',
      risiken: analysisResult.risiken || [],
      optimierungen: analysisResult.optimierungen || [],
      // 💳 Payment Tracking Fields
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

    // ⚡ NEW: LEGAL PULSE RISK ANALYSIS (Async Background Job)
    (async () => {
      try {
        console.log(`⚡ [${requestId}] Starting Legal Pulse risk analysis for deferred analysis in background...`);

        // Get full text content
        const contract = await contractsCollection.findOne({ _id: new ObjectId(id) });
        const fullTextContent = contract.fullText || contract.content || '';

        if (fullTextContent && fullTextContent.length > 100) {
          const contractInfo = {
            name: contract.name,
            provider: contract.provider?.displayName || analysisResult.provider || 'Unknown',
            type: analysisResult.contractType || 'other',
            startDate: contract.startDate,
            expiryDate: contract.expiryDate
          };

          const legalPulseAnalysis = await aiLegalPulse.analyzeFullContract(
            fullTextContent,
            contractInfo
          );

          // Update contract with Legal Pulse analysis
          await contractsCollection.updateOne(
            { _id: new ObjectId(id) },
            {
              $set: {
                legalPulse: legalPulseAnalysis,
                legalPulseLastChecked: new Date()
              }
            }
          );

          console.log(`✅ [${requestId}] Legal Pulse risk analysis completed for contract ${id} (Risk Score: ${legalPulseAnalysis.riskScore})`);
        } else {
          console.log(`⚠️ [${requestId}] Skipping Legal Pulse analysis - no text content available`);
        }
      } catch (analysisError) {
        console.error(`❌ [${requestId}] Legal Pulse risk analysis failed:`, analysisError.message);
        // Don't throw - this is a background job
      }
    })();

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

          const emailHtml = generateEmailTemplate({
            title: "Upload-Limit erreicht",
            preheader: "Sie haben Ihr monatliches Email-Upload Limit erreicht",
            body: `
              <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 12px 12px 0; padding: 20px; margin-bottom: 25px;">
                <p style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0;">
                  ⚠️ Sie haben Ihr Limit erreicht
                </p>
              </div>

              <p style="text-align: center; margin-bottom: 25px;">
                Sie haben das Limit von <strong>${rateLimit.limit} ${rateLimit.limit === 1 ? 'Email' : 'Emails'} pro Stunde</strong> für Ihren <strong>${userPlan.charAt(0).toUpperCase() + userPlan.slice(1)}</strong>-Plan erreicht.<br>
                Um weitere Verträge per Email zu importieren, upgraden Sie Ihren Plan.
              </p>

              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
                <tr><td style="padding: 20px;">
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong>Ihr aktueller Plan:</strong> ${userPlan.charAt(0).toUpperCase() + userPlan.slice(1)} (${rateLimit.limit} Uploads/Stunde)</p>
                  <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong>${planUpgradeName}:</strong> ${nextPlanLimit} Uploads/Stunde + alle Features</p>
                  <p style="margin: 0; font-size: 13px; color: #888;">💡 Ihr Limit wird in <strong>${Math.ceil((new Date(recentImports[0].timestamp).getTime() + rateLimit.window - Date.now()) / 60000)} Minuten</strong> zurückgesetzt.</p>
                </td></tr>
              </table>
            `,
            cta: { text: "Jetzt upgraden", url: upgradeUrl }
          });

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

        const successEmailHtml = generateEmailTemplate({
          title: "Import erfolgreich",
          preheader: `${successCount} ${successCount === 1 ? 'Vertrag wurde' : 'Verträge wurden'} erfolgreich importiert`,
          body: `
            <div style="background-color: #ecfdf5; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
              <span style="font-size: 48px;">✅</span>
              <p style="color: #065f46; font-size: 18px; font-weight: 600; margin: 10px 0 0 0;">${successCount} ${successCount === 1 ? 'Vertrag' : 'Verträge'} importiert!</p>
            </div>

            <p style="text-align: center; margin-bottom: 25px;">
              ${successCount} ${successCount === 1 ? 'Vertrag wurde' : 'Verträge wurden'} per Email importiert${duplicateCount > 0 ? ` und ${duplicateCount} ${duplicateCount === 1 ? 'Duplikat wurde' : 'Duplikate wurden'} übersprungen` : ' und stehen bereit zur Analyse'}.
            </p>

            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
              <tr><td style="padding: 20px;">
                <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1a1a1a;">📄 Importierte Verträge:</p>
                ${successContracts.map(c => `<p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">• ${c.filename}</p>`).join('')}
              </td></tr>
            </table>
          `,
          cta: { text: "Verträge anzeigen", url: "https://www.contract-ai.de/contracts" }
        });

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

        const errorEmailHtml = generateEmailTemplate({
          title: "Import fehlgeschlagen",
          preheader: `${errors.length} ${errors.length === 1 ? 'Datei konnte' : 'Dateien konnten'} nicht verarbeitet werden`,
          body: `
            <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 12px 12px 0; padding: 20px; margin-bottom: 25px;">
              <p style="color: #dc2626; font-size: 16px; font-weight: 600; margin: 0;">
                ❌ ${errors.length} ${errors.length === 1 ? 'Datei konnte' : 'Dateien konnten'} nicht verarbeitet werden
              </p>
            </div>

            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
              <tr><td style="padding: 20px;">
                <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1a1a1a;">Fehlgeschlagene Dateien:</p>
                ${errors.map(e => `<p style="margin: 0 0 8px 0; font-size: 14px; color: #dc2626;">• ${e.filename} – ${e.error}</p>`).join('')}
              </td></tr>
            </table>

            <p style="font-size: 14px; color: #666; text-align: center;">
              <strong>Tipp:</strong> Stellen Sie sicher, dass Ihre Dateien im PDF-Format vorliegen und nicht passwortgeschützt sind.
            </p>
          `,
          cta: { text: "Erneut versuchen", url: "https://www.contract-ai.de/contracts" }
        });

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

// 🧠 PATCH /api/contracts/:id/status - Manueller Status-Update
router.patch("/:id/status", verifyToken, async (req, res) => {
  try {
    const contractId = req.params.id;
    const userId = req.user.userId;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status ist erforderlich"
      });
    }

    // Validiere Status
    const validStatuses = ['aktiv', 'bald_ablaufend', 'abgelaufen', 'gekündigt'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Ungültiger Status. Erlaubt: ${validStatuses.join(', ')}`
      });
    }

    const { updateContractStatus } = require("../services/smartStatusUpdater");
    const result = await updateContractStatus(
      req.db,
      contractId,
      userId,
      status,
      'manual',
      notes || 'Manuell durch User geändert'
    );

    res.json({
      success: true,
      message: `Status erfolgreich aktualisiert: ${result.oldStatus} → ${result.newStatus}`,
      oldStatus: result.oldStatus,
      newStatus: result.newStatus
    });

  } catch (error) {
    console.error("❌ Fehler beim Status-Update:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Aktualisieren des Status",
      error: error.message
    });
  }
});

// 📊 GET /api/contracts/:id/status-history - Status-Historie abrufen
router.get("/:id/status-history", verifyToken, async (req, res) => {
  try {
    const contractId = req.params.id;
    const userId = req.user.userId;

    const { getStatusHistory } = require("../services/smartStatusUpdater");
    const history = await getStatusHistory(req.db, contractId, userId);

    res.json({
      success: true,
      history: history.map(h => ({
        oldStatus: h.oldStatus,
        newStatus: h.newStatus,
        reason: h.reason,
        notes: h.notes,
        timestamp: h.timestamp
      }))
    });

  } catch (error) {
    console.error("❌ Fehler beim Abrufen der Status-History:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Abrufen der Status-Historie",
      error: error.message
    });
  }
});

// 🔔 PATCH /api/contracts/:id/reminder-settings - Update reminder settings for a contract
router.patch("/:id/reminder-settings", async (req, res) => {
  try {
    const { id } = req.params;
    const { reminderDays } = req.body;
    const userId = new ObjectId(req.user.userId);

    // Validate reminderDays
    if (!Array.isArray(reminderDays)) {
      return res.status(400).json({
        success: false,
        error: "reminderDays muss ein Array sein"
      });
    }

    // Validate all values are positive integers
    const validDays = reminderDays.every(day => Number.isInteger(day) && day > 0);
    if (!validDays) {
      return res.status(400).json({
        success: false,
        error: "Alle Reminder-Tage müssen positive Ganzzahlen sein"
      });
    }

    // Update contract
    const result = await req.db.collection("contracts").findOneAndUpdate(
      { _id: new ObjectId(id), userId },
      {
        $set: {
          reminderDays: reminderDays.sort((a, b) => a - b), // Sort ascending
          updatedAt: new Date()
        }
      },
      { returnDocument: "after" }
    );

    if (!result) {
      return res.status(404).json({
        success: false,
        error: "Vertrag nicht gefunden"
      });
    }

    // Regenerate calendar events for this contract
    const { generateEventsForContract } = require("../services/calendarEvents");

    // Delete old events for this contract
    await req.db.collection("contract_events").deleteMany({
      contractId: new ObjectId(id),
      userId
    });

    // Generate new events with updated reminder settings
    const events = await generateEventsForContract(req.db, result);

    console.log(`✅ Reminder-Settings aktualisiert für Contract ${id}: ${reminderDays.length} Reminder, ${events.length} Events generiert`);

    res.json({
      success: true,
      message: "Reminder-Einstellungen aktualisiert",
      reminderDays,
      eventsGenerated: events.length
    });

  } catch (error) {
    console.error("❌ Fehler beim Aktualisieren der Reminder-Settings:", error);
    res.status(500).json({
      success: false,
      error: "Fehler beim Aktualisieren der Einstellungen",
      details: error.message
    });
  }
});

// ===== NEW: PDF Upload to S3 Endpoint =====
// POST /contracts/:id/upload-pdf – Upload generated PDF to S3
router.post("/:id/upload-pdf", verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { pdfBase64 } = req.body;

    console.log(`📤 PDF Upload Request for Contract ${id}`);

    if (!pdfBase64) {
      return res.status(400).json({
        success: false,
        error: "PDF data is required"
      });
    }

    // Verify contract ownership
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: "Contract not found"
      });
    }

    // Check if S3 is available
    if (!S3_AVAILABLE) {
      return res.status(503).json({
        success: false,
        error: "S3 storage is not available"
      });
    }

    // Decode base64 PDF
    const pdfBuffer = Buffer.from(pdfBase64, 'base64');

    // Generate S3 key
    const timestamp = Date.now();
    const fileName = `${contract.name || 'contract'}-${timestamp}.pdf`.replace(/[^a-zA-Z0-9.-]/g, '-');
    const s3Key = `contracts/${req.user.userId}/${fileName}`;

    console.log(`📤 Uploading PDF to S3: ${s3Key}`);

    // Upload to S3
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        contractId: id,
        userId: req.user.userId,
        uploadDate: new Date().toISOString(),
        source: 'generated'
      }
    });

    await s3Instance.send(command);
    console.log(`✅ PDF uploaded successfully: ${s3Key}`);

    // Update contract with S3 key
    await contractsCollection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          s3Key: s3Key,
          pdfUploaded: true,
          pdfUploadedAt: new Date(),
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Contract ${id} updated with s3Key`);

    res.json({
      success: true,
      s3Key: s3Key,
      message: "PDF successfully uploaded to S3"
    });

  } catch (error) {
    console.error("❌ Error uploading PDF to S3:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload PDF",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ========================================
// 🚀 BULK OPERATIONS (ENTERPRISE-ONLY)
// ========================================

/**
 * POST /api/contracts/bulk-delete
 * Löscht mehrere Verträge auf einmal (Enterprise-Feature)
 * Body: { contractIds: ["id1", "id2", ...] }
 */
router.post("/bulk-delete", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { contractIds } = req.body;

    // Validierung
    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine Verträge zum Löschen ausgewählt"
      });
    }

    if (contractIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximal 100 Verträge gleichzeitig löschbar"
      });
    }

    // 🔒 ENTERPRISE-CHECK: Nur Premium/Enterprise/Legendary-User
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: "Benutzer nicht gefunden" });
    }

    const plan = user.subscriptionPlan || "free";
    if (plan !== "premium" && plan !== "legendary") {
      return res.status(403).json({
        success: false,
        message: "⛔ Bulk-Operationen sind nur im Enterprise-Plan verfügbar.",
        requiresUpgrade: true,
        feature: "bulk_operations",
        upgradeUrl: "/pricing",
        userPlan: plan
      });
    }

    console.log(`🗑️ [Bulk-Delete] User ${userId} löscht ${contractIds.length} Verträge...`);

    // IDs zu ObjectId konvertieren
    const objectIds = contractIds.map(id => new ObjectId(id));

    // 1️⃣ Calendar Events löschen (für alle Verträge)
    try {
      const eventsResult = await eventsCollection.deleteMany({
        contractId: { $in: objectIds },
        userId: new ObjectId(userId)
      });
      console.log(`📅 ${eventsResult.deletedCount} Calendar Events gelöscht`);
    } catch (eventError) {
      console.warn("⚠️ Calendar Events konnten nicht gelöscht werden:", eventError.message);
    }

    // 2️⃣ Verträge löschen (nur die vom User!)
    const result = await contractsCollection.deleteMany({
      _id: { $in: objectIds },
      userId: new ObjectId(userId) // 🔒 Security: Nur eigene Verträge!
    });

    console.log(`✅ [Bulk-Delete] ${result.deletedCount}/${contractIds.length} Verträge gelöscht`);

    res.json({
      success: true,
      deleted: result.deletedCount,
      requested: contractIds.length,
      message: `${result.deletedCount} Verträge erfolgreich gelöscht`
    });

  } catch (error) {
    console.error("❌ [Bulk-Delete] Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Löschen der Verträge",
      details: error.message
    });
  }
});

/**
 * POST /api/contracts/bulk-move
 * Verschiebt mehrere Verträge in einen Ordner (Enterprise-Feature)
 * Body: { contractIds: ["id1", "id2", ...], targetFolderId: "folderId" | null }
 */
router.post("/bulk-move", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { contractIds, targetFolderId } = req.body;

    // Validierung
    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Keine Verträge zum Verschieben ausgewählt"
      });
    }

    if (contractIds.length > 100) {
      return res.status(400).json({
        success: false,
        message: "Maximal 100 Verträge gleichzeitig verschiebbar"
      });
    }

    // 🔒 ENTERPRISE-CHECK: Nur Premium/Enterprise/Legendary-User
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: "Benutzer nicht gefunden" });
    }

    const plan = user.subscriptionPlan || "free";
    if (plan !== "premium" && plan !== "legendary") {
      return res.status(403).json({
        success: false,
        message: "⛔ Bulk-Operationen sind nur im Enterprise-Plan verfügbar.",
        requiresUpgrade: true,
        feature: "bulk_operations",
        upgradeUrl: "/pricing",
        userPlan: plan
      });
    }

    console.log(`📦 [Bulk-Move] User ${userId} verschiebt ${contractIds.length} Verträge → Folder ${targetFolderId || 'ROOT'}`);

    // IDs zu ObjectId konvertieren
    const objectIds = contractIds.map(id => new ObjectId(id));

    // Optional: Folder-Existenz prüfen (wenn targetFolderId gesetzt)
    if (targetFolderId) {
      const foldersCollection = client.db("contract_ai").collection("folders");
      const folder = await foldersCollection.findOne({
        _id: new ObjectId(targetFolderId),
        userId: new ObjectId(userId)
      });

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: "Ziel-Ordner nicht gefunden"
        });
      }
    }

    // Verträge verschieben (nur die vom User!)
    const result = await contractsCollection.updateMany(
      {
        _id: { $in: objectIds },
        userId: new ObjectId(userId) // 🔒 Security: Nur eigene Verträge!
      },
      {
        $set: {
          folderId: targetFolderId ? new ObjectId(targetFolderId) : null,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ [Bulk-Move] ${result.modifiedCount}/${contractIds.length} Verträge verschoben`);

    res.json({
      success: true,
      moved: result.modifiedCount,
      requested: contractIds.length,
      message: `${result.modifiedCount} Verträge erfolgreich verschoben`,
      targetFolder: targetFolderId || "ROOT"
    });

  } catch (error) {
    console.error("❌ [Bulk-Move] Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Verschieben der Verträge",
      details: error.message
    });
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// 🆕 PDF V2 & V3 - Alternative PDF-Generierungsmethoden
// ═══════════════════════════════════════════════════════════════════════════

// Lazy-load der PDF-Generatoren (vermeidet Startup-Probleme)
let generatePDFv2 = null;
let generatePDFv3 = null;

const loadPDFGenerators = async () => {
  if (!generatePDFv2) {
    try {
      const v2Module = require('../services/pdfGeneratorV2');
      generatePDFv2 = v2Module.generatePDFv2;
      console.log('✅ PDF V2 Generator (React-PDF) geladen');
    } catch (err) {
      console.error('⚠️ PDF V2 Generator konnte nicht geladen werden:', err.message);
    }
  }
  if (!generatePDFv3) {
    try {
      const v3Module = require('../services/pdfGeneratorV3');
      generatePDFv3 = v3Module.generatePDFv3;
      console.log('✅ PDF V3 Generator (Typst) geladen');
    } catch (err) {
      console.error('⚠️ PDF V3 Generator konnte nicht geladen werden:', err.message);
    }
  }
};

/**
 * POST /api/contracts/:id/pdf
 * Generiert PDF - Standard ist V2 (React-PDF)
 * Query-Parameter:
 *   - ?version=v2|v3 (default: v2)
 *   - ?design=executive|modern|minimal|elegant|corporate (default: executive)
 */
router.post('/:id/pdf', verifyToken, async (req, res) => {
  try {
    await loadPDFGenerators();

    const version = req.query.version || 'v2';
    const designVariant = req.query.design || req.body.design || 'executive';
    const contractId = req.params.id;
    console.log(`📄 [PDF] Anfrage für Vertrag ${contractId}, Version: ${version}, Design: ${designVariant}`);

    // Vertrag laden
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }

    // Company Profile laden (immer versuchen)
    let companyProfile = null;
    try {
      const db = client.db("contractai");
      companyProfile = await db.collection("company_profiles").findOne({
        userId: new ObjectId(req.user.userId)
      });
    } catch (profileError) {
      console.log('⚠️ Company Profile konnte nicht geladen werden:', profileError.message);
    }

    const parties = contract.formData || contract.parties || contract.metadata?.parties || {};
    const finalDesign = contract.designVariant || designVariant;
    let pdfBuffer;

    // ✅ WICHTIG: Fallback für Vertragstext - wenn content leer ist, aus contractHTML extrahieren
    let contractText = contract.content;
    console.log('📄 [PDF] Content-Check:', {
      contentLength: contract.content?.length || 0,
      hasContractHTML: !!contract.contractHTML,
      contractHTMLLength: contract.contractHTML?.length || 0
    });

    if (!contractText || contractText.length < 100) {
      console.log('⚠️ [PDF] content ist leer oder sehr kurz, prüfe Alternativen...');
      if (contract.contractHTML && contract.contractHTML.length > 100) {
        console.log('🔄 [PDF] Extrahiere Text aus contractHTML...');
        // Einfache HTML-Tag Entfernung
        contractText = contract.contractHTML
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, '\n')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        console.log('📝 [PDF] Extrahierter Text-Länge:', contractText.length);
      } else {
        console.log('❌ [PDF] KEIN VERTRAGSTEXT GEFUNDEN!');
      }
    }

    if (version === 'v3' && generatePDFv3) {
      // V3: Typst
      pdfBuffer = await generatePDFv3(
        contractText,
        companyProfile,
        contract.contractType || 'Vertrag',
        parties,
        contract.status === 'Entwurf'
      );
    } else if (generatePDFv2) {
      // V2: React-PDF (Standard) - mit Design-Variante und Contract-ID für QR-Code
      pdfBuffer = await generatePDFv2(
        contractText,
        companyProfile,
        contract.contractType || 'Vertrag',
        parties,
        contract.status === 'Entwurf',
        finalDesign,
        contractId  // ✅ Contract-ID für QR-Code Verifizierung
      );
    } else {
      return res.status(503).json({
        message: `PDF Generator nicht verfügbar`,
        availableVersions: {
          v2: !!generatePDFv2,
          v3: !!generatePDFv3
        }
      });
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${contract.name || 'Vertrag'}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    console.log(`✅ [PDF ${version.toUpperCase()}] Erfolgreich gesendet`);

  } catch (error) {
    console.error('❌ [PDF] Generierung fehlgeschlagen:', error);
    res.status(500).json({
      message: 'PDF-Generierung fehlgeschlagen',
      error: error.message
    });
  }
});

/**
 * POST /api/contracts/:id/pdf-v2
 * Generiert PDF mit React-PDF (V2)
 * Query-Parameter: ?design=executive|modern|minimal|elegant|corporate (default: executive)
 */
router.post('/:id/pdf-v2', verifyToken, async (req, res) => {
  try {
    await loadPDFGenerators();

    if (!generatePDFv2) {
      return res.status(503).json({
        message: 'PDF V2 Generator nicht verfügbar',
        error: 'React-PDF Modul konnte nicht geladen werden'
      });
    }

    const contractId = req.params.id;
    // Design aus Query-Parameter oder Request-Body
    const designVariant = req.query.design || req.body.design || 'executive';
    console.log('🎨 [V2] PDF-Anfrage für Vertrag:', contractId, '| Design:', designVariant);

    // Verwende die bereits initialisierte contractsCollection
    // WICHTIG: userId muss als ObjectId verglichen werden!
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }

    // Company Profile laden (immer versuchen, falls vorhanden)
    // WICHTIG: req.db verwenden (gleiche Connection wie companyProfile.js)
    let companyProfile = null;
    try {
      // req.db ist die Middleware-injizierte DB-Verbindung
      const db = req.db;
      if (!db) {
        console.log('⚠️ req.db nicht verfügbar, verwende client.db()');
      }
      const profileDb = db || client.db("contractai");

      // Versuche zuerst mit ObjectId, dann mit String
      const rawProfile = await profileDb.collection("company_profiles").findOne({
        $or: [
          { userId: new ObjectId(req.user.userId) },
          { userId: req.user.userId }
        ]
      });

      if (rawProfile) {
        // Normalisiere Feld-Namen für den PDF-Generator
        companyProfile = {
          ...rawProfile,
          zip: rawProfile.postalCode || rawProfile.zip || '', // postalCode -> zip
          companyName: rawProfile.companyName || '',
          street: rawProfile.street || '',
          city: rawProfile.city || '',
          contactPhone: rawProfile.contactPhone || '',
          contactEmail: rawProfile.contactEmail || ''
        };

        // Logo-URL aus S3-Key generieren (IMMER frische signierte URL erstellen)
        if (rawProfile.logoKey) {
          try {
            const aws = require('aws-sdk');
            const s3 = new aws.S3({
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
              region: process.env.AWS_REGION
            });
            companyProfile.logoUrl = s3.getSignedUrl('getObject', {
              Bucket: process.env.S3_BUCKET_NAME,
              Key: rawProfile.logoKey,
              Expires: 3600 // 1 Stunde gültig
            });
            console.log('🖼️ Logo-URL generiert aus S3-Key:', rawProfile.logoKey);
          } catch (s3Error) {
            console.log('⚠️ Logo-URL konnte nicht generiert werden:', s3Error.message);
          }
        } else {
          console.log('⚠️ Kein logoKey im Profil vorhanden');
        }
      }

      console.log('🏢 [V2] Company Profile geladen:', companyProfile ? {
        companyName: companyProfile.companyName,
        street: companyProfile.street,
        zip: companyProfile.zip,
        city: companyProfile.city,
        hasLogo: !!companyProfile.logoUrl,
        hasLogoKey: !!rawProfile?.logoKey
      } : 'Kein Profil gefunden für userId: ' + req.user.userId);
    } catch (profileError) {
      console.log('⚠️ Company Profile konnte nicht geladen werden:', profileError.message);
    }

    // Parteien-Daten aus formData oder metadata extrahieren
    const parties = contract.formData || contract.parties || contract.metadata?.parties || {};

    // Design-Variante: aus Vertrag oder Query-Parameter
    const finalDesign = contract.designVariant || designVariant;

    // DEBUG: Alle verfügbaren Felder anzeigen
    console.log('📄 Vertragsdaten:', {
      name: contract.name,
      type: contract.contractType,
      design: finalDesign,
      hasCompanyProfile: !!companyProfile,
      partiesKeys: Object.keys(parties),
      contentLength: contract.content?.length || 0,
      contentPreview: contract.content?.substring(0, 300) || 'KEIN CONTENT!',
      hasContractHTML: !!contract.contractHTML,
      contractHTMLLength: contract.contractHTML?.length || 0,
      allFields: Object.keys(contract)
    });

    // Fallback: Wenn content leer ist, versuche aus contractHTML den Text zu extrahieren
    let contractText = contract.content;
    if (!contractText || contractText.length < 100) {
      console.log('⚠️ content ist leer oder sehr kurz, prüfe Alternativen...');
      if (contract.contractHTML && contract.contractHTML.length > 100) {
        console.log('🔄 Extrahiere Text aus contractHTML...');
        // Einfache HTML-Tag Entfernung
        contractText = contract.contractHTML
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<[^>]+>/g, '\n')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        console.log('📝 Extrahierter Text-Länge:', contractText.length);
        console.log('📝 Extrahierter Text-Anfang:', contractText.substring(0, 300));
      }
    }

    const pdfBuffer = await generatePDFv2(
      contractText,
      companyProfile,
      contract.contractType || 'Vertrag',
      parties,
      contract.status === 'Entwurf',
      finalDesign,
      contractId  // Contract-ID für QR-Code Verifizierung
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${contract.name || 'Vertrag'}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    console.log('✅ [V2] PDF erfolgreich gesendet');

  } catch (error) {
    console.error('❌ [V2] PDF-Generierung fehlgeschlagen:', error);
    res.status(500).json({
      message: 'PDF-Generierung (V2/React-PDF) fehlgeschlagen',
      error: error.message
    });
  }
});

/**
 * POST /api/contracts/:id/pdf-v3
 * Generiert PDF mit Typst (V3)
 */
router.post('/:id/pdf-v3', verifyToken, async (req, res) => {
  try {
    await loadPDFGenerators();

    if (!generatePDFv3) {
      return res.status(503).json({
        message: 'PDF V3 Generator nicht verfügbar',
        error: 'Typst Modul konnte nicht geladen werden'
      });
    }

    const contractId = req.params.id;
    console.log('🎨 [V3] PDF-Anfrage für Vertrag:', contractId);

    // Verwende die bereits initialisierte contractsCollection
    // WICHTIG: userId muss als ObjectId verglichen werden!
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }

    // Company Profile laden
    let companyProfile = null;
    if (contract.hasCompanyProfile) {
      const db = client.db("contractai");
      companyProfile = await db.collection("company_profiles").findOne({
        userId: new ObjectId(req.user.userId)
      });
    }

    const parties = contract.formData || contract.parties || {};

    const pdfBuffer = await generatePDFv3(
      contract.content,
      companyProfile,
      contract.contractType || 'Vertrag',
      parties,
      contract.status === 'Entwurf'
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${contract.name || 'Vertrag'}_v3.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    console.log('✅ [V3] PDF erfolgreich gesendet');

  } catch (error) {
    console.error('❌ [V3] PDF-Generierung fehlgeschlagen:', error);
    res.status(500).json({
      message: 'PDF-Generierung (V3/Typst) fehlgeschlagen',
      error: error.message
    });
  }
});

/**
 * GET /api/contracts/verify/:id
 * Öffentliche Route zur Verifizierung eines Vertrags via QR-Code
 * Keine Authentifizierung erforderlich - gibt nur öffentliche Metadaten zurück
 */
router.get('/verify/:id', async (req, res) => {
  try {
    const contractId = req.params.id;
    console.log('🔍 Vertragsverifizierung angefragt für ID:', contractId);

    // Validiere ObjectId Format
    if (!ObjectId.isValid(contractId)) {
      return res.status(400).json({
        verified: false,
        message: 'Ungültige Vertrags-ID',
        error: 'INVALID_ID'
      });
    }

    // Vertrag suchen (nur nicht-sensible Felder)
    const contract = await contractsCollection.findOne(
      { _id: new ObjectId(contractId) },
      {
        projection: {
          name: 1,
          contractType: 1,
          status: 1,
          createdAt: 1,
          updatedAt: 1,
          designVariant: 1
        }
      }
    );

    if (!contract) {
      return res.status(404).json({
        verified: false,
        message: 'Vertrag nicht gefunden',
        error: 'NOT_FOUND'
      });
    }

    // Erfolgreiche Verifizierung - gib öffentliche Metadaten zurück
    console.log('✅ Vertrag verifiziert:', contract.name);

    res.json({
      verified: true,
      message: 'Vertrag erfolgreich verifiziert',
      contract: {
        id: contract._id,
        name: contract.name || 'Unbenannter Vertrag',
        type: contract.contractType || 'Vertrag',
        status: contract.status || 'Aktiv',
        createdAt: contract.createdAt,
        updatedAt: contract.updatedAt,
        designVariant: contract.designVariant || 'executive'
      },
      platform: {
        name: 'Contract AI',
        url: 'https://contract-ai.de',
        verifiedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Verifizierungsfehler:', error);
    res.status(500).json({
      verified: false,
      message: 'Fehler bei der Verifizierung',
      error: 'SERVER_ERROR'
    });
  }
});

module.exports = router;