// 📁 backend/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin"); // 🔐 Admin-only access
const sendEmail = require("../utils/sendEmail");
const generateEmailTemplate = require("../utils/emailTemplate"); // 📧 V4 Email Template
const { normalizeEmail } = require("../utils/normalizeEmail");
require("dotenv").config();

// 🔐 Konfiguration
const JWT_EXPIRES_IN = "2h";
const PASSWORD_SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRES_IN_MS = 1000 * 60 * 15;
const COOKIE_NAME = "token";

// ✅ FIXED: Cookie-Einstellungen gelockert für bessere Kompatibilität
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // ✅ Nur HTTPS in Production
  sameSite: process.env.NODE_ENV === 'production' ? 'None' : 'Lax', // ✅ Weniger strikt in Development
  path: "/",
  maxAge: 1000 * 60 * 60 * 2,
  // ✅ Domain nur in Production setzen
  ...(process.env.NODE_ENV === 'production' && { domain: ".contract-ai.de" })
};

// 🔗 Collections werden dynamisch übergeben
let usersCollection;
let contractsCollection;

module.exports = (db) => {
  usersCollection = db.collection("users");
  contractsCollection = db.collection("contracts");
  return router;
};

// ✅ Registrierung - ERWEITERT mit Double-Opt-In + Beta-Tester Support
router.post("/register", async (req, res) => {
  const { email: rawEmail, password, isBetaTester } = req.body;
  if (!rawEmail || !password)
    return res.status(400).json({ message: "❌ E-Mail und Passwort erforderlich" });

  const email = normalizeEmail(rawEmail);

  try {
    const existing = await usersCollection.findOne({ email });
    if (existing) return res.status(409).json({ message: "❌ E-Mail bereits registriert" });

    const hashed = await bcrypt.hash(password, PASSWORD_SALT_ROUNDS);

    // ✅ ERWEITERTE User-Erstellung mit allen notwendigen Feldern
    // 🔒 E-MAIL INBOX: Sichere Upload-Adresse generieren
    const userId = new ObjectId();
    const randomSuffix = crypto.randomBytes(8).toString('hex'); // 16 chars, nicht erratbar
    const emailInboxAddress = `u_${userId.toString()}.${randomSuffix}@upload.contract-ai.de`;

    // 🎁 BETA-TESTER: 3 Monate Premium/Legendary Status
    const betaExpiresAt = isBetaTester ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : null; // +90 Tage

    const newUser = {
      _id: userId, // ✅ Explizit setzen, damit wir es für E-Mail-Adresse nutzen können
      email,
      password: hashed,
      verified: false, // ⭐ NEU: Double-Opt-In Status
      isPremium: isBetaTester ? true : false, // 🎁 Beta-Tester = Premium
      role: 'user', // 🔐 NEW: User role (user|admin) - default: user
      // ⭐ ANALYSE & OPTIMIERUNG LIMITS
      analysisCount: 0,
      optimizationCount: 0, // ⭐ NEU HINZUGEFÜGT
      // 📋 SUBSCRIPTION INFO - 🎁 Beta-Tester bekommen Legendary!
      subscriptionPlan: isBetaTester ? "legendary" : "free",
      subscriptionStatus: isBetaTester ? "active" : "inactive",
      subscriptionActive: isBetaTester ? true : false,
      // 🎁 BETA-TESTER FELDER
      betaTester: isBetaTester ? true : false,
      betaExpiresAt: betaExpiresAt,
      betaRegisteredAt: isBetaTester ? new Date() : null,
      // 📅 TIMESTAMPS
      createdAt: new Date(),
      updatedAt: new Date(),
      // 🔔 NOTIFICATION SETTINGS
      emailNotifications: true,
      contractReminders: true,
      // 📧 E-MAIL INBOX für Contract-Import
      emailInboxAddress: emailInboxAddress,
      emailInboxEnabled: true, // User kann Feature aktivieren/deaktivieren
      emailInboxAddressCreatedAt: new Date()
    };

    await usersCollection.insertOne(newUser);

    // 🎁 Beta-Tester Logging
    if (isBetaTester) {
      console.log("🎁 BETA-TESTER registriert:", {
        email: newUser.email,
        plan: newUser.subscriptionPlan,
        betaExpiresAt: betaExpiresAt,
        verified: newUser.verified
      });
    } else {
      console.log("✅ Neuer User registriert:", {
        email: newUser.email,
        plan: newUser.subscriptionPlan,
        verified: newUser.verified,
        analysisCount: newUser.analysisCount,
        optimizationCount: newUser.optimizationCount
      });
    }

    // ⭐ NEU: Keine automatische Anmeldung - User muss E-Mail bestätigen
    res.status(201).json({
      message: isBetaTester
        ? "✅ Beta-Registrierung erfolgreich! Bitte bestätigen Sie Ihre E-Mail-Adresse."
        : "✅ Registrierung erfolgreich. Bitte bestätigen Sie Ihre E-Mail-Adresse.",
      email: newUser.email,
      verified: false,
      isBetaTester: isBetaTester || false
    });
  } catch (err) {
    console.error("❌ Registrierung fehlgeschlagen:", err);
    res.status(500).json({ message: "Serverfehler bei Registrierung" });
  }
});

