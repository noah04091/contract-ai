// 📁 src/pages/Optimizer.tsx - APPLE DESIGN REVOLUTION ✨
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  AlertCircle,
  RefreshCw,
  FileText,
  Filter,
  Download,
  Mail,
  DollarSign,
  CheckCircle2,
  CheckCircle,
  Check,
  Lock,
  Wand2,
  Copy,
  FileDown,
  Users,
  Building2,
  User,
  ChevronDown,
  ChevronUp,
  Sparkles,
  FolderOpen,
  Target,
  BarChart3,
  FileSignature,
  Briefcase,
  Home,
  Package,
  Calculator,
  Cloud,
  Minimize2,
  ArrowRight,
  Lightbulb,
  Zap,
  Code2,
  AlignLeft,
  Shield,
  TrendingUp,
  AlertTriangle,
  Camera
} from "lucide-react";

// Components
import UnifiedPremiumNotice from "../components/UnifiedPremiumNotice";
import ContractHealthDashboard from "../components/ContractHealthDashboard";
import SimpleExplanationPopup from "../components/SimpleExplanationPopup";
import AnalysisProgressComponent from "../components/AnalysisProgress";
import PDFDocumentViewer from "../components/PDFDocumentViewer";
import { ResultsDashboard } from "../components/optimizer";
import { PageHeader } from "../components/PageHeader";

// Types für revolutionäre Features
import {
  OptimizationSuggestion,
  ContractHealthScore,
  LegalIntegrity
} from "../types/optimizer";

// Utils
import { mapLegacyToProgress } from "../utils/analysisAdapter";

// Styles
import styles from "../styles/Optimizer.module.css";
import { WelcomePopup } from "../components/Tour";
import { useDocumentScanner } from "../hooks/useDocumentScanner";

// 🚀 REVOLUTIONARY: Enhanced Types with backwards compatibility
interface CompanyProfile {
  _id: string;
  companyName: string;
  legalForm?: string;
  street?: string;
  postalCode?: string;
  city?: string;
  country?: string;
  vatId?: string;
  tradeRegister?: string;
  contactEmail?: string;
  contactPhone?: string;
  bankName?: string;
  iban?: string;
  bic?: string;
  logoUrl?: string;
  logoKey?: string;
}

interface GenerateFormData {
  title: string;
  type: string;
  parties?: unknown;
  amounts?: unknown;
  duration?: string;
  termination?: string;
  optimizations?: Array<{
    original: string;
    improved: string;
    category: string;
    reasoning: string;
  }>;
  originalContent?: string;
  [key: string]: unknown;
}

interface ContractMeta {
  type: string;
  confidence?: number;
  jurisdiction?: string;
  language?: string;
  roles?: Array<{type: string; name: string}>;
  detectedClauses?: string[];
  riskFactors?: string[];
  fileName?: string;
  analysisVersion?: string;
  gapsFound?: number;
  categoriesGenerated?: number;
  // 🆕 v2.0: Decision-First Felder
  recognizedAs?: string;
  maturity?: 'high' | 'medium' | 'low';
  isAmendment?: boolean;
  parentType?: string | null;
  // 🆕 Phase 3c: Document Scope für Explainability
  documentScope?: {
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
  };
}

interface OptimizationIssue {
  id: string;
  summary: string;
  originalText: string;
  improvedText: string;
  legalReasoning: string;
  benchmark?: string;
  risk: number;
  impact: number;
  confidence: number;
  difficulty: 'Einfach' | 'Mittel' | 'Komplex';
  // 🆕 v2.0: Anti-Bullshit Felder (Decision-First)
  evidence?: string[];
  whyItMatters?: string;
  whyNotIntentional?: string;
  whenToIgnore?: string;
}

interface RevolutionaryCategory {
  tag: string;
  label: string;
  present: boolean;
  issues: OptimizationIssue[];
}

interface OptimizationResult {
  meta?: ContractMeta;
  // 🆕 v2.0: Assessment-Block für Decision-First
  assessment?: {
    overall: string;
    optimizationNeeded: boolean;
    reasoning: string;
    intentionalClauses: string[];
  };
  categories?: RevolutionaryCategory[];
  score?: {
    health: number;
  };
  summary?: {
    redFlags: number;
    quickWins: number;
    totalIssues: number;
  };
  // Legacy support
  optimizationResult?: string;
  success?: boolean;
  message?: string;
  requestId?: string;
  originalText?: string;
  analysisId?: string;
  contractId?: string;
  fileUrl?: string;
  fullText?: string;
  laufzeit?: string;
  kuendigung?: string;
  expiryDate?: string;
  status?: string;
  legalAssessment?: string;
  // 🆕 Phase 4: Legal Integrity Check
  legalIntegrity?: LegalIntegrity;
}

interface AnalysisData {
  success: boolean;
  analysisId?: string;
  contractId?: string;
  requestId?: string;
  uploadType?: string;
  fileUrl?: string;
  originalText?: string;
  fullText?: string;
  laufzeit?: string;
  kuendigung?: string;
  expiryDate?: string;
  status?: string;
  summary?: string;
  legalAssessment?: string;
  optimizationResult?: string;
  [key: string]: unknown;
}

interface ExportOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  format: string;
  premium?: boolean;
}

interface PitchStyle {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
  target: 'lawyer' | 'business' | 'private';
}

// 🚀 REVOLUTIONARY: Contract Type Configurations
const CONTRACT_TYPE_INFO = {
  arbeitsvertrag: {
    name: 'Arbeitsvertrag',
    icon: <Users className="w-5 h-5" />,
    color: '#007AFF',
    gradient: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
    description: 'Optimierung für Arbeitsverhältnisse'
  },
  mietvertrag: {
    name: 'Mietvertrag',
    icon: <Home className="w-5 h-5" />,
    color: '#FF9500',
    gradient: 'linear-gradient(135deg, #FF9500 0%, #FF7A00 100%)',
    description: 'Wohn- und Gewerberaummiete'
  },
  nda: {
    name: 'NDA / Geheimhaltung',
    icon: <Lock className="w-5 h-5" />,
    color: '#AF52DE',
    gradient: 'linear-gradient(135deg, #AF52DE 0%, #9B42C8 100%)',
    description: 'Vertraulichkeitsvereinbarungen'
  },
  saas_vertrag: {
    name: 'SaaS / Software',
    icon: <Cloud className="w-5 h-5" />,
    color: '#34C759',
    gradient: 'linear-gradient(135deg, #34C759 0%, #2EB150 100%)',
    description: 'Cloud & Software-Services'
  },
  kaufvertrag: {
    name: 'Kaufvertrag',
    icon: <DollarSign className="w-5 h-5" />,
    color: '#FF3B30',
    gradient: 'linear-gradient(135deg, #FF3B30 0%, #E5302A 100%)',
    description: 'Kauf und Verkauf'
  },
  dienstvertrag: {
    name: 'Dienstvertrag',
    icon: <Briefcase className="w-5 h-5" />,
    color: '#5856D6',
    gradient: 'linear-gradient(135deg, #5856D6 0%, #4840C0 100%)',
    description: 'Freie Dienstleistungen'
  },
  werkvertrag: {
    name: 'Werkvertrag',
    icon: <Target className="w-5 h-5" />,
    color: '#5AC8FA',
    gradient: 'linear-gradient(135deg, #5AC8FA 0%, #40B8F0 100%)',
    description: 'Werkleistungen mit Erfolg'
  },
  lizenzvertrag: {
    name: 'Lizenzvertrag',
    icon: <FileSignature className="w-5 h-5" />,
    color: '#007AFF',
    gradient: 'linear-gradient(135deg, #007AFF 0%, #0051D5 100%)',
    description: 'Software & IP-Lizenzen'
  },
  gesellschaftsvertrag: {
    name: 'Gesellschaftsvertrag',
    icon: <Building2 className="w-5 h-5" />,
    color: '#FF375F',
    gradient: 'linear-gradient(135deg, #FF375F 0%, #E52D53 100%)',
    description: 'GmbH, AG & Co.'
  },
  darlehensvertrag: {
    name: 'Darlehensvertrag',
    icon: <Calculator className="w-5 h-5" />,
    color: '#30D158',
    gradient: 'linear-gradient(135deg, #30D158 0%, #28B84C 100%)',
    description: 'Kredite & Darlehen'
  },
  agb: {
    name: 'AGB',
    icon: <FileText className="w-5 h-5" />,
    color: '#64D2FF',
    gradient: 'linear-gradient(135deg, #64D2FF 0%, #48C8F8 100%)',
    description: 'Allgemeine Geschäftsbedingungen'
  },
  franchise: {
    name: 'Franchise',
    icon: <Package className="w-5 h-5" />,
    color: '#BF5AF2',
    gradient: 'linear-gradient(135deg, #BF5AF2 0%, #A842D8 100%)',
    description: 'Franchise-Vereinbarungen'
  },
  sonstiges: {
    name: 'Sonstiger Vertrag',
    icon: <FileText className="w-5 h-5" />,
    color: '#8E8E93',
    gradient: 'linear-gradient(135deg, #8E8E93 0%, #636366 100%)',
    description: 'Allgemeine Vertragsoptimierung'
  }
};

// Note: Visual progress steps are now handled by AnalysisProgressComponent
// with automatic step detection via mapLegacyToProgress adapter

// 🚀 UNIVERSAL: Klausel-Vervollständigung für ALLE Vertragstypen
// 🔥 DEAKTIVIERT: Backend liefert jetzt professionelle Templates mit § 623 BGB, § 26 BDSG, etc.
// Frontend soll NICHTS mehr überschreiben, um Backend-Sanitizer und Contract-Type-spezifische Templates zu respektieren!
//
// PROBLEM (VORHER):
// Frontend überschrieb Backend-Text mit eigenen Templates:
//   - [X] → Math.random() * 20 + 1 → "§ 17: 17 Stunden" ❌
//   - [ORT] → "am Sitz des Auftragnehmers" ❌
//   - [X] Stunden → willkürliche Zahlen ❌
//
// LÖSUNG (JETZT):
// Backend hat die Kontrolle über alle Templates, Frontend zeigt nur an!
// Backend-Templates enthalten: § 623 BGB (Arbeitsvertrag), § 26 BDSG (Datenschutz), etc.
const expandOptimizationClause = (optimization: OptimizationSuggestion): OptimizationSuggestion => {
  // 🔥 FRONTEND-TEMPLATES DEAKTIVIERT
  // Backend liefert jetzt fertige, sanitized Templates (§ 623 BGB, § 26 BDSG, etc.)
  // Parameter 'contractType' entfernt - wird nicht mehr benötigt
  return optimization;
};

// ✅ ORIGINAL: Portal Component für Dropdowns
const DropdownPortal: React.FC<{
  isOpen: boolean;
  targetRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
  position?: 'left' | 'right';
}> = ({ isOpen, targetRef, children, position = 'left' }) => {
  const [portalPosition, setPortalPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (isOpen && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      setPortalPosition({
        top: rect.bottom + scrollTop + 8,
        left: position === 'right' 
          ? rect.right + scrollLeft - 350
          : rect.left + scrollLeft
      });
    }
  }, [isOpen, targetRef, position]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'absolute',
        top: portalPosition.top,
        left: Math.max(8, portalPosition.left),
        zIndex: 999999,
        pointerEvents: 'auto'
      }}
    >
      {children}
    </div>,
    document.body
  );
};

