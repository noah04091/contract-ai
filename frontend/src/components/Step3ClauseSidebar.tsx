// Step3ClauseSidebar.tsx
// Slide-In Sidebar für Klausel-Schnellbewertung in Generate Step 3.
// Triggert POST /api/quickLint/analyze/:contractId, zeigt pro Klausel
// Risk-Badge + Schwäche + BGH-Zitat + optimierten Vorschlag mit "Übernehmen"-Button.

import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Scale, Loader2, AlertTriangle, ShieldCheck, ShieldAlert,
  Sparkles, Check, BookOpen, Info, RefreshCw, ChevronDown, ChevronUp,
  AlertCircle
} from "lucide-react";
import styles from "../styles/Step3ClauseSidebar.module.css";
import { toast } from "react-toastify";

type RiskLevel = "low" | "medium" | "high";

export interface ClauseAssessment {
  id: string;
  index: number;
  number?: string;
  title: string;
  originalText: string;
  riskLevel: RiskLevel;
  weakness: string | null;
  bghCite: string | null;
  optimizedSuggestion: string | null;
}

export interface QuickLintResult {
  success: boolean;
  clauses: ClauseAssessment[];
  score: number;
  totalClauses: number;
  criticalCount: number;
  warningCount: number;
  okCount: number;
  fromKeywordsOnly?: boolean;
  fromCache?: boolean;
  generatedAt: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  contractId: string | null;
  contractText: string;
  contractType: string;
  onApplyOptimization: (originalText: string, optimizedText: string) => void;
}

const API_BASE = import.meta.env.VITE_API_URL || "https://api.contract-ai.de";

