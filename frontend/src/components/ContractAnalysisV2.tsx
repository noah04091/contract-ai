import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  FileText, AlertCircle, CheckCircle, Loader,
  Download, BarChart3, RefreshCw, WifiOff, Clock,
  Wrench, ArrowRight, AlertTriangle,
  Award, Target, Zap, ChevronDown, ChevronUp,
  Copy, Eye, X,
  CheckSquare, XCircle,
  Gavel, Scale, Star,
  Shield, Lightbulb, TrendingUp, Check, // Enterprise Icons
  MessageSquare // Chat Icon
} from "lucide-react";
import styles from "./ContractAnalysis.module.css";
import { uploadAndAnalyze, checkAnalyzeHealth } from "../utils/api";
import { useCalendarStore } from "../stores/calendarStore"; // 📅 Calendar Cache Invalidation
import { useAuth } from "../context/AuthContext"; // 💬 User subscription check
import AnalysisImportantDates from "./AnalysisImportantDates"; // 📅 Termine & Erinnerungen im Analyse-Ergebnis
import V2HeroSection, { isFailedAnalysis } from "./contractAnalysisV2/V2HeroSection"; // 🎨 V2 — neuer Top-Bereich nach v6-Mockup
import v2HeroStyles from "./contractAnalysisV2/V2HeroSection.module.css"; // für v2UnifiedContainer-Wrapper
import V2StickyMiniHeader from "./contractAnalysisV2/V2StickyMiniHeader"; // 🎨 V2 — Mini-Header beim Scrollen
import V2TabsSection from "./contractAnalysisV2/V2TabsSection"; // 🎨 V2 — Tabs-System für Detail-Sektionen
import V2ActionBar from "./contractAnalysisV2/V2ActionBar"; // 🎨 V2 — sticky Action-Bar unten
import { classifyDocType } from "./contractAnalysisV2/v2TabLabels"; // 📨 Welle 1 — LETTER-Framing für die Action-Bar
import datesWrapperStyles from "./contractAnalysisV2/V2DatesWrapper.module.css"; // 🎨 V2 — neutraler statt gelb

interface ContractAnalysisProps {
  file?: File; // Optional - für Upload-Flow
  contractName?: string; // Optional - für Schnellanalyse (ohne File)
  contractId?: string; // Optional - für Schnellanalyse
  onReset: () => void;
  onNavigateToContract?: (contractId: string) => void;
  initialResult?: AnalysisResult;
}

// ✅ ENHANCED: Erweiterte Interfaces für 7-Punkte-Struktur
interface AnalysisResult {
  success: boolean;
  message?: string;
  summary?: string | string[];
  legalAssessment?: string | string[];
  suggestions?: string | string[];
  comparison?: string | string[];
  contractScore?: number;
  analysisId?: string;
  requestId?: string;
  isReanalysis?: boolean;
  originalContractId?: string;
  
  // ✅ NEU: 7-Punkte-Struktur
  positiveAspects?: PositiveAspect[] | string;
  criticalIssues?: CriticalIssue[] | string;
  recommendations?: Recommendation[] | string;
  
  // ✅ NEU: Lawyer-Level Metadata
  lawyerLevelAnalysis?: boolean;
  analysisDepth?: string;
  structuredAnalysis?: boolean;
  completenessGuarantee?: boolean;

  // ✅ NEU: Ausführliches Rechtsgutachten
  detailedLegalOpinion?: string;

  // 🌐 Phase-1-Redesign: Recognition-Felder + holistisches Score-Reasoning.
  // Optional, da alte Analysen ohne diese Felder bestehen bleiben (render-if-present).
  documentCharacterization?: {
    description?: string;
    rationale?: string;
  };
  completeness?: {
    isComplete?: boolean;
    observation?: string;
    openItems?: string[];
  };
  asymmetryAssessment?: {
    rating?: 'balanced' | 'mostly-fair' | 'one-sided' | 'heavily-one-sided';
    favoredParty?: string | null;
    explanation?: string;
  };
  scoreReasoning?: string;
  // 🌐 Phase-2-Redesign: typeSpecificFindings nur bei Pilot-Typen
  // (Mietvertrag, Arbeitsvertrag, NDA). Optional, render-if-present.
  typeSpecificFindings?: Array<{
    checkpoint: string;
    status: 'ok' | 'issue' | 'not_applicable';
    finding?: string;
    legalBasis?: string;
    clauseRef?: string;
  }>;

  usage?: {
    count: number;
    limit: number;
    plan: string;
  };
  error?: string;
}

// ✅ NEU: Strukturierte Interfaces für Lawyer-Level Analysis
interface PositiveAspect {
  title: string;
  description: string;
}

interface CriticalIssue {
  title: string;
  description: string;
  riskLevel: 'high' | 'medium' | 'low';
}

interface Recommendation {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
}

// ✅ FIXED: Erweiterte Response-Type für bessere TypeScript-Sicherheit
interface AnalysisResponse extends AnalysisResult {
  [key: string]: unknown;
}

// ✅ NEU: Interface für Duplikat-Response (korrigiert)
interface DuplicateResponse {
  success: false;
  duplicate: true;
  message: string;
  error: "DUPLICATE_CONTRACT";
  contractId: string;
  contractName: string;
  uploadedAt: string;
  requestId: string;
  actions: {
    reanalyze: string;
    viewExisting: string;
  };
}

// 🛡️ Kaputte/Platzhalter-Dateinamen (z.B. "$value.pdf" aus fremden Lohn-Systemen,
// "undefined.pdf", leerer Name) erkennen → dann sinnvolleren Titel anzeigen.
function isPlaceholderDocName(n: string | undefined | null): boolean {
  const t = (n ?? "").trim();
  return !t || /[${}]/.test(t) || /^(undefined|null)(\.|$)/i.test(t) || /^\.[a-z0-9]{1,5}$/i.test(t);
}

