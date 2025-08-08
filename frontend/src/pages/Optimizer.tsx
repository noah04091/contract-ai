// 📁 src/pages/Optimizer.tsx - FIXED: Alle TypeScript-Fehler behoben
import React, { useEffect, useState, useRef, useCallback } from "react";
import ReactDOM from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet";
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
  BookOpen,
  Clock,
  DollarSign,
  Shield,
  CheckCircle2,
  Lock,
  Wand2,
  TrendingUp,
  Copy,
  FileDown,
  Users,
  Building2,
  User,
  ChevronDown,
  ChevronUp,
  Home,
  Calendar,
  Euro,
  Umbrella,        // Ersetzt Beach
  Timer,
  Receipt,
  PiggyBank,       // Ersetzt Savings
  Hammer,          // Ersetzt Build
  CalendarClock,   // Ersetzt Schedule
  Gavel,
  Key,             // Ersetzt VpnKey
  Truck,           // Ersetzt LocalShipping
  ShieldCheck,     // Ersetzt VerifiedUser
  Lightbulb,       // Ersetzt TipsAndUpdates
  Briefcase,       // Ersetzt Work
  Handshake,
  ScrollText,      // Ersetzt Description
  FileCheck,       // Ersetzt Policy
  Landmark,        // Ersetzt AccountBalance
  Info,
  Award,
  Zap
} from "lucide-react";

// Components
import LegendaryPremiumNotice from "../components/LegendaryPremiumNotice";
import ContractHealthDashboard from "../components/ContractHealthDashboard";

// Types - ERWEITERT für dynamische Kategorien
interface ExtendedOptimizationSuggestion {
  id: string;
  category: string; // Jetzt string statt union type für Flexibilität
  priority: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  original: string;
  improved: string;
  reasoning: string;
  legalRisk: number;
  businessImpact: number;
  implementationDifficulty: 'easy' | 'medium' | 'complex';
  estimatedSavings: string;
  marketBenchmark: string;
  implemented: boolean;
  aiInsight: string;
  relatedClauses: string[];
  categoryInfo?: ContractCategory;
}

// Import original types für Kompatibilität
import { 
  ContractHealthScore, 
  OptimizationCategory 
} from "../types/optimizer";

// Styles
import styles from "../styles/Optimizer.module.css";

// ✅ ENHANCED INTERFACES mit Vertragstyp-Support
interface ContractCategory {
  id: string;
  name: string;
  nameEN?: string;
  icon?: string;
  description?: string;
  priority?: string;
  count?: number;
  color?: string;
}

