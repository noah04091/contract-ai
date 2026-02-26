// 📁 backend/services/triggerEmailService.js
// 📧 Behavior-based Trigger Emails - Enterprise Grade
// Sends emails based on user actions (limit reached, feature blocked, etc.)
// Includes cooldown system to prevent spam

const sendEmail = require('./mailer');
const {
  generateEmailTemplate,
  generateInfoBox,
  generateAlertBox,
  generateActionBox,
  generateParagraph,
  generateDivider
} = require('../utils/emailTemplate');
const { generateUnsubscribeUrl } = require('./emailUnsubscribeService');

// ============================================
// 📊 COOLDOWN CONFIGURATION
// Prevents sending the same email type too frequently
// ============================================
const COOLDOWN_PERIODS = {
  limitReached: 7 * 24 * 60 * 60 * 1000,      // 7 days - don't spam about limits
  featureBlocked: 3 * 24 * 60 * 60 * 1000,    // 3 days - gentle reminder
  almostAtLimit: 14 * 24 * 60 * 60 * 1000,    // 14 days - early warning
  winbackInactive: 30 * 24 * 60 * 60 * 1000   // 30 days - re-engagement
};

// ============================================
// 📧 EMAIL TEMPLATES
// ============================================

/**
 * Generate "Limit Reached" Email
 * Triggered when user exhausts their free analysis quota
 */
function generateLimitReachedEmail(user, context = {}) {
  const firstName = user.firstName || user.name?.split(' ')[0] || 'dort';
  const usedAnalyses = context.usedAnalyses || 3;
  const maxAnalyses = context.maxAnalyses || 3;

  const body = `
    ${generateParagraph(`Hallo ${firstName},`)}

    ${generateAlertBox(`Du hast diesen Monat <strong>${usedAnalyses} von ${maxAnalyses} kostenlosen Analysen</strong> verbraucht. Um weitere Verträge zu analysieren, kannst du auf Premium upgraden.`, 'warning')}

    ${generateParagraph('Wir verstehen, dass du vielleicht noch nicht bereit bist zu upgraden. Hier sind deine Optionen:')}

    ${generateActionBox([
      '<strong>Warten:</strong> Dein Kontingent wird am 1. des nächsten Monats zurückgesetzt',
      '<strong>Upgraden:</strong> Unbegrenzte Analysen ab 19€/Monat',
      '<strong>Tipp:</strong> Mit dem Business-Plan sparst du bei mehr als 4 Verträgen/Monat'
    ], { icon: '💡', title: 'Deine Optionen' })}

    ${generateInfoBox([
      { label: 'Verbrauchte Analysen', value: `${usedAnalyses}/${maxAnalyses}` },
      { label: 'Nächste Zurücksetzung', value: '1. des nächsten Monats' },
      { label: 'Business Plan', value: 'Unbegrenzt für 19€/Monat' }
    ])}

    ${generateDivider()}

    ${generateParagraph('Du hast Fragen? Antworte einfach auf diese E-Mail.', { muted: true })}
  `;

  return generateEmailTemplate({
    title: 'Dein Analyse-Kontingent ist aufgebraucht',
    body,
    badge: 'Limit erreicht',
    cta: {
      text: 'Jetzt upgraden',
      url: 'https://www.contract-ai.de/pricing'
    },
    unsubscribeUrl: generateUnsubscribeUrl(user.email, 'marketing')
  });
}

/**
 * Generate "Feature Blocked" Email
 * Triggered when user tries to access a premium feature
 */
