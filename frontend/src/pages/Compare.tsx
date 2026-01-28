import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  FileText, Download, ArrowRight, CheckCircle, AlertCircle,
  RefreshCw, Upload, Info, PlusCircle, MinusCircle,
  Users, Briefcase, Building, Zap, Scale, AlertTriangle,
  Eye, EyeOff, Star, Award, ThumbsUp, ThumbsDown,
  GitCompare, FileCheck, Trophy, Layers,
  ChevronUp, ChevronDown, History, Trash2, X
} from "lucide-react";
import UnifiedPremiumNotice from "../components/UnifiedPremiumNotice";
import { WelcomePopup } from "../components/Tour";
import { PageHeader } from "../components/PageHeader";

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

// PremiumNotice Wrapper entfernt - verwende UnifiedPremiumNotice direkt mit variant="fullWidth"

// 🎯 Premium Comparison Mode Selector Component
const ComparisonModeSelector: React.FC<{
  selectedMode: string;
  onModeChange: (mode: string) => void;
}> = ({ selectedMode, onModeChange }) => {
  const modes = [
    {
      id: 'standard',
      name: 'Standard',
      icon: Scale,
      description: 'Allgemeiner Vergleich',
      color: '#0071e3',
      gradient: 'linear-gradient(135deg, #0071e3 0%, #00c7be 100%)'
    },
    {
      id: 'version',
      name: 'Versionen',
      icon: GitCompare,
      description: 'Alt vs. Neu',
      color: '#5856d6',
      gradient: 'linear-gradient(135deg, #5856d6 0%, #af52de 100%)'
    },
    {
      id: 'bestPractice',
      name: 'Best Practice',
      icon: FileCheck,
      description: 'Standards prüfen',
      color: '#34c759',
      gradient: 'linear-gradient(135deg, #34c759 0%, #30d158 100%)'
    },
    {
      id: 'competition',
      name: 'Anbieter',
      icon: Trophy,
      description: 'Angebote vergleichen',
      color: '#ff9500',
      gradient: 'linear-gradient(135deg, #ff9500 0%, #ff6b00 100%)'
    }
  ];

  return (
    <motion.div
      className="premium-mode-selector"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.5 }}
    >
      <div className="selector-header">
        <span className="selector-label">Vergleichs-Modus</span>
      </div>
      <div className="mode-chips">
        {modes.map((mode, index) => {
          const IconComponent = mode.icon;
          const isActive = selectedMode === mode.id;
          return (
            <motion.button
              key={mode.id}
              className={`mode-chip ${isActive ? 'active' : ''}`}
              onClick={() => onModeChange(mode.id)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)' }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: isActive ? mode.gradient : 'rgba(255, 255, 255, 0.9)',
                boxShadow: isActive
                  ? `0 4px 20px ${mode.color}40, 0 0 0 1px ${mode.color}30`
                  : '0 2px 8px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div
                className="chip-icon-wrapper"
                style={{
                  background: isActive ? 'rgba(255, 255, 255, 0.25)' : `${mode.color}15`,
                }}
              >
                <IconComponent
                  size={18}
                  style={{ color: isActive ? 'white' : mode.color }}
                />
              </div>
              <div className="chip-content">
                <span className="chip-name" style={{ color: isActive ? 'white' : '#1d1d1f' }}>
                  {mode.name}
                </span>
                <span className="chip-description" style={{ color: isActive ? 'rgba(255,255,255,0.8)' : '#86868b' }}>
                  {mode.description}
                </span>
              </div>
              {isActive && (
                <motion.div
                  className="chip-check"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                >
                  <CheckCircle size={16} style={{ color: 'white' }} />
                </motion.div>
              )}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
};

// Premium User Profile Selector Component
const UserProfileSelector: React.FC<{
  selectedProfile: string;
  onProfileChange: (profile: string) => void;
}> = ({ selectedProfile, onProfileChange }) => {
  const profiles = [
    {
      id: 'individual',
      name: 'Privatperson',
      icon: Users,
      description: 'Verbraucherrechte',
      color: '#00c7be'
    },
    {
      id: 'freelancer',
      name: 'Freelancer',
      icon: Briefcase,
      description: 'Haftung & IP',
      color: '#5856d6'
    },
    {
      id: 'business',
      name: 'Unternehmen',
      icon: Building,
      description: 'Vollständige Analyse',
      color: '#0071e3'
    }
  ];

  return (
    <motion.div
      className="premium-profile-selector"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.5 }}
    >
      <div className="selector-header">
        <span className="selector-label">Optimiert für</span>
      </div>
      <div className="profile-pills">
        {profiles.map((profile, index) => {
          const IconComponent = profile.icon;
          const isActive = selectedProfile === profile.id;
          return (
            <motion.button
              key={profile.id}
              className={`profile-pill ${isActive ? 'active' : ''}`}
              onClick={() => onProfileChange(profile.id)}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + index * 0.05 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              style={{
                background: isActive
                  ? `linear-gradient(135deg, ${profile.color} 0%, ${profile.color}dd 100%)`
                  : 'rgba(255, 255, 255, 0.8)',
                boxShadow: isActive
                  ? `0 4px 15px ${profile.color}35`
                  : '0 2px 8px rgba(0, 0, 0, 0.04)'
              }}
            >
              <div
                className="pill-icon"
                style={{
                  background: isActive ? 'rgba(255,255,255,0.2)' : `${profile.color}12`,
                }}
              >
                <IconComponent size={16} style={{ color: isActive ? 'white' : profile.color }} />
              </div>
              <span className="pill-name" style={{ color: isActive ? 'white' : '#1d1d1f' }}>
                {profile.name}
              </span>
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

// 🔍 Word-Diff Algorithm for Inline Highlighting
interface DiffSegment {
  text: string;
  type: 'same' | 'added' | 'removed' | 'changed';
}

function computeWordDiff(text1: string, text2: string): { segments1: DiffSegment[], segments2: DiffSegment[] } {
  // Normalize and split into words
  const words1 = text1.trim().split(/\s+/).filter(w => w.length > 0);
  const words2 = text2.trim().split(/\s+/).filter(w => w.length > 0);

  const segments1: DiffSegment[] = [];
  const segments2: DiffSegment[] = [];

  // Simple LCS-based diff
  const lcs = findLCS(words1, words2);

  let i = 0, j = 0, k = 0;

  while (k < lcs.length) {
    // Add removed words from text1
    while (i < words1.length && words1[i] !== lcs[k]) {
      segments1.push({ text: words1[i] + ' ', type: 'removed' });
      i++;
    }
    // Add added words from text2
    while (j < words2.length && words2[j] !== lcs[k]) {
      segments2.push({ text: words2[j] + ' ', type: 'added' });
      j++;
    }
    // Add common word
    if (i < words1.length && j < words2.length) {
      segments1.push({ text: words1[i] + ' ', type: 'same' });
      segments2.push({ text: words2[j] + ' ', type: 'same' });
      i++; j++; k++;
    }
  }

  // Add remaining words
  while (i < words1.length) {
    segments1.push({ text: words1[i] + ' ', type: 'removed' });
    i++;
  }
  while (j < words2.length) {
    segments2.push({ text: words2[j] + ' ', type: 'added' });
    j++;
  }

  return { segments1, segments2 };
}

function findLCS(arr1: string[], arr2: string[]): string[] {
  const m = arr1.length;
  const n = arr2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1].toLowerCase() === arr2[j - 1].toLowerCase()) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  // Backtrack to find LCS
  const lcs: string[] = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (arr1[i - 1].toLowerCase() === arr2[j - 1].toLowerCase()) {
      lcs.unshift(arr1[i - 1]);
      i--; j--;
    } else if (dp[i - 1][j] > dp[i][j - 1]) {
      i--;
    } else {
      j--;
    }
  }

  return lcs;
}

// Render diff segments with highlighting
const DiffText: React.FC<{ segments: DiffSegment[], variant: 'source' | 'target' }> = ({ segments, variant }) => {
  return (
    <span className="diff-text">
      {segments.map((seg, idx) => {
        let className = 'diff-segment';
        if (seg.type === 'removed' && variant === 'source') {
          className += ' diff-removed';
        } else if (seg.type === 'added' && variant === 'target') {
          className += ' diff-added';
        } else if (seg.type === 'same') {
          className += ' diff-same';
        }
        return (
          <span key={idx} className={className}>
            {seg.text}
          </span>
        );
      })}
    </span>
  );
};

// Side-by-Side Difference View Component with Visual Diff
const DifferenceView: React.FC<{
  differences: ComparisonDifference[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  showSideBySide: boolean;
  onToggleView: () => void;
  recommendedContract?: 1 | 2;
}> = ({ differences, selectedCategory, onCategoryChange, showSideBySide, onToggleView, recommendedContract = 1 }) => {
  const [showInlineDiff, setShowInlineDiff] = useState(true);
  const [activeDiffIndex, setActiveDiffIndex] = useState<number>(0);
  const diffRefs = useRef<(HTMLDivElement | null)[]>([]);

  const categories = [...new Set(differences.map(d => d.category))];
  const filteredDifferences = selectedCategory === 'all'
    ? differences
    : differences.filter(d => d.category === selectedCategory);

  // Reset active index when category changes or differences change
  useEffect(() => {
    setActiveDiffIndex(0);
  }, [selectedCategory, differences.length]);

  // Scroll to active difference
  const scrollToActiveDiff = (index: number) => {
    if (diffRefs.current[index]) {
      diffRefs.current[index]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  };

  // Navigation handlers
  const goToPrevious = () => {
    const newIndex = activeDiffIndex > 0 ? activeDiffIndex - 1 : filteredDifferences.length - 1;
    setActiveDiffIndex(newIndex);
    scrollToActiveDiff(newIndex);
  };

  const goToNext = () => {
    const newIndex = activeDiffIndex < filteredDifferences.length - 1 ? activeDiffIndex + 1 : 0;
    setActiveDiffIndex(newIndex);
    scrollToActiveDiff(newIndex);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowUp' && e.altKey) {
        e.preventDefault();
        goToPrevious();
      } else if (e.key === 'ArrowDown' && e.altKey) {
        e.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeDiffIndex, filteredDifferences.length]);

  // Severity stats
  const severityStats = {
    critical: filteredDifferences.filter(d => d.severity === 'critical').length,
    high: filteredDifferences.filter(d => d.severity === 'high').length,
    medium: filteredDifferences.filter(d => d.severity === 'medium').length,
    low: filteredDifferences.filter(d => d.severity === 'low').length
  };

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
      {/* Severity Overview Bar */}
      <div className="severity-overview">
        <div className="severity-stats">
          {severityStats.critical > 0 && (
            <span className="stat-badge stat-critical">
              <AlertTriangle size={12} /> {severityStats.critical} Kritisch
            </span>
          )}
          {severityStats.high > 0 && (
            <span className="stat-badge stat-high">
              <AlertCircle size={12} /> {severityStats.high} Hoch
            </span>
          )}
          {severityStats.medium > 0 && (
            <span className="stat-badge stat-medium">
              <AlertTriangle size={12} /> {severityStats.medium} Mittel
            </span>
          )}
          {severityStats.low > 0 && (
            <span className="stat-badge stat-low">
              <CheckCircle size={12} /> {severityStats.low} Niedrig
            </span>
          )}
        </div>
      </div>

      <div className="difference-header">
        <div className="category-filter">
          <select
            value={selectedCategory}
            onChange={(e) => onCategoryChange(e.target.value)}
            className="category-select"
          >
            <option value="all">Alle Kategorien ({filteredDifferences.length})</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>
                {cat} ({differences.filter(d => d.category === cat).length})
              </option>
            ))}
          </select>
        </div>

        {/* Diff Navigation */}
        {filteredDifferences.length > 1 && (
          <div className="diff-navigation">
            <motion.button
              className="nav-button"
              onClick={goToPrevious}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Vorheriger Unterschied (Alt + ↑)"
            >
              <ChevronUp size={18} />
            </motion.button>
            <span className="nav-counter">
              {activeDiffIndex + 1} / {filteredDifferences.length}
            </span>
            <motion.button
              className="nav-button"
              onClick={goToNext}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Nächster Unterschied (Alt + ↓)"
            >
              <ChevronDown size={18} />
            </motion.button>
          </div>
        )}

        <div className="view-toggles">
          <motion.button
            className={`view-toggle ${showInlineDiff ? 'active' : ''}`}
            onClick={() => setShowInlineDiff(!showInlineDiff)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            title="Unterschiede farbig markieren"
          >
            <Layers size={16} />
            <span>Diff</span>
          </motion.button>

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
      </div>

      <div className={`differences-container ${showSideBySide ? 'side-by-side' : 'list-view'}`}>
        {filteredDifferences.map((diff, index) => {
          const SeverityIcon = getSeverityIcon(diff.severity);
          const severityColor = getSeverityColor(diff.severity);
          const isActive = index === activeDiffIndex;

          return (
            <motion.div
              key={index}
              ref={(el) => { diffRefs.current[index] = el; }}
              className={`difference-item severity-${diff.severity} ${isActive ? 'diff-active' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.3 }}
              style={{
                borderLeftColor: severityColor,
                boxShadow: isActive ? `0 0 0 2px ${severityColor}40, 0 4px 12px rgba(0, 0, 0, 0.12)` : undefined
              }}
              onClick={() => setActiveDiffIndex(index)}
            >
              <div className="difference-header-item">
                <div className="section-info">
                  <span className="category-badge">{diff.category}</span>
                  <h4>{diff.section}</h4>
                </div>
                <div
                  className="severity-badge"
                  style={{ backgroundColor: severityColor }}
                >
                  <SeverityIcon size={14} />
                  <span>{diff.severity}</span>
                </div>
              </div>

              {showSideBySide ? (
                (() => {
                  // Compute diff if enabled
                  const diffResult = showInlineDiff && diff.contract1 && diff.contract2
                    ? computeWordDiff(diff.contract1, diff.contract2)
                    : null;

                  return (
                    <div className="side-by-side-content">
                      <div className={`contract-column ${recommendedContract === 1 ? 'recommended' : 'not-recommended'}`}>
                        <h5>
                          Vertrag 1
                          {recommendedContract === 1 && <span className="rec-badge">✓</span>}
                        </h5>
                        <div className="contract-text">
                          {diffResult ? (
                            <DiffText segments={diffResult.segments1} variant="source" />
                          ) : (
                            diff.contract1
                          )}
                        </div>
                      </div>
                      <div className="vs-divider" style={{ backgroundColor: severityColor }}>
                        <span>VS</span>
                      </div>
                      <div className={`contract-column ${recommendedContract === 2 ? 'recommended' : 'not-recommended'}`}>
                        <h5>
                          Vertrag 2
                          {recommendedContract === 2 && <span className="rec-badge">✓</span>}
                        </h5>
                        <div className="contract-text">
                          {diffResult ? (
                            <DiffText segments={diffResult.segments2} variant="target" />
                          ) : (
                            diff.contract2
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="list-content">
                  <div className="impact">
                    <strong style={{ color: severityColor }}>Auswirkung:</strong> {diff.impact}
                  </div>
                </div>
              )}

              <div className="recommendation" style={{ borderColor: `${severityColor}30` }}>
                <Zap size={14} style={{ color: '#0071e3' }} />
                <span>{diff.recommendation}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

// Progress Step Interface for SSE
interface ProgressStep {
  step: string;
  progress: number;
  message: string;
}

// History Item Interface for storing comparisons
interface ComparisonHistoryItem {
  id: string;
  timestamp: number;
  file1Name: string;
  file2Name: string;
  mode: string;
  result: ComparisonResult;
  recommended: 1 | 2;
}

// History is now stored in backend database (user-specific, device-independent)

// Main Enhanced Compare Component
export default function EnhancedCompare() {
  const [searchParams] = useSearchParams();
  const [file1, setFile1] = useState<File | null>(null);
  const [file2, setFile2] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ComparisonResult | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [userProfile, setUserProfile] = useState('individual');
  const [comparisonMode, setComparisonMode] = useState('standard');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSideBySide, setShowSideBySide] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    analysis: true,
    differences: true,
    recommendation: true
  });
  const [preloadedContractName, setPreloadedContractName] = useState<string | null>(null);
  // 📊 SSE Progress State
  const [progress, setProgress] = useState<ProgressStep | null>(null);

  // 📜 History State (loaded from backend API)
  const [showHistory, setShowHistory] = useState(false);
  const [historyItems, setHistoryItems] = useState<ComparisonHistoryItem[]>([]);

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
          userData.subscriptionPlan === "business" ||
          userData.subscriptionPlan === "enterprise" ||
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

  // ✅ NEW: Load contract from URL parameter
  useEffect(() => {
    const contractId = searchParams.get('contractId');
    if (contractId && isPremium && !file1) {
      const loadContractFromUrl = async () => {
        try {
          // Step 1: Get contract metadata
          const res = await fetch(`/api/contracts/${contractId}`, {
            credentials: "include"
          });

          if (!res.ok) throw new Error("Vertrag konnte nicht geladen werden");

          const data = await res.json();
          const contract = data.contract || data;

          setPreloadedContractName(contract.name || contract.fileName || "Unbekannter Vertrag");

          // Step 2: Get presigned URL to download PDF
          const viewRes = await fetch(`/api/s3/view?contractId=${contractId}`, {
            credentials: "include"
          });

          if (!viewRes.ok) throw new Error("PDF konnte nicht abgerufen werden");

          const viewData = await viewRes.json();
          const pdfUrl = viewData.url;

          // Step 3: Download PDF as blob
          const pdfRes = await fetch(pdfUrl);
          if (!pdfRes.ok) throw new Error("PDF-Download fehlgeschlagen");

          const blob = await pdfRes.blob();

          // Step 4: Convert blob to File object
          const fileName = contract.fileName || contract.name || "vertrag.pdf";
          const file = new File([blob], fileName, { type: "application/pdf" });

          // Step 5: Set as file1
          setFile1(file);

          setNotification({
            message: `Vertrag "${contract.name || contract.fileName}" wurde geladen`,
            type: "success"
          });

          // Auto-dismiss notification after 3 seconds
          setTimeout(() => setNotification(null), 3000);
        } catch (error) {
          console.error("❌ Error loading contract from URL:", error);
          setNotification({
            message: "Vertrag konnte nicht geladen werden",
            type: "error"
          });
        }
      };

      loadContractFromUrl();
    }
  }, [searchParams, isPremium, file1]);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [result]);

  // 📜 Load history from backend API
  const loadHistoryFromBackend = async () => {
    if (!isPremium) return;

    try {
      const res = await fetch('/api/compare/history', {
        credentials: 'include'
      });

      if (!res.ok) {
        if (res.status === 403) {
          // Not premium - no history access
          setHistoryItems([]);
          return;
        }
        throw new Error('Failed to load history');
      }

      const data = await res.json();

      // Transform backend data to frontend format
      interface BackendHistoryItem {
        id: string;
        timestamp: string;
        file1Name: string;
        file2Name: string;
        comparisonMode?: string;
        result: ComparisonResult | null;
        recommendedContract: 1 | 2;
      }

      const items: ComparisonHistoryItem[] = (data.history || [])
        .filter((h: BackendHistoryItem) => h.result !== null)
        .map((h: BackendHistoryItem) => ({
          id: h.id,
          timestamp: new Date(h.timestamp).getTime(),
          file1Name: h.file1Name,
          file2Name: h.file2Name,
          mode: h.comparisonMode || 'standard',
          result: h.result as ComparisonResult,
          recommended: h.recommendedContract
        }));

      setHistoryItems(items);
      console.log(`📜 Loaded ${items.length} history items from backend`);
    } catch (err) {
      console.warn('Could not load comparison history from backend:', err);
      setHistoryItems([]);
    }
  };

  // Load history when premium status is confirmed
  useEffect(() => {
    if (isPremium === true) {
      loadHistoryFromBackend();
    } else if (isPremium === false) {
      setHistoryItems([]);
    }
  }, [isPremium]);

  // 📜 Load comparison from history (display result)
  const loadFromHistory = (item: ComparisonHistoryItem) => {
    setResult(item.result);
    setComparisonMode(item.mode);
    setShowHistory(false);
    setNotification({
      message: `Vergleich vom ${new Date(item.timestamp).toLocaleDateString('de-DE')} geladen`,
      type: 'success'
    });
  };

  // 📜 Delete from history via backend API
  const deleteFromHistory = async (id: string) => {
    try {
      const res = await fetch(`/api/compare/history/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to delete history item');
      }

      // Update local state
      setHistoryItems(prev => prev.filter(item => item.id !== id));
      console.log('📜 Deleted history item from backend');
    } catch (err) {
      console.warn('Could not delete history item:', err);
      setNotification({
        message: 'Fehler beim Löschen des Eintrags',
        type: 'error'
      });
    }
  };

  // 📜 Clear all history via backend API
  const clearHistory = async () => {
    try {
      const res = await fetch('/api/compare/history', {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!res.ok) {
        throw new Error('Failed to clear history');
      }

      setHistoryItems([]);
      setNotification({
        message: 'Historie wurde gelöscht',
        type: 'success'
      });
      console.log('📜 Cleared all history from backend');
    } catch (err) {
      console.warn('Could not clear history:', err);
      setNotification({
        message: 'Fehler beim Löschen der Historie',
        type: 'error'
      });
    }
  };

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
    setProgress({ step: 'init', progress: 0, message: 'Starte Vergleich...' });

    const formData = new FormData();
    formData.append("file1", file1);
    formData.append("file2", file2);
    formData.append("userProfile", userProfile);
    formData.append("comparisonMode", comparisonMode);

    try {
      // 📡 SSE Request with streaming progress
      const res = await fetch("/api/compare?stream=true", {
        method: "POST",
        credentials: "include",
        headers: {
          'Accept': 'text/event-stream'
        },
        body: formData,
      });

      if (!res.ok && !res.body) {
        throw new Error("Vergleich fehlgeschlagen");
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("Stream nicht verfügbar");
      }

      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.slice(6));

              if (eventData.type === 'progress') {
                setProgress({
                  step: eventData.step,
                  progress: eventData.progress,
                  message: eventData.message
                });
              } else if (eventData.type === 'result') {
                setResult(eventData.data);
                setProgress(null);
                // Backend automatically saves to history - reload to get latest
                loadHistoryFromBackend();
                setNotification({
                  message: "Vertragsvergleich erfolgreich durchgeführt!",
                  type: "success"
                });
              } else if (eventData.type === 'error') {
                throw new Error(eventData.message);
              }
            } catch (parseErr) {
              console.warn("SSE parse error:", parseErr, line);
            }
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unbekannter Fehler beim Vergleich.";
      setNotification({
        message: "Fehler: " + message,
        type: "error"
      });
      setProgress(null);
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

  const [pdfExporting, setPdfExporting] = useState(false);

  const exportToPDF = async () => {
    if (!result) return;

    // ✅ Enterprise-Check: PDF Export nur für Business/Enterprise
    if (!isPremium) {
      setNotification({
        message: 'PDF-Export ist ein Enterprise-Feature. Upgrade für diese Funktion!',
        type: 'error'
      });
      return;
    }

    setPdfExporting(true);

    try {
      const response = await fetch('/api/compare/export-pdf', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          result,
          file1Name: file1?.name || 'Vertrag 1',
          file2Name: file2?.name || 'Vertrag 2'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'PDF-Export fehlgeschlagen');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Vertragsvergleich_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setNotification({
        message: 'PDF wurde erfolgreich erstellt!',
        type: 'success'
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler beim PDF-Export';
      setNotification({
        message: 'Fehler: ' + message,
        type: 'error'
      });
    } finally {
      setPdfExporting(false);
    }
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
      <WelcomePopup
        featureId="compare"
        icon={<Scale size={32} />}
        title="Verträge vergleichen"
        description="Laden Sie zwei Verträge hoch, um sie nebeneinander zu vergleichen. Die KI erkennt Unterschiede und bewertet, welcher Vertrag für Sie vorteilhafter ist."
        tip="Ideal für: Alter vs. neuer Vertrag, oder zwei Angebote von verschiedenen Anbietern."
      />
      <Helmet>
        <title>Verträge vergleichen & bessere Wahl treffen mit KI | Contract AI</title>
        <meta name="description" content="Vergleiche Verträge in Sekunden mit KI: Unterschiede sehen, Fairness prüfen & bessere Konditionen sichern. Jetzt schnell & einfach vergleichen!" />
        <meta name="keywords" content="Vertragsvergleich, Verträge vergleichen, Vertragsunterschiede, KI Vertragsanalyse, bessere Konditionen, Contract AI" />
        <link rel="canonical" href="https://www.contract-ai.de/compare" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Verträge vergleichen & bessere Wahl treffen mit KI | Contract AI" />
        <meta property="og:description" content="Vergleiche Verträge schnell & transparent mit KI. Unterschiede erkennen, Fairness prüfen & bessere Konditionen wählen. Jetzt ausprobieren!" />
        <meta property="og:url" content="https://www.contract-ai.de/compare" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Verträge vergleichen & bessere Wahl treffen mit KI | Contract AI" />
        <meta name="twitter:description" content="Vergleiche Verträge in Sekunden mit KI: Fairness prüfen, Unterschiede sehen & die beste Wahl treffen. Jetzt testen!" />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>

      <div style={{ fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif", backgroundColor: '#f8fafc', minHeight: '100vh', color: '#1d1d1f' }}>
        {/* Full-Width Premium Banner - außerhalb des Containers */}
        {!isPremium && (
          <UnifiedPremiumNotice
            featureName="Der Vertragsvergleich"
            variant="fullWidth"
          />
        )}

        <motion.div
          style={{ maxWidth: '1200px', margin: '0 auto', padding: '2rem' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <PageHeader
            icon={Scale}
            title="Vertragsvergleich"
            subtitle="Vergleiche zwei Verträge und erhalte eine KI-Empfehlung"
            iconColor="blue"
            features={[
              { text: 'Side-by-Side', icon: Eye },
              { text: 'Unterschiede markiert', icon: AlertTriangle },
              { text: 'KI-Empfehlung', icon: Star }
            ]}
          />

          {/* History Button - Compact Row */}
          {historyItems.length > 0 && (
            <motion.div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: '0.5rem',
                marginTop: '-1.5rem'
              }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <motion.button
                onClick={() => setShowHistory(!showHistory)}
                className={`history-toggle-btn ${showHistory ? 'active' : ''}`}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <History size={16} />
                <span>Historie ({historyItems.length})</span>
                <ChevronDown
                  size={14}
                  style={{
                    transform: showHistory ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease'
                  }}
                />
              </motion.button>
            </motion.div>
          )}

          {/* History Panel */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                className="history-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                style={{
                  marginBottom: '2rem',
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid #e8e8ed',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                  overflow: 'hidden'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '1rem 1.5rem',
                  borderBottom: '1px solid #e8e8ed',
                  background: '#f5f5f7'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <History size={18} style={{ color: '#0071e3' }} />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#1d1d1f' }}>
                      Vergleichs-Historie
                    </h3>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <motion.button
                      onClick={clearHistory}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.4rem 0.8rem',
                        background: 'rgba(255, 69, 58, 0.1)',
                        color: '#ff453a',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        fontFamily: 'inherit'
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Trash2 size={14} />
                      Alle löschen
                    </motion.button>
                    <motion.button
                      onClick={() => setShowHistory(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '28px',
                        height: '28px',
                        background: '#e8e8ed',
                        color: '#6e6e73',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer'
                      }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <X size={16} />
                    </motion.button>
                  </div>
                </div>

                <div style={{ padding: '1rem', maxHeight: '400px', overflowY: 'auto' }}>
                  {historyItems.map((item, index) => {
                    const modeLabels: Record<string, string> = {
                      standard: 'Standard',
                      version: 'Versionen',
                      bestPractice: 'Best Practice',
                      competition: 'Anbieter'
                    };

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '1rem',
                          borderRadius: '10px',
                          border: '1px solid #e8e8ed',
                          marginBottom: index < historyItems.length - 1 ? '0.75rem' : 0,
                          background: '#fafafa',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        whileHover={{
                          background: 'rgba(0, 113, 227, 0.05)',
                          borderColor: '#0071e3'
                        }}
                        onClick={() => loadFromHistory(item)}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                            <span style={{
                              fontSize: '0.75rem',
                              fontWeight: 500,
                              padding: '0.2rem 0.5rem',
                              borderRadius: '4px',
                              background: 'rgba(0, 113, 227, 0.1)',
                              color: '#0071e3'
                            }}>
                              {modeLabels[item.mode] || item.mode}
                            </span>
                            <span style={{ fontSize: '0.8rem', color: '#6e6e73' }}>
                              {new Date(item.timestamp).toLocaleDateString('de-DE', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <FileText size={14} style={{ color: '#6e6e73' }} />
                            <span style={{ fontSize: '0.9rem', color: '#1d1d1f', fontWeight: 500 }}>
                              {item.file1Name}
                            </span>
                            <ArrowRight size={14} style={{ color: '#6e6e73' }} />
                            <span style={{ fontSize: '0.9rem', color: '#1d1d1f', fontWeight: 500 }}>
                              {item.file2Name}
                            </span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                            padding: '0.3rem 0.6rem',
                            borderRadius: '6px',
                            background: item.recommended === 1 ? 'rgba(52, 199, 89, 0.1)' : 'rgba(88, 86, 214, 0.1)',
                            color: item.recommended === 1 ? '#34c759' : '#5856d6',
                            fontSize: '0.8rem',
                            fontWeight: 500
                          }}>
                            <Star size={12} />
                            Vertrag {item.recommended}
                          </div>

                          <motion.button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteFromHistory(item.id);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              width: '28px',
                              height: '28px',
                              background: 'transparent',
                              color: '#ff453a',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              opacity: 0.6
                            }}
                            whileHover={{ opacity: 1, scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            <Trash2 size={14} />
                          </motion.button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <UserProfileSelector
            selectedProfile={userProfile}
            onProfileChange={setUserProfile}
          />

          <ComparisonModeSelector
            selectedMode={comparisonMode}
            onModeChange={setComparisonMode}
          />

          {preloadedContractName && (
            <motion.div
              style={{
                background: 'rgba(0, 113, 227, 0.1)',
                border: '1px solid rgba(0, 113, 227, 0.3)',
                borderRadius: '12px',
                padding: '1rem 1.5rem',
                marginBottom: '2rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.8rem'
              }}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Info size={20} style={{ color: '#0071e3', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <strong style={{ color: '#0071e3' }}>Vertrag vorgeladen:</strong>
                <span style={{ color: '#1d1d1f', marginLeft: '0.5rem' }}>{preloadedContractName}</span>
              </div>
            </motion.div>
          )}

          {/* Premium Upload Section */}
          <motion.div
            className="premium-upload-section"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            {/* Section Header */}
            <div className="upload-section-header">
              <div className="upload-header-icon">
                <Scale size={20} />
              </div>
              <div className="upload-header-text">
                <h3>Verträge hochladen</h3>
                <p>Wählen Sie zwei PDF-Dateien für den Vergleich aus</p>
              </div>
            </div>

            {/* Upload Cards Container */}
            <div className="upload-cards-container">
              {/* Contract 1 Card */}
              <motion.div
                className={`premium-upload-card ${file1 ? 'has-file' : ''} ${!isPremium ? 'disabled' : ''}`}
                whileHover={isPremium && !file1 ? {
                  y: -4,
                  boxShadow: '0 20px 40px rgba(0, 113, 227, 0.15), 0 0 0 1px rgba(0, 113, 227, 0.2)'
                } : {}}
                whileTap={isPremium ? { scale: 0.99 } : {}}
                onClick={() => isPremium && file1InputRef.current?.click()}
              >
                <input
                  ref={file1InputRef}
                  type="file"
                  accept=".pdf,.docx"
                  disabled={!isPremium}
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && setFile1(e.target.files[0])}
                />

                {/* Decorative Background */}
                <div className="card-bg-decoration" />

                {/* Card Label */}
                <div className="card-label">
                  <span className="label-number">1</span>
                  <span className="label-text">Erster Vertrag</span>
                </div>

                {file1 ? (
                  <motion.div
                    className="file-preview"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <div className="file-icon-wrapper success">
                      <FileText size={28} />
                      <motion.div
                        className="success-check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                      >
                        <CheckCircle size={16} />
                      </motion.div>
                    </div>
                    <div className="file-info">
                      <span className="file-name">{file1.name}</span>
                      <span className="file-size">{(file1.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <motion.button
                      className="remove-file"
                      onClick={(e) => { e.stopPropagation(); setFile1(null); }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={14} />
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className="upload-placeholder">
                    <div className="upload-icon-wrapper">
                      <Upload size={24} />
                      <div className="upload-icon-ring" />
                    </div>
                    <span className="upload-text">PDF auswählen</span>
                    <span className="upload-hint">oder hierher ziehen</span>
                  </div>
                )}

                {!isPremium && (
                  <div className="premium-overlay">
                    <span className="premium-badge-card">
                      <Star size={12} />
                      Premium
                    </span>
                  </div>
                )}
              </motion.div>

              {/* VS Connector */}
              <div className="vs-connector">
                <div className="connector-line" />
                <motion.div
                  className="vs-badge"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.4, type: 'spring', stiffness: 300 }}
                >
                  <span>VS</span>
                </motion.div>
                <div className="connector-line" />
              </div>

              {/* Contract 2 Card */}
              <motion.div
                className={`premium-upload-card ${file2 ? 'has-file' : ''} ${!isPremium ? 'disabled' : ''}`}
                whileHover={isPremium && !file2 ? {
                  y: -4,
                  boxShadow: '0 20px 40px rgba(88, 86, 214, 0.15), 0 0 0 1px rgba(88, 86, 214, 0.2)'
                } : {}}
                whileTap={isPremium ? { scale: 0.99 } : {}}
                onClick={() => isPremium && file2InputRef.current?.click()}
              >
                <input
                  ref={file2InputRef}
                  type="file"
                  accept=".pdf,.docx"
                  disabled={!isPremium}
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && setFile2(e.target.files[0])}
                />

                {/* Decorative Background */}
                <div className="card-bg-decoration alt" />

                {/* Card Label */}
                <div className="card-label alt">
                  <span className="label-number">2</span>
                  <span className="label-text">Zweiter Vertrag</span>
                </div>

                {file2 ? (
                  <motion.div
                    className="file-preview"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    <div className="file-icon-wrapper success alt">
                      <FileText size={28} />
                      <motion.div
                        className="success-check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                      >
                        <CheckCircle size={16} />
                      </motion.div>
                    </div>
                    <div className="file-info">
                      <span className="file-name">{file2.name}</span>
                      <span className="file-size">{(file2.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                    <motion.button
                      className="remove-file"
                      onClick={(e) => { e.stopPropagation(); setFile2(null); }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X size={14} />
                    </motion.button>
                  </motion.div>
                ) : (
                  <div className="upload-placeholder">
                    <div className="upload-icon-wrapper alt">
                      <Upload size={24} />
                      <div className="upload-icon-ring" />
                    </div>
                    <span className="upload-text">PDF auswählen</span>
                    <span className="upload-hint">oder hierher ziehen</span>
                  </div>
                )}

                {!isPremium && (
                  <div className="premium-overlay">
                    <span className="premium-badge-card">
                      <Star size={12} />
                      Premium
                    </span>
                  </div>
                )}
              </motion.div>
            </div>
            
            {/* 📊 SSE Progress Bar */}
            {loading && progress && (
              <motion.div
                style={{
                  marginBottom: '1.5rem',
                  padding: '1rem 1.5rem',
                  background: 'rgba(0, 113, 227, 0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(0, 113, 227, 0.1)'
                }}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 500, color: '#0071e3' }}>
                    {progress.message}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: '#6e6e73' }}>
                    {progress.progress}%
                  </span>
                </div>
                <div style={{
                  height: '6px',
                  backgroundColor: 'rgba(0, 113, 227, 0.1)',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}>
                  <motion.div
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #0071e3, #00c7be)',
                      borderRadius: '3px'
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${progress.progress}%` }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                  />
                </div>
              </motion.div>
            )}

            {/* Premium Action Buttons */}
            <div className="action-buttons">
              <motion.button
                className={`premium-submit-btn ${(!file1 || !file2 || loading || !isPremium) ? 'disabled' : ''}`}
                onClick={handleSubmit}
                disabled={!file1 || !file2 || loading || !isPremium}
                whileHover={file1 && file2 && !loading && isPremium ? {
                  y: -2,
                  boxShadow: '0 12px 35px rgba(0, 113, 227, 0.35)'
                } : {}}
                whileTap={file1 && file2 && !loading && isPremium ? { scale: 0.98 } : {}}
              >
                <span className="btn-bg" />
                {loading ? (
                  <>
                    <div className="loading-spinner" />
                    <span className="btn-text">{progress?.message || 'Analysiere...'}</span>
                  </>
                ) : (
                  <>
                    <Zap size={18} className="btn-icon" />
                    <span className="btn-text">Vergleich starten</span>
                    <ArrowRight size={16} className="btn-arrow" />
                  </>
                )}
              </motion.button>

              {(file1 || file2) && (
                <motion.button
                  className="reset-btn"
                  onClick={handleReset}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
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
                    disabled={pdfExporting}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.7rem 1.2rem',
                      borderRadius: '10px',
                      backgroundColor: pdfExporting ? '#e8e8ed' : '#f5f5f7',
                      color: '#1d1d1f',
                      border: 'none',
                      fontFamily: 'inherit',
                      fontSize: '0.95rem',
                      fontWeight: 500,
                      cursor: pdfExporting ? 'wait' : 'pointer',
                      opacity: pdfExporting ? 0.7 : 1
                    }}
                    whileHover={!pdfExporting ? { scale: 1.02, backgroundColor: '#e8e8ed' } : {}}
                    whileTap={!pdfExporting ? { scale: 0.98 } : {}}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    {pdfExporting ? (
                      <>
                        <div style={{ width: '16px', height: '16px', border: '2px solid rgba(0, 0, 0, 0.2)', borderTopColor: '#0071e3', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
                        <span>PDF wird erstellt...</span>
                      </>
                    ) : (
                      <>
                        <Download size={16} />
                        <span>Als PDF speichern</span>
                      </>
                    )}
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
                        recommendedContract={result.overallRecommendation.recommended}
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
            to { transform: rotate(360deg); }
          }

          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 1; }
            100% { transform: scale(1.4); opacity: 0; }
          }

          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }

          /* ============================================
             🎨 PREMIUM PROFILE SELECTOR
             ============================================ */
          .premium-profile-selector {
            margin-bottom: 1.5rem;
          }

          .selector-header {
            display: flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 1rem;
          }

          .selector-label {
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #86868b;
          }

          .profile-pills {
            display: flex;
            gap: 0.75rem;
            justify-content: center;
            flex-wrap: wrap;
          }

          .profile-pill {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.65rem 1.1rem;
            border: none;
            border-radius: 50px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: inherit;
            font-size: 0.9rem;
            font-weight: 500;
            backdrop-filter: blur(10px);
          }

          .pill-icon {
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
          }

          .pill-name {
            font-weight: 500;
          }

          /* ============================================
             🎯 PREMIUM MODE SELECTOR
             ============================================ */
          .premium-mode-selector {
            margin-bottom: 2rem;
          }

          .mode-chips {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 1rem;
          }

          @media (max-width: 900px) {
            .mode-chips {
              grid-template-columns: repeat(2, 1fr);
            }
          }

          @media (max-width: 500px) {
            .mode-chips {
              grid-template-columns: 1fr;
            }
          }

          .mode-chip {
            display: flex;
            align-items: center;
            gap: 0.8rem;
            padding: 1rem 1.2rem;
            border: none;
            border-radius: 16px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-family: inherit;
            text-align: left;
            position: relative;
            overflow: hidden;
          }

          .chip-icon-wrapper {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.3s ease;
          }

          .chip-content {
            flex: 1;
            min-width: 0;
          }

          .chip-name {
            display: block;
            font-weight: 600;
            font-size: 0.95rem;
            margin-bottom: 0.15rem;
          }

          .chip-description {
            display: block;
            font-size: 0.75rem;
            line-height: 1.3;
          }

          .chip-check {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          /* ============================================
             📤 PREMIUM UPLOAD SECTION
             ============================================ */
          .premium-upload-section {
            background: linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%);
            backdrop-filter: blur(20px);
            border-radius: 24px;
            border: 1px solid rgba(0, 0, 0, 0.06);
            box-shadow:
              0 1px 1px rgba(0, 0, 0, 0.02),
              0 4px 8px rgba(0, 0, 0, 0.04),
              0 16px 32px rgba(0, 0, 0, 0.04);
            padding: 2rem;
            margin-bottom: 2rem;
          }

          .upload-section-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 2rem;
            padding-bottom: 1.5rem;
            border-bottom: 1px solid rgba(0, 0, 0, 0.06);
          }

          .upload-header-icon {
            width: 44px;
            height: 44px;
            border-radius: 12px;
            background: linear-gradient(135deg, #0071e3 0%, #00c7be 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            box-shadow: 0 4px 12px rgba(0, 113, 227, 0.3);
          }

          .upload-header-text h3 {
            margin: 0 0 0.25rem 0;
            font-size: 1.1rem;
            font-weight: 600;
            color: #1d1d1f;
          }

          .upload-header-text p {
            margin: 0;
            font-size: 0.9rem;
            color: #86868b;
          }

          .upload-cards-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 1.5rem;
            margin-bottom: 2rem;
          }

          @media (max-width: 768px) {
            .upload-cards-container {
              flex-direction: column;
            }
            .vs-connector {
              transform: rotate(90deg);
              margin: 0.5rem 0;
            }
          }

          .premium-upload-card {
            position: relative;
            width: 280px;
            height: 200px;
            border-radius: 20px;
            background: white;
            border: 2px dashed rgba(0, 113, 227, 0.2);
            cursor: pointer;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            overflow: hidden;
          }

          .premium-upload-card:hover {
            border-style: solid;
            border-color: rgba(0, 113, 227, 0.4);
          }

          .premium-upload-card.has-file {
            border-style: solid;
            border-color: #34c759;
            background: linear-gradient(180deg, rgba(52, 199, 89, 0.03) 0%, rgba(52, 199, 89, 0.08) 100%);
          }

          .premium-upload-card.disabled {
            cursor: not-allowed;
            opacity: 0.6;
          }

          .card-bg-decoration {
            position: absolute;
            top: -50%;
            right: -50%;
            width: 150%;
            height: 150%;
            background: radial-gradient(circle at center, rgba(0, 113, 227, 0.03) 0%, transparent 70%);
            pointer-events: none;
          }

          .card-bg-decoration.alt {
            background: radial-gradient(circle at center, rgba(88, 86, 214, 0.03) 0%, transparent 70%);
          }

          .card-label {
            position: absolute;
            top: 1rem;
            left: 1rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .label-number {
            width: 24px;
            height: 24px;
            border-radius: 8px;
            background: linear-gradient(135deg, #0071e3 0%, #00c7be 100%);
            color: white;
            font-size: 0.8rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .card-label.alt .label-number {
            background: linear-gradient(135deg, #5856d6 0%, #af52de 100%);
          }

          .label-text {
            font-size: 0.8rem;
            font-weight: 600;
            color: #86868b;
          }

          .upload-placeholder {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
          }

          .upload-icon-wrapper {
            position: relative;
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, rgba(0, 113, 227, 0.1) 0%, rgba(0, 199, 190, 0.1) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0071e3;
          }

          .upload-icon-wrapper.alt {
            background: linear-gradient(135deg, rgba(88, 86, 214, 0.1) 0%, rgba(175, 82, 222, 0.1) 100%);
            color: #5856d6;
          }

          .upload-icon-ring {
            position: absolute;
            inset: -4px;
            border-radius: 20px;
            border: 2px dashed currentColor;
            opacity: 0.3;
            animation: pulse-ring 2s ease-out infinite;
          }

          .upload-text {
            font-size: 0.95rem;
            font-weight: 600;
            color: #1d1d1f;
          }

          .upload-hint {
            font-size: 0.8rem;
            color: #86868b;
          }

          .file-preview {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.75rem;
            width: 100%;
            padding: 0 1.5rem;
          }

          .file-icon-wrapper {
            position: relative;
            width: 56px;
            height: 56px;
            border-radius: 16px;
            background: linear-gradient(135deg, rgba(0, 113, 227, 0.1) 0%, rgba(0, 199, 190, 0.1) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: #0071e3;
          }

          .file-icon-wrapper.success {
            background: linear-gradient(135deg, rgba(52, 199, 89, 0.1) 0%, rgba(48, 209, 88, 0.15) 100%);
            color: #34c759;
          }

          .file-icon-wrapper.alt {
            background: linear-gradient(135deg, rgba(88, 86, 214, 0.1) 0%, rgba(175, 82, 222, 0.15) 100%);
            color: #5856d6;
          }

          .success-check {
            position: absolute;
            bottom: -4px;
            right: -4px;
            width: 22px;
            height: 22px;
            border-radius: 50%;
            background: #34c759;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(52, 199, 89, 0.4);
          }

          .file-info {
            text-align: center;
            width: 100%;
          }

          .file-name {
            display: block;
            font-size: 0.9rem;
            font-weight: 600;
            color: #1d1d1f;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 200px;
            margin: 0 auto;
          }

          .file-size {
            display: block;
            font-size: 0.8rem;
            color: #86868b;
            margin-top: 0.2rem;
          }

          .remove-file {
            position: absolute;
            top: 0.75rem;
            right: 0.75rem;
            width: 28px;
            height: 28px;
            border-radius: 8px;
            background: rgba(255, 69, 58, 0.1);
            border: none;
            color: #ff453a;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
          }

          .remove-file:hover {
            background: #ff453a;
            color: white;
          }

          .premium-overlay {
            position: absolute;
            inset: 0;
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(2px);
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .premium-badge-card {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.5rem 1rem;
            background: linear-gradient(135deg, #f7b500 0%, #ff9500 100%);
            color: white;
            font-size: 0.85rem;
            font-weight: 600;
            border-radius: 50px;
            box-shadow: 0 4px 12px rgba(247, 181, 0, 0.4);
          }

          /* VS Connector */
          .vs-connector {
            display: flex;
            align-items: center;
            gap: 0;
          }

          .connector-line {
            width: 20px;
            height: 2px;
            background: linear-gradient(90deg, transparent 0%, #e8e8ed 50%, transparent 100%);
          }

          .vs-badge {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: linear-gradient(135deg, #f5f5f7 0%, #e8e8ed 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.75rem;
            font-weight: 700;
            color: #86868b;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          /* ============================================
             🚀 PREMIUM ACTION BUTTONS
             ============================================ */
          .action-buttons {
            display: flex;
            justify-content: center;
            gap: 1rem;
          }

          .premium-submit-btn {
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 0.6rem;
            min-width: 220px;
            padding: 1rem 2rem;
            border: none;
            border-radius: 14px;
            background: linear-gradient(135deg, #0071e3 0%, #0077ed 50%, #00c7be 100%);
            background-size: 200% 100%;
            color: white;
            font-family: inherit;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 4px 20px rgba(0, 113, 227, 0.3);
          }

          .premium-submit-btn:hover:not(.disabled) {
            background-position: 100% 0;
          }

          .premium-submit-btn.disabled {
            background: linear-gradient(135deg, #86868b 0%, #6e6e73 100%);
            cursor: not-allowed;
            box-shadow: none;
          }

          .premium-submit-btn .btn-bg {
            position: absolute;
            inset: 0;
            background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
            background-size: 200% 100%;
            animation: shimmer 2s ease-in-out infinite;
          }

          .premium-submit-btn .btn-icon {
            position: relative;
          }

          .premium-submit-btn .btn-text {
            position: relative;
          }

          .premium-submit-btn .btn-arrow {
            position: relative;
            transition: transform 0.3s ease;
          }

          .premium-submit-btn:hover:not(.disabled) .btn-arrow {
            transform: translateX(4px);
          }

          .premium-submit-btn .loading-spinner {
            width: 18px;
            height: 18px;
            border: 2px solid rgba(255, 255, 255, 0.3);
            border-top-color: white;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }

          .reset-btn {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding: 1rem 1.5rem;
            background: rgba(0, 0, 0, 0.04);
            border: 1px solid rgba(0, 0, 0, 0.06);
            border-radius: 14px;
            color: #1d1d1f;
            font-family: inherit;
            font-size: 0.95rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.3s ease;
          }

          .reset-btn:hover {
            background: rgba(0, 0, 0, 0.08);
          }

          /* History Toggle Button */
          .history-toggle-btn {
            display: flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.5rem 1rem;
            background: white;
            color: #6e6e73;
            border: 1px solid rgba(0, 0, 0, 0.08);
            border-radius: 10px;
            cursor: pointer;
            font-family: inherit;
            font-size: 0.85rem;
            font-weight: 500;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
          }

          .history-toggle-btn:hover {
            background: #f5f5f7;
            color: #1d1d1f;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          }

          .history-toggle-btn.active {
            background: #0071e3;
            color: white;
            border-color: transparent;
            box-shadow: 0 2px 10px rgba(0, 113, 227, 0.25);
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

          /* Severity Overview Bar */
          .severity-overview {
            margin-bottom: 1rem;
            padding: 0.75rem 1rem;
            background: #f5f5f7;
            border-radius: 10px;
          }

          .severity-stats {
            display: flex;
            gap: 0.75rem;
            flex-wrap: wrap;
          }

          .stat-badge {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            padding: 0.3rem 0.6rem;
            border-radius: 6px;
            font-size: 0.8rem;
            font-weight: 500;
          }

          .stat-critical {
            background: rgba(215, 0, 21, 0.1);
            color: #d70015;
          }

          .stat-high {
            background: rgba(255, 69, 58, 0.1);
            color: #ff453a;
          }

          .stat-medium {
            background: rgba(255, 149, 0, 0.1);
            color: #ff9500;
          }

          .stat-low {
            background: rgba(52, 199, 89, 0.1);
            color: #34c759;
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

          .view-toggles {
            display: flex;
            gap: 0.5rem;
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

          .view-toggle.active {
            background: rgba(0, 113, 227, 0.1);
            border-color: #0071e3;
            color: #0071e3;
          }

          /* Diff Navigation Styles */
          .diff-navigation {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: #f5f5f7;
            padding: 0.4rem 0.8rem;
            border-radius: 10px;
          }

          .nav-button {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            border: none;
            border-radius: 8px;
            background: white;
            color: #0071e3;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }

          .nav-button:hover {
            background: #0071e3;
            color: white;
          }

          .nav-counter {
            font-size: 0.85rem;
            font-weight: 600;
            color: #1d1d1f;
            min-width: 60px;
            text-align: center;
          }

          /* Active Difference Styling */
          .difference-item.diff-active {
            transform: translateY(-2px);
            border-left-width: 5px;
          }

          .difference-item.diff-active::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--severity-color, #0071e3), transparent);
            border-radius: 12px 12px 0 0;
          }

          /* Diff Highlighting Styles */
          .diff-text {
            display: inline;
          }

          .diff-segment {
            transition: background-color 0.2s ease;
          }

          .diff-same {
            color: inherit;
          }

          .diff-removed {
            background-color: rgba(255, 69, 58, 0.2);
            color: #d70015;
            text-decoration: line-through;
            border-radius: 2px;
            padding: 0 2px;
          }

          .diff-added {
            background-color: rgba(52, 199, 89, 0.2);
            color: #248a3d;
            font-weight: 500;
            border-radius: 2px;
            padding: 0 2px;
          }

          .differences-container {
            display: flex;
            flex-direction: column;
            gap: 1rem;
          }

          .difference-item {
            position: relative;
            border: 1px solid #e8e8ed;
            border-radius: 12px;
            padding: 1.5rem;
            background: white;
            border-left: 4px solid #e8e8ed;
            transition: all 0.2s ease;
            cursor: pointer;
          }

          .difference-item:hover {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            transform: translateY(-1px);
          }

          .difference-item.severity-critical {
            background: rgba(215, 0, 21, 0.02);
          }

          .difference-item.severity-high {
            background: rgba(255, 69, 58, 0.02);
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
            border: 2px solid #e8e8ed;
            border-radius: 8px;
            background: #f9f9f9;
            transition: all 0.2s ease;
          }

          .contract-column.recommended {
            border-color: #34c759;
            background: rgba(52, 199, 89, 0.05);
          }

          .contract-column.not-recommended {
            border-color: #e8e8ed;
            background: #f9f9f9;
          }

          .contract-column h5 {
            margin: 0 0 0.5rem;
            color: #1d1d1f;
            font-size: 0.9rem;
            font-weight: 600;
            display: flex;
            align-items: center;
            gap: 0.5rem;
          }

          .rec-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            background: #34c759;
            color: white;
            border-radius: 50%;
            font-size: 0.7rem;
            font-weight: 700;
          }

          .contract-text {
            font-size: 0.85rem;
            color: #6e6e73;
            line-height: 1.5;
          }

          .contract-column.recommended .contract-text {
            color: #1d1d1f;
          }

          .vs-divider {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            color: white;
            border-radius: 50%;
            font-size: 0.75rem;
            font-weight: 700;
            flex-shrink: 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          }

          .vs-divider span {
            line-height: 1;
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