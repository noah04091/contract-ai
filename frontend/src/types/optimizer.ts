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