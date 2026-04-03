// ============================================================
// Optimizer V2 - TypeScript Types
// ============================================================

export type OptimizationMode = 'neutral' | 'proCreator' | 'proRecipient';
export type Perspective = 'neutral' | 'creator' | 'recipient';
export type AnalysisStatus = 'idle' | 'uploading' | 'analyzing' | 'completed' | 'error';
export type ClauseStrength = 'strong' | 'adequate' | 'weak' | 'critical';
export type ImportanceLevel = 'critical' | 'high' | 'medium' | 'low';
export type RiskType = 'legal' | 'financial' | 'compliance' | 'operational' | 'none';

export type ClauseCategory =
  | 'parties' | 'subject' | 'duration' | 'termination' | 'payment'
  | 'liability' | 'warranty' | 'confidentiality' | 'ip_rights'
  | 'data_protection' | 'non_compete' | 'force_majeure'
  | 'dispute_resolution' | 'general_provisions' | 'deliverables'
  | 'sla' | 'penalties' | 'insurance' | 'compliance' | 'amendments' | 'other';

export type ActiveTab = 'overview' | 'clauses' | 'redline' | 'export' | 'compare';

// ── Diff Operations ──
export interface DiffOp {
  type: 'equal' | 'add' | 'remove';
  text: string;
}

// ── Structure (Stage 1) ──
export interface Party {
  role: string;
  name: string | null;
  address?: string | null;
}

export interface KeyDate {
  type: string;
  date: string | null;
  description: string;
}

export type IndustryType =
  | 'technology' | 'saas' | 'consulting' | 'finance' | 'healthcare'
  | 'real_estate' | 'construction' | 'manufacturing' | 'ecommerce'
  | 'marketing' | 'media' | 'education' | 'legal' | 'logistics'
  | 'energy' | 'insurance' | 'hr_staffing' | 'food_hospitality'
  | 'public_sector' | 'other';

export interface ContractStructure {
  contractType: string;
  contractTypeLabel: string;
  contractTypeConfidence: number;
  jurisdiction: string | null;
  language: string;
  isAmendment: boolean;
  recognizedAs: string;
  industry: IndustryType;
  maturity: 'high' | 'medium' | 'low';
  parties: Party[];
  duration: string | null;
  startDate?: string | null;
  endDate?: string | null;
  legalFramework: string[];
  keyDates: KeyDate[];
}

// ── Clause (Stage 2) ──
export interface Clause {
  id: string;
  title: string;
  originalText: string;
  category: ClauseCategory;
  sectionNumber: string | null;
  startPosition?: number;
  endPosition?: number;
}

// ── Clause Analysis (Stage 3) ──
export type PowerBalance = 'balanced' | 'slightly_one_sided' | 'strongly_one_sided' | 'extremely_one_sided';
export type MarketComparison = 'below_market' | 'market_standard' | 'slightly_strict' | 'significantly_strict' | 'unusually_disadvantageous';

export interface ClauseAnalysis {
  clauseId: string;
  summary: string;
  plainLanguage: string;
  legalAssessment: string;
  strength: ClauseStrength;
  importanceLevel: ImportanceLevel;
  concerns: string[];
  riskLevel: number;
  riskType: RiskType;
  keyTerms: string[];
  legalReferences: string[];
  economicRiskAssessment: string;
  powerBalance: PowerBalance;
  marketComparison: MarketComparison;
  creatorView: string;
  recipientView: string;
  neutralRecommendation: string;
}

// ── Optimization Version ──
export interface OptimizationVersion {
  text: string;
  reasoning: string;
  diffs: DiffOp[];
}

// ── Optimization (Stage 4) ──
export interface ClauseOptimization {
  clauseId: string;
  needsOptimization: boolean;
  versions: {
    neutral: OptimizationVersion;
    proCreator: OptimizationVersion;
    proRecipient: OptimizationVersion;
  };
  marketBenchmark: string;
  negotiationAdvice: string;
}

// ── Scores (Stage 5) ──
export interface ClauseScore {
  clauseId: string;
  score: number;
  importanceLevel?: ImportanceLevel;
}

export interface MissingClause {
  category: ClauseCategory;
  categoryLabel: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  foundInContent: boolean;
  recommendation: string;
}

export interface Scores {
  overall: number;
  risk: number;
  fairness: number;
  clarity: number;
  completeness: number;
  marketStandard: number;
  perClause: ClauseScore[];
  missingClauses?: MissingClause[];
  warnings?: Array<{ type: string; message: string }>;
}

// ── User Selection ──
export interface UserSelection {
  clauseId: string;
  selectedVersion: 'neutral' | 'proCreator' | 'proRecipient' | 'original' | 'custom';
  customText?: string;
  selectedAt?: string;
}

// ── Clause Chat ──
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  generatedVersion?: string | null;
}

export interface ClauseChatResponse {
  success: boolean;
  response: string;
  generatedVersion: string | null;
  diffs: DiffOp[] | null;
}

// ── Redline Data ──
export interface RedlineClause {
  clauseId: string;
  sectionNumber: string | null;
  title: string;
  category: ClauseCategory;
  original: string;
  optimized: string;
  diffs: DiffOp[];
  needsOptimization: boolean;
  reasoning: string;
}

// ── Cost Tracking ──
export interface CostStage {
  stage: number;
  stageName: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUSD: number;
  durationMs: number;
}

