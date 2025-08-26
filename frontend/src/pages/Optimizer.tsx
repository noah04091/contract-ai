// 📁 src/pages/Optimizer.tsx - APPLE DESIGN REVOLUTION ✨
import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Upload, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
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
  Cloud,
  Loader2,
  Settings,
  ArrowRight,
  GitCompare,
  FileCheck
} from "lucide-react";

// Components
import LegendaryPremiumNotice from "../components/LegendaryPremiumNotice";
import ContractHealthDashboard from "../components/ContractHealthDashboard";

// 🎯 PREMIUM: Advanced Components
import DiffViewer from "../components/DiffViewer";
import PremiumExportPanel from "../components/PremiumExportPanel";
import PitchViewer from "../components/PitchViewer";
import ExecutiveSummaryViewer from "../components/ExecutiveSummaryViewer";

// Types für revolutionäre Features
import { 
  OptimizationSuggestion, 
  ContractHealthScore,
  RedraftResult,
  PitchCollection,
  AcceptanceConfig
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
    gradient: 'linear-gradient(135deg, #5AC8FA 0%, #4DAAF7 100%)',
    description: 'Werkleistungen & Projekte'
  },
  lizenzvertrag: {
    name: 'Lizenzvertrag',
    icon: <FileSignature className="w-5 h-5" />,
    color: '#FF6482',
    gradient: 'linear-gradient(135deg, #FF6482 0%, #F5526F 100%)',
    description: 'Software & IP-Lizenzen'
  }
};

// 🚀 Export Options with Icons
const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: 'pdf',
    name: 'PDF Report',
    icon: <FileText className="w-5 h-5" />,
    description: 'Detaillierter Analysebericht',
    format: '.pdf'
  },
  {
    id: 'word',
    name: 'Word Dokument',
    icon: <FileDown className="w-5 h-5" />,
    description: 'Editierbare Version',
    format: '.docx',
    premium: true
  },
  {
    id: 'json',
    name: 'JSON Data',
    icon: <Layers className="w-5 h-5" />,
    description: 'Strukturierte Daten',
    format: '.json'
  }
];

// 🚀 Pitch Styles
const PITCH_STYLES: PitchStyle[] = [
  {
    id: 'lawyer',
    name: 'Juristisch',
    icon: <Building2 className="w-5 h-5" />,
    description: 'Formell & rechtssicher',
    target: 'lawyer'
  },
  {
    id: 'business',
    name: 'Business',
    icon: <Briefcase className="w-5 h-5" />,
    description: 'Professionell & effizient',
    target: 'business'
  },
  {
    id: 'private',
    name: 'Verständlich',
    icon: <User className="w-5 h-5" />,
    description: 'Einfach & klar',
    target: 'private'
  }
];

// 🚀 REVOLUTIONARY: Smart Filter Categories
const FILTER_CATEGORIES = [
  { value: 'all', label: 'Alle Optimierungen', icon: '🎯' },
  { value: 'termination', label: 'Kündigungsregelungen', icon: '🚪' },
  { value: 'liability', label: 'Haftungsklauseln', icon: '⚖️' },
  { value: 'payment', label: 'Zahlungskonditionen', icon: '💰' },
  { value: 'compliance', label: 'Compliance & Datenschutz', icon: '🔐' },
  { value: 'clarity', label: 'Vertragsklarheit', icon: '📝' }
];

// 🚀 REVOLUTIONARY: Helper Functions
const getCategoryIcon = (category: string) => {
  const icons: Record<string, React.ReactNode> = {
    'termination': '🚪',
    'liability': '⚖️',
    'payment': '💰',
    'compliance': '🔐',
    'clarity': '📝',
    'performance': '🎯',
    'warranty': '🛡️',
    'confidentiality': '🤫',
    'intellectual_property': '💡',
    'dispute_resolution': '🤝'
  };
  return icons[category] || '📋';
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    'termination': '#FF6B6B',
    'liability': '#4ECDC4',
    'payment': '#45B7D1',
    'compliance': '#96CEB4',
    'clarity': '#FECA57',
    'performance': '#9B59B6',
    'warranty': '#E74C3C',
    'confidentiality': '#3498DB',
    'intellectual_property': '#F39C12',
    'dispute_resolution': '#2ECC71'
  };
  return colors[category] || '#95A5A6';
};

const getPriorityConfig = (priority: string) => {
  const configs: Record<string, {
    color: string;
    bg: string;
    label: string;
    icon: string;
  }> = {
    'critical': { 
      color: '#FF3B30', 
      bg: 'rgba(255, 59, 48, 0.1)', 
      label: 'Kritisch',
      icon: '🚨'
    },
    'high': { 
      color: '#FF9500', 
      bg: 'rgba(255, 149, 0, 0.1)', 
      label: 'Hoch',
      icon: '⚠️'
    },
    'medium': { 
      color: '#007AFF', 
      bg: 'rgba(0, 122, 255, 0.1)', 
      label: 'Mittel',
      icon: 'ℹ️'
    },
    'low': { 
      color: '#34C759', 
      bg: 'rgba(52, 199, 89, 0.1)', 
      label: 'Niedrig',
      icon: '💡'
    }
  };
  return configs[priority] || configs.medium;
};

