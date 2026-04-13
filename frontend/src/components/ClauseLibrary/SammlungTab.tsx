// SammlungTab.tsx - Inhalt eines benutzerdefinierten Sammlungs-Tabs

import React, { useState, useEffect, useCallback } from 'react';
import {
  Loader2,
  AlertTriangle,
  Trash2,
  Plus,
  Edit3,
  FileText,
  BookOpen,
  Scale,
  PenTool,
  X,
  GripVertical,
  Check,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import * as clauseCollectionAPI from '../../services/clauseCollectionAPI';
import type { ClauseCollection, CollectionItem } from '../../types/clauseLibrary';
import { CATEGORY_INFO, CLAUSE_AREA_INFO } from '../../types/clauseLibrary';
import { templateClauses } from '../../data/templateClauses';
import { legalTerms } from '../../data/legalTerms';
import styles from '../../styles/ClauseLibraryPage.module.css';

interface SammlungTabProps {
  collectionId: string;
  onCollectionDeleted: () => void;
  onCollectionUpdated: () => void;
}

const SammlungTab: React.FC<SammlungTabProps> = ({
  collectionId,
  onCollectionDeleted,
  onCollectionUpdated
}) => {
  const [collection, setCollection] = useState<ClauseCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  // Freitext-Formular
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customText, setCustomText] = useState('');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  // Sammlung bearbeiten
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Sammlung loeschen
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadCollection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await clauseCollectionAPI.getCollection(collectionId);
      if (response.success) {
        setCollection(response.collection);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setIsLoading(false);
    }
  }, [collectionId]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  // Item-Daten aufloesen (Template/Lexikon werden client-seitig aufgeloest)
  const resolveItem = (item: CollectionItem) => {
    if (item.type === 'template' && item.templateClauseId) {
      const template = templateClauses.find(t => t.id === item.templateClauseId);
      if (template) {
        return { title: template.title, text: template.clauseText, source: 'Musterklausel', icon: <FileText size={14} /> };
      }
      return { title: 'Musterklausel nicht gefunden', text: '', source: 'Musterklausel', icon: <FileText size={14} />, deleted: true };
    }

    if (item.type === 'lexikon' && item.legalTermId) {
      const term = legalTerms.find(t => t.id === item.legalTermId);
      if (term) {
        return { title: term.term, text: term.simpleExplanation, source: 'Rechtslexikon', icon: <Scale size={14} /> };
      }
      return { title: 'Begriff nicht gefunden', text: '', source: 'Rechtslexikon', icon: <Scale size={14} />, deleted: true };
    }

    if (item.type === 'saved' && item.resolvedClause) {
      const catInfo = CATEGORY_INFO[item.resolvedClause.category];
      return {
        title: `${catInfo?.icon || ''} ${catInfo?.label || 'Klausel'}`,
        text: item.resolvedClause.clauseText,
        source: 'Meine Klauseln',
        icon: <BookOpen size={14} />,
        category: item.resolvedClause.category,
        area: item.resolvedClause.clauseArea
      };
    }

    if (item.type === 'saved' && item._deleted) {
      return { title: 'Klausel wurde geloescht', text: '', source: 'Meine Klauseln', icon: <BookOpen size={14} />, deleted: true };
    }

    if (item.type === 'custom') {
      return {
        title: item.customTitle || 'Eigene Klausel',
        text: item.customText || '',
        source: 'Eigene Klausel',
        icon: <PenTool size={14} />
      };
    }

    return { title: 'Unbekannt', text: '', source: '', icon: <FileText size={14} /> };
  };

  const handleRemoveItem = async (itemId: string) => {
    if (!collection) return;
    setRemovingItemId(itemId);
    try {
      await clauseCollectionAPI.removeItem(collection._id, itemId);
      setCollection(prev => {
        if (!prev) return prev;
        return { ...prev, items: prev.items.filter(i => i._id !== itemId) };
      });
      onCollectionUpdated();
    } catch (err) {
      console.error('[SammlungTab] Remove error:', err);
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleAddCustom = async () => {
    if (!collection || customText.trim().length < 5) return;
    setIsAddingCustom(true);
    try {
      await clauseCollectionAPI.addItem(collection._id, {
        type: 'custom',
        customTitle: customTitle.trim() || undefined,
        customText: customText.trim()
      });
      setCustomTitle('');
      setCustomText('');
      setShowCustomForm(false);
      loadCollection();
      onCollectionUpdated();
    } catch (err) {
      console.error('[SammlungTab] Add custom error:', err);
    } finally {
      setIsAddingCustom(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!collection) return;
    setIsSavingEdit(true);
    try {
      const response = await clauseCollectionAPI.updateCollection(collection._id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined
      });
      if (response.success) {
        setCollection(prev => prev ? { ...prev, name: editName.trim(), description: editDescription.trim() } : prev);
        setIsEditing(false);
        onCollectionUpdated();
      }
    } catch (err) {
      console.error('[SammlungTab] Edit error:', err);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteCollection = async () => {
    if (!collection) return;
    setIsDeleting(true);
    try {
      await clauseCollectionAPI.deleteCollection(collection._id);
      onCollectionDeleted();
    } catch (err) {
      console.error('[SammlungTab] Delete error:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Loading
  if (isLoading) {
    return (
      <div className={styles.loadingState}>
        <Loader2 className={styles.spinner} size={48} />
        <p>Lade Sammlung...</p>
      </div>
    );
  }

  // Error
  if (error || !collection) {
    return (
      <div className={styles.errorState}>
        <AlertTriangle size={48} />
        <h3>Fehler beim Laden</h3>
        <p>{error || 'Sammlung nicht gefunden'}</p>
        <button onClick={loadCollection} className={styles.retryBtn}>
          Erneut versuchen
        </button>
      </div>
    );
  }

  const items = collection.items || [];

  return (
    <div>
      {/* Sammlungs-Header */}
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        marginBottom: '1rem',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        {isEditing ? (
          <div style={{ flex: 1 }}>
            <input
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                marginBottom: '0.5rem'
              }}
              autoFocus
            />
            <textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              placeholder="Beschreibung (optional)"
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '0.85rem',
                resize: 'none',
                minHeight: '50px'
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button
                onClick={handleSaveEdit}
                disabled={isSavingEdit || editName.trim().length < 2}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.375rem',
                  padding: '0.375rem 0.75rem',
                  background: '#10b981', border: 'none', borderRadius: '6px',
                  color: 'white', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer'
                }}
              >
                {isSavingEdit ? <Loader2 size={14} className={styles.spinner} /> : <Check size={14} />}
                Speichern
              </button>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  padding: '0.375rem 0.75rem',
                  background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px',
                  color: '#64748b', fontSize: '0.8rem', cursor: 'pointer'
                }}
              >
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{collection.icon}</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>
                  {collection.name}
                </h3>
                <span style={{
                  fontSize: '0.75rem', color: '#94a3b8',
                  background: '#f1f5f9', padding: '0.125rem 0.5rem',
                  borderRadius: '10px'
                }}>
                  {items.length} {items.length === 1 ? 'Eintrag' : 'Eintraege'}
                </span>
              </div>
              {collection.description && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                  {collection.description}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
              <button
                onClick={() => {
                  setEditName(collection.name);
                  setEditDescription(collection.description || '');
                  setIsEditing(true);
                }}
                style={{
                  padding: '0.375rem', background: 'white', border: '1px solid #e2e8f0',
                  borderRadius: '6px', color: '#64748b', cursor: 'pointer'
                }}
                title="Sammlung bearbeiten"
              >
                <Edit3 size={16} />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  padding: '0.375rem', background: 'white', border: '1px solid #e2e8f0',
                  borderRadius: '6px', color: '#ef4444', cursor: 'pointer'
                }}
                title="Sammlung loeschen"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Loeschen-Bestaetigung */}
      {showDeleteConfirm && (
        <div style={{
          background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px',
          padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: '1rem'
        }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#991b1b' }}>
            Sammlung "{collection.name}" wirklich loeschen? Die enthaltenen Klauseln bleiben in ihren Quellen erhalten.
          </p>
          <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
            <button
              onClick={handleDeleteCollection}
              disabled={isDeleting}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.25rem',
                padding: '0.375rem 0.75rem',
                background: '#ef4444', border: 'none', borderRadius: '6px',
                color: 'white', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer'
              }}
            >
              {isDeleting ? <Loader2 size={14} className={styles.spinner} /> : <Trash2 size={14} />}
              Loeschen
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                padding: '0.375rem 0.75rem',
                background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px',
                color: '#64748b', fontSize: '0.8rem', cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Aktionen */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button
          onClick={() => setShowCustomForm(!showCustomForm)}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 0.875rem',
            background: showCustomForm ? '#f0f9ff' : 'white',
            border: showCustomForm ? '1px solid #93c5fd' : '1px solid #e2e8f0',
            borderRadius: '8px', color: showCustomForm ? '#2563eb' : '#475569',
            fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer'
          }}
        >
          <PenTool size={15} />
          Eigene Klausel schreiben
        </button>
      </div>

      {/* Freitext-Formular */}
      {showCustomForm && (
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
          padding: '1rem', marginBottom: '1rem'
        }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
              Titel (optional)
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder='z.B. "Kuendigungsfrist 3 Monate"'
              maxLength={200}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                border: '1px solid #e2e8f0', borderRadius: '8px',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>
              Klauseltext *
            </label>
            <textarea
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              placeholder="Klausel hier eingeben..."
              rows={4}
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                border: '1px solid #e2e8f0', borderRadius: '8px',
                fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleAddCustom}
              disabled={isAddingCustom || customText.trim().length < 5}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.375rem',
                padding: '0.5rem 0.875rem',
                background: '#10b981', border: 'none', borderRadius: '8px',
                color: 'white', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer',
                opacity: (isAddingCustom || customText.trim().length < 5) ? 0.6 : 1
              }}
            >
              {isAddingCustom ? <Loader2 size={15} className={styles.spinner} /> : <Plus size={15} />}
              Hinzufuegen
            </button>
            <button
              onClick={() => { setShowCustomForm(false); setCustomTitle(''); setCustomText(''); }}
              style={{
                padding: '0.5rem 0.875rem',
                background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px',
                color: '#64748b', fontSize: '0.85rem', cursor: 'pointer'
              }}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Items Liste */}
      {items.length === 0 ? (
        <div className={styles.emptyStateEnhanced}>
          <div className={styles.emptyIconWrapper}>
            <BookOpen size={48} />
          </div>
          <h3>Sammlung ist noch leer</h3>
          <p>
            Fuege Klauseln aus "Meine Klauseln", "Musterklauseln" oder dem "Rechtslexikon" hinzu,
            oder schreibe eigene Klauseln direkt hier.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {items
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(item => {
              const resolved = resolveItem(item);
              const isExpanded = expandedItem === item._id;

              return (
                <div
                  key={item._id}
                  style={{
                    background: resolved.deleted ? '#fef2f2' : 'white',
                    border: `1px solid ${resolved.deleted ? '#fecaca' : '#e2e8f0'}`,
                    borderRadius: '10px',
                    overflow: 'hidden',
                    transition: 'all 0.15s'
                  }}
                >
                  {/* Item Header */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.625rem',
                      padding: '0.75rem 1rem',
                      cursor: resolved.text ? 'pointer' : 'default'
                    }}
                    onClick={() => resolved.text && setExpandedItem(isExpanded ? null : item._id)}
                  >
                    <div style={{ color: '#94a3b8', flexShrink: 0 }}>
                      <GripVertical size={16} />
                    </div>

                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      color: '#64748b', fontSize: '0.75rem',
                      background: '#f1f5f9', padding: '0.125rem 0.5rem',
                      borderRadius: '4px', flexShrink: 0
                    }}>
                      {resolved.icon}
                      {resolved.source}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: '0.9rem', color: resolved.deleted ? '#991b1b' : '#1e293b',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {resolved.title}
                      </div>
                      {!isExpanded && resolved.text && (
                        <div style={{
                          fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.125rem',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {resolved.text.substring(0, 100)}...
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>
                        {formatDate(item.addedAt)}
                      </span>

                      {resolved.text && (
                        <button
                          onClick={e => { e.stopPropagation(); setExpandedItem(isExpanded ? null : item._id); }}
                          style={{
                            padding: '0.25rem', background: 'none', border: 'none',
                            color: '#94a3b8', cursor: 'pointer'
                          }}
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}

                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm('Eintrag aus Sammlung entfernen?')) {
                            handleRemoveItem(item._id);
                          }
                        }}
                        disabled={removingItemId === item._id}
                        style={{
                          padding: '0.25rem', background: 'none', border: 'none',
                          color: '#dc2626', cursor: 'pointer', opacity: removingItemId === item._id ? 0.5 : 1
                        }}
                        title="Aus Sammlung entfernen"
                      >
                        {removingItemId === item._id ? <Loader2 size={14} className={styles.spinner} /> : <X size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && resolved.text && (
                    <div style={{
                      padding: '0 1rem 1rem 2.875rem',
                      borderTop: '1px solid #f1f5f9'
                    }}>
                      <p style={{
                        margin: '0.75rem 0 0 0',
                        fontSize: '0.875rem',
                        color: '#334155',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-wrap'
                      }}>
                        {resolved.text}
                      </p>

                      {item.notes && (
                        <div style={{
                          marginTop: '0.75rem', padding: '0.5rem 0.75rem',
                          background: '#fffbeb', border: '1px solid #fde68a',
                          borderRadius: '6px', fontSize: '0.8rem', color: '#92400e'
                        }}>
                          <strong>Notiz:</strong> {item.notes}
                        </div>
                      )}

                      {/* Zusatz-Info fuer aufgeloeste Saved Clauses */}
                      {item.type === 'saved' && item.resolvedClause && (
                        <div style={{
                          display: 'flex', gap: '0.375rem', marginTop: '0.5rem', flexWrap: 'wrap'
                        }}>
                          {item.resolvedClause.area && CLAUSE_AREA_INFO[item.resolvedClause.clauseArea] && (
                            <span style={{
                              fontSize: '0.7rem', padding: '0.125rem 0.5rem',
                              background: '#f1f5f9', borderRadius: '4px', color: '#475569'
                            }}>
                              {CLAUSE_AREA_INFO[item.resolvedClause.clauseArea].icon} {CLAUSE_AREA_INFO[item.resolvedClause.clauseArea].label}
                            </span>
                          )}
                          {item.resolvedClause.tags?.slice(0, 3).map(tag => (
                            <span key={tag} style={{
                              fontSize: '0.7rem', padding: '0.125rem 0.5rem',
                              background: '#f1f5f9', borderRadius: '4px', color: '#475569'
                            }}>
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};

export default SammlungTab;
