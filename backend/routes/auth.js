const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { ObjectId } = require("mongodb"); // MongoClient wird im server.js verwaltet
const verifyToken = require("../middleware/verifyToken");
const sendEmail = require("../utils/sendEmail");
require("dotenv").config();

// ⚙️ Konfigurationen (bessere Gruppierung)
const JWT_EXPIRES_IN = "2h";
const PASSWORD_SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRES_IN_MS = 1000 * 60 * 15; // 15 Minuten
const COOKIE_NAME = "token";
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: "None",        // Zurück zu "None" für Cross-Site Requests
    // domain: "contract-ai.de", // Domain auskommentiert für bessere Kompatibilität
    path: "/",                // Cookie ist für alle Pfade verfügbar
    maxAge: 1000 * 60 * 60 * 2, // 2 Stunden (entspricht JWT_EXPIRES_IN)
};

// 🔗 MongoDB (Verbindung wird im server.js hergestellt)
let usersCollection;
let contractsCollection; // Zugriff auf contracts Collection falls benötigt

// Middleware, um die Collections zu erhalten (wird im server.js injiziert)
module.exports = (db) => {
    usersCollection = db.collection("users");
    contractsCollection = db.collection("contracts"); // Optional: falls in Auth-Routen benötigt
    return router;
};

// 🧾 Registrierung
router.post("/register", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "❌ E-Mail und Passwort sind erforderlich" });
    }
    try {
        const existing = await usersCollection.findOne({ email });
        if (existing) {
            return res.status(409).json({ message: "❌ E-Mail bereits registriert" }); // 409 Conflict
        }
        const hashed = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
        await usersCollection.insertOne({ email, password: hashed, isPremium: false });
        res.status(201).json({ message: "✅ Registrierung erfolgreich" }); // 201 Created
    } catch (err) {
        console.error("❌ Fehler bei Registrierung:", err);
        res.status(500).json({ message: "Serverfehler bei Registrierung" });
    }
});

// 🔐 Login mit Cookie-Auth
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "❌ E-Mail und Passwort sind erforderlich" });
    }
    try {
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "❌ Ungültige Anmeldeinformationen" }); // 401 Unauthorized
        }
        const match = await bcrypt.compare(password, user.password);
        if (!match) {
            return res.status(401).json({ message: "❌ Ungültige Anmeldeinformationen" }); // 401 Unauthorized
        }
        const token = jwt.sign(
            { email: user.email, userId: user._id },
            process.env.JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Wichtig: Diese Header explizit setzen für CORS und Cookies
        res.setHeader('Access-Control-Allow-Credentials', 'true');
        res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');

        // Cookie mit aktualisierten Optionen setzen
        // Für maximale Kompatibilität senden wir ohne Domain-Einschränkung
        const cookieOptions = { ...COOKIE_OPTIONS };
        res.cookie(COOKIE_NAME, token, cookieOptions);

        // Zum Debuggen: Gib die Cookie-Optionen und andere Infos aus
        console.log("🔑 Login erfolgt für:", email);
        console.log("🍪 Cookie wird gesetzt:", COOKIE_NAME);
        console.log("🍪 Cookie-Optionen:", JSON.stringify(cookieOptions));
        console.log("🍪 Request-Origin:", req.headers.origin);
        console.log("🔑 Token (für Fallback):", token.substring(0, 20) + "...");

        // Token auch in der Antwort zurückgeben für den Fallback-Mechanismus
        res.json({ 
            message: "✅ Login erfolgreich", 
            isPremium: user.isPremium || false,
            token: token // Token auch in der Antwort mitschicken für Fallback
        });
    } catch (err) {
        console.error("❌ Fehler beim Login:", err);
        res.status(500).json({ message: "Serverfehler beim Login" });
    }
});

// 👤 Profilroute
router.get("/me", verifyToken, async (req, res) => {
    try {
        const user = await usersCollection.findOne(
            { _id: new ObjectId(req.user.userId) },
            { projection: { password: 0, resetToken: 0, resetTokenExpires: 0 } }
        );
        if (!user) {
            return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
        }
        res.json(user);
    } catch (err) {
        console.error("❌ Fehler bei /me:", err);
        res.status(500).json({ message: "Serverfehler bei /me" });
    }
});

