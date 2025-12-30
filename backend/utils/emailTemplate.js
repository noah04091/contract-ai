// 📁 backend/utils/emailTemplate.js
// ✅ V7 Design - EXAKT wie clean3 Template (100% Spam-sicher)
// WICHTIG: Keine hidden divs, keine title tags, keine max-width

// Import Unsubscribe-Service (optional, für dynamische URLs)
let generateUnsubscribeUrl;
try {
  const unsubService = require('../services/emailUnsubscribeService');
  generateUnsubscribeUrl = unsubService.generateUnsubscribeUrl;
} catch (e) {
  // Fallback wenn Service nicht verfügbar
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

  // CTA Button HTML (exakt wie clean3)
  const ctaHtml = cta ? `
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #3b82f6; border-radius: 8px;">
                    <a href="${cta.url}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600;">
                      ${cta.text}
                    </a>
                  </td>
                </tr>
              </table>
  ` : '';

  // Unsubscribe Footer (DSGVO-konform)
  const unsubscribeHtml = recipientEmail ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 20px;">
                <tr>
                  <td style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center;">
                    <p style="margin: 0; font-size: 11px; color: #9ca3af;">
                      Diese E-Mail wurde an ${recipientEmail} gesendet.<br>
                      <a href="${actualUnsubscribeUrl}" style="color: #64748b; text-decoration: underline;">Von Benachrichtigungen abmelden</a>
                    </p>
                  </td>
                </tr>
              </table>
  ` : '';

  // Template EXAKT wie clean3 - ohne hidden divs, ohne title tag
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f0f4f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0f4f8; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden;">

          <!-- Blauer Akzent-Streifen oben -->
          <tr>
            <td style="height: 4px; background-color: #3b82f6;"></td>
          </tr>

          <!-- Header -->
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

          <!-- Trennlinie (als Table, nicht div!) -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="border-bottom: 1px solid #e2e8f0;"></td></tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px 40px 40px;">
              <h1 style="margin: 0 0 8px 0; font-size: 24px; color: #0f172a; font-weight: 700; line-height: 1.3;">
                ${title}
              </h1>

              <div style="font-size: 15px; line-height: 1.7; color: #334155; margin-top: 16px;">
                ${body}
              </div>

              <div style="margin-top: 28px;">
                ${ctaHtml}
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 0 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr><td style="border-top: 1px solid #e2e8f0;"></td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 28px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1e293b;">Contract AI</p>
                    <p style="margin: 0 0 12px 0; font-size: 13px; color: #64748b; line-height: 1.5;">
                      Intelligentes Vertragsmanagement
                    </p>
                    <p style="margin: 0; font-size: 12px;">
                      <a href="https://www.contract-ai.de" style="color: #3b82f6; text-decoration: none; font-weight: 500;">Website</a>
                      <span style="color: #cbd5e1; margin: 0 10px;">|</span>
                      <a href="https://www.contract-ai.de/datenschutz" style="color: #64748b; text-decoration: none;">Datenschutz</a>
                      <span style="color: #cbd5e1; margin: 0 10px;">|</span>
                      <a href="https://www.contract-ai.de/impressum" style="color: #64748b; text-decoration: none;">Impressum</a>
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
 * Generiert eine Info-Box mit linkem blauen Akzent (exakt wie clean3)
 */
function generateInfoBox(items) {
  if (!items || items.length === 0) return '';

  const itemsHtml = items.map((item, index) => {
    const borderTop = index > 0 ? 'border-top: 1px solid #e2e8f0; padding-top: 16px;' : '';
    const paddingBottom = index < items.length - 1 ? 'padding-bottom: 16px;' : '';

    return `
                            <tr>
                              <td style="${borderTop} ${paddingBottom}">
                                <p style="margin: 0 0 2px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${item.label}</p>
                                <p style="margin: 0; font-size: 17px; color: #0f172a; font-weight: 600;">${item.value}</p>
                              </td>
                            </tr>
    `;
  }).join('');

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #f8fafc; border-radius: 8px; border-left: 3px solid #3b82f6;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 20px 24px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            ${itemsHtml}
                          </table>
                        </td>
                      </tr>
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
                ${text}
              </p>
  `;
}

/**
 * Generiert eine Alert-Box (rot für kritisch, gelb für Warnung)
 */
function generateAlertBox(text, type = 'warning') {
  const colors = {
    critical: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    warning: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
    info: { bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8' },
    success: { bg: '#d1fae5', border: '#10b981', text: '#065f46' }
  };

  const c = colors[type] || colors.warning;

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
                <tr>
                  <td style="background: ${c.bg}; border-left: 4px solid ${c.border}; padding: 16px; border-radius: 0 8px 8px 0;">
                    <p style="color: ${c.text}; margin: 0; font-weight: 600;">
                      ${text}
                    </p>
                  </td>
                </tr>
              </table>
  `;
}

module.exports = {
  generateEmailTemplate,
  generateInfoBox,
  generateWarningText,
  generateAlertBox
};
