/**
 * ContractBuilder Component Smoke Tests
 * Verifies all components render without crashing
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: () => `smoke-uuid-${++uuidCounter}` },
});

// Mock zustand persist/devtools
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware');
  return {
    ...actual,
    persist: (fn: unknown) => fn,
    devtools: (fn: unknown) => fn,
  };
});

// Mock the store for component tests
const mockStore = {
  document: null as ReturnType<typeof createMockDocument> | null,
  selectedBlockId: null as string | null,
  hoveredBlockId: null,
  view: 'edit' as const,
  zoom: 100,
  sidebarLeft: true,
  sidebarRight: true,
  variablesBar: true,
  isDragging: false,
  draggedItem: null,
  dropTarget: null,
  isAiGenerating: false,
  hasUnsavedChanges: false,
  activePageIndex: 0,
  collaboration: { isEnabled: false, collaborators: [], myId: null, sessionId: null, connectionStatus: 'disconnected' as const },
  selectBlock: jest.fn(),
  setSelectedBlock: jest.fn(),
  setHoveredBlock: jest.fn(),
  updateBlockContent: jest.fn(),
  updateBlockStyle: jest.fn(),
  deleteBlock: jest.fn(),
  duplicateBlock: jest.fn(),
  addBlock: jest.fn(),
  reorderBlocks: jest.fn(),
  lockBlock: jest.fn(),
  addBlockNote: jest.fn(),
  updateBlockNote: jest.fn(),
  deleteBlockNote: jest.fn(),
  resolveBlockNote: jest.fn(),
  syncVariables: jest.fn(),
  updateVariable: jest.fn(),
  addVariable: jest.fn(),
  deleteVariable: jest.fn(),
  pushToHistory: jest.fn(),
  undo: jest.fn(),
  redo: jest.fn(),
  autoInsertPageBreak: jest.fn(),
  getBlockEditor: jest.fn().mockReturnValue(null),
  generateClause: jest.fn(),
  setActivePage: jest.fn(),
};

jest.mock('../../../stores/contractBuilderStore', () => ({
  useContractBuilderStore: (selector?: (state: typeof mockStore) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockStore);
    }
    return mockStore;
  },
  __esModule: true,
  default: (selector?: (state: typeof mockStore) => unknown) => {
    if (typeof selector === 'function') {
      return selector(mockStore);
    }
    return mockStore;
  },
}));

// Import components AFTER mocking
import { BlockRenderer } from '../Blocks/BlockRenderer';
import { BlockNotes } from '../Notes/BlockNotes';
import { ContractTypeSelector } from '../ContractTypeSelector';

function createMockDocument() {
  return {
    _id: 'test-doc',
    userId: 'user-1',
    metadata: { name: 'Test', contractType: 'individuell', language: 'de', status: 'draft' as const, version: 1, tags: [] },
    content: {
      blocks: [
        { id: 'b1', type: 'header' as const, order: 0, content: { title: 'Vertragstitel', subtitle: 'Untertitel' }, style: {}, locked: false, aiGenerated: false },
        { id: 'b2', type: 'clause' as const, order: 1, content: { clauseTitle: 'Vertragsgegenstand', body: 'Der Vertrag regelt...' }, style: {}, locked: false, aiGenerated: false },
      ],
      variables: [
        { id: 'v1', name: '{{firma}}', displayName: 'Firma', type: 'text' as const, required: true, linkedBlocks: [] },
      ],
    },
    design: {
      preset: 'executive', primaryColor: '#0B1324', secondaryColor: '#6B7280', accentColor: '#3B82F6',
      textPrimary: '#1a1a1a', textSecondary: '#4a4a4a', textMuted: '#9ca3af',
      backgroundPrimary: '#fff', backgroundSecondary: '#f9fafb', borderColor: '#e5e7eb',
      fontFamily: 'Helvetica', headingFont: 'Helvetica', baseFontSize: 11,
      pageSize: 'A4' as const, orientation: 'portrait' as const,
      marginTop: 25, marginRight: 20, marginBottom: 25, marginLeft: 20,
      showPageNumbers: true, pageNumberPosition: 'bottom-center', showHeaderOnAllPages: false,
    },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

// ============================================
// SETUP
// ============================================

beforeEach(() => {
  uuidCounter = 0;
  jest.clearAllMocks();
  mockStore.document = createMockDocument();
  mockStore.selectedBlockId = null;
});

// ============================================
// BLOCK RENDERER SMOKE TESTS
// ============================================

describe('BlockRenderer - Smoke Tests', () => {
  const blockTypes = [
    { type: 'header' as const, content: { title: 'Titel', subtitle: 'Sub' } },
    { type: 'parties' as const, content: { party1: { role: 'Käufer', name: 'Max', address: 'Berlin' }, party2: { role: 'Verkäufer', name: 'Anna', address: 'München' } } },
    { type: 'preamble' as const, content: { preambleText: 'Zwischen den Parteien...' } },
    { type: 'clause' as const, content: { number: '§1', clauseTitle: 'Vertragsgegenstand', body: 'Dieser Vertrag regelt...' } },
    { type: 'numbered-list' as const, content: { items: ['Punkt 1', 'Punkt 2', 'Punkt 3'] } },
    { type: 'table' as const, content: { headers: ['Spalte A', 'Spalte B'], rows: [['Wert 1', 'Wert 2']] } },
    { type: 'signature' as const, content: { signatureFields: [{ partyIndex: 0, label: 'Käufer', showDate: true }] } },
    { type: 'attachment' as const, content: { attachments: [] } },
    { type: 'date-field' as const, content: { text: 'Datum: {{vertragsdatum}}' } },
    { type: 'divider' as const, content: { style: 'solid' } },
    { type: 'spacer' as const, content: { height: 20 } },
    { type: 'page-break' as const, content: {} },
    { type: 'definitions' as const, content: { definitionsTitle: 'Definitionen', definitions: [{ term: 'API', definition: 'Application Programming Interface' }] } },
    { type: 'notice' as const, content: { noticeType: 'info', noticeTitle: 'Hinweis', noticeText: 'Bitte beachten' } },
    { type: 'custom' as const, content: { text: '<p>Custom HTML</p>' } },
    { type: 'logo' as const, content: { logoUrl: '', altText: 'Logo' } },
  ];

  test.each(blockTypes)('$type Block rendert ohne Crash', ({ type, content }) => {
    const block = {
      id: `test-${type}`,
      type,
      order: 0,
      content,
      style: {},
      locked: false,
      aiGenerated: false,
    };

    const { container } = render(
      <BlockRenderer block={block} isSelected={false} isPreview={false} />
    );
    expect(container).toBeTruthy();
  });

  test.each(blockTypes)('$type Block rendert im Preview-Modus', ({ type, content }) => {
    const block = {
      id: `test-${type}`,
      type,
      order: 0,
      content,
      style: {},
      locked: false,
      aiGenerated: false,
    };

    const { container } = render(
      <BlockRenderer block={block} isSelected={false} isPreview={true} />
    );
    expect(container).toBeTruthy();
  });

  test.each(blockTypes)('$type Block rendert im Selected-Modus', ({ type, content }) => {
    const block = {
      id: `test-${type}`,
      type,
      order: 0,
      content,
      style: {},
      locked: false,
      aiGenerated: false,
    };

    const { container } = render(
      <BlockRenderer block={block} isSelected={true} isPreview={false} />
    );
    expect(container).toBeTruthy();
  });

  test('Block mit allen Style-Optionen rendert korrekt', () => {
    const block = {
      id: 'styled-block',
      type: 'clause' as const,
      order: 0,
      content: { clauseTitle: 'Styled', body: 'Text' },
      style: {
        fontFamily: 'Arial',
        fontSize: 14,
        fontWeight: 700,
        fontStyle: 'italic' as const,
        lineHeight: 1.5,
        textAlign: 'justify' as const,
        textColor: '#333',
        backgroundColor: '#f0f0f0',
        marginTop: 10,
        marginBottom: 10,
        paddingTop: 8,
        paddingRight: 8,
        paddingBottom: 8,
        paddingLeft: 8,
        borderStyle: 'solid' as const,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        shadow: true,
        opacity: 0.9,
      },
      locked: false,
      aiGenerated: false,
    };

    const { container } = render(
      <BlockRenderer block={block} isSelected={false} isPreview={false} />
    );
    expect(container.firstChild).toBeTruthy();
  });

  test('AI-generierter Block rendert', () => {
    const block = {
      id: 'ai-block',
      type: 'clause' as const,
      order: 0,
      content: { clauseTitle: 'KI-Klausel', body: 'Generiert von KI' },
      style: {},
      locked: false,
      aiGenerated: true,
      aiPrompt: 'Erstelle eine Haftungsklausel',
    };

    const { container } = render(
      <BlockRenderer block={block} isSelected={false} isPreview={false} />
    );
    expect(container).toBeTruthy();
  });

  test('Gesperrter Block rendert', () => {
    const block = {
      id: 'locked-block',
      type: 'clause' as const,
      order: 0,
      content: { clauseTitle: 'Gesperrt', body: 'Nicht bearbeitbar' },
      style: {},
      locked: true,
      aiGenerated: false,
    };

    const { container } = render(
      <BlockRenderer block={block} isSelected={true} isPreview={false} />
    );
    expect(container).toBeTruthy();
  });
});

// ============================================
// BLOCK NOTES SMOKE TESTS
// ============================================

describe('BlockNotes - Smoke Tests', () => {
  test('rendert ohne Notizen', () => {
    render(
      <BlockNotes
        blockId="b1"
        notes={[]}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        onResolveNote={jest.fn()}
      />
    );
    expect(screen.getByText('Keine Notizen vorhanden')).toBeTruthy();
  });

  test('rendert mit aktiven Notizen', () => {
    render(
      <BlockNotes
        blockId="b1"
        notes={[
          { id: 'n1', text: 'Erste Notiz', createdAt: new Date(), resolved: false },
          { id: 'n2', text: 'Zweite Notiz', createdAt: new Date(), resolved: false },
        ]}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        onResolveNote={jest.fn()}
      />
    );
    expect(screen.getByText('Erste Notiz')).toBeTruthy();
    expect(screen.getByText('Zweite Notiz')).toBeTruthy();
  });

  test('rendert mit erledigten Notizen', () => {
    render(
      <BlockNotes
        blockId="b1"
        notes={[
          { id: 'n1', text: 'Erledigt', createdAt: new Date(), resolved: true },
        ]}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        onResolveNote={jest.fn()}
      />
    );
    expect(screen.getByText('1 erledigt')).toBeTruthy();
  });

  test('Notiz hinzufügen über Input', async () => {
    const onAddNote = jest.fn();
    const user = userEvent.setup();

    render(
      <BlockNotes
        blockId="b1"
        notes={[]}
        onAddNote={onAddNote}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        onResolveNote={jest.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Notiz hinzufügen...');
    await user.type(input, 'Neue Testnotiz');
    await user.keyboard('{Enter}');

    expect(onAddNote).toHaveBeenCalledWith('b1', 'Neue Testnotiz');
  });

  test('leere Notiz wird nicht hinzugefügt', async () => {
    const onAddNote = jest.fn();
    const user = userEvent.setup();

    render(
      <BlockNotes
        blockId="b1"
        notes={[]}
        onAddNote={onAddNote}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        onResolveNote={jest.fn()}
      />
    );

    const input = screen.getByPlaceholderText('Notiz hinzufügen...');
    await user.type(input, '   ');
    await user.keyboard('{Enter}');

    expect(onAddNote).not.toHaveBeenCalled();
  });

  test('gibt null im Preview-Modus zurück', () => {
    const { container } = render(
      <BlockNotes
        blockId="b1"
        notes={[]}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        onResolveNote={jest.fn()}
        isPreview={true}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  test('Notiz löschen ruft Callback auf', () => {
    const onDeleteNote = jest.fn();

    render(
      <BlockNotes
        blockId="b1"
        notes={[
          { id: 'n1', text: 'Zu löschende Notiz', createdAt: new Date(), resolved: false },
        ]}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={onDeleteNote}
        onResolveNote={jest.fn()}
      />
    );

    const deleteBtn = screen.getByTitle('Löschen');
    fireEvent.click(deleteBtn);
    expect(onDeleteNote).toHaveBeenCalledWith('b1', 'n1');
  });

  test('Notiz als erledigt markieren', () => {
    const onResolveNote = jest.fn();

    render(
      <BlockNotes
        blockId="b1"
        notes={[
          { id: 'n1', text: 'Offene Notiz', createdAt: new Date(), resolved: false },
        ]}
        onAddNote={jest.fn()}
        onUpdateNote={jest.fn()}
        onDeleteNote={jest.fn()}
        onResolveNote={onResolveNote}
      />
    );

    const resolveBtn = screen.getByTitle('Als erledigt markieren');
    fireEvent.click(resolveBtn);
    expect(onResolveNote).toHaveBeenCalledWith('b1', 'n1', true);
  });
});

// ============================================
// CONTRACT TYPE SELECTOR SMOKE TESTS
// ============================================

describe('ContractTypeSelector - Smoke Tests', () => {
  test('rendert nicht wenn isOpen=false', () => {
    const { container } = render(
      <ContractTypeSelector
        isOpen={false}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );
    expect(container.innerHTML).toBe('');
  });

  test('rendert Modal wenn isOpen=true', () => {
    render(
      <ContractTypeSelector
        isOpen={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );
    expect(screen.getByText('Neuen Vertrag erstellen')).toBeTruthy();
    expect(screen.getByPlaceholderText('Vertragstyp suchen...')).toBeTruthy();
  });

  test('onClose wird aufgerufen bei Klick auf X', () => {
    const onClose = jest.fn();
    render(
      <ContractTypeSelector
        isOpen={true}
        onClose={onClose}
        onSelect={jest.fn()}
      />
    );
    const closeBtn = screen.getByLabelText('Vertragstyp-Auswahl schließen');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  test('Suchfeld filtert Templates', async () => {
    const user = userEvent.setup();
    render(
      <ContractTypeSelector
        isOpen={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
      />
    );
    const searchInput = screen.getByPlaceholderText('Vertragstyp suchen...');
    await user.type(searchInput, 'Individuell');
    // Der individuelle Vertrag sollte sichtbar sein
    expect(screen.getByText('Individueller Vertrag')).toBeTruthy();
  });

  test('onSelect wird aufgerufen bei Template-Klick (individuell/Free)', () => {
    const onSelect = jest.fn();
    render(
      <ContractTypeSelector
        isOpen={true}
        onClose={jest.fn()}
        onSelect={onSelect}
        userPlan="free"
      />
    );
    const individualCard = screen.getByText('Individueller Vertrag');
    fireEvent.click(individualCard.closest('button')!);
    expect(onSelect).toHaveBeenCalledWith('individuell');
  });

  test('Upgrade-Modal erscheint für Free-User bei Premium-Template', () => {
    render(
      <ContractTypeSelector
        isOpen={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        userPlan="free"
      />
    );
    // Klicke auf ein Premium-Template (nicht individuell)
    const allButtons = screen.getAllByRole('button');
    // Finde einen Template-Button der nicht "Individueller Vertrag" ist
    const premiumButton = allButtons.find(btn =>
      btn.textContent?.includes('Arbeitsvertrag') ||
      btn.textContent?.includes('Kaufvertrag') ||
      btn.textContent?.includes('Mietvertrag')
    );
    if (premiumButton) {
      fireEvent.click(premiumButton);
      expect(screen.getByText('Premium-Funktion')).toBeTruthy();
    }
  });

  test('rendert Entwürfe-Toggle wenn Drafts vorhanden', () => {
    render(
      <ContractTypeSelector
        isOpen={true}
        onClose={jest.fn()}
        onSelect={jest.fn()}
        savedDrafts={[
          { _id: 'd1', metadata: { name: 'Entwurf 1', contractType: 'individuell', status: 'draft' }, updatedAt: '2024-01-01', blockCount: 5 },
        ]}
      />
    );
    expect(screen.getByText(/Entwürfe/)).toBeTruthy();
  });
});
