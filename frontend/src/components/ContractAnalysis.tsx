// 📁 src/components/ContractAnalysis.tsx - IMPROVED VERSION WITH RETRY & PROGRESS
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileText, AlertCircle, CheckCircle, Loader, 
  Download, BarChart3, RefreshCw, WifiOff, Clock
} from "lucide-react";
import { uploadAndAnalyze, checkAnalyzeHealth } from "../utils/api";
import styles from "./ContractAnalysis.module.css";

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

export default function ContractAnalysis({ file, onReset }: ContractAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [serviceHealth, setServiceHealth] = useState<boolean | null>(null);

  // ✅ Service Health Check beim Mount
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
      
      // ✅ Verwende die verbesserte uploadAndAnalyze-Funktion mit Progress
      const response = await uploadAndAnalyze(file, (progress) => {
        setProgress(progress);
      }) as AnalysisResult;
      
      console.log("✅ Analyse-Response:", response);

      if (response.success) {
        setResult(response);
        setRetryCount(0); // Reset retry count on success
        console.log("🎉 Analyse erfolgreich abgeschlossen");
      } else {
        throw new Error(response.message || "Analyse fehlgeschlagen");
      }

    } catch (err) {
      console.error("❌ Analyse-Fehler:", err);
      
      // ✅ Benutzerfreundliche Fehlermeldungen
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
      if (progress === 0) setProgress(0); // Reset nur wenn nicht erfolgreich
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return "Sehr gut";
    if (score >= 60) return "Akzeptabel";
    return "Verbesserungsbedürftig";
  };

  const canRetryAnalysis = error && retryCount < 3 && !error.includes('Limit erreicht');

  return (
    <div className={styles.analysisContainer}>
      <div className={styles.header}>
        <div className={styles.fileInfo}>
          <FileText size={24} className={styles.fileIcon} />
          <div>
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
              <BarChart3 size={16} />
              <span>
                {retryCount > 0 ? `Erneut versuchen (${retryCount})` : 'Analyse starten'}
              </span>
            </motion.button>
          )}
          
          {analyzing && (
            <div className={styles.loadingButton}>
              <Loader size={16} className={styles.spinner} />
              <span>Analysiere... {progress}%</span>
            </div>
          )}
          
          <button 
            className={styles.resetButton}
            onClick={onReset}
            disabled={analyzing}
          >
            <RefreshCw size={16} />
            <span>Zurücksetzen</span>
          </button>
        </div>
      </div>

      {/* ✅ Fortschrittsanzeige während Analyse */}
      {analyzing && (
        <motion.div 
          className={styles.progressContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className={styles.progressText}>
            {progress < 30 && "📄 PDF wird verarbeitet..."}
            {progress >= 30 && progress < 70 && "🤖 KI-Analyse läuft..."}
            {progress >= 70 && progress < 100 && "📊 Bewertung wird erstellt..."}
            {progress === 100 && "✅ Analyse abgeschlossen!"}
          </p>
          <div className={styles.progressSteps}>
            <div className={`${styles.step} ${progress >= 10 ? styles.active : ''}`}>
              🔍 Text extrahieren
            </div>
            <div className={`${styles.step} ${progress >= 30 ? styles.active : ''}`}>
              🤖 KI-Analyse
            </div>
            <div className={`${styles.step} ${progress >= 70 ? styles.active : ''}`}>
              📊 Bewertung erstellen
            </div>
          </div>
        </motion.div>
      )}

      {/* ❌ Fehleranzeige mit Smart Retry */}
      {error && (
        <motion.div 
          className={styles.errorContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.errorIcon}>
            {error.includes('Verbindung') ? <WifiOff size={24} /> : 
             error.includes('Timeout') ? <Clock size={24} /> : 
             <AlertCircle size={24} />}
          </div>
          <div className={styles.errorContent}>
            <h4>Analyse fehlgeschlagen</h4>
            <p>{error}</p>
            
            {canRetryAnalysis && (
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
        </motion.div>
      )}

      {/* ✅ Analyse-Ergebnisse */}
      {result && result.success && (
        <motion.div 
          className={styles.resultsContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.successHeader}>
            <CheckCircle size={24} className={styles.successIcon} />
            <h4>Analyse abgeschlossen</h4>
            {result.requestId && (
              <span className={styles.requestId}>ID: {result.requestId}</span>
            )}
          </div>

          {/* Contract Score */}
          {result.contractScore && (
            <div className={styles.scoreSection}>
              <div className={styles.scoreDisplay}>
                <div className={`${styles.scoreNumber} ${getScoreColor(result.contractScore)}`}>
                  {result.contractScore}
                </div>
                <div className={styles.scoreInfo}>
                  <span className={styles.scoreLabel}>Contract Score</span>
                  <span className={`${styles.scoreRating} ${getScoreColor(result.contractScore)}`}>
                    {getScoreLabel(result.contractScore)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Analyse-Details */}
          <div className={styles.detailsGrid}>
            {result.summary && (
              <div className={styles.detailCard}>
                <h5>📋 Zusammenfassung</h5>
                <p>{result.summary}</p>
              </div>
            )}

            {result.legalAssessment && (
              <div className={styles.detailCard}>
                <h5>⚖️ Rechtssicherheit</h5>
                <p>{result.legalAssessment}</p>
              </div>
            )}

            {result.suggestions && (
              <div className={styles.detailCard}>
                <h5>💡 Optimierungsvorschläge</h5>
                <p>{result.suggestions}</p>
              </div>
            )}

            {result.comparison && (
              <div className={styles.detailCard}>
                <h5>📊 Marktvergleich</h5>
                <p>{result.comparison}</p>
              </div>
            )}
          </div>

          {/* Usage Info */}
          {result.usage && (
            <div className={styles.usageInfo}>
              <p>
                📊 Analyse {result.usage.count} von {result.usage.limit === Infinity ? '∞' : result.usage.limit} 
                <span className={styles.planBadge}>{result.usage.plan}</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className={styles.actionButtons}>
            <button className={styles.downloadButton}>
              <Download size={16} />
              <span>PDF herunterladen</span>
            </button>
            <button 
              className={styles.newAnalysisButton}
              onClick={onReset}
            >
              <FileText size={16} />
              <span>Neue Analyse</span>
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}