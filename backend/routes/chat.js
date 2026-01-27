// 📁 backend/routes/chat.js - Legal Chat 2.0 with MongoDB Persistence, SSE Streaming & Lawyer Persona
const express = require("express");
const { ObjectId } = require("mongodb");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const multer = require("multer");
const pdfParse = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const { isBusinessOrHigher, isEnterpriseOrHigher, getFeatureLimit } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen

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

// ⚖️ LAWYER PERSONA - Nutzerorientierte Antworten mit klaren Entscheidungen + Evidence
const SYSTEM_PROMPT = `Du bist "Contract AI – Legal Counsel", ein KI-Vertragsanwalt für Unternehmer und Privatpersonen in Deutschland.

## REGEL 1: ANSWER-FIRST + EVIDENCE

**Bei jeder Frage:**
1. **Zeile 1:** Klare Antwort ("**Ja**" / "**Nein**" / "**[Konkrete Antwort]**")
2. **Zeile 2:** Beleg aus dem Vertrag ODER "Im Vertragstext finde ich dazu keine Regelung."
3. **Danach:** Kurze Erklärung (2-3 Sätze)

**WICHTIG - Quellenangabe:**
- Wenn du etwas im Vertrag findest: "Laut Abschnitt [X] / Klausel [Y] / §[Z] gilt..."
- Wenn du es NICHT findest: "Im vorliegenden Vertragstext sehe ich dazu keine explizite Regelung."
- NIEMALS Informationen erfinden oder vermuten!

**Wenn der Vertrag etwas NICHT regelt:**
→ Antworte: "**Nein** (nicht explizit geregelt)."
→ Dann: "Der Vertrag enthält keine Regelung dazu. Das bedeutet [gesetzliche Defaultregelung]."

## REGEL 2: ANALYSE-KONTEXT NUTZEN

Wenn dir Analyse-Ergebnisse vorliegen (Score, Risiken, Empfehlungen):
- Beziehe dich darauf: "Wie in der Analyse bereits festgestellt..."
- Nutze die Vorarbeit: "Die Analyse hat als Risiko identifiziert: [X]. Das bedeutet für dich..."
- Verknüpfe beides: Analyse-Ergebnisse + Vertragstext

## REGEL 3: ANTWORT-LÄNGE

**Kurze Fragen → Kurze Antworten (3-5 Sätze):**
- Ja/Nein-Fragen
- Einfache Faktenfragen ("Wie lang ist die Kündigungsfrist?")

**Komplexe Fragen → Strukturiert (max 200 Wörter):**

**Kurzantwort:** [Klare Entscheidung]
**Beleg:** [Wo steht das / nicht gefunden]
**Was du tun kannst:** [1-2 konkrete Schritte]

## REGEL 4: KOMMUNIKATIONSSTIL

- Du-Form ("du kannst...", "dein Vertrag...")
- Kein Juristendeutsch - verständlich erklären
- Keine Rückfragen bei einfachen Fragen
- Entscheidungsfreudig, nicht ausweichend
- Ehrlich bei Unsicherheit: "Das kann ich aus dem Text nicht eindeutig ablesen."

## BEISPIELE

**Frage:** "Kann ich jederzeit kündigen?"

❌ FALSCH:
"Die genauen Kündigungsmodalitäten sind nicht explizit geregelt, was darauf hindeutet..."

✅ RICHTIG:
"**Nein.**
Im Vertragstext finde ich keine Kündigungsklausel. Ohne vertragliche Regelung gilt die gesetzliche Frist (§ 621 BGB).
Konkret: Du kannst zum Monatsende kündigen mit [Frist]-Vorlauf."

**Frage:** "Ist der Selbstbehalt zu hoch?"

✅ RICHTIG:
"**Ja, der Selbstbehalt ist überdurchschnittlich hoch.**
Laut der Analyse liegt er bei EUR 1.000 jährlich - das ist über dem Branchendurchschnitt.
Empfehlung: Verhandle diesen Punkt nach unten (üblich sind EUR 250-500)."

---
*Diese Einschätzung basiert auf dem Vertragstext und der Analyse. Sie ersetzt keine individuelle Rechtsberatung.*`;

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

  // Limit aus zentraler Konfiguration (subscriptionPlans.js)
  const chatLimit = getFeatureLimit(plan, 'chat');

  // Initialize chatUsage if not exists
  if (!user.chatUsage) {
    const resetDate = getNextResetDate();
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          chatUsage: {
            count: 0,
            limit: chatLimit,
            resetDate
          }
        }
      }
    );
    return { allowed: true, remaining: chatLimit, current: 0, limit: chatLimit, resetDate };
  }

  // Check if reset needed
  const now = new Date();
  const resetDate = new Date(user.chatUsage.resetDate);

  if (now >= resetDate) {
    // Reset usage
    const newResetDate = getNextResetDate();
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          "chatUsage.count": 0,
          "chatUsage.limit": chatLimit,
          "chatUsage.resetDate": newResetDate
        }
      }
    );
    return { allowed: true, remaining: chatLimit, current: 0, limit: chatLimit, resetDate: newResetDate };
  }

  // Check limit
  const currentCount = user.chatUsage.count || 0;
  const allowed = currentCount < chatLimit;
  const remaining = Math.max(0, chatLimit - currentCount);

  return { allowed, remaining, current: currentCount, limit: chatLimit, resetDate: user.chatUsage.resetDate };
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
      title: initialQuestion && initialQuestion.trim() ? makeSmartTitle(initialQuestion) : "Neuer Chat",
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [{ role: "system", content: SYSTEM_PROMPT }],
      attachments: attachment ? [attachment] : [],
    };

    // Note: initialQuestion is NOT added here - frontend will send it via sendMessage
    // This prevents duplicate messages in the chat

    const { insertedId } = await chats.insertOne(chatDocument);
    const chat = await chats.findOne({ _id: insertedId });

    res.json(chat);
  } catch (error) {
    console.error("❌ Error creating chat:", error);
    res.status(500).json({ error: "Failed to create chat" });
  }
});

