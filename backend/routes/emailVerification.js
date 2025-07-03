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

      // ✅ MODERNES E-MAIL-TEMPLATE mit neuem Logo
      const emailHtml = generateEmailTemplate({
        title: "Willkommen bei Contract AI! 🚀",
        preheader: "Bestätigen Sie Ihre E-Mail-Adresse, um loszulegen",
        body: `
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); 
                        border-radius: 20px; width: 100px; height: 100px; 
                        margin: 0 auto 30px; display: flex; align-items: center; justify-content: center;
                        box-shadow: 0 10px 30px rgba(59, 130, 246, 0.3);">
              <span style="font-size: 48px;">🎉</span>
            </div>
          </div>
          
          <h2 style="color: #1e293b; margin: 20px 0; font-size: 28px; font-weight: 700; text-align: center;">
            Fast geschafft! Nur noch ein Klick...
          </h2>
          
          <p style="color: #475569; font-size: 18px; line-height: 1.7; margin: 20px 0; text-align: center;">
            Schön, dass Sie sich für <strong style="color: #1e293b;">Contract AI</strong> entschieden haben! 
            Bestätigen Sie jetzt Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren.
          </p>
          
          <div style="background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); 
                      border: 1px solid #e2e8f0; border-radius: 16px; padding: 30px; margin: 30px 0;">
            <h3 style="color: #1e293b; margin: 0 0 20px 0; font-size: 20px; font-weight: 600; text-align: center;">
              🚀 Was Sie als nächstes erwartet:
            </h3>
            
            <div style="display: grid; gap: 15px; margin-top: 20px;">
              <div style="display: flex; align-items: center; gap: 15px; padding: 15px; 
                          background: white; border-radius: 12px; border: 1px solid #e5e7eb;">
                <div style="background: linear-gradient(135deg, #10b981, #059669); 
                           width: 40px; height: 40px; border-radius: 10px; 
                           display: flex; align-items: center; justify-content: center;
                           flex-shrink: 0;">
                  <span style="font-size: 18px;">📄</span>
                </div>
                <div>
                  <div style="color: #1e293b; font-weight: 600; margin-bottom: 2px;">KI-Vertragsanalyse</div>
                  <div style="color: #6b7280; font-size: 14px;">Ihre Verträge automatisch analysieren lassen</div>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; gap: 15px; padding: 15px; 
                          background: white; border-radius: 12px; border: 1px solid #e5e7eb;">
                <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); 
                           width: 40px; height: 40px; border-radius: 10px; 
                           display: flex; align-items: center; justify-content: center;
                           flex-shrink: 0;">
                  <span style="font-size: 18px;">⏰</span>
                </div>
                <div>
                  <div style="color: #1e293b; font-weight: 600; margin-bottom: 2px;">Laufzeit-Management</div>
                  <div style="color: #6b7280; font-size: 14px;">Nie wieder wichtige Fristen verpassen</div>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; gap: 15px; padding: 15px; 
                          background: white; border-radius: 12px; border: 1px solid #e5e7eb;">
                <div style="background: linear-gradient(135deg, #f59e0b, #d97706); 
                           width: 40px; height: 40px; border-radius: 10px; 
                           display: flex; align-items: center; justify-content: center;
                           flex-shrink: 0;">
                  <span style="font-size: 18px;">💡</span>
                </div>
                <div>
                  <div style="color: #1e293b; font-weight: 600; margin-bottom: 2px;">Optimierungsvorschläge</div>
                  <div style="color: #6b7280; font-size: 14px;">Verbesserungen durch künstliche Intelligenz</div>
                </div>
              </div>
              
              <div style="display: flex; align-items: center; gap: 15px; padding: 15px; 
                          background: white; border-radius: 12px; border: 1px solid #e5e7eb;">
                <div style="background: linear-gradient(135deg, #ef4444, #dc2626); 
                           width: 40px; height: 40px; border-radius: 10px; 
                           display: flex; align-items: center; justify-content: center;
                           flex-shrink: 0;">
                  <span style="font-size: 18px;">🛡️</span>
                </div>
                <div>
                  <div style="color: #1e293b; font-weight: 600; margin-bottom: 2px;">Risiko-Scanner</div>
                  <div style="color: #6b7280; font-size: 14px;">Problematische Klauseln frühzeitig erkennen</div>
                </div>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
                        border: 1px solid #f59e0b; border-radius: 12px; padding: 20px;
                        display: inline-block; margin: 0 auto;">
              <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                <span style="font-size: 24px;">⏰</span>
                <div style="text-align: left;">
                  <div style="color: #92400e; font-weight: 700; font-size: 16px;">Dieser Link ist 24 Stunden gültig</div>
                  <div style="color: #b45309; font-size: 14px;">Jetzt bestätigen und loslegen!</div>
                </div>
              </div>
            </div>
          </div>
          
          <p style="color: #64748b; font-size: 14px; margin: 30px 0; text-align: center; line-height: 1.6;">
            Falls Sie diese E-Mail nicht angefordert haben, können Sie sie einfach ignorieren.
            Ihr Konto wird ohne Bestätigung nicht aktiviert.
          </p>
        `,
        cta: {
          text: "🚀 E-Mail-Adresse jetzt bestätigen",
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

      // ✅ WILLKOMMENS-E-MAIL senden (optional)
      try {
        const welcomeEmailHtml = generateEmailTemplate({
          title: "🎉 Herzlich Willkommen bei Contract AI!",
          preheader: "Ihr Konto ist jetzt aktiviert - lassen Sie uns loslegen!",
          body: `
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); 
                          border-radius: 20px; width: 100px; height: 100px; 
                          margin: 0 auto 30px; display: flex; align-items: center; justify-content: center;
                          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);">
                <span style="font-size: 48px;">✅</span>
              </div>
            </div>
            
            <h2 style="color: #1e293b; margin: 20px 0; font-size: 28px; font-weight: 700; text-align: center;">
              Perfekt! Ihr Konto ist jetzt aktiviert 🚀
            </h2>
            
            <p style="color: #475569; font-size: 18px; line-height: 1.7; margin: 20px 0; text-align: center;">
              <strong style="color: #1e293b;">Glückwunsch!</strong> Ihre E-Mail-Adresse wurde erfolgreich bestätigt. 
              Sie können jetzt die volle Power von Contract AI nutzen!
            </p>
            
            <div style="background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 100%); 
                        border: 1px solid #10b981; border-radius: 16px; padding: 30px; margin: 30px 0;">
              <h3 style="color: #065f46; margin: 0 0 25px 0; font-size: 20px; font-weight: 600; text-align: center;">
                🎯 Ihre nächsten Schritte:
              </h3>
              
              <div style="display: grid; gap: 15px;">
                <div style="display: flex; align-items: center; gap: 15px; padding: 20px; 
                            background: white; border-radius: 12px; border: 1px solid #a7f3d0;
                            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);">
                  <div style="background: #10b981; color: white; 
                             width: 40px; height: 40px; border-radius: 50%; 
                             display: flex; align-items: center; justify-content: center; 
                             font-size: 18px; font-weight: bold; flex-shrink: 0;">1</div>
                  <div>
                    <div style="color: #065f46; font-weight: 600; font-size: 16px; margin-bottom: 4px;">
                      Ersten Vertrag hochladen
                    </div>
                    <div style="color: #047857; font-size: 14px;">
                      PDF einfach per Drag & Drop in Contract AI ziehen
                    </div>
                  </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 15px; padding: 20px; 
                            background: white; border-radius: 12px; border: 1px solid #a7f3d0;
                            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);">
                  <div style="background: #10b981; color: white; 
                             width: 40px; height: 40px; border-radius: 50%; 
                             display: flex; align-items: center; justify-content: center; 
                             font-size: 18px; font-weight: bold; flex-shrink: 0;">2</div>
                  <div>
                    <div style="color: #065f46; font-weight: 600; font-size: 16px; margin-bottom: 4px;">
                      KI-Analyse starten
                    </div>
                    <div style="color: #047857; font-size: 14px;">
                      Lassen Sie unsere KI Ihren Vertrag analysieren
                    </div>
                  </div>
                </div>
                
                <div style="display: flex; align-items: center; gap: 15px; padding: 20px; 
                            background: white; border-radius: 12px; border: 1px solid #a7f3d0;
                            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.1);">
                  <div style="background: #10b981; color: white; 
                             width: 40px; height: 40px; border-radius: 50%; 
                             display: flex; align-items: center; justify-content: center; 
                             font-size: 18px; font-weight: bold; flex-shrink: 0;">3</div>
                  <div>
                    <div style="color: #065f46; font-weight: 600; font-size: 16px; margin-bottom: 4px;">
                      Optimierungsvorschläge erhalten
                    </div>
                    <div style="color: #047857; font-size: 14px;">
                      Konkrete Verbesserungen für Ihre Verträge
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); 
                          border: 1px solid #3b82f6; border-radius: 12px; padding: 20px;
                          display: inline-block;">
                <div style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                  <span style="font-size: 24px;">💡</span>
                  <div style="text-align: left;">
                    <div style="color: #1e40af; font-weight: 600; font-size: 16px;">Profi-Tipp:</div>
                    <div style="color: #1d4ed8; font-size: 14px;">Probieren Sie unsere KI-Vertragsoptimierung aus!</div>
                  </div>
                </div>
              </div>
            </div>
            
            <p style="color: #64748b; font-size: 14px; margin: 20px 0; text-align: center; line-height: 1.6;">
              Bei Fragen sind wir jederzeit für Sie da: 
              <a href="mailto:support@contract-ai.de" style="color: #3b82f6; text-decoration: none; font-weight: 600;">
                support@contract-ai.de
              </a>
            </p>
          `,
          cta: {
            text: "🚀 Jetzt zum Dashboard",
            url: `${process.env.FRONTEND_URL || "https://contract-ai.de"}/dashboard`
          }
        });

        await sendEmailHtml(user.email, "Contract AI - Willkommen im Team! 🎉", welcomeEmailHtml);
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