export interface Costs {
  totalTokensInput: number;
  totalTokensOutput: number;
  totalCostUSD: number;
  perStage: CostStage[];
}

// ── Duplicate Detection ──
export interface DuplicateInfo {
  existingResultId: string;
  existingFileName: string;
  existingCreatedAt: string;
  existingScore: number;
  existingContractType: string;
}

// ── SSE Progress Event ──
export interface ProgressEvent {
  requestId?: string;
  progress: number;
  message: string;
  stage?: number;
  stageName?: string;
  complete?: boolean;
  error?: boolean;
  duplicate?: boolean;
  existingResultId?: string;
  existingFileName?: string;
  existingCreatedAt?: string;
  existingScore?: number;
  existingContractType?: string;
  result?: AnalysisResult;
  resultId?: string;
  timestamp?: string;
  usage?: { count: number; limit: number | string };
}

// ── Full Analysis Result ──
export interface AnalysisResult {
  resultId: string;
  requestId: string;
  structure: ContractStructure;
  clauses: Clause[];
  clauseAnalyses: ClauseAnalysis[];
  optimizations: ClauseOptimization[];
  scores: Scores;
  costs: Costs;
  performance: {
    totalDurationMs: number;
    clauseCount: number;
    optimizedCount: number;
    textLength: number;
  };
  userSelections?: UserSelection[];
  fileName?: string;
  ocrApplied?: boolean;
  createdAt?: string;
  status?: string;
  currentStage?: number;
}

// ── Pipeline Stage Info ──
export interface StageInfo {
  number: number;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
}

// ── Hook State ──
export interface OptimizerV2State {
  // Upload
  file: File | null;
  status: AnalysisStatus;

  // Progress
  currentStage: number;
  progress: number;
  progressMessage: string;
  stages: StageInfo[];

  // Results
  resultId: string | null;
  result: AnalysisResult | null;

  // User Interaction
  activeMode: OptimizationMode;
  activeTab: ActiveTab;
  selectedClauseId: string | null;
  userSelections: Map<string, UserSelection>;
  clauseChats: Map<string, ChatMessage[]>;

  // Duplicate Detection
  duplicateInfo: DuplicateInfo | null;

  // Error
  error: string | null;
}

// ── Category Metadata ──
export const CATEGORY_LABELS: Record<ClauseCategory, string> = {
  parties: 'Parteien',
  subject: 'Vertragsgegenstand',
  duration: 'Laufzeit',
  termination: 'Kündigung',
  payment: 'Zahlung',
  liability: 'Haftung',
  warranty: 'Gewährleistung',
  confidentiality: 'Vertraulichkeit',
  ip_rights: 'Geistiges Eigentum',
  data_protection: 'Datenschutz',
  non_compete: 'Wettbewerbsverbot',
  force_majeure: 'Höhere Gewalt',
  dispute_resolution: 'Streitbeilegung',
  general_provisions: 'Allgemeines',
  deliverables: 'Leistungen',
  sla: 'Service Level',
  penalties: 'Vertragsstrafen',
  insurance: 'Versicherung',
  compliance: 'Compliance',
  amendments: 'Änderungen',
  other: 'Sonstiges'
};

export const IMPORTANCE_CONFIG: Record<ImportanceLevel, { label: string; color: string; icon: string }> = {
  critical: { label: 'Kritisch', color: '#FF3B30', icon: '🔥' },
  high: { label: 'Wichtig', color: '#FF9500', icon: '⚠️' },
  medium: { label: 'Standard', color: '#007AFF', icon: 'ℹ️' },
  low: { label: 'Formal', color: '#8E8E93', icon: '·' }
};

export const STRENGTH_CONFIG: Record<ClauseStrength, { label: string; color: string }> = {
  strong: { label: 'Stark', color: '#34C759' },
  adequate: { label: 'Ausreichend', color: '#FF9500' },
  weak: { label: 'Schwach', color: '#FF3B30' },
  critical: { label: 'Kritisch', color: '#AF52DE' }
};

export const INDUSTRY_LABELS: Record<IndustryType, string> = {
  technology: 'Technologie',
  saas: 'SaaS / Software',
  consulting: 'Beratung',
  finance: 'Finanzen / Banking',
  healthcare: 'Gesundheitswesen',
  real_estate: 'Immobilien',
  construction: 'Bauwesen',
  manufacturing: 'Fertigung / Industrie',
  ecommerce: 'E-Commerce',
  marketing: 'Marketing / Werbung',
  media: 'Medien / Verlag',
  education: 'Bildung',
  legal: 'Recht / Kanzlei',
  logistics: 'Logistik / Transport',
  energy: 'Energie',
  insurance: 'Versicherung',
  hr_staffing: 'Personal / HR',
  food_hospitality: 'Gastronomie / Hotel',
  public_sector: 'Öffentlicher Sektor',
  other: 'Sonstige'
};

export const MODE_LABELS: Record<OptimizationMode, { label: string; description: string; color: string }> = {
  neutral: { label: 'Neutral', description: 'Fair für beide Parteien', color: '#007AFF' },
  proCreator: { label: 'Pro Ersteller', description: 'Schützt den Vertragsersteller', color: '#34C759' },
  proRecipient: { label: 'Pro Empfänger', description: 'Schützt den Vertragsempfänger', color: '#FF9500' }
};
