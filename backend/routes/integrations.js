// 📁 backend/routes/integrations.js
// Zentrale Routes für alle CRM/ERP/CPQ Integrationen
// OAuth Flow, Webhook Handling, Sync Operations

const express = require("express");
const router = express.Router();
const { ObjectId } = require("mongodb");
const crypto = require("crypto");
const verifyToken = require("../middleware/verifyToken");
const { verifyIntegrationWebhook, completeWebhookEvent, addWebhookAction } = require("../middleware/verifyIntegrationWebhook");

// Integration Services
let salesforceService, hubspotService, sapService;

// Lazy-load Services
const getService = async (type) => {
  switch (type) {
    case 'salesforce':
      if (!salesforceService) {
        const { getInstance } = require('../services/integrations/SalesforceService');
        salesforceService = await getInstance();
      }
      return salesforceService;

    case 'hubspot':
      if (!hubspotService) {
        const { getInstance } = require('../services/integrations/HubSpotService');
        hubspotService = await getInstance();
      }
      return hubspotService;

    case 'sap':
    case 'sap_business_one':
    case 'sap_s4hana':
      if (!sapService) {
        const { getInstance } = require('../services/integrations/SAPService');
        sapService = await getInstance(type);
      }
      return sapService;

    default:
      throw new Error(`Unknown integration type: ${type}`);
  }
};

// ==========================================
// INTEGRATION MANAGEMENT
// ==========================================

/**
 * GET /api/integrations
 * Liste alle verfügbaren Integrationen und deren Status
 */
router.get("/", verifyToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Hole alle Credentials des Users
    const credentials = await req.db.collection("integrationcredentials")
      .find({ userId: new ObjectId(userId) })
      .toArray();

    // Verfügbare Integrationen
    const availableIntegrations = [
      {
        type: 'salesforce',
        name: 'Salesforce',
        category: 'CRM',
        description: 'Sync Opportunities, Accounts, Contacts',
        features: ['OAuth 2.0', 'Bidirectional Sync', 'Webhooks'],
        icon: 'salesforce'
      },
      {
        type: 'hubspot',
        name: 'HubSpot',
        category: 'CRM',
        description: 'Sync Deals, Companies, Contacts',
        features: ['OAuth 2.0', 'Bidirectional Sync', 'Webhooks'],
        icon: 'hubspot'
      },
      {
        type: 'sap_business_one',
        name: 'SAP Business One',
        category: 'ERP',
        description: 'Sync Sales Orders, Business Partners',
        features: ['Session Auth', 'Sales Orders', 'Invoices'],
        icon: 'sap'
      },
      {
        type: 'sap_s4hana',
        name: 'SAP S/4HANA',
        category: 'ERP',
        description: 'Enterprise ERP Integration',
        features: ['OAuth 2.0', 'OData API', 'Real-time'],
        icon: 'sap'
      },
      {
        type: 'pipedrive',
        name: 'Pipedrive',
        category: 'CRM',
        description: 'Coming soon',
        features: [],
        icon: 'pipedrive',
        comingSoon: true
      },
      {
        type: 'zoho',
        name: 'Zoho CRM',
        category: 'CRM',
        description: 'Coming soon',
        features: [],
        icon: 'zoho',
        comingSoon: true
      }
    ];

    // Merge mit User Credentials
    const integrations = availableIntegrations.map(integration => {
      const credential = credentials.find(c => c.integrationType === integration.type);
      return {
        ...integration,
        connected: !!credential,
        status: credential?.status || 'disconnected',
        connectedAt: credential?.metadata?.connectedAt,
        lastSyncAt: credential?.metadata?.lastSyncAt
      };
    });

    res.json({
      success: true,
      integrations
    });

  } catch (error) {
    console.error("❌ [Integrations] List error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading integrations",
      error: error.message
    });
  }
});

/**
 * GET /api/integrations/:type
 * Details einer spezifischen Integration
 */
