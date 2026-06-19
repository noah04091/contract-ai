// 📤 backend/routes/upload.js - Upload ohne Analyse (nur Speicherung) + Duplikats-Erkennung
const express = require("express");
const multer = require("multer");
const fs = require("fs").promises;
const fsSync = require("fs");
const { ObjectId } = require("mongodb");
const path = require("path");
// Note: verifyToken wird bereits im Router-Mount (server.js) aufgerufen

// 🧠 Legal Lens Vorverarbeitung (für sofortiges Laden in Legal Lens)
const { preprocessContract } = require("../services/legalLens/clausePreprocessor");
// 🔍 Vector Embedding für Legal Pulse Monitoring
const { embedContractAsync } = require("../services/contractEmbedder");
const { extractTextFromBuffer } = require("../services/textExtractor");

const router = express.Router();

// ✅ Fix UTF-8 Encoding für Dateinamen mit deutschen Umlauten
const { fixUtf8Filename, cleanFileName } = require("../utils/fixUtf8");

// ✅ Crypto für File-Hash
let crypto;
try {
  crypto = require("crypto");
  console.log("✅ [UPLOAD] Crypto module loaded");
} catch (err) {
  console.warn("⚠️ [UPLOAD] Crypto not available:", err.message);
  crypto = null;
}

// ===== S3 INTEGRATION (AWS SDK v3) =====
let S3Client, PutObjectCommand, HeadBucketCommand, s3Instance;
let S3_AVAILABLE = false;
let S3_CONFIGURED = false;

const initializeS3 = () => {
  try {
    console.log("🔧 [UPLOAD] Initializing S3 configuration...");

    const requiredEnvVars = ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET_NAME'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`Missing environment variables: ${missingVars.join(', ')}`);
    }

    const { S3Client: _S3Client, PutObjectCommand: _PutObjectCommand, HeadBucketCommand: _HeadBucketCommand } = require("@aws-sdk/client-s3");
    S3Client = _S3Client;
    PutObjectCommand = _PutObjectCommand;
    HeadBucketCommand = _HeadBucketCommand;

    s3Instance = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    console.log("✅ [UPLOAD] S3 configured successfully");
    S3_CONFIGURED = true;
    S3_AVAILABLE = true;

    return true;
  } catch (error) {
    console.error("❌ [UPLOAD] S3 configuration failed:", error.message);
    S3_CONFIGURED = false;
    S3_AVAILABLE = false;
    return false;
  }
};

// Initialize S3
initializeS3();

// ===== MULTER CONFIGURATION =====
const UPLOAD_PATH = path.join(__dirname, "..", "uploads");

// Ensure uploads directory exists
try {
  if (!fsSync.existsSync(UPLOAD_PATH)) {
    fsSync.mkdirSync(UPLOAD_PATH, { recursive: true });
    console.log(`📁 [UPLOAD] Local upload directory created: ${UPLOAD_PATH}`);
  }
} catch (err) {
  console.error(`❌ [UPLOAD] Error creating upload directory:`, err);
}

// ✅ AWS SDK v3 compatible: Use disk storage first, then upload to S3 manually
const uploadMiddleware = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_PATH,
    filename: (req, file, cb) => {
      const filename = Date.now() + path.extname(file.originalname);
      cb(null, filename);
    },
  }),
  limits: { fileSize: 50 * 1024 * 1024 }, // ✅ 50 MB limit (angeglichen mit analyze.js für 400-Seiten-Enterprise-Verträge)
});

/**
 * 🔄 Upload file to S3 using AWS SDK v3 native API
 */
const uploadToS3 = async (localFilePath, originalFilename, userId) => {
  try {
    const fileBuffer = await fs.readFile(localFilePath);
    const s3Key = `contracts/${Date.now()}-${originalFilename}`;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: fileBuffer,
      ContentType: originalFilename?.endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/pdf',
      Metadata: {
        uploadDate: new Date().toISOString(),
        userId: userId || 'unknown',
      },
    });

    await s3Instance.send(command);

    const s3Location = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

    console.log(`✅ [S3] Successfully uploaded to: ${s3Location}`);

    return {
      s3Key,
      s3Location,
      s3Bucket: process.env.S3_BUCKET_NAME,
    };
  } catch (error) {
    console.error(`❌ [S3] Upload failed:`, error);
    throw error;
  }
};

/**
 * 🔍 Calculate file hash for duplicate detection
 */
