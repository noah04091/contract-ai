/**
 * Legal Lens API Routes
 *
 * Alle Endpunkte für die interaktive Vertragsanalyse.
 *
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/verifyToken');
const { MongoClient, ObjectId } = require('mongodb');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

// Services
const { clauseParser, clauseAnalyzer } = require('../services/legalLens');
const ClauseAnalysis = require('../models/ClauseAnalysis');
const LegalLensProgress = require('../models/LegalLensProgress');
const Contract = require('../models/Contract');
const pdfExtractor = require('../services/pdfExtractor');
const { generateAnalysisReport, getAvailableDesigns, getAvailableSections } = require('../services/legalLens/analysisReportGenerator');
const { generateChecklistPdf } = require('../services/legalLens/checklistPdfGenerator');

// AWS S3 für PDF-Extraktion
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI;

// Rate Limiting für KI-Analysen
const analysisRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 50, // 50 Anfragen pro 15 Minuten
  message: {
    success: false,
    error: 'Zu viele Anfragen. Bitte warten Sie einen Moment.',
    retryAfter: '15 minutes'
  },
  keyGenerator: (req) => req.user?.userId || req.ip
});

// ============================================
// CACHE CONFIGURATION (Phase 4: TTL + Version)
// ============================================

/**
 * Cache-Version: Erhöhe diese Nummer, wenn sich die Parsing-Logik ändert.
 * Alte Caches werden automatisch invalidiert und neu geparsed.
 */
const CACHE_VERSION = 2;

/**
 * Cache TTL in Millisekunden (30 Tage)
 * Nach Ablauf wird der Cache als abgelaufen betrachtet.
 */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Prüft ob der Cache noch gültig ist.
 * @param {Object} legalLens - Das legalLens-Objekt aus dem Contract
 * @param {boolean} forceRefresh - Force-Refresh Flag vom Request
 * @returns {{ valid: boolean, reason?: string }}
 */
function isCacheValid(legalLens, forceRefresh = false) {
  // Force-Refresh überschreibt alles
  if (forceRefresh) {
    return { valid: false, reason: 'force_refresh' };
  }

  // Keine Klauseln cached
  if (!legalLens?.preParsedClauses?.length) {
    return { valid: false, reason: 'no_cache' };
  }

  // Status nicht completed
  if (legalLens.preprocessStatus !== 'completed') {
    return { valid: false, reason: 'status_not_completed' };
  }

  // Cache-Version prüfen
  const cachedVersion = legalLens.metadata?.cacheVersion || 1;
  if (cachedVersion < CACHE_VERSION) {
    console.log(`🔄 [Cache] Version veraltet: ${cachedVersion} < ${CACHE_VERSION} - Cache wird invalidiert`);
    return { valid: false, reason: 'version_outdated' };
  }

  // TTL prüfen
  const preprocessedAt = legalLens.preprocessedAt;
  if (preprocessedAt) {
    const cacheAge = Date.now() - new Date(preprocessedAt).getTime();
    if (cacheAge > CACHE_TTL_MS) {
      const daysOld = Math.round(cacheAge / (24 * 60 * 60 * 1000));
      console.log(`⏰ [Cache] TTL abgelaufen: ${daysOld} Tage alt (max: 30 Tage) - Cache wird invalidiert`);
      return { valid: false, reason: 'ttl_expired', daysOld };
    }
  }

  return { valid: true };
}

/**
 * Gibt eine benutzerfreundliche Nachricht für den Cache-Status zurück.
 * @param {string} reason - Der Grund für die Cache-Invalidierung
 * @returns {string}
 */
function getCacheInvalidMessage(reason) {
  const messages = {
    force_refresh: 'Neu-Analyse angefordert - Klauseln werden frisch geparst.',
    no_cache: 'Keine Vorverarbeitung vorhanden - Klauseln werden geparst.',
    status_not_completed: 'Vorverarbeitung unvollständig - wird fortgesetzt.',
    version_outdated: 'Verbesserte Analyse verfügbar - Klauseln werden neu geparst.',
    ttl_expired: 'Cache abgelaufen - Klauseln werden aktualisiert.'
  };
  return messages[reason] || 'Klauseln werden geparst.';
}

// ============================================
// PDF LIMITS CONFIGURATION (Bug 2: Memory Protection)
// ============================================

/**
 * Maximale PDF-Dateigröße in Bytes (50 MB)
 * Schützt vor Memory-Überlastung bei sehr großen Dateien.
 */
const MAX_PDF_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

/**
 * Maximale Seitenanzahl für PDFs (200 Seiten)
 * Schützt vor extrem langen Dokumenten die den Server überlasten.
 */
const MAX_PDF_PAGES = 200;

/**
 * Validiert ein PDF gegen Größen- und Seitenlimits.
 * @param {Buffer} pdfBuffer - Der PDF-Buffer
 * @param {Object} extractionResult - Ergebnis der PDF-Extraktion (optional, für Seitenprüfung)
 * @returns {{ valid: boolean, error?: string, details?: object }}
 */
function validatePdfLimits(pdfBuffer, extractionResult = null) {
  const sizeInMB = (pdfBuffer.length / (1024 * 1024)).toFixed(2);

  // Größenlimit prüfen
  if (pdfBuffer.length > MAX_PDF_SIZE_BYTES) {
    console.warn(`⚠️ [PDF Limits] Datei zu groß: ${sizeInMB} MB (max: ${MAX_PDF_SIZE_BYTES / (1024 * 1024)} MB)`);
    return {
      valid: false,
      error: `Die PDF-Datei ist zu groß (${sizeInMB} MB). Maximal erlaubt sind 50 MB. Bitte laden Sie eine kleinere Datei hoch oder teilen Sie das Dokument auf.`,
      details: {
        sizeMB: parseFloat(sizeInMB),
        maxSizeMB: MAX_PDF_SIZE_BYTES / (1024 * 1024),
        reason: 'size_exceeded'
      }
    };
  }

  // Seitenlimit prüfen (wenn Extraktion bereits erfolgt)
  if (extractionResult?.quality?.pageCount > MAX_PDF_PAGES) {
    const pageCount = extractionResult.quality.pageCount;
    console.warn(`⚠️ [PDF Limits] Zu viele Seiten: ${pageCount} (max: ${MAX_PDF_PAGES})`);
    return {
      valid: false,
      error: `Das Dokument hat zu viele Seiten (${pageCount}). Maximal erlaubt sind ${MAX_PDF_PAGES} Seiten. Bitte laden Sie einen kürzeren Vertrag hoch oder teilen Sie das Dokument auf.`,
      details: {
        pageCount: pageCount,
        maxPages: MAX_PDF_PAGES,
        reason: 'pages_exceeded'
      }
    };
  }

  return {
    valid: true,
    details: {
      sizeMB: parseFloat(sizeInMB),
      pageCount: extractionResult?.quality?.pageCount || 0
    }
  };
}

// ============================================
// CLAUSE ANALYSIS CACHING (Bug 4: Hash-basiertes Caching)
// ============================================

/**
 * Generiert einen Hash für Klauseltext zur Cache-Identifikation.
 * Normalisiert den Text vorher (Whitespace, Lowercase).
 *
 * @param {string} clauseText - Der Klauseltext
 * @returns {string} SHA-256 Hash (erste 16 Zeichen)
 */
function generateClauseTextHash(clauseText) {
  if (!clauseText) return null;

  // Text normalisieren für konsistente Hashes
  const normalized = clauseText
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .substring(0, 16); // Kurzer Hash reicht
}

/**
 * Sucht eine gecachte Analyse anhand des Klausel-Hashes.
 * Ermöglicht Wiederverwendung von Analysen für identische Klauseln
 * über verschiedene Verträge hinweg.
 *
 * @param {string} clauseTextHash - Der Hash des Klauseltexts
 * @param {string} perspective - Die Perspektive (contractor/client/neutral)
 * @returns {Promise<Object|null>} Die gecachte Analyse oder null
 */
async function findCachedAnalysisByHash(clauseTextHash, perspective) {
  if (!clauseTextHash) return null;

  try {
    const cached = await ClauseAnalysis.findOne({
      clauseTextHash,
      [`perspectives.${perspective}.analyzedAt`]: { $exists: true }
    }).sort({ updatedAt: -1 }); // Neueste zuerst

    if (cached?.perspectives?.[perspective]) {
      console.log(`🔄 [Clause Cache] Hash-Match gefunden: ${clauseTextHash} → Perspektive ${perspective}`);
      return {
        analysis: cached.perspectives[perspective],
        originalContractId: cached.contractId,
        originalClauseId: cached.clauseId,
        analyzedAt: cached.perspectives[perspective].analyzedAt
      };
    }
  } catch (error) {
    console.warn(`⚠️ [Clause Cache] Hash-Lookup Fehler:`, error.message);
  }

  return null;
}

// ============================================
// BRANCHEN AUTO-ERKENNUNG
// ============================================

/**
 * Erkennt die Branche automatisch aus dem Vertragstext.
 * Verwendet Keyword-basierte Erkennung (schnell, kein API-Call).
 * @param {string} text - Der Vertragstext
 * @returns {{ industry: string, confidence: number, detectedKeywords: string[] }}
 */
function detectIndustryFromText(text) {
  const textLower = text.toLowerCase();

  // Branchen-Keywords mit Gewichtung
  const industryPatterns = {
    it_software: {
      keywords: [
        'software', 'saas', 'cloud', 'api', 'lizenz', 'quellcode', 'source code',
        'hosting', 'server', 'datenbank', 'app', 'application', 'entwicklung',
        'programmierung', 'it-dienstleistung', 'support-level', 'sla', 'uptime',
        'wartung', 'release', 'deployment', 'agil', 'scrum', 'sprint',
        'software-entwicklung', 'it-projekt', 'systemintegration', 'schnittstelle'
      ],
      weight: 1.5
    },
    construction: {
      keywords: [
        'bauleistung', 'bauvertrag', 'vob', 'bauherr', 'auftragnehmer', 'baustelle',
        'gewährleistung', 'mängelansprüche', 'abnahme', 'bauzeit', 'nachträge',
        'werkvertrag', 'schlüsselfertig', 'rohbau', 'ausbau', 'architekt',
        'statik', 'baugenehmigung', 'bauabnahme', 'baumängel', 'gewährleistungsfrist'
      ],
      weight: 1.8
    },
    real_estate: {
      keywords: [
        'immobilie', 'miete', 'mietvertrag', 'pacht', 'grundstück', 'eigentum',
        'kaufvertrag', 'notar', 'grundbuch', 'wohnfläche', 'nebenkosten',
        'kaution', 'makler', 'provision', 'vermietung', 'mietsache', 'mietobjekt',
        'wohnraum', 'gewerberaum', 'mietdauer', 'kündigungsfrist'
      ],
      weight: 1.5
    },
    consulting: {
      keywords: [
        'beratung', 'consulting', 'beratungsleistung', 'honorar', 'tagessatz',
        'projektberatung', 'unternehmensberatung', 'strategieberatung',
        'management consulting', 'berater', 'beratungsvertrag', 'mandate',
        'beratungsprojekt', 'analyse', 'empfehlung', 'gutachten',
        // Steuerberatung
        'steuerberatung', 'steuerberater', 'steuerberatungsvertrag', 'steuererklärung',
        'jahresabschluss', 'buchhaltung', 'finanzbuchhaltung', 'lohnbuchhaltung',
        'bilanz', 'gewinnermittlung', 'einnahmenüberschussrechnung', 'umsatzsteuer',
        'einkommensteuer', 'körperschaftsteuer', 'gewerbesteuer', 'steuerlich',
        'finanzamt', 'steuerbescheid', 'betriebsprüfung', 'wirtschaftsprüfer',
        'rechtsberatung', 'kanzlei', 'mandant'
      ],
      weight: 1.5  // Erhöht wegen spezifischer Keywords
    },
    manufacturing: {
      keywords: [
        'fertigung', 'produktion', 'liefervertrag', 'warenlieferung', 'herstellung',
        'serienproduktion', 'qualitätssicherung', 'spezifikation', 'technische daten',
        'muster', 'prototyp', 'stückzahl', 'mindestabnahme', 'produktionsanlage',
        'fertigungskapazität', 'materialien', 'rohstoffe'
      ],
      weight: 1.4
    },
    retail: {
      keywords: [
        'handel', 'vertrieb', 'distribution', 'händler', 'vertriebspartner',
        'wiederverkauf', 'einzelhandel', 'großhandel', 'handelsmarge',
        'exklusivvertrieb', 'verkaufsgebiet', 'absatz', 'umsatzbeteiligung',
        'franchise', 'markenrecht', 'warenzeichen'
      ],
      weight: 1.3
    },
    healthcare: {
      keywords: [
        'gesundheit', 'medizin', 'patient', 'arzt', 'klinik', 'krankenhaus',
        'medizinprodukt', 'pharma', 'arzneimittel', 'medikament', 'therapie',
        'behandlung', 'diagnose', 'gesundheitsleistung', 'krankenkasse',
        'zulassung', 'ce-kennzeichnung', 'klinische studie'
      ],
      weight: 1.6
    },
    finance: {
      keywords: [
        'darlehen', 'kredit', 'finanzierung', 'bank', 'zinsen', 'tilgung',
        'sicherheit', 'bürgschaft', 'hypothek', 'grundschuld', 'kapital',
        'investition', 'rendite', 'portfolio', 'wertpapier', 'anlage',
        'versicherung', 'police', 'prämie', 'leasing', 'factoring'
      ],
      weight: 1.5
    }
  };

  const results = {};
  const allDetectedKeywords = {};

  // Zähle Treffer pro Branche
  for (const [industry, config] of Object.entries(industryPatterns)) {
    const foundKeywords = config.keywords.filter(kw => textLower.includes(kw));
    const score = foundKeywords.length * config.weight;
    results[industry] = score;
    allDetectedKeywords[industry] = foundKeywords;
  }

  // Finde die Branche mit dem höchsten Score
  const sortedIndustries = Object.entries(results)
    .sort((a, b) => b[1] - a[1]);

  const [topIndustry, topScore] = sortedIndustries[0];
  const [secondIndustry, secondScore] = sortedIndustries[1] || ['', 0];

  // Berechne Confidence (0-100)
  // Hohe Confidence wenn: viele Keywords UND klarer Vorsprung vor zweiter Branche
  const confidence = topScore > 0
    ? Math.min(100, Math.round((topScore * 15) + ((topScore - secondScore) * 10)))
    : 0;

  // Mindest-Schwelle: mindestens 3 Keywords und confidence > 30
  if (topScore >= 3 && confidence > 30) {
    console.log(`🏢 [Industry Detection] Detected: ${topIndustry} (confidence: ${confidence}%, keywords: ${allDetectedKeywords[topIndustry].slice(0, 5).join(', ')})`);
    return {
      industry: topIndustry,
      confidence,
      detectedKeywords: allDetectedKeywords[topIndustry].slice(0, 10),
      allScores: results
    };
  }

  // Fallback: Allgemein
  console.log(`🏢 [Industry Detection] No clear industry detected, using 'general'`);
  return {
    industry: 'general',
    confidence: 0,
    detectedKeywords: [],
    allScores: results
  };
}

// ============================================
// SMART SUMMARY - SOFORT-ÜBERSICHT NACH UPLOAD
// ============================================

/**
 * POST /api/legal-lens/smart-summary
 *
 * Generiert eine Executive Summary sofort nach Upload.
 * Zeigt Top-3 Risiken, Gesamtbewertung und konkrete Handlungsempfehlungen.
 */
