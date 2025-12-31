// 📧 Signature Email Templates - V4 Design
// Clean, Modern, Professional - Consistent with Contract AI branding

const { generateEmailTemplate } = require('../utils/emailTemplate');

const logoUrl = 'https://www.contract-ai.de/logo.png';

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

  signatureFields.forEach(field => {
    if (fieldCounts.hasOwnProperty(field.type)) {
      fieldCounts[field.type]++;
    }
  });

  const totalFields = signatureFields.length;

  // Field type labels (keine Emojis für bessere E-Mail-Zustellung)
  const fieldLabels = {
    signature: { icon: '', label: 'Signatur' },
    initial: { icon: '', label: 'Initialen' },
    date: { icon: '', label: 'Datum' },
    text: { icon: '', label: 'Textfeld' }
  };

  // Build field summary
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

      fieldSummaryHTML += `<p style="margin: 8px 0; padding-left: 0;">${icon} <strong>${count}×</strong> ${label} auf ${pageText}</p>`;
    }
  });

  const formattedExpiryDate = new Date(expiresAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const body = `
    <p style="margin: 0 0 20px 0; text-align: center;">
      <strong>${ownerEmail}</strong> hat Ihnen ein Dokument zur Unterschrift geschickt.
    </p>

    <!-- Document Card -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 20px; margin: 25px 0;">
      <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
        ${envelope.title}
      </p>
      <p style="margin: 0; font-size: 14px; color: #666666;">
        Absender: ${ownerEmail}
      </p>
      ${envelope.message ? `
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
          <p style="margin: 0; font-size: 14px; color: #555555;">
            <strong>Nachricht:</strong><br>
            ${envelope.message}
          </p>
        </div>
      ` : ''}
    </div>

    <!-- Fields Section -->
    <div style="margin: 25px 0;">
      <p style="margin: 0 0 12px 0; font-weight: 600; color: #1a1a1a;">
        Sie müssen folgende Felder ausfüllen:
      </p>
      ${fieldSummaryHTML}
      <p style="margin: 15px 0 0 0; padding-top: 12px; border-top: 1px solid #e9ecef; font-size: 14px; color: #666666;">
        <strong>Gesamt: ${totalFields} ${totalFields === 1 ? 'Feld' : 'Felder'}</strong>
      </p>
    </div>

    <!-- Info Box -->
    <div style="background-color: #fff8e6; border: 1px solid #ffe066; border-radius: 12px; padding: 16px; margin: 25px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #8a6d00; font-size: 14px;">
        Wichtige Hinweise
      </p>
      <p style="margin: 0; font-size: 13px; color: #8a6d00; line-height: 1.6;">
        • Link gültig bis: <strong>${formattedExpiryDate}</strong><br>
        • Leiten Sie diesen Link nicht weiter<br>
        • Bei Fragen: ${ownerEmail}
      </p>
    </div>
  `;

  return generateEmailTemplate({
    title: `Signaturanfrage`,
    preheader: `${ownerEmail} bittet Sie, "${envelope.title}" zu unterschreiben`,
    body: body,
    cta: {
      url: signUrl,
      text: 'Jetzt signieren →'
    }
  });
}

/**
 * Generate HTML email for completion notification (document fully signed)
 * @param {Object} data - Email data
 * @param {Object} data.envelope - Envelope info
 * @param {string} data.downloadLink - PDF download URL
 * @returns {string} HTML email
 */
