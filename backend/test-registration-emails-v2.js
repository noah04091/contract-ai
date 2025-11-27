/**
 * 🧪 TEST SCRIPT: Registrierungs-E-Mails V2 - Minimalistisches Design
 *
 * Usage: node test-registration-emails-v2.js <email-adresse>
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Bitte E-Mail-Adresse angeben!');
  process.exit(1);
}

console.log(`\n🧪 Registrierungs-E-Mail Test V2 an: ${testEmail}\n`);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ============================================
// 1. VERIFIZIERUNGS-E-MAIL - Clean & Minimal
// ============================================
const verificationEmailHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Mail bestätigen</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f7;">
    <tr>
      <td style="padding: 60px 20px;">

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="520" align="center" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);">

          <!-- Logo & Brand -->
          <tr>
            <td style="padding: 50px 50px 30px 50px; text-align: center;">
              <div style="font-size: 32px; font-weight: 700; color: #1d1d1f; letter-spacing: -1px;">
                Contract AI
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 50px 50px 50px;">

              <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 600; color: #1d1d1f; text-align: center; line-height: 1.3;">
                Bestätigen Sie Ihre<br>E-Mail-Adresse
              </h1>

              <p style="margin: 0 0 35px 0; font-size: 17px; color: #424245; line-height: 1.6; text-align: center;">
                Willkommen bei Contract AI. Um Ihr Konto zu aktivieren, klicken Sie bitte auf den Button unten.
              </p>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <a href="https://www.contract-ai.de/verify?token=TEST-TOKEN"
                       style="display: inline-block;
                              background-color: #007aff;
                              color: #ffffff !important;
                              padding: 16px 48px;
                              border-radius: 12px;
                              font-size: 17px;
                              font-weight: 600;
                              text-decoration: none;">
                      E-Mail bestätigen
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 35px 0 0 0; font-size: 14px; color: #86868b; line-height: 1.6; text-align: center;">
                Der Link ist 24 Stunden gültig.<br>
                Falls Sie diese E-Mail nicht angefordert haben, können Sie sie ignorieren.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f7; padding: 25px 50px; text-align: center; border-top: 1px solid #e8e8ed;">
              <p style="margin: 0; font-size: 13px; color: #86868b;">
                © 2025 Contract AI · <a href="https://www.contract-ai.de/datenschutz" style="color: #86868b; text-decoration: none;">Datenschutz</a> · <a href="https://www.contract-ai.de/impressum" style="color: #86868b; text-decoration: none;">Impressum</a>
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
// 2. WILLKOMMENS-E-MAIL - Clean & Minimal
// ============================================
const welcomeEmailHtml = `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Willkommen</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f7;">
    <tr>
      <td style="padding: 60px 20px;">

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="520" align="center" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0, 0, 0, 0.06);">

          <!-- Logo & Brand -->
          <tr>
            <td style="padding: 50px 50px 30px 50px; text-align: center;">
              <div style="font-size: 32px; font-weight: 700; color: #1d1d1f; letter-spacing: -1px;">
                Contract AI
              </div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 0 50px 50px 50px;">

              <h1 style="margin: 0 0 20px 0; font-size: 28px; font-weight: 600; color: #1d1d1f; text-align: center; line-height: 1.3;">
                Willkommen bei Contract AI
              </h1>

              <p style="margin: 0 0 30px 0; font-size: 17px; color: #424245; line-height: 1.6; text-align: center;">
                Ihr Konto ist jetzt aktiv. Laden Sie Ihren ersten Vertrag hoch und lassen Sie unsere KI die Arbeit machen.
              </p>

              <!-- Feature List - Minimal -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 35px;">
                <tr>
                  <td style="padding: 14px 0; border-bottom: 1px solid #f0f0f0;">
                    <span style="color: #007aff; font-size: 16px; margin-right: 12px;">✓</span>
                    <span style="color: #1d1d1f; font-size: 16px;">Verträge in Sekunden analysieren</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 0; border-bottom: 1px solid #f0f0f0;">
                    <span style="color: #007aff; font-size: 16px; margin-right: 12px;">✓</span>
                    <span style="color: #1d1d1f; font-size: 16px;">Risiken automatisch erkennen</span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 14px 0;">
                    <span style="color: #007aff; font-size: 16px; margin-right: 12px;">✓</span>
                    <span style="color: #1d1d1f; font-size: 16px;">Fristen im Blick behalten</span>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                <tr>
                  <td style="text-align: center;">
                    <a href="https://www.contract-ai.de/dashboard"
                       style="display: inline-block;
                              background-color: #007aff;
                              color: #ffffff !important;
                              padding: 16px 48px;
                              border-radius: 12px;
                              font-size: 17px;
                              font-weight: 600;
                              text-decoration: none;">
                      Zum Dashboard
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 35px 0 0 0; font-size: 14px; color: #86868b; line-height: 1.6; text-align: center;">
                Fragen? Antworten Sie einfach auf diese E-Mail.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f5f5f7; padding: 25px 50px; text-align: center; border-top: 1px solid #e8e8ed;">
              <p style="margin: 0; font-size: 13px; color: #86868b;">
                © 2025 Contract AI · <a href="https://www.contract-ai.de/datenschutz" style="color: #86868b; text-decoration: none;">Datenschutz</a> · <a href="https://www.contract-ai.de/impressum" style="color: #86868b; text-decoration: none;">Impressum</a>
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
    console.log('📧 Sende Verifizierungs-E-Mail (V2 - Minimal)...');
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
      to: testEmail,
      subject: "🧪 [TEST V2] Bestätigen Sie Ihre E-Mail-Adresse",
      html: verificationEmailHtml,
    });
    console.log('✅ Verifizierungs-E-Mail gesendet!\n');

    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Willkommens-E-Mail
    console.log('📧 Sende Willkommens-E-Mail (V2 - Minimal)...');
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
      to: testEmail,
      subject: "🧪 [TEST V2] Willkommen bei Contract AI",
      html: welcomeEmailHtml,
    });
    console.log('✅ Willkommens-E-Mail gesendet!\n');

    console.log('🎉 V2 E-Mails erfolgreich gesendet!');
    console.log(`📬 Prüfe dein Postfach: ${testEmail}`);

  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }

  process.exit(0);
}

sendTestEmails();
