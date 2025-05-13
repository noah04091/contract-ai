// 📁 backend/server.js
const express = require("express");
const app = express();
require("dotenv").config();

// ⚠️ Wichtig: Nur für den Webhook-Endpunkt bodyParser.raw verwenden,
// und vor jeder anderen Middleware, die den Body verändert!
const bodyParser = require("body-parser");

// Direkte Implementierung des Webhook-Handlers in server.js
// Kein Router verwenden für diesen speziellen Endpunkt
app.post("/stripe/webhook", 
  bodyParser.raw({ type: "application/json" }), 
  async (req, res) => {
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const sig = req.headers["stripe-signature"];
    const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // Debug-Logging
    console.log("⚡ Webhook-Anfrage empfangen", {
      signatureHeader: sig ? "vorhanden" : "fehlt",
      bodyType: typeof req.body,
      bodyLength: req.body ? req.body.length : 0
    });

    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error(`❌ Webhook-Fehler: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Event verarbeiten
    const eventType = event.type;
    const session = event.data.object;
    
    console.log(`✅ Webhook-Event empfangen: ${eventType}`);

    try {
      // DB wird erst später in deinem Code initialisiert, daher wird diese Variable hier definiert
      // und später im Code gefüllt
      let db;
      let { MongoClient, ObjectId } = require("mongodb");

      // Rest der Webhook-Logik
      if (eventType === "checkout.session.completed") {
        const stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;
        const email = session.customer_email || session.customer_details?.email || null;

        console.log(`📦 Checkout abgeschlossen für ${email || stripeCustomerId}`);

        // Wir speichern eine Aufgabe, die später ausgeführt wird, wenn die DB initialisiert ist
        app.locals.pendingWebhookTasks = app.locals.pendingWebhookTasks || [];
        app.locals.pendingWebhookTasks.push(async (db) => {
          try {
            const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
            const priceId = subscription.items.data[0]?.price?.id;

            const priceMap = {
              [process.env.STRIPE_BUSINESS_PRICE_ID]: "business",
              [process.env.STRIPE_PREMIUM_PRICE_ID]: "premium",
            };

            const plan = priceMap[priceId] || "unknown";
            console.log("📦 Webhook: Abo abgeschlossen:", { email, stripeCustomerId, plan });

            const usersCollection = db.collection("users");
            const user = await usersCollection.findOne(
              stripeCustomerId ? { stripeCustomerId } : { email }
            );
            
            if (!user) {
              console.warn("⚠️ Kein Nutzer mit passender Stripe-ID oder E-Mail gefunden.");
              return;
            }

            await usersCollection.updateOne(
              { _id: new ObjectId(user._id) },
              {
                $set: {
                  subscriptionActive: true,
                  isPremium: plan === "premium",
                  isBusiness: plan === "business",
                  subscriptionPlan: plan,
                  stripeCustomerId,
                  stripeSubscriptionId,
                  premiumSince: new Date(),
                  subscriptionStatus: "active",
                },
              }
            );

            console.log(`✅ Nutzer ${email || user.email} auf ${plan}-Plan aktualisiert`);
          } catch (err) {
            console.error("Fehler bei der Webhook-Aufgabenverarbeitung:", err);
          }
        });
      }

      if (eventType === "customer.subscription.deleted") {
        const stripeCustomerId = session.customer;

        // Aufgabe für später speichern
        app.locals.pendingWebhookTasks = app.locals.pendingWebhookTasks || [];
        app.locals.pendingWebhookTasks.push(async (db) => {
          try {
            const usersCollection = db.collection("users");
            const user = await usersCollection.findOne({ stripeCustomerId });
            
            if (!user) {
              console.warn("⚠️ Kein Nutzer zur Kündigung gefunden.");
              return;
            }

            await usersCollection.updateOne(
              { _id: new ObjectId(user._id) },
              {
                $set: {
                  subscriptionActive: false,
                  isPremium: false,
                  isBusiness: false,
                  subscriptionPlan: null,
                  subscriptionStatus: "cancelled",
                },
              }
            );

            console.log(`❌ Abo von ${user.email} wurde gekündigt.`);
          } catch (err) {
            console.error("Fehler bei der Webhook-Aufgabenverarbeitung:", err);
          }
        });
      }

      // Sofort erfolgreich antworten, die tatsächliche Datenbankaktualisierung erfolgt später
      return res.status(200).send("✅ Webhook verarbeitet");
    } catch (err) {
      console.error("❌ Fehler in der Webhook-Logik:", err);
      return res.status(500).send("Interner Fehler bei der Verarbeitung des Webhooks");
    }
  }
);

// 📦 Abhängigkeiten
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
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// 📁 Setup
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

// 🌍 Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    console.warn(`🚫 CORS blockiert: ${origin}`);
    callback(null, false);
  },
  credentials: true,
}));
app.options("*", cors());
app.use(cookieParser());
app.use(express.json()); // ⛔️ Muss nach dem Webhook kommen!
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

// 📦 MongoDB & Start
(async () => {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    const db = client.db("contract_ai");
    const usersCollection = db.collection("users");
    const contractsCollection = db.collection("contracts");
    console.log("✅ MongoDB verbunden!");

    // Alle ausstehenden Webhook-Aufgaben verarbeiten
    if (app.locals.pendingWebhookTasks && app.locals.pendingWebhookTasks.length > 0) {
      console.log(`⚡ Verarbeite ${app.locals.pendingWebhookTasks.length} ausstehende Webhook-Aufgaben...`);
      for (const task of app.locals.pendingWebhookTasks) {
        await task(db);
      }
      app.locals.pendingWebhookTasks = [];
    }

    const checkSubscription = createCheckSubscription(usersCollection);
    const authRoutes = require("./routes/auth")(db);

    app.use("/auth", authRoutes);
    app.use("/stripe/portal", require("./routes/stripePortal"));
    app.use("/stripe", require("./routes/stripe"));
    app.use("/stripe", require("./routes/subscribe"));
    app.use("/optimize", verifyToken, checkSubscription, require("./routes/optimize"));
    app.use("/compare", verifyToken, checkSubscription, require("./routes/compare"));
    app.use("/chat", verifyToken, checkSubscription, require("./routes/chatWithContract"));
    app.use("/generate", verifyToken, checkSubscription, require("./routes/generate"));
    app.use("/analyze-type", require("./routes/analyzeType"));
    app.use("/extract-text", require("./routes/extractText"));
    app.use("/test", require("./testAuth"));

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
      const checkContractsAndSendReminders = require("./services/cron");
      await checkContractsAndSendReminders();
    });

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () => console.log(`🚀 Server läuft auf Port ${PORT}`));
  } catch (err) {
    console.error("❌ Fehler beim Serverstart:", err);
    process.exit(1);
  }
})();

// 🕐 Monatslimit-Reset-Cronjob
require("./cron/resetBusinessLimits");