// 📁 backend/models/IntegrationWebhookEvent.js
// Webhook Event Log für CRM/ERP/CPQ Integrationen
// Speichert eingehende und ausgehende Events für Debugging & Replay

const mongoose = require("mongoose");

const integrationWebhookEventSchema = new mongoose.Schema({
  // Event Identifikation
  eventId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Source Information
  source: {
    type: String,
    required: true,
    enum: [
      'salesforce',
      'hubspot',
      'pipedrive',
      'zoho',
      'sap',
      'netsuite',
      'odoo',
      'cpq',
      'contract_ai' // Für ausgehende Events
    ],
    index: true
  },

  // Direction
  direction: {
    type: String,
    required: true,
    enum: ['inbound', 'outbound'],
    index: true
  },

  // Event Type (CRM-spezifisch)
  eventType: {
    type: String,
    required: true,
    index: true
    // Beispiele:
    // Salesforce: 'Opportunity.Updated', 'Contract.Created'
    // HubSpot: 'deal.propertyChange', 'contact.creation'
    // SAP: 'SalesOrder.Created', 'Customer.Updated'
  },

  // User/Organization Context
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    index: true
  },
  organizationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Organization",
    index: true,
    sparse: true
  },

  // Related Contract (falls vorhanden)
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contract",
    index: true,
    sparse: true
  },

  // External Record ID
  externalRecordId: {
    type: String,
    index: true
  },

  // Request/Response Data
  request: {
    method: { type: String },
    url: { type: String },
    headers: { type: mongoose.Schema.Types.Mixed },
    body: { type: mongoose.Schema.Types.Mixed },
    signature: { type: String }, // HMAC Signature
    timestamp: { type: Date }
  },

  response: {
    statusCode: { type: Number },
    headers: { type: mongoose.Schema.Types.Mixed },
    body: { type: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date }
  },

  // Processing Status
  status: {
    type: String,
    enum: [
      'received',      // Event empfangen
      'validating',    // Signatur wird validiert
      'processing',    // Wird verarbeitet
      'completed',     // Erfolgreich verarbeitet
      'failed',        // Verarbeitung fehlgeschlagen
      'retrying',      // Wird wiederholt
      'skipped',       // Übersprungen (Duplikat, Filter, etc.)
      'pending_retry'  // Wartet auf nächsten Retry
    ],
    default: 'received',
    index: true
  },

  // Processing Details
  processing: {
    startedAt: { type: Date },
    completedAt: { type: Date },
    duration: { type: Number }, // Millisekunden
    retryCount: { type: Number, default: 0 },
    maxRetries: { type: Number, default: 3 },
    nextRetryAt: { type: Date },
    error: {
      message: { type: String },
      code: { type: String },
      stack: { type: String }
    }
  },

  // Actions Performed
  actions: [{
    type: {
      type: String,
      enum: [
        'contract_created',
        'contract_updated',
        'contract_deleted',
        'sync_to_crm',
        'sync_from_crm',
        'notification_sent',
        'webhook_forwarded',
        'field_mapping_applied',
        'custom_action'
      ]
    },
    description: { type: String },
    targetId: { type: String },
    timestamp: { type: Date, default: Date.now },
    success: { type: Boolean },
    details: { type: mongoose.Schema.Types.Mixed }
  }],

  // Idempotency
  idempotencyKey: {
    type: String,
    index: true,
    sparse: true
  },
  isDuplicate: {
    type: Boolean,
    default: false
  },
  originalEventId: {
    type: String // Referenz zum Original bei Duplikat
  },

  // Metadata
  metadata: {
    ipAddress: { type: String },
    userAgent: { type: String },
    region: { type: String },
    processingNode: { type: String } // Bei Multi-Server Setup
  },

  // TTL - Events nach 90 Tagen löschen
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    index: { expireAfterSeconds: 0 }
  },

  // Timestamps
  receivedAt: { type: Date, default: Date.now, index: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound Indexes für häufige Queries
integrationWebhookEventSchema.index({ source: 1, eventType: 1, receivedAt: -1 });
integrationWebhookEventSchema.index({ userId: 1, status: 1, receivedAt: -1 });
integrationWebhookEventSchema.index({ contractId: 1, receivedAt: -1 });
integrationWebhookEventSchema.index({ status: 1, 'processing.nextRetryAt': 1 }); // Für Retry Queue

// Pre-save: Update timestamp
integrationWebhookEventSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Methods: Start Processing
integrationWebhookEventSchema.methods.startProcessing = function() {
  this.status = 'processing';
  this.processing.startedAt = new Date();
};

// Methods: Complete Processing
integrationWebhookEventSchema.methods.completeProcessing = function() {
  this.status = 'completed';
  this.processing.completedAt = new Date();
  this.processing.duration = this.processing.completedAt - this.processing.startedAt;
};

// Methods: Fail Processing
integrationWebhookEventSchema.methods.failProcessing = function(error) {
  this.processing.completedAt = new Date();
  this.processing.duration = this.processing.completedAt - this.processing.startedAt;
  this.processing.error = {
    message: error.message || String(error),
    code: error.code,
    stack: error.stack
  };

  // Retry Logic
  if (this.processing.retryCount < this.processing.maxRetries) {
    this.status = 'pending_retry';
    this.processing.retryCount += 1;
    // Exponential Backoff: 1min, 5min, 15min
    const delays = [60, 300, 900];
    const delay = delays[this.processing.retryCount - 1] || 900;
    this.processing.nextRetryAt = new Date(Date.now() + delay * 1000);
  } else {
    this.status = 'failed';
  }
};

// Methods: Add Action
integrationWebhookEventSchema.methods.addAction = function(type, description, targetId, success = true, details = null) {
  this.actions.push({
    type,
    description,
    targetId,
    timestamp: new Date(),
    success,
    details
  });
};

// Statics: Generate Event ID
integrationWebhookEventSchema.statics.generateEventId = function(source) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `evt_${source}_${timestamp}_${random}`;
};

// Statics: Find Events for Retry
integrationWebhookEventSchema.statics.findEventsForRetry = function() {
  return this.find({
    status: 'pending_retry',
    'processing.nextRetryAt': { $lte: new Date() }
  }).sort({ 'processing.nextRetryAt': 1 }).limit(100);
};

// Statics: Get Event Statistics
integrationWebhookEventSchema.statics.getStatistics = async function(userId, source = null, days = 7) {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const matchStage = {
    userId: new mongoose.Types.ObjectId(userId),
    receivedAt: { $gte: startDate }
  };

  if (source) {
    matchStage.source = source;
  }

  const stats = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: {
          source: '$source',
          status: '$status',
          direction: '$direction'
        },
        count: { $sum: 1 },
        avgDuration: { $avg: '$processing.duration' }
      }
    },
    {
      $group: {
        _id: '$_id.source',
        statuses: {
          $push: {
            status: '$_id.status',
            direction: '$_id.direction',
            count: '$count',
            avgDuration: '$avgDuration'
          }
        },
        total: { $sum: '$count' }
      }
    }
  ]);

  return stats;
};

module.exports = mongoose.model("IntegrationWebhookEvent", integrationWebhookEventSchema);
