/**
 * PropertiesPanel - Eigenschaften-Panel für Block-Styling
 */

import React, { useState } from 'react';
import { useContractBuilderStore, Block as BlockType, BlockStyle } from '../../../stores/contractBuilderStore';
import {
  Palette,
  Type,
  Layout,
  Square,
  Settings,
  ChevronDown,
  ChevronRight,
  Trash2,
  Copy,
  Lock,
  Unlock,
  Sparkles,
  FileText,
} from 'lucide-react';
import styles from './PropertiesPanel.module.css';

interface PropertiesPanelProps {
  className?: string;
}

type SectionType = 'content' | 'typography' | 'colors' | 'spacing' | 'border' | 'advanced';

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ className }) => {
  const [expandedSections, setExpandedSections] = useState<Set<SectionType>>(
    new Set(['content', 'typography'])
  );

  const {
    document: currentDocument,
    selectedBlockId,
    updateBlock,
    updateBlockContent,
    deleteBlock,
    duplicateBlock,
  } = useContractBuilderStore();

  // Ausgewählten Block finden
  const selectedBlock = selectedBlockId
    ? currentDocument?.content.blocks.find((b: BlockType) => b.id === selectedBlockId)
    : null;

  // Section ein-/ausklappen
  const toggleSection = (section: SectionType) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  // Style-Wert aktualisieren
  const updateStyle = (key: keyof BlockStyle, value: unknown) => {
    if (!selectedBlock) return;

    updateBlock(selectedBlock.id, {
      style: {
        ...selectedBlock.style,
        [key]: value,
      },
    });
  };

  // Block löschen
  const handleDelete = () => {
    if (selectedBlock && window.confirm('Block wirklich löschen?')) {
      deleteBlock(selectedBlock.id);
    }
  };

  // Block duplizieren
  const handleDuplicate = () => {
    if (selectedBlock) {
      duplicateBlock(selectedBlock.id);
    }
  };

  // Block sperren/entsperren
  const toggleLock = () => {
    if (selectedBlock) {
      updateBlock(selectedBlock.id, { locked: !selectedBlock.locked });
    }
  };

  if (!selectedBlock) {
    return (
      <div className={`${styles.panel} ${className || ''}`}>
        <div className={styles.emptyState}>
          <Settings size={32} strokeWidth={1} />
          <p>Wählen Sie einen Block aus, um seine Eigenschaften zu bearbeiten</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.panel} ${className || ''}`}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>Eigenschaften</h3>
        <span className={styles.blockType}>
          {getBlockTypeLabel(selectedBlock.type)}
        </span>
      </div>

      {/* Block Actions */}
      <div className={styles.actions}>
        <button
          className={styles.actionButton}
          onClick={handleDuplicate}
          title="Duplizieren"
        >
          <Copy size={14} />
        </button>
        <button
          className={styles.actionButton}
          onClick={toggleLock}
          title={selectedBlock.locked ? 'Entsperren' : 'Sperren'}
        >
          {selectedBlock.locked ? <Lock size={14} /> : <Unlock size={14} />}
        </button>
        <button
          className={`${styles.actionButton} ${styles.deleteButton}`}
          onClick={handleDelete}
          title="Löschen"
          disabled={selectedBlock.locked}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* AI Generated Badge */}
      {selectedBlock.aiGenerated && (
        <div className={styles.aiBadge}>
          <Sparkles size={12} />
          <span>KI-generiert</span>
        </div>
      )}

      {/* Sections */}
      <div className={styles.sections}>
        {/* Content - Block-spezifische Inhalte */}
        <Section
          title="Inhalt"
          icon={<FileText size={14} />}
          isExpanded={expandedSections.has('content')}
          onToggle={() => toggleSection('content')}
        >
          <ContentEditor
            block={selectedBlock}
            onUpdate={(content) => updateBlockContent(selectedBlock.id, content)}
          />
        </Section>

        {/* Typography */}
        <Section
          title="Typografie"
          icon={<Type size={14} />}
          isExpanded={expandedSections.has('typography')}
          onToggle={() => toggleSection('typography')}
        >
          <div className={styles.field}>
            <label className={styles.label}>Schriftfamilie</label>
            <select
              className={styles.select}
              value={selectedBlock.style?.fontFamily || ''}
              onChange={(e) => updateStyle('fontFamily', e.target.value || undefined)}
            >
              <option value="">Standard</option>
              <option value="Inter">Inter</option>
              <option value="Georgia">Georgia</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Arial">Arial</option>
              <option value="Roboto">Roboto</option>
              <option value="Open Sans">Open Sans</option>
            </select>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Größe</label>
              <input
                type="number"
                className={styles.input}
                value={selectedBlock.style?.fontSize || ''}
                placeholder="14"
                onChange={(e) => updateStyle('fontSize', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Gewicht</label>
              <select
                className={styles.select}
                value={selectedBlock.style?.fontWeight || ''}
                onChange={(e) => updateStyle('fontWeight', e.target.value ? Number(e.target.value) : undefined)}
              >
                <option value="">Standard</option>
                <option value="300">Light (300)</option>
                <option value="400">Regular (400)</option>
                <option value="500">Medium (500)</option>
                <option value="600">Semibold (600)</option>
                <option value="700">Bold (700)</option>
              </select>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Zeilenhöhe</label>
              <input
                type="number"
                className={styles.input}
                value={selectedBlock.style?.lineHeight || ''}
                placeholder="1.6"
                step="0.1"
                onChange={(e) => updateStyle('lineHeight', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Ausrichtung</label>
              <select
                className={styles.select}
                value={selectedBlock.style?.textAlign || ''}
                onChange={(e) => updateStyle('textAlign', e.target.value as BlockStyle['textAlign'] || undefined)}
              >
                <option value="">Standard</option>
                <option value="left">Links</option>
                <option value="center">Zentriert</option>
                <option value="right">Rechts</option>
                <option value="justify">Blocksatz</option>
              </select>
            </div>
          </div>
        </Section>

        {/* Colors */}
        <Section
          title="Farben"
          icon={<Palette size={14} />}
          isExpanded={expandedSections.has('colors')}
          onToggle={() => toggleSection('colors')}
        >
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Textfarbe</label>
              <div className={styles.colorInput}>
                <input
                  type="color"
                  value={selectedBlock.style?.textColor || '#1a202c'}
                  onChange={(e) => updateStyle('textColor', e.target.value)}
                />
                <input
                  type="text"
                  className={styles.input}
                  value={selectedBlock.style?.textColor || ''}
                  placeholder="#1a202c"
                  onChange={(e) => updateStyle('textColor', e.target.value || undefined)}
                />
              </div>
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Hintergrund</label>
              <div className={styles.colorInput}>
                <input
                  type="color"
                  value={selectedBlock.style?.backgroundColor || '#ffffff'}
                  onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                />
                <input
                  type="text"
                  className={styles.input}
                  value={selectedBlock.style?.backgroundColor || ''}
                  placeholder="transparent"
                  onChange={(e) => updateStyle('backgroundColor', e.target.value || undefined)}
                />
              </div>
            </div>
          </div>
        </Section>

        {/* Spacing */}
        <Section
          title="Abstände"
          icon={<Layout size={14} />}
          isExpanded={expandedSections.has('spacing')}
          onToggle={() => toggleSection('spacing')}
        >
          <div className={styles.spacingGrid}>
            <div className={styles.spacingLabel}>Margin</div>
            <div className={styles.spacingInputs}>
              <input
                type="number"
                className={styles.spacingInput}
                placeholder="T"
                title="Margin Top"
                value={selectedBlock.style?.marginTop || ''}
                onChange={(e) => updateStyle('marginTop', e.target.value ? Number(e.target.value) : undefined)}
              />
              <input
                type="number"
                className={styles.spacingInput}
                placeholder="B"
                title="Margin Bottom"
                value={selectedBlock.style?.marginBottom || ''}
                onChange={(e) => updateStyle('marginBottom', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          <div className={styles.spacingGrid}>
            <div className={styles.spacingLabel}>Padding</div>
            <div className={styles.spacingInputs}>
              <input
                type="number"
                className={styles.spacingInput}
                placeholder="T"
                title="Padding Top"
                value={selectedBlock.style?.paddingTop || ''}
                onChange={(e) => updateStyle('paddingTop', e.target.value ? Number(e.target.value) : undefined)}
              />
              <input
                type="number"
                className={styles.spacingInput}
                placeholder="R"
                title="Padding Right"
                value={selectedBlock.style?.paddingRight || ''}
                onChange={(e) => updateStyle('paddingRight', e.target.value ? Number(e.target.value) : undefined)}
              />
              <input
                type="number"
                className={styles.spacingInput}
                placeholder="B"
                title="Padding Bottom"
                value={selectedBlock.style?.paddingBottom || ''}
                onChange={(e) => updateStyle('paddingBottom', e.target.value ? Number(e.target.value) : undefined)}
              />
              <input
                type="number"
                className={styles.spacingInput}
                placeholder="L"
                title="Padding Left"
                value={selectedBlock.style?.paddingLeft || ''}
                onChange={(e) => updateStyle('paddingLeft', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>
        </Section>

        {/* Border */}
        <Section
          title="Rahmen"
          icon={<Square size={14} />}
          isExpanded={expandedSections.has('border')}
          onToggle={() => toggleSection('border')}
        >
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Stil</label>
              <select
                className={styles.select}
                value={selectedBlock.style?.borderStyle || ''}
                onChange={(e) => updateStyle('borderStyle', e.target.value as BlockStyle['borderStyle'] || undefined)}
              >
                <option value="">Keiner</option>
                <option value="solid">Durchgehend</option>
                <option value="dashed">Gestrichelt</option>
                <option value="dotted">Gepunktet</option>
              </select>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Breite</label>
              <input
                type="number"
                className={styles.input}
                value={selectedBlock.style?.borderWidth || ''}
                placeholder="1"
                onChange={(e) => updateStyle('borderWidth', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>

          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Farbe</label>
              <div className={styles.colorInput}>
                <input
                  type="color"
                  value={selectedBlock.style?.borderColor || '#e2e8f0'}
                  onChange={(e) => updateStyle('borderColor', e.target.value)}
                />
                <input
                  type="text"
                  className={styles.input}
                  value={selectedBlock.style?.borderColor || ''}
                  placeholder="#e2e8f0"
                  onChange={(e) => updateStyle('borderColor', e.target.value || undefined)}
                />
              </div>
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Radius</label>
              <input
                type="number"
                className={styles.input}
                value={selectedBlock.style?.borderRadius || ''}
                placeholder="0"
                onChange={(e) => updateStyle('borderRadius', e.target.value ? Number(e.target.value) : undefined)}
              />
            </div>
          </div>
        </Section>

        {/* Advanced */}
        <Section
          title="Erweitert"
          icon={<Settings size={14} />}
          isExpanded={expandedSections.has('advanced')}
          onToggle={() => toggleSection('advanced')}
        >
          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedBlock.style?.shadow || false}
                onChange={(e) => updateStyle('shadow', e.target.checked)}
              />
              <span>Schatten</span>
            </label>
          </div>

          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={selectedBlock.style?.highlight || false}
                onChange={(e) => updateStyle('highlight', e.target.checked)}
              />
              <span>Hervorhebung</span>
            </label>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Transparenz</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={selectedBlock.style?.opacity ?? 1}
              onChange={(e) => updateStyle('opacity', Number(e.target.value))}
              className={styles.rangeInput}
            />
            <span className={styles.rangeValue}>
              {Math.round((selectedBlock.style?.opacity ?? 1) * 100)}%
            </span>
          </div>
        </Section>
      </div>
    </div>
  );
};

// Section Component
interface SectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  children,
}) => (
  <div className={styles.section}>
    <button className={styles.sectionHeader} onClick={onToggle}>
      {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
      {icon}
      <span>{title}</span>
    </button>
    {isExpanded && (
      <div className={styles.sectionContent}>{children}</div>
    )}
  </div>
);

// Helper
function getBlockTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'header': 'Kopfzeile',
    'parties': 'Parteien',
    'preamble': 'Präambel',
    'clause': 'Klausel',
    'numbered-list': 'Aufzählung',
    'table': 'Tabelle',
    'signature': 'Unterschrift',
    'attachment': 'Anlage',
    'date-field': 'Datum',
    'divider': 'Trenner',
    'spacer': 'Abstand',
    'logo': 'Logo',
    'page-break': 'Seitenumbruch',
    'custom': 'Benutzerdefiniert',
  };
  return labels[type] || type;
}

// ContentEditor - Block-spezifische Inhaltsbearbeitung
interface ContentEditorProps {
  block: BlockType;
  onUpdate: (content: Record<string, unknown>) => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({ block, onUpdate }) => {
  const content = block.content || {};

  switch (block.type) {
    case 'header':
      return (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Titel</label>
            <input
              type="text"
              className={styles.input}
              value={String(content.title || '')}
              placeholder="Vertragstitel"
              onChange={(e) => onUpdate({ ...content, title: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Untertitel</label>
            <input
              type="text"
              className={styles.input}
              value={String(content.subtitle || '')}
              placeholder="Untertitel"
              onChange={(e) => onUpdate({ ...content, subtitle: e.target.value })}
            />
          </div>
        </>
      );

    case 'parties': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const party1 = (content.party1 || {}) as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const party2 = (content.party2 || {}) as any;
      return (
        <>
          <div className={styles.fieldGroup}>
            <label className={styles.groupLabel}>Partei 1 (Auftraggeber)</label>
            <div className={styles.field}>
              <label className={styles.label}>Rolle</label>
              <input
                type="text"
                className={styles.input}
                value={String(party1.role || 'Auftraggeber')}
                onChange={(e) => onUpdate({
                  ...content,
                  party1: { ...party1, role: e.target.value }
                })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Name / Firma</label>
              <input
                type="text"
                className={styles.input}
                value={String(party1.name || '')}
                placeholder="Max Mustermann GmbH"
                onChange={(e) => onUpdate({
                  ...content,
                  party1: { ...party1, name: e.target.value }
                })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Adresse</label>
              <textarea
                className={styles.textarea}
                rows={2}
                value={String(party1.address || '')}
                placeholder="Musterstraße 1, 12345 Musterstadt"
                onChange={(e) => onUpdate({
                  ...content,
                  party1: { ...party1, address: e.target.value }
                })}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.groupLabel}>Partei 2 (Auftragnehmer)</label>
            <div className={styles.field}>
              <label className={styles.label}>Rolle</label>
              <input
                type="text"
                className={styles.input}
                value={String(party2.role || 'Auftragnehmer')}
                onChange={(e) => onUpdate({
                  ...content,
                  party2: { ...party2, role: e.target.value }
                })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Name / Firma</label>
              <input
                type="text"
                className={styles.input}
                value={String(party2.name || '')}
                placeholder="Erika Musterfrau"
                onChange={(e) => onUpdate({
                  ...content,
                  party2: { ...party2, name: e.target.value }
                })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Adresse</label>
              <textarea
                className={styles.textarea}
                rows={2}
                value={String(party2.address || '')}
                placeholder="Beispielweg 2, 54321 Beispielort"
                onChange={(e) => onUpdate({
                  ...content,
                  party2: { ...party2, address: e.target.value }
                })}
              />
            </div>
          </div>
        </>
      );
    }

    case 'preamble':
      return (
        <div className={styles.field}>
          <label className={styles.label}>Präambeltext</label>
          <textarea
            className={styles.textarea}
            rows={4}
            value={String(content.preambleText || '')}
            placeholder="Die nachfolgend genannten Vertragsparteien schließen folgenden Vertrag:"
            onChange={(e) => onUpdate({ ...content, preambleText: e.target.value })}
          />
        </div>
      );

    case 'clause':
      return (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Klauseltitel</label>
            <input
              type="text"
              className={styles.input}
              value={String(content.clauseTitle || '')}
              placeholder="§ 1 Vertragsgegenstand"
              onChange={(e) => onUpdate({ ...content, clauseTitle: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Klauseltext</label>
            <textarea
              className={styles.textarea}
              rows={6}
              value={String(content.body || '')}
              placeholder="Der Klauselinhalt..."
              onChange={(e) => onUpdate({ ...content, body: e.target.value })}
            />
          </div>
        </>
      );

    case 'attachment':
      return (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Anlagentitel</label>
            <input
              type="text"
              className={styles.input}
              value={String(content.attachmentTitle || '')}
              placeholder="Anlage 1"
              onChange={(e) => onUpdate({ ...content, attachmentTitle: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Beschreibung</label>
            <textarea
              className={styles.textarea}
              rows={3}
              value={String(content.attachmentDescription || '')}
              placeholder="Beschreibung der Anlage..."
              onChange={(e) => onUpdate({ ...content, attachmentDescription: e.target.value })}
            />
          </div>
        </>
      );

    case 'spacer':
      return (
        <div className={styles.field}>
          <label className={styles.label}>Höhe (px)</label>
          <input
            type="number"
            className={styles.input}
            value={content.height as number || 24}
            min={8}
            max={200}
            onChange={(e) => onUpdate({ ...content, height: Number(e.target.value) })}
          />
        </div>
      );

    case 'divider':
      return (
        <div className={styles.field}>
          <label className={styles.label}>Stil</label>
          <select
            className={styles.select}
            value={String(content.style || 'solid')}
            onChange={(e) => onUpdate({ ...content, style: e.target.value })}
          >
            <option value="solid">Durchgezogen</option>
            <option value="dashed">Gestrichelt</option>
            <option value="dotted">Gepunktet</option>
          </select>
        </div>
      );

    case 'custom': {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customContent = content as any;
      return (
        <div className={styles.field}>
          <label className={styles.label}>Freitext</label>
          <textarea
            className={styles.textarea}
            rows={6}
            value={String(customContent.text || '')}
            placeholder="Benutzerdefinierter Text..."
            onChange={(e) => onUpdate({ ...content, text: e.target.value })}
          />
        </div>
      );
    }

    case 'page-break':
    case 'signature':
    case 'table':
    case 'date-field':
      return (
        <p className={styles.noContent}>
          Dieser Block-Typ hat keine bearbeitbaren Textinhalte.
        </p>
      );

    default:
      return (
        <p className={styles.noContent}>
          Für diesen Block-Typ ist keine Inhaltsbearbeitung verfügbar.
        </p>
      );
  }
};

export default PropertiesPanel;
