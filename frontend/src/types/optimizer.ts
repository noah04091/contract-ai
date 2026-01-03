// 📁 src/types/optimizer.ts
export interface OptimizationSuggestion {
  id: string;
  category: 'termination' | 'liability' | 'payment' | 'clarity' | 'compliance';
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // AI confidence 0-100
  summary?: string; // Konkrete Headline statt generischer Kategorie
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
  // 🆕 v2.0: Anti-Bullshit Felder (Decision-First)
  evidence?: string[]; // Konkrete Textstellen aus dem Vertrag
  whyItMatters?: string; // Konkreter juristischer/wirtschaftlicher Nachteil
  whyNotIntentional?: string; // Warum ist das NICHT bewusst so gewollt?
  whenToIgnore?: string; // Wann wäre diese Optimierung NICHT sinnvoll?
}

// 🆕 v2.0: Assessment-Block für Decision-First Logik
export interface ContractAssessment {
  overall: string;
  optimizationNeeded: boolean;
  reasoning: string;
  intentionalClauses: string[];
}

// 🆕 Phase 3c: Document Scope Info für Amendments
export interface DocumentScopeInfo {
  type: 'amendment' | 'main_contract';
  isAmendment: boolean;
  parentType?: string;
  appliedScope?: 'amendment_specific' | 'full_contract';
  detection?: {
    matchedIndicator?: string;
    matchSource?: 'filename' | 'content';
    detectedParentType?: string;
  };
  hardScopeEnforcement?: {
    applied: boolean;
    kept?: number;
    filtered?: number;
    changedTopicLock?: {
      matchedIndicator?: string;
      allowedChangedTopics?: string[];
    };
  };
  skippedMandatoryChecks?: string[];
  scopeReason?: string;
}

// 🆕 v2.0: Erweiterte Meta-Daten
export interface ContractMeta {
  type: string;
  confidence: number;
  jurisdiction: string;
  language: string;
  isAmendment: boolean;
  parentType: string | null;
  recognizedAs: string;
  maturity: 'high' | 'medium' | 'low';
  // 🆕 Phase 3c: Document Scope
  documentScope?: DocumentScopeInfo;
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