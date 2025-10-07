// 📁 src/pages/Contracts.tsx - JSX FIXED: Motion Button closing tag korrigiert + ANALYSE-ANZEIGE GEFIXT + RESPONSIVE + DUPLIKATSERKENNUNG + S3-INTEGRATION + BATCH-ANALYSE-ANZEIGE + PDF-SCHNELLAKTION MOBILE-FIX + EDIT-SCHNELLAKTION REPARIERT
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet";
import {
  FileText, RefreshCw, Upload, CheckCircle, AlertCircle,
  Plus, Calendar, Clock, Trash2, Eye, Edit,
  Search, X, Crown, Users, Loader,
  Lock, Zap, BarChart3, ExternalLink
} from "lucide-react";
import styles from "../styles/Contracts.module.css";
import ContractAnalysis from "../components/ContractAnalysis";
import BatchAnalysisResults from "../components/BatchAnalysisResults"; // ✅ NEU: Import für Batch-Analyse
import ContractDetailsView from "../components/ContractDetailsView";
import UploadSuccessModal from "../components/UploadSuccessModal"; // ✅ NEU: Two-Step Upload Modal
import { apiCall, uploadAndAnalyze, uploadOnly } from "../utils/api"; // ✅ NEU: uploadOnly hinzugefügt

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  expiryDate: string;
  status: string;
  createdAt: string;
  content?: string;
  isGenerated?: boolean;
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
  subscriptionPlan: 'free' | 'business' | 'premium';
  isPremium: boolean;
  analysisCount: number;
  analysisLimit: number;
}

// ✅ Erweiterte Filter-Typen
type StatusFilter = 'alle' | 'aktiv' | 'bald_ablaufend' | 'abgelaufen' | 'gekündigt';
type DateFilter = 'alle' | 'letzte_7_tage' | 'letzte_30_tage' | 'letztes_jahr';
type SortOrder = 'neueste' | 'älteste' | 'name_az' | 'name_za';

// ✅ NEU: S3-Integration - Utility-Funktionen direkt in der Komponente

