// 📁 backend/routes/contracts.js - ERWEITERT mit Calendar Integration und Provider Detection
const express = require("express");
const { ObjectId } = require("mongodb");
const database = require("../config/database");
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
const { generateEmailTemplate } = require("../utils/emailTemplate");
const contractAnalyzer = require("../services/contractAnalyzer"); // 🤖 ULTRA-INTELLIGENT Contract Analyzer v10
const AILegalPulse = require("../services/aiLegalPulse"); // ⚡ Legal Pulse Risk Analysis
const { preprocessContract } = require("../services/legalLens/clausePreprocessor"); // 🧠 Legal Lens Vorverarbeitung
const analyzeRoute = require("./analyze"); // 🚀 V2 Analysis Functions
const OrganizationMember = require("../models/OrganizationMember"); // 👥 Team-Management
const { findContractWithOrgAccess, hasPermission, buildOrgFilter } = require("../utils/orgContractAccess"); // 👥 Org-basierter Zugriff
const { generateDeepLawyerLevelPrompt, getContractTypeAwareness } = analyzeRoute;
const { isEnterpriseOrHigher } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen // 🚀 Import V2 functions
const { embedContractAsync } = require("../services/contractEmbedder"); // 🔍 Auto-Embedding for Legal Pulse Monitoring

const router = express.Router();
const aiLegalPulse = new AILegalPulse(); // ⚡ Initialize Legal Pulse analyzer

// 🚀 Cache-Invalidierung: Bei jeder Schreiboperation (POST/PUT/PATCH/DELETE) Cache für den User leeren
router.use((req, res, next) => {
  if (req.method !== 'GET') {
    res.on('finish', () => {
      // req.user wird erst von verifyToken gesetzt → daher hier prüfen, nicht oben
      if (res.statusCode >= 200 && res.statusCode < 300 && req.user?.userId) {
        invalidateContractsCache(req.user.userId);
      }
    });
  }
  next();
});

// 🔧 Fix UTF-8 encoding issues (mojibake: UTF-8 bytes interpreted as Latin-1)
function fixUtf8Encoding(str) {
  if (!str || typeof str !== 'string') return str;
  const fixes = {
    'Ã¼': 'ü', 'Ã¤': 'ä', 'Ã¶': 'ö', 'Ãœ': 'Ü', 'Ã„': 'Ä', 'Ã–': 'Ö',
    'ÃŸ': 'ß', 'Ã©': 'é', 'Ã¨': 'è', 'Ã ': 'à', 'Ã¢': 'â', 'Ã®': 'î',
    'Ã´': 'ô', 'Ã»': 'û', 'Ã§': 'ç', 'Ã±': 'ñ'
  };
  let fixed = str;
  for (const [broken, correct] of Object.entries(fixes)) {
    fixed = fixed.split(broken).join(correct);
  }
  return fixed;
}
let contractsCollection;
let analysisCollection;
let eventsCollection; // ✅ NEU: Events Collection
let usersCollection; // ✅ NEU: Users Collection für Bulk-Ops

// 🚀 Server-seitiger Contracts-Cache (löst das Shared-Tier-Latenz-Problem)
const _contractsCache = new Map();
const CACHE_TTL = 60000; // 60 Sekunden
const CACHE_MAX_ENTRIES = 100; // Max Einträge um Memory Leak zu verhindern

function getContractsCacheKey(filter, sort, skip, limit) {
  return JSON.stringify({ f: filter, s: sort, sk: skip, l: limit });
}

function invalidateContractsCache(userId) {
  const uidStr = userId?.toString();
  for (const [key] of _contractsCache) {
    if (key.includes(uidStr)) _contractsCache.delete(key);
  }
}

// Abgelaufene Einträge entfernen + Size-Limit enforcer
function cleanupContractsCache() {
  const now = Date.now();
  for (const [key, val] of _contractsCache) {
    if (now - val.ts > CACHE_TTL) _contractsCache.delete(key);
  }
  // Wenn immer noch zu viele: älteste entfernen
  if (_contractsCache.size > CACHE_MAX_ENTRIES) {
    const entries = [..._contractsCache.entries()].sort((a, b) => a[1].ts - b[1].ts);
    const toDelete = entries.slice(0, entries.length - CACHE_MAX_ENTRIES);
    for (const [key] of toDelete) _contractsCache.delete(key);
  }
}

// 🔧 ensureDb(): Lazy-Init über Singleton-Pool (database.js)
let _db = null;
async function ensureDb() {
  if (!_db) {
    _db = await database.connect();
    contractsCollection = _db.collection("contracts");
    analysisCollection = _db.collection("analyses");
    eventsCollection = _db.collection("contract_events");
    usersCollection = _db.collection("users");
  }
  return _db;
}

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
} catch (error) {
  console.error("❌ [CONTRACTS] S3 configuration failed:", error.message);
  S3_AVAILABLE = false;
}

/**
 * 🔧 FIX: Extract end_date from AI-analyzed importantDates
 * AI analysis is more accurate than regex extraction for dates!
 */
const extractEndDateFromImportantDates = (importantDates) => {
  if (!importantDates || !Array.isArray(importantDates)) {
    return null;
  }

  const endDateEntry = importantDates.find(d => d.type === 'end_date');
  if (!endDateEntry || !endDateEntry.date) {
    return null;
  }

  try {
    let dateStr = endDateEntry.date;
    let parsedDate;

    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      parsedDate = new Date(dateStr);
    } else if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(dateStr)) {
      const parts = dateStr.split('.');
      parsedDate = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    } else {
      parsedDate = new Date(dateStr);
    }

    if (parsedDate && !isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  } catch (err) {
    console.warn('⚠️ [DATE-PARSE] Non-critical date parsing error:', err.message);
  }

  return null;
};

// ===== LAZY-LOAD PDF-GENERATOREN (für Auto-PDF bei Vertragserstellung) =====
let generatePDFv2 = null;
let generatePDFv3 = null;

const loadPDFGenerators = async () => {
  if (!generatePDFv2) {
    try {
      const v2Module = require('../services/pdfGeneratorV2');
      generatePDFv2 = v2Module.generatePDFv2;
    } catch (err) {
      console.error('⚠️ PDF V2 Generator konnte nicht geladen werden:', err.message);
    }
  }
  if (!generatePDFv3) {
    try {
      const v3Module = require('../services/pdfGeneratorV3');
      generatePDFv3 = v3Module.generatePDFv3;
    } catch (err) {
      console.error('⚠️ PDF V3 Generator konnte nicht geladen werden:', err.message);
    }
  }
};

// ============================================
// 🆕 AUTO-PDF FUNKTION FÜR GENERIERTE VERTRÄGE (React-PDF / pdfGeneratorV2)
// ============================================
const generatePDFAndUploadToS3ForContract = async (contractId, userId, contractText, contractName, designVariant) => {
  if (!S3_AVAILABLE) {
    return { success: false, error: 'S3 nicht verfügbar' };
  }

  try {
    await loadPDFGenerators();
    if (!generatePDFv2) {
      return { success: false, error: 'PDF Generator nicht verfügbar' };
    }

    // Company Profile laden (optional)
    let companyProfile = null;
    try {
      const pdfDb = await database.connect();
      const rawProfile = await pdfDb.collection("company_profiles").findOne({
        $or: [{ userId: new ObjectId(userId) }, { userId: userId }]
      });
      if (rawProfile) {
        companyProfile = { ...rawProfile, zip: rawProfile.postalCode || rawProfile.zip || '' };
      }
    } catch (e) { /* optional */ }

    // Contract Daten für Parties
    await ensureDb();
    const contract = await contractsCollection.findOne({ _id: new ObjectId(contractId) });
    const parties = contract?.formData || contract?.metadata?.parties || {};
    const contractType = contract?.contractType || 'Vertrag';

    // PDF generieren mit React-PDF
    const pdfBuffer = await generatePDFv2(
      contractText,
      companyProfile,
      contractType,
      parties,
      false,  // isDraft
      designVariant || contract?.designVariant || 'executive',
      contractId.toString()
    );

    // S3 Upload
    const timestamp = Date.now();
    const sanitizedName = (contractName || 'vertrag').replace(/[^a-zA-Z0-9äöüÄÖÜß.-]/g, '-');
    const s3Key = `contracts/${userId}/${sanitizedName}-${timestamp}.pdf`;

    await s3Instance.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: pdfBuffer,
      ContentType: 'application/pdf',
      Metadata: { contractId: contractId.toString(), userId: userId.toString(), source: 'auto-generated' }
    }));

    // DB aktualisieren
    await contractsCollection.updateOne(
      { _id: new ObjectId(contractId) },
      { $set: { s3Key, pdfUploaded: true, pdfUploadedAt: new Date(), pdfAutoGenerated: true } }
    );

    return { success: true, s3Key };
  } catch (error) {
    console.error(`❌ [AUTO-PDF] React-PDF Generierung fehlgeschlagen:`, error.message);
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
    keywords: ['ing-diba', 'ing diba', 'ing bank', 'diba'],
    category: 'Bank'
  }
};