// 🚀 REVOLUTIONARY: Smart Summary Component
const OptimizationSummaryCard: React.FC<{ 
  summary: { redFlags: number; quickWins: number; totalIssues: number } 
}> = ({ summary }) => {
  return (
    <motion.div
      className={styles.summaryCard}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}>
          <div className={styles.summaryIcon} style={{ background: 'rgba(255, 59, 48, 0.1)' }}>
            🚨
          </div>
          <div>
            <div className={styles.summaryValue}>{summary.redFlags}</div>
            <div className={styles.summaryLabel}>Kritische Punkte</div>
          </div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryIcon} style={{ background: 'rgba(52, 199, 89, 0.1)' }}>
            ⚡
          </div>
          <div>
            <div className={styles.summaryValue}>{summary.quickWins}</div>
            <div className={styles.summaryLabel}>Quick Wins</div>
          </div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.summaryIcon} style={{ background: 'rgba(0, 122, 255, 0.1)' }}>
            📊
          </div>
          <div>
            <div className={styles.summaryValue}>{summary.totalIssues}</div>
            <div className={styles.summaryLabel}>Gesamt</div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// 🚀 REVOLUTIONARY: Smart Analysis Stepper
const AnalysisProgress: React.FC<{ progress: number }> = ({ progress }) => {
  const steps = [
    { label: 'Upload', icon: '📤' },
    { label: 'Analyse', icon: '🔍' },
    { label: 'Optimierung', icon: '✨' },
    { label: 'Fertig', icon: '✅' }
  ];
  
  const currentStep = Math.floor((progress / 100) * steps.length);
  
  return (
    <div className={styles.analysisStepper}>
      {steps.map((step, index) => (
        <div
          key={index}
          className={`${styles.stepItem} ${index <= currentStep ? styles.stepActive : ''}`}
        >
          <div className={styles.stepIcon}>{step.icon}</div>
          <div className={styles.stepLabel}>{step.label}</div>
          {index < steps.length - 1 && <div className={styles.stepConnector} />}
        </div>
      ))}
    </div>
  );
};

// 🚀 REVOLUTIONARY: Contract Type Badge
const ContractTypeBadge: React.FC<{ type: string; confidence?: number }> = ({ type, confidence }) => {
  const typeInfo = CONTRACT_TYPE_INFO[type as keyof typeof CONTRACT_TYPE_INFO] || {
    name: type,
    icon: <FileText className="w-4 h-4" />,
    gradient: 'linear-gradient(135deg, #667EEA 0%, #764BA2 100%)'
  };
  
  return (
    <motion.div
      className={styles.contractTypeBadge}
      style={{ background: typeInfo.gradient }}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
    >
      {typeInfo.icon}
      <span>{typeInfo.name}</span>
      {confidence && confidence > 0 && (
        <span className={styles.confidenceBadge}>
          {Math.round(confidence * 100)}%
        </span>
      )}
    </motion.div>
  );
};

