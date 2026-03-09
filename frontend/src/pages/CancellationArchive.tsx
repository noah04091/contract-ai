// src/pages/CancellationArchive.tsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  XCircle,
  X,
  Download,
  Send,
  FileText,
  Calendar,
  Loader,
  Mail,
  ExternalLink,
  Upload,
  CheckCircle,
  Bell,
  RotateCcw,
  Clock
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import styles from "../styles/CancellationArchive.module.css";

// Provider kann String oder Objekt sein (aus Contract-Analyse)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getProviderName(provider: any): string {
  if (!provider) return "Unbekannter Anbieter";
  if (typeof provider === "string") return provider;
  if (typeof provider === "object") {
    return provider.displayName || provider.name || "Unbekannter Anbieter";
  }
  return String(provider);
}

interface Cancellation {
  id: string;
  contractId?: string;
  contractName: string;
  provider: string | Record<string, unknown>;
  status: string;
  sendMethod: string;
  recipientEmail?: string;
  hasPdf: boolean;
  hasConfirmation?: boolean;
  confirmedAt?: string;
  createdAt: string;
  sentAt?: string;
}

interface CancellationDetail {
  _id: string;
  contractId?: string;
  contractName: string;
  provider: string | Record<string, unknown>;
  status: string;
  sendMethod: string;
  recipientEmail?: string;
  cancellationLetter?: string;
  customerData?: { name?: string; email?: string };
  createdAt: string;
  sentAt?: string;
  resentAt?: string;
  resentTo?: string;
  pdfS3Key?: string;
  confirmedAt?: string;
  confirmationFile?: {
    s3Key: string;
    fileName: string;
    mimeType?: string;
    uploadedAt: string;
  };
  reminderCount?: number;
  lastReminderSentAt?: string;
  reminderHistory?: Array<{ sentAt: string; recipientEmail: string; subject?: string }>;
}

type FilterStatus = "all" | "sent" | "downloaded" | "resent" | "failed" | "draft" | "confirmed" | "revoked";

const statusConfig: Record<string, { label: string; className: string }> = {
  sent: { label: "Gesendet", className: styles.badgeSent },
  downloaded: { label: "Heruntergeladen", className: styles.badgeDownloaded },
  resent: { label: "Erneut gesendet", className: styles.badgeResent },
  failed: { label: "Fehlgeschlagen", className: styles.badgeFailed },
  draft: { label: "Entwurf", className: styles.badgeDraft },
  confirmed: { label: "Bestätigt", className: styles.badgeConfirmed },
  revoked: { label: "Zurückgenommen", className: styles.badgeRevoked },
};

