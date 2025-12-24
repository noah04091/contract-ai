/**
 * ContractTypeSelector - Modal zur Auswahl des Vertragstyps
 */

import React, { useState } from 'react';
import {
  Briefcase,
  Handshake,
  Hammer,
  ShoppingCart,
  Home,
  Banknote,
  Lock,
  Users,
  FileKey,
  GraduationCap,
  Store,
  FileEdit,
  Building,
  User,
  Search,
  X,
  ChevronRight,
  Sparkles,
  Clock,
  FolderOpen,
  Loader2,
  Edit2,
  Trash2,
  Copy,
  MoreVertical,
} from 'lucide-react';
import { contractTemplates, templateCategories, ContractTemplate } from '../../data/contractTemplates';
import styles from './ContractTypeSelector.module.css';

interface SavedDraft {
  _id: string;
  metadata: {
    name: string;
    contractType: string;
    status: string;
  };
  updatedAt: string;
  blockCount: number;
}

interface ContractTypeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (templateId: string) => void;
  savedDrafts?: SavedDraft[];
  isLoadingDrafts?: boolean;
  onLoadDraft?: (draftId: string) => void;
  onDeleteDraft?: (draftId: string) => void;
  onRenameDraft?: (draftId: string, currentName: string) => void;
  onDuplicateDraft?: (draftId: string, originalName: string) => void;
}

// Icon mapping
const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  Briefcase,
  Handshake,
  Hammer,
  ShoppingCart,
  Home,
  Banknote,
  Lock,
  Users,
  FileKey,
  GraduationCap,
  Store,
  FileEdit,
  Building,
  User,
};

