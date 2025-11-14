// 📁 backend/routes/chat.js - Legal Chat 2.0 with MongoDB Persistence, SSE Streaming & Lawyer Persona
const express = require("express");
const { ObjectId } = require("mongodb");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ✅ S3 File Storage Integration
let s3Upload, generateSignedUrl;
try {
  const fileStorage = require("../services/fileStorage");
  s3Upload = fileStorage.upload;
  generateSignedUrl = fileStorage.generateSignedUrl;
} catch (err) {
  console.warn("⚠️ S3 File Storage Services nicht verfügbar:", err.message);
  s3Upload = null;
  generateSignedUrl = null;
}

// Fallback to local storage if S3 not available
const localStorage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const localUpload = multer({ storage: localStorage });

/**
 * MongoDB Collections:
 * - chats: { _id, userId, title, createdAt, updatedAt, messages: [{role, content}], attachments: [{name, url, s3Key}] }
 * - users: { chatUsage: { count, limit, resetDate } }
 */

// ⚖️ LAWYER PERSONA - Strukturierte Antworten wie ein Rechtsanwalt für Vertragsrecht
const SYSTEM_PROMPT = `Du bist "Contract AI – Legal Counsel", ein spezialisierter KI-Assistent für deutsches Vertragsrecht.

**Deine Rolle:**
- Antworte klar, ruhig und präzise wie ein erfahrener Rechtsanwalt für Vertragsrecht
- Nutze eine konservative, vorsichtige Sprache (z.B. "nach bisherigem Sachstand spricht vieles dafür, dass...")
- Vermeide endgültige rechtliche Aussagen - markiere Unsicherheiten deutlich
- Verweise auf relevante Paragraphen nur auf Paragraph-Ebene (z.B. §§ 305 ff. BGB, nicht vollständige Zitate)

**Antwortstruktur (verwende Markdown):**

**Kurzantwort:**
[Ein prägnanter Absatz mit der Kernaussage in 2-4 Sätzen]

**Einschätzung & Begründung:**
- [Stichpunkt 1: Juristische Herleitung]
- [Stichpunkt 2: Relevante Rechtsnormen]
- [Stichpunkt 3: Wo liegt Unsicherheit?]

**Risiken & Folgen:**
- [Risiko 1] – Schweregrad: [niedrig/mittel/hoch]
- [Risiko 2] – Schweregrad: [niedrig/mittel/hoch]

**Empfohlene Schritte:**
1. [Konkrete Handlung 1]
2. [Konkrete Handlung 2]
3. [Konkrete Handlung 3]
(Nutze Wenn-Dann-Logik)

**Rückfragen an dich:**
1. [Präzise Rückfrage zur Klärung von Sachverhalten]
2. [Frage zu Fristen/Nachweisen]
3. [Weitere relevante Klärung]

**Hinweise:**
Diese Einschätzung ersetzt keine individuelle Rechtsberatung. Bei komplexen Fällen oder konkreten Rechtsfragen wende dich bitte an einen Fachanwalt für Vertragsrecht.

---

**Wenn Vertragstext vorliegt:**
- Beziehe dich auf konkrete Klauseln, Paragraphen und Seitenzahlen
- Zitiere relevante Passagen wörtlich (in Anführungszeichen)

**Bei Templates oder Formulierungen:**
- Liefere neutrale, ausgewogene Entwürfe mit Platzhaltern
- Markiere optionale Klauseln deutlich
`;

// 🔧 HELPER: Smart Title Generator
function makeSmartTitle(question = "") {
  const text = question.trim().slice(0, 60);
  if (!text) return "Neuer Chat";

  // Pattern-Matching für typische Vertragsfragen
  if (/kündigungsfrist|kündigung/gi.test(text)) return `Kündigung – ${text.slice(0, 40)}`;
  if (/mietvertrag|miete/gi.test(text)) return `Mietvertrag – ${text.slice(0, 40)}`;
  if (/freelancer|freiberufler/gi.test(text)) return `Freelancer – ${text.slice(0, 40)}`;
  if (/arbeitsvertrag|arbeit/gi.test(text)) return `Arbeitsvertrag – ${text.slice(0, 40)}`;
  if (/vertragsstrafe/gi.test(text)) return `Vertragsstrafe – ${text.slice(0, 40)}`;

  return `Vertragsfrage – ${text}`;
}

