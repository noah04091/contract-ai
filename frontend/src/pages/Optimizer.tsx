// 📁 src/pages/Optimizer.tsx - APPLE DESIGN REVOLUTION ✨
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
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
  Target,
  BarChart3,
  Layers,
  FileSignature,
  Briefcase,
  Home,
  Package,
  Calculator,
  Cloud,
  Loader2,
  Minimize2,
  Settings,
  ArrowRight,
  Lightbulb,
  Zap,
  Code2,
  AlignLeft,
  Shield,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

// Components
import UnifiedPremiumNotice from "../components/UnifiedPremiumNotice";
import ContractHealthDashboard from "../components/ContractHealthDashboard";
import SimpleExplanationPopup from "../components/SimpleExplanationPopup";

// Types für revolutionäre Features
import { 
  OptimizationSuggestion, 
  ContractHealthScore
} from "../types/optimizer";

// Styles
import styles from "../styles/Optimizer.module.css";

// 🚀 REVOLUTIONARY: Enhanced Types with backwards compatibility
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
}

interface RevolutionaryCategory {
  tag: string;
  label: string;
  present: boolean;
  issues: OptimizationIssue[];
}

interface OptimizationResult {
  meta?: ContractMeta;
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

// 🎯 VISUAL PROGRESS STEPS - Zeigt Nutzer transparente Analyse-Phasen
const ANALYSIS_STEPS = [
  { id: 0, label: 'PDF Upload', icon: '📄', progressRange: [0, 15] },
  { id: 1, label: 'Vertragstyp', icon: '🎯', progressRange: [16, 35] },
  { id: 2, label: 'Lücken-Analyse', icon: '⚖️', progressRange: [36, 50] },
  { id: 3, label: 'KI-Optimierung', icon: '🤖', progressRange: [51, 80] },
  { id: 4, label: 'Qualitäts-Check', icon: '🔬', progressRange: [81, 98] },
  { id: 5, label: 'Fertig', icon: '✅', progressRange: [99, 100] }
];

// Helper: Determine current step based on progress
const getCurrentStepFromProgress = (progress: number): number => {
  for (const step of ANALYSIS_STEPS) {
    if (progress >= step.progressRange[0] && progress <= step.progressRange[1]) {
      return step.id;
    }
  }
  return 0; // Default to first step
};

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
          relatedClauses: [`Kategorie: ${category.label}`, `Priorität: ${issue.risk >= 8 ? 'kritisch' : 'hoch'}`]
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
    return {
      overall: 85,
      categories: {
        termination: { score: 85, trend: 'stable' },
        liability: { score: 85, trend: 'stable' },
        payment: { score: 85, trend: 'stable' },
        clarity: { score: 85, trend: 'stable' },
        compliance: { score: 85, trend: 'stable' }
      },
      industryPercentile: 65,
      riskLevel: 'medium'
    };
  }

  const criticalCount = optimizations.filter(opt => opt.priority === 'critical' && !opt.implemented).length;
  const highCount = optimizations.filter(opt => opt.priority === 'high' && !opt.implemented).length;
  const mediumCount = optimizations.filter(opt => opt.priority === 'medium' && !opt.implemented).length;
  
  let baseScore = 92;
  baseScore -= criticalCount * 18;
  baseScore -= highCount * 10;
  baseScore -= mediumCount * 4;
  baseScore = Math.max(25, baseScore);

  const implementedCount = optimizations.filter(opt => opt.implemented).length;
  const improvementBonus = implementedCount * 5;
  const finalScore = Math.min(100, Math.round(baseScore + improvementBonus));

  const categoryScores = {
    termination: Math.round(baseScore),
    liability: Math.round(baseScore),
    payment: Math.round(baseScore),
    clarity: Math.round(baseScore),
    compliance: Math.round(baseScore)
  };

  optimizations.forEach(opt => {
    if (!opt.implemented) {
      const reduction = opt.priority === 'critical' ? 15 : opt.priority === 'high' ? 8 : 4;
      categoryScores[opt.category] = Math.max(15, Math.round(categoryScores[opt.category] - reduction));
    } else {
      categoryScores[opt.category] = Math.min(100, Math.round(categoryScores[opt.category] + 3));
    }
  });

  return {
    overall: Math.round(finalScore),
    categories: {
      termination: { score: Math.round(categoryScores.termination), trend: 'stable' },
      liability: { score: Math.round(categoryScores.liability), trend: 'stable' },
      payment: { score: Math.round(categoryScores.payment), trend: 'stable' },
      clarity: { score: Math.round(categoryScores.clarity), trend: 'stable' },
      compliance: { score: Math.round(categoryScores.compliance), trend: 'stable' }
    },
    industryPercentile: Math.max(10, Math.round(finalScore - 20)),
    riskLevel: finalScore < 40 ? 'critical' : finalScore < 60 ? 'high' : finalScore < 80 ? 'medium' : 'low'
  };
};

