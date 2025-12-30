// 📋 EnvelopeTemplate Model - Reusable Signature Request Templates
const mongoose = require("mongoose");

// 📝 Template Field Sub-Schema (without assigneeEmail, uses signerIndex instead)
const templateFieldSchema = new mongoose.Schema({
  page: {
    type: Number,
    required: true,
    min: 1
  },

  // Normalized coordinates (0-1 range)
  nx: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  ny: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  nwidth: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  nheight: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },

  type: {
    type: String,
    enum: ["signature", "initial", "date", "text", "location"],
    default: "signature"
  },

  // Instead of assigneeEmail, use signer index (0 = first signer, 1 = second, etc.)
  signerIndex: {
    type: Number,
    required: true,
    min: 0
  },

  label: {
    type: String,
    default: null,
    trim: true
  },

  required: {
    type: Boolean,
    default: true
  }
});

// 👤 Template Signer Role Sub-Schema (defines roles, not actual signers)
const templateSignerRoleSchema = new mongoose.Schema({
  // Role name (e.g., "Auftraggeber", "Auftragnehmer", "Zeuge")
  roleName: {
    type: String,
    required: true,
    trim: true
  },

  // Order in signing sequence
  order: {
    type: Number,
    required: true,
    min: 1
  }
});

// 📋 Main Template Schema
const envelopeTemplateSchema = new mongoose.Schema({
  // Owner
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  // Template Info
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  description: {
    type: String,
    default: "",
    trim: true,
    maxlength: 500
  },

  // Template Configuration
  signerRoles: [templateSignerRoleSchema],
  fields: [templateFieldSchema],

  // Signing Mode default
  signingMode: {
    type: String,
    enum: ["SINGLE", "SEQUENTIAL", "PARALLEL"],
    default: "PARALLEL"
  },

  // Default message template
  defaultMessage: {
    type: String,
    default: "",
    trim: true,
    maxlength: 1000
  },

  // Metadata
  usageCount: {
    type: Number,
    default: 0
  },

  lastUsedAt: {
    type: Date,
    default: null
  },

  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for fast user queries
envelopeTemplateSchema.index({ ownerId: 1, isArchived: 1, createdAt: -1 });
envelopeTemplateSchema.index({ ownerId: 1, name: 1 });

// Static method to find templates by user
envelopeTemplateSchema.statics.findByOwner = function(ownerId, includeArchived = false) {
  const query = { ownerId };
  if (!includeArchived) {
    query.isArchived = false;
  }
  return this.find(query).sort({ lastUsedAt: -1, createdAt: -1 });
};

// Instance method to increment usage
envelopeTemplateSchema.methods.incrementUsage = async function() {
  this.usageCount += 1;
  this.lastUsedAt = new Date();
  return this.save();
};

module.exports = mongoose.model("EnvelopeTemplate", envelopeTemplateSchema);