export const ContractTypeSelector: React.FC<ContractTypeSelectorProps> = ({
  isOpen,
  onClose,
  onSelect,
  savedDrafts = [],
  isLoadingDrafts = false,
  onLoadDraft,
  onDeleteDraft,
  onRenameDraft,
  onDuplicateDraft,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<ContractTemplate | null>(null);
  const [showDrafts, setShowDrafts] = useState(false);
  const [activeDraftMenu, setActiveDraftMenu] = useState<string | null>(null);

  if (!isOpen) return null;

  // Hilfsfunktion für Datumsformatierung
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Filter templates based on search and category
  const filteredTemplates = contractTemplates.filter(template => {
    const matchesSearch = searchQuery === '' ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === null || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelect = (templateId: string) => {
    // Nur onSelect aufrufen - der Parent ist verantwortlich für das Schließen
    onSelect(templateId);
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Sparkles size={24} className={styles.headerIcon} />
            <div>
              <h2 className={styles.title}>Neuen Vertrag erstellen</h2>
              <p className={styles.subtitle}>Wählen Sie einen Vertragstyp als Grundlage</p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Search + Drafts Toggle */}
        <div className={styles.searchSection}>
          <div className={styles.searchWrapper}>
            <Search size={18} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Vertragstyp suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>
          {savedDrafts.length > 0 && (
            <button
              className={`${styles.draftsToggle} ${showDrafts ? styles.active : ''}`}
              onClick={() => setShowDrafts(!showDrafts)}
            >
              <FolderOpen size={16} />
              <span>Gespeicherte Entwürfe ({savedDrafts.length})</span>
            </button>
          )}
        </div>

        {/* Saved Drafts Section */}
        {showDrafts && (
          <div className={styles.draftsSection}>
            <div className={styles.draftsHeader}>
              <h3>Gespeicherte Entwürfe</h3>
              <button className={styles.closeDrafts} onClick={() => setShowDrafts(false)}>
                <X size={16} />
              </button>
            </div>
            {isLoadingDrafts ? (
              <div className={styles.draftsLoading}>
                <Loader2 size={20} className={styles.spinner} />
                <span>Lade Entwürfe...</span>
              </div>
            ) : savedDrafts.length === 0 ? (
              <div className={styles.draftsEmpty}>
                <FolderOpen size={24} />
                <span>Keine gespeicherten Entwürfe</span>
              </div>
            ) : (
              <div className={styles.draftsList}>
                {savedDrafts.map((draft) => (
                  <div key={draft._id} className={styles.draftCardWrapper}>
                    <button
                      className={styles.draftCard}
                      onClick={() => onLoadDraft?.(draft._id)}
                    >
                      <div className={styles.draftInfo}>
                        <span className={styles.draftName}>{draft.metadata.name}</span>
                        <span className={styles.draftMeta}>
                          <Clock size={12} />
                          {formatDate(draft.updatedAt)}
                          <span className={styles.draftBlocks}>{draft.blockCount} Blöcke</span>
                        </span>
                      </div>
                      <ChevronRight size={18} className={styles.draftArrow} />
                    </button>
                    <div className={styles.draftActions}>
                      <button
                        className={styles.draftActionBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDraftMenu(activeDraftMenu === draft._id ? null : draft._id);
                        }}
                        title="Aktionen"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeDraftMenu === draft._id && (
                        <div className={styles.draftMenu}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onRenameDraft?.(draft._id, draft.metadata.name);
                              setActiveDraftMenu(null);
                            }}
                          >
                            <Edit2 size={14} />
                            <span>Umbenennen</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDuplicateDraft?.(draft._id, draft.metadata.name);
                              setActiveDraftMenu(null);
                            }}
                          >
                            <Copy size={14} />
                            <span>Duplizieren</span>
                          </button>
                          <button
                            className={styles.dangerAction}
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteDraft?.(draft._id);
                              setActiveDraftMenu(null);
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Löschen</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Categories */}
        <div className={styles.categories}>
          <button
            className={`${styles.categoryButton} ${selectedCategory === null ? styles.active : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            Alle
          </button>
          {templateCategories.map(cat => {
            const Icon = iconMap[cat.icon] || FileEdit;
            return (
              <button
                key={cat.id}
                className={`${styles.categoryButton} ${selectedCategory === cat.id ? styles.active : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <Icon size={14} />
                <span>{cat.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Template Grid */}
          <div className={styles.templateGrid}>
            {filteredTemplates.map(template => {
              const Icon = iconMap[template.icon] || FileEdit;
              return (
                <button
                  key={template.id}
                  className={`${styles.templateCard} ${template.id === 'individuell' ? styles.customCard : ''}`}
                  onClick={() => handleSelect(template.id)}
                  onMouseEnter={() => setHoveredTemplate(template)}
                  onMouseLeave={() => setHoveredTemplate(null)}
                >
                  <div className={styles.templateIcon}>
                    <Icon size={28} />
                  </div>
                  <div className={styles.templateInfo}>
                    <h3 className={styles.templateName}>{template.name}</h3>
                    <p className={styles.templateDescription}>{template.description}</p>
                  </div>
                  <ChevronRight size={18} className={styles.templateArrow} />
                </button>
              );
            })}
          </div>

          {/* Preview Panel - immer gerendert um Layout-Shifts zu vermeiden */}
          <div className={`${styles.previewPanel} ${hoveredTemplate && hoveredTemplate.id !== 'individuell' ? styles.previewVisible : ''}`}>
            {hoveredTemplate && hoveredTemplate.id !== 'individuell' ? (
              <>
                <h4 className={styles.previewTitle}>
                  {hoveredTemplate.name} enthält:
                </h4>

                <div className={styles.previewSection}>
                  <span className={styles.previewLabel}>Parteien:</span>
                  <div className={styles.previewParties}>
                    <span>{hoveredTemplate.parties.party1.role}</span>
                    <span className={styles.previewDivider}>&</span>
                    <span>{hoveredTemplate.parties.party2.role}</span>
                  </div>
                </div>

                <div className={styles.previewSection}>
                  <span className={styles.previewLabel}>
                    {hoveredTemplate.suggestedClauses.length} vorbereitete Klauseln:
                  </span>
                  <ul className={styles.previewList}>
                    {hoveredTemplate.suggestedClauses.slice(0, 5).map((clause, index) => (
                      <li key={index}>{clause.title}</li>
                    ))}
                    {hoveredTemplate.suggestedClauses.length > 5 && (
                      <li className={styles.previewMore}>
                        + {hoveredTemplate.suggestedClauses.length - 5} weitere
                      </li>
                    )}
                  </ul>
                </div>

                <div className={styles.previewSection}>
                  <span className={styles.previewLabel}>
                    {hoveredTemplate.defaultVariables.length} Variablen:
                  </span>
                  <div className={styles.previewVariables}>
                    {hoveredTemplate.defaultVariables.slice(0, 6).map((v, index) => (
                      <span key={index} className={styles.previewVariable}>
                        {v.displayName}
                      </span>
                    ))}
                    {hoveredTemplate.defaultVariables.length > 6 && (
                      <span className={styles.previewVariableMore}>
                        +{hoveredTemplate.defaultVariables.length - 6}
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className={styles.previewEmpty}>
                <p>Fahre mit der Maus über einen Vertragstyp um Details zu sehen</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerNote}>
            Alle Vorlagen können nach der Auswahl vollständig angepasst werden.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ContractTypeSelector;
