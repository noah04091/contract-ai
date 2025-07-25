// 📁 src/components/UltraProfessionalStreamingUI.tsx - MIT DEBUG LOGS
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  CheckCircle, 
  AlertCircle, 
  Loader, 
  FileText, 
  Clock, 
  TrendingUp, 
  Award, 
  Sparkles, 
  Play, 
  Pause, 
  RotateCcw,
  X
} from 'lucide-react';
import { OptimizationSuggestion } from '../types/optimizer';
import styles from './UltraProfessionalStreamingUI.module.css';

// ✅ TYPESCRIPT INTERFACES
interface StreamingResult {
  success: boolean;
  error?: string;
  downloadUrl?: string;
  filename?: string;
  pdfSize?: number;
  successRate?: number;
  generationTime?: number;
  optimizationsApplied?: number;
  message?: string;
}

// ✅ ANALYSIS DATA INTERFACE (statt any)
interface AnalysisData {
  success?: boolean;
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

// ✅ UPDATED INTERFACE WITH PROPER TYPES
interface UltraProfessionalStreamingUIProps {
  contractId?: string | null;
  contractName?: string;
  optimizations?: OptimizationSuggestion[];
  originalContractText?: string;    // 🆕 Für Backend PDF-Generierung
  analysisData?: AnalysisData | null; // 🔧 FIXED: Akzeptiert auch null
  onComplete?: (result: StreamingResult) => void;
  onCancel?: () => void;
  className?: string;
}

interface StreamingLog {
  id: number;
  timestamp: string;
  progress?: number;
  message: string;
  type: 'progress' | 'success' | 'error' | 'info';
}

interface StreamingMetrics {
  optimizationsApplied: number;
  totalOptimizations: number;
  successRate: number;
  generationTime: number;
  pdfSize: number;
}

// ✅ COMPONENT WITH PROPER TYPES + DEBUG
const UltraProfessionalStreamingUI: React.FC<UltraProfessionalStreamingUIProps> = ({ 
  contractId,
  contractName = "Unbekannter Vertrag",
  optimizations = [],
  originalContractText,    // 🆕 Empfange neue Prop
  analysisData,           // 🔧 FIXED: Jetzt mit richtigem Type
  onComplete,
  onCancel,
  className
}) => {
  // 🔥 DEBUG LOG BEIM KOMPONENTEN START
  console.log("🔥 UltraProfessionalStreamingUI GELADEN!", {
    contractId,
    contractName,
    optimizationsLength: optimizations.length,
    hasOriginalContent: !!originalContractText,
    originalContentLength: originalContractText?.length || 0,
    hasAnalysisData: !!analysisData,
    analysisDataKeys: analysisData ? Object.keys(analysisData) : [],
    propsReceived: {
      contractId: !!contractId,
      contractName: !!contractName,
      optimizations: optimizations.length,
      originalContractText: !!originalContractText,
      analysisData: !!analysisData,
      onComplete: !!onComplete,
      onCancel: !!onCancel
    }
  });

  const [isStreaming, setIsStreaming] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');
  const [streamingLogs, setStreamingLogs] = useState<StreamingLog[]>([]);
  const [result, setResult] = useState<StreamingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<StreamingMetrics>({
    optimizationsApplied: 0,
    totalOptimizations: optimizations.length,
    successRate: 0,
    generationTime: 0,
    pdfSize: 0
  });
  
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // ✅ Auto-scroll logs
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [streamingLogs]);

  // ✅ Update metrics when optimizations change
  useEffect(() => {
    setMetrics(prev => ({
      ...prev,
      totalOptimizations: optimizations.length
    }));
  }, [optimizations]);