router.post('/smart-summary', verifyToken, async (req, res) => {
  try {
    const { contractId, stream = false } = req.body;
    const userId = req.user.userId;

    console.log(`📊 [Legal Lens] Smart Summary request for contract: ${contractId}`);

    if (!contractId) {
      return res.status(400).json({
        success: false,
        error: 'contractId ist erforderlich'
      });
    }

    // Vertrag aus Datenbank laden
    const contract = await Contract.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Vertrag nicht gefunden'
      });
    }

    // Text extrahieren - mehrere Fallbacks
    let text = contract.content || contract.extractedText || contract.fullText || contract.analysisText;

    // Fallback: Aus S3 extrahieren wenn kein Text vorhanden
    if ((!text || text.length < 50) && contract.s3Key) {
      console.log(`📥 [Legal Lens] Kein Text im Contract - extrahiere aus S3: ${contract.s3Key}`);

      try {
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: contract.s3Key
        });

        const response = await s3Client.send(command);
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        const pdfBuffer = Buffer.concat(chunks);

        // PDF-Größenlimit prüfen (vor Verarbeitung)
        const sizeValidation = validatePdfLimits(pdfBuffer);
        if (!sizeValidation.valid) {
          console.error(`❌ [Legal Lens] PDF-Limit überschritten:`, sizeValidation.details);
          return res.status(413).json({
            success: false,
            error: sizeValidation.error,
            details: sizeValidation.details
          });
        }

        // Robuste Dokument-Extraktion mit Qualitätsprüfung und OCR-Nutzungstracking
        const docMimetype = contract.s3Key?.endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf';
        const extractionResult = await pdfExtractor.extractTextWithOCRFallback(pdfBuffer, { userId, mimetype: docMimetype });

        if (!extractionResult.success) {
          console.error(`❌ [Legal Lens] PDF-Extraktion fehlgeschlagen:`, extractionResult.error);
          return res.status(400).json({
            success: false,
            error: extractionResult.error || 'PDF konnte nicht gelesen werden.',
            pdfQuality: extractionResult.quality,
            ocrUsage: extractionResult.ocrUsage
          });
        }

        // PDF-Seitenlimit prüfen (nach Extraktion)
        const pagesValidation = validatePdfLimits(pdfBuffer, extractionResult);
        if (!pagesValidation.valid) {
          console.error(`❌ [Legal Lens] PDF-Seitenlimit überschritten:`, pagesValidation.details);
          return res.status(413).json({
            success: false,
            error: pagesValidation.error,
            details: pagesValidation.details
          });
        }

        text = extractionResult.text;
        console.log(`✅ [Legal Lens] PDF-Text extrahiert: ${extractionResult.quality.charCount} Zeichen, Qualität: ${extractionResult.quality.qualityScore}%${extractionResult.usedOCR ? ` (OCR: ${extractionResult.ocrPages} Seiten)` : ''}`);

        // Text im Contract speichern für zukünftige Anfragen
        await Contract.updateOne(
          { _id: contract._id },
          {
            $set: {
              extractedText: text,
              pdfQuality: extractionResult.quality
            }
          }
        );

        // Warnungen loggen
        if (extractionResult.warnings.length > 0) {
          console.warn(`⚠️ [Legal Lens] PDF-Warnungen:`, extractionResult.warnings.map(w => w.type).join(', '));
        }
      } catch (s3Error) {
        console.error(`❌ [Legal Lens] S3-Extraktion fehlgeschlagen:`, s3Error.message);
      }
    }

    if (!text || text.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Vertrag enthält keinen analysierbaren Text. Mögliche Ursachen: Die PDF ist gescannt (Bilddatei), verschlüsselt, oder beschädigt.',
        suggestions: [
          'Laden Sie eine digitale PDF hoch (keine Scan-Datei)',
          'Entfernen Sie den Passwortschutz, falls vorhanden',
          'Nutzen Sie ein OCR-Tool, um gescannte Dokumente in Text umzuwandeln'
        ]
      });
    }

    const contractName = contract.name || contract.title || 'Vertrag';

    // Streaming Response
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      res.write(`event: start\ndata: ${JSON.stringify({ contractId, contractName })}\n\n`);

      try {
        const result = await clauseAnalyzer.generateContractSummaryStreaming(
          text,
          contractName,
          (chunk) => {
            res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`);
          }
        );

        res.write(`event: done\ndata: ${JSON.stringify({ complete: true, format: 'markdown' })}\n\n`);
        res.end();

      } catch (streamError) {
        res.write(`event: error\ndata: ${JSON.stringify({ error: streamError.message })}\n\n`);
        res.end();
      }
      return;
    }

    // Normale (nicht-streaming) Response
    const result = await clauseAnalyzer.generateContractSummary(text, contractName);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Smart Summary fehlgeschlagen'
      });
    }

    // Summary im Contract speichern (im legalLens-Objekt)
    try {
      await Contract.updateOne(
        { _id: contract._id },
        {
          $set: {
            'legalLens.smartSummary': result.summary,
            'legalLens.smartSummaryGeneratedAt': new Date()
          }
        }
      );
      console.log(`✅ [Legal Lens] Smart Summary saved for contract ${contractId}`);
    } catch (dbError) {
      console.error('⚠️ [Legal Lens] DB save error (non-critical):', dbError.message);
    }

    console.log(`✅ [Legal Lens] Smart Summary generated for ${contractName}`);

    res.json({
      success: true,
      summary: result.summary,
      metadata: result.metadata,
      contractName
    });

  } catch (error) {
    console.error('❌ [Legal Lens] Smart Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler bei der Smart Summary'
    });
  }
});

/**
 * GET /api/legal-lens/:contractId/smart-summary
 *
 * Lädt eine gespeicherte Smart Summary oder generiert eine neue.
 */
router.get('/:contractId/smart-summary', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.user.userId;

    const contract = await Contract.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Vertrag nicht gefunden'
      });
    }

    // Prüfe ob bereits eine Summary existiert (im legalLens-Objekt)
    if (contract.legalLens?.smartSummary) {
      console.log(`⚡ [Legal Lens] Smart Summary aus Cache für Contract ${contractId}`);
      return res.json({
        success: true,
        summary: contract.legalLens.smartSummary,
        cached: true,
        generatedAt: contract.legalLens.smartSummaryGeneratedAt,
        contractName: contract.name || contract.title
      });
    }

    // Keine Summary vorhanden
    console.log(`📝 [Legal Lens] Keine gecachte Smart Summary für Contract ${contractId}`);
    res.json({
      success: true,
      summary: null,
      cached: false,
      message: 'Keine Smart Summary vorhanden. Bitte POST /smart-summary aufrufen.'
    });

  } catch (error) {
    console.error('❌ [Legal Lens] Get Smart Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Smart Summary'
    });
  }
});

// ============================================
// PARSE CONTRACT INTO CLAUSES
// ============================================

/**
 * POST /api/legal-lens/parse
 *
 * Parst einen Vertrag in strukturierte Klauseln.
 */
router.post('/parse', verifyToken, async (req, res) => {
  try {
    const { contractId, forceRefresh } = req.body;
    const userId = req.user.userId;

    console.log(`📜 [Legal Lens] Parse request for contract: ${contractId}${forceRefresh ? ' (FORCE REFRESH)' : ''}`);

    if (!contractId) {
      return res.status(400).json({
        success: false,
        error: 'contractId ist erforderlich'
      });
    }

    // Vertrag aus Datenbank laden
    const contract = await Contract.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Vertrag nicht gefunden'
      });
    }

    // ⚡ FAST PATH: Prüfen ob Cache gültig ist (TTL + Version + Force-Refresh)
    const cacheCheck = isCacheValid(contract.legalLens, forceRefresh);

    if (cacheCheck.valid) {
      console.log(`⚡ [Legal Lens] Gültiger Cache gefunden: ${contract.legalLens.preParsedClauses.length} Klauseln`);

      // 🔄 Re-validate nonAnalyzable für alte Caches (Patterns wurden verbessert)
      let cacheNeedsUpdate = false;
      const validatedClauses = contract.legalLens.preParsedClauses.map(clause => {
        // Re-run detectNonAnalyzable mit aktuellen Patterns
        const analyzableCheck = clauseParser.detectNonAnalyzable(clause.text || '', clause.title || '');

        // Prüfen ob sich das Ergebnis geändert hat
        if (analyzableCheck.nonAnalyzable !== clause.nonAnalyzable) {
          console.log(`🔄 [Legal Lens] nonAnalyzable geändert für "${clause.title}": ${clause.nonAnalyzable} → ${analyzableCheck.nonAnalyzable}`);
          cacheNeedsUpdate = true;
          return {
            ...clause,
            nonAnalyzable: analyzableCheck.nonAnalyzable,
            nonAnalyzableReason: analyzableCheck.reason,
            category: analyzableCheck.category,
            // Für non-analyzable: Risk auf 'none' setzen
            riskLevel: analyzableCheck.nonAnalyzable ? 'none' : clause.riskLevel,
            riskIndicators: analyzableCheck.nonAnalyzable ? { level: 'none', keywords: [], score: 0 } : clause.riskIndicators
          };
        }
        return clause;
      });

      // Cache im Hintergrund aktualisieren wenn nötig (nicht blockierend)
      if (cacheNeedsUpdate) {
        console.log(`💾 [Legal Lens] Cache wird im Hintergrund aktualisiert...`);
        Contract.updateOne(
          { _id: contract._id },
          { $set: { 'legalLens.preParsedClauses': validatedClauses } }
        ).catch(err => console.error('Cache update error:', err.message));
      }

      // Validierte Klauseln zurückgeben (instant!)
      return res.json({
        success: true,
        clauses: validatedClauses,
        totalClauses: validatedClauses.length,
        riskSummary: contract.legalLens.riskSummary || {
          high: validatedClauses.filter(c => c.riskLevel === 'high' && !c.nonAnalyzable).length,
          medium: validatedClauses.filter(c => c.riskLevel === 'medium' && !c.nonAnalyzable).length,
          low: validatedClauses.filter(c => c.riskLevel === 'low' && !c.nonAnalyzable).length
        },
        metadata: {
          ...(contract.legalLens.metadata || {}),
          source: 'preprocessed',
          preprocessedAt: contract.legalLens.preprocessedAt,
          revalidated: cacheNeedsUpdate
        }
      });
    }

    // Cache ungültig - warum?
    if (!cacheCheck.valid) {
      console.log(`🔄 [Legal Lens] Cache ungültig: ${cacheCheck.reason}`);
    }

    // Preprocessing läuft gerade? → Frontend soll Streaming nutzen
    const preprocessStatus = contract.legalLens?.preprocessStatus;

    if (preprocessStatus === 'processing') {
      console.log(`⏳ [Legal Lens] Vorverarbeitung läuft noch - empfehle Streaming`);
      return res.json({
        success: true,
        useStreaming: true,
        reason: 'preprocessing_in_progress',
        message: 'Vorverarbeitung läuft - bitte Streaming nutzen für Live-Updates',
        contractName: contract.name || contract.title || 'Vertrag'
      });
    }

    // Cache ungültig oder nicht vorhanden → Frontend soll Streaming nutzen
    // Zeige Grund für Cache-Invalidierung im Log
    const invalidReason = cacheCheck.reason || 'unknown';
    console.log(`📋 [Legal Lens] Cache-Invalidierung: ${invalidReason} - empfehle Streaming`);
    return res.json({
      success: true,
      useStreaming: true,
      reason: invalidReason,
      message: getCacheInvalidMessage(invalidReason),
      contractName: contract.name || contract.title || 'Vertrag'
    });

    // NOTE: Der folgende Code ist unreachable (nach return) - wird für Konsistenz beibehalten
    // Text extrahieren - mehrere Fallbacks
    let text = contract.content || contract.extractedText || contract.fullText || contract.analysisText;

    // Fallback: Aus S3 extrahieren wenn kein Text vorhanden
    if ((!text || text.length < 50) && contract.s3Key) {
      console.log(`📥 [Legal Lens] Kein Text im Contract - extrahiere aus S3: ${contract.s3Key}`);

      try {
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: contract.s3Key
        });

        const response = await s3Client.send(command);
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        const pdfBuffer = Buffer.concat(chunks);

        // PDF-Größenlimit prüfen (vor Verarbeitung)
        const sizeValidation = validatePdfLimits(pdfBuffer);
        if (!sizeValidation.valid) {
          console.error(`❌ [Legal Lens] PDF-Limit überschritten:`, sizeValidation.details);
          return res.status(413).json({
            success: false,
            error: sizeValidation.error,
            details: sizeValidation.details
          });
        }

        // Robuste Dokument-Extraktion mit Qualitätsprüfung und OCR-Nutzungstracking
        const docMimetype = contract.s3Key?.endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf';
        const extractionResult = await pdfExtractor.extractTextWithOCRFallback(pdfBuffer, { userId, mimetype: docMimetype });

        if (!extractionResult.success) {
          console.error(`❌ [Legal Lens] PDF-Extraktion fehlgeschlagen:`, extractionResult.error);
          return res.status(400).json({
            success: false,
            error: extractionResult.error || 'PDF konnte nicht gelesen werden.',
            pdfQuality: extractionResult.quality,
            ocrUsage: extractionResult.ocrUsage
          });
        }

        // PDF-Seitenlimit prüfen (nach Extraktion)
        const pagesValidation = validatePdfLimits(pdfBuffer, extractionResult);
        if (!pagesValidation.valid) {
          console.error(`❌ [Legal Lens] PDF-Seitenlimit überschritten:`, pagesValidation.details);
          return res.status(413).json({
            success: false,
            error: pagesValidation.error,
            details: pagesValidation.details
          });
        }

        text = extractionResult.text;
        console.log(`✅ [Legal Lens] PDF-Text extrahiert: ${extractionResult.quality.charCount} Zeichen, Qualität: ${extractionResult.quality.qualityScore}%${extractionResult.usedOCR ? ` (OCR: ${extractionResult.ocrPages} Seiten)` : ''}`);

        // Text und Qualität im Contract speichern
        await Contract.updateOne(
          { _id: contract._id },
          {
            $set: {
              extractedText: text,
              pdfQuality: extractionResult.quality
            }
          }
        );
      } catch (s3Error) {
        console.error(`❌ [Legal Lens] S3-Extraktion fehlgeschlagen:`, s3Error.message);
      }
    }

    if (!text || text.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'Vertrag enthält keinen analysierbaren Text. Mögliche Ursachen: Die PDF ist gescannt (Bilddatei), verschlüsselt, oder beschädigt.',
        suggestions: [
          'Laden Sie eine digitale PDF hoch (keine Scan-Datei)',
          'Entfernen Sie den Passwortschutz, falls vorhanden',
          'Nutzen Sie ein OCR-Tool, um gescannte Dokumente in Text umzuwandeln'
        ]
      });
    }

    // Parsen - ZURÜCK auf schnelles Regex-Parsing (GPT dauerte zu lange)
    // TODO: GPT-Parsing als Background-Job implementieren
    console.log(`📋 [Legal Lens] Starte Regex-basiertes Parsing...`);
    const parseResult = clauseParser.parseContract(text, {
      detectRisk: true,
      minClauseLength: 20,
      maxClauseLength: 2000
    });

    if (!parseResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Parsing fehlgeschlagen'
      });
    }

    // ⚡ BATCH-VORANALYSE: Alle Klauseln mit GPT-3.5 voranalysieren (kosteneffizient!)
    console.log(`⚡ [Legal Lens] Starte Batch-Voranalyse für ${parseResult.totalClauses} Klauseln...`);

    let preAnalysis = null;
    try {
      preAnalysis = await clauseAnalyzer.batchPreAnalyze(
        parseResult.clauses.map(c => ({ id: c.id, text: c.text })),
        contract.name || contract.title || ''
      );

      // Voranalyse-Ergebnisse in Klauseln einmergen
      if (preAnalysis.success && preAnalysis.analyses) {
        const analysisMap = new Map(
          preAnalysis.analyses.map(a => [a.clauseId, a])
        );

        parseResult.clauses = parseResult.clauses.map(clause => {
          const analysis = analysisMap.get(clause.id);
          if (analysis) {
            return {
              ...clause,
              preAnalysis: {
                riskLevel: analysis.riskLevel,
                riskScore: analysis.riskScore,
                summary: analysis.summary,
                mainRisk: analysis.mainRisk
              }
            };
          }
          return clause;
        });

        console.log(`✅ [Legal Lens] Voranalyse abgeschlossen: ${preAnalysis.highRiskCount} High-Risk Klauseln`);
      }
    } catch (preAnalysisError) {
      console.error('⚠️ [Legal Lens] Voranalyse fehlgeschlagen (nicht kritisch):', preAnalysisError.message);
      // Fortfahren ohne Voranalyse - nicht kritisch
    }

    // 🏢 AUTO-BRANCHENERKENNUNG
    const industryDetection = detectIndustryFromText(text);
    console.log(`🏢 [Legal Lens] Auto-detected industry: ${industryDetection.industry} (${industryDetection.confidence}% confidence)`);

    // Progress erstellen/aktualisieren
    await LegalLensProgress.findOneAndUpdate(
      { userId: new ObjectId(userId), contractId: new ObjectId(contractId) },
      {
        $set: {
          totalClauses: parseResult.totalClauses,
          overallRisk: preAnalysis?.overallRisk || 'medium',
          highRiskCount: preAnalysis?.highRiskCount || 0,
          preAnalyzedAt: preAnalysis?.success ? new Date() : null,
          // Auto-erkannte Branche (nur setzen wenn Confidence > 50% oder noch keine Branche)
          ...(industryDetection.confidence > 50 ? {
            industryContext: industryDetection.industry,
            industrySetAt: new Date(),
            industryAutoDetected: true,
            industryConfidence: industryDetection.confidence,
            industryKeywords: industryDetection.detectedKeywords
          } : {}),
          updatedAt: new Date()
        },
        $setOnInsert: {
          reviewedClauses: [],
          currentSessionStart: new Date(),
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    console.log(`✅ [Legal Lens] Parsed ${parseResult.totalClauses} clauses`);

    res.json({
      success: true,
      clauses: parseResult.clauses,
      totalClauses: parseResult.totalClauses,
      sections: parseResult.sections,
      riskSummary: parseResult.riskSummary,
      contractName: contract.name || contract.title || 'Vertrag',
      // Neue Felder für Voranalyse
      preAnalysis: preAnalysis ? {
        success: preAnalysis.success,
        overallRisk: preAnalysis.overallRisk,
        highRiskCount: preAnalysis.highRiskCount,
        metadata: preAnalysis.metadata
      } : null,
      // Auto-erkannte Branche
      industryDetection: {
        industry: industryDetection.industry,
        confidence: industryDetection.confidence,
        detectedKeywords: industryDetection.detectedKeywords,
        autoDetected: industryDetection.confidence > 50
      }
    });

  } catch (error) {
    console.error('❌ [Legal Lens] Parse error:', error);
    res.status(500).json({
      success: false,
      error: 'Interner Serverfehler beim Parsen'
    });
  }
});

// ============================================
// ANALYZE SINGLE CLAUSE
// ============================================

/**
 * POST /api/legal-lens/:contractId/clause/:clauseId/analyze
 *
 * Analysiert eine einzelne Klausel aus einer bestimmten Perspektive.
 */
router.post(
  '/:contractId/clause/:clauseId/analyze',
  verifyToken,
  analysisRateLimiter,
  async (req, res) => {
    try {
      const { contractId, clauseId } = req.params;
      const { perspective = 'contractor', clauseText, stream = false, industry } = req.body;
      const userId = req.user.userId;

      // Branchen-Kontext ermitteln
      let industryContext = industry || 'general';

      // Wenn keine Branche übergeben, aus Progress laden
      if (!industry) {
        try {
          const progress = await LegalLensProgress.findOne({
            userId: new ObjectId(userId),
            contractId: new ObjectId(contractId)
          });
          if (progress?.industryContext) {
            industryContext = progress.industryContext;
          }
        } catch (err) {
          console.warn('[Legal Lens] Could not load industry from progress:', err.message);
        }
      }

      console.log(`🔍 [Legal Lens] Analyze clause ${clauseId} from ${perspective} perspective (Industry: ${industryContext})`);

      if (!clauseText) {
        return res.status(400).json({
          success: false,
          error: 'clauseText ist erforderlich'
        });
      }

      // Generiere Hash für Klauseltext (für Cache-Lookup)
      const clauseTextHash = generateClauseTextHash(clauseText);

      // ========== CACHE PRÜFUNG (2-stufig) ==========

      // Stufe 1: Direkter Cache (contractId + clauseId)
      const directCache = await ClauseAnalysis.findOne({
        contractId: new ObjectId(contractId),
        clauseId,
        [`perspectives.${perspective}.analyzedAt`]: { $exists: true }
      });

      if (directCache?.perspectives?.[perspective]) {
        console.log(`💾 [Legal Lens] Direct cache hit for ${clauseId}`);
        return res.json({
          success: true,
          analysis: directCache.perspectives[perspective],
          cached: true,
          cacheType: 'direct',
          clauseId,
          perspective
        });
      }

      // Stufe 2: Hash-basierter Cache (identische Klauseln über Verträge hinweg)
      const hashCache = await findCachedAnalysisByHash(clauseTextHash, perspective);

      if (hashCache) {
        console.log(`🔄 [Legal Lens] Hash cache hit for ${clauseId} (from ${hashCache.originalClauseId})`);

        // Kopiere die gecachte Analyse in den aktuellen Vertrag
        await ClauseAnalysis.findOneAndUpdate(
          { contractId: new ObjectId(contractId), clauseId },
          {
            $set: {
              userId: new ObjectId(userId),
              clauseText,
              clauseTextHash,
              [`perspectives.${perspective}`]: hashCache.analysis,
              riskLevel: hashCache.analysis.riskAssessment?.level || 'medium',
              riskScore: hashCache.analysis.riskAssessment?.score || 50,
              actionLevel: hashCache.analysis.actionLevel || 'negotiate',
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          { upsert: true }
        );

        return res.json({
          success: true,
          analysis: hashCache.analysis,
          cached: true,
          cacheType: 'hash',
          clauseId,
          perspective
        });
      }

      // ========== KEINE CACHE-TREFFER → NEUE ANALYSE ==========

      // Streaming Response
      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write(`event: start\ndata: ${JSON.stringify({ clauseId, perspective })}\n\n`);

        try {
          await clauseAnalyzer.analyzeClauseStreaming(
            clauseText,
            perspective,
            (chunk) => {
              res.write(`event: chunk\ndata: ${JSON.stringify({ content: chunk })}\n\n`);
            }
          );

          res.write(`event: done\ndata: ${JSON.stringify({ complete: true })}\n\n`);
          res.end();

        } catch (streamError) {
          res.write(`event: error\ndata: ${JSON.stringify({ error: streamError.message })}\n\n`);
          res.end();
        }
        return;
      }

      // Normale Analyse mit Branchen-Kontext
      const result = await clauseAnalyzer.analyzeClause(clauseText, perspective, '', { industry: industryContext });

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: 'Analyse fehlgeschlagen'
        });
      }

      // GPT-Antwort transformieren für MongoDB-Kompatibilität
      const transformAnalysis = (analysis) => {
        const transformed = { ...analysis };

        // Konsequenzen: Stelle sicher, dass es ein Array von Objekten ist
        if (transformed.consequences) {
          if (typeof transformed.consequences === 'string') {
            try {
              transformed.consequences = JSON.parse(transformed.consequences);
            } catch {
              transformed.consequences = [{ scenario: transformed.consequences, probability: 'medium', impact: '' }];
            }
          }
          // Stelle sicher, dass jedes Element ein Objekt ist
          transformed.consequences = transformed.consequences.map(c => {
            if (typeof c === 'string') {
              return { scenario: c, probability: 'medium', impact: '' };
            }
            return {
              scenario: c.scenario || c.text || String(c),
              probability: c.probability || 'medium',
              impact: c.impact || ''
            };
          });
        }

        // Explanation: Mapping von GPT-Feldern
        if (transformed.explanation) {
          transformed.explanation = {
            simple: transformed.explanation.simple || transformed.explanation.summary || '',
            detailed: transformed.explanation.detailed || '',
            whatItMeansForYou: transformed.explanation.whatItMeansForYou || ''
          };
        }

        // RiskAssessment: Aus GPT-Format
        if (transformed.riskAssessment) {
          transformed.riskAssessment = {
            level: transformed.riskAssessment.level || 'medium',
            score: typeof transformed.riskAssessment.score === 'number' ? transformed.riskAssessment.score : 50,
            reasons: Array.isArray(transformed.riskAssessment.reasons) ? transformed.riskAssessment.reasons : []
          };
        }

        // WorstCase: Sicherstellen dass alle Felder da sind
        if (transformed.worstCase) {
          transformed.worstCase = {
            scenario: transformed.worstCase.scenario || '',
            financialRisk: transformed.worstCase.financialRisk || 'Nicht bezifferbar',
            timeRisk: transformed.worstCase.timeRisk || 'Keine Angabe',
            probability: transformed.worstCase.probability || 'possible'
          };
        }

        // Impact: Sicherstellen dass negotiationPower eine Zahl ist
        if (transformed.impact) {
          transformed.impact = {
            financial: transformed.impact.financial || '',
            legal: transformed.impact.legal || '',
            operational: transformed.impact.operational || '',
            negotiationPower: typeof transformed.impact.negotiationPower === 'number'
              ? transformed.impact.negotiationPower
              : 50
          };
        }

        // BetterAlternative
        if (transformed.betterAlternative) {
          transformed.betterAlternative = {
            text: transformed.betterAlternative.text || '',
            whyBetter: transformed.betterAlternative.whyBetter || '',
            howToAsk: transformed.betterAlternative.howToAsk || ''
          };
        }

        // MarketComparison
        if (transformed.marketComparison) {
          transformed.marketComparison = {
            isStandard: Boolean(transformed.marketComparison.isStandard),
            marketRange: transformed.marketComparison.marketRange || '',
            deviation: transformed.marketComparison.deviation || ''
          };
        }

        return transformed;
      };

      const transformedAnalysis = transformAnalysis(result.analysis);

      // In Datenbank speichern (mit Hash für Cross-Contract Caching)
      try {
        await ClauseAnalysis.findOneAndUpdate(
          { contractId: new ObjectId(contractId), clauseId },
          {
            $set: {
              userId: new ObjectId(userId),
              clauseText,
              clauseTextHash, // Für Hash-basiertes Caching über Verträge hinweg
              riskLevel: transformedAnalysis.riskAssessment?.level || 'medium',
              riskScore: transformedAnalysis.riskAssessment?.score || 50,
              actionLevel: transformedAnalysis.actionLevel || 'negotiate',
              [`perspectives.${perspective}`]: {
                ...transformedAnalysis,
                analyzedAt: new Date()
              },
              updatedAt: new Date()
            },
            $setOnInsert: {
              createdAt: new Date()
            }
          },
          { upsert: true, new: true }
        );
        console.log(`✅ [Legal Lens] Analysis saved for ${clauseId} (hash: ${clauseTextHash})`);
      } catch (dbError) {
        console.error('⚠️ [Legal Lens] DB save error (non-critical):', dbError.message);
        // Nicht abbrechen - Analyse trotzdem zurückgeben
      }

      console.log(`✅ [Legal Lens] Analysis complete for ${clauseId}`);

      res.json({
        success: true,
        analysis: transformedAnalysis,
        cached: false,
        clauseId,
        perspective,
        metadata: result.metadata
      });

    } catch (error) {
      console.error('❌ [Legal Lens] Analysis error:', error);
      res.status(500).json({
        success: false,
        error: 'Analyse fehlgeschlagen: ' + error.message
      });
    }
  }
);

// ============================================
// GET ALL PERSPECTIVES FOR A CLAUSE
// ============================================

/**
 * GET /api/legal-lens/:contractId/clause/:clauseId/perspectives
 *
 * Gibt alle gespeicherten Perspektiven für eine Klausel zurück.
 */
router.get('/:contractId/clause/:clauseId/perspectives', verifyToken, async (req, res) => {
  try {
    const { contractId, clauseId } = req.params;
    const userId = req.user.userId;

    const analysis = await ClauseAnalysis.findOne({
      contractId: new ObjectId(contractId),
      clauseId,
      userId: new ObjectId(userId)
    });

    if (!analysis) {
      return res.json({
        success: true,
        perspectives: {},
        clauseId,
        hasAnalysis: false
      });
    }

    res.json({
      success: true,
      perspectives: analysis.perspectives || {},
      clauseId,
      riskLevel: analysis.riskLevel,
      riskScore: analysis.riskScore,
      hasAnalysis: true
    });

  } catch (error) {
    console.error('❌ [Legal Lens] Get perspectives error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Perspektiven'
    });
  }
});

// ============================================
// GENERATE ALTERNATIVES
// ============================================

/**
 * POST /api/legal-lens/:contractId/clause/:clauseId/alternatives
 *
 * Generiert alternative Formulierungen für eine Klausel.
 */
router.post(
  '/:contractId/clause/:clauseId/alternatives',
  verifyToken,
  analysisRateLimiter,
  async (req, res) => {
    try {
      const { clauseId } = req.params;
      const { clauseText, count = 2, style = 'balanced' } = req.body;

      console.log(`✨ [Legal Lens] Generate alternatives for ${clauseId}`);

      if (!clauseText) {
        return res.status(400).json({
          success: false,
          error: 'clauseText ist erforderlich'
        });
      }

      const result = await clauseAnalyzer.generateAlternatives(clauseText, {
        count,
        style
      });

      res.json({
        success: true,
        alternatives: result.alternatives,
        clauseId,
        style
      });

    } catch (error) {
      console.error('❌ [Legal Lens] Alternatives error:', error);
      res.status(500).json({
        success: false,
        error: 'Alternativen-Generierung fehlgeschlagen'
      });
    }
  }
);

// ============================================
// GENERATE NEGOTIATION TIPS
// ============================================

/**
 * POST /api/legal-lens/:contractId/clause/:clauseId/negotiation
 *
 * Generiert Verhandlungstipps für eine Klausel.
 */
router.post(
  '/:contractId/clause/:clauseId/negotiation',
  verifyToken,
  analysisRateLimiter,
  async (req, res) => {
    try {
      const { contractId, clauseId } = req.params;
      const { clauseText } = req.body;

      console.log(`🎯 [Legal Lens] Generate negotiation tips for ${clauseId}`);

      if (!clauseText) {
        return res.status(400).json({
          success: false,
          error: 'clauseText ist erforderlich'
        });
      }

      // Lade existierende Analyse für Kontext
      const existingAnalysis = await ClauseAnalysis.findOne({
        contractId: new ObjectId(contractId),
        clauseId
      });

      const result = await clauseAnalyzer.generateNegotiationTips(
        clauseText,
        existingAnalysis?.perspectives?.contractor
      );

      // Speichern
      if (existingAnalysis) {
        await ClauseAnalysis.updateOne(
          { _id: existingAnalysis._id },
          { $set: { negotiation: result.negotiation } }
        );
      }

      res.json({
        success: true,
        negotiation: result.negotiation,
        clauseId
      });

    } catch (error) {
      console.error('❌ [Legal Lens] Negotiation error:', error);
      res.status(500).json({
        success: false,
        error: 'Verhandlungstipps-Generierung fehlgeschlagen'
      });
    }
  }
);

// ============================================
// CHAT ABOUT CLAUSE
// ============================================

/**
 * POST /api/legal-lens/:contractId/clause/:clauseId/chat
 *
 * Chat-Funktion für Nachfragen zu einer Klausel.
 */
router.post(
  '/:contractId/clause/:clauseId/chat',
  verifyToken,
  analysisRateLimiter,
  async (req, res) => {
    try {
      const { contractId, clauseId } = req.params;
      const { question, message, clauseText, previousMessages = [] } = req.body;
      const userId = req.user.userId;

      // Akzeptiere sowohl "question" als auch "message" für Kompatibilität
      const userQuestion = question || message;

      console.log(`💬 [Legal Lens] Chat about clause ${clauseId}`);

      if (!userQuestion || !clauseText) {
        return res.status(400).json({
          success: false,
          error: 'question/message und clauseText sind erforderlich'
        });
      }

      const result = await clauseAnalyzer.chatAboutClause(
        clauseText,
        userQuestion,
        previousMessages
      );

      // Chat-Verlauf speichern
      await ClauseAnalysis.findOneAndUpdate(
        { contractId: new ObjectId(contractId), clauseId },
        {
          $push: {
            chatHistory: {
              $each: [
                { role: 'user', content: userQuestion, timestamp: new Date() },
                { role: 'assistant', content: result.answer, timestamp: new Date() }
              ]
            }
          }
        }
      );

      res.json({
        success: true,
        response: result.answer,  // Frontend erwartet "response"
        answer: result.answer,    // Fallback für andere Clients
        clauseId,
        timestamp: result.timestamp
      });

    } catch (error) {
      console.error('❌ [Legal Lens] Chat error:', error);
      res.status(500).json({
        success: false,
        error: 'Chat fehlgeschlagen'
      });
    }
  }
);

// ============================================
// PROGRESS TRACKING
// ============================================

/**
 * GET /api/legal-lens/:contractId/progress
 *
 * Gibt den Fortschritt für einen Vertrag zurück.
 */
router.get('/:contractId/progress', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.user.userId;

    const progress = await LegalLensProgress.findOne({
      userId: new ObjectId(userId),
      contractId: new ObjectId(contractId)
    });

    if (!progress) {
      return res.json({
        success: true,
        progress: {
          reviewedClauses: [],
          totalClauses: 0,
          percentComplete: 0,
          bookmarks: [],
          notes: []
        }
      });
    }

    res.json({
      success: true,
      progress: {
        reviewedClauses: progress.reviewedClauses,
        totalClauses: progress.totalClauses,
        percentComplete: progress.percentComplete,
        lastViewedClause: progress.lastViewedClause,
        currentPerspective: progress.currentPerspective,
        industryContext: progress.industryContext || 'general',
        bookmarks: progress.bookmarks,
        notes: progress.notes,
        status: progress.status,
        totalTimeSpent: progress.totalTimeSpent
      }
    });

  } catch (error) {
    console.error('❌ [Legal Lens] Progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden des Fortschritts'
    });
  }
});

/**
 * POST /api/legal-lens/:contractId/progress
 *
 * Aktualisiert den Fortschritt.
 */
router.post('/:contractId/progress', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { clauseId, perspective, totalClauses } = req.body;
    const userId = req.user.userId;

    const updateData = {
      updatedAt: new Date()
    };

    if (clauseId) {
      updateData.lastViewedClause = clauseId;
    }

    if (perspective) {
      updateData.currentPerspective = perspective;
    }

    if (totalClauses) {
      updateData.totalClauses = totalClauses;
    }

    const progress = await LegalLensProgress.findOneAndUpdate(
      { userId: new ObjectId(userId), contractId: new ObjectId(contractId) },
      {
        $set: updateData,
        $addToSet: clauseId ? { reviewedClauses: clauseId } : {}
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      percentComplete: progress.percentComplete,
      reviewedCount: progress.reviewedClauses.length
    });

  } catch (error) {
    console.error('❌ [Legal Lens] Update progress error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Speichern des Fortschritts'
    });
  }
});

// ============================================
// NOTES & BOOKMARKS
// ============================================

/**
 * POST /api/legal-lens/:contractId/note
 *
 * Speichert eine Notiz zu einer Klausel.
 */
router.post('/:contractId/note', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { clauseId, content } = req.body;
    const userId = req.user.userId;

    if (!clauseId || !content) {
      return res.status(400).json({
        success: false,
        error: 'clauseId und content sind erforderlich'
      });
    }

    await LegalLensProgress.findOneAndUpdate(
      { userId: new ObjectId(userId), contractId: new ObjectId(contractId) },
      {
        $push: {
          notes: {
            clauseId,
            content,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        }
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: 'Notiz gespeichert'
    });

  } catch (error) {
    console.error('❌ [Legal Lens] Note error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Speichern der Notiz'
    });
  }
});

/**
 * POST /api/legal-lens/:contractId/bookmark
 *
 * Speichert oder entfernt ein Bookmark.
 */
router.post('/:contractId/bookmark', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { clauseId, action = 'add', label = '' } = req.body;
    const userId = req.user.userId;

    if (!clauseId) {
      return res.status(400).json({
        success: false,
        error: 'clauseId ist erforderlich'
      });
    }

    if (action === 'add') {
      await LegalLensProgress.findOneAndUpdate(
        { userId: new ObjectId(userId), contractId: new ObjectId(contractId) },
        {
          $addToSet: {
            bookmarks: {
              clauseId,
              label,
              createdAt: new Date()
            }
          }
        },
        { upsert: true }
      );
    } else if (action === 'remove') {
      await LegalLensProgress.findOneAndUpdate(
        { userId: new ObjectId(userId), contractId: new ObjectId(contractId) },
        {
          $pull: { bookmarks: { clauseId } }
        }
      );
    }

    res.json({
      success: true,
      action,
      clauseId
    });

  } catch (error) {
    console.error('❌ [Legal Lens] Bookmark error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Speichern des Bookmarks'
    });
  }
});

// ============================================
// GET AVAILABLE PERSPECTIVES
// ============================================

/**
 * GET /api/legal-lens/perspectives
 *
 * Gibt alle verfügbaren Perspektiven zurück.
 */
router.get('/perspectives', verifyToken, (req, res) => {
  res.json({
    success: true,
    perspectives: clauseAnalyzer.getAvailablePerspectives()
  });
});

// ============================================
// NEGOTIATION CHECKLIST
// ============================================

/**
 * POST /api/legal-lens/:contractId/negotiation-checklist
 *
 * Generiert eine priorisierte Verhandlungs-Checkliste basierend auf den Analysen.
 * NUR für Vertragsempfänger (Perspektive 'contractor' oder 'client').
 *
 * CACHING: Checkliste wird gespeichert und beim nächsten Aufruf aus Cache geladen.
 * Parameter: forceRegenerate=true um neu zu generieren.
 */
router.post('/:contractId/negotiation-checklist', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { perspective = 'contractor', forceRegenerate = false } = req.body;
    const userId = req.user.userId;

    console.log(`📋 [Legal Lens] Negotiation checklist request for contract: ${contractId} (force: ${forceRegenerate})`);

    // Progress laden (enthält Cache)
    let progress = await LegalLensProgress.findOne({
      userId: new ObjectId(userId),
      contractId: new ObjectId(contractId)
    });

    // Prüfen ob gecachte Checkliste vorhanden und gültig ist
    if (!forceRegenerate &&
        progress?.cachedChecklist?.checklist?.length > 0 &&
        progress.cachedChecklist.perspective === perspective) {

      console.log(`✅ [Legal Lens] Returning cached checklist (${progress.cachedChecklist.checklist.length} items)`);

      return res.json({
        success: true,
        checklist: progress.cachedChecklist.checklist,
        summary: progress.cachedChecklist.summary,
        perspective,
        industryContext: progress?.industryContext || 'general',
        generatedAt: progress.cachedChecklist.generatedAt?.toISOString(),
        fromCache: true
      });
    }

    // Vertragsdaten laden
    const contract = await Contract.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Vertrag nicht gefunden'
      });
    }

    const industryContext = progress?.industryContext || 'general';

    // Vertragstext für Analyse vorbereiten
    const contractText = contract.extractedText || contract.originalText || '';
    const truncatedText = contractText.substring(0, 15000); // Max 15k chars

    console.log(`🔄 [Legal Lens] Generating new checklist...`);

    // ✅ FIX Issue #4: GPT-Prompt verbessert gegen Halluzination
    // KRITISCH: GPT darf NUR auf Basis des TATSÄCHLICHEN Vertragstextes antworten!
    const systemPrompt = `Du bist ein erfahrener Vertragsanwalt und Verhandlungsexperte.

AUFGABE: Erstelle eine PRIORISIERTE Verhandlungs-Checkliste für einen ${perspective === 'contractor' ? 'Auftraggeber/Kunden' : 'Auftragnehmer/Dienstleister'}.

BRANCHEN-KONTEXT: ${industryContext}

⚠️ KRITISCH - ANTI-HALLUZINATIONS-REGELN:
1. Analysiere NUR was TATSÄCHLICH im Vertragstext steht!
2. ERFINDE NIEMALS Klauseln oder Fristen die nicht im Text vorkommen!
3. Wenn du eine Klausel zitierst, muss sie WORTWÖRTLICH im Vertrag stehen!
4. Bei "clausePreview" ZITIERE den EXAKTEN Wortlaut aus dem Vertrag!
5. Wenn der Vertrag z.B. "fristlos kündbar" sagt, erfinde KEINE "6 Monate Kündigungsfrist"!
6. Wenn du dir unsicher bist ob etwas im Vertrag steht → LASS ES WEG!

Identifiziere die TOP 5-7 wichtigsten Verhandlungspunkte NUR basierend auf dem, was du im Text findest.

Antworte NUR mit diesem JSON-Format:
{
  "checklist": [
    {
      "id": "1",
      "priority": 1,
      "category": "financial|liability|termination|scope|other",
      "title": "Kurzer Titel (max 5 Wörter)",
      "section": "§-Nummer oder Abschnitt falls erkennbar",
      "clausePreview": "EXAKTES ZITAT aus dem Vertrag (die betroffene Stelle)",
      "issue": "Was ist das Problem mit DIESER konkreten Klausel? (2-3 Sätze)",
      "risk": "Was droht im schlimmsten Fall? Mit €-Betrag/Zeitraum WENN im Vertrag genannt",
      "whatToSay": "Konkreter Satz für die Verhandlung: 'Ich möchte gerne...'",
      "alternativeSuggestion": "Bessere Formulierung für diese konkrete Klausel",
      "difficulty": "easy|medium|hard",
      "emoji": "Passendes Emoji"
    }
  ],
  "summary": {
    "totalIssues": 5,
    "criticalCount": 2,
    "importantCount": 2,
    "optionalCount": 1,
    "estimatedNegotiationTime": "30-45 Minuten",
    "overallStrategy": "Ein Satz zur empfohlenen Verhandlungsstrategie"
  }
}

REGELN:
- Max 7 Punkte, min 3 Punkte (nur wenn du wirklich so viele ECHTE Probleme findest!)
- priority 1 = kritisch/Dealbreaker, 2 = wichtig, 3 = nice-to-have
- Konkrete Beträge und Zeiträume nennen NUR wenn sie im Vertrag stehen!
- "whatToSay" muss ein KOMPLETTER Satz sein, den man direkt verwenden kann
- "clausePreview" MUSS ein WÖRTLICHES ZITAT aus dem Vertrag sein!
- Sprich den Leser mit "du/dein" an in issue und risk
- WENIGER Punkte sind besser als erfundene Punkte!`;

    const response = await clauseAnalyzer.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Analysiere diesen Vertrag und erstelle eine Verhandlungs-Checkliste:\n\nVertragsname: ${contract.name || 'Unbekannt'}\n\n${truncatedText}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 3000
    });

    const result = JSON.parse(response.choices[0].message.content);
    const generatedAt = new Date();

    console.log(`✅ [Legal Lens] Checklist generated with ${result.checklist?.length || 0} items`);

    // Checkliste im Progress cachen
    if (progress) {
      progress.cachedChecklist = {
        checklist: result.checklist || [],
        summary: result.summary || {},
        perspective,
        generatedAt
      };
      await progress.save();
      console.log(`💾 [Legal Lens] Checklist cached for future requests`);
    }

    res.json({
      success: true,
      checklist: result.checklist || [],
      summary: result.summary || {},
      perspective,
      industryContext,
      generatedAt: generatedAt.toISOString(),
      fromCache: false
    });

  } catch (error) {
    console.error('[Legal Lens] Negotiation checklist error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Generieren der Verhandlungs-Checkliste'
    });
  }
});

// ============================================
// CHECKLIST PDF EXPORT
// ============================================

/**
 * POST /api/legal-lens/:contractId/checklist-pdf
 *
 * Exportiert die Verhandlungs-Checkliste als PDF.
 * Verwendet gecachte Daten falls verfügbar.
 */
router.post('/:contractId/checklist-pdf', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { perspective = 'contractor' } = req.body;
    const userId = req.user.userId;

    console.log(`📄 [Legal Lens] Checklist PDF export for contract: ${contractId}`);

    // Vertrag laden
    const contract = await Contract.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Vertrag nicht gefunden'
      });
    }

    // Progress mit gecachter Checklist laden
    const progress = await LegalLensProgress.findOne({
      userId: new ObjectId(userId),
      contractId: new ObjectId(contractId)
    });

    // Prüfen ob Checkliste gecacht ist
    if (!progress?.cachedChecklist?.checklist?.length) {
      return res.status(400).json({
        success: false,
        error: 'Keine Checkliste gefunden. Bitte erst eine Checkliste generieren.'
      });
    }

    const { checklist, summary } = progress.cachedChecklist;
    const contractName = contract.name || contract.title || 'Vertrag';

    // PDF generieren
    const pdfBuffer = await generateChecklistPdf({
      checklist,
      summary,
      contractName,
      perspective: progress.cachedChecklist.perspective || perspective
    });

    // PDF als Response senden
    const filename = `Checkliste_${contractName.replace(/[^a-zA-Z0-9äöüÄÖÜß]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);

    console.log(`✅ [Legal Lens] Checklist PDF sent: ${filename}`);

  } catch (error) {
    console.error('❌ [Legal Lens] Checklist PDF error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen des PDF'
    });
  }
});

