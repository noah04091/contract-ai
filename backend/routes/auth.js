// 📁 backend/routes/auth.js
const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { ObjectId } = require("mongodb");
const verifyToken = require("../middleware/verifyToken");
const verifyAdmin = require("../middleware/verifyAdmin"); // 🔐 Admin-only access
const { authLimiter } = require("../middleware/rateLimiter"); // 🛡️ Brute-Force-Schutz
const sendEmail = require("../utils/sendEmail");
const { generateEmailTemplate } = require("../utils/emailTemplate");
const { normalizeEmail } = require("../utils/normalizeEmail");
const { validatePassword } = require("../utils/passwordValidator");
const { getFeatureLimit, isBusinessOrHigher, isEnterpriseOrHigher, hasFeatureAccess } = require("../constants/subscriptionPlans"); // 📊 Zentrale Plan-Definitionen
const OrganizationMember = require("../models/OrganizationMember");
const Organization = require("../models/Organization");
require("dotenv").config();

// 🔐 Konfiguration
const JWT_EXPIRES_IN = "2h";
const PASSWORD_SALT_ROUNDS = 10;
const RESET_TOKEN_EXPIRES_IN_MS = 1000 * 60 * 15;
const COOKIE_NAME = "token";

// 📱 Geräteerkennung aus User-Agent
function parseDeviceInfo(userAgent) {
  if (!userAgent) return { device: 'Unbekannt', browser: 'Unbekannt', os: 'Unbekannt' };

  const ua = userAgent.toLowerCase();

  // Gerät erkennen
  let device = 'Desktop';
  if (ua.includes('iphone')) device = 'iPhone';
  else if (ua.includes('ipad')) device = 'iPad';
  else if (ua.includes('android') && ua.includes('mobile')) device = 'Android Handy';
  else if (ua.includes('android')) device = 'Android Tablet';
  else if (ua.includes('mobile')) device = 'Handy';
  else if (ua.includes('tablet')) device = 'Tablet';
  else if (ua.includes('macintosh') || ua.includes('mac os')) device = 'Mac';
  else if (ua.includes('windows')) device = 'Windows PC';
  else if (ua.includes('linux')) device = 'Linux PC';

  // Browser erkennen
  let browser = 'Unbekannt';
  if (ua.includes('edg/')) browser = 'Edge';
  else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

  // OS erkennen
  let os = 'Unbekannt';
  if (ua.includes('windows nt 10')) os = 'Windows 10/11';
  else if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os x')) os = 'macOS';
  else if (ua.includes('iphone os') || ua.includes('ios')) os = 'iOS';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('linux')) os = 'Linux';

  return { device, browser, os };
}

// ✅ SECURE: Cookie-Einstellungen mit CSRF-Schutz
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production', // ✅ Nur HTTPS in Production
  sameSite: 'Lax', // ✅ CSRF-Schutz: Lax funktioniert für same-site (contract-ai.de + api.contract-ai.de)
  path: "/",
  maxAge: 1000 * 60 * 60 * 2, // 2 Stunden
  // ✅ Domain nur in Production setzen (Cookie wird auf allen Subdomains geteilt)
  ...(process.env.NODE_ENV === 'production' && { domain: ".contract-ai.de" })
};

// 🔗 Collections werden dynamisch übergeben
let usersCollection;
let contractsCollection;
let dbInstance; // 💾 Speichere db-Referenz für Activity Logging

module.exports = (db) => {
  dbInstance = db; // 💾 Speichere für spätere Verwendung
  usersCollection = db.collection("users");
  contractsCollection = db.collection("contracts");
  return router;
};