// ✅ Login - ERWEITERT mit Double-Opt-In Check
router.post("/login", async (req, res) => {
  const { email: rawEmail, password } = req.body;
  if (!rawEmail || !password)
    return res.status(400).json({ message: "❌ E-Mail und Passwort erforderlich" });

  const email = normalizeEmail(rawEmail);

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
    console.log("🍪 Setting Cookie with options:", COOKIE_OPTIONS);
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

    let plan = user.subscriptionPlan || "free";
    const status = user.subscriptionStatus || "inactive";
    const analysisCount = user.analysisCount ?? 0;
    const optimizationCount = user.optimizationCount ?? 0;
    let subscriptionActive = user.subscriptionActive ?? false;

    // 🎁 BETA-TESTER: Prüfen ob Beta noch gültig ist
    if (user.betaTester && user.betaExpiresAt) {
      const betaExpired = new Date(user.betaExpiresAt) < new Date();
      if (betaExpired) {
        // Beta abgelaufen → zurück auf Free setzen
        console.log("⏰ Beta-Zugang abgelaufen für:", user.email);
        plan = "free";
        subscriptionActive = false;
        // Optional: User in DB aktualisieren (async, non-blocking)
        usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              subscriptionPlan: "free",
              subscriptionActive: false,
              subscriptionStatus: "expired",
              isPremium: false,
              betaExpired: true,
              updatedAt: new Date()
            }
          }
        ).catch(err => console.error("❌ Fehler beim Beta-Expiry-Update:", err));
      }
    }

    // 📊 ANALYSE LIMITS - KORRIGIERT für alle Pläne inkl. legendary
    let analysisLimit = 0;  // ✅ Free: 0 Analysen
    if (plan === "business") analysisLimit = 50;  // 📊 Business: 50 pro Monat
    if (plan === "premium" || plan === "legendary") analysisLimit = Infinity; // ♾️ Premium/Legendary: Unbegrenzt

    // 🔧 OPTIMIERUNG LIMITS - inkl. legendary
    let optimizationLimit = 0; // ✅ Free: 0 Optimierungen
    if (plan === "business") optimizationLimit = 25;
    if (plan === "premium" || plan === "legendary") optimizationLimit = Infinity; // ♾️ Premium/Legendary: Unbegrenzt

    const userData = {
      email: user.email,
      verified: user.verified ?? true, // ⭐ NEU: Verification Status
      role: user.role || 'user', // 🔐 Admin-Role Support
      subscriptionPlan: plan,
      subscriptionStatus: status,
      subscriptionActive,
      isPremium: plan === "premium" || plan === "legendary", // 🎁 Legendary = auch Premium-Features
      isBusiness: plan === "business",
      isFree: plan === "free",
      isLegendary: plan === "legendary", // 🎁 NEU: Legendary Flag
      // 🎁 Beta-Tester Info
      betaTester: user.betaTester || false,
      betaExpiresAt: user.betaExpiresAt || null,
      // ⭐ ANALYSE INFO
      analysisCount,
      analysisLimit,
      // ⭐ OPTIMIERUNG INFO (NEU)
      optimizationCount,
      optimizationLimit,
      // 📅 ACCOUNT INFO
      createdAt: user.createdAt,
      emailNotifications: user.emailNotifications ?? true,
      contractReminders: user.contractReminders ?? true,
      // 📧 E-MAIL INBOX INFO (NEU)
      emailInboxAddress: user.emailInboxAddress || null,
      emailInboxEnabled: user.emailInboxEnabled ?? true,
      emailInboxAddressCreatedAt: user.emailInboxAddressCreatedAt || null
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
  const { email: rawEmail } = req.body;
  if (!rawEmail)
    return res.status(400).json({ message: "❌ E-Mail ist erforderlich" });

  const email = normalizeEmail(rawEmail);

  try {
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).json({ message: "❌ E-Mail nicht gefunden" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenExpires = Date.now() + RESET_TOKEN_EXPIRES_IN_MS;

    await usersCollection.updateOne({ email }, { $set: { resetToken, resetTokenExpires } });

    const resetLink = `https://contract-ai.de/reset-password?token=${resetToken}`;

    // ✅ V4 CLEAN E-MAIL-TEMPLATE
    const html = generateEmailTemplate({
      title: "Passwort zurücksetzen",
      preheader: "Setzen Sie Ihr Passwort zurück",
      body: `
        <p style="text-align: center; margin-bottom: 25px;">
          Sie haben angefordert, Ihr Passwort zurückzusetzen.<br>
          Klicken Sie auf den Button, um ein neues Passwort festzulegen.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
          <tr><td style="padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #555;">
              <strong>Gültig für:</strong> 15 Minuten
            </p>
          </td></tr>
        </table>

        <p style="font-size: 13px; color: #888; text-align: center;">
          Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.<br>
          Ihr Passwort bleibt unverändert.
        </p>
      `,
      cta: {
        text: "Neues Passwort festlegen",
        url: resetLink
      }
    });

    await sendEmail({ to: email, subject: "Passwort zurücksetzen", html });
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
  res.clearCookie(COOKIE_NAME, COOKIE_OPTIONS);
  console.log("🍪 Logout erfolgreich – Cookie gelöscht");
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

// ===== 📧 E-MAIL INBOX MANAGEMENT =====

// 🔄 E-Mail Inbox aktivieren/deaktivieren
router.put("/email-inbox/toggle", verifyToken, async (req, res) => {
  try {
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ message: "❌ 'enabled' muss ein Boolean sein" });
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      {
        $set: {
          emailInboxEnabled: enabled,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
    }

    console.log(`✅ E-Mail Inbox ${enabled ? 'aktiviert' : 'deaktiviert'} für User:`, req.user.userId);

    res.json({
      message: `✅ E-Mail Inbox ${enabled ? 'aktiviert' : 'deaktiviert'}`,
      emailInboxEnabled: enabled
    });
  } catch (err) {
    console.error("❌ Fehler beim Toggle der E-Mail Inbox:", err);
    res.status(500).json({ message: "Serverfehler beim Toggle" });
  }
});

// 🔁 E-Mail Inbox Adresse regenerieren
router.post("/email-inbox/regenerate", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
    }

    // Neue sichere Adresse generieren
    const randomSuffix = crypto.randomBytes(8).toString('hex');
    const newEmailInboxAddress = `u_${user._id.toString()}.${randomSuffix}@upload.contract-ai.de`;

    // ✅ Alte Adresse archivieren (für Audit-Log)
    const oldAddress = user.emailInboxAddress;

    const result = await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          emailInboxAddress: newEmailInboxAddress,
          emailInboxAddressCreatedAt: new Date(),
          updatedAt: new Date()
        },
        // Optional: Alte Adressen in Array speichern für Audit
        $push: {
          emailInboxAddressHistory: {
            address: oldAddress,
            disabledAt: new Date()
          }
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
    }

    console.log(`✅ E-Mail Inbox Adresse regeneriert für User:`, req.user.userId);
    console.log(`   Alt: ${oldAddress}`);
    console.log(`   Neu: ${newEmailInboxAddress}`);

    res.json({
      message: "✅ Neue E-Mail-Adresse generiert",
      emailInboxAddress: newEmailInboxAddress,
      oldAddress: oldAddress
    });
  } catch (err) {
    console.error("❌ Fehler beim Regenerieren der E-Mail Inbox Adresse:", err);
    res.status(500).json({ message: "Serverfehler beim Regenerieren" });
  }
});

