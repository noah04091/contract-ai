// 📁 components/LegalLens/LegalLensViewer.tsx
// Haupt-Komponente für Legal Lens Feature

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLegalLens } from '../../hooks/useLegalLens';
import ClauseList from './ClauseList';
import PerspectiveSwitcher from './PerspectiveSwitcher';
import AnalysisPanel from './AnalysisPanel';
import styles from '../../styles/LegalLens.module.css';

interface LegalLensViewerProps {
  contractId: string;
  contractName?: string;
}

const LegalLensViewer: React.FC<LegalLensViewerProps> = ({
  contractId,
  contractName = 'Vertrag'
}) => {
  const navigate = useNavigate();

  const {
    clauses,
    selectedClause,
    currentAnalysis,
    currentPerspective,
    progress,
    alternatives,
    negotiation,
    chatHistory,
    isParsing,
    isAnalyzing,
    isGeneratingAlternatives,
    isGeneratingNegotiation,
    isChatting,
    streamingText,
    error,
    parseContract,
    selectClause,
    analyzeClause,
    changePerspective,
    loadAlternatives,
    loadNegotiationTips,
    sendChatMessage,
    markClauseReviewed
  } = useLegalLens();

  // Vertrag beim Laden parsen
  useEffect(() => {
    if (contractId) {
      parseContract(contractId);
    }
  }, [contractId, parseContract]);

  // Analyse starten wenn Klausel ausgewählt
  useEffect(() => {
    if (selectedClause && !currentAnalysis && !isAnalyzing) {
      analyzeClause(true);
    }
  }, [selectedClause, currentAnalysis, isAnalyzing, analyzeClause]);

  // Re-Analyse bei Perspektiv-Wechsel
  useEffect(() => {
    if (selectedClause && currentAnalysis) {
      analyzeClause(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPerspective]);

  // Klausel als gelesen markieren
  useEffect(() => {
    if (selectedClause && currentAnalysis) {
      markClauseReviewed(selectedClause.id);
    }
  }, [selectedClause, currentAnalysis, markClauseReviewed]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleRetryAnalysis = () => {
    if (selectedClause) {
      analyzeClause(true);
    }
  };

  // Loading State
  if (isParsing) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingOverlay} style={{ flex: 1 }}>
          <div className={styles.loadingSpinner} />
          <span className={styles.loadingText}>Vertrag wird analysiert...</span>
        </div>
      </div>
    );
  }

  const percentComplete = progress?.percentComplete || 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backButton} onClick={handleBack}>
            ← Zurück
          </button>
          <h1 className={styles.title}>🔍 Legal Lens: {contractName}</h1>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.progressBar}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${percentComplete}%` }}
              />
            </div>
            <span className={styles.progressText}>
              {percentComplete}% durchgesehen
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.mainContent}>
        {/* Left: Clause List */}
        <ClauseList
          clauses={clauses}
          selectedClause={selectedClause}
          progress={progress}
          onSelectClause={selectClause}
        />

        {/* Right: Analysis Panel */}
        <div className={styles.analysisPanel}>
          {selectedClause ? (
            <>
              {/* Perspective Switcher */}
              <PerspectiveSwitcher
                currentPerspective={currentPerspective}
                onChangePerspective={changePerspective}
                disabled={isAnalyzing}
              />

              {/* Analysis Content */}
              <AnalysisPanel
                analysis={currentAnalysis}
                currentPerspective={currentPerspective}
                alternatives={alternatives}
                negotiation={negotiation}
                chatHistory={chatHistory}
                isAnalyzing={isAnalyzing}
                isGeneratingAlternatives={isGeneratingAlternatives}
                isGeneratingNegotiation={isGeneratingNegotiation}
                isChatting={isChatting}
                streamingText={streamingText}
                error={error}
                onLoadAlternatives={loadAlternatives}
                onLoadNegotiation={loadNegotiationTips}
                onSendChatMessage={sendChatMessage}
                onRetry={handleRetryAnalysis}
              />
            </>
          ) : (
            <div className={styles.analysisPanelEmpty}>
              <span className={styles.emptyIcon}>👆</span>
              <h3 className={styles.emptyTitle}>Klausel auswählen</h3>
              <p className={styles.emptyText}>
                Wählen Sie links eine Klausel aus, um die detaillierte Analyse zu sehen.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LegalLensViewer;