export default function CancellationArchive() {
  const navigate = useNavigate();
  const toast = useToast();
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CancellationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState<string | null>(null);
  const [confirmationUploading, setConfirmationUploading] = useState(false);
  const [confirmationDownloading, setConfirmationDownloading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const token = localStorage.getItem("token");

  const fetchCancellations = async () => {
    try {
      const res = await fetch("/api/cancellations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setCancellations(data.cancellations || []);
      }
    } catch (err) {
      console.error("Fehler beim Laden:", err);
      toast.error("Fehler beim Laden der Kündigungen");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancellations();
  }, []);

  const fetchDetail = async (id: string) => {
    setSelectedId(id);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/cancellations/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDetail(data.cancellation);
      }
    } catch (err) {
      console.error("Detail-Fehler:", err);
      toast.error("Fehler beim Laden der Details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleResend = async () => {
    if (!detail) return;
    setResending(true);
    try {
      const res = await fetch(`/api/cancellations/${detail._id}/resend`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          recipientEmail: detail.recipientEmail
        })
      });
      const data = await res.json();
      if (data.success) {
        setDetail({ ...detail, status: "resent", resentAt: new Date().toISOString() });
        fetchCancellations();
      }
    } catch (err) {
      console.error("Resend-Fehler:", err);
    } finally {
      setResending(false);
    }
  };

  const handlePdfDownload = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPdfDownloading(id);
    try {
      const res = await fetch(`/api/cancellations/${id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const contentType = res.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        const data = await res.json();
        if (data.pdfUrl) {
          window.open(data.pdfUrl, "_blank");
        }
      } else {
        // Direct buffer response
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Kuendigung_${id}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("PDF-Download-Fehler:", err);
      toast.error("PDF konnte nicht heruntergeladen werden");
    } finally {
      setPdfDownloading(null);
    }
  };

  const handleConfirmationUpload = async (file: File) => {
    if (!detail) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Datei ist zu groß (max. 10 MB)");
      return;
    }
    const allowed = ['application/pdf', 'image/jpeg', 'image/png'];
    if (!allowed.includes(file.type)) {
      toast.error("Nur PDF, JPG und PNG Dateien sind erlaubt");
      return;
    }

    setConfirmationUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/cancellations/${detail._id}/confirm`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        setDetail({
          ...detail,
          status: "confirmed",
          confirmedAt: data.confirmedAt || new Date().toISOString(),
          confirmationFile: { s3Key: "", fileName: file.name, uploadedAt: new Date().toISOString() }
        });
        fetchCancellations();
      } else {
        toast.error(data.error || "Upload fehlgeschlagen");
      }
    } catch (err) {
      console.error("Confirmation-Upload-Fehler:", err);
      toast.error("Fehler beim Hochladen der Bestätigung");
    } finally {
      setConfirmationUploading(false);
    }
  };

  const handleConfirmationDownload = async () => {
    if (!detail) return;
    setConfirmationDownloading(true);
    try {
      const res = await fetch(`/api/cancellations/${detail._id}/confirmation`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success && data.url) {
        window.open(data.url, "_blank");
      }
    } catch (err) {
      console.error("Confirmation-Download-Fehler:", err);
    } finally {
      setConfirmationDownloading(false);
    }
  };

  // === Action Handlers für Bestätigung/Erinnern/Zurücknehmen ===
  const handleConfirmReceived = async () => {
    if (!detail) return;
    setActionLoading("confirm");
    try {
      const res = await fetch("/api/cancellations/confirmation-response", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cancellationId: detail._id,
          eventId: "manual",
          confirmed: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setDetail({ ...detail, status: "confirmed", confirmedAt: new Date().toISOString() });
        fetchCancellations();
        toast.success("Kündigungsbestätigung erfolgreich hinterlegt!");
      } else {
        toast.error(data.error || "Fehler bei der Bestätigung");
      }
    } catch (err) {
      console.error("Confirm-Fehler:", err);
      toast.error("Fehler bei der Bestätigung");
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendReminder = async () => {
    if (!detail || !detail.recipientEmail) {
      toast.error("Keine Empfänger-E-Mail vorhanden");
      return;
    }
    setActionLoading("remind");
    try {
      const contractName = detail.contractName || "Vertrag";
      const reminderText = `Sehr geehrte Damen und Herren,\n\nich beziehe mich auf meine Kündigung vom ${new Date(detail.createdAt).toLocaleDateString('de-DE')} bezüglich "${contractName}".\n\nBis heute habe ich leider keine Kündigungsbestätigung von Ihnen erhalten. Ich bitte Sie, mir die Bestätigung der Kündigung umgehend zuzusenden.\n\nSollte ich innerhalb von 14 Tagen keine Rückmeldung erhalten, behalte ich mir weitere Schritte vor.\n\nMit freundlichen Grüßen\n${detail.customerData?.name || ""}`;

      const res = await fetch("/api/cancellations/send-reminder", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          cancellationId: detail._id,
          eventId: "manual",
          recipientEmail: detail.recipientEmail,
          subject: `Erinnerung: Kündigungsbestätigung — ${contractName}`,
          reminderText
        })
      });
      const data = await res.json();
      if (data.success) {
        // Update detail with new reminder
        const newReminder = {
          sentAt: new Date().toISOString(),
          recipientEmail: detail.recipientEmail,
          subject: `Erinnerung: Kündigungsbestätigung — ${contractName}`
        };
        setDetail({
          ...detail,
          reminderCount: (detail.reminderCount || 0) + 1,
          lastReminderSentAt: new Date().toISOString(),
          reminderHistory: [...(detail.reminderHistory || []), newReminder]
        });
        toast.success("Erinnerung an Anbieter versendet!");
      } else {
        toast.error(data.error || "Fehler beim Senden der Erinnerung");
      }
    } catch (err) {
      console.error("Reminder-Fehler:", err);
      toast.error("Fehler beim Senden der Erinnerung");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReactivate = async () => {
    if (!detail) return;
    if (!window.confirm("Möchten Sie die Kündigung wirklich zurücknehmen und den Vertrag reaktivieren?")) return;
    setActionLoading("reactivate");
    try {
      const res = await fetch(`/api/cancellations/${detail._id}/reactivate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setDetail({ ...detail, status: "revoked" });
        fetchCancellations();
        toast.success("Kündigung zurückgenommen — Vertrag reaktiviert!");
      } else {
        toast.error(data.error || "Fehler bei der Reaktivierung");
      }
    } catch (err) {
      console.error("Reactivate-Fehler:", err);
      toast.error("Fehler bei der Reaktivierung");
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = filter === "all"
    ? cancellations
    : cancellations.filter(c => c.status === filter);

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, className: styles.badgeDraft };
    return <span className={`${styles.badge} ${config.className}`}>{config.label}</span>;
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <Loader size={32} className={styles.spinner} />
          <span>Kündigungen werden geladen...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Kündigungsarchiv | Contract AI</title>
      </Helmet>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleRow}>
            <div className={styles.titleIcon}>
              <XCircle size={24} />
            </div>
            <h1 className={styles.title}>
              Kündigungsarchiv
              <span className={styles.countBadge}>{cancellations.length}</span>
            </h1>
          </div>
          <div className={styles.filters}>
            {(["all", "sent", "confirmed", "downloaded", "resent", "failed"] as FilterStatus[]).map(f => (
              <button
                key={f}
                className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Alle" : statusConfig[f]?.label || f}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>
              <FileText size={36} />
            </div>
            <h3 className={styles.emptyTitle}>
              {filter === "all" ? "Noch keine Kündigungen" : "Keine Kündigungen in dieser Kategorie"}
            </h3>
            <p className={styles.emptyText}>
              {filter === "all"
                ? "Sobald Sie einen Vertrag kündigen, erscheint er hier."
                : "Versuchen Sie einen anderen Filter."
              }
            </p>
            {filter === "all" && (
              <button className={styles.emptyBtn} onClick={() => navigate("/contracts")}>
                <FileText size={16} />
                Zu den Verträgen
              </button>
            )}
          </div>
        ) : (
          <div className={styles.grid}>
            {filtered.map(c => (
              <motion.div
                key={c.id}
                className={styles.card}
                onClick={() => fetchDetail(c.id)}
                whileHover={{ y: -2 }}
                layout
              >
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.contractName}>{c.contractName}</h3>
                    <span className={styles.provider}>{getProviderName(c.provider)}</span>
                  </div>
                  {getStatusBadge(c.status)}
                </div>
                <div className={styles.cardMeta}>
                  <span>
                    <Calendar size={12} />
                    {new Date(c.createdAt).toLocaleDateString("de-DE")}
                  </span>
                  {c.sendMethod === "email" && c.recipientEmail && (
                    <span>
                      <Mail size={12} />
                      {c.recipientEmail}
                    </span>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <button
                    className={styles.actionBtn}
                    onClick={(e) => handlePdfDownload(c.id, e)}
                    disabled={pdfDownloading === c.id}
                  >
                    {pdfDownloading === c.id
                      ? <Loader size={12} className={styles.spinner} />
                      : <Download size={12} />
                    }
                    PDF
                  </button>
                  {c.contractId && (
                    <button
                      className={styles.actionBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/contracts/${c.contractId}`);
                      }}
                    >
                      <ExternalLink size={12} />
                      Vertrag
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Detail Modal */}
        <AnimatePresence>
          {selectedId && (
            <motion.div
              className={styles.overlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setSelectedId(null); setDetail(null); setActionLoading(null); setResending(false); setDragOver(false); }}
            >
              <motion.div
                className={styles.modal}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <h3 className={styles.modalTitle}>Kündigungsdetails</h3>
                  <button className={styles.closeBtn} onClick={() => { setSelectedId(null); setDetail(null); setActionLoading(null); setResending(false); setDragOver(false); }}>
                    <X size={16} />
                  </button>
                </div>

                {detailLoading ? (
                  <div className={styles.loading} style={{ padding: "40px" }}>
                    <Loader size={24} className={styles.spinner} />
                  </div>
                ) : detail ? (
                  <>
                    <div className={styles.modalBody}>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Vertrag</span>
                        <span className={styles.detailValue}>{detail.contractName}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Anbieter</span>
                        <span className={styles.detailValue}>{getProviderName(detail.provider)}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Status</span>
                        <span className={styles.detailValue}>{getStatusBadge(detail.status)}</span>
                      </div>
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Erstellt am</span>
                        <span className={styles.detailValue}>
                          {new Date(detail.createdAt).toLocaleDateString("de-DE", {
                            day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                          })}
                        </span>
                      </div>
                      {detail.sentAt && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Gesendet am</span>
                          <span className={styles.detailValue}>
                            {new Date(detail.sentAt).toLocaleDateString("de-DE", {
                              day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                            })}
                          </span>
                        </div>
                      )}
                      {detail.recipientEmail && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Empfänger</span>
                          <span className={styles.detailValue}>{detail.recipientEmail}</span>
                        </div>
                      )}
                      {detail.resentAt && (
                        <div className={styles.detailRow}>
                          <span className={styles.detailLabel}>Erneut gesendet</span>
                          <span className={styles.detailValue}>
                            {new Date(detail.resentAt).toLocaleDateString("de-DE")}
                            {detail.resentTo ? ` an ${detail.resentTo}` : ""}
                          </span>
                        </div>
                      )}
                      <div className={styles.detailRow}>
                        <span className={styles.detailLabel}>Referenz-ID</span>
                        <span className={styles.detailValue} style={{ fontFamily: "monospace", fontSize: "12px" }}>
                          {detail._id}
                        </span>
                      </div>

                      {detail.cancellationLetter && (
                        <div className={styles.letterPreview}>
                          {detail.cancellationLetter}
                        </div>
                      )}

                      {/* Erinnerungsverlauf */}
                      {detail.reminderHistory && detail.reminderHistory.length > 0 && (
                        <div className={styles.reminderHistory}>
                          <h4 className={styles.sectionTitle}>
                            <Clock size={16} />
                            Erinnerungen ({detail.reminderHistory.length})
                          </h4>
                          <div className={styles.reminderList}>
                            {detail.reminderHistory.map((r, i) => (
                              <div key={i} className={styles.reminderItem}>
                                <div className={styles.reminderDot} />
                                <div>
                                  <span className={styles.reminderDate}>
                                    {new Date(r.sentAt).toLocaleDateString("de-DE", {
                                      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                                    })}
                                  </span>
                                  <span className={styles.reminderEmail}>
                                    an {r.recipientEmail}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick Actions */}
                      {detail.status !== "confirmed" && detail.status !== "revoked" && detail.status !== "failed" && (
                        <div className={styles.quickActions}>
                          <h4 className={styles.sectionTitle}>
                            <Bell size={16} />
                            Aktionen
                          </h4>
                          <div className={styles.quickActionButtons}>
                            <button
                              className={`${styles.quickActionBtn} ${styles.quickActionConfirm}`}
                              onClick={handleConfirmReceived}
                              disabled={actionLoading !== null}
                            >
                              {actionLoading === "confirm"
                                ? <Loader size={14} className={styles.spinner} />
                                : <CheckCircle size={14} />
                              }
                              Bestätigung erhalten
                            </button>
                            {detail.recipientEmail && (
                              <button
                                className={`${styles.quickActionBtn} ${styles.quickActionRemind}`}
                                onClick={handleSendReminder}
                                disabled={actionLoading !== null}
                              >
                                {actionLoading === "remind"
                                  ? <Loader size={14} className={styles.spinner} />
                                  : <Send size={14} />
                                }
                                Anbieter erinnern
                              </button>
                            )}
                            <button
                              className={`${styles.quickActionBtn} ${styles.quickActionReactivate}`}
                              onClick={handleReactivate}
                              disabled={actionLoading !== null}
                            >
                              {actionLoading === "reactivate"
                                ? <Loader size={14} className={styles.spinner} />
                                : <RotateCcw size={14} />
                              }
                              Kündigung zurücknehmen
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Bestätigung Upload/Download */}
                      <div className={styles.confirmationSection}>
                        <h4 style={{ margin: '0 0 12px', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <CheckCircle size={16} />
                          Kündigungsbestätigung
                        </h4>
                        {detail.confirmationFile ? (
                          <div className={styles.confirmationDone}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                              <span className={`${styles.badge} ${styles.badgeConfirmed}`}>
                                <CheckCircle size={12} />
                                Bestätigt
                              </span>
                              {detail.confirmedAt && (
                                <span style={{ fontSize: '12px', color: '#6b7280' }}>
                                  am {new Date(detail.confirmedAt).toLocaleDateString("de-DE")}
                                </span>
                              )}
                            </div>
                            <button
                              className={styles.actionBtn}
                              onClick={handleConfirmationDownload}
                              disabled={confirmationDownloading}
                            >
                              {confirmationDownloading
                                ? <Loader size={12} className={styles.spinner} />
                                : <Download size={12} />
                              }
                              {detail.confirmationFile.fileName || "Bestätigung"}
                            </button>
                          </div>
                        ) : (
                          <div
                            className={`${styles.uploadZone} ${dragOver ? styles.uploadZoneDragOver : ''}`}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={(e) => {
                              e.preventDefault();
                              setDragOver(false);
                              const file = e.dataTransfer.files[0];
                              if (file) handleConfirmationUpload(file);
                            }}
                          >
                            {confirmationUploading ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280' }}>
                                <Loader size={16} className={styles.spinner} />
                                <span>Wird hochgeladen...</span>
                              </div>
                            ) : (
                              <>
                                <Upload size={20} style={{ color: '#9ca3af' }} />
                                <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                  Bestätigung hier ablegen oder{' '}
                                  <label style={{ color: '#0071e3', cursor: 'pointer', fontWeight: 500 }}>
                                    Datei auswählen
                                    <input
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png"
                                      style={{ display: 'none' }}
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleConfirmationUpload(file);
                                      }}
                                    />
                                  </label>
                                </span>
                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                  PDF, JPG, PNG — max. 10 MB
                                </span>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.modalActions}>
                      <button
                        className={styles.modalBtn}
                        onClick={() => handlePdfDownload(detail._id)}
                        disabled={pdfDownloading === detail._id}
                      >
                        {pdfDownloading === detail._id
                          ? <Loader size={14} className={styles.spinner} />
                          : <Download size={14} />
                        }
                        PDF herunterladen
                      </button>
                      {detail.recipientEmail && detail.status !== "failed" && (
                        <button
                          className={`${styles.modalBtn} ${styles.modalBtnPrimary}`}
                          onClick={handleResend}
                          disabled={resending}
                        >
                          {resending
                            ? <Loader size={14} className={styles.spinner} />
                            : <Send size={14} />
                          }
                          Erneut senden
                        </button>
                      )}
                    </div>
                  </>
                ) : null}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
