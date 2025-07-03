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
        title: "Willkommen bei Contract AI! 🚀",
        body: `
          <div style="text-align: center; margin: 20px 0;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        border-radius: 50%; width: 80px; height: 80px; 
                        margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
              <span style="font-size: 32px;">🎉</span>
            </div>
          </div>
          
          <h2 style="color: #1e293b; margin: 20px 0; font-size: 24px; font-weight: 600;">
            Fast geschafft! Nur noch ein Klick...
          </h2>
          
          <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
            Schön, dass Sie sich für <strong>Contract AI</strong> entschieden haben! 
            Bestätigen Sie jetzt Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren.
          </p>
          
          <div style="background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%); 
                      border-radius: 12px; padding: 20px; margin: 24px 0;">
            <h3 style="color: #334155; margin: 0 0 12px 0; font-size: 18px;">
              🚀 Was Sie als nächstes erwartet:
            </h3>
            <ul style="color: #475569; margin: 0; padding-left: 20px; line-height: 1.8;">
              <li><strong>KI-Vertragsanalyse</strong> - Ihre Verträge automatisch analysieren lassen</li>
              <li><strong>Laufzeit-Management</strong> - Nie wieder wichtige Fristen verpassen</li>
              <li><strong>Optimierungsvorschläge</strong> - Verbesserungen durch künstliche Intelligenz</li>
              <li><strong>Risiko-Scanner</strong> - Problematische Klauseln frühzeitig erkennen</li>
            </ul>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 24px 0 8px;">
            <strong>⏰ Dieser Link ist 24 Stunden gültig.</strong><br>
            Falls Sie diese E-Mail nicht angefordert haben, können Sie sie einfach ignorieren.
          </p>
        `,
        cta: {
          text: "🔥 E-Mail-Adresse bestätigen",
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
          title: "🎉 Herzlich Willkommen bei Contract AI!",
          body: `
            <div style="text-align: center; margin: 20px 0;">
              <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); 
                          border-radius: 50%; width: 80px; height: 80px; 
                          margin: 0 auto 20px; display: flex; align-items: center; justify-content: center;">
                <span style="font-size: 32px;">✅</span>
              </div>
            </div>
            
            <h2 style="color: #1e293b; margin: 20px 0; font-size: 24px; font-weight: 600;">
              Perfekt! Ihr Konto ist jetzt aktiviert 🚀
            </h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 16px 0;">
              <strong>Glückwunsch!</strong> Ihre E-Mail-Adresse wurde erfolgreich bestätigt. 
              Sie können jetzt die volle Power von Contract AI nutzen!
            </p>
            
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); 
                        border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin: 24px 0;">
              <h3 style="color: #166534; margin: 0 0 16px 0; font-size: 18px;">
                🎯 Ihre nächsten Schritte:
              </h3>
              <div style="display: grid; gap: 12px;">
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: #22c55e; color: white; border-radius: 50%; 
                              width: 24px; height: 24px; display: flex; align-items: center; 
                              justify-content: center; font-size: 12px; font-weight: bold;">1</span>
                  <span style="color: #166534; font-weight: 500;">Ersten Vertrag hochladen</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: #22c55e; color: white; border-radius: 50%; 
                              width: 24px; height: 24px; display: flex; align-items: center; 
                              justify-content: center; font-size: 12px; font-weight: bold;">2</span>
                  <span style="color: #166534; font-weight: 500;">KI-Analyse starten</span>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                  <span style="background: #22c55e; color: white; border-radius: 50%; 
                              width: 24px; height: 24px; display: flex; align-items: center; 
                              justify-content: center; font-size: 12px; font-weight: bold;">3</span>
                  <span style="color: #166534; font-weight: 500;">Optimierungsvorschläge erhalten</span>
                </div>
              </div>
            </div>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin: 24px 0;">
              <strong>💡 Tipp:</strong> Probieren Sie unsere KI-Vertragsoptimierung aus – 
              sie findet Verbesserungspotenziale, die Sie überraschen werden!
            </p>
            
            <p style="color: #64748b; font-size: 14px; margin: 20px 0;">
              Bei Fragen sind wir jederzeit für Sie da: 
              <a href="mailto:support@contract-ai.de" style="color: #3b82f6; text-decoration: none;">
                support@contract-ai.de
              </a>
            </p>
          `,
          cta: {
            text: "🚀 Jetzt loslegen",
            url: `${process.env.FRONTEND_URL}/dashboard`
          }
        });

        await sendEmailHtml(user.email, "Contract AI - Willkommen!", welcomeEmailHtml);
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