const calculateFileHash = (buffer) => {
  if (!crypto) {
    console.warn("⚠️ [UPLOAD] Crypto not available - using fallback hash");
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  try {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  } catch (err) {
    console.warn("⚠️ [UPLOAD] Hash calculation failed:", err.message);
    return `fallback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

/**
 * 🔍 Check for duplicate contract
 */
const checkForDuplicate = async (fileHash, userId, contractsCollection) => {
  if (!crypto) {
    console.warn("⚠️ [UPLOAD] Duplicate check not available - skipping");
    return null;
  }

  try {
    const existingContract = await contractsCollection.findOne({
      fileHash: fileHash,
      userId: new ObjectId(userId)
    });
    return existingContract;
  } catch (error) {
    console.warn("⚠️ [UPLOAD] Duplicate check failed:", error.message);
    return null;
  }
};

/**
 * 📤 POST / - Upload ohne Analyse
 * Speichert Datei nur in S3/lokal, erstellt Contract-Eintrag OHNE Analyse
 * Note: verifyToken wird bereits im Router-Mount (server.js) aufgerufen
 */
router.post("/", uploadMiddleware.single("file"), async (req, res) => {
  const requestId = `UPLOAD-${Date.now()}`;
  console.log(`\n📤 [${requestId}] Upload-only request started`);
  console.log(`👤 [${requestId}] User ID: ${req.user.userId} (${req.user.email})`);

  // 🔧 allowDuplicate=true: Skip duplicate check (for signature requests)
  const allowDuplicate = req.query.allowDuplicate === 'true' || req.body.allowDuplicate === true;

  try {
    if (!req.file) {
      console.log(`❌ [${requestId}] No file uploaded`);
      return res.status(400).json({
        success: false,
        message: "Keine Datei hochgeladen"
      });
    }

    console.log(`📄 [${requestId}] File received:`, {
      originalname: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
      localPath: req.file.path
    });

    let storageInfo;
    let cleanupLocalFile = false;

    // ✅ Upload to S3 if configured, otherwise keep local
    if (S3_CONFIGURED && S3_AVAILABLE && s3Instance) {
      console.log(`📤 [${requestId}] Uploading to S3...`);
      try {
        const s3Result = await uploadToS3(req.file.path, req.file.originalname, req.user.userId);
        storageInfo = {
          uploadType: "S3_UPLOAD",
          s3Key: s3Result.s3Key,
          s3Location: s3Result.s3Location,
          s3Bucket: s3Result.s3Bucket
        };
        cleanupLocalFile = true; // Delete local file after successful S3 upload
        console.log(`✅ [${requestId}] S3 upload successful`);
      } catch (s3Error) {
        console.error(`❌ [${requestId}] S3 upload failed, falling back to local storage:`, s3Error.message);
        storageInfo = {
          uploadType: "LOCAL_UPLOAD",
          filePath: req.file.path
        };
      }
    } else {
      console.log(`📁 [${requestId}] S3 not available, using local storage`);
      storageInfo = {
        uploadType: "LOCAL_UPLOAD",
        filePath: req.file.path
      };
    }

    console.log(`💾 [${requestId}] Storage info:`, storageInfo);

    // ✅ Get database collection (req.contractsCollection wird von server.js Middleware gesetzt)
    const contractsCollection = req.contractsCollection || req.db?.collection("contracts");

    if (!contractsCollection) {
      console.error(`❌ [${requestId}] Database collection not available`);
      return res.status(500).json({
        success: false,
        message: "Datenbank nicht verfügbar"
      });
    }

    // ✅ DUPLIKATS-PRÜFUNG: Berechne File-Hash und prüfe Duplikate
    let fileHash = null;
    let existingContract = null;

    if (crypto) {
      try {
        const fileBuffer = await fs.readFile(req.file.path);
        fileHash = calculateFileHash(fileBuffer);
        console.log(`🔍 [${requestId}] File hash calculated: ${fileHash.substring(0, 12)}...`);

        existingContract = await checkForDuplicate(fileHash, req.user.userId, contractsCollection);

        if (existingContract) {
          console.log(`📄 [${requestId}] DUPLICATE FOUND: ${existingContract._id}`);

          // Cleanup local file
          if (req.file && req.file.path) {
            try {
              await fs.unlink(req.file.path);
              console.log(`🗑️ [${requestId}] Cleaned up local file after duplicate detection`);
            } catch (cleanupError) {
              console.error(`❌ [${requestId}] Cleanup error:`, cleanupError);
            }
          }

          // 🔧 If allowDuplicate=true, return existing contract as success (for signature requests)
          if (allowDuplicate) {
            console.log(`✅ [${requestId}] allowDuplicate=true - returning existing contract`);
            return res.status(200).json({
              success: true,
              duplicate: true,
              message: "Bestehender Vertrag wird verwendet",
              contract: {
                _id: existingContract._id,
                name: existingContract.name,
                s3Key: existingContract.s3Key,
                uploadedAt: existingContract.uploadedAt || existingContract.createdAt
              },
              contractId: existingContract._id,
              s3Key: existingContract.s3Key
            });
          }

          // ✅ Return duplicate response (default behavior)
          return res.status(409).json({
            success: false,
            duplicate: true,
            message: "📄 Dieser Vertrag wurde bereits hochgeladen",
            error: "DUPLICATE_CONTRACT",
            contractId: existingContract._id,
            contractName: existingContract.name,
            uploadedAt: existingContract.createdAt || existingContract.uploadedAt,
            existingContract: {
              _id: existingContract._id,
              name: existingContract.name,
              uploadedAt: existingContract.uploadedAt,
              analyzed: existingContract.analyzed || false,
              contractScore: existingContract.contractScore,
              status: existingContract.status
            }
          });
        }
      } catch (hashError) {
        console.warn(`⚠️ [${requestId}] Duplicate check failed:`, hashError.message);
        // Continue without duplicate check
      }
    }

    // Erstelle Contract-Eintrag OHNE Analyse
    // 🛡️ cleanFileName: kaputte Platzhalter-Namen ($value.pdf, undefined, leer) → "Dokument"
    //    (S3-Speicherung nutzt weiterhin req.file.originalname, hier nur der Anzeige-Name)
    const fixedFilename = cleanFileName(req.file.originalname);
    const contractData = {
      name: fixedFilename,
      userId: new ObjectId(req.user.userId), // ✅ FIX: req.user.userId (von verifyToken)
      uploadedAt: new Date(),
      createdAt: new Date(), // ✅ Für Sortierung in Liste
      updatedAt: new Date(),
      ...storageInfo,
      analyzed: false, // ✅ NEU: Flag für "nicht analysiert"
      status: "Unbekannt",
      kuendigung: "Nicht analysiert",
      laufzeit: "Nicht analysiert",
      expiryDate: null,
      fileHash: fileHash // ✅ Save hash for future duplicate checks
    };

    // Save to database
    const result = await contractsCollection.insertOne(contractData);

    console.log(`✅ [${requestId}] Contract saved without analysis:`, result.insertedId);

    // 🆕 08.06.2026: Listen-Cache invalidieren, damit der neue Vertrag SOFORT in
    // GET /api/contracts erscheint. Der Upload läuft über einen eigenen Router, daher
    // greift die Invalidierungs-Middleware aus contracts.js hier sonst nicht.
    // Guarded + try/catch → kann den Upload niemals fehlschlagen lassen.
    try {
      const { invalidateContractsCache } = require("./contracts");
      if (typeof invalidateContractsCache === "function" && req.user?.userId) {
        invalidateContractsCache(req.user.userId);
      }
    } catch (cacheErr) {
      console.warn(`⚠️ [${requestId}] Contracts-Cache-Invalidierung übersprungen:`, cacheErr.message);
    }

    // 🧠 LEGAL LENS: GPT-Klausel-Parsing im Hintergrund starten
    // Läuft async - blockiert die Response nicht
    // So ist Legal Lens beim nächsten Öffnen sofort bereit
    const contractId = result.insertedId;
    preprocessContract(contractId.toString()).then(preprocessResult => {
      if (preprocessResult.success) {
        console.log(`🧠 [${requestId}] Legal Lens Vorverarbeitung erfolgreich: ${preprocessResult.clauseCount} Klauseln`);
      } else if (!preprocessResult.alreadyProcessed) {
        console.warn(`⚠️ [${requestId}] Legal Lens Vorverarbeitung fehlgeschlagen:`, preprocessResult.error);
      }
    }).catch(err => {
      console.error(`❌ [${requestId}] Legal Lens Vorverarbeitung Exception:`, err.message);
    });

    // 🔍 VECTOR EMBEDDING: Text extrahieren und für Legal Pulse Monitoring embedden
    // Läuft async - blockiert die Response nicht
    (async () => {
      try {
        const fileBuffer = await fs.readFile(req.file.path);
        const mimetype = req.file.mimetype || 'application/pdf';
        const { text } = await extractTextFromBuffer(fileBuffer, mimetype);
        if (text && text.trim().length > 50) {
          embedContractAsync(contractId.toString(), text, {
            userId: req.user.userId,
            contractName: fixedFilename,
            contractType: 'unknown'
          });
          console.log(`🔍 [${requestId}] Contract embedding triggered for uploaded contract ${contractId}`);
        }
      } catch (embedErr) {
        // File may already be cleaned up if S3 upload succeeded - that's OK
        // The contract will be embedded when analysis runs
        console.log(`⏭️ [${requestId}] Upload embedding skipped (file may be cleaned up): ${embedErr.message}`);
      }
    })();

    // Cleanup local file if uploaded to S3
    if (cleanupLocalFile) {
      try {
        await fs.unlink(req.file.path);
        console.log(`🗑️ [${requestId}] Cleaned up local file after S3 upload`);
      } catch (cleanupError) {
        console.error(`⚠️ [${requestId}] Cleanup warning:`, cleanupError.message);
      }
    }

    // Response
    res.json({
      success: true,
      message: "Vertrag erfolgreich hochgeladen",
      contractId: result.insertedId,
      analyzed: false,
      s3Key: storageInfo.s3Key || null, // ✅ NEU: s3Key direkt in Response für Envelope-Erstellung
      contract: {
        _id: result.insertedId,
        name: fixedFilename,
        uploadedAt: contractData.uploadedAt,
        analyzed: false,
        status: "Unbekannt",
        s3Key: storageInfo.s3Key || null // ✅ NEU: s3Key auch im Contract-Objekt
      }
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Upload error:`, error);

    // Cleanup on error
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
        console.log(`🗑️ [${requestId}] Cleaned up local file after error`);
      } catch (cleanupError) {
        console.error(`❌ [${requestId}] Cleanup error:`, cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Fehler beim Hochladen des Vertrags",
      error: error.message
    });
  }
});

module.exports = router;
