import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link, Copy, Check, Plus, ArrowLeft, MessageSquare, Clock, CheckCircle, Star, ExternalLink } from "lucide-react";
import styles from "./RefundFeedbackAdmin.module.css";

const API_URL = import.meta.env.VITE_API_URL || "https://api.contract-ai.de";

interface Feedback {
  _id: string;
  token: string;
  customerName: string;
  customerEmail: string;
  subscriptionPlan: string;
  status: "pending" | "submitted" | "refunded";
  overallRating?: number;
  cancellationReason?: string;
  usedFeatures?: string[];
  additionalReasons?: string[];
  featureRatings?: Record<string, number>;
  expectedFeatures?: string;
  positiveFeedback?: string;
  negativeFeedback?: string;
  npsScore?: number;
  suggestions?: string;
  createdAt: string;
  submittedAt?: string;
}

export default function RefundFeedbackAdmin() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Form
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("Business");
  const [creating, setCreating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");

  // Detail View
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);

  const token = localStorage.getItem("token");

  // Load feedbacks
  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    try {
      const res = await fetch(`${API_URL}/api/refund-feedback/admin/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setFeedbacks(data.feedbacks);
      }
    } catch {
      console.error("Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  };

  // Create feedback link
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setGeneratedUrl("");

    if (!customerName.trim() || !customerEmail.trim()) {
      setError("Name und E-Mail sind erforderlich.");
      return;
    }

    setCreating(true);
    try {
      const res = await fetch(`${API_URL}/api/refund-feedback/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ customerName, customerEmail, subscriptionPlan }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedUrl(data.url);
        loadFeedbacks();
      } else {
        setError(data.error || "Fehler beim Erstellen.");
      }
    } catch {
      setError("Verbindungsfehler.");
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = generatedUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setCustomerName("");
    setCustomerEmail("");
    setSubscriptionPlan("Business");
    setGeneratedUrl("");
    setError("");
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const statusBadge = (s: string) => {
    switch (s) {
      case "pending":
        return <span className={`${styles.badge} ${styles.badgePending}`}><Clock size={12} /> Ausstehend</span>;
      case "submitted":
        return <span className={`${styles.badge} ${styles.badgeSubmitted}`}><CheckCircle size={12} /> Eingegangen</span>;
      case "refunded":
        return <span className={`${styles.badge} ${styles.badgeRefunded}`}><Check size={12} /> Erstattet</span>;
      default:
        return null;
    }
  };

  return (
    <>
      <Helmet><title>Refund Feedback | Admin</title></Helmet>

      <div className={styles.container}>
        <div className={styles.inner}>
          {/* Header */}
          <div className={styles.pageHeader}>
            <div>
              <h1 className={styles.pageTitle}>Refund Feedback</h1>
              <p className={styles.pageSubtitle}>Feedback-Links erstellen und Antworten einsehen</p>
            </div>
            <button
              className={styles.createButton}
              onClick={() => { setShowForm(!showForm); resetForm(); }}
            >
              <Plus size={18} />
              Neuen Link erstellen
            </button>
          </div>

          {/* Create Form */}
          <AnimatePresence>
            {showForm && (
              <motion.div
                className={styles.formCard}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h2 className={styles.formTitle}>Feedback-Link erstellen</h2>
                <p className={styles.formDesc}>
                  Gib die Daten des Kunden ein. Du bekommst einen Link, den du per E-Mail versenden kannst.
                </p>

                <form onSubmit={handleCreate} className={styles.form}>
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Kundenname *</label>
                      <input
                        type="text"
                        className={styles.input}
                        placeholder="Max Mustermann"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>E-Mail *</label>
                      <input
                        type="email"
                        className={styles.input}
                        placeholder="max@beispiel.de"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        required
                      />
                    </div>
                    <div className={styles.formGroup}>
                      <label className={styles.label}>Abo-Plan</label>
                      <select
                        className={styles.input}
                        value={subscriptionPlan}
                        onChange={(e) => setSubscriptionPlan(e.target.value)}
                      >
                        <option value="Business">Business</option>
                        <option value="Enterprise">Enterprise</option>
                      </select>
                    </div>
                  </div>

                  {error && <div className={styles.errorMsg}>{error}</div>}

                  <button type="submit" className={styles.submitBtn} disabled={creating}>
                    {creating ? "Wird erstellt..." : "Link generieren"}
                  </button>
                </form>

                {/* Generated URL */}
                <AnimatePresence>
                  {generatedUrl && (
                    <motion.div
                      className={styles.urlBox}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <div className={styles.urlLabel}>Feedback-Link (kopieren und per E-Mail senden):</div>
                      <div className={styles.urlRow}>
                        <input
                          type="text"
                          className={styles.urlInput}
                          value={generatedUrl}
                          readOnly
                          onClick={(e) => (e.target as HTMLInputElement).select()}
                        />
                        <button className={styles.copyBtn} onClick={copyToClipboard}>
                          {copied ? <><Check size={16} /> Kopiert!</> : <><Copy size={16} /> Kopieren</>}
                        </button>
                      </div>
                      <a href={generatedUrl} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
                        <ExternalLink size={14} /> Vorschau oeffnen
                      </a>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Feedbacks List */}
          <div className={styles.listCard}>
            <h2 className={styles.listTitle}>
              <MessageSquare size={20} />
              Alle Feedbacks ({feedbacks.length})
            </h2>

            {loading ? (
              <div className={styles.loadingRow}>Wird geladen...</div>
            ) : feedbacks.length === 0 ? (
              <div className={styles.emptyState}>
                <MessageSquare size={40} strokeWidth={1} />
                <p>Noch keine Feedback-Links erstellt.</p>
              </div>
            ) : (
              <div className={styles.table}>
                <div className={styles.tableHeader}>
                  <span>Kunde</span>
                  <span>E-Mail</span>
                  <span>Status</span>
                  <span>Bewertung</span>
                  <span>Erstellt</span>
                  <span></span>
                </div>
                {feedbacks.map((fb) => (
                  <div
                    key={fb._id}
                    className={`${styles.tableRow} ${fb.status === "submitted" ? styles.tableRowSubmitted : ""}`}
                  >
                    <span className={styles.cellName}>{fb.customerName}</span>
                    <span className={styles.cellEmail}>{fb.customerEmail}</span>
                    <span>{statusBadge(fb.status)}</span>
                    <span className={styles.cellRating}>
                      {fb.overallRating ? (
                        <>
                          {Array.from({ length: 5 }, (_, i) => (
                            <Star
                              key={i}
                              size={14}
                              fill={i < fb.overallRating! ? "#f59e0b" : "none"}
                              color={i < fb.overallRating! ? "#f59e0b" : "#d1d5db"}
                            />
                          ))}
                        </>
                      ) : (
                        <span className={styles.noRating}>—</span>
                      )}
                    </span>
                    <span className={styles.cellDate}>{formatDate(fb.createdAt)}</span>
                    <span>
                      {fb.status === "submitted" ? (
                        <button
                          className={styles.detailBtn}
                          onClick={() => setSelectedFeedback(fb)}
                        >
                          Ansehen
                        </button>
                      ) : (
                        <button
                          className={styles.copyLinkBtn}
                          onClick={async () => {
                            const url = `https://contract-ai.de/feedback/refund/${fb.token}`;
                            await navigator.clipboard.writeText(url);
                          }}
                          title="Link kopieren"
                        >
                          <Copy size={14} />
                        </button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detail Modal */}
          <AnimatePresence>
            {selectedFeedback && (
              <motion.div
                className={styles.overlay}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSelectedFeedback(null)}
              >
                <motion.div
                  className={styles.modal}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className={styles.modalHeader}>
                    <div>
                      <h3 className={styles.modalTitle}>{selectedFeedback.customerName}</h3>
                      <p className={styles.modalEmail}>{selectedFeedback.customerEmail}</p>
                    </div>
                    <button className={styles.modalClose} onClick={() => setSelectedFeedback(null)}>
                      ✕
                    </button>
                  </div>

                  <div className={styles.modalBody}>
                    <div className={styles.modalSection}>
                      <h4>Gesamtbewertung</h4>
                      <div className={styles.modalStars}>
                        {Array.from({ length: 5 }, (_, i) => (
                          <Star
                            key={i}
                            size={24}
                            fill={i < (selectedFeedback.overallRating || 0) ? "#f59e0b" : "none"}
                            color={i < (selectedFeedback.overallRating || 0) ? "#f59e0b" : "#d1d5db"}
                          />
                        ))}
                        <span className={styles.modalRatingNum}>
                          {selectedFeedback.overallRating}/5
                        </span>
                      </div>
                    </div>

                    {selectedFeedback.cancellationReason && (
                      <div className={styles.modalSection}>
                        <h4>Kuendigungsgrund</h4>
                        <p className={styles.modalText}>{selectedFeedback.cancellationReason}</p>
                      </div>
                    )}

                    {selectedFeedback.additionalReasons && selectedFeedback.additionalReasons.length > 0 && (
                      <div className={styles.modalSection}>
                        <h4>Weitere Gruende</h4>
                        <ul className={styles.modalList}>
                          {selectedFeedback.additionalReasons.map((r, i) => <li key={i}>{r}</li>)}
                        </ul>
                      </div>
                    )}

                    {selectedFeedback.expectedFeatures && (
                      <div className={`${styles.modalSection} ${styles.modalHighlight}`}>
                        <h4>Erwartungen / Wuensche</h4>
                        <p className={styles.modalText}>{selectedFeedback.expectedFeatures}</p>
                      </div>
                    )}

                    {selectedFeedback.usedFeatures && selectedFeedback.usedFeatures.length > 0 && (
                      <div className={styles.modalSection}>
                        <h4>Genutzte Features</h4>
                        <div className={styles.modalTags}>
                          {selectedFeedback.usedFeatures.map((f, i) => (
                            <span key={i} className={styles.modalTag}>{f}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedFeedback.positiveFeedback && (
                      <div className={styles.modalSection}>
                        <h4>Was hat gefallen?</h4>
                        <p className={styles.modalText}>{selectedFeedback.positiveFeedback}</p>
                      </div>
                    )}

                    {selectedFeedback.negativeFeedback && (
                      <div className={styles.modalSection}>
                        <h4>Was hat nicht gefallen?</h4>
                        <p className={styles.modalText}>{selectedFeedback.negativeFeedback}</p>
                      </div>
                    )}

                    {selectedFeedback.npsScore != null && (
                      <div className={styles.modalSection}>
                        <h4>NPS Score</h4>
                        <span className={styles.npsCircle} style={{
                          background: selectedFeedback.npsScore >= 9 ? "#22c55e" :
                                     selectedFeedback.npsScore >= 7 ? "#f59e0b" : "#ef4444"
                        }}>
                          {selectedFeedback.npsScore}
                        </span>
                      </div>
                    )}

                    {selectedFeedback.suggestions && (
                      <div className={styles.modalSection}>
                        <h4>Verbesserungsvorschlaege</h4>
                        <p className={styles.modalText}>{selectedFeedback.suggestions}</p>
                      </div>
                    )}

                    {selectedFeedback.submittedAt && (
                      <div className={styles.modalMeta}>
                        Eingegangen am {formatDate(selectedFeedback.submittedAt)}
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}
