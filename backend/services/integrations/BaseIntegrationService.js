// 📁 backend/services/integrations/BaseIntegrationService.js
// Abstrakte Basis-Klasse für alle CRM/ERP/CPQ Integrationen
// Definiert gemeinsame Methoden und Schnittstellen

const { MongoClient, ObjectId } = require("mongodb");
const EventEmitter = require('events');

// MongoDB Connection (Singleton)
let db = null;
const getDb = async () => {
  if (db) return db;
  const client = new MongoClient(process.env.MONGO_URI);
  await client.connect();
  db = client.db("contract_ai");
  return db;
};

/**
 * Abstrakte Basis-Klasse für alle Integrationen
 * Jede spezifische Integration (Salesforce, HubSpot, SAP) erbt von dieser Klasse
 */
class BaseIntegrationService extends EventEmitter {
  constructor(integrationType) {
    super();
    this.integrationType = integrationType;
    this.db = null;
    this.contractsCollection = null;
    this.credentialsCollection = null;
    this.eventsCollection = null;
  }

  /**
   * Initialisiert die Datenbankverbindung
   */
  async initialize() {
    this.db = await getDb();
    this.contractsCollection = this.db.collection("contracts");
    this.credentialsCollection = this.db.collection("integrationcredentials");
    this.eventsCollection = this.db.collection("integrationwebhookevents");
    console.log(`✅ [${this.integrationType}] Service initialisiert`);
  }

  // ==========================================
  // CREDENTIALS MANAGEMENT
  // ==========================================

  /**
   * Holt die Credentials für einen User
   */
  async getCredentials(userId) {
    return await this.credentialsCollection.findOne({
      userId: new ObjectId(userId),
      integrationType: this.integrationType,
      status: { $in: ['active', 'expired'] }
    });
  }

