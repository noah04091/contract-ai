const mongoose = require("mongoose");

/**
 * ClauseAnalysis Model
 *
 * Speichert die KI-Analyse einzelner Vertragsklauseln für Legal Lens.
 * Jede Klausel kann aus verschiedenen Perspektiven analysiert werden.
 */
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

  // Risiko-Bewertung (Basis)
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

  // Analysen pro Perspektive
  perspectives: {
    // Aus Sicht des Auftraggebers (Kunde)
    contractor: {
      explanation: {
        simple: String,
        detailed: String
      },
      impact: {
        financial: String,
        legal: String,
        operational: String
      },
      consequences: [String],
      recommendation: String,
      analyzedAt: Date
    },

    // Aus Sicht des Auftragnehmers (Anbieter)
    client: {
      explanation: {
        simple: String,
        detailed: String
      },
      impact: {
        financial: String,
        legal: String,
        operational: String
      },
      consequences: [String],
      recommendation: String,
      analyzedAt: Date
    },

    // Marktübliche/Neutrale Sicht
    neutral: {
      explanation: {
        simple: String,
        detailed: String
      },
      impact: {
        financial: String,
        legal: String,
        operational: String
      },
      consequences: [String],
      recommendation: String,
      marketComparison: {
        isStandard: Boolean,
        marketRange: String,
        deviation: String,
        industryNorm: String
      },
      analyzedAt: Date
    },

    // Worst-Case Auslegung
    worstCase: {
      explanation: {
        simple: String,
        detailed: String
      },
      impact: {
        financial: String,
        legal: String,
        operational: String
      },
      consequences: [String],
      recommendation: String,
      worstCaseScenario: String,
      probabilityAssessment: String,
      analyzedAt: Date
    }
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

  // Marktvergleich
  marketComparison: {
    isStandard: Boolean,
    marketRange: String,
    deviation: String,
    percentile: Number,
    industrySpecific: String
  },

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
    default: 1
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
});

// Compound Index für schnelle Lookups
clauseAnalysisSchema.index({ contractId: 1, clauseId: 1 }, { unique: true });
clauseAnalysisSchema.index({ contractId: 1, riskLevel: 1 });
clauseAnalysisSchema.index({ clauseTextHash: 1 });

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