// 🔧 HELPER: Update title only once (when "Neuer Chat")
function smartTitleFallback(oldTitle, lastMsg) {
  if (oldTitle && oldTitle !== "Neuer Chat") return oldTitle;
  return makeSmartTitle(lastMsg);
}

// 🔧 HELPER: Check Chat Usage Limits
async function checkChatLimit(userId, usersCollection) {
  const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
  if (!user) throw new Error("User not found");

  const plan = user.subscriptionPlan || "free";

  // Limit per Plan
  let chatLimit = 10; // Free
  if (plan === "business") chatLimit = 50;
  if (plan === "premium" || plan === "enterprise") chatLimit = Infinity;

  // Initialize chatUsage if not exists
  if (!user.chatUsage) {
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          chatUsage: {
            count: 0,
            limit: chatLimit,
            resetDate: getNextResetDate()
          }
        }
      }
    );
    return { allowed: true, remaining: chatLimit };
  }

  // Check if reset needed
  const now = new Date();
  const resetDate = new Date(user.chatUsage.resetDate);

  if (now >= resetDate) {
    // Reset usage
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          "chatUsage.count": 0,
          "chatUsage.limit": chatLimit,
          "chatUsage.resetDate": getNextResetDate()
        }
      }
    );
    return { allowed: true, remaining: chatLimit };
  }

  // Check limit
  const currentCount = user.chatUsage.count || 0;
  const allowed = currentCount < chatLimit;
  const remaining = Math.max(0, chatLimit - currentCount);

  return { allowed, remaining, current: currentCount, limit: chatLimit };
}

// 🔧 HELPER: Get next reset date (1st of next month)
function getNextResetDate() {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
}

// 🔧 HELPER: Increment chat usage
async function incrementChatUsage(userId, usersCollection) {
  await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $inc: { "chatUsage.count": 1 } }
  );
}

// 🔧 HELPER: Analyze contract type from text
async function analyzeContractType(text) {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Analysiere den Vertragstyp. Antworte nur mit einem Wort: Mietvertrag, Arbeitsvertrag, Freelancervertrag, Kaufvertrag, Dienstleistungsvertrag, Lizenzvertrag, NDA, oder Sonstiges."
        },
        {
          role: "user",
          content: `Welcher Vertragstyp ist das?\n\n${text.substring(0, 2000)}`
        }
      ],
      temperature: 0.3,
      max_tokens: 20
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error("Contract type analysis error:", error);
    return "Sonstiges";
  }
}