// ✅ MOBILE-FIX: PDF-Schnellaktion mit "Temporäres Tab sofort öffnen" Methode (Mobile-freundlich)
const handleViewContractPDF = async (
  contract: Contract,
  setPdfLoading: React.Dispatch<React.SetStateAction<{ [contractId: string]: boolean }>>,
  setError: React.Dispatch<React.SetStateAction<string | null>>,
  setLegacyModal: React.Dispatch<React.SetStateAction<{
    show: boolean;
    contract?: Contract;
    message?: string;
  } | null>>
) => {
  console.log('📱 PDF-Schnellaktion (Mobile-freundliche Methode):', {
    contractId: contract._id,
    contractName: contract.name,
    hasS3Key: !!contract.s3Key,
    uploadType: contract.uploadType,
    needsReupload: contract.needsReupload
  });

  setPdfLoading(prev => ({ ...prev, [contract._id]: true }));
  
  // ✅ MOBILE-FIX: Temporäres Tab sofort öffnen (Popup-Blocker umgehen)
  let tempWindow: Window | null = null;
  
  try {
    const token = localStorage.getItem('token');

    // ✅ Legacy-Vertrag Check (vor Tab-Öffnung)
    if (contract.needsReupload || contract.uploadType === 'LOCAL_LEGACY') {
      console.log('⚠️ Legacy contract detected');
      setLegacyModal({
        show: true,
        contract,
        message: 'Dieser Vertrag wurde vor der Cloud-Integration hochgeladen und ist nicht mehr verfügbar. Bitte laden Sie ihn erneut hoch.'
      });
      return;
    }

    // ✅ CRITICAL: Tab sofort öffnen (noch im User-Click-Context)
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
              .loader {
                text-align: center;
              }
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
              <h2>PDF wird geladen...</h2>
              <p>Schnellaktion ausgeführt...</p>
            </div>
          </body>
        </html>
      `);
    }

    // ✅ S3-Key-Route (prioritär)
    if (contract.s3Key) {
      console.log('✅ S3 Contract detected, fetching signed URL with key...');
      
      const response = await fetch(`/api/s3/view?key=${encodeURIComponent(contract.s3Key)}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      const data = await response.json();
      
      console.log('🔍 S3 Response data:', data);
      
      if (response.ok && (data.url || data.fileUrl)) {
        const pdfUrl = data.url || data.fileUrl;
        console.log('✅ S3 URL fetched successfully:', pdfUrl);
        
        if (tempWindow && !tempWindow.closed) {
          tempWindow.location.href = pdfUrl;
        } else {
          // Fallback falls Tab geschlossen wurde
          window.open(pdfUrl, '_blank', 'noopener,noreferrer');
        }
        return;
      } else {
        console.error('❌ S3 URL fetch failed:', data.error || 'No URL in response');
        // Fallback to contractId route
      }
    }
    
    // ✅ Fallback: ContractId-Route
    console.log('🔄 Fallback: Using contractId route...');
    
    const response = await fetch(`/api/s3/view?contractId=${contract._id}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const data = await response.json();

    if (response.ok && (data.fileUrl || data.url)) {
      const pdfUrl = data.fileUrl || data.url;
      console.log('✅ ContractId route successful:', pdfUrl);
      
      if (tempWindow && !tempWindow.closed) {
        tempWindow.location.href = pdfUrl;
      } else {
        // Fallback falls Tab geschlossen wurde
        window.open(pdfUrl, '_blank', 'noopener,noreferrer');
      }
      return;
    } else if (data.error?.includes('before S3 integration')) {
      console.log('⚠️ Legacy contract identified via contractId route');
      if (tempWindow) tempWindow.close();
      setLegacyModal({
        show: true,
        contract,
        message: data.error
      });
      return;
    } else {
      throw new Error(data.error || 'Failed to get signed URL');
    }

  } catch (error) {
    console.error('❌ Error in mobile-friendly PDF schnellaktion:', error);
    
    // ✅ Tab schließen bei Fehler
    if (tempWindow && !tempWindow.closed) {
      tempWindow.document.write(`
        <html>
          <head>
            <title>Fehler</title>
            <style>
              body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segui UI', Roboto, sans-serif;
                display: flex; 
                justify-content: center; 
                align-items: center; 
                height: 100vh; 
                margin: 0; 
                background: #f5f5f7;
                color: #1d1d1f;
                text-align: center;
              }
              .error { color: #ff3b30; }
              button {
                margin-top: 20px;
                padding: 12px 24px;
                background: #007aff;
                color: white;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-size: 16px;
              }
            </style>
          </head>
          <body>
            <div>
              <h2 class="error">❌ Schnellaktion Fehler</h2>
              <p>Die PDF-Datei konnte nicht geöffnet werden.</p>
              <button onclick="window.close()">Tab schließen</button>
            </div>
          </body>
        </html>
      `);
      
      // Auto-close nach 5 Sekunden
      setTimeout(() => {
        if (tempWindow && !tempWindow.closed) {
          tempWindow.close();
        }
      }, 5000);
    }
    
    const errorMessage = error instanceof Error 
      ? error.message 
      : 'Unerwarteter Fehler beim Öffnen des Vertrags';
    
    setError(errorMessage);
  } finally {
    setPdfLoading(prev => ({ ...prev, [contract._id]: false }));
  }
};

export default function Contracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [filteredContracts, setFilteredContracts] = useState<Contract[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeSection, setActiveSection] = useState<'upload' | 'contracts'>('contracts');
  const [refreshing, setRefreshing] = useState(false);
  
  // ✅ BUG FIX 1: Neuer State für Edit-Modal direkt öffnen
  const [openEditModalDirectly, setOpenEditModalDirectly] = useState(false);
  
  // ✅ KORRIGIERT: User-Plan States
  const [userInfo, setUserInfo] = useState<UserInfo>({
    subscriptionPlan: 'free',
    isPremium: false,
    analysisCount: 0,
    analysisLimit: 0
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

  // ✅ NEU: Upload Success Modal State (für Two-Step Upload Flow)
  const [uploadSuccessModal, setUploadSuccessModal] = useState<{
    show: boolean;
    uploadedContracts: Array<{ _id: string; name: string; uploadedAt: string }>;
  }>({
    show: false,
    uploadedContracts: []
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ✅ FIXED: PDF anzeigen Handler - jetzt als Wrapper für die extrahierte Funktion
  const handleViewContractPDFWrapper = async (contract: Contract) => {
    await handleViewContractPDF(contract, setPdfLoading, setError, setLegacyModal);
  };

  // ✅ BUG FIX 1: NEUE Edit-Schnellaktion Handler-Funktion
  const handleEditContract = (contract: Contract) => {
    console.log('✏️ Edit-Schnellaktion für Contract:', contract._id, contract.name);
    setSelectedContract(contract);
    setShowDetails(true);
    setOpenEditModalDirectly(true); // ⭐ Das ist der neue State!
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
          <div className={styles.modalHeader}>
            <div className={styles.modalIcon}>
              <Users size={24} className={styles.duplicateIcon} />
            </div>
            <h3>Datei bereits vorhanden</h3>
            <button 
              className={styles.modalCloseButton}
              onClick={onClose}
            >
              <X size={20} />
            </button>
          </div>

          <div className={styles.modalContent}>
            <div className={styles.duplicateInfo}>
              <div className={styles.duplicateDetails}>
                <div className={styles.fileComparison}>
                  <div className={styles.fileComparisonItem}>
                    <div className={styles.fileComparisonLabel}>📄 Neue Datei</div>
                    <div className={styles.fileComparisonName}>{fileItem.file.name}</div>
                    <div className={styles.fileComparisonSize}>
                      {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                  
                  <div className={styles.duplicateArrow}>
                    <Users size={20} />
                  </div>
                  
                  <div className={styles.fileComparisonItem}>
                    <div className={styles.fileComparisonLabel}>📁 Bereits vorhanden</div>
                    <div className={styles.fileComparisonName}>
                      {existingContract?.name || 'Unbenannt'}
                    </div>
                    <div className={styles.fileComparisonDate}>
                      Hochgeladen: {existingContract?.createdAt ? formatDate(existingContract.createdAt) : '—'}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className={styles.duplicateMessage}>
                <p>
                  Diese Datei wurde bereits hochgeladen und analysiert. 
                  Was möchtest du tun?
                </p>
              </div>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button 
              className={styles.modalActionButton}
              onClick={onViewExisting}
            >
              <Eye size={16} />
              <span>Vorhandene Datei anschauen</span>
            </button>
            
            <button 
              className={`${styles.modalActionButton} ${styles.primaryAction}`}
              onClick={onAnalyzeAnyway}
            >
              <RefreshCw size={16} />
              <span>Trotzdem neu analysieren</span>
            </button>
            
            <button 
              className={`${styles.modalActionButton} ${styles.warningAction}`}
              onClick={onReplaceFile}
            >
              <Upload size={16} />
              <span>Datei ersetzen</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );

  // ✅ KORRIGIERT: User-Info laden mit 3-Stufen-Preismodell
  const fetchUserInfo = async () => {
    try {
      const response = await apiCall("/auth/me") as { 
        user: { 
          subscriptionPlan: string; 
          isPremium: boolean;
          analysisCount: number;
        } 
      };
      
      const plan = response.user?.subscriptionPlan as 'free' | 'business' | 'premium' || 'free';
      const isPremium = response.user?.isPremium || plan === 'premium';
      const analysisCount = response.user?.analysisCount || 0;
      
      // ✅ KORRIGIERT: Limits nach 3-Stufen-Modell
      let analysisLimit = 0;
      if (plan === 'free') analysisLimit = 0;        // ❌ Keine Analysen
      else if (plan === 'business') analysisLimit = 50;  // 📊 50 pro Monat
      else if (plan === 'premium') analysisLimit = Infinity; // ♾️ Unbegrenzt
      
      const newUserInfo: UserInfo = {
        subscriptionPlan: plan,
        isPremium,
        analysisCount,
        analysisLimit
      };
      
      setUserInfo(newUserInfo);
      
      console.log("✅ User-Info geladen:", newUserInfo);
    } catch (err) {
      console.warn("⚠️ User-Info konnte nicht geladen werden:", err);
      setUserInfo({
        subscriptionPlan: 'free',
        isPremium: false,
        analysisCount: 0,
        analysisLimit: 0
      });
    }
  };

  // ✅ Verbesserte fetchContracts mit apiCall
  const fetchContracts = async (): Promise<Contract[] | null> => {
    try {
      setLoading(true);
      setRefreshing(true);

      const data = await apiCall("/contracts") as Contract[];
      setContracts(data);
      setFilteredContracts(data);
      setError(null);

      console.log("✅ Verträge erfolgreich geladen:", data.length);
      return data;
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

  // ✅ FIXED: applyFilters mit useCallback für stabile Referenz
  const applyFilters = useCallback(() => {
    let filtered = [...contracts];

    // Text-Suche - FIXED: Sichere .toLowerCase() Aufrufe
    if (searchQuery.trim()) {
      filtered = filtered.filter(contract => 
        (contract.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (contract.status?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
        (contract.kuendigung?.toLowerCase() || '').includes(searchQuery.toLowerCase())
      );
    }

    // Status-Filter
    if (statusFilter !== 'alle') {
      filtered = filtered.filter(contract => {
        const status = (contract.status?.toLowerCase() || '');
        switch (statusFilter) {
          case 'aktiv':
            return status === 'aktiv' || status === 'gültig';
          case 'bald_ablaufend':
            return status === 'läuft ab' || status === 'bald fällig';
          case 'abgelaufen':
            return status === 'abgelaufen' || status === 'beendet';
          case 'gekündigt':
            return status === 'gekündigt';
          default:
            return true;
        }
      });
    }

    // Datums-Filter
    if (dateFilter !== 'alle') {
      const now = new Date();
      filtered = filtered.filter(contract => {
        const createdDate = new Date(contract.createdAt);
        const diffTime = now.getTime() - createdDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        switch (dateFilter) {
          case 'letzte_7_tage':
            return diffDays <= 7;
          case 'letzte_30_tage':
            return diffDays <= 30;
          case 'letztes_jahr':
            return diffDays <= 365;
          default:
            return true;
        }
      });
    }

    // Sortierung
    filtered.sort((a, b) => {
      switch (sortOrder) {
        case 'neueste':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'älteste':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'name_az':
          return (a.name || '').localeCompare(b.name || '');
        case 'name_za':
          return (b.name || '').localeCompare(a.name || '');
        default:
          return 0;
        }
      });

    setFilteredContracts(filtered);
  }, [contracts, searchQuery, statusFilter, dateFilter, sortOrder]);

  // ✅ FIXED: Filter anwenden mit stabiler applyFilters-Referenz
  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  // ✅ Initial Load
  useEffect(() => {
    fetchUserInfo();
    fetchContracts();
  }, []);

  // ✅ KORRIGIERT: Mehrfach-Upload Handler mit Plan-Validierung + ANALYSE-FIX
  const handleMultipleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      // ✅ Reset Input auch bei Abbruch
      e.target.value = '';
      return;
    }

    // ✅ KORRIGIERT: Free-User Check
    if (userInfo.subscriptionPlan === 'free') {
      alert("❌ Vertragsanalyse ist nur für Business- und Premium-Nutzer verfügbar.\n\n🚀 Jetzt upgraden für Zugriff auf KI-Vertragsanalyse!");
      e.target.value = ''; // ✅ Reset Input
      return;
    }

    // ✅ KORRIGIERT: Business vs Premium Check
    if (userInfo.subscriptionPlan === 'business' && files.length > 1) {
      alert("📊 Mehrere Verträge gleichzeitig analysieren ist nur für Premium-Nutzer verfügbar.\n\n👑 Upgrade auf Premium für Batch-Analyse!");
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

  // ✅ NEU: Analyse-Aktion aus Success Modal
  const handleAnalyzeFromModal = async () => {
    console.log("🔍 User chose to analyze uploaded contracts");

    const contractIds = uploadSuccessModal.uploadedContracts.map(c => c._id);
    setUploadSuccessModal({ show: false, uploadedContracts: [] });

    if (contractIds.length === 0) {
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
      // Analysiere jeden hochgeladenen Vertrag
      for (let i = 0; i < contractIds.length; i++) {
        const contractId = contractIds[i];
        console.log(`📊 Analyzing contract ${i + 1}/${contractIds.length}: ${contractId}`);

        // Update progress
        const progressPercent = Math.round(((i + 1) / contractIds.length) * 100);
        setUploadFiles(prev => prev.map((item, idx) =>
          item.status === 'analyzing' && idx === i
            ? { ...item, progress: progressPercent }
            : item
        ));

        try {
          const data = await apiCall(`/contracts/${contractId}/analyze`, {
            method: 'POST',
          }) as { success: boolean; message?: string };

          if (data.success) {
            console.log(`✅ Analysis completed for ${contractId}`);
          } else {
            console.error(`❌ Analysis failed for ${contractId}:`, data.message);
          }
        } catch (error) {
          console.error(`❌ Analysis failed for ${contractId}:`, error);
        }
      }

      // Alle erfolgreich - Status auf "completed" mit analyzed: true
      setUploadFiles(prev => prev.map(item =>
        item.status === 'analyzing'
          ? { ...item, status: 'completed', progress: 100, analyzed: true }
          : item
      ));

      // ✅ Refresh contracts to get updated data
      const updatedContracts = await fetchContracts();

      // ✅ Update uploadFiles with analysis results
      if (updatedContracts) {
        setUploadFiles(prev => prev.map(item => {
          const analyzedContract = updatedContracts.find((c: Contract) =>
            contractIds.includes(c._id)
          );

          if (analyzedContract && item.status === 'completed') {
            return {
              ...item,
              analyzed: true,
              result: {
                success: true,
                contractScore: analyzedContract.contractScore,
                summary: analyzedContract.summary,
                legalAssessment: analyzedContract.legalAssessment,
                suggestions: analyzedContract.suggestions,
                analysisData: {
                  kuendigung: analyzedContract.kuendigung,
                  laufzeit: analyzedContract.laufzeit,
                  status: analyzedContract.status,
                  risiken: analyzedContract.risiken,
                  optimierungen: analyzedContract.optimierungen
                }
              }
            };
          }

          return item;
        }));
      }

      // ✅ BLEIBE auf Upload-Seite - BatchAnalysisResults zeigt automatisch ContractAnalysis
      setActiveSection('upload');

      console.log(`✅ ${contractIds.length} Vertrag${contractIds.length > 1 ? 'e' : ''} erfolgreich analysiert und auf Upload-Seite angezeigt`);

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

    // Check subscription & limits
    if (userInfo.subscriptionPlan === 'free') {
      alert("❌ Vertragsanalyse ist nur für Business- und Premium-Nutzer verfügbar.\n\n🚀 Jetzt upgraden!");
      return;
    }

    if (userInfo.analysisCount >= userInfo.analysisLimit && userInfo.analysisLimit !== Infinity) {
      alert(`📊 Analyse-Limit erreicht (${userInfo.analysisCount}/${userInfo.analysisLimit}).\n\n🚀 Upgrade für mehr Analysen!`);
      return;
    }

    try {
      setError(null);

      // Trigger Re-Analyse via Backend
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/contracts/${contract._id}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.success) {
        console.log("✅ Analysis successful for existing contract");
        alert("✅ Analyse erfolgreich abgeschlossen!");

        // Refresh contracts list
        fetchContracts();
      } else {
        throw new Error(data.message || 'Analyse fehlgeschlagen');
      }

    } catch (error) {
      console.error("❌ Error analyzing existing contract:", error);
      const errorMsg = error instanceof Error ? error.message : 'Analyse fehlgeschlagen';
      setError(errorMsg);
      alert(`❌ ${errorMsg}`);
    }
  };

  const handleViewExistingContract = () => {
    if (!duplicateModal?.existingContract) return;
    
    // ✅ Wechsel zu Verträge-Tab und öffne Details
    setActiveSection('contracts');
    setSelectedContract(duplicateModal.existingContract);
    setShowDetails(true);
    setDuplicateModal(null);
    
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
    
    // ✅ User-Info und Verträge neu laden
    setTimeout(() => {
      fetchUserInfo();
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

      // ✅ User-Info aktualisieren
      fetchUserInfo();

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
      
      // ✅ KORRIGIERT: Free-User Check
      if (userInfo.subscriptionPlan === 'free') {
        alert("❌ Vertragsanalyse ist nur für Business- und Premium-Nutzer verfügbar.\n\n🚀 Jetzt upgraden für Zugriff auf KI-Vertragsanalyse!");
        return;
      }

      // ✅ KORRIGIERT: Business vs Premium Check
      if (userInfo.subscriptionPlan === 'business' && files.length > 1) {
        alert("📊 Mehrere Verträge gleichzeitig analysieren ist nur für Premium-Nutzer verfügbar.\n\n👑 Upgrade auf Premium für Batch-Analyse!");
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

  const handleRowClick = (contract: Contract) => {
    setSelectedContract(contract);
    setShowDetails(true);
    setOpenEditModalDirectly(false); // ✅ Normal Details öffnen, nicht Edit-Modal
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
    return count;
  };

  // ✅ Alle Filter zurücksetzen
  const clearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter('alle');
    setDateFilter('alle');
    setSortOrder('neueste');
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
        return 'Bereit zum Hochladen';
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

  // ✅ KORRIGIERT: Upload-Berechtigung prüfen
  const canUpload = userInfo.subscriptionPlan !== 'free';
  const canMultiUpload = userInfo.subscriptionPlan === 'premium';
  const hasAnalysesLeft = userInfo.analysisLimit === Infinity || userInfo.analysisCount < userInfo.analysisLimit;

  // ✅ RESPONSIVE: Mobile Card Component
  const MobileContractCard = ({ contract }: { contract: Contract }) => (
    <motion.div 
      className={styles.contractCard}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={() => handleRowClick(contract)}
    >
      {/* Card Header */}
      <div className={styles.cardHeader}>
        <div className={styles.cardIcon}>
          <FileText size={20} />
        </div>
        <div className={styles.cardTitle}>
          <h3 className={styles.cardFileName}>{contract.name}</h3>
          <div className={styles.cardStatus}>
            <span className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
              {contract.status}
            </span>
            {contract.isGenerated && (
              <span className={styles.generatedBadge}>Generiert</span>
            )}
            {contract.analyzed === false && (
              <span className={styles.notAnalyzedBadge}>Nicht analysiert</span>
            )}
          </div>
        </div>
      </div>

      {/* Card Details Grid */}
      <div className={styles.cardDetails}>
        <div className={styles.cardDetailItem}>
          <span className={styles.cardDetailLabel}>Kündigungsfrist</span>
          <div className={styles.cardDetailValue}>
            <Clock size={14} />
            <span>{contract.kuendigung || "—"}</span>
          </div>
        </div>
        
        <div className={styles.cardDetailItem}>
          <span className={styles.cardDetailLabel}>Ablaufdatum</span>
          <div className={styles.cardDetailValue}>
            <Calendar size={14} />
            <span>{formatDate(contract.expiryDate)}</span>
          </div>
        </div>
        
        <div className={`${styles.cardDetailItem} ${styles.fullWidth}`}>
          <span className={styles.cardDetailLabel}>Upload-Datum</span>
          <div className={styles.cardDetailValue}>
            <span>{formatDate(contract.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Card Actions */}
      <div className={styles.cardActions}>
        {/* ✅ NEU: "Jetzt analysieren" Button für nicht-analysierte Verträge */}
        {contract.analyzed === false && (
          <button
            className={`${styles.cardActionButton} ${styles.analyzeNow}`}
            onClick={(e) => {
              e.stopPropagation();
              handleAnalyzeExistingContract(contract);
            }}
          >
            <Zap size={14} />
            <span>Jetzt analysieren</span>
          </button>
        )}
        <button
          className={styles.cardActionButton}
          onClick={(e) => {
            e.stopPropagation();
            handleRowClick(contract);
          }}
        >
          <Eye size={14} />
          <span>Details</span>
        </button>
        <button
          className={styles.cardActionButton}
          onClick={(e) => {
            e.stopPropagation();
            handleViewContractPDFWrapper(contract);
          }}
          disabled={pdfLoading[contract._id]}
        >
          {pdfLoading[contract._id] ? (
            <Loader size={14} className={styles.loadingIcon} />
          ) : (
            <ExternalLink size={14} />
          )}
          <span>{pdfLoading[contract._id] ? 'Lädt...' : 'PDF'}</span>
        </button>
        <button
          className={styles.cardActionButton}
          onClick={(e) => {
            e.stopPropagation();
            handleEditContract(contract); // ✅ BUG FIX 1: Echte Edit-Funktion!
          }}
        >
          <Edit size={14} />
          <span>Bearbeiten</span>
        </button>
        <button
          className={`${styles.cardActionButton} ${styles.delete}`}
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
        <meta property="og:url" content="https://contract-ai.de/contracts" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://contract-ai.de/og-image.jpg" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Verträge mit KI analysieren & optimieren | Contract AI" />
        <meta name="twitter:description" content="Verträge einfach hochladen, Risiken erkennen & optimieren – mit KI. Mehr Kontrolle & Klarheit für deine Verträge." />
        <meta name="twitter:image" content="https://contract-ai.de/og-image.jpg" />
      </Helmet>

      <div className={styles.pageContainer}>
        <motion.div 
          className={styles.container}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className={styles.header}>
            <motion.h1 
              className={styles.title}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <FileText size={28} className={styles.titleIcon} />
              Vertragsanalyse & Verwaltung
              {getPlanBadge()}
            </motion.h1>
            <motion.p 
              className={styles.subtitle}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              {userInfo.subscriptionPlan === 'free' && 
                "Upgrade auf Business oder Premium für KI-Vertragsanalyse"
              }
              {userInfo.subscriptionPlan === 'business' && 
                `Verträge analysieren und verwalten (${userInfo.analysisCount}/${userInfo.analysisLimit} Analysen)`
              }
              {userInfo.subscriptionPlan === 'premium' && 
                "Verträge einzeln oder gleichzeitig analysieren und verwalten"
              }
            </motion.p>

            {/* ✅ KORRIGIERT: Analysis-Limit-Anzeige für Business */}
            {userInfo.subscriptionPlan === 'business' && (
              <div className={styles.limitProgress}>
                <div className={styles.limitText}>
                  {userInfo.analysisCount} von {userInfo.analysisLimit} Analysen verwendet
                </div>
                <div className={styles.limitBar}>
                  <div 
                    className={styles.limitBarFill}
                    style={{ width: `${Math.min((userInfo.analysisCount / userInfo.analysisLimit) * 100, 100)}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Tabs */}
          <div className={styles.tabsContainer}>
            <button 
              className={`${styles.tabButton} ${activeSection === 'contracts' ? styles.activeTab : ''}`}
              onClick={() => setActiveSection('contracts')}
            >
              <FileText size={18} />
              <span>Verträge</span>
              {contracts.length > 0 && (
                <span className={styles.tabBadge}>{contracts.length}</span>
              )}
            </button>
            <button 
              className={`${styles.tabButton} ${activeSection === 'upload' ? styles.activeTab : ''} ${!canUpload ? styles.disabledTab : ''}`}
              onClick={() => canUpload && setActiveSection('upload')}
              disabled={!canUpload}
              data-section="upload"
            >
              <Upload size={18} />
              <span>
                {userInfo.subscriptionPlan === 'free' ? 'Upgrade erforderlich' : 'Hochladen'}
              </span>
              {canMultiUpload && (
                <span className={styles.premiumTabBadge}>
                  <Crown size={12} />
                  Multi
                </span>
              )}
              {!canUpload && (
                <Lock size={14} className={styles.lockIcon} />
              )}
            </button>
          </div>

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
                    {/* ✅ KORRIGIERT: Upload-Bereich für Business/Premium */}
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
                                  <div className={styles.fileItemProgress}>
                                    <div 
                                      className={styles.fileItemProgressBar}
                                      style={{ width: `${fileItem.progress}%` }}
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
                              className={styles.upgradeButton}
                              onClick={(e) => {
                                e.stopPropagation();
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
                <div className={styles.sectionHeader}>
                  <div>
                    <h2>Deine Verträge</h2>
                    <p className={styles.contractsCount}>
                      {loading ? "Lade..." : `${filteredContracts.length} von ${contracts.length} Verträgen`}
                    </p>
                  </div>
                  <div className={styles.sectionActions}>
                    <motion.button 
                      className={styles.refreshButton} 
                      onClick={fetchContracts} 
                      aria-label="Aktualisieren"
                      disabled={refreshing}
                      animate={{ rotate: refreshing ? 360 : 0 }}
                      transition={{ duration: 1, ease: "linear", repeat: refreshing ? Infinity : 0 }}
                    >
                      <RefreshCw size={16} />
                    </motion.button>
                    <motion.button 
                      className={`${styles.newContractButton} ${!canUpload ? styles.disabledButton : ''}`}
                      onClick={() => canUpload && setActiveSection('upload')}
                      whileHover={canUpload ? { scale: 1.02 } : {}}
                      whileTap={canUpload ? { scale: 0.98 } : {}}
                      disabled={!canUpload}
                    >
                      <Plus size={16} />
                      <span>{canUpload ? 'Neuer Vertrag' : 'Upgrade erforderlich'}</span>
                      {!canUpload && <Lock size={14} />}
                    </motion.button>
                  </div>
                </div>

                <div className={styles.filtersToolbar}>
                  <div className={styles.searchSection}>
                    <div className={styles.searchInputWrapper}>
                      <Search size={18} className={styles.searchIcon} />
                      <input 
                        type="text" 
                        placeholder="Verträge durchsuchen..." 
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                      {searchQuery && (
                        <button 
                          className={styles.clearSearchButton}
                          onClick={() => setSearchQuery("")}
                        >
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={styles.filtersSection}>
                    <div className={styles.quickFilters}>
                      <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className={styles.quickFilter}
                      >
                        <option value="alle">Alle Status</option>
                        <option value="aktiv">✅ Aktiv</option>
                        <option value="bald_ablaufend">⚠️ Bald ablaufend</option>
                        <option value="abgelaufen">❌ Abgelaufen</option>
                        <option value="gekündigt">🚫 Gekündigt</option>
                      </select>

                      <select 
                        value={dateFilter} 
                        onChange={(e) => setDateFilter(e.target.value as DateFilter)}
                        className={styles.quickFilter}
                      >
                        <option value="alle">Alle Zeiträume</option>
                        <option value="letzte_7_tage">📅 Letzte 7 Tage</option>
                        <option value="letzte_30_tage">📅 Letzte 30 Tage</option>
                        <option value="letztes_jahr">📅 Letztes Jahr</option>
                      </select>

                      <select 
                        value={sortOrder} 
                        onChange={(e) => setSortOrder(e.target.value as SortOrder)}
                        className={styles.quickFilter}
                      >
                        <option value="neueste">🕐 Neueste zuerst</option>
                        <option value="älteste">🕐 Älteste zuerst</option>
                        <option value="name_az">🔤 Name A-Z</option>
                        <option value="name_za">🔤 Name Z-A</option>
                      </select>
                    </div>

                    {activeFiltersCount() > 0 && (
                      <button 
                        className={styles.clearAllFilters}
                        onClick={clearAllFilters}
                      >
                        <X size={14} />
                        <span>Zurücksetzen</span>
                      </button>
                    )}
                  </div>
                </div>

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
                      <div className={styles.activeFilters}>
                        {statusFilter !== 'alle' && (
                          <span className={styles.activeFilter}>Status: {statusFilter}</span>
                        )}
                        {dateFilter !== 'alle' && (
                          <span className={styles.activeFilter}>Zeitraum: {dateFilter.replace('_', ' ')}</span>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {loading && !refreshing ? (
                  <div className={styles.loadingContainer}>
                    <div className={styles.loadingSpinner}></div>
                    <p>Verträge werden geladen...</p>
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
                    {(!activeFiltersCount() && !searchQuery) && (
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
                  // ✅ RESPONSIVE CONTAINER - Zeigt Tabelle UND Mobile Cards
                  <>
                    {/* ✅ DESKTOP/TABLET TABLE */}
                    <div className={styles.tableContainer}>
                      <table className={styles.contractsTable}>
                        <thead>
                          <tr>
                            <th>Vertragsname</th>
                            <th>Kündigungsfrist</th>
                            <th>Ablaufdatum</th>
                            <th>Status</th>
                            <th>Upload-Datum</th>
                            <th>Aktionen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredContracts.length === 0 ? (
                            <tr>
                              <td colSpan={6} style={{ textAlign: 'center', padding: '60px 20px' }}>
                                <div style={{ color: '#6b7280' }}>
                                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📄</div>
                                  <h3 style={{ margin: '0 0 8px 0', color: '#374151' }}>
                                    {searchQuery ? 'Keine passenden Verträge gefunden' : 'Keine Verträge vorhanden'}
                                  </h3>
                                  <p style={{ margin: '0', fontSize: '14px' }}>
                                    {searchQuery 
                                      ? `Kein Vertrag entspricht "${searchQuery}". Versuche andere Suchbegriffe.`
                                      : 'Lade deinen ersten Vertrag hoch, um loszulegen.'
                                    }
                                  </p>
                                  {!searchQuery && (
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
                          ) : filteredContracts.map((contract) => (
                            <motion.tr 
                              key={contract._id} 
                              className={styles.tableRow}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3 }}
                              onClick={() => handleRowClick(contract)}
                            >
                              <td>
                                <div className={styles.contractName}>
                                  <div className={styles.contractIcon}>
                                    <FileText size={16} />
                                  </div>
                                  <div>
                                    <span className={styles.contractNameText}>{contract.name}</span>
                                    {contract.isGenerated && (
                                      <div className={styles.contractBadges}>
                                        <span className={styles.generatedBadge}>Generiert</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className={styles.contractDetail}>
                                  <Clock size={14} className={styles.detailIcon} />
                                  <span>{contract.kuendigung || "—"}</span>
                                </div>
                              </td>
                              <td>
                                <div className={styles.contractDetail}>
                                  <Calendar size={14} className={styles.detailIcon} />
                                  <span>{formatDate(contract.expiryDate)}</span>
                                </div>
                              </td>
                              <td>
                                <span className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
                                  {contract.status}
                                </span>
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
                                      handleRowClick(contract);
                                    }}
                                    title="Details anzeigen"
                                  >
                                    <Eye size={16} />
                                  </button>
                                  <button 
                                    className={styles.actionButton}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewContractPDFWrapper(contract);
                                    }}
                                    title="PDF anzeigen"
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

                    {/* ✅ MOBILE CARDS - Automatically shown on mobile via CSS */}
                    <div className={styles.mobileCardsContainer}>
                      {filteredContracts.map((contract) => (
                        <MobileContractCard
                          key={`mobile-${contract._id}`}
                          contract={contract}
                        />
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ✅ BUG FIX 1: Erweiterte ContractDetailsView mit openEditModalDirectly Prop */}
          {selectedContract && (
            <ContractDetailsView
              contract={selectedContract}
              onClose={() => {
                setShowDetails(false);
                setOpenEditModalDirectly(false); // ✅ Reset beim Schließen
              }}
              show={showDetails}
              openEditModalDirectly={openEditModalDirectly} // ✅ NEU: Diese Prop wird das Edit-Modal direkt öffnen
              onEdit={(contractId) => {
                console.log("Contract updated:", contractId);
                fetchContracts(); // ✅ Verträge neu laden nach Edit
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
        </motion.div>
      </div>
    </>
  );
}