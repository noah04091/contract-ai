import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, FileText, Calendar, Clock, AlertCircle, CheckCircle,
  Info, Eye, Download, Share2, Edit, Trash2, Star,
  BarChart3, Copy, ExternalLink, PenTool, ChevronDown, ChevronUp,
  ArrowLeft, MoreVertical, Shield, Lightbulb, Scale,
  ZoomIn, ZoomOut, Maximize2
} from "lucide-react";
import styles from "../styles/ContractDetailsView.module.css";
import SmartContractInfo from "./SmartContractInfo";
import ContractShareModal from "./ContractShareModal";
import ContractEditModal from "./ContractEditModal";
import AnalysisModal from "./AnalysisModal";
import SignatureModal from "./SignatureModal";

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
  notes?: string;
  fullText?: string;
  extractedText?: string;
  fileUrl?: string;
  filePath?: string;
  filename?: string;
  originalname?: string;
  s3Key?: string;
  s3Bucket?: string;
  s3Location?: string;
  uploadType?: string;
  needsReupload?: boolean;
  analysis?: {
    summary?: string;
    legalAssessment?: string;
    suggestions?: string;
    comparison?: string;
    contractScore?: number;
    analysisId?: string;
    lastAnalyzed?: string;
    detailedLegalOpinion?: string;
  };
  legalPulse?: {
    riskScore: number | null;
    summary?: string;
    riskFactors?: string[];
    legalRisks?: string[];
    recommendations?: string[];
    analysisDate?: string;
  };
  signatureStatus?: string;
  signatureEnvelopeId?: string;
  envelope?: {
    _id: string;
    signatureStatus: string;
    signersTotal?: number;
    signersSigned?: number;
    s3KeySealed?: string | null;
    completedAt?: string | null;
  };
  // Smart Contract Info fields
  monthlyCost?: number;
  totalCost?: number;
  savingsPotential?: number;
}

interface ContractDetailsViewProps {
  contract: Contract;
  onClose: () => void;
  show: boolean;
  openEditModalDirectly?: boolean;
  onEdit?: (contractId: string) => void;
  onDelete?: (contractId: string, contractName: string) => void;
  onOpenSignatureDetails?: (envelopeId: string) => void;
}

export default function ContractDetailsView({
  contract: initialContract,
  onClose,
  show,
  openEditModalDirectly = false,
  onEdit,
  onDelete,
  onOpenSignatureDetails
}: ContractDetailsViewProps) {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Tab state - Mobile uses new 3-tab system
  const [activeTab, setActiveTab] = useState<'overview' | 'document' | 'insights'>('overview');

  // Modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [contract, setContract] = useState<Contract>(initialContract);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Mobile-specific states
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [expandedInsightSection, setExpandedInsightSection] = useState<string | null>('summary');

  // PDF Viewer states (Mobile inline viewer)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfZoom, setPdfZoom] = useState(100);

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Update contract when initialContract changes
  useEffect(() => {
    setContract(initialContract);
  }, [initialContract]);

  // Mobile: Body-Scroll blockieren
  useEffect(() => {
    if (show && isMobile) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
      document.body.style.height = '100%';
      document.body.style.top = '0';

      return () => {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
        document.body.style.height = '';
        document.body.style.top = '';
      };
    }
  }, [show, isMobile]);

  // Auto-open edit modal if requested
  useEffect(() => {
    if (show && openEditModalDirectly) {
      setShowEditModal(true);
    }
  }, [show, openEditModalDirectly]);

  // Escape key handler
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && show) {
        if (showMobileMenu) {
          setShowMobileMenu(false);
        } else if (!showShareModal && !showEditModal && !showAnalysisModal && !showSignatureModal) {
          onClose();
        }
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscapeKey);
    }
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, [show, onClose, showShareModal, showEditModal, showAnalysisModal, showSignatureModal, showMobileMenu]);

  // Load PDF URL when document tab is active (Mobile)
  useEffect(() => {
    if (isMobile && activeTab === 'document' && !pdfUrl && !pdfLoading && !pdfError) {
      loadPdfUrl();
    }
  }, [isMobile, activeTab, pdfUrl, pdfLoading, pdfError]);

  const loadPdfUrl = async () => {
    if (contract.needsReupload || contract.uploadType === 'LOCAL_LEGACY') {
      setPdfError('Dieser Vertrag wurde vor der Cloud-Integration hochgeladen und muss erneut hochgeladen werden.');
      return;
    }

    setPdfLoading(true);
    setPdfError(null);

    try {
      const token = localStorage.getItem('token');
      let response;

      if (contract.s3Key) {
        response = await fetch(`/api/s3/view?key=${encodeURIComponent(contract.s3Key)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        response = await fetch(`/api/s3/view?contractId=${contract._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      const data = await response.json();

      if (response.ok && (data.url || data.fileUrl)) {
        setPdfUrl(data.url || data.fileUrl);
      } else {
        setPdfError(data.error || 'PDF konnte nicht geladen werden');
      }
    } catch (error) {
      setPdfError('Fehler beim Laden der PDF-Datei');
    } finally {
      setPdfLoading(false);
    }
  };

  // Format date helper
  const formatDate = useMemo(() => {
    return (dateString: string): string => {
      if (!dateString) return "Unbekannt";
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString("de-DE", {
          day: "2-digit",
          month: "long",
          year: "numeric"
        });
      } catch {
        return dateString;
      }
    };
  }, []);

  const formatDateShort = (dateString: string): string => {
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

  const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "aktiv" || statusLower === "gültig") {
      return <CheckCircle size={16} className={styles.statusIconActive} />;
    } else if (statusLower === "läuft ab" || statusLower === "bald fällig") {
      return <AlertCircle size={16} className={styles.statusIconWarning} />;
    }
    return <Info size={16} className={styles.statusIconNeutral} />;
  };

  const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower === "aktiv" || statusLower === "gültig") return styles.statusActive;
    if (statusLower === "läuft ab" || statusLower === "bald fällig") return styles.statusWarning;
    if (statusLower === "gekündigt" || statusLower === "beendet") return styles.statusCancelled;
    return styles.statusNeutral;
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

  const getRiskLevel = (score: number): { label: string; color: string } => {
    if (score >= 80) return { label: "Niedriges Risiko", color: "#34c759" };
    if (score >= 60) return { label: "Moderates Risiko", color: "#ff9500" };
    if (score >= 40) return { label: "Erhöhtes Risiko", color: "#ff6b35" };
    return { label: "Hohes Risiko", color: "#ff3b30" };
  };

  // Desktop PDF view (new tab)
  const handleViewContract = useCallback(async () => {
    if (contract.needsReupload || contract.uploadType === 'LOCAL_LEGACY') {
      alert(`Dieser Vertrag wurde vor der Cloud-Integration hochgeladen und ist nicht mehr verfügbar.\n\nBitte laden Sie "${contract.name}" erneut hoch.`);
      return;
    }

    let tempWindow: Window | null = null;

    try {
      const token = localStorage.getItem('token');
      tempWindow = window.open('', '_blank');

      if (tempWindow) {
        tempWindow.document.write(`
          <html>
            <head>
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Lade ${contract.name}...</title>
              <style>
                body { font-family: -apple-system, system-ui, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f7; }
                .spinner { width: 40px; height: 40px; border: 3px solid #e5e5e5; border-top: 3px solid #007aff; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
              </style>
            </head>
            <body><div><div class="spinner"></div><h2>PDF wird geladen...</h2></div></body>
          </html>
        `);
      }

      let response;
      if (contract.s3Key) {
        response = await fetch(`/api/s3/view?key=${encodeURIComponent(contract.s3Key)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } else {
        response = await fetch(`/api/s3/view?contractId=${contract._id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }

      const data = await response.json();

      if (response.ok && (data.url || data.fileUrl)) {
        if (tempWindow && !tempWindow.closed) {
          tempWindow.location.href = data.url || data.fileUrl;
        }
      } else {
        throw new Error(data.error || 'PDF konnte nicht geladen werden');
      }
    } catch (error) {
      if (tempWindow && !tempWindow.closed) {
        tempWindow.close();
      }
      alert(`Fehler beim Öffnen des Vertrags: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }, [contract]);

  // Action handlers
  const handleShare = () => {
    setShowMobileMenu(false);
    setShowShareModal(true);
  };

  const handleEdit = () => {
    setShowMobileMenu(false);
    setShowEditModal(true);
  };

  const handleSendToSignature = () => {
    setShowMobileMenu(false);
    setShowSignatureModal(true);
  };

  const handleDelete = () => {
    setShowMobileMenu(false);
    if (onDelete) onDelete(contract._id, contract.name);
  };

  const handleContractUpdate = (updatedContract: Contract) => {
    setContract(updatedContract);
    if (onEdit) onEdit(updatedContract._id);
  };

  const handlePaymentUpdate = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      if (!token) return;

      const response = await fetch(`/api/contracts/${contract._id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const updatedContract = await response.json();
        setContract(updatedContract);
        if (onEdit) onEdit(updatedContract._id);
      }
    } catch (error) {
      console.error('Error reloading contract:', error);
    }
  };

  const handleStartNewAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts/${contract._id}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        if (result.analysis) {
          setContract(prev => ({
            ...prev,
            analysis: result.analysis,
            lastAnalyzed: new Date().toISOString()
          }));
        }
        if (onEdit) onEdit(contract._id);
      } else {
        const error = await response.json();
        alert(`Analyse fehlgeschlagen: ${error.message || 'Unbekannter Fehler'}`);
      }
    } catch (error) {
      alert('Fehler beim Starten der Analyse. Bitte versuche es erneut.');
    } finally {
      setIsAnalyzing(false);
    }
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

  // Toggle accordion section
  const toggleInsightSection = (section: string) => {
    setExpandedInsightSection(prev => prev === section ? null : section);
  };

  if (!show) return null;

  const score = contract.analysis?.contractScore || contract.legalPulse?.riskScore;
  const hasAnalysis = !!(contract.analysis || contract.legalPulse);

  // ============================================
  // MOBILE LAYOUT - Completely redesigned
  // ============================================
  if (isMobile) {
    return (
      <AnimatePresence>
        <motion.div
          className={styles.mobileOverlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className={styles.mobileContainer}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
          >
            {/* MOBILE HEADER - App Bar Style */}
            <div className={styles.mobileHeader}>
              <button
                className={styles.mobileBackBtn}
                onClick={onClose}
                aria-label="Zurück"
              >
                <ArrowLeft size={24} />
              </button>

              <div className={styles.mobileHeaderTitle}>
                <h1>{contract.name}</h1>
                {contract.isGenerated && (
                  <span className={styles.mobileGeneratedBadge}>
                    <Star size={10} /> KI
                  </span>
                )}
              </div>

              <button
                className={styles.mobileMenuBtn}
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                aria-label="Menü"
              >
                <MoreVertical size={24} />
              </button>

              {/* Mobile Dropdown Menu */}
              <AnimatePresence>
                {showMobileMenu && (
                  <>
                    <motion.div
                      className={styles.mobileMenuBackdrop}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowMobileMenu(false)}
                    />
                    <motion.div
                      className={styles.mobileMenuDropdown}
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                    >
                      <button onClick={handleShare}>
                        <Share2 size={18} /> Teilen
                      </button>
                      <button onClick={handleEdit}>
                        <Edit size={18} /> Bearbeiten
                      </button>
                      {contract.s3Key && !contract.needsReupload && !contract.envelope && (
                        <button onClick={handleSendToSignature}>
                          <PenTool size={18} /> Zur Signatur
                        </button>
                      )}
                      {(contract.envelope || contract.signatureEnvelopeId) && onOpenSignatureDetails && (
                        <button onClick={() => {
                          setShowMobileMenu(false);
                          const envelopeId = contract.envelope?._id || contract.signatureEnvelopeId;
                          if (envelopeId) onOpenSignatureDetails(envelopeId);
                        }}>
                          <FileText size={18} /> Signaturdetails
                        </button>
                      )}
                      <button onClick={handleDownloadContent} disabled={!contract.fullText && !contract.content}>
                        <Download size={18} /> Text exportieren
                      </button>
                      <button className={styles.mobileMenuDeleteBtn} onClick={handleDelete}>
                        <Trash2 size={18} /> Löschen
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* MOBILE TABS - Segmented Control */}
            <div className={styles.mobileTabNav}>
              <button
                className={`${styles.mobileTab} ${activeTab === 'overview' ? styles.mobileTabActive : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <Info size={18} />
                <span>Übersicht</span>
              </button>
              <button
                className={`${styles.mobileTab} ${activeTab === 'document' ? styles.mobileTabActive : ''}`}
                onClick={() => setActiveTab('document')}
              >
                <FileText size={18} />
                <span>Dokument</span>
              </button>
              <button
                className={`${styles.mobileTab} ${activeTab === 'insights' ? styles.mobileTabActive : ''}`}
                onClick={() => setActiveTab('insights')}
              >
                <BarChart3 size={18} />
                <span>Insights</span>
              </button>
            </div>

            {/* MOBILE CONTENT */}
            <div className={styles.mobileContent}>

              {/* ========== TAB 1: ÜBERSICHT ========== */}
              {activeTab === 'overview' && (
                <motion.div
                  className={styles.mobileOverviewTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {/* Card: Vertragsstatus */}
                  <div className={styles.mobileCard}>
                    <div className={styles.mobileCardHeader}>
                      <Shield size={18} />
                      <h3>Vertragsstatus</h3>
                    </div>
                    <div className={styles.mobileStatusRow}>
                      <div className={`${styles.mobileStatusBadge} ${getStatusColor(contract.status)}`}>
                        {getStatusIcon(contract.status)}
                        <span>{contract.status}</span>
                      </div>
                      {score !== null && score !== undefined && (
                        <div className={styles.mobileScoreIndicator}>
                          <div
                            className={styles.mobileScoreCircle}
                            style={{ borderColor: getScoreColor(score) }}
                          >
                            <span style={{ color: getScoreColor(score) }}>{score}</span>
                          </div>
                          <div className={styles.mobileScoreInfo}>
                            <span className={styles.mobileScoreLabel}>{getScoreLabel(score)}</span>
                            <span
                              className={styles.mobileRiskLabel}
                              style={{ color: getRiskLevel(score).color }}
                            >
                              {getRiskLevel(score).label}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card: Wichtige Daten */}
                  <div className={styles.mobileCard}>
                    <div className={styles.mobileCardHeader}>
                      <Calendar size={18} />
                      <h3>Wichtige Daten</h3>
                    </div>
                    <div className={styles.mobileDataGrid}>
                      <div className={styles.mobileDataItem}>
                        <span className={styles.mobileDataLabel}>Erstellt</span>
                        <span className={styles.mobileDataValue}>{formatDateShort(contract.createdAt)}</span>
                      </div>
                      {contract.expiryDate && (
                        <div className={styles.mobileDataItem}>
                          <span className={styles.mobileDataLabel}>Läuft ab</span>
                          <span className={styles.mobileDataValue}>{formatDateShort(contract.expiryDate)}</span>
                        </div>
                      )}
                      <div className={styles.mobileDataItem}>
                        <span className={styles.mobileDataLabel}>Kündigungsfrist</span>
                        <span className={styles.mobileDataValue}>{contract.kuendigung || "—"}</span>
                      </div>
                      {contract.laufzeit && (
                        <div className={styles.mobileDataItem}>
                          <span className={styles.mobileDataLabel}>Laufzeit</span>
                          <span className={styles.mobileDataValue}>{contract.laufzeit}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card: Finanzen (wenn Smart Contract Info vorhanden) */}
                  <SmartContractInfo
                    contract={contract}
                    onPaymentUpdate={handlePaymentUpdate}
                  />

                  {/* Card: Schnellaktionen */}
                  <div className={styles.mobileCard}>
                    <div className={styles.mobileCardHeader}>
                      <Lightbulb size={18} />
                      <h3>Aktionen</h3>
                    </div>
                    <div className={styles.mobileActionsGrid}>
                      <button
                        className={styles.mobileActionBtn}
                        onClick={handleViewContract}
                      >
                        <Eye size={20} />
                        <span>PDF anzeigen</span>
                      </button>

                      {!hasAnalysis ? (
                        <button
                          className={`${styles.mobileActionBtn} ${styles.mobileActionPrimary}`}
                          onClick={handleStartNewAnalysis}
                          disabled={isAnalyzing}
                        >
                          <BarChart3 size={20} />
                          <span>{isAnalyzing ? 'Analysiere...' : 'Jetzt analysieren'}</span>
                        </button>
                      ) : (
                        <button
                          className={`${styles.mobileActionBtn} ${styles.mobileActionPrimary}`}
                          onClick={() => setShowAnalysisModal(true)}
                        >
                          <BarChart3 size={20} />
                          <span>Analyse anzeigen</span>
                        </button>
                      )}

                      {contract.s3Key && !contract.needsReupload && !contract.envelope && (
                        <button
                          className={styles.mobileActionBtn}
                          onClick={handleSendToSignature}
                        >
                          <PenTool size={20} />
                          <span>Zur Signatur</span>
                        </button>
                      )}

                      <button
                        className={styles.mobileActionBtn}
                        onClick={handleEdit}
                      >
                        <Edit size={20} />
                        <span>Bearbeiten</span>
                      </button>
                    </div>
                  </div>

                  {/* Notizen wenn vorhanden */}
                  {contract.notes && (
                    <div className={styles.mobileCard}>
                      <div className={styles.mobileCardHeader}>
                        <FileText size={18} />
                        <h3>Eigene Notizen</h3>
                      </div>
                      <p className={styles.mobileNotesText}>{contract.notes}</p>
                    </div>
                  )}

                  {/* KI-generiert Badge */}
                  {contract.isGenerated && (
                    <div className={styles.mobileAiNotice}>
                      <Star size={20} />
                      <div>
                        <h4>KI-Generierter Vertrag</h4>
                        <p>Bitte prüfe alle Details vor der Verwendung.</p>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ========== TAB 2: DOKUMENT ========== */}
              {activeTab === 'document' && (
                <motion.div
                  className={styles.mobileDocumentTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {/* PDF Controls */}
                  <div className={styles.mobilePdfControls}>
                    <button
                      className={styles.mobilePdfControlBtn}
                      onClick={() => setPdfZoom(prev => Math.max(50, prev - 25))}
                      disabled={pdfZoom <= 50}
                    >
                      <ZoomOut size={20} />
                    </button>
                    <span className={styles.mobilePdfZoomLabel}>{pdfZoom}%</span>
                    <button
                      className={styles.mobilePdfControlBtn}
                      onClick={() => setPdfZoom(prev => Math.min(200, prev + 25))}
                      disabled={pdfZoom >= 200}
                    >
                      <ZoomIn size={20} />
                    </button>
                    <button
                      className={styles.mobilePdfControlBtn}
                      onClick={handleViewContract}
                      title="In neuem Tab öffnen"
                    >
                      <Maximize2 size={20} />
                    </button>
                  </div>

                  {/* PDF Viewer */}
                  <div className={styles.mobilePdfContainer}>
                    {pdfLoading && (
                      <div className={styles.mobilePdfLoading}>
                        <div className={styles.mobileSpinner}></div>
                        <p>PDF wird geladen...</p>
                      </div>
                    )}

                    {pdfError && (
                      <div className={styles.mobilePdfError}>
                        <AlertCircle size={48} />
                        <h3>PDF nicht verfügbar</h3>
                        <p>{pdfError}</p>
                        <button onClick={loadPdfUrl} className={styles.mobileRetryBtn}>
                          Erneut versuchen
                        </button>
                      </div>
                    )}

                    {pdfUrl && !pdfLoading && !pdfError && (
                      <iframe
                        src={pdfUrl}
                        className={styles.mobilePdfViewer}
                        title="Vertragsdokument"
                        style={{ transform: `scale(${pdfZoom / 100})`, transformOrigin: 'top left' }}
                      />
                    )}
                  </div>

                  {/* Alternative: Text Content wenn kein PDF */}
                  {!pdfUrl && !pdfLoading && !pdfError && (contract.fullText || contract.content) && (
                    <div className={styles.mobileTextContent}>
                      <div className={styles.mobileTextHeader}>
                        <h3>Vertragstext</h3>
                        <button onClick={handleDownloadContent} className={styles.mobileDownloadBtn}>
                          <Download size={16} /> Export
                        </button>
                      </div>
                      <div className={styles.mobileTextBody}>
                        {contract.fullText || contract.content}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ========== TAB 3: INSIGHTS ========== */}
              {activeTab === 'insights' && (
                <motion.div
                  className={styles.mobileInsightsTab}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {hasAnalysis ? (
                    <>
                      {/* Quick Summary */}
                      <div className={styles.mobileInsightsSummary}>
                        {score !== null && score !== undefined && (
                          <div className={styles.mobileInsightsScore}>
                            <div
                              className={styles.mobileScoreBig}
                              style={{ background: `conic-gradient(${getScoreColor(score)} ${score * 3.6}deg, #e5e5e7 0deg)` }}
                            >
                              <div className={styles.mobileScoreBigInner}>
                                <span className={styles.mobileScoreBigNumber}>{score}</span>
                                <span className={styles.mobileScoreBigLabel}>/100</span>
                              </div>
                            </div>
                            <div className={styles.mobileScoreBigInfo}>
                              <h3 style={{ color: getScoreColor(score) }}>{getScoreLabel(score)}</h3>
                              <p>{contract.analysis ? 'Contract Score' : 'Legal Pulse Score'}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Accordion Sections */}
                      <div className={styles.mobileAccordionList}>
                        {/* Zusammenfassung */}
                        {(contract.analysis?.summary || contract.legalPulse?.summary) && (
                          <div className={styles.mobileAccordionItem}>
                            <button
                              className={`${styles.mobileAccordionHeader} ${expandedInsightSection === 'summary' ? styles.expanded : ''}`}
                              onClick={() => toggleInsightSection('summary')}
                            >
                              <div className={styles.mobileAccordionTitle}>
                                <FileText size={18} />
                                <span>Zusammenfassung</span>
                              </div>
                              {expandedInsightSection === 'summary' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            <AnimatePresence>
                              {expandedInsightSection === 'summary' && (
                                <motion.div
                                  className={styles.mobileAccordionContent}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                >
                                  <p>{contract.analysis?.summary || contract.legalPulse?.summary}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Rechtliche Einschätzung */}
                        {contract.analysis?.legalAssessment && (
                          <div className={styles.mobileAccordionItem}>
                            <button
                              className={`${styles.mobileAccordionHeader} ${expandedInsightSection === 'legal' ? styles.expanded : ''}`}
                              onClick={() => toggleInsightSection('legal')}
                            >
                              <div className={styles.mobileAccordionTitle}>
                                <Scale size={18} />
                                <span>Rechtliche Einschätzung</span>
                              </div>
                              {expandedInsightSection === 'legal' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            <AnimatePresence>
                              {expandedInsightSection === 'legal' && (
                                <motion.div
                                  className={styles.mobileAccordionContent}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                >
                                  <p>{contract.analysis.legalAssessment}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Risiken & Fallstricke */}
                        {(contract.legalPulse?.riskFactors || contract.legalPulse?.legalRisks) && (
                          <div className={styles.mobileAccordionItem}>
                            <button
                              className={`${styles.mobileAccordionHeader} ${expandedInsightSection === 'risks' ? styles.expanded : ''}`}
                              onClick={() => toggleInsightSection('risks')}
                            >
                              <div className={styles.mobileAccordionTitle}>
                                <AlertCircle size={18} />
                                <span>Risiken & Fallstricke</span>
                              </div>
                              {expandedInsightSection === 'risks' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            <AnimatePresence>
                              {expandedInsightSection === 'risks' && (
                                <motion.div
                                  className={styles.mobileAccordionContent}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                >
                                  <ul className={styles.mobileInsightsList}>
                                    {contract.legalPulse?.riskFactors?.map((risk, i) => (
                                      <li key={`risk-${i}`}>{risk}</li>
                                    ))}
                                    {contract.legalPulse?.legalRisks?.map((risk, i) => (
                                      <li key={`legal-${i}`}>{risk}</li>
                                    ))}
                                  </ul>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Optimierungsvorschläge */}
                        {(contract.analysis?.suggestions || contract.legalPulse?.recommendations) && (
                          <div className={styles.mobileAccordionItem}>
                            <button
                              className={`${styles.mobileAccordionHeader} ${expandedInsightSection === 'suggestions' ? styles.expanded : ''}`}
                              onClick={() => toggleInsightSection('suggestions')}
                            >
                              <div className={styles.mobileAccordionTitle}>
                                <Lightbulb size={18} />
                                <span>Optimierungsvorschläge</span>
                              </div>
                              {expandedInsightSection === 'suggestions' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            <AnimatePresence>
                              {expandedInsightSection === 'suggestions' && (
                                <motion.div
                                  className={styles.mobileAccordionContent}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                >
                                  {contract.analysis?.suggestions ? (
                                    <p>{contract.analysis.suggestions}</p>
                                  ) : (
                                    <ul className={styles.mobileInsightsList}>
                                      {contract.legalPulse?.recommendations?.map((rec, i) => (
                                        <li key={`rec-${i}`}>{rec}</li>
                                      ))}
                                    </ul>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

                        {/* Marktvergleich */}
                        {contract.analysis?.comparison && (
                          <div className={styles.mobileAccordionItem}>
                            <button
                              className={`${styles.mobileAccordionHeader} ${expandedInsightSection === 'comparison' ? styles.expanded : ''}`}
                              onClick={() => toggleInsightSection('comparison')}
                            >
                              <div className={styles.mobileAccordionTitle}>
                                <BarChart3 size={18} />
                                <span>Marktvergleich</span>
                              </div>
                              {expandedInsightSection === 'comparison' ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                            </button>
                            <AnimatePresence>
                              {expandedInsightSection === 'comparison' && (
                                <motion.div
                                  className={styles.mobileAccordionContent}
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                >
                                  <p>{contract.analysis.comparison}</p>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}
                      </div>

                      {/* Full Analysis Button */}
                      <div className={styles.mobileInsightsActions}>
                        <button
                          className={styles.mobileFullAnalysisBtn}
                          onClick={() => setShowAnalysisModal(true)}
                        >
                          <BarChart3 size={20} />
                          <span>Vollständige Analyse anzeigen</span>
                        </button>
                        <button
                          className={styles.mobileCopyBtn}
                          onClick={() => {
                            const text = `Vertragsanalyse: ${contract.name}\nScore: ${score || 'N/A'}/100\n\n${contract.analysis?.summary || contract.legalPulse?.summary || ''}`;
                            navigator.clipboard.writeText(text);
                          }}
                        >
                          <Copy size={18} />
                          <span>Kopieren</span>
                        </button>
                      </div>

                      {/* Analysis Meta */}
                      <div className={styles.mobileInsightsMeta}>
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
                    </>
                  ) : (
                    /* No Analysis State */
                    <div className={styles.mobileNoAnalysis}>
                      <BarChart3 size={64} />
                      <h3>Keine Analyse verfügbar</h3>
                      <p>Für diesen Vertrag wurde noch keine KI-Analyse durchgeführt.</p>
                      <button
                        className={styles.mobileAnalyzeBtn}
                        onClick={handleStartNewAnalysis}
                        disabled={isAnalyzing}
                      >
                        <BarChart3 size={20} />
                        <span>{isAnalyzing ? 'Analysiere...' : 'Jetzt analysieren'}</span>
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Modals */}
          <AnalysisModal
            contract={contract}
            show={showAnalysisModal}
            onClose={() => setShowAnalysisModal(false)}
          />
          <ContractShareModal
            contract={{ _id: contract._id, name: contract.name }}
            show={showShareModal}
            onClose={() => setShowShareModal(false)}
          />
          <ContractEditModal
            contract={contract}
            show={showEditModal}
            onClose={() => setShowEditModal(false)}
            onUpdate={handleContractUpdate}
          />
          <SignatureModal
            show={showSignatureModal}
            onClose={() => setShowSignatureModal(false)}
            contractId={contract._id}
            contractName={contract.name}
            contractS3Key={contract.s3Key || ""}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // ============================================
  // DESKTOP LAYOUT - Original, unchanged
  // ============================================
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
          <div className={styles.header}>
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
                <button className={styles.actionBtn} onClick={handleShare} title="Teilen">
                  <Share2 size={18} />
                </button>
                <button className={styles.actionBtn} onClick={handleEdit} title="Bearbeiten">
                  <Edit size={18} />
                </button>
                {contract.s3Key && !contract.needsReupload && !contract.envelope && (
                  <button className={styles.actionBtn} onClick={handleSendToSignature} title="Zur Signatur senden">
                    <PenTool size={18} />
                  </button>
                )}
                {(contract.envelope || contract.signatureEnvelopeId) && onOpenSignatureDetails && (
                  <button
                    className={`${styles.actionBtn} ${styles.signatureDetailsBtn}`}
                    onClick={() => {
                      const envelopeId = contract.envelope?._id || contract.signatureEnvelopeId;
                      if (envelopeId) onOpenSignatureDetails(envelopeId);
                    }}
                    title="Signaturdetails anzeigen"
                  >
                    <FileText size={18} />
                  </button>
                )}
                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={handleDelete} title="Löschen">
                  <Trash2 size={18} />
                </button>
                <button className={styles.closeBtn} onClick={onClose} title="Schließen">
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

            {/* Tab Navigation - Desktop uses overview/content/analysis */}
            <div className={styles.tabNav}>
              <button
                className={`${styles.tab} ${activeTab === 'overview' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                <Info size={16} />
                <span>Übersicht</span>
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'document' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('document')}
              >
                <Eye size={16} />
                <span>Inhalt</span>
              </button>
              <button
                className={`${styles.tab} ${activeTab === 'insights' ? styles.activeTab : ''}`}
                onClick={() => setActiveTab('insights')}
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
                    {contract.notes && (
                      <div className={styles.detailItem}>
                        <label>Eigene Notizen</label>
                        <span>{contract.notes}</span>
                      </div>
                    )}
                  </div>

                  <div className={styles.viewContractSection}>
                    {contract.needsReupload || contract.uploadType === 'LOCAL_LEGACY' ? (
                      <div style={{ textAlign: 'center', padding: '1rem' }}>
                        <button
                          className={styles.viewContractButton}
                          style={{ background: 'rgba(255, 149, 0, 0.1)', border: '1px solid rgba(255, 149, 0, 0.3)', color: '#ff9500' }}
                          onClick={handleViewContract}
                        >
                          Legacy-Vertrag (Info anzeigen)
                        </button>
                        <p style={{ fontSize: '0.875rem', color: '#ff9500', marginTop: '0.5rem', fontStyle: 'italic' }}>
                          Dieser Vertrag muss erneut hochgeladen werden.
                        </p>
                      </div>
                    ) : (
                      <button onClick={handleViewContract} className={styles.viewContractButton}>
                        Vertrag anzeigen
                      </button>
                    )}
                  </div>
                </div>

                <SmartContractInfo contract={contract} onPaymentUpdate={handlePaymentUpdate} />

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

            {/* Content/Document Tab - Desktop */}
            {activeTab === 'document' && (
              <motion.div
                className={styles.contentTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {(() => {
                  const textContent = contract.fullText || contract.content || contract.extractedText || '';

                  if (textContent && textContent.trim().length > 0) {
                    return (
                      <div className={styles.contentViewer}>
                        <div className={styles.contentHeader}>
                          <h3>Vertragsinhalt</h3>
                          <div className={styles.contentSourceInfo}>
                            <span className={styles.sourceLabel}>
                              Quelle: {contract.fullText ? 'Volltext-Analyse' : contract.content ? 'Contract Content' : 'Extrahierter Text'}
                            </span>
                          </div>
                          <button className={styles.downloadBtn} onClick={handleDownloadContent}>
                            <Download size={16} />
                            <span>Als TXT herunterladen</span>
                          </button>
                        </div>
                        <div className={styles.contentText}>{textContent}</div>
                        <div className={styles.contentStats}>
                          <div className={styles.contentStat}>
                            <span className={styles.statLabel}>Zeichen:</span>
                            <span className={styles.statValue}>{textContent.length.toLocaleString()}</span>
                          </div>
                          <div className={styles.contentStat}>
                            <span className={styles.statLabel}>Wörter:</span>
                            <span className={styles.statValue}>{textContent.split(/\s+/).filter((w: string) => w.length > 0).length.toLocaleString()}</span>
                          </div>
                          <div className={styles.contentStat}>
                            <span className={styles.statLabel}>Absätze:</span>
                            <span className={styles.statValue}>{textContent.split(/\n\s*\n/).filter((p: string) => p.trim().length > 0).length.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className={styles.noContent}>
                        <FileText size={48} />
                        <h3>Kein Textinhalt verfügbar</h3>
                        <p>Der Vertragstext konnte nicht extrahiert werden.</p>
                        <div className={styles.noContentActions}>
                          <button className={styles.retryBtn} onClick={handleViewContract}>
                            <ExternalLink size={16} />
                            <span>PDF anzeigen</span>
                          </button>
                        </div>
                      </div>
                    );
                  }
                })()}
              </motion.div>
            )}

            {/* Analysis/Insights Tab - Desktop */}
            {activeTab === 'insights' && (
              <motion.div
                className={styles.analysisTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {hasAnalysis ? (
                  <div className={styles.analysisPreview}>
                    <div className={styles.previewHeader}>
                      <div className={styles.previewIcon}>
                        <BarChart3 size={24} />
                      </div>
                      <div className={styles.previewInfo}>
                        <h3>{contract.analysis ? 'KI-Vertragsanalyse verfügbar' : 'Legal Pulse Analyse verfügbar'}</h3>
                        <p>Vollständige Analyse in separatem Fenster anzeigen</p>
                      </div>
                    </div>

                    {score !== null && score !== undefined && (
                      <div className={styles.scorePreview}>
                        <div
                          className={styles.scoreCircleSmall}
                          style={{ '--score-color': getScoreColor(score) } as React.CSSProperties}
                        >
                          <span className={styles.scoreNumberSmall}>{score}</span>
                          <span className={styles.scoreMaxSmall}>/100</span>
                        </div>
                        <div className={styles.scoreInfoSmall}>
                          <h4 style={{ color: getScoreColor(score) }}>{getScoreLabel(score)}</h4>
                          <p>{contract.analysis ? 'Contract Score' : 'Legal Pulse Score'}</p>
                        </div>
                      </div>
                    )}

                    <div className={styles.previewActions}>
                      <button className={styles.viewAnalysisButton} onClick={() => setShowAnalysisModal(true)}>
                        <BarChart3 size={18} />
                        <span>Vollständige Analyse anzeigen</span>
                      </button>
                      <button
                        className={styles.copyAnalysisButton}
                        onClick={() => {
                          const text = `Vertragsanalyse: ${contract.name}\nScore: ${score || 'N/A'}/100\n\nZusammenfassung: ${contract.analysis?.summary || contract.legalPulse?.summary || 'Nicht verfügbar'}`;
                          navigator.clipboard.writeText(text);
                        }}
                      >
                        <Copy size={16} />
                        <span>Kopieren</span>
                      </button>
                    </div>

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
                  <div className={styles.noAnalysis}>
                    <BarChart3 size={48} />
                    <h3>Keine Analyse verfügbar</h3>
                    <p>Für diesen Vertrag wurde noch keine KI-Analyse durchgeführt.</p>
                    <div className={styles.noAnalysisActions}>
                      <button
                        className={styles.analyzeBtn}
                        onClick={handleStartNewAnalysis}
                        disabled={isAnalyzing}
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

        {/* Modals */}
        <AnalysisModal contract={contract} show={showAnalysisModal} onClose={() => setShowAnalysisModal(false)} />
        <ContractShareModal contract={{ _id: contract._id, name: contract.name }} show={showShareModal} onClose={() => setShowShareModal(false)} />
        <ContractEditModal contract={contract} show={showEditModal} onClose={() => setShowEditModal(false)} onUpdate={handleContractUpdate} />
        <SignatureModal show={showSignatureModal} onClose={() => setShowSignatureModal(false)} contractId={contract._id} contractName={contract.name} contractS3Key={contract.s3Key || ""} />
      </motion.div>
    </AnimatePresence>
  );
}