// ✅ DEBUG: Check user's emailInboxAddress in DB
router.get("/debug-email-inbox/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      userId: user._id,
      email: user.email,
      emailInboxAddress: user.emailInboxAddress,
      emailInboxEnabled: user.emailInboxEnabled,
      emailInboxAddressCreatedAt: user.emailInboxAddressCreatedAt
    });
  } catch (err) {
    console.error("❌ Debug error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ ADMIN: Migrate all users without emailInboxAddress (NO AUTH REQUIRED for first-time setup)
router.post("/migrate-all-email-inboxes", async (req, res) => {
  try {
    console.log("🔄 Migration gestartet: E-Mail-Inbox für alle User...");

    const usersWithoutInbox = await usersCollection.find({
      $or: [
        { emailInboxAddress: { $exists: false } },
        { emailInboxAddress: null },
        { emailInboxAddress: '' }
      ]
    }).toArray();

    console.log(`📊 Gefundene User ohne Email-Inbox: ${usersWithoutInbox.length}`);

    if (usersWithoutInbox.length === 0) {
      return res.json({
        success: true,
        message: "✅ Alle User haben bereits eine Email-Inbox-Adresse",
        migrated: 0
      });
    }

    let successCount = 0;
    let errorCount = 0;

    for (const user of usersWithoutInbox) {
      try {
        const randomSuffix = crypto.randomBytes(8).toString('hex');
        const emailInboxAddress = `u_${user._id.toString()}.${randomSuffix}@upload.contract-ai.de`;

        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              emailInboxAddress: emailInboxAddress,
              emailInboxEnabled: true,
              emailInboxAddressCreatedAt: new Date(),
              updatedAt: new Date()
            }
          }
        );

        console.log(`✅ ${user.email} → ${emailInboxAddress}`);
        successCount++;

      } catch (error) {
        console.error(`❌ Fehler bei ${user.email}:`, error.message);
        errorCount++;
      }
    }

    res.json({
      success: true,
      message: `✅ Migration abgeschlossen: ${successCount} erfolgreich, ${errorCount} Fehler`,
      migrated: successCount,
      errors: errorCount
    });

  } catch (err) {
    console.error("❌ Fehler bei Migration:", err);
    res.status(500).json({
      success: false,
      message: "Serverfehler bei Migration"
    });
  }
});

// ===== 👥 ADMIN: GET ALL USERS =====
// GET /api/auth/users
// 🔐 Admin-only: Only admins can view all users
router.get("/users", verifyToken, verifyAdmin, async (req, res) => {
  try {
    console.log('👥 [ADMIN] Fetching all users...');

    // Get all users excluding passwords
    const users = await usersCollection.find(
      {},
      {
        projection: {
          password: 0,
          resetToken: 0,
          resetTokenExpires: 0
        }
      }
    ).toArray();

    console.log(`✅ [ADMIN] Retrieved ${users.length} users`);

    res.json({
      success: true,
      users: users,
      total: users.length
    });

  } catch (error) {
    console.error('❌ [ADMIN] Error fetching users:', error);
    res.status(500).json({
      success: false,
      message: 'Fehler beim Abrufen der Benutzerliste',
      error: error.message
    });
  }
});