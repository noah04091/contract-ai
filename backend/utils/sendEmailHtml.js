// 📁 backend/utils/sendEmailHtml.js
// ✅ HTML E-Mail-Versand für E-Mail-Verification

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

async function sendEmailHtml(to, subject, html) {
  try {
    // ✅ Robuster FROM-Fallback: EMAIL_FROM > EMAIL_USER > Hardcoded Fallback
    const fromAddress = process.env.EMAIL_FROM
      || (process.env.EMAIL_USER ? `"Contract AI" <${process.env.EMAIL_USER}>` : null)
      || "Contract AI <no-reply@contract-ai.de>";

    // 📧 Debug: FROM-Adresse loggen (ohne sensible Daten)
    console.log(`📧 sendEmailHtml: Sende von "${fromAddress}" an ${to}`);

    const result = await transporter.sendMail({
      from: fromAddress,
      to,
      subject,
      html, // ✅ HTML statt text
    });

    console.log(`✅ E-Mail gesendet an ${to}: ${subject}`);
    return result;
  } catch (error) {
    // 📧 Debug: Detailliertes Error-Logging
    console.error(`❌ E-Mail-Versand fehlgeschlagen an ${to}:`, {
      error: error.message,
      code: error.code,
      command: error.command,
      fromAddress: process.env.EMAIL_FROM ? '[EMAIL_FROM set]' : (process.env.EMAIL_USER ? '[EMAIL_USER set]' : '[Fallback used]')
    });
    throw error;
  }
}

module.exports = sendEmailHtml;