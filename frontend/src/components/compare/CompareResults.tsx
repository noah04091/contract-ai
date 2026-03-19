import { useState } from 'react';
import {
  LayoutGrid, GitCompareArrows, Shield, Lightbulb, Map,
  Users, Briefcase, Scale
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

const TAB_CONFIG: { key: CompareTab; label: string; icon: React.ElementType }[] = [
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
  const v2 = isV2Result(result);
  const v2Result = v2 ? (result as ComparisonResultV2) : null;

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
                  <span>{PERSPECTIVE_LABELS[p]}</span>
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
          />
        )}

        {activeTab === 'risks' && (
          <RisksTab risks={v2Result?.risks || []} />
        )}

        {activeTab === 'recommendations' && (
          <RecommendationsTab recommendations={v2Result?.recommendations || []} />
        )}

        {activeTab === 'contractMap' && v2Result && v2Result.contractMap && (
          <ContractMapTab
            contract1={v2Result.contractMap.contract1}
            contract2={v2Result.contractMap.contract2}
            differences={v2Result.differences}
          />
        )}
      </div>
    </div>
  );
}
