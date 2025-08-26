// 📁 src/types/optimizer.ts
export interface OptimizationSuggestion {
  id: string;
  category: 'termination' | 'liability' | 'payment' | 'clarity' | 'compliance';
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // AI confidence 0-100
  original: string;
  improved: string;
  reasoning: string;
  legalRisk: number; // 1-10
  businessImpact: number; // 1-10
  implementationDifficulty: 'easy' | 'medium' | 'complex';
  estimatedSavings?: string;
  marketBenchmark?: string;
  implemented: boolean;
  aiInsight: string;
  relatedClauses?: string[];
}

export interface ContractHealthScore {
  overall: number;
  previousScore?: number;
  categories: {
    termination: { score: number; trend: 'up' | 'down' | 'stable' };
    liability: { score: number; trend: 'up' | 'down' | 'stable' };
    payment: { score: number; trend: 'up' | 'down' | 'stable' };
    clarity: { score: number; trend: 'up' | 'down' | 'stable' };
    compliance: { score: number; trend: 'up' | 'down' | 'stable' };
  };
  industryPercentile: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface SmartInsight {
  type: 'warning' | 'opportunity' | 'benchmark' | 'trend';
  title: string;
  description: string;
  action?: string;
  priority: number;
}

export interface OptimizationCategory {
  id: string;
  name: string;
  icon: React.ReactNode;
  color: string;
  count: number;
}

// 🎯 PREMIUM: Auto-Redrafting Types
export interface RedraftResult {
  success: boolean;
  originalText: string;
  optimizedText: string;
  changeLog: string[];
  appliedChanges: AppliedChange[];
  skippedChanges: SkippedChange[];
  diffView: DiffBlock[];
  stats: RedraftStats;
  executiveSummary: ExecutiveSummary;
  metadata: RedraftMetadata;
}

export interface AppliedChange {
  id: string;
  type: 'applied';
  original: string;
  improved: string;
  category: string;
  reasoning: string;
  position: number;
  method: string;
  timestamp: string;
}

export interface SkippedChange {
  id: string;
  type: 'rejected' | 'failed';
  reason: string;
  original: string;
  improved?: string;
  category: string;
}

export interface DiffBlock {
  type: 'unchanged' | 'changed';
  content?: string;
  original?: string;
  improved?: string;
  category?: string;
  reasoning?: string;
  method?: string;
  position?: number;
  changeId?: string;
  lineStart: number;
}

export interface RedraftStats {
  totalOptimizations: number;
  appliedChanges: number;
  skippedChanges: number;
  successRate: number;
  processingTimeMs: number;
  textLengthChange: number;
  improvementAreas: Record<string, any>;
}

export interface RedraftMetadata {
  redraftingVersion: string;
  processedAt: string;
  textHash: string;
  acceptanceConfig: AcceptanceConfig;
}

export interface AcceptanceConfig {
  defaultAcceptAll?: boolean;
  acceptedIds?: string[];
  rejectedIds?: string[];
}

// 🎯 PREMIUM: Executive Summary Types
export interface ExecutiveSummary {
  title: string;
  contractInfo: {
    name: string;
    type: string;
    pages: number;
    dateAnalyzed: string;
    jurisdiction: string;
  };
  healthScore: {
    before: number;
    after: number;
    improvement: number;
    rating: string;
  };
  changesSummary: {
    totalOptimizations: number;
    appliedChanges: number;
    rejectedChanges: number;
    successRate: number;
    keyCategories: string[];
  };
  topRisks: TopRisk[];
  quickWins: {
    implemented: number;
    categories: string[];
    estimatedTimeToImplement: string;
  };
  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
  nextSteps: string[];
  legalDisclaimer: string;
}

export interface TopRisk {
  category: string;
  risk: string;
  impact: string;
  recommendation: string;
}

// 🎯 PREMIUM: Pitch Types
export interface PitchCollection {
  changeId: string;
  category: string;
  summary: string;
  tones: {
    friendly: string;
    neutral: string;
    firm: string;
  };
}

export interface PitchResponse {
  success: boolean;
  requestId: string;
  pitches: PitchCollection[];
  metadata: {
    totalChanges: number;
    contractName: string;
    generatedAt: string;
  };
}