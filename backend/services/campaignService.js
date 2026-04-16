// 📁 backend/services/campaignService.js
// Campaign Service — Bulk-Email für Marketing/Newsletter
// SAFETY-PRINZIP: Keine versehentlichen Mails. Campaigns starten immer als 'draft'.
// Erst explizites queueCampaign() aktiviert den Versand durch den Cron.

const { ObjectId } = require('mongodb');
const cheerio = require('cheerio');
const database = require('../config/database');
const { generateEmailTemplate } = require('../utils/emailTemplate');
const { generateUnsubscribeUrl } = require('./emailUnsubscribeService');
const { logSentEmail } = require('../utils/emailLogger');
const sendEmail = require('./mailer');
const { generateOpenToken, generateClickToken } = require('./campaignTrackingService');

const API_BASE_URL = process.env.API_BASE_URL || 'https://api.contract-ai.de';

// Konfiguration
const MAX_RECIPIENTS_PER_CAMPAIGN = 5000;
const BATCH_SIZE = 10;
const SEND_DELAY_MS = 2000;
const MIN_INTERVAL_BETWEEN_CAMPAIGNS_MS = 5 * 60 * 1000; // 5 Minuten Rate-Limit pro Admin
const MAX_SCHEDULE_AHEAD_MS = 365 * 24 * 60 * 60 * 1000; // 1 Jahr max. Vorlauf

function parseScheduledFor(value) {
  if (!value) return null;
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    throw new Error('Ungültiges Datum für scheduledFor');
  }
  const now = Date.now();
  if (date.getTime() <= now) {
    throw new Error('scheduledFor muss in der Zukunft liegen');
  }
  if (date.getTime() > now + MAX_SCHEDULE_AHEAD_MS) {
    throw new Error('scheduledFor max. 1 Jahr im Voraus');
  }
  return date;
}

const VALID_STATUSES = ['draft', 'queued', 'sending', 'completed', 'failed', 'cancelled'];

let indexesEnsured = false;

async function ensureIndexes(db) {
  if (indexesEnsured) return;
  try {
    await Promise.all([
      db.collection('email_campaigns').createIndex({ status: 1, createdAt: -1 }),
      db.collection('email_campaigns').createIndex({ createdBy: 1, createdAt: -1 }),
      db.collection('campaign_recipients').createIndex({ campaignId: 1, status: 1 }),
      db.collection('campaign_recipients').createIndex({ campaignId: 1 })
    ]);
    indexesEnsured = true;
  } catch (err) {
    console.warn('[campaignService] Index creation skipped:', err.message);
  }
}

// ========================================================================
// RECIPIENT-QUERY
// Baut MongoDB-Query mit HARTCODIERTEN DSGVO-Filtern + User-Filtern.
// Diese Safety-Filter sind NICHT überschreibbar.
// ========================================================================
function buildRecipientQuery(filter = {}) {
  const query = {
    // Hartcodierte Safety-Filter — können NICHT deaktiviert werden
    email: { $exists: true, $ne: null, $ne: '' },
    verified: true,
    emailOptOut: { $ne: true },
    $and: [
      {
        $or: [
          { 'emailPreferences.marketing': { $ne: false } },
          { 'emailPreferences.marketing': { $exists: false } }
        ]
      }
    ]
  };

  // Optional: User-Filter
  if (filter.userIds && Array.isArray(filter.userIds) && filter.userIds.length > 0) {
    // Explizite User-IDs überschreiben alle anderen Filter
    const ids = filter.userIds.map((id) => {
      try { return new ObjectId(id); } catch { return id; }
    });
    query._id = { $in: ids };
    return query;
  }

  // Emails: Exakte String-Matches (Emails kommen direkt aus der DB-Suche, Case stimmt)
  if (filter.emails && Array.isArray(filter.emails) && filter.emails.length > 0) {
    const emails = filter.emails.filter(Boolean).slice(0, 100);
    query.email = { $in: emails };
    return query;
  }

  if (filter.plan) {
    if (Array.isArray(filter.plan)) {
      query.subscriptionPlan = { $in: filter.plan };
    } else {
      query.subscriptionPlan = filter.plan;
    }
  }

  if (filter.subscriptionActive === true) {
    query.subscriptionActive = true;
  }

  if (filter.minAnalysisCount !== undefined && filter.minAnalysisCount !== null) {
    query.analysisCount = { $gte: Number(filter.minAnalysisCount) };
  }

  if (filter.createdAfter) {
    query.createdAt = query.createdAt || {};
    query.createdAt.$gte = new Date(filter.createdAfter);
  }
  if (filter.createdBefore) {
    query.createdAt = query.createdAt || {};
    query.createdAt.$lte = new Date(filter.createdBefore);
  }

  return query;
}