// Provider Detection Function - NEU
// Hilfsfunktion: Regex-Sonderzeichen escapen (für z.B. "R+V")
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function detectProvider(text, filename = '') {
  if (!text && !filename) return null;

  const searchText = (text + ' ' + filename).toLowerCase();
  let bestMatch = null;
  let highestScore = 0;

  for (const [key, provider] of Object.entries(providerPatterns)) {
    let score = 0;

    // Check keywords - NUR Wortgrenzen-Match (verhindert "ing" in "Kündigung")
    for (const keyword of provider.keywords) {
      const keywordRegex = new RegExp(`\\b${escapeRegex(keyword)}\\b`, 'i');
      if (keywordRegex.test(searchText)) {
        score += keyword.length * 2 + 10;
      }
    }

    // Check display name - NUR als eigenständiges Wort
    const displayRegex = new RegExp(`\\b${escapeRegex(provider.displayName)}\\b`, 'i');
    if (displayRegex.test(searchText)) {
      score += 20;
    }

    // Check full name - NUR als eigenständiges Wort
    const nameRegex = new RegExp(`\\b${escapeRegex(provider.name)}\\b`, 'i');
    if (nameRegex.test(searchText)) {
      score += 15;
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = provider;
    }
  }

  // Return provider with confidence score
  // Schwelle 20: Mindestens ein vollständiger Wort-Match nötig
  if (bestMatch && highestScore >= 20) {
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

// 🎓 Helper: Onboarding Checklist Item automatisch aktualisieren
async function updateOnboardingChecklist(userId, itemId) {
  try {
    if (!usersCollection) return;

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          [`onboarding.checklist.${itemId}`]: true,
          updatedAt: new Date()
        }
      }
    );

    if (result.modifiedCount > 0) {
    }
  } catch (err) {
    // Fehler nicht werfen - Contract-Operation soll weiterlaufen
  }
}

// Export für andere Routes (z.B. analyze.js)
router.updateOnboardingChecklist = updateOnboardingChecklist;

// 🚀 PERFORMANCE: MongoDB Indizes erstellen beim ersten ensureDb()-Aufruf
let _indexesCreated = false;
async function ensureIndexes() {
  if (_indexesCreated) return;
  _indexesCreated = true;
  try {
    // Compound Index für häufigste Query: User's Contracts sortiert nach Datum
    await contractsCollection.createIndex(
      { userId: 1, createdAt: -1 },
      { name: "idx_userId_createdAt", background: true }
    );

    // Index für Ablaufdatum-Filter (Status-Berechnung)
    await contractsCollection.createIndex(
      { userId: 1, expiryDate: 1 },
      { name: "idx_userId_expiryDate", background: true }
    );

    // Index für Text-Suche auf Name
    await contractsCollection.createIndex(
      { userId: 1, name: 1 },
      { name: "idx_userId_name", background: true }
    );

    // Index für Legal Pulse Risk Score Sortierung
    await contractsCollection.createIndex(
      { userId: 1, "legalPulse.riskScore": -1 },
      { name: "idx_userId_riskScore", background: true }
    );

    // Index für Folder-Filter
    await contractsCollection.createIndex(
      { userId: 1, folderId: 1 },
      { name: "idx_userId_folderId", background: true }
    );

    // 🚀 Indexes für Batch-Lookups (Events + Envelopes Collections)
    await _db.collection("contract_events").createIndex(
      { contractId: 1, status: 1, date: 1 },
      { name: "idx_contractId_status_date", background: true }
    );

    await _db.collection("envelopes").createIndex(
      { contractId: 1, createdAt: -1 },
      { name: "idx_contractId_createdAt", background: true }
    );

  } catch (indexErr) {
    console.warn('⚠️ [INDEX] Index creation failed (non-critical):', indexErr.message);
  }
}

// Indexes werden beim ersten Request erstellt (lazy)
ensureDb().then(() => ensureIndexes()).catch(err => {
  console.error("❌ MongoDB-Fehler (contracts.js):", err);
});

// 🚀 Keine $lookup-Aggregation mehr — ALLE Lookups als parallele Batch-Queries
// $expr-basierte $lookups (auch für Events/Envelopes) können Indexes nicht nutzen
// und verursachen pro Vertrag einen Collection-Scan → 34 Verträge × 3 Collections = ~100 Scans
// Batch-Queries mit $in nutzen Indexes und laufen parallel → drastisch schneller
async function enrichContractsWithAggregation(mongoFilter, sortOptions, skip, limit) {
  const t0 = Date.now();

  // 🚀 Cache-Check: Wenn gleiche Query kürzlich lief, sofort aus RAM liefern
  const cacheKey = getContractsCacheKey(mongoFilter, sortOptions, skip, limit);
  const cached = _contractsCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    const cacheTime = Date.now() - t0;
    return {
      ...cached.data,
      _enrichTiming: { ...cached.data._enrichTiming, cached: true, cacheTime: cacheTime + 'ms' }
    };
  }

  // Step 1: Count + Contracts parallel laden (beide nutzen userId Index)
  // INCLUSION Projection: NUR die Felder laden die die Listenansicht braucht
  // Spart ~80% Datentransfer (große Felder wie legalPulse, legalLens, embeddings werden NICHT geladen)
  const LIST_PROJECTION = {
    // Basis-Felder
    name: 1, status: 1, userId: 1, createdAt: 1, updatedAt: 1,
    // Vertrags-Details
    expiryDate: 1, startDate: 1, kuendigung: 1, laufzeit: 1,
    documentCategory: 1, uploadType: 1, s3Key: 1, folderId: 1,
    // Analysis-Daten
    analyzed: 1, analysis: 1, analysisId: 1,
    contractScore: 1, summary: 1, risiken: 1, criticalIssues: 1,
    suggestions: 1, legalAssessment: 1, quickFacts: 1,
    importantDates: 1, positiveAspects: 1, recommendations: 1, laymanSummary: 1,
    // Status-Felder
    isGenerated: 1, isOptimized: 1, gekuendigtZum: 1,
    paymentStatus: 1, paymentAmount: 1, paymentFrequency: 1,
    // Signatur
    signatureStatus: 1, signatureEnvelopeId: 1,
    // Reminder
    reminderDays: 1, reminderSettings: 1,
    // Org
    organizationId: 1,
    // Detail-Modal Felder (werden über "Feld hinzufügen" gesetzt)
    contractType: 1, anbieter: 1, vertragsnummer: 1, kosten: 1,
    provider: 1, customFields: 1, notes: 1,
    // Sort-Felder (auch wenn nicht angezeigt, für Sortierung nötig)
    'legalPulse.riskScore': 1
  };

  const [countResult, contracts] = await Promise.all([
    contractsCollection.aggregate([{ $match: mongoFilter }, { $count: "total" }]).toArray(),
    contractsCollection
      .find(mongoFilter, { projection: LIST_PROJECTION })
      .sort(sortOptions)
      .skip(skip > 0 ? skip : 0)
      .limit(limit > 0 ? limit : 0)
      .toArray()
  ]);
  const totalCount = countResult[0]?.total || 0;

  const t1 = Date.now();

  if (contracts.length === 0) {
    return { contracts: [], totalCount, _enrichTiming: { base: (t1-t0)+'ms', total: (t1-t0)+'ms' } };
  }

  // Step 2: Alle 3 Batch-Lookups PARALLEL (jeder nutzt Indexes)
  const contractIds = contracts.map(c => c._id);
  const analysisIds = contracts.map(c => c.analysisId).filter(id => id != null);
  const idObjects = analysisIds.map(id => { try { return new ObjectId(id); } catch { return id; } });

  const [analysesByIdArr, allEvents, allEnvelopes] = await Promise.all([
    // Analysis: per _id (nutzt _id Index) — NUR benötigte Felder laden (kein fullText!)
    idObjects.length > 0
      ? analysisCollection.find({ _id: { $in: idObjects } }, {
          projection: {
            summary: 1, legalAssessment: 1, suggestions: 1, comparison: 1,
            contractScore: 1, createdAt: 1, criticalIssues: 1, quickFacts: 1,
            importantDates: 1, positiveAspects: 1, recommendations: 1, laymanSummary: 1,
            userId: 1, contractName: 1, originalFileName: 1
          }
        }).toArray()
      : Promise.resolve([]),

    // Events: per contractId $in (nutzt idx_contractId_status_date)
    eventsCollection
      .find({ contractId: { $in: contractIds }, status: { $ne: "dismissed" } })
      .sort({ date: 1 })
      .toArray(),

    // Envelopes: per contractId $in (nutzt idx_contractId_createdAt)
    _db.collection("envelopes")
      .find({ contractId: { $in: contractIds } })
      .sort({ createdAt: -1 })
      .toArray()
  ]);

  const t2 = Date.now();

  // Step 3: Maps bauen für O(1) Zugriff
  const analysesByIdMap = new Map();
  for (const a of analysesByIdArr) {
    analysesByIdMap.set(a._id.toString(), a);
  }

  const eventsMap = new Map();
  for (const e of allEvents) {
    const key = e.contractId.toString();
    if (!eventsMap.has(key)) eventsMap.set(key, []);
    const arr = eventsMap.get(key);
    if (arr.length < 5) {
      arr.push({ id: e._id, type: e.type, title: e.title, date: e.date, severity: e.severity, status: e.status });
    }
  }

  const envelopeMap = new Map();
  for (const env of allEnvelopes) {
    const key = env.contractId.toString();
    if (!envelopeMap.has(key)) envelopeMap.set(key, env);
  }

  // Step 4: Contracts ohne Analysis-Match → Fallback per Name (1 Batch-Query)
  const needFallback = contracts.filter(c => {
    const hasDirectAnalysis = c.analysis && typeof c.analysis === 'object' && Object.keys(c.analysis).length > 0;
    if (hasDirectAnalysis) return false;
    if (c.analysisId && analysesByIdMap.has(c.analysisId.toString())) return false;
    return true;
  });

  const fallbackMap = new Map();
  if (needFallback.length > 0) {
    const orConditions = [];
    for (const c of needFallback) {
      if (!c.name) continue;
      const uid = c.userId?.toString();
      orConditions.push(
        { userId: uid, contractName: c.name },
        { userId: uid, originalFileName: c.name }
      );
    }
    if (orConditions.length > 0) {
      const fallbackResults = await analysisCollection.find({ $or: orConditions }, {
          projection: {
            summary: 1, legalAssessment: 1, suggestions: 1, comparison: 1,
            contractScore: 1, createdAt: 1, criticalIssues: 1, quickFacts: 1,
            importantDates: 1, positiveAspects: 1, recommendations: 1, laymanSummary: 1,
            userId: 1, contractName: 1, originalFileName: 1
          }
        }).sort({ createdAt: -1 }).toArray();
      for (const a of fallbackResults) {
        const key = a.userId?.toString() + '::' + (a.contractName || a.originalFileName);
        if (!fallbackMap.has(key)) fallbackMap.set(key, a);
      }
    }
  }

  const t3 = Date.now();

  // Step 5: Alles zusammenführen (identische Logik wie enrichContractWithAnalysis)
  for (const contract of contracts) {
    // --- Events ---
    contract.upcomingEvents = eventsMap.get(contract._id.toString()) || [];

    // --- Envelope ---
    const env = envelopeMap.get(contract._id.toString());
    if (env) {
      const signers = env.signers || [];
      contract.envelope = {
        _id: env._id,
        signatureStatus: env.status,
        signersTotal: signers.length,
        signersSigned: signers.filter(s => s.status === 'SIGNED').length,
        s3KeySealed: env.s3KeySealed,
        completedAt: env.completedAt,
        expiresAt: env.expiresAt
      };
      contract.signatureStatus = env.status;
      contract.signatureEnvelopeId = env._id;
    } else {
      contract.envelope = null;
    }

    // --- Analysis ---
    const hasDirectAnalysis = contract.analysis && typeof contract.analysis === 'object' && Object.keys(contract.analysis).length > 0;
    if (!hasDirectAnalysis) {
      let analysis = null;
      if (contract.analysisId) {
        analysis = analysesByIdMap.get(contract.analysisId.toString()) || null;
      }
      if (!analysis && contract.name) {
        analysis = fallbackMap.get(contract.userId?.toString() + '::' + contract.name) || null;
      }

      if (analysis) {
        contract.analysis = {
          summary: analysis.summary,
          legalAssessment: analysis.legalAssessment,
          suggestions: analysis.suggestions,
          comparison: analysis.comparison,
          contractScore: analysis.contractScore,
          analysisId: analysis._id,
          lastAnalyzed: analysis.createdAt
        };
      }

      contract.summary = contract.summary || analysis?.summary || null;
      contract.contractScore = contract.contractScore || analysis?.contractScore || null;
      contract.legalAssessment = contract.legalAssessment || analysis?.legalAssessment || null;
      contract.suggestions = contract.suggestions || analysis?.suggestions || null;
      contract.risiken = contract.risiken || contract.criticalIssues || analysis?.criticalIssues || null;
      contract.quickFacts = contract.quickFacts || analysis?.quickFacts || null;
      contract.importantDates = contract.importantDates || analysis?.importantDates || null;
      contract.positiveAspects = contract.positiveAspects || analysis?.positiveAspects || null;
      contract.recommendations = contract.recommendations || analysis?.recommendations || null;
      contract.laymanSummary = contract.laymanSummary || analysis?.laymanSummary || null;
    }
  }

  const t4 = Date.now();

  const _enrichTiming = {
    base: (t1-t0) + 'ms',
    lookups: (t2-t1) + 'ms',
    fallback: (t3-t2) + 'ms',
    merge: (t4-t3) + 'ms',
    total: (t4-t0) + 'ms',
    contracts: contracts.length,
    analysisByIdCount: analysesByIdMap.size,
    eventsCount: allEvents.length,
    envelopesCount: allEnvelopes.length,
    fallbackCount: needFallback.length
  };
  console.log('[PERF] enrichContracts:', JSON.stringify(_enrichTiming));

  // 🚀 Ergebnis cachen für nachfolgende Aufrufe
  cleanupContractsCache(); // Abgelaufene + überzählige Einträge entfernen
  const result = { contracts, totalCount, _enrichTiming };
  _contractsCache.set(cacheKey, { data: result, ts: Date.now() });

  return result;
}


