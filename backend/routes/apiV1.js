// 📁 backend/routes/apiV1.js
// REST API v1 Endpoints (Enterprise-Feature)
// Dokumentation: /api/docs

const express = require("express");
const router = express.Router();
const { MongoClient, ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const pdfParse = require("pdf-parse");
const { OpenAI } = require("openai");
const verifyApiKey = require("../middleware/verifyApiKey");
const { apiRateLimiter } = require("../middleware/apiRateLimit");
const { fixUtf8Filename } = require("../utils/fixUtf8"); // ✅ Fix UTF-8 Encoding

// Rate Limiting für alle API v1 Routes
router.use(apiRateLimiter);

// ===== S3 CONFIGURATION =====
let s3Instance = null;
let S3Client, PutObjectCommand;
let S3_CONFIGURED = false;

const initializeS3 = async () => {
  try {
    const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      console.warn(`⚠️ [API v1] S3 not configured. Missing: ${missingVars.join(', ')}`);
      return false;
    }

    const { S3Client: _S3Client, PutObjectCommand: _PutObjectCommand } = require("@aws-sdk/client-s3");
    S3Client = _S3Client;
    PutObjectCommand = _PutObjectCommand;

    s3Instance = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    console.log("✅ [API v1] S3 configured successfully");
    S3_CONFIGURED = true;
    return true;
  } catch (error) {
    console.error("❌ [API v1] S3 configuration failed:", error.message);
    S3_CONFIGURED = false;
    return false;
  }
};

// Initialize S3
initializeS3();

/**
 * Upload file to S3 using AWS SDK v3
 */
