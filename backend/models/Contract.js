const mongoose = require("mongoose");

const contractSchema = new mongoose.Schema({
  // Basic Contract Info
  name: String,
  title: String, // Alternative field name
  laufzeit: String,
  kuendigung: String,
  expiryDate: String,
  status: String,
  content: String,
  extractedText: String,
  fullText: String,
  notes: String,

  // File Storage - Local & S3
  filePath: String,
  s3Key: String,
  s3Bucket: String,
  s3Location: String,
  uploadType: String, // "S3_NEW", "LOCAL_LEGACY", etc.
  needsReupload: { type: Boolean, default: false },

  // Analysis Data
  analyzed: { type: Boolean, default: false },
  contractScore: Number,
  summary: String,
  legalAssessment: String,
  suggestions: String,
  comparison: String,
  risiken: [String],
  optimierungen: [String],

  // 📄 Comprehensive Content Analysis (separate from Legal Pulse risk analysis)
  analysis: {
    summary: String,                          // 2-3 sentence overview
    contractType: String,                     // Detected contract type
    parties: {
      provider: String,                       // Contract party 1
      customer: String                        // Contract party 2
    },
    keyTerms: {
      duration: String,                       // Contract duration
      cancellation: String,                   // Notice period
      payment: String,                        // Payment terms
      deliverables: String                    // Scope of services
    },
    positiveAspects: [{
      title: String,                          // Positive clause/aspect
      description: String,                    // Why it's advantageous
      relevance: String                       // Who benefits
    }],
    concerningAspects: [{
      title: String,                          // Concerning clause/aspect
      description: String,                    // What could be problematic
      impact: String                          // Potential consequences
    }],
    importantClauses: [{
      title: String,                          // Important contract clause
      content: String,                        // Simplified clause content
      explanation: String,                    // Plain language explanation
      action: String                          // What to consider/do
    }],
    recommendations: [String],                // Concrete action recommendations
    missingInformation: [String],             // What's missing from contract
    analyzedAt: Date,                         // When analysis was performed
    aiGenerated: Boolean,                     // Whether AI analysis succeeded
    error: String                             // Error message if analysis failed
  },
  analysisCompletedAt: Date,                  // Timestamp when analysis finished

  // Contract Metadata
  isGenerated: { type: Boolean, default: false },
  provider: mongoose.Schema.Types.Mixed, // Provider info object
  contractNumber: String,
  customerNumber: String,
  contractType: String, // "recurring", "one-time", null
  contractTypeConfidence: String, // "high", "medium", "low"
  hasCompanyProfile: { type: Boolean, default: false },
  designVariant: String,
  metadata: mongoose.Schema.Types.Mixed,
  contractHTML: String,
  formData: mongoose.Schema.Types.Mixed,

  // Payment Tracking
  amount: Number,
  paymentAmount: Number,
  paymentStatus: String, // "paid", "unpaid", null
  paymentDate: Date,
  paymentDueDate: Date,
  paymentMethod: String,
  paymentFrequency: String, // "monthly", "yearly", "weekly", null
  priceIncreaseDate: Date,
  newPrice: Number,
  autoRenewMonths: Number,
  subscriptionStartDate: Date,
  baseAmount: Number,

  // User & Organization
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  organizationId: { type: mongoose.Schema.Types.ObjectId, ref: "Organization", default: null, index: true },
  reminder: { type: Boolean, default: false },
  reminderLastSentAt: { type: Date },

  // Timestamps
  uploadedAt: { type: Date, default: Date.now },
  uploadDate: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },

  // 📁 Folder Organization
  folderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Folder",
    default: null
  },

  // ✉️ Digital Signature Integration
  signatureEnvelopeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Envelope",
    default: null
  },
  signatureStatus: {
    type: String,
    enum: ["draft", "sent", "signed", "completed"],
    default: null
  },

  // ========================================
  // 🔗 CRM/ERP/CPQ INTEGRATION FIELDS
  // ========================================

  // External System IDs (für Bidirektionale Sync)
  externalIds: {
    // CRM Systems
    salesforce: {
      opportunityId: { type: String, index: true, sparse: true },
      accountId: { type: String, sparse: true },
      contactId: { type: String, sparse: true },
      recordType: { type: String } // Opportunity, Quote, Contract
    },
    hubspot: {
      dealId: { type: String, index: true, sparse: true },
      companyId: { type: String, sparse: true },
      contactId: { type: String, sparse: true }
    },
    pipedrive: {
      dealId: { type: String, index: true, sparse: true },
      organizationId: { type: String, sparse: true },
      personId: { type: String, sparse: true }
    },
    zoho: {
      dealId: { type: String, index: true, sparse: true },
      accountId: { type: String, sparse: true }
    },
    // ERP Systems
    sap: {
      salesOrderId: { type: String, index: true, sparse: true },
      customerId: { type: String, sparse: true },
      contractId: { type: String, sparse: true },
      documentNumber: { type: String, sparse: true }
    },
    netsuite: {
      transactionId: { type: String, index: true, sparse: true },
      customerId: { type: String, sparse: true }
    },
    odoo: {
      saleOrderId: { type: String, index: true, sparse: true },
      partnerId: { type: String, sparse: true }
    },
    // CPQ Systems
    cpq: {
      quoteId: { type: String, index: true, sparse: true },
      quoteNumber: { type: String, sparse: true },
      configurationId: { type: String, sparse: true }
    }
  },

  // Sync Status Tracking
  integrationSync: {
    salesforce: {
      status: { type: String, enum: ['pending', 'syncing', 'synced', 'error', 'disconnected'], default: 'disconnected' },
      lastSyncedAt: { type: Date },
      lastSyncDirection: { type: String, enum: ['inbound', 'outbound', 'bidirectional'] },
      errorMessage: { type: String },
      errorCount: { type: Number, default: 0 },
      fieldMapping: { type: mongoose.Schema.Types.Mixed } // Custom field mappings
    },
    hubspot: {
      status: { type: String, enum: ['pending', 'syncing', 'synced', 'error', 'disconnected'], default: 'disconnected' },
      lastSyncedAt: { type: Date },
      lastSyncDirection: { type: String, enum: ['inbound', 'outbound', 'bidirectional'] },
      errorMessage: { type: String },
      errorCount: { type: Number, default: 0 },
      fieldMapping: { type: mongoose.Schema.Types.Mixed }
    },
    sap: {
      status: { type: String, enum: ['pending', 'syncing', 'synced', 'error', 'disconnected'], default: 'disconnected' },
      lastSyncedAt: { type: Date },
      lastSyncDirection: { type: String, enum: ['inbound', 'outbound', 'bidirectional'] },
      errorMessage: { type: String },
      errorCount: { type: Number, default: 0 },
      fieldMapping: { type: mongoose.Schema.Types.Mixed }
    }
  },

  // Source Information (woher kam der Vertrag ursprünglich?)
  source: {
    type: {
      type: String,
      enum: ['manual_upload', 'email_import', 'api_import', 'salesforce', 'hubspot', 'sap', 'cpq', 'generated'],
      default: 'manual_upload'
    },
    externalSystem: { type: String },
    importedAt: { type: Date },
    importedBy: { type: String }, // User ID oder System
    originalPayload: { type: mongoose.Schema.Types.Mixed } // Original-Daten vom externen System
  },

  // CPQ Quote Data (für Configure-Price-Quote Integration)
  quoteData: {
    quoteNumber: { type: String },
    quoteName: { type: String },
    validFrom: { type: Date },
    validUntil: { type: Date },
    currency: { type: String, default: 'EUR' },
    totalValue: { type: Number },
    discountPercent: { type: Number },
    discountAmount: { type: Number },
    taxRate: { type: Number },
    taxAmount: { type: Number },
    netAmount: { type: Number },
    grossAmount: { type: Number },
    // Produktkonfiguration
    lineItems: [{
      productId: { type: String },
      productName: { type: String },
      sku: { type: String },
      quantity: { type: Number },
      unitPrice: { type: Number },
      discount: { type: Number },
      totalPrice: { type: Number },
      configuration: { type: mongoose.Schema.Types.Mixed } // Produktkonfiguration
    }],
    // Quote Status
    status: {
      type: String,
      enum: ['draft', 'pending_approval', 'approved', 'sent', 'accepted', 'rejected', 'expired'],
      default: 'draft'
    },
    approvedBy: { type: String },
    approvedAt: { type: Date },
    sentAt: { type: Date },
    acceptedAt: { type: Date }
  },

  // Deal/Opportunity Information (aus CRM)
  dealInfo: {
    dealName: { type: String },
    dealStage: { type: String },
    dealValue: { type: Number },
    currency: { type: String, default: 'EUR' },
    probability: { type: Number }, // Win probability %
    expectedCloseDate: { type: Date },
    actualCloseDate: { type: Date },
    dealOwner: {
      name: { type: String },
      email: { type: String },
      externalId: { type: String }
    },
    company: {
      name: { type: String },
      industry: { type: String },
      size: { type: String },
      website: { type: String },
      externalId: { type: String }
    },
    contacts: [{
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      role: { type: String }, // Decision Maker, Influencer, etc.
      externalId: { type: String }
    }]
  },

  // Webhook Event Log (für Debugging)
  webhookEvents: [{
    source: { type: String },
    eventType: { type: String },
    eventId: { type: String },
    receivedAt: { type: Date, default: Date.now },
    payload: { type: mongoose.Schema.Types.Mixed },
    processed: { type: Boolean, default: false },
    processedAt: { type: Date },
    error: { type: String }
  }],

  // Legal Lens - Klausel-Analyse & Caching
  legalLens: {
    // Vorverarbeitete Klauseln (gecached für schnelles Laden)
    // Schema.Types.Mixed für maximale Flexibilität - akzeptiert jede Klausel-Struktur
    preParsedClauses: [mongoose.Schema.Types.Mixed],
    // Risk Summary
    riskSummary: {
      high: { type: Number, default: 0 },
      medium: { type: Number, default: 0 },
      low: { type: Number, default: 0 }
    },
    // Smart Summary (Sofort-Übersicht) - gecached für schnelles Laden
    smartSummary: mongoose.Schema.Types.Mixed,
    smartSummaryGeneratedAt: Date,
    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
    // Status - 'invalid' für defekte Caches hinzugefügt
    preprocessStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'error', 'invalid', null],
      default: null
    },
    preprocessedAt: Date
  },

  // Legal Pulse 2.0
  legalPulse: {
    // Core Metrics
    riskScore: { type: Number, default: 0, min: 0, max: 100 },
    healthScore: { type: Number, default: 100, min: 0, max: 100 },
    riskSummary: String,
    lastChecked: Date,

    // Analysis History
    analysisHistory: [{
      date: { type: Date, default: Date.now },
      riskScore: Number,
      healthScore: Number,
      changes: [String],
      triggeredBy: {
        type: String,
        enum: ['law_change', 'periodic_scan', 'manual', 'init'],
        default: 'periodic_scan'
      }
    }],

    // Law Insights (Enhanced)
    lawInsights: [{
      law: String,                  // "DSGVO Art. 13"
      sectionId: String,            // "Art.13(1)"
      sourceUrl: String,            // Link to source
      relevance: { type: Number, min: 0, max: 1 }, // Cosine similarity
      lastUpdate: Date,
      area: String                  // Rechtsgebiet
    }],

    // Market Benchmark (Placeholder for Phase 2)
    marketBenchmark: {
      percentile: Number,
      avgScore: Number,
      suggestion: String
    },

    // Predictive Alerts (Placeholder for Phase 2)
    predictiveAlerts: [{
      type: { type: String, enum: ['forecast', 'law_change', 'deadline', 'risk_increase'] },
      probability: { type: Number, min: 0, max: 1 },
      daysUntilImpact: Number,
      description: String,
      createdAt: { type: Date, default: Date.now }
    }],

    // Legacy fields (keep for backwards compatibility)
    marketSuggestions: [mongoose.Schema.Types.Mixed]
  }
});

module.exports = mongoose.model("Contract", contractSchema);
