// 📧 Signature Invitation Email Template (HTML + Plain Text)
// DocuSign-style, responsive, dark-mode ready, accessible

/**
 * Generate HTML email for signature invitation
 * @param {Object} data - Email data
 * @param {Object} data.signer - Signer info (name, email)
 * @param {Object} data.envelope - Envelope info (title, message)
 * @param {string} data.ownerEmail - Owner/sender email
 * @param {string} data.signUrl - Magic link URL
 * @param {Date} data.expiresAt - Token expiration date
 * @param {Array} data.signatureFields - All signature fields for this signer
 * @returns {string} HTML email
 */
function generateSignatureInvitationHTML(data) {
  const { signer, envelope, ownerEmail, signUrl, expiresAt, signatureFields } = data;

  // Count field types
  const fieldCounts = {
    signature: 0,
    initial: 0,
    date: 0,
    text: 0
  };

  const fieldsByPage = {};

  signatureFields.forEach(field => {
    if (fieldCounts.hasOwnProperty(field.type)) {
      fieldCounts[field.type]++;
    }

    // Group by page
    if (!fieldsByPage[field.page]) {
      fieldsByPage[field.page] = [];
    }
    fieldsByPage[field.page].push(field);
  });

  const totalFields = signatureFields.length;
  const pageNumbers = Object.keys(fieldsByPage).sort((a, b) => a - b);

  // Field type labels
  const fieldLabels = {
    signature: { icon: '✍️', label: 'Signatur' },
    initial: { icon: '🔤', label: 'Initialen' },
    date: { icon: '📅', label: 'Datum' },
    text: { icon: '📝', label: 'Textfeld' }
  };

  // Build field summary bullets
  let fieldSummaryHTML = '';
  Object.keys(fieldCounts).forEach(type => {
    const count = fieldCounts[type];
    if (count > 0) {
      const { icon, label } = fieldLabels[type];
      const pages = [...new Set(
        signatureFields
          .filter(f => f.type === type)
          .map(f => f.page)
      )].sort((a, b) => a - b);

      const pageText = pages.length === 1
        ? `Seite ${pages[0]}`
        : `Seiten ${pages.join(', ')}`;

      fieldSummaryHTML += `
        <tr>
          <td style="padding: 8px 0; font-size: 15px; line-height: 1.5; color: #1f2937;">
            ${icon} <strong>${count}×</strong> ${label} auf ${pageText}
          </td>
        </tr>
      `;
    }
  });

  const formattedExpiryDate = new Date(expiresAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html lang="de" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>Signaturanfrage – ${envelope.title}</title>

  <style>
    /* Reset & Base Styles */
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-color: #f3f4f6;
      color: #1f2937;
    }

    table { border-spacing: 0; border-collapse: collapse; width: 100%; }
    img { border: 0; display: block; outline: none; text-decoration: none; }

    /* Dark Mode Support */
    @media (prefers-color-scheme: dark) {
      body { background-color: #1f2937 !important; color: #f9fafb !important; }
      .email-container { background-color: #111827 !important; }
      .email-header { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%) !important; }
      .content-section { background-color: #1f2937 !important; border-color: #374151 !important; }
      .field-item { color: #f9fafb !important; }
      .footer { background-color: #111827 !important; color: #9ca3af !important; }
      .footer-link { color: #60a5fa !important; }
    }

    /* Container */
    .email-wrapper {
      width: 100%;
      background-color: #f3f4f6;
      padding: 20px 0;
    }

    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    /* Header */
    .email-header {
      background: linear-gradient(135deg, #2E6CF6 0%, #1E53D8 100%);
      padding: 32px 24px;
      text-align: center;
    }

    .header-icon {
      font-size: 48px;
      margin-bottom: 12px;
    }

    .header-title {
      font-size: 24px;
      font-weight: 600;
      color: #ffffff;
      margin: 0 0 8px 0;
    }

    .header-subtitle {
      font-size: 15px;
      color: rgba(255, 255, 255, 0.9);
      margin: 0;
    }

    /* Content */
    .content-section {
      padding: 32px 24px;
      background-color: #ffffff;
    }

    .greeting {
      font-size: 16px;
      color: #1f2937;
      margin: 0 0 16px 0;
      line-height: 1.5;
    }

    .main-text {
      font-size: 15px;
      color: #4b5563;
      line-height: 1.6;
      margin: 0 0 24px 0;
    }

    /* Document Info Card */
    .document-card {
      background-color: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
      margin: 0 0 24px 0;
    }

    .document-title {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 8px 0;
    }

    .document-sender {
      font-size: 14px;
      color: #6b7280;
      margin: 0 0 12px 0;
    }

    .document-message {
      font-size: 14px;
      color: #4b5563;
      line-height: 1.5;
      margin: 0;
      padding: 12px 0 0 0;
      border-top: 1px solid #e5e7eb;
    }

    /* Fields Section */
    .fields-section {
      margin: 24px 0;
    }

    .fields-title {
      font-size: 16px;
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 12px 0;
    }

    .field-item {
      padding: 8px 0;
      font-size: 15px;
      line-height: 1.5;
      color: #1f2937;
    }

    .fields-total {
      font-size: 14px;
      color: #6b7280;
      margin: 12px 0 0 0;
      padding: 12px 0 0 0;
      border-top: 1px solid #e5e7eb;
    }

    /* Bulletproof Button */
    .button-wrapper {
      text-align: center;
      margin: 32px 0;
    }

    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #2E6CF6 0%, #1E53D8 100%);
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 600;
      text-decoration: none;
      padding: 16px 40px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(46, 108, 246, 0.3);
      transition: all 0.2s ease;
    }

    .cta-button:hover {
      box-shadow: 0 6px 16px rgba(46, 108, 246, 0.4);
      transform: translateY(-1px);
    }

    /* Fallback Link */
    .fallback-link {
      text-align: center;
      margin: 16px 0;
      font-size: 13px;
      color: #6b7280;
    }

    .fallback-link a {
      color: #2E6CF6;
      text-decoration: none;
      word-break: break-all;
    }

    /* Info Box */
    .info-box {
      background-color: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 16px;
      margin: 24px 0;
    }

    .info-box-title {
      font-size: 14px;
      font-weight: 600;
      color: #92400e;
      margin: 0 0 8px 0;
    }

    .info-box-text {
      font-size: 13px;
      color: #78350f;
      line-height: 1.5;
      margin: 0;
    }

    /* Footer */
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }

    .footer-text {
      font-size: 13px;
      color: #6b7280;
      line-height: 1.6;
      margin: 0 0 12px 0;
    }

    .footer-links {
      font-size: 12px;
      color: #9ca3af;
      margin: 12px 0 0 0;
    }

    .footer-link {
      color: #2E6CF6;
      text-decoration: none;
      margin: 0 8px;
    }

    /* Mobile Responsive */
    @media only screen and (max-width: 600px) {
      .email-wrapper { padding: 0 !important; }
      .email-container { border-radius: 0 !important; }
      .email-header { padding: 24px 16px !important; }
      .content-section { padding: 24px 16px !important; }
      .header-title { font-size: 20px !important; }
      .cta-button { padding: 14px 32px !important; font-size: 15px !important; }
    }
  </style>
</head>

<body>
  <table role="presentation" class="email-wrapper">
    <tr>
      <td align="center">
        <!-- Main Container -->
        <table role="presentation" class="email-container">

          <!-- Header -->
          <tr>
            <td class="email-header">
              <div class="header-icon">📝</div>
              <h1 class="header-title">Signaturanfrage</h1>
              <p class="header-subtitle">Ein Dokument wartet auf Ihre Unterschrift</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td class="content-section">
              <p class="greeting">Hallo ${signer.name},</p>

              <p class="main-text">
                <strong>${ownerEmail}</strong> hat Ihnen ein Dokument zur Unterschrift geschickt.
              </p>

              <!-- Document Card -->
              <table role="presentation" class="document-card">
                <tr>
                  <td>
                    <h2 class="document-title">📄 ${envelope.title}</h2>
                    <p class="document-sender">Absender: ${ownerEmail}</p>
                    ${envelope.message ? `
                      <p class="document-message">
                        <strong>💬 Nachricht:</strong><br>
                        ${envelope.message}
                      </p>
                    ` : ''}
                  </td>
                </tr>
              </table>

              <!-- Fields Section -->
              <div class="fields-section">
                <h3 class="fields-title">Sie müssen folgende Felder ausfüllen:</h3>
                <table role="presentation">
                  ${fieldSummaryHTML}
                </table>
                <p class="fields-total">
                  <strong>Gesamt: ${totalFields} ${totalFields === 1 ? 'Feld' : 'Felder'}</strong>
                </p>
              </div>

              <!-- CTA Button (Bulletproof) -->
              <table role="presentation" class="button-wrapper">
                <tr>
                  <td align="center">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${signUrl}" style="height:48px;v-text-anchor:middle;width:200px;" arcsize="17%" strokecolor="#1E53D8" fillcolor="#2E6CF6">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:sans-serif;font-size:16px;font-weight:bold;">Jetzt signieren</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${signUrl}" class="cta-button" style="display: inline-block; background: linear-gradient(135deg, #2E6CF6 0%, #1E53D8 100%); color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(46, 108, 246, 0.3);">
                      Jetzt sicher signieren →
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>

              <!-- Fallback Link -->
              <div class="fallback-link">
                <p style="margin: 0 0 8px 0;">Link funktioniert nicht? Kopieren Sie diese URL:</p>
                <a href="${signUrl}" style="color: #2E6CF6; text-decoration: none; word-break: break-all;">${signUrl}</a>
              </div>

              <!-- Info Box -->
              <table role="presentation" class="info-box">
                <tr>
                  <td>
                    <p class="info-box-title">⏰ Wichtige Hinweise</p>
                    <p class="info-box-text">
                      • Dieser Link ist gültig bis: <strong>${formattedExpiryDate}</strong><br>
                      • Leiten Sie diesen Link nicht weiter – er ist nur für Sie bestimmt<br>
                      • Bei Fragen wenden Sie sich bitte an ${ownerEmail}
                    </p>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td class="footer">
              <p class="footer-text">
                Mit freundlichen Grüßen<br>
                <strong>Contract AI Signaturservice</strong>
              </p>
              <p class="footer-text" style="font-size: 12px; color: #9ca3af; margin: 16px 0 0 0;">
                Diese E-Mail wurde automatisch generiert. Bitte antworten Sie nicht auf diese E-Mail.
              </p>
              <div class="footer-links">
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}" class="footer-link">Website</a> •
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/datenschutz" class="footer-link">Datenschutz</a> •
                <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/impressum" class="footer-link">Impressum</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email for signature invitation (fallback)
 */
function generateSignatureInvitationText(data) {
  const { signer, envelope, ownerEmail, signUrl, expiresAt, signatureFields } = data;

  // Count field types
  const fieldCounts = {
    signature: 0,
    initial: 0,
    date: 0,
    text: 0
  };

  signatureFields.forEach(field => {
    if (fieldCounts.hasOwnProperty(field.type)) {
      fieldCounts[field.type]++;
    }
  });

  const totalFields = signatureFields.length;

  // Field type labels (plain text)
  const fieldLabels = {
    signature: 'Signatur',
    initial: 'Initialen',
    date: 'Datum',
    text: 'Textfeld'
  };

  // Build field summary
  let fieldSummary = '';
  Object.keys(fieldCounts).forEach(type => {
    const count = fieldCounts[type];
    if (count > 0) {
      const label = fieldLabels[type];
      const pages = [...new Set(
        signatureFields
          .filter(f => f.type === type)
          .map(f => f.page)
      )].sort((a, b) => a - b);

      const pageText = pages.length === 1
        ? `Seite ${pages[0]}`
        : `Seiten ${pages.join(', ')}`;

      fieldSummary += `  • ${count}x ${label} auf ${pageText}\n`;
    }
  });

  const formattedExpiryDate = new Date(expiresAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
Hallo ${signer.name},

${ownerEmail} hat Ihnen ein Dokument zur Unterschrift geschickt.

═══════════════════════════════════════════════════

DOKUMENT: ${envelope.title}
ABSENDER: ${ownerEmail}
${envelope.message ? `\nNACHRICHT:\n${envelope.message}\n` : ''}
═══════════════════════════════════════════════════

SIE MÜSSEN FOLGENDE FELDER AUSFÜLLEN:

${fieldSummary}
Gesamt: ${totalFields} ${totalFields === 1 ? 'Feld' : 'Felder'}

═══════════════════════════════════════════════════

▶ JETZT SIGNIEREN:

${signUrl}

═══════════════════════════════════════════════════

WICHTIGE HINWEISE:

• Dieser Link ist gültig bis: ${formattedExpiryDate}
• Leiten Sie diesen Link nicht weiter – er ist nur für Sie bestimmt
• Bei Fragen wenden Sie sich bitte an ${ownerEmail}

═══════════════════════════════════════════════════

Mit freundlichen Grüßen
Contract AI Signaturservice

---
Diese E-Mail wurde automatisch generiert.
Bitte antworten Sie nicht auf diese E-Mail.

Website: ${process.env.FRONTEND_URL || 'http://localhost:5173'}
Datenschutz: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/datenschutz
Impressum: ${process.env.FRONTEND_URL || 'http://localhost:5173'}/impressum
  `.trim();
}

module.exports = {
  generateSignatureInvitationHTML,
  generateSignatureInvitationText
};
