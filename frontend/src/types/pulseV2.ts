export interface PulseV2Finding {
  clauseId: string;
  category: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  type: 'risk' | 'compliance' | 'opportunity' | 'information';
  title: string;
  description: string;
  legalBasis: string;
  affectedText: string;
  confidence: number;
  reasoning: string;
  isIntentional: boolean;
}

export interface PulseV2ClauseVersion {
  version: number;
  text: string;
  source: 'original' | 'legal_pulse_fix' | 'user_edit';
  reasoning?: string;
  legalBasis?: string;
  changeType?: string;
  alertId?: string;
  lawTitle?: string;
  appliedAt: string;
}

export interface PulseV2Clause {
  id: string;
  title: string;
  originalText: string;
  currentText?: string;
  category: string;
  sectionNumber: string;
  history?: PulseV2ClauseVersion[];
}

export interface PulseV2Scores {
  overall: number;
  risk: number;
  compliance: number;
  terms: number;
  completeness: number;
  factors: {
    riskSeverity: number;
    contractAge: number;
    deadlineProximity: number;
    historicalTrend: number;
  };
}

export interface PulseV2Document {
  qualityScore: number;
  pageCount: number;
  language: string;
  structureDetected: boolean;
  cleanedTextLength: number;
  contractType: string;
  contractTypeConfidence: number;
  extractedMeta: {
    parties: string[];
    contractDate: string | null;
    contractType: string;
  };
}

export interface PulseV2Context {
  contractName: string;
  contractType: string | null;
  parties: string[];
  duration: string | null;
  startDate: string | null;
  endDate: string | null;
  daysUntilExpiry: number | null;
  autoRenewal: boolean;
  provider: string | null;
  portfolioSize: number;
  relatedContracts: { name: string; type: string; endDate: string | null }[];
  previousAnalysisCount: number;
  lastAnalysisDate: string | null;
  riskTrend: string;
}

export interface PulseV2PortfolioInsight {
  type: 'concentration_risk' | 'conflict' | 'renewal_cluster' | 'opportunity' | 'benchmark_gap';
  title: string;
  description: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  relatedContracts: string[];
  confidence: number;
  reasoning?: string;
}

export interface PulseV2Action {
  id: string;
  priority: 'now' | 'plan' | 'watch';
  title: string;
  description: string;
  relatedContracts: string[];
  estimatedImpact: string;
  confidence: number;
  nextStep: string;
  status: 'open' | 'done' | 'dismissed';
}

export interface PulseV2Result {
  _id: string;
  userId: string;
  contractId: string;
  requestId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStage: number;
  triggeredBy: 'manual' | 'scheduled';
  document: PulseV2Document;
  context: PulseV2Context;
  clauses: PulseV2Clause[];
  clauseFindings: PulseV2Finding[];
  portfolioInsights: PulseV2PortfolioInsight[];
  actions: PulseV2Action[];
  scores: PulseV2Scores;
  costs: {
    totalTokensInput: number;
    totalTokensOutput: number;
    totalCostUSD: number;
    perStage: { stage: number; stageName: string; model: string; inputTokens: number; outputTokens: number; costUSD: number }[];
  };
  previousResultId: string | null;
  version: string;
  createdAt: string;
  completedAt: string;
  error?: string;
}

export interface PulseV2DashboardItem {
  contractId: string;
  name: string;
  contractType: string | null;
  provider: string | null;
  endDate: string | null;
  hasV2Result: boolean;
  v2Score: number | null;
  v2FindingsCount: number;
  v2CriticalCount: number;
  v2LastAnalysis: string | null;
  legacyHealthScore: number | null;
}

export interface PulseV2HistoryEntry {
  _id: string;
  requestId: string;
  scores: PulseV2Scores;
  triggeredBy: string;
  contractType: string | null;
  findingsCount: number;
  criticalCount: number;
  highCount: number;
  costUSD: number;
  createdAt: string;
  completedAt: string;
}

export interface PulseV2ProgressEvent {
  progress: number;
  message: string;
  requestId?: string;
  stage?: number;
  stageName?: string;
  complete?: boolean;
  error?: boolean;
  resultId?: string;
  scores?: PulseV2Scores;
  findingsCount?: number;
  clauseCount?: number;
  contractType?: string;
  qualityScore?: number;
  batchProgress?: string;
}

export interface PulseV2ClauseImpact {
  clauseId: string;
  clauseTitle: string;
  impact: string;
  suggestedChange: string;
}

export type LawStatus = 'proposal' | 'passed' | 'effective' | 'court_decision' | 'guideline' | 'unknown';

export interface PulseV2LegalAlert {
  _id: string;
  userId: string;
  contractId: string;
  contractName: string;
  lawId: string;
  lawTitle: string;
  lawArea: string;
  lawStatus?: LawStatus;
  lawSource: string;
  impactSummary: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  recommendation: string;
  affectedClauseIds: string[];
  clauseImpacts: PulseV2ClauseImpact[];
  status: 'unread' | 'read' | 'dismissed' | 'resolved';
  resolvedClauseIds?: string[];
  lastFixAppliedAt?: string;
  createdAt: string;
}

export interface PulseV2AutoFixResult {
  clauseId: string;
  clauseTitle: string;
  originalText: string;
  fixedText: string;
  reasoning: string;
  legalBasis: string;
  changeType: 'major_rewrite' | 'targeted_fix' | 'addition' | 'removal';
  diffs: { type: 'equal' | 'add' | 'remove'; text: string }[];
  costUSD: number;
  staleWarning?: string;
}

export type PulseV2Status = 'idle' | 'analyzing' | 'completed' | 'error';

export interface StageInfo {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  detail?: string;
}
