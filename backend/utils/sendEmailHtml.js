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
    const result = await transporter.sendMail({
      from: `"Contract AI" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html, // ✅ HTML statt text
    });
    
    console.log(`✅ E-Mail gesendet an ${to}: ${subject}`);
    return result;
  } catch (error) {
    console.error(`❌ E-Mail-Versand fehlgeschlagen an ${to}:`, error);
    throw error;
  }
}

module.exports = sendEmailHtml;