// ============================================
// INDUSTRY CONTEXT
// ============================================

/**
 * GET /api/legal-lens/industries
 *
 * Gibt alle verfügbaren Branchen zurück.
 */
router.get('/industries', verifyToken, (req, res) => {
  res.json({
    success: true,
    industries: clauseAnalyzer.getAvailableIndustries()
  });
});

/**
 * POST /api/legal-lens/:contractId/industry
 *
 * Setzt den Branchen-Kontext für einen Vertrag.
 */
router.post('/:contractId/industry', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { industry } = req.body;
    const userId = req.user.userId;

    console.log(`🏢 [Legal Lens] Setting industry context to "${industry}" for contract: ${contractId}`);

    // Validierung
    const validIndustries = [
      'it_software', 'construction', 'real_estate', 'consulting',
      'manufacturing', 'retail', 'healthcare', 'finance', 'general'
    ];

    if (!validIndustries.includes(industry)) {
      return res.status(400).json({
        success: false,
        error: `Ungültige Branche. Erlaubt: ${validIndustries.join(', ')}`
      });
    }

    // Progress aktualisieren
    const progress = await LegalLensProgress.findOneAndUpdate(
      { userId: new ObjectId(userId), contractId: new ObjectId(contractId) },
      {
        $set: {
          industryContext: industry,
          industrySetAt: new Date(),
          updatedAt: new Date()
        }
      },
      { upsert: true, new: true }
    );

    console.log(`✅ [Legal Lens] Industry context set to "${industry}"`);

    res.json({
      success: true,
      industry,
      industrySetAt: progress.industrySetAt,
      message: `Branchen-Kontext auf "${industry}" gesetzt`
    });

  } catch (error) {
    console.error('❌ [Legal Lens] Set industry error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Setzen der Branche'
    });
  }
});

