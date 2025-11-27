// 📁 backend/routes/emailVerification.js
// ✅ SEPARATE ROUTE - Bestehende auth.js bleibt unverändert!

const express = require("express");
const crypto = require("crypto");
const router = express.Router();

// E-Mail-Templates und Utilities importieren
const sendEmailHtml = require("../utils/sendEmailHtml");
const generateEmailTemplate = require("../utils/emailTemplate");
const { normalizeEmail } = require("../utils/normalizeEmail");

module.exports = function(db) {
  const usersCollection = db.collection("users");

  // ✅ 1. VERIFICATION E-MAIL SENDEN - IDEMPOTENT mit Cooldown
  router.post("/send-verification", async (req, res) => {
    const COOLDOWN_MS = 60_000; // 60 Sekunden Cooldown

    try {
      const { email: rawEmail } = req.body;

      if (!rawEmail) {
        return res.status(400).json({ message: "E-Mail ist erforderlich" });
      }

      const email = normalizeEmail(rawEmail);

      // User in DB finden
      const user = await usersCollection.findOne({ email });

      if (!user) {
        console.error(`❌ send-verification: User nicht gefunden - rawEmail: ${rawEmail}, normalizedEmail: ${email}`);
        return res.status(404).json({ message: "User nicht gefunden" });
      }

      // Prüfen ob bereits verifiziert
      if (user.verified === true) {
        return res.json({ status: "already_verified", message: "User ist bereits verifiziert" });
      }

      // Cooldown prüfen - Idempotenz für wiederholte Calls
      const now = Date.now();
      if (user.lastVerificationSentAt) {
        const timeSinceLastSent = now - new Date(user.lastVerificationSentAt).getTime();
        if (timeSinceLastSent < COOLDOWN_MS) {
          console.log(`✅ send-verification: Cooldown aktiv für ${email} - ${Math.ceil((COOLDOWN_MS - timeSinceLastSent) / 1000)}s verbleibend`);
          return res.json({
            status: "already_sent_recently",
            message: "E-Mail wurde kürzlich gesendet",
            retryAfter: Math.ceil((COOLDOWN_MS - timeSinceLastSent) / 1000)
          });
        }
      }

      // Neuen Verification-Token generieren
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h gültig

      // Token in DB speichern + Cooldown-Timestamp setzen
      await usersCollection.updateOne(
        { email },
        {
          $set: {
            verificationToken,
            verificationTokenExpiry: tokenExpiry,
            tokenUpdatedAt: new Date(),
            lastVerificationSentAt: new Date(now)
          }
        }
      );

      // Verification-Link erstellen
      const frontendUrl = process.env.FRONTEND_URL || "https://contract-ai.de";
      const verificationLink = `${frontendUrl}/api/email-verification/verify?token=${verificationToken}`;

      // ✅ V4 CLEAN E-MAIL-TEMPLATE - Minimalistisch & Button im Fokus
      const emailHtml = generateEmailTemplate({
        title: "E-Mail bestätigen",
        preheader: "Bestätigen Sie Ihre E-Mail-Adresse",
        body: `
          <p style="text-align: center; margin-bottom: 30px;">
            Vielen Dank für Ihre Registrierung bei <strong>Contract AI</strong>.<br>
            Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren.
          </p>
        `,
        cta: {
          text: "E-Mail bestätigen",
          url: verificationLink
        }
      });

      // E-Mail senden
      await sendEmailHtml(email, "Contract AI - E-Mail-Adresse bestätigen", emailHtml);

      console.log(`✅ Verification-E-Mail gesendet an: ${email}`);

      res.json({
        status: "queued",
        message: "Bestätigungs-E-Mail wurde gesendet",
        email: email,
        tokenExpiry: tokenExpiry
      });

    } catch (error) {
      console.error("❌ Fehler beim Senden der Verification-E-Mail:", error);
      res.status(500).json({ message: "Fehler beim Senden der E-Mail" });
    }
  });

  // ✅ 2. E-MAIL VERIFIZIEREN
  router.get("/verify", async (req, res) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ message: "Verification-Token fehlt" });
      }

      // User mit Token finden
      const user = await usersCollection.findOne({ 
        verificationToken: token,
        verificationTokenExpiry: { $gt: new Date() } // Token noch nicht abgelaufen
      });

      if (!user) {
        return res.status(400).json({ 
          message: "Ungültiger oder abgelaufener Verification-Token" 
        });
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

      // ✅ V4 WILLKOMMENS-E-MAIL senden (optional)
      try {
        const welcomeEmailHtml = generateEmailTemplate({
          title: "Willkommen bei Contract AI!",
          preheader: "Ihr Konto ist jetzt aktiviert",
          body: `
            <div style="background-color: #ecfdf5; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
              <span style="font-size: 48px;">✅</span>
              <p style="color: #065f46; font-size: 18px; font-weight: 600; margin: 10px 0 0 0;">Konto aktiviert!</p>
            </div>

            <p style="text-align: center; margin-bottom: 25px;">
              Ihre E-Mail-Adresse wurde erfolgreich bestätigt.<br>
              Sie können jetzt alle Funktionen von Contract AI nutzen.
            </p>

            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
              <tr><td style="padding: 20px;">
                <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1a1a1a;">Ihre nächsten Schritte:</p>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">1. Ersten Vertrag hochladen</p>
                <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">2. KI-Analyse starten</p>
                <p style="margin: 0; font-size: 14px; color: #555;">3. Optimierungsvorschläge erhalten</p>
              </td></tr>
            </table>
          `,
          cta: {
            text: "Zum Dashboard",
            url: `${process.env.FRONTEND_URL || "https://contract-ai.de"}/dashboard`
          }
        });

        await sendEmailHtml(user.email, "Willkommen bei Contract AI!", welcomeEmailHtml);
      } catch (emailError) {
        console.log("⚠️ Willkommens-E-Mail konnte nicht gesendet werden:", emailError.message);
        // Nicht kritisch - Verification war erfolgreich
      }

      // Redirect zum Frontend mit Success-Status
      const frontendUrl = process.env.FRONTEND_URL || "https://contract-ai.de";
      const redirectUrl = `${frontendUrl}/verify-success?email=${encodeURIComponent(user.email)}`;
      res.redirect(redirectUrl);

    } catch (error) {
      console.error("❌ Fehler bei E-Mail-Verification:", error);
      res.status(500).json({ message: "Fehler bei der Verifizierung" });
    }
  });

  // ✅ 3. VERIFICATION-STATUS PRÜFEN
  router.get("/status/:email", async (req, res) => {
    try {
      const { email } = req.params;
      
      const user = await usersCollection.findOne(
        { email: email.toLowerCase() },
        { projection: { verified: 1, email: 1, createdAt: 1 } }
      );

      if (!user) {
        return res.status(404).json({ message: "User nicht gefunden" });
      }

      res.json({
        email: user.email,
        verified: user.verified || false,
        registeredAt: user.createdAt
      });

    } catch (error) {
      console.error("❌ Fehler beim Prüfen des Verification-Status:", error);
      res.status(500).json({ message: "Fehler beim Prüfen des Status" });
    }
  });

  return router;
};