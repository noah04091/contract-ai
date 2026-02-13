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
  Paintbrush,
  Lock,
  Unlock,
  Sparkles,
  FileText,
  Wand2,
  Loader2,
  MessageSquare,
} from 'lucide-react';
import { BlockNotes } from '../Notes/BlockNotes';
import styles from './PropertiesPanel.module.css';

interface PropertiesPanelProps {
  className?: string;
}

type SectionType = 'content' | 'typography' | 'colors' | 'spacing' | 'border' | 'advanced' | 'notes';

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
    applyStyleToAllOfType,
    optimizeClause,
    addBlockNote,
    updateBlockNote,
    deleteBlockNote,
    resolveBlockNote,
  } = useContractBuilderStore();

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationGoal, setOptimizationGoal] = useState<string>('rechtssicher');

  // Ausgewählten Block finden
  const selectedBlock = selectedBlockId
    ? currentDocument?.content.blocks.find((b: BlockType) => b.id === selectedBlockId)
    : null;

  // Anzahl gleichartiger Blöcke (für "Auf alle anwenden")
  const sameTypeCount = selectedBlock
    ? currentDocument?.content.blocks.filter((b: BlockType) => b.type === selectedBlock.type && b.id !== selectedBlock.id).length || 0
    : 0;

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

  // Stil auf alle Blöcke desselben Typs anwenden
  const handleApplyToAll = () => {
    if (selectedBlock && sameTypeCount > 0) {
      applyStyleToAllOfType(selectedBlock.id);
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
        {sameTypeCount > 0 && (
          <button
            className={styles.actionButton}
            onClick={handleApplyToAll}
            title={`Stil auf alle ${sameTypeCount} weiteren ${getBlockTypeLabel(selectedBlock.type)}-Blöcke anwenden`}
          >
            <Paintbrush size={14} />
          </button>
        )}
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
            isOptimizing={isOptimizing}
            optimizationGoal={optimizationGoal}
            onOptimizationGoalChange={setOptimizationGoal}
            onOptimize={async () => {
              if (selectedBlock?.type !== 'clause') return;
              const clauseText = String(selectedBlock.content?.body || '');
              if (!clauseText.trim()) return;

              setIsOptimizing(true);
              try {
                const result = await optimizeClause(clauseText, optimizationGoal) as {
                  optimizedText?: string;
                  changes?: string[];
                };
                if (result.optimizedText) {
                  updateBlockContent(selectedBlock.id, {
                    ...selectedBlock.content,
                    body: result.optimizedText,
                  });
                }
              } catch (error) {
                console.error('Fehler bei Klausel-Optimierung:', error);
              } finally {
                setIsOptimizing(false);
              }
            }}
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
              <span>Markierung (Randlinie)</span>
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

        {/* Notes */}
        <Section
          title={`Notizen${(selectedBlock.notes?.filter(n => !n.resolved)?.length || 0) > 0 ? ` (${selectedBlock.notes?.filter(n => !n.resolved)?.length})` : ''}`}
          icon={<MessageSquare size={14} />}
          isExpanded={expandedSections.has('notes')}
          onToggle={() => toggleSection('notes')}
        >
          <BlockNotes
            blockId={selectedBlock.id}
            notes={selectedBlock.notes || []}
            onAddNote={addBlockNote}
            onUpdateNote={updateBlockNote}
            onDeleteNote={deleteBlockNote}
            onResolveNote={resolveBlockNote}
            hideHeader
          />
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
    'definitions': 'Definitionen',
    'notice': 'Hinweis',
  };
  return labels[type] || type;
}

// ContentEditor - Block-spezifische Inhaltsbearbeitung
interface ContentEditorProps {
  block: BlockType;
  onUpdate: (content: Record<string, unknown>) => void;
  isOptimizing?: boolean;
  optimizationGoal?: string;
  onOptimizationGoalChange?: (goal: string) => void;
  onOptimize?: () => void;
}

