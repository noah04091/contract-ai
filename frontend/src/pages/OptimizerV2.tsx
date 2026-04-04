import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LayoutGrid, List, GitCompareArrows, Download, ArrowLeft, ArrowUpDown, History, ChevronsDownUp, ChevronsUpDown, Search, X, BarChart3, FileText, ExternalLink, Loader2 } from 'lucide-react';
import { useOptimizerV2 } from '../hooks/useOptimizerV2';
import {
  UploadSection,
  AnalysisPipeline,
  ScoreDashboard,
  RedlineView,
  ClauseCard,
  NegotiationModeSelector,
  ExportPanel,
  CompareResults
} from '../components/optimizerV2';
import UnifiedPremiumNotice from '../components/UnifiedPremiumNotice';
import { apiCall } from '../utils/api';
import type { ActiveTab, ImportanceLevel, AnalysisResult, OptimizationMode, ChatMessage } from '../types/optimizerV2';
import { CATEGORY_LABELS } from '../types/optimizerV2';
import styles from '../styles/OptimizerV2.module.css';

const TAB_CONFIG: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Übersicht', icon: LayoutGrid },
  { key: 'clauses', label: 'Klauseln', icon: List },
  { key: 'redline', label: 'Redline', icon: GitCompareArrows },
  { key: 'compare', label: 'Vergleich', icon: BarChart3 },
  { key: 'export', label: 'Export', icon: Download }
];

const IMPORTANCE_RANK: Record<ImportanceLevel, number> = { critical: 3, high: 2, medium: 1, low: 0 };

