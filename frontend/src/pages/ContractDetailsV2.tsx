// ContractDetailsV2.tsx - Premium Enterprise Design
// Inspiriert von: Notion, Linear, Stripe, Figma

import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Printer,
  Edit3,
  Trash2,
  Bell,
  BellOff,
  ExternalLink,
  Copy,
  MoreHorizontal,
  ChevronRight,
  Shield,
  TrendingUp,
  Users,
  FileSearch,
  Zap,
  Eye,
  Share2,
  Bookmark,
  Info,
  AlertCircle
} from "lucide-react";
import styles from "../styles/ContractDetailsV2.module.css";

// ============================================
// INTERFACES
// ============================================
interface ImportantDate {
  type: string;
  date: string;
  label: string;
  description?: string;
}

interface CalendarEvent {
  _id: string;
  title: string;
  date: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  isManual?: boolean;
}

interface Contract {
  _id: string;
  name: string;
  laufzeit: string;
  kuendigung: string;
  uploadedAt?: string;
  expiryDate?: string;
  status?: string;
  filePath?: string;
  reminder?: boolean;
  content?: string;
  contentHTML?: string;
  signature?: string;
  isGenerated?: boolean;
  createdAt?: string;
  optimizedPdfS3Key?: string;
  importantDates?: ImportantDate[];
  analysis?: {
    summary?: string;
    contractType?: string;
    parties?: {
      provider?: string;
      customer?: string;
    };
    keyTerms?: {
      duration?: string;
      cancellation?: string;
      payment?: string;
      deliverables?: string;
    };
    positiveAspects?: Array<{
      title: string;
      description: string;
      relevance: string;
    }>;
    concerningAspects?: Array<{
      title: string;
      description: string;
      impact: string;
    }>;
    importantClauses?: Array<{
      title: string;
      content: string;
      explanation: string;
      action: string;
    }>;
    recommendations?: string[];
    missingInformation?: string[];
    analyzedAt?: string;
  };
  legalPulse?: {
    riskScore: number | null;
    summary?: string;
    riskFactors?: string[];
    legalRisks?: string[];
    recommendations?: string[];
    analysisDate?: string;
  };
}

type TabType = 'overview' | 'analysis' | 'document' | 'timeline';

