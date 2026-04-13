// CreateCollectionModal.tsx - Modal zum Erstellen einer neuen Klausel-Sammlung

import React, { useState } from 'react';
import { X, FolderPlus, Loader2 } from 'lucide-react';
import * as clauseCollectionAPI from '../../services/clauseCollectionAPI';
import type { ClauseCollection } from '../../types/clauseLibrary';
import styles from '../../styles/SaveClauseModal.module.css';

const ICON_OPTIONS = ['📁', '📋', '📑', '📂', '⚖️', '🏠', '💼', '🔧', '💻', '🏗️', '🛡️', '📜'];

const COLOR_OPTIONS = [
  '#6366f1', '#3b82f6', '#10b981', '#f59e0b',
  '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4',
  '#84cc16', '#f97316', '#64748b', '#14b8a6'
];

interface CreateCollectionModalProps {
  onClose: () => void;
  onCreated: (collection: ClauseCollection) => void;
}

const CreateCollectionModal: React.FC<CreateCollectionModalProps> = ({ onClose, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('📁');
  const [color, setColor] = useState('#6366f1');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (name.trim().length < 2) {
      setError('Name muss mindestens 2 Zeichen haben');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await clauseCollectionAPI.createCollection({
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        color
      });

      if (response.success) {
        onCreated(response.collection);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Erstellen';
      if (msg.includes('existiert bereits')) {
        setError('Eine Sammlung mit diesem Namen existiert bereits');
      } else {
        setError(msg);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <FolderPlus size={20} />
            <div>
              <h2>Neue Sammlung erstellen</h2>
              <span className={styles.contractName}>Klauseln thematisch gruppieren</span>
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

          {/* Name */}
          <div className={styles.formGroup}>
            <label>Name der Sammlung *</label>
            <input
              type="text"
              className={styles.input}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder='z.B. "Arbeitsverträge", "Werkverträge"...'
              maxLength={100}
              autoFocus
            />
          </div>

          {/* Description */}
          <div className={styles.formGroup}>
            <label>Beschreibung (optional)</label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Wofür ist diese Sammlung gedacht?"
              maxLength={500}
              rows={2}
            />
          </div>

          {/* Icon Selection */}
          <div className={styles.formGroup}>
            <label>Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {ICON_OPTIONS.map(ic => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  style={{
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.25rem',
                    background: icon === ic ? '#f0f9ff' : 'white',
                    border: icon === ic ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className={styles.formGroup}>
            <label>Farbe</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  style={{
                    width: '32px',
                    height: '32px',
                    background: c,
                    border: color === c ? '3px solid #1e293b' : '2px solid transparent',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    outline: color === c ? '2px solid white' : 'none',
                    outlineOffset: '-4px'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className={styles.clausePreview}>
            <div className={styles.previewLabel}>Vorschau</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.5rem' }}>{icon}</span>
              <span style={{
                fontWeight: 600,
                color: color,
                fontSize: '1rem'
              }}>
                {name || 'Sammlungsname...'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onClose} disabled={isSaving}>
            Abbrechen
          </button>
          <button
            className={styles.saveBtn}
            onClick={handleCreate}
            disabled={isSaving || name.trim().length < 2}
          >
            {isSaving ? (
              <Loader2 size={16} className={styles.spinner} />
            ) : (
              <FolderPlus size={16} />
            )}
            {isSaving ? 'Erstelle...' : 'Sammlung erstellen'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateCollectionModal;
