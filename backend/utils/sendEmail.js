// 📁 backend/utils/sendEmail.js
const nodemailer = require("nodemailer");

// Shared connection pool für Mailgun
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || 587),
      secure: process.env.EMAIL_SECURE === "true",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
      // Pool connections für bessere Performance
      pool: true,
      maxConnections: 1, // Nur 1 gleichzeitige Verbindung zu Mailgun
      maxMessages: 10,   // Max 10 Emails per Connection
      // Timeouts erhöht
      connectionTimeout: 15000,
      socketTimeout: 15000,
      greetingTimeout: 10000,
    });
  }
  return transporter;
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  const transporter = getTransporter();

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
    to,
    subject,
    html,
    attachments,
  });
};

module.exports = sendEmail;