// Prüft, ob eine Email in der email_health Collection als inaktiv/quarantine markiert ist.
// Für Marketing-Mails schließen wir beide Status aus (SMTP-Reputation schützen).
async function filterByEmailHealth(db, emails) {
  if (!emails || emails.length === 0) return new Set();
  const unhealthy = await db.collection('email_health')
    .find({
      email: { $in: emails },
      status: { $in: ['inactive', 'quarantine'] }
    })
    .project({ email: 1 })
    .toArray();
  return new Set(unhealthy.map((e) => e.email));
}

// Prüft, ob eine Email in email_unsubscribes für Marketing eingetragen ist.
async function filterByUnsubscribes(db, emails) {
  if (!emails || emails.length === 0) return new Set();
  const unsubs = await db.collection('email_unsubscribes')
    .find({
      email: { $in: emails },
      $or: [
        { category: 'marketing' },
        { category: 'all' }
      ]
    })
    .project({ email: 1 })
    .toArray();
  return new Set(unsubs.map((e) => e.email));
}

// ========================================================================
// PREVIEW: Empfängeranzahl aus Filter — SENDET NICHTS
// ========================================================================
async function previewRecipients(filter = {}) {
  const db = await database.connect();
  await ensureIndexes(db);

  const query = buildRecipientQuery(filter);

  const users = await db.collection('users')
    .find(query, { projection: { _id: 1, email: 1, subscriptionPlan: 1, verified: 1 } })
    .limit(MAX_RECIPIENTS_PER_CAMPAIGN + 1)
    .toArray();

  const emails = users.map((u) => u.email).filter(Boolean);
  const [unhealthyEmails, unsubscribedEmails] = await Promise.all([
    filterByEmailHealth(db, emails),
    filterByUnsubscribes(db, emails)
  ]);

  const eligibleUsers = users.filter(
    (u) => !unhealthyEmails.has(u.email) && !unsubscribedEmails.has(u.email)
  );

  return {
    total: users.length,
    eligible: eligibleUsers.length,
    excludedByHealth: unhealthyEmails.size,
    excludedByUnsubscribe: unsubscribedEmails.size,
    overLimit: users.length > MAX_RECIPIENTS_PER_CAMPAIGN,
    maxAllowed: MAX_RECIPIENTS_PER_CAMPAIGN,
    sample: eligibleUsers.slice(0, 5).map((u) => ({
      _id: String(u._id),
      email: u.email,
      subscriptionPlan: u.subscriptionPlan || null
    }))
  };
}

// ========================================================================
// EMAIL-HTML generieren (nutzt bestehendes Template-System)
// ========================================================================
// Hinweis: Tracking-Disclosure erfolgt über Datenschutzerklärung + Marketing-Consent,
// nicht pro Mail. Unsubscribe-Link ist ohnehin via RFC 8058 + Footer gesetzt.

/**
 * Schreibt alle https-Links in HTML-Body um auf Click-Tracker.
 * - Nur https:// wird umgeschrieben (Whitelist-Prinzip)
 * - mailto:, tel:, # (Anker), http:// werden NICHT angefasst
 * - Bei Parse-Fehler: Original zurück (Fail-Safe)
 */
function rewriteLinksForTracking(html, campaignId, recipientId) {
  if (!html || !campaignId || !recipientId) return html;
  try {
    const clickToken = generateClickToken(campaignId, recipientId);
    const trackerBase = `${API_BASE_URL}/api/track/click/${clickToken}`;
    // Fragment-Mode: cheerio fügt KEIN <html>/<body> hinzu
    const $ = cheerio.load(html, null, false);
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href');
      if (!href || typeof href !== 'string') return;
      if (!/^https:\/\//i.test(href)) return; // nur https
      const newHref = `${trackerBase}?u=${encodeURIComponent(href)}`;
      $(el).attr('href', newHref);
    });
    return $.root().html() || html;
  } catch (err) {
    console.warn('[campaignService] Link-Rewrite fehlgeschlagen, nutze Original:', err && err.message);
    return html;
  }
}

