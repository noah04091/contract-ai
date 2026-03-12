import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LayoutGrid, List, GitCompareArrows, Download, ArrowLeft, ArrowUpDown, History } from 'lucide-react';
import { useOptimizerV2 } from '../hooks/useOptimizerV2';
import {
  UploadSection,
  AnalysisPipeline,
  ScoreDashboard,
  RedlineView,
  ClauseCard,
  NegotiationModeSelector,
  ExportPanel
} from '../components/optimizerV2';
import type { ActiveTab, ImportanceLevel, AnalysisResult, OptimizationMode, ChatMessage } from '../types/optimizerV2';
import styles from '../styles/OptimizerV2.module.css';

const TAB_CONFIG: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Übersicht', icon: LayoutGrid },
  { key: 'clauses', label: 'Klauseln', icon: List },
  { key: 'redline', label: 'Redline', icon: GitCompareArrows },
  { key: 'export', label: 'Export', icon: Download }
];

const IMPORTANCE_RANK: Record<ImportanceLevel, number> = { critical: 3, high: 2, medium: 1, low: 0 };

export default function OptimizerV2() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { state, actions } = useOptimizerV2();
  const [sortByImportance, setSortByImportance] = useState(false);

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
  }, [navigate]);

  // Load result from URL query param (?result=ID)
  useEffect(() => {
    const resultParam = searchParams.get('result');
    if (resultParam && state.status === 'idle' && !state.resultId) {
      actions.loadResult(resultParam);
    }
  }, [searchParams, state.status, state.resultId, actions]);

  const {
    file, status, progress, progressMessage, stages,
    result, resultId, activeMode, activeTab, selectedClauseId,
    clauseChats, error
  } = state;

  return (
    <>
      <Helmet>
        <title>Optimizer V2 - Contract AI</title>
      </Helmet>

      <div className={styles.pageContainer}>
        {/* Page header */}
        <div className={styles.pageHeader}>
          <button className={styles.backButton} onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} /> Dashboard
          </button>
          <div className={styles.pageHeaderContent}>
            <h1 className={styles.pageTitle}>Contract Optimizer</h1>
            <p className={styles.pageSubtitle}>
              KI-gestützte Vertragsanalyse und -optimierung
            </p>
          </div>
          <button className={styles.backButton} onClick={() => navigate('/optimizer-history')}>
            <History size={14} /> Historie
          </button>
          {status === 'completed' && (
            <button className={styles.newAnalysisBtn} onClick={actions.reset}>
              Neue Analyse
            </button>
          )}
        </div>

        {/* Upload state */}
        {(status === 'idle' || status === 'uploading') && (
          <UploadSection
            file={file}
            onFileSelect={actions.setFile}
            onStartAnalysis={actions.startAnalysis}
            isAnalyzing={status === 'uploading'}
          />
        )}

        {/* Analysis in progress */}
        {status === 'analyzing' && (
          <AnalysisPipeline
            stages={stages}
            progress={progress}
            message={progressMessage}
            onCancel={actions.cancelAnalysis}
          />
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className={styles.errorContainer}>
            <h3>Analyse fehlgeschlagen</h3>
            <p>{error}</p>
            <button className={styles.retryButton} onClick={actions.reset}>
              Erneut versuchen
            </button>
          </div>
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
                onNavigate={(tab) => actions.setTab(tab as ActiveTab)}
              />
            )}

            {/* Clauses tab */}
            {activeTab === 'clauses' && (
              <ClausesTab
                result={result}
                activeMode={activeMode}
                selectedClauseId={selectedClauseId}
                clauseChats={clauseChats}
                actions={actions}
                sortByImportance={sortByImportance}
                onToggleSort={() => setSortByImportance(s => !s)}
              />
            )}

            {/* Redline tab - kept here */}
            {activeTab === 'redline' && (
              <RedlineView
                clauses={result.clauses}
                optimizations={result.optimizations}
                activeMode={activeMode}
                onModeChange={actions.switchMode}
                onClauseClick={(id) => { actions.selectClause(id); actions.setTab('clauses'); }}
              />
            )}

            {/* Export tab */}
            {activeTab === 'export' && (
              <ExportPanel
                result={result}
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
  selectedClauseId: string | null;
  clauseChats: Map<string, ChatMessage[]>;
  actions: ReturnType<typeof useOptimizerV2>['actions'];
  sortByImportance: boolean;
  onToggleSort: () => void;
}

function ClausesTab({ result, activeMode, selectedClauseId, clauseChats, actions, sortByImportance, onToggleSort }: ClausesTabProps) {
  const sortedClauses = useMemo(() => {
    if (!sortByImportance) return result.clauses;
    const analysisMap = new Map(result.clauseAnalyses.map(a => [a.clauseId, a]));
    return [...result.clauses].sort((a, b) => {
      const impA = IMPORTANCE_RANK[analysisMap.get(a.id)?.importanceLevel || 'medium'];
      const impB = IMPORTANCE_RANK[analysisMap.get(b.id)?.importanceLevel || 'medium'];
      return impB - impA;
    });
  }, [result.clauses, result.clauseAnalyses, sortByImportance]);

  return (
    <div className={styles.clausesContainer}>
      <div className={styles.clausesModeRow}>
        <button
          className={`${styles.sortToggle} ${sortByImportance ? styles.sortToggleActive : ''}`}
          onClick={onToggleSort}
          title={sortByImportance ? 'Originalreihenfolge' : 'Nach Priorität sortieren'}
        >
          <ArrowUpDown size={13} />
          {sortByImportance ? 'Priorität' : 'Original'}
        </button>
        <NegotiationModeSelector
          activeMode={activeMode}
          onModeChange={actions.switchMode}
          compact
        />
      </div>

      <div className={styles.clauseList}>
        {sortedClauses.map(clause => {
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
              isSelected={selectedClauseId === clause.id}
              onSelect={actions.selectClause}
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
