// 📁 backend/routes/emailVerification.js
// ✅ SEPARATE ROUTE - Bestehende auth.js bleibt unverändert!

const express = require("express");
const crypto = require("crypto");
const router = express.Router();

// E-Mail-Templates und Utilities importieren
const sendEmailHtml = require("../utils/sendEmailHtml");
const generateEmailTemplate = require("../utils/emailTemplate");

module.exports = function(db) {
  const usersCollection = db.collection("users");

  // ✅ 1. VERIFICATION E-MAIL SENDEN
  router.post("/send-verification", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: "E-Mail ist erforderlich" });
      }

      // User in DB finden
      const user = await usersCollection.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        return res.status(404).json({ message: "User nicht gefunden" });
      }

      // Prüfen ob bereits verifiziert
      if (user.verified === true) {
        return res.status(400).json({ message: "User ist bereits verifiziert" });
      }

      // Neuen Verification-Token generieren
      const verificationToken = crypto.randomBytes(32).toString('hex');
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h gültig

      // Token in DB speichern
      await usersCollection.updateOne(
        { email: email.toLowerCase() },
        { 
          $set: { 
            verificationToken,
            verificationTokenExpiry: tokenExpiry,
            tokenUpdatedAt: new Date()
          }
        }
      );

      // Verification-Link erstellen
      const frontendUrl = process.env.FRONTEND_URL || "https://contract-ai.de";
      const verificationLink = `${frontendUrl}/api/email-verification/verify?token=${verificationToken}`;

      // E-Mail-Template generieren
      const emailHtml = generateEmailTemplate({
        title: "E-Mail-Adresse bestätigen",
        body: `
          <h2>Willkommen bei Contract AI!</h2>
          <p>Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren:</p>
          <p style="color: #666; font-size: 14px;">
            Dieser Link ist 24 Stunden gültig. Falls Sie diese E-Mail nicht angefordert haben, 
            können Sie sie ignorieren.
          </p>
        `,
        cta: {
          text: "E-Mail-Adresse bestätigen",
          url: verificationLink
        }
      });

      // E-Mail senden
      await sendEmailHtml(email, "Contract AI - E-Mail-Adresse bestätigen", emailHtml);

      console.log(`✅ Verification-E-Mail gesendet an: ${email}`);
      
      res.json({ 
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

      // Willkommens-E-Mail senden (optional)
      try {
        const welcomeEmailHtml = generateEmailTemplate({
          title: "Willkommen bei Contract AI!",
          body: `
            <h2>Herzlich willkommen!</h2>
            <p>Ihre E-Mail-Adresse wurde erfolgreich bestätigt.</p>
            <p>Sie können sich jetzt anmelden und Contract AI nutzen:</p>
            <p>Viel Erfolg mit Contract AI!</p>
          `,
          cta: {
            text: "Jetzt anmelden",
            url: `${process.env.FRONTEND_URL}/login`
          }
        });

        await sendEmailHtml(user.email, "Contract AI - Willkommen!", welcomeEmailHtml);
      } catch (emailError) {
        console.log("⚠️ Willkommens-E-Mail konnte nicht gesendet werden:", emailError.message);
        // Nicht kritisch - Verification war erfolgreich
      }

      // Redirect zum Frontend mit Success-Status
      const redirectUrl = `${process.env.FRONTEND_URL}/verify-success?email=${encodeURIComponent(user.email)}`;
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