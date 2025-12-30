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
 */
async function sendEmail(to, subject, text, html = null) {
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

  await transporter.sendMail(mailOptions);
}

module.exports = sendEmail;
