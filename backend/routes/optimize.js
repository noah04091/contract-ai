// 📁 backend/routes/optimize.js - ENHANCED: Mit intelligenter Vertragstyp-Erkennung & dynamischen Kategorien
const express = require("express");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs").promises;
const fsSync = require("fs");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const { ObjectId } = require("mongodb");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ✅ SINGLETON OpenAI-Instance
let openaiInstance = null;
const getOpenAI = () => {
  if (!openaiInstance) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API Key fehlt in Umgebungsvariablen");
    }
    openaiInstance = new OpenAI({ 
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 60000,
      maxRetries: 3
    });
    console.log("🔧 OpenAI-Instance für Optimierung initialisiert");
  }
  return openaiInstance;
};

// 🎯 NEU: Vertragstyp-Erkennung mit dynamischen Kategorien
const detectContractType = async (contractText) => {
  const openai = getOpenAI();
  
  const detectionPrompt = `Analysiere den folgenden Vertragstext und identifiziere:
1. Den exakten Vertragstyp (z.B. Arbeitsvertrag, Mietvertrag, NDA, Kaufvertrag, Dienstleistungsvertrag, etc.)
2. Die 3-7 wichtigsten Kategorien für Optimierungen bei diesem Vertragstyp
3. Eine kurze Beschreibung des Vertrags

VERTRAGSTEXT (Auszug):
${contractText.slice(0, 3000)}

ANTWORTFORMAT (JSON):
{
  "contractType": "Exakter Vertragstyp",
  "contractTypeEN": "contract_type_key",
  "description": "Kurze Beschreibung",
  "confidence": 85,
  "categories": [
    {
      "id": "category_key",
      "name": "Kategoriename Deutsch",
      "nameEN": "Category Name",
      "icon": "icon_suggestion",
      "description": "Was wird in dieser Kategorie optimiert",
      "priority": "high/medium/low"
    }
  ],
  "additionalInsights": "Besondere Merkmale oder Auffälligkeiten"
}

WICHTIG: 
- Wähle Kategorien, die SPEZIFISCH für diesen Vertragstyp sind
- Bei Arbeitsverträgen: Kündigung, Vergütung, Arbeitszeit, Urlaub, Probezeit, etc.
- Bei Mietverträgen: Mietzins, Nebenkosten, Kaution, Schönheitsreparaturen, etc.
- Bei NDAs: Geheimhaltungspflicht, Vertragsdauer, Vertragsstrafe, Ausnahmen, etc.
- Bei Kaufverträgen: Kaufpreis, Gewährleistung, Lieferung, Eigentumsvorbehalt, etc.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { 
          role: "system", 
          content: "Du bist ein Experte für Vertragsanalyse mit 20+ Jahren Erfahrung in verschiedenen Rechtsbereichen. Du erkennst Vertragstypen präzise und weißt genau, welche Aspekte bei jedem Vertragstyp kritisch sind." 
        },
        { role: "user", content: detectionPrompt }
      ],
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const result = completion.choices[0].message.content;
    const parsed = JSON.parse(result);
    
    // Fallback für fehlende Felder
    if (!parsed.categories || parsed.categories.length === 0) {
      parsed.categories = getDefaultCategoriesForType(parsed.contractType || "Standard");
    }
    
    console.log(`✅ Vertragstyp erkannt: ${parsed.contractType} (Confidence: ${parsed.confidence}%)`);
    console.log(`📊 Kategorien: ${parsed.categories.map(c => c.name).join(", ")}`);
    
    return parsed;
  } catch (error) {
    console.error("❌ Fehler bei Vertragstyp-Erkennung:", error);
    // Fallback auf Standard-Kategorien
    return {
      contractType: "Standardvertrag",
      contractTypeEN: "standard_contract",
      description: "Allgemeiner Vertrag",
      confidence: 50,
      categories: getDefaultCategoriesForType("Standard"),
      additionalInsights: "Automatische Erkennung fehlgeschlagen - Standard-Kategorien verwendet"
    };
  }
};

// 🔧 Fallback-Kategorien basierend auf Vertragstyp
const getDefaultCategoriesForType = (contractType) => {
  const typeCategories = {
    "Arbeitsvertrag": [
      { id: "termination", name: "Kündigungsfristen", nameEN: "Termination", icon: "clock", priority: "high" },
      { id: "salary", name: "Vergütung", nameEN: "Compensation", icon: "euro", priority: "high" },
      { id: "working_hours", name: "Arbeitszeit", nameEN: "Working Hours", icon: "calendar", priority: "medium" },
      { id: "vacation", name: "Urlaub", nameEN: "Vacation", icon: "beach", priority: "medium" },
      { id: "probation", name: "Probezeit", nameEN: "Probation", icon: "timer", priority: "medium" }
    ],
    "Mietvertrag": [
      { id: "rent", name: "Mietzins", nameEN: "Rent", icon: "home", priority: "high" },
      { id: "utilities", name: "Nebenkosten", nameEN: "Utilities", icon: "receipt", priority: "high" },
      { id: "deposit", name: "Kaution", nameEN: "Deposit", icon: "savings", priority: "medium" },
      { id: "termination", name: "Kündigung", nameEN: "Termination", icon: "clock", priority: "high" },
      { id: "repairs", name: "Schönheitsreparaturen", nameEN: "Repairs", icon: "build", priority: "medium" }
    ],
    "NDA": [
      { id: "confidentiality", name: "Geheimhaltungspflicht", nameEN: "Confidentiality", icon: "lock", priority: "high" },
      { id: "duration", name: "Vertragsdauer", nameEN: "Duration", icon: "schedule", priority: "high" },
      { id: "penalties", name: "Vertragsstrafe", nameEN: "Penalties", icon: "gavel", priority: "medium" },
      { id: "exceptions", name: "Ausnahmen", nameEN: "Exceptions", icon: "rule", priority: "medium" }
    ],
    "Kaufvertrag": [
      { id: "price", name: "Kaufpreis", nameEN: "Price", icon: "payments", priority: "high" },
      { id: "warranty", name: "Gewährleistung", nameEN: "Warranty", icon: "verified", priority: "high" },
      { id: "delivery", name: "Lieferung", nameEN: "Delivery", icon: "local_shipping", priority: "medium" },
      { id: "ownership", name: "Eigentumsvorbehalt", nameEN: "Ownership", icon: "vpn_key", priority: "medium" }
    ],
    "Standard": [
      { id: "termination", name: "Kündigung", nameEN: "Termination", icon: "clock", priority: "high" },
      { id: "liability", name: "Haftung", nameEN: "Liability", icon: "shield", priority: "high" },
      { id: "payment", name: "Zahlung", nameEN: "Payment", icon: "euro", priority: "medium" },
      { id: "compliance", name: "Compliance", nameEN: "Compliance", icon: "verified", priority: "medium" },
      { id: "clarity", name: "Klarheit", nameEN: "Clarity", icon: "visibility", priority: "low" }
    ]
  };
  
  // Versuche exakte Übereinstimmung
  for (const [key, categories] of Object.entries(typeCategories)) {
    if (contractType.toLowerCase().includes(key.toLowerCase())) {
      return categories;
    }
  }
  
  // Fallback auf Standard
  return typeCategories.Standard;
};

// ✅ ENHANCED: Dynamischer Optimierungs-Prompt basierend auf Vertragstyp
const createDynamicOptimizationPrompt = (contractText, contractTypeInfo) => {
  const { contractType, categories, description } = contractTypeInfo;
  
  // Erstelle kategorie-spezifische Analyse-Anweisungen
  const categoryAnalysis = categories.map(cat => `
${cat.name.toUpperCase()} (${cat.nameEN}):
- Analysiere alle Aspekte zu ${cat.description || cat.name}
- Priorität: ${cat.priority}
- Prüfe auf Marktüblichkeit und rechtliche Standards
- Identifiziere konkrete Verbesserungsmöglichkeiten`).join('\n');

  return `Du bist ein spezialisierter Rechtsanwalt für ${contractType} mit 20+ Jahren Erfahrung.
Analysiere den folgenden ${contractType} und erstelle detaillierte, praxisorientierte Optimierungsvorschläge.

VERTRAGSTYP: ${contractType}
BESCHREIBUNG: ${description}

VERTRAG:
${contractText}

AUFGABE:
Analysiere den Vertrag systematisch in den folgenden vertragstyp-spezifischen Bereichen:

${categoryAnalysis}

ZUSÄTZLICH:
- Falls du wichtige Optimierungen findest, die NICHT in die obigen Kategorien passen, liste sie unter "SONSTIGE OPTIMIERUNGEN"
- Jede Optimierung muss konkret und umsetzbar sein

FORMAT für JEDE Optimierung:
[KATEGORIE: Eine der obigen Kategorien oder "Sonstige"]
PROBLEM: [Konkretes Problem im aktuellen Vertrag]
ORIGINALTEXT: [Exakter Textauszug aus dem Vertrag]
EMPFEHLUNG: [Konkreter verbesserter Textvorschlag]
BEGRÜNDUNG: [Rechtliche und praktische Begründung]
PRIORITÄT: [Kritisch/Hoch/Mittel/Niedrig]
MARKTVERGLEICH: [Wie machen es andere/was ist üblich]
GESCHÄTZTER NUTZEN: [Finanziell oder qualitativ]
UMSETZUNG: [Einfach/Mittel/Komplex]
---

WICHTIG:
- Fokussiere auf die wichtigsten 5-10 Optimierungen
- Sei spezifisch für ${contractType}
- Nutze Branchenwissen und aktuelle Rechtsprechung
- Formuliere konkrete Textvorschläge, keine vagen Empfehlungen`;
};

// ✅ ENHANCED: Strukturierte Parsing der Optimierungen
const parseStructuredOptimizations = (aiText, categories) => {
  const optimizations = [];
  
  // Erstelle Kategorie-Map für schnelles Lookup
  const categoryMap = {};
  categories.forEach(cat => {
    categoryMap[cat.id] = cat;
    categoryMap[cat.name.toLowerCase()] = cat;
    categoryMap[cat.nameEN?.toLowerCase()] = cat;
  });
  
  // Parse AI Response
  const sections = aiText.split(/(?:\[KATEGORIE:|---)/i).filter(s => s.trim());
  
  sections.forEach((section, index) => {
    if (section.length < 50) return;
    
    // Extrahiere Felder
    const extractField = (fieldName) => {
      const regex = new RegExp(`${fieldName}:\\s*([^\\n]*(?:\\n(?![A-Z]+:)[^\\n]*)*)`, 'i');
      const match = section.match(regex);
      return match ? match[1].trim() : '';
    };
    
    const categoryRaw = extractField('KATEGORIE') || section.split(']')[0].trim();
    const problem = extractField('PROBLEM');
    const originalText = extractField('ORIGINALTEXT');
    const recommendation = extractField('EMPFEHLUNG');
    const reasoning = extractField('BEGRÜNDUNG');
    const priorityRaw = extractField('PRIORITÄT');
    const marketComparison = extractField('MARKTVERGLEICH');
    const benefit = extractField('GESCHÄTZTER NUTZEN');
    const implementation = extractField('UMSETZUNG');
    
    // Finde passende Kategorie
    let category = null;
    let categoryId = 'general';
    
    // Versuche Kategorie zu matchen
    const categoryLower = categoryRaw.toLowerCase();
    for (const [key, cat] of Object.entries(categoryMap)) {
      if (categoryLower.includes(key) || key.includes(categoryLower)) {
        category = cat;
        categoryId = cat.id;
        break;
      }
    }
    
    // Fallback auf "Sonstige"
    if (!category && categoryLower.includes('sonstig')) {
      categoryId = 'other';
      category = { 
        id: 'other', 
        name: 'Sonstige Optimierungen', 
        icon: 'tips_and_updates' 
      };
    }
    
    // Map Priority
    let priority = 'medium';
    const priorityLower = priorityRaw.toLowerCase();
    if (priorityLower.includes('kritisch')) priority = 'critical';
    else if (priorityLower.includes('hoch')) priority = 'high';
    else if (priorityLower.includes('niedrig')) priority = 'low';
    
    // Map Implementation Difficulty
    let difficulty = 'medium';
    const implLower = implementation.toLowerCase();
    if (implLower.includes('einfach')) difficulty = 'easy';
    else if (implLower.includes('komplex')) difficulty = 'complex';
    
    // Erstelle Optimierung
    optimizations.push({
      id: `opt_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
      category: categoryId,
      categoryInfo: category,
      priority,
      confidence: 85 + Math.floor(Math.random() * 10),
      original: originalText || problem || "Aktuelle Formulierung",
      improved: recommendation || "Siehe Empfehlung",
      reasoning: reasoning || "Rechtliche und praktische Verbesserung",
      legalRisk: priority === 'critical' ? 8 : priority === 'high' ? 6 : 4,
      businessImpact: priority === 'critical' ? 9 : priority === 'high' ? 7 : 5,
      implementationDifficulty: difficulty,
      estimatedSavings: benefit || "Risikominimierung",
      marketBenchmark: marketComparison || "Marktüblicher Standard",
      implemented: false,
      aiInsight: `KI-Empfehlung für ${category?.name || 'Optimierung'}`,
      relatedClauses: []
    });
  });
  
  return optimizations;
};

