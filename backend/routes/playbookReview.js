// Playbook Review API — Regelbasierte Vertragspruefung
// CRUD fuer Playbooks + Regeln, Check-Endpoint, Globale Anforderungen

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const Playbook = require("../models/Playbook");
const PlaybookCheck = require("../models/PlaybookCheck");
const { generateCheckReportPdf } = require("../services/playbookCheckPdfGenerator");
const { generateNegotiationLetter, generateNegotiationLetterPdf } = require("../services/negotiationLetterGenerator");
const playbookChecker = require("../services/playbookChecker");
const database = require("../config/database");
const { ObjectId } = require("mongodb");

// ═══════════════════════════════════════════════
// GET /api/playbook-review — Alle Playbooks des Users
// ═══════════════════════════════════════════════
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const playbooks = await Playbook.find({
      userId,
      isGlobal: { $ne: true }
    }).sort({ updatedAt: -1 });

    const globalPlaybook = await Playbook.findGlobal(userId);
    const stats = await Playbook.getStatistics(userId);
    const recentChecks = await PlaybookCheck.getRecentChecks(userId, 5);

    res.json({
      success: true,
      playbooks,
      globalPlaybook,
      stats,
      recentChecks
    });
  } catch (err) {
    console.error("❌ [PLAYBOOK-REVIEW] Fehler beim Laden:", err);
    res.status(500).json({ success: false, message: "Fehler beim Laden der Playbooks" });
  }
});

// ═══════════════════════════════════════════════
// GET /api/playbook-review/:id — Einzelnes Playbook laden
// ═══════════════════════════════════════════════
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const playbook = await Playbook.findOne({ _id: req.params.id, userId });

    if (!playbook) {
      return res.status(404).json({ success: false, message: "Playbook nicht gefunden" });
    }

    // Pruefungshistorie laden
    const checks = await PlaybookCheck.find({ playbookId: playbook._id, userId })
      .sort({ checkedAt: -1 })
      .limit(10)
      .select("contractName summary checkedAt");

    res.json({ success: true, playbook, checks });
  } catch (err) {
    console.error("❌ [PLAYBOOK-REVIEW] Fehler beim Laden:", err);
    res.status(500).json({ success: false, message: "Fehler beim Laden des Playbooks" });
  }
});

// ═══════════════════════════════════════════════
// POST /api/playbook-review — Neues Playbook erstellen
// ═══════════════════════════════════════════════
router.post("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { name, description, contractType, role, industry, rules, isDefault, isGlobal } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Name ist erforderlich" });
    }

    // Globales Playbook: nur eins pro User
    if (isGlobal) {
      const existingGlobal = await Playbook.findGlobal(userId);
      if (existingGlobal) {
        return res.status(400).json({
          success: false,
          message: "Es existiert bereits ein globales Playbook. Bitte bearbeiten Sie das bestehende."
        });
      }
    }

    // Default-Playbook: altes Default entfernen
    if (isDefault) {
      await Playbook.updateMany({ userId, isDefault: true }, { isDefault: false });
    }

    const playbook = new Playbook({
      userId,
      name: name.trim(),
      description: description || "",
      contractType: contractType || "allgemein",
      role: role || "neutral",
      industry: industry || "allgemein",
      rules: rules || [],
      isDefault: isDefault || false,
      isGlobal: isGlobal || false,
      status: "active"
    });

    await playbook.save();

    console.log(`✅ [PLAYBOOK-REVIEW] Playbook erstellt: "${name}" (${playbook._id})`);
    res.status(201).json({ success: true, playbook });
  } catch (err) {
    console.error("❌ [PLAYBOOK-REVIEW] Fehler beim Erstellen:", err);
    res.status(500).json({ success: false, message: "Fehler beim Erstellen des Playbooks" });
  }
});

