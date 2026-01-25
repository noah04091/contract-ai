// 📁 backend/routes/compare.js
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const pdfParse = require("pdf-parse");
const multer = require("multer");
const fs = require("fs");
const fsPromises = require("fs").promises;
const path = require("path");
const PDFDocument = require("pdfkit");
const { MongoClient, ObjectId } = require("mongodb");

const { isBusinessOrHigher, isEnterpriseOrHigher, getFeatureLimit } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure multer storage
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `contract-${uniqueSuffix}-${req.user.userId}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error("Nur PDF-Dateien sind erlaubt"));
    }
  }
});

// MongoDB connection
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);

let usersCollection, contractsCollection;
(async () => {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    usersCollection = db.collection("users");
    contractsCollection = db.collection("contracts");
    console.log("🧠 MongoDB verbunden (compare)");
  } catch (err) {
    console.error("❌ MongoDB-Fehler:", err);
  }
})();

// ✅ FIXED: Inline saveContract function (replaces external dependency)
const saveContract = async (contractData) => {
  try {
    const contractDoc = {
      userId: new ObjectId(contractData.userId),
      fileName: contractData.fileName,
      originalName: contractData.fileName,
      toolUsed: contractData.toolUsed || "contract_compare",
      filePath: contractData.filePath,
      fileSize: contractData.fileSize || 0,
      status: "processed",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...contractData.extraRefs
    };

    const result = await contractsCollection.insertOne(contractDoc);
    console.log(`✅ Contract saved: ${contractData.fileName} (ID: ${result.insertedId})`);
    
    return {
      success: true,
      contractId: result.insertedId,
      message: "Contract successfully saved"
    };
  } catch (error) {
    console.error("❌ Error saving contract:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Enhanced system prompts for different user profiles
const SYSTEM_PROMPTS = {
  individual: `
Du bist ein Experte für Vertragsrecht mit Fokus auf Verbraucherschutz.
Analysiere Verträge aus Sicht einer Privatperson und achte besonders auf:
- Verbraucherrechte und Widerrufsfristen
- Versteckte Kosten und automatische Verlängerungen
- Faire Kündigungsfristen
- Verständliche Sprache vs. komplizierte Klauseln
- Datenschutz und persönliche Rechte

Bewerte Risiken konservativ und erkläre komplexe Begriffe einfach.
`,
  freelancer: `
Du bist ein Experte für Vertragsrecht mit Fokus auf Freelancer-Geschäfte.
Analysiere Verträge aus Sicht eines Selbständigen und achte besonders auf:
- Haftungsbegrenzung und -ausschlüsse
- Zahlungsbedingungen und Verzugszinsen
- Intellectual Property und Urheberrechte
- Stornierungsklauseln und Schadenersatz
- Projektumfang und Änderungsklauseln
- Gewährleistung und Nachbesserungsrechte

Fokussiere auf finanzielle Risiken und Rechtssicherheit.
`,
  business: `
Du bist ein Experte für Unternehmensvertragsrecht.
Analysiere Verträge aus Sicht eines Unternehmens und achte besonders auf:
- Vollständige Risikoanalyse und Compliance
- Vertragsstrafen und Schadenersatzklauseln
- Force Majeure und höhere Gewalt
- Confidentiality und Non-Disclosure
- Gerichtsstand und anwendbares Recht
- Subunternehmer und Haftungsketten
- Performance-Garantien und SLAs

Berücksichtige sowohl operative als auch rechtliche Risiken.
`
};

// 🎯 Comparison Modes - Different analysis approaches
const COMPARISON_MODES = {
  standard: {
    name: 'Standard-Vergleich',
    description: 'Allgemeiner Vergleich zweier Verträge',
    promptAddition: `
VERGLEICHSMODUS: Standard-Vergleich
Vergleiche beide Verträge neutral und identifiziere alle relevanten Unterschiede.
Bewerte objektiv, welcher Vertrag insgesamt vorteilhafter ist.
`
  },
  version: {
    name: 'Versions-Vergleich',
    description: 'Alt vs. Neu - Änderungen zwischen Vertragsversionen',
    promptAddition: `
