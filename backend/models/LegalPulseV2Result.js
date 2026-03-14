const mongoose = require("mongoose");

const clauseSchema = new mongoose.Schema({
  id: String,
  title: String,
  originalText: String,
  category: String,
  sectionNumber: String,
}, { _id: false });

const clauseFindingSchema = new mongoose.Schema({
  clauseId: String,
  category: String,
  severity: { type: String, enum: ["info", "low", "medium", "high", "critical"] },
  type: { type: String, enum: ["risk", "compliance", "opportunity", "information"] },
  title: String,
  description: String,
  legalBasis: String,
  affectedText: String,
  confidence: { type: Number, min: 0, max: 100 },
  reasoning: String,
  isIntentional: Boolean,
}, { _id: false });

const costStageSchema = new mongoose.Schema({
  stage: Number,
  stageName: String,
  model: String,
  inputTokens: { type: Number, default: 0 },
  outputTokens: { type: Number, default: 0 },
  costUSD: { type: Number, default: 0 },
}, { _id: false });

const legalPulseV2ResultSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  contractId: { type: String, required: true, index: true },
  requestId: { type: String, required: true },

  status: {
    type: String,
    enum: ["pending", "running", "completed", "failed"],
    default: "pending",
  },
  currentStage: { type: Number, default: 0 },
  error: String,
  triggeredBy: { type: String, enum: ["manual", "scheduled"], default: "manual" },

  // Stage 0 — Document Intelligence
  document: {
    qualityScore: Number,
    pageCount: Number,
    language: String,
    structureDetected: Boolean,
    cleanedTextLength: Number,
    contractType: String,
    contractTypeConfidence: Number,
    extractedMeta: {
      parties: [String],
      contractDate: String,
      contractType: String,
    },
  },

  // Stage 1 — Context Gathering
  context: {
    contractName: String,
    contractType: String,
    parties: [String],
    duration: String,
    startDate: Date,
    endDate: Date,
    daysUntilExpiry: Number,
    autoRenewal: Boolean,
    provider: String,
    portfolioSize: Number,
    relatedContracts: [{
      name: String,
      type: String,
      endDate: Date,
      _id: false,
    }],
    previousAnalysisCount: Number,
    lastAnalysisDate: Date,
    riskTrend: String,
  },

  // Stage 2 — Deep Analysis
  clauses: [clauseSchema],
  clauseFindings: [clauseFindingSchema],

  // Stage 5 — Score Calculation
  scores: {
    overall: Number,
    risk: Number,
    compliance: Number,
    terms: Number,
    completeness: Number,
    factors: {
      riskSeverity: Number,
      contractAge: Number,
      deadlineProximity: Number,
      historicalTrend: Number,
    },
  },

  // Cost Tracking
  costs: {
    totalTokensInput: { type: Number, default: 0 },
    totalTokensOutput: { type: Number, default: 0 },
    totalCostUSD: { type: Number, default: 0 },
    perStage: [costStageSchema],
  },

  previousResultId: { type: mongoose.Schema.Types.ObjectId, ref: "LegalPulseV2Result" },
  version: { type: String, default: "2.0.0" },
  startedAt: Date,
  completedAt: Date,
}, {
  timestamps: true,
  collection: "legal_pulse_v2_results",
});

legalPulseV2ResultSchema.index({ userId: 1, createdAt: -1 });
legalPulseV2ResultSchema.index({ contractId: 1, createdAt: -1 });
legalPulseV2ResultSchema.index({ requestId: 1 }, { unique: true });
legalPulseV2ResultSchema.index({ status: 1 });
legalPulseV2ResultSchema.index({ contractId: 1, "clauseFindings.severity": 1 });

module.exports = mongoose.model("LegalPulseV2Result", legalPulseV2ResultSchema);