export default function OptimizerV2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, actions } = useOptimizerV2();
  const [sortByImportance, setSortByImportance] = useState(false);
  const [focusClauseId, setFocusClauseId] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const loadingResultRef = useRef(false);

  const handleViewFile = useCallback(async (resultId: string) => {
    try {
      const data = await apiCall(`/optimizer-v2/results/${resultId}/view-file`) as { success?: boolean; url?: string };
      if (data?.success && data.url) {
        window.open(data.url, '_blank');
      }
    } catch {
      // File not available — silently fail
    }
  }, []);

  // Check auth + premium status
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { navigate('/login'); return; }
    (async () => {
      try {
        const data = await apiCall('/auth/me') as { user?: { subscriptionActive?: boolean } };
        setIsPremium(data.user?.subscriptionActive === true);
      } catch {
        setIsPremium(false);
      }
    })();
  }, [navigate]);

  // Load result from URL query param (?result=ID)
  useEffect(() => {
    const resultParam = searchParams.get('result');
    if (resultParam && state.status === 'idle' && !state.resultId && !loadingResultRef.current) {
      loadingResultRef.current = true;
      actions.loadResult(resultParam).finally(() => { loadingResultRef.current = false; });
    }
  }, [searchParams, state.status, state.resultId, actions]);

  // Pre-load contract file from contractId query param
  useEffect(() => {
    const contractId = searchParams.get('contractId');
    if (!contractId || state.file || state.status !== 'idle') return;
    (async () => {
      try {
        const token = localStorage.getItem('token');
        // Get contract info
        const contractData = await apiCall(`/contracts/${contractId}`) as { contract?: { fileName?: string; s3Key?: string } };
        const contract = contractData?.contract;
        if (!contract?.s3Key) return;
        // Get presigned URL
        const s3Res = await fetch(`/api/s3/view?contractId=${contractId}&type=original`, {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          credentials: 'include'
        });
        if (!s3Res.ok) return;
        const s3Data = await s3Res.json();
        const fileUrl = s3Data.fileUrl || s3Data.url;
        if (!fileUrl) return;
        // Download file as blob
        const fileRes = await fetch(fileUrl);
        if (!fileRes.ok) return;
        const blob = await fileRes.blob();
        const fileName = contract.fileName || 'vertrag.pdf';
        const mimeType = fileName.endsWith('.docx')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/pdf';
        const file = new File([blob], fileName, { type: mimeType });
        actions.setFile(file);
      } catch {
        // Silent fail — user can still upload manually
      }
    })();
  }, [searchParams, state.file, state.status, actions]);

  const {
    file, status, progress, progressMessage, stages,
    result, resultId, activeMode, activeTab,
    clauseChats, error, duplicateInfo
  } = state;

  const handleDuplicateGoToResult = useCallback(() => {
    if (duplicateInfo?.existingResultId) {
      actions.dismissDuplicate();
      actions.loadResult(duplicateInfo.existingResultId);
    }
  }, [duplicateInfo, actions]);

  const handleDuplicateNewAnalysis = useCallback(() => {
    if (file) {
      actions.dismissDuplicate();
      actions.startAnalysis(file, 'neutral', true);
    }
  }, [file, actions]);

  return (
    <>
      <Helmet>
        <title>Contract Intelligence - Contract AI</title>
      </Helmet>

      {isPremium === false && (
        <UnifiedPremiumNotice
          featureName="Contract Intelligence"
          variant="fullWidth"
        />
      )}

      {/* Duplicate Detection Modal */}
      {duplicateInfo && (
        <div className={styles.modalOverlay} onClick={actions.dismissDuplicate}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <History size={40} style={{ color: '#007AFF', marginBottom: 12 }} />
              <h3 style={{ margin: '0 0 8px', fontSize: '1.2rem', color: '#111' }}>Vertrag bereits analysiert</h3>
              <p style={{ margin: 0, color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {duplicateInfo.existingContractType
                  ? `Dieser ${duplicateInfo.existingContractType} wurde bereits am ${new Date(duplicateInfo.existingCreatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} analysiert.`
                  : `Dieser Vertrag wurde bereits am ${new Date(duplicateInfo.existingCreatedAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })} analysiert.`
                }
              </p>
              {duplicateInfo.existingScore > 0 && (
                <p style={{ margin: '8px 0 0', color: '#111', fontSize: '0.95rem', fontWeight: 600 }}>
                  Score: {duplicateInfo.existingScore}/100
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className={styles.duplicateBtnPrimary} onClick={handleDuplicateGoToResult}>
                Zu den Ergebnissen
              </button>
              <button className={styles.duplicateBtnSecondary} onClick={handleDuplicateNewAnalysis}>
                Neue Analyse starten
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`${styles.pageContainer} ${(status === 'idle' || status === 'uploading') ? styles.pageContainerUpload : ''}`}>
        {/* Historie button floating top-right in upload state */}
        {(status === 'idle' || status === 'uploading') && (
          <div className={styles.uploadHistoryBtn}>
            <button className={styles.backButton} onClick={() => navigate('/optimizer-history')}>
              <History size={14} /> Historie
            </button>
          </div>
        )}

        {/* Full page header for non-upload states */}
        {status !== 'idle' && status !== 'uploading' && (
          <div className={styles.pageHeader}>
            <button className={styles.backButton} onClick={() => navigate('/optimizer-history')}>
              <ArrowLeft size={16} /> Historie
            </button>
            <div className={styles.pageHeaderContent}>
              <h1 className={styles.pageTitle}>Contract Intelligence</h1>
              {result?.fileName ? (
                <p className={styles.pageSubtitle}>
                  <button
                    className={styles.pageFileLink}
                    onClick={() => resultId && handleViewFile(resultId)}
                    title="Original-Dokument in neuem Tab öffnen"
                  >
                    <FileText size={13} />
                    {result.fileName}
                    <ExternalLink size={11} className={styles.pageFileLinkIcon} />
                  </button>
                  {result.structure?.contractTypeLabel && (
                    <span className={styles.pageHeaderType}>{result.structure.contractTypeLabel}</span>
                  )}
                </p>
              ) : (
                <p className={styles.pageSubtitle}>
                  KI-gestützte Vertragsanalyse und -optimierung
                </p>
              )}
            </div>
            <button className={styles.newAnalysisBtn} onClick={() => { actions.reset(); navigate('/optimizer', { replace: true }); }}>
              Neue Analyse
            </button>
          </div>
        )}

        {/* Loading saved result */}
        {loadingResultRef.current && status === 'idle' && (
          <div className={styles.pipelineContainer} style={{ textAlign: 'center', padding: '48px 24px' }}>
            <Loader2 size={32} className={styles.spinIcon} style={{ margin: '0 auto 16px', display: 'block', color: '#007AFF' }} />
            <p style={{ color: '#6B7280', fontSize: 14 }}>Gespeicherte Analyse wird geladen...</p>
          </div>
        )}

        {/* Upload state */}
        {(status === 'idle' || status === 'uploading') && !loadingResultRef.current && (
          <UploadSection
            file={file}
            onFileSelect={actions.setFile}
            onStartAnalysis={actions.startAnalysis}
            isAnalyzing={status === 'uploading'}
            disabled={isPremium === false}
          />
        )}

        {/* Analysis in progress or error */}
        {(status === 'analyzing' || status === 'error') && (
          <AnalysisPipeline
            stages={stages}
            progress={progress}
            message={progressMessage}
            error={status === 'error' ? error : null}
            onCancel={actions.reset}
            onRetry={status === 'error' && file ? () => actions.startAnalysis(file) : undefined}
          />
        )}

        {/* Results */}
        {status === 'completed' && result && resultId && (
          <div className={styles.resultsContainer}>
            {/* Tab navigation */}
            <div className={styles.tabNavigation}>
              {TAB_CONFIG.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  className={`${styles.tabButton} ${activeTab === key ? styles.tabButtonActive : ''}`}
                  onClick={() => actions.setTab(key)}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {activeTab === 'overview' && (
              <ScoreDashboard
                scores={result.scores}
                result={result}
                structure={result.structure}
                onNavigate={(tab, clauseId) => {
                  actions.setTab(tab as ActiveTab);
                  if (clauseId) setFocusClauseId(clauseId);
                }}
              />
            )}

            {/* Clauses tab */}
            {activeTab === 'clauses' && (
              <ClausesTab
                result={result}
                activeMode={activeMode}
                clauseChats={clauseChats}
                actions={actions}
                sortByImportance={sortByImportance}
                onToggleSort={() => setSortByImportance(s => !s)}
                focusClauseId={focusClauseId}
                onFocusHandled={() => setFocusClauseId(null)}
              />
            )}

            {/* Redline tab - kept here */}
            {activeTab === 'redline' && (
              <RedlineView
                clauses={result.clauses}
                optimizations={result.optimizations}
                clauseAnalyses={result.clauseAnalyses}
                activeMode={activeMode}
                onModeChange={actions.switchMode}
                onClauseClick={(id) => { actions.selectClause(id); actions.setTab('clauses'); }}
                resultId={result.resultId}
              />
            )}

            {/* Compare tab */}
            {activeTab === 'compare' && (
              <CompareResults currentResult={result} />
            )}

            {/* Export tab */}
            {activeTab === 'export' && (
              <ExportPanel
                result={result}
                userSelections={state.userSelections}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ── Clauses Tab with Importance Sorting ──
interface ClausesTabProps {
  result: AnalysisResult;
  activeMode: OptimizationMode;
  clauseChats: Map<string, ChatMessage[]>;
  actions: ReturnType<typeof useOptimizerV2>['actions'];
  sortByImportance: boolean;
  onToggleSort: () => void;
  focusClauseId?: string | null;
  onFocusHandled?: () => void;
}

function ClausesTab({ result, activeMode, clauseChats, actions, sortByImportance, onToggleSort, focusClauseId, onFocusHandled }: ClausesTabProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const allExpanded = expandedIds.size === result.clauses.length;

  // Auto-expand and scroll to focused clause
  useEffect(() => {
    if (!focusClauseId) return;
    setExpandedIds(prev => new Set(prev).add(focusClauseId));
    onFocusHandled?.();
    // Small delay to let the card expand before scrolling
    setTimeout(() => {
      const el = document.getElementById(`clause-${focusClauseId}`);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }, [focusClauseId, onFocusHandled]);

  const toggleClause = (clauseId: string | null) => {
    if (!clauseId) return;
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(clauseId)) next.delete(clauseId);
      else next.add(clauseId);
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpandedIds(new Set());
    } else {
      setExpandedIds(new Set(result.clauses.map(c => c.id)));
    }
  };

  const sortedClauses = useMemo(() => {
    if (!sortByImportance) return result.clauses;
    const analysisMap = new Map(result.clauseAnalyses.map(a => [a.clauseId, a]));
    return [...result.clauses].sort((a, b) => {
      const impA = IMPORTANCE_RANK[analysisMap.get(a.id)?.importanceLevel || 'medium'];
      const impB = IMPORTANCE_RANK[analysisMap.get(b.id)?.importanceLevel || 'medium'];
      return impB - impA;
    });
  }, [result.clauses, result.clauseAnalyses, sortByImportance]);

  const filteredClauses = useMemo(() => {
    if (!searchTerm.trim()) return sortedClauses;
    const term = searchTerm.toLowerCase().trim();
    return sortedClauses.filter(clause => {
      const titleMatch = clause.title?.toLowerCase().includes(term);
      const sectionMatch = clause.sectionNumber?.toLowerCase().includes(term);
      const categoryMatch = clause.category?.toLowerCase().includes(term);
      const categoryLabel = CATEGORY_LABELS[clause.category]?.toLowerCase();
      const labelMatch = categoryLabel?.includes(term);
      return titleMatch || sectionMatch || categoryMatch || labelMatch;
    });
  }, [sortedClauses, searchTerm]);

  return (
    <div className={styles.clausesContainer}>
      <div className={styles.clausesModeRow}>
        <div className={styles.clauseSearchWrap}>
          <Search size={13} className={styles.clauseSearchIcon} />
          <input
            type="text"
            className={styles.clauseSearch}
            placeholder="Klausel suchen..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <button className={styles.clauseSearchClear} onClick={() => setSearchTerm('')} title="Suche zurücksetzen">
              <X size={12} />
            </button>
          )}
        </div>
        {searchTerm.trim() && (
          <span className={styles.clauseSearchCount}>
            {filteredClauses.length} von {sortedClauses.length} Klauseln
          </span>
        )}
        <button
          className={`${styles.sortToggle} ${sortByImportance ? styles.sortToggleActive : ''}`}
          onClick={onToggleSort}
          title={sortByImportance ? 'Originalreihenfolge' : 'Nach Priorität sortieren'}
        >
          <ArrowUpDown size={13} />
          {sortByImportance ? 'Priorität' : 'Original'}
        </button>
        <button
          className={styles.sortToggle}
          onClick={toggleAll}
          title={allExpanded ? 'Alle zuklappen' : 'Alle aufklappen'}
        >
          {allExpanded ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
          {allExpanded ? 'Zuklappen' : 'Alle öffnen'}
        </button>
        <NegotiationModeSelector
          activeMode={activeMode}
          onModeChange={actions.switchMode}
          compact
        />
      </div>

      <div className={styles.clauseList}>
        {filteredClauses.length === 0 && searchTerm.trim() && (
          <div className={styles.clauseEmptyState}>
            <Search size={20} />
            <p>Keine Klauseln für &bdquo;{searchTerm}&ldquo; gefunden</p>
          </div>
        )}
        {filteredClauses.map(clause => {
          const analysis = result.clauseAnalyses.find(a => a.clauseId === clause.id);
          const optimization = result.optimizations.find(o => o.clauseId === clause.id);
          const score = result.scores.perClause.find(s => s.clauseId === clause.id);
          const chatMsgs = clauseChats.get(clause.id) || [];

          return (
            <ClauseCard
              key={clause.id}
              clause={clause}
              analysis={analysis}
              optimization={optimization}
              score={score}
              activeMode={activeMode}
              isSelected={expandedIds.has(clause.id)}
              onSelect={toggleClause}
              onAcceptVersion={actions.saveSelection}
              chatMessages={chatMsgs}
              onSendChat={actions.sendClauseChat}
            />
          );
        })}
      </div>
    </div>
  );
}
