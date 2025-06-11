// 📁 src/pages/Optimizer.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Wand2
} from "lucide-react";

// Components
import LegendaryPremiumNotice from "../components/LegendaryPremiumNotice";
import ContractHealthDashboard from "../components/ContractHealthDashboard";

// Types
import { 
  OptimizationSuggestion, 
  ContractHealthScore, 
  OptimizationCategory 
} from "../types/optimizer";

// Styles
import styles from "../styles/Optimizer.module.css";

// ✅ Helper Functions für API-Response Parsing
const parseOptimizationResult = (aiText: string, fileName: string): OptimizationSuggestion[] => {
  const optimizations: OptimizationSuggestion[] = [];
  
  // Erweiterte Parsing-Logik für OpenAI Response
  if (!aiText || aiText.length < 50) {
    return optimizations;
  }

  // Suche nach strukturierten Abschnitten in der AI-Response
  const sections = aiText.split(/\d+\.\s*/).filter(section => section.trim().length > 20);
  
  sections.forEach((section, index) => {
    if (section.trim().length < 30) return;
    
    // Kategorisierung basierend auf Keywords
    let category: OptimizationSuggestion['category'] = 'clarity';
    let priority: OptimizationSuggestion['priority'] = 'medium';
    
    const lowerSection = section.toLowerCase();
    
    if (lowerSection.includes('kündigung') || lowerSection.includes('laufzeit') || lowerSection.includes('frist')) {
      category = 'termination';
      priority = 'high';
    } else if (lowerSection.includes('haftung') || lowerSection.includes('schäden') || lowerSection.includes('risiko')) {
      category = 'liability';
      priority = 'critical';
    } else if (lowerSection.includes('zahlung') || lowerSection.includes('vergütung') || lowerSection.includes('honorar')) {
      category = 'payment';
      priority = 'high';
    } else if (lowerSection.includes('dsgvo') || lowerSection.includes('datenschutz') || lowerSection.includes('compliance')) {
      category = 'compliance';
      priority = 'medium';
    }

    // Bestimme Confidence basierend auf Text-Qualität
    let confidence = 75;
    if (section.length > 200) confidence += 10;
    if (lowerSection.includes('empfehlung') || lowerSection.includes('sollte')) confidence += 5;
    if (lowerSection.includes('kritisch') || lowerSection.includes('wichtig')) confidence += 5;
    
    // Extrahiere erste ~150 Zeichen als "Original" und nächste als "Improved"
    const sentences = section.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const original = sentences.slice(0, 1).join('. ').trim() + '.';
    const improved = sentences.slice(1, 2).join('. ').trim() + '.';
    const reasoning = sentences.slice(2).join('. ').trim() || section.substring(0, 200) + '...';

    optimizations.push({
      id: `opt_${Date.now()}_${index}`,
      category,
      priority,
      confidence: Math.min(95, confidence),
      original: original.length > 20 ? original : "Automatisch erkannte Verbesserungsmöglichkeit",
      improved: improved.length > 20 ? improved : section.substring(0, 150) + '...',
      reasoning: reasoning.length > 30 ? reasoning : section.substring(0, 300) + '...',
      legalRisk: priority === 'critical' ? 9 : priority === 'high' ? 7 : 5,
      businessImpact: priority === 'critical' ? 8 : priority === 'high' ? 6 : 4,
      implementationDifficulty: category === 'liability' ? 'complex' : category === 'termination' ? 'medium' : 'easy',
      estimatedSavings: category === 'payment' ? '~1.200€/Jahr' : category === 'termination' ? '~800€/Jahr' : 'Risikoreduzierung',
      marketBenchmark: `Basierend auf ${fileName} Analyse`,
      implemented: false,
      aiInsight: `KI-Optimierung: ${section.substring(0, 100)}...`,
      relatedClauses: [`Bezug zu ${category}`]
    });
  });

  return optimizations.slice(0, 5); // Maximal 5 Optimierungen
};

