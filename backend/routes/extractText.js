// 📁 backend/routes/extractText.js
// VERBESSERT: Behält deine bestehende Route + neue öffentliche Route für Better Contracts

const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const { extractTextFromBuffer } = require("../services/textExtractor");
const fs = require("fs");
const verifyToken = require("../middleware/verifyToken");
const saveContract = require("../services/saveContract");
const { fixUtf8Filename } = require("../utils/fixUtf8"); // ✅ Fix UTF-8 Encoding

const upload = multer({ dest: "uploads/" });

// 🔒 DEINE BESTEHENDE AUTHENTIFIZIERTE ROUTE (100% unverändert!)
router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "❌ Keine Datei hochgeladen." });

  try {
    const buffer = fs.readFileSync(req.file.path);
    const fileMimetype = req.file.mimetype || 'application/pdf';
    const data = await extractTextFromBuffer(buffer, fileMimetype);
    const extractedText = data.text.substring(0, 5000);

    // 🗃️ Optional zentral speichern
    await saveContract({
      userId: req.user.userId,
      fileName: fixUtf8Filename(req.file.originalname),
      toolUsed: "extractText",
      filePath: `/uploads/${req.file.filename}`,
      extraRefs: {
        content: extractedText
      }
    });

    res.json({ text: extractedText });
  } catch (err) {
    console.error("❌ Fehler beim Extrahieren:", err.message);
    res.status(500).json({ error: "Fehler beim Extrahieren" });
  } finally {
    try {
      if (req.file) fs.unlinkSync(req.file.path);
    } catch (cleanupErr) {
      console.warn("⚠️ Fehler beim Löschen der Datei:", cleanupErr.message);
    }
  }
});

// 🔒 Route für Better Contracts (ohne DB-Speicherung)
//
// 14.08.2026: verifyToken ergänzt. Die Route nahm seit Juni 2025 ohne jede
// Anmeldung Datei-Uploads entgegen und liess pdf-parse darauf los, ohne
// Groessen- oder Typpruefung (multer ohne limits/fileFilter). Live
// nachgewiesen: anonymer Aufruf wurde durchgelassen, Antwort war lediglich
// "Keine Datei hochgeladen".
//
// Aufgerufen wird sie ausschliesslich von BetterContracts.tsx (RequireAuth +
// Premium-Gate, sendet credentials: "include"). Der Name "/public" bleibt,
// damit der Frontend-Aufruf unveraendert passt.
router.post("/public", verifyToken, upload.single("file"), async (req, res) => {
  console.log("📄 Public Extract-Text Request für Better Contracts");
  
  if (!req.file) {
    return res.status(400).json({ 
      error: "❌ Keine Datei hochgeladen.",
      message: "Bitte wählen Sie eine PDF-Datei aus."
    });
  }

  try {
    console.log(`📄 Extrahiere Text aus: ${req.file.originalname} (${req.file.size} bytes)`);
    
    const buffer = fs.readFileSync(req.file.path);
    const fileMimetype = req.file.mimetype || 'application/pdf';
    const data = await extractTextFromBuffer(buffer, fileMimetype);
    const extractedText = data.text.substring(0, 8000); // Etwas mehr Text für Better Contracts
    
    console.log(`✅ Text erfolgreich extrahiert: ${extractedText.length} Zeichen`);

    // Validierung: Mindestens 20 Zeichen für sinnvolle Vertragsanalyse
    if (extractedText.trim().length < 20) {
      return res.status(400).json({
        error: "Unzureichender Textinhalt",
        message: "Die PDF-Datei enthält zu wenig Text. Bitte verwenden Sie eine textbasierte PDF."
      });
    }

    res.json({
      text: extractedText,
      originalFileName: fixUtf8Filename(req.file.originalname),
      fileSize: req.file.size,
      extractedLength: extractedText.length,
      success: true
    });

  } catch (err) {
    console.error("❌ Public Extract-Text Fehler:", err.message);
    
    // Spezifische Fehlermeldungen
    if (err.message.includes('PDF')) {
      return res.status(400).json({ 
        error: "PDF-Verarbeitungsfehler",
        message: "Die PDF-Datei konnte nicht gelesen werden. Möglicherweise ist sie beschädigt oder passwortgeschützt."
      });
    }
    
    res.status(500).json({ 
      error: "Fehler beim Extrahieren",
      message: "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es erneut."
    });
  } finally {
    // Datei immer löschen (Sicherheit)
    try {
      if (req.file) {
        fs.unlinkSync(req.file.path);
        console.log(`🗑️ Temporäre Datei gelöscht: ${req.file.path}`);
      }
    } catch (cleanupErr) {
      console.warn("⚠️ Fehler beim Löschen der temporären Datei:", cleanupErr.message);
    }
  }
});

// 🔍 Health Check
router.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "extract-text",
    routes: {
      authenticated: "/api/extract-text (für Dashboard, etc.)",
      public: "/api/extract-text/public (für Better Contracts)"
    },
    supportedFormats: ["PDF"],
    timestamp: new Date().toISOString()
  });
});

module.exports = router;