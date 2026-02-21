/**
 * BlockToolbar - Linke Seitenleiste zum Hinzufügen von Blöcken
 */

import React, { useState, useEffect } from 'react';
import { useContractBuilderStore, BlockType, Variable } from '../../../stores/contractBuilderStore';
import {
  FileText,
  Users,
  ScrollText,
  AlignLeft,
  List,
  Table,
  PenTool,
  Paperclip,
  Calendar,
  Minus,
  Space,
  Image,
  FileStack,
  Puzzle,
  Search,
  ChevronRight,
  Plus,
  Sparkles,
  X,
  Loader2,
  Book,
  Info,
  BookOpen,
  BookImage,
} from 'lucide-react';
import styles from './BlockToolbar.module.css';
import { templateClauses } from '../../../data/templateClauses';
import { TEMPLATE_CLAUSE_CATEGORY_INFO } from '../../../types/clauseLibrary';
import type { TemplateClause, SavedClause, TemplateClauseCategory } from '../../../types/clauseLibrary';
import * as clauseLibraryAPI from '../../../services/clauseLibraryAPI';

interface BlockToolbarProps {
  className?: string;
}

// Block-Definitionen
const blockCategories = [
  {
    name: 'Struktur',
    blocks: [
      { type: 'cover' as BlockType, label: 'Deckblatt', icon: BookImage, description: 'Ganzseitiges Deckblatt' },
      { type: 'header' as BlockType, label: 'Kopfzeile', icon: FileText, description: 'Vertragstitel und Logo' },
      { type: 'parties' as BlockType, label: 'Parteien', icon: Users, description: 'Vertragsparteien definieren' },
      { type: 'preamble' as BlockType, label: 'Präambel', icon: ScrollText, description: 'Einleitender Text' },
    ],
  },
  {
    name: 'Inhalt',
    blocks: [
      { type: 'clause' as BlockType, label: 'Klausel', icon: AlignLeft, description: 'Standard-Vertragsklausel' },
      { type: 'definitions' as BlockType, label: 'Definitionen', icon: Book, description: 'Begriffsbestimmungen' },
      { type: 'notice' as BlockType, label: 'Hinweis', icon: Info, description: 'Widerrufsbelehrung, Hinweise' },
      { type: 'numbered-list' as BlockType, label: 'Aufzählung', icon: List, description: 'Nummerierte Liste' },
      { type: 'table' as BlockType, label: 'Tabelle', icon: Table, description: 'Daten in Tabellenform' },
      { type: 'custom' as BlockType, label: 'Freitext', icon: Puzzle, description: 'Benutzerdefinierter Inhalt' },
    ],
  },
  {
    name: 'Abschluss',
    blocks: [
      { type: 'signature' as BlockType, label: 'Unterschrift', icon: PenTool, description: 'Unterschriftenbereich' },
      { type: 'attachment' as BlockType, label: 'Anlage', icon: Paperclip, description: 'Anlage-Verweis' },
      { type: 'date-field' as BlockType, label: 'Datum', icon: Calendar, description: 'Datumsfeld' },
    ],
  },
  {
    name: 'Layout',
    blocks: [
      { type: 'divider' as BlockType, label: 'Trenner', icon: Minus, description: 'Horizontale Linie' },
      { type: 'spacer' as BlockType, label: 'Abstand', icon: Space, description: 'Vertikaler Abstand' },
      { type: 'page-break' as BlockType, label: 'Neue Seite', icon: FileStack, description: 'Seitenumbruch einfügen (PDF)' },
      { type: 'logo' as BlockType, label: 'Logo', icon: Image, description: 'Firmenlogo einfügen' },
    ],
  },
];