// ═══════════════════════════════════════════════
// PUT /api/playbook-review/:id — Playbook aktualisieren
// ═══════════════════════════════════════════════
router.put("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { name, description, contractType, role, industry, rules, isDefault, status } = req.body;

    const playbook = await Playbook.findOne({ _id: req.params.id, userId });
    if (!playbook) {
      return res.status(404).json({ success: false, message: "Playbook nicht gefunden" });
    }

    // Default-Playbook: altes Default entfernen
    if (isDefault && !playbook.isDefault) {
      await Playbook.updateMany({ userId, isDefault: true }, { isDefault: false });
    }

    if (name !== undefined) playbook.name = name.trim();
    if (description !== undefined) playbook.description = description;
    if (contractType !== undefined) playbook.contractType = contractType;
    if (role !== undefined) playbook.role = role;
    if (industry !== undefined) playbook.industry = industry;
    if (rules !== undefined) playbook.rules = rules;
    if (isDefault !== undefined) playbook.isDefault = isDefault;
    if (status !== undefined) playbook.status = status;

    await playbook.save();

    console.log(`✅ [PLAYBOOK-REVIEW] Playbook aktualisiert: "${playbook.name}" (${playbook._id})`);
    res.json({ success: true, playbook });
  } catch (err) {
    console.error("❌ [PLAYBOOK-REVIEW] Fehler beim Aktualisieren:", err);
    res.status(500).json({ success: false, message: "Fehler beim Aktualisieren des Playbooks" });
  }
});

// ═══════════════════════════════════════════════
// DELETE /api/playbook-review/:id — Playbook loeschen
// ═══════════════════════════════════════════════
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const playbook = await Playbook.findOne({ _id: req.params.id, userId });
    if (!playbook) {
      return res.status(404).json({ success: false, message: "Playbook nicht gefunden" });
    }

    // Globales Playbook darf nicht geloescht werden (nur Regeln entfernen)
    if (playbook.isGlobal) {
      return res.status(400).json({
        success: false,
        message: "Globale Anforderungen koennen nicht geloescht werden. Entfernen Sie einzelne Regeln."
      });
    }

    await Playbook.deleteOne({ _id: req.params.id, userId });
    // Zugehoerige Checks behalten (fuer Historie)

    console.log(`✅ [PLAYBOOK-REVIEW] Playbook geloescht: "${playbook.name}" (${playbook._id})`);
    res.json({ success: true, message: "Playbook geloescht" });
  } catch (err) {
    console.error("❌ [PLAYBOOK-REVIEW] Fehler beim Loeschen:", err);
    res.status(500).json({ success: false, message: "Fehler beim Loeschen" });
  }
});

// ═══════════════════════════════════════════════
// POST /api/playbook-review/generate-rules — KI generiert Regeln
// ═══════════════════════════════════════════════
router.post("/generate-rules", verifyToken, async (req, res) => {
  try {
    const { contractType, role, industry, additionalContext } = req.body;

    if (!contractType) {
      return res.status(400).json({ success: false, message: "Vertragstyp ist erforderlich" });
    }

    console.log(`🤖 [PLAYBOOK-REVIEW] Generiere Regeln: ${contractType} / ${role} / ${industry}`);

    const rules = await playbookChecker.generateRules({
      contractType,
      role: role || "neutral",
      industry: industry || "allgemein",
      additionalContext: additionalContext || ""
    });

    console.log(`✅ [PLAYBOOK-REVIEW] ${rules.length} Regeln generiert`);
    res.json({ success: true, rules });
  } catch (err) {
    console.error("❌ [PLAYBOOK-REVIEW] Fehler bei Regelgenerierung:", err);
    res.status(500).json({ success: false, message: "Fehler bei der Regelgenerierung" });
  }
});

