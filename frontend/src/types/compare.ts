// frontend/src/types/compare.ts — Compare V2 Type Definitions

// ============================================
// Clause Areas (14 Bereiche)
// ============================================
export type ClauseArea =
  | 'parties'
  | 'subject'
  | 'duration'
  | 'termination'
  | 'payment'
  | 'liability'
  | 'warranty'
  | 'confidentiality'
  | 'ip_rights'
  | 'data_protection'
  | 'non_compete'
  | 'force_majeure'
  | 'jurisdiction'
  | 'other';

export const CLAUSE_AREA_LABELS: Record<ClauseArea, string> = {
  parties: 'Vertragsparteien',
  subject: 'Vertragsgegenstand',
  duration: 'Vertragslaufzeit',
  termination: 'Kündigung',
  payment: 'Vergütung & Zahlung',
  liability: 'Haftung',
  warranty: 'Gewährleistung',
  confidentiality: 'Geheimhaltung',
  ip_rights: 'IP & Urheberrecht',
  data_protection: 'Datenschutz',
  non_compete: 'Wettbewerbsverbot',
  force_majeure: 'Höhere Gewalt',
  jurisdiction: 'Gerichtsstand & Recht',
  other: 'Sonstiges',
};

// ============================================
// Phase A: Contract Structure (Vertragskarte)
// ============================================
export interface StructuredClause {
  id: string;                              // e.g. "termination_1"
  area: ClauseArea;
  section: string;                         // "§5 Abs. 2"
  title: string;
  originalText: string;                    // Max 3 sentences
  summary: string;                         // 1 sentence, plain language
  keyValues: Record<string, string>;       // {"Frist": "3 Monate", "Betrag": "2.500 EUR"}
}

export interface ContractStructure {
  parties: { role: string; name: string }[];
  subject: string;
  contractType: string;
  clauses: StructuredClause[];
  metadata: {
    duration: string | null;
    startDate: string | null;
    governingLaw: string | null;
    jurisdiction: string | null;
    language: string | null;
  };
}

// ============================================
// Phase B: Enhanced Comparison
// ============================================
export type SemanticType = 'missing' | 'conflicting' | 'weaker' | 'stronger' | 'different_scope';

export const SEMANTIC_TYPE_LABELS: Record<SemanticType, string> = {
  missing: 'Fehlt',
  conflicting: 'Widerspruch',
  weaker: 'Schwächer',
  stronger: 'Stärker',
  different_scope: 'Anderer Umfang',
};

export const SEMANTIC_TYPE_COLORS: Record<SemanticType, string> = {
  missing: '#ff453a',
  conflicting: '#d70015',
  weaker: '#ff9500',
  stronger: '#34c759',
  different_scope: '#5856d6',
};

export interface EnhancedDifference {
  // V1 fields (backward compat)
  category: string;
  section: string;
  contract1: string;
  contract2: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation: string;
  impact: string;
  recommendation: string;
  // V2 fields
  clauseArea: ClauseArea;
  semanticType: SemanticType;
  financialImpact?: string;
  marketContext?: string;
  // V4 Holistic hint (emoji icon from the originating CompareSection)
  _icon?: string;
}

export interface CategoryScores {
  overall: number;           // 0-100
  fairness: number;          // Ausgewogenheit
  riskProtection: number;    // Risikoschutz
  flexibility: number;       // Flexibilität
  completeness: number;      // Vollständigkeit
  clarity: number;           // Klarheit
}

export const SCORE_LABELS: Record<keyof CategoryScores, string> = {
  overall: 'Gesamt',
  fairness: 'Fairness',
  riskProtection: 'Risikoschutz',
  flexibility: 'Flexibilität',
  completeness: 'Vollständigkeit',
  clarity: 'Klarheit',
};

export type RiskType =
  | 'unfair_clause'
  | 'legal_risk'
  | 'unusual_clause'
  | 'hidden_obligation'
  | 'missing_protection';

export const RISK_TYPE_LABELS: Record<RiskType, string> = {
  unfair_clause: 'Unfaire Klausel',
  legal_risk: 'Rechtliches Risiko',
  unusual_clause: 'Ungewöhnliche Klausel',
  hidden_obligation: 'Versteckte Pflicht',
  missing_protection: 'Fehlender Schutz',
};

export interface RiskFinding {
  clauseArea: ClauseArea;
  riskType: RiskType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  contract: 1 | 2 | 'both';
  title: string;
  description: string;
  legalBasis?: string;
  financialExposure?: string;
}

export interface ClauseRecommendation {
  clauseArea: ClauseArea;
  targetContract: 1 | 2;
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  reason: string;
  currentText: string;
  suggestedText: string;
}

export type Perspective = 'auftraggeber' | 'auftragnehmer' | 'neutral';

export const PERSPECTIVE_LABELS: Record<Perspective, string> = {
  auftraggeber: 'Auftraggeber',
  auftragnehmer: 'Auftragnehmer',
  neutral: 'Neutral',
};

// ============================================
// V1 Types (backward compatibility)
// ============================================
export interface ComparisonDifference {
  category: string;
  section: string;
  contract1: string;
  contract2: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  explanation?: string;
  impact: string;
  recommendation: string;
}

