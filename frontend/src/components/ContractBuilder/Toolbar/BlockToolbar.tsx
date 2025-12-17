/**
 * BlockToolbar - Linke Seitenleiste zum Hinzufügen von Blöcken
 */

import React, { useState } from 'react';
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
} from 'lucide-react';
import styles from './BlockToolbar.module.css';

interface BlockToolbarProps {
  className?: string;
}

// Block-Definitionen
const blockCategories = [
  {
    name: 'Struktur',
    blocks: [
      { type: 'header' as BlockType, label: 'Kopfzeile', icon: FileText, description: 'Vertragstitel und Logo' },
      { type: 'parties' as BlockType, label: 'Parteien', icon: Users, description: 'Vertragsparteien definieren' },
      { type: 'preamble' as BlockType, label: 'Präambel', icon: ScrollText, description: 'Einleitender Text' },
    ],
  },
  {
    name: 'Inhalt',
    blocks: [
      { type: 'clause' as BlockType, label: 'Klausel', icon: AlignLeft, description: 'Standard-Vertragsklausel' },
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
  const [expandedCategory, setExpandedCategory] = useState<string | null>('Inhalt');
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { addBlock, generateClause, addVariable } = useContractBuilderStore();

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
    } catch (error) {
      console.error('Fehler bei KI-Generierung:', error);
      alert('Fehler bei der KI-Generierung. Bitte versuchen Sie es erneut.');
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
      </div>

      {/* KI-Modal */}
      {showAiModal && (
        <div className={styles.aiModalOverlay} onClick={() => setShowAiModal(false)}>
          <div className={styles.aiModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.aiModalHeader}>
              <span><Sparkles size={16} /> KI-Klausel generieren</span>
              <button onClick={() => setShowAiModal(false)}>
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
            <div className={styles.aiModalFooter}>
              <button className={styles.cancelBtn} onClick={() => setShowAiModal(false)}>
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
        },
        party2: {
          role: 'Auftragnehmer',
          name: '{{auftragnehmer_name}}',
          address: '{{auftragnehmer_adresse}}',
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
    default:
      return {};
  }
}

export default BlockToolbar;
