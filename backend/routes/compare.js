// 📁 backend/routes/chatWithContract.js
const express = require("express");
const { OpenAI } = require("openai");
const verifyToken = require("../middleware/verifyToken");
const pdfParse = require("pdf-parse");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { MongoClient, ObjectId } = require("mongodb");
const saveContract = require("../services/saveContract");

const router = express.Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure multer storage
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    // Create unique filenames with original extension
    cb(null, `${Date.now()}-${req.user.userId}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Only accept PDF files
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error("Nur PDF-Dateien erlaubt"));
    }
  }
});

// RAM storage for chat sessions
const chatMemory = new Map();

// MongoDB connection
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);

let usersCollection, contractsCollection;
(async () => {
  try {
    await client.connect();
    const db = client.db("contract_ai");
    usersCollection = db.collection("users");
    contractsCollection = db.collection("contracts");
    console.log("🧠 MongoDB verbunden (chatWithContract)");
  } catch (err) {
    console.error("❌ MongoDB-Fehler:", err);
  }
})();

// System prompts for different scenarios
const SYSTEM_PROMPTS = {
  WITH_CONTRACT: `
Du bist ein auf Vertragsrecht spezialisierter KI-Assistent. 
Du erklärst Vertragsinhalte verständlich, gibst Orientierung, ersetzt aber keine rechtliche Beratung.
Antworte immer klar, kompakt und freundlich.
Hier ist der Vertragstext, den der Nutzer hochgeladen hat:

{{CONTRACT_TEXT}}

Beziehe dich in deinen Antworten auf den konkreten Inhalt dieses Vertrags.
Bei unklaren Fragen bitte um Präzisierung.
`,
  WITHOUT_CONTRACT: `
Du bist ein auf Vertragsrecht spezialisierter KI-Assistent. 
Du erklärst Vertragsinhalte verständlich, gibst Orientierung, ersetzt aber keine rechtliche Beratung.
Antworte immer klar, kompakt und freundlich.

Der Nutzer hat keinen konkreten Vertrag hochgeladen. Beantworte seine Fragen daher allgemein 
und mit Bezug auf typische Vertragsklauseln und gängige rechtliche Konzepte.
Bei Fragen, die einen spezifischen Vertrag erfordern würden, weise freundlich darauf hin, 
dass du ohne konkreten Vertragstext nur allgemeine Informationen geben kannst.
`
};

// Contract upload endpoint
router.post("/upload", verifyToken, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });

  try {
    // Get user info and check premium status
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "Nutzer nicht gefunden" });
    }

    const isPremium = user.subscriptionActive === true || user.isPremium === true;
    if (!isPremium) {
      return res.status(403).json({ message: "Premium-Funktion erforderlich" });
    }

    // Parse PDF content
    const buffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(buffer);
    
    // Limit text size to prevent token overload
    const text = pdfData.text.substring(0, 15000); 

    // Store in chat memory
    chatMemory.set(req.user.userId, {
      contractText: text,
      fileName: req.file.originalname,
      messages: [],
      lastActivity: Date.now()
    });

    // Save contract reference to database
    await saveContract({
      userId: req.user.userId,
      fileName: req.file.originalname,
      toolUsed: "contract_chat",
      filePath: `/uploads/${req.file.filename}`,
      extraRefs: {
        chatEnabled: true,
        fileSize: req.file.size,
        pageCount: pdfData.numpages || 1
      }
    });

    // Save activity log
    await contractsCollection.insertOne({
      userId: new ObjectId(req.user.userId),
      action: "upload",
      tool: "contract_chat",
      fileName: req.file.originalname,
      timestamp: new Date()
    });

    res.json({ 
      message: "Vertrag erfolgreich geladen. Du kannst jetzt Fragen stellen.",
      fileName: req.file.originalname
    });
  } catch (err) {
    console.error("❌ Fehler beim Vertragsupload:", err);
    res.status(500).json({ message: "Fehler beim Hochladen: " + (err.message || "Unbekannter Fehler") });
  }
});

// Ask question endpoint
router.post("/ask", verifyToken, async (req, res) => {
  const { question, hasContract } = req.body;
  
  if (!question || typeof question !== 'string') {
    return res.status(400).json({ message: "Frage muss angegeben werden" });
  }

  try {
    // Get user info and check premium status
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "Nutzer nicht gefunden" });
    }

    const isPremium = user.subscriptionActive === true || user.isPremium === true;
    if (!isPremium) {
      return res.status(403).json({ message: "Premium-Funktion erforderlich" });
    }

    // Get chat context from memory or initialize new session
    let chatContext = chatMemory.get(req.user.userId);
    
    // Determine the mode (with contract or general legal questions)
    const withContract = chatContext && chatContext.contractText && hasContract;
    
    if (!chatContext) {
      chatContext = {
        contractText: "",
        messages: [],
        lastActivity: Date.now()
      };
      chatMemory.set(req.user.userId, chatContext);
    }

    // Update last activity
    chatContext.lastActivity = Date.now();

    // Check usage limits
    const plan = user.subscriptionPlan || "free";
    const count = user.chatCount || 0;

    let limit = 10;  // Default limit for free users
    if (plan === "business") limit = 100;
    if (plan === "premium") limit = Infinity;

    if (count >= limit && plan !== "premium") {
      return res.status(403).json({
        message: "❌ Chat-Limit erreicht. Bitte Paket upgraden.",
      });
    }

    // Generate system prompt based on whether contract is loaded
    const systemPrompt = withContract 
      ? SYSTEM_PROMPTS.WITH_CONTRACT.replace("{{CONTRACT_TEXT}}", chatContext.contractText)
      : SYSTEM_PROMPTS.WITHOUT_CONTRACT;

    // Prepare messages for OpenAI
    const messages = [
      { role: "system", content: systemPrompt },
      // Include only last 10 messages to avoid token limit
      ...chatContext.messages.slice(-10),
      { role: "user", content: question },
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo", // or your preferred model
      messages,
      temperature: 0.3, // Lower temperature for more precise answers
      max_tokens: 1000, // Limit response length
      stream: false,
    });

    const answer = completion.choices[0].message.content;

    // Add to chat history
    chatContext.messages.push({ role: "user", content: question });
    chatContext.messages.push({ role: "assistant", content: answer });

    // Save to chatMemory
    chatMemory.set(req.user.userId, chatContext);

    // Update usage count
    await usersCollection.updateOne(
      { _id: user._id },
      { $inc: { chatCount: 1 } }
    );

    // Save interaction to analytics
    await contractsCollection.insertOne({
      userId: new ObjectId(req.user.userId),
      action: "chat_question",
      tool: "contract_chat",
      hasContract: withContract,
      question: question.substring(0, 200), // Save truncated question for analytics
      timestamp: new Date()
    });

    res.json({ answer });
  } catch (err) {
    console.error("❌ Fehler im Chat:", err);
    res.status(500).json({ 
      message: "Fehler bei der Anfrage: " + (err.message || "Unbekannter Fehler")
    });
  }
});

// Clear chat history endpoint
router.post("/clear", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    const chatContext = chatMemory.get(userId);
    
    if (chatContext) {
      // Keep contract text but clear messages
      chatContext.messages = [];
      chatContext.lastActivity = Date.now();
      chatMemory.set(userId, chatContext);
    }
    
    res.json({ message: "Chat-Verlauf gelöscht" });
  } catch (err) {
    console.error("❌ Fehler beim Löschen des Chat-Verlaufs:", err);
    res.status(500).json({ message: "Fehler beim Löschen des Chat-Verlaufs" });
  }
});

// Cleanup old chat sessions (run this as a scheduled task)
const cleanupOldSessions = () => {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours
  
  for (const [userId, context] of chatMemory.entries()) {
    if (now - context.lastActivity > maxAge) {
      chatMemory.delete(userId);
    }
  }
};

// Run cleanup every hour
setInterval(cleanupOldSessions, 60 * 60 * 1000);

module.exports = router;