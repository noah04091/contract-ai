import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, FileText, Calendar, Clock, AlertCircle, CheckCircle, 
  Info, Eye, Download, Share2, Edit, Trash2, Star,
  BarChart3, Copy, ExternalLink
} from "lucide-react";
import styles from "../styles/ContractDetailsView.module.css";
import ReminderToggle from "./ReminderToggle";
import ContractShareModal from "./ContractShareModal"; // ✅ NEU: Import Share Modal
import ContractEditModal from "./ContractEditModal"; // ✅ NEU: Import Edit Modal
import AnalysisModal from "./AnalysisModal"; // ✅ NEU: Import Analysis Modal
// ✅ getContractFileUrl nicht mehr benötigt - Mobile-freundliche PDF-Logik verwendet direkte API-Aufrufe

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  laufzeit?: string;
  expiryDate?: string;
  status: string;
  reminder?: boolean;
  createdAt: string;
  content?: string;
  isGenerated?: boolean;
  notes?: string; // ✅ NEU: Für eigene Notizen
  // Erweiterte Felder für Analyse-Daten
  fullText?: string;
  extractedText?: string;
  fileUrl?: string;
  filePath?: string;
  filename?: string;
  originalname?: string;
  s3Key?: string;
  s3Bucket?: string;
  s3Location?: string;
  uploadType?: string; // ✅ NEU: Für S3 Migration
  needsReupload?: boolean; // ✅ NEU: Für Legacy-Verträge
  // ✅ BUG FIX 2: Beide Analyse-Strukturen unterstützen
  analysis?: {
    summary?: string;
    legalAssessment?: string;
    suggestions?: string;
    comparison?: string;
    contractScore?: number;
    analysisId?: string;
    lastAnalyzed?: string;
  };
  legalPulse?: { // ✅ ALT: Für alte Verträge
    riskScore: number | null;
    summary?: string;
    riskFactors?: string[];
    legalRisks?: string[];
    recommendations?: string[];
    analysisDate?: string;
  };
}

// ✅ BUG FIX 1: Interface erweitert um openEditModalDirectly Prop
interface ContractDetailsViewProps {
  contract: Contract;
  onClose: () => void;
  show: boolean;
  openEditModalDirectly?: boolean; // ✅ NEU: Öffnet Edit-Modal direkt
  onEdit?: (contractId: string) => void;
  onDelete?: (contractId: string, contractName: string) => void;
}

export default function ContractDetailsView({
  contract: initialContract,
  onClose,
  show,
  openEditModalDirectly = false, // ✅ BUG FIX 1: Neue Prop mit Default-Wert
  onEdit,
  onDelete
}: ContractDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'analysis'>('overview');

  // ✅ NEU: State für die drei Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false); // ✅ NEU: Analysis Modal State
  const [contract, setContract] = useState<Contract>(initialContract); // ✅ NEU: Lokaler Contract State für Updates
  const [isAnalyzing, setIsAnalyzing] = useState(false); // ✅ NEU: Loading State für Analyse
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false); // ✅ NEU: Für Collapsing Header auf Mobile

  // ✅ NEU: Update contract wenn sich initialContract ändert
  useEffect(() => {
    setContract(initialContract);
  }, [initialContract]);

  // ✅ BUG FIX 1: Edit-Modal automatisch öffnen wenn openEditModalDirectly=true
  useEffect(() => {
    if (show && openEditModalDirectly) {
      console.log('🚀 Auto-opening edit modal due to openEditModalDirectly=true');
      setShowEditModal(true);
    }
  }, [show, openEditModalDirectly]);

  // ✅ Escape-Key-Handler für Accessibility (nur wenn keine Sub-Modals offen sind)
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        // Prüfe ob Sub-Modals offen sind - diese haben Priorität
        if (!showShareModal && !showEditModal && !showAnalysisModal) {
          onClose();
        }
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscapeKey);
    }

    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, [show, onClose, showShareModal, showEditModal, showAnalysisModal]);

  // ✅ NEU: Scroll-Handler für Collapsing Header (nur auf Mobile im Content-Tab)
  useEffect(() => {
    const handleScroll = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target && activeTab === 'content') {
        // Collapse header wenn mehr als 50px gescrollt wurde
        setIsHeaderCollapsed(target.scrollTop > 50);
      }
    };

    const contentElement = document.querySelector(`.${styles.content}`);
    if (contentElement && activeTab === 'content') {
      contentElement.addEventListener('scroll', handleScroll);
      return () => contentElement.removeEventListener('scroll', handleScroll);
    }
  }, [activeTab]);

  // ✅ Reset collapsed state when tab changes
  useEffect(() => {
    if (activeTab !== 'content') {
      setIsHeaderCollapsed(false);
    }
  }, [activeTab]);

  // ✅ PERFORMANCE: Memoized formatDate function
  const formatDate = useMemo(() => {
    return (dateString: string): string => {
      if (!dateString) return "Unbekannt";
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        });
      } catch {
        return dateString;
      }
    };
  }, []); // ✅ No dependencies - pure function

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "aktiv" || statusLower === "gültig") {
      return <CheckCircle size={16} className={styles.statusIconActive} />;
    } else if (statusLower === "läuft ab" || statusLower === "bald fällig") {
      return <AlertCircle size={16} className={styles.statusIconWarning} />;
    } else {
      return <Info size={16} className={styles.statusIconNeutral} />;
    }
  };

  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower === "aktiv" || statusLower === "gültig") {
      return styles.statusActive;
    } else if (statusLower === "läuft ab" || statusLower === "bald fällig") {
      return styles.statusWarning;
    } else if (statusLower === "gekündigt" || statusLower === "beendet") {
      return styles.statusCancelled;
    } else {
      return styles.statusNeutral;
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "#34c759";
    if (score >= 60) return "#ff9500";
    if (score >= 40) return "#ff6b35";
    return "#ff3b30";
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return "Ausgezeichnet";
    if (score >= 60) return "Gut";
    if (score >= 40) return "Akzeptabel";
    return "Kritisch";
  };

  // ✅ MOBILE-FIX: Neue Mobile-freundliche PDF-Öffnung
  const handleViewContract = useCallback(async () => {
    console.log('🔍 Opening contract with mobile-friendly approach:', {
      contractId: contract._id,
      contractName: contract.name,
      hasS3Key: !!contract.s3Key,
      uploadType: contract.uploadType,
      needsReupload: contract.needsReupload
    });

    // ✅ MOBILE-FIX: Temporäres Tab sofort öffnen (Popup-Blocker umgehen)
    let tempWindow: Window | null = null;

    try {
      const token = localStorage.getItem('token');

      // ✅ Legacy-Vertrag Check (vor Tab-Öffnung)
      if (contract.needsReupload || contract.uploadType === 'LOCAL_LEGACY') {
        alert(`⚠️ Dieser Vertrag wurde vor der Cloud-Integration hochgeladen und ist nicht mehr verfügbar.\n\nBitte laden Sie "${contract.name}" erneut hoch, um ihn anzuzeigen.`);
        return;
      }

      // ✅ CRITICAL: Tab sofort öffnen (noch im User-Click-Context)
      tempWindow = window.open('', '_blank');
      if (tempWindow) {
        tempWindow.document.write(`
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes">
              <meta name="mobile-web-app-capable" content="yes">
              <meta name="apple-mobile-web-app-capable" content="yes">
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
                <p>Bitte warten Sie einen Moment.</p>
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
        alert(`⚠️ Dieser Vertrag wurde vor der Cloud-Integration hochgeladen und ist nicht mehr verfügbar.\n\nBitte laden Sie "${contract.name}" erneut hoch, um ihn anzuzeigen.`);
        return;
      } else {
        throw new Error(data.error || 'Failed to get signed URL');
      }

    } catch (error) {
      console.error('❌ Error in mobile-friendly PDF view:', error);
      
      // ✅ Tab schließen bei Fehler
      if (tempWindow && !tempWindow.closed) {
        tempWindow.document.write(`
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
              <meta name="mobile-web-app-capable" content="yes">
              <meta name="apple-mobile-web-app-capable" content="yes">
              <title>Fehler</title>
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
                <h2 class="error">❌ Fehler beim Laden</h2>
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
        : 'Die PDF-Datei konnte nicht geladen werden.';
      
      alert(`❌ Fehler beim Öffnen des Vertrags:\n\n${errorMessage}`);
    }
  }, [contract._id, contract.name, contract.s3Key, contract.uploadType, contract.needsReupload]); // ✅ PERFORMANCE: Dependencies für useCallback

  // ✅ NEU: Share-Handler
  const handleShare = () => {
    console.log('🔗 Opening share modal for contract:', contract._id);
    setShowShareModal(true);
  };

  // ✅ NEU: Edit-Handler
  const handleEdit = () => {
    console.log('✏️ Opening edit modal for contract:', contract._id);
    setShowEditModal(true);
  };

  // ✅ NEU: Update-Handler für Edit-Modal
  const handleContractUpdate = (updatedContract: Contract) => {
    console.log('✅ Contract updated:', updatedContract);
    setContract(updatedContract);
    
    // Optional: Auch Parent Component über Update informieren
    if (onEdit) {
      onEdit(updatedContract._id);
    }
  };

  const handleDelete = () => {
    if (onDelete) onDelete(contract._id, contract.name);
  };

  const handleDownloadContent = () => {
    const content = contract.fullText || contract.content || '';
    if (!content) return;
    
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${contract.name.replace(/\.[^/.]+$/, "")}_content.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  // ✅ BUG FIX 2: Neue Analyse starten Handler (nur wenn keine Analyse vorhanden)
  const handleStartNewAnalysis = async () => {
    if (isAnalyzing) return; // Prevent double-clicks
    
    console.log('🚀 Starting new analysis for contract:', contract._id);
    setIsAnalyzing(true);
    
    try {
      const token = localStorage.getItem('token');
      
      // API-Aufruf zum Starten einer neuen Analyse
      const response = await fetch(`/api/contracts/${contract._id}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Analysis started successfully:', result);
        
        // Contract-Daten aktualisieren
        if (result.analysis) {
          setContract(prev => ({
            ...prev,
            analysis: result.analysis,
            lastAnalyzed: new Date().toISOString() // ✅ VERBESSERUNG: Timestamp hinzufügen
          }));
        }
        
        // Parent-Component über Update informieren
        if (onEdit) {
          onEdit(contract._id);
        }
      } else {
        const error = await response.json();
        console.error('❌ Analysis failed:', error);
        alert(`Analyse fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      console.error('❌ Error starting analysis:', error);
      alert('Fehler beim Starten der Analyse. Bitte versuche es erneut.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div 
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div 
          className={styles.drawer}
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`${styles.header} ${isHeaderCollapsed ? styles.headerCollapsed : ''}`}>
            <div className={styles.headerTop}>
              <div className={styles.contractInfo}>
                <div className={styles.contractIcon}>
                  <FileText size={20} />
                </div>
                <div>
                  <h2 className={styles.contractName}>{contract.name}</h2>
                  <div className={styles.contractMeta}>
                    <span className={styles.uploadDate}>
                      Hochgeladen am {formatDate(contract.createdAt)}
                    </span>
                    {contract.isGenerated && (
                      <span className={styles.generatedBadge}>
                        <Star size={12} />
                        KI-Generiert
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.headerActions}>
                {/* ✅ UPDATED: Share Button mit Funktionalität */}
                <button 
                  className={styles.actionBtn}
                  onClick={handleShare}
                  title="Teilen"
                >
                  <Share2 size={18} />
                </button>
                
                {/* ✅ UPDATED: Edit Button mit Funktionalität */}
                <button 
                  className={styles.actionBtn}
                  onClick={handleEdit}
                  title="Bearbeiten"
                >
                  <Edit size={18} />
                </button>
                
                <button 
                  className={`${styles.actionBtn} ${styles.deleteBtn}`}
                  onClick={handleDelete}
                  title="Löschen"
                >
                  <Trash2 size={18} />
                </button>
                <button 
                  className={styles.closeBtn}
                  onClick={onClose}
                  title="Schließen"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Status Bar */}
            <div className={styles.statusBar}>
              <div className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
                {getStatusIcon(contract.status)}
                <span>{contract.status}</span>
              </div>
              
              <div className={styles.quickStats}>
                {contract.kuendigung && (
                  <div className={styles.quickStat}>
                    <Clock size={14} />
                    <span>Kündigung: {contract.kuendigung}</span>
                  </div>
                )}
                {contract.expiryDate && (
                  <div className={styles.quickStat}>
                    <Calendar size={14} />
                    <span>Läuft ab: {formatDate(contract.expiryDate)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tab Navigation */}
            <div className={styles.tabNav}>
              <button 
                className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <Info size={16} />
                <span>Übersicht</span>
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'content' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('content')}
              >
                <Eye size={16} />
                <span>Inhalt</span>
              </button>
              <button 
                className={`${styles.tab} ${activeTab === 'analysis' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('analysis')}
              >
                <BarChart3 size={16} />
                <span>Analyse</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className={styles.content}>
            {activeTab === 'overview' && (
              <motion.div 
                className={styles.overviewTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <FileText size={18} />
                    Vertragsdetails
                  </h3>
                  <div className={styles.detailGrid}>
                    <div className={styles.detailItem}>
                      <label>Vertragsname</label>
                      <span>{contract.name || "Unbekannt"}</span>
                    </div>
                    <div className={styles.detailItem}>
                      <label>Status</label>
                      <div className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
                        {getStatusIcon(contract.status)}
                        <span>{contract.status}</span>
                      </div>
                    </div>
                    <div className={styles.detailItem}>
                      <label>Kündigungsfrist</label>
                      <span>{contract.kuendigung || "Nicht angegeben"}</span>
                    </div>
                    {contract.laufzeit && (
                      <div className={styles.detailItem}>
                        <label>Laufzeit</label>
                        <span>{contract.laufzeit}</span>
                      </div>
                    )}
                    {contract.expiryDate && (
                      <div className={styles.detailItem}>
                        <label>Ablaufdatum</label>
                        <span>{formatDate(contract.expiryDate)}</span>
                      </div>
                    )}
                    <div className={styles.detailItem}>
                      <label>Hochgeladen am</label>
                      <span>{formatDate(contract.createdAt)}</span>
                    </div>
                    
                    {/* ✅ NEU: Eigene Notizen anzeigen falls vorhanden */}
                    {contract.notes && (
                      <div className={styles.detailItem}>
                        <label>Eigene Notizen</label>
                        <span>{contract.notes}</span>
                      </div>
                    )}
                  </div>
                  
                  {/* ✅ MOBILE-FIX: Contract View Button mit Mobile-freundlicher Logik */}
                  <div className={styles.viewContractSection}>
                    {contract.needsReupload || contract.uploadType === 'LOCAL_LEGACY' ? (
                      <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <button 
                          className={styles.viewContractButton}
                          style={{ 
                            background: 'rgba(255, 149, 0, 0.1)', 
                            border: '1px solid rgba(255, 149, 0, 0.3)',
                            color: '#ff9500',
                            cursor: 'pointer'
                          }}
                          onClick={handleViewContract}
                          title="Legacy-Vertrag - Informationen anzeigen"
                        >
                          ⚠️ Legacy-Vertrag (Info anzeigen)
                        </button>
                        <p style={{ 
                          fontSize: '0.875rem', 
                          color: '#ff9500', 
                          marginTop: '0.5rem',
                          fontStyle: 'italic'
                        }}>
                          Dieser Vertrag wurde vor der Cloud-Integration hochgeladen und muss für die Anzeige erneut hochgeladen werden.
                        </p>
                      </div>
                    ) : (
                      <button 
                        onClick={handleViewContract}
                        className={styles.viewContractButton}
                        title="Original-Vertragsdatei anzeigen"
                      >
                        📄 Vertrag anzeigen
                      </button>
                    )}
                  </div>
                </div>

                <div className={styles.section}>
                  <h3 className={styles.sectionTitle}>
                    <AlertCircle size={18} />
                    Einstellungen
                  </h3>
                  <div className={styles.settingsGrid}>
                    <ReminderToggle
                      contractId={contract._id}
                      initialValue={contract.reminder || false}
                    />
                  </div>
                </div>

                {contract.isGenerated && (
                  <div className={styles.section}>
                    <div className={styles.aiNotice}>
                      <Star size={20} />
                      <div>
                        <h4>KI-Generierter Vertrag</h4>
                        <p>Dieser Vertrag wurde von unserer KI erstellt. Bitte prüfe alle Details vor der Verwendung.</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Content Tab - unverändert */}
            {activeTab === 'content' && (
              <motion.div 
                className={styles.contentTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {(() => {
                  console.log('🔍 Content Tab Debug:', {
                    contractName: contract.name,
                    hasFullText: !!contract.fullText,
                    hasContent: !!contract.content,
                    fullTextLength: contract.fullText ? contract.fullText.length : 0,
                    contentLength: contract.content ? contract.content.length : 0,
                    contractKeys: Object.keys(contract)
                  });
                  return null;
                })()}
                
                {(() => {
                  const textContent = contract.fullText || contract.content || contract.extractedText || '';
                  
                  if (textContent && textContent.trim().length > 0) {
                    return (
                      <div className={styles.contentViewer}>
                        <div className={styles.contentHeader}>
                          <h3>Vertragsinhalt</h3>
                          <div className={styles.contentSourceInfo}>
                            <span className={styles.sourceLabel}>
                              Quelle: {contract.fullText ? 'Volltext-Analyse' : 
                                      contract.content ? 'Contract Content' : 
                                      contract.extractedText ? 'Extrahierter Text' : 'Unbekannt'}
                            </span>
                          </div>
                          <button 
                            className={styles.downloadBtn}
                            onClick={handleDownloadContent}
                          >
                            <Download size={16} />
                            <span>Als TXT herunterladen</span>
                          </button>
                        </div>
                        
                        <div className={styles.contentText}>
                          {textContent}
                        </div>
                        
                        <div className={styles.contentStats}>
                          <div className={styles.contentStat}>
                            <span className={styles.statLabel}>Zeichen:</span>
                            <span className={styles.statValue}>
                              {textContent.length.toLocaleString()}
                            </span>
                          </div>
                          <div className={styles.contentStat}>
                            <span className={styles.statLabel}>Wörter:</span>
                            <span className={styles.statValue}>
                              {textContent.split(/\s+/).filter((w: string) => w.length > 0).length.toLocaleString()}
                            </span>
                          </div>
                          <div className={styles.contentStat}>
                            <span className={styles.statLabel}>Absätze:</span>
                            <span className={styles.statValue}>
                              {textContent.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0).length.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className={styles.noContent}>
                        <FileText size={48} />
                        <h3>Kein Textinhalt verfügbar</h3>
                        <p>Der Vertragstext konnte nicht extrahiert werden oder ist nicht verfügbar. Möglicherweise handelt es sich um eine bildbasierte PDF oder ein anderes Format.</p>
                        
                        <div className={styles.debugInfo}>
                          <details>
                            <summary>Debug-Informationen</summary>
                            <pre style={{ fontSize: '0.8rem', textAlign: 'left', background: '#f5f5f5', padding: '1rem', borderRadius: '8px', marginTop: '1rem' }}>
                              {JSON.stringify({
                                contractId: contract._id,
                                contractName: contract.name,
                                hasFullText: !!contract.fullText,
                                hasContent: !!contract.content,
                                hasExtractedText: !!contract.extractedText,
                                hasAnalysis: !!contract.analysis,
                                availableKeys: Object.keys(contract).filter(key => key.includes('text') || key.includes('content') || key === 'analysis')
                              }, null, 2)}
                            </pre>
                          </details>
                        </div>
                        
                        <div className={styles.noContentActions}>
                          <button 
                            className={styles.retryBtn}
                            onClick={() => {
                              console.log('🔄 Retry text extraction for contract:', {
                                id: contract._id,
                                name: contract.name,
                                availableFields: Object.keys(contract)
                              });
                              alert('Text-Extraktion wird erneut versucht...');
                            }}
                          >
                            <ExternalLink size={16} />
                            <span>Textextraktion wiederholen</span>
                          </button>
                        </div>
                      </div>
                    );
                  }
                })()}
              </motion.div>
            )}

            {/* ✅ REVOLUTIONÄR: Analysis Tab - Nur Score + Button für Vollbild-Modal */}
            {activeTab === 'analysis' && (
              <motion.div 
                className={styles.analysisTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {(() => {
                  console.log('🔍 Analysis Tab Debug:', {
                    contractName: contract.name,
                    hasAnalysis: !!contract.analysis,
                    hasLegalPulse: !!contract.legalPulse,
                    analysisKeys: contract.analysis ? Object.keys(contract.analysis) : [],
                    legalPulseKeys: contract.legalPulse ? Object.keys(contract.legalPulse) : [],
                    analysisData: contract.analysis,
                    legalPulseData: contract.legalPulse
                  });
                  return null;
                })()}

                {/* ✅ EINFACH: Prüfe ob irgendeine Analyse vorhanden ist */}
                {(contract.analysis || contract.legalPulse) ? (
                  <div className={styles.analysisPreview}>
                    <div className={styles.previewHeader}>
                      <div className={styles.previewIcon}>
                        <BarChart3 size={24} />
                      </div>
                      <div className={styles.previewInfo}>
                        <h3>
                          {contract.analysis ? '🤖 KI-Vertragsanalyse verfügbar' : '🧠 Legal Pulse Analyse verfügbar'}
                        </h3>
                        <p>Vollständige Analyse in separatem Fenster anzeigen</p>
                      </div>
                    </div>

                    {/* Score Preview */}
                    {(() => {
                      const score = contract.analysis?.contractScore || contract.legalPulse?.riskScore;
                      if (score !== null && score !== undefined) {
                        return (
                          <div className={styles.scorePreview}>
                            <div 
                              className={styles.scoreCircleSmall}
                              style={{ '--score-color': getScoreColor(score) } as React.CSSProperties}
                            >
                              <span className={styles.scoreNumberSmall}>{score}</span>
                              <span className={styles.scoreMaxSmall}>/100</span>
                            </div>
                            <div className={styles.scoreInfoSmall}>
                              <h4 style={{ color: getScoreColor(score) }}>
                                {getScoreLabel(score)}
                              </h4>
                              <p>{contract.analysis ? 'Contract Score' : 'Legal Pulse Score'}</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* Main Action Button */}
                    <div className={styles.previewActions}>
                      <button 
                        className={styles.viewAnalysisButton}
                        onClick={() => setShowAnalysisModal(true)}
                      >
                        <BarChart3 size={18} />
                        <span>Vollständige Analyse anzeigen</span>
                      </button>
                      
                      <button 
                        className={styles.copyAnalysisButton}
                        onClick={() => {
                          // Quick copy ohne Modal zu öffnen
                          let analysisText = '';
                          
                          if (contract.analysis) {
                            analysisText = `Vertragsanalyse: ${contract.name}\nScore: ${contract.analysis.contractScore || 'N/A'}/100\n\nZusammenfassung: ${contract.analysis.summary || 'Nicht verfügbar'}`;
                          } else if (contract.legalPulse) {
                            analysisText = `Legal Pulse: ${contract.name}\nScore: ${contract.legalPulse.riskScore || 'N/A'}/100\n\nZusammenfassung: ${contract.legalPulse.summary || 'Nicht verfügbar'}`;
                          }
                          
                          navigator.clipboard.writeText(analysisText).then(() => {
                            // Kurzes Feedback
                            const button = document.activeElement as HTMLButtonElement;
                            const originalText = button.textContent;
                            button.textContent = 'Kopiert!';
                            setTimeout(() => {
                              button.textContent = originalText;
                            }, 1500);
                          });
                        }}
                        title="Schnell-Kopie der Analyse"
                      >
                        <Copy size={16} />
                        <span>Kopieren</span>
                      </button>
                    </div>

                    {/* Analysis Info */}
                    <div className={styles.analysisInfo}>
                      <div className={styles.analysisInfoItem}>
                        <Clock size={14} />
                        <span>
                          Letzte Analyse: {
                            contract.analysis?.lastAnalyzed
                              ? formatDate(contract.analysis.lastAnalyzed)
                              : contract.legalPulse?.analysisDate
                              ? formatDate(contract.legalPulse.analysisDate)
                              : 'Unbekannt'
                          }
                        </span>
                      </div>
                      
                      {contract.analysis?.analysisId && (
                        <div className={styles.analysisInfoItem}>
                          <FileText size={14} />
                          <span>ID: {contract.analysis.analysisId}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  /* Keine Analyse vorhanden */
                  <div className={styles.noAnalysis}>
                    <BarChart3 size={48} />
                    <h3>Keine Analyse verfügbar</h3>
                    <p>Für diesen Vertrag wurde noch keine KI-Analyse durchgeführt oder die Analyse-Daten sind nicht verfügbar.</p>
                    
                    <div className={styles.noAnalysisActions}>
                      <button 
                        className={styles.analyzeBtn}
                        onClick={handleStartNewAnalysis}
                        disabled={isAnalyzing}
                        style={{ opacity: isAnalyzing ? 0.7 : 1, cursor: isAnalyzing ? 'not-allowed' : 'pointer' }}
                      >
                        <BarChart3 size={16} />
                        <span>{isAnalyzing ? 'Analysiere...' : 'Jetzt analysieren'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* ✅ NEU: Analysis Modal - Vollbild-Analyse */}
        <AnalysisModal
          contract={contract}
          show={showAnalysisModal}
          onClose={() => setShowAnalysisModal(false)}
        />

        {/* ✅ NEU: Share Modal */}
        <ContractShareModal
          contract={{ _id: contract._id, name: contract.name }}
          show={showShareModal}
          onClose={() => setShowShareModal(false)}
        />

        {/* ✅ NEU: Edit Modal */}
        <ContractEditModal
          contract={contract}
          show={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdate={handleContractUpdate}
        />
      </motion.div>
    </AnimatePresence>
  );
}