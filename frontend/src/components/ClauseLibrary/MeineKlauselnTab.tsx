// MeineKlauselnTab.tsx - Tab für gespeicherte Klauseln des Benutzers

import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tag,
  Trash2,
  ExternalLink,
  Eye,
  Loader2,
  AlertTriangle,
  BookOpen,
  Plus,
  X,
  FileText,
  Sparkles
} from 'lucide-react';
import type { SavedClause } from '../../types/clauseLibrary';
import { CATEGORY_INFO, CLAUSE_AREA_INFO } from '../../types/clauseLibrary';
import styles from '../../styles/ClauseLibraryPage.module.css';

interface MeineKlauselnTabProps {
  clauses: SavedClause[];
  isLoading: boolean;
  error: string | null;
  selectedClause: SavedClause | null;
  isDeleting: boolean;
  viewType: 'grid' | 'list';
  onSelectClause: (clause: SavedClause | null) => void;
  onDeleteClause: (clauseId: string) => void;
  onRetry: () => void;
  onNavigateToTab: (tab: 'musterklauseln' | 'lexikon') => void;
}

const MeineKlauselnTab: React.FC<MeineKlauselnTabProps> = ({
  clauses,
  isLoading,
  error,
  selectedClause,
  isDeleting,
  viewType,
  onSelectClause,
  onDeleteClause,
  onRetry,
  onNavigateToTab,
}) => {
  const navigate = useNavigate();

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const handleNavigateToContract = (contractId: string) => {
    navigate(`/contracts?view=${contractId}`);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 className={styles.spinner} size={48} />
        <p>Lade Klauseln...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorState}>
        <AlertTriangle size={48} />
        <h3>Fehler beim Laden</h3>
        <p>{error}</p>
        <button onClick={onRetry} className={styles.retryBtn}>
          Erneut versuchen
        </button>
      </div>
    );
  }

  if (clauses.length === 0) {
    return (
      <div className={styles.emptyStateEnhanced}>
        <div className={styles.emptyIconWrapper}>
          <BookOpen size={48} />
        </div>
        <h3>Noch keine Klauseln gespeichert</h3>
        <p>
          Speichere wichtige Klauseln aus deinen Vertragsanalysen,
          um sie später wiederzufinden und als Referenz zu nutzen.
        </p>
        <div className={styles.emptyActions}>
          <button
            className={styles.emptyActionPrimary}
            onClick={() => navigate('/contracts')}
          >
            <Plus size={18} />
            Verträge analysieren
          </button>
          <div className={styles.emptyDivider}>
            <span>oder entdecke</span>
          </div>
          <div className={styles.emptySecondaryActions}>
            <button
              className={styles.emptyActionSecondary}
              onClick={() => onNavigateToTab('musterklauseln')}
            >
              <FileText size={16} />
              50+ Musterklauseln
            </button>
            <button
              className={styles.emptyActionSecondary}
              onClick={() => onNavigateToTab('lexikon')}
            >
              <Sparkles size={16} />
              Rechtslexikon
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={viewType === 'grid' ? styles.clauseGrid : styles.clauseList}>
        {clauses.map(clause => {
          const catInfo = CATEGORY_INFO[clause.category];
          const areaInfo = CLAUSE_AREA_INFO[clause.clauseArea];

          return (
            <div
              key={clause._id}
              className={`${styles.clauseCard} ${selectedClause?._id === clause._id ? styles.selected : ''}`}
              onClick={() => onSelectClause(clause)}
              style={{ '--cat-color': catInfo.color, '--cat-bg': catInfo.bgColor } as React.CSSProperties}
            >
              <div className={styles.cardHeader}>
                <span className={styles.categoryBadge}>
                  {catInfo.icon} {catInfo.label}
                </span>
                <span className={styles.areaBadge}>
                  {areaInfo.icon} {areaInfo.label}
                </span>
              </div>

              <p className={styles.clausePreview}>
                {clause.clausePreview}
              </p>

              {clause.tags.length > 0 && (
                <div className={styles.tagList}>
                  {clause.tags.slice(0, 3).map(tag => (
                    <span key={tag} className={styles.tag}>
                      <Tag size={10} />
                      {tag}
                    </span>
                  ))}
                  {clause.tags.length > 3 && (
                    <span className={styles.moreTag}>+{clause.tags.length - 3}</span>
                  )}
                </div>
              )}

              <div className={styles.cardFooter}>
                <span className={styles.date}>{formatDate(clause.savedAt)}</span>
                {clause.usageCount > 0 && (
                  <span className={styles.usageCount}>
                    <Eye size={12} />
                    {clause.usageCount}x
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Detail Panel */}
      {selectedClause && (
        <div className={styles.detailPanel}>
          <div className={styles.detailHeader}>
            <h3>Klausel-Details</h3>
            <button
              className={styles.closeDetail}
              onClick={() => onSelectClause(null)}
            >
              <X size={20} />
            </button>
          </div>

          <div className={styles.detailContent}>
            {/* Category & Area */}
            <div className={styles.detailMeta}>
              <span
                className={styles.detailCategory}
                style={{
                  color: CATEGORY_INFO[selectedClause.category].color,
                  background: CATEGORY_INFO[selectedClause.category].bgColor
                }}
              >
                {CATEGORY_INFO[selectedClause.category].icon}{' '}
                {CATEGORY_INFO[selectedClause.category].label}
              </span>
              <span className={styles.detailArea}>
                {CLAUSE_AREA_INFO[selectedClause.clauseArea].icon}{' '}
                {CLAUSE_AREA_INFO[selectedClause.clauseArea].label}
              </span>
            </div>

            {/* Full Text */}
            <div className={styles.detailSection}>
              <h4>Klauseltext</h4>
              <p className={styles.fullClauseText}>{selectedClause.clauseText}</p>
            </div>

            {/* Original Analysis */}
            {selectedClause.originalAnalysis && (
              <div className={styles.detailSection}>
                <h4>Ursprüngliche Analyse</h4>
                <div className={styles.analysisInfo}>
                  <div className={styles.analysisItem}>
                    <span className={styles.analysisLabel}>Risiko:</span>
                    <span className={`${styles.riskBadge} ${styles[selectedClause.originalAnalysis.riskLevel || 'medium']}`}>
                      {selectedClause.originalAnalysis.riskLevel === 'high' ? 'Hoch' :
                       selectedClause.originalAnalysis.riskLevel === 'low' ? 'Niedrig' : 'Mittel'}
                      {selectedClause.originalAnalysis.riskScore !== undefined && (
                        <> ({selectedClause.originalAnalysis.riskScore}%)</>
                      )}
                    </span>
                  </div>
                  {selectedClause.originalAnalysis.mainRisk && (
                    <p className={styles.mainRisk}>
                      {selectedClause.originalAnalysis.mainRisk}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* User Notes */}
            {selectedClause.userNotes && (
              <div className={styles.detailSection}>
                <h4>Deine Notizen</h4>
                <p className={styles.userNotes}>{selectedClause.userNotes}</p>
              </div>
            )}

            {/* Tags */}
            {selectedClause.tags.length > 0 && (
              <div className={styles.detailSection}>
                <h4>Tags</h4>
                <div className={styles.detailTags}>
                  {selectedClause.tags.map(tag => (
                    <span key={tag} className={styles.detailTag}>
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Source Contract */}
            {selectedClause.sourceContractName && (
              <div className={styles.detailSection}>
                <h4>Quelle</h4>
                <div className={styles.sourceInfo}>
                  <span>{selectedClause.sourceContractName}</span>
                  {selectedClause.sourceContractId && (
                    <button
                      className={styles.viewSourceBtn}
                      onClick={() => handleNavigateToContract(selectedClause.sourceContractId!)}
                    >
                      <ExternalLink size={14} />
                      Zum Vertrag
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Meta Info */}
            <div className={styles.detailSection}>
              <div className={styles.metaGrid}>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Gespeichert:</span>
                  <span>{formatDate(selectedClause.savedAt)}</span>
                </div>
                <div className={styles.metaItem}>
                  <span className={styles.metaLabel}>Verwendet:</span>
                  <span>{selectedClause.usageCount}x</span>
                </div>
              </div>
            </div>
          </div>

          {/* Detail Actions */}
          <div className={styles.detailActions}>
            <button
              className={styles.deleteBtn}
              onClick={() => onDeleteClause(selectedClause._id)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 size={16} className={styles.spinner} />
              ) : (
                <Trash2 size={16} />
              )}
              Löschen
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default MeineKlauselnTab;
