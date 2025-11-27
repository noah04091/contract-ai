/**
 * 🧪 TEST SCRIPT: Alle E-Mail-Templates
 *
 * Sendet alle E-Mail-Templates als Test an eine angegebene Adresse.
 *
 * Usage: node test-all-emails.js <email-adresse>
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Bitte E-Mail-Adresse angeben!');
  console.error('Usage: node test-all-emails.js <email-adresse>');
  process.exit(1);
}

console.log(`\n🧪 Alle E-Mail-Templates Test an: ${testEmail}\n`);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Logo URL
const logoUrl = 'https://www.contract-ai.de/logo.png';

// ============================================
// NEUES EINHEITLICHES TEMPLATE - V4 STYLE
// ============================================
function generateEmailTemplateV4({ title, body, cta = null, preheader = '' }) {
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

  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden;">${preheader}</div>

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
      <td style="padding: 50px 20px;">

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" align="center" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

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

// ============================================
// ALLE E-MAIL TEMPLATES
// ============================================

const emails = [
  // 1. Verifizierungs-E-Mail
  {
    name: "1. Verifizierungs-E-Mail",
    subject: "🧪 [TEST] Bestätigen Sie Ihre E-Mail-Adresse – Contract AI",
    html: generateEmailTemplateV4({
      title: "Bestätigen Sie Ihre E-Mail-Adresse",
      preheader: "Nur noch ein Klick, um Ihr Konto zu aktivieren",
      body: `
        <p style="text-align: center; margin-bottom: 35px;">
          Vielen Dank für Ihre Registrierung bei Contract AI.<br>
          Klicken Sie auf den Button, um Ihr Konto zu aktivieren.
        </p>
      `,
      cta: {
        text: "E-Mail bestätigen",
        url: "https://www.contract-ai.de/verify?token=TEST"
      }
    })
  },

  // 2. Willkommens-E-Mail
  {
    name: "2. Willkommens-E-Mail",
    subject: "🧪 [TEST] Willkommen bei Contract AI",
    html: generateEmailTemplateV4({
      title: "Willkommen bei Contract AI",
      preheader: "Ihr Konto ist jetzt aktiv",
      body: `
        <p style="text-align: center; margin-bottom: 30px;">
          Ihr Konto ist jetzt aktiv. Entdecken Sie alle Features, die Contract AI für Sie bereithält.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom: 30px; background-color: #f8f9fa; border-radius: 16px;">
          <tr><td style="padding: 14px 20px; border-bottom: 1px solid #ffffff;">
            <span style="display: inline-block; width: 28px; height: 28px; background-color: #0066ff; border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px; margin-right: 12px;">📄</span>
            <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">KI-Vertragsanalyse</span>
          </td></tr>
          <tr><td style="padding: 14px 20px; border-bottom: 1px solid #ffffff;">
            <span style="display: inline-block; width: 28px; height: 28px; background-color: #00c853; border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px; margin-right: 12px;">🛡️</span>
            <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">Risiko-Scanner</span>
          </td></tr>
          <tr><td style="padding: 14px 20px; border-bottom: 1px solid #ffffff;">
            <span style="display: inline-block; width: 28px; height: 28px; background-color: #ff9500; border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px; margin-right: 12px;">📅</span>
            <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">Fristenkalender</span>
          </td></tr>
          <tr><td style="padding: 14px 20px; border-bottom: 1px solid #ffffff;">
            <span style="display: inline-block; width: 28px; height: 28px; background-color: #af52de; border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px; margin-right: 12px;">✨</span>
            <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">Vertragsoptimierer</span>
          </td></tr>
          <tr><td style="padding: 14px 20px; border-bottom: 1px solid #ffffff;">
            <span style="display: inline-block; width: 28px; height: 28px; background-color: #ff3b30; border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px; margin-right: 12px;">⚖️</span>
            <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">Vertragsvergleich</span>
          </td></tr>
          <tr><td style="padding: 14px 20px; border-bottom: 1px solid #ffffff;">
            <span style="display: inline-block; width: 28px; height: 28px; background-color: #5856d6; border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px; margin-right: 12px;">💬</span>
            <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">KI-Chat</span>
          </td></tr>
          <tr><td style="padding: 14px 20px; border-bottom: 1px solid #ffffff;">
            <span style="display: inline-block; width: 28px; height: 28px; background-color: #34c759; border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px; margin-right: 12px;">📝</span>
            <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">Vertragsgenerator</span>
          </td></tr>
          <tr><td style="padding: 14px 20px;">
            <span style="display: inline-block; width: 28px; height: 28px; background-color: #007aff; border-radius: 8px; text-align: center; line-height: 28px; font-size: 14px; margin-right: 12px;">📰</span>
            <span style="color: #1a1a1a; font-size: 15px; font-weight: 600;">Legal Pulse</span>
          </td></tr>
        </table>
      `,
      cta: {
        text: "Zum Dashboard",
        url: "https://www.contract-ai.de/dashboard"
      }
    })
  },

  // 3. Beta-Reminder Tag 2
  {
    name: "3. Beta-Reminder (Tag 2)",
    subject: "🧪 [TEST] 🎁 Wie gefällt dir Contract AI?",
    html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
    <tr><td style="padding: 50px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" align="center" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
        <tr><td style="padding: 45px 50px 35px 50px; text-align: center; border-bottom: 1px solid #f0f0f0;">
          <img src="${logoUrl}" alt="Contract AI" width="220" style="display: block; margin: 0 auto;">
        </td></tr>
        <tr><td style="background-color: #fff3ed; padding: 30px; text-align: center; border-bottom: 3px solid #ff6b35;">
          <h1 style="margin: 0; font-size: 24px; color: #1d1d1f;">🎁 Wie gefällt dir Contract AI?</h1>
        </td></tr>
        <tr><td style="padding: 35px 50px 50px 50px;">
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Hallo!</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Du hast dich vor 2 Tagen als <strong>Beta-Tester</strong> bei Contract AI registriert – vielen Dank dafür! 🙏</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Wir haben dir <strong>3 Monate kostenlosen Premium-Zugang</strong> freigeschaltet. Dafür würden wir uns sehr über dein ehrliches Feedback freuen!</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.contract-ai.de/beta#feedback" style="display: inline-block; background-color: #007aff; color: #ffffff !important; padding: 16px 40px; border-radius: 100px; font-size: 18px; font-weight: 600; text-decoration: none;">Jetzt Feedback geben</a>
          </div>
          <p style="font-size: 14px; color: #666; text-align: center;">Dauert nur 2 Minuten – versprochen! ⏱️</p>
        </td></tr>
        <tr><td style="background-color: #fafafa; padding: 28px 50px; text-align: center; border-top: 1px solid #f0f0f0;">
          <p style="margin: 0; font-size: 13px; color: #999999;">© 2025 Contract AI. Alle Rechte vorbehalten.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `
  },

  // 4. Beta-Reminder Tag 4
  {
    name: "4. Beta-Reminder (Tag 4)",
    subject: "🧪 [TEST] 💬 Kurze Frage: Wie findest du Contract AI?",
    html: `
<!DOCTYPE html>
<html lang="de">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
    <tr><td style="padding: 50px 20px;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" align="center" style="background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">
        <tr><td style="padding: 45px 50px 35px 50px; text-align: center; border-bottom: 1px solid #f0f0f0;">
          <img src="${logoUrl}" alt="Contract AI" width="220" style="display: block; margin: 0 auto;">
        </td></tr>
        <tr><td style="background-color: #f0f0ff; padding: 30px; text-align: center; border-bottom: 3px solid #667eea;">
          <h1 style="margin: 0; font-size: 24px; color: #1d1d1f;">💬 Kurz 2 Minuten Zeit?</h1>
        </td></tr>
        <tr><td style="padding: 35px 50px 50px 50px;">
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Hallo nochmal!</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Ich wollte mich nur kurz melden – du nutzt Contract AI jetzt seit ein paar Tagen und ich würde mich riesig über deine Meinung freuen.</p>
          <p style="font-size: 16px; color: #333; line-height: 1.6;">Als kleines Ein-Mann-Startup ist <strong>jedes einzelne Feedback Gold wert</strong> für mich.</p>
          <div style="background-color: #ffffff; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid #667eea;">
            <p style="font-size: 15px; color: #333; margin: 0;"><strong>Was mich interessiert:</strong><br>• Wie hilfreich war die Vertragsanalyse?<br>• Was hat dir gefallen / was nicht?<br>• Würdest du Contract AI weiterempfehlen?</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://www.contract-ai.de/beta#feedback" style="display: inline-block; background-color: #667eea; color: #ffffff !important; padding: 16px 40px; border-radius: 100px; font-size: 18px; font-weight: 600; text-decoration: none;">Feedback geben (2 Min.)</a>
          </div>
          <p style="font-size: 15px; color: #555; text-align: center;">Vielen Dank! 🙏<br><em>– Noah, Gründer von Contract AI</em></p>
        </td></tr>
        <tr><td style="background-color: #fafafa; padding: 28px 50px; text-align: center; border-top: 1px solid #f0f0f0;">
          <p style="margin: 0; font-size: 13px; color: #999999;">© 2025 Contract AI. Alle Rechte vorbehalten.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
    `
  },

  // 5. Kündigungsbestätigung
  {
    name: "5. Kündigungsbestätigung",
    subject: "🧪 [TEST] ✅ Kündigungsbestätigung: Telekom Mobilfunk",
    html: generateEmailTemplateV4({
      title: "Kündigung erfolgreich versendet",
      preheader: "Ihre Kündigung wurde an den Anbieter gesendet",
      body: `
        <div style="background-color: #ecfdf5; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
          <span style="font-size: 48px;">✅</span>
          <p style="color: #065f46; font-size: 18px; font-weight: 600; margin: 10px 0 0 0;">Kündigung erfolgreich!</p>
        </div>

        <p style="text-align: center; margin-bottom: 25px;">
          Ihre Kündigung für <strong>Telekom Mobilfunk</strong> wurde soeben an den Anbieter gesendet.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
          <tr><td style="padding: 20px;">
            <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>📅 Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
            <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>📧 Gesendet an:</strong> kuendigung@telekom.de</p>
            <p style="margin: 0; font-size: 14px;"><strong>🆔 Referenz:</strong> KND-2025-001234</p>
          </td></tr>
        </table>

        <p style="font-size: 14px; color: #666; text-align: center;">
          <strong>Tipp:</strong> Bewahren Sie diese E-Mail als Nachweis auf.
        </p>
      `,
      cta: {
        text: "Kündigungen verwalten",
        url: "https://www.contract-ai.de/cancellations"
      }
    })
  },

  // 6. Fristenerinnerung - Warnung
  {
    name: "6. Fristenerinnerung (Warnung)",
    subject: "🧪 [TEST] ⚠️ Nur noch 14 Tage: Vodafone Mobilfunk",
    html: generateEmailTemplateV4({
      title: "Wichtige Fristenerinnerung",
      preheader: "Kündigungsfrist endet bald",
      body: `
        <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 0 12px 12px 0; padding: 20px; margin-bottom: 25px;">
          <p style="color: #92400e; font-size: 18px; font-weight: 600; margin: 0;">
            ⚠️ In <strong>14 Tagen</strong> endet die Kündigungsfrist!
          </p>
        </div>

        <p style="text-align: center; margin-bottom: 25px;">
          Die Kündigungsfrist für <strong>Vodafone Mobilfunk</strong> endet bald.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin-bottom: 25px;">
          <tr><td style="padding: 20px;">
            <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>📅 Heute:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
            <p style="margin: 0 0 10px 0; font-size: 14px;"><strong>🔔 Frist endet:</strong> in 14 Tagen</p>
            <p style="margin: 0; font-size: 14px;"><strong>📍 Anbieter:</strong> Vodafone</p>
          </td></tr>
        </table>

        <p style="font-size: 14px; color: #666; text-align: center;">
          Verpassen Sie nicht die Chance zu kündigen!
        </p>
      `,
      cta: {
        text: "Jetzt kündigen",
        url: "https://www.contract-ai.de/cancel/123"
      }
    })
  },

  // 7. Fristenerinnerung - Kritisch (letzter Tag)
  {
    name: "7. Fristenerinnerung (KRITISCH)",
    subject: "🧪 [TEST] 🚨 LETZTE CHANCE: O2 DSL heute kündigen!",
    html: generateEmailTemplateV4({
      title: "LETZTE CHANCE",
      preheader: "Heute ist der letzte Tag zum Kündigen!",
      body: `
        <div style="background-color: #fef2f2; border: 2px solid #ef4444; border-radius: 12px; padding: 25px; margin-bottom: 25px; text-align: center;">
          <span style="font-size: 48px;">🚨</span>
          <p style="color: #dc2626; font-size: 20px; font-weight: 700; margin: 10px 0 0 0;">
            HEUTE ist der letzte Tag!
          </p>
        </div>

        <p style="text-align: center; font-size: 18px; margin-bottom: 25px;">
          <strong>O2 DSL</strong> muss HEUTE gekündigt werden!
        </p>

        <div style="background-color: #fef2f2; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <p style="color: #991b1b; font-size: 15px; margin: 0;">
            <strong>⚠️ Was passiert, wenn Sie nicht handeln:</strong><br>
            • Der Vertrag verlängert sich automatisch um 12 Monate<br>
            • Sie sind weitere 12 Monate gebunden<br>
            • Die nächste Kündigungsmöglichkeit ist erst in 12 Monaten
          </p>
        </div>
      `,
      cta: {
        text: "⚡ SOFORT KÜNDIGEN",
        url: "https://www.contract-ai.de/cancel/456?urgent=true"
      }
    })
  },

  // 8. Passwort zurücksetzen
  {
    name: "8. Passwort zurücksetzen",
    subject: "🧪 [TEST] Passwort zurücksetzen – Contract AI",
    html: generateEmailTemplateV4({
      title: "Passwort zurücksetzen",
      preheader: "Sie haben eine Passwort-Zurücksetzung angefordert",
      body: `
        <p style="text-align: center; margin-bottom: 35px;">
          Sie haben angefordert, Ihr Passwort zurückzusetzen.<br>
          Klicken Sie auf den Button unten, um ein neues Passwort festzulegen.
        </p>

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 12px; margin: 25px 0;">
          <tr><td style="padding: 20px; text-align: center;">
            <p style="margin: 0; font-size: 14px; color: #666;">
              <strong>⏰ Gültig für:</strong> 1 Stunde<br>
              Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.
            </p>
          </td></tr>
        </table>
      `,
      cta: {
        text: "Neues Passwort festlegen",
        url: "https://www.contract-ai.de/reset-password?token=TEST"
      }
    })
  },

  // 9. Legal Pulse Digest
  {
    name: "9. Legal Pulse Digest",
    subject: "🧪 [TEST] 📰 Ihre wöchentlichen Rechts-News",
    html: generateEmailTemplateV4({
      title: "Ihre wöchentlichen Rechts-News",
      preheader: "Neue relevante Rechtsentwicklungen für Sie",
      body: `
        <p style="text-align: center; margin-bottom: 30px;">
          Hier sind die wichtigsten Rechtsentwicklungen der letzten Woche, die für Ihre Verträge relevant sein könnten.
        </p>

        <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <p style="font-size: 12px; color: #0066ff; font-weight: 600; margin: 0 0 8px 0;">VERBRAUCHERSCHUTZ</p>
          <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #1a1a1a;">Neues Widerrufsrecht bei Online-Verträgen</h3>
          <p style="font-size: 14px; color: #666; margin: 0;">Änderungen beim Widerrufsrecht betreffen alle Online-Vertragsabschlüsse ab Januar 2025...</p>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
          <p style="font-size: 12px; color: #00c853; font-weight: 600; margin: 0 0 8px 0;">MIETRECHT</p>
          <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #1a1a1a;">BGH-Urteil zu Mietpreisbremse</h3>
          <p style="font-size: 14px; color: #666; margin: 0;">Der BGH hat die Rechte von Mietern bei überhöhten Mieten gestärkt...</p>
        </div>

        <div style="border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
          <p style="font-size: 12px; color: #ff9500; font-weight: 600; margin: 0 0 8px 0;">ARBEITSRECHT</p>
          <h3 style="margin: 0 0 10px 0; font-size: 18px; color: #1a1a1a;">Neue Regelungen für Home-Office</h3>
          <p style="font-size: 14px; color: #666; margin: 0;">Arbeitgeber müssen künftig bestimmte Voraussetzungen für Home-Office erfüllen...</p>
        </div>
      `,
      cta: {
        text: "Alle News lesen",
        url: "https://www.contract-ai.de/legal-pulse"
      }
    })
  }
];

async function sendAllTestEmails() {
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

      // Kurze Pause zwischen E-Mails
      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`\n🎉 Alle ${emails.length} E-Mails erfolgreich gesendet!`);
    console.log(`📬 Prüfe dein Postfach: ${testEmail}`);
    console.log('\n📝 Gesendete E-Mails:');
    emails.forEach((e, i) => console.log(`   ${i + 1}. ${e.name}`));

  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }

  process.exit(0);
}

sendAllTestEmails();