router.get("/:type", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.userId;

    const credential = await req.db.collection("integrationcredentials").findOne({
      userId: new ObjectId(userId),
      integrationType: type
    });

    if (!credential) {
      return res.json({
        success: true,
        connected: false,
        integrationType: type
      });
    }

    // Sensitive Daten entfernen
    const safeCredential = {
      integrationType: credential.integrationType,
      displayName: credential.displayName,
      status: credential.status,
      settings: {
        syncDirection: credential.settings?.syncDirection,
        autoSync: credential.settings?.autoSync,
        syncInterval: credential.settings?.syncInterval,
        triggers: credential.settings?.triggers,
        filters: credential.settings?.filters
      },
      metadata: credential.metadata,
      webhook: {
        incomingUrl: credential.webhook?.incomingUrl,
        outgoingEvents: credential.webhook?.outgoingEvents
      },
      auditLog: credential.auditLog?.slice(0, 10) // Letzte 10 Einträge
    };

    res.json({
      success: true,
      connected: true,
      credential: safeCredential
    });

  } catch (error) {
    console.error("❌ [Integrations] Detail error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading integration details",
      error: error.message
    });
  }
});

/**
 * DELETE /api/integrations/:type
 * Disconnect/Remove Integration
 */
router.delete("/:type", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.userId;

    // Lösche Credentials
    const result = await req.db.collection("integrationcredentials").deleteOne({
      userId: new ObjectId(userId),
      integrationType: type
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Integration not found"
      });
    }

    // Optional: External IDs von Contracts entfernen
    await req.db.collection("contracts").updateMany(
      { userId: new ObjectId(userId) },
      {
        $unset: { [`externalIds.${type}`]: '' },
        $set: { [`integrationSync.${type}.status`]: 'disconnected' }
      }
    );

    res.json({
      success: true,
      message: `${type} integration disconnected`
    });

  } catch (error) {
    console.error("❌ [Integrations] Disconnect error:", error);
    res.status(500).json({
      success: false,
      message: "Error disconnecting integration",
      error: error.message
    });
  }
});

// ==========================================
// OAUTH FLOW
// ==========================================

/**
 * GET /api/integrations/:type/auth
 * Startet OAuth Flow - gibt Auth URL zurück
 */
router.get("/:type/auth", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.userId;

    const redirectUri = `${process.env.API_BASE_URL || 'https://api.contract-ai.de'}/api/integrations/${type}/callback`;

    const service = await getService(type);
    const authUrl = service.getAuthorizationUrl(userId, redirectUri);

    res.json({
      success: true,
      authUrl,
      integrationType: type
    });

  } catch (error) {
    console.error("❌ [Integrations] Auth URL error:", error);
    res.status(500).json({
      success: false,
      message: "Error generating auth URL",
      error: error.message
    });
  }
});

/**
 * GET /api/integrations/:type/callback
 * OAuth Callback - tauscht Code gegen Token
 */