VERGLEICHSMODUS: Versions-Vergleich (Alt vs. Neu)
Vertrag 1 ist die ALTE Version, Vertrag 2 ist die NEUE Version.
Fokussiere besonders auf:
- Was wurde hinzugefügt? (neue Klauseln, erweiterte Rechte/Pflichten)
- Was wurde entfernt? (gestrichene Klauseln, reduzierte Garantien)
- Was wurde geändert? (modifizierte Bedingungen, neue Fristen)
- Sind die Änderungen zum Vorteil oder Nachteil des Vertragspartners?
- Gibt es versteckte Verschlechterungen?

Bewerte: Ist die neue Version besser oder schlechter für den Unterzeichner?
`
  },
  bestPractice: {
    name: 'Best-Practice Check',
    description: 'Prüfung gegen branchenübliche Standards',
    promptAddition: `
VERGLEICHSMODUS: Best-Practice Check
Vertrag 1 ist der zu prüfende Vertrag.
Vertrag 2 dient als Referenz/Template oder wird ignoriert falls leer.

Prüfe den Vertrag gegen branchenübliche Best Practices:
- Enthält er alle wichtigen Standardklauseln?
- Sind Formulierungen klar und eindeutig?
- Sind Fristen und Bedingungen marktüblich?
- Fehlen wichtige Schutzklauseln?
- Gibt es ungewöhnlich einseitige Regelungen?

Gib konkrete Verbesserungsvorschläge basierend auf Best Practices.
`
  },
  competition: {
    name: 'Anbieter-Vergleich',
    description: 'Vergleich von Angeboten verschiedener Anbieter',
    promptAddition: `
VERGLEICHSMODUS: Anbieter-/Wettbewerbs-Vergleich
Beide Verträge sind Angebote von verschiedenen Anbietern für ähnliche Leistungen.

Vergleiche besonders:
- Preis-Leistungs-Verhältnis
- Vertragslaufzeit und Kündigungsfristen
- Leistungsumfang und Garantien
- Haftung und Gewährleistung
- Zusatzkosten und versteckte Gebühren
- Flexibilität und Anpassungsmöglichkeiten
- Service-Level und Support

Erstelle eine klare Empfehlung: Welcher Anbieter bietet das bessere Gesamtpaket?
`
  }
};

// 🧠 Smart Chunking: Intelligent text preparation for large contracts
const CHUNK_CONFIG = {
  MAX_DIRECT_LENGTH: 6000,        // Under 6000 chars: use directly
  MAX_SINGLE_SUMMARY: 15000,      // 6000-15000 chars: single summary
  CHUNK_SIZE: 8000,               // For very large texts: chunk size
  MAX_CHUNKS: 4                   // Maximum chunks to process
};

async function summarizeContractChunk(text, chunkNumber = null, totalChunks = null) {
  const chunkInfo = chunkNumber ? `(Teil ${chunkNumber}/${totalChunks})` : '';

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    messages: [
      {
        role: "system",
        content: "Du bist ein Experte für Vertragsanalyse. Extrahiere die wichtigsten Klauseln und Bedingungen aus dem Vertragstext."
      },
      {
        role: "user",
        content: `Erstelle eine strukturierte Zusammenfassung dieses Vertragstexts ${chunkInfo}.
Fokussiere auf:
- Hauptpflichten der Parteien
- Zahlungsbedingungen und Fristen
- Kündigungsfristen und -bedingungen
- Haftungsklauseln und Gewährleistung
- Besondere Klauseln (Wettbewerbsverbot, Geheimhaltung, etc.)
- Laufzeit und Verlängerung

Fasse die wichtigsten Punkte kurz und präzise zusammen (max. 1500 Zeichen).

