// 🎨 Contract Detail Modal - Professional contract details viewer
import React, { useState, useEffect } from 'react';
import { X, FileText, Clock, Users, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import styles from './ContractDetailModal.module.css';

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

interface ContractDetailModalProps {
  envelopeId: string;
  onClose: () => void;
}

type TabType = 'overview' | 'original' | 'signed' | 'history';

const ContractDetailModal: React.FC<ContractDetailModalProps> = ({ envelopeId, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [envelope, setEnvelope] = useState<EnvelopeDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [originalPdfUrl, setOriginalPdfUrl] = useState<string | null>(null);
  const [signedPdfUrl, setSignedPdfUrl] = useState<string | null>(null);

  // 📥 Load envelope details
  useEffect(() => {
    const loadEnvelope = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem('token');

        const response = await fetch(`/api/envelopes/${envelopeId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (!response.ok) {
          throw new Error('Fehler beim Laden der Details');
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
        setError(err instanceof Error ? err.message : 'Fehler beim Laden');
      } finally {
        setLoading(false);
      }
    };

    loadEnvelope();
  }, [envelopeId]);

  // ⌨️ ESC key to close
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  if (loading) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.loadingContainer}>
            <div className={styles.spinner}></div>
            <p>Lade Details...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !envelope) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
          <div className={styles.errorContainer}>
            <AlertCircle size={48} />
            <p>{error || 'Envelope nicht gefunden'}</p>
            <button onClick={onClose} className={styles.closeButton}>Schließen</button>
          </div>
        </div>
      </div>
    );
  }

  // 🎨 Render status badge
  const renderStatusBadge = () => {
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

  // 📅 Format date helper
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('de-DE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 🎨 Render Overview Tab
  const renderOverviewTab = () => (
    <div className={styles.tabContent}>
      <div className={styles.section}>
        <h3>📋 Vertragsdetails</h3>
        <div className={styles.detailsGrid}>
          <div className={styles.detailItem}>
            <span className={styles.label}>Titel:</span>
            <span className={styles.value}>{envelope.title}</span>
          </div>
          <div className={styles.detailItem}>
            <span className={styles.label}>Status:</span>
            <span className={styles.value}>{renderStatusBadge()}</span>
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
            <span className={styles.value}>{formatDate(envelope.createdAt)}</span>
          </div>
          {envelope.sentAt && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Versendet am:</span>
              <span className={styles.value}>{formatDate(envelope.sentAt)}</span>
            </div>
          )}
          {envelope.completedAt && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Abgeschlossen am:</span>
              <span className={styles.value}>{formatDate(envelope.completedAt)}</span>
            </div>
          )}
          <div className={styles.detailItem}>
            <span className={styles.label}>Gültig bis:</span>
            <span className={styles.value}>{formatDate(envelope.expiresAt)}</span>
          </div>
        </div>

        {envelope.message && (
          <div className={styles.messageBox}>
            <strong>Nachricht an Unterzeichner:</strong>
            <p>{envelope.message}</p>
          </div>
        )}
      </div>

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
                  ✅ Signiert am: {formatDate(signer.signedAt)}
                </div>
              )}
              {signer.declinedAt && (
                <div className={styles.signerTimestamp}>
                  ❌ Abgelehnt am: {formatDate(signer.declinedAt)}
                  {signer.declineReason && <p className={styles.declineReason}>Grund: {signer.declineReason}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 🎨 Render PDF Viewer Tab
  const renderPdfTab = (url: string | null, type: 'original' | 'signed') => {
    if (!url) {
      return (
        <div className={styles.tabContent}>
          <div className={styles.emptyState}>
            <FileText size={64} />
            <p>{type === 'signed' ? 'Kein signiertes PDF verfügbar' : 'PDF nicht gefunden'}</p>
            {type === 'signed' && envelope.status !== 'COMPLETED' && (
              <span className={styles.hint}>Das signierte PDF wird erstellt, sobald alle Parteien signiert haben.</span>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={styles.tabContent}>
        <div className={styles.pdfViewerContainer}>
          <iframe
            src={url}
            className={styles.pdfViewer}
            title={`${type === 'signed' ? 'Signiertes' : 'Original'} PDF`}
          />
          <div className={styles.pdfActions}>
            <a href={url} download className={styles.downloadButton}>
              📥 {type === 'signed' ? 'Signiertes PDF' : 'Original PDF'} herunterladen
            </a>
          </div>
        </div>
      </div>
    );
  };

  // 🎨 Render History Timeline Tab
  const renderHistoryTab = () => {
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
                      <span className={styles.timelineTimestamp}>{formatDate(event.timestamp)}</span>
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
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.headerLeft}>
            <FileText size={24} />
            <div>
              <h2>{envelope.title}</h2>
              <p className={styles.contractName}>{envelope.contractId?.name || 'Vertrag'}</p>
            </div>
          </div>
          <button onClick={onClose} className={styles.closeBtn} aria-label="Schließen">
            <X size={24} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={styles.tabNav}>
          <button
            className={`${styles.tabButton} ${activeTab === 'overview' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Users size={18} />
            <span>Übersicht</span>
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'original' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('original')}
          >
            <FileText size={18} />
            <span>Original PDF</span>
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'signed' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('signed')}
            disabled={!envelope.s3KeySealed}
          >
            <CheckCircle size={18} />
            <span>Signiertes PDF</span>
            {!envelope.s3KeySealed && <span className={styles.tabDisabled}>(nicht verfügbar)</span>}
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'history' ? styles.tabActive : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={18} />
            <span>Historie</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className={styles.modalBody}>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'original' && renderPdfTab(originalPdfUrl, 'original')}
          {activeTab === 'signed' && renderPdfTab(signedPdfUrl, 'signed')}
          {activeTab === 'history' && renderHistoryTab()}
        </div>
      </div>
    </div>
  );
};

export default ContractDetailModal;
