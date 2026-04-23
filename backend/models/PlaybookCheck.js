const mongoose = require("mongoose");

/**
 * PlaybookCheck Model
 *
 * Speichert Ergebnisse einer Vertragspruefung gegen ein Playbook.
 * Jede Regel wird einzeln geprueft mit Status, Confidence, Alternativtext.
 */

// Sub-Schema fuer einzelnes Regel-Ergebnis
const ruleResultSchema = new mongoose.Schema({
  // Referenz zur Regel
  ruleId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  ruleTitle: {
    type: String,
    required: true
  },
  ruleCategory: String,
  rulePriority: {
    type: String,
    enum: ["muss", "soll", "kann"]
  },

  // Pruefungsergebnis
  status: {
    type: String,
    enum: [
      "passed",     // Regel erfuellt
      "warning",    // Teilweise / Abweichung
      "failed",     // Nicht erfuellt / Verstoss
      "not_found"   // Keine entsprechende Klausel gefunden
    ],
    required: true
  },

  // Confidence der Pruefung (0-100)
  confidence: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },

  // Was im Vertrag gefunden wurde
  finding: {
    type: String,
    default: ""
  },

  // Referenz zur Stelle im Vertrag (z.B. "Paragraph 5, Absatz 2")
  clauseReference: {
    type: String,
    default: ""
  },

  // Wie die Abweichung aussieht
  deviation: {
    type: String,
    default: ""
  },

  // Risikobewertung
  riskLevel: {
    type: String,
    enum: ["low", "medium", "high"],
    default: "low"
  },
  riskExplanation: {
    type: String,
    default: ""
  },

  // Konkrete Alternativformulierung
  alternativeText: {
    type: String,
    default: ""
  },

  // Verhandlungstipp
  negotiationTip: {
    type: String,
    default: ""
  },

  // War Ergebnis aus globalem Playbook?
  isGlobalRule: {
    type: Boolean,
    default: false
  }
}, { _id: true });

const playbookCheckSchema = new mongoose.Schema({
  // Referenzen
  playbookId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Playbook",
    required: true,
    index: true
  },
  contractId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Contract"
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },

  // Vertragsinformationen
  contractName: {
    type: String,
    required: true
  },

  // Einzelergebnisse pro Regel
  results: [ruleResultSchema],

  // Zusammenfassung
  summary: {
    passed: { type: Number, default: 0 },
    warnings: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    notFound: { type: Number, default: 0 },
    totalRules: { type: Number, default: 0 },
    // Gesamtscore (0-100, gewichtet nach Prioritaet)
    overallScore: { type: Number, default: 0 },
    overallRisk: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "low"
    },
    // Gesamtempfehlung
    recommendation: {
      type: String,
      default: ""
    }
  },

  // Timestamp
  checkedAt: {
    type: Date,
    default: Date.now
  }
});

// Indexes
playbookCheckSchema.index({ userId: 1, checkedAt: -1 });
playbookCheckSchema.index({ playbookId: 1, checkedAt: -1 });
playbookCheckSchema.index({ contractId: 1 }, { sparse: true });

// Statische Methoden
playbookCheckSchema.statics.findByUser = function(userId, options = {}) {
  const query = { userId };

  if (options.playbookId) {
    query.playbookId = options.playbookId;
  }

  return this.find(query)
    .sort({ checkedAt: -1 })
    .limit(options.limit || 20)
    .populate("playbookId", "name contractType");
};

playbookCheckSchema.statics.findByContract = function(contractId) {
  return this.find({ contractId })
    .sort({ checkedAt: -1 })
    .populate("playbookId", "name contractType");
};

playbookCheckSchema.statics.getRecentChecks = function(userId, limit = 5) {
  return this.find({ userId })
    .sort({ checkedAt: -1 })
    .limit(limit)
    .select("contractName summary checkedAt playbookId")
    .populate("playbookId", "name");
};

module.exports = mongoose.model("PlaybookCheck", playbookCheckSchema);
