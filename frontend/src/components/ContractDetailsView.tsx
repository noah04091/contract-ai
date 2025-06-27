import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, FileText, Calendar, Clock, AlertCircle, CheckCircle, 
  Info, Eye, Download, Share2, Edit, Trash2, Star,
  BarChart3, Shield, Lightbulb, TrendingUp,
  Copy, ExternalLink, Cloud, AlertTriangle
} from "lucide-react";
import styles from "../styles/ContractDetailsView.module.css";
import ReminderToggle from "./ReminderToggle";
import ContractShareModal from "./ContractShareModal"; // ✅ NEU: Import Share Modal
import ContractEditModal from "./ContractEditModal"; // ✅ NEU: Import Edit Modal
import { getContractFileUrl } from "../utils/api";

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
  analysis?: {
    summary?: string;
    legalAssessment?: string;
    suggestions?: string;
    comparison?: string;
    contractScore?: number;
    analysisId?: string;
    lastAnalyzed?: string;
  };
}

interface ContractDetailsViewProps {
  contract: Contract;
  onClose: () => void;
  show: boolean;
  onEdit?: (contractId: string) => void;
  onDelete?: (contractId: string, contractName: string) => void;
}

export default function ContractDetailsView({ 
  contract: initialContract, 
  onClose, 
  show, 
  onEdit, 
  onDelete 
}: ContractDetailsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'analysis'>('overview');
  
  // ✅ NEU: State für die beiden Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [contract, setContract] = useState<Contract>(initialContract); // ✅ NEU: Lokaler Contract State für Updates

  // ✅ NEU: Update contract wenn sich initialContract ändert
  useEffect(() => {
    setContract(initialContract);
  }, [initialContract]);

  const formatDate = (dateString: string): string => {
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

  // ✅ NEU: S3 Status Badge Funktion
  const getContractStatusBadge = (contract: Contract) => {
    if (contract.s3Key) {
      return (
        <span 
          className={styles.statusBadge} 
          style={{ 
            background: 'rgba(52, 199, 89, 0.1)', 
            color: '#34c759', 
            border: '1px solid rgba(52, 199, 89, 0.2)' 
          }}
        >
          <Cloud size={12} />
          ☁️ Cloud
        </span>
      );
    }
    if (contract.needsReupload || contract.uploadType === 'LOCAL_LEGACY') {
      return (
        <span 
          className={styles.statusBadge} 
          style={{ 
            background: 'rgba(255, 149, 0, 0.1)', 
            color: '#ff9500', 
            border: '1px solid rgba(255, 149, 0, 0.2)' 
          }}
        >
          <AlertTriangle size={12} />
          ⚠️ Reupload erforderlich
        </span>
      );
    }
    return (
      <span 
        className={styles.statusBadge} 
        style={{ 
          background: 'rgba(142, 142, 147, 0.1)', 
          color: '#8e8e93', 
          border: '1px solid rgba(142, 142, 147, 0.2)' 
        }}
      >
        <FileText size={12} />
        📁 Lokal
      </span>
    );
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

  const formatTextToPoints = (text: string): string[] => {
    if (!text) return ['Keine Details verfügbar'];
    
    const sentences = text
      .split(/[.!?]+|[-•]\s*/)
      .map(s => s.trim())
      .filter(s => s.length > 15 && s.length < 200)
      .slice(0, 4);
    
    return sentences.length > 0 ? sentences : [text.substring(0, 180) + '...'];
  };

  // ✅ ANGEPASST: Original handleViewContract mit ChatGPT Fix für S3-Teil
  const handleViewContract = async () => {
    console.log('🔍 Opening contract with enhanced S3 integration:', {
      contractId: contract._id,
      contractName: contract.name,
      hasS3Key: !!contract.s3Key,
      uploadType: contract.uploadType,
      needsReupload: contract.needsReupload
    });

    // ✅ CHATGPT FIX: Neue vereinfachte S3-Route mit key Parameter
    if (contract.s3Key) {
      console.log('✅ S3 Contract detected, fetching signed URL...');
      
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/s3/view?key=${encodeURIComponent(contract.s3Key)}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        
        const data = await response.json();
        
        console.log('🔍 S3 Response data:', data);
        
        if (response.ok && data.url) {
          console.log('✅ S3 URL fetched successfully:', data.url);
          window.open(data.url, '_blank', 'noopener,noreferrer');
          return;
        } else {
          console.error('❌ S3 URL fetch failed:', data.error || 'No URL in response');
          // Fallback to old logic below
        }
      } catch (error) {
        console.error('❌ S3 URL fetch error:', error);
        // Fallback to old logic below
      }
    }
    
    // ✅ ORIGINAL: Legacy-Vertrag oder S3-Fehler
    if (contract.needsReupload || contract.uploadType === 'LOCAL_LEGACY') {
      alert(`⚠️ Dieser Vertrag wurde vor der Cloud-Integration hochgeladen und ist nicht mehr verfügbar.\n\nBitte laden Sie "${contract.name}" erneut hoch, um ihn anzuzeigen.`);
      return;
    }

    // ✅ ORIGINAL: Fallback - Original Logic (für Backward Compatibility)
    console.log('🔄 Fallback: Using original file URL logic...');
    
    const fileUrl = getContractFileUrl(contract);
    
    console.log('🔍 getContractFileUrl returned:', fileUrl, 'Type:', typeof fileUrl);
    
    if (!fileUrl) {
      console.warn('⚠️ No file URL available');
      alert(`❌ PDF-Datei nicht verfügbar.\n\nDieser Vertrag muss erneut hochgeladen werden.`);
      return;
    }
    
    console.log('🔍 Opening file with fallback logic:', {
      contractName: contract.name,
      fileUrl: fileUrl,
      filename: contract.filename,
      originalname: contract.originalname,
      filePath: contract.filePath,
      s3Key: contract.s3Key,
      usingFunction: 'getContractFileUrl'
    });
    
    if (fileUrl.includes('/api/s3/view')) {
      try {
        console.log('🔗 S3 View Route detected, checking response type...');
        
        const headResponse = await fetch(fileUrl, { 
          method: 'HEAD',
          credentials: 'include'
        });
        
        if (headResponse.redirected) {
          console.log('✅ Backend redirected to:', headResponse.url);
          window.open(headResponse.url, '_blank', 'noopener,noreferrer');
        } else {
          console.log('📋 Backend returns JSON, fetching S3 URL...');
          const response = await fetch(fileUrl, {
            headers: { 'Accept': 'application/json' },
            credentials: 'include'
          });
          
          const data = await response.json();
          
          if (data.fileUrl || data.url) {
            console.log('✅ Opening S3 file directly:', data.fileUrl || data.url);
            window.open(data.fileUrl || data.url, '_blank', 'noopener,noreferrer');
          } else {
            console.error('❌ No fileUrl in response:', data);
            alert('Fehler: Datei-URL konnte nicht generiert werden.');
          }
        }
      } catch (error) {
        console.error('❌ Error handling S3 URL:', error);
        console.log('🔄 Fallback: Opening URL directly...');
        window.open(fileUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      console.log('✅ Opening direct URL:', fileUrl, 'Type:', typeof fileUrl);
      window.open(fileUrl, '_blank', 'noopener,noreferrer');
    }
  };

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

  const handleCopyAnalysis = () => {
    const analysis = contract.analysis;
    if (!analysis) return;
    
    const analysisText = `
Vertragsanalyse: ${contract.name}
Score: ${analysis.contractScore || 'N/A'}/100

Zusammenfassung:
${analysis.summary || 'Nicht verfügbar'}

Rechtssicherheit:
${analysis.legalAssessment || 'Nicht verfügbar'}

Optimierungsvorschläge:
${analysis.suggestions || 'Nicht verfügbar'}

Marktvergleich:
${analysis.comparison || 'Nicht verfügbar'}
    `.trim();
    
    navigator.clipboard.writeText(analysisText);
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
                    {/* ✅ NEU: S3 Status Badge */}
                    {getContractStatusBadge(contract)}
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
                    {/* ✅ NEU: Speicherstatus anzeigen */}
                    <div className={styles.detailItem}>
                      <label>Speicherstatus</label>
                      {getContractStatusBadge(contract)}
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
                  
                  {/* ✅ ORIGINAL Contract View Button mit ChatGPT Fix */}
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
                        style={{
                          background: contract.s3Key ? 'rgba(52, 199, 89, 0.1)' : 'rgba(0, 122, 255, 0.1)',
                          border: contract.s3Key ? '1px solid rgba(52, 199, 89, 0.3)' : '1px solid rgba(0, 122, 255, 0.3)',
                          color: contract.s3Key ? '#34c759' : '#007aff'
                        }}
                      >
                        {contract.s3Key ? '☁️ Vertrag anzeigen (Cloud)' : '📄 Vertrag anzeigen'}
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

            {/* Analysis Tab - unverändert */}
            {activeTab === 'analysis' && (
              <motion.div 
                className={styles.analysisTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                {contract.analysis ? (
                  <div className={styles.analysisViewer}>
                    <div className={styles.analysisHeader}>
                      <h3>KI-Vertragsanalyse</h3>
                      <div className={styles.analysisActions}>
                        <button 
                          className={styles.copyBtn}
                          onClick={handleCopyAnalysis}
                          title="Analyse kopieren"
                        >
                          <Copy size={16} />
                          <span>Kopieren</span>
                        </button>
                      </div>
                    </div>

                    {contract.analysis.contractScore && (
                      <div className={styles.scoreSection}>
                        <div className={styles.scoreDisplay}>
                          <div 
                            className={styles.scoreCircle}
                            style={{ '--score-color': getScoreColor(contract.analysis.contractScore) } as React.CSSProperties}
                          >
                            <span className={styles.scoreNumber}>{contract.analysis.contractScore}</span>
                            <span className={styles.scoreMax}>/100</span>
                          </div>
                          <div className={styles.scoreInfo}>
                            <h4 style={{ color: getScoreColor(contract.analysis.contractScore) }}>
                              {getScoreLabel(contract.analysis.contractScore)}
                            </h4>
                            <p>Contract Score</p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className={styles.analysisContent}>
                      {contract.analysis.summary && (
                        <div className={styles.analysisSection}>
                          <div className={styles.analysisSectionHeader}>
                            <div className={styles.sectionIcon}>
                              <FileText size={20} />
                            </div>
                            <h4>Zusammenfassung</h4>
                          </div>
                          <div className={styles.analysisSectionContent}>
                            <ul className={styles.analysisList}>
                              {formatTextToPoints(contract.analysis.summary).map((point, index) => (
                                <li key={index} className={styles.analysisPoint}>
                                  <div className={styles.pointBullet}></div>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {contract.analysis.legalAssessment && (
                        <div className={styles.analysisSection}>
                          <div className={styles.analysisSectionHeader}>
                            <div className={styles.sectionIcon} style={{ background: 'rgba(52, 199, 89, 0.1)' }}>
                              <Shield size={20} style={{ color: '#34c759' }} />
                            </div>
                            <h4>Rechtssicherheit</h4>
                          </div>
                          <div className={styles.analysisSectionContent}>
                            <ul className={styles.analysisList}>
                              {formatTextToPoints(contract.analysis.legalAssessment).map((point, index) => (
                                <li key={index} className={styles.analysisPoint}>
                                  <div className={styles.pointBullet} style={{ background: '#34c759' }}></div>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {contract.analysis.suggestions && (
                        <div className={styles.analysisSection}>
                          <div className={styles.analysisSectionHeader}>
                            <div className={styles.sectionIcon} style={{ background: 'rgba(255, 149, 0, 0.1)' }}>
                              <Lightbulb size={20} style={{ color: '#ff9500' }} />
                            </div>
                            <h4>Optimierungsvorschläge</h4>
                          </div>
                          <div className={styles.analysisSectionContent}>
                            <ul className={styles.analysisList}>
                              {formatTextToPoints(contract.analysis.suggestions).map((point, index) => (
                                <li key={index} className={styles.analysisPoint}>
                                  <div className={styles.pointBullet} style={{ background: '#ff9500' }}></div>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {contract.analysis.comparison && (
                        <div className={styles.analysisSection}>
                          <div className={styles.analysisSectionHeader}>
                            <div className={styles.sectionIcon} style={{ background: 'rgba(139, 92, 246, 0.1)' }}>
                              <TrendingUp size={20} style={{ color: '#8b5cf6' }} />
                            </div>
                            <h4>Marktvergleich</h4>
                          </div>
                          <div className={styles.analysisSectionContent}>
                            <ul className={styles.analysisList}>
                              {formatTextToPoints(contract.analysis.comparison).map((point, index) => (
                                <li key={index} className={styles.analysisPoint}>
                                  <div className={styles.pointBullet} style={{ background: '#8b5cf6' }}></div>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    {contract.analysis.lastAnalyzed && (
                      <div className={styles.analysisMeta}>
                        <p>
                          <Clock size={14} />
                          Letzte Analyse: {formatDate(contract.analysis.lastAnalyzed)}
                        </p>
                        {contract.analysis.analysisId && (
                          <p>
                            <FileText size={14} />
                            ID: {contract.analysis.analysisId}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className={styles.noAnalysis}>
                    <BarChart3 size={48} />
                    <h3>Keine Analyse verfügbar</h3>
                    <p>Für diesen Vertrag wurde noch keine KI-Analyse durchgeführt oder die Analyse-Daten sind nicht verfügbar.</p>
                    
                    <div className={styles.noAnalysisActions}>
                      <button 
                        className={styles.analyzeBtn}
                        onClick={() => {
                          console.log('Start analysis for:', contract._id);
                        }}
                      >
                        <BarChart3 size={16} />
                        <span>Jetzt analysieren</span>
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>
        </motion.div>

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