// ═══════════════════════════════════════════════
// POST /api/playbook-review/extract-rules — Regeln aus Vertrag extrahieren
// ═══════════════════════════════════════════════
router.post("/extract-rules", verifyToken, async (req, res) => {
  try {
    const { contractText, role } = req.body;

    if (!contractText || contractText.trim().length < 100) {
      return res.status(400).json({ success: false, message: "Vertragstext zu kurz" });
    }

    console.log(`🤖 [PLAYBOOK-REVIEW] Extrahiere Regeln aus Vertrag (${contractText.length} Zeichen)`);

    const rules = await playbookChecker.extractRulesFromContract(contractText, role || "neutral");

    console.log(`✅ [PLAYBOOK-REVIEW] ${rules.length} Regeln extrahiert`);
    res.json({ success: true, rules });
  } catch (err) {
    console.error("❌ [PLAYBOOK-REVIEW] Fehler bei Regelextraktion:", err);
    res.status(500).json({ success: false, message: "Fehler bei der Regelextraktion" });
  }
});

// ═══════════════════════════════════════════════
// POST /api/playbook-review/:id/check — Vertrag gegen Playbook pruefen
// ═══════════════════════════════════════════════
router.post("/:id/check", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const { contractText, contractName, contractId } = req.body;

    if (!contractText || contractText.trim().length < 50) {
      return res.status(400).json({ success: false, message: "Vertragstext zu kurz fuer Pruefung" });
    }

    // Playbook laden
    const playbook = await Playbook.findOne({ _id: req.params.id, userId });
    if (!playbook) {
      return res.status(404).json({ success: false, message: "Playbook nicht gefunden" });
    }

    if (!playbook.rules || playbook.rules.length === 0) {
      return res.status(400).json({ success: false, message: "Playbook hat keine Regeln" });
    }

    // Globale Regeln dazunehmen
    let allRules = [...playbook.rules];
    const globalPlaybook = await Playbook.findGlobal(userId);
    if (globalPlaybook && globalPlaybook.rules.length > 0 && !playbook.isGlobal) {
      const globalRules = globalPlaybook.rules.map(r => ({
        ...r.toObject(),
        isGlobal: true
      }));
      allRules = [...allRules, ...globalRules];
    }

    console.log(`🔍 [PLAYBOOK-CHECK] Starte Pruefung: "${contractName}" gegen "${playbook.name}" (${allRules.length} Regeln)`);

    // KI-Pruefung durchfuehren
    const checkResult = await playbookChecker.checkContract(
      contractText,
      allRules,
      {
        contractName: contractName || "Unbenannt",
        role: playbook.role,
        contractType: playbook.contractType
      }
    );

    // Ergebnis speichern
    const check = new PlaybookCheck({
      playbookId: playbook._id,
      contractId: contractId || null,
      userId,
      contractName: contractName || "Unbenannt",
      results: checkResult.results,
      summary: checkResult.summary
    });
    await check.save();

    // Playbook-Stats aktualisieren
    playbook.checksCount = (playbook.checksCount || 0) + 1;
    playbook.lastCheckAt = new Date();
    await playbook.save();

    console.log(`✅ [PLAYBOOK-CHECK] Pruefung abgeschlossen: Score ${checkResult.summary.overallScore}/100`);

    res.json({
      success: true,
      check,
      usage: checkResult.usage
    });
  } catch (err) {
    console.error("❌ [PLAYBOOK-CHECK] Fehler bei Pruefung:", err);
    res.status(500).json({ success: false, message: err.message || "Fehler bei der Vertragspruefung" });
  }
});

// ═══════════════════════════════════════════════
// GET /api/playbook-review/checks/recent — Letzte Pruefungen
// ═══════════════════════════════════════════════
router.get("/checks/recent", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const limit = parseInt(req.query.limit) || 10;

    const checks = await PlaybookCheck.findByUser(userId, { limit });

    res.json({ success: true, checks });
  } catch (err) {
    console.error("❌ [PLAYBOOK-REVIEW] Fehler beim Laden der Checks:", err);
    res.status(500).json({ success: false, message: "Fehler beim Laden der Pruefungen" });
  }
});

