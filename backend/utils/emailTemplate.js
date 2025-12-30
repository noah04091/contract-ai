// 📁 backend/utils/emailTemplate.js
// ✅ V4 Design - Clean, Modern, Professional (OHNE hidden preheader)

const logoUrl = 'https://www.contract-ai.de/logo.png';

function generateEmailTemplate({
  title,
  body,
  preheader = '',
  cta = null,
  badge = null
}) {

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

  // Badge HTML (optional)
  const badgeHtml = badge ? `
    <div style="text-align: center; margin-bottom: 15px;">
      <span style="display: inline-block; background-color: #dbeafe; color: #1d4ed8; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
        ${badge}
      </span>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <style>
    @media screen and (max-width: 600px) {
      .email-container { width: 100% !important; }
      .content-padding { padding: 30px 25px !important; }
      .header-padding { padding: 35px 25px 25px 25px !important; }
      .footer-padding { padding: 20px 25px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f8f9fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f8f9fa;">
    <tr>
      <td style="padding: 50px 20px;">

        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="560" align="center" class="email-container" style="max-width: 560px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);">

          <!-- Header mit Logo -->
          <tr>
            <td class="header-padding" style="padding: 45px 50px 35px 50px; text-align: center; border-bottom: 1px solid #f0f0f0;">
              <img src="${logoUrl}" alt="Contract AI" width="220" style="display: block; margin: 0 auto; max-width: 220px; height: auto;">
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td class="content-padding" style="padding: 45px 50px 50px 50px;">

              ${badgeHtml}

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
            <td class="footer-padding" style="background-color: #fafafa; padding: 28px 50px; text-align: center; border-top: 1px solid #f0f0f0;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #999999;">
                © ${new Date().getFullYear()} Contract AI. Alle Rechte vorbehalten.
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
</html>`;
}

/**
 * Farbige Info-Box (wie im Original statusNotifier.js)
 * Farben: yellow, red, green, blue
 */
function generateInfoBox(items, options = {}) {
  if (!items || items.length === 0) return '';

  const { color = 'blue', icon = null, title = null } = options;

  const colors = {
    blue: { bg: '#f0f9ff', border: '#3b82f6', title: '#0369a1' },
    yellow: { bg: '#fef3c7', border: '#f59e0b', title: '#d97706' },
    red: { bg: '#fee2e2', border: '#dc2626', title: '#991b1b' },
    green: { bg: '#d1fae5', border: '#10b981', title: '#047857' }
  };

  const c = colors[color] || colors.blue;

  const titleHtml = title ? `<h3 style="color: ${c.title}; margin: 0 0 10px 0;">${icon ? icon + ' ' : ''}${title}</h3>` : '';

  const itemsHtml = items.map(item => `
    <li style="padding: 5px 0;"><strong>${item.label}:</strong> ${item.value}</li>
  `).join('');

  return `
    <div style="background: ${c.bg}; border-left: 4px solid ${c.border}; padding: 20px; margin: 25px 0; border-radius: 8px;">
      ${titleHtml}
      <ul style="list-style: none; padding: 0; margin: 0;">
        ${itemsHtml}
      </ul>
    </div>
  `;
}

/**
 * Aktions-Box mit nummerierter Liste (wie im Original statusNotifier.js)
 */
function generateActionBox(items, options = {}) {
  const { color = 'blue', icon = '💡', title = 'Empfohlene Aktionen' } = options;

  const colors = {
    blue: { bg: '#f0f9ff', title: '#0369a1' },
    yellow: { bg: '#fef3c7', title: '#d97706' },
    green: { bg: '#d1fae5', title: '#047857' }
  };

  const c = colors[color] || colors.blue;

  const itemsHtml = items.map(item => `<li>${item}</li>`).join('');

  return `
    <div style="background: ${c.bg}; border-radius: 12px; padding: 20px; margin: 25px 0;">
      <h3 style="color: ${c.title}; margin: 0 0 15px 0;">${icon} ${title}</h3>
      <ol style="color: #334155; line-height: 1.8; margin: 0;">
        ${itemsHtml}
      </ol>
    </div>
  `;
}

/**
 * Alert-Box (kritisch, warnung, info, erfolg)
 */
function generateAlertBox(text, type = 'warning') {
  const styles = {
    critical: { bg: '#fee2e2', border: '#dc2626', color: '#991b1b', icon: '⚠️' },
    warning: { bg: '#fef3c7', border: '#f59e0b', color: '#92400e', icon: '⚠️' },
    info: { bg: '#dbeafe', border: '#3b82f6', color: '#1e40af', icon: 'ℹ️' },
    success: { bg: '#d1fae5', border: '#10b981', color: '#065f46', icon: '✅' }
  };

  const s = styles[type] || styles.warning;

  return `
    <div style="background: ${s.bg}; border-left: 4px solid ${s.border}; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="color: ${s.color}; margin: 0; font-size: 15px; font-weight: 500;">
        ${s.icon} ${text}
      </p>
    </div>
  `;
}

/**
 * Stats Row für Digest-Emails
 */
function generateStatsRow(stats) {
  const statsHtml = stats.map(stat => `
    <td style="text-align: center; padding: 15px; width: ${100 / stats.length}%;">
      <div style="font-size: 28px; font-weight: 700; color: ${stat.color || '#1a1a1a'};">${stat.value}</div>
      <div style="font-size: 12px; color: #888888; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 4px;">${stat.label}</div>
    </td>
  `).join('');

  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; background: #f8f9fa; border-radius: 12px;">
      <tr>
        ${statsHtml}
      </tr>
    </table>
  `;
}

/**
 * Event Card für Calendar/Digest
 */
function generateEventCard(options) {
  const { title, subtitle, badge, badgeColor = 'blue', icon = '📄' } = options;

  const badgeColors = {
    critical: { bg: '#fee2e2', text: '#dc2626' },
    warning: { bg: '#fef3c7', text: '#d97706' },
    info: { bg: '#dbeafe', text: '#2563eb' },
    success: { bg: '#d1fae5', text: '#059669' },
    blue: { bg: '#dbeafe', text: '#2563eb' }
  };

  const bc = badgeColors[badgeColor] || badgeColors.blue;

  return `
    <div style="background: #f8f9fa; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 15px 0;">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td style="vertical-align: top; width: 40px;">
            <span style="font-size: 24px;">${icon}</span>
          </td>
          <td style="vertical-align: top;">
            <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #1a1a1a;">${title}</p>
            <p style="margin: 0; font-size: 14px; color: #666666;">${subtitle}</p>
          </td>
          <td style="vertical-align: top; text-align: right;">
            <span style="display: inline-block; padding: 4px 12px; background: ${bc.bg}; color: ${bc.text}; font-size: 12px; font-weight: 600; border-radius: 20px;">${badge}</span>
          </td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Paragraph Helper
 */
function generateParagraph(text, options = {}) {
  const { centered = false, muted = false } = options;
  const color = muted ? '#888888' : '#555555';
  const fontSize = muted ? '14px' : '16px';
  const textAlign = centered ? 'text-align: center;' : '';

  return `<p style="margin: 0 0 16px 0; font-size: ${fontSize}; color: ${color}; line-height: 1.7; ${textAlign}">${text}</p>`;
}

/**
 * Divider
 */
function generateDivider() {
  return `<hr style="border: none; border-top: 1px solid #f0f0f0; margin: 25px 0;">`;
}

module.exports = {
  generateEmailTemplate,
  generateInfoBox,
  generateActionBox,
  generateAlertBox,
  generateStatsRow,
  generateEventCard,
  generateParagraph,
  generateDivider,
  logoUrl
};