// ✅ Registrierung - ERWEITERT mit Double-Opt-In + Beta-Tester Support + Geräteerkennung
// 🛡️ Rate Limited: Max 5 Versuche pro 15 Minuten (Brute-Force-Schutz)
router.post("/register", authLimiter, async (req, res) => {
  const { email: rawEmail, password, isBetaTester, firstName, lastName, companyName } = req.body;

  // 🆕 Validierung der Pflichtfelder
  if (!rawEmail || !password)
    return res.status(400).json({ message: "❌ E-Mail und Passwort erforderlich" });

  if (!firstName || !lastName)
    return res.status(400).json({ message: "❌ Vorname und Nachname erforderlich" });

  // 🔐 Password-Policy Validierung
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      message: "❌ Passwort erfüllt nicht die Sicherheitsanforderungen",
      errors: passwordValidation.errors
    });
  }

  const email = normalizeEmail(rawEmail);

  // 📱 Geräteinformationen erfassen
  const userAgent = req.headers['user-agent'] || '';
  const deviceInfo = parseDeviceInfo(userAgent);
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'Unbekannt';

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
      // 🆕 Name-Felder
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`, // Vollständiger Name für einfachen Zugriff
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
      emailInboxAddressCreatedAt: new Date(),
      // 📱 GERÄTE-TRACKING
      registrationDevice: {
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        userAgent: userAgent.substring(0, 500), // Begrenzen
        ip: ipAddress,
        timestamp: new Date()
      },
      lastLoginDevice: null, // Wird beim ersten Login gesetzt
      // 🎓 ONBOARDING v3.0 - Server-seitige Persistierung
      onboarding: {
        status: 'not_started', // not_started | in_progress | completed | skipped
        startedAt: null,
        completedAt: null,
        skippedAt: null,
        completedSteps: [], // Array von { stepId, completedAt, data }
        profile: {}, // Personalisierungsdaten aus Onboarding
        seenFeatures: [], // Welche Feature-Tooltips gesehen wurden
        showTooltips: true, // User kann Tooltips deaktivieren
        checklist: {
          accountCreated: true,
          emailVerified: false, // Wird nach Verification true
          firstContractUploaded: false,
          companyProfileComplete: companyName ? true : false, // 🆕 Automatisch true wenn Firmenname bei Registrierung
          firstAnalysisComplete: false
        }
      }
    };

    await usersCollection.insertOne(newUser);

    // 🆕 FIRMENPROFIL: Automatisch anlegen wenn Firmenname bei Registrierung angegeben
    if (companyName && companyName.trim()) {
      try {
        const companyProfilesCollection = dbInstance.collection("company_profiles");
        await companyProfilesCollection.insertOne({
          userId: userId,
          companyName: companyName.trim(),
          // Weitere Felder leer - können später im Profil ergänzt werden
          legalForm: '',
          street: '',
          postalCode: '',
          city: '',
          country: 'Deutschland',
          vatId: '',
          tradeRegister: '',
          contactEmail: '',
          contactPhone: '',
          bankName: '',
          iban: '',
          bic: '',
          createdAt: new Date(),
          updatedAt: new Date(),
          createdFrom: 'registration' // Kennzeichnung dass es bei Registrierung erstellt wurde
        });
        console.log(`🏢 Firmenprofil automatisch erstellt für: ${newUser.email} (${companyName.trim()})`);
      } catch (companyErr) {
        // Nicht kritisch - Registrierung war erfolgreich
        console.warn("⚠️ Firmenprofil konnte nicht erstellt werden:", companyErr.message);
      }
    }

    // 🎁 Beta-Tester Logging
    if (isBetaTester) {
      console.log("🎁 BETA-TESTER registriert:", {
        name: newUser.name,
        email: newUser.email,
        plan: newUser.subscriptionPlan,
        betaExpiresAt: betaExpiresAt,
        verified: newUser.verified,
        companyName: companyName || null
      });
    } else {
      console.log("✅ Neuer User registriert:", {
        name: newUser.name,
        email: newUser.email,
        plan: newUser.subscriptionPlan,
        verified: newUser.verified,
        companyName: companyName || null
      });
    }

    // 📧 ADMIN-BENACHRICHTIGUNG: Bei neuer Registrierung
    const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'info@contract-ai.de';
    try {
      const adminNotificationHtml = generateEmailTemplate({
        title: "Neue Registrierung",
        preheader: `Neuer User: ${newUser.name} (${newUser.email})`,
        body: `
          <p style="text-align: center; margin-bottom: 25px;">
            <strong>Ein neuer Benutzer hat sich registriert!</strong>
          </p>

          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
            <tr><td style="padding: 20px;">
              <p style="margin: 0 0 10px 0;"><strong>Name:</strong> ${newUser.name}</p>
              <p style="margin: 0 0 10px 0;"><strong>E-Mail:</strong> ${newUser.email}</p>
              ${companyName ? `<p style="margin: 0 0 10px 0;"><strong>Firma:</strong> ${companyName.trim()}</p>` : ''}
              <p style="margin: 0 0 10px 0;"><strong>Plan:</strong> ${newUser.subscriptionPlan}</p>
              <p style="margin: 0 0 10px 0;"><strong>Beta-Tester:</strong> ${isBetaTester ? 'Ja ✅' : 'Nein'}</p>
              <p style="margin: 0;"><strong>Registriert am:</strong> ${new Date().toLocaleString('de-DE', { timeZone: 'Europe/Berlin' })}</p>
            </td></tr>
          </table>
        `
      });

      await sendEmail({
        to: ADMIN_EMAIL,
        subject: `🆕 Neue Registrierung: ${newUser.email}`,
        html: adminNotificationHtml
      });
      console.log(`📧 Admin-Benachrichtigung gesendet an: ${ADMIN_EMAIL}`);
    } catch (emailErr) {
      // Fehler beim E-Mail-Versand nicht blocken - nur loggen
      console.error("⚠️ Admin-Benachrichtigung konnte nicht gesendet werden:", emailErr.message);
    }

    // ⭐ NEU: Keine automatische Anmeldung - User muss E-Mail bestätigen

    // 📋 Activity Log: Neue Registrierung
    try {
      const { logActivity, ActivityTypes } = require('../services/activityLogger');
      await logActivity(dbInstance, {
        type: ActivityTypes.USER_REGISTERED,
        userId: newUser._id.toString(),
        userEmail: newUser.email,
        description: `Neuer User registriert: ${newUser.email}`,
        details: {
          plan: newUser.subscriptionPlan,
          isBetaTester: isBetaTester || false,
          device: deviceInfo?.device || 'Unbekannt'
        },
        ip: ipAddress,
        userAgent: userAgent,
        severity: 'info',
        source: 'registration'
      });
    } catch (logError) {
      console.error("Activity Log Error:", logError);
    }

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

// ✅ Login - ERWEITERT mit Double-Opt-In Check + Geräte-Tracking
// 🛡️ Rate Limited: Max 5 Versuche pro 15 Minuten (Brute-Force-Schutz)
router.post("/login", authLimiter, async (req, res) => {
  const { email: rawEmail, password } = req.body;
  if (!rawEmail || !password)
    return res.status(400).json({ message: "❌ E-Mail und Passwort erforderlich" });

  const email = normalizeEmail(rawEmail);

  // 📱 Geräteinformationen erfassen
  const userAgent = req.headers['user-agent'] || '';
  const deviceInfo = parseDeviceInfo(userAgent);
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'Unbekannt';

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

    // 🔒 Gesperrte User blockieren
    if (user.suspended === true) {
      console.log(`🔒 Gesperrter User versuchte Login: ${user.email}`);
      return res.status(403).json({
        message: "Ihr Konto wurde gesperrt. Bitte kontaktieren Sie den Support.",
        suspended: true,
        reason: user.suspendReason || null
      });
    }

    // 📱 Last Login Device aktualisieren
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLoginDevice: {
            device: deviceInfo.device,
            browser: deviceInfo.browser,
            os: deviceInfo.os,
            userAgent: userAgent.substring(0, 500),
            ip: ipAddress,
            timestamp: new Date()
          },
          lastLoginAt: new Date()
        }
      }
    );

    // 📋 Activity Log: Login
    try {
      const { logActivity, ActivityTypes } = require('../services/activityLogger');
      await logActivity(dbInstance, {
        type: ActivityTypes.USER_LOGIN,
        userId: user._id.toString(),
        userEmail: user.email,
        description: `User eingeloggt: ${user.email}`,
        details: {
          plan: user.subscriptionPlan || 'free',
          device: deviceInfo?.device || 'Unbekannt',
          browser: deviceInfo?.browser || 'Unbekannt',
          os: deviceInfo?.os || 'Unbekannt'
        },
        ip: ipAddress,
        userAgent: userAgent,
        severity: 'info',
        source: 'auth'
      });
    } catch (logErr) {
      console.error("Activity Log Error:", logErr);
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

    // 🏢 Organization Info + Effektiver Plan
    let orgInfo = null;
    try {
      const membership = await OrganizationMember.findOne({
        userId: new ObjectId(req.user.userId),
        isActive: true
      });
      if (membership) {
        const org = await Organization.findById(membership.organizationId);
        if (org) {
          orgInfo = {
            organizationId: membership.organizationId.toString(),
            orgName: org.name || null,
            orgRole: membership.role,
            orgPermissions: membership.permissions || [],
            isOrgOwner: org.ownerId?.toString() === req.user.userId
          };
          // Effektiver Plan: Org-Plan erben wenn höher als eigener
          if (plan === "free" && org.subscriptionPlan && org.subscriptionPlan !== "free") {
            plan = org.subscriptionPlan.toLowerCase();
          }
        }
      }
    } catch (orgErr) {
      console.warn("⚠️ Org lookup in /me failed (non-critical):", orgErr.message);
    }

    // 📊 ANALYSE LIMITS - aus zentraler Konfiguration (subscriptionPlans.js)
    // ✅ KORRIGIERT: Zentrale Funktion statt hardcoded Limits
    const analysisLimit = getFeatureLimit(plan, 'analyze');

    // 🔧 OPTIMIERUNG LIMITS - aus zentraler Konfiguration (subscriptionPlans.js)
    // ✅ KORRIGIERT: Zentrale Funktion statt hardcoded Limits
    const optimizationLimit = getFeatureLimit(plan, 'optimize');

    const userData = {
      email: user.email,
      // 🆕 Name-Felder
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      name: user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email.split('@')[0], // Fallback auf Email-Prefix
      verified: user.verified ?? false, // ⭐ Default false für alte User ohne Feld
      role: user.role || 'user', // 🔐 Admin-Role Support
      subscriptionPlan: plan,
      subscriptionStatus: status,
      subscriptionActive,
      // isPremium = hat bezahltes Abo (Business, Enterprise oder Legendary)
      isPremium: plan === "business" || plan === "enterprise" || plan === "legendary",
      isBusiness: plan === "business",
      isEnterprise: plan === "enterprise",
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
      emailInboxAddressCreatedAt: user.emailInboxAddressCreatedAt || null,
      customEmailAlias: user.customEmailAlias || null,
      // 🎓 ONBOARDING TOURS (serverseitig gespeichert) - LEGACY
      completedTours: user.completedTours || [],
      // 📷 PROFILBILD
      profilePicture: user.profilePicture || null,
      // 🏢 Organisation (für Team-Mitglieder)
      organization: orgInfo,
      // 🎓 ONBOARDING v3.0 - Enterprise Onboarding System
      onboarding: user.onboarding || {
        status: 'not_started',
        completedSteps: [],
        profile: {},
        seenFeatures: [],
        showTooltips: true,
        checklist: {
          accountCreated: true,
          emailVerified: user.verified || false,
          firstContractUploaded: false,
          companyProfileComplete: false,
          firstAnalysisComplete: false
        }
      },
      // 🎨 UI-Preferences (geräteübergreifend gespeichert)
      uiPreferences: user.uiPreferences || {}
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

// 🔧 TEMP: Reset eigenen analysisCount (für Testing nach 500-Fehlern)
// DELETE nach erfolgreichem Test!
router.post("/reset-my-analysis-count", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    const previousCount = user.analysisCount ?? 0;

    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { analysisCount: 0 } }
    );

    console.log(`🔧 [AUTH] Reset analysisCount for ${user.email}: ${previousCount} -> 0`);

    res.json({
      success: true,
      message: "analysisCount zurückgesetzt",
      previousCount,
      newCount: 0,
      email: user.email,
      plan: user.subscriptionPlan || 'free'
    });
  } catch (err) {
    console.error("❌ Reset error:", err);
    res.status(500).json({ message: "Fehler beim Zurücksetzen" });
  }
});

// 🎓 ONBOARDING TOUR: Tour als abgeschlossen markieren (serverseitig)
router.post("/complete-tour", verifyToken, async (req, res) => {
  try {
    const { path } = req.body;

    if (!path || typeof path !== 'string') {
      return res.status(400).json({ message: "Pfad erforderlich" });
    }

    // Pfad normalisieren (lowercase, trailing slashes entfernen)
    const normalizedPath = path.replace(/\/+$/, '').toLowerCase() || '/';

    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "User nicht gefunden" });
    }

    // Prüfen ob Tour bereits abgeschlossen
    const completedTours = user.completedTours || [];
    if (completedTours.includes(normalizedPath)) {
      return res.json({
        success: true,
        message: "Tour bereits abgeschlossen",
        completedTours
      });
    }

    // Tour als abgeschlossen markieren
    const updatedTours = [...completedTours, normalizedPath];

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          completedTours: updatedTours,
          updatedAt: new Date()
        }
      }
    );

    console.log(`🎓 Tour abgeschlossen für ${user.email}: ${normalizedPath}`);

    res.json({
      success: true,
      message: "Tour als abgeschlossen gespeichert",
      completedTours: updatedTours
    });
  } catch (err) {
    console.error("❌ Fehler bei /complete-tour:", err);
    res.status(500).json({ message: "Serverfehler beim Speichern der Tour" });
  }
});

// 🔄 Passwort ändern
router.put("/change-password", verifyToken, async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  if (!oldPassword || !newPassword)
    return res.status(400).json({ message: "❌ Beide Passwörter erforderlich" });

  // 🔐 Password-Policy Validierung für neues Passwort
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      message: "❌ Neues Passwort erfüllt nicht die Sicherheitsanforderungen",
      errors: passwordValidation.errors
    });
  }

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

// 🗑️ Account löschen (mit Archivierung für Admin-Übersicht)
router.delete("/delete", verifyToken, async (req, res) => {
  // 📱 Geräteinformationen beim Löschen erfassen
  const userAgent = req.headers['user-agent'] || '';
  const deviceInfo = parseDeviceInfo(userAgent);
  const ipAddress = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || 'Unbekannt';

  try {
    // User-Daten holen bevor gelöscht wird
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
    }

    // Anzahl der Verträge zählen
    const contractCount = await contractsCollection.countDocuments({ userId: req.user.userId });

    // 📦 Gelöschten Account archivieren (ohne Passwort!)
    const deletedAccountsCollection = dbInstance.collection("deleted_accounts");

    const deletedAccountRecord = {
      originalUserId: user._id.toString(),
      email: user.email,
      subscriptionPlan: user.subscriptionPlan || 'free',
      subscriptionStatus: user.subscriptionStatus || 'inactive',
      betaTester: user.betaTester || false,
      // 📊 Nutzungsstatistiken
      analysisCount: user.analysisCount || 0,
      optimizationCount: user.optimizationCount || 0,
      contractsDeleted: contractCount,
      // 📅 Zeitstempel
      accountCreatedAt: user.createdAt,
      accountDeletedAt: new Date(),
      accountAgeInDays: user.createdAt
        ? Math.floor((Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24))
        : null,
      // 📱 Registrierungsgerät
      registrationDevice: user.registrationDevice || null,
      // 📱 Letztes Login-Gerät
      lastLoginDevice: user.lastLoginDevice || null,
      lastLoginAt: user.lastLoginAt || null,
      // 📱 Löschungsgerät (aktuell)
      deletionDevice: {
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        ip: ipAddress,
        timestamp: new Date()
      },
      // 🏷️ Löschgrund
      deletedBy: 'user', // 'user' = selbst gelöscht, 'admin' = Admin hat gelöscht
      verified: user.verified || false
    };

    await deletedAccountsCollection.insertOne(deletedAccountRecord);
    console.log(`📦 Gelöschter Account archiviert: ${user.email}`);

    // Jetzt tatsächlich löschen
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
// 🛡️ Rate Limited: Verhindert Spam-Attacken mit Reset-Mails
router.post("/forgot-password", authLimiter, async (req, res) => {
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

// 🔍 Token validieren (für Frontend-Vorab-Check)
router.get("/validate-reset-token", async (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(400).json({ valid: false, message: "Token fehlt" });
  }

  try {
    const user = await usersCollection.findOne({ resetToken: token });

    if (!user) {
      return res.status(400).json({ valid: false, message: "Token ungültig" });
    }

    if (user.resetTokenExpires < Date.now()) {
      return res.status(400).json({ valid: false, message: "Token abgelaufen" });
    }

    // Token ist gültig
    res.json({ valid: true, message: "Token gültig" });
  } catch (err) {
    console.error("❌ Fehler bei validate-reset-token:", err);
    res.status(500).json({ valid: false, message: "Serverfehler" });
  }
});

// 🔁 Passwort zurücksetzen
// 🛡️ Rate Limited: Verhindert Token-Bruteforce
router.post("/reset-password", authLimiter, async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword)
    return res.status(400).json({ message: "❌ Token und neues Passwort erforderlich" });

  // 🔐 Password-Policy Validierung
  const passwordValidation = validatePassword(newPassword);
  if (!passwordValidation.valid) {
    return res.status(400).json({
      message: "❌ Passwort erfüllt nicht die Sicherheitsanforderungen",
      errors: passwordValidation.errors
    });
  }

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

// 📧 Custom E-Mail Alias — Reservierte Namen (Blacklist)
const RESERVED_EMAIL_ALIASES = [
  'admin', 'administrator', 'support', 'help', 'info', 'contact', 'kontakt',
  'noreply', 'no-reply', 'postmaster', 'webmaster', 'mailer-daemon',
  'abuse', 'security', 'billing', 'sales', 'team', 'hello', 'office',
  'root', 'system', 'test', 'mail', 'email', 'upload', 'api', 'www',
  'ftp', 'smtp', 'imap', 'pop', 'dns', 'ns1', 'ns2', 'contract-ai',
  'contractai', 'vertrag', 'vertraege', 'contracts', 'demo', 'beta'
];

// 📧 Custom E-Mail Alias Validierung
function validateEmailAlias(alias) {
  if (!alias || typeof alias !== 'string') {
    return { valid: false, error: 'Alias darf nicht leer sein' };
  }

  const trimmed = alias.trim().toLowerCase();

  if (trimmed.length < 3) {
    return { valid: false, error: 'Alias muss mindestens 3 Zeichen haben' };
  }

  if (trimmed.length > 30) {
    return { valid: false, error: 'Alias darf maximal 30 Zeichen haben' };
  }

  // Nur Kleinbuchstaben, Zahlen, Bindestriche — kein Bindestrich am Anfang/Ende
  if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(trimmed) && trimmed.length >= 3) {
    return { valid: false, error: 'Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt (nicht am Anfang/Ende)' };
  }

  // Keine doppelten Bindestriche
  if (trimmed.includes('--')) {
    return { valid: false, error: 'Keine doppelten Bindestriche erlaubt' };
  }

  // Blacklist-Check
  if (RESERVED_EMAIL_ALIASES.includes(trimmed)) {
    return { valid: false, error: 'Dieser Name ist reserviert und nicht verfügbar' };
  }

  return { valid: true, alias: trimmed };
}

// 🔍 Custom E-Mail Alias Verfügbarkeit prüfen (Enterprise only)
router.get("/email-inbox/check-alias/:alias", verifyToken, async (req, res) => {
  try {
    const { alias } = req.params;
    const validation = validateEmailAlias(alias);

    if (!validation.valid) {
      return res.json({ available: false, error: validation.error });
    }

    const fullAddress = `${validation.alias}@upload.contract-ai.de`;

    // Prüfe ob Adresse bereits vergeben ist (aktiv)
    const existingUser = await usersCollection.findOne({
      emailInboxAddress: fullAddress,
      _id: { $ne: new ObjectId(req.user.userId) } // Eigene Adresse ausschließen
    });

    if (existingUser) {
      return res.json({ available: false, error: 'Dieser Name ist bereits vergeben' });
    }

    // Prüfe auch archivierte Adressen (alte Aliases anderer User)
    const archivedUser = await usersCollection.findOne({
      'emailInboxAddressHistory.address': fullAddress,
      _id: { $ne: new ObjectId(req.user.userId) }
    });

    if (archivedUser) {
      return res.json({ available: false, error: 'Dieser Name ist bereits vergeben' });
    }

    res.json({ available: true, alias: validation.alias, fullAddress });
  } catch (err) {
    console.error("❌ Fehler beim Alias-Check:", err);
    res.status(500).json({ available: false, error: 'Serverfehler beim Prüfen' });
  }
});

// 📧 Custom E-Mail Alias setzen/ändern (Enterprise only)
router.put("/email-inbox/custom-alias", verifyToken, async (req, res) => {
  try {
    const { alias } = req.body;
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });

    if (!user) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    // Enterprise-Check
    const userPlan = user.subscriptionPlan || 'free';
    if (!isEnterpriseOrHigher(userPlan)) {
      return res.status(403).json({
        message: "Custom E-Mail-Adressen sind nur im Enterprise-Plan verfügbar"
      });
    }

    // Alias validieren
    const validation = validateEmailAlias(alias);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.error });
    }

    const fullAddress = `${validation.alias}@upload.contract-ai.de`;

    // Uniqueness-Check (aktive Adressen)
    const existingUser = await usersCollection.findOne({
      emailInboxAddress: fullAddress,
      _id: { $ne: user._id }
    });

    if (existingUser) {
      return res.status(409).json({ message: 'Dieser Name ist bereits vergeben' });
    }

    // Uniqueness-Check (archivierte Adressen anderer User)
    const archivedUser = await usersCollection.findOne({
      'emailInboxAddressHistory.address': fullAddress,
      _id: { $ne: user._id }
    });

    if (archivedUser) {
      return res.status(409).json({ message: 'Dieser Name ist bereits vergeben' });
    }

    // Rate-Limit: Max 3 Alias-Änderungen pro Tag
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentChanges = (user.emailInboxAddressHistory || []).filter(
      (entry) => new Date(entry.disabledAt) > oneDayAgo
    );
    if (recentChanges.length >= 3) {
      return res.status(429).json({
        message: 'Maximal 3 Adress-Änderungen pro Tag. Bitte versuche es morgen erneut.'
      });
    }

    // Alte Adresse archivieren + neue setzen
    const oldAddress = user.emailInboxAddress;

    const result = await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          emailInboxAddress: fullAddress,
          customEmailAlias: validation.alias,
          emailInboxAddressCreatedAt: new Date(),
          updatedAt: new Date()
        },
        $push: {
          emailInboxAddressHistory: {
            address: oldAddress,
            disabledAt: new Date()
          }
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    console.log(`✅ Custom Alias gesetzt für User: ${req.user.userId}`);
    console.log(`   Alt: ${oldAddress}`);
    console.log(`   Neu: ${fullAddress}`);

    res.json({
      message: "Custom E-Mail-Adresse erfolgreich gesetzt",
      emailInboxAddress: fullAddress,
      customEmailAlias: validation.alias,
      oldAddress
    });
  } catch (err) {
    console.error("❌ Fehler beim Setzen des Custom Alias:", err);
    res.status(500).json({ message: "Serverfehler beim Setzen des Alias" });
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

// ===== 🆕 PROFIL BEARBEITEN =====

// 📝 PUT /api/auth/update-profile - Name ändern
router.put("/update-profile", verifyToken, async (req, res) => {
  try {
    const { firstName, lastName } = req.body;

    // Validierung
    if (!firstName || !lastName) {
      return res.status(400).json({ message: "❌ Vorname und Nachname erforderlich" });
    }

    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      return res.status(400).json({ message: "❌ Name muss mindestens 2 Zeichen haben" });
    }

    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
    }

    const updatedFirstName = firstName.trim();
    const updatedLastName = lastName.trim();
    const updatedName = `${updatedFirstName} ${updatedLastName}`;

    await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      {
        $set: {
          firstName: updatedFirstName,
          lastName: updatedLastName,
          name: updatedName,
          updatedAt: new Date()
        }
      }
    );

    console.log(`✅ Profil aktualisiert für ${user.email}: ${updatedName}`);

    res.json({
      success: true,
      message: "✅ Profil erfolgreich aktualisiert",
      firstName: updatedFirstName,
      lastName: updatedLastName,
      name: updatedName
    });
  } catch (err) {
    console.error("❌ Fehler beim Aktualisieren des Profils:", err);
    res.status(500).json({ message: "Serverfehler beim Aktualisieren" });
  }
});

// 🎨 PATCH /api/auth/ui-preferences - UI-Einstellungen geräteübergreifend speichern
router.patch("/ui-preferences", verifyToken, async (req, res) => {
  try {
    const updates = {};
    for (const [key, value] of Object.entries(req.body)) {
      updates[`uiPreferences.${key}`] = value;
    }

    await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      { $set: { ...updates, updatedAt: new Date() } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Fehler bei /ui-preferences:", err);
    res.status(500).json({ message: "Serverfehler" });
  }
});

// 📧 POST /api/auth/request-email-change - E-Mail-Änderung anfragen
// 🛡️ Rate Limited: Max 3 Versuche pro 15 Minuten (Spam-Schutz)
router.post("/request-email-change", authLimiter, verifyToken, async (req, res) => {
  try {
    const { newEmail, password } = req.body;

    if (!newEmail || !password) {
      return res.status(400).json({ message: "❌ Neue E-Mail und Passwort erforderlich" });
    }

    const normalizedNewEmail = normalizeEmail(newEmail);

    // Prüfe ob E-Mail bereits existiert
    const existingUser = await usersCollection.findOne({ email: normalizedNewEmail });
    if (existingUser) {
      return res.status(409).json({ message: "❌ Diese E-Mail ist bereits registriert" });
    }

    // Hole aktuellen User und prüfe Passwort
    const user = await usersCollection.findOne({ _id: new ObjectId(req.user.userId) });
    if (!user) {
      return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "❌ Falsches Passwort" });
    }

    // Generiere Bestätigungstoken
    const emailChangeToken = crypto.randomBytes(32).toString("hex");
    const emailChangeExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 Stunden

    await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      {
        $set: {
          pendingEmail: normalizedNewEmail,
          emailChangeToken,
          emailChangeExpires,
          updatedAt: new Date()
        }
      }
    );

    // Sende Bestätigungs-E-Mail an NEUE Adresse
    const confirmLink = `https://contract-ai.de/confirm-email-change?token=${emailChangeToken}`;

    const html = generateEmailTemplate({
      title: "E-Mail-Adresse bestätigen",
      preheader: "Bestätigen Sie Ihre neue E-Mail-Adresse",
      body: `
        <p style="text-align: center; margin-bottom: 25px;">
          Sie haben angefordert, Ihre E-Mail-Adresse zu ändern.<br>
          Klicken Sie auf den Button, um <strong>${normalizedNewEmail}</strong> zu bestätigen.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
          <tr><td style="padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #555;">
              <strong>Gültig für:</strong> 24 Stunden
            </p>
          </td></tr>
        </table>

        <p style="font-size: 13px; color: #888; text-align: center;">
          Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.<br>
          Ihre E-Mail-Adresse bleibt unverändert.
        </p>
      `,
      cta: {
        text: "E-Mail-Adresse bestätigen",
        url: confirmLink
      }
    });

    await sendEmail({ to: normalizedNewEmail, subject: "E-Mail-Adresse bestätigen", html });

    console.log(`📧 E-Mail-Änderung angefordert: ${user.email} → ${normalizedNewEmail}`);

    res.json({
      success: true,
      message: "✅ Bestätigungs-E-Mail gesendet. Bitte prüfen Sie Ihr Postfach."
    });
  } catch (err) {
    console.error("❌ Fehler bei E-Mail-Änderung:", err);
    res.status(500).json({ message: "Serverfehler bei E-Mail-Änderung" });
  }
});