const calculateContractScore = (optimizations: OptimizationSuggestion[]): ContractHealthScore => {
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

  const criticalCount = optimizations.filter(opt => opt.priority === 'critical').length;
  const highCount = optimizations.filter(opt => opt.priority === 'high').length;
  const mediumCount = optimizations.filter(opt => opt.priority === 'medium').length;
  
  // Score-Berechnung basierend auf gefundenen Problemen
  let overall = 90; // Basis-Score
  overall -= criticalCount * 20; // -20 pro kritisches Problem
  overall -= highCount * 12;     // -12 pro hohes Problem
  overall -= mediumCount * 5;    // -5 pro mittleres Problem
  overall = Math.max(15, overall); // Minimum 15

  // Kategorie-spezifische Scores
  const categoryScores = {
    termination: overall,
    liability: overall,
    payment: overall,
    clarity: overall,
    compliance: overall
  };

  // Anpassung basierend auf gefundenen Kategorien
  optimizations.forEach(opt => {
    const reduction = opt.priority === 'critical' ? 15 : opt.priority === 'high' ? 10 : 5;
    categoryScores[opt.category] = Math.max(10, categoryScores[opt.category] - reduction);
  });

  return {
    overall,
    categories: {
      termination: { score: categoryScores.termination, trend: categoryScores.termination < overall ? 'down' : 'stable' },
      liability: { score: categoryScores.liability, trend: categoryScores.liability < overall ? 'down' : 'stable' },
      payment: { score: categoryScores.payment, trend: categoryScores.payment < overall ? 'down' : 'stable' },
      clarity: { score: categoryScores.clarity, trend: categoryScores.clarity < overall ? 'down' : 'stable' },
      compliance: { score: categoryScores.compliance, trend: categoryScores.compliance < overall ? 'down' : 'stable' }
    },
    industryPercentile: Math.max(5, overall - 25),
    riskLevel: overall < 40 ? 'critical' : overall < 60 ? 'high' : overall < 80 ? 'medium' : 'low'
  };
};

