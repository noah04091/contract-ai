// src/pages/CancellationArchive.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  XCircle,
  X,
  Download,
  Send,
  FileText,
  Loader,
  Mail,
  ExternalLink,
  Upload,
  CheckCircle,
  Bell,
  RotateCcw,
  Clock,
  Search,
  AlertCircle,
  Edit3,
  BarChart3,
  Inbox,
  Archive,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import styles from "../styles/CancellationArchive.module.css";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getProviderName(provider: any): string {
  if (!provider) return "Unbekannter Anbieter";
  if (typeof provider === "string") return provider;
  if (typeof provider === "object") {
    return provider.displayName || provider.name || "Unbekannter Anbieter";
  }
  return String(provider);
}

function getRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Gerade eben";
  if (diffMin < 60) return `vor ${diffMin} Min.`;
  if (diffHrs < 24) return `vor ${diffHrs} Std.`;
  if (diffDays === 1) return "Gestern";
  if (diffDays < 30) return `vor ${diffDays} Tagen`;
  if (diffDays < 365) return `vor ${Math.floor(diffDays / 30)} Mon.`;
  return `vor ${Math.floor(diffDays / 365)} J.`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateLong(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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

const rowIconClass: Record<string, string> = {
  sent: styles.rowStatusIconSent,
  downloaded: styles.rowStatusIconDownloaded,
  resent: styles.rowStatusIconResent,
  failed: styles.rowStatusIconFailed,
  draft: styles.rowStatusIconDraft,
  confirmed: styles.rowStatusIconConfirmed,
  revoked: styles.rowStatusIconRevoked,
};

function StatusIcon({ status, size = 14 }: { status: string; size?: number }) {
  switch (status) {
    case "sent": return <Send size={size} />;
    case "confirmed": return <CheckCircle size={size} />;
    case "downloaded": return <Download size={size} />;
    case "resent": return <Send size={size} />;
    case "failed": return <AlertCircle size={size} />;
    case "draft": return <Edit3 size={size} />;
    case "revoked": return <RotateCcw size={size} />;
    default: return <FileText size={size} />;
  }
}

function getMethodLabel(method: string): string {
  switch (method) {
    case "email": return "E-Mail";
    case "download": return "Download";
    case "fax": return "Fax";
    case "post": return "Post";
    default: return method;
  }
}

export default function CancellationArchive() {
  const navigate = useNavigate();
  const toast = useToast();
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
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
        body: JSON.stringify({ recipientEmail: detail.recipientEmail })
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
        if (data.pdfUrl) window.open(data.pdfUrl, "_blank");
      } else {
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
      if (data.success && data.url) window.open(data.url, "_blank");
    } catch (err) {
      console.error("Confirmation-Download-Fehler:", err);
    } finally {
      setConfirmationDownloading(false);
    }
  };

  const handleConfirmReceived = async () => {
    if (!detail) return;
    setActionLoading("confirm");
    try {
      const res = await fetch("/api/cancellations/confirmation-response", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ cancellationId: detail._id, eventId: "manual", confirmed: true })
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
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
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

  // --- Computed ---
  const stats = useMemo(() => {
    const total = cancellations.length;
    const confirmed = cancellations.filter(c => c.status === "confirmed").length;
    const pending = cancellations.filter(c => ["sent", "downloaded", "resent"].includes(c.status)).length;
    const revoked = cancellations.filter(c => c.status === "revoked").length;
    return { total, confirmed, pending, revoked };
  }, [cancellations]);

  const filterCounts = useMemo(() => {
    const counts: Record<string, number> = { all: cancellations.length };
    cancellations.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return counts;
  }, [cancellations]);

  const filtered = useMemo(() => {
    let result = filter === "all" ? cancellations : cancellations.filter(c => c.status === filter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        c.contractName.toLowerCase().includes(q) ||
        getProviderName(c.provider).toLowerCase().includes(q) ||
        (c.recipientEmail && c.recipientEmail.toLowerCase().includes(q))
      );
    }
    return result;
  }, [cancellations, filter, searchQuery]);

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || { label: status, className: styles.badgeDraft };
    return <span className={`${styles.badge} ${config.className}`}>{config.label}</span>;
  };

  const closeModal = () => {
    setSelectedId(null);
    setDetail(null);
    setActionLoading(null);
    setResending(false);
    setDragOver(false);
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
        {/* Page Header */}
        <div className={styles.pageHeader}>
          <div className={styles.pageHeaderTop}>
            <div className={styles.titleSection}>
              <div className={styles.titleIcon}>
                <XCircle size={22} />
              </div>
              <div className={styles.titleText}>
                <h1>Kündigungsarchiv</h1>
                <p className={styles.subtitle}>Verwalten und verfolgen Sie Ihre Vertragskündigungen</p>
              </div>
            </div>
            <div className={styles.headerActions}>
              <div className={styles.searchField}>
                <Search size={15} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="Vertrag, Anbieter oder E-Mail..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className={styles.statsRow}>
            <div
              className={`${styles.statCard} ${filter === "all" ? styles.statCardActive : ""}`}
              onClick={() => setFilter("all")}
            >
              <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
                <BarChart3 size={18} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statNumber}>{stats.total}</span>
                <span className={styles.statLabel}>Gesamt</span>
              </div>
            </div>
            <div
              className={`${styles.statCard} ${filter === "confirmed" ? styles.statCardActive : ""}`}
              onClick={() => setFilter("confirmed")}
            >
              <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
                <CheckCircle size={18} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statNumber}>{stats.confirmed}</span>
                <span className={styles.statLabel}>Bestätigt</span>
              </div>
            </div>
            <div
              className={`${styles.statCard} ${filter === "sent" ? styles.statCardActive : ""}`}
              onClick={() => setFilter("sent")}
            >
              <div className={`${styles.statIconWrap} ${styles.statIconAmber}`}>
                <Inbox size={18} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statNumber}>{stats.pending}</span>
                <span className={styles.statLabel}>Ausstehend</span>
              </div>
            </div>
            <div
              className={`${styles.statCard} ${filter === "revoked" ? styles.statCardActive : ""}`}
              onClick={() => setFilter("revoked")}
            >
              <div className={`${styles.statIconWrap} ${styles.statIconGray}`}>
                <Archive size={18} />
              </div>
              <div className={styles.statInfo}>
                <span className={styles.statNumber}>{stats.revoked}</span>
                <span className={styles.statLabel}>Zurückgenommen</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className={styles.toolbar}>
            <div className={styles.filters}>
              {(["all", "sent", "confirmed", "downloaded", "resent", "failed"] as FilterStatus[]).map(f => (
                <button
                  key={f}
                  className={`${styles.filterBtn} ${filter === f ? styles.filterBtnActive : ""}`}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "Alle" : statusConfig[f]?.label || f}
                  {(filterCounts[f] ?? 0) > 0 && (
                    <span className={styles.filterCount}>{filterCounts[f]}</span>
                  )}
                </button>
              ))}
            </div>
            <span className={styles.resultCount}>
              {filtered.length} {filtered.length === 1 ? "Ergebnis" : "Ergebnisse"}
            </span>
          </div>
        </div>

        {/* Content */}
        {filtered.length === 0 ? (
          <motion.div
            className={styles.emptyState}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className={styles.emptyIconWrap}>
              <div className={styles.emptyIconPulse} />
              <div className={styles.emptyIcon}>
                <FileText size={32} />
              </div>
            </div>
            <h3 className={styles.emptyTitle}>
              {filter === "all" && !searchQuery
                ? "Noch keine Kündigungen"
                : searchQuery
                  ? "Keine Ergebnisse"
                  : "Keine Kündigungen in dieser Kategorie"
              }
            </h3>
            <p className={styles.emptyText}>
              {filter === "all" && !searchQuery
                ? "Sobald Sie einen Vertrag kündigen, erscheint er hier."
                : searchQuery
                  ? `Keine Treffer für "${searchQuery}".`
                  : "Versuchen Sie einen anderen Filter."
              }
            </p>
            {filter === "all" && !searchQuery && (
              <button className={styles.emptyBtn} onClick={() => navigate("/contracts")}>
                <FileText size={15} />
                Zu den Verträgen
              </button>
            )}
          </motion.div>
        ) : (
          <div className={styles.tableWrap}>
            {/* Table Header */}
            <div className={styles.tableHeader}>
              <div className={styles.tableHeaderCell} />
              <div className={styles.tableHeaderCell}>Vertrag</div>
              <div className={styles.tableHeaderCell}>Datum</div>
              <div className={styles.tableHeaderCell}>Versand</div>
              <div className={styles.tableHeaderCell}>Status</div>
              <div className={styles.tableHeaderCell} />
            </div>

            {/* Table Rows */}
            {filtered.map((c, i) => (
              <motion.div
                key={c.id}
                className={styles.tableRow}
                onClick={() => fetchDetail(c.id)}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03, duration: 0.2 }}
              >
                {/* Status Icon */}
                <div className={`${styles.rowStatusIcon} ${rowIconClass[c.status] || styles.rowStatusIconDraft}`}>
                  <StatusIcon status={c.status} />
                </div>

                {/* Contract + Provider */}
                <div className={styles.rowContract}>
                  <span className={styles.rowContractName}>{c.contractName}</span>
                  <span className={styles.rowProvider}>{getProviderName(c.provider)}</span>
                </div>

                {/* Date */}
                <div className={styles.rowDate}>
                  <span className={styles.rowDateRelative} title={formatDateLong(c.createdAt)}>
                    {getRelativeTime(c.createdAt)}
                  </span>
                  <div className={styles.rowDateAbsolute}>{formatDate(c.createdAt)}</div>
                </div>

                {/* Method */}
                <div className={styles.rowMethod}>
                  <Mail size={13} className={styles.rowMethodIcon} />
                  <span className={styles.rowMethodText}>
                    {c.sendMethod === "email" && c.recipientEmail
                      ? c.recipientEmail
                      : getMethodLabel(c.sendMethod)
                    }
                  </span>
                </div>

                {/* Status Badge */}
                <div>{getStatusBadge(c.status)}</div>

                {/* Actions */}
                <div className={styles.rowActions}>
                  <button
                    className={styles.rowActionBtn}
                    title="PDF herunterladen"
                    onClick={(e) => handlePdfDownload(c.id, e)}
                    disabled={pdfDownloading === c.id}
                  >
                    {pdfDownloading === c.id
                      ? <Loader size={14} className={styles.spinner} />
                      : <Download size={14} />
                    }
                  </button>
                  {c.contractId && (
                    <button
                      className={styles.rowActionBtn}
                      title="Vertrag öffnen"
                      onClick={(e) => { e.stopPropagation(); navigate(`/contracts/${c.contractId}`); }}
                    >
                      <ExternalLink size={14} />
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
              onClick={closeModal}
            >
              <motion.div
                className={styles.modal}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16 }}
                transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                onClick={e => e.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <div className={styles.modalHeaderLeft}>
                    <h3 className={styles.modalTitle}>Kündigungsdetails</h3>
                    {detail && getStatusBadge(detail.status)}
                  </div>
                  <button className={styles.closeBtn} onClick={closeModal}>
                    <X size={18} />
                  </button>
                </div>

                {detailLoading ? (
                  <div className={styles.loading} style={{ padding: "40px" }}>
                    <Loader size={24} className={styles.spinner} />
                  </div>
                ) : detail ? (
                  <>
                    <div className={styles.modalBody}>
                      {/* Info Grid */}
                      <div className={styles.infoGrid}>
                        <div className={styles.infoCell}>
                          <div className={styles.infoLabel}>Vertrag</div>
                          <div className={styles.infoValue}>{detail.contractName}</div>
                        </div>
                        <div className={styles.infoCell}>
                          <div className={styles.infoLabel}>Anbieter</div>
                          <div className={styles.infoValue}>{getProviderName(detail.provider)}</div>
                        </div>
                        <div className={styles.infoCell}>
                          <div className={styles.infoLabel}>Erstellt</div>
                          <div className={styles.infoValue}>
                            {new Date(detail.createdAt).toLocaleDateString("de-DE", {
                              day: "2-digit", month: "long", year: "numeric"
                            })}
                          </div>
                        </div>
                        <div className={styles.infoCell}>
                          <div className={styles.infoLabel}>
                            {detail.sentAt ? "Gesendet" : "Empfänger"}
                          </div>
                          <div className={styles.infoValue}>
                            {detail.sentAt
                              ? new Date(detail.sentAt).toLocaleDateString("de-DE", {
                                  day: "2-digit", month: "long", year: "numeric"
                                })
                              : detail.recipientEmail || "—"
                            }
                          </div>
                        </div>
                        {detail.recipientEmail && detail.sentAt && (
                          <div className={`${styles.infoCell} ${styles.infoCellFull}`}>
                            <div className={styles.infoLabel}>Empfänger</div>
                            <div className={styles.infoValue}>{detail.recipientEmail}</div>
                          </div>
                        )}
                        {detail.resentAt && (
                          <div className={`${styles.infoCell} ${styles.infoCellFull}`}>
                            <div className={styles.infoLabel}>Erneut gesendet</div>
                            <div className={styles.infoValue}>
                              {new Date(detail.resentAt).toLocaleDateString("de-DE")}
                              {detail.resentTo ? ` an ${detail.resentTo}` : ""}
                            </div>
                          </div>
                        )}
                        <div className={`${styles.infoCell} ${styles.infoCellFull}`}>
                          <div className={styles.infoLabel}>Referenz-ID</div>
                          <div className={`${styles.infoValue} ${styles.infoValueMono}`}>
                            {detail._id}
                          </div>
                        </div>
                      </div>

                      {/* Letter Preview */}
                      {detail.cancellationLetter && (
                        <div className={styles.letterPreview}>
                          <div className={styles.letterPreviewHeader}>
                            <FileText size={13} />
                            Kündigungsschreiben
                          </div>
                          {detail.cancellationLetter}
                        </div>
                      )}

                      {/* Reminders */}
                      {detail.reminderHistory && detail.reminderHistory.length > 0 && (
                        <div className={styles.sectionBlock}>
                          <h4 className={styles.sectionTitle}>
                            <Clock size={13} />
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
                                  <span className={styles.reminderEmail}>an {r.recipientEmail}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Quick Actions */}
                      {detail.status !== "confirmed" && detail.status !== "revoked" && detail.status !== "failed" && (
                        <div className={styles.sectionBlock}>
                          <h4 className={styles.sectionTitle}>
                            <Bell size={13} />
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
                              Zurücknehmen
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Confirmation Upload/Download */}
                      <div className={styles.sectionBlock}>
                        <h4 className={styles.sectionTitle}>
                          <CheckCircle size={13} />
                          Kündigungsbestätigung
                        </h4>
                        {detail.confirmationFile ? (
                          <div className={styles.confirmationDone}>
                            <div className={styles.confirmationMeta}>
                              <span className={`${styles.badge} ${styles.badgeConfirmed}`}>
                                <CheckCircle size={11} />
                                Bestätigt
                              </span>
                              {detail.confirmedAt && (
                                <span className={styles.confirmationDate}>
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
                              <div className={styles.uploadingState}>
                                <Loader size={16} className={styles.spinner} />
                                <span>Wird hochgeladen...</span>
                              </div>
                            ) : (
                              <>
                                <Upload size={20} className={styles.uploadIcon} />
                                <span className={styles.uploadText}>
                                  Bestätigung hier ablegen oder{' '}
                                  <label className={styles.uploadLink}>
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
                                <span className={styles.uploadHint}>PDF, JPG, PNG — max. 10 MB</span>
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
