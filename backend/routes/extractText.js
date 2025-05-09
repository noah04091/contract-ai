// 📁 routes/extractText.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const verifyToken = require("../middleware/verifyToken");

const upload = multer({ dest: "uploads/" });

router.post("/", verifyToken, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "❌ Keine Datei hochgeladen." });

  try {
    const buffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(buffer);
    res.json({ text: data.text.substring(0, 5000) });
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

module.exports = router;
