// 📁 src/pages/Contracts.tsx - KORRIGIERT: 3-Stufen-Preismodell (Free/Business/Premium)
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FileText, RefreshCw, Upload, CheckCircle, AlertCircle, 
  Plus, Calendar, Clock, Trash2, Eye, Edit,
  Search, X, Crown, Users, Loader, PlayCircle,
  Lock, Zap, BarChart3
} from "lucide-react";
import styles from "../styles/Contracts.module.css";
import ContractAnalysis from "../components/ContractAnalysis";
import ContractDetailsView from "../components/ContractDetailsView";
import { apiCall, uploadAndAnalyze } from "../utils/api";

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  expiryDate: string;
  status: string;
  createdAt: string;
  content?: string;
  isGenerated?: boolean;
}

// ✅ KORRIGIERT: Interface für Mehrfach-Upload
// ✅ KORRIGIERT: Spezifische Types statt any
interface AnalysisResult {
  success: boolean;
  contractId?: string;
  message?: string;
  duplicate?: boolean;
  analysisData?: {
    kuendigung?: string;
    laufzeit?: string;
    expiryDate?: string;
    status?: string;
    risiken?: string[];
    optimierungen?: string[];
  };
}

interface UploadFileItem {
  id: string;
  file: File;
  status: 'pending' | 'analyzing' | 'completed' | 'error' | 'duplicate';
  progress: number;
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
  
  // ✅ KORRIGIERT: User-Plan States
  const [userInfo, setUserInfo] = useState<UserInfo>({
    subscriptionPlan: 'free',
    isPremium: false,
    analysisCount: 0,
    analysisLimit: 0
  });
  const [uploadFiles, setUploadFiles] = useState<UploadFileItem[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // ✅ Erweiterte Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('alle');
  const [dateFilter, setDateFilter] = useState<DateFilter>('alle');
  const [sortOrder, setSortOrder] = useState<SortOrder>('neueste');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const fetchContracts = async () => {
    try {
      setLoading(true);
      setRefreshing(true);
      
      const data = await apiCall("/contracts") as Contract[];
      setContracts(data);
      setFilteredContracts(data);
      setError(null);
      
      console.log("✅ Verträge erfolgreich geladen:", data.length);
    } catch (err) {
      console.error("❌ Fehler beim Laden der Verträge:", err);
      setError("Die Verträge konnten nicht geladen werden. Bitte versuche es später erneut.");
      setContracts([]);
      setFilteredContracts([]);
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 600);
    }
  };