const Step3ClauseSidebar: React.FC<Props> = ({
  isOpen,
  onClose,
  contractId,
  contractText,
  contractType,
  onApplyOptimization,
}) => {
  const [result, setResult] = useState<QuickLintResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const fetchedForContractId = useRef<string | null>(null);

  const fetchAssessment = useCallback(
    async (force = false) => {
      if (!contractId) {
        setError("Vertrag muss zuerst gespeichert werden, damit die Klauseln juristisch geprüft werden können.");
        return;
      }
      if (!contractText || contractText.trim().length < 50) {
        setError("Vertragstext zu kurz für eine Bewertung.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `${API_BASE}/api/quickLint/analyze/${contractId}`,
          {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contractText,
              contractType: contractType || "individuell",
              force,
            }),
          }
        );

        const data = await response.json();

        if (response.status === 403) {
          setError(
            data?.message ||
              "Klausel-Bewertung erfordert ein Business-Abo oder höher."
          );
          return;
        }

        if (!response.ok || !data?.success) {
          throw new Error(
            data?.error || data?.message || "Bewertung fehlgeschlagen"
          );
        }

        setResult(data as QuickLintResult);
        fetchedForContractId.current = contractId;
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Bewertung gerade nicht verfügbar";
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [contractId, contractText, contractType]
  );

  // Auto-fetch beim Öffnen — aber nur einmal pro contractId
  useEffect(() => {
    if (!isOpen) return;
    if (!contractId) return;
    if (fetchedForContractId.current === contractId && result) return;
    fetchAssessment(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, contractId]);

  // Escape schließt Sidebar
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // Body-Scroll lock während offen
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = (clause: ClauseAssessment) => {
    if (!clause.optimizedSuggestion || !clause.originalText) return;
    if (applied.has(clause.id)) return;
    onApplyOptimization(clause.originalText, clause.optimizedSuggestion);
    setApplied((prev) => new Set(prev).add(clause.id));
    toast.success(`Vorschlag für "${clause.title}" übernommen.`);
  };

  const handleRefresh = () => {
    setResult(null);
    setApplied(new Set());
    setExpanded(new Set());
    fetchAssessment(true);
  };

  const scoreClass =
    !result
      ? ""
      : result.score >= 7.5
      ? styles.scoreHigh
      : result.score >= 5
      ? styles.scoreMid
      : styles.scoreLow;

  const renderRiskBadge = (level: RiskLevel) => {
    if (level === "high") {
      return (
        <span className={`${styles.riskBadge} ${styles.high}`}>
          <ShieldAlert size={12} /> Kritisch
        </span>
      );
    }
    if (level === "medium") {
      return (
        <span className={`${styles.riskBadge} ${styles.medium}`}>
          <AlertTriangle size={12} /> Achtung
        </span>
      );
    }
    return (
      <span className={`${styles.riskBadge} ${styles.low}`}>
        <ShieldCheck size={12} /> Sauber
      </span>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.overlay}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Klausel-Bewertung"
        >
          <motion.aside
            className={styles.sidebar}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "tween", duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.dragHandle} aria-hidden />

            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerRow}>
                <h3 className={styles.headerTitle}>
                  <Scale size={18} /> Klausel-Bewertung
                </h3>
                <button
                  type="button"
                  className={styles.closeBtn}
                  onClick={onClose}
                  aria-label="Schließen"
                >
                  <X size={18} />
                </button>
              </div>
              <p className={styles.headerSubtitle}>
                Juristische Schnellprüfung jeder Klausel — mit Vorschlägen, die Sie übernehmen können.
              </p>

              {result && !loading && (
                <div className={styles.scoreRow}>
                  <div className={`${styles.scoreBadge} ${scoreClass}`}>
                    <span className={styles.scoreValue}>
                      {result.score.toFixed(1)}
                    </span>
                    <span className={styles.scoreLabel}>Score</span>
                  </div>
                  <div className={styles.statsRow}>
                    {result.criticalCount > 0 && (
                      <span className={`${styles.statPill} ${styles.high}`}>
                        <span className={styles.statDot} />
                        {result.criticalCount} kritisch
                      </span>
                    )}
                    {result.warningCount > 0 && (
                      <span className={`${styles.statPill} ${styles.medium}`}>
                        <span className={styles.statDot} />
                        {result.warningCount} Warnung
                      </span>
                    )}
                    {result.okCount > 0 && (
                      <span className={`${styles.statPill} ${styles.low}`}>
                        <span className={styles.statDot} />
                        {result.okCount} sauber
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Body */}
            <div className={styles.body}>
              {loading && (
                <div className={styles.loadingState}>
                  <Loader2 size={28} />
                  <h4>Klauseln werden geprüft</h4>
                  <p>
                    Wir analysieren jede Klausel einzeln nach BGH-Rechtsprechung. Das dauert ca. 15–25 Sekunden.
                  </p>
                </div>
              )}

              {!loading && error && (
                <div className={styles.errorState}>
                  <AlertCircle size={28} />
                  <h4>Bewertung nicht möglich</h4>
                  <p>{error}</p>
                  {contractId && contractText && (
                    <button
                      type="button"
                      className={styles.retryBtn}
                      onClick={() => fetchAssessment(false)}
                    >
                      Erneut versuchen
                    </button>
                  )}
                </div>
              )}

              {!loading && !error && result && result.clauses.length === 0 && (
                <div className={styles.emptyState}>
                  <Info size={28} />
                  <h4>Keine Klauseln erkannt</h4>
                  <p>
                    Der Text enthält noch keine eindeutig abgegrenzten Paragraphen. Bearbeiten Sie zuerst den Vertragstext.
                  </p>
                </div>
              )}

              {!loading && !error && result && result.clauses.length > 0 && (
                <div className={styles.clauseList}>
                  {applied.size > 0 && (
                    <div className={styles.staleBanner} role="status">
                      <RefreshCw size={16} className={styles.staleBannerIcon} />
                      <span className={styles.staleBannerText}>
                        Vertrag wurde geändert ({applied.size} {applied.size === 1 ? 'Vorschlag' : 'Vorschläge'} übernommen) — Bewertung jetzt veraltet.
                      </span>
                      <button
                        type="button"
                        className={styles.staleBannerBtn}
                        onClick={handleRefresh}
                        disabled={loading}
                      >
                        <RefreshCw size={12} /> Neu prüfen
                      </button>
                    </div>
                  )}
                  {result.clauses.map((clause) => {
                    const isExpanded = expanded.has(clause.id);
                    const isApplied = applied.has(clause.id);
                    const cardClass = `${styles.card} ${styles[clause.riskLevel] || ""} ${isApplied ? styles.applied : ""}`.trim();
                    return (
                      <div key={clause.id} className={cardClass}>
                        <div className={styles.cardHeader}>
                          <div className={styles.cardTitleWrap}>
                            <h4 className={styles.cardTitle}>
                              {clause.number ? `${clause.number} ` : ""}
                              {clause.title}
                            </h4>
                          </div>
                          {renderRiskBadge(clause.riskLevel)}
                          <button
                            type="button"
                            className={styles.expandToggle}
                            onClick={() => toggleExpand(clause.id)}
                            aria-label={isExpanded ? "Einklappen" : "Ausklappen"}
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </div>

                        {!isExpanded && (
                          <p className={styles.cardSnippet}>
                            {clause.weakness ||
                              (clause.riskLevel === "low"
                                ? "Klausel wirkt juristisch unauffällig."
                                : clause.originalText.slice(0, 160) + "…")}
                          </p>
                        )}

                        {isExpanded && (
                          <div className={styles.cardBody}>
                            {clause.weakness && (
                              <div className={styles.section}>
                                <span className={styles.sectionLabel}>
                                  <AlertTriangle size={12} /> Schwäche
                                </span>
                                <p className={styles.sectionText}>{clause.weakness}</p>
                              </div>
                            )}

                            <div className={styles.section}>
                              <span className={styles.sectionLabel}>
                                <BookOpen size={12} /> Originalklausel
                              </span>
                              <div className={styles.originalBox}>{clause.originalText}</div>
                            </div>

                            {clause.bghCite && (
                              <div className={styles.section}>
                                <span className={styles.sectionLabel}>Rechtsprechung</span>
                                <span className={styles.bghCite}>
                                  <BookOpen size={12} /> {clause.bghCite}
                                </span>
                              </div>
                            )}

                            {clause.optimizedSuggestion ? (
                              <>
                                <div className={styles.section}>
                                  <span className={styles.sectionLabel}>
                                    <Sparkles size={12} /> Vorschlag
                                  </span>
                                  <div className={styles.optimizedBox}>
                                    {clause.optimizedSuggestion}
                                  </div>
                                </div>
                                <div className={styles.cardActions}>
                                  <button
                                    type="button"
                                    className={`${styles.actionBtn} ${isApplied ? styles.applied : styles.primary}`}
                                    onClick={() => handleApply(clause)}
                                    disabled={isApplied}
                                  >
                                    {isApplied ? (
                                      <>
                                        <Check size={14} /> Übernommen
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles size={14} /> Übernehmen
                                      </>
                                    )}
                                  </button>
                                </div>
                              </>
                            ) : (
                              clause.riskLevel !== "low" && (
                                <p className={`${styles.sectionText} ${styles.muted}`}>
                                  Kein konkreter Verbesserungsvorschlag — Klausel sollte manuell geprüft werden.
                                </p>
                              )
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {result && !loading && (
              <div className={styles.footer}>
                <span className={styles.footerNote}>
                  <Info size={12} />
                  {result.fromKeywordsOnly
                    ? "Schnell-Bewertung (KI nicht erreichbar)"
                    : result.fromCache
                    ? "Aus Cache geladen"
                    : "Juristische KI-Bewertung"}
                </span>
                <button
                  type="button"
                  className={styles.refreshBtn}
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw size={12} /> Neu prüfen
                </button>
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Step3ClauseSidebar;
