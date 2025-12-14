// 📁 src/types/legalLens.ts
// TypeScript Interfaces für Legal Lens Feature

/**
 * Perspektiven für die Analyse
 */
export type PerspectiveType = 'contractor' | 'client' | 'neutral' | 'worstCase';

/**
 * Risikostufen
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Highlight-Typen für markierte Klauseln
 */
export type HighlightType = 'important' | 'concern' | 'question' | 'approved';

/**
 * Fortschritts-Status
 */
export type ProgressStatus = 'in_progress' | 'completed' | 'paused';

/**
 * Einzelne Klausel aus dem Parser
 */
export interface ParsedClause {
  id: string;
  type: 'paragraph' | 'section' | 'heading' | 'sentence';
  number?: string;
  title?: string;
  text: string;
  startIndex: number;
  endIndex: number;
  parentId?: string;
  riskIndicators: {
    level: RiskLevel;
    keywords: string[];
    score: number;
  };
  metadata: {
    wordCount: number;
    hasNumbers: boolean;
    hasDates: boolean;
    hasMoneyReferences: boolean;
  };
  /** Voranalyse von GPT-3.5 (kosteneffizient beim Laden) */
  preAnalysis?: {
    riskLevel: RiskLevel;
    riskScore: number;
    summary: string;
    mainRisk: string;
  };
}

/**
 * Action Level für Handlungsempfehlung
 */
export type ActionLevel = 'accept' | 'negotiate' | 'reject';

/**
 * Wahrscheinlichkeit
 */
export type Probability = 'unlikely' | 'possible' | 'likely' | 'low' | 'medium' | 'high';

/**
 * Worst-Case Szenario
 */
export interface WorstCaseScenario {
  scenario: string;
  financialRisk: string;
  timeRisk: string;
  probability: Probability;
}

/**
 * Bessere Alternative
 */
export interface BetterAlternative {
  text: string;
  whyBetter: string;
  howToAsk: string;
}

/**
 * Auswirkung einer Klausel - ERWEITERT
 */
export interface ClauseImpact {
  financial: string | RiskLevel;
  legal: string | RiskLevel;
  operational: string | RiskLevel;
  reputation?: RiskLevel;
  negotiationPower?: number; // 0-100
}

/**
 * Konsequenz einer Klausel
 */
export interface ClauseConsequence {
  scenario: string;
  probability: 'low' | 'medium' | 'high';
  impact: string;
}

/**
 * Erklärung aus einer Perspektive - ERWEITERT
 */
export interface PerspectiveExplanation {
  summary: string;
  simple?: string;
  detailed: string;
  whatItMeansForYou?: string;
  keyPoints: string[];
}

/**
 * Analyse aus einer bestimmten Perspektive - ERWEITERT
 */
export interface PerspectiveAnalysis {
  // NEU: Primäre Handlungsempfehlung
  actionLevel?: ActionLevel;
  actionReason?: string;

  explanation: PerspectiveExplanation;

  // NEU: Risiko-Bewertung mit Gründen
  riskAssessment?: {
    level: RiskLevel;
    score: number;
    reasons: string[];
  };

  // NEU: Worst-Case Szenario
  worstCase?: WorstCaseScenario;

  impact: ClauseImpact;
  consequences: ClauseConsequence[];
  recommendations: string[];
  recommendation?: string;
  negotiationPower: number;

  // NEU: Bessere Alternative
  betterAlternative?: BetterAlternative;

  // NEU: Marktvergleich
  marketComparison?: {
    isStandard: boolean;
    marketRange: string;
    deviation: string;
  };
}

/**
 * Alternative Formulierung
 */
export interface ClauseAlternative {
  text: string;
  benefits: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  acceptanceProbability?: number;
}

/**
 * Verhandlungstipps
 */
export interface NegotiationInfo {
  argument: string;
  emailTemplate: string;
  tips: string[];
}

/**
 * Chat-Nachricht
 */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * Vollständige Klausel-Analyse - ERWEITERT
 */
export interface ClauseAnalysis {
  _id: string;
  contractId: string;
  userId: string;
  clauseId: string;
  clauseHash: string;
  clauseText: string;
  riskLevel: RiskLevel;
  riskScore: number;

  // NEU: Top-Level Felder (aus der aktuellen Perspektive)
  actionLevel?: ActionLevel;
  actionReason?: string;
  worstCase?: WorstCaseScenario;
  betterAlternative?: BetterAlternative;

  perspectives: {
    contractor: PerspectiveAnalysis;
    client: PerspectiveAnalysis;
    neutral: PerspectiveAnalysis;
    worstCase: PerspectiveAnalysis;
  };
  alternatives: ClauseAlternative[];
  negotiation: NegotiationInfo;
  chatHistory: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Bookmark
 */
export interface Bookmark {
  clauseId: string;
  label: string;
  color: string;
  createdAt: Date;
}

/**
 * Notiz
 */
export interface Note {
  clauseId: string;
  content: string;
  isPrivate: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session-Tracking
 */
export interface ReviewSession {
  startedAt: Date;
  endedAt?: Date;
  clausesReviewed: number;
  duration?: number;
}

/**
 * Progress-Zusammenfassung
 */
export interface ProgressSummary {
  totalHighRisk: number;
  totalMediumRisk: number;
  totalLowRisk: number;
  negotiationNeeded: boolean;
  overallAssessment?: string;
  generatedAt?: Date;
}

/**
 * User-Fortschritt für einen Vertrag
 */
export interface LegalLensProgress {
  _id: string;
  userId: string;
  contractId: string;
  reviewedClauses: string[];
  totalClauses: number;
  percentComplete: number;
  lastViewedClause?: string;
  currentPerspective: PerspectiveType;
  scrollPosition: number;
  bookmarks: Bookmark[];
  notes: Note[];
  highlights: Array<{
    clauseId: string;
    type: HighlightType;
    createdAt: Date;
  }>;
  sessions: ReviewSession[];
  totalTimeSpent: number;
  status: ProgressStatus;
  completedAt?: Date;
  summary: ProgressSummary;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * API Response: Parse Contract
 */
export interface ParseContractResponse {
  success: boolean;
  contractId: string;
  clauses: ParsedClause[];
  summary: {
    totalClauses: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    keyFindings: string[];
  };
}

/**
 * API Response: Analyze Clause
 */
export interface AnalyzeClauseResponse {
  success: boolean;
  analysis: ClauseAnalysis;
  cached: boolean;
}

/**
 * API Response: Get Perspectives
 */
export interface GetPerspectivesResponse {
  success: boolean;
  clauseId: string;
  clauseText: string;
  perspectives: {
    contractor: PerspectiveAnalysis;
    client: PerspectiveAnalysis;
    neutral: PerspectiveAnalysis;
    worstCase: PerspectiveAnalysis;
  };
  riskLevel: RiskLevel;
  riskScore: number;
}

/**
 * API Response: Generate Alternatives
 */
export interface GenerateAlternativesResponse {
  success: boolean;
  clauseId: string;
  alternatives: ClauseAlternative[];
}

/**
 * API Response: Generate Negotiation Tips
 */
export interface GenerateNegotiationResponse {
  success: boolean;
  clauseId: string;
  negotiation: NegotiationInfo;
}

/**
 * API Response: Chat
 */
export interface ChatResponse {
  success: boolean;
  clauseId: string;
  response: string;
  chatHistory: ChatMessage[];
}

/**
 * API Response: Progress
 */
export interface ProgressResponse {
  success: boolean;
  progress: LegalLensProgress;
}

/**
 * API Response: Summary
 */
export interface SummaryResponse {
  success: boolean;
  contractId: string;
  summary: {
    totalClauses: number;
    analyzedClauses: number;
    riskDistribution: {
      high: number;
      medium: number;
      low: number;
    };
    topRisks: Array<{
      clauseId: string;
      clauseText: string;
      riskLevel: RiskLevel;
      riskScore: number;
    }>;
    recommendations: string[];
    overallRisk: RiskLevel;
    negotiationPriority: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Perspektiven-Info für UI
 */
export interface PerspectiveInfo {
  id: PerspectiveType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

/**
 * Verfügbare Perspektiven
 */
export const PERSPECTIVES: PerspectiveInfo[] = [
  {
    id: 'contractor',
    name: 'Auftraggeber',
    description: 'Analyse aus Sicht des Auftraggebers/Kunden',
    icon: '👔',
    color: '#3b82f6'
  },
  {
    id: 'client',
    name: 'Auftragnehmer',
    description: 'Analyse aus Sicht des Auftragnehmers/Dienstleisters',
    icon: '🛠️',
    color: '#10b981'
  },
  {
    id: 'neutral',
    name: 'Marktüblich',
    description: 'Neutrale, marktübliche Einschätzung',
    icon: '⚖️',
    color: '#6366f1'
  },
  {
    id: 'worstCase',
    name: 'Worst Case',
    description: 'Pessimistische Analyse der Risiken',
    icon: '⚠️',
    color: '#ef4444'
  }
];

/**
 * Risk Level Farben
 */
export const RISK_COLORS: Record<RiskLevel, string> = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444'
};

/**
 * Risk Level Labels
 */
export const RISK_LABELS: Record<RiskLevel, string> = {
  low: 'Niedriges Risiko',
  medium: 'Mittleres Risiko',
  high: 'Hohes Risiko'
};

/**
 * Action Level Labels - NEU für Dealbreaker/Verhandelbar/Akzeptieren
 */
export const ACTION_LABELS: Record<ActionLevel, { text: string; emoji: string; color: string; bgColor: string }> = {
  accept: {
    text: 'Unkritisch',
    emoji: '🟢',
    color: '#16a34a',
    bgColor: '#f0fdf4'
  },
  negotiate: {
    text: 'Verhandeln',
    emoji: '🟡',
    color: '#d97706',
    bgColor: '#fffbeb'
  },
  reject: {
    text: 'Dealbreaker',
    emoji: '🔴',
    color: '#dc2626',
    bgColor: '#fef2f2'
  }
};

/**
 * Probability Labels
 */
export const PROBABILITY_LABELS: Record<Probability, string> = {
  unlikely: 'Unwahrscheinlich',
  possible: 'Möglich',
  likely: 'Wahrscheinlich',
  low: 'Gering',
  medium: 'Mittel',
  high: 'Hoch'
};