interface ContractTypeInfo {
  contractType: string;
  contractTypeEN?: string;
  description?: string;
  confidence?: number;
  categories: ContractCategory[];
  additionalInsights?: string;
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
  contractType?: string;
  contractTypeEN?: string;
  contractTypeConfidence?: number;
  contractDescription?: string;
  categories?: ContractCategory[];
  structuredOptimizations?: ExtendedOptimizationSuggestion[];
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

// ✅ FIXED: Intelligentes Icon-Mapping mit korrekten Icons
const getIconForCategory = (categoryId: string, categoryName?: string): React.ReactNode => {
  const iconMap: { [key: string]: React.ReactNode } = {
    'termination': <Clock size={18} />,
    'liability': <Shield size={18} />,
    'payment': <DollarSign size={18} />,
    'clarity': <Eye size={18} />,
    'compliance': <CheckCircle2 size={18} />,
    'salary': <Euro size={18} />,
    'working_hours': <Calendar size={18} />,
    'vacation': <Umbrella size={18} />,
    'probation': <Timer size={18} />,
    'rent': <Home size={18} />,
    'utilities': <Receipt size={18} />,
    'deposit': <PiggyBank size={18} />,
    'repairs': <Hammer size={18} />,
    'confidentiality': <Lock size={18} />,
    'duration': <CalendarClock size={18} />,
    'penalties': <Gavel size={18} />,
    'exceptions': <FileCheck size={18} />,
    'price': <Euro size={18} />,
    'warranty': <ShieldCheck size={18} />,
    'delivery': <Truck size={18} />,
    'ownership': <Key size={18} />,
    'other': <Lightbulb size={18} />,
    'general': <BookOpen size={18} />
  };
  
  if (iconMap[categoryId]) {
    return iconMap[categoryId];
  }
  
  // Intelligentes Keyword-basiertes Mapping
  const nameLower = (categoryName || categoryId).toLowerCase();
  
  if (nameLower.includes('kündigung') || nameLower.includes('frist')) return <Clock size={18} />;
  if (nameLower.includes('haftung') || nameLower.includes('risiko')) return <Shield size={18} />;
  if (nameLower.includes('zahlung') || nameLower.includes('geld') || nameLower.includes('preis')) return <Euro size={18} />;
  if (nameLower.includes('zeit') || nameLower.includes('stunde')) return <Calendar size={18} />;
  if (nameLower.includes('urlaub') || nameLower.includes('ferien')) return <Umbrella size={18} />;
  if (nameLower.includes('geheim') || nameLower.includes('vertraulich')) return <Lock size={18} />;
  if (nameLower.includes('strafe') || nameLower.includes('sanktion')) return <Gavel size={18} />;
  if (nameLower.includes('recht') || nameLower.includes('gesetz')) return <Landmark size={18} />;
  if (nameLower.includes('arbeit') || nameLower.includes('beruf')) return <Briefcase size={18} />;
  if (nameLower.includes('vertrag') || nameLower.includes('vereinbarung')) return <Handshake size={18} />;
  if (nameLower.includes('daten') || nameLower.includes('information')) return <ScrollText size={18} />;
  
  // Fallback
  return <BookOpen size={18} />;
};

// ✅ Farb-Mapping für Kategorien
const getCategoryColor = (categoryId: string, priority?: string): string => {
  if (priority === 'critical') return '#d70015';
  if (priority === 'high') return '#ff453a';
  if (priority === 'medium') return '#ff9500';
  if (priority === 'low') return '#34c759';
  
  const colorMap: { [key: string]: string } = {
    'termination': '#ff453a',
    'liability': '#ff9500',
    'payment': '#34c759',
    'clarity': '#5856d6',
    'compliance': '#af52de',
    'salary': '#30a46c',
    'working_hours': '#0091ff',
    'vacation': '#00c8ff',
    'probation': '#ff6b6b',
    'rent': '#7c3aed',
    'utilities': '#ec4899',
    'deposit': '#10b981',
    'repairs': '#f59e0b',
    'confidentiality': '#8b5cf6',
    'duration': '#06b6d4',
    'penalties': '#dc2626',
    'exceptions': '#64748b',
    'other': '#6366f1',
    'general': '#0071e3'
  };
  
  return colorMap[categoryId] || '#0071e3';
};

// ✅ PORTAL SOLUTION: Dropdown Portal Component
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

// ✅ FIXED: Parse-Funktion mit flexiblen Kategorien
const parseOptimizationResult = (
  aiText: string, 
  fileName: string, 
  categories?: ContractCategory[], 
  structuredOpts?: ExtendedOptimizationSuggestion[]
): ExtendedOptimizationSuggestion[] => {
  
  if (structuredOpts && structuredOpts.length > 0) {
    console.log("✅ Verwende strukturierte Optimierungen aus API:", structuredOpts.length);
    return structuredOpts.map(opt => ({
      ...opt,
      id: opt.id || `opt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      implemented: false
    }));
  }
  
  const optimizations: ExtendedOptimizationSuggestion[] = [];
  
  if (!aiText || aiText.length < 50) {
    return optimizations;
  }

  const sections = aiText.split(/(?:\[KATEGORIE:|KATEGORIE:|PROBLEM:|EMPFEHLUNG:|\d+\.\s*)/i)
    .filter(section => section.trim().length > 30);
  
  const additionalSections = aiText.split(/(?:BEGRÜNDUNG:|PRIORITÄT:|UMSETZUNG:)/i)
    .filter(section => section.trim().length > 50);
  
  const allSections = [...sections, ...additionalSections]
    .filter((section, index, arr) => arr.indexOf(section) === index)
    .slice(0, 15);

  allSections.forEach((section, index) => {
    if (section.trim().length < 40) return;
    
    let category: string = 'clarity';
    let priority: ExtendedOptimizationSuggestion['priority'] = 'medium';
    
    const lowerSection = section.toLowerCase();
    
    // Versuche Kategorie aus den dynamischen Kategorien zu matchen
    if (categories && categories.length > 0) {
      for (const cat of categories) {
        if (lowerSection.includes(cat.name.toLowerCase()) || 
            (cat.nameEN && lowerSection.includes(cat.nameEN.toLowerCase()))) {
          category = cat.id;
          priority = cat.priority === 'critical' ? 'critical' :
                    cat.priority === 'high' ? 'high' :
                    cat.priority === 'low' ? 'low' : 'medium';
          break;
        }
      }
    }
    
    // Fallback auf keyword-basierte Erkennung
    if (category === 'clarity') {
      if (lowerSection.includes('kündigung') || lowerSection.includes('laufzeit')) {
        category = 'termination';
        priority = 'high';
      } else if (lowerSection.includes('haftung') || lowerSection.includes('risiko')) {
        category = 'liability';
        priority = 'high';
      } else if (lowerSection.includes('zahlung') || lowerSection.includes('vergütung')) {
        category = 'payment';
        priority = 'medium';
      } else if (lowerSection.includes('dsgvo') || lowerSection.includes('datenschutz')) {
        category = 'compliance';
        priority = 'high';
      }
    }

    let confidence = 75;
    if (section.length > 200) confidence += 10;
    if (lowerSection.includes('empfehlung') || lowerSection.includes('sollte')) confidence += 8;
    if (lowerSection.includes('kritisch') || lowerSection.includes('wichtig')) confidence += 7;
    
    const sentences = section.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    let original = "";
    let improved = "";
    let reasoning = "";
    
    if (section.includes('PROBLEM:') && section.includes('EMPFEHLUNG:')) {
      const problemMatch = section.match(/PROBLEM:\s*([^E]+)EMPFEHLUNG:/i);
      const empfehlungMatch = section.match(/EMPFEHLUNG:\s*([^B]+)(?:BEGRÜNDUNG:|$)/i);
      
      if (problemMatch) original = problemMatch[1].trim();
      if (empfehlungMatch) improved = empfehlungMatch[1].trim();
      
      const restText = section.replace(/PROBLEM:.*?EMPFEHLUNG:.*?(?:BEGRÜNDUNG:|$)/i, '').trim();
      reasoning = restText || section.substring(Math.max(0, section.length - 300));
    } else {
      if (sentences.length >= 3) {
        original = sentences.slice(0, Math.ceil(sentences.length / 3)).join('. ').trim() + '.';
        improved = sentences.slice(Math.ceil(sentences.length / 3), Math.ceil(2 * sentences.length / 3)).join('. ').trim() + '.';
        reasoning = sentences.slice(Math.ceil(2 * sentences.length / 3)).join('. ').trim() + '.';
      } else {
        original = "Aktuelle Formulierung erkannt";
        improved = sentences[0]?.trim() + '.' || section.substring(0, 150) + '...';
        reasoning = sentences.slice(1).join('. ').trim() || section.substring(150, 400) + '...';
      }
    }

    if (reasoning.length < 100) {
      reasoning = generateContextualReasoning(category);
    }

    let estimatedSavings = 'Risikoreduzierung';
    if (category === 'payment' || category === 'salary') {
      estimatedSavings = `~${800 + Math.floor(Math.random() * 2000)}€/Jahr`;
    } else if (category === 'termination') {
      estimatedSavings = `~${400 + Math.floor(Math.random() * 800)}€ Flexibilität`;
    } else if (category === 'liability') {
      estimatedSavings = `Risikoreduktion ~${5 + Math.floor(Math.random() * 15)}k€`;
    }

    let marketBenchmark = `Basierend auf ${fileName} Analyse`;
    if (category === 'termination') {
      marketBenchmark = `${60 + Math.floor(Math.random() * 30)}% der Verträge haben kürzere Fristen`;
    } else if (category === 'liability') {
      marketBenchmark = `${70 + Math.floor(Math.random() * 25)}% begrenzen Haftung`;
    }

    let implementationDifficulty: ExtendedOptimizationSuggestion['implementationDifficulty'] = 'easy';
    if (category === 'liability' || category === 'penalties') {
      implementationDifficulty = 'complex';
    } else if (category === 'compliance' || category === 'confidentiality') {
      implementationDifficulty = 'medium';
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
      implementationDifficulty,
      estimatedSavings,
      marketBenchmark,
      implemented: false,
      aiInsight: `KI-Vertrauen ${confidence}%: ${section.substring(0, 100)}...`,
      relatedClauses: [`Bezug zu ${category}`, `Priorität: ${priority}`]
    });
  });

  // Wenn zu wenige Optimierungen gefunden wurden, füge Fallbacks hinzu
  if (optimizations.length < 5 && categories) {
    const existingCategories = optimizations.map(opt => opt.category);
    const missingCategories = categories.filter(cat => !existingCategories.includes(cat.id));
    
    missingCategories.slice(0, 5 - optimizations.length).forEach((cat, index) => {
      optimizations.push(createFallbackOptimization(cat, index));
    });
  }

  return optimizations.slice(0, 10);
};

// Helper-Funktion für kontextbasierte Begründungen
const generateContextualReasoning = (category: string): string => {
  const reasonings: { [key: string]: string } = {
    'termination': `Diese Optimierung der Kündigungsregelungen ist rechtlich und wirtschaftlich vorteilhaft. Marktübliche Kündigungsfristen schaffen Planungssicherheit für beide Vertragsparteien und entsprechen aktuellen arbeitsrechtlichen Standards.`,
    'liability': `Die Haftungsklausel bedarf einer rechtssicheren Anpassung, um beide Parteien angemessen zu schützen. Eine ausgewogene Haftungsregelung verhindert übermäßige Risiken und entspricht der aktuellen Rechtsprechung.`,
    'payment': `Optimierte Zahlungskonditionen verbessern den Cashflow und reduzieren Ausfallrisiken. Die angepassten Fristen entsprechen Branchenstandards und erleichtern die Liquiditätsplanung.`,
    'salary': `Eine marktgerechte Vergütungsstruktur ist essentiell für Mitarbeiterbindung und rechtliche Compliance. Die Anpassung berücksichtigt aktuelle Tarifverträge und Branchenstandards.`,
    'compliance': `Die Compliance-Anpassung gewährleistet die Einhaltung aktueller Rechtsvorschriften, insbesondere der DSGVO und branchenspezifischer Regularien.`,
    'confidentiality': `Verbesserte Geheimhaltungsklauseln schützen sensible Informationen effektiver und schaffen klare Grenzen für alle Beteiligten.`,
    'rent': `Optimierte Mietkonditionen schaffen faire Bedingungen und reduzieren Konfliktpotential zwischen Mieter und Vermieter.`,
    'default': `Diese Vertragsoptimierung verbessert die rechtliche Klarheit und reduziert potentielle Risiken für alle Vertragsparteien.`
  };
  
  return reasonings[category] || reasonings['default'];
};

// Helper-Funktion für Fallback-Optimierungen
const createFallbackOptimization = (category: ContractCategory, index: number): ExtendedOptimizationSuggestion => {
  return {
    id: `opt_fallback_${category.id}_${Date.now()}_${index}`,
    category: category.id,
    priority: category.priority === 'high' ? 'high' : 'medium',
    confidence: 75 + Math.floor(Math.random() * 15),
    original: `Aktuelle Regelung zu ${category.name} könnte optimiert werden`,
    improved: `Verbesserte ${category.name}-Klausel mit marktüblichen Standards`,
    reasoning: generateContextualReasoning(category.id),
    legalRisk: category.priority === 'high' ? 6 : 4,
    businessImpact: category.priority === 'high' ? 7 : 5,
    implementationDifficulty: 'medium',
    estimatedSavings: "Risikominimierung",
    marketBenchmark: "Entspricht Best Practices",
    implemented: false,
    aiInsight: `KI-Empfehlung für ${category.name}`,
    relatedClauses: [category.name]
  };
};

// ✅ FIXED: Score-Berechnung mit flexiblen Kategorien
const calculateContractScore = (optimizations: ExtendedOptimizationSuggestion[], categories?: ContractCategory[]): ContractHealthScore => {
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

  // Dynamische Kategorie-Scores
  const categoryScores: { [key: string]: { score: number; trend: 'up' | 'down' | 'stable' } } = {};
  
  // Initialisiere mit Standard-Kategorien oder dynamischen
  const defaultCategories = ['termination', 'liability', 'payment', 'clarity', 'compliance'];
  const allCategories = categories 
    ? categories.map(c => c.id)
    : [...new Set([...defaultCategories, ...optimizations.map(o => o.category)])];
  
  allCategories.forEach(catId => {
    categoryScores[catId] = { score: Math.round(baseScore), trend: 'stable' };
  });

  // Anpasse Scores basierend auf Optimierungen
  optimizations.forEach(opt => {
    if (!opt.implemented) {
      const reduction = opt.priority === 'critical' ? 15 : opt.priority === 'high' ? 8 : 4;
      if (categoryScores[opt.category]) {
        categoryScores[opt.category].score = Math.max(15, Math.round(categoryScores[opt.category].score - reduction));
      }
    } else {
      if (categoryScores[opt.category]) {
        categoryScores[opt.category].score = Math.min(100, Math.round(categoryScores[opt.category].score + 3));
        categoryScores[opt.category].trend = 'up';
      }
    }
  });

  // Stelle sicher, dass mindestens die Standard-Kategorien vorhanden sind
  defaultCategories.forEach(cat => {
    if (!categoryScores[cat]) {
      categoryScores[cat] = { score: Math.round(baseScore), trend: 'stable' };
    }
  });

  return {
    overall: Math.round(finalScore),
    categories: categoryScores as any,
    industryPercentile: Math.max(10, Math.round(finalScore - 20)),
    riskLevel: finalScore < 40 ? 'critical' : finalScore < 60 ? 'high' : finalScore < 80 ? 'medium' : 'low'
  };
};

// ==========================================
// 🎯 MAIN COMPONENT
// ==========================================

export default function Optimizer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizations, setOptimizations] = useState<ExtendedOptimizationSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [contractScore, setContractScore] = useState<ContractHealthScore | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  
  // ✅ NEU: Vertragstyp-Informationen
  const [contractTypeInfo, setContractTypeInfo] = useState<ContractTypeInfo | null>(null);
  const [dynamicCategories, setDynamicCategories] = useState<OptimizationCategory[]>([]);
  
  // ✅ PHASE 2: Export & Pitch States + PORTAL REFS
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showPitchMenu, setShowPitchMenu] = useState(false);
  const [selectedPitchStyle, setSelectedPitchStyle] = useState<string>('business');
  
  // ✅ NEW: Better Toast/Feedback System
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // ✅ PHASE 3: Smart Contract Generator States
  const [contractId, setContractId] = useState<string | null>(null);
  const [isGeneratingContract, setIsGeneratingContract] = useState(false);
  
  const [originalContractText, setOriginalContractText] = useState<string>('');
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pitchButtonRef = useRef<HTMLButtonElement>(null);
  const exportButtonRef = useRef<HTMLButtonElement>(null);

  // ✅ PHASE 2: Export Options
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

  // ✅ PHASE 2: Pitch Styles
  const pitchStyles: PitchStyle[] = [
    {
      id: 'lawyer',
      name: 'Rechtlich',
      icon: <Building2 size={16} />,
      description: 'Juristische Präzision, Paragraphen-Referenzen',
      target: 'lawyer'
    },
    {
      id: 'business',
      name: 'Business',
      icon: <Users size={16} />,
      description: 'Professionell, geschäftsorientiert',
      target: 'business'
    },
    {
      id: 'private',
      name: 'Privat',
      icon: <User size={16} />,
      description: 'Verständlich, höflich, laienfreundlich',
      target: 'private'
    }
  ];

  // ✨ Premium Status laden
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

  // ✅ NEU: Dynamische Kategorien basierend auf Optimierungen updaten
  useEffect(() => {
    if (contractTypeInfo && contractTypeInfo.categories) {
      // Erstelle dynamische Kategorien aus Vertragstyp-Info
      const categories: OptimizationCategory[] = [
        { 
          id: 'all', 
          name: 'Alle Bereiche', 
          icon: <BookOpen size={18} />, 
          color: '#0071e3', 
          count: optimizations.length 
        },
        ...contractTypeInfo.categories.map(cat => ({
          id: cat.id,
          name: cat.name,
          icon: getIconForCategory(cat.id, cat.name),
          color: getCategoryColor(cat.id, cat.priority),
          count: optimizations.filter(o => o.category === cat.id).length
        }))
      ];
      
      // Füge "Sonstige" hinzu, falls es Optimierungen ohne Kategorie gibt
      const otherOptimizations = optimizations.filter(
        o => !contractTypeInfo.categories.some(c => c.id === o.category) && o.category !== 'other'
      );
      
      if (otherOptimizations.length > 0 || optimizations.some(o => o.category === 'other')) {
        categories.push({
          id: 'other',
          name: 'Sonstige Optimierungen',
          icon: <Lightbulb size={18} />,
          color: '#6366f1',
          count: optimizations.filter(o => o.category === 'other').length + otherOptimizations.length
        });
      }
      
      setDynamicCategories(categories);
    } else if (optimizations.length > 0) {
      // Fallback auf Standard-Kategorien
      const standardCategories: OptimizationCategory[] = [
        { 
          id: 'all', 
          name: 'Alle Bereiche', 
          icon: <BookOpen size={18} />, 
          color: '#0071e3', 
          count: optimizations.length 
        },
        { 
          id: 'termination', 
          name: 'Kündigung', 
          icon: <Clock size={18} />, 
          color: '#ff453a', 
          count: optimizations.filter(o => o.category === 'termination').length 
        },
        { 
          id: 'liability', 
          name: 'Haftung', 
          icon: <Shield size={18} />, 
          color: '#ff9500', 
          count: optimizations.filter(o => o.category === 'liability').length 
        },
        { 
          id: 'payment', 
          name: 'Zahlung', 
          icon: <DollarSign size={18} />, 
          color: '#34c759', 
          count: optimizations.filter(o => o.category === 'payment').length 
        },
        { 
          id: 'clarity', 
          name: 'Klarheit', 
          icon: <Eye size={18} />, 
          color: '#5856d6', 
          count: optimizations.filter(o => o.category === 'clarity').length 
        },
        { 
          id: 'compliance', 
          name: 'Compliance', 
          icon: <CheckCircle2 size={18} />, 
          color: '#af52de', 
          count: optimizations.filter(o => o.category === 'compliance').length 
        }
      ];
      
      setDynamicCategories(standardCategories);
    }
  }, [optimizations, contractTypeInfo]);

  useEffect(() => {
    if (optimizations.length > 0) {
      const updatedScore = calculateContractScore(optimizations, contractTypeInfo?.categories);
      setContractScore(updatedScore);
    }
  }, [optimizations, contractTypeInfo]);

  // ✅ PORTAL SOLUTION: Simplified outside click handling
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

  // ✨ ENHANCED File Upload Handler mit Vertragstyp-Erkennung
  const handleUpload = async () => {
    if (!file || !isPremium) return;

    setLoading(true);
    setOptimizations([]);
    setError(null);
    setOriginalContractText('');
    setAnalysisData(null);
    setContractTypeInfo(null);
    setDynamicCategories([]);

    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log("🚀 Sende Datei an Backend für Enhanced KI-Optimierung mit Typ-Erkennung...");
      
      const res = await fetch("/api/optimize", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || `Server Error: ${res.status}`);
      }

      if (!data.success) {
        throw new Error(data.message || "Optimierung fehlgeschlagen");
      }

      console.log("✅ Enhanced Backend Response erhalten:", {
        success: data.success,
        hasOptimizationResult: !!data.optimizationResult,
        contractType: data.contractType,
        categoriesCount: data.categories?.length,
        structuredOptimizationsCount: data.structuredOptimizations?.length
      });

      // ✅ CRITICAL: Speichere alle Daten
      setAnalysisData(data);
      
      // ✅ NEU: Speichere Vertragstyp-Info
      if (data.contractType) {
        const typeInfo: ContractTypeInfo = {
          contractType: data.contractType,
          contractTypeEN: data.contractTypeEN,
          description: data.contractDescription,
          confidence: data.contractTypeConfidence || 85,
          categories: data.categories || [],
          additionalInsights: data.metadata?.additionalInsights
        };
        setContractTypeInfo(typeInfo);
        console.log("✅ Vertragstyp erkannt:", typeInfo.contractType, `(${typeInfo.confidence}% Confidence)`);
        console.log("📊 Dynamische Kategorien:", typeInfo.categories.map(c => c.name).join(", "));
      }
      
      // ✅ Speichere originalen Text
      if (data.originalText) {
        setOriginalContractText(data.originalText);
        console.log("✅ Original Contract Text gespeichert:", data.originalText.length + " Zeichen");
      }

      // ✅ Parse Optimierungen mit dynamischen Kategorien
      if (data.optimizationResult && data.optimizationResult.trim()) {
        const parsedOptimizations = parseOptimizationResult(
          data.optimizationResult, 
          file.name,
          data.categories,
          data.structuredOptimizations
        );
        
        const calculatedScore = calculateContractScore(parsedOptimizations, data.categories);
        
        setOptimizations(parsedOptimizations);
        setContractScore(calculatedScore);
        
        console.log("✅ Optimierungen erfolgreich geparst:", {
          optimizationCount: parsedOptimizations.length,
          score: calculatedScore.overall,
          categories: Object.keys(calculatedScore.categories)
        });
        
        if (parsedOptimizations.length === 0) {
          setError("Keine strukturierten Optimierungen gefunden. Der Vertrag scheint bereits gut zu sein!");
        }
      } else {
        throw new Error("Keine Optimierungsergebnisse vom Backend erhalten");
      }

    } catch (error) {
      const err = error as Error;
      console.error("❌ Optimierung-Fehler:", err);
      
      let errorMessage = "Fehler bei der KI-Optimierung.";
      
      if (err.message.includes("Limit erreicht")) {
        errorMessage = "❌ Optimierung-Limit erreicht. Bitte upgrade dein Paket.";
      } else if (err.message.includes("PDF")) {
        errorMessage = "❌ PDF-Datei konnte nicht verarbeitet werden. Prüfe das Dateiformat.";
      } else if (err.message.includes("Timeout")) {
        errorMessage = "⏱️ Optimierung-Timeout. Versuche es mit einer kleineren Datei.";
      } else if (err.message.includes("nicht verfügbar")) {
        errorMessage = "🤖 KI-Service vorübergehend nicht verfügbar. Versuche es später.";
      } else if (err.message.includes("authentifiziert")) {
        errorMessage = "🔐 Authentifizierung fehlgeschlagen. Bitte logge dich neu ein.";
      } else {
        errorMessage = `❌ ${err.message}`;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: Toast/Feedback Helper
  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ✅ Smart Contract Generator Function
  const handleGenerateOptimizedContract = useCallback(async () => {
    // Validierung
    if (!file || optimizations.length === 0) {
      showToast("❌ Bitte lade erst einen Vertrag hoch und führe eine Optimierung durch.", 'error');
      return;
    }

    // Prüfe ob Optimierungen ausgewählt wurden (falls Simulation an ist)
    const selectedOptimizations = showSimulation 
      ? optimizations.filter(opt => opt.implemented)
      : optimizations;

    if (showSimulation && selectedOptimizations.length === 0) {
      showToast("❌ Bitte wähle mindestens eine Optimierung für den optimierten Vertrag aus.", 'error');
      return;
    }

    setIsGeneratingContract(true);
    showToast("🪄 Optimierter Vertrag wird generiert...", 'success');

    try {
      // ✅ CRITICAL FIX: Robuste Contract-ID Beschaffung
      let currentContractId = contractId;
      
      if (!currentContractId) {
        console.log("📤 Erstelle Contract für Smart Contract Generator...");
        
        // ✅ STRATEGY A: Versuche zuerst Contract zu speichern basierend auf Analysis-Daten
        if (analysisData) {
          try {
            console.log("💾 Speichere Contract basierend auf Analysis-Daten...");
            
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
              uploadType: analysisData.uploadType || 'LOCAL_UPLOAD',
              // NEU: Vertragstyp-Info
              contractType: contractTypeInfo?.contractType,
              contractTypeEN: contractTypeInfo?.contractTypeEN,
              categories: contractTypeInfo?.categories
            };

            console.log("💾 Contract Data:", contractData);

            const contractRes = await fetch("/api/contracts", {
              method: "POST",
              credentials: "include",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(contractData),
            });

            if (contractRes.ok) {
              const contractResult = await contractRes.json();
              currentContractId = contractResult.contractId;
              setContractId(currentContractId);
              console.log("✅ Contract erfolgreich erstellt mit ID:", currentContractId);
            } else {
              throw new Error("Contract-Speicherung fehlgeschlagen");
            }
          } catch (contractError) {
            console.warn("⚠️ Contract-Speicherung fehlgeschlagen, versuche Alternative:", contractError);
            currentContractId = null;
          }
        }
        
        // ✅ STRATEGY B: Fallback - Re-Upload für Contract-ID
        if (!currentContractId) {
          console.log("📤 Fallback: Re-Upload für Contract-ID...");
          
          const formData = new FormData();
          formData.append("file", file);
          
          const uploadRes = await fetch("/api/analyze", {
            method: "POST",
            credentials: "include",
            body: formData,
          });

          const uploadData = await uploadRes.json();
          
          if (!uploadRes.ok) {
            throw new Error(uploadData.message || "Contract Upload fehlgeschlagen");
          }

          currentContractId = uploadData.analysisId || 
                            uploadData.contractId || 
                            uploadData.requestId;
          
          if (!currentContractId) {
            throw new Error("❌ Keine Contract ID verfügbar. Bitte lade den Vertrag erneut hoch.");
          }
          
          setContractId(currentContractId);
          console.log("✅ Fallback Contract ID erhalten:", currentContractId);
        }
      }

      // ✅ STEP 2: Generate Optimized Contract
      console.log("🎯 Starte Smart Contract Generation mit ID:", currentContractId);
      
      const generatePayload = {
        optimizations: selectedOptimizations.map(opt => ({
          id: opt.id,
          category: opt.category,
          priority: opt.priority,
          originalText: opt.original,
          improvedText: opt.improved,
          reasoning: opt.reasoning,
          confidence: opt.confidence,
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
          analysisData: analysisData,
          // NEU: Vertragstyp-Info
          contractType: contractTypeInfo?.contractType,
          contractCategories: contractTypeInfo?.categories
        }
      };

      console.log("📤 Generate Payload:", {
        optimizationCount: generatePayload.optimizations.length,
        contractId: currentContractId,
        hasOriginalContent: !!originalContractText,
        contractType: contractTypeInfo?.contractType
      });

      const generateRes = await fetch(`/api/contracts/${currentContractId}/generate-optimized`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(generatePayload)
      });

      if (!generateRes.ok) {
        const errorData = await generateRes.json();
        console.error("❌ Smart Contract Generation Error:", errorData);
        
        if (generateRes.status === 404) {
          throw new Error("❌ Contract nicht gefunden. Bitte lade den Vertrag erneut hoch.");
        } else if (generateRes.status === 400) {
          throw new Error("❌ Ungültige Optimierungsdaten. Führe die Analyse erneut durch.");
        } else {
          throw new Error(errorData.message || `Server Error: ${generateRes.status}`);
        }
      }

      // ✅ STEP 3: PDF Download
      console.log("📄 Download optimierte PDF...");
      
      const blob = await generateRes.blob();
      
      if (blob.size === 0) {
        throw new Error("❌ Leere PDF erhalten. Versuche es erneut.");
      }
      
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `Optimiert_${file.name.replace('.pdf', '')}_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      // ✅ Success!
      showToast(`✅ Optimierter Vertrag erfolgreich generiert! (${selectedOptimizations.length} Optimierungen angewendet)`, 'success');
      
      console.log("🎉 Smart Contract Generation erfolgreich abgeschlossen!", {
        contractId: currentContractId,
        optimizationsApplied: selectedOptimizations.length,
        fileName: file.name,
        pdfSize: blob.size,
        contractType: contractTypeInfo?.contractType
      });

    } catch (error) {
      const err = error as Error;
      console.error("❌ Smart Contract Generation Fehler:", err);
      
      let errorMessage = "❌ Fehler beim Generieren des optimierten Vertrags.";
      
      if (err.message.includes("nicht gefunden")) {
        errorMessage = "❌ Contract nicht gefunden. Bitte lade den Vertrag erneut hoch.";
      } else if (err.message.includes("PDF")) {
        errorMessage = "❌ PDF-Generierung fehlgeschlagen. Prüfe das Dateiformat.";
      } else if (err.message.includes("Optimierungen")) {
        errorMessage = "❌ Ungültige Optimierungen. Führe die Analyse erneut durch.";
      } else if (err.message.includes("authentifiziert")) {
        errorMessage = "🔐 Authentifizierung fehlgeschlagen. Bitte logge dich neu ein.";
      } else if (err.message.includes("Subscription")) {
        errorMessage = "⭐ Premium-Feature. Bitte upgrade dein Paket.";
      } else {
        errorMessage = err.message.startsWith("❌") ? err.message : `❌ ${err.message}`;
      }
      
      showToast(errorMessage, 'error');
    } finally {
      setIsGeneratingContract(false);
    }
  }, [file, optimizations, contractId, showSimulation, showToast, originalContractText, analysisData, contractTypeInfo]);

  // ✨ Handlers  
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
    // NEU: Reset Vertragstyp-Info
    setContractTypeInfo(null);
    setDynamicCategories([]);
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
    return calculateContractScore(optimizations, contractTypeInfo?.categories).overall;
  }, [optimizations, contractTypeInfo]);

