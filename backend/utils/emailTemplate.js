// 📁 backend/utils/emailTemplate.js
// ✅ V6 Design - Clean3 Style (Spam-sicher + Professionell)

// Import Unsubscribe-Service (optional, fuer dynamische URLs)
let generateUnsubscribeUrl;
try {
  const unsubService = require('../services/emailUnsubscribeService');
  generateUnsubscribeUrl = unsubService.generateUnsubscribeUrl;
} catch (e) {
  // Fallback wenn Service nicht verfuegbar
  generateUnsubscribeUrl = () => 'https://www.contract-ai.de/abmelden';
}

function generateEmailTemplate({
  title,
  body,
  preheader = '',
  cta = null,
  recipientEmail = null,
  emailCategory = 'calendar',
  unsubscribeUrl = null,
  badge = 'Erinnerung'
}) {
  // Generiere dynamische Unsubscribe-URL wenn E-Mail bekannt
  const actualUnsubscribeUrl = unsubscribeUrl ||
    (recipientEmail ? generateUnsubscribeUrl(recipientEmail, emailCategory) : 'https://www.contract-ai.de/abmelden');

  // CTA Button HTML
  const ctaHtml = cta ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 28px;">
                <tr>
                  <td>
                    <a href="${cta.url}" style="display: inline-block; padding: 14px 32px; background-color: #3b82f6; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">${cta.text}</a>
                  </td>
                </tr>
              </table>
  ` : '';

  // Unsubscribe Footer (DSGVO-konform)
  const unsubscribeHtml = recipientEmail ? `
              <!-- Unsubscribe -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
                <tr>
                  <td style="text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                      Diese E-Mail wurde an ${recipientEmail} gesendet.<br>
                      <a href="${actualUnsubscribeUrl}" style="color: #6b7280; text-decoration: underline;">Von Benachrichtigungen abmelden</a>
                    </p>
                  </td>
                </tr>
              </table>
  ` : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">

  <!-- Preheader -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all;">${preheader || title}</div>

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden;">

          <!-- Blauer Akzent-Streifen oben -->
          <tr>
            <td style="height: 4px; background-color: #3b82f6;"></td>
          </tr>

          <!-- Header mit Logo-Text und Badge -->
          <tr>
            <td style="padding: 28px 40px 24px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size: 22px; font-weight: 700; color: #1e293b; letter-spacing: -0.5px;">Contract AI</span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 6px 12px; background-color: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 600; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${badge}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Trennlinie -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background-color: #e5e7eb;"></div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 32px 40px 40px 40px;">

              <!-- Titel -->
              <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 700; color: #1e293b; line-height: 1.3;">
                ${title}
              </h1>

              <!-- Body Content -->
              <div style="font-size: 15px; color: #4b5563; line-height: 1.6; margin-top: 16px;">
                ${body}
              </div>

              ${ctaHtml}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px 28px 40px; background-color: #f8fafc; border-top: 1px solid #e5e7eb;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600; color: #1e293b;">Contract AI</p>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #6b7280;">Intelligentes Vertragsmanagement</p>
                    <p style="margin: 0; font-size: 12px;">
                      <a href="https://www.contract-ai.de" style="color: #3b82f6; text-decoration: none;">Website</a>
                      <span style="color: #d1d5db; margin: 0 8px;">|</span>
                      <a href="https://www.contract-ai.de/datenschutz" style="color: #6b7280; text-decoration: none;">Datenschutz</a>
                      <span style="color: #d1d5db; margin: 0 8px;">|</span>
                      <a href="https://www.contract-ai.de/impressum" style="color: #6b7280; text-decoration: none;">Impressum</a>
                    </p>
                  </td>
                </tr>
              </table>
              ${unsubscribeHtml}
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Generiert eine Info-Box mit linkem blauen Akzent
 * Nutzbar im body-Parameter
 */
function generateInfoBox(items) {
  if (!items || items.length === 0) return '';

  const itemsHtml = items.map(item => `
                    <tr>
                      <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 2px 0; font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">${item.label}</p>
                        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #1e293b;">${item.value}</p>
                      </td>
                    </tr>
  `).join('');

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #f8fafc; border-radius: 8px; border-left: 3px solid #3b82f6; padding: 4px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      ${itemsHtml}
                    </table>
                  </td>
                </tr>
              </table>
  `;
}

/**
 * Generiert eine Warnung/Hinweis-Box
 */
function generateWarningText(text) {
  return `
              <p style="margin: 20px 0 0 0; padding: 12px 16px; background-color: #fef3c7; border-radius: 6px; font-size: 13px; color: #92400e;">
                ⚠️ ${text}
              </p>
  `;
}

module.exports = {
  generateEmailTemplate,
  generateInfoBox,
  generateWarningText
};