// ✅ ORIGINAL + ENHANCED: Parse function with revolutionary features
const parseOptimizationResult = (data: OptimizationResult, fileName: string): OptimizationSuggestion[] => {
  // contractType entfernt - expandOptimizationClause() benötigt es nicht mehr (Backend hat Kontrolle)

  // 🚀 NEW: Handle structured response from revolutionary backend
  if (data.categories && Array.isArray(data.categories)) {
    const suggestions: OptimizationSuggestion[] = [];
    
    data.categories.forEach((category: RevolutionaryCategory) => {
      category.issues.forEach((issue: OptimizationIssue) => {
        // Map category tag to valid OptimizationSuggestion category
        let mappedCategory: OptimizationSuggestion['category'] = 'clarity';
        
        // Category mapping
        const categoryMap: Record<string, OptimizationSuggestion['category']> = {
          'termination': 'termination',
          'liability': 'liability',
          'payment': 'payment',
          'compliance': 'compliance',
          'clarity': 'clarity',
          'working_hours': 'termination',
          'compensation': 'payment',
          'data_protection': 'compliance',
          'confidentiality': 'compliance',
          'warranty': 'liability',
          'delivery': 'clarity',
          'service_levels': 'clarity',
          'support': 'clarity'
        };
        
        mappedCategory = categoryMap[category.tag] || 'clarity';
        
        // 🆕 v2.0: Erweiterte Felder für Anti-Bullshit-Firewall
        let suggestion: OptimizationSuggestion = {
          id: issue.id,
          category: mappedCategory,
          priority: issue.risk >= 8 ? 'critical' : issue.risk >= 6 ? 'high' : issue.risk >= 4 ? 'medium' : 'low',
          confidence: issue.confidence,
          summary: issue.summary,  // 🔥 FIX: Summary vom Backend übernehmen!
          original: issue.originalText,
          improved: issue.improvedText,
          reasoning: issue.legalReasoning,
          legalRisk: issue.risk,
          businessImpact: issue.impact,
          implementationDifficulty: issue.difficulty === 'Einfach' ? 'easy' : issue.difficulty === 'Mittel' ? 'medium' : 'complex',
          estimatedSavings: issue.benchmark?.includes('€') ? issue.benchmark : 'Risikoreduzierung',
          marketBenchmark: issue.benchmark || `Basierend auf ${fileName} Analyse`,
          implemented: false,
          aiInsight: `KI-Vertrauen ${issue.confidence}%: ${issue.summary}`,
          relatedClauses: [`Kategorie: ${category.label}`, `Priorität: ${issue.risk >= 8 ? 'kritisch' : 'hoch'}`],
          // 🆕 v2.0: Neue Anti-Bullshit Felder
          evidence: issue.evidence || [],
          whyItMatters: issue.whyItMatters || '',
          whyNotIntentional: issue.whyNotIntentional || '',
          whenToIgnore: issue.whenToIgnore || ''
        };
        
        // ERWEITERE kurze oder fehlende Klauseln mit professionellem Content (DEAKTIVIERT - Backend hat Kontrolle)
        suggestion = expandOptimizationClause(suggestion);
        
        suggestions.push(suggestion);
      });
    });
    
    return suggestions;
  }
  
  // ✅ ORIGINAL: Legacy parsing for backwards compatibility
  const aiText = data.optimizationResult || data.legalAssessment || '';
  if (!aiText || aiText.length < 50) {
    return [];
  }

  const optimizations: OptimizationSuggestion[] = [];
  
  const sections = aiText.split(/(?:\[KATEGORIE:|KATEGORIE:|PROBLEM:|EMPFEHLUNG:|\d+\.\s*)/i)
    .filter((section: string) => section.trim().length > 30);
  
  const additionalSections = aiText.split(/(?:BEGRÜNDUNG:|PRIORITÄT:|UMSETZUNG:)/i)
    .filter((section: string) => section.trim().length > 50);
  
  const allSections = [...sections, ...additionalSections]
    .filter((section, index, arr) => arr.indexOf(section) === index)
    .slice(0, 15);

  allSections.forEach((section: string, index: number) => {
    if (section.trim().length < 40) return;
    
    let category: OptimizationSuggestion['category'] = 'clarity';
    let priority: OptimizationSuggestion['priority'] = 'medium';
    
    const lowerSection = section.toLowerCase();
    
    // Category detection logic (original)
    if (lowerSection.includes('kündigung') || lowerSection.includes('laufzeit')) {
      category = 'termination';
      priority = lowerSection.includes('kurz') || lowerSection.includes('lange') ? 'high' : 'medium';
    } else if (lowerSection.includes('haftung') || lowerSection.includes('schäden')) {
      category = 'liability';
      priority = lowerSection.includes('unbegrenzt') ? 'critical' : 'high';
    } else if (lowerSection.includes('zahlung') || lowerSection.includes('vergütung')) {
      category = 'payment';
      priority = lowerSection.includes('säumnis') ? 'high' : 'medium';
    } else if (lowerSection.includes('dsgvo') || lowerSection.includes('datenschutz')) {
      category = 'compliance';
      priority = lowerSection.includes('dsgvo') ? 'high' : 'medium';
    }

    let confidence = 75;
    if (section.length > 200) confidence += 10;
    if (lowerSection.includes('empfehlung')) confidence += 8;
    
    const sentences = section.split(/[.!?]+/).filter((s: string) => s.trim().length > 15);
    
    let original = "";
    let improved = "";
    let reasoning = "";
    
    if (sentences.length >= 3) {
      original = sentences.slice(0, Math.ceil(sentences.length / 3)).join('. ').trim() + '.';
      improved = sentences.slice(Math.ceil(sentences.length / 3), Math.ceil(2 * sentences.length / 3)).join('. ').trim() + '.';
      reasoning = sentences.slice(Math.ceil(2 * sentences.length / 3)).join('. ').trim() + '.';
    } else {
      original = "Aktuelle Formulierung erkannt";
      improved = sentences[0]?.trim() + '.' || section.substring(0, 150) + '...';
      reasoning = sentences.slice(1).join('. ').trim() || section.substring(150, 400) + '...';
    }

    let optimization: OptimizationSuggestion = {
      id: `opt_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
      category,
      priority,
      confidence: Math.min(95, confidence),
      original: original.length > 20 ? original : "Aktuelle Vertragsformulierung",
      improved: improved.length > 20 ? improved : section.substring(0, 200) + '...',
      reasoning: reasoning.length > 30 ? reasoning : section.substring(0, 400) + '...',
      legalRisk: priority === 'critical' ? 8 + Math.floor(Math.random() * 2) : 
                priority === 'high' ? 6 + Math.floor(Math.random() * 2) : 
                3 + Math.floor(Math.random() * 3),
      businessImpact: priority === 'critical' ? 7 + Math.floor(Math.random() * 2) : 
                     priority === 'high' ? 5 + Math.floor(Math.random() * 2) : 
                     3 + Math.floor(Math.random() * 3),
      implementationDifficulty: Math.random() > 0.6 ? 'medium' : 'easy',
      estimatedSavings: category === 'payment' ? `~${800 + Math.floor(Math.random() * 2000)}€/Jahr` : 'Risikoreduzierung',
      marketBenchmark: `${60 + Math.floor(Math.random() * 30)}% der Verträge optimiert`,
      implemented: false,
      aiInsight: `KI-Vertrauen ${confidence}%: ${section.substring(0, 100)}...`,
      relatedClauses: [`Bezug zu ${category}`, `Priorität: ${priority}`]
    };
    
    // ERWEITERE kurze Klauseln (DEAKTIVIERT - Backend hat Kontrolle)
    optimization = expandOptimizationClause(optimization);
    
    optimizations.push(optimization);
  });

  return optimizations;
};

// ✅ ORIGINAL: Calculate Contract Score
const calculateContractScore = (optimizations: OptimizationSuggestion[]): ContractHealthScore => {
  if (optimizations.length === 0) {
    // 🆕 FIX: 0 Optimierungen = Perfekter Vertrag = Score 98!
    return {
      overall: 98,
      categories: {
        termination: { score: 98, trend: 'stable' },
        liability: { score: 98, trend: 'stable' },
        payment: { score: 98, trend: 'stable' },
        clarity: { score: 98, trend: 'stable' },
        compliance: { score: 98, trend: 'stable' }
      },
      industryPercentile: 95,
      riskLevel: 'low'
    };
  }

  // 🆕 VERBESSERTES SCORING: Motivierend-realistisch
  // Philosophie: Ein durchschnittlicher Vertrag ist "solide" (65-75 Punkte)
  // Optimierungen = Verbesserungspotenzial, nicht Fehler
  // User sollen motiviert werden, nicht frustriert

  const totalOptimizations = optimizations.length;
  const criticalCount = optimizations.filter(opt => opt.priority === 'critical' && !opt.implemented).length;
  const highCount = optimizations.filter(opt => opt.priority === 'high' && !opt.implemented).length;
  const mediumCount = optimizations.filter(opt => opt.priority === 'medium' && !opt.implemented).length;
  const lowCount = optimizations.filter(opt => opt.priority === 'low' && !opt.implemented).length;
  const implementedCount = optimizations.filter(opt => opt.implemented).length;

  // Basis-Score: 82 (ein Vertrag der analysiert wird ist grundsätzlich "gut")
  let baseScore = 82;

  // Kritische Issues: Spürbar, aber fair
  // Erste: -6, weitere: -4, -3, -2, -2...
  for (let i = 0; i < criticalCount; i++) {
    baseScore -= Math.max(2, 6 - i);
  }

  // Hohe Issues: Moderat
  // Erste: -3, weitere: -2, -2, -1...
  for (let i = 0; i < highCount; i++) {
    baseScore -= Math.max(1, 3 - Math.floor(i / 2));
  }

  // Mittlere Issues: Gering
  // Jede: -1 (max -8 insgesamt)
  baseScore -= Math.min(8, mediumCount * 1);

  // Niedrige Issues: Minimal
  // Jede: -0.5 (max -2 insgesamt)
  baseScore -= Math.min(2, lowCount * 0.5);

  // Minimum bei 45 - selbst ein problematischer Vertrag hat Substanz
  baseScore = Math.max(45, baseScore);

  // Bonus für implementierte Optimierungen: +3 pro Optimierung
  const improvementBonus = implementedCount * 3;

  // Kleiner Bonus für gründliche Analyse (viele gefundene Optimierungen)
  const analysisBonus = totalOptimizations > 8 ? 3 : totalOptimizations > 5 ? 2 : 0;

  const finalScore = Math.min(100, Math.round(baseScore + improvementBonus + analysisBonus));

  // 🆕 KATEGORIE-SCORES: Fairer berechnet
  // Basis für jede Kategorie ist der Overall-Score
  const categoryScores: Record<string, number> = {
    termination: finalScore,
    liability: finalScore,
    payment: finalScore,
    clarity: finalScore,
    compliance: finalScore
  };

  // Zähle Issues pro Kategorie
  const categoryIssueCounts: Record<string, { critical: number; high: number; medium: number; low: number; implemented: number }> = {
    termination: { critical: 0, high: 0, medium: 0, low: 0, implemented: 0 },
    liability: { critical: 0, high: 0, medium: 0, low: 0, implemented: 0 },
    payment: { critical: 0, high: 0, medium: 0, low: 0, implemented: 0 },
    clarity: { critical: 0, high: 0, medium: 0, low: 0, implemented: 0 },
    compliance: { critical: 0, high: 0, medium: 0, low: 0, implemented: 0 }
  };

  optimizations.forEach(opt => {
    const cat = opt.category as keyof typeof categoryIssueCounts;
    if (categoryIssueCounts[cat]) {
      if (opt.implemented) {
        categoryIssueCounts[cat].implemented++;
      } else {
        categoryIssueCounts[cat][opt.priority as 'critical' | 'high' | 'medium' | 'low']++;
      }
    }
  });

  // Berechne Kategorie-Scores basierend auf spezifischen Issues
  Object.keys(categoryScores).forEach(cat => {
    const counts = categoryIssueCounts[cat as keyof typeof categoryIssueCounts];
    if (!counts) return;

    // Keine Issues in dieser Kategorie = +8 Bonus (gut!)
    if (counts.critical + counts.high + counts.medium + counts.low === 0) {
      categoryScores[cat] = Math.min(100, finalScore + 8);
    } else {
      // Abzüge pro Kategorie (fair und motivierend)
      let catScore = finalScore;
      catScore -= counts.critical * 5;
      catScore -= counts.high * 2.5;
      catScore -= counts.medium * 1;
      catScore -= counts.low * 0.5;

      // Bonus für implementierte Optimierungen in dieser Kategorie
      catScore += counts.implemented * 4;

      categoryScores[cat] = Math.max(40, Math.min(100, Math.round(catScore)));
    }
  });

  // Trend basierend auf implementierten Optimierungen
  const getTrend = (cat: string): 'up' | 'down' | 'stable' => {
    const counts = categoryIssueCounts[cat as keyof typeof categoryIssueCounts];
    if (!counts) return 'stable';
    if (counts.implemented > 0) return 'up';
    if (counts.critical > 0) return 'down';
    return 'stable';
  };

  return {
    overall: Math.round(finalScore),
    categories: {
      termination: { score: Math.round(categoryScores.termination), trend: getTrend('termination') },
      liability: { score: Math.round(categoryScores.liability), trend: getTrend('liability') },
      payment: { score: Math.round(categoryScores.payment), trend: getTrend('payment') },
      clarity: { score: Math.round(categoryScores.clarity), trend: getTrend('clarity') },
      compliance: { score: Math.round(categoryScores.compliance), trend: getTrend('compliance') }
    },
    industryPercentile: Math.max(20, Math.round(finalScore - 10)),
    riskLevel: finalScore < 45 ? 'critical' : finalScore < 60 ? 'high' : finalScore < 75 ? 'medium' : 'low'
  };
};

// ✅ Helper: Prüft ob originalText ein echter PDF-Text ist (nicht "FEHLT" oder Platzhalter)
const isValidPdfText = (text: string | undefined): boolean => {
  if (!text || text.trim().length < 20) return false;

  const invalidTexts = [
    'FEHLT',
    'fehlt',
    'nicht vorhanden',
    'Siehe Vertrag',
    'Analyse erforderlich',
    'Diese Klausel ist nicht vorhanden',
    'Diese Pflichtklausel ist nicht vorhanden',
    'Diese wichtige Regelung ist nicht im Vertrag vorhanden'
  ];

  return !invalidTexts.some(invalid => text.includes(invalid));
};

export default function Optimizer() {
  // ✅ Navigation & Params
  const navigate = useNavigate();
  const location = useLocation();
  const { contractId, jobId } = useParams<{ contractId?: string; jobId?: string }>();

  // 📸 Document Scanner
  const { openScanner, ScannerModal } = useDocumentScanner((scannedFile) => {
    setFile(scannedFile);
    setError(null);
  });

  // ✅ ORIGINAL: Core states
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [contractScore, setContractScore] = useState<ContractHealthScore | null>(null);
  const [preloadedContractName, setPreloadedContractName] = useState<string | null>(null);

  // 🆕 Perspektiven-Auswahl: Für wen wird optimiert?
  const [perspective, setPerspective] = useState<'neutral' | 'creator' | 'recipient'>('neutral');

  // 🆕 Legal Pulse Context State
  const [legalPulseContext, setLegalPulseContext] = useState<{
    risks: Array<string | {
      title?: string;
      description?: string;
      severity?: string;
      impact?: string;
      solution?: string;
      recommendation?: string;
      affectedClauses?: string[];
    }>;
    recommendations: Array<string | {
      title?: string;
      description?: string;
      priority?: string;
      effort?: string;
      impact?: string;
      steps?: string[];
    }>;
    riskScore: number | null;
    complianceScore: number | null;
  } | null>(null);

  // 🆕 Analysis Context State (from ContractAnalysis page)
  const [analysisContext, setAnalysisContext] = useState<{
    summary?: string | string[];
    legalAssessment?: string | string[];
    suggestions?: string | string[];
    comparison?: string | string[];
    positiveAspects?: unknown;
    criticalIssues?: unknown;
    recommendations?: unknown;
    detailedLegalOpinion?: string;
    contractScore?: number;
  } | null>(null);

  // 🆕 Existing Contract ID (to update instead of create new)
  const [existingContractId, setExistingContractId] = useState<string | null>(null);

  // ✅ ORIGINAL: Export & Pitch States + Portal Refs
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPitchMenu, setShowPitchMenu] = useState(false);
  const [selectedPitchStyle] = useState<string>('business');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // ✅ ORIGINAL: Smart Contract Generator States
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [originalContractText, setOriginalContractText] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [showAdvancedView, setShowAdvancedView] = useState(false);
  const [showStatistics, setShowStatistics] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [selectedOptimizations, setSelectedOptimizations] = useState<Set<string>>(new Set());

  // 📄 PDF Document Viewer State
  const [highlightedText, setHighlightedText] = useState<string | null>(null); // wird in Phase 3 genutzt

  // 🧠 PHASE 1: Simple Explanation Popup State
  const [explanationPopup, setExplanationPopup] = useState<{
    show: boolean;
    optimization: OptimizationSuggestion | null;
  }>({ show: false, optimization: null });

  // 🎯 PHASE 1 - FEATURE 2: Quick Win Sort State
  const [showQuickWinsFirst, setShowQuickWinsFirst] = useState(false);

  // 🎯 PHASE 1 - FEATURE 3: Visual Diff View State
  const [diffViewEnabled, setDiffViewEnabled] = useState<Map<string, boolean>>(new Map());

  // 🎯 NEUE FEATURE: Optimierten Vertrag generieren Modal
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [generateOptions, setGenerateOptions] = useState({
    includeParties: true,
    includeAmounts: true,
    includeDurations: true,
    includeClauses: true
  });
  const [companyProfiles, setCompanyProfiles] = useState<CompanyProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // 🎨 NEU: Zwei-Schritt-Flow - Textvorschau + Design-Auswahl Modal
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [generatedContractText, setGeneratedContractText] = useState<string>('');
  const [generatedContractId, setGeneratedContractId] = useState<string | null>(null);
  const [selectedDesignVariant, setSelectedDesignVariant] = useState<string>('executive');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // 🚀 NEW: Modern Dashboard Toggle (Enterprise Design v2.0 - jetzt Standard)
  const [useModernDashboard] = useState<boolean>(true);

  // 🎨 Design-Optionen (Top 5 relevanteste Designs)
  const designOptions = [
    { id: 'executive', name: 'Executive', color: '#0B1324', desc: 'Klassisch & Seriös' },
    { id: 'modern', name: 'Modern', color: '#3B82F6', desc: 'Frisch & Dynamisch' },
    { id: 'elegant', name: 'Elegant', color: '#D4AF37', desc: 'Premium & Luxuriös' },
    { id: 'corporate', name: 'Corporate', color: '#003366', desc: 'Business & Formell' },
    { id: 'minimal', name: 'Minimal', color: '#6B7280', desc: 'Clean & Schlicht' }
  ];

  // ✅ ORIGINAL: Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pitchButtonRef = useRef<HTMLButtonElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);
  const pdfViewerRef = useRef<HTMLDivElement>(null); // Ref für PDF-Vorschau Section

  // ✅ ORIGINAL: Load Premium Status
  useEffect(() => {
    const fetchPremiumStatus = async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok) throw new Error("Nicht authentifiziert");
        const data = await res.json();
        setIsPremium(data.user?.subscriptionActive === true);
      } catch (error) {
        console.error("❌ Fehler beim Laden des Premium-Status:", error);
        setIsPremium(false);
      }
    };
    fetchPremiumStatus();
  }, []);

  // 💾 AUTO-SAVE: Speichere Optimierungen in localStorage
  useEffect(() => {
    if (optimizations.length > 0 && contractScore) {
      const saveData = {
        optimizations,
        contractScore,
        fileName: file?.name || preloadedContractName || 'Vertrag',
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('optimizer_autosave', JSON.stringify(saveData));
      console.log('💾 Auto-Save: Optimierungen gespeichert');
    }
  }, [optimizations, contractScore, file?.name, preloadedContractName]);

  // 💾 AUTO-RESTORE: Beim Laden prüfen, ob gespeicherte Daten vorhanden sind
  useEffect(() => {
    const saved = localStorage.getItem('optimizer_autosave');
    if (saved && optimizations.length === 0 && !file) {
      try {
        const data = JSON.parse(saved);
        const savedTime = new Date(data.savedAt);
        const now = new Date();
        const hoursSinceSave = (now.getTime() - savedTime.getTime()) / (1000 * 60 * 60);

        // Nur wiederherstellen, wenn < 24 Stunden alt
        if (hoursSinceSave < 24 && data.optimizations?.length > 0) {
          console.log('💾 Auto-Restore: Gefundene Daten von', data.savedAt);
          setToast({
            message: `Letzte Sitzung wiederhergestellt (${data.optimizations.length} Optimierungen)`,
            type: 'success'
          });
          setOptimizations(data.optimizations);
          setContractScore(data.contractScore);
          setPreloadedContractName(data.fileName);
          setTimeout(() => setToast(null), 4000);
        } else if (hoursSinceSave >= 24) {
          // Alte Daten löschen
          localStorage.removeItem('optimizer_autosave');
        }
      } catch (e) {
        console.error('💾 Auto-Restore fehlgeschlagen:', e);
        localStorage.removeItem('optimizer_autosave');
      }
    }
  }, []); // Nur beim ersten Laden

  // 🆕 NEW: Handle incoming state from ContractAnalysis
  useEffect(() => {
    const state = location.state as {
      contractId?: string;
      file?: File;
      analysisContext?: {
        summary?: string | string[];
        legalAssessment?: string | string[];
        suggestions?: string | string[];
        comparison?: string | string[];
        positiveAspects?: unknown;
        criticalIssues?: unknown;
        recommendations?: unknown;
        detailedLegalOpinion?: string;
        contractScore?: number;
      };
    } | null;

    if (state?.file && state?.analysisContext) {
      console.log('[ANALYZER-OPTIMIZER] Empfange Analyse-Context:', state.analysisContext);
      console.log('[ANALYZER-OPTIMIZER] Empfange File:', state.file.name);

      setFile(state.file);
      setAnalysisContext(state.analysisContext);

      // 🆕 Store existing contract ID if provided
      if (state.contractId) {
        console.log('[ANALYZER-OPTIMIZER] Empfange ContractId:', state.contractId);
        setExistingContractId(state.contractId);
      }

      // Optional: Show toast notification
      setToast({
        message: `Vertrag "${state.file.name}" mit Analyse-Context geladen`,
        type: 'success'
      });

      // Clear toast after 3 seconds
      setTimeout(() => setToast(null), 3000);
    }
  }, [location.state]);

  // 🆕 NEW: Handle incoming Legal Pulse context from route state
  useEffect(() => {
    const state = location.state as {
      contractId?: string;
      legalPulseContext?: {
        risks: Array<string | { title?: string; description?: string; severity?: string; impact?: string; solution?: string }>;
        recommendations: Array<string | { title?: string; description?: string; priority?: string; effort?: string; impact?: string; steps?: string[] }>;
        riskScore: number | null;
        complianceScore: number | null;
      };
      focusRecommendation?: { title?: string; description?: string };
    } | null;

    if (state?.legalPulseContext) {
      console.log('[LP-OPTIMIZER] Empfange Legal Pulse Context via Route:', state.legalPulseContext);
      setLegalPulseContext(state.legalPulseContext);

      if (state.contractId) {
        console.log('[LP-OPTIMIZER] Empfange ContractId:', state.contractId);
        setExistingContractId(state.contractId);
      }

      const riskCount = state.legalPulseContext.risks?.length || 0;
      const recCount = state.legalPulseContext.recommendations?.length || 0;

      setToast({
        message: `Legal Pulse Kontext geladen: ${riskCount} Risiken, ${recCount} Empfehlungen`,
        type: 'success'
      });

      setTimeout(() => setToast(null), 3000);
    }
  }, [location.state]);

  // 🆕 NEW: Load contract PDF when contractId comes from route state (not URL param)
  useEffect(() => {
    const state = location.state as { contractId?: string } | null;
    const stateContractId = state?.contractId;

    // Only run if we have contractId in state but not in URL params
    if (stateContractId && !contractId && isPremium && !file) {
      const loadContractFromState = async () => {
        try {
          console.log('[LP-OPTIMIZER] Loading contract from state:', stateContractId);

          // Get contract metadata
          const res = await fetch(`/api/contracts/${stateContractId}`, {
            credentials: "include"
          });

          if (!res.ok) throw new Error("Vertrag konnte nicht geladen werden");

          const data = await res.json();
          const contract = data.contract || data;

          setPreloadedContractName(contract.name || contract.fileName || "Unbekannter Vertrag");
          setExistingContractId(stateContractId);

          // Load PDF
          let pdfUrl;
          if (contract.s3Key) {
            const s3Res = await fetch(`/api/s3/view?key=${encodeURIComponent(contract.s3Key)}`, {
              credentials: "include"
            });
            if (s3Res.ok) {
              const s3Data = await s3Res.json();
              pdfUrl = s3Data.url;
            }
          } else if (contract.formData?.text) {
            // AI-generated contract
            const pdfRes = await fetch(`/api/contracts/${stateContractId}/pdf-v2?design=${contract.designVariant || 'executive'}`, {
              credentials: "include"
            });
            if (pdfRes.ok) {
              const blob = await pdfRes.blob();
              pdfUrl = URL.createObjectURL(blob);
            }
          } else {
            // Legacy local storage
            const viewRes = await fetch(`/api/s3/view?contractId=${stateContractId}`, {
              credentials: "include"
            });
            if (viewRes.ok) {
              const viewData = await viewRes.json();
              pdfUrl = viewData.url;
            }
          }

          if (pdfUrl) {
            const response = await fetch(pdfUrl);
            const blob = await response.blob();
            const loadedFile = new File([blob], contract.fileName || `${contract.name}.pdf`, { type: 'application/pdf' });
            setFile(loadedFile);
            console.log('[LP-OPTIMIZER] Contract PDF loaded successfully');
          }
        } catch (error) {
          console.error('[LP-OPTIMIZER] Error loading contract:', error);
          setToast({
            message: 'Fehler beim Laden des Vertrags',
            type: 'error'
          });
          setTimeout(() => setToast(null), 3000);
        }
      };

      loadContractFromState();
    }
  }, [location.state, contractId, isPremium, file]);

  // 🆕 NEW: Load job from Legal Pulse handoff
  useEffect(() => {
    if (jobId && isPremium && !file) {
      const loadJobFromLegalPulse = async () => {
        try {
          console.log('[LP-OPTIMIZER] Loading job:', jobId);

          // Fetch job data
          const jobRes = await fetch(`/api/optimize/job/${jobId}`, {
            credentials: "include"
          });

          if (!jobRes.ok) throw new Error("Job konnte nicht geladen werden");

          const jobData = await jobRes.json();

          console.log('[LP-OPTIMIZER] Job data:', jobData);

          // 🆕 Set existing contract ID to prevent duplicates
          if (jobData.contractId) {
            setExistingContractId(jobData.contractId);
            console.log('[LP-OPTIMIZER] Set existingContractId:', jobData.contractId);
          }

          // Set Legal Pulse context if available
          if (jobData.legalPulseContext) {
            setLegalPulseContext(jobData.legalPulseContext);
          }

          // Set contract name
          setPreloadedContractName(jobData.contractName || "Unbekannter Vertrag");

          // Load PDF based on storage type
          if (jobData.sourceFile) {
            let pdfUrl;

            // Handle both S3 and legacy local storage
            if (jobData.sourceFile.storageType === 'LOCAL_LEGACY' && jobData.contractId) {
              console.log('[LP-OPTIMIZER] Loading legacy contract from contractId:', jobData.contractId);
              // Legacy local storage - use contractId
              const viewRes = await fetch(`/api/s3/view?contractId=${jobData.contractId}`, {
                credentials: "include"
              });

              if (!viewRes.ok) throw new Error("PDF konnte nicht abgerufen werden");

              const viewData = await viewRes.json();
              pdfUrl = viewData.url;
            } else if (jobData.sourceFile.s3Location) {
              console.log('[LP-OPTIMIZER] Loading S3 contract from s3Key:', jobData.sourceFile.s3Key);
              // Modern S3 storage
              const viewRes = await fetch(`/api/s3/view?key=${jobData.sourceFile.s3Key}`, {
                credentials: "include"
              });

              if (!viewRes.ok) throw new Error("PDF konnte nicht abgerufen werden");

              const viewData = await viewRes.json();
              pdfUrl = viewData.url;
            } else {
              throw new Error("Keine gültige Datei-Quelle gefunden");
            }

            // Download PDF as blob
            const pdfRes = await fetch(pdfUrl);
            if (!pdfRes.ok) throw new Error("PDF-Download fehlgeschlagen");

            const blob = await pdfRes.blob();

            // Convert blob to File object
            const fileName = jobData.contractName || "vertrag.pdf";
            const fileObj = new File([blob], fileName, { type: "application/pdf" });

            setFile(fileObj);

            // Auto-start optimization if status is pending
            if (jobData.status === 'pending') {
              console.log('[LP-OPTIMIZER] Auto-starting optimization...');
              // Trigger optimization automatically
              setTimeout(() => {
                // We'll trigger handleUpload via the ref after file is set
                // File is set above, so the user can click the button manually
                // Or we can auto-trigger after a delay
              }, 500);
            }
          }
        } catch (error) {
          console.error('[LP-OPTIMIZER] Error loading job:', error);
          setError('Fehler beim Laden des Optimization-Jobs aus Legal Pulse');
        }
      };

      loadJobFromLegalPulse();
    }
  }, [jobId, isPremium, file]);

  // ✅ NEW: Load contract from URL parameter (with saved optimizations!)
  useEffect(() => {
    if (contractId && isPremium && !file) {
      const loadContractFromUrl = async () => {
        try {
          // Step 1: Get contract metadata
          const res = await fetch(`/api/contracts/${contractId}`, {
            credentials: "include"
          });

          if (!res.ok) throw new Error("Vertrag konnte nicht geladen werden");

          const data = await res.json();
          const contract = data.contract || data;

          setPreloadedContractName(contract.name || contract.fileName || "Unbekannter Vertrag");

          // 🆕 Set existing contract ID to prevent duplicates
          setExistingContractId(contractId);
          console.log('[OPTIMIZER] Set existingContractId from URL param:', contractId);

          // 🆕 Step 1.5: Restore saved optimizations if available
          if (contract.formData?.optimizations && contract.formData.optimizations.length > 0) {
            console.log('[OPTIMIZER] Restoring saved optimizations:', contract.formData.optimizations.length);

            // Convert saved optimizations back to OptimizationSuggestion format
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const restoredOptimizations: OptimizationSuggestion[] = contract.formData.optimizations.map((opt: Record<string, any>, index: number) => ({
              id: opt.id || `restored-${index}`,
              category: opt.category || 'clarity',
              priority: opt.priority || 'medium',
              confidence: opt.confidence || 80,
              summary: opt.summary || '',
              original: opt.original || '',
              improved: opt.improved || '',
              reasoning: opt.reasoning || opt.explanation || '',
              legalRisk: opt.legalRisk || 5,
              businessImpact: opt.businessImpact || 5,
              implementationDifficulty: opt.implementationDifficulty || 'medium',
              estimatedSavings: opt.estimatedSavings,
              marketBenchmark: opt.marketBenchmark,
              implemented: opt.implemented ?? true, // Already implemented since contract was generated
              aiInsight: opt.aiInsight || '',
              relatedClauses: opt.relatedClauses,
            }));

            setOptimizations(restoredOptimizations);
            // No step state needed - view is controlled by optimizations.length > 0

            // 🔧 FIX: Score aus Backend laden ODER berechnen
            // Der healthScore aus analysisData ist der ORIGINALE Score (vor Optimierung)
            const backendHealthScore = contract.analysisData?.healthScore;
            if (backendHealthScore && typeof backendHealthScore === 'number') {
              // Verwende den originalen Score aus dem Backend
              const restoredScore: ContractHealthScore = {
                overall: backendHealthScore,
                categories: {
                  termination: { score: backendHealthScore, trend: 'up' as const },
                  liability: { score: backendHealthScore, trend: 'up' as const },
                  payment: { score: backendHealthScore, trend: 'stable' as const },
                  clarity: { score: backendHealthScore, trend: 'up' as const },
                  compliance: { score: backendHealthScore, trend: 'stable' as const }
                },
                industryPercentile: Math.min(95, Math.round(backendHealthScore * 0.9)),
                riskLevel: backendHealthScore >= 70 ? 'low' : backendHealthScore >= 50 ? 'medium' : 'high'
              };
              setContractScore(restoredScore);
              console.log('[OPTIMIZER] Restored score from backend:', backendHealthScore);
            } else {
              // Fallback: Berechne Score aus nicht-implementierten Optimierungen
              const unimplementedOpts = restoredOptimizations.map(opt => ({ ...opt, implemented: false }));
              const restoredScore = calculateContractScore(unimplementedOpts);
              setContractScore(restoredScore);
              console.log('[OPTIMIZER] Calculated score (fallback):', restoredScore.overall);
            }

            setToast({
              message: `${restoredOptimizations.length} gespeicherte Optimierungen geladen`,
              type: "success"
            });
            setTimeout(() => setToast(null), 3000);

            // Still load the PDF for preview
          }

          // Step 2: Get PDF - either from S3 (uploaded) or generate (isGenerated)
          let blob: Blob;
          const fileName = contract.fileName || contract.name || "vertrag.pdf";

          if (contract.isGenerated) {
            // Generierter Vertrag: PDF über Backend generieren
            console.log('[OPTIMIZER] Generierter Vertrag - erstelle PDF über Backend...');
            const pdfRes = await fetch(`/api/contracts/${contractId}/pdf-v2?design=${contract.designVariant || 'executive'}`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ design: contract.designVariant || 'executive' })
            });

            if (!pdfRes.ok) {
              console.warn('[OPTIMIZER] PDF-Generierung fehlgeschlagen, verwende Fallback...');
              // Fallback: Leere Datei erstellen und Optimierungen trotzdem anzeigen
              blob = new Blob([''], { type: 'application/pdf' });
            } else {
              blob = await pdfRes.blob();
            }
          } else {
            // Hochgeladener Vertrag: PDF von S3 laden
            const viewRes = await fetch(`/api/s3/view?contractId=${contractId}`, {
              credentials: "include"
            });

            if (!viewRes.ok) throw new Error("PDF konnte nicht abgerufen werden");

            const viewData = await viewRes.json();
            const pdfUrl = viewData.url;

            // Download PDF as blob
            const pdfRes = await fetch(pdfUrl);
            if (!pdfRes.ok) throw new Error("PDF-Download fehlgeschlagen");

            blob = await pdfRes.blob();
          }

          // Convert blob to File object
          const fileObj = new File([blob], fileName, { type: "application/pdf" });

          // Set as file
          setFile(fileObj);

          // Only show "loaded" toast if we didn't already show optimizations toast
          if (!contract.formData?.optimizations || contract.formData.optimizations.length === 0) {
            setToast({
              message: `Vertrag "${contract.name || contract.fileName}" wurde geladen`,
              type: "success"
            });
            setTimeout(() => setToast(null), 3000);
          }
        } catch (error) {
          console.error("❌ Error loading contract from URL:", error);
          setToast({
            message: "Vertrag konnte nicht geladen werden",
            type: "error"
          });
        }
      };

      loadContractFromUrl();
    }
  }, [contractId, isPremium, file]);

  // ✅ ORIGINAL: Contract Score Update
  useEffect(() => {
    if (optimizations.length > 0) {
      const updatedScore = calculateContractScore(optimizations);
      setContractScore(updatedScore);
    }
  }, [optimizations]);

  // ✅ ORIGINAL: Outside Click Handling with Debounce
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      const isPitchButton = pitchButtonRef.current?.contains(target);
      const isExportButton = exportButtonRef.current?.contains(target);
      const isDropdownContent = target.closest('[data-portal-dropdown]');
      
      if (showPitchMenu && !isPitchButton && !isDropdownContent) {
        setShowPitchMenu(false);
      }
      
      if (showExportMenu && !isExportButton && !isDropdownContent) {
        setShowExportMenu(false);
      }
    };

    if (showPitchMenu || showExportMenu) {
      // Add small delay to prevent immediate closing
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPitchMenu, showExportMenu]);

  // 🚀 REVOLUTIONARY: Enhanced Upload Handler with SSE Progress
  const handleUpload = async () => {
    if (!file || !isPremium) return;

    setLoading(true);
    setOptimizations([]);
    setError(null);
    setOriginalContractText('');
    setAnalysisData(null);
    setOptimizationResult(null);
    setIsAnalyzing(true);
    setAnalysisProgress(0);

    const formData = new FormData();
    formData.append("file", file);

    // 🆕 Add existing contract ID if available (to update instead of create new)
    if (existingContractId) {
      console.log('[OPTIMIZER] Adding existing contract ID:', existingContractId);
      formData.append("existingContractId", existingContractId);
    }

    // 🆕 Add analysis context if available (from ContractAnalysis)
    if (analysisContext) {
      console.log('[OPTIMIZER] Adding analysis context to optimization request');
      formData.append("analysisContext", JSON.stringify(analysisContext));
    }

    // 🆕 Add Legal Pulse context if available
    if (legalPulseContext) {
      console.log('[OPTIMIZER] Adding Legal Pulse context to optimization request');
      formData.append("legalPulseContext", JSON.stringify(legalPulseContext));
    }

    // 🆕 Add perspective (creator/recipient/neutral)
    console.log('[OPTIMIZER] Optimization perspective:', perspective);
    formData.append("perspective", perspective);

    let finalResult: OptimizationResult | null = null;
    let useStreamingEndpoint = true;

    try {
      // Inner try: Streaming endpoint
      try {
        console.log("🚀 Starting contract optimization with streaming...");

        // 🔥 TRY Streaming endpoint for real-time progress
        const STREAM_URL = import.meta.env.PROD
          ? "https://api.contract-ai.de/api/optimize/stream"
          : "/api/optimize/stream";

        const response = await fetch(STREAM_URL, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Streaming endpoint error: ${response.status}`);
        }

        // Set up SSE reader
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (!reader) {
          throw new Error("No response body from streaming endpoint");
        }

        // Read SSE stream
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          // Decode chunk
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.substring(6));

                // Handle error
                if (data.error) {
                  throw new Error(data.message || "Optimierung fehlgeschlagen");
                }

                // Handle completion
                if (data.complete) {
                  finalResult = data.result;
                  setAnalysisProgress(100);
                  break;
                }

                // Handle progress update
                if (data.progress !== undefined) {
                  setAnalysisProgress(data.progress);
                  console.log(`📡 ${data.progress}%: ${data.message || ''}`);
                }
              } catch {
                console.warn("Failed to parse SSE data:", line);
              }
            }
          }
        }

        if (!finalResult) {
          throw new Error("Keine vollständige Antwort vom Streaming-Endpoint");
        }

      } catch (streamError) {
        // 🔥 FALLBACK: Use regular endpoint if streaming fails
        const err = streamError as Error;
        console.warn("⚠️ Streaming failed:", err.message);
        console.log("🔄 Falling back to regular optimization endpoint...");

        useStreamingEndpoint = false;

        // 🎯 Simulate progress for regular endpoint
        let currentProgress = 0;
        const progressInterval = setInterval(() => {
          currentProgress = Math.min(currentProgress + 12, 95);
          setAnalysisProgress(currentProgress);
        }, 600); // Faster updates (600ms instead of 800ms)

        const REGULAR_URL = import.meta.env.PROD
          ? "https://api.contract-ai.de/api/optimize"
          : "/api/optimize";

        const res = await fetch(REGULAR_URL, {
          method: "POST",
          credentials: "include",
          body: formData,
        });

        clearInterval(progressInterval);
        setAnalysisProgress(100);

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || `Server Error: ${res.status}`);
        }

        if (!data.success) {
          throw new Error(data.message || "Optimierung fehlgeschlagen");
        }

        finalResult = data;
        console.log("✅ Fallback successful - regular endpoint responded");
      }

      // Process results (works for both streaming and fallback)
      if (finalResult && finalResult.success) {
        console.log("✅ Response:", {
          hasCategories: !!finalResult.categories,
          hasMeta: !!finalResult.meta,
          contractType: finalResult.meta?.type,
          totalIssues: finalResult.summary?.totalIssues,
          usedStreaming: useStreamingEndpoint,
          contractId: finalResult.contractId
        });

        // 🆕 WICHTIG: contractId aus Response speichern um Duplikate zu vermeiden!
        // Wenn der Optimize-Endpoint einen neuen Vertrag erstellt hat, brauchen wir diese ID
        // damit generate.js den Vertrag AKTUALISIERT statt neu zu erstellen
        if (finalResult.contractId && !existingContractId) {
          console.log('[OPTIMIZER] Setting existingContractId from optimize response:', finalResult.contractId);
          setExistingContractId(finalResult.contractId);
        }

        // Store all data
        setAnalysisData(finalResult as AnalysisData);
        setOptimizationResult(finalResult);

        if (finalResult.originalText) {
          setOriginalContractText(finalResult.originalText);
        }

        // Parse optimizations
        const parsedOptimizations = parseOptimizationResult(finalResult, file.name);

        // 🆕 FIX: Verwende Backend-Score wenn verfügbar, sonst Frontend-Berechnung
        const backendScore = finalResult.score?.health;
        let finalScore: ContractHealthScore;

        if (backendScore !== undefined && backendScore !== null) {
          // Backend hat Score berechnet - diesen verwenden!
          console.log(`🎯 Using backend score: ${backendScore}`);
          finalScore = {
            overall: backendScore,
            categories: {
              termination: { score: backendScore, trend: 'stable' as const },
              liability: { score: backendScore, trend: 'stable' as const },
              payment: { score: backendScore, trend: 'stable' as const },
              clarity: { score: backendScore, trend: 'stable' as const },
              compliance: { score: backendScore, trend: 'stable' as const }
            },
            industryPercentile: backendScore >= 90 ? 95 : backendScore >= 70 ? 75 : 50,
            riskLevel: backendScore >= 80 ? 'low' : backendScore >= 60 ? 'medium' : 'high'
          };
        } else {
          // Fallback: Frontend-Berechnung
          console.log(`⚠️ No backend score, using frontend calculation`);
          finalScore = calculateContractScore(parsedOptimizations);
        }

        setOptimizations(parsedOptimizations);
        setContractScore(finalScore);

        // Show success celebration
        setShowSuccessCelebration(true);
        setTimeout(() => {
          setShowSuccessCelebration(false);
        }, 2500); // Show for 2.5 seconds

        showToast(`✅ ${parsedOptimizations.length} Optimierungen gefunden!`, 'success');
      }
    } catch (error) {
      // Outer catch: Handles any unexpected errors
      const err = error as Error;
      console.error("❌ Unexpected error:", err);
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
      setTimeout(() => {
        setAnalysisProgress(0);
      }, 1000);
    }
  };

  // ✅ ORIGINAL: Toast Helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // 🎯 NEUE FEATURE: Firmenprofile laden
  const loadCompanyProfiles = useCallback(async () => {
    try {
      setLoadingProfiles(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/company-profile/me`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.profile) {
          // Wir haben nur ein Profil pro User, packen wir es in ein Array
          setCompanyProfiles([data.profile]);
          setSelectedProfile(data.profile._id);
        }
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Firmenprofile:', error);
    } finally {
      setLoadingProfiles(false);
    }
  }, []);

  // 🎯 NEUE FEATURE: Modal öffnen und Profile laden
  const openGenerateModal = useCallback(() => {
    setShowGenerateModal(true);
    loadCompanyProfiles();
  }, [loadCompanyProfiles]);

  // 🚀 SCHRITT 1: Vertragstext generieren und Design-Modal öffnen
  const handleCreateOptimizedContract = useCallback(async () => {
    if (!file || !analysisData) {
      showToast("❌ Keine Vertragsdaten verfügbar", 'error');
      return;
    }

    if (isGeneratingContract) {
      return;
    }

    setIsGeneratingContract(true);
    showToast("🚀 Erstelle optimierten Vertragstext...", 'info');

    try {
      // 1. Sammle Original-Daten basierend auf Checkboxen
      const formData: GenerateFormData = {
        title: file.name.replace(/\.pdf$/i, ''),
        type: 'custom',
      };

      // 2. Parteien hinzufügen (wenn checkbox aktiv)
      if (generateOptions.includeParties && analysisData) {
        if (analysisData.parties) {
          formData.parties = analysisData.parties;
        }
      }

      // 3. Beträge hinzufügen (wenn checkbox aktiv)
      if (generateOptions.includeAmounts && analysisData) {
        if (analysisData.amounts || analysisData.betrag) {
          formData.amounts = analysisData.amounts || analysisData.betrag;
        }
      }

      // 4. Laufzeiten hinzufügen (wenn checkbox aktiv)
      if (generateOptions.includeDurations && analysisData) {
        if (analysisData.laufzeit) {
          formData.duration = analysisData.laufzeit;
        }
        if (analysisData.kuendigung) {
          formData.termination = analysisData.kuendigung;
        }
      }

      // 5. Klauseln hinzufügen (wenn checkbox aktiv)
      if (generateOptions.includeClauses) {
        const selectedOpts = showAdvancedView
          ? optimizations.filter(opt => selectedOptimizations.has(opt.id))
          : optimizations.filter(opt => opt.priority === 'high' || opt.priority === 'critical');

        if (selectedOpts.length > 0) {
          formData.optimizations = selectedOpts.map(opt => ({
            original: opt.original,
            improved: opt.improved,
            category: opt.category,
            reasoning: opt.reasoning
          }));
        }
      }

      // 🔧 WICHTIG: originalContent IMMER senden (nicht nur bei includeClauses)
      // Das Backend braucht den Originaltext um den Vertrag zu optimieren!
      if (originalContractText) {
        formData.originalContent = originalContractText;
        console.log('[OPTIMIZER] Sende originalContent:', originalContractText.length, 'Zeichen');
      } else {
        console.warn('[OPTIMIZER] WARNUNG: Kein originalContractText verfügbar!');
      }

      // 6. Erstelle/Aktualisiere Vertrag über /api/contracts/generate
      // 🆕 Wenn existingContractId vorhanden, wird der bestehende Vertrag aktualisiert statt neu erstellt
      const requestBody: Record<string, unknown> = {
        type: formData.type,
        formData: formData,
        useCompanyProfile: !!selectedProfile,
        designVariant: 'executive' // Temporär, wird später geändert
      };

      // Füge existingContractId hinzu, um Duplikate zu vermeiden
      if (existingContractId) {
        requestBody.existingContractId = existingContractId;
        console.log('[OPTIMIZER] Using existingContractId for generate:', existingContractId);
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/generate`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Fehler beim Generieren');
      }

      // 7. Parse JSON Response
      const data = await response.json();
      if (!data.contractId) {
        throw new Error('Keine Contract ID erhalten');
      }

      console.log('✅ Vertragstext erstellt, navigiere zur Finalize-Seite:', data.contractId);

      // 8. Schließe Modal und navigiere zur Finalize-Seite
      setGeneratedContractText(data.contractText || '');
      setGeneratedContractId(data.contractId);
      setShowGenerateModal(false); // Schließe Modal

      showToast("✅ Vertragstext erstellt! Du kannst jetzt das Design wählen.", 'success');

      // 🎯 Navigiere zur OptimizerFinalize Seite für vollständige Bearbeitung
      navigate(`/optimizer/finalize/${data.contractId}`);

    } catch (error) {
      const err = error as Error;
      console.error("❌ Fehler beim Erstellen:", err);
      showToast(err.message || 'Fehler beim Erstellen des Vertrags', 'error');
    } finally {
      setIsGeneratingContract(false);
    }
  }, [
    file,
    analysisData,
    generateOptions,
    selectedProfile,
    optimizations,
    showAdvancedView,
    selectedOptimizations,
    originalContractText,
    isGeneratingContract,
    existingContractId,
    showToast,
    navigate
  ]);

  // 🎨 SCHRITT 2: PDF mit gewähltem Design generieren und herunterladen
  // Verwendet /api/contracts/:id/pdf-v2 - React-PDF Generator (bessere Qualität!)
  // Diese Route hat flexible userId-Handhabung (String oder ObjectId)
  const handleDownloadWithDesign = useCallback(async () => {
    if (!generatedContractId || !file) {
      showToast("❌ Kein Vertrag zum Herunterladen", 'error');
      return;
    }

    if (isDownloadingPdf) {
      return;
    }

    setIsDownloadingPdf(true);
    const designName = designOptions.find(d => d.id === selectedDesignVariant)?.name || selectedDesignVariant;
    showToast(`🎨 Generiere PDF mit Design "${designName}"...`, 'info');

    try {
      console.log('🎨 Generiere PDF mit React-PDF V2, Design:', selectedDesignVariant, 'für Contract:', generatedContractId);

      // 🆕 Direkt /pdf-v2 verwenden (React-PDF Generator) mit Design als Parameter
      // Dieser Endpoint verwendet den programmatischen PDF-Generator, nicht HTML-zu-PDF
      const pdfResponse = await fetch(
        `${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/${generatedContractId}/pdf-v2?design=${selectedDesignVariant}`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ design: selectedDesignVariant })
        }
      );

      if (!pdfResponse.ok) {
        const errorText = await pdfResponse.text();
        console.error('❌ PDF-Generierung fehlgeschlagen:', errorText);
        throw new Error('PDF-Generierung fehlgeschlagen');
      }

      // 2. Lade das generierte PDF herunter
      const blob = await pdfResponse.blob();
      console.log('✅ PDF erfolgreich generiert, Größe:', blob.size, 'bytes');

      // 3. Speichere optimiertes PDF in S3 für spätere Ansicht
      try {
        console.log('📤 Uploading optimized PDF to S3...');
        const optimizedFileName = `Optimiert_${file.name.replace('.pdf', '')}_${new Date().toISOString().split('T')[0]}.pdf`;
        const optimizedFile = new File([blob], optimizedFileName, { type: 'application/pdf' });

        const uploadUrlResponse = await fetch(`${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/s3/upload-url`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: optimizedFileName,
            fileType: 'application/pdf'
          })
        });

        if (uploadUrlResponse.ok) {
          const { uploadUrl, s3Key, s3Location } = await uploadUrlResponse.json();

          await fetch(uploadUrl, {
            method: 'PUT',
            body: optimizedFile,
            headers: { 'Content-Type': 'application/pdf' }
          });

          await fetch(`${import.meta.env.VITE_API_URL || 'https://api.contract-ai.de'}/api/contracts/${generatedContractId}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              optimizedPdfS3Key: s3Key,
              optimizedPdfS3Location: s3Location,
              optimizedPdfGeneratedAt: new Date().toISOString(),
              designVariant: selectedDesignVariant
            })
          });

          console.log('✅ Optimized PDF saved to S3:', s3Key);
        }
      } catch (s3Error) {
        console.warn('⚠️ Failed to upload optimized PDF to S3 (continuing with download):', s3Error);
      }

      // 4. Download starten
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Optimiert_${file.name.replace('.pdf', '')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      showToast(`✅ Vertrag mit "${designName}" Design erfolgreich heruntergeladen!`, 'success');

      // 5. Modal schließen und State zurücksetzen
      setShowDesignModal(false);
      setGeneratedContractText('');
      setGeneratedContractId(null);

    } catch (error) {
      const err = error as Error;
      console.error("❌ Fehler beim PDF-Download:", err);
      showToast(err.message || 'Fehler beim Herunterladen des PDFs', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  }, [
    generatedContractId,
    file,
    selectedDesignVariant,
    isDownloadingPdf,
    showToast,
    designOptions
  ]);

  // 🚀 SIMPLIFIED: Toggle optimization selection (for advanced mode)
  const toggleOptimizationSelection = useCallback((id: string) => {
    setSelectedOptimizations(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  // ✅ SIMPLIFIED: Handlers
  const handleReset = useCallback(() => {
    setFile(null);
    setOptimizations([]);
    setError(null);
    setContractScore(null);
    setSelectedCategory('all');
    setShowExportMenu(false);
    setShowPitchMenu(false);
    setIsGeneratingContract(false);
    setOriginalContractText('');
    setAnalysisData(null);
    setOptimizationResult(null);
    setSelectedOptimizations(new Set());
    // 💾 Auto-Save leeren bei Reset
    localStorage.removeItem('optimizer_autosave');
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0] && isPremium) {
      const droppedFile = e.dataTransfer.files[0];
      const maxSize = 10 * 1024 * 1024; // 10 MB

      if (droppedFile.type !== "application/pdf" && droppedFile.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        setError("Nur PDF- und DOCX-Dateien werden unterstützt. Bitte wähle eine .pdf oder .docx Datei.");
        setFile(null);
        return;
      }

      if (droppedFile.size > maxSize) {
        setError(`Die Datei ist zu groß (${(droppedFile.size / 1024 / 1024).toFixed(1)} MB). Maximal 10 MB erlaubt.`);
        setFile(null);
        return;
      }

      setFile(droppedFile);
      setError(null);
    }
  }, [isPremium]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const maxSize = 10 * 1024 * 1024; // 10 MB

      if (selectedFile.type !== "application/pdf" && selectedFile.type !== "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
        setError("Nur PDF- und DOCX-Dateien werden unterstützt. Bitte wähle eine .pdf oder .docx Datei.");
        setFile(null);
        return;
      }

      if (selectedFile.size > maxSize) {
        setError(`Die Datei ist zu groß (${(selectedFile.size / 1024 / 1024).toFixed(1)} MB). Maximal 10 MB erlaubt.`);
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError(null);
    }
  }, []);

  // ✅ SIMPLIFIED: Pitch Generator
  const generatePitch = useCallback((style: string = selectedPitchStyle) => {
    if (optimizations.length === 0) {
      showToast("❌ Keine Optimierungen verfügbar.", 'error');
      return;
    }

    const categoryNames = {
      'termination': 'Kündigungsregelungen',
      'liability': 'Haftungsklauseln', 
      'payment': 'Zahlungskonditionen',
      'compliance': 'Compliance & Datenschutz',
      'clarity': 'Vertragsklarheit'
    };

    const pitchTemplates = {
      lawyer: `Sehr geehrte Damen und Herren,

im Rahmen unserer rechtlichen Prüfung haben wir folgende kritische Optimierungspunkte identifiziert:

${optimizations.slice(0, 5).map((opt, index) => 
  `${index + 1}. ${categoryNames[opt.category]}
   • Rechtliches Risiko: ${opt.legalRisk}/10
   • Maßnahme: ${opt.improved.substring(0, 120)}...
   • Rechtsgrundlage: ${opt.marketBenchmark || 'Aktuelle Rechtsprechung und Vertragspraxis'}`
).join('\n\n')}

${optimizations.length > 5 ? `\nWeitere ${optimizations.length - 5} Optimierungen sind im vollständigen Bericht enthalten.\n` : ''}

Die vorgeschlagenen Änderungen entsprechen der aktuellen Rechtsprechung und herrschenden Meinung.

Mit freundlichen Grüßen`,

      business: `Sehr geehrte Geschäftspartner,

anbei unsere Vertragsoptimierungen für maximale Rechtssicherheit und Wirtschaftlichkeit:

📊 Zusammenfassung: ${optimizations.length} kritische Verbesserungen identifiziert

${optimizations.slice(0, 5).map((opt, index) => 
  `${index + 1}. ${categoryNames[opt.category]}
   • Wirtschaftlicher Impact: ${opt.estimatedSavings || 'Risikominimierung'}
   • Priorität: ${opt.priority === 'critical' ? '🔴 Kritisch' : opt.priority === 'high' ? '🟠 Hoch' : '🟢 Mittel'}
   • Maßnahme: ${opt.marketBenchmark || 'Best Practice Implementierung'}`
).join('\n\n')}

💡 Empfehlung: Zeitnahe Implementierung zur Risikominimierung und Vertragsoptimierung.

Für Rückfragen stehen wir gerne zur Verfügung.

Mit freundlichen Grüßen`,

      private: `Guten Tag,

wir haben Ihren Vertrag geprüft und wichtige Verbesserungsmöglichkeiten gefunden:

✅ ${optimizations.length} Optimierungen für mehr Sicherheit

${optimizations.slice(0, 5).map((opt, index) => 
  `${index + 1}. ${categoryNames[opt.category]}
   → ${opt.estimatedSavings || 'Besserer Schutz Ihrer Interessen'}
   → Schwierigkeit: ${opt.implementationDifficulty === 'easy' ? 'Einfach umzusetzen' : 'Benötigt rechtliche Beratung'}`
).join('\n\n')}

Wir empfehlen, diese Änderungen vor der Unterzeichnung einzuarbeiten.

Bei Fragen helfen wir gerne weiter.

Freundliche Grüße`
    };

    const pitch = pitchTemplates[style as keyof typeof pitchTemplates] || pitchTemplates.business;
    navigator.clipboard.writeText(pitch);
    showToast(`✅ ${style} Pitch kopiert!`, 'success');
    setShowPitchMenu(false);
  }, [optimizations, optimizationResult, selectedPitchStyle, showToast]);

  // ✅ FIXED: Export Functions with format support (inkl. Perfect Contract Support)
  const handleExport = useCallback(async (format: string = 'txt') => {
    setShowExportMenu(false);

    const fileName = file?.name?.replace('.pdf', '') || 'Vertragsanalyse';
    const dateStr = new Date().toISOString().split('T')[0];
    const isPerfectContract = optimizations.length === 0;
    const assessment = optimizationResult?.assessment;
    const score = contractScore?.overall || 0;

    // TXT Export (E-Mail-Vorlage)
    if (format === 'txt' || format === 'TXT') {
      let content = '';

      if (isPerfectContract) {
        content = `VERTRAGSANALYSE - ${fileName}
Datum: ${new Date().toLocaleDateString('de-DE')}
Score: ${score}/100

═══════════════════════════════════════════════
✅ PROFESSIONELLER VERTRAG - KEINE OPTIMIERUNGEN ERFORDERLICH
═══════════════════════════════════════════════

${assessment?.reasoning || 'Der Vertrag erfüllt professionelle Standards.'}

${assessment?.intentionalClauses?.length ? `Als beabsichtigt erkannte Klauseln:
${assessment.intentionalClauses.map(c => `• ${c}`).join('\n')}` : ''}

---
Erstellt mit Contract AI - KI-gestützte Vertragsanalyse
`;
      } else {
        content = optimizations.map((opt, index) =>
          `${index + 1}. ${opt.category.toUpperCase()}
Original: ${opt.original}
Verbessert: ${opt.improved}
Begründung: ${opt.reasoning}
Benchmark: ${opt.marketBenchmark}
Impact: ${opt.estimatedSavings}
Konfidenz: ${opt.confidence}%\n`
        ).join('\n');
      }

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName}_${dateStr}.txt`;
      link.click();
      showToast(`✅ TXT Export erfolgreich!`, 'success');
      return;
    }

    // PDF Export mit Markierungen
    if (format === 'pdf' || format === 'PDF') {
      try {
        // Erstelle HTML für PDF
        let htmlContent = '';

        if (isPerfectContract) {
          // Perfect Contract PDF
          htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Vertragsanalyse - ${fileName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1D1D1F; border-bottom: 2px solid #34C759; padding-bottom: 10px; }
    .score-badge { display: inline-block; background: linear-gradient(135deg, #34C759, #30D158); color: white; padding: 8px 20px; border-radius: 20px; font-size: 24px; font-weight: bold; margin: 20px 0; }
    .success-box { background: #E5FFE5; border: 2px solid #34C759; border-radius: 12px; padding: 25px; margin: 20px 0; }
    .success-title { color: #34C759; font-size: 20px; font-weight: bold; margin-bottom: 15px; }
    .assessment { color: #333; line-height: 1.6; }
    .clauses-list { margin-top: 20px; }
    .clauses-list h3 { color: #666; font-size: 14px; margin-bottom: 10px; }
    .clauses-list ul { list-style: none; padding: 0; }
    .clauses-list li { padding: 5px 0; padding-left: 20px; position: relative; }
    .clauses-list li:before { content: "✓"; color: #34C759; position: absolute; left: 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <h1>✅ Vertragsanalyse</h1>
  <p><strong>Dokument:</strong> ${fileName}</p>
  <p><strong>Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
  <div class="score-badge">${score}/100 Punkte</div>

  <div class="success-box">
    <div class="success-title">Professioneller Vertrag - Keine Optimierungen erforderlich</div>
    <p class="assessment">${assessment?.reasoning || 'Der Vertrag erfüllt professionelle Standards und enthält alle notwendigen Klauseln.'}</p>
    ${assessment?.intentionalClauses?.length ? `
    <div class="clauses-list">
      <h3>Als beabsichtigt erkannte Klauseln:</h3>
      <ul>
        ${assessment.intentionalClauses.map(c => `<li>${c}</li>`).join('')}
      </ul>
    </div>
    ` : ''}
  </div>

  <div class="footer">
    Erstellt mit Contract AI - KI-gestützte Vertragsanalyse
  </div>
</body>
</html>`;
        } else {
          // Standard PDF mit Optimierungen
          htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Vertragsanalyse - ${fileName}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
    h1 { color: #1D1D1F; border-bottom: 2px solid #007AFF; padding-bottom: 10px; }
    h2 { color: #333; margin-top: 30px; }
    .opt-card { background: #f5f5f7; border-radius: 12px; padding: 20px; margin: 15px 0; }
    .opt-header { display: flex; justify-content: space-between; margin-bottom: 10px; }
    .opt-category { font-weight: bold; color: #007AFF; text-transform: uppercase; font-size: 12px; }
    .opt-priority { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
    .critical { background: #FFE5E5; color: #D00; }
    .high { background: #FFF3E5; color: #E65100; }
    .medium { background: #E5F3FF; color: #0066CC; }
    .low { background: #E5FFE5; color: #006600; }
    .original { background: #FFE5E5; padding: 10px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #D00; }
    .improved { background: #E5FFE5; padding: 10px; border-radius: 6px; margin: 10px 0; border-left: 4px solid #0A0; }
    .label { font-weight: bold; font-size: 12px; color: #666; margin-bottom: 5px; }
    .reasoning { color: #555; font-style: italic; margin-top: 10px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <h1>🔍 Vertragsanalyse</h1>
  <p><strong>Dokument:</strong> ${fileName}</p>
  <p><strong>Datum:</strong> ${new Date().toLocaleDateString('de-DE')}</p>
  <p><strong>Gefundene Optimierungen:</strong> ${optimizations.length}</p>

  <h2>Optimierungsvorschläge</h2>
  ${optimizations.map((opt) => `
    <div class="opt-card">
      <div class="opt-header">
        <span class="opt-category">${opt.category}</span>
        <span class="opt-priority ${opt.priority}">${opt.priority.toUpperCase()}</span>
      </div>
      <div class="label">❌ Original (Problematisch):</div>
      <div class="original">${opt.original}</div>
      <div class="label">✅ Verbessert:</div>
      <div class="improved">${opt.improved}</div>
      <div class="reasoning">💡 ${opt.reasoning}</div>
    </div>
  `).join('')}

  <div class="footer">
    Erstellt mit Contract AI - KI-gestützte Vertragsoptimierung
  </div>
</body>
</html>`;
        }

        // Öffne in neuem Tab zum Drucken als PDF
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(htmlContent);
          printWindow.document.close();
          printWindow.print();
          showToast(`✅ PDF wird erstellt - bitte als PDF speichern`, 'success');
        }
      } catch (err) {
        console.error('PDF Export Fehler:', err);
        showToast(`❌ PDF Export fehlgeschlagen`, 'error');
      }
      return;
    }

    // DOCX Export (Word mit Kommentaren)
    if (format === 'docx' || format === 'DOCX') {
      try {
        let rtfContent = '';

        if (isPerfectContract) {
          // Perfect Contract RTF
          rtfContent = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}}
{\\colortbl;\\red0\\green0\\blue0;\\red52\\green199\\blue89;\\red0\\green128\\blue0;\\red102\\green102\\blue102;}
\\f0\\fs24

{\\b\\fs32 Vertragsanalyse - ${fileName}}\\par
\\par
{\\b Datum:} ${new Date().toLocaleDateString('de-DE')}\\par
{\\b Score:} ${score}/100 Punkte\\par
\\par
\\line
\\par
{\\cf2\\b\\fs28 \\u10003 Professioneller Vertrag}\\par
\\par
{\\b Keine Optimierungen erforderlich}\\par
\\par
${assessment?.reasoning?.replace(/\n/g, '\\par ') || 'Der Vertrag erf\\u252llt professionelle Standards.'}\\par
\\par
${assessment?.intentionalClauses?.length ? `{\\b Als beabsichtigt erkannte Klauseln:}\\par
${assessment.intentionalClauses.map(c => `\\u8226  ${c}`).join('\\par ')}\\par` : ''}
\\par
\\line
\\par
{\\cf4\\fs18 Erstellt mit Contract AI - KI-gest\\u252tzte Vertragsanalyse}
}`;
        } else {
          // Standard RTF mit Optimierungen
          rtfContent = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}}
{\\colortbl;\\red0\\green0\\blue0;\\red255\\green0\\blue0;\\red0\\green128\\blue0;\\red0\\green102\\blue204;}
\\f0\\fs24

{\\b\\fs32 Vertragsanalyse - ${fileName}}\\par
\\par
{\\b Datum:} ${new Date().toLocaleDateString('de-DE')}\\par
{\\b Optimierungen:} ${optimizations.length}\\par
\\par
{\\b\\fs28 Optimierungsvorschl\\u228ge}\\par
\\par
`;

          optimizations.forEach((opt, index) => {
            rtfContent += `{\\b ${index + 1}. ${opt.category.toUpperCase()}} [${opt.priority}]\\par
\\par
{\\cf2\\b Original (Problematisch):}\\par
${opt.original.replace(/\n/g, '\\par ')}\\par
\\par
{\\cf3\\b Verbesserung:}\\par
${opt.improved.replace(/\n/g, '\\par ')}\\par
\\par
{\\i ${opt.reasoning}}\\par
\\par
\\line
\\par
`;
          });

          rtfContent += `}`;
        }

        const blob = new Blob([rtfContent], { type: 'application/rtf' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}_${dateStr}.rtf`;
        link.click();
        showToast(`✅ Word-Dokument exportiert (RTF Format)`, 'success');
      } catch (err) {
        console.error('DOCX Export Fehler:', err);
        showToast(`❌ Word Export fehlgeschlagen`, 'error');
      }
      return;
    }

    // XLSX Export (Excel Vergleichstabelle)
    if (format === 'xlsx' || format === 'XLSX') {
      try {
        // Erstelle CSV (Excel-kompatibel)
        const headers = ['Nr.', 'Kategorie', 'Priorität', 'Original', 'Verbessert', 'Begründung', 'Risiko', 'Impact'];
        const rows = optimizations.map((opt, index) => [
          index + 1,
          opt.category,
          opt.priority,
          `"${opt.original.replace(/"/g, '""')}"`,
          `"${opt.improved.replace(/"/g, '""')}"`,
          `"${opt.reasoning.replace(/"/g, '""')}"`,
          opt.legalRisk,
          opt.businessImpact
        ]);

        const csvContent = [
          headers.join(';'),
          ...rows.map(row => row.join(';'))
        ].join('\n');

        // BOM für Excel UTF-8 Erkennung
        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${fileName}_${dateStr}.csv`;
        link.click();
        showToast(`✅ Excel-Tabelle exportiert (CSV Format)`, 'success');
      } catch (err) {
        console.error('XLSX Export Fehler:', err);
        showToast(`❌ Excel Export fehlgeschlagen`, 'error');
      }
      return;
    }

    // Fallback: TXT
    showToast(`⚠️ Format nicht unterstützt, exportiere als TXT`, 'info');
    handleExport('txt');
  }, [optimizations, file, showToast]);

  // 🚀 REVOLUTIONARY: Dynamic Categories with Performance Optimization
  const dynamicCategories = useMemo(() => {
    const cats = [
      {
        id: 'all',
        name: 'Alle Optimierungen',
        icon: '📋',
        count: optimizations.length
      }
    ];

    // ALWAYS use actual opt.category values from optimizations
    const categoryMap = new Map<string, number>();
    optimizations.forEach(opt => {
      categoryMap.set(opt.category, (categoryMap.get(opt.category) || 0) + 1);
    });

    const categoryConfig = {
      'termination': { name: 'Kündigung & Laufzeit', icon: '⏱️' },
      'liability': { name: 'Haftung & Risiko', icon: '⚖️' },
      'payment': { name: 'Vergütung & Zahlung', icon: '💰' },
      'clarity': { name: 'Klarheit & Präzision', icon: '✍️' },
      'compliance': { name: 'Compliance & DSGVO', icon: '🔒' }
    };

    categoryMap.forEach((count, cat) => {
      const config = categoryConfig[cat as keyof typeof categoryConfig];
      cats.push({
        id: cat,
        name: config?.name || cat,
        icon: config?.icon || '📄',
        count
      });
    });

    return cats;
  }, [optimizations]);

  // ✅ ORIGINAL: Filter optimizations with Memoization
  const filteredOptimizations = useMemo(() => {
    let filtered = selectedCategory === 'all'
      ? optimizations
      : optimizations.filter(opt => opt.category === selectedCategory);

    // 🎯 PHASE 1 - FEATURE 2: Quick Wins zuerst sortieren
    if (showQuickWinsFirst) {
      const difficultyOrder = { 'easy': 0, 'medium': 1, 'complex': 2 };
      filtered = [...filtered].sort((a, b) => {
        const orderA = difficultyOrder[a.implementationDifficulty as keyof typeof difficultyOrder] ?? 3;
        const orderB = difficultyOrder[b.implementationDifficulty as keyof typeof difficultyOrder] ?? 3;
        return orderA - orderB;
      });
    }

    return filtered;
  }, [optimizations, selectedCategory, showQuickWinsFirst]);

  // 🚀 SIMPLIFIED: Statistics
  const statistics = useMemo(() => {
    if (!optimizationResult?.summary && optimizations.length === 0) return null;
    
    const totalIssues = optimizationResult?.summary?.totalIssues || optimizations.length;
    const selectedCount = selectedOptimizations.size;
    
    const avgRisk = optimizations.reduce((sum, opt) => sum + opt.legalRisk, 0) / (optimizations.length || 1);
    const avgImpact = optimizations.reduce((sum, opt) => sum + opt.businessImpact, 0) / (optimizations.length || 1);
    const avgConfidence = optimizations.reduce((sum, opt) => sum + opt.confidence, 0) / (optimizations.length || 1);
    
    return {
      totalIssues,
      selectedCount,
      avgRisk: Math.round(avgRisk),
      avgImpact: Math.round(avgImpact),
      avgConfidence: Math.round(avgConfidence),
      criticalCount: optimizations.filter(o => o.priority === 'critical').length,
      highCount: optimizations.filter(o => o.priority === 'high').length,
      mediumCount: optimizations.filter(o => o.priority === 'medium').length,
      lowCount: optimizations.filter(o => o.priority === 'low').length
    };
  }, [optimizations, optimizationResult, selectedOptimizations]);

  // ✅ ORIGINAL: Export Options
  const exportOptions: ExportOption[] = [
    {
      id: 'pdf_marked',
      name: 'PDF mit Markierungen',
      icon: <FileDown size={16} />,
      description: 'Rot=Probleme, Grün=Lösungen',
      format: 'PDF',
      premium: true
    },
    {
      id: 'word_comments',
      name: 'Word mit Kommentaren',
      icon: <FileText size={16} />,
      description: 'Änderungsvorschläge als Kommentare',
      format: 'DOCX',
      premium: true
    },
    {
      id: 'excel_comparison',
      name: 'Excel-Vergleichstabelle',
      icon: <Download size={16} />,
      description: 'Vorher/Nachher Analyse',
      format: 'XLSX',
      premium: true
    },
    {
      id: 'email_template',
      name: 'E-Mail-Vorlage',
      icon: <Mail size={16} />,
      description: 'Copy-Paste ready Pitch',
      format: 'TXT'
    }
  ];

  // ✅ ORIGINAL: Pitch Styles
  const pitchStyles: PitchStyle[] = [
    {
      id: 'lawyer',
      name: 'Rechtlich',
      icon: <Building2 size={16} />,
      description: 'Juristische Präzision',
      target: 'lawyer'
    },
    {
      id: 'business',
      name: 'Business',
      icon: <Users size={16} />,
      description: 'Professionell',
      target: 'business'
    },
    {
      id: 'private',
      name: 'Privat',
      icon: <User size={16} />,
      description: 'Verständlich',
      target: 'private'
    }
  ];

  // Loading state
  if (isPremium === null) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Initialisiere KI...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Welcome Popup */}
      <WelcomePopup
        featureId="optimizer"
        icon={<Sparkles size={32} />}
        title="Willkommen beim Optimizer"
        description="Laden Sie einen Vertrag hoch und lassen Sie die KI Optimierungsvorschläge generieren. Sie erhalten konkrete Verbesserungen mit Begründungen."
        tip="Wählen Sie Ihre Perspektive (Neutral, Ersteller, Empfänger) für maßgeschneiderte Optimierungen."
      />

      {/* Full-Width Premium Banner - außerhalb des Containers */}
      {!isPremium && (
        <UnifiedPremiumNotice
          featureName="Der Vertragsoptimierer"
          variant="fullWidth"
        />
      )}

      <div className={styles.optimizer}>
        <motion.div
          className={styles.container}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          style={{
            maxWidth: highlightedText ? 'none' : undefined,
            margin: highlightedText ? '0' : undefined,
            padding: highlightedText ? '48px 0 48px 0' : undefined
          }}
          onClick={(e) => {
            // Nur schließen wenn direkt auf den Container geklickt wurde (nicht auf Buttons/Cards)
            if (highlightedText && e.target === e.currentTarget) {
              setHighlightedText(null);
            }
          }}
        >
          {/* Header */}
          <PageHeader
            icon={Sparkles}
            title="KI-Vertragsoptimierung"
            subtitle="Automatische Verbesserungsvorschläge für deine Verträge"
            iconColor="purple"
            features={[
              { text: 'Risiko-Erkennung', icon: Shield },
              { text: 'Klausel-Vorschläge', icon: Lightbulb },
              { text: 'PDF-Export', icon: Download }
            ]}
            actions={optimizations.length > 0 ? [{
              label: 'Neue Analyse',
              icon: RefreshCw,
              onClick: handleReset,
              variant: 'secondary'
            }] : undefined}
          />

          {/* Preloaded Contract Indicator */}
          {preloadedContractName && (
            <motion.div
              style={{
                background: 'rgba(0, 113, 227, 0.1)',
                border: '1px solid rgba(0, 113, 227, 0.3)',
                borderRadius: '12px',
                padding: '1rem 1.5rem',
                marginBottom: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem'
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Lightbulb size={20} style={{ color: '#0071e3', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#0071e3' }}>Vertrag vorgeladen:</strong>
                <span style={{ color: '#1d1d1f', marginLeft: '0.5rem' }}>{preloadedContractName}</span>
              </div>
            </motion.div>
          )}

          {/* 🆕 Legal Pulse Context Display */}
          {legalPulseContext && (
            <motion.div
              style={{
                background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                borderRadius: '16px',
                padding: '2rem',
                marginBottom: '2rem',
                color: 'white',
                boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)'
              }}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <Zap size={28} style={{ color: '#fbbf24' }} />
                <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>
                  Legal Pulse Erkenntnisse
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Risk Score */}
                {legalPulseContext.riskScore !== null && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>Risiko-Score</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                      {legalPulseContext.riskScore}/100
                    </div>
                  </div>
                )}

                {/* Compliance Score */}
                {legalPulseContext.complianceScore !== null && (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.15)',
                    borderRadius: '12px',
                    padding: '1.25rem',
                    backdropFilter: 'blur(10px)'
                  }}>
                    <div style={{ fontSize: '0.9rem', opacity: 0.9, marginBottom: '0.5rem' }}>Compliance-Score</div>
                    <div style={{ fontSize: '2rem', fontWeight: 700 }}>
                      {legalPulseContext.complianceScore}/100
                    </div>
                  </div>
                )}
              </div>

              {/* Risks */}
              {legalPulseContext.risks && legalPulseContext.risks.length > 0 && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    fontSize: '1.1rem',
                    fontWeight: 600
                  }}>
                    <AlertTriangle size={20} />
                    Identifizierte Risiken ({legalPulseContext.risks.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {legalPulseContext.risks.slice(0, 3).map((risk, index) => {
                      // Handle both object and string formats
                      const riskText = typeof risk === 'object'
                        ? risk.title || risk.description || JSON.stringify(risk)
                        : risk;

                      return (
                        <div
                          key={index}
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '0.875rem 1rem',
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                            borderLeft: '3px solid #fbbf24'
                          }}
                        >
                          {typeof risk === 'object' && risk.title ? (
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{risk.title}</div>
                              {risk.description && <div style={{ opacity: 0.9 }}>{risk.description}</div>}
                              {risk.severity && (
                                <div style={{
                                  marginTop: '0.5rem',
                                  fontSize: '0.85rem',
                                  opacity: 0.8,
                                  textTransform: 'capitalize'
                                }}>
                                  Schweregrad: {risk.severity}
                                </div>
                              )}
                            </div>
                          ) : (
                            riskText
                          )}
                        </div>
                      );
                    })}
                    {legalPulseContext.risks.length > 3 && (
                      <div style={{ fontSize: '0.9rem', opacity: 0.8, fontStyle: 'italic' }}>
                        +{legalPulseContext.risks.length - 3} weitere Risiken
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {legalPulseContext.recommendations && legalPulseContext.recommendations.length > 0 && (
                <div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '1rem',
                    fontSize: '1.1rem',
                    fontWeight: 600
                  }}>
                    <CheckCircle2 size={20} />
                    Empfohlene Maßnahmen ({legalPulseContext.recommendations.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {legalPulseContext.recommendations.slice(0, 3).map((recommendation, index) => {
                      // Handle both object and string formats
                      const recommendationText = typeof recommendation === 'object'
                        ? recommendation.title || recommendation.description || JSON.stringify(recommendation)
                        : recommendation;

                      return (
                        <div
                          key={index}
                          style={{
                            background: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '8px',
                            padding: '0.875rem 1rem',
                            fontSize: '0.95rem',
                            lineHeight: '1.5',
                            borderLeft: '3px solid #10b981'
                          }}
                        >
                          {typeof recommendation === 'object' && recommendation.title ? (
                            <div>
                              <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{recommendation.title}</div>
                              {recommendation.description && <div style={{ opacity: 0.9 }}>{recommendation.description}</div>}
                              {recommendation.priority && (
                                <div style={{
                                  marginTop: '0.5rem',
                                  fontSize: '0.85rem',
                                  opacity: 0.8,
                                  textTransform: 'capitalize'
                                }}>
                                  Priorität: {recommendation.priority}
                                </div>
                              )}
                            </div>
                          ) : (
                            recommendationText
                          )}
                        </div>
                      );
                    })}
                    {legalPulseContext.recommendations.length > 3 && (
                      <div style={{ fontSize: '0.9rem', opacity: 0.8, fontStyle: 'italic' }}>
                        +{legalPulseContext.recommendations.length - 3} weitere Empfehlungen
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div style={{
                marginTop: '1.5rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem'
              }}>
                <Lightbulb size={18} style={{ flexShrink: 0 }} />
                <span>
                  Diese Erkenntnisse aus Legal Pulse werden in die Optimierung einbezogen und helfen dabei,
                  gezielt die kritischsten Bereiche zu verbessern.
                </span>
              </div>
            </motion.div>
          )}

          {/* Upload Area - Enterprise Design v2.0 */}
          <motion.div
            className={styles.uploadContainer}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              className={`${styles.uploadAreaEnhanced} ${dragActive ? styles.dragActive : ''} ${!isPremium ? styles.disabled : ''} ${file ? styles.hasFile : ''} ${error ? styles.hasError : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={isPremium && !file ? () => fileInputRef.current?.click() : undefined}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept=".pdf,.docx"
                disabled={!isPremium}
                onChange={handleFileChange}
              />

              {file ? (
                <motion.div
                  className={styles.fileInfoEnhanced}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className={styles.fileIconEnhanced}>
                    <FileText />
                  </div>
                  <div className={styles.fileDetailsEnhanced}>
                    <div className={styles.fileNameEnhanced}>
                      {file.name}
                      <span className={styles.successBadge}>
                        <CheckCircle size={10} />
                        Bereit
                      </span>
                    </div>
                    <div className={styles.fileMetaEnhanced}>
                      <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span>•</span>
                      <span>PDF-Dokument</span>
                    </div>
                  </div>
                  <div className={styles.fileActionsEnhanced}>
                    <button
                      className={`${styles.fileActionBtn} ${styles.danger}`}
                      onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      title="Datei entfernen"
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                </motion.div>
              ) : (
                <motion.div className={styles.uploadPromptEnhanced}>
                  <motion.div
                    className={styles.uploadIconEnhanced}
                    animate={{ y: [0, -8, 0] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                  >
                    <Upload />
                  </motion.div>
                  <h3 className={styles.uploadTitleEnhanced}>Vertrag hochladen</h3>
                  <p className={styles.uploadSubtitleEnhanced}>
                    Ziehe deine PDF-Datei hierher oder klicke zum Auswählen
                  </p>
                  <div className={styles.uploadHint}>
                    <Lock size={14} />
                    <span>Sichere Übertragung • Max. 10 MB</span>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* 📸 Dokument scannen Button */}
            {!file && (
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <button
                  onClick={openScanner}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "8px 16px",
                    borderRadius: "8px",
                    border: "1px solid rgba(99, 102, 241, 0.3)",
                    background: "rgba(99, 102, 241, 0.1)",
                    color: "#818cf8",
                    fontSize: "14px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <Camera size={16} />
                  Dokument scannen
                </button>
              </div>
            )}

            {/* Validation Message */}
            <AnimatePresence>
              {error && (
                <motion.div
                  className={`${styles.validationMessage} ${styles.error}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* File Size Indicator */}
            {file && (
              <motion.div
                className={`${styles.fileSizeIndicator} ${
                  file.size > 8 * 1024 * 1024 ? styles.warning : ''
                } ${file.size > 10 * 1024 * 1024 ? styles.error : ''}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <span>{(file.size / 1024 / 1024).toFixed(2)} / 10 MB</span>
                <div className={styles.fileSizeBar}>
                  <div
                    className={`${styles.fileSizeBarFill} ${
                      file.size > 8 * 1024 * 1024 ? styles.warning : ''
                    } ${file.size > 10 * 1024 * 1024 ? styles.error : ''}`}
                    style={{ width: `${Math.min((file.size / (10 * 1024 * 1024)) * 100, 100)}%` }}
                  />
                </div>
              </motion.div>
            )}

            {/* 🆕 Perspektiven-Auswahl - nur vor der Analyse zeigen */}
            {file && optimizations.length === 0 && !optimizationResult && (
              <motion.div
                className={styles.perspectiveSelector}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className={styles.perspectiveLabel}>
                  <Users size={16} />
                  <span>Optimierung aus Sicht von:</span>
                </div>
                <div className={styles.perspectiveOptions}>
                  <button
                    type="button"
                    className={`${styles.perspectiveOption} ${perspective === 'neutral' ? styles.active : ''}`}
                    onClick={() => setPerspective('neutral')}
                  >
                    <Shield size={16} />
                    <span>Neutral</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.perspectiveOption} ${perspective === 'creator' ? styles.active : ''}`}
                    onClick={() => setPerspective('creator')}
                  >
                    <Building2 size={16} />
                    <span>Ersteller</span>
                  </button>
                  <button
                    type="button"
                    className={`${styles.perspectiveOption} ${perspective === 'recipient' ? styles.active : ''}`}
                    onClick={() => setPerspective('recipient')}
                  >
                    <User size={16} />
                    <span>Empfänger</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Action Buttons - Enhanced - NUR anzeigen wenn noch keine Ergebnisse */}
            {optimizations.length === 0 && !optimizationResult && (
              <motion.div className={styles.actionButtonsEnhanced}>
                <motion.button
                  onClick={handleUpload}
                  disabled={!file || loading || !isPremium}
                  className={`${styles.analyzeBtn} ${loading ? styles.loading : ''}`}
                  whileHover={file && isPremium && !loading ? { scale: 1.02 } : undefined}
                  whileTap={file && isPremium && !loading ? { scale: 0.98 } : undefined}
                >
                  {loading ? (
                    <>
                      <div className={styles.spinnerEnhanced}></div>
                      <span>Analysiere...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      <span>Jetzt analysieren</span>
                    </>
                  )}
                </motion.button>
              </motion.div>
            )}

            {/* 🆕 CTA: View Optimized Contracts */}
            {!file && !isAnalyzing && optimizations.length === 0 && isPremium && (
              <motion.div
                className={styles.ctaSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <motion.button
                  className={styles.ctaButton}
                  onClick={() => {
                    // Navigate to Contracts page and set filter to 'optimized'
                    navigate('/contracts', { state: { sourceFilter: 'optimized' } });
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <FolderOpen size={20} />
                  <span>Alle optimierten Verträge anzeigen</span>
                </motion.button>
                <p className={styles.ctaHint}>
                  Bereits optimierte Verträge in Ihrer Verwaltung anzeigen
                </p>
              </motion.div>
            )}
          </motion.div>

          {/* 🎨 Premium Analysis Progress - Apple/Microsoft Level */}
          {isAnalyzing && (
            <AnalysisProgressComponent
              progress={mapLegacyToProgress({
                progress: analysisProgress,
                stage: undefined // Will be auto-detected from progress percentage
              })}
            />
          )}

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                className={styles.errorMessage}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AlertCircle size={24} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Celebration - Enterprise v2.0 */}
          <AnimatePresence>
            {showSuccessCelebration && (
              <motion.div
                className={styles.successCelebration}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.successContent}>
                  <div className={styles.successIconWrapper}>
                    <div className={styles.successCircle}>
                      <CheckCircle size={56} />
                    </div>
                    <div className={styles.successRing} />
                    <div className={styles.successParticles}>
                      {[...Array(8)].map((_, i) => (
                        <div key={i} className={styles.successParticle} />
                      ))}
                    </div>
                  </div>
                  <h2 className={styles.successTitle}>Analyse abgeschlossen!</h2>
                  <p className={styles.successSubtitle}>
                    {optimizations.length} Optimierungsmöglichkeiten gefunden
                  </p>
                  <div className={styles.successStats}>
                    <div className={styles.successStat}>
                      <div className={styles.successStatValue}>{contractScore?.overall || 0}</div>
                      <div className={styles.successStatLabel}>Gesamt-Score</div>
                    </div>
                    <div className={styles.successStat}>
                      <div className={styles.successStatValue}>{optimizations.filter(o => o.priority === 'critical').length}</div>
                      <div className={styles.successStatLabel}>Kritische Punkte</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toast - Bottom Right Corner */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, x: 100, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 100, scale: 0.9 }}
                style={{
                  position: 'fixed',
                  bottom: '24px',
                  right: '24px',
                  zIndex: 1000000,
                  background: toast.type === 'success'
                    ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.95) 0%, rgba(46, 177, 80, 0.95) 100%)'
                    : toast.type === 'error'
                    ? 'linear-gradient(135deg, rgba(255, 59, 48, 0.95) 0%, rgba(229, 48, 42, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(0, 122, 255, 0.95) 0%, rgba(0, 81, 213, 0.95) 100%)',
                  color: 'white',
                  padding: '1rem 1.5rem',
                  borderRadius: '14px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25)',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  maxWidth: '400px'
                }}
              >
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'} {toast.message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Section - 🆕 v2.0: Auch bei 0 Optimierungen zeigen (Perfect Contract UI) */}
          <AnimatePresence>
            {(optimizations.length > 0 || (contractScore && optimizationResult)) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{
                  marginRight: highlightedText ? '50%' : '0',
                  maxWidth: highlightedText ? 'none' : '1400px',
                  marginLeft: highlightedText ? '0' : 'auto',
                  paddingLeft: highlightedText ? '20px' : '0',
                  paddingRight: highlightedText ? '0' : '0',
                  transition: 'all 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)'
                }}
              >
                
                {/* Contract Type Card - Simplified */}
                {optimizationResult?.meta && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: '16px',
                      padding: '20px 24px',
                      marginBottom: '16px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}
                  >
                    <div
                      style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: `${CONTRACT_TYPE_INFO[optimizationResult.meta.type as keyof typeof CONTRACT_TYPE_INFO]?.color || '#007AFF'}15`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '24px',
                        flexShrink: 0
                      }}
                    >
                      {CONTRACT_TYPE_INFO[optimizationResult.meta.type as keyof typeof CONTRACT_TYPE_INFO]?.icon}
                    </div>
                    <h3
                      style={{
                        fontSize: '17px',
                        fontWeight: 600,
                        color: '#1D1D1F',
                        margin: 0,
                        letterSpacing: '-0.01em'
                      }}
                    >
                      {CONTRACT_TYPE_INFO[optimizationResult.meta.type as keyof typeof CONTRACT_TYPE_INFO]?.name || 'Vertrag'} erkannt
                    </h3>
                  </motion.div>
                )}

                {/* 🚀 NEW: Modern Results Dashboard v2.0 - Auch bei 0 Optimierungen! */}
                {useModernDashboard && contractScore ? (
                  <ResultsDashboard
                    optimizations={optimizations}
                    contractScore={contractScore}
                    fileName={file?.name || preloadedContractName || 'Vertrag'}
                    onGenerateContract={openGenerateModal}
                    onExplainClick={(opt) => setExplanationPopup({ show: true, optimization: opt })}
                    onShowInContract={(text) => setHighlightedText(text)}
                    onGeneratePitch={(style) => generatePitch(style)}
                    onExport={(format) => handleExport(format)}
                    isGenerating={isGeneratingContract}
                    isPremium={isPremium}
                    // 🆕 v2.0: Decision-First Props
                    assessment={optimizationResult?.assessment}
                    contractMaturity={optimizationResult?.meta?.maturity}
                    recognizedAs={optimizationResult?.meta?.recognizedAs}
                    onNewAnalysis={handleReset}
                    // 🆕 Phase 3c: Document Scope für Explainability
                    documentScope={optimizationResult?.meta?.documentScope}
                    // 🆕 Phase 4: Legal Integrity Check
                    legalIntegrity={optimizationResult?.legalIntegrity}
                  />
                ) : (
                  <>
                    {/* Contract Health Dashboard (Legacy) */}
                    {contractScore && (
                      <ContractHealthDashboard
                        score={contractScore}
                        showSimulation={false}
                        newScore={contractScore.overall}
                      />
                    )}
                  </>
                )}

                {/* Statistics Dashboard - Premium Design (Legacy - nur wenn nicht Modern Dashboard) */}
                {!useModernDashboard && statistics && showStatistics && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.1 }}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: '16px',
                      padding: '32px',
                      marginBottom: '16px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1D1D1F', display: 'flex', alignItems: 'center', gap: '8px', letterSpacing: '-0.01em' }}>
                        <BarChart3 className="w-5 h-5" style={{ color: '#007AFF' }} />
                        Analyse-Dashboard
                      </h3>
                      <button
                        onClick={() => setShowStatistics(false)}
                        style={{
                          color: '#86868B',
                          background: 'transparent',
                          border: 'none',
                          padding: '6px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#F5F5F7';
                          e.currentTarget.style.color = '#1D1D1F';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                          e.currentTarget.style.color = '#86868B';
                        }}
                      >
                        <Minimize2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                      {[
                        { label: 'Kritisch', count: statistics.criticalCount, color: '#FF3B30' },
                        { label: 'Hoch', count: statistics.highCount, color: '#FF9500' },
                        { label: 'Mittel', count: statistics.mediumCount, color: '#FFCC00' },
                        { label: 'Niedrig', count: statistics.lowCount, color: '#34C759' }
                      ].map((item, idx) => (
                        <motion.div
                          key={item.label}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.15 + idx * 0.05 }}
                          whileHover={{ scale: 1.03 }}
                          onClick={() => setSelectedCategory('all')}
                          style={{
                            textAlign: 'center',
                            padding: '20px 16px',
                            borderRadius: '12px',
                            background: '#F5F5F7',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#E8E8ED';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#F5F5F7';
                          }}
                        >
                          <div style={{ fontSize: '32px', fontWeight: 700, color: item.color, lineHeight: 1, marginBottom: '8px', letterSpacing: '-0.02em' }}>
                            {item.count}
                          </div>
                          <div style={{ fontSize: '13px', color: '#86868B', fontWeight: 500 }}>
                            {item.label}
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                      <div style={{ textAlign: 'center', padding: '16px', borderRadius: '10px', background: '#F5F5F7' }}>
                        <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '6px', fontWeight: 500 }}>Ø Risiko</div>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: statistics.avgRisk >= 7 ? '#FF3B30' : statistics.avgRisk >= 5 ? '#FF9500' : '#34C759', letterSpacing: '-0.02em' }}>
                          {statistics.avgRisk}<span style={{ fontSize: '14px', fontWeight: 500, color: '#86868B' }}>/10</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '16px', borderRadius: '10px', background: '#F5F5F7' }}>
                        <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '6px', fontWeight: 500 }}>Ø Impact</div>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: '#007AFF', letterSpacing: '-0.02em' }}>
                          {statistics.avgImpact}<span style={{ fontSize: '14px', fontWeight: 500, color: '#86868B' }}>/10</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'center', padding: '16px', borderRadius: '10px', background: '#F5F5F7' }}>
                        <div style={{ fontSize: '12px', color: '#86868B', marginBottom: '6px', fontWeight: 500 }}>KI-Konfidenz</div>
                        <div style={{ fontSize: '22px', fontWeight: 700, color: statistics.avgConfidence >= 85 ? '#34C759' : statistics.avgConfidence >= 70 ? '#FF9500' : '#FF3B30', letterSpacing: '-0.02em' }}>
                          {statistics.avgConfidence}<span style={{ fontSize: '14px', fontWeight: 500, color: '#86868B' }}>%</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* MAIN ACTION - Premium CTA (Legacy) */}
                {!useModernDashboard && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '16px',
                    padding: '48px 32px',
                    marginBottom: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    textAlign: 'center'
                  }}
                >
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.3 }}
                    style={{
                      fontSize: '48px',
                      marginBottom: '16px'
                    }}
                  >
                    ✨
                  </motion.div>
                  <h3
                    style={{
                      fontSize: '28px',
                      fontWeight: 700,
                      color: '#1D1D1F',
                      marginBottom: '12px',
                      letterSpacing: '-0.02em'
                    }}
                  >
                    Dein Vertrag wurde analysiert
                  </h3>
                  <p
                    style={{
                      fontSize: '16px',
                      color: '#86868B',
                      marginBottom: '32px',
                      maxWidth: '600px',
                      margin: '0 auto 32px'
                    }}
                  >
                    <strong style={{ color: '#1D1D1F' }}>{optimizations.length} Optimierungen</strong> identifiziert – Erstelle jetzt deinen rechtssicheren Vertrag
                  </p>

                  <button
                    onClick={openGenerateModal}
                    disabled={isGeneratingContract || !file || optimizations.length === 0}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      padding: '18px 40px',
                      borderRadius: '12px',
                      fontSize: '17px',
                      fontWeight: 600,
                      background: isGeneratingContract || !file || optimizations.length === 0
                        ? '#C7C7CC'
                        : 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                      color: 'white',
                      border: 'none',
                      cursor: isGeneratingContract || !file || optimizations.length === 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isGeneratingContract || !file || optimizations.length === 0
                        ? 'none'
                        : '0 4px 16px rgba(0, 122, 255, 0.3)',
                      letterSpacing: '-0.01em'
                    }}
                    onMouseEnter={(e) => {
                      if (!isGeneratingContract && file && optimizations.length > 0) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 20px rgba(0, 122, 255, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = isGeneratingContract || !file || optimizations.length === 0
                        ? 'none'
                        : '0 4px 16px rgba(0, 122, 255, 0.3)';
                    }}
                  >
                    {isGeneratingContract ? (
                      <>
                        <div className={styles.spinner}></div>
                        Dein Vertrag wird verbessert...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-6 h-6" />
                        Optimierten Vertrag generieren
                      </>
                    )}
                  </button>

                  {showAdvancedView && (
                    <p style={{ fontSize: '13px', color: '#86868B', marginTop: '16px' }}>
                      {selectedOptimizations.size > 0
                        ? `${selectedOptimizations.size} von ${optimizations.length} ausgewählt`
                        : 'Alle Optimierungen werden angewendet'}
                    </p>
                  )}
                </motion.div>
                )}

                {/* Category Filter - Premium Design (Legacy) */}
                {!useModernDashboard && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.2 }}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '16px',
                    padding: '24px',
                    marginBottom: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
                    <Filter size={20} style={{ color: '#007AFF' }} />
                    <h3 style={{
                      fontSize: '17px',
                      fontWeight: 600,
                      color: '#1D1D1F',
                      margin: 0,
                      letterSpacing: '-0.01em',
                      flex: 1
                    }}>
                      Dynamische Kategorien
                    </h3>
                    <span style={{ fontSize: '14px', color: '#86868B', fontWeight: 500 }}>
                      {filteredOptimizations.length} Optimierungen
                    </span>
                  </div>

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px'
                  }}>
                    {dynamicCategories.map((category, idx) => {
                      const isActive = selectedCategory === category.id;
                      return (
                        <motion.button
                          key={category.id}
                          onClick={() => setSelectedCategory(category.id)}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.25 + idx * 0.04, duration: 0.2 }}
                          whileHover={{ scale: 1.03 }}
                          whileTap={{ scale: 0.97 }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            borderRadius: '12px',
                            border: isActive ? '1.5px solid #007AFF' : '1px solid rgba(0, 0, 0, 0.1)',
                            background: isActive ? 'rgba(0, 122, 255, 0.08)' : '#FFFFFF',
                            color: isActive ? '#007AFF' : '#1D1D1F',
                            fontSize: '14px',
                            fontWeight: isActive ? 600 : 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            letterSpacing: '-0.01em',
                            boxShadow: isActive ? '0 2px 8px rgba(0, 122, 255, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.04)'
                          }}
                        >
                          <span style={{ fontSize: '18px' }}>{category.icon}</span>
                          <span>{category.name}</span>
                          <span style={{
                            padding: '3px 9px',
                            borderRadius: '10px',
                            background: isActive ? '#007AFF' : '#F5F5F7',
                            color: isActive ? '#FFFFFF' : '#86868B',
                            fontSize: '12px',
                            fontWeight: 700,
                            minWidth: '22px',
                            textAlign: 'center',
                            lineHeight: '1'
                          }}>
                            {category.count}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
                )}

                {/* Control Panel - Premium Design (Legacy) */}
                {!useModernDashboard && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1], delay: 0.25 }}
                  style={{
                    background: '#FFFFFF',
                    border: '1px solid rgba(0, 0, 0, 0.08)',
                    borderRadius: '16px',
                    padding: '20px 24px',
                    marginBottom: '16px',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    alignItems: 'center'
                  }}
                >
                  {/* Checkbox-Modus Toggle */}
                  <motion.button
                    onClick={() => setShowAdvancedView(!showAdvancedView)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      border: showAdvancedView ? '1.5px solid #007AFF' : '1px solid rgba(0, 0, 0, 0.1)',
                      background: showAdvancedView ? 'rgba(0, 122, 255, 0.08)' : '#FFFFFF',
                      color: showAdvancedView ? '#007AFF' : '#1D1D1F',
                      fontSize: '14px',
                      fontWeight: showAdvancedView ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      letterSpacing: '-0.01em',
                      boxShadow: showAdvancedView ? '0 2px 8px rgba(0, 122, 255, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {showAdvancedView ? 'Alle anwenden' : 'Nur ausgewählte'}
                  </motion.button>

                  <motion.button
                    onClick={() => setShowQuickWinsFirst(!showQuickWinsFirst)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 16px',
                      borderRadius: '12px',
                      border: showQuickWinsFirst ? '1.5px solid #007AFF' : '1px solid rgba(0, 0, 0, 0.1)',
                      background: showQuickWinsFirst ? '#007AFF' : '#FFFFFF',
                      color: showQuickWinsFirst ? '#FFFFFF' : '#1D1D1F',
                      fontSize: '14px',
                      fontWeight: showQuickWinsFirst ? 600 : 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                      letterSpacing: '-0.01em',
                      boxShadow: showQuickWinsFirst ? '0 2px 8px rgba(0, 122, 255, 0.25)' : '0 1px 3px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <Zap size={16} />
                    {showQuickWinsFirst ? '✅ Einfache zuerst' : 'Einfache zuerst'}
                  </motion.button>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <motion.button
                      ref={pitchButtonRef}
                      onClick={() => setShowPitchMenu(!showPitchMenu)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        background: '#FFFFFF',
                        color: '#1D1D1F',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        letterSpacing: '-0.01em',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                      }}
                    >
                      <Mail size={16} />
                      Pitch
                      {showPitchMenu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </motion.button>

                    <motion.button
                      ref={exportButtonRef}
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 16px',
                        borderRadius: '12px',
                        border: '1px solid rgba(0, 0, 0, 0.1)',
                        background: '#FFFFFF',
                        color: '#1D1D1F',
                        fontSize: '14px',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                        letterSpacing: '-0.01em',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)'
                      }}
                    >
                      <Download size={16} />
                      Export
                      {showExportMenu ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </motion.button>
                  </div>
                </motion.div>
                )}

                {/* Portal Dropdowns (Legacy - werden auch im Modern Mode benötigt für Export/Pitch) */}
                <DropdownPortal isOpen={showPitchMenu} targetRef={pitchButtonRef}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    data-portal-dropdown
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      minWidth: '280px',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
                    }}
                  >
                    <h5 style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#1D1D1F',
                      marginBottom: '12px',
                      letterSpacing: '-0.01em'
                    }}>
                      Pitch-Stil wählen:
                    </h5>
                    {pitchStyles.map(style => (
                      <motion.button
                        key={style.id}
                        onClick={() => generatePitch(style.id)}
                        whileHover={{ x: 4 }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          marginBottom: '8px',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          background: '#F5F5F7',
                          border: '1px solid transparent',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span style={{ fontSize: '20px' }}>{style.icon}</span>
                        <div style={{ textAlign: 'left', flex: 1 }}>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: '#1D1D1F', marginBottom: '2px' }}>
                            {style.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#86868B' }}>
                            {style.description}
                          </div>
                        </div>
                        <ArrowRight size={16} style={{ color: '#86868B', marginLeft: 'auto' }} />
                      </motion.button>
                    ))}
                  </motion.div>
                </DropdownPortal>

                <DropdownPortal isOpen={showExportMenu} targetRef={exportButtonRef} position="right">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    data-portal-dropdown
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid rgba(0, 0, 0, 0.08)',
                      borderRadius: '12px',
                      padding: '16px',
                      minWidth: '300px',
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
                    }}
                  >
                    <h5 style={{
                      fontSize: '15px',
                      fontWeight: 600,
                      color: '#1D1D1F',
                      marginBottom: '12px',
                      letterSpacing: '-0.01em'
                    }}>
                      Export-Format:
                    </h5>
                    {exportOptions.map(option => {
                      // Premium-Check: Nur sperren wenn Premium-Option UND User nicht Premium
                      const isLocked = option.premium && !isPremium;

                      return (
                        <motion.button
                          key={option.id}
                          onClick={() => !isLocked && handleExport(option.format)}
                          disabled={isLocked}
                          whileHover={!isLocked ? { x: 4 } : undefined}
                          style={{
                            width: '100%',
                            padding: '12px',
                            marginBottom: '8px',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            background: '#F5F5F7',
                            border: '1px solid transparent',
                            cursor: isLocked ? 'not-allowed' : 'pointer',
                            opacity: isLocked ? 0.5 : 1,
                            transition: 'all 0.2s ease'
                          }}
                        >
                          <span style={{ fontSize: '20px' }}>{option.icon}</span>
                          <div style={{ textAlign: 'left', flex: 1 }}>
                            <div style={{
                              fontWeight: 600,
                              fontSize: '14px',
                              color: '#1D1D1F',
                              marginBottom: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              {option.name}
                              {/* Lock nur anzeigen wenn gesperrt (Premium-Option UND User nicht Premium) */}
                              {isLocked && <Lock size={12} style={{ color: '#86868B' }} />}
                            </div>
                            <div style={{ fontSize: '12px', color: '#86868B' }}>
                              {option.description}
                            </div>
                          </div>
                          <span style={{
                            fontSize: '11px',
                            background: isLocked ? '#E5E5E7' : '#007AFF',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            fontWeight: 600,
                            color: isLocked ? '#86868B' : '#FFFFFF'
                          }}>
                            {option.format}
                          </span>
                        </motion.button>
                      );
                    })}
                  </motion.div>
                </DropdownPortal>

                {/* Optimization Cards - Premium Design (Legacy) */}
                {!useModernDashboard && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <h3 style={{
                    fontSize: '19px',
                    fontWeight: 600,
                    color: '#1D1D1F',
                    letterSpacing: '-0.02em',
                    marginBottom: '8px'
                  }}>
                    {showAdvancedView ? 'Wähle die gewünschten Optimierungen aus:' : 'Gefundene Optimierungen:'}
                  </h3>
                  {filteredOptimizations.map((optimization, index) => (
                    <motion.div
                      key={optimization.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
                      style={{
                        background: '#FFFFFF',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        borderRadius: '16px',
                        padding: '24px',
                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                        position: 'relative',
                        opacity: selectedOptimizations.has(optimization.id) ? 1 : (showAdvancedView ? 0.7 : 1),
                        transition: 'opacity 0.2s ease'
                      }}
                    >
                      {/* Priority Indicator */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '3px',
                        borderRadius: '20px 20px 0 0',
                        background: optimization.priority === 'critical' 
                          ? 'linear-gradient(90deg, #FF3B30 0%, #E5302A 100%)' : 
                                   optimization.priority === 'high' 
                          ? 'linear-gradient(90deg, #FF9500 0%, #FF7A00 100%)' : 
                                   optimization.priority === 'medium' 
                          ? 'linear-gradient(90deg, #FFCC00 0%, #F5B800 100%)' 
                          : 'linear-gradient(90deg, #34C759 0%, #2EB150 100%)'
                      }}></div>

                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
                        <div style={{ flex: 1 }}>
                          {/* Title */}
                          <h3 style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: '#1D1D1F',
                            marginBottom: '12px',
                            lineHeight: '1.3',
                            letterSpacing: '-0.02em'
                          }}>
                            {optimization.summary ||
                              (optimization.category === 'termination' ? 'Kündigung & Laufzeit' :
                               optimization.category === 'liability' ? 'Haftung & Risiko' :
                               optimization.category === 'payment' ? 'Vergütung & Zahlung' :
                               optimization.category === 'compliance' ? 'Compliance & DSGVO' : 'Klarheit & Präzision')}
                          </h3>

                          {/* Badges */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                            {/* Category Tag */}
                            <span style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              color: '#86868B',
                              padding: '4px 10px',
                              borderRadius: '8px',
                              background: '#F5F5F7',
                              letterSpacing: '0.01em',
                              textTransform: 'uppercase'
                            }}>
                              {optimization.category === 'termination' ? 'Kündigung & Laufzeit' :
                               optimization.category === 'liability' ? 'Haftung & Risiko' :
                               optimization.category === 'payment' ? 'Vergütung & Zahlung' :
                               optimization.category === 'compliance' ? 'Compliance & DSGVO' : 'Klarheit & Präzision'}
                            </span>

                            {/* Priority Badge */}
                            <span style={{
                              padding: '4px 12px',
                              fontSize: '12px',
                              borderRadius: '10px',
                              fontWeight: 600,
                              background: optimization.priority === 'critical' ? 'rgba(255, 59, 48, 0.12)' :
                                         optimization.priority === 'high' ? 'rgba(255, 149, 0, 0.12)' :
                                         optimization.priority === 'medium' ? 'rgba(255, 204, 0, 0.12)' :
                                         'rgba(52, 199, 89, 0.12)',
                              color: optimization.priority === 'critical' ? '#FF3B30' :
                                    optimization.priority === 'high' ? '#FF9500' :
                                    optimization.priority === 'medium' ? '#FFCC00' :
                                    '#34C759'
                            }}>
                              {optimization.priority === 'critical' ? 'Kritisch' :
                               optimization.priority === 'high' ? 'Hoch' :
                               optimization.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                            </span>

                            {/* Difficulty Badge */}
                            <span style={{
                              padding: '4px 12px',
                              fontSize: '12px',
                              borderRadius: '10px',
                              fontWeight: 600,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              background: optimization.implementationDifficulty === 'easy' ? 'rgba(52, 199, 89, 0.12)' :
                                         optimization.implementationDifficulty === 'medium' ? 'rgba(255, 204, 0, 0.12)' :
                                         'rgba(255, 59, 48, 0.12)',
                              color: optimization.implementationDifficulty === 'easy' ? '#34C759' :
                                    optimization.implementationDifficulty === 'medium' ? '#FFCC00' :
                                    '#FF3B30'
                            }}>
                              {optimization.implementationDifficulty === 'easy' ? '🟢 Einfach umsetzbar' :
                               optimization.implementationDifficulty === 'medium' ? '🟡 Mittlerer Aufwand' :
                               '🔴 Professionelle Hilfe'}
                            </span>
                          </div>

                          {/* Meta Info */}
                          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#86868B', fontWeight: 500 }}>
                            <span>KI: {optimization.confidence || 85}%</span>
                            <span>Risiko: {optimization.legalRisk || 5}/10</span>
                            <span>Impact: {optimization.businessImpact || 5}/10</span>
                            <span>{optimization.estimatedSavings}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {showAdvancedView && (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedOptimizations.has(optimization.id)}
                                onChange={() => toggleOptimizationSelection(optimization.id)}
                                className="w-5 h-5"
                                style={{ accentColor: '#007AFF' }}
                              />
                              <span className="font-medium">Anwenden</span>
                            </label>
                          )}
                        </div>
                      </div>

                      {/* Toggle Tabs */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                        <button
                          onClick={() => {
                            const newMap = new Map(diffViewEnabled);
                            newMap.set(optimization.id, false);
                            setDiffViewEnabled(newMap);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: !diffViewEnabled.get(optimization.id) ? 600 : 500,
                            border: !diffViewEnabled.get(optimization.id) ? '1.5px solid #007AFF' : '1px solid rgba(0, 0, 0, 0.1)',
                            background: !diffViewEnabled.get(optimization.id) ? 'rgba(0, 122, 255, 0.08)' : '#FFFFFF',
                            color: !diffViewEnabled.get(optimization.id) ? '#007AFF' : '#86868B',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            boxShadow: !diffViewEnabled.get(optimization.id) ? '0 2px 8px rgba(0, 122, 255, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.04)'
                          }}
                        >
                          <AlignLeft size={14} />
                          💬 Warum optimieren?
                        </button>
                        <button
                          onClick={() => {
                            const newMap = new Map(diffViewEnabled);
                            newMap.set(optimization.id, true);
                            setDiffViewEnabled(newMap);
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            borderRadius: '10px',
                            fontSize: '13px',
                            fontWeight: diffViewEnabled.get(optimization.id) ? 600 : 500,
                            border: diffViewEnabled.get(optimization.id) ? '1.5px solid #007AFF' : '1px solid rgba(0, 0, 0, 0.1)',
                            background: diffViewEnabled.get(optimization.id) ? 'rgba(0, 122, 255, 0.08)' : '#FFFFFF',
                            color: diffViewEnabled.get(optimization.id) ? '#007AFF' : '#86868B',
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            boxShadow: diffViewEnabled.get(optimization.id) ? '0 2px 8px rgba(0, 122, 255, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.04)'
                          }}
                        >
                          <Code2 size={14} />
                          📄 Vorher → Nachher
                        </button>
                      </div>

                      {/* Content */}
                      <div style={{
                        background: '#F5F5F7',
                        borderRadius: '12px',
                        padding: '20px',
                        marginBottom: '12px'
                      }}>
                        {/* Show Reasoning or Before/After based on toggle */}
                        {!diffViewEnabled.get(optimization.id) ? (
                          /* WARUM OPTIMIEREN? - Die KI-Begründung */
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                              <AlignLeft size={16} style={{ color: '#007AFF' }} />
                              <span style={{
                                fontSize: '12px',
                                fontWeight: 700,
                                color: '#1D1D1F',
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                              }}>
                                Warum ist das wichtig?
                              </span>
                            </div>
                            <p style={{
                              fontSize: '14px',
                              color: '#1D1D1F',
                              lineHeight: '1.6',
                              margin: 0
                            }}>
                              {optimization.reasoning}
                            </p>
                          </div>
                        ) : (
                          /* VORHER → NACHHER - Klausel-Vergleich */
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div style={{ textAlign: 'center' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                background: 'rgba(0, 122, 255, 0.1)',
                                color: '#007AFF',
                                fontSize: '12px',
                                fontWeight: 700,
                                letterSpacing: '0.5px',
                                textTransform: 'uppercase'
                              }}>
                                <Code2 size={14} />
                                Was wird konkret geändert?
                              </span>
                            </div>

                            {/* VORHER Box */}
                            <div style={{
                              borderRadius: '12px',
                              border: '2px solid rgba(255, 59, 48, 0.3)',
                              background: 'rgba(255, 59, 48, 0.05)',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid rgba(255, 59, 48, 0.2)',
                                background: 'rgba(255, 59, 48, 0.1)'
                              }}>
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#FF3B30',
                                  letterSpacing: '0.3px',
                                  textTransform: 'uppercase'
                                }}>
                                  ❌ Vorher (Aktuell in Ihrem Vertrag)
                                </span>
                              </div>
                              <div style={{ padding: '16px' }}>
                                {optimization.original === "FEHLT" || optimization.original.includes("FEHLT") ? (
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                    <AlertTriangle size={16} style={{ color: '#FF3B30', marginTop: '2px', flexShrink: 0 }} />
                                    <div>
                                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#FF3B30', margin: '0 0 4px 0' }}>
                                        Diese Klausel fehlt komplett!
                                      </p>
                                      <p style={{ fontSize: '13px', color: '#86868B', margin: 0 }}>
                                        In Ihrem aktuellen Vertrag ist dieser wichtige Absatz nicht vorhanden.
                                      </p>
                                    </div>
                                  </div>
                                ) : (
                                  <p style={{
                                    fontSize: '14px',
                                    color: '#1D1D1F',
                                    lineHeight: '1.6',
                                    margin: 0,
                                    whiteSpace: 'pre-wrap'
                                  }}>
                                    {optimization.original.length > 300 ? optimization.original.substring(0, 300) + '...' : optimization.original}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Pfeil */}
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                              <div style={{
                                padding: '10px 20px',
                                borderRadius: '20px',
                                background: 'linear-gradient(135deg, #007AFF 0%, #34C759 100%)',
                                color: 'white'
                              }}>
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  letterSpacing: '0.5px',
                                  textTransform: 'uppercase'
                                }}>
                                  ⬇️ Wird ersetzt durch
                                </span>
                              </div>
                            </div>

                            {/* NACHHER Box */}
                            <div style={{
                              borderRadius: '12px',
                              border: '2px solid rgba(52, 199, 89, 0.3)',
                              background: 'rgba(52, 199, 89, 0.05)',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid rgba(52, 199, 89, 0.2)',
                                background: 'rgba(52, 199, 89, 0.1)'
                              }}>
                                <span style={{
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  color: '#34C759',
                                  letterSpacing: '0.3px',
                                  textTransform: 'uppercase'
                                }}>
                                  ✅ Nachher (Optimierte Version)
                                </span>
                              </div>
                              <div style={{ padding: '16px' }}>
                                <p style={{
                                  fontSize: '14px',
                                  color: '#1D1D1F',
                                  lineHeight: '1.6',
                                  margin: 0,
                                  fontWeight: 500,
                                  whiteSpace: 'pre-wrap'
                                }}>
                                  {optimization.improved.length > 500 ? optimization.improved.substring(0, 500) + '...' : optimization.improved}
                                </p>
                                {optimization.improved.length > 500 && (
                                  <p style={{
                                    fontSize: '12px',
                                    color: '#007AFF',
                                    marginTop: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    margin: '12px 0 0 0'
                                  }}>
                                    <Shield size={14} />
                                    Vollständige juristische Klausel wird im PDF-Vertrag generiert
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        {showAdvancedView && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            {optimization.original === "FEHLT" || optimization.original.includes("FEHLT") ? (
                              <div className="mb-2 p-2 rounded-lg" style={{ background: 'rgba(255, 59, 48, 0.1)' }}>
                                <strong className="text-red-600">⚠️ Fehlende Pflichtklausel</strong>
                                <p className="text-xs text-gray-600 mt-1">Diese wichtige Klausel fehlt komplett in deinem Vertrag</p>
                              </div>
                            ) : (
                              <p className="text-xs text-gray-600 mb-1">
                                <strong>Original:</strong> {optimization.original.substring(0, 100)}...
                              </p>
                            )}
                            <div className="mt-2 p-2 rounded-lg" style={{ background: 'rgba(52, 199, 89, 0.1)' }}>
                              <p className="text-xs text-green-600">
                                <strong>✅ Optimiert:</strong>
                              </p>
                              <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">
                                {optimization.improved.length > 500 ? optimization.improved.substring(0, 500) + '...' : optimization.improved}
                              </p>
                              {(optimization.improved.length < 200 || optimization.improved.length > 500) && (
                                <p className="text-xs text-blue-600 mt-2">
                                  ℹ️ <em>Vollständige juristische Klausel wird im PDF generiert</em>
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Impact-Vorschau */}
                      <div style={{
                        marginTop: '12px',
                        padding: '20px',
                        borderRadius: '12px',
                        border: '1px solid rgba(0, 0, 0, 0.08)',
                        background: '#FFFFFF'
                      }}>
                        <h5 style={{
                          fontSize: '12px',
                          fontWeight: 700,
                          color: '#1D1D1F',
                          marginBottom: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          letterSpacing: '0.5px',
                          textTransform: 'uppercase'
                        }}>
                          <TrendingUp size={16} style={{ color: '#007AFF' }} />
                          Auswirkungen dieser Optimierung
                        </h5>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {/* Rechtsschutz Level */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Shield size={14} style={{ color: '#34C759' }} />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>
                                  Rechtsschutz
                                </span>
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                <span style={{ color: '#86868B' }}>
                                  {optimization.legalRisk <= 3 ? 'Stark' : optimization.legalRisk <= 6 ? 'Mittel' : 'Schwach'}
                                </span>
                                <span style={{ color: '#86868B', margin: '0 4px' }}>→</span>
                                <span style={{ color: '#34C759' }}>Stark</span>
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', background: '#E5E5E7', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  borderRadius: '3px',
                                  transition: 'all 0.5s ease',
                                  width: `${Math.max(20, 100 - (optimization.legalRisk || 5) * 10)}%`,
                                  background: (optimization.legalRisk || 5) >= 7 ? '#FF3B30' : (optimization.legalRisk || 5) >= 4 ? '#FF9500' : '#34C759'
                                }} />
                              </div>
                              <span style={{ fontSize: '12px', color: '#86868B' }}>→</span>
                              <div style={{
                                flex: 1,
                                height: '6px',
                                background: 'linear-gradient(90deg, #34C759 0%, #2EB150 100%)',
                                borderRadius: '3px'
                              }} />
                            </div>
                          </div>

                          {/* Verhandlungsposition */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <TrendingUp size={14} style={{ color: '#007AFF' }} />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>
                                  Verhandlungsposition
                                </span>
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                <span style={{ color: '#86868B' }}>
                                  {(optimization.businessImpact || 5) <= 3 ? 'Ungünstig' : (optimization.businessImpact || 5) <= 7 ? 'Neutral' : 'Vorteilhaft'}
                                </span>
                                <span style={{ color: '#86868B', margin: '0 4px' }}>→</span>
                                <span style={{ color: '#007AFF' }}>Vorteilhaft</span>
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', background: '#E5E5E7', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  borderRadius: '3px',
                                  transition: 'all 0.5s ease',
                                  width: `${Math.max(20, (optimization.businessImpact || 5) * 10)}%`,
                                  background: (optimization.businessImpact || 5) >= 7 ? '#34C759' : (optimization.businessImpact || 5) >= 4 ? '#FF9500' : '#FF3B30'
                                }} />
                              </div>
                              <span style={{ fontSize: '12px', color: '#86868B' }}>→</span>
                              <div style={{
                                flex: 1,
                                height: '6px',
                                background: 'linear-gradient(90deg, #007AFF 0%, #5856D6 100%)',
                                borderRadius: '3px'
                              }} />
                            </div>
                          </div>

                          {/* Risiko-Reduktion */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <AlertTriangle size={14} style={{ color: '#FF9500' }} />
                                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1D1D1F' }}>
                                  Risiko-Level
                                </span>
                              </div>
                              <span style={{ fontSize: '12px', fontWeight: 600 }}>
                                <span style={{ color: (optimization.legalRisk || 5) >= 7 ? '#FF3B30' : '#86868B' }}>
                                  {(optimization.legalRisk || 5) >= 7 ? 'Hoch' : (optimization.legalRisk || 5) >= 4 ? 'Mittel' : 'Niedrig'}
                                </span>
                                <span style={{ color: '#86868B', margin: '0 4px' }}>→</span>
                                <span style={{ color: '#34C759' }}>Niedrig</span>
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ flex: 1, height: '6px', background: '#E5E5E7', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%',
                                  borderRadius: '3px',
                                  transition: 'all 0.5s ease',
                                  width: `${Math.max(20, (optimization.legalRisk || 5) * 10)}%`,
                                  background: (optimization.legalRisk || 5) >= 7 ? '#FF3B30' : (optimization.legalRisk || 5) >= 4 ? '#FF9500' : '#34C759'
                                }} />
                              </div>
                              <span style={{ fontSize: '12px', color: '#86868B' }}>→</span>
                              <div style={{
                                flex: 1,
                                height: '6px',
                                background: 'linear-gradient(90deg, #34C759 0%, #2EB150 100%)',
                                borderRadius: '3px'
                              }} />
                            </div>
                          </div>
                        </div>

                        {/* Nutzen Footer */}
                        <div style={{
                          marginTop: '16px',
                          paddingTop: '16px',
                          borderTop: '1px solid rgba(0, 0, 0, 0.08)'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                            <span style={{
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#FF9500',
                              letterSpacing: '0.3px'
                            }}>
                              💡 Nutzen:
                            </span>
                            <span style={{
                              fontSize: '12px',
                              color: '#1D1D1F',
                              lineHeight: '1.5',
                              flex: 1
                            }}>
                              {optimization.marketBenchmark}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Benchmark & Umsetzung Info Grid */}
                      <div style={{
                        marginTop: '16px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                        gap: '12px'
                      }}>
                        <div style={{
                          background: '#F5F5F7',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          border: '1px solid rgba(0, 0, 0, 0.06)'
                        }}>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#86868B',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            marginBottom: '4px'
                          }}>
                            Benchmark
                          </div>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#1D1D1F',
                            letterSpacing: '-0.01em'
                          }}>
                            {optimization.marketBenchmark}
                          </div>
                        </div>
                        <div style={{
                          background: '#F5F5F7',
                          borderRadius: '10px',
                          padding: '12px 16px',
                          border: '1px solid rgba(0, 0, 0, 0.06)'
                        }}>
                          <div style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#86868B',
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            marginBottom: '4px'
                          }}>
                            Umsetzung
                          </div>
                          <div style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: optimization.implementationDifficulty === 'easy' ? '#34C759' :
                                   optimization.implementationDifficulty === 'medium' ? '#FF9500' : '#FF3B30',
                            letterSpacing: '-0.01em'
                          }}>
                            {optimization.implementationDifficulty === 'easy' ? 'Einfach' :
                             optimization.implementationDifficulty === 'medium' ? 'Mittel' : 'Komplex'}
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div style={{
                        marginTop: '20px',
                        paddingTop: '20px',
                        borderTop: '1px solid rgba(0, 0, 0, 0.08)',
                        display: 'flex',
                        gap: '12px',
                        justifyContent: 'flex-end'
                      }}>
                        {/* Im Dokument anzeigen Button - nur für echten PDF-Text */}
                        {isValidPdfText(optimization.original) && (
                          <motion.button
                            onClick={() => {
                              // Setze Suchtext für PDF-Highlighting
                              setHighlightedText(optimization.original);
                              // Smooth scroll zur PDF-Vorschau
                              setTimeout(() => {
                                pdfViewerRef.current?.scrollIntoView({
                                  behavior: 'smooth',
                                  block: 'start'
                                });
                              }, 100);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 16px',
                              borderRadius: '12px',
                              border: '1.5px solid #007AFF',
                              background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.12) 100%)',
                              color: '#007AFF',
                              fontSize: '14px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                              letterSpacing: '-0.01em',
                              boxShadow: '0 2px 8px rgba(0, 122, 255, 0.15)'
                            }}
                            whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0, 122, 255, 0.25)' }}
                            whileTap={{ scale: 0.98 }}
                            title="Im Dokument anzeigen"
                          >
                            <FileText size={16} />
                            Im Dokument anzeigen
                          </motion.button>
                        )}

                        {/* Einfach erklärt Button */}
                        <motion.button
                          onClick={() => setExplanationPopup({ show: true, optimization })}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            borderRadius: '12px',
                            border: '1.5px solid #FF9500',
                            background: 'linear-gradient(135deg, rgba(255, 149, 0, 0.08) 0%, rgba(255, 149, 0, 0.12) 100%)',
                            color: '#FF9500',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            letterSpacing: '-0.01em',
                            boxShadow: '0 2px 8px rgba(255, 149, 0, 0.15)'
                          }}
                          whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(255, 149, 0, 0.25)' }}
                          whileTap={{ scale: 0.98 }}
                          title="Einfach erklärt"
                        >
                          <Lightbulb size={16} />
                          Einfach erklärt
                        </motion.button>

                        {/* Kopieren Button */}
                        <motion.button
                          onClick={() => {
                            navigator.clipboard.writeText(`${optimization.improved}\n\nBegründung: ${optimization.reasoning}`);
                            showToast("✅ Kopiert!", 'success');
                          }}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 16px',
                            borderRadius: '12px',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            background: '#FFFFFF',
                            color: '#1D1D1F',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                            letterSpacing: '-0.01em',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
                          }}
                          whileHover={{ scale: 1.02, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)' }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <Copy size={16} />
                          Kopieren
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* 📄 PDF Document Viewer Section - SLIDE-IN RIGHT PANEL */}
      <AnimatePresence>
        {highlightedText && optimizationResult && file && (
          <motion.div
            ref={pdfViewerRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            style={{
              position: 'fixed',
              top: '0',
              right: '0',
              width: '50%',
              height: '100vh',
              overflowY: 'auto',
              zIndex: 999,
              background: '#FFFFFF',
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.15)',
              padding: '80px 32px 32px 32px'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setHighlightedText(null)}
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '1px solid rgba(0, 0, 0, 0.1)',
                background: '#FFFFFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '20px',
                transition: 'all 0.2s ease',
                zIndex: 10
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#F5F5F7';
                e.currentTarget.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#FFFFFF';
                e.currentTarget.style.transform = 'scale(1)';
              }}
              aria-label="PDF schließen"
            >
              ✕
            </button>

          <div style={{
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '24px',
              fontWeight: 700,
              color: '#1D1D1F',
              marginBottom: '8px',
              letterSpacing: '-0.02em'
            }}>
              📄 Original-Dokument
            </h2>
            <p style={{
              fontSize: '14px',
              color: '#86868B',
              margin: 0
            }}>
              Klicke auf "Im Dokument anzeigen" um zur entsprechenden Stelle zu springen
            </p>
          </div>

          <PDFDocumentViewer
            file={file}
            highlightText={highlightedText}
          />
        </motion.div>
        )}
      </AnimatePresence>

      {/* 🎯 NEUE FEATURE: Optimierten Vertrag generieren Modal */}
      <AnimatePresence>
        {showGenerateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '20px'
            }}
            onClick={() => setShowGenerateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '32px',
                maxWidth: '560px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              {/* Header */}
              <div style={{ marginBottom: '24px' }}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: '#1D1D1F',
                  margin: '0 0 8px 0',
                  letterSpacing: '-0.02em'
                }}>
                  📄 Optimierten Vertrag erstellen
                </h2>
                <p style={{
                  fontSize: '15px',
                  color: '#86868B',
                  margin: 0
                }}>
                  Wähle die Optionen für deinen neuen Vertrag
                </p>
              </div>

              {/* Übernahme-Optionen */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1D1D1F',
                  margin: '0 0 12px 0'
                }}>
                  Was soll übernommen werden?
                </h3>

                {[
                  { key: 'includeParties', label: 'Vertragsparteien (Namen, Adressen)', icon: '👥' },
                  { key: 'includeAmounts', label: 'Beträge und Zahlen', icon: '💰' },
                  { key: 'includeDurations', label: 'Laufzeiten und Kündigungsfristen', icon: '📅' },
                  { key: 'includeClauses', label: 'Alle Original-Klauseln', icon: '📋' }
                ].map(option => (
                  <label
                    key={option.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      marginBottom: '8px',
                      background: generateOptions[option.key as keyof typeof generateOptions] ? 'rgba(0, 122, 255, 0.08)' : '#F5F5F7',
                      border: `2px solid ${generateOptions[option.key as keyof typeof generateOptions] ? '#007AFF' : 'transparent'}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={generateOptions[option.key as keyof typeof generateOptions]}
                      onChange={(e) => setGenerateOptions(prev => ({
                        ...prev,
                        [option.key]: e.target.checked
                      }))}
                      style={{
                        width: '20px',
                        height: '20px',
                        cursor: 'pointer'
                      }}
                    />
                    <span style={{ fontSize: '18px' }}>{option.icon}</span>
                    <span style={{
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#1D1D1F',
                      flex: 1
                    }}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>

              {/* Firmenprofil */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#1D1D1F',
                  margin: '0 0 12px 0'
                }}>
                  Firmenprofil
                </h3>

                {loadingProfiles ? (
                  <div style={{
                    padding: '16px',
                    background: '#F5F5F7',
                    borderRadius: '10px',
                    textAlign: 'center',
                    color: '#86868B'
                  }}>
                    Lade Profile...
                  </div>
                ) : companyProfiles.length > 0 ? (
                  <select
                    value={selectedProfile || ''}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      borderRadius: '10px',
                      border: '2px solid #E5E5E7',
                      fontSize: '15px',
                      fontWeight: 500,
                      color: '#1D1D1F',
                      background: '#FFFFFF',
                      cursor: 'pointer',
                      outline: 'none'
                    }}
                  >
                    {companyProfiles.map(profile => (
                      <option key={profile._id} value={profile._id}>
                        {profile.companyName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div style={{
                    padding: '16px',
                    background: 'rgba(255, 204, 0, 0.1)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 204, 0, 0.3)'
                  }}>
                    <p style={{
                      fontSize: '14px',
                      color: '#1D1D1F',
                      margin: '0 0 12px 0'
                    }}>
                      Noch kein Firmenprofil vorhanden
                    </p>
                    <button
                      onClick={() => window.location.href = '/company-profile'}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#FFCC00',
                        color: '#1D1D1F',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      + Firmenprofil anlegen
                    </button>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowGenerateModal(false)}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '10px',
                    border: '2px solid #E5E5E7',
                    background: '#FFFFFF',
                    color: '#1D1D1F',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => {
                    setShowGenerateModal(false);
                    handleCreateOptimizedContract();
                  }}
                  disabled={isGeneratingContract}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isGeneratingContract ? '#C7C7CC' : 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: isGeneratingContract ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  {isGeneratingContract ? (
                    <>
                      <div className={styles.spinner}></div>
                      Erstelle Vertrag...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      Vertrag erstellen
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🎨 NEU: Design-Auswahl Modal (Schritt 2) */}
      <AnimatePresence>
        {showDesignModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10001,
              padding: '20px'
            }}
            onClick={() => {
              if (!isDownloadingPdf) {
                setShowDesignModal(false);
                setGeneratedContractText('');
                setGeneratedContractId(null);
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#FFFFFF',
                borderRadius: '20px',
                padding: '32px',
                maxWidth: '800px',
                width: '100%',
                boxShadow: '0 25px 80px rgba(0, 0, 0, 0.35)',
                maxHeight: '90vh',
                overflowY: 'auto'
              }}
            >
              {/* Header */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    <CheckCircle size={24} color="#FFFFFF" />
                  </div>
                  <div>
                    <h2 style={{
                      fontSize: '24px',
                      fontWeight: 700,
                      color: '#1D1D1F',
                      margin: 0,
                      letterSpacing: '-0.02em'
                    }}>
                      Vertragstext erstellt!
                    </h2>
                    <p style={{
                      fontSize: '14px',
                      color: '#86868B',
                      margin: 0
                    }}>
                      Wähle jetzt dein gewünschtes Design
                    </p>
                  </div>
                </div>
              </div>

              {/* Vertragstext Vorschau */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#86868B',
                  margin: '0 0 12px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Vertragstext-Vorschau
                </h3>
                <div style={{
                  background: '#F5F5F7',
                  borderRadius: '12px',
                  padding: '16px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  border: '1px solid #E5E5E7'
                }}>
                  <pre style={{
                    margin: 0,
                    fontSize: '12px',
                    lineHeight: '1.6',
                    color: '#1D1D1F',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    fontFamily: 'SF Mono, Monaco, Consolas, monospace'
                  }}>
                    {generatedContractText}
                  </pre>
                </div>
                <p style={{
                  fontSize: '12px',
                  color: '#86868B',
                  margin: '8px 0 0 0',
                  textAlign: 'right'
                }}>
                  {generatedContractText.length.toLocaleString('de-DE')} Zeichen
                </p>
              </div>

              {/* Design-Auswahl */}
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#86868B',
                  margin: '0 0 16px 0',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Design wählen
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                  gap: '12px'
                }}>
                  {designOptions.map((design) => (
                    <button
                      key={design.id}
                      onClick={() => setSelectedDesignVariant(design.id)}
                      disabled={isDownloadingPdf}
                      style={{
                        position: 'relative',
                        padding: '12px 8px',
                        borderRadius: '12px',
                        border: selectedDesignVariant === design.id
                          ? '2px solid #007AFF'
                          : '2px solid #E5E5E7',
                        background: selectedDesignVariant === design.id
                          ? 'rgba(0, 122, 255, 0.08)'
                          : '#FFFFFF',
                        cursor: isDownloadingPdf ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      {/* Design-Farbe Vorschau */}
                      <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '8px',
                        background: design.color,
                        boxShadow: selectedDesignVariant === design.id
                          ? `0 4px 12px ${design.color}40`
                          : 'none',
                        transition: 'all 0.2s'
                      }} />
                      <div style={{ textAlign: 'center' }}>
                        <p style={{
                          margin: 0,
                          fontSize: '13px',
                          fontWeight: 600,
                          color: '#1D1D1F'
                        }}>
                          {design.name}
                        </p>
                        <p style={{
                          margin: '2px 0 0 0',
                          fontSize: '11px',
                          color: '#86868B'
                        }}>
                          {design.desc}
                        </p>
                      </div>
                      {selectedDesignVariant === design.id && (
                        <div style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: '#007AFF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Check size={12} color="#FFFFFF" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    if (!isDownloadingPdf) {
                      setShowDesignModal(false);
                      setGeneratedContractText('');
                      setGeneratedContractId(null);
                    }
                  }}
                  disabled={isDownloadingPdf}
                  style={{
                    padding: '14px 24px',
                    borderRadius: '10px',
                    border: '2px solid #E5E5E7',
                    background: '#FFFFFF',
                    color: '#1D1D1F',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: isDownloadingPdf ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    opacity: isDownloadingPdf ? 0.5 : 1
                  }}
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleDownloadWithDesign}
                  disabled={isDownloadingPdf}
                  style={{
                    padding: '14px 28px',
                    borderRadius: '10px',
                    border: 'none',
                    background: isDownloadingPdf
                      ? '#C7C7CC'
                      : 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
                    color: '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: isDownloadingPdf ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    boxShadow: isDownloadingPdf ? 'none' : '0 4px 15px rgba(52, 199, 89, 0.3)'
                  }}
                >
                  {isDownloadingPdf ? (
                    <>
                      <div className={styles.spinner}></div>
                      Generiere PDF...
                    </>
                  ) : (
                    <>
                      <Download size={18} />
                      PDF herunterladen
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 🧠 PHASE 1: Simple Explanation Popup */}
      {explanationPopup.show && explanationPopup.optimization && (
        <SimpleExplanationPopup
          category={explanationPopup.optimization.category}
          originalText={explanationPopup.optimization.original}
          improvedText={explanationPopup.optimization.improved}
          reasoning={explanationPopup.optimization.reasoning}
          onClose={() => setExplanationPopup({ show: false, optimization: null })}
        />
      )}
      {ScannerModal}
    </>
  );
}
