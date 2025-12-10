// 📁 src/pages/Contracts.tsx - JSX FIXED: Motion Button closing tag korrigiert + ANALYSE-ANZEIGE GEFIXT + RESPONSIVE + DUPLIKATSERKENNUNG + S3-INTEGRATION + BATCH-ANALYSE-ANZEIGE + PDF-SCHNELLAKTION MOBILE-FIX + EDIT-SCHNELLAKTION REPARIERT
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  FileText, RefreshCw, Upload, CheckCircle, AlertCircle,
  Plus, Calendar, Clock, Trash2, Eye, Edit, Edit3,
  Search, X, Crown, Users, Loader,
  Lock, Zap, BarChart3, ExternalLink, ArrowRight, Folder,
  CheckSquare, Square, Mail, Bell, Download,
  LayoutGrid, List, FolderPlus,
  FileUp, AlertTriangle, Sparkles, RotateCcw, CreditCard,
  MoreVertical, ChevronUp, ChevronDown,
  SlidersHorizontal // 📱 Mobile Filter Icon
} from "lucide-react";
import styles from "../styles/Contracts.module.css";
import ContractAnalysis from "../components/ContractAnalysis";
import BatchAnalysisResults from "../components/BatchAnalysisResults"; // ✅ NEU: Import für Batch-Analyse
import NewContractDetailsModal from "../components/NewContractDetailsModal"; // 🎨 NEW: Professional Contract Details Modal
import UploadSuccessModal from "../components/UploadSuccessModal"; // ✅ NEU: Two-Step Upload Modal
import ContractDetailModal from "../components/ContractDetailModal"; // 🎨 Contract Detail Modal (Signatures)
// FolderBar removed - functionality moved to Enterprise Sidebar
import FolderModal from "../components/FolderModal"; // 📁 Folder Modal
import SmartFoldersModal from "../components/SmartFoldersModal"; // 🤖 Smart Folders Modal
import EmailInboxWidget from "../components/EmailInboxWidget"; // 📧 E-Mail-Upload Feature
import ReminderSettingsModal from "../components/ReminderSettingsModal"; // 🔔 Reminder Settings Modal
import ContractEditModal from "../components/ContractEditModal"; // ✏️ Quick Edit Modal
import { apiCall, uploadAndAnalyze, uploadOnly } from "../utils/api"; // ✅ NEU: uploadOnly hinzugefügt
import { useFolders } from "../hooks/useFolders"; // 📁 Folder Hook
import type { FolderType } from "../components/FolderBar"; // 📁 Folder Type
import ContractsSkeleton, { ContractsCardsSkeleton } from "../components/ContractsSkeleton"; // 💀 Skeleton Loader
import AnalysisProgressComponent from "../components/AnalysisProgress"; // 🎨 Premium Analysis Progress
import { mapLegacyToProgress } from "../utils/analysisAdapter"; // 🔄 Legacy Progress Adapter

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  expiryDate: string;
  status: string;
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
  paymentFrequency?: 'monthly' | 'yearly' | 'weekly';
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
  // 🔔 Reminder Settings (NEU)
  reminderDays?: number[];
  // 📊 Dynamic Quick Facts (NEU - kontextabhängige Eckdaten)
  quickFacts?: Array<{
    label: string;
    value: string;
    rating: 'good' | 'neutral' | 'bad';
  }>;
  // 📄 Document Category (NEU - für dynamische Anzeige)
  documentCategory?: 'cancellation_confirmation' | 'invoice' | 'active_contract';
  contractType?: string;
  provider?: {
    displayName: string;
    category?: string;
  };
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
  analyzed?: boolean; // ✅ Wurde analysiert (true) oder nur hochgeladen (false/undefined)?
  result?: AnalysisResult;
  error?: string;
  duplicateInfo?: AnalysisResult;
}

// ✅ User Info Interface
interface UserInfo {
  subscriptionPlan: 'free' | 'business' | 'premium' | 'legendary';
  isPremium: boolean;
  analysisCount: number;
  analysisLimit: number;
  // 📧 E-Mail-Inbox Feature
  emailInboxAddress?: string | null;
  emailInboxEnabled?: boolean;
}

// ✅ Erweiterte Filter-Typen
type StatusFilter = 'alle' | 'aktiv' | 'bald_ablaufend' | 'abgelaufen' | 'gekündigt';
type DateFilter = 'alle' | 'heute' | 'woche' | 'monat' | 'quartal' | 'jahr';
type SortOrder = 'neueste' | 'älteste' | 'name_az' | 'name_za';

// ✅ NEU: S3-Integration - Utility-Funktionen direkt in der Komponente