export interface ContractAnalysis {
  strengths: string[];
  weaknesses: string[];
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
}

export interface ComparisonResultV1 {
  differences: ComparisonDifference[];
  contract1Analysis: ContractAnalysis;
  contract2Analysis: ContractAnalysis;
  overallRecommendation: {
    recommended: 1 | 2;
    reasoning: string;
    confidence: number;
  };
  summary: string;
  categories?: string[];
  comparisonMode?: {
    id: string;
    name: string;
    description: string;
  };
}

// ============================================
// Market Benchmark
// ============================================
export interface BenchmarkAssessment {
  rating: 'above' | 'standard' | 'below' | 'info';
  label: string;
  marketTypical: number | string;
  marketRange?: string;
}

export interface BenchmarkMetric {
  metricId: string;
  label: string;
  unit: string;
  clauseArea: ClauseArea;
  contract1: { value: number; source: string; assessment: BenchmarkAssessment } | null;
  contract2: { value: number; source: string; assessment: BenchmarkAssessment } | null;
  marketTypical: number | string;
  marketRange: string;
  direction: 'higher_better' | 'lower_better' | 'info_only';
}

export interface BenchmarkResult {
  contractType: string | null;
  contractTypeLabel: string | null;
  metrics: BenchmarkMetric[];
}

export const BENCHMARK_RATING_COLORS: Record<string, string> = {
  above: '#34c759',
  standard: '#3B82F6',
  below: '#ff9500',
  info: '#8e8e93',
};

export const BENCHMARK_RATING_LABELS: Record<string, string> = {
  above: 'Über Marktstandard',
  standard: 'Marktüblich',
  below: 'Unter Marktstandard',
  info: 'Marktvergleich',
};

// ============================================
// V3: Document Type Intelligence
// ============================================
export interface DocumentTypeInfo {
  category: string;
  label: string;
  scoreLabels: Record<keyof CategoryScores, string> | null;
  labels: {
    documentName: string;
    mapTab: string;
    partiesLabel: string;
  };
  perspectiveLabels?: Record<Perspective, string> | null;
}

// ============================================
// V4 Holistic: Sections + Compatibility
// ============================================
export interface CompareSection {
  id: string;
  title: string;
  icon: string;
  clauseArea: ClauseArea;
  priority: number;                                        // 1 = wichtigste
  severity: 'low' | 'medium' | 'high' | 'critical';
  doc1Value: string;
  doc2Value: string;
  doc1Quote?: string;
  doc2Quote?: string;
  difference?: string;
  explanation: string;
  recommendation?: string;
  recommendationTarget?: 1 | 2;
}

export type CompatibilityLevel = 'full' | 'partial' | 'meta';

export interface CompatibilityInfo {
  level: CompatibilityLevel;
  reason: string;
  comparableDimensions: ClauseArea[];
  nonComparableDimensions: ClauseArea[];
  userWarning?: string;
  suggestedFocus?: string;
}

// ============================================
// V2 Full Result
// ============================================
export interface ComparisonResultV2 {
  version: 2;

  // V4 Holistic pipeline marker
  _pipelineVersion?: string;

  // V3: Document type intelligence
  documentType?: DocumentTypeInfo | null;

  // Phase A: Contract Maps
  contractMap: {
    contract1: ContractStructure;
    contract2: ContractStructure;
  };

  // V4 Holistic (optional, backward compatible)
  sections?: CompareSection[];
  compatibility?: CompatibilityInfo;

  // Phase B: Comparison
  differences: EnhancedDifference[];
  scores: {
    contract1: CategoryScores;
    contract2: CategoryScores;
  };
  risks: RiskFinding[];
  recommendations: ClauseRecommendation[];

  summary: {
    tldr: string;
    detailedSummary: string;
    verdict: string;
  };

  overallRecommendation: {
    recommended: 1 | 2;
    reasoning: string;
    confidence: number;
    conditions: string[];
  };

  perspective: Perspective;

  // Market Benchmark
  benchmark: BenchmarkResult | null;

  // V1 compatibility
  contract1Analysis: ContractAnalysis;
  contract2Analysis: ContractAnalysis;

  // Metadata
  comparisonMode?: {
    id: string;
    name: string;
    description: string;
  };
  categories?: string[];

  // Raw texts for re-analysis (populated by backend)
  _contractTexts?: {
    text1: string;
    text2: string;
  };
}

// ============================================
// Union type + Type Guard
// ============================================
export type ComparisonResult = ComparisonResultV1 | ComparisonResultV2;

export function isV2Result(result: ComparisonResult): result is ComparisonResultV2 {
  return 'version' in result && result.version === 2;
}

// ============================================
// Tab Configuration
// ============================================
export type CompareTab = 'overview' | 'differences' | 'risks' | 'recommendations' | 'contractMap';

export const COMPARE_TAB_CONFIG: { key: CompareTab; label: string }[] = [
  { key: 'overview', label: 'Übersicht' },
  { key: 'differences', label: 'Unterschiede' },
  { key: 'risks', label: 'Risiken' },
  { key: 'recommendations', label: 'Empfehlungen' },
  { key: 'contractMap', label: 'Vertragskarte' },
];
