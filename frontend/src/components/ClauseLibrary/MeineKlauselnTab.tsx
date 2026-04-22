// MeineKlauselnTab.tsx - Tab für gespeicherte Klauseln des Benutzers

import React, { useState, useEffect } from 'react';
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
  Sparkles,
  FolderPlus,
  Edit3,
  Check,
  Save,
  Download
} from 'lucide-react';
import type { SavedClause, ClauseCategory, ClauseArea, AddCollectionItemRequest } from '../../types/clauseLibrary';
import { CATEGORY_INFO, CLAUSE_AREA_INFO } from '../../types/clauseLibrary';
import * as clauseLibraryAPI from '../../services/clauseLibraryAPI';
import * as clauseCollectionAPI from '../../services/clauseCollectionAPI';
import { useToast } from '../../context/ToastContext';
import AddToCollectionModal from './AddToCollectionModal';
import styles from '../../styles/ClauseLibraryPage.module.css';

interface MeineKlauselnTabProps {
  clauses: SavedClause[];
  isLoading: boolean;
  error: string | null;
  selectedClause: SavedClause | null;
  isDeleting: boolean;
  viewType: 'grid' | 'list';
  hasActiveFilter: boolean;
  onSelectClause: (clause: SavedClause | null) => void;
  onDeleteClause: (clauseId: string) => void;
  onRetry: () => void;
  onNavigateToTab: (tab: 'musterklauseln' | 'lexikon') => void;
  onClearFilters: () => void;
  onCollectionsChanged?: () => void;
}

const MeineKlauselnTab: React.FC<MeineKlauselnTabProps> = ({
  clauses,
  isLoading,
  error,
  selectedClause,
  isDeleting,
  viewType,
  hasActiveFilter,
  onSelectClause,
  onDeleteClause,
  onRetry,
  onNavigateToTab,
  onClearFilters,
  onCollectionsChanged,
}) => {
  const navigate = useNavigate();
  const toast = useToast();
  const [addToCollectionData, setAddToCollectionData] = useState<{
    item: AddCollectionItemRequest;
    previewText: string;
    previewTitle: string;
  } | null>(null);

  // Fallback-Titel für Klauseln ohne Titel generieren (kurz & prägnant, max ~40 Zeichen)
  const getDisplayTitle = (clause: SavedClause): string | null => {
    if (clause.title && clause.title.trim()) return clause.title;
    // Fallback: Klauseltext bereinigen und kürzen
    let text = (clause.clauseText || clause.clausePreview || '')
      .replace(/---+/g, '')
      .replace(/^[-–—#*\s]+/g, '')
      .replace(/\*\*/g, '')
      .replace(/^\(\d+\)\s*/g, '')
      .replace(/^\d+[.)]\s*/g, '')
      .replace(/\|[^|]*\|/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!text) return null;
    // § Referenz mit Titel extrahieren
    const sectionMatch = text.match(/^(§\s*\d+[a-z]?\s+[A-ZÄÖÜ]\S*(?:\s+[A-ZÄÖÜ/]\S*){0,2})/);
    if (sectionMatch) return sectionMatch[1].substring(0, 40);
    // Kurzer erster Satz
    const sentenceEnd = text.search(/[.!?]\s/);
    if (sentenceEnd > 0 && sentenceEnd <= 40) return text.substring(0, sentenceEnd + 1);
    // An Wortgrenze bei ~35 Zeichen kürzen
    if (text.length <= 40) return text;
    const truncated = text.substring(0, 38);
    const lastSpace = truncated.lastIndexOf(' ');
    return (lastSpace > 15 ? truncated.substring(0, lastSpace) : truncated).trimEnd() + '…';
  };

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
    // Filter aktiv → andere Meldung
    if (hasActiveFilter) {
      return (
        <div className={styles.emptyStateEnhanced}>
          <div className={styles.emptyIconWrapper}>
            <BookOpen size={48} />
          </div>
          <h3>Keine Klauseln gefunden</h3>
          <p>Die aktiven Filter liefern keine Treffer. Setze sie zurück um alle Klauseln zu sehen.</p>
          <div className={styles.emptyActions}>
            <button
              className={styles.emptyActionPrimary}
              onClick={onClearFilters}
            >
              <X size={18} />
              Filter zurücksetzen
            </button>
          </div>
        </div>
      );
    }

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

              {(() => {
                const displayTitle = getDisplayTitle(clause);
                return displayTitle ? (
                  <div className={styles.cardTitle}>
                    {displayTitle}
                  </div>
                ) : null;
              })()}

              <p className={`${styles.clausePreview} ${(clause.title || getDisplayTitle(clause)) ? styles.clausePreviewShort : ''}`}>
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

      {/* Detail Panel — Management-Tool */}
      {selectedClause && (
        <ClauseDetailSidebar
          clause={selectedClause}
          isDeleting={isDeleting}
          onClose={() => onSelectClause(null)}
          onDelete={() => onDeleteClause(selectedClause._id)}
          onUpdated={(updated) => {
            onSelectClause(updated);
          }}
          onAddToCollection={() => setAddToCollectionData({
            item: { type: 'saved', savedClauseId: selectedClause._id },
            previewText: selectedClause.clausePreview || selectedClause.clauseText,
            previewTitle: `${CATEGORY_INFO[selectedClause.category].icon} ${CATEGORY_INFO[selectedClause.category].label}`
          })}
          formatDate={formatDate}
          navigateToContract={handleNavigateToContract}
        />
      )}

      {/* Add to Collection Modal */}
      {addToCollectionData && (
        <AddToCollectionModal
          item={addToCollectionData.item}
          previewText={addToCollectionData.previewText}
          previewTitle={addToCollectionData.previewTitle}
          onClose={() => setAddToCollectionData(null)}
          onAdded={(_id, name) => {
            setAddToCollectionData(null);
            toast.success(`Zur Sammlung "${name}" hinzugefügt`);
            onCollectionsChanged?.();
          }}
        />
      )}
    </>
  );
};