function generateFeatureBlockedEmail(user, context = {}) {
  const firstName = user.firstName || user.name?.split(' ')[0] || 'dort';
  const featureName = context.featureName || 'Premium-Feature';
  const featureDescription = context.featureDescription || 'Diese Funktion ist nur mit einem Premium-Plan verfügbar.';

  // Feature-specific benefits
  const featureBenefits = {
    'Legal Lens': [
      'Jede Vertragsklausel in verständlicher Sprache erklärt',
      'Risiken und Fallstricke auf einen Blick erkennen',
      'Konkrete Handlungsempfehlungen erhalten'
    ],
    'Legal Pulse': [
      'Automatische Benachrichtigungen bei Gesetzesänderungen',
      'Relevante Änderungen für deine Vertragstypen',
      'Immer rechtlich auf dem neuesten Stand'
    ],
    'Optimizer': [
      'KI-gestützte Vertragsoptimierung',
      'Konkrete Formulierungsvorschläge',
      'Bessere Konditionen aushandeln'
    ],
    'Vertragsgenerator': [
      'Rechtssichere Verträge in Minuten erstellen',
      'Über 50 professionelle Vorlagen',
      'Individuell anpassbar'
    ],
    'Digitale Signatur': [
      'Rechtsgültig digital unterschreiben',
      'Keine Drucker oder Scanner nötig',
      'Automatische Benachrichtigungen'
    ]
  };

  const benefits = featureBenefits[featureName] || [
    'Zugang zu allen Premium-Features',
    'Unbegrenzte Vertragsanalysen',
    'Priority Support'
  ];

  const body = `
    ${generateParagraph(`Hallo ${firstName},`)}

    ${generateParagraph(`du hast gerade versucht, <strong>${featureName}</strong> zu nutzen. ${featureDescription}`)}

    ${generateAlertBox(`<strong>${featureName}</strong> ist ab dem Business-Plan (19€/Monat) verfügbar.`, 'info')}

    ${generateParagraph(`<strong>Was ${featureName} dir bietet:</strong>`)}

    ${generateActionBox(benefits, { icon: '✨', title: featureName })}

    ${generateInfoBox([
      { label: 'Business Plan', value: '19€/Monat' },
      { label: 'Enterprise Plan', value: '29€/Monat' },
      { label: 'Enthält', value: `${featureName} + alle Features` }
    ])}

    ${generateDivider()}

    ${generateParagraph('Noch nicht bereit? Kein Problem - du kannst Contract AI weiterhin kostenlos nutzen.', { muted: true })}
  `;

  return generateEmailTemplate({
    title: `${featureName} freischalten`,
    body,
    badge: 'Premium',
    cta: {
      text: 'Feature freischalten',
      url: 'https://www.contract-ai.de/pricing'
    },
    unsubscribeUrl: generateUnsubscribeUrl(user.email, 'marketing')
  });
}

/**
 * Generate "Almost at Limit" Email
 * Triggered when user has 1 analysis left (2/3 used)
 */
function generateAlmostAtLimitEmail(user, context = {}) {
  const firstName = user.firstName || user.name?.split(' ')[0] || 'dort';
  const usedAnalyses = context.usedAnalyses || 2;
  const maxAnalyses = context.maxAnalyses || 3;
  const remaining = maxAnalyses - usedAnalyses;

  const body = `
    ${generateParagraph(`Hallo ${firstName},`)}

    ${generateAlertBox(`Du hast noch <strong>${remaining} kostenlose Analyse${remaining === 1 ? '' : 'n'}</strong> diesen Monat übrig.`, 'info')}

    ${generateParagraph('Nur ein freundlicher Hinweis, damit du nicht überrascht wirst. Du hast folgende Optionen:')}

    ${generateActionBox([
      `<strong>Letzte Analyse nutzen:</strong> Wähle deinen wichtigsten Vertrag`,
      '<strong>Jetzt upgraden:</strong> Unbegrenzte Analysen ab 19€/Monat',
      '<strong>Warten:</strong> Kontingent wird am 1. zurückgesetzt'
    ], { icon: '⏰', title: 'Deine Optionen' })}

    ${generateInfoBox([
      { label: 'Verbraucht', value: `${usedAnalyses}/${maxAnalyses}` },
      { label: 'Übrig', value: `${remaining} Analyse${remaining === 1 ? '' : 'n'}` },
      { label: 'Business Plan', value: 'Unbegrenzt' }
    ])}

    ${generateDivider()}

    ${generateParagraph('Tipp: Die meisten Nutzer, die mehr als 3 Verträge/Monat analysieren, sparen mit dem Business-Plan.', { muted: true })}
  `;

  return generateEmailTemplate({
    title: `Noch ${remaining} Analyse${remaining === 1 ? '' : 'n'} übrig`,
    body,
    badge: 'Hinweis',
    cta: {
      text: 'Unbegrenzte Analysen',
      url: 'https://www.contract-ai.de/pricing'
    },
    unsubscribeUrl: generateUnsubscribeUrl(user.email, 'marketing')
  });
}

/**
 * Generate "Winback Inactive" Email
 * Triggered for users inactive for 30+ days
 */
