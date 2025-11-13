// 📁 backend/routes/chat.js - Legal Chat 2.0 with MongoDB Persistence, SSE Streaming & Lawyer Persona
const express = require("express");
const { ObjectId } = require("mongodb");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
      // OpenAI Streaming
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini", // Cost-effective for chat
        stream: true,
        temperature: 0.2, // Conservative for legal advice
        messages: [...chat.messages, { role: "user", content }],
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

module.exports = router;
