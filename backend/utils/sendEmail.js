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

  await mg.messages.create(domain, emailData);
};

module.exports = sendEmail;
