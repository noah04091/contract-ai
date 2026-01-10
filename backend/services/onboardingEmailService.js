// 📁 backend/services/onboardingEmailService.js
// 📧 Onboarding Email Sequence - Enterprise Grade
// Sends automated emails to guide new users

const sendEmail = require('./mailer');
const {
  generateEmailTemplate,
  generateInfoBox,
  generateAlertBox,
  generateActionBox,
  generateParagraph,
  generateDivider
} = require('../utils/emailTemplate');

// Email sequence configuration
const EMAIL_SEQUENCE = {
  welcome: {
    delay: 0, // Immediately after registration
    subject: 'Willkommen bei Contract AI - Dein Start in die intelligente Vertragswelt'
  },
  firstContract: {
    delay: 2 * 24 * 60 * 60 * 1000, // 2 days
    subject: 'Hast du schon deinen ersten Vertrag hochgeladen?'
  },
  features: {
    delay: 7 * 24 * 60 * 60 * 1000, // 7 days
    subject: 'Entdecke diese 3 Features - perfekt für dich'
  }
};

/**
 * Generate Welcome Email (Day 0)
 */
function generateWelcomeEmail(user) {
  // 🆕 Nutze firstName aus Registrierung, Fallback auf name oder 'dort'
  const firstName = user.firstName || user.name?.split(' ')[0] || 'dort';

  const body = `
    ${generateParagraph(`Hallo ${firstName},`)}

    ${generateParagraph('herzlich willkommen bei Contract AI! Du bist jetzt Teil von über 5.000 Nutzern, die ihre Verträge intelligent verwalten.')}

    ${generateInfoBox([
      { label: 'Dein Account', value: user.email },
      { label: 'Plan', value: user.subscriptionPlan === 'free' ? 'Free (3 Analysen/Monat)' : user.subscriptionPlan },
      { label: 'Status', value: 'Aktiv' }
    ], { title: 'Deine Account-Details' })}

    ${generateActionBox([
      'Lade deinen ersten Vertrag hoch',
      'Starte eine KI-Analyse',
      'Entdecke den Fristenkalender'
    ], { icon: '🚀', title: 'Deine ersten Schritte' })}

    ${generateParagraph('Mit Contract AI kannst du:')}

    ${generateParagraph('<strong>🔍 Verträge analysieren</strong> - Unsere KI erkennt Risiken und Fallstricke in Sekunden.')}
    ${generateParagraph('<strong>📅 Fristen verwalten</strong> - Nie wieder eine Kündigungsfrist verpassen.')}
    ${generateParagraph('<strong>✨ Verträge optimieren</strong> - Konkrete Verbesserungsvorschläge für bessere Konditionen.')}

    ${generateDivider()}

    ${generateParagraph('Bei Fragen sind wir für dich da. Antworte einfach auf diese E-Mail oder schau in unser Hilfe-Center.', { muted: true })}

    ${generateParagraph('Viel Erfolg mit deinen Verträgen!<br><br>Dein Contract AI Team', { muted: false })}
  `;

  return generateEmailTemplate({
    title: `Willkommen bei Contract AI, ${firstName}!`,
    body,
    badge: 'Willkommen',
    cta: {
      text: 'Zum Dashboard',
      url: 'https://www.contract-ai.de/dashboard'
    }
  });
}

/**
 * Generate First Contract Reminder Email (Day 2)
 */
function generateFirstContractEmail(user) {
  // 🆕 Nutze firstName aus Registrierung, Fallback auf name oder 'dort'
  const firstName = user.firstName || user.name?.split(' ')[0] || 'dort';

  const body = `
    ${generateParagraph(`Hallo ${firstName},`)}

    ${generateParagraph('vor 2 Tagen hast du dich bei Contract AI registriert. Wir haben bemerkt, dass du noch keinen Vertrag hochgeladen hast.')}

    ${generateAlertBox('Tipp: Starte mit einem einfachen Vertrag wie einem Handyvertrag oder Mietvertrag. Unsere KI erkennt automatisch den Vertragstyp!', 'info')}

    ${generateParagraph('<strong>So funktioniert es:</strong>')}

    ${generateActionBox([
      'Gehe zu "Verträge" in deinem Dashboard',
      'Klicke auf "Vertrag hochladen"',
      'Wähle eine PDF-Datei aus',
      'Die KI analysiert den Vertrag in wenigen Sekunden'
    ], { icon: '📄', title: 'Vertrag hochladen in 4 Schritten' })}

    ${generateInfoBox([
      { label: 'Unterstützte Formate', value: 'PDF, DOC, DOCX' },
      { label: 'Maximale Größe', value: '10 MB' },
      { label: 'Analysezeit', value: 'ca. 30 Sekunden' }
    ])}

    ${generateDivider()}

    ${generateParagraph('Du hast bereits Verträge hochgeladen? Dann ignoriere diese E-Mail einfach.', { muted: true })}
  `;

  return generateEmailTemplate({
    title: 'Dein erster Vertrag wartet!',
    body,
    badge: 'Erinnerung',
    cta: {
      text: 'Jetzt Vertrag hochladen',
      url: 'https://www.contract-ai.de/contracts'
    }
  });
}

