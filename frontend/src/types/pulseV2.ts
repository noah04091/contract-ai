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

export interface PulseV2Clause {
  id: string;
  title: string;
  originalText: string;
  category: string;
  sectionNumber: string;
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

export type PulseV2Status = 'idle' | 'analyzing' | 'completed' | 'error';

export interface StageInfo {
  id: number;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  detail?: string;
}