// 🔄 Legacy-Funktion für Einzelverträge (z.B. GET /:id)
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

    // ✅ NEU: Analysedaten auf Root-Level mappen (für Frontend-Kompatibilität)
    // Priorität: Direktes Feld auf Contract > Analysis Collection
    contract.summary = contract.summary || analysis?.summary || null;
    contract.contractScore = contract.contractScore || analysis?.contractScore || null;
    contract.legalAssessment = contract.legalAssessment || analysis?.legalAssessment || null;
    contract.suggestions = contract.suggestions || analysis?.suggestions || null;
    contract.risiken = contract.risiken || contract.criticalIssues || analysis?.criticalIssues || null;
    contract.quickFacts = contract.quickFacts || analysis?.quickFacts || null;
    contract.detailedLegalOpinion = contract.detailedLegalOpinion || analysis?.detailedLegalOpinion || null;
    contract.importantDates = contract.importantDates || analysis?.importantDates || null;
    contract.positiveAspects = contract.positiveAspects || analysis?.positiveAspects || null;
    contract.recommendations = contract.recommendations || analysis?.recommendations || null;
    contract.laymanSummary = contract.laymanSummary || analysis?.laymanSummary || null;

    if (!contract.fullText) {
      if (contract.content) {
        contract.fullText = contract.content;
      } else if (contract.extractedText) {
        contract.fullText = contract.extractedText;
      }
    }

    // Calendar Events
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

    // Envelope/Signature Data
    try {
      const Envelope = require("../models/Envelope");
      const envelope = await Envelope.findOne({ contractId: contract._id })
        .sort({ createdAt: -1 })
        .lean();

      if (envelope) {
        const signersTotal = envelope.signers?.length || 0;
        const signersSigned = envelope.signers?.filter(s => s.status === 'SIGNED').length || 0;

        contract.envelope = {
          _id: envelope._id,
          signatureStatus: envelope.status,
          signersTotal,
          signersSigned,
          s3KeySealed: envelope.s3KeySealed || null,
          completedAt: envelope.completedAt || null,
          expiresAt: envelope.expiresAt || null
        };

        contract.signatureStatus = envelope.status;
        contract.signatureEnvelopeId = envelope._id;
      }
    } catch (envelopeErr) {
      console.warn('⚠️ [ENVELOPE] Envelope lookup failed:', envelopeErr.message);
    }

    return contract;
  } catch (err) {
    console.error("❌ Fehler beim Laden der Analyse/Events:", err.message);
    return contract;
  }
}

// GET /contracts – alle Verträge mit Events
// Note: verifyToken wird bereits im Router-Mount (server.js) aufgerufen
router.get("/", async (req, res) => {
  const _t0 = Date.now();
  try {
    await ensureDb();
    const _t1 = Date.now();
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
    const _t2 = Date.now();
    const membership = await OrganizationMember.findOne({
      userId: new ObjectId(req.user.userId),
      isActive: true
    });
    const _t3 = Date.now();

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

    // 📊 Status-Filter - basierend auf berechneten Werten (wie Frontend calculateSmartStatus)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in30Days = new Date(today);
    in30Days.setDate(in30Days.getDate() + 30);

    if (statusFilter !== 'alle') {
      switch (statusFilter) {
        case 'aktiv':
          // Aktiv = hat Ablaufdatum > 30 Tage in der Zukunft ODER kein Ablaufdatum (und nicht gekündigt)
          mongoFilter.$and = mongoFilter.$and || [];
          mongoFilter.$and.push({
            $or: [
              // Ablaufdatum > 30 Tage in der Zukunft
              { expiryDate: { $gt: in30Days } },
              // Kein Ablaufdatum gesetzt (und nicht gekündigt/beendet)
              {
                expiryDate: { $exists: false },
                gekuendigtZum: { $exists: false },
                documentCategory: { $nin: ['cancellation_confirmation'] }
              },
              {
                expiryDate: null,
                gekuendigtZum: { $exists: false },
                documentCategory: { $nin: ['cancellation_confirmation'] }
              }
            ]
          });
          // Nicht gekündigt
          mongoFilter.$and.push({
            $or: [
              { gekuendigtZum: { $exists: false } },
              { gekuendigtZum: null }
            ]
          });
          mongoFilter.$and.push({
            $or: [
              { documentCategory: { $exists: false } },
              { documentCategory: { $nin: ['cancellation_confirmation'] } }
            ]
          });
          break;
        case 'bald_ablaufend':
          // Bald ablaufend = Ablaufdatum in den nächsten 30 Tagen (und > heute)
          mongoFilter.expiryDate = {
            $gt: today,
            $lte: in30Days
          };
          // Nicht bereits gekündigt
          mongoFilter.$and = mongoFilter.$and || [];
          mongoFilter.$and.push({
            $or: [
              { gekuendigtZum: { $exists: false } },
              { gekuendigtZum: null }
            ]
          });
          break;
        case 'abgelaufen':
          // Abgelaufen/Beendet = Ablaufdatum in der Vergangenheit ODER gekuendigtZum in der Vergangenheit
          mongoFilter.$or = [
            { expiryDate: { $lt: today } },
            { gekuendigtZum: { $lt: today } }
          ];
          break;
        case 'gekündigt':
          // Gekündigt = documentCategory ist cancellation_confirmation ODER gekuendigtZum gesetzt (aber noch nicht vorbei)
          mongoFilter.$or = [
            { documentCategory: 'cancellation_confirmation' },
            {
              gekuendigtZum: { $exists: true, $ne: null, $gte: today }
            }
          ];
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
          mongoFilter['legalPulse.riskScore'] = { $gt: 60, $lte: 80 };
          break;
        case 'critical':
          mongoFilter['legalPulse.riskScore'] = { $gt: 80 };
          break;
      }
    }

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
      case 'status_asc':
        sortOptions = { status: 1 };
        break;
      case 'status_desc':
        sortOptions = { status: -1 };
        break;
      case 'qf0_asc':
        sortOptions = { 'quickFacts.0.value': 1 };
        break;
      case 'qf0_desc':
        sortOptions = { 'quickFacts.0.value': -1 };
        break;
      case 'qf1_asc':
        sortOptions = { 'quickFacts.1.value': 1 };
        break;
      case 'qf1_desc':
        sortOptions = { 'quickFacts.1.value': -1 };
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

    // 🚀 OPTIMIERT: Batch-Queries statt Aggregation
    const _t4 = Date.now();
    const { contracts: enrichedContracts, totalCount, _enrichTiming } = await enrichContractsWithAggregation(mongoFilter, sortOptions, skip, limit);
    const _t5 = Date.now();

    // ✅ Response mit Pagination-Info + Timing
    const _timing = {
      ensureDb: (_t1 - _t0) + 'ms',
      orgCheck: (_t3 - _t2) + 'ms',
      enrichment: (_t5 - _t4) + 'ms',
      total: (_t5 - _t0) + 'ms',
      enrichDetail: _enrichTiming
    };
    console.log('[PERF] GET /contracts:', JSON.stringify(_timing));

    res.json({
      contracts: enrichedContracts,
      pagination: {
        total: totalCount,
        limit: limit || totalCount,
        skip: skip,
        hasMore: skip + enrichedContracts.length < totalCount
      },
      _timing
    });
  } catch (err) {
    console.error("❌ Fehler beim Laden der Verträge:", err.message);
    res.status(500).json({ message: "Fehler beim Abrufen der Verträge." });
  }
});

