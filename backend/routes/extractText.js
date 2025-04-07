const express = require("express");
const router = express.Router();
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");

const upload = multer({ dest: "uploads/" });

router.post("/", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Keine Datei hochgeladen." });

  try {
    const buffer = fs.readFileSync(req.file.path);
    const data = await pdfParse(buffer);
    res.json({ text: data.text.substring(0, 5000) });
  } catch (err) {
    console.error("❌ Fehler beim Extrahieren:", err.message);
    res.status(500).json({ error: "Fehler beim Extrahieren" });
  }
});

module.exports = router;