function rewriteCtaUrlForTracking(url, campaignId, recipientId) {
  if (!url || !campaignId || !recipientId) return url;
  if (!/^https:\/\//i.test(url)) return url;
  const clickToken = generateClickToken(campaignId, recipientId);
  return `${API_BASE_URL}/api/track/click/${clickToken}?u=${encodeURIComponent(url)}`;
}

function buildCampaignHtml(campaign, recipientEmail, recipientId) {
  const unsubscribeUrl = generateUnsubscribeUrl(recipientEmail, 'marketing');
  const trackOpens = campaign.trackOpens !== false; // default: an
  const trackClicks = campaign.trackClicks !== false; // default: an

  let bodyHtml = campaign.body || '';

  // Click-Tracking: Links in body umschreiben
  if (trackClicks && recipientId && campaign._id) {
    bodyHtml = rewriteLinksForTracking(bodyHtml, campaign._id, recipientId);
  }

  // Open-Tracking-Pixel injizieren
  if (trackOpens && recipientId) {
    const openToken = generateOpenToken(campaign._id || 'unknown', recipientId);
    const pixelUrl = `${API_BASE_URL}/api/track/open/${openToken}`;
    bodyHtml += `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;" />`;
  }

  const templateData = {
    title: campaign.title || campaign.subject || '',
    preheader: campaign.preheader || campaign.subject || '',
    body: bodyHtml,
    unsubscribeUrl
  };

  if (campaign.ctaText && campaign.ctaUrl) {
    const finalCtaUrl = trackClicks && recipientId && campaign._id
      ? rewriteCtaUrlForTracking(campaign.ctaUrl, campaign._id, recipientId)
      : campaign.ctaUrl;
    templateData.cta = { text: campaign.ctaText, url: finalCtaUrl };
  }

  return generateEmailTemplate(templateData);
}

// ========================================================================
// TEST-CAMPAIGN: Sendet EINE Mail an EINE Adresse. Erstellt keine Campaign.
// ========================================================================
async function sendTestCampaign(campaignData, testEmail) {
  if (!testEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
    throw new Error('Ungültige Test-Email-Adresse');
  }
  if (!campaignData || !campaignData.subject) {
    throw new Error('Campaign-Daten unvollständig (subject fehlt)');
  }

  // Test-Mail: kein Tracking (kein recipientId vorhanden, und Tests sollen Stats nicht verfälschen)
  const testCampaignData = { ...campaignData, trackOpens: false };
  const html = buildCampaignHtml(testCampaignData, testEmail, null);
  const subject = `[TEST] ${campaignData.subject}`;

  const unsubscribeUrl = generateUnsubscribeUrl(testEmail, 'marketing');

  await sendEmail(
    testEmail,
    subject,
    campaignData.title || campaignData.subject,
    html,
    { unsubscribeUrl }
  );

  return { sent: true, to: testEmail, subject };
}

// ========================================================================
// CREATE CAMPAIGN: Status='draft' — wird NICHT vom Cron verarbeitet.
// ========================================================================
async function createCampaign(data, adminUser) {
  if (!data || !data.subject || !data.title || !data.body) {
    throw new Error('Pflichtfelder fehlen (subject, title, body)');
  }
  if (data.subject.length > 200) throw new Error('Subject zu lang (max 200)');
  if (data.title.length > 200) throw new Error('Title zu lang (max 200)');
  if (data.body.length > 50000) throw new Error('Body zu lang (max 50000 Zeichen)');

  const db = await database.connect();
  await ensureIndexes(db);

  // Rate-Limit: max 1 Campaign pro 5 Min pro Admin
  if (adminUser && adminUser.userId) {
    const recent = await db.collection('email_campaigns').findOne({
      createdBy: adminUser.userId,
      createdAt: { $gte: new Date(Date.now() - MIN_INTERVAL_BETWEEN_CAMPAIGNS_MS) }
    });
    if (recent) {
      throw new Error('Rate-Limit: Bitte warte 5 Minuten zwischen Campaign-Erstellungen');
    }
  }

  // Recipients ermitteln
  const query = buildRecipientQuery(data.segmentFilter || {});
  const users = await db.collection('users')
    .find(query, { projection: { _id: 1, email: 1 } })
    .limit(MAX_RECIPIENTS_PER_CAMPAIGN + 1)
    .toArray();

  if (users.length > MAX_RECIPIENTS_PER_CAMPAIGN) {
    throw new Error(`Zu viele Empfänger (${users.length} > Max ${MAX_RECIPIENTS_PER_CAMPAIGN}). Filter einschränken.`);
  }

  const emails = users.map((u) => u.email).filter(Boolean);
  const [unhealthyEmails, unsubscribedEmails] = await Promise.all([
    filterByEmailHealth(db, emails),
    filterByUnsubscribes(db, emails)
  ]);

  const eligibleUsers = users.filter(
    (u) => u.email && !unhealthyEmails.has(u.email) && !unsubscribedEmails.has(u.email)
  );

  if (eligibleUsers.length === 0) {
    throw new Error('Keine berechtigten Empfänger gefunden');
  }

  // Campaign-Dokument anlegen
  const campaignDoc = {
    name: data.name || data.subject,
    subject: data.subject,
    preheader: data.preheader || null,
    title: data.title,
    body: data.body,
    ctaText: data.ctaText || null,
    ctaUrl: data.ctaUrl || null,
    segmentFilter: data.segmentFilter || {},
    recipientCount: eligibleUsers.length,
    status: 'draft',
    scheduledFor: null,
    trackOpens: data.trackOpens !== false, // default AN
    trackClicks: data.trackClicks !== false, // default AN (für Commit 3D)
    createdBy: adminUser ? String(adminUser.userId) : null,
    createdByEmail: adminUser ? adminUser.email : null,
    createdAt: new Date(),
    queuedAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    stats: {
      total: eligibleUsers.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      opens: 0,
      uniqueOpens: 0,
      clicks: 0,
      uniqueClicks: 0
    }
  };

  const campaignResult = await db.collection('email_campaigns').insertOne(campaignDoc);
  const campaignId = campaignResult.insertedId;

  // Recipients-Liste anlegen
  const recipientDocs = eligibleUsers.map((u) => ({
    campaignId,
    userId: u._id,
    email: u.email,
    status: 'pending',
    sentAt: null,
    messageId: null,
    error: null,
    skippedReason: null,
    createdAt: new Date()
  }));

  if (recipientDocs.length > 0) {
    await db.collection('campaign_recipients').insertMany(recipientDocs);
  }

  return {
    campaignId: String(campaignId),
    recipientCount: eligibleUsers.length,
    status: 'draft'
  };
}

// ========================================================================
// QUEUE CAMPAIGN: Wechselt status von 'draft' → 'queued'.
// Ab jetzt wird Cron die Campaign verarbeiten (ggf. mit scheduledFor-Verzögerung).
// ========================================================================
async function queueCampaign(campaignId, options = {}) {
  const db = await database.connect();
  const _id = new ObjectId(campaignId);

  const scheduledFor = parseScheduledFor(options.scheduledFor);

  const update = {
    $set: {
      status: 'queued',
      queuedAt: new Date(),
      scheduledFor: scheduledFor // null = sofort, Date = geplant
    }
  };

  const result = await db.collection('email_campaigns').findOneAndUpdate(
    { _id, status: 'draft' },
    update,
    { returnDocument: 'after' }
  );

  const doc = result.value || result; // mongodb driver compat
  if (!doc || !doc._id) {
    throw new Error('Campaign nicht gefunden oder nicht im Draft-Status');
  }

  return {
    campaignId: String(doc._id),
    status: doc.status,
    scheduledFor: doc.scheduledFor ? doc.scheduledFor.toISOString() : null
  };
}

// ========================================================================
// CANCEL CAMPAIGN: Setzt status auf 'cancelled'. Cron skippt sie ab dann.
// ========================================================================
async function cancelCampaign(campaignId) {
  const db = await database.connect();
  const _id = new ObjectId(campaignId);

  const result = await db.collection('email_campaigns').findOneAndUpdate(
    { _id, status: { $in: ['draft', 'queued', 'sending'] } },
    { $set: { status: 'cancelled', cancelledAt: new Date() } },
    { returnDocument: 'after' }
  );

  const doc = result.value || result;
  if (!doc || !doc._id) {
    throw new Error('Campaign nicht gefunden oder bereits abgeschlossen');
  }

  return { campaignId: String(doc._id), status: doc.status };
}

// ========================================================================
// PROCESS NEXT BATCH: Wird vom Cron aufgerufen.
// Sendet die nächsten N Empfänger einer 'queued'/'sending' Campaign.
// ========================================================================
async function processNextBatch(campaignId, batchSize = BATCH_SIZE) {
  const db = await database.connect();
  const _id = new ObjectId(campaignId);

  const campaign = await db.collection('email_campaigns').findOne({ _id });
  if (!campaign) return { done: true, reason: 'not_found' };
  if (campaign.status === 'cancelled' || campaign.status === 'completed' || campaign.status === 'failed') {
    return { done: true, reason: `status_${campaign.status}` };
  }

  // Auf 'sending' setzen falls noch 'queued'
  if (campaign.status === 'queued') {
    await db.collection('email_campaigns').updateOne(
      { _id, status: 'queued' },
      { $set: { status: 'sending', startedAt: new Date() } }
    );
  }

  const pending = await db.collection('campaign_recipients')
    .find({ campaignId: _id, status: 'pending' })
    .limit(batchSize)
    .toArray();

  if (pending.length === 0) {
    // Keine pending mehr — als completed markieren
    const stats = await computeStats(db, _id);
    await db.collection('email_campaigns').updateOne(
      { _id },
      { $set: { status: 'completed', completedAt: new Date(), stats } }
    );
    return { done: true, reason: 'completed' };
  }

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of pending) {
    // Re-check Cancellation in jedem Schritt (spät-cancel-sichere)
    const fresh = await db.collection('email_campaigns').findOne(
      { _id },
      { projection: { status: 1 } }
    );
    if (!fresh || fresh.status === 'cancelled') {
      break;
    }

    try {
      const html = buildCampaignHtml(campaign, recipient.email, recipient._id);
      const unsubscribeUrl = generateUnsubscribeUrl(recipient.email, 'marketing');

      await sendEmail(
        recipient.email,
        campaign.subject,
        campaign.title || campaign.subject,
        html,
        { unsubscribeUrl }
      );

      logSentEmail({
        to: recipient.email,
        subject: campaign.subject,
        category: `campaign_${String(_id).slice(-6)}`,
        userId: recipient.userId ? String(recipient.userId) : null,
        source: 'services/campaignService.js'
      }).catch(() => {});

      await db.collection('campaign_recipients').updateOne(
        { _id: recipient._id },
        { $set: { status: 'sent', sentAt: new Date() } }
      );
      sentCount++;
    } catch (err) {
      await db.collection('campaign_recipients').updateOne(
        { _id: recipient._id },
        { $set: { status: 'failed', error: String(err && err.message || err) } }
      );
      failedCount++;
      console.error(`[campaignService] Send failed to ${recipient.email}:`, err && err.message);
    }

    // Pause zwischen Sends
    if (pending.indexOf(recipient) < pending.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, SEND_DELAY_MS));
    }
  }

  // Stats aktualisieren
  const stats = await computeStats(db, _id);
  await db.collection('email_campaigns').updateOne(
    { _id },
    { $set: { stats } }
  );

  return { done: false, sent: sentCount, failed: failedCount };
}

