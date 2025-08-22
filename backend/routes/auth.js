// 📁 backend/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const sendEmail = require("../utils/sendEmail");
require("dotenv").config();

// 🔐 Konfiguration
const JWT_EXPIRES_IN = "2h";
const PASSWORD_SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRES_IN_MS = 1000 * 60 * 15;
const COOKIE_NAME = "token";

// ✅ FIXED: Cookie-Einstellungen für Cross-Domain mit Vercel Proxy
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // ✅ Nur HTTPS in Production
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // ✅ Cross-Domain in Production
  path: "/",
  maxAge: 1000 * 60 * 60 * 24, // ✅ 24h statt 2h für bessere UX
  // ✅ WICHTIG: Domain OHNE Punkt für bessere Kompatibilität
  ...(process.env.NODE_ENV === 'production' && { domain: "contract-ai.de" })
};

// 🔗 Collections werden dynamisch übergeben
let usersCollection;
let contractsCollection;

module.exports = (db) => {
  usersCollection = db.collection("users");
  contractsCollection = db.collection("contracts");
  return router;
};

// ✅ Registrierung - ERWEITERT mit Double-Opt-In
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "❌ E-Mail und Passwort erforderlich" });

  try {
    const existing = await usersCollection.findOne({ email });
    if (existing) return res.status(409).json({ message: "❌ E-Mail bereits registriert" });

    const hashed = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
    
    // ✅ ERWEITERTE User-Erstellung mit allen notwendigen Feldern
    const newUser = {
      email,
      password: hashed,
      verified: false, // ⭐ NEU: Double-Opt-In Status
      isPremium: false,
      // ⭐ ANALYSE & OPTIMIERUNG LIMITS
      analysisCount: 0,
      optimizationCount: 0, // ⭐ NEU HINZUGEFÜGT
      // 📋 SUBSCRIPTION INFO
      subscriptionPlan: "free",
      subscriptionStatus: "inactive",
      subscriptionActive: false,
      // 📅 TIMESTAMPS
      createdAt: new Date(),
      updatedAt: new Date(),
      // 🔔 NOTIFICATION SETTINGS
      emailNotifications: true,
      contractReminders: true
    };

    await usersCollection.insertOne(newUser);
    
    console.log("✅ Neuer User registriert:", {
      email: newUser.email,
      plan: newUser.subscriptionPlan,
      verified: newUser.verified,
      analysisCount: newUser.analysisCount,
      optimizationCount: newUser.optimizationCount
    });
    
    // ⭐ NEU: Keine automatische Anmeldung - User muss E-Mail bestätigen
    res.status(201).json({ 
      message: "✅ Registrierung erfolgreich. Bitte bestätigen Sie Ihre E-Mail-Adresse.",
      email: newUser.email,
      verified: false
    });
  } catch (err) {
    console.error("❌ Registrierung fehlgeschlagen:", err);
    res.status(500).json({ message: "Serverfehler bei Registrierung" });
  }
});

// ✅ Login - ERWEITERT mit Double-Opt-In Check
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "❌ E-Mail und Passwort erforderlich" });

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(401).json({ message: "❌ Ungültige Anmeldedaten" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "❌ Ungültige Anmeldedaten" });

    // ⭐ NEU: Double-Opt-In Verification Check
    if (user.verified === false) {
      return res.status(403).json({ 
        message: "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse",
        requiresVerification: true,
        email: user.email
      });
    }

    const token = jwt.sign(
      { email: user.email, userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // ✅ COOKIE-DEBUG: Log Cookie-Einstellungen
    console.log("🍪 Setting Cookie with options:", {
      ...COOKIE_OPTIONS,
      domain: COOKIE_OPTIONS.domain || 'not set',
      env: process.env.NODE_ENV || 'development'
    });
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    
    res.json({
      message: "✅ Login erfolgreich",
      isPremium: user.isPremium || false,
      token,
    });
  } catch (err) {
    console.error("❌ Login-Fehler:", err);
    res.status(500).json({ message: "Serverfehler beim Login" });
  }
});