function generateCompletionNotificationHTML(data) {
  const { envelope, downloadLink } = data;

  const signersListHTML = envelope.signers.map(s => {
    const signedDate = s.signedAt ? new Date(s.signedAt).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Ausstehend';

    return `
      <div style="display: flex; align-items: center; padding: 10px 0; border-bottom: 1px solid #f0f0f0;">
        <span style="color: #22c55e; margin-right: 10px;">•</span>
        <span style="flex: 1;">
          <strong>${s.name}</strong><br>
          <span style="font-size: 13px; color: #666666;">${s.email} • ${signedDate}</span>
        </span>
      </div>
    `;
  }).join('');

  const completedDate = new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const body = `
    <p style="margin: 0 0 20px 0; text-align: center;">
      Alle Parteien haben das Dokument erfolgreich unterzeichnet.
    </p>

    <!-- Success Badge -->
    <div style="text-align: center; margin: 25px 0;">
      <span style="display: inline-block; background-color: #dcfce7; color: #16a34a; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
        Vollständig signiert
      </span>
    </div>

    <!-- Document Card -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 20px; margin: 25px 0;">
      <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
        ${envelope.title}
      </p>
      <p style="margin: 0; font-size: 14px; color: #666666;">
        Abgeschlossen am: ${completedDate}
      </p>
    </div>

    <!-- Signers List -->
    <div style="margin: 25px 0;">
      <p style="margin: 0 0 15px 0; font-weight: 600; color: #1a1a1a;">
        Unterzeichner:
      </p>
      ${signersListHTML}
    </div>

    <!-- Download Info -->
    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px; margin: 25px 0; text-align: center;">
      <p style="margin: 0; font-size: 14px; color: #1e40af;">
        Das signierte Dokument steht zum Download bereit.<br>
        <span style="font-size: 12px; color: #3b82f6;">(Link 24 Stunden gültig)</span>
      </p>
    </div>
  `;

  return generateEmailTemplate({
    title: `Dokument vollständig signiert`,
    preheader: `"${envelope.title}" wurde von allen Parteien unterschrieben`,
    body: body,
    cta: {
      url: downloadLink,
      text: 'Dokument herunterladen →'
    }
  });
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

/**
 * Generate plain text email for completion notification (fallback)
 */
function generateCompletionNotificationText(data) {
  const { envelope, downloadLink } = data;

  const completedDate = new Date().toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const signersList = envelope.signers.map(s => {
    const signedDate = s.signedAt ? new Date(s.signedAt).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : 'Ausstehend';
    return `  - ${s.name} (${s.email}) - ${signedDate}`;
  }).join('\n');

  return `
Dokument vollständig signiert

Gute Nachrichten! Alle Parteien haben das Dokument erfolgreich unterzeichnet.

═══════════════════════════════════════════════════

DOKUMENT: ${envelope.title}
ABGESCHLOSSEN AM: ${completedDate}

═══════════════════════════════════════════════════

UNTERZEICHNER:

${signersList}

═══════════════════════════════════════════════════

SIGNIERTES DOKUMENT HERUNTERLADEN:

${downloadLink}

(Link 24 Stunden gültig)

═══════════════════════════════════════════════════

Mit freundlichen Grüßen
Contract AI Signaturservice

---
Diese E-Mail wurde automatisch generiert.

Website: https://www.contract-ai.de
Datenschutz: https://www.contract-ai.de/datenschutz
Impressum: https://www.contract-ai.de/impressum
  `.trim();
}

/**
 * Generate HTML email for void notification (document cancelled)
 * @param {Object} data - Email data
 * @param {Object} data.signer - Signer info (name, email)
 * @param {Object} data.envelope - Envelope info (title)
 * @param {string} data.ownerEmail - Owner/sender email
 * @param {string} data.voidReason - Reason for cancellation
 * @param {Date} data.voidedAt - Cancellation date
 * @returns {string} HTML email
 */
function generateVoidNotificationHTML(data) {
  const { signer, envelope, ownerEmail, voidReason, voidedAt } = data;

  const formattedDate = new Date(voidedAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const body = `
    <p style="margin: 0 0 20px 0; text-align: center;">
      Die Signaturanfrage wurde vom Absender storniert.
    </p>

    <!-- Cancel Badge -->
    <div style="text-align: center; margin: 25px 0;">
      <span style="display: inline-block; background-color: #fee2e2; color: #dc2626; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600;">
        Storniert
      </span>
    </div>

    <!-- Document Card -->
    <div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 12px; padding: 20px; margin: 25px 0;">
      <p style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #1a1a1a;">
        ${envelope.title}
      </p>
      <p style="margin: 0; font-size: 14px; color: #666666;">
        Absender: ${ownerEmail}
      </p>
      <p style="margin: 8px 0 0 0; font-size: 14px; color: #666666;">
        Storniert am: ${formattedDate}
      </p>
    </div>

    <!-- Reason Section -->
    ${voidReason ? `
    <div style="margin: 25px 0;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #1a1a1a;">
        Grund der Stornierung:
      </p>
      <p style="margin: 0; padding: 12px 16px; background-color: #fef3c7; border-radius: 8px; font-size: 14px; color: #92400e;">
        ${voidReason}
      </p>
    </div>
    ` : ''}

    <!-- Info Box -->
    <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; margin: 25px 0;">
      <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.6;">
        Der ursprüngliche Signatur-Link ist nicht mehr gültig.<br>
        Falls Sie Fragen haben, wenden Sie sich bitte an: ${ownerEmail}
      </p>
    </div>
  `;

  return generateEmailTemplate({
    title: `Signaturanfrage storniert`,
    preheader: `Die Signaturanfrage für "${envelope.title}" wurde storniert`,
    body: body
  });
}

/**
 * Generate plain text email for void notification (fallback)
 */
function generateVoidNotificationText(data) {
  const { signer, envelope, ownerEmail, voidReason, voidedAt } = data;

  const formattedDate = new Date(voidedAt).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
Hallo ${signer.name},

die Signaturanfrage wurde vom Absender storniert.

═══════════════════════════════════════════════════

DOKUMENT: ${envelope.title}
ABSENDER: ${ownerEmail}
STORNIERT AM: ${formattedDate}

═══════════════════════════════════════════════════
${voidReason ? `
GRUND DER STORNIERUNG:

${voidReason}

═══════════════════════════════════════════════════
` : ''}
HINWEIS:

Der ursprüngliche Signatur-Link ist nicht mehr gültig.
Falls Sie Fragen haben, wenden Sie sich bitte an: ${ownerEmail}

═══════════════════════════════════════════════════

Mit freundlichen Grüßen
Contract AI Signaturservice

---
Diese E-Mail wurde automatisch generiert.
Bitte antworten Sie nicht auf diese E-Mail.

Website: https://www.contract-ai.de
Datenschutz: https://www.contract-ai.de/datenschutz
Impressum: https://www.contract-ai.de/impressum
  `.trim();
}

module.exports = {
  generateSignatureInvitationHTML,
  generateSignatureInvitationText,
  generateCompletionNotificationHTML,
  generateCompletionNotificationText,
  generateVoidNotificationHTML,
  generateVoidNotificationText
};
