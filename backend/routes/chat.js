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
const { fixUtf8Filename } = require("../utils/fixUtf8"); // ✅ Fix UTF-8 Encoding

// ✅ RAG: Law Embeddings für Gesetzesdatenbank-Integration
let lawEmbeddings = null;
try {
  const { getInstance } = require("../services/lawEmbeddings");
  lawEmbeddings = getInstance();
  console.log("✅ Law Embeddings Service loaded for Chat RAG");
} catch (err) {
  console.warn("⚠️ Law Embeddings Service nicht verfügbar:", err.message);
}

// ✅ RAG: Court Decision Embeddings für Rechtsprechungs-Integration
let courtDecisionEmbeddings = null;
try {
  const { getInstance } = require("../services/courtDecisionEmbeddings");
  courtDecisionEmbeddings = getInstance();
  console.log("✅ Court Decision Embeddings Service loaded for Chat RAG");
} catch (err) {
  console.warn("⚠️ Court Decision Embeddings Service nicht verfügbar:", err.message);
}

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

// 🔧 HELPER: Extract PDF text with page numbers for precise citations
async function extractPdfWithPages(pdfBuffer, maxChars = 15000) {
  const pages = [];
  let totalChars = 0;

  // Custom page render function to capture each page separately
  const renderPage = async (pageData) => {
    const textContent = await pageData.getTextContent();
    const pageText = textContent.items.map(item => item.str).join(' ');
    return pageText;
  };

  try {
    const pdfData = await pdfParse(pdfBuffer, { pagerender: renderPage });

    // Split by form feed character (page break) or estimate by character count
    const rawText = pdfData.text;
    const numPages = pdfData.numpages || 1;

    // Estimate chars per page
    const charsPerPage = Math.ceil(rawText.length / numPages);

    // Build page-annotated text
    let annotatedText = '';
    let currentPos = 0;

    for (let pageNum = 1; pageNum <= numPages && totalChars < maxChars; pageNum++) {
      const pageStart = (pageNum - 1) * charsPerPage;
      const pageEnd = Math.min(pageNum * charsPerPage, rawText.length);
      const pageText = rawText.substring(pageStart, pageEnd).trim();

      if (pageText.length > 0) {
        const remainingChars = maxChars - totalChars;
        const textToAdd = pageText.substring(0, remainingChars);

        annotatedText += `\n\n[📄 Seite ${pageNum}]\n${textToAdd}`;
        totalChars += textToAdd.length + 20; // +20 for page marker

        pages.push({
          page: pageNum,
          text: textToAdd,
          charStart: currentPos,
          charEnd: currentPos + textToAdd.length
        });

        currentPos += textToAdd.length;
      }
    }

    return {
      annotatedText: annotatedText.trim(),
      pages: pages,
      totalPages: numPages,
      extractedPages: pages.length
    };
  } catch (error) {
    console.warn("⚠️ Page-wise extraction failed, falling back to simple extraction:", error.message);
    // Fallback to simple extraction
    const pdfData = await pdfParse(pdfBuffer);
    return {
      annotatedText: pdfData.text.substring(0, maxChars),
      pages: [{ page: 1, text: pdfData.text.substring(0, maxChars), charStart: 0, charEnd: maxChars }],
      totalPages: pdfData.numpages || 1,
      extractedPages: 1
    };
  }
}

/**
 * MongoDB Collections:
 * - chats: { _id, userId, title, createdAt, updatedAt, messages: [{role, content}], attachments: [{name, url, s3Key}] }
 * - users: { chatUsage: { count, limit, resetDate } }
 */

