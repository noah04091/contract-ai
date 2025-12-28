/**
 * ContractBuilder Zustand Store
 * State Management für den visuellen Vertragsbaukasten (ContractForge)
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { contractTemplates, ContractTemplate } from '../data/contractTemplates';

// ============================================
// TYPES
// ============================================

export type BlockType =
  | 'header'
  | 'parties'
  | 'preamble'
  | 'clause'
  | 'numbered-list'
  | 'table'
  | 'signature'
  | 'attachment'
  | 'date-field'
  | 'divider'
  | 'spacer'
  | 'logo'
  | 'page-break'
  | 'definitions'
  | 'notice'
  | 'custom';

export type VariableType = 'text' | 'date' | 'number' | 'currency' | 'select' | 'computed' | 'email' | 'phone' | 'iban';

export interface BlockStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
  fontStyle?: 'normal' | 'italic';
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  textColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  accentColor?: string;
  marginTop?: number;
  marginBottom?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  borderStyle?: 'none' | 'solid' | 'dashed' | 'dotted';
  borderWidth?: number;
  borderRadius?: number;
  shadow?: boolean;
  highlight?: boolean;
  opacity?: number;
}

export interface PartyInfo {
  role: string;
  name: string;
  address: string;
  taxId?: string;
  email?: string;
  phone?: string;
}

export interface Subclause {
  number: string;
  text: string;
}

export interface BlockContent {
  // Header
  title?: string;
  subtitle?: string;
  logo?: string;
  showDivider?: boolean;         // Trennlinie anzeigen (default: true)
  dividerColor?: string;         // Farbe der Trennlinie
  titleFontSize?: number;        // Separate Schriftgröße für Titel
  subtitleFontSize?: number;     // Separate Schriftgröße für Untertitel
  // Logo Block
  logoUrl?: string;
  altText?: string;
  width?: number;
  alignment?: 'left' | 'center' | 'right';
  // Parties
  party1?: PartyInfo;
  party2?: PartyInfo;
  showPartyIcons?: boolean;      // Icons bei Parteien einblenden (default: false)
  // Signature
  showSignatureIcons?: boolean;  // Icons bei Unterschriften einblenden (default: false)
  // Clause
  number?: string;
  clauseTitle?: string;
  body?: string;
  text?: string;  // Generic text content (Fallback für diverse Block-Typen)
  subclauses?: Subclause[];
  // Table
  headers?: string[];
  rows?: string[][];
  footer?: string;
  // Signature
  signatureFields?: {
    partyIndex: number;
    label: string;
    showDate?: boolean;
    showPlace?: boolean;
  }[];
  witnesses?: number;
  // Preamble
  preambleText?: string;
  // Attachment (Legacy - einzelne Datei, für Abwärtskompatibilität)
  attachmentTitle?: string;
  attachmentDescription?: string;
  attachmentFile?: string;         // Base64 encoded Datei
  attachmentFileName?: string;     // Original-Dateiname
  attachmentFileSize?: number;     // Dateigröße in Bytes
  attachmentFileType?: string;     // MIME-Type (application/pdf, image/jpeg, etc.)
  // Attachments (NEU - mehrere Dateien pro Block)
  attachments?: Array<{
    id: string;                    // Eindeutige ID für jede Anlage
    title: string;                 // z.B. "Anlage 1 - Lebenslauf"
    description: string;           // Beschreibung der Anlage
    file: string;                  // Base64 encoded Datei
    fileName: string;              // Original-Dateiname
    fileSize: number;              // Dateigröße in Bytes
    fileType: string;              // MIME-Type
  }>;
  showFileInfo?: boolean;          // Datei-Info (Name, Größe, Icon) anzeigen (default: true)
  // Divider/Spacer
  height?: number;
  style?: string;
  // Numbered List
  items?: string[];
  listStyle?: 'decimal' | 'alpha' | 'roman';
  // Definitions Block
  definitionsTitle?: string;
  definitions?: { term: string; definition: string }[];
  // Notice/Hinweis Block
  noticeType?: 'info' | 'warning' | 'important' | 'legal';
  noticeTitle?: string;
  noticeText?: string;
  showNoticeIcon?: boolean;
  noticeBorderColor?: string;
  noticeBackgroundColor?: string;
}

export interface Block {
  id: string;
  type: BlockType;
  order: number;
  content: BlockContent;
  style: BlockStyle;
  locked: boolean;
  aiGenerated: boolean;
  aiPrompt?: string;
  legalBasis?: string[];
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface Variable {
  id: string;
  name: string;
  displayName: string;
  type: VariableType;
  value?: string | number | Date;
  defaultValue?: string | number;
  required: boolean;
  validation?: string;
  options?: string[];
  computeFormula?: string;
  linkedBlocks: string[];
  group?: string;
}

export interface DesignConfig {
  preset: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  backgroundPrimary: string;
  backgroundSecondary: string;
  borderColor: string;
  fontFamily: string;
  headingFont: string;
  baseFontSize: number;
  pageSize: 'A4' | 'Letter' | 'Legal';
  orientation: 'portrait' | 'landscape';
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  showPageNumbers: boolean;
  pageNumberPosition: string;
  showHeaderOnAllPages: boolean;
  watermark?: string;
  watermarkOpacity?: number;
}

export interface LegalScore {
  totalScore: number;
  categories: {
    completeness: number;
    legalPrecision: number;
    balance: number;
    clarity: number;
    currentness: number;
    enforceability: number;
  };
  findings: {
    critical: { id: string; message: string; blockId?: string; autoFixAvailable: boolean }[];
    warnings: { id: string; message: string; blockId?: string; autoFixAvailable: boolean }[];
    suggestions: { id: string; message: string; blockId?: string }[];
  };
  lastAnalyzed?: Date;
}

export interface ContractDocument {
  _id: string;
  userId: string;
  metadata: {
    name: string;
    description?: string;
    contractType: string;
    language: string;
    status: 'draft' | 'review' | 'final' | 'signed' | 'archived';
    version: number;
    tags?: string[];
  };
  content: {
    blocks: Block[];
    variables: Variable[];
  };
  design: DesignConfig;
  legalScore?: LegalScore;
  createdAt: string;
  updatedAt: string;
}

// UI State Types
export interface DraggedItem {
  id: string;
  type: BlockType;
  isNew: boolean;
}

export interface DropTarget {
  index: number;
  position: 'before' | 'after';
}

// ============================================
// STORE STATE
// ============================================

interface ContractBuilderState {
  // Document
  document: ContractDocument | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;

  // UI State
  selectedBlockId: string | null;
  selectedVariableId: string | null;
  hoveredBlockId: string | null;
  activePageIndex: number; // Aktive Seite für Block-Einfügung
  zoom: number;
  view: 'edit' | 'preview' | 'split';
  sidebarLeft: boolean;
  sidebarRight: boolean;
  variablesBar: boolean;

  // Drag & Drop
  isDragging: boolean;
  draggedItem: DraggedItem | null;
  dropTarget: DropTarget | null;

  // History (Undo/Redo)
  history: ContractDocument[];
  historyIndex: number;
  canUndo: boolean;
  canRedo: boolean;

  // AI State
  isAiGenerating: boolean;
  aiOperation: string | null;
  copilotSuggestion: {
    text: string;
    type: string;
    confidence: number;
  } | null;

  // Error State
  error: string | null;

  // Local Mode (offline fallback)
  isLocalMode: boolean;
}

interface ContractBuilderActions {
  // Document Actions
  loadDocument: (id: string) => Promise<void>;
  createDocument: (name: string, contractType?: string, templateId?: string) => Promise<string>;
  createDocumentFromTemplate: (templateId: string) => Promise<string>;
  saveDocument: () => Promise<void>;
  setDocument: (doc: ContractDocument) => void;
  updateMetadata: (metadata: Partial<ContractDocument['metadata']>) => void;

  // Block Actions
  addBlock: (block: Omit<Block, 'id' | 'order'>, position?: number) => void;
  updateBlock: (blockId: string, updates: Partial<Block>) => void;
  updateBlockContent: (blockId: string, content: Partial<BlockContent>) => void;
  updateBlockStyle: (blockId: string, style: Partial<BlockStyle>) => void;
  deleteBlock: (blockId: string) => void;
  duplicateBlock: (blockId: string) => void;
  reorderBlocks: (fromIndex: number, toIndex: number) => void;
  lockBlock: (blockId: string, locked: boolean) => void;
  autoInsertPageBreak: (beforeBlockId: string) => void;

  // Selection Actions
  selectBlock: (blockId: string | null) => void;
  setSelectedBlock: (blockId: string | null) => void; // Alias for selectBlock
  setSelectedVariable: (variableId: string | null) => void;
  setHoveredBlock: (blockId: string | null) => void;

  // Drag State (for Canvas)
  setDragState: (state: { isDragging: boolean; draggedBlockId: string | null; dragOverBlockId: string | null }) => void;

  // Variable Actions
  updateVariable: (variableId: string, value: string | number | Date) => void;
  addVariable: (variable: Omit<Variable, 'id'>) => void;
  deleteVariable: (variableId: string) => void;
  syncVariables: () => void;

  // Design Actions
  setDesignPreset: (preset: string) => void;
  updateDesign: (design: Partial<DesignConfig>) => void;

  // UI Actions
  setZoom: (zoom: number) => void;
  setView: (view: 'edit' | 'preview' | 'split') => void;
  setActivePage: (pageIndex: number) => void;
  toggleSidebarLeft: () => void;
  toggleSidebarRight: () => void;
  toggleVariablesBar: () => void;

  // Drag & Drop Actions
  startDrag: (item: DraggedItem) => void;
  updateDropTarget: (target: DropTarget | null) => void;
  endDrag: () => void;

  // History Actions
  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;

  // AI Actions
  generateClause: (description: string, preferences?: object) => Promise<object>;
  optimizeClause: (clauseText: string, goal: string) => Promise<object>;
  getCopilotSuggestion: (text: string, context: object) => Promise<void>;
  clearCopilotSuggestion: () => void;
  calculateLegalScore: () => Promise<void>;

  // Utility Actions
  clearError: () => void;
  reset: () => void;
}

// ============================================
// DEFAULT VALUES
// ============================================

export const defaultDesign: DesignConfig = {
  preset: 'executive',
  primaryColor: '#0B1324',
  secondaryColor: '#6B7280',
  accentColor: '#3B82F6',
  textPrimary: '#1a1a1a',
  textSecondary: '#4a4a4a',
  textMuted: '#9ca3af',
  backgroundPrimary: '#ffffff',
  backgroundSecondary: '#f9fafb',
  borderColor: '#e5e7eb',
  fontFamily: 'Helvetica',
  headingFont: 'Helvetica',
  baseFontSize: 11,
  pageSize: 'A4',
  orientation: 'portrait',
  marginTop: 25,
  marginRight: 20,
  marginBottom: 25,
  marginLeft: 20,
  showPageNumbers: true,
  pageNumberPosition: 'bottom-center',
  showHeaderOnAllPages: false,
};

const initialState: ContractBuilderState = {
  document: null,
  isLoading: false,
  isSaving: false,
  lastSaved: null,
  hasUnsavedChanges: false,
  selectedBlockId: null,
  selectedVariableId: null,
  hoveredBlockId: null,
  activePageIndex: 0,
  zoom: 100,
  view: 'edit',
  sidebarLeft: true,
  sidebarRight: true,
  variablesBar: true,
  isDragging: false,
  draggedItem: null,
  dropTarget: null,
  history: [],
  historyIndex: -1,
  canUndo: false,
  canRedo: false,
  isAiGenerating: false,
  aiOperation: null,
  copilotSuggestion: null,
  error: null,
  isLocalMode: false,
};

// Helper: Variablen aus Text extrahieren ({{variable_name}} Syntax)
function extractVariablesFromText(text: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const variables: string[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const varName = match[1].trim();
    if (!variables.includes(varName)) {
      variables.push(varName);
    }
  }
  return variables;
}

// Helper: Rekursiv alle Strings in einem Wert durchsuchen
function extractVariablesRecursive(value: unknown, allVarNames: string[]): void {
  if (typeof value === 'string') {
    const vars = extractVariablesFromText(value);
    vars.forEach(v => {
      if (!allVarNames.includes(v)) {
        allVarNames.push(v);
      }
    });
  } else if (Array.isArray(value)) {
    // Arrays durchsuchen (z.B. headers, rows, items)
    value.forEach(item => extractVariablesRecursive(item, allVarNames));
  } else if (typeof value === 'object' && value !== null) {
    // Nested objects durchsuchen (z.B. party1, party2, subclauses)
    Object.values(value).forEach(nestedValue => {
      extractVariablesRecursive(nestedValue, allVarNames);
    });
  }
}

// Helper: Variablen aus allen Blöcken extrahieren
function extractVariablesFromBlocks(blocks: Block[]): Variable[] {
  const allVarNames: string[] = [];

  blocks.forEach(block => {
    const content = block.content;
    // Rekursiv alle Felder im Content durchsuchen
    extractVariablesRecursive(content, allVarNames);
  });

  // SICHERHEIT: Leere Namen filtern und Duplikate entfernen
  const validUniqueNames = allVarNames
    .filter(name => name && name.trim().length > 0)  // Leere Namen entfernen
    .filter((name, index, arr) => arr.indexOf(name) === index);  // Duplikate entfernen

  // Variablen-Objekte erstellen
  return validUniqueNames.map(name => {
    // Gruppe basierend auf Variablennamen bestimmen
    let group = 'Allgemein';
    if (name.includes('auftraggeber')) group = 'Auftraggeber';
    else if (name.includes('auftragnehmer')) group = 'Auftragnehmer';
    else if (name.includes('preis') || name.includes('betrag') || name.includes('kosten')) group = 'Finanzen';
    else if (name.includes('datum') || name.includes('frist')) group = 'Termine';

    // Typ basierend auf Variablennamen bestimmen
    let type: VariableType = 'text';
    if (name.includes('datum') || name.includes('date')) type = 'date';
    else if (name.includes('preis') || name.includes('betrag') || name.includes('kosten')) type = 'currency';
    else if (name.includes('email') || name.includes('mail')) type = 'email';
    else if (name.includes('telefon') || name.includes('phone')) type = 'phone';
    else if (name.includes('iban')) type = 'iban';

    // DisplayName generieren (snake_case zu Title Case)
    const displayName = name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      id: `var_${name}`,
      name: `{{${name}}}`,
      displayName,
      type,
      value: undefined,
      required: true,
      linkedBlocks: [],
      group,
    };
  });
}

// Helper: Lokales Dokument erstellen
function createLocalDocument(name: string, contractType: string, template?: ContractTemplate): ContractDocument {
  const now = new Date().toISOString();

  // Wenn Template vorhanden, Blöcke und Variablen aus Template übernehmen
  const blocks: Block[] = [];
  let variables: Variable[] = [];

  if (template && template.id !== 'individuell') {
    // Header Block
    blocks.push({
      id: crypto.randomUUID(),
      type: 'header',
      order: 0,
      content: {
        title: template.name,
        subtitle: `${template.parties.party1.role} & ${template.parties.party2.role}`,
      },
      style: {},
      locked: false,
      aiGenerated: false,
    });

    // Parties Block
    blocks.push({
      id: crypto.randomUUID(),
      type: 'parties',
      order: 1,
      content: {
        party1: {
          role: template.parties.party1.role,
          name: `{{${template.parties.party1.role.toLowerCase().replace(/\s+/g, '_')}_name}}`,
          address: `{{${template.parties.party1.role.toLowerCase().replace(/\s+/g, '_')}_adresse}}`,
        },
        party2: {
          role: template.parties.party2.role,
          name: `{{${template.parties.party2.role.toLowerCase().replace(/\s+/g, '_')}_name}}`,
          address: `{{${template.parties.party2.role.toLowerCase().replace(/\s+/g, '_')}_adresse}}`,
        },
      },
      style: {},
      locked: false,
      aiGenerated: false,
    });

    // Preamble Block
    blocks.push({
      id: crypto.randomUUID(),
      type: 'preamble',
      order: 2,
      content: {
        preambleText: `Zwischen den Parteien wird folgender ${template.name} geschlossen:`,
      },
      style: {},
      locked: false,
      aiGenerated: false,
    });

    // Klauseln aus Template hinzufügen
    template.suggestedClauses.forEach((clause, index) => {
      blocks.push({
        id: crypto.randomUUID(),
        type: 'clause',
        order: 3 + index,
        content: {
          number: 'auto',
          clauseTitle: clause.title,
          body: clause.body,
          subclauses: [],
        },
        style: {},
        locked: false,
        aiGenerated: false,
      });
    });

    // Signatur Block am Ende
    const lastOrder = 3 + template.suggestedClauses.length;
    blocks.push({
      id: crypto.randomUUID(),
      type: 'signature',
      order: lastOrder,
      content: {
        signatureFields: [
          { partyIndex: 0, label: template.parties.party1.role, showDate: true, showPlace: true },
          { partyIndex: 1, label: template.parties.party2.role, showDate: true, showPlace: true },
        ],
      },
      style: {},
      locked: false,
      aiGenerated: false,
    });

    // Variablen aus Template übernehmen
    variables = template.defaultVariables.map(v => ({
      id: `var_${v.name}`,
      name: `{{${v.name}}}`,
      displayName: v.displayName,
      type: v.type as VariableType,
      value: undefined,
      required: v.required || false,
      options: v.options,
      linkedBlocks: [],
      group: v.group,
    }));
  }

  return {
    _id: `local_${crypto.randomUUID()}`,
    userId: 'local',
    metadata: {
      name,
      contractType,
      language: 'de',
      status: 'draft',
      version: 1,
      tags: [],
    },
    content: {
      blocks,
      variables,
    },
    design: defaultDesign,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================
// API HELPERS
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

// Token-Validierung: Prüft ob JWT gültig und nicht abgelaufen ist
function isTokenValid(token: string | null): boolean {
  if (!token) return false;
  try {
    // JWT besteht aus 3 Teilen: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const payload = JSON.parse(atob(parts[1]));
    // exp ist in Sekunden, Date.now() in Millisekunden
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      console.warn('[Auth] Token abgelaufen');
      return false;
    }
    return true;
  } catch (error) {
    console.warn('[Auth] Token ungültig:', error);
    return false;
  }
}

async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  // Token-Fallback: authToken (von Login.tsx) ODER token (legacy)
  const token = localStorage.getItem('authToken') || localStorage.getItem('token');

  // SICHERHEIT: Token validieren bevor API-Call
  if (!isTokenValid(token)) {
    // Token ungültig oder abgelaufen - aufräumen
    localStorage.removeItem('authToken');
    localStorage.removeItem('token');
    throw new Error('Sitzung abgelaufen. Bitte erneut anmelden.');
  }

  const response = await fetch(`${API_BASE}/api/contract-builder${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!response.ok) {
    // Bei 401 auch Token aufräumen
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('token');
      throw new Error('Sitzung abgelaufen. Bitte erneut anmelden.');
    }
    const error = await response.json().catch(() => ({ error: 'Unbekannter Fehler' }));
    throw new Error(error.error || 'API-Fehler');
  }

  return response.json();
}

// ============================================
// STORE
// ============================================

export const useContractBuilderStore = create<ContractBuilderState & ContractBuilderActions>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // ============================================
        // DOCUMENT ACTIONS
        // ============================================

        loadDocument: async (id: string) => {
          set({ isLoading: true, error: null });

          // Lokales Dokument aus localStorage laden
          if (id.startsWith('local_')) {
            try {
              const localDocs = JSON.parse(localStorage.getItem('contractforge_local_docs') || '{}');
              const localDoc = localDocs[id];
              if (localDoc) {
                set({
                  document: localDoc,
                  isLoading: false,
                  hasUnsavedChanges: false,
                  history: [localDoc],
                  historyIndex: 0,
                  isLocalMode: true,
                });
                return;
              }
            } catch (err) {
              console.error('Lokales Laden fehlgeschlagen:', err);
            }
          }

          try {
            const data = await apiCall<{ success: boolean; document: ContractDocument }>(`/${id}`);
            set({
              document: data.document,
              isLoading: false,
              hasUnsavedChanges: false,
              history: [data.document],
              historyIndex: 0,
              isLocalMode: false,
            });
          } catch (error) {
            set({ isLoading: false, error: (error as Error).message });
            throw error;
          }
        },

        createDocument: async (name: string, contractType = 'individuell', templateId?: string) => {
          set({ isLoading: true, error: null });
          try {
            const data = await apiCall<{ success: boolean; document: ContractDocument }>('', {
              method: 'POST',
              body: JSON.stringify({ name, contractType, templateId }),
            });
            set({
              document: data.document,
              isLoading: false,
              hasUnsavedChanges: false,
              history: [data.document],
              historyIndex: 0,
              isLocalMode: false,
            });
            return data.document._id;
          } catch {
            // Fallback: Lokales Dokument erstellen wenn API nicht verfügbar
            console.warn('API nicht verfügbar - erstelle lokales Dokument');
            const localDoc = createLocalDocument(name, contractType);
            set({
              document: localDoc,
              isLoading: false,
              hasUnsavedChanges: false,
              history: [localDoc],
              historyIndex: 0,
              isLocalMode: true,
              error: null,
            });
            return localDoc._id;
          }
        },

        createDocumentFromTemplate: async (templateId: string) => {
          set({ isLoading: true, error: null });

          // Template finden
          const template = contractTemplates.find(t => t.id === templateId);
          if (!template) {
            set({ isLoading: false, error: 'Template nicht gefunden' });
            throw new Error('Template nicht gefunden');
          }

          const name = template.id === 'individuell' ? 'Neuer Vertrag' : `Neuer ${template.name}`;
          const contractType = template.id;

          // Template-Daten in Blöcke und Variablen konvertieren
          const initialBlocks: Block[] = [];
          let initialVariables: Variable[] = [];

          if (template && template.id !== 'individuell') {
            // Header Block - professionelle Defaults
            initialBlocks.push({
              id: crypto.randomUUID(),
              type: 'header',
              order: 0,
              content: {
                title: template.name,
                subtitle: `${template.parties.party1.role} & ${template.parties.party2.role}`,
                showDivider: true,
                dividerColor: '#1a365d', // Dunkelblau - professionell
              },
              style: {
                textAlign: 'center',
                fontSize: 24,
                fontWeight: 700,
                fontFamily: 'Georgia',
                marginBottom: 24,
              },
              locked: false,
              aiGenerated: false,
            });

            // Parties Block
            initialBlocks.push({
              id: crypto.randomUUID(),
              type: 'parties',
              order: 1,
              content: {
                party1: {
                  role: template.parties.party1.role,
                  name: `{{${template.parties.party1.role.toLowerCase().replace(/\s+/g, '_')}_name}}`,
                  address: `{{${template.parties.party1.role.toLowerCase().replace(/\s+/g, '_')}_adresse}}`,
                },
                party2: {
                  role: template.parties.party2.role,
                  name: `{{${template.parties.party2.role.toLowerCase().replace(/\s+/g, '_')}_name}}`,
                  address: `{{${template.parties.party2.role.toLowerCase().replace(/\s+/g, '_')}_adresse}}`,
                },
              },
              style: {
                fontSize: 13,
                lineHeight: 1.5,
              },
              locked: false,
              aiGenerated: false,
            });

            // Preamble Block
            initialBlocks.push({
              id: crypto.randomUUID(),
              type: 'preamble',
              order: 2,
              content: {
                preambleText: `Zwischen den Parteien wird folgender ${template.name} geschlossen:`,
              },
              style: {
                fontSize: 13,
                fontStyle: 'italic',
                textAlign: 'center',
                marginTop: 16,
                marginBottom: 24,
              },
              locked: false,
              aiGenerated: false,
            });

            // Klauseln aus Template hinzufügen - mit professionellen Styles
            template.suggestedClauses.forEach((clause, index) => {
              initialBlocks.push({
                id: crypto.randomUUID(),
                type: 'clause',
                order: 3 + index,
                content: {
                  number: 'auto',
                  clauseTitle: clause.title,
                  body: clause.body,
                  subclauses: [],
                },
                style: {
                  fontSize: 13,
                  lineHeight: 1.6,
                  textAlign: 'justify',
                  marginBottom: 16,
                },
                locked: false,
                aiGenerated: false,
              });
            });

            // Signatur Block am Ende
            const lastOrder = 3 + template.suggestedClauses.length;
            initialBlocks.push({
              id: crypto.randomUUID(),
              type: 'signature',
              order: lastOrder,
              content: {
                signatureFields: [
                  { partyIndex: 0, label: template.parties.party1.role, showDate: true, showPlace: true },
                  { partyIndex: 1, label: template.parties.party2.role, showDate: true, showPlace: true },
                ],
              },
              style: {},
              locked: false,
              aiGenerated: false,
            });

            // Variablen aus Template übernehmen
            initialVariables = template.defaultVariables.map(v => ({
              id: `var_${v.name}`,
              name: `{{${v.name}}}`,
              displayName: v.displayName,
              type: v.type as VariableType,
              value: undefined,
              required: v.required || false,
              options: v.options,
              linkedBlocks: [],
              group: v.group,
            }));
          }

          try {
            // Versuche über API zu erstellen (mit vollständigen Template-Daten)
            const data = await apiCall<{ success: boolean; document: ContractDocument }>('', {
              method: 'POST',
              body: JSON.stringify({
                name,
                contractType,
                initialBlocks: initialBlocks.length > 0 ? initialBlocks : undefined,
                initialVariables: initialVariables.length > 0 ? initialVariables : undefined,
              }),
            });
            set({
              document: data.document,
              isLoading: false,
              hasUnsavedChanges: false,
              history: [data.document],
              historyIndex: 0,
              isLocalMode: false,
            });
            console.log('[ContractBuilder] Dokument über API erstellt:', data.document._id);
            return data.document._id;
          } catch (err) {
            // Fallback: Lokales Dokument mit Template erstellen
            console.warn('API nicht verfügbar - erstelle lokales Dokument mit Template:', err);
            const localDoc = createLocalDocument(name, contractType, template);
            set({
              document: localDoc,
              isLoading: false,
              hasUnsavedChanges: false,
              history: [localDoc],
              historyIndex: 0,
              isLocalMode: true,
              error: null,
            });
            return localDoc._id;
          }
        },

        saveDocument: async () => {
          const { document, isLocalMode } = get();
          if (!document) return;

          set({ isSaving: true, error: null });

          // Im lokalen Modus: Speichern in localStorage
          if (isLocalMode || document._id.startsWith('local_')) {
            try {
              const localDocs = JSON.parse(localStorage.getItem('contractforge_local_docs') || '{}');
              localDocs[document._id] = document;
              localStorage.setItem('contractforge_local_docs', JSON.stringify(localDocs));
              set({ isSaving: false, lastSaved: new Date(), hasUnsavedChanges: false });
              console.log('Dokument lokal gespeichert:', document._id);
              return;
            } catch (err) {
              console.error('Lokales Speichern fehlgeschlagen:', err);
            }
          }

          try {
            await apiCall(`/${document._id}`, {
              method: 'PUT',
              body: JSON.stringify({
                metadata: document.metadata,
                content: document.content,
                design: document.design,
              }),
            });
            set({ isSaving: false, lastSaved: new Date(), hasUnsavedChanges: false });
          } catch (error) {
            set({ isSaving: false, error: (error as Error).message });
            throw error;
          }
        },

        setDocument: (doc) => {
          set({ document: doc, hasUnsavedChanges: false });
        },

        updateMetadata: (metadata) => {
          set((state) => {
            if (state.document) {
              state.document.metadata = { ...state.document.metadata, ...metadata };
              state.hasUnsavedChanges = true;
            }
          });
          get().pushToHistory();
        },

        // ============================================
        // BLOCK ACTIONS
        // ============================================

        addBlock: (block, position) => {
          set((state) => {
            if (!state.document) return;

            const blocks = state.document.content.blocks;
            let insertPosition: number;

            if (position !== undefined) {
              // Explizite Position angegeben
              insertPosition = position;
            } else {
              // Position basierend auf aktiver Seite berechnen
              const pageBreakIndices: number[] = [];
              blocks.forEach((b, idx) => {
                if (b.type === 'page-break') {
                  pageBreakIndices.push(idx);
                }
              });

              if (pageBreakIndices.length === 0) {
                // Keine Seitenumbrüche - am Ende einfügen
                insertPosition = blocks.length;
              } else if (state.activePageIndex === 0) {
                // Seite 1: Vor dem ersten PageBreak einfügen
                insertPosition = pageBreakIndices[0];
              } else if (state.activePageIndex >= pageBreakIndices.length) {
                // Letzte Seite: Am Ende einfügen
                insertPosition = blocks.length;
              } else {
                // Mittlere Seite: Vor dem nächsten PageBreak einfügen
                insertPosition = pageBreakIndices[state.activePageIndex];
              }
            }

            const newBlock: Block = {
              ...block,
              id: crypto.randomUUID(),
              order: insertPosition,
              style: block.style || {},
              locked: false,
              aiGenerated: false,
            };

            // Shift existing blocks
            blocks.forEach((b) => {
              if (b.order >= insertPosition) b.order++;
            });

            blocks.push(newBlock);
            blocks.sort((a, b) => a.order - b.order);
            state.hasUnsavedChanges = true;
            state.selectedBlockId = newBlock.id;
          });
          get().pushToHistory();
          // Variablen synchronisieren
          get().syncVariables();
        },

        updateBlock: (blockId, updates) => {
          set((state) => {
            if (!state.document) return;
            const block = state.document.content.blocks.find((b) => b.id === blockId);
            if (block) {
              Object.assign(block, updates);
              state.hasUnsavedChanges = true;
            }
          });
          get().pushToHistory();
        },

        updateBlockContent: (blockId, content) => {
          set((state) => {
            if (!state.document) return;
            const block = state.document.content.blocks.find((b) => b.id === blockId);
            if (block) {
              block.content = { ...block.content, ...content };
              state.hasUnsavedChanges = true;
            }
          });
          get().pushToHistory();
          // Variablen synchronisieren
          get().syncVariables();
        },

        updateBlockStyle: (blockId, style) => {
          set((state) => {
            if (!state.document) return;
            const block = state.document.content.blocks.find((b) => b.id === blockId);
            if (block) {
              block.style = { ...block.style, ...style };
              state.hasUnsavedChanges = true;
            }
          });
          get().pushToHistory();
        },

        deleteBlock: (blockId) => {
          set((state) => {
            if (!state.document) return;
            const index = state.document.content.blocks.findIndex((b) => b.id === blockId);
            if (index !== -1) {
              state.document.content.blocks.splice(index, 1);
              // Reorder
              state.document.content.blocks.forEach((b, i) => {
                b.order = i;
              });
              state.hasUnsavedChanges = true;
              if (state.selectedBlockId === blockId) {
                state.selectedBlockId = null;
              }
            }
          });
          get().pushToHistory();
        },

        duplicateBlock: (blockId) => {
          set((state) => {
            if (!state.document) return;
            const block = state.document.content.blocks.find((b) => b.id === blockId);
            if (block) {
              const newBlock: Block = {
                ...JSON.parse(JSON.stringify(block)),
                id: crypto.randomUUID(),
                order: block.order + 1,
              };
              // Shift existing blocks
              state.document.content.blocks.forEach((b) => {
                if (b.order > block.order) b.order++;
              });
              state.document.content.blocks.push(newBlock);
              state.document.content.blocks.sort((a, b) => a.order - b.order);
              state.hasUnsavedChanges = true;
              state.selectedBlockId = newBlock.id;
            }
          });
          get().pushToHistory();
        },

        reorderBlocks: (fromIndex, toIndex) => {
          set((state) => {
            if (!state.document) return;
            const blocks = state.document.content.blocks;
            const [moved] = blocks.splice(fromIndex, 1);
            blocks.splice(toIndex, 0, moved);
            blocks.forEach((b, i) => {
              b.order = i;
            });
            state.hasUnsavedChanges = true;
          });
          get().pushToHistory();
        },

        lockBlock: (blockId, locked) => {
          set((state) => {
            if (!state.document) return;
            const block = state.document.content.blocks.find((b) => b.id === blockId);
            if (block) {
              block.locked = locked;
              state.hasUnsavedChanges = true;
            }
          });
        },

        autoInsertPageBreak: (beforeBlockId) => {
          set((state) => {
            if (!state.document) return;

            const blocks = state.document.content.blocks;
            const blockIndex = blocks.findIndex((b) => b.id === beforeBlockId);

            if (blockIndex === -1) return;

            // Prüfen ob bereits ein PageBreak direkt davor ist
            if (blockIndex > 0 && blocks[blockIndex - 1].type === 'page-break') {
              return; // Bereits ein PageBreak vorhanden
            }

            // Neuen PageBreak Block erstellen
            const pageBreakBlock: Block = {
              id: crypto.randomUUID(),
              type: 'page-break',
              order: blockIndex,
              content: {},
              style: {},
              locked: false,
              aiGenerated: false,
            };

            // Alle Blöcke ab dieser Position verschieben
            blocks.forEach((b) => {
              if (b.order >= blockIndex) {
                b.order++;
              }
            });

            blocks.push(pageBreakBlock);
            blocks.sort((a, b) => a.order - b.order);

            // Aktive Seite auf die neue Seite setzen
            const pageBreakCount = blocks.filter((b) => b.type === 'page-break').length;
            state.activePageIndex = pageBreakCount;

            state.hasUnsavedChanges = true;
          });
          get().pushToHistory();
        },

        // ============================================
        // SELECTION ACTIONS
        // ============================================

        selectBlock: (blockId) => {
          set({ selectedBlockId: blockId });
        },

        setSelectedBlock: (blockId) => {
          set({ selectedBlockId: blockId });
        },

        setSelectedVariable: (variableId) => {
          set({ selectedVariableId: variableId });
        },

        setHoveredBlock: (blockId) => {
          set({ hoveredBlockId: blockId });
        },

        setDragState: (dragState) => {
          set({
            isDragging: dragState.isDragging,
            draggedItem: dragState.draggedBlockId
              ? { id: dragState.draggedBlockId, type: 'clause' as BlockType, isNew: false }
              : null,
          });
        },

        // ============================================
        // VARIABLE ACTIONS
        // ============================================

        updateVariable: (variableId, value) => {
          set((state) => {
            if (!state.document) return;
            const variable = state.document.content.variables.find((v) => v.id === variableId);
            if (variable) {
              variable.value = value;
              state.hasUnsavedChanges = true;
            }
          });
          get().pushToHistory();
        },

        addVariable: (variable) => {
          set((state) => {
            if (!state.document) return;
            state.document.content.variables.push({
              ...variable,
              id: crypto.randomUUID(),
            });
            state.hasUnsavedChanges = true;
          });
          get().pushToHistory();
        },

        deleteVariable: (variableId) => {
          set((state) => {
            if (!state.document) return;
            const index = state.document.content.variables.findIndex((v) => v.id === variableId);
            if (index !== -1) {
              state.document.content.variables.splice(index, 1);
              state.hasUnsavedChanges = true;
            }
          });
          get().pushToHistory();
        },

        syncVariables: () => {
          set((state) => {
            if (!state.document) return;

            const extractedVars = extractVariablesFromBlocks(state.document.content.blocks);
            const existingVars = state.document.content.variables;

            // PERFORMANCE: Map für O(1) Lookups statt O(n) mit .find()
            const existingMap = new Map(existingVars.map(v => [v.name, v]));

            // Merge: Behalte existierende Werte, füge neue hinzu
            const processedNames = new Set<string>();
            const mergedVars: Variable[] = [];

            extractedVars.forEach(extracted => {
              // O(1) Lookup statt O(n)
              const existing = existingMap.get(extracted.name);
              if (existing) {
                // Behalte die existierende Variable MIT ihrem Wert
                mergedVars.push(existing);
              } else {
                // Neue Variable
                mergedVars.push(extracted);
              }
              processedNames.add(extracted.name);
            });

            // Auch Variablen behalten, die manuell erstellt wurden aber nicht in Blöcken sind
            existingVars.forEach(existing => {
              if (!processedNames.has(existing.name)) {
                mergedVars.push(existing);
              }
            });

            state.document.content.variables = mergedVars;
          });
        },

        // ============================================
        // DESIGN ACTIONS
        // ============================================

        setDesignPreset: (preset) => {
          set((state) => {
            if (!state.document) return;
            // Design-Presets definieren
            const presets: Record<string, Partial<DesignConfig>> = {
              executive: {
                primaryColor: '#0B1324',
                secondaryColor: '#6B7280',
                accentColor: '#D4AF37',
              },
              modern: {
                primaryColor: '#3B82F6',
                secondaryColor: '#64748B',
                accentColor: '#10B981',
              },
              minimal: {
                primaryColor: '#374151',
                secondaryColor: '#9CA3AF',
                accentColor: '#6B7280',
              },
              elegant: {
                primaryColor: '#1F2937',
                secondaryColor: '#6B7280',
                accentColor: '#D4AF37',
              },
              corporate: {
                primaryColor: '#003366',
                secondaryColor: '#4A5568',
                accentColor: '#2B6CB0',
              },
              professional: {
                primaryColor: '#1B4332',
                secondaryColor: '#4A5568',
                accentColor: '#2D6A4F',
              },
            };

            state.document.design = {
              ...state.document.design,
              preset,
              ...(presets[preset] || {}),
            };
            state.hasUnsavedChanges = true;
          });
          get().pushToHistory();
        },

        updateDesign: (design) => {
          set((state) => {
            if (!state.document) return;
            state.document.design = { ...state.document.design, ...design };
            state.hasUnsavedChanges = true;
          });
          get().pushToHistory();
        },

        // ============================================
        // UI ACTIONS
        // ============================================

        setZoom: (zoom) => {
          set({ zoom: Math.max(50, Math.min(200, zoom)) });
        },

        setView: (view) => {
          set({ view });
        },

        setActivePage: (pageIndex) => {
          set({ activePageIndex: pageIndex });
        },

        toggleSidebarLeft: () => {
          set((state) => ({ sidebarLeft: !state.sidebarLeft }));
        },

        toggleSidebarRight: () => {
          set((state) => ({ sidebarRight: !state.sidebarRight }));
        },

        toggleVariablesBar: () => {
          set((state) => ({ variablesBar: !state.variablesBar }));
        },

        // ============================================
        // DRAG & DROP ACTIONS
        // ============================================

        startDrag: (item) => {
          set({ isDragging: true, draggedItem: item });
        },

        updateDropTarget: (target) => {
          set({ dropTarget: target });
        },

        endDrag: () => {
          set({ isDragging: false, draggedItem: null, dropTarget: null });
        },

        // ============================================
        // HISTORY ACTIONS
        // ============================================

        pushToHistory: () => {
          set((state) => {
            if (!state.document) return;
            // Remove future history if we're not at the end
            const newHistory = state.history.slice(0, state.historyIndex + 1);
            newHistory.push(JSON.parse(JSON.stringify(state.document)));
            // Limit history size
            if (newHistory.length > 50) {
              newHistory.shift();
            }
            state.history = newHistory;
            state.historyIndex = newHistory.length - 1;
            state.canUndo = state.historyIndex > 0;
            state.canRedo = false;
          });
        },

        undo: () => {
          set((state) => {
            if (state.historyIndex > 0) {
              state.historyIndex--;
              state.document = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
              state.canUndo = state.historyIndex > 0;
              state.canRedo = true;
              state.hasUnsavedChanges = true;
            }
          });
        },

        redo: () => {
          set((state) => {
            if (state.historyIndex < state.history.length - 1) {
              state.historyIndex++;
              state.document = JSON.parse(JSON.stringify(state.history[state.historyIndex]));
              state.canUndo = true;
              state.canRedo = state.historyIndex < state.history.length - 1;
              state.hasUnsavedChanges = true;
            }
          });
        },

        // ============================================
        // AI ACTIONS
        // ============================================

        generateClause: async (description, preferences = {}) => {
          const { document } = get();
          set({ isAiGenerating: true, aiOperation: 'Klausel generieren' });
          try {
            const result = await apiCall<object>('/ai/clause', {
              method: 'POST',
              body: JSON.stringify({
                description,
                contractType: document?.metadata.contractType,
                existingClauses: document?.content.blocks
                  .filter((b) => b.type === 'clause')
                  .map((b) => b.content.clauseTitle),
                preferences,
              }),
            });
            set({ isAiGenerating: false, aiOperation: null });
            return result;
          } catch (error) {
            set({ isAiGenerating: false, aiOperation: null, error: (error as Error).message });
            throw error;
          }
        },

        optimizeClause: async (clauseText, goal) => {
          set({ isAiGenerating: true, aiOperation: 'Klausel optimieren' });
          try {
            const result = await apiCall<object>('/ai/optimize', {
              method: 'POST',
              body: JSON.stringify({ clauseText, optimizationGoal: goal }),
            });
            set({ isAiGenerating: false, aiOperation: null });
            return result;
          } catch (error) {
            set({ isAiGenerating: false, aiOperation: null, error: (error as Error).message });
            throw error;
          }
        },

        getCopilotSuggestion: async (text, context) => {
          try {
            const result = await apiCall<{ suggestion: string; type: string; confidence: number }>(
              '/ai/copilot',
              {
                method: 'POST',
                body: JSON.stringify({ text, context }),
              }
            );
            set({
              copilotSuggestion: {
                text: result.suggestion,
                type: result.type,
                confidence: result.confidence,
              },
            });
          } catch {
            // Silently fail for copilot
          }
        },

        clearCopilotSuggestion: () => {
          set({ copilotSuggestion: null });
        },

        calculateLegalScore: async () => {
          const { document } = get();
          if (!document) return;

          set({ isAiGenerating: true, aiOperation: 'Legal Score berechnen' });
          try {
            // Send both documentId AND blocks/contractType for fallback (local mode support)
            const result = await apiCall<LegalScore>('/ai/legal-score', {
              method: 'POST',
              body: JSON.stringify({
                documentId: document._id,
                blocks: document.content.blocks,
                contractType: document.metadata?.contractType || 'Allgemeiner Vertrag'
              }),
            });
            set((state) => {
              if (state.document) {
                state.document.legalScore = result;
              }
              state.isAiGenerating = false;
              state.aiOperation = null;
            });
          } catch (error) {
            set({ isAiGenerating: false, aiOperation: null, error: (error as Error).message });
          }
        },

        // ============================================
        // UTILITY ACTIONS
        // ============================================

        clearError: () => {
          set({ error: null });
        },

        reset: () => {
          set(initialState);
        },
      })),
      {
        name: 'contract-builder-storage',
        partialize: (state) => ({
          zoom: state.zoom,
          view: state.view,
          sidebarLeft: state.sidebarLeft,
          sidebarRight: state.sidebarRight,
          variablesBar: state.variablesBar,
        }),
      }
    ),
    { name: 'ContractBuilder' }
  )
);

export default useContractBuilderStore;