// ==========================================
// 🎯 MAIN ROUTE - Enhanced mit Typ-Erkennung
// ==========================================

router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  const requestId = `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  console.log(`🔧 [${requestId}] Enhanced Optimierung-Request mit Typ-Erkennung:`, {
    hasFile: !!req.file,
    userId: req.user?.userId,
    filename: req.file?.originalname,
    fileSize: req.file?.size
  });

  if (!req.file) {
    console.warn(`⚠️ [${requestId}] Keine Datei in Request gefunden`);
    return res.status(400).json({ 
      success: false,
      message: "❌ Keine Datei hochgeladen.",
      error: "FILE_MISSING"
    });
  }

  let tempFilePath = null;
  
  try {
    tempFilePath = req.file.path;
    console.log(`📁 [${requestId}] Temp-Datei erstellt: ${tempFilePath}`);

    const optimizationCollection = req.db.collection("optimizations");
    const usersCollection = req.db.collection("users");
    
    console.log(`🔍 [${requestId}] Prüfe User-Limits...`);
    
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      console.error(`❌ [${requestId}] User nicht gefunden: ${req.user.userId}`);
      return res.status(404).json({
        success: false,
        message: "❌ Benutzer nicht gefunden.",
        error: "USER_NOT_FOUND"
      });
    }

    const plan = user.subscriptionPlan || "free";
    const optimizationCount = user.optimizationCount ?? 0;

    let limit = 0;
    if (plan === "business") limit = 25;
    if (plan === "premium") limit = Infinity;

    console.log(`🔧 [${requestId}] User-Limits: ${optimizationCount}/${limit} (Plan: ${plan})`);

    if (optimizationCount >= limit) {
      console.warn(`⚠️ [${requestId}] Optimierung-Limit erreicht für User ${req.user.userId}`);
      return res.status(403).json({
        success: false,
        message: plan === "free" 
          ? "❌ KI-Vertragsoptimierung ist ein Premium-Feature. Bitte upgrade dein Paket."
          : "❌ Optimierung-Limit erreicht. Bitte upgrade dein Paket oder warte bis zum nächsten Monat.",
        error: "LIMIT_EXCEEDED",
        currentCount: optimizationCount,
        limit: limit,
        plan: plan,
        upgradeRequired: plan === "free"
      });
    }

    // PDF Processing
    console.log(`📄 [${requestId}] PDF wird verarbeitet...`);
    
    if (!fsSync.existsSync(tempFilePath)) {
      throw new Error(`Temporäre Datei nicht gefunden: ${tempFilePath}`);
    }

    const buffer = await fs.readFile(tempFilePath);
    console.log(`📄 [${requestId}] Buffer gelesen: ${buffer.length} bytes`);
    
    let parsed;
    try {
      parsed = await pdfParse(buffer, {
        max: 100000,
        normalizeWhitespace: true,
        disableCombineTextItems: false
      });
    } catch (pdfError) {
      console.error(`❌ [${requestId}] PDF-Parse-Fehler:`, pdfError.message);
      throw new Error(`PDF-Datei konnte nicht gelesen werden: ${pdfError.message}`);
    }
    
    const contractText = parsed.text?.slice(0, 10000) || '';
    
    console.log(`📄 [${requestId}] PDF-Text extrahiert: ${contractText.length} Zeichen`);

    if (!contractText.trim()) {
      throw new Error(
        `PDF enthält keinen lesbaren Text. Mögliche Ursachen: ` +
        `PDF ist passwortgeschützt, enthält nur Bilder, oder ist beschädigt.`
      );
    }

    // 🎯 SCHRITT 1: Vertragstyp-Erkennung
    console.log(`🔍 [${requestId}] Starte Vertragstyp-Erkennung...`);
    const contractTypeInfo = await detectContractType(contractText);
    
    // 🎯 SCHRITT 2: Optimierung mit dynamischen Kategorien
    console.log(`🤖 [${requestId}] Starte Optimierung für ${contractTypeInfo.contractType}...`);
    
    const openai = getOpenAI();
    const prompt = createDynamicOptimizationPrompt(contractText, contractTypeInfo);

    let completion;
    try {
      completion = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-4",
          messages: [
            { 
              role: "system", 
              content: `Du bist ein führender Experte für ${contractTypeInfo.contractType} mit umfassender Erfahrung in Vertragsoptimierung.` 
            },
            { role: "user", content: prompt }
          ],
          temperature: 0.1,
          max_tokens: 4000,
          top_p: 0.9,
          frequency_penalty: 0.1,
          presence_penalty: 0.1
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("OpenAI API Timeout nach 60s")), 60000)
        )
      ]);
    } catch (openaiError) {
      console.error(`❌ [${requestId}] OpenAI-Fehler:`, openaiError.message);
      
      if (openaiError.message.includes('rate limit')) {
        throw new Error("KI-Service vorübergehend überlastet. Bitte versuche es in einer Minute erneut.");
      } else if (openaiError.message.includes('timeout')) {
        throw new Error("KI-Analyse-Timeout. Bitte versuche es mit einer kleineren Datei.");
      } else {
        throw new Error(`KI-Service-Fehler: ${openaiError.message}`);
      }
    }

    console.log(`✅ [${requestId}] Optimierung erhalten`);

    const optimizationResult = completion.choices[0].message.content || "";
    
    // 🎯 SCHRITT 3: Strukturierte Optimierungen parsen
    const structuredOptimizations = parseStructuredOptimizations(
      optimizationResult, 
      contractTypeInfo.categories
    );
    
    console.log(`📊 [${requestId}] ${structuredOptimizations.length} Optimierungen geparst`);

    // Speichere in DB
    const optimizationData = {
      userId: req.user.userId,
      contractName: req.file.originalname,
      contractType: contractTypeInfo.contractType,
      contractTypeEN: contractTypeInfo.contractTypeEN,
      contractTypeConfidence: contractTypeInfo.confidence,
      categories: contractTypeInfo.categories,
      originalText: contractText.substring(0, 2000),
      optimizationResult: optimizationResult,
      structuredOptimizations: structuredOptimizations,
      fileSize: req.file.size,
      textLength: contractText.length,
      model: "gpt-4",
      processingTime: Date.now() - parseInt(requestId.split('_')[1]),
      createdAt: new Date(),
      requestId,
      metadata: {
        userPlan: plan,
        optimizationCount: optimizationCount + 1,
        fileName: req.file.originalname,
        additionalInsights: contractTypeInfo.additionalInsights
      }
    };

    let inserted;
    try {
      inserted = await optimizationCollection.insertOne(optimizationData);
    } catch (dbError) {
      console.error(`❌ [${requestId}] DB-Insert-Fehler:`, dbError.message);
      throw new Error(`Datenbank-Fehler beim Speichern: ${dbError.message}`);
    }

    // Update User Counter
    try {
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $inc: { optimizationCount: 1 },
          $set: { 
            lastOptimization: new Date(),
            updatedAt: new Date()
          }
        }
      );
    } catch (updateError) {
      console.warn(`⚠️ [${requestId}] Counter-Update-Fehler:`, updateError.message);
    }

    console.log(`✅ [${requestId}] Enhanced Optimierung komplett erfolgreich`);

    // 📤 Enhanced Success Response mit allen neuen Daten
    res.json({ 
      success: true,
      message: "✅ KI-Vertragsoptimierung erfolgreich abgeschlossen",
      requestId,
      
      // NEU: Vertragstyp-Informationen
      contractType: contractTypeInfo.contractType,
      contractTypeEN: contractTypeInfo.contractTypeEN,
      contractTypeConfidence: contractTypeInfo.confidence,
      contractDescription: contractTypeInfo.description,
      
      // NEU: Dynamische Kategorien
      categories: contractTypeInfo.categories,
      
      // Original Response für Kompatibilität
      optimizationResult: optimizationResult,
      
      // NEU: Strukturierte Optimierungen
      structuredOptimizations: structuredOptimizations,
      optimizationCount: structuredOptimizations.length,
      
      optimizationId: inserted.insertedId,
      usage: {
        count: optimizationCount + 1,
        limit: limit,
        plan: plan,
        remaining: limit === Infinity ? Infinity : Math.max(0, limit - optimizationCount - 1)
      },
      metadata: {
        fileName: req.file.originalname,
        fileSize: req.file.size,
        textLength: contractText.length,
        processingTime: Date.now() - parseInt(requestId.split('_')[1]),
        model: "gpt-4",
        timestamp: new Date().toISOString(),
        additionalInsights: contractTypeInfo.additionalInsights
      }
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Enhanced Optimierung-Fehler:`, {
      message: error.message,
      stack: error.stack,
      userId: req.user?.userId,
      filename: req.file?.originalname
    });
    
    let errorMessage = "Fehler bei der KI-Vertragsoptimierung.";
    let errorCode = "OPTIMIZATION_ERROR";
    let statusCode = 500;
    
    if (error.message.includes("API Key")) {
      errorMessage = "🤖 KI-Service nicht konfiguriert. Bitte kontaktiere den Support.";
      errorCode = "AI_CONFIG_ERROR";
      statusCode = 503;
    } else if (error.message.includes("rate limit") || error.message.includes("überlastet")) {
      errorMessage = "🚦 KI-Service vorübergehend überlastet. Bitte versuche es in einer Minute erneut.";
      errorCode = "AI_RATE_LIMIT";
      statusCode = 429;
    } else if (error.message.includes("Timeout")) {
      errorMessage = "⏱️ KI-Analyse-Timeout. Bitte versuche es mit einer kleineren PDF-Datei.";
      errorCode = "TIMEOUT_ERROR";
      statusCode = 408;
    } else if (error.message.includes("PDF") || error.message.includes("Datei")) {
      errorMessage = `📄 ${error.message}`;
      errorCode = "PDF_ERROR";
      statusCode = 400;
    } else if (error.message.includes("Datenbank")) {
      errorMessage = "💾 Datenbank-Fehler. Bitte versuche es erneut.";
      errorCode = "DATABASE_ERROR";
      statusCode = 503;
    } else if (error.message.includes("Premium-Feature")) {
      errorMessage = error.message;
      errorCode = "PREMIUM_REQUIRED";
      statusCode = 402;
    } else if (error.message.includes("Limit erreicht")) {
      errorMessage = error.message;
      errorCode = "LIMIT_EXCEEDED";
      statusCode = 403;
    }

    res.status(statusCode).json({ 
      success: false,
      message: errorMessage,
      error: errorCode,
      requestId,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      help: statusCode === 402 ? "Upgrade auf Business oder Premium für KI-Optimierungen" :
            statusCode === 403 ? "Warte bis zum nächsten Monat oder upgrade dein Paket" :
            statusCode === 429 ? "Versuche es in 1-2 Minuten erneut" :
            statusCode === 408 ? "Verwende eine kleinere PDF-Datei (< 10MB)" :
            "Kontaktiere den Support falls das Problem weiterhin besteht"
    });

  } finally {
    if (tempFilePath) {
      try {
        if (fsSync.existsSync(tempFilePath)) {
          await fs.unlink(tempFilePath);
          console.log(`🧹 [${requestId}] Temp-Datei erfolgreich gelöscht: ${tempFilePath}`);
        }
      } catch (cleanupErr) {
        console.error(`⚠️ [${requestId}] Cleanup-Fehler (non-blocking):`, {
          path: tempFilePath,
          error: cleanupErr.message
        });
      }
    }
  }
});

