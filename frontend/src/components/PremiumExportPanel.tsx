// 📁 frontend/src/components/PremiumExportPanel.tsx
// 🎯 PREMIUM: Export Panel für Clean PDF, Redline PDF & Executive Summary
// 
// Zweck: Bietet erweiterte Export-Optionen für Premium-Nutzer
// Features: Clean PDF, Redline PDF, Executive Summary, Progress-Tracking

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Download, 
  FileText, 
  Eye, 
  BarChart3, 
  Loader2, 
  CheckCircle, 
  AlertCircle,
  Settings,
  Archive,
  ChevronDown
} from 'lucide-react';
import type { RedraftResult } from '../types/optimizer';

interface PremiumExportPanelProps {
  contractId: string;
  redraftResult: RedraftResult | null;
  contractName: string;
  className?: string;
  onExportStart?: () => void;
  onExportComplete?: (type: string, success: boolean) => void;
}

interface ExportProgress {
  type: 'clean-pdf' | 'redline-pdf' | 'executive-summary' | null;
  progress: number;
  status: 'idle' | 'preparing' | 'generating' | 'downloading' | 'complete' | 'error';
  error?: string;
}

const PremiumExportPanel: React.FC<PremiumExportPanelProps> = ({
  contractId,
  redraftResult,
  contractName,
  className = '',
  onExportStart,
  onExportComplete
}) => {
  const [exportProgress, setExportProgress] = useState<ExportProgress>({
    type: null,
    progress: 0,
    status: 'idle'
  });
  
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    includeWatermark: true,
    includeSignatureFields: true,
    pdfQuality: 'high' as 'standard' | 'high' | 'print',
    includeMetadata: true
  });

  const downloadLinkRef = useRef<HTMLAnchorElement>(null);

  // Generic export function
  const performExport = async (
    exportType: 'clean-pdf' | 'redline-pdf' | 'executive-summary',
    endpoint: string,
    payload: Record<string, unknown>,
    filename: string
  ) => {
    if (!redraftResult) return;

    setExportProgress({
      type: exportType,
      progress: 0,
      status: 'preparing'
    });

    onExportStart?.();

    try {
      // Simulate progress steps
      const progressSteps = [
        { progress: 20, status: 'preparing' as const, delay: 300 },
        { progress: 60, status: 'generating' as const, delay: 800 },
        { progress: 90, status: 'downloading' as const, delay: 500 }
      ];

      for (const step of progressSteps) {
        setExportProgress(prev => ({
          ...prev,
          progress: step.progress,
          status: step.status
        }));
        await new Promise(resolve => setTimeout(resolve, step.delay));
      }

      // Actual API call
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': document.cookie.includes('token=') 
            ? `Bearer ${document.cookie.split('token=')[1].split(';')[0]}` 
            : ''
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Export failed: ${response.statusText}`);
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      if (downloadLinkRef.current) {
        downloadLinkRef.current.href = url;
        downloadLinkRef.current.download = filename;
        downloadLinkRef.current.click();
      }

      window.URL.revokeObjectURL(url);

      setExportProgress({
        type: exportType,
        progress: 100,
        status: 'complete'
      });

      setTimeout(() => {
        setExportProgress({ type: null, progress: 0, status: 'idle' });
      }, 3000);

      onExportComplete?.(exportType, true);

    } catch (error) {
      console.error(`${exportType} export error:`, error);
      
      setExportProgress({
        type: exportType,
        progress: 0,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unbekannter Fehler'
      });

      setTimeout(() => {
        setExportProgress({ type: null, progress: 0, status: 'idle' });
      }, 5000);

      onExportComplete?.(exportType, false);
    }
  };

  // Export Clean PDF
  const exportCleanPDF = async () => {
    await performExport(
      'clean-pdf',
      `/api/optimized-contract/${contractId}/export/clean-pdf`,
      {
        optimizedText: redraftResult?.optimizedText,
        metadata: {
          title: contractName,
          type: redraftResult?.metadata?.acceptanceConfig || 'Optimierter Vertrag',
          version: redraftResult?.metadata?.redraftingVersion || '1.0',
          includeWatermark: exportOptions.includeWatermark,
          includeSignatureFields: exportOptions.includeSignatureFields,
          quality: exportOptions.pdfQuality
        }
      },
      `${contractName.replace(/[^a-zA-Z0-9]/g, '-')}-optimiert-${Date.now()}.pdf`
    );
  };

  // Export Redline PDF
  const exportRedlinePDF = async () => {
    await performExport(
      'redline-pdf',
      `/api/optimized-contract/${contractId}/export/redline-pdf`,
      {
        originalText: redraftResult?.originalText,
        optimizedText: redraftResult?.optimizedText,
        changes: redraftResult?.appliedChanges,
        metadata: {
          title: contractName,
          type: 'Redline-Analyse',
          version: `${redraftResult?.metadata?.redraftingVersion || '1.0'}-REDLINE`,
          includeWatermark: exportOptions.includeWatermark
        }
      },
      `${contractName.replace(/[^a-zA-Z0-9]/g, '-')}-redline-${Date.now()}.pdf`
    );
  };

  // Export Executive Summary
  const exportExecutiveSummary = async () => {
    await performExport(
      'executive-summary',
      `/api/optimized-contract/${contractId}/export/executive-summary`,
      {
        summaryData: redraftResult?.executiveSummary,
        metadata: {
          title: contractName,
          contractName: contractName,
          includeMetadata: exportOptions.includeMetadata
        }
      },
      `executive-summary-${contractName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`
    );
  };

  const isExporting = exportProgress.status !== 'idle';
  const canExport = redraftResult && redraftResult.success;

  return (
    <div className={`premium-export-panel ${className}`}>
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Archive className="w-5 h-5 text-blue-600" />
              Premium Export
            </h3>
            
            <button
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Settings className="w-4 h-4" />
              Optionen
              <ChevronDown className={`w-4 h-4 transition-transform ${showAdvancedOptions ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {!canExport && (
            <div className="mt-2 text-sm text-amber-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Führen Sie zuerst eine Auto-Neufassung durch, um Export-Optionen zu aktivieren.
            </div>
          )}
        </div>

        {/* Advanced Options */}
        <AnimatePresence>
          {showAdvancedOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="border-b border-gray-200"
            >
              <div className="p-4 bg-gray-50">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Export-Einstellungen</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeWatermark}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeWatermark: e.target.checked
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Wasserzeichen einfügen</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeSignatureFields}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeSignatureFields: e.target.checked
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Unterschrift-Felder</span>
                  </label>

                  <div>
                    <label className="text-sm text-gray-700 mb-1 block">PDF-Qualität</label>
                    <select
                      value={exportOptions.pdfQuality}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        pdfQuality: e.target.value as 'standard' | 'high' | 'print'
                      }))}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                    >
                      <option value="standard">Standard</option>
                      <option value="high">Hoch</option>
                      <option value="print">Druck-Qualität</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeMetadata}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeMetadata: e.target.checked
                      }))}
                      className="rounded border-gray-300"
                    />
                    <span className="text-sm text-gray-700">Metadaten einbetten</span>
                  </label>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Export Options */}
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Clean PDF */}
            <div className="export-option">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Clean PDF</h4>
                    <p className="text-sm text-gray-600">Finale optimierte Version</p>
                  </div>
                </div>
                
                <ul className="text-xs text-gray-600 space-y-1 mb-4">
                  <li>• Versandbereit ohne Markierungen</li>
                  <li>• Professionelles Layout</li>
                  <li>• Unterschrift-Felder optional</li>
                </ul>

                <button
                  onClick={exportCleanPDF}
                  disabled={!canExport || (isExporting && exportProgress.type !== 'clean-pdf')}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isExporting && exportProgress.type === 'clean-pdf' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {exportProgress.progress}%
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Exportieren
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Redline PDF */}
            <div className="export-option">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-orange-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Eye className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Redline PDF</h4>
                    <p className="text-sm text-gray-600">Änderungen markiert</p>
                  </div>
                </div>
                
                <ul className="text-xs text-gray-600 space-y-1 mb-4">
                  <li>• Alle Änderungen sichtbar</li>
                  <li>• Legende für Markierungen</li>
                  <li>• Verhandlungsgrundlage</li>
                </ul>

                <button
                  onClick={exportRedlinePDF}
                  disabled={!canExport || (isExporting && exportProgress.type !== 'redline-pdf')}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isExporting && exportProgress.type === 'redline-pdf' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {exportProgress.progress}%
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Exportieren
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="export-option">
              <div className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">Executive Summary</h4>
                    <p className="text-sm text-gray-600">Management-Bericht</p>
                  </div>
                </div>
                
                <ul className="text-xs text-gray-600 space-y-1 mb-4">
                  <li>• Health Score Dashboard</li>
                  <li>• Top-Risiken & Quick Wins</li>
                  <li>• Handlungsempfehlungen</li>
                </ul>

                <button
                  onClick={exportExecutiveSummary}
                  disabled={!canExport || (isExporting && exportProgress.type !== 'executive-summary')}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {isExporting && exportProgress.type === 'executive-summary' ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {exportProgress.progress}%
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Exportieren
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Progress Display */}
          {isExporting && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200"
            >
              <div className="flex items-center gap-3">
                {exportProgress.status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                ) : exportProgress.status === 'complete' ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                )}
                
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">
                    {exportProgress.status === 'error' ? 'Export fehlgeschlagen' :
                     exportProgress.status === 'complete' ? 'Export abgeschlossen' :
                     exportProgress.status === 'preparing' ? 'Bereite Export vor...' :
                     exportProgress.status === 'generating' ? 'Generiere PDF...' :
                     exportProgress.status === 'downloading' ? 'Download startet...' :
                     'Exportiere...'}
                  </div>
                  
                  {exportProgress.error ? (
                    <div className="text-sm text-red-600">{exportProgress.error}</div>
                  ) : exportProgress.status !== 'complete' ? (
                    <div className="w-full bg-white rounded-full h-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${exportProgress.progress}%` }}
                      />
                    </div>
                  ) : (
                    <div className="text-sm text-green-600">Download erfolgreich gestartet</div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Statistics */}
          {canExport && redraftResult && (
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                <strong>Export-Statistiken:</strong> {redraftResult.stats.appliedChanges} Änderungen übernommen
                • {redraftResult.stats.successRate}% Erfolgsquote
                • {Math.round((redraftResult.optimizedText.length - redraftResult.originalText.length) / 1000)}k Zeichen hinzugefügt
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden download link */}
      <a ref={downloadLinkRef} style={{ display: 'none' }} />
    </div>
  );
};

export default PremiumExportPanel;