// ✅ MOBILE-FIX: PDF-Schnellaktion mit "Temporäres Tab sofort öffnen" Methode (Mobile-freundlich)
export default function Contracts() {
  // ✅ Navigation state handling
  const location = useLocation();
  const navigate = useNavigate();

  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);
  const [premiumHint, setPremiumHint] = useState<string | null>(null); // 🔔 Premium Upgrade Hint
  const [dragActive, setDragActive] = useState(false);
  const [activeSection, setActiveSection] = useState<'upload' | 'contracts' | 'email-upload'>('contracts');
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ BUG FIX 1: Neuer State für Edit-Modal direkt öffnen
  const [openEditModalDirectly, setOpenEditModalDirectly] = useState(false);

  // ✏️ NEU: Quick Edit Modal State (öffnet direkt ohne Detail-Ansicht)
  const [quickEditContract, setQuickEditContract] = useState<Contract | null>(null);
  
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
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); // 🆕 Enterprise View Mode
  const [previewContract, setPreviewContract] = useState<Contract | null>(null); // 🆕 Preview Panel State

  // 📱 MOBILE UX: Filter-Bottom-Sheet und Upload-Tabs
  const [showMobileFilterSheet, setShowMobileFilterSheet] = useState(false);
  const [uploadTab, setUploadTab] = useState<'file' | 'email'>('file');

  // ✅ NEU: Infinite Scroll Pagination State
  const [paginationInfo, setPaginationInfo] = useState({
    total: 0,
    hasMore: false,
    currentSkip: 0
  });
  const [loadingMore, setLoadingMore] = useState(false); // Loading für "Weitere laden"
  const [analyzingContract, setAnalyzingContract] = useState<{ [contractId: string]: boolean }>({}); // Loading für "Jetzt analysieren"
  const [analyzingOverlay, setAnalyzingOverlay] = useState<{ show: boolean; contractName: string }>({ show: false, contractName: '' }); // ✅ Full-Screen Analyse-Overlay

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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null); // ✅ Ref für Infinite Scroll Sentinel
  const contentAreaRef = useRef<HTMLDivElement>(null); // ✅ Ref für scrollbaren Content-Bereich
  const hasScrolledRef = useRef(false); // ✅ Flag um initiales Auto-Loading zu verhindern
  const userInfoCacheRef = useRef<{ data: UserInfo | null; timestamp: number }>({ data: null, timestamp: 0 }); // ✅ Cache für User-Info
  const isFirstMountRef = useRef(true); // ✅ Flag um First Mount zu erkennen (verhindert doppelten API-Call)

  // 📁 Folder Management Hook
  const {
    folders,
    activeFolder,
    unassignedOrder,
    fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    setActiveFolder,
    moveContractToFolder,
    bulkMoveToFolder
  } = useFolders();

  // 📁 Folder Modal State
  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderType | null>(null);
  const [folderDropdownOpen, setFolderDropdownOpen] = useState<string | null>(null); // Track which contract's dropdown is open
  const [folderDropdownPosition, setFolderDropdownPosition] = useState<{ top: number; right: number } | null>(null); // Position für fixed Dropdown
  const [folderDropdownContractId, setFolderDropdownContractId] = useState<string | null>(null); // Contract ID für Portal
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null); // 🆕 Selected folder in sidebar

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

  // 🤖 Smart Folders Modal State
  const [smartFoldersModalOpen, setSmartFoldersModalOpen] = useState(false);

  // 🎨 Contract Detail Modal State
  const [selectedEnvelopeId, setSelectedEnvelopeId] = useState<string | null>(null);

  // 🆕 Handle navigation state from Optimizer page
  useEffect(() => {
    const state = location.state as { sourceFilter?: 'alle' | 'generated' | 'optimized' };
    if (state?.sourceFilter) {
      setSourceFilter(state.sourceFilter);
      // Clear the state to avoid re-triggering on re-renders
      window.history.replaceState({}, document.title);
    }
  }, [location]);

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

    console.log('📋 View Parameter Check:', { contractIdToView, contractsCount: contracts.length, loading });

    if (contractIdToView && !loading) {
      // Erst in der aktuellen Liste suchen
      const contractToOpen = contracts.find(c => c._id === contractIdToView);

      if (contractToOpen) {
        console.log('📋 Contract gefunden in Liste:', contractToOpen.name);
        setSelectedContract(contractToOpen);
        setShowDetails(true);
      } else if (contracts.length > 0) {
        // Vertrag nicht in der Liste (Pagination) → Direkt von API laden
        console.log('📋 Contract nicht in Liste, lade von API...', contractIdToView);

        const fetchSingleContract = async () => {
          try {
            const response = await apiCall(`/contracts/${contractIdToView}`);
            // Backend gibt den Vertrag direkt zurück (nicht eingepackt in { contract: ... })
            // Prüfe beide Formate für Kompatibilität
            const contract = (response as { contract?: Contract })?.contract || (response as Contract);

            if (contract && contract._id) {
              console.log('✅ Contract von API geladen:', contract.name);
              setSelectedContract(contract);
              setShowDetails(true);
            } else {
              console.warn('⚠️ Vertrag nicht gefunden:', contractIdToView);
            }
          } catch (error) {
            console.error('❌ Fehler beim Laden des Vertrags:', error);
          }
        };

        fetchSingleContract();
      }
    }
  }, [location.search, contracts, loading]);

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
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [folderDropdownOpen, folderContextMenu]);

  // 📱 MOBILE: Body-Scroll blockieren wenn Bottom Sheet offen ist
  useEffect(() => {
    if (folderDropdownOpen) {
      // Speichere aktuelle Scroll-Position
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';

      return () => {
        // Stelle Scroll-Position wieder her
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [folderDropdownOpen]);

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
    console.log('✏️ Edit-Schnellaktion für Contract:', contract._id, contract.name);
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
        console.log(`✅ ${hasSignedPDF && preferSigned ? 'Signed' : 'Original'} PDF URL fetched:`, pdfUrl);

        if (tempWindow && !tempWindow.closed) {
          tempWindow.location.href = pdfUrl;
        } else {
          window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        }
      } else {
        throw new Error(data.error || 'Failed to load PDF');
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
      await fetchContracts(); // Refresh to show new folder assignment

      // Success feedback
      const folderName = folderId
        ? folders.find(f => f._id === folderId)?.name || 'Ordner'
        : 'Ohne Ordner';
      console.log(`✅ Vertrag verschoben nach: ${folderName}`);
    } catch (err) {
      console.error('Error moving contract:', err);
      alert('Fehler beim Verschieben des Vertrags');
    }
  };

  // Count unassigned contracts
  const unassignedCount = contracts.filter(c => !c.folderId).length;

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
    if (selectedContracts.length === filteredContracts.length) {
      setSelectedContracts([]);
    } else {
      setSelectedContracts(filteredContracts.map(c => c._id));
    }
  };

  const handleBulkMoveToFolder = async (folderId: string | null) => {
    if (selectedContracts.length === 0) return;

    try {
      await bulkMoveToFolder(selectedContracts, folderId);
      await fetchContracts();
      setSelectedContracts([]);
      setBulkActionDropdownOpen(false);

      const folderName = folderId
        ? folders.find(f => f._id === folderId)?.name || 'Ordner'
        : 'Ohne Ordner';
      console.log(`✅ ${selectedContracts.length} Verträge verschoben nach: ${folderName}`);
    } catch (err) {
      console.error('Error bulk moving contracts:', err);
      alert('Fehler beim Verschieben der Verträge');
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
          alert(errorData.message || '⛔ Bulk-Operationen nur für Enterprise-Plan verfügbar!');
          return;
        }

        throw new Error(errorData.message || 'Fehler beim Löschen');
      }

      const result = await response.json();
      console.log(`✅ ${result.deleted}/${result.requested} Verträge gelöscht`);

      await fetchContracts();
      setSelectedContracts([]);
    } catch (err) {
      console.error('Error bulk deleting contracts:', err);
      alert('Fehler beim Löschen der Verträge');
    }
  };

  // 📊 Excel Export Handler
  const handleExportExcel = async () => {
    // ✅ Premium-Check: Excel Export nur für Business/Premium
    if (!userInfo.isPremium && userInfo.subscriptionPlan !== 'business') {
      alert('📊 Excel-Export ist ein Premium-Feature.\n\n🚀 Upgrade auf Business oder Premium für diese Funktion!');
      window.location.href = '/pricing';
      return;
    }

    if (contracts.length === 0) {
      alert('Keine Verträge zum Exportieren vorhanden');
      return;
    }

    try {
      console.log('📊 [Excel Export] Starte Download...');

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

      console.log(`✅ [Excel Export] ${contracts.length} Verträge exportiert als ${filename}`);
    } catch (error) {
      console.error('❌ [Excel Export] Error:', error);
      alert('Excel-Export fehlgeschlagen. Bitte versuche es später erneut.');
    }
  };

  // 📦 Bulk ZIP Download Handler
  const handleBulkDownloadZip = async () => {
    // ✅ Premium-Check: Bulk Download nur für Business/Premium
    if (!userInfo.isPremium && userInfo.subscriptionPlan !== 'business') {
      alert('📦 Bulk-Download ist ein Premium-Feature.\n\n🚀 Upgrade auf Business oder Premium für diese Funktion!');
      window.location.href = '/pricing';
      return;
    }

    if (selectedContracts.length === 0) {
      alert('Keine Verträge ausgewählt');
      return;
    }

    if (selectedContracts.length > 100) {
      alert('Maximal 100 Verträge gleichzeitig downloadbar');
      return;
    }

    try {
      console.log(`📦 [Bulk Download] Starte ZIP-Download für ${selectedContracts.length} Verträge...`);

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

      console.log(`✅ [Bulk Download] ${selectedContracts.length} Verträge als ZIP heruntergeladen: ${filename}`);

      // Selection zurücksetzen nach erfolgreichem Download
      setSelectedContracts([]);
    } catch (error) {
      console.error('❌ [Bulk Download] Error:', error);
      alert('ZIP-Download fehlgeschlagen. Bitte versuche es später erneut.');
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
      console.log(`✅ ${suggestions.length} Smart Folders erstellt`);
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
                <h4>{contract.name}</h4>
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
      >
        <motion.div
          className={styles.duplicateModal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
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
        console.log('📦 User-Info aus Cache geladen (Alter:', Math.round(cacheAge / 1000), 'Sekunden)');
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
        }
      };

      const plan = response.user?.subscriptionPlan as 'free' | 'business' | 'premium' | 'legendary' || 'free';
      const isPremium = response.user?.isPremium || plan === 'premium' || plan === 'legendary';
      const analysisCount = response.user?.analysisCount || 0;

      // ✅ KORRIGIERT: Limits laut Preisliste
      // Nutze Backend-Wert wenn vorhanden, sonst Fallback
      let analysisLimit = response.user?.analysisLimit ?? 3;
      if (!response.user?.analysisLimit) {
        if (plan === 'free') analysisLimit = 3;           // ✅ Free: 3 Analysen (einmalig)
        else if (plan === 'business') analysisLimit = 25; // 📊 Business: 25 pro Monat
        else if (plan === 'premium' || plan === 'legendary') analysisLimit = Infinity; // ♾️ Unbegrenzt
      }

      const newUserInfo: UserInfo = {
        subscriptionPlan: plan,
        isPremium,
        analysisCount,
        analysisLimit,
        // 📧 E-Mail-Inbox Feature
        emailInboxAddress: response.user?.emailInboxAddress || null,
        emailInboxEnabled: response.user?.emailInboxEnabled ?? true
      };

      // ✅ Cache aktualisieren
      userInfoCacheRef.current = {
        data: newUserInfo,
        timestamp: now
      };

      setUserInfo(newUserInfo);

      console.log("✅ User-Info vom Server geladen:", newUserInfo);
    } catch (err) {
      console.warn("⚠️ User-Info konnte nicht geladen werden:", err);
      setUserInfo({
        subscriptionPlan: 'free',
        isPremium: false,
        analysisCount: 0,
        analysisLimit: 3  // ✅ Free: 3 Analysen
      });
    }
  };

  // ✅ Verbesserte fetchContracts mit Pagination & Filtern (Infinite Scroll)
  const fetchContracts = async (): Promise<Contract[] | null> => {
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
        sort: sortOrder,
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

      setContracts(response.contracts);
      setFilteredContracts(response.contracts); // Wird jetzt vom Backend gefiltert
      setError(null);

      // ✅ Pagination-Info speichern
      setPaginationInfo({
        total: response.pagination.total,
        hasMore: response.pagination.hasMore,
        currentSkip: response.pagination.skip
      });

      console.log(`✅ Verträge geladen: ${response.contracts.length} von ${response.pagination.total} (hasMore: ${response.pagination.hasMore})`);
      return response.contracts;
    } catch (err) {
      console.error("❌ Fehler beim Laden der Verträge:", err);
      setError("Die Verträge konnten nicht geladen werden. Bitte versuche es später erneut.");
      setContracts([]);
      setFilteredContracts([]);
      return null;
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  // ✅ NEU: Silent Refresh - aktualisiert Contracts ohne Loading-Skeleton (für nach Analyse)
  const silentRefreshContracts = async (): Promise<Contract[] | null> => {
    try {
      const params = new URLSearchParams({
        limit: '50',
        skip: '0',
        search: searchQuery,
        status: statusFilter,
        dateFilter: dateFilter,
        sort: sortOrder,
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
      };

      setContracts(response.contracts);
      setFilteredContracts(response.contracts);
      setPaginationInfo({
        total: response.pagination.total,
        hasMore: response.pagination.hasMore,
        currentSkip: response.pagination.skip
      });

      return response.contracts;
    } catch {
      return null;
    }
  };

  // ✅ NEU: Load More Contracts für Infinite Scroll (mit Filtern)
  const loadMoreContracts = async () => {
    // Verhindere doppeltes Laden oder Laden wenn keine weiteren verfügbar
    if (loadingMore || !paginationInfo.hasMore) {
      return;
    }

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
        sort: sortOrder,
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

      // ✅ WICHTIG: Append (nicht replace!)
      setContracts(prev => [...prev, ...response.contracts]);
      setFilteredContracts(prev => [...prev, ...response.contracts]);

      // ✅ Pagination-Info aktualisieren
      setPaginationInfo({
        total: response.pagination.total,
        hasMore: response.pagination.hasMore,
        currentSkip: response.pagination.skip
      });

      console.log(`✅ Weitere Verträge geladen: ${response.contracts.length} (insgesamt: ${contracts.length + response.contracts.length} von ${response.pagination.total})`);
    } catch (err) {
      console.error("❌ Fehler beim Nachladen der Verträge:", err);
      // Fehler nicht als kritisch behandeln - User kann manuell neu laden
    } finally {
      setLoadingMore(false);
    }
  };

  // ✅ NEU: Bei Filter-Änderung Contracts neu laden (Backend filtert jetzt!)
  useEffect(() => {
    // Überspringe First Mount (Initial Load useEffect übernimmt das)
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      return;
    }

    // ✅ FIX: Reset hasScrolledRef bei Filter-Änderung für Infinite Scroll
    hasScrolledRef.current = false;

    // Debounce für Search-Query (nicht bei jedem Tastendruck neu laden)
    const debounceTimer = setTimeout(() => {
      console.log('🔄 Filter geändert, lade Contracts neu mit Filter:', { searchQuery, statusFilter, dateFilter, sortOrder, sourceFilter });
      fetchContracts();
    }, searchQuery ? 500 : 0); // 500ms Debounce für Search, sofort für andere Filter

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, statusFilter, dateFilter, sortOrder, sourceFilter, activeFolder]);

  // ✅ Initial Load
  useEffect(() => {
    fetchUserInfo();
    fetchContracts();
    fetchFolders(); // 📁 Load folders
  }, []);

  // ✅ NEU: Infinite Scroll - IntersectionObserver für automatisches Nachladen
  useEffect(() => {
    const loadMoreElement = loadMoreRef.current;
    const scrollContainer = contentAreaRef.current;

    // Nur aktivieren wenn Element existiert
    if (!loadMoreElement) {
      return;
    }

    // ✅ FIX: Scroll-Event-Listener auf Container UND Window (für Mobile)
    const handleContainerScroll = () => {
      if (!hasScrolledRef.current && scrollContainer && scrollContainer.scrollTop > 50) {
        hasScrolledRef.current = true;
        console.log('📜 Infinite Scroll: Aktiviert nach Container-Scroll');
      }
    };

    const handleWindowScroll = () => {
      if (!hasScrolledRef.current && window.scrollY > 50) {
        hasScrolledRef.current = true;
        console.log('📜 Infinite Scroll: Aktiviert nach Window-Scroll (Mobile)');
      }
    };

    // Event-Listener auf beide Scroll-Quellen
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleContainerScroll);
    }
    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    // ✅ MOBILE FIX: IntersectionObserver ohne root (nutzt Viewport)
    // Das funktioniert besser auf Mobile, wo der gesamte Body scrollt
    const isMobile = window.innerWidth <= 768;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // ✅ FIX: Nur triggern wenn User gescrollt hat UND noch mehr vorhanden UND nicht bereits ladend
        if (entry.isIntersecting && paginationInfo.hasMore && !loadingMore && hasScrolledRef.current) {
          console.log('📜 Infinite Scroll: Bottom erreicht, lade weitere Contracts...');
          loadMoreContracts();
        }
      },
      {
        // ✅ Auf Mobile: Viewport als root (null), auf Desktop: Container
        root: isMobile ? null : scrollContainer,
        rootMargin: '300px', // ✅ Noch früher triggern (300px vor Ende)
        threshold: 0.01 // ✅ Schon bei 1% Sichtbarkeit triggern
      }
    );

    observer.observe(loadMoreElement);

    // Cleanup
    return () => {
      observer.disconnect();
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', handleContainerScroll);
      }
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [paginationInfo.hasMore, loadingMore, contracts.length]); // Re-run wenn sich contracts ändern

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
          console.log('🔄 Updating selectedContract with fresh payment data:', {
            old: {
              paymentMethod: selectedContract.paymentMethod,
              paymentStatus: selectedContract.paymentStatus
            },
            new: {
              paymentMethod: updatedContract.paymentMethod,
              paymentStatus: updatedContract.paymentStatus
            }
          });
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

    // ✅ KORRIGIERT: Multi-Upload nur für Premium
    if (userInfo.subscriptionPlan !== 'premium' && files.length > 1) {
      alert("📊 Mehrere Verträge gleichzeitig hochladen ist nur für Premium-Nutzer verfügbar.\n\n👑 Upgrade auf Premium für Batch-Upload!");
      e.target.value = ''; // ✅ Reset Input
      return;
    }

    // ✅ KORRIGIERT: Analyse-Limit Check
    if (userInfo.analysisCount >= userInfo.analysisLimit && userInfo.analysisLimit !== Infinity) {
      alert(`📊 Analyse-Limit erreicht (${userInfo.analysisCount}/${userInfo.analysisLimit}).\n\n🚀 Upgrade dein Paket für mehr Analysen!`);
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
      console.log("✅ selectedFile gesetzt für Single-Upload:", files[0].name);
    }

    setActiveSection('upload');

    console.log(`✅ ${files.length} Dateien für Upload vorbereitet (${userInfo.subscriptionPlan})`);

    // ✅ WICHTIG: Input resetten damit onChange beim nächsten Mal wieder feuert
    e.target.value = '';
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

  // ✅ NEU: Two-Step Upload Flow - Upload OHNE Analyse
  const handleUploadOnly = async () => {
    console.log("📤 Starting Upload-Only flow (no analysis)...");

    const filesToUpload = uploadFiles.filter(f => f.status === 'pending');

    if (filesToUpload.length === 0) {
      console.log("⚠️ No files to upload");
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

          console.log(`📤 Uploading (no analysis): ${fileItem.file.name}`);

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
            console.log(`📄 Duplicate detected: ${fileItem.file.name}`);
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
                ? { ...item, status: 'completed', progress: 100 }
                : item
            ));

            uploadedContracts.push(result.contract);
            console.log(`✅ Upload successful (no analysis): ${fileItem.file.name}`);
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

      // Zeige Success Modal
      if (uploadedContracts.length > 0) {
        setUploadSuccessModal({
          show: true,
          uploadedContracts
        });
      }

    } finally {
      setIsAnalyzing(false);
    }
  };

  // ✅ FIXED: Analyse-Aktion aus Success Modal - NUTZT NEUE /api/analyze ROUTE!
  const handleAnalyzeFromModal = async () => {
    console.log("🔍 User chose to analyze uploaded contracts");

    const contractsToAnalyze = uploadSuccessModal.uploadedContracts;
    setUploadSuccessModal({ show: false, uploadedContracts: [] });

    if (contractsToAnalyze.length === 0) {
      console.warn("⚠️ No contracts to analyze");
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
        console.log(`📊 Analyzing contract ${i + 1}/${contractsToAnalyze.length}: ${contract.name}`);

        // Finde die entsprechende Datei im uploadFiles State
        const uploadFileItem = uploadFiles.find(item => item.file.name === contract.name);

        if (!uploadFileItem) {
          console.error(`❌ File not found in uploadFiles for: ${contract.name}`);
          continue;
        }

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
          console.log(`🚀 Using NEW /api/analyze route for: ${contract.name}`);

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

          console.log(`✅ Analysis completed for ${contract.name} (NEW ROUTE)`, analysisResult);

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

          // Zeige Fehler-Alert mit Upgrade-Option
          if (isLimitError) {
            const userConfirmed = confirm(
              `❌ ${errorMessage}\n\n` +
              `💡 Aktuelle Plan: ${userInfo.subscriptionPlan}\n` +
              `📊 Analysen: ${userInfo.analysisCount}/${userInfo.analysisLimit === Infinity ? '∞' : userInfo.analysisLimit}\n\n` +
              `🚀 Möchtest du jetzt upgraden?`
            );

            if (userConfirmed) {
              window.location.href = '/pricing';
              return; // Stop further processing
            }
          } else {
            alert(`❌ Analyse fehlgeschlagen: ${errorMessage}`);
          }
        }
      }

      // ✅ Refresh contracts list
      await fetchContracts();

      // ✅ WECHSEL zur Upload-Seite - zeigt SOFORT die Analyse-Ergebnisse!
      setActiveSection('upload');

      console.log(`✅ ${contractsToAnalyze.length} Vertrag${contractsToAnalyze.length > 1 ? 'e' : ''} erfolgreich analysiert und Ergebnisse werden angezeigt!`);

    } catch (error) {
      console.error("❌ Error during analysis:", error);
      alert("❌ Fehler bei der Analyse. Bitte versuche es erneut.");

      // On error: Stay on contracts view
      setActiveSection('contracts');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ✅ NEU: Skip-Aktion aus Success Modal
  const handleSkipAnalysis = async () => {
    console.log("✓ User chose to skip analysis");
    setUploadSuccessModal({ show: false, uploadedContracts: [] });

    // Clear upload files und refresh contracts list
    clearAllUploadFiles();

    // ✅ Wichtig: Warte auf fetchContracts, damit neue Verträge sichtbar werden
    await fetchContracts();

    setActiveSection('contracts');
  };

  // ✅ NEU: Nachträgliche Analyse für bestehenden Vertrag
  const handleAnalyzeExistingContract = async (contract: Contract) => {
    console.log("🔍 Analyzing existing contract:", contract._id, contract.name);

    // Prüfe ob bereits am Analysieren
    if (analyzingContract[contract._id]) {
      console.log("⏳ Already analyzing this contract");
      return;
    }

    // Check subscription & limits - Free hat 3 Analysen, nicht 0!
    if (userInfo.analysisCount >= userInfo.analysisLimit && userInfo.analysisLimit !== Infinity) {
      alert(`📊 Analyse-Limit erreicht (${userInfo.analysisCount}/${userInfo.analysisLimit}).\n\n🚀 Upgrade für mehr Analysen!`);
      return;
    }

    // Setze Loading States - Button UND Full-Screen Overlay
    setAnalyzingContract(prev => ({ ...prev, [contract._id]: true }));
    setAnalyzingOverlay({ show: true, contractName: contract.name });

    try {
      setError(null);

      // API URL - nutze die korrekte Produktions-URL
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const token = localStorage.getItem('token') || localStorage.getItem('authToken');

      if (!token) {
        throw new Error('Nicht eingeloggt. Bitte melden Sie sich erneut an.');
      }

      console.log(`📡 Calling API: ${apiUrl}/api/contracts/${contract._id}/analyze`);

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
        console.log("✅ Analysis successful for existing contract");

        // ✅ Silent Refresh - ohne Loading-Skeleton (damit UI nicht springt)
        await silentRefreshContracts();
        await fetchUserInfo();

        // ✅ Automatisch die Analyseergebnisse öffnen
        // Nutze den vom Backend zurückgegebenen vollständigen Contract
        const updatedContract = data.contract || { ...contract, analyzed: true };
        setSelectedContract(updatedContract);
        setShowDetails(true);

        // Update URL für bessere Navigation
        navigate(`/contracts?view=${contract._id}`, { replace: true });

        console.log("📊 Opening analysis results for contract:", contract._id);
      } else {
        throw new Error(data.message || 'Analyse fehlgeschlagen');
      }

    } catch (error) {
      console.error("❌ Error analyzing existing contract:", error);
      const errorMsg = error instanceof Error ? error.message : 'Analyse fehlgeschlagen';
      setError(errorMsg);
      alert(`❌ Analyse fehlgeschlagen\n\n${errorMsg}`);
    } finally {
      // Loading States zurücksetzen
      setAnalyzingContract(prev => ({ ...prev, [contract._id]: false }));
      setAnalyzingOverlay({ show: false, contractName: '' });
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
      
      console.log("✅ Alter Vertrag gelöscht für Ersetzung");
      
      // ✅ Starte neue Analyse
      handleAnalyzeAnywayFromDuplicate();
      
    } catch (error) {
      console.error("❌ Fehler beim Ersetzen:", error);
      alert("Fehler beim Ersetzen der Datei. Bitte versuche es erneut.");
    }
  };

  const handleAnalyzeAnywayFromDuplicate = () => {
    if (!duplicateModal?.fileItem) return;
    
    // ✅ Setze Status zurück auf pending für neue Analyse
    setUploadFiles(prev => prev.map(item => 
      item.id === duplicateModal.fileItem!.id 
        ? { ...item, status: 'pending', progress: 0, duplicateInfo: undefined, error: undefined }
        : item
    ));
    
    setDuplicateModal(null);
    
    // ✅ Starte Batch-Analyse für diese eine Datei
    setTimeout(() => {
      startBatchAnalysis();
    }, 100);
  };

  // ✅ KORRIGIERT: Batch-Analyse NORMALE Funktion mit Debug
  const startBatchAnalysis = async () => {
    console.log("🚀 startBatchAnalysis called!", { 
      uploadFilesLength: uploadFiles.length,
      isAnalyzing,
      userInfo 
    });

    if (uploadFiles.length === 0) {
      console.warn("❌ Keine Dateien zum Analysieren");
      return;
    }

    // ✅ KORRIGIERT: Nochmal Limit prüfen vor Analyse
    const remainingAnalyses = userInfo.analysisLimit === Infinity 
      ? Infinity 
      : userInfo.analysisLimit - userInfo.analysisCount;
    
    if (remainingAnalyses === 0) {
      alert(`📊 Analyse-Limit erreicht (${userInfo.analysisCount}/${userInfo.analysisLimit}).\n\n🚀 Upgrade dein Paket für mehr Analysen!`);
      return;
    }

    if (uploadFiles.length > remainingAnalyses && remainingAnalyses !== Infinity) {
      alert(`⚠️ Nur noch ${remainingAnalyses} Analyse${remainingAnalyses === 1 ? '' : 'n'} verfügbar.\n\nBitte reduziere die Anzahl der Dateien oder upgrade dein Paket.`);
      return;
    }

    setIsAnalyzing(true);
    const pendingFiles = uploadFiles.filter(item => item.status === 'pending');

    console.log(`🚀 Starte Batch-Analyse für ${pendingFiles.length} Dateien (${userInfo.subscriptionPlan})`);

    // ✅ Analysiere jede Datei einzeln
    for (const fileItem of pendingFiles) {
      try {
        // Status auf "analyzing" setzen
        setUploadFiles(prev => prev.map(item => 
          item.id === fileItem.id 
            ? { ...item, status: 'analyzing', progress: 10 }
            : item
        ));

        console.log(`📊 Analysiere: ${fileItem.file.name}`);

        // ✅ Einzelne Analyse durchführen
        const result = await uploadAndAnalyze(
          fileItem.file,
          (progress) => {
            setUploadFiles(prev => prev.map(item => 
              item.id === fileItem.id 
                ? { ...item, progress }
                : item
            ));
          }
        ) as AnalysisResult;

        // ✅ Erfolgreich
        if (result?.success) {
          setUploadFiles(prev => prev.map(item =>
            item.id === fileItem.id
              ? { ...item, status: 'completed', progress: 100, analyzed: true, result }
              : item
          ));
          console.log(`✅ Analyse erfolgreich: ${fileItem.file.name}`);
        } 
        // ✅ VERBESSERT: Duplikat erkannt - mit verbesserter Info
        else if (result?.duplicate) {
          const existingContract = result?.existingContract;
          
          setUploadFiles(prev => prev.map(item => 
            item.id === fileItem.id 
              ? { 
                  ...item, 
                  status: 'duplicate', 
                  progress: 100, 
                  duplicateInfo: { 
                    ...result, 
                    existingContract 
                  } 
                }
              : item
          ));
          
          console.log(`🔄 Duplikat erkannt: ${fileItem.file.name}`, existingContract);
          
          // ✅ Auto-öffne Duplikat-Modal für bessere UX (nur wenn existingContract vorhanden)
          if (existingContract) {
            setTimeout(() => {
              setDuplicateModal({
                show: true,
                fileItem: uploadFiles.find(f => f.id === fileItem.id),
                existingContract
              });
            }, 500);
          }
        }
        // ✅ Unbekannter Erfolgsfall
        else {
          setUploadFiles(prev => prev.map(item => 
            item.id === fileItem.id 
              ? { ...item, status: 'completed', progress: 100, result }
              : item
          ));
        }

      } catch (error) {
        // ✅ Fehler
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
        setUploadFiles(prev => prev.map(item => 
          item.id === fileItem.id 
            ? { ...item, status: 'error', progress: 0, error: errorMessage }
            : item
        ));
        console.error(`❌ Analyse-Fehler für ${fileItem.file.name}:`, error);
      }

      // ✅ Kurze Pause zwischen Analysen
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsAnalyzing(false);
    
    // ✅ User-Info und Verträge neu laden (force=true weil analysisCount sich geändert hat)
    setTimeout(() => {
      fetchUserInfo(true);
      fetchContracts();
    }, 1000);

    console.log("🎉 Batch-Analyse abgeschlossen");
  };

  // ✅ KORRIGIERT: Normale retry Funktion
  const retryFileAnalysis = async (fileId: string) => {
    const fileItem = uploadFiles.find(item => item.id === fileId);
    if (!fileItem) return;

    // ✅ KORRIGIERT: Limit-Check vor Retry
    const remainingAnalyses = userInfo.analysisLimit === Infinity 
      ? Infinity 
      : userInfo.analysisLimit - userInfo.analysisCount;
    
    if (remainingAnalyses === 0) {
      alert(`📊 Analyse-Limit erreicht (${userInfo.analysisCount}/${userInfo.analysisLimit}).\n\n🚀 Upgrade dein Paket für mehr Analysen!`);
      return;
    }

    try {
      setUploadFiles(prev => prev.map(item => 
        item.id === fileId 
          ? { ...item, status: 'analyzing', progress: 10, error: undefined }
          : item
      ));

      const result = await uploadAndAnalyze(
        fileItem.file,
        (progress) => {
          setUploadFiles(prev => prev.map(item => 
            item.id === fileId 
              ? { ...item, progress }
              : item
          ));
        }
      ) as AnalysisResult;

      if (result?.success) {
        setUploadFiles(prev => prev.map(item => 
          item.id === fileId 
            ? { ...item, status: 'completed', progress: 100, result }
            : item
        ));
      } else if (result?.duplicate) {
        setUploadFiles(prev => prev.map(item => 
          item.id === fileId 
            ? { ...item, status: 'duplicate', progress: 100, duplicateInfo: result }
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

      // ✅ KORRIGIERT: Multi-Upload nur für Premium
      if (userInfo.subscriptionPlan !== 'premium' && files.length > 1) {
        alert("📊 Mehrere Verträge gleichzeitig hochladen ist nur für Premium-Nutzer verfügbar.\n\n👑 Upgrade auf Premium für Batch-Upload!");
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
        console.log("✅ selectedFile gesetzt für Single-Upload (Drag&Drop):", files[0].name);
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
  const handleRowClick = (contract: Contract) => {
    // Single click opens preview panel
    setPreviewContract(contract);
  };

  const handleRowDoubleClick = (contract: Contract) => {
    // Double click opens full modal
    setSelectedContract(contract);
    setShowDetails(true);
    setOpenEditModalDirectly(false);
    setPreviewContract(null); // Close preview when modal opens

    // ✅ UPDATE URL für Assistant-Context mit Query Parameter
    navigate(`/contracts?view=${contract._id}`, { replace: true });
  };

  // ✅ Verbesserte Löschfunktion
  const handleDeleteContract = async (contractId: string, contractName: string) => {
    if (!confirm(`Möchtest du den Vertrag "${contractName}" wirklich löschen?`)) {
      return;
    }

    try {
      await apiCall(`/contracts/${contractId}`, {
        method: 'DELETE'
      });
      
      console.log("✅ Vertrag gelöscht:", contractName);
      fetchContracts();
      setShowDetails(false);
    } catch (err) {
      console.error("❌ Fehler beim Löschen:", err);
      alert("Fehler beim Löschen des Vertrags. Bitte versuche es erneut.");
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

  // ✅ Alle Filter zurücksetzen
  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter('alle');
    setDateFilter('alle');
    setSourceFilter('alle'); // ✅ Quelle zurücksetzen
    setSortOrder('neueste');
    setActiveFolder(null); // ✅ Folder zurücksetzen
  };

  const getStatusColor = (status: string): string => {
    status = (status?.toLowerCase() || '');
    if (status === "aktiv" || status === "gültig") {
      return styles.statusActive;
    } else if (status === "läuft ab" || status === "bald fällig") {
      return styles.statusWarning;
    } else if (status === "gekündigt" || status === "beendet") {
      return styles.statusCancelled;
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

  // 📊 QuickFacts Helper: Gibt dynamische oder Legacy-Daten zurück
  const getQuickFacts = (contract: Contract): Array<{ label: string; value: string; rating: 'good' | 'neutral' | 'bad' }> => {
    // Wenn dynamische quickFacts vorhanden sind, diese verwenden
    if (contract.quickFacts && contract.quickFacts.length > 0) {
      return contract.quickFacts;
    }

    // Fallback auf Legacy-Daten für alte Verträge
    return [
      {
        label: 'Kündigungsfrist',
        value: contract.kuendigung || '—',
        rating: 'neutral' as const
      },
      {
        label: 'Ablaufdatum',
        value: formatDate(contract.expiryDate),
        rating: contract.expiryDate && new Date(contract.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
          ? 'bad' as const
          : 'neutral' as const
      },
      {
        label: 'Laufzeit',
        value: contract.laufzeit || '—',
        rating: 'neutral' as const
      }
    ];
  };

  // 📊 Rating zu CSS-Klasse Mapping
  const getRatingClass = (rating: 'good' | 'neutral' | 'bad'): string => {
    switch (rating) {
      case 'good': return styles.ratingGood || '';
      case 'bad': return styles.ratingBad || styles.warning || '';
      default: return '';
    }
  };

  // 🆕 Smart Signature Badge Renderer
  const renderSignatureBadge = (contract: Contract) => {
    if (!contract.envelope && !contract.signatureStatus) return null;

    const envelope = contract.envelope;
    const status = envelope?.signatureStatus || contract.signatureStatus;

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
    fileInputRef.current?.click();
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
      case 'premium':
        return (
          <span className={styles.premiumBadge}>
            <Crown size={16} />
            Premium
          </span>
        );
      default:
        return null;
    }
  };

  // ✅ KORRIGIERT: Upload-Berechtigung prüfen - Free darf auch uploaden!
  const canUpload = true; // Alle Pläne dürfen uploaden (Free: 3, Business: 25, Premium: ∞)
  const canMultiUpload = userInfo.subscriptionPlan === 'premium';
  const hasAnalysesLeft = userInfo.analysisLimit === Infinity || userInfo.analysisCount < userInfo.analysisLimit;

  // ✅ Infinite Scroll: Zeige alle geladenen Contracts (keine Frontend-Slice mehr)
  const displayedContracts = filteredContracts;

  // ✅ RESPONSIVE: Mobile Card Component
  const MobileContractCard = ({ contract }: { contract: Contract }) => {
    const isSelected = selectedContracts.includes(contract._id);

    return (
      <motion.div
        className={styles.contractCard}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        onClick={() => handleRowDoubleClick(contract)}
      >
        {/* Card Header */}
        <div className={styles.cardHeader}>
          {/* 📋 Bulk Select Checkbox (nur wenn bulkSelectMode aktiv) */}
          {bulkSelectMode && (
            <div
              className={styles.cardCheckbox}
              onClick={(e) => {
                e.stopPropagation();
                toggleSelectContract(contract._id);
              }}
            >
              {isSelected ? (
                <CheckSquare size={22} className={styles.checkboxChecked} />
              ) : (
                <Square size={22} className={styles.checkboxUnchecked} />
              )}
            </div>
          )}
          <div className={styles.cardIcon}>
            <FileText size={20} />
          </div>
          <div className={styles.cardTitle}>
            <h3 className={styles.cardFileName}>{contract.name}</h3>
            <div className={styles.cardStatus}>
              <span className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
                {contract.status}
              </span>
              {/* 🆕 Smart Signature Status Badge */}
              {renderSignatureBadge(contract)}
              {contract.isGenerated && (
                <span className={styles.generatedBadge}>Generiert</span>
              )}
              {contract.isOptimized && (
                <span className={styles.optimizedBadge}>Optimiert</span>
              )}
              {contract.uploadType === 'EMAIL_IMPORT' && (
                <span
                  className={styles.emailImportBadge}
                  title={`Importiert am ${formatDate(contract.createdAt)} via Email`}
                >
                  <Mail size={12} />
                  Per Email
                </span>
              )}
              {contract.analyzed === false && (
                <span className={styles.notAnalyzedBadge}>Nicht analysiert</span>
              )}
            </div>
          </div>
        </div>

      {/* Card Details Grid - 📊 Dynamische QuickFacts */}
      <div className={styles.cardDetails}>
        {getQuickFacts(contract).slice(0, 2).map((fact, index) => (
          <div key={index} className={styles.cardDetailItem}>
            <span className={styles.cardDetailLabel}>{fact.label}</span>
            <div className={`${styles.cardDetailValue} ${getRatingClass(fact.rating)}`}>
              {index === 0 ? <Clock size={14} /> : <Calendar size={14} />}
              <span>{fact.value}</span>
            </div>
          </div>
        ))}

        <div className={`${styles.cardDetailItem} ${styles.fullWidth}`}>
          <span className={styles.cardDetailLabel}>Upload-Datum</span>
          <div className={styles.cardDetailValue}>
            <span>{formatDate(contract.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Card Actions - ✅ 2x2 Grid: Alle Buttons gleich groß */}
      <div className={styles.cardActions}>
        {/* ✅ Sonderfall: "Jetzt analysieren" für nicht-analysierte Verträge (volle Breite) */}
        {contract.analyzed === false && (
          <button
            className={`${styles.cardActionButton} ${styles.analyzeNow} ${styles.fullWidthAction}`}
            onClick={(e) => {
              e.stopPropagation();
              handleAnalyzeExistingContract(contract);
            }}
            disabled={analyzingContract[contract._id]}
          >
            {analyzingContract[contract._id] ? (
              <>
                <Loader size={14} className={styles.spinning} />
                <span>Analysiert...</span>
              </>
            ) : (
              <>
                <Zap size={14} />
                <span>Jetzt analysieren</span>
              </>
            )}
          </button>
        )}

        {/* 🆕 Smart PDF Button - Signed or Original */}
        <button
          className={styles.cardActionButton}
          onClick={(e) => {
            e.stopPropagation();
            openSmartPDF(contract, true); // preferSigned=true
          }}
          disabled={pdfLoading[contract._id]}
          title={contract.envelope?.s3KeySealed ? 'Signiertes PDF öffnen' : 'PDF öffnen'}
        >
          {pdfLoading[contract._id] ? (
            <Loader size={14} className={styles.loadingIcon} />
          ) : (
            <ExternalLink size={14} />
          )}
          <span>
            {pdfLoading[contract._id]
              ? 'Lädt...'
              : contract.envelope?.s3KeySealed
                ? '📥 Signiert'
                : 'PDF'}
          </span>
        </button>
        <button
          className={styles.cardActionButton}
          onClick={(e) => {
            e.stopPropagation();
            handleEditContract(contract);
          }}
        >
          <Edit size={14} />
          <span>Bearbeiten</span>
        </button>

        {/* 📁 Mobile Folder Dropdown */}
        <div
          className={styles.mobileFolderWrapper}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={`${styles.cardActionButton} ${folderDropdownOpen === contract._id ? styles.active : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setFolderDropdownOpen(
                folderDropdownOpen === contract._id ? null : contract._id
              );
            }}
          >
            <Folder size={14} />
            <span>Ordner</span>
          </button>
          {folderDropdownOpen === contract._id && (
            <div className={styles.mobileFolderDropdown}>
              <div className={styles.mobileFolderHeader}>In Ordner verschieben</div>
              <div className={styles.mobileFolderList}>
                {/* Ohne Ordner */}
                <button
                  className={`${styles.mobileFolderItem} ${!contract.folderId ? styles.selected : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveToFolder(contract._id, null);
                    setFolderDropdownOpen(null);
                  }}
                >
                  <span className={styles.folderIcon}>📂</span>
                  <span>Ohne Ordner</span>
                </button>
                {/* Folder List */}
                {folders.map((folder) => (
                  <button
                    key={folder._id}
                    className={`${styles.mobileFolderItem} ${contract.folderId === folder._id ? styles.selected : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMoveToFolder(contract._id, folder._id);
                      setFolderDropdownOpen(null);
                    }}
                  >
                    <span className={styles.folderIcon} style={{ color: folder.color }}>
                      {folder.icon}
                    </span>
                    <span>{folder.name}</span>
                    {contract.folderId === folder._id && (
                      <CheckCircle size={12} className={styles.checkIcon} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ✅ DESTRUKTIVE AKTION: Löschen (dezent, outline-only) */}
        <button
          className={`${styles.cardActionButton} ${styles.deleteAction}`}
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteContract(contract._id, contract.name);
          }}
        >
          <Trash2 size={14} />
          <span>Löschen</span>
        </button>
      </div>
    </motion.div>
    );
  };

  // ✅ PROFESSIONAL: Mobile List Row Component (kompakte Zeile wie Desktop)
  // Inspiriert von Microsoft Outlook, Apple Mail, Google Drive Mobile
  const MobileListRow = ({ contract }: { contract: Contract }) => {
    const isSelected = selectedContracts.includes(contract._id);
    const daysUntilExpiry = contract.expiryDate
      ? Math.ceil((new Date(contract.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    // Status-Farbe für den linken Rand
    const getStatusIndicatorColor = () => {
      if (contract.status === 'Gekündigt') return '#ef4444';
      if (contract.status === 'Abgelaufen') return '#f97316';
      if (daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0) return '#eab308';
      if (contract.status === 'Aktiv') return '#22c55e';
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

        {/* Hauptinhalt: Name + Meta-Info */}
        <div className={styles.listRowContent}>
          <div className={styles.listRowMain}>
            <span className={styles.listRowName}>{contract.name}</span>
            {/* Badges inline */}
            <div className={styles.listRowBadges}>
              {contract.isGenerated && <span className={styles.listRowBadge} data-type="generated">Gen</span>}
              {contract.isOptimized && <span className={styles.listRowBadge} data-type="optimized">Opt</span>}
              {contract.uploadType === 'EMAIL_IMPORT' && <span className={styles.listRowBadge} data-type="email">✉</span>}
              {contract.analyzed === false && <span className={styles.listRowBadge} data-type="unanalyzed">!</span>}
            </div>
          </div>
          <div className={styles.listRowMeta}>
            <span className={styles.listRowStatus}>{contract.status}</span>
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

  // 🆕 Enterprise Grid Card Component (für Grid-Ansicht)
  const EnterpriseGridCard = ({ contract }: { contract: Contract }) => {
    const isSelected = selectedContracts.includes(contract._id);
    const daysUntilExpiry = contract.expiryDate
      ? Math.ceil((new Date(contract.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    return (
      <motion.div
        className={`${styles.enterpriseGridCard} ${isSelected ? styles.selected : ''} ${previewContract?._id === contract._id ? styles.previewActive : ''}`}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
        onClick={() => handleRowClick(contract)}
        onDoubleClick={() => handleRowDoubleClick(contract)}
        whileHover={{ y: -2, boxShadow: '0 8px 25px rgba(0,0,0,0.1)' }}
      >
        {/* Selection Checkbox */}
        {bulkSelectMode && (
          <div
            className={styles.gridCardCheckbox}
            onClick={(e) => {
              e.stopPropagation();
              toggleSelectContract(contract._id);
            }}
          >
            {isSelected ? (
              <CheckSquare size={20} className={styles.checkboxChecked} />
            ) : (
              <Square size={20} className={styles.checkboxUnchecked} />
            )}
          </div>
        )}

        {/* Card Header with Icon & Status */}
        <div className={styles.gridCardHeader}>
          <div className={styles.gridCardIcon}>
            <FileText size={24} />
          </div>
          <div className={styles.gridCardBadges}>
            <span className={`${styles.gridStatusBadge} ${getStatusColor(contract.status)}`}>
              {contract.status}
            </span>
            {contract.isGenerated && (
              <span className={styles.gridBadge} style={{ background: '#dbeafe', color: '#1d4ed8' }}>Generiert</span>
            )}
            {contract.isOptimized && (
              <span className={styles.gridBadge} style={{ background: '#dcfce7', color: '#15803d' }}>Optimiert</span>
            )}
          </div>
        </div>

        {/* Contract Name */}
        <h3 className={styles.gridCardTitle}>{contract.name}</h3>

        {/* Quick Info */}
        <div className={styles.gridCardInfo}>
          {contract.kuendigung && (
            <div className={styles.gridCardInfoRow}>
              <Clock size={14} />
              <span>{contract.kuendigung}</span>
            </div>
          )}
          {contract.expiryDate && (
            <div className={`${styles.gridCardInfoRow} ${daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 ? styles.warning : ''}`}>
              <Calendar size={14} />
              <span>{formatDate(contract.expiryDate)}</span>
              {daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0 && (
                <span className={styles.daysLeft}>({daysUntilExpiry}d)</span>
              )}
            </div>
          )}
        </div>

        {/* Signature Status */}
        {renderSignatureBadge(contract)}

        {/* Quick Actions */}
        <div className={styles.gridCardActions}>
          <button
            className={styles.gridActionBtn}
            onClick={(e) => {
              e.stopPropagation();
              openSmartPDF(contract, true);
            }}
            disabled={pdfLoading[contract._id]}
            title="PDF öffnen"
          >
            {pdfLoading[contract._id] ? <Loader size={14} className={styles.spinning} /> : <Eye size={14} />}
          </button>
          <button
            className={styles.gridActionBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleEditContract(contract);
            }}
            title="Bearbeiten"
          >
            <Edit size={14} />
          </button>
          {/* ⚡ Analyze Button - nur für nicht-analysierte Verträge */}
          {contract.analyzed === false && (
            <button
              className={`${styles.gridActionBtn} ${styles.analyzeBtn}`}
              onClick={(e) => {
                e.stopPropagation();
                handleAnalyzeExistingContract(contract);
              }}
              disabled={analyzingContract[contract._id]}
              title="Jetzt analysieren"
            >
              {analyzingContract[contract._id] ? (
                <Loader size={14} className={styles.spinning} />
              ) : (
                <Zap size={14} />
              )}
            </button>
          )}
          <button
            className={`${styles.gridActionBtn} ${styles.deleteBtn}`}
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteContract(contract._id, contract.name);
            }}
            title="Löschen"
          >
            <Trash2 size={14} />
          </button>
        </div>

        {/* Not Analyzed Badge - jetzt mit klickbarem Text */}
        {contract.analyzed === false && (
          <div
            className={styles.gridNotAnalyzed}
            onClick={(e) => {
              e.stopPropagation();
              if (!analyzingContract[contract._id]) {
                handleAnalyzeExistingContract(contract);
              }
            }}
            style={{ cursor: analyzingContract[contract._id] ? 'wait' : 'pointer' }}
            title="Klicken zum Analysieren"
          >
            {analyzingContract[contract._id] ? (
              <>
                <Loader size={12} className={styles.spinning} />
                <span>Analysiert...</span>
              </>
            ) : (
              <>
                <Zap size={12} />
                <span>Jetzt analysieren</span>
              </>
            )}
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Verträge mit KI analysieren & optimieren | Contract AI</title>
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
        {/* ========== ENTERPRISE LAYOUT ========== */}
        <div className={styles.enterpriseLayout}>

          {/* ===== SIDEBAR ===== */}
          <aside className={styles.sidebar}>
            <div className={styles.sidebarNav}>
              <p className={styles.sidebarTitle}>Navigation</p>

              {/* Main Nav Items */}
              <button
                className={`${styles.sidebarNavItem} ${activeSection === 'contracts' && !selectedFolderId ? styles.active : ''}`}
                onClick={() => { setActiveSection('contracts'); setSelectedFolderId(null); }}
              >
                <FileText size={18} className={styles.sidebarNavIcon} />
                <span>Alle Verträge</span>
                <span className={styles.sidebarNavBadge}>{paginationInfo.total}</span>
              </button>

              <button
                className={`${styles.sidebarNavItem} ${activeSection === 'upload' ? styles.active : ''}`}
                onClick={() => setActiveSection('upload')}
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
                onClick={() => { setActiveSection('contracts'); setStatusFilter(statusFilter === 'bald_ablaufend' ? 'alle' : 'bald_ablaufend'); }}
              >
                <AlertTriangle size={18} className={styles.sidebarNavIcon} style={{ color: '#f59e0b' }} />
                <span>Bald ablaufend</span>
                <span className={styles.sidebarNavBadge}>
                  {contracts.filter(c => {
                    if (!c.expiryDate) return false;
                    const days = Math.ceil((new Date(c.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return days > 0 && days <= 30;
                  }).length}
                </span>
              </button>

              <button
                className={`${styles.sidebarNavItem} ${statusFilter === 'aktiv' ? styles.active : ''}`}
                onClick={() => { setActiveSection('contracts'); setStatusFilter(statusFilter === 'aktiv' ? 'alle' : 'aktiv'); }}
              >
                <CheckCircle size={18} className={styles.sidebarNavIcon} style={{ color: '#22c55e' }} />
                <span>Aktive Verträge</span>
                <span className={styles.sidebarNavBadge}>{contracts.filter(c => c.status === 'aktiv').length}</span>
              </button>

              <div className={styles.sidebarDivider} />

              {/* Folders */}
              <p className={styles.sidebarTitle}>Ordner</p>
              <div className={styles.sidebarFolderList}>
                {/* Alle Verträge */}
                <button
                  className={`${styles.sidebarFolderItem} ${activeFolder === null ? styles.active : ''}`}
                  onClick={() => { setActiveSection('contracts'); setActiveFolder(null); }}
                >
                  <FileText size={16} className={styles.sidebarFolderIcon} style={{ color: '#3b82f6' }} />
                  <span>Alle Verträge</span>
                  <span className={styles.sidebarNavBadge}>{paginationInfo.total}</span>
                </button>
                {/* Ohne Ordner */}
                <button
                  className={`${styles.sidebarFolderItem} ${activeFolder === 'unassigned' ? styles.active : ''}`}
                  onClick={() => { setActiveSection('contracts'); setActiveFolder('unassigned'); }}
                >
                  <Folder size={16} className={styles.sidebarFolderIcon} style={{ color: '#94a3b8' }} />
                  <span>Ohne Ordner</span>
                  <span className={styles.sidebarNavBadge}>
                    {contracts.filter(c => !c.folderId).length}
                  </span>
                </button>
                {/* User Folders */}
                {folders.map((folder: FolderType) => (
                  <button
                    key={folder._id}
                    className={`${styles.sidebarFolderItem} ${styles.userFolder} ${activeFolder === folder._id ? styles.active : ''}`}
                    onClick={() => { setActiveSection('contracts'); setActiveFolder(folder._id); }}
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
                      setPremiumHint('Smart Folders ist ein Premium-Feature. Upgrade jetzt, um KI-basierte Ordnervorschläge zu nutzen!');
                    }
                  }}
                  style={{ color: userInfo.isPremium ? '#a78bfa' : '#64748b' }}
                  title={userInfo.isPremium ? 'KI-basierte Ordnervorschläge' : 'Premium-Feature – Jetzt upgraden'}
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

            {/* Enterprise Toolbar */}
            <div className={styles.enterpriseToolbar}>
              <div className={styles.toolbarSection}>
                <button
                  className={`${styles.toolbarButton} ${styles.primary}`}
                  onClick={() => setActiveSection('upload')}
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
              <div className={styles.toolbarSearch}>
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
                  <option value="alle">Alle Status</option>
                  <option value="aktiv">Aktiv</option>
                  <option value="bald_ablaufend">Bald ablaufend</option>
                  <option value="abgelaufen">Abgelaufen</option>
                  <option value="gekündigt">Gekündigt</option>
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
                  style={{ minWidth: '130px' }}
                >
                  <option value="neueste">Neueste zuerst</option>
                  <option value="älteste">Älteste zuerst</option>
                  <option value="name_az">Name A-Z</option>
                  <option value="name_za">Name Z-A</option>
                </select>
              </div>

              <div className={styles.toolbarViewButtons}>
                <button
                  className={`${styles.viewButton} ${viewMode === 'list' ? styles.active : ''}`}
                  onClick={() => setViewMode('list')}
                  title="Listenansicht"
                >
                  <List size={16} />
                </button>
                <button
                  className={`${styles.viewButton} ${viewMode === 'grid' ? styles.active : ''}`}
                  onClick={() => setViewMode('grid')}
                  title="Rasteransicht"
                >
                  <LayoutGrid size={16} />
                </button>
              </div>
            </div>

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
                          <option value="alle">Alle Status</option>
                          <option value="aktiv">Aktiv</option>
                          <option value="bald_ablaufend">Bald ablaufend</option>
                          <option value="abgelaufen">Abgelaufen</option>
                          <option value="gekündigt">Gekündigt</option>
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

            {/* Content Area - nur dieser Bereich scrollt */}
            <div className={styles.contentArea} ref={contentAreaRef}>
              <AnimatePresence mode="wait" initial={false}>
                {activeSection === 'upload' && (
                  <motion.div
                    key="upload-section"
                    className={styles.section}
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
                          <h3>Premium</h3>
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
                    {/* ✅ Dezente Analyse-Limit-Anzeige für Free & Business */}
                    {(userInfo.subscriptionPlan === 'free' || userInfo.subscriptionPlan === 'business') && userInfo.analysisLimit !== Infinity && (
                      <div className={styles.limitBadge}>
                        <span className={styles.limitBadgeText}>
                          {Math.max(0, userInfo.analysisLimit - userInfo.analysisCount)} von {userInfo.analysisLimit} Analysen verfügbar
                          {userInfo.subscriptionPlan === 'free' && ' (einmalig)'}
                          {userInfo.subscriptionPlan === 'business' && ' (mtl.)'}
                        </span>
                        {userInfo.analysisCount >= userInfo.analysisLimit && (
                          <button
                            className={styles.limitBadgeUpgrade}
                            onClick={() => window.location.href = '/pricing'}
                          >
                            Upgrade
                          </button>
                        )}
                      </div>
                    )}

                    {/* 📱 UPLOAD TABS: Datei-Upload / E-Mail-Upload */}
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

                    {/* TAB CONTENT: E-Mail-Upload */}
                    {uploadTab === 'email' && userInfo.emailInboxAddress ? (
                      <div className={styles.emailUploadSection}>
                        <EmailInboxWidget
                          emailInboxAddress={userInfo.emailInboxAddress}
                          emailInboxEnabled={userInfo.emailInboxEnabled || false}
                          onUpdate={() => fetchUserInfo(true)}
                        />
                      </div>
                    ) : (
                    <>
                    {/* TAB CONTENT: Datei-Upload (bestehender Code) */}
                    <div className={styles.sectionHeader}>
                      <h2>
                        {canMultiUpload ? "Verträge hochladen" : "Vertrag hochladen"}
                      </h2>
                      <p className={styles.sectionDescription}>
                        {canMultiUpload
                          ? "Lade einen oder mehrere Verträge gleichzeitig hoch, um sie zu analysieren und zu verwalten"
                          : "Lade einen Vertrag hoch, um ihn zu analysieren und zu verwalten"
                        }
                      </p>
                      
                      {/* ✅ KORRIGIERT: Limit-Warnung für Business */}
                      {userInfo.subscriptionPlan === 'business' && !hasAnalysesLeft && (
                        <div className={styles.limitWarning}>
                          <AlertCircle size={16} />
                          <span>
                            Analyse-Limit erreicht ({userInfo.analysisCount}/{userInfo.analysisLimit}). 
                            <button onClick={() => window.location.href = '/pricing'}>
                              Upgrade auf Premium
                            </button>
                          </span>
                        </div>
                      )}
                      
                      {/* ✅ NEU: Premium-Upgrade-Hinweis für Business */}
                      {userInfo.subscriptionPlan === 'business' && hasAnalysesLeft && (
                        <div className={styles.premiumHint}>
                          <Crown size={16} />
                          <span>
                            Mehrere Verträge gleichzeitig analysieren? 
                            <button onClick={() => window.location.href = '/pricing'}>
                              Upgrade auf Premium
                            </button>
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div 
                      className={`${styles.uploadArea} ${dragActive ? styles.dragActive : ''} ${!hasAnalysesLeft ? styles.disabledUpload : ''}`} 
                      onDragEnter={handleDrag}
                      onDragLeave={handleDrag}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      onClick={uploadFiles.length === 0 && hasAnalysesLeft ? activateFileInput : undefined}
                    >
                      {/* ✅ Input-Element nur rendern wenn keine Dateien ausgewählt */}
                      {uploadFiles.length === 0 && (
                        <input
                          type="file"
                          onChange={handleMultipleFileChange}
                          onClick={(e) => {
                            // ✅ CRITICAL FIX: Reset value VOR Dialog-Öffnung
                            // Verhindert Browser-Cache-Probleme beim erneuten Klick
                            const target = e.target as HTMLInputElement;
                            target.value = '';
                          }}
                          className={styles.fileInput}
                          accept=".pdf,.doc,.docx"
                          multiple={canMultiUpload}
                          id="contractFile"
                          ref={fileInputRef}
                          disabled={!hasAnalysesLeft}
                        />
                      )}
                      
                      {uploadFiles.length > 0 ? (
                        <div 
                          className={styles.multiFilePreview}
                          onClick={(e) => e.stopPropagation()}
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
                              {/* ✅ Vereinfachter Upload Button - Modal entscheidet über Analyse */}
                              {!isAnalyzing && uploadFiles.some(f => f.status === 'pending') && (
                                <button
                                  type="button"
                                  className={styles.uploadButton}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleUploadOnly();
                                  }}
                                >
                                  <Upload size={16} />
                                  Hochladen
                                </button>
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
                                  <div className={styles.analysisProgressWrapper}>
                                    <AnalysisProgressComponent
                                      progress={mapLegacyToProgress({
                                        progress: fileItem.progress || 0
                                      })}
                                    />
                                  </div>
                                )}
                              </motion.div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className={styles.uploadPrompt}>
                          <div className={styles.uploadIcon}>
                            <Upload size={40} />
                          </div>
                          <h3>
                            {!hasAnalysesLeft 
                              ? "Analyse-Limit erreicht"
                              : canMultiUpload 
                                ? "Dateien hierher ziehen" 
                                : "Datei hierher ziehen"
                            }
                          </h3>
                          <p>
                            {!hasAnalysesLeft 
                              ? `Du hast ${userInfo.analysisCount} von ${userInfo.analysisLimit} Analysen verwendet`
                              : canMultiUpload 
                                ? "oder klicke, um eine oder mehrere Dateien auszuwählen"
                                : "oder klicke, um eine Datei auszuwählen"
                            }
                          </p>
                          <div className={styles.uploadFormats}>
                            Unterstützte Formate: PDF, DOC, DOCX
                          </div>
                          {canMultiUpload && hasAnalysesLeft && (
                            <div className={styles.premiumFeature}>
                              <Crown size={16} />
                              <span>Mehrfach-Upload verfügbar</span>
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

                    {/* ✅ DEINE BESTEHENDE ANALYSE-ANZEIGE bleibt unverändert */}
                    {selectedFile && uploadFiles.length === 1 && uploadFiles[0].status === 'completed' && (
                      <div className={styles.analysisContainer}>
                        <ContractAnalysis 
                          file={selectedFile} 
                          onReset={handleReset}
                          initialResult={uploadFiles[0].result}
                        />
                      </div>
                    )}

                    {/* ✅ NEU: Zusätzliche Batch-Analyse für Multi-Upload (nur 4 Zeilen hinzugefügt!) */}
                    {uploadFiles.length > 1 && uploadFiles.filter(f => f.status === 'completed').length > 0 && (
                      <BatchAnalysisResults
                        uploadFiles={uploadFiles}
                        onReset={handleReset}
                      />
                    )}
                    </>
                    )}
                  </>
                )}
              </motion.div>
            )}

            {/* 📧 NEU: Email-Upload Sektion */}
            {activeSection === 'email-upload' && userInfo.emailInboxAddress && (
              <motion.div
                key="email-upload-section"
                className={styles.section}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.sectionHeader}>
                  <div>
                    <h2 className={styles.sectionTitle}>
                      <Mail size={32} strokeWidth={2} />
                      Email-Upload
                    </h2>
                    <p className={styles.sectionDescription}>
                      Leite Emails mit Verträgen an deine persönliche Email-Adresse weiter
                    </p>
                  </div>
                </div>

                <EmailInboxWidget
                  emailInboxAddress={userInfo.emailInboxAddress}
                  emailInboxEnabled={userInfo.emailInboxEnabled ?? true}
                  onUpdate={() => fetchUserInfo(true)}
                />
              </motion.div>
            )}

            {activeSection === 'contracts' && (
              <motion.div
                key="contracts-section"
                className={styles.section}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Results info when filters active */}
                {(searchQuery || activeFiltersCount() > 0) && (
                  <div className={styles.resultsInfo}>
                    <div className={styles.resultsText}>
                      <strong>{filteredContracts.length}</strong> Ergebnis
                      {filteredContracts.length !== 1 ? 'se' : ''}
                      {searchQuery && (
                        <span> für <em>"{searchQuery}"</em></span>
                      )}
                    </div>
                    {activeFiltersCount() > 0 && (
                      <button
                        className={styles.clearAllFilters}
                        onClick={clearAllFilters}
                      >
                        <X size={14} />
                        <span>Filter zurücksetzen</span>
                      </button>
                    )}
                  </div>
                )}

                {loading && !refreshing ? (
                  <>
                    {/* Desktop Table Skeleton */}
                    <ContractsSkeleton rows={5} />
                    {/* Mobile Cards Skeleton */}
                    <ContractsCardsSkeleton cards={3} />
                  </>
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
                ) : loading ? (
                  <ContractsCardsSkeleton />
                ) : filteredContracts.length === 0 ? (
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
                          : "Upgrade auf Business oder Premium für Vertragsanalyse."
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
                  // ✅ VIEW MODE CONTAINER - Grid oder Liste
                  <>
                    {/* 🆕 ENTERPRISE GRID VIEW */}
                    {viewMode === 'grid' && (
                      <div className={styles.enterpriseGrid}>
                        {filteredContracts.map((contract) => (
                          <EnterpriseGridCard key={contract._id} contract={contract} />
                        ))}
                      </div>
                    )}

                    {/* ✅ ENTERPRISE LIST VIEW (Tabelle) */}
                    {viewMode === 'list' && (
                    <div className={styles.tableContainer}>
                      <table className={`${styles.contractsTable} ${bulkSelectMode ? styles.withCheckboxes : ''}`}>
                        <thead>
                          <tr>
                            {/* 📋 Checkbox Column - only visible in bulk select mode */}
                            {bulkSelectMode && (
                              <th className={styles.checkboxColumn}>
                                <input
                                  type="checkbox"
                                  checked={selectedContracts.length === filteredContracts.length && filteredContracts.length > 0}
                                  onChange={toggleSelectAll}
                                  className={styles.bulkCheckbox}
                                />
                              </th>
                            )}
                            <th>Vertragsname</th>
                            <th>Eckdaten 1</th>
                            <th>Eckdaten 2</th>
                            <th>Status</th>
                            <th>Upload-Datum</th>
                            <th>Aktionen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredContracts.length === 0 ? (
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
                                        : 'Upgrade auf Business oder Premium für Vertragsanalyse.'
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
                                  <div className={styles.contractIcon}>
                                    <FileText size={16} />
                                  </div>
                                  <div>
                                    <span className={styles.contractNameText}>{contract.name}</span>
                                    {(contract.isGenerated || contract.isOptimized || contract.uploadType === 'EMAIL_IMPORT') && (
                                      <div className={styles.contractBadges}>
                                        {contract.isGenerated && (
                                          <span className={styles.generatedBadge}>Generiert</span>
                                        )}
                                        {contract.isOptimized && (
                                          <span className={styles.optimizedBadge}>Optimiert</span>
                                        )}
                                        {contract.uploadType === 'EMAIL_IMPORT' && (
                                          <span
                                            className={styles.emailImportBadge}
                                            title={`Importiert am ${formatDate(contract.createdAt)} via Email`}
                                          >
                                            <Mail size={12} />
                                            Per Email
                                          </span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              {/* 📊 Dynamische QuickFacts Spalten */}
                              {getQuickFacts(contract).slice(0, 2).map((fact, factIndex) => (
                                <td key={factIndex} title={fact.label}>
                                  <div className={`${styles.contractDetail} ${getRatingClass(fact.rating)}`}>
                                    {factIndex === 0 ? (
                                      <Clock size={14} className={styles.detailIcon} />
                                    ) : (
                                      <Calendar size={14} className={styles.detailIcon} />
                                    )}
                                    <span>{fact.value}</span>
                                  </div>
                                </td>
                              ))}
                              <td>
                                <span className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
                                  {contract.status}
                                </span>
                                {/* 🆕 Smart Signature Status Badge */}
                                {renderSignatureBadge(contract)}
                              </td>
                              <td>
                                <span className={styles.uploadDate}>
                                  {formatDate(contract.createdAt)}
                                </span>
                              </td>
                              <td>
                                <div className={styles.actionButtons}>
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
                                  <button
                                    className={styles.actionButton}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditContract(contract); // ✅ BUG FIX 1: Echte Edit-Funktion!
                                    }}
                                    title="Bearbeiten"
                                  >
                                    <Edit size={16} />
                                  </button>
                                  {/* ⚡ Analyze Button - nur für nicht-analysierte Verträge */}
                                  {contract.analyzed === false && (
                                    <button
                                      className={`${styles.actionButton} ${styles.analyzeButton}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAnalyzeExistingContract(contract);
                                      }}
                                      disabled={analyzingContract[contract._id]}
                                      title="Jetzt analysieren"
                                    >
                                      {analyzingContract[contract._id] ? (
                                        <Loader size={16} className={styles.spinning} />
                                      ) : (
                                        <Zap size={16} />
                                      )}
                                    </button>
                                  )}
                                  {/* 🔔 Reminder Settings Button */}
                                  <button
                                    className={styles.actionButton}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setReminderSettingsModal({ show: true, contract });
                                    }}
                                    title="Erinnerungen einrichten"
                                  >
                                    <Bell size={16} />
                                  </button>
                                  {/* 📁 Folder Dropdown Button */}
                                  <button
                                    className={`${styles.actionButton} ${folderDropdownOpen === contract._id ? styles.active : ''}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (folderDropdownOpen === contract._id) {
                                        setFolderDropdownOpen(null);
                                        setFolderDropdownPosition(null);
                                        setFolderDropdownContractId(null);
                                      } else {
                                        // Berechne Position basierend auf Button
                                        const button = e.currentTarget;
                                        const rect = button.getBoundingClientRect();
                                        const dropdownHeight = 300; // Geschätzte Höhe
                                        const viewportHeight = window.innerHeight;
                                        const spaceBelow = viewportHeight - rect.bottom;
                                        const spaceAbove = rect.top;

                                        // Entscheide ob nach oben oder unten öffnen
                                        if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
                                          // Nach unten öffnen
                                          setFolderDropdownPosition({
                                            top: rect.bottom + 8,
                                            right: window.innerWidth - rect.right
                                          });
                                        } else {
                                          // Nach oben öffnen - berechne von unten
                                          setFolderDropdownPosition({
                                            top: rect.top - dropdownHeight - 8,
                                            right: window.innerWidth - rect.right
                                          });
                                        }
                                        setFolderDropdownOpen(contract._id);
                                        setFolderDropdownContractId(contract._id);
                                      }
                                    }}
                                    title="In Ordner verschieben"
                                  >
                                    <Folder size={16} />
                                  </button>
                                  <button
                                    className={`${styles.actionButton} ${styles.deleteButton}`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteContract(contract._id, contract.name);
                                    }}
                                    title="Löschen"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    )}
                    {/* End of viewMode === 'list' */}

                    {/* ✅ MOBILE VIEWS - Automatically shown on mobile via CSS */}
                    {/* Liste = kompakte Zeilen, Raster = Cards */}
                    <div className={styles.mobileCardsContainer}>
                      {viewMode === 'list' ? (
                        // 📋 LISTE: Kompakte Zeilen (wie Desktop/Outlook)
                        <div className={styles.mobileListContainer}>
                          {displayedContracts.map((contract) => (
                            <MobileListRow
                              key={`list-${contract._id}`}
                              contract={contract}
                            />
                          ))}
                        </div>
                      ) : (
                        // 🔲 RASTER: Cards (wie bisher)
                        <div className={styles.mobileGridContainer}>
                          {displayedContracts.map((contract) => (
                            <MobileContractCard
                              key={`grid-${contract._id}`}
                              contract={contract}
                            />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* ✅ NEU: Infinite Scroll Loading Indicator & Sentinel */}
                    {paginationInfo.hasMore && (
                      <div
                        ref={loadMoreRef}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '32px 0',
                          borderTop: '1px solid #e5e7eb'
                        }}
                      >
                        {loadingMore ? (
                          <>
                            <Loader size={24} className="spin" style={{ color: '#6b7280' }} />
                            <div style={{
                              fontSize: '14px',
                              color: '#6b7280',
                              fontWeight: 500
                            }}>
                              Lädt weitere Verträge...
                            </div>
                          </>
                        ) : (
                          <div style={{
                            fontSize: '14px',
                            color: '#6b7280',
                            fontWeight: 500
                          }}>
                            {contracts.length} von {paginationInfo.total} Verträgen geladen
                          </div>
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
                            {selectedContracts.length} ausgewählt
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
              {/* Dark Gradient Header mit Vertragsname */}
              <div className={styles.previewHeader}>
                <div className={styles.previewHeaderInfo}>
                  <div className={styles.previewHeaderIcon}>
                    <FileText size={20} />
                  </div>
                  <div className={styles.previewHeaderText}>
                    <span className={styles.previewHeaderLabel}>Vertragsvorschau</span>
                    <h3 className={styles.previewHeaderTitle}>{previewContract.name}</h3>
                  </div>
                </div>
                <button
                  className={styles.previewCloseBtn}
                  onClick={() => setPreviewContract(null)}
                >
                  <X size={18} />
                </button>
              </div>

              <div className={styles.previewContent}>
                {/* Status Badge - kompakt unter Header */}
                <div className={styles.previewStatusRow}>
                  <span className={`${styles.previewStatusBadge} ${getStatusColor(previewContract.status)}`}>
                    {previewContract.status}
                  </span>
                  {previewContract.analyzed && (
                    <span className={styles.previewAnalyzedBadge}>
                      <CheckCircle size={12} />
                      Analysiert
                    </span>
                  )}
                </div>

                {/* Score Ring - wenn Score vorhanden */}
                {previewContract.contractScore !== undefined && previewContract.contractScore !== null && (
                  <div className={styles.previewScoreRing}>
                    <div className={styles.scoreCircle}>
                      <svg viewBox="0 0 80 80" style={{ width: '100%', height: '100%' }}>
                        <defs>
                          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#3b82f6" />
                            <stop offset="100%" stopColor="#8b5cf6" />
                          </linearGradient>
                        </defs>
                        <circle cx="40" cy="40" r="32" className={styles.scoreCircleBg} />
                        <circle
                          cx="40"
                          cy="40"
                          r="32"
                          className={styles.scoreCircleProgress}
                          strokeDasharray={`${(previewContract.contractScore / 100) * 201} 201`}
                          style={{ stroke: 'url(#scoreGradient)' }}
                        />
                      </svg>
                      <div className={styles.scoreValue}>
                        <span className={styles.scoreNumber}>{previewContract.contractScore}</span>
                        <span className={styles.scoreLabel}>Score</span>
                      </div>
                    </div>
                    <div className={styles.scoreDetails}>
                      <div className={styles.scoreDetailItem}>
                        {previewContract.contractScore >= 70 ? (
                          <CheckCircle size={14} style={{ color: '#10b981' }} />
                        ) : previewContract.contractScore >= 40 ? (
                          <AlertTriangle size={14} style={{ color: '#f59e0b' }} />
                        ) : (
                          <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                        )}
                        <span>
                          {previewContract.contractScore >= 70 ? 'Guter Vertrag' : previewContract.contractScore >= 40 ? 'Verbesserungspotenzial' : 'Kritische Punkte'}
                        </span>
                      </div>
                      {previewContract.risiken && (
                        <div className={styles.scoreDetailItem}>
                          <AlertTriangle size={14} style={{ color: '#ef4444' }} />
                          <span>{previewContract.risiken.length} Risiken erkannt</span>
                        </div>
                      )}
                      {previewContract.analyzed && (
                        <div className={styles.scoreDetailItem}>
                          <CheckCircle size={14} style={{ color: '#10b981' }} />
                          <span>KI-analysiert</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Badges */}
                {(previewContract.isGenerated || previewContract.isOptimized || previewContract.analyzed === false) && (
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
                    {previewContract.analyzed === false && (
                      <span className={styles.previewBadge} style={{ background: '#fef3c7', color: '#b45309' }}>
                        <Clock size={12} />
                        Nicht analysiert
                      </span>
                    )}
                    {renderSignatureBadge(previewContract)}
                  </div>
                )}

                {/* Info Grid - 2 Spalten - 📊 Dynamische QuickFacts */}
                <div className={styles.previewInfo}>
                  {getQuickFacts(previewContract).map((fact, index) => {
                    // Icons basierend auf Index oder Label
                    const iconColors = ['#6366f1', '#f59e0b', '#10b981'];
                    const icons = [Calendar, Clock, RotateCcw];
                    const IconComponent = icons[index] || Calendar;

                    return (
                      <div key={index} className={styles.previewInfoItem}>
                        <span className={styles.previewLabel}>{fact.label}</span>
                        <span className={`${styles.previewValue} ${getRatingClass(fact.rating)}`}>
                          <IconComponent size={14} style={{ color: iconColors[index] || '#64748b' }} />
                          {fact.value}
                        </span>
                      </div>
                    );
                  })}
                  <div className={styles.previewInfoItem}>
                    <span className={styles.previewLabel}>Hochgeladen</span>
                    <span className={styles.previewValue}>
                      <Upload size={14} style={{ color: '#64748b' }} />
                      {formatDate(previewContract.createdAt)}
                    </span>
                  </div>
                  {/* Zahlungsinfo wenn vorhanden */}
                  {previewContract.paymentAmount && (
                    <div className={`${styles.previewInfoItem} ${styles.fullWidth}`}>
                      <span className={styles.previewLabel}>Zahlung</span>
                      <span className={`${styles.previewValue} ${styles.success}`}>
                        <CreditCard size={14} />
                        {previewContract.paymentAmount}€ {previewContract.paymentFrequency && `/ ${previewContract.paymentFrequency}`}
                      </span>
                    </div>
                  )}
                </div>

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
                      {previewContract.summary.length > 200
                        ? previewContract.summary.slice(0, 200) + '...'
                        : previewContract.summary}
                    </p>
                  </div>
                )}

                {/* Risks Section */}
                {previewContract.risiken && previewContract.risiken.length > 0 && (
                  <div className={styles.previewSection}>
                    <div className={styles.previewSectionHeader}>
                      <div className={`${styles.previewSectionIcon} ${styles.risks}`}>
                        <AlertTriangle size={14} />
                      </div>
                      <h5>Erkannte Risiken ({previewContract.risiken.length})</h5>
                    </div>
                    <ul className={styles.previewList}>
                      {previewContract.risiken.slice(0, 3).map((risk, i) => (
                        <li key={i} className={styles.previewRisk}>{risk}</li>
                      ))}
                      {previewContract.risiken.length > 3 && (
                        <li className={styles.previewMore}>+{previewContract.risiken.length - 3} weitere Risiken</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>

              {/* Preview Actions - Redesigned */}
              <div className={styles.previewActions}>
                {/* ⚡ Prominenter Analyse-Button wenn nicht analysiert */}
                {previewContract.analyzed === false && (
                  <button
                    className={`${styles.previewActionBtn} ${styles.analyze}`}
                    onClick={() => handleAnalyzeExistingContract(previewContract)}
                    disabled={analyzingContract[previewContract._id]}
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
                    onClick={() => openSmartPDF(previewContract, true)}
                    disabled={pdfLoading[previewContract._id]}
                  >
                    {pdfLoading[previewContract._id] ? <Loader size={14} className={styles.spinning} /> : <ExternalLink size={14} />}
                    PDF
                  </button>
                  <button
                    className={styles.previewQuickAction}
                    onClick={() => {
                      setSelectedContract(previewContract);
                      setOpenEditModalDirectly(true);
                      setShowDetails(true);
                    }}
                  >
                    <Edit3 size={14} />
                    Bearbeiten
                  </button>
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
                </div>
              </div>
            </aside>
          )}
        </div>
        {/* End of enterpriseLayout */}

        {/* 🎨 NEW: Professional Contract Details Modal */}
          {selectedContract && showDetails && (
            <NewContractDetailsModal
              contract={selectedContract}
              onClose={() => {
                setShowDetails(false);
                setOpenEditModalDirectly(false); // ✅ Reset beim Schließen

                // ✅ RESET URL zurück zur Liste (triggert useLocation Hook!)
                navigate('/contracts', { replace: true });
              }}
              openEditModalDirectly={openEditModalDirectly} // ✅ NEU: Diese Prop wird das Edit-Modal direkt öffnen
              onEdit={async (contractId) => {
                console.log("Contract updated:", contractId);
                const updatedContracts = await fetchContracts(); // ✅ Verträge neu laden nach Edit
                // ✅ FIX: selectedContract auch mit neuen Daten aktualisieren
                if (updatedContracts) {
                  const updatedContract = updatedContracts.find((c: Contract) => c._id === contractId);
                  if (updatedContract) {
                    setSelectedContract(updatedContract);
                  }
                }
              }}
              onDelete={handleDeleteContract}
            />
          )}

          {/* ✅ NEU: Legacy-Modal für alte Verträge */}
          {legacyModal?.show && legacyModal.contract && (
            <LegacyModal
              contract={legacyModal.contract}
              message={legacyModal.message || ''}
              onClose={() => setLegacyModal(null)}
              onReupload={handleLegacyReupload}
            />
          )}

          {/* ✅ NEU: Duplikat-Modal (nur rendern wenn existingContract vorhanden) */}
          {duplicateModal?.show && duplicateModal.fileItem && duplicateModal.existingContract && (
            <DuplicateModal
              fileItem={duplicateModal.fileItem}
              existingContract={duplicateModal.existingContract}
              onClose={() => setDuplicateModal(null)}
              onViewExisting={handleViewExistingContract}
              onReplaceFile={handleReplaceExistingFile}
              onAnalyzeAnyway={handleAnalyzeAnywayFromDuplicate}
            />
          )}

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
          contractName={reminderSettingsModal.contract.name}
          currentReminderDays={reminderSettingsModal.contract.reminderDays || []}
          expiryDate={reminderSettingsModal.contract.expiryDate}
          onClose={() => setReminderSettingsModal({ show: false, contract: null })}
          onSuccess={(reminderDays) => {
            console.log('✅ Reminder settings saved:', reminderDays);
            fetchContracts(); // Refresh contracts
          }}
        />
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

                  {dropdownContract.analyzed === false && (
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
              </div>
            </>
          );
        })(),
        document.body
      )}

      {/* ✅ Full-Screen Analyse-Overlay (für besseres Mobile-Feedback) */}
      {analyzingOverlay.show && createPortal(
        <div className={styles.analyzingOverlay}>
          <div className={styles.analyzingContent}>
            <Loader size={48} className={styles.spinning} />
            <h3>Vertrag wird analysiert...</h3>
            <p>{analyzingOverlay.contractName}</p>
            <span className={styles.analyzingHint}>
              Die KI analysiert Ihren Vertrag. Dies kann bis zu 30 Sekunden dauern.
            </span>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}