// 🔧 HELPER: Generate smart contract-specific questions
async function generateSmartQuestions(contractType, contractText) {
  const baseQuestions = {
    "Mietvertrag": [
      "Wie hoch ist die Kaution und ist sie angemessen?",
      "Welche Kündigungsfristen gelten für mich als Mieter?",
      "Sind Schönheitsreparaturen wirksam auf mich übertragen?",
      "Gibt es problematische Kleinreparaturklauseln?",
      "Welche Nebenkostenumlagen sind zulässig?"
    ],
    "Arbeitsvertrag": [
      "Ist die Probezeit rechtens?",
      "Wie sind Überstunden und Mehrarbeit geregelt?",
      "Gibt es eine Konkurrenzklausel und ist sie wirksam?",
      "Wie sind Urlaub und Krankheit geregelt?",
      "Ist die Kündigungsfrist korrekt?"
    ],
    "Freelancervertrag": [
      "Wie ist die Vergütung geregelt (Stunden-/Tagessatz)?",
      "Gibt es eine Haftungsbeschränkung?",
      "Wem gehören die Nutzungsrechte/IP?",
      "Wie funktioniert die Kündigung?",
      "Sind Vertragsstrafen vereinbart?"
    ],
    "Kaufvertrag": [
      "Wann geht das Eigentum über?",
      "Welche Gewährleistungsfristen gelten?",
      "Gibt es einen Rücktrittsrecht?",
      "Wie ist die Zahlung geregelt?",
      "Wer trägt das Transportrisiko?"
    ],
    "Dienstleistungsvertrag": [
      "Was genau ist der Leistungsumfang?",
      "Wie erfolgt die Abnahme?",
      "Gibt es Vertragsstrafen bei Verzug?",
      "Wie ist die Haftung begrenzt?",
      "Welche Kündigungsrechte habe ich?"
    ],
    "NDA": [
      "Welche Informationen sind vertraulich?",
      "Wie lange gilt die Geheimhaltung?",
      "Was passiert bei Verstößen (Vertragsstrafen)?",
      "Gibt es Ausnahmen von der Geheimhaltung?",
      "Wann endet die Verpflichtung?"
    ]
  };

  // Base questions for contract type
  const questions = baseQuestions[contractType] || [
    "Was sind die wichtigsten Punkte dieses Vertrags?",
    "Welche Risiken birgt dieser Vertrag?",
    "Gibt es unklare oder problematische Klauseln?",
    "Wie kann ich aus diesem Vertrag wieder herauskommen?",
    "Was sollte ich vor der Unterschrift noch klären?"
  ];

  // TODO: Use AI to generate additional context-specific questions
  // For now, return base questions
  return questions;
}

// ==========================================
// 📡 API ROUTES
// ==========================================

// ✅ POST /api/chat/new - Create new chat
router.post("/new", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { initialQuestion, attachment } = req.body || {};
    const chats = req.db.collection("chats");

    const chatDocument = {
      userId: new ObjectId(userId),
      title: "Neuer Chat",
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      attachments: attachment ? [attachment] : [],
    };

    // Add initial question if provided
    if (initialQuestion && initialQuestion.trim()) {
      chatDocument.messages.push({ role: "user", content: initialQuestion });
      chatDocument.title = makeSmartTitle(initialQuestion);
    }

    const { insertedId } = await chats.insertOne(chatDocument);
    const chat = await chats.findOne({ _id: insertedId });

    res.json(chat);
  } catch (error) {
    console.error("❌ Error creating chat:", error);
    res.status(500).json({ error: "Failed to create chat" });
  }
});

// ✅ GET /api/chat - List all chats for user
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const chats = req.db.collection("chats");
    const chatList = await chats
      .find(
        { userId: new ObjectId(userId) },
        { projection: { messages: 0 } } // Exclude messages for performance
      )
      .sort({ updatedAt: -1 })
      .toArray();

    res.json(chatList);
  } catch (error) {
    console.error("❌ Error listing chats:", error);
    res.status(500).json({ error: "Failed to list chats" });
  }
});

// ✅ GET /api/chat/:id - Get specific chat with all messages
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const chats = req.db.collection("chats");
    const chat = await chats.findOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(userId),
    });

    if (!chat) return res.status(404).json({ error: "Chat not found" });

    res.json(chat);
  } catch (error) {
    console.error("❌ Error loading chat:", error);
    res.status(500).json({ error: "Failed to load chat" });
  }
});

