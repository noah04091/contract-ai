const mongoose = require("mongoose");

/**
 * ClauseAnalysis Model - UPDATED für Legal Lens v2
 *
 * Speichert die KI-Analyse einzelner Vertragsklauseln für Legal Lens.
 * Jede Klausel kann aus verschiedenen Perspektiven analysiert werden.
 */

// Sub-Schema für Konsequenzen (jetzt als Objekte statt Strings)
const consequenceSchema = new mongoose.Schema({
  scenario: String,
  probability: {
    type: String,
    enum: ["low", "medium", "high", "unlikely", "possible", "likely"]
  },
  impact: String
}, { _id: false });

// Sub-Schema für Worst-Case Szenario
const worstCaseSchema = new mongoose.Schema({
  scenario: String,
  financialRisk: String,
  timeRisk: String,
  probability: {
    type: String,
    enum: ["unlikely", "possible", "likely", "low", "medium", "high"]
  }
}, { _id: false });

// Sub-Schema für bessere Alternative
const betterAlternativeSchema = new mongoose.Schema({
  text: String,
  whyBetter: String,
  howToAsk: String
}, { _id: false });

// Sub-Schema für Marktvergleich
const marketComparisonSchema = new mongoose.Schema({
  isStandard: Boolean,
  marketRange: String,
  deviation: String,
  industryNorm: String
}, { _id: false });

// Sub-Schema für Perspektive-Analyse
const perspectiveAnalysisSchema = new mongoose.Schema({
  // NEU: Action Level (accept/negotiate/reject)
  actionLevel: {
    type: String,
    enum: ["accept", "negotiate", "reject"]
  },
  actionReason: String,

  // Erklärung (erweitert)
  explanation: {
    simple: String,
    detailed: String,
    whatItMeansForYou: String  // NEU
  },

  // Risiko-Bewertung mit Gründen
  riskAssessment: {
    level: {
      type: String,
      enum: ["low", "medium", "high"]
    },
    score: {
      type: Number,
      min: 0,
      max: 100
    },
    reasons: [String]
  },

  // NEU: Worst-Case Szenario
  worstCase: worstCaseSchema,

  // Impact (erweitert)
  impact: {
    financial: String,
    legal: String,
    operational: String,
    negotiationPower: {
      type: Number,
      min: 0,
      max: 100
    }
  },

  // Konsequenzen (jetzt als Objekte)
  consequences: [consequenceSchema],

  // Empfehlung
  recommendation: String,

  // NEU: Bessere Alternative
  betterAlternative: betterAlternativeSchema,

  // Marktvergleich
  marketComparison: marketComparisonSchema,

  // Wann analysiert
  analyzedAt: Date
}, { _id: false });

// Hauptschema
const clauseAnalysisSchema = new mongoose.Schema({
  // Referenzen
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contract",
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  // Klausel-Identifikation
  clauseId: {
    type: String,
    required: true,
    index: true
  },
  sectionTitle: String,
  clauseText: {
    type: String,
    required: true
  },
  clauseTextHash: {
    type: String,
    index: true
  },

  // Position im Dokument
  position: {
    start: Number,
    end: Number,
    page: Number,
    paragraph: Number
  },

  // Risiko-Bewertung (Basis - Top-Level)
  riskLevel: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "low"
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  riskKeywords: [String],

  // NEU: Top-Level Action für schnellen Zugriff
  actionLevel: {
    type: String,
    enum: ["accept", "negotiate", "reject"]
  },

  // Analysen pro Perspektive (alle mit gleichem Schema)
  perspectives: {
    contractor: perspectiveAnalysisSchema,
    client: perspectiveAnalysisSchema,
    neutral: perspectiveAnalysisSchema,
    worstCase: perspectiveAnalysisSchema
  },

  // Alternative Formulierungen
  alternatives: [{
    text: {
      type: String,
      required: true
    },
    benefits: [String],
    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      default: "medium"
    },
    explanation: String,
    legalBasis: String
  }],

  // Verhandlungshilfen
  negotiation: {
    argument: String,
    emailTemplate: String,
    counterProposal: String,
    tips: [String],
    successProbability: {
      type: String,
      enum: ["low", "medium", "high"]
    }
  },

  // Marktvergleich (Top-Level)
  marketComparison: marketComparisonSchema,

  // Chat-Verlauf für diese Klausel
  chatHistory: [{
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // Meta-Informationen
  version: {
    type: Number,
    default: 2  // Version 2 für neues Schema
  },
  aiModel: {
    type: String,
    default: "gpt-4-turbo-preview"
  },
  tokensUsed: Number,
  processingTimeMs: Number,

  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  // Mongoose-Optionen: Erlaube flexible Schemas
  strict: false  // Erlaubt zusätzliche Felder die nicht im Schema sind
});

// Compound Index für schnelle Lookups
clauseAnalysisSchema.index({ contractId: 1, clauseId: 1 }, { unique: true });
clauseAnalysisSchema.index({ contractId: 1, riskLevel: 1 });
clauseAnalysisSchema.index({ clauseTextHash: 1 });
clauseAnalysisSchema.index({ contractId: 1, actionLevel: 1 });

// Pre-save Hook für updatedAt
clauseAnalysisSchema.pre("save", function(next) {
  this.updatedAt = new Date();
  next();
});

// Virtuals
clauseAnalysisSchema.virtual("hasAllPerspectives").get(function() {
  return !!(
    this.perspectives?.contractor?.analyzedAt &&
    this.perspectives?.client?.analyzedAt &&
    this.perspectives?.neutral?.analyzedAt &&
    this.perspectives?.worstCase?.analyzedAt
  );
});

// Methoden
clauseAnalysisSchema.methods.getPerspective = function(perspectiveType) {
  if (!this.perspectives || !this.perspectives[perspectiveType]) {
    return null;
  }
  return this.perspectives[perspectiveType];
};

clauseAnalysisSchema.methods.hasPerspective = function(perspectiveType) {
  return !!(this.perspectives?.[perspectiveType]?.analyzedAt);
};

// Statische Methoden
clauseAnalysisSchema.statics.findByContract = function(contractId) {
  return this.find({ contractId }).sort({ "position.start": 1 });
};

clauseAnalysisSchema.statics.findHighRiskClauses = function(contractId) {
  return this.find({
    contractId,
    riskLevel: "high"
  }).sort({ riskScore: -1 });
};

clauseAnalysisSchema.statics.findDealbreakers = function(contractId) {
  return this.find({
    contractId,
    actionLevel: "reject"
  });
};

clauseAnalysisSchema.statics.getOrCreate = async function(contractId, userId, clauseId, clauseText) {
  let analysis = await this.findOne({ contractId, clauseId });

  if (!analysis) {
    analysis = new this({
      contractId,
      userId,
      clauseId,
      clauseText
    });
    await analysis.save();
  }

  return analysis;
};

module.exports = mongoose.model("ClauseAnalysis", clauseAnalysisSchema);