// ✅ GET /api/auth/confirm-email-change - E-Mail-Änderung bestätigen
router.get("/confirm-email-change", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ message: "❌ Token fehlt" });
    }

    const user = await usersCollection.findOne({ emailChangeToken: token });

    if (!user) {
      return res.status(404).json({ message: "❌ Ungültiger Token" });
    }

    if (user.emailChangeExpires < Date.now()) {
      return res.status(410).json({ message: "❌ Token abgelaufen" });
    }

    const oldEmail = user.email;
    const newEmail = user.pendingEmail;

    // E-Mail aktualisieren
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          email: newEmail,
          updatedAt: new Date()
        },
        $unset: {
          pendingEmail: "",
          emailChangeToken: "",
          emailChangeExpires: ""
        }
      }
    );

    console.log(`✅ E-Mail geändert: ${oldEmail} → ${newEmail}`);

    // 🔒 Sicherheits-Benachrichtigung an ALTE E-Mail senden
    try {
      const userName = user.firstName || user.name?.split(' ')[0] || oldEmail.split('@')[0];
      const securityEmailHtml = generateEmailTemplate({
        title: `Sicherheitshinweis: E-Mail-Adresse geändert`,
        preheader: `Ihre E-Mail-Adresse wurde erfolgreich geändert`,
        body: `
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Hallo ${userName},
          </p>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            die E-Mail-Adresse Ihres Contract AI-Kontos wurde soeben geändert.
          </p>
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 24px 0;">
            <p style="margin: 0; color: #374151;"><strong>Alte E-Mail:</strong> ${oldEmail}</p>
            <p style="margin: 8px 0 0; color: #374151;"><strong>Neue E-Mail:</strong> ${newEmail}</p>
            <p style="margin: 8px 0 0; color: #6b7280; font-size: 14px;">Geändert am: ${new Date().toLocaleString('de-DE')}</p>
          </div>
          <p style="color: #374151; font-size: 16px; line-height: 1.6;">
            Wenn Sie diese Änderung <strong>nicht</strong> vorgenommen haben, kontaktieren Sie uns bitte umgehend unter
            <a href="mailto:support@contract-ai.de" style="color: #3b82f6;">support@contract-ai.de</a>
          </p>
        `,
        recipientEmail: oldEmail,
        emailCategory: 'security'
      });

      await sendEmail(oldEmail, "⚠️ Sicherheitshinweis: E-Mail-Adresse geändert – Contract AI", securityEmailHtml);
      console.log(`📧 Sicherheits-E-Mail an alte Adresse gesendet: ${oldEmail}`);
    } catch (emailErr) {
      console.error("⚠️ Sicherheits-E-Mail konnte nicht gesendet werden:", emailErr);
      // Fehler beim E-Mail-Versand sollte die Änderung nicht blockieren
    }

    // Redirect zur Erfolgsseite
    res.redirect(`https://contract-ai.de/profile?emailChanged=true`);
  } catch (err) {
    console.error("❌ Fehler bei E-Mail-Bestätigung:", err);
    res.status(500).json({ message: "Serverfehler bei E-Mail-Bestätigung" });
  }
});

