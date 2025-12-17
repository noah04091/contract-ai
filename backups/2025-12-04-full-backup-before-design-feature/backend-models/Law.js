// 📁 backend/models/Law.js
// Legal Pulse 2.0 - Paragraph-granulare Gesetzes-Speicherung mit Embeddings

const mongoose = require("mongoose");

const lawSchema = new mongoose.Schema({
  // Identifikation
  lawId: {
    type: String,
    required: true,
    index: true
  },

  sectionId: {
    type: String,
    required: true,
    index: true
  },

  // Content
  title: {
    type: String,
    required: true
  },

  text: {
    type: String,
    required: true
  },

  // Metadata
  sourceUrl: {
    type: String,
    required: true
  },

  area: {
    type: String,
    required: true,
    index: true,
    enum: [
      'Verbraucherschutz',
      'DSGVO',
      'BGB',
      'HGB',
      'UWG',
      'Arbeitsrecht',
      'Mietrecht',
      'Kaufrecht',
      'Gesellschaftsrecht',
      'Sonstiges'
    ]
  },

  // Timestamps
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  },

  // Vector Embedding (Float32 Array)
  embedding: {
    type: [Number],
    default: []
  },

  // Optional: Zusätzliche Metadaten
  keywords: [String],
  relatedSections: [String],
  version: String,
  language: {
    type: String,
    default: 'de'
  }
});

// Compound Index für effiziente Queries
lawSchema.index({ lawId: 1, sectionId: 1 }, { unique: true });
lawSchema.index({ area: 1, updatedAt: -1 });

// Methods
lawSchema.methods.getSimilarSections = async function(limit = 5) {
  // Placeholder für spätere Vektor-Ähnlichkeitssuche
  return await this.constructor.find({
    area: this.area,
    _id: { $ne: this._id }
  }).limit(limit);
};

lawSchema.statics.findRecentChanges = function(daysBack = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  return this.find({
    updatedAt: { $gte: cutoffDate }
  }).sort({ updatedAt: -1 });
};

lawSchema.statics.findByArea = function(area, limit = 100) {
  return this.find({ area }).limit(limit).sort({ lawId: 1, sectionId: 1 });
};

const Law = mongoose.model("Law", lawSchema);

module.exports = Law;
