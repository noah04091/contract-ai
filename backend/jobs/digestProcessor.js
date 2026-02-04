// 📁 backend/jobs/digestProcessor.js
// Process and send daily/weekly alert digests

const { MongoClient, ObjectId } = require('mongodb');
const sendEmailHtml = require('../utils/sendEmailHtml');
const {
  generateEmailTemplate,
  generateInfoBox,
  generateAlertBox,
  generateStatsRow,
  generateDivider,
  generateParagraph
} = require('../utils/emailTemplate');

class DigestProcessor {
  constructor() {
    this.mongoClient = null;
    this.db = null;
  }

  async connect() {
    if (!this.mongoClient) {
      this.mongoClient = new MongoClient(process.env.MONGO_URI);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db('contract_ai');
    }
  }

  /**
   * Process daily digests
   * Called by cron job every day at 8 AM
   */
  async processDailyDigests() {
    console.log('\n📬 Processing Daily Digests...');
    console.log('='.repeat(70));

    await this.connect();

    const digestQueueCollection = this.db.collection('digest_queue');
    const usersCollection = this.db.collection('users');

    // Find all queued alerts for daily digest
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const dailyAlerts = await digestQueueCollection.find({
      digestMode: 'daily',
      queued: true,
      sent: false,
      queuedAt: { $gte: yesterday }
    }).toArray();

    console.log(`   Found ${dailyAlerts.length} queued daily alerts`);

    if (dailyAlerts.length === 0) {
      console.log('   ✅ No daily digests to send');
      return { sent: 0, errors: 0 };
    }

    // Group by user
    const alertsByUser = this.groupByUser(dailyAlerts);
    console.log(`   Grouped into ${alertsByUser.size} users`);

    let sent = 0;
    let errors = 0;

    // Send digest to each user
    for (const [userId, alerts] of alertsByUser) {
      try {
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
          console.log(`   ⚠️  User ${userId} not found, skipping`);
          continue;
        }

        // Respect user's email notification preference
        if (user.legalPulseSettings?.emailNotifications === false) {
          console.log(`   ⏭️  User ${user.email} has email notifications disabled, skipping`);
          continue;
        }

        await this.sendDigestEmail(user, alerts, 'daily');

        // Mark alerts as sent
        const alertIds = alerts.map(a => a._id);
        await digestQueueCollection.updateMany(
          { _id: { $in: alertIds } },
          { $set: { sent: true, sentAt: new Date() } }
        );

        sent++;
        console.log(`   ✅ Daily digest sent to ${user.email} (${alerts.length} alerts)`);

      } catch (error) {
        console.error(`   ❌ Error sending digest to user ${userId}:`, error);
        errors++;
      }
    }

    console.log(`\n   📊 Daily Digest Summary: ${sent} sent, ${errors} errors`);
    console.log('='.repeat(70));

