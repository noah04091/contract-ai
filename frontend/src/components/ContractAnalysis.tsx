// 📁 src/components/ContractAnalysis.tsx - FIXED VERSION
import { useState } from "react";
import { motion } from "framer-motion";
import { 
  FileText, AlertCircle, CheckCircle, Loader, 
  Download, BarChart3, RefreshCw 
} from "lucide-react";
import { uploadAndAnalyze } from "../utils/api";
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
  usage?: {
    count: number;
    limit: number;
    plan: string;
  };
  error?: string;
}

export default function ContractAnalysis({ file, onReset }: ContractAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setError(null);
    setResult(null);

    try {
      console.log("🔄 Starte Analyse für:", file.name);
      
      // ✅ Verwende die neue uploadAndAnalyze-Funktion
      const response = await uploadAndAnalyze(file) as AnalysisResult;
      
      console.log("✅ Analyse-Response:", response);

      if (response.success) {
        setResult(response);
        console.log("🎉 Analyse erfolgreich abgeschlossen");
      } else {
        throw new Error(response.message || "Analyse fehlgeschlagen");
      }

    } catch (err) {
      console.error("❌ Analyse-Fehler:", err);
      
      // ✅ Benutzerfreundliche Fehlermeldungen
      let errorMessage = "Ein unbekannter Fehler ist aufgetreten.";
      
      if (err instanceof Error) {
        if (err.message.includes('nicht erreichbar')) {
          errorMessage = "🌐 Verbindungsfehler: Bitte prüfe deine Internetverbindung.";
        } else if (err.message.includes('Limit erreicht')) {
          errorMessage = "📊 Analyse-Limit erreicht. Bitte upgrade dein Paket.";
        } else if (err.message.includes('nicht verfügbar')) {
          errorMessage = "🔧 Analyse-Service ist vorübergehend nicht verfügbar.";
        } else if (err.message.includes('Timeout')) {
          errorMessage = "⏱️ Analyse-Timeout. Bitte versuche es mit einer kleineren Datei.";
        } else if (err.message.includes('PDF')) {
          errorMessage = "📄 PDF konnte nicht gelesen werden. Bitte prüfe das Dateiformat.";
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
    } finally {
      setAnalyzing(false);
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

  return (
    <div className={styles.analysisContainer}>
      <div className={styles.header}>
        <div className={styles.fileInfo}>
          <FileText size={24} className={styles.fileIcon} />
          <div>
            <h3 className={styles.fileName}>{file.name}</h3>
            <p className={styles.fileSize}>
              {(file.size / 1024 / 1024).toFixed(2)} MB
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
              disabled={analyzing}
            >
              <BarChart3 size={16} />
              <span>Analyse starten</span>
            </motion.button>
          )}
          
          {analyzing && (
            <div className={styles.loadingButton}>
              <Loader size={16} className={styles.spinner} />
              <span>Analysiere...</span>
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
            <div className={styles.progressFill} />
          </div>
          <p className={styles.progressText}>
            📄 PDF wird gelesen und analysiert...
          </p>
          <div className={styles.progressSteps}>
            <div className={styles.step}>🔍 Text extrahieren</div>
            <div className={styles.step}>🤖 KI-Analyse</div>
            <div className={styles.step}>📊 Bewertung erstellen</div>
          </div>
        </motion.div>
      )}

      {/* ❌ Fehleranzeige */}
      {error && (
        <motion.div 
          className={styles.errorContainer}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={24} className={styles.errorIcon} />
          <div className={styles.errorContent}>
            <h4>Analyse fehlgeschlagen</h4>
            <p>{error}</p>
            <button 
              className={styles.retryButton}
              onClick={handleAnalyze}
            >
              <RefreshCw size={16} />
              <span>Erneut versuchen</span>
            </button>
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