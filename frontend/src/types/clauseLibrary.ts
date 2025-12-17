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