export const BlockToolbar: React.FC<BlockToolbarProps> = ({ className }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Struktur');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Library Modal State
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryTab, setLibraryTab] = useState<'muster' | 'meine'>('muster');
  const [librarySearch, setLibrarySearch] = useState('');
  const [libraryCategory, setLibraryCategory] = useState<TemplateClauseCategory | ''>('');
  const [savedClauses, setSavedClauses] = useState<SavedClause[]>([]);
  const [isLoadingSavedClauses, setIsLoadingSavedClauses] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const { addBlock, generateClause, addVariable } = useContractBuilderStore();

  // Lade gespeicherte Klauseln wenn Tab gewechselt wird
  useEffect(() => {
    if (showLibraryModal && libraryTab === 'meine') {
      loadSavedClauses();
    }
  }, [showLibraryModal, libraryTab]);

  const loadSavedClauses = async () => {
    setIsLoadingSavedClauses(true);
    try {
      const response = await clauseLibraryAPI.getSavedClauses({ limit: 100 });
      setSavedClauses(response.clauses);
    } catch {
      // Fehler beim Laden wird still behandelt
    } finally {
      setIsLoadingSavedClauses(false);
    }
  };

  // Klausel aus Bibliothek einfügen
  const handleInsertFromLibrary = (clause: TemplateClause | SavedClause) => {
    const isTemplate = 'usageContext' in clause;
    const title = isTemplate ? clause.title : (clause as SavedClause).clausePreview?.substring(0, 50) || 'Gespeicherte Klausel';

    const newBlock = {
      type: 'clause' as BlockType,
      content: {
        number: 'auto',
        clauseTitle: isTemplate ? clause.title : title,
        body: clause.clauseText,
        subclauses: [],
      },
      style: {},
      locked: false,
      aiGenerated: false,
      librarySource: true,
    };
    addBlock(newBlock);
    setShowLibraryModal(false);
    setLibrarySearch('');
    setLibraryCategory('');
  };

  // Gefilterte Musterklauseln
  const filteredTemplateClauses = templateClauses.filter(clause => {
    const matchesSearch = !librarySearch ||
      clause.title.toLowerCase().includes(librarySearch.toLowerCase()) ||
      clause.clauseText.toLowerCase().includes(librarySearch.toLowerCase()) ||
      clause.usageContext.toLowerCase().includes(librarySearch.toLowerCase());
    const matchesCategory = !libraryCategory || clause.category === libraryCategory;
    return matchesSearch && matchesCategory;
  });

  // Gefilterte gespeicherte Klauseln
  const filteredSavedClauses = savedClauses.filter(clause => {
    const matchesSearch = !librarySearch ||
      clause.clauseText.toLowerCase().includes(librarySearch.toLowerCase()) ||
      clause.clausePreview?.toLowerCase().includes(librarySearch.toLowerCase());
    return matchesSearch;
  });

  // KI-Klausel generieren über echte API
  const handleGenerateClause = async () => {
    if (!aiPrompt.trim()) return;

    setIsGenerating(true);
    try {
      // Echte KI-Generierung über Backend-API
      const result = await generateClause(aiPrompt, {
        tone: 'formal',
        length: 'mittel',
        strictness: 'ausgewogen',
      }) as {
        clause?: { title?: string; body?: string; subclauses?: Array<{ number: string; text: string }> };
        legalBasis?: string[];
        riskLevel?: string;
        suggestedVariables?: Array<{ name: string; displayName: string; type: string }>;
      };

      const generatedClause = {
        type: 'clause' as BlockType,
        content: {
          number: 'auto',
          clauseTitle: result.clause?.title || 'KI-generierte Klausel',
          body: result.clause?.body || `Klausel basierend auf: "${aiPrompt}"`,
          subclauses: result.clause?.subclauses || [],
        },
        style: {},
        locked: false,
        aiGenerated: true,
        aiPrompt: aiPrompt,
        legalBasis: result.legalBasis || [],
        riskLevel: result.riskLevel as 'low' | 'medium' | 'high' | undefined,
      };

      addBlock(generatedClause);

      // Vorgeschlagene Variablen hinzufügen
      if (result.suggestedVariables && result.suggestedVariables.length > 0) {
        result.suggestedVariables.forEach(sv => {
          const newVar: Omit<Variable, 'id'> = {
            name: `{{${sv.name}}}`,
            displayName: sv.displayName,
            type: sv.type as Variable['type'],
            required: false,
            group: 'KI-generiert',
            linkedBlocks: [],
          };
          addVariable(newVar);
        });
      }

      setShowAiModal(false);
      setAiPrompt('');
    } catch {
      setAiError('Fehler bei der KI-Generierung. Bitte versuchen Sie es erneut.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Block hinzufügen
  const handleAddBlock = (type: BlockType) => {
    const newBlock = {
      type,
      content: getDefaultContent(type) as Record<string, unknown>,
      style: {},
      locked: false,
      aiGenerated: false,
    };

    addBlock(newBlock);

    // Auto Page-Break nach Deckblatt einfügen
    if (type === 'cover') {
      addBlock({
        type: 'page-break',
        content: {},
        style: {},
        locked: false,
        aiGenerated: false,
      });
    }
  };

  // Gefilterte Kategorien
  const filteredCategories = searchQuery
    ? blockCategories.map(cat => ({
        ...cat,
        blocks: cat.blocks.filter(
          b => b.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
               b.description.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      })).filter(cat => cat.blocks.length > 0)
    : blockCategories;

  return (
    <div className={`${styles.toolbar} ${className || ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>Blöcke</h3>
      </div>

      {/* Search */}
      <div className={styles.searchWrapper}>
        <Search size={14} className={styles.searchIcon} />
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Block suchen..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* AI Quick Add */}
      <div className={styles.aiSection}>
        <button className={styles.aiButton} onClick={() => setShowAiModal(true)}>
          <Sparkles size={16} />
          <span>KI-Klausel generieren</span>
        </button>
        <button className={styles.libraryButton} onClick={() => setShowLibraryModal(true)}>
          <BookOpen size={16} />
          <span>Aus Bibliothek</span>
        </button>
      </div>

      {/* KI-Modal */}
      {showAiModal && (
        <div className={styles.aiModalOverlay} onClick={() => setShowAiModal(false)}>
          <div className={styles.aiModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.aiModalHeader}>
              <span><Sparkles size={16} /> KI-Klausel generieren</span>
              <button onClick={() => setShowAiModal(false)} aria-label="KI-Generator schließen">
                <X size={16} />
              </button>
            </div>
            <div className={styles.aiModalContent}>
              <textarea
                placeholder="Beschreiben Sie die gewünschte Klausel, z.B. 'Haftungsausschluss für Softwaredienstleistungen'"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                rows={4}
              />
              <div className={styles.aiSuggestions}>
                <button onClick={() => setAiPrompt('Haftungsausschluss')}>Haftung</button>
                <button onClick={() => setAiPrompt('Vertraulichkeitsklausel')}>Vertraulichkeit</button>
                <button onClick={() => setAiPrompt('Kündigungsklausel')}>Kündigung</button>
              </div>
            </div>
            {aiError && (
              <p style={{ color: '#dc2626', fontSize: '0.85rem', padding: '0 1rem', margin: '0 0 0.5rem' }}>{aiError}</p>
            )}
            <div className={styles.aiModalFooter}>
              <button className={styles.cancelBtn} onClick={() => { setShowAiModal(false); setAiError(null); }}>
                Abbrechen
              </button>
              <button
                className={styles.generateBtn}
                onClick={handleGenerateClause}
                disabled={!aiPrompt.trim() || isGenerating}
              >
                {isGenerating ? (
                  <><Loader2 size={14} className={styles.spinner} /> Generiere...</>
                ) : (
                  <><Sparkles size={14} /> Generieren</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bibliothek-Modal */}
      {showLibraryModal && (
        <div className={styles.libraryModalOverlay} onClick={() => setShowLibraryModal(false)}>
          <div className={styles.libraryModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.libraryModalHeader}>
              <span><BookOpen size={16} /> Klausel aus Bibliothek einfügen</span>
              <button onClick={() => setShowLibraryModal(false)} aria-label="Bibliothek schließen">
                <X size={16} />
              </button>
            </div>

            {/* Tabs */}
            <div className={styles.libraryTabs}>
              <button
                className={`${styles.libraryTab} ${libraryTab === 'muster' ? styles.active : ''}`}
                onClick={() => setLibraryTab('muster')}
              >
                Musterklauseln
              </button>
              <button
                className={`${styles.libraryTab} ${libraryTab === 'meine' ? styles.active : ''}`}
                onClick={() => setLibraryTab('meine')}
              >
                Meine Klauseln
              </button>
            </div>

            {/* Search & Filter */}
            <div className={styles.libraryFilters}>
              <div className={styles.librarySearchWrapper}>
                <Search size={14} className={styles.librarySearchIcon} />
                <input
                  type="text"
                  className={styles.librarySearchInput}
                  placeholder="Klausel suchen..."
                  value={librarySearch}
                  onChange={(e) => setLibrarySearch(e.target.value)}
                />
              </div>
              {libraryTab === 'muster' && (
                <select
                  className={styles.libraryCategorySelect}
                  value={libraryCategory}
                  onChange={(e) => setLibraryCategory(e.target.value as TemplateClauseCategory | '')}
                >
                  <option value="">Alle Kategorien</option>
                  {Object.entries(TEMPLATE_CLAUSE_CATEGORY_INFO).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.icon} {info.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Klausel-Liste */}
            <div className={styles.libraryClauseList}>
              {libraryTab === 'muster' ? (
                filteredTemplateClauses.length > 0 ? (
                  filteredTemplateClauses.map(clause => {
                    const categoryInfo = TEMPLATE_CLAUSE_CATEGORY_INFO[clause.category];
                    return (
                      <div key={clause.id} className={styles.libraryClauseCard}>
                        <div className={styles.libraryClauseHeader}>
                          <span className={styles.libraryClauseTitle}>
                            {categoryInfo?.icon} {clause.title}
                          </span>
                          <button
                            className={styles.libraryInsertBtn}
                            onClick={() => handleInsertFromLibrary(clause)}
                          >
                            Einfügen
                          </button>
                        </div>
                        <div className={styles.libraryClauseMeta}>
                          <span className={styles.libraryClauseCategory}>
                            {categoryInfo?.label}
                          </span>
                          {clause.legalBasis && (
                            <span className={styles.libraryClauseLegalBasis}>
                              {clause.legalBasis}
                            </span>
                          )}
                        </div>
                        <p className={styles.libraryClausePreview}>
                          {clause.clauseText.substring(0, 150)}...
                        </p>
                      </div>
                    );
                  })
                ) : (
                  <div className={styles.libraryEmpty}>
                    Keine Musterklauseln gefunden
                  </div>
                )
              ) : (
                isLoadingSavedClauses ? (
                  <div className={styles.libraryLoading}>
                    <Loader2 size={20} className={styles.spinner} />
                    <span>Lade Klauseln...</span>
                  </div>
                ) : filteredSavedClauses.length > 0 ? (
                  filteredSavedClauses.map(clause => (
                    <div key={clause._id} className={styles.libraryClauseCard}>
                      <div className={styles.libraryClauseHeader}>
                        <span className={styles.libraryClauseTitle}>
                          {clause.clausePreview?.substring(0, 50) || 'Gespeicherte Klausel'}
                        </span>
                        <button
                          className={styles.libraryInsertBtn}
                          onClick={() => handleInsertFromLibrary(clause)}
                        >
                          Einfügen
                        </button>
                      </div>
                      <div className={styles.libraryClauseMeta}>
                        {clause.sourceContractName && (
                          <span className={styles.libraryClauseSource}>
                            Aus: {clause.sourceContractName}
                          </span>
                        )}
                        {clause.tags.length > 0 && (
                          <span className={styles.libraryClauseTags}>
                            {clause.tags.slice(0, 2).join(', ')}
                          </span>
                        )}
                      </div>
                      <p className={styles.libraryClausePreview}>
                        {clause.clauseText.substring(0, 150)}...
                      </p>
                    </div>
                  ))
                ) : (
                  <div className={styles.libraryEmpty}>
                    <p>Noch keine Klauseln gespeichert</p>
                    <span>Speichern Sie Klauseln aus der Vertragsanalyse, um sie hier wiederzuverwenden.</span>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      )}

      {/* Block Categories */}
      <div className={styles.categories}>
        {filteredCategories.map(category => (
          <div key={category.name} className={styles.category}>
            <button
              className={styles.categoryHeader}
              onClick={() => setExpandedCategory(
                expandedCategory === category.name ? null : category.name
              )}
            >
              <ChevronRight
                size={14}
                className={`${styles.chevron} ${expandedCategory === category.name ? styles.expanded : ''}`}
              />
              <span>{category.name}</span>
              <span className={styles.categoryCount}>{category.blocks.length}</span>
            </button>

            {(expandedCategory === category.name || searchQuery) && (
              <div className={styles.blockList}>
                {category.blocks.map(block => {
                  const Icon = block.icon;
                  return (
                    <button
                      key={block.type}
                      className={styles.blockItem}
                      onClick={() => handleAddBlock(block.type)}
                      title={block.description}
                    >
                      <div className={styles.blockIcon}>
                        <Icon size={18} />
                      </div>
                      <div className={styles.blockInfo}>
                        <span className={styles.blockLabel}>{block.label}</span>
                        <span className={styles.blockDescription}>{block.description}</span>
                      </div>
                      <Plus size={14} className={styles.addIcon} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Quick Tips */}
      <div className={styles.tips}>
        <p className={styles.tipText}>
          <kbd>Ctrl</kbd> + <kbd>B</kbd> zum schnellen Hinzufügen
        </p>
      </div>
    </div>
  );
};

// Default Content für Block-Typen
function getDefaultContent(type: BlockType): Record<string, unknown> {
  switch (type) {
    case 'header':
      return {
        title: 'Vertragstitel',
        subtitle: 'Untertitel des Vertrags',
      };
    case 'parties':
      return {
        party1: {
          role: 'Auftraggeber',
          name: '{{auftraggeber_name}}',
          address: '{{auftraggeber_adresse}}',
          taxId: '{{auftraggeber_steuer_id}}',
          email: '{{auftraggeber_email}}',
          phone: '{{auftraggeber_telefon}}',
        },
        party2: {
          role: 'Auftragnehmer',
          name: '{{auftragnehmer_name}}',
          address: '{{auftragnehmer_adresse}}',
          taxId: '{{auftragnehmer_steuer_id}}',
          email: '{{auftragnehmer_email}}',
          phone: '{{auftragnehmer_telefon}}',
        },
      };
    case 'preamble':
      return {
        preambleText: 'Die nachfolgend genannten Vertragsparteien schließen folgenden Vertrag:',
      };
    case 'clause':
      return {
        number: 'auto',
        clauseTitle: 'Vertragsgegenstand',
        body: 'Der Auftraggeber {{kundenname}} beauftragt den Auftragnehmer mit der Erbringung der vereinbarten Leistungen zum Preis von {{preis}} Euro.\n\n💡 Tipp: Text in doppelten geschweiften Klammern {{so}} wird automatisch zur Variable!',
        subclauses: [],
      };
    case 'table':
      return {
        headers: ['Leistung', 'Menge', 'Preis'],
        rows: [['Beispielleistung', '1', '{{preis}} €']],
      };
    case 'signature':
      return {
        signatureFields: [
          { partyIndex: 0, label: '{{auftraggeber_name}}', showDate: true, showPlace: true },
          { partyIndex: 1, label: '{{auftragnehmer_name}}', showDate: true, showPlace: true },
        ],
        witnesses: 0,
      };
    case 'attachment':
      return {
        attachmentTitle: 'Anlage 1',
        attachmentDescription: 'Beschreibung der Anlage',
      };
    case 'spacer':
      return {
        height: 24,
      };
    case 'divider':
      return {
        style: 'solid',
      };
    case 'logo':
      return {
        logoUrl: '',
        altText: 'Firmenlogo',
        width: 150,
        alignment: 'left',
      };
    case 'cover':
      return {
        coverTitle: 'Vertragstitel',
        coverSubtitle: '',
        contractType: '',
        coverDate: new Date().toLocaleDateString('de-DE'),
        referenceNumber: '',
        confidentialityNotice: '',
        partySummary1: '',
        partySummary2: '',
        coverLayout: 'executive-center',
      };
    case 'definitions':
      return {
        definitionsTitle: '§ 1 Definitionen',
        definitions: [
          { term: 'Vertragsgegenstand', definition: 'bezeichnet die in diesem Vertrag vereinbarten Leistungen.' },
          { term: 'Vergütung', definition: 'bezeichnet die für die Leistungen zu zahlende Gegenleistung.' },
        ],
      };
    case 'notice':
      return {
        noticeType: 'info',
        noticeTitle: 'Hinweis',
        noticeText: 'Hier können Sie Ihren Hinweistext eingeben. Doppelklicken zum Bearbeiten.',
        showNoticeIcon: false,
      };
    default:
      return {};
  }
}

export default BlockToolbar;
