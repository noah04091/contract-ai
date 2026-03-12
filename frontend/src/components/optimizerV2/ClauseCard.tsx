import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare, BookOpen, AlertTriangle, CheckCircle } from 'lucide-react';
import type {
  Clause, ClauseAnalysis, ClauseOptimization, ClauseScore,
  OptimizationMode, ChatMessage
} from '../../types/optimizerV2';
import { CATEGORY_LABELS, STRENGTH_CONFIG } from '../../types/optimizerV2';
import ClauseAlternatives from './ClauseAlternatives';
import ClauseChat from './ClauseChat';
import styles from '../../styles/OptimizerV2.module.css';

interface Props {
  clause: Clause;
  analysis: ClauseAnalysis | undefined;
  optimization: ClauseOptimization | undefined;
  score: ClauseScore | undefined;
  activeMode: OptimizationMode;
  isSelected: boolean;
  onSelect: (clauseId: string | null) => void;
  onAcceptVersion: (clauseId: string, version: 'neutral' | 'proCreator' | 'proRecipient' | 'original' | 'custom', customText?: string) => void;
  chatMessages: ChatMessage[];
  onSendChat: (clauseId: string, message: string) => Promise<any>;
}

export default function ClauseCard({
  clause, analysis, optimization, score, activeMode,
  isSelected, onSelect, onAcceptVersion, chatMessages, onSendChat
}: Props) {
  const [showChat, setShowChat] = useState(false);
  const strengthConfig = analysis ? STRENGTH_CONFIG[analysis.strength] : null;
  const categoryLabel = CATEGORY_LABELS[clause.category] || clause.category;

  return (
    <div
      className={`${styles.clauseCard} ${isSelected ? styles.clauseCardExpanded : ''}`}
      id={`clause-${clause.id}`}
    >
      {/* Header - always visible */}
      <div className={styles.clauseCardHeader} onClick={() => onSelect(isSelected ? null : clause.id)}>
        <div className={styles.clauseCardLeft}>
          {clause.sectionNumber && (
            <span className={styles.clauseSectionNumber}>{clause.sectionNumber}</span>
          )}
          <span className={styles.clauseTitle}>{clause.title}</span>
          <span className={styles.clauseCategory}>{categoryLabel}</span>
        </div>

        <div className={styles.clauseCardRight}>
          {analysis && strengthConfig && (
            <span className={styles.strengthBadge} style={{ color: strengthConfig.color, borderColor: strengthConfig.color }}>
              {analysis.strength === 'critical' || analysis.strength === 'weak'
                ? <AlertTriangle size={12} />
                : <CheckCircle size={12} />
              }
              {strengthConfig.label}
            </span>
          )}
          {score && (
            <span className={styles.clauseScore}>{score.score}</span>
          )}
          {isSelected ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Expanded content */}
      {isSelected && (
        <div className={styles.clauseCardBody}>
          {/* Plain language summary */}
          {analysis && (
            <div className={styles.clauseAnalysis}>
              <div className={styles.clauseSummary}>
                <BookOpen size={14} />
                <p>{analysis.plainLanguage}</p>
              </div>

              {/* Legal assessment */}
              <div className={styles.clauseAssessment}>
                <h4>Juristische Bewertung</h4>
                <p>{analysis.legalAssessment}</p>
              </div>

              {/* Risk info */}
              {analysis.riskLevel > 0 && (
                <div className={styles.clauseRisk}>
                  <span className={styles.riskIndicator}>
                    Risiko: {analysis.riskLevel}/10 ({analysis.riskType})
                  </span>
                </div>
              )}

              {/* Concerns */}
              {analysis.concerns.length > 0 && (
                <div className={styles.clauseConcerns}>
                  <h4>Bedenken</h4>
                  <ul>
                    {analysis.concerns.map((concern, i) => (
                      <li key={i}>{concern}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Legal references */}
              {analysis.legalReferences.length > 0 && (
                <div className={styles.clauseRefs}>
                  {analysis.legalReferences.map((ref, i) => (
                    <span key={i} className={styles.legalRefBadge}>{ref}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Optimization alternatives */}
          {optimization && optimization.needsOptimization && (
            <ClauseAlternatives
              clauseId={clause.id}
              originalText={clause.originalText}
              optimization={optimization}
              activeMode={activeMode}
              onAcceptVersion={onAcceptVersion}
            />
          )}

          {/* Original text (collapsible) */}
          <details className={styles.originalTextDetails}>
            <summary>Originaltext anzeigen</summary>
            <pre className={styles.originalText}>{clause.originalText}</pre>
          </details>

          {/* Chat toggle */}
          <button
            className={styles.chatToggle}
            onClick={() => setShowChat(!showChat)}
          >
            <MessageSquare size={14} />
            {showChat ? 'Chat schließen' : 'Klausel besprechen'}
            {chatMessages.length > 0 && (
              <span className={styles.chatBadge}>{chatMessages.length}</span>
            )}
          </button>

          {showChat && (
            <ClauseChat
              clauseId={clause.id}
              messages={chatMessages}
              onSend={onSendChat}
            />
          )}
        </div>
      )}
    </div>
  );
}
