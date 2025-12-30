// 📁 backend/utils/emailTemplate.js
// ✅ V12 - Premium Enterprise Design (Stripe/Linear/Notion Style)

/**
 * Generiert Premium E-Mail HTML
 * V12: Enterprise-Grade Design wie Top-Tier SaaS
 */
function generateEmailTemplate(options) {
  const title = options.title || '';
  const body = options.body || '';
  const cta = options.cta || null;
  const badge = options.badge || 'Benachrichtigung';
  const subtitle = options.subtitle || '';

  // Premium CTA Button
  let ctaHtml = '';
  if (cta && cta.url && cta.text) {
    ctaHtml = `
              <table cellpadding="0" cellspacing="0" style="margin-top: 32px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #0066FF 0%, #0052CC 100%); border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);">
                    <a href="${cta.url}" style="display: inline-block; padding: 12px 24px; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 500; letter-spacing: 0.01em;">
                      ${cta.text}
                    </a>
                  </td>
                </tr>
              </table>`;
  }

  // Subtitle HTML
  const subtitleHtml = subtitle ? `
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #6B7280; font-weight: 400;">
                ${subtitle}
              </p>` : '';

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
</head>
<body style="margin: 0; padding: 0; background-color: #F9FAFB; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #F9FAFB;">
    <tr>
      <td style="padding: 48px 24px;">
        <table align="center" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto;">

          <!-- Logo Header -->
          <tr>
            <td style="padding-bottom: 32px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <div style="display: inline-block; background: linear-gradient(135deg, #0066FF 0%, #0052CC 100%); width: 36px; height: 36px; border-radius: 8px; text-align: center; line-height: 36px; vertical-align: middle;">
                      <span style="color: #ffffff; font-size: 18px; font-weight: 700;">C</span>
                    </div>
                    <span style="display: inline-block; vertical-align: middle; margin-left: 12px; font-size: 17px; font-weight: 600; color: #111827; letter-spacing: -0.02em;">Contract AI</span>
                  </td>
                  <td align="right" style="vertical-align: middle;">
                    <span style="display: inline-block; padding: 4px 10px; background-color: #F3F4F6; color: #6B7280; font-size: 11px; font-weight: 500; border-radius: 100px; text-transform: uppercase; letter-spacing: 0.05em;">${badge}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Card -->
          <tr>
            <td>
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04); border: 1px solid #E5E7EB;">
                <tr>
                  <td style="padding: 40px;">

                    <!-- Title -->
                    <h1 style="margin: 0 0 8px 0; font-size: 22px; font-weight: 600; color: #111827; letter-spacing: -0.02em; line-height: 1.3;">
                      ${title}
                    </h1>

                    ${subtitleHtml}

                    <!-- Body Content -->
                    <div style="color: #374151; font-size: 15px; line-height: 1.7;">
                      ${body}
                    </div>

                    ${ctaHtml}

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top: 32px; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 13px; color: #9CA3AF;">
                Contract AI GmbH · Intelligentes Vertragsmanagement
              </p>
              <p style="margin: 0; font-size: 12px;">
                <a href="https://www.contract-ai.de" style="color: #6B7280; text-decoration: none;">Website</a>
                <span style="color: #D1D5DB; margin: 0 8px;">·</span>
                <a href="https://www.contract-ai.de/datenschutz" style="color: #6B7280; text-decoration: none;">Datenschutz</a>
                <span style="color: #D1D5DB; margin: 0 8px;">·</span>
                <a href="https://www.contract-ai.de/impressum" style="color: #6B7280; text-decoration: none;">Impressum</a>
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
 * Premium Info-Box mit Icon
 */
function generateInfoBox(items) {
  if (!items || items.length === 0) return '';

  let itemsHtml = items.map((item, index) => {
    const borderTop = index > 0 ? 'border-top: 1px solid #F3F4F6; padding-top: 16px; margin-top: 16px;' : '';
    return `
      <div style="${borderTop}">
        <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 500; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.05em;">${item.label}</p>
        <p style="margin: 0; font-size: 16px; font-weight: 600; color: #111827;">${item.value}</p>
      </div>`;
  }).join('');

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0;">
                <tr>
                  <td style="background-color: #F9FAFB; border-radius: 8px; padding: 20px; border: 1px solid #E5E7EB;">
                    ${itemsHtml}
                  </td>
                </tr>
              </table>`;
}

/**
 * Premium Alert-Box
 */
function generateAlertBox(text, type = 'warning') {
  const styles = {
    critical: { bg: '#FEF2F2', border: '#FCA5A5', icon: '●', iconColor: '#DC2626', textColor: '#991B1B' },
    warning: { bg: '#FFFBEB', border: '#FCD34D', icon: '●', iconColor: '#F59E0B', textColor: '#92400E' },
    info: { bg: '#EFF6FF', border: '#93C5FD', icon: '●', iconColor: '#3B82F6', textColor: '#1E40AF' },
    success: { bg: '#ECFDF5', border: '#6EE7B7', icon: '●', iconColor: '#10B981', textColor: '#065F46' }
  };

  const s = styles[type] || styles.info;

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 16px 0;">
                <tr>
                  <td style="background: ${s.bg}; border: 1px solid ${s.border}; padding: 16px 20px; border-radius: 8px;">
                    <table cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top; padding-right: 12px;">
                          <span style="color: ${s.iconColor}; font-size: 8px;">${s.icon}</span>
                        </td>
                        <td>
                          <p style="color: ${s.textColor}; margin: 0; font-size: 14px; font-weight: 500; line-height: 1.5;">
                            ${text}
                          </p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`;
}

/**
 * Premium Paragraph
 */
function generateParagraph(text) {
  return `<p style="color: #374151; font-size: 15px; line-height: 1.7; margin: 0 0 16px 0;">${text}</p>`;
}

/**
 * Premium Divider
 */
function generateDivider() {
  return `<hr style="border: none; border-top: 1px solid #E5E7EB; margin: 24px 0;">`;
}

/**
 * Premium Stats Row (für Digest)
 */
function generateStatsRow(stats) {
  const statsHtml = stats.map(stat => `
    <td style="text-align: center; padding: 16px;">
      <p style="margin: 0 0 4px 0; font-size: 28px; font-weight: 600; color: ${stat.color || '#111827'};">${stat.value}</p>
      <p style="margin: 0; font-size: 12px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.05em;">${stat.label}</p>
    </td>
  `).join('');

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 24px 0; background: #F9FAFB; border-radius: 8px; border: 1px solid #E5E7EB;">
                <tr>
                  ${statsHtml}
                </tr>
              </table>`;
}

/**
 * Premium Event Card (für Digest/Calendar)
 */
function generateEventCard(options) {
  const { title, subtitle, badge, badgeColor, url } = options;

  const badgeColors = {
    critical: { bg: '#FEE2E2', text: '#DC2626' },
    warning: { bg: '#FEF3C7', text: '#D97706' },
    info: { bg: '#DBEAFE', text: '#2563EB' },
    success: { bg: '#D1FAE5', text: '#059669' }
  };

  const bc = badgeColors[badgeColor] || badgeColors.info;

  return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 12px 0;">
                <tr>
                  <td style="background: #ffffff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #111827;">${title}</p>
                          <p style="margin: 0; font-size: 13px; color: #6B7280;">${subtitle}</p>
                        </td>
                        <td align="right" style="vertical-align: middle;">
                          <span style="display: inline-block; padding: 4px 10px; background: ${bc.bg}; color: ${bc.text}; font-size: 11px; font-weight: 600; border-radius: 100px;">${badge}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`;
}

module.exports = {
  generateEmailTemplate,
  generateInfoBox,
  generateAlertBox,
  generateParagraph,
  generateDivider,
  generateStatsRow,
  generateEventCard
};
