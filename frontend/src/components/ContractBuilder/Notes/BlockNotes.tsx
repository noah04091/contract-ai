/**
 * BlockNotes - Kommentare/Notizen für einzelne Blöcke
 * Wird im PropertiesPanel oder als Overlay angezeigt
 */

import React, { useState } from 'react';
import { MessageSquare, Check, Trash2, CheckCircle, Circle, Send } from 'lucide-react';
import { BlockNote } from '../../../stores/contractBuilderStore';
import styles from './BlockNotes.module.css';

interface BlockNotesProps {
  blockId: string;
  notes: BlockNote[];
  onAddNote: (blockId: string, text: string) => void;
  onUpdateNote: (blockId: string, noteId: string, text: string) => void;
  onDeleteNote: (blockId: string, noteId: string) => void;
  onResolveNote: (blockId: string, noteId: string, resolved: boolean) => void;
  isPreview?: boolean;
  hideHeader?: boolean; // Header ausblenden wenn in Section verwendet
}

export const BlockNotes: React.FC<BlockNotesProps> = ({
  blockId,
  notes,
  onAddNote,
  onUpdateNote,
  onDeleteNote,
  onResolveNote,
  isPreview = false,
  hideHeader = false,
}) => {
  const [newNoteText, setNewNoteText] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [showResolved, setShowResolved] = useState(false);

  // Im Preview-Modus nichts anzeigen
  if (isPreview) return null;

  const activeNotes = notes.filter(n => !n.resolved);
  const resolvedNotes = notes.filter(n => n.resolved);

  const handleAddNote = () => {
    if (!newNoteText.trim()) return;
    onAddNote(blockId, newNoteText.trim());
    setNewNoteText('');
  };

  const handleStartEdit = (note: BlockNote) => {
    setEditingNoteId(note.id);
    setEditText(note.text);
  };

  const handleSaveEdit = () => {
    if (editingNoteId && editText.trim()) {
      onUpdateNote(blockId, editingNoteId, editText.trim());
    }
    setEditingNoteId(null);
    setEditText('');
  };

  const formatDate = (date: Date) => {
    const d = new Date(date);
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={`${styles.notesContainer} ${hideHeader ? styles.noHeader : ''}`}>
      {!hideHeader && (
        <div className={styles.header}>
          <MessageSquare size={14} />
          <span>Notizen</span>
          <span className={styles.count}>
            {activeNotes.length}{resolvedNotes.length > 0 && ` (${resolvedNotes.length} erledigt)`}
          </span>
        </div>
      )}

      {/* Neue Notiz hinzufügen */}
      <div className={styles.addNote}>
        <input
          type="text"
          placeholder="Notiz hinzufügen..."
          value={newNoteText}
          onChange={(e) => setNewNoteText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleAddNote();
            }
          }}
        />
        <button
          onClick={handleAddNote}
          disabled={!newNoteText.trim()}
          title="Notiz hinzufügen"
        >
          <Send size={14} />
        </button>
      </div>

      {/* Aktive Notizen */}
      <div className={styles.notesList}>
        {activeNotes.length === 0 && resolvedNotes.length === 0 && (
          <div className={styles.emptyState}>
            Keine Notizen vorhanden
          </div>
        )}

        {activeNotes.map(note => (
          <div key={note.id} className={styles.noteItem}>
            <button
              className={styles.resolveBtn}
              onClick={() => onResolveNote(blockId, note.id, true)}
              title="Als erledigt markieren"
            >
              <Circle size={14} />
            </button>

            {editingNoteId === note.id ? (
              <div className={styles.editArea}>
                <input
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit();
                    if (e.key === 'Escape') setEditingNoteId(null);
                  }}
                  autoFocus
                />
                <button onClick={handleSaveEdit}>
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <div className={styles.noteContent} onClick={() => handleStartEdit(note)}>
                <span className={styles.noteText}>{note.text}</span>
                <span className={styles.noteDate}>{formatDate(note.createdAt)}</span>
              </div>
            )}

            <button
              className={styles.deleteBtn}
              onClick={() => onDeleteNote(blockId, note.id)}
              title="Löschen"
            >
              <Trash2 size={12} />
            </button>
          </div>
        ))}
      </div>

      {/* Erledigte Notizen (ausklappbar) */}
      {resolvedNotes.length > 0 && (
        <div className={styles.resolvedSection}>
          <button
            className={styles.toggleResolved}
            onClick={() => setShowResolved(!showResolved)}
          >
            <CheckCircle size={12} />
            <span>{resolvedNotes.length} erledigt</span>
          </button>

          {showResolved && (
            <div className={styles.resolvedList}>
              {resolvedNotes.map(note => (
                <div key={note.id} className={`${styles.noteItem} ${styles.resolved}`}>
                  <button
                    className={styles.resolveBtn}
                    onClick={() => onResolveNote(blockId, note.id, false)}
                    title="Wiederherstellen"
                  >
                    <CheckCircle size={14} />
                  </button>
                  <div className={styles.noteContent}>
                    <span className={styles.noteText}>{note.text}</span>
                    <span className={styles.noteDate}>{formatDate(note.createdAt)}</span>
                  </div>
                  <button
                    className={styles.deleteBtn}
                    onClick={() => onDeleteNote(blockId, note.id)}
                    title="Löschen"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BlockNotes;