// ✅ KORRIGIERT: Aktuellen Nutzer abrufen - Frontend-kompatible Response-Struktur
router.get("/me", verifyToken, async (req, res) => {
  try {
    console.log("🔍 /auth/me aufgerufen für User:", req.user.userId);
    
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0, resetToken: 0, resetTokenExpires: 0 } }
    );

    if (!user) {
      console.error("❌ User nicht gefunden:", req.user.userId);
      return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
    }

    const plan = user.subscriptionPlan || "free";
    const status = user.subscriptionStatus || "inactive";
    const analysisCount = user.analysisCount ?? 0;
    const optimizationCount = user.optimizationCount ?? 0;
    const subscriptionActive = user.subscriptionActive ?? false;

    // 📊 ANALYSE LIMITS - KORRIGIERT für 3-Stufen-Modell
    let analysisLimit = 0;  // ✅ Free: 0 Analysen (statt 10!)
    if (plan === "business") analysisLimit = 50;  // 📊 Business: 50 pro Monat
    if (plan === "premium") analysisLimit = Infinity; // ♾️ Premium: Unbegrenzt

    // 🔧 OPTIMIERUNG LIMITS (NEU)
    let optimizationLimit = 0; // ✅ Free: 0 Optimierungen (statt 5!)
    if (plan === "business") optimizationLimit = 25;
    if (plan === "premium") optimizationLimit = Infinity;

    const userData = {
      email: user.email,
      verified: user.verified ?? true, // ⭐ NEU: Verification Status
      subscriptionPlan: plan,
      subscriptionStatus: status,
      subscriptionActive,
      isPremium: plan === "premium",
      isBusiness: plan === "business", 
      isFree: plan === "free",
      // ⭐ ANALYSE INFO
      analysisCount,
      analysisLimit,
      // ⭐ OPTIMIERUNG INFO (NEU)
      optimizationCount,
      optimizationLimit,
      // 📅 ACCOUNT INFO
      createdAt: user.createdAt,
      emailNotifications: user.emailNotifications ?? true,
      contractReminders: user.contractReminders ?? true
    };

    console.log("✅ User-Info erfolgreich geladen:", {
      email: userData.email,
      verified: userData.verified,
      plan: userData.subscriptionPlan,
      isPremium: userData.isPremium,
      analysisCount: userData.analysisCount,
      analysisLimit: userData.analysisLimit
    });

    // ✅ KRITISCH: Frontend erwartet "user" Wrapper!
    res.json({
      user: userData  // ← Das war das Problem! Frontend erwartet { user: {...} }
    });

  } catch (err) {
    console.error("❌ Fehler bei /me:", err);
    
    // ✅ VERBESSERTE Fehlerbehandlung - könnte MongoDB-Ausfall sein
    if (err.message?.includes('connection') || err.message?.includes('timeout')) {
      console.error("🔥 MongoDB-Verbindungsfehler erkannt!");
      return res.status(503).json({ 
        message: "❌ Datenbankverbindung fehlgeschlagen. Bitte versuche es später erneut.",
        error: "DATABASE_CONNECTION_ERROR"
      });
    }
    
    res.status(500).json({ message: "Serverfehler bei /me" });
  }
});

// 🔄 Passwort ändern
router.put("/change-password", verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    return res.status(400).json({ message: "❌ Beide Passwörter erforderlich" });

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });

    const match = await bcrypt.compare(oldPassword, user.password);
    if (!match) return res.status(401).json({ message: "❌ Altes Passwort ist falsch" });

    const hashed = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { 
          password: hashed,
          updatedAt: new Date() // ⭐ Timestamp aktualisieren
        } 
      }
    );
    res.json({ message: "✅ Passwort geändert" });
  } catch (err) {
    console.error("❌ Fehler beim Passwortwechsel:", err);
    res.status(500).json({ message: "Serverfehler bei Passwortwechsel" });
  }
});

