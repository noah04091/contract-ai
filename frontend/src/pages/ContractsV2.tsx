// 📁 src/pages/Contracts.tsx - JSX FIXED: Motion Button closing tag korrigiert + ANALYSE-ANZEIGE GEFIXT + RESPONSIVE + DUPLIKATSERKENNUNG + S3-INTEGRATION + BATCH-ANALYSE-ANZEIGE + PDF-SCHNELLAKTION MOBILE-FIX + EDIT-SCHNELLAKTION REPARIERT
import { useState, useEffect, useRef, useMemo, useCallback, Fragment } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  FileText, RefreshCw, Upload, CheckCircle, AlertCircle,
  Plus, Clock, Trash2, Eye, Edit, Edit3,
  Search, X, Crown, Users, Loader,
  Lock, Zap, BarChart3, ExternalLink, ArrowRight, Folder, Archive,
  CheckSquare, Square, Mail, Bell, Download,
  FolderPlus,
  FileUp, AlertTriangle, Sparkles, RotateCcw,
  MoreVertical, ChevronUp, ChevronDown, ChevronLeft,
  SlidersHorizontal, // 📱 Mobile Filter Icon
  Star, // ⭐ Favoriten-Icon
  Camera, // 📸 Document Scanner Icon
  Check, // ✅ QuickFact Inline-Edit Save
  Pencil // ✏️ QuickFact Inline-Edit Icon
} from "lucide-react";
import styles from "../styles/ContractsV2.module.css";
import ContractAnalysis from "../components/ContractAnalysisSwitch";
import MultiUploadResultNavigator from "../components/MultiUploadResultNavigator"; // 🆕 29.05.2026: Navigator-View ("X von N") ersetzt Grid-View
import NewContractDetailsModal from "../components/NewContractDetailsModal"; // 🎨 NEW: Professional Contract Details Modal
import UploadSuccessModal from "../components/UploadSuccessModal"; // ✅ NEU: Two-Step Upload Modal
import ContractDetailModal from "../components/ContractDetailModal"; // 🎨 Contract Detail Modal (Signatures)
// FolderBar removed - functionality moved to Enterprise Sidebar
import FolderModal from "../components/FolderModal"; // 📁 Folder Modal
import SmartFoldersModal from "../components/SmartFoldersModal"; // 🤖 Smart Folders Modal
import EmailInboxWidget from "../components/EmailInboxWidget"; // 📧 E-Mail-Upload Feature
import ReminderSettingsModal from "../components/ReminderSettingsModal"; // 🔔 Reminder Settings Modal
import ContractEditModal from "../components/ContractEditModal"; // ✏️ Quick Edit Modal
import ImportantDatesSection from "../components/ImportantDatesSection"; // 📅 KI-extrahierte wichtige Termine
import FristHinweiseSection from "../components/FristHinweiseSection"; // ⏰ Universelle Frist-Regelungen aus Date Hunt
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { apiCall, uploadAndAnalyze, uploadOnly } from "../utils/api"; // ✅ NEU: uploadOnly hinzugefügt
import { useAuth } from "../hooks/useAuth"; // 🏢 Org-Rolle für Rollen-Awareness
import { useToast } from "../context/ToastContext"; // 🔔 Toast-Benachrichtigungen
import { fixUtf8Display } from "../utils/textUtils"; // 🔧 Fix für Umlaut-Encoding
import { useFolders } from "../hooks/useFolders"; // 📁 Folder Hook
import type { FolderType } from "../components/FolderBar"; // 📁 Folder Type
import InlineAnalysisProgress from "../components/InlineAnalysisProgress"; // 🎨 Kompakte Inline-Analyse
import AnalysisOverlay from "../components/AnalysisOverlay"; // 🔍 Premium Analyse-Overlay
import { useCelebrationContext } from "../components/Celebration"; // 🎉 Celebration System
import { SimpleTour } from "../components/Tour"; // 🎯 Simple Tour (zuverlässiger)
import { triggerOnboardingSync, useOnboarding } from "../hooks/useOnboarding"; // 🎓 Onboarding Sync
import { useCalendarStore } from "../stores/calendarStore"; // 📅 Calendar Cache Invalidation
import { useDocumentScanner } from "../hooks/useDocumentScanner";

// PDF.js Worker konfigurieren
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface Contract {
  _id: string;
  userId?: string;
  name: string;
  kuendigung: string;
  expiryDate: string;
  startDate?: string;
  status: string;
  statusOverride?: boolean; // 🔒 true = Status manuell gesetzt → Automatik (Cron + Datums-Logik) lässt ihn in Ruhe
  createdAt: string;
  content?: string;
  isGenerated?: boolean;
  isOptimized?: boolean; // ✅ NEU: Flag für Optimizer-Uploads
  sourceType?: string; // ✅ NEU: "optimizer", "generate", etc.
  optimizations?: Array<{
    category: string;
    summary: string;
    original: string;
    improved: string;
    severity?: string;
    reasoning?: string;
  }>; // ✅ NEU: Optimierungsdaten vom Optimizer
  s3Key?: string; // ✅ NEU: S3-Schlüssel für Cloud-Dateien
  s3Bucket?: string;
  s3Location?: string;
  uploadType?: string;
  needsReupload?: boolean;
  analyzed?: boolean; // ✅ NEU: Flag für Two-Step Upload Flow
  laufzeit?: string;
  contractScore?: number;
  summary?: string;
  legalAssessment?: string;
  suggestions?: string;
  risiken?: string[];
  optimierungen?: string[];
  // 💳 Payment Tracking Fields
  paymentMethod?: string;
  paymentStatus?: 'paid' | 'unpaid';
  paymentAmount?: number;
  paymentFrequency?: string; // deutsche Werte (Monatlich, Jährlich, …) — siehe contractEditableFields.ts
  paymentDate?: string;
  subscriptionStartDate?: string;
  // 📁 Folder Organization
  folderId?: string;
  // ✉️ Digital Signature (NEU)
  signatureStatus?: string;
  signatureEnvelopeId?: string;
  // 🆕 Envelope enrichment data
  envelope?: {
    _id: string;
    signatureStatus: string;
    signersTotal: number;
    signersSigned: number;
    s3KeySealed: string | null;
    completedAt: string | null;
    expiresAt: string | null;
  };
  // 🔔 Reminder Settings
  reminderDays?: number[];
  reminderSettings?: Array<{
    type: 'expiry' | 'cancellation' | 'custom';
    days: number;
    targetDate?: string;
    label?: string;
  }>;
  // 📊 Dynamic Quick Facts (NEU - kontextabhängige Eckdaten)
  quickFacts?: Array<{
    label: string;
    value: string;
    rating: 'good' | 'neutral' | 'bad';
  }>;
  // 📄 Document Category (NEU - für dynamische Anzeige)
  documentCategory?: 'cancellation_confirmation' | 'invoice' | 'active_contract';
  contractType?: string;
  contractTypeLabel?: string; // 🆕 A1 (28.05.2026): deutsche KI-Bezeichnung
  provider?: {
    displayName: string;
    category?: string;
  };
  // 📝 Ausführliches Rechtsgutachten
  detailedLegalOpinion?: string;
  // 📅 Gekündigt zum (für Kündigungsbestätigungen)
  gekuendigtZum?: string;
  // 📅 KI-extrahierte wichtige Termine
  importantDates?: Array<{
    type: string;
    date: string;
    label: string;
    description?: string;
    calculated?: boolean;
    source?: string;
  }>;
  // ⏰ Universelle Frist-Regelungen aus Date Hunt (Kündigung, Widerruf, etc.)
  fristHinweise?: Array<{
    type: string;
    title: string;
    description?: string;
    legalBasis?: string;
    evidence?: string;
  }>;
  // 📊 Analysis Object (für Analyse-Tab Verfügbarkeit)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  analysis?: Record<string, any>;
  // 📡 Legal Pulse (für Analyse-Tab Verfügbarkeit)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  legalPulse?: Record<string, any>;
  // 🔴 Kündigungs-Tracking (aus cancellations.js gesetzt)
  cancellationId?: string;
  cancellationDate?: string;
  cancellationConfirmed?: boolean;
}

// ✅ KORRIGIERT: Interface für Mehrfach-Upload
// ✅ KORRIGIERT: Spezifische Types statt any
interface AnalysisResult {
  success: boolean;
  contractId?: string;
  message?: string;
  duplicate?: boolean;
  existingContract?: Contract; // ✅ NEU: Für Duplikatserkennung
  analysisData?: {
    kuendigung?: string;
    laufzeit?: string;
    expiryDate?: string;
    status?: string;
    risiken?: string[];
    optimierungen?: string[];
  };
}

// ✅ Interface für Upload-Only Response
interface UploadOnlyResult {
  success: boolean;
  duplicate?: boolean;
  contractId: string;
  contract: { _id: string; name: string; uploadedAt: string };
  existingContract?: Contract;
  message?: string;
}

interface UploadFileItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'analyzing' | 'completed' | 'error' | 'duplicate';
  progress: number;
  // 🛡️ Contract-ID aus der Upload-Response → robustes Wiederfinden der Datei für die Analyse.
  // Nötig, weil das Backend kaputte Dateinamen bereinigt (z.B. "$value.pdf" → "Dokument"),
  // wodurch ein Abgleich über den Dateinamen fehlschlägt.
  contractId?: string;
  analyzed?: boolean; // ✅ Wurde analysiert (true) oder nur hochgeladen (false/undefined)?
  result?: AnalysisResult;
  error?: string;
  duplicateInfo?: AnalysisResult;
  // ✅ Bei Duplikat-Reanalyse aus dem Modal heraus auf true gesetzt → uploadAndAnalyze
  // schickt forceReanalyze=true an /api/analyze, damit Backend nicht erneut HTTP 409
  // zurückgibt und das Duplikat-Modal nicht in einer Endlos-Schleife wieder auftaucht.
  forceReanalyze?: boolean;
}

// ✅ User Info Interface
interface UserInfo {
  subscriptionPlan: 'free' | 'business' | 'enterprise';
  isPremium: boolean;
  analysisCount: number;
  analysisLimit: number;
  // 📧 E-Mail-Inbox Feature
  emailInboxAddress?: string | null;
  emailInboxEnabled?: boolean;
  customEmailAlias?: string | null;
}

// ✅ Erweiterte Filter-Typen
type StatusFilter = 'alle' | 'aktiv' | 'bald_ablaufend' | 'abgelaufen' | 'gekündigt' | 'neu' | 'entwurf' | 'optimiert';
type DateFilter = 'alle' | 'heute' | 'woche' | 'monat' | 'quartal' | 'jahr';
type SortOrder = 'neueste' | 'älteste' | 'name_az' | 'name_za'
  | 'status_asc' | 'status_desc'
  | 'qf0_asc' | 'qf0_desc' | 'qf1_asc' | 'qf1_desc'
  // 🆕 Slot-basierte Sortierung (Frontend-side, basiert auf columnSlots[i])
  | 'slot0_asc' | 'slot0_desc'
  | 'slot1_asc' | 'slot1_desc'
  | 'slot2_asc' | 'slot2_desc';
// Welche Sortierungen das Backend versteht — alle anderen werden frontend-sortiert
const isBackendSort = (s: SortOrder): boolean => {
  return s === 'neueste' || s === 'älteste' || s === 'name_az' || s === 'name_za'
    || s === 'status_asc' || s === 'status_desc'
    || s === 'qf0_asc' || s === 'qf0_desc' || s === 'qf1_asc' || s === 'qf1_desc';
};

// ✅ NEU: S3-Integration - Utility-Funktionen direkt in der Komponente

/**
 * ✅ ROBUST: Prüft ob der "Jetzt analysieren" Button gezeigt werden soll
 *
 * REGELN:
 * 1. Generierte Verträge (isGenerated) → NIEMALS analysieren (sind bereits optimal)
 * 2. Optimierte Verträge (isOptimized) → NIEMALS analysieren (sind bereits optimal)
 * 3. Verträge MIT Analysedaten → NICHT zeigen (bereits analysiert)
 * 4. Verträge mit analyzed === true → NICHT zeigen
 * 5. Hochgeladene Verträge OHNE Analyse → ZEIGEN
 */
function shouldShowAnalyzeButton(contract: Contract): boolean {
  // 1. Generierte Verträge NIEMALS analysieren
  if (contract.isGenerated === true) {
    return false;
  }

  // 2. Optimierte Verträge NIEMALS analysieren
  if (contract.isOptimized === true) {
    return false;
  }

  // 3. Prüfe ob bereits Analysedaten vorhanden sind (zuverlässigste Methode)
  const hasAnalysisData = Boolean(
    contract.summary ||
    (contract.contractScore && contract.contractScore > 0) ||
    (contract.risiken && contract.risiken.length > 0) ||
    contract.legalAssessment ||
    contract.suggestions ||
    (contract.quickFacts && contract.quickFacts.length > 0) ||
    contract.detailedLegalOpinion
  );

  // Wenn Analysedaten vorhanden → bereits analysiert → Button nicht zeigen
  if (hasAnalysisData) {
    return false;
  }

  // 4. Wenn explizit als analysiert markiert → Button nicht zeigen
  if (contract.analyzed === true) {
    return false;
  }

  // 5. Alle anderen Fälle: Hochgeladener Vertrag ohne Analyse → Button zeigen
  return true;
}

// Alias für Abwärtskompatibilität (falls irgendwo noch verwendet)
function isContractNotAnalyzed(contract: Contract): boolean {
  return shouldShowAnalyzeButton(contract);
}

