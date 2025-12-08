// 📁 backend/models/IntegrationCredential.js
// Sichere Speicherung von CRM/ERP/CPQ Integration Credentials
// WICHTIG: Tokens werden verschlüsselt gespeichert!

const mongoose = require("mongoose");
const crypto = require("crypto");

// Encryption Key (sollte in .env sein)
const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY ||
  crypto.createHash('sha256').update(process.env.JWT_SECRET || 'fallback-key').digest();
const IV_LENGTH = 16;

/**
 * Verschlüsselt einen String
 */
function encrypt(text) {
  if (!text) return null;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Entschlüsselt einen String
 */
function decrypt(text) {
  if (!text) return null;
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('❌ Decryption error:', error.message);
    return null;
  }
}

const integrationCredentialSchema = new mongoose.Schema({
  // Zugehörigkeit
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    index: true,
    sparse: true
  },

  // Integration Type
  integrationType: {
    type: String,
    required: true,
    enum: [
      // CRM
      'salesforce',
      'hubspot',
      'pipedrive',
      'zoho',
      'microsoft_dynamics',
      // ERP
      'sap_business_one',
      'sap_s4hana',
      'netsuite',
      'odoo',
      'sage',
      // CPQ
      'salesforce_cpq',
      'conga_cpq',
      'apttus',
      'pandadoc',
      'proposify'
    ],
    index: true
  },

  // Display Name
  displayName: {
    type: String,
    required: true
  },

  // Connection Status
  status: {
    type: String,
    enum: ['active', 'inactive', 'error', 'expired', 'pending_auth'],
    default: 'pending_auth'
  },

  // OAuth Credentials (verschlüsselt)
  oauth: {
    accessToken: { type: String, set: encrypt, get: decrypt },
    refreshToken: { type: String, set: encrypt, get: decrypt },
    tokenType: { type: String, default: 'Bearer' },
    expiresAt: { type: Date },
    scope: { type: String },
    instanceUrl: { type: String } // Für Salesforce etc.
  },

  // API Key Credentials (Alternative zu OAuth)
  apiKey: {
    key: { type: String, set: encrypt, get: decrypt },
    secret: { type: String, set: encrypt, get: decrypt }
  },

  // Basic Auth (für ältere Systeme)
  basicAuth: {
    username: { type: String, set: encrypt, get: decrypt },
    password: { type: String, set: encrypt, get: decrypt }
  },

  // Connection Settings
  settings: {
    // Allgemeine Settings
    baseUrl: { type: String }, // API Base URL
    apiVersion: { type: String },
    sandbox: { type: Boolean, default: false }, // Sandbox/Test Mode

    // Sync Settings
    syncDirection: {
      type: String,
      enum: ['inbound', 'outbound', 'bidirectional'],
      default: 'bidirectional'
    },
    autoSync: { type: Boolean, default: true },
    syncInterval: { type: Number, default: 15 }, // Minuten

    // Field Mappings (Custom)
    fieldMappings: [{
      sourceField: { type: String },
      targetField: { type: String },
      transform: { type: String } // Optional: JS Transform Function
    }],

    // Trigger Settings
    triggers: {
      onContractCreate: { type: Boolean, default: true },
      onContractUpdate: { type: Boolean, default: true },
      onContractSign: { type: Boolean, default: true },
      onContractExpire: { type: Boolean, default: false },
      onDealStageChange: { type: Boolean, default: true }
    },

    // Filter Settings (welche Daten synchronisieren?)
    filters: {
      dealStages: [{ type: String }], // Nur bestimmte Stages
      contractTypes: [{ type: String }], // Nur bestimmte Typen
      minDealValue: { type: Number },
      customFilters: { type: mongoose.Schema.Types.Mixed }
    }
  },

  // Webhook Configuration
  webhook: {
    // Incoming Webhook (von externem System)
    incomingUrl: { type: String }, // Unsere Webhook URL
    incomingSecret: { type: String, set: encrypt, get: decrypt },

    // Outgoing Webhook (zu externem System)
    outgoingUrl: { type: String },
    outgoingSecret: { type: String, set: encrypt, get: decrypt },
    outgoingEvents: [{ type: String }] // Welche Events senden?
  },

  // Metadata
  metadata: {
    connectedAt: { type: Date },
    lastSyncAt: { type: Date },
    lastSuccessfulSync: { type: Date },
    totalSyncs: { type: Number, default: 0 },
    totalErrors: { type: Number, default: 0 },
    lastError: {
      message: { type: String },
      code: { type: String },
      timestamp: { type: Date }
    }
  },

  // Audit Log (letzte 100 Aktionen)
  auditLog: [{
    action: { type: String },
    timestamp: { type: Date, default: Date.now },
    details: { type: mongoose.Schema.Types.Mixed },
    success: { type: Boolean },
    error: { type: String }
  }],

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, {
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Compound Index für schnelle Lookups
integrationCredentialSchema.index({ userId: 1, integrationType: 1 }, { unique: true });
integrationCredentialSchema.index({ organizationId: 1, integrationType: 1 });

// Pre-save: Update timestamp
integrationCredentialSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods: Token Refresh Check
integrationCredentialSchema.methods.isTokenExpired = function() {
  if (!this.oauth?.expiresAt) return false;
  // 5 Minuten Puffer
  return new Date(this.oauth.expiresAt) < new Date(Date.now() + 5 * 60 * 1000);
};

// Methods: Add Audit Log Entry
integrationCredentialSchema.methods.addAuditEntry = function(action, details, success = true, error = null) {
  this.auditLog.unshift({
    action,
    timestamp: new Date(),
    details,
    success,
    error
  });
  // Nur letzte 100 Einträge behalten
  if (this.auditLog.length > 100) {
    this.auditLog = this.auditLog.slice(0, 100);
  }
};

// Methods: Update Sync Stats
integrationCredentialSchema.methods.recordSync = function(success, errorMessage = null) {
  this.metadata.lastSyncAt = new Date();
  this.metadata.totalSyncs += 1;

  if (success) {
    this.metadata.lastSuccessfulSync = new Date();
  } else {
    this.metadata.totalErrors += 1;
    this.metadata.lastError = {
      message: errorMessage,
      timestamp: new Date()
    };
  }
};

// Statics: Generate Webhook Secret
integrationCredentialSchema.statics.generateWebhookSecret = function() {
  return 'whsec_' + crypto.randomBytes(32).toString('hex');
};

// Statics: Generate Incoming Webhook URL
integrationCredentialSchema.statics.generateWebhookUrl = function(userId, integrationType) {
  const token = crypto.randomBytes(16).toString('hex');
  return `/api/integrations/webhooks/${integrationType}/${userId}/${token}`;
};

// Export encrypt/decrypt für andere Module
integrationCredentialSchema.statics.encrypt = encrypt;
integrationCredentialSchema.statics.decrypt = decrypt;

module.exports = mongoose.model("IntegrationCredential", integrationCredentialSchema);
