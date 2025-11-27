/**
 * 🧪 TEST SCRIPT: Registrierungs-E-Mails
 *
 * Sendet die Verifizierungs- und Willkommens-E-Mails als Test an eine angegebene Adresse.
 *
 * Usage: node test-registration-emails.js <email-adresse>
 * Beispiel: node test-registration-emails.js noah@example.com
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Bitte E-Mail-Adresse angeben!');
  console.error('Usage: node test-registration-emails.js <email-adresse>');
  process.exit(1);
}

console.log(`\n🧪 Registrierungs-E-Mail Test an: ${testEmail}\n`);

// E-Mail Transporter erstellen
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Central Email Template (wie in emailTemplate.js)
function generateEmailTemplate({ title, preheader, body, cta }) {
  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    /* Reset */
    body, table, td, p, a, li { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; }

    @media screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 0 !important; }
      .content { padding: 20px !important; }
      .button { padding: 14px 30px !important; font-size: 16px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <!-- Preheader Text -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">
    ${preheader}
  </div>

  <!-- Email Container -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f7;">
    <tr>
      <td style="padding: 40px 20px;">

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" align="center" class="container" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color: #1d1d1f; padding: 35px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700; letter-spacing: -0.5px;">
                ${title}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td class="content" style="padding: 40px;">
              ${body}

              ${cta ? `
              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="padding: 30px 0; text-align: center;">
                    <a href="${cta.url}"
                       class="button"
                       style="display: inline-block;
                              background-color: #ffffff;
                              color: #007aff !important;
                              padding: 18px 45px;
                              border-radius: 100px;
                              font-size: 18px;
                              font-weight: 600;
                              text-decoration: none;
                              border: 2px solid #007aff;
                              transition: all 0.2s ease;">
                      ${cta.text}
                    </a>
                  </td>
                </tr>
              </table>
              ` : ''}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f7; padding: 30px 40px; text-align: center; border-top: 1px solid #e5e5e5;">
              <p style="margin: 0 0 10px 0; color: #86868b; font-size: 14px;">
                © ${new Date().getFullYear()} Contract AI. Alle Rechte vorbehalten.
              </p>
              <p style="margin: 0; color: #86868b; font-size: 12px;">
                <a href="https://www.contract-ai.de/datenschutz" style="color: #86868b; text-decoration: underline;">Datenschutz</a>
                &nbsp;|&nbsp;
                <a href="https://www.contract-ai.de/impressum" style="color: #86868b; text-decoration: underline;">Impressum</a>
              </p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>

</body>
</html>
  `;
}

// 1. VERIFIZIERUNGS-E-MAIL
const verificationEmailHtml = generateEmailTemplate({
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

    <div style="text-align: center; margin: 40px 0;">
      <p style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 20px;">
        🎯 Jetzt bestätigen und durchstarten!
      </p>
    </div>

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
    url: "https://www.contract-ai.de/verify?token=TEST-TOKEN-12345"
  }
});

// 2. WILLKOMMENS-E-MAIL (nach Verifizierung)
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

    <div style="text-align: center; margin: 40px 0;">
      <p style="color: #1e293b; font-size: 18px; font-weight: 600; margin-bottom: 20px;">
        🎯 Bereit loszulegen? Jetzt zum Dashboard!
      </p>
    </div>

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
    url: "https://www.contract-ai.de/dashboard"
  }
});

async function sendTestEmails() {
  try {
    // Verbindung testen
    await transporter.verify();
    console.log('✅ E-Mail-Server verbunden\n');

    // 1. Verifizierungs-E-Mail senden
    console.log('📧 Sende Verifizierungs-E-Mail...');
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
      to: testEmail,
      subject: "🧪 [TEST] Contract AI - E-Mail-Adresse bestätigen",
      html: verificationEmailHtml,
    });
    console.log('✅ Verifizierungs-E-Mail gesendet!\n');

    // Kurze Pause
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Willkommens-E-Mail senden
    console.log('📧 Sende Willkommens-E-Mail...');
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
      to: testEmail,
      subject: "🧪 [TEST] Contract AI - Willkommen im Team! 🎉",
      html: welcomeEmailHtml,
    });
    console.log('✅ Willkommens-E-Mail gesendet!\n');

    console.log('🎉 Beide Registrierungs-E-Mails erfolgreich gesendet!');
    console.log(`📬 Prüfe dein Postfach: ${testEmail}`);

  } catch (error) {
    console.error('❌ Fehler beim Senden:', error.message);
    if (error.code === 'EAUTH') {
      console.error('   → E-Mail-Zugangsdaten prüfen (EMAIL_USER, EMAIL_PASS)');
    }
    if (error.code === 'ECONNECTION') {
      console.error('   → E-Mail-Server nicht erreichbar (EMAIL_HOST, EMAIL_PORT)');
    }
  }

  process.exit(0);
}

sendTestEmails();
