// Legal Pulse - Shared Types
// Single source of truth for all Legal Pulse related interfaces

export interface Contract {
  _id: string;
  name: string;
  laufzeit: string;
  kuendigung: string;
  expiryDate?: string;
  status?: string;
  uploadedAt?: string;
  filePath?: string;
  s3Key?: string;
  s3Location?: string;
  s3Bucket?: string;
  reminder?: boolean;
  isGenerated?: boolean;
  createdAt?: string;
  provider?: string;
  contractNumber?: string;
  customerNumber?: string;
  amount?: number;
  legalPulse?: {
    riskScore: number | null;
    healthScore?: number;
    adjustedRiskScore?: number | null;
    adjustedHealthScore?: number | null;
    lastAnalysis?: string;
    lastChecked?: string;
    lastRecommendation?: string;
    summary?: string;
    nextScheduledCheck?: string;
    topRisks?: RiskObject[];
    recommendations?: RecommendationObject[];
    scoreHistory?: Array<{ date: string; score: number }>;
    analysisHistory?: Array<{
      date: string;
      riskScore: number;
      healthScore?: number;
      changes: string[];
      triggeredBy: string;
    }>;
    lawInsights?: Array<{
      law: string;
      sectionId: string;
      sourceUrl?: string;
      relevance?: number;
      area?: string;
    }>;
  };
}

export interface RecommendationStatus {
  [key: string]: boolean;
}

export type RiskStatus = 'open' | 'resolved' | 'accepted';

export interface RiskObject {
  title: string;
  description?: string;
  severity?: string;
  impact?: string;
  solution?: string;
  recommendation?: string;
  affectedClauses?: string[];
  affectedClauseText?: string;
  replacementText?: string;
  legalBasis?: string;
  // Risk management fields
  status?: RiskStatus;
  resolvedAt?: string;
  userComment?: string;
  userEdits?: {
    title?: string;
    description?: string;
    severity?: string;
  };
}

export interface RecommendationObject {
  title: string;
  description?: string;
  priority?: string;
  effort?: string;
  impact?: string;
  steps?: string[];
  affectedClauseRef?: string;
  suggestedText?: string;
  legalBasis?: string;
}

export type RecommendationInput = string | RecommendationObject;

export interface MonitoringHealth {
  status: 'healthy' | 'warning' | 'critical' | 'unknown';
  lastSuccessfulRun: string | null;
  hoursAgo: number | null;
  nextExpectedRun: string | null;
  feeds: {
    active: number;
    errored: number;
    totalFeeds: number;
  };
  vectorStore: {
    contractChunks: number;
    lawSections: number;
    indexedContracts: number;
    totalContracts: number;
    indexCoverage: number;
  };
  pendingDigests: number;
  lastStats: {
    lawChangesProcessed: number;
    contractsChecked: number;
    alertsSent: number;
    duration: number;
  } | null;
}

export interface PulseAlert {
  _id: string;
  contractId: string;
  contractName: string;
  lawTitle: string;
  lawArea: string | null;
  score: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  explanation: string | null;
  read: boolean;
  createdAt: string;
}

export interface WeeklyCheckFinding {
  type: 'law_change' | 'risk' | 'improvement' | 'compliance';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  affectedClause?: string;
  legalBasis?: string;
  recommendation?: string;
}

export interface WeeklyCheckMetadata {
  analyzedPercentage: number;
  chunksAnalyzed: number;
  totalCharacters: number;
  confidenceScore: number;
  dataSourcesUsed: string[];
  lastDataSync: string;
  disclaimer: string;
}

export interface WeeklyCheckContract {
  contractId: string;
  contractName: string;
  latestCheck: {
    checkDate: string;
    stage1Results: {
      lawChangesFound: number;
      relevantChanges: Array<{ lawId: string; title: string; score: number }>;
    };
    stage2Results: {
      hasChanges: boolean;
      overallStatus: 'aktuell' | 'handlungsbedarf' | 'kritisch';
      findings: WeeklyCheckFinding[];
      summary: string;
    };
    metadata?: WeeklyCheckMetadata;
  };
  history: Array<{
    checkDate: string;
    overallStatus: string;
    findingsCount: number;
    summary: string;
  }>;
}

export interface WeeklyChecksData {
  contracts: WeeklyCheckContract[];
  totalChecks: number;
}

export interface ForecastEvent {
  type: string;
  severity: string;
  description: string;
  probability: number;
}

export interface ForecastMonth {
  month: number;
  date: string;
  predictedRisk: number;
  predictedHealth: number;
  confidence: number;
  events: ForecastEvent[];
  method: 'ml' | 'heuristic';
}

export interface ForecastData {
  contractId: string;
  currentState: {
    impactScore: number;
    factors: {
      baseRisk: number;
      ageFactor: number;
      changeDensity: number;
      lawChangeFactor: number;
      trendFactor: number;
    };
    recommendation: string;
  };
  forecast: ForecastMonth[];
  forecastMethod: 'ml' | 'heuristic';
  generatedAt: string;
  summary: {
    avgRisk: number;
    maxRisk: number;
    criticalMonths: number;
    trend: 'increasing' | 'stable' | 'decreasing';
    highProbabilityEvents: number;
    recommendation: string;
  };
}

export interface ExternalSearchResult {
  source: string;
  title: string;
  description?: string;
  date?: string;
  documentId?: string;
  relevance?: number;
  url?: string;
  area?: string;
  type?: string;
  celex?: string;
  court?: string;
}

export interface Organization {
  id: string;
  name: string;
  ownerId: string;
  companyLogo?: string;
  memberCount: number;
  maxMembers: number;
}

export interface TeamMember {
  userId: string;
  name: string;
  email: string;
  role: 'admin' | 'member' | 'viewer';
  avatar?: string;
}

export interface Membership {
  role: 'admin' | 'member' | 'viewer';
  permissions: string[];
  isOwner: boolean;
}
