// 📁 backend/server.js
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs").promises;
const pdfParse = require("pdf-parse");
const { OpenAI } = require("openai");
const nodemailer = require("nodemailer");
const { MongoClient, ObjectId } = require("mongodb");
const cron = require("node-cron");
const verifyToken = require("./middleware/verifyToken");
const createCheckSubscription = require("./middleware/checkSubscription");
require("dotenv").config();

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Routen
const subscribeRoutes = require("./routes/subscribe");
const stripeRoutes = require("./routes/stripe");
const stripeWebhookRoute = require("./routes/stripeWebhook");
const analyzeRoute = require("./routes/analyze");
const optimizeRoute = require("./routes/optimize");
const compareRoute = require("./routes/compare");
const chatRoute = require("./routes/chatWithContract");
const generateRoute = require("./routes/generate");
const analyzeTypeRoute = require("./routes/analyzeType");
const extractTextRoute = require("./routes/extractText");
const checkContractsAndSendReminders = require("./services/cron");

const app = express();
const UPLOAD_PATH = "./uploads";
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const EMAIL_CONFIG = {
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};
const ALLOWED_ORIGINS = [
  "https://contract-ai.de",
  "https://www.contract-ai.de",
  "https://contract-ai-frontend.onrender.com",
  "https://contract-ai.vercel.app",
  "http://localhost:5173",
  undefined,
];

const transporter = nodemailer.createTransport(EMAIL_CONFIG);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const storage = multer.diskStorage({
  destination: UPLOAD_PATH,
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`CORS blockiert: ${origin}`);
    callback(null, false);
  },
  credentials: true,
}));
app.options("*", cors());
app.use(cookieParser());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, UPLOAD_PATH)));

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  next();
});

// Stripe Webhook vor allen anderen Routen
app.use("/stripe/webhook", stripeWebhookRoute);

function extractExpiryDate(laufzeit) {
  const match = laufzeit.match(/(\d+)\s*(Jahre|Monate)/i);
  if (!match) return "";
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const expiry = new Date();
  if (unit.includes("jahr")) expiry.setFullYear(expiry.getFullYear() + value);
  else expiry.setMonth(expiry.getMonth() + value);
  return expiry.toISOString().split("T")[0];
}

function determineContractStatus(expiryDate) {
  if (!expiryDate) return "Unbekannt";
  const expiry = new Date(expiryDate);
  const today = new Date();
  const in30 = new Date();
  in30.setDate(today.getDate() + 30);
  if (expiry < today) return "Abgelaufen";
  if (expiry <= in30) return "Bald ablaufend";
  return "Aktiv";
}

async function analyzeContract(pdfText) {
  const res = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [
      { role: "system", content: "Du bist ein KI-Assistent, der Vertragsdaten extrahiert." },
      { role: "user", content: "Extrahiere aus folgendem Vertrag Name, Laufzeit und Kündigungsfrist:\n\n" + pdfText },
    ],
    temperature: 0.3,
  });
  return res.choices[0].message.content;
}

// MongoDB & Routen laden
(async () => {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");
    const contractsCollection = db.collection("contracts");
    console.log("✅ MongoDB verbunden!");

    const checkSubscription = createCheckSubscription(usersCollection);
    const authRoutes = require("./routes/auth")(db);
    const stripePortalRoute = require("./routes/stripePortal")(usersCollection); // 🆕 eingebaut

    app.use("/auth", authRoutes);
    app.use("/stripe/portal", stripePortalRoute); // 🆕 eingebaut

    app.post("/upload", verifyToken, checkSubscription, upload.single("file"), async (req, res) => {
      if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });
      const buffer = await fs.readFile(path.join(__dirname, UPLOAD_PATH, req.file.filename));
      const text = (await pdfParse(buffer)).text.substring(0, 5000);
      const analysis = await analyzeContract(text);

      const name = analysis.match(/Vertragsname:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";
      const laufzeit = analysis.match(/Laufzeit:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";
      const kuendigung = analysis.match(/Kündigungsfrist:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";
      const expiryDate = extractExpiryDate(laufzeit);
      const status = determineContractStatus(expiryDate);

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

      const { insertedId } = await contractsCollection.insertOne(contract);
      await transporter.sendMail({
        from: `Contract AI <${process.env.EMAIL_USER}>`,
        to: process.env.EMAIL_USER,
        subject: "📄 Neuer Vertrag hochgeladen",
        text: `Name: ${name}\nLaufzeit: ${laufzeit}\nKündigungsfrist: ${kuendigung}\nStatus: ${status}\nAblaufdatum: ${expiryDate}`,
      });

      res.status(201).json({ message: "Vertrag gespeichert", contract: { ...contract, _id: insertedId } });
    });

    // CRUD
    app.get("/contracts", verifyToken, async (req, res) => {
      const contracts = await contractsCollection.find({ userId: req.user.userId }).toArray();
      res.json(contracts);
    });

    app.get("/contracts/:id", verifyToken, async (req, res) => {
      const contract = await contractsCollection.findOne({
        _id: new ObjectId(req.params.id),
        userId: req.user.userId,
      });
      if (!contract) return res.status(404).json({ message: "Nicht gefunden" });
      res.json(contract);
    });

    app.put("/contracts/:id", verifyToken, async (req, res) => {
      const { name, laufzeit, kuendigung } = req.body;
      await contractsCollection.updateOne(
        { _id: new ObjectId(req.params.id), userId: req.user.userId },
        { $set: { name, laufzeit, kuendigung } }
      );
      const updated = await contractsCollection.findOne({ _id: new ObjectId(req.params.id) });
      res.json({ message: "Aktualisiert", contract: updated });
    });

    app.delete("/contracts/:id", verifyToken, async (req, res) => {
      const result = await contractsCollection.deleteOne({
        _id: new ObjectId(req.params.id),
        userId: req.user.userId,
      });
      if (!result.deletedCount) return res.status(404).json({ message: "Nicht gefunden" });
      res.json({ message: "Gelöscht", deletedCount: result.deletedCount });
    });

    // Weitere Routen
    app.use("/optimize", verifyToken, checkSubscription, optimizeRoute);
    app.use("/compare", verifyToken, checkSubscription, compareRoute);
    app.use("/chat", verifyToken, checkSubscription, chatRoute);
    app.use("/generate", verifyToken, checkSubscription, generateRoute);
    app.use("/stripe", stripeRoutes);
    app.use("/stripe", subscribeRoutes);
    app.use("/analyze-type", analyzeTypeRoute);
    app.use("/extract-text", extractTextRoute);
    app.use("/test", require("./testAuth"));

    app.get("/debug", (req, res) => {
      console.log("Cookies:", req.cookies);
      res.cookie("debug_cookie", "test-value", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        path: "/",
      });
      res.json({ cookies: req.cookies });
    });

    cron.schedule("0 8 * * *", async () => {
      console.log("⏰ Reminder-Cronjob gestartet");
      await checkContractsAndSendReminders();
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server läuft auf Port ${PORT}`));
  } catch (err) {
    console.error("❌ Fehler beim Serverstart:", err);
    process.exit(1);
  }
})();

// 🕐 Cronjob für Monatsreset laden
require("./cron/resetBusinessLimits");