VERTRAGSTEXT:
"""
${text}
"""`
      }
    ],
    temperature: 0.2,
    max_tokens: 800,
  });

  return completion.choices[0].message.content;
}

async function prepareContractText(fullText) {
  const textLength = fullText.length;

  // Small text: use directly
  if (textLength <= CHUNK_CONFIG.MAX_DIRECT_LENGTH) {
    console.log(`📄 Text kurz genug (${textLength} Zeichen) - direkte Verwendung`);
    return fullText;
  }

  // Medium text: single summary
  if (textLength <= CHUNK_CONFIG.MAX_SINGLE_SUMMARY) {
    console.log(`📄 Mittlerer Text (${textLength} Zeichen) - erstelle Summary...`);
    const summary = await summarizeContractChunk(fullText);
    console.log(`✅ Summary erstellt (${summary.length} Zeichen)`);
    return summary;
  }

  // Large text: multi-chunk processing
  console.log(`📄 Großer Text (${textLength} Zeichen) - Multi-Chunk Verarbeitung...`);

  const chunks = [];
  const chunkSize = CHUNK_CONFIG.CHUNK_SIZE;
  const maxChunks = Math.min(
    Math.ceil(textLength / chunkSize),
    CHUNK_CONFIG.MAX_CHUNKS
  );

  // Calculate optimal chunk positions to cover the whole document
  const step = Math.floor(textLength / maxChunks);

  for (let i = 0; i < maxChunks; i++) {
    const start = i * step;
    const end = Math.min(start + chunkSize, textLength);
    chunks.push(fullText.substring(start, end));
  }

  console.log(`🔄 Verarbeite ${chunks.length} Chunks parallel...`);

  // Process all chunks in parallel
  const summaries = await Promise.all(
    chunks.map((chunk, idx) =>
      summarizeContractChunk(chunk, idx + 1, chunks.length)
    )
  );

  // Combine summaries
  const combined = summaries.join('\n\n--- Abschnitt ---\n\n');
  console.log(`✅ Alle Chunks zusammengefasst (${combined.length} Zeichen)`);

  return combined;
}

// Enhanced comparison analysis function with mode support
async function analyzeContracts(contract1Text, contract2Text, userProfile = 'individual', comparisonMode = 'standard') {
  const systemPrompt = SYSTEM_PROMPTS[userProfile] || SYSTEM_PROMPTS.individual;
  const modeConfig = COMPARISON_MODES[comparisonMode] || COMPARISON_MODES.standard;

  console.log(`🎯 Vergleichs-Modus: ${modeConfig.name}`);

  // 🧠 Smart Chunking: Prepare large contracts
  console.log("🧠 Smart Chunking: Bereite Verträge vor...");
  const [preparedText1, preparedText2] = await Promise.all([
    prepareContractText(contract1Text),
    prepareContractText(contract2Text)
  ]);
  console.log(`📊 Verarbeitet: V1=${preparedText1.length} chars, V2=${preparedText2.length} chars`);

  const analysisPrompt = `
${systemPrompt}

${modeConfig.promptAddition}

AUFGABE: Vergleiche diese zwei Verträge systematisch und erstelle eine strukturierte Analyse.

VERTRAG 1:
"""
${preparedText1}
"""

VERTRAG 2:
"""
${preparedText2}
"""

Erstelle eine JSON-Antwort mit folgender Struktur:

{
  "differences": [
    {
      "category": "Kategorie (z.B. Kündigung, Haftung, Zahlung, Leistung, Datenschutz)",
      "section": "Spezifischer Bereich (z.B. Kündigungsfristen)",
      "contract1": "Relevanter Text aus Vertrag 1",
      "contract2": "Relevanter Text aus Vertrag 2", 
      "severity": "low|medium|high|critical",
      "impact": "Beschreibung der praktischen Auswirkung",
      "recommendation": "Konkrete Empfehlung"
    }
  ],
  "contract1Analysis": {
    "strengths": ["Liste der Stärken"],
    "weaknesses": ["Liste der Schwächen"],
    "riskLevel": "low|medium|high",
    "score": "Numerischer Score von 0-100"
  },
  "contract2Analysis": {
    "strengths": ["Liste der Stärken"],
    "weaknesses": ["Liste der Schwächen"], 
    "riskLevel": "low|medium|high",
    "score": "Numerischer Score von 0-100"
  },
  "overallRecommendation": {
    "recommended": 1 oder 2,
    "reasoning": "Detaillierte Begründung der Empfehlung",
    "confidence": "Prozent-Wert 0-100"
  },
  "summary": "2-3 Sätze Zusammenfassung des Vergleichs"
}

