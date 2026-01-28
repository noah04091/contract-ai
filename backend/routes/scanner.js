/**
 * Scanner Route
 *
 * Endpoints für die Dokument-Scan-Funktion:
 * - POST /api/scanner/process  — Bilder → PDF mit OCR
 * - POST /api/scanner/preview  — Einzelbild → korrigiertes JPEG
 *
 * @version 1.0.0
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  processImage,
  processPreview,
  generateScanPDF,
} = require("../services/scannerService");

// Multer für Image-Upload (max 20MB pro Bild, max 50 Bilder)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 20 * 1024 * 1024, // 20MB pro Datei
    files: 50,
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Nicht unterstütztes Bildformat: ${file.mimetype}`));
    }
  },
});

// S3 Upload (optional)
let s3Upload, generateSignedUrl;
try {
  const fileStorage = require("../services/fileStorage");
  s3Upload = fileStorage.upload;
  generateSignedUrl = fileStorage.generateSignedUrl;
} catch (err) {
  console.warn("[Scanner] S3 nicht verfügbar:", err.message);
}

// ============================================
// POST /api/scanner/process
// ============================================
// Verarbeitet mehrere Scan-Bilder zu einem PDF mit OCR-Textlayer
//
// Request: multipart/form-data
//   - images[]  : Bild-Dateien (JPEG/PNG/WebP/HEIC)
//   - corners[] : JSON-Array mit 4 Eckpunkten pro Bild [{x,y},...] (optional)
//   - options   : JSON { rotation[], enhance, enableOCR }
//
// Response: { success, pdfUrl, s3Key, pageCount, ocrApplied, ocrPagesRemaining, ocrError }
router.post("/process", upload.array("images", 50), async (req, res) => {
  try {
    const images = req.files;
    if (!images || images.length === 0) {
      return res
        .status(400)
        .json({ success: false, error: "Keine Bilder hochgeladen" });
    }

    // Optionen parsen
    let cornersArray = [];
    let options = {};

    try {
      if (req.body.corners) {
        cornersArray = JSON.parse(req.body.corners);
      }
    } catch (e) {
      console.warn("[Scanner] Corners JSON parse Fehler:", e.message);
    }

    try {
      if (req.body.options) {
        options = JSON.parse(req.body.options);
      }
    } catch (e) {
      console.warn("[Scanner] Options JSON parse Fehler:", e.message);
    }

    const rotations = options.rotations || [];
    const enhance = options.enhance !== false; // Default: true
    const enableOCR = options.enableOCR !== false; // Default: true
    const userId = req.userId; // Aus verifyToken Middleware

    console.log(
      `[Scanner] Verarbeite ${images.length} Bilder für User ${userId} (OCR: ${enableOCR})`
    );

    // 1. Alle Bilder verarbeiten
    const processedImages = [];
    for (let i = 0; i < images.length; i++) {
      const corners =
        cornersArray[i] && cornersArray[i].length === 4
          ? cornersArray[i]
          : null;
      const rotation = rotations[i] || 0;

      const processed = await processImage(images[i].buffer, corners, {
        rotation,
        enhance,
      });
      processedImages.push(processed);
    }

    // 2. PDF generieren mit OCR
    const pdfResult = await generateScanPDF(processedImages, {
      enableOCR,
      userId,
    });

    // 3. PDF in S3 hochladen
    let s3Key = null;
    let pdfUrl = null;

    if (s3Upload) {
      const timestamp = Date.now();
      s3Key = `scans/${userId}/${timestamp}_scan_${pdfResult.pageCount}p.pdf`;

      try {
        const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
        const s3Client = new S3Client({
          region: process.env.AWS_REGION || "eu-central-1",
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });

        await s3Client.send(
          new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: s3Key,
            Body: pdfResult.pdfBuffer,
            ContentType: "application/pdf",
          })
        );

        // Signed URL generieren
        if (generateSignedUrl) {
          pdfUrl = await generateSignedUrl(s3Key);
        }
      } catch (s3Err) {
        console.error("[Scanner] S3 Upload Fehler:", s3Err.message);
        // Fallback: PDF als Base64 zurückgeben
        return res.json({
          success: true,
          pdfBase64: pdfResult.pdfBuffer.toString("base64"),
          pageCount: pdfResult.pageCount,
          ocrApplied: pdfResult.ocrApplied,
          ocrPagesRemaining: pdfResult.ocrPagesRemaining,
          ocrError: pdfResult.ocrError,
        });
      }
    } else {
      // Kein S3: PDF als Base64
      return res.json({
        success: true,
        pdfBase64: pdfResult.pdfBuffer.toString("base64"),
        pageCount: pdfResult.pageCount,
        ocrApplied: pdfResult.ocrApplied,
        ocrPagesRemaining: pdfResult.ocrPagesRemaining,
        ocrError: pdfResult.ocrError,
      });
    }

    console.log(
      `[Scanner] PDF erstellt: ${pdfResult.pageCount} Seiten, OCR: ${pdfResult.ocrApplied}, S3: ${s3Key}`
    );

    res.json({
      success: true,
      s3Key,
      pdfUrl,
      pageCount: pdfResult.pageCount,
      ocrApplied: pdfResult.ocrApplied,
      ocrPagesRemaining: pdfResult.ocrPagesRemaining,
      ocrError: pdfResult.ocrError,
    });
  } catch (error) {
    console.error("[Scanner] Process Fehler:", error);
    res.status(500).json({
      success: false,
      error: "Scan-Verarbeitung fehlgeschlagen: " + error.message,
    });
  }
});

// ============================================
// POST /api/scanner/preview
// ============================================
// Verarbeitet ein einzelnes Bild für die Vorschau (schnell, kleine Auflösung)
//
// Request: multipart/form-data
//   - image   : Einzelnes Bild
//   - corners : JSON mit 4 Eckpunkten [{x,y},...] (optional)
//   - rotation: Rotation in Grad (optional)
//   - enhance : Boolean (optional, default true)
//
// Response: JPEG Binary
router.post("/preview", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, error: "Kein Bild hochgeladen" });
    }

    let corners = null;
    try {
      if (req.body.corners) {
        corners = JSON.parse(req.body.corners);
      }
    } catch (e) {
      // Keine Corners
    }

    const rotation = parseInt(req.body.rotation) || 0;
    const enhance = req.body.enhance !== "false";

    const preview = await processPreview(req.file.buffer, corners, {
      rotation,
      enhance,
    });

    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "no-cache");
    res.send(preview);
  } catch (error) {
    console.error("[Scanner] Preview Fehler:", error);
    res.status(500).json({
      success: false,
      error: "Vorschau-Verarbeitung fehlgeschlagen: " + error.message,
    });
  }
});

module.exports = router;