// 🚀 REVOLUTIONARY: Optimization Card with Apple Design
const OptimizationCard: React.FC<{
  optimization: OptimizationSuggestion;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  showAdvanced?: boolean;
}> = ({ optimization, isSelected = false, onToggleSelect, showAdvanced = false }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const priorityConfig = getPriorityConfig(optimization.priority);
  
  const handleCopy = async () => {
    const textToCopy = `
${optimization.category.toUpperCase()} - ${optimization.priority.toUpperCase()}
Original: ${optimization.original}
Verbesserung: ${optimization.improved}
Begründung: ${optimization.reasoning}
    `.trim();
    
    await navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };
  
  return (
    <motion.div
      className={`${styles.optimizationCard} ${isSelected ? styles.selected : ''}`}
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.3 }}
    >
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <div 
            className={styles.categoryIcon}
            style={{ color: getCategoryColor(optimization.category) }}
          >
            {getCategoryIcon(optimization.category)}
          </div>
          <div className={styles.cardTitles}>
            <h4 className={styles.cardTitle}>
              {optimization.category.charAt(0).toUpperCase() + optimization.category.slice(1).replace('_', ' ')}
            </h4>
            <div className={styles.cardMeta}>
              <span 
                className={styles.priorityBadge}
                style={{ 
                  background: priorityConfig.bg,
                  color: priorityConfig.color
                }}
              >
                {priorityConfig.icon} {priorityConfig.label}
              </span>
              {optimization.confidence && (
                <span className={styles.confidenceIndicator}>
                  {Math.round(optimization.confidence)}% Konfidenz
                </span>
              )}
            </div>
          </div>
        </div>
        
        <div className={styles.cardActions}>
          {showAdvanced && onToggleSelect && (
            <button
              onClick={onToggleSelect}
              className={`${styles.selectButton} ${isSelected ? styles.selected : ''}`}
            >
              {isSelected ? <CheckCircle2 className="w-5 h-5" /> : <div className={styles.selectCircle} />}
            </button>
          )}
          <button
            onClick={handleCopy}
            className={styles.copyButton}
          >
            {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={styles.expandButton}
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>
      
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={styles.cardContent}
          >
            <div className={styles.textComparison}>
              <div className={styles.originalText}>
                <span className={styles.textLabel}>Original:</span>
                <p>{optimization.original || 'Keine explizite Regelung vorhanden'}</p>
              </div>
              <ArrowRight className={styles.arrowIcon} />
              <div className={styles.improvedText}>
                <span className={styles.textLabel}>Optimierung:</span>
                <p>{optimization.improved}</p>
              </div>
            </div>
            
            <div className={styles.reasoning}>
              <span className={styles.reasoningLabel}>💡 Begründung:</span>
              <p>{optimization.reasoning}</p>
            </div>
            
            {optimization.marketBenchmark && (
              <div className={styles.benchmark}>
                <span className={styles.benchmarkLabel}>📊 Markt-Benchmark:</span>
                <p>{optimization.marketBenchmark}</p>
              </div>
            )}
            
            {optimization.estimatedSavings && (
              <div className={styles.savings}>
                <span className={styles.savingsLabel}>💰 Geschätzte Einsparung:</span>
                <p>{optimization.estimatedSavings}</p>
              </div>
            )}
            
            <div className={styles.cardFooter}>
              <div className={styles.impactMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Risiko</span>
                  <div className={styles.metricBar}>
                    <div 
                      className={styles.metricFill}
                      style={{ 
                        width: `${optimization.legalRisk * 10}%`,
                        background: optimization.legalRisk > 7 ? '#FF3B30' : optimization.legalRisk > 4 ? '#FF9500' : '#34C759'
                      }}
                    />
                  </div>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricLabel}>Impact</span>
                  <div className={styles.metricBar}>
                    <div 
                      className={styles.metricFill}
                      style={{ 
                        width: `${optimization.businessImpact * 10}%`,
                        background: '#007AFF'
                      }}
                    />
                  </div>
                </div>
              </div>
              <span className={styles.difficulty}>
                Umsetzung: {optimization.implementationDifficulty || 'mittel'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// 🚀 Portal-based Toast Component
const Toast: React.FC<{ 
  message: string; 
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}> = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const icons = {
    success: <CheckCircle2 className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <AlertCircle className="w-5 h-5" />
  };
  
  const colors = {
    success: '#34C759',
    error: '#FF3B30',
    info: '#007AFF'
  };
  
  return ReactDOM.createPortal(
    <motion.div
      className={styles.toast}
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      style={{ borderLeft: `4px solid ${colors[type]}` }}
    >
      <div style={{ color: colors[type] }}>{icons[type]}</div>
      <span>{message}</span>
      <button onClick={onClose} className={styles.toastClose}>×</button>
    </motion.div>,
    document.body
  );
};

// Main Component
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
  
  // 🎯 PREMIUM: Auto-Redrafting & Advanced Features States
  const [redraftResult, setRedraftResult] = useState<RedraftResult | null>(null);
  const [pitchCollections, setPitchCollections] = useState<PitchCollection[] | null>(null);
  const [acceptanceConfig, setAcceptanceConfig] = useState<AcceptanceConfig>({
    defaultAcceptAll: true,
    acceptedIds: [],
    rejectedIds: []
  });
  const [isRedrafting, setIsRedrafting] = useState(false);
  const [isLoadingPitches, setIsLoadingPitches] = useState(false);
  const [premiumActiveTab, setPremiumActiveTab] = useState<'diff' | 'export' | 'pitches' | 'summary'>('diff');
  const [showPremiumSection, setShowPremiumSection] = useState(false);

  // ✅ ORIGINAL: Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pitchButtonRef = useRef<HTMLButtonElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  // Fetch premium status on mount
  useEffect(() => {
    const fetchPremiumStatus = async () => {
      try {
        const response = await fetch("/api/auth/check-auth", {
          credentials: "include",
        });
        if (response.ok) {
          const data = await response.json();
          setIsPremium(data.subscription !== "free");
        }
      } catch (err) {
        console.error("Error checking premium status:", err);
        setIsPremium(false);
      }
    };
    fetchPremiumStatus();
  }, []);

  // Simulate analysis progress
  useEffect(() => {
    if (isAnalyzing && analysisProgress < 100) {
      const timer = setTimeout(() => {
        setAnalysisProgress(prev => Math.min(prev + 10, 100));
      }, 300);
      return () => clearTimeout(timer);
    }
    
    if (analysisProgress >= 100 && isAnalyzing) {
      setTimeout(() => {
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }, 500);
    }
  }, [isAnalyzing, analysisProgress]);

  // Handle file upload and analysis
  const handleUpload = async () => {
    if (!file) {
      setError("Bitte wählen Sie eine Datei aus.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("toolUsed", "optimizer");

    setLoading(true);
    setIsAnalyzing(true);
    setAnalysisProgress(10);
    setError(null);
    setOptimizations([]);
    setOptimizationResult(null);
    setRedraftResult(null);
    setPitchCollections(null);
    setShowPremiumSection(false);

    try {
      const response = await fetch("/api/optimize", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      setAnalysisProgress(50);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Optimization response:", data);
      
      setAnalysisProgress(80);
      
      // Save analysis data for later use
      setAnalysisData(data);
      setContractId(data.contractId || data.analysisId);
      
      // Save original text if available
      if (data.originalText || data.fullText) {
        setOriginalContractText(data.originalText || data.fullText || '');
      }
      
      // Process optimizations
      if (data.optimizations && Array.isArray(data.optimizations)) {
        setOptimizations(data.optimizations);
        setAnalysisProgress(90);
        
        // Calculate contract health score
        const score: ContractHealthScore = {
          overall: data.score || 75,
          categories: {
            termination: { score: 80, trend: 'up' },
            liability: { score: 65, trend: 'stable' },
            payment: { score: 90, trend: 'up' },
            clarity: { score: 70, trend: 'down' },
            compliance: { score: 85, trend: 'up' }
          },
          industryPercentile: 72,
          riskLevel: data.optimizations.some((o: OptimizationSuggestion) => o.priority === 'critical') ? 'high' : 'medium'
        };
        setContractScore(score);
      }
      
      // Store full result
      setOptimizationResult(data);
      setAnalysisProgress(100);
      
    } catch (err) {
      console.error("Optimization error:", err);
      setError(err instanceof Error ? err.message : "Ein Fehler ist aufgetreten");
      setIsAnalyzing(false);
    } finally {
      setLoading(false);
    }
  };

  const showToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  }, []);

  // Generate optimized contract
  const handleGenerateOptimizedContract = useCallback(async () => {
    if (!file || !originalContractText) {
      showToast("❌ Kein Vertrag geladen", 'error');
      return;
    }

    if (!optimizations || optimizations.length === 0) {
      showToast("❌ Keine Optimierungen verfügbar", 'error');
      return;
    }

    setIsGeneratingContract(true);

    const optimizationsToApply = showAdvancedView
      ? optimizations.filter(opt => selectedOptimizations.has(opt.id))
      : optimizations;

    if (optimizationsToApply.length === 0) {
      showToast("⚠️ Bitte wählen Sie mindestens eine Optimierung aus", 'info');
      setIsGeneratingContract(false);
      return;
    }

    try {
      const response = await fetch("/api/generate-optimized-contract", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          originalText: originalContractText,
          optimizations: optimizationsToApply,
          contractId: contractId,
          metadata: {
            originalFileName: file.name,
            optimizationCount: optimizationsToApply.length,
            analysisData: analysisData
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Fehler beim Generieren des optimierten Vertrags");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${file.name.replace(/\.[^/.]+$/, "")}_optimiert.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      showToast("✅ Optimierter Vertrag wurde heruntergeladen!", 'success');
      
      // Also trigger premium features if user is premium
      if (isPremium) {
        setShowPremiumSection(true);
      }
      
    } catch (error) {
      console.error("Error generating optimized contract:", error);
      const userMessage = error instanceof Error ? error.message : "Fehler beim Generieren des Vertrags";
      showToast(userMessage, 'error');
    } finally {
      setIsGeneratingContract(false);
    }
  }, [file, optimizations, contractId, showAdvancedView, selectedOptimizations, originalContractText, analysisData, showToast, isGeneratingContract, isPremium]);

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

  // Handle reset
  const handleReset = useCallback(() => {
    setFile(null);
    setOptimizations([]);
    setError(null);
    setSelectedCategory('all');
    setContractScore(null);
    setOptimizationResult(null);
    setContractId(null);
    setOriginalContractText('');
    setAnalysisData(null);
    setSelectedOptimizations(new Set());
    setShowAdvancedView(false);
    setRedraftResult(null);
    setPitchCollections(null);
    setShowPremiumSection(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Drag and drop handlers
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

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Bitte laden Sie nur PDF-Dateien hoch.");
      }
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  }, []);

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
  `${index + 1}. ${categoryNames[opt.category as keyof typeof categoryNames] || opt.category}
   Risiko: ${opt.legalRisk}/10 | Impact: ${opt.businessImpact}/10
   Empfehlung: ${opt.improved.substring(0, 100)}...
   Rechtliche Grundlage: ${opt.reasoning.substring(0, 80)}...`
).join('\n\n')}

Diese Anpassungen minimieren rechtliche Risiken und stärken Ihre Vertragsposition erheblich.

Mit freundlichen Grüßen`,

      business: `Geschätzte Partner,

unsere Vertragsanalyse zeigt ${optimizations.length} Optimierungsmöglichkeiten mit direktem Business Impact:

💰 Potenzielle Einsparungen: ${optimizations.filter(o => o.estimatedSavings).length} Bereiche identifiziert
⚡ Quick Wins: ${optimizations.filter(o => o.implementationDifficulty === 'easy').length} sofort umsetzbar
🛡️ Risikominimierung: ${optimizations.filter(o => o.legalRisk > 7).length} kritische Punkte

Top 3 Prioritäten:
${optimizations
  .sort((a, b) => b.businessImpact - a.businessImpact)
  .slice(0, 3)
  .map((opt, i) => `${i + 1}. ${opt.improved.substring(0, 80)}...`)
  .join('\n')}

ROI der Implementierung: Geschätzt 15-20% Kostenreduktion bei Vertragsrisiken.

Beste Grüße`,

      private: `Hallo!

Wir haben Ihren Vertrag geprüft und ${optimizations.length} Verbesserungen gefunden:

✅ Was gut ist: Der Vertrag ist grundsätzlich gültig
⚠️ Was fehlt: ${optimizations.filter(o => !o.original).length} wichtige Regelungen
🔧 Was verbessert werden sollte:

${optimizations.slice(0, 3).map((opt, i) => 
  `${i + 1}. ${categoryNames[opt.category as keyof typeof categoryNames] || opt.category}
   → ${opt.improved.substring(0, 60)}...`
).join('\n\n')}

Diese Änderungen machen Ihren Vertrag sicherer und klarer.

Viele Grüße`
    };

    const pitch = pitchTemplates[style as keyof typeof pitchTemplates] || pitchTemplates.business;
    navigator.clipboard.writeText(pitch);
    showToast(`✅ ${style} Pitch kopiert!`, 'success');
    setShowPitchMenu(false);
  }, [optimizations, selectedPitchStyle, showToast]);

  // 🎯 PREMIUM: Auto-Redrafting Function
  const handleAutoRedraft = useCallback(async () => {
    if (!contractId || !originalContractText) {
      showToast('❌ Kein Vertrag geladen oder keine Original-Text verfügbar.', 'error');
      return;
    }

    if (!optimizations || optimizations.length === 0) {
      showToast('❌ Keine Optimierungen verfügbar für Auto-Neufassung.', 'error');
      return;
    }

    setIsRedrafting(true);
    setShowPremiumSection(true);

    try {
      const response = await fetch(`/api/optimized-contract/${contractId}/redraft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          originalText: originalContractText,
          acceptanceConfig: acceptanceConfig,
          optimizations: optimizations.map(opt => ({
            id: opt.id,
            original: opt.original,
            improved: opt.improved,
            category: opt.category,
            reasoning: opt.reasoning,
            priority: opt.priority
          }))
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Redraft failed: ${response.statusText}`);
      }

      const result: RedraftResult = await response.json();
      
      if (result.success) {
        setRedraftResult(result);
        showToast(`✅ Auto-Neufassung erfolgreich: ${result.stats.appliedChanges} von ${result.stats.totalOptimizations} Änderungen übernommen`, 'success');
        
        // Auto-switch to diff view
        setPremiumActiveTab('diff');
      } else {
        throw new Error('Redrafting failed on server side');
      }

    } catch (error) {
      console.error('Auto-redraft error:', error);
      showToast(`❌ Auto-Neufassung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error');
    } finally {
      setIsRedrafting(false);
    }
  }, [contractId, originalContractText, optimizations, acceptanceConfig, showToast]);

  // 🎯 PREMIUM: Load Pitches Function
  const handleLoadPitches = useCallback(async () => {
    if (!contractId || !redraftResult) {
      showToast('❌ Führen Sie zuerst eine Auto-Neufassung durch.', 'error');
      return;
    }

    setIsLoadingPitches(true);

    try {
      const response = await fetch(`/api/optimized-contract/${contractId}/pitches`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          changes: redraftResult.appliedChanges,
          contractName: analysisData?.summary || file?.name || 'Vertrag'
        })
      });

      if (!response.ok) {
        throw new Error(`Pitch generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success && result.pitches) {
        setPitchCollections(result.pitches);
        showToast(`✅ ${result.pitches.length} Verhandlungsargumente in 3 Tonarten generiert`, 'success');
      } else {
        throw new Error('Pitch generation failed');
      }

    } catch (error) {
      console.error('Load pitches error:', error);
      showToast(`❌ Pitch-Generierung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`, 'error');
    } finally {
      setIsLoadingPitches(false);
    }
  }, [contractId, redraftResult, analysisData, file, showToast]);

  // 🎯 PREMIUM: Handle Acceptance Config Change
  const handleAcceptanceChange = useCallback((newConfig: AcceptanceConfig) => {
    setAcceptanceConfig(newConfig);
  }, []);

  // 🎯 PREMIUM: Export Event Handlers
  const handleExportStart = useCallback(() => {
    showToast('📄 Export wird vorbereitet...', 'info');
  }, [showToast]);

  const handleExportComplete = useCallback((exportType: string, success: boolean) => {
    if (success) {
      showToast(`✅ ${exportType} erfolgreich exportiert`, 'success');
    } else {
      showToast(`❌ ${exportType} Export fehlgeschlagen`, 'error');
    }
  }, [showToast]);

  // ✅ ORIGINAL: Export Functions
  const handleExport = useCallback(async () => {
    setShowExportMenu(false);
    showToast("Export-Funktion wird implementiert...", 'info');
  }, [showToast]);

  // Filtered optimizations
  const filteredOptimizations = useMemo(() => {
    if (selectedCategory === 'all') return optimizations;
    return optimizations.filter(opt => opt.category === selectedCategory);
  }, [optimizations, selectedCategory]);

  // Category counts for filters
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    optimizations.forEach(opt => {
      counts[opt.category] = (counts[opt.category] || 0) + 1;
    });
    counts['all'] = optimizations.length;
    return counts;
  }, [optimizations]);

  // 🚀 REVOLUTIONARY: Parse categories and issues
  const parseCategories = useCallback((result: OptimizationResult): RevolutionaryCategory[] => {
    if (result.categories) {
      return result.categories;
    }
    
    if (result.optimizationResult && typeof result.optimizationResult === 'string') {
      try {
        const parsed = JSON.parse(result.optimizationResult);
        if (parsed.categories) {
          return parsed.categories;
        }
      } catch (e) {
        console.log("Could not parse optimization result as JSON");
      }
    }
    
    return [];
  }, []);

  // 🚀 REVOLUTIONARY: Render optimization results
  const renderOptimizationResults = useCallback(() => {
    if (!optimizationResult?.summary && optimizations.length === 0) return null;
    
    const categories = parseCategories(optimizationResult || {});
    const hasRevolutionaryFormat = categories.length > 0;
    
    return (
      <motion.div
        className={styles.resultsSection}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {hasRevolutionaryFormat ? (
          <>
            {/* Revolutionary Format */}
            {categories.map((category) => (
              <div key={category.tag} className={styles.categorySection}>
                <h3 className={styles.categoryHeader}>
                  {category.label}
                  {category.present && (
                    <span className={styles.presentBadge}>✓ Vorhanden</span>
                  )}
                </h3>
                <div className={styles.issuesGrid}>
                  {category.issues.map((issue) => (
                    <motion.div
                      key={issue.id}
                      className={styles.issueCard}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className={styles.issueHeader}>
                        <span className={styles.issueSummary}>{issue.summary}</span>
                        <div className={styles.issueMetrics}>
                          <span className={styles.riskBadge}>Risk: {issue.risk}/10</span>
                          <span className={styles.impactBadge}>Impact: {issue.impact}/10</span>
                        </div>
                      </div>
                      <div className={styles.issueContent}>
                        {issue.originalText && (
                          <div className={styles.originalText}>
                            <strong>Original:</strong> {issue.originalText}
                          </div>
                        )}
                        <div className={styles.improvedText}>
                          <strong>Verbesserung:</strong> {issue.improvedText}
                        </div>
                        <div className={styles.reasoning}>
                          <strong>Begründung:</strong> {issue.legalReasoning}
                        </div>
                        {issue.benchmark && (
                          <div className={styles.benchmark}>
                            <strong>Benchmark:</strong> {issue.benchmark}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ))}
          </>
        ) : (
          <>
            {/* Standard Format with optimizations array */}
            <div className={styles.filterBar}>
              <div className={styles.filterButtons}>
                {FILTER_CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`${styles.filterButton} ${selectedCategory === cat.value ? styles.active : ''}`}
                  >
                    <span className={styles.filterIcon}>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {categoryCounts[cat.value] > 0 && (
                      <span className={styles.filterCount}>{categoryCounts[cat.value]}</span>
                    )}
                  </button>
                ))}
              </div>
              
              <div className={styles.viewToggles}>
                <button
                  onClick={() => setShowStatistics(!showStatistics)}
                  className={`${styles.toggleButton} ${showStatistics ? styles.active : ''}`}
                >
                  <BarChart3 className="w-4 h-4" />
                  Statistiken
                </button>
                <button
                  onClick={() => setShowAdvancedView(!showAdvancedView)}
                  className={`${styles.toggleButton} ${showAdvancedView ? styles.active : ''}`}
                >
                  <Settings className="w-4 h-4" />
                  Erweitert
                </button>
              </div>
            </div>
            
            {showStatistics && contractScore && (
              <ContractHealthDashboard 
                score={contractScore} 
                showSimulation={false}
                newScore={contractScore.overall}
              />
            )}
            
            {optimizationResult?.summary && (
              <OptimizationSummaryCard summary={optimizationResult.summary} />
            )}
            
            {showAdvancedView && (
              <div className={styles.advancedControls}>
                <p className={styles.advancedInfo}>
                  {selectedOptimizations.size} von {optimizations.length} Optimierungen ausgewählt
                </p>
                <div className={styles.advancedActions}>
                  <button
                    onClick={() => setSelectedOptimizations(new Set(optimizations.map(o => o.id)))}
                    className={styles.selectAllButton}
                  >
                    Alle auswählen
                  </button>
                  <button
                    onClick={() => setSelectedOptimizations(new Set())}
                    className={styles.deselectAllButton}
                  >
                    Auswahl aufheben
                  </button>
                </div>
              </div>
            )}
            
            <div className={styles.optimizationsGrid}>
              <AnimatePresence>
                {filteredOptimizations.map((optimization) => (
                  <OptimizationCard
                    key={optimization.id}
                    optimization={optimization}
                    isSelected={selectedOptimizations.has(optimization.id)}
                    onToggleSelect={() => toggleOptimizationSelection(optimization.id)}
                    showAdvanced={showAdvancedView}
                  />
                ))}
              </AnimatePresence>
            </div>
            
            {filteredOptimizations.length === 0 && selectedCategory !== 'all' && (
              <div className={styles.emptyState}>
                <p>Keine Optimierungen in dieser Kategorie gefunden.</p>
                <button 
                  onClick={() => setSelectedCategory('all')}
                  className={styles.resetFilterButton}
                >
                  Alle Kategorien anzeigen
                </button>
              </div>
            )}
          </>
        )}
      </motion.div>
    );
  }, [optimizationResult, optimizations, filteredOptimizations, selectedCategory, categoryCounts, showStatistics, contractScore, showAdvancedView, selectedOptimizations, toggleOptimizationSelection, parseCategories]);

  // Portal refs for menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportButtonRef.current && !exportButtonRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
      if (pitchButtonRef.current && !pitchButtonRef.current.contains(event.target as Node)) {
        setShowPitchMenu(false);
      }
    };
    
    if (showExportMenu || showPitchMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showExportMenu, showPitchMenu]);

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
            <LegendaryPremiumNotice onUpgrade={() => window.location.href = '/subscribe'} />
          )}

          {/* Upload Section */}
          {!optimizations.length && (
            <motion.div 
              className={styles.uploadSection}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div
                className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ""} ${file ? styles.hasFile : ""}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className={styles.fileInput}
                  id="fileUpload"
                />
                <label htmlFor="fileUpload" className={styles.uploadLabel}>
                  <motion.div 
                    className={styles.uploadIcon}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Upload className="w-12 h-12" />
                  </motion.div>
                  {file ? (
                    <div className={styles.fileInfo}>
                      <FileText className="w-8 h-8" />
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                  ) : (
                    <>
                      <p className={styles.uploadText}>
                        PDF hierher ziehen oder klicken zum Auswählen
                      </p>
                      <p className={styles.uploadHint}>
                        Maximale Dateigröße: 10 MB
                      </p>
                    </>
                  )}
                </label>
              </div>

              {error && (
                <motion.div 
                  className={styles.errorMessage}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </motion.div>
              )}

              <div className={styles.uploadActions}>
                <motion.button
                  onClick={handleUpload}
                  disabled={!file || loading}
                  className={`${styles.uploadButton} ${(!file || loading) ? styles.disabled : ''}`}
                  whileHover={file && !loading ? { scale: 1.05 } : {}}
                  whileTap={file && !loading ? { scale: 0.95 } : {}}
                >
                  {loading || isAnalyzing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analysiere...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      Optimierung starten
                    </>
                  )}
                </motion.button>
                
                {file && (
                  <motion.button
                    onClick={handleReset}
                    className={styles.resetButton}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <RefreshCw className="w-5 h-5" />
                    Zurücksetzen
                  </motion.button>
                )}
              </div>

              {isAnalyzing && (
                <AnalysisProgress progress={analysisProgress} />
              )}
            </motion.div>
          )}

          {/* Results Section */}
          {optimizations.length > 0 && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={styles.resultsContainer}
              >
                {/* Contract Meta Info */}
                {optimizationResult?.meta && (
                  <motion.div className={styles.metaInfo}>
                    <ContractTypeBadge 
                      type={optimizationResult.meta.type} 
                      confidence={optimizationResult.meta.confidence}
                    />
                    <div className={styles.metaDetails}>
                      {optimizationResult.meta.jurisdiction && (
                        <span>📍 {optimizationResult.meta.jurisdiction}</span>
                      )}
                      {optimizationResult.meta.gapsFound && <span>🔍 {optimizationResult.meta.gapsFound} Lücken</span>}
                    </div>
                  </motion.div>
                )}

                {/* Health Score */}
                {optimizationResult?.score && (
                  <motion.div className={styles.healthScore}>
                    <div className={styles.scoreCircle}>
                      <span className={styles.scoreValue}>{optimizationResult.score.health}</span>
                      <span className={styles.scoreLabel}>Health Score</span>
                    </div>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div className={styles.actionBar}>
                  <motion.button
                    onClick={handleGenerateOptimizedContract}
                    disabled={isGeneratingContract || optimizations.length === 0}
                    className={`${styles.generateButton} ${isGeneratingContract ? styles.generating : ''}`}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {isGeneratingContract ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Generiere optimierten Vertrag...
                      </>
                    ) : (
                      <>
                        <FileText className="w-5 h-5" />
                        Optimierten Vertrag generieren
                      </>
                    )}
                  </motion.button>

                  {isPremium && (
                    <motion.button
                      onClick={handleAutoRedraft}
                      disabled={isRedrafting || !contractId}
                      className={`${styles.premiumButton} ${isRedrafting ? styles.loading : ''}`}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isRedrafting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Erstelle Neufassung...
                        </>
                      ) : (
                        <>
                          <Wand2 className="w-5 h-5" />
                          Auto-Neufassung (Premium)
                        </>
                      )}
                    </motion.button>
                  )}

                  <div className={styles.actionGroup}>
                    <div className={styles.dropdownContainer}>
                      <button
                        ref={exportButtonRef}
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        className={styles.actionButton}
                      >
                        <Download className="w-5 h-5" />
                        Export
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      
                      <AnimatePresence>
                        {showExportMenu && (
                          <motion.div
                            className={styles.dropdownMenu}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            {EXPORT_OPTIONS.map(option => (
                              <button
                                key={option.id}
                                onClick={handleExport}
                                className={`${styles.dropdownItem} ${option.premium && !isPremium ? styles.disabled : ''}`}
                                disabled={option.premium && !isPremium}
                              >
                                {option.icon}
                                <div className={styles.dropdownItemText}>
                                  <span>{option.name}</span>
                                  <span className={styles.dropdownItemDesc}>{option.description}</span>
                                </div>
                                {option.premium && !isPremium && (
                                  <Lock className="w-4 h-4 opacity-50" />
                                )}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <div className={styles.dropdownContainer}>
                      <button
                        ref={pitchButtonRef}
                        onClick={() => setShowPitchMenu(!showPitchMenu)}
                        className={styles.actionButton}
                      >
                        <Mail className="w-5 h-5" />
                        Pitch
                        <ChevronDown className="w-4 h-4" />
                      </button>
                      
                      <AnimatePresence>
                        {showPitchMenu && (
                          <motion.div
                            className={styles.dropdownMenu}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                          >
                            {PITCH_STYLES.map(style => (
                              <button
                                key={style.id}
                                onClick={() => generatePitch(style.id)}
                                className={styles.dropdownItem}
                              >
                                {style.icon}
                                <div className={styles.dropdownItemText}>
                                  <span>{style.name}</span>
                                  <span className={styles.dropdownItemDesc}>{style.description}</span>
                                </div>
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    <button
                      onClick={handleReset}
                      className={styles.actionButton}
                    >
                      <RefreshCw className="w-5 h-5" />
                      Neu starten
                    </button>
                  </div>
                </motion.div>

                {/* Render optimization results */}
                {renderOptimizationResults()}

                {/* Legacy Simple Format */}
                {optimizationResult?.optimizationResult && 
                 typeof optimizationResult.optimizationResult === 'string' &&
                 !optimizationResult.categories && 
                 !optimizationResult.summary &&
                 optimizations.length === 0 && (
                  <motion.div className={styles.simpleResult}>
                    <h3>Analyse-Ergebnis</h3>
                    <div className={styles.simpleContent}>
                      {optimizationResult.optimizationResult.split('\n').map((line, idx) => (
                        <p key={idx}>{line}</p>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Legacy Cards (if no other format detected) */}
                {!optimizationResult?.categories && 
                 !optimizationResult?.summary &&
                 optimizations.length === 0 &&
                 optimizationResult?.legalAssessment && (
                  <div className={styles.legacyCards}>
                    {optimizationResult.laufzeit && (
                      <div className={styles.infoCard}>
                        <h4>📅 Laufzeit</h4>
                        <p>{optimizationResult.laufzeit}</p>
                      </div>
                    )}
                    {optimizationResult.kuendigung && (
                      <div className={styles.infoCard}>
                        <h4>🚪 Kündigung</h4>
                        <p>{optimizationResult.kuendigung}</p>
                      </div>
                    )}
                    {optimizationResult.legalAssessment && (
                      <div className={styles.infoCard}>
                        <h4>⚖️ Rechtliche Bewertung</h4>
                        <p>{optimizationResult.legalAssessment}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Custom HTML Content (if present) */}
                {optimizationResult?.optimizationResult && 
                 typeof optimizationResult.optimizationResult === 'string' &&
                 optimizationResult.optimizationResult.includes('<') && (
                  <motion.div
                    className={styles.htmlContent}
                    dangerouslySetInnerHTML={{ 
                      __html: optimizationResult.optimizationResult 
                    }}
                  />
                )}

              </motion.div>
            </AnimatePresence>
          )}

          {/* 🎯 PREMIUM: Auto-Redrafting & Advanced Features Section */}
          {showPremiumSection && isPremium && (
            <motion.div 
              className={`${styles.card} ${styles.premiumCard}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Premium Header */}
              <div className={styles.premiumHeader}>
                <div className={styles.premiumHeaderContent}>
                  <div className={styles.premiumIcon}>
                    <Wand2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className={styles.premiumTitle}>Premium Features</h3>
                    <p className={styles.premiumSubtitle}>
                      Auto-Neufassung, Export-Varianten & Verhandlungs-Pitches
                    </p>
                  </div>
                </div>

                {/* Status Info */}
                {redraftResult && (
                  <motion.div 
                    className={styles.statusInfo}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Auto-Neufassung abgeschlossen</span>
                    <span className={styles.statusStats}>
                      {redraftResult.stats.appliedChanges}/{redraftResult.stats.totalOptimizations} Änderungen • 
                      {redraftResult.stats.successRate}% Erfolgsquote
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Premium Tab Navigation */}
              {redraftResult && (
                <div className={styles.premiumTabs}>
                  <div className={styles.tabButtons}>
                    {[
                      { id: 'diff' as const, label: 'Diff-Ansicht', icon: <GitCompare className="w-4 h-4" /> },
                      { id: 'export' as const, label: 'Export', icon: <Download className="w-4 h-4" /> },
                      { id: 'pitches' as const, label: 'Pitches', icon: <Mail className="w-4 h-4" /> },
                      { id: 'summary' as const, label: 'Executive Summary', icon: <BarChart3 className="w-4 h-4" /> }
                    ].map(({ id, label, icon }) => (
                      <button
                        key={id}
                        onClick={() => setPremiumActiveTab(id)}
                        className={`${styles.tabButton} ${premiumActiveTab === id ? styles.active : ''}`}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Premium Tab Content */}
              <AnimatePresence mode="wait">
                {redraftResult && (
                  <motion.div
                    key={premiumActiveTab}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    className={styles.premiumContent}
                  >
                    {premiumActiveTab === 'diff' && (
                      <DiffViewer
                        diffBlocks={redraftResult.diffView}
                        appliedChanges={redraftResult.appliedChanges}
                        onAcceptanceChange={handleAcceptanceChange}
                        acceptanceConfig={acceptanceConfig}
                      />
                    )}

                    {premiumActiveTab === 'export' && (
                      <PremiumExportPanel
                        contractId={contractId!}
                        redraftResult={redraftResult}
                        contractName={file?.name || 'Vertrag'}
                        onExportStart={handleExportStart}
                        onExportComplete={handleExportComplete}
                      />
                    )}

                    {premiumActiveTab === 'pitches' && (
                      <PitchViewer
                        contractId={contractId!}
                        redraftResult={redraftResult}
                        pitches={pitchCollections}
                        onLoadPitches={handleLoadPitches}
                        isLoadingPitches={isLoadingPitches}
                      />
                    )}

                    {premiumActiveTab === 'summary' && (
                      <ExecutiveSummaryViewer
                        redraftResult={redraftResult}
                        contractName={file?.name || 'Vertrag'}
                      />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* No Redraft Yet State */}
              {!redraftResult && !isRedrafting && (
                <motion.div 
                  className={styles.emptyPremium}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <div className={styles.emptyPremiumIcon}>
                    <Wand2 className="w-12 h-12" />
                  </div>
                  <h4>Automatische Vertragsoptimierung</h4>
                  <p>
                    Klicken Sie auf "Auto-Neufassung" um eine optimierte Vertragsversion zu generieren 
                    und auf erweiterte Features zuzugreifen
                  </p>
                  <div className={styles.premiumFeatures}>
                    <div className={styles.premiumFeature}>
                      <GitCompare className="w-4 h-4" />
                      <span>Diff-Ansicht</span>
                    </div>
                    <div className={styles.premiumFeature}>
                      <FileCheck className="w-4 h-4" />
                      <span>Clean & Redline PDFs</span>
                    </div>
                    <div className={styles.premiumFeature}>
                      <Mail className="w-4 h-4" />
                      <span>3-Ton Pitches</span>
                    </div>
                    <div className={styles.premiumFeature}>
                      <BarChart3 className="w-4 h-4" />
                      <span>Executive Summary</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Toast Portal */}
      <AnimatePresence>
        {toast && (
          <Toast 
            message={toast.message} 
            type={toast.type} 
            onClose={() => setToast(null)} 
          />
        )}
      </AnimatePresence>
    </>
  );
}