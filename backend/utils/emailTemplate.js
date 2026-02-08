// 📁 backend/utils/emailTemplate.js
// ✅ Clean3 Design - Das Template das 100% im Postfach landet

const logoUrl = 'https://www.contract-ai.de/logo.png';

function generateEmailTemplate({
  title,
  body,
  preheader = '',
  cta = null,
  badge = null,
  centerContent = false, // 🆕 Option für zentrierte Überschrift & Button (z.B. Verifizierungs-E-Mail)
  unsubscribeUrl = null  // 🆕 GDPR: Unsubscribe-Link (Pflicht für Marketing-Emails)
}) {

  // 🆕 Zentrierter CTA-Button wenn centerContent=true
  const ctaHtml = cta ? `
              <table cellpadding="0" cellspacing="0" style="margin-top: 28px;${centerContent ? ' margin-left: auto; margin-right: auto;' : ''}">
                <tr>
                  <td style="background-color: #3b82f6; border-radius: 8px;">
                    <a href="${cta.url}" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 600;">
                      ${cta.text}
                    </a>
                  </td>
                </tr>
              </table>` : '';

  const badgeHtml = badge ? `
                  <td align="right">
                    <span style="display: inline-block; padding: 6px 12px; background-color: #dbeafe; color: #1d4ed8; font-size: 11px; font-weight: 600; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px;">${badge}</span>
                  </td>` : '<td></td>';

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
                    <img src="${logoUrl}" alt="Contract AI" style="height: 32px; max-width: 180px;">
                  </td>
                  ${badgeHtml}
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
              <h1 style="margin: 0 0 24px 0; font-size: 24px; color: #0f172a; font-weight: 700; line-height: 1.3;${centerContent ? ' text-align: center;' : ''}">
                ${title}
              </h1>

              <div style="font-size: 15px; line-height: 1.7; color: #334155;">
                ${body}
              </div>

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
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #64748b;">
                © ${new Date().getFullYear()} Contract AI. Alle Rechte vorbehalten.
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="https://www.contract-ai.de" style="color: #3b82f6; text-decoration: none;">Website</a>
                <span style="color: #cbd5e1; margin: 0 10px;">|</span>
                <a href="https://www.contract-ai.de/datenschutz" style="color: #64748b; text-decoration: none;">Datenschutz</a>
                <span style="color: #cbd5e1; margin: 0 10px;">|</span>
                <a href="https://www.contract-ai.de/impressum" style="color: #64748b; text-decoration: none;">Impressum</a>
                ${unsubscribeUrl ? `<span style="color: #cbd5e1; margin: 0 10px;">|</span>
                <a href="${unsubscribeUrl}" style="color: #64748b; text-decoration: none;">Benachrichtigungen abmelden</a>` : ''}
              </p>
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
 * Info-Box mit linkem Akzent (Clean3 Style)
 */
function generateInfoBox(items, options = {}) {
  if (!items || items.length === 0) return '';

  const { title = null } = options;

  const titleHtml = title ? `<p style="margin: 0 0 16px 0; font-size: 14px; font-weight: 600; color: #0f172a;">${title}</p>` : '';

  const itemsHtml = items.map((item, i) => {
    const borderTop = i > 0 ? 'border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 12px;' : '';
    return `
                            <tr>
                              <td style="${borderTop}">
                                <p style="margin: 0 0 2px 0; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${item.label}</p>
                                <p style="margin: 0; font-size: 16px; color: #0f172a; font-weight: 600;">${item.value}</p>
                              </td>
                            </tr>`;
  }).join('');

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #f8fafc; border-radius: 8px; border-left: 3px solid #3b82f6;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding: 20px 24px;">
                          ${titleHtml}
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
 * Alert-Box (Clean3 Style)
 */
function generateAlertBox(text, type = 'warning') {
  const styles = {
    critical: { bg: '#fef2f2', border: '#ef4444', color: '#991b1b' },
    warning: { bg: '#fef3c7', border: '#f59e0b', color: '#92400e' },
    info: { bg: '#eff6ff', border: '#3b82f6', color: '#1e40af' },
    success: { bg: '#f0fdf4', border: '#22c55e', color: '#166534' }
  };

  const s = styles[type] || styles.warning;

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0;">
                <tr>
                  <td style="background-color: ${s.bg}; border-radius: 8px; border-left: 3px solid ${s.border}; padding: 16px 20px;">
                    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: ${s.color};">
                      ${text}
                    </p>
                  </td>
                </tr>
              </table>`;
}

/**
 * Stats Row (Clean3 Style)
 */
function generateStatsRow(stats) {
  const width = Math.floor(100 / stats.length);
  const statsHtml = stats.map(stat => `
                <td width="${width}%" style="text-align: center; padding: 16px;">
                  <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 700; color: ${stat.color || '#0f172a'};">${stat.value}</p>
                  <p style="margin: 0; font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px;">${stat.label}</p>
                </td>`).join('');

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 20px 0; background-color: #f8fafc; border-radius: 8px;">
                <tr>
                  ${statsHtml}
                </tr>
              </table>`;
}

/**
 * Action Box mit nummerierter Liste
 */
function generateActionBox(items, options = {}) {
  const { icon = '', title = 'Empfohlene Aktionen' } = options;

  const itemsHtml = items.map(item => `<li style="padding: 4px 0;">${item}</li>`).join('');

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #f0f9ff; border-radius: 8px; padding: 20px 24px;">
                    <p style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #0369a1;">${icon} ${title}</p>
                    <ol style="margin: 0; padding-left: 20px; color: #334155; line-height: 1.8;">
                      ${itemsHtml}
                    </ol>
                  </td>
                </tr>
              </table>`;
}

/**
 * Event Card
 */
function generateEventCard(options) {
  const { title, subtitle, badge, badgeColor = 'blue', icon = '' } = options;

  const badgeColors = {
    critical: { bg: '#fef2f2', text: '#dc2626' },
    warning: { bg: '#fef3c7', text: '#d97706' },
    info: { bg: '#eff6ff', text: '#2563eb' },
    success: { bg: '#f0fdf4', text: '#16a34a' },
    blue: { bg: '#eff6ff', text: '#2563eb' }
  };

  const bc = badgeColors[badgeColor] || badgeColors.blue;

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 12px 0;">
                <tr>
                  <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top;">
                          <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #0f172a;">${icon} ${title}</p>
                          <p style="margin: 0; font-size: 13px; color: #64748b;">${subtitle}</p>
                        </td>
                        <td style="vertical-align: top; text-align: right; width: 100px;">
                          <span style="display: inline-block; padding: 4px 10px; background-color: ${bc.bg}; color: ${bc.text}; font-size: 11px; font-weight: 600; border-radius: 4px;">${badge}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`;
}

/**
 * Paragraph Helper
 */
function generateParagraph(text, options = {}) {
  const { centered = false, muted = false } = options;
  const color = muted ? '#64748b' : '#334155';
  const fontSize = muted ? '13px' : '15px';
  const textAlign = centered ? 'text-align: center;' : '';

  return `<p style="margin: 0 0 16px 0; font-size: ${fontSize}; color: ${color}; line-height: 1.7; ${textAlign}">${text}</p>`;
}

/**
 * Divider
 */
function generateDivider() {
  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr><td style="border-top: 1px solid #e2e8f0;"></td></tr>
              </table>`;
}

module.exports = {
  generateEmailTemplate,
  generateInfoBox,
  generateAlertBox,
  generateStatsRow,
  generateActionBox,
  generateEventCard,
  generateParagraph,
  generateDivider,
  logoUrl
};
