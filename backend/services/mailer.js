const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Send email with optional HTML content
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} text - Plain text content
 * @param {string} [html] - Optional HTML content
 * @param {Object} [options] - Optional settings
 * @param {string} [options.unsubscribeUrl] - Adds List-Unsubscribe header (RFC 8058)
 */
async function sendEmail(to, subject, text, html = null, options = {}) {
  const mailOptions = {
    from: process.env.EMAIL_FROM || `"Contract AI Signaturservice" <noreply@contract-ai.de>`,
    to,
    subject,
    text,
  };

  // Add HTML if provided
  if (html) {
    mailOptions.html = html;
  }

  // Add List-Unsubscribe headers for marketing emails (RFC 8058)
  if (options.unsubscribeUrl) {
    mailOptions.headers = {
      'List-Unsubscribe': `<${options.unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
    };
  }

  await transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