function generateWinbackInactiveEmail(user, context = {}) {
  const firstName = user.firstName || user.name?.split(' ')[0] || 'dort';
  const daysSinceLastLogin = context.daysSinceLastLogin || 30;

  const body = `
    ${generateParagraph(`Hallo ${firstName},`)}

    ${generateParagraph(`wir haben bemerkt, dass du Contract AI seit ${daysSinceLastLogin} Tagen nicht mehr genutzt hast. Ist alles in Ordnung?`)}

    ${generateAlertBox('Wir haben in der Zwischenzeit einige neue Features hinzugefügt, die dich interessieren könnten.', 'info')}

    ${generateParagraph('<strong>Das ist neu bei Contract AI:</strong>')}

    ${generateActionBox([
      '🔍 <strong>Legal Lens:</strong> Klauseln in einfacher Sprache erklärt',
      '📊 <strong>Legal Pulse:</strong> Gesetzesänderungen im Blick',
      '⚡ <strong>Schnellere Analysen:</strong> Jetzt in unter 20 Sekunden',
      '📱 <strong>Mobile optimiert:</strong> Verträge von überall verwalten'
    ], { icon: '🆕', title: 'Neue Features' })}

    ${generateInfoBox([
      { label: 'Deine Verträge', value: 'Warten auf dich' },
      { label: 'Kostenlose Analysen', value: '3/Monat' },
      { label: 'Account-Status', value: 'Aktiv' }
    ])}

    ${generateDivider()}

    ${generateParagraph('Falls du Contract AI nicht mehr nutzen möchtest, kannst du dich jederzeit abmelden. Wir nehmen das nicht persönlich.', { muted: true })}

    ${generateParagraph('Bis bald!<br>Dein Contract AI Team', { muted: false })}
  `;

  return generateEmailTemplate({
    title: 'Wir vermissen dich!',
    body,
    badge: 'Willkommen zurück',
    cta: {
      text: 'Zurück zu Contract AI',
      url: 'https://www.contract-ai.de/dashboard'
    },
    unsubscribeUrl: generateUnsubscribeUrl(user.email, 'marketing')
  });
}

// ============================================
// 🔧 TRIGGER FUNCTIONS
// Call these from your API endpoints
// ============================================

/**
 * Check if we can send this email type (cooldown check)
 */
async function canSendTriggerEmail(db, userId, emailType) {
  const usersCollection = db.collection('users');
  const user = await usersCollection.findOne({ _id: userId });

  if (!user) return false;

  // Check if email notifications are disabled
  if (user.emailNotifications === false) return false;

  // Check marketing opt-out (DSGVO)
  if (user.emailPreferences?.marketing === false) return false;
  if (user.emailOptOut === true) return false;

  // Check cooldown
  const lastSent = user.triggerEmails?.[emailType];
  if (lastSent) {
    const cooldownPeriod = COOLDOWN_PERIODS[emailType] || 7 * 24 * 60 * 60 * 1000;
    const timeSinceLastSent = Date.now() - new Date(lastSent).getTime();
    if (timeSinceLastSent < cooldownPeriod) {
      console.log(`📧 [Trigger] Cooldown active for ${emailType} (${Math.round(timeSinceLastSent / (24 * 60 * 60 * 1000))} days since last send)`);
      return false;
    }
  }

  return true;
}

/**
 * Mark trigger email as sent (for cooldown tracking)
 */
async function markTriggerEmailSent(db, userId, emailType) {
  const usersCollection = db.collection('users');
  await usersCollection.updateOne(
    { _id: userId },
    {
      $set: {
        [`triggerEmails.${emailType}`]: new Date()
      }
    }
  );
}

/**
 * Send "Limit Reached" Email
 * Call this when user's analysis count reaches the limit
 */
async function sendLimitReachedEmail(db, user, context = {}) {
  try {
    // Check cooldown
    if (!await canSendTriggerEmail(db, user._id, 'limitReached')) {
      return { sent: false, reason: 'cooldown' };
    }

    // Only send to free users
    if (user.subscriptionPlan && user.subscriptionPlan !== 'free') {
      return { sent: false, reason: 'not_free_user' };
    }

    const html = generateLimitReachedEmail(user, context);
    const subject = 'Dein Analyse-Kontingent ist aufgebraucht';

    await sendEmail(user.email, subject, '', html, { unsubscribeUrl: generateUnsubscribeUrl(user.email, 'marketing') });
    await markTriggerEmailSent(db, user._id, 'limitReached');

    console.log(`📧 [Trigger] Limit Reached email sent to ${user.email}`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ [Trigger] Error sending Limit Reached email:`, error.message);
    return { sent: false, reason: 'error', error: error.message };
  }
}

/**
 * Send "Feature Blocked" Email
 * Call this when user tries to access a premium feature
 */
async function sendFeatureBlockedEmail(db, user, featureName, featureDescription = '') {
  try {
    // Check cooldown
    if (!await canSendTriggerEmail(db, user._id, 'featureBlocked')) {
      return { sent: false, reason: 'cooldown' };
    }

    // Only send to free users
    if (user.subscriptionPlan && user.subscriptionPlan !== 'free') {
      return { sent: false, reason: 'not_free_user' };
    }

    const html = generateFeatureBlockedEmail(user, { featureName, featureDescription });
    const subject = `${featureName} freischalten - Contract AI`;

    await sendEmail(user.email, subject, '', html, { unsubscribeUrl: generateUnsubscribeUrl(user.email, 'marketing') });
    await markTriggerEmailSent(db, user._id, 'featureBlocked');

    console.log(`📧 [Trigger] Feature Blocked email sent to ${user.email} (${featureName})`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ [Trigger] Error sending Feature Blocked email:`, error.message);
    return { sent: false, reason: 'error', error: error.message };
  }
}

