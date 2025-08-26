// 📁 frontend/src/components/ExecutiveSummaryViewer.tsx
// 🎯 PREMIUM: Executive Summary Display für Contract AI Optimizer
// 
// Zweck: Visualisiert Executive Summary mit Health Score, Top-Risiken und Empfehlungen
// Features: Interactive Charts, Action Items, Print-optimierte Darstellung

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  Printer,
  Calendar,
  Building,
  FileText,
  Target,
  Lightbulb,
  Shield,
  ChevronRight
} from 'lucide-react';
import type { RedraftResult } from '../types/optimizer';

interface ExecutiveSummaryViewerProps {
  redraftResult: RedraftResult | null;
  contractName: string;
  className?: string;
  onPrintMode?: (enabled: boolean) => void;
}

const ExecutiveSummaryViewer: React.FC<ExecutiveSummaryViewerProps> = ({
  redraftResult,
  contractName: _contractName,
  className = '',
  onPrintMode
}) => {
  const [showPrintView, setShowPrintView] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));

  const summary = redraftResult?.executiveSummary;

  if (!summary || !redraftResult) {
    return (
      <div className={`executive-summary-viewer ${className}`}>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Executive Summary</h3>
          <p className="text-gray-600">
            Führen Sie zuerst eine Auto-Neufassung durch, um ein Executive Summary zu generieren.
          </p>
        </div>
      </div>
    );
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const togglePrintView = () => {
    const newPrintView = !showPrintView;
    setShowPrintView(newPrintView);
    onPrintMode?.(newPrintView);
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 80) return 'bg-green-50';
    if (score >= 60) return 'bg-yellow-50';
    return 'bg-red-50';
  };

  const getHealthScoreRing = (score: number) => {
    if (score >= 80) return 'stroke-green-600';
    if (score >= 60) return 'stroke-yellow-600';
    return 'stroke-red-600';
  };

  const getImprovementTrend = (improvement: number) => {
    if (improvement > 0) {
      return {
        icon: TrendingUp,
        color: 'text-green-600',
        label: `+${improvement} Punkte verbessert`
      };
    } else if (improvement < 0) {
      return {
        icon: TrendingDown,
        color: 'text-red-600',
        label: `${Math.abs(improvement)} Punkte verschlechtert`
      };
    }
    return {
      icon: Target,
      color: 'text-gray-600',
      label: 'Unverändert'
    };
  };

  const improvement = getImprovementTrend(summary.healthScore.improvement);

  return (
    <div className={`executive-summary-viewer ${className}`}>
      <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${showPrintView ? 'print-view' : ''}`}>
        
        {/* Header */}
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">{summary.title}</h2>
              <p className="text-gray-600">Executive Summary • {summary.contractInfo.dateAnalyzed}</p>
            </div>

            {!showPrintView && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Drucken
                </button>
                
                <button
                  onClick={togglePrintView}
                  className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  Druckansicht
                </button>
              </div>
            )}
            
            {showPrintView && (
              <button
                onClick={togglePrintView}
                className="px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
              >
                Zurück zur Ansicht
              </button>
            )}
          </div>
        </div>

        {/* Contract Info Bar */}
        <div className="p-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Vertragstyp:</span>
              <span className="font-medium">{summary.contractInfo.type}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Rechtsraum:</span>
              <span className="font-medium">{summary.contractInfo.jurisdiction}</span>
            </div>
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Seiten:</span>
              <span className="font-medium">{summary.contractInfo.pages}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">Analysiert am:</span>
              <span className="font-medium">{new Date(summary.contractInfo.dateAnalyzed).toLocaleDateString('de-DE')}</span>
            </div>
          </div>
        </div>

        {/* Health Score Section */}
        <CollapsibleSection
          title="Contract Health Score"
          icon={BarChart3}
          isExpanded={expandedSections.has('overview')}
          onToggle={() => toggleSection('overview')}
          showPrintView={showPrintView}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main Score */}
            <div className="text-center">
              <div className="relative inline-flex items-center justify-center">
                <svg className="w-32 h-32 transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    className="text-gray-200"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r="56"
                    stroke="currentColor"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 56}`}
                    strokeDashoffset={`${2 * Math.PI * 56 * (1 - summary.healthScore.after / 100)}`}
                    className={getHealthScoreRing(summary.healthScore.after)}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl font-bold ${getHealthScoreColor(summary.healthScore.after)}`}>
                    {summary.healthScore.after}
                  </span>
                  <span className="text-sm text-gray-600">von 100</span>
                </div>
              </div>
              
              <div className="mt-4">
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${getHealthScoreBg(summary.healthScore.after)} ${getHealthScoreColor(summary.healthScore.after)}`}>
                  <improvement.icon className="w-4 h-4" />
                  {improvement.label}
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Bewertung: <strong>{summary.healthScore.rating}</strong>
                </p>
              </div>
            </div>

            {/* Before/After Comparison */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Vorher/Nachher</h4>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Vorher</span>
                    <span className="font-medium">{summary.healthScore.before}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gray-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${summary.healthScore.before}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Nachher</span>
                    <span className="font-medium">{summary.healthScore.after}/100</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        summary.healthScore.after >= 80 ? 'bg-green-500' :
                        summary.healthScore.after >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${summary.healthScore.after}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Changes Summary */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900">Änderungsübersicht</h4>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Gesamte Optimierungen</span>
                  <span className="font-bold text-blue-600">{summary.changesSummary.totalOptimizations}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Übernommen</span>
                  <span className="font-bold text-green-600">{summary.changesSummary.appliedChanges}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Erfolgsquote</span>
                  <span className="font-bold text-gray-900">{summary.changesSummary.successRate}%</span>
                </div>
                
                <div className="pt-2 border-t border-gray-200">
                  <span className="text-xs text-gray-500">Hauptkategorien:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {summary.changesSummary.keyCategories.map((category, index) => (
                      <span key={index} className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {category}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Top Risks Section */}
        <CollapsibleSection
          title="Top-Risiken"
          icon={AlertTriangle}
          isExpanded={expandedSections.has('risks')}
          onToggle={() => toggleSection('risks')}
          showPrintView={showPrintView}
        >
          <div className="space-y-4">
            {summary.topRisks.map((risk, index) => (
              <div key={index} className="p-4 border border-red-200 rounded-lg bg-red-50">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-bold text-red-600">{index + 1}</span>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-red-200 text-red-800 text-xs font-medium rounded">
                        {risk.category}
                      </span>
                      <h5 className="font-semibold text-red-900">{risk.risk}</h5>
                    </div>
                    <p className="text-sm text-red-800"><strong>Auswirkung:</strong> {risk.impact}</p>
                    <p className="text-sm text-red-700"><strong>Empfehlung:</strong> {risk.recommendation}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Quick Wins Section */}
        <CollapsibleSection
          title="Quick Wins"
          icon={Lightbulb}
          isExpanded={expandedSections.has('quickwins')}
          onToggle={() => toggleSection('quickwins')}
          showPrintView={showPrintView}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-600">{summary.quickWins.implemented}</div>
              <div className="text-sm text-green-700">Umgesetzte Verbesserungen</div>
            </div>
            
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <Clock className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="text-lg font-bold text-blue-600">{summary.quickWins.estimatedTimeToImplement}</div>
              <div className="text-sm text-blue-700">Geschätzte Umsetzungszeit</div>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <h5 className="font-medium text-gray-900 mb-2">Betroffene Bereiche</h5>
              <div className="space-y-1">
                {summary.quickWins.categories.map((category, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <ChevronRight className="w-3 h-3 text-gray-400" />
                    <span className="text-gray-700">{category}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CollapsibleSection>

        {/* Recommendations Section */}
        <CollapsibleSection
          title="Handlungsempfehlungen"
          icon={Target}
          isExpanded={expandedSections.has('recommendations')}
          onToggle={() => toggleSection('recommendations')}
          showPrintView={showPrintView}
        >
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Immediate */}
            <div>
              <h5 className="font-semibold text-red-600 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Sofortige Maßnahmen
              </h5>
              <ul className="space-y-2">
                {summary.recommendations.immediate.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-4 h-4 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Short Term */}
            <div>
              <h5 className="font-semibold text-yellow-600 mb-3 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Kurzfristig (1-3 Monate)
              </h5>
              <ul className="space-y-2">
                {summary.recommendations.shortTerm.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-4 h-4 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-yellow-500 rounded-full" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Long Term */}
            <div>
              <h5 className="font-semibold text-blue-600 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Langfristig (3+ Monate)
              </h5>
              <ul className="space-y-2">
                {summary.recommendations.longTerm.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    </div>
                    <span className="text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </CollapsibleSection>

        {/* Next Steps */}
        <CollapsibleSection
          title="Nächste Schritte"
          icon={ChevronRight}
          isExpanded={expandedSections.has('nextsteps')}
          onToggle={() => toggleSection('nextsteps')}
          showPrintView={showPrintView}
        >
          <div className="space-y-3">
            {summary.nextSteps.map((step, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-xs font-bold text-blue-600">{index + 1}</span>
                </div>
                <span className="text-sm text-blue-900">{step}</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Legal Disclaimer */}
        <div className="p-4 bg-gray-100 border-t border-gray-200">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
            <div className="text-xs text-gray-600 leading-relaxed">
              <strong>Rechtlicher Hinweis:</strong> {summary.legalDisclaimer}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  showPrintView: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ 
  title, 
  icon: Icon, 
  children, 
  isExpanded, 
  onToggle, 
  showPrintView 
}) => {
  return (
    <div className="border-b border-gray-200">
      <button
        onClick={onToggle}
        className={`w-full p-4 text-left hover:bg-gray-50 transition-colors flex items-center justify-between ${
          showPrintView ? 'cursor-default hover:bg-transparent' : ''
        }`}
        disabled={showPrintView}
      >
        <div className="flex items-center gap-3">
          <Icon className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        {!showPrintView && (
          <ChevronRight 
            className={`w-5 h-5 text-gray-400 transition-transform ${
              isExpanded ? 'rotate-90' : ''
            }`} 
          />
        )}
      </button>
      
      <AnimatePresence>
        {(isExpanded || showPrintView) && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExecutiveSummaryViewer;