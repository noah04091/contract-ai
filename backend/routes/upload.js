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
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB limit
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
      ContentType: 'application/pdf',
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
 * 📤 POST / - Upload ohne Analyse
 * Speichert Datei nur in S3/lokal, erstellt Contract-Eintrag OHNE Analyse
 */
router.post("/", verifyToken, uploadMiddleware.single("file"), async (req, res) => {
  const requestId = `UPLOAD-${Date.now()}`;
  console.log(`\n📤 [${requestId}] Upload-only request started`);
  console.log(`👤 [${requestId}] User ID: ${req.user.userId} (${req.user.email})`);

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

    // Erstelle Contract-Eintrag OHNE Analyse
    const contractData = {
      name: req.file.originalname,
      userId: new ObjectId(req.user.userId), // ✅ FIX: req.user.userId (von verifyToken)
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