const uploadToS3 = async (localFilePath, originalFilename, userId) => {
  try {
    if (!S3_CONFIGURED) {
      throw new Error("S3 not configured");
    }

    const fileBuffer = await fs.readFile(localFilePath);
    const s3Key = `contracts/${userId}/${Date.now()}-${originalFilename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: 'application/pdf',
      Metadata: {
        uploadDate: new Date().toISOString(),
        userId: userId || 'unknown',
      },
    });

    await s3Instance.send(command);

    const s3Location = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    console.log(`✅ [API v1 S3] Uploaded: ${s3Key}`);

    return {
      s3Key,
      s3Location,
      s3Bucket: process.env.S3_BUCKET_NAME,
    };
  } catch (error) {
    console.error(`❌ [API v1 S3] Upload failed:`, error);
    throw error;
  }
};

// MongoDB Connection
const client = new MongoClient(process.env.MONGO_URI);
let contractsCollection;
let analysisCollection;

(async () => {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    contractsCollection = db.collection("contracts");
    analysisCollection = db.collection("analyses");
    console.log("📦 API v1: MongoDB verbunden");
  } catch (error) {
    console.error("❌ API v1: MongoDB Connection Error:", error);
  }
})();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Multer für File Upload
const upload = multer({
  dest: path.join(__dirname, "../uploads"),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Nur PDF-Dateien erlaubt"));
    }
  }
});

/**
 * GET /api/v1/health
 * Health Check
 */
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Contract AI REST API v1",
    version: "1.0.0",
    docs: "/api/docs"
  });
});

/**
 * GET /api/v1/contracts
 * Liste aller Verträge des Users
 * Query Params:
 * - limit (default: 50, max: 100)
 * - offset (default: 0)
 * - folder (optional: folderId)
 */
router.get("/contracts", verifyApiKey, async (req, res) => {
  try {
    const userId = req.user.userId;
    const limit = Math.min(parseInt(req.query.limit) || 50, 100);
    const offset = parseInt(req.query.offset) || 0;
    const folderId = req.query.folder;

    const query = { userId: new ObjectId(userId) };
    if (folderId && folderId !== "null") {
      query.folderId = new ObjectId(folderId);
    } else if (folderId === "null") {
      query.folderId = null;
    }

    const contracts = await contractsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray();

    const total = await contractsCollection.countDocuments(query);

    res.json({
      success: true,
      contracts: contracts.map(c => ({
        id: c._id.toString(),
        filename: c.filename,
        contractType: c.contractType,
        createdAt: c.createdAt,
        folderId: c.folderId?.toString() || null,
        s3Key: c.s3Key || null,
        s3Location: c.s3Location || null,
        storage: c.s3Key ? "s3" : "local"
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + contracts.length < total
      }
    });

  } catch (error) {
    console.error("❌ [API v1] GET /contracts Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Verträge",
      details: error.message
    });
  }
});

/**
 * POST /api/v1/contracts
 * Neuen Vertrag hochladen & analysieren
 * Body: multipart/form-data
 * - file: PDF-Datei (required)
 * - folderId: Ordner-ID (optional)
 * - analyze: true/false (default: true)
 */
router.post("/contracts", verifyApiKey, upload.single("file"), async (req, res) => {
  try {
    const userId = req.user.userId;
    const { folderId, analyze = "true" } = req.body;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF-Datei erforderlich"
      });
    }

    const filePath = req.file.path;
    const filename = fixUtf8Filename(req.file.originalname);

    // PDF parsen
    const dataBuffer = await fs.readFile(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    if (text.length < 100) {
      await fs.unlink(filePath);
      return res.status(400).json({
        success: false,
        message: "PDF enthält zu wenig Text"
      });
    }

    // Upload zu S3 (falls konfiguriert)
    let s3Data = null;
    if (S3_CONFIGURED) {
      try {
        s3Data = await uploadToS3(filePath, filename, userId);
        console.log(`✅ [API v1] S3 Upload erfolgreich: ${s3Data.s3Key}`);
      } catch (s3Error) {
        console.warn(`⚠️ [API v1] S3 Upload fehlgeschlagen, speichere lokal:`, s3Error.message);
      }
    }

    // Vertrag in DB speichern
    const contract = {
      userId: new ObjectId(userId),
      filename,
      folderId: folderId ? new ObjectId(folderId) : null,
      localPath: filePath,
      s3Key: s3Data?.s3Key || null,
      s3Location: s3Data?.s3Location || null,
      s3Bucket: s3Data?.s3Bucket || null,
      createdAt: new Date(),
      contractType: "unknown" // Wird bei Analyse gesetzt
    };

    const result = await contractsCollection.insertOne(contract);
    const contractId = result.insertedId;

    // Cleanup: Lösche lokale Datei nach S3-Upload
    if (s3Data?.s3Key) {
      try {
        await fs.unlink(filePath);
        console.log(`🗑️ [API v1] Lokale Datei gelöscht nach S3-Upload: ${filename}`);
      } catch (unlinkError) {
        console.warn(`⚠️ [API v1] Cleanup failed:`, unlinkError.message);
      }
    }

    // Optional: Analyse durchführen
    let analysis = null;
    if (analyze === "true" || analyze === true) {
      try {
        const prompt = `Analysiere diesen Vertrag und gib ein JSON mit folgenden Feldern zurück:
{
  "contractType": "Kaufvertrag|Mietvertrag|Arbeitsvertrag|Dienstleistungsvertrag|Lizenzvertrag|Sonstiges",
  "overallScore": 0-100,
  "risks": ["Risiko 1", "Risiko 2", ...],
  "suggestions": ["Vorschlag 1", "Vorschlag 2", ...],
  "parties": ["Partei 1", "Partei 2"],
  "keyTerms": ["Begriff 1", "Begriff 2", ...],
  "summary": "Kurze Zusammenfassung"
}

Vertragstext:
${text.substring(0, 15000)}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3
        });

        const response = completion.choices[0].message.content;
        const jsonMatch = response.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);

          // Speichere Analyse
          await analysisCollection.insertOne({
            contractId,
            userId: new ObjectId(userId),
            ...analysis,
            createdAt: new Date()
          });

          // Update Contract mit contractType
          await contractsCollection.updateOne(
            { _id: contractId },
            { $set: { contractType: analysis.contractType } }
          );
        }
      } catch (analyzeError) {
        console.warn("⚠️ [API v1] Analyse-Fehler:", analyzeError.message);
      }
    }

    res.status(201).json({
      success: true,
      message: "Vertrag erfolgreich hochgeladen",
      contract: {
        id: contractId.toString(),
        filename,
        folderId: folderId || null,
        createdAt: contract.createdAt,
        s3Key: s3Data?.s3Key || null,
        s3Location: s3Data?.s3Location || null,
        storage: s3Data ? "s3" : "local"
      },
      analysis: analysis ? {
        contractType: analysis.contractType,
        overallScore: analysis.overallScore,
        summary: analysis.summary
      } : null
    });

  } catch (error) {
    console.error("❌ [API v1] POST /contracts Error:", error);

    // Cleanup file on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        console.warn("⚠️ Cleanup failed:", unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Fehler beim Hochladen des Vertrags",
      details: error.message
    });
  }
});

