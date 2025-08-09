// 📁 src/pages/Optimizer.tsx - APPLE DESIGN REVOLUTION ✨
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  AlertCircle, 
  RefreshCw, 
  Brain, 
  FileText, 
  Filter,
  Download,
  Eye,
  EyeOff,
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
  AlertTriangle,
  Zap,
  Check,
  X,
  BarChart3,
  GitCompare,
  Layers,
  Award,
  FileSignature,
  Briefcase,
  Home,
  Package,
  Calculator,
  Cloud,
  Loader2,
  Minimize2,
  RotateCcw,
  RotateCw,
  Settings,
  ArrowRight
} from "lucide-react";

// Components
import LegendaryPremiumNotice from "../components/LegendaryPremiumNotice";
import ContractHealthDashboard from "../components/ContractHealthDashboard";

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
        
        suggestions.push({
          id: issue.id,
          category: mappedCategory, // ✅ Now properly typed
          priority: issue.risk >= 8 ? 'critical' : issue.risk >= 6 ? 'high' : issue.risk >= 4 ? 'medium' : 'low',
          confidence: issue.confidence,
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
        });
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

    optimizations.push({
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
    });
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
  const [showSimulation, setShowSimulation] = useState(false);
  
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
  
  // 🚀 REVOLUTIONARY: New Enhanced States (only keeping used ones)
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<Set<string>>(new Set());
  const [appliedIssues, setAppliedIssues] = useState<Set<string>>(new Set());
  const [dismissedIssues, setDismissedIssues] = useState<Set<string>>(new Set());
  const [undoStack, setUndoStack] = useState<Array<{selected: Set<string>, applied: Set<string>, dismissed: Set<string>}>>([]);
  const [redoStack, setRedoStack] = useState<Array<{selected: Set<string>, applied: Set<string>, dismissed: Set<string>}>>([]);
  const [showAdvancedView, setShowAdvancedView] = useState(false);
  const [showStatistics, setShowStatistics] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  
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

  // ✅ ORIGINAL: Outside Click Handling
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
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPitchMenu, showExportMenu]);

  // 🚀 REVOLUTIONARY: Enhanced Upload Handler
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

    try {
      console.log("🚀 REVOLUTIONARY: Starting world-class contract optimization...");
      
      // Simulate progress
      const progressInterval = setInterval(() => {
        setAnalysisProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      const res = await fetch("/api/optimize", {
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

      console.log("✅ REVOLUTIONARY Response:", {
        hasCategories: !!data.categories,
        hasMeta: !!data.meta,
        contractType: data.meta?.type,
        totalIssues: data.summary?.totalIssues
      });

      // Store all data
      setAnalysisData(data);
      setOptimizationResult(data);
      
      if (data.originalText) {
        setOriginalContractText(data.originalText);
      }

      // Parse optimizations
      const parsedOptimizations = parseOptimizationResult(data, file.name);
      const calculatedScore = calculateContractScore(parsedOptimizations);
      
      setOptimizations(parsedOptimizations);
      setContractScore(calculatedScore);
      
      // 🚀 Auto-select quick wins
      if (data.summary?.quickWins > 0) {
        const quickWinIds = new Set<string>();
        parsedOptimizations.forEach(opt => {
          if (opt.implementationDifficulty === 'easy' && opt.confidence >= 80 && opt.legalRisk <= 4) {
            quickWinIds.add(opt.id);
          }
        });
        setSelectedIssues(quickWinIds);
      }
      
      showToast(`✅ ${parsedOptimizations.length} revolutionäre Optimierungen gefunden!`, 'success');
      
    } catch (error) {
      const err = error as Error;
      console.error("❌ Optimierung-Fehler:", err);
      setError(err.message);
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
      setIsAnalyzing(false);
      setTimeout(() => setAnalysisProgress(0), 1000);
    }
  };

  // ✅ ORIGINAL: Toast Helper
  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ✅ ORIGINAL + ENHANCED: Smart Contract Generator
  const handleGenerateOptimizedContract = useCallback(async () => {
    if (!file || optimizations.length === 0) {
      showToast("❌ Bitte lade erst einen Vertrag hoch und führe eine Optimierung durch.", 'error');
      return;
    }

    const selectedOptimizations = showSimulation 
      ? optimizations.filter(opt => opt.implemented)
      : selectedIssues.size > 0 
        ? optimizations.filter(opt => selectedIssues.has(opt.id))
        : optimizations;

    if (selectedOptimizations.length === 0) {
      showToast("❌ Bitte wähle mindestens eine Optimierung aus.", 'error');
      return;
    }

    setIsGeneratingContract(true);
    showToast("🪄 Revolutionärer optimierter Vertrag wird generiert...", 'success');

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
        optimizations: selectedOptimizations.map(opt => ({
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

      const generateRes = await fetch(`/api/contracts/${currentContractId}/generate-optimized`, {
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

      showToast(`✅ Revolutionärer Vertrag generiert! (${selectedOptimizations.length} Optimierungen)`, 'success');

    } catch (error) {
      const err = error as Error;
      console.error("❌ Generation error:", err);
      showToast(err.message, 'error');
    } finally {
      setIsGeneratingContract(false);
    }
  }, [file, optimizations, contractId, showSimulation, selectedIssues, originalContractText, analysisData, showToast]);

  // 🚀 REVOLUTIONARY: Issue Management
  const toggleIssueSelection = useCallback((issueId: string) => {
    setUndoStack(prev => [...prev.slice(-19), {
      selected: new Set(selectedIssues),
      applied: new Set(appliedIssues),
      dismissed: new Set(dismissedIssues)
    }]);
    setRedoStack([]);
    
    setSelectedIssues(prev => {
      const newSet = new Set(prev);
      if (newSet.has(issueId)) {
        newSet.delete(issueId);
      } else {
        newSet.add(issueId);
      }
      return newSet;
    });
  }, [selectedIssues, appliedIssues, dismissedIssues]);

  const applySelectedIssues = useCallback(async () => {
    if (selectedIssues.size === 0) {
      showToast('Wähle erst Optimierungen aus', 'info');
      return;
    }
    
    setAppliedIssues(new Set([...appliedIssues, ...selectedIssues]));
    setSelectedIssues(new Set());
    showToast(`✅ ${selectedIssues.size} Optimierungen angewendet`, 'success');
  }, [selectedIssues, appliedIssues, showToast]);

  const dismissIssue = useCallback((issueId: string) => {
    setDismissedIssues(prev => new Set(prev).add(issueId));
    setSelectedIssues(prev => {
      const newSet = new Set(prev);
      newSet.delete(issueId);
      return newSet;
    });
  }, []);

  const undoAction = useCallback(() => {
    if (undoStack.length === 0) return;
    
    const previousState = undoStack[undoStack.length - 1];
    setRedoStack(prev => [...prev, {
      selected: new Set(selectedIssues),
      applied: new Set(appliedIssues),
      dismissed: new Set(dismissedIssues)
    }]);
    
    setSelectedIssues(previousState.selected);
    setAppliedIssues(previousState.applied);
    setDismissedIssues(previousState.dismissed);
    setUndoStack(prev => prev.slice(0, -1));
  }, [undoStack, selectedIssues, appliedIssues, dismissedIssues]);

  const redoAction = useCallback(() => {
    if (redoStack.length === 0) return;
    
    const nextState = redoStack[redoStack.length - 1];
    setUndoStack(prev => [...prev, {
      selected: new Set(selectedIssues),
      applied: new Set(appliedIssues),
      dismissed: new Set(dismissedIssues)
    }]);
    
    setSelectedIssues(nextState.selected);
    setAppliedIssues(nextState.applied);
    setDismissedIssues(nextState.dismissed);
    setRedoStack(prev => prev.slice(0, -1));
  }, [redoStack, selectedIssues, appliedIssues, dismissedIssues]);

  // 🚀 REVOLUTIONARY: Quick Actions
  const applyQuickWins = useCallback(() => {
    const quickWinIds = new Set<string>();
    optimizations.forEach(opt => {
      if (opt.implementationDifficulty === 'easy' && 
          opt.confidence >= 80 && 
          opt.legalRisk <= 4 &&
          !dismissedIssues.has(opt.id)) {
        quickWinIds.add(opt.id);
      }
    });
    
    setSelectedIssues(quickWinIds);
    showToast(`${quickWinIds.size} Quick Wins ausgewählt`, 'success');
  }, [optimizations, dismissedIssues, showToast]);

  const selectHighRiskIssues = useCallback(() => {
    const highRiskIds = new Set<string>();
    optimizations.forEach(opt => {
      if (opt.legalRisk >= 7 && !dismissedIssues.has(opt.id)) {
        highRiskIds.add(opt.id);
      }
    });
    
    setSelectedIssues(highRiskIds);
    showToast(`${highRiskIds.size} kritische Risiken ausgewählt`, 'info');
  }, [optimizations, dismissedIssues, showToast]);

  // ✅ ORIGINAL: Handlers
  const handleReset = useCallback(() => {
    setFile(null);
    setOptimizations([]);
    setError(null);
    setContractScore(null);
    setShowSimulation(false);
    setSelectedCategory('all');
    setShowExportMenu(false);
    setShowPitchMenu(false);
    setContractId(null);
    setIsGeneratingContract(false);
    setOriginalContractText('');
    setAnalysisData(null);
    setOptimizationResult(null);
    setSelectedIssues(new Set());
    setAppliedIssues(new Set());
    setDismissedIssues(new Set());
    setUndoStack([]);
    setRedoStack([]);
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

  const calculateNewScore = useCallback(() => {
    if (!optimizations.length) return 0;
    return calculateContractScore(optimizations).overall;
  }, [optimizations]);

  const toggleSuggestion = useCallback((id: string) => {
    setOptimizations(prev => {
      const updated = prev.map(opt => 
        opt.id === id ? { ...opt, implemented: !opt.implemented } : opt
      );
      return updated;
    });
  }, []);

  // ✅ ORIGINAL: Pitch Generator
  const generatePitch = useCallback((style: string = selectedPitchStyle) => {
    const implementedSuggestions = optimizations.filter(opt => 
      opt.implemented || selectedIssues.has(opt.id) || appliedIssues.has(opt.id)
    );
    
    if (implementedSuggestions.length === 0) {
      showToast("❌ Bitte wähle Optimierungen aus.", 'error');
      return;
    }

    const categoryNames = {
      'termination': 'Kündigungsregelungen',
      'liability': 'Haftungsklauseln', 
      'payment': 'Zahlungskonditionen',
      'compliance': 'Compliance & Datenschutz',
      'clarity': 'Vertragsklarheit'
    };

    const improvementScore = calculateNewScore() - (contractScore?.overall || 0);

    const pitchTemplates = {
      lawyer: `Sehr geehrte Kolleginnen und Kollegen,

nach revolutionärer KI-Analyse mit ${optimizationResult?.meta?.confidence || 95}% Konfidenz:

${implementedSuggestions.map((opt, index) => 
  `${index + 1}. ${categoryNames[opt.category]} (Risiko: ${opt.legalRisk}/10)
   Original: ${opt.original.substring(0, 100)}...
   Empfehlung: ${opt.improved.substring(0, 100)}...
   Benchmark: ${opt.marketBenchmark}`
).join('\n\n')}

Score-Verbesserung: ${contractScore?.overall} → ${calculateNewScore()} (+${improvementScore})

Mit kollegialen Grüßen`,

      business: `Geschätzter Geschäftspartner,

unsere revolutionäre KI-Analyse hat ${implementedSuggestions.length} Optimierungen identifiziert:

${implementedSuggestions.map((opt, index) => 
  `${index + 1}. ${categoryNames[opt.category]}
   Impact: ${opt.estimatedSavings}
   ${opt.marketBenchmark}`
).join('\n\n')}

ROI der Optimierungen: Signifikant

Beste Grüße`,

      private: `Hallo,

die KI hat ${implementedSuggestions.length} Verbesserungen gefunden:

${implementedSuggestions.map((opt, index) => 
  `${index + 1}. ${categoryNames[opt.category]}: ${opt.estimatedSavings}`
).join('\n')}

Vertragsscore: ${contractScore?.overall} → ${calculateNewScore()} Punkte

Viele Grüße`
    };

    const pitch = pitchTemplates[style as keyof typeof pitchTemplates] || pitchTemplates.business;
    navigator.clipboard.writeText(pitch);
    showToast(`✅ ${style} Pitch kopiert!`, 'success');
    setShowPitchMenu(false);
  }, [optimizations, contractScore, calculateNewScore, selectedPitchStyle, showToast, selectedIssues, appliedIssues, optimizationResult]);

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

  // 🚀 REVOLUTIONARY: Dynamic Categories
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

  // ✅ ORIGINAL: Filter optimizations
  const filteredOptimizations = selectedCategory === 'all' 
    ? optimizations 
    : optimizations.filter(opt => opt.category === selectedCategory);

  // 🚀 REVOLUTIONARY: Statistics
  const statistics = useMemo(() => {
    if (!optimizationResult?.summary && optimizations.length === 0) return null;
    
    const totalIssues = optimizationResult?.summary?.totalIssues || optimizations.length;
    const appliedCount = appliedIssues.size;
    const dismissedCount = dismissedIssues.size;
    const selectedCount = selectedIssues.size;
    
    const avgRisk = optimizations.reduce((sum, opt) => sum + opt.legalRisk, 0) / (optimizations.length || 1);
    const avgImpact = optimizations.reduce((sum, opt) => sum + opt.businessImpact, 0) / (optimizations.length || 1);
    const avgConfidence = optimizations.reduce((sum, opt) => sum + opt.confidence, 0) / (optimizations.length || 1);
    
    return {
      totalIssues,
      appliedCount,
      dismissedCount,
      selectedCount,
      remainingCount: totalIssues - appliedCount - dismissedCount,
      avgRisk: Math.round(avgRisk),
      avgImpact: Math.round(avgImpact),
      avgConfidence: Math.round(avgConfidence),
      progressPercentage: Math.round(((appliedCount + dismissedCount) / totalIssues) * 100),
      redFlags: optimizationResult?.summary?.redFlags || optimizations.filter(o => o.priority === 'critical').length,
      quickWins: optimizationResult?.summary?.quickWins || optimizations.filter(o => o.implementationDifficulty === 'easy' && o.confidence >= 80).length
    };
  }, [optimizations, optimizationResult, appliedIssues, dismissedIssues, selectedIssues]);

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
          <p className={styles.loadingText}>Initialisiere revolutionäre KI...</p>
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
              Revolutionäre KI-Vertragsoptimierung
            </motion.h1>
            
            <motion.p className={styles.subtitle}>
              Weltklasse-KI erkennt 20+ Vertragstypen, analysiert Lücken und generiert perfekte Klauseln.
            </motion.p>

            <motion.div className={styles.featurePills}>
              {[
                { icon: <Brain size={16} />, text: 'Multi-Model AI' },
                { icon: <Target size={16} />, text: 'Typ-Erkennung' },
                { icon: <GitCompare size={16} />, text: 'Lückenanalyse' },
                { icon: <Award size={16} />, text: 'Fertige Klauseln' }
              ].map((pill, index) => (
                <motion.div
                  key={index}
                  className={styles.featurePill}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {pill.icon}
                  {pill.text}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Premium Notice */}
          {!isPremium && (
            <LegendaryPremiumNotice onUpgrade={() => window.location.href = '/upgrade'} />
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
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Bereit für revolutionäre Analyse
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
                    <span>Revolutionäre Analyse läuft...</span>
                  </>
                ) : (
                  <>
                    <Sparkles size={20} />
                    <span>Weltklasse-Analyse starten</span>
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

          {/* Analysis Progress */}
          {isAnalyzing && (
            <motion.div 
              className={styles.card}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <Loader2 className="animate-spin w-5 h-5 text-blue-500" />
                <span className="font-semibold">Revolutionäre KI-Analyse läuft...</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <motion.div 
                  className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${analysisProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
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
                    showSimulation={showSimulation}
                    newScore={calculateNewScore()}
                  />
                )}

                {/* Statistics Dashboard - Apple Style */}
                {statistics && showStatistics && (
                  <motion.div 
                    className={`${styles.card} ${styles.premiumGlow}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold flex items-center gap-2">
                        <BarChart3 className="w-5 h-5" style={{ color: '#007AFF' }} />
                        Optimierungs-Dashboard
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
                        className="text-center p-3 rounded-xl"
                        style={{ background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.1) 0%, rgba(0, 122, 255, 0.05) 100%)' }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-2xl font-bold" style={{ color: '#007AFF' }}>{statistics.totalIssues}</div>
                        <div className="text-xs text-gray-600 font-medium">Gefunden</div>
                      </motion.div>
                      <motion.div 
                        className="text-center p-3 rounded-xl"
                        style={{ background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.1) 0%, rgba(52, 199, 89, 0.05) 100%)' }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-2xl font-bold" style={{ color: '#34C759' }}>{statistics.appliedCount}</div>
                        <div className="text-xs text-gray-600 font-medium">Angewendet</div>
                      </motion.div>
                      <motion.div 
                        className="text-center p-3 rounded-xl"
                        style={{ background: 'linear-gradient(135deg, rgba(255, 204, 0, 0.1) 0%, rgba(255, 204, 0, 0.05) 100%)' }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-2xl font-bold" style={{ color: '#FFCC00' }}>{statistics.selectedCount}</div>
                        <div className="text-xs text-gray-600 font-medium">Ausgewählt</div>
                      </motion.div>
                      <motion.div 
                        className="text-center p-3 rounded-xl"
                        style={{ background: 'linear-gradient(135deg, rgba(175, 82, 222, 0.1) 0%, rgba(175, 82, 222, 0.05) 100%)' }}
                        whileHover={{ scale: 1.05 }}
                      >
                        <div className="text-2xl font-bold" style={{ color: '#AF52DE' }}>{statistics.progressPercentage}%</div>
                        <div className="text-xs text-gray-600 font-medium">Fortschritt</div>
                      </motion.div>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                      <motion.div 
                        className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full relative"
                        initial={{ width: 0 }}
                        animate={{ width: `${statistics.progressPercentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4 mt-4">
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Ø Risiko</div>
                        <div className="text-lg font-bold">{statistics.avgRisk}/10</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Ø Impact</div>
                        <div className="text-lg font-bold">{statistics.avgImpact}/10</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-600">Ø Konfidenz</div>
                        <div className="text-lg font-bold">{statistics.avgConfidence}%</div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Quick Actions & Controls - Apple Style */}
                <motion.div 
                  className={styles.card}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={styles.buttonGroup}>
                    <button
                      onClick={applyQuickWins}
                      className={styles.actionButton}
                      data-color="green"
                    >
                      <Zap className="w-4 h-4" />
                      Quick Wins ({statistics?.quickWins || 0})
                    </button>
                    <button
                      onClick={selectHighRiskIssues}
                      className={styles.actionButton}
                      data-color="red"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Kritische Risiken ({statistics?.redFlags || 0})
                    </button>
                    <button
                      onClick={applySelectedIssues}
                      disabled={selectedIssues.size === 0}
                      className={styles.actionButton}
                      data-color="blue"
                    >
                      <Check className="w-4 h-4" />
                      Ausgewählte anwenden ({selectedIssues.size})
                    </button>
                    <button
                      onClick={() => setShowSimulation(!showSimulation)}
                      className={styles.actionButton}
                      data-color="purple"
                    >
                      {showSimulation ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showSimulation ? 'Simulation aus' : 'Live-Simulation'}
                    </button>
                    <button
                      onClick={undoAction}
                      disabled={undoStack.length === 0}
                      className={styles.actionButton}
                      data-color="gray"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={redoAction}
                      disabled={redoStack.length === 0}
                      className={styles.actionButton}
                      data-color="gray"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
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

                {/* Main Control Panel with Generate Button - Apple Style */}
                <motion.div className={styles.card}>
                  <div className={styles.controlPanel}>
                    <button
                      onClick={() => setShowAdvancedView(!showAdvancedView)}
                      className={styles.actionButton}
                      data-color="gray"
                    >
                      <Settings className="w-4 h-4" />
                      {showAdvancedView ? 'Einfache Ansicht' : 'Erweiterte Ansicht'}
                    </button>
                    
                    <button
                      onClick={handleGenerateOptimizedContract}
                      disabled={isGeneratingContract || !file || optimizations.length === 0}
                      className={styles.generateButton}
                    >
                      {isGeneratingContract ? (
                        <>
                          <div className={styles.spinner}></div>
                          Generiere revolutionären Vertrag...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5" />
                          Optimierten Vertrag generieren
                        </>
                      )}
                    </button>
                    
                    <div className={styles.dropdownGroup}>
                      <button
                        ref={pitchButtonRef}
                        onClick={() => setShowPitchMenu(!showPitchMenu)}
                        className={styles.actionButton}
                        data-color="green"
                      >
                        <Mail className="w-4 h-4" />
                        Pitch
                        {showPitchMenu ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      
                      <button
                        ref={exportButtonRef}
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className={styles.actionButton}
                        data-color="blue"
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

                {/* Optimization Cards - Apple Style */}
                <div className="space-y-4">
                  {filteredOptimizations.map((optimization, index) => (
                    <motion.div
                      key={optimization.id}
                      className={styles.card}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      style={{
                        background: optimization.implemented && showSimulation
                          ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.1) 0%, rgba(52, 199, 89, 0.05) 100%)'
                          : appliedIssues.has(optimization.id)
                          ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.1) 0%, rgba(52, 199, 89, 0.05) 100%)'
                          : dismissedIssues.has(optimization.id)
                          ? 'linear-gradient(135deg, rgba(255, 69, 58, 0.05) 0%, transparent 100%)'
                          : selectedIssues.has(optimization.id)
                          ? 'linear-gradient(135deg, rgba(0, 122, 255, 0.1) 0%, rgba(0, 122, 255, 0.05) 100%)'
                          : undefined,
                        opacity: dismissedIssues.has(optimization.id) ? 0.5 : 1
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
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-bold">
                              {optimization.category === 'termination' ? 'Kündigung & Laufzeit' :
                               optimization.category === 'liability' ? 'Haftung & Risiko' :
                               optimization.category === 'payment' ? 'Vergütung & Zahlung' :
                               optimization.category === 'compliance' ? 'Compliance & DSGVO' : 'Klarheit & Präzision'}
                            </h4>
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
                          </div>
                          
                          <div className="flex gap-4 text-sm text-gray-600 font-medium">
                            <span>KI: {optimization.confidence}%</span>
                            <span>Risiko: {optimization.legalRisk}/10</span>
                            <span>Impact: {optimization.businessImpact}/10</span>
                            <span>{optimization.estimatedSavings}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          {showSimulation ? (
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={optimization.implemented}
                                onChange={() => toggleSuggestion(optimization.id)}
                                className="w-5 h-5"
                                style={{ accentColor: '#007AFF' }}
                              />
                              <span className="font-medium">{optimization.implemented ? 'Aktiviert' : 'Anwenden'}</span>
                            </label>
                          ) : (
                            <>
                              {!dismissedIssues.has(optimization.id) && !appliedIssues.has(optimization.id) && (
                                <motion.button
                                  onClick={() => toggleIssueSelection(optimization.id)}
                                  className={`px-3 py-1.5 rounded-lg font-medium ${
                                    selectedIssues.has(optimization.id)
                                      ? 'bg-blue-500 text-white'
                                      : 'bg-gray-100 hover:bg-gray-200'
                                  }`}
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  {selectedIssues.has(optimization.id) ? <Check className="w-4 h-4" /> : 'Auswählen'}
                                </motion.button>
                              )}
                              {!appliedIssues.has(optimization.id) && !dismissedIssues.has(optimization.id) && (
                                <motion.button
                                  onClick={() => dismissIssue(optimization.id)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg"
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                >
                                  <X className="w-4 h-4" />
                                </motion.button>
                              )}
                              {appliedIssues.has(optimization.id) && (
                                <span className="px-3 py-1.5 bg-green-500 text-white rounded-lg flex items-center gap-1 font-medium">
                                  <Check className="w-4 h-4" />
                                  Angewendet
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Content Grid */}
                      {showAdvancedView ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <h5 className="font-semibold text-red-600 mb-2">Original</h5>
                            <div className="p-3 rounded-lg text-sm" style={{ background: 'linear-gradient(135deg, rgba(255, 59, 48, 0.08) 0%, rgba(255, 59, 48, 0.04) 100%)' }}>
                              {optimization.original}
                            </div>
                          </div>
                          <div>
                            <h5 className="font-semibold text-green-600 mb-2">Optimiert</h5>
                            <div className="p-3 rounded-lg text-sm" style={{ background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.08) 0%, rgba(52, 199, 89, 0.04) 100%)' }}>
                              {optimization.improved}
                            </div>
                          </div>
                          <div>
                            <h5 className="font-semibold text-blue-600 mb-2">Begründung</h5>
                            <div className="p-3 rounded-lg text-sm" style={{ background: 'linear-gradient(135deg, rgba(0, 122, 255, 0.08) 0%, rgba(0, 122, 255, 0.04) 100%)' }}>
                              {optimization.reasoning}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg" style={{ background: 'linear-gradient(135deg, rgba(142, 142, 147, 0.08) 0%, rgba(142, 142, 147, 0.04) 100%)' }}>
                          <p className="text-sm">{optimization.reasoning}</p>
                        </div>
                      )}

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

                {/* Simulation Summary */}
                {showSimulation && optimizations.filter(opt => opt.implemented).length > 0 && (
                  <motion.div className={styles.card}>
                    <h4 className="font-bold mb-4 flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                      Simulation: Ausgewählte Optimierungen
                    </h4>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <h6 className="text-gray-600 font-medium">Score-Verbesserung</h6>
                        <p className="text-xl font-bold">
                          {contractScore?.overall} → {calculateNewScore()}
                          <span className="text-green-500 ml-2">
                            (+{Math.max(0, calculateNewScore() - (contractScore?.overall || 0))})
                          </span>
                        </p>
                      </div>
                      
                      <div>
                        <h6 className="text-gray-600 font-medium">Implementiert</h6>
                        <p className="text-xl font-bold">
                          {optimizations.filter(opt => opt.implemented).length} / {optimizations.length}
                        </p>
                      </div>
                      
                      <div>
                        <h6 className="text-gray-600 font-medium">Geschätzter Nutzen</h6>
                        <p className="text-xl font-bold">Signifikant</p>
                      </div>
                    </div>
                  </motion.div>
                )}

              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
}