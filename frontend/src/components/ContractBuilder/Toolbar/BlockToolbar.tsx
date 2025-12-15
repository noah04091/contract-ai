/**
 * BlockToolbar - Linke Seitenleiste zum Hinzufügen von Blöcken
 */

import React, { useState } from 'react';
import { useContractBuilderStore, BlockType } from '../../../stores/contractBuilderStore';
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

  const { addBlock } = useContractBuilderStore();

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
        <button className={styles.aiButton}>
          <Sparkles size={16} />
          <span>KI-Klausel generieren</span>
        </button>
      </div>

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
        clauseTitle: 'Klauseltitel',
        body: 'Hier steht der Klauseltext. Verwenden Sie {{variablen}} für dynamische Werte.',
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
    default:
      return {};
  }
}

export default BlockToolbar;
