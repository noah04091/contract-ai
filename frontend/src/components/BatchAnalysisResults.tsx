// 📁 src/components/BatchAnalysisResults.tsx - NEU: Komponente für Mehrfach-Analyse-Anzeige
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, CheckCircle, ChevronDown, ChevronUp, 
  BarChart3, RefreshCw, Award, Target, AlertTriangle, AlertCircle
} from "lucide-react";
import styles from "./BatchAnalysisResults.module.css";
import ContractAnalysis from "./ContractAnalysis";

interface UploadFileItem {
  id: string;
  file: File;
  status: 'pending' | 'analyzing' | 'completed' | 'error' | 'duplicate';
  progress: number;
  result?: {
    success: boolean;
    contractScore?: number;
    summary?: string;
    legalAssessment?: string;
    suggestions?: string;
    comparison?: string;
    analysisId?: string;
    requestId?: string;
    message?: string;
    duplicate?: boolean;
    contractId?: string;
    usage?: {
      count: number;
      limit: number;
      plan: string;
    };
    analysisData?: {
      kuendigung?: string;
      laufzeit?: string;
      expiryDate?: string;
      status?: string;
      risiken?: string[];
      optimierungen?: string[];
    };
  };
  error?: string;
}

interface BatchAnalysisResultsProps {
  uploadFiles: UploadFileItem[];
  onReset: () => void;
}

export default function BatchAnalysisResults({ uploadFiles, onReset }: BatchAnalysisResultsProps) {
  const [expandedAnalysis, setExpandedAnalysis] = useState<string | null>(null);
  
  const completedFiles = uploadFiles.filter(file => file.status === 'completed' && file.result?.success);
  
  if (completedFiles.length === 0) return null;

  // Single-Upload: Zeige direkt die normale ContractAnalysis (wie bisher)
  if (completedFiles.length === 1) {
    return (
      <div className={styles.singleAnalysisContainer}>
        <ContractAnalysis 
          file={completedFiles[0].file} 
          onReset={onReset}
          initialResult={completedFiles[0].result}
        />
      </div>
    );
  }

  // Multi-Upload: Zeige elegante Batch-Übersicht
  return (
    <motion.div 
      className={styles.batchContainer}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {/* Batch-Header */}
      <div className={styles.batchHeader}>
        <div className={styles.batchInfo}>
          <CheckCircle size={28} className={styles.successIcon} />
          <div>
            <h3>🎉 Batch-Analyse abgeschlossen</h3>
            <p>{completedFiles.length} von {uploadFiles.length} Verträgen erfolgreich analysiert</p>
          </div>
        </div>
        
        <div className={styles.batchActions}>
          <button 
            className={styles.newBatchButton}
            onClick={onReset}
          >
            <RefreshCw size={16} />
            Neue Batch-Analyse
          </button>
        </div>
      </div>

      {/* Analyse-Liste */}
      <div className={styles.analysisGrid}>
        {completedFiles.map((fileItem, index) => (
          <motion.div 
            key={fileItem.id}
            className={styles.analysisCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            {/* Card Header */}
            <div className={styles.cardHeader}>
              <div className={styles.fileInfo}>
                <FileText size={20} className={styles.fileIcon} />
                <div>
                  <h4 className={styles.fileName}>{fileItem.file.name}</h4>
                  <p className={styles.fileSize}>
                    {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              
              {/* Quick Score */}
              {fileItem.result?.contractScore && (
                <div className={styles.quickScore}>
                  <div 
                    className={styles.scoreCircle}
                    style={{ 
                      background: `conic-gradient(${getScoreColor(fileItem.result.contractScore)} ${fileItem.result.contractScore}%, #e5e7eb ${fileItem.result.contractScore}%)`
                    }}
                  >
                    <div className={styles.scoreInner}>
                      {fileItem.result.contractScore}
                    </div>
                  </div>
                  <div className={styles.scoreInfo}>
                    {getScoreIcon(fileItem.result.contractScore)}
                    <span className={styles.scoreLabel}>
                      {getScoreLabel(fileItem.result.contractScore)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Summary */}
            <div className={styles.quickSummary}>
              {fileItem.result?.summary && (
                <p>{fileItem.result.summary.substring(0, 150)}...</p>
              )}
            </div>

            {/* Card Actions */}
            <div className={styles.cardActions}>
              <button 
                className={styles.expandButton}
                onClick={() => setExpandedAnalysis(
                  expandedAnalysis === fileItem.id ? null : fileItem.id
                )}
              >
                <BarChart3 size={16} />
                {expandedAnalysis === fileItem.id ? 'Weniger anzeigen' : 'Vollständige Analyse'}
                {expandedAnalysis === fileItem.id ? 
                  <ChevronUp size={16} /> : 
                  <ChevronDown size={16} />
                }
              </button>
            </div>

            {/* Expanded Analysis */}
            <AnimatePresence>
              {expandedAnalysis === fileItem.id && (
                <motion.div
                  className={styles.expandedAnalysis}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <ContractAnalysis 
                    file={fileItem.file} 
                    onReset={() => {}} // Kein Reset in expanded view
                    initialResult={fileItem.result}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

// Helper functions
function getScoreColor(score: number): string {
  if (score >= 80) return "#34C759";
  if (score >= 60) return "#FF9500";
  if (score >= 40) return "#FF6B35";
  return "#FF3B30";
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Ausgezeichnet";
  if (score >= 60) return "Gut";
  if (score >= 40) return "Akzeptabel";
  return "Kritisch";
}

function getScoreIcon(score: number) {
  if (score >= 80) return <Award size={16} style={{ color: '#34C759' }} />;
  if (score >= 60) return <Target size={16} style={{ color: '#FF9500' }} />;
  if (score >= 40) return <AlertTriangle size={16} style={{ color: '#FF6B35' }} />;
  return <AlertCircle size={16} style={{ color: '#FF3B30' }} />;
}