/**
 * GET /api/legal-lens/:contractId/industry
 *
 * Gibt den aktuellen Branchen-Kontext für einen Vertrag zurück.
 */
router.get('/:contractId/industry', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.user.userId;

    const progress = await LegalLensProgress.findOne({
      userId: new ObjectId(userId),
      contractId: new ObjectId(contractId)
    });

    res.json({
      success: true,
      industry: progress?.industryContext || 'general',
      industrySetAt: progress?.industrySetAt || null,
      // Auto-Erkennungs-Info
      autoDetected: progress?.industryAutoDetected || false,
      confidence: progress?.industryConfidence || 0,
      detectedKeywords: progress?.industryKeywords || []
    });

  } catch (error) {
    console.error('❌ [Legal Lens] Get industry error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Branche'
    });
  }
});

// ============================================
// GET CONTRACT ANALYSIS SUMMARY
// ============================================

/**
 * GET /api/legal-lens/:contractId/summary
 *
 * Gibt eine Zusammenfassung aller Klausel-Analysen zurück.
 */
router.get('/:contractId/summary', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.user.userId;

    const analyses = await ClauseAnalysis.find({
      contractId: new ObjectId(contractId),
      userId: new ObjectId(userId)
    }).sort({ 'position.start': 1 });

    const progress = await LegalLensProgress.findOne({
      userId: new ObjectId(userId),
      contractId: new ObjectId(contractId)
    });

    // Risiko-Zusammenfassung
    const riskCounts = { low: 0, medium: 0, high: 0 };
    let totalRiskScore = 0;

    for (const analysis of analyses) {
      if (analysis.riskLevel) {
        riskCounts[analysis.riskLevel]++;
      }
      totalRiskScore += analysis.riskScore || 0;
    }

    const averageRiskScore = analyses.length > 0
      ? Math.round(totalRiskScore / analyses.length)
      : 0;

    res.json({
      success: true,
      summary: {
        totalClauses: progress?.totalClauses || 0,
        analyzedClauses: analyses.length,
        reviewedClauses: progress?.reviewedClauses?.length || 0,
        percentComplete: progress?.percentComplete || 0,
        riskCounts,
        averageRiskScore,
        highRiskClauses: analyses
          .filter(a => a.riskLevel === 'high')
          .map(a => ({
            id: a.clauseId,
            score: a.riskScore,
            preview: a.clauseText?.substring(0, 100)
          })),
        bookmarksCount: progress?.bookmarks?.length || 0,
        notesCount: progress?.notes?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ [Legal Lens] Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Zusammenfassung'
    });
  }
});