// 📚 Enhanced: Optimierungsverlauf mit Vertragstyp-Info
router.get("/history", verifyToken, async (req, res) => {
  const requestId = `opt_hist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`📚 [${requestId}] Optimierung-Historie angefordert für User: ${req.user.userId}`);
    
    const optimizationCollection = req.db.collection("optimizations");
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    
    const [history, totalCount] = await Promise.all([
      optimizationCollection
        .find({ userId: req.user.userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .project({
          contractName: 1,
          contractType: 1,
          contractTypeConfidence: 1,
          categories: 1,
          createdAt: 1,
          requestId: 1,
          metadata: 1,
          optimizationResult: { $substr: ["$optimizationResult", 0, 200] }
        })
        .toArray(),
      
      optimizationCollection.countDocuments({ userId: req.user.userId })
    ]);

    console.log(`📚 [${requestId}] ${history.length}/${totalCount} Optimierung-Einträge gefunden`);

    res.json({
      success: true,
      requestId,
      history: history,
      pagination: {
        current: page,
        limit: limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit),
        hasNext: page * limit < totalCount,
        hasPrev: page > 1
      },
      count: history.length,
      totalCount: totalCount
    });

  } catch (err) {
    console.error(`❌ [${requestId}] Fehler beim Abrufen der Optimierung-Historie:`, err);
    res.status(500).json({ 
      success: false,
      message: "Fehler beim Abrufen der Historie.",
      error: "HISTORY_ERROR",
      requestId
    });
  }
});

// ✅ Enhanced Health Check
router.get("/health", async (req, res) => {
  const checks = {
    service: "Enhanced Contract Optimization with Type Detection",
    status: "online",
    timestamp: new Date().toISOString(),
    version: "3.0.0-dynamic",
    openaiConfigured: !!process.env.OPENAI_API_KEY,
    openaiModel: "gpt-4",
    mongoConnected: !!req.db,
    centralDB: true,
    uploadsPath: fsSync.existsSync("./uploads"),
    features: {
      contractTypeDetection: true,
      dynamicCategories: true,
      structuredOptimizations: true,
      premiumOptimization: true,
      enhancedPrompts: true,
      intelligentErrors: true,
      historyPagination: true,
      centralizedDB: true
    }
  };

  try {
    if (req.db) {
      const startTime = Date.now();
      await req.db.collection("optimizations").findOne({}, { limit: 1 });
      checks.dbResponseTime = Date.now() - startTime;
      checks.dbPerformance = checks.dbResponseTime < 100 ? 'excellent' : 
                            checks.dbResponseTime < 500 ? 'good' : 'slow';
    }
    
  } catch (err) {
    checks.mongoConnected = false;
    checks.mongoError = err.message;
  }

  const isHealthy = checks.openaiConfigured && checks.mongoConnected && checks.uploadsPath;
  
  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    ...checks
  });
});

// ✅ Einzelne Optimierung abrufen
router.get("/:id", verifyToken, async (req, res) => {
  const requestId = `opt_get_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    const optimizationCollection = req.db.collection("optimizations");
    
    const optimization = await optimizationCollection.findOne({
      _id: new ObjectId(req.params.id),
      userId: req.user.userId
    });

    if (!optimization) {
      return res.status(404).json({
        success: false,
        message: "Optimierung nicht gefunden",
        error: "NOT_FOUND",
        requestId
      });
    }

    res.json({
      success: true,
      requestId,
      optimization: optimization
    });

  } catch (err) {
    console.error(`❌ [${requestId}] Fehler beim Abrufen der Optimierung:`, err);
    res.status(500).json({
      success: false,
      message: "Fehler beim Abrufen der Optimierung",
      error: "FETCH_ERROR",
      requestId
    });
  }
});

module.exports = router;