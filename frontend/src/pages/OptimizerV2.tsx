import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LayoutGrid, List, GitCompareArrows, Download, ArrowLeft } from 'lucide-react';
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
import type { ActiveTab } from '../types/optimizerV2';
import styles from '../styles/OptimizerV2.module.css';

const TAB_CONFIG: { key: ActiveTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Übersicht', icon: LayoutGrid },
  { key: 'clauses', label: 'Klauseln', icon: List },
  { key: 'redline', label: 'Redline', icon: GitCompareArrows },
  { key: 'export', label: 'Export', icon: Download }
];

export default function OptimizerV2() {
  const navigate = useNavigate();
  const { state, actions } = useOptimizerV2();

  // Check auth
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) navigate('/login');
  }, [navigate]);

  const {
    file, status, progress, progressMessage, stages,
    result, resultId, activeMode, activeTab, selectedClauseId,
    userSelections, clauseChats, error
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
            currentStage={state.currentStage}
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
              <div className={styles.clausesContainer}>
                {/* Mode selector */}
                <div className={styles.clausesModeRow}>
                  <NegotiationModeSelector
                    activeMode={activeMode}
                    onModeChange={actions.switchMode}
                    compact
                  />
                </div>

                {/* Clause list */}
                <div className={styles.clauseList}>
                  {result.clauses.map(clause => {
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
            )}

            {/* Redline tab */}
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
                activeMode={activeMode}
                resultId={resultId}
              />
            )}
          </div>
        )}
      </div>
    </>
  );
}
