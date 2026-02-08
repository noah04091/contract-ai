// 📁 backend/utils/sendEmailHtml.js
// ✅ HTML E-Mail-Versand mit GDPR-Compliance (List-Unsubscribe Headers)

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
 * Send HTML email with optional GDPR-compliant unsubscribe headers
 * @param {string} to - Recipient email
 * @param {string} subject - Email subject
 * @param {string} html - HTML content
 * @param {Object} options - Optional settings
 * @param {string} options.unsubscribeUrl - URL for List-Unsubscribe header (GDPR)
 * @param {string} options.category - Email category for logging (e.g., 'digest', 'notification')
 * @param {string} options.userId - User ID for logging
 */
async function sendEmailHtml(to, subject, html, options = {}) {
  const { unsubscribeUrl, category = 'general', userId = null } = options;

  try {
    // ✅ Robuster FROM-Fallback: EMAIL_FROM > EMAIL_USER > Hardcoded Fallback
    const fromAddress = process.env.EMAIL_FROM
      || (process.env.EMAIL_USER ? `"Contract AI" <${process.env.EMAIL_USER}>` : null)
      || "Contract AI <no-reply@contract-ai.de>";

    // 📧 Debug: FROM-Adresse loggen (ohne sensible Daten)
    console.log(`📧 sendEmailHtml: Sende von "${fromAddress}" an ${to} [${category}]`);

    // Build mail options
    const mailOptions = {
      from: fromAddress,
      to,
      subject,
      html,
    };

    // 🆕 GDPR: Add List-Unsubscribe headers (RFC 8058)
    // This allows email clients to show a native "Unsubscribe" button
    if (unsubscribeUrl) {
      mailOptions.headers = {
        'List-Unsubscribe': `<${unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
      };
    }

    const result = await transporter.sendMail(mailOptions);

    console.log(`✅ E-Mail gesendet an ${to}: ${subject}`);

    // 🆕 Log email for audit trail (async, non-blocking)
    logEmailSent(to, subject, category, userId, result.messageId).catch(err => {
      console.error('Email logging failed (non-critical):', err.message);
    });

    return result;
  } catch (error) {
    // 📧 Debug: Detailliertes Error-Logging
    console.error(`❌ E-Mail-Versand fehlgeschlagen an ${to}:`, {
      error: error.message,
      code: error.code,
      command: error.command,
      fromAddress: process.env.EMAIL_FROM ? '[EMAIL_FROM set]' : (process.env.EMAIL_USER ? '[EMAIL_USER set]' : '[Fallback used]')
    });

    // 🆕 Log failed email for audit trail
    logEmailFailed(to, subject, category, userId, error.message).catch(err => {
      console.error('Email failure logging failed:', err.message);
    });

    throw error;
  }
}

/**
 * Log successful email to database for GDPR audit trail
 */
async function logEmailSent(to, subject, category, userId, messageId) {
  try {
    const database = require('../config/database');
    const db = await database.connect();

    await db.collection('email_logs').insertOne({
      to,
      subject,
      category,
      userId,
      messageId,
      status: 'sent',
      sentAt: new Date(),
      createdAt: new Date()
    });
  } catch (error) {
    // Non-critical - just log
    console.error('Failed to log email:', error.message);
  }
}

/**
 * Log failed email to database
 */
async function logEmailFailed(to, subject, category, userId, errorMessage) {
  try {
    const database = require('../config/database');
    const db = await database.connect();

    await db.collection('email_logs').insertOne({
      to,
      subject,
      category,
      userId,
      status: 'failed',
      error: errorMessage,
      failedAt: new Date(),
      createdAt: new Date()
    });
  } catch (error) {
    console.error('Failed to log email failure:', error.message);
  }
}

module.exports = sendEmailHtml;