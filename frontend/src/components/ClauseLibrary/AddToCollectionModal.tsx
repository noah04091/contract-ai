// AddToCollectionModal.tsx - Modal zum Hinzufuegen einer Klausel zu einer Sammlung

import React, { useState, useEffect } from 'react';
import {
  X,
  FolderPlus,
  Loader2,
  CheckCircle,
  Plus,
  BookOpen,
  ArrowRight
} from 'lucide-react';
import * as clauseCollectionAPI from '../../services/clauseCollectionAPI';
import type {
  ClauseCollection,
  AddCollectionItemRequest
} from '../../types/clauseLibrary';
import styles from '../../styles/SaveClauseModal.module.css';

interface AddToCollectionModalProps {
  /** Was hinzugefuegt werden soll */
  item: AddCollectionItemRequest;
  /** Anzeige-Text fuer die Vorschau */
  previewText: string;
  /** Anzeige-Titel */
  previewTitle?: string;
  onClose: () => void;
  onAdded?: (collectionId: string, collectionName: string) => void;
}

const AddToCollectionModal: React.FC<AddToCollectionModalProps> = ({
  item,
  previewText,
  previewTitle,
  onClose,
  onAdded
}) => {
  const [collections, setCollections] = useState<ClauseCollection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ name: string } | null>(null);

  // Inline-Erstellung
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadCollections();
  }, []);

  const loadCollections = async () => {
    setIsLoading(true);
    try {
      const response = await clauseCollectionAPI.getCollections();
      if (response.success) {
        setCollections(response.collections);
      }
    } catch (err) {
      console.error('[AddToCollection] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedId) return;

    setIsSaving(true);
    setError(null);

    try {
      await clauseCollectionAPI.addItem(selectedId, item);
      const collection = collections.find(c => c._id === selectedId);
      setSuccess({ name: collection?.name || '' });
      onAdded?.(selectedId, collection?.name || '');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      if (msg === 'DUPLICATE') {
        setError('Dieser Eintrag ist bereits in der Sammlung');
      } else {
        setError(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateAndAdd = async () => {
    if (newName.trim().length < 2) return;

    setIsCreating(true);
    setError(null);

    try {
      const createResponse = await clauseCollectionAPI.createCollection({
        name: newName.trim()
      });

      if (createResponse.success) {
        // Direkt zur neuen Sammlung hinzufuegen
        await clauseCollectionAPI.addItem(createResponse.collection._id, item);
        setSuccess({ name: createResponse.collection.name });
        onAdded?.(createResponse.collection._id, createResponse.collection.name);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setIsCreating(false);
    }
  };

  // Erfolgs-Ansicht
  if (success) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.modal} onClick={e => e.stopPropagation()}>
          <div className={styles.successContainer}>
            <CheckCircle size={48} className={styles.successIcon} />
            <h3>Zur Sammlung hinzugefuegt!</h3>
            <p>Der Eintrag wurde zu "{success.name}" hinzugefuegt.</p>
            <div className={styles.successActions}>
              <button className={styles.closeSuccessBtn} onClick={onClose}>
                Schliessen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <FolderPlus size={20} />
            <div>
              <h2>Zur Sammlung hinzufuegen</h2>
              {previewTitle && (
                <span className={styles.contractName}>{previewTitle}</span>
              )}
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {error && (
            <div className={styles.errorBox}>
              <span>{error}</span>
            </div>
          )}

          {/* Vorschau */}
          <div className={styles.clausePreview}>
            <div className={styles.previewLabel}>Eintrag</div>
            <p style={{ fontSize: '0.85rem', color: '#334155', margin: 0 }}>
              {previewText.length > 200 ? previewText.substring(0, 200) + '...' : previewText}
            </p>
          </div>

          {/* Sammlungen-Liste */}
          {isLoading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', gap: '0.5rem', color: '#64748b' }}>
              <Loader2 size={18} className={styles.spinner} />
              <span>Lade Sammlungen...</span>
            </div>
          ) : (
            <>
              {collections.length > 0 && !showCreate && (
                <div className={styles.formGroup}>
                  <label>Sammlung auswaehlen</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                    {collections.map(col => (
                      <button
                        key={col._id}
                        type="button"
                        onClick={() => setSelectedId(col._id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.625rem',
                          padding: '0.75rem',
                          background: selectedId === col._id ? '#f0f9ff' : 'white',
                          border: selectedId === col._id ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                          textAlign: 'left',
                          width: '100%'
                        }}
                      >
                        <span style={{ fontSize: '1.25rem' }}>{col.icon || '📁'}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem' }}>
                            {col.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                            {col.itemCount || 0} Eintraege
                          </div>
                        </div>
                        {selectedId === col._id && (
                          <CheckCircle size={18} style={{ color: '#3b82f6' }} />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Neue Sammlung erstellen */}
              {!showCreate ? (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    width: '100%',
                    padding: '0.75rem',
                    background: '#f8fafc',
                    border: '1px dashed #cbd5e1',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: '#64748b',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    transition: 'all 0.15s'
                  }}
                >
                  <Plus size={18} />
                  Neue Sammlung erstellen
                </button>
              ) : (
                <div className={styles.formGroup}>
                  <label>Neue Sammlung erstellen</label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type="text"
                      className={styles.input}
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder='z.B. "Arbeitsvertraege"'
                      maxLength={100}
                      autoFocus
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newName.trim().length >= 2) {
                          handleCreateAndAdd();
                        }
                      }}
                    />
                    <button
                      className={styles.saveBtn}
                      onClick={handleCreateAndAdd}
                      disabled={isCreating || newName.trim().length < 2}
                      style={{ whiteSpace: 'nowrap' }}
                    >
                      {isCreating ? (
                        <Loader2 size={16} className={styles.spinner} />
                      ) : (
                        <Plus size={16} />
                      )}
                      Erstellen
                    </button>
                  </div>
                  {collections.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowCreate(false)}
                      style={{
                        marginTop: '0.375rem',
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        padding: 0
                      }}
                    >
                      Abbrechen
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!showCreate && (
          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={onClose} disabled={isSaving}>
              Abbrechen
            </button>
            <button
              className={styles.saveBtn}
              onClick={handleAdd}
              disabled={isSaving || !selectedId}
            >
              {isSaving ? (
                <Loader2 size={16} className={styles.spinner} />
              ) : (
                <FolderPlus size={16} />
              )}
              {isSaving ? 'Hinzufuegen...' : 'Hinzufuegen'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddToCollectionModal;