// ============================================
// EXPORT ANALYSIS REPORT
// ============================================

/**
 * GET /api/legal-lens/export/designs
 *
 * Gibt alle verfügbaren Design-Varianten zurück.
 */
router.get('/export/designs', verifyToken, (req, res) => {
  res.json({
    success: true,
    designs: getAvailableDesigns()
  });
});

/**
 * GET /api/legal-lens/export/sections
 *
 * Gibt alle verfügbaren Sektionen für den Export zurück.
 */
router.get('/export/sections', verifyToken, (req, res) => {
  res.json({
    success: true,
    sections: getAvailableSections()
  });
});

/**
 * POST /api/legal-lens/:contractId/export-report
 *
 * Generiert einen professionellen PDF-Report der Analyse.
 */
router.post('/:contractId/export-report', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const { design = 'executive', includeSections = ['summary', 'criticalClauses'] } = req.body;
    const userId = req.user.userId;

    console.log(`📄 [Legal Lens] Export report request for contract: ${contractId}`);
    console.log(`📄 [Legal Lens] Design: ${design}, Sections: ${includeSections.join(', ')}`);

    // Vertrag laden
    const contract = await Contract.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Vertrag nicht gefunden'
      });
    }

    // 🏢 Load Company Profile for Enterprise Branding
    let companyProfile = null;
    try {
      const User = require('../models/User');
      const user = await User.findById(userId);
      if (user?.companyProfile?.companyName) {
        companyProfile = user.companyProfile;
        console.log(`🏢 [Legal Lens] Company profile found: ${companyProfile.companyName}`);
      }
    } catch (profileErr) {
      console.warn('[Legal Lens] Could not load company profile:', profileErr.message);
    }

    // Alle Klausel-Analysen laden
    const analyses = await ClauseAnalysis.find({
      contractId: new ObjectId(contractId),
      userId: new ObjectId(userId)
    }).sort({ 'position.start': 1 });

    // Progress laden (für Branchen-Kontext etc.)
    const progress = await LegalLensProgress.findOne({
      userId: new ObjectId(userId),
      contractId: new ObjectId(contractId)
    });

    // Daten für Report aufbereiten
    const clauses = analyses.map(a => ({
      id: a.clauseId,
      number: a.clauseId,
      text: a.clauseText,
      riskLevel: a.riskLevel,
      riskScore: a.riskScore,
      actionLevel: a.actionLevel,
      summary: a.perspectives?.contractor?.explanation?.simple || '',
      alternative: a.perspectives?.contractor?.betterAlternative?.text || ''
    }));

    // Kritische Klauseln (high und medium risk)
    const criticalClauses = clauses.filter(c =>
      c.riskLevel === 'high' || c.riskLevel === 'medium'
    ).sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0));

    // Risk Summary berechnen
    const riskCounts = { high: 0, medium: 0, low: 0 };
    let totalScore = 0;

    for (const clause of clauses) {
      if (clause.riskLevel) {
        riskCounts[clause.riskLevel] = (riskCounts[clause.riskLevel] || 0) + 1;
      }
      totalScore += clause.riskScore || 0;
    }

    const riskSummary = {
      totalClauses: clauses.length,
      highRisk: riskCounts.high,
      mediumRisk: riskCounts.medium,
      lowRisk: riskCounts.low,
      averageScore: clauses.length > 0 ? Math.round(totalScore / clauses.length) : 0,
      overallRisk: riskCounts.high > 0 ? 'high' : riskCounts.medium > 0 ? 'medium' : 'low'
    };

    // Top 3 Risiken
    const topRisks = criticalClauses.slice(0, 3).map(c => ({
      clauseId: c.id,
      title: `Klausel ${c.number}`,
      score: c.riskScore || 0,
      mainRisk: c.summary || 'Keine Zusammenfassung verfügbar',
      summary: c.summary
    }));

    // Verhandlungs-Checkliste (wenn Sektionen enthalten und vorhanden)
    let checklist = [];
    if (includeSections.includes('checklist')) {
      // Checklist aus kritischen Klauseln generieren
      checklist = criticalClauses.slice(0, 7).map((c, idx) => ({
        priority: c.riskLevel === 'high' ? 1 : 2,
        title: `Klausel ${c.number}`,
        issue: c.summary || 'Klausel sollte überprüft werden',
        whatToSay: c.alternative ? `Alternative vorschlagen: "${c.alternative.substring(0, 100)}..."` : ''
      }));
    }

    // Report-Daten zusammenstellen
    const reportData = {
      contractName: contract.name || contract.title || 'Vertrag',
      contractId,
      generatedAt: new Date(),
      industry: progress?.industryContext || 'general',
      clauses,
      criticalClauses,
      riskSummary,
      topRisks,
      checklist,
      companyProfile // 🏢 Enterprise Branding
    };

    // PDF generieren
    const pdfBuffer = await generateAnalysisReport(reportData, design, includeSections);

    // PDF als Download senden
    const filename = `Vertragsanalyse_${(contract.name || 'Vertrag').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    console.log(`✅ [Legal Lens] Report generated: ${filename} (${pdfBuffer.length} bytes)`);

    res.send(pdfBuffer);

  } catch (error) {
    console.error('❌ [Legal Lens] Export report error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Generieren des Reports: ' + error.message
    });
  }
});

// ============================================
// STREAMING PARSE ENDPOINT (SSE)
// ============================================

/**
 * GET /api/legal-lens/:contractId/parse-stream
 *
 * Streamt Klauseln live während der GPT-Analyse.
 * Verwendet Server-Sent Events (SSE) für Echtzeit-Updates.
 *
 * Wird verwendet für:
 * - Neue Uploads direkt in Legal Lens
 * - Alte Verträge ohne Vorverarbeitung
 */
router.get('/:contractId/parse-stream', verifyToken, async (req, res) => {
  const { contractId } = req.params;
  const { forceRefresh } = req.query;
  const userId = req.user.userId;
  const isForceRefresh = forceRefresh === 'true' || forceRefresh === '1';

  console.log(`🌊 [Legal Lens] Streaming parse request for contract: ${contractId}${isForceRefresh ? ' (FORCE REFRESH)' : ''}`);

  // SSE Headers setzen
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Helper für SSE-Nachrichten
  const sendEvent = (type, data) => {
    res.write(`event: ${type}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  try {
    // Vertrag laden
    const contract = await Contract.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(userId)
    });

    if (!contract) {
      sendEvent('error', { error: 'Vertrag nicht gefunden' });
      return res.end();
    }

    // ⚡ CACHE VALIDATION (TTL + Version + Force-Refresh)
    const cacheCheck = isCacheValid(contract.legalLens, isForceRefresh);
    const contractText = contract.content || contract.extractedText || contract.fullText || '';

    // Zusätzlicher Sanity-Check für verdächtig kleine Caches (alte buggy Daten)
    const cachedClauses = contract.legalLens?.preParsedClauses;
    const cacheSeemsBuggy = cachedClauses?.length > 0 &&
                           cachedClauses.length < 5 &&
                           contractText.length > 2000;

    if (cacheSeemsBuggy) {
      console.log(`⚠️ [Legal Lens] Verdächtiger Cache: ${cachedClauses.length} Klauseln für ${contractText.length} Zeichen Text - Cache wird ignoriert`);
      await Contract.updateOne(
        { _id: new ObjectId(contractId) },
        { $set: { 'legalLens.preprocessStatus': 'invalid' } }
      );
    }

    // Cache nur nutzen wenn gültig UND nicht buggy
    if (cacheCheck.valid && !cacheSeemsBuggy) {
      console.log(`⚡ [Legal Lens] Gültiger Cache - sende alle Klauseln auf einmal`);

      // 🔄 Re-validate nonAnalyzable für alte Caches (Patterns wurden verbessert)
      let cacheNeedsUpdate = false;
      const validatedClauses = cachedClauses.map(clause => {
        const analyzableCheck = clauseParser.detectNonAnalyzable(clause.text || '', clause.title || '');
        if (analyzableCheck.nonAnalyzable !== clause.nonAnalyzable) {
          console.log(`🔄 [Legal Lens] nonAnalyzable geändert für "${clause.title}": ${clause.nonAnalyzable} → ${analyzableCheck.nonAnalyzable}`);
          cacheNeedsUpdate = true;
          return {
            ...clause,
            nonAnalyzable: analyzableCheck.nonAnalyzable,
            nonAnalyzableReason: analyzableCheck.reason,
            category: analyzableCheck.category,
            riskLevel: analyzableCheck.nonAnalyzable ? 'none' : clause.riskLevel,
            riskIndicators: analyzableCheck.nonAnalyzable ? { level: 'none', keywords: [], score: 0 } : clause.riskIndicators
          };
        }
        return clause;
      });

      // Cache im Hintergrund aktualisieren wenn nötig
      if (cacheNeedsUpdate) {
        console.log(`💾 [Legal Lens] Cache wird im Hintergrund aktualisiert...`);
        Contract.updateOne(
          { _id: contract._id },
          { $set: { 'legalLens.preParsedClauses': validatedClauses } }
        ).catch(err => console.error('Cache update error:', err.message));
      }

      // Validierte Klauseln auf einmal senden (cached)
      sendEvent('status', { message: 'Lade vorverarbeitete Klauseln...', progress: 100 });
      sendEvent('clauses', {
        clauses: validatedClauses,
        totalClauses: validatedClauses.length,
        riskSummary: contract.legalLens.riskSummary,
        source: 'preprocessed',
        revalidated: cacheNeedsUpdate
      });
      sendEvent('complete', { success: true });
      return res.end();
    }

    // Text extrahieren
    sendEvent('status', { message: 'Extrahiere Vertragstext...', progress: 5 });

    let text = contract.content || contract.extractedText || contract.fullText;
    let pdfQuality = null;

    if ((!text || text.length < 50) && contract.s3Key) {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: contract.s3Key
        });
        const response = await s3Client.send(command);
        const chunks = [];
        for await (const chunk of response.Body) {
          chunks.push(chunk);
        }
        const pdfBuffer = Buffer.concat(chunks);

        // PDF-Größenlimit prüfen (vor Verarbeitung)
        const sizeValidation = validatePdfLimits(pdfBuffer);
        if (!sizeValidation.valid) {
          console.error(`❌ [Legal Lens] PDF-Limit überschritten:`, sizeValidation.details);
          sendEvent('error', {
            error: sizeValidation.error,
            details: sizeValidation.details,
            suggestions: [
              'Laden Sie eine kleinere Datei hoch (max. 50 MB)',
              'Teilen Sie das Dokument in mehrere Teile auf'
            ]
          });
          return res.end();
        }

        // Robuste Dokument-Extraktion mit Qualitätsprüfung und OCR-Nutzungstracking
        const docMimetype = contract.s3Key?.endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf';
        const extractionResult = await pdfExtractor.extractTextWithOCRFallback(pdfBuffer, { userId, mimetype: docMimetype });
        pdfQuality = extractionResult.quality;

        if (!extractionResult.success) {
          sendEvent('error', {
            error: extractionResult.error || 'PDF konnte nicht gelesen werden',
            pdfQuality: extractionResult.quality,
            ocrUsage: extractionResult.ocrUsage,
            suggestions: [
              'Laden Sie eine digitale PDF hoch (keine Scan-Datei)',
              'Entfernen Sie den Passwortschutz, falls vorhanden'
            ]
          });
          return res.end();
        }

        // PDF-Seitenlimit prüfen (nach Extraktion)
        const pagesValidation = validatePdfLimits(pdfBuffer, extractionResult);
        if (!pagesValidation.valid) {
          console.error(`❌ [Legal Lens] PDF-Seitenlimit überschritten:`, pagesValidation.details);
          sendEvent('error', {
            error: pagesValidation.error,
            details: pagesValidation.details,
            suggestions: [
              'Laden Sie ein kürzeres Dokument hoch (max. 200 Seiten)',
              'Teilen Sie das Dokument in mehrere Teile auf'
            ]
          });
          return res.end();
        }

        text = extractionResult.text;

        // Warnungen an Frontend senden (inkl. OCR-Warnungen)
        if (extractionResult.warnings.length > 0) {
          for (const warning of extractionResult.warnings) {
            sendEvent('warning', {
              type: warning.type || 'pdf_quality',
              message: warning.message,
              suggestion: warning.suggestion
            });
          }
        }

        // OCR-Nutzungsinfo senden
        if (extractionResult.usedOCR && extractionResult.ocrUsage) {
          sendEvent('ocr_usage', {
            pagesUsed: extractionResult.ocrUsage.pagesUsed,
            pagesLimit: extractionResult.ocrUsage.pagesLimit,
            pagesRemaining: extractionResult.ocrUsage.pagesRemaining,
            plan: extractionResult.ocrUsage.plan
          });
        }

        console.log(`✅ [Legal Lens] PDF-Text extrahiert: ${extractionResult.quality.charCount} Zeichen, Qualität: ${extractionResult.quality.qualityScore}%${extractionResult.usedOCR ? ` (OCR: ${extractionResult.ocrPages} Seiten)` : ''}`);
      } catch (s3Error) {
        sendEvent('error', {
          error: 'PDF konnte nicht gelesen werden: ' + s3Error.message,
          suggestions: ['Prüfen Sie, ob die Datei eine gültige PDF ist']
        });
        return res.end();
      }
    }

    if (!text || text.length < 50) {
      sendEvent('error', {
        error: 'Kein analysierbarer Text im Vertrag. Die PDF könnte gescannt, verschlüsselt oder beschädigt sein.',
        suggestions: [
          'Laden Sie eine digitale PDF hoch (keine Scan-Datei)',
          'Entfernen Sie den Passwortschutz, falls vorhanden',
          'Nutzen Sie ein OCR-Tool für gescannte Dokumente'
        ]
      });
      return res.end();
    }

    sendEvent('status', { message: 'Starte KI-Analyse...', progress: 10 });

    // GPT-basiertes Parsing mit Progress-Updates
    // Wir nutzen die parseContractIntelligent Funktion, aber mit Callbacks für Progress

    // Stufe 1: Vorverarbeitung (schnell)
    sendEvent('status', { message: 'Bereite Text auf...', progress: 15 });

    const cleanedText = clauseParser.preprocessText(text);
    const { text: filteredText, removedBlocks } = clauseParser.removeHeaderFooter(cleanedText);

    sendEvent('status', {
      message: `${removedBlocks.length} Header/Footer entfernt`,
      progress: 20
    });

    // Text in Blöcke aufteilen
    const rawBlocks = clauseParser.createTextBlocks(filteredText);

    sendEvent('status', {
      message: `${rawBlocks.length} Textblöcke identifiziert`,
      progress: 25
    });

    // Stufe 2: GPT-Segmentierung mit Streaming
    sendEvent('status', { message: 'KI analysiert Klauseln...', progress: 30 });

    // ===== DYNAMISCHE BATCH-GRÖSSE =====
    // Berechne optimale Batch-Größe basierend auf durchschnittlicher Blocklänge
    const totalTextLength = rawBlocks.reduce((sum, b) => sum + (b.text?.length || 0), 0);
    const avgBlockLength = rawBlocks.length > 0 ? totalTextLength / rawBlocks.length : 500;

    // Token-Limit: ~80k Tokens sicher, ~3.5 chars/token
    // Max chars pro Batch: 80000 * 3.5 = 280000, aber mit Puffer: 200000
    const MAX_CHARS_PER_BATCH = 200000;
    let maxBlocksPerCall = Math.max(5, Math.min(30, Math.floor(MAX_CHARS_PER_BATCH / avgBlockLength)));

    // Für sehr lange Verträge, kleinere Batches
    if (rawBlocks.length > 100) {
      maxBlocksPerCall = Math.min(maxBlocksPerCall, 20);
    }
    if (rawBlocks.length > 200) {
      maxBlocksPerCall = Math.min(maxBlocksPerCall, 15);
    }

    console.log(`📊 [Batch-Size] ${rawBlocks.length} Blöcke, avg ${Math.round(avgBlockLength)} chars/block → ${maxBlocksPerCall} Blöcke/Batch`);

    const batches = [];
    for (let i = 0; i < rawBlocks.length; i += maxBlocksPerCall) {
      batches.push(rawBlocks.slice(i, i + maxBlocksPerCall));
    }

    let allClauses = [];
    let batchIndex = 0;

    for (const batch of batches) {
      batchIndex++;
      const progress = 30 + Math.round((batchIndex / batches.length) * 50);

      sendEvent('status', {
        message: `Analysiere Block ${batchIndex}/${batches.length}...`,
        progress
      });

      try {
        // GPT-Segmentierung für diesen Batch
        const batchClauses = await clauseParser.gptSegmentClausesBatch(batch, contract.name || '');

        // Gültige Klauseln filtern und mit Risk-Assessment + NonAnalyzable-Check versehen
        const validClauses = batchClauses
          .filter(c => c && c.text && typeof c.text === 'string' && c.text.trim().length > 0)
          .map((clause, idx) => {
            const riskAssessment = clauseParser.assessClauseRisk(clause.text);
            // Prüfe ob Klausel analysierbar ist (Titel, Metadaten, Unterschriften = nicht analysierbar)
            const analyzableCheck = clauseParser.detectNonAnalyzable(clause.text, clause.title);

            return {
              id: clause.id || `clause_stream_${allClauses.length + idx + 1}`,
              number: clause.number || `${allClauses.length + idx + 1}`,
              title: clause.title || null,
              text: clause.text,
              type: clause.type || 'paragraph',
              riskLevel: analyzableCheck.nonAnalyzable ? 'none' : riskAssessment.level,
              riskScore: analyzableCheck.nonAnalyzable ? 0 : riskAssessment.score,
              // FIX: riskKeywords als String-Array für MongoDB-Kompatibilität
              riskKeywords: analyzableCheck.nonAnalyzable ? [] :
                (riskAssessment.keywords || []).map(k => typeof k === 'string' ? k : k.keyword),
              riskIndicators: {
                level: analyzableCheck.nonAnalyzable ? 'none' : riskAssessment.level,
                // FIX: Keywords auch als Strings für MongoDB-Kompatibilität
                keywords: analyzableCheck.nonAnalyzable ? [] :
                  (riskAssessment.keywords || []).map(k => typeof k === 'string' ? k : k.keyword),
                score: analyzableCheck.nonAnalyzable ? 0 : riskAssessment.score
              },
              // Neue Felder für nicht-analysierbare Klauseln
              nonAnalyzable: analyzableCheck.nonAnalyzable,
              nonAnalyzableReason: analyzableCheck.reason,
              clauseCategory: analyzableCheck.category  // 'clause', 'title', 'metadata', 'signature'
            };
          });

        allClauses = [...allClauses, ...validClauses];

        // Neue Klauseln direkt streamen!
        if (validClauses.length > 0) {
          sendEvent('clauses_batch', {
            newClauses: validClauses,
            totalSoFar: allClauses.length,
            batchIndex,
            totalBatches: batches.length
          });
        }

      } catch (batchError) {
        console.error(`❌ [Legal Lens] Batch ${batchIndex} Fehler:`, batchError.message);
        sendEvent('warning', { message: `Batch ${batchIndex} konnte nicht analysiert werden` });
      }

      // Kleine Pause zwischen Batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Finale Zusammenfassung
    sendEvent('status', { message: 'Finalisiere Analyse...', progress: 85 });

    // ===== FINALE COVERAGE-PRÜFUNG =====
    // Vergleiche extrahierten Text mit Originaltext
    const originalTextLength = text.length;
    const extractedTextLength = allClauses.reduce((sum, c) => sum + (c.text?.length || 0), 0);
    const textCoveragePercent = Math.round((extractedTextLength / originalTextLength) * 100);
    const blockCoveragePercent = Math.round((allClauses.length / rawBlocks.length) * 100);

    // Zähle "gerettete" Klauseln
    const recoveredCount = allClauses.filter(c => c.recovered).length;

    console.log(`📊 [Coverage] Text: ${textCoveragePercent}% (${extractedTextLength}/${originalTextLength} Zeichen)`);
    console.log(`📊 [Coverage] Blöcke: ${blockCoveragePercent}% (${allClauses.length}/${rawBlocks.length})`);
    if (recoveredCount > 0) {
      console.log(`📊 [Coverage] ${recoveredCount} Klauseln wurden aus verwaisten Blöcken gerettet`);
    }

    // Warnung bei niedriger Coverage
    if (textCoveragePercent < 80) {
      console.warn(`⚠️ [Coverage] WARNUNG: Nur ${textCoveragePercent}% des Textes wurde erfasst!`);
      sendEvent('warning', {
        type: 'low_coverage',
        message: `Hinweis: ${textCoveragePercent}% des Vertragstextes wurden analysiert. Einige Abschnitte könnten fehlen.`,
        textCoverage: textCoveragePercent,
        blockCoverage: blockCoveragePercent
      });
    }

    const riskSummary = {
      high: allClauses.filter(c => c.riskLevel === 'high' && !c.nonAnalyzable).length,
      medium: allClauses.filter(c => c.riskLevel === 'medium' && !c.nonAnalyzable).length,
      low: allClauses.filter(c => c.riskLevel === 'low' && !c.nonAnalyzable).length
    };

    // Ergebnis in DB cachen für nächstes Mal
    sendEvent('status', { message: 'Speichere Ergebnisse...', progress: 95 });

    try {
      await Contract.updateOne(
        { _id: new ObjectId(contractId) },
        {
          $set: {
            'legalLens.preParsedClauses': allClauses,
            'legalLens.riskSummary': riskSummary,
            'legalLens.metadata': {
              parsedAt: new Date().toISOString(),
              parserVersion: '2.1.0-coverage-verified',
              cacheVersion: CACHE_VERSION, // Für automatische Invalidierung bei Code-Updates
              usedGPT: true,
              blockCount: rawBlocks.length,
              batchCount: batches.length,
              // Coverage-Metriken für Qualitätssicherung
              coverage: {
                textPercent: textCoveragePercent,
                blockPercent: blockCoveragePercent,
                originalLength: originalTextLength,
                extractedLength: extractedTextLength,
                recoveredClauses: recoveredCount
              }
            },
            'legalLens.preprocessStatus': 'completed',
            'legalLens.preprocessedAt': new Date()
          }
        }
      );
      console.log(`✅ [Legal Lens] Cache gespeichert: ${allClauses.length} Klauseln für Contract ${contractId}`);
    } catch (dbError) {
      console.error(`⚠️ [Legal Lens] Cache-Fehler:`, dbError.message);
      console.error(`⚠️ [Legal Lens] Error Details:`, JSON.stringify({
        name: dbError.name,
        code: dbError.code,
        path: dbError.path,
        kind: dbError.kind,
        clauseCount: allClauses.length,
        firstClauseKeys: allClauses[0] ? Object.keys(allClauses[0]) : []
      }, null, 2));
    }

    // Finale Nachricht mit Coverage-Info
    sendEvent('complete', {
      success: true,
      totalClauses: allClauses.length,
      riskSummary,
      source: 'streaming',
      coverage: {
        textPercent: textCoveragePercent,
        blockPercent: blockCoveragePercent,
        recoveredClauses: recoveredCount,
        verified: textCoveragePercent >= 80
      }
    });

    console.log(`✅ [Legal Lens] Streaming complete: ${allClauses.length} Klauseln`);

  } catch (error) {
    console.error('❌ [Legal Lens] Streaming error:', error);
    sendEvent('error', { error: error.message });
  }

  res.end();
});