/**
 * Send "Almost at Limit" Email
 * Call this when user has used 2/3 analyses
 */
async function sendAlmostAtLimitEmail(db, user, context = {}) {
  try {
    // Check cooldown
    if (!await canSendTriggerEmail(db, user._id, 'almostAtLimit')) {
      return { sent: false, reason: 'cooldown' };
    }

    // Only send to free users
    if (user.subscriptionPlan && user.subscriptionPlan !== 'free') {
      return { sent: false, reason: 'not_free_user' };
    }

    const html = generateAlmostAtLimitEmail(user, context);
    const subject = 'Noch 1 kostenlose Analyse übrig';

    await sendEmail(user.email, subject, '', html, { unsubscribeUrl: generateUnsubscribeUrl(user.email, 'marketing') });
    await markTriggerEmailSent(db, user._id, 'almostAtLimit');

    console.log(`📧 [Trigger] Almost at Limit email sent to ${user.email}`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ [Trigger] Error sending Almost at Limit email:`, error.message);
    return { sent: false, reason: 'error', error: error.message };
  }
}

/**
 * Send "Winback Inactive" Email
 * Call this from a cron job for inactive users
 */
async function sendWinbackInactiveEmail(db, user, context = {}) {
  try {
    // Check cooldown
    if (!await canSendTriggerEmail(db, user._id, 'winbackInactive')) {
      return { sent: false, reason: 'cooldown' };
    }

    const html = generateWinbackInactiveEmail(user, context);
    const subject = 'Wir vermissen dich bei Contract AI';

    await sendEmail(user.email, subject, '', html, { unsubscribeUrl: generateUnsubscribeUrl(user.email, 'marketing') });
    await markTriggerEmailSent(db, user._id, 'winbackInactive');

    console.log(`📧 [Trigger] Winback Inactive email sent to ${user.email}`);
    return { sent: true };
  } catch (error) {
    console.error(`❌ [Trigger] Error sending Winback Inactive email:`, error.message);
    return { sent: false, reason: 'error', error: error.message };
  }
}

/**
 * Process inactive users for winback emails
 * Called by cron job
 */
async function processWinbackEmails(db) {
  console.log('📧 Processing winback emails for inactive users...');

  const usersCollection = db.collection('users');

  // Find users who:
  // - Haven't logged in for 30+ days
  // - Have email notifications enabled
  // - Are on free plan (paid users might just be satisfied)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);

  const users = await usersCollection.find({
    lastLoginAt: { $lte: thirtyDaysAgo, $gte: sixtyDaysAgo },
    emailNotifications: { $ne: false },
    'emailPreferences.marketing': { $ne: false },
    emailOptOut: { $ne: true },
    subscriptionPlan: { $in: [null, 'free'] }
  }).toArray();

  console.log(`📧 Found ${users.length} inactive users to check`);

  let emailsSent = 0;

  for (const user of users) {
    const daysSinceLastLogin = Math.floor((Date.now() - new Date(user.lastLoginAt).getTime()) / (24 * 60 * 60 * 1000));

    const result = await sendWinbackInactiveEmail(db, user, { daysSinceLastLogin });
    if (result.sent) {
      emailsSent++;
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`📧 Winback emails processed: ${emailsSent} sent`);
  return emailsSent;
}

module.exports = {
  // Send functions (call from API endpoints)
  sendLimitReachedEmail,
  sendFeatureBlockedEmail,
  sendAlmostAtLimitEmail,
  sendWinbackInactiveEmail,

  // Batch processing (call from cron)
  processWinbackEmails,

  // Utilities
  canSendTriggerEmail,
  markTriggerEmailSent,

  // Config export for testing
  COOLDOWN_PERIODS,

  // Template generators for testing
  generateLimitReachedEmail,
  generateFeatureBlockedEmail,
  generateAlmostAtLimitEmail,
  generateWinbackInactiveEmail
};
