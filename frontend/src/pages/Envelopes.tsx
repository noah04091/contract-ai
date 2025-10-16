import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  Send,
  Copy,
  User,
  FileText,
  Calendar,
  AlertCircle
} from "lucide-react";
import styles from "../styles/Envelopes.module.css";

interface Signer {
  email: string;
  name: string;
  role: string;
  order: number;
  status: "PENDING" | "SIGNED";
  signedAt?: string;
  token: string;
  tokenExpires: string;
}

interface Envelope {
  _id: string;
  ownerId: string;
  contractId?: string;
  title: string;
  message: string;
  s3Key: string;
  s3KeySealed?: string;
  status: "DRAFT" | "SENT" | "SIGNED" | "COMPLETED" | "EXPIRED" | "VOIDED";
  signers: Signer[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

type FilterTab = "all" | "sent" | "signed" | "completed";

export default function Envelopes() {
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Responsive handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load envelopes from API
  useEffect(() => {
    loadEnvelopes();
  }, []);

  const loadEnvelopes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch("/api/envelopes", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Laden der Signaturanfragen");
      }

      console.log("✅ Envelopes loaded:", data);
      setEnvelopes(data.envelopes || []);
    } catch (err) {
      console.error("❌ Error loading envelopes:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filter envelopes based on active tab
  const filteredEnvelopes = envelopes.filter(env => {
    if (activeFilter === "all") return true;
    if (activeFilter === "sent") return env.status === "SENT";
    if (activeFilter === "signed") return env.status === "SIGNED";
    if (activeFilter === "completed") return env.status === "COMPLETED";
    return true;
  });

  // Copy signature link to clipboard
  const handleCopyLink = (token: string) => {
    const signUrl = `${window.location.origin}/sign/${token}`;
    navigator.clipboard.writeText(signUrl);
    alert("📋 Link in die Zwischenablage kopiert!");
  };

  // Send reminder email
  const handleRemind = async (envelopeId: string) => {
    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/envelopes/${envelopeId}/remind`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Senden der Erinnerung");
      }

      alert("✅ Erinnerung erfolgreich versendet!");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      alert(`❌ Fehler: ${errorMessage}`);
    }
  };

  // Cancel envelope
  const handleCancel = async (envelopeId: string) => {
    if (!confirm("Möchten Sie diese Signaturanfrage wirklich stornieren?")) {
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`/api/envelopes/${envelopeId}/void`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Stornieren");
      }

      alert("✅ Signaturanfrage storniert!");
      loadEnvelopes(); // Reload list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      alert(`❌ Fehler: ${errorMessage}`);
    }
  };

  // Get status badge color
  const getStatusColor = (status: Envelope["status"]) => {
    switch (status) {
      case "DRAFT": return styles.statusDraft;
      case "SENT": return styles.statusSent;
      case "SIGNED": return styles.statusSigned;
      case "COMPLETED": return styles.statusCompleted;
      case "EXPIRED": return styles.statusExpired;
      case "VOIDED": return styles.statusVoided;
      default: return styles.statusDefault;
    }
  };

  // Get status label
  const getStatusLabel = (status: Envelope["status"]) => {
    switch (status) {
      case "DRAFT": return "Entwurf";
      case "SENT": return "Gesendet";
      case "SIGNED": return "Signiert";
      case "COMPLETED": return "Abgeschlossen";
      case "EXPIRED": return "Abgelaufen";
      case "VOIDED": return "Storniert";
      default: return status;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  // Get signer progress
  const getSignerProgress = (signers: Signer[]) => {
    const signed = signers.filter(s => s.status === "SIGNED").length;
    const total = signers.length;
    return `${signed}/${total}`;
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
          <p>Lade Signaturanfragen...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorContainer}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h2>Fehler beim Laden</h2>
          <p>{error}</p>
          <button className={styles.retryBtn} onClick={loadEnvelopes}>
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pageContainer}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTitle}>
            <Mail size={32} className={styles.headerIcon} />
            <div>
              <h1>Signaturanfragen</h1>
              <p className={styles.subtitle}>
                Verwalten Sie Ihre digitalen Signaturen
              </p>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className={styles.filterTabs}>
          <button
            className={`${styles.filterTab} ${activeFilter === "all" ? styles.filterTabActive : ""}`}
            onClick={() => setActiveFilter("all")}
          >
            <FileText size={16} />
            Alle ({envelopes.length})
          </button>
          <button
            className={`${styles.filterTab} ${activeFilter === "sent" ? styles.filterTabActive : ""}`}
            onClick={() => setActiveFilter("sent")}
          >
            <Send size={16} />
            Gesendet ({envelopes.filter(e => e.status === "SENT").length})
          </button>
          <button
            className={`${styles.filterTab} ${activeFilter === "signed" ? styles.filterTabActive : ""}`}
            onClick={() => setActiveFilter("signed")}
          >
            <CheckCircle size={16} />
            Signiert ({envelopes.filter(e => e.status === "SIGNED").length})
          </button>
          <button
            className={`${styles.filterTab} ${activeFilter === "completed" ? styles.filterTabActive : ""}`}
            onClick={() => setActiveFilter("completed")}
          >
            <CheckCircle size={16} />
            Abgeschlossen ({envelopes.filter(e => e.status === "COMPLETED").length})
          </button>
        </div>

        {/* Content Section */}
        <div className={styles.section}>
          {filteredEnvelopes.length === 0 ? (
            <div className={styles.emptyState}>
              <Mail size={64} className={styles.emptyIcon} />
              <h3>Keine Signaturanfragen gefunden</h3>
              <p>
                {activeFilter === "all"
                  ? "Sie haben noch keine Signaturanfragen erstellt."
                  : `Keine Signaturanfragen mit Status "${activeFilter}".`}
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View - Cards */}
              {isMobile && (
                <div className={styles.cardsContainer}>
                  <AnimatePresence>
                    {filteredEnvelopes.map((envelope) => (
                      <motion.div
                        key={envelope._id}
                        className={styles.card}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Card Header */}
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>{envelope.title}</h3>
                          <span className={`${styles.statusBadge} ${getStatusColor(envelope.status)}`}>
                            {getStatusLabel(envelope.status)}
                          </span>
                        </div>

                        {/* Card Body */}
                        <div className={styles.cardBody}>
                          <div className={styles.cardRow}>
                            <User size={14} />
                            <span className={styles.cardLabel}>Empfänger:</span>
                            <span className={styles.cardValue}>
                              {getSignerProgress(envelope.signers)} signiert
                            </span>
                          </div>

                          <div className={styles.cardRow}>
                            <Calendar size={14} />
                            <span className={styles.cardLabel}>Erstellt:</span>
                            <span className={styles.cardValue}>
                              {formatDate(envelope.createdAt)}
                            </span>
                          </div>

                          {envelope.expiresAt && (
                            <div className={styles.cardRow}>
                              <Clock size={14} />
                              <span className={styles.cardLabel}>Läuft ab:</span>
                              <span className={styles.cardValue}>
                                {formatDate(envelope.expiresAt)}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Card Actions */}
                        <div className={styles.cardActions}>
                          {envelope.signers.map((signer, idx) => (
                            <button
                              key={idx}
                              className={styles.actionBtnSmall}
                              onClick={() => handleCopyLink(signer.token)}
                              title="Link kopieren"
                            >
                              <Copy size={14} />
                              Link ({signer.name})
                            </button>
                          ))}
                          {envelope.status === "SENT" && (
                            <>
                              <button
                                className={styles.actionBtnSmall}
                                onClick={() => handleRemind(envelope._id)}
                                title="Erinnerung senden"
                              >
                                <Send size={14} />
                                Erinnern
                              </button>
                              <button
                                className={`${styles.actionBtnSmall} ${styles.actionBtnDanger}`}
                                onClick={() => handleCancel(envelope._id)}
                                title="Stornieren"
                              >
                                <XCircle size={14} />
                                Stornieren
                              </button>
                            </>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {/* Desktop View - Table */}
              {!isMobile && (
                <div className={styles.tableContainer}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>Titel</th>
                        <th>Empfänger</th>
                        <th>Status</th>
                        <th>Erstellt</th>
                        <th>Läuft ab</th>
                        <th>Aktionen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEnvelopes.map((envelope) => (
                        <motion.tr
                          key={envelope._id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <td>
                            <div className={styles.titleCell}>
                              <FileText size={16} className={styles.fileIcon} />
                              <span>{envelope.title}</span>
                            </div>
                          </td>
                          <td>
                            <div className={styles.signersCell}>
                              {envelope.signers.map((signer, idx) => (
                                <div key={idx} className={styles.signerRow}>
                                  <span className={styles.signerName}>
                                    {signer.name}
                                  </span>
                                  <span className={`${styles.signerStatus} ${signer.status === "SIGNED" ? styles.signerStatusSigned : ""}`}>
                                    {signer.status === "SIGNED" ? "✓ Signiert" : "○ Ausstehend"}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </td>
                          <td>
                            <span className={`${styles.statusBadge} ${getStatusColor(envelope.status)}`}>
                              {getStatusLabel(envelope.status)}
                            </span>
                          </td>
                          <td>{formatDate(envelope.createdAt)}</td>
                          <td>
                            {envelope.expiresAt ? formatDate(envelope.expiresAt) : "-"}
                          </td>
                          <td>
                            <div className={styles.actionsCell}>
                              {envelope.signers.map((signer, idx) => (
                                <button
                                  key={idx}
                                  className={styles.actionBtn}
                                  onClick={() => handleCopyLink(signer.token)}
                                  title={`Link kopieren für ${signer.name}`}
                                >
                                  <Copy size={14} />
                                </button>
                              ))}
                              {envelope.status === "SENT" && (
                                <>
                                  <button
                                    className={styles.actionBtn}
                                    onClick={() => handleRemind(envelope._id)}
                                    title="Erinnerung senden"
                                  >
                                    <Send size={14} />
                                  </button>
                                  <button
                                    className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                                    onClick={() => handleCancel(envelope._id)}
                                    title="Stornieren"
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