// ============================================
// CLEAR CACHE & FORCE RE-PARSE
// ============================================

/**
 * POST /api/legal-lens/:contractId/clear-cache
 *
 * Löscht den Legal Lens Cache für einen Vertrag und erzwingt Neuanalyse.
 * Nützlich wenn die ursprüngliche Analyse fehlerhaft war.
 */
router.post('/:contractId/clear-cache', verifyToken, async (req, res) => {
  try {
    const { contractId } = req.params;
    const userId = req.user.userId;

    console.log(`🗑️ [Legal Lens] Clear cache request for contract: ${contractId}`);

    // Vertrag finden und prüfen ob User Zugriff hat
    const contract = await Contract.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        error: 'Vertrag nicht gefunden'
      });
    }

    // Cache löschen
    await Contract.updateOne(
      { _id: new ObjectId(contractId) },
      {
        $unset: {
          'legalLens.preParsedClauses': '',
          'legalLens.riskSummary': '',
          'legalLens.metadata': '',
          'legalLens.preprocessedAt': ''
        },
        $set: {
          'legalLens.preprocessStatus': null
        }
      }
    );

    console.log(`✅ [Legal Lens] Cache cleared for contract ${contractId}`);

    res.json({
      success: true,
      message: 'Legal Lens Cache gelöscht. Bitte Legal Lens neu öffnen für frische Analyse.',
      contractId
    });

  } catch (error) {
    console.error('❌ [Legal Lens] Clear cache error:', error);
    res.status(500).json({
      success: false,
      error: 'Fehler beim Löschen des Caches'
    });
  }
});

module.exports = router;