/**
 * GET /api/contracts/diagnostics
 * 🔍 Diagnose-Endpoint: Misst exakte Ladezeiten für einzelne Schritte
 */
router.get('/diagnostics', verifyToken, async (req, res) => {
  try {
    await ensureDb();
    const userId = new ObjectId(req.user.userId);
    const results = {};

    // Test 1: Ping (Netzwerk-Roundtrip zu MongoDB)
    let t = Date.now();
    await _db.command({ ping: 1 });
    results.ping = (Date.now() - t) + 'ms';

    // Test 2: Count (nur Index, keine Dokumente lesen)
    t = Date.now();
    const count = await contractsCollection.countDocuments({ userId });
    results.count = { time: (Date.now() - t) + 'ms', total: count };

    // Test 3: Nur _id + name laden (minimal, ~100 bytes pro Dokument)
    t = Date.now();
    const minimal = await contractsCollection.find({ userId }, { projection: { name: 1 } }).toArray();
    results.findMinimal = { time: (Date.now() - t) + 'ms', docs: minimal.length };

    // Test 4: 32 Felder laden (unsere Inclusion Projection)
    t = Date.now();
    const projected = await contractsCollection.find({ userId }, { projection: {
      name: 1, status: 1, createdAt: 1, expiryDate: 1, contractScore: 1,
      summary: 1, risiken: 1, quickFacts: 1, analyzed: 1, s3Key: 1,
      analysisId: 1, analysis: 1, importantDates: 1, suggestions: 1
    }}).toArray();
    const projectedSize = JSON.stringify(projected).length;
    results.findProjected = { time: (Date.now() - t) + 'ms', docs: projected.length, sizeKB: Math.round(projectedSize / 1024) };

    // Test 5: ALLES laden (ohne Projection — zeigt echte Dokument-Größe)
    t = Date.now();
    const full = await contractsCollection.find({ userId }).toArray();
    const fullSize = JSON.stringify(full).length;
    results.findFull = { time: (Date.now() - t) + 'ms', docs: full.length, sizeKB: Math.round(fullSize / 1024) };

    // Test 6: Collection-Stats
    t = Date.now();
    const stats = await _db.command({ collStats: "contracts" });
    results.collectionStats = {
      time: (Date.now() - t) + 'ms',
      totalDocs: stats.count,
      totalSizeMB: Math.round(stats.size / 1024 / 1024 * 10) / 10,
      avgDocSizeKB: Math.round(stats.avgObjSize / 1024 * 10) / 10,
      indexCount: Object.keys(stats.indexSizes || {}).length
    };

    // Test 7: Analysis Collection Stats
    const analysisStats = await _db.command({ collStats: "analyses" });
    results.analysisStats = {
      totalDocs: analysisStats.count,
      totalSizeMB: Math.round(analysisStats.size / 1024 / 1024 * 10) / 10,
      avgDocSizeKB: Math.round(analysisStats.avgObjSize / 1024 * 10) / 10
    };

    // Test 8: Events Collection Stats
    const eventsStats = await _db.command({ collStats: "contract_events" });
    results.eventsStats = {
      totalDocs: eventsStats.count,
      totalSizeMB: Math.round(eventsStats.size / 1024 / 1024 * 10) / 10
    };

    // Zusammenfassung
    results.summary = {
      userContracts: count,
      userDataSizeKB: Math.round(fullSize / 1024),
      projectedDataSizeKB: Math.round(projectedSize / 1024),
      reductionPercent: Math.round((1 - projectedSize / fullSize) * 100) + '%',
      avgDocSizeKB: Math.round(fullSize / count / 1024)
    };

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/contracts/names
 * 🚀 ULTRA-SCHNELL: Nur Vertrags-IDs und Namen laden (für Dropdowns)
 * Keine Enrichment, keine Pagination - nur das Nötigste!
 */
router.get('/names', verifyToken, async (req, res) => {
  try {
    await ensureDb();
    const userId = new ObjectId(req.user.userId);

    // Nur _id und name mit Projection - super schnell!
    const contracts = await contractsCollection
      .find(
        { userId },
        {
          projection: { _id: 1, name: 1 },
          sort: { name: 1 } // Alphabetisch sortiert
        }
      )
      .toArray();


    res.json({
      success: true,
      contracts: contracts.map(c => ({
        _id: c._id.toString(),
        name: c.name || 'Unbenannter Vertrag'
      }))
    });
  } catch (err) {
    console.error("❌ Fehler beim Laden der Vertragsnamen:", err.message);
    res.status(500).json({ success: false, message: "Fehler beim Laden" });
  }
});

/**
 * GET /api/contracts/debug-company-profile
 * Debug-Route um Company Profile Daten zu prüfen
 * WICHTIG: Muss VOR /:id Route stehen!
 */
router.get('/debug-company-profile', verifyToken, async (req, res) => {
  try {
    await ensureDb();
    // WICHTIG: req.db verwenden (gleiche Connection wie companyProfile.js)
    const db = req.db || await database.connect();
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
    await ensureDb();
    const { id } = req.params;

    // 👥 Org-Zugriff: eigene + Org-Verträge (alle Rollen dürfen lesen)
    const access = await findContractWithOrgAccess(contractsCollection, req.user.userId, id);

    if (!access) {
      return res.status(404).json({
        message: "Vertrag nicht gefunden",
        error: "Contract not found"
      });
    }

    const enrichedContract = await enrichContractWithAnalysis(access.contract);


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
    await ensureDb();
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


    // ✅ NEU: Provider Detection
    let detectedProvider = provider;
    let extractedDetails = { contractNumber, customerNumber };

    if (!provider && content) {
      // Try to detect provider from content
      detectedProvider = detectProvider(content, name);

      // Extract contract details
      extractedDetails = extractContractDetails(content);
    }

    // 👥 Team-Management: Prüfe ob User zu einer Organisation gehört
    const membership = await OrganizationMember.findOne({
      userId: new ObjectId(req.user.userId),
      isActive: true
    });

    const contractDoc = {
      userId: new ObjectId(req.user.userId),
      organizationId: membership ? membership.organizationId : null, // 👥 Org-Zugehörigkeit
      name: fixUtf8Encoding(name) || "Unbekannter Vertrag",
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


    // 🎓 Onboarding: firstContractUploaded automatisch auf true setzen
    await updateOnboardingChecklist(req.user.userId, 'firstContractUploaded');

    // ✅ NEU: Calendar Events generieren
    try {
      const fullContract = { ...contractDoc, _id: contractId };
      await onContractChange(await database.connect(), fullContract, "create");
    } catch (eventError) {
      // Fehler nicht werfen - Contract wurde trotzdem gespeichert
    }

    // 🧠 LEGAL LENS: GPT-Klausel-Parsing im Hintergrund (für sofortiges Legal Lens laden)
    // Läuft async - blockiert die Response nicht
    preprocessContract(contractId.toString()).then(result => {
      if (result.success) {
      } else if (!result.alreadyProcessed) {
      }
    }).catch(err => {
      console.error(`❌ [Legal Lens] Vorverarbeitung Exception für ${name}:`, err);
    });

    // 🆕 AUTO-PDF: Für generierte Verträge automatisch PDF erstellen (React-PDF) und zu S3 hochladen
    if (isGenerated && content && content.length > 50) {
      try {
        const pdfResult = await generatePDFAndUploadToS3ForContract(
          contractId.toString(),
          req.user.userId,
          content,
          name,
          designVariant
        );
        if (pdfResult.success) {
          contractDoc.s3Key = pdfResult.s3Key;
        } else {
          console.error(`❌ [AUTO-PDF] Fehlgeschlagen für ${name}:`, pdfResult.error);
        }
      } catch (err) {
        console.error(`❌ [AUTO-PDF] Exception für ${name}:`, err);
      }
    }

    // 🔍 VECTOR EMBEDDING für Legal Pulse Monitoring (Background)
    if (content && content.trim().length > 50) {
      embedContractAsync(contractId.toString(), content, {
        userId: req.user.userId,
        contractName: name,
        contractType: contractType || 'unknown'
      });
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
    await ensureDb();
    const { id } = req.params;

    // 👥 Org-Zugriff + Rollen-Check (write)
    const access = await findContractWithOrgAccess(contractsCollection, req.user.userId, id);
    if (!access) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }
    if (!hasPermission(access.role, "contracts.write")) {
      return res.status(403).json({ message: "Keine Berechtigung zum Bearbeiten (Viewer-Rolle)" });
    }

    const updateData = { ...req.body, updatedAt: new Date() };

    delete updateData.userId;
    delete updateData._id;

    // ✅ NEU: Provider Re-Detection wenn content aktualisiert wird
    if (updateData.content && !updateData.provider) {
      const detectedProvider = detectProvider(updateData.content, updateData.name);
      if (detectedProvider) {
        updateData.provider = detectedProvider;
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
      { _id: new ObjectId(id) },
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
          await onContractChange(await database.connect(), updatedContract, "update");
        }
      } catch (eventError) {
        console.warn('⚠️ [CALENDAR] Event update failed:', eventError.message);
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
    await ensureDb();
    const { id } = req.params;

    // 👥 Org-Zugriff + Rollen-Check (delete)
    const access = await findContractWithOrgAccess(contractsCollection, req.user.userId, id);
    if (!access) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }
    if (!hasPermission(access.role, "contracts.delete")) {
      return res.status(403).json({ message: "Keine Berechtigung zum Löschen" });
    }

    // ✅ NEU: Zugehörige Events löschen
    try {
      await eventsCollection.deleteMany({
        contractId: new ObjectId(id)
      });
    } catch (eventError) {
      console.warn('⚠️ [CALENDAR] Event deletion failed:', eventError.message);
    }

    const result = await contractsCollection.deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }

    // 📋 Activity Log: Vertrag gelöscht
    try {
      const { logActivityStandalone, ActivityTypes } = require('../services/activityLogger');
      await logActivityStandalone({
        type: ActivityTypes.CONTRACT_DELETED,
        userId: req.user.userId,
        description: `Vertrag gelöscht: ${id}`,
        details: {
          contractId: id
        },
        severity: 'info',
        source: 'contracts'
      });
    } catch (logErr) {
      console.error("Activity Log Error:", logErr);
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
    await ensureDb();
    const { id } = req.params;

    // 👥 Org-Zugriff + Rollen-Check (write)
    const access = await findContractWithOrgAccess(contractsCollection, req.user.userId, id);
    if (!access) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }
    if (!hasPermission(access.role, "contracts.write")) {
      return res.status(403).json({ message: "Keine Berechtigung zum Bearbeiten (Viewer-Rolle)" });
    }

    const contract = access.contract;
    const newReminderStatus = !contract.reminder;

    const result = await contractsCollection.updateOne(
      { _id: new ObjectId(id) },
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
    await ensureDb();
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
    await ensureDb();
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
    await onContractChange(await database.connect(), contract, "update");
    
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
    await ensureDb();
    const { id } = req.params;
    const { paymentStatus, paymentDate, paymentDueDate, paymentAmount } = req.body;

    // 👥 Org-Zugriff + Rollen-Check (write)
    const access = await findContractWithOrgAccess(contractsCollection, req.user.userId, id);
    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Vertrag nicht gefunden"
      });
    }
    if (!hasPermission(access.role, "contracts.write")) {
      return res.status(403).json({ success: false, message: "Keine Berechtigung zum Bearbeiten (Viewer-Rolle)" });
    }

    const contract = access.contract;

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
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
    } else {
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
    await ensureDb();
    const { id } = req.params;
    const { paymentFrequency, subscriptionStartDate, baseAmount } = req.body;

    // 👥 Org-Zugriff + Rollen-Check (write)
    const access = await findContractWithOrgAccess(contractsCollection, req.user.userId, id);
    if (!access) {
      return res.status(404).json({
        success: false,
        message: "Vertrag nicht gefunden"
      });
    }
    if (!hasPermission(access.role, "contracts.write")) {
      return res.status(403).json({ success: false, message: "Keine Berechtigung zum Bearbeiten (Viewer-Rolle)" });
    }

    const contract = access.contract;

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
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.modifiedCount === 0) {
    } else {
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
    await ensureDb();
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

    // 👥 Org-Zugriff + Rollen-Check (write)
    const access = await findContractWithOrgAccess(contractsCollection, req.user.userId, id);
    if (!access) {
      return res.status(404).json({
        success: false,
        message: 'Vertrag nicht gefunden'
      });
    }
    if (!hasPermission(access.role, "contracts.write")) {
      return res.status(403).json({ success: false, message: "Keine Berechtigung zum Bearbeiten (Viewer-Rolle)" });
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
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    // Fetch updated contract
    const updatedContract = await contractsCollection.findOne({
      _id: new ObjectId(id)
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
    await ensureDb();
    const { id } = req.params;

    // 👥 Org-Zugriff + Rollen-Check (write)
    const access = await findContractWithOrgAccess(contractsCollection, req.user.userId, id);
    if (!access) {
      return res.status(404).json({
        message: "Vertrag nicht gefunden"
      });
    }
    if (!hasPermission(access.role, "contracts.write")) {
      return res.status(403).json({ message: "Keine Berechtigung zum Bearbeiten (Viewer-Rolle)" });
    }

    const contract = access.contract;
    
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

  try {
    await ensureDb();
    const { id } = req.params;

    // 👥 Org-Zugriff + Rollen-Check (write)
    const access = await findContractWithOrgAccess(contractsCollection, req.user.userId, id);
    if (!access) {
      return res.status(404).json({
        success: false,
        message: 'Vertrag nicht gefunden'
      });
    }
    if (!hasPermission(access.role, "contracts.write")) {
      return res.status(403).json({ success: false, message: "Keine Berechtigung zum Analysieren (Viewer-Rolle)" });
    }

    const contract = access.contract;

    // Check if already analyzed
    if (contract.analyzed !== false) {
      return res.status(400).json({
        success: false,
        message: 'Vertrag wurde bereits analysiert'
      });
    }


    // ===== READ PDF FILE =====
    let buffer;

    if (contract.s3Key && S3_AVAILABLE && s3Instance && GetObjectCommand) {
      // Read from S3

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

      if (!fsSync.existsSync(localPath)) {
        console.error(`❌ [${requestId}] Local file not found: ${localPath}`);
        return res.status(404).json({
          success: false,
          message: 'Datei nicht gefunden. Bitte erneut hochladen.'
        });
      }

      try {
        buffer = await fs.readFile(localPath);
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
    let pdfData;

    try {
      pdfData = await pdfParse(buffer);
    } catch (parseError) {
      console.error(`❌ [${requestId}] PDF parse error:`, parseError);
      return res.status(400).json({
        success: false,
        message: 'PDF konnte nicht gelesen werden'
      });
    }

    const fullTextContent = pdfData.text;


    // ===== 🆕 CONTRACT ANALYZER (v10) =====

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

      } else {
      }
    } catch (analyzerError) {
      console.error(`❌ [${requestId}] Contract Analyzer error:`, analyzerError.message);
    }

    // ===== GPT-4 ANALYSIS V2 =====

    // 🚀 V2: Use new deep lawyer-level prompt
    const documentType = providerAnalysis?.data?.contractType || 'other';
    const analysisPrompt = generateDeepLawyerLevelPrompt(
      fullTextContent,
      documentType,
      'deep-lawyer-level',
      requestId
    );


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

      // Parse JSON from response
      const jsonStart = responseText.indexOf("{");
      const jsonEnd = responseText.lastIndexOf("}") + 1;
      const jsonText = responseText.substring(jsonStart, jsonEnd);

      analysisResult = JSON.parse(jsonText);

    } catch (gptError) {
      console.error(`❌ [${requestId}] GPT-4 analysis error:`, gptError);
      return res.status(500).json({
        success: false,
        message: 'KI-Analyse fehlgeschlagen'
      });
    }

    // 🔧 FIX: Override extractedEndDate from AI importantDates if available (more accurate than regex)
    const aiEndDate = extractEndDateFromImportantDates(analysisResult.importantDates);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (aiEndDate) {
      extractedEndDate = aiEndDate;
      extractedEndDateConfidence = 95; // AI is more reliable
      extractedDataSource = 'ai_importantDates';
    } else if (extractedEndDate && new Date(extractedEndDate) < today) {
      // 🛡️ PLAUSIBILITY CHECK: Regex date in past but AI found nothing - clear it!
      extractedEndDate = null;
      extractedEndDateConfidence = 0;
      extractedDataSource = 'cleared_implausible';
    }

    // ===== UPDATE CONTRACT IN DATABASE =====

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
      analyzedAt: new Date(), // 🔧 FIX: Zeitpunkt der Analyse für Status-Berechnung
      updatedAt: new Date(),
      importantDates: analysisResult.importantDates || [], // 🔧 FIX: KI-extrahierte Daten speichern
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


    // 💳 Log Payment Detection
    if (analysisResult.contractType || analysisResult.paymentAmount) {
    }

    // 🆕 FIXED: Trigger calendar event generation mit korrektem Contract-Objekt
    try {
      // Hole das AKTUALISIERTE Contract-Objekt aus der DB
      const updatedContract = await contractsCollection.findOne({ _id: new ObjectId(id) });

      if (updatedContract) {
        await onContractChange(await database.connect(), updatedContract, "update");
      } else {
      }
    } catch (calError) {
      console.error(`❌ [${requestId}] Calendar update error:`, calError.message);
    }

    // ⚡ LEGAL PULSE: Create initial legalPulse from analysis results (synchronous)
    // This ensures Legal Pulse has data immediately, before the async deep-analysis runs
    const contractScoreRaw = analysisResult.contractScore || 0;
    // contractScore is quality (0-100, higher=better), riskScore is risk (0-100, higher=worse)
    const initialRiskScore = Math.max(0, Math.min(100, 100 - contractScoreRaw));
    const AILegalPulse = require('../services/aiLegalPulse');
    const aiLegalPulseInstance = new AILegalPulse();
    const initialHealthScore = aiLegalPulseInstance.calculateHealthScore(initialRiskScore, { uploadedAt: new Date() });

    // Map criticalIssues to topRisks format
    const initialTopRisks = (analysisResult.criticalIssues || []).map(issue => ({
      title: issue.title || 'Kritischer Punkt',
      description: issue.description || '',
      severity: issue.impact === 'high' || issue.severity === 'high' ? 'high' : 'medium',
      impact: issue.impact || '',
      solution: issue.recommendation || issue.action || ''
    }));

    // Map recommendations to recommendation objects
    const initialRecommendations = (analysisResult.recommendations || []).map(rec => {
      if (typeof rec === 'string') {
        return { title: rec, description: rec, priority: 'medium', effort: 'mittel', impact: 'mittel' };
      }
      return rec;
    });

    const initialLegalPulse = {
      riskScore: initialRiskScore,
      healthScore: initialHealthScore,
      summary: Array.isArray(analysisResult.summary) ? analysisResult.summary.join(' ') : (analysisResult.summary || ''),
      lastChecked: new Date(),
      analysisDate: new Date(),
      topRisks: initialTopRisks,
      recommendations: initialRecommendations,
      riskFactors: (analysisResult.risiken || []).map(r => typeof r === 'string' ? r : r.title || r.description || ''),
      lawInsights: (analysisResult.legalPulseHooks || []).slice(0, 5),
      marketSuggestions: [],
      scoreHistory: [{ date: new Date(), score: initialRiskScore }],
      analysisHistory: [{
        date: new Date(),
        riskScore: initialRiskScore,
        healthScore: initialHealthScore,
        changes: ['Initiale Analyse aus Vertragsanalyse abgeleitet'],
        triggeredBy: 'contract_analysis'
      }],
      aiGenerated: true,  // Data comes from real AI contract analysis
      status: 'synced'    // Initial sync complete, deep Legal Pulse analysis may follow
    };

    await contractsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { legalPulse: initialLegalPulse } }
    );

    (async () => {
      const maxRetries = 1;
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const contract = await contractsCollection.findOne({ _id: new ObjectId(id) });
          let fullTextContent = contract.fullText || contract.content || '';

          if ((!fullTextContent || fullTextContent.length < 100) && contract.s3Key && S3_AVAILABLE && s3Instance && GetObjectCommand) {
            try {
              const command = new GetObjectCommand({
                Bucket: process.env.S3_BUCKET_NAME,
                Key: contract.s3Key,
              });
              const response = await s3Instance.send(command);
              const chunks = [];
              for await (const chunk of response.Body) {
                chunks.push(chunk);
              }
              const buffer = Buffer.concat(chunks);
              const pdfData = await pdfParse(buffer);
              fullTextContent = pdfData.text || '';

              if (fullTextContent.length > 100) {
                await contractsCollection.updateOne(
                  { _id: new ObjectId(id) },
                  { $set: { fullText: fullTextContent } }
                );
              }
            } catch (s3Error) {
              console.error(`[${requestId}] S3 text extraction failed:`, s3Error.message);
            }
          }

          if (fullTextContent && fullTextContent.length > 100) {
            const contractInfo = {
              name: contract.name,
              provider: contract.provider?.displayName || analysisResult.provider || 'Unknown',
              type: analysisResult.contractType || 'other',
              startDate: contract.startDate,
              expiryDate: contract.expiryDate
            };

            const rawAnalysis = await aiLegalPulse.analyzeFullContract(
              fullTextContent,
              contractInfo
            );

            // analyzeFullContract returns raw parsed AI response - enrich with required fields
            const analysisRiskScore = Math.min(100, Math.max(0, rawAnalysis.riskScore || 50));
            const analysisHealthScore = aiLegalPulse.calculateHealthScore(analysisRiskScore, contract);

            const legalPulseAnalysis = {
              ...rawAnalysis,
              riskScore: analysisRiskScore,
              healthScore: analysisHealthScore,
              lastChecked: new Date(),
              analysisDate: new Date(),
              aiGenerated: true,
              lawInsights: rawAnalysis.lawInsights || [],
              marketSuggestions: rawAnalysis.marketSuggestions || [],
            };

            // Preserve scoreHistory/analysisHistory from initial sync analysis
            const currentContract = await contractsCollection.findOne({ _id: new ObjectId(id) });
            const existingHistory = currentContract?.legalPulse?.scoreHistory || [];
            const existingAnalysisHistory = currentContract?.legalPulse?.analysisHistory || [];

            legalPulseAnalysis.status = 'completed';
            // Merge histories: keep initial + add new
            legalPulseAnalysis.scoreHistory = [
              ...existingHistory,
              { date: new Date(), score: analysisRiskScore }
            ];
            legalPulseAnalysis.analysisHistory = [
              ...existingAnalysisHistory,
              {
                date: new Date(),
                riskScore: analysisRiskScore,
                healthScore: analysisHealthScore,
                changes: ['Vollständige KI-Analyse abgeschlossen'],
                triggeredBy: 'ai_analysis'
              }
            ];

            await contractsCollection.updateOne(
              { _id: new ObjectId(id) },
              {
                $set: {
                  legalPulse: legalPulseAnalysis,
                  legalPulseLastChecked: new Date()
                }
              }
            );
          }
          break; // Success
        } catch (analysisError) {
          if (attempt >= maxRetries) {
            console.error(`[${requestId}] Legal Pulse analysis failed after ${attempt + 1} attempts:`, analysisError.message);
            await contractsCollection.updateOne(
              { _id: new ObjectId(id) },
              { $set: { 'legalPulse.status': 'failed' } }
            ).catch(() => {});
          }
        }
      }
    })();

    // ✅ NEU: Hole den vollständig aktualisierten Contract für Frontend
    const finalContract = await contractsCollection.findOne({ _id: new ObjectId(id) });

    // Ensure analysis is in the response (MongoDB timing edge case)
    if (finalContract && !finalContract.analysis) {
      finalContract.analysis = analysisObject;
    }

    // Onboarding: firstAnalysisComplete automatisch auf true setzen
    try {
      await usersCollection.updateOne(
        { _id: new ObjectId(req.user.userId) },
        {
          $set: {
            'onboarding.checklist.firstAnalysisComplete': true,
            updatedAt: new Date()
          }
        }
      );
    } catch (onboardingErr) {
      console.warn('⚠️ [ONBOARDING] Checklist update failed:', onboardingErr.message);
    }

    res.json({
      success: true,
      message: 'Analyse erfolgreich abgeschlossen',
      contractId: id,
      analysis: analysisResult,
      contract: finalContract,
      legalPulseStatus: 'pending'
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
    await ensureDb();
    const { contractIds, folderId } = req.body;

    // 🔍 DEBUG LOGGING

    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return res.status(400).json({ error: "Keine Verträge ausgewählt" });
    }

    // Validate all contract IDs
    const validIds = contractIds.filter(id => {
      const isValid = ObjectId.isValid(id);
      return isValid;
    });


    if (validIds.length === 0) {
      return res.status(400).json({ error: "Ungültige Vertrags-IDs" });
    }

    // Validate folderId if provided
    if (folderId && !ObjectId.isValid(folderId)) {
      return res.status(400).json({ error: "Ungültige Ordner-ID" });
    }

    const db = await database.connect();
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
    await ensureDb();
    const { folderId } = req.body; // Can be null to remove from folder
    const contractId = req.params.id;

    // 🔍 DEBUG LOGGING

    if (!ObjectId.isValid(contractId)) {
      return res.status(400).json({ error: "Ungültige Vertrags-ID" });
    }

    // Validate folderId if provided
    if (folderId && !ObjectId.isValid(folderId)) {
      return res.status(400).json({ error: "Ungültige Ordner-ID" });
    }

    const db = await database.connect();
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
    await ensureDb();
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
    await ensureDb();
    const {
      recipientEmail,  // z.B. "u_123abc.def456@upload.contract-ai.de"
      senderEmail,     // Absender
      subject,         // Betreff
      bodyText,        // E-Mail Text
      attachments,     // Array von { filename, contentType, data: base64 }
      messageId        // SES Message ID (für Idempotenz)
    } = req.body;


    // Validierung
    if (!recipientEmail || !senderEmail || !messageId) {
      return res.status(400).json({
        success: false,
        message: "Fehlende Pflichtfelder: recipientEmail, senderEmail, messageId"
      });
    }

    // 1. User anhand E-Mail-Adresse finden
    const db = await database.connect();
    const usersCollection = db.collection("users");
    const contractsCollection = db.collection("contracts");

    // 🔍 DEBUG: Detaillierte Logs

    const user = await usersCollection.findOne({
      emailInboxAddress: recipientEmail,
      emailInboxEnabled: true
    });


    if (!user) {
      // 🔍 Erweiterte Fehlersuche: Gibt es den User mit dieser Adresse OHNE emailInboxEnabled?
      const userWithoutEnabled = await usersCollection.findOne({
        emailInboxAddress: recipientEmail
      });


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


    // Rate Limit überschritten?
    if (recentImports.length >= rateLimit.limit) {

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
            subject: "Contract AI - Upload-Limit erreicht",
            html: emailHtml
          });

          // Timestamp speichern (async, ohne auf Erfolg zu warten)
          usersCollection.updateOne(
            { _id: user._id },
            { $set: { lastRateLimitEmailSent: new Date() } }
          ).catch(err => console.error("❌ Fehler beim Speichern von lastRateLimitEmailSent:", err));

        } catch (emailError) {
          console.error(`❌ Fehler beim Senden der Rate-Limit Email:`, emailError.message);
          // Fehler nicht nach außen werfen - Rate Limit Response soll trotzdem gesendet werden
        }
      } else {
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


        // Contract-Dokument erstellen
        const newContract = {
          userId: user._id,
          name: fixUtf8Encoding(sanitizedFilename.replace('.pdf', '')),
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


        // 🎓 Onboarding: firstContractUploaded automatisch auf true setzen (bei erstem Import)
        if (importedContracts.filter(c => !c.duplicate).length === 1) {
          try {
            await usersCollection.updateOne(
              { _id: user._id },
              {
                $set: {
                  'onboarding.checklist.firstContractUploaded': true,
                  updatedAt: new Date()
                }
              }
            );
          } catch (onboardingErr) {
            console.warn('⚠️ [ONBOARDING] Checklist update failed:', onboardingErr.message);
          }
        }

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
          subject: `Contract AI - ${successCount} ${successCount === 1 ? 'Vertrag' : 'Vertraege'} importiert`,
          html: successEmailHtml
        });

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
          subject: `Contract AI - Import-Status`,
          html: errorEmailHtml
        });

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
    await ensureDb();
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
    await ensureDb();
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
    await ensureDb();
    const { id } = req.params;
    const { reminderDays, reminderSettings } = req.body;
    const userId = new ObjectId(req.user.userId);

    // New format: reminderSettings array
    if (reminderSettings && Array.isArray(reminderSettings)) {
      // Validate each setting
      for (const setting of reminderSettings) {
        if (!['expiry', 'cancellation', 'custom'].includes(setting.type)) {
          return res.status(400).json({
            success: false,
            error: `Ungültiger Reminder-Typ: ${setting.type}. Erlaubt: expiry, cancellation, custom`
          });
        }
        if (setting.type !== 'custom' && (!Number.isInteger(setting.days) || setting.days <= 0)) {
          return res.status(400).json({
            success: false,
            error: "Für expiry/cancellation muss 'days' eine positive Ganzzahl sein"
          });
        }
        if (setting.type === 'custom' && !setting.targetDate) {
          return res.status(400).json({
            success: false,
            error: "Für custom-Reminder muss 'targetDate' angegeben werden"
          });
        }
      }

      // Extract expiry-type days for backward compatibility
      const compatReminderDays = reminderSettings
        .filter(s => s.type === 'expiry')
        .map(s => s.days)
        .sort((a, b) => a - b);

      // Update contract
      const result = await req.db.collection("contracts").findOneAndUpdate(
        { _id: new ObjectId(id), userId },
        {
          $set: {
            reminderSettings: reminderSettings,
            reminderDays: compatReminderDays,
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

      await req.db.collection("contract_events").deleteMany({
        contractId: new ObjectId(id),
        userId
      });

      const events = await generateEventsForContract(req.db, result);

      return res.json({
        success: true,
        message: "Reminder-Einstellungen aktualisiert",
        reminderSettings,
        reminderDays: compatReminderDays,
        eventsGenerated: events.length
      });
    }

    // Legacy format: reminderDays array
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
          reminderDays: reminderDays.sort((a, b) => a - b),
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

    await req.db.collection("contract_events").deleteMany({
      contractId: new ObjectId(id),
      userId
    });

    const events = await generateEventsForContract(req.db, result);

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
    await ensureDb();
    const { id } = req.params;
    const { pdfBase64 } = req.body;


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
    await ensureDb();
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

    // 🔒 ENTERPRISE-CHECK: Nur Enterprise-User
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: "Benutzer nicht gefunden" });
    }

    const plan = user.subscriptionPlan || "free";
    if (!isEnterpriseOrHigher(plan)) {
      return res.status(403).json({
        success: false,
        message: "⛔ Bulk-Operationen sind nur im Enterprise-Plan verfügbar.",
        requiresUpgrade: true,
        feature: "bulk_operations",
        upgradeUrl: "/pricing",
        userPlan: plan
      });
    }

    // 👥 Org-Zugriff + Rollen-Check (delete)
    const orgFilter = await buildOrgFilter(userId);
    const membership = orgFilter._membership;
    delete orgFilter._membership;
    const role = membership ? membership.role : "owner";
    if (!hasPermission(role, "contracts.delete")) {
      return res.status(403).json({ success: false, message: "Keine Berechtigung zum Löschen" });
    }

    // IDs zu ObjectId konvertieren
    const objectIds = contractIds.map(id => new ObjectId(id));

    // 1️⃣ Calendar Events löschen (für alle Verträge)
    try {
      const eventsResult = await eventsCollection.deleteMany({
        contractId: { $in: objectIds }
      });
    } catch (eventError) {
      console.warn('⚠️ [CALENDAR] Bulk event deletion failed:', eventError.message);
    }

    // 2️⃣ Verträge löschen (nur eigene + Org-Verträge)
    const deleteFilter = {
      _id: { $in: objectIds },
      ...orgFilter
    };
    const result = await contractsCollection.deleteMany(deleteFilter);


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
    await ensureDb();
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

    // 🔒 ENTERPRISE-CHECK: Nur Enterprise-User
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ success: false, message: "Benutzer nicht gefunden" });
    }

    const plan = user.subscriptionPlan || "free";
    if (!isEnterpriseOrHigher(plan)) {
      return res.status(403).json({
        success: false,
        message: "⛔ Bulk-Operationen sind nur im Enterprise-Plan verfügbar.",
        requiresUpgrade: true,
        feature: "bulk_operations",
        upgradeUrl: "/pricing",
        userPlan: plan
      });
    }

    // 👥 Org-Zugriff + Rollen-Check (write)
    const orgFilter = await buildOrgFilter(userId);
    const membership = orgFilter._membership;
    delete orgFilter._membership;
    const role = membership ? membership.role : "owner";
    if (!hasPermission(role, "contracts.write")) {
      return res.status(403).json({ success: false, message: "Keine Berechtigung zum Verschieben (Viewer-Rolle)" });
    }

    // IDs zu ObjectId konvertieren
    const objectIds = contractIds.map(id => new ObjectId(id));

    // Optional: Folder-Existenz prüfen (wenn targetFolderId gesetzt)
    if (targetFolderId) {
      const foldersDb = await database.connect();
      const foldersCollection = foldersDb.collection("folders");
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

    // Verträge verschieben (eigene + Org-Verträge)
    const moveFilter = {
      _id: { $in: objectIds },
      ...orgFilter
    };
    const result = await contractsCollection.updateMany(
      moveFilter,
      {
        $set: {
          folderId: targetFolderId ? new ObjectId(targetFolderId) : null,
          updatedAt: new Date()
        }
      }
    );


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

// NOTE: generatePDFv2, generatePDFv3, loadPDFGenerators sind oben definiert (für Auto-PDF bei Vertragserstellung)

/**
 * POST /api/contracts/:id/pdf
 * Generiert PDF - Standard ist V2 (React-PDF)
 * Query-Parameter:
 *   - ?version=v2|v3 (default: v2)
 *   - ?design=executive|modern|minimal|elegant|corporate (default: executive)
 */
router.post('/:id/pdf', verifyToken, async (req, res) => {
  try {
    await ensureDb();
    await loadPDFGenerators();

    const version = req.query.version || 'v2';
    const designVariant = req.query.design || req.body.design || 'executive';
    const customDesign = req.body.customDesign || null;
    const contractId = req.params.id;

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
      const profileDb = await database.connect();
      companyProfile = await profileDb.collection("company_profiles").findOne({
        userId: new ObjectId(req.user.userId)
      });
    } catch (profileError) {
      console.warn('⚠️ [PROFILE] Company profile lookup failed:', profileError.message);
    }

    const parties = contract.formData || contract.parties || contract.metadata?.parties || {};
    const finalDesign = contract.designVariant || designVariant;
    // Custom Design: aus Request-Body ODER aus gespeichertem Vertrag
    const finalCustomDesign = customDesign || contract.customDesign || null;
    let pdfBuffer;

    // ✅ WICHTIG: Fallback für Vertragstext - wenn content leer ist, aus contractHTML extrahieren
    let contractText = contract.content;

    if (!contractText || contractText.length < 100) {
      if (contract.contractHTML && contract.contractHTML.length > 100) {
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
      } else {
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
      // V2: React-PDF (Standard) - mit Design-Variante, Contract-ID und Custom Design
      pdfBuffer = await generatePDFv2(
        contractText,
        companyProfile,
        contract.contractType || 'Vertrag',
        parties,
        contract.status === 'Entwurf',
        finalDesign,
        contractId,  // ✅ Contract-ID für QR-Code Verifizierung
        [],          // Attachments (noch nicht in dieser Route)
        finalCustomDesign  // ✅ Custom Design Konfiguration
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
    await ensureDb();
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

    // 🔧 KRITISCHER FIX: Flexible userId-Suche (String ODER ObjectId)
    // Verträge vom Optimizer werden mit userId als String gespeichert!
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      $or: [
        { userId: new ObjectId(req.user.userId) },
        { userId: req.user.userId }
      ]
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
      }
      const profileDb = db || await database.connect();

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
          } catch (s3Error) {
            console.warn('⚠️ [S3] Logo URL generation failed:', s3Error.message);
          }
        } else {
        }
      }

    } catch (profileError) {
      console.warn('⚠️ [PROFILE] Profile processing failed:', profileError.message);
    }

    // Parteien-Daten aus formData oder metadata extrahieren
    const parties = contract.formData || contract.parties || contract.metadata?.parties || {};

    // Design-Variante: aus Vertrag oder Query-Parameter
    const finalDesign = contract.designVariant || designVariant;

    // Custom Design: aus Request-Body oder aus gespeichertem Vertrag
    const customDesign = req.body.customDesign || contract.customDesign || null;

    // DEBUG: Alle verfügbaren Felder anzeigen

    // WARNUNG wenn kein Content
    if (!contract.content || contract.content.length < 100) {
    }

    // 🔧 FIX: Für optimierte Verträge den Text aus formData.optimizations generieren
    let contractText = contract.content;
    const hasOptimizations = contract.formData?.optimizations && contract.formData.optimizations.length > 0;

    if (hasOptimizations) {
      const optimizations = contract.formData.optimizations;

      // Strukturierten Vertragstext aus den Optimierungen aufbauen
      let generatedText = 'PRÄAMBEL\n\n';
      generatedText += 'Dieser Vertrag wurde professionell optimiert und enthält die folgenden rechtssicheren Klauseln:\n\n';

      // Paragraphen aus Optimierungen generieren
      optimizations.forEach((opt, index) => {
        const paragraphNum = index + 1;
        // Extrahiere den Titel aus der improved-Klausel (erste Zeile)
        const improvedText = opt.improved || '';
        const lines = improvedText.split('\n').filter(line => line.trim());
        const title = lines[0] || `Klausel ${paragraphNum}`;
        const content = lines.slice(1).join('\n') || improvedText;

        generatedText += `§ ${paragraphNum} ${title.toUpperCase()}\n\n`;
        generatedText += content + '\n\n';
      });

      // Schlussbestimmungen hinzufügen
      generatedText += `§ ${optimizations.length + 1} SCHLUSSBESTIMMUNGEN\n\n`;
      generatedText += '(1) Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform.\n\n';
      generatedText += '(2) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.\n\n';
      generatedText += '(3) Es gilt deutsches Recht.\n\n';

      contractText = generatedText;
    } else if (!contractText || contractText.length < 100) {
      if (contract.contractHTML && contract.contractHTML.length > 100) {
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
      }
    }

    // Anlagen aus Request-Body extrahieren (falls vorhanden)
    const attachments = req.body.attachments || [];
    const pageBreaks = req.body.pageBreaks || [];

    const pdfBuffer = await generatePDFv2(
      contractText,
      companyProfile,
      contract.contractType || 'Vertrag',
      parties,
      contract.status === 'Entwurf',
      finalDesign,
      contractId,  // Contract-ID für QR-Code Verifizierung
      attachments, // Anlagen für letzte Seite
      customDesign, // Custom Design Konfiguration
      pageBreaks   // Manuelle Seitenumbrüche
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${contract.name || 'Vertrag'}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);

    // 🔄 Auto-S3-Cache: Wenn noch kein s3Key vorhanden, PDF im Hintergrund auf S3 hochladen
    if (!contract.s3Key && S3_AVAILABLE && pdfBuffer) {
      (async () => {
        try {
          const timestamp = Date.now();
          const sanitizedName = (contract.name || 'vertrag').replace(/[^a-zA-Z0-9äöüÄÖÜß.\-]/g, '-');
          const s3Key = `contracts/${req.user.userId}/${sanitizedName}-${timestamp}.pdf`;

          await s3Instance.send(new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: pdfBuffer,
            ContentType: 'application/pdf',
            Metadata: { contractId, userId: req.user.userId, source: 'auto-cached' }
          }));

          await contractsCollection.updateOne(
            { _id: new ObjectId(contractId) },
            { $set: { s3Key, pdfUploaded: true, pdfUploadedAt: new Date(), pdfAutoGenerated: true } }
          );

          console.log(`✅ [PDF-V2] Auto-S3-Cache erfolgreich: ${s3Key}`);
        } catch (e) {
          console.error('⚠️ [PDF-V2] Auto-S3-Cache fehlgeschlagen:', e.message);
        }
      })();
    }

  } catch (error) {
    console.error('❌ [V2] PDF-Generierung fehlgeschlagen:', error);
    res.status(500).json({
      message: 'PDF-Generierung (V2/React-PDF) fehlgeschlagen',
      error: error.message
    });
  }
});

