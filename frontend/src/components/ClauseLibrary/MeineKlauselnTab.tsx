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
}) => {
  const navigate = useNavigate();
  const [addToCollectionData, setAddToCollectionData] = useState<{
    item: AddCollectionItemRequest;
    previewText: string;
    previewTitle: string;
  } | null>(null);

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

              {clause.title && (
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', marginBottom: '0.25rem' }}>
                  {clause.title}
                </div>
              )}

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
          onAdded={() => setAddToCollectionData(null)}
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
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600 }}
            />
          ) : (
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: clause.title ? '#1e293b' : '#94a3b8', fontStyle: clause.title ? 'normal' : 'italic' }}>
              {clause.title || 'Titel hinzufügen...'}
            </p>
          )}
        </div>

        {/* Kategorie & Bereich — editierbar */}
        <div className={styles.detailSection} onDoubleClick={() => !isEditingMeta && setIsEditingMeta(true)} title={!isEditingMeta ? 'Doppelklick zum Bearbeiten' : undefined}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0 }}>Kategorie & Bereich</h4>
            {!isEditingMeta ? (
              <button
                onClick={() => setIsEditingMeta(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b', fontSize: '0.7rem', cursor: 'pointer' }}
              >
                <Edit3 size={12} /> Bearbeiten
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem 0.5rem', background: '#10b981', border: 'none', borderRadius: '6px', color: 'white', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  {isSaving ? <Loader2 size={12} className={styles.spinner} /> : <Save size={12} />} Speichern
                </button>
                <button
                  onClick={() => { setIsEditingMeta(false); setEditTitle(clause.title || ''); setEditCategory(clause.category); setEditArea(clause.clauseArea); setEditNotes(clause.userNotes || ''); setEditTags(clause.tags || []); }}
                  style={{ padding: '0.25rem 0.5rem', background: 'none', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b', fontSize: '0.7rem', cursor: 'pointer' }}
                >
                  Abbrechen
                </button>
              </div>
            )}
          </div>

          {saveSuccess && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.625rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', marginBottom: '0.5rem', fontSize: '0.75rem', color: '#16a34a' }}>
              <Check size={12} /> Gespeichert
            </div>
          )}

          {isEditingMeta ? (
            <>
              <div style={{ marginBottom: '0.625rem' }}>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Kategorie</label>
                <select
                  value={editCategory}
                  onChange={e => setEditCategory(e.target.value as ClauseCategory)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
                >
                  {(Object.keys(CATEGORY_INFO) as ClauseCategory[]).map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_INFO[cat].icon} {CATEGORY_INFO[cat].label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.7rem', fontWeight: 600, color: '#64748b', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bereich</label>
                <select
                  value={editArea}
                  onChange={e => setEditArea(e.target.value as ClauseArea)}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem' }}
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
              style={{ width: '100%', padding: '0.625rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.85rem', resize: 'vertical', fontFamily: 'inherit' }}
            />
          ) : (
            <p style={{ margin: 0, fontSize: '0.85rem', color: clause.userNotes ? '#334155' : '#94a3b8', fontStyle: clause.userNotes ? 'normal' : 'italic' }}>
              {clause.userNotes || 'Notizen hinzufügen...'}
            </p>
          )}
        </div>

        {/* Tags — editierbar */}
        <div className={styles.detailSection} onDoubleClick={() => !isEditingMeta && setIsEditingMeta(true)} title={!isEditingMeta ? 'Doppelklick zum Bearbeiten' : undefined}>
          <h4>Tags</h4>
          {isEditingMeta ? (
            <>
              <div style={{ display: 'flex', gap: '0.375rem', marginBottom: '0.375rem' }}>
                <input
                  type="text"
                  value={newTag}
                  onChange={e => setNewTag(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
                  placeholder="Neuen Tag eingeben..."
                  style={{ flex: 1, padding: '0.375rem 0.625rem', border: '1px solid #e2e8f0', borderRadius: '6px', fontSize: '0.8rem' }}
                />
                <button
                  onClick={handleAddTag}
                  disabled={!newTag.trim()}
                  style={{ padding: '0.375rem 0.625rem', background: '#10b981', border: 'none', borderRadius: '6px', color: 'white', fontSize: '0.8rem', cursor: 'pointer', opacity: newTag.trim() ? 1 : 0.5 }}
                >
                  <Plus size={14} />
                </button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {editTags.map(tag => (
                  <span key={tag} style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                    padding: '0.2rem 0.5rem', background: '#f1f5f9', borderRadius: '4px',
                    fontSize: '0.75rem', color: '#475569'
                  }}>
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 0, fontSize: '0.85rem', lineHeight: 1 }}>x</button>
                  </span>
                ))}
              </div>
            </>
          ) : (
            <div className={styles.detailTags}>
              {clause.tags.length > 0 ? clause.tags.map(tag => (
                <span key={tag} className={styles.detailTag}>#{tag}</span>
              )) : (
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>Tags hinzufügen...</span>
              )}
            </div>
          )}
        </div>

        {/* In Sammlungen */}
        <div className={styles.detailSection}>
          <h4>In Sammlungen</h4>
          {!collectionsLoaded ? (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Laden...</span>
          ) : collections.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {collections.map(col => (
                <span key={col._id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
                  fontSize: '0.8rem', color: '#475569'
                }}>
                  {col.icon} {col.name}
                </span>
              ))}
            </div>
          ) : (
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>In keiner Sammlung</span>
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
