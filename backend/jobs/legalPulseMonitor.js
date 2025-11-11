// 📁 backend/jobs/legalPulseMonitor.js
// Legal Pulse Automated Monitoring with Cron

const cron = require("node-cron");
const { MongoClient, ObjectId } = require("mongodb");
const EmbeddingService = require("../services/embeddingService");
const VectorStore = require("../services/vectorStore");
const sendEmailHtml = require("../utils/sendEmailHtml");
const { broadcastToUser } = require("../routes/legalPulseFeed");

class LegalPulseMonitor {
  constructor() {
    this.embeddingService = new EmbeddingService();
    this.vectorStore = new VectorStore();
    this.mongoClient = null;
    this.db = null;
    this.isRunning = false;
  }

  /**
   * Initialize monitoring service
   */
  async init() {
    try {
      // Connect to MongoDB
      this.mongoClient = new MongoClient(process.env.MONGO_URI);
      await this.mongoClient.connect();
      this.db = this.mongoClient.db("contract_ai");

      // Initialize vector store
      await this.vectorStore.init();

      console.log("✅ [LEGAL-PULSE:MONITOR] Initialized");

      // Setup cron job if enabled
      if (process.env.LEGAL_PULSE_CRON_ENABLED === 'true') {
        const cronExpr = process.env.LEGAL_PULSE_CRON_EXPR || '15 3 * * *';

        cron.schedule(cronExpr, async () => {
          await this.runMonitoring();
        });

        console.log(`✅ [CRON] Legal Pulse monitoring scheduled (${cronExpr})`);
      } else {
        console.log("ℹ️  [CRON] Legal Pulse monitoring disabled (set LEGAL_PULSE_CRON_ENABLED=true)");
      }

    } catch (error) {
      console.error("❌ [LEGAL-PULSE:MONITOR] Initialization error:", error);
      throw error;
    }
  }

