// 📁 components/LegalLens/AnalysisPanel.tsx
// Komponente für das Analyse-Panel (rechte Seite)

import React, { useState } from 'react';
import type {
  ClauseAnalysis,
  PerspectiveType,
  ClauseAlternative,
  NegotiationInfo,
  ChatMessage,
  RiskLevel
} from '../../types/legalLens';
import { RISK_LABELS, PERSPECTIVES } from '../../types/legalLens';
import styles from '../../styles/LegalLens.module.css';

interface AnalysisPanelProps {
  analysis: ClauseAnalysis | null;
  currentPerspective: PerspectiveType;
  alternatives: ClauseAlternative[];
  negotiation: NegotiationInfo | null;
  chatHistory: ChatMessage[];
  isAnalyzing: boolean;
  isGeneratingAlternatives: boolean;
  isGeneratingNegotiation: boolean;
  isChatting: boolean;
  streamingText: string;
  error: string | null;
  onLoadAlternatives: () => void;
  onLoadNegotiation: () => void;
  onSendChatMessage: (message: string) => void;
  onRetry: () => void;
}

const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  analysis,
  currentPerspective,
  alternatives,
  negotiation,
  chatHistory,
  isAnalyzing,
  isGeneratingAlternatives,
  isGeneratingNegotiation,
  isChatting,
  streamingText,
  error,
  onLoadAlternatives,
  onLoadNegotiation,
  onSendChatMessage,
  onRetry
}) => {
  const [chatInput, setChatInput] = useState('');
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const handleSendMessage = () => {
    if (chatInput.trim() && !isChatting) {
      onSendChatMessage(chatInput.trim());
      setChatInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const copyEmailTemplate = () => {
    if (negotiation?.emailTemplate) {
      navigator.clipboard.writeText(negotiation.emailTemplate);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    }
  };

  const getRiskEmoji = (level: RiskLevel): string => {
    switch (level) {
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const getImpactLabel = (level: RiskLevel): string => {
    switch (level) {
      case 'high': return 'Hoch';
      case 'medium': return 'Mittel';
      case 'low': return 'Niedrig';
      default: return '-';
    }
  };

  const getCurrentPerspectiveInfo = () => {
    return PERSPECTIVES.find(p => p.id === currentPerspective) || PERSPECTIVES[0];
  };

  // Error State
  if (error) {
    return (
      <div className={styles.analysisContent}>
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠️</span>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryButton} onClick={onRetry}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  // Loading State (Streaming)
  if (isAnalyzing) {
    return (
      <div className={styles.analysisContent}>
        <div className={styles.analysisSection}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🔍</span>
              Analyse läuft...
            </h4>
          </div>
          {streamingText ? (
            <p className={styles.streamingText}>
              {streamingText}
              <span className={styles.streamingCursor} />
            </p>
          ) : (
            <div className={styles.loadingOverlay}>
              <div className={styles.loadingSpinner} />
              <span className={styles.loadingText}>
                Analysiere aus Perspektive: {getCurrentPerspectiveInfo().name}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // No Analysis Yet
  if (!analysis) {
    return null;
  }

  const perspectiveData = analysis.perspectives?.[currentPerspective];

  return (
    <div className={styles.analysisContent}>
      {/* Risk Overview */}
      <div className={styles.analysisSection}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>⚖️</span>
            Risikobewertung
          </h4>
          <span className={`${styles.riskBadge} ${styles[analysis.riskLevel || 'low']}`}>
            <span className={`${styles.riskIndicator} ${styles[analysis.riskLevel || 'low']}`} />
            {getRiskEmoji(analysis.riskLevel || 'low')} {RISK_LABELS[analysis.riskLevel || 'low']}
          </span>
        </div>
      </div>

      {/* Explanation */}
      {perspectiveData?.explanation && (
        <div className={styles.analysisSection}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>{getCurrentPerspectiveInfo().icon}</span>
              Erklärung ({getCurrentPerspectiveInfo().name})
            </h4>
          </div>
          <p className={styles.explanationText}>
            {perspectiveData.explanation.summary}
          </p>
          {perspectiveData.explanation.keyPoints?.length > 0 && (
            <ul className={styles.keyPoints}>
              {perspectiveData.explanation.keyPoints.map((point, idx) => (
                <li key={idx} className={styles.keyPoint}>
                  <span className={styles.keyPointBullet}>•</span>
                  {point}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Impact */}
      {perspectiveData?.impact && (
        <div className={styles.analysisSection}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📊</span>
              Auswirkungen
            </h4>
          </div>
          <div className={styles.impactGrid}>
            <div className={styles.impactItem}>
              <span className={styles.impactLabel}>Finanziell</span>
              <span className={`${styles.impactValue} ${styles[perspectiveData.impact.financial || 'low']}`}>
                {getImpactLabel(perspectiveData.impact.financial)}
              </span>
            </div>
            <div className={styles.impactItem}>
              <span className={styles.impactLabel}>Rechtlich</span>
              <span className={`${styles.impactValue} ${styles[perspectiveData.impact.legal || 'low']}`}>
                {getImpactLabel(perspectiveData.impact.legal)}
              </span>
            </div>
            <div className={styles.impactItem}>
              <span className={styles.impactLabel}>Operativ</span>
              <span className={`${styles.impactValue} ${styles[perspectiveData.impact.operational || 'low']}`}>
                {getImpactLabel(perspectiveData.impact.operational)}
              </span>
            </div>
            <div className={styles.impactItem}>
              <span className={styles.impactLabel}>Reputation</span>
              <span className={`${styles.impactValue} ${styles[perspectiveData.impact.reputation || 'low']}`}>
                {getImpactLabel(perspectiveData.impact.reputation)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Consequences */}
      {perspectiveData?.consequences?.length > 0 && (
        <div className={styles.analysisSection}>
          <div className={styles.sectionHeader}>
            <h4 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>⚠️</span>
              Mögliche Konsequenzen
            </h4>
          </div>
          <div className={styles.consequenceList}>
            {perspectiveData.consequences.map((consequence, idx) => (
              <div
                key={idx}
                className={`${styles.consequenceItem} ${styles[consequence.probability || 'low']}`}
              >
                <p className={styles.consequenceScenario}>{consequence.scenario}</p>
                <p className={styles.consequenceImpact}>{consequence.impact}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternatives */}
      <div className={styles.analysisSection}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>💡</span>
            Alternative Formulierungen
          </h4>
          {alternatives.length === 0 && !isGeneratingAlternatives && (
            <button
              className={styles.actionButton}
              onClick={onLoadAlternatives}
            >
              Generieren
            </button>
          )}
        </div>
        {isGeneratingAlternatives ? (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner} />
            <span className={styles.loadingText}>Generiere Alternativen...</span>
          </div>
        ) : alternatives.length > 0 ? (
          <div className={styles.alternativesList}>
            {alternatives.map((alt, idx) => (
              <div key={idx} className={styles.alternativeItem}>
                <p className={styles.alternativeText}>"{alt.text}"</p>
                <div className={styles.alternativeBenefits}>
                  {alt.benefits?.map((benefit, bIdx) => (
                    <span key={bIdx} className={styles.benefitTag}>{benefit}</span>
                  ))}
                </div>
                <div className={styles.alternativeDifficulty}>
                  <span className={`${styles.difficultyDot} ${styles[alt.difficulty || 'medium']}`} />
                  <span>
                    {alt.difficulty === 'easy' ? 'Einfach umzusetzen' :
                     alt.difficulty === 'hard' ? 'Schwierig umzusetzen' :
                     'Mittlerer Aufwand'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.explanationText}>
            Klicken Sie auf "Generieren", um alternative Formulierungen zu erhalten.
          </p>
        )}
      </div>

      {/* Negotiation Tips */}
      <div className={styles.analysisSection}>
        <div className={styles.sectionHeader}>
          <h4 className={styles.sectionTitle}>
            <span className={styles.sectionIcon}>🤝</span>
            Verhandlungstipps
          </h4>
          {!negotiation && !isGeneratingNegotiation && (
            <button
              className={styles.actionButton}
              onClick={onLoadNegotiation}
            >
              Generieren
            </button>
          )}
        </div>
        {isGeneratingNegotiation ? (
          <div className={styles.loadingOverlay}>
            <div className={styles.loadingSpinner} />
            <span className={styles.loadingText}>Generiere Verhandlungstipps...</span>
          </div>
        ) : negotiation ? (
          <>
            <p className={styles.explanationText}>{negotiation.argument}</p>
            {negotiation.tips?.length > 0 && (
              <div className={styles.negotiationTips}>
                {negotiation.tips.map((tip, idx) => (
                  <div key={idx} className={styles.tipItem}>
                    <span className={styles.tipIcon}>💡</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            )}
            {negotiation.emailTemplate && (
              <>
                <pre className={styles.emailTemplate}>{negotiation.emailTemplate}</pre>
                <button className={styles.copyButton} onClick={copyEmailTemplate}>
                  {copiedTemplate ? '✓ Kopiert!' : '📋 E-Mail-Vorlage kopieren'}
                </button>
              </>
            )}
          </>
        ) : (
          <p className={styles.explanationText}>
            Klicken Sie auf "Generieren", um Verhandlungstipps zu erhalten.
          </p>
        )}
      </div>

      {/* Chat Section */}
      <div className={styles.chatSection}>
        <div className={styles.chatHeader}>
          <span>💬</span>
          <h4 className={styles.chatTitle}>Fragen zur Klausel</h4>
        </div>

        {chatHistory.length > 0 && (
          <div className={styles.chatMessages}>
            {chatHistory.map((msg, idx) => (
              <div key={idx} className={`${styles.chatMessage} ${styles[msg.role]}`}>
                <div className={styles.messageContent}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isChatting && (
              <div className={`${styles.chatMessage} ${styles.assistant}`}>
                <div className={styles.messageContent}>
                  <span className={styles.loadingSpinner} style={{ width: 16, height: 16 }} />
                </div>
              </div>
            )}
          </div>
        )}

        <div className={styles.chatInputContainer}>
          <textarea
            className={styles.chatInput}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Stellen Sie eine Frage zu dieser Klausel..."
            rows={1}
          />
          <button
            className={styles.chatSendButton}
            onClick={handleSendMessage}
            disabled={!chatInput.trim() || isChatting}
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisPanel;
