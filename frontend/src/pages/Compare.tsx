import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet";
import { 
  FileText, Download, ArrowRight, CheckCircle, AlertCircle, 
  RefreshCw, Upload, Info, PlusCircle, MinusCircle,
  Users, Briefcase, Building, Zap, Scale, AlertTriangle,
  Eye, EyeOff, Star, Award, ThumbsUp, ThumbsDown
} from "lucide-react";

// Enhanced types for better comparison structure
interface ComparisonDifference {
  category: string;
  section: string;
  contract1: string;
  contract2: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  impact: string;
  recommendation: string;
}

interface ContractAnalysis {
  strengths: string[];
  weaknesses: string[];
  riskLevel: 'low' | 'medium' | 'high';
  score: number;
}

interface ComparisonResult {
  differences: ComparisonDifference[];
  contract1Analysis: ContractAnalysis;
  contract2Analysis: ContractAnalysis;
  overallRecommendation: {
    recommended: 1 | 2;
    reasoning: string;
    confidence: number;
  };
  summary: string;
  categories: string[];
}

interface PremiumNoticeProps {
  className?: string;
}

const PremiumNotice: React.FC<PremiumNoticeProps> = ({ className }) => {
  return (
    <motion.div 
      className={`premium-notice ${className || ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="premium-icon">✨</div>
      <div className="premium-content">
        <h3>Premium-Funktion</h3>
        <p>
          Der Vertragsvergleich ist eine Premium-Funktion.
          Upgrade jetzt, um Verträge zu vergleichen und bessere Konditionen zu identifizieren.
        </p>
        <motion.button 
          className="upgrade-button"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Jetzt upgraden
        </motion.button>
      </div>
    </motion.div>
  );
};

// User Profile Selector Component
const UserProfileSelector: React.FC<{
  selectedProfile: string;
  onProfileChange: (profile: string) => void;
}> = ({ selectedProfile, onProfileChange }) => {
  const profiles = [
    {
      id: 'individual',
      name: 'Privatperson',
      icon: Users,
      description: 'Fokus auf Verbraucherrechte und einfache Sprache'
    },
    {
      id: 'freelancer',
      name: 'Freelancer',
      icon: Briefcase,
      description: 'Betonung auf Haftung, Zahlungsbedingungen und IP-Rechte'
    },
    {
      id: 'business',
      name: 'Unternehmen',
      icon: Building,
      description: 'Umfassende Analyse aller Geschäftsbedingungen'
    }
  ];

  return (
    <motion.div 
      className="profile-selector"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.5 }}
    >
      <h3>Vergleich optimiert für:</h3>
      <div className="profile-options">
        {profiles.map((profile) => {
          const IconComponent = profile.icon;
          return (
            <motion.button
              key={profile.id}
              className={`profile-option ${selectedProfile === profile.id ? 'active' : ''}`}
              onClick={() => onProfileChange(profile.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <IconComponent size={24} className="profile-icon" />
              <div className="profile-info">
                <span className="profile-name">{profile.name}</span>
                <span className="profile-description">{profile.description}</span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

// Contract Score Display Component
const ContractScore: React.FC<{
  title: string;
  analysis: ContractAnalysis;
  isRecommended: boolean;
}> = ({ title, analysis, isRecommended }) => {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return '#34c759';
      case 'medium': return '#ff9500';
      case 'high': return '#ff453a';
      default: return '#6e6e73';
    }
  };

  return (
    <motion.div 
      className={`contract-score ${isRecommended ? 'recommended' : ''}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="score-header">
        <h4>{title}</h4>
        {isRecommended && (
          <div className="recommended-badge">
            <Award size={16} />
            <span>Empfohlen</span>
          </div>
        )}
      </div>
      
      <div className="score-circle">
        <svg width="80" height="80" className="score-svg">
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke="#e8e8ed"
            strokeWidth="8"
          />
          <circle
            cx="40"
            cy="40"
            r="30"
            fill="none"
            stroke={getRiskColor(analysis.riskLevel)}
            strokeWidth="8"
            strokeDasharray={`${analysis.score * 1.88} 188`}
            strokeLinecap="round"
            transform="rotate(-90 40 40)"
          />
        </svg>
        <div className="score-text">
          <span className="score-number">{analysis.score}</span>
          <span className="score-label">/ 100</span>
        </div>
      </div>

      <div className="risk-indicator">
        <div className={`risk-badge risk-${analysis.riskLevel}`}>
          {analysis.riskLevel === 'low' && <CheckCircle size={16} />}
          {analysis.riskLevel === 'medium' && <AlertTriangle size={16} />}
          {analysis.riskLevel === 'high' && <AlertCircle size={16} />}
          <span>Risiko: {analysis.riskLevel === 'low' ? 'Niedrig' : analysis.riskLevel === 'medium' ? 'Mittel' : 'Hoch'}</span>
        </div>
      </div>

      <div className="analysis-details">
        <div className="strengths">
          <h5><ThumbsUp size={14} /> Stärken</h5>
          <ul>
            {analysis.strengths.slice(0, 3).map((strength, index) => (
              <li key={index}>{strength}</li>
            ))}
          </ul>
        </div>
        <div className="weaknesses">
          <h5><ThumbsDown size={14} /> Schwächen</h5>
          <ul>
            {analysis.weaknesses.slice(0, 3).map((weakness, index) => (
              <li key={index}>{weakness}</li>
            ))}
          </ul>
        </div>
      </div>
    </motion.div>
  );
};

// Side-by-Side Difference View Component
const DifferenceView: React.FC<{
  differences: ComparisonDifference[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  showSideBySide: boolean;
  onToggleView: () => void;
}> = ({ differences, selectedCategory, onCategoryChange, showSideBySide, onToggleView }) => {
  const categories = [...new Set(differences.map(d => d.category))];
  const filteredDifferences = selectedCategory === 'all' 
    ? differences 
    : differences.filter(d => d.category === selectedCategory);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return '#34c759';
      case 'medium': return '#ff9500';
      case 'high': return '#ff453a';
      case 'critical': return '#d70015';
      default: return '#6e6e73';
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'low': return CheckCircle;
      case 'medium': return AlertTriangle;
      case 'high': return AlertCircle;
      case 'critical': return AlertTriangle;
      default: return Info;
    }
  };

  return (
    <div className="difference-view">
      <div className="difference-header">
        <div className="category-filter">
          <select 
            value={selectedCategory} 
            onChange={(e) => onCategoryChange(e.target.value)}
            className="category-select"
          >
            <option value="all">Alle Kategorien</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        <motion.button
          className="view-toggle"
          onClick={onToggleView}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {showSideBySide ? <EyeOff size={16} /> : <Eye size={16} />}
          <span>{showSideBySide ? 'Liste' : 'Vergleich'}</span>
        </motion.button>
      </div>

      <div className={`differences-container ${showSideBySide ? 'side-by-side' : 'list-view'}`}>
        {filteredDifferences.map((diff, index) => {
          const SeverityIcon = getSeverityIcon(diff.severity);
          
          return (
            <motion.div
              key={index}
              className="difference-item"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
            >
              <div className="difference-header-item">
                <div className="section-info">
                  <span className="category-badge">{diff.category}</span>
                  <h4>{diff.section}</h4>
                </div>
                <div 
                  className="severity-badge"
                  style={{ backgroundColor: getSeverityColor(diff.severity) }}
                >
                  <SeverityIcon size={14} />
                  <span>{diff.severity}</span>
                </div>
              </div>

              {showSideBySide ? (
                <div className="side-by-side-content">
                  <div className="contract-column">
                    <h5>Vertrag 1</h5>
                    <div className="contract-text">{diff.contract1}</div>
                  </div>
                  <div className="vs-divider">VS</div>
                  <div className="contract-column">
                    <h5>Vertrag 2</h5>
                    <div className="contract-text">{diff.contract2}</div>
                  </div>
                </div>
              ) : (
                <div className="list-content">
                  <div className="impact">{diff.impact}</div>
                </div>
              )}

              <div className="recommendation">
                <Zap size={14} />
                <span>{diff.recommendation}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Main Enhanced Compare Component
export default function EnhancedCompare() {
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState('individual');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSideBySide, setShowSideBySide] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    analysis: true,
    differences: true,
    recommendation: true
  });

  const resultRef = useRef<HTMLDivElement>(null);
  const file1InputRef = useRef<HTMLInputElement>(null);
  const file2InputRef = useRef<HTMLInputElement>(null);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // 🚨 DEBUG: Component Render Log
  console.log("🚨 COMPONENT RENDER - Current isPremium state:", isPremium);

  useEffect(() => {
    const controller = new AbortController();

    const fetchStatus = async () => {
      try {
        console.log("🚀 Starting auth check...");
        
        const res = await fetch("/api/auth/me", {
          credentials: "include",
          signal: controller.signal,
        });

        console.log("📡 Response status:", res.status, res.statusText);
        
        if (!res.ok) throw new Error("Nicht authentifiziert");

        const data = await res.json();
        
        // 🎯 ULTRA-DETAILED DEBUG:
        console.log("🔍 RAW API DATA:", JSON.stringify(data, null, 2));
        
        const userData = data.user || data;
        console.log("👤 USER DATA:", JSON.stringify(userData, null, 2));
        
        const tests = {
          "userData.isPremium": userData.isPremium,
          "userData.subscriptionPlan": userData.subscriptionPlan,
          "userData.subscriptionActive": userData.subscriptionActive,
          "data.user?.isPremium": data.user?.isPremium,
          "data.user?.subscriptionPlan": data.user?.subscriptionPlan,
          "data.isPremium": data.isPremium
        };
        
        console.log("🧪 ALL TESTS:", tests);
        
        // Simple logic:
        const hasPremium = 
          userData.isPremium === true || 
          userData.subscriptionPlan === "premium" || 
          userData.subscriptionPlan === "business" ||
          userData.subscriptionActive === true;
        
        console.log("🎯 FINAL PREMIUM STATUS:", hasPremium);
        console.log("🎯 SETTING isPremium to:", hasPremium);
        
        setIsPremium(hasPremium);
        
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        console.error("❌ Auth check error:", err);
        setIsPremium(false);
      }
    };

    fetchStatus();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [result]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleSubmit = async () => {
    if (!file1 || !file2) {
      setNotification({
        message: "Bitte wähle zwei Verträge aus.",
        type: "error"
      });
      return;
    }

    setLoading(true);
    setResult(null);

    // PRODUCTION API CALL
    const formData = new FormData();
    formData.append("file1", file1);
    formData.append("file2", file2);
    formData.append("userProfile", userProfile);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Vergleich fehlgeschlagen");

      setResult(data);
      setNotification({
        message: "Vertragsvergleich erfolgreich durchgeführt!",
        type: "success"
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Vergleich.";
      setNotification({
        message: "Fehler: " + message,
        type: "error"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFile1(null);
    setFile2(null);
    setResult(null);
    setSelectedCategory('all');
  };

  const exportToPDF = () => {
    if (!result) return;
    
    // Enhanced PDF export with comparison results
    const element = document.createElement("div");
    element.innerHTML = `
      <div style="font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif; padding: 2rem; max-width: 800px; margin: 0 auto;">
        <h1 style="font-weight: 600; font-size: 2rem; margin-bottom: 1rem; color: #1d1d1f; text-align: center;">Vertragsvergleich</h1>
        <div style="text-align: center; margin-bottom: 2rem; padding: 1rem; background: #f5f5f7; border-radius: 12px;">
          <h2 style="color: #0071e3;">Empfehlung: Vertrag ${result.overallRecommendation.recommended}</h2>
          <p style="color: #6e6e73; margin: 0.5rem 0;">${result.overallRecommendation.reasoning}</p>
          <p style="color: #6e6e73; font-size: 0.9rem;">Vertrauen: ${result.overallRecommendation.confidence}%</p>
        </div>
        
        <div style="display: flex; gap: 2rem; margin-bottom: 2rem;">
          <div style="flex: 1; padding: 1rem; border: 1px solid #e8e8ed; border-radius: 12px;">
            <h3 style="color: #1d1d1f;">Vertrag 1 - Score: ${result.contract1Analysis.score}/100</h3>
            <p style="color: #34c759; margin: 0.5rem 0;"><strong>Stärken:</strong></p>
            <ul style="color: #6e6e73; margin: 0;">${result.contract1Analysis.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
          </div>
          <div style="flex: 1; padding: 1rem; border: 1px solid #e8e8ed; border-radius: 12px;">
            <h3 style="color: #1d1d1f;">Vertrag 2 - Score: ${result.contract2Analysis.score}/100</h3>
            <p style="color: #34c759; margin: 0.5rem 0;"><strong>Stärken:</strong></p>
            <ul style="color: #6e6e73; margin: 0;">${result.contract2Analysis.strengths.map(s => `<li>${s}</li>`).join('')}</ul>
          </div>
        </div>

        <h3 style="font-weight: 500; font-size: 1.4rem; margin-top: 2rem; color: #1d1d1f;">Wichtigste Unterschiede</h3>
        ${result.differences.map(diff => `
          <div style="margin: 1rem 0; padding: 1rem; border-left: 4px solid ${diff.severity === 'critical' ? '#d70015' : diff.severity === 'high' ? '#ff453a' : diff.severity === 'medium' ? '#ff9500' : '#34c759'}; background: #f9f9f9;">
            <h4 style="margin: 0 0 0.5rem; color: #1d1d1f;">${diff.section} (${diff.category})</h4>
            <p style="margin: 0; color: #6e6e73;">${diff.impact}</p>
            <p style="margin: 0.5rem 0 0; font-weight: 500; color: #0071e3;">${diff.recommendation}</p>
          </div>
        `).join('')}
        
        <div style="margin-top: 3rem; text-align: center; font-size: 0.9rem; color: #86868b;">
          Erstellt mit Contract AI - ${new Date().toLocaleDateString()}
        </div>
      </div>
    `;

    // Create and trigger download
    const link = document.createElement('a');
    link.download = `Vertragsvergleich_${new Date().toISOString().split('T')[0]}.html`;
    link.href = 'data:text/html,' + encodeURIComponent(element.innerHTML);
    link.click();
  };

  if (isPremium === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px', gap: '1rem', color: '#86868b' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid rgba(0, 113, 227, 0.1)', borderTopColor: '#0071e3', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <p>Lade...</p>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Verträge vergleichen & bessere Wahl treffen mit KI | Contract AI</title>
        <meta name="description" content="Vergleiche Verträge in Sekunden mit KI: Unterschiede sehen, Fairness prüfen & bessere Konditionen sichern. Jetzt schnell & einfach vergleichen!" />
        <meta name="keywords" content="Vertragsvergleich, Verträge vergleichen, Vertragsunterschiede, KI Vertragsanalyse, bessere Konditionen, Contract AI" />
        <link rel="canonical" href="https://contract-ai.de/compare" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Verträge vergleichen & bessere Wahl treffen mit KI | Contract AI" />
        <meta property="og:description" content="Vergleiche Verträge schnell & transparent mit KI. Unterschiede erkennen, Fairness prüfen & bessere Konditionen wählen. Jetzt ausprobieren!" />
        <meta property="og:url" content="https://contract-ai.de/compare" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Verträge vergleichen & bessere Wahl treffen mit KI | Contract AI" />
        <meta name="twitter:description" content="Vergleiche Verträge in Sekunden mit KI: Fairness prüfen, Unterschiede sehen & die beste Wahl treffen. Jetzt testen!" />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>

      <div style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", backgroundColor: 'white', minHeight: '100vh', color: '#1d1d1f' }}>
        <motion.div 
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
            <motion.h1 
              style={{ fontSize: '2.2rem', fontWeight: 600, margin: '0 0 0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', letterSpacing: '-0.02em', color: '#1d1d1f' }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <FileText size={28} style={{ color: '#0071e3' }} />
              Vertragsvergleich
            </motion.h1>
            <motion.p 
              style={{ fontSize: '1.1rem', fontWeight: 400, margin: '0', color: '#6e6e73', lineHeight: 1.5, maxWidth: '700px', marginLeft: 'auto', marginRight: 'auto' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Analysiere und vergleiche zwei Verträge mit KI-basierter Bewertung
              und erhalte eine professionelle Empfehlung
            </motion.p>
          </div>

          {!isPremium && <PremiumNotice />}

          <UserProfileSelector
            selectedProfile={userProfile}
            onProfileChange={setUserProfile}
          />

          <motion.div 
            style={{ marginBottom: '3rem' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', justifyContent: 'center' }}>
              <motion.div 
                style={{ 
                  background: 'white', 
                  borderRadius: '16px', 
                  border: `1px solid ${file1 ? '#0071e3' : '#e8e8ed'}`, 
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', 
                  padding: '2rem', 
                  width: '320px', 
                  height: '220px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: isPremium ? 'pointer' : 'not-allowed',
                  opacity: isPremium ? 1 : 0.7,
                  backgroundColor: file1 ? 'rgba(0, 113, 227, 0.03)' : 'white'
                }}
                whileHover={isPremium ? { y: -5, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)" } : {}}
                onClick={() => isPremium && file1InputRef.current?.click()}
                transition={{ duration: 0.3 }}
              >
                <input
                  ref={file1InputRef}
                  type="file"
                  accept="application/pdf"
                  disabled={!isPremium}
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && setFile1(e.target.files[0])}
                />
                
                {file1 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
                    <FileText size={32} style={{ color: '#0071e3', marginBottom: '1rem' }} />
                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 500, margin: '0 0 0.3rem', color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>{file1.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: '#6e6e73', margin: 0 }}>{(file1.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <CheckCircle size={20} style={{ position: 'absolute', top: 0, right: 0, color: '#34c759' }} />
                  </div>
                ) : (
                  <>
                    <Upload size={32} style={{ color: '#0071e3', marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem', color: '#1d1d1f' }}>Vertrag 1</h3>
                    <p style={{ fontSize: '0.95rem', color: '#6e6e73', margin: 0 }}>PDF auswählen</p>
                    {!isPremium && <span style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'linear-gradient(135deg, #facf0f, #fb8c00)', color: 'white', fontSize: '0.8rem', fontWeight: 500, padding: '0.3rem 0.8rem', borderRadius: '20px' }}>Premium</span>}
                  </>
                )}
              </motion.div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '48px', height: '48px', backgroundColor: '#f5f5f7', borderRadius: '50%' }}>
                <ArrowRight size={24} style={{ color: '#6e6e73' }} />
              </div>

              <motion.div 
                style={{ 
                  background: 'white', 
                  borderRadius: '16px', 
                  border: `1px solid ${file2 ? '#0071e3' : '#e8e8ed'}`, 
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)', 
                  padding: '2rem', 
                  width: '320px', 
                  height: '220px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  cursor: isPremium ? 'pointer' : 'not-allowed',
                  opacity: isPremium ? 1 : 0.7,
                  backgroundColor: file2 ? 'rgba(0, 113, 227, 0.03)' : 'white'
                }}
                whileHover={isPremium ? { y: -5, boxShadow: "0 10px 25px rgba(0, 0, 0, 0.08)" } : {}}
                onClick={() => isPremium && file2InputRef.current?.click()}
                transition={{ duration: 0.3 }}
              >
                <input
                  ref={file2InputRef}
                  type="file"
                  accept="application/pdf"
                  disabled={!isPremium}
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && setFile2(e.target.files[0])}
                />
                
                {file2 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', position: 'relative' }}>
                    <FileText size={32} style={{ color: '#0071e3', marginBottom: '1rem' }} />
                    <div style={{ textAlign: 'center', width: '100%' }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 500, margin: '0 0 0.3rem', color: '#1d1d1f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '90%' }}>{file2.name}</h3>
                      <p style={{ fontSize: '0.85rem', color: '#6e6e73', margin: 0 }}>{(file2.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <CheckCircle size={20} style={{ position: 'absolute', top: 0, right: 0, color: '#34c759' }} />
                  </div>
                ) : (
                  <>
                    <Upload size={32} style={{ color: '#0071e3', marginBottom: '1rem' }} />
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: '0 0 0.5rem', color: '#1d1d1f' }}>Vertrag 2</h3>
                    <p style={{ fontSize: '0.95rem', color: '#6e6e73', margin: 0 }}>PDF auswählen</p>
                    {!isPremium && <span style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'linear-gradient(135deg, #facf0f, #fb8c00)', color: 'white', fontSize: '0.8rem', fontWeight: 500, padding: '0.3rem 0.8rem', borderRadius: '20px' }}>Premium</span>}
                  </>
                )}
              </motion.div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem' }}>
              <motion.button
                style={{
                  backgroundColor: (!file1 || !file2 || loading || !isPremium) ? '#6e6e73' : '#0071e3',
                  color: 'white',
                  border: 'none',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  fontWeight: 500,
                  padding: '0.9rem 1.8rem',
                  borderRadius: '10px',
                  cursor: (!file1 || !file2 || loading || !isPremium) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.7rem',
                  minWidth: '200px',
                  opacity: (!file1 || !file2 || loading || !isPremium) ? 0.6 : 1
                }}
                onClick={handleSubmit}
                disabled={!file1 || !file2 || loading || !isPremium}
                whileHover={file1 && file2 && !loading && isPremium ? { scale: 1.02 } : {}}
                whileTap={file1 && file2 && !loading && isPremium ? { scale: 0.98 } : {}}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
              >
                {loading ? (
                  <>
                    <div style={{ width: '18px', height: '18px', border: '2px solid rgba(255, 255, 255, 0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: '0.3rem' }}></div>
                    <span>Wird analysiert...</span>
                  </>
                ) : (
                  <>
                    <FileText size={18} />
                    <span>Vergleich starten</span>
                  </>
                )}
              </motion.button>

              {(file1 || file2) && (
                <motion.button 
                  onClick={handleReset} 
                  style={{
                    backgroundColor: '#e8e8ed',
                    color: '#1d1d1f',
                    border: 'none',
                    fontFamily: 'inherit',
                    fontSize: '1rem',
                    fontWeight: 500,
                    padding: '0.9rem 1.8rem',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.7rem'
                  }}
                  whileHover={{ scale: 1.02, backgroundColor: '#d2d2d7' }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <RefreshCw size={16} />
                  <span>Zurücksetzen</span>
                </motion.button>
              )}
            </div>
          </motion.div>

          <AnimatePresence>
            {result && (
              <motion.div 
                ref={resultRef}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid #e8e8ed',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.08)',
                  marginTop: '2rem',
                  marginBottom: '3rem'
                }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem 2rem', borderBottom: '1px solid #e8e8ed' }}>
                  <h2 style={{ fontSize: '1.3rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>Vergleichsergebnis</h2>
                  <motion.button 
                    onClick={exportToPDF} 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.7rem 1.2rem',
                      borderRadius: '10px',
                      backgroundColor: '#f5f5f7',
                      color: '#1d1d1f',
                      border: 'none',
                      fontFamily: 'inherit',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      cursor: 'pointer'
                    }}
                    whileHover={{ scale: 1.02, backgroundColor: '#e8e8ed' }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Download size={16} />
                    <span>Als PDF speichern</span>
                  </motion.button>
                </div>

                {/* Contract Analysis Section */}
                <motion.div 
                  style={{ borderBottom: '1px solid #e8e8ed' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.4 }}
                >
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.2rem 2rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleSection('analysis')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#f5f5f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0071e3'
                      }}>
                        <Scale size={18} />
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>Vertragsbewertung</h3>
                    </div>
                    <button style={{ background: 'none', border: 'none', color: '#6e6e73', cursor: 'pointer' }}>
                      {expandedSections.analysis ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
                    </button>
                  </div>
                  {expandedSections.analysis && (
                    <div style={{ padding: '0 2rem 1.5rem' }}>
                      <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem' }}>
                        <ContractScore 
                          title="Vertrag 1"
                          analysis={result.contract1Analysis}
                          isRecommended={result.overallRecommendation.recommended === 1}
                        />
                        <ContractScore 
                          title="Vertrag 2"
                          analysis={result.contract2Analysis}
                          isRecommended={result.overallRecommendation.recommended === 2}
                        />
                      </div>
                      
                      <motion.div 
                        style={{
                          background: 'linear-gradient(135deg, #0071e3, #005bb5)',
                          color: 'white',
                          padding: '1.5rem',
                          borderRadius: '12px',
                          textAlign: 'center'
                        }}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                          <Star size={20} />
                          <h4 style={{ fontSize: '1.2rem', margin: 0 }}>Empfehlung: Vertrag {result.overallRecommendation.recommended}</h4>
                        </div>
                        <p style={{ margin: '0.5rem 0', opacity: 0.9 }}>{result.overallRecommendation.reasoning}</p>
                        <div style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                          Vertrauen: {result.overallRecommendation.confidence}%
                        </div>
                      </motion.div>
                    </div>
                  )}
                </motion.div>

                {/* Differences Section */}
                <motion.div 
                  style={{ borderBottom: '1px solid #e8e8ed' }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, duration: 0.4 }}
                >
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.2rem 2rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleSection('differences')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#f5f5f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0071e3'
                      }}>
                        <Info size={18} />
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>Unterschiede im Detail</h3>
                    </div>
                    <button style={{ background: 'none', border: 'none', color: '#6e6e73', cursor: 'pointer' }}>
                      {expandedSections.differences ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
                    </button>
                  </div>
                  {expandedSections.differences && (
                    <div style={{ padding: '0 2rem 1.5rem' }}>
                      <DifferenceView
                        differences={result.differences}
                        selectedCategory={selectedCategory}
                        onCategoryChange={setSelectedCategory}
                        showSideBySide={showSideBySide}
                        onToggleView={() => setShowSideBySide(!showSideBySide)}
                      />
                    </div>
                  )}
                </motion.div>

                {/* Summary Section */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.4 }}
                >
                  <div 
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1.2rem 2rem',
                      cursor: 'pointer'
                    }}
                    onClick={() => toggleSection('recommendation')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        backgroundColor: '#f5f5f7',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#0071e3'
                      }}>
                        <FileText size={18} />
                      </div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 600, margin: 0, color: '#1d1d1f' }}>Zusammenfassung</h3>
                    </div>
                    <button style={{ background: 'none', border: 'none', color: '#6e6e73', cursor: 'pointer' }}>
                      {expandedSections.recommendation ? <MinusCircle size={18} /> : <PlusCircle size={18} />}
                    </button>
                  </div>
                  {expandedSections.recommendation && (
                    <div style={{ padding: '0 2rem 1.5rem' }}>
                      <p style={{ margin: 0, lineHeight: 1.6, color: '#6e6e73' }}>{result.summary}</p>
                    </div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence>
            {notification && (
              <motion.div 
                style={{
                  position: 'fixed',
                  bottom: '2rem',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  padding: '1rem 1.5rem',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.8rem',
                  backdropFilter: 'blur(10px)',
                  zIndex: 100,
                  minWidth: '300px',
                  maxWidth: '90%',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                  backgroundColor: notification.type === 'success' ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                  border: `1px solid ${notification.type === 'success' ? 'rgba(52, 199, 89, 0.3)' : 'rgba(255, 69, 58, 0.3)'}`,
                  color: notification.type === 'success' ? '#34c759' : '#ff453a'
                }}
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {notification.type === "success" ? (
                  <CheckCircle size={18} style={{ flexShrink: 0 }} />
                ) : (
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                )}
                <span style={{ fontWeight: 500, flexGrow: 1 }}>{notification.message}</span>
                <button 
                  onClick={() => setNotification(null)} 
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'inherit',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    padding: '0.2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.8
                  }}
                >
                  ✕
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <style>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }

          .premium-notice {
            background: rgba(255, 255, 255, 0.8);
            backdrop-filter: blur(20px);
            border-radius: 16px;
            padding: 1.5rem 2rem;
            margin-bottom: 2.5rem;
            display: flex;
            align-items: center;
            gap: 1.5rem;
            border: 1px solid rgba(255, 255, 255, 0.4);
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.04);
            max-width: 800px;
            margin-left: auto;
            margin-right: auto;
          }

          .premium-icon {
            font-size: 2.5rem;
            color: #FFD700;
          }

          .premium-content {
            flex: 1;
          }

          .premium-content h3 {
            font-size: 1.3rem;
            font-weight: 600;
            margin: 0 0 0.8rem;
            color: #1d1d1f;
          }

          .premium-content p {
            font-size: 1rem;
            color: #6e6e73;
            margin: 0 0 1.2rem;
            line-height: 1.5;
          }

          .upgrade-button {
            background-color: #0071e3;
            color: white;
            border: none;
            padding: 0.7rem 1.5rem;
            border-radius: 20px;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .upgrade-button:hover {
            background-color: #005bb5;
          }

          .profile-selector {
            margin-bottom: 2rem;
            text-align: center;
          }

          .profile-selector h3 {
            font-size: 1.1rem;
            font-weight: 600;
            margin: 0 0 1rem;
            color: #1d1d1f;
          }

          .profile-options {
            display: flex;
            gap: 1rem;
            justify-content: center;
            flex-wrap: wrap;
          }

          .profile-option {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            padding: 1rem 1.5rem;
            border: 2px solid #e8e8ed;
            border-radius: 12px;
            background: white;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: 200px;
          }

          .profile-option:hover {
            border-color: #0071e3;
          }

          .profile-option.active {
            border-color: #0071e3;
            background: rgba(0, 113, 227, 0.05);
          }

          .profile-icon {
            color: #0071e3;
            flex-shrink: 0;
          }

          .profile-info {
            text-align: left;
          }

          .profile-name {
            display: block;
            font-weight: 600;
            color: #1d1d1f;
            margin-bottom: 0.2rem;
          }

          .profile-description {
            display: block;
            font-size: 0.85rem;
            color: #6e6e73;
            line-height: 1.3;
          }

          .contract-score {
            flex: 1;
            background: white;
            border: 2px solid #e8e8ed;
            border-radius: 16px;
            padding: 1.5rem;
            text-align: center;
            transition: all 0.3s ease;
          }

          .contract-score.recommended {
            border-color: #34c759;
            background: rgba(52, 199, 89, 0.02);
          }

          .score-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1rem;
          }

          .score-header h4 {
            margin: 0;
            color: #1d1d1f;
            font-size: 1.1rem;
            font-weight: 600;
          }

          .recommended-badge {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            background: #34c759;
            color: white;
            padding: 0.3rem 0.8rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: 500;
          }

          .score-circle {
            position: relative;
            width: 80px;
            height: 80px;
            margin: 0 auto 1rem;
          }

          .score-svg {
            transform: rotate(-90deg);
          }

          .score-text {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
          }

          .score-number {
            display: block;
            font-size: 1.4rem;
            font-weight: 600;
            color: #1d1d1f;
          }

          .score-label {
            font-size: 0.8rem;
            color: #6e6e73;
          }

          .risk-indicator {
            margin-bottom: 1rem;
          }

          .risk-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 500;
          }

          .risk-low {
            background: rgba(52, 199, 89, 0.1);
            color: #34c759;
          }

          .risk-medium {
            background: rgba(255, 149, 0, 0.1);
            color: #ff9500;
          }

          .risk-high {
            background: rgba(255, 69, 58, 0.1);
            color: #ff453a;
          }

          .analysis-details {
            text-align: left;
            display: flex;
            gap: 1rem;
          }

          .strengths, .weaknesses {
            flex: 1;
          }

          .analysis-details h5 {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            margin: 0 0 0.5rem;
            font-size: 0.9rem;
            font-weight: 600;
            color: #1d1d1f;
          }

          .analysis-details ul {
            margin: 0;
            padding-left: 1rem;
            list-style: none;
          }

          .analysis-details li {
            font-size: 0.8rem;
            color: #6e6e73;
            margin-bottom: 0.3rem;
            position: relative;
          }

          .analysis-details li:before {
            content: '•';
            color: #0071e3;
            position: absolute;
            left: -0.8rem;
          }

          .difference-view {
            width: 100%;
          }

          .difference-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 1.5rem;
            gap: 1rem;
          }

          .category-select {
            padding: 0.5rem 1rem;
            border: 1px solid #e8e8ed;
            border-radius: 8px;
            background: white;
            color: #1d1d1f;
            font-family: inherit;
            font-size: 0.9rem;
            cursor: pointer;
          }

          .view-toggle {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            border: 1px solid #e8e8ed;
            border-radius: 8px;
            background: white;
            color: #1d1d1f;
            font-family: inherit;
            font-size: 0.9rem;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .view-toggle:hover {
            background: #f5f5f7;
          }

          .differences-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .difference-item {
            border: 1px solid #e8e8ed;
            border-radius: 12px;
            padding: 1.5rem;
            background: white;
          }

          .difference-header-item {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            margin-bottom: 1rem;
            gap: 1rem;
          }

          .section-info {
            flex: 1;
          }

          .category-badge {
            display: inline-block;
            background: rgba(0, 113, 227, 0.1);
            color: #0071e3;
            padding: 0.2rem 0.6rem;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
            margin-bottom: 0.5rem;
          }

          .section-info h4 {
            margin: 0;
            color: #1d1d1f;
            font-size: 1rem;
            font-weight: 600;
          }

          .severity-badge {
            display: flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.4rem 0.8rem;
            border-radius: 20px;
            color: white;
            font-size: 0.8rem;
            font-weight: 500;
            text-transform: capitalize;
          }

          .side-by-side-content {
            display: grid;
            grid-template-columns: 1fr auto 1fr;
            gap: 1rem;
            align-items: center;
            margin-bottom: 1rem;
          }

          .contract-column {
            padding: 1rem;
            border: 1px solid #e8e8ed;
            border-radius: 8px;
            background: #f9f9f9;
          }

          .contract-column h5 {
            margin: 0 0 0.5rem;
            color: #1d1d1f;
            font-size: 0.9rem;
            font-weight: 600;
          }

          .contract-text {
            font-size: 0.85rem;
            color: #6e6e73;
            line-height: 1.4;
          }

          .vs-divider {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            background: #0071e3;
            color: white;
            border-radius: 50%;
            font-size: 0.8rem;
            font-weight: 600;
          }

          .list-content {
            margin-bottom: 1rem;
          }

          .impact {
            font-size: 0.9rem;
            color: #6e6e73;
            line-height: 1.4;
          }

          .recommendation {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.8rem;
            background: rgba(0, 113, 227, 0.05);
            border-radius: 8px;
            font-size: 0.9rem;
            color: #0071e3;
            font-weight: 500;
          }

          @media (max-width: 768px) {
            .profile-options {
              flex-direction: column;
              align-items: center;
            }

            .profile-option {
              min-width: auto;
              width: 100%;
              max-width: 300px;
            }

            .side-by-side-content {
              grid-template-columns: 1fr;
              gap: 0.5rem;
            }

            .vs-divider {
              display: none;
            }

            .difference-header {
              flex-direction: column;
              align-items: stretch;
            }

            .analysis-details {
              flex-direction: column;
              gap: 0.5rem;
            }
          }
        `}</style>
      </div>
    </>
  );
}