import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { MessageSquare, Loader } from "lucide-react";
import styles from "../styles/ContractDetails.module.css";
import { generateICS } from "../utils/icsGenerator";
import Notification from "../components/Notification";
import ContractContentViewer from "../components/ContractContentViewer";
import ReminderSettingsModal from "../components/ReminderSettingsModal";
import ImportantDatesSection from "../components/ImportantDatesSection";
import { useAuth } from "../context/AuthContext";

// Interface für wichtige Datums aus der KI-Analyse
interface ImportantDate {
  type: string;
  date: string;
  label: string;
  description?: string;
  calculated?: boolean;
  source?: string;
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
  s3Key?: string;              // S3-Key für Original-PDF
  reminder?: boolean;
  reminderLastSentAt?: string;
  content?: string;           // ✅ NEU: Für generierten Vertragsinhalt
  signature?: string;         // ✅ NEU: Für digitale Unterschrift
  isGenerated?: boolean;      // ✅ NEU: Kennzeichnung als generierter Vertrag
  createdAt?: string;         // ✅ NEU: Erstellungsdatum
  optimizedPdfS3Key?: string;        // 🆕 S3-Key für optimiertes PDF
  optimizedPdfS3Location?: string;   // 🆕 S3-Location für optimiertes PDF
  optimizedPdfGeneratedAt?: string;  // 🆕 Zeitpunkt der PDF-Generierung
  importantDates?: ImportantDate[];  // 🆕 KI-extrahierte wichtige Datums
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
    aiGenerated?: boolean;
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

type NotificationType = "success" | "error" | "info";

export default function ContractDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [contract, setContract] = useState<Contract | null>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    laufzeit: "",
    kuendigung: "",
  });
  const [notification, setNotification] = useState<{
    message: string;
    type?: NotificationType;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [openingChat, setOpeningChat] = useState(false);

  // 💬 Auth für Chat-Button (Business/Enterprise only)
  const { user } = useAuth();
  const isBusinessOrHigher = user?.subscriptionPlan === 'business' ||
                              user?.subscriptionPlan === 'enterprise';

  const [calendarEvents, setCalendarEvents] = useState<Array<{
    _id: string;
    title: string;
    date: string;
    type: string;
    severity: 'info' | 'warning' | 'critical';
    isManual?: boolean;
  }>>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/contracts/${id}`, {
          credentials: "include",
        });

        if (!res.ok) {
          setNotification({ message: "Vertrag nicht gefunden", type: "error" });
          setLoading(false);
          return;
        }

        const data = await res.json();
        console.log('📅 Contract loaded - importantDates:', data.importantDates);
        setContract(data);
        setFormData({
          name: data.name || "",
          laufzeit: data.laufzeit || "",
          kuendigung: data.kuendigung || "",
        });
      } catch (error) {
        console.error("Fehler beim Laden:", error);
        setNotification({ message: "Fehler beim Laden des Vertrags", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchContract();
  }, [id]);

  // Kalendererinnerungen für diesen Vertrag laden
  useEffect(() => {
    const fetchCalendarEvents = async () => {
      if (!id) return;
      setLoadingEvents(true);
      try {
        const token = localStorage.getItem('token');
        // Verwende relativen Pfad für konsistentes Verhalten mit Vercel Proxy
        const res = await fetch(`/api/calendar/events?contractId=${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('📅 Calendar Events API Response Status:', res.status);
        if (res.ok) {
          const data = await res.json();
          console.log('📅 Calendar Events für Vertrag:', data);
          if (data.success && data.events) {
            setCalendarEvents(data.events);
          }
        } else {
          console.error('📅 Calendar Events API Error:', res.status, res.statusText);
        }
      } catch (err) {
        console.error('Error fetching calendar events:', err);
      } finally {
        setLoadingEvents(false);
      }
    };
    fetchCalendarEvents();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (saving) return; // Prevent double-clicks
    setSaving(true);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok && contract) {
        setContract({ ...contract, ...formData });
        setEditing(false);
        setNotification({ message: "Vertrag erfolgreich aktualisiert", type: "success" });
      } else {
        setNotification({ message: "Fehler beim Speichern: " + (data.message || "Unbekannter Fehler"), type: "error" });
      }
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      setNotification({ message: "Serverfehler beim Speichern", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm("Bist du sicher, dass du diesen Vertrag löschen möchtest?");
    if (!confirmDelete || deleting) return; // Prevent double-clicks

    setDeleting(true);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setNotification({ message: "Vertrag gelöscht", type: "success" });
        setTimeout(() => navigate("/dashboard"), 1000);
      } else {
        setNotification({ message: "Fehler beim Löschen", type: "error" });
      }
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      setNotification({ message: "Serverfehler beim Löschen", type: "error" });
    } finally {
      setDeleting(false);
    }
  };

  const handleCalendarExport = () => {
    if (contract?.expiryDate) {
      generateICS({ name: contract.name, expiryDate: contract.expiryDate });
      setNotification({ message: "Zum Kalender exportiert", type: "info" });
    } else {
      setNotification({ message: "Kein Ablaufdatum vorhanden", type: "error" });
    }
  };

  const toggleReminder = async () => {
    try {
      const res = await fetch(`/api/contracts/${contract?._id}/reminder`, {
        method: "PATCH",
        credentials: "include",
      });

      if (!res.ok) throw new Error("Fehler beim Umschalten");

      setContract((prev) =>
        prev ? { ...prev, reminder: !prev.reminder } : prev
      );

      setNotification({
        message: `Erinnerung ${!contract?.reminder ? "aktiviert" : "deaktiviert"}`,
        type: "success",
      });
    } catch (error) {
      console.error("Fehler beim Umschalten:", error);
      setNotification({ message: "Fehler beim Umschalten der Erinnerung", type: "error" });
    }
  };

  const getStatusColor = (status?: string): string => {
    if (!status) return styles.statusNeutral;
    
    switch(status.toLowerCase()) {
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

  const formatDate = (dateString?: string): string => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  // Legal Pulse Helper Functions
  const getRiskLevel = (riskScore: number | null | undefined): 'high' | 'medium' | 'low' | 'unrated' => {
    if (riskScore === null || riskScore === undefined) return 'unrated';
    if (riskScore >= 70) return 'low';
    if (riskScore >= 40) return 'medium';
    return 'high';
  };

  const getRiskLabel = (riskLevel: 'high' | 'medium' | 'low' | 'unrated'): string => {
    switch (riskLevel) {
      case 'high': return 'Hohes Risiko';
      case 'medium': return 'Mittleres Risiko';
      case 'low': return 'Geringes Risiko';
      case 'unrated': return 'Nicht bewertet';
    }
  };

  const getRiskColor = (riskLevel: 'high' | 'medium' | 'low' | 'unrated'): string => {
    switch (riskLevel) {
      case 'high': return styles.riskHigh;
      case 'medium': return styles.riskMedium;
      case 'low': return styles.riskLow;
      case 'unrated': return styles.riskUnrated;
    }
  };

  // Helper: Build analysis context for chat
  const buildAnalysisContext = (contractData: Contract): string => {
    const parts: string[] = [];

    if (contractData.analysis) {
      if (contractData.analysis.summary) {
        parts.push(`**Zusammenfassung:** ${contractData.analysis.summary}`);
      }

      if (contractData.analysis.contractType) {
        parts.push(`**Vertragsart:** ${contractData.analysis.contractType}`);
      }

      if (contractData.analysis.positiveAspects?.length) {
        parts.push(`\n**Positive Aspekte:**`);
        contractData.analysis.positiveAspects.forEach(a => parts.push(`- ${a.title}`));
      }

      if (contractData.analysis.concerningAspects?.length) {
        parts.push(`\n**Kritische Punkte:**`);
        contractData.analysis.concerningAspects.forEach(a => parts.push(`- ${a.title}`));
      }

      if (contractData.analysis.recommendations?.length) {
        parts.push(`\n**Empfehlungen:**`);
        contractData.analysis.recommendations.forEach(r => {
          const recText = typeof r === 'string' ? r : (r as { title?: string }).title || '';
          if (recText) parts.push(`- ${recText}`);
        });
      }
    }

    if (contractData.legalPulse) {
      if (contractData.legalPulse.riskScore !== null && contractData.legalPulse.riskScore !== undefined) {
        parts.push(`\n**Legal Pulse Score:** ${contractData.legalPulse.riskScore}/100`);
      }
      if (contractData.legalPulse.riskFactors?.length) {
        parts.push(`**Risikofaktoren:**`);
        contractData.legalPulse.riskFactors.forEach(r => parts.push(`- ${r}`));
      }
    }

    return parts.join('\n');
  };

  // Handler: Open contract in KI-Rechtsbot Chat
  const handleOpenInChat = async () => {
    if (!contract || openingChat) return;

    // Double-check subscription on frontend
    if (!isBusinessOrHigher) {
      setNotification({ message: 'Diese Funktion ist nur für Business/Enterprise Nutzer verfügbar', type: 'error' });
      return;
    }

    setOpeningChat(true);

    try {
      const token = localStorage.getItem('token');
      const analysisContext = buildAnalysisContext(contract);

      const response = await fetch('/api/chat/new-with-contract', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          contractId: contract._id,
          contractName: contract.name,
          analysisContext: analysisContext,
          s3Key: contract.s3Key || null
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Chat konnte nicht erstellt werden');
      }

      const data = await response.json();
      navigate(`/chat?id=${data.chatId}`);
    } catch (error) {
      console.error('Error opening chat:', error);
      const errorMessage = error instanceof Error ? error.message : 'Chat konnte nicht geöffnet werden';
      setNotification({ message: errorMessage, type: 'error' });
    } finally {
      setOpeningChat(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Vertrag wird geladen...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className={styles.errorContainer}>
        <div className={styles.errorIcon}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 9V11M12 15H12.01M5.07183 19H18.9282C20.4678 19 21.4301 17.3333 20.6603 16L13.7321 4C12.9623 2.66667 11.0378 2.66667 10.268 4L3.33978 16C2.56998 17.3333 3.53223 19 5.07183 19Z" 
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h2>Vertrag nicht gefunden</h2>
        <p>Der angeforderte Vertrag konnte nicht geladen werden.</p>
        <button className={styles.primaryButton} onClick={() => navigate('/dashboard')}>
          Zurück zur Übersicht
        </button>
      </div>
    );
  }

  const riskLevel = getRiskLevel(contract.legalPulse?.riskScore);
  const riskLabel = getRiskLabel(riskLevel);

  return (
    <>
      <Helmet>
        <title>Vertragsdetails ansehen | Contract AI</title>
        <meta name="description" content="Detaillierte Einblicke in deine hochgeladenen Verträge. Sieh Klauseln, Analyseergebnisse und Optimierungsvorschläge im Detail." />
        <meta name="keywords" content="Vertragsdetails, Vertrag ansehen, Vertragsanalyse, Contract AI" />
        <link rel="canonical" href="https://www.contract-ai.de/contract-details" />
        {/* Open Graph / Facebook */}
        <meta property="og:title" content="Vertragsdetails ansehen | Contract AI" />
        <meta property="og:description" content="Alle Details zu deinem Vertrag übersichtlich aufbereitet. Mit Contract AI alles im Blick." />
        <meta property="og:url" content="https://www.contract-ai.de/contract-details" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://www.contract-ai.de/og-image.jpg" />
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Vertragsdetails ansehen | Contract AI" />
        <meta name="twitter:description" content="Alle Vertragsdetails transparent einsehen und verstehen. Contract AI zeigt dir alles auf einen Blick." />
        <meta name="twitter:image" content="https://www.contract-ai.de/og-image.jpg" />
      </Helmet>

      <div className={styles.container}>
        <div className={styles.header}>
          <h1>Vertragsdetails</h1>
          <div className={styles.headerActions}>
            <button 
              className={styles.iconButton} 
              onClick={() => navigate(-1)}
              aria-label="Zurück"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.contractCard}>
          <div className={styles.contractHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2>{contract.name}</h2>
              {contract.isGenerated && (
                <span style={{
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%)',
                  color: 'white',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  ✨ KI-Generiert
                </span>
              )}
            </div>
            <div className={`${styles.statusBadge} ${getStatusColor(contract.status)}`}>
              {contract.status || "Status unbekannt"}
            </div>
          </div>

          <div className={styles.infoGrid}>
            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>Laufzeit</span>
                <span className={styles.infoValue}>{contract.laufzeit || "Nicht angegeben"}</span>
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 10H3M16 2V6M8 2V6M7.8 22H16.2C17.8802 22 18.7202 22 19.362 21.673C19.9265 21.3854 20.3854 20.9265 20.673 20.362C21 19.7202 21 18.8802 21 17.2V8.8C21 7.11984 21 6.27976 20.673 5.63803C20.3854 5.07354 19.9265 4.6146 19.362 4.32698C18.7202 4 17.8802 4 16.2 4H7.8C6.11984 4 5.27976 4 4.63803 4.32698C4.07354 4.6146 3.6146 5.07354 3.32698 5.63803C3 6.27976 3 7.11984 3 8.8V17.2C3 18.8802 3 19.7202 3.32698 20.362C3.6146 20.9265 4.07354 21.3854 4.63803 21.673C5.27976 22 6.11984 22 7.8 22Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>Ablaufdatum</span>
                <span className={styles.infoValue}>{contract.expiryDate ? formatDate(contract.expiryDate) : "Nicht angegeben"}</span>
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 14L4 9L9 4M15 4L20 9L15 14M13 18V16.5M10 21H14M8 16V12C8 9.79086 9.79086 8 12 8C14.2091 8 16 9.79086 16 12V16" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>Kündigungsfrist</span>
                <span className={styles.infoValue}>{contract.kuendigung || "Nicht angegeben"}</span>
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.infoIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14.8571 15C14.8571 16.972 13.2149 18.5714 11.1429 18.5714C9.07084 18.5714 7.42857 16.972 7.42857 15M15.4286 6.85714L17.1429 15.5714M6.85714 15.5714L8.57143 6.85714M17.5714 20.1429H4.71429C4.00324 20.1429 3.42857 19.5682 3.42857 18.8571V5.14286C3.42857 4.4318 4.00324 3.85714 4.71429 3.85714H17.5714C18.2825 3.85714 18.8571 4.4318 18.8571 5.14286V18.8571C18.8571 19.5682 18.2825 20.1429 17.5714 20.1429Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <div className={styles.infoContent}>
                <span className={styles.infoLabel}>
                  {contract.isGenerated ? 'Erstellt' : 'Hochgeladen'}
                </span>
                <span className={styles.infoValue}>
                  {contract.isGenerated 
                    ? (contract.createdAt ? formatDate(contract.createdAt) : "Nicht angegeben")
                    : (contract.uploadedAt ? formatDate(contract.uploadedAt) : "Nicht angegeben")
                  }
                </span>
              </div>
            </div>
          </div>

          {/* 📅 Wichtige Termine - KI-extrahierte Datums */}
          {contract.importantDates && contract.importantDates.length > 0 && (
            <ImportantDatesSection
              importantDates={contract.importantDates}
              contractName={contract.name}
            />
          )}

          {/* 🔔 Kalendererinnerungen für diesen Vertrag */}
          <div className={styles.section} style={{ marginTop: '2rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🔔</span> Kalendererinnerungen
            </h3>
            {loadingEvents ? (
              <p style={{ color: '#666', fontStyle: 'italic' }}>Lade Erinnerungen...</p>
            ) : calendarEvents.length === 0 ? (
              <p style={{ color: '#888', fontSize: '0.9rem' }}>
                Keine Kalendererinnerungen für diesen Vertrag vorhanden.
                <br />
                <span style={{ fontSize: '0.85rem', color: '#aaa' }}>
                  Erstelle im Kalender ein Ereignis und verknüpfe es mit diesem Vertrag.
                </span>
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {calendarEvents.map((event) => {
                    const eventDate = new Date(event.date);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const daysUntil = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                    const isPast = daysUntil < 0;

                    const severityColors = {
                      critical: { bg: '#fee2e2', border: '#ef4444', text: '#b91c1c' },
                      warning: { bg: '#fef3c7', border: '#f59e0b', text: '#b45309' },
                      info: { bg: '#e0e7ff', border: '#6366f1', text: '#4338ca' }
                    };
                    const colors = severityColors[event.severity] || severityColors.info;

                    return (
                      <div
                        key={event._id}
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: '8px',
                          backgroundColor: colors.bg,
                          borderLeft: `4px solid ${colors.border}`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          opacity: isPast ? 0.6 : 1
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 500, color: colors.text }}>{event.title}</div>
                          <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '0.25rem' }}>
                            {eventDate.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                            {' • '}
                            {isPast ? `vor ${Math.abs(daysUntil)} Tagen` : daysUntil === 0 ? 'Heute' : daysUntil === 1 ? 'Morgen' : `in ${daysUntil} Tagen`}
                          </div>
                        </div>
                        <button
                          onClick={() => navigate('/calendar')}
                          style={{
                            padding: '0.4rem 0.8rem',
                            fontSize: '0.8rem',
                            background: 'white',
                            border: `1px solid ${colors.border}`,
                            borderRadius: '6px',
                            color: colors.text,
                            cursor: 'pointer'
                          }}
                        >
                          Zum Kalender
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>

          {/* ✅ NEU: Contract Content Viewer - Zeigt den vollständigen Vertragsinhalt */}
          <ContractContentViewer contract={contract} />

          {/* 📄 Comprehensive Content Analysis Section */}
          {contract.analysis && (
            <div className={styles.legalPulseSection}>
              <div className={styles.legalPulseHeader}>
                <div className={styles.sectionIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>📄 Umfassende Vertragsanalyse</h3>
              </div>

              <div className={styles.legalPulseContent}>
                {/* Summary */}
                {contract.analysis.summary && (
                  <div className={styles.pulseItem}>
                    <h4>📋 Zusammenfassung</h4>
                    <p className={styles.pulseSummary}>{contract.analysis.summary}</p>
                  </div>
                )}

                {/* Contract Type & Parties */}
                {(contract.analysis.contractType || contract.analysis.parties) && (
                  <div className={styles.pulseItem}>
                    <h4>📑 Vertragsdetails</h4>
                    {contract.analysis.contractType && (
                      <p><strong>Vertragsart:</strong> {contract.analysis.contractType}</p>
                    )}
                    {contract.analysis.parties && (
                      <>
                        {contract.analysis.parties.provider && (
                          <p><strong>Anbieter:</strong> {contract.analysis.parties.provider}</p>
                        )}
                        {contract.analysis.parties.customer && (
                          <p><strong>Kunde:</strong> {contract.analysis.parties.customer}</p>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Key Terms */}
                {contract.analysis.keyTerms && Object.values(contract.analysis.keyTerms).some(v => v) && (
                  <div className={styles.pulseItem}>
                    <h4>🔑 Wichtige Vertragskonditionen</h4>
                    <ul className={styles.pulseList}>
                      {contract.analysis.keyTerms.duration && (
                        <li><strong>Laufzeit:</strong> {contract.analysis.keyTerms.duration}</li>
                      )}
                      {contract.analysis.keyTerms.cancellation && (
                        <li><strong>Kündigung:</strong> {contract.analysis.keyTerms.cancellation}</li>
                      )}
                      {contract.analysis.keyTerms.payment && (
                        <li><strong>Zahlung:</strong> {contract.analysis.keyTerms.payment}</li>
                      )}
                      {contract.analysis.keyTerms.deliverables && (
                        <li><strong>Leistungsumfang:</strong> {contract.analysis.keyTerms.deliverables}</li>
                      )}
                    </ul>
                  </div>
                )}

                {/* Positive Aspects */}
                {contract.analysis.positiveAspects && contract.analysis.positiveAspects.length > 0 && (
                  <div className={styles.pulseItem}>
                    <h4>✅ Positive Aspekte</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {contract.analysis.positiveAspects.map((aspect, index) => (
                        <div key={index} style={{
                          padding: '12px',
                          background: '#f0fdf4',
                          border: '1px solid #bbf7d0',
                          borderRadius: '8px'
                        }}>
                          <h5 style={{ margin: '0 0 8px 0', color: '#16a34a', fontSize: '14px', fontWeight: '600' }}>
                            {aspect.title}
                          </h5>
                          <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#374151' }}>
                            {aspect.description}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                            <strong>Relevant für:</strong> {aspect.relevance}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Concerning Aspects */}
                {contract.analysis.concerningAspects && contract.analysis.concerningAspects.length > 0 && (
                  <div className={styles.pulseItem}>
                    <h4>⚠️ Bedenkliche Aspekte</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {contract.analysis.concerningAspects.map((aspect, index) => (
                        <div key={index} style={{
                          padding: '12px',
                          background: '#fef3c7',
                          border: '1px solid #fde68a',
                          borderRadius: '8px'
                        }}>
                          <h5 style={{ margin: '0 0 8px 0', color: '#d97706', fontSize: '14px', fontWeight: '600' }}>
                            {aspect.title}
                          </h5>
                          <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#374151' }}>
                            {aspect.description}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                            <strong>Auswirkungen:</strong> {aspect.impact}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Important Clauses */}
                {contract.analysis.importantClauses && contract.analysis.importantClauses.length > 0 && (
                  <div className={styles.pulseItem}>
                    <h4>📝 Wichtige Klauseln</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {contract.analysis.importantClauses.map((clause, index) => (
                        <div key={index} style={{
                          padding: '12px',
                          background: '#f3f4f6',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px'
                        }}>
                          <h5 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '14px', fontWeight: '600' }}>
                            {clause.title}
                          </h5>
                          <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#4b5563' }}>
                            <strong>Inhalt:</strong> {clause.content}
                          </p>
                          <p style={{ margin: '0 0 6px 0', fontSize: '13px', color: '#374151' }}>
                            <strong>Bedeutung:</strong> {clause.explanation}
                          </p>
                          <p style={{ margin: 0, fontSize: '12px', color: '#6366f1', fontWeight: '500' }}>
                            💡 {clause.action}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {contract.analysis.recommendations && contract.analysis.recommendations.length > 0 && (
                  <div className={styles.pulseItem}>
                    <h4>💡 Empfehlungen</h4>
                    <ul className={styles.pulseList}>
                      {contract.analysis.recommendations.map((rec, index) => (
                        <li key={index} className={styles.recommendationItem}>
                          {typeof rec === 'string' ? rec : (rec as { title?: string; description?: string }).title || (rec as { title?: string; description?: string }).description || JSON.stringify(rec)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Missing Information */}
                {contract.analysis.missingInformation && contract.analysis.missingInformation.length > 0 && (
                  <div className={styles.pulseItem}>
                    <h4>ℹ️ Fehlende Informationen</h4>
                    <ul className={styles.pulseList}>
                      {contract.analysis.missingInformation.map((info, index) => (
                        <li key={index} style={{ color: '#6b7280' }}>{info}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {contract.analysis.analyzedAt && (
                  <div className={styles.pulseFooter}>
                    <span className={styles.analysisDate}>
                      Analyse durchgeführt: {formatDate(contract.analysis.analyzedAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Legal Pulse Analysis Section */}
          {contract.legalPulse && (
            <div className={styles.legalPulseSection}>
              <div className={styles.legalPulseHeader}>
                <div className={styles.sectionIcon}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386L9.663 17z" 
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <h3>🧠 Legal Pulse Analyse</h3>
                <div className={`${styles.riskBadge} ${getRiskColor(riskLevel)}`}>
                  {riskLabel}
                  {contract.legalPulse.riskScore !== null && contract.legalPulse.riskScore !== undefined && (
                    <span className={styles.riskScoreText}>({contract.legalPulse.riskScore})</span>
                  )}
                </div>
              </div>

              <div className={styles.legalPulseContent}>
                {contract.legalPulse.summary && (
                  <div className={styles.pulseItem}>
                    <h4>📋 Zusammenfassung</h4>
                    <p className={styles.pulseSummary}>{contract.legalPulse.summary}</p>
                  </div>
                )}

                {contract.legalPulse.riskFactors && contract.legalPulse.riskFactors.length > 0 && (
                  <div className={styles.pulseItem}>
                    <h4>⚠️ Identifizierte Risiken</h4>
                    <ul className={styles.pulseList}>
                      {contract.legalPulse.riskFactors.map((risk, index) => (
                        <li key={index} className={styles.riskItem}>{risk}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {contract.legalPulse.legalRisks && contract.legalPulse.legalRisks.length > 0 && (
                  <div className={styles.pulseItem}>
                    <h4>⚖️ Rechtliche Hinweise</h4>
                    <ul className={styles.pulseList}>
                      {contract.legalPulse.legalRisks.map((legal, index) => (
                        <li key={index} className={styles.legalItem}>{legal}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {contract.legalPulse.recommendations && contract.legalPulse.recommendations.length > 0 && (
                  <div className={styles.pulseItem}>
                    <h4>💡 Empfehlungen</h4>
                    <ul className={styles.pulseList}>
                      {contract.legalPulse.recommendations.map((rec, index) => (
                        <li key={index} className={styles.recommendationItem}>
                          {typeof rec === 'string' ? rec : (rec as { title?: string; description?: string }).title || (rec as { title?: string; description?: string }).description || JSON.stringify(rec)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {contract.legalPulse.analysisDate && (
                  <div className={styles.pulseFooter}>
                    <span className={styles.analysisDate}>
                      Analyse durchgeführt: {formatDate(contract.legalPulse.analysisDate)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className={styles.reminderSection}>
            <div className={styles.reminderTitle}>
              <div className={styles.reminderIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 17V16M12 13V7M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h3>Erinnerung</h3>
            </div>
            
            <div className={styles.reminderContent}>
              <div className={styles.reminderToggle}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={contract.reminder ?? false}
                    onChange={toggleReminder}
                  />
                  <span className={styles.slider}></span>
                </label>
                <span>Erinnerung {contract.reminder ? "aktiviert" : "deaktiviert"}</span>
              </div>

              {contract.reminderLastSentAt && (
                <div className={styles.reminderInfo}>
                  <span>Letzte Erinnerung gesendet: {formatDate(contract.reminderLastSentAt)}</span>
                </div>
              )}

              <button
                className={styles.reminderButton}
                onClick={() => setShowReminderModal(true)}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  background: '#6366f1',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#4f46e5'}
                onMouseOut={(e) => e.currentTarget.style.background = '#6366f1'}
              >
                📅 Custom Reminders verwalten
              </button>
            </div>
          </div>

          {editing ? (
            <div className={styles.editForm}>
              <div className={styles.formGroup}>
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Vertragsname"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="laufzeit">Laufzeit</label>
                <input
                  id="laufzeit"
                  name="laufzeit"
                  type="text"
                  value={formData.laufzeit}
                  onChange={handleChange}
                  placeholder="z.B. 12 Monate"
                />
              </div>
              
              <div className={styles.formGroup}>
                <label htmlFor="kuendigung">Kündigungsfrist</label>
                <input
                  id="kuendigung"
                  name="kuendigung"
                  type="text"
                  value={formData.kuendigung}
                  onChange={handleChange}
                  placeholder="z.B. 3 Monate"
                />
              </div>
              
              <div className={styles.formActions}>
                <button 
                  className={styles.primaryButton} 
                  onClick={handleSave}
                  disabled={saving}
                  style={{ opacity: saving ? 0.7 : 1, cursor: saving ? 'not-allowed' : 'pointer' }}
                >
                  {saving ? 'Speichere...' : 'Speichern'}
                </button>
                <button className={styles.secondaryButton} onClick={() => setEditing(false)}>
                  Abbrechen
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.actionButtons}>
              <button
                className={styles.primaryButton}
                onClick={() => setEditing(true)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M11 5H6C4.89543 5 4 5.89543 4 7V18C4 19.1046 4.89543 20 6 20H17C18.1046 20 19 19.1046 19 18V13M17.5858 3.58579C18.3668 2.80474 19.6332 2.80474 20.4142 3.58579C21.1953 4.36683 21.1953 5.63316 20.4142 6.41421L11.8284 15H9L9 12.1716L17.5858 3.58579Z" 
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Bearbeiten
              </button>
              
              <button
                className={styles.actionButton}
                onClick={handleCalendarExport}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8 7V3M16 7V3M7 11H17M5 21H19C20.1046 21 21 20.1046 21 19V7C21 5.89543 20.1046 5 19 5H5C3.89543 5 3 5.89543 3 7V19C3 20.1046 3.89543 21 5 21Z" 
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Kalender
              </button>
              
              {/* Zeige PDF-Button nur für hochgeladene Verträge mit filePath */}
              {contract.filePath && !contract.isGenerated && (
                <a
                  href={`/api${contract.filePath}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.actionButton}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 10V16M12 16L9 13M12 16L15 13M17 21H7C5.89543 21 5 20.1046 5 19V5C5 3.89543 5.89543 3 7 3H12.5858C12.851 3 13.1054 3.10536 13.2929 3.29289L18.7071 8.70711C18.8946 8.89464 19 9.149 19 9.41421V19C19 20.1046 18.1046 21 17 21Z"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Original PDF öffnen
                </a>
              )}

              {/* 🆕 Zeige optimiertes PDF-Button wenn vorhanden */}
              {contract.optimizedPdfS3Key && (
                <button
                  onClick={async () => {
                    try {
                      // Get presigned URL for optimized PDF
                      const response = await fetch(`/api/s3/view?key=${contract.optimizedPdfS3Key}`, {
                        credentials: "include"
                      });
                      const data = await response.json();
                      if (data.url) {
                        window.open(data.url, '_blank');
                      }
                    } catch (error) {
                      console.error('Error opening optimized PDF:', error);
                      setNotification({ message: "Fehler beim Öffnen des optimierten PDFs", type: "error" });
                    }
                  }}
                  className={styles.actionButton}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" fill="currentColor"/>
                  </svg>
                  Optimiertes PDF öffnen
                </button>
              )}

              {/* 🔍 Legal Lens - Interaktive Vertragsanalyse */}
              <button
                onClick={() => navigate(`/legal-lens/${contract._id}`)}
                className={styles.actionButton}
                style={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
                  color: 'white',
                  border: 'none'
                }}
                title="Vertrag interaktiv analysieren - Klauseln verstehen, Risiken erkennen"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Legal Lens
              </button>

              {/* 💬 Mit KI-Rechtsbot besprechen - Business/Enterprise only */}
              <button
                onClick={handleOpenInChat}
                className={styles.actionButton}
                disabled={openingChat || !isBusinessOrHigher}
                style={{
                  background: isBusinessOrHigher
                    ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    : '#9ca3af',
                  color: 'white',
                  border: 'none',
                  opacity: !isBusinessOrHigher ? 0.6 : openingChat ? 0.8 : 1,
                  cursor: !isBusinessOrHigher ? 'not-allowed' : openingChat ? 'wait' : 'pointer'
                }}
                title={!isBusinessOrHigher
                  ? 'Nur für Business & Enterprise Nutzer verfügbar'
                  : 'Vertrag mit KI-Rechtsbot besprechen - Fragen stellen, Details klären'}
              >
                {openingChat ? (
                  <>
                    <Loader size={16} className={styles.spinningLoader} />
                    Öffne Chat...
                  </>
                ) : (
                  <>
                    <MessageSquare size={16} />
                    {isBusinessOrHigher ? 'Mit KI besprechen' : 'Chat (Business)'}
                  </>
                )}
              </button>

              <button
                className={styles.dangerButton}
                onClick={handleDelete}
                disabled={deleting}
                style={{ opacity: deleting ? 0.7 : 1, cursor: deleting ? 'not-allowed' : 'pointer' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M16 9V19H8V9M10 5H14M6 9H18M14 5L13 4H11L10 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {deleting ? 'Lösche...' : 'Löschen'}
              </button>
            </div>
          )}
        </div>

        {notification && (
          <Notification
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}

        {/* Reminder Settings Modal */}
        {showReminderModal && contract && (
          <ReminderSettingsModal
            contractId={contract._id}
            contractName={contract.name}
            onClose={() => setShowReminderModal(false)}
            onSuccess={(reminderDays: number[]) => {
              console.log('Custom reminders saved:', reminderDays);
              setNotification({ message: 'Custom Reminders erfolgreich gespeichert!', type: 'success' });
              setShowReminderModal(false);
            }}
          />
        )}
      </div>
    </>
  );
}