router.get("/:type/callback", async (req, res) => {
  try {
    const { type } = req.params;
    const { code, state, error: oauthError } = req.query;

    if (oauthError) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=${oauthError}`);
    }

    if (!code || !state) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=missing_params`);
    }

    // Decode State
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch (e) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=invalid_state`);
    }

    const { userId } = stateData;
    const redirectUri = `${process.env.API_BASE_URL || 'https://api.contract-ai.de'}/api/integrations/${type}/callback`;

    // Token Exchange
    const service = await getService(type);
    const tokenData = await service.exchangeCodeForToken(code, redirectUri);

    // Generiere Webhook Secret
    const IntegrationCredential = require('../models/IntegrationCredential');
    const webhookSecret = IntegrationCredential.generateWebhookSecret();
    const webhookUrl = IntegrationCredential.generateWebhookUrl(userId, type);

    // Speichere Credentials
    const mongoose = require('mongoose');
    await mongoose.connection.db.collection("integrationcredentials").updateOne(
      {
        userId: new ObjectId(userId),
        integrationType: type
      },
      {
        $set: {
          displayName: `${type.charAt(0).toUpperCase() + type.slice(1)} Integration`,
          status: 'active',
          oauth: {
            accessToken: tokenData.accessToken,
            refreshToken: tokenData.refreshToken,
            tokenType: tokenData.tokenType,
            expiresAt: tokenData.expiresAt,
            scope: tokenData.scope,
            instanceUrl: tokenData.instanceUrl
          },
          webhook: {
            incomingUrl: `${process.env.API_BASE_URL}/api/integrations/webhooks/${type}/${userId}`,
            incomingSecret: webhookSecret
          },
          settings: {
            syncDirection: 'bidirectional',
            autoSync: true,
            syncInterval: 15,
            triggers: {
              onContractCreate: true,
              onContractUpdate: true,
              onContractSign: true,
              onDealStageChange: true
            }
          },
          metadata: {
            connectedAt: new Date()
          },
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId: new ObjectId(userId),
          integrationType: type,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    // Redirect zum Frontend
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?success=${type}`);

  } catch (error) {
    console.error("❌ [Integrations] OAuth callback error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/settings/integrations?error=${encodeURIComponent(error.message)}`);
  }
});

// ==========================================
// SAP SPECIFIC AUTH (Session-Based)
// ==========================================

/**
 * POST /api/integrations/sap/connect
 * Verbindet SAP mit Username/Password
 */
router.post("/:type/connect", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.userId;
    const { username, password, baseUrl, companyDB, sapType } = req.body;

    if (!['sap', 'sap_business_one', 'sap_s4hana'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "This endpoint is for SAP connections only"
      });
    }

    // Test Connection
    const service = await getService(sapType || type);
    const IntegrationCredential = require('../models/IntegrationCredential');

    // Temporäre Credentials für Test
    const testCredentials = {
      basicAuth: {
        username: IntegrationCredential.encrypt(username),
        password: IntegrationCredential.encrypt(password)
      },
      settings: {
        baseUrl,
        companyDB
      }
    };

    // Login Test
    const sessionData = await service.login(testCredentials);

    // Speichere Credentials
    const webhookSecret = IntegrationCredential.generateWebhookSecret();

    const mongoose = require('mongoose');
    await mongoose.connection.db.collection("integrationcredentials").updateOne(
      {
        userId: new ObjectId(userId),
        integrationType: sapType || type
      },
      {
        $set: {
          displayName: `SAP ${sapType === 'sap_s4hana' ? 'S/4HANA' : 'Business One'} Integration`,
          status: 'active',
          basicAuth: {
            username: IntegrationCredential.encrypt(username),
            password: IntegrationCredential.encrypt(password)
          },
          oauth: {
            accessToken: IntegrationCredential.encrypt(sessionData.sessionId),
            refreshToken: IntegrationCredential.encrypt(sessionData.routeId),
            expiresAt: new Date(Date.now() + (sessionData.sessionTimeout || 30) * 60 * 1000)
          },
          settings: {
            baseUrl,
            companyDB,
            syncDirection: 'bidirectional',
            autoSync: true,
            syncInterval: 15
          },
          webhook: {
            incomingUrl: `${process.env.API_BASE_URL}/api/integrations/webhooks/${type}/${userId}`,
            incomingSecret: webhookSecret
          },
          metadata: {
            connectedAt: new Date(),
            sapVersion: sessionData.version
          },
          updatedAt: new Date()
        },
        $setOnInsert: {
          userId: new ObjectId(userId),
          integrationType: sapType || type,
          createdAt: new Date()
        }
      },
      { upsert: true }
    );

    res.json({
      success: true,
      message: "SAP connected successfully",
      sapVersion: sessionData.version
    });

  } catch (error) {
    console.error("❌ [Integrations] SAP connect error:", error);
    res.status(500).json({
      success: false,
      message: "SAP connection failed",
      error: error.message
    });
  }
});

