// 📁 backend/server.js
const express = require("express");
const app = express();
const cookieParser = require("cookie-parser");
const cors = require("cors");
require("dotenv").config();

const multer = require("multer");
const path = require("path");
const fs = require("fs").promises; // Verwende die Promise-basierte API für async/await
const pdfParse = require("pdf-parse");
const { OpenAI } = require("openai");
const nodemailer = require("nodemailer");
const { MongoClient, ObjectId } = require("mongodb");
const verifyToken = require("./middleware/verifyToken");
const checkSubscription = require("./middleware/checkSubscription");
const cron = require("node-cron");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// 📦 Einige Routen können sofort geladen werden
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

// ⚙️ Konfigurationen (bessere Gruppierung)
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = "contract_ai";
const USERS_COLLECTION = "users";
const CONTRACTS_COLLECTION = "contracts";
const OPENAI_MODEL = "gpt-4";
const EXTRACT_PROMPT = "Extrahiere aus folgendem Vertrag Name, Laufzeit und Kündigungsfrist:\n\n";
const EMAIL_CONFIG = {
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
};
const UPLOAD_PATH = "./uploads";

// 🔌 MongoDB (als Top-Level-Variable für besseren Scope)
let client;
let db;
let usersCollection;
let contractsCollection;
let authRoutes; // Wir deklarieren authRoutes hier, initialisieren es aber erst nach der DB-Verbindung

async function connectDB() {
    try {
        client = new MongoClient(MONGO_URI);
        await client.connect();
        db = client.db(DB_NAME);
        usersCollection = db.collection(USERS_COLLECTION);
        contractsCollection = db.collection(CONTRACTS_COLLECTION);
        
        // Jetzt können wir authRoutes initialisieren, nachdem die DB verbunden ist
        authRoutes = require("./routes/auth")(db);
        
        console.log("✅ MongoDB verbunden!");
    } catch (err) {
        console.error("❌ MongoDB-Verbindungsfehler:", err);
        process.exit(1); // Beende den Prozess bei kritischem Fehler
    }
}

// Sofort die DB-Verbindung herstellen
connectDB();

// ✅ Verbesserte CORS-Konfiguration
const ALLOWED_ORIGINS = ["https://contract-ai.de", "https://www.contract-ai.de", "https://contract-ai-frontend.onrender.com"];

app.use(cors({
    origin: function(origin, callback) {
        // Erlaube Requests ohne Origin (wie mobile Apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.warn(`⚠️ CORS-Anfrage von nicht erlaubtem Origin: ${origin}`);
            callback(null, true); // Im Produktionsbetrieb: callback(new Error('Nicht erlaubter Origin'))
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Cookie", "Accept"],
    exposedHeaders: ["Set-Cookie"],
}));

// Pre-flight Anfragen für alle Routen
app.options("*", cors());

// ✅ Middleware
app.use(cookieParser());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, UPLOAD_PATH)));

// ✅ Globale Middleware für CORS-Header bei jeder Antwort
app.use((req, res, next) => {
    // Setze explizit die Access-Control-Headers für maximale Kompatibilität
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Origin dynamisch setzen basierend auf dem Request
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
    }
    
    next();
});

// ⚠️ Stripe Webhook vor JSON!
app.use("/stripe/webhook", stripeWebhookRoute);

// 🧠 OpenAI
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// 📧 Nodemailer
const transporter = nodemailer.createTransport(EMAIL_CONFIG);

// 📂 Datei-Upload
const storage = multer.diskStorage({
    destination: UPLOAD_PATH,
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});
const upload = multer({ storage });

// 🛠️ Utility-Funktion für die Vertragsanalyse
async function analyzeContract(pdfText) {
    try {
        const response = await openai.chat.completions.create({
            model: OPENAI_MODEL,
            messages: [
                { role: "system", content: "Du bist ein KI-Assistent, der Vertragsdaten extrahiert." },
                { role: "user", content: EXTRACT_PROMPT + pdfText },
            ],
            temperature: 0.3,
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error("❌ Fehler bei der Vertragsanalyse:", error);
        throw new Error("Fehler bei der Vertragsanalyse");
    }
}

// 🛠️ Utility-Funktion zur Extraktion des Ablaufdatums
function extractExpiryDate(laufzeit) {
    const match = laufzeit.match(/(\d+)\s*(Jahre|Monate)/i);
    if (match) {
        const value = parseInt(match[1]);
        const unit = match[2].toLowerCase();
        const expiry = new Date();
        if (unit.includes("jahr")) expiry.setFullYear(expiry.getFullYear() + value);
        else if (unit.includes("monat")) expiry.setMonth(expiry.getMonth() + value);
        return expiry.toISOString().split("T")[0];
    }
    return "";
}

// 🛠️ Utility-Funktion zur Bestimmung des Vertragsstatus
function determineContractStatus(expiryDate) {
    if (!expiryDate) return "Unbekannt";
    const expiry = new Date(expiryDate);
    const today = new Date();
    const in30Days = new Date(today);
    in30Days.setDate(today.getDate() + 30);
    if (expiry < today) return "Abgelaufen";
    if (expiry <= in30Days) return "Bald ablaufend";
    return "Aktiv";
}

// 📤 Vertrag hochladen
app.post("/upload", verifyToken, checkSubscription, upload.single("file"), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Keine Datei hochgeladen" });

    try {
        const buffer = await fs.readFile(path.join(__dirname, UPLOAD_PATH, req.file.filename));
        const pdfData = await pdfParse(buffer);
        const pdfText = pdfData.text.substring(0, 5000);

        const analysisResult = await analyzeContract(pdfText);

        const name = analysisResult.match(/Vertragsname:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";
        const laufzeit = analysisResult.match(/Laufzeit:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";
        const kuendigung = analysisResult.match(/Kündigungsfrist:\s*(.*)/i)?.[1]?.trim() || "Unbekannt";

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

        const insertedContract = await contractsCollection.insertOne(contract);

        await transporter.sendMail({
            from: `"Contract AI" <${process.env.EMAIL_USER}>`,
            to: process.env.EMAIL_USER,
            subject: "📄 Neuer Vertrag hochgeladen",
            text: `Name: ${name}\nLaufzeit: ${laufzeit}\nKündigungsfrist: ${kuendigung}\nStatus: ${status}\nAblaufdatum: ${expiryDate}`,
        });

        res.status(201).json({ message: "Vertrag gespeichert", contract: { ...contract, _id: insertedContract.insertedId } });
    } catch (err) {
        console.error("❌ Fehler beim Hochladen und Analysieren:", err);
        res.status(500).json({ message: "Fehler beim Hochladen und Analysieren", error: err.message });
        if (req.file && fs.existsSync(path.join(__dirname, UPLOAD_PATH, req.file.filename))) {
            await fs.unlink(path.join(__dirname, UPLOAD_PATH, req.file.filename));
        }
    }
});

// 🕐 Cronjob
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
        console.error("❌ Fehler beim Abrufen der Verträge:", err);
        res.status(500).json({ message: "Fehler beim Abrufen der Verträge" });
    }
});

