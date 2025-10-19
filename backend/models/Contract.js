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

  // Legal Pulse
  legalPulse: {
    riskScore: Number,
    riskSummary: String,
    lastChecked: Date,
    lawInsights: [mongoose.Schema.Types.Mixed],
    marketSuggestions: [mongoose.Schema.Types.Mixed]
  }
});

module.exports = mongoose.model("Contract", contractSchema);
