// 📁 frontend/src/components/DiffViewer.tsx
// 🎯 PREMIUM: Diff-Viewer Component für Contract AI Optimizer
// 
// Zweck: Visualisiert Unterschiede zwischen Original- und optimierter Version
// Features: Toggle für Teilübernahme, Side-by-Side-Ansicht, Change-Highlighting

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Check, 
  X, 
  FileText, 
  ToggleLeft,
  Copy,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { DiffBlock, AppliedChange, AcceptanceConfig } from '../types/optimizer';

interface DiffViewerProps {
  diffBlocks: DiffBlock[];
  appliedChanges: AppliedChange[];
  onAcceptanceChange: (config: AcceptanceConfig) => void;
  acceptanceConfig: AcceptanceConfig;
  className?: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  diffBlocks,
  appliedChanges,
  onAcceptanceChange,
  acceptanceConfig,
  className = ''
}) => {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [showOnlyChanges, setShowOnlyChanges] = useState(false);
  const [expandedChanges, setExpandedChanges] = useState<Set<string>>(new Set());
  const [copiedChangeId, setCopiedChangeId] = useState<string | null>(null);

  // Memoized accepted/rejected IDs
  const acceptedIds = useMemo(() => 
    new Set(acceptanceConfig.acceptedIds || []), 
    [acceptanceConfig.acceptedIds]
  );
  
  const rejectedIds = useMemo(() => 
    new Set(acceptanceConfig.rejectedIds || []), 
    [acceptanceConfig.rejectedIds]
  );

  // Toggle change acceptance
  const toggleChangeAcceptance = (changeId: string) => {
    const newAcceptedIds = new Set(acceptedIds);
    const newRejectedIds = new Set(rejectedIds);

    if (acceptedIds.has(changeId)) {
      // Currently accepted -> reject
      newAcceptedIds.delete(changeId);
      newRejectedIds.add(changeId);
    } else if (rejectedIds.has(changeId)) {
      // Currently rejected -> neutral (use default)
      newRejectedIds.delete(changeId);
    } else {
      // Currently neutral -> accept
      newAcceptedIds.add(changeId);
    }

    onAcceptanceChange({
      ...acceptanceConfig,
      acceptedIds: Array.from(newAcceptedIds),
      rejectedIds: Array.from(newRejectedIds)
    });
  };

  // Get change status
  const getChangeStatus = useCallback((changeId: string): 'accepted' | 'rejected' | 'default' => {
    if (acceptedIds.has(changeId)) return 'accepted';
    if (rejectedIds.has(changeId)) return 'rejected';
    return 'default';
  }, [acceptedIds, rejectedIds]);

  // Toggle change details expansion
  const toggleChangeExpansion = (changeId: string) => {
    const newExpanded = new Set(expandedChanges);
    if (newExpanded.has(changeId)) {
      newExpanded.delete(changeId);
    } else {
      newExpanded.add(changeId);
    }
    setExpandedChanges(newExpanded);
  };

  // Copy change text
  const copyChangeText = async (text: string, changeId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedChangeId(changeId);
      setTimeout(() => setCopiedChangeId(null), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  };

  // Filter blocks if showing only changes
  const visibleBlocks = useMemo(() => {
    if (!showOnlyChanges) return diffBlocks;
    return diffBlocks.filter(block => block.type === 'changed');
  }, [diffBlocks, showOnlyChanges]);

  // Statistics
  const stats = useMemo(() => {
    const totalChanges = appliedChanges.length;
    const acceptedCount = appliedChanges.filter(change => 
      getChangeStatus(change.id) === 'accepted'
    ).length;
    const rejectedCount = appliedChanges.filter(change => 
      getChangeStatus(change.id) === 'rejected'
    ).length;
    const defaultCount = totalChanges - acceptedCount - rejectedCount;

    return { totalChanges, acceptedCount, rejectedCount, defaultCount };
  }, [appliedChanges, getChangeStatus]);

  return (
    <div className={`diff-viewer ${className}`}>
      {/* Controls Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Diff-Ansicht
            </h3>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode(viewMode === 'side-by-side' ? 'unified' : 'side-by-side')}
                className="px-3 py-1 text-sm border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {viewMode === 'side-by-side' ? 'Side-by-Side' : 'Unified'}
              </button>
              
              <button
                onClick={() => setShowOnlyChanges(!showOnlyChanges)}
                className={`px-3 py-1 text-sm border rounded-lg transition-colors flex items-center gap-1 ${
                  showOnlyChanges 
                    ? 'bg-blue-50 border-blue-200 text-blue-700' 
                    : 'hover:bg-gray-50'
                }`}
              >
                {showOnlyChanges ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                Nur Änderungen
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-100 border border-green-300 rounded"></div>
              <span>Akzeptiert: {stats.acceptedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-100 border border-red-300 rounded"></div>
              <span>Abgelehnt: {stats.rejectedCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-100 border border-gray-300 rounded"></div>
              <span>Standard: {stats.defaultCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Diff Content */}
      <div className="space-y-4">
        {visibleBlocks.map((block, index) => (
          <DiffBlock 
            key={`${block.type}-${index}`}
            block={block}
            viewMode={viewMode}
            onToggleAcceptance={toggleChangeAcceptance}
            onToggleExpansion={toggleChangeExpansion}
            onCopyText={copyChangeText}
            getChangeStatus={getChangeStatus}
            isExpanded={expandedChanges.has(block.changeId || '')}
            copiedChangeId={copiedChangeId}
          />
        ))}

        {visibleBlocks.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Keine Änderungen zum Anzeigen</p>
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {stats.totalChanges > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">
            <strong>Zusammenfassung:</strong> {stats.totalChanges} Änderungen insgesamt
            {stats.acceptedCount > 0 && ` • ${stats.acceptedCount} akzeptiert`}
            {stats.rejectedCount > 0 && ` • ${stats.rejectedCount} abgelehnt`}
            {stats.defaultCount > 0 && ` • ${stats.defaultCount} Standard-Behandlung`}
          </div>
        </div>
      )}
    </div>
  );
};

interface DiffBlockProps {
  block: DiffBlock;
  viewMode: 'side-by-side' | 'unified';
  onToggleAcceptance: (changeId: string) => void;
  onToggleExpansion: (changeId: string) => void;
  onCopyText: (text: string, changeId: string) => void;
  getChangeStatus: (changeId: string) => 'accepted' | 'rejected' | 'default';
  isExpanded: boolean;
  copiedChangeId: string | null;
}

const DiffBlock: React.FC<DiffBlockProps> = ({
  block,
  viewMode,
  onToggleAcceptance,
  onToggleExpansion,
  onCopyText,
  getChangeStatus,
  isExpanded,
  copiedChangeId
}) => {
  if (block.type === 'unchanged') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="text-sm text-gray-600 mb-2">
          <span className="font-medium">Zeile {block.lineStart}</span> (unverändert)
        </div>
        <div className="text-gray-700 whitespace-pre-wrap font-mono text-sm">
          {block.content?.substring(0, 200)}
          {(block.content?.length || 0) > 200 && '...'}
        </div>
      </div>
    );
  }

  // Changed block
  const changeId = block.changeId!;
  const status = getChangeStatus(changeId);
  const statusColors = {
    accepted: 'border-green-300 bg-green-50',
    rejected: 'border-red-300 bg-red-50',
    default: 'border-blue-300 bg-blue-50'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-lg p-4 ${statusColors[status]}`}
    >
      {/* Change Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">
            Zeile {block.lineStart} • {block.category}
          </span>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            status === 'accepted' ? 'bg-green-100 text-green-800' :
            status === 'rejected' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {status === 'accepted' ? 'Akzeptiert' :
             status === 'rejected' ? 'Abgelehnt' :
             'Standard'}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onToggleAcceptance(changeId)}
            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              status === 'accepted' ? 'bg-green-200 text-green-800 hover:bg-green-300' :
              status === 'rejected' ? 'bg-red-200 text-red-800 hover:bg-red-300' :
              'bg-blue-200 text-blue-800 hover:bg-blue-300'
            }`}
          >
            {status === 'accepted' ? (
              <Check className="w-4 h-4" />
            ) : status === 'rejected' ? (
              <X className="w-4 h-4" />
            ) : (
              <ToggleLeft className="w-4 h-4" />
            )}
            {status === 'accepted' ? 'Übernehmen' :
             status === 'rejected' ? 'Ablehnen' :
             'Standard'}
          </button>

          <button
            onClick={() => onToggleExpansion(changeId)}
            className="p-1 hover:bg-white hover:bg-opacity-50 rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Change Content */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-xs font-medium text-gray-600 mb-2 flex items-center justify-between">
              Original
              <button
                onClick={() => onCopyText(block.original || '', changeId + '-original')}
                className="flex items-center gap-1 px-2 py-1 hover:bg-white hover:bg-opacity-50 rounded text-xs transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copiedChangeId === changeId + '-original' ? 'Kopiert!' : 'Kopieren'}
              </button>
            </div>
            <div className="bg-red-50 border border-red-200 p-3 rounded text-sm font-mono whitespace-pre-wrap">
              {block.original === 'FEHLT' ? (
                <em className="text-red-600">Diese Klausel fehlt im ursprünglichen Vertrag</em>
              ) : (
                block.original?.substring(0, isExpanded ? undefined : 200) +
                (!isExpanded && (block.original?.length || 0) > 200 ? '...' : '')
              )}
            </div>
          </div>
          
          <div>
            <div className="text-xs font-medium text-gray-600 mb-2 flex items-center justify-between">
              Optimiert
              <button
                onClick={() => onCopyText(block.improved || '', changeId + '-improved')}
                className="flex items-center gap-1 px-2 py-1 hover:bg-white hover:bg-opacity-50 rounded text-xs transition-colors"
              >
                <Copy className="w-3 h-3" />
                {copiedChangeId === changeId + '-improved' ? 'Kopiert!' : 'Kopieren'}
              </button>
            </div>
            <div className="bg-green-50 border border-green-200 p-3 rounded text-sm font-mono whitespace-pre-wrap">
              {block.improved?.substring(0, isExpanded ? undefined : 200) +
               (!isExpanded && (block.improved?.length || 0) > 200 ? '...' : '')}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-red-50 border border-red-200 p-3 rounded">
            <div className="text-xs font-medium text-red-600 mb-1">- Original</div>
            <div className="text-sm font-mono whitespace-pre-wrap line-through text-red-800">
              {block.original === 'FEHLT' ? (
                <em>Diese Klausel fehlt im ursprünglichen Vertrag</em>
              ) : (
                block.original?.substring(0, isExpanded ? undefined : 200) +
                (!isExpanded && (block.original?.length || 0) > 200 ? '...' : '')
              )}
            </div>
          </div>
          
          <div className="bg-green-50 border border-green-200 p-3 rounded">
            <div className="text-xs font-medium text-green-600 mb-1">+ Optimiert</div>
            <div className="text-sm font-mono whitespace-pre-wrap text-green-800">
              {block.improved?.substring(0, isExpanded ? undefined : 200) +
               (!isExpanded && (block.improved?.length || 0) > 200 ? '...' : '')}
            </div>
          </div>
        </div>
      )}

      {/* Reasoning (if expanded) */}
      <AnimatePresence>
        {isExpanded && block.reasoning && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 pt-3 border-t border-gray-300"
          >
            <div className="text-xs font-medium text-gray-600 mb-2">Begründung:</div>
            <div className="text-sm text-gray-700">
              {block.reasoning}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default DiffViewer;