// ✅ POST /api/chat/:id/message - Send message with SSE Streaming
router.post("/:id/message", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { content } = req.body || {};
    if (!content || !content.trim()) {
      return res.status(400).json({ error: "Message content required" });
    }

    const chats = req.db.collection("chats");
    const usersCollection = req.db.collection("users");
    const chatId = new ObjectId(req.params.id);

    // Check chat ownership
    const chat = await chats.findOne({
      _id: chatId,
      userId: new ObjectId(userId),
    });

    if (!chat) return res.status(404).json({ error: "Chat not found" });

    // ✅ CHECK CHAT LIMITS
    const limitCheck = await checkChatLimit(userId, usersCollection);
    if (!limitCheck.allowed) {
      return res.status(403).json({
        error: "Chat limit reached",
        message: `Du hast dein monatliches Chat-Limit erreicht (${limitCheck.limit} Nachrichten). Upgrade für mehr Fragen!`,
        limit: limitCheck.limit,
        current: limitCheck.current,
      });
    }

    // Append user message and update title
    await chats.updateOne(
      { _id: chatId },
      {
        $push: { messages: { role: "user", content } },
        $set: {
          updatedAt: new Date(),
          title: smartTitleFallback(chat.title, content),
        },
      }
    );

    // ✅ INCREMENT USAGE
    await incrementChatUsage(userId, usersCollection);

    // ✅ SSE STREAMING SETUP
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    // Heartbeat to keep connection alive (every 15s)
    const heartbeat = setInterval(() => {
      res.write(":\n\n");
    }, 15000);

    // Cleanup on client disconnect
    req.on("close", () => {
      clearInterval(heartbeat);
      console.log("🔌 Client disconnected from SSE stream");
    });

    try {
      // ✅ BUILD CONTEXT: Include contract text if uploaded
      let contextMessages = [...chat.messages];

      // If contract is uploaded, inject it after system prompt
      if (chat.attachments && chat.attachments.length > 0) {
        const latestContract = chat.attachments[chat.attachments.length - 1];

        if (latestContract.extractedText) {
          const contractContext = {
            role: "system",
            content: `📎 **Vertragskontext (${latestContract.contractType}): "${latestContract.name}"**\n\n${latestContract.extractedText}\n\n---\n\nBeantworte alle Fragen im Kontext dieses Vertrags. Verweise auf konkrete Klauseln und Passagen.`
          };

          // Insert after first system message
          contextMessages.splice(1, 0, contractContext);
        }
      }

      // Add current user message
      contextMessages.push({ role: "user", content });

      // OpenAI Streaming
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective for chat
        stream: true,
        temperature: 0.2, // Conservative for legal advice
        messages: contextMessages,
      });

      let fullResponse = "";

      for await (const chunk of response) {
        const delta = chunk.choices?.[0]?.delta?.content || "";
        if (delta) {
          fullResponse += delta;
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
      }

      // Send done signal
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();

      // Persist assistant message
      await chats.updateOne(
        { _id: chatId },
        {
          $push: { messages: { role: "assistant", content: fullResponse } },
          $set: { updatedAt: new Date() },
        }
      );

      clearInterval(heartbeat);
    } catch (streamError) {
      console.error("❌ Streaming error:", streamError);
      res.write(`data: ${JSON.stringify({ error: "LLM_ERROR" })}\n\n`);
      res.end();
      clearInterval(heartbeat);
    }
  } catch (error) {
    console.error("❌ Error in message route:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Generation failed" });
    }
  }
});

// ✅ PATCH /api/chat/:id - Update chat (rename, archive, etc.)
router.patch("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { title, archived } = req.body;
    const chats = req.db.collection("chats");

    const updateFields = {};
    if (title !== undefined) updateFields.title = title;
    if (archived !== undefined) updateFields.archived = archived;
    updateFields.updatedAt = new Date();

    const result = await chats.updateOne(
      {
        _id: new ObjectId(req.params.id),
        userId: new ObjectId(userId),
      },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json({ success: true, message: "Chat updated" });
  } catch (error) {
    console.error("❌ Error updating chat:", error);
    res.status(500).json({ error: "Failed to update chat" });
  }
});

// ✅ DELETE /api/chat/:id - Delete chat
router.delete("/:id", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const chats = req.db.collection("chats");
    const result = await chats.deleteOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: "Chat not found" });
    }

    res.json({ success: true, message: "Chat deleted" });
  } catch (error) {
    console.error("❌ Error deleting chat:", error);
    res.status(500).json({ error: "Failed to delete chat" });
  }
});

