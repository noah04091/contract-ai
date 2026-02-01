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

// Max Seiten wenn kein S3 (Base64 Fallback hat Speicherlimit)
const MAX_PAGES_WITHOUT_S3 = 15;

// Request-Timeout für Scan-Verarbeitung (2 Minuten)
const PROCESS_TIMEOUT_MS = 120_000;

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
  // Request-Timeout: Verhindert hängende Requests bei langer Verarbeitung
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      console.error("[Scanner] Request Timeout nach", PROCESS_TIMEOUT_MS / 1000, "Sekunden");
      res.status(408).json({
        success: false,
        error: "Verarbeitung hat zu lange gedauert. Bitte versuche es mit weniger Seiten.",
      });
    }
  }, PROCESS_TIMEOUT_MS);

  try {
    const images = req.files;
    if (!images || images.length === 0) {
      clearTimeout(timeout);
      return res
        .status(400)
        .json({ success: false, error: "Keine Bilder hochgeladen" });
    }

    // Bei fehlendem S3: Seitenzahl begrenzen (Base64 hat Speicherlimit)
    if (!s3Upload && images.length > MAX_PAGES_WITHOUT_S3) {
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        error: `Maximal ${MAX_PAGES_WITHOUT_S3} Seiten erlaubt. Bitte teile den Scan auf.`,
      });
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

    if (!userId) {
      clearTimeout(timeout);
      return res.status(401).json({ success: false, error: "Nicht authentifiziert" });
    }

    // Input-Validierung: Corners
    if (cornersArray.length > 0) {
      for (let i = 0; i < cornersArray.length; i++) {
        const corners = cornersArray[i];
        if (!corners || corners.length === 0) continue; // Leer = OK (kein Crop)
        if (corners.length !== 4) {
          cornersArray[i] = []; // Ungültig → ignorieren
          continue;
        }
        const valid = corners.every(
          (c) => typeof c.x === "number" && typeof c.y === "number" &&
                 c.x >= 0 && c.x <= 1 && c.y >= 0 && c.y <= 1
        );
        if (!valid) cornersArray[i] = [];
      }
    }

    // Input-Validierung: Rotations
    const validRotations = [0, 90, 180, 270, -90, -180, -270];
    for (let i = 0; i < rotations.length; i++) {
      if (rotations[i] && !validRotations.includes(rotations[i])) {
        rotations[i] = 0;
      }
    }

    console.log(
      `[Scanner] Verarbeite ${images.length} Bilder für User ${userId} (OCR: ${enableOCR})`
    );

    // 1. Alle Bilder verarbeiten (mit per-image error handling)
    const processedImages = [];
    const skippedPages = [];
    for (let i = 0; i < images.length; i++) {
      try {
        if (!images[i].buffer || images[i].buffer.length === 0) {
          skippedPages.push(i + 1);
          continue;
        }

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
      } catch (imgErr) {
        console.error(`[Scanner] Bild ${i + 1} fehlgeschlagen:`, imgErr.message);
        skippedPages.push(i + 1);
      }
    }

    if (processedImages.length === 0) {
      clearTimeout(timeout);
      return res.status(400).json({
        success: false,
        error: "Alle Bilder konnten nicht verarbeitet werden",
      });
    }

    if (skippedPages.length > 0) {
      console.warn(`[Scanner] ${skippedPages.length} Seite(n) übersprungen: ${skippedPages.join(", ")}`);
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
        clearTimeout(timeout);
        return res.json({
          success: true,
          pdfBase64: pdfResult.pdfBuffer.toString("base64"),
          pageCount: pdfResult.pageCount,
          ocrApplied: pdfResult.ocrApplied,
          ocrPagesRemaining: pdfResult.ocrPagesRemaining,
          ocrError: pdfResult.ocrError,
          skippedPages: skippedPages.length > 0 ? skippedPages : undefined,
        });
      }
    } else {
      // Kein S3: PDF als Base64
      clearTimeout(timeout);
      return res.json({
        success: true,
        pdfBase64: pdfResult.pdfBuffer.toString("base64"),
        pageCount: pdfResult.pageCount,
        ocrApplied: pdfResult.ocrApplied,
        ocrPagesRemaining: pdfResult.ocrPagesRemaining,
        ocrError: pdfResult.ocrError,
        skippedPages: skippedPages.length > 0 ? skippedPages : undefined,
      });
    }

    clearTimeout(timeout);
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
      skippedPages: skippedPages.length > 0 ? skippedPages : undefined,
    });
  } catch (error) {
    clearTimeout(timeout);
    console.error("[Scanner] Process Fehler:", error);
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: "Scan-Verarbeitung fehlgeschlagen: " + error.message,
      });
    }
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
    if (!req.userId) {
      return res.status(401).json({ success: false, error: "Nicht authentifiziert" });
    }

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