  /**
   * Run the monitoring workflow
   */
  async runMonitoring() {
    if (this.isRunning) {
      console.log('⚠️  [LEGAL-PULSE] Monitoring already running, skipping...');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    console.log('\n' + '='.repeat(70));
    console.log('🚀 [LEGAL-PULSE] Starting daily law monitoring...');
    console.log('='.repeat(70));

    try {
      // Step 1: Fetch recent law changes
      const changes = await this.fetchLegalChanges();
      console.log(`📜 Found ${changes.length} law changes to process`);

      if (changes.length === 0) {
        console.log('ℹ️  No new law changes found. Exiting monitoring run.');
        return;
      }

      // Step 2: Process each law change
      let totalAlerts = 0;
      let totalContractsChecked = 0;

      for (let i = 0; i < changes.length; i++) {
        const change = changes[i];
        console.log(`\n📋 [${i + 1}/${changes.length}] Processing: ${change.title}`);

        const { alertsSent, contractsChecked } = await this.processLawChange(change);
        totalAlerts += alertsSent;
        totalContractsChecked += contractsChecked;
      }

      // Step 3: Summary
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n' + '='.repeat(70));
      console.log('✅ [LEGAL-PULSE] Monitoring Complete!');
      console.log('='.repeat(70));
      console.log(`📊 Statistics:`);
      console.log(`   Law changes processed: ${changes.length}`);
      console.log(`   Contracts checked: ${totalContractsChecked}`);
      console.log(`   Alerts sent: ${totalAlerts}`);
      console.log(`   Duration: ${duration}s`);
      console.log('='.repeat(70) + '\n');

    } catch (error) {
      console.error('❌ [LEGAL-PULSE] Monitoring error:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Fetch legal changes from last 24 hours
   */
  async fetchLegalChanges() {
    const maxChanges = parseInt(process.env.LEGAL_PULSE_MAX_CHANGES) || 100;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago

    try {
      // For MVP, we'll create some demo law changes
      // In production, this would call your externalLegalAPIs service

      const lawsCollection = this.db.collection("laws");

      // Find laws updated in last 24h
      const recentLaws = await lawsCollection
        .find({ updatedAt: { $gte: since } })
        .limit(maxChanges)
        .toArray();

      // If no recent laws, return empty (production would call external APIs)
      if (recentLaws.length === 0) {
        console.log('ℹ️  No recent laws found in database');
        return [];
      }

      return recentLaws.map(law => ({
        id: law._id.toString(),
        title: law.title || 'Unnamed Law',
        description: law.summary || law.description || '',
        source: law.source || 'unknown',
        area: law.area || 'general',
        url: law.sourceUrl || '',
        updatedAt: law.updatedAt
      }));

    } catch (error) {
      console.error('❌ Error fetching legal changes:', error);
      return [];
    }
  }

  /**
   * Process a single law change
   */
  async processLawChange(change) {
    const threshold = parseFloat(process.env.SIMILARITY_THRESHOLD) || 0.85;
    const topK = parseInt(process.env.TOP_K) || 30;

    try {
      // 1. Generate embedding for law change
      const lawText = `${change.title} ${change.description}`;
      const lawEmbedding = await this.embeddingService.embedText(lawText);

      // 2. Query vector store for similar contracts
      const results = await this.vectorStore.queryContracts(lawEmbedding, topK);

      // 3. Filter by similarity threshold
      const relevantMatches = [];

      for (let i = 0; i < results.ids[0].length; i++) {
        const distance = results.distances[0][i];
        const score = 1 - distance; // Convert distance to similarity

        if (score >= threshold) {
          relevantMatches.push({
            contractId: results.metadatas[0][i].contractId,
            userId: results.metadatas[0][i].userId,
            contractName: results.metadatas[0][i].contractName,
            score,
            matchedChunk: results.documents[0][i],
            chunkIndex: results.metadatas[0][i].chunkIndex
          });
        }
      }

      console.log(`   📊 Found ${relevantMatches.length} relevant contracts (threshold: ${threshold})`);

      // 4. Deduplicate by contractId (keep highest score)
      const uniqueContracts = this.deduplicateByContract(relevantMatches);
      console.log(`   📊 After deduplication: ${uniqueContracts.length} unique contracts`);

      // 5. Send alerts
      let alertsSent = 0;
      for (const contract of uniqueContracts) {
        const sent = await this.sendAlert(contract, change);
        if (sent) alertsSent++;
      }

      return {
        alertsSent,
        contractsChecked: results.ids[0].length
      };

    } catch (error) {
      console.error(`   ❌ Error processing law change "${change.title}":`, error);
      return { alertsSent: 0, contractsChecked: 0 };
    }
  }

  /**
   * Deduplicate matches by contractId, keeping highest score
   */
  deduplicateByContract(matches) {
    const seen = new Map();

    for (const match of matches) {
      const existing = seen.get(match.contractId);
      if (!existing || existing.score < match.score) {
        seen.set(match.contractId, match);
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Send alert for contract + law change
   */
  async sendAlert(contract, lawChange) {
    try {
      // Check duplicate protection (24h)
      if (await this.isAlertSentRecently(contract.contractId, lawChange.id)) {
        console.log(`   ⏭️  Skipping duplicate alert for ${contract.contractName}`);
        return false;
      }

      // Get user info
      const usersCollection = this.db.collection("users");
      const user = await usersCollection.findOne({ _id: new ObjectId(contract.userId) });

      if (!user) {
        console.log(`   ⚠️  User not found for contract ${contract.contractName}`);
        return false;
      }

      // Check if user opted out
      if (user.settings?.legalPulseAuto === false) {
        console.log(`   ⏭️  User opted out of auto-alerts: ${user.email}`);
        return false;
      }

      // Calculate severity
      const severity = this.calculateSeverity(contract.score);

      // Create alert object
      const alert = {
        contractId: contract.contractId,
        type: 'law_change',
        severity,
        title: `${lawChange.title}`,
        description: `Betrifft: ${contract.contractName}`,
        actionUrl: `/optimizer?contractId=${contract.contractId}&lawChangeId=${lawChange.id}`,
        score: contract.score,
        createdAt: new Date()
      };

      // Send E-Mail
      await this.sendAlertEmail(user, contract, lawChange, severity);

      // Send SSE notification
      broadcastToUser(contract.userId, alert);

      // Log alert in database
      await this.logAlert(contract, lawChange);

      console.log(`   ✅ Alert sent to ${user.email} for ${contract.contractName} (score: ${(contract.score * 100).toFixed(1)}%)`);

      return true;

    } catch (error) {
      console.error(`   ❌ Error sending alert for ${contract.contractName}:`, error);
      return false;
    }
  }

  /**
   * Calculate severity based on similarity score
   */
  calculateSeverity(score) {
    if (score >= 0.95) return 'critical';
    if (score >= 0.90) return 'high';
    if (score >= 0.85) return 'medium';
    return 'low';
  }

  /**
   * Send alert email
   */
  async sendAlertEmail(user, contract, lawChange, severity) {
    const severityColors = {
      critical: { bg: '#dc2626', light: '#fef2f2', border: '#dc2626', text: '#991b1b' },
      high: { bg: '#ea580c', light: '#fff7ed', border: '#ea580c', text: '#9a3412' },
      medium: { bg: '#f59e0b', light: '#fffbeb', border: '#f59e0b', text: '#92400e' },
      low: { bg: '#3b82f6', light: '#eff6ff', border: '#3b82f6', text: '#1e40af' }
    };

    const colors = severityColors[severity];
    const severityText = {
      critical: 'Kritisch',
      high: 'Hoch',
      medium: 'Mittel',
      low: 'Niedrig'
    }[severity];

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, ${colors.bg} 0%, ${colors.bg}dd 100%); padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0; color: white; font-size: 28px; font-weight: 600; }
    .header p { margin: 8px 0 0; color: rgba(255,255,255,0.95); font-size: 14px; }
    .content { padding: 40px 30px; }
    .alert-box { background: ${colors.light}; border-left: 4px solid ${colors.border}; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .alert-title { font-size: 18px; font-weight: 600; color: ${colors.text}; margin: 0 0 8px; }
    .alert-description { color: #1f2937; line-height: 1.6; margin: 0; font-size: 15px; }
    .score-badge { display: inline-block; padding: 6px 12px; background: ${colors.light}; color: ${colors.text}; border: 1px solid ${colors.border}; border-radius: 12px; font-size: 14px; font-weight: 600; margin-top: 12px; }
    .cta-button { display: inline-block; background: ${colors.bg}; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 24px 0; transition: all 0.2s; }
    .cta-button:hover { opacity: 0.9; }
    .contract-info { background: #f9fafb; padding: 16px; border-radius: 8px; margin: 16px 0; }
    .contract-info strong { color: #374151; }
    .footer { background: #f9fafb; padding: 24px 30px; text-align: center; border-top: 1px solid #e5e7eb; }
    .footer p { margin: 4px 0; color: #6b7280; font-size: 13px; }
    .footer a { color: #3b82f6; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ Gesetzesänderung erkannt!</h1>
      <p>Automatische Legal Pulse Überwachung</p>
    </div>

    <div class="content">
      <p>Hallo ${user.name},</p>

      <p>Unser KI-gestütztes Legal Pulse System hat eine <strong>relevante Gesetzesänderung</strong> für einen Ihrer Verträge erkannt:</p>

      <div class="alert-box">
        <h2 class="alert-title">${lawChange.title}</h2>
        <p class="alert-description">${lawChange.description}</p>
        <span class="score-badge">Priorität: ${severityText} • Relevanz: ${(contract.score * 100).toFixed(1)}%</span>
      </div>

      <div class="contract-info">
        <p style="margin: 0 0 8px 0;"><strong>📄 Betroffener Vertrag:</strong></p>
        <p style="margin: 0; color: #1f2937; font-size: 15px;">${contract.contractName}</p>
      </div>

      <a href="https://www.contract-ai.de/optimizer?contractId=${contract.contractId}&lawChangeId=${lawChange.id}" class="cta-button">
        Jetzt im Optimizer prüfen →
      </a>

      <p style="color: #6b7280; font-size: 14px; margin-top: 32px; line-height: 1.6;">
        <strong>Wie funktioniert das?</strong><br>
        Unsere KI analysiert täglich neue Gesetze und vergleicht sie automatisch mit allen Ihren Verträgen mittels Semantic Similarity. Bei hoher Relevanz werden Sie sofort benachrichtigt.
      </p>

      <p style="color: #9ca3af; font-size: 13px; margin-top: 16px;">
        Sie können diese automatischen Benachrichtigungen jederzeit in Ihren <a href="https://www.contract-ai.de/profile" style="color: #3b82f6;">Einstellungen</a> deaktivieren.
      </p>
    </div>

    <div class="footer">
      <p><strong>Contract AI</strong> – Legal Pulse Monitoring</p>
      <p>
        <a href="https://www.contract-ai.de/legalpulse">Legal Pulse</a> •
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
      `⚡ ${lawChange.title} – Automatische Legal Pulse Warnung`,
      emailHtml
    );
  }

  /**
   * Check if alert was sent recently (24h duplicate protection)
   */
  async isAlertSentRecently(contractId, lawId) {
    const notificationsCollection = this.db.collection("pulse_notifications");
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24h ago

    const existing = await notificationsCollection.findOne({
      contractId,
      lawId,
      createdAt: { $gte: since }
    });

    return !!existing;
  }

  /**
   * Log alert in database
   */
  async logAlert(contract, lawChange) {
    const notificationsCollection = this.db.collection("pulse_notifications");

    await notificationsCollection.insertOne({
      contractId: contract.contractId,
      userId: contract.userId,
      lawId: lawChange.id,
      lawTitle: lawChange.title,
      score: contract.score,
      severity: this.calculateSeverity(contract.score),
      createdAt: new Date()
    });
  }

  /**
   * Close connections
   */
  async close() {
    if (this.vectorStore) {
      await this.vectorStore.close();
    }
    if (this.mongoClient) {
      await this.mongoClient.close();
    }
  }
}

module.exports = LegalPulseMonitor;