// ✅ GET /api/chat/usage - Get current usage stats
router.get("/usage/stats", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const usersCollection = req.db.collection("users");
    const limitCheck = await checkChatLimit(userId, usersCollection);

    res.json({
      current: limitCheck.current || 0,
      limit: limitCheck.limit,
      remaining: limitCheck.remaining,
      resetDate: limitCheck.resetDate,
    });
  } catch (error) {
    console.error("❌ Error getting usage stats:", error);
    res.status(500).json({ error: "Failed to get usage stats" });
  }
});

// ✅ POST /api/chat/:id/upload - Upload contract PDF to chat
router.post("/:id/upload", verifyToken, (s3Upload || localUpload).single("file"), async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const chats = req.db.collection("chats");
    const chatId = new ObjectId(req.params.id);

    // Verify chat ownership
    const chat = await chats.findOne({
      _id: chatId,
      userId: new ObjectId(userId),
    });

    if (!chat) return res.status(404).json({ error: "Chat not found" });

    // Extract PDF text
    let pdfText = "";
    let buffer;

    if (req.file.key) {
      // S3 Upload
      const AWS = require("aws-sdk");
      const s3 = new AWS.S3({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
      });

      const s3Object = await s3.getObject({
        Bucket: req.file.bucket,
        Key: req.file.key
      }).promise();

      buffer = s3Object.Body;
    } else {
      // Local Upload
      buffer = fs.readFileSync(req.file.path);
    }

    const pdfData = await pdfParse(buffer);
    pdfText = pdfData.text.substring(0, 15000); // Limit to 15k chars

    // Analyze contract type
    const contractType = await analyzeContractType(pdfText);

    // Generate smart questions
    const smartQuestions = await generateSmartQuestions(contractType, pdfText);

    // Create attachment object
    const attachment = {
      name: req.file.originalname,
      s3Key: req.file.key || null,
      s3Bucket: req.file.bucket || null,
      s3Location: req.file.location || null,
      localPath: req.file.path || null,
      uploadedAt: new Date(),
      contractType: contractType,
      extractedText: pdfText,
      smartQuestions: smartQuestions,
    };

    // Update chat with attachment
    await chats.updateOne(
      { _id: chatId },
      {
        $push: { attachments: attachment },
        $set: { updatedAt: new Date() },
      }
    );

    // Add system message about upload
    const systemMessage = {
      role: "system",
      content: `📎 Vertrag "${req.file.originalname}" (${contractType}) hochgeladen. Der KI-Rechtsanwalt hat nun Zugriff auf den vollständigen Vertragstext und kann spezifische Fragen dazu beantworten.`
    };

    await chats.updateOne(
      { _id: chatId },
      { $push: { messages: systemMessage } }
    );

    res.json({
      success: true,
      attachment: {
        name: attachment.name,
        contractType: attachment.contractType,
        smartQuestions: attachment.smartQuestions,
      },
    });

  } catch (error) {
    console.error("❌ Upload error:", error);
    res.status(500).json({ error: "Upload failed", details: error.message });
  }
});

// ✅ GET /api/chat/:id/questions - Get smart questions for uploaded contract
router.get("/:id/questions", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const chats = req.db.collection("chats");
    const chat = await chats.findOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(userId),
    });

    if (!chat) return res.status(404).json({ error: "Chat not found" });

    // Get latest attachment's smart questions
    const latestAttachment = chat.attachments?.slice(-1)[0];

    if (!latestAttachment || !latestAttachment.smartQuestions) {
      return res.json({ questions: [] });
    }

    res.json({
      contractType: latestAttachment.contractType,
      questions: latestAttachment.smartQuestions,
    });

  } catch (error) {
    console.error("❌ Error getting questions:", error);
    res.status(500).json({ error: "Failed to get questions" });
  }
});

module.exports = router;