// 🔑 Passwort ändern
router.put("/change-password", verifyToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
        return res.status(400).json({ message: "❌ Altes und neues Passwort sind erforderlich" });
    }
    try {
        const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
        if (!user) {
            return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
        }
        const match = await bcrypt.compare(oldPassword, user.password);
        if (!match) {
            return res.status(401).json({ message: "❌ Altes Passwort falsch" });
        }
        const hashed = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { password: hashed } }
        );
        res.json({ message: "✅ Passwort geändert" });
    } catch (err) {
        console.error("❌ Fehler bei Passwortänderung:", err);
        res.status(500).json({ message: "Serverfehler bei Passwortänderung" });
    }
});

// 🗑️ Account löschen
router.delete("/delete", verifyToken, async (req, res) => {
    try {
        // **WICHTIG:** Hier greifen wir auf die im server.js erstellte db-Variable zu
        await req.app.locals.db.collection("contracts").deleteMany({ userId: req.user.userId });
        await usersCollection.deleteOne({ _id: new ObjectId(req.user.userId) });

        // Cookie mit aktualisierten Optionen löschen
        res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);

        res.json({ message: "✅ Account & Verträge gelöscht" });
    } catch (err) {
        console.error("❌ Fehler beim Löschen:", err);
        res.status(500).json({ message: "Serverfehler beim Löschen" });
    }
});

// 📩 Passwort vergessen
router.post("/forgot-password", async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ message: "❌ E-Mail ist erforderlich" });
    }
    try {
        const user = await usersCollection.findOne({ email });
        if (!user) {
            return res.status(404).json({ message: "❌ E-Mail nicht gefunden" });
        }
        const resetToken = crypto.randomBytes(32).toString("hex");
        const resetTokenExpires = Date.now() + RESET_TOKEN_EXPIRES_IN_MS;
        await usersCollection.updateOne(
            { email },
            { $set: { resetToken, resetTokenExpires } }
        );
        const resetLink = `https://contract-ai.de/reset-password?token=${resetToken}`;
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>🔐 Passwort zurücksetzen</h2>
                <p>Hallo 👋,</p>
                <p>Klicke auf den Button, um dein Passwort zurückzusetzen:</p>
                <a href="${resetLink}" style="background: #0cf; padding: 10px 18px; text-decoration: none; color: black; border-radius: 6px;">🔁 Neues Passwort festlegen</a>
                <p style="margin-top: 30px;">Wenn du das nicht warst, ignoriere diese E-Mail.</p>
                <hr />
                <p style="font-size: 0.8rem; color: #aaa;">Contract AI • Automatisierte Vertragsanalyse</p>
            </div>
        `;
        await sendEmail(email, "🔐 Passwort zurücksetzen", html);
        res.json({ message: "✅ Reset-Link wurde gesendet" });
    } catch (err) {
        console.error("❌ Fehler bei forgot-password:", err);
        res.status(500).json({ message: "Serverfehler beim Passwort-Reset" });
    }
});

// 🔄 Neues Passwort setzen
router.post("/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
        return res.status(400).json({ message: "❌ Token und neues Passwort sind erforderlich" });
    }
    try {
        const user = await usersCollection.findOne({ resetToken: token });
        if (!user || user.resetTokenExpires < Date.now()) {
            return res.status(400).json({ message: "❌ Reset-Link ungültig oder abgelaufen" });
        }
        const hashed = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { password: hashed }, $unset: { resetToken: "", resetTokenExpires: "" } }
        );
        res.json({ message: "✅ Passwort zurückgesetzt" });
    } catch (err) {
        console.error("❌ Fehler bei reset-password:", err);
        res.status(500).json({ message: "Fehler beim Zurücksetzen" });
    }
});

// 🚪 Logout (Cookie löschen)
router.post("/logout", (req, res) => {
    // Wichtig: Auch hier Headers setzen
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    
    // Cookie mit aktualisierten Optionen löschen
    const cookieOptions = { ...COOKIE_OPTIONS };
    res.clearCookie(COOKIE_NAME, cookieOptions);
    console.log("🍪 Cookie gelöscht:", COOKIE_NAME);
    
    res.json({ message: "✅ Erfolgreich ausgeloggt" });
});

module.exports = router;