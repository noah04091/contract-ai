// 📤 backend/routes/upload.js - Upload ohne Analyse (nur Speicherung)
const express = require("express");
const multer = require("multer");
const fs = require("fs").promises;
const fsSync = require("fs");
const { ObjectId } = require("mongodb");
const path = require("path");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();

// ===== S3 INTEGRATION (AWS SDK v3) =====
let S3Client, PutObjectCommand, HeadBucketCommand, multerS3, s3Instance;
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
    multerS3 = require("multer-s3");
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

const createUploadMiddleware = () => {
  if (S3_CONFIGURED && S3_AVAILABLE && s3Instance && multerS3) {
    console.log("✅ [UPLOAD] Using S3 storage for uploads");
    return multer({
      storage: multerS3({
        s3: s3Instance,
        bucket: process.env.S3_BUCKET_NAME,
        metadata: (req, file, cb) => {
          cb(null, {
            fieldName: file.fieldname,
            uploadDate: new Date().toISOString(),
            userId: req.userId || 'unknown'
          });
        },
        key: (req, file, cb) => {
          const filename = `contracts/${Date.now()}-${file.originalname}`;
          console.log(`📤 [S3] Uploading to S3: ${filename}`);
          cb(null, filename);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
    });
  } else {
    console.log("📁 [UPLOAD] Using LOCAL storage for uploads");
    return multer({
      storage: multer.diskStorage({
        destination: UPLOAD_PATH,
        filename: (req, file, cb) => {
          const filename = Date.now() + path.extname(file.originalname);
          console.log(`📁 [LOCAL] Saving locally: ${filename}`);
          cb(null, filename);
        },
      }),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
    });
  }
};

const uploadMiddleware = createUploadMiddleware();

/**
 * 📤 POST / - Upload ohne Analyse
 * Speichert Datei nur in S3/lokal, erstellt Contract-Eintrag OHNE Analyse
 */
router.post("/", verifyToken, uploadMiddleware.single("file"), async (req, res) => {
  const requestId = `UPLOAD-${Date.now()}`;
  console.log(`\n📤 [${requestId}] Upload-only request started`);
  console.log(`👤 [${requestId}] User ID: ${req.userId}`);

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
      storageLocation: req.file.location || req.file.path
    });

    // Bestimme Storage-Type und Location
    const isS3Upload = !!req.file.location;
    const storageInfo = isS3Upload ? {
      uploadType: "S3_UPLOAD",
      s3Key: req.file.key,
      s3Location: req.file.location,
      s3Bucket: process.env.S3_BUCKET_NAME
    } : {
      uploadType: "LOCAL_UPLOAD",
      filePath: req.file.path
    };

    console.log(`💾 [${requestId}] Storage info:`, storageInfo);

    // Erstelle Contract-Eintrag OHNE Analyse
    const contractData = {
      name: req.file.originalname,
      userId: req.userId,
      uploadedAt: new Date(),
      ...storageInfo,
      analyzed: false, // ✅ NEU: Flag für "nicht analysiert"
      status: "Unbekannt",
      kuendigung: "Nicht analysiert",
      laufzeit: "Nicht analysiert",
      expiryDate: null
    };

    // Save to database
    const contractsCollection = req.contractsCollection || req.app.locals.db.collection("contracts");
    const result = await contractsCollection.insertOne(contractData);

    console.log(`✅ [${requestId}] Contract saved without analysis:`, result.insertedId);

    // Response
    res.json({
      success: true,
      message: "Vertrag erfolgreich hochgeladen",
      contractId: result.insertedId,
      analyzed: false,
      contract: {
        _id: result.insertedId,
        name: req.file.originalname,
        uploadedAt: contractData.uploadedAt,
        analyzed: false,
        status: "Unbekannt"
      }
    });

  } catch (error) {
    console.error(`❌ [${requestId}] Upload error:`, error);

    // Cleanup on error
    if (req.file && req.file.path && !req.file.location) {
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
