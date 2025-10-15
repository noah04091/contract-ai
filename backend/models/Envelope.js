const mongoose = require("mongoose");

// ✉️ Signer Sub-Schema
const signerSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    default: "Signer",
    trim: true
  },
  order: {
    type: Number,
    default: 1
  },
  status: {
    type: String,
    enum: ["PENDING", "SIGNED"],
    default: "PENDING"
  },
  signedAt: {
    type: Date,
    default: null
  },
  ip: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  token: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  tokenExpires: {
    type: Date,
    required: true
  }
}, { _id: false });

// 📝 Signature Field Sub-Schema
const signatureFieldSchema = new mongoose.Schema({
  page: {
    type: Number,
    required: true,
    min: 1
  },
  x: {
    type: Number,
    required: true,
    min: 0
  },
  y: {
    type: Number,
    required: true,
    min: 0
  },
  width: {
    type: Number,
    required: true,
    min: 50
  },
  height: {
    type: Number,
    required: true,
    min: 30
  },
  type: {
    type: String,
    enum: ["signature", "initial", "date", "text"],
    default: "signature"
  },
  assigneeEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  value: {
    type: String, // Base64 signature image or text value
    default: null
  },
  signedAt: {
    type: Date,
    default: null
  }
}, { _id: true });

// 📋 Audit Event Sub-Schema
const auditEventSchema = new mongoose.Schema({
  event: {
    type: String,
    required: true,
    enum: [
      "CREATED",
      "SENT",
      "OPENED",
      "SIGNED",
      "COMPLETED",
      "VOIDED",
      "EXPIRED",
      "REMINDER_SENT",
      "LINK_COPIED",
      "PDF_SEALED",           // ✉️ NEU: PDF wurde versiegelt
      "PDF_SEALING_FAILED"    // ✉️ NEU: PDF-Sealing fehlgeschlagen
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },
  email: {
    type: String,
    default: null
  },
  ip: {
    type: String,
    default: null
  },
  userAgent: {
    type: String,
    default: null
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { _id: true });

// ✉️ Main Envelope Schema
const envelopeSchema = new mongoose.Schema({
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contract",
    default: null,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  message: {
    type: String,
    default: "",
    trim: true
  },
  s3Key: {
    type: String,
    required: true // Original PDF in S3
  },
  s3KeySealed: {
    type: String,
    default: null // Signed/sealed PDF in S3
  },
  pdfHash: {
    type: String,
    default: null // SHA-256 hash for document integrity
  },
  status: {
    type: String,
    enum: ["DRAFT", "SENT", "SIGNED", "COMPLETED", "EXPIRED", "VOIDED"],
    default: "DRAFT",
    index: true
  },
  signers: [signerSchema],
  signatureFields: [signatureFieldSchema],
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  completedAt: {
    type: Date,
    default: null
  },
  voidedAt: {
    type: Date,
    default: null
  },
  voidReason: {
    type: String,
    default: null
  },
  audit: [auditEventSchema],
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  collection: "envelopes"
});

// 🔄 Update updatedAt on save
envelopeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// 🔍 Instance Methods

/**
 * Add audit event to envelope
 */
envelopeSchema.methods.addAuditEvent = function(event, data = {}) {
  this.audit.push({
    event,
    timestamp: new Date(),
    userId: data.userId || null,
    email: data.email || null,
    ip: data.ip || null,
    userAgent: data.userAgent || null,
    details: data.details || {}
  });
  return this.save();
};

/**
 * Check if envelope is expired
 */
envelopeSchema.methods.isExpired = function() {
  return this.expiresAt && new Date() > this.expiresAt;
};

/**
 * Check if all signers have signed
 */
envelopeSchema.methods.allSigned = function() {
  return this.signers.every(signer => signer.status === "SIGNED");
};

/**
 * Get signer by token
 */
envelopeSchema.methods.getSignerByToken = function(token) {
  return this.signers.find(signer => signer.token === token);
};

/**
 * Get signer by email
 */
envelopeSchema.methods.getSignerByEmail = function(email) {
  return this.signers.find(signer => signer.email.toLowerCase() === email.toLowerCase());
};

/**
 * Get signature fields for a specific signer
 */
envelopeSchema.methods.getSignatureFieldsForSigner = function(email) {
  return this.signatureFields.filter(
    field => field.assigneeEmail.toLowerCase() === email.toLowerCase()
  );
};

// 🔍 Static Methods

/**
 * Find envelope by signer token
 */
envelopeSchema.statics.findBySignerToken = function(token) {
  return this.findOne({ "signers.token": token });
};

/**
 * Find envelopes by owner
 */
envelopeSchema.statics.findByOwner = function(ownerId, options = {}) {
  const query = this.find({ ownerId });

  if (options.status) {
    query.where("status").equals(options.status);
  }

  if (options.limit) {
    query.limit(options.limit);
  }

  return query.sort({ createdAt: -1 });
};

/**
 * Find expired envelopes that need status update
 */
envelopeSchema.statics.findExpiredEnvelopes = function() {
  return this.find({
    status: { $in: ["DRAFT", "SENT"] },
    expiresAt: { $lt: new Date() }
  });
};

// 📊 Indexes for performance
envelopeSchema.index({ ownerId: 1, status: 1 });
envelopeSchema.index({ contractId: 1 });
envelopeSchema.index({ "signers.token": 1 });
envelopeSchema.index({ expiresAt: 1, status: 1 });
envelopeSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Envelope", envelopeSchema);
