// 📁 backend/jobs/digestProcessor.js
// Process and send daily/weekly alert digests

const { MongoClient, ObjectId } = require('mongodb');
const sendEmailHtml = require('../utils/sendEmailHtml');

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
   * Send digest email to user
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

    // Generate regular alert items HTML
    const alertItemsHtml = regularAlerts.map(alert => {
      const severityColors = {
        critical: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b' },
        high: { bg: '#fff7ed', border: '#ea580c', text: '#9a3412' },
        medium: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
        low: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' }
      };

      const severity = this.calculateSeverity(alert.score);
      const colors = severityColors[severity];

      return `
        <div style="background: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 20px; margin-bottom: 16px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <h3 style="margin: 0; color: ${colors.text}; font-size: 16px; flex: 1;">${alert.lawTitle}</h3>
            <span style="background: ${colors.border}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; white-space: nowrap; margin-left: 12px;">${(alert.score * 100).toFixed(0)}%</span>
          </div>
          <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px;">${alert.lawDescription || ''}</p>
          <p style="margin: 0; color: #9ca3af; font-size: 13px;">
            <strong>Betroffener Vertrag:</strong> ${alert.contractName}
          </p>
        </div>
      `;
    }).join('');

    // Generate weekly check HTML section
    const weeklyCheckHtml = this.generateWeeklyCheckHtml(weeklyCheckAlerts);

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${periodTitle} Legal Pulse Digest</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #f3f4f6; }
    .container { max-width: 650px; margin: 0 auto; background: white; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0 0 8px; font-size: 28px; }
    .header p { margin: 0; opacity: 0.95; font-size: 15px; }
    .content { padding: 40px 30px; }
    .summary-box { background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 24px; margin-bottom: 32px; text-align: center; }
    .summary-box h2 { margin: 0 0 12px; color: #1e40af; font-size: 20px; }
    .summary-box p { margin: 0; color: #1e40af; font-size: 15px; }
    .footer { background: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 4px 0; color: #6b7280; font-size: 13px; }
    .footer a { color: #3b82f6; text-decoration: none; }
    .cta-button { display: inline-block; margin-top: 24px; padding: 14px 32px; background: #3b82f6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .cta-button:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📬 ${periodTitle} Legal Pulse Digest</h1>
      <p>Ihre Gesetzesänderungs-Zusammenfassung</p>
    </div>

    <div class="content">
      <div class="summary-box">
        <h2>${alerts.length} ${alerts.length === 1 ? 'relevante Änderung' : 'relevante Änderungen'} ${period}</h2>
        <p>Wir haben ${alerts.length} Gesetzesänderung${alerts.length === 1 ? '' : 'en'} gefunden, die für Ihre Verträge relevant sein ${alerts.length === 1 ? 'könnte' : 'könnten'}.</p>
      </div>

      ${weeklyCheckHtml}

      ${regularAlerts.length > 0 ? `
      <h2 style="color: #111827; margin: 0 0 24px; font-size: 20px;">📋 Gesetzesänderungen im Überblick</h2>
      ${alertItemsHtml}
      ` : ''}

      <div style="background: #f9fafb; border-radius: 12px; padding: 24px; margin-top: 32px; text-align: center;">
        <p style="margin: 0 0 16px; color: #374151; font-size: 15px;">Möchten Sie sofortige Benachrichtigungen erhalten?</p>
        <a href="https://www.contract-ai.de/profile" class="cta-button">Einstellungen ändern</a>
      </div>

      <p style="color: #6b7280; font-size: 14px; margin-top: 32px; line-height: 1.6;">
        <strong>Wie funktioniert das?</strong><br>
        Unsere KI analysiert täglich neue Gesetze und vergleicht sie automatisch mit allen Ihren Verträgen. Sie erhalten ${isDaily ? 'jeden Tag' : 'jede Woche'} eine Zusammenfassung aller relevanten Änderungen.
      </p>

      <div style="background: #fef3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 16px; margin-top: 24px;">
        <p style="margin: 0; color: #856404; font-size: 13px; line-height: 1.6;">
          <strong>Wichtiger Hinweis:</strong> Diese Analyse wurde KI-gest${String.fromCharCode(252)}tzt erstellt und dient
          ausschlie${String.fromCharCode(223)}lich der Vorinformation. Sie ersetzt keine anwaltliche Beratung und stellt
          keine Rechtsberatung dar. F${String.fromCharCode(252)}r verbindliche rechtliche Einsch${String.fromCharCode(228)}tzungen wenden Sie sich
          bitte an einen Rechtsanwalt. Alle Angaben ohne Gew${String.fromCharCode(228)}hr.
        </p>
      </div>
    </div>

    <div class="footer">
      <p><strong>Contract AI</strong> – Legal Pulse Monitoring</p>
      <p>
        <a href="https://www.contract-ai.de/legal-pulse">Legal Pulse</a> •
        <a href="https://www.contract-ai.de/optimizer">Optimizer</a> •
        <a href="https://www.contract-ai.de/profile">Einstellungen</a>
      </p>
      <p style="margin-top: 16px;">© ${new Date().getFullYear()} Contract AI. Alle Rechte vorbehalten.</p>
    </div>
  </div>
</body>
</html>
    `;

    await sendEmailHtml(
      user.email,
      `📬 ${periodTitle} Legal Pulse Digest – ${alerts.length} ${alerts.length === 1 ? 'Änderung' : 'Änderungen'}`,
      emailHtml
    );
  }

  /**
   * Generate HTML section for weekly legal check results
   */
  generateWeeklyCheckHtml(weeklyCheckAlerts) {
    if (!weeklyCheckAlerts || weeklyCheckAlerts.length === 0) return '';

    const statusColors = {
      kritisch: { bg: '#fef2f2', border: '#dc2626', text: '#991b1b', label: 'Kritisch' },
      handlungsbedarf: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e', label: 'Handlungsbedarf' },
      aktuell: { bg: '#f0fdf4', border: '#16a34a', text: '#166534', label: 'Aktuell' }
    };

    const findingsHtml = weeklyCheckAlerts.map(alert => {
      const status = alert.score >= 0.95 ? 'kritisch' : 'handlungsbedarf';
      const colors = statusColors[status];

      let findingsListHtml = '';
      if (alert.findings && alert.findings.length > 0) {
        findingsListHtml = alert.findings.map(f => {
          const sevColors = {
            critical: '#dc2626',
            warning: '#f59e0b',
            info: '#3b82f6'
          };
          const sevColor = sevColors[f.severity] || '#6b7280';

          return `
            <div style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="background: ${sevColor}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;">${f.severity}</span>
                <strong style="color: #111827; font-size: 14px;">${f.title}</strong>
              </div>
              <p style="margin: 4px 0; color: #374151; font-size: 13px;">${f.description}</p>
              ${f.legalBasis ? `<p style="margin: 2px 0 0; color: #6b7280; font-size: 12px;">Rechtsgrundlage: ${f.legalBasis}</p>` : ''}
              ${f.recommendation ? `<p style="margin: 2px 0 0; color: #059669; font-size: 12px;">Empfehlung: ${f.recommendation}</p>` : ''}
            </div>
          `;
        }).join('');
      }

      return `
        <div style="background: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 20px; margin-bottom: 16px; border-radius: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px;">
            <h3 style="margin: 0; color: ${colors.text}; font-size: 16px; flex: 1;">${alert.contractName}</h3>
            <span style="background: ${colors.border}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; white-space: nowrap; margin-left: 12px;">${colors.label}</span>
          </div>
          <p style="margin: 0 0 12px; color: #6b7280; font-size: 14px;">${alert.lawDescription || ''}</p>
          ${alert.metadata ? `
          <div style="display: flex; gap: 16px; padding: 8px 12px; background: rgba(255,255,255,0.6); border-radius: 6px; margin-bottom: 12px; font-size: 12px; color: #6b7280;">
            <span>Analysiert: ${alert.metadata.analyzedPercentage || 100}%</span>
            <span>Quellen: ${alert.metadata.dataSourcesUsed?.length || '?'}</span>
            <span>Konfidenz: ${Math.round((alert.metadata.confidenceScore || 0.5) * 100)}%</span>
          </div>
          ` : ''}
          ${findingsListHtml ? `<div style="background: white; border-radius: 8px; overflow: hidden;">${findingsListHtml}</div>` : ''}
        </div>
      `;
    }).join('');

    return `
      <div style="margin-bottom: 32px;">
        <h2 style="color: #111827; margin: 0 0 8px; font-size: 20px;">🔍 Wöchentliche Rechtsänderungs-Überwachung</h2>
        <p style="color: #6b7280; margin: 0 0 24px; font-size: 14px;">Auswirkungen neu erkannter Rechtsänderungen auf Ihre Verträge (basierend auf 20 offiziellen Quellen)</p>
        ${findingsHtml}
      </div>
    `;
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