  /**
   * Speichert/Aktualisiert Credentials
   */
  async saveCredentials(userId, credentialData) {
    const result = await this.credentialsCollection.updateOne(
      {
        userId: new ObjectId(userId),
        integrationType: this.integrationType
      },
      {
        $set: {
          ...credentialData,
          integrationType: this.integrationType,
          userId: new ObjectId(userId),
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      { upsert: true }
    );
    return result;
  }

  /**
   * Prüft ob Token abgelaufen ist
   */
  isTokenExpired(credentials) {
    if (!credentials?.oauth?.expiresAt) return false;
    // 5 Minuten Puffer
    return new Date(credentials.oauth.expiresAt) < new Date(Date.now() + 5 * 60 * 1000);
  }

  /**
   * ABSTRACT: Token Refresh - Muss von Subklassen implementiert werden
   */
  async refreshToken(credentials) {
    throw new Error(`refreshToken() must be implemented by ${this.integrationType}`);
  }

  /**
   * Sichert dass gültige Credentials vorhanden sind
   */
  async ensureValidCredentials(userId) {
    let credentials = await this.getCredentials(userId);

    if (!credentials) {
      throw new Error(`No ${this.integrationType} integration found for user`);
    }

    if (credentials.status !== 'active') {
      throw new Error(`${this.integrationType} integration is ${credentials.status}`);
    }

    // Token Refresh wenn nötig
    if (this.isTokenExpired(credentials)) {
      console.log(`🔄 [${this.integrationType}] Token expired, refreshing...`);
      credentials = await this.refreshToken(credentials);
    }

    return credentials;
  }

  // ==========================================
  // CONTRACT <-> EXTERNAL SYSTEM MAPPING
  // ==========================================

  /**
   * ABSTRACT: Mapped Contract AI Daten zum externen Format
   */
  mapContractToExternal(contract) {
    throw new Error(`mapContractToExternal() must be implemented by ${this.integrationType}`);
  }

  /**
   * ABSTRACT: Mapped externe Daten zum Contract AI Format
   */
  mapExternalToContract(externalData) {
    throw new Error(`mapExternalToContract() must be implemented by ${this.integrationType}`);
  }

  /**
   * Standard-Mapping mit Custom Field Overrides
   */
  applyFieldMappings(data, mappings) {
    if (!mappings || mappings.length === 0) return data;

    const result = { ...data };

    mappings.forEach(mapping => {
      const { sourceField, targetField, transform } = mapping;

      // Nested field access (z.B. "company.name")
      const sourceValue = this.getNestedValue(data, sourceField);

      if (sourceValue !== undefined) {
        // Optional: Transform anwenden
        let finalValue = sourceValue;
        if (transform) {
          try {
            // Sichere Eval-Alternative mit Function Constructor
            const transformFn = new Function('value', `return ${transform}`);
            finalValue = transformFn(sourceValue);
          } catch (e) {
            console.warn(`⚠️ Transform error for ${sourceField}:`, e.message);
          }
        }

        this.setNestedValue(result, targetField, finalValue);
      }
    });

    return result;
  }

  // ==========================================
  // SYNC OPERATIONS
  // ==========================================

  /**
   * ABSTRACT: Synchronisiert einen Contract zum externen System
   */
  async syncContractToExternal(contractId, userId) {
    throw new Error(`syncContractToExternal() must be implemented by ${this.integrationType}`);
  }

  /**
   * ABSTRACT: Synchronisiert Daten vom externen System zu Contract AI
   */
  async syncExternalToContract(externalId, userId) {
    throw new Error(`syncExternalToContract() must be implemented by ${this.integrationType}`);
  }

  /**
   * Bulk Sync für mehrere Contracts
   */
  async bulkSyncToExternal(contractIds, userId) {
    const results = {
      success: [],
      failed: [],
      skipped: []
    };

    for (const contractId of contractIds) {
      try {
        const result = await this.syncContractToExternal(contractId, userId);
        results.success.push({ contractId, externalId: result.externalId });
      } catch (error) {
        results.failed.push({ contractId, error: error.message });
      }
    }

    return results;
  }

  /**
   * Aktualisiert den Sync-Status eines Contracts
   */
  async updateSyncStatus(contractId, status, direction, errorMessage = null) {
    const updateData = {
      [`integrationSync.${this.integrationType}.status`]: status,
      [`integrationSync.${this.integrationType}.lastSyncedAt`]: new Date(),
      [`integrationSync.${this.integrationType}.lastSyncDirection`]: direction
    };

    if (errorMessage) {
      updateData[`integrationSync.${this.integrationType}.errorMessage`] = errorMessage;
      await this.contractsCollection.updateOne(
        { _id: new ObjectId(contractId) },
        {
          $set: updateData,
          $inc: { [`integrationSync.${this.integrationType}.errorCount`]: 1 }
        }
      );
    } else {
      updateData[`integrationSync.${this.integrationType}.errorMessage`] = null;
      await this.contractsCollection.updateOne(
        { _id: new ObjectId(contractId) },
        { $set: updateData }
      );
    }
  }

  // ==========================================
  // WEBHOOK HANDLING
  // ==========================================

  /**
   * ABSTRACT: Verarbeitet eingehende Webhooks
   */
  async handleWebhook(eventType, payload, userId) {
    throw new Error(`handleWebhook() must be implemented by ${this.integrationType}`);
  }

  /**
   * Sendet einen ausgehenden Webhook
   */
  async sendOutgoingWebhook(credentials, eventType, data) {
    const webhookUrl = credentials.webhook?.outgoingUrl;

    if (!webhookUrl) {
      console.log(`⚠️ [${this.integrationType}] No outgoing webhook URL configured`);
      return null;
    }

    const webhookSecret = credentials.webhook?.outgoingSecret;
    const payload = JSON.stringify({
      event: eventType,
      timestamp: new Date().toISOString(),
      data
    });

    // Signature generieren
    const signature = webhookSecret
      ? this.generateWebhookSignature(payload, webhookSecret)
      : null;

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(signature && { 'X-Contract-AI-Signature': signature }),
          'X-Contract-AI-Event': eventType
        },
        body: payload
      });