// ==========================================
// SYNC OPERATIONS
// ==========================================

/**
 * POST /api/integrations/:type/sync/contract/:contractId
 * Sync einzelnen Contract zu externem System
 */
router.post("/:type/sync/contract/:contractId", verifyToken, async (req, res) => {
  try {
    const { type, contractId } = req.params;
    const userId = req.user.userId;

    const service = await getService(type);
    const result = await service.syncContractToExternal(contractId, userId);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("❌ [Integrations] Sync error:", error);
    res.status(500).json({
      success: false,
      message: "Sync failed",
      error: error.message
    });
  }
});

/**
 * POST /api/integrations/:type/sync/external/:externalId
 * Sync von externem System zu Contract AI
 */
router.post("/:type/sync/external/:externalId", verifyToken, async (req, res) => {
  try {
    const { type, externalId } = req.params;
    const userId = req.user.userId;

    const service = await getService(type);
    const result = await service.syncExternalToContract(externalId, userId);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error("❌ [Integrations] Sync from external error:", error);
    res.status(500).json({
      success: false,
      message: "Sync failed",
      error: error.message
    });
  }
});

/**
 * POST /api/integrations/:type/sync/bulk
 * Bulk Sync mehrerer Contracts
 */
router.post("/:type/sync/bulk", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { contractIds, direction = 'outbound' } = req.body;
    const userId = req.user.userId;

    if (!contractIds || !Array.isArray(contractIds)) {
      return res.status(400).json({
        success: false,
        message: "contractIds array required"
      });
    }

    const service = await getService(type);
    const results = await service.bulkSyncToExternal(contractIds, userId);

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error("❌ [Integrations] Bulk sync error:", error);
    res.status(500).json({
      success: false,
      message: "Bulk sync failed",
      error: error.message
    });
  }
});

// ==========================================
// WEBHOOK ENDPOINTS
// ==========================================

/**
 * POST /api/integrations/webhooks/:type/:userId/:token?
 * Eingehende Webhooks von externen Systemen
 */
router.post("/webhooks/:type/:userId/:token?",
  verifyIntegrationWebhook(req => req.params.type),
  async (req, res) => {
    const { eventId, integrationType, userId } = req.webhookEvent;

    try {
      const service = await getService(integrationType);

      // Event Type ermitteln
      const eventType = req.body.event ||
        req.body.type ||
        req.body.eventType ||
        req.body.subscriptionType ||
        req.headers['x-event-type'] ||
        'unknown';

      // Handle Webhook
      const result = await service.handleWebhook(eventType, req.body, userId);

      // Event-Log aktualisieren
      await addWebhookAction(eventId, {
        type: result.action || 'webhook_processed',
        description: result.handled ? 'Webhook processed successfully' : 'Webhook skipped',
        targetId: result.contractId,
        success: result.handled,
        details: result
      });

      await completeWebhookEvent(eventId, true);

      res.json({
        success: true,
        eventId,
        ...result
      });

    } catch (error) {
      console.error(`❌ [Webhook] ${integrationType} processing error:`, error);

      await completeWebhookEvent(eventId, false, error);

      res.status(500).json({
        success: false,
        eventId,
        error: error.message
      });
    }
  }
);

// ==========================================
// INTEGRATION UTILITIES
// ==========================================

/**
 * POST /api/integrations/:type/test
 * Testet die Verbindung
 */
router.post("/:type/test", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.userId;

    const service = await getService(type);
    const result = await service.testConnection(userId);

    res.json(result);

  } catch (error) {
    console.error("❌ [Integrations] Test error:", error);
    res.json({
      success: false,
      message: error.message
    });
  }
});

/**
 * GET /api/integrations/:type/search/companies
 * Sucht Companies im externen System
 */
