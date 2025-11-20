// 📁 backend/routes/bulkDownload.js
// Bulk-Download für Verträge - Mehrere PDFs als ZIP herunterladen

const express = require("express");
const router = express.Router();
const Contract = require("../models/Contract");
const archiver = require("archiver");
const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");

// S3-Client initialisieren
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "eu-central-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Middleware: Require authentication
const requireAuth = (req, res, next) => {
  if (!req.user || !req.user.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

/**
 * POST /api/contracts/bulk-download
 * Body: { contractIds: ["id1", "id2", ...] }
 * Lädt mehrere Verträge als ZIP-Datei herunter
 */
router.post("/bulk-download", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const { contractIds } = req.body;

    // Validierung
    if (!contractIds || !Array.isArray(contractIds) || contractIds.length === 0) {
      return res.status(400).json({ error: "Keine Verträge zum Download ausgewählt" });
    }

    if (contractIds.length > 100) {
      return res.status(400).json({ error: "Maximal 100 Verträge gleichzeitig downloadbar" });
    }

    console.log(`📦 [Bulk Download] User ${userId} lädt ${contractIds.length} Verträge herunter`);

    // Verträge aus DB laden (nur die vom User)
    const contracts = await Contract.find({
      _id: { $in: contractIds },
      userId: userId
    }).lean();

    if (contracts.length === 0) {
      return res.status(404).json({ error: "Keine Verträge gefunden" });
    }

    // Nur Verträge mit S3-Keys (Sicherheitscheck)
    const contractsWithFiles = contracts.filter(c => c.s3Key);

    if (contractsWithFiles.length === 0) {
      return res.status(404).json({ error: "Keine PDFs zum Download verfügbar" });
    }

    console.log(`📦 [Bulk Download] ${contractsWithFiles.length} Verträge mit PDFs gefunden`);

    // ZIP-Dateiname generieren
    const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const zipFilename = `Contract_AI_Vertraege_${timestamp}.zip`;

    // Response Headers setzen
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${zipFilename}"`);

    // Archiver erstellen und an Response streamen
    const archive = archiver("zip", {
      zlib: { level: 6 } // Kompression Level (0-9, 6 = Standard)
    });

    // Error Handler für Archive
    archive.on("error", (err) => {
      console.error("❌ [Bulk Download] Archive Error:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Fehler beim Erstellen des ZIP-Archivs" });
      }
    });

    // Archive an Response pipen
    archive.pipe(res);

    // Counter für erfolgreich hinzugefügte Dateien
    let successCount = 0;
    let errorCount = 0;

    // Jedes Contract-PDF zum Archive hinzufügen
    for (const contract of contractsWithFiles) {
      try {
        // S3 GetObject Command
        const command = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: contract.s3Key
        });

        // PDF von S3 abrufen
        const response = await s3Client.send(command);

        if (!response.Body) {
          console.warn(`⚠️ [Bulk Download] Keine Daten für ${contract.name || contract._id}`);
          errorCount++;
          continue;
        }

        // Dateinamen für ZIP generieren (sicher, ohne Sonderzeichen)
        const safeName = (contract.name || contract.title || `Vertrag_${contract._id}`)
          .replace(/[^a-zA-Z0-9äöüÄÖÜß\s\-_]/g, "") // Nur sichere Zeichen
          .substring(0, 100); // Max 100 Zeichen

        const filename = `${safeName}.pdf`;

        // PDF zum Archive hinzufügen (Stream von S3)
        archive.append(response.Body, { name: filename });

        successCount++;
        console.log(`✅ [Bulk Download] Hinzugefügt: ${filename}`);

      } catch (fileError) {
        console.error(`❌ [Bulk Download] Fehler bei ${contract.name}:`, fileError.message);
        errorCount++;
        // Weiter mit nächstem File
      }
    }

    // Archive finalisieren
    await archive.finalize();

    console.log(`📦 [Bulk Download] ZIP erstellt: ${successCount} erfolgreich, ${errorCount} Fehler`);

  } catch (error) {
    console.error("❌ [Bulk Download] Error:", error);

    if (!res.headersSent) {
      res.status(500).json({
        error: "Bulk-Download fehlgeschlagen",
        details: error.message
      });
    }
  }
});

module.exports = router;