const ContentEditor: React.FC<ContentEditorProps> = ({
  block,
  onUpdate,
  isOptimizing,
  optimizationGoal,
  onOptimizationGoalChange,
  onOptimize,
}) => {
  const content = block.content || {};

  switch (block.type) {
    case 'header': {
      const headerContent = content as {
        title?: string;
        subtitle?: string;
        showDivider?: boolean;
        dividerColor?: string;
        titleFontSize?: number;
        subtitleFontSize?: number;
        headerLayout?: 'centered' | 'left-logo' | 'minimal';
        logo?: string;
      };
      const hdrLayout = headerContent.headerLayout || 'centered';

      // Logo-Upload Handler
      const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Max 2MB
        if (file.size > 2 * 1024 * 1024) {
          alert('Logo darf maximal 2MB groß sein');
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target?.result as string;
          onUpdate({ ...content, logo: base64 });
        };
        reader.readAsDataURL(file);
      };

      return (
        <>
          {/* Layout-Auswahl */}
          <div className={styles.field}>
            <label className={styles.label}>Layout</label>
            <select
              className={styles.select}
              value={hdrLayout}
              onChange={(e) => onUpdate({ ...content, headerLayout: e.target.value as 'centered' | 'left-logo' | 'minimal' })}
            >
              <option value="centered">Zentriert</option>
              <option value="left-logo">Logo Links</option>
              <option value="minimal">Minimal</option>
            </select>
            <p className={styles.fieldHint}>
              {hdrLayout === 'centered' && 'Zentrierter Titel mit optionalem Logo darüber'}
              {hdrLayout === 'left-logo' && 'Logo links, Titel und Untertitel rechts'}
              {hdrLayout === 'minimal' && 'Nur Titel und Untertitel, linksbündig'}
            </p>
          </div>

          {/* Logo-Upload - nur bei centered und left-logo */}
          {hdrLayout !== 'minimal' && (
            <div className={styles.field}>
              <label className={styles.label}>Firmenlogo</label>
              {headerContent.logo ? (
                <div className={styles.fieldGroup}>
                  <img
                    src={headerContent.logo}
                    alt="Logo Vorschau"
                    style={{ maxWidth: '100%', maxHeight: '60px', objectFit: 'contain', marginBottom: '8px' }}
                  />
                  <button
                    type="button"
                    className={styles.actionButton}
                    onClick={() => onUpdate({ ...content, logo: undefined })}
                    style={{ width: '100%', justifyContent: 'center' }}
                  >
                    Logo entfernen
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ fontSize: '12px' }}
                  />
                  <p className={styles.fieldHint}>
                    PNG, JPG oder SVG (max. 2MB)
                  </p>
                </>
              )}
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Titel</label>
            <input
              type="text"
              className={styles.input}
              value={String(headerContent.title || '')}
              placeholder="Vertragstitel"
              onChange={(e) => onUpdate({ ...content, title: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Titel-Schriftgröße (px)</label>
            <input
              type="number"
              className={styles.input}
              value={headerContent.titleFontSize || 24}
              min={12}
              max={72}
              onChange={(e) => onUpdate({ ...content, titleFontSize: Number(e.target.value) })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Untertitel</label>
            <input
              type="text"
              className={styles.input}
              value={String(headerContent.subtitle || '')}
              placeholder="Untertitel"
              onChange={(e) => onUpdate({ ...content, subtitle: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Untertitel-Schriftgröße (px)</label>
            <input
              type="number"
              className={styles.input}
              value={headerContent.subtitleFontSize || 14}
              min={10}
              max={36}
              onChange={(e) => onUpdate({ ...content, subtitleFontSize: Number(e.target.value) })}
            />
          </div>

          {/* Trennlinie nur bei centered Layout */}
          {hdrLayout === 'centered' && (
            <>
              <div className={styles.field}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={headerContent.showDivider !== false}
                    onChange={(e) => onUpdate({ ...content, showDivider: e.target.checked })}
                  />
                  <span>Trennlinie anzeigen</span>
                </label>
              </div>
              {headerContent.showDivider !== false && (
                <div className={styles.field}>
                  <label className={styles.label}>Trennlinien-Farbe</label>
                  <div className={styles.colorInput}>
                    <input
                      type="color"
                      value={headerContent.dividerColor || '#1a365d'}
                      onChange={(e) => onUpdate({ ...content, dividerColor: e.target.value })}
                    />
                    <input
                      type="text"
                      className={styles.input}
                      value={headerContent.dividerColor || ''}
                      placeholder="#1a365d"
                      onChange={(e) => onUpdate({ ...content, dividerColor: e.target.value || undefined })}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </>
      );
    }

    case 'parties': {
      const showIcons = (content as { showPartyIcons?: boolean }).showPartyIcons;
      const partiesLayout = (content as { partiesLayout?: 'modern' | 'classic' }).partiesLayout || 'modern';
      return (
        <>
          {/* Layout-Auswahl */}
          <div className={styles.field}>
            <label className={styles.label}>Layout</label>
            <select
              className={styles.select}
              value={partiesLayout}
              onChange={(e) => onUpdate({ ...content, partiesLayout: e.target.value as 'modern' | 'classic' })}
            >
              <option value="modern">Modern (Side-by-Side)</option>
              <option value="classic">Klassisch (Vertikal)</option>
            </select>
            <p className={styles.fieldHint}>
              {partiesLayout === 'modern'
                ? 'Modernes Layout mit zwei Spalten und Karten-Design'
                : 'Traditionelles Vertragslayout mit "zwischen... und..."'
              }
            </p>
          </div>

          {/* Icons nur bei modernem Layout anzeigen */}
          {partiesLayout === 'modern' && (
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={showIcons === true}
                  onChange={(e) => onUpdate({ ...content, showPartyIcons: e.target.checked })}
                />
                <span>Icons einblenden</span>
              </label>
            </div>
          )}

          <p className={styles.noContent}>
            Bearbeiten Sie die Partei-Daten per Doppelklick direkt im Block.
          </p>
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

    case 'clause': {
      const clauseContent = content as { clauseLayout?: 'standard' | 'indented' | 'boxed' };
      const clsLayout = clauseContent.clauseLayout || 'standard';
      return (
        <>
          {/* Layout-Auswahl */}
          <div className={styles.field}>
            <label className={styles.label}>Layout</label>
            <select
              className={styles.select}
              value={clsLayout}
              onChange={(e) => onUpdate({ ...content, clauseLayout: e.target.value as 'standard' | 'indented' | 'boxed' })}
            >
              <option value="standard">Standard</option>
              <option value="indented">Eingerückt</option>
              <option value="boxed">Mit Rahmen</option>
            </select>
            <p className={styles.fieldHint}>
              {clsLayout === 'standard' && 'Klassisches Layout ohne besondere Formatierung'}
              {clsLayout === 'indented' && 'Klauseltext wird eingerückt mit linker Linie'}
              {clsLayout === 'boxed' && 'Klausel in einem Rahmen mit Hintergrund'}
            </p>
          </div>

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

          {/* KI-Optimierung */}
          {onOptimize && (
            <div className={styles.optimizeSection}>
              <label className={styles.label}>KI-Optimierung</label>
              <div className={styles.optimizeControls}>
                <select
                  className={styles.select}
                  value={optimizationGoal}
                  onChange={(e) => onOptimizationGoalChange?.(e.target.value)}
                  disabled={isOptimizing}
                >
                  <option value="rechtssicher">Rechtssicherer</option>
                  <option value="verständlich">Verständlicher</option>
                  <option value="kürzer">Kürzer/Prägnanter</option>
                  <option value="ausgewogen">Ausgewogener</option>
                  <option value="strenger">Strenger für mich</option>
                </select>
                <button
                  className={styles.optimizeButton}
                  onClick={onOptimize}
                  disabled={isOptimizing || !String(content.body || '').trim()}
                  title="Klausel mit KI optimieren"
                >
                  {isOptimizing ? (
                    <Loader2 size={14} className={styles.spinner} />
                  ) : (
                    <Wand2 size={14} />
                  )}
                  <span>{isOptimizing ? 'Optimiere...' : 'Optimieren'}</span>
                </button>
              </div>
            </div>
          )}
        </>
      );
    }

    case 'attachment':
      return (
        <>
          <div className={styles.fieldNote}>
            <strong>Anlagen-Block</strong><br />
            Titel und Beschreibung per Doppelklick direkt im Canvas bearbeiten.
          </div>
          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={content.showFileInfo !== false}
                onChange={(e) => onUpdate({ ...content, showFileInfo: e.target.checked })}
              />
              Datei-Info anzeigen (Name, Größe, Icon)
            </label>
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

    case 'logo': {
      const logoContent = content as { logoUrl?: string; altText?: string; width?: number; alignment?: string };
      return (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Logo-URL</label>
            <input
              type="url"
              className={styles.input}
              value={String(logoContent.logoUrl || '')}
              placeholder="https://example.com/logo.png"
              onChange={(e) => onUpdate({ ...content, logoUrl: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Alt-Text</label>
            <input
              type="text"
              className={styles.input}
              value={String(logoContent.altText || 'Firmenlogo')}
              placeholder="Firmenlogo"
              onChange={(e) => onUpdate({ ...content, altText: e.target.value })}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Breite (px)</label>
              <input
                type="number"
                className={styles.input}
                value={logoContent.width || 150}
                min={50}
                max={500}
                onChange={(e) => onUpdate({ ...content, width: Number(e.target.value) })}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Ausrichtung</label>
              <select
                className={styles.select}
                value={String(logoContent.alignment || 'left')}
                onChange={(e) => onUpdate({ ...content, alignment: e.target.value })}
              >
                <option value="left">Links</option>
                <option value="center">Zentriert</option>
                <option value="right">Rechts</option>
              </select>
            </div>
          </div>
        </>
      );
    }

    case 'signature': {
      const signatureContent = content as { showSignatureIcons?: boolean; signatureLayout?: 'modern' | 'classic' };
      const sigLayout = signatureContent.signatureLayout || 'modern';
      return (
        <>
          {/* Layout-Auswahl */}
          <div className={styles.field}>
            <label className={styles.label}>Layout</label>
            <select
              className={styles.select}
              value={sigLayout}
              onChange={(e) => onUpdate({ ...content, signatureLayout: e.target.value as 'modern' | 'classic' })}
            >
              <option value="modern">Modern (Karten)</option>
              <option value="classic">Klassisch (Linien)</option>
            </select>
            <p className={styles.fieldHint}>
              {sigLayout === 'modern'
                ? 'Modernes Layout mit separaten Ort/Datum Feldern und Karten'
                : 'Traditionelles Layout mit "Ort, Datum ___" und Unterschriftslinien'
              }
            </p>
          </div>

          {/* Icons nur bei modernem Layout */}
          {sigLayout === 'modern' && (
            <div className={styles.field}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={signatureContent.showSignatureIcons === true}
                  onChange={(e) => onUpdate({ ...content, showSignatureIcons: e.target.checked })}
                />
                <span>Icons einblenden</span>
              </label>
            </div>
          )}

          <p className={styles.noContent}>
            Bearbeiten Sie die Unterschriftsfelder per Doppelklick direkt im Block.
          </p>
        </>
      );
    }

    case 'numbered-list': {
      const listContent = content as {
        title?: string;
        items?: string[];
        listStyle?: 'decimal' | 'alpha' | 'roman';
      };
      return (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Titel (optional)</label>
            <input
              type="text"
              className={styles.input}
              value={String(listContent.title || '')}
              placeholder="z.B. Leistungsumfang"
              onChange={(e) => onUpdate({ ...content, title: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Nummerierungsstil</label>
            <select
              className={styles.select}
              value={listContent.listStyle || 'decimal'}
              onChange={(e) => onUpdate({ ...content, listStyle: e.target.value })}
            >
              <option value="decimal">1, 2, 3...</option>
              <option value="alpha">a, b, c...</option>
              <option value="roman">i, ii, iii...</option>
            </select>
          </div>
          <p className={styles.noContent}>
            Listenelemente per Doppelklick direkt im Block bearbeiten.
          </p>
        </>
      );
    }

    case 'page-break':
    case 'table':
    case 'date-field':
      return (
        <p className={styles.noContent}>
          Dieser Block-Typ hat keine bearbeitbaren Textinhalte.
        </p>
      );

    case 'definitions': {
      const defsContent = content as {
        definitionsTitle?: string;
        definitions?: { term: string; definition: string }[];
      };
      return (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Titel</label>
            <input
              type="text"
              className={styles.input}
              value={String(defsContent.definitionsTitle || '§ 1 Definitionen')}
              placeholder="§ 1 Definitionen"
              onChange={(e) => onUpdate({ ...content, definitionsTitle: e.target.value })}
            />
          </div>
          <p className={styles.noContent}>
            Begriffe und Definitionen können per Doppelklick direkt im Block bearbeitet werden.
            Nutzen Sie die + / × Buttons um Einträge hinzuzufügen oder zu entfernen.
          </p>
        </>
      );
    }

    case 'notice': {
      const noticeContent = content as {
        noticeType?: 'info' | 'warning' | 'important' | 'legal';
        noticeTitle?: string;
        noticeText?: string;
        showNoticeIcon?: boolean;
        noticeBorderColor?: string;
        noticeBackgroundColor?: string;
      };
      return (
        <>
          <div className={styles.field}>
            <label className={styles.label}>Hinweis-Typ</label>
            <select
              className={styles.select}
              value={noticeContent.noticeType || 'info'}
              onChange={(e) => onUpdate({
                ...content,
                noticeType: e.target.value,
                // Reset custom colors when type changes
                noticeBorderColor: undefined,
                noticeBackgroundColor: undefined,
              })}
            >
              <option value="info">Info (Blau)</option>
              <option value="warning">Warnung (Orange)</option>
              <option value="important">Wichtig (Rot)</option>
              <option value="legal">Rechtlich (Violett)</option>
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Titel</label>
            <input
              type="text"
              className={styles.input}
              value={String(noticeContent.noticeTitle || '')}
              placeholder="Hinweistitel"
              onChange={(e) => onUpdate({ ...content, noticeTitle: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Text</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={String(noticeContent.noticeText || '')}
              placeholder="Hinweistext eingeben..."
              onChange={(e) => onUpdate({ ...content, noticeText: e.target.value })}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={noticeContent.showNoticeIcon === true}
                onChange={(e) => onUpdate({ ...content, showNoticeIcon: e.target.checked })}
              />
              <span>Icon anzeigen</span>
            </label>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Rahmenfarbe</label>
              <div className={styles.colorInput}>
                <input
                  type="color"
                  value={noticeContent.noticeBorderColor || '#3b82f6'}
                  onChange={(e) => onUpdate({ ...content, noticeBorderColor: e.target.value })}
                />
                <input
                  type="text"
                  className={styles.input}
                  value={noticeContent.noticeBorderColor || ''}
                  placeholder="Auto"
                  onChange={(e) => onUpdate({ ...content, noticeBorderColor: e.target.value || undefined })}
                />
              </div>
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>Hintergrundfarbe</label>
              <div className={styles.colorInput}>
                <input
                  type="color"
                  value={noticeContent.noticeBackgroundColor || '#eff6ff'}
                  onChange={(e) => onUpdate({ ...content, noticeBackgroundColor: e.target.value })}
                />
                <input
                  type="text"
                  className={styles.input}
                  value={noticeContent.noticeBackgroundColor || ''}
                  placeholder="Auto"
                  onChange={(e) => onUpdate({ ...content, noticeBackgroundColor: e.target.value || undefined })}
                />
              </div>
            </div>
          </div>
        </>
      );
    }

    default:
      return (
        <p className={styles.noContent}>
          Für diesen Block-Typ ist keine Inhaltsbearbeitung verfügbar.
        </p>
      );
  }
};

export default PropertiesPanel;