/**
 * POST /api/contracts/:id/pdf-combined
 * Generiert PDF mit Anlagen (kombiniertes PDF)
 * Anlagen werden als Base64 im Request-Body gesendet und ans Ende angehängt
 */
router.post('/:id/pdf-combined', verifyToken, async (req, res) => {
  try {
    await ensureDb();
    const { PDFDocument } = require('pdf-lib');
    await loadPDFGenerators();

    if (!generatePDFv2) {
      return res.status(503).json({
        message: 'PDF V2 Generator nicht verfügbar',
        error: 'React-PDF Modul konnte nicht geladen werden'
      });
    }

    const contractId = req.params.id;
    const designVariant = req.query.design || req.body.design || 'executive';
    const attachmentInfos = req.body.attachments || [];
    const attachmentFiles = req.body.attachmentFiles || []; // Base64-kodierte Dateien
    const pageBreaks = req.body.pageBreaks || [];


    // Vertrag laden
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(req.user.userId)
    });

    if (!contract) {
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    }

    // Company Profile laden
    let companyProfile = null;
    try {
      const db = req.db || await database.connect();
      const rawProfile = await db.collection("company_profiles").findOne({
        $or: [
          { userId: new ObjectId(req.user.userId) },
          { userId: req.user.userId }
        ]
      });

      if (rawProfile) {
        companyProfile = {
          ...rawProfile,
          zip: rawProfile.postalCode || rawProfile.zip || '',
          companyName: rawProfile.companyName || '',
          street: rawProfile.street || '',
          city: rawProfile.city || '',
          contactPhone: rawProfile.contactPhone || '',
          contactEmail: rawProfile.contactEmail || ''
        };

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
              Expires: 3600
            });
          } catch (s3Error) {
            console.warn('⚠️ [S3] Logo URL generation failed:', s3Error.message);
          }
        }
      }
    } catch (profileError) {
      console.warn('⚠️ [PROFILE] Company profile lookup failed:', profileError.message);
    }

    const parties = contract.formData || contract.parties || contract.metadata?.parties || {};
    const finalDesign = contract.designVariant || designVariant;
    const customDesign = req.body.customDesign || contract.customDesign || null;

    // 🔧 FIX: Für optimierte Verträge den Text aus formData.optimizations generieren
    // (gleiche Logik wie in pdf-v2!)
    let contractText = contract.content;
    const hasOptimizations = contract.formData?.optimizations && contract.formData.optimizations.length > 0;

    if (hasOptimizations) {
      const optimizations = contract.formData.optimizations;

      // Strukturierten Vertragstext aus den Optimierungen aufbauen
      let generatedText = 'PRÄAMBEL\n\n';
      generatedText += 'Dieser Vertrag wurde professionell optimiert und enthält die folgenden rechtssicheren Klauseln:\n\n';

      // Paragraphen aus Optimierungen generieren
      optimizations.forEach((opt, index) => {
        const paragraphNum = index + 1;
        const improvedText = opt.improved || '';
        const lines = improvedText.split('\n').filter(line => line.trim());
        const title = lines[0] || `Klausel ${paragraphNum}`;
        const content = lines.slice(1).join('\n') || improvedText;

        generatedText += `§ ${paragraphNum} ${title.toUpperCase()}\n\n`;
        generatedText += content + '\n\n';
      });

      // Schlussbestimmungen hinzufügen
      generatedText += `§ ${optimizations.length + 1} SCHLUSSBESTIMMUNGEN\n\n`;
      generatedText += '(1) Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform.\n\n';
      generatedText += '(2) Sollten einzelne Bestimmungen unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt.\n\n';
      generatedText += '(3) Es gilt deutsches Recht.\n\n';

      contractText = generatedText;
    } else if (!contractText || contractText.length < 100) {
      // Fallback für content
      if (contract.contractHTML && contract.contractHTML.length > 100) {
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
      }
    }

    // 1. Haupt-PDF generieren (mit Anlagen-Infos für die letzte Seite)
    const mainPdfBuffer = await generatePDFv2(
      contractText,
      companyProfile,
      contract.contractType || 'Vertrag',
      parties,
      contract.status === 'Entwurf',
      finalDesign,
      contractId,
      attachmentInfos,
      customDesign,
      pageBreaks
    );

    // 2. Wenn keine Anlagen-Dateien, direkt zurückgeben
    if (attachmentFiles.length === 0) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${contract.name || 'Vertrag'}_mit_Anlagen.pdf"`);
      res.setHeader('Content-Length', mainPdfBuffer.length);
      return res.send(mainPdfBuffer);
    }

    // 3. PDFs zusammenführen
    const mergedPdf = await PDFDocument.create();

    // Haupt-PDF laden und Seiten kopieren
    const mainDoc = await PDFDocument.load(mainPdfBuffer);
    const mainPages = await mergedPdf.copyPages(mainDoc, mainDoc.getPageIndices());
    mainPages.forEach(page => mergedPdf.addPage(page));

    // Anlagen hinzufügen
    for (const attachmentFile of attachmentFiles) {
      try {
        const { data, type, name } = attachmentFile;
        const fileBuffer = Buffer.from(data, 'base64');

        if (type === 'application/pdf' || name?.toLowerCase().endsWith('.pdf')) {
          // PDF-Anlage
          const attachmentDoc = await PDFDocument.load(fileBuffer);
          const attachmentPages = await mergedPdf.copyPages(attachmentDoc, attachmentDoc.getPageIndices());
          attachmentPages.forEach(page => mergedPdf.addPage(page));
        } else if (type?.startsWith('image/')) {
          // Bild-Anlage - als neue Seite hinzufügen
          const page = mergedPdf.addPage([595.28, 841.89]); // A4
          let image;

          if (type === 'image/png') {
            image = await mergedPdf.embedPng(fileBuffer);
          } else if (type === 'image/jpeg' || type === 'image/jpg') {
            image = await mergedPdf.embedJpg(fileBuffer);
          } else {
            continue;
          }

          // Bild skalieren, um auf die Seite zu passen
          const { width, height } = image.scale(1);
          const pageWidth = 595.28 - 60; // A4 width - margins
          const pageHeight = 841.89 - 60; // A4 height - margins
          const scale = Math.min(pageWidth / width, pageHeight / height);

          const scaledWidth = width * scale;
          const scaledHeight = height * scale;

          page.drawImage(image, {
            x: (595.28 - scaledWidth) / 2,
            y: (841.89 - scaledHeight) / 2,
            width: scaledWidth,
            height: scaledHeight,
          });
        } else {
        }
      } catch (attachmentError) {
        console.error(`❌ Fehler bei Anlage:`, attachmentError.message);
      }
    }

    const mergedPdfBytes = await mergedPdf.save();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${contract.name || 'Vertrag'}_mit_Anlagen.pdf"`);
    res.setHeader('Content-Length', mergedPdfBytes.length);
    res.send(Buffer.from(mergedPdfBytes));

  } catch (error) {
    console.error('❌ [Combined] PDF-Generierung fehlgeschlagen:', error);
    res.status(500).json({
      message: 'Kombinierte PDF-Generierung fehlgeschlagen',
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
    await ensureDb();
    await loadPDFGenerators();

    if (!generatePDFv3) {
      return res.status(503).json({
        message: 'PDF V3 Generator nicht verfügbar',
        error: 'Typst Modul konnte nicht geladen werden'
      });
    }

    const contractId = req.params.id;

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
      const profileDb = await database.connect();
      companyProfile = await profileDb.collection("company_profiles").findOne({
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
    await ensureDb();
    const contractId = req.params.id;

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