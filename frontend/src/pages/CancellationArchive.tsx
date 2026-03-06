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
  CheckCircle,
  AlertCircle,
  Clock
} from "lucide-react";
import styles from "../styles/CancellationArchive.module.css";

interface Cancellation {
  id: string;
  contractId?: string;
  contractName: string;
  provider: string;
  status: string;
  sendMethod: string;
  recipientEmail?: string;
  hasPdf: boolean;
  createdAt: string;
  sentAt?: string;
}

interface CancellationDetail {
  _id: string;
  contractName: string;
  provider: string;
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
}

type FilterStatus = "all" | "sent" | "downloaded" | "resent" | "failed" | "draft";

const statusConfig: Record<string, { label: string; className: string }> = {
  sent: { label: "Gesendet", className: styles.badgeSent },
  downloaded: { label: "Heruntergeladen", className: styles.badgeDownloaded },
  resent: { label: "Erneut gesendet", className: styles.badgeResent },
  failed: { label: "Fehlgeschlagen", className: styles.badgeFailed },
  draft: { label: "Entwurf", className: styles.badgeDraft },
};

export default function CancellationArchive() {
  const navigate = useNavigate();
  const [cancellations, setCancellations] = useState<Cancellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<CancellationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState<string | null>(null);

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
    } finally {
      setPdfDownloading(null);
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
            {(["all", "sent", "downloaded", "resent", "failed"] as FilterStatus[]).map(f => (
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
                    <span className={styles.provider}>{c.provider || "Unbekannter Anbieter"}</span>
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
              onClick={() => { setSelectedId(null); setDetail(null); }}
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
                  <button className={styles.closeBtn} onClick={() => { setSelectedId(null); setDetail(null); }}>
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
                        <span className={styles.detailValue}>{detail.provider || "–"}</span>
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
