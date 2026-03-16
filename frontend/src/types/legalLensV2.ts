/**
 * Legal Lens V2 — TypeScript Type Definitions
 *
 * Typen für den interaktiven Vertrags-Explorer.
 */

// ============================================================
// Analyse-Typen
// ============================================================

export type ActionLevel = 'accept' | 'negotiate' | 'reject';
export type RiskLevel = 'low' | 'medium' | 'high' | 'none';
export type ViewMode = 'pdf' | 'text' | 'split';

export interface V2Analysis {
  actionLevel: ActionLevel;
  explanation: string;
  riskLevel: RiskLevel;
  riskScore: number;
  riskReasons: string[];
  fairnessVerdict: string;
  isMarketStandard: boolean;
  negotiationTip: string;
  betterWording: string | null;
  howToAsk: string | null;
  realWorldImpact: string;
  exampleScenario: string | null;
  analyzedAt: string;
}

export type AnalysesMap = Record<string, V2Analysis>;

// ============================================================
// Klausel-Typen (geparst vom Backend)
// ============================================================

export interface ClausePosition {
  start: number;
  end: number;
  paragraph?: number;
  globalStart: number;
  globalEnd: number;
  estimatedPage: number;
  anchorText: string;
}

export interface ClauseMatchingData {
  firstWords: string[];
  lastWords: string[];
  charLength: number;
}

export interface ClauseRiskIndicators {
  level: RiskLevel;
  keywords: string[];
  score: number;
}

export interface ParsedClauseV2 {
  id: string;
  number?: string;
  title: string | null;
  text: string;
  type: 'paragraph' | 'section' | 'heading' | 'sentence' | 'article' | 'numbered';
  riskLevel: RiskLevel;
  riskScore: number;
  riskKeywords: string[];
  riskIndicators: ClauseRiskIndicators;
  position: ClausePosition;
  matchingData: ClauseMatchingData;
  textHash: string;
  nonAnalyzable?: boolean;
  nonAnalyzableReason?: string;
  metadata: {
    wordCount: number;
    hasNumbers: boolean;
    hasDates: boolean;
    hasMoneyReferences: boolean;
  };
}

// ============================================================
// PDF Clause Mapping
// ============================================================

export interface ClauseRegion {
  clauseId: string;
  pageNumber: number;
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  riskLevel: RiskLevel;
}

// ============================================================
// API Response Typen
// ============================================================

export interface AnalysesResponse {
  success: boolean;
  analyses: AnalysesMap;
  stats: {
    completed: number;
    total: number;
    high: number;
    medium: number;
    low: number;
    percentage: number;
  };
  isComplete: boolean;
}

export interface StatusResponse {
  success: boolean;
  status: 'complete' | 'partial' | 'pending';
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  riskSummary: {
    high: number;
    medium: number;
    low: number;
  };
}

export interface SSEProgressEvent {
  completed: number;
  total: number;
  clauseId: string;
  analysis: V2Analysis;
}

export interface SSEStartEvent {
  contractId: string;
  totalClauses: number;
  totalParsed: number;
}

export interface SSECompleteEvent {
  success: boolean;
  stats: {
    total: number;
    completed: number;
    cached: number;
    errors: number;
    newlyAnalyzed: number;
    durationMs: number;
  };
}

// ============================================================
// Simulation
// ============================================================

export type SimulationRecommendation = 'accept_change' | 'consider_change' | 'keep_original';
export type RiskChange = 'reduced' | 'increased' | 'unchanged';

export interface ClauseSimulation {
  originalRiskScore: number;
  modifiedRiskScore: number;
  riskChange: RiskChange;
  summary: string;
  forYou: string;
  forCounterparty: string;
  marketAssessment: string;
  recommendation: SimulationRecommendation;
  recommendationReason: string;
}

// ============================================================
// Komponenten-Props
// ============================================================

export interface ClauseBlockProps {
  clause: ParsedClauseV2;
  analysis: V2Analysis | null;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: (clauseId: string) => void;
  onHoverStart: (clauseId: string) => void;
  onHoverEnd: () => void;
}

export interface AnalysisPanelProps {
  clause: ParsedClauseV2 | null;
  analysis: V2Analysis | null;
  isOpen: boolean;
  onClose: () => void;
  contractId: string;
}

export interface HoverTooltipProps {
  analysis: V2Analysis;
  clauseTitle: string | null;
  position: { x: number; y: number };
  visible: boolean;
}

// ============================================================
// Hook Return Types
// ============================================================

export interface UseLegalLensV2Return {
  // Daten
  contract: { _id: string; name: string; s3Key?: string } | null;
  clauses: ParsedClauseV2[];
  analysesMap: AnalysesMap;
  // Status
  isLoadingContract: boolean;
  isLoadingClauses: boolean;
  isAnalyzing: boolean;
  analysisProgress: { completed: number; total: number; percentage: number };
  isComplete: boolean;
  error: string | null;
  // Stats
  stats: { high: number; medium: number; low: number; total: number };
  overallRiskScore: number;
  worstClause: { clauseId: string; title: string | null; riskScore: number; explanation: string } | null;
  // Actions
  startBatchAnalysis: (industry?: string) => void;
  refreshClauses: () => void;
}

export interface UseClauseSyncReturn {
  selectedClauseId: string | null;
  hoveredClauseId: string | null;
  selectClause: (clauseId: string, source: 'pdf' | 'text' | 'navigator') => void;
  hoverClause: (clauseId: string | null) => void;
  clearSelection: () => void;
  // Refs für Scroll-Sync
  pdfContainerRef: React.RefObject<HTMLDivElement>;
  textContainerRef: React.RefObject<HTMLDivElement>;
}
