import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileText, AlertCircle, CheckCircle, Loader, 
  Download, BarChart3, RefreshCw, WifiOff, Clock,
  Shield, TrendingUp, Lightbulb, FileSearch,
  Wrench, ArrowRight, AlertTriangle,
  Award, Target, Zap
} from "lucide-react";
// ✅ KORRIGIERTER IMPORT - uploadAndOptimize hinzugefügt
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

export default function ContractAnalysis({ file, onReset }: ContractAnalysisProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [serviceHealth, setServiceHealth] = useState<boolean | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<string | null>(null);

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

  // ✅ KORRIGIERTE handleOptimize FUNKTION
  const handleOptimize = async () => {
    if (!result) return;
    
    setOptimizing(true);
    try {
      console.log("🔧 Starte Optimierung für:", file.name);
      
      const optimizeResponse = await uploadAndOptimize(file, 'Standardvertrag', (progress) => {
        // Optional: Progress anzeigen
        console.log(`🔧 Optimierung Progress: ${progress}%`);
      });
      
      console.log("✅ Optimierung-Response:", optimizeResponse);
      
      // Type-sichere Behandlung der Response
      if (optimizeResponse && typeof optimizeResponse === 'object' && 'optimizationResult' in optimizeResponse) {
        setOptimizationResult((optimizeResponse as any).optimizationResult);
        console.log("🎉 Optimierung erfolgreich abgeschlossen");
      } else {
        // Fallback für String-Response
        setOptimizationResult(String(optimizeResponse));
      }
    } catch (err) {
      console.error("❌ Optimierung fehlgeschlagen:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      
      // Benutzerfreundliche Fehlermeldung statt alert
      setError(`🔧 Optimierung fehlgeschlagen: ${errorMessage}`);
      
      // Optional: Optimierung-Error als separaten State
      // alert(`Optimierung fehlgeschlagen: ${errorMessage}`);
    } finally {
      setOptimizing(false);
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
    if (score >= 80) return <Award size={24} className="text-green-500" />;
    if (score >= 60) return <Target size={24} className="text-orange-500" />;
    if (score >= 40) return <AlertTriangle size={24} className="text-orange-600" />;
    return <AlertCircle size={24} className="text-red-500" />;
  };

  const formatTextToPoints = (text: string): string[] => {
    if (!text) return ['Keine Details verfügbar'];
    
    // Versuche, den Text in sinnvolle Punkte aufzuteilen
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length > 1) {
      return sentences.slice(0, 3).map(s => s.trim());
    }
    
    // Falls keine Sätze, versuche Absätze
    const paragraphs = text.split('\n').filter(p => p.trim().length > 10);
    if (paragraphs.length > 1) {
      return paragraphs.slice(0, 3).map(p => p.trim());
    }
    
    // Andernfalls den Text aufteilen nach ca. 150 Zeichen
    const words = text.split(' ');
    const points = [];
    let currentPoint = '';
    
    for (const word of words) {
      if (currentPoint.length + word.length > 150 && currentPoint.length > 50) {
        points.push(currentPoint.trim());
        currentPoint = word;
      } else {
        currentPoint += (currentPoint ? ' ' : '') + word;
      }
      
      if (points.length >= 3) break;
    }
    
    if (currentPoint && points.length < 3) {
      points.push(currentPoint.trim());
    }
    
    return points.length > 0 ? points : [text.substring(0, 200) + '...'];
  };

  const canRetryAnalysis = error && retryCount < 3 && !error.includes('Limit erreicht');

  // Score Circle Component
  const ScoreCircle = ({ score }: { score: number }) => {
    const circumference = 2 * Math.PI * 45;
    const strokeDasharray = circumference;
    const strokeDashoffset = circumference - (score / 100) * circumference;
    
    return (
      <div className="relative w-32 h-32 mx-auto">
        <svg className="transform -rotate-90 w-32 h-32">
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
            transition={{ duration: 1, ease: "easeInOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-gray-900">{score}</div>
          <div className="text-xs text-gray-500 font-medium">von 100</div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 border-b border-gray-100">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FileText size={24} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-1">{file.name}</h3>
              <p className="text-sm text-gray-600">
                {(file.size / 1024 / 1024).toFixed(2)} MB
                {serviceHealth === false && (
                  <span className="ml-2 inline-flex items-center gap-1 text-red-500">
                    <WifiOff size={12} />
                    Service nicht verfügbar
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {!result && !analyzing && (
              <motion.button 
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50"
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
              <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-600 rounded-xl">
                <Loader size={18} className="animate-spin" />
                <span>Analysiere... {progress}%</span>
              </div>
            )}
            
            <button 
              className="flex items-center gap-2 px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
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
          className="p-6 bg-gray-50 border-b border-gray-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-4">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <motion.div 
                className="h-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          
          <div className="text-center mb-4">
            <p className="text-gray-700 font-medium">
              {progress < 30 && "📄 PDF wird verarbeitet..."}
              {progress >= 30 && progress < 70 && "🤖 KI-Analyse läuft..."}
              {progress >= 70 && progress < 100 && "📊 Bewertung wird erstellt..."}
              {progress === 100 && "✅ Analyse abgeschlossen!"}
            </p>
          </div>
          
          <div className="flex justify-center gap-8">
            {[
              { icon: "🔍", text: "Text extrahieren", threshold: 10 },
              { icon: "🤖", text: "KI-Analyse", threshold: 30 },
              { icon: "📊", text: "Bewertung erstellen", threshold: 70 }
            ].map((step, index) => (
              <div key={index} className={`flex items-center gap-2 text-sm ${progress >= step.threshold ? 'text-blue-600' : 'text-gray-400'}`}>
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
          className="p-6 bg-red-50 border-b border-red-100"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              {error.includes('Verbindung') ? <WifiOff size={24} className="text-red-500" /> : 
               error.includes('Timeout') ? <Clock size={24} className="text-red-500" /> : 
               <AlertCircle size={24} className="text-red-500" />}
            </div>
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-red-900 mb-2">
                {error.includes('🔧 Optimierung') ? 'Optimierung fehlgeschlagen' : 'Analyse fehlgeschlagen'}
              </h4>
              <p className="text-red-700 mb-4">{error}</p>
              
              {canRetryAnalysis && !error.includes('🔧 Optimierung') && (
                <div className="space-y-3">
                  <button 
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                  >
                    <RefreshCw size={16} />
                    <span>Erneut versuchen ({3 - retryCount} Versuche übrig)</span>
                  </button>
                  <p className="text-sm text-red-600">
                    {error.includes('Verbindung') && "Prüfe deine Internetverbindung"}
                    {error.includes('überlastet') && "Der Server ist überlastet - versuche es in wenigen Sekunden erneut"}
                    {error.includes('Timeout') && "Versuche es mit einer kleineren PDF-Datei"}
                  </p>
                </div>
              )}

              {!canRetryAnalysis && retryCount >= 3 && (
                <div className="space-y-2">
                  <p className="text-red-800 font-medium">❌ Maximale Anzahl Versuche erreicht.</p>
                  <button 
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
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
          className="p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Success Header */}
          <div className="flex items-center justify-between mb-6 pb-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <CheckCircle size={28} className="text-green-500" />
              <div>
                <h4 className="text-2xl font-bold text-gray-900">Analyse abgeschlossen</h4>
                <p className="text-gray-600">Rechtssichere Vertragseinschätzung in Sekunden</p>
              </div>
            </div>
            {result.requestId && (
              <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded">
                ID: {result.requestId}
              </span>
            )}
          </div>

          {/* Contract Score */}
          {result.contractScore && (
            <div className="bg-gradient-to-br from-gray-50 to-blue-50 rounded-2xl p-8 mb-8 text-center">
              <div className="mb-4">
                <h5 className="text-lg font-semibold text-gray-700 mb-2">Contract Score</h5>
                <ScoreCircle score={result.contractScore} />
              </div>
              
              <div className="flex items-center justify-center gap-2 mb-3">
                {getScoreIcon(result.contractScore)}
                <span className={`text-xl font-bold`} style={{ color: getScoreColor(result.contractScore) }}>
                  {getScoreLabel(result.contractScore)}
                </span>
              </div>
              
              <p className="text-sm text-gray-600 max-w-md mx-auto">
                {result.contractScore >= 80 && "Dieser Vertrag bietet eine sehr gute Rechtssicherheit und faire Konditionen."}
                {result.contractScore >= 60 && result.contractScore < 80 && "Dieser Vertrag ist grundsätzlich in Ordnung, hat aber Verbesserungspotential."}
                {result.contractScore >= 40 && result.contractScore < 60 && "Dieser Vertrag weist einige Schwächen auf und sollte überprüft werden."}
                {result.contractScore < 40 && "Dieser Vertrag enthält kritische Punkte und sollte dringend überarbeitet werden."}
              </p>
            </div>
          )}

          {/* Analysis Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Zusammenfassung */}
            {result.summary && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileSearch size={20} className="text-blue-600" />
                  </div>
                  <h5 className="text-lg font-semibold text-gray-900">Zusammenfassung</h5>
                </div>
                <div className="space-y-2">
                  {formatTextToPoints(result.summary).map((point, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-gray-700 text-sm leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rechtssicherheit */}
            {result.legalAssessment && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Shield size={20} className="text-green-600" />
                  </div>
                  <h5 className="text-lg font-semibold text-gray-900">Rechtssicherheit</h5>
                </div>
                <div className="space-y-2">
                  {formatTextToPoints(result.legalAssessment).map((point, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-gray-700 text-sm leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optimierungsvorschläge */}
            {result.suggestions && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Lightbulb size={20} className="text-yellow-600" />
                  </div>
                  <h5 className="text-lg font-semibold text-gray-900">Optimierungsvorschläge</h5>
                </div>
                <div className="space-y-2">
                  {formatTextToPoints(result.suggestions).map((point, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                      <p className="text-gray-700 text-sm leading-relaxed">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Marktvergleich */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp size={20} className="text-purple-600" />
                </div>
                <h5 className="text-lg font-semibold text-gray-900">Marktvergleich</h5>
              </div>
              <div className="space-y-2">
                {result.comparison ? formatTextToPoints(result.comparison).map((point, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                    <p className="text-gray-700 text-sm leading-relaxed">{point}</p>
                  </div>
                )) : (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-600 text-sm">
                      Es wurden keine konkreten Alternativangebote erkannt. Für genauere Vergleiche können Sie den Vertragstyp spezifizieren oder unsere Optimierungsfunktion nutzen.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Usage Info */}
          {result.usage && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
              <p className="text-blue-800 text-sm">
                📊 Analyse <strong>{result.usage.count}</strong> von <strong>{result.usage.limit === Infinity ? '∞' : result.usage.limit}</strong>
                <span className="inline-block ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full font-medium">
                  {result.usage.plan}
                </span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            {/* Optimize Button - Prominently placed */}
            <motion.button 
              className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              onClick={handleOptimize}
              disabled={optimizing}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {optimizing ? (
                <>
                  <Loader size={20} className="animate-spin" />
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
            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors">
                <Download size={18} />
                <span>PDF herunterladen</span>
              </button>
              <button 
                className="flex items-center gap-2 px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                onClick={onReset}
              >
                <FileText size={18} />
                <span>Neue Analyse</span>
              </button>
            </div>
          </div>

          {/* Optimization Result */}
          {optimizationResult && (
            <motion.div 
              className="mt-8 p-6 bg-green-50 border border-green-200 rounded-xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-4">
                <Zap size={24} className="text-green-600" />
                <h5 className="text-lg font-semibold text-green-900">Optimierungsvorschlag</h5>
              </div>
              <div className="prose max-w-none text-gray-700">
                {optimizationResult}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}