async function computeStats(db, campaignId) {
  const counts = await db.collection('campaign_recipients').aggregate([
    { $match: { campaignId } },
    { $group: { _id: '$status', count: { $sum: 1 } } }
  ]).toArray();

  const stats = { total: 0, sent: 0, failed: 0, skipped: 0, pending: 0 };
  for (const c of counts) {
    if (c._id in stats) stats[c._id] = c.count;
    stats.total += c.count;
  }
  return stats;
}

// ========================================================================
// LIST + DETAILS für Admin-UI
// ========================================================================
async function listCampaigns({ limit = 50, page = 1 } = {}) {
  const db = await database.connect();
  await ensureIndexes(db);

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(200, Math.max(1, Number(limit) || 50));
  const skip = (pageNum - 1) * limitNum;

  const [campaigns, total] = await Promise.all([
    db.collection('email_campaigns')
      .find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .toArray(),
    db.collection('email_campaigns').countDocuments({})
  ]);

  return {
    campaigns,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum)
    }
  };
}

async function getCampaignDetails(campaignId, { includeRecipients = false } = {}) {
  const db = await database.connect();
  const _id = new ObjectId(campaignId);

  const campaign = await db.collection('email_campaigns').findOne({ _id });
  if (!campaign) return null;

  // Aktuelle Stats neu berechnen
  const deliveryStats = await computeStats(db, _id);
  campaign.stats = { ...(campaign.stats || {}), ...deliveryStats };

  // Top-Clicked URLs aus campaign_events aggregieren
  try {
    const topClicks = await db.collection('campaign_events').aggregate([
      { $match: { campaignId: _id, type: 'click' } },
      { $group: { _id: '$url', clicks: { $sum: 1 }, uniqueClickers: { $addToSet: '$recipientId' } } },
      { $project: { url: '$_id', clicks: 1, uniqueClickers: { $size: '$uniqueClickers' }, _id: 0 } },
      { $sort: { clicks: -1 } },
      { $limit: 5 }
    ]).toArray();
    campaign.topClicks = topClicks;
  } catch {
    campaign.topClicks = [];
  }

  if (includeRecipients) {
    campaign.recipients = await db.collection('campaign_recipients')
      .find({ campaignId: _id })
      .limit(200)
      .toArray();
  }

  return campaign;
}

module.exports = {
  buildRecipientQuery,
  previewRecipients,
  createCampaign,
  queueCampaign,
  cancelCampaign,
  sendTestCampaign,
  processNextBatch,
  listCampaigns,
  getCampaignDetails,
  MAX_RECIPIENTS_PER_CAMPAIGN,
  BATCH_SIZE
};
