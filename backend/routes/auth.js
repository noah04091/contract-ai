const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { MongoClient, ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const sendEmail = require("../utils/sendEmail");
require("dotenv").config();

// 🔌 MongoDB
const client = new MongoClient(process.env.MONGO_URI);
let db, usersCollection;
(async () => {
  try {
    await client.connect();
    db = client.db("contract_ai");
    usersCollection = db.collection("users");
    console.log("✅ Nutzer-Collection verbunden.");
  } catch (err) {
    console.error("❌ MongoDB-Fehler:", err);
  }
})();

// 🧾 Registrierung
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  try {
    const existing = await usersCollection.findOne({ email });
    if (existing) return res.status(400).json({ message: "❌ E-Mail bereits registriert" });

    const hashed = await bcrypt.hash(password, 10);
    await usersCollection.insertOne({ email, password: hashed, isPremium: false });

    res.json({ message: "✅ Registrierung erfolgreich" });
  } catch (err) {
    console.error("❌ Fehler bei Registrierung:", err);
    res.status(500).json({ message: "Serverfehler bei Registrierung" });
  }
});

// 🔐 Login mit Cookie-Auth (mit korrektem domain-Eintrag)
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(400).json({ message: "❌ E-Mail nicht gefunden" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: "❌ Falsches Passwort" });

    const token = jwt.sign(
      { email: user.email, userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: ".contract-ai.de", // 🔥 GANZ WICHTIG für Domain-übergreifenden Zugriff!
      maxAge: 1000 * 60 * 60 * 2,
    });

    res.json({ message: "✅ Login erfolgreich", isPremium: user.isPremium || false });
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

    if (!user) return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
    res.json(user);
  } catch (err) {
    console.error("❌ Fehler bei /me:", err);
    res.status(500).json({ message: "Serverfehler bei /me" });
  }
});

// 🔑 Passwort ändern
router.put("/change-password", verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(400).json({ message: "❌ Altes Passwort falsch" });

    const hashed = await bcrypt.hash(newPassword, 10);
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
    await db.collection("contracts").deleteMany({ userId: req.user.userId });
    await db.collection("users").deleteOne({ _id: new ObjectId(req.user.userId) });

    res.clearCookie("token", {
      httpOnly: true,
      secure: true,
      sameSite: "None",
      domain: ".contract-ai.de",
    });

    res.json({ message: "✅ Account & Verträge gelöscht" });
  } catch (err) {
    console.error("❌ Fehler beim Löschen:", err);
    res.status(500).json({ message: "Serverfehler beim Löschen" });
  }
});

// 📩 Passwort vergessen
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ message: "❌ E-Mail nicht gefunden" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expires = Date.now() + 1000 * 60 * 15;

    await usersCollection.updateOne(
      { email },
      { $set: { resetToken, resetTokenExpires: expires } }
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

  try {
    const user = await usersCollection.findOne({ resetToken: token });
    if (!user || user.resetTokenExpires < Date.now()) {
      return res.status(400).json({ message: "❌ Reset-Link ungültig oder abgelaufen" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashed },
        $unset: { resetToken: "", resetTokenExpires: "" },
      }
    );

    res.json({ message: "✅ Passwort zurückgesetzt" });
  } catch (err) {
    console.error("❌ Fehler bei reset-password:", err);
    res.status(500).json({ message: "Fehler beim Zurücksetzen" });
  }
});

module.exports = router;