      return {
        success: response.ok,
        statusCode: response.status,
        body: await response.text()
      };
    } catch (error) {
      console.error(`❌ [${this.integrationType}] Outgoing webhook failed:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generiert HMAC Signature für ausgehende Webhooks
   */
  generateWebhookSignature(payload, secret) {
    const crypto = require('crypto');
    return 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex');
  }

  // ==========================================
  // API CALLS
  // ==========================================

  /**
   * ABSTRACT: Basis API Call zum externen System
   */
  async apiCall(method, endpoint, data = null, credentials = null) {
    throw new Error(`apiCall() must be implemented by ${this.integrationType}`);
  }

  /**
   * Retry-Wrapper für API Calls
   */
  async apiCallWithRetry(method, endpoint, data, credentials, maxRetries = 3) {
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.apiCall(method, endpoint, data, credentials);
      } catch (error) {
        lastError = error;

        // Bei 401 versuchen, Token zu refreshen
        if (error.statusCode === 401 && attempt < maxRetries) {
          console.log(`🔄 [${this.integrationType}] Auth error, refreshing token...`);
          credentials = await this.refreshToken(credentials);
          continue;
        }

        // Bei Rate Limit warten und wiederholen
        if (error.statusCode === 429 && attempt < maxRetries) {
          const waitTime = error.retryAfter || (attempt * 5000);
          console.log(`⏳ [${this.integrationType}] Rate limited, waiting ${waitTime}ms...`);
          await this.sleep(waitTime);
          continue;
        }

        // Bei anderen Fehlern mit Backoff wiederholen
        if (attempt < maxRetries) {
          const backoff = Math.pow(2, attempt) * 1000;
          console.log(`⏳ [${this.integrationType}] Retry ${attempt}/${maxRetries} in ${backoff}ms...`);
          await this.sleep(backoff);
        }
      }
    }

    throw lastError;
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  /**
   * Holt einen Contract mit External ID
   */
  async findContractByExternalId(externalId, userId) {
    const query = {
      userId: new ObjectId(userId),
      [`externalIds.${this.integrationType}`]: { $exists: true }
    };

    // Je nach Integration unterschiedliche Felder prüfen
    const externalIdField = this.getExternalIdFieldName();
    query[`externalIds.${this.integrationType}.${externalIdField}`] = externalId;

    return await this.contractsCollection.findOne(query);
  }

  /**
   * Gibt den primären External ID Feldnamen zurück
   */
  getExternalIdFieldName() {
    const fieldMap = {
      'salesforce': 'opportunityId',
      'hubspot': 'dealId',
      'pipedrive': 'dealId',
      'zoho': 'dealId',
      'sap': 'salesOrderId',
      'sap_business_one': 'salesOrderId',
      'sap_s4hana': 'salesOrderId',
      'netsuite': 'transactionId',
      'odoo': 'saleOrderId'
    };
    return fieldMap[this.integrationType] || 'externalId';
  }

  /**
   * Nested Object Value Getter
   */
  getNestedValue(obj, path) {
    return path.split('.').reduce((curr, key) => curr?.[key], obj);
  }

  /**
   * Nested Object Value Setter
   */
  setNestedValue(obj, path, value) {
    const keys = path.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((curr, key) => {
      if (!curr[key]) curr[key] = {};
      return curr[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Sleep Helper
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Logging Helper
   */
  log(level, message, data = null) {
    const prefix = `[${this.integrationType.toUpperCase()}]`;
    const timestamp = new Date().toISOString();

    switch (level) {
      case 'error':
        console.error(`❌ ${timestamp} ${prefix} ${message}`, data || '');
        break;
      case 'warn':
        console.warn(`⚠️ ${timestamp} ${prefix} ${message}`, data || '');
        break;
      case 'info':
        console.log(`ℹ️ ${timestamp} ${prefix} ${message}`, data || '');
        break;
      default:
        console.log(`📝 ${timestamp} ${prefix} ${message}`, data || '');
    }
  }

  /**
   * Event für Audit Log
   */
  async logAuditEvent(userId, action, details, success = true) {
    try {
      await this.credentialsCollection.updateOne(
        {
          userId: new ObjectId(userId),
          integrationType: this.integrationType
        },
        {
          $push: {
            auditLog: {
              $each: [{
                action,
                timestamp: new Date(),
                details,
                success
              }],
              $slice: -100 // Nur letzte 100 behalten
            }
          }
        }
      );
    } catch (error) {
      console.warn(`⚠️ Could not log audit event:`, error.message);
    }
  }
}

module.exports = BaseIntegrationService;