/**
 * Generate Features Email (Day 7)
 */
function generateFeaturesEmail(user) {
  // 🆕 Nutze firstName aus Registrierung, Fallback auf name oder 'dort'
  const firstName = user.firstName || user.name?.split(' ')[0] || 'dort';

  // Get features based on user's use case (from onboarding) or default
  const useCase = user.onboarding?.profile?.primaryUseCase || 'analyze';

  const featuresByUseCase = {
    analyze: [
      { icon: '🔍', title: 'Legal Lens', desc: 'Jede Vertragsklausel verständlich erklärt. Klicke auf eine Klausel und erhalte sofort eine Erklärung in einfacher Sprache.', url: '/legal-lens' },
      { icon: '⚡', title: 'Optimizer', desc: 'Lass die KI deinen Vertrag optimieren. Du erhältst konkrete Vorschläge für bessere Formulierungen.', url: '/optimizer' },
      { icon: '📊', title: 'Legal Pulse', desc: 'Bleibe informiert über Gesetzesänderungen, die deine Verträge betreffen könnten.', url: '/legalpulse' }
    ],
    generate: [
      { icon: '✍️', title: 'Vertragsgenerator', desc: 'Erstelle rechtssichere Verträge in Minuten. Wähle aus verschiedenen Vorlagen.', url: '/Generate' },
      { icon: '🔧', title: 'Contract Builder', desc: 'Visueller Drag & Drop Editor für individuelle Verträge.', url: '/contract-builder' },
      { icon: '✒️', title: 'Digitale Signatur', desc: 'Lasse Verträge rechtsgültig digital unterschreiben.', url: '/envelopes' }
    ],
    manage: [
      { icon: '📅', title: 'Fristenkalender', desc: 'Alle wichtigen Termine auf einen Blick. Automatische Erinnerungen vor Ablauf.', url: '/calendar' },
      { icon: '📁', title: 'Smart Folders', desc: 'Organisiere deine Verträge automatisch mit KI-basierter Kategorisierung.', url: '/contracts' },
      { icon: '📊', title: 'Legal Pulse', desc: 'Werde benachrichtigt, wenn Gesetzesänderungen deine Verträge betreffen.', url: '/legalpulse' }
    ],
    sign: [
      { icon: '✒️', title: 'Signatur-Dashboard', desc: 'Verwalte alle Signaturanfragen an einem Ort.', url: '/envelopes' },
      { icon: '👥', title: 'Multi-Signatur', desc: 'Lasse Dokumente von mehreren Personen unterschreiben.', url: '/envelopes/new' },
      { icon: '🔔', title: 'Status-Tracking', desc: 'Verfolge den Unterschriftenstatus in Echtzeit.', url: '/envelopes' }
    ]
  };

  const features = featuresByUseCase[useCase] || featuresByUseCase.analyze;

  const featuresHtml = features.map(f => `
    ${generateParagraph(`<strong>${f.icon} ${f.title}</strong><br>${f.desc}`)}
  `).join('');

  const body = `
    ${generateParagraph(`Hallo ${firstName},`)}

    ${generateParagraph('du nutzt Contract AI jetzt seit einer Woche. Hier sind 3 Features, die perfekt zu dir passen:')}

    ${featuresHtml}

    ${generateDivider()}

    ${generateAlertBox('Premium-Tipp: Mit einem Upgrade erhältst du unbegrenzte Analysen und Zugang zu allen Features.', 'info')}

    ${generateParagraph('Hast du Fragen zu einem Feature? Antworte einfach auf diese E-Mail!', { muted: true })}
  `;

  return generateEmailTemplate({
    title: '3 Features für dich entdeckt',
    body,
    badge: 'Für dich',
    cta: {
      text: 'Features entdecken',
      url: 'https://www.contract-ai.de/dashboard'
    }
  });
}

