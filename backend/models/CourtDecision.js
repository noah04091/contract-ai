// 📁 backend/models/CourtDecision.js
// Rechtsprechungs-Datenbank - BGH/OLG-Urteile mit Embeddings für RAG

const mongoose = require("mongoose");

const courtDecisionSchema = new mongoose.Schema({
  // Identifikation
  caseNumber: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  // Gericht
  court: {
    type: String,
    required: true,
    index: true,
    enum: [
      'BGH',           // Bundesgerichtshof
      'BAG',           // Bundesarbeitsgericht
      'BVerfG',        // Bundesverfassungsgericht
      'BFH',           // Bundesfinanzhof
      'BSG',           // Bundessozialgericht
      'BVerwG',        // Bundesverwaltungsgericht
      'OLG',           // Oberlandesgericht
      'LAG',           // Landesarbeitsgericht
      'LG',            // Landgericht
      'AG',            // Amtsgericht
      'ArbG',          // Arbeitsgericht
      'Sonstige'
    ]
  },

  // Senat/Kammer (z.B. "XII. Zivilsenat")
  senate: {
    type: String
  },

  // Datum der Entscheidung
  decisionDate: {
    type: Date,
    required: true,
    index: true
  },

  // Rechtsgebiet
  legalArea: {
    type: String,
    required: true,
    index: true,
    enum: [
      'Mietrecht',
      'Arbeitsrecht',
      'Kaufrecht',
      'Vertragsrecht',
      'Gesellschaftsrecht',
      'Familienrecht',
      'Erbrecht',
      'Baurecht',
      'Versicherungsrecht',
      'Bankrecht',
      'Wettbewerbsrecht',
      'Datenschutzrecht',
      'Handelsrecht',
      'Sonstiges'
    ]
  },

  // Leitsätze (die wichtigsten Aussagen)
  headnotes: {
    type: [String],
    required: true
  },

  // Zusammenfassung
  summary: {
    type: String,
    required: true
  },

  // Relevante Normen (z.B. ["§ 535 BGB", "§ 573 BGB"])
  relevantLaws: {
    type: [String],
    default: []
  },

  // Schlagworte
  keywords: {
    type: [String],
    default: [],
    index: true
  },

  // Quelle
  sourceUrl: {
    type: String
  },

  // Vector Embedding (Float32 Array für RAG)
  embedding: {
    type: [Number],
    default: []
  },

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Compound Index für effiziente Queries
courtDecisionSchema.index({ court: 1, legalArea: 1 });
courtDecisionSchema.index({ legalArea: 1, decisionDate: -1 });
courtDecisionSchema.index({ keywords: 1 });

// Statics
courtDecisionSchema.statics.findByLegalArea = function(area, limit = 50) {
  return this.find({ legalArea: area })
    .sort({ decisionDate: -1 })
    .limit(limit);
};

courtDecisionSchema.statics.findByCourt = function(court, limit = 50) {
  return this.find({ court })
    .sort({ decisionDate: -1 })
    .limit(limit);
};

courtDecisionSchema.statics.findByKeyword = function(keyword, limit = 20) {
  return this.find({
    $or: [
      { keywords: { $regex: keyword, $options: 'i' } },
      { summary: { $regex: keyword, $options: 'i' } },
      { headnotes: { $regex: keyword, $options: 'i' } }
    ]
  })
    .sort({ decisionDate: -1 })
    .limit(limit);
};

courtDecisionSchema.statics.findRecentDecisions = function(daysBack = 365) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysBack);

  return this.find({
    decisionDate: { $gte: cutoffDate }
  }).sort({ decisionDate: -1 });
};

const CourtDecision = mongoose.model("CourtDecision", courtDecisionSchema);

module.exports = CourtDecision;