export default function ContractAnalysisV2({ file, contractName, contractId: propContractId, onReset, onNavigateToContract, initialResult }: ContractAnalysisProps) {
  // Nutze file.name oder contractName als Fallback
  const displayName = file?.name || contractName || 'Vertrag';
  const displaySize = file ? (file.size / 1024 / 1024).toFixed(2) : null;

  // 💬 Auth für Chat-Button (Business/Enterprise only)
  const { user } = useAuth();
  const isBusinessOrHigher = user?.subscriptionPlan === 'business' ||
                              user?.subscriptionPlan === 'enterprise';

  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [serviceHealth, setServiceHealth] = useState<boolean | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<string | null>(null);
  const [isOptimizationExpanded, setIsOptimizationExpanded] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // ✅ NEU: States für bessere UX-Behandlung
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<DuplicateResponse | null>(null);
  const [showNavigationMessage, setShowNavigationMessage] = useState(false);

  // 💬 Chat Loading State
  const [openingChat, setOpeningChat] = useState(false);

  const navigate = useNavigate();
  const { clearCache: clearCalendarCache } = useCalendarStore(); // 📅 Calendar Cache Invalidation
  const analysisResultRef = useRef<HTMLDivElement>(null);
  // 📨 Welle 1: Scroll-Ziel für die LETTER-Primary-CTA „Fristen & Optionen ansehen".
  const datesSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAnalyzeHealth().then(setServiceHealth);
  }, []);

  // ✅ CRITICAL FIX: useEffect um initialResult zu setzen
  useEffect(() => {
    if (initialResult) {
      setResult(initialResult);
      setProgress(100);
      setAnalyzing(false);
      setError(null);
      
    }
  }, [initialResult]);

  // ✅ FIXED: Robustes State-Reset
  const resetAllStates = () => {
    setAnalyzing(false);
    setProgress(0);
    setResult(null);
    setError(null);
    setRetryCount(0);
    setOptimizing(false);
    setOptimizationResult(null);
    setIsOptimizationExpanded(true);
    setGeneratingPdf(false);
    setShowDuplicateModal(false);
    setDuplicateInfo(null);
    setShowNavigationMessage(false);
  };

  // ✅ FIXED: Robustes handleAnalyze mit besserem TypeScript-Handling + initialResult-Support
  const handleAnalyze = async (forceReanalyze = false) => {
    // ✅ Wenn initialResult vorhanden und nicht forceReanalyze, nichts tun
    if (initialResult && !forceReanalyze) {
      return;
    }

    // ✅ WICHTIG: States zurücksetzen VOR der Analyse
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setShowDuplicateModal(false);
    setDuplicateInfo(null);

    try {
      // Guard: Wenn kein File vorhanden, kann keine Analyse gestartet werden
      if (!file) {
        console.error("❌ Keine Datei vorhanden für Analyse");
        throw new Error("Keine Datei zum Analysieren vorhanden");
      }

      const response = await uploadAndAnalyze(file, (progress) => {
        setProgress(progress);
      }, forceReanalyze);
      
      // ✅ FIXED: Null-Check für Response
      if (!response) {
        console.error("❌ Response ist null oder undefined");
        throw new Error("Keine Antwort vom Server erhalten");
      }

      // ✅ FIXED: Type-sichere Duplikat-Handling
      if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, unknown>;
        
        // Prüfe auf Duplikat-Response
        if ('duplicate' in responseObj && responseObj.duplicate === true) {
          // Validiere Duplikat-Response Struktur
          if ('contractId' in responseObj && 'contractName' in responseObj && 'actions' in responseObj) {
            setDuplicateInfo(response as DuplicateResponse);
            setShowDuplicateModal(true);
            return;
          } else {
            console.error("❌ Unvollständige Duplikat-Response:", response);
            throw new Error("Dieser Vertrag wurde bereits hochgeladen. Bitte prüfe deine Vertragsliste.");
          }
        }

        // Prüfe auf erfolgreiche Analyse
        if ('success' in responseObj && responseObj.success === true) {
          // ✅ FIXED: Type-sicheres Casting für AnalysisResult
          const analysisResult = response as AnalysisResponse;
          setResult(analysisResult);
          setRetryCount(0);

          // 📅 Invalidiere Kalender-Cache - neue Events wurden generiert!
          clearCalendarCache();

          return;
        }

        // Prüfe auf Fehler-Response
        if ('success' in responseObj && responseObj.success === false && 'message' in responseObj) {
          const errorMessage = typeof responseObj.message === 'string' ? responseObj.message : "Analyse fehlgeschlagen";
          throw new Error(errorMessage);
        }
      }

      // Fallback für unerwartete Response-Struktur
      console.error("❌ Unerwartete Response-Struktur:", response);
      throw new Error("Unerwartete Antwort vom Server");

    } catch (err) {
      console.error("❌ Analyse-Fehler:", err);
      
      let errorMessage = "Ein unbekannter Fehler ist aufgetreten.";
      let canRetry = false;
      
      if (err instanceof Error) {
        const errMsg = err.message;
        
        if (errMsg.includes('nicht erreichbar') || errMsg.includes('Failed to fetch')) {
          errorMessage = "Verbindungsfehler: Server ist momentan nicht erreichbar.";
          canRetry = true;
        } else if (errMsg.includes('Limit erreicht')) {
          errorMessage = "Analyse-Limit erreicht. Bitte upgrade dein Paket.";
          canRetry = false;
        } else if (errMsg.includes('nicht verfügbar') || errMsg.includes('500')) {
          errorMessage = "Analyse-Service ist vorübergehend überlastet.";
          canRetry = true;
        } else if (errMsg.includes('Timeout')) {
          errorMessage = "Analyse-Timeout. Die PDF-Datei ist möglicherweise zu groß.";
          canRetry = true;
        } else if (errMsg.includes('PDF') || errMsg.includes('Datei')) {
          errorMessage = "PDF konnte nicht verarbeitet werden. Bitte prüfe das Dateiformat.";
          canRetry = false;
        } else if (errMsg.includes('bereits hochgeladen')) {
          errorMessage = errMsg;
          canRetry = false;
        } else {
          errorMessage = errMsg;
          canRetry = errMsg.includes('Server-Fehler') || errMsg.includes('HTTP 5');
        }
      }
      
      setError(errorMessage);
      setRetryCount(prev => canRetry ? prev + 1 : prev);
    } finally {
      setAnalyzing(false);
      if (progress === 0) setProgress(0);
    }
  };

  // ✅ FIXED: Duplikat-Modal-Handler mit State-Reset
  const handleDuplicateReanalyze = () => {
    setShowDuplicateModal(false);
    setDuplicateInfo(null);
    setTimeout(() => {
      handleAnalyze(true);
    }, 100);
  };

  const handleDuplicateViewExisting = () => {
    if (duplicateInfo && onNavigateToContract) {
      onNavigateToContract(duplicateInfo.contractId);
    } else {
      setShowDuplicateModal(false);
      setShowNavigationMessage(true);
    }
  };

  const handleDuplicateClose = () => {
    setShowDuplicateModal(false);
    setDuplicateInfo(null);
  };

  // ✅ FIXED: Reset-Handler mit vollständigem State-Reset
  const handleReset = () => {
    resetAllStates();
    onReset();
  };

  const handleOptimize = () => {
    if (!result && !initialResult) return;

    // Loading-Indikator für V2ActionBar — beim Navigieren visuelles Feedback geben
    setOptimizing(true);

    const analysisData = result || initialResult;
    const targetContractId = analysisData?.originalContractId || propContractId;

    if (targetContractId) {
      navigate(`/optimizer?contractId=${targetContractId}`);
    } else {
      navigate('/optimizer');
    }
    // Reset nach kurzem Delay falls Navigation hängt — Component unmountet eh
    setTimeout(() => setOptimizing(false), 1500);
  };

  const handleDownloadPdf = async () => {
    if (!result) return;

    const analysisData = result || initialResult;
    const contractId = analysisData?.originalContractId || propContractId;

    if (!contractId) {
      toast.error('Kein Vertrag für das Gutachten gefunden. Bitte zuerst speichern.');
      return;
    }

    setGeneratingPdf(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts/${contractId}/gutachten-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        let serverMsg = '';
        try {
          const data = await response.json();
          serverMsg = data?.message || '';
        } catch {
          // Non-JSON body — ignore
        }
        throw new Error(serverMsg || `Server antwortete mit Status ${response.status}`);
      }

      // Filename aus Content-Disposition lesen (RFC 5987: filename*=UTF-8''...)
      const disposition = response.headers.get('content-disposition') || '';
      let filename = `Gutachten_${displayName.replace(/\.pdf$/i, '')}_${new Date().toISOString().split('T')[0]}.pdf`;
      const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
      const asciiMatch = disposition.match(/filename="([^"]+)"/i);
      if (utf8Match) {
        try { filename = decodeURIComponent(utf8Match[1]); } catch { /* fallback bleibt */ }
      } else if (asciiMatch) {
        filename = asciiMatch[1];
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('❌ Gutachten-PDF fehlgeschlagen:', error);
      const msg = error instanceof Error ? error.message : 'Unbekannter Fehler';
      toast.error(`Gutachten-PDF konnte nicht erstellt werden: ${msg}`);
    } finally {
      setGeneratingPdf(false);
    }
  };

  // 💬 Handler: Mit KI-Rechtsbot besprechen
  const handleOpenInChat = async () => {
    const analysisData = result || initialResult;
    const contractId = analysisData?.originalContractId || propContractId;

    if (!contractId) {
      alert('Kein Vertrag für den Chat gefunden.');
      return;
    }

    setOpeningChat(true);

    try {
      const token = localStorage.getItem('token');

      // Build analysis context
      const contextParts: string[] = [];

      if (analysisData?.summary) {
        const summaryText = Array.isArray(analysisData.summary)
          ? analysisData.summary.join(' ')
          : analysisData.summary;
        contextParts.push(`**Zusammenfassung:** ${summaryText}`);
      }

      if (analysisData?.contractScore) {
        contextParts.push(`**Vertragsbewertung:** ${analysisData.contractScore}/100`);
      }

      if (analysisData?.positiveAspects) {
        const aspects = Array.isArray(analysisData.positiveAspects)
          ? analysisData.positiveAspects
          : [];
        if (aspects.length > 0) {
          contextParts.push(`\n**Positive Aspekte:**`);
          aspects.forEach((a: PositiveAspect | string) => {
            const title = typeof a === 'string' ? a : a.title;
            contextParts.push(`- ${title}`);
          });
        }
      }

      if (analysisData?.criticalIssues) {
        const issues = Array.isArray(analysisData.criticalIssues)
          ? analysisData.criticalIssues
          : [];
        if (issues.length > 0) {
          contextParts.push(`\n**Kritische Punkte:**`);
          issues.forEach((i: CriticalIssue | string) => {
            const title = typeof i === 'string' ? i : i.title;
            contextParts.push(`- ${title}`);
          });
        }
      }

      if (analysisData?.recommendations) {
        const recs = Array.isArray(analysisData.recommendations)
          ? analysisData.recommendations
          : [];
        if (recs.length > 0) {
          contextParts.push(`\n**Empfehlungen:**`);
          recs.forEach((r: Recommendation | string) => {
            const title = typeof r === 'string' ? r : r.title;
            contextParts.push(`- ${title}`);
          });
        }
      }

      const analysisContext = contextParts.join('\n');

      const response = await fetch('/api/chat/new-with-contract', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          contractId: contractId,
          contractName: displayName,
          analysisContext: analysisContext,
          s3Key: null // Will be fetched from contract in backend
        })
      });

      if (!response.ok) {
        throw new Error('Chat konnte nicht erstellt werden');
      }

      const data = await response.json();
      navigate(`/chat?id=${data.chatId}`);
    } catch (error) {
      console.error('Error opening chat:', error);
      alert('Chat konnte nicht geöffnet werden. Bitte versuche es erneut.');
    } finally {
      setOpeningChat(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "#34C759";
    if (score >= 60) return "#FF9500";
    if (score >= 40) return "#FF6B35";
    return "#FF3B30";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return "Ausgezeichnet";
    if (score >= 60) return "Gut";
    if (score >= 40) return "Akzeptabel";
    return "Kritisch";
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Award size={24} className={styles.iconGreen} />;
    if (score >= 60) return <Target size={24} className={styles.iconOrange} />;
    if (score >= 40) return <AlertTriangle size={24} className={styles.iconOrangeRed} />;
    return <AlertCircle size={24} className={styles.iconRed} />;
  };

  // ✅ NEW: Helper für Risiko-Level Icons und Farben
  const getRiskLevelIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
        return <XCircle size={16} className={styles.iconRed} />;
      case 'medium':
        return <AlertTriangle size={16} className={styles.iconOrange} />;
      case 'low':
        return <AlertCircle size={16} className={styles.iconYellow} />;
      default:
        return <AlertCircle size={16} className={styles.iconGray} />;
    }
  };

  const getRiskLevelColor = (riskLevel: string): string => {
    switch (riskLevel) {
      case 'high': return styles.riskHigh;
      case 'medium': return styles.riskMedium;
      case 'low': return styles.riskLow;
      default: return styles.riskNeutral;
    }
  };

  // ✅ NEW: Helper für Prioritäts-Level
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Star size={16} className={styles.iconRed} />;
      case 'medium':
        return <Target size={16} className={styles.iconOrange} />;
      case 'low':
        return <CheckCircle size={16} className={styles.iconGreen} />;
      default:
        return <CheckCircle size={16} className={styles.iconGray} />;
    }
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'high': return styles.priorityHigh;
      case 'medium': return styles.priorityMedium;
      case 'low': return styles.priorityLow;
      default: return styles.priorityNeutral;
    }
  };

  // ✅ ENHANCED: Backward-compatible text formatting
  const formatTextToPoints = (text: string | string[]): string[] => {
    if (!text) return ['Keine Details verfügbar'];
    
    // Wenn bereits Array, direkt verwenden
    if (Array.isArray(text)) {
      return text.filter(item => item && item.trim().length > 0);
    }
    
    // String zu Array konvertieren
    const sentences = text
      .split(/[.!?]+|[-•]\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && s.length < 200)
      .slice(0, 4);
    
    return sentences.length > 0 ? sentences : [text.substring(0, 180) + '...'];
  };

  // ✅ NEW: Format structured data for new fields
  const formatStructuredData = (data: PositiveAspect[] | CriticalIssue[] | Recommendation[] | string): Array<PositiveAspect | CriticalIssue | Recommendation> => {
    if (!data) return [];
    
    // Wenn bereits strukturiert, direkt verwenden
    if (Array.isArray(data)) {
      return data;
    }
    
    // String zu strukturiertem Array konvertieren
    if (typeof data === 'string') {
      const points = formatTextToPoints(data);
      return points.map((point, index) => ({
        title: `Punkt ${index + 1}`,
        description: point,
        ...(Math.random() > 0.5 && { riskLevel: 'medium' as const }),
        ...(Math.random() > 0.5 && { priority: 'medium' as const })
      }));
    }
    
    return [];
  };

  const formatOptimizationText = (text: string) => {
    if (!text) return null;
    
    const sections = text.split(/(?=\d+\.\s*[A-ZÄÖÜ])/g).filter(s => s.trim());
    
    return sections.map((section, index) => {
      const lines = section.split('\n').filter(line => line.trim());
      const title = lines[0]?.replace(/^\d+\.\s*/, '') || `Punkt ${index + 1}`;
      const content = lines.slice(1).join('\n').trim();
      
      return {
        title: title.substring(0, 80),
        content: content || section.substring(0, 300)
      };
    });
  };

  const canRetryAnalysis = error && retryCount < 3 && !error.includes('Limit erreicht');

  const ScoreCircle = ({ score }: { score: number }) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    
    return (
      <div className={styles.scoreCircleWrapper}>
        <svg className={styles.scoreCircle} viewBox="0 0 128 128">
          <circle
            cx="64"
            cy="64"
            r="45"
            stroke="#E5E5E7"
            strokeWidth="8"
            fill="transparent"
          />
          <motion.circle
            cx="64"
            cy="64"
            r="45"
            stroke={getScoreColor(score)}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeInOut" }}
          />
        </svg>
        <div className={styles.scoreContent}>
          <div className={styles.scoreNumber}>{score}</div>
          <div className={styles.scoreUnit}>von 100</div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.analysisContainer}>
      {/* ✅ FIXED: Verbessertes Duplikat-Modal */}
      <AnimatePresence>
        {showDuplicateModal && duplicateInfo && (
          <motion.div 
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className={styles.duplicateModal}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className={styles.modalHeader}>
                <div className={styles.modalIcon}>
                  <Copy size={24} />
                </div>
                <h3>Vertrag bereits vorhanden</h3>
                <button 
                  className={styles.modalCloseBtn}
                  onClick={handleDuplicateClose}
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className={styles.modalContent}>
                <p className={styles.duplicateMessage}>
                  <strong>"{duplicateInfo.contractName}"</strong> wurde bereits am{' '}
                  <strong>{new Date(duplicateInfo.uploadedAt).toLocaleDateString('de-DE')}</strong> hochgeladen.
                </p>
                
                <div className={styles.duplicateOptions}>
                  <div className={styles.optionCard} onClick={handleDuplicateReanalyze}>
                    <div className={styles.optionIcon}>
                      <RefreshCw size={20} />
                    </div>
                    <div className={styles.optionContent}>
                      <h4>Erneut analysieren</h4>
                      <p>Führe eine neue Analyse durch und überschreibe die bestehenden Ergebnisse</p>
                    </div>
                  </div>
                  
                  <div className={styles.optionCard} onClick={handleDuplicateViewExisting}>
                    <div className={styles.optionIcon}>
                      <Eye size={20} />
                    </div>
                    <div className={styles.optionContent}>
                      <h4>Bestehenden Vertrag öffnen</h4>
                      <p>Gehe zur Detailansicht des bereits analysierten Vertrags</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={styles.modalActions}>
                <button 
                  className={styles.secondaryModalBtn}
                  onClick={handleDuplicateViewExisting}
                >
                  <Eye size={16} />
                  <span>Bestehenden öffnen</span>
                </button>
                <button 
                  className={styles.primaryModalBtn}
                  onClick={handleDuplicateReanalyze}
                >
                  <RefreshCw size={16} />
                  <span>Erneut analysieren</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header komplett in V2 ausgeblendet — File-Info & Action-Buttons sind jetzt in V2HeroSection.fcActions */}
      <div className={styles.header} style={{ display: 'none' }}>
        <div className={styles.headerContent}>
          <div className={styles.fileInfo}>
            <div className={styles.fileIconContainer}>
              <FileText size={24} className={styles.fileIcon} />
            </div>
            <div className={styles.fileDetails}>
              <h3 className={styles.fileName}>{displayName}</h3>
              <p className={styles.fileSize}>
                {displaySize ? `${displaySize} MB` : 'Schnellanalyse'}
                {serviceHealth === false && (
                  <span className={styles.serviceWarning}>
                    <WifiOff size={12} />
                    Service nicht verfügbar
                  </span>
                )}
                {/* ✅ Re-Analyse-Badge */}
                {result?.isReanalysis && (
                  <span className={styles.reanalysisBadge}>
                    <RefreshCw size={12} />
                    Aktualisiert
                  </span>
                )}
                {/* ✅ NEW: Lawyer-Level Badge */}
                {result?.lawyerLevelAnalysis && (
                  <span className={styles.lawyerBadge}>
                    <Gavel size={12} />
                    Tiefenanalyse
                  </span>
                )}
                {/* ✅ CRITICAL FIX: Badge für vorhandene Analyse */}
                {initialResult && (
                  <span className={styles.initialResultBadge}>
                    <CheckCircle size={12} />
                    Bereits analysiert
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className={styles.actions}>
            {/* ✅ CRITICAL FIX: Button-Logik für initialResult - prüfe result ODER initialResult */}
            {!result && !analyzing && !initialResult && (
              <motion.button
                className={styles.analyzeButton}
                onClick={() => handleAnalyze(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={analyzing || serviceHealth === false}
              >
                <BarChart3 size={18} />
                <span>
                  {retryCount > 0 ? `Erneut versuchen (${retryCount})` : 'Analyse starten'}
                </span>
              </motion.button>
            )}

            {/* Re-Analyse-Button nur im Upload-Flow (file vorhanden).
                Bei Bestandsverträgen aus der Schnellanalyse-Modal (nur contractId,
                kein File) wäre der Button funktionslos — daher ausblenden. */}
            {(result || initialResult) && !analyzing && file && (
              <motion.button
                className={styles.reanalyzeButton}
                onClick={() => handleAnalyze(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw size={18} />
                <span>Erneut analysieren</span>
              </motion.button>
            )}
            
            {analyzing && (
              <div className={styles.loadingButton}>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <Loader size={18} />
                </motion.div>
                <span>Analysiere... {progress}%</span>
              </div>
            )}
            
            <button 
              className={styles.resetButton}
              onClick={handleReset}
              disabled={analyzing}
            >
              <RefreshCw size={18} />
              <span>Zurücksetzen</span>
            </button>
          </div>
        </div>
      </div>

      {/* ✅ CRITICAL FIX: Progress nur wenn aktuell analysiert wird (nicht bei initialResult) */}
      {analyzing && !initialResult && (
        <motion.div 
          className={styles.progressContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.progressBar}>
            <motion.div 
              className={styles.progressFill}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          
          <div className={styles.progressTextContainer}>
            <p className={styles.progressText}>
              {progress < 30 && "PDF wird verarbeitet..."}
              {progress >= 30 && progress < 70 && "KI-Vertragsanalyse läuft..."}
              {progress >= 70 && progress < 100 && "Rechtliche Vorprüfung wird erstellt..."}
              {progress === 100 && "Rechtliche Analyse abgeschlossen"}
            </p>
          </div>

          <div className={styles.progressSteps}>
            {[
              { text: "Text extrahieren", threshold: 10 },
              { text: "Rechtliche Analyse", threshold: 30 },
              { text: "Vorprüfung erstellen", threshold: 70 }
            ].map((step, index) => (
              <div key={index} className={`${styles.progressStep} ${progress >= step.threshold ? styles.active : ''}`}>
                <span>{step.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* ✅ NEU: Schöne Navigation-Message für Duplikat-Verweis */}
      {showNavigationMessage && duplicateInfo && (
        <motion.div 
          className={styles.navigationContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.navigationContent}>
            <div className={styles.navigationIcon}>
              <CheckCircle size={24} style={{ color: '#10b981' }} />
            </div>
            <div className={styles.navigationDetails}>
              <h4 className={styles.navigationTitle}>
                Vertrag gefunden!
              </h4>
              <p className={styles.navigationMessage}>
                <strong>"{duplicateInfo.contractName}"</strong> ist bereits in deinen Verträgen verfügbar. 
                Du findest ihn in der Vertragsübersicht.
              </p>
              
              <div className={styles.navigationActions}>
                <button 
                  className={styles.goToContractsButton}
                  onClick={() => {
                    window.location.href = '/contracts';
                  }}
                >
                  <FileText size={16} />
                  <span>Jetzt zu Verträgen gehen</span>
                  <ArrowRight size={14} />
                </button>
                <button 
                  className={styles.continueButton}
                  onClick={() => {
                    setShowNavigationMessage(false);
                    setDuplicateInfo(null);
                  }}
                >
                  <span>Hier weitermachen</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Error */}
      {error && (
        <motion.div 
          className={styles.errorContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.errorContent}>
            <div className={styles.errorIcon}>
              {error.includes('Verbindung') ? <WifiOff size={24} /> : 
               error.includes('Timeout') ? <Clock size={24} /> : 
               error.includes('bereits hochgeladen') ? <Copy size={24} /> :
               <AlertCircle size={24} />}
            </div>
            <div className={styles.errorDetails}>
              <h4 className={styles.errorTitle}>
                {error.includes('bereits hochgeladen') ? 'Vertrag bereits vorhanden' :
                 error.includes('🔧 Optimierung') ? 'Optimierung fehlgeschlagen' : 
                 'Analyse fehlgeschlagen'}
              </h4>
              <p className={styles.errorMessage}>{error}</p>
              
              {canRetryAnalysis && !error.includes('🔧 Optimierung') && !error.includes('bereits hochgeladen') && (
                <div className={styles.retrySection}>
                  <button 
                    className={styles.retryButton}
                    onClick={() => handleAnalyze(false)}
                    disabled={analyzing}
                  >
                    <RefreshCw size={16} />
                    <span>Erneut versuchen ({3 - retryCount} Versuche übrig)</span>
                  </button>
                  <p className={styles.retryHint}>
                    {error.includes('Verbindung') && "Prüfe deine Internetverbindung"}
                    {error.includes('überlastet') && "Der Server ist überlastet - versuche es in wenigen Sekunden erneut"}
                    {error.includes('Timeout') && "Versuche es mit einer kleineren PDF-Datei"}
                  </p>
                </div>
              )}

              {!canRetryAnalysis && retryCount >= 3 && (
                <div className={styles.exhaustedRetries}>
                  <p>Maximale Anzahl Versuche erreicht.</p>
                  <button
                    className={styles.contactSupportButton}
                    onClick={() => window.open('mailto:support@contract-ai.de')}
                  >
                    Support kontaktieren
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}

      {/* ✅ CRITICAL FIX: Results - funktioniert sowohl für neue als auch initialResult */}
      {((result && result.success) || (initialResult && initialResult.success)) && (
        <motion.div
          className={styles.resultsContainer}
          ref={analysisResultRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* 🎨 V2 HÄPPCHEN B — Neuer Hero-Bereich (File-Card + Banner + Score-Donut + Hero-Stats + Quick-Facts + Asymmetrie).
              Ersetzt: success-header, documentCharacterization-Banner, score-section, asymmetry-card.
              Tabs/Cards darunter bleiben in Häppchen B noch wie alte Komponente — kommen in Häppchen C. */}
          {(() => {
            const data = (result || initialResult) as Parameters<typeof V2HeroSection>[0]['data'];
            const failed = isFailedAnalysis(data);
            const heroScore = data?.contractScore ?? null;
            // Score-Color synchron zu V2HeroSection.getScoreVariant
            // 📨 Welle 1: LETTER hat eigene Schwellen (85/60/35) — synchron halten!
            const isLetterDoc = String((data as { documentType?: string | null })?.documentType || "").toUpperCase() === "LETTER";
            const scoreColor = heroScore == null
              ? "#94a3b8"
              : isLetterDoc
                ? (heroScore >= 85 ? "#10b981" : heroScore >= 60 ? "#2563eb" : heroScore >= 35 ? "#f59e0b" : "#ef4444")
                : (heroScore >= 90 ? "#10b981" : heroScore >= 70 ? "#2563eb" : heroScore >= 40 ? "#f59e0b" : "#ef4444");
            return (
              <>
                {/* Sticky Mini-Header — erscheint beim Runter-Scrollen mit Filename
                    + Score-Pille + Optimieren-Button. Bei Failed-Analyse: kein Score,
                    kein Optimize-Button (würde auf leere Analyse navigieren). */}
                {!failed && (
                  <V2StickyMiniHeader
                    filename={isPlaceholderDocName(displayName) ? ((data as { documentCharacterization?: { description?: string } })?.documentCharacterization?.description?.trim() || 'Dokument') : displayName}
                    score={heroScore}
                    scoreColor={scoreColor}
                    onOptimize={handleOptimize}
                    isOptimizing={optimizing}
                    documentType={(data as { documentType?: string | null })?.documentType}
                    contractType={(data as { contractType?: string | null })?.contractType}
                  />
                )}
                <div className={v2HeroStyles.v2UnifiedContainer}>
                  <V2HeroSection
                    data={data}
                    fileName={displayName}
                    serviceHealth={serviceHealth}
                    isInitialResult={!!initialResult && !result}
                    canReanalyze={(!!result || !!initialResult) && !!file}
                    analyzing={analyzing}
                    onReanalyze={() => handleAnalyze(true)}
                    onReset={handleReset}
                    contractId={(result?.originalContractId || initialResult?.originalContractId || propContractId) as string | undefined}
                    usage={(result?.usage || initialResult?.usage) as Parameters<typeof V2HeroSection>[0]['usage']}
                    userPlan={user?.subscriptionPlan}
                  />
                  {/* Bei kaputter Analyse: Tabs überspringen — Hero zeigt schon Fehler-Banner.
                      Conversion-Banner wurde in V2HeroSection inline verschoben (max Sichtbarkeit
                      direkt nach Score/Asymmetrie statt versteckt zwischen Tabs und Action-Bar). */}
                  {!failed && (
                    <V2TabsSection data={data as Parameters<typeof V2TabsSection>[0]['data']} />
                  )}
                </div>
              </>
            );
          })()}

          {/* === ALTE Sektionen ab hier · in Häppchen C komplett ersetzt durch Tabs/Banner oben === */}
          {/* AUSGEBLENDET in V2: Success Header (durch V2HeroSection-Banner ersetzt) */}
          <div className={styles.successHeader} style={{ display: 'none' }}>
            <div className={styles.successInfo}>
              <CheckCircle size={28} className={styles.successIcon} />
              <div className={styles.successDetails}>
                <h4>
                  {(result?.lawyerLevelAnalysis || initialResult?.lawyerLevelAnalysis) && (
                    <span className={styles.lawyerLevelIndicator}>
                      <Gavel size={20} />
                    </span>
                  )}
                  {initialResult
                    ? 'Rechtsprüfung bereits verfügbar'
                    : result?.isReanalysis
                      ? 'Rechtsprüfung aktualisiert'
                      : 'Rechtsprüfung abgeschlossen'
                  }
                  <span className={styles.analyseTypeBadge}>EINMALIG</span>
                </h4>
                <p>
                  {initialResult
                    ? 'Einmalige juristische Tiefenanalyse - Ergebnisse werden angezeigt'
                    : result?.isReanalysis
                      ? 'Bestehende Rechtsprüfung wurde erfolgreich aktualisiert'
                      : 'Einmalige, detaillierte juristische Vertragsanalyse'
                  }
                </p>
                {(result?.lawyerLevelAnalysis || initialResult?.lawyerLevelAnalysis) && (
                  <div className={styles.lawyerLevelFeatures}>
                    <span className={styles.feature}>
                      <Scale size={14} />
                      7-Punkte-Analyse
                    </span>
                    <span className={styles.feature}>
                      <Gavel size={14} />
                      Tiefenanalyse
                    </span>
                    <span className={styles.feature}>
                      <CheckSquare size={14} />
                      Vollständigkeitsgarantie
                    </span>
                  </div>
                )}
              </div>
            </div>
            {(result?.requestId || initialResult?.requestId) && (
              <span className={styles.requestId}>
                ID: {result?.requestId || initialResult?.requestId}
              </span>
            )}
          </div>

          {/* AUSGEBLENDET in V2 (durch V2HeroSection-Banner ersetzt — kommt in Häppchen C als richtige Mustervorlage-Warnung zurück) */}
          <div style={{ display: 'none' }}>
          {(() => {
            const docChar = result?.documentCharacterization || initialResult?.documentCharacterization;
            const completeness = result?.completeness || initialResult?.completeness;
            const desc = docChar?.description || '';
            const lowerDesc = desc.toLowerCase();
            const nonFinalSignals = [
              'muster', 'mustervertrag', 'template', 'vorlage',
              'entwurf', 'draft',
              'vorvertrag', 'letter of intent', 'loi',
              'term sheet', 'memorandum of understanding', 'mou',
              'side letter',
              'unvollständ', 'incomplete', 'noch nicht ausgefüllt', 'placeholder',
            ];
            const isNonFinal = nonFinalSignals.some(s => lowerDesc.includes(s))
              || completeness?.isComplete === false;
            if (!isNonFinal || !desc) return null;
            return (
              <div style={{
                background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #fde68a',
                borderRadius: 12,
                padding: '20px 24px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}>
                <span style={{ fontSize: 22, lineHeight: 1, marginTop: 2 }}>⚠️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#92400e', marginBottom: 6 }}>
                    Hinweis zum Dokument-Status
                  </div>
                  <div style={{ fontSize: 14, color: '#78350f', lineHeight: 1.5, marginBottom: docChar?.rationale ? 8 : 0 }}>
                    {desc}
                  </div>
                  {docChar?.rationale && (
                    <div style={{ fontSize: 12, color: '#a16207', lineHeight: 1.5, fontStyle: 'italic' }}>
                      {docChar.rationale}
                    </div>
                  )}
                  {completeness?.openItems && completeness.openItems.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: 12, color: '#78350f' }}>
                      <strong>Noch offen:</strong> {completeness.openItems.join(' • ')}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          </div>{/* /V2-display:none-Wrapper für Doc-Char-Banner */}

          {/* AUSGEBLENDET in V2 (durch V2HeroSection-Hero ersetzt) */}
          {(result?.contractScore != null || initialResult?.contractScore != null) && (
            <div className={styles.scoreSection} style={{ display: 'none' }}>
              <h5 className={styles.scoreSectionTitle}>
                {(result?.lawyerLevelAnalysis || initialResult?.lawyerLevelAnalysis)
                  ? 'Rechtliche Gesamtbewertung'
                  : 'Contract Score'
                }
              </h5>

              <div className={styles.scoreSectionContent}>
                <ScoreCircle score={result?.contractScore ?? initialResult?.contractScore ?? 0} />
              </div>

              <div className={styles.scoreInfoContainer}>
                {getScoreIcon(result?.contractScore ?? initialResult?.contractScore ?? 0)}
                <span className={styles.scoreLabel} style={{ color: getScoreColor(result?.contractScore ?? initialResult?.contractScore ?? 0) }}>
                  {getScoreLabel(result?.contractScore ?? initialResult?.contractScore ?? 0)}
                </span>
              </div>

              {/* 🌐 Phase-1-Redesign: scoreReasoning aus der KI bevorzugt — holistische
                  Begründung statt generische Schwellwert-Texte. Nur wenn nicht vorhanden,
                  fallen wir auf die alten Score-Range-Texte zurück (Backwards-Compat). */}
              {(() => {
                const reasoning = result?.scoreReasoning || initialResult?.scoreReasoning;
                if (reasoning) {
                  return <p className={styles.scoreDescription}>{reasoning}</p>;
                }
                const score = result?.contractScore ?? initialResult?.contractScore ?? 0;
                let fallback = "";
                if (score >= 80) fallback = "Dieser Vertrag bietet eine sehr gute Rechtssicherheit und faire Konditionen.";
                else if (score >= 60) fallback = "Dieser Vertrag ist grundsätzlich in Ordnung, hat aber Verbesserungspotential.";
                else if (score >= 40) fallback = "Dieser Vertrag weist einige Schwächen auf und sollte überprüft werden.";
                else fallback = "Dieser Vertrag enthält kritische Punkte und sollte dringend überarbeitet werden.";
                return <p className={styles.scoreDescription}>{fallback}</p>;
              })()}
            </div>
          )}

          {/* AUSGEBLENDET in V2 (Asymmetrie ist jetzt in V2HeroSection mit 4 Werten + Erklärung) */}
          <div style={{ display: 'none' }}>
          {(() => {
            const asym = result?.asymmetryAssessment || initialResult?.asymmetryAssessment;
            if (!asym?.rating || asym.rating === 'balanced') return null;
            const palette =
              asym.rating === 'heavily-one-sided'
                ? { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', label: 'Stark einseitig' }
                : asym.rating === 'one-sided'
                  ? { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412', label: 'Einseitig' }
                  : { bg: '#fefce8', border: '#fef08a', text: '#854d0e', label: 'Größtenteils ausgewogen' };
            return (
              <div style={{
                background: palette.bg,
                border: `1px solid ${palette.border}`,
                borderRadius: 12,
                padding: '18px 22px',
                marginBottom: 20,
                display: 'flex',
                alignItems: 'flex-start',
                gap: 12,
              }}>
                <span style={{ fontSize: 20, lineHeight: 1, marginTop: 2 }}>⚖️</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                    <h5 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: palette.text }}>
                      Vertrags-Ausgewogenheit
                    </h5>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: palette.text,
                      background: 'rgba(255,255,255,0.6)',
                      border: `1px solid ${palette.border}`,
                      borderRadius: 4,
                      padding: '2px 8px',
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
                    }}>
                      {palette.label}
                    </span>
                  </div>
                  {asym.favoredParty && (
                    <div style={{ fontSize: 13, color: palette.text, marginBottom: 8 }}>
                      <strong>Begünstigte Partei:</strong> {asym.favoredParty}
                    </div>
                  )}
                  {asym.explanation && (
                    <div style={{ fontSize: 13, color: palette.text, lineHeight: 1.55 }}>
                      {asym.explanation}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          </div>{/* /V2-display:none-Wrapper für Asymmetry-Card */}

          {/* AUSGEBLENDET in V2 (durch V2TabsSection ersetzt) */}
          <div className={styles.detailsGrid} style={{ display: 'none' }}>
            {/* 1. Zusammenfassung */}
            {(result?.summary || initialResult?.summary) && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <FileText size={18} className={styles.cardIcon} />
                  <h5>Zusammenfassung</h5>
                </div>
                <div className={styles.cardContent}>
                  <ul className={styles.pointsList}>
                    {formatTextToPoints(result?.summary || initialResult?.summary || '').map((point, index) => (
                      <li key={index} className={styles.pointItem}>
                        <div className={`${styles.pointBullet} ${styles.blueBullet}`}></div>
                        <p className={styles.pointText}>{point}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 2. Rechtssicherheit */}
            {(result?.legalAssessment || initialResult?.legalAssessment) && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <Shield size={18} className={styles.cardIcon} />
                  <h5>Rechtssicherheit</h5>
                </div>
                <div className={styles.cardContent}>
                  <ul className={styles.pointsList}>
                    {formatTextToPoints(result?.legalAssessment || initialResult?.legalAssessment || '').map((point, index) => (
                      <li key={index} className={styles.pointItem}>
                        <div className={`${styles.pointBullet} ${styles.greenBullet}`}></div>
                        <p className={styles.pointText}>{point}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 3. Optimierungsvorschläge */}
            {(result?.suggestions || initialResult?.suggestions) && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <Lightbulb size={18} className={styles.cardIcon} />
                  <h5>Optimierungsvorschläge</h5>
                </div>
                <div className={styles.cardContent}>
                  <ul className={styles.pointsList}>
                    {formatTextToPoints(result?.suggestions || initialResult?.suggestions || '').map((point, index) => (
                      <li key={index} className={styles.pointItem}>
                        <div className={`${styles.pointBullet} ${styles.yellowBullet}`}></div>
                        <p className={styles.pointText}>{point}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 4. Marktvergleich */}
            <div className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <TrendingUp size={18} className={styles.cardIcon} />
                <h5>Marktvergleich</h5>
              </div>
              <div className={styles.cardContent}>
                {(result?.comparison || initialResult?.comparison) ? (
                  <ul className={styles.pointsList}>
                    {formatTextToPoints(result?.comparison || initialResult?.comparison || '').map((point, index) => (
                      <li key={index} className={styles.pointItem}>
                        <div className={`${styles.pointBullet} ${styles.purpleBullet}`}></div>
                        <p className={styles.pointText}>{point}</p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className={styles.fallbackMessage}>
                    <p>
                      Es wurden keine konkreten Alternativangebote erkannt. Für genauere Vergleiche können Sie den Vertragstyp spezifizieren oder unsere Optimierungsfunktion nutzen.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Positive Aspekte */}
            {(result?.positiveAspects || initialResult?.positiveAspects) && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <Check size={18} className={styles.cardIconGreen} />
                  <h5>Positive Aspekte</h5>
                </div>
                <div className={styles.cardContent}>
                  <ul className={styles.structuredList}>
                    {formatStructuredData(result?.positiveAspects || initialResult?.positiveAspects || []).map((aspect, index) => (
                      <li key={index} className={styles.structuredItem}>
                        <div className={styles.structuredHeader}>
                          <CheckCircle size={16} className={styles.iconGreen} />
                          <h6 className={styles.structuredTitle}>{aspect.title}</h6>
                        </div>
                        <p className={styles.structuredDescription}>{aspect.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* 6. Kritische Klauseln & Risiken */}
            {(result?.criticalIssues || initialResult?.criticalIssues) && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <AlertTriangle size={18} className={styles.cardIconOrange} />
                  <h5>Kritische Klauseln & Risiken</h5>
                </div>
                <div className={styles.cardContent}>
                  <ul className={styles.structuredList}>
                    {formatStructuredData(result?.criticalIssues || initialResult?.criticalIssues || []).map((issue, index) => (
                      <li key={index} className={styles.structuredItem}>
                        <div className={styles.structuredHeader}>
                          {getRiskLevelIcon((issue as CriticalIssue).riskLevel || 'medium')}
                          <h6 className={styles.structuredTitle}>{issue.title}</h6>
                          <span className={`${styles.riskBadge} ${getRiskLevelColor((issue as CriticalIssue).riskLevel || 'medium')}`}>
                            {(issue as CriticalIssue).riskLevel === 'high' ? 'Hoch' : 
                             (issue as CriticalIssue).riskLevel === 'low' ? 'Niedrig' : 'Mittel'}
                          </span>
                        </div>
                        <p className={styles.structuredDescription}>{issue.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          {/* AUSGEBLENDET in V2 (durch V2TabsSection > Empfehlungen-Tab ersetzt) */}
          {(result?.recommendations || initialResult?.recommendations) && (
            <div className={`${styles.detailCard} ${styles.fullWidthCard}`} style={{ display: 'none' }}>
              <div className={styles.detailHeader}>
                <Zap size={18} className={styles.cardIconYellow} />
                <h5>Handlungsempfehlungen</h5>
              </div>
              <div className={styles.cardContent}>
                <ul className={styles.structuredList}>
                  {formatStructuredData(result?.recommendations || initialResult?.recommendations || []).map((rec, index) => (
                    <li key={index} className={styles.structuredItem}>
                      <div className={styles.structuredHeader}>
                        {getPriorityIcon((rec as Recommendation).priority || 'medium')}
                        <h6 className={styles.structuredTitle}>{rec.title}</h6>
                        <span className={`${styles.priorityBadge} ${getPriorityColor((rec as Recommendation).priority || 'medium')}`}>
                          {(rec as Recommendation).priority === 'high' ? 'Dringend' :
                           (rec as Recommendation).priority === 'low' ? 'Optional' : 'Wichtig'}
                        </span>
                      </div>
                      <p className={styles.structuredDescription}>{rec.description}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* AUSGEBLENDET in V2 (durch V2TabsSection > Pilot-Tab ersetzt) */}
          <div style={{ display: 'none' }}>
          {(() => {
            const findings = result?.typeSpecificFindings || initialResult?.typeSpecificFindings;
            if (!findings || !Array.isArray(findings) || findings.length === 0) return null;
            return (
              <div style={{
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: '20px 24px',
                marginBottom: 20,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ fontSize: 18 }}>🎯</span>
                  <h5 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>
                    Spezifische Tiefenprüfung
                  </h5>
                  <span style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: '#4338ca',
                    background: '#eef2ff',
                    border: '1px solid #c7d2fe',
                    borderRadius: 4,
                    padding: '2px 6px',
                    textTransform: 'uppercase',
                    letterSpacing: 0.4,
                  }}>
                    Pilot
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14, lineHeight: 1.5 }}>
                  Zusätzliche Pflicht-Prüfpunkte für diesen Vertragstyp — ergänzt die allgemeine Analyse oben.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {findings.map((item, idx) => {
                    const palette =
                      item.status === 'ok'
                        ? { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534', icon: '✓', label: 'OK' }
                        : item.status === 'issue'
                          ? { bg: '#fef2f2', border: '#fecaca', text: '#991b1b', icon: '⚠️', label: 'Hinweis' }
                          : { bg: '#f9fafb', border: '#e5e7eb', text: '#6b7280', icon: '○', label: 'Nicht zutreffend' };
                    return (
                      <div key={idx} style={{
                        background: palette.bg,
                        border: `1px solid ${palette.border}`,
                        borderRadius: 8,
                        padding: '10px 14px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                          <span style={{ fontSize: 16, flexShrink: 0, color: palette.text, lineHeight: 1.2 }}>
                            {palette.icon}
                          </span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 13, fontWeight: 600, color: palette.text }}>
                                {item.checkpoint}
                              </span>
                              <span style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: palette.text,
                                background: 'rgba(255,255,255,0.6)',
                                border: `1px solid ${palette.border}`,
                                borderRadius: 4,
                                padding: '1px 6px',
                                textTransform: 'uppercase',
                                letterSpacing: 0.4,
                              }}>
                                {palette.label}
                              </span>
                            </div>
                            {item.finding && (
                              <div style={{ fontSize: 12, color: palette.text, lineHeight: 1.5, marginBottom: (item.legalBasis || item.clauseRef) ? 4 : 0 }}>
                                {item.finding}
                              </div>
                            )}
                            {(item.legalBasis || item.clauseRef) && (
                              <div style={{ fontSize: 11, color: palette.text, opacity: 0.8 }}>
                                {item.legalBasis && <span><strong>Grundlage:</strong> {item.legalBasis}</span>}
                                {item.legalBasis && item.clauseRef && <span> · </span>}
                                {item.clauseRef && <span><strong>Klausel:</strong> {item.clauseRef}</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          </div>{/* /V2-display:none-Wrapper für typeSpecificFindings */}

          {/* AUSGEBLENDET in V2 (durch V2TabsSection > Rechtsgutachten-Tab ersetzt) */}
          {(result?.detailedLegalOpinion || initialResult?.detailedLegalOpinion) && (
            <motion.div
              className={styles.legalOpinionSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{ display: 'none' }}
            >
              <div className={styles.legalOpinionHeader}>
                <div className={styles.legalOpinionTitleSection}>
                  <div className={`${styles.detailIconContainer} ${styles.goldIcon}`}>
                    <Gavel size={24} />
                  </div>
                  <div>
                    <h5 className={styles.legalOpinionTitle}>
                      <Scale size={18} className={styles.cardIcon} />
                      Ausführliche rechtliche Würdigung
                    </h5>
                    <p className={styles.legalOpinionSubtitle}>
                      Detaillierte rechtliche Einordnung auf höchstem juristischen Niveau
                    </p>
                  </div>
                </div>
                <div className={styles.legalOpinionBadge}>
                  <Scale size={16} />
                  <span>Höchstes Niveau</span>
                </div>
              </div>

              <div className={styles.legalOpinionContent}>
                {(result?.detailedLegalOpinion || initialResult?.detailedLegalOpinion)?.split('\n\n').map((paragraph, index) => (
                  <p key={index} className={styles.legalOpinionParagraph}>
                    {paragraph}
                  </p>
                ))}
              </div>
            </motion.div>
          )}

          {/* Legal Pulse: V2 ist user-getriggert über die /legal-pulse-Seite (Primary-
              Action-Button unten navigiert dorthin). Das frühere Inline-Polling +
              Pop-up "Legal Pulse Analyse läuft..." ist entfernt — war Legacy aus
              V1-Zeit (V1 deaktiviert seit 22.04.2026). Verhinderte Pop-up-Flackern. */}

          {/* 📅 Wichtige Termine & Erinnerungen — bei kaputter Analyse ausblenden,
              um nach dem Fehler-Banner keine verwirrenden alten Termine zu zeigen.
              V2: Wrapper neutralisiert das gelbe fristenBlock-Styling. */}
          {(result?.originalContractId || initialResult?.originalContractId)
            && !isFailedAnalysis((result || initialResult) as Parameters<typeof isFailedAnalysis>[0]) && (
            <div className={datesWrapperStyles.v2DatesWrapper} ref={datesSectionRef}>
              <AnalysisImportantDates
                contractId={(result?.originalContractId || initialResult?.originalContractId) as string}
                contractName={displayName}
                documentType={((result || initialResult) as { documentType?: string | null })?.documentType}
                contractType={((result || initialResult) as { contractType?: string | null })?.contractType}
              />
            </div>
          )}

          {/* AUSGEBLENDET in V2 (durch V2ActionBar als sticky Bar unten ersetzt) */}
          <div className={styles.actionButtonsContainer} style={{ display: 'none' }}>
            {/* Legal Pulse Button - Primary, links */}
            {(result?.originalContractId || initialResult?.originalContractId) && (
              <motion.button
                className={styles.primaryActionButton}
                onClick={() => window.location.href = `/pulse/${result?.originalContractId || initialResult?.originalContractId}`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <BarChart3 size={20} />
                <span>Legal Pulse Analyse</span>
                <ArrowRight size={16} />
              </motion.button>
            )}

            {/* Optimize Button - Secondary */}
            <button
              className={`${styles.secondaryButton} ${styles.optimizeButton}`}
              onClick={handleOptimize}
              disabled={optimizing}
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                border: 'none'
              }}
            >
              {optimizing ? (
                <>
                  <Loader size={18} className={styles.spinner} />
                  <span>Optimiere Vertrag...</span>
                </>
              ) : (
                <>
                  <Wrench size={18} />
                  <span>Vertrag jetzt optimieren</span>
                </>
              )}
            </button>

            {/* PDF Download Button */}
            <button
              className={`${styles.secondaryButton} ${styles.downloadButton}`}
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
              style={{
                background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                color: '#ffffff',
                border: 'none'
              }}
            >
              {generatingPdf ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader size={18} />
                  </motion.div>
                  <span>Erstelle PDF...</span>
                </>
              ) : (
                <>
                  <Download size={18} />
                  <span>Vorprüfungs-PDF herunterladen</span>
                </>
              )}
            </button>

            {/* 💬 Mit KI besprechen Button - Business/Enterprise only */}
            <button
              className={`${styles.secondaryButton} ${styles.chatButton}`}
              onClick={handleOpenInChat}
              disabled={openingChat || !isBusinessOrHigher}
              title={!isBusinessOrHigher ? 'Nur für Business & Enterprise Nutzer verfügbar' : 'Vertrag mit KI-Rechtsbot besprechen'}
              style={{
                opacity: !isBusinessOrHigher ? 0.5 : 1,
                cursor: !isBusinessOrHigher ? 'not-allowed' : openingChat ? 'wait' : 'pointer',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                border: 'none'
              }}
            >
              {openingChat ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader size={18} />
                  </motion.div>
                  <span>Öffne Chat...</span>
                </>
              ) : (
                <>
                  <MessageSquare size={18} />
                  <span>{isBusinessOrHigher ? 'Mit KI besprechen' : 'Chat (Business)'}</span>
                </>
              )}
            </button>

            {/* 📋 Zum Vertrag öffnen — Sprung ins Contract Detail Modal */}
            {onNavigateToContract && (result?.originalContractId || initialResult?.originalContractId) && (
              <button
                className={styles.secondaryButton}
                onClick={() => onNavigateToContract((result?.originalContractId || initialResult?.originalContractId) as string)}
                style={{
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)',
                  color: '#ffffff',
                  border: 'none'
                }}
              >
                <FileText size={18} />
                <span>Zum Vertrag öffnen</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* Optimization Result */}
          {optimizationResult && (
            <motion.div 
              className={styles.optimizationResult}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className={styles.optimizationHeader}>
                <div className={styles.optimizationTitleSection}>
                  <Zap size={24} />
                  <h5>Optimierungsvorschlag</h5>
                </div>
                <button
                  className={styles.expandToggle}
                  onClick={() => setIsOptimizationExpanded(!isOptimizationExpanded)}
                >
                  {isOptimizationExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                  <span>{isOptimizationExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}</span>
                </button>
              </div>
              
              <motion.div 
                className={styles.optimizationContent}
                initial={false}
                animate={{ 
                  height: isOptimizationExpanded ? 'auto' : '120px',
                  overflow: isOptimizationExpanded ? 'visible' : 'hidden'
                }}
                transition={{ duration: 0.3 }}
              >
                {formatOptimizationText(optimizationResult) ? (
                  <div className={styles.optimizationSections}>
                    {formatOptimizationText(optimizationResult)?.map((section, index) => (
                      <div key={index} className={styles.optimizationSection}>
                        <h6 className={styles.optimizationSectionTitle}>
                          {section.title}
                        </h6>
                        <p className={styles.optimizationSectionContent}>
                          {section.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.optimizationPlainText}>
                    {optimizationResult}
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* Usage Info — limit kann Infinity, Number ODER String ("enterprise") sein
              je nach Backend-Plan. Bei nicht-numerischem Wert → ∞. */}
          {(result?.usage || initialResult?.usage) && (() => {
            const usage = (result?.usage || initialResult?.usage);
            const lim = usage?.limit as unknown;
            const limDisplay = (lim === Infinity || typeof lim !== 'number') ? '∞' : lim;
            return (
              <div className={styles.usageInfo}>
                <p>
                  Rechtliche Analyse <strong>{usage?.count}</strong> von <strong>{limDisplay}</strong>
                  <span className={styles.planBadge}>
                    {usage?.plan}
                  </span>
                </p>
              </div>
            );
          })()}

          {/* 🎨 V2 HÄPPCHEN D — Sticky Action-Bar unten (ersetzt actionButtonsContainer)
              Bei kaputter Analyse ausblenden — sonst klickt User auf Optimieren bei nicht-analysiertem Vertrag. */}
          {!isFailedAnalysis((result || initialResult) as Parameters<typeof isFailedAnalysis>[0]) && (
          <V2ActionBar
            hasContractId={!!(propContractId || result?.originalContractId || initialResult?.originalContractId)}
            isBusinessOrHigher={isBusinessOrHigher}
            optimizing={optimizing}
            generatingPdf={generatingPdf}
            openingChat={openingChat}
            showPulseLink={!!(result?.originalContractId || initialResult?.originalContractId)}
            showOpenContract={!!onNavigateToContract && !!(result?.originalContractId || initialResult?.originalContractId)}
            onOptimize={handleOptimize}
            onDownloadPdf={handleDownloadPdf}
            onOpenChat={handleOpenInChat}
            onOpenPulse={() => {
              const id = result?.originalContractId || initialResult?.originalContractId;
              if (id) window.location.href = `/pulse/${id}`;
            }}
            onOpenContract={() => {
              const id = result?.originalContractId || initialResult?.originalContractId;
              if (id && onNavigateToContract) onNavigateToContract(id);
            }}
            // 📨 Welle 1: LETTER-Framing — Primary-CTA wird „Fristen & Optionen ansehen"
            docClass={(() => {
              const d = (result || initialResult) as { documentType?: string | null; contractType?: string | null } | null;
              return classifyDocType(d?.documentType, d?.contractType);
            })()}
            onShowDeadlines={() => {
              // Scroll zur Fristen-Sektion; Fallback: ans ENDE des Ergebnisses
              // (Tabs/Empfehlungen) — nicht an den Anfang (wäre Scroll nach oben).
              if (datesSectionRef.current) {
                datesSectionRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
              } else if (analysisResultRef.current) {
                analysisResultRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
              }
            }}
          />
          )}
        </motion.div>
      )}
    </div>
  );
}