  // ✅ FIXED: applyFilters mit useCallback für stabile Referenz
  const applyFilters = useCallback(() => {
    let filtered = [...contracts];

    // Text-Suche
    if (searchQuery.trim()) {
      filtered = filtered.filter(contract => 
        contract.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        contract.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (contract.kuendigung && contract.kuendigung.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Status-Filter
    if (statusFilter !== 'alle') {
      filtered = filtered.filter(contract => {
        const status = contract.status.toLowerCase();
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
          return a.name.localeCompare(b.name);
        case 'name_za':
          return b.name.localeCompare(a.name);
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

  // ✅ KORRIGIERT: Mehrfach-Upload Handler mit Plan-Validierung
  const handleMultipleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

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

    // ✅ KORRIGIERT: Analyse-Limit Check
    if (userInfo.analysisCount >= userInfo.analysisLimit && userInfo.analysisLimit !== Infinity) {
      alert(`📊 Analyse-Limit erreicht (${userInfo.analysisCount}/${userInfo.analysisLimit}).\n\n🚀 Upgrade dein Paket für mehr Analysen!`);
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
    setActiveSection('upload');

    console.log(`✅ ${files.length} Dateien für Upload vorbereitet (${userInfo.subscriptionPlan})`);
  };

  // ✅ NEU: Einzelne Datei aus Upload-Liste entfernen
  const removeUploadFile = (fileId: string) => {
    setUploadFiles(prev => prev.filter(item => item.id !== fileId));
  };

  // ✅ NEU: Alle Upload-Dateien zurücksetzen
  const clearAllUploadFiles = () => {
    setUploadFiles([]);
    setIsAnalyzing(false);
  };

  // ✅ KORRIGIERT: Batch-Analyse mit Limit-Check
  const startBatchAnalysis = async () => {
    if (uploadFiles.length === 0) return;

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
              ? { ...item, status: 'completed', progress: 100, result }
              : item
          ));
          console.log(`✅ Analyse erfolgreich: ${fileItem.file.name}`);
        } 
        // ✅ Duplikat erkannt
        else if (result?.duplicate) {
          setUploadFiles(prev => prev.map(item => 
            item.id === fileItem.id 
              ? { ...item, status: 'duplicate', progress: 100, duplicateInfo: result }
              : item
          ));
          console.log(`🔄 Duplikat erkannt: ${fileItem.file.name}`);
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

  // ✅ NEU: Einzelne Datei retry
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
      setActiveSection('upload');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    clearAllUploadFiles();
    setActiveSection('contracts');
    fetchContracts();
  };

  const handleRowClick = (contract: Contract) => {
    setSelectedContract(contract);
    setShowDetails(true);
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
    status = status.toLowerCase();
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

  // ✅ NEU: Upload-Status Text
  const getUploadStatusText = (item: UploadFileItem) => {
    switch (item.status) {
      case 'pending':
        return 'Wartet auf Analyse...';
      case 'analyzing':
        return `Wird analysiert... ${item.progress}%`;
      case 'completed':
        return 'Analyse abgeschlossen';
      case 'duplicate':
        return 'Bereits vorhanden';
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

  return (
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

          {/* ✅ DEBUG: Temporärer Premium-Status-Check Button */}
          {process.env.NODE_ENV === 'development' && (
            <div style={{ 
              position: 'fixed', 
              top: '10px', 
              right: '10px', 
              background: '#333', 
              color: 'white', 
              padding: '10px', 
              borderRadius: '8px',
              fontSize: '12px',
              zIndex: 9999
            }}>
              <div>Plan: {userInfo.subscriptionPlan}</div>
              <div>Premium: {userInfo.isPremium ? 'Ja' : 'Nein'}</div>
              <div>Analysen: {userInfo.analysisCount}/{userInfo.analysisLimit}</div>
              <button 
                style={{ 
                  marginTop: '5px', 
                  padding: '4px 8px', 
                  fontSize: '11px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  console.log("🔄 Lade User-Info neu...");
                  fetchUserInfo();
                }}
              >
                🔄 User-Info neu laden
              </button>
            </div>
          )}

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

        <AnimatePresence mode="wait">
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
                    onClick={hasAnalysesLeft ? activateFileInput : undefined}
                  >
                    <input 
                      type="file" 
                      onChange={handleMultipleFileChange}
                      className={styles.fileInput}
                      accept=".pdf,.doc,.docx"
                      multiple={canMultiUpload}
                      id="contractFile"
                      ref={fileInputRef}
                      disabled={!hasAnalysesLeft}
                    />
                    
                    {uploadFiles.length > 0 ? (
                      <div className={styles.multiFilePreview}>
                        <div className={styles.multiFileHeader}>
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
                            {!isAnalyzing && uploadFiles.some(f => f.status === 'pending') && hasAnalysesLeft && (
                              <button 
                                className={styles.startAnalysisButton}
                                onClick={startBatchAnalysis}
                              >
                                <PlayCircle size={16} />
                                Analyse starten
                              </button>
                            )}
                            <button 
                              className={styles.clearFilesButton}
                              onClick={clearAllUploadFiles}
                              disabled={isAnalyzing}
                            >
                              <X size={16} />
                              Alle entfernen
                            </button>
                          </div>
                        </div>

                        {/* ✅ NEU: Datei-Liste */}
                        <div className={styles.filesList}>
                          {uploadFiles.map((fileItem) => (
                            <motion.div 
                              key={fileItem.id}
                              className={styles.fileItem}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              layout
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
                                      className={styles.retryButton}
                                      onClick={() => retryFileAnalysis(fileItem.id)}
                                      disabled={isAnalyzing}
                                    >
                                      <RefreshCw size={14} />
                                    </button>
                                  )}
                                  {!isAnalyzing && fileItem.status === 'pending' && (
                                    <button 
                                      className={styles.removeFileButton}
                                      onClick={() => removeUploadFile(fileItem.id)}
                                    >
                                      <X size={14} />
                                    </button>
                                  )}
                                </div>
                              </div>

                              {/* ✅ Progress Bar für analyzing */}
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
                            className={styles.upgradeButton}
                            onClick={() => window.location.href = '/pricing'}
                          >
                            <Crown size={16} />
                            Jetzt upgraden
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ✅ LEGACY: Einzeldatei-Analyse für Kompatibilität */}
                  {selectedFile && uploadFiles.length === 1 && (
                    <div className={styles.analysisContainer}>
                      <ContractAnalysis file={selectedFile} onReset={handleReset} />
                    </div>
                  )}
                </>
              )}
            </motion.div>
          )}

          {/* Contracts Section - Unverändert */}
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

              {/* Filters - Unverändert */}
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

              {/* Results Info */}
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

              {/* Contracts Table */}
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
                      {filteredContracts.map((contract) => (
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
                                  <span className={styles.generatedBadge}>Generiert</span>
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
                                  console.log("Edit contract:", contract._id);
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
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Contract Details Modal */}
        {selectedContract && (
          <ContractDetailsView
            contract={selectedContract}
            onClose={() => setShowDetails(false)}
            show={showDetails}
            onEdit={(contractId) => {
              console.log("Edit contract:", contractId);
            }}
            onDelete={handleDeleteContract}
          />
        )}
      </motion.div>
    </div>
  );
}