/**
 * 🧪 TEST SCRIPT: Die 5 E-Mails mit V4 Design
 *
 * Usage: node test-custom-html-v4.js <email-adresse>
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Bitte E-Mail-Adresse angeben!');
  process.exit(1);
}

console.log(`\n🧪 Test: 5 E-Mails mit V4 Design an: ${testEmail}\n`);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const logoUrl = 'https://www.contract-ai.de/logo.png';

// V4 Template Generator
function v4Template({ title, body, cta = null }) {
  const ctaHtml = cta ? `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td style="text-align: center; padding: 10px 0 30px 0;">
          <a href="${cta.url}"
             style="display: inline-block;
                    background-color: #0066ff;
                    color: #ffffff !important;
                    padding: 17px 52px;
                    border-radius: 14px;
                    font-size: 16px;
                    font-weight: 600;
                    text-decoration: none;">
            <span style="color: #ffffff !important;">${cta.text}</span>
          </a>
        </td>
      </tr>
    </table>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
      <td style="padding: 50px 20px;">

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" align="center" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

          <!-- Header mit Logo -->
          <tr>
            <td style="padding: 45px 50px 35px 50px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <img src="${logoUrl}" alt="Contract AI" width="220" style="display: block; margin: 0 auto; max-width: 220px; height: auto;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 45px 50px 50px 50px;">

              <h1 style="margin: 0 0 20px 0; font-size: 26px; font-weight: 700; color: #1a1a1a; text-align: center; line-height: 1.35; letter-spacing: -0.5px;">
                ${title}
              </h1>

              <div style="font-size: 16px; color: #555555; line-height: 1.7;">
                ${body}
              </div>

              ${ctaHtml}

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
}

const emails = [
  // 1. Upload-Limit erreicht
  {
    name: "1. Upload-Limit erreicht (V4)",
    subject: "🧪 [V4 NEU] ⚠️ Email-Upload Limit erreicht",
    html: v4Template({
      title: "Upload-Limit erreicht",
      body: `
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 12px 12px 0; padding: 20px; margin-bottom: 25px;">
          <p style="color: #92400e; font-size: 16px; font-weight: 600; margin: 0;">
            ⚠️ Sie haben Ihr monatliches Limit erreicht
          </p>
        </div>

        <p style="text-align: center; margin-bottom: 25px;">
          Sie haben Ihr monatliches Limit von <strong>3 Email-Uploads</strong> erreicht.<br>
          Um weitere Verträge per Email zu importieren, upgraden Sie auf Premium.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
          <tr><td style="padding: 20px;">
            <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong>Ihr aktueller Plan:</strong> Free (3 Uploads/Monat)</p>
            <p style="margin: 0; font-size: 14px; color: #555;"><strong>Premium:</strong> 10 Uploads/Monat + alle Features</p>
          </td></tr>
        </table>
      `,
      cta: { text: "Jetzt upgraden", url: "https://www.contract-ai.de/subscribe?plan=premium" }
    })
  },

  // 2. Import erfolgreich
  {
    name: "2. Import erfolgreich (V4)",
    subject: "🧪 [V4 NEU] ✅ 3 Verträge erfolgreich importiert",
    html: v4Template({
      title: "Import erfolgreich",
      body: `
        <div style="background-color: #ecfdf5; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
          <span style="font-size: 48px;">✅</span>
          <p style="color: #065f46; font-size: 18px; font-weight: 600; margin: 10px 0 0 0;">3 Verträge importiert!</p>
        </div>

        <p style="text-align: center; margin-bottom: 25px;">
          Ihre Verträge wurden erfolgreich per Email importiert und stehen bereit zur Analyse.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
          <tr><td style="padding: 20px;">
            <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1a1a1a;">📄 Importierte Verträge:</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">• Mietvertrag_2024.pdf</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;">• Arbeitsvertrag_Mueller.pdf</p>
            <p style="margin: 0; font-size: 14px; color: #555;">• Handyvertrag_Telekom.pdf</p>
          </td></tr>
        </table>
      `,
      cta: { text: "Verträge anzeigen", url: "https://www.contract-ai.de/contracts" }
    })
  },

  // 3. Import fehlgeschlagen
  {
    name: "3. Import fehlgeschlagen (V4)",
    subject: "🧪 [V4 NEU] ⚠️ Email-Import fehlgeschlagen",
    html: v4Template({
      title: "Import fehlgeschlagen",
      body: `
        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 0 12px 12px 0; padding: 20px; margin-bottom: 25px;">
          <p style="color: #dc2626; font-size: 16px; font-weight: 600; margin: 0;">
            ❌ 2 Dateien konnten nicht verarbeitet werden
          </p>
        </div>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
          <tr><td style="padding: 20px;">
            <p style="margin: 0 0 12px 0; font-size: 15px; font-weight: 600; color: #1a1a1a;">Fehlgeschlagene Dateien:</p>
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #dc2626;">• dokument.docx – Nur PDF wird unterstützt</p>
            <p style="margin: 0; font-size: 14px; color: #dc2626;">• vertrag.pdf – Datei ist beschädigt</p>
          </td></tr>
        </table>

        <p style="font-size: 14px; color: #666; text-align: center;">
          <strong>Tipp:</strong> Stellen Sie sicher, dass Ihre Dateien im PDF-Format vorliegen.
        </p>
      `,
      cta: { text: "Erneut versuchen", url: "https://www.contract-ai.de/contracts" }
    })
  },

  // 4. Team-Einladung
  {
    name: "4. Team-Einladung (V4)",
    subject: "🧪 [V4 NEU] Einladung zum Team von Acme GmbH",
    html: v4Template({
      title: "Team-Einladung",
      body: `
        <div style="background-color: #f0f9ff; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
          <span style="font-size: 48px;">🎉</span>
          <p style="color: #0369a1; font-size: 18px; font-weight: 600; margin: 10px 0 0 0;">Sie wurden eingeladen!</p>
        </div>

        <p style="text-align: center; margin-bottom: 25px;">
          Sie wurden eingeladen, dem Team von <strong>Acme GmbH</strong> auf Contract AI beizutreten.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
          <tr><td style="padding: 20px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-size: 14px; color: #555;"><strong>Organisation:</strong> Acme GmbH</p>
            <p style="margin: 0; font-size: 14px; color: #555;"><strong>Ihre Rolle:</strong> Administrator</p>
          </td></tr>
        </table>

        <p style="font-size: 13px; color: #888; text-align: center;">
          Diese Einladung ist 7 Tage gültig.
        </p>
      `,
      cta: { text: "Einladung annehmen", url: "https://www.contract-ai.de/accept-invite/abc123" }
    })
  },

  // 5. Legal Pulse Alert
  {
    name: "5. Legal Pulse Alert (V4)",
    subject: "🧪 [V4 NEU] 🔔 Neues BGH-Urteil zu AGB-Klauseln",
    html: v4Template({
      title: "Legal Pulse Alert",
      body: `
        <div style="margin-bottom: 20px; text-align: center;">
          <span style="display: inline-block; padding: 6px 14px; background-color: #fef2f2; color: #dc2626; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
            ⚠️ HIGH Priority
          </span>
        </div>

        <h2 style="font-size: 20px; font-weight: 600; color: #1a1a1a; text-align: center; margin: 0 0 20px 0;">
          Neues BGH-Urteil zu AGB-Klauseln
        </h2>

        <p style="text-align: center; margin-bottom: 25px;">
          Der Bundesgerichtshof hat ein wichtiges Urteil zu unwirksamen AGB-Klauseln gefällt. Dies könnte Auswirkungen auf Ihre bestehenden Verträge haben.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
          <tr><td style="padding: 20px;">
            <p style="margin: 0; font-size: 14px; color: #555;">
              <strong>Betroffen:</strong> BGB §307 (Verbraucherschutz)
            </p>
          </td></tr>
        </table>
      `,
      cta: { text: "Details anzeigen", url: "https://www.contract-ai.de/legalpulse" }
    })
  }
];

async function sendTestEmails() {
  try {
    await transporter.verify();
    console.log('✅ E-Mail-Server verbunden\n');
    console.log('═'.repeat(50));

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      console.log(`\n📧 Sende ${email.name}...`);

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: testEmail,
        subject: email.subject,
        html: email.html,
      });

      console.log(`✅ ${email.name} gesendet!`);

      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`\n🎉 Alle 5 E-Mails mit V4 Design gesendet!`);
    console.log(`📬 Prüfe dein Postfach: ${testEmail}`);

  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }

  process.exit(0);
}

sendTestEmails();