// ⚖️ LAWYER PERSONA - Intelligente Antwort-Tiefe je nach User-Intent
const SYSTEM_PROMPT = `Du bist ein freundlicher Vertragsexperte. Antworte wie ein guter Freund, der zufällig Anwalt ist.

## KERN-REGEL: Lies den Intent des Users!

Der User bestimmt durch seine Frage, wie detailliert du antwortest:

**LEVEL 1 - Einfache Frage → Einfache Antwort**
Keine Gesetze, keine Urteile, nur die Fakten.
- "Wann kann ich kündigen?" → "Zum 31.03.2026, mit 3 Monaten Frist."
- "Wie lange läuft das?" → "24 Monate."
- "Was kostet das?" → "49€ pro Monat."

**LEVEL 2 - Nachfrage/Verständnisfrage → Etwas mehr Kontext**
Erkläre kurz, aber immer noch ohne Paragraphen-Flut.
- "Warum so lange Frist?" → "Das ist bei Gewerbeverträgen üblich. 3 Monate gibt dir Zeit, einen Nachfolger zu finden."
- "Ist das normal?" → "Ja, marktüblich. Die meisten Verträge haben 1-3 Monate."

**LEVEL 3 - Rechtliche Frage → Gesetze erwähnen**
Erst wenn der User nach Recht fragt, zitierst du Gesetze.
- "Ist das überhaupt erlaubt?" → "Ja, § 622 BGB erlaubt bis zu 7 Monate bei langer Betriebszugehörigkeit."
- "Gilt das rechtlich?" → "Laut § 309 Nr. 9 BGB maximal 24 Monate Erstlaufzeit."
- "Was sagt das Gesetz?" → Jetzt darfst du Paragraphen zitieren.

**LEVEL 4 - Tiefe juristische Analyse → Urteile + Gesetze**
Nur bei explizitem Wunsch oder komplexen rechtlichen Problemen.
- "Kann ich das anfechten?" → Hier BGH-Urteile und Gesetze nennen.
- "Wie hat der BGH das entschieden?" → Volle juristische Analyse.
- "Gibt es Rechtsprechung dazu?" → Jetzt Urteile zitieren.

## BEISPIELE

❌ FALSCH (überladen):
User: "Wann kann ich kündigen?"
Bot: "Gemäß § 622 Abs. 1 BGB beträgt die Kündigungsfrist vier Wochen zum Fünfzehnten oder zum Ende eines Kalendermonats. Der BGH hat in VIII ZR 277/16 entschieden..."

✅ RICHTIG (angemessen):
User: "Wann kann ich kündigen?"
Bot: "Zum 31. März 2026 – du musst 3 Monate vorher kündigen, also spätestens bis Ende Dezember."

User: "Ist das rechtlich okay so?"
Bot: "Ja, § 622 BGB erlaubt diese Frist. Bei deiner Vertragsdauer sogar eher kurz."

User: "Was wenn ich früher raus will?"
Bot: "Schwierig. Der BGH ist da streng. Aber du könntest versuchen, einen Härtefall geltend zu machen..."

## DEIN KONTEXT
- Vertragstext mit [📄 Seite X] Markern
- Evtl. Analyse mit Score und Risiken
- Gesetze (BGB, etc.) und BGH-Urteile – aber NUR wenn passend!

## GOLDENE REGELN
1. Einfache Frage = Einfache Antwort. Punkt.
2. Gesetze nur wenn der User nach Recht fragt
3. Urteile nur bei echten Rechtsfragen oder auf Nachfrage
4. Immer die Sprache des Users spiegeln (locker → locker, formell → formell)
5. Erfinde nichts – nur was wirklich im Text/Gesetz steht
6. Bei Unsicherheit: sag es ehrlich`;

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

