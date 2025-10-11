// 📁 FolderModal.tsx - Create/Edit Folder Modal
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import styles from '../styles/FolderModal.module.css';
import type { FolderType } from './FolderSidebar';

interface FolderModalProps {
  isOpen: boolean;
  folder?: FolderType | null; // If provided, edit mode
  onClose: () => void;
  onSave: (data: { name: string; color: string; icon: string }) => Promise<void>;
}

const PRESET_COLORS = [
  '#667eea', // Purple
  '#10b981', // Green
  '#3b82f6', // Blue
  '#f59e0b', // Orange
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4'  // Cyan
];

const PRESET_ICONS = [
  '📁', '📂', '💼', '🏢', '🏠', '💰', '📄', '📋',
  '🛡️', '🎬', '📺', '💳', '🚗', '✈️', '🏥', '📱'
];

export default function FolderModal({ isOpen, folder, onClose, onSave }: FolderModalProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#667eea');
  const [icon, setIcon] = useState('📁');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when modal opens/closes or folder changes
  useEffect(() => {
    if (isOpen) {
      if (folder) {
        // Edit mode
        setName(folder.name);
        setColor(folder.color);
        setIcon(folder.icon);
      } else {
        // Create mode
        setName('');
        setColor('#667eea');
        setIcon('📁');
      }
      setError(null);
    }
  }, [isOpen, folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Bitte gib einen Ordnernamen ein');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        name: name.trim(),
        color,
        icon
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Speichern');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>{folder ? 'Ordner bearbeiten' : 'Neuer Ordner'}</h3>
          <button className={styles.closeBtn} onClick={onClose} disabled={isSaving}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Name Input */}
          <div className={styles.field}>
            <label htmlFor="folderName">Ordnername</label>
            <input
              id="folderName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Versicherungen"
              maxLength={50}
              disabled={isSaving}
              autoFocus
            />
          </div>

          {/* Icon Selector */}
          <div className={styles.field}>
            <label>Icon</label>
            <div className={styles.iconGrid}>
              {PRESET_ICONS.map((presetIcon) => (
                <button
                  key={presetIcon}
                  type="button"
                  className={`${styles.iconBtn} ${icon === presetIcon ? styles.active : ''}`}
                  onClick={() => setIcon(presetIcon)}
                  disabled={isSaving}
                >
                  {presetIcon}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div className={styles.field}>
            <label>Farbe</label>
            <div className={styles.colorGrid}>
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={`${styles.colorBtn} ${color === presetColor ? styles.active : ''}`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                  disabled={isSaving}
                  title={presetColor}
                >
                  {color === presetColor && <span className={styles.checkmark}>✓</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className={styles.preview}>
            <span className={styles.previewLabel}>Vorschau:</span>
            <div className={styles.previewItem}>
              <span className={styles.previewIcon}>{icon}</span>
              <span className={styles.previewName}>{name || 'Ordnername'}</span>
              <span
                className={styles.previewCount}
                style={{ backgroundColor: color + '20', color }}
              >
                0
              </span>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className={styles.error}>
              {error}
            </div>
          )}

          {/* Actions */}
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isSaving}
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className={styles.saveBtn}
              disabled={isSaving || !name.trim()}
            >
              {isSaving ? 'Speichern...' : folder ? 'Speichern' : 'Erstellen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
