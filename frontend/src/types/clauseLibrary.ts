// 📁 src/types/clauseLibrary.ts
// TypeScript Interfaces für Klausel-Bibliothek

import type { IndustryType } from './legalLens';

/**
 * Kategorien für gespeicherte Klauseln
 */
export type ClauseCategory =
  | 'risky'         // Riskante Klausel (zur Warnung)
  | 'good_practice' // Best Practice (als Vorlage)
  | 'important'     // Wichtig zu beachten
  | 'unusual'       // Ungewöhnliche Formulierung
  | 'standard';     // Standard-Klausel (Referenz)

/**
 * Klauselbereiche/Themen
 */
export type ClauseArea =
  | 'liability'          // Haftung
  | 'termination'        // Kündigung
  | 'payment'            // Zahlung
  | 'confidentiality'    // Vertraulichkeit
  | 'intellectual_property' // Geistiges Eigentum
  | 'warranty'           // Gewährleistung
  | 'force_majeure'      // Höhere Gewalt
  | 'dispute'            // Streitbeilegung
  | 'data_protection'    // Datenschutz
  | 'non_compete'        // Wettbewerbsverbot
  | 'other';             // Sonstiges

/**
 * Ursprüngliche Analyse einer Klausel
 */
export interface OriginalAnalysis {
  riskLevel?: 'low' | 'medium' | 'high';
  riskScore?: number;
  actionLevel?: 'accept' | 'negotiate' | 'reject';
  clauseType?: string;
  mainRisk?: string;
}

/**
 * Gespeicherte Klausel
 */
export interface SavedClause {
  _id: string;
  userId: string;
  title?: string;
  clauseText: string;
  clauseTextHash: string;
  clausePreview: string;
  category: ClauseCategory;
  clauseArea: ClauseArea;
  sourceContractId?: string;
  sourceContractName?: string;
  sourceClauseId?: string;
  originalAnalysis?: OriginalAnalysis;
  userNotes?: string;
  tags: string[];
  keywords: string[];
  industryContext?: IndustryType;
  usageCount: number;
  lastUsedAt?: string;
  savedAt: string;
  updatedAt: string;
}

/**
 * Request zum Speichern einer neuen Klausel
 */
export interface SaveClauseRequest {
  clauseText: string;
  category: ClauseCategory;
  clauseArea?: ClauseArea;
  sourceContractId?: string;
  sourceContractName?: string;
  sourceClauseId?: string;
  originalAnalysis?: OriginalAnalysis;
  userNotes?: string;
  tags?: string[];
  industryContext?: IndustryType;
}

/**
 * Request zum Aktualisieren einer Klausel
 */
export interface UpdateClauseRequest {
  title?: string;
  category?: ClauseCategory;
  clauseArea?: ClauseArea;
  userNotes?: string;
  tags?: string[];
  industryContext?: IndustryType;
}

/**
 * Filter für Klausel-Suche
 */
