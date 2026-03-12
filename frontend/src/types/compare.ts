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
// V2 Full Result
// ============================================
export interface ComparisonResultV2 {
  version: 2;

  // Phase A: Contract Maps
  contractMap: {
    contract1: ContractStructure;
    contract2: ContractStructure;
  };

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
