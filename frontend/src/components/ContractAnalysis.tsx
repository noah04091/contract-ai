import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { 
  FileText, AlertCircle, CheckCircle, Loader, 
  Download, BarChart3, RefreshCw, WifiOff, Clock,
  Shield, TrendingUp, Lightbulb, FileSearch,
  Wrench, ArrowRight, AlertTriangle,
  Award, Target, Zap, ChevronDown, ChevronUp
} from "lucide-react";
import styles from "./ContractAnalysis.module.css";
import { uploadAndAnalyze, checkAnalyzeHealth, uploadAndOptimize } from "../utils/api";

interface ContractAnalysisProps {
  file: File;
  onReset: () => void;
}

interface AnalysisResult {
  success: boolean;
  message?: string;
  summary?: string;
  legalAssessment?: string;
  suggestions?: string;
  comparison?: string;
  contractScore?: number;
  analysisId?: string;
  requestId?: string;
  usage?: {
    count: number;
    limit: number;
    plan: string;
  };
  error?: string;
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

export default function ContractAnalysis({ file, onReset }: ContractAnalysisProps) {
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
  
  const analysisResultRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAnalyzeHealth().then(setServiceHealth);
  }, []);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      console.log("🔄 Starte Analyse für:", file.name);
      
      const response = await uploadAndAnalyze(file, (progress) => {
        setProgress(progress);
      }) as AnalysisResult;
      
      console.log("✅ Analyse-Response:", response);

      if (response.success) {
        setResult(response);
        setRetryCount(0);
        console.log("🎉 Analyse erfolgreich abgeschlossen");
      } else {
        throw new Error(response.message || "Analyse fehlgeschlagen");
      }

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
      // Dynamically import html2canvas and jsPDF to avoid SSR issues
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).jsPDF;
      
      const element = analysisResultRef.current;
      
      // Temporarily expand all collapsed sections for PDF
      const collapsedElements = element.querySelectorAll('[data-collapsed="true"]');
      collapsedElements.forEach((el) => {
        (el as HTMLElement).style.display = 'block';
      });
      
      // Generate canvas from the analysis result
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        height: element.scrollHeight,
        width: element.scrollWidth,
      });
      
      // Restore collapsed state
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
      
      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      // Add additional pages if needed
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      // Download the PDF
      pdf.save(`Vertragsanalyse_${file.name.replace('.pdf', '')}_${new Date().toISOString().split('T')[0]}.pdf`);
      
    } catch (error) {
      console.error('❌ PDF-Generierung fehlgeschlagen:', error);
      alert('PDF-Generierung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "#34C759"; // Grün
    if (score >= 60) return "#FF9500"; // Orange
    if (score >= 40) return "#FF6B35"; // Orange-Rot
    return "#FF3B30"; // Rot
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

  // ✅ IMPROVED: Better text formatting with cleaner structure
  const formatTextToPoints = (text: string): string[] => {
    if (!text) return ['Keine Details verfügbar'];
    
    // Split by common delimiters and clean up
    const sentences = text
      .split(/[.!?]+|[-•]\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && s.length < 200)
      .slice(0, 4); // Limit to 4 points max
    
    return sentences.length > 0 ? sentences : [text.substring(0, 180) + '...'];
  };

  // ✅ NEW: Format optimization text with better structure
  const formatOptimizationText = (text: string) => {
    if (!text) return null;
    
    // Split into sections based on numbered points or headers
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

  // ✅ IMPROVED: Score Circle Component with perfect centering
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
              </p>
            </div>
          </div>
          
          <div className={styles.actions}>
            {!result && !analyzing && (
              <motion.button 
                className={styles.analyzeButton}
                onClick={handleAnalyze}
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
              onClick={onReset}
              disabled={analyzing}
            >
              <RefreshCw size={18} />
              <span>Zurücksetzen</span>
            </button>
          </div>
        </div>
      </div>

      {/* Progress */}
      {analyzing && (
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
              {progress >= 30 && progress < 70 && "🤖 KI-Analyse läuft..."}
              {progress >= 70 && progress < 100 && "📊 Bewertung wird erstellt..."}
              {progress === 100 && "✅ Analyse abgeschlossen!"}
            </p>
          </div>
          
          <div className={styles.progressSteps}>
            {[
              { icon: "🔍", text: "Text extrahieren", threshold: 10 },
              { icon: "🤖", text: "KI-Analyse", threshold: 30 },
              { icon: "📊", text: "Bewertung erstellen", threshold: 70 }
            ].map((step, index) => (
              <div key={index} className={`${styles.progressStep} ${progress >= step.threshold ? styles.active : ''}`}>
                <span>{step.icon}</span>
                <span>{step.text}</span>
              </div>
            ))}
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
               <AlertCircle size={24} />}
            </div>
            <div className={styles.errorDetails}>
              <h4 className={styles.errorTitle}>
                {error.includes('🔧 Optimierung') ? 'Optimierung fehlgeschlagen' : 'Analyse fehlgeschlagen'}
              </h4>
              <p className={styles.errorMessage}>{error}</p>
              
              {canRetryAnalysis && !error.includes('🔧 Optimierung') && (
                <div className={styles.retrySection}>
                  <button 
                    className={styles.retryButton}
                    onClick={handleAnalyze}
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

      {/* Results */}
      {result && result.success && (
        <motion.div 
          className={styles.resultsContainer}
          ref={analysisResultRef}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Success Header */}
          <div className={styles.successHeader}>
            <div className={styles.successInfo}>
              <CheckCircle size={28} className={styles.successIcon} />
              <div className={styles.successDetails}>
                <h4>Analyse abgeschlossen</h4>
                <p>Rechtssichere Vertragseinschätzung in Sekunden</p>
              </div>
            </div>
            {result.requestId && (
              <span className={styles.requestId}>
                ID: {result.requestId}
              </span>
            )}
          </div>

          {/* Contract Score - ✅ IMPROVED: Perfect centering */}
          {result.contractScore && (
            <div className={styles.scoreSection}>
              <h5 className={styles.scoreSectionTitle}>Contract Score</h5>
              
              <div className={styles.scoreSectionContent}>
                <ScoreCircle score={result.contractScore} />
              </div>
              
              <div className={styles.scoreInfoContainer}>
                {getScoreIcon(result.contractScore)}
                <span className={styles.scoreLabel} style={{ color: getScoreColor(result.contractScore) }}>
                  {getScoreLabel(result.contractScore)}
                </span>
              </div>
              
              <p className={styles.scoreDescription}>
                {result.contractScore >= 80 && "Dieser Vertrag bietet eine sehr gute Rechtssicherheit und faire Konditionen."}
                {result.contractScore >= 60 && result.contractScore < 80 && "Dieser Vertrag ist grundsätzlich in Ordnung, hat aber Verbesserungspotential."}
                {result.contractScore >= 40 && result.contractScore < 60 && "Dieser Vertrag weist einige Schwächen auf und sollte überprüft werden."}
                {result.contractScore < 40 && "Dieser Vertrag enthält kritische Punkte und sollte dringend überarbeitet werden."}
              </p>
            </div>
          )}

          {/* Analysis Details - ✅ IMPROVED: Better formatting */}
          <div className={styles.detailsGrid}>
            {/* Zusammenfassung */}
            {result.summary && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div className={`${styles.detailIconContainer} ${styles.blueIcon}`}>
                    <FileSearch size={20} />
                  </div>
                  <h5>Zusammenfassung</h5>
                </div>
                <div className={styles.cardContent}>
                  <ul className={styles.pointsList}>
                    {formatTextToPoints(result.summary).map((point, index) => (
                      <li key={index} className={styles.pointItem}>
                        <div className={`${styles.pointBullet} ${styles.blueBullet}`}></div>
                        <p className={styles.pointText}>{point}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Rechtssicherheit */}
            {result.legalAssessment && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div className={`${styles.detailIconContainer} ${styles.greenIcon}`}>
                    <Shield size={20} />
                  </div>
                  <h5>Rechtssicherheit</h5>
                </div>
                <div className={styles.cardContent}>
                  <ul className={styles.pointsList}>
                    {formatTextToPoints(result.legalAssessment).map((point, index) => (
                      <li key={index} className={styles.pointItem}>
                        <div className={`${styles.pointBullet} ${styles.greenBullet}`}></div>
                        <p className={styles.pointText}>{point}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Optimierungsvorschläge */}
            {result.suggestions && (
              <div className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div className={`${styles.detailIconContainer} ${styles.yellowIcon}`}>
                    <Lightbulb size={20} />
                  </div>
                  <h5>Optimierungsvorschläge</h5>
                </div>
                <div className={styles.cardContent}>
                  <ul className={styles.pointsList}>
                    {formatTextToPoints(result.suggestions).map((point, index) => (
                      <li key={index} className={styles.pointItem}>
                        <div className={`${styles.pointBullet} ${styles.yellowBullet}`}></div>
                        <p className={styles.pointText}>{point}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Marktvergleich */}
            <div className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <div className={`${styles.detailIconContainer} ${styles.purpleIcon}`}>
                  <TrendingUp size={20} />
                </div>
                <h5>Marktvergleich</h5>
              </div>
              <div className={styles.cardContent}>
                {result.comparison ? (
                  <ul className={styles.pointsList}>
                    {formatTextToPoints(result.comparison).map((point, index) => (
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
          </div>

          {/* Usage Info */}
          {result.usage && (
            <div className={styles.usageInfo}>
              <p>
                📊 Analyse <strong>{result.usage.count}</strong> von <strong>{result.usage.limit === Infinity ? '∞' : result.usage.limit}</strong>
                <span className={styles.planBadge}>
                  {result.usage.plan}
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
                    <span>PDF herunterladen</span>
                  </>
                )}
              </button>
              <button 
                className={`${styles.secondaryButton} ${styles.newAnalysisButton}`}
                onClick={onReset}
              >
                <FileText size={18} />
                <span>Neue Analyse</span>
              </button>
            </div>
          </div>

          {/* ✅ IMPROVED: Optimization Result with better structure */}
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