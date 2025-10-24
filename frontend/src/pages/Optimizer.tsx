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
  AlertTriangle
} from "lucide-react";

// Components
import UnifiedPremiumNotice from "../components/UnifiedPremiumNotice";
import ContractHealthDashboard from "../components/ContractHealthDashboard";
import SimpleExplanationPopup from "../components/SimpleExplanationPopup";
import AnalysisProgressComponent from "../components/AnalysisProgress";
import PDFDocumentViewer from "../components/PDFDocumentViewer";

// Types für revolutionäre Features
import {
  OptimizationSuggestion,
  ContractHealthScore
} from "../types/optimizer";

// Utils
import { mapLegacyToProgress } from "../utils/analysisAdapter";

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
      <div className={styles.optimizer}>
        <div className={styles.backgroundGradient}></div>

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

                {/* Contract Health Dashboard */}
                {contractScore && (
                  <ContractHealthDashboard 
                    score={contractScore}
                    showSimulation={false}
                    newScore={contractScore.overall}
                  />
                )}

                {/* Statistics Dashboard - Premium Design */}
                {statistics && showStatistics && (
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

                {/* MAIN ACTION - Premium CTA */}
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
                    onClick={handleGenerateOptimizedContract}
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

                {/* Category Filter - Premium Design */}
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

                {/* Control Panel - Premium Design */}
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

                {/* Portal Dropdowns */}
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
                    {exportOptions.map(option => (
                      <motion.button
                        key={option.id}
                        onClick={() => handleExport()}
                        disabled={option.premium && !isPremium}
                        whileHover={!option.premium || isPremium ? { x: 4 } : undefined}
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
                          cursor: option.premium && !isPremium ? 'not-allowed' : 'pointer',
                          opacity: option.premium && !isPremium ? 0.5 : 1,
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
                            {option.premium && <Lock size={12} style={{ color: '#86868B' }} />}
                          </div>
                          <div style={{ fontSize: '12px', color: '#86868B' }}>
                            {option.description}
                          </div>
                        </div>
                        <span style={{
                          fontSize: '11px',
                          background: '#E5E5E7',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontWeight: 600,
                          color: '#1D1D1F'
                        }}>
                          {option.format}
                        </span>
                      </motion.button>
                    ))}
                  </motion.div>
                </DropdownPortal>

                {/* Optimization Cards - Premium Design */}
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
                        {/* Im Dokument anzeigen Button */}
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
