/**
 * 🧪 TEST SCRIPT: E-Mails mit EIGENEM HTML (nicht emailTemplate.js)
 *
 * Diese 5 E-Mails nutzen ihr eigenes Design und nicht das zentrale Template.
 *
 * Usage: node test-custom-html-emails.js <email-adresse>
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const testEmail = process.argv[2];

if (!testEmail) {
  console.error('❌ Bitte E-Mail-Adresse angeben!');
  process.exit(1);
}

console.log(`\n🧪 Test E-Mails mit EIGENEM HTML an: ${testEmail}\n`);

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT) || 587,
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// ============================================
// 1. UPLOAD-LIMIT ERREICHT (contracts.js)
// Lila Gradient Header
// ============================================
const uploadLimitHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a202c; background-color: #f7fafc;">
  <div style="background-color: #f7fafc; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">

      <!-- Header mit Lila Gradient -->
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center;">
        <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 10px 0;">⚠️ Upload-Limit erreicht</h1>
        <p style="font-size: 16px; opacity: 0.95; margin: 0;">Sie haben Ihr monatliches Limit erreicht</p>
      </div>

      <!-- Content -->
      <div style="padding: 40px 30px; background: white;">
        <p style="font-size: 18px; color: #2d3748; margin-bottom: 24px; font-weight: 500;">Hallo,</p>

        <div style="background: #fef5e7; border-left: 4px solid #f59e0b; padding: 20px; margin: 24px 0; border-radius: 6px;">
          <strong style="color: #b45309; display: block; margin-bottom: 8px; font-size: 16px;">Upload-Limit erreicht</strong>
          <p style="color: #78350f; margin: 0; font-size: 14px;">Sie haben Ihr monatliches Limit von 3 Email-Uploads erreicht. Um weitere Verträge per Email zu importieren, upgraden Sie jetzt auf Premium.</p>
        </div>

        <h2 style="font-size: 20px; font-weight: 600; color: #1a202c; margin: 32px 0 20px 0; text-align: center;">🚀 Upgrade auf Premium</h2>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.contract-ai.de/subscribe?plan=premium" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
            Jetzt upgraden
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 32px 30px; background: #f8f9fa; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 13px; color: #64748b; margin: 4px 0;">© 2025 Contract AI. Alle Rechte vorbehalten.</p>
        <p style="font-size: 13px; color: #64748b; margin: 4px 0;">
          <a href="https://www.contract-ai.de/datenschutz" style="color: #667eea; text-decoration: none;">Datenschutz</a> ·
          <a href="https://www.contract-ai.de/impressum" style="color: #667eea; text-decoration: none;">Impressum</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ============================================
// 2. IMPORT ERFOLGREICH (contracts.js)
// Grüner Gradient Header
// ============================================
const importSuccessHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a202c; background-color: #f7fafc;">
  <div style="background-color: #f7fafc; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">

      <!-- Header mit Grünem Gradient -->
      <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 40px 30px; text-align: center;">
        <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 10px 0;">✅ Import erfolgreich</h1>
        <p style="font-size: 16px; opacity: 0.95; margin: 0;">Ihre Verträge wurden erfolgreich hochgeladen</p>
      </div>

      <!-- Content -->
      <div style="padding: 40px 30px; background: white;">
        <div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 20px; margin: 24px 0; border-radius: 6px;">
          <strong style="color: #065f46; display: block; margin-bottom: 8px; font-size: 16px;">Erfolgreich importiert!</strong>
          <p style="color: #065f46; margin: 0; font-size: 14px;">3 Verträge wurden per Email importiert und stehen bereit zur Analyse.</p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="font-size: 16px; color: #1a202c; margin: 0 0 12px 0;">📄 Importierte Verträge:</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #475569; padding-left: 24px; position: relative;">📄 Mietvertrag_2024.pdf</li>
            <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #475569; padding-left: 24px; position: relative;">📄 Arbeitsvertrag_Mueller.pdf</li>
            <li style="padding: 8px 0; color: #475569; padding-left: 24px; position: relative;">📄 Handyvertrag_Telekom.pdf</li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.contract-ai.de/contracts" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
            Verträge anzeigen
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 32px 30px; background: #f8f9fa; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 13px; color: #64748b; margin: 4px 0;">© 2025 Contract AI. Alle Rechte vorbehalten.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ============================================
// 3. IMPORT FEHLGESCHLAGEN (contracts.js)
// Roter Gradient Header
// ============================================
const importFailedHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #1a202c; background-color: #f7fafc;">
  <div style="background-color: #f7fafc; padding: 40px 20px;">
    <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07);">

      <!-- Header mit Rotem Gradient -->
      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 40px 30px; text-align: center;">
        <h1 style="font-size: 28px; font-weight: 700; margin: 0 0 10px 0;">⚠️ Import fehlgeschlagen</h1>
        <p style="font-size: 16px; opacity: 0.95; margin: 0;">Einige Dateien konnten nicht verarbeitet werden</p>
      </div>

      <!-- Content -->
      <div style="padding: 40px 30px; background: white;">
        <div style="background: #fee; border-left: 4px solid #ef4444; padding: 20px; margin: 24px 0; border-radius: 6px;">
          <strong style="color: #991b1b; display: block; margin-bottom: 8px; font-size: 16px;">Fehler beim Email-Import</strong>
          <p style="color: #991b1b; margin: 0; font-size: 14px;">2 Dateien konnten nicht verarbeitet werden. Bitte überprüfen Sie die Dateien und versuchen Sie es erneut.</p>
        </div>

        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="font-size: 16px; color: #1a202c; margin: 0 0 12px 0;">❌ Fehlgeschlagene Dateien:</h3>
          <ul style="list-style: none; padding: 0; margin: 0;">
            <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0; color: #dc2626; font-size: 14px;"><strong>dokument.docx:</strong> Nur PDF-Dateien werden unterstützt</li>
            <li style="padding: 8px 0; color: #dc2626; font-size: 14px;"><strong>vertrag.pdf:</strong> Datei ist beschädigt oder verschlüsselt</li>
          </ul>
        </div>

        <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 24px 0; border-radius: 6px; font-size: 14px; color: #1e40af;">
          <strong>Tipp:</strong> Stellen Sie sicher, dass Ihre Dateien im PDF-Format vorliegen und nicht passwortgeschützt sind.
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://www.contract-ai.de/contracts" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
            Erneut versuchen
          </a>
        </div>
      </div>

      <!-- Footer -->
      <div style="text-align: center; padding: 32px 30px; background: #f8f9fa; border-top: 1px solid #e2e8f0;">
        <p style="font-size: 13px; color: #64748b; margin: 4px 0;">© 2025 Contract AI. Alle Rechte vorbehalten.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

// ============================================
// 4. TEAM-EINLADUNG (organizations.js)
// Sehr einfaches Design ohne Header
// ============================================
const teamInviteHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
      <h2 style="margin: 0 0 20px 0; color: #333;">🎉 Einladung zu Acme GmbH</h2>
      <p style="color: #555; line-height: 1.6;">Du wurdest eingeladen, dem Team von <strong>Acme GmbH</strong> auf Contract AI beizutreten!</p>

      <p style="color: #555;"><strong>Deine Rolle:</strong> Administrator</p>

      <div style="margin: 30px 0;">
        <a href="https://www.contract-ai.de/accept-invite/abc123" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
          Einladung annehmen
        </a>
      </div>

      <p style="color: #666; font-size: 13px;">
        Oder kopiere diesen Link in deinen Browser:<br/>
        <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">https://www.contract-ai.de/accept-invite/abc123</code>
      </p>

      <p style="color: #666; font-size: 13px;">
        Diese Einladung ist 7 Tage gültig.
      </p>
    </div>
  </div>
</body>
</html>
`;

// ============================================
// 5. LEGAL PULSE ALERT (pulseNotificationService.js)
// Lila/Indigo Gradient Header
// ============================================
const legalPulseHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">

    <!-- Header mit Lila Gradient -->
    <div style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">⚡ Legal Pulse Alert</h1>
    </div>

    <!-- Content -->
    <div style="background-color: white; padding: 30px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">

      <!-- Severity Badge -->
      <div style="margin-bottom: 20px;">
        <span style="display: inline-block; padding: 6px 12px; background-color: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 6px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
          HIGH Priority
        </span>
      </div>

      <!-- Title -->
      <h2 style="color: #1e293b; margin: 0 0 15px 0; font-size: 20px;">
        Neues BGH-Urteil zu AGB-Klauseln
      </h2>

      <!-- Description -->
      <p style="color: #64748b; line-height: 1.6; margin: 0 0 25px 0;">
        Der Bundesgerichtshof hat heute ein wichtiges Urteil zu unwirksamen AGB-Klauseln gefällt. Dies könnte Auswirkungen auf Ihre bestehenden Verträge haben.
      </p>

      <!-- Law Reference -->
      <div style="background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
        <p style="margin: 0; color: #475569; font-size: 14px;">
          <strong>Betroffen:</strong> BGB §307 (Verbraucherschutz)
        </p>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-top: 30px;">
        <a href="https://www.contract-ai.de/legalpulse" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">
          Details anzeigen
        </a>
      </div>

      <!-- Footer -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">
          Diese Benachrichtigung wurde automatisch von Legal Pulse generiert.
        </p>
        <p style="color: #94a3b8; font-size: 12px; margin: 10px 0 0 0;">
          <a href="https://www.contract-ai.de/legalpulse" style="color: #6366f1; text-decoration: none;">Legal Pulse Dashboard öffnen</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>
`;

const emails = [
  {
    name: "1. Upload-Limit erreicht (contracts.js)",
    subject: "🧪 [EIGENES HTML] ⚠️ Email-Upload Limit erreicht",
    html: uploadLimitHtml
  },
  {
    name: "2. Import erfolgreich (contracts.js)",
    subject: "🧪 [EIGENES HTML] ✅ 3 Verträge erfolgreich importiert",
    html: importSuccessHtml
  },
  {
    name: "3. Import fehlgeschlagen (contracts.js)",
    subject: "🧪 [EIGENES HTML] ⚠️ Email-Import fehlgeschlagen",
    html: importFailedHtml
  },
  {
    name: "4. Team-Einladung (organizations.js)",
    subject: "🧪 [EIGENES HTML] Einladung zum Team von Acme GmbH",
    html: teamInviteHtml
  },
  {
    name: "5. Legal Pulse Alert (pulseNotificationService.js)",
    subject: "🧪 [EIGENES HTML] 🔔 Neues BGH-Urteil zu AGB-Klauseln",
    html: legalPulseHtml
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
    console.log(`\n🎉 Alle ${emails.length} E-Mails mit EIGENEM HTML gesendet!`);
    console.log(`📬 Prüfe dein Postfach: ${testEmail}`);
    console.log('\n⚠️ Diese E-Mails nutzen NICHT das zentrale emailTemplate.js!');
    console.log('   Sie haben eigene Designs mit bunten Gradient-Headers.');

  } catch (error) {
    console.error('❌ Fehler:', error.message);
  }

  process.exit(0);
}

sendTestEmails();