/**
 * Check which emails should be sent to a user
 */
function getEmailsToSend(user) {
  const emailsToSend = [];
  const now = Date.now();
  const registrationTime = new Date(user.createdAt).getTime();

  // Get already sent emails
  const sentEmails = user.onboarding?.emailSequence || {};

  // Check each email in sequence
  Object.entries(EMAIL_SEQUENCE).forEach(([emailType, config]) => {
    const shouldSendAfter = registrationTime + config.delay;
    const alreadySent = sentEmails[emailType];

    if (!alreadySent && now >= shouldSendAfter) {
      // Special conditions for some emails
      if (emailType === 'firstContract') {
        // Only send if user hasn't uploaded a contract yet
        const hasContracts = user.onboarding?.checklist?.firstContractUploaded;
        if (hasContracts) return;
      }

      emailsToSend.push({
        type: emailType,
        subject: config.subject
      });
    }
  });

  return emailsToSend;
}

/**
 * Send an onboarding email
 */
async function sendOnboardingEmail(user, emailType) {
  let html;
  let subject;

  switch (emailType) {
    case 'welcome':
      html = generateWelcomeEmail(user);
      subject = EMAIL_SEQUENCE.welcome.subject;
      break;
    case 'firstContract':
      html = generateFirstContractEmail(user);
      subject = EMAIL_SEQUENCE.firstContract.subject;
      break;
    case 'features':
      html = generateFeaturesEmail(user);
      subject = EMAIL_SEQUENCE.features.subject;
      break;
    default:
      throw new Error(`Unknown email type: ${emailType}`);
  }

  // Send the email
  await sendEmail(
    user.email,
    subject,
    '', // Plain text fallback (empty for now)
    html
  );

  console.log(`📧 Onboarding email sent: ${emailType} to ${user.email}`);

  return true;
}

/**
 * Process onboarding emails for all users
 * Called by cron job
 */
async function processOnboardingEmails(db) {
  console.log('📧 Processing onboarding emails...');

  const usersCollection = db.collection('users');

  // Find users who might need onboarding emails
  // - Created in the last 14 days
  // - Have email notifications enabled
  // - Not unsubscribed
  const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);

  const users = await usersCollection.find({
    createdAt: { $gte: twoWeeksAgo },
    emailNotifications: { $ne: false },
    'onboarding.emailSequence.unsubscribed': { $ne: true }
  }).toArray();

  console.log(`📧 Found ${users.length} users to check for onboarding emails`);

  let emailsSent = 0;

  for (const user of users) {
    try {
      const emailsToSend = getEmailsToSend(user);

      for (const email of emailsToSend) {
        await sendOnboardingEmail(user, email.type);

        // Mark email as sent
        await usersCollection.updateOne(
          { _id: user._id },
          {
            $set: {
              [`onboarding.emailSequence.${email.type}`]: new Date()
            }
          }
        );

        emailsSent++;

        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ Error sending onboarding email to ${user.email}:`, error.message);
    }
  }

  console.log(`📧 Onboarding emails processed: ${emailsSent} sent`);
  return emailsSent;
}

/**
 * Send welcome email immediately after registration
 */
async function sendWelcomeEmailNow(user, db) {
  try {
    await sendOnboardingEmail(user, 'welcome');

    // Mark as sent in database
    const usersCollection = db.collection('users');
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          'onboarding.emailSequence.welcome': new Date()
        }
      }
    );

    return true;
  } catch (error) {
    console.error(`❌ Error sending welcome email to ${user.email}:`, error.message);
    return false;
  }
}

module.exports = {
  processOnboardingEmails,
  sendWelcomeEmailNow,
  sendOnboardingEmail,
  getEmailsToSend,
  EMAIL_SEQUENCE,
  // Export generators for testing
  generateWelcomeEmail,
  generateFirstContractEmail,
  generateFeaturesEmail
};
