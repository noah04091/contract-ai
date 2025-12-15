/**
 * ContractBuilder Zustand Store
 * State Management für den visuellen Vertragsbaukasten (ContractForge)
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

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
  | 'custom';

export type VariableType = 'text' | 'date' | 'number' | 'currency' | 'select' | 'computed' | 'email' | 'phone' | 'iban';

export interface BlockStyle {
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: number;
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
  // Parties
  party1?: PartyInfo;
  party2?: PartyInfo;
  // Clause
  number?: string;
  clauseTitle?: string;
  body?: string;
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
  // Attachment
  attachmentTitle?: string;
  attachmentDescription?: string;
  // Divider/Spacer
  height?: number;
  style?: string;
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
}

interface ContractBuilderActions {
  // Document Actions
  loadDocument: (id: string) => Promise<void>;
  createDocument: (name: string, contractType?: string, templateId?: string) => Promise<string>;
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

  // Design Actions
  setDesignPreset: (preset: string) => void;
  updateDesign: (design: Partial<DesignConfig>) => void;

  // UI Actions
  setZoom: (zoom: number) => void;
  setView: (view: 'edit' | 'preview' | 'split') => void;
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
};

// ============================================
// API HELPERS
// ============================================

const API_BASE = import.meta.env.VITE_API_URL || '';

async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const response = await fetch(`${API_BASE}/api/contract-builder${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options?.headers,
    },
  });

  if (!response.ok) {
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
          try {
            const data = await apiCall<{ success: boolean; document: ContractDocument }>(`/${id}`);
            set({
              document: data.document,
              isLoading: false,
              hasUnsavedChanges: false,
              history: [data.document],
              historyIndex: 0,
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
            });
            return data.document._id;
          } catch (error) {
            set({ isLoading: false, error: (error as Error).message });
            throw error;
          }
        },

        saveDocument: async () => {
          const { document } = get();
          if (!document) return;

          set({ isSaving: true, error: null });
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

            const newBlock: Block = {
              ...block,
              id: crypto.randomUUID(),
              order: position ?? state.document.content.blocks.length,
              style: block.style || {},
              locked: false,
              aiGenerated: false,
            };

            if (position !== undefined) {
              // Shift existing blocks
              state.document.content.blocks.forEach((b) => {
                if (b.order >= position) b.order++;
              });
            }

            state.document.content.blocks.push(newBlock);
            state.document.content.blocks.sort((a, b) => a.order - b.order);
            state.hasUnsavedChanges = true;
            state.selectedBlockId = newBlock.id;
          });
          get().pushToHistory();
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
            const result = await apiCall<LegalScore>('/ai/legal-score', {
              method: 'POST',
              body: JSON.stringify({ documentId: document._id }),
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
