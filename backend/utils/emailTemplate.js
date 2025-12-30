// 📁 backend/utils/emailTemplate.js
// ✅ V11 - Template Literal wie clean3 (das funktioniert!)

/**
 * Generiert E-Mail HTML basierend auf dem clean3 Template
 * V11: Verwendet Template-Literal wie clean3 (das funktioniert!)
 */
function generateEmailTemplate(options) {
  const title = options.title || '';
  const body = options.body || '';
  const cta = options.cta || null;
  const badge = options.badge || 'Erinnerung';

  // CTA Button HTML
  let ctaHtml = '';
  if (cta && cta.url && cta.text) {
    ctaHtml = `
              <!-- Button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color: #3b82f6; border-radius: 8px;">
                    <a href="${cta.url}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600;">
                      ${cta.text}
                    </a>
                  </td>
                </tr>
              </table>`;
  }

  // EXAKT wie clean3 - als Template Literal!
  const html = `<!DOCTYPE html>
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

          <!-- Trennlinie -->
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

              ${body}

              ${ctaHtml}
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
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return html;
}

/**
 * Generiert eine Info-Box mit linkem blauen Akzent
 */
function generateInfoBox(items) {
  if (!items || items.length === 0) return '';

  let itemsHtml = '';
  items.forEach((item, index) => {
    const isFirst = index === 0;
    const isLast = index === items.length - 1;
    let style = '';
    if (isFirst && !isLast) style = 'padding-bottom: 16px;';
    else if (!isFirst && isLast) style = 'border-top: 1px solid #e2e8f0; padding-top: 16px;';
    else if (!isFirst && !isLast) style = 'border-top: 1px solid #e2e8f0; padding-top: 16px; padding-bottom: 16px;';

    itemsHtml += `
                            <tr>
                              <td style="${style}">
                                <p style="margin: 0 0 2px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${item.label}</p>
                                <p style="margin: 0; font-size: 17px; color: #0f172a; font-weight: 600;">${item.value}</p>
                              </td>
                            </tr>`;
  });

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
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
              </table>`;
}

/**
 * Generiert eine Alert-Box (rot für kritisch, gelb für Warnung)
 */
function generateAlertBox(text, type = 'warning') {
  const colors = {
    critical: { bg: '#fef2f2', border: '#ef4444', textColor: '#991b1b' },
    warning: { bg: '#fef3c7', border: '#f59e0b', textColor: '#92400e' },
    info: { bg: '#dbeafe', border: '#3b82f6', textColor: '#1d4ed8' },
    success: { bg: '#d1fae5', border: '#10b981', textColor: '#065f46' }
  };

  const c = colors[type] || colors.warning;

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
                <tr>
                  <td style="background: ${c.bg}; border-left: 4px solid ${c.border}; padding: 16px; border-radius: 0 8px 8px 0;">
                    <p style="color: ${c.textColor}; margin: 0; font-weight: 600;">
                      ${text}
                    </p>
                  </td>
                </tr>
              </table>`;
}

/**
 * Generiert einen Text-Absatz
 */
function generateParagraph(text, style = 'color: #374151; font-size: 16px; line-height: 1.6; margin-bottom: 16px;') {
  return `<p style="${style}">${text}</p>`;
}

module.exports = {
  generateEmailTemplate,
  generateInfoBox,
  generateAlertBox,
  generateParagraph
};
