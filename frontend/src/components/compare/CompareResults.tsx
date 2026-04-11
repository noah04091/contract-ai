import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid, GitCompareArrows, Shield, Lightbulb, Map,
  Users, Briefcase, Scale, AlertTriangle,
  MessageCircle, Loader2, X,
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
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [followUpAnswer, setFollowUpAnswer] = useState<string | null>(null);
  const [answerLoading, setAnswerLoading] = useState(false);
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
          />
        )}
      </div>

      {/* Follow-Up Questions */}
      {v2Result?.followUpQuestions && v2Result.followUpQuestions.length > 0 && (
        <FollowUpSection
          questions={v2Result.followUpQuestions}
          selectedQuestion={selectedQuestion}
          answer={followUpAnswer}
          answerLoading={answerLoading}
          onAsk={async (question) => {
            setSelectedQuestion(question);
            setFollowUpAnswer(null);
            setAnswerLoading(true);
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
              setFollowUpAnswer(data.answer);
            } catch {
              setFollowUpAnswer('Die Frage konnte leider nicht beantwortet werden. Bitte versuchen Sie es erneut.');
            } finally {
              setAnswerLoading(false);
            }
          }}
          onClose={() => {
            setSelectedQuestion(null);
            setFollowUpAnswer(null);
          }}
        />
      )}
    </div>
  );
}

// ============================================
// Follow-Up Questions Section
// ============================================
function FollowUpSection({
  questions,
  selectedQuestion,
  answer,
  answerLoading,
  onAsk,
  onClose,
}: {
  questions: string[];
  selectedQuestion: string | null;
  answer: string | null;
  answerLoading: boolean;
  onAsk: (question: string) => void;
  onClose: () => void;
}) {
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
      </div>

      <div className={styles.followUpChips}>
        {questions.map((q, i) => (
          <button
            key={i}
            className={`${styles.followUpChip} ${selectedQuestion === q ? styles.followUpChipActive : ''}`}
            onClick={() => onAsk(q)}
            disabled={answerLoading}
          >
            {q}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {(selectedQuestion && (answerLoading || answer)) && (
          <motion.div
            className={styles.followUpAnswer}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className={styles.followUpAnswerHeader}>
              <span className={styles.followUpQuestion}>{selectedQuestion}</span>
              <button className={styles.followUpClose} onClick={onClose} title="Schließen">
                <X size={14} />
              </button>
            </div>
            {answerLoading ? (
              <div className={styles.followUpLoading}>
                <Loader2 size={16} className={styles.followUpSpinner} />
                <span>Antwort wird generiert...</span>
              </div>
            ) : (
              <p className={styles.followUpAnswerText}>{answer}</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