/**
 * GET /api/v1/contracts/:id
 * Einzelnen Vertrag abrufen
 */
router.get("/contracts/:id", verifyApiKey, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Vertrags-ID"
      });
    }

    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Vertrag nicht gefunden"
      });
    }

    res.json({
      success: true,
      contract: {
        id: contract._id.toString(),
        filename: contract.filename,
        contractType: contract.contractType,
        createdAt: contract.createdAt,
        folderId: contract.folderId?.toString() || null,
        s3Key: contract.s3Key || null,
        s3Location: contract.s3Location || null,
        storage: contract.s3Key ? "s3" : "local"
      }
    });

  } catch (error) {
    console.error("❌ [API v1] GET /contracts/:id Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden des Vertrags",
      details: error.message
    });
  }
});

/**
 * DELETE /api/v1/contracts/:id
 * Vertrag löschen
 */
router.delete("/contracts/:id", verifyApiKey, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Vertrags-ID"
      });
    }

    const result = await contractsCollection.deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Vertrag nicht gefunden"
      });
    }

    // Lösche auch Analyse
    await analysisCollection.deleteOne({
      contractId: new ObjectId(id)
    });

    res.json({
      success: true,
      message: "Vertrag erfolgreich gelöscht"
    });

  } catch (error) {
    console.error("❌ [API v1] DELETE /contracts/:id Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Löschen des Vertrags",
      details: error.message
    });
  }
});

/**
 * GET /api/v1/contracts/:id/analysis
 * Analyse eines Vertrags abrufen
 */
router.get("/contracts/:id/analysis", verifyApiKey, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Ungültige Vertrags-ID"
      });
    }

    // Check ob Vertrag dem User gehört
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId)
    });

    if (!contract) {
      return res.status(404).json({
        success: false,
        message: "Vertrag nicht gefunden"
      });
    }

    // Hole Analyse
    const analysis = await analysisCollection.findOne({
      contractId: new ObjectId(id)
    });

    if (!analysis) {
      return res.status(404).json({
        success: false,
        message: "Keine Analyse vorhanden"
      });
    }

    res.json({
      success: true,
      analysis: {
        contractType: analysis.contractType,
        overallScore: analysis.overallScore,
        risks: analysis.risks,
        suggestions: analysis.suggestions,
        parties: analysis.parties,
        keyTerms: analysis.keyTerms,
        summary: analysis.summary,
        createdAt: analysis.createdAt
      }
    });

  } catch (error) {
    console.error("❌ [API v1] GET /contracts/:id/analysis Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der Analyse",
      details: error.message
    });
  }
});

/**
 * GET /api/v1/user
 * Aktuelle User-Info
 */
router.get("/user", verifyApiKey, async (req, res) => {
  try {
    res.json({
      success: true,
      user: {
        userId: req.user.userId,
        email: req.user.email,
        plan: req.user.subscriptionPlan
      },
      apiKey: {
        name: req.apiKey.name,
        permissions: req.apiKey.permissions
      }
    });
  } catch (error) {
    console.error("❌ [API v1] GET /user Error:", error);
    res.status(500).json({
      success: false,
      message: "Fehler beim Laden der User-Info",
      details: error.message
    });
  }
});

module.exports = router;
