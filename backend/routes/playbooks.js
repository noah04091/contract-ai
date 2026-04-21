// Playbooks API — Smart Playbook System
// Geführte Vertragserstellung mit Decision Engine

const express = require("express");
const router = express.Router();
const verifyToken = require("../middleware/verifyToken");
const requirePremium = require("../middleware/requirePremium");
const decisionEngine = require("../services/decisionEngine");
const database = require("../config/database");
const { ObjectId } = require("mongodb");

// Feature Flag
const PLAYBOOKS_ENABLED = process.env.PLAYBOOKS_ENABLED !== "false"; // default: true

// ═══════════════════════════════════════════════
// GET /api/playbooks — Liste aller verfügbaren Playbooks
// ═══════════════════════════════════════════════
router.get("/", verifyToken, (req, res) => {
  try {
    if (!PLAYBOOKS_ENABLED) {
      return res.status(503).json({ success: false, message: "Playbooks sind derzeit deaktiviert" });
    }

    const playbooks = decisionEngine.listPlaybooks();

    res.json({
      success: true,
      playbooks
    });
  } catch (err) {
    console.error("❌ Fehler beim Laden der Playbooks:", err);
    res.status(500).json({ success: false, message: "Fehler beim Laden der Playbooks" });
  }
});

// ═══════════════════════════════════════════════
// GET /api/playbooks/:type — Einzelnes Playbook laden (Sektionen, Optionen, Modes)
// ═══════════════════════════════════════════════
router.get("/:type", verifyToken, (req, res) => {
  try {
    if (!PLAYBOOKS_ENABLED) {
      return res.status(503).json({ success: false, message: "Playbooks sind derzeit deaktiviert" });
    }

    const playbook = decisionEngine.getPlaybook(req.params.type);

    if (!playbook) {
      return res.status(404).json({
        success: false,
        message: `Playbook "${req.params.type}" nicht gefunden`
      });
    }

    res.json({
      success: true,
      playbook
    });
  } catch (err) {
    console.error("❌ Fehler beim Laden des Playbooks:", err);
    res.status(500).json({ success: false, message: "Fehler beim Laden des Playbooks" });
  }
});