export default function Optimizer() {
  // ✅ ORIGINAL: Core states
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [contractScore, setContractScore] = useState<ContractHealthScore | null>(null);
  
  // ✅ ORIGINAL: Export & Pitch States + Portal Refs
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPitchMenu, setShowPitchMenu] = useState(false);
  const [selectedPitchStyle] = useState<string>('business');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // ✅ ORIGINAL: Smart Contract Generator States
  const [contractId, setContractId] = useState<string | null>(null);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  const [originalContractText, setOriginalContractText] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [showAdvancedView, setShowAdvancedView] = useState(false);
  const [showStatistics, setShowStatistics] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedOptimizations, setSelectedOptimizations] = useState<Set<string>>(new Set());

  // 🧠 PHASE 1: Simple Explanation Popup State
  const [explanationPopup, setExplanationPopup] = useState<{
    show: boolean;
    optimization: OptimizationSuggestion | null;
  }>({ show: false, optimization: null });

  // 🎯 PHASE 1 - FEATURE 2: Quick Win Sort State
  const [showQuickWinsFirst, setShowQuickWinsFirst] = useState(false);

  // 🎯 PHASE 1 - FEATURE 3: Visual Diff View State
  const [diffViewEnabled, setDiffViewEnabled] = useState<Map<string, boolean>>(new Map());

  // ✅ ORIGINAL: Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pitchButtonRef = useRef<HTMLButtonElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

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
    setProgressMessage('Starte Analyse...');

    const formData = new FormData();
    formData.append("file", file);

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
                  setProgressMessage('Fertig!');
                  break;
                }

                // Handle progress update
                if (data.progress !== undefined) {
                  setAnalysisProgress(data.progress);
                  setCurrentStep(getCurrentStepFromProgress(data.progress));
                  setProgressMessage(data.message || '');
                  console.log(`📡 ${data.progress}%: ${data.message}`);
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
        setProgressMessage('Verwende Standard-Modus...');

        // Simulate progress for regular endpoint
        const progressInterval = setInterval(() => {
          setAnalysisProgress(prev => Math.min(prev + 8, 90));
        }, 800);

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
        setProgressMessage('Fertig!');

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
          usedStreaming: useStreamingEndpoint
        });

        // Store all data
        setAnalysisData(finalResult as AnalysisData);
        setOptimizationResult(finalResult);

        if (finalResult.originalText) {
          setOriginalContractText(finalResult.originalText);
        }

        // Parse optimizations
        const parsedOptimizations = parseOptimizationResult(finalResult, file.name);
        const calculatedScore = calculateContractScore(parsedOptimizations);

        setOptimizations(parsedOptimizations);
        setContractScore(calculatedScore);

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
        setProgressMessage('');
        setCurrentStep(0);
      }, 1000);
    }
  };

  // ✅ ORIGINAL: Toast Helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ✅ SIMPLIFIED: Smart Contract Generator
  const handleGenerateOptimizedContract = useCallback(async () => {
    if (!file || optimizations.length === 0) {
      showToast("❌ Bitte lade erst einen Vertrag hoch.", 'error');
      return;
    }
    
    // Prevent duplicate calls
    if (isGeneratingContract) {
      return;
    }

    // Use selected optimizations if in advanced mode, otherwise use ALL
    const optimizationsToApply = showAdvancedView && selectedOptimizations.size > 0
      ? optimizations.filter(opt => selectedOptimizations.has(opt.id))
      : optimizations; // Default: Use ALL optimizations

    if (optimizationsToApply.length === 0) {
      showToast("❌ Keine Optimierungen ausgewählt.", 'error');
      return;
    }

    setIsGeneratingContract(true);
    showToast(`🪄 Dein verbesserter Vertrag wird generiert...`, 'success');

    try {
      let currentContractId = contractId;
      
      if (!currentContractId && analysisData) {
        const contractData = {
          name: file.name,
          content: originalContractText || `Inhalt von ${file.name}`,
          laufzeit: analysisData.laufzeit || "Unbekannt",
          kuendigung: analysisData.kuendigung || "Unbekannt",
          expiryDate: analysisData.expiryDate || "",
          status: analysisData.status || "Aktiv",
          isGenerated: false,
          originalname: file.name,
          filePath: analysisData.fileUrl || "",
          mimetype: file.type,
          size: file.size,
          analysisId: analysisData.analysisId || analysisData.requestId,
          uploadType: analysisData.uploadType || 'LOCAL_UPLOAD'
        };

        const contractRes = await fetch("/api/contracts", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(contractData),
        });

        if (contractRes.ok) {
          const contractResult = await contractRes.json();
          currentContractId = contractResult.contractId;
          setContractId(currentContractId);
        }
      }

      if (!currentContractId) {
        throw new Error("❌ Keine Contract ID verfügbar.");
      }

      const generatePayload = {
        optimizations: optimizationsToApply.map(opt => ({
          id: opt.id,
          category: opt.category,
          priority: opt.priority,
          originalText: opt.original,
          improvedText: opt.improved,
          reasoning: opt.reasoning,
          confidence: opt.confidence,
          risk: opt.legalRisk,
          impact: opt.businessImpact,
          difficulty: opt.implementationDifficulty === 'easy' ? 'Einfach' : 
                     opt.implementationDifficulty === 'medium' ? 'Mittel' : 'Komplex',
          estimatedSavings: opt.estimatedSavings,
          marketBenchmark: opt.marketBenchmark
        })),
        options: {
          format: 'pdf',
          includeReasons: true,
          preserveLayout: true
        },
        sourceData: {
          originalFileName: file.name,
          originalContent: originalContractText,
          analysisData: analysisData
        }
      };

      const generateRes = await fetch(`/api/optimized-contract/${currentContractId}/generate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(generatePayload)
      });

      if (!generateRes.ok) {
        throw new Error("❌ Generierung fehlgeschlagen");
      }

      const blob = await generateRes.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Optimiert_${file.name.replace('.pdf', '')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      showToast(`✅ Professioneller Vertrag mit ${optimizationsToApply.length} Optimierungen erstellt!`, 'success');

    } catch (error) {
      const err = error as Error;
      console.error("❌ Generation error:", err);
      
      // Better error messages for users
      let userMessage = 'Fehler beim Generieren des Vertrags';
      if (err.message.includes('network')) {
        userMessage = '🌐 Netzwerkfehler - Bitte prüfe deine Internetverbindung';
      } else if (err.message.includes('401') || err.message.includes('403')) {
        userMessage = '🔒 Sitzung abgelaufen - Bitte neu anmelden';
      } else if (err.message.includes('500')) {
        userMessage = '⚠️ Server-Fehler - Bitte versuche es später erneut';
      }
      
      showToast(userMessage, 'error');
    } finally {
      setIsGeneratingContract(false);
    }
  }, [file, optimizations, contractId, showAdvancedView, selectedOptimizations, originalContractText, analysisData, showToast]);

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
    setContractId(null);
    setIsGeneratingContract(false);
    setOriginalContractText('');
    setAnalysisData(null);
    setOptimizationResult(null);
    setSelectedOptimizations(new Set());
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
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Nur PDF-Dateien werden unterstützt");
      }
    }
  }, [isPremium]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
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

  // ✅ ORIGINAL: Export Functions
  const handleExport = useCallback(async () => {
    setShowExportMenu(false);
    
    const content = optimizations.map((opt, index) => 
      `${index + 1}. ${opt.category.toUpperCase()}
Original: ${opt.original}
Verbessert: ${opt.improved}
Begründung: ${opt.reasoning}
Benchmark: ${opt.marketBenchmark}
Impact: ${opt.estimatedSavings}
Konfidenz: ${opt.confidence}%\n`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Vertragsanalyse_${file?.name?.replace('.pdf', '')}_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
    
    showToast(`✅ Export erfolgreich!`, 'success');
  }, [optimizations, file, showToast]);

  // 🚀 REVOLUTIONARY: Dynamic Categories with Performance Optimization
  const dynamicCategories = useMemo(() => {
    const cats = [
      {
        id: 'all',
        name: 'Alle Optimierungen',
        icon: <Layers className="w-5 h-5" />,
        gradient: 'linear-gradient(135deg, #007AFF 0%, #AF52DE 100%)',
        count: optimizations.length
      }
    ];
    
    if (optimizationResult?.categories) {
      optimizationResult.categories.forEach((category: RevolutionaryCategory) => {
        if (category.issues.length > 0) {
          cats.push({
            id: category.tag,
            name: category.label,
            icon: <FileText className="w-5 h-5" />,
            gradient: 'linear-gradient(135deg, #5856D6 0%, #4840C0 100%)',
            count: category.issues.length
          });
        }
      });
    } else {
      // Fallback to original categories
      const categoryMap = new Map<string, number>();
      optimizations.forEach(opt => {
        categoryMap.set(opt.category, (categoryMap.get(opt.category) || 0) + 1);
      });
      
      const categoryGradients = {
        'termination': 'linear-gradient(135deg, #FF9500 0%, #FF7A00 100%)',
        'liability': 'linear-gradient(135deg, #FF3B30 0%, #E5302A 100%)',
        'payment': 'linear-gradient(135deg, #34C759 0%, #2EB150 100%)',
        'clarity': 'linear-gradient(135deg, #5AC8FA 0%, #40B8F0 100%)',
        'compliance': 'linear-gradient(135deg, #AF52DE 0%, #9B42C8 100%)'
      };
      
      categoryMap.forEach((count, cat) => {
        const labels = {
          'termination': 'Kündigung',
          'liability': 'Haftung',
          'payment': 'Zahlung',
          'clarity': 'Klarheit',
          'compliance': 'Compliance'
        };
        cats.push({
          id: cat,
          name: labels[cat as keyof typeof labels] || cat,
          icon: <FileText className="w-5 h-5" />,
          gradient: categoryGradients[cat as keyof typeof categoryGradients] || 'linear-gradient(135deg, #8E8E93 0%, #636366 100%)',
          count
        });
      });
    }
    
    return cats;
  }, [optimizations, optimizationResult]);

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
      <div className={styles.optimizer}>
        <div className={styles.backgroundGradient}></div>

        <motion.div 
          className={styles.container}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Header */}
          <motion.div 
            className={styles.header}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.h1 className={styles.title}>
              <Sparkles className="inline-block" />
              KI-Vertragsoptimierung
            </motion.h1>
            
            <motion.p className={styles.subtitle}>
              Lade deinen Vertrag hoch und wir machen ihn besser - einfach und automatisch.
            </motion.p>
          </motion.div>

          {/* Premium Notice */}
          {!isPremium && (
            <UnifiedPremiumNotice
              featureName="Der Vertragsoptimierer"
              
            />
          )}

          {/* Upload Area */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <motion.div 
              className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''} ${!isPremium ? styles.disabled : ''} ${file ? styles.uploadAreaWithFile : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={isPremium ? () => fileInputRef.current?.click() : undefined}
              whileHover={isPremium ? { scale: 1.01 } : undefined}
              whileTap={isPremium ? { scale: 0.99 } : undefined}
            >
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: 'none' }}
                accept="application/pdf"
                disabled={!isPremium}
                onChange={handleFileChange}
              />
              
              {file ? (
                <motion.div 
                  className={styles.fileInfo}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <div className={styles.fileIcon}>
                    <FileText size={32} />
                  </div>
                  <div className={styles.fileDetails}>
                    <div className={styles.fileName}>{file.name}</div>
                    <div className={styles.fileSize}>
                      <CheckCircle2 size={16} style={{ color: '#34C759' }} />
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Bereit für Analyse
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div className={styles.uploadPrompt}>
                  <motion.div 
                    className={styles.uploadIcon}
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                  >
                    <Upload size={48} />
                  </motion.div>
                  <h3>Vertrag hochladen</h3>
                  <p>PDF hierher ziehen oder klicken</p>
                </motion.div>
              )}
            </motion.div>

            {/* Action Buttons */}
            <motion.div className={styles.actionButtons}>
              <motion.button 
                onClick={handleUpload}
                disabled={!file || loading || !isPremium}
                className={styles.primaryButton}
                whileHover={file && isPremium && !loading ? { scale: 1.02 } : undefined}
                whileTap={file && isPremium && !loading ? { scale: 0.98 } : undefined}
              >
                {loading ? (
                  <>
                    <div className={styles.spinner}></div>
                    <span>Analyse läuft...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Vertrag analysieren</span>
                  </>
                )}
              </motion.button>
              
              {file && (
                <motion.button 
                  onClick={handleReset} 
                  className={styles.secondaryButton}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <RefreshCw size={18} />
                  <span>Zurücksetzen</span>
                </motion.button>
              )}
            </motion.div>
          </motion.div>

          {/* Analysis Progress - Enhanced with Visual Steps */}
          {isAnalyzing && (
            <motion.div
              className={styles.card}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ borderColor: '#007AFF', background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.03) 0%, rgba(175, 82, 222, 0.03) 100%)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="animate-spin w-5 h-5" style={{ color: '#007AFF' }} />
                  <span className="font-semibold">Rechtliche Analyse läuft...</span>
                </div>
                <span className="text-sm font-medium" style={{ color: '#007AFF' }}>{analysisProgress}%</span>
              </div>

              {/* 🎯 VISUAL PROGRESS STEPS */}
              <div className="flex items-center justify-between mb-4 gap-2">
                {ANALYSIS_STEPS.map((step, index) => {
                  const isCompleted = currentStep > step.id;
                  const isCurrent = currentStep === step.id;

                  return (
                    <div key={step.id} className="flex flex-col items-center flex-1">
                      {/* Step Icon */}
                      <motion.div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold mb-1"
                        style={{
                          background: isCompleted ? 'linear-gradient(135deg, #30D158 0%, #28B84C 100%)' :
                                     isCurrent ? 'linear-gradient(135deg, #007AFF 0%, #AF52DE 100%)' :
                                     '#E5E5EA',
                          color: isCompleted || isCurrent ? 'white' : '#8E8E93',
                          border: isCurrent ? '2px solid #007AFF' : 'none'
                        }}
                        animate={isCurrent ? { scale: [1, 1.05, 1] } : {}}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        {isCompleted ? '✓' : step.icon}
                      </motion.div>

                      {/* Step Label */}
                      <span
                        className="text-xs font-medium text-center"
                        style={{
                          color: isCompleted ? '#30D158' :
                                 isCurrent ? '#007AFF' :
                                 '#8E8E93'
                        }}
                      >
                        {step.label}
                      </span>

                      {/* Connector Line (except for last step) */}
                      {index < ANALYSIS_STEPS.length - 1 && (
                        <div
                          className="absolute h-0.5 top-6"
                          style={{
                            left: `calc(${(index + 0.5) / ANALYSIS_STEPS.length * 100}% + 24px)`,
                            width: `calc(${100 / ANALYSIS_STEPS.length}% - 48px)`,
                            background: isCompleted ? '#30D158' : '#E5E5EA',
                            zIndex: -1
                          }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mb-3">
                <motion.div
                  className="h-3 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #007AFF 0%, #AF52DE 100%)' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${analysisProgress}%` }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                />
              </div>

              {/* Progress Message */}
              <div className="text-sm text-gray-600 min-h-[20px]">
                {progressMessage || 'Starte Analyse...'}
              </div>
            </motion.div>
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

          {/* Toast - Enhanced Apple Style */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -50, scale: 0.9 }}
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 1000000,
                  background: toast.type === 'success' 
                    ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.95) 0%, rgba(46, 177, 80, 0.95) 100%)'
                    : toast.type === 'error'
                    ? 'linear-gradient(135deg, rgba(255, 59, 48, 0.95) 0%, rgba(229, 48, 42, 0.95) 100%)'
                    : 'linear-gradient(135deg, rgba(0, 122, 255, 0.95) 0%, rgba(0, 81, 213, 0.95) 100%)',
                  color: 'white',
                  padding: '1.25rem 2.5rem',
                  borderRadius: '20px',
                  boxShadow: '0 25px 60px rgba(0, 0, 0, 0.35)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'} {toast.message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Results Section */}
          <AnimatePresence>
            {optimizations.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                
                {/* Contract Type Card */}
                {optimizationResult?.meta && (
                  <motion.div 
                    className={styles.card}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: `linear-gradient(135deg, ${CONTRACT_TYPE_INFO[optimizationResult.meta.type as keyof typeof CONTRACT_TYPE_INFO]?.color || '#8E8E93'}15 0%, transparent 100%)`,
                      borderColor: CONTRACT_TYPE_INFO[optimizationResult.meta.type as keyof typeof CONTRACT_TYPE_INFO]?.color || '#8E8E93'
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {CONTRACT_TYPE_INFO[optimizationResult.meta.type as keyof typeof CONTRACT_TYPE_INFO]?.icon}
                        <div>
                          <h3 className="text-xl font-bold">
                            {CONTRACT_TYPE_INFO[optimizationResult.meta.type as keyof typeof CONTRACT_TYPE_INFO]?.name || 'Vertrag'} erkannt
                          </h3>
                          <div className="flex gap-4 text-sm text-gray-600 mt-1">
                            <span>📊 Konfidenz: {optimizationResult.meta.confidence}%</span>
                            <span>⚖️ {optimizationResult.meta.jurisdiction}</span>
                            <span>🌍 {optimizationResult.meta.language === 'de' ? 'Deutsch' : 'Englisch'}</span>
                            {optimizationResult.meta.gapsFound && <span>🔍 {optimizationResult.meta.gapsFound} Lücken</span>}
                          </div>
                        </div>
                      </div>
                      {optimizationResult.score && (
                        <div className="text-right">
                          <div className="text-3xl font-bold" style={{ color: CONTRACT_TYPE_INFO[optimizationResult.meta.type as keyof typeof CONTRACT_TYPE_INFO]?.color }}>
                            {optimizationResult.score.health}
                          </div>
                          <div className="text-sm text-gray-600">Health Score</div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {/* Contract Health Dashboard */}
                {contractScore && (
                  <ContractHealthDashboard 
                    score={contractScore}
                    showSimulation={false}
                    newScore={contractScore.overall}
                  />
                )}

                {/* Statistics Dashboard - SIMPLIFIED */}
                {statistics && showStatistics && (
                  <motion.div 
                    className={styles.card}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" style={{ color: '#007AFF' }} />
                        Analyse-Dashboard
                      </h3>
                      <button
                        onClick={() => setShowStatistics(false)}
                        className="text-gray-500 hover:text-gray-700 p-1 rounded-lg hover:bg-gray-100 transition-all"
                      >
                        <Minimize2 className="w-5 h-5" />
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <motion.div 
                        className="text-center p-3 rounded-xl cursor-pointer"
                        style={{ background: 'rgba(255, 59, 48, 0.1)' }}
                        whileHover={{ scale: 1.05 }}
                        onClick={() => setSelectedCategory('all')}
                      >
                        <div className="text-2xl font-bold" style={{ color: '#FF3B30' }}>{statistics.criticalCount}</div>
                        <div className="text-xs text-gray-600 font-medium">Kritisch</div>
                      </motion.div>
                      <motion.div 
                        className="text-center p-3 rounded-xl"
                        style={{ background: 'rgba(255, 149, 0, 0.1)' }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-2xl font-bold" style={{ color: '#FF9500' }}>{statistics.highCount}</div>
                        <div className="text-xs text-gray-600 font-medium">Hoch</div>
                      </motion.div>
                      <motion.div 
                        className="text-center p-3 rounded-xl"
                        style={{ background: 'rgba(255, 204, 0, 0.1)' }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-2xl font-bold" style={{ color: '#FFCC00' }}>{statistics.mediumCount}</div>
                        <div className="text-xs text-gray-600 font-medium">Mittel</div>
                      </motion.div>
                      <motion.div 
                        className="text-center p-3 rounded-xl"
                        style={{ background: 'rgba(52, 199, 89, 0.1)' }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-2xl font-bold" style={{ color: '#34C759' }}>{statistics.lowCount}</div>
                        <div className="text-xs text-gray-600 font-medium">Niedrig</div>
                      </motion.div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(0, 122, 255, 0.05)' }}>
                        <div className="text-sm text-gray-600">Ø Risiko</div>
                        <div className="text-lg font-bold" style={{ color: statistics.avgRisk >= 7 ? '#FF3B30' : statistics.avgRisk >= 5 ? '#FF9500' : '#34C759' }}>{statistics.avgRisk}/10</div>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(0, 122, 255, 0.05)' }}>
                        <div className="text-sm text-gray-600">Ø Impact</div>
                        <div className="text-lg font-bold" style={{ color: '#007AFF' }}>{statistics.avgImpact}/10</div>
                      </div>
                      <div className="text-center p-2 rounded-lg" style={{ background: 'rgba(0, 122, 255, 0.05)' }}>
                        <div className="text-sm text-gray-600">KI-Konfidenz</div>
                        <div className="text-lg font-bold" style={{ color: statistics.avgConfidence >= 85 ? '#34C759' : statistics.avgConfidence >= 70 ? '#FF9500' : '#FF3B30' }}>{statistics.avgConfidence}%</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* MAIN ACTION - MACH MEINEN VERTRAG BESSER! */}
                <motion.div 
                  className={styles.card}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(175, 82, 222, 0.05) 0%, rgba(255, 55, 95, 0.05) 100%)',
                    borderColor: '#AF52DE'
                  }}
                >
                  <div className="text-center">
                    <h3 className="text-2xl font-bold mb-2">
                      ✨ Dein Vertrag wurde analysiert
                    </h3>
                    <p className="text-gray-600 mb-6">
                      {optimizations.length} kritische Optimierungen identifiziert – Erstelle jetzt deinen rechtssicheren Vertrag
                    </p>
                    
                    <button
                      onClick={handleGenerateOptimizedContract}
                      disabled={isGeneratingContract || !file || optimizations.length === 0}
                      className={styles.bigGenerateButton}
                    >
                      {isGeneratingContract ? (
                        <>
                          <div className={styles.spinner}></div>
                          Dein Vertrag wird verbessert...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-6 h-6" />
                          ⚡ Optimierten Vertrag generieren
                        </>
                      )}
                    </button>
                    
                    {showAdvancedView && (
                      <p className="text-sm text-gray-500 mt-4">
                        {selectedOptimizations.size > 0 
                          ? `${selectedOptimizations.size} von ${optimizations.length} ausgewählt`
                          : 'Alle Optimierungen werden angewendet'}
                      </p>
                    )}
                  </div>
                </motion.div>

                {/* Category Filter - Apple Style */}
                <motion.div className={styles.card}>
                  <div className={styles.cardHeader}>
                    <Filter size={20} />
                    <span className={styles.cardTitle}>Dynamische Kategorien</span>
                    <span className={styles.categoryCount}>
                      {filteredOptimizations.length} Optimierungen
                    </span>
                  </div>
                  
                  <div className={styles.buttonGroup}>
                    {dynamicCategories.map(category => (
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={`${styles.categoryButton} ${selectedCategory === category.id ? styles.categoryButtonActive : ''}`}
                        data-category={category.id}
                      >
                        {category.icon}
                        {category.name}
                        <span className={styles.categoryBadge}>
                          {category.count}
                        </span>
                      </button>
                    ))}
                  </div>
                </motion.div>

                {/* Additional Options - SIMPLIFIED */}
                <motion.div className={styles.card}>
                  <div className={styles.controlPanel}>
                    <button
                      onClick={() => setShowAdvancedView(!showAdvancedView)}
                      className={styles.secondaryButton}
                    >
                      <Settings className="w-4 h-4" />
                      {showAdvancedView ? 'Einfache Ansicht' : 'Einzelne auswählen'}
                    </button>

                    {/* 🎯 PHASE 1 - FEATURE 2: Quick Wins Sort Button */}
                    <button
                      onClick={() => setShowQuickWinsFirst(!showQuickWinsFirst)}
                      className={styles.secondaryButton}
                      style={{
                        background: showQuickWinsFirst ? '#007AFF' : 'white',
                        color: showQuickWinsFirst ? 'white' : '#1d1d1f',
                        borderColor: showQuickWinsFirst ? '#007AFF' : '#d1d1d6'
                      }}
                    >
                      <Zap className="w-4 h-4" />
                      {showQuickWinsFirst ? '✅ Einfache zuerst' : 'Einfache zuerst'}
                    </button>
                    
                    <div className={styles.dropdownGroup}>
                      <button
                        ref={pitchButtonRef}
                        onClick={() => setShowPitchMenu(!showPitchMenu)}
                        className={styles.secondaryButton}
                      >
                        <Mail className="w-4 h-4" />
                        Pitch
                        {showPitchMenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      
                      <button
                        ref={exportButtonRef}
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className={styles.secondaryButton}
                      >
                        <Download className="w-4 h-4" />
                        Export
                        {showExportMenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </motion.div>

                {/* Portal Dropdowns */}
                <DropdownPortal isOpen={showPitchMenu} targetRef={pitchButtonRef}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    data-portal-dropdown
                    className="p-4 min-w-[280px]"
                  >
                    <h5 className="font-semibold mb-3">Pitch-Stil wählen:</h5>
                    {pitchStyles.map(style => (
                      <motion.button
                        key={style.id}
                        onClick={() => generatePitch(style.id)}
                        className="w-full p-3 mb-2 rounded-lg flex items-center gap-3"
                        whileHover={{ x: 4 }}
                      >
                        {style.icon}
                        <div className="text-left">
                          <div className="font-semibold">{style.name}</div>
                          <div className="text-sm text-gray-600">{style.description}</div>
                        </div>
                        <ArrowRight className="w-4 h-4 ml-auto text-gray-400" />
                      </motion.button>
                    ))}
                  </motion.div>
                </DropdownPortal>

                <DropdownPortal isOpen={showExportMenu} targetRef={exportButtonRef} position="right">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    data-portal-dropdown
                    className="p-4 min-w-[300px]"
                  >
                    <h5 className="font-semibold mb-3">Export-Format:</h5>
                    {exportOptions.map(option => (
                      <motion.button
                        key={option.id}
                        onClick={() => handleExport()}
                        disabled={option.premium && !isPremium}
                        className="w-full p-3 mb-2 rounded-lg flex items-center gap-3 disabled:opacity-50"
                        whileHover={!option.premium || isPremium ? { x: 4 } : undefined}
                      >
                        {option.icon}
                        <div className="text-left flex-1">
                          <div className="font-semibold flex items-center gap-2">
                            {option.name}
                            {option.premium && <Lock className="w-3 h-3" />}
                          </div>
                          <div className="text-sm text-gray-600">{option.description}</div>
                        </div>
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded font-medium">{option.format}</span>
                      </motion.button>
                    ))}
                  </motion.div>
                </DropdownPortal>

                {/* Optimization Cards - SIMPLIFIED */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold px-2">
                    {showAdvancedView ? 'Wähle die gewünschten Optimierungen aus:' : 'Gefundene Optimierungen:'}
                  </h3>
                  {filteredOptimizations.map((optimization, index) => (
                    <motion.div
                      key={optimization.id}
                      className={styles.card}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={{
                        opacity: selectedOptimizations.has(optimization.id) ? 1 : (showAdvancedView ? 0.7 : 1)
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

                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          {/* 🎯 NEUE HEADLINE - Konkrete Beschreibung statt generischer Kategorie */}
                          <h3 className="text-xl font-bold text-gray-900 mb-2 leading-tight">
                            {optimization.summary ||
                              (optimization.category === 'termination' ? 'Kündigung & Laufzeit' :
                               optimization.category === 'liability' ? 'Haftung & Risiko' :
                               optimization.category === 'payment' ? 'Vergütung & Zahlung' :
                               optimization.category === 'compliance' ? 'Compliance & DSGVO' : 'Klarheit & Präzision')}
                          </h3>

                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            {/* Kategorie als kleiner Tag */}
                            <span className="text-xs font-medium text-gray-500 px-2 py-0.5 rounded bg-gray-100">
                              {optimization.category === 'termination' ? 'Kündigung & Laufzeit' :
                               optimization.category === 'liability' ? 'Haftung & Risiko' :
                               optimization.category === 'payment' ? 'Vergütung & Zahlung' :
                               optimization.category === 'compliance' ? 'Compliance & DSGVO' : 'Klarheit & Präzision'}
                            </span>

                            <span className={`px-2.5 py-1 text-xs rounded-full font-semibold ${
                              optimization.priority === 'critical' ? 'bg-red-100 text-red-700' :
                              optimization.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              optimization.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                              'bg-green-100 text-green-700'
                            }`}>
                              {optimization.priority === 'critical' ? 'Kritisch' :
                               optimization.priority === 'high' ? 'Hoch' :
                               optimization.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                            </span>

                            {/* 🎯 PHASE 1 - FEATURE 2: Difficulty Badge */}
                            <span className={`px-2.5 py-1 text-xs rounded-full font-semibold flex items-center gap-1 ${
                              optimization.implementationDifficulty === 'easy' ? 'bg-green-50 text-green-700 border border-green-200' :
                              optimization.implementationDifficulty === 'medium' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                              'bg-red-50 text-red-700 border border-red-200'
                            }`}>
                              {optimization.implementationDifficulty === 'easy' ? '🟢 Einfach umsetzbar' :
                               optimization.implementationDifficulty === 'medium' ? '🟡 Mittlerer Aufwand' :
                               '🔴 Professionelle Hilfe empfohlen'}
                            </span>
                          </div>

                          <div className="flex gap-4 text-sm text-gray-600 font-medium">
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

                      {/* 🎯 PHASE 1 - FEATURE 3: Toggle between Reasoning and Before/After View */}
                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => {
                            const newMap = new Map(diffViewEnabled);
                            newMap.set(optimization.id, false);
                            setDiffViewEnabled(newMap);
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            !diffViewEnabled.get(optimization.id)
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <AlignLeft className="w-3.5 h-3.5" />
                          💬 Warum optimieren?
                        </button>
                        <button
                          onClick={() => {
                            const newMap = new Map(diffViewEnabled);
                            newMap.set(optimization.id, true);
                            setDiffViewEnabled(newMap);
                          }}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            diffViewEnabled.get(optimization.id)
                              ? 'bg-blue-500 text-white shadow-md'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <Code2 className="w-3.5 h-3.5" />
                          📄 Vorher → Nachher
                        </button>
                      </div>

                      {/* Content */}
                      <div className="p-3 rounded-lg" style={{ background: 'rgba(142, 142, 147, 0.08)' }}>
                        {/* Show Reasoning or Before/After based on toggle */}
                        {!diffViewEnabled.get(optimization.id) ? (
                          /* WARUM OPTIMIEREN? - Die KI-Begründung */
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <AlignLeft className="w-4 h-4" style={{ color: '#007AFF' }} />
                              <span className="text-xs font-bold text-gray-700">WARUM IST DAS WICHTIG?</span>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed">{optimization.reasoning}</p>
                          </div>
                        ) : (
                          /* VORHER → NACHHER - Klausel-Vergleich */
                          <div className="space-y-3">
                            <div className="text-center">
                              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold" style={{ background: 'rgba(0, 122, 255, 0.1)', color: '#007AFF' }}>
                                <Code2 className="w-3.5 h-3.5" />
                                WAS WIRD KONKRET GEÄNDERT?
                              </span>
                            </div>

                            {/* VORHER Box */}
                            <div className="rounded-lg border-2 border-red-200" style={{ background: 'rgba(255, 59, 48, 0.05)' }}>
                              <div className="px-3 py-2 border-b border-red-200" style={{ background: 'rgba(255, 59, 48, 0.1)' }}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-red-700">❌ VORHER (Aktuell in Ihrem Vertrag)</span>
                                </div>
                              </div>
                              <div className="p-3">
                                {optimization.original === "FEHLT" || optimization.original.includes("FEHLT") ? (
                                  <div className="flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <p className="text-sm font-bold text-red-700">Diese Klausel fehlt komplett!</p>
                                      <p className="text-xs text-gray-600 mt-1">In Ihrem aktuellen Vertrag ist dieser wichtige Absatz nicht vorhanden.</p>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                    {optimization.original.length > 300 ? optimization.original.substring(0, 300) + '...' : optimization.original}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Pfeil */}
                            <div className="flex justify-center">
                              <div className="px-4 py-2 rounded-full" style={{ background: 'linear-gradient(135deg, #007AFF 0%, #34C759 100%)', color: 'white' }}>
                                <span className="text-xs font-bold">⬇️ WIRD ERSETZT DURCH</span>
                              </div>
                            </div>

                            {/* NACHHER Box */}
                            <div className="rounded-lg border-2 border-green-200" style={{ background: 'rgba(52, 199, 89, 0.05)' }}>
                              <div className="px-3 py-2 border-b border-green-200" style={{ background: 'rgba(52, 199, 89, 0.1)' }}>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-green-700">✅ NACHHER (Optimierte Version)</span>
                                </div>
                              </div>
                              <div className="p-3">
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
                                  {optimization.improved.length > 500 ? optimization.improved.substring(0, 500) + '...' : optimization.improved}
                                </p>
                                {optimization.improved.length > 500 && (
                                  <p className="text-xs text-blue-600 mt-2 flex items-center gap-1">
                                    <Shield className="w-3 h-3" />
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

                      {/* 🎯 PHASE 1 - FEATURE 4: Impact-Vorschau */}
                      <div className="mt-4 p-4 rounded-xl border border-gray-200" style={{ background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.03) 0%, rgba(175, 82, 222, 0.03) 100%)' }}>
                        <h5 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" style={{ color: '#007AFF' }} />
                          AUSWIRKUNGEN DIESER OPTIMIERUNG
                        </h5>

                        <div className="space-y-3">
                          {/* Rechtsschutz Level */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <Shield className="w-3.5 h-3.5" style={{ color: '#34C759' }} />
                                <span className="text-xs font-semibold text-gray-700">Rechtsschutz</span>
                              </div>
                              <span className="text-xs font-bold" style={{ color: '#34C759' }}>
                                {optimization.legalRisk <= 3 ? 'Stark' : optimization.legalRisk <= 6 ? 'Mittel' : 'Schwach'}
                                {' → '}
                                <span style={{ color: '#34C759' }}>Stark</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.max(20, 100 - (optimization.legalRisk || 5) * 10)}%`,
                                    background: (optimization.legalRisk || 5) >= 7 ? '#FF3B30' : (optimization.legalRisk || 5) >= 4 ? '#FF9500' : '#34C759'
                                  }}
                                />
                              </div>
                              <div className="text-xs text-gray-400">→</div>
                              <div className="flex-1 h-2 bg-gradient-to-r from-green-400 to-green-500 rounded-full" />
                            </div>
                          </div>

                          {/* Verhandlungsposition */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <TrendingUp className="w-3.5 h-3.5" style={{ color: '#007AFF' }} />
                                <span className="text-xs font-semibold text-gray-700">Verhandlungsposition</span>
                              </div>
                              <span className="text-xs font-bold" style={{ color: '#007AFF' }}>
                                {(optimization.businessImpact || 5) <= 3 ? 'Ungünstig' : (optimization.businessImpact || 5) <= 7 ? 'Neutral' : 'Vorteilhaft'}
                                {' → '}
                                <span style={{ color: '#007AFF' }}>Vorteilhaft</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.max(20, (optimization.businessImpact || 5) * 10)}%`,
                                    background: (optimization.businessImpact || 5) >= 7 ? '#34C759' : (optimization.businessImpact || 5) >= 4 ? '#FF9500' : '#FF3B30'
                                  }}
                                />
                              </div>
                              <div className="text-xs text-gray-400">→</div>
                              <div className="flex-1 h-2 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" />
                            </div>
                          </div>

                          {/* Risiko-Reduktion */}
                          <div>
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5" style={{ color: '#FF9500' }} />
                                <span className="text-xs font-semibold text-gray-700">Risiko-Level</span>
                              </div>
                              <span className="text-xs font-bold" style={{ color: '#FF3B30' }}>
                                {(optimization.legalRisk || 5) >= 7 ? 'Hoch' : (optimization.legalRisk || 5) >= 4 ? 'Mittel' : 'Niedrig'}
                                {' → '}
                                <span style={{ color: '#34C759' }}>Niedrig</span>
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-500"
                                  style={{
                                    width: `${Math.max(20, (optimization.legalRisk || 5) * 10)}%`,
                                    background: (optimization.legalRisk || 5) >= 7 ? '#FF3B30' : (optimization.legalRisk || 5) >= 4 ? '#FF9500' : '#34C759'
                                  }}
                                />
                              </div>
                              <div className="text-xs text-gray-400">→</div>
                              <div className="flex-1 h-2 bg-gradient-to-r from-green-400 to-green-500 rounded-full" />
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs text-gray-600">
                            <strong>💡 Nutzen:</strong> {optimization.marketBenchmark}
                          </p>
                        </div>
                      </div>

                      {/* Additional Info */}
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">Benchmark:</span>
                          <span className="ml-2 font-medium">{optimization.marketBenchmark}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">Umsetzung:</span>
                          <span className="ml-2 font-medium">
                            {optimization.implementationDifficulty === 'easy' ? 'Einfach' :
                             optimization.implementationDifficulty === 'medium' ? 'Mittel' : 'Komplex'}
                          </span>
                        </div>
                      </div>

                      {/* 🧠 PHASE 1: Einfach erklärt Button */}
                      <motion.button
                        onClick={() => setExplanationPopup({ show: true, optimization })}
                        className="absolute top-4 right-16 p-2 bg-white rounded-lg hover:bg-gradient-to-r hover:from-orange-50 hover:to-orange-100 shadow-sm border border-orange-200"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        title="Einfach erklärt"
                      >
                        <Lightbulb className="w-4 h-4" style={{ color: '#FF9500' }} />
                      </motion.button>

                      {/* Copy Button */}
                      <motion.button
                        onClick={() => {
                          navigator.clipboard.writeText(`${optimization.improved}\n\nBegründung: ${optimization.reasoning}`);
                          showToast("✅ Kopiert!", 'success');
                        }}
                        className="absolute top-4 right-4 p-2 bg-white rounded-lg hover:bg-gray-100 shadow-sm"
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Copy className="w-4 h-4" />
                      </motion.button>
                    </motion.div>
                  ))}
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

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
    </>
  );
}
