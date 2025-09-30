// 📁 backend/utils/sendEmail.js
const Mailgun = require('mailgun.js');
const formData = require('form-data');

// Mailgun API Client (bypassed SMTP-Probleme)
let mg = null;

const getMailgunClient = () => {
  if (!mg) {
    const mailgun = new Mailgun(formData);
    mg = mailgun.client({
      username: 'api',
      key: process.env.EMAIL_PASS, // Das ist der API-Key
      url: 'https://api.eu.mailgun.net' // EU-Region
    });
  }
  return mg;
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  try {
    const mg = getMailgunClient();

    // Domain aus EMAIL_USER extrahieren (postmaster@mail.contract-ai.de → mail.contract-ai.de)
    const domain = process.env.EMAIL_USER.split('@')[1];

    const emailData = {
      from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
      to,
      subject,
      html,
    };

    // Attachments hinzufügen falls vorhanden
    if (attachments && attachments.length > 0) {
      emailData.attachment = attachments.map(att => ({
        filename: att.filename,
        data: att.content
      }));
    }

    console.log(`📧 [MAILGUN API] Sende Email:`, {
      domain,
      to,
      subject,
      from: emailData.from,
      hasAttachments: attachments.length > 0
    });

    const result = await mg.messages.create(domain, emailData);

    console.log(`✅ [MAILGUN API] Email erfolgreich gesendet:`, {
      id: result.id,
      message: result.message
    });

    return result;
  } catch (error) {
    console.error(`❌ [MAILGUN API] Fehler beim Senden:`, {
      error: error.message,
      status: error.status,
      details: error.details || 'Keine Details'
    });
    throw error;
  }
};

module.exports = sendEmail;
