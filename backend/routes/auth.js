// 📄 routes/auth.js  
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { MongoClient, ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const sendEmail = require("../utils/sendEmail");
require("dotenv").config();

// 📦 MongoDB-Verbindung
const client = new MongoClient(process.env.MONGO_URI);
let db, usersCollection;

(async () => {
  try {
    await client.connect();
    db = client.db("contract_ai");
    usersCollection = db.collection("users");
    console.log("✅ Nutzer-Collection verbunden.");
  } catch (err) {
    console.error("❌ Fehler bei MongoDB-User:", err);
  }
})();

// 🔐 Registrierung
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const exists = await usersCollection.findOne({ email });
    if (exists) return res.status(400).json({ message: "E-Mail bereits registriert." });

    const hashedPassword = await bcrypt.hash(password, 10);
    await usersCollection.insertOne({ email, password: hashedPassword, isPremium: false });

    res.json({ message: "✅ Registrierung erfolgreich" });
  } catch (err) {
    console.error("❌ Fehler bei Registrierung:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// 🔐 Login – mit JWT im httpOnly-Cookie
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(400).json({ message: "E-Mail nicht gefunden." });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "Falsches Passwort." });

    const token = jwt.sign(
      { email: user.email, userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    // ⬇️ Wichtig: Cookie korrekt für Subdomain setzen!
    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      maxAge: 1000 * 60 * 60 * 2, // 2 Stunden
      domain: ".contract-ai.de", // ⬅️ wichtig: damit der Cookie auf allen Subdomains gilt!
    });

    res.json({ message: "✅ Login erfolgreich", isPremium: user.isPremium || false });
  } catch (err) {
    console.error("❌ Fehler beim Login:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// 👤 Profil abrufen
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0, resetToken: 0, resetTokenExpires: 0 } }
    );
    if (!user) return res.status(404).json({ message: "Benutzer nicht gefunden" });

    res.json(user);
  } catch (err) {
    console.error("❌ Fehler beim Abrufen des Benutzers:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// 🔑 Passwort ändern
router.put("/change-password", verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) return res.status(404).json({ message: "Benutzer nicht gefunden" });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ message: "❌ Altes Passwort ist falsch" });

    const hashed = await bcrypt.hash(newPassword, 10);
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { password: hashed } }
    );

    res.json({ message: "✅ Passwort wurde geändert" });
  } catch (err) {
    console.error("❌ Fehler beim Passwort ändern:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// 🗑️ Account löschen
router.delete("/delete", verifyToken, async (req, res) => {
  try {
    await db.collection("contracts").deleteMany({ userId: req.user.userId });
    await db.collection("users").deleteOne({ _id: new ObjectId(req.user.userId) });

    res.json({ message: "✅ Account erfolgreich gelöscht" });
  } catch (err) {
    console.error("❌ Fehler beim Löschen des Accounts:", err);
    res.status(500).json({ message: "Fehler beim Löschen" });
  }
});

// 📩 Passwort vergessen
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ message: "E-Mail nicht gefunden." });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 1000 * 60 * 15;

    await usersCollection.updateOne(
      { email },
      { $set: { resetToken, resetTokenExpires: expires } }
    );

    const resetLink = `https://contract-ai.de/reset-password?token=${resetToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
        <h2 style="color: #0cf;">🔑 Passwort zurücksetzen</h2>
        <p>Hallo 👋,</p>
        <p>du hast angefragt, dein Passwort zurückzusetzen. Klicke auf den Button unten, um fortzufahren:</p>
        <a href="${resetLink}" style="display: inline-block; padding: 10px 18px; background-color: #0cf; color: black; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 20px;">🔁 Neues Passwort festlegen</a>
        <p style="margin-top: 30px;">Falls du das nicht warst, kannst du diese E-Mail ignorieren.</p>
        <hr />
        <p style="font-size: 0.8rem; color: #aaa;">Contract AI • Automatisierte Vertragsanalyse</p>
      </div>
    `;

    await sendEmail(email, "🔐 Passwort zurücksetzen", html);

    res.json({ message: "✅ E-Mail mit Reset-Link versendet" });
  } catch (err) {
    console.error("❌ Fehler bei Passwort-Reset:", err);
    res.status(500).json({ message: "Fehler beim Senden der Reset-E-Mail" });
  }
});

// 🔄 Neues Passwort setzen
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const user = await usersCollection.findOne({ resetToken: token });
    if (!user || user.resetTokenExpires < Date.now()) {
      return res.status(400).json({ message: "❌ Token ungültig oder abgelaufen" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashed },
        $unset: { resetToken: "", resetTokenExpires: "" },
      }
    );

    res.json({ message: "✅ Passwort erfolgreich zurückgesetzt" });
  } catch (err) {
    console.error("❌ Fehler beim Zurücksetzen:", err);
    res.status(500).json({ message: "Fehler beim Zurücksetzen" });
  }
});

module.exports = router;