// 🔧 HELPER: Generate dynamic follow-up questions based on conversation
async function generateFollowUpQuestions(userQuestion, aiResponse, contractType = "Vertrag") {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Du generierst 3 SPEZIFISCHE Folgefragen basierend auf dem gerade besprochenen Thema.

KRITISCH - DIE FRAGEN MÜSSEN:
1. Direkt auf die letzte Antwort Bezug nehmen
2. Konkrete Begriffe/Zahlen/Themen aus der Antwort aufgreifen
3. Dem User helfen, das Thema zu vertiefen

VERBOTEN:
- Generische Fragen die zu jedem Vertrag passen
- Themen die nichts mit der letzten Antwort zu tun haben
- Wiederholung der gerade gestellten Frage

FORMAT:
- Max 10 Wörter
- Natürlich formuliert
- Eine Frage pro Zeile, keine Nummerierung

BEISPIEL:
Wenn Antwort über "3 Monate Kündigungsfrist" war:
✅ "Kann ich die 3 Monate verkürzen?"
✅ "Was wenn ich früher raus muss?"
✅ "Gilt die Frist auch für den Anbieter?"
❌ "Was sind die Risiken?" (zu generisch)
❌ "Wie ist die Haftung geregelt?" (anderes Thema)`
        },
        {
          role: "user",
          content: `KONTEXT:
Vertragstyp: ${contractType}
User fragte: "${userQuestion}"
Antwort war: "${aiResponse.substring(0, 800)}"

Generiere 3 spezifische Folgefragen die DIREKT auf diese Antwort eingehen:`
        }
      ],
      temperature: 0.4, // Niedriger für konsistentere, relevantere Ergebnisse
      max_tokens: 120
    });

    const text = response.choices[0].message.content.trim();
    const questions = text.split('\n')
      .map(q => q.replace(/^[-•*\d.)\s]+/, '').trim()) // Remove bullets/numbers
      .filter(q => q.length > 5 && q.length < 80 && q.includes('?'))
      .slice(0, 3);

    return questions.length > 0 ? questions : null;
  } catch (error) {
    console.warn("⚠️ Follow-up questions generation failed:", error.message);
    return null;
  }
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

    // Extract PDF text with page numbers for precise citations
    let extractedText = "";
    let pdfPages = [];
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

        // ✅ NEW: Extract with page annotations for precise citations
        const pdfResult = await extractPdfWithPages(s3Object.Body, 15000);
        extractedText = pdfResult.annotatedText;
        pdfPages = pdfResult.pages;

        console.log(`📄 Extracted ${pdfResult.extractedPages}/${pdfResult.totalPages} pages from PDF`);
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

    // Create attachment object for context (with page info for citations)
    const attachment = {
      name: contractName,
      contractId: contractId,
      contractType: contractType,
      extractedText: extractedText,
      pdfPages: pdfPages, // ✅ NEW: Page-by-page breakdown for precise citations
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

// ✅ POST /api/chat/:id/add-contract - Add another contract for comparison (Multi-Document)
router.post("/:id/add-contract", verifyToken, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { contractId, contractName, analysisContext, s3Key } = req.body || {};
    const chatId = req.params.id;

    // Validate required fields
    if (!contractId || !contractName) {
      return res.status(400).json({ error: "contractId and contractName required" });
    }

    if (!ObjectId.isValid(contractId) || !ObjectId.isValid(chatId)) {
      return res.status(400).json({ error: "Invalid ID format" });
    }

    const usersCollection = req.db.collection("users");
    const chats = req.db.collection("chats");
    const contracts = req.db.collection("contracts");

    // ✅ Check subscription - Enterprise only for multi-doc comparison
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const plan = user.subscriptionPlan || "free";
    const hasAccess = isEnterpriseOrHigher(plan);

    if (!hasAccess) {
      return res.status(403).json({
        error: "Subscription required",
        message: "Multi-Dokument-Vergleich ist nur für Enterprise Nutzer verfügbar.",
        requiredPlan: "enterprise"
      });
    }

    // Verify chat ownership
    const chat = await chats.findOne({
      _id: new ObjectId(chatId),
      userId: new ObjectId(userId)
    });

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    // Check max attachments (limit to 3 for now)
    if (chat.attachments && chat.attachments.length >= 3) {
      return res.status(400).json({
        error: "Maximum contracts reached",
        message: "Maximal 3 Verträge pro Chat erlaubt."
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

    // Extract PDF text with page numbers
    let extractedText = "";
    let pdfPages = [];
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

        const pdfResult = await extractPdfWithPages(s3Object.Body, 10000); // Smaller limit for comparison
        extractedText = pdfResult.annotatedText;
        pdfPages = pdfResult.pages;
      } catch (s3Error) {
        console.warn("⚠️ Could not extract PDF text from S3:", s3Error.message);
      }
    }

    // Create attachment object
    const attachment = {
      name: contractName,
      contractId: contractId,
      contractType: contract.analysis?.contractType || "Vertrag",
      extractedText: extractedText,
      pdfPages: pdfPages,
      analysisContext: analysisContext,
      s3Key: effectiveS3Key || null,
      uploadedAt: new Date()
    };

    // Add to chat attachments and create system message
    const contractLabel = String.fromCharCode(65 + (chat.attachments?.length || 0)); // A, B, C...
    const systemMessage = {
      role: "assistant",
      content: `📎 **Vertrag ${contractLabel}** hinzugefügt: "${contractName}"\n\nDu kannst jetzt die Verträge vergleichen. Frag mich z.B.:\n- "Vergleiche die Kündigungsfristen in beiden Verträgen"\n- "Welcher Vertrag ist günstiger?"\n- "Wo unterscheiden sich die Haftungsregelungen?"`
    };

    await chats.updateOne(
      { _id: new ObjectId(chatId) },
      {
        $push: {
          attachments: attachment,
          messages: systemMessage
        },
        $set: { updatedAt: new Date() }
      }
    );

    res.json({
      success: true,
      contractLabel: `Vertrag ${contractLabel}`,
      totalContracts: (chat.attachments?.length || 0) + 1
    });

  } catch (error) {
    console.error("❌ Error adding contract to chat:", error);
    res.status(500).json({ error: "Failed to add contract to chat" });
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
      // ✅ BUILD CONTEXT: Include analysis + contract text (supports MULTIPLE contracts)
      let contextMessages = [...chat.messages];

      // If contracts are uploaded, inject STRUCTURED context after system prompt
      if (chat.attachments && chat.attachments.length > 0) {
        const contracts = chat.attachments;
        const isMultiDoc = contracts.length > 1;

        // Build structured context for ALL contracts
        let contextParts = [];

        if (isMultiDoc) {
          contextParts.push(`## 📑 MULTI-DOKUMENT-MODUS: ${contracts.length} Verträge geladen`);
          contextParts.push('Du kannst Verträge vergleichen. Referenziere sie als "Vertrag A", "Vertrag B" etc.');
          contextParts.push('');
        }

        // Process each contract
        contracts.forEach((contract, index) => {
          const label = isMultiDoc ? `Vertrag ${String.fromCharCode(65 + index)}` : 'Vertrag';
          const charLimit = isMultiDoc ? 6000 : 12000; // Less per doc if multiple

          contextParts.push(`---`);
          contextParts.push(`# 📎 ${label}: "${contract.name}" (${contract.contractType || 'Vertrag'})`);
          contextParts.push('');

          // Include analysis context
          if (contract.analysisContext) {
            contextParts.push(`## 📊 ANALYSE (${label}):`);
            contextParts.push(contract.analysisContext);
            contextParts.push('');
          }

          // Include extracted PDF text (limited per contract if multiple)
          if (contract.extractedText) {
            const limitedText = contract.extractedText.substring(0, charLimit);
            contextParts.push(`## 📄 TEXT (${label}):`);
            contextParts.push(limitedText);
            if (contract.extractedText.length > charLimit) {
              contextParts.push(`\n[... ${label} gekürzt auf ${charLimit} Zeichen ...]`);
            }
            contextParts.push('');
          }
        });

        // Add instruction based on mode
        contextParts.push('---');
        if (isMultiDoc) {
          contextParts.push('**Instruktion (Multi-Dokument):** Vergleiche die Verträge wenn gefragt. Referenziere klar: "In Vertrag A steht X, während Vertrag B Y regelt." Zitiere mit Seitenzahlen wenn vorhanden.');
        } else {
          contextParts.push('**Instruktion:** Beantworte Fragen basierend auf den Analyse-Ergebnissen UND dem Vertragstext. Zitiere konkrete Stellen mit Seitenzahlen. Wenn etwas nicht im Text steht, sag das klar.');
        }

        if (contextParts.length > 3) { // Only add if we have actual content
          const contractContext = {
            role: "system",
            content: contextParts.join('\n')
          };

          // Insert after first system message
          contextMessages.splice(1, 0, contractContext);
        }
      }

      // ✅ FIX A: Explicit message order guarantee (systemPrompt → contractContext → conversation)
      const MAX_HISTORY_MESSAGES = 30; // Last 30 user+assistant messages

      // EXPLICIT ORDER: Separate messages by role and position
      // Find the main system prompt (first system message, or one containing key phrases)
      const systemPrompt = contextMessages.find(m =>
        m.role === 'system' &&
        (m.content.includes('freundlicher Vertragsexperte') ||
         m.content.includes('Contract AI') ||
         m.content.includes('KI-Vertragsanwalt'))
      ) || contextMessages.find(m => m.role === 'system'); // Fallback: first system message

      // Find contract context message (contains PDF text or analysis)
      const contractContext = contextMessages.find(m =>
        m.role === 'system' &&
        m !== systemPrompt && // Not the main system prompt
        (m.content.includes('📄 TEXT') ||
         m.content.includes('📊 ANALYSE') ||
         m.content.includes('📎') ||
         m.content.includes('Vertrag:'))
      );
      const conversationMessages = contextMessages.filter(m => m.role !== 'system');

      // Trim conversation if too long
      let trimmedConversation = conversationMessages;
      if (conversationMessages.length > MAX_HISTORY_MESSAGES) {
        trimmedConversation = conversationMessages.slice(-MAX_HISTORY_MESSAGES);
        console.log(`📝 Trimmed chat history from ${conversationMessages.length} to ${MAX_HISTORY_MESSAGES} messages`);
      }

      // ✅ GUARANTEED ORDER: systemPrompt FIRST, then contractContext, then conversation
      contextMessages = [
        systemPrompt,           // 1. Base system prompt (always first)
        contractContext,        // 2. Contract context (if exists)
        ...trimmedConversation  // 3. Last N conversation messages
      ].filter(Boolean);        // Remove undefined entries

      // ✅ RAG: Query relevant laws based on user question
      let lawContext = null;
      if (lawEmbeddings) {
        try {
          const relevantLaws = await lawEmbeddings.queryRelevantSections({
            text: content, // User's question
            topK: 5,
            area: null // Search all areas
          });

          if (relevantLaws.length > 0 && relevantLaws[0].relevance > 0.5) {
            // Build law context for AI
            const lawParts = relevantLaws
              .filter(law => law.relevance > 0.5) // Only include relevant laws
              .map(law => `**${law.lawId} ${law.sectionId}** (Relevanz: ${Math.round(law.relevance * 100)}%)\n${law.text?.substring(0, 400) || law.title}`)
              .slice(0, 3); // Max 3 laws to keep context manageable

            if (lawParts.length > 0) {
              lawContext = {
                role: "system",
                content: `## 📚 RELEVANTE GESETZE (aus Datenbank):\n\n${lawParts.join('\n\n---\n\n')}\n\n**WICHTIG:** Diese Gesetze sind nur ZUSATZINFO für dich. NICHT automatisch zitieren!\n- Bei einfachen Fragen (Fristen, Fakten): KEINE Paragraphen nennen\n- Bei rechtlichen Fragen ("Ist das erlaubt?"): Kurz das Gesetz erwähnen\n- Bei tiefen juristischen Fragen: Ausführlich zitieren mit "Gemäß § X BGB..."\n\nLies den Intent des Users und entscheide dann!`
              };
              console.log(`⚖️ RAG: Found ${lawParts.length} relevant laws for query`);
            }
          }
        } catch (ragError) {
          console.warn("⚠️ RAG query failed, continuing without law context:", ragError.message);
          // Continue without law context - not critical
        }
      }

      // Insert law context after contract context (if available)
      if (lawContext) {
        // Find position after contract context
        const insertPosition = contractContext ? 2 : 1;
        contextMessages.splice(insertPosition, 0, lawContext);
      }

      // ✅ RAG: Query relevant court decisions (BGH/OLG Urteile)
      let courtContext = null;
      if (courtDecisionEmbeddings) {
        try {
          const relevantDecisions = await courtDecisionEmbeddings.queryRelevantDecisions({
            text: content, // User's question
            topK: 3,
            legalArea: null // Search all areas
          });

          if (relevantDecisions.length > 0 && relevantDecisions[0].relevance > 0.45) {
            // Build court decision context for AI
            const decisionParts = relevantDecisions
              .filter(d => d.relevance > 0.45) // Only include relevant decisions
              .map(d => {
                const date = new Date(d.decisionDate).toLocaleDateString('de-DE');
                const headnote = d.headnotes[0]?.substring(0, 300) || d.summary.substring(0, 300);
                return `**${d.court}, ${d.caseNumber}** (${date})\n${d.legalArea} | Relevanz: ${Math.round(d.relevance * 100)}%\n\n> "${headnote}..."${d.relevantLaws.length > 0 ? `\n\nRelevante Normen: ${d.relevantLaws.join(', ')}` : ''}`;
              })
              .slice(0, 2); // Max 2 decisions to keep context manageable

            if (decisionParts.length > 0) {
              courtContext = {
                role: "system",
                content: `## ⚖️ RELEVANTE RECHTSPRECHUNG (aus Datenbank):\n\n${decisionParts.join('\n\n---\n\n')}\n\n**WICHTIG:** Urteile sind ZUSATZINFO - NICHT automatisch zitieren!\n- Bei einfachen Fragen: KEINE Urteile erwähnen\n- Bei Nachfragen zur Rechtslage: Nur wenn direkt relevant erwähnen\n- Bei tiefen juristischen Fragen ("Kann ich das anfechten?"): Ausführlich zitieren\n\nUser bestimmt durch seine Frage, ob er juristische Details will!`
              };
              console.log(`📜 RAG: Found ${decisionParts.length} relevant court decisions for query`);
            }
          }
        } catch (courtRagError) {
          console.warn("⚠️ Court RAG query failed, continuing without court context:", courtRagError.message);
          // Continue without court context - not critical
        }
      }

      // Insert court context after law context (if available)
      if (courtContext) {
        // Find position: after lawContext or after contractContext
        const insertPosition = lawContext ? (contractContext ? 3 : 2) : (contractContext ? 2 : 1);
        contextMessages.splice(insertPosition, 0, courtContext);
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

      // ✅ Generate dynamic follow-up questions (non-blocking)
      let followUpQuestions = null;
      const contractType = chat.attachments?.[0]?.contractType || "Vertrag";

      // Generate in parallel while we send the done signal
      const followUpPromise = generateFollowUpQuestions(content, fullResponse, contractType)
        .catch(err => {
          console.warn("⚠️ Follow-up generation failed:", err.message);
          return null;
        });

      // Wait briefly for follow-ups (max 2 seconds, don't block user)
      try {
        followUpQuestions = await Promise.race([
          followUpPromise,
          new Promise(resolve => setTimeout(() => resolve(null), 2000))
        ]);
      } catch (e) {
        followUpQuestions = null;
      }

      // Send done signal with follow-up questions
      res.write(`data: ${JSON.stringify({
        done: true,
        followUpQuestions: followUpQuestions || []
      })}\n\n`);
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

    // ✅ Upload to S3 if local file (so PDF preview works)
    let s3Key = req.file.key || null;
    if (!s3Key && req.file.path && process.env.S3_BUCKET_NAME) {
      try {
        const { PutObjectCommand } = require("@aws-sdk/client-s3");
        const { S3Client } = require("@aws-sdk/client-s3");
        const s3Client = new S3Client({
          region: process.env.AWS_REGION,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          },
        });
        s3Key = `chat-uploads/${Date.now()}_${fixUtf8Filename(req.file.originalname)}`;
        await s3Client.send(new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: s3Key,
          Body: buffer,
          ContentType: "application/pdf",
        }));
        console.log(`✅ Chat PDF uploaded to S3: ${s3Key}`);
      } catch (s3Err) {
        console.warn("⚠️ S3 upload failed, PDF preview won't work:", s3Err.message);
        s3Key = null;
      }
    }

    // Create attachment object
    const attachment = {
      name: fixUtf8Filename(req.file.originalname),
      s3Key: s3Key,
      s3Bucket: process.env.S3_BUCKET_NAME || null,
      s3Location: s3Key ? `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}` : null,
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
      content: `📎 Vertrag "${fixUtf8Filename(req.file.originalname)}" (${contractType}) hochgeladen. Der KI-Rechtsanwalt hat nun Zugriff auf den vollständigen Vertragstext und kann spezifische Fragen dazu beantworten.`
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