export interface ClauseLibraryFilters {
  category?: ClauseCategory;
  clauseArea?: ClauseArea;
  tag?: string;
  industryContext?: IndustryType;
  search?: string;
  sortBy?: 'savedAt' | 'usageCount' | 'category';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Pagination Info
 */
export interface PaginationInfo {
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Response für Klausel-Liste
 */
export interface ClauseLibraryResponse {
  success: boolean;
  clauses: SavedClause[];
  pagination: PaginationInfo;
}

/**
 * Tag mit Anzahl
 */
export interface TagWithCount {
  tag: string;
  count: number;
}

/**
 * Statistiken der Bibliothek
 */
export interface ClauseLibraryStatistics {
  total: number;
  risky: number;
  goodPractice: number;
  important: number;
  unusual: number;
  standard: number;
  topTags: TagWithCount[];
}

/**
 * Ähnliche Klausel aus Suche
 */
export interface SimilarClause {
  id: string;
  clausePreview: string;
  category: ClauseCategory;
  clauseArea: ClauseArea;
  savedAt: string;
  similarity: number;
  commonKeywords: string[];
  userNotes?: string;
  tags: string[];
}

/**
 * Response für Ähnlichkeits-Check
 */
export interface SimilarityCheckResponse {
  success: boolean;
  exactMatch: {
    id: string;
    category: ClauseCategory;
    clauseArea: ClauseArea;
    savedAt: string;
    userNotes?: string;
    tags: string[];
  } | null;
  similarClauses: SimilarClause[];
}

/**
 * Response für Batch-Check
 */
export interface BatchCheckResult {
  hasMatch: boolean;
  type?: 'exact' | 'similar';
  savedClause?: {
    id: string;
    category: ClauseCategory;
    clauseArea: ClauseArea;
    similarity?: number;
    userNotes?: string;
  };
}

export interface BatchCheckResponse {
  success: boolean;
  results: Record<string, BatchCheckResult>;
  checkedCount: number;
}

/**
 * Kategorie-Labels für UI
 */
export const CATEGORY_INFO: Record<ClauseCategory, { label: string; color: string; bgColor: string; icon: string }> = {
  risky: {
    label: 'Riskant',
    color: '#dc2626',
    bgColor: '#fef2f2',
    icon: '⚠️'
  },
  good_practice: {
    label: 'Best Practice',
    color: '#16a34a',
    bgColor: '#f0fdf4',
    icon: '✨'
  },
  important: {
    label: 'Wichtig',
    color: '#2563eb',
    bgColor: '#eff6ff',
    icon: '📌'
  },
  unusual: {
    label: 'Ungewöhnlich',
    color: '#d97706',
    bgColor: '#fffbeb',
    icon: '🔍'
  },
  standard: {
    label: 'Standard',
    color: '#64748b',
    bgColor: '#f8fafc',
    icon: '📄'
  }
};

/**
 * Klauselbereich-Labels für UI
 */
export const CLAUSE_AREA_INFO: Record<ClauseArea, { label: string; icon: string }> = {
  liability: { label: 'Haftung', icon: '⚖️' },
  termination: { label: 'Kündigung', icon: '🚪' },
  payment: { label: 'Zahlung', icon: '💰' },
  confidentiality: { label: 'Vertraulichkeit', icon: '🔒' },
  intellectual_property: { label: 'Geistiges Eigentum', icon: '💡' },
  warranty: { label: 'Gewährleistung', icon: '🛡️' },
  force_majeure: { label: 'Höhere Gewalt', icon: '🌊' },
  dispute: { label: 'Streitbeilegung', icon: '🤝' },
  data_protection: { label: 'Datenschutz', icon: '🔐' },
  non_compete: { label: 'Wettbewerbsverbot', icon: '🚫' },
  other: { label: 'Sonstiges', icon: '📋' }
};

// =============================================
// MUSTERKLAUSELN (Template Clauses)
// =============================================

/**
 * Kategorien für Musterklauseln
 */
export type TemplateClauseCategory =
  | 'termination'       // Kündigung
  | 'liability'         // Haftung
  | 'payment'           // Zahlung
  | 'confidentiality'   // Geheimhaltung
  | 'data_protection'   // DSGVO
  | 'warranty'          // Gewährleistung
  | 'penalty'           // Vertragsstrafe
  | 'force_majeure'     // Force Majeure
  | 'jurisdiction'      // Gerichtsstand
  | 'non_compete'       // Wettbewerbsverbot
  | 'retention_of_title'// Eigentumsvorbehalt
  | 'amendments'        // Vertragsänderungen
  | 'severability';     // Salvatorische Klausel

/**
 * Branchen-Tags für Musterklauseln
 */
export type IndustryTag =
  | 'it'
  | 'handel'
  | 'dienstleistung'
  | 'handwerk'
  | 'immobilien'
  | 'gesundheit'
  | 'finanzen'
  | 'produktion'
  | 'allgemein';

/**
 * Risiko-Level für Musterklauseln
 */
export type ClauseRiskLevel = 'neutral' | 'arbeitnehmerfreundlich' | 'arbeitgeberfreundlich';

/**
 * Variation einer Musterklausel
 */
export interface ClauseVariation {
  title: string;
  text: string;
  description: string;
}

/**
 * Musterklausel
 */
export interface TemplateClause {
  id: string;
  title: string;
  clauseText: string;           // Vollständiger deutscher Rechtstext
  category: TemplateClauseCategory;
  riskLevel: ClauseRiskLevel;
  usageContext: string;         // Wann verwenden
  industryTags: IndustryTag[];  // Branchenzuordnung
  legalBasis?: string;          // z.B. "§ 622 BGB"
  warnings?: string[];          // Wichtige Hinweise
  variations?: ClauseVariation[];
}

/**
 * Kategorie-Info für Musterklauseln
 */
export const TEMPLATE_CLAUSE_CATEGORY_INFO: Record<TemplateClauseCategory, { label: string; icon: string }> = {
  termination: { label: 'Kündigung', icon: '🚪' },
  liability: { label: 'Haftung', icon: '⚖️' },
  payment: { label: 'Zahlung', icon: '💰' },
  confidentiality: { label: 'Geheimhaltung', icon: '🔒' },
  data_protection: { label: 'DSGVO', icon: '🔐' },
  warranty: { label: 'Gewährleistung', icon: '🛡️' },
  penalty: { label: 'Vertragsstrafe', icon: '⚡' },
  force_majeure: { label: 'Force Majeure', icon: '🌊' },
  jurisdiction: { label: 'Gerichtsstand', icon: '🏛️' },
  non_compete: { label: 'Wettbewerbsverbot', icon: '🚫' },
  retention_of_title: { label: 'Eigentumsvorbehalt', icon: '🏷️' },
  amendments: { label: 'Vertragsänderungen', icon: '📝' },
  severability: { label: 'Salvatorische Klausel', icon: '🔧' }
};

/**
 * Branchen-Info
 */
export const INDUSTRY_TAG_INFO: Record<IndustryTag, { label: string; icon: string }> = {
  it: { label: 'IT & Software', icon: '💻' },
  handel: { label: 'Handel', icon: '🛒' },
  dienstleistung: { label: 'Dienstleistung', icon: '🤝' },
  handwerk: { label: 'Handwerk', icon: '🔧' },
  immobilien: { label: 'Immobilien', icon: '🏠' },
  gesundheit: { label: 'Gesundheit', icon: '⚕️' },
  finanzen: { label: 'Finanzen', icon: '💳' },
  produktion: { label: 'Produktion', icon: '🏭' },
  allgemein: { label: 'Allgemein', icon: '📄' }
};

/**
 * Risiko-Level-Info
 */
export const RISK_LEVEL_INFO: Record<ClauseRiskLevel, { label: string; color: string; bgColor: string }> = {
  neutral: { label: 'Neutral', color: '#64748b', bgColor: '#f1f5f9' },
  arbeitnehmerfreundlich: { label: 'Arbeitnehmerfreundlich', color: '#16a34a', bgColor: '#f0fdf4' },
  arbeitgeberfreundlich: { label: 'Arbeitgeberfreundlich', color: '#dc2626', bgColor: '#fef2f2' }
};

// =============================================
// RECHTSLEXIKON (Legal Lexicon)
// =============================================

/**
 * Rechtsgebiete für Lexikon-Einträge
 */
export type LegalArea =
  | 'vertragsrecht'
  | 'arbeitsrecht'
  | 'mietrecht'
  | 'dsgvo'
  | 'handelsrecht'
  | 'gesellschaftsrecht'
  | 'allgemein';

/**
 * Rechtslexikon-Eintrag
 */
export interface LegalTerm {
  id: string;
  term: string;                 // Juristischer Begriff
  simpleExplanation: string;    // Laien-Erklärung
  legalDefinition: string;      // Formale Definition
  examples: string[];           // Praxisbeispiele
  relatedTerms: string[];       // Verwandte Begriffe (IDs)
  legalArea: LegalArea;
  legalBasis?: string;          // Gesetzesreferenz
  letterGroup: string;          // A-Z für Navigation
}

/**
 * Rechtsgebiet-Info
 */
export const LEGAL_AREA_INFO: Record<LegalArea, { label: string; icon: string; color: string }> = {
  vertragsrecht: { label: 'Vertragsrecht', icon: '📜', color: '#3b82f6' },
  arbeitsrecht: { label: 'Arbeitsrecht', icon: '💼', color: '#8b5cf6' },
  mietrecht: { label: 'Mietrecht', icon: '🏠', color: '#10b981' },
  dsgvo: { label: 'DSGVO', icon: '🔐', color: '#f59e0b' },
  handelsrecht: { label: 'Handelsrecht', icon: '🏪', color: '#ef4444' },
  gesellschaftsrecht: { label: 'Gesellschaftsrecht', icon: '🏢', color: '#06b6d4' },
  allgemein: { label: 'Allgemein', icon: '⚖️', color: '#64748b' }
};

// =============================================
// KLAUSEL-SAMMLUNGEN (Collections)
// =============================================

/**
 * Typ der Klausel-Quelle innerhalb einer Sammlung
 */
export type CollectionItemType = 'saved' | 'template' | 'lexikon' | 'custom';

/**
 * Aufgeloeste SavedClause-Daten (vom Backend populiert)
 */
export interface ResolvedClauseData {
  title?: string;
  clauseText: string;
  clausePreview: string;
  category: ClauseCategory;
  clauseArea: ClauseArea;
  tags: string[];
  originalAnalysis?: OriginalAnalysis;
  userNotes?: string;
}

/**
 * Einzelner Eintrag in einer Sammlung
 */
export interface CollectionItem {
  _id: string;
  type: CollectionItemType;
  savedClauseId?: string;
  templateClauseId?: string;
  legalTermId?: string;
  customTitle?: string;
  customText?: string;
  notes?: string;
  order: number;
  addedAt: string;
  resolvedClause?: ResolvedClauseData | null;
  _deleted?: boolean;
}

/**
 * Klausel-Sammlung
 */
export interface ClauseCollection {
  _id: string;
  userId: string;
  name: string;
  description?: string;
  icon: string;
  color: string;
  items: CollectionItem[];
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Request zum Erstellen einer Sammlung
 */
export interface CreateCollectionRequest {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

/**
 * Request zum Aktualisieren einer Sammlung
 */
export interface UpdateCollectionRequest {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
}

/**
 * Request zum Hinzufuegen eines Items
 */
export interface AddCollectionItemRequest {
  type: CollectionItemType;
  savedClauseId?: string;
  templateClauseId?: string;
  legalTermId?: string;
  customTitle?: string;
  customText?: string;
  notes?: string;
}
