// 📁 backend/utils/sendEmail.js
const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === "true", // true=465, false=587
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // ChatGPT's Timeout-Optimierung
    connectionTimeout: 7000,  // 7 Sekunden Connection Timeout
    socketTimeout: 7000,      // 7 Sekunden Socket Timeout
    greetingTimeout: 5000,    // 5 Sekunden Greeting Timeout
  });

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
    to,
    subject,
    html,
    attachments,
  });
};

module.exports = sendEmail;