// ═══════════════════════════════════════════════
// POST /api/playbooks/:type/generate — Vertrag generieren via Decision Engine + V2-Pipeline
// ═══════════════════════════════════════════════
router.post("/:type/generate", verifyToken, requirePremium, async (req, res) => {
  try {
    if (!PLAYBOOKS_ENABLED) {
      return res.status(503).json({ success: false, message: "Playbooks sind derzeit deaktiviert" });
    }

    const { decisions, mode, partyData } = req.body;
    const type = req.params.type;

    // Validierung
    if (!type) {
      return res.status(400).json({ success: false, message: "Vertragstyp fehlt" });
    }
    if (!partyData || !partyData.partyA_name || !partyData.partyB_name) {
      return res.status(400).json({ success: false, message: "Partei-Daten unvollständig" });
    }

    console.log(`🧠 [PLAYBOOK] Generiere ${type} im Modus "${mode}" für User ${req.user.userId}`);

    // 1. Decision Engine verarbeiten
    const engineResult = decisionEngine.processDecisions({
      type,
      decisions: decisions || {},
      mode: mode || "ausgewogen",
      partyData
    });

    // 2. V2-Pipeline aufrufen mit angereichertem Prompt
    const { contractText, generationDoc } = await generateWithPlaybook(engineResult, req.user.userId);

    // 3. In DB speichern
    const db = await database.connect();
    const contractId = new ObjectId();

    await db.collection("contracts").insertOne({
      _id: contractId,
      userId: req.user.userId,
      name: `NDA — ${partyData.partyA_name} & ${partyData.partyB_name}`,
      content: contractText,
      contractType: type,
      source: "playbook",
      playbook: {
        type,
        mode: engineResult.mode,
        modeLabel: engineResult.modeLabel,
        decisions: engineResult.resolvedDecisions,
        riskProfile: engineResult.riskProfile
      },
      status: "draft",
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log(`✅ [PLAYBOOK] Vertrag generiert: ${contractId} (${type}, Modus: ${engineResult.mode})`);

    res.json({
      success: true,
      contractId: contractId.toString(),
      contractText,
      mode: engineResult.mode,
      modeLabel: engineResult.modeLabel,
      riskProfile: engineResult.riskProfile,
      sections: engineResult.sections,
      generationDoc
    });

  } catch (err) {
    console.error("❌ Fehler bei Playbook-Generierung:", err);
    res.status(500).json({
      success: false,
      message: "Fehler bei der Vertragsgenerierung",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

// ═══════════════════════════════════════════════
// POST /api/playbooks/:type/preview — Vorschau einer Sektion im Gesamtkontext
// ═══════════════════════════════════════════════
router.post("/:type/preview", verifyToken, requirePremium, async (req, res) => {
  try {
    if (!PLAYBOOKS_ENABLED) {
      return res.status(503).json({ success: false, message: "Playbooks sind derzeit deaktiviert" });
    }

    const { decisions, mode, partyData, section } = req.body;
    const type = req.params.type;

    if (!section) {
      return res.status(400).json({ success: false, message: "Sektion fehlt" });
    }

    // Decision Engine für Preview
    const previewResult = decisionEngine.previewSection({
      type,
      decisions: decisions || {},
      mode: mode || "ausgewogen",
      partyData: partyData || {},
      targetSection: section
    });

    res.json({
      success: true,
      preview: previewResult
    });

  } catch (err) {
    console.error("❌ Fehler bei Playbook-Preview:", err);
    res.status(500).json({
      success: false,
      message: "Fehler bei der Vorschau",
      error: process.env.NODE_ENV === "development" ? err.message : undefined
    });
  }
});

// ═══════════════════════════════════════════════
// POST /api/playbooks/:type/risk-profile — Risikoprofil berechnen (ohne Generation)
// ═══════════════════════════════════════════════
router.post("/:type/risk-profile", verifyToken, (req, res) => {
  try {
    const { decisions, mode } = req.body;
    const type = req.params.type;

    const playbook = decisionEngine.getPlaybook(type);
    if (!playbook) {
      return res.status(404).json({ success: false, message: `Playbook "${type}" nicht gefunden` });
    }

    const resolvedDecisions = decisionEngine.resolveDefaults(playbook, decisions || {}, mode || "ausgewogen");
    const riskProfile = decisionEngine.calculateRiskProfile(playbook, resolvedDecisions);

    res.json({
      success: true,
      riskProfile,
      resolvedDecisions
    });

  } catch (err) {
    console.error("❌ Fehler bei Risikoprofil:", err);
    res.status(500).json({ success: false, message: "Fehler bei der Risikoberechnung" });
  }
});

// ═══════════════════════════════════════════════
// INTERNE FUNKTION: V2-Pipeline mit Playbook-Daten aufrufen
// ═══════════════════════════════════════════════
async function generateWithPlaybook(engineResult, userId) {
  const OpenAI = require("openai");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const { promptInstructions } = engineResult;

  // System-Prompt aus Decision Engine
  const systemPrompt = [
    promptInstructions.systemContext,
    "",
    "PARTEIEN:",
    promptInstructions.partyInfo,
    "",
    "SEKTIONS-ANWEISUNGEN (Intention pro Paragraph):",
    promptInstructions.sectionInstructions,
    "",
    "REGELN:",
    promptInstructions.rules.map((r, i) => `${i + 1}. ${r}`).join("\n")
  ].join("\n");

  const userPrompt = `Erstelle jetzt die vollständige Geheimhaltungsvereinbarung (NDA) basierend auf den obigen Angaben und Sektions-Anweisungen.

Der Vertrag muss enthalten:
§ 1 Vertragsgegenstand und Zweck
§ 2 Vertrauliche Informationen
§ 3 Pflichten der empfangenden Partei
§ 4 Ausnahmen von der Vertraulichkeit
§ 5 Dauer der Geheimhaltung
§ 6 Weitergabe an Dritte
§ 7 Rückgabe und Vernichtung
§ 8 Vertragsstrafe
§ 9 Haftung
§ 10 Gerichtsstand und anwendbares Recht
§ 11 Schlussbestimmungen

Schreibe den KOMPLETTEN Vertrag in professionellem Deutsch. Jeder Paragraph muss vollständig und rechtlich präzise formuliert sein. KEINE Platzhalter, KEINE Abkürzungen, KEINE Unterschriftenzeilen.`;

  const startTime = Date.now();

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.05,
    max_tokens: 8000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  const contractText = response.choices[0]?.message?.content || "";
  const durationMs = Date.now() - startTime;

  const generationDoc = {
    model: "gpt-4o",
    durationMs,
    tokenCount: response.usage?.total_tokens || 0,
    promptTokens: response.usage?.prompt_tokens || 0,
    completionTokens: response.usage?.completion_tokens || 0,
    source: "playbook",
    playbookType: engineResult.playbook,
    playbookMode: engineResult.mode
  };

  console.log(`✅ [PLAYBOOK-GPT] NDA generiert in ${durationMs}ms (${generationDoc.tokenCount} tokens)`);

  return { contractText, generationDoc };
}

module.exports = router;