// 🖼️ POST /api/auth/upload-profile-picture - Profilbild hochladen (Base64)
router.post("/upload-profile-picture", verifyToken, async (req, res) => {
  try {
    const { imageData } = req.body; // Base64 encoded image

    if (!imageData) {
      return res.status(400).json({ message: "❌ Bilddaten fehlen" });
    }

    // Validiere Base64 Format
    const matches = imageData.match(/^data:image\/(png|jpeg|jpg|webp);base64,/);
    if (!matches) {
      return res.status(400).json({ message: "❌ Ungültiges Bildformat. Erlaubt: PNG, JPEG, WebP" });
    }

    // Größe prüfen (max 2MB)
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const sizeInBytes = Buffer.from(base64Data, 'base64').length;
    if (sizeInBytes > 2 * 1024 * 1024) {
      return res.status(400).json({ message: "❌ Bild zu groß. Maximum: 2MB" });
    }

    await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      {
        $set: {
          profilePicture: imageData,
          updatedAt: new Date()
        }
      }
    );

    console.log(`🖼️ Profilbild aktualisiert für User ${req.user.userId}`);

    res.json({
      success: true,
      message: "✅ Profilbild erfolgreich hochgeladen"
    });
  } catch (err) {
    console.error("❌ Fehler beim Profilbild-Upload:", err);
    res.status(500).json({ message: "Serverfehler beim Upload" });
  }
});

