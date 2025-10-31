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
  AlertCircle,
  X,
  Activity,
  Eye
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [selectedEnvelope, setSelectedEnvelope] = useState<Envelope | null>(null);

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

  // Generate timeline events for drawer
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateTimelineEvents = (envelope: Envelope) => {
    const events = [];

    // Envelope created
    events.push({
      type: "completed",
      title: "Signaturanfrage erstellt",
      description: `Dokument "${envelope.title}" wurde hochgeladen und vorbereitet`,
      time: envelope.createdAt
    });

    // Envelope sent
    if (envelope.status !== "DRAFT") {
      events.push({
        type: "completed",
        title: "Versandt an Empfänger",
        description: `E-Mail wurde an ${envelope.signers.length} Empfänger versendet`,
        time: envelope.createdAt
      });
    }

    // Signer activities
    envelope.signers.forEach(signer => {
      if (signer.status === "SIGNED" && signer.signedAt) {
        events.push({
          type: "completed",
          title: `Unterschrift von ${signer.name}`,
          description: `${signer.email} hat das Dokument unterschrieben`,
          time: signer.signedAt
        });
      } else if (envelope.status === "SENT") {
        events.push({
          type: "pending",
          title: `Warte auf ${signer.name}`,
          description: `${signer.email} hat noch nicht unterschrieben`,
          time: signer.tokenExpires
        });
      }
    });

    // Envelope completed
    if (envelope.status === "COMPLETED") {
      events.push({
        type: "completed",
        title: "Vollständig abgeschlossen",
        description: "Alle Unterschriften wurden gesammelt",
        time: envelope.updatedAt
      });
    }

    // Envelope expired
    if (envelope.status === "EXPIRED") {
      events.push({
        type: "completed",
        title: "Abgelaufen",
        description: "Die Signaturanfrage ist abgelaufen",
        time: envelope.expiresAt || envelope.updatedAt
      });
    }

    // Envelope voided
    if (envelope.status === "VOIDED") {
      events.push({
        type: "completed",
        title: "Storniert",
        description: "Die Signaturanfrage wurde storniert",
        time: envelope.updatedAt
      });
    }

    // Sort by time (newest first)
    return events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
  };

  // Format date and time
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
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
                        onClick={() => setSelectedEnvelope(envelope)}
                        style={{ cursor: "pointer" }}
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
                          onClick={() => setSelectedEnvelope(envelope)}
                          style={{ cursor: "pointer" }}
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

      {/* Detail Drawer */}
      <AnimatePresence>
        {selectedEnvelope && (
          <>
            {/* Overlay */}
            <motion.div
              className={styles.drawerOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedEnvelope(null)}
            />

            {/* Drawer */}
            <motion.div
              className={styles.drawer}
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            >
              {/* Header */}
              <div className={styles.drawerHeader}>
                <div className={styles.drawerTitle}>
                  <h2>{selectedEnvelope.title}</h2>
                  <p className={styles.drawerSubtitle}>
                    Signaturanfrage-Details
                  </p>
                </div>
                <button
                  className={styles.closeBtn}
                  onClick={() => setSelectedEnvelope(null)}
                  aria-label="Schließen"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className={styles.drawerContent}>
                {/* Info Grid */}
                <div className={styles.drawerSection}>
                  <div className={styles.infoGrid}>
                    <div className={styles.infoCard}>
                      <p className={styles.infoLabel}>
                        <FileText size={14} />
                        Status
                      </p>
                      <p className={styles.infoValue}>
                        {getStatusLabel(selectedEnvelope.status)}
                      </p>
                    </div>
                    <div className={styles.infoCard}>
                      <p className={styles.infoLabel}>
                        <User size={14} />
                        Empfänger
                      </p>
                      <p className={styles.infoValue}>
                        {getSignerProgress(selectedEnvelope.signers)} signiert
                      </p>
                    </div>
                    <div className={styles.infoCard}>
                      <p className={styles.infoLabel}>
                        <Calendar size={14} />
                        Erstellt
                      </p>
                      <p className={styles.infoValue}>
                        {formatDate(selectedEnvelope.createdAt)}
                      </p>
                    </div>
                    <div className={styles.infoCard}>
                      <p className={styles.infoLabel}>
                        <Clock size={14} />
                        Läuft ab
                      </p>
                      <p className={styles.infoValue}>
                        {selectedEnvelope.expiresAt
                          ? formatDate(selectedEnvelope.expiresAt)
                          : "Kein Ablaufdatum"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Document Preview */}
                <div className={styles.drawerSection}>
                  <h3 className={styles.sectionTitle}>
                    <FileText size={18} />
                    Dokument
                  </h3>
                  <div className={styles.documentPreview}>
                    <Eye size={48} className={styles.documentIcon} />
                    <strong>{selectedEnvelope.title}</strong>
                    <p>
                      Klicken Sie auf "Dokument ansehen", um die PDF-Vorschau zu öffnen
                    </p>
                  </div>
                </div>

                {/* Signer Details */}
                <div className={styles.drawerSection}>
                  <h3 className={styles.sectionTitle}>
                    <User size={18} />
                    Unterzeichner ({selectedEnvelope.signers.length})
                  </h3>
                  <div className={styles.signerDetailsList}>
                    {selectedEnvelope.signers.map((signer, idx) => (
                      <div
                        key={idx}
                        className={`${styles.signerDetailCard} ${
                          signer.status === "SIGNED" ? styles.signed : styles.pending
                        }`}
                      >
                        <div className={styles.signerHeader}>
                          <div className={styles.signerInfo}>
                            <h4 className={styles.signerName}>{signer.name}</h4>
                            <p className={styles.signerEmail}>{signer.email}</p>
                          </div>
                          <span
                            className={`${styles.signerBadge} ${
                              signer.status === "SIGNED"
                                ? styles.signed
                                : styles.pending
                            }`}
                          >
                            {signer.status === "SIGNED" ? (
                              <>
                                <CheckCircle size={14} />
                                Signiert
                              </>
                            ) : (
                              <>
                                <Clock size={14} />
                                Ausstehend
                              </>
                            )}
                          </span>
                        </div>
                        <div className={styles.signerMeta}>
                          <div className={styles.signerMetaRow}>
                            <User size={14} />
                            <span>Rolle: {signer.role}</span>
                          </div>
                          <div className={styles.signerMetaRow}>
                            <Calendar size={14} />
                            <span>Reihenfolge: #{signer.order}</span>
                          </div>
                          {signer.status === "SIGNED" && signer.signedAt && (
                            <div className={styles.signerMetaRow}>
                              <CheckCircle size={14} />
                              <span>
                                Signiert am: {formatDateTime(signer.signedAt)}
                              </span>
                            </div>
                          )}
                          {signer.status === "PENDING" && (
                            <div className={styles.signerMetaRow}>
                              <Clock size={14} />
                              <span>
                                Link läuft ab: {formatDateTime(signer.tokenExpires)}
                              </span>
                            </div>
                          )}
                        </div>
                        {signer.status === "PENDING" && (
                          <div className={styles.signerActions}>
                            <button
                              className={styles.actionBtnSmall}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(signer.token);
                              }}
                            >
                              <Copy size={14} />
                              Link kopieren
                            </button>
                            <button
                              className={styles.actionBtnSmall}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemind(selectedEnvelope._id);
                              }}
                            >
                              <Send size={14} />
                              Erinnern
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Timeline */}
                <div className={styles.drawerSection}>
                  <h3 className={styles.sectionTitle}>
                    <Activity size={18} />
                    Aktivitätsverlauf
                  </h3>
                  <div className={styles.timeline}>
                    {generateTimelineEvents(selectedEnvelope).map((event, idx) => (
                      <div
                        key={idx}
                        className={`${styles.timelineItem} ${
                          event.type === "completed"
                            ? styles.completed
                            : styles.pending
                        }`}
                      >
                        <div className={styles.timelineContent}>
                          <h4 className={styles.timelineTitle}>{event.title}</h4>
                          <p className={styles.timelineDescription}>
                            {event.description}
                          </p>
                          <p className={styles.timelineTime}>
                            <Clock size={12} />
                            {formatDateTime(event.time)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
