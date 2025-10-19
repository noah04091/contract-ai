// 🎨 New Contract Details Modal - Professional contract viewer
import React, { useState, useEffect } from 'react';
import { X, FileText, BarChart3, Share2, Edit, Trash2, PenTool, Eye, Download, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import styles from './ContractDetailModal.module.css'; // Reuse signature modal styles
import SmartContractInfo from './SmartContractInfo';
import ContractShareModal from './ContractShareModal';
import ContractEditModal from './ContractEditModal';
import SignatureModal from './SignatureModal';

interface Contract {
  _id: string;
  name: string;
  kuendigung: string;
  laufzeit?: string;
  expiryDate?: string;
  status: string;
  reminder?: boolean;
  createdAt: string;
  uploadDate?: string;
  content?: string;
  isGenerated?: boolean;
  notes?: string;
  fullText?: string;
  extractedText?: string;
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
  paymentMethod?: string;
  paymentStatus?: 'paid' | 'unpaid';
  paymentAmount?: number;
  paymentDate?: string;
}

interface NewContractDetailsModalProps {
  contract: Contract;
  onClose: () => void;
  openEditModalDirectly?: boolean;
  onEdit?: (contractId: string) => void;
  onDelete?: (contractId: string, contractName: string) => void;
  onOpenSignatureDetails?: (envelopeId: string) => void;
}

type TabType = 'overview' | 'pdf' | 'analysis';

const NewContractDetailsModal: React.FC<NewContractDetailsModalProps> = ({
  contract: initialContract,
  onClose,
  openEditModalDirectly = false,
  onEdit,
  onDelete,
  onOpenSignatureDetails
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [contract, setContract] = useState<Contract>(initialContract);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(openEditModalDirectly);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Update contract when prop changes
  useEffect(() => {
    setContract(initialContract);
  }, [initialContract]);

  // ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // Load PDF URL when PDF tab is opened
  useEffect(() => {
    if (activeTab === 'pdf' && contract.s3Key && !pdfUrl && !pdfLoading) {
      loadPdfUrl();
    }
  }, [activeTab, contract.s3Key]);

  const loadPdfUrl = async () => {
    if (!contract.s3Key || contract.needsReupload) return;

    setPdfLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/s3/view?contractId=${contract._id}&type=original`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      const data = await response.json();
      if (data.fileUrl || data.url) {
        setPdfUrl(data.fileUrl || data.url);
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
    } finally {
      setPdfLoading(false);
    }
  };

  // Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get status badge
  const renderStatusBadge = () => {
    const statusMap: Record<string, { className: string; icon: React.ReactNode; text: string }> = {
      aktiv: { className: styles.statusCompleted, icon: <CheckCircle size={16} />, text: 'Aktiv' },
      gekuendigt: { className: styles.statusDeclined, icon: <AlertCircle size={16} />, text: 'Gekündigt' },
      abgelaufen: { className: styles.statusExpired, icon: <Clock size={16} />, text: 'Abgelaufen' }
    };

    const status = statusMap[contract.status?.toLowerCase()] || statusMap.aktiv;

    return (
      <div className={`${styles.statusBadge} ${status.className}`}>
        {status.icon}
        <span>{status.text}</span>
      </div>
    );
  };

  // Action handlers
  const handleEdit = () => setShowEditModal(true);
  const handleShare = () => setShowShareModal(true);
  const handleDelete = () => {
    if (onDelete) {
      onDelete(contract._id, contract.name);
      onClose();
    }
  };
  const handleSendToSignature = () => setShowSignatureModal(true);
  const handleOpenSignatureDetails = () => {
    const envelopeId = contract.envelope?._id || contract.signatureEnvelopeId;
    if (envelopeId && onOpenSignatureDetails) {
      onClose();
      onOpenSignatureDetails(envelopeId);
    }
  };

  // Render Overview Tab
  const renderOverviewTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.section}>
        <h3>📋 Vertragsdetails</h3>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.label}>Vertragsname:</span>
            <span className={styles.value}>{contract.name}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.label}>Status:</span>
            <span className={styles.value}>{renderStatusBadge()}</span>
          </div>
          {contract.kuendigung && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Kündigungsfrist:</span>
              <span className={styles.value}>{contract.kuendigung}</span>
            </div>
          )}
          {contract.laufzeit && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Laufzeit:</span>
              <span className={styles.value}>{contract.laufzeit}</span>
            </div>
          )}
          {contract.expiryDate && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Enddatum:</span>
              <span className={styles.value}>{formatDate(contract.expiryDate)}</span>
            </div>
          )}
          <div className={styles.detailItem}>
            <span className={styles.label}>Hochgeladen am:</span>
            <span className={styles.value}>{formatDate(contract.uploadDate || contract.createdAt)}</span>
          </div>
          {contract.isGenerated && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Quelle:</span>
              <span className={styles.value}>✨ KI-generiert</span>
            </div>
          )}
        </div>
      </div>

      {/* Smart Contract Info (Payment/Cost Tracking) */}
      {(contract.paymentMethod || contract.paymentAmount || contract.paymentStatus) && (
        <div className={styles.section}>
          <SmartContractInfo contract={contract} />
        </div>
      )}

      {/* Notes */}
      {contract.notes && (
        <div className={styles.section}>
          <h3>📝 Notizen</h3>
          <div className={styles.messageBox}>
            <p>{contract.notes}</p>
          </div>
        </div>
      )}

      {/* Content Preview */}
      {contract.content && (
        <div className={styles.section}>
          <h3>📄 Vertragsinhalt (Auszug)</h3>
          <div className={styles.messageBox}>
            <p>{contract.content.substring(0, 500)}{contract.content.length > 500 ? '...' : ''}</p>
          </div>
        </div>
      )}
    </div>
  );

  // Render PDF Tab
  const renderPdfTab = () => {
    if (contract.needsReupload) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <AlertCircle size={64} />
            <p>Dieser Vertrag wurde vor der Cloud-Integration hochgeladen</p>
            <span className={styles.hint}>Bitte laden Sie den Vertrag erneut hoch, um ihn anzuzeigen.</span>
          </div>
        </div>
      );
    }

    if (!contract.s3Key) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <FileText size={64} />
            <p>Kein PDF verfügbar</p>
          </div>
        </div>
      );
    }

    if (pdfLoading) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Lade PDF...</p>
          </div>
        </div>
      );
    }

    if (!pdfUrl) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <AlertCircle size={64} />
            <p>Fehler beim Laden des PDFs</p>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.tabContent}>
        <div className={styles.pdfViewerContainer}>
          <iframe
            src={pdfUrl}
            className={styles.pdfViewer}
            title="Contract PDF"
          />
          <div className={styles.pdfActions}>
            <a href={pdfUrl} download className={styles.downloadButton}>
              <Download size={20} />
              PDF herunterladen
            </a>
          </div>
        </div>
      </div>
    );
  };

  // Render Analysis Tab
  const renderAnalysisTab = () => {
    const analysis = contract.analysis;
    const legalPulse = contract.legalPulse;

    if (!analysis && !legalPulse) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <BarChart3 size={64} />
            <p>Keine Analyse verfügbar</p>
            <span className={styles.hint}>Dieser Vertrag wurde noch nicht analysiert.</span>
          </div>
        </div>
      );
    }

    // Get score
    const score = analysis?.contractScore || legalPulse?.riskScore;
    const hasScore = score !== null && score !== undefined;

    return (
      <div className={styles.tabContent}>
        {/* Contract Score */}
        {hasScore && (
          <div className={styles.section}>
            <h3>📊 Contract Score</h3>
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${score}%` }}
                ></div>
              </div>
              <div className={styles.progressStats}>
                <span>{score!}/100</span>
                <span>{score! >= 70 ? '✅ Gut' : score! >= 40 ? '⚠️ Mittel' : '❌ Verbesserungsbedarf'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {(analysis?.summary || legalPulse?.summary) && (
          <div className={styles.section}>
            <h3>📝 Zusammenfassung</h3>
            <div className={styles.messageBox}>
              <p>{analysis?.summary || legalPulse?.summary}</p>
            </div>
          </div>
        )}

        {/* Legal Assessment */}
        {analysis?.legalAssessment && (
          <div className={styles.section}>
            <h3>⚖️ Rechtliche Bewertung</h3>
            <div className={styles.messageBox}>
              <p>{analysis.legalAssessment}</p>
            </div>
          </div>
        )}

        {/* Risks */}
        {(legalPulse?.legalRisks || legalPulse?.riskFactors) && (
          <div className={styles.section}>
            <h3>⚠️ Risiken</h3>
            <div className={styles.timelineDetails}>
              {(legalPulse.legalRisks || legalPulse.riskFactors || []).map((risk, index) => (
                <p key={index}>• {risk}</p>
              ))}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {(analysis?.suggestions || legalPulse?.recommendations) && (
          <div className={styles.section}>
            <h3>💡 Empfehlungen</h3>
            <div className={styles.messageBox}>
              {analysis?.suggestions ? (
                <p>{analysis.suggestions}</p>
              ) : (
                <div className={styles.timelineDetails}>
                  {legalPulse?.recommendations?.map((rec, index) => (
                    <p key={index}>• {rec}</p>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className={styles.modalHeader}>
            <div className={styles.headerLeft}>
              <FileText size={24} />
              <div>
                <h2>{contract.name}</h2>
                <p className={styles.contractName}>
                  {contract.kuendigung && `Kündigungsfrist: ${contract.kuendigung}`}
                </p>
              </div>
            </div>

            <div className={styles.headerActions}>
              {/* Share */}
              <button
                className={styles.actionBtn}
                onClick={handleShare}
                title="Teilen"
              >
                <Share2 size={18} />
              </button>

              {/* Edit */}
              <button
                className={styles.actionBtn}
                onClick={handleEdit}
                title="Bearbeiten"
              >
                <Edit size={18} />
              </button>

              {/* Signature */}
              {contract.s3Key && !contract.needsReupload && !contract.envelope && (
                <button
                  className={styles.actionBtn}
                  onClick={handleSendToSignature}
                  title="Zur Signatur senden"
                >
                  <PenTool size={18} />
                </button>
              )}

              {/* Signature Details */}
              {(contract.envelope || contract.signatureEnvelopeId) && onOpenSignatureDetails && (
                <button
                  className={`${styles.actionBtn} ${styles.signatureDetailsBtn}`}
                  onClick={handleOpenSignatureDetails}
                  title="Signaturdetails anzeigen"
                >
                  <Eye size={18} />
                </button>
              )}

              {/* Delete */}
              <button
                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                onClick={handleDelete}
                title="Löschen"
              >
                <Trash2 size={18} />
              </button>

              {/* Close */}
              <button onClick={onClose} className={styles.closeBtn} aria-label="Schließen">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className={styles.tabNav}>
            <button
              className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <FileText size={18} />
              <span>Übersicht</span>
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'pdf' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('pdf')}
              disabled={!contract.s3Key}
            >
              <Eye size={18} />
              <span>PDF</span>
              {!contract.s3Key && <span className={styles.tabDisabled}>(nicht verfügbar)</span>}
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'analysis' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('analysis')}
              disabled={!contract.analysis && !contract.legalPulse}
            >
              <BarChart3 size={18} />
              <span>Analyse</span>
              {!contract.analysis && !contract.legalPulse && (
                <span className={styles.tabDisabled}>(nicht verfügbar)</span>
              )}
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.modalBody}>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'pdf' && renderPdfTab()}
            {activeTab === 'analysis' && renderAnalysisTab()}
          </div>
        </div>
      </div>

      {/* Sub-Modals */}
      {showShareModal && (
        <ContractShareModal
          contract={contract}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {showEditModal && (
        <ContractEditModal
          contract={contract}
          onClose={() => setShowEditModal(false)}
          onSave={async (updatedContract) => {
            setContract(updatedContract);
            if (onEdit) onEdit(updatedContract._id);
            setShowEditModal(false);
          }}
        />
      )}

      {showSignatureModal && (
        <SignatureModal
          contract={contract}
          onClose={() => setShowSignatureModal(false)}
          onSuccess={() => {
            setShowSignatureModal(false);
            if (onEdit) onEdit(contract._id);
          }}
        />
      )}
    </>
  );
};

export default NewContractDetailsModal;