// ═══════════════════════════════════════════════
// GET /api/playbook-review/checks/:checkId — Einzelnes Pruefungsergebnis
// ═══════════════════════════════════════════════
router.get("/checks/:checkId", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const check = await PlaybookCheck.findOne({ _id: req.params.checkId, userId })
      .populate("playbookId", "name contractType role");

    if (!check) {
      return res.status(404).json({ success: false, message: "Pruefung nicht gefunden" });
    }

    res.json({ success: true, check });
  } catch (err) {
    console.error("❌ [PLAYBOOK-REVIEW] Fehler beim Laden der Pruefung:", err);
    res.status(500).json({ success: false, message: "Fehler beim Laden der Pruefung" });
  }
});

// ═══════════════════════════════════════════════
// GET /api/playbook-review/contracts/list — Vertraege des Users fuer Auswahl
// ═══════════════════════════════════════════════
router.get("/contracts/list", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const db = await database.connect();

    // Vertraege laden — prüfe alle 4 Text-Felder
    const rawContracts = await db.collection("contracts").find(
      {
        $or: [
          { userId: userId },
          { userId: new ObjectId(userId) }
        ]
      },
      {
        projection: {
          _id: 1,
          name: 1,
          contractType: 1,
          createdAt: 1,
          extractedText: { $strLenCP: { $ifNull: ["$extractedText", ""] } },
          content: { $strLenCP: { $ifNull: ["$content", ""] } },
          fullText: { $strLenCP: { $ifNull: ["$fullText", ""] } },
          contractHTML: { $strLenCP: { $ifNull: ["$contractHTML", ""] } }
        }
      }
    )
      .sort({ createdAt: -1 })
      .limit(50)
      .toArray();

    // hasExtractedText = true wenn mindestens ein Text-Feld > 50 Zeichen hat
    const contracts = rawContracts.map(c => ({
      _id: c._id,
      name: c.name,
      contractType: c.contractType,
      createdAt: c.createdAt,
      hasExtractedText: (c.extractedText > 50) || (c.content > 50) || (c.fullText > 50) || (c.contractHTML > 50)
    }));

    res.json({ success: true, contracts });
  } catch (err) {
    console.error("❌ [PLAYBOOK-REVIEW] Fehler beim Laden der Vertraege:", err);
    res.status(500).json({ success: false, message: "Fehler beim Laden der Vertraege" });
  }
});

// ═══════════════════════════════════════════════
// GET /api/playbook-review/contracts/:contractId/text — Vertragstext laden
// ═══════════════════════════════════════════════
router.get("/contracts/:contractId/text", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const db = await database.connect();

    const contract = await db.collection("contracts").findOne(
      {
        _id: new ObjectId(req.params.contractId),
        $or: [
          { userId: userId },
          { userId: new ObjectId(userId) }
        ]
      },
      { projection: { extractedText: 1, content: 1, fullText: 1, contractHTML: 1, name: 1, contractType: 1 } }
    );

    if (!contract) {
      return res.status(404).json({ success: false, message: "Vertrag nicht gefunden" });
    }

    // Bestes verfuegbares Text-Feld waehlen (laengstes gewinnt)
    // contractHTML: HTML-Tags entfernen fuer sauberen Text
    const htmlText = contract.contractHTML
      ? contract.contractHTML.replace(/<[^>]+>/g, " ").replace(/&[a-z]+;/g, " ").replace(/\s+/g, " ").trim()
      : "";
    const candidates = [
      contract.extractedText,
      contract.content,
      contract.fullText,
      htmlText
    ].filter(t => t && t.trim().length > 50);

    if (candidates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Dieser Vertrag hat keinen lesbaren Text. Bitte laden Sie den Vertrag erneut hoch."
      });
    }

    // Laengsten Text verwenden (meiste Informationen)
    const bestText = candidates.sort((a, b) => b.length - a.length)[0];

    res.json({
      success: true,
      contractName: contract.name,
      contractType: contract.contractType,
      text: bestText
    });
  } catch (err) {
    console.error("❌ [PLAYBOOK-REVIEW] Fehler beim Laden des Vertragstexts:", err);
    res.status(500).json({ success: false, message: "Fehler beim Laden des Vertragstexts" });
  }
});