WICHTIG:
- Mindestens 5-8 relevante Unterschiede identifizieren
- Severity realistische einschätzen (critical nur bei echten Risiken)
- Scores basierend auf objektiven Kriterien vergeben
- Konkrete, umsetzbare Empfehlungen geben
- Bei ${userProfile}-Profil entsprechend fokussieren
`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      messages: [
        { role: "system", content: "Du bist ein erfahrener Anwalt für Vertragsrecht. Antworte immer mit validen JSON ohne zusätzlichen Text." },
        { role: "user", content: analysisPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
    });

    const response = completion.choices[0].message.content;
    
    // Clean up the response and parse JSON
    const cleanedResponse = response.replace(/```json\n?|\n?```/g, '').trim();
    const analysis = JSON.parse(cleanedResponse);
    
    // Validate and enhance the analysis
    return enhanceAnalysis(analysis);
    
  } catch (error) {
    console.error("❌ OpenAI API Fehler:", error);
    throw new Error("Fehler bei der KI-Analyse: " + error.message);
  }
}

// Function to enhance and validate the analysis
function enhanceAnalysis(analysis) {
  // Ensure minimum required differences
  if (analysis.differences.length < 3) {
    // Add some generic differences if too few found
    analysis.differences.push({
      category: "Allgemeine Bedingungen",
      section: "Vertragsstruktur",
      contract1: "Strukturierter Aufbau",
      contract2: "Komplexere Struktur",
      severity: "low",
      impact: "Unterschiedliche Lesbarkeit und Verständlichkeit",
      recommendation: "Prüfen Sie beide Verträge sorgfältig auf Vollständigkeit"
    });
  }

  // Ensure scores are in valid range
  analysis.contract1Analysis.score = Math.max(0, Math.min(100, analysis.contract1Analysis.score || 50));
  analysis.contract2Analysis.score = Math.max(0, Math.min(100, analysis.contract2Analysis.score || 50));
  
  // Ensure confidence is in valid range
  analysis.overallRecommendation.confidence = Math.max(0, Math.min(100, analysis.overallRecommendation.confidence || 75));
  
  // Add categories array
  analysis.categories = [...new Set(analysis.differences.map(d => d.category))];
  
  return analysis;
}

// 📡 SSE Progress Helper
const sendProgress = (res, step, progress, message, isSSE = false) => {
  if (isSSE) {
    res.write(`data: ${JSON.stringify({ type: 'progress', step, progress, message })}\n\n`);
  }
  console.log(`📊 [${progress}%] ${step}: ${message}`);
};

// Main comparison endpoint with SSE support
router.post("/", verifyToken, upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 }
]), async (req, res) => {
  // Check if client wants SSE (streaming progress)
  const wantsSSE = req.headers.accept?.includes('text/event-stream') || req.query.stream === 'true';

  if (wantsSSE) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();
  }

  try {
    console.log("🚀 Contract comparison started" + (wantsSSE ? " (SSE Mode)" : ""));
    sendProgress(res, 'init', 5, 'Vergleich wird gestartet...', wantsSSE);

    // Check if files were uploaded
    if (!req.files || !req.files.file1 || !req.files.file2) {
      const error = { message: "Beide Vertragsdateien müssen hochgeladen werden" };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(400).json(error);
    }

    sendProgress(res, 'auth', 10, 'Authentifizierung wird geprüft...', wantsSSE);

    // Get user info and check premium status
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      const error = { message: "Nutzer nicht gefunden" };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(404).json(error);
    }

    const isPremium = user.subscriptionActive === true || user.isPremium === true;
    if (!isPremium) {
      const error = { message: "Premium-Funktion erforderlich" };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(403).json(error);
    }

    // Check usage limits
    const plan = user.subscriptionPlan || "free";
    const compareCount = user.compareCount || 0;

    // Limit aus zentraler Konfiguration (subscriptionPlans.js)
    const limit = getFeatureLimit(plan, 'compare');

    if (compareCount >= limit && !isEnterpriseOrHigher(plan)) {
      const error = { message: "❌ Vergleichs-Limit erreicht. Bitte Paket upgraden." };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(403).json(error);
    }

    // Get user profile from request
    const userProfile = req.body.userProfile || 'individual';
    if (!['individual', 'freelancer', 'business'].includes(userProfile)) {
      const error = { message: "Ungültiges Nutzerprofil" };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(400).json(error);
    }

    // 🎯 Get comparison mode from request
    const comparisonMode = req.body.comparisonMode || 'standard';
    const validModes = ['standard', 'version', 'bestPractice', 'competition'];
    if (!validModes.includes(comparisonMode)) {
      const error = { message: "Ungültiger Vergleichs-Modus" };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(400).json(error);
    }

    const file1 = req.files.file1[0];
    const file2 = req.files.file2[0];

    console.log(`📄 Processing files: ${file1.originalname} & ${file2.originalname} (Mode: ${comparisonMode})`);
    sendProgress(res, 'mode', 12, `Modus: ${COMPARISON_MODES[comparisonMode].name}`, wantsSSE);
    sendProgress(res, 'parsing', 15, 'PDFs werden gelesen...', wantsSSE);

    // Parse PDF contents (async for better performance)
    const [buffer1, buffer2] = await Promise.all([
      fsPromises.readFile(file1.path),
      fsPromises.readFile(file2.path)
    ]);

    sendProgress(res, 'extracting', 25, 'Text wird extrahiert...', wantsSSE);

    const pdfData1 = await pdfParse(buffer1);
    const pdfData2 = await pdfParse(buffer2);

    const contract1Text = pdfData1.text.trim();
    const contract2Text = pdfData2.text.trim();

    if (!contract1Text || !contract2Text) {
      const error = { message: "Mindestens eine PDF-Datei konnte nicht gelesen werden oder ist leer" };
      if (wantsSSE) {
        res.write(`data: ${JSON.stringify({ type: 'error', ...error })}\n\n`);
        return res.end();
      }
      return res.status(400).json(error);
    }

    console.log(`📝 Text extracted: Contract 1 (${contract1Text.length} chars), Contract 2 (${contract2Text.length} chars)`);
    sendProgress(res, 'chunking', 35, 'Verträge werden vorbereitet...', wantsSSE);

    // Perform AI analysis with progress updates
    sendProgress(res, 'analyzing', 50, `KI-Analyse läuft (${COMPARISON_MODES[comparisonMode].name})...`, wantsSSE);
    console.log("🤖 Starting AI analysis...");
    const analysisResult = await analyzeContracts(contract1Text, contract2Text, userProfile, comparisonMode);

    // Add mode info to result
    analysisResult.comparisonMode = {
      id: comparisonMode,
      name: COMPARISON_MODES[comparisonMode].name,
      description: COMPARISON_MODES[comparisonMode].description
    };

    sendProgress(res, 'saving', 85, 'Ergebnis wird gespeichert...', wantsSSE);
    // ✅ FIXED: Save contracts and analysis to database with proper error handling
    console.log("💾 Saving contracts to database...");
    try {
      const comparisonId = new ObjectId();
      
      await Promise.all([
        saveContract({
          userId: req.user.userId,
          fileName: file1.originalname,
          toolUsed: "contract_compare",
          filePath: file1.path,
          fileSize: file1.size,
          extraRefs: {
            comparisonId: comparisonId,
            role: "contract1",
            userProfile,
            pageCount: pdfData1.numpages || 1
          }
        }),
        saveContract({
          userId: req.user.userId,
          fileName: file2.originalname,
          toolUsed: "contract_compare",
          filePath: file2.path,
          fileSize: file2.size,
          extraRefs: {
            comparisonId: comparisonId,
            role: "contract2", 
            userProfile,
            pageCount: pdfData2.numpages || 1
          }
        })
      ]);

      console.log("✅ Contracts saved successfully");
    } catch (saveError) {
      console.error("⚠️ Warning: Could not save contracts to database:", saveError.message);
      // Continue with the comparison even if saving fails
    }

    // Log the comparison activity
    try {
      await contractsCollection.insertOne({
        userId: new ObjectId(req.user.userId),
        action: "compare_contracts",
        tool: "contract_compare",
        userProfile,
        comparisonMode,
        file1Name: file1.originalname,
        file2Name: file2.originalname,
        recommendedContract: analysisResult.overallRecommendation.recommended,
        confidence: analysisResult.overallRecommendation.confidence,
        differencesCount: analysisResult.differences.length,
        timestamp: new Date()
      });
    } catch (logError) {
      console.error("⚠️ Warning: Could not log comparison activity:", logError.message);
    }

    // Update usage count
    try {
      await usersCollection.updateOne(
        { _id: user._id },
        { $inc: { compareCount: 1 } }
      );
    } catch (updateError) {
      console.error("⚠️ Warning: Could not update usage count:", updateError.message);
    }

    // 🛡️ DSGVO-Compliance: Sofortige Dateilöschung nach Verarbeitung
    sendProgress(res, 'cleanup', 95, 'Aufräumen...', wantsSSE);
    console.log("🗑️ Lösche temporäre Dateien (DSGVO-konform)...");
    try {
      await Promise.all([
        fsPromises.unlink(file1.path),
        fsPromises.unlink(file2.path)
      ]);
      console.log("✅ Temporäre Dateien gelöscht");
    } catch (cleanupErr) {
      console.error("⚠️ File cleanup warning:", cleanupErr.message);
    }

    console.log("✅ Comparison completed successfully");

    // Send final result
    if (wantsSSE) {
      sendProgress(res, 'complete', 100, 'Analyse abgeschlossen!', true);
      res.write(`data: ${JSON.stringify({ type: 'result', data: analysisResult })}\n\n`);
      res.end();
    } else {
      res.json(analysisResult);
    }

  } catch (error) {
    console.error("❌ Comparison error:", error);

    // Clean up files on error (async)
    if (req.files) {
      const cleanupPromises = Object.values(req.files).flat().map(file =>
        fsPromises.unlink(file.path).catch(err =>
          console.log("🗑️ Error cleanup warning:", err.message)
        )
      );
      await Promise.all(cleanupPromises);
    }

    const errorResponse = {
      message: "Fehler beim Vertragsvergleich: " + (error.message || "Unbekannter Fehler")
    };

    if (wantsSSE) {
      res.write(`data: ${JSON.stringify({ type: 'error', ...errorResponse })}\n\n`);
      res.end();
    } else {
      res.status(500).json(errorResponse);
    }
  }
});

// Get user's comparison history
router.get("/history", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "Nutzer nicht gefunden" });
    }

    const isPremium = user.subscriptionActive === true || user.isPremium === true;
    if (!isPremium) {
      return res.status(403).json({ message: "Premium-Funktion erforderlich" });
    }

    // Get comparison history
    const history = await contractsCollection
      .find({ 
        userId: new ObjectId(req.user.userId), 
        action: "compare_contracts" 
      })
      .sort({ timestamp: -1 })
      .limit(20)
      .toArray();

    res.json({
      history: history.map(h => ({
        id: h._id,
        file1Name: h.file1Name,
        file2Name: h.file2Name,
        userProfile: h.userProfile,
        recommendedContract: h.recommendedContract,
        confidence: h.confidence,
        differencesCount: h.differencesCount,
        timestamp: h.timestamp
      })),
      totalComparisons: user.compareCount || 0,
      remainingComparisons: (() => {
        const plan = user.subscriptionPlan || "free";
        const used = user.compareCount || 0;
        const limit = getFeatureLimit(plan, 'compare');
        if (limit === Infinity) return "unlimited";
        return Math.max(0, limit - used);
      })()
    });

  } catch (error) {
    console.error("❌ History fetch error:", error);
    res.status(500).json({ message: "Fehler beim Laden der Historie" });
  }
});

// Get usage statistics
router.get("/stats", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "Nutzer nicht gefunden" });
    }

    const isPremium = user.subscriptionActive === true || user.isPremium === true;
    if (!isPremium) {
      return res.status(403).json({ message: "Premium-Funktion erforderlich" });
    }

    // Get usage statistics
    const stats = await contractsCollection.aggregate([
      { $match: { userId: new ObjectId(req.user.userId), action: "compare_contracts" } },
      {
        $group: {
          _id: null,
          totalComparisons: { $sum: 1 },
          avgConfidence: { $avg: "$confidence" },
          mostUsedProfile: { $push: "$userProfile" },
          contract1Wins: {
            $sum: { $cond: [{ $eq: ["$recommendedContract", 1] }, 1, 0] }
          },
          contract2Wins: {
            $sum: { $cond: [{ $eq: ["$recommendedContract", 2] }, 1, 0] }
          }
        }
      }
    ]).toArray();

    const result = stats[0] || {
      totalComparisons: 0,
      avgConfidence: 0,
      mostUsedProfile: [],
      contract1Wins: 0,
      contract2Wins: 0
    };

    // Find most used profile
    const profileCounts = {};
    result.mostUsedProfile.forEach(profile => {
      profileCounts[profile] = (profileCounts[profile] || 0) + 1;
    });
    const mostUsedProfile = Object.entries(profileCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'individual';

    res.json({
      totalComparisons: result.totalComparisons,
      avgConfidence: Math.round(result.avgConfidence || 0),
      mostUsedProfile,
      preferenceStats: {
        contract1Preferred: result.contract1Wins,
        contract2Preferred: result.contract2Wins,
        contract1Percentage: result.totalComparisons > 0 
          ? Math.round((result.contract1Wins / result.totalComparisons) * 100) 
          : 0
      }
    });

  } catch (error) {
    console.error("❌ Stats fetch error:", error);
    res.status(500).json({ message: "Fehler beim Laden der Statistiken" });
  }
});

// 📄 PDF Export Endpoint
router.post("/export-pdf", verifyToken, async (req, res) => {
  try {
    // Verify premium status
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "Nutzer nicht gefunden" });
    }

    const isPremium = user.subscriptionActive === true || user.isPremium === true;
    if (!isPremium) {
      return res.status(403).json({ message: "PDF-Export ist ein Premium-Feature" });
    }

    const { result, file1Name, file2Name } = req.body;

    if (!result || !result.differences || !result.contract1Analysis || !result.contract2Analysis) {
      return res.status(400).json({ message: "Ungültige Vergleichsdaten" });
    }

    console.log("📄 Generating PDF export...");

    // Create PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: {
        Title: 'Vertragsvergleich - Contract AI',
        Author: 'Contract AI',
        Subject: 'Vertragsvergleich',
        CreationDate: new Date()
      }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Vertragsvergleich_${new Date().toISOString().split('T')[0]}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Colors
    const primaryColor = '#0071e3';
    const successColor = '#34c759';
    const warningColor = '#ff9500';
    const dangerColor = '#ff453a';
    const textColor = '#1d1d1f';
    const mutedColor = '#6e6e73';

    // Helper function for severity colors
    const getSeverityColor = (severity) => {
      switch (severity) {
        case 'low': return successColor;
        case 'medium': return warningColor;
        case 'high': return dangerColor;
        case 'critical': return '#d70015';
        default: return mutedColor;
      }
    };

    // === HEADER ===
    doc.fontSize(28)
       .fillColor(primaryColor)
       .text('Vertragsvergleich', { align: 'center' });

    doc.moveDown(0.5);
    doc.fontSize(12)
       .fillColor(mutedColor)
       .text(`Erstellt am ${new Date().toLocaleDateString('de-DE')} mit Contract AI`, { align: 'center' });

    doc.moveDown(1);

    // === FILE NAMES ===
    if (file1Name || file2Name) {
      doc.fontSize(10)
         .fillColor(mutedColor)
         .text(`Vertrag 1: ${file1Name || 'Unbekannt'}`, { align: 'left' })
         .text(`Vertrag 2: ${file2Name || 'Unbekannt'}`, { align: 'left' });
      doc.moveDown(1);
    }

    // === RECOMMENDATION BOX ===
    const recY = doc.y;
    doc.rect(50, recY, 495, 80)
       .fill('#f0f7ff');

    doc.fontSize(16)
       .fillColor(primaryColor)
       .text(`Empfehlung: Vertrag ${result.overallRecommendation.recommended}`, 70, recY + 15);

    doc.fontSize(11)
       .fillColor(textColor)
       .text(result.overallRecommendation.reasoning, 70, recY + 40, { width: 455 });

    doc.fontSize(10)
       .fillColor(mutedColor)
       .text(`Vertrauen: ${result.overallRecommendation.confidence}%`, 70, recY + 60);

    doc.y = recY + 95;
    doc.moveDown(1);

    // === SCORES COMPARISON ===
    doc.fontSize(16)
       .fillColor(textColor)
       .text('Bewertung im Vergleich', { underline: true });
    doc.moveDown(0.5);

    // Contract 1 Score
    const score1Color = result.contract1Analysis.riskLevel === 'low' ? successColor :
                        result.contract1Analysis.riskLevel === 'medium' ? warningColor : dangerColor;
    doc.fontSize(14)
       .fillColor(score1Color)
       .text(`Vertrag 1: ${result.contract1Analysis.score}/100`, { continued: true })
       .fillColor(mutedColor)
       .text(` (Risiko: ${result.contract1Analysis.riskLevel === 'low' ? 'Niedrig' :
              result.contract1Analysis.riskLevel === 'medium' ? 'Mittel' : 'Hoch'})`);

    if (result.overallRecommendation.recommended === 1) {
      doc.fontSize(10).fillColor(successColor).text('  ★ Empfohlen');
    }
    doc.moveDown(0.3);

    // Contract 2 Score
    const score2Color = result.contract2Analysis.riskLevel === 'low' ? successColor :
                        result.contract2Analysis.riskLevel === 'medium' ? warningColor : dangerColor;
    doc.fontSize(14)
       .fillColor(score2Color)
       .text(`Vertrag 2: ${result.contract2Analysis.score}/100`, { continued: true })
       .fillColor(mutedColor)
       .text(` (Risiko: ${result.contract2Analysis.riskLevel === 'low' ? 'Niedrig' :
              result.contract2Analysis.riskLevel === 'medium' ? 'Mittel' : 'Hoch'})`);

    if (result.overallRecommendation.recommended === 2) {
      doc.fontSize(10).fillColor(successColor).text('  ★ Empfohlen');
    }
    doc.moveDown(1.5);

    // === STRENGTHS & WEAKNESSES ===
    doc.fontSize(16)
       .fillColor(textColor)
       .text('Stärken & Schwächen', { underline: true });
    doc.moveDown(0.5);

    // Vertrag 1
    doc.fontSize(13).fillColor(primaryColor).text('Vertrag 1');
    doc.fontSize(11).fillColor(successColor).text('Stärken:', { continued: false });
    result.contract1Analysis.strengths.slice(0, 3).forEach(s => {
      doc.fontSize(10).fillColor(textColor).text(`  • ${s}`);
    });
    doc.fontSize(11).fillColor(dangerColor).text('Schwächen:', { continued: false });
    result.contract1Analysis.weaknesses.slice(0, 3).forEach(w => {
      doc.fontSize(10).fillColor(textColor).text(`  • ${w}`);
    });
    doc.moveDown(0.5);

    // Vertrag 2
    doc.fontSize(13).fillColor(primaryColor).text('Vertrag 2');
    doc.fontSize(11).fillColor(successColor).text('Stärken:', { continued: false });
    result.contract2Analysis.strengths.slice(0, 3).forEach(s => {
      doc.fontSize(10).fillColor(textColor).text(`  • ${s}`);
    });
    doc.fontSize(11).fillColor(dangerColor).text('Schwächen:', { continued: false });
    result.contract2Analysis.weaknesses.slice(0, 3).forEach(w => {
      doc.fontSize(10).fillColor(textColor).text(`  • ${w}`);
    });
    doc.moveDown(1.5);

    // === NEW PAGE FOR DIFFERENCES ===
    doc.addPage();

    doc.fontSize(16)
       .fillColor(textColor)
       .text('Wichtigste Unterschiede', { underline: true });
    doc.moveDown(0.5);

    // List differences
    result.differences.forEach((diff, index) => {
      // Check if we need a new page
      if (doc.y > 700) {
        doc.addPage();
      }

      const diffY = doc.y;
      const severityColor = getSeverityColor(diff.severity);

      // Category & Section
      doc.fontSize(12)
         .fillColor(primaryColor)
         .text(`${index + 1}. ${diff.section}`, { continued: true })
         .fontSize(9)
         .fillColor(mutedColor)
         .text(`  [${diff.category}]`);

      // Severity badge
      doc.fontSize(9)
         .fillColor(severityColor)
         .text(`Schweregrad: ${diff.severity.toUpperCase()}`);

      // Impact
      doc.fontSize(10)
         .fillColor(textColor)
         .text(diff.impact, { width: 495 });

      // Recommendation
      doc.fontSize(10)
         .fillColor(primaryColor)
         .text(`→ ${diff.recommendation}`, { width: 495 });

      doc.moveDown(0.8);
    });

    // === FOOTER ON LAST PAGE ===
    doc.moveDown(2);

    // Summary
    if (result.summary) {
      doc.fontSize(14)
         .fillColor(textColor)
         .text('Zusammenfassung', { underline: true });
      doc.moveDown(0.3);
      doc.fontSize(10)
         .fillColor(mutedColor)
         .text(result.summary, { width: 495 });
      doc.moveDown(1);
    }

    // Footer
    doc.fontSize(9)
       .fillColor(mutedColor)
       .text('─'.repeat(80), { align: 'center' });
    doc.text('Erstellt mit Contract AI - www.contract-ai.de', { align: 'center' });
    doc.text('Dieser Bericht dient nur zur Information und ersetzt keine Rechtsberatung.', { align: 'center' });

    // Finalize PDF
    doc.end();

    console.log("✅ PDF export completed");

  } catch (error) {
    console.error("❌ PDF export error:", error);
    res.status(500).json({ message: "Fehler beim PDF-Export: " + error.message });
  }
});

module.exports = router;