router.get("/:type/search/companies", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { q } = req.query;
    const userId = req.user.userId;

    if (!q || q.length < 2) {
      return res.json({ success: true, results: [] });
    }

    const service = await getService(type);
    let results;

    switch (type) {
      case 'salesforce':
        results = await service.searchAccounts(q, userId);
        break;
      case 'hubspot':
        results = await service.searchCompanies(q, userId);
        break;
      case 'sap':
      case 'sap_business_one':
      case 'sap_s4hana':
        results = await service.searchBusinessPartners(q, userId);
        break;
      default:
        results = [];
    }

    res.json({
      success: true,
      results
    });

  } catch (error) {
    console.error("❌ [Integrations] Search error:", error);
    res.status(500).json({
      success: false,
      message: "Search failed",
      error: error.message
    });
  }
});

/**
 * PUT /api/integrations/:type/settings
 * Aktualisiert Integration Settings
 */
router.put("/:type/settings", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const userId = req.user.userId;
    const { settings } = req.body;

    const allowedSettings = [
      'syncDirection',
      'autoSync',
      'syncInterval',
      'triggers',
      'filters',
      'fieldMappings'
    ];

    // Nur erlaubte Settings übernehmen
    const updateSettings = {};
    allowedSettings.forEach(key => {
      if (settings[key] !== undefined) {
        updateSettings[`settings.${key}`] = settings[key];
      }
    });

    const result = await req.db.collection("integrationcredentials").updateOne(
      {
        userId: new ObjectId(userId),
        integrationType: type
      },
      {
        $set: {
          ...updateSettings,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Integration not found"
      });
    }

    res.json({
      success: true,
      message: "Settings updated"
    });

  } catch (error) {
    console.error("❌ [Integrations] Settings update error:", error);
    res.status(500).json({
      success: false,
      message: "Settings update failed",
      error: error.message
    });
  }
});

/**
 * GET /api/integrations/:type/events
 * Webhook Event History
 */
router.get("/:type/events", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { limit = 50, offset = 0, status } = req.query;
    const userId = req.user.userId;

    const query = {
      userId: new ObjectId(userId),
      source: type
    };

    if (status) {
      query.status = status;
    }

    const events = await req.db.collection("integrationwebhookevents")
      .find(query)
      .sort({ receivedAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit))
      .toArray();

    const total = await req.db.collection("integrationwebhookevents").countDocuments(query);

    res.json({
      success: true,
      events: events.map(e => ({
        eventId: e.eventId,
        eventType: e.eventType,
        status: e.status,
        receivedAt: e.receivedAt,
        processing: e.processing,
        actions: e.actions
      })),
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });

  } catch (error) {
    console.error("❌ [Integrations] Events error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading events",
      error: error.message
    });
  }
});

/**
 * GET /api/integrations/:type/stats
 * Integration Statistics
 */
router.get("/:type/stats", verifyToken, async (req, res) => {
  try {
    const { type } = req.params;
    const { days = 7 } = req.query;
    const userId = req.user.userId;

    const IntegrationWebhookEvent = require('../models/IntegrationWebhookEvent');
    const stats = await IntegrationWebhookEvent.getStatistics(userId, type, parseInt(days));

    // Contract Sync Stats
    const syncStats = await req.db.collection("contracts").aggregate([
      {
        $match: {
          userId: new ObjectId(userId),
          [`externalIds.${type}`]: { $exists: true }
        }
      },
      {
        $group: {
          _id: `$integrationSync.${type}.status`,
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    res.json({
      success: true,
      webhookStats: stats,
      syncStats: syncStats.reduce((acc, s) => {
        acc[s._id || 'unknown'] = s.count;
        return acc;
      }, {}),
      period: `${days} days`
    });

  } catch (error) {
    console.error("❌ [Integrations] Stats error:", error);
    res.status(500).json({
      success: false,
      message: "Error loading stats",
      error: error.message
    });
  }
});

module.exports = router;
