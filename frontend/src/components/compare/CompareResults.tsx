import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  LayoutGrid, GitCompareArrows, Shield, Lightbulb, Map,
  Users, Briefcase, Scale, AlertTriangle,
  MessageCircle, Loader2, X, Send,
} from 'lucide-react';
import {
  ComparisonResult, ComparisonResultV2, isV2Result,
  CompareTab, Perspective, PERSPECTIVE_LABELS,
} from '../../types/compare';
import OverviewTab from './tabs/OverviewTab';
import DifferencesTab from './tabs/DifferencesTab';
import RisksTab from './tabs/RisksTab';
import RecommendationsTab from './tabs/RecommendationsTab';
import ContractMapTab from './tabs/ContractMapTab';
import styles from '../../styles/Compare.module.css';

interface CompareResultsProps {
  result: ComparisonResult;
  file1: File | null;
  file2: File | null;
  file1Name?: string | null;
  file2Name?: string | null;
  file1S3Key?: string | null;
  file2S3Key?: string | null;
  onPerspectiveChange?: (perspective: Perspective) => void;
  reAnalyzing?: boolean;
}

const BASE_TAB_CONFIG: { key: CompareTab; label: string; icon: React.ElementType }[] = [
  { key: 'overview', label: 'Übersicht', icon: LayoutGrid },
  { key: 'differences', label: 'Unterschiede', icon: GitCompareArrows },
  { key: 'risks', label: 'Risiken', icon: Shield },
  { key: 'recommendations', label: 'Empfehlungen', icon: Lightbulb },
  { key: 'contractMap', label: 'Vertragskarte', icon: Map },
];

interface FollowUpMessage {
  question: string;
  answer: string | null;
  loading: boolean;
}

const MAX_FOLLOWUP_MESSAGES = 10;