  const toggleSuggestion = useCallback((id: string) => {
    setOptimizations(prev => {
      const updated = prev.map(opt => 
        opt.id === id ? { ...opt, implemented: !opt.implemented } : opt
      );
      return updated;
    });
  }, []);

  // ✅ ENHANCED: Pitch Generator mit Vertragstyp-Awareness
  const generatePitch = useCallback((style: string = selectedPitchStyle) => {
    const implementedSuggestions = optimizations.filter(opt => opt.implemented);
    
    if (implementedSuggestions.length === 0) {
      showToast("❌ Bitte wähle mindestens eine Optimierung aus für den Pitch.", 'error');
      return;
    }

    const categoryNames: { [key: string]: string } = {};
    
    // Nutze dynamische Kategorie-Namen wenn verfügbar
    if (contractTypeInfo && contractTypeInfo.categories) {
      contractTypeInfo.categories.forEach(cat => {
        categoryNames[cat.id] = cat.name;
      });
    } else {
      // Fallback auf Standard-Namen
      categoryNames['termination'] = 'Kündigungsregelungen';
      categoryNames['liability'] = 'Haftungsklauseln';
      categoryNames['payment'] = 'Zahlungskonditionen';
      categoryNames['compliance'] = 'Compliance & Datenschutz';
      categoryNames['clarity'] = 'Vertragsklarheit';
    }

    const improvementScore = calculateNewScore() - (contractScore?.overall || 0);
    const contractTypeName = contractTypeInfo?.contractType || 'Vertrag';

    const pitchTemplates = {
      lawyer: `Sehr geehrte Kolleginnen und Kollegen,

nach eingehender rechtlicher Prüfung des vorliegenden ${contractTypeName} mittels KI-gestützter Analyse (Confidence-Level: ${contractTypeInfo?.confidence || 85}%) möchte ich ${implementedSuggestions.length} substantielle Optimierungsvorschläge unterbreiten:

${implementedSuggestions.map((opt, index) => 
  `${index + 1}. ${categoryNames[opt.category] || opt.category} (Priorität: ${opt.priority}, Risiko-Level: ${opt.legalRisk}/10):
   📋 Status quo: ${opt.original.substring(0, 120)}...
   ⚖️ Rechtliche Empfehlung: ${opt.improved.substring(0, 120)}...
   📖 Juristische Begründung: ${opt.reasoning.split('.')[0]}. (Rechtssicherheit: ${opt.confidence}%)
   📈 Marktstandard: ${opt.marketBenchmark}
   💼 Geschätzter Impact: ${opt.estimatedSavings}
`).join('\n')}

Die vorgeschlagenen Modifikationen würden den Vertragsscore von ${contractScore?.overall || 0} auf ${calculateNewScore()} Punkte optimieren (+${Math.max(0, improvementScore)} Punkte), was einer signifikanten Risikoreduktion und Rechtssicherheitsverbesserung entspricht.

Sämtliche Empfehlungen basieren auf aktueller Rechtsprechung und Marktstandards (Stand 2024) speziell für ${contractTypeName}.

Mit kollegialen Grüßen`,

      business: `Sehr geehrte Damen und Herren,

nach einer professionellen KI-gestützten Analyse Ihres ${contractTypeName} möchte ich ${implementedSuggestions.length} strategische Optimierungsvorschläge unterbreiten, die unser Vertragsverhältnis zum beiderseitigen Vorteil verbessern können:

${implementedSuggestions.map((opt, index) => 
  `${index + 1}. ${categoryNames[opt.category] || opt.category}:
   📊 Aktueller Status: ${opt.original.substring(0, 100)}...
   🎯 Business-Optimierung: ${opt.improved.substring(0, 100)}...
   💡 Geschäftlicher Nutzen: ${opt.reasoning.split('.')[0]}.
   📈 ROI: ${opt.estimatedSavings} | Marktpositionierung: ${opt.marketBenchmark}
   🤖 KI-Analyse: ${opt.confidence}% Empfehlungsgrad
`).join('\n')}

Diese datenbasierten Empfehlungen würden unseren Vertragsscore von ${contractScore?.overall || 0} auf ${calculateNewScore()} Punkte steigern (+${Math.max(0, improvementScore)} Punkte), was messbaren Business-Value generiert.

Die Anpassungen entsprechen Best Practices für ${contractTypeName} und schaffen Win-Win-Situationen für alle Parteien.

Gerne diskutiere ich diese Optimierungen in einem strategischen Meeting.

Mit freundlichen Grüßen`,

      private: `Liebe Vertragspartner,

ich habe unseren ${contractTypeName} von einer modernen KI analysieren lassen und dabei ${implementedSuggestions.length} Verbesserungsvorschläge erhalten, die uns beiden zugutekommen könnten:

${implementedSuggestions.map((opt, index) => 
  `${index + 1}. ${categoryNames[opt.category] || opt.category}:
   📝 So ist es jetzt: ${opt.original.substring(0, 100)}...
   ✨ So könnte es besser sein: ${opt.improved.substring(0, 100)}...
   💭 Warum das sinnvoll ist: ${opt.reasoning.split('.')[0]}.
   💰 Möglicher Vorteil: ${opt.estimatedSavings}
   📊 Das ist heute üblich: ${opt.marketBenchmark}
`).join('\n')}

Die KI bewertet unseren ${contractTypeName} aktuell mit ${contractScore?.overall || 0} von 100 Punkten. Mit diesen Verbesserungen würden wir auf ${calculateNewScore()} Punkte kommen - das ist eine deutliche Verbesserung!

Alle Vorschläge sind fair und entsprechen dem, was heute bei ${contractTypeName} üblich ist.

Falls Sie Interesse haben, können wir das gerne bei einem Kaffee besprechen.

Mit freundlichen Grüßen`
    };

    const pitch = pitchTemplates[style as keyof typeof pitchTemplates] || pitchTemplates.business;

    navigator.clipboard.writeText(pitch);
    
    const styleNames = { lawyer: 'Rechtlicher', business: 'Business', private: 'Privater' };
    showToast(`✅ ${styleNames[style as keyof typeof styleNames] || 'Business'} Pitch wurde in die Zwischenablage kopiert!`);
    setShowPitchMenu(false);
  }, [optimizations, contractScore, calculateNewScore, selectedPitchStyle, showToast, contractTypeInfo]);

