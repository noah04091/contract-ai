// 📁 backend/routes/emailVerification.js
// ✅ SEPARATE ROUTE - Bestehende auth.js bleibt unverändert!

const express = require("express");
const router = express.Router();

// Utilities importieren
const { normalizeEmail } = require("../utils/normalizeEmail");
const { sendWelcomeEmailNow } = require("../services/onboardingEmailService");
// Versand-Logik extrahiert (19.08.2026): auth.js/register nutzt denselben Service,
// damit die Mail auch rausgeht, wenn der Kunde den Tab sofort schließt.
const { sendVerificationMail } = require("../services/verificationEmailService");
// 🛡️ Drosselung nach Hausmuster (cf-connecting-ip, kein trust proxy) — die Routen
// waren vorher komplett ungedrosselt (nur der 60s-DB-Cooldown pro Kunde).
const { authLimiter } = require("../middleware/rateLimiter");

module.exports = function(db) {
  const usersCollection = db.collection("users");

  // ✅ 1. VERIFICATION E-MAIL SENDEN - IDEMPOTENT mit Cooldown
  // Logik lebt im verificationEmailService (wird auch von /auth/register genutzt);
  // hier nur noch das Mapping auf die bisherigen, unveränderten JSON-Antworten.
  router.post("/send-verification", authLimiter, async (req, res) => {
    try {
      const result = await sendVerificationMail(db, req.body?.email);

      switch (result.status) {
        case "missing_email":
          return res.status(400).json({ message: result.message });
        case "not_found":
          return res.status(404).json({ message: result.message });
        case "error":
          return res.status(500).json({ message: result.message });
        case "already_verified":
          return res.json({ status: result.status, message: result.message });
        case "already_sent_recently":
          return res.json({ status: result.status, message: result.message, retryAfter: result.retryAfter });
        default: // 'queued'
          return res.json({
            status: result.status,
            message: result.message,
            email: result.email,
            tokenExpiry: result.tokenExpiry
          });
      }
    } catch (error) {
      console.error("❌ Fehler beim Senden der Verification-E-Mail:", error);
      res.status(500).json({ message: "Fehler beim Senden der E-Mail" });
    }
  });

  // ✅ 2. E-MAIL VERIFIZIEREN
  // Wichtig: Diese Route wird per Klick im Browser geöffnet, NIE per fetch.
  // Deshalb antwortet sie in JEDEM Ausgang mit einem Redirect auf eine echte
  // Seite — vorher zeigte der Fehlerpfad rohes JSON (Sackgasse am kritischsten
  // Punkt des Funnels, u. a. bei abgelaufenem 24h-Token, Doppelklick auf den
  // Link und Mail-Scanner-Prefetch, der den Token vor dem User verbraucht).
  router.get("/verify", authLimiter, async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || "https://contract-ai.de";

    // Fehler-/Selbstheilungs-Pfad: Kennt der Link die Adresse und ist der User
    // längst verifiziert (Token schon verbraucht), ist das KEIN Fehler → Erfolgsseite.
    // Sonst → /verify-failed mit vorausgefüllter Adresse für den Neu-Senden-Knopf.
    const redirectFailedOrAlreadyVerified = async (emailParam) => {
      try {
        if (emailParam) {
          const email = normalizeEmail(emailParam);
          const existing = await usersCollection.findOne(
            { email },
            { projection: { verified: 1, email: 1 } }
          );
          if (existing && existing.verified === true) {
            return res.redirect(`${frontendUrl}/verify-success?email=${encodeURIComponent(existing.email)}`);
          }
          return res.redirect(`${frontendUrl}/verify-failed?email=${encodeURIComponent(email)}`);
        }
      } catch (lookupErr) {
        console.error("⚠️ verify: Lookup im Fehlerpfad fehlgeschlagen:", lookupErr.message);
      }
      return res.redirect(`${frontendUrl}/verify-failed`);
    };

    try {
      const { token, email: emailParam } = req.query;

      if (!token) {
        return await redirectFailedOrAlreadyVerified(emailParam);
      }

      // User mit Token finden
      const user = await usersCollection.findOne({
        verificationToken: token,
        verificationTokenExpiry: { $gt: new Date() } // Token noch nicht abgelaufen
      });

      if (!user) {
        return await redirectFailedOrAlreadyVerified(emailParam);
      }

      // User als verifiziert markieren
      await usersCollection.updateOne(
        { _id: user._id },
        { 
          $set: { 
            verified: true,
            verifiedAt: new Date()
          },
          $unset: { 
            verificationToken: "",
            verificationTokenExpiry: ""
          }
        }
      );

      console.log(`✅ User verifiziert: ${user.email}`);

      // 📋 Activity Log: E-Mail verifiziert
      try {
        const { logActivity, ActivityTypes } = require('../services/activityLogger');
        await logActivity(db, {
          type: ActivityTypes.USER_VERIFIED,
          userId: user._id.toString(),
          userEmail: user.email,
          description: `E-Mail verifiziert: ${user.email}`,
          details: {},
          severity: 'info',
          source: 'emailVerification'
        });
      } catch (logErr) {
        console.error("Activity Log Error:", logErr);
      }

      // ✅ Onboarding Checklist aktualisieren - emailVerified = true
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { 'onboarding.checklist.emailVerified': true } }
      );

      // 📧 Onboarding Welcome E-Mail senden (verbesserte Version)
      try {
        await sendWelcomeEmailNow(user, db);
        console.log(`📧 Onboarding Welcome E-Mail gesendet an: ${user.email}`);
      } catch (emailError) {
        console.log("⚠️ Onboarding Welcome E-Mail konnte nicht gesendet werden:", emailError.message);
        // Nicht kritisch - Verification war erfolgreich
      }

      // Redirect zum Frontend mit Success-Status
      const redirectUrl = `${frontendUrl}/verify-success?email=${encodeURIComponent(user.email)}`;
      res.redirect(redirectUrl);

    } catch (error) {
      console.error("❌ Fehler bei E-Mail-Verification:", error);
      // Auch der Serverfehler landet auf einer echten Seite, nie auf rohem JSON
      res.redirect(`${frontendUrl}/verify-failed`);
    }
  });

  // ❌ GET /status/:email ENTFERNT (19.08.2026): hatte im gesamten Repo null
  // Aufrufer und verriet ohne Auth, ob eine Adresse registriert ist
  // (Adress-Enumeration). Befund 6 der Registrierungs-Strecke.

  return router;
};