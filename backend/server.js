// 📁 backend/server.js 
const express = require("express");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
require("dotenv").config();
const { OpenAI } = require("openai");
const nodemailer = require("nodemailer");
const { MongoClient, ObjectId } = require("mongodb");
const verifyToken = require("./middleware/verifyToken");
const checkSubscription = require("./middleware/checkSubscription");
const cron = require("node-cron");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// 📦 Routen & Services
const subscribeRoutes = require("./routes/subscribe");
const stripeRoutes = require("./routes/stripe");
const stripeWebhookRoute = require("./routes/stripeWebhook");
const analyzeRoute = require("./routes/analyze");
const optimizeRoute = require("./routes/optimize");
const compareRoute = require("./routes/compare");
const chatRoute = require("./routes/chatWithContract");
const authRoutes = require("./routes/auth");
const generateRoute = require("./routes/generate");
const analyzeTypeRoute = require("./routes/analyzeType");
const extractTextRoute = require("./routes/extractText");
const checkContractsAndSendReminders = require("./services/cron");

// 🔌 MongoDB Verbindung
const mongoUri = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const client = new MongoClient(mongoUri);
let db, contractsCollection;
(async () => {
  try {
    await client.connect();
    db = client.db("contract_ai");
    contractsCollection = db.collection("contracts");
    console.log("✅ Mit MongoDB verbunden!");
  } catch (err) {
    console.error("❌ MongoDB-Verbindungsfehler:", err);
  }
})();

// ⚠️ Stripe Webhook (vor express.json!)
app.use("/stripe/webhook", stripeWebhookRoute);

// ✅ CORS & Cookies richtig setzen
app.use(cors({
  origin: ["https://contract-ai.de", "https://www.contract-ai.de"],
  credentials: true,
}));
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  next();
});
app.options("*", cors({
  origin: ["https://contract-ai.de", "https://www.contract-ai.de"],
  credentials: true,
}));
app.use(cookieParser());

// 🌐 Middlewares
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// 🧠 OpenAI & 📩 Mailer Setup
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 📂 Upload Setup
const storage = multer.diskStorage({
  destination: "./uploads",
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// 📤 Vertrag hochladen (Analyse + Speicherung)
app.post("/upload", verifyToken, checkSubscription, upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });

  try {
    const buffer = fs.readFileSync(`./uploads/${req.file.filename}`);
    const pdfData = await pdfParse(buffer);
    const pdfText = pdfData.text.substring(0, 5000);

    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "Du bist ein KI-Assistent, der Vertragsdaten extrahiert." },
        { role: "user", content: `Extrahiere aus folgendem Vertrag Name, Laufzeit und Kündigungsfrist:\n\n${pdfText}` },
      ],
      temperature: 0.3,
    });

    const result = response.choices[0].message.content;
    const name = result.match(/Vertragsname:\s*(.*)/i)?.[1] || "Unbekannt";
    const laufzeit = result.match(/Laufzeit:\s*(.*)/i)?.[1] || "Unbekannt";
    const kuendigung = result.match(/Kündigungsfrist:\s*(.*)/i)?.[1] || "Unbekannt";

    let expiryDate = "";
    const match = laufzeit.match(/(\d+)\s*(Jahre|Monate)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      const expiry = new Date();
      if (unit.includes("jahr")) expiry.setFullYear(expiry.getFullYear() + value);
      else if (unit.includes("monat")) expiry.setMonth(expiry.getMonth() + value);
      expiryDate = expiry.toISOString().split("T")[0];
    }

    let status = "Unbekannt";
    if (expiryDate) {
      const expiry = new Date(expiryDate);
      const today = new Date();
      const in30Days = new Date(today);
      in30Days.setDate(today.getDate() + 30);
      if (expiry < today) status = "Abgelaufen";
      else if (expiry <= in30Days) status = "Bald ablaufend";
      else status = "Aktiv";
    }

    const contract = {
      userId: req.user.userId,
      name,
      laufzeit,
      kuendigung,
      expiryDate,
      status,
      uploadedAt: new Date(),
      filePath: `/uploads/${req.file.filename}`,
    };

    await contractsCollection.insertOne(contract);

    await transporter.sendMail({
      from: `"Contract AI" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: "📄 Neuer Vertrag hochgeladen",
      text: `Name: ${name}\nLaufzeit: ${laufzeit}\nKündigungsfrist: ${kuendigung}\nStatus: ${status}\nAblaufdatum: ${expiryDate}`,
    });

    res.json({ message: "Vertrag gespeichert", contract });
  } catch (err) {
    console.error("❌ Fehler bei Analyse:", err);
    res.status(500).json({ message: "Fehler bei Analyse", error: err.message });
  }
});

// ⏰ Cronjob
cron.schedule("0 8 * * *", async () => {
  console.log("⏰ Reminder-Cronjob gestartet");
  await checkContractsAndSendReminders();
});

// 📄 CRUD-Routen
app.get("/contracts", verifyToken, async (req, res) => {
  try {
    const contracts = await contractsCollection.find({ userId: req.user.userId }).toArray();
    res.json(contracts);
  } catch (err) {
    res.status(500).json({ message: "Fehler beim Abrufen" });
  }
});

app.get("/contracts/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const contract = await contractsCollection.findOne({
      _id: new ObjectId(id),
      userId: req.user.userId,
    });
    if (!contract) return res.status(404).json({ message: "Vertrag nicht gefunden" });
    res.json(contract);
  } catch (err) {
    res.status(500).json({ message: "Serverfehler" });
  }
});

app.put("/contracts/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, laufzeit, kuendigung } = req.body;
  try {
    const result = await contractsCollection.updateOne(
      { _id: new ObjectId(id), userId: req.user.userId },
      { $set: { name, laufzeit, kuendigung } }
    );
    if (result.matchedCount === 0)
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    res.json({ message: "Vertrag aktualisiert" });
  } catch (err) {
    res.status(500).json({ message: "Update fehlgeschlagen" });
  }
});

app.delete("/contracts/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await contractsCollection.deleteOne({
      _id: new ObjectId(id),
      userId: req.user.userId,
    });
    if (result.deletedCount === 0)
      return res.status(404).json({ message: "Vertrag nicht gefunden" });
    res.json({ message: "Vertrag gelöscht" });
  } catch (err) {
    res.status(500).json({ message: "Fehler beim Löschen" });
  }
});

// ✅ Geschützte Premium-Funktionen
app.use("/optimize", verifyToken, checkSubscription, optimizeRoute);
app.use("/compare", verifyToken, checkSubscription, compareRoute);
app.use("/chat", verifyToken, checkSubscription, chatRoute);
app.use("/generate", verifyToken, checkSubscription, generateRoute);

// 🌍 Öffentliche Routen
app.use("/auth", authRoutes);
app.use("/stripe", stripeRoutes);
app.use("/stripe", subscribeRoutes);
app.use("/analyze-type", analyzeTypeRoute);
app.use("/extract-text", extractTextRoute);

// 🚀 Server starten
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server läuft auf http://localhost:${PORT}`));