// ═══════════════════════════════════════════════
// GET /api/playbook-review/checks/:checkId/export-pdf — Prüfbericht als PDF
// ═══════════════════════════════════════════════
router.get("/checks/:checkId/export-pdf", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const check = await PlaybookCheck.findOne({ _id: req.params.checkId, userId })
      .populate("playbookId", "name");

    if (!check) {
      return res.status(404).json({ success: false, message: "Prüfung nicht gefunden" });
    }

    const playbookName = check.playbookId?.name || "Playbook";

    console.log(`📄 [PLAYBOOK-PDF] Generiere Prüfbericht für "${check.contractName}"`);

    const pdfBuffer = await generateCheckReportPdf({
      check: check.toObject(),
      playbookName
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Pruefbericht_${check.contractName?.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, "_") || "Vertrag"}.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.send(pdfBuffer);

    console.log(`✅ [PLAYBOOK-PDF] Prüfbericht gesendet (${pdfBuffer.length} Bytes)`);
  } catch (err) {
    console.error("❌ [PLAYBOOK-PDF] Fehler:", err);
    res.status(500).json({ success: false, message: "Fehler beim Erstellen des PDF-Berichts" });
  }
});

// ═══════════════════════════════════════════════
// POST /api/playbook-review/checks/:checkId/negotiation-letter — Verhandlungsbrief generieren
// ═══════════════════════════════════════════════
router.post("/checks/:checkId/negotiation-letter", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const check = await PlaybookCheck.findOne({ _id: req.params.checkId, userId })
      .populate("playbookId", "name role");

    if (!check) {
      return res.status(404).json({ success: false, message: "Prüfung nicht gefunden" });
    }

    const playbookName = check.playbookId?.name || "Playbook";
    const role = check.playbookId?.role || "neutral";

    console.log(`📝 [PLAYBOOK-LETTER] Generiere Verhandlungsbrief für "${check.contractName}"`);

    const letterText = await generateNegotiationLetter({
      check: check.toObject(),
      playbookName,
      role
    });

    console.log(`✅ [PLAYBOOK-LETTER] Brief generiert (${letterText.length} Zeichen)`);
    res.json({ success: true, letterText });
  } catch (err) {
    console.error("❌ [PLAYBOOK-LETTER] Fehler:", err);
    res.status(500).json({ success: false, message: "Fehler beim Generieren des Verhandlungsbriefs" });
  }
});

// ═══════════════════════════════════════════════
// POST /api/playbook-review/checks/:checkId/negotiation-letter/pdf — Brief als PDF
// ═══════════════════════════════════════════════
router.post("/checks/:checkId/negotiation-letter/pdf", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;

    const check = await PlaybookCheck.findOne({ _id: req.params.checkId, userId })
      .populate("playbookId", "name role");

    if (!check) {
      return res.status(404).json({ success: false, message: "Prüfung nicht gefunden" });
    }

    const playbookName = check.playbookId?.name || "Playbook";
    const role = check.playbookId?.role || "neutral";

    // Brief generieren (oder aus Cache wenn schon vorhanden)
    const letterText = await generateNegotiationLetter({
      check: check.toObject(),
      playbookName,
      role
    });

    // PDF generieren
    const pdfBuffer = await generateNegotiationLetterPdf({
      letterText,
      contractName: check.contractName
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="Verhandlungsbrief_${check.contractName?.replace(/[^a-zA-Z0-9äöüÄÖÜß_-]/g, "_") || "Vertrag"}.pdf"`,
      "Content-Length": pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ [PLAYBOOK-LETTER-PDF] Fehler:", err);
    res.status(500).json({ success: false, message: "Fehler beim Erstellen des PDF-Briefs" });
  }
});

module.exports = router;