// ============================================
// ClauseDetailSidebar — Management-Tool
// ============================================

interface ClauseDetailSidebarProps {
  clause: SavedClause;
  isDeleting: boolean;
  onClose: () => void;
  onDelete: () => void;
  onUpdated: (clause: SavedClause) => void;
  onAddToCollection: () => void;
  formatDate: (d: string) => string;
  navigateToContract: (id: string) => void;
}

const ClauseDetailSidebar: React.FC<ClauseDetailSidebarProps> = ({
  clause, isDeleting, onClose, onDelete, onUpdated, onAddToCollection, formatDate, navigateToContract
}) => {
  const toast = useToast();

  // Edit-Modus
  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editTitle, setEditTitle] = useState(clause.title || '');
  const [editCategory, setEditCategory] = useState<ClauseCategory>(clause.category);
  const [editArea, setEditArea] = useState<ClauseArea>(clause.clauseArea);
  const [editNotes, setEditNotes] = useState(clause.userNotes || '');
  const [editTags, setEditTags] = useState<string[]>(clause.tags || []);
  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sammlungen
  const [collections, setCollections] = useState<Array<{ _id: string; name: string; icon: string }>>([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);

  // Reset wenn clause wechselt
  useEffect(() => {
    setEditTitle(clause.title || '');
    setEditCategory(clause.category);
    setEditArea(clause.clauseArea);
    setEditNotes(clause.userNotes || '');
    setEditTags(clause.tags || []);
    setIsEditingMeta(false);
    setSaveSuccess(false);
    setCollectionsLoaded(false);
  }, [clause._id]);

  // Sammlungen laden
  useEffect(() => {
    if (!collectionsLoaded) {
      clauseCollectionAPI.getCollectionsByClause(clause._id)
        .then(res => {
          if (res.success) setCollections(res.collections);
        })
        .catch(() => {})
        .finally(() => setCollectionsLoaded(true));
    }
  }, [clause._id, collectionsLoaded]);

  // Body-Scroll-Lock auf Mobile wenn Sidebar offen (Sidebar ist immer offen wenn Component gemountet)
  useEffect(() => {
    const isMobile = window.innerWidth <= 768;
    if (!isMobile) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await clauseLibraryAPI.updateClause(clause._id, {
        title: editTitle.trim(),
        category: editCategory,
        clauseArea: editArea,
        userNotes: editNotes,
        tags: editTags
      });
      if (response.success) {
        onUpdated(response.clause);
        setIsEditingMeta(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('[ClauseDetail] Save error:', err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim Speichern der Klausel');
    } finally {
      setIsSaving(false);
    }
  };

  // PDF-Export
  const [isExporting, setIsExporting] = useState(false);
  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      const riskLevel = clause.originalAnalysis?.riskLevel;
      const meta: string[] = [];
      if (clause.clauseArea && CLAUSE_AREA_INFO[clause.clauseArea]) {
        meta.push(`Bereich: ${CLAUSE_AREA_INFO[clause.clauseArea].label}`);
      }
      if (riskLevel) {
        const riskLabel = riskLevel === 'high' ? 'Hoch' : riskLevel === 'medium' ? 'Mittel' : 'Niedrig';
        meta.push(`Risiko: ${riskLabel}`);
      }
      if (clause.sourceContractName) {
        meta.push(`Quelle: ${clause.sourceContractName}`);
      }
      meta.push(`Gespeichert: ${formatDate(clause.savedAt)}`);

      await clauseLibraryAPI.exportPdf({
        title: clause.title || 'Klausel',
        mode: 'single',
        sections: [{
          title: clause.title || 'Ohne Titel',
          category: clause.category,
          meta,
          text: clause.clauseText,
          notes: clause.userNotes
        }]
      });
      toast.success('PDF erfolgreich erstellt');
    } catch (err) {
      console.error('[ClauseDetail] PDF export error:', err);
      toast.error(err instanceof Error ? err.message : 'Fehler beim PDF-Export');
    } finally {
      setIsExporting(false);
    }
  };

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !editTags.includes(tag)) {
      setEditTags([...editTags, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag));
  };

  const catInfo = CATEGORY_INFO[clause.category];
  const areaInfo = CLAUSE_AREA_INFO[clause.clauseArea];

  return (
    <div className={styles.detailPanel}>
      {/* Header */}
      <div className={styles.detailHeader}>
        <h3>Klausel-Details</h3>
        <button className={styles.closeDetail} onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      {/* Scrollbarer Inhalt */}
      <div className={styles.detailContent}>
        {/* Titel */}
        <div className={styles.detailSection} onDoubleClick={() => !isEditingMeta && setIsEditingMeta(true)} title={!isEditingMeta ? 'Doppelklick zum Bearbeiten' : undefined}>
          <h4>Titel</h4>
          {isEditingMeta ? (
            <input
              type="text"
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              placeholder="Titel vergeben (z.B. Haftungsklausel, Kündigungsfrist...)"
              maxLength={200}
              className={styles.detailEditInput}
            />
          ) : (
            <p className={`${styles.detailTitleDisplay} ${!clause.title ? styles.placeholder : ''}`}>
              {clause.title || 'Titel hinzufügen...'}
            </p>
          )}
        </div>

        {/* Kategorie & Bereich — editierbar */}
        <div className={styles.detailSection} onDoubleClick={() => !isEditingMeta && setIsEditingMeta(true)} title={!isEditingMeta ? 'Doppelklick zum Bearbeiten' : undefined}>
          <div className={styles.detailSectionHeaderRow}>
            <h4>Kategorie & Bereich</h4>
            {!isEditingMeta ? (
              <button
                onClick={() => setIsEditingMeta(true)}
                className={styles.detailEditBtn}
              >
                <Edit3 size={12} /> Bearbeiten
              </button>
            ) : (
              <div className={styles.detailEditActions}>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={styles.detailSaveBtn}
                >
                  {isSaving ? <Loader2 size={12} className={styles.spinner} /> : <Save size={12} />} Speichern
                </button>
                <button
                  onClick={() => { setIsEditingMeta(false); setEditTitle(clause.title || ''); setEditCategory(clause.category); setEditArea(clause.clauseArea); setEditNotes(clause.userNotes || ''); setEditTags(clause.tags || []); }}
                  className={styles.detailCancelBtn}
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>

          {saveSuccess && (
            <div className={styles.detailSuccessMsg}>
              <Check size={12} /> Gespeichert
            </div>
          )}

          {isEditingMeta ? (
            <>
              <div className={styles.detailEditFieldGroup}>
                <label className={styles.detailEditLabel}>Kategorie</label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value as ClauseCategory)}
                  className={styles.detailEditSelect}
                >
                  {(Object.keys(CATEGORY_INFO) as ClauseCategory[]).map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_INFO[cat].icon} {CATEGORY_INFO[cat].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={styles.detailEditLabel}>Bereich</label>
                <select
                  value={editArea}
                  onChange={e => setEditArea(e.target.value as ClauseArea)}
                  className={styles.detailEditSelect}
                >
                  {(Object.keys(CLAUSE_AREA_INFO) as ClauseArea[]).map(area => (
                    <option key={area} value={area}>{CLAUSE_AREA_INFO[area].icon} {CLAUSE_AREA_INFO[area].label}</option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div className={styles.detailMeta}>
              <span className={styles.detailCategory} style={{ color: catInfo.color, background: catInfo.bgColor }}>
                {catInfo.icon} {catInfo.label}
              </span>
              <span className={styles.detailArea}>
                {areaInfo.icon} {areaInfo.label}
              </span>
            </div>
          )}
        </div>

        {/* Klauseltext */}
        <div className={styles.detailSection}>
          <h4>Klauseltext</h4>
          <p className={styles.fullClauseText}>{clause.clauseText}</p>
        </div>

        {/* Risikoanalyse */}
        {clause.originalAnalysis && (
          <div className={styles.detailSection}>
            <h4>Risikoanalyse</h4>
            <div className={styles.analysisInfo}>
              <div className={styles.analysisItem}>
                <span className={styles.analysisLabel}>Risiko:</span>
                <span className={`${styles.riskBadge} ${styles[clause.originalAnalysis.riskLevel || 'medium']}`}>
                  {clause.originalAnalysis.riskLevel === 'high' ? 'Hoch' :
                   clause.originalAnalysis.riskLevel === 'low' ? 'Niedrig' : 'Mittel'}
                  {clause.originalAnalysis.riskScore !== undefined && (
                    <> ({clause.originalAnalysis.riskScore}%)</>
                  )}
                </span>
              </div>
              {clause.originalAnalysis.mainRisk && (
                <p className={styles.mainRisk}>{clause.originalAnalysis.mainRisk}</p>
              )}
            </div>
          </div>
        )}

        {/* Notizen — immer sichtbar, editierbar */}
        <div className={styles.detailSection} onDoubleClick={() => !isEditingMeta && setIsEditingMeta(true)} title={!isEditingMeta ? 'Doppelklick zum Bearbeiten' : undefined}>
          <h4>Notizen</h4>
          {isEditingMeta ? (
            <textarea
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="Eigene Notizen hinzufügen..."
              maxLength={2000}
              rows={3}
              className={styles.detailEditTextarea}
            />
          ) : (
            <p className={clause.userNotes ? styles.detailNotesText : styles.detailPlaceholderText}>
              {clause.userNotes || 'Notizen hinzufügen...'}
            </p>
          )}
        </div>

        {/* Tags — editierbar */}
        <div className={styles.detailSection} onDoubleClick={() => !isEditingMeta && setIsEditingMeta(true)} title={!isEditingMeta ? 'Doppelklick zum Bearbeiten' : undefined}>
          <h4>Tags</h4>
          {isEditingMeta ? (
            <>
              <div className={styles.detailTagEditRow}>
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  placeholder="Neuen Tag eingeben..."
                  className={styles.detailTagEditInput}
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  className={styles.detailTagAddBtn}
                >
                  <Plus size={14} />
                </button>
              </div>
              <div className={styles.detailEditTagList}>
                {editTags.map(tag => (
                  <span key={tag} className={styles.detailEditTag}>
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className={styles.detailEditTagRemove}>x</button>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.detailTags}>
              {clause.tags.length > 0 ? clause.tags.map(tag => (
                <span key={tag} className={styles.detailTag}>#{tag}</span>
              )) : (
                <span className={styles.detailEmptyHint}>Tags hinzufügen...</span>
              )}
            </div>
          )}
        </div>

        {/* In Sammlungen */}
        <div className={styles.detailSection}>
          <h4>In Sammlungen</h4>
          {!collectionsLoaded ? (
            <span className={styles.detailLoadingText}>Laden...</span>
          ) : collections.length > 0 ? (
            <div className={styles.detailCollectionList}>
              {collections.map(col => (
                <span key={col._id} className={styles.detailCollectionItem}>
                  {col.icon} {col.name}
                </span>
              ))}
            </div>
          ) : (
            <span className={styles.detailEmptyHint}>In keiner Sammlung</span>
          )}
        </div>

        {/* Quellvertrag */}
        {clause.sourceContractName && (
          <div className={styles.detailSection}>
            <h4>Quellvertrag</h4>
            <div className={styles.sourceInfo}>
              <span>{clause.sourceContractName}</span>
              {clause.sourceContractId && (
                <button
                  className={styles.viewSourceBtn}
                  onClick={() => navigateToContract(clause.sourceContractId!)}
                >
                  <ExternalLink size={14} /> Zum Vertrag
                </button>
              )}
            </div>
          </div>
        )}

        {/* Historie */}
        <div className={styles.detailSection}>
          <h4>Historie</h4>
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Gespeichert:</span>
              <span>{formatDate(clause.savedAt)}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Verwendet:</span>
              <span>{clause.usageCount}x</span>
            </div>
            {clause.updatedAt && clause.updatedAt !== clause.savedAt && (
              <div className={styles.metaItem}>
                <span className={styles.metaLabel}>Bearbeitet:</span>
                <span>{formatDate(clause.updatedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Aktionen */}
      <div className={styles.detailActions}>
        <button className={styles.collectionBtn} onClick={onAddToCollection}>
          <FolderPlus size={16} /> Zur Sammlung
        </button>
        <button className={styles.pdfBtn} onClick={handleExportPdf} disabled={isExporting} title="Als PDF exportieren">
          {isExporting ? <Loader2 size={16} className={styles.spinner} /> : <Download size={16} />}
          PDF
        </button>
        <button className={styles.deleteBtn} onClick={onDelete} disabled={isDeleting}>
          {isDeleting ? <Loader2 size={16} className={styles.spinner} /> : <Trash2 size={16} />}
          Löschen
        </button>
      </div>
    </div>
  );
};

export default MeineKlauselnTab;
