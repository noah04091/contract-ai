/**
 * 🧪 TEST SCRIPT: E-Mails mit ALTEM Design (emailTemplate.js)
 *
 * Usage: node test-old-design-emails.js <email-adresse>
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const generateEmailTemplate = require('./utils/emailTemplate');

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Bitte E-Mail-Adresse angeben!');
  process.exit(1);
}

console.log(`\n🧪 Test E-Mails mit ALTEM Design an: ${testEmail}\n`);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// E-Mails mit dem ALTEN emailTemplate.js Design
const emails = [
  {
    name: "1. Verifizierung (ALTES Design)",
    subject: "🧪 [ALTES DESIGN] E-Mail bestätigen",
    html: generateEmailTemplate({
      title: "Willkommen bei Contract AI! 🚀",
      preheader: "Bestätigen Sie Ihre E-Mail-Adresse",
      body: `
        <p style="text-align: center;">
          Vielen Dank für Ihre Registrierung bei Contract AI.<br>
          Klicken Sie auf den Button, um Ihr Konto zu aktivieren.
        </p>
      `,
      cta: {
        text: "🚀 E-Mail-Adresse jetzt bestätigen",
        url: "https://www.contract-ai.de/verify?token=TEST"
      }
    })
  },
  {
    name: "2. Willkommen (ALTES Design)",
    subject: "🧪 [ALTES DESIGN] Willkommen bei Contract AI",
    html: generateEmailTemplate({
      title: "🎉 Herzlich Willkommen bei Contract AI!",
      preheader: "Ihr Konto ist jetzt aktiviert",
      body: `
        <p style="text-align: center;">
          <strong>Glückwunsch!</strong> Ihre E-Mail-Adresse wurde erfolgreich bestätigt.
          Sie können jetzt die volle Power von Contract AI nutzen!
        </p>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0;">
          <h3>🎯 Ihre nächsten Schritte:</h3>
          <ol>
            <li>Ersten Vertrag hochladen</li>
            <li>KI-Analyse starten</li>
            <li>Optimierungsvorschläge erhalten</li>
          </ol>
        </div>
      `,
      cta: {
        text: "🚀 Jetzt zum Dashboard",
        url: "https://www.contract-ai.de/dashboard"
      }
    })
  },
  {
    name: "3. Kündigungsbestätigung (ALTES Design)",
    subject: "🧪 [ALTES DESIGN] ✅ Kündigungsbestätigung",
    html: generateEmailTemplate({
      title: "Ihre Kündigung wurde versendet",
      preheader: "Bestätigung der Kündigung",
      body: `
        <h2 style="color: #34c759;">✅ Kündigung erfolgreich versendet!</h2>

        <p>Ihre Kündigung für <strong>Telekom Mobilfunk</strong> wurde soeben an den Anbieter gesendet.</p>

        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
          <h3>📋 Details:</h3>
          <ul style="list-style: none; padding: 0;">
            <li>📅 <strong>Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</li>
            <li>📧 <strong>Gesendet an:</strong> Telekom</li>
            <li>🆔 <strong>Referenz-ID:</strong> KND-2025-001234</li>
          </ul>
        </div>

        <p><strong>Tipp:</strong> Bewahren Sie diese E-Mail als Nachweis auf.</p>
      `,
      cta: {
        text: "Kündigungen verwalten",
        url: "https://www.contract-ai.de/cancellations"
      }
    })
  },
  {
    name: "4. Fristenerinnerung (ALTES Design)",
    subject: "🧪 [ALTES DESIGN] ⚠️ Kündigungsfrist endet bald",
    html: generateEmailTemplate({
      title: "⚠️ Wichtige Erinnerung",
      preheader: "Kündigungsfrist endet in 14 Tagen",
      body: `
        <p>In <strong>14 Tagen</strong> endet die Kündigungsfrist für "Vodafone Mobilfunk".</p>

        <div style="background: #fffbeb; border-left: 4px solid #ff9500; padding: 15px; margin: 20px 0;">
          <h3>⏰ Zeitplan:</h3>
          <ul style="list-style: none; padding: 0;">
            <li>📅 <strong>Heute:</strong> ${new Date().toLocaleDateString('de-DE')}</li>
            <li>🔔 <strong>Kündigungsfrist endet:</strong> in 14 Tagen</li>
            <li>📍 <strong>Anbieter:</strong> Vodafone</li>
          </ul>
        </div>

        <p>Verpassen Sie nicht die Chance, zu kündigen oder bessere Konditionen zu finden!</p>
      `,
      cta: {
        text: "📅 Zur Kündigung",
        url: "https://www.contract-ai.de/cancel/123"
      }
    })
  },
  {
    name: "5. Passwort Reset (ALTES Design)",
    subject: "🧪 [ALTES DESIGN] Passwort zurücksetzen",
    html: generateEmailTemplate({
      title: "Passwort zurücksetzen",
      preheader: "Sie haben eine Passwort-Zurücksetzung angefordert",
      body: `
        <p style="text-align: center;">
          Sie haben angefordert, Ihr Passwort zurückzusetzen.<br>
          Klicken Sie auf den Button unten, um ein neues Passwort festzulegen.
        </p>

        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
          <p style="margin: 0; color: #666;">
            <strong>⏰ Gültig für:</strong> 1 Stunde<br>
            Falls Sie dies nicht angefordert haben, ignorieren Sie diese E-Mail.
          </p>
        </div>
      `,
      cta: {
        text: "Neues Passwort festlegen",
        url: "https://www.contract-ai.de/reset-password?token=TEST"
      }
    })
  }
];

async function sendTestEmails() {
  try {
    await transporter.verify();
    console.log('✅ E-Mail-Server verbunden\n');
    console.log('═'.repeat(50));

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];
      console.log(`\n📧 Sende ${email.name}...`);

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || "Contract AI <no-reply@contract-ai.de>",
        to: testEmail,
        subject: email.subject,
        html: email.html,
      });

      console.log(`✅ ${email.name} gesendet!`);

      if (i < emails.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`\n🎉 Alle ${emails.length} E-Mails mit ALTEM Design gesendet!`);
    console.log(`📬 Prüfe dein Postfach: ${testEmail}`);
    console.log('\n⚠️ Diese E-Mails zeigen das AKTUELLE Design im Backend!');
    console.log('   Vergleiche sie mit den "[TEST]" E-Mails (neues V4 Design)');

  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }

  process.exit(0);
}

sendTestEmails();