app.get("/contracts/:id", verifyToken, async (req, res) => {
    try {
        const contract = await contractsCollection.findOne({
            _id: new ObjectId(req.params.id),
            userId: req.user.userId,
        });
        if (!contract) return res.status(404).json({ message: "Vertrag nicht gefunden" });
        res.json(contract);
    } catch (err) {
        console.error("❌ Fehler beim Abrufen des Vertrags:", err);
        res.status(500).json({ message: "Fehler beim Abrufen des Vertrags" });
    }
});

app.put("/contracts/:id", verifyToken, async (req, res) => {
    const { name, laufzeit, kuendigung } = req.body;
    try {
        const result = await contractsCollection.updateOne(
            { _id: new ObjectId(req.params.id), userId: req.user.userId },
            { $set: { name, laufzeit, kuendigung } }
        );
        if (result.matchedCount === 0) {
            return res.status(404).json({ message: "Vertrag nicht gefunden" });
        }
        const updatedContract = await contractsCollection.findOne({ _id: new ObjectId(req.params.id) });
        res.json({ message: "Vertrag aktualisiert", contract: updatedContract });
    } catch (err) {
        console.error("❌ Fehler beim Aktualisieren des Vertrags:", err);
        res.status(500).json({ message: "Update fehlgeschlagen" });
    }
});

app.delete("/contracts/:id", verifyToken, async (req, res) => {
    try {
        const result = await contractsCollection.deleteOne({
            _id: new ObjectId(req.params.id),
            userId: req.user.userId,
        });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Vertrag nicht gefunden" });
        }
        res.json({ message: "Vertrag gelöscht", deletedCount: result.deletedCount });
    } catch (err) {
        console.error("❌ Fehler beim Löschen des Vertrags:", err);
        res.status(500).json({ message: "Fehler beim Löschen" });
    }
});

// ✅ Premium-Features
app.use("/optimize", verifyToken, checkSubscription, optimizeRoute);
app.use("/compare", verifyToken, checkSubscription, compareRoute);
app.use("/chat", verifyToken, checkSubscription, chatRoute);
app.use("/generate", verifyToken, checkSubscription, generateRoute);

// 🌍 Öffentliche Routen
// Verwende authRoutes nur, wenn es initialisiert wurde
app.use("/auth", (req, res, next) => {
    if (authRoutes) {
        return authRoutes(req, res, next);
    }
    res.status(503).json({ message: "Authentifizierungsdienst nicht verfügbar, bitte versuche es gleich nochmal" });
});

app.use("/stripe", stripeRoutes);
app.use("/stripe", subscribeRoutes);
app.use("/analyze-type", analyzeTypeRoute);
app.use("/extract-text", extractTextRoute);

const testAuthRoute = require("./testAuth");
app.use("/test", testAuthRoute);

// 🔍 Debug-Endpunkt für CORS- und Cookie-Tests
app.get("/debug", (req, res) => {
    console.log("🔍 Debug-Anfrage erhalten");
    console.log("Origin:", req.headers.origin);
    console.log("Cookies:", req.cookies);
    
    res.cookie("debug_cookie", "test-value", {
        httpOnly: true,
        secure: true,
        sameSite: "None",
        path: "/"
    });
    
    res.json({ 
        message: "Debug-Info", 
        headers: {
            origin: req.headers.origin,
            cookie: req.headers.cookie
        },
        cookies: req.cookies
    });
});

// 🚀 Server starten
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server läuft auf Port ${PORT}`));

// 🧹 Aufräumen beim Herunterfahren (optional, aber gut für Ressourcen)
process.on('SIGINT', async () => {
    console.log('👋 Server wird heruntergefahren...');
    if (client) {
        await client.close();
        console.log('🔌 MongoDB-Verbindung geschlossen.');
    }
    process.exit(0);
});