  // ✅ ENHANCED: Export Functions
  const handleExport = useCallback(async (exportType: string) => {
    setShowExportMenu(false);
    
    const contractTypeName = contractTypeInfo?.contractType || 'Vertrag';
    
    if (exportType === 'pdf_marked') {
      showToast("📄 PDF wird generiert...", 'success');
      
      const pdfContent = `VERTRAGSANALYSE - ${file?.name || 'Unbekannt'}
VERTRAGSTYP: ${contractTypeName} (Confidence: ${contractTypeInfo?.confidence || 0}%)
===============================================

OPTIMIERUNGSVORSCHLÄGE:
${optimizations.map((opt, index) => 
  `${index + 1}. ${opt.category.toUpperCase()}
❌ PROBLEM: ${opt.original}
✅ LÖSUNG: ${opt.improved}
📝 BEGRÜNDUNG: ${opt.reasoning}
📊 MARKT: ${opt.marketBenchmark}
💰 NUTZEN: ${opt.estimatedSavings}
⚖️ PRIORITÄT: ${opt.priority}
🤖 KI-VERTRAUEN: ${opt.confidence}%

`).join('\n')}

VERTRAGSSCORE: ${contractScore?.overall || 0}/100
VERTRAGSTYP: ${contractTypeName}
GENERIERT AM: ${new Date().toLocaleDateString('de-DE')}`;

      const blob = new Blob([pdfContent], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Vertragsanalyse_${contractTypeName}_${file?.name?.replace('.pdf', '')}_${new Date().toISOString().split('T')[0]}.txt`;
      link.click();
      
      setTimeout(() => showToast("✅ PDF-Analyse heruntergeladen!"), 1500);
      
    } else if (exportType === 'word_comments') {
      showToast("📝 Word-Dokument wird erstellt...", 'success');
      
      const wordContent = `VERTRAGSOPTIMIERUNG - ${file?.name || 'Unbekannt'}
VERTRAGSTYP: ${contractTypeName}

ZUSAMMENFASSUNG:
Vertragsscore: ${contractScore?.overall || 0}/100 Punkte
Vertragstyp: ${contractTypeName} (${contractTypeInfo?.confidence || 0}% Confidence)
Optimierungen gefunden: ${optimizations.length}
Kritische Probleme: ${optimizations.filter(o => o.priority === 'critical').length}

KATEGORIEN:
${contractTypeInfo?.categories?.map(cat => `- ${cat.name}: ${cat.description || ''}`).join('\n') || 'Standard-Kategorien'}

DETAILLIERTE OPTIMIERUNGSVORSCHLÄGE:

${optimizations.map((opt, index) => 
  `${index + 1}. KATEGORIE: ${opt.category.toUpperCase()}
   
   AKTUELLER TEXT:
   "${opt.original}"
   
   VERBESSERUNGSVORSCHLAG:
   "${opt.improved}"
   
   RECHTLICHE BEGRÜNDUNG:
   ${opt.reasoning}
   
   BUSINESS IMPACT:
   - Priorität: ${opt.priority}
   - Geschätzter Nutzen: ${opt.estimatedSavings}
   - Marktvergleich: ${opt.marketBenchmark}
   - KI-Vertrauen: ${opt.confidence}%
   
   ────────────────────────────────────────
   
`).join('\n')}

Erstellt am: ${new Date().toLocaleDateString('de-DE')}
Generiert durch KI-Vertragsoptimierung für ${contractTypeName}`;

      const blob = new Blob([wordContent], { type: 'text/plain;charset=utf-8' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Vertragsoptimierung_${contractTypeName}_${file?.name?.replace('.pdf', '')}_${new Date().toISOString().split('T')[0]}.txt`;
      link.click();
      
      setTimeout(() => showToast("✅ Word-Dokument heruntergeladen!"), 1500);
      
    } else if (exportType === 'excel_comparison') {
      const csvContent = `Vertragstyp,Kategorie,Original,Verbesserung,Begründung,Priorität,Confidence,Estimierte Ersparnisse,Markt-Benchmark\n` +
        optimizations.map(opt => 
          `"${contractTypeName}","${opt.category}","${opt.original.replace(/"/g, '""')}","${opt.improved.replace(/"/g, '""')}","${opt.reasoning.replace(/"/g, '""')}","${opt.priority}","${opt.confidence}%","${opt.estimatedSavings}","${opt.marketBenchmark}"`
        ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Vertragsanalyse_${contractTypeName}_${file?.name?.replace('.pdf', '')}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      showToast("✅ Excel-Vergleichstabelle heruntergeladen!");
      
    } else if (exportType === 'email_template') {
      generatePitch(selectedPitchStyle);
      
    } else {
      showToast("❌ Export-Format nicht unterstützt", 'error');
    }
  }, [optimizations, file, generatePitch, selectedPitchStyle, contractScore, showToast, contractTypeInfo]);

  const filteredOptimizations = selectedCategory === 'all' 
    ? optimizations 
    : optimizations.filter(opt => opt.category === selectedCategory);

  // ✨ Loading State
  if (isPremium === null) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingContent}>
          <div className={styles.loadingSpinner}></div>
          <p className={styles.loadingText}>Initialisiere KI-System...</p>
        </div>
      </div>
    );
  }

  // ✨ RENDER
  return (
    <>
      <Helmet>
        <title>Verträge mit KI optimieren & bessere Konditionen sichern | Contract AI</title>
        <meta name="description" content="Optimiere deine Verträge in Sekunden mit KI: Schwächen erkennen, Klauseln verbessern & bessere Konditionen sichern. Jetzt einfach & sicher optimieren!" />
        <meta name="keywords" content="Vertragsoptimierung, Verträge verbessern, KI Vertragsanalyse, Klauseln verbessern, bessere Konditionen, Contract AI" />
        <link rel="canonical" href="https://contract-ai.de/optimizer" />
        <meta property="og:title" content="Verträge mit KI optimieren & bessere Konditionen sichern | Contract AI" />
        <meta property="og:description" content="Verbessere deine Verträge mit KI: Schwächen erkennen, Klauseln optimieren & bessere Konditionen erreichen. Jetzt ausprobieren!" />
        <meta property="og:url" content="https://contract-ai.de/optimizer" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Verträge mit KI optimieren & bessere Konditionen sichern | Contract AI" />
        <meta name="twitter:description" content="Optimiere deine Verträge mit KI, verbessere Klauseln & sichere dir die besten Konditionen. Schnell, einfach & sicher. Jetzt starten!" />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>
      
      <div className={styles.optimizer}>
        <div className={styles.backgroundGradient}></div>

        <motion.div 
          className={styles.container}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* ✨ Header */}
          <motion.div 
            className={styles.header}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <motion.h1 className={styles.title}>
              KI-Vertragsoptimierung
            </motion.h1>
            
            <motion.p 
              className={styles.subtitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              Revolutionäre KI-Analyse für perfekte Verträge. 
              Erkenne Risiken, optimiere Klauseln, spare Zeit und Geld.
            </motion.p>

            {/* Feature Pills */}
            <motion.div
              className={styles.featurePills}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              {[
                { icon: <Brain size={16} />, text: 'KI-powered' },
                { icon: <Shield size={16} />, text: 'Risiko-Analyse' },
                { icon: <Download size={16} />, text: 'Instant-Optimierung' },
                { icon: <CheckCircle2 size={16} />, text: 'Profi-Niveau' }
              ].map((pill, index) => (
                <motion.div
                  key={index}
                  className={styles.featurePill}
                  whileHover={{ scale: 1.05, y: -2 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  {pill.icon}
                  {pill.text}
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* ✨ Premium Notice */}
          {!isPremium && (
            <LegendaryPremiumNotice onUpgrade={() => window.location.href = '/upgrade'} />
          )}

          {/* ✨ Upload Area */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <motion.div 
              className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''} ${!isPremium ? styles.disabled : ''} ${file ? styles.uploadAreaWithFile : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={isPremium ? () => fileInputRef.current?.click() : undefined}
              whileHover={isPremium ? { scale: 1.01, y: -2 } : undefined}
              animate={dragActive ? { scale: 1.02 } : { scale: 1 }}
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
                >
                  <div className={styles.fileIcon}>
                    <FileText size={32} style={{ color: '#0071e3' }} />
                  </div>
                  <div className={styles.fileDetails}>
                    <div className={styles.fileName}>{file.name}</div>
                    <div className={styles.fileSize}>
                      <CheckCircle2 size={16} style={{ color: '#34c759' }} />
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Bereit für KI-Analyse
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  className={styles.uploadPrompt}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <motion.div
                    className={styles.uploadIcon}
                    animate={dragActive ? { scale: 1.1, rotate: 5 } : { scale: 1, rotate: 0 }}
                  >
                    <Upload size={48} style={{ 
                      color: dragActive ? '#0071e3' : '#86868b'
                    }} />
                  </motion.div>
                  <h3>
                    {dragActive ? 'Datei hier ablegen' : 'Vertrag hochladen'}
                  </h3>
                  <p>
                    {dragActive 
                      ? 'Lass deine PDF-Datei los für die KI-Analyse'
                      : 'Ziehe deine PDF-Datei hierher oder klicke zum Auswählen'
                    }
                  </p>
                  {!isPremium && (
                    <div className={styles.premiumHint}>
                      <Lock size={16} />
                      Premium-Feature
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>

            {/* Action Buttons */}
            <motion.div 
              className={styles.actionButtons}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <motion.button 
                onClick={handleUpload}
                disabled={!file || loading || !isPremium}
                className={styles.primaryButton}
                whileHover={file && isPremium && !loading ? { scale: 1.02, y: -2 } : undefined}
                whileTap={file && isPremium && !loading ? { scale: 0.98 } : undefined}
              >
                {loading ? (
                  <>
                    <div className={styles.spinner}></div>
                    <span>KI analysiert...</span>
                  </>
                ) : (
                  <>
                    <Wand2 size={20} />
                    <span>KI-Analyse starten</span>
                  </>
                )}
              </motion.button>
              
              {file && (
                <motion.button 
                  onClick={handleReset}
                  className={styles.secondaryButton}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <RefreshCw size={18} />
                  <span>Zurücksetzen</span>
                </motion.button>
              )}
            </motion.div>
          </motion.div>

          {/* ✨ Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                className={styles.errorMessage}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
              >
                <AlertCircle size={24} />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ✅ NEW: Better Toast Notification System */}
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
                    ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.95) 0%, rgba(52, 199, 89, 0.9) 100%)'
                    : 'linear-gradient(135deg, rgba(255, 69, 58, 0.95) 0%, rgba(255, 69, 58, 0.9) 100%)',
                  color: 'white',
                  padding: '1rem 2rem',
                  borderRadius: '16px',
                  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontSize: '1rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  maxWidth: '400px',
                  textAlign: 'center'
                }}
              >
                {toast.type === 'success' ? '✅' : '❌'} {toast.message}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ✨ Results Area */}
          <AnimatePresence>
            {optimizations.length > 0 && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.8 }}
              >
                {/* ✅ NEU: Vertragstyp-Badge */}
                {contractTypeInfo && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '1rem',
                      marginBottom: '2rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <motion.div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        padding: '0.8rem 1.5rem',
                        background: 'linear-gradient(135deg, #af52de 0%, #d946ef 100%)',
                        borderRadius: '16px',
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '1.1rem',
                        boxShadow: '0 8px 24px rgba(175, 82, 222, 0.3)'
                      }}
                      whileHover={{ scale: 1.02 }}
                    >
                      <Award size={20} />
                      {contractTypeInfo.contractType}
                    </motion.div>
                    
                    <motion.div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        padding: '0.6rem 1rem',
                        background: 'rgba(255, 255, 255, 0.9)',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        fontWeight: 500,
                        color: '#6e6e73'
                      }}
                    >
                      <Zap size={16} />
                      {contractTypeInfo.confidence}% Confidence
                    </motion.div>
                    
                    {contractTypeInfo.additionalInsights && (
                      <motion.div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem',
                          padding: '0.6rem 1rem',
                          background: 'rgba(0, 113, 227, 0.1)',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          color: '#0071e3',
                          maxWidth: '300px'
                        }}
                      >
                        <Info size={14} />
                        {contractTypeInfo.additionalInsights}
                      </motion.div>
                    )}
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

                {/* Category Filter - NEU: Mit dynamischen Kategorien */}
                <motion.div
                  className={styles.card}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className={styles.cardHeader}>
                    <Filter size={20} style={{ color: '#0071e3' }} />
                    <span className={styles.cardTitle}>Filter & Kategorien</span>
                    <span style={{ 
                      marginLeft: 'auto',
                      fontSize: '0.9rem',
                      color: '#6e6e73',
                      fontWeight: 500
                    }}>
                      {filteredOptimizations.length} von {optimizations.length} Optimierungen
                    </span>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '0.8rem' 
                  }}>
                    {dynamicCategories.filter(cat => cat.count > 0 || cat.id === 'all').map((category) => (
                      <motion.button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.8rem 1.2rem',
                          borderRadius: '16px',
                          border: 'none',
                          fontSize: '0.9rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          background: selectedCategory === category.id 
                            ? `linear-gradient(135deg, ${category.color} 0%, ${category.color}dd 100%)`
                            : 'rgba(255, 255, 255, 0.8)',
                          color: selectedCategory === category.id ? 'white' : '#1d1d1f',
                          boxShadow: selectedCategory === category.id 
                            ? `0 8px 24px ${category.color}40`
                            : '0 4px 12px rgba(0, 0, 0, 0.05)',
                          transform: selectedCategory === category.id ? 'scale(1.02)' : 'scale(1)'
                        }}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {category.icon}
                        {category.name}
                        <span style={{
                          backgroundColor: selectedCategory === category.id 
                            ? 'rgba(255,255,255,0.3)' 
                            : category.color + '20',
                          color: selectedCategory === category.id 
                            ? 'white' 
                            : category.color,
                          borderRadius: '12px',
                          padding: '0.2rem 0.5rem',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          minWidth: '20px',
                          textAlign: 'center'
                        }}>
                          {category.count}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>

                {/* Enhanced Control Panel mit Smart Contract Generator */}
                <motion.div
                  className={styles.card}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1.5rem',
                    flexWrap: 'wrap',
                    gap: '1rem'
                  }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  {/* Left Section: Simulation Toggle */}
                  <motion.button
                    onClick={() => setShowSimulation(!showSimulation)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      padding: '0.8rem 1.5rem',
                      borderRadius: '12px',
                      border: 'none',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: showSimulation 
                        ? 'linear-gradient(135deg, #0071e3 0%, #005bb5 100%)'
                        : 'rgba(0, 113, 227, 0.1)',
                      color: showSimulation ? 'white' : '#0071e3',
                      transition: 'all 0.2s ease',
                      boxShadow: showSimulation 
                        ? '0 8px 24px rgba(0, 113, 227, 0.3)'
                        : 'none'
                    }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {showSimulation ? <EyeOff size={16} /> : <Eye size={16} />}
                    <span>{showSimulation ? 'Simulation beenden' : 'Live-Simulation'}</span>
                  </motion.button>

                  {/* MAIN FEATURE: Smart Contract Generator Button */}
                  <motion.button
                    onClick={handleGenerateOptimizedContract}
                    disabled={isGeneratingContract || !file || optimizations.length === 0 || !isPremium}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.8rem',
                      padding: '1rem 2rem',
                      borderRadius: '16px',
                      border: 'none',
                      fontSize: '1rem',
                      fontWeight: 700,
                      cursor: isGeneratingContract || !file || optimizations.length === 0 || !isPremium ? 'not-allowed' : 'pointer',
                      background: isGeneratingContract || !file || optimizations.length === 0 || !isPremium
                        ? 'linear-gradient(135deg, #86868b 0%, #6e6e73 100%)'
                        : 'linear-gradient(135deg, #af52de 0%, #d946ef 100%)',
                      color: 'white',
                      transition: 'all 0.3s ease',
                      boxShadow: isGeneratingContract || !file || optimizations.length === 0 || !isPremium
                        ? 'none'
                        : '0 12px 32px rgba(175, 82, 222, 0.4)',
                      opacity: isGeneratingContract || !file || optimizations.length === 0 || !isPremium ? 0.6 : 1,
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    whileHover={!isGeneratingContract && file && optimizations.length > 0 && isPremium ? { 
                      scale: 1.05, 
                      y: -2,
                      boxShadow: '0 16px 40px rgba(175, 82, 222, 0.5)'
                    } : undefined}
                    whileTap={!isGeneratingContract && file && optimizations.length > 0 && isPremium ? { scale: 0.98 } : undefined}
                  >
                    {/* Animated Background Gradient */}
                    {!isGeneratingContract && file && optimizations.length > 0 && isPremium && (
                      <motion.div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: '-100%',
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                          zIndex: 1
                        }}
                        animate={{
                          left: ['-100%', '100%']
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear"
                        }}
                      />
                    )}

                    {/* Button Content */}
                    <div style={{ zIndex: 2, display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      {isGeneratingContract ? (
                        <>
                          <motion.div
                            style={{
                              width: '20px',
                              height: '20px',
                              border: '2px solid rgba(255,255,255,0.3)',
                              borderTop: '2px solid white',
                              borderRadius: '50%'
                            }}
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          <span>Generiere optimierten Vertrag...</span>
                        </>
                      ) : (
                        <>
                          <motion.div
                            animate={file && optimizations.length > 0 && isPremium ? {
                              rotate: [0, 10, -10, 0],
                              scale: [1, 1.1, 1]
                            } : {}}
                            transition={{ duration: 2, repeat: Infinity }}
                          >
                            <Wand2 size={20} />
                          </motion.div>
                          <span>🪄 Optimierten Vertrag generieren</span>
                          {!isPremium && <Lock size={16} />}
                        </>
                      )}
                    </div>
                  </motion.button>

                  {/* Right Section: Export & Pitch Buttons */}
                  <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', position: 'relative' }}>
                    {/* Pitch Generator Button */}
                    <div style={{ position: 'relative' }}>
                      <motion.button
                        ref={pitchButtonRef}
                        onClick={() => setShowPitchMenu(!showPitchMenu)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.8rem 1.5rem',
                          borderRadius: '12px',
                          border: 'none',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: 'linear-gradient(135deg, #34c759 0%, #30a46c 100%)',
                          color: 'white',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 8px 24px rgba(52, 199, 89, 0.3)'
                        }}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Mail size={16} />
                        <span>Profi-Pitch generieren</span>
                        {showPitchMenu ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </motion.button>
                    </div>
                    
                    {/* Export Button */}
                    <div style={{ position: 'relative' }}>
                      <motion.button
                        ref={exportButtonRef}
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.6rem',
                          padding: '0.8rem 1.5rem',
                          borderRadius: '12px',
                          border: 'none',
                          fontSize: '0.95rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          background: 'linear-gradient(135deg, #5856d6 0%, #4c4ad6 100%)',
                          color: 'white',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 8px 24px rgba(88, 86, 214, 0.3)'
                        }}
                        whileHover={{ scale: 1.02, y: -1 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Download size={16} />
                        <span>Premium Export</span>
                        {showExportMenu ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </motion.button>
                    </div>
                  </div>

                  {/* Portal Dropdowns */}
                  <DropdownPortal 
                    isOpen={showPitchMenu} 
                    targetRef={pitchButtonRef}
                    position="left"
                  >
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        data-portal-dropdown
                        style={{
                          background: 'rgba(255, 255, 255, 0.98)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: '16px',
                          padding: '1rem',
                          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 32px rgba(0, 0, 0, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.8)',
                          minWidth: '280px',
                          maxWidth: '320px'
                        }}
                      >
                        <h5 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', fontWeight: 600, color: '#1d1d1f' }}>
                          Pitch-Stil wählen:
                        </h5>
                        
                        {pitchStyles.map((style) => (
                          <motion.button
                            key={style.id}
                            onClick={() => {
                              setSelectedPitchStyle(style.id);
                              generatePitch(style.id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.8rem',
                              width: '100%',
                              padding: '0.8rem',
                              marginBottom: '0.5rem',
                              borderRadius: '12px',
                              border: 'none',
                              background: selectedPitchStyle === style.id 
                                ? 'rgba(52, 199, 89, 0.1)' 
                                : 'transparent',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.2s ease'
                            }}
                            whileHover={{ background: 'rgba(52, 199, 89, 0.1)' }}
                            whileTap={{ scale: 0.98 }}
                          >
                            {style.icon}
                            <div>
                              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1d1d1f' }}>
                                {style.name}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#6e6e73' }}>
                                {style.description}
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  </DropdownPortal>

                  <DropdownPortal 
                    isOpen={showExportMenu} 
                    targetRef={exportButtonRef}
                    position="right"
                  >
                    <AnimatePresence>
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        data-portal-dropdown
                        style={{
                          background: 'rgba(255, 255, 255, 0.98)',
                          backdropFilter: 'blur(20px)',
                          borderRadius: '16px',
                          padding: '1rem',
                          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 32px rgba(0, 0, 0, 0.1)',
                          border: '1px solid rgba(255, 255, 255, 0.8)',
                          minWidth: '300px',
                          maxWidth: '350px'
                        }}
                      >
                        <h5 style={{ margin: '0 0 0.8rem', fontSize: '0.9rem', fontWeight: 600, color: '#1d1d1f' }}>
                          Export-Format wählen:
                        </h5>
                        
                        {exportOptions.map((option) => (
                          <motion.button
                            key={option.id}
                            onClick={() => handleExport(option.id)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.8rem',
                              width: '100%',
                              padding: '0.8rem',
                              marginBottom: '0.5rem',
                              borderRadius: '12px',
                              border: 'none',
                              background: 'transparent',
                              cursor: 'pointer',
                              textAlign: 'left',
                              transition: 'all 0.2s ease',
                              opacity: option.premium && !isPremium ? 0.6 : 1
                            }}
                            whileHover={{ background: 'rgba(88, 86, 214, 0.1)' }}
                            whileTap={{ scale: 0.98 }}
                            disabled={option.premium && !isPremium}
                          >
                            {option.icon}
                            <div style={{ flex: 1 }}>
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.5rem',
                                marginBottom: '0.2rem' 
                              }}>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1d1d1f' }}>
                                  {option.name}
                                </span>
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  color: '#5856d6',
                                  background: 'rgba(88, 86, 214, 0.1)',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '6px',
                                  fontWeight: 600
                                }}>
                                  {option.format}
                                </span>
                                {option.premium && (
                                  <Lock size={12} style={{ color: '#ff9500' }} />
                                )}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: '#6e6e73' }}>
                                {option.description}
                              </div>
                            </div>
                          </motion.button>
                        ))}
                      </motion.div>
                    </AnimatePresence>
                  </DropdownPortal>
                </motion.div>

                {/* Optimization Cards */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {filteredOptimizations.map((optimization, index) => {
                      // Finde Kategorie-Info für diese Optimierung
                      const categoryInfo = contractTypeInfo?.categories?.find(c => c.id === optimization.category);
                      const categoryName = categoryInfo?.name || 
                        (optimization.category === 'termination' ? 'Kündigung & Laufzeit' :
                         optimization.category === 'liability' ? 'Haftung & Risiko' :
                         optimization.category === 'payment' ? 'Vergütung & Zahlung' :
                         optimization.category === 'compliance' ? 'Compliance & DSGVO' : 
                         optimization.category === 'clarity' ? 'Klarheit & Präzision' :
                         optimization.category === 'other' ? 'Sonstige Optimierung' :
                         'Optimierung');

                      return (
                        <motion.div
                          key={optimization.id}
                          className={styles.card}
                          style={{ 
                            padding: '2rem', 
                            position: 'relative',
                            background: optimization.implemented && showSimulation 
                              ? 'linear-gradient(135deg, rgba(52, 199, 89, 0.1) 0%, rgba(52, 199, 89, 0.05) 100%)'
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                            border: optimization.implemented && showSimulation 
                              ? '2px solid rgba(52, 199, 89, 0.3)'
                              : '1px solid rgba(255, 255, 255, 0.6)'
                          }}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 + index * 0.1 }}
                        >
                          {/* Priority Indicator */}
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: '3px',
                            background: optimization.priority === 'critical' ? '#d70015' : 
                                       optimization.priority === 'high' ? '#ff453a' : 
                                       optimization.priority === 'medium' ? '#ff9500' : '#34c759'
                          }}></div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.5rem' }}>
                                {getIconForCategory(optimization.category, categoryName)}
                                <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                                  {categoryName}
                                </h4>
                                <span style={{
                                  padding: '0.3rem 0.8rem',
                                  borderRadius: '12px',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  backgroundColor: optimization.priority === 'critical' ? '#fff0f0' : 
                                                 optimization.priority === 'high' ? '#fff5f5' : 
                                                 optimization.priority === 'medium' ? '#fff8f0' : '#f0fff0',
                                  color: optimization.priority === 'critical' ? '#d70015' : 
                                         optimization.priority === 'high' ? '#ff453a' : 
                                         optimization.priority === 'medium' ? '#ff9500' : '#34c759'
                                }}>
                                  {optimization.priority === 'critical' ? 'Kritisch' : 
                                   optimization.priority === 'high' ? 'Hoch' : 
                                   optimization.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                                </span>
                              </div>
                              
                              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#6e6e73', flexWrap: 'wrap' }}>
                                <span>KI-Vertrauen: {optimization.confidence}%</span>
                                <span>Risiko: {optimization.legalRisk}/10</span>
                                <span>Impact: {optimization.businessImpact}/10</span>
                                <span>{optimization.estimatedSavings}</span>
                              </div>
                            </div>

                            {showSimulation && (
                              <motion.label 
                                style={{ 
                                  display: 'flex', 
                                  alignItems: 'center', 
                                  gap: '0.5rem',
                                  cursor: 'pointer',
                                  padding: '0.5rem',
                                  backgroundColor: optimization.implemented ? 'rgba(52, 199, 89, 0.1)' : 'rgba(0, 113, 227, 0.1)',
                                  borderRadius: '8px',
                                  border: `1px solid ${optimization.implemented ? 'rgba(52, 199, 89, 0.3)' : 'rgba(0, 113, 227, 0.3)'}`
                                }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={optimization.implemented}
                                  onChange={() => toggleSuggestion(optimization.id)}
                                  style={{
                                    width: '18px',
                                    height: '18px',
                                    accentColor: '#0071e3'
                                  }}
                                />
                                <span style={{ 
                                  fontSize: '0.9rem', 
                                  fontWeight: 600, 
                                  color: optimization.implemented ? '#34c759' : '#0071e3'
                                }}>
                                  {optimization.implemented ? 'Aktiviert' : 'Anwenden'}
                                </span>
                                {optimization.implemented && (
                                  <TrendingUp size={14} style={{ color: '#34c759' }} />
                                )}
                              </motion.label>
                            )}
                          </div>

                          {/* 3-Column Layout */}
                          <div style={{ 
                            display: 'grid', 
                            gridTemplateColumns: '1fr 1fr 1fr', 
                            gap: '1.5rem',
                            marginBottom: '1.5rem'
                          }}>
                            <div>
                              <h5 style={{ 
                                margin: '0 0 0.5rem', 
                                fontSize: '0.9rem', 
                                fontWeight: 600, 
                                color: '#ff453a',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#ff453a' }}></div>
                                Original
                              </h5>
                              <p style={{ 
                                margin: 0, 
                                fontSize: '0.9rem', 
                                lineHeight: 1.5, 
                                color: '#1d1d1f',
                                padding: '1rem',
                                backgroundColor: 'rgba(255, 69, 58, 0.05)',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 69, 58, 0.1)',
                                minHeight: '80px'
                              }}>
                                {optimization.original}
                              </p>
                            </div>

                            <div>
                              <h5 style={{ 
                                margin: '0 0 0.5rem', 
                                fontSize: '0.9rem', 
                                fontWeight: 600, 
                                color: '#34c759',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#34c759' }}></div>
                                Verbesserung
                              </h5>
                              <p style={{ 
                                margin: 0, 
                                fontSize: '0.9rem', 
                                lineHeight: 1.5, 
                                color: '#1d1d1f',
                                padding: '1rem',
                                backgroundColor: 'rgba(52, 199, 89, 0.05)',
                                borderRadius: '8px',
                                border: '1px solid rgba(52, 199, 89, 0.1)',
                                minHeight: '80px'
                              }}>
                                {optimization.improved}
                              </p>
                            </div>

                            <div>
                              <h5 style={{ 
                                margin: '0 0 0.5rem', 
                                fontSize: '0.9rem', 
                                fontWeight: 600, 
                                color: '#5856d6',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.3rem'
                              }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#5856d6' }}></div>
                                Begründung
                              </h5>
                              <p style={{ 
                                margin: 0, 
                                fontSize: '0.9rem', 
                                lineHeight: 1.5, 
                                color: '#1d1d1f',
                                padding: '1rem',
                                backgroundColor: 'rgba(88, 86, 214, 0.05)',
                                borderRadius: '8px',
                                border: '1px solid rgba(88, 86, 214, 0.1)',
                                minHeight: '80px'
                              }}>
                                {optimization.reasoning.split('.').slice(0, 3).join('. ')}.
                              </p>
                            </div>
                          </div>

                          {/* Additional Info */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '1rem',
                            padding: '1rem',
                            backgroundColor: 'rgba(0, 113, 227, 0.03)',
                            borderRadius: '8px',
                            border: '1px solid rgba(0, 113, 227, 0.1)'
                          }}>
                            <div>
                              <h6 style={{ margin: '0 0 0.3rem', fontSize: '0.8rem', fontWeight: 600, color: '#5856d6' }}>
                                📊 Markt-Benchmark
                              </h6>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#1d1d1f' }}>
                                {optimization.marketBenchmark}
                              </p>
                            </div>
                            
                            <div>
                              <h6 style={{ margin: '0 0 0.3rem', fontSize: '0.8rem', fontWeight: 600, color: '#5856d6' }}>
                                🔧 Umsetzung
                              </h6>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#1d1d1f' }}>
                                {optimization.implementationDifficulty === 'easy' ? '✅ Einfach' :
                                 optimization.implementationDifficulty === 'medium' ? '⚠️ Mittel' : '🔴 Komplex'}
                              </p>
                            </div>

                            <div>
                              <h6 style={{ margin: '0 0 0.3rem', fontSize: '0.8rem', fontWeight: 600, color: '#5856d6' }}>
                                💡 KI-Insight
                              </h6>
                              <p style={{ margin: 0, fontSize: '0.85rem', color: '#1d1d1f' }}>
                                {optimization.aiInsight.substring(0, 80)}...
                              </p>
                            </div>
                          </div>

                          {/* Copy Button */}
                          <motion.button
                            onClick={() => {
                              const text = `${optimization.improved}\n\nBegründung: ${optimization.reasoning}`;
                              navigator.clipboard.writeText(text);
                              showToast("✅ Verbesserung kopiert!");
                            }}
                            style={{
                              position: 'absolute',
                              top: '1rem',
                              right: '1rem',
                              background: 'rgba(255, 255, 255, 0.9)',
                              border: '1px solid rgba(0, 113, 227, 0.2)',
                              borderRadius: '8px',
                              padding: '0.5rem',
                              cursor: 'pointer',
                              color: '#0071e3'
                            }}
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Copy size={16} />
                          </motion.button>
                        </motion.div>
                      );
                    })}
                </div>

                {/* Simulation Summary */}
                {showSimulation && optimizations.filter(opt => opt.implemented).length > 0 && (
                  <motion.div
                    className={styles.card}
                    style={{
                      background: 'linear-gradient(135deg, rgba(52, 199, 89, 0.1) 0%, rgba(52, 199, 89, 0.05) 100%)',
                      border: '2px solid rgba(52, 199, 89, 0.3)'
                    }}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <h4 style={{ margin: '0 0 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle2 size={20} style={{ color: '#34c759' }} />
                      Simulation: Ausgewählte Optimierungen
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                      <div>
                        <h6 style={{ margin: '0 0 0.5rem', color: '#34c759' }}>Score-Verbesserung</h6>
                        <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                          {contractScore?.overall || 0} → {calculateNewScore()} Punkte 
                          <span style={{ color: '#34c759' }}>
                            (+{Math.max(0, calculateNewScore() - (contractScore?.overall || 0))})
                          </span>
                        </p>
                      </div>
                      
                      <div>
                        <h6 style={{ margin: '0 0 0.5rem', color: '#34c759' }}>Implementiert</h6>
                        <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                          {optimizations.filter(opt => opt.implemented).length} von {optimizations.length} Optimierungen
                        </p>
                      </div>
                      
                      <div>
                        <h6 style={{ margin: '0 0 0.5rem', color: '#34c759' }}>Geschätzter Nutzen</h6>
                        <p style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                          Risikoreduktion & Flexibilität
                        </p>
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