// ✅ POST /api/chat/new-with-contract - Create new chat with pre-loaded contract analysis
router.post("/new-with-contract", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { contractId, contractName, analysisContext, s3Key } = req.body || {};

    // Validate required fields
    if (!contractId || !contractName) {
      return res.status(400).json({ error: "contractId and contractName required" });
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(contractId)) {
      return res.status(400).json({ error: "Invalid contractId format" });
    }

    const usersCollection = req.db.collection("users");
    const chats = req.db.collection("chats");
    const contracts = req.db.collection("contracts");

    // ✅ CRITICAL: Check subscription - Business/Enterprise only
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const plan = user.subscriptionPlan || "free";
    const hasAccess = isBusinessOrHigher(plan);

    if (!hasAccess) {
      return res.status(403).json({
        error: "Subscription required",
        message: "Diese Funktion ist nur für Business und Enterprise Nutzer verfügbar.",
        requiredPlan: "business"
      });
    }

    // Verify contract ownership
    const contract = await contracts.findOne({
      _id: new ObjectId(contractId),
      userId: new ObjectId(userId)
    });

    if (!contract) {
      return res.status(404).json({ error: "Contract not found" });
    }

    // Extract PDF text if s3Key is available
    let extractedText = "";
    const effectiveS3Key = s3Key || contract.s3Key;

    if (effectiveS3Key) {
      try {
        const AWS = require("aws-sdk");
        const s3 = new AWS.S3({
          accessKeyId: process.env.AWS_ACCESS_KEY_ID,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          region: process.env.AWS_REGION,
        });

        const s3Object = await s3.getObject({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: effectiveS3Key
        }).promise();

        const pdfData = await pdfParse(s3Object.Body);
        extractedText = pdfData.text.substring(0, 15000); // Limit to 15k chars
      } catch (s3Error) {
        console.warn("⚠️ Could not extract PDF text from S3:", s3Error.message);
        // Continue without PDF text - analysis context is still available
      }
    }

    // Detect contract type from existing analysis or from text
    let contractType = contract.analysis?.contractType || "Vertrag";

    // Build welcome message with analysis context
    const welcomeMessage = `Ich habe die Analyse deines Vertrags "${contractName}" geladen.

${analysisContext || "Keine Analysedaten verfügbar."}

**Was möchtest du zu diesem Vertrag wissen?**

Du kannst mir spezifische Fragen stellen, z.B.:
- Was bedeutet eine bestimmte Klausel?
- Welche Risiken sollte ich beachten?
- Wie kann ich bestimmte Punkte nachverhandeln?`;

    // Create attachment object for context
    const attachment = {
      name: contractName,
      contractId: contractId,
      contractType: contractType,
      extractedText: extractedText,
      analysisContext: analysisContext,
      s3Key: effectiveS3Key || null,
      uploadedAt: new Date()
    };

    // Create chat document
    const chatDocument = {
      userId: new ObjectId(userId),
      title: `Analyse: ${contractName}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "assistant", content: welcomeMessage }
      ],
      attachments: [attachment],
      linkedContractId: new ObjectId(contractId) // Reference to original contract
    };

    const { insertedId } = await chats.insertOne(chatDocument);

    res.json({
      chatId: insertedId,
      success: true
    });
  } catch (error) {
    console.error("❌ Error creating chat with contract:", error);
    res.status(500).json({ error: "Failed to create chat with contract" });
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
      // ✅ BUILD CONTEXT: Include analysis + contract text
      let contextMessages = [...chat.messages];

      // If contract is uploaded, inject STRUCTURED context after system prompt
      if (chat.attachments && chat.attachments.length > 0) {
        const latestContract = chat.attachments[chat.attachments.length - 1];

        // Build structured context (Analysis FIRST, then raw text)
        let contextParts = [];
        contextParts.push(`📎 **Vertrag: "${latestContract.name}"** (${latestContract.contractType || 'Vertrag'})`);
        contextParts.push('');

        // ✅ CRITICAL FIX: Include analysisContext (Score, Risiken, Empfehlungen)
        if (latestContract.analysisContext) {
          contextParts.push('## 📊 ANALYSE-ERGEBNISSE (bereits durchgeführt):');
          contextParts.push(latestContract.analysisContext);
          contextParts.push('');
          contextParts.push('---');
          contextParts.push('');
        }

        // Include extracted PDF text
        if (latestContract.extractedText) {
          contextParts.push('## 📄 VERTRAGSTEXT (extrahiert):');
          contextParts.push(latestContract.extractedText);
          contextParts.push('');
        }

        // Add instruction
        contextParts.push('---');
        contextParts.push('**Instruktion:** Beantworte Fragen basierend auf den Analyse-Ergebnissen UND dem Vertragstext. Zitiere konkrete Stellen. Wenn etwas nicht im Text steht, sag das klar.');

        if (contextParts.length > 3) { // Only add if we have actual content
          const contractContext = {
            role: "system",
            content: contextParts.join('\n')
          };

          // Insert after first system message
          contextMessages.splice(1, 0, contractContext);
        }
      }

      // ✅ FIX #2: Limit message history to prevent token overflow
      const MAX_HISTORY_MESSAGES = 30; // Last 30 user+assistant messages
      const systemMessages = contextMessages.filter(m => m.role === 'system');
      const conversationMessages = contextMessages.filter(m => m.role !== 'system');

      if (conversationMessages.length > MAX_HISTORY_MESSAGES) {
        // Keep only the last MAX_HISTORY_MESSAGES
        const trimmedConversation = conversationMessages.slice(-MAX_HISTORY_MESSAGES);
        contextMessages = [...systemMessages, ...trimmedConversation];
        console.log(`📝 Trimmed chat history from ${conversationMessages.length} to ${MAX_HISTORY_MESSAGES} messages`);
      }

      // Add current user message
      contextMessages.push({ role: "user", content });

      // Declare fullResponse outside try for error handling access
      let fullResponse = "";

      // OpenAI Streaming
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective for chat
        stream: true,
        temperature: 0.3, // Slightly higher for more natural responses
        messages: contextMessages,
      });

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

      // ✅ FIX #3: Better error handling with user-friendly message
      const errorMessage = streamError.code === 'context_length_exceeded'
        ? "Die Konversation ist zu lang geworden. Bitte starte einen neuen Chat."
        : streamError.code === 'rate_limit_exceeded'
        ? "Zu viele Anfragen. Bitte warte einen Moment und versuche es erneut."
        : "Es ist ein Fehler aufgetreten. Bitte versuche es erneut.";

      // Send error as assistant message so user sees it
      res.write(`data: ${JSON.stringify({
        delta: `\n\n⚠️ **Fehler:** ${errorMessage}`,
        error: true
      })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
      clearInterval(heartbeat);

      // Still persist partial response if any
      if (fullResponse && fullResponse.length > 0) {
        await chats.updateOne(
          { _id: chatId },
          {
            $push: { messages: { role: "assistant", content: fullResponse + `\n\n⚠️ *Antwort unvollständig aufgrund eines Fehlers*` } },
            $set: { updatedAt: new Date() },
          }
        );
      }
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
// Force local upload for chat (S3 multer-s3 incompatible with AWS SDK v3)
router.post("/:id/upload", verifyToken, localUpload.single("file"), async (req, res) => {
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