    return { sent, errors };
  }

  /**
   * Process weekly digests
   * Called by cron job every Monday at 8 AM
   */
  async processWeeklyDigests() {
    console.log('\n📬 Processing Weekly Digests...');
    console.log('='.repeat(70));

    await this.connect();

    const digestQueueCollection = this.db.collection('digest_queue');
    const usersCollection = this.db.collection('users');

    // Find all queued alerts for weekly digest
    const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const weeklyAlerts = await digestQueueCollection.find({
      digestMode: 'weekly',
      queued: true,
      sent: false,
      queuedAt: { $gte: lastWeek }
    }).toArray();

    console.log(`   Found ${weeklyAlerts.length} queued weekly alerts`);

    if (weeklyAlerts.length === 0) {
      console.log('   ✅ No weekly digests to send');
      return { sent: 0, errors: 0 };
    }

    // Group by user
    const alertsByUser = this.groupByUser(weeklyAlerts);
    console.log(`   Grouped into ${alertsByUser.size} users`);

    let sent = 0;
    let errors = 0;

    // Send digest to each user
    for (const [userId, alerts] of alertsByUser) {
      try {
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
          console.log(`   ⚠️  User ${userId} not found, skipping`);
          continue;
        }

        // Respect user's email notification preference
        if (user.legalPulseSettings?.emailNotifications === false) {
          console.log(`   ⏭️  User ${user.email} has email notifications disabled, skipping`);
          continue;
        }

        await this.sendDigestEmail(user, alerts, 'weekly');

        // Mark alerts as sent
        const alertIds = alerts.map(a => a._id);
        await digestQueueCollection.updateMany(
          { _id: { $in: alertIds } },
          { $set: { sent: true, sentAt: new Date() } }
        );

        sent++;
        console.log(`   ✅ Weekly digest sent to ${user.email} (${alerts.length} alerts)`);

      } catch (error) {
        console.error(`   ❌ Error sending digest to user ${userId}:`, error);
        errors++;
      }
    }

    console.log(`\n   📊 Weekly Digest Summary: ${sent} sent, ${errors} errors`);
    console.log('='.repeat(70));

    return { sent, errors };
  }

  /**
   * Group alerts by user
   */
  groupByUser(alerts) {
    const grouped = new Map();

    for (const alert of alerts) {
      const userId = alert.userId.toString();

      if (!grouped.has(userId)) {
        grouped.set(userId, []);
      }

      grouped.get(userId).push(alert);
    }

    return grouped;
  }

  /**
   * Send digest email to user (uses shared Clean3 email template)
   */
  async sendDigestEmail(user, alerts, digestMode) {
    const isDaily = digestMode === 'daily';
    const period = isDaily ? 'heute' : 'diese Woche';
    const periodTitle = isDaily ? 'Tägliche' : 'Wöchentliche';

    // Separate regular alerts from weekly check alerts
    const regularAlerts = alerts.filter(a => a.type !== 'weekly_legal_check');
    const weeklyCheckAlerts = alerts.filter(a => a.type === 'weekly_legal_check');

    // Sort alerts by score (highest first)
    regularAlerts.sort((a, b) => b.score - a.score);

    // === Build body HTML using shared template helpers ===
    let body = '';

    // Summary stats
    const totalFindings = alerts.reduce((sum, a) => sum + (a.findings?.length || 0), 0);
    body += generateStatsRow([
      { value: alerts.length, label: alerts.length === 1 ? 'Änderung' : 'Änderungen', color: '#3b82f6' },
      { value: totalFindings, label: totalFindings === 1 ? 'Befund' : 'Befunde', color: totalFindings > 0 ? '#f59e0b' : '#22c55e' },
      { value: weeklyCheckAlerts.length, label: weeklyCheckAlerts.length === 1 ? 'Vertrag' : 'Verträge', color: '#0f172a' }
    ]);

    body += generateParagraph(
      `Wir haben ${period} <strong>${alerts.length} relevante ${alerts.length === 1 ? 'Änderung' : 'Änderungen'}</strong> gefunden, die Ihre Verträge betreffen ${alerts.length === 1 ? 'könnte' : 'könnten'}.`
    );

    // === Weekly Check Results ===
    if (weeklyCheckAlerts.length > 0) {
      body += generateDivider();
      body += `<p style="margin: 0 0 4px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Rechtsänderungs-Überwachung</p>`;
      body += generateParagraph('Auswirkungen neu erkannter Rechtsänderungen auf Ihre Verträge (basierend auf 20 offiziellen Quellen)', { muted: true });

      for (const alert of weeklyCheckAlerts) {
        body += this.generateWeeklyCheckCardHtml(alert);
      }
    }

    // === Regular Alerts ===
    if (regularAlerts.length > 0) {
      body += generateDivider();
      body += `<p style="margin: 0 0 16px 0; font-size: 16px; font-weight: 700; color: #0f172a;">Gesetzesänderungen im Überblick</p>`;

      for (const alert of regularAlerts) {
        body += this.generateRegularAlertCardHtml(alert);
      }
    }

    // === How it works ===
    body += generateDivider();
    body += generateInfoBox([
      { label: 'Wie funktioniert das?', value: `Unsere KI analysiert neue Rechtsänderungen aus 20 offiziellen Quellen und prüft automatisch die Auswirkungen auf Ihre Verträge. Sie erhalten ${isDaily ? 'täglich' : 'wöchentlich'} eine Zusammenfassung.` }
    ]);

    // === Disclaimer ===
    body += generateAlertBox(
      '<strong>Wichtiger Hinweis:</strong> Diese Analyse wurde KI-gestützt erstellt und dient ausschließlich der Vorinformation. Sie ersetzt keine anwaltliche Beratung und stellt keine Rechtsberatung dar. Für verbindliche rechtliche Einschätzungen wenden Sie sich bitte an einen Rechtsanwalt. Alle Angaben ohne Gewähr.',
      'warning'
    );

    // === Generate email with shared template ===
    const emailHtml = generateEmailTemplate({
      title: `${periodTitle} Legal Pulse Digest`,
      badge: `${alerts.length} ${alerts.length === 1 ? 'Änderung' : 'Änderungen'}`,
      preheader: `${alerts.length} relevante Rechtsänderungen ${period} erkannt`,
      body,
      cta: {
        text: 'Legal Pulse öffnen',
        url: 'https://www.contract-ai.de/legal-pulse'
      }
    });

    await sendEmailHtml(
      user.email,
      `${periodTitle} Legal Pulse Digest – ${alerts.length} ${alerts.length === 1 ? 'Änderung' : 'Änderungen'}`,
      emailHtml
    );
  }

  /**
   * Generate a single weekly check alert card (table-based, email-safe)
   */
  generateWeeklyCheckCardHtml(alert) {
    const severityConfig = {
      kritisch: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b', label: 'Kritisch' },
      handlungsbedarf: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', label: 'Handlungsbedarf' },
      aktuell: { bg: '#f0fdf4', border: '#22c55e', text: '#166534', label: 'Aktuell' }
    };

    const status = alert.score >= 0.95 ? 'kritisch' : (alert.score >= 0.5 ? 'handlungsbedarf' : 'aktuell');
    const colors = severityConfig[status];

    // Metadata row
    let metadataHtml = '';
    if (alert.metadata) {
      metadataHtml = `
              <tr>
                <td style="padding: 8px 16px; font-size: 12px; color: #64748b; background-color: #f8fafc; border-top: 1px solid #e2e8f0;">
                  Analysiert: ${alert.metadata.analyzedPercentage || 100}% · Geprüft gegen: ${alert.metadata.dataSourcesUsed?.length || '?'} Quellen · Konfidenz: ${Math.round((alert.metadata.confidenceScore || 0.5) * 100)}%
                </td>
              </tr>`;
    }

    // Findings list
    let findingsHtml = '';
    if (alert.findings && alert.findings.length > 0) {
      const findingRows = alert.findings.map(f => {
        const sevColors = { critical: '#dc2626', warning: '#f59e0b', info: '#3b82f6' };
        const sevLabels = { critical: 'Kritisch', warning: 'Warnung', info: 'Info' };
        const sevColor = sevColors[f.severity] || '#64748b';
        const sevLabel = sevLabels[f.severity] || f.severity;

        let findingContent = `
                <tr>
                  <td style="padding: 12px 16px; border-top: 1px solid #e2e8f0;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <span style="display: inline-block; padding: 2px 8px; background-color: ${sevColor}; color: #ffffff; font-size: 10px; font-weight: 600; border-radius: 3px; text-transform: uppercase; letter-spacing: 0.3px;">${sevLabel}</span>
                          <span style="margin-left: 8px; font-size: 14px; font-weight: 600; color: #0f172a;">${f.title || ''}</span>
                        </td>
                      </tr>
                    </table>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #334155; line-height: 1.5;">${f.description || ''}</p>`;

        if (f.legalBasis) {
          findingContent += `<p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Rechtsgrundlage: ${f.legalBasis}</p>`;
        }
        if (f.recommendation) {
          findingContent += `<p style="margin: 4px 0 0 0; font-size: 12px; color: #059669;">Empfehlung: ${f.recommendation}</p>`;
        }

        findingContent += `
                  </td>
                </tr>`;
        return findingContent;
      }).join('');

      findingsHtml = findingRows;
    }

    return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 12px 0; border-radius: 8px; overflow: hidden; border-left: 4px solid ${colors.border};">
                <tr>
                  <td style="background-color: ${colors.bg}; padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top;">
                          <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${colors.text};">${alert.contractName}</p>
                          <p style="margin: 4px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">${alert.lawDescription || ''}</p>
                        </td>
                        <td style="vertical-align: top; text-align: right; width: 110px;">
                          <span style="display: inline-block; padding: 4px 12px; background-color: ${colors.border}; color: #ffffff; font-size: 11px; font-weight: 600; border-radius: 12px;">${colors.label}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                ${metadataHtml}
                ${findingsHtml}
              </table>`;
  }

  /**
   * Generate a single regular alert card (table-based, email-safe)
   */
  generateRegularAlertCardHtml(alert) {
    const severityColors = {
      critical: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
      high: { bg: '#fff7ed', border: '#ea580c', text: '#9a3412' },
      medium: { bg: '#fef3c7', border: '#f59e0b', text: '#92400e' },
      low: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' }
    };

    const severity = this.calculateSeverity(alert.score);
    const colors = severityColors[severity];
    const scorePercent = (alert.score * 100).toFixed(0);

    return `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin: 12px 0; border-radius: 8px; overflow: hidden; border-left: 4px solid ${colors.border};">
                <tr>
                  <td style="background-color: ${colors.bg}; padding: 16px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="vertical-align: top;">
                          <p style="margin: 0; font-size: 15px; font-weight: 700; color: ${colors.text};">${alert.lawTitle}</p>
                          <p style="margin: 6px 0 0 0; font-size: 13px; color: #64748b; line-height: 1.5;">${alert.lawDescription || ''}</p>
                          <p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">Betroffener Vertrag: <strong style="color: #334155;">${alert.contractName}</strong></p>
                        </td>
                        <td style="vertical-align: top; text-align: right; width: 60px;">
                          <span style="display: inline-block; padding: 4px 10px; background-color: ${colors.border}; color: #ffffff; font-size: 13px; font-weight: 700; border-radius: 12px;">${scorePercent}%</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>`;
  }

  /**
   * Calculate severity based on score
   */
  calculateSeverity(score) {
    if (score >= 0.95) return 'critical';
    if (score >= 0.90) return 'high';
    if (score >= 0.85) return 'medium';
    return 'low';
  }

  /**
   * Cleanup old sent digests (keep for 30 days)
   */
  async cleanup() {
    await this.connect();

    const digestQueueCollection = this.db.collection('digest_queue');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await digestQueueCollection.deleteMany({
      sent: true,
      sentAt: { $lte: thirtyDaysAgo }
    });

    console.log(`   🗑️  Cleaned up ${result.deletedCount} old digest entries`);
  }

  async close() {
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}

module.exports = DigestProcessor;
