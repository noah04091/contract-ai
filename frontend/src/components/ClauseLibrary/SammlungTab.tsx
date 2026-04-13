// SammlungTab.tsx - Inhalt eines benutzerdefinierten Sammlungs-Tabs
// Zeigt Items mit voller Detail-Ansicht wie in den Original-Tabs

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
  Check,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  AlertCircle,
  Copy
} from 'lucide-react';
import * as clauseCollectionAPI from '../../services/clauseCollectionAPI';
import type { ClauseCollection, CollectionItem } from '../../types/clauseLibrary';
import {
  CATEGORY_INFO,
  CLAUSE_AREA_INFO,
  TEMPLATE_CLAUSE_CATEGORY_INFO,
  INDUSTRY_TAG_INFO,
  RISK_LEVEL_INFO,
  LEGAL_AREA_INFO
} from '../../types/clauseLibrary';
import { templateClauses } from '../../data/templateClauses';
import { legalTerms, getRelatedTerms } from '../../data/legalTerms';
import styles from '../../styles/ClauseLibraryPage.module.css';

interface SammlungTabProps {
  collectionId: string;
  viewType: 'grid' | 'list';
  onCollectionDeleted: () => void;
  onCollectionUpdated: () => void;
}

const SammlungTab: React.FC<SammlungTabProps> = ({
  collectionId,
  viewType,
  onCollectionDeleted,
  onCollectionUpdated
}) => {
  const [collection, setCollection] = useState<ClauseCollection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  const handleCopy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
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

  // ============================================
  // Typ-spezifische Detail-Renderings
  // ============================================

  const renderTemplateExpanded = (templateId: string, itemId: string) => {
    const clause = templateClauses.find(t => t.id === templateId);
    if (!clause) return <p style={{ color: '#991b1b', fontSize: '0.85rem' }}>Musterklausel nicht mehr verfuegbar.</p>;

    const riskInfo = RISK_LEVEL_INFO[clause.riskLevel];
    const catInfo = TEMPLATE_CLAUSE_CATEGORY_INFO[clause.category];
    const isCopied = copiedId === itemId;

    return (
      <div>
        {/* Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            fontSize: '0.75rem', padding: '0.25rem 0.625rem',
            background: `${riskInfo.bgColor}`, color: riskInfo.color,
            borderRadius: '6px', fontWeight: 500
          }}>
            <Scale size={12} /> {riskInfo.label}
          </span>
          <span style={{
            fontSize: '0.75rem', padding: '0.25rem 0.625rem',
            background: '#f1f5f9', color: '#475569',
            borderRadius: '6px'
          }}>
            {catInfo.icon} {catInfo.label}
          </span>
          {clause.legalBasis && (
            <span style={{
              fontSize: '0.75rem', padding: '0.25rem 0.625rem',
              background: '#eff6ff', color: '#1e40af',
              borderRadius: '6px', fontWeight: 500
            }}>
              {clause.legalBasis}
            </span>
          )}
        </div>

        {/* Verwendungskontext */}
        <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 0.75rem 0', lineHeight: 1.5 }}>
          {clause.usageContext}
        </p>

        {/* Klauseltext */}
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
          padding: '1rem', marginBottom: '0.75rem'
        }}>
          <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Klauseltext</h5>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {clause.clauseText}
          </p>
        </div>

        {/* Branchen */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          {clause.industryTags.map(tag => (
            <span key={tag} style={{
              fontSize: '0.7rem', padding: '0.25rem 0.5rem',
              background: '#f1f5f9', borderRadius: '4px', color: '#475569'
            }}>
              {INDUSTRY_TAG_INFO[tag].icon} {INDUSTRY_TAG_INFO[tag].label}
            </span>
          ))}
        </div>

        {/* Hinweise */}
        {clause.warnings && clause.warnings.length > 0 && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px',
            padding: '0.75rem', marginBottom: '0.75rem'
          }}>
            <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', margin: '0 0 0.375rem 0', fontSize: '0.8rem', color: '#92400e' }}>
              <AlertCircle size={14} /> Hinweise
            </h5>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.8rem', color: '#92400e' }}>
              {clause.warnings.map((w, i) => <li key={i} style={{ marginBottom: '0.25rem' }}>{w}</li>)}
            </ul>
          </div>
        )}

        {/* Variationen */}
        {clause.variations && clause.variations.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Variationen</h5>
            {clause.variations.map((v, i) => (
              <div key={i} style={{
                background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
                padding: '0.75rem', marginBottom: '0.5rem'
              }}>
                <strong style={{ fontSize: '0.85rem', color: '#1e293b' }}>{v.title}</strong>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.25rem 0' }}>{v.description}</p>
                <div style={{ fontSize: '0.8rem', color: '#334155', background: '#fff', padding: '0.5rem', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  {v.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Kopieren */}
        <button
          onClick={(e) => { e.stopPropagation(); handleCopy(clause.clauseText, itemId); }}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
            padding: '0.5rem 0.875rem',
            background: isCopied ? '#10b981' : 'white',
            border: `1px solid ${isCopied ? '#10b981' : '#e2e8f0'}`,
            borderRadius: '8px', color: isCopied ? 'white' : '#475569',
            fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer'
          }}
        >
          {isCopied ? <Check size={14} /> : <Copy size={14} />}
          {isCopied ? 'Kopiert!' : 'Text kopieren'}
        </button>
      </div>
    );
  };

  const renderLexikonExpanded = (termId: string) => {
    const term = legalTerms.find(t => t.id === termId);
    if (!term) return <p style={{ color: '#991b1b', fontSize: '0.85rem' }}>Begriff nicht mehr verfuegbar.</p>;

    const areaInfo = LEGAL_AREA_INFO[term.legalArea];
    const relatedTermsData = getRelatedTerms(term);

    return (
      <div>
        {/* Area Badge */}
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
          fontSize: '0.75rem', padding: '0.25rem 0.625rem',
          background: `${areaInfo.color}15`, color: areaInfo.color,
          borderRadius: '6px', fontWeight: 500, marginBottom: '0.75rem'
        }}>
          {areaInfo.icon} {areaInfo.label}
        </span>

        {/* Einfache Erklaerung */}
        <p style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.6, margin: '0.75rem 0' }}>
          {term.simpleExplanation}
        </p>

        {/* Juristische Definition */}
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
          padding: '1rem', marginBottom: '0.75rem'
        }}>
          <h5 style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>
            <Scale size={14} /> Juristische Definition
          </h5>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', lineHeight: 1.6 }}>
            {term.legalDefinition}
          </p>
        </div>

        {/* Rechtsgrundlage */}
        {term.legalBasis && (
          <div style={{ marginBottom: '0.75rem' }}>
            <h5 style={{ margin: '0 0 0.375rem 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Rechtsgrundlage</h5>
            <span style={{
              fontSize: '0.8rem', padding: '0.25rem 0.625rem',
              background: '#eff6ff', color: '#1e40af',
              borderRadius: '6px', fontWeight: 500
            }}>
              {term.legalBasis}
            </span>
          </div>
        )}

        {/* Beispiele */}
        {term.examples.length > 0 && (
          <div style={{ marginBottom: '0.75rem' }}>
            <h5 style={{ margin: '0 0 0.375rem 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Beispiele</h5>
            <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.85rem', color: '#334155' }}>
              {term.examples.map((ex, i) => <li key={i} style={{ marginBottom: '0.25rem', lineHeight: 1.5 }}>{ex}</li>)}
            </ul>
          </div>
        )}

        {/* Verwandte Begriffe */}
        {relatedTermsData.length > 0 && (
          <div>
            <h5 style={{ margin: '0 0 0.375rem 0', fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>Verwandte Begriffe</h5>
            <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
              {relatedTermsData.map(related => (
                <span key={related.id} style={{
                  display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                  fontSize: '0.75rem', padding: '0.25rem 0.5rem',
                  background: '#f1f5f9', borderRadius: '4px', color: '#475569'
                }}>
                  <ExternalLink size={10} /> {related.term}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSavedExpanded = (item: CollectionItem) => {
    if (!item.resolvedClause) {
      return <p style={{ color: '#991b1b', fontSize: '0.85rem' }}>Diese Klausel wurde aus "Meine Klauseln" geloescht.</p>;
    }

    const rc = item.resolvedClause;
    const catInfo = CATEGORY_INFO[rc.category];
    const areaInfo = rc.clauseArea ? CLAUSE_AREA_INFO[rc.clauseArea] : null;

    return (
      <div>
        {/* Badges */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            fontSize: '0.75rem', padding: '0.25rem 0.625rem',
            background: catInfo.bgColor, color: catInfo.color,
            borderRadius: '6px', fontWeight: 500
          }}>
            {catInfo.icon} {catInfo.label}
          </span>
          {areaInfo && (
            <span style={{
              fontSize: '0.75rem', padding: '0.25rem 0.625rem',
              background: '#f1f5f9', color: '#475569',
              borderRadius: '6px'
            }}>
              {areaInfo.icon} {areaInfo.label}
            </span>
          )}
        </div>

        {/* Voller Text */}
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
          padding: '1rem', marginBottom: '0.75rem'
        }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {rc.clauseText}
          </p>
        </div>

        {/* Risiko-Info */}
        {rc.originalAnalysis && rc.originalAnalysis.riskLevel && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            background: rc.originalAnalysis.riskLevel === 'high' ? '#fef2f2' :
                       rc.originalAnalysis.riskLevel === 'low' ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${rc.originalAnalysis.riskLevel === 'high' ? '#fecaca' :
                                rc.originalAnalysis.riskLevel === 'low' ? '#bbf7d0' : '#fde68a'}`,
            borderRadius: '8px', marginBottom: '0.75rem', fontSize: '0.8rem'
          }}>
            <strong>Risiko:</strong>
            <span>{rc.originalAnalysis.riskLevel === 'high' ? 'Hoch' :
                   rc.originalAnalysis.riskLevel === 'low' ? 'Niedrig' : 'Mittel'}
              {rc.originalAnalysis.riskScore !== undefined && ` (${rc.originalAnalysis.riskScore}%)`}
            </span>
            {rc.originalAnalysis.mainRisk && (
              <span style={{ color: '#64748b' }}>— {rc.originalAnalysis.mainRisk}</span>
            )}
          </div>
        )}

        {/* Notizen */}
        {rc.userNotes && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px',
            padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#92400e'
          }}>
            <strong>Notizen:</strong> {rc.userNotes}
          </div>
        )}

        {/* Tags */}
        {rc.tags && rc.tags.length > 0 && (
          <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap' }}>
            {rc.tags.map(tag => (
              <span key={tag} style={{
                fontSize: '0.7rem', padding: '0.25rem 0.5rem',
                background: '#f1f5f9', borderRadius: '4px', color: '#475569'
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderCustomExpanded = (item: CollectionItem) => {
    return (
      <div>
        {item.customTitle && (
          <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '1rem', fontWeight: 600, color: '#1e293b' }}>
            {item.customTitle}
          </h4>
        )}
        <div style={{
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px',
          padding: '1rem'
        }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {item.customText}
          </p>
        </div>
      </div>
    );
  };

  // ============================================
  // Item Header-Infos
  // ============================================
  const getItemHeader = (item: CollectionItem) => {
    if (item.type === 'template' && item.templateClauseId) {
      const template = templateClauses.find(t => t.id === item.templateClauseId);
      if (template) return { title: template.title, subtitle: template.usageContext, source: 'Musterklausel', icon: <FileText size={14} />, hasContent: true };
      return { title: 'Musterklausel nicht gefunden', subtitle: '', source: 'Musterklausel', icon: <FileText size={14} />, deleted: true, hasContent: false };
    }
    if (item.type === 'lexikon' && item.legalTermId) {
      const term = legalTerms.find(t => t.id === item.legalTermId);
      if (term) {
        const areaInfo = LEGAL_AREA_INFO[term.legalArea];
        return { title: term.term, subtitle: `${areaInfo.icon} ${areaInfo.label}`, source: 'Rechtslexikon', icon: <Scale size={14} />, hasContent: true };
      }
      return { title: 'Begriff nicht gefunden', subtitle: '', source: 'Rechtslexikon', icon: <Scale size={14} />, deleted: true, hasContent: false };
    }
    if (item.type === 'saved' && item.resolvedClause) {
      const catInfo = CATEGORY_INFO[item.resolvedClause.category];
      return {
        title: `${catInfo.icon} ${catInfo.label}`,
        subtitle: item.resolvedClause.clausePreview || item.resolvedClause.clauseText.substring(0, 100) + '...',
        source: 'Meine Klauseln',
        icon: <BookOpen size={14} />,
        hasContent: true
      };
    }
    if (item.type === 'saved' && item._deleted) {
      return { title: 'Klausel geloescht', subtitle: '', source: 'Meine Klauseln', icon: <BookOpen size={14} />, deleted: true, hasContent: false };
    }
    if (item.type === 'custom') {
      return {
        title: item.customTitle || 'Eigene Klausel',
        subtitle: (item.customText || '').substring(0, 100) + ((item.customText || '').length > 100 ? '...' : ''),
        source: 'Eigene Klausel',
        icon: <PenTool size={14} />,
        hasContent: true
      };
    }
    return { title: 'Unbekannt', subtitle: '', source: '', icon: <FileText size={14} />, hasContent: false };
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
    <div style={{ padding: '0 1.5rem' }}>
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
                width: '100%', padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1', borderRadius: '8px',
                fontSize: '1rem', fontWeight: 600, marginBottom: '0.5rem'
              }}
              autoFocus
            />
            <textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              placeholder="Beschreibung (optional)"
              style={{
                width: '100%', padding: '0.5rem 0.75rem',
                border: '1px solid #cbd5e1', borderRadius: '8px',
                fontSize: '0.85rem', resize: 'none', minHeight: '50px'
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
              <button onClick={handleSaveEdit} disabled={isSavingEdit || editName.trim().length < 2}
                style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.375rem 0.75rem', background: '#10b981', border: 'none', borderRadius: '6px', color: 'white', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
                {isSavingEdit ? <Loader2 size={14} className={styles.spinner} /> : <Check size={14} />} Speichern
              </button>
              <button onClick={() => setIsEditing(false)}
                style={{ padding: '0.375rem 0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}>
                Abbrechen
              </button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '1.25rem' }}>{collection.icon}</span>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>{collection.name}</h3>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', background: '#f1f5f9', padding: '0.125rem 0.5rem', borderRadius: '10px' }}>
                  {items.length} {items.length === 1 ? 'Eintrag' : 'Eintraege'}
                </span>
              </div>
              {collection.description && (
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{collection.description}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
              <button onClick={() => { setEditName(collection.name); setEditDescription(collection.description || ''); setIsEditing(true); }}
                style={{ padding: '0.375rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b', cursor: 'pointer' }}
                title="Sammlung bearbeiten">
                <Edit3 size={16} />
              </button>
              <button onClick={() => setShowDeleteConfirm(true)}
                style={{ padding: '0.375rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#ef4444', cursor: 'pointer' }}
                title="Sammlung loeschen">
                <Trash2 size={16} />
              </button>
            </div>
          </>
        )}
      </div>

      {/* Loeschen-Bestaetigung */}
      {showDeleteConfirm && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#991b1b' }}>
            Sammlung "{collection.name}" wirklich loeschen? Die enthaltenen Klauseln bleiben in ihren Quellen erhalten.
          </p>
          <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
            <button onClick={handleDeleteCollection} disabled={isDeleting}
              style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.375rem 0.75rem', background: '#ef4444', border: 'none', borderRadius: '6px', color: 'white', fontSize: '0.8rem', fontWeight: 500, cursor: 'pointer' }}>
              {isDeleting ? <Loader2 size={14} className={styles.spinner} /> : <Trash2 size={14} />} Loeschen
            </button>
            <button onClick={() => setShowDeleteConfirm(false)}
              style={{ padding: '0.375rem 0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '6px', color: '#64748b', fontSize: '0.8rem', cursor: 'pointer' }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Aktionen */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button onClick={() => setShowCustomForm(!showCustomForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', background: showCustomForm ? '#f0f9ff' : 'white', border: showCustomForm ? '1px solid #93c5fd' : '1px solid #e2e8f0', borderRadius: '8px', color: showCustomForm ? '#2563eb' : '#475569', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer' }}>
          <PenTool size={15} /> Eigene Klausel schreiben
        </button>
      </div>

      {/* Freitext-Formular */}
      {showCustomForm && (
        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>Titel (optional)</label>
            <input type="text" value={customTitle} onChange={e => setCustomTitle(e.target.value)}
              placeholder='z.B. "Kuendigungsfrist 3 Monate"' maxLength={200}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem' }} />
          </div>
          <div style={{ marginBottom: '0.75rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.375rem' }}>Klauseltext *</label>
            <textarea value={customText} onChange={e => setCustomText(e.target.value)}
              placeholder="Klausel hier eingeben..." rows={4}
              style={{ width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.875rem', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={handleAddCustom} disabled={isAddingCustom || customText.trim().length < 5}
              style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', padding: '0.5rem 0.875rem', background: '#10b981', border: 'none', borderRadius: '8px', color: 'white', fontSize: '0.85rem', fontWeight: 500, cursor: 'pointer', opacity: (isAddingCustom || customText.trim().length < 5) ? 0.6 : 1 }}>
              {isAddingCustom ? <Loader2 size={15} className={styles.spinner} /> : <Plus size={15} />} Hinzufuegen
            </button>
            <button onClick={() => { setShowCustomForm(false); setCustomTitle(''); setCustomText(''); }}
              style={{ padding: '0.5rem 0.875rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', color: '#64748b', fontSize: '0.85rem', cursor: 'pointer' }}>
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Items */}
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
      ) : viewType === 'grid' ? (
        /* ========== GRID-ANSICHT (Cards + Detail-Panel) ========== */
        <>
          <div className={styles.clauseGrid}>
            {items
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map(item => {
                const header = getItemHeader(item);
                const isSelected = expandedItem === item._id;
                const sourceColors: Record<string, { border: string; bg: string }> = {
                  'Meine Klauseln': { border: '#3b82f6', bg: '#eff6ff' },
                  'Musterklausel': { border: '#10b981', bg: '#f0fdf4' },
                  'Rechtslexikon': { border: '#8b5cf6', bg: '#f5f3ff' },
                  'Eigene Klausel': { border: '#f59e0b', bg: '#fffbeb' }
                };
                const sc = sourceColors[header.source] || { border: '#e2e8f0', bg: '#f8fafc' };

                return (
                  <div
                    key={item._id}
                    className={`${styles.clauseCard} ${isSelected ? styles.selected : ''}`}
                    onClick={() => header.hasContent && setExpandedItem(isSelected ? null : item._id)}
                    style={{
                      cursor: header.hasContent ? 'pointer' : 'default',
                      borderLeftColor: sc.border,
                      opacity: header.deleted ? 0.5 : 1
                    }}
                  >
                    <div className={styles.cardHeader}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                        fontSize: '0.7rem', padding: '0.2rem 0.5rem',
                        background: sc.bg, color: sc.border,
                        borderRadius: '4px', fontWeight: 600
                      }}>
                        {header.icon} {header.source}
                      </span>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm('Eintrag aus Sammlung entfernen?')) handleRemoveItem(item._id);
                        }}
                        disabled={removingItemId === item._id}
                        style={{ padding: '0.25rem', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', opacity: removingItemId === item._id ? 0.5 : 1 }}
                        title="Entfernen"
                      >
                        {removingItemId === item._id ? <Loader2 size={12} className={styles.spinner} /> : <X size={14} />}
                      </button>
                    </div>

                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#1e293b', marginBottom: '0.375rem' }}>
                      {header.title}
                    </div>

                    <p className={styles.clausePreview}>
                      {header.subtitle || ''}
                    </p>

                    <div className={styles.cardFooter}>
                      <span className={styles.date}>{formatDate(item.addedAt)}</span>
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Detail-Panel unter dem Grid */}
          {expandedItem && (() => {
            const selectedItem = items.find(i => i._id === expandedItem);
            if (!selectedItem) return null;
            const header = getItemHeader(selectedItem);
            if (!header.hasContent) return null;
            const sourceColors: Record<string, { border: string; bg: string }> = {
              'Meine Klauseln': { border: '#3b82f6', bg: '#eff6ff' },
              'Musterklausel': { border: '#10b981', bg: '#f0fdf4' },
              'Rechtslexikon': { border: '#8b5cf6', bg: '#f5f3ff' },
              'Eigene Klausel': { border: '#f59e0b', bg: '#fffbeb' }
            };
            const sc = sourceColors[header.source] || { border: '#e2e8f0', bg: '#f8fafc' };

            return (
              <div style={{
                marginTop: '1.25rem',
                background: 'white',
                border: `1px solid #e2e8f0`,
                borderLeft: `3px solid ${sc.border}`,
                borderRadius: '12px',
                padding: '1.25rem',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                {/* Detail-Header */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                      fontSize: '0.75rem', padding: '0.25rem 0.625rem',
                      background: sc.bg, color: sc.border,
                      borderRadius: '6px', fontWeight: 600
                    }}>
                      {header.icon} {header.source}
                    </span>
                    <span style={{ fontWeight: 700, fontSize: '1rem', color: '#1e293b' }}>
                      {header.title}
                    </span>
                  </div>
                  <button
                    onClick={() => setExpandedItem(null)}
                    style={{
                      padding: '0.375rem', background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '8px', color: '#64748b', cursor: 'pointer'
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Typ-spezifischer Inhalt */}
                {selectedItem.type === 'template' && selectedItem.templateClauseId && renderTemplateExpanded(selectedItem.templateClauseId, selectedItem._id)}
                {selectedItem.type === 'lexikon' && selectedItem.legalTermId && renderLexikonExpanded(selectedItem.legalTermId)}
                {selectedItem.type === 'saved' && renderSavedExpanded(selectedItem)}
                {selectedItem.type === 'custom' && renderCustomExpanded(selectedItem)}

                {selectedItem.notes && (
                  <div style={{
                    marginTop: '0.75rem', padding: '0.5rem 0.75rem',
                    background: '#fffbeb', border: '1px solid #fde68a',
                    borderRadius: '6px', fontSize: '0.8rem', color: '#92400e'
                  }}>
                    <strong>Sammlungs-Notiz:</strong> {selectedItem.notes}
                  </div>
                )}
              </div>
            );
          })()}
        </>
      ) : (
        /* ========== LIST-ANSICHT (aufklappbar) ========== */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {items
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(item => {
              const header = getItemHeader(item);
              const isExpanded = expandedItem === item._id;

              return (
                <div
                  key={item._id}
                  style={{
                    background: header.deleted ? '#fef2f2' : 'white',
                    border: `1px solid ${header.deleted ? '#fecaca' : isExpanded ? '#cbd5e1' : '#e2e8f0'}`,
                    borderRadius: '12px',
                    overflow: 'hidden',
                    transition: 'all 0.2s',
                    boxShadow: isExpanded ? '0 2px 8px rgba(0,0,0,0.06)' : 'none'
                  }}
                >
                  {/* Item Header */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.875rem 1rem',
                      cursor: header.hasContent ? 'pointer' : 'default'
                    }}
                    onClick={() => header.hasContent && setExpandedItem(isExpanded ? null : item._id)}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '0.375rem',
                      color: '#64748b', fontSize: '0.7rem',
                      background: '#f1f5f9', padding: '0.2rem 0.5rem',
                      borderRadius: '4px', flexShrink: 0, whiteSpace: 'nowrap'
                    }}>
                      {header.icon}
                      {header.source}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 600, fontSize: '0.9rem',
                        color: header.deleted ? '#991b1b' : '#1e293b',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                      }}>
                        {header.title}
                      </div>
                      {!isExpanded && header.subtitle && (
                        <div style={{
                          fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.125rem',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}>
                          {header.subtitle}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                      <span style={{ fontSize: '0.7rem', color: '#cbd5e1' }}>
                        {formatDate(item.addedAt)}
                      </span>
                      {header.hasContent && (
                        isExpanded ? <ChevronUp size={16} style={{ color: '#94a3b8' }} /> : <ChevronDown size={16} style={{ color: '#94a3b8' }} />
                      )}
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (confirm('Eintrag aus Sammlung entfernen?')) handleRemoveItem(item._id);
                        }}
                        disabled={removingItemId === item._id}
                        style={{ padding: '0.25rem', background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', opacity: removingItemId === item._id ? 0.5 : 1 }}
                        title="Aus Sammlung entfernen"
                      >
                        {removingItemId === item._id ? <Loader2 size={14} className={styles.spinner} /> : <X size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Detail */}
                  {isExpanded && header.hasContent && (
                    <div style={{ padding: '0 1rem 1.25rem 1rem', borderTop: '1px solid #f1f5f9' }}>
                      <div style={{ paddingTop: '0.75rem' }}>
                        {item.type === 'template' && item.templateClauseId && renderTemplateExpanded(item.templateClauseId, item._id)}
                        {item.type === 'lexikon' && item.legalTermId && renderLexikonExpanded(item.legalTermId)}
                        {item.type === 'saved' && renderSavedExpanded(item)}
                        {item.type === 'custom' && renderCustomExpanded(item)}
                      </div>
                      {item.notes && (
                        <div style={{
                          marginTop: '0.75rem', padding: '0.5rem 0.75rem',
                          background: '#fffbeb', border: '1px solid #fde68a',
                          borderRadius: '6px', fontSize: '0.8rem', color: '#92400e'
                        }}>
                          <strong>Sammlungs-Notiz:</strong> {item.notes}
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
