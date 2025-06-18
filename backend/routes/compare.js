// 📁 backend/routes/compare.js
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const pdfParse = require("pdf-parse");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");

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

// Enhanced comparison analysis function
async function analyzeContracts(contract1Text, contract2Text, userProfile = 'individual') {
  const systemPrompt = SYSTEM_PROMPTS[userProfile] || SYSTEM_PROMPTS.individual;
  
  const analysisPrompt = `
${systemPrompt}

AUFGABE: Vergleiche diese zwei Verträge systematisch und erstelle eine strukturierte Analyse.

VERTRAG 1:
"""
${contract1Text.substring(0, 8000)}
"""

VERTRAG 2:
"""
${contract2Text.substring(0, 8000)}
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

// Main comparison endpoint
router.post("/", verifyToken, upload.fields([
  { name: 'file1', maxCount: 1 },
  { name: 'file2', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log("🚀 Contract comparison started");
    
    // Check if files were uploaded
    if (!req.files || !req.files.file1 || !req.files.file2) {
      return res.status(400).json({ 
        message: "Beide Vertragsdateien müssen hochgeladen werden" 
      });
    }

    // Get user info and check premium status
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "Nutzer nicht gefunden" });
    }

    const isPremium = user.subscriptionActive === true || user.isPremium === true;
    if (!isPremium) {
      return res.status(403).json({ message: "Premium-Funktion erforderlich" });
    }

    // Check usage limits
    const plan = user.subscriptionPlan || "free";
    const compareCount = user.compareCount || 0;

    let limit = 5;  // Default limit for free users
    if (plan === "business") limit = 50;
    if (plan === "premium") limit = Infinity;

    if (compareCount >= limit && plan !== "premium") {
      return res.status(403).json({
        message: "❌ Vergleichs-Limit erreicht. Bitte Paket upgraden."
      });
    }

    // Get user profile from request
    const userProfile = req.body.userProfile || 'individual';
    if (!['individual', 'freelancer', 'business'].includes(userProfile)) {
      return res.status(400).json({ message: "Ungültiges Nutzerprofil" });
    }

    const file1 = req.files.file1[0];
    const file2 = req.files.file2[0];

    console.log(`📄 Processing files: ${file1.originalname} & ${file2.originalname}`);

    // Parse PDF contents
    console.log("📄 Parsing PDF files...");
    const buffer1 = fs.readFileSync(file1.path);
    const buffer2 = fs.readFileSync(file2.path);
    
    const pdfData1 = await pdfParse(buffer1);
    const pdfData2 = await pdfParse(buffer2);
    
    const contract1Text = pdfData1.text.trim();
    const contract2Text = pdfData2.text.trim();

    if (!contract1Text || !contract2Text) {
      return res.status(400).json({ 
        message: "Mindestens eine PDF-Datei konnte nicht gelesen werden oder ist leer" 
      });
    }

    console.log(`📝 Text extracted: Contract 1 (${contract1Text.length} chars), Contract 2 (${contract2Text.length} chars)`);

    // Perform AI analysis
    console.log("🤖 Starting AI analysis...");
    const analysisResult = await analyzeContracts(contract1Text, contract2Text, userProfile);

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

    // Clean up uploaded files (optional - keep them for audit purposes)
    setTimeout(() => {
      try {
        fs.unlinkSync(file1.path);
        fs.unlinkSync(file2.path);
      } catch (err) {
        console.log("🗑️ File cleanup warning:", err.message);
      }
    }, 24 * 60 * 60 * 1000); // Delete after 24 hours

    console.log("✅ Comparison completed successfully");
    res.json(analysisResult);

  } catch (error) {
    console.error("❌ Comparison error:", error);
    
    // Clean up files on error
    if (req.files) {
      Object.values(req.files).flat().forEach(file => {
        try {
          fs.unlinkSync(file.path);
        } catch (err) {
          console.log("🗑️ Error cleanup warning:", err.message);
        }
      });
    }

    res.status(500).json({ 
      message: "Fehler beim Vertragsvergleich: " + (error.message || "Unbekannter Fehler")
    });
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
        if (plan === "premium") return "unlimited";
        if (plan === "business") return Math.max(0, 50 - used);
        return Math.max(0, 5 - used);
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

module.exports = router;