// 📁 components/LegalLens/SaveClauseModal.tsx
// Modal zum Speichern einer Klausel in der Bibliothek

import React, { useState, useEffect } from 'react';
import {
  X,
  BookmarkPlus,
  Tag,
  FileText,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Info,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import type {
  ClauseCategory,
  ClauseArea,
  OriginalAnalysis,
  SaveClauseRequest
} from '../../types/clauseLibrary';
import { CATEGORY_INFO, CLAUSE_AREA_INFO } from '../../types/clauseLibrary';
import * as clauseLibraryAPI from '../../services/clauseLibraryAPI';
import styles from '../../styles/SaveClauseModal.module.css';

interface SaveClauseModalProps {
  clauseText: string;
  sourceContractId?: string;
  sourceContractName?: string;
  sourceClauseId?: string;
  originalAnalysis?: OriginalAnalysis;
  onClose: () => void;
  onSaved?: (clauseId: string) => void;
}

const SaveClauseModal: React.FC<SaveClauseModalProps> = ({
  clauseText,
  sourceContractId,
  sourceContractName,
  sourceClauseId,
  originalAnalysis,
  onClose,
  onSaved
}) => {
  const [category, setCategory] = useState<ClauseCategory>('important');
  const [clauseArea, setClauseArea] = useState<ClauseArea>('other');
  const [userNotes, setUserNotes] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Automatisch Kategorie basierend auf Risiko vorschlagen
  useEffect(() => {
    if (originalAnalysis?.riskLevel === 'high' || originalAnalysis?.actionLevel === 'reject') {
      setCategory('risky');
    } else if (originalAnalysis?.riskLevel === 'low' && originalAnalysis?.actionLevel === 'accept') {
      setCategory('good_practice');
    }
  }, [originalAnalysis]);

  const handleAddTag = () => {
    const trimmed = tagInput.trim().toLowerCase();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);

    try {
      const request: SaveClauseRequest = {
        clauseText,
        category,
        clauseArea,
        sourceContractId,
        sourceContractName,
        sourceClauseId,
        originalAnalysis,
        userNotes: userNotes.trim() || undefined,
        tags
      };

      const result = await clauseLibraryAPI.saveClause(request);

      if (result.success) {
        setSuccess(true);
        onSaved?.(result.clause._id);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Fehler beim Speichern';

      // Duplikat-Handling
      if (errorMessage.startsWith('DUPLICATE:')) {
        setError('Diese Klausel ist bereits in deiner Bibliothek gespeichert.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Preview der Klausel
  const clausePreview = clauseText.length > 200
    ? clauseText.substring(0, 200) + '...'
    : clauseText;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Success State */}
        {success ? (
          <div className={styles.successContainer}>
            <CheckCircle size={64} className={styles.successIcon} />
            <h3>Klausel gespeichert!</h3>
            <p>Die Klausel wurde erfolgreich in deiner Bibliothek gespeichert.</p>
            <div className={styles.successActions}>
              <button
                className={styles.libraryBtn}
                onClick={() => {
                  window.open('/clause-library', '_blank');
                  onClose();
                }}
              >
                <BookOpen size={18} />
                Zur Bibliothek
                <ArrowRight size={16} />
              </button>
              <button
                className={styles.closeSuccessBtn}
                onClick={onClose}
              >
                Schließen
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <header className={styles.header}>
              <div className={styles.headerTitle}>
                <BookmarkPlus size={24} />
                <div>
                  <h2>Klausel speichern</h2>
                  {sourceContractName && (
                    <span className={styles.contractName}>aus: {sourceContractName}</span>
                  )}
                </div>
              </div>
              <button className={styles.closeBtn} onClick={onClose}>
                <X size={20} />
              </button>
            </header>

            {/* Content */}
            <div className={styles.content}>
              {/* Error */}
              {error && (
                <div className={styles.errorBox}>
                  <AlertTriangle size={18} />
                  <span>{error}</span>
                </div>
              )}

              {/* Klausel-Preview */}
              <div className={styles.clausePreview}>
                <div className={styles.previewLabel}>
                  <FileText size={16} />
                  <span>Klausel</span>
                </div>
                <p>{clausePreview}</p>
              </div>

              {/* Original Analyse Info */}
              {originalAnalysis && (
                <div className={styles.analysisInfo}>
                  <Info size={16} />
                  <span>
                    Risiko: <strong>{originalAnalysis.riskLevel}</strong>
                    {originalAnalysis.riskScore !== undefined && (
                      <> ({originalAnalysis.riskScore}%)</>
                    )}
                  </span>
                </div>
              )}

              {/* Kategorie */}
              <div className={styles.formGroup}>
                <label>Kategorie</label>
                <div className={styles.categoryGrid}>
                  {(Object.keys(CATEGORY_INFO) as ClauseCategory[]).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`${styles.categoryBtn} ${category === cat ? styles.active : ''}`}
                      style={{
                        '--cat-color': CATEGORY_INFO[cat].color,
                        '--cat-bg': CATEGORY_INFO[cat].bgColor
                      } as React.CSSProperties}
                      onClick={() => setCategory(cat)}
                    >
                      <span className={styles.categoryIcon}>{CATEGORY_INFO[cat].icon}</span>
                      <span>{CATEGORY_INFO[cat].label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Klauselbereich */}
              <div className={styles.formGroup}>
                <label>Bereich</label>
                <select
                  value={clauseArea}
                  onChange={e => setClauseArea(e.target.value as ClauseArea)}
                  className={styles.select}
                >
                  {(Object.keys(CLAUSE_AREA_INFO) as ClauseArea[]).map(area => (
                    <option key={area} value={area}>
                      {CLAUSE_AREA_INFO[area].icon} {CLAUSE_AREA_INFO[area].label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div className={styles.formGroup}>
                <label>
                  <Tag size={14} />
                  Tags
                </label>
                <div className={styles.tagInput}>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tag eingeben und Enter drücken"
                    className={styles.input}
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className={styles.addTagBtn}
                    disabled={!tagInput.trim()}
                  >
                    +
                  </button>
                </div>
                {tags.length > 0 && (
                  <div className={styles.tagList}>
                    {tags.map(tag => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                        <button onClick={() => handleRemoveTag(tag)}>&times;</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Notizen */}
              <div className={styles.formGroup}>
                <label>Notizen (optional)</label>
                <textarea
                  value={userNotes}
                  onChange={e => setUserNotes(e.target.value)}
                  placeholder="Warum speicherst du diese Klausel? Worauf achten?"
                  rows={3}
                  className={styles.textarea}
                />
              </div>
            </div>

            {/* Footer */}
            <footer className={styles.footer}>
              <button
                type="button"
                onClick={onClose}
                className={styles.cancelBtn}
                disabled={isSaving}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleSave}
                className={styles.saveBtn}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <Loader2 className={styles.spinner} size={18} />
                    Speichern...
                  </>
                ) : (
                  <>
                    <BookmarkPlus size={18} />
                    In Bibliothek speichern
                  </>
                )}
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
};

export default SaveClauseModal;
