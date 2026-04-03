const mongoose = require('mongoose');

const diffOpSchema = new mongoose.Schema({
  type: { type: String, enum: ['equal', 'remove', 'add'] },
  text: String
}, { _id: false });

const clauseSchema = new mongoose.Schema({
  id: String,
  title: String,
  originalText: String,
  category: String,
  sectionNumber: String,
  startPosition: Number,
  endPosition: Number
}, { _id: false });

const clauseAnalysisSchema = new mongoose.Schema({
  clauseId: String,
  summary: String,
  legalAssessment: String,
  keyTerms: [String],
  legalReferences: [String],
  strength: { type: String, enum: ['strong', 'adequate', 'weak', 'missing', 'critical'] },
  importanceLevel: { type: String, enum: ['critical', 'high', 'medium', 'low'] },
  concerns: [String],
  riskLevel: { type: Number, min: 0, max: 10 },
  riskType: String,
  plainLanguage: String,
  economicRiskAssessment: String,
  powerBalance: { type: String, enum: ['balanced', 'slightly_one_sided', 'strongly_one_sided', 'extremely_one_sided'] },
  marketComparison: { type: String, enum: ['below_market', 'market_standard', 'slightly_strict', 'significantly_strict', 'unusually_disadvantageous'] },
  creatorView: String,
  recipientView: String,
  neutralRecommendation: String
}, { _id: false });

const optimizationVersionSchema = new mongoose.Schema({
  text: String,
  reasoning: String,
  diffs: [diffOpSchema]
}, { _id: false });

const optimizationSchema = new mongoose.Schema({
  clauseId: String,
  needsOptimization: { type: Boolean, default: true },
  versions: {
    neutral: optimizationVersionSchema,
    proCreator: optimizationVersionSchema,
    proRecipient: optimizationVersionSchema
  },
  marketBenchmark: String,
  negotiationAdvice: String
}, { _id: false });

const clauseChatMessageSchema = new mongoose.Schema({
  role: { type: String, enum: ['user', 'assistant'] },
  content: String,
  timestamp: { type: Date, default: Date.now },
  generatedVersion: String
}, { _id: false });

const clauseChatSchema = new mongoose.Schema({
  clauseId: String,
  messages: [clauseChatMessageSchema],
  currentVersion: String
}, { _id: false });

const costStageSchema = new mongoose.Schema({
  stage: Number,
  stageName: String,
  model: String,
  inputTokens: Number,
  outputTokens: Number,
  costUSD: Number,
  durationMs: Number
}, { _id: false });

const userSelectionSchema = new mongoose.Schema({
  clauseId: String,
  selectedVersion: { type: String, enum: ['neutral', 'proCreator', 'proRecipient', 'original', 'custom'] },
  customText: String,
  selectedAt: { type: Date, default: Date.now }
}, { _id: false });

const optimizerV2ResultSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  contractId: mongoose.Schema.Types.ObjectId,
  requestId: { type: String, required: true },

  // Input
  fileName: String,
  fileSize: Number,
  textLength: Number,
  textHash: String,
  s3Key: String,
  originalText: String,
  ocrApplied: { type: Boolean, default: false },

  // Pipeline State
  status: {
    type: String,
    enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
    default: 'pending'
  },
  currentStage: { type: Number, default: 0 },
  error: String,
  startedAt: Date,
  completedAt: Date,

  // Stage 1: Structure Recognition
  structure: {
    contractType: String,
    contractTypeLabel: String,
    contractTypeConfidence: Number,
    jurisdiction: String,
    language: String,
    isAmendment: Boolean,
    recognizedAs: String,
    industry: String,
    maturity: String,
    parties: [{
      role: String,
      name: String,
      address: String,
      _id: false
    }],
    duration: String,
    startDate: String,
    endDate: String,
    legalFramework: [String],
    keyDates: [{
      type: { type: String },
      date: String,
      description: String,
      _id: false
    }]
  },

  // Stage 2: Clauses
  clauses: [clauseSchema],

  // Stage 3: Clause Analyses
  clauseAnalyses: [clauseAnalysisSchema],

  // Stage 4: Optimizations (3 versions each)
  optimizations: [optimizationSchema],

  // Stage 5: Scores
  scores: {
    overall: Number,
    risk: Number,
    fairness: Number,
    clarity: Number,
    completeness: Number,
    marketStandard: Number,
    perClause: [{
      clauseId: String,
      score: Number,
      importanceLevel: String,
      _id: false
    }],
    missingClauses: [{
      category: String,
      categoryLabel: String,
      severity: String,
      foundInContent: { type: Boolean, default: false },
      recommendation: String,
      _id: false
    }]
  },

  // User Interaction
  activeMode: {
    type: String,
    enum: ['neutral', 'proCreator', 'proRecipient'],
    default: 'neutral'
  },
  userSelections: [userSelectionSchema],
  clauseChats: [clauseChatSchema],

  // Perspective (set before analysis)
  perspective: {
    type: String,
    enum: ['neutral', 'creator', 'recipient'],
    default: 'neutral'
  },

  // Cost Tracking
  costs: {
    totalTokensInput: { type: Number, default: 0 },
    totalTokensOutput: { type: Number, default: 0 },
    totalCostUSD: { type: Number, default: 0 },
    perStage: [costStageSchema]
  },

  // Generated Missing Clauses (cached)
  generatedClauses: [{
    category: String,
    categoryLabel: String,
    text: String,
    whyImportant: String,
    createdAt: { type: Date, default: Date.now },
    _id: false
  }],

  // Generated Contract (after user finalizes)
  generatedContractId: mongoose.Schema.Types.ObjectId,

  version: { type: String, default: '2.0.0' }
}, {
  timestamps: true,
  collection: 'optimizer_v2_results'
});

// Indexes
optimizerV2ResultSchema.index({ userId: 1, createdAt: -1 });
optimizerV2ResultSchema.index({ requestId: 1 }, { unique: true });
optimizerV2ResultSchema.index({ status: 1 });
optimizerV2ResultSchema.index({ userId: 1, textHash: 1, status: 1 });

module.exports = mongoose.model('OptimizerV2Result', optimizerV2ResultSchema);