// 🗑️ DELETE /api/auth/profile-picture - Profilbild löschen
router.delete("/profile-picture", verifyToken, async (req, res) => {
  try {
    await usersCollection.updateOne(
      { _id: new ObjectId(req.user.userId) },
      {
        $unset: { profilePicture: "" },
        $set: { updatedAt: new Date() }
      }
    );

    console.log(`🗑️ Profilbild gelöscht für User ${req.user.userId}`);

    res.json({
      success: true,
      message: "✅ Profilbild gelöscht"
    });
  } catch (err) {
    console.error("❌ Fehler beim Löschen des Profilbilds:", err);
    res.status(500).json({ message: "Serverfehler beim Löschen" });
  }
});

// 📦 GET /api/auth/export-data - DSGVO Daten-Export
router.get("/export-data", verifyToken, async (req, res) => {
  try {
    const user = await usersCollection.findOne(
      { _id: new ObjectId(req.user.userId) },
      { projection: { password: 0, resetToken: 0, resetTokenExpires: 0, emailChangeToken: 0, profilePicture: 0 } }
    );

    if (!user) {
      return res.status(404).json({ message: "❌ Benutzer nicht gefunden" });
    }

    // Hole alle Verträge des Users
    const contracts = await contractsCollection.find({ userId: req.user.userId }).toArray();

    // Hole Kalender-Events
    const calendarCollection = dbInstance.collection("calendar_events");
    const calendarEvents = await calendarCollection.find({ userId: req.user.userId }).toArray();

    // Hole Firmenprofil
    const companyProfilesCollection = dbInstance.collection("company_profiles");
    const companyProfile = await companyProfilesCollection.findOne({ userId: new ObjectId(req.user.userId) });

    // Exportdaten zusammenstellen
    const exportData = {
      exportedAt: new Date().toISOString(),
      exportedFor: user.email,
      user: {
        email: user.email,
        firstName: user.firstName || null,
        lastName: user.lastName || null,
        name: user.name || null,
        createdAt: user.createdAt,
        verified: user.verified,
        subscriptionPlan: user.subscriptionPlan,
        subscriptionStatus: user.subscriptionStatus,
        analysisCount: user.analysisCount,
        optimizationCount: user.optimizationCount,
        emailNotifications: user.emailNotifications,
        contractReminders: user.contractReminders,
        onboarding: user.onboarding || null
      },
      companyProfile: companyProfile ? {
        companyName: companyProfile.companyName,
        legalForm: companyProfile.legalForm,
        street: companyProfile.street,
        postalCode: companyProfile.postalCode,
        city: companyProfile.city,
        country: companyProfile.country,
        vatId: companyProfile.vatId,
        contactEmail: companyProfile.contactEmail,
        contactPhone: companyProfile.contactPhone
      } : null,
      contracts: contracts.map(c => ({
        id: c._id,
        contractName: c.contractName,
        contractType: c.contractType,
        partnerName: c.partnerName,
        startDate: c.startDate,
        expiryDate: c.expiryDate,
        value: c.value,
        status: c.status,
        createdAt: c.createdAt,
        analysisScore: c.analysisScore,
        // Keine Dateiinhalte exportieren, nur Metadaten
        hasFile: !!c.s3Key
      })),
      calendarEvents: calendarEvents.map(e => ({
        id: e._id,
        title: e.title,
        date: e.date,
        type: e.type,
        severity: e.severity,
        description: e.description,
        createdAt: e.createdAt
      })),
      _meta: {
        totalContracts: contracts.length,
        totalCalendarEvents: calendarEvents.length,
        hasCompanyProfile: !!companyProfile
      }
    };

    console.log(`📦 DSGVO-Export erstellt für ${user.email}: ${contracts.length} Verträge, ${calendarEvents.length} Events`);

    // Als JSON-Datei senden
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="contract-ai-export-${new Date().toISOString().split('T')[0]}.json"`);
    res.json(exportData);
  } catch (err) {
    console.error("❌ Fehler beim Daten-Export:", err);
    res.status(500).json({ message: "Serverfehler beim Export" });
  }
});

// ============================================================
// 🔕 GDPR-COMPLIANT UNSUBSCRIBE ENDPOINT
// ============================================================

/**
 * GET /unsubscribe - Verify token and show unsubscribe confirmation page
 * POST /unsubscribe - Process the unsubscribe request
 *
 * GDPR-Compliant: No login required, token-based identification
 * Supports two token formats:
 *   - Legacy (unsubscribeToken.js): userId-based, no category (Legal Pulse)
 *   - New (emailUnsubscribeService.js): email+category-based (marketing, calendar, etc.)
 */
const { verifyUnsubscribeToken } = require('../utils/unsubscribeToken');
const { validateUnsubscribeToken } = require('../services/emailUnsubscribeService');

// Helper: Resolve token to { user, category } regardless of format
async function resolveUnsubscribeToken(token) {
  // Try new format first (email+category)
  const newResult = validateUnsubscribeToken(token);
  if (newResult) {
    const user = await usersCollection.findOne({ email: newResult.email.toLowerCase() });
    return user ? { user, category: newResult.category || 'all' } : null;
  }

  // Fallback: old format (userId-based, always Legal Pulse)
  const userId = verifyUnsubscribeToken(token);
  if (userId) {
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    return user ? { user, category: 'calendar' } : null;
  }

  return null;
}

// Helper: Check if user is currently subscribed for a category
function isSubscribedForCategory(user, category) {
  switch (category) {
    case 'marketing':
      return user.emailPreferences?.marketing !== false && user.emailOptOut !== true;
    case 'calendar':
      return user.legalPulseSettings?.emailNotifications !== false;
    case 'product_updates':
      return user.emailPreferences?.product_updates !== false && user.emailOptOut !== true;
    case 'all':
      return user.emailOptOut !== true;
    default:
      return true;
  }
}

// Helper: Get DB update operations for unsubscribe per category
function getUnsubscribeUpdate(category) {
  switch (category) {
    case 'marketing':
      return { $set: { 'emailPreferences.marketing': false, 'emailPreferencesUpdatedAt': new Date() } };
    case 'calendar':
      return { $set: { 'legalPulseSettings.emailNotifications': false, 'unsubscribedAt': new Date() } };
    case 'product_updates':
      return { $set: { 'emailPreferences.product_updates': false, 'emailPreferencesUpdatedAt': new Date() } };
    case 'all':
      return { $set: { emailOptOut: true, emailOptOutAt: new Date(), 'emailPreferencesUpdatedAt': new Date() } };
    default:
      return { $set: { 'emailPreferences.marketing': false, 'emailPreferencesUpdatedAt': new Date() } };
  }
}

// Helper: Get DB update operations for resubscribe per category
function getResubscribeUpdate(category) {
  switch (category) {
    case 'marketing':
      return { $set: { 'emailPreferences.marketing': true, 'emailPreferencesUpdatedAt': new Date() } };
    case 'calendar':
      return { $set: { 'legalPulseSettings.emailNotifications': true }, $unset: { 'unsubscribedAt': '' } };
    case 'product_updates':
      return { $set: { 'emailPreferences.product_updates': true, 'emailPreferencesUpdatedAt': new Date() } };
    case 'all':
      return { $set: { emailOptOut: false, 'emailPreferencesUpdatedAt': new Date() } };
    default:
      return { $set: { 'emailPreferences.marketing': true, 'emailPreferencesUpdatedAt': new Date() } };
  }
}

// GET: Verify token (for frontend to check before showing form)
router.get("/unsubscribe", async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Kein Abmelde-Token angegeben"
      });
    }

    const resolved = await resolveUnsubscribeToken(token);

    if (!resolved) {
      return res.status(400).json({
        success: false,
        message: "Ungültiger oder abgelaufener Abmelde-Link"
      });
    }

    const { user, category } = resolved;

    // Return current notification status + category
    res.json({
      success: true,
      email: user.email.replace(/(.{2}).*(@.*)/, '$1***$2'),
      currentStatus: isSubscribedForCategory(user, category),
      category,
      message: "Token gültig"
    });

  } catch (error) {
    console.error("❌ Unsubscribe verification error:", error);
    res.status(500).json({
      success: false,
      message: "Serverfehler bei der Verifizierung"
    });
  }
});

// POST: Process unsubscribe
router.post("/unsubscribe", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Kein Abmelde-Token angegeben"
      });
    }

    const resolved = await resolveUnsubscribeToken(token);

    if (!resolved) {
      return res.status(400).json({
        success: false,
        message: "Ungültiger oder abgelaufener Abmelde-Link"
      });
    }

    const { user, category } = resolved;
    const update = getUnsubscribeUpdate(category);

    const result = await usersCollection.updateOne(
      { _id: user._id },
      update
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden"
      });
    }

    // Log the unsubscribe action for GDPR compliance
    const database = require('../config/database');
    const db = await database.connect();
    await db.collection('audit_log').insertOne({
      action: 'email_unsubscribe',
      userId: user._id,
      timestamp: new Date(),
      source: 'unsubscribe_link',
      category,
      details: { previousStatus: true, newStatus: false }
    });

    console.log(`🔕 User ${user._id} has unsubscribed from ${category} notifications`);

    res.json({
      success: true,
      message: "Sie wurden erfolgreich von E-Mail-Benachrichtigungen abgemeldet."
    });

  } catch (error) {
    console.error("❌ Unsubscribe error:", error);
    res.status(500).json({
      success: false,
      message: "Serverfehler beim Abmelden"
    });
  }
});

// POST: Resubscribe (if user changes mind)
router.post("/resubscribe", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Kein Token angegeben"
      });
    }

    const resolved = await resolveUnsubscribeToken(token);

    if (!resolved) {
      return res.status(400).json({
        success: false,
        message: "Ungültiger Token"
      });
    }

    const { user, category } = resolved;
    const update = getResubscribeUpdate(category);

    const result = await usersCollection.updateOne(
      { _id: user._id },
      update
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Benutzer nicht gefunden"
      });
    }

    console.log(`🔔 User ${user._id} has resubscribed to ${category} notifications`);

    res.json({
      success: true,
      message: "Sie erhalten wieder E-Mail-Benachrichtigungen."
    });

  } catch (error) {
    console.error("❌ Resubscribe error:", error);
    res.status(500).json({
      success: false,
      message: "Serverfehler"
    });
  }
});