// 🎨 New Contract Details Modal - Professional contract viewer
import React, { useState, useEffect } from 'react';
import { X, FileText, BarChart3, Share2, Edit, Trash2, PenTool, Eye, Download, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';
import styles from './ContractDetailModal.module.css'; // Reuse signature modal styles
import SmartContractInfo from './SmartContractInfo';
import ContractShareModal from './ContractShareModal';
import ContractEditModal from './ContractEditModal';
import SignatureModal from './SignatureModal';

// Signature-related interfaces
interface Signer {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  order: number;
  signedAt?: string;
  declinedAt?: string;
  declineReason?: string;
  ip?: string;
}

interface AuditEvent {
  action: string;
  timestamp: string;
  details?: {
    userId?: string;
    email?: string;
    ip?: string;
    reason?: string;
    signedCount?: number;
    totalSigners?: number;
    [key: string]: string | number | boolean | undefined;
  };
}

interface ContractInfo {
  _id: string;
  name: string;
  status: string;
  uploadDate: string;
  s3Key: string;
}

interface EnvelopeDetails {
  _id: string;
  title: string;
  message?: string;
  status: string;
  signingMode: string;
  createdAt: string;
  sentAt?: string;
  completedAt?: string;
  expiresAt: string;
  s3Key: string;
  s3KeySealed?: string;
  pdfHashOriginal?: string;
  pdfHashFinal?: string;
  signers: Signer[];
  auditTrail: AuditEvent[];
  contractId: ContractInfo;
  stats: {
    signersTotal: number;
    signersSigned: number;
    signersDeclined: number;
    signersPending: number;
    progressPercentage: number;
  };
}

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
}

type TabType = 'overview' | 'pdf' | 'analysis' | 'signature';

