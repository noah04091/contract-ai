// 📁 frontend/src/components/PitchViewer.tsx
// 🎯 PREMIUM: Pitch-Viewer für Contract AI Optimizer
// 
// Zweck: Zeigt für jede Änderung 3 Tonarten (freundlich, neutral, bestimmt) an
// Features: Copy-Buttons, Ton-Auswahl, Batch-Export aller Pitches

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Copy, 
  Check, 
  MessageSquare, 
  Heart, 
  Scale, 
  Zap,
  Download,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText
} from 'lucide-react';
import { PitchCollection, RedraftResult } from '../types/optimizer';

interface PitchViewerProps {
  contractId: string;
  redraftResult: RedraftResult | null;
  pitches: PitchCollection[] | null;
  onLoadPitches: () => Promise<void>;
  isLoadingPitches?: boolean;
  className?: string;
}

interface CopyState {
  [key: string]: boolean; // changeId-tone -> copied status
}

const PitchViewer: React.FC<PitchViewerProps> = ({
  contractId,
  redraftResult,
  pitches,
  onLoadPitches,
  isLoadingPitches = false,
  className = ''
}) => {
  const [copyStates, setCopyStates] = useState<CopyState>({});
  const [expandedPitches, setExpandedPitches] = useState<Set<string>>(new Set());
  const [selectedTone, setSelectedTone] = useState<'friendly' | 'neutral' | 'firm'>('neutral');
  const [showBatchExport, setShowBatchExport] = useState(false);
  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  // Copy text to clipboard
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStates(prev => ({ ...prev, [key]: true }));
      setTimeout(() => {
        setCopyStates(prev => ({ ...prev, [key]: false }));
      }, 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Toggle pitch expansion
  const togglePitchExpansion = (changeId: string) => {
    const newExpanded = new Set(expandedPitches);
    if (newExpanded.has(changeId)) {
      newExpanded.delete(changeId);
    } else {
      newExpanded.add(changeId);
    }
    setExpandedPitches(newExpanded);
  };

  // Export all pitches as single document
  const exportAllPitches = async () => {
    if (!pitches || pitches.length === 0) return;

    const allPitchesText = pitches.map(pitch => {
      return `
=== ${pitch.category} ===

ZUSAMMENFASSUNG:
${pitch.summary}

FREUNDLICHER TON:
${pitch.tones.friendly}

NEUTRALER TON:
${pitch.tones.neutral}

BESTIMMTER TON:
${pitch.tones.firm}

---
`;
    }).join('\n');

    const blob = new Blob([allPitchesText], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    
    if (downloadLinkRef.current) {
      downloadLinkRef.current.href = url;
      downloadLinkRef.current.download = `pitches-${contractId}-${Date.now()}.txt`;
      downloadLinkRef.current.click();
    }

    window.URL.revokeObjectURL(url);
  };

  const toneConfig = {
    friendly: {
      icon: Heart,
      label: 'Freundlich',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      description: 'Kooperativ und einladend'
    },
    neutral: {
      icon: Scale,
      label: 'Neutral',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      description: 'Professionell und sachlich'
    },
    firm: {
      icon: Zap,
      label: 'Bestimmt',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      description: 'Direktiv und nachdrücklich'
    }
  };

  const canShowPitches = redraftResult && redraftResult.success && redraftResult.appliedChanges.length > 0;

  return (
    <div className={`pitch-viewer ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-blue-600" />
              Verhandlungs-Pitches
            </h3>
            
            {pitches && pitches.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBatchExport(!showBatchExport)}
                  className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Alle exportieren
                </button>
                
                <button
                  onClick={exportAllPitches}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="mt-2 text-sm text-gray-600">
            {!canShowPitches ? (
              'Führen Sie zuerst eine Auto-Neufassung durch, um Verhandlungsargumente zu generieren.'
            ) : !pitches ? (
              'Klicken Sie auf "Pitches laden", um für jede Änderung passende Verhandlungsargumente zu generieren.'
            ) : (
              `${pitches.length} Verhandlungsargument${pitches.length === 1 ? '' : 'e'} in 3 Tonarten generiert.`
            )}
          </div>
        </div>

        {/* Load Pitches Button */}
        {canShowPitches && !pitches && (
          <div className="p-6 text-center">
            <button
              onClick={onLoadPitches}
              disabled={isLoadingPitches}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center gap-2 mx-auto"
            >
              {isLoadingPitches ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generiere Pitches...
                </>
              ) : (
                <>
                  <MessageSquare className="w-5 h-5" />
                  Pitches laden ({redraftResult?.appliedChanges.length} Änderungen)
                </>
              )}
            </button>
            
            <p className="mt-2 text-sm text-gray-600">
              Für jede Änderung werden 3 Tonarten generiert: freundlich, neutral und bestimmt.
            </p>
          </div>
        )}

        {/* Tone Selector */}
        {pitches && pitches.length > 0 && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-center gap-4">
              <span className="text-sm font-medium text-gray-700">Hauptansicht:</span>
              {Object.entries(toneConfig).map(([tone, config]) => {
                const IconComponent = config.icon;
                return (
                  <button
                    key={tone}
                    onClick={() => setSelectedTone(tone as typeof selectedTone)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedTone === tone 
                        ? `${config.bgColor} ${config.color} ${config.borderColor} border` 
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Pitches List */}
        {pitches && pitches.length > 0 && (
          <div className="divide-y divide-gray-200">
            {pitches.map((pitch, index) => {
              const isExpanded = expandedPitches.has(pitch.changeId);
              const currentToneConfig = toneConfig[selectedTone];
              const currentToneText = pitch.tones[selectedTone];
              
              return (
                <div key={pitch.changeId} className="p-4">
                  {/* Pitch Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentToneConfig.bgColor}`}>
                        <span className="text-sm font-bold text-gray-700">{index + 1}</span>
                      </div>
                      
                      <div>
                        <h4 className="font-medium text-gray-900">{pitch.category}</h4>
                        <p className="text-sm text-gray-600">{pitch.summary}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => togglePitchExpansion(pitch.changeId)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Main Tone Display */}
                  <div className={`p-4 rounded-lg border ${currentToneConfig.borderColor} ${currentToneConfig.bgColor} mb-3`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <currentToneConfig.icon className={`w-4 h-4 ${currentToneConfig.color}`} />
                        <span className={`text-sm font-medium ${currentToneConfig.color}`}>
                          {currentToneConfig.label}
                        </span>
                        <span className="text-xs text-gray-500">• {currentToneConfig.description}</span>
                      </div>
                      
                      <button
                        onClick={() => copyToClipboard(currentToneText, `${pitch.changeId}-${selectedTone}`)}
                        className={`flex items-center gap-1 px-3 py-1 text-xs rounded-lg transition-colors ${
                          copyStates[`${pitch.changeId}-${selectedTone}`] 
                            ? 'bg-green-100 text-green-800' 
                            : 'hover:bg-white hover:bg-opacity-50'
                        }`}
                      >
                        {copyStates[`${pitch.changeId}-${selectedTone}`] ? (
                          <>
                            <Check className="w-3 h-3" />
                            Kopiert!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            Kopieren
                          </>
                        )}
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-800 whitespace-pre-wrap">
                      {currentToneText}
                    </div>
                  </div>

                  {/* All Tones (Expanded) */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-3"
                      >
                        {Object.entries(toneConfig).map(([tone, config]) => {
                          if (tone === selectedTone) return null; // Skip already shown tone
                          
                          const IconComponent = config.icon;
                          const toneText = pitch.tones[tone as keyof typeof pitch.tones];
                          
                          return (
                            <div key={tone} className={`p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <IconComponent className={`w-4 h-4 ${config.color}`} />
                                  <span className={`text-sm font-medium ${config.color}`}>
                                    {config.label}
                                  </span>
                                  <span className="text-xs text-gray-500">• {config.description}</span>
                                </div>
                                
                                <button
                                  onClick={() => copyToClipboard(toneText, `${pitch.changeId}-${tone}`)}
                                  className={`flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors ${
                                    copyStates[`${pitch.changeId}-${tone}`] 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'hover:bg-white hover:bg-opacity-50'
                                  }`}
                                >
                                  {copyStates[`${pitch.changeId}-${tone}`] ? (
                                    <>
                                      <Check className="w-3 h-3" />
                                      Kopiert!
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3 h-3" />
                                      Kopieren
                                    </>
                                  )}
                                </button>
                              </div>
                              
                              <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                {toneText}
                              </div>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!canShowPitches && (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Keine Änderungen verfügbar</p>
            <p className="text-sm">Führen Sie zuerst eine Vertragsoptimierung durch.</p>
          </div>
        )}
      </div>

      {/* Hidden download link */}
      <a ref={downloadLinkRef} style={{ display: 'none' }} />
    </div>
  );
};

export default PitchViewer;