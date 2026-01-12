// 📁 src/types/legalLens.ts
// TypeScript Interfaces für Legal Lens Feature

/**
 * Perspektiven für die Analyse
 */
export type PerspectiveType = 'contractor' | 'client' | 'neutral' | 'worstCase';

/**
 * Branchen-Kontext für spezifische Analysen
 */
export type IndustryType =
  | 'it_software'      // IT & Software
  | 'construction'     // Bauwesen
  | 'real_estate'      // Immobilien
  | 'consulting'       // Beratung
  | 'manufacturing'    // Produktion/Industrie
  | 'retail'           // Handel
  | 'healthcare'       // Gesundheitswesen
  | 'finance'          // Finanzdienstleistungen
  | 'general';         // Allgemein/Sonstige

/**
 * Branchen-Info für UI
 */
export interface IndustryInfo {
  id: IndustryType;
  name: string;
  description: string;
  icon: string;
  examples: string[];
  keyTerms: string[];
}

/**
 * Verhandlungs-Checkliste Types
 */
export interface NegotiationChecklistItem {
  id: string;
  priority: 1 | 2 | 3;
  category: 'financial' | 'liability' | 'termination' | 'scope' | 'other';
  title: string;
  section?: string;
  clausePreview: string;
  issue: string;
  risk: string;
  whatToSay: string;
  alternativeSuggestion: string;
  difficulty: 'easy' | 'medium' | 'hard';
  emoji: string;
  checked?: boolean;
}

export interface NegotiationChecklistSummary {
  totalIssues: number;
  criticalCount: number;
  estimatedNegotiationTime: string;
  overallStrategy: string;
}

export interface NegotiationChecklistResponse {
  success: boolean;
  checklist: NegotiationChecklistItem[];
  summary: NegotiationChecklistSummary;
  perspective: PerspectiveType;
  industryContext: IndustryType;
  generatedAt: string;
}

/**
 * Verfügbare Branchen
 */
export const INDUSTRIES: IndustryInfo[] = [
  {
    id: 'it_software',
    name: 'IT & Software',
    description: 'Software-Entwicklung, SaaS, Cloud-Services',
    icon: '💻',
    examples: ['Softwareentwicklungsverträge', 'SaaS-Abonnements', 'IT-Dienstleistungen'],
    keyTerms: ['SLA', 'Uptime', 'IP-Rechte', 'Source-Code-Escrow', 'Wartung']
  },
  {
    id: 'construction',
    name: 'Bauwesen',
    description: 'Bauverträge, Handwerk, Architektur',
    icon: '🏗️',
    examples: ['Bauverträge', 'Werkverträge', 'Architektenverträge'],
    keyTerms: ['VOB/B', 'Gewährleistung', 'Nachträge', 'Abnahme', 'Mängelhaftung']
  },
  {
    id: 'real_estate',
    name: 'Immobilien',
    description: 'Mietverträge, Kauf, Verwaltung',
    icon: '🏠',
    examples: ['Gewerbemietverträge', 'Kaufverträge', 'Maklerverträge'],
    keyTerms: ['Nebenkosten', 'Kaution', 'Staffelmiete', 'Konkurrenzschutz', 'Instandhaltung']
  },
  {
    id: 'consulting',
    name: 'Beratung',
    description: 'Unternehmensberatung, Coaching, Agenturen',
    icon: '📊',
    examples: ['Beratungsverträge', 'Agenturverträge', 'Coaching-Verträge'],
    keyTerms: ['Stundenhonorar', 'Erfolgsbeteiligung', 'Geheimhaltung', 'Wettbewerbsverbot']
  },
  {
    id: 'manufacturing',
    name: 'Produktion',
    description: 'Fertigung, Lieferkette, Industrie',
    icon: '🏭',
    examples: ['Lieferverträge', 'Fertigungsverträge', 'OEM-Verträge'],
    keyTerms: ['Lieferzeiten', 'Qualitätssicherung', 'Produkthaftung', 'Mindestabnahme']
  },
  {
    id: 'retail',
    name: 'Handel',
    description: 'Einzelhandel, E-Commerce, Großhandel',
    icon: '🛒',
    examples: ['Handelsverträge', 'Rahmenverträge', 'Franchiseverträge'],
    keyTerms: ['Rabatte', 'Rückgaberecht', 'Exklusivität', 'Mindestbestellwert']
  },
  {
    id: 'healthcare',
    name: 'Gesundheit',
    description: 'Medizin, Pflege, Pharma',
    icon: '🏥',
    examples: ['Praxisverträge', 'Pflegeverträge', 'Lieferverträge Pharma'],
    keyTerms: ['Datenschutz', 'Haftung', 'Zulassungen', 'Schweigepflicht']
  },
  {
    id: 'finance',
    name: 'Finanzwesen',
    description: 'Banken, Versicherungen, Investments',
    icon: '🏦',
    examples: ['Kreditverträge', 'Investmentverträge', 'Versicherungen'],
    keyTerms: ['Zinsen', 'Gebühren', 'Kündigungsfristen', 'Provisionen', 'Regulatorik']
  },
  {
    id: 'general',
    name: 'Allgemein',
    description: 'Branchenübergreifend',
    icon: '📄',
    examples: ['Standardverträge', 'Arbeitsverträge', 'Allgemeine Dienstleistungen'],
    keyTerms: ['AGB', 'Haftung', 'Kündigung', 'Datenschutz']
  }
];

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
  contractId?: string;
  clauses?: ParsedClause[];
  summary?: {
    totalClauses: number;
    highRisk: number;
    mediumRisk: number;
    lowRisk: number;
    keyFindings: string[];
  };
  /** Metadata über die Klausel-Quelle (vorverarbeitet, streaming, regex) */
  metadata?: {
    source?: 'preprocessed' | 'streaming' | 'regex' | 'live';
    preprocessedAt?: string;
    parsingMethod?: string;
    [key: string]: unknown;
  };
  /** Backend empfiehlt Streaming (keine Vorverarbeitung vorhanden) */
  useStreaming?: boolean;
  /** Grund für Streaming-Empfehlung */
  reason?: 'preprocessing_in_progress' | 'no_preprocessing';
  /** Nachricht für den User */
  message?: string;
  /** Vertragsname */
  contractName?: string;
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

// ============================================
// EXPORT REPORT TYPES
// ============================================

/**
 * Design-Variante für PDF-Export
 */
export type ReportDesign = 'executive' | 'modern' | 'minimal' | 'detailed';

/**
 * Export-Sektion
 */
export type ReportSection = 'summary' | 'criticalClauses' | 'checklist' | 'allClauses';

/**
 * Design-Info für UI
 */
export interface ReportDesignInfo {
  id: ReportDesign;
  name: string;
  primaryColor: string;
  accentColor: string;
}

/**
 * Sektion-Info für UI
 */
export interface ReportSectionInfo {
  id: ReportSection;
  name: string;
  description: string;
  default: boolean;
}

/**
 * Export-Request
 */
export interface ExportReportRequest {
  design: ReportDesign;
  includeSections: ReportSection[];
}

/**
 * Verfügbare Designs
 */
export const REPORT_DESIGNS: ReportDesignInfo[] = [
  {
    id: 'executive',
    name: 'Executive',
    primaryColor: '#1e293b',
    accentColor: '#3b82f6'
  },
  {
    id: 'modern',
    name: 'Modern',
    primaryColor: '#0f172a',
    accentColor: '#6366f1'
  },
  {
    id: 'minimal',
    name: 'Minimal',
    primaryColor: '#18181b',
    accentColor: '#18181b'
  },
  {
    id: 'detailed',
    name: 'Detailliert',
    primaryColor: '#1e3a5f',
    accentColor: '#2563eb'
  }
];

/**
 * Verfügbare Sektionen
 */
export const REPORT_SECTIONS: ReportSectionInfo[] = [
  {
    id: 'summary',
    name: 'Executive Summary',
    description: 'Übersicht und Risiko-Verteilung',
    default: true
  },
  {
    id: 'criticalClauses',
    name: 'Kritische Klauseln',
    description: 'Detaillierte Analyse der Risiko-Klauseln',
    default: true
  },
  {
    id: 'checklist',
    name: 'Verhandlungs-Checkliste',
    description: 'Priorisierte Verhandlungspunkte',
    default: false
  },
  {
    id: 'allClauses',
    name: 'Alle Klauseln',
    description: 'Vollständige Klausel-Liste (Anhang)',
    default: false
  }
];