  // ✅ Add log helper
  const addLog = useCallback((message: string, type: StreamingLog['type'] = 'info', progress?: number) => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`🔥 STREAMING LOG [${type.toUpperCase()}]: ${message}`, { progress });
    setStreamingLogs(prev => [...prev, {
      id: Date.now() + Math.random(),
      timestamp,
      progress,
      message,
      type
    }]);
  }, []);

  // ✅ ENHANCED STREAMING WITH NEW PROPS + DEBUG
  const startStreaming = useCallback(async () => {
    console.log("🔥 startStreaming() aufgerufen!");
    
    if (!contractId) {
      console.log("🔥 ERROR: Keine Contract ID!");
      setError("Keine Contract ID verfügbar. Bitte lade den Vertrag erneut hoch.");
      return;
    }

    console.log("🔥 Streaming startet mit:", {
      contractId,
      optimizationsLength: optimizations.length,
      hasOriginalContent: !!originalContractText,
      originalContentLength: originalContractText?.length || 0,
      hasAnalysisData: !!analysisData
    });

    setIsStreaming(true);
    setProgress(0);
    setCurrentMessage('Bereite Smart Contract Generation vor...');
    setStreamingLogs([]);
    setResult(null);
    setError(null);
    setMetrics({
      optimizationsApplied: 0,
      totalOptimizations: optimizations.length,
      successRate: 0,
      generationTime: 0,
      pdfSize: 0
    });

    const startTime = Date.now();
    addLog("🚀 Ultra-Professional Contract Generator gestartet", 'info');

    try {
      // ✅ ENHANCED PAYLOAD WITH NEW PROPS + DEBUG
      const generatePayload = {
        optimizations: optimizations.map(opt => ({
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
          preserveLayout: true,
          streaming: true,
          detailedProgress: true,
          highQuality: true
        },
        // ✅ CRITICAL: Nutze originalen Contract-Text und Analysis-Daten
        sourceData: {
          originalFileName: contractName,
          originalContent: originalContractText || `Inhalt von ${contractName}`,
          analysisData: analysisData || {},
          contractType: 'employment_contract',
          frontend: 'ultra-professional-ui'
        }
      };

      console.log("🔥 Generate Payload FINAL:", {
        optimizationCount: generatePayload.optimizations.length,
        contractId: contractId,
        hasOriginalContent: !!originalContractText,
        originalContentLength: originalContractText?.length || 0,
        hasAnalysisData: !!analysisData,
        sourceDataKeys: Object.keys(generatePayload.sourceData),
        endpoint: `/api/contracts/${contractId}/generate-optimized-stream`
      });

      addLog(`📤 Sende Payload an Backend: ${optimizations.length} Optimierungen`, 'info');
      addLog(`📄 Original Content: ${originalContractText?.length || 0} Zeichen`, 'info');

      const response = await fetch(`/api/contracts/${contractId}/generate-optimized-stream`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        credentials: 'include',
        body: JSON.stringify(generatePayload)
      });

      console.log("🔥 Response Status:", response.status, response.statusText);
      addLog(`📡 Backend Response: ${response.status} ${response.statusText}`, response.ok ? 'success' : 'error');

      if (!response.ok) {
        const errorText = await response.text();
        console.log("🔥 ERROR Response Body:", errorText);
        addLog(`❌ Backend Error: ${errorText}`, 'error');
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        console.log("🔥 ERROR: No reader available");
        throw new Error("Streaming wird nicht unterstützt");
      }

      console.log("🔥 Starting to read stream...");
      addLog("📡 Streaming-Verbindung hergestellt", 'success');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) {
          console.log("🔥 Stream completed");
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              console.log("🔥 Stream Data:", data);
              
              if (data.progress !== undefined) {
                setProgress(data.progress);
                setCurrentMessage(data.message || '');
                
                // Add to streaming logs
                addLog(data.message || `Progress: ${data.progress}%`, 'progress', data.progress);

                // Update metrics
                if (data.successfulOptimizations !== undefined) {
                  setMetrics(prev => ({
                    ...prev,
                    optimizationsApplied: data.successfulOptimizations,
                    successRate: data.successRate || 0,
                    generationTime: Date.now() - startTime
                  }));
                }
              }
              
              if (data.complete) {
                console.log("🔥 Stream COMPLETE:", data);
                const finalResult: StreamingResult = {
                  success: true,
                  downloadUrl: data.result.downloadUrl,
                  filename: data.result.filename,
                  pdfSize: data.result.pdfSize,
                  successRate: data.result.successRate,
                  generationTime: data.result.generationTime || (Date.now() - startTime),
                  optimizationsApplied: data.result.optimizationsApplied,
                  message: data.result.message
                };

                setResult(finalResult);
                setMetrics(prev => ({
                  ...prev,
                  optimizationsApplied: finalResult.optimizationsApplied || prev.optimizationsApplied,
                  successRate: finalResult.successRate || prev.successRate,
                  generationTime: finalResult.generationTime || prev.generationTime,
                  pdfSize: finalResult.pdfSize || prev.pdfSize
                }));
                
                addLog(finalResult.message || "Smart Contract erfolgreich generiert!", 'success');
                setIsStreaming(false);

                // Call onComplete callback
                if (onComplete) {
                  console.log("🔥 Calling onComplete callback");
                  onComplete(finalResult);
                }
              }
              
              if (data.error) {
                console.log("🔥 Stream ERROR:", data);
                const errorResult: StreamingResult = {
                  success: false,
                  error: data.message || "Unbekannter Fehler"
                };

                setError(data.message || "Unbekannter Fehler");
                addLog(data.message || "Fehler aufgetreten", 'error');
                setIsStreaming(false);

                // Call onComplete with error
                if (onComplete) {
                  console.log("🔥 Calling onComplete with error");
                  onComplete(errorResult);
                }
              }
              
            } catch (parseError) {
              console.warn('🔥 Parse error:', parseError);
              addLog(`Parse Error: ${parseError}`, 'error');
            }
          }
        }
      }
      
    } catch (fetchError) {
      const error = fetchError as Error;
      console.log("🔥 Fetch ERROR:", error);
      const errorResult: StreamingResult = {
        success: false,
        error: error.message
      };

      setError(error.message);
      addLog(`Fetch Error: ${error.message}`, 'error');
      setIsStreaming(false);

      // Call onComplete with error
      if (onComplete) {
        console.log("🔥 Calling onComplete with fetch error");
        onComplete(errorResult);
      }
    }
  }, [contractId, optimizations, contractName, originalContractText, analysisData, onComplete, addLog]);

  const handleCancel = useCallback(() => {
    console.log("🔥 handleCancel aufgerufen");
    setIsStreaming(false);
    addLog("🛑 Generierung abgebrochen", 'info');
    if (onCancel) {
      onCancel();
    }
  }, [onCancel, addLog]);

  const reset = useCallback(() => {
    console.log("🔥 reset aufgerufen");
    setIsStreaming(false);
    setProgress(0);
    setCurrentMessage('');
    setStreamingLogs([]);
    setResult(null);
    setError(null);
    setMetrics({
      optimizationsApplied: 0,
      totalOptimizations: optimizations.length,
      successRate: 0,
      generationTime: 0,
      pdfSize: 0
    });
  }, [optimizations.length]);

  const downloadPDF = useCallback(() => {
    console.log("🔥 downloadPDF aufgerufen:", result?.downloadUrl);
    if (result?.downloadUrl) {
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = result.filename || 'optimized_contract.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addLog(`📥 PDF heruntergeladen: ${result.filename}`, 'success');
    }
  }, [result, addLog]);

  // ✅ Auto-start streaming when component mounts
  useEffect(() => {
    console.log("🔥 useEffect - Auto-start Check:", {
      contractId: !!contractId,
      optimizationsLength: optimizations.length,
      isStreaming,
      result: !!result,
      error: !!error,
      shouldAutoStart: !!(contractId && optimizations.length > 0 && !isStreaming && !result && !error)
    });

    if (contractId && optimizations.length > 0 && !isStreaming && !result && !error) {
      console.log("🔥 AUTO-START Streaming!");
      startStreaming();
    }
  }, [contractId, optimizations.length, isStreaming, result, error, startStreaming]);

  return (
    <div className={`${styles.streamingContainer} ${className || ''}`}>
      {/* 🔥 DEBUG INDICATOR - KOMPONENTE GELADEN */}
      <div style={{ 
        position: 'absolute', 
        top: '-40px', 
        left: '0', 
        background: 'lime', 
        color: 'black', 
        padding: '4px 8px', 
        borderRadius: '4px',
        fontSize: '11px',
        fontWeight: 'bold',
        zIndex: 99999
      }}>
        🔥 STREAMING UI GELADEN!
      </div>

      {/* ✅ ULTRA-PROFESSIONAL HEADER */}
      <motion.div 
        className={styles.header}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className={styles.headerContent}>
          <div className={styles.iconContainer}>
            <motion.div 
              className={styles.iconWrapper}
              animate={{ rotate: isStreaming ? 360 : 0 }}
              transition={{ duration: 2, repeat: isStreaming ? Infinity : 0, ease: "linear" }}
            >
              <Sparkles className={styles.headerIcon} />
            </motion.div>
          </div>
          <div className={styles.headerText}>
            <h2 className={styles.title}>Ultra-Professional Contract Generator</h2>
            <p className={styles.subtitle}>KI-gestützte Live-Optimierung mit Enterprise-Level Performance</p>
          </div>
        </div>

        {/* ✅ CANCEL/CLOSE BUTTON */}
        <motion.button
          onClick={isStreaming ? handleCancel : onCancel}
          className={styles.closeButton}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <X size={20} />
        </motion.button>
      </motion.div>

      {/* ✅ CONTRACT INFO CARD */}
      <motion.div 
        className={styles.contractCard}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className={styles.contractInfo}>
          <FileText className={styles.contractIcon} />
          <div className={styles.contractDetails}>
            <h3 className={styles.contractName}>{contractName}</h3>
            <p className={styles.contractId}>Contract ID: {contractId}</p>
            {originalContractText && (
              <p className={styles.contractSize}>
                Original Text: {Math.round(originalContractText.length / 1000)}k Zeichen
              </p>
            )}
          </div>
          <div className={styles.contractStats}>
            <div className={styles.statItem}>
              <span className={styles.statLabel}>Optimierungen</span>
              <span className={styles.statValue}>{optimizations.length}</span>
            </div>
          </div>
        </div>
        
        {/* ✅ METRICS DASHBOARD */}
        <div className={styles.metricsGrid}>
          <div className={`${styles.metricCard} ${styles.successMetric}`}>
            <div className={styles.metricHeader}>
              <CheckCircle className={styles.metricIcon} />
              <span className={styles.metricLabel}>Erfolgsrate</span>
            </div>
            <div className={styles.metricValue}>{metrics.successRate}%</div>
          </div>
          
          <div className={`${styles.metricCard} ${styles.progressMetric}`}>
            <div className={styles.metricHeader}>
              <TrendingUp className={styles.metricIcon} />
              <span className={styles.metricLabel}>Angewendet</span>
            </div>
            <div className={styles.metricValue}>{metrics.optimizationsApplied}/{metrics.totalOptimizations}</div>
          </div>
          
          <div className={`${styles.metricCard} ${styles.timeMetric}`}>
            <div className={styles.metricHeader}>
              <Clock className={styles.metricIcon} />
              <span className={styles.metricLabel}>Zeit</span>
            </div>
            <div className={styles.metricValue}>{Math.round(metrics.generationTime / 1000)}s</div>
          </div>
          
          <div className={`${styles.metricCard} ${styles.sizeMetric}`}>
            <div className={styles.metricHeader}>
              <Award className={styles.metricIcon} />
              <span className={styles.metricLabel}>PDF Size</span>
            </div>
            <div className={styles.metricValue}>{Math.round(metrics.pdfSize / 1024)}KB</div>
          </div>
        </div>
      </motion.div>

      {/* ✅ MAIN PROGRESS PANEL */}
      <motion.div 
        className={styles.progressPanel}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* ✅ PROGRESS SECTION */}
        {(isStreaming || progress > 0) && (
          <div className={styles.progressSection}>
            <div className={styles.progressHeader}>
              <h3 className={styles.progressTitle}>Live-Progress</h3>
              <span className={styles.progressPercentage}>{progress}%</span>
            </div>
            
            {/* ✅ ANIMATED PROGRESS BAR */}
            <div className={styles.progressBarContainer}>
              <motion.div 
                className={styles.progressBar}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
              <motion.div 
                className={styles.progressShine}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            
            {/* ✅ CURRENT MESSAGE */}
            <div className={styles.currentMessage}>
              {isStreaming && <Loader className={styles.loadingIcon} />}
              <span className={styles.messageText}>{currentMessage}</span>
            </div>
          </div>
        )}

        {/* ✅ ACTION BUTTONS */}
        <div className={styles.actionButtons}>
          {!isStreaming && !result && !error && (
            <motion.button
              onClick={startStreaming}
              className={`${styles.actionButton} ${styles.startButton}`}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Play className={styles.buttonIcon} />
              Smart Contract Generation starten
            </motion.button>
          )}
          
          {isStreaming && (
            <motion.button
              onClick={handleCancel}
              className={`${styles.actionButton} ${styles.cancelButton}`}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Pause className={styles.buttonIcon} />
              Abbrechen
            </motion.button>
          )}
          
          {result && (
            <motion.button
              onClick={downloadPDF}
              className={`${styles.actionButton} ${styles.downloadButton}`}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Download className={styles.buttonIcon} />
              Optimierten Vertrag herunterladen
            </motion.button>
          )}
          
          {(result || error) && (
            <motion.button
              onClick={reset}
              className={`${styles.actionButton} ${styles.resetButton}`}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <RotateCcw className={styles.buttonIcon} />
              Reset
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* ✅ SUCCESS RESULT */}
      <AnimatePresence>
        {result && (
          <motion.div 
            className={styles.resultCard}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
          >
            <div className={styles.resultHeader}>
              <div className={styles.successIcon}>
                <CheckCircle />
              </div>
              <div className={styles.resultText}>
                <h3 className={styles.resultTitle}>Generation erfolgreich abgeschlossen!</h3>
                <p className={styles.resultMessage}>{result.message}</p>
              </div>
            </div>
            
            <div className={styles.resultDetails}>
              <div className={styles.resultDetail}>
                <span className={styles.detailLabel}>Dateiname</span>
                <span className={styles.detailValue}>{result.filename}</span>
              </div>
              <div className={styles.resultDetail}>
                <span className={styles.detailLabel}>PDF Größe</span>
                <span className={styles.detailValue}>{Math.round((result.pdfSize || 0) / 1024)} KB</span>
              </div>
              <div className={styles.resultDetail}>
                <span className={styles.detailLabel}>Erfolgsrate</span>
                <span className={styles.detailValue}>{result.successRate}%</span>
              </div>
              <div className={styles.resultDetail}>
                <span className={styles.detailLabel}>Generation</span>
                <span className={styles.detailValue}>{Math.round((result.generationTime || 0) / 1000)}s</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ ERROR DISPLAY */}
      <AnimatePresence>
        {error && (
          <motion.div 
            className={styles.errorCard}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
          >
            <div className={styles.errorHeader}>
              <AlertCircle className={styles.errorIcon} />
              <div className={styles.errorText}>
                <h3 className={styles.errorTitle}>Fehler aufgetreten</h3>
                <p className={styles.errorMessage}>{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ✅ STREAMING LOGS */}
      <AnimatePresence>
        {streamingLogs.length > 0 && (
          <motion.div 
            className={styles.logsCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className={styles.logsHeader}>
              <h3 className={styles.logsTitle}>Live-Processing Log</h3>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className={styles.expandButton}
              >
                {isExpanded ? 'Minimieren' : 'Erweitern'}
              </button>
            </div>
            
            <div 
              ref={logContainerRef}
              className={`${styles.logsContainer} ${isExpanded ? styles.expanded : ''}`}
            >
              {streamingLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`${styles.logEntry} ${styles[`log${log.type.charAt(0).toUpperCase() + log.type.slice(1)}`]}`}
                >
                  <span className={styles.logTimestamp}>{log.timestamp}</span>
                  {log.progress && (
                    <span className={styles.logProgress}>{log.progress}%</span>
                  )}
                  <span className={styles.logMessage}>{log.message}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UltraProfessionalStreamingUI;