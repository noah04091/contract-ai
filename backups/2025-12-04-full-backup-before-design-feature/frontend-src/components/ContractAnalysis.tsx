import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  FileText, AlertCircle, CheckCircle, Loader,
  Download, BarChart3, RefreshCw, WifiOff, Clock,
  Wrench, ArrowRight, AlertTriangle,
  Award, Target, Zap, ChevronDown, ChevronUp,
  Copy, Eye, X, // ✅ Icons für Duplikat-Modal
  CheckSquare, XCircle, // ✅ Für Risiko-Level Icons und Features
  Gavel, Scale, Star // ✅ NEU: Anwalts-Icons
} from "lucide-react";
import styles from "./ContractAnalysis.module.css";
import { uploadAndAnalyze, checkAnalyzeHealth } from "../utils/api";

interface ContractAnalysisProps {
  file: File;
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

// ✅ NEU: Interface für Legal Pulse Daten
interface LegalPulseRisk {
  title: string;
  description: string;
  severity?: string;
  category?: string;
}

interface LegalPulseData {
  riskScore: number;
  topRisks?: LegalPulseRisk[];
  compliance?: string[];
  suggestions?: string[];
  [key: string]: unknown;
}

export default function ContractAnalysis({ file, onReset, onNavigateToContract, initialResult }: ContractAnalysisProps) {
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

  // 🆕 Legal Pulse Loading States
  const [legalPulseLoading, setLegalPulseLoading] = useState(false);
  const [legalPulseData, setLegalPulseData] = useState<LegalPulseData | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const navigate = useNavigate();
  const analysisResultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAnalyzeHealth().then(setServiceHealth);
  }, []);

  // ✅ CRITICAL FIX: useEffect um initialResult zu setzen
  useEffect(() => {
    if (initialResult) {
      console.log("📊 InitialResult gefunden - zeige vorhandene Analyse an:", initialResult);
      setResult(initialResult);
      setProgress(100);
      setAnalyzing(false);
      setError(null);
      
      console.log("✅ Analyse bereits vorhanden - wird direkt angezeigt");
    }
  }, [initialResult]);

  // ✅ FIXED: Robustes State-Reset
  const resetAllStates = () => {
    console.log("🔄 Resetting all states...");
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

    // 🆕 Legal Pulse States reset
    setLegalPulseLoading(false);
    setLegalPulseData(null);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // 🆕 Legal Pulse Polling Function
  const startLegalPulsePolling = (contractId: string) => {
    console.log('⚡ Starting Legal Pulse polling for contract:', contractId);
    setLegalPulseLoading(true);

    // Clear any existing interval
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    let pollCount = 0;
    const maxPolls = 40; // Max 2 Minuten (40 * 3 Sekunden)

    const pollLegalPulse = async () => {
      try {
        pollCount++;
        console.log(`⚡ [${pollCount}/${maxPolls}] Polling Legal Pulse status...`);

        const response = await fetch(`/api/contracts/${contractId}`, {
          credentials: 'include'
        });

        if (!response.ok) {
          console.error('Failed to fetch contract:', response.status);
          return;
        }

        const contractData = await response.json();

        // Check if Legal Pulse data is available
        if (contractData.legalPulse) {
          console.log('✅ Legal Pulse data found!', contractData.legalPulse);
          setLegalPulseData(contractData.legalPulse);
          setLegalPulseLoading(false);

          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (pollCount >= maxPolls) {
          console.warn('⚠️ Legal Pulse polling timeout - max retries reached');
          setLegalPulseLoading(false);

          // Stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (error) {
        console.error('Error polling Legal Pulse:', error);
      }
    };

    // Initial poll
    pollLegalPulse();

    // Set up interval
    pollingIntervalRef.current = setInterval(pollLegalPulse, 3000); // Poll every 3 seconds
  };

  // 🆕 Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // ✅ FIXED: Robustes handleAnalyze mit besserem TypeScript-Handling + initialResult-Support
  const handleAnalyze = async (forceReanalyze = false) => {
    // ✅ Wenn initialResult vorhanden und nicht forceReanalyze, nichts tun
    if (initialResult && !forceReanalyze) {
      console.log("📊 InitialResult vorhanden - überspringe Analyse");
      return;
    }

    console.log("🔄 Starte Analyse für:", file.name, forceReanalyze ? "(Re-Analyse)" : "");
    
    // ✅ WICHTIG: States zurücksetzen VOR der Analyse
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setProgress(0);
    setShowDuplicateModal(false);
    setDuplicateInfo(null);

    try {
      const response = await uploadAndAnalyze(file, (progress) => {
        setProgress(progress);
      }, forceReanalyze);
      
      console.log("✅ Analyse-Response:", response);

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
          console.log("🔄 Duplikat erkannt:", response);
          
          // Validiere Duplikat-Response Struktur
          if ('contractId' in responseObj && 'contractName' in responseObj && 'actions' in responseObj) {
            setDuplicateInfo(response as DuplicateResponse);
            setShowDuplicateModal(true);
            return;
          } else {
            console.error("❌ Unvollständige Duplikat-Response:", response);
            throw new Error("📄 Dieser Vertrag wurde bereits hochgeladen. Bitte prüfe deine Vertragsliste.");
          }
        }

        // Prüfe auf erfolgreiche Analyse
        if ('success' in responseObj && responseObj.success === true) {
          // ✅ FIXED: Type-sicheres Casting für AnalysisResult
          const analysisResult = response as AnalysisResponse;
          setResult(analysisResult);
          setRetryCount(0);
          console.log("🎉 Analyse erfolgreich abgeschlossen");

          // ✅ FIXED: Type-sichere Prüfung auf Re-Analyse
          if (analysisResult.isReanalysis && analysisResult.originalContractId) {
            console.log("🔄 Re-Analyse erfolgreich für Vertrag:", analysisResult.originalContractId);
          }

          // 🆕 Start Legal Pulse Polling
          if (analysisResult.originalContractId) {
            console.log("⚡ Starte Legal Pulse Polling für Contract:", analysisResult.originalContractId);
            startLegalPulsePolling(analysisResult.originalContractId);
          }

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
          errorMessage = "🌐 Verbindungsfehler: Server ist momentan nicht erreichbar.";
          canRetry = true;
        } else if (errMsg.includes('Limit erreicht')) {
          errorMessage = "📊 Analyse-Limit erreicht. Bitte upgrade dein Paket.";
          canRetry = false;
        } else if (errMsg.includes('nicht verfügbar') || errMsg.includes('500')) {
          errorMessage = "🔧 Analyse-Service ist vorübergehend überlastet.";
          canRetry = true;
        } else if (errMsg.includes('Timeout')) {
          errorMessage = "⏱️ Analyse-Timeout. Die PDF-Datei ist möglicherweise zu groß.";
          canRetry = true;
        } else if (errMsg.includes('PDF') || errMsg.includes('Datei')) {
          errorMessage = "📄 PDF konnte nicht verarbeitet werden. Bitte prüfe das Dateiformat.";
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
    console.log("🔄 User wählt: Erneut analysieren");
    setShowDuplicateModal(false);
    setDuplicateInfo(null);
    setTimeout(() => {
      handleAnalyze(true);
    }, 100);
  };

  const handleDuplicateViewExisting = () => {
    console.log("👁️ User wählt: Bestehenden Vertrag anzeigen");
    if (duplicateInfo && onNavigateToContract) {
      onNavigateToContract(duplicateInfo.contractId);
    } else {
      setShowDuplicateModal(false);
      setShowNavigationMessage(true);
    }
  };

  const handleDuplicateClose = () => {
    console.log("❌ User schließt Duplikat-Modal");
    setShowDuplicateModal(false);
    setDuplicateInfo(null);
  };

  // ✅ FIXED: Reset-Handler mit vollständigem State-Reset
  const handleReset = () => {
    console.log("🔄 User klickt Reset");
    resetAllStates();
    onReset();
  };

  const handleOptimize = () => {
    if (!result && !initialResult) return;

    console.log("🔧 Navigiere zum Optimizer mit Analyse-Context");

    // Sammle alle Analyse-Daten für zusätzlichen Context
    const analysisData = result || initialResult;

    navigate('/optimizer', {
      state: {
        contractId: analysisData?.originalContractId,
        file: file,
        analysisContext: {
          summary: analysisData?.summary,
          legalAssessment: analysisData?.legalAssessment,
          suggestions: analysisData?.suggestions,
          comparison: analysisData?.comparison,
          positiveAspects: analysisData?.positiveAspects,
          criticalIssues: analysisData?.criticalIssues,
          recommendations: analysisData?.recommendations,
          detailedLegalOpinion: analysisData?.detailedLegalOpinion,
          contractScore: analysisData?.contractScore
        }
      }
    });
  };

  const handleDownloadPdf = async () => {
    if (!result || !analysisResultRef.current) return;
    
    setGeneratingPdf(true);
    
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;
      
      const element = analysisResultRef.current;
      
      const collapsedElements = element.querySelectorAll('[data-collapsed="true"]');
      collapsedElements.forEach((el) => {
        (el as HTMLElement).style.display = 'block';
      });
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: element.scrollHeight,
        width: element.scrollWidth,
      });
      
      collapsedElements.forEach((el) => {
        (el as HTMLElement).style.display = '';
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Vertragsanalyse_${file.name.replace('.pdf', '')}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('❌ PDF-Generierung fehlgeschlagen:', error);
      alert('PDF-Generierung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setGeneratingPdf(false);
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

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.fileInfo}>
            <div className={styles.fileIconContainer}>
              <FileText size={24} className={styles.fileIcon} />
            </div>
            <div className={styles.fileDetails}>
              <h3 className={styles.fileName}>{file.name}</h3>
              <p className={styles.fileSize}>
                {(file.size / 1024 / 1024).toFixed(2)} MB
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
                    Anwaltsniveau
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

            {/* ✅ CRITICAL FIX: Re-Analyse Button wenn Analyse vorhanden (result ODER initialResult) */}
            {(result || initialResult) && !analyzing && (
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
              {progress < 30 && "📄 PDF wird verarbeitet..."}
              {progress >= 30 && progress < 70 && "🏛️ Anwaltliche KI-Analyse läuft..."}
              {progress >= 70 && progress < 100 && "📊 Rechtsgutachten wird erstellt..."}
              {progress === 100 && "✅ Anwaltliche Analyse abgeschlossen!"}
            </p>
          </div>
          
          <div className={styles.progressSteps}>
            {[
              { icon: "🔍", text: "Text extrahieren", threshold: 10 },
              { icon: "🏛️", text: "Anwaltliche Analyse", threshold: 30 },
              { icon: "📊", text: "Rechtsgutachten erstellen", threshold: 70 }
            ].map((step, index) => (
              <div key={index} className={`${styles.progressStep} ${progress >= step.threshold ? styles.active : ''}`}>
                <span>{step.icon}</span>
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
                  <p>❌ Maximale Anzahl Versuche erreicht.</p>
                  <button 
                    className={styles.contactSupportButton}
                    onClick={() => window.open('mailto:support@contract-ai.de')}
                  >
                    📧 Support kontaktieren
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
          {/* ✅ ENHANCED: Success Header mit Lawyer-Level Indikator */}
          <div className={styles.successHeader}>
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
                    ? 'Anwaltliche Analyse bereits verfügbar' 
                    : result?.isReanalysis 
                      ? 'Anwaltliche Analyse aktualisiert' 
                      : 'Anwaltliche Vertragsanalyse abgeschlossen'
                  }
                </h4>
                <p>
                  {initialResult 
                    ? 'Diese Datei wurde bereits auf Anwaltsniveau analysiert - Ergebnisse werden angezeigt'
                    : result?.isReanalysis 
                      ? 'Bestehende Anwaltsanalyse wurde erfolgreich überschrieben'
                      : 'Rechtssichere Vertragseinschätzung auf Fachanwaltsniveau in Sekunden'
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
                      Anwaltsniveau
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

          {/* ✅ CRITICAL FIX: Contract Score - funktioniert für beide */}
          {(result?.contractScore || initialResult?.contractScore) && (
            <div className={styles.scoreSection}>
              <h5 className={styles.scoreSectionTitle}>
                {(result?.lawyerLevelAnalysis || initialResult?.lawyerLevelAnalysis) 
                  ? 'Anwaltliche Gesamtbewertung' 
                  : 'Contract Score'
                }
              </h5>
              
              <div className={styles.scoreSectionContent}>
                <ScoreCircle score={result?.contractScore || initialResult?.contractScore || 0} />
              </div>
              
              <div className={styles.scoreInfoContainer}>
                {getScoreIcon(result?.contractScore || initialResult?.contractScore || 0)}
                <span className={styles.scoreLabel} style={{ color: getScoreColor(result?.contractScore || initialResult?.contractScore || 0) }}>
                  {getScoreLabel(result?.contractScore || initialResult?.contractScore || 0)}
                </span>
              </div>
              
              <p className={styles.scoreDescription}>
                {(result?.contractScore || initialResult?.contractScore || 0) >= 80 && "Dieser Vertrag bietet eine sehr gute Rechtssicherheit und faire Konditionen."}
                {(result?.contractScore || initialResult?.contractScore || 0) >= 60 && (result?.contractScore || initialResult?.contractScore || 0) < 80 && "Dieser Vertrag ist grundsätzlich in Ordnung, hat aber Verbesserungspotential."}
                {(result?.contractScore || initialResult?.contractScore || 0) >= 40 && (result?.contractScore || initialResult?.contractScore || 0) < 60 && "Dieser Vertrag weist einige Schwächen auf und sollte überprüft werden."}
                {(result?.contractScore || initialResult?.contractScore || 0) < 40 && "Dieser Vertrag enthält kritische Punkte und sollte dringend überarbeitet werden."}
              </p>
            </div>
          )}

          {/* ✅ ENHANCED: 7-Punkte-Analyse Details Grid */}
          <div className={styles.detailsGrid}>
            {/* 1. 📄 Zusammenfassung */}
            {(result?.summary || initialResult?.summary) && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <h5>📄 Zusammenfassung</h5>
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

            {/* 2. 🛡️ Rechtssicherheit */}
            {(result?.legalAssessment || initialResult?.legalAssessment) && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <h5>🛡️ Rechtssicherheit</h5>
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

            {/* 3. 💡 Optimierungsvorschläge */}
            {(result?.suggestions || initialResult?.suggestions) && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <h5>💡 Optimierungsvorschläge</h5>
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

            {/* 4. 📊 Marktvergleich */}
            <div className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <h5>📊 Marktvergleich</h5>
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

            {/* ✅ NEW: 5. ✅ Positive Aspekte */}
            {(result?.positiveAspects || initialResult?.positiveAspects) && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <h5>✅ Positive Aspekte</h5>
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

            {/* ✅ NEW: 6. ⚠️ Kritische Klauseln & Risiken */}
            {(result?.criticalIssues || initialResult?.criticalIssues) && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <h5>⚠️ Kritische Klauseln & Risiken</h5>
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

          {/* ✅ NEW: 7. 📌 Handlungsempfehlungen (Volle Breite) */}
          {(result?.recommendations || initialResult?.recommendations) && (
            <div className={`${styles.detailCard} ${styles.fullWidthCard}`}>
              <div className={styles.detailHeader}>
                <h5>📌 Handlungsempfehlungen</h5>
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

          {/* ✅ NEU: Ausführliches Rechtsgutachten */}
          {(result?.detailedLegalOpinion || initialResult?.detailedLegalOpinion) && (
            <motion.div
              className={styles.legalOpinionSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className={styles.legalOpinionHeader}>
                <div className={styles.legalOpinionTitleSection}>
                  <div className={`${styles.detailIconContainer} ${styles.goldIcon}`}>
                    <Gavel size={24} />
                  </div>
                  <div>
                    <h5 className={styles.legalOpinionTitle}>
                      📋 Ausführliches Rechtsgutachten
                    </h5>
                    <p className={styles.legalOpinionSubtitle}>
                      Professionelle anwaltliche Gesamtbewertung auf Fachanwaltsniveau
                    </p>
                  </div>
                </div>
                <div className={styles.legalOpinionBadge}>
                  <Scale size={16} />
                  <span>Fachanwaltsniveau</span>
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

          {/* 🆕 Legal Pulse Loading / Results Section */}
          {(legalPulseLoading || legalPulseData) && (
            <motion.div
              className={styles.legalPulseSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className={styles.sectionHeader}>
                <div className={styles.headerLeft}>
                  <Zap size={24} className={styles.headerIcon} style={{ color: '#f59e0b' }} />
                  <div>
                    <h5 className={styles.sectionTitle}>⚡ Legal Pulse Analyse</h5>
                    <p className={styles.sectionSubtitle}>
                      KI-gestützte Risikoanalyse & rechtliche Empfehlungen
                    </p>
                  </div>
                </div>
              </div>

              {legalPulseLoading && !legalPulseData && (
                <div className={styles.legalPulseLoading}>
                  <motion.div
                    className={styles.loadingSpinner}
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader size={32} color="#f59e0b" />
                  </motion.div>
                  <p className={styles.loadingText}>Legal Pulse Analyse läuft...</p>
                  <p className={styles.loadingSubtext}>
                    Wir analysieren Ihr Dokument auf rechtliche Risiken und Compliance-Anforderungen
                  </p>
                </div>
              )}

              {legalPulseData && (
                <div className={styles.legalPulseResults}>
                  <div className={styles.pulseScoreCard}>
                    <div className={styles.scoreHeader}>
                      <span className={styles.scoreLabel}>Risiko-Score</span>
                      <span className={`${styles.scoreValue} ${
                        legalPulseData.riskScore > 70 ? styles.scoreHigh :
                        legalPulseData.riskScore > 40 ? styles.scoreMedium :
                        styles.scoreLow
                      }`}>
                        {legalPulseData.riskScore}/100
                      </span>
                    </div>
                  </div>

                  {legalPulseData.topRisks && legalPulseData.topRisks.length > 0 && (
                    <div className={styles.pulseRisks}>
                      <h6 className={styles.subSectionTitle}>
                        <AlertTriangle size={18} color="#ef4444" />
                        Top Risiken
                      </h6>
                      <ul className={styles.riskList}>
                        {legalPulseData.topRisks.slice(0, 3).map((risk: LegalPulseRisk, index: number) => (
                          <li key={index} className={styles.riskItem}>
                            <strong>{risk.title}</strong>
                            <p>{risk.description}</p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className={styles.pulseActions}>
                    <button
                      className={styles.viewFullPulseButton}
                      onClick={() => window.location.href = `/legalpulse/${result?.originalContractId || initialResult?.originalContractId}`}
                    >
                      <BarChart3 size={18} />
                      <span>Vollständige Legal Pulse Analyse anzeigen</span>
                      <ArrowRight size={16} />
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionButtonsContainer}>
            {/* Optimize Button */}
            <motion.button 
              className={styles.primaryActionButton}
              onClick={handleOptimize}
              disabled={optimizing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {optimizing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Loader size={20} />
                  </motion.div>
                  <span>Optimiere Vertrag...</span>
                </>
              ) : (
                <>
                  <Wrench size={20} />
                  <span>Vertrag jetzt optimieren</span>
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>

            {/* Legal Pulse Button - Only show if contractId is available */}
            {(result?.originalContractId || initialResult?.originalContractId) && (
              <button
                className={`${styles.secondaryButton} ${styles.legalPulseButton}`}
                onClick={() => window.location.href = `/legalpulse/${result?.originalContractId || initialResult?.originalContractId}`}
              >
                <BarChart3 size={18} />
                <span>Legal Pulse Analyse</span>
              </button>
            )}

            {/* PDF Download Button */}
            <button
              className={`${styles.secondaryButton} ${styles.downloadButton}`}
              onClick={handleDownloadPdf}
              disabled={generatingPdf}
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
                  <span>Anwalts-PDF herunterladen</span>
                </>
              )}
            </button>

            {/* New Analysis Button */}
            <button
              className={`${styles.secondaryButton} ${styles.newAnalysisButton}`}
              onClick={handleReset}
            >
              <FileText size={18} />
              <span>Neue Analyse</span>
            </button>
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

          {/* ✅ Usage Info - Kleine Randinformation ganz unten */}
          {(result?.usage || initialResult?.usage) && (
            <div className={styles.usageInfo}>
              <p>
                📊 Anwaltliche Analyse <strong>{(result?.usage || initialResult?.usage)?.count}</strong> von <strong>{(result?.usage || initialResult?.usage)?.limit === Infinity ? '∞' : (result?.usage || initialResult?.usage)?.limit}</strong>
                <span className={styles.planBadge}>
                  {(result?.usage || initialResult?.usage)?.plan}
                </span>
              </p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}