// 🗑️ Account löschen
router.delete("/delete", verifyToken, async (req, res) => {
  try {
    await contractsCollection.deleteMany({ userId: req.user.userId });
    await usersCollection.deleteOne({ _id: new ObjectId(req.user.userId) });
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
  if (!email)
    return res.status(400).json({ message: "❌ E-Mail ist erforderlich" });

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ message: "❌ E-Mail nicht gefunden" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = Date.now() + RESET_TOKEN_EXPIRES_IN_MS;

    await usersCollection.updateOne({ email }, { $set: { resetToken, resetTokenExpires } });

    const resetLink = `https://contract-ai.de/reset-password?token=${resetToken}`;
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2>🔐 Passwort zurücksetzen</h2>
        <p>Klicke auf den Button, um dein Passwort zurückzusetzen:</p>
        <a href="${resetLink}" style="background: #36a3f5; padding: 10px 18px; text-decoration: none; color: black; border-radius: 6px;">🔁 Neues Passwort festlegen</a>
        <p style="margin-top: 30px;">Wenn du das nicht warst, ignoriere diese E-Mail.</p>
        <hr />
        <p style="font-size: 0.8rem; color: #aaa;">Contract AI • Automatisierte Vertragsanalyse</p>
      </div>
    `;
    await sendEmail(email, "🔐 Passwort zurücksetzen", html);
    res.json({ message: "✅ Reset-Link gesendet" });
  } catch (err) {
    console.error("❌ Fehler bei forgot-password:", err);
    res.status(500).json({ message: "Serverfehler beim Passwort-Reset" });
  }
});

// 🔁 Passwort zurücksetzen
router.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: "❌ Token und neues Passwort erforderlich" });

  try {
    const user = await usersCollection.findOne({ resetToken: token });
    if (!user || user.resetTokenExpires < Date.now())
      return res.status(400).json({ message: "❌ Token ungültig oder abgelaufen" });

    const hashed = await bcrypt.hash(newPassword, PASSWORD_SALT_ROUNDS);
    await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { 
          password: hashed,
          updatedAt: new Date() // ⭐ Timestamp aktualisieren
        }, 
        $unset: { resetToken: "", resetTokenExpires: "" } 
      }
    );
    res.json({ message: "✅ Passwort zurückgesetzt" });
  } catch (err) {
    console.error("❌ Fehler bei reset-password:", err);
    res.status(500).json({ message: "Fehler beim Zurücksetzen" });
  }
});

// 🚪 Logout
router.post("/logout", (req, res) => {
  // ✅ CRITICAL FIX: Cookie mit gleichen Optionen löschen wie beim Setzen
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax',
    path: "/",
    ...(process.env.NODE_ENV === 'production' && { domain: "contract-ai.de" })
  };
  
  res.clearCookie(COOKIE_NAME, clearOptions);
  console.log("🍪 Logout erfolgreich – Cookie gelöscht mit Options:", clearOptions);
  res.json({ message: "✅ Erfolgreich ausgeloggt" });
});

// ✅ NEUE ROUTE: Bestehende User upgraden (UPDATED für verified field)
router.post("/migrate-users", async (req, res) => {
  try {
    // Diese Route kann einmalig aufgerufen werden, um bestehende User zu updaten
    const result = await usersCollection.updateMany(
      { verified: { $exists: false } }, // User ohne verified field
      { 
        $set: { 
          verified: true, // ⭐ Bestehende User als verifiziert markieren
          optimizationCount: 0,
          analysisCount: { $ifNull: ["$analysisCount", 0] },
          subscriptionPlan: { $ifNull: ["$subscriptionPlan", "free"] },
          subscriptionStatus: { $ifNull: ["$subscriptionStatus", "inactive"] },
          subscriptionActive: { $ifNull: ["$subscriptionActive", false] },
          emailNotifications: { $ifNull: ["$emailNotifications", true] },
          contractReminders: { $ifNull: ["$contractReminders", true] },
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ ${result.modifiedCount} User erfolgreich migriert (als verifiziert markiert)`);
    res.json({ 
      message: `✅ ${result.modifiedCount} User erfolgreich migriert`,
      modifiedCount: result.modifiedCount
    });
  } catch (err) {
    console.error("❌ Fehler bei User-Migration:", err);
    res.status(500).json({ message: "Fehler bei User-Migration" });
  }
});

// ✅ TEMPORÄRE GET-Route für Browser-Migration
router.get("/migrate-users", async (req, res) => {
  try {
    const result = await usersCollection.updateMany(
      { verified: { $exists: false } },
      { 
        $set: { 
          verified: true,
          optimizationCount: 0,
          analysisCount: { $ifNull: ["$analysisCount", 0] },
          subscriptionPlan: { $ifNull: ["$subscriptionPlan", "free"] },
          subscriptionStatus: { $ifNull: ["$subscriptionStatus", "inactive"] },
          subscriptionActive: { $ifNull: ["$subscriptionActive", false] },
          emailNotifications: { $ifNull: ["$emailNotifications", true] },
          contractReminders: { $ifNull: ["$contractReminders", true] },
          updatedAt: new Date()
        }
      }
    );
    
    console.log(`✅ ${result.modifiedCount} User erfolgreich migriert (via GET)`);
    res.json({ 
      message: `✅ ${result.modifiedCount} User erfolgreich migriert`,
      modifiedCount: result.modifiedCount,
      success: true
    });
  } catch (err) {
    console.error("❌ Fehler bei User-Migration:", err);
    res.status(500).json({ message: "Fehler bei User-Migration" });
  }
});