/**
 * 🧪 TEST SCRIPT: Beta Feedback Reminder E-Mails
 *
 * Sendet beide Erinnerungs-E-Mails als Test an eine angegebene Adresse.
 *
 * Usage: node test-beta-emails.js <email-adresse>
 * Beispiel: node test-beta-emails.js noah@example.com
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Bitte E-Mail-Adresse angeben!');
  console.error('Usage: node test-beta-emails.js <email-adresse>');
  process.exit(1);
}

console.log(`\n🧪 Beta E-Mail Test an: ${testEmail}\n`);

// E-Mail Transporter erstellen
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// 1. ERINNERUNG (Tag 2) - Orange Design
const firstReminderHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">🎁 Wie gefällt dir Contract AI?</h1>
    </div>

    <div style="background: #f5f5f7; padding: 30px; border-radius: 0 0 16px 16px;">
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Hallo!
      </p>

      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Du hast dich vor 2 Tagen als <strong>Beta-Tester</strong> bei Contract AI registriert – vielen Dank dafür! 🙏
      </p>

      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Wir haben dir <strong>3 Monate kostenlosen Premium-Zugang</strong> zu allen Features freigeschaltet.
        Dafür würden wir uns sehr über dein ehrliches Feedback freuen!
      </p>

      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        <strong>Dein Feedback hilft uns:</strong>
      </p>
      <ul style="font-size: 16px; color: #333; line-height: 1.8;">
        <li>Contract AI noch besser zu machen</li>
        <li>Zu verstehen, was wirklich gebraucht wird</li>
        <li>Bugs und Probleme zu finden</li>
      </ul>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.contract-ai.de/beta#feedback"
           style="display: inline-block; background: linear-gradient(135deg, #007aff 0%, #409cff 100%); color: white; padding: 16px 40px; border-radius: 100px; font-size: 18px; font-weight: 600; text-decoration: none; box-shadow: 0 4px 15px rgba(0, 122, 255, 0.3);">
          Jetzt Feedback geben
        </a>
      </div>

      <p style="font-size: 14px; color: #666; line-height: 1.6; text-align: center;">
        Dauert nur 2 Minuten – versprochen! ⏱️
      </p>

      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

      <p style="font-size: 14px; color: #999; text-align: center;">
        Du erhältst diese E-Mail, weil du dich als Beta-Tester registriert hast.<br>
        Bei Fragen antworte einfach auf diese E-Mail.
      </p>
    </div>
  </div>
`;

// 2. ERINNERUNG (Tag 4) - Lila Design, persönlicher
const secondReminderHtml = `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 16px 16px 0 0; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">💬 Kurz 2 Minuten Zeit?</h1>
    </div>

    <div style="background: #f5f5f7; padding: 30px; border-radius: 0 0 16px 16px;">
      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Hallo nochmal!
      </p>

      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Ich wollte mich nur kurz melden – du nutzt Contract AI jetzt seit ein paar Tagen und ich würde mich riesig über deine Meinung freuen.
      </p>

      <p style="font-size: 16px; color: #333; line-height: 1.6;">
        Als kleines Ein-Mann-Startup ist <strong>jedes einzelne Feedback Gold wert</strong> für mich. Es hilft mir zu verstehen, was gut funktioniert und wo ich noch nachbessern muss.
      </p>

      <div style="background: white; border-radius: 12px; padding: 20px; margin: 25px 0; border-left: 4px solid #667eea;">
        <p style="font-size: 15px; color: #333; line-height: 1.6; margin: 0;">
          <strong>Was mich interessiert:</strong><br>
          • Wie hilfreich war die Vertragsanalyse?<br>
          • Was hat dir gefallen / was nicht?<br>
          • Würdest du Contract AI weiterempfehlen?
        </p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="https://www.contract-ai.de/beta#feedback"
           style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 16px 40px; border-radius: 100px; font-size: 18px; font-weight: 600; text-decoration: none; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
          Feedback geben (2 Min.)
        </a>
      </div>

      <p style="font-size: 15px; color: #555; line-height: 1.6; text-align: center;">
        Vielen Dank, dass du Contract AI testest! 🙏<br>
        <em>– Noah, Gründer von Contract AI</em>
      </p>

      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

      <p style="font-size: 13px; color: #999; text-align: center;">
        PS: Falls du Probleme hattest oder etwas nicht funktioniert hat,<br>
        antworte einfach auf diese E-Mail – ich helfe dir gerne!
      </p>
    </div>
  </div>
`;

async function sendTestEmails() {
  try {
    // Verbindung testen
    await transporter.verify();
    console.log('✅ E-Mail-Server verbunden\n');

    // 1. Erinnerung senden
    console.log('📧 Sende 1. Erinnerung (Tag 2)...');
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
      to: testEmail,
      subject: "🧪 [TEST] 🎁 Wie gefällt dir Contract AI? Wir freuen uns auf dein Feedback!",
      html: firstReminderHtml,
    });
    console.log('✅ 1. Erinnerung gesendet!\n');

    // Kurze Pause
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 2. Erinnerung senden
    console.log('📧 Sende 2. Erinnerung (Tag 4)...');
    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
      to: testEmail,
      subject: "🧪 [TEST] 💬 Kurze Frage: Wie findest du Contract AI bisher?",
      html: secondReminderHtml,
    });
    console.log('✅ 2. Erinnerung gesendet!\n');

    console.log('🎉 Beide Test-E-Mails erfolgreich gesendet!');
    console.log(`📬 Prüfe dein Postfach: ${testEmail}`);

  } catch (error) {
    console.error('❌ Fehler beim Senden:', error.message);
    if (error.code === 'EAUTH') {
      console.error('   → E-Mail-Zugangsdaten prüfen (EMAIL_USER, EMAIL_PASS)');
    }
    if (error.code === 'ECONNECTION') {
      console.error('   → E-Mail-Server nicht erreichbar (EMAIL_HOST, EMAIL_PORT)');
    }
  }

  process.exit(0);
}

sendTestEmails();
