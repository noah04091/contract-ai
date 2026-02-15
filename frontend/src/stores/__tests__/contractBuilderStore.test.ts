/**
 * ContractBuilder Store - Comprehensive Unit Tests
 * Tests all core actions: blocks, variables, history, design, UI, collaboration
 */

import { act } from '@testing-library/react';

// Mock crypto.randomUUID before importing store
const mockUUID = jest.fn();
let uuidCounter = 0;
mockUUID.mockImplementation(() => `test-uuid-${++uuidCounter}`);
Object.defineProperty(global, 'crypto', {
  value: { randomUUID: mockUUID },
});

// Mock import.meta.env
jest.mock('zustand/middleware', () => {
  const actual = jest.requireActual('zustand/middleware');
  return {
    ...actual,
    persist: (fn: unknown) => fn,
    devtools: (fn: unknown) => fn,
  };
});

import { useContractBuilderStore, ContractDocument, Block, defaultDesign } from '../contractBuilderStore';

// ============================================
// HELPERS
// ============================================

function createTestDocument(overrides?: Partial<ContractDocument>): ContractDocument {
  return {
    _id: 'test-doc-1',
    userId: 'user-1',
    metadata: {
      name: 'Test Vertrag',
      contractType: 'individuell',
      language: 'de',
      status: 'draft',
      version: 1,
      tags: [],
    },
    content: {
      blocks: [],
      variables: [],
    },
    design: { ...defaultDesign },
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

function createTestBlock(overrides?: Partial<Block>): Omit<Block, 'id' | 'order'> {
  return {
    type: 'clause',
    content: {
      clauseTitle: 'Test Klausel',
      body: 'Testinhalt der Klausel.',
    },
    style: {},
    locked: false,
    aiGenerated: false,
    ...overrides,
  };
}

function getStore() {
  return useContractBuilderStore.getState();
}

// ============================================
// SETUP / TEARDOWN
// ============================================

beforeEach(() => {
  uuidCounter = 0;
  jest.useFakeTimers();
  act(() => {
    useContractBuilderStore.getState().reset();
  });
  // Flush any pending _isUndoRedoing timeouts from previous tests
  jest.advanceTimersByTime(600);
});

afterEach(() => {
  jest.advanceTimersByTime(600);
  jest.useRealTimers();
});

// ============================================
// DOCUMENT ACTIONS
// ============================================

describe('ContractBuilder Store', () => {
  describe('Document Actions', () => {
    test('setDocument setzt Dokument und markiert als gespeichert', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
      });
      expect(getStore().document).toEqual(doc);
      expect(getStore().hasUnsavedChanges).toBe(false);
    });

    test('updateMetadata aktualisiert Metadaten und markiert Änderungen', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().updateMetadata({ name: 'Neuer Name', status: 'review' });
      });
      expect(getStore().document!.metadata.name).toBe('Neuer Name');
      expect(getStore().document!.metadata.status).toBe('review');
      expect(getStore().hasUnsavedChanges).toBe(true);
    });

    test('updateMetadata ohne Dokument ist no-op', () => {
      act(() => {
        getStore().updateMetadata({ name: 'Ignored' });
      });
      expect(getStore().document).toBeNull();
    });

    test('reset setzt alle State-Werte zurück', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().setZoom(150);
        getStore().setView('preview');
        getStore().reset();
      });
      expect(getStore().document).toBeNull();
      expect(getStore().zoom).toBe(100);
      expect(getStore().view).toBe('edit');
    });
  });

  // ============================================
  // BLOCK ACTIONS
  // ============================================

  describe('Block Actions', () => {
    test('addBlock fügt Block am Ende hinzu', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().addBlock(createTestBlock());
      });
      const blocks = getStore().document!.content.blocks;
      expect(blocks).toHaveLength(1);
      expect(blocks[0].type).toBe('clause');
      expect(blocks[0].content.clauseTitle).toBe('Test Klausel');
      expect(blocks[0].id).toBeTruthy();
    });

    test('addBlock an expliziter Position', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'header', order: 0, content: { title: 'Titel' }, style: {}, locked: false, aiGenerated: false },
            { id: 'b2', type: 'signature', order: 1, content: {}, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().addBlock(createTestBlock(), 1);
      });
      const blocks = getStore().document!.content.blocks;
      expect(blocks).toHaveLength(3);
      expect(blocks[0].id).toBe('b1');
      expect(blocks[1].type).toBe('clause'); // Neuer Block
      expect(blocks[2].id).toBe('b2');
    });

    test('addBlock selektiert den neuen Block', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().addBlock(createTestBlock());
      });
      expect(getStore().selectedBlockId).toBe(getStore().document!.content.blocks[0].id);
    });

    test('addBlock setzt hasUnsavedChanges', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().addBlock(createTestBlock());
      });
      expect(getStore().hasUnsavedChanges).toBe(true);
    });

    test('addBlock ohne Dokument ist no-op', () => {
      act(() => {
        getStore().addBlock(createTestBlock());
      });
      expect(getStore().document).toBeNull();
    });

    test('deleteBlock entfernt Block und reorganisiert Order', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'header', order: 0, content: {}, style: {}, locked: false, aiGenerated: false },
            { id: 'b2', type: 'clause', order: 1, content: {}, style: {}, locked: false, aiGenerated: false },
            { id: 'b3', type: 'signature', order: 2, content: {}, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().deleteBlock('b2');
      });
      const blocks = getStore().document!.content.blocks;
      expect(blocks).toHaveLength(2);
      expect(blocks[0].id).toBe('b1');
      expect(blocks[0].order).toBe(0);
      expect(blocks[1].id).toBe('b3');
      expect(blocks[1].order).toBe(1);
    });

    test('deleteBlock deselektiert gelöschten Block', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: {}, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().selectBlock('b1');
        getStore().deleteBlock('b1');
      });
      expect(getStore().selectedBlockId).toBeNull();
    });

    test('deleteBlock mit nicht-existierender ID ist no-op', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: {}, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().deleteBlock('nonexistent');
      });
      expect(getStore().document!.content.blocks).toHaveLength(1);
    });

    test('duplicateBlock erstellt Kopie nach dem Original', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: { clauseTitle: 'Original' }, style: { fontSize: 14 }, locked: false, aiGenerated: false },
            { id: 'b2', type: 'signature', order: 1, content: {}, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().duplicateBlock('b1');
      });
      const blocks = getStore().document!.content.blocks;
      expect(blocks).toHaveLength(3);
      expect(blocks[0].id).toBe('b1');
      expect(blocks[1].content.clauseTitle).toBe('Original');
      expect(blocks[1].style.fontSize).toBe(14);
      expect(blocks[1].id).not.toBe('b1'); // Neue ID
      expect(blocks[2].id).toBe('b2');
    });

    test('duplicateBlock selektiert die Kopie', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: {}, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().duplicateBlock('b1');
      });
      const blocks = getStore().document!.content.blocks;
      expect(getStore().selectedBlockId).toBe(blocks[1].id);
    });

    test('reorderBlocks verschiebt Block korrekt', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'header', order: 0, content: {}, style: {}, locked: false, aiGenerated: false },
            { id: 'b2', type: 'clause', order: 1, content: {}, style: {}, locked: false, aiGenerated: false },
            { id: 'b3', type: 'signature', order: 2, content: {}, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().reorderBlocks(2, 0); // Signatur nach ganz oben
      });
      const blocks = getStore().document!.content.blocks;
      expect(blocks[0].id).toBe('b3');
      expect(blocks[1].id).toBe('b1');
      expect(blocks[2].id).toBe('b2');
      expect(blocks[0].order).toBe(0);
      expect(blocks[1].order).toBe(1);
      expect(blocks[2].order).toBe(2);
    });

    test('updateBlockContent aktualisiert Content', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: { clauseTitle: 'Alt', body: 'Alter Text' }, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().updateBlockContent('b1', { body: 'Neuer Text' });
      });
      expect(getStore().document!.content.blocks[0].content.body).toBe('Neuer Text');
      expect(getStore().document!.content.blocks[0].content.clauseTitle).toBe('Alt'); // Unverändert
    });

    test('updateBlockStyle aktualisiert Style', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: {}, style: { fontSize: 12 }, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().updateBlockStyle('b1', { fontWeight: 700, textColor: '#ff0000' });
      });
      const style = getStore().document!.content.blocks[0].style;
      expect(style.fontSize).toBe(12); // Unverändert
      expect(style.fontWeight).toBe(700);
      expect(style.textColor).toBe('#ff0000');
    });

    test('lockBlock sperrt/entsperrt Block', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: {}, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().lockBlock('b1', true);
      });
      expect(getStore().document!.content.blocks[0].locked).toBe(true);
      act(() => {
        getStore().lockBlock('b1', false);
      });
      expect(getStore().document!.content.blocks[0].locked).toBe(false);
    });

    test('applyStyleToAllOfType wendet Style auf gleiche Block-Typen an', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: {}, style: { fontSize: 16, textColor: '#000' }, locked: false, aiGenerated: false },
            { id: 'b2', type: 'clause', order: 1, content: {}, style: { fontSize: 12 }, locked: false, aiGenerated: false },
            { id: 'b3', type: 'header', order: 2, content: {}, style: { fontSize: 10 }, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().applyStyleToAllOfType('b1');
      });
      const blocks = getStore().document!.content.blocks;
      expect(blocks[1].style.fontSize).toBe(16); // Clause b2 → Style von b1
      expect(blocks[1].style.textColor).toBe('#000');
      expect(blocks[2].style.fontSize).toBe(10); // Header b3 → unverändert
    });
  });

  // ============================================
  // BLOCK NOTES
  // ============================================

  describe('Block Notes', () => {
    test('addBlockNote fügt Notiz hinzu', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: {}, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().addBlockNote('b1', 'Bitte prüfen', 'Max');
      });
      const notes = getStore().document!.content.blocks[0].notes!;
      expect(notes).toHaveLength(1);
      expect(notes[0].text).toBe('Bitte prüfen');
      expect(notes[0].author).toBe('Max');
      expect(notes[0].resolved).toBe(false);
    });

    test('updateBlockNote ändert Notiz-Text', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            {
              id: 'b1', type: 'clause', order: 0, content: {}, style: {}, locked: false, aiGenerated: false,
              notes: [{ id: 'n1', text: 'Alt', createdAt: new Date(), resolved: false }],
            },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().updateBlockNote('b1', 'n1', 'Aktualisiert');
      });
      expect(getStore().document!.content.blocks[0].notes![0].text).toBe('Aktualisiert');
    });

    test('deleteBlockNote entfernt Notiz', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            {
              id: 'b1', type: 'clause', order: 0, content: {}, style: {}, locked: false, aiGenerated: false,
              notes: [
                { id: 'n1', text: 'Notiz 1', createdAt: new Date(), resolved: false },
                { id: 'n2', text: 'Notiz 2', createdAt: new Date(), resolved: false },
              ],
            },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().deleteBlockNote('b1', 'n1');
      });
      const notes = getStore().document!.content.blocks[0].notes!;
      expect(notes).toHaveLength(1);
      expect(notes[0].id).toBe('n2');
    });

    test('resolveBlockNote markiert Notiz als erledigt', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            {
              id: 'b1', type: 'clause', order: 0, content: {}, style: {}, locked: false, aiGenerated: false,
              notes: [{ id: 'n1', text: 'Zu prüfen', createdAt: new Date(), resolved: false }],
            },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().resolveBlockNote('b1', 'n1', true);
      });
      expect(getStore().document!.content.blocks[0].notes![0].resolved).toBe(true);
      // Wieder öffnen
      act(() => {
        getStore().resolveBlockNote('b1', 'n1', false);
      });
      expect(getStore().document!.content.blocks[0].notes![0].resolved).toBe(false);
    });
  });

  // ============================================
  // VARIABLE ACTIONS
  // ============================================

  describe('Variable Actions', () => {
    test('addVariable fügt Variable hinzu', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().addVariable({
          name: '{{firmenname}}',
          displayName: 'Firmenname',
          type: 'text',
          required: true,
          linkedBlocks: [],
        });
      });
      const vars = getStore().document!.content.variables;
      expect(vars).toHaveLength(1);
      expect(vars[0].name).toBe('{{firmenname}}');
      expect(vars[0].displayName).toBe('Firmenname');
      expect(vars[0].id).toBeTruthy();
    });

    test('updateVariable setzt Variablen-Wert', () => {
      const doc = createTestDocument({
        content: {
          blocks: [],
          variables: [
            { id: 'v1', name: '{{name}}', displayName: 'Name', type: 'text', required: true, linkedBlocks: [] },
          ],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().updateVariable('v1', 'Max Mustermann');
      });
      expect(getStore().document!.content.variables[0].value).toBe('Max Mustermann');
    });

    test('deleteVariable entfernt Variable', () => {
      const doc = createTestDocument({
        content: {
          blocks: [],
          variables: [
            { id: 'v1', name: '{{name}}', displayName: 'Name', type: 'text', required: true, linkedBlocks: [] },
            { id: 'v2', name: '{{email}}', displayName: 'E-Mail', type: 'email', required: false, linkedBlocks: [] },
          ],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().deleteVariable('v1');
      });
      const vars = getStore().document!.content.variables;
      expect(vars).toHaveLength(1);
      expect(vars[0].id).toBe('v2');
    });

    test('syncVariables extrahiert Variablen aus Block-Text', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            {
              id: 'b1', type: 'clause', order: 0,
              content: { body: 'Der Auftragnehmer {{auftragnehmer_name}} liefert an {{auftraggeber_name}}.' },
              style: {}, locked: false, aiGenerated: false,
            },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().syncVariables();
      });
      const vars = getStore().document!.content.variables;
      expect(vars).toHaveLength(2);
      expect(vars.map(v => v.name)).toContain('{{auftragnehmer_name}}');
      expect(vars.map(v => v.name)).toContain('{{auftraggeber_name}}');
    });

    test('syncVariables behält bestehende Werte', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            {
              id: 'b1', type: 'clause', order: 0,
              content: { body: 'Herr {{kunde_name}} zahlt {{preis_betrag}}.' },
              style: {}, locked: false, aiGenerated: false,
            },
          ],
          variables: [
            { id: 'v1', name: '{{kunde_name}}', displayName: 'Kunde Name', type: 'text', value: 'Max Müller', required: true, linkedBlocks: [] },
          ],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().syncVariables();
      });
      const vars = getStore().document!.content.variables;
      expect(vars).toHaveLength(2);
      const kundeVar = vars.find(v => v.name === '{{kunde_name}}');
      expect(kundeVar!.value).toBe('Max Müller'); // Wert erhalten
    });

    test('syncVariables erkennt Variablen-Typ aus Namen', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            {
              id: 'b1', type: 'clause', order: 0,
              content: { body: '{{start_datum}} - {{gesamt_preis}} - {{kontakt_email}} - {{telefon_nr}} - {{bank_iban}}' },
              style: {}, locked: false, aiGenerated: false,
            },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().syncVariables();
      });
      const vars = getStore().document!.content.variables;
      expect(vars.find(v => v.name === '{{start_datum}}')!.type).toBe('date');
      expect(vars.find(v => v.name === '{{gesamt_preis}}')!.type).toBe('currency');
      expect(vars.find(v => v.name === '{{kontakt_email}}')!.type).toBe('email');
      expect(vars.find(v => v.name === '{{telefon_nr}}')!.type).toBe('phone');
      expect(vars.find(v => v.name === '{{bank_iban}}')!.type).toBe('iban');
    });

    test('syncVariables extrahiert Variablen aus verschachtelten Feldern', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            {
              id: 'b1', type: 'parties', order: 0,
              content: {
                party1: { role: 'Käufer', name: '{{kaeufer_name}}', address: '{{kaeufer_adresse}}' },
                party2: { role: 'Verkäufer', name: '{{verkaeufer_name}}', address: '{{verkaeufer_adresse}}' },
              },
              style: {}, locked: false, aiGenerated: false,
            },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().syncVariables();
      });
      const vars = getStore().document!.content.variables;
      expect(vars).toHaveLength(4);
    });

    test('syncVariables behält manuell erstellte Variablen', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: { body: 'Text ohne Variable' }, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [
            { id: 'v-manual', name: '{{custom_field}}', displayName: 'Custom', type: 'text', required: false, linkedBlocks: [] },
          ],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().syncVariables();
      });
      const vars = getStore().document!.content.variables;
      expect(vars).toHaveLength(1);
      expect(vars[0].name).toBe('{{custom_field}}');
    });
  });

  // ============================================
  // HISTORY (UNDO/REDO)
  // ============================================

  describe('History (Undo/Redo)', () => {
    test('pushToHistory erstellt History-Eintrag', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().pushToHistory();
      });
      expect(getStore().history).toHaveLength(1);
      expect(getStore().historyIndex).toBe(0);
    });

    test('undo stellt vorherigen State wieder her', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: { body: 'Original' }, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().pushToHistory(); // State 0: Original
      });
      act(() => {
        getStore().updateBlockContent('b1', { body: 'Geändert' }); // pushToHistory called internally
      });
      expect(getStore().document!.content.blocks[0].content.body).toBe('Geändert');

      act(() => {
        getStore().undo();
      });
      jest.advanceTimersByTime(600);
      expect(getStore().document!.content.blocks[0].content.body).toBe('Original');
      expect(getStore().canUndo).toBe(false);
      expect(getStore().canRedo).toBe(true);
    });

    test('redo stellt nächsten State wieder her', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: { body: 'Original' }, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().pushToHistory();
      });
      act(() => {
        getStore().updateBlockContent('b1', { body: 'Geändert' });
      });
      act(() => {
        getStore().undo();
      });
      jest.advanceTimersByTime(600); // Wait for _isUndoRedoing to reset
      act(() => {
        getStore().redo();
      });
      jest.advanceTimersByTime(600);
      expect(getStore().document!.content.blocks[0].content.body).toBe('Geändert');
      expect(getStore().canUndo).toBe(true);
      expect(getStore().canRedo).toBe(false);
    });

    test('undo am Anfang ist no-op', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().pushToHistory(); // historyIndex = 0
        getStore().undo(); // can't go below 0
      });
      expect(getStore().historyIndex).toBe(0);
      expect(getStore().canUndo).toBe(false);
    });

    test('redo am Ende ist no-op', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().pushToHistory(); // historyIndex = 0
      });
      const indexBefore = getStore().historyIndex;
      act(() => {
        getStore().redo(); // already at end, should stay
      });
      expect(getStore().historyIndex).toBe(indexBefore);
      expect(getStore().canRedo).toBe(false);
    });

    test('neue Aktion nach Undo löscht Redo-History', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: { body: 'V1' }, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().pushToHistory(); // V1
      });
      act(() => {
        getStore().updateBlockContent('b1', { body: 'V2' }); // pushes V2
      });
      act(() => {
        getStore().updateBlockContent('b1', { body: 'V3' }); // pushes V3
      });
      act(() => {
        getStore().undo(); // back to V2
      });
      jest.advanceTimersByTime(600);
      act(() => {
        getStore().undo(); // back to V1
      });
      jest.advanceTimersByTime(600);
      act(() => {
        getStore().updateBlockContent('b1', { body: 'V4' }); // V3 gone, now V1 -> V4
      });
      expect(getStore().canRedo).toBe(false);
    });

    test('History begrenzt auf 50 Einträge', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: { body: 'Start' }, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        for (let i = 0; i < 60; i++) {
          getStore().pushToHistory();
        }
      });
      expect(getStore().history.length).toBeLessThanOrEqual(50);
    });
  });

  // ============================================
  // DESIGN ACTIONS
  // ============================================

  describe('Design Actions', () => {
    test('setDesignPreset ändert Farben', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().setDesignPreset('modern');
      });
      const design = getStore().document!.design;
      expect(design.preset).toBe('modern');
      expect(design.primaryColor).toBe('#3B82F6');
      expect(design.accentColor).toBe('#10B981');
    });

    test('setDesignPreset mit unbekanntem Preset ändert nur Name', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().setDesignPreset('nonexistent');
      });
      expect(getStore().document!.design.preset).toBe('nonexistent');
      // Farben bleiben auf vorherigen Werten
    });

    test('updateDesign aktualisiert einzelne Felder', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().updateDesign({ fontFamily: 'Arial', baseFontSize: 14 });
      });
      expect(getStore().document!.design.fontFamily).toBe('Arial');
      expect(getStore().document!.design.baseFontSize).toBe(14);
      expect(getStore().document!.design.pageSize).toBe('A4'); // Unverändert
    });

    test('alle 6 Presets haben gültige Farben', () => {
      const doc = createTestDocument();
      const presets = ['executive', 'modern', 'minimal', 'elegant', 'corporate', 'professional'];
      for (const preset of presets) {
        act(() => {
          getStore().setDocument(doc);
          getStore().setDesignPreset(preset);
        });
        const design = getStore().document!.design;
        expect(design.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(design.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });

  // ============================================
  // UI ACTIONS
  // ============================================

  describe('UI Actions', () => {
    test('setZoom klemmt auf 50-200', () => {
      act(() => { getStore().setZoom(30); });
      expect(getStore().zoom).toBe(50);
      act(() => { getStore().setZoom(250); });
      expect(getStore().zoom).toBe(200);
      act(() => { getStore().setZoom(120); });
      expect(getStore().zoom).toBe(120);
    });

    test('setView wechselt Ansicht', () => {
      act(() => { getStore().setView('preview'); });
      expect(getStore().view).toBe('preview');
      act(() => { getStore().setView('split'); });
      expect(getStore().view).toBe('split');
      act(() => { getStore().setView('edit'); });
      expect(getStore().view).toBe('edit');
    });

    test('toggleSidebarLeft schaltet um', () => {
      expect(getStore().sidebarLeft).toBe(true); // Default
      act(() => { getStore().toggleSidebarLeft(); });
      expect(getStore().sidebarLeft).toBe(false);
      act(() => { getStore().toggleSidebarLeft(); });
      expect(getStore().sidebarLeft).toBe(true);
    });

    test('toggleSidebarRight schaltet um', () => {
      expect(getStore().sidebarRight).toBe(true);
      act(() => { getStore().toggleSidebarRight(); });
      expect(getStore().sidebarRight).toBe(false);
    });

    test('toggleVariablesBar schaltet um', () => {
      expect(getStore().variablesBar).toBe(true);
      act(() => { getStore().toggleVariablesBar(); });
      expect(getStore().variablesBar).toBe(false);
    });

    test('selectBlock und setSelectedVariable', () => {
      act(() => { getStore().selectBlock('block-123'); });
      expect(getStore().selectedBlockId).toBe('block-123');
      act(() => { getStore().selectBlock(null); });
      expect(getStore().selectedBlockId).toBeNull();

      act(() => { getStore().setSelectedVariable('var-1'); });
      expect(getStore().selectedVariableId).toBe('var-1');
    });

    test('setActivePage setzt aktive Seite', () => {
      act(() => { getStore().setActivePage(3); });
      expect(getStore().activePageIndex).toBe(3);
    });
  });

  // ============================================
  // DRAG & DROP
  // ============================================

  describe('Drag & Drop', () => {
    test('startDrag/endDrag Lifecycle', () => {
      act(() => {
        getStore().startDrag({ id: 'b1', type: 'clause', isNew: false });
      });
      expect(getStore().isDragging).toBe(true);
      expect(getStore().draggedItem!.id).toBe('b1');

      act(() => {
        getStore().updateDropTarget({ index: 2, position: 'after' });
      });
      expect(getStore().dropTarget!.index).toBe(2);

      act(() => {
        getStore().endDrag();
      });
      expect(getStore().isDragging).toBe(false);
      expect(getStore().draggedItem).toBeNull();
      expect(getStore().dropTarget).toBeNull();
    });
  });

  // ============================================
  // COLLABORATION
  // ============================================

  describe('Collaboration', () => {
    test('enableCollaboration/disableCollaboration', () => {
      act(() => {
        getStore().enableCollaboration('session-1', 'user-1');
      });
      expect(getStore().collaboration.isEnabled).toBe(true);
      expect(getStore().collaboration.sessionId).toBe('session-1');
      expect(getStore().collaboration.myId).toBe('user-1');

      act(() => {
        getStore().disableCollaboration();
      });
      expect(getStore().collaboration.isEnabled).toBe(false);
      expect(getStore().collaboration.sessionId).toBeNull();
    });

    test('updateCollaborator fügt neuen Collaborator hinzu', () => {
      act(() => {
        getStore().enableCollaboration('s1', 'me');
        getStore().updateCollaborator({
          id: 'other-user',
          name: 'Anna',
          email: 'anna@test.de',
          color: '#ff0000',
          isOnline: true,
          lastSeen: new Date(),
        });
      });
      expect(getStore().collaboration.collaborators).toHaveLength(1);
      expect(getStore().collaboration.collaborators[0].name).toBe('Anna');
    });

    test('updateCollaborator aktualisiert bestehenden', () => {
      act(() => {
        getStore().enableCollaboration('s1', 'me');
        getStore().updateCollaborator({
          id: 'user-2', name: 'Anna', email: 'anna@test.de',
          color: '#ff0000', isOnline: true, lastSeen: new Date(),
        });
        getStore().updateCollaborator({
          id: 'user-2', name: 'Anna M.', email: 'anna@test.de',
          color: '#ff0000', isOnline: false, lastSeen: new Date(),
        });
      });
      expect(getStore().collaboration.collaborators).toHaveLength(1);
      expect(getStore().collaboration.collaborators[0].name).toBe('Anna M.');
      expect(getStore().collaboration.collaborators[0].isOnline).toBe(false);
    });

    test('removeCollaborator entfernt User', () => {
      act(() => {
        getStore().enableCollaboration('s1', 'me');
        getStore().updateCollaborator({
          id: 'user-2', name: 'Anna', email: 'anna@test.de',
          color: '#ff0000', isOnline: true, lastSeen: new Date(),
        });
        getStore().removeCollaborator('user-2');
      });
      expect(getStore().collaboration.collaborators).toHaveLength(0);
    });

    test('getBlockEditor findet Editor eines Blocks', () => {
      act(() => {
        getStore().enableCollaboration('s1', 'me');
        getStore().updateCollaborator({
          id: 'other', name: 'Anna', email: 'a@t.de',
          color: '#f00', isOnline: true, lastSeen: new Date(),
          currentBlockId: 'block-5',
        });
      });
      const editor = getStore().getBlockEditor('block-5');
      expect(editor).not.toBeNull();
      expect(editor!.name).toBe('Anna');

      const noEditor = getStore().getBlockEditor('block-99');
      expect(noEditor).toBeNull();
    });

    test('getBlockEditor gibt null wenn Collaboration deaktiviert', () => {
      const editor = getStore().getBlockEditor('block-1');
      expect(editor).toBeNull();
    });
  });

  // ============================================
  // AUTO PAGE BREAK
  // ============================================

  describe('Auto Page Break', () => {
    test('autoInsertPageBreak fügt PageBreak vor Block ein', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: {}, style: {}, locked: false, aiGenerated: false },
            { id: 'b2', type: 'clause', order: 1, content: {}, style: {}, locked: false, aiGenerated: false },
            { id: 'b3', type: 'clause', order: 2, content: {}, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().autoInsertPageBreak('b2');
      });
      const blocks = getStore().document!.content.blocks;
      expect(blocks).toHaveLength(4);
      expect(blocks[1].type).toBe('page-break');
      expect(blocks[2].id).toBe('b2');
    });

    test('autoInsertPageBreak doppelt einfügen wird verhindert', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: {}, style: {}, locked: false, aiGenerated: false },
            { id: 'pb', type: 'page-break', order: 1, content: {}, style: {}, locked: false, aiGenerated: false },
            { id: 'b2', type: 'clause', order: 2, content: {}, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().autoInsertPageBreak('b2'); // Bereits ein PB davor
      });
      expect(getStore().document!.content.blocks).toHaveLength(3); // Keine Änderung
    });
  });

  // ============================================
  // ERROR HANDLING
  // ============================================

  describe('Error Handling', () => {
    test('clearError setzt Fehler zurück', () => {
      act(() => {
        useContractBuilderStore.setState({ error: 'Test-Fehler' });
      });
      expect(getStore().error).toBe('Test-Fehler');
      act(() => {
        getStore().clearError();
      });
      expect(getStore().error).toBeNull();
    });
  });

  // ============================================
  // EDGE CASES
  // ============================================

  describe('Edge Cases', () => {
    test('Operationen ohne Dokument sind sicher (no-ops)', () => {
      // Keine dieser Aktionen sollte einen Fehler werfen
      act(() => {
        getStore().addBlock(createTestBlock());
        getStore().deleteBlock('nonexistent');
        getStore().updateBlockContent('nonexistent', { body: 'x' });
        getStore().updateBlockStyle('nonexistent', { fontSize: 12 });
        getStore().duplicateBlock('nonexistent');
        getStore().reorderBlocks(0, 1);
        getStore().lockBlock('nonexistent', true);
        getStore().addBlockNote('nonexistent', 'test');
        getStore().updateVariable('nonexistent', 'test');
        getStore().deleteVariable('nonexistent');
        getStore().syncVariables();
        getStore().setDesignPreset('modern');
        getStore().updateDesign({ fontFamily: 'Arial' });
        getStore().updateMetadata({ name: 'x' });
        getStore().pushToHistory();
      });
      expect(getStore().document).toBeNull();
    });

    test('syncVariables mit leeren Blöcken produziert keine Variablen', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().syncVariables();
      });
      expect(getStore().document!.content.variables).toHaveLength(0);
    });

    test('syncVariables ignoriert leere Variable-Namen', () => {
      const doc = createTestDocument({
        content: {
          blocks: [
            { id: 'b1', type: 'clause', order: 0, content: { body: '{{}} und {{  }}' }, style: {}, locked: false, aiGenerated: false },
          ],
          variables: [],
        },
      });
      act(() => {
        getStore().setDocument(doc);
        getStore().syncVariables();
      });
      // Leere Namen sollten gefiltert werden
      const vars = getStore().document!.content.variables;
      expect(vars.every(v => v.name.replace(/[{}]/g, '').trim().length > 0)).toBe(true);
    });

    test('mehrere Blöcke gleichzeitig hinzufügen und entfernen', () => {
      const doc = createTestDocument();
      act(() => {
        getStore().setDocument(doc);
        getStore().addBlock(createTestBlock({ type: 'header', content: { title: 'Titel' } }));
        getStore().addBlock(createTestBlock({ type: 'clause', content: { body: 'K1' } }));
        getStore().addBlock(createTestBlock({ type: 'clause', content: { body: 'K2' } }));
        getStore().addBlock(createTestBlock({ type: 'signature', content: {} }));
      });
      expect(getStore().document!.content.blocks).toHaveLength(4);

      // Mittlere Blöcke löschen
      const blocks = getStore().document!.content.blocks;
      act(() => {
        getStore().deleteBlock(blocks[1].id);
        getStore().deleteBlock(getStore().document!.content.blocks[1].id);
      });
      expect(getStore().document!.content.blocks).toHaveLength(2);
      // Order muss durchgängig sein
      getStore().document!.content.blocks.forEach((b, i) => {
        expect(b.order).toBe(i);
      });
    });
  });
});