// ✅ MOBILE-FIX: PDF-Schnellaktion mit "Temporäres Tab sofort öffnen" Methode (Mobile-freundlich)
export default function Contracts() {
  // ✅ Navigation state handling
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth(); // 🏢 Org-Rolle für Rollen-Awareness
  const toast = useToast(); // 🔔 Toast-Benachrichtigungen
  const { celebrate } = useCelebrationContext(); // 🎉 Celebration System
  const { clearCache: clearCalendarCache } = useCalendarStore(); // 📅 Calendar Cache Invalidation
  const { onboardingState } = useOnboarding(); // 🎓 Onboarding State für Celebration-Checks

  // 🏢 Rollen-Awareness: Berechtigungen basierend auf Org-Rolle
  const orgRole = user?.organization?.orgRole;
  const canEditContract = (contract: Contract) => {
    if (!orgRole) return true; // Kein Org → voller Zugriff auf eigene Verträge
    if (contract.userId && user?._id && contract.userId.toString() === user._id.toString()) return true; // Eigener Vertrag
    return orgRole === 'admin' || orgRole === 'member'; // Org-Vertrag: Admin/Member dürfen bearbeiten
  };
  const canDeleteContract = (contract: Contract) => {
    if (!orgRole) return true; // Kein Org → voller Zugriff
    if (contract.userId && user?._id && contract.userId.toString() === user._id.toString()) return true; // Eigener Vertrag
    return orgRole === 'admin'; // Org-Vertrag: Nur Admin darf löschen
  };

  const [contracts, setContracts] = useState<Contract[]>([]);
  // 🚀 OPTIMIERT: contracts State entfernt - war redundant da Backend bereits filtert
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);
  const [premiumHint, setPremiumHint] = useState<string | null>(null); // 🔔 Premium Upgrade Hint
  const [enterpriseHintDismissed, setEnterpriseHintDismissed] = useState(false); // 🔔 Enterprise Hint wegklickbar
  const [dragActive, setDragActive] = useState(false);
  const [activeSection, setActiveSection] = useState<'upload' | 'contracts' | 'email-upload'>('contracts');
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ BUG FIX 1: Neuer State für Edit-Modal direkt öffnen
  const [openEditModalDirectly, setOpenEditModalDirectly] = useState(false);
  const [modalInitialTab, setModalInitialTab] = useState<'overview' | 'pdf' | 'analysis' | undefined>(undefined);

  // ✏️ NEU: Quick Edit Modal State (öffnet direkt ohne Detail-Ansicht)
  const [quickEditContract, setQuickEditContract] = useState<Contract | null>(null);

  // ⚡ NEU: Schnellanalyse-Modal State (zeigt ausführliche Analyse nach Schnellanalyse)
  // Lazy Initializer: Stellt Modal aus sessionStorage wieder her (Back-Navigation)
  const [quickAnalysisModal, setQuickAnalysisModal] = useState<{
    show: boolean;
    contractName: string;
    contractId: string;
    analysisResult: Record<string, unknown> | null;
  }>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const quickAnalysisId = params.get('quickAnalysis');
      if (quickAnalysisId) {
        const saved = sessionStorage.getItem('contractai_quickAnalysis');
        if (saved) {
          const data = JSON.parse(saved);
          if (data.contractId === quickAnalysisId) {
            return { show: true, contractName: data.contractName, contractId: data.contractId, analysisResult: data.analysisResult };
          }
        }
      }
    } catch { /* sessionStorage unavailable or corrupt — use default */ }
    return { show: false, contractName: '', contractId: '', analysisResult: null };
  });
  
  // ✅ KORRIGIERT: User-Plan States - Free = 3 Analysen!
  const [userInfo, setUserInfo] = useState<UserInfo>({
    subscriptionPlan: 'free',
    isPremium: false,
    analysisCount: 0,
    analysisLimit: 3  // ✅ Free: 3 Analysen laut Preisliste
  });
  const [uploadFiles, setUploadFiles] = useState<UploadFileItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // ✅ NEU: Duplikat-Modal State
  const [duplicateModal, setDuplicateModal] = useState<{
    show: boolean;
    fileItem?: UploadFileItem;
    existingContract?: Contract;
  } | null>(null);

  // ✅ NEU: Legacy-Modal State für alte Verträge
  const [legacyModal, setLegacyModal] = useState<{
    show: boolean;
    contract?: Contract;
    message?: string;
  } | null>(null);

  // ✅ NEU: PDF-Loading State
  const [pdfLoading, setPdfLoading] = useState<{ [contractId: string]: boolean }>({});
  
  // ✅ Erweiterte Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle');
  const [dateFilter, setDateFilter] = useState<DateFilter>('alle');
  const [sortOrder, setSortOrder] = useState<SortOrder>('neueste');
  const [sourceFilter, setSourceFilter] = useState<'alle' | 'generated' | 'optimized'>('alle'); // 🆕 Quelle-Filter
  const [previewContract, setPreviewContract] = useState<Contract | null>(null); // 🆕 Preview Panel State
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null); // 📄 PDF Thumbnail URL
  const [previewPdfLoading, setPreviewPdfLoading] = useState(false); // 📄 PDF Thumbnail Loading
  const [previewPdfError, setPreviewPdfError] = useState(false); // 📄 PDF Thumbnail Fehler
  // 👁️ Hover-Preview-Tooltip (Schritt 2)
  const [hoveredContractId, setHoveredContractId] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [hoverUrl, setHoverUrl] = useState<string | null>(null);
  const [hoverLoading, setHoverLoading] = useState(false);
  const [hoverError, setHoverError] = useState<'fetch' | 'unsupported' | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverUrlCache = useRef<Map<string, string>>(new Map());
  const hoverAbortRef = useRef<AbortController | null>(null);
  const [sidebarPdfCollapsed, setSidebarPdfCollapsed] = useState<boolean>(
    () => !!user?.uiPreferences?.sidebarPdfCollapsed
  ); // 📄 PDF Thumbnail ein-/ausklappbar (geräteübergreifend)
  // 👁️ Hover-PDF-Vorschau an/aus (geräteübergreifend, Default AN)
  const [hoverPreviewEnabled, setHoverPreviewEnabled] = useState<boolean>(
    () => user?.uiPreferences?.hoverPreviewEnabled !== false
  );
  const [showViewSettings, setShowViewSettings] = useState(false); // ⚙️ "Ansicht"-Popover
  const [summaryExpanded, setSummaryExpanded] = useState(false); // 📝 Sidebar-Zusammenfassung "Weiterlesen"

  /* ============================================================
     V2 TODO #4c — Spalten-Konfigurator (aufgeräumt + Smart-Display)
     ============================================================ */
  type ColumnFieldKey =
    | 'provider' | 'contractType' | 'contractNumber' | 'customerNumber'
    | 'startDate' | 'expiry' | 'gekuendigtZum'
    | 'kuendigung' | 'laufzeit' | 'payment';

  interface ColumnFieldDef {
    key: ColumnFieldKey;
    label: string;
  }

  // 10 Field-Optionen für Slot-Spalten (statt 13 — qf0/qf1, value, remaining, createdAt raus)
  const FIELD_OPTIONS: ColumnFieldDef[] = useMemo(() => [
    { key: 'provider',       label: 'Anbieter' },
    { key: 'contractType',   label: 'Vertragstyp' },
    { key: 'contractNumber', label: 'Vertragsnummer' },
    { key: 'expiry',         label: 'Ablauf' },
    { key: 'startDate',      label: 'Vertragsbeginn' },
    { key: 'kuendigung',     label: 'Kündigungsfrist' },
    { key: 'laufzeit',       label: 'Laufzeit' },
    { key: 'payment',        label: 'Zahlung' },
    { key: 'gekuendigtZum',  label: 'Gekündigt zum' },
    { key: 'customerNumber', label: 'Kundennummer' },
  ], []);

  // Default-Slots
  const DEFAULT_SLOTS: ColumnFieldKey[] = ['provider', 'contractType', 'expiry'];

  // Slot-State (3 Slots) — mit Migration: alte/unbekannte Field-Keys → Default
  const [columnSlots, setColumnSlots] = useState<ColumnFieldKey[]>(() => {
    const stored = user?.uiPreferences?.contractColumns as string[] | undefined;
    if (Array.isArray(stored) && stored.length === 3) {
      const validKeys = new Set(FIELD_OPTIONS.map(f => f.key));
      return stored.map((key, idx): ColumnFieldKey =>
        validKeys.has(key as ColumnFieldKey) ? (key as ColumnFieldKey) : DEFAULT_SLOTS[idx]
      );
    }
    return DEFAULT_SLOTS;
  });

  // Sub-Label-Field (was unter Vertragsname steht) — Vertragsbeginn statt Status
  type SubLabelField = 'contractType' | 'provider' | 'startDate' | 'contractNumber';
  const SUB_LABEL_OPTIONS: { key: SubLabelField; label: string }[] = [
    { key: 'contractType',   label: 'Vertragstyp' },
    { key: 'provider',       label: 'Anbieter' },
    { key: 'startDate',      label: 'Vertragsbeginn' },
    { key: 'contractNumber', label: 'Vertragsnummer' },
  ];
  const [subLabelField, setSubLabelField] = useState<SubLabelField>(() => {
    const stored = user?.uiPreferences?.contractSubLabel as SubLabelField | undefined;
    const validKeys = ['contractType', 'provider', 'startDate', 'contractNumber'];
    if (stored && validKeys.includes(stored)) return stored;
    return 'contractType';
  });

  // Welcher Slot hat das Konfigurator-Popover offen
  const [columnConfigFor, setColumnConfigFor] = useState<number | 'sublabel' | null>(null);
  // Position des Popovers (fixed positioning, damit es nicht von overflow:hidden abgeschnitten wird)
  const [columnConfigPos, setColumnConfigPos] = useState<{ top: number; left: number } | null>(null);
  // 🆕 V2 TODO #6: Refs für A11y (Focus-Restore + saubere Outside-Detection statt querySelector)
  const colConfigPopoverRef = useRef<HTMLDivElement | null>(null);
  // Map: slot-id → trigger-button-element. Damit beim Schließen Focus zurück zum richtigen Stift geht.
  const colConfigTriggerRefs = useRef<Map<number | 'sublabel', HTMLButtonElement | null>>(new Map());
  // Welcher Slot hat zuletzt geöffnet — für Focus-Restore beim Schließen
  const colConfigLastOpenedRef = useRef<number | 'sublabel' | null>(null);
  // Helper: Konfigurator schließen + Fokus zurück zum Trigger
  const closeColumnConfig = useCallback(() => {
    const last = colConfigLastOpenedRef.current;
    setColumnConfigFor(null);
    setColumnConfigPos(null);
    if (last !== null) {
      const trigger = colConfigTriggerRefs.current.get(last);
      // setTimeout damit React den State-Update verarbeitet hat, bevor wir focus setzen
      window.requestAnimationFrame(() => trigger?.focus());
    }
  }, []);
  // Helper: Stift-Button-Klick → Position berechnen + State setzen
  const openColumnConfig = (slot: number | 'sublabel', e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if (columnConfigFor === slot) {
      // Toggle: schließen + Fokus bleibt auf Trigger (Click-Source)
      setColumnConfigFor(null);
      setColumnConfigPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    // Popover öffnet unter dem Button, leicht nach links versetzt damit's reinpasst
    setColumnConfigPos({
      top: rect.bottom + 6,
      left: Math.min(rect.left, window.innerWidth - 220), // Popover ist ~210px breit
    });
    colConfigLastOpenedRef.current = slot;
    setColumnConfigFor(slot);
  };

  // Wert eines Felds rendern (Smart-Display)
  const renderColumnValue = (contract: Contract, field: ColumnFieldKey): React.ReactNode => {
    const muted = (text: string) => <span className={styles.contractDetailMuted}>{text}</span>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = contract as any; // für Felder die nicht im strikten Type sind (anbieter, vertragsnummer, kosten, etc.)
    switch (field) {
      case 'provider': {
        // Smart-Fallback: User-manuell `anbieter` > KI `provider.displayName`
        // .trim() damit "  " (whitespace-only) als leer gilt; String() robust gegen number-Werte
        const manual = String(c.anbieter ?? '').trim();
        return manual || contract.provider?.displayName || muted('—');
      }
      case 'contractType':
        // 🆕 A1: contractTypeLabel (KI-deutsche-Bezeichnung) hat Vorrang vor altem
        // contractType (recurring/one-time-Semantik). Fallback-Kette erhält
        // Backwards-Compat für Alt-Verträge.
        return contract.contractTypeLabel || contract.contractType || contract.provider?.category || muted('—');
      case 'contractNumber': {
        const v = String(c.vertragsnummer ?? '').trim() || String(c.contractNumber ?? '').trim(); // robust gegen number-Werte
        return v || muted('—');
      }
      case 'customerNumber': {
        const v = String(c.customerNumber ?? '').trim() || String(c.kundennummer ?? '').trim(); // robust gegen number-Werte
        return v || muted('—');
      }
      case 'startDate':
        return contract.startDate ? formatDate(contract.startDate) : muted('—');
      case 'expiry': {
        // Smart-Anzeige: bei aktiver Kündigung "Gekündigt zum X" statt Original-Ablaufdatum
        if (c.gekuendigtZum) {
          const cancelled = new Date(c.gekuendigtZum);
          if (!Number.isNaN(cancelled.getTime())) {
            return (
              <span style={{ color: '#b91c1c', fontWeight: 500 }}>
                Gekündigt zum {formatDate(c.gekuendigtZum)}
              </span>
            );
          }
        }
        if (!contract.expiryDate) return muted('unbefristet');
        const exp = new Date(contract.expiryDate);
        if (Number.isNaN(exp.getTime())) return muted('—');
        const days = Math.ceil((exp.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        let label: string;
        let tone: 'bad' | 'warn' | 'normal' = 'normal';
        if (days < 0) { label = 'abgelaufen'; tone = 'bad'; }
        else if (days === 0) { label = 'heute'; tone = 'bad'; }
        else if (days <= 30) { label = `${days} Tag${days === 1 ? '' : 'e'}`; tone = 'warn'; }
        else if (days <= 90) { label = `${days} Tage`; }
        else { label = `${Math.round(days / 30)} Monate`; }
        return (
          <>
            <span style={{
              color: tone === 'bad' ? '#b91c1c' : tone === 'warn' ? '#b45309' : '#475569',
              fontWeight: tone !== 'normal' ? 500 : 400,
            }}>{label}</span>
            <span style={{ color: '#94a3b8', fontSize: '0.8125rem', marginLeft: 4 }}>
              · {formatDate(contract.expiryDate)}
            </span>
          </>
        );
      }
      case 'gekuendigtZum':
        return c.gekuendigtZum ? formatDate(c.gekuendigtZum) : muted('—');
      case 'kuendigung':
        return contract.kuendigung || muted('—');
      case 'laufzeit':
        return contract.laufzeit || muted('—');
      case 'payment': {
        // Smart-Display: paymentAmount + Frequenz, oder kosten
        // WICHTIG: nullish-Check (==null) damit 0 € korrekt angezeigt wird (nicht durch !-falsy gefiltert)
        const amount = contract.paymentAmount ?? c.kosten;
        const freq = contract.paymentFrequency;
        if (amount === undefined || amount === null || amount === '') return muted('—');
        return `${amount} €${freq ? ` / ${freq}` : ''}`;
      }
      default:
        return muted('—');
    }
  };

  // Spalten-Title (für Header) basierend auf Field-Key
  const getFieldLabel = (field: ColumnFieldKey): string => {
    return FIELD_OPTIONS.find((f) => f.key === field)?.label || field;
  };

  // Slot-Field ändern + persistieren
  const setColumnSlotField = (slotIdx: number, field: ColumnFieldKey) => {
    const next = [...columnSlots];
    next[slotIdx] = field;
    setColumnSlots(next);
    setColumnConfigFor(null);
    // Persistieren
    if (user) {
      user.uiPreferences = { ...user.uiPreferences, contractColumns: next };
    }
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    fetch('/api/auth/ui-preferences', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ contractColumns: next }),
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }).catch((e) => {
      console.error('Spalten-Config speichern fehlgeschlagen:', e);
      toast.error('Spalten-Einstellung konnte nicht gespeichert werden. Bitte erneut versuchen.');
    });
  };

  // Reset einen Slot auf Default
  const resetColumnSlot = (slotIdx: number) => {
    setColumnSlotField(slotIdx, DEFAULT_SLOTS[slotIdx]);
  };
  // Reset Sub-Label auf Default
  const resetSubLabel = () => {
    setSubLabelFieldPersist('contractType');
  };

  // Sub-Label-Field ändern + persistieren
  const setSubLabelFieldPersist = (field: SubLabelField) => {
    setSubLabelField(field);
    setColumnConfigFor(null);
    if (user) {
      user.uiPreferences = { ...user.uiPreferences, contractSubLabel: field };
    }
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    fetch('/api/auth/ui-preferences', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ contractSubLabel: field }),
    }).then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    }).catch((e) => {
      console.error('Sub-Label-Config speichern fehlgeschlagen:', e);
      toast.error('Sub-Label-Einstellung konnte nicht gespeichert werden. Bitte erneut versuchen.');
    });
  };

  // Sub-Label rendern — Hochladedatum bleibt IMMER als zweites Element
  const renderSubLabel = (contract: Contract): React.ReactNode => {
    if (contract.isGenerated) return <>Generiert <span className={styles.contractSubSepV2}>·</span> Hochgeladen {formatDate(contract.createdAt)}</>;
    if (contract.uploadType === 'EMAIL_IMPORT') return <>Per E-Mail <span className={styles.contractSubSepV2}>·</span> Hochgeladen {formatDate(contract.createdAt)}</>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const c = contract as any;
    let primary: string | undefined;
    switch (subLabelField) {
      case 'contractType':   primary = contract.contractTypeLabel || contract.contractType || contract.provider?.category; break;
      case 'provider':       primary = c.anbieter || contract.provider?.displayName; break;
      case 'startDate':      primary = contract.startDate ? formatDate(contract.startDate) : undefined; break;
      case 'contractNumber': primary = c.vertragsnummer || c.contractNumber; break;
    }
    return (
      <>
        <span>{primary || 'Vertrag'}</span>
        <span className={styles.contractSubSepV2}>·</span>
        <span>Hochgeladen {formatDate(contract.createdAt)}</span>
      </>
    );
  };

  // 📱 MOBILE UX: Filter-Bottom-Sheet und Upload-Tabs
  const [showMobileFilterSheet, setShowMobileFilterSheet] = useState(false);
  const [uploadTab, setUploadTab] = useState<'file' | 'email'>('file');

  // ✅ NEU: Infinite Scroll Pagination State
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    hasMore: false,
    currentSkip: 0
  });
  // 📊 Sidebar-Counts: Vom Backend berechnet, unabhängig von aktiven Filtern
  const [sidebarCounts, setSidebarCounts] = useState({
    total: 0,
    baldAblaufend: 0,
    aktiv: 0,
    ohneOrdner: 0,
    abgelaufen: 0,
    gekuendigt: 0,
    neu: 0,
    entwurf: 0,
    optimiert: 0
  });
  const [loadingMore, setLoadingMore] = useState(false); // Loading für "Weitere laden"
  const [analyzingContract, setAnalyzingContract] = useState<{ [contractId: string]: boolean }>({}); // Loading für "Jetzt analysieren"
  const [analyzingOverlay, setAnalyzingOverlay] = useState<{ show: boolean; contractName: string; pdfFile?: File; progress: number }>({ show: false, contractName: '', progress: 0 }); // ✅ Full-Screen Analyse-Overlay

  // ✅ NEU: Upload Success Modal State (für Two-Step Upload Flow)
  const [uploadSuccessModal, setUploadSuccessModal] = useState<{
    show: boolean;
    uploadedContracts: Array<{ _id: string; name: string; uploadedAt: string }>;
  }>({
    show: false,
    uploadedContracts: []
  });

  // 🔔 NEU: Reminder Settings Modal State
  const [reminderSettingsModal, setReminderSettingsModal] = useState<{
    show: boolean;
    contract: Contract | null;
  }>({
    show: false,
    contract: null
  });

  const { openScanner, ScannerModal } = useDocumentScanner((file) => {
    const newUploadFile: UploadFileItem = {
      id: `${Date.now()}_0`,
      file,
      status: 'pending',
      progress: 0
    };
    setUploadFiles([newUploadFile]);
    setSelectedFile(file);
    setActiveSection('upload');
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null); // ✅ Ref für scrollbaren Content-Bereich
  const hasScrolledRef = useRef(false); // (Legacy-Flag; vom robusten Callback-Ref-Observer nicht mehr als Gate genutzt)
  // 🆕 Robuster Infinite-Scroll: Callback-Ref-Observer + stets frische Werte (gegen Attach-Race + Stale-Closure)
  const observerRef = useRef<IntersectionObserver | null>(null);
  const paginationInfoRef = useRef(paginationInfo);
  const loadingMoreRef = useRef(loadingMore);
  const loadMoreContractsRef = useRef<(() => void) | null>(null);
  const userInfoCacheRef = useRef<{ data: UserInfo | null; timestamp: number }>({ data: null, timestamp: 0 }); // ✅ Cache für User-Info
  const isFirstMountRef = useRef(true); // ✅ Flag um First Mount zu erkennen (verhindert doppelten API-Call)
  const fetchRequestIdRef = useRef(0); // 🚀 Request-ID um veraltete Responses zu ignorieren

  // 📐 Resizable Sidebar
  const SIDEBAR_MIN = 180;
  const SIDEBAR_MAX = 400;
  const SIDEBAR_STORAGE_KEY = 'contract-ai-sidebar-width';
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved ? Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, parseInt(saved, 10))) : null;
  });
  const isResizingRef = useRef(false);
  const [isResizing, setIsResizing] = useState(false);

  // 📁 Folder Management Hook
  const {
    folders,
    activeFolder,
    favoriteFolder,
    unassignedOrder,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    setActiveFolder,
    setFavoriteFolder,
    moveContractToFolder,
    bulkMoveToFolder
  } = useFolders();

  // 📁 Folder Modal State
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [folderDropdownOpen, setFolderDropdownOpen] = useState<string | null>(null); // Track which contract's dropdown is open
  // 🆕 V2 TODO #1: Mehr-Popover (⋮) State
  const [morePopoverFor, setMorePopoverFor] = useState<string | null>(null);
  const [morePopoverFolderExpanded, setMorePopoverFolderExpanded] = useState(false);
  // 🛠️ Fix: Popover wurde von overflow:hidden + motion.tr-Transform abgeschnitten → als
  // position:fixed-Portal rendern (wie qfDropdown). Position vom ⋮-Button berechnet.
  // top ODER bottom (Auto-Flip nach oben bei wenig Platz unten); maxHeight kappt + scrollt.
  const [morePopoverPos, setMorePopoverPos] = useState<{ right: number; top?: number; bottom?: number; maxHeight: number } | null>(null);
  const [folderDropdownPosition, setFolderDropdownPosition] = useState<{ top: number; right: number } | null>(null); // Position für fixed Dropdown
  const [folderDropdownContractId, setFolderDropdownContractId] = useState<string | null>(null); // Contract ID für Portal
  // selectedFolderId entfernt — Sidebar-Navigation nutzt jetzt activeFolder + statusFilter direkt

  // 📁 Folder Context Menu State
  const [folderContextMenu, setFolderContextMenu] = useState<{
    folderId: string;
    x: number;
    y: number;
  } | null>(null);

  // 📋 Bulk Selection State
  const [bulkSelectMode, setBulkSelectMode] = useState(false); // Toggle für Checkbox-Sichtbarkeit
  const [selectedContracts, setSelectedContracts] = useState<string[]>([]);
  const [bulkActionDropdownOpen, setBulkActionDropdownOpen] = useState(false);

  const [qfDropdownOpen, setQfDropdownOpen] = useState<{
    contractId: string;
    displayIndex: number;
    position: { top: number; left: number };
  } | null>(null);

  // 🤖 Smart Folders Modal State
  const [smartFoldersModalOpen, setSmartFoldersModalOpen] = useState(false);

  // 🎨 Contract Detail Modal State
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);

  // 📱 MOBILE-FIRST 2025: Neue States für Bottom Nav, Filter Chips, Search Overlay
  const [mobileNavTab, setMobileNavTab] = useState<'alle' | 'aktiv' | 'faellig' | 'archiv' | 'ordner'>('alle');
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [mobileSearchQuery, setMobileSearchQuery] = useState('');
  const [showMobileFolderSheet, setShowMobileFolderSheet] = useState(false);

  // 🆕 Handle navigation state from Optimizer page
  useEffect(() => {
    const state = location.state as { sourceFilter?: 'alle' | 'generated' | 'optimized' };
    if (state?.sourceFilter) {
      setSourceFilter(state.sourceFilter);
      // Clear the state to avoid re-triggering on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  // 🆕 Filter aus URL-Parametern setzen (Dashboard-Stat-Cards & Feature-Links) — von V1 portiert.
  // Damit /contracts?status=active|expiring und ?filter=generated greifen (für V2-als-/contracts).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const statusParam = params.get('status');
    const filterParam = params.get('filter');
    let appliedFilter = false;
    if (statusParam === 'active') {
      setStatusFilter('aktiv');
      setMobileNavTab('aktiv'); // Mobile Bottom-Nav synchron halten
      appliedFilter = true;
    } else if (statusParam === 'expiring') {
      setStatusFilter('bald_ablaufend');
      setMobileNavTab('faellig');
      appliedFilter = true;
    }
    if (filterParam === 'generated') {
      setSourceFilter('generated');
      appliedFilter = true;
    }
    // URL säubern — Memory-Regel: navigate(replace) statt window.history.replaceState
    if (appliedFilter) {
      navigate(location.pathname, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ NEW: Handle "upload" URL parameter to open upload section directly
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const shouldOpenUpload = params.get('upload') === 'true';

    if (shouldOpenUpload) {
      setActiveSection('upload');
      // Clean up URL parameter
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.search]);

  // Beim Verlassen der Listen-Ansicht das "Ansicht"-Popover schließen, damit es
  // beim Zurückkehren nicht ungewollt wieder offen erscheint (Toolbar wird dort un-mountet).
  useEffect(() => {
    if (activeSection !== 'contracts') setShowViewSettings(false);
  }, [activeSection]);

  // ⚡ Cleanup: Entferne verwaisten quickAnalysis-URL-Param wenn Modal nicht offen ist
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has('quickAnalysis') && !quickAnalysisModal.show) {
      navigate('/contracts', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ NEW: Handle "view" URL parameter to open contract details
  // Wird getriggert wenn URL sich ändert ODER wenn contracts geladen wurden
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const rawContractId = params.get('view');
    // Säubere die ID von möglichen \n Zeichen (aus ICS-Feed)
    // Auch URL-encodierte Varianten: %5Cn, %0A, sowie Whitespace
    const contractIdToView = rawContractId
      ? rawContractId
          .trim()
          .replace(/%5C[nN]/g, '')  // URL-encoded \n
          .replace(/%0[aA]/g, '')    // URL-encoded newline
          .replace(/\\n/g, '')       // Literal \n
          .replace(/\n/g, '')        // Actual newline
          .replace(/\s/g, '')        // Any whitespace
      : null;


    if (contractIdToView && !loading) {
      // Erst in der aktuellen Liste suchen
      const contractToOpen = contracts.find(c => c._id === contractIdToView);

      if (contractToOpen) {
        setSelectedContract(contractToOpen);
        setShowDetails(true);
      } else if (contracts.length > 0) {
        // Vertrag nicht in der Liste (Pagination) → Direkt von API laden

        const fetchSingleContract = async () => {
          try {
            const response = await apiCall(`/contracts/${contractIdToView}`);
            // Backend gibt den Vertrag direkt zurück (nicht eingepackt in { contract: ... })
            // Prüfe beide Formate für Kompatibilität
            const contract = (response as { contract?: Contract })?.contract || (response as Contract);

            if (contract && contract._id) {
              setSelectedContract(contract);
              setShowDetails(true);
            }
          } catch (error) {
            console.error('❌ Fehler beim Laden des Vertrags:', error);
          }
        };

        fetchSingleContract();
      }
    }
  }, [location.search, contracts, loading]);

  // 🤖 Sync URL with modal state so AssistantWidget detects the open contract
  useEffect(() => {
    const currentView = new URLSearchParams(location.search).get('view');
    if (showDetails && selectedContract && currentView !== selectedContract._id) {
      navigate(`/contracts?view=${selectedContract._id}`, { replace: true });
    }
  }, [showDetails, selectedContract, location.search, navigate]);

  // 🔓 Stufe 2: Rückkehr von Stripe nach Einmal-Freischaltung (?unlocked=1).
  // Verifiziert die Zahlung (Fallback, falls Webhook verzögert) und lädt die Liste
  // neu, damit die jetzt freigeschaltete (volle) Analyse erscheint. Läuft nur einmal.
  const unlockVerifiedRef = useRef(false);
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('unlocked') !== '1' || unlockVerifiedRef.current) return;
    const cid = params.get('view');
    if (!cid) return;
    const sid = params.get('session_id'); // von Stripe success_url ({CHECKOUT_SESSION_ID})
    unlockVerifiedRef.current = true;
    (async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('authToken');
        const q = `contractId=${encodeURIComponent(cid)}${sid ? `&session_id=${encodeURIComponent(sid)}` : ''}`;
        await fetch(`/api/stripe/verify-unlock?${q}`, {
          headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
          credentials: 'include',
        });
      } catch { /* Webhook setzt es ohnehin — dies ist nur ein Fallback */ }
      try { toast.success('Analyse freigeschaltet — viel Erfolg!'); } catch { /* ignore */ }
      await fetchContracts();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // 📁 Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (folderDropdownOpen) {
        setFolderDropdownOpen(null);
        setFolderDropdownPosition(null);
        setFolderDropdownContractId(null);
      }
      if (folderContextMenu) {
        setFolderContextMenu(null);
      }
      if (qfDropdownOpen) {
        setQfDropdownOpen(null);
      }
      // 🆕 V2 TODO #1: Mehr-Popover schließen
      if (morePopoverFor) {
        setMorePopoverFor(null);
        setMorePopoverPos(null);
        setMorePopoverFolderExpanded(false);
      }
      // 🆕 V2 TODO #4b: Konfigurator-Popover schließen
      if (columnConfigFor !== null) {
        setColumnConfigFor(null);
        setColumnConfigPos(null);
      }
      // ⚙️ Ansicht-Popover schließen
      if (showViewSettings) {
        setShowViewSettings(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [folderDropdownOpen, folderContextMenu, qfDropdownOpen, morePopoverFor, columnConfigFor, showViewSettings]);

  // 🆕 V2 TODO #6: Escape schließt Konfigurator + Focus-Restore zum Trigger
  useEffect(() => {
    if (columnConfigFor === null) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        closeColumnConfig();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [columnConfigFor, closeColumnConfig]);

  // 🆕 V2 TODO #6: Beim Öffnen Fokus auf aktuell ausgewähltes Item (oder erstes Item)
  useEffect(() => {
    if (columnConfigFor === null) return;
    // RAF, damit Popover gerendert ist
    const id = window.requestAnimationFrame(() => {
      const popover = colConfigPopoverRef.current;
      if (!popover) return;
      const active = popover.querySelector<HTMLButtonElement>(`.${styles.colConfigItemActive}`);
      const first = popover.querySelector<HTMLButtonElement>(`.${styles.colConfigItem}`);
      (active || first)?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [columnConfigFor]);

  // 🆕 V2 TODO #6: Pfeil-Tasten-Navigation in Konfigurator-Liste (rove-tabindex Pattern)
  const handleConfigListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
    const popover = colConfigPopoverRef.current;
    if (!popover) return;
    const items = Array.from(popover.querySelectorAll<HTMLButtonElement>(`.${styles.colConfigItem}`));
    if (items.length === 0) return;
    const currentIdx = items.findIndex((el) => el === document.activeElement);
    e.preventDefault();
    let nextIdx = currentIdx;
    if (e.key === 'ArrowDown') nextIdx = currentIdx < items.length - 1 ? currentIdx + 1 : 0;
    else if (e.key === 'ArrowUp') nextIdx = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = items.length - 1;
    items[nextIdx]?.focus();
  };

  // 🆕 V2 TODO #4d/#6: Scroll-Listener nur wenn Konfigurator offen (eigenes useEffect, deps minimal)
  // WICHTIG: Scroll IM Popover (max-height + overflow-y der Field-Liste) darf das Popover NICHT schließen.
  // Outside-Detection läuft über Ref (nicht querySelector) → robust bei mehreren Popovers im DOM.
  useEffect(() => {
    if (columnConfigFor === null) return;
    const handleScroll = (e: Event) => {
      const target = e.target as Node | null;
      const popoverEl = colConfigPopoverRef.current;
      if (popoverEl && target && popoverEl.contains(target)) return;
      setColumnConfigFor(null);
      setColumnConfigPos(null);
    };
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [columnConfigFor]);

  // 📱 MOBILE: Scroll blockieren wenn Bottom Sheet offen ist (nur contentArea, nicht body)
  useEffect(() => {
    if (folderDropdownOpen) {
      const contentArea = document.querySelector('[class*="contentArea"]') as HTMLElement;
      if (contentArea) {
        const prevOverflow = contentArea.style.overflow;
        contentArea.style.overflow = 'hidden';
        return () => {
          contentArea.style.overflow = prevOverflow || '';
        };
      }
    }
  }, [folderDropdownOpen]);

  // 📱 MOBILE: Scroll blockieren wenn Duplikat-Modal offen ist
  useEffect(() => {
    if (duplicateModal?.show) {
      // Body UND contentArea blockieren
      const prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const contentArea = document.querySelector('[class*="contentArea"]') as HTMLElement;
      const prevContentOverflow = contentArea?.style.overflow || '';
      if (contentArea) {
        contentArea.style.overflow = 'hidden';
      }

      return () => {
        document.body.style.overflow = prevBodyOverflow || '';
        if (contentArea) {
          contentArea.style.overflow = prevContentOverflow || '';
        }
      };
    }
  }, [duplicateModal?.show]);

  // 📱 MOBILE: Scroll blockieren wenn Contract-Details-Modal offen ist
  useEffect(() => {
    if (showDetails && selectedContract) {
      // Body UND contentArea blockieren
      const prevBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const contentArea = document.querySelector('[class*="contentArea"]') as HTMLElement;
      const prevContentOverflow = contentArea?.style.overflow || '';
      if (contentArea) {
        contentArea.style.overflow = 'hidden';
      }

      return () => {
        document.body.style.overflow = prevBodyOverflow || '';
        if (contentArea) {
          contentArea.style.overflow = prevContentOverflow || '';
        }
      };
    }
  }, [showDetails, selectedContract]);

  // 📄 PDF-Thumbnail für Preview Panel laden
  useEffect(() => {
    if (!previewContract) {
      setPreviewPdfUrl(prev => {
        if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
        return null;
      });
      setPreviewPdfLoading(false); // 🆕 kein Spinner-Hänger beim Schließen während des Ladens
      return;
    }

    let cancelled = false;
    let blobUrl: string | null = null;

    const loadPreviewPdf = async () => {
      setPreviewPdfLoading(true);
      setPreviewPdfError(false);
      // Altes Thumbnail bleibt sichtbar bis neues geladen ist (kein Flicker)
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        let newUrl: string | null = null;

        if (previewContract.s3Key) {
          const res = await fetch(`/api/s3/view?contractId=${previewContract._id}&type=original`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include'
          });
          if (res.ok && !cancelled) {
            const data = await res.json();
            newUrl = data.fileUrl || data.url || null;
          }
        } else if (previewContract.isGenerated) {
          const res = await fetch(`/api/contracts/${previewContract._id}/pdf-v2`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ design: 'executive' })
          });
          if (res.ok && !cancelled) {
            const blob = await res.blob();
            blobUrl = URL.createObjectURL(blob);
            newUrl = blobUrl;
          }
        }

        if (!cancelled) {
          setPreviewPdfUrl(prev => {
            if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
            return newUrl;
          });
          // Kein PDF verfügbar (weder S3 noch generiert)
          if (!newUrl) setPreviewPdfError(true);
        }
      } catch (e) {
        console.error('Preview PDF load error:', e);
        if (!cancelled) setPreviewPdfError(true);
      } finally {
        if (!cancelled) setPreviewPdfLoading(false);
      }
    };

    loadPreviewPdf();
    return () => {
      cancelled = true;
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [previewContract?._id]);

  // 📝 Zusammenfassung wieder einklappen, wenn ein anderer Vertrag in die Vorschau kommt
  useEffect(() => {
    setSummaryExpanded(false);
  }, [previewContract?._id]);

  // 👁️ Hover-Preview: URL für gehoverten Vertrag holen (mit Cache + Abort)
  useEffect(() => {
    if (!hoveredContractId) {
      setHoverUrl(null);
      setHoverLoading(false);
      return;
    }
    const contract = contracts.find(c => c._id === hoveredContractId);
    if (!contract) { setHoverLoading(false); return; } // 🆕 kein Spinner-Hänger wenn Vertrag verschwindet

    // Nicht-PDFs: kein Fetch, klare Meldung
    const ft = getFileType(contract.name);
    if (ft.variant !== 'pdf' && !contract.isGenerated) {
      setHoverUrl(null);
      setHoverError('unsupported');
      setHoverLoading(false);
      return;
    }

    // Cache-Hit
    const cached = hoverUrlCache.current.get(hoveredContractId);
    if (cached) {
      setHoverUrl(cached);
      setHoverError(null);
      setHoverLoading(false);
      return;
    }

    // Fetch
    hoverAbortRef.current?.abort();
    const ctrl = new AbortController();
    hoverAbortRef.current = ctrl;
    setHoverLoading(true);
    setHoverError(null);
    setHoverUrl(null);

    (async () => {
      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        let url: string | null = null;
        if (contract.s3Key) {
          // Inline-URL fuer iframe-Embedding (Content-Disposition: inline)
          const res = await fetch(`/api/s3/view-inline?contractId=${contract._id}`, {
            headers: { Authorization: `Bearer ${token}` },
            credentials: 'include',
            signal: ctrl.signal,
          });
          if (res.ok) {
            const data = await res.json();
            url = data.fileUrl || null;
          }
        } else if (contract.isGenerated) {
          const res = await fetch(`/api/contracts/${contract._id}/pdf-v2`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ design: 'executive' }),
            signal: ctrl.signal,
          });
          if (res.ok) {
            const blob = await res.blob();
            url = URL.createObjectURL(blob);
          }
        }
        if (ctrl.signal.aborted) return;
        if (url) {
          hoverUrlCache.current.set(hoveredContractId, url);
          setHoverUrl(url);
        } else {
          setHoverError('fetch');
        }
      } catch (err) {
        if ((err as { name?: string }).name === 'AbortError') return;
        setHoverError('fetch');
      } finally {
        if (!ctrl.signal.aborted) setHoverLoading(false);
      }
    })();

    return () => { ctrl.abort(); };
  }, [hoveredContractId, contracts]);

  // 👁️ Hover-Preview: Tooltip bei Scroll schliessen (sonst klebt es an alter Position)
  useEffect(() => {
    if (!hoveredContractId) return;
    const close = () => {
      if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
      setHoveredContractId(null);
      setHoverPos(null);
    };
    window.addEventListener('scroll', close, true);
    return () => window.removeEventListener('scroll', close, true);
  }, [hoveredContractId]);

  // 👁️ Hover-Preview: Memory-Cleanup beim Unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
      hoverAbortRef.current?.abort();
      // Blob-URLs (von isGenerated) freigeben
      hoverUrlCache.current.forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
      hoverUrlCache.current.clear();
    };
  }, []);

  // 👁️ Hover-Preview: State leeren, sobald man die Liste verlässt (Upload/Analyse) —
  // verhindert, dass das Vorschaufenster "kleben" bleibt, weil onMouseLeave nicht feuert
  useEffect(() => {
    if (activeSection !== 'contracts') {
      if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
      setHoveredContractId(null);
      setHoverPos(null);
      hoverAbortRef.current?.abort();
    }
  }, [activeSection]);

  // 👁️ Hover-Preview: Position rechts neben dem Cursor mit Rand-Fallback
  const computeHoverPos = (x: number, y: number) => {
    const TOOLTIP_W = 260;
    const TOOLTIP_H = 340;
    const PAD = 18;
    const winW = window.innerWidth;
    const winH = window.innerHeight;
    // Bevorzugt rechts neben Cursor, sonst links; vertikal leicht oberhalb, am Rand geclamped
    const posX = x + PAD + TOOLTIP_W > winW ? Math.max(8, x - PAD - TOOLTIP_W) : x + PAD;
    const posY = Math.min(Math.max(8, y - 24), winH - TOOLTIP_H - 8);
    return { x: posX, y: posY };
  };

  // 👁️ Hover-Preview: Row-Handler (200ms Delay, Cursor-folgend)
  const handleRowMouseEnter = (contract: Contract, e: React.MouseEvent) => {
    if (!hoverPreviewEnabled) return; // 👁️ Vom User abgeschaltet
    // Nur überspringen, wenn das Gerät GAR NICHT hovern kann (reines Touch-Gerät)
    if (typeof window !== 'undefined' && window.matchMedia && !window.matchMedia('(any-hover: hover)').matches) return;

    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    // Position sofort setzen, damit die Box beim Erscheinen direkt korrekt sitzt
    setHoverPos(computeHoverPos(e.clientX, e.clientY));
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredContractId(contract._id);
    }, 200);
  };
  // 👁️ Hover-Preview: Box folgt dem Cursor, solange man über der Zeile ist
  const handleRowMouseMove = (e: React.MouseEvent) => {
    if (!hoverPreviewEnabled) return; // 👁️ Vom User abgeschaltet
    if (typeof window !== 'undefined' && window.matchMedia && !window.matchMedia('(any-hover: hover)').matches) return;
    setHoverPos(computeHoverPos(e.clientX, e.clientY));
  };
  const handleRowMouseLeave = () => {
    if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
    setHoveredContractId(null);
    setHoverPos(null);
    setHoverError(null);
    hoverAbortRef.current?.abort();
  };

  // 📄 PDF-Thumbnail Toggle — geräteübergreifend speichern
  const toggleSidebarPdf = () => {
    const newValue = !sidebarPdfCollapsed;
    setSidebarPdfCollapsed(newValue);
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    fetch('/api/auth/ui-preferences', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ sidebarPdfCollapsed: newValue })
    }).catch(e => console.error('UI-Preference save error:', e));
  };

  // 👁️ Hover-Vorschau Toggle — geräteübergreifend speichern
  const toggleHoverPreview = () => {
    const newValue = !hoverPreviewEnabled;
    setHoverPreviewEnabled(newValue);
    // Beim Ausschalten eine evtl. offene Box sofort schließen
    if (!newValue) {
      if (hoverTimeoutRef.current) { clearTimeout(hoverTimeoutRef.current); hoverTimeoutRef.current = null; }
      setHoveredContractId(null);
      setHoverPos(null);
    }
    if (user) {
      user.uiPreferences = { ...user.uiPreferences, hoverPreviewEnabled: newValue };
    }
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    fetch('/api/auth/ui-preferences', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ hoverPreviewEnabled: newValue })
    }).catch(e => console.error('UI-Preference save error:', e));
  };

  // 🔽 Klick-Sortierung auf Spaltenheadern
  const handleColumnSort = (ascKey: SortOrder, descKey: SortOrder) => {
    if (sortOrder === ascKey) setSortOrder(descKey);
    else if (sortOrder === descKey) setSortOrder('neueste');
    else setSortOrder(ascKey);
  };

  // ✏️ Eckdaten-Label speichern — V2 TODO #4a: entfernt, kommt in 4b zurück (Konfigurator)

  // 📁 Handle folder reorder (move up/down)
  const handleMoveFolderUp = async (folderId: string) => {
    const currentIndex = folders.findIndex(f => f._id === folderId);
    if (currentIndex <= 0) return; // Already at top

    // Reorder API call (PATCH)
    try {
      const newFolders = [...folders];
      [newFolders[currentIndex - 1], newFolders[currentIndex]] = [newFolders[currentIndex], newFolders[currentIndex - 1]];

      // Backend erwartet Array von { _id, order }
      const foldersWithOrder = newFolders.map((f, index) => ({
        _id: f._id,
        order: index
      }));

      await apiCall('/folders/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ folders: foldersWithOrder })
      });
      await fetchFolders(true);
    } catch (err) {
      console.error('Error reordering folders:', err);
    }
    setFolderContextMenu(null);
  };

  const handleMoveFolderDown = async (folderId: string) => {
    const currentIndex = folders.findIndex(f => f._id === folderId);
    if (currentIndex >= folders.length - 1) return; // Already at bottom

    // Reorder API call (PATCH)
    try {
      const newFolders = [...folders];
      [newFolders[currentIndex], newFolders[currentIndex + 1]] = [newFolders[currentIndex + 1], newFolders[currentIndex]];

      // Backend erwartet Array von { _id, order }
      const foldersWithOrder = newFolders.map((f, index) => ({
        _id: f._id,
        order: index
      }));

      await apiCall('/folders/reorder', {
        method: 'PATCH',
        body: JSON.stringify({ folders: foldersWithOrder })
      });
      await fetchFolders(true);
    } catch (err) {
      console.error('Error reordering folders:', err);
    }
    setFolderContextMenu(null);
  };

  // ✅ BUG FIX 1: NEUE Edit-Schnellaktion Handler-Funktion
  // ✏️ MOBILE FIX: Öffnet jetzt direkt das Quick-Edit-Modal statt Detail-Ansicht
  const handleEditContract = (contract: Contract) => {
    // Direkt Quick-Edit-Modal öffnen (ohne Detail-Ansicht!)
    setQuickEditContract(contract);
  };

  // 🆕 Smart PDF Opener - Opens signed PDF if available, otherwise original
  const openSmartPDF = async (contract: Contract, preferSigned: boolean = true) => {
    setPdfLoading(prev => ({ ...prev, [contract._id]: true }));

    // Open temp window immediately (popup blocker workaround)
    let tempWindow: Window | null = null;

    try {
      // ✅ FIX: Beide Token-Keys prüfen (authToken wird bei Login gesetzt, token bei manchen anderen Flows)
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');

      // Check if we should try to open signed PDF
      const hasSignedPDF = contract.envelope?.s3KeySealed && contract.envelope?.signatureStatus === 'COMPLETED';

      tempWindow = window.open('', '_blank');
      if (tempWindow) {
        tempWindow.document.write(`
          <html>
            <head>
              <title>Lade ${contract.name}...</title>
              <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  height: 100vh;
                  margin: 0;
                  background: #f5f5f7;
                  color: #1d1d1f;
                }
                .loader { text-align: center; }
                .spinner {
                  width: 40px;
                  height: 40px;
                  border: 3px solid #e5e5e5;
                  border-top: 3px solid #007aff;
                  border-radius: 50%;
                  animation: spin 1s linear infinite;
                  margin: 0 auto 20px;
                }
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              </style>
            </head>
            <body>
              <div class="loader">
                <div class="spinner"></div>
                <h2>${hasSignedPDF && preferSigned ? 'Signiertes PDF' : 'PDF'} wird geladen...</h2>
              </div>
            </body>
          </html>
        `);
      }

      // Build URL with smart type parameter
      const typeParam = (hasSignedPDF && preferSigned) ? '&type=signed' : '';

      if (contract.s3Key) {
        // Normal: PDF von S3 laden
        const url = `/api/s3/view?contractId=${contract._id}${typeParam}`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        const data = await response.json();

        if (response.ok && (data.url || data.fileUrl)) {
          const pdfUrl = data.url || data.fileUrl;
          if (tempWindow && !tempWindow.closed) {
            tempWindow.location.href = pdfUrl;
          } else {
            window.open(pdfUrl, '_blank', 'noopener,noreferrer');
          }
        } else {
          throw new Error(data.error || 'Failed to load PDF');
        }
      } else if (contract.isGenerated) {
        // Fallback: PDF on-demand generieren via React-PDF
        const response = await fetch(`/api/contracts/${contract._id}/pdf-v2`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ design: 'executive' })
        });
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = window.URL.createObjectURL(blob);
          if (tempWindow && !tempWindow.closed) {
            tempWindow.location.href = blobUrl;
          } else {
            window.open(blobUrl, '_blank', 'noopener,noreferrer');
          }
        } else {
          throw new Error('PDF-Generierung fehlgeschlagen');
        }
      } else {
        throw new Error('Keine PDF verfügbar');
      }
    } catch (error) {
      console.error('❌ Error opening PDF:', error);
      if (tempWindow) tempWindow.close();
      setError(error instanceof Error ? error.message : 'Fehler beim Öffnen des PDFs');
    } finally {
      setPdfLoading(prev => ({ ...prev, [contract._id]: false }));
    }
  };

  // 📁 Folder Handler Functions
  const handleCreateFolder = () => {
    setEditingFolder(null);
    setFolderModalOpen(true);
  };

  // Reserved for future context menu on folder items
  const _handleEditFolder = (folderId: string) => {
    const folder = folders.find(f => f._id === folderId);
    if (folder) {
      setEditingFolder(folder);
      setFolderModalOpen(true);
    }
  };

  // Handle folder deletion
  const handleDeleteFolder = async (folderId: string) => {
    const folder = folders.find(f => f._id === folderId);
    if (!folder) return;

    if (!confirm(`Ordner "${folder.name}" wirklich löschen? Verträge werden in "Ohne Ordner" verschoben.`)) {
      return;
    }

    try {
      await deleteFolder(folderId);
      await fetchContracts(); // Refresh contracts to update folderId
    } catch (err) {
      console.error('Error deleting folder:', err);
      setError('Fehler beim Löschen des Ordners');
    }
  };

  // Reserved for future drag-and-drop reordering
  const _handleReorderFolders = async (reorderedFolders: FolderType[]) => {
    try {
      // Separate real folders from "unassigned" virtual folder
      const realFolders = reorderedFolders.filter(f => f._id !== 'unassigned');
      const unassignedFolder = reorderedFolders.find(f => f._id === 'unassigned');

      // Update order in backend for real folders
      await apiCall('/folders/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folders: realFolders.map((folder, index) => ({
            _id: folder._id,
            order: index
          })),
          unassignedOrder: unassignedFolder ? reorderedFolders.indexOf(unassignedFolder) : null
        })
      });

      await fetchFolders(true); // ✅ Force refresh nach Reorder
    } catch (err) {
      console.error('Error reordering folders:', err);
      setError('Fehler beim Sortieren der Ordner');
      await fetchFolders(true); // ✅ Force revert auf Server-State
    }
  };

  // Suppress unused variable warnings for reserved functions
  void _handleEditFolder;
  void _handleReorderFolders;

  const handleFolderSave = async (data: { name: string; color: string; icon: string }) => {
    if (editingFolder) {
      await updateFolder(editingFolder._id, data);
    } else {
      await createFolder(data);
    }
    await fetchContracts(); // Refresh to update counts
  };

  // 📁 Move Contract to Folder Handler
  const handleMoveToFolder = async (contractId: string, folderId: string | null) => {
    try {
      await moveContractToFolder(contractId, folderId);
      await fetchContracts();
      toast.success('Vertrag verschoben');
    } catch (err) {
      console.error('Error moving contract:', err);
      toast.error('Fehler beim Verschieben des Vertrags');
    }
  };

  // Count unassigned contracts (aus Backend-sidebarCounts, stabil bei Filtern)
  const unassignedCount = sidebarCounts.ohneOrdner;

  // Create virtual "Ohne Ordner" folder and merge with real folders
  const foldersWithUnassigned = [...folders];
  if (unassignedCount > 0) {
    const unassignedFolder: FolderType = {
      _id: 'unassigned',
      name: 'Ohne Ordner',
      icon: '📁',
      color: '#fbbf24',
      contractCount: unassignedCount,
      order: unassignedOrder // Use saved order from user profile
    };
    foldersWithUnassigned.push(unassignedFolder);
  }
  // Sort by order
  foldersWithUnassigned.sort((a, b) => (a.order || 0) - (b.order || 0));

  // 📋 Bulk Selection Handlers
  const toggleBulkSelectMode = () => {
    setBulkSelectMode(prev => !prev);
    // Reset selection when turning off
    if (bulkSelectMode) {
      setSelectedContracts([]);
      setBulkActionDropdownOpen(false);
    }
  };

  const toggleSelectContract = (contractId: string) => {
    setSelectedContracts(prev =>
      prev.includes(contractId)
        ? prev.filter(id => id !== contractId)
        : [...prev, contractId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedContracts.length === contracts.length) {
      setSelectedContracts([]);
    } else {
      setSelectedContracts(contracts.map(c => c._id));
    }
  };

  const handleBulkMoveToFolder = async (folderId: string | null) => {
    if (selectedContracts.length === 0) return;

    try {
      await bulkMoveToFolder(selectedContracts, folderId);
      await fetchContracts();
      setSelectedContracts([]);
      setBulkActionDropdownOpen(false);
      toast.success(`${selectedContracts.length} Verträge verschoben`);
    } catch (err) {
      console.error('Error bulk moving contracts:', err);
      toast.error('Fehler beim Verschieben der Verträge');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContracts.length === 0) return;

    const confirmed = confirm(`${selectedContracts.length} Verträge wirklich löschen?`);
    if (!confirmed) return;

    try {
      // ✅ NEU: Bulk-Delete Endpoint (Enterprise-Feature)
      const response = await fetch('/api/contracts/bulk-delete', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          contractIds: selectedContracts
        })
      });

      if (!response.ok) {
        const errorData = await response.json();

        // Enterprise-Feature Check
        if (errorData.requiresUpgrade) {
          toast.warning(errorData.message || 'Bulk-Operationen nur für Enterprise-Plan verfügbar');
          return;
        }

        throw new Error(errorData.message || 'Fehler beim Löschen');
      }

      await response.json();

      await fetchContracts();
      setSelectedContracts([]);
      toast.success('Verträge gelöscht');
    } catch (err) {
      console.error('Error bulk deleting contracts:', err);
      toast.error('Fehler beim Löschen der Verträge');
    }
  };

  // 📊 Excel Export Handler
  const handleExportExcel = async () => {
    // ✅ Enterprise-Check: Excel Export nur für Enterprise
    const isEnterprise = userInfo.subscriptionPlan === 'enterprise';
    if (!isEnterprise) {
      toast.warning('Excel-Export ist ein Enterprise-Feature. Upgrade für diese Funktion!');
      window.location.href = '/pricing';
      return;
    }

    if (contracts.length === 0) {
      toast.info('Keine Verträge zum Exportieren vorhanden');
      return;
    }

    try {

      // Fetch Excel file from backend
      const response = await fetch('/api/contracts/export-excel', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'Contract_AI_Portfolio.xlsx';
      if (contentDisposition) {
        // FIX: Korrekte Regex die Quotes NICHT mit captured
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=\s*["']?([^"';\n]+)["']?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].trim();
        }
      }

      // Download file with correct MIME type
      const blob = await response.blob();

      // Create blob with explicit MIME type for Excel
      const typedBlob = new Blob([blob], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });

      const url = window.URL.createObjectURL(typedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);

    } catch (error) {
      console.error('❌ [Excel Export] Error:', error);
      toast.error('Excel-Export fehlgeschlagen. Bitte versuche es später erneut.');
    }
  };

  // 📦 Bulk ZIP Download Handler
  const handleBulkDownloadZip = async () => {
    // ✅ Premium-Check: Bulk Download für Business/Enterprise
    const hasPaidPlan = userInfo.subscriptionPlan === 'business' || userInfo.subscriptionPlan === 'enterprise';
    if (!hasPaidPlan) {
      toast.warning('Bulk-Download ist ein Business/Enterprise-Feature. Upgrade für diese Funktion!');
      window.location.href = '/pricing';
      return;
    }

    if (selectedContracts.length === 0) {
      toast.info('Keine Verträge ausgewählt');
      return;
    }

    if (selectedContracts.length > 100) {
      toast.warning('Maximal 100 Verträge gleichzeitig downloadbar');
      return;
    }

    try {

      // Fetch ZIP file from backend
      const response = await fetch('/api/contracts/bulk-download', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ contractIds: selectedContracts })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Get filename from response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'Contract_AI_Vertraege.zip';
      if (contentDisposition) {
        // FIX: Korrekte Regex die Quotes NICHT mit captured
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=\s*["']?([^"';\n]+)["']?/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].trim();
        }
      }

      // Download file with correct MIME type
      const blob = await response.blob();

      // Create blob with explicit MIME type for ZIP
      const typedBlob = new Blob([blob], {
        type: 'application/zip'
      });

      const url = window.URL.createObjectURL(typedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);


      // Selection zurücksetzen nach erfolgreichem Download
      setSelectedContracts([]);
    } catch (error) {
      console.error('❌ [Bulk Download] Error:', error);
      toast.error('ZIP-Download fehlgeschlagen. Bitte versuche es später erneut.');
    }
  };

  // 🤖 Smart Folders Handlers
  interface SmartFolderSuggestion {
    name: string;
    icon: string;
    color: string;
    contracts: Array<{ _id: string; name: string }>;
  }

  const handleFetchSmartSuggestions = async (): Promise<SmartFolderSuggestion[]> => {
    try {
      const data = await apiCall('/folders/smart-suggest', {
        method: 'POST'
      }) as { suggestions?: SmartFolderSuggestion[] };

      return data.suggestions || [];
    } catch (err) {
      console.error('Error fetching smart suggestions:', err);
      throw err;
    }
  };

  const handleConfirmSmartFolders = async (suggestions: SmartFolderSuggestion[]) => {
    try {
      await apiCall('/folders/smart-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestions })
      });

      await fetchFolders(true); // ✅ Force refresh nach Smart Folder Erstellung
      await fetchContracts();
    } catch (err) {
      console.error('Error creating smart folders:', err);
      throw err;
    }
  };

  // ✅ NEU: Legacy-Modal Komponente
  const LegacyModal = ({ 
    contract, 
    message, 
    onClose, 
    onReupload 
  }: {
    contract: Contract;
    message: string;
    onClose: () => void;
    onReupload: () => void;
  }) => (
    <AnimatePresence>
      <motion.div 
        className={styles.modalOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className={styles.legacyModal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.modalHeader}>
            <div className={styles.modalIcon}>
              <AlertCircle size={24} className={styles.legacyIcon} />
            </div>
            <h3>Vertrag nicht verfügbar</h3>
            <button 
              className={styles.modalCloseButton}
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>

          <div className={styles.modalContent}>
            <div className={styles.legacyInfo}>
              <div className={styles.contractInfo}>
                <h4>{fixUtf8Display(contract.name)}</h4>
                <p className={styles.contractDate}>
                  Hochgeladen am: {formatDate(contract.createdAt)}
                </p>
              </div>
              
              <div className={styles.legacyMessage}>
                <p>{message}</p>
              </div>
              
              <div className={styles.legacyExplanation}>
                <h5>Warum ist das passiert?</h5>
                <p>
                  Dieser Vertrag wurde hochgeladen, bevor wir auf Cloud-Speicher umgestellt haben. 
                  Die lokalen Dateien werden bei Server-Updates automatisch gelöscht.
                </p>
              </div>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button 
              className={`${styles.modalActionButton} ${styles.primaryAction}`}
              onClick={onReupload}
            >
              <Upload size={16} />
              <span>Vertrag erneut hochladen</span>
            </button>
            
            <button 
              className={styles.modalActionButton}
              onClick={onClose}
            >
              <X size={16} />
              <span>Schließen</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // ✅ NEU: Duplikat-Modal Komponente
  const DuplicateModal = ({
    fileItem,
    existingContract,
    onClose,
    onViewExisting,
    onReplaceFile,
    onAnalyzeAnyway
  }: {
    fileItem: UploadFileItem;
    existingContract: Contract;
    onClose: () => void;
    onViewExisting: () => void;
    onReplaceFile: () => void;
    onAnalyzeAnyway: () => void;
  }) => (
    <AnimatePresence>
      <motion.div
        className={styles.modalOverlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        onTouchMove={(e) => {
          // Nur Scroll innerhalb modalContent erlauben
          const target = e.target as HTMLElement;
          if (!target.closest('[class*="modalContent"]')) {
            e.preventDefault();
          }
        }}
      >
        <motion.div
          className={styles.duplicateModal}
          initial={{ opacity: 0, y: '100%' }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: '100%' }}
          transition={{ type: 'spring', damping: 30, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ✅ Modernisierter Header mit Badge */}
          <div className={styles.modalHeader}>
            <div className={styles.modalIconWrapper}>
              <div className={styles.modalIconBadge}>
                <AlertCircle size={28} className={styles.duplicateIcon} />
              </div>
            </div>
            <h3>Duplikat erkannt</h3>
            <p className={styles.modalSubtitle}>Diese Datei existiert bereits in deiner Verwaltung</p>
            <button
              className={styles.modalCloseButton}
              onClick={onClose}
              aria-label="Schließen"
            >
              <X size={20} />
            </button>
          </div>

          {/* ✅ Verbesserter File-Vergleich mit Card-Design */}
          <div className={styles.modalContent}>
            <div className={styles.fileComparisonGrid}>
              <motion.div
                className={styles.fileCard}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className={styles.fileCardHeader}>
                  <FileText size={20} className={styles.fileCardIcon} />
                  <span className={styles.fileCardLabel}>Neue Datei</span>
                </div>
                <div className={styles.fileCardBody}>
                  <div className={styles.fileCardName}>{fileItem.file.name}</div>
                  <div className={styles.fileCardMeta}>
                    {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </motion.div>

              <div className={styles.fileComparisonDivider}>
                <div className={styles.fileComparisonArrow}>
                  <ArrowRight size={20} />
                </div>
              </div>

              <motion.div
                className={`${styles.fileCard} ${styles.fileCardExisting}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className={styles.fileCardHeader}>
                  <CheckCircle size={20} className={styles.fileCardIcon} />
                  <span className={styles.fileCardLabel}>Bereits vorhanden</span>
                </div>
                <div className={styles.fileCardBody}>
                  <div className={styles.fileCardName}>
                    {existingContract?.name || 'Unbenannt'}
                  </div>
                  <div className={styles.fileCardMeta}>
                    {existingContract?.createdAt ? formatDate(existingContract.createdAt) : '—'}
                    {existingContract?.analyzed && (
                      <span className={styles.analyzedBadge}>
                        <CheckCircle size={12} />
                        Analysiert
                      </span>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          {/* ✅ Modernisierte Action-Buttons mit Grid-Layout */}
          <div className={styles.modalActions}>
            <motion.button
              className={`${styles.modalActionCard} ${styles.actionView}`}
              onClick={onViewExisting}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={styles.actionCardIcon}>
                <Eye size={20} />
              </div>
              <div className={styles.actionCardContent}>
                <div className={styles.actionCardTitle}>Vertrag öffnen</div>
                <div className={styles.actionCardDescription}>Details anzeigen</div>
              </div>
            </motion.button>

            <motion.button
              className={`${styles.modalActionCard} ${styles.actionAnalyze}`}
              onClick={onAnalyzeAnyway}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={styles.actionCardIcon}>
                <RefreshCw size={20} />
              </div>
              <div className={styles.actionCardContent}>
                <div className={styles.actionCardTitle}>Neu analysieren</div>
                <div className={styles.actionCardDescription}>Erneute KI-Analyse</div>
              </div>
            </motion.button>

            <motion.button
              className={`${styles.modalActionCard} ${styles.actionReplace}`}
              onClick={onReplaceFile}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className={styles.actionCardIcon}>
                <Upload size={20} />
              </div>
              <div className={styles.actionCardContent}>
                <div className={styles.actionCardTitle}>Datei ersetzen</div>
                <div className={styles.actionCardDescription}>Alte Datei überschreiben</div>
              </div>
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // ✅ KORRIGIERT: User-Info laden mit 3-Stufen-Preismodell & Caching
  const fetchUserInfo = async (force: boolean = false) => {
    try {
      // ✅ Cache-Check: Nur alle 30 Sekunden neu laden (außer force=true)
      const now = Date.now();
      const cacheAge = now - userInfoCacheRef.current.timestamp;
      const CACHE_DURATION = 30000; // 30 Sekunden

      if (!force && userInfoCacheRef.current.data && cacheAge < CACHE_DURATION) {
        setUserInfo(userInfoCacheRef.current.data);
        return;
      }

      const response = await apiCall("/auth/me") as {
        user: {
          subscriptionPlan: string;
          isPremium: boolean;
          analysisCount: number;
          analysisLimit?: number; // Backend sendet jetzt Limit mit!
          emailInboxAddress?: string | null;
          emailInboxEnabled?: boolean;
          customEmailAlias?: string | null;
        }
      };

      const plan = response.user?.subscriptionPlan as 'free' | 'business' | 'enterprise' || 'free';
      const isPremium = response.user?.isPremium || plan === 'business' || plan === 'enterprise';
      const analysisCount = response.user?.analysisCount || 0;

      // ✅ KORRIGIERT: Limits laut Preisliste
      // Nutze Backend-Wert wenn vorhanden, sonst Fallback
      let analysisLimit = response.user?.analysisLimit ?? 3;
      if (!response.user?.analysisLimit) {
        if (plan === 'free') analysisLimit = 3;           // ✅ Free: 3 Analysen (einmalig)
        else if (plan === 'business') analysisLimit = 25; // 📊 Business: 25 pro Monat
        else if (plan === 'enterprise') analysisLimit = Infinity; // ♾️ Enterprise: Unbegrenzt
      }

      const newUserInfo: UserInfo = {
        subscriptionPlan: plan,
        isPremium,
        analysisCount,
        analysisLimit,
        // 📧 E-Mail-Inbox Feature
        emailInboxAddress: response.user?.emailInboxAddress || null,
        emailInboxEnabled: response.user?.emailInboxEnabled ?? true,
        customEmailAlias: response.user?.customEmailAlias || null
      };

      // ✅ Cache aktualisieren
      userInfoCacheRef.current = {
        data: newUserInfo,
        timestamp: now
      };

      setUserInfo(newUserInfo);

    } catch {
      setUserInfo({
        subscriptionPlan: 'free',
        isPremium: false,
        analysisCount: 0,
        analysisLimit: 3  // ✅ Free: 3 Analysen
      });
    }
  };

  // ✅ Verbesserte fetchContracts mit Pagination & Filtern (Infinite Scroll)
  // 🚀 Mit Race Condition Prevention via Request-ID
  const fetchContracts = async (): Promise<Contract[] | null> => {
    // 🚀 Request-ID inkrementieren um veraltete Responses zu ignorieren
    const currentRequestId = ++fetchRequestIdRef.current;

    try {
      setLoading(true);
      setRefreshing(true);

      // ✅ NEU: Filter-Parameter ans Backend senden
      const params = new URLSearchParams({
        limit: '50',
        skip: '0',
        search: searchQuery,
        status: statusFilter,
        dateFilter: dateFilter,
        sort: isBackendSort(sortOrder) ? sortOrder : 'neueste', // Slot-Sort nur Frontend
        source: sourceFilter
      });

      // ✅ Folder-Filter
      if (activeFolder !== null) {
        params.append('folderId', activeFolder);
      }

      const response = await apiCall(`/contracts?${params.toString()}`) as {
        contracts: Contract[];
        pagination: {
          total: number;
          limit: number;
          skip: number;
          hasMore: boolean;
        };
        sidebarCounts?: { total: number; baldAblaufend: number; aktiv: number; ohneOrdner: number; abgelaufen: number; gekuendigt: number; neu: number; entwurf: number; optimiert: number };
      };

      // 🚀 Race Condition Check: Ignoriere Response wenn neuerer Request gestartet wurde
      if (currentRequestId !== fetchRequestIdRef.current) {
        return null;
      }

      setContracts(response.contracts);
      setError(null);

      // ✅ Pagination-Info speichern
      setPaginationInfo({
        total: response.pagination.total,
        hasMore: response.pagination.hasMore,
        currentSkip: response.pagination.skip
      });

      // 📊 Sidebar-Counts vom Backend (stabil, unabhängig von Filtern)
      if (response.sidebarCounts) {
        setSidebarCounts(prev => ({ ...prev, ...response.sidebarCounts }));
      }

      return response.contracts;
    } catch (err) {
      // 🚀 Nur Error setzen wenn dies noch der aktuelle Request ist
      if (currentRequestId === fetchRequestIdRef.current) {
        console.error("❌ Fehler beim Laden der Verträge:", err);
        setError("Die Verträge konnten nicht geladen werden. Bitte versuche es später erneut.");
        setContracts([]);
      }
      return null;
    } finally {
      // 🚀 Nur Loading-State ändern wenn dies der aktuelle Request ist
      if (currentRequestId === fetchRequestIdRef.current) {
        setLoading(false);
        setTimeout(() => setRefreshing(false), 600);
      }
    }
  };

  // ✅ NEU: Silent Refresh - aktualisiert Contracts ohne Loading-Skeleton (für nach Analyse)
  // 🔧 FIX: Optional contractId Parameter um Closure-Problem zu umgehen
  const silentRefreshContracts = async (forceUpdatePreviewId?: string): Promise<Contract[] | null> => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        skip: '0',
        search: searchQuery,
        status: statusFilter,
        dateFilter: dateFilter,
        sort: isBackendSort(sortOrder) ? sortOrder : 'neueste', // Slot-Sort nur Frontend
        source: sourceFilter
      });

      if (activeFolder !== null) {
        params.append('folderId', activeFolder);
      }

      const response = await apiCall(`/contracts?${params.toString()}`) as {
        contracts: Contract[];
        pagination: {
          total: number;
          limit: number;
          skip: number;
          hasMore: boolean;
        };
        sidebarCounts?: { total: number; baldAblaufend: number; aktiv: number; ohneOrdner: number; abgelaufen: number; gekuendigt: number; neu: number; entwurf: number; optimiert: number };
      };

      setContracts(response.contracts);
      setPaginationInfo({
        total: response.pagination.total,
        hasMore: response.pagination.hasMore,
        currentSkip: response.pagination.skip
      });

      // 📊 Sidebar-Counts aktualisieren
      if (response.sidebarCounts) {
        setSidebarCounts(prev => ({ ...prev, ...response.sidebarCounts }));
      }

      // 🔧 FIX: previewContract aktualisieren - nutze explizite ID oder aktuelle previewContract ID
      const previewIdToUpdate = forceUpdatePreviewId || previewContract?._id;
      if (previewIdToUpdate) {
        const updatedPreviewContract = response.contracts.find(c => c._id === previewIdToUpdate);
        if (updatedPreviewContract) {
          setPreviewContract(updatedPreviewContract);
        }
      }

      return response.contracts;
    } catch {
      return null;
    }
  };

  // ⚡ Schnellanalyse-Panel schließen (Helper für 3 Stellen)
  const closeQuickAnalysis = async () => {
    const analyzedContractId = quickAnalysisModal.contractId;
    setQuickAnalysisModal({ show: false, contractName: '', contractId: '', analysisResult: null });
    sessionStorage.removeItem('contractai_quickAnalysis');
    if (new URLSearchParams(location.search).has('quickAnalysis')) {
      navigate('/contracts', { replace: true });
    }
    await silentRefreshContracts(analyzedContractId);
  };

  // ✅ NEU: Load More Contracts für Infinite Scroll (mit Filtern)
  // 🚀 Mit Race Condition Prevention - ignoriert Response wenn Filter geändert wurde
  const loadMoreContracts = async () => {
    // Verhindere doppeltes Laden oder Laden wenn keine weiteren verfügbar
    if (loadingMore || !paginationInfo.hasMore) {
      return;
    }

    // 🚀 Speichere aktuelle Request-ID beim Start (NICHT inkrementieren!)
    const startRequestId = fetchRequestIdRef.current;

    try {
      setLoadingMore(true);

      // ✅ Nächste Seite: currentSkip + 50
      const nextSkip = paginationInfo.currentSkip + 50;

      // ✅ WICHTIG: Gleiche Filter wie bei fetchContracts verwenden!
      const params = new URLSearchParams({
        limit: '50',
        skip: nextSkip.toString(),
        search: searchQuery,
        status: statusFilter,
        dateFilter: dateFilter,
        sort: isBackendSort(sortOrder) ? sortOrder : 'neueste', // Slot-Sort nur Frontend
        source: sourceFilter
      });

      // ✅ Folder-Filter
      if (activeFolder !== null) {
        params.append('folderId', activeFolder);
      }

      const response = await apiCall(`/contracts?${params.toString()}`) as {
        contracts: Contract[];
        pagination: {
          total: number;
          limit: number;
          skip: number;
          hasMore: boolean;
        };
      };

      // 🚀 Race Condition Check: Ignoriere wenn Filter sich geändert hat (neuer fetchContracts lief)
      if (startRequestId !== fetchRequestIdRef.current) {
        return;
      }

      // ✅ WICHTIG: Append (nicht replace!)
      setContracts(prev => [...prev, ...response.contracts]);

      // ✅ Pagination-Info aktualisieren
      setPaginationInfo({
        total: response.pagination.total,
        hasMore: response.pagination.hasMore,
        currentSkip: response.pagination.skip
      });

    } catch (err) {
      console.error("❌ Fehler beim Nachladen der Verträge:", err);
      // Fehler nicht als kritisch behandeln - User kann manuell neu laden
    } finally {
      // 🚀 Nur Loading-State ändern wenn Request noch relevant ist
      if (startRequestId === fetchRequestIdRef.current) {
        setLoadingMore(false);
      }
    }
  };

  // ✅ NEU: Bei Filter-Änderung Contracts neu laden (Backend filtert jetzt!)
  // 🚀 OPTIMIERT: Debounce für ALLE Filter um mehrfache API-Calls zu verhindern
  useEffect(() => {
    // Überspringe First Mount (Initial Load useEffect übernimmt das)
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    // ✅ FIX: Reset hasScrolledRef bei Filter-Änderung für Infinite Scroll
    hasScrolledRef.current = false;

    // 🚀 Debounce für ALLE Filter-Änderungen (verhindert 5-10x unnötige API-Calls)
    // - 400ms für Suche (Tippen)
    // - 150ms für andere Filter (schnelles Klicken)
    const debounceTime = searchQuery ? 400 : 150;

    const debounceTimer = setTimeout(() => {
      fetchContracts();
    }, debounceTime);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, statusFilter, dateFilter, sortOrder, sourceFilter, activeFolder]);

  // ✅ Initial Load
  useEffect(() => {
    fetchUserInfo();
    fetchContracts();
    fetchFolders(); // 📁 Load folders
  }, []);

  // 🆕 Refs für den Observer-Callback stets aktuell halten (jeder Render) — gegen Stale-Closure
  useEffect(() => {
    paginationInfoRef.current = paginationInfo;
    loadingMoreRef.current = loadingMore;
    loadMoreContractsRef.current = loadMoreContracts;
  });

  // 🆕 Infinite Scroll via CALLBACK-REF: React hängt den IntersectionObserver GARANTIERT genau dann
  // an, wenn das Sentinel ins DOM kommt (und ab beim Verschwinden). Das löst den Attach-Timing-Race,
  // der dazu führte, dass das Nachladen intermittierend "bei 50 hängen blieb".
  const sentinelRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    if (!node) return; // Sentinel verschwunden (loading/empty) → sauber abgehängt
    const isMobile = window.innerWidth <= 768;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        if (paginationInfoRef.current.hasMore && !loadingMoreRef.current) {
          loadMoreContractsRef.current?.();
        }
      },
      {
        root: isMobile ? null : contentAreaRef.current, // Desktop: contentArea scrollt; Mobile: Viewport
        rootMargin: '300px', // früh triggern (300px vor Ende)
        threshold: 0.01,
      }
    );
    observerRef.current.observe(node);
  }, []);

  // ✅ FIX: Wenn contracts sich ändern und ein Contract ausgewählt ist, aktualisiere selectedContract
  useEffect(() => {
    if (selectedContract && contracts.length > 0) {
      const updatedContract = contracts.find(c => c._id === selectedContract._id);
      if (updatedContract) {
        // Prüfe ob sich wichtige Felder geändert haben
        const hasChanges =
          updatedContract.paymentMethod !== selectedContract.paymentMethod ||
          updatedContract.paymentStatus !== selectedContract.paymentStatus ||
          updatedContract.paymentAmount !== selectedContract.paymentAmount ||
          updatedContract.paymentFrequency !== selectedContract.paymentFrequency;

        if (hasChanges) {
          setSelectedContract(updatedContract);
        }
      }
    }
  }, [contracts, selectedContract]);

  // ✅ KORRIGIERT: Mehrfach-Upload Handler mit Plan-Validierung + ANALYSE-FIX
  const handleMultipleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      // ✅ Reset Input auch bei Abbruch
      e.target.value = '';
      return;
    }

    // ✅ KORRIGIERT: Free-User dürfen 3 Analysen machen!
    // (Limit-Check erfolgt unten)

    // ✅ KORRIGIERT: Multi-Upload nur für Enterprise
    if (userInfo.subscriptionPlan !== 'enterprise' && files.length > 1) {
      toast.warning('Batch-Upload ist nur für Enterprise-Nutzer verfügbar. Upgrade für diese Funktion!');
      e.target.value = ''; // ✅ Reset Input
      return;
    }

    // ✅ KORRIGIERT: Analyse-Limit Check
    if (userInfo.analysisCount >= userInfo.analysisLimit && userInfo.analysisLimit !== Infinity) {
      toast.warning(`Analyse-Limit erreicht (${userInfo.analysisCount}/${userInfo.analysisLimit}). Upgrade für mehr Analysen!`);
      e.target.value = ''; // ✅ Reset Input
      return;
    }

    // ✅ Dateien zu Upload-Liste hinzufügen
    const newUploadFiles: UploadFileItem[] = Array.from(files).map((file, index) => ({
      id: `${Date.now()}_${index}`,
      file,
      status: 'pending',
      progress: 0
    }));

    setUploadFiles(newUploadFiles);

    // ✅ CRITICAL FIX: selectedFile für Single-Upload setzen
    if (files.length === 1) {
      setSelectedFile(files[0]); // ⭐ DAS FEHLTE!
    }

    setActiveSection('upload');

    // ✅ Input-Reset erfolgt jetzt in activateFileInput() VOR dem Klick
  };

  // ✅ KORRIGIERT: Normale Funktionen OHNE Event-Parameter
  const removeUploadFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(item => item.id !== fileId));
  };

  const clearAllUploadFiles = () => {
    setUploadFiles([]);
    setIsAnalyzing(false);
  };

  // ✅ NEU: Legacy-Modal Handler
  const handleLegacyReupload = () => {
    setLegacyModal(null);
    setActiveSection('upload');
    // Optional: Scroll zum Upload-Bereich
    setTimeout(() => {
      const uploadSection = document.querySelector('[data-section="upload"]');
      if (uploadSection) {
        uploadSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  // ✅ NEU: Duplikat-Aktionen Handler
  const handleDuplicateAction = (fileItem: UploadFileItem) => {
    const existingContract = fileItem.duplicateInfo?.existingContract;

    if (!existingContract) return; // ✅ Safety check

    setDuplicateModal({
      show: true,
      fileItem,
      existingContract
    });
  };

  // ✅ Upload-Flow. autoAnalyze=true → Default: direkt analysieren (Absicht der Besucher).
  // autoAnalyze=false → "Nur speichern" (Erfolgs-Modal mit Analysieren/Überspringen-Wahl).
  const handleUploadOnly = async (autoAnalyze = false) => {

    const filesToUpload = uploadFiles.filter(f => f.status === 'pending');

    if (filesToUpload.length === 0) {
      return;
    }

    setIsAnalyzing(true); // Reuse existing loading state
    const uploadedContracts: Array<{ _id: string; name: string; uploadedAt: string }> = [];

    try {
      for (const fileItem of filesToUpload) {
        try {
          // Update status - nur Upload, keine Analyse
          setUploadFiles(prev => prev.map(item =>
            item.id === fileItem.id
              ? { ...item, status: 'uploading', progress: 50 }
              : item
          ));


          // Upload ohne Analyse
          const result = await uploadOnly(
            fileItem.file,
            (progress) => {
              setUploadFiles(prev => prev.map(item =>
                item.id === fileItem.id
                  ? { ...item, status: 'uploading', progress }
                  : item
              ));
            }
          ) as UploadOnlyResult;

          // ✅ Handle duplicate detection
          if (result?.duplicate && result?.existingContract) {
            const duplicateInfo: AnalysisResult = {
              success: false,
              duplicate: true,
              existingContract: result.existingContract,
              message: result.message
            };
            setUploadFiles(prev => prev.map(item =>
              item.id === fileItem.id
                ? { ...item, status: 'duplicate', progress: 100, duplicateInfo }
                : item
            ));
          } else if (result?.success && result?.contract) {
            setUploadFiles(prev => prev.map(item =>
              item.id === fileItem.id
                ? { ...item, status: 'completed', progress: 100, contractId: result.contract._id }
                : item
            ));

            uploadedContracts.push(result.contract);
          }

        } catch (error) {
          console.error(`❌ Upload error for ${fileItem.file.name}:`, error);
          setUploadFiles(prev => prev.map(item =>
            item.id === fileItem.id
              ? { ...item, status: 'error', progress: 0, error: error instanceof Error ? error.message : 'Upload failed' }
              : item
          ));
        }
      }

      if (uploadedContracts.length > 0) {
        // 🎉 Celebration NUR beim ERSTEN Upload! (nicht bei jedem)
        if (!onboardingState?.checklist?.firstContractUploaded) {
          celebrate('first-upload', false);
        }

        // 🎓 Onboarding: Sync triggern um Checklist zu aktualisieren
        triggerOnboardingSync();

        if (autoAnalyze) {
          // 🚀 Default-Pfad: direkt analysieren (kein Zwischen-Modal) — exakt dieselbe
          // bewährte Sequenz wie "Analysieren" im Erfolgs-Modal. Schließt das Aktivierungs-Leck.
          await analyzeUploadedContracts(uploadedContracts);
        } else {
          // "Nur speichern": Erfolgs-Modal mit Analysieren/Überspringen-Wahl
          setUploadSuccessModal({
            show: true,
            uploadedContracts
          });
        }
      }

    } finally {
      setIsAnalyzing(false);
    }
  };

  // ✅ FIXED: Analyse-Aktion aus Success Modal - NUTZT NEUE /api/analyze ROUTE!
  const handleAnalyzeFromModal = async () => {
    const contractsToAnalyze = uploadSuccessModal.uploadedContracts;
    setUploadSuccessModal({ show: false, uploadedContracts: [] });
    await analyzeUploadedContracts(contractsToAnalyze);
  };

  // 🚀 Analysiert frisch hochgeladene Verträge über den bewährten uploadAndAnalyze-Pfad.
  // Wird genutzt vom Erfolgs-Modal ("Analysieren") UND vom Default-Upload ("Hochladen & analysieren").
  const analyzeUploadedContracts = async (contractsToAnalyze: Array<{ _id: string; name: string }>) => {
    if (contractsToAnalyze.length === 0) {
      return;
    }

    // Update UI: Setze Upload-Files auf "analyzing"
    setUploadFiles(prev => prev.map(item =>
      item.status === 'completed'
        ? { ...item, status: 'analyzing', progress: 0 }
        : item
    ));

    setIsAnalyzing(true);

    try {
      // Analysiere jeden hochgeladenen Vertrag MIT DER NEUEN ROUTE!
      for (let i = 0; i < contractsToAnalyze.length; i++) {
        const contract = contractsToAnalyze[i];

        // Finde die entsprechende Datei im uploadFiles State.
        // 🛡️ Primär über die stabile Contract-ID matchen (robust gegen Backend-Bereinigung
        // kaputter Dateinamen wie "$value.pdf" → "Dokument"); Dateiname nur noch als Fallback.
        const uploadFileItem =
          uploadFiles.find(item => item.contractId === contract._id) ||
          uploadFiles.find(item => item.file.name === contract.name);

        if (!uploadFileItem) {
          console.error(`❌ File not found in uploadFiles for: ${contract.name}`);
          toast.error('Analyse konnte nicht gestartet werden. Bitte über die Vertragsliste analysieren.');
          continue;
        }

        // 🔍 Overlay zeigen mit der aktuellen Datei
        setAnalyzingOverlay({
          show: true,
          contractName: fixUtf8Display(contract.name),
          pdfFile: uploadFileItem.file,
          progress: 0
        });

        // Update progress
        const progressPercent = Math.round(((i + 1) / contractsToAnalyze.length) * 100);
        setUploadFiles(prev => prev.map((item, idx) =>
          item.status === 'analyzing' && idx === i
            ? { ...item, progress: progressPercent }
            : item
        ));

        // 🎨 Smooth progress animation variables (declared outside try/catch for cleanup)
        let currentProgress = 0;
        let progressIntervalId: NodeJS.Timeout | null = null;

        try {
          // ✅ NUTZE DIE NEUE /api/analyze ROUTE MIT forceReanalyze=true!

          // Start smooth progress animation
          progressIntervalId = setInterval(() => {
            setUploadFiles(prev => prev.map((item, idx) => {
              if (item.status === 'analyzing' && idx === i) {
                // Increment progress smoothly, but slow down as we approach thresholds
                let increment = 1;

                // Slow down near step boundaries to avoid jumping ahead
                if (currentProgress >= 10 && currentProgress < 15) increment = 0.5;
                else if (currentProgress >= 30 && currentProgress < 35) increment = 0.5;
                else if (currentProgress >= 50 && currentProgress < 55) increment = 0.5;
                else if (currentProgress >= 80 && currentProgress < 85) increment = 0.5;
                else if (currentProgress >= 95) increment = 0.2; // Very slow near completion

                currentProgress = Math.min(currentProgress + increment, 99); // Cap at 99%

                return { ...item, progress: Math.round(currentProgress) };
              }
              return item;
            }));
            // 🔍 Overlay-Progress synchron aktualisieren
            setAnalyzingOverlay(prev => prev.show ? { ...prev, progress: Math.round(currentProgress) } : prev);
          }, 200); // Update every 200ms for smooth animation

          const analysisResult = await uploadAndAnalyze(uploadFileItem.file, (progress) => {
            // This callback may not be called by backend, but we keep it for compatibility
            if (progress > currentProgress) {
              currentProgress = progress;
            }
          }, true); // forceReanalyze = true!

          // Clear the progress interval
          if (progressIntervalId) {
            clearInterval(progressIntervalId);
          }


          // ✅ SOFORT die Analyse-Ergebnisse in uploadFiles speichern!
          setUploadFiles(prev => prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'completed' as const,
                  progress: 100,
                  analyzed: true,
                  result: analysisResult as AnalysisResult // ✅ HIER werden die Ergebnisse gespeichert!
                }
              : item
          ));
        } catch (error) {
          // Clear the progress interval on error
          if (progressIntervalId) {
            clearInterval(progressIntervalId);
          }

          console.error(`❌ Analysis failed for ${contract.name}:`, error);

          // Extrahiere Fehler-Meldung
          const errorMessage = error instanceof Error ? error.message : 'Analyse fehlgeschlagen';
          const isLimitError = errorMessage.includes('Limit erreicht') || errorMessage.includes('LIMIT_EXCEEDED');
          const isDocumentTooLarge = errorMessage.includes('zu groß für die Free') || errorMessage.includes('zu groß für die Analyse') || errorMessage.includes('zu komplex');

          // Markiere Datei als fehlgeschlagen
          setUploadFiles(prev => prev.map((item, idx) =>
            idx === i
              ? {
                  ...item,
                  status: 'error' as const,
                  progress: 0,
                  errorMessage: errorMessage
                }
              : item
          ));

          // Zeige Fehler-Toast mit Upgrade-Hinweis
          if (isLimitError) {
            toast.warning(`Analyse-Limit erreicht (${userInfo.analysisCount}/${userInfo.analysisLimit === Infinity ? '∞' : userInfo.analysisLimit}). Upgrade für mehr Analysen!`);
          } else if (isDocumentTooLarge && !userInfo.isPremium) {
            toast.warning('Dokument zu groß für die Free-Version. Upgrade auf Business für größere Verträge!');
          } else {
            toast.error(`Analyse fehlgeschlagen: ${errorMessage}`);
          }
        }
      }

      // ✅ Cleanup: Falls Dateien bei "analyzing" hängengeblieben sind, zurücksetzen
      setUploadFiles(prev => prev.map(item =>
        item.status === 'analyzing'
          ? { ...item, status: 'completed', progress: 100 }
          : item
      ));

      // ✅ Refresh contracts list
      await fetchContracts();

      // 📅 Invalidiere Kalender-Cache - neue Events wurden generiert!
      clearCalendarCache();

      // ✅ WECHSEL zur Upload-Seite - zeigt SOFORT die Analyse-Ergebnisse!
      setActiveSection('upload');

      // 🎉 Celebration NUR bei der ERSTEN Analyse! (nicht bei jeder)
      if (!onboardingState?.checklist?.firstAnalysisComplete) {
        celebrate('first-analysis');
      }

      // 🎓 Onboarding: Sync triggern um Checklist zu aktualisieren
      triggerOnboardingSync();


    } catch (error) {
      console.error("❌ Error during analysis:", error);
      toast.error('Fehler bei der Analyse. Bitte versuche es erneut.');

      // On error: Stay on contracts view
      setActiveSection('contracts');
    } finally {
      setIsAnalyzing(false);
      setAnalyzingOverlay({ show: false, contractName: '', progress: 0 });
    }
  };

  // ✅ NEU: Skip-Aktion aus Success Modal
  const handleSkipAnalysis = async () => {
    setUploadSuccessModal({ show: false, uploadedContracts: [] });

    // Clear upload files und refresh contracts list
    clearAllUploadFiles();

    // ✅ Wichtig: Warte auf fetchContracts, damit neue Verträge sichtbar werden
    await fetchContracts();

    setActiveSection('contracts');
  };

  // ✅ NEU: Nachträgliche Analyse für bestehenden Vertrag
  const handleAnalyzeExistingContract = async (contract: Contract) => {

    // Prüfe ob bereits am Analysieren
    if (analyzingContract[contract._id]) {
      return;
    }

    // Check subscription & limits - Free hat 3 Analysen, nicht 0!
    if (userInfo.analysisCount >= userInfo.analysisLimit && userInfo.analysisLimit !== Infinity) {
      toast.warning(`Analyse-Limit erreicht (${userInfo.analysisCount}/${userInfo.analysisLimit}). Upgrade für mehr Analysen!`);
      return;
    }

    // Setze Loading States - Button UND Full-Screen Overlay
    setAnalyzingContract(prev => ({ ...prev, [contract._id]: true }));
    setAnalyzingOverlay({ show: true, contractName: fixUtf8Display(contract.name), progress: 0 });

    // 🔍 Simulierter Progress für bestehendes Vertrag-Overlay
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      let increment = 1;
      if (currentProgress >= 10 && currentProgress < 15) increment = 0.5;
      else if (currentProgress >= 30 && currentProgress < 35) increment = 0.5;
      else if (currentProgress >= 50 && currentProgress < 55) increment = 0.5;
      else if (currentProgress >= 80 && currentProgress < 85) increment = 0.5;
      else if (currentProgress >= 95) increment = 0.2;
      currentProgress = Math.min(currentProgress + increment, 99);
      setAnalyzingOverlay(prev => prev.show ? { ...prev, progress: Math.round(currentProgress) } : prev);
    }, 200);

    try {
      setError(null);

      // API URL - nutze die korrekte Produktions-URL
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');

      if (!token) {
        throw new Error('Nicht eingeloggt. Bitte melden Sie sich erneut an.');
      }


      // Trigger Re-Analyse via Backend
      const response = await fetch(`${apiUrl}/api/contracts/${contract._id}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Prüfe auf Netzwerkfehler
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
        throw new Error(errorData.message || `Server-Fehler: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {

        // 📅 Invalidiere Kalender-Cache - neue Events wurden generiert!
        clearCalendarCache();

        // ✅ Silent Refresh - ohne Loading-Skeleton (damit UI nicht springt)
        let refreshedContracts = await silentRefreshContracts();

        // 🚀 FIX: Wenn Silent Refresh fehlschlägt, mache regulären Refresh
        if (!refreshedContracts) {
          refreshedContracts = await fetchContracts();
        }

        await fetchUserInfo();

        // 🚀 FIX: Backend-Response PRIORISIEREN - hat ALLE Analyse-Felder (analysis, legalPulse)
        // Die Listen-Route gibt nicht alle Felder zurück!
        let updatedContract: Contract;
        if (data.contract) {
          // ✅ BESTE QUELLE: Backend-Response direkt nach Analyse - hat ALLE Felder
          updatedContract = data.contract;
          // 🔍 DEBUG: Prüfe ob analysis und legalPulse vorhanden sind
        } else {
          // Fallback: Aus der Liste oder alter Contract
          const foundContract = refreshedContracts?.find((c: Contract) => c._id === contract._id);
          if (foundContract) {
            updatedContract = foundContract;
          } else {
            // Letzter Fallback - sollte nie passieren
            updatedContract = { ...contract, analyzed: true };
          }
        }

        // ⚡ NEU: Öffne das ausführliche Analyse-Modal statt ContractDetailView
        const analysisResultData = {
          success: true,
          originalContractId: updatedContract._id,
          contractScore: updatedContract.analysis?.contractScore ?? updatedContract.contractScore,
          summary: updatedContract.analysis?.summary || updatedContract.summary,
          legalAssessment: updatedContract.analysis?.legalAssessment || updatedContract.legalAssessment,
          suggestions: updatedContract.analysis?.suggestions || updatedContract.suggestions,
          comparison: updatedContract.analysis?.comparison,
          positiveAspects: updatedContract.analysis?.positiveAspects,
          criticalIssues: updatedContract.analysis?.criticalIssues,
          recommendations: updatedContract.analysis?.recommendations,
          detailedLegalOpinion: updatedContract.analysis?.detailedLegalOpinion || updatedContract.detailedLegalOpinion,
          // Legacy Felder für Kompatibilität
          kuendigung: updatedContract.kuendigung,
          laufzeit: updatedContract.laufzeit,
          risiken: updatedContract.risiken,
          optimierungen: updatedContract.optimierungen,
          // 🔒 Freemium-Tease: Marker durchreichen, sonst zeigt der Sofort-Ergebnis-Screen
          // (ContractAnalysisV2 → V2TabsSection) kein Schloss. Daten sind server-seitig schon redigiert.
          gated: (updatedContract as { gated?: boolean }).gated,
          gatedCounts: (updatedContract as { gatedCounts?: unknown }).gatedCounts
        };

        setQuickAnalysisModal({
          show: true,
          contractName: updatedContract.name,
          contractId: updatedContract._id,
          analysisResult: analysisResultData
        });

        // Speichere für Back-Navigation-Wiederherstellung
        try {
          sessionStorage.setItem('contractai_quickAnalysis', JSON.stringify({
            contractName: updatedContract.name,
            contractId: updatedContract._id,
            analysisResult: analysisResultData
          }));
        } catch { /* sessionStorage voll oder nicht verfügbar */ }
        navigate(`/contracts?quickAnalysis=${updatedContract._id}`, { replace: true });


        // 🎓 Onboarding: Sync triggern um Checklist zu aktualisieren
        triggerOnboardingSync();
      } else {
        throw new Error(data.message || 'Analyse fehlgeschlagen');
      }

    } catch (error) {
      console.error("❌ Error analyzing existing contract:", error);
      const errorMsg = error instanceof Error ? error.message : 'Analyse fehlgeschlagen';
      setError(errorMsg);
      toast.error(`Analyse fehlgeschlagen: ${errorMsg}`);
    } finally {
      // Loading States zurücksetzen
      clearInterval(progressInterval);
      setAnalyzingContract(prev => ({ ...prev, [contract._id]: false }));
      setAnalyzingOverlay({ show: false, contractName: '', progress: 0 });
    }
  };

  const handleViewExistingContract = () => {
    if (!duplicateModal?.existingContract) return;

    // ✅ Wechsel zu Verträge-Tab und öffne Details
    setActiveSection('contracts');
    setSelectedContract(duplicateModal.existingContract);
    setShowDetails(true);
    setDuplicateModal(null);

    // ✅ UPDATE URL für Assistant-Context mit Query Parameter (triggert useLocation Hook!)
    navigate(`/contracts?view=${duplicateModal.existingContract._id}`, { replace: true });

    // ✅ Cleanup Upload
    if (duplicateModal.fileItem) {
      removeUploadFile(duplicateModal.fileItem.id);
    }
  };

  const handleReplaceExistingFile = async () => {
    if (!duplicateModal?.fileItem || !duplicateModal?.existingContract) return;
    
    try {
      // ✅ Lösche alten Vertrag
      await apiCall(`/contracts/${duplicateModal.existingContract._id}`, {
        method: 'DELETE'
      });
      
      
      // ✅ Starte neue Analyse
      handleAnalyzeAnywayFromDuplicate();
      
    } catch (error) {
      console.error("❌ Fehler beim Ersetzen:", error);
      toast.error('Fehler beim Ersetzen der Datei. Bitte versuche es erneut.');
    }
  };

  const handleAnalyzeAnywayFromDuplicate = async () => {
    if (!duplicateModal?.fileItem) return;
    const fileItem = duplicateModal.fileItem;

    // ✅ ROBUST FIX: Direkte Analyse statt setTimeout + startBatchAnalysis,
    // weil startBatchAnalysis() durch React-State-Closure den ALTEN uploadFiles-State
    // sieht (status noch 'duplicate' statt 'pending') → pendingFiles = [] → kein Call.
    // Diese Variante ruft uploadAndAnalyze direkt mit explizitem forceReanalyze=true.
    setDuplicateModal(null);
    setUploadFiles(prev => prev.map(item =>
      item.id === fileItem.id
        ? { ...item, status: 'analyzing', progress: 0, error: undefined, duplicateInfo: undefined }
        : item
    ));
    setIsAnalyzing(true);

    // 🔍 Full-Screen Overlay zeigen — dieselbe UX wie bei normalem Upload+Analyse
    // und bei Re-Analyse aus der Liste, statt nur winzige File-Item-Progress.
    setAnalyzingOverlay({
      show: true,
      contractName: fixUtf8Display(fileItem.file.name),
      pdfFile: fileItem.file,
      progress: 0,
    });

    // 🎨 Smooth Progress-Animation 0→99% — 1:1 dieselbe Stufung wie in
    // handleAnalyzeExistingContract, damit beide Re-Analyse-Wege identisch wirken.
    let currentProgress = 0;
    const progressInterval = setInterval(() => {
      let increment = 1;
      if (currentProgress >= 10 && currentProgress < 15) increment = 0.5;
      else if (currentProgress >= 30 && currentProgress < 35) increment = 0.5;
      else if (currentProgress >= 50 && currentProgress < 55) increment = 0.5;
      else if (currentProgress >= 80 && currentProgress < 85) increment = 0.5;
      else if (currentProgress >= 95) increment = 0.2;
      currentProgress = Math.min(currentProgress + increment, 99);
      const rounded = Math.round(currentProgress);
      setAnalyzingOverlay(prev => prev.show ? { ...prev, progress: rounded } : prev);
      setUploadFiles(prev => prev.map(item =>
        item.id === fileItem.id ? { ...item, progress: rounded } : item
      ));
    }, 200);

    try {
      const result = await uploadAndAnalyze(
        fileItem.file,
        () => { /* Progress läuft via Interval — Backend liefert keinen echten Progress */ },
        true // ✅ forceReanalyze EXPLICIT — Backend überspringt Duplikat-Check
      ) as AnalysisResult;

      clearInterval(progressInterval);

      if (result?.success) {
        setUploadFiles(prev => prev.map(item =>
          item.id === fileItem.id
            ? { ...item, status: 'completed', progress: 100, analyzed: true, result }
            : item
        ));
        clearCalendarCache();

        // 🚀 Direkt zum QuickAnalysis-Modal mit dem frischen Ergebnis springen —
        // genau dieselbe Übergabe wie in handleAnalyzeExistingContract.
        const refreshed = await fetchContracts();
        const fresh = result.contractId
          ? refreshed?.find(c => c._id === result.contractId)
          : null;

        if (fresh) {
          const analysisResultData = {
            success: true,
            originalContractId: fresh._id,
            contractScore: fresh.analysis?.contractScore ?? fresh.contractScore,
            summary: fresh.analysis?.summary || fresh.summary,
            legalAssessment: fresh.analysis?.legalAssessment || fresh.legalAssessment,
            suggestions: fresh.analysis?.suggestions || fresh.suggestions,
            comparison: fresh.analysis?.comparison,
            positiveAspects: fresh.analysis?.positiveAspects,
            criticalIssues: fresh.analysis?.criticalIssues,
            recommendations: fresh.analysis?.recommendations,
            detailedLegalOpinion: fresh.analysis?.detailedLegalOpinion || fresh.detailedLegalOpinion,
            kuendigung: fresh.kuendigung,
            laufzeit: fresh.laufzeit,
            risiken: fresh.risiken,
            optimierungen: fresh.optimierungen,
            // 🔒 Freemium-Tease durchreichen (siehe oben)
            gated: (fresh as { gated?: boolean }).gated,
            gatedCounts: (fresh as { gatedCounts?: unknown }).gatedCounts,
          };

          setQuickAnalysisModal({
            show: true,
            contractName: fresh.name,
            contractId: fresh._id,
            analysisResult: analysisResultData,
          });

          try {
            sessionStorage.setItem('contractai_quickAnalysis', JSON.stringify({
              contractName: fresh.name,
              contractId: fresh._id,
              analysisResult: analysisResultData,
            }));
          } catch { /* sessionStorage voll oder nicht verfügbar */ }
          navigate(`/contracts?quickAnalysis=${fresh._id}`, { replace: true });

          // File-Item aus Upload-Liste entfernen — Vertrag liegt jetzt in der Liste,
          // sonst hängt er doppelt.
          removeUploadFile(fileItem.id);

          triggerOnboardingSync();
        } else {
          // Fallback falls fetchContracts den frischen Vertrag nicht zurückgibt
          // (Race-Condition / Filter-Mismatch) — bleibe auf Upload-Liste mit Toast.
          toast.success('Vertrag wurde neu analysiert!');
        }
      } else if (result?.duplicate) {
        // Sollte mit forceReanalyze=true nicht mehr passieren — Safety-Fallback
        setUploadFiles(prev => prev.map(item =>
          item.id === fileItem.id
            ? { ...item, status: 'duplicate', progress: 100, duplicateInfo: result }
            : item
        ));
        toast.error('Vertrag wurde trotz Force-Reanalyze als Duplikat erkannt. Bitte erneut versuchen.');
      } else {
        setUploadFiles(prev => prev.map(item =>
          item.id === fileItem.id
            ? { ...item, status: 'completed', progress: 100, result }
            : item
        ));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setUploadFiles(prev => prev.map(item =>
        item.id === fileItem.id
          ? { ...item, status: 'error', progress: 0, error: errorMessage }
          : item
      ));
      toast.error(`Fehler bei der Analyse: ${errorMessage}`);
      console.error(`❌ Re-Analyse-Fehler für ${fileItem.file.name}:`, error);
    } finally {
      clearInterval(progressInterval);
      setIsAnalyzing(false);
      setAnalyzingOverlay({ show: false, contractName: '', progress: 0 });
      // User-Info aktualisieren (analysisCount hat sich geändert);
      // fetchContracts ist bereits im Success-Branch erfolgt.
      setTimeout(() => {
        fetchUserInfo(true);
      }, 1000);
    }
  };

  // ℹ️ startBatchAnalysis wurde am 04.05.2026 entfernt — war nur vom alten
  // Duplikat-Modal-Pfad aufgerufen, der jetzt direkt in
  // handleAnalyzeAnywayFromDuplicate inline analysiert (siehe Bug-Fix Commit
  // 6bb6b28f: setTimeout-Closure-Problem mit altem uploadFiles-State).
  // Falls künftig ein "Alle Verträge analysieren"-Batch-Button gebraucht wird:
  // Logik aus dem Git-History (vor Commit 6bb6b28f) wieder hervorholen.

  // ✅ KORRIGIERT: Normale retry Funktion
  const retryFileAnalysis = async (fileId: string) => {
    const fileItem = uploadFiles.find(item => item.id === fileId);
    if (!fileItem) return;

    // ✅ KORRIGIERT: Limit-Check vor Retry
    const remainingAnalyses = userInfo.analysisLimit === Infinity 
      ? Infinity 
      : userInfo.analysisLimit - userInfo.analysisCount;
    
    if (remainingAnalyses === 0) {
      toast.warning(`Analyse-Limit erreicht (${userInfo.analysisCount}/${userInfo.analysisLimit}). Upgrade für mehr Analysen!`);
      return;
    }

    try {
      setUploadFiles(prev => prev.map(item => 
        item.id === fileId 
          ? { ...item, status: 'analyzing', progress: 10, error: undefined }
          : item
      ));

      // ✅ forceReanalyze aus File-Item übergeben — auch beim Retry konsistent
      const result = await uploadAndAnalyze(
        fileItem.file,
        (progress) => {
          setUploadFiles(prev => prev.map(item =>
            item.id === fileId
              ? { ...item, progress }
              : item
          ));
        },
        fileItem.forceReanalyze
      ) as AnalysisResult;

      if (result?.success) {
        setUploadFiles(prev => prev.map(item =>
          item.id === fileId
            ? { ...item, status: 'completed', progress: 100, result }
            : item
        ));

        // 📅 Invalidiere Kalender-Cache - neue Events wurden generiert!
        clearCalendarCache();
      } else if (result?.duplicate) {
        setUploadFiles(prev => prev.map(item =>
          item.id === fileId
            ? { ...item, status: 'duplicate', progress: 100, duplicateInfo: result }
            : item
        ));
      } else {
        // 🆕 Defensive: Async-Polling-Pfad kann ein Result ohne success/duplicate liefern
        // → File-Item nicht ewig im "analyzing"-Spinner hängen lassen.
        setUploadFiles(prev => prev.map(item =>
          item.id === fileId
            ? { ...item, status: 'completed', progress: 100, result }
            : item
        ));
      }

      // ✅ User-Info aktualisieren (force=true weil analysisCount sich geändert hat)
      fetchUserInfo(true);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setUploadFiles(prev => prev.map(item => 
        item.id === fileId 
          ? { ...item, status: 'error', progress: 0, error: errorMessage }
          : item
      ));
    }
  };

  // ✅ KORRIGIERT: Drag & Drop Handler mit Plan-Validierung
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = e.dataTransfer.files;
      
      // ✅ KORRIGIERT: Free-User dürfen auch uploaden (3 Analysen)!
      // Limit-Check erfolgt beim Analysieren

      // ✅ KORRIGIERT: Multi-Upload nur für Enterprise
      if (userInfo.subscriptionPlan !== 'enterprise' && files.length > 1) {
        toast.warning('Batch-Upload ist nur für Enterprise-Nutzer verfügbar. Upgrade für diese Funktion!');
        return;
      }

      const newUploadFiles: UploadFileItem[] = Array.from(files).map((file, index) => ({
        id: `${Date.now()}_${index}`,
        file,
        status: 'pending',
        progress: 0
      }));

      setUploadFiles(newUploadFiles);
      
      // ✅ CRITICAL FIX: selectedFile für Single-Upload setzen (auch bei Drag&Drop)
      if (files.length === 1) {
        setSelectedFile(files[0]); // ⭐ DAS FEHLTE!
      }
      
      setActiveSection('upload');
    }
  };

  const handleReset = () => {
    setSelectedFile(null); // ✅ CRITICAL FIX: selectedFile auch zurücksetzen
    clearAllUploadFiles();
    setActiveSection('contracts');
    fetchContracts();
  };

  // 🆕 Single Click: Open Preview Panel | Double Click: Open Modal
  // 🆕 V2 Hybrid: Im Bulk-Mode toggelt Single-Click die Selection (statt Preview zu öffnen)
  const handleRowClick = (contract: Contract) => {
    handleRowMouseLeave(); // 👁️ Hover-Vorschau schließen, sobald geklickt wird (sonst klebt sie ggf. über Panel/Modal)
    if (bulkSelectMode) {
      toggleSelectContract(contract._id);
      return;
    }
    setPreviewContract(contract);
  };

  const handleRowDoubleClick = (contract: Contract) => {
    handleRowMouseLeave(); // 👁️ Hover-Vorschau schließen beim Öffnen des Detail-Modals
    // Double click opens full modal
    setSelectedContract(contract);
    setShowDetails(true);
    setOpenEditModalDirectly(false);
    setPreviewContract(null); // Close preview when modal opens

    // ✅ UPDATE URL für Assistant-Context mit Query Parameter
    navigate(`/contracts?view=${contract._id}`, { replace: true });
  };

  // ✅ OPTIMIERT: Löschfunktion mit Optimistic Update
  const handleDeleteContract = async (contractId: string, contractName: string) => {
    if (!confirm(`Möchtest du den Vertrag "${contractName}" wirklich löschen?`)) {
      return;
    }

    // 🚀 OPTIMISTIC UPDATE: Sofort aus UI entfernen für bessere UX
    const previousContracts = [...contracts];

    setContracts(prev => prev.filter(c => c._id !== contractId));
    setPaginationInfo(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    setShowDetails(false);

    // Wenn der gelöschte Contract ausgewählt war, Preview schließen
    if (selectedContract?._id === contractId) {
      setSelectedContract(null);
    }
    if (previewContract?._id === contractId) {
      setPreviewContract(null);
    }

    try {
      await apiCall(`/contracts/${contractId}`, {
        method: 'DELETE'
      });

      // 🔄 Hintergrund-Refresh, damit Sidebar-/Dropdown-Zähler nach dem Löschen sofort stimmen
      silentRefreshContracts();
    } catch (err) {
      // 🔄 ROLLBACK: Bei Fehler ursprünglichen State wiederherstellen
      console.error("❌ Fehler beim Löschen:", err);
      setContracts(previousContracts);
      setPaginationInfo(prev => ({ ...prev, total: prev.total + 1 }));
      toast.error('Fehler beim Löschen des Vertrags. Bitte versuche es erneut.');
    }
  };

  // ✅ Aktive Filter zählen
  const activeFiltersCount = () => {
    let count = 0;
    if (statusFilter !== 'alle') count++;
    if (dateFilter !== 'alle') count++;
    if (sourceFilter !== 'alle') count++; // ✅ Quelle-Filter
    if (activeFolder !== null) count++; // ✅ Folder-Filter
    return count;
  };

  // 📐 Sidebar Resize Handlers
  const handleSidebarResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = sidebarWidth ?? 272;

    const onMouseMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const delta = moveEvent.clientX - startX;
      const newWidth = Math.min(SIDEBAR_MAX, Math.max(SIDEBAR_MIN, startWidth + delta));
      setSidebarWidth(newWidth);
    };

    const onMouseUp = () => {
      isResizingRef.current = false;
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Speichern
      const current = sidebarWidth;
      if (current) localStorage.setItem(SIDEBAR_STORAGE_KEY, String(current));
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Sidebar-Breite in localStorage speichern wenn sich der Wert ändert
  useEffect(() => {
    if (sidebarWidth !== null) {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarWidth));
    }
  }, [sidebarWidth]);

  // ✅ Alle Filter zurücksetzen
  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter('alle');
    setDateFilter('alle');
    setSourceFilter('alle'); // ✅ Quelle zurücksetzen
    setSortOrder('neueste');
    setActiveFolder(null); // ✅ Folder zurücksetzen
  };

  // 📎 File-Type-Detection für den Vertragsname-Avatar
  // Pure, idempotent, defensiv gegen null/empty/whitespace/edge-cases
  const getFileType = (name?: string | null): { label: string; variant: 'pdf' | 'doc' | 'default' } => {
    if (!name || typeof name !== 'string') return { label: 'FILE', variant: 'default' };
    const trimmed = name.trim();
    if (!trimmed) return { label: 'FILE', variant: 'default' };
    const dotIdx = trimmed.lastIndexOf('.');
    if (dotIdx <= 0 || dotIdx === trimmed.length - 1) return { label: 'FILE', variant: 'default' };
    const ext = trimmed.slice(dotIdx + 1).toLowerCase();
    if (ext === 'pdf') return { label: 'PDF', variant: 'pdf' };
    if (ext === 'doc' || ext === 'docx') return { label: 'DOC', variant: 'doc' };
    return { label: 'FILE', variant: 'default' };
  };

  // 🎯 Intelligente Status-Berechnung basierend auf Vertragsdaten
  // ⚠️⚠️ MUSS 1:1 IDENTISCH bleiben mit calculateSmartStatusBackend (backend/routes/contracts.js)
  //      und der Kopie in Contracts.tsx (V1). Bei Änderung ALLE anpassen — sonst Drift
  //      zwischen Liste, Detail, Filter und Zähler.
  const calculateSmartStatus = (contract: Contract): string => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Kündigungsbestätigung = "Gekündigt"
    if (contract.documentCategory === 'cancellation_confirmation' || contract.gekuendigtZum) {
      const gekuendigtDate = contract.gekuendigtZum ? new Date(contract.gekuendigtZum) : null;
      if (gekuendigtDate) {
        gekuendigtDate.setHours(0, 0, 0, 0);
        if (gekuendigtDate < today) {
          return 'Beendet';
        }
        return 'Gekündigt';
      }
      return 'Gekündigt';
    }

    // 1.5 Contract wurde über Contract AI gekündigt (cancellationId vorhanden)
    if (contract.status === 'gekündigt' || contract.cancellationId) {
      if (contract.cancellationConfirmed) {
        return 'Gekündigt ✓';
      }
      return 'Gekündigt — offen';
    }

    // 2. Rechnung = "Bezahlt" oder "Offen"
    if (contract.documentCategory === 'invoice') {
      return contract.paymentStatus === 'paid' ? 'Bezahlt' : 'Offen';
    }

    // 2.5 🔒 MANUELLER OVERRIDE — nur wenn vom User gesetzt. Bewusst NACH Kündigung (1/1.5)
    // und Rechnung (2), damit echte Ereignisse nie verdeckt werden; VOR der Datums-Logik (3),
    // damit der manuelle Status nicht vom Ablaufdatum überschrieben wird.
    if (contract.statusOverride && typeof contract.status === 'string') {
      const s = contract.status.toLowerCase();
      if (s === 'aktiv' || s === 'gültig' || s === 'laufend' || s === 'active') return 'Aktiv';
      if (s === 'gekündigt' || s === 'gekuendigt') return 'Gekündigt';
      if (s === 'beendet' || s === 'abgelaufen' || s === 'expired') return 'Beendet';
      if (s === 'läuft ab' || s === 'bald fällig' || s === 'bald_ablaufend') return 'Läuft ab';
      if (s === 'pausiert') return 'Pausiert';
      if (s === 'entwurf' || s === 'draft') return 'Entwurf';
      return 'Aktiv'; // sicherer Fallback bei unbekanntem Wert
    }

    // 3. Prüfe Ablaufdatum
    const expiryDate = contract.expiryDate ? new Date(contract.expiryDate) : null;
    if (expiryDate) {
      expiryDate.setHours(0, 0, 0, 0);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Bereits abgelaufen
      if (daysUntilExpiry < 0) {
        // 🛡️ PLAUSIBILITY CHECK: Wenn Vertrag kürzlich hochgeladen wurde, aber expiryDate
        // weit in der Vergangenheit liegt, ist das wahrscheinlich ein Fehler bei der Datumserkennung
        // (z.B. Rechnungsdatum statt Vertragsende). Zeige dann "Aktiv" statt "Beendet".
        const createdAt = contract.createdAt ? new Date(contract.createdAt) : null;
        const daysSinceCreation = createdAt
          ? Math.ceil((today.getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : 999;

        // Wenn innerhalb der letzten 14 Tage hochgeladen UND expiryDate mehr als 60 Tage in der Vergangenheit
        // → Vertraue dem Datum nicht, zeige "Aktiv"
        if (daysSinceCreation <= 14 && daysUntilExpiry < -60) {
          return 'Aktiv';
        }

        return 'Beendet';
      }

      // Läuft bald ab (innerhalb 30 Tage)
      if (daysUntilExpiry <= 30) {
        return 'Läuft ab';
      }

      // Noch aktiv
      return 'Aktiv';
    }

    // 4. Prüfe ob manuell gesetzter Status vorhanden (typeof-Guard gegen Nicht-String → kein Render-Crash)
    if (typeof contract.status === 'string') {
      const status = contract.status.toLowerCase();
      if (status === 'aktiv' || status === 'gültig' || status === 'laufend') return 'Aktiv';
      if (status === 'gekündigt') return 'Gekündigt';
      if (status === 'beendet' || status === 'abgelaufen' || status === 'expired') return 'Beendet';
      if (status === 'läuft ab' || status === 'bald fällig') return 'Läuft ab';
      if (status === 'pausiert') return 'Pausiert';
      if (status === 'entwurf' || status === 'draft') return 'Entwurf';
    }

    // 5. Generierte oder optimierte Verträge
    if (contract.isGenerated) return 'Entwurf';
    if (contract.isOptimized) return 'Optimiert';

    // 6. Default: Unbekannt/Offen für nicht analysierte Verträge
    if (!contract.analyzed && !contract.contractScore) {
      return 'Neu';
    }

    // 7. Fallback: Aktiv (wenn analysiert aber kein Ablaufdatum)
    return 'Aktiv';
  };

  const getStatusColor = (status: string): string => {
    status = (status?.toLowerCase() || '');
    if (status === "aktiv" || status === "gültig" || status === "laufend") {
      return styles.statusActive;
    } else if (status === "läuft ab" || status === "bald fällig") {
      return styles.statusWarning;
    } else if (status === "gekündigt — offen") {
      return styles.statusCancelledOpen;
    } else if (status === "gekündigt" || status === "gekündigt ✓") {
      return styles.statusCancelled;
    } else if (status === "beendet" || status === "abgelaufen") {
      return styles.statusExpired || styles.statusCancelled;
    } else if (status === "entwurf" || status === "neu" || status === "optimiert") {
      return styles.statusNeutral;
    } else if (status === "bezahlt") {
      return styles.statusActive;
    } else if (status === "offen") {
      return styles.statusWarning;
    } else if (status === "pausiert") {
      return styles.statusNeutral;
    } else {
      return styles.statusNeutral;
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "—";

    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch {
      return dateString;
    }
  };


  // ✏️ QuickFact Dropdown: Spalte wechseln (Array-Reihenfolge tauschen)
  const swapQuickFact = async (contractId: string, displayIndex: number, targetFactIndex: number) => {
    const contract = contracts.find(c => c._id === contractId);
    if (!contract?.quickFacts || displayIndex === targetFactIndex) return;

    const updated = [...contract.quickFacts];
    [updated[displayIndex], updated[targetFactIndex]] = [updated[targetFactIndex], updated[displayIndex]];

    try {
      await apiCall(`/contracts/${contractId}`, {
        method: 'PUT',
        body: JSON.stringify({ quickFacts: updated })
      });
      setContracts(prev => prev.map(c =>
        c._id === contractId ? { ...c, quickFacts: updated } : c
      ));
    } catch (err) {
      console.error('QuickFact wechseln fehlgeschlagen:', err);
    }
    setQfDropdownOpen(null);
  };

  // 🆕 Smart Signature Badge Renderer
  const renderSignatureBadge = (contract: Contract) => {
    // 🛡️ contract.signatureStatus ist app-weit ein STRING (Envelope-Signatur-Flow).
    // Defensiv gegen fremde/alte Nicht-String-Werte (z.B. ein versehentlich unter
    // gleichem Namen gespeichertes Objekt) — sonst crasht status.toUpperCase() die Liste.
    const contractSigStatus = typeof contract.signatureStatus === 'string' ? contract.signatureStatus : null;
    if (!contract.envelope && !contractSigStatus) return null;

    const envelope = contract.envelope;
    const status = envelope?.signatureStatus || contractSigStatus;

    // Map backend status to UI display
    let icon = "📝";
    let text = "";
    let tooltipText = ""; // ✅ Vollständige Info für Tooltip
    let className = styles.signatureBadge;

    switch (status?.toUpperCase()) {
      case "COMPLETED":
        icon = "✅";
        text = "Signiert"; // ✅ Kompakt: "Vollständig signiert" → "Signiert"
        tooltipText = envelope?.completedAt
          ? `Vollständig signiert • ${formatDate(envelope.completedAt)}`
          : "Vollständig signiert";
        className = `${styles.signatureBadge} ${styles.signatureCompleted}`;
        break;

      case "SIGNED":
      case "AWAITING_SIGNER_1":
      case "AWAITING_SIGNER_2": {
        icon = "✍️";
        const signersSigned = envelope?.signersSigned || 0;
        const signersTotal = envelope?.signersTotal || 0;
        text = signersSigned > 0 && signersTotal > 0
          ? `${signersSigned}/${signersTotal}` // ✅ Super kompakt: nur "2/3"
          : "Teilw."; // ✅ Verkürzt
        tooltipText = signersSigned > 0 && signersTotal > 0
          ? `Teilweise signiert: ${signersSigned} von ${signersTotal} Signaturen`
          : "Teilweise signiert";
        className = `${styles.signatureBadge} ${styles.signaturePartial}`;
        break;
      }

      case "SENT":
        icon = "⏳";
        text = "Pending"; // ✅ Kürzer
        tooltipText = "Ausstehend - Wartet auf Signaturen";
        className = `${styles.signatureBadge} ${styles.signaturePending}`;
        break;

      case "DRAFT":
        icon = "📝";
        text = "Entwurf";
        tooltipText = "Entwurf - Noch nicht versendet";
        className = `${styles.signatureBadge} ${styles.signatureDraft}`;
        break;

      case "DECLINED":
        icon = "❌";
        text = "Abgelehnt";
        tooltipText = "Signatur wurde abgelehnt";
        className = `${styles.signatureBadge} ${styles.signatureDeclined}`;
        break;

      case "EXPIRED":
        icon = "⏰";
        text = "Abgelaufen";
        tooltipText = "Signierfrist abgelaufen";
        className = `${styles.signatureBadge} ${styles.signatureExpired}`;
        break;

      case "VOIDED":
        icon = "🚫";
        text = "Widerrufen";
        tooltipText = "Signierprozess wurde widerrufen";
        className = `${styles.signatureBadge} ${styles.signatureVoided}`;
        break;

      default:
        return null;
    }

    // Make badge clickable if envelope exists
    const envelopeId = envelope?._id || contract.signatureEnvelopeId;
    const finalTooltip = envelopeId ? `${tooltipText} • Klicken für Details` : tooltipText;

    return (
      <span
        className={`${className} ${envelopeId ? styles.signatureBadgeClickable : ''}`}
        title={finalTooltip}
        onClick={(e) => {
          if (envelopeId) {
            e.stopPropagation();
            setSelectedEnvelopeId(envelopeId);
          }
        }}
      >
        {icon} {text}
      </span>
    );
  };

  const activateFileInput = () => {
    // ✅ FIX: Reset value vor dem Klick, damit onChange auch bei gleicher Datei feuert
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // ✅ NEU: Upload-Status Icons
  const getUploadStatusIcon = (status: UploadFileItem['status']) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className={styles.statusPending} />;
      case 'analyzing':
        return <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}>
          <Loader size={16} className={styles.statusAnalyzing} />
        </motion.div>;
      case 'completed':
        return <CheckCircle size={16} className={styles.statusCompleted} />;
      case 'duplicate':
        return <Users size={16} className={styles.statusDuplicate} />;
      case 'error':
        return <AlertCircle size={16} className={styles.statusError} />;
      default:
        return <Clock size={16} />;
    }
  };

  // ✅ VERBESSERT: Upload-Status Text mit Duplikat-Aktionen
  const getUploadStatusText = (item: UploadFileItem) => {
    switch (item.status) {
      case 'pending':
        return null; // Kein Text bei "wartend" - cleaner Look
      case 'uploading':
        return `Wird hochgeladen... ${item.progress}%`;
      case 'analyzing':
        return `Wird analysiert... ${item.progress}%`;
      case 'completed':
        return item.analyzed ? 'Analyse abgeschlossen' : 'Hochgeladen';
      case 'duplicate':
        return (
          <div className={styles.duplicateStatus}>
            <span>Bereits vorhanden</span>
            <button 
              className={styles.duplicateActionButton}
              onClick={(e) => {
                e.stopPropagation();
                handleDuplicateAction(item);
              }}
            >
              Aktionen anzeigen
            </button>
          </div>
        );
      case 'error':
        return `Fehler: ${item.error}`;
      default:
        return 'Unbekannt';
    }
  };

  // ✅ KORRIGIERT: Plan-Badge Helper
  const getPlanBadge = () => {
    switch (userInfo.subscriptionPlan) {
      case 'free':
        return (
          <span className={styles.freeBadge}>
            <Lock size={16} />
            Free
          </span>
        );
      case 'business':
        return (
          <span className={styles.businessBadge}>
            <BarChart3 size={16} />
            Business
          </span>
        );
      case 'enterprise':
        return (
          <span className={styles.enterpriseBadge}>
            <Crown size={16} />
            Enterprise
          </span>
        );
      default:
        return null;
    }
  };

  // ✅ KORRIGIERT: Upload-Berechtigung prüfen - Free darf auch uploaden!
  const canUpload = true; // Alle Pläne dürfen uploaden (Free: 3, Business: 25, Enterprise: ∞)
  const canMultiUpload = userInfo.subscriptionPlan === 'enterprise';
  const hasAnalysesLeft = userInfo.analysisLimit === Infinity || userInfo.analysisCount < userInfo.analysisLimit;
  const allAnalyzed = uploadFiles.length > 0 && uploadFiles.every(f => f.status === 'completed');

  // ✅ Infinite Scroll: Zeige alle geladenen Contracts (keine Frontend-Slice mehr)
  // 🆕 Frontend-side Sort für slot-basierte Sortier-Optionen (Backend kennt sie nicht)
  const displayedContracts = useMemo(() => {
    if (isBackendSort(sortOrder)) return contracts;

    let slotIdx = -1;
    let asc = true;
    if (sortOrder === 'slot0_asc') { slotIdx = 0; asc = true; }
    else if (sortOrder === 'slot0_desc') { slotIdx = 0; asc = false; }
    else if (sortOrder === 'slot1_asc') { slotIdx = 1; asc = true; }
    else if (sortOrder === 'slot1_desc') { slotIdx = 1; asc = false; }
    else if (sortOrder === 'slot2_asc') { slotIdx = 2; asc = true; }
    else if (sortOrder === 'slot2_desc') { slotIdx = 2; asc = false; }
    if (slotIdx === -1) return contracts;

    const fieldKey = columnSlots[slotIdx];
    // Helper: extrahiere comparable Sort-Value für ein Field
    const getSortVal = (contract: Contract): string | number => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const c = contract as any;
      switch (fieldKey) {
        case 'provider': {
          const manual = String(c.anbieter ?? '').trim();
          return (manual || contract.provider?.displayName || '').toLowerCase();
        }
        case 'contractType': return (contract.contractTypeLabel || contract.contractType || contract.provider?.category || '').toLowerCase();
        case 'contractNumber': return (
          String(c.vertragsnummer ?? '').trim() || String(c.contractNumber ?? '').trim()
        ).toLowerCase();
        case 'customerNumber': return (
          String(c.customerNumber ?? '').trim() || String(c.kundennummer ?? '').trim()
        ).toLowerCase();
        case 'startDate': {
          if (!contract.startDate) return Number.POSITIVE_INFINITY;
          const ts = new Date(contract.startDate).getTime();
          return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
        }
        case 'expiry': {
          if (!contract.expiryDate) return Number.POSITIVE_INFINITY;
          const ts = new Date(contract.expiryDate).getTime();
          return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
        }
        case 'gekuendigtZum': {
          if (!c.gekuendigtZum) return Number.POSITIVE_INFINITY;
          const ts = new Date(c.gekuendigtZum).getTime();
          return Number.isNaN(ts) ? Number.POSITIVE_INFINITY : ts;
        }
        case 'kuendigung': return (contract.kuendigung || '').toLowerCase();
        case 'laufzeit': return (contract.laufzeit || '').toLowerCase();
        case 'payment': {
          const amount = contract.paymentAmount ?? c.kosten;
          if (amount === undefined || amount === null || amount === '') return Number.POSITIVE_INFINITY;
          if (typeof amount === 'number') return amount;
          // EU-Format "1.234,56": Tausender-Punkte raus, dann Komma → Punkt
          const sanitized = String(amount).replace(/\./g, '').replace(',', '.');
          const parsed = parseFloat(sanitized);
          return Number.isNaN(parsed) ? Number.POSITIVE_INFINITY : parsed;
        }
        default: return '';
      }
    };
    return [...contracts].sort((a, b) => {
      const va = getSortVal(a);
      const vb = getSortVal(b);
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });
  }, [contracts, sortOrder, columnSlots]);


  // ✅ PROFESSIONAL: Mobile List Row Component (kompakte Zeile wie Desktop)
  // Inspiriert von Microsoft Outlook, Apple Mail, Google Drive Mobile
  const MobileListRow = ({ contract }: { contract: Contract }) => {
    const isSelected = selectedContracts.includes(contract._id);
    const daysUntilExpiry = contract.expiryDate
      ? Math.ceil((new Date(contract.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    // Status-Farbe für den linken Rand
    const smartStatus = calculateSmartStatus(contract);
    const getStatusIndicatorColor = () => {
      if (smartStatus === 'Gekündigt ✓') return '#ef4444';
      if (smartStatus === 'Gekündigt — offen') return '#f59e0b';
      if (smartStatus === 'Beendet' || smartStatus === 'Abgelaufen') return '#f97316';
      if (daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0) return '#eab308';
      if (smartStatus === 'Aktiv') return '#22c55e';
      return '#94a3b8';
    };

    return (
      <motion.div
        className={`${styles.mobileListRow} ${isSelected ? styles.selected : ''}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.15 }}
        onClick={() => handleRowDoubleClick(contract)}
        style={{ '--status-color': getStatusIndicatorColor() } as React.CSSProperties}
      >
        {/* Linker Bereich: Checkbox (wenn aktiv) + Status-Indikator */}
        <div className={styles.listRowLeft}>
          {bulkSelectMode && (
            <div
              className={styles.listRowCheckbox}
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectContract(contract._id);
              }}
            >
              {isSelected ? (
                <CheckSquare size={14} className={styles.checkboxChecked} />
              ) : (
                <Square size={14} className={styles.checkboxUnchecked} />
              )}
            </div>
          )}
          <div className={styles.listRowStatusIndicator} />
        </div>

        {/* Hauptinhalt: Name + Meta-Info (V1-Style: kompakt) */}
        <div className={styles.listRowContent}>
          <div className={styles.listRowMain}>
            <span className={styles.listRowName}>{fixUtf8Display(contract.name)}</span>
            {/* Badges inline */}
            <div className={styles.listRowBadges}>
              {contract.isGenerated && <span className={styles.listRowBadge} data-type="generated">Gen</span>}
              {contract.isOptimized && <span className={styles.listRowBadge} data-type="optimized">Opt</span>}
              {contract.uploadType === 'EMAIL_IMPORT' && <span className={styles.listRowBadge} data-type="email">✉</span>}
              {isContractNotAnalyzed(contract) && <span className={styles.listRowBadge} data-type="unanalyzed">!</span>}
            </div>
          </div>
          <div className={styles.listRowMeta}>
            <span className={styles.listRowStatus}>{calculateSmartStatus(contract)}</span>
            <span className={styles.listRowDivider}>•</span>
            <span className={styles.listRowDate}>
              {contract.expiryDate ? formatDate(contract.expiryDate) : 'Kein Ablauf'}
            </span>
            {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
              <>
                <span className={styles.listRowDivider}>•</span>
                <span className={styles.listRowUrgent}>{daysUntilExpiry}T</span>
              </>
            )}
          </div>
        </div>

        {/* Rechter Bereich: Quick Actions - Ultra-kompakt */}
        <div className={styles.listRowActions}>
          <button
            className={styles.listRowAction}
            onClick={(e) => {
              e.stopPropagation();
              openSmartPDF(contract, true);
            }}
            disabled={pdfLoading[contract._id]}
            title="PDF öffnen"
          >
            {pdfLoading[contract._id] ? (
              <Loader size={14} className={styles.loadingIcon} />
            ) : (
              <ExternalLink size={14} />
            )}
          </button>
          <button
            className={styles.listRowAction}
            onClick={(e) => {
              e.stopPropagation();
              setFolderDropdownOpen(folderDropdownOpen === contract._id ? null : contract._id);
            }}
            title="Mehr"
          >
            <MoreVertical size={14} />
          </button>
        </div>

        {/* Dropdown wird als Portal gerendert - siehe unten am Ende der Datei */}
      </motion.div>
    );
  };


  return (
    <>
      {/* ✅ HIDDEN FILE INPUT - Außerhalb aller Container um Klick-Interferenz zu vermeiden */}
      <input
        type="file"
        onChange={handleMultipleFileChange}
        style={{ display: 'none' }}
        accept=".pdf,.docx"
        multiple={canMultiUpload}
        id="contractFile"
        ref={fileInputRef}
        disabled={!hasAnalysesLeft}
      />

      <Helmet>
        <title>Verträge | Contract AI</title>
        <meta name="description" content="Verträge hochladen, Risiken erkennen & direkt optimieren – alles mit KI. Mehr Klarheit, bessere Konditionen, volle Kontrolle. Jetzt ausprobieren!" />
        <meta name="keywords" content="Vertragsanalyse, Verträge optimieren, Vertrag hochladen, Risiken erkennen, Contract AI" />
        <link rel="canonical" href="https://www.contract-ai.de/contracts" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Verträge mit KI analysieren & optimieren | Contract AI" />
        <meta property="og:description" content="Lade deine Verträge hoch, erkenne Risiken & optimiere Inhalte sofort mit KI. Mehr Sicherheit & bessere Ergebnisse." />
        <meta property="og:url" content="https://www.contract-ai.de/contracts" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Verträge mit KI analysieren & optimieren | Contract AI" />
        <meta name="twitter:description" content="Verträge einfach hochladen, Risiken erkennen & optimieren – mit KI. Mehr Kontrolle & Klarheit für deine Verträge." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>

      <div className={styles.pageContainer}>
        {/* 🎯 Simple Tour - zuverlässiger als react-joyride.
            Nur in der Listen-Ansicht mounten — ihre Ziel-Elemente (Toolbar/Suche)
            existieren nur dort; so zeigt sie nie ins Leere (Upload-/Analyse-Flow). */}
        {activeSection === 'contracts' && <SimpleTour tourId="contracts" />}

        {/* ========== ENTERPRISE LAYOUT ========== */}
        <div className={`${styles.enterpriseLayout} ${previewContract ? styles.withPreview : ''}`}>

          {/* ===== SIDEBAR ===== */}
          <aside className={styles.sidebar} style={sidebarWidth ? { width: sidebarWidth } : undefined}>
            {/* Resize Handle */}
            <div
              className={`${styles.sidebarResizeHandle} ${isResizing ? styles.resizing : ''}`}
              onMouseDown={handleSidebarResizeStart}
            />
            <div className={styles.sidebarNav}>
              <p className={styles.sidebarTitle}>Navigation</p>

              {/* Main Nav Items */}
              <button
                className={`${styles.sidebarNavItem} ${activeSection === 'contracts' && statusFilter === 'alle' && activeFolder === null ? styles.active : ''}`}
                onClick={() => { setActiveSection('contracts'); clearAllFilters(); }}
              >
                <FileText size={18} className={styles.sidebarNavIcon} />
                <span>Alle Verträge</span>
                <span className={styles.sidebarNavBadge}>{sidebarCounts.total}</span>
              </button>

              <button
                className={`${styles.sidebarNavItem} ${activeSection === 'upload' ? styles.active : ''}`}
                onClick={() => { if (allAnalyzed) clearAllUploadFiles(); setActiveSection('upload'); }}
              >
                <Upload size={18} className={styles.sidebarNavIcon} />
                <span>Hochladen</span>
                {canMultiUpload && <Crown size={14} className={styles.sidebarNavIcon} style={{ color: '#fbbf24' }} />}
              </button>

              {userInfo.emailInboxAddress && (
                <button
                  className={`${styles.sidebarNavItem} ${activeSection === 'email-upload' ? styles.active : ''}`}
                  onClick={() => setActiveSection('email-upload')}
                >
                  <Mail size={18} className={styles.sidebarNavIcon} />
                  <span>Email-Upload</span>
                </button>
              )}

              <div className={styles.sidebarDivider} />

              {/* Quick Filters */}
              <p className={styles.sidebarTitle}>Schnellfilter</p>

              <button
                className={`${styles.sidebarNavItem} ${statusFilter === 'bald_ablaufend' ? styles.active : ''}`}
                onClick={() => { setActiveSection('contracts'); setStatusFilter(statusFilter === 'bald_ablaufend' ? 'alle' : 'bald_ablaufend'); setActiveFolder(null); }}
              >
                <AlertTriangle size={18} className={styles.sidebarNavIcon} style={{ color: '#f59e0b' }} />
                <span>Läuft ab</span>
                <span className={styles.sidebarNavBadge}>
                  {sidebarCounts.baldAblaufend}
                </span>
              </button>

              <button
                className={`${styles.sidebarNavItem} ${statusFilter === 'aktiv' ? styles.active : ''}`}
                onClick={() => { setActiveSection('contracts'); setStatusFilter(statusFilter === 'aktiv' ? 'alle' : 'aktiv'); setActiveFolder(null); }}
              >
                <CheckCircle size={18} className={styles.sidebarNavIcon} style={{ color: '#22c55e' }} />
                <span>Aktive Verträge</span>
                <span className={styles.sidebarNavBadge}>{sidebarCounts.aktiv}</span>
              </button>

              <div className={styles.sidebarDivider} />

              {/* Folders */}
              <p className={styles.sidebarTitle}>Ordner</p>
              <div className={styles.sidebarFolderList}>
                {/* Alle Verträge */}
                <button
                  className={`${styles.sidebarFolderItem} ${activeFolder === null ? styles.active : ''}`}
                  onClick={() => { setActiveSection('contracts'); setActiveFolder(null); setStatusFilter('alle'); }}
                >
                  <FileText size={16} className={styles.sidebarFolderIcon} style={{ color: '#3b82f6' }} />
                  <span>Alle Verträge</span>
                  <span className={styles.sidebarNavBadge}>{sidebarCounts.total}</span>
                </button>
                {/* Ohne Ordner */}
                <button
                  className={`${styles.sidebarFolderItem} ${activeFolder === 'unassigned' ? styles.active : ''}`}
                  onClick={() => { setActiveSection('contracts'); setActiveFolder('unassigned'); setStatusFilter('alle'); }}
                >
                  <Folder size={16} className={styles.sidebarFolderIcon} style={{ color: '#94a3b8' }} />
                  <span>Ohne Ordner</span>
                  <span className={styles.sidebarNavBadge}>
                    {sidebarCounts.ohneOrdner}
                  </span>
                </button>
                {/* User Folders */}
                {folders.map((folder: FolderType) => (
                  <button
                    key={folder._id}
                    className={`${styles.sidebarFolderItem} ${styles.userFolder} ${activeFolder === folder._id ? styles.active : ''}`}
                    onClick={() => { setActiveSection('contracts'); setActiveFolder(folder._id); setStatusFilter('alle'); }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setFolderContextMenu({
                        folderId: folder._id,
                        x: e.clientX,
                        y: e.clientY
                      });
                    }}
                  >
                    <Folder size={16} className={styles.sidebarFolderIcon} style={{ color: folder.color || '#fbbf24' }} />
                    <span className={styles.sidebarFolderName}>{folder.name}</span>
                    {/* ⭐ Favoriten-Stern */}
                    {favoriteFolder === folder._id && (
                      <Star size={12} className={styles.favoriteStar} fill="currentColor" />
                    )}
                    <span className={styles.sidebarNavBadge}>
                      {folder.contractCount ?? 0}
                    </span>
                    <span
                      className={styles.sidebarFolderMenuBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setFolderContextMenu({
                          folderId: folder._id,
                          x: rect.right,
                          y: rect.top
                        });
                      }}
                      title="Ordner-Optionen"
                    >
                      <MoreVertical size={14} />
                    </span>
                  </button>
                ))}
                {/* Add Folder */}
                <button
                  className={styles.sidebarAddFolder}
                  onClick={handleCreateFolder}
                >
                  <FolderPlus size={16} />
                  <span>Neuer Ordner</span>
                </button>
                {/* Smart Folders - Premium Feature */}
                <button
                  className={styles.sidebarAddFolder}
                  onClick={() => {
                    if (userInfo.isPremium) {
                      setSmartFoldersModalOpen(true);
                    } else {
                      setPremiumHint('Smart Folders ist ein Enterprise-Feature. Upgrade jetzt, um KI-basierte Ordnervorschläge zu nutzen!');
                    }
                  }}
                  style={{ color: userInfo.isPremium ? '#a78bfa' : '#64748b' }}
                  title={userInfo.isPremium ? 'KI-basierte Ordnervorschläge' : 'Enterprise-Feature – Jetzt upgraden'}
                >
                  {userInfo.isPremium ? <Zap size={16} /> : <Lock size={16} />}
                  <span>Smart Folders</span>
                  {!userInfo.isPremium && (
                    <Crown size={12} style={{ color: '#fbbf24', marginLeft: 'auto' }} />
                  )}
                </button>
              </div>
            </div>

            {/* Plan Info at Bottom */}
            <div className={styles.sidebarHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {getPlanBadge()}
                {(userInfo.subscriptionPlan === 'free' || userInfo.subscriptionPlan === 'business') && (
                  <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                    {Math.max(0, userInfo.analysisLimit - userInfo.analysisCount)}/{userInfo.analysisLimit} Analysen
                  </span>
                )}
              </div>
            </div>
          </aside>

          {/* ===== MAIN CONTENT ===== */}
          <main className={styles.mainContent}>
            {/* Premium Upgrade Hint Toast */}
            <AnimatePresence>
              {premiumHint && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className={styles.premiumHintBanner}
                >
                  <Crown size={18} />
                  <span>{premiumHint}</span>
                  <button
                    className={styles.premiumHintUpgrade}
                    onClick={() => {
                      setPremiumHint(null);
                      navigate('/subscribe');
                    }}
                  >
                    Jetzt upgraden
                  </button>
                  <button
                    className={styles.premiumHintClose}
                    onClick={() => setPremiumHint(null)}
                  >
                    <X size={16} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Such-/Filter-Leisten (Mobile-Suche, Mobile-Chips, Desktop-Toolbar) nur in
                der Listen-Ansicht. Im Upload-/Analyse-Flow haben sie keinen Nutzen → ausgeblendet. */}
            {activeSection === 'contracts' && !quickAnalysisModal.show && (
            <>
            {/* 📱 MOBILE: Suchleiste oben - immer sichtbar */}
            <div className={styles.mobileSearchBar}>
              <Search size={16} className={styles.mobileSearchIcon} />
              <input
                type="text"
                className={styles.mobileSearchInput}
                placeholder="Verträge durchsuchen..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  className={styles.mobileSearchClear}
                  onClick={() => setSearchQuery('')}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* 📱 MOBILE-FIRST 2025: Filter Chips */}
            <div className={styles.mobileFilterChips}>
              <div className={styles.filterChipGroup}>
                <button
                  className={`${styles.filterChip} ${sourceFilter === 'alle' && statusFilter === 'alle' ? styles.active : ''}`}
                  onClick={() => {
                    setSourceFilter('alle');
                    setStatusFilter('alle');
                  }}
                >
                  Alle
                  <span className={styles.filterChipCount}>{contracts.length}</span>
                </button>
                <button
                  className={`${styles.filterChip} ${sourceFilter === 'generated' ? styles.active : ''}`}
                  onClick={() => setSourceFilter(sourceFilter === 'generated' ? 'alle' : 'generated')}
                >
                  <Sparkles size={14} />
                  Generiert
                </button>
                <button
                  className={`${styles.filterChip} ${sourceFilter === 'optimized' ? styles.active : ''}`}
                  onClick={() => setSourceFilter(sourceFilter === 'optimized' ? 'alle' : 'optimized')}
                >
                  <Zap size={14} />
                  Optimiert
                </button>
                <button
                  className={`${styles.filterChip} ${statusFilter === 'bald_ablaufend' ? styles.active : ''}`}
                  onClick={() => setStatusFilter(statusFilter === 'bald_ablaufend' ? 'alle' : 'bald_ablaufend')}
                >
                  <AlertTriangle size={14} />
                  Bald fällig
                </button>
              </div>
            </div>

            {/* Enterprise Toolbar */}
            <div className={styles.enterpriseToolbar} data-tour="contracts-toolbar">
              <div className={styles.toolbarSection}>
                <button
                  className={`${styles.toolbarButton} ${styles.primary}`}
                  onClick={() => { if (allAnalyzed) clearAllUploadFiles(); setActiveSection('upload'); }}
                  data-tour="contracts-upload-btn"
                >
                  <FileUp size={16} />
                  <span>Hochladen</span>
                </button>
                <button
                  className={styles.toolbarButton}
                  onClick={() => fetchContracts()}
                  disabled={refreshing}
                >
                  <RefreshCw size={16} className={refreshing ? styles.spinning : ''} />
                </button>
                {/* Auswählen Button */}
                <button
                  className={`${styles.toolbarButton} ${bulkSelectMode ? styles.active : ''}`}
                  onClick={toggleBulkSelectMode}
                  title={bulkSelectMode ? "Auswahl beenden" : "Verträge auswählen"}
                >
                  {bulkSelectMode ? <CheckSquare size={16} /> : <Square size={16} />}
                  <span>{bulkSelectMode ? "Beenden" : "Auswählen"}</span>
                </button>
                {/* Excel Export */}
                <button
                  className={styles.toolbarButton}
                  onClick={handleExportExcel}
                  disabled={contracts.length === 0}
                  title="Als Excel exportieren"
                >
                  <Download size={16} />
                  <span>Export</span>
                </button>

                {/* 📱 MOBILE: Filter-Button - öffnet Bottom-Sheet */}
                <button
                  className={`${styles.toolbarButton} ${styles.mobileFilterButton} ${(statusFilter !== 'alle' || dateFilter !== 'alle' || sourceFilter !== 'alle' || sortOrder !== 'neueste') ? styles.hasActiveFilters : ''}`}
                  onClick={() => setShowMobileFilterSheet(true)}
                  title="Filter"
                >
                  <SlidersHorizontal size={16} />
                  <span>Filter</span>
                  {(statusFilter !== 'alle' || dateFilter !== 'alle' || sourceFilter !== 'alle' || sortOrder !== 'neueste') && (
                    <span className={styles.filterBadge}>!</span>
                  )}
                </button>

              </div>

              <div className={styles.toolbarDivider} />

              {/* Desktop: Suchleiste bleibt hier */}
              <div className={styles.toolbarSearch} data-tour="contracts-search">
                <Search size={16} className={styles.toolbarSearchIcon} />
                <input
                  type="text"
                  className={styles.toolbarSearchInput}
                  placeholder="Verträge durchsuchen..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className={styles.toolbarDivider} />

              {/* Desktop: Filter-Selects */}
              <div className={`${styles.toolbarSection} ${styles.desktopFilters}`}>
                {/* Quelle Filter (Alle/Generiert/Optimiert) */}
                <select
                  className={styles.toolbarButton}
                  value={sourceFilter}
                  onChange={(e) => setSourceFilter(e.target.value as 'alle' | 'generated' | 'optimized')}
                  style={{ minWidth: '110px' }}
                >
                  <option value="alle">Alle</option>
                  <option value="generated">Generiert</option>
                  <option value="optimized">Optimiert</option>
                </select>

                {/* Status Filter */}
                <select
                  className={styles.toolbarButton}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                  style={{ minWidth: '120px' }}
                >
                  <option value="alle">Alle Status ({sidebarCounts.total})</option>
                  <option value="aktiv">Aktiv ({sidebarCounts.aktiv})</option>
                  <option value="bald_ablaufend">Läuft ab ({sidebarCounts.baldAblaufend})</option>
                  <option value="abgelaufen">Beendet ({sidebarCounts.abgelaufen})</option>
                  <option value="gekündigt">Gekündigt ({sidebarCounts.gekuendigt})</option>
                  <option value="neu">Neu ({sidebarCounts.neu})</option>
                  <option value="entwurf">Entwurf ({sidebarCounts.entwurf})</option>
                  <option value="optimiert">Optimiert ({sidebarCounts.optimiert})</option>
                </select>

                {/* Zeitraum Filter */}
                <select
                  className={styles.toolbarButton}
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                  style={{ minWidth: '130px' }}
                >
                  <option value="alle">Alle Zeiträume</option>
                  <option value="heute">Heute</option>
                  <option value="woche">Diese Woche</option>
                  <option value="monat">Dieser Monat</option>
                  <option value="quartal">Dieses Quartal</option>
                  <option value="jahr">Dieses Jahr</option>
                </select>

                {/* Sortierung */}
                <select
                  className={styles.toolbarButton}
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                  style={{ minWidth: '160px' }}
                >
                  <option value="neueste">Neueste zuerst</option>
                  <option value="älteste">Älteste zuerst</option>
                  <option value="name_az">Name A-Z</option>
                  <option value="name_za">Name Z-A</option>
                  <option value="status_asc">Status A-Z</option>
                  <option value="status_desc">Status Z-A</option>
                  {/* 🆕 Slot-basierte Sortierung (dynamisch nach aktuellem columnSlots) */}
                  <option value="slot0_asc">{getFieldLabel(columnSlots[0])} ↑</option>
                  <option value="slot0_desc">{getFieldLabel(columnSlots[0])} ↓</option>
                  <option value="slot1_asc">{getFieldLabel(columnSlots[1])} ↑</option>
                  <option value="slot1_desc">{getFieldLabel(columnSlots[1])} ↓</option>
                  <option value="slot2_asc">{getFieldLabel(columnSlots[2])} ↑</option>
                  <option value="slot2_desc">{getFieldLabel(columnSlots[2])} ↓</option>
                </select>

                {/* ⚙️ Ansicht-Einstellungen (Display-Popover wie Linear/Stripe) */}
                <div style={{ position: 'relative' }}>
                  <button
                    type="button"
                    className={`${styles.toolbarButton} ${showViewSettings ? styles.active : ''}`}
                    onClick={(e) => { e.stopPropagation(); setShowViewSettings((v) => !v); }}
                    title="Ansicht-Einstellungen"
                    aria-haspopup="true"
                    aria-expanded={showViewSettings}
                  >
                    <SlidersHorizontal size={16} />
                    <span>Ansicht</span>
                  </button>
                  {showViewSettings && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute', top: 'calc(100% + 6px)', right: 0, width: 290,
                        background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12,
                        boxShadow: '0 12px 32px rgba(15,23,42,0.16), 0 3px 8px rgba(15,23,42,0.08)',
                        zIndex: 1000, padding: '14px 16px',
                      }}
                    >
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                        Ansicht
                      </div>
                      <div
                        role="switch"
                        aria-checked={hoverPreviewEnabled}
                        tabIndex={0}
                        onClick={toggleHoverPreview}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHoverPreview(); } }}
                        style={{ display: 'flex', alignItems: 'flex-start', gap: 14, cursor: 'pointer' }}
                      >
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>PDF-Vorschau beim Hovern</div>
                          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3, lineHeight: 1.4 }}>
                            Zeigt eine Vorschau, wenn du über eine Zeile fährst
                          </div>
                        </div>
                        <span
                          aria-hidden="true"
                          style={{
                            flexShrink: 0, marginTop: 2, width: 42, height: 24, borderRadius: 999,
                            background: hoverPreviewEnabled ? '#2563eb' : '#cbd5e1',
                            position: 'relative', transition: 'background 0.18s ease', display: 'inline-block',
                          }}
                        >
                          <span style={{
                            position: 'absolute', top: 2, left: hoverPreviewEnabled ? 20 : 2,
                            width: 20, height: 20, borderRadius: '50%', background: '#ffffff',
                            boxShadow: '0 1px 3px rgba(15,23,42,0.25)', transition: 'left 0.18s ease',
                          }} />
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
            </>
            )}

            {/* 📱 MOBILE: Filter Bottom-Sheet */}
            <AnimatePresence>
              {showMobileFilterSheet && (
                <>
                  <motion.div
                    className={styles.mobileFilterOverlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowMobileFilterSheet(false)}
                  />
                  <motion.div
                    className={styles.mobileFilterSheet}
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  >
                    <div className={styles.mobileFilterHandle} />
                    <div className={styles.mobileFilterHeader}>
                      <h3>Filter & Sortierung</h3>
                      <button
                        className={styles.mobileFilterClose}
                        onClick={() => setShowMobileFilterSheet(false)}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className={styles.mobileFilterContent}>
                      <div className={styles.mobileFilterGroup}>
                        <label>Quelle</label>
                        <select
                          value={sourceFilter}
                          onChange={(e) => setSourceFilter(e.target.value as 'alle' | 'generated' | 'optimized')}
                        >
                          <option value="alle">Alle Quellen</option>
                          <option value="generated">Generiert</option>
                          <option value="optimized">Optimiert</option>
                        </select>
                      </div>

                      <div className={styles.mobileFilterGroup}>
                        <label>Status</label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        >
                          <option value="alle">Alle Status ({sidebarCounts.total})</option>
                          <option value="aktiv">Aktiv ({sidebarCounts.aktiv})</option>
                          <option value="bald_ablaufend">Läuft ab ({sidebarCounts.baldAblaufend})</option>
                          <option value="abgelaufen">Beendet ({sidebarCounts.abgelaufen})</option>
                          <option value="gekündigt">Gekündigt ({sidebarCounts.gekuendigt})</option>
                  <option value="neu">Neu ({sidebarCounts.neu})</option>
                  <option value="entwurf">Entwurf ({sidebarCounts.entwurf})</option>
                  <option value="optimiert">Optimiert ({sidebarCounts.optimiert})</option>
                        </select>
                      </div>

                      <div className={styles.mobileFilterGroup}>
                        <label>Zeitraum</label>
                        <select
                          value={dateFilter}
                          onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                        >
                          <option value="alle">Alle Zeiträume</option>
                          <option value="heute">Heute</option>
                          <option value="woche">Diese Woche</option>
                          <option value="monat">Dieser Monat</option>
                          <option value="quartal">Dieses Quartal</option>
                          <option value="jahr">Dieses Jahr</option>
                        </select>
                      </div>

                      <div className={styles.mobileFilterGroup}>
                        <label>Sortierung</label>
                        <select
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                        >
                          <option value="neueste">Neueste zuerst</option>
                          <option value="älteste">Älteste zuerst</option>
                          <option value="name_az">Name A-Z</option>
                          <option value="name_za">Name Z-A</option>
                          <option value="status_asc">Status A-Z</option>
                          <option value="status_desc">Status Z-A</option>
                          {/* 🆕 Slot-basierte Sortierung */}
                          <option value="slot0_asc">{getFieldLabel(columnSlots[0])} ↑</option>
                          <option value="slot0_desc">{getFieldLabel(columnSlots[0])} ↓</option>
                          <option value="slot1_asc">{getFieldLabel(columnSlots[1])} ↑</option>
                          <option value="slot1_desc">{getFieldLabel(columnSlots[1])} ↓</option>
                          <option value="slot2_asc">{getFieldLabel(columnSlots[2])} ↑</option>
                          <option value="slot2_desc">{getFieldLabel(columnSlots[2])} ↓</option>
                        </select>
                      </div>
                    </div>

                    <div className={styles.mobileFilterActions}>
                      <button
                        className={styles.mobileFilterReset}
                        onClick={() => {
                          setSourceFilter('alle');
                          setStatusFilter('alle');
                          setDateFilter('alle');
                          setSortOrder('neueste');
                        }}
                      >
                        Zurücksetzen
                      </button>
                      <button
                        className={styles.mobileFilterApply}
                        onClick={() => setShowMobileFilterSheet(false)}
                      >
                        Anwenden
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* 📱 MOBILE: Folder Bottom-Sheet */}
            <AnimatePresence>
              {showMobileFolderSheet && (
                <>
                  <motion.div
                    className={styles.mobileFilterOverlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setShowMobileFolderSheet(false)}
                  />
                  <motion.div
                    className={styles.mobileFolderSheet}
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  >
                    <div className={styles.mobileFilterHandle} />
                    <div className={styles.mobileFilterHeader}>
                      <h3>Ordner</h3>
                      <button
                        className={styles.mobileFilterClose}
                        onClick={() => setShowMobileFolderSheet(false)}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className={styles.mobileFolderList}>
                      {/* Alle Verträge */}
                      <button
                        className={`${styles.mobileFolderItem} ${activeFolder === null ? styles.active : ''}`}
                        onClick={() => {
                          setActiveFolder(null);
                          setStatusFilter('alle');
                          setShowMobileFolderSheet(false);
                        }}
                      >
                        <span className={styles.mobileFolderIcon} style={{ color: '#3b82f6' }}>
                          <FileText size={20} />
                        </span>
                        <span className={styles.mobileFolderName}>Alle Verträge</span>
                        <span className={styles.mobileFolderBadge}>{sidebarCounts.total}</span>
                        {activeFolder === null && <CheckCircle size={16} className={styles.mobileFolderCheck} />}
                      </button>

                      {/* Ohne Ordner */}
                      <button
                        className={`${styles.mobileFolderItem} ${activeFolder === 'unassigned' ? styles.active : ''}`}
                        onClick={() => {
                          setActiveFolder('unassigned');
                          setStatusFilter('alle');
                          setShowMobileFolderSheet(false);
                        }}
                      >
                        <span className={styles.mobileFolderIcon} style={{ color: '#94a3b8' }}>
                          <Folder size={20} />
                        </span>
                        <span className={styles.mobileFolderName}>Ohne Ordner</span>
                        <span className={styles.mobileFolderBadge}>{sidebarCounts.ohneOrdner}</span>
                        {activeFolder === 'unassigned' && <CheckCircle size={16} className={styles.mobileFolderCheck} />}
                      </button>

                      {/* User Folders */}
                      {folders.map((folder: FolderType) => (
                        <button
                          key={folder._id}
                          className={`${styles.mobileFolderItem} ${activeFolder === folder._id ? styles.active : ''}`}
                          onClick={() => {
                            setActiveFolder(folder._id);
                            setStatusFilter('alle');
                            setShowMobileFolderSheet(false);
                          }}
                        >
                          <span className={styles.mobileFolderIcon} style={{ color: folder.color || '#fbbf24' }}>
                            {folder.icon ? <span style={{ fontSize: '1.25rem' }}>{folder.icon}</span> : <Folder size={20} />}
                          </span>
                          <span className={styles.mobileFolderName}>{folder.name}</span>
                          {favoriteFolder === folder._id && (
                            <Star size={14} className={styles.mobileFolderStar} fill="currentColor" />
                          )}
                          <span className={styles.mobileFolderBadge}>{folder.contractCount ?? 0}</span>
                          {activeFolder === folder._id && <CheckCircle size={16} className={styles.mobileFolderCheck} />}
                        </button>
                      ))}

                      {/* Ordner erstellen */}
                      <button
                        className={styles.mobileFolderAdd}
                        onClick={() => {
                          setShowMobileFolderSheet(false);
                          setEditingFolder(null);
                          setFolderModalOpen(true);
                        }}
                      >
                        <FolderPlus size={20} />
                        <span>Neuen Ordner erstellen</span>
                      </button>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>

            {/* Content Area - nur dieser Bereich scrollt */}
            <div className={`${styles.contentArea} ${(activeSection !== 'contracts' || quickAnalysisModal.show) ? styles.contentAreaNoNav : ''} ${activeSection === 'upload' && uploadFiles.length === 0 && !quickAnalysisModal.show ? styles.contentAreaUploadFill : ''}`} ref={contentAreaRef} data-tour="contracts-list">
              {/* 📱 Mobile Back-Button ÜBER der Karte (wie im Mockup), außerhalb der Animation */}
              {activeSection === 'upload' && !quickAnalysisModal.show && (
                <button
                  className={`${styles.mobileBackButton} ${styles.uploadBackTop}`}
                  onClick={() => setActiveSection('contracts')}
                >
                  <ChevronLeft size={20} />
                  <span>Zurück zu Verträgen</span>
                </button>
              )}
              <AnimatePresence mode="wait" initial={false}>
                {/* ⚡ Re-Analyse-Ergebnis IN-PAGE (wie Upload→Analyse), nicht als Overlay */}
                {quickAnalysisModal.show && quickAnalysisModal.analysisResult && (
                  <motion.div
                    key="analysis-section"
                    className={styles.section}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* 📱 Mobile Back-Button (Desktop: ContractAnalysis hat eigenen Reset) */}
                    <button
                      className={styles.mobileBackButton}
                      onClick={closeQuickAnalysis}
                    >
                      <ChevronLeft size={20} />
                      <span>Zurück zu Verträgen</span>
                    </button>
                    <div className={styles.analysisContainer}>
                      <ContractAnalysis
                        contractName={quickAnalysisModal.contractName}
                        contractId={quickAnalysisModal.contractId}
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        initialResult={quickAnalysisModal.analysisResult as any}
                        onReset={closeQuickAnalysis}
                        onNavigateToContract={async (navContractId) => {
                          const analyzedContractId = quickAnalysisModal.contractId;
                          setQuickAnalysisModal({ show: false, contractName: '', contractId: '', analysisResult: null });
                          const refreshedContracts = await silentRefreshContracts(analyzedContractId);
                          const contract = refreshedContracts?.find((c: Contract) => c._id === navContractId);
                          if (contract) {
                            setSelectedContract(contract);
                            setShowDetails(true);
                            navigate(`/contracts?view=${navContractId}`, { replace: true });
                          }
                        }}
                      />
                    </div>
                  </motion.div>
                )}
                {activeSection === 'upload' && !quickAnalysisModal.show && (
                  <motion.div
                    key="upload-section"
                    className={`${styles.section} ${styles.uploadDocCard} ${uploadFiles.length === 0 ? styles.uploadFillHeight : ''}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    {/* ✅ KORRIGIERT: Free-User Upgrade-Bereich */}
                {!canUpload ? (
                  <div className={styles.upgradeSection}>
                    <div className={styles.upgradeIcon}>
                      <Zap size={48} />
                    </div>
                    <h2>Upgrade für Vertragsanalyse</h2>
                    <p className={styles.upgradeDescription}>
                      Schalte die KI-gestützte Vertragsanalyse frei und erhalte detaillierte Einblicke in deine Verträge.
                    </p>
                    
                    <div className={styles.upgradePlans}>
                      <div className={styles.upgradePlan}>
                        <div className={styles.upgradePlanHeader}>
                          <BarChart3 size={20} />
                          <h3>Business</h3>
                        </div>
                        <ul>
                          <li>✅ 50 Analysen pro Monat</li>
                          <li>✅ KI-Vertragsanalyse</li>
                          <li>✅ Rechtssicherheits-Check</li>
                          <li>✅ Optimierungsvorschläge</li>
                        </ul>
                      </div>
                      
                      <div className={`${styles.upgradePlan} ${styles.recommendedPlan}`}>
                        <div className={styles.upgradePlanHeader}>
                          <Crown size={20} />
                          <h3>Enterprise</h3>
                          <span className={styles.recommendedBadge}>Empfohlen</span>
                        </div>
                        <ul>
                          <li>✅ Unbegrenzte Analysen</li>
                          <li>✅ Mehrfach-Upload</li>
                          <li>✅ Batch-Analyse</li>
                          <li>✅ Alle Business-Features</li>
                        </ul>
                      </div>
                    </div>
                    
                    <div className={styles.upgradeActions}>
                      <button 
                        className={styles.upgradeButton}
                        onClick={() => window.location.href = '/pricing'}
                      >
                        <Crown size={16} />
                        Jetzt upgraden
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 🎨 GRADIENT-BAND HEADER (Redesign Variante C) */}
                    {!allAnalyzed && (
                      <div className={styles.uploadBand}>
                        <div className={styles.uploadBandTop}>
                          <div className={styles.uploadBandInner}>
                            <h2 className={styles.uploadBandTitle}>
                              {canMultiUpload ? "Verträge hochladen" : "Vertrag hochladen"}
                            </h2>
                            <p className={styles.uploadBandDesc}>
                              Geprüft wie vom Anwalt — Fristen automatisch im Blick.
                            </p>
                          </div>
                          {(userInfo.subscriptionPlan === 'free' || userInfo.subscriptionPlan === 'business') && userInfo.analysisLimit !== Infinity && (
                            <span className={styles.uploadBandBadge}>
                              {Math.max(0, userInfo.analysisLimit - userInfo.analysisCount)} / {userInfo.analysisLimit} Analysen
                              {userInfo.subscriptionPlan === 'free' && ' · einmalig'}
                              {userInfo.subscriptionPlan === 'business' && ' · mtl.'}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* 🎨 Gepolsterter Arbeitsbereich unter dem Band (Variante C) */}
                    <div className={styles.uploadBody}>

                    {/* 📱 UPLOAD TABS: Datei-Upload / E-Mail-Upload */}
                    {!allAnalyzed && (
                    <div className={styles.uploadTabs}>
                      <button
                        className={`${styles.uploadTab} ${uploadTab === 'file' ? styles.active : ''}`}
                        onClick={() => setUploadTab('file')}
                      >
                        <FileUp size={18} />
                        <span>Datei-Upload</span>
                      </button>
                      {userInfo.emailInboxAddress && (
                        <button
                          className={`${styles.uploadTab} ${uploadTab === 'email' ? styles.active : ''}`}
                          onClick={() => setUploadTab('email')}
                        >
                          <Mail size={18} />
                          <span>E-Mail-Upload</span>
                        </button>
                      )}
                    </div>
                    )}

                    {/* TAB CONTENT: E-Mail-Upload */}
                    {uploadTab === 'email' && userInfo.emailInboxAddress ? (
                      <div className={styles.emailUploadSection}>
                        <EmailInboxWidget
                          emailInboxAddress={userInfo.emailInboxAddress}
                          emailInboxEnabled={userInfo.emailInboxEnabled || false}
                          subscriptionPlan={userInfo.subscriptionPlan}
                          customEmailAlias={userInfo.customEmailAlias}
                          onUpdate={() => fetchUserInfo(true)}
                        />
                      </div>
                    ) : (
                    <>
                    {/* TAB CONTENT: Datei-Upload (Header → Gradient-Band oben, Variante C) */}
                    {/* ⚠️ Limit-Warnung für Business */}
                    {!allAnalyzed && userInfo.subscriptionPlan === 'business' && !hasAnalysesLeft && (
                      <div className={styles.limitWarning}>
                        <AlertCircle size={16} />
                        <span>
                          Analyse-Limit erreicht ({userInfo.analysisCount}/{userInfo.analysisLimit}).
                          <button onClick={() => window.location.href = '/pricing'}>
                            Mehr Analysen freischalten
                          </button>
                        </span>
                      </div>
                    )}
                    
                    {!allAnalyzed && (
                    <div className={styles.uploadWork}>
                      <div className={styles.uploadDzHost}>
                    <div
                      className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''} ${!hasAnalysesLeft ? styles.disabledUpload : ''} ${uploadFiles.length > 0 ? styles.hasFiles : ''}`}
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={uploadFiles.length === 0 && hasAnalysesLeft ? activateFileInput : undefined}
                      style={uploadFiles.length > 0 ? { cursor: 'default', pointerEvents: 'none' } : {}}
                    >
                      {uploadFiles.length > 0 ? (
                        <div
                          className={styles.multiFilePreview}
                          style={{ pointerEvents: 'auto' }}
                        >
                          <div 
                            className={styles.multiFileHeader}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className={styles.multiFileInfo}>
                              <FileText size={24} />
                              <div>
                                <h3>{uploadFiles.length} Datei{uploadFiles.length > 1 ? 'en' : ''} ausgewählt</h3>
                                <p>
                                  {uploadFiles.filter(f => f.status === 'completed').length} abgeschlossen, {' '}
                                  {uploadFiles.filter(f => f.status === 'error').length} Fehler, {' '}
                                  {uploadFiles.filter(f => f.status === 'pending').length} wartend
                                </p>
                              </div>
                            </div>
                            <div className={styles.multiFileActions}>
                              {/* ✅ Analyse als Default (Absicht der Besucher); "Nur speichern" als Sekundär-Option */}
                              {!isAnalyzing && uploadFiles.some(f => f.status === 'pending') && (
                                <>
                                  <button
                                    type="button"
                                    className={styles.uploadButton}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleUploadOnly(true);
                                    }}
                                  >
                                    <Upload size={16} />
                                    Hochladen & analysieren
                                  </button>
                                  <button
                                    type="button"
                                    className={styles.clearFilesButton}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleUploadOnly(false);
                                    }}
                                    title="Nur speichern, ohne eine Analyse zu verbrauchen"
                                  >
                                    Nur speichern
                                  </button>
                                </>
                              )}
                              <button
                                type="button"
                                className={styles.clearFilesButton}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  clearAllUploadFiles();
                                }}
                                disabled={isAnalyzing}
                              >
                                <X size={16} />
                                Alle entfernen
                              </button>
                            </div>
                          </div>

                          <div 
                            className={styles.filesList}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {uploadFiles.map((fileItem) => (
                              <motion.div 
                                key={fileItem.id}
                                className={styles.fileItem}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                layout
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className={styles.fileItemLeft}>
                                  <div className={styles.fileItemIcon}>
                                    {getUploadStatusIcon(fileItem.status)}
                                  </div>
                                  <div className={styles.fileItemInfo}>
                                    <div className={styles.fileItemName}>
                                      {fileItem.file.name}
                                    </div>
                                    <div className={styles.fileItemSize}>
                                      {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                                    </div>
                                  </div>
                                </div>
                                
                                <div className={styles.fileItemRight}>
                                  <div className={styles.fileItemStatus}>
                                    {getUploadStatusText(fileItem)}
                                  </div>
                                  <div className={styles.fileItemActions}>
                                    {fileItem.status === 'error' && hasAnalysesLeft && (
                                      <button 
                                        type="button"
                                        className={styles.retryButton}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          retryFileAnalysis(fileItem.id);
                                        }}
                                        disabled={isAnalyzing}
                                      >
                                        <RefreshCw size={14} />
                                      </button>
                                    )}
                                    {!isAnalyzing && fileItem.status === 'pending' && (
                                      <button 
                                        type="button"
                                        className={styles.removeFileButton}
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          removeUploadFile(fileItem.id);
                                        }}
                                      >
                                        <X size={14} />
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {fileItem.status === 'analyzing' && (
                                  <InlineAnalysisProgress
                                    progress={fileItem.progress || 0}
                                    fileName={fileItem.file.name}
                                  />
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className={styles.uploadPrompt}>
                          <div className={!hasAnalysesLeft ? styles.uploadIconLocked : styles.uploadIcon}>
                            {!hasAnalysesLeft ? <Lock size={20} /> : <Upload size={20} />}
                          </div>
                          <h3>
                            {!hasAnalysesLeft
                              ? "Analyse-Limit erreicht"
                              : canMultiUpload
                                ? "Dateien hierher ziehen"
                                : "Datei hierher ziehen"
                            }
                          </h3>
                          <p className={styles.uploadOr}>
                            {!hasAnalysesLeft
                              ? `Du hast deine ${userInfo.analysisLimit} kostenlosen Analysen genutzt. Schalte mit einem Upgrade weitere frei.`
                              : "oder wähle sie von deinem Gerät"
                            }
                          </p>
                          {hasAnalysesLeft && (
                            <button
                              type="button"
                              className={styles.dzButton}
                              onClick={(e) => { e.stopPropagation(); activateFileInput(); }}
                            >
                              <Upload size={15} />
                              {canMultiUpload ? "Dateien auswählen" : "Datei auswählen"}
                            </button>
                          )}
                          {/* ✨ Dezenter Enterprise-Hinweis für Business-Kunden */}
                          {userInfo.subscriptionPlan === 'business' && !canMultiUpload && hasAnalysesLeft && !enterpriseHintDismissed && (
                            <div
                              onClick={(e) => e.stopPropagation()}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                marginTop: '8px',
                                fontSize: '11px',
                                color: '#94a3b8'
                              }}
                            >
                              <span>Mehrere Verträge gleichzeitig hochladen?</span>
                              <button
                                onClick={(e) => { e.stopPropagation(); window.location.href = '/pricing'; }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#3b82f6',
                                  cursor: 'pointer',
                                  padding: '0',
                                  fontSize: '11px'
                                }}
                              >
                                Enterprise
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEnterpriseHintDismissed(true); }}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: '#cbd5e1',
                                  cursor: 'pointer',
                                  padding: '0 0 0 4px',
                                  fontSize: '11px'
                                }}
                              >
                                ×
                              </button>
                            </div>
                          )}
                          {!hasAnalysesLeft && (
                            <button
                              type="button"
                              className={`${styles.upgradeButton} ${styles.uploadPromptButton}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                e.preventDefault();
                                window.location.href = '/pricing';
                              }}
                            >
                              <Crown size={16} />
                              Jetzt upgraden
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                      </div>
                      {uploadFiles.length === 0 && (
                        <>
                          <div className={styles.uploadCaption}>
                            <b>Nach dem Upload:</b> automatisch geprüft, verwaltet und auf Fristen überwacht.
                          </div>
                          <div className={styles.uploadFoot}>
                            <span className={styles.uploadFmts}>PDF, DOCX · Mehrfachauswahl möglich</span>
                            <button onClick={openScanner} className={styles.scanButton}>
                              <Camera size={14} />
                              Dokument scannen
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    )}

                    {/* 📋 User Flow → in den Header-Band (rechts) verschoben (Variante C + B) */}

                    {/* ✅ DEINE BESTEHENDE ANALYSE-ANZEIGE bleibt unverändert */}
                    {selectedFile && uploadFiles.length === 1 && uploadFiles[0].status === 'completed' && (
                      <div className={styles.analysisContainer}>
                        <ContractAnalysis
                          file={selectedFile}
                          onReset={handleReset}
                          initialResult={uploadFiles[0].result}
                          onNavigateToContract={async (navContractId) => {
                            const refreshedContracts = await silentRefreshContracts(navContractId);
                            const contract = refreshedContracts?.find((c: Contract) => c._id === navContractId);
                            if (contract) {
                              setSelectedContract(contract);
                              setShowDetails(true);
                              navigate(`/contracts?view=${navContractId}`, { replace: true });
                            }
                          }}
                        />
                      </div>
                    )}

                    {/* 🆕 29.05.2026: Multi-Upload-Navigator zeigt eine Vertrags-Analyse + "X von N"-Schalter */}
                    {uploadFiles.length > 1 && (
                      <MultiUploadResultNavigator
                        uploadFiles={uploadFiles}
                        onReset={handleReset}
                      />
                    )}
                    </>
                    )}
                    </div>

                  </>
                )}
              </motion.div>
            )}

            {/* 📧 Email-Upload Sektion */}
            {activeSection === 'email-upload' && userInfo.emailInboxAddress && (
              <motion.div
                key="email-upload-section"
                className={styles.section}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <EmailInboxWidget
                  emailInboxAddress={userInfo.emailInboxAddress}
                  emailInboxEnabled={userInfo.emailInboxEnabled ?? true}
                  subscriptionPlan={userInfo.subscriptionPlan}
                  customEmailAlias={userInfo.customEmailAlias}
                  onUpdate={() => fetchUserInfo(true)}
                />
              </motion.div>
            )}

            {activeSection === 'contracts' && !quickAnalysisModal.show && (
              <motion.div
                key="contracts-section"
                className={`${styles.section} ${styles.contractsMainCard}`}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Results info — nur bei echten Filtern (Suche/Datum/Quelle), nicht bei Sidebar-Navigation */}
                {(searchQuery || dateFilter !== 'alle' || sourceFilter !== 'alle') && (
                  <div className={styles.resultsInfo}>
                    <div className={styles.resultsText}>
                      <strong>{contracts.length}</strong> Ergebnis
                      {contracts.length !== 1 ? 'se' : ''}
                      {searchQuery && (
                        <span> für <em>"{searchQuery}"</em></span>
                      )}
                    </div>
                    <button
                      className={styles.clearAllFilters}
                      onClick={clearAllFilters}
                    >
                      <X size={14} />
                      <span>Filter zurücksetzen</span>
                    </button>
                  </div>
                )}

                {loading ? (
                  /* ✅ Klare Lade-Anzeige MITTIG mit rotierendem Spinner */
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    padding: '80px 24px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '16px',
                    margin: '20px 0',
                    minHeight: '300px',
                    border: '1px solid #e2e8f0'
                  }}>
                    {/* ✅ CSS-Animation für zuverlässige Rotation */}
                    <div className={styles.spinnerRotate}>
                      <Loader size={48} style={{ color: '#3b82f6' }} />
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: 600,
                      color: '#1e293b'
                    }}>
                      Lädt Verträge...
                    </div>
                    <div style={{
                      fontSize: '14px',
                      color: '#64748b'
                    }}>
                      Einen Moment bitte
                    </div>
                  </div>
                ) : errorMessage ? (
                  <div className={styles.errorContainer}>
                    <AlertCircle size={40} className={styles.errorIcon} />
                    <p className={styles.errorMessage}>{errorMessage}</p>
                    <motion.button 
                      className={styles.retryButton} 
                      onClick={fetchContracts}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <RefreshCw size={16} />
                      <span>Erneut versuchen</span>
                    </motion.button>
                  </div>
                ) : contracts.length === 0 ? (
                  <div className={styles.emptyState}>
                    <FileText size={64} className={styles.emptyIcon} />
                    <h3>
                      {activeFiltersCount() > 0 || searchQuery ? "Keine Ergebnisse gefunden" : "Keine Verträge vorhanden"}
                    </h3>
                    <p>
                      {activeFiltersCount() > 0 || searchQuery
                        ? "Probiere andere Suchbegriffe oder Filter-Einstellungen."
                        : canUpload
                          ? "Lade deinen ersten Vertrag hoch, um ihn hier zu sehen."
                          : "Upgrade auf Business oder Enterprise für Vertragsanalyse."
                      }
                    </p>
                    {(activeFiltersCount() > 0 || searchQuery) ? (
                      <motion.button
                        className={styles.uploadButton}
                        onClick={clearAllFilters}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{ backgroundColor: '#ef4444' }}
                      >
                        <X size={16} />
                        <span>Filter zurücksetzen</span>
                      </motion.button>
                    ) : (
                      <motion.button
                        className={`${styles.uploadButton} ${!canUpload ? styles.upgradeButton : ''}`}
                        onClick={() => canUpload ? setActiveSection('upload') : window.location.href = '/pricing'}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        {canUpload ? <Upload size={16} /> : <Crown size={16} />}
                        <span>{canUpload ? 'Vertrag hochladen' : 'Jetzt upgraden'}</span>
                      </motion.button>
                    )}
                  </div>
                ) : (
                  // ✅ ENTERPRISE LIST VIEW (Tabelle) — Rasteransicht entfernt 29.05.2026
                  <>
                    <div className={styles.tableContainer}>
                      <table className={`${styles.contractsTable} ${bulkSelectMode ? styles.withCheckboxes : ''} ${previewContract ? styles.withPreview : ''}`}>
                        <thead>
                          <tr>
                            {/* 📋 Checkbox Column - only visible in bulk select mode */}
                            {bulkSelectMode && (
                              <th className={styles.checkboxColumn}>
                                <input
                                  type="checkbox"
                                  checked={selectedContracts.length === contracts.length && contracts.length > 0}
                                  onChange={toggleSelectAll}
                                  className={styles.bulkCheckbox}
                                />
                              </th>
                            )}
                            <th className={styles.sortableHeader} onClick={() => handleColumnSort('name_az', 'name_za')}>
                              <span className={styles.colHeaderV2}>
                                <span>Vertragsname</span>
                                {sortOrder === 'name_az' && <ChevronUp size={14} className={styles.sortArrow} />}
                                {sortOrder === 'name_za' && <ChevronDown size={14} className={styles.sortArrow} />}
                                {/* 🆕 V2 TODO #4b/#6: Sub-Label switchbar (ARIA + Keyboard) */}
                                <button
                                  ref={(el) => { colConfigTriggerRefs.current.set('sublabel', el); }}
                                  className={styles.colConfigBtn}
                                  onClick={(e) => openColumnConfig('sublabel', e)}
                                  aria-haspopup="dialog"
                                  aria-expanded={columnConfigFor === 'sublabel'}
                                  aria-controls={columnConfigFor === 'sublabel' ? 'col-config-popover-sublabel' : undefined}
                                  aria-label="Sub-Label unter Vertragsname konfigurieren"
                                  title="Sub-Label konfigurieren"
                                >
                                  <Pencil size={11} />
                                </button>
                                {columnConfigFor === 'sublabel' && (
                                  <div
                                    ref={colConfigPopoverRef}
                                    id="col-config-popover-sublabel"
                                    role="dialog"
                                    aria-label="Sub-Label unter Vertragsname"
                                    className={styles.colConfigPopover}
                                    style={columnConfigPos ? { top: columnConfigPos.top, left: columnConfigPos.left } : undefined}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={handleConfigListKeyDown}
                                  >
                                    <div className={styles.colConfigLabel}>Sub-Label unter Vertragsname</div>
                                    <div className={styles.colConfigList}>
                                      {SUB_LABEL_OPTIONS.map((opt) => (
                                        <button
                                          key={opt.key}
                                          role="option"
                                          aria-selected={subLabelField === opt.key}
                                          tabIndex={subLabelField === opt.key ? 0 : -1}
                                          className={`${styles.colConfigItem} ${subLabelField === opt.key ? styles.colConfigItemActive : ''}`}
                                          onClick={() => setSubLabelFieldPersist(opt.key)}
                                        >
                                          {subLabelField === opt.key ? <CheckCircle size={12} /> : <span style={{ width: 12 }} />}
                                          <span>{opt.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                    <div className={styles.colConfigFooter}>
                                      <button
                                        className={styles.colConfigResetBtn}
                                        onClick={resetSubLabel}
                                        aria-label="Sub-Label auf Standard-Wert zurücksetzen"
                                        title="Auf Standard-Wert zurücksetzen"
                                      >
                                        <RotateCcw size={11} />
                                        <span>Standard</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </span>
                            </th>
                            {/* 🆕 V2 TODO #4b/#6: dynamische Slot-Header mit Konfigurator (ARIA + Keyboard) */}
                            {[0, 1].map((slotIdx) => (
                              <th key={`slot-${slotIdx}`} className={styles.sortableHeader}>
                                <span className={styles.colHeaderV2}>
                                  <span>{getFieldLabel(columnSlots[slotIdx])}</span>
                                  <button
                                    ref={(el) => { colConfigTriggerRefs.current.set(slotIdx, el); }}
                                    className={styles.colConfigBtn}
                                    onClick={(e) => openColumnConfig(slotIdx, e)}
                                    aria-haspopup="dialog"
                                    aria-expanded={columnConfigFor === slotIdx}
                                    aria-controls={columnConfigFor === slotIdx ? `col-config-popover-${slotIdx}` : undefined}
                                    aria-label={`Spalte ${slotIdx + 1} konfigurieren`}
                                    title="Spalte konfigurieren"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  {columnConfigFor === slotIdx && (
                                    <div
                                      ref={colConfigPopoverRef}
                                      id={`col-config-popover-${slotIdx}`}
                                      role="dialog"
                                      aria-label={`Spalte ${slotIdx + 1} konfigurieren`}
                                      className={styles.colConfigPopover}
                                      style={columnConfigPos ? { top: columnConfigPos.top, left: columnConfigPos.left } : undefined}
                                      onClick={(e) => e.stopPropagation()}
                                      onKeyDown={handleConfigListKeyDown}
                                    >
                                      <div className={styles.colConfigLabel}>Spalte {slotIdx + 1} · Anzuzeigender Wert</div>
                                      <div className={styles.colConfigList}>
                                        {FIELD_OPTIONS.map((opt) => (
                                          <button
                                            key={opt.key}
                                            role="option"
                                            aria-selected={columnSlots[slotIdx] === opt.key}
                                            tabIndex={columnSlots[slotIdx] === opt.key ? 0 : -1}
                                            className={`${styles.colConfigItem} ${columnSlots[slotIdx] === opt.key ? styles.colConfigItemActive : ''}`}
                                            onClick={() => setColumnSlotField(slotIdx, opt.key)}
                                          >
                                            {columnSlots[slotIdx] === opt.key ? <CheckCircle size={12} /> : <span style={{ width: 12 }} />}
                                            <span>{opt.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                      <div className={styles.colConfigFooter}>
                                        <button
                                          className={styles.colConfigResetBtn}
                                          onClick={() => resetColumnSlot(slotIdx)}
                                          aria-label={`Spalte ${slotIdx + 1} auf Standard zurücksetzen`}
                                          title="Auf Standard-Wert zurücksetzen"
                                        >
                                          <RotateCcw size={11} />
                                          <span>Standard</span>
                                        </button>
                                      </div>
                                    </div>
                                  )}
                                </span>
                              </th>
                            ))}
                            <th className={styles.sortableHeader} onClick={() => handleColumnSort('status_asc', 'status_desc')}>
                              <span className={styles.sortableHeaderContent}>
                                <span>Status</span>
                                {sortOrder === 'status_asc' && <ChevronUp size={14} className={styles.sortArrow} />}
                                {sortOrder === 'status_desc' && <ChevronDown size={14} className={styles.sortArrow} />}
                              </span>
                            </th>
                            {/* 🆕 V2 TODO #4b/#6: 3. Slot-Spalte (default Ablauf, konfigurierbar) */}
                            <th className={`${styles.sortableHeader} ${styles.uploadDateColumn}`}>
                              <span className={styles.colHeaderV2}>
                                <span>{getFieldLabel(columnSlots[2])}</span>
                                <button
                                  ref={(el) => { colConfigTriggerRefs.current.set(2, el); }}
                                  className={styles.colConfigBtn}
                                  onClick={(e) => openColumnConfig(2, e)}
                                  aria-haspopup="dialog"
                                  aria-expanded={columnConfigFor === 2}
                                  aria-controls={columnConfigFor === 2 ? 'col-config-popover-2' : undefined}
                                  aria-label="Spalte 3 konfigurieren"
                                  title="Spalte konfigurieren"
                                >
                                  <Pencil size={11} />
                                </button>
                                {columnConfigFor === 2 && (
                                  <div
                                    ref={colConfigPopoverRef}
                                    id="col-config-popover-2"
                                    role="dialog"
                                    aria-label="Spalte 3 konfigurieren"
                                    className={styles.colConfigPopover}
                                    style={columnConfigPos ? { top: columnConfigPos.top, left: columnConfigPos.left } : undefined}
                                    onClick={(e) => e.stopPropagation()}
                                    onKeyDown={handleConfigListKeyDown}
                                  >
                                    <div className={styles.colConfigLabel}>Spalte 3 · Anzuzeigender Wert</div>
                                    <div className={styles.colConfigList}>
                                      {FIELD_OPTIONS.map((opt) => (
                                        <button
                                          key={opt.key}
                                          role="option"
                                          aria-selected={columnSlots[2] === opt.key}
                                          tabIndex={columnSlots[2] === opt.key ? 0 : -1}
                                          className={`${styles.colConfigItem} ${columnSlots[2] === opt.key ? styles.colConfigItemActive : ''}`}
                                          onClick={() => setColumnSlotField(2, opt.key)}
                                        >
                                          {columnSlots[2] === opt.key ? <CheckCircle size={12} /> : <span style={{ width: 12 }} />}
                                          <span>{opt.label}</span>
                                        </button>
                                      ))}
                                    </div>
                                    <div className={styles.colConfigFooter}>
                                      <button
                                        className={styles.colConfigResetBtn}
                                        onClick={() => resetColumnSlot(2)}
                                        aria-label="Spalte 3 auf Standard zurücksetzen"
                                        title="Auf Standard-Wert zurücksetzen"
                                      >
                                        <RotateCcw size={11} />
                                        <span>Standard</span>
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </span>
                            </th>
                            <th>Aktionen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {contracts.length === 0 ? (
                            <tr>
                              <td colSpan={bulkSelectMode ? 7 : 6} style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <div style={{ color: '#6b7280' }}>
                                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                                  <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>
                                    {activeFiltersCount() > 0 || searchQuery ? 'Keine Ergebnisse gefunden' : 'Keine Verträge vorhanden'}
                                  </h3>
                                  <p style={{ margin: '0', fontSize: '14px' }}>
                                    {activeFiltersCount() > 0 || searchQuery
                                      ? 'Probiere andere Suchbegriffe oder Filter-Einstellungen.'
                                      : canUpload
                                        ? 'Lade deinen ersten Vertrag hoch, um ihn hier zu sehen.'
                                        : 'Upgrade auf Business oder Enterprise für Vertragsanalyse.'
                                    }
                                  </p>
                                  {activeFiltersCount() > 0 || searchQuery ? (
                                    <button
                                      style={{
                                        marginTop: '16px',
                                        padding: '8px 16px',
                                        backgroundColor: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: 500
                                      }}
                                      onClick={clearAllFilters}
                                    >
                                      <X size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                      Filter zurücksetzen
                                    </button>
                                  ) : !searchQuery && canUpload && (
                                    <button 
                                      style={{
                                        marginTop: '16px',
                                        padding: '8px 16px',
                                        backgroundColor: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        cursor: 'pointer'
                                      }}
                                      onClick={() => fileInputRef.current?.click()}
                                    >
                                      <Plus size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                                      Ersten Vertrag hochladen
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ) : displayedContracts.map((contract) => (
                            <motion.tr
                              key={contract._id}
                              className={`${styles.tableRow} ${selectedContracts.includes(contract._id) ? styles.selectedRow : ''} ${previewContract?._id === contract._id ? styles.previewActive : ''}`}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              onClick={() => handleRowClick(contract)}
                              onDoubleClick={() => handleRowDoubleClick(contract)}
                              onMouseEnter={(e) => handleRowMouseEnter(contract, e)}
                              onMouseMove={handleRowMouseMove}
                              onMouseLeave={handleRowMouseLeave}
                            >
                              {/* 📋 Checkbox Cell - only visible in bulk select mode */}
                              {bulkSelectMode && (
                                <td
                                  className={styles.checkboxColumn}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedContracts.includes(contract._id)}
                                    onChange={() => toggleSelectContract(contract._id)}
                                    className={styles.bulkCheckbox}
                                  />
                                </td>
                              )}
                              <td>
                                <div className={styles.contractName}>
                                  {(() => {
                                    const ft = getFileType(contract.name);
                                    return (
                                      <div className={`${styles.contractIcon} ${styles[`contractIcon_${ft.variant}`]}`}>
                                        <span className={styles.contractIconLabel}>{ft.label}</span>
                                      </div>
                                    );
                                  })()}
                                  <div className={styles.contractNameWrap}>
                                    <span className={styles.contractNameText} title={fixUtf8Display(contract.name)}>{fixUtf8Display(contract.name)}</span>
                                    {/* 🆕 V2 TODO #4b: Sub-Label switchbar via renderSubLabel */}
                                    <div className={styles.contractSubLabelV2}>
                                      {renderSubLabel(contract)}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              {/* 🆕 V2 TODO #4b: dynamische Slot-Cells (Slot 0+1) */}
                              {[0, 1].map((slotIdx) => (
                                <td key={`cell-${slotIdx}`}>
                                  <span className={styles.contractDetail}>
                                    {renderColumnValue(contract, columnSlots[slotIdx])}
                                  </span>
                                </td>
                              ))}
                              <td>
                                <span className={`${styles.statusBadge} ${getStatusColor(calculateSmartStatus(contract))}`}>
                                  {calculateSmartStatus(contract)}
                                </span>
                                {/* 🆕 Smart Signature Status Badge */}
                                {renderSignatureBadge(contract)}
                              </td>
                              <td className={styles.uploadDateColumn}>
                                {/* 🆕 V2 TODO #4b: 3. Slot-Cell (default Ablauf, konfigurierbar) */}
                                <span className={styles.contractDetail}>
                                  {renderColumnValue(contract, columnSlots[2])}
                                </span>
                              </td>
                              <td>
                                {/* 🆕 V2 TODO #1: nur 2 Icons (Mockup-Style) — 👁 PDF + ⋮ Mehr */}
                                <div className={styles.actionButtonsV2} onClick={(e) => e.stopPropagation()} onMouseEnter={handleRowMouseLeave}>
                                  <button
                                    className={styles.actionButton}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openSmartPDF(contract, true);
                                    }}
                                    title={contract.envelope?.s3KeySealed ? 'Signiertes PDF öffnen' : 'PDF öffnen'}
                                    disabled={pdfLoading[contract._id]}
                                  >
                                    {pdfLoading[contract._id] ? (
                                      <Loader size={16} className={styles.loadingIcon} />
                                    ) : (
                                      <ExternalLink size={16} />
                                    )}
                                  </button>
                                  <div className={styles.morePopoverWrap}>
                                    <button
                                      className={`${styles.actionButton} ${morePopoverFor === contract._id ? styles.active : ''}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (morePopoverFor === contract._id) {
                                          setMorePopoverFor(null);
                                          setMorePopoverPos(null);
                                          setMorePopoverFolderExpanded(false);
                                        } else {
                                          // 🛠️ Fixed-Portal: Position vom Button (rechtsbündig, vom Rand geklammert)
                                          const rect = e.currentTarget.getBoundingClientRect();
                                          const right = Math.max(8, window.innerWidth - rect.right);
                                          const spaceBelow = window.innerHeight - rect.bottom - 12;
                                          const spaceAbove = rect.top - 12;
                                          // Nach oben aufklappen, wenn unten zu wenig Platz (lange Listen, unterste Zeilen)
                                          if (spaceBelow < 300 && spaceAbove > spaceBelow) {
                                            setMorePopoverPos({ right, bottom: window.innerHeight - rect.top + 6, maxHeight: spaceAbove });
                                          } else {
                                            setMorePopoverPos({ right, top: rect.bottom + 6, maxHeight: spaceBelow });
                                          }
                                          setMorePopoverFor(contract._id);
                                          setMorePopoverFolderExpanded(false);
                                        }
                                      }}
                                      title="Mehr"
                                    >
                                      <MoreVertical size={16} />
                                    </button>
                                    {morePopoverFor === contract._id && morePopoverPos && createPortal(
                                      <div
                                        className={styles.morePopover}
                                        style={{
                                          position: 'fixed',
                                          right: morePopoverPos.right,
                                          top: morePopoverPos.top,
                                          bottom: morePopoverPos.bottom,
                                          maxHeight: morePopoverPos.maxHeight,
                                          overflowY: 'auto',
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {/* 1. Vollständige Details öffnen */}
                                        <button
                                          className={styles.morePopoverItem}
                                          onClick={() => {
                                            setMorePopoverFor(null);
                                            setSelectedContract(contract);
                                            setShowDetails(true);
                                            setOpenEditModalDirectly(false);
                                            setModalInitialTab('overview');
                                          }}
                                        >
                                          <FileText size={14} />
                                          <span>Vollständige Details öffnen</span>
                                        </button>
                                        {/* 2. Bearbeiten */}
                                        {canEditContract(contract) && (
                                          <button
                                            className={styles.morePopoverItem}
                                            onClick={() => {
                                              setMorePopoverFor(null);
                                              handleEditContract(contract);
                                            }}
                                          >
                                            <Edit size={14} />
                                            <span>Bearbeiten</span>
                                          </button>
                                        )}
                                        {/* 3. Analyse anzeigen / Jetzt analysieren */}
                                        {isContractNotAnalyzed(contract) ? (
                                          canEditContract(contract) && (
                                            <button
                                              className={styles.morePopoverItem}
                                              onClick={() => {
                                                setMorePopoverFor(null);
                                                handleAnalyzeExistingContract(contract);
                                              }}
                                              disabled={analyzingContract[contract._id]}
                                            >
                                              {analyzingContract[contract._id] ? (
                                                <Loader size={14} className={styles.spinning} />
                                              ) : (
                                                <Zap size={14} />
                                              )}
                                              <span>Jetzt analysieren</span>
                                            </button>
                                          )
                                        ) : (
                                          <button
                                            className={styles.morePopoverItem}
                                            onClick={() => {
                                              setMorePopoverFor(null);
                                              setSelectedContract(contract);
                                              setShowDetails(true);
                                              setOpenEditModalDirectly(false);
                                              setModalInitialTab('analysis');
                                            }}
                                          >
                                            <Sparkles size={14} />
                                            <span>Analyse anzeigen</span>
                                          </button>
                                        )}
                                        {/* 4. Erinnerung einrichten */}
                                        {canEditContract(contract) && (
                                          <button
                                            className={styles.morePopoverItem}
                                            onClick={() => {
                                              setMorePopoverFor(null);
                                              setReminderSettingsModal({ show: true, contract });
                                            }}
                                          >
                                            <Bell size={14} />
                                            <span>Erinnerung einrichten</span>
                                          </button>
                                        )}
                                        <div className={styles.morePopoverDivider} />
                                        {/* 5. In Ordner verschieben */}
                                        <button
                                          className={styles.morePopoverItem}
                                          onClick={() => setMorePopoverFolderExpanded((v) => !v)}
                                        >
                                          <Folder size={14} />
                                          <span style={{ flex: 1, textAlign: 'left' }}>In Ordner verschieben</span>
                                          {morePopoverFolderExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                        </button>
                                        {morePopoverFolderExpanded && (
                                          <div className={styles.morePopoverFolderList}>
                                            <button
                                              className={`${styles.morePopoverItem} ${styles.morePopoverFolderItem} ${!contract.folderId ? styles.morePopoverFolderActive : ''}`}
                                              onClick={() => {
                                                setMorePopoverFor(null);
                                                setMorePopoverFolderExpanded(false);
                                                handleMoveToFolder(contract._id, null);
                                              }}
                                            >
                                              <Folder size={12} style={{ color: '#94a3b8' }} />
                                              <span>Ohne Ordner</span>
                                              {!contract.folderId && <CheckCircle size={12} style={{ marginLeft: 'auto' }} />}
                                            </button>
                                            {folders.map((f) => (
                                              <button
                                                key={f._id}
                                                className={`${styles.morePopoverItem} ${styles.morePopoverFolderItem} ${contract.folderId === f._id ? styles.morePopoverFolderActive : ''}`}
                                                onClick={() => {
                                                  setMorePopoverFor(null);
                                                  setMorePopoverFolderExpanded(false);
                                                  handleMoveToFolder(contract._id, f._id);
                                                }}
                                              >
                                                {f.icon ? (
                                                  <span style={{ fontSize: 13, lineHeight: 1, width: 14, textAlign: 'center' }}>
                                                    {f.icon}
                                                  </span>
                                                ) : (
                                                  <Folder size={12} style={{ color: f.color || '#fbbf24' }} />
                                                )}
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                  {f.name}
                                                </span>
                                                {contract.folderId === f._id && <CheckCircle size={12} style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                                              </button>
                                            ))}
                                          </div>
                                        )}
                                        {/* 6. Löschen */}
                                        {canDeleteContract(contract) && (
                                          <button
                                            className={`${styles.morePopoverItem} ${styles.morePopoverDanger}`}
                                            onClick={() => {
                                              setMorePopoverFor(null);
                                              handleDeleteContract(contract._id, fixUtf8Display(contract.name));
                                            }}
                                          >
                                            <Trash2 size={14} />
                                            <span>Löschen</span>
                                          </button>
                                        )}
                                      </div>,
                                      document.body
                                    )}
                                  </div>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* ✅ MOBILE VIEW — kompakte Listen-Zeilen (Outlook-Style) */}
                    <div className={styles.mobileCardsContainer}>
                      <div className={styles.mobileListContainer}>
                        {displayedContracts.map((contract) => (
                          <MobileListRow
                            key={`list-${contract._id}`}
                            contract={contract}
                          />
                        ))}
                      </div>
                    </div>

                    {/* ✅ NEU: Infinite Scroll Loading Indicator & Sentinel */}
                    {/* 📱 MOBILE-FIX: Extra padding-bottom damit es nicht von Bottom-Nav überdeckt wird */}
                    {paginationInfo.hasMore && (
                      <div
                        ref={sentinelRef}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '16px 0 160px 0', // 📱 160px padding-bottom für Mobile Bottom-Nav + Safe Area
                          marginTop: '0'
                        }}
                      >
                        {loadingMore ? (
                          <>
                            {/* ✅ CSS-Animation für zuverlässige Spinner-Rotation */}
                            <div className={styles.spinnerRotate}>
                              <Loader size={32} style={{ color: '#3b82f6' }} />
                            </div>
                            <div style={{
                              fontSize: '15px',
                              color: '#374151',
                              fontWeight: 600
                            }}>
                              Lädt weitere Verträge...
                            </div>
                          </>
                        ) : (
                          <>
                            <div style={{
                              fontSize: '14px',
                              color: '#6b7280',
                              fontWeight: 500
                            }}>
                              {contracts.length} von {paginationInfo.total} Verträgen geladen
                            </div>
                            {/* 🆕 Sicherheitsnetz: manuell nachladen, falls der Auto-Observer je streikt */}
                            <button
                              type="button"
                              onClick={() => loadMoreContracts()}
                              style={{
                                marginTop: '4px', padding: '8px 18px', borderRadius: '9px',
                                border: '1px solid #e2e8f0', background: '#ffffff', color: '#2563eb',
                                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                              }}
                            >
                              Mehr laden
                            </button>
                          </>
                        )}
                      </div>
                    )}

                    {/* 📋 Bulk Action Bar - only show in bulk select mode */}
                    {bulkSelectMode && selectedContracts.length > 0 && (
                      <motion.div
                        className={styles.bulkActionBar}
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className={styles.bulkActionInfo}>
                          <CheckCircle size={20} />
                          <span className={styles.bulkActionCount}>
                            {selectedContracts.length} von {paginationInfo.total} ausgewählt
                          </span>
                        </div>

                        <div className={styles.bulkActionButtons}>
                          {/* Move to Folder Dropdown */}
                          <div className={styles.bulkDropdownWrapper}>
                            <button
                              className={styles.bulkActionButton}
                              onClick={() => setBulkActionDropdownOpen(!bulkActionDropdownOpen)}
                            >
                              <Folder size={16} />
                              In Ordner verschieben
                            </button>
                            {bulkActionDropdownOpen && (
                              <div className={styles.bulkFolderDropdown}>
                                <button
                                  className={styles.bulkFolderItem}
                                  onClick={() => handleBulkMoveToFolder(null)}
                                >
                                  <span className={styles.folderIcon}>📂</span>
                                  <span>Ohne Ordner</span>
                                </button>
                                {folders.map((folder) => (
                                  <button
                                    key={folder._id}
                                    className={styles.bulkFolderItem}
                                    onClick={() => handleBulkMoveToFolder(folder._id)}
                                  >
                                    <span
                                      className={styles.folderIcon}
                                      style={{ color: folder.color }}
                                    >
                                      {folder.icon}
                                    </span>
                                    <span>{folder.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* ZIP Download Button */}
                          <button
                            className={styles.bulkActionButton}
                            onClick={handleBulkDownloadZip}
                            title="Ausgewählte Verträge als ZIP herunterladen"
                          >
                            <Download size={16} />
                            Als ZIP herunterladen
                          </button>

                          {/* Delete Button */}
                          <button
                            className={`${styles.bulkActionButton} ${styles.bulkDeleteButton}`}
                            onClick={handleBulkDelete}
                          >
                            <Trash2 size={16} />
                            Löschen
                          </button>

                          {/* Cancel Button */}
                          <button
                            className={styles.bulkCancelButton}
                            onClick={() => setSelectedContracts([])}
                          >
                            <X size={16} />
                            Abbrechen
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
            </div>
            {/* End of contentArea */}
          </main>
          {/* End of mainContent */}

          {/* 🆕 REDESIGNED PREVIEW PANEL - Right Side */}
          {previewContract && activeSection === 'contracts' && (
            <aside className={styles.previewPanel}>
              {/* 🎨 Mockup-1:1 Header (Light Mode, kein Icon, h2 statt h3) */}
              <div className={styles.previewHeader}>
                <div className={styles.previewHeaderInfo}>
                  <div className={styles.previewHeaderText}>
                    <span className={styles.previewHeaderLabel}>Vertragsdetails</span>
                    <h3 className={styles.previewHeaderTitle}>{previewContract.name}</h3>
                    {/* 🆕 Status-Pill mit Pulse direkt im Header */}
                    {(() => {
                      const smart = calculateSmartStatus(previewContract);
                      // Mapping: tatsächliche Werte aus calculateSmartStatus (Z. 3244+)
                      let pulseStatus: 'aktiv' | 'warn' | 'bad' | 'muted' = 'muted';
                      if (smart === 'Aktiv') pulseStatus = 'aktiv';
                      else if (smart === 'Läuft ab' || smart === 'Gekündigt — offen') pulseStatus = 'warn';
                      else if (smart === 'Beendet' || smart === 'Gekündigt ✓' || smart === 'Gekündigt') pulseStatus = 'bad';
                      const expiry = previewContract.expiryDate ? formatDate(previewContract.expiryDate) : null;
                      return (
                        <span
                          className={styles.previewHeaderStatusPill}
                          data-status={pulseStatus}
                        >
                          <span className={styles.previewHeaderPulse} />
                          {smart}{expiry ? ` · läuft ${expiry} ab` : ''}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <button
                  className={styles.previewCloseBtn}
                  onClick={() => setPreviewContract(null)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* 📄 PDF Thumbnail — zuklappbar */}
              {(previewPdfLoading || previewPdfUrl || previewPdfError) && (
                <div className={styles.previewThumbnailSection}>
                  <button
                    className={styles.previewThumbnailToggle}
                    onClick={toggleSidebarPdf}
                    title={sidebarPdfCollapsed ? 'PDF-Vorschau einblenden' : 'PDF-Vorschau ausblenden'}
                  >
                    <span className={styles.previewThumbnailToggleLabel}>PDF-Vorschau</span>
                    {sidebarPdfCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                  {!sidebarPdfCollapsed && (
                    previewPdfLoading && !previewPdfUrl ? (
                      <div className={styles.previewThumbnailLoading}>
                        <Loader size={24} className={styles.spinnerRotate} />
                      </div>
                    ) : previewPdfUrl ? (
                      <div
                        className={styles.previewThumbnail}
                        onClick={() => {
                          setSelectedContract(previewContract);
                          setModalInitialTab('pdf');
                          setShowDetails(true);
                        }}
                      >
                        <Document
                          file={previewPdfUrl}
                          loading={null}
                          error={
                            <div className={styles.previewThumbnailError}>
                              <AlertCircle size={16} />
                              <span>Vorschau nicht verfügbar</span>
                            </div>
                          }
                        >
                          <Page pageNumber={1} width={380} renderTextLayer={false} renderAnnotationLayer={false} />
                        </Document>
                      </div>
                    ) : previewPdfError ? (
                      <div className={styles.previewThumbnailError}>
                        <AlertCircle size={16} />
                        <span>PDF-Vorschau nicht verfügbar</span>
                      </div>
                    ) : null
                  )}
                </div>
              )}

              <div className={styles.previewContent}>
                {/* Status & Analysiert sind jetzt im Header bzw. im Score-Ring-Meta — keine Redundanz */}

                {/* 🆕 Leer-Zustand: noch nicht analysierter Vertrag ohne Score/Summary/Termine */}
                {shouldShowAnalyzeButton(previewContract)
                  && (previewContract.contractScore === undefined || previewContract.contractScore === null)
                  && !previewContract.summary
                  && (!previewContract.importantDates || previewContract.importantDates.length === 0) && (
                  <div className={styles.previewEmptyState}>
                    <div className={styles.previewEmptyIcon}><FileText size={22} /></div>
                    <div className={styles.previewEmptyTitle}>Noch nicht analysiert</div>
                    <div className={styles.previewEmptyText}>Lass die KI Risiken, Fristen &amp; einen Score erstellen — der Button unten startet die Analyse.</div>
                  </div>
                )}

                {/* 🎨 Mockup-1:1 Score-Ring via CSS conic-gradient */}
                {previewContract.contractScore !== undefined && previewContract.contractScore !== null && (
                  <div className={styles.previewSection}>
                    <div className={styles.previewSectionHeader}>
                      <h5>Vertragsbewertung</h5>
                    </div>
                    <div className={styles.previewScoreRing}>
                      <div
                        className={styles.scoreCircle}
                        style={{
                          ['--scoreVal' as string]: previewContract.contractScore,
                          ['--scoreColor' as string]: previewContract.contractScore >= 70 ? '#10b981' : previewContract.contractScore >= 40 ? '#f59e0b' : '#ef4444',
                          ['--scoreHalo' as string]: previewContract.contractScore >= 70 ? '#d1fae5' : previewContract.contractScore >= 40 ? '#fef3c7' : '#fee2e2',
                        } as React.CSSProperties}
                      >
                        <div>{previewContract.contractScore}</div>
                      </div>
                      <div className={styles.scoreDetails}>
                        <div className={styles.scoreDetailValue}>
                          {previewContract.contractScore >= 70 ? 'Guter Vertrag' : previewContract.contractScore >= 40 ? 'Solider Vertrag — Verbesserungspotenzial' : 'Kritische Punkte'}
                        </div>
                        <div className={styles.scoreDetailMeta}>
                          {previewContract.risiken && previewContract.risiken.length > 0 && (
                            <span>
                              <AlertTriangle size={13} style={{ color: '#b91c1c' }} />
                              {previewContract.risiken.length} Risiken
                            </span>
                          )}
                          {previewContract.optimierungen && previewContract.optimierungen.length > 0 && (
                            <span>
                              <Sparkles size={13} style={{ color: '#3b82f6' }} />
                              {previewContract.optimierungen.length} Optimierungen
                            </span>
                          )}
                          {previewContract.analyzed && (
                            <span>
                              <CheckCircle size={13} style={{ color: '#059669' }} />
                              KI-analysiert
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Badges — "Nicht analysiert"-Pille entfernt: redundant zu Header-Pille, Leerzustand & Analyse-Button */}
                {(previewContract.isGenerated || previewContract.isOptimized || previewContract.envelope || typeof previewContract.signatureStatus === 'string') && (
                  <div className={styles.previewBadges}>
                    {previewContract.isGenerated && (
                      <span className={styles.previewBadge} style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                        <Sparkles size={12} />
                        Generiert
                      </span>
                    )}
                    {previewContract.isOptimized && (
                      <span className={styles.previewBadge} style={{ background: '#dcfce7', color: '#15803d' }}>
                        <CheckCircle size={12} />
                        Optimiert
                      </span>
                    )}
                    {renderSignatureBadge(previewContract)}
                  </div>
                )}

                {/* Eckdaten als kompakte <dl>-Liste (Mockup-Style) */}
                {(() => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const c = previewContract as any;
                  const anbieter = String(c.anbieter ?? '').trim() || previewContract.provider?.displayName;
                  const vertragsnummer = String(c.vertragsnummer ?? '').trim() || String(c.contractNumber ?? '').trim();
                  // Vertragstyp: gleiche Fallback-Kette wie Spalte/Sortierung (KI-Label > contractType > Kategorie)
                  const vertragstyp = previewContract.contractTypeLabel || previewContract.contractType || previewContract.provider?.category;
                  const items: Array<{ label: string; value: string; cls?: string }> = [];
                  if (anbieter) items.push({ label: 'Anbieter', value: anbieter });
                  if (vertragstyp) items.push({ label: 'Vertragstyp', value: vertragstyp });
                  if (previewContract.laufzeit) items.push({ label: 'Laufzeit', value: previewContract.laufzeit });
                  if (previewContract.kuendigung) items.push({ label: 'Kündigung', value: previewContract.kuendigung, cls: styles.warn });
                  if (previewContract.startDate) items.push({ label: 'Vertragsbeginn', value: formatDate(previewContract.startDate) });
                  // Zahlung: paymentAmount ODER altes kosten-Feld (wie Spalte), 0 € korrekt anzeigen
                  const zahlungBetrag = previewContract.paymentAmount ?? c.kosten;
                  if (zahlungBetrag !== undefined && zahlungBetrag !== null && zahlungBetrag !== '') {
                    const freq = previewContract.paymentFrequency ? ` / ${previewContract.paymentFrequency}` : '';
                    items.push({ label: 'Zahlung', value: `${zahlungBetrag} €${freq}` });
                  }
                  if (vertragsnummer) items.push({ label: 'Vertragsnummer', value: vertragsnummer });
                  if (items.length === 0) return null;
                  return (
                    <div className={styles.previewSection}>
                      <div className={styles.previewSectionHeader}>
                        <div className={`${styles.previewSectionIcon} ${styles.summary}`}>
                          <FileText size={14} />
                        </div>
                        <h5>Eckdaten</h5>
                      </div>
                      <dl className={styles.previewEckdaten}>
                        {items.map((it, i) => (
                          <Fragment key={i}>
                            <dt>{it.label}</dt>
                            <dd className={it.cls} title={it.value}>{it.value}</dd>
                          </Fragment>
                        ))}
                      </dl>
                    </div>
                  );
                })()}

                {/* 📅 Wichtige Termine - KI-extrahierte Datums (VOR Zusammenfassung) */}
                {/* Wrapper passt die geteilte Komponente NUR hier in den flachen Sidebar-Rhythmus ein */}
                {previewContract.importantDates && previewContract.importantDates.length > 0 && (
                  <div className={styles.previewSharedWrap}>
                    <ImportantDatesSection
                      importantDates={previewContract.importantDates}
                      contractName={previewContract.name}
                    />
                  </div>
                )}

                {/* ⏰ Wichtige Fristen & Hinweise — universelle Frist-Regelungen aus Date Hunt */}
                {Array.isArray(previewContract.fristHinweise) && previewContract.fristHinweise.length > 0 && (
                  <div className={styles.previewSharedWrap}>
                    <FristHinweiseSection fristHinweise={previewContract.fristHinweise} />
                  </div>
                )}

                {/* Summary Section */}
                {previewContract.summary && (
                  <div className={styles.previewSection}>
                    <div className={styles.previewSectionHeader}>
                      <div className={`${styles.previewSectionIcon} ${styles.summary}`}>
                        <FileText size={14} />
                      </div>
                      <h5>Zusammenfassung</h5>
                    </div>
                    <p className={styles.previewSummary}>
                      {summaryExpanded || previewContract.summary.length <= 200
                        ? previewContract.summary
                        : previewContract.summary.slice(0, 200).replace(/\s+\S*$/, '') + '… '}
                      {previewContract.summary.length > 200 && (
                        <span
                          className={styles.previewRiskMore}
                          onClick={() => setSummaryExpanded(v => !v)}
                        >{summaryExpanded ? 'Weniger anzeigen' : 'Weiterlesen'}</span>
                      )}
                    </p>
                  </div>
                )}

                {/* Risks Section — Mockup-Style: bold Title + Description */}
                {previewContract.risiken && previewContract.risiken.length > 0 && (
                  <div className={styles.previewSection}>
                    <div className={styles.previewSectionHeader}>
                      <div className={`${styles.previewSectionIcon} ${styles.risks}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <h5>Erkannte Risiken ({previewContract.risiken.length})</h5>
                    </div>
                    <div className={styles.previewRiskList}>
                      {previewContract.risiken.slice(0, 3).map((risk, i) => {
                        const isObj = typeof risk === 'object' && risk !== null;
                        const obj = isObj ? (risk as { title?: string; description?: string }) : null;
                        const title = obj?.title || '';
                        const desc = obj?.description || (isObj ? '' : (risk as string));
                        return (
                          <div key={i} className={styles.previewRiskItem}>
                            <AlertTriangle size={14} className={styles.previewRiskIcon} />
                            <div className={styles.previewRiskContent}>
                              {title && <strong className={styles.previewRiskTitle}>{title}</strong>}
                              <span className={styles.previewRiskDesc}>{desc || title || 'Unbekanntes Risiko'}</span>
                            </div>
                          </div>
                        );
                      })}
                      {previewContract.risiken.length > 3 && (
                        <span
                          className={styles.previewRiskMore}
                          onClick={() => {
                            setSelectedContract(previewContract);
                            setModalInitialTab('analysis');
                            setShowDetails(true);
                          }}
                        >+{previewContract.risiken.length - 3} weitere Risiken anzeigen</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Actions - Redesigned */}
              <div className={styles.previewActions}>
                {/* ⚡ Prominenter Analyse-Button wenn nicht analysiert */}
                {shouldShowAnalyzeButton(previewContract) && (
                  <button
                    className={`${styles.previewActionBtn} ${styles.analyze}`}
                    onClick={() => handleAnalyzeExistingContract(previewContract)}
                    disabled={analyzingContract[previewContract._id]}
                    data-tour="contracts-analyze"
                  >
                    {analyzingContract[previewContract._id] ? (
                      <>
                        <Loader size={18} className={styles.spinning} />
                        Analysiert...
                      </>
                    ) : (
                      <>
                        <Zap size={18} />
                        Jetzt analysieren
                      </>
                    )}
                  </button>
                )}
                <button
                  className={`${styles.previewActionBtn} ${styles.primary}`}
                  onClick={() => {
                    setSelectedContract(previewContract);
                    setShowDetails(true);
                  }}
                >
                  <Eye size={18} />
                  Vollständige Details öffnen
                </button>
                <div className={styles.previewQuickActions}>
                  <button
                    className={styles.previewQuickAction}
                    onClick={() => {
                      setSelectedContract(previewContract);
                      setModalInitialTab('pdf');
                      setShowDetails(true);
                    }}
                  >
                    <Eye size={14} />
                    PDF
                  </button>
                  {canEditContract(previewContract) && (
                    <button
                      className={styles.previewQuickAction}
                      onClick={() => {
                        setSelectedContract(previewContract);
                        setOpenEditModalDirectly(true);
                        setShowDetails(true);
                      }}
                    >
                      <Pencil size={20} strokeWidth={2.75} />
                      Bearbeiten
                    </button>
                  )}
                  {/* 🆕 Erinnern (Mockup-aligned) */}
                  <button
                    className={styles.previewQuickAction}
                    onClick={() => setReminderSettingsModal({ show: true, contract: previewContract })}
                    title="Erinnerung einrichten"
                  >
                    <Bell size={14} />
                    Erinnern
                  </button>
                  {canDeleteContract(previewContract) && (
                    <button
                      className={`${styles.previewQuickAction} ${styles.delete}`}
                      onClick={() => {
                        handleDeleteContract(previewContract._id, previewContract.name);
                        setPreviewContract(null);
                      }}
                    >
                      <Trash2 size={14} />
                      Löschen
                    </button>
                  )}
                </div>
              </div>
            </aside>
          )}
        </div>
        {/* End of enterpriseLayout */}

        {/* 🎨 Contract Details Modal wurde als Portal nach document.body verschoben (unterhalb) */}

          {/* ⚡ Re-Analyse-Ergebnis wird jetzt IN-PAGE im contentArea gerendert
              (siehe activeSection-Block oben), nicht mehr als Portal-Overlay —
              damit es exakt wie der Upload→Analyse-Flow aussieht. */}

          {/* ✅ NEU: Legacy-Modal für alte Verträge */}
          {legacyModal?.show && legacyModal.contract && (
            <LegacyModal
              contract={legacyModal.contract}
              message={legacyModal.message || ''}
              onClose={() => setLegacyModal(null)}
              onReupload={handleLegacyReupload}
            />
          )}

          {/* Duplikat-Modal wurde als Portal nach document.body verschoben (unterhalb) */}

          {/* ✅ NEU: Upload Success Modal (Two-Step Upload Flow) */}
          <UploadSuccessModal
            isOpen={uploadSuccessModal.show}
            onClose={() => setUploadSuccessModal({ show: false, uploadedContracts: [] })}
            uploadedContracts={uploadSuccessModal.uploadedContracts}
            onAnalyze={handleAnalyzeFromModal}
            onSkip={handleSkipAnalysis}
            analysisCount={userInfo.analysisCount}
            analysisLimit={userInfo.analysisLimit}
          />
      </div>
      {/* End of pageContainer */}

      {/* 👁️ Hover-Preview-Tooltip — als Portal in body, iframe-basiert (browser-native PDF-Render) */}
      {/* Nur in der Vertragsliste rendern (nicht bei Upload/Analyse), nicht über Detail-Modal, nicht über offenem "Mehr"-Menü */}
      {hoveredContractId && hoverPos && activeSection === 'contracts' && !showDetails && !morePopoverFor && createPortal(
        (() => {
          const hc = contracts.find(c => c._id === hoveredContractId);
          const hcName = hc ? fixUtf8Display(hc.name) : 'Dokument';
          return (
            <div
              style={{
                position: 'fixed',
                left: hoverPos.x,
                top: hoverPos.y,
                width: 260,
                height: 340,
                background: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                boxShadow: '0 12px 32px rgba(15,23,42,0.22), 0 3px 8px rgba(15,23,42,0.10)',
                zIndex: 999999,
                overflow: 'hidden',
                pointerEvents: 'none',
                display: 'flex',
                flexDirection: 'column',
              }}
              aria-hidden="true"
            >
              {/* Kopfzeile — immer sichtbar, macht die Box unverkennbar */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderBottom: '1px solid #eef2f7', background: '#f8fafc', flexShrink: 0 }}>
                <FileText size={15} style={{ color: '#7c2d3a', flexShrink: 0 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hcName}</span>
              </div>
              {/* Inhalt */}
              <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
                {hoverLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: 13, gap: 8 }}>
                    <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Lade Vorschau…</span>
                  </div>
                )}
                {!hoverLoading && hoverError === 'unsupported' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: 13, gap: 10, padding: 20, textAlign: 'center' }}>
                    <FileText size={28} />
                    <span>Vorschau nur für PDF-Dokumente</span>
                  </div>
                )}
                {!hoverLoading && hoverError === 'fetch' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b', fontSize: 13, gap: 10, padding: 20, textAlign: 'center' }}>
                    <AlertCircle size={22} />
                    <span>Vorschau nicht verfügbar</span>
                  </div>
                )}
                {!hoverLoading && !hoverError && hoverUrl && (
                  <iframe
                    src={`${hoverUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH&page=1`}
                    style={{ width: '100%', height: '100%', border: 'none', pointerEvents: 'none' }}
                    title="PDF Vorschau"
                  />
                )}
              </div>
              {/* Fußzeile — Hinweis: Hover = Blick, Klick = volles Dokument */}
              {!hoverLoading && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '6px 10px', borderTop: '1px solid #eef2f7', background: '#f8fafc', flexShrink: 0, fontSize: 11, fontWeight: 500, color: '#64748b' }}>
                  <Eye size={12} />
                  <span>Zum Lesen klicken</span>
                </div>
              )}
            </div>
          );
        })(),
        document.body
      )}

      {/* 🎨 Contract Details Modal als Portal (außerhalb pageContainer für korrektes Scroll-Verhalten) */}
      {selectedContract && showDetails && createPortal(
        <NewContractDetailsModal
          key={`${selectedContract._id}-${!!selectedContract.analysis}-${!!selectedContract.legalPulse}`}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          contract={selectedContract as any}
          onClose={() => {
            setShowDetails(false);
            setOpenEditModalDirectly(false);
            setModalInitialTab(undefined);
            navigate('/contracts', { replace: true });
          }}
          openEditModalDirectly={openEditModalDirectly}
          initialTab={modalInitialTab}
          onEdit={async () => {
            // Nur die Vertragsliste im Hintergrund aktualisieren.
            // selectedContract wird NICHT überschrieben — das Modal verwaltet seinen eigenen State.
            // So bleiben inline-gespeicherte Felder (Vertragsnummer, Anbieter etc.) erhalten.
            await fetchContracts();
          }}
          onDelete={handleDeleteContract}
        />,
        document.body
      )}

      {/* ✅ Duplikat-Modal als Portal (außerhalb pageContainer für korrektes fixed-Positioning) */}
      {duplicateModal?.show && duplicateModal.fileItem && duplicateModal.existingContract && createPortal(
        <DuplicateModal
          fileItem={duplicateModal.fileItem}
          existingContract={duplicateModal.existingContract}
          onClose={() => setDuplicateModal(null)}
          onViewExisting={handleViewExistingContract}
          onReplaceFile={handleReplaceExistingFile}
          onAnalyzeAnyway={handleAnalyzeAnywayFromDuplicate}
        />,
        document.body
      )}

      {/* 📁 Folder Modal */}
      <FolderModal
        isOpen={folderModalOpen}
        folder={editingFolder}
        onClose={() => {
          setFolderModalOpen(false);
          setEditingFolder(null);
        }}
        onSave={handleFolderSave}
      />

      {/* 🤖 Smart Folders Modal */}
      <SmartFoldersModal
        isOpen={smartFoldersModalOpen}
        onClose={() => setSmartFoldersModalOpen(false)}
        onFetchSuggestions={handleFetchSmartSuggestions}
        onConfirm={handleConfirmSmartFolders}
      />

      {/* 🎨 Contract Detail Modal */}
      {selectedEnvelopeId && (
        <ContractDetailModal
          envelopeId={selectedEnvelopeId}
          onClose={() => setSelectedEnvelopeId(null)}
        />
      )}

      {/* 🔔 Reminder Settings Modal */}
      {reminderSettingsModal.show && reminderSettingsModal.contract && (
        <ReminderSettingsModal
          contractId={reminderSettingsModal.contract._id}
          contractName={fixUtf8Display(reminderSettingsModal.contract.name)}
          currentReminderSettings={reminderSettingsModal.contract.reminderSettings || []}
          currentReminderDays={reminderSettingsModal.contract.reminderDays || []}
          expiryDate={reminderSettingsModal.contract.expiryDate}
          kuendigung={reminderSettingsModal.contract.kuendigung}
          onClose={() => setReminderSettingsModal({ show: false, contract: null })}
          onSuccess={() => {
            fetchContracts();
          }}
        />
      )}

      {/* ✏️ QuickFact Dropdown Portal - Rendert außerhalb der Tabellen-Hierarchie */}
      {qfDropdownOpen && createPortal(
        <div
          className={styles.qfDropdown}
          style={{
            position: 'fixed',
            top: `${qfDropdownOpen.position.top}px`,
            left: `${qfDropdownOpen.position.left}px`,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const contract = contracts.find(c => c._id === qfDropdownOpen.contractId);
            const allFacts = contract?.quickFacts || [];
            const displayIndex = qfDropdownOpen.displayIndex;
            return allFacts.map((f, i) => (
              <button
                key={i}
                className={`${styles.qfDropdownItem} ${i === displayIndex ? styles.qfDropdownItemActive : ''}`}
                onClick={() => swapQuickFact(qfDropdownOpen.contractId, displayIndex, i)}
                disabled={i === displayIndex}
              >
                <span>{f.label}: {f.value}</span>
                {i === displayIndex && <Check size={12} />}
              </button>
            ));
          })()}
        </div>,
        document.body
      )}

      {/* 📁 Folder Dropdown Portal - Rendert außerhalb der Tabellen-Hierarchie */}
      {folderDropdownOpen && folderDropdownPosition && folderDropdownContractId && createPortal(
        <div
          className={styles.folderDropdown}
          style={{
            top: `${folderDropdownPosition.top}px`,
            right: `${folderDropdownPosition.right}px`,
            left: 'auto',
            bottom: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.folderDropdownHeader}>
            In Ordner verschieben
          </div>
          <div className={styles.folderDropdownList}>
            {/* Ohne Ordner Option */}
            <button
              className={`${styles.folderDropdownItem} ${!contracts.find(c => c._id === folderDropdownContractId)?.folderId ? styles.selected : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                handleMoveToFolder(folderDropdownContractId, null);
                setFolderDropdownOpen(null);
                setFolderDropdownPosition(null);
                setFolderDropdownContractId(null);
              }}
            >
              <span className={styles.folderIcon}>📂</span>
              <span className={styles.folderName}>Ohne Ordner</span>
            </button>

            {/* Folder List */}
            {folders.map((folder) => (
              <button
                key={folder._id}
                className={`${styles.folderDropdownItem} ${contracts.find(c => c._id === folderDropdownContractId)?.folderId === folder._id ? styles.selected : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveToFolder(folderDropdownContractId, folder._id);
                  setFolderDropdownOpen(null);
                  setFolderDropdownPosition(null);
                  setFolderDropdownContractId(null);
                }}
              >
                <span
                  className={styles.folderIcon}
                  style={{ color: folder.color }}
                >
                  {folder.icon}
                </span>
                <span className={styles.folderName}>{folder.name}</span>
                {contracts.find(c => c._id === folderDropdownContractId)?.folderId === folder._id && (
                  <CheckCircle size={14} className={styles.checkIcon} />
                )}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}

      {/* 📁 Folder Context Menu Portal */}
      {folderContextMenu && createPortal(
        <div
          className={styles.folderContextMenu}
          style={{
            top: `${folderContextMenu.y}px`,
            left: `${folderContextMenu.x}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {(() => {
            const folder = folders.find(f => f._id === folderContextMenu.folderId);
            const folderIndex = folders.findIndex(f => f._id === folderContextMenu.folderId);
            if (!folder) return null;
            return (
              <>
                {/* ⭐ Favorit setzen/entfernen */}
                <button
                  className={`${styles.folderContextMenuItem} ${favoriteFolder === folder._id ? styles.favorite : ''}`}
                  onClick={() => {
                    if (favoriteFolder === folder._id) {
                      setFavoriteFolder(null);
                    } else {
                      setFavoriteFolder(folder._id);
                    }
                    setFolderContextMenu(null);
                  }}
                >
                  <Star size={14} fill={favoriteFolder === folder._id ? 'currentColor' : 'none'} />
                  <span>{favoriteFolder === folder._id ? 'Favorit entfernen' : 'Als Favorit'}</span>
                </button>
                <div className={styles.folderContextMenuDivider} />
                <button
                  className={styles.folderContextMenuItem}
                  onClick={() => {
                    setEditingFolder(folder);
                    setFolderModalOpen(true);
                    setFolderContextMenu(null);
                  }}
                >
                  <Edit3 size={14} />
                  <span>Bearbeiten</span>
                </button>
                <button
                  className={styles.folderContextMenuItem}
                  onClick={() => handleMoveFolderUp(folder._id)}
                  disabled={folderIndex === 0}
                >
                  <ChevronUp size={14} />
                  <span>Nach oben</span>
                </button>
                <button
                  className={styles.folderContextMenuItem}
                  onClick={() => handleMoveFolderDown(folder._id)}
                  disabled={folderIndex === folders.length - 1}
                >
                  <ChevronDown size={14} />
                  <span>Nach unten</span>
                </button>
                <div className={styles.folderContextMenuDivider} />
                <button
                  className={`${styles.folderContextMenuItem} ${styles.danger}`}
                  onClick={() => {
                    handleDeleteFolder(folder._id);
                    setFolderContextMenu(null);
                  }}
                >
                  <Trash2 size={14} />
                  <span>Löschen</span>
                </button>
              </>
            );
          })()}
        </div>,
        document.body
      )}

      {/* ✏️ Quick Edit Modal - Öffnet direkt ohne Detail-Ansicht */}
      {quickEditContract && (
        <ContractEditModal
          contract={quickEditContract}
          show={!!quickEditContract}
          onClose={() => setQuickEditContract(null)}
          onUpdate={(updatedContract) => {
            // Aktualisiere Contract in der Liste
            setContracts(prev => prev.map(c =>
              c._id === updatedContract._id ? { ...c, ...updatedContract } : c
            ));
            setQuickEditContract(null);
          }}
        />
      )}

      {/* 📱 MOBILE: Bottom Sheet Dropdown Portal - Komplett isoliert von der Scroll-Hierarchie */}
      {folderDropdownOpen && createPortal(
        (() => {
          const dropdownContract = contracts.find(c => c._id === folderDropdownOpen);
          if (!dropdownContract) return null;

          return (
            <>
              {/* Overlay zum Schließen - stoppt Touch-Events */}
              <div
                className={styles.listRowDropdownOverlay}
                onClick={() => setFolderDropdownOpen(null)}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  setFolderDropdownOpen(null);
                }}
              />
              {/* Bottom Sheet - Komplett isoliertes Scroll-Container */}
              <div
                className={styles.listRowDropdown}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Drag Handle */}
                <div className={styles.listRowDropdownHandle}>
                  <div className={styles.listRowDropdownHandleBar} />
                </div>

                {/* Header mit Vertragsname */}
                <div className={styles.listRowDropdownHeader}>
                  <span className={styles.listRowDropdownTitle}>{dropdownContract.name}</span>
                  <button
                    className={styles.listRowDropdownClose}
                    onClick={() => setFolderDropdownOpen(null)}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Actions */}
                <div className={styles.listRowDropdownActions}>
                  {canEditContract(dropdownContract) && (
                    <button
                      className={styles.listRowDropdownItem}
                      onClick={() => {
                        handleEditContract(dropdownContract);
                        setFolderDropdownOpen(null);
                      }}
                    >
                      <Edit size={18} />
                      <span>Bearbeiten</span>
                    </button>
                  )}

                  {shouldShowAnalyzeButton(dropdownContract) && canEditContract(dropdownContract) && (
                    <button
                      className={`${styles.listRowDropdownItem} ${styles.highlight}`}
                      onClick={() => {
                        handleAnalyzeExistingContract(dropdownContract);
                        setFolderDropdownOpen(null);
                      }}
                    >
                      <Zap size={18} />
                      <span>Analysieren</span>
                    </button>
                  )}

                  <button
                    className={styles.listRowDropdownItem}
                    onClick={() => {
                      openSmartPDF(dropdownContract, true);
                      setFolderDropdownOpen(null);
                    }}
                  >
                    <ExternalLink size={18} />
                    <span>PDF öffnen</span>
                  </button>
                </div>

                <div className={styles.listRowDropdownDivider} />
                <div className={styles.listRowDropdownLabel}>In Ordner verschieben</div>

                {/* Scrollbarer Ordner-Bereich - isoliert */}
                <div
                  className={styles.listRowDropdownScroll}
                  onTouchStart={(e) => e.stopPropagation()}
                  onTouchMove={(e) => e.stopPropagation()}
                >
                  <button
                    className={`${styles.listRowDropdownItem} ${!dropdownContract.folderId ? styles.selected : ''}`}
                    onClick={() => {
                      handleMoveToFolder(dropdownContract._id, null);
                      setFolderDropdownOpen(null);
                    }}
                  >
                    <Folder size={18} />
                    <span>Ohne Ordner</span>
                  </button>
                  {folders.map((folder) => (
                    <button
                      key={folder._id}
                      className={`${styles.listRowDropdownItem} ${dropdownContract.folderId === folder._id ? styles.selected : ''}`}
                      onClick={() => {
                        handleMoveToFolder(dropdownContract._id, folder._id);
                        setFolderDropdownOpen(null);
                      }}
                    >
                      <span style={{ color: folder.color, fontSize: '18px' }}>{folder.icon}</span>
                      <span>{folder.name}</span>
                    </button>
                  ))}
                </div>

                {canDeleteContract(dropdownContract) && (
                  <>
                    <div className={styles.listRowDropdownDivider} />
                    <button
                      className={`${styles.listRowDropdownItem} ${styles.danger}`}
                      onClick={() => {
                        handleDeleteContract(dropdownContract._id, dropdownContract.name);
                        setFolderDropdownOpen(null);
                      }}
                    >
                      <Trash2 size={18} />
                      <span>Löschen</span>
                    </button>
                  </>
                )}
              </div>
            </>
          );
        })(),
        document.body
      )}

      {/* 🔍 Premium Analyse-Overlay mit PDF-Vorschau & Lupen-Animation */}
      <AnalysisOverlay
        show={analyzingOverlay.show}
        contractName={analyzingOverlay.contractName}
        progress={analyzingOverlay.progress}
        pdfFile={analyzingOverlay.pdfFile}
      />

      {/* 📱 MOBILE-FIRST 2025: Bottom Navigation - nur bei Vertrags-Liste anzeigen */}
      {activeSection === 'contracts' && !showDetails && !quickAnalysisModal.show && !showMobileFilterSheet && !showMobileFolderSheet && (
      <nav className={styles.mobileBottomNav}>
        <div className={styles.mobileNavTabs}>
          <button
            className={`${styles.mobileNavTab} ${mobileNavTab === 'alle' ? styles.active : ''}`}
            onClick={() => {
              setMobileNavTab('alle');
              setStatusFilter('alle');
              setActiveSection('contracts');
            }}
          >
            <FileText />
            <span>Alle</span>
            {contracts.length > 0 && (
              <span className={styles.mobileNavBadge}>{contracts.length}</span>
            )}
          </button>

          <button
            className={`${styles.mobileNavTab} ${mobileNavTab === 'aktiv' ? styles.active : ''}`}
            onClick={() => {
              setMobileNavTab('aktiv');
              setStatusFilter('aktiv');
              setActiveSection('contracts');
            }}
          >
            <CheckCircle />
            <span>Aktiv</span>
          </button>

          <button
            className={`${styles.mobileNavTab} ${mobileNavTab === 'faellig' ? styles.active : ''}`}
            onClick={() => {
              setMobileNavTab('faellig');
              setStatusFilter('bald_ablaufend');
              setActiveSection('contracts');
            }}
          >
            <Bell />
            <span>Fällig</span>
            {(() => {
              const urgentCount = contracts.filter(c => {
                if (!c.expiryDate) return false;
                const days = Math.ceil((new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                return days <= 30 && days > 0;
              }).length;
              return urgentCount > 0 ? (
                <span className={`${styles.mobileNavBadge} ${styles.warning}`}>{urgentCount}</span>
              ) : null;
            })()}
          </button>

          <button
            className={`${styles.mobileNavTab} ${mobileNavTab === 'archiv' ? styles.active : ''}`}
            onClick={() => {
              setMobileNavTab('archiv');
              setStatusFilter('gekündigt');
              setActiveSection('contracts');
            }}
          >
            <Archive />
            <span>Archiv</span>
          </button>

          <button
            className={`${styles.mobileNavTab} ${mobileNavTab === 'ordner' ? styles.active : ''}`}
            onClick={() => {
              setMobileNavTab('ordner');
              setShowMobileFolderSheet(true);
              setActiveSection('contracts');
            }}
          >
            <Folder />
            <span>Ordner</span>
          </button>
        </div>
      </nav>
      )}

      {/* 📱 MOBILE-FIRST 2025: Floating Action Button - nur bei Vertrags-Liste anzeigen */}
      {activeSection === 'contracts' && !showDetails && !quickAnalysisModal.show && !showMobileFilterSheet && !showMobileFolderSheet && (
      <button
        className={styles.mobileFab}
        onClick={() => fileInputRef.current?.click()}
        title="Neuen Vertrag hochladen"
      >
        <Plus />
      </button>
      )}

      {/* 📱 MOBILE-FIRST 2025: Search Overlay */}
      {showMobileSearch && createPortal(
        <div className={`${styles.mobileSearchOverlay} ${styles.open}`}>
          <div className={styles.mobileSearchHeader}>
            <button
              className={styles.mobileSearchBack}
              onClick={() => {
                setShowMobileSearch(false);
                setMobileSearchQuery('');
                setSearchQuery('');
                setMobileNavTab('alle');
                setStatusFilter('alle');
              }}
            >
              <ChevronLeft size={24} />
            </button>
            <input
              type="text"
              className={styles.mobileSearchField}
              placeholder="Verträge durchsuchen..."
              value={mobileSearchQuery}
              onChange={(e) => {
                setMobileSearchQuery(e.target.value);
                setSearchQuery(e.target.value);
              }}
              autoFocus
            />
            {mobileSearchQuery && (
              <button
                className={styles.mobileSearchBack}
                onClick={() => {
                  setMobileSearchQuery('');
                  setSearchQuery('');
                }}
              >
                <X size={20} />
              </button>
            )}
          </div>
          <div className={styles.mobileSearchResults}>
            {mobileSearchQuery.length === 0 ? (
              <div className={styles.mobileSearchEmpty}>
                <Search />
                <p>Suche nach Vertragsnamen, Anbieter oder Inhalt</p>
              </div>
            ) : contracts.length === 0 ? (
              <div className={styles.mobileSearchEmpty}>
                <FileText />
                <p>Keine Verträge gefunden für "{mobileSearchQuery}"</p>
              </div>
            ) : (
              <div className={styles.mobileListContainer}>
                {displayedContracts.map((contract) => (
                  <MobileListRow key={contract._id} contract={contract} />
                ))}
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
      {ScannerModal}
    </>
  );
}