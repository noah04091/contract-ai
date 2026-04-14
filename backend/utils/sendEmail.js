// 📁 backend/utils/sendEmail.js
const nodemailer = require("nodemailer");
const { logSentEmail } = require("./emailLogger");

// Email-Warteschlange für sequenzielle Verarbeitung
let emailQueue = [];
let isProcessingQueue = false;

// Delay zwischen Emails um SMTP-Overload zu vermeiden
const EMAIL_DELAY_MS = 2000; // 2 Sekunden zwischen Emails

const processEmailQueue = async () => {
  if (isProcessingQueue || emailQueue.length === 0) return;

  isProcessingQueue = true;
  console.log(`📧 [EMAIL QUEUE] Starte Verarbeitung von ${emailQueue.length} Emails`);

  while (emailQueue.length > 0) {
    const emailTask = emailQueue.shift();
    try {
      await sendEmailImmediate(emailTask.emailData);
      console.log(`✅ [EMAIL QUEUE] Email gesendet an ${emailTask.emailData.to}`);
    } catch (error) {
      console.error(`❌ [EMAIL QUEUE] Fehler:`, error.message);
    }

    // Delay zwischen Emails
    if (emailQueue.length > 0) {
      await new Promise(resolve => setTimeout(resolve, EMAIL_DELAY_MS));
    }
  }

  isProcessingQueue = false;
  console.log(`✅ [EMAIL QUEUE] Alle Emails verarbeitet`);
};

const sendEmailImmediate = async ({ to, subject, html, attachments = [] }) => {
  // EXAKT dieselbe Config wie server.js (die funktioniert!)
  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT),
    secure: false, // ← Wie server.js, nicht process.env.EMAIL_SECURE
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // KEINE Timeouts - wie server.js
  });

  const result = await transporter.sendMail({
    from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
    to,
    subject,
    html,
    attachments,
  });

  logSentEmail({
    to,
    subject,
    category: 'general',
    messageId: result && result.messageId,
    source: 'utils/sendEmail.js'
  }).catch(() => {});
};

const sendEmail = async ({ to, subject, html, attachments = [] }) => {
  // Email zur Warteschlange hinzufügen
  emailQueue.push({
    emailData: { to, subject, html, attachments }
  });

  console.log(`📧 [EMAIL QUEUE] Email hinzugefügt: ${subject} → ${to} (Queue: ${emailQueue.length})`);

  // Queue-Verarbeitung starten (falls nicht bereits aktiv)
  setImmediate(() => processEmailQueue());
};

module.exports = sendEmail;