// ============================================
// MAIN COMPONENT
// ============================================
export default function ContractDetailsV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // State
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // ============================================
  // DATA FETCHING
  // ============================================
  useEffect(() => {
    const fetchContract = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/contracts/${id}`, {
          credentials: "include",
        });

        if (!res.ok) {
          toast.error("Vertrag nicht gefunden");
          setLoading(false);
          return;
        }

        const data = await res.json();
        setContract(data);
      } catch (error) {
        console.error("Fehler beim Laden:", error);
        toast.error("Fehler beim Laden des Vertrags");
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchContract();
  }, [id]);

  // Fetch Calendar Events
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!id) return;
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/calendar/events?contractId=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.events) {
            setCalendarEvents(data.events);
          }
        }
      } catch (err) {
        console.error('Error fetching calendar events:', err);
      }
    };
    fetchCalendarEvents();
  }, [id]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleDelete = async () => {
    const confirmDelete = window.confirm("Bist du sicher, dass du diesen Vertrag löschen möchtest?");
    if (!confirmDelete || deleting) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast.success("Vertrag gelöscht");
        setTimeout(() => navigate("/contracts"), 1000);
      } else {
        toast.error("Fehler beim Löschen");
      }
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      toast.error("Serverfehler beim Löschen");
    } finally {
      setDeleting(false);
    }
  };

  const toggleReminder = useCallback(async () => {
    if (!contract || saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/contracts/${contract._id}/reminder`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Fehler beim Umschalten");

      setContract(prev => prev ? { ...prev, reminder: !prev.reminder } : prev);
      toast.success(`Erinnerung ${!contract.reminder ? "aktiviert" : "deaktiviert"}`);
    } catch (error) {
      console.error("Fehler beim Umschalten:", error);
      toast.error("Fehler beim Umschalten der Erinnerung");
    } finally {
      setSaving(false);
    }
  }, [contract, saving]);

  const handleCopyContent = async () => {
    if (!contract?.content) {
      toast.error("Kein Inhalt zum Kopieren");
      return;
    }
    try {
      await navigator.clipboard.writeText(contract.content);
      toast.success("Inhalt kopiert!");
    } catch {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  // ============================================
  // HELPER FUNCTIONS
  // ============================================
  const formatDate = (dateString?: string): string => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const diff = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diff < 0) return `vor ${Math.abs(diff)} Tagen`;
    if (diff === 0) return "Heute";
    if (diff === 1) return "Morgen";
    return `in ${diff} Tagen`;
  };

  const getStatusStyle = (status?: string): string => {
    if (!status) return styles.statusNeutral;
    switch (status.toLowerCase()) {
      case 'aktiv':
      case 'gültig':
        return styles.statusActive;
      case 'gekündigt':
      case 'beendet':
        return styles.statusCancelled;
      case 'läuft ab':
      case 'bald fällig':
        return styles.statusExpiring;
      default:
        return styles.statusNeutral;
    }
  };

  const getRiskLevel = (score: number | null | undefined) => {
    if (score === null || score === undefined) return { level: 'unrated', label: 'Nicht bewertet', style: styles.riskUnrated };
    if (score >= 70) return { level: 'low', label: 'Geringes Risiko', style: styles.riskLow };
    if (score >= 40) return { level: 'medium', label: 'Mittleres Risiko', style: styles.riskMedium };
    return { level: 'high', label: 'Hohes Risiko', style: styles.riskHigh };
  };

  // ============================================
  // LOADING STATE
  // ============================================
  if (loading) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner} />
          <p className={styles.loadingText}>Vertrag wird geladen...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // ERROR STATE
  // ============================================
  if (!contract) {
    return (
      <div className={styles.pageContainer}>
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>
            <AlertTriangle size={40} />
          </div>
          <h2 className={styles.errorTitle}>Vertrag nicht gefunden</h2>
          <p className={styles.errorText}>
            Der angeforderte Vertrag konnte nicht geladen werden.
          </p>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={() => navigate('/contracts')}>
            Zurück zur Übersicht
          </button>
        </div>
      </div>
    );
  }

  const riskInfo = getRiskLevel(contract.legalPulse?.riskScore);
  const hasAnalysis = contract.analysis && (
    contract.analysis.summary ||
    contract.analysis.positiveAspects?.length ||
    contract.analysis.concerningAspects?.length
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <>
      <Helmet>
        <title>{contract.name} | Contract AI</title>
        <meta name="description" content={`Vertragsdetails für ${contract.name}`} />
      </Helmet>

      <div className={styles.pageContainer}>
        <div className={styles.contentWrapper}>
          {/* Top Header - Breadcrumb & Actions */}
          <motion.div
            className={styles.topHeader}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.breadcrumb}>
              <button className={styles.backButton} onClick={() => navigate(-1)}>
                <ArrowLeft size={18} />
              </button>
              <span className={styles.breadcrumbText}>
                <Link to="/contracts">Verträge</Link>
                <span className={styles.breadcrumbSeparator}> / </span>
                <span className={styles.breadcrumbCurrent}>{contract.name}</span>
              </span>
            </div>
            <div className={styles.headerActions}>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnIcon}`} title="Teilen">
                <Share2 size={18} />
              </button>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnIcon}`} title="Merken">
                <Bookmark size={18} />
              </button>
              <button className={`${styles.btn} ${styles.btnGhost} ${styles.btnIcon}`} title="Mehr">
                <MoreHorizontal size={18} />
              </button>
            </div>
          </motion.div>

          {/* Main Header - Title & Status */}
          <motion.div
            className={styles.mainHeader}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <div className={styles.titleSection}>
              <h1 className={styles.contractTitle}>
                {contract.name}
                {contract.isGenerated && (
                  <span className={styles.aiGeneratedBadge}>
                    <Zap size={12} /> KI-Generiert
                  </span>
                )}
              </h1>
              <div className={styles.contractMeta}>
                <span className={styles.metaItem}>
                  <Calendar size={14} className={styles.metaIcon} />
                  {contract.isGenerated ? 'Erstellt' : 'Hochgeladen'}: {formatDate(contract.isGenerated ? contract.createdAt : contract.uploadedAt)}
                </span>
                {contract.analysis?.contractType && (
                  <span className={styles.metaItem}>
                    <FileText size={14} className={styles.metaIcon} />
                    {contract.analysis.contractType}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.statusSection}>
              <span className={`${styles.statusBadge} ${getStatusStyle(contract.status)}`}>
                {contract.status === 'Aktiv' && <CheckCircle size={14} />}
                {contract.status === 'Gekündigt' && <XCircle size={14} />}
                {contract.status === 'Läuft ab' && <AlertTriangle size={14} />}
                {contract.status || "Status unbekannt"}
              </span>

              {contract.legalPulse?.riskScore !== null && contract.legalPulse?.riskScore !== undefined && (
                <div className={styles.riskScoreBadge}>
                  <span className={`${styles.riskScoreValue} ${riskInfo.style}`}>
                    {contract.legalPulse.riskScore}
                  </span>
                  <span className={styles.riskScoreLabel}>Legal Score</span>
                </div>
              )}
            </div>
          </motion.div>

          {/* Tab Navigation */}
          <motion.div
            className={styles.tabNavigation}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <button
              className={`${styles.tabButton} ${activeTab === 'overview' ? styles.active : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <Eye size={18} className={styles.tabIcon} />
              Übersicht
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'analysis' ? styles.active : ''}`}
              onClick={() => setActiveTab('analysis')}
            >
              <TrendingUp size={18} className={styles.tabIcon} />
              Analyse
              {hasAnalysis && <span className={styles.tabBadge}>!</span>}
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'document' ? styles.active : ''}`}
              onClick={() => setActiveTab('document')}
            >
              <FileText size={18} className={styles.tabIcon} />
              Dokument
            </button>
            <button
              className={`${styles.tabButton} ${activeTab === 'timeline' ? styles.active : ''}`}
              onClick={() => setActiveTab('timeline')}
            >
              <Clock size={18} className={styles.tabIcon} />
              Timeline
              {calendarEvents.length > 0 && (
                <span className={styles.tabBadge}>{calendarEvents.length}</span>
              )}
            </button>
          </motion.div>

          {/* Content Grid */}
          <div className={styles.contentGrid}>
            <div className={styles.mainContent}>
              <AnimatePresence mode="wait">
                {/* OVERVIEW TAB */}
                {activeTab === 'overview' && (
                  <motion.div
                    key="overview"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Key Metrics */}
                    <div className={`${styles.card} ${styles.fadeIn}`}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>
                          <span className={styles.cardIcon}><Info size={18} /></span>
                          Vertragsdetails
                        </h3>
                      </div>
                      <div className={styles.cardBody}>
                        <div className={styles.metricsGrid}>
                          <div className={styles.metricCard}>
                            <div className={styles.metricHeader}>
                              <span className={styles.metricLabel}>Laufzeit</span>
                              <div className={styles.metricIconWrapper}>
                                <Clock size={16} />
                              </div>
                            </div>
                            <div className={`${styles.metricValue} ${!contract.laufzeit ? styles.metricEmpty : ''}`}>
                              {contract.laufzeit || "Nicht angegeben"}
                            </div>
                          </div>

                          <div className={styles.metricCard}>
                            <div className={styles.metricHeader}>
                              <span className={styles.metricLabel}>Ablaufdatum</span>
                              <div className={styles.metricIconWrapper}>
                                <Calendar size={16} />
                              </div>
                            </div>
                            <div className={`${styles.metricValue} ${!contract.expiryDate ? styles.metricEmpty : ''}`}>
                              {contract.expiryDate ? formatDate(contract.expiryDate) : "Nicht angegeben"}
                            </div>
                            {contract.expiryDate && (
                              <div className={styles.metricSubtext}>{getRelativeTime(contract.expiryDate)}</div>
                            )}
                          </div>

                          <div className={styles.metricCard}>
                            <div className={styles.metricHeader}>
                              <span className={styles.metricLabel}>Kündigungsfrist</span>
                              <div className={styles.metricIconWrapper}>
                                <AlertCircle size={16} />
                              </div>
                            </div>
                            <div className={`${styles.metricValue} ${!contract.kuendigung ? styles.metricEmpty : ''}`}>
                              {contract.kuendigung || "Nicht angegeben"}
                            </div>
                          </div>

                          <div className={styles.metricCard}>
                            <div className={styles.metricHeader}>
                              <span className={styles.metricLabel}>Legal Score</span>
                              <div className={styles.metricIconWrapper}>
                                <Shield size={16} />
                              </div>
                            </div>
                            <div className={`${styles.metricValue} ${riskInfo.style}`}>
                              {contract.legalPulse?.riskScore ?? "—"}
                            </div>
                            <div className={styles.metricSubtext}>{riskInfo.label}</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Parties */}
                    {contract.analysis?.parties && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger1}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}><Users size={18} /></span>
                            Vertragsparteien
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.partiesGrid}>
                            {contract.analysis.parties.provider && (
                              <div className={styles.partyCard}>
                                <div className={styles.partyAvatar}>
                                  {contract.analysis.parties.provider.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.partyInfo}>
                                  <div className={styles.partyRole}>Anbieter</div>
                                  <div className={styles.partyName}>{contract.analysis.parties.provider}</div>
                                </div>
                              </div>
                            )}
                            {contract.analysis.parties.customer && (
                              <div className={styles.partyCard}>
                                <div className={styles.partyAvatar}>
                                  {contract.analysis.parties.customer.charAt(0).toUpperCase()}
                                </div>
                                <div className={styles.partyInfo}>
                                  <div className={styles.partyRole}>Kunde</div>
                                  <div className={styles.partyName}>{contract.analysis.parties.customer}</div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Summary */}
                    {contract.analysis?.summary && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger2}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}><FileSearch size={18} /></span>
                            Zusammenfassung
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          <p style={{ margin: 0, lineHeight: 1.7, color: 'var(--cd-text-secondary)' }}>
                            {contract.analysis.summary}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* ANALYSIS TAB */}
                {activeTab === 'analysis' && (
                  <motion.div
                    key="analysis"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Legal Pulse */}
                    {contract.legalPulse && (
                      <div className={`${styles.card} ${styles.fadeIn}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}><Shield size={18} /></span>
                            Legal Pulse Analyse
                          </h3>
                          <span className={`${styles.statusBadge} ${riskInfo.style === styles.riskLow ? styles.statusActive : riskInfo.style === styles.riskMedium ? styles.statusExpiring : styles.statusCancelled}`}>
                            {riskInfo.label}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          {contract.legalPulse.summary && (
                            <p style={{ margin: '0 0 20px 0', lineHeight: 1.7, color: 'var(--cd-text-secondary)' }}>
                              {contract.legalPulse.summary}
                            </p>
                          )}

                          {contract.legalPulse.riskFactors && contract.legalPulse.riskFactors.length > 0 && (
                            <div className={styles.analysisSection}>
                              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--cd-text-primary)' }}>
                                Identifizierte Risiken
                              </h4>
                              <div className={styles.analysisList}>
                                {contract.legalPulse.riskFactors.map((risk, idx) => (
                                  <div key={idx} className={`${styles.analysisItem} ${styles.negative}`}>
                                    <div className={styles.analysisItemIcon}>
                                      <AlertTriangle size={16} />
                                    </div>
                                    <div className={styles.analysisItemContent}>
                                      <div className={styles.analysisItemText}>{risk}</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {contract.legalPulse.recommendations && contract.legalPulse.recommendations.length > 0 && (
                            <div className={styles.analysisSection} style={{ marginTop: 20 }}>
                              <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--cd-text-primary)' }}>
                                Empfehlungen
                              </h4>
                              <div className={styles.analysisList}>
                                {contract.legalPulse.recommendations.map((rec, idx) => (
                                  <div key={idx} className={`${styles.analysisItem} ${styles.positive}`}>
                                    <div className={styles.analysisItemIcon}>
                                      <CheckCircle size={16} />
                                    </div>
                                    <div className={styles.analysisItemContent}>
                                      <div className={styles.analysisItemText}>
                                        {typeof rec === 'string' ? rec : JSON.stringify(rec)}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {contract.legalPulse.analysisDate && (
                          <div className={styles.cardFooter}>
                            <span style={{ fontSize: 12, color: 'var(--cd-text-tertiary)' }}>
                              Analyse vom {formatDate(contract.legalPulse.analysisDate)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Positive Aspects */}
                    {contract.analysis?.positiveAspects && contract.analysis.positiveAspects.length > 0 && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger1}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon} style={{ background: 'var(--cd-success-light)', color: 'var(--cd-success)' }}>
                              <CheckCircle size={18} />
                            </span>
                            Positive Aspekte
                          </h3>
                          <span className={styles.tabBadge} style={{ background: 'var(--cd-success-light)', color: 'var(--cd-success)' }}>
                            {contract.analysis.positiveAspects.length}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.analysisList}>
                            {contract.analysis.positiveAspects.map((aspect, idx) => (
                              <div key={idx} className={`${styles.analysisItem} ${styles.positive}`}>
                                <div className={styles.analysisItemIcon}>
                                  <CheckCircle size={16} />
                                </div>
                                <div className={styles.analysisItemContent}>
                                  <div className={styles.analysisItemTitle}>{aspect.title}</div>
                                  <div className={styles.analysisItemText}>{aspect.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Concerning Aspects */}
                    {contract.analysis?.concerningAspects && contract.analysis.concerningAspects.length > 0 && (
                      <div className={`${styles.card} ${styles.fadeIn} ${styles.stagger2}`}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon} style={{ background: 'var(--cd-warning-light)', color: 'var(--cd-warning)' }}>
                              <AlertTriangle size={18} />
                            </span>
                            Bedenkliche Aspekte
                          </h3>
                          <span className={styles.tabBadge} style={{ background: 'var(--cd-warning-light)', color: 'var(--cd-warning)' }}>
                            {contract.analysis.concerningAspects.length}
                          </span>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.analysisList}>
                            {contract.analysis.concerningAspects.map((aspect, idx) => (
                              <div key={idx} className={`${styles.analysisItem} ${styles.warning}`}>
                                <div className={styles.analysisItemIcon}>
                                  <AlertTriangle size={16} />
                                </div>
                                <div className={styles.analysisItemContent}>
                                  <div className={styles.analysisItemTitle}>{aspect.title}</div>
                                  <div className={styles.analysisItemText}>{aspect.description}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Empty State */}
                    {!hasAnalysis && !contract.legalPulse && (
                      <div className={styles.card}>
                        <div className={styles.emptyState}>
                          <div className={styles.emptyIcon}>
                            <TrendingUp size={32} />
                          </div>
                          <h4 className={styles.emptyTitle}>Keine Analyse vorhanden</h4>
                          <p className={styles.emptyText}>
                            Dieser Vertrag wurde noch nicht analysiert. Starte eine Analyse, um detaillierte Einblicke zu erhalten.
                          </p>
                          <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ marginTop: 16 }}>
                            <Zap size={16} /> Jetzt analysieren
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* DOCUMENT TAB */}
                {activeTab === 'document' && (
                  <motion.div
                    key="document"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={styles.documentViewer}>
                      <div className={styles.documentHeader}>
                        <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--cd-text-primary)' }}>
                          <FileText size={16} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                          {contract.name}
                        </span>
                        <div className={styles.documentActions}>
                          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={handleCopyContent}>
                            <Copy size={14} /> Kopieren
                          </button>
                          <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`}>
                            <Printer size={14} /> Drucken
                          </button>
                          <button className={`${styles.btn} ${styles.btnPrimary} ${styles.btnSm}`}>
                            <Download size={14} /> PDF Export
                          </button>
                        </div>
                      </div>
                      <div className={styles.documentContent}>
                        {contract.content || contract.contentHTML ? (
                          <div dangerouslySetInnerHTML={{ __html: contract.contentHTML || contract.content?.replace(/\n/g, '<br/>') || '' }} />
                        ) : (
                          <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                              <FileText size={32} />
                            </div>
                            <h4 className={styles.emptyTitle}>Kein Inhalt verfügbar</h4>
                            <p className={styles.emptyText}>
                              Der Vertragsinhalt ist nicht als Text verfügbar.
                            </p>
                            {contract.filePath && (
                              <a
                                href={`/api${contract.filePath}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`${styles.btn} ${styles.btnPrimary}`}
                                style={{ marginTop: 16 }}
                              >
                                <ExternalLink size={16} /> Original PDF öffnen
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Signature */}
                    {contract.signature && (
                      <div className={`${styles.card} ${styles.fadeIn}`} style={{ marginTop: 24 }}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}><Edit3 size={18} /></span>
                            Digitale Unterschrift
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          <img
                            src={contract.signature}
                            alt="Unterschrift"
                            style={{
                              maxWidth: 250,
                              border: '1px solid var(--cd-border)',
                              borderRadius: 8,
                              padding: 12,
                              background: 'white'
                            }}
                          />
                          <p style={{ margin: '12px 0 0', fontSize: 12, color: 'var(--cd-text-tertiary)' }}>
                            Unterschrieben am {formatDate(contract.createdAt)}
                          </p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* TIMELINE TAB */}
                {activeTab === 'timeline' && (
                  <motion.div
                    key="timeline"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className={styles.card}>
                      <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>
                          <span className={styles.cardIcon}><Calendar size={18} /></span>
                          Kalender-Events
                        </h3>
                        <button className={`${styles.btn} ${styles.btnSecondary} ${styles.btnSm}`} onClick={() => navigate('/calendar')}>
                          Zum Kalender <ChevronRight size={14} />
                        </button>
                      </div>
                      <div className={styles.cardBody}>
                        {calendarEvents.length > 0 ? (
                          <div className={styles.timelineList}>
                            {calendarEvents.map((event) => (
                              <div key={event._id} className={`${styles.timelineItem} ${styles[event.severity]}`}>
                                <div className={styles.timelineIcon}>
                                  {event.severity === 'critical' && <AlertTriangle size={16} style={{ color: 'var(--cd-danger)' }} />}
                                  {event.severity === 'warning' && <AlertCircle size={16} style={{ color: 'var(--cd-warning)' }} />}
                                  {event.severity === 'info' && <Calendar size={16} style={{ color: 'var(--cd-info)' }} />}
                                </div>
                                <div className={styles.timelineContent}>
                                  <div className={styles.timelineTitle}>{event.title}</div>
                                  <div className={styles.timelineDate}>
                                    {formatDate(event.date)} • {getRelativeTime(event.date)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>
                              <Calendar size={32} />
                            </div>
                            <h4 className={styles.emptyTitle}>Keine Events</h4>
                            <p className={styles.emptyText}>
                              Für diesen Vertrag sind keine Kalender-Events hinterlegt.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Important Dates */}
                    {contract.importantDates && contract.importantDates.length > 0 && (
                      <div className={`${styles.card} ${styles.fadeIn}`} style={{ marginTop: 24 }}>
                        <div className={styles.cardHeader}>
                          <h3 className={styles.cardTitle}>
                            <span className={styles.cardIcon}><Clock size={18} /></span>
                            Wichtige Termine
                          </h3>
                        </div>
                        <div className={styles.cardBody}>
                          <div className={styles.timelineList}>
                            {contract.importantDates.map((date, idx) => (
                              <div key={idx} className={styles.timelineItem}>
                                <div className={styles.timelineIcon}>
                                  <Calendar size={16} style={{ color: 'var(--cd-primary)' }} />
                                </div>
                                <div className={styles.timelineContent}>
                                  <div className={styles.timelineTitle}>{date.label}</div>
                                  <div className={styles.timelineDate}>
                                    {formatDate(date.date)}
                                    {date.description && ` • ${date.description}`}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* SIDEBAR */}
            <div className={styles.sidebar}>
              {/* Quick Actions */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle}>Schnellaktionen</h3>
                </div>
                <div className={styles.cardBody}>
                  <div className={styles.quickActions}>
                    <button className={styles.quickActionBtn} onClick={() => navigate(`/contracts/${id}/edit`)}>
                      <Edit3 size={18} /> Vertrag bearbeiten
                    </button>
                    <button className={styles.quickActionBtn} onClick={() => navigate(`/legal-lens/${id}`)}>
                      <FileSearch size={18} /> Legal Lens öffnen
                    </button>
                    {contract.filePath && (
                      <a href={`/api${contract.filePath}`} target="_blank" rel="noopener noreferrer" className={styles.quickActionBtn}>
                        <ExternalLink size={18} /> Original PDF
                      </a>
                    )}
                    {contract.optimizedPdfS3Key && (
                      <button className={styles.quickActionBtn}>
                        <Zap size={18} /> Optimiertes PDF
                      </button>
                    )}
                    <button className={styles.quickActionBtn} onClick={() => navigate('/calendar')}>
                      <Calendar size={18} /> Zum Kalender
                    </button>
                  </div>
                </div>
              </div>

              {/* Reminder */}
              <div className={styles.card}>
                <div className={styles.cardBody}>
                  <div className={styles.reminderCard}>
                    <div className={styles.reminderHeader}>
                      <span className={styles.reminderTitle}>
                        {contract.reminder ? <Bell size={16} /> : <BellOff size={16} />}
                        {' '}Erinnerungen
                      </span>
                      <label className={styles.reminderToggle}>
                        <input
                          type="checkbox"
                          checked={contract.reminder ?? false}
                          onChange={toggleReminder}
                          disabled={saving}
                        />
                        <span className={styles.toggleSlider}></span>
                      </label>
                    </div>
                    <span className={styles.reminderStatus}>
                      {contract.reminder ? "Erinnerungen sind aktiviert" : "Keine Erinnerungen"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Danger Zone */}
              <div className={styles.card}>
                <div className={styles.cardHeader}>
                  <h3 className={styles.cardTitle} style={{ color: 'var(--cd-danger)' }}>
                    Gefahrenzone
                  </h3>
                </div>
                <div className={styles.cardBody}>
                  <button
                    className={`${styles.btn} ${styles.btnDanger} ${styles.btnBlock}`}
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    <Trash2 size={16} />
                    {deleting ? 'Lösche...' : 'Vertrag löschen'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