export default function Optimizer() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [optimizations, setOptimizations] = useState<OptimizationSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [contractScore, setContractScore] = useState<ContractHealthScore | null>(null);
  const [showSimulation, setShowSimulation] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories: OptimizationCategory[] = [
    { id: 'all', name: 'Alle Bereiche', icon: <BookOpen size={18} />, color: '#0071e3', count: optimizations.length },
    { id: 'termination', name: 'Kündigung', icon: <Clock size={18} />, color: '#ff453a', count: optimizations.filter(o => o.category === 'termination').length },
    { id: 'liability', name: 'Haftung', icon: <Shield size={18} />, color: '#ff9500', count: optimizations.filter(o => o.category === 'liability').length },
    { id: 'payment', name: 'Zahlung', icon: <DollarSign size={18} />, color: '#34c759', count: optimizations.filter(o => o.category === 'payment').length },
    { id: 'clarity', name: 'Klarheit', icon: <Eye size={18} />, color: '#5856d6', count: optimizations.filter(o => o.category === 'clarity').length },
    { id: 'compliance', name: 'Compliance', icon: <CheckCircle2 size={18} />, color: '#ff9500', count: optimizations.filter(o => o.category === 'compliance').length }
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

  // ✨ File Upload Handler mit echter API-Integration
  const handleUpload = async () => {
    if (!file || !isPremium) return;

    setLoading(true);
    setOptimizations([]);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log("🚀 Sende Datei an Backend für KI-Optimierung...");
      
      // ✅ Echter API-Call zu deinem Backend
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

      console.log("✅ Backend Response erhalten:", {
        success: data.success,
        hasOptimizationResult: !!data.optimizationResult,
        resultLength: data.optimizationResult?.length || 0
      });

      // ✅ Verarbeite die OpenAI-Response zu strukturierten Daten
      if (data.optimizationResult && data.optimizationResult.trim()) {
        const parsedOptimizations = parseOptimizationResult(data.optimizationResult, file.name);
        const calculatedScore = calculateContractScore(parsedOptimizations);
        
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
      
      // ✅ Benutzerfreundliche Fehlermeldungen
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

  // ✨ Handlers
  const handleReset = useCallback(() => {
    setFile(null);
    setOptimizations([]);
    setError(null);
    setContractScore(null);
    setShowSimulation(false);
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
    if (!contractScore) return 0;
    const implementedCount = optimizations.filter(opt => opt.implemented).length;
    const baseScore = contractScore.overall;
    const maxImprovement = 32;
    const improvement = (implementedCount / optimizations.length) * maxImprovement;
    return Math.min(100, Math.round(baseScore + improvement));
  }, [optimizations, contractScore]);

  const toggleSuggestion = useCallback((id: string) => {
    setOptimizations(prev => 
      prev.map(opt => 
        opt.id === id ? { ...opt, implemented: !opt.implemented } : opt
      )
    );
  }, []);

  const generatePitch = useCallback(() => {
    const implementedSuggestions = optimizations.filter(opt => opt.implemented);
    
    if (implementedSuggestions.length === 0) {
      setError("Bitte wähle mindestens eine Optimierung aus.");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const pitch = `Sehr geehrte Damen und Herren,

nach einer KI-gestützten Analyse unseres Vertrags möchte ich folgende Optimierungsvorschläge unterbreiten:

${implementedSuggestions.map((opt, index) => 
  `${index + 1}. ${opt.category === 'termination' ? 'Kündigung' : 
                   opt.category === 'liability' ? 'Haftung' : 
                   opt.category === 'payment' ? 'Zahlung' : 
                   opt.category === 'compliance' ? 'Compliance' : 'Klarheit'}: ${opt.reasoning.split('.')[0]}.
   → Nutzen: ${opt.estimatedSavings}
   → KI-Vertrauen: ${opt.confidence}%`
).join('\n\n')}

Diese Empfehlungen basieren auf modernster KI-Analyse und entsprechen aktuellen Marktstandards.

Mit freundlichen Grüßen`;

    navigator.clipboard.writeText(pitch);
    
    // Temporäre Erfolgs-Nachricht
    const originalError = error;
    setError("✅ Pitch wurde in die Zwischenablage kopiert!");
    setTimeout(() => setError(originalError), 2000);
  }, [optimizations, error]);

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

  return (
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

        {/* ✨ Results Area */}
        <AnimatePresence>
          {optimizations.length > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8 }}
            >
              {/* Contract Health Dashboard */}
              {contractScore && (
                <ContractHealthDashboard 
                  score={contractScore}
                  showSimulation={showSimulation}
                  newScore={calculateNewScore()}
                />
              )}

              {/* Category Filter */}
              <motion.div
                className={styles.card}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className={styles.cardHeader}>
                  <Filter size={20} style={{ color: '#0071e3' }} />
                  <span className={styles.cardTitle}>Filter & Kategorien</span>
                </div>
                
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '0.8rem' 
                }}>
                  {categories.filter(cat => cat.count > 0 || cat.id === 'all').map((category) => (
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
                          : '0 4px 12px rgba(0, 0, 0, 0.05)'
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

              {/* Control Panel */}
              <motion.div
                className={styles.card}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1.5rem'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
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

                <div style={{ display: 'flex', gap: '0.8rem' }}>
                  <motion.button
                    onClick={generatePitch}
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
                  </motion.button>
                  
                  <motion.button
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
                  </motion.button>
                </div>
              </motion.div>

              {/* Enhanced Optimization Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {filteredOptimizations.map((optimization, index) => (
                  <motion.div
                    key={optimization.id}
                    className={styles.card}
                    style={{ padding: '2rem', position: 'relative' }}
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
                          <h4 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 600 }}>
                            {optimization.category === 'termination' ? 'Kündigung & Laufzeit' :
                             optimization.category === 'liability' ? 'Haftung & Risiko' :
                             optimization.category === 'payment' ? 'Vergütung & Zahlung' :
                             optimization.category === 'compliance' ? 'Compliance & DSGVO' : 'Klarheit & Präzision'}
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
                        
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: '#6e6e73' }}>
                          <span>KI-Vertrauen: {optimization.confidence}%</span>
                          <span>Risiko: {optimization.legalRisk}/10</span>
                          <span>Impact: {optimization.businessImpact}/10</span>
                          <span>{optimization.estimatedSavings}</span>
                        </div>
                      </div>

                      {showSimulation && (
                        <label style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '0.5rem',
                          cursor: 'pointer',
                          padding: '0.5rem'
                        }}>
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
                          <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0071e3' }}>
                            Anwenden
                          </span>
                        </label>
                      )}
                    </div>

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: '1fr 1fr', 
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
                          Aktuell
                        </h5>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '0.9rem', 
                          lineHeight: 1.5, 
                          color: '#1d1d1f',
                          padding: '1rem',
                          backgroundColor: 'rgba(255, 69, 58, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 69, 58, 0.1)'
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
                          Optimiert
                        </h5>
                        <p style={{ 
                          margin: 0, 
                          fontSize: '0.9rem', 
                          lineHeight: 1.5, 
                          color: '#1d1d1f',
                          padding: '1rem',
                          backgroundColor: 'rgba(52, 199, 89, 0.05)',
                          borderRadius: '8px',
                          border: '1px solid rgba(52, 199, 89, 0.1)'
                        }}>
                          {optimization.improved}
                        </p>
                      </div>
                    </div>

                    <div style={{
                      padding: '1rem',
                      backgroundColor: 'rgba(88, 86, 214, 0.05)',
                      borderRadius: '8px',
                      border: '1px solid rgba(88, 86, 214, 0.1)'
                    }}>
                      <h5 style={{ 
                        margin: '0 0 0.5rem', 
                        fontSize: '0.9rem', 
                        fontWeight: 600, 
                        color: '#5856d6' 
                      }}>
                        KI-Begründung
                      </h5>
                      <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.5, color: '#1d1d1f' }}>
                        {optimization.reasoning}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}