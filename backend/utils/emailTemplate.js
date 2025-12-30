// 📁 backend/utils/emailTemplate.js
// ✅ V13 - Premium Design mit echtem Logo (wie Original)

const LOGO_URL = 'https://www.contract-ai.de/logo.png';

/**
 * Generiert Premium E-Mail HTML mit echtem Logo
 */
function generateEmailTemplate(options) {
  const title = options.title || '';
  const body = options.body || '';
  const cta = options.cta || null;
  const badge = options.badge || null;

  // CTA Button HTML (zentriert)
  let ctaHtml = '';
  if (cta && cta.url && cta.text) {
    ctaHtml = `
              <div style="text-align: center; margin-top: 30px;">
                <a href="${cta.url}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
                  ${cta.text}
                </a>
              </div>`;
  }

  // Badge HTML (optional, oben rechts oder unter Titel)
  let badgeHtml = '';
  if (badge) {
    badgeHtml = `
              <div style="text-align: center; margin-bottom: 20px;">
                <span style="display: inline-block; background-color: #dbeafe; color: #1d4ed8; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${badge}
                </span>
              </div>`;
  }

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">

          <!-- Logo Header -->
          <tr>
            <td style="padding: 40px 40px 30px 40px; text-align: center;">
              <img src="${LOGO_URL}" alt="Contract AI" style="height: 48px; max-width: 200px;" />
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 40px 40px;">

              ${badgeHtml}

              <!-- Title -->
              <h1 style="margin: 0 0 20px 0; font-size: 24px; font-weight: 700; color: #111827; text-align: center; line-height: 1.3;">
                ${title}
              </h1>

              <!-- Body Content -->
              <div style="color: #4b5563; font-size: 16px; line-height: 1.7;">
                ${body}
              </div>

              ${ctaHtml}

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 10px 0; font-size: 13px; color: #6b7280; text-align: center;">
                © ${new Date().getFullYear()} Contract AI. Alle Rechte vorbehalten.
              </p>
              <p style="margin: 0; font-size: 12px; text-align: center;">
                <a href="https://www.contract-ai.de/datenschutz" style="color: #6b7280; text-decoration: none;">Datenschutz</a>
                <span style="color: #d1d5db; margin: 0 10px;">|</span>
                <a href="https://www.contract-ai.de/impressum" style="color: #6b7280; text-decoration: none;">Impressum</a>
                <span style="color: #d1d5db; margin: 0 10px;">|</span>
                <a href="https://www.contract-ai.de/agb" style="color: #6b7280; text-decoration: none;">AGB</a>
              </p>
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
 * Farbige Info-Box mit Icon (wie im Original)
 */
function generateInfoBox(items, options = {}) {
  if (!items || items.length === 0) return '';

  const { color = 'blue', icon = null, title = null } = options;

  const colors = {
    blue: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af', titleColor: '#1d4ed8' },
    yellow: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', titleColor: '#d97706' },
    red: { bg: '#fee2e2', border: '#ef4444', text: '#991b1b', titleColor: '#dc2626' },
    green: { bg: '#d1fae5', border: '#10b981', text: '#065f46', titleColor: '#059669' }
  };

  const c = colors[color] || colors.blue;

  let titleHtml = '';
  if (title) {
    titleHtml = `<h3 style="color: ${c.titleColor}; margin: 0 0 12px 0; font-size: 15px;">${icon ? icon + ' ' : ''}${title}</h3>`;
  }

  const itemsHtml = items.map(item => `
    <li style="padding: 6px 0; color: ${c.text};">
      <strong>${item.label}:</strong> ${item.value}
    </li>
  `).join('');

  return `
              <div style="background: ${c.bg}; border-left: 4px solid ${c.border}; padding: 20px; margin: 25px 0; border-radius: 8px;">
                ${titleHtml}
                <ul style="list-style: none; padding: 0; margin: 0;">
                  ${itemsHtml}
                </ul>
              </div>`;
}

/**
 * Aktions-Box mit nummerierter Liste (wie im Original)
 */
function generateActionBox(items, options = {}) {
  const { color = 'blue', icon = '💡', title = 'Empfohlene Aktionen' } = options;

  const colors = {
    blue: { bg: '#f0f9ff', border: '#0369a1', titleColor: '#0369a1' },
    yellow: { bg: '#fef3c7', border: '#d97706', titleColor: '#d97706' },
    green: { bg: '#d1fae5', border: '#059669', titleColor: '#059669' }
  };

  const c = colors[color] || colors.blue;

  const itemsHtml = items.map((item, i) => `
    <li style="padding: 6px 0; color: #334155;">${item}</li>
  `).join('');

  return `
              <div style="background: ${c.bg}; border-radius: 12px; padding: 20px; margin: 25px 0;">
                <h3 style="color: ${c.titleColor}; margin: 0 0 15px 0; font-size: 15px;">
                  ${icon} ${title}
                </h3>
                <ol style="color: #334155; line-height: 1.8; margin: 0; padding-left: 20px;">
                  ${itemsHtml}
                </ol>
              </div>`;
}

/**
 * Alert-Box (kritisch, warnung, info, erfolg)
 */
function generateAlertBox(text, type = 'warning') {
  const styles = {
    critical: { bg: '#fee2e2', border: '#ef4444', icon: '⚠️', titleColor: '#991b1b' },
    warning: { bg: '#fef3c7', border: '#f59e0b', icon: '⚠️', titleColor: '#92400e' },
    info: { bg: '#dbeafe', border: '#3b82f6', icon: 'ℹ️', titleColor: '#1e40af' },
    success: { bg: '#d1fae5', border: '#10b981', icon: '✅', titleColor: '#065f46' }
  };

  const s = styles[type] || styles.warning;

  return `
              <div style="background: ${s.bg}; border-left: 4px solid ${s.border}; padding: 16px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
                <p style="color: ${s.titleColor}; margin: 0; font-size: 15px; font-weight: 500;">
                  ${s.icon} ${text}
                </p>
              </div>`;
}

/**
 * Stats Row für Digest-Emails
 */
function generateStatsRow(stats) {
  const statsHtml = stats.map(stat => `
    <td style="text-align: center; padding: 20px; width: ${100 / stats.length}%;">
      <p style="margin: 0 0 4px 0; font-size: 32px; font-weight: 700; color: ${stat.color || '#111827'};">${stat.value}</p>
      <p style="margin: 0; font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">${stat.label}</p>
    </td>
  `).join('');

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 25px 0; background: #f9fafb; border-radius: 12px; border: 1px solid #e5e7eb;">
                <tr>
                  ${statsHtml}
                </tr>
              </table>`;
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
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin: 15px 0;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align: top; width: 40px;">
                      <span style="font-size: 24px;">${icon}</span>
                    </td>
                    <td style="vertical-align: top;">
                      <p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600; color: #111827;">${title}</p>
                      <p style="margin: 0; font-size: 14px; color: #6b7280;">${subtitle}</p>
                    </td>
                    <td align="right" style="vertical-align: top;">
                      <span style="display: inline-block; padding: 4px 12px; background: ${bc.bg}; color: ${bc.text}; font-size: 12px; font-weight: 600; border-radius: 20px;">${badge}</span>
                    </td>
                  </tr>
                </table>
              </div>`;
}

/**
 * Paragraph Helper
 */
function generateParagraph(text, options = {}) {
  const { centered = false, muted = false } = options;
  const style = `
    margin: 0 0 16px 0;
    font-size: ${muted ? '14px' : '16px'};
    color: ${muted ? '#6b7280' : '#4b5563'};
    line-height: 1.7;
    ${centered ? 'text-align: center;' : ''}
  `.replace(/\s+/g, ' ').trim();

  return `<p style="${style}">${text}</p>`;
}

/**
 * Divider
 */
function generateDivider() {
  return `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 25px 0;">`;
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
  LOGO_URL
};