export default function CompareResults({
  result,
  file1,
  file2,
  file1Name,
  file2Name,
  file1S3Key,
  file2S3Key,
  onPerspectiveChange,
  reAnalyzing,
}: CompareResultsProps) {
  const [activeTab, setActiveTab] = useState<CompareTab>('overview');
  const [followUpMessages, setFollowUpMessages] = useState<FollowUpMessage[]>([]);
  const v2 = isV2Result(result);
  const v2Result = v2 ? (result as ComparisonResultV2) : null;

  // V3: Dynamic tab labels based on document type
  const mapTabLabel = v2Result?.documentType?.labels?.mapTab || 'Vertragskarte';
  const TAB_CONFIG = BASE_TAB_CONFIG.map(tab =>
    tab.key === 'contractMap' ? { ...tab, label: mapTabLabel } : tab
  );

  // V3.1: Dynamic perspective labels based on document type
  const perspLabels = v2Result?.documentType?.perspectiveLabels || PERSPECTIVE_LABELS;

  // V3.1: Dynamic document name for all tabs
  const docName = v2Result?.documentType?.labels?.documentName || 'Vertrag';

  const getBadgeCount = (tab: CompareTab): number | undefined => {
    if (!v2Result) return undefined;
    switch (tab) {
      case 'differences': return v2Result.differences.length;
      case 'risks': return v2Result.risks.length;
      case 'recommendations': return v2Result.recommendations.length;
      default: return undefined;
    }
  };

  return (
    <div className={styles.resultsContainer}>
      {/* Header with Perspective Selector */}
      <div className={styles.resultsHeader}>
        <h2 className={styles.resultsTitle}>Vergleichsergebnis</h2>

        {v2 && onPerspectiveChange && (
          <div className={styles.perspectiveSelector}>
            {(['auftraggeber', 'auftragnehmer', 'neutral'] as Perspective[]).map((p) => {
              const isActive = v2Result?.perspective === p;
              const Icon = p === 'auftraggeber' ? Users : p === 'auftragnehmer' ? Briefcase : Scale;
              return (
                <button
                  key={p}
                  className={`${styles.perspectiveBtn} ${isActive ? styles.perspectiveBtnActive : ''}`}
                  onClick={() => onPerspectiveChange(p)}
                  disabled={reAnalyzing}
                >
                  <Icon size={14} />
                  <span>{perspLabels[p]}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Re-analyzing overlay */}
      {reAnalyzing && (
        <div className={styles.reAnalyzingBar}>
          <div className={styles.spinner} />
          <span>Perspektive wird gewechselt...</span>
        </div>
      )}

      {/* V2 Fallback Warning */}
      {!v2 && (result as unknown as { _v2Fallback?: boolean })?._v2Fallback && (
        <div className={styles.fallbackBanner}>
          <AlertTriangle size={18} />
          <div>
            <strong>Eingeschränkter Vergleich</strong>
            <p>Die erweiterte Analyse (Vertragskarte, Risiken, Empfehlungen) konnte nicht durchgeführt werden{(result as unknown as { _v2FallbackReason?: string })?._v2FallbackReason === 'timeout' ? ' (Zeitüberschreitung bei langen Verträgen)' : ''}. Es wird der Standardvergleich angezeigt. Bitte versuchen Sie es erneut.</p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const count = getBadgeCount(tab.key);
          // Contract map only for V2
          if (tab.key === 'contractMap' && !v2) return null;

          return (
            <button
              key={tab.key}
              className={`${styles.tabButton} ${activeTab === tab.key ? styles.tabButtonActive : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {count !== undefined && count > 0 && (
                <span className={styles.tabBadge}>{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'overview' && (
          <OverviewTab
            result={result}
            file1={file1}
            file2={file2}
            file1Name={file1Name || file1?.name}
            file2Name={file2Name || file2?.name}
            file1S3Key={file1S3Key}
            file2S3Key={file2S3Key}
          />
        )}

        {activeTab === 'differences' && (
          <DifferencesTab
            result={result}
            file1={file1}
            file2={file2}
            docName={docName}
          />
        )}

        {activeTab === 'risks' && (
          <RisksTab risks={v2Result?.risks || []} docName={docName} />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsTab recommendations={v2Result?.recommendations || []} docName={docName} />
        )}

        {activeTab === 'contractMap' && v2Result && v2Result.contractMap && (
          <ContractMapTab
            contract1={v2Result.contractMap.contract1}
            contract2={v2Result.contractMap.contract2}
            differences={v2Result.differences}
            documentType={v2Result.documentType}
            extractionWarning={v2Result.extractionWarning}
          />
        )}
      </div>

      {/* Follow-Up Questions */}
      {v2Result?.followUpQuestions && v2Result.followUpQuestions.length > 0 && (
        <FollowUpSection
          questions={v2Result.followUpQuestions}
          messages={followUpMessages}
          onAsk={async (question) => {
            if (followUpMessages.length >= MAX_FOLLOWUP_MESSAGES) return;
            const isLoading = followUpMessages.some(m => m.loading);
            if (isLoading) return;

            const newMsg: FollowUpMessage = { question, answer: null, loading: true };
            setFollowUpMessages(prev => [...prev, newMsg]);

            try {
              const API = import.meta.env.VITE_API_URL || '';
              const res = await fetch(`${API}/api/compare/followup-answer`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  question,
                  context: {
                    documentType: v2Result.documentType,
                    perspective: v2Result.perspective,
                    differences: v2Result.differences,
                    risks: v2Result.risks,
                    scores: v2Result.scores,
                    overallRecommendation: v2Result.overallRecommendation,
                    benchmark: v2Result.benchmark,
                  },
                }),
              });
              if (!res.ok) throw new Error('Fehler');
              const data = await res.json();
              setFollowUpMessages(prev =>
                prev.map((m, i) => i === prev.length - 1 ? { ...m, answer: data.answer, loading: false } : m)
              );
            } catch {
              setFollowUpMessages(prev =>
                prev.map((m, i) => i === prev.length - 1
                  ? { ...m, answer: 'Die Frage konnte leider nicht beantwortet werden.', loading: false }
                  : m)
              );
            }
          }}
          onClear={() => setFollowUpMessages([])}
        />
      )}
    </div>
  );
}

// ============================================
// Follow-Up Questions Section (Mini-Chat)
// ============================================
function FollowUpSection({
  questions,
  messages,
  onAsk,
  onClear,
}: {
  questions: string[];
  messages: FollowUpMessage[];
  onAsk: (question: string) => void;
  onClear: () => void;
}) {
  const [customInput, setCustomInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isLoading = messages.some(m => m.loading);
  const limitReached = messages.length >= MAX_FOLLOWUP_MESSAGES;

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCustomSubmit = () => {
    const q = customInput.trim();
    if (!q || isLoading || limitReached) return;
    onAsk(q);
    setCustomInput('');
    setTimeout(scrollToBottom, 100);
  };

  const handleChipClick = (q: string) => {
    if (isLoading || limitReached) return;
    onAsk(q);
    setTimeout(scrollToBottom, 100);
  };

  // Track which chip-questions have already been asked
  const askedQuestions = new Set(messages.map(m => m.question));

  return (
    <motion.div
      className={styles.followUpSection}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <div className={styles.followUpHeader}>
        <MessageCircle size={18} />
        <h4>Haben Sie noch Fragen zu diesem Vergleich?</h4>
        {messages.length > 0 && (
          <button className={styles.followUpClearBtn} onClick={onClear} title="Verlauf löschen">
            <X size={14} />
            <span>Verlauf löschen</span>
          </button>
        )}
      </div>

      {/* Suggestion chips — hide already-asked ones */}
      <div className={styles.followUpChips}>
        {questions.filter(q => !askedQuestions.has(q)).map((q, i) => (
          <button
            key={i}
            className={styles.followUpChip}
            onClick={() => handleChipClick(q)}
            disabled={isLoading || limitReached}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Conversation history */}
      {messages.length > 0 && (
        <div className={styles.followUpChat}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              className={styles.followUpMessage}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.followUpBubbleUser}>
                <span>{msg.question}</span>
              </div>
              {msg.loading ? (
                <div className={styles.followUpLoading}>
                  <Loader2 size={16} className={styles.followUpSpinner} />
                  <span>Antwort wird generiert...</span>
                </div>
              ) : msg.answer && (
                <div className={styles.followUpBubbleAi}>
                  <p>{msg.answer}</p>
                </div>
              )}
            </motion.div>
          ))}
          <div ref={chatEndRef} />
        </div>
      )}

      {/* Custom question input */}
      {!limitReached ? (
        <div className={styles.followUpInputRow}>
          <input
            type="text"
            className={styles.followUpInput}
            placeholder="Eigene Frage stellen..."
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
            disabled={isLoading}
          />
          <button
            className={styles.followUpSendBtn}
            onClick={handleCustomSubmit}
            disabled={!customInput.trim() || isLoading}
            title="Frage stellen"
          >
            <Send size={16} />
          </button>
        </div>
      ) : (
        <p className={styles.followUpLimitHint}>Maximale Anzahl an Fragen erreicht (10).</p>
      )}
    </motion.div>
  );
}
