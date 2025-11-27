/**
 * 🧪 TEST SCRIPT: Registrierungs-E-Mails V3 - Professionell mit Logo
 *
 * Usage: node test-registration-emails-v3.js <email-adresse>
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Bitte E-Mail-Adresse angeben!');
  process.exit(1);
}

console.log(`\n🧪 Registrierungs-E-Mail Test V3 an: ${testEmail}\n`);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Logo URL (von deiner Website)
const logoUrl = 'https://www.contract-ai.de/logo-contractai.png';

// ============================================
// 1. VERIFIZIERUNGS-E-MAIL - Professionell
// ============================================
const verificationEmailHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Mail bestätigen</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
      <td style="padding: 50px 20px;">

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" align="center" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

          <!-- Header mit Logo -->
          <tr>
            <td style="padding: 45px 50px 35px 50px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <img src="${logoUrl}" alt="Contract AI" width="200" style="display: block; margin: 0 auto; max-width: 200px; height: auto;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 45px 50px 50px 50px;">

              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #1a1a1a; text-align: center; line-height: 1.35; letter-spacing: -0.5px;">
                Bestätigen Sie Ihre E-Mail-Adresse
              </h1>

              <p style="margin: 0 0 40px 0; font-size: 16px; color: #555555; line-height: 1.7; text-align: center;">
                Vielen Dank für Ihre Registrierung bei Contract AI.<br>
                Klicken Sie auf den Button, um Ihr Konto zu aktivieren.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <a href="https://www.contract-ai.de/verify?token=TEST-TOKEN"
                       style="display: inline-block;
                              background: linear-gradient(135deg, #0066ff 0%, #0052cc 100%);
                              color: #ffffff !important;
                              padding: 17px 52px;
                              border-radius: 14px;
                              font-size: 16px;
                              font-weight: 600;
                              text-decoration: none;
                              box-shadow: 0 4px 14px rgba(0, 102, 255, 0.35);">
                      E-Mail bestätigen
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info Box -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top: 40px;">
                <tr>
                  <td style="background-color: #f8f9fa; border-radius: 12px; padding: 20px 24px;">
                    <p style="margin: 0; font-size: 14px; color: #666666; line-height: 1.6; text-align: center;">
                      <span style="color: #0066ff;">●</span>&nbsp; Dieser Link ist <strong>24 Stunden</strong> gültig<br>
                      Falls Sie diese E-Mail nicht angefordert haben, können Sie sie ignorieren.
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 28px 50px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #999999;">
                © 2025 Contract AI. Alle Rechte vorbehalten.
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="https://www.contract-ai.de/datenschutz" style="color: #888888; text-decoration: none;">Datenschutz</a>
                <span style="color: #cccccc; margin: 0 8px;">|</span>
                <a href="https://www.contract-ai.de/impressum" style="color: #888888; text-decoration: none;">Impressum</a>
                <span style="color: #cccccc; margin: 0 8px;">|</span>
                <a href="https://www.contract-ai.de/agb" style="color: #888888; text-decoration: none;">AGB</a>
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

// ============================================
// 2. WILLKOMMENS-E-MAIL - Professionell
// ============================================
const welcomeEmailHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Willkommen bei Contract AI</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
      <td style="padding: 50px 20px;">

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" align="center" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

          <!-- Header mit Logo -->
          <tr>
            <td style="padding: 45px 50px 35px 50px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <img src="${logoUrl}" alt="Contract AI" width="200" style="display: block; margin: 0 auto; max-width: 200px; height: auto;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 45px 50px 50px 50px;">

              <h1 style="margin: 0 0 16px 0; font-size: 26px; font-weight: 700; color: #1a1a1a; text-align: center; line-height: 1.35; letter-spacing: -0.5px;">
                Willkommen bei Contract AI
              </h1>

              <p style="margin: 0 0 35px 0; font-size: 16px; color: #555555; line-height: 1.7; text-align: center;">
                Ihr Konto ist jetzt aktiv. Sie können sofort loslegen und Ihre ersten Verträge analysieren lassen.
              </p>

              <!-- Features -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 35px;">
                <tr>
                  <td style="padding: 16px 20px; background-color: #f8f9fa; border-radius: 12px 12px 0 0; border-bottom: 1px solid #ffffff;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="32" style="vertical-align: middle;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #0066ff 0%, #0052cc 100%); border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px;">📄</div>
                        </td>
                        <td style="padding-left: 14px; vertical-align: middle;">
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">KI-gestützte Vertragsanalyse</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; background-color: #f8f9fa; border-bottom: 1px solid #ffffff;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="32" style="vertical-align: middle;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #00c853 0%, #00a844 100%); border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px;">🛡️</div>
                        </td>
                        <td style="padding-left: 14px; vertical-align: middle;">
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">Automatische Risikoerkennung</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 16px 20px; background-color: #f8f9fa; border-radius: 0 0 12px 12px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                      <tr>
                        <td width="32" style="vertical-align: middle;">
                          <div style="width: 28px; height: 28px; background: linear-gradient(135deg, #ff9500 0%, #ff8000 100%); border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px;">📅</div>
                        </td>
                        <td style="padding-left: 14px; vertical-align: middle;">
                          <span style="color: #1a1a1a; font-size: 15px; font-weight: 500;">Intelligentes Fristenmanagement</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <a href="https://www.contract-ai.de/dashboard"
                       style="display: inline-block;
                              background: linear-gradient(135deg, #0066ff 0%, #0052cc 100%);
                              color: #ffffff !important;
                              padding: 17px 52px;
                              border-radius: 14px;
                              font-size: 16px;
                              font-weight: 600;
                              text-decoration: none;
                              box-shadow: 0 4px 14px rgba(0, 102, 255, 0.35);">
                      Zum Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Support Info -->
              <p style="margin: 40px 0 0 0; font-size: 14px; color: #888888; line-height: 1.6; text-align: center;">
                Haben Sie Fragen? Wir helfen gerne!<br>
                <a href="mailto:support@contract-ai.de" style="color: #0066ff; text-decoration: none; font-weight: 500;">support@contract-ai.de</a>
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #fafafa; padding: 28px 50px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #999999;">
                © 2025 Contract AI. Alle Rechte vorbehalten.
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="https://www.contract-ai.de/datenschutz" style="color: #888888; text-decoration: none;">Datenschutz</a>
                <span style="color: #cccccc; margin: 0 8px;">|</span>
                <a href="https://www.contract-ai.de/impressum" style="color: #888888; text-decoration: none;">Impressum</a>
                <span style="color: #cccccc; margin: 0 8px;">|</span>
                <a href="https://www.contract-ai.de/agb" style="color: #888888; text-decoration: none;">AGB</a>
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

async function sendTestEmails() {
  try {
    await transporter.verify();
    console.log('✅ E-Mail-Server verbunden\n');

    // 1. Verifizierungs-E-Mail
    console.log('📧 Sende Verifizierungs-E-Mail (V3 - Professionell mit Logo)...');
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
      to: testEmail,
      subject: "🧪 [TEST V3] Bestätigen Sie Ihre E-Mail-Adresse – Contract AI",
      html: verificationEmailHtml,
    });
    console.log('✅ Verifizierungs-E-Mail gesendet!\n');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Willkommens-E-Mail
    console.log('📧 Sende Willkommens-E-Mail (V3 - Professionell mit Logo)...');
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
      to: testEmail,
      subject: "🧪 [TEST V3] Willkommen bei Contract AI",
      html: welcomeEmailHtml,
    });
    console.log('✅ Willkommens-E-Mail gesendet!\n');

    console.log('🎉 V3 E-Mails erfolgreich gesendet!');
    console.log(`📬 Prüfe dein Postfach: ${testEmail}`);

  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }

  process.exit(0);
}

sendTestEmails();