const NewContractDetailsModal: React.FC<NewContractDetailsModalProps> = ({
  contract: initialContract,
  onClose,
  openEditModalDirectly = false,
  onEdit,
  onDelete
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [contract, setContract] = useState<Contract>(initialContract);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [contentExpanded, setContentExpanded] = useState(false);

  // Modals
  const [showShareModal, setShowShareModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(openEditModalDirectly);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Signature tab state
  const [envelope, setEnvelope] = useState<EnvelopeDetails | null>(null);
  const [envelopeLoading, setEnvelopeLoading] = useState(false);
  const [envelopeError, setEnvelopeError] = useState<string | null>(null);
  const [originalPdfUrl, setOriginalPdfUrl] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

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

  // Load envelope details when signature tab is opened
  useEffect(() => {
    if (activeTab === 'signature' && (contract.envelope || contract.signatureEnvelopeId) && !envelope && !envelopeLoading) {
      loadEnvelope();
    }
  }, [activeTab, contract.envelope, contract.signatureEnvelopeId]);

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

  const loadEnvelope = async () => {
    const envelopeId = contract.envelope?._id || contract.signatureEnvelopeId;
    if (!envelopeId) return;

    setEnvelopeLoading(true);
    try {
      const token = localStorage.getItem('token');

      const response = await fetch(`/api/envelopes/${envelopeId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Fehler beim Laden der Signatur-Details');
      }

      const data = await response.json();
      setEnvelope(data.envelope);

      // Load PDF URLs
      if (data.envelope.contractId?.s3Key) {
        const pdfResponse = await fetch(`/api/s3/view?contractId=${data.envelope.contractId._id}&type=original`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        const pdfData = await pdfResponse.json();
        if (pdfData.fileUrl || pdfData.url) {
          setOriginalPdfUrl(pdfData.fileUrl || pdfData.url);
        }
      }

      if (data.envelope.s3KeySealed) {
        const signedResponse = await fetch(`/api/s3/view?contractId=${data.envelope.contractId._id}&type=signed`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });
        const signedData = await signedResponse.json();
        if (signedData.fileUrl || signedData.url) {
          setSignedPdfUrl(signedData.fileUrl || signedData.url);
        }
      }

    } catch (err) {
      console.error('❌ Error loading envelope:', err);
      setEnvelopeError(err instanceof Error ? err.message : 'Fehler beim Laden');
    } finally {
      setEnvelopeLoading(false);
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

  // Format date with time (for signatures)
  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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

  // Download content as TXT
  const handleDownloadContent = () => {
    const textContent = contract.extractedText || contract.fullText || contract.content || '';
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${contract.name}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

      {/* Content */}
      {(contract.extractedText || contract.fullText || contract.content) && (
        <div className={styles.section}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3>📄 Vertragsinhalt</h3>
            <button
              className={styles.downloadButton}
              onClick={handleDownloadContent}
              style={{ padding: '8px 16px', fontSize: '0.875rem' }}
            >
              <Download size={16} />
              <span>Als TXT herunterladen</span>
            </button>
          </div>

          <div className={styles.messageBox} style={{ maxHeight: contentExpanded ? 'none' : '200px', overflow: 'hidden', position: 'relative' }}>
            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
              {contract.extractedText || contract.fullText || contract.content}
            </p>
            {!contentExpanded && (contract.extractedText || contract.fullText || contract.content || '').length > 500 && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '60px',
                background: 'linear-gradient(transparent, white)',
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                paddingBottom: '8px'
              }}>
                <button
                  onClick={() => setContentExpanded(true)}
                  style={{
                    background: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 500
                  }}
                >
                  Mehr anzeigen
                </button>
              </div>
            )}
          </div>

          {contentExpanded && (
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
              <button
                onClick={() => setContentExpanded(false)}
                style={{
                  background: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 500
                }}
              >
                Weniger anzeigen
              </button>
            </div>
          )}

          {/* Statistics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '16px', padding: '16px', background: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Zeichen</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                {(contract.extractedText || contract.fullText || contract.content || '').length.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Wörter</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                {(contract.extractedText || contract.fullText || contract.content || '').split(/\s+/).filter(w => w.length > 0).length.toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '4px' }}>Absätze</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 600, color: '#111827' }}>
                {(contract.extractedText || contract.fullText || contract.content || '').split(/\n\s*\n/).filter(p => p.trim().length > 0).length.toLocaleString()}
              </div>
            </div>
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

  // Download Analysis as PDF
  const handleDownloadAnalysisPDF = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/contracts/${contract._id}/analysis-report`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Fehler beim Generieren des Analyse-Reports');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${contract.name}_Analyse.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading analysis PDF:', error);
      alert('Fehler beim Herunterladen des Analyse-Reports');
    }
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
        {/* Download Button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
          <button
            className={styles.downloadButton}
            onClick={handleDownloadAnalysisPDF}
            style={{ padding: '10px 20px', fontSize: '0.9375rem' }}
          >
            <Download size={18} />
            <span>Analyse als PDF herunterladen</span>
          </button>
        </div>

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

        {/* Comparison */}
        {analysis?.comparison && (
          <div className={styles.section}>
            <h3>🔍 Vergleich & Analyse</h3>
            <div className={styles.messageBox}>
              <p>{analysis.comparison}</p>
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

  // Render Signature Tab - Clean scrollable sections (no sub-tabs)
  const renderSignatureTab = () => {
    if (envelopeLoading) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Lade Signatur-Details...</p>
          </div>
        </div>
      );
    }

    if (envelopeError || !envelope) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <AlertCircle size={64} />
            <p>{envelopeError || 'Signatur-Details nicht gefunden'}</p>
          </div>
        </div>
      );
    }

    // Render signature status badge
    const renderSignatureStatusBadge = () => {
      const statusMap: Record<string, { icon: React.ReactNode; className: string; text: string }> = {
        COMPLETED: { icon: <CheckCircle size={16} />, className: styles.statusCompleted, text: 'Vollständig signiert' },
        SENT: { icon: <Clock size={16} />, className: styles.statusSent, text: 'Ausstehend' },
        AWAITING_SIGNER_1: { icon: <Clock size={16} />, className: styles.statusSent, text: 'Wartet auf Unterzeichner 1' },
        AWAITING_SIGNER_2: { icon: <Clock size={16} />, className: styles.statusSent, text: 'Wartet auf Unterzeichner 2' },
        DECLINED: { icon: <XCircle size={16} />, className: styles.statusDeclined, text: 'Abgelehnt' },
        DRAFT: { icon: <FileText size={16} />, className: styles.statusDraft, text: 'Entwurf' },
        EXPIRED: { icon: <AlertCircle size={16} />, className: styles.statusExpired, text: 'Abgelaufen' },
      };

      const status = statusMap[envelope.status] || statusMap.DRAFT;

      return (
        <div className={`${styles.statusBadge} ${status.className}`}>
          {status.icon}
          <span>{status.text}</span>
        </div>
      );
    };

    const eventIcons: Record<string, string> = {
      CREATED: '📝',
      SENT: '📤',
      VIEWED: '👀',
      SIGNED: '✍️',
      DECLINED: '❌',
      PDF_SEALED: '🔒',
      COMPLETED: '✅',
      EXPIRED: '⏰',
      VOIDED: '🚫'
    };

    return (
      <div className={styles.tabContent}>
        {/* Signatur-Details Section */}
        <div className={styles.section}>
          <h3>📋 Signatur-Details</h3>
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.label}>Titel:</span>
              <span className={styles.value}>{envelope.title}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Status:</span>
              <span className={styles.value}>{renderSignatureStatusBadge()}</span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Signaturmodus:</span>
              <span className={styles.value}>
                {envelope.signingMode === 'SEQUENTIAL' ? '📝 Sequenziell' :
                 envelope.signingMode === 'PARALLEL' ? '🔄 Parallel' : '✍️ Einzeln'}
              </span>
            </div>
            <div className={styles.detailItem}>
              <span className={styles.label}>Erstellt am:</span>
              <span className={styles.value}>{formatDateTime(envelope.createdAt)}</span>
            </div>
            {envelope.sentAt && (
              <div className={styles.detailItem}>
                <span className={styles.label}>Versendet am:</span>
                <span className={styles.value}>{formatDateTime(envelope.sentAt)}</span>
              </div>
            )}
            {envelope.completedAt && (
              <div className={styles.detailItem}>
                <span className={styles.label}>Abgeschlossen am:</span>
                <span className={styles.value}>{formatDateTime(envelope.completedAt)}</span>
              </div>
            )}
            <div className={styles.detailItem}>
              <span className={styles.label}>Gültig bis:</span>
              <span className={styles.value}>{formatDateTime(envelope.expiresAt)}</span>
            </div>
          </div>

          {envelope.message && (
            <div className={styles.messageBox} style={{ marginTop: '1rem' }}>
              <strong>Nachricht an Unterzeichner:</strong>
              <p>{envelope.message}</p>
            </div>
          )}
        </div>

        {/* Fortschritt Section */}
        <div className={styles.section}>
          <h3>📊 Signatur-Fortschritt</h3>
          <div className={styles.progressContainer}>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${envelope.stats.progressPercentage}%` }}
              ></div>
            </div>
            <div className={styles.progressStats}>
              <span>✅ {envelope.stats.signersSigned} von {envelope.stats.signersTotal} signiert</span>
              <span>{envelope.stats.progressPercentage}%</span>
            </div>
          </div>
        </div>

        {/* Unterzeichner Section */}
        <div className={styles.section}>
          <h3>👥 Unterzeichner ({envelope.signers.length})</h3>
          <div className={styles.signersGrid}>
            {envelope.signers.map((signer) => (
              <div key={signer._id} className={styles.signerCard}>
                <div className={styles.signerHeader}>
                  <div className={styles.signerInfo}>
                    <strong>{signer.name}</strong>
                    <span className={styles.signerEmail}>{signer.email}</span>
                  </div>
                  <div className={`${styles.signerStatus} ${styles[`status${signer.status}`]}`}>
                    {signer.status === 'SIGNED' && <CheckCircle size={16} />}
                    {signer.status === 'DECLINED' && <XCircle size={16} />}
                    {signer.status === 'PENDING' && <Clock size={16} />}
                    <span>{signer.status === 'SIGNED' ? 'Signiert' : signer.status === 'DECLINED' ? 'Abgelehnt' : 'Ausstehend'}</span>
                  </div>
                </div>
                <div className={styles.signerDetails}>
                  <span className={styles.signerRole}>{signer.role === 'sender' ? '📤 Absender' : '📥 Empfänger'}</span>
                  {envelope.signingMode === 'SEQUENTIAL' && (
                    <span className={styles.signerOrder}>Reihenfolge: {signer.order}</span>
                  )}
                </div>
                {signer.signedAt && (
                  <div className={styles.signerTimestamp}>
                    ✅ Signiert am: {formatDateTime(signer.signedAt)}
                  </div>
                )}
                {signer.declinedAt && (
                  <div className={styles.signerTimestamp}>
                    ❌ Abgelehnt am: {formatDateTime(signer.declinedAt)}
                    {signer.declineReason && <p className={styles.declineReason}>Grund: {signer.declineReason}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* PDF-Dokumente Section */}
        <div className={styles.section}>
          <h3>📄 PDF-Dokumente</h3>

          {/* Original PDF */}
          <div style={{ marginBottom: '2rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: '#4b5563' }}>
              📄 Original PDF
            </h4>
            {originalPdfUrl ? (
              <div>
                <div className={styles.pdfViewerContainer} style={{ maxHeight: '400px' }}>
                  <iframe
                    src={originalPdfUrl}
                    className={styles.pdfViewer}
                    title="Original PDF"
                    style={{ height: '400px' }}
                  />
                </div>
                <div className={styles.pdfActions} style={{ marginTop: '0.75rem' }}>
                  <a href={originalPdfUrl} download className={styles.downloadButton}>
                    <Download size={16} />
                    Original PDF herunterladen
                  </a>
                </div>
              </div>
            ) : (
              <div className={styles.messageBox} style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>
                <FileText size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p style={{ margin: 0, color: '#6b7280' }}>Original PDF nicht verfügbar</p>
              </div>
            )}
          </div>

          {/* Signiertes PDF */}
          <div>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.75rem', color: '#4b5563' }}>
              ✍️ Signiertes PDF
            </h4>
            {signedPdfUrl ? (
              <div>
                <div className={styles.pdfViewerContainer} style={{ maxHeight: '400px' }}>
                  <iframe
                    src={signedPdfUrl}
                    className={styles.pdfViewer}
                    title="Signiertes PDF"
                    style={{ height: '400px' }}
                  />
                </div>
                <div className={styles.pdfActions} style={{ marginTop: '0.75rem' }}>
                  <a href={signedPdfUrl} download className={styles.downloadButton}>
                    <Download size={16} />
                    Signiertes PDF herunterladen
                  </a>
                </div>
              </div>
            ) : (
              <div className={styles.messageBox} style={{ textAlign: 'center', padding: '2rem', background: '#f9fafb' }}>
                <CheckCircle size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
                <p style={{ margin: 0, color: '#6b7280' }}>
                  {envelope.status !== 'COMPLETED'
                    ? 'Das signierte PDF wird erstellt, sobald alle Parteien signiert haben.'
                    : 'Signiertes PDF nicht verfügbar'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Historie Section */}
        <div className={styles.section}>
          <h3>📅 Signatur-Historie</h3>
          <div className={styles.timeline}>
            {envelope.auditTrail && envelope.auditTrail.length > 0 ? (
              envelope.auditTrail.map((event, index) => (
                <div key={index} className={styles.timelineItem}>
                  <div className={styles.timelineIcon}>
                    {eventIcons[event.action] || '📌'}
                  </div>
                  <div className={styles.timelineContent}>
                    <div className={styles.timelineHeader}>
                      <strong>{event.action.replace(/_/g, ' ')}</strong>
                      <span className={styles.timelineTimestamp}>{formatDateTime(event.timestamp)}</span>
                    </div>
                    {event.details && (
                      <div className={styles.timelineDetails}>
                        {event.details.email && <p>👤 {event.details.email}</p>}
                        {event.details.ip && <p>🌐 IP: {event.details.ip}</p>}
                        {event.details.reason && <p>💬 {event.details.reason}</p>}
                        {event.details.signedCount !== undefined && (
                          <p>📊 {event.details.signedCount}/{event.details.totalSigners} Unterzeichner</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <Clock size={64} />
                <p>Keine Historie verfügbar</p>
              </div>
            )}
          </div>
        </div>
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
            {(contract.envelope || contract.signatureEnvelopeId) && (
              <button
                className={`${styles.tabButton} ${activeTab === 'signature' ? styles.tabActive : ''}`}
                onClick={() => setActiveTab('signature')}
              >
                <PenTool size={18} />
                <span>Signierprozess</span>
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className={styles.modalBody}>
            {activeTab === 'overview' && renderOverviewTab()}
            {activeTab === 'pdf' && renderPdfTab()}
            {activeTab === 'analysis' && renderAnalysisTab()}
            {activeTab === 'signature' && renderSignatureTab()}
          </div>
        </div>
      </div>

      {/* Sub-Modals - Wrapped with higher z-index to appear above main modal */}
      <div style={{ position: 'relative', zIndex: 10000 }}>
        <ContractShareModal
          contract={contract}
          onClose={() => setShowShareModal(false)}
          show={showShareModal}
        />

        <ContractEditModal
          contract={contract}
          onClose={() => setShowEditModal(false)}
          onUpdate={(updatedContract: Contract) => {
            setContract(updatedContract);
            if (onEdit) onEdit(updatedContract._id);
            setShowEditModal(false);
          }}
          show={showEditModal}
        />

        {contract.s3Key && (
          <SignatureModal
            show={showSignatureModal}
            onClose={() => setShowSignatureModal(false)}
            contractId={contract._id}
            contractName={contract.name}
            contractS3Key={contract.s3Key}
          />
        )}
      </div>
    </>
  );
};

export default NewContractDetailsModal;
