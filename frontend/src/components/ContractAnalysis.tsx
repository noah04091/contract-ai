import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, AlertCircle, CheckCircle, Loader, 
  Download, BarChart3, RefreshCw, WifiOff, Clock,
  Shield, TrendingUp, Lightbulb, FileSearch,
  Wrench, ArrowRight, AlertTriangle,
  Award, Target, Zap, ChevronDown, ChevronUp,
  Copy, Eye, X, // ✅ Icons für Duplikat-Modal
  CheckSquare, XCircle, BookOpen, // ✅ NEU: Icons für 7-Punkte-Struktur (Users und MapPin entfernt)
  Gavel, Scale, Star // ✅ NEU: Anwalts-Icons
} from "lucide-react";
import styles from "./ContractAnalysis.module.css";
import { uploadAndAnalyze, checkAnalyzeHealth, uploadAndOptimize } from "../utils/api";

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

interface OptimizationResult {
  success: boolean;
  message?: string;
  optimizationResult?: string;
  optimizationId?: string;
  requestId?: string;
  usage?: {
    count: number;
    limit: number;
    plan: string;
  };
  error?: string;
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
  };

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

  const handleOptimize = async () => {
    if (!result) return;
    
    setOptimizing(true);
    try {
      console.log("🔧 Starte Optimierung für:", file.name);
      
      const optimizeResponse = await uploadAndOptimize(file, 'Standardvertrag', (progress) => {
        console.log(`🔧 Optimierung Progress: ${progress}%`);
      }) as OptimizationResult;
      
      console.log("✅ Optimierung-Response:", optimizeResponse);
      
      if (optimizeResponse && optimizeResponse.optimizationResult) {
        setOptimizationResult(optimizeResponse.optimizationResult);
        setIsOptimizationExpanded(true);
        console.log("🎉 Optimierung erfolgreich abgeschlossen");
      } else if (optimizeResponse && optimizeResponse.message) {
        setOptimizationResult(optimizeResponse.message);
      } else {
        setOptimizationResult("Optimierung wurde durchgeführt, aber Details sind nicht verfügbar.");
      }
    } catch (err) {
      console.error("❌ Optimierung fehlgeschlagen:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(`🔧 Optimierung fehlgeschlagen: ${errorMessage}`);
    } finally {
      setOptimizing(false);
    }
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
                  <div className={`${styles.detailIconContainer} ${styles.blueIcon}`}>
                    <FileSearch size={20} />
                  </div>
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
                  <div className={`${styles.detailIconContainer} ${styles.greenIcon}`}>
                    <Shield size={20} />
                  </div>
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
                  <div className={`${styles.detailIconContainer} ${styles.yellowIcon}`}>
                    <Lightbulb size={20} />
                  </div>
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
                <div className={`${styles.detailIconContainer} ${styles.purpleIcon}`}>
                  <TrendingUp size={20} />
                </div>
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
                  <div className={`${styles.detailIconContainer} ${styles.greenIcon}`}>
                    <CheckSquare size={20} />
                  </div>
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
                  <div className={`${styles.detailIconContainer} ${styles.redIcon}`}>
                    <XCircle size={20} />
                  </div>
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

            {/* ✅ NEW: 7. 📌 Handlungsempfehlungen */}
            {(result?.recommendations || initialResult?.recommendations) && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div className={`${styles.detailIconContainer} ${styles.blueIcon}`}>
                    <BookOpen size={20} />
                  </div>
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
          </div>

          {/* ✅ CRITICAL FIX: Usage Info - funktioniert für beide */}
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

            {/* Secondary Actions */}
            <div className={styles.secondaryActions}>
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
              <button 
                className={`${styles.secondaryButton} ${styles.newAnalysisButton}`}
                onClick={handleReset}
              >
                <FileText size={18} />
                <span>Neue Analyse</span>
              </button>
            </div>
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
        </motion.div>
      )}
    </div>
  );
}