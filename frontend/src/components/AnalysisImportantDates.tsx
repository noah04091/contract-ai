import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calendar, Plus, X, Loader, Crown, Trash2 } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useCalendarStore } from "../stores/calendarStore";
import type { CalendarEvent, CalendarAccess } from "../stores/calendarStore";
import styles from "../styles/AnalysisImportantDates.module.css";
import { classifyDocType, type DocClass } from "./contractAnalysisV2/v2TabLabels";

interface AnalysisImportantDatesProps {
  contractId: string;
  contractName: string;
  // 🎯 22.05.2026 — typspezifische User-Texte ("diesen Vertrag" / "diese Rechnung" / etc.)
  documentType?: string | null;
  contractType?: string | null;
}

// 🎯 22.05.2026 — typspezifische Dokument-Referenz für User-Texte
// Liefert den passenden Bezug zum Dokumenttyp ("diesen Vertrag", "diese Rechnung", etc.)
function docReference(dc: DocClass): string {
  switch (dc) {
    case "AGB": return "diese AGB";
    case "INVOICE": return "diese Rechnung";
    case "RECEIPT": return "diesen Beleg";
    case "TABLE_DOCUMENT": return "diese Tabelle";
    case "FINANCIAL_DOCUMENT": return "dieses Finanzdokument";
    case "LETTER": return "dieses Schreiben";
    case "UNKNOWN": return "dieses Dokument";
    case "CONTRACT":
    default: return "diesen Vertrag";
  }
}

type Severity = "info" | "warning" | "critical";

interface FormState {
  title: string;
  date: string;
  description: string;
  severity: Severity;
}

// 📅 Stufe-2c: Daten aus Contract-Document für Frist-Hinweise + Historie.
// Felder kommen aus dem Backend (Date Hunt Stage + deterministischer Extractor).
// Mixed-Type weil AI-getrieben — Frontend rendert per render-if-present.
interface FristHinweis {
  type: string;
  title: string;
  description?: string;
  legalBasis?: string;
  evidence?: string;
}

interface CancellationPeriod {
  value?: number;
  unit?: string;
  type?: string;
}

// Icon-Mapping je Frist-Typ. Nicht aufgeführte Typen → Default-Icon.
// Universal: alle möglichen Frist-Typen aus dem Date Hunt Service.
const FRIST_ICON: Record<string, string> = {
  kuendigungsfrist: "🚪",
  widerrufsfrist: "↩️",
  gewaehrleistungsfrist: "🛡️",
  verjaehrungsfrist: "⏳",
  probezeit: "👔",
  maengelruegepflicht: "⚠️",
  lieferfrist: "📦",
  annahmefrist: "✍️",
  karenzentschaedigung: "💼",
  optionsfrist: "⏰",
  reaktionsfrist: "⚡",
  wartungsfrist: "🔧",
  anpassungsfrist: "📈",
  zahlungsfrist: "💰",
  ruegefrist: "📣",
  einwendungsfrist: "⚖️",
  sperrfrist: "🔒",
  sonstige: "📌",
  // 📨 Welle 1 (07.07.2026): Fristen aus einseitigen Schreiben (LETTER-Modus)
  klagefrist: "⚖️",
  widerspruchsfrist: "📮",
  einspruchsfrist: "🏛️",
};

const fristIcon = (type?: string): string => {
  if (!type) return "📌";
  return FRIST_ICON[type.toLowerCase()] || "📌";
};

const INITIAL_FORM: FormState = {
  title: "",
  date: "",
  description: "",
  severity: "info",
};

export default function AnalysisImportantDates({
  contractId,
  contractName,
  documentType,
  contractType,
}: AnalysisImportantDatesProps) {
  // 🎯 22.05.2026 — DocClass für typspezifische User-Texte
  const docClass = classifyDocType(documentType, contractType);
  const docRef = docReference(docClass);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [access, setAccess] = useState<CalendarAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // 📅 Stufe-2c: Frist-Hinweise + Kündigungsfrist (Fallback) werden zusätzlich
  // zum Calendar-Events-Pfad geladen, weil sie aus dem Contract-Document selbst
  // kommen (Date Hunt Stage + deterministischer Regex-Extractor).
  // Historische Datums werden NICHT mehr separat hier gerendert — sie kommen jetzt
  // als Kalender-Events mit isHistorical=true durch den Calendar-Events-Pfad
  // (Whitelist im Backend filtert Metadaten-Lärm raus).
  const [fristHinweise, setFristHinweise] = useState<FristHinweis[]>([]);
  const [cancellationPeriod, setCancellationPeriod] = useState<CancellationPeriod | null>(null);

  // Standardmäßig erste 4 Fristen anzeigen, Rest hinter Toggle. Verhindert
  // visuelle Überladung bei komplexen Verträgen (Factoring etc. mit 12+ Fristen).
  const [fristenExpanded, setFristenExpanded] = useState(false);
  const FRISTEN_COLLAPSED_LIMIT = 4;

  // 📅 View-Toggle: Zeitstrahl-Ansicht (vertikale Linie mit Severity-Dots
  // und HEUTE-Divider) oder Listen-Ansicht (Detail-Karten mit Emoji-Severity).
  // Default 'timeline' — visuell wertvoller für First-Impression bei Free-Usern
  // (Conversion-Optimierung). User-Wahl wird in LocalStorage persistiert, damit
  // Power-User auf 'list' bleiben können wenn sie das einmal gewählt haben.
  const [viewMode, setViewMode] = useState<"list" | "timeline">(() => {
    if (typeof window === "undefined") return "timeline";
    try {
      const saved = localStorage.getItem("analysisTimelineView");
      if (saved === "list" || saved === "timeline") return saved;
    } catch { /* localStorage geblockt (Safari Private) — Default greift */ }
    return "timeline";
  });
  const updateViewMode = (mode: "list" | "timeline") => {
    setViewMode(mode);
    try { localStorage.setItem("analysisTimelineView", mode); } catch { /* localStorage geblockt — UI funktioniert trotzdem */ }
  };

  // Termin-löschen-Modal: User klickt auf × → Confirmation. AI-Events werden via dismiss
  // gelöscht (verhindert Wiederkehr bei Re-Analyse via cleanupFilter-Schutz im Backend),
  // manuelle Events via Hard-Delete. State hält das zu löschende Event vor.
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);
  const [deleting, setDeleting] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();
  const { clearCache: clearCalendarCache } = useCalendarStore();

  const fetchEvents = useCallback(async () => {
    if (!contractId) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/calendar/events?contractId=${contractId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setEvents(data.events || []);
          setAccess(data.access || null);
        }
      } else {
        console.error("📅 Calendar Events API Error:", res.status, res.statusText);
      }
    } catch (err) {
      console.error("Error fetching calendar events:", err);
    } finally {
      setLoading(false);
    }
  }, [contractId]);

  // Lädt das Contract-Document und extrahiert daraus die drei zusätzlichen
  // Anzeige-Quellen: fristHinweise (Date Hunt), Vergangenheits-Datums
  // (importantDates mit date < heute) und cancellationPeriod (Regex-Fallback,
  // damit auch bei 0 Frist-Hinweisen ein sinnvoller Hinweis angezeigt werden
  // kann). Fehler hier blockieren NICHT die Termine-Anzeige.
  const fetchContractMeta = useCallback(async () => {
    if (!contractId) return;
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/contracts/${contractId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      const contract = data?.contract || data;

      // Frist-Hinweise direkt aus dem Document (kann undefined/leer sein)
      const fh = Array.isArray(contract?.fristHinweise) ? contract.fristHinweise : [];
      setFristHinweise(fh);

      // cancellationPeriod aus deterministischer Extraktion (Fallback bei leeren fristHinweise)
      const cp = contract?.cancellationPeriod;
      if (cp && typeof cp === "object" && cp.value && cp.unit) {
        setCancellationPeriod({ value: cp.value, unit: cp.unit, type: cp.type });
      } else {
        setCancellationPeriod(null);
      }
    } catch (err) {
      console.error("Error fetching contract meta for fristHinweise:", err);
    }
  }, [contractId]);

  useEffect(() => {
    fetchEvents();
    fetchContractMeta();
  }, [fetchEvents, fetchContractMeta]);

  const canCreate = access?.canCreate === true;
  const canDelete = access?.canDelete === true;

  // Termin löschen: bei manuellen Events Hard-Delete via DELETE-Endpoint,
  // bei AI-Events „dismiss" via quick-action — sodass das Event in der DB bleibt
  // und vom Cleanup-Filter (Backend) bei Re-Analyse nicht regeneriert wird.
  const handleDeleteClick = (event: CalendarEvent) => {
    if (!canDelete) {
      toast.info("Termin-Löschung ist ein Business/Enterprise-Feature");
      navigate("/pricing");
      return;
    }
    setDeleteTarget(event);
  };

  const handleCloseDeleteModal = () => {
    if (deleting) return;
    setDeleteTarget(null);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const event = deleteTarget;
    try {
      const token = localStorage.getItem("token");
      let res: Response;
      if (event.isManual) {
        // Hard-Delete: manuelle Events werden nicht regeneriert, dürfen weg
        res = await fetch(`/api/calendar/events/${event.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        // Dismiss: AI-Events bleiben in DB mit status='dismissed' →
        // Cleanup-Filter überspringt sie, Re-Analyse erzeugt kein Duplikat
        res = await fetch("/api/calendar/quick-action", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ eventId: event.id, action: "dismiss" }),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.success !== false) {
        toast.success("Termin entfernt");
        // Optimistic UI: lokal aus Liste rauswerfen + Cache invalidieren
        setEvents(prev => prev.filter(e => e.id !== event.id));
        clearCalendarCache();
        setDeleteTarget(null);
      } else if (res.status === 403 && data.upgradeRequired) {
        toast.error(data.error || "Business/Enterprise-Plan erforderlich");
      } else {
        toast.error(data.error || "Fehler beim Entfernen des Termins");
      }
    } catch (err) {
      console.error("Error deleting calendar event:", err);
      toast.error("Netzwerkfehler beim Entfernen");
    } finally {
      setDeleting(false);
    }
  };

  const handleAddClick = () => {
    if (!canCreate) {
      toast.info("Termin-Erstellung ist ein Business/Enterprise-Feature");
      navigate("/pricing");
      return;
    }
    setForm(INITIAL_FORM);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    if (submitting) return;
    setShowModal(false);
    setForm(INITIAL_FORM);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.date) {
      toast.error("Titel und Datum sind erforderlich");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          contractId,
          title: form.title.trim(),
          description: form.description.trim(),
          date: form.date,
          severity: form.severity,
          type: "CUSTOM",
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Termin hinzugefügt");
        setShowModal(false);
        setForm(INITIAL_FORM);
        clearCalendarCache();
        await fetchEvents();
      } else if (res.status === 403 && data.upgradeRequired) {
        toast.error(data.error || "Business/Enterprise-Plan erforderlich");
      } else {
        toast.error(data.error || "Fehler beim Erstellen des Termins");
      }
    } catch (err) {
      console.error("Error creating calendar event:", err);
      toast.error("Netzwerkfehler beim Erstellen");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getDaysUntil = (dateString: string): number => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const formatDaysUntil = (days: number): string => {
    if (days < 0) return `${Math.abs(days)} Tage vergangen`;
    if (days === 0) return "Heute!";
    if (days === 1) return "Morgen";
    if (days <= 7) return `In ${days} Tagen`;
    if (days <= 30) return `In ${Math.ceil(days / 7)} Wochen`;
    if (days <= 365) return `In ${Math.ceil(days / 30)} Monaten`;
    return `In ${Math.ceil(days / 365)} Jahren`;
  };

  const getSeverityEmoji = (severity: string): string => {
    if (severity === "critical") return "🔴";
    if (severity === "warning") return "🟡";
    return "🔵";
  };

  const getSeverityClass = (severity: string): string => {
    if (severity === "critical") return styles.severityCritical;
    if (severity === "warning") return styles.severityWarning;
    return styles.severityInfo;
  };

  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Fallback-Hinweis aus cancellationPeriod, wenn KEINE fristHinweise da sind
  // UND eine Kündigungsfrist deterministisch erkannt wurde. So sieht der User
  // bei einem komplexen Vertrag (Factoring etc.), bei dem GPT konservativ ist,
  // trotzdem die wichtigste Frist.
  const cancellationFallback: FristHinweis | null =
    fristHinweise.length === 0 && cancellationPeriod
      ? {
          type: "kuendigungsfrist",
          title: `Kündigungsfrist ${cancellationPeriod.value} ${cancellationPeriod.unit === "months" ? "Monate" : cancellationPeriod.unit === "weeks" ? "Wochen" : cancellationPeriod.unit === "days" ? "Tage" : cancellationPeriod.unit}${cancellationPeriod.type === "end_of_period" ? " zum Laufzeitende" : ""}`,
          description:
            "Aus dem Vertragstext erkannt. Komplexe Verträge enthalten oft mehrere Kündigungsregelungen — prüfe die ausführliche rechtliche Würdigung unten für den vollständigen Kontext.",
        }
      : null;

  const displayedFristHinweise: FristHinweis[] = fristHinweise.length > 0
    ? fristHinweise
    : cancellationFallback
      ? [cancellationFallback]
      : [];

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <motion.div
      className={styles.container}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className={styles.header}>
        <div className={styles.headerIcon}>
          <Calendar size={20} />
        </div>
        <div className={styles.headerText}>
          <h4 className={styles.title}>Wichtige Termine & Erinnerungen</h4>
          <p className={styles.subtitle}>
            {loading
              ? "Termine werden geladen..."
              : (() => {
                  // Subtitle zeigt beide Quellen sichtbar: konkrete Termine (sortedEvents)
                  // + Frist-Hinweise (fristHinweise). Bei Rahmenverträgen sind oft 0-2
                  // konkrete Datums, aber viele Frist-Hinweise — der User soll die
                  // gesamte termin-relevante Menge sofort sehen.
                  const fhCount = fristHinweise.length;
                  const evCount = sortedEvents.length;
                  if (evCount === 0 && fhCount === 0) return "Noch keine Termine hinterlegt";
                  const evPart = `${evCount} Termin${evCount !== 1 ? "e" : ""}`;
                  if (fhCount === 0) return `${evPart} für ${docRef}`;
                  return `${evPart} + ${fhCount} Frist${fhCount !== 1 ? "en" : ""} für ${docRef}`;
                })()}
          </p>
        </div>
        <button
          type="button"
          className={`${styles.addButton} ${!canCreate ? styles.addButtonUpgrade : ""}`}
          onClick={handleAddClick}
          disabled={loading}
          title={canCreate ? "Termin hinzufügen" : "Business/Enterprise-Feature"}
        >
          {canCreate ? <Plus size={16} /> : <Crown size={16} />}
          <span>{canCreate ? "Termin hinzufügen" : "Upgrade"}</span>
        </button>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>
          <Loader size={18} className={styles.spinner} />
          <span>Lädt Termine...</span>
        </div>
      ) : (
        <>
          {/* 📅 Stufe-2c Block 1: Wichtige Fristen & Hinweise (oberhalb der Termine).
              Zeigt fristHinweise aus Date Hunt; bei leerem Array zusätzlich der
              cancellationPeriod-Fallback aus deterministischer Extraktion. */}
          {displayedFristHinweise.length > 0 && (
            <div className={styles.fristenBlock}>
              <div className={styles.subBlockHeader}>
                <span className={styles.subBlockIcon}>⏰</span>
                <span className={styles.subBlockTitle}>Wichtige Fristen & Hinweise</span>
              </div>
              <div className={styles.fristenList}>
                {(fristenExpanded
                  ? displayedFristHinweise
                  : displayedFristHinweise.slice(0, FRISTEN_COLLAPSED_LIMIT)
                ).map((fh, idx) => (
                  <div key={`${fh.type}-${idx}`} className={styles.fristItem}>
                    <div className={styles.fristIconWrap}>{fristIcon(fh.type)}</div>
                    <div className={styles.fristContent}>
                      <div className={styles.fristTitle}>{fh.title}</div>
                      {fh.description && (
                        <div className={styles.fristDescription}>{fh.description}</div>
                      )}
                      {fh.legalBasis && (
                        <div className={styles.fristLegalBasis}>📖 {fh.legalBasis}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {displayedFristHinweise.length > FRISTEN_COLLAPSED_LIMIT && (
                <button
                  type="button"
                  className={styles.fristenToggleButton}
                  onClick={() => setFristenExpanded((v) => !v)}
                  aria-expanded={fristenExpanded}
                >
                  {fristenExpanded
                    ? "Weniger anzeigen"
                    : `+ ${displayedFristHinweise.length - FRISTEN_COLLAPSED_LIMIT} weitere Fristen anzeigen`}
                </button>
              )}
            </div>
          )}

          {/* Termine-Block (existing) */}
          {sortedEvents.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconWrap}>
                <Calendar size={28} />
              </div>
              <p className={styles.emptyTitle}>
                {displayedFristHinweise.length > 0
                  ? "Keine konkreten Kalendertermine"
                  : "Keine Termine gefunden"}
              </p>
              <p className={styles.emptySubtitle}>
                {displayedFristHinweise.length > 0
                  ? `${docClass === "CONTRACT" ? "Dieser Vertrag" : docClass === "AGB" ? "Diese AGB" : docClass === "INVOICE" ? "Diese Rechnung" : docClass === "RECEIPT" ? "Dieser Beleg" : docClass === "TABLE_DOCUMENT" ? "Diese Tabelle" : docClass === "FINANCIAL_DOCUMENT" ? "Dieses Finanzdokument" : "Dieses Dokument"} enthält keine konkreten Datumsangaben — die wichtigsten Fristen siehst du oben.`
                  : `Die KI hat für ${docRef} keine automatischen Termine erkannt.`}
                {canCreate
                  ? " Du kannst oben einen eigenen Termin hinzufügen."
                  : " Termin-Erstellung ist ein Business/Enterprise-Feature."}
              </p>
            </div>
          ) : (
            <>
              {/* View-Toggle: Liste (Detail-Karten) vs Zeitstrahl (vertikale Linie + HEUTE-Divider) */}
              <div className={styles.viewToggle} role="tablist" aria-label="Termine-Ansicht">
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "list"}
                  className={`${styles.viewToggleBtn} ${viewMode === "list" ? styles.viewToggleBtnActive : ""}`}
                  onClick={() => updateViewMode("list")}
                >
                  Liste
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={viewMode === "timeline"}
                  className={`${styles.viewToggleBtn} ${viewMode === "timeline" ? styles.viewToggleBtnActive : ""}`}
                  onClick={() => updateViewMode("timeline")}
                >
                  Zeitstrahl
                </button>
              </div>

              {viewMode === "list" ? (
                <div className={styles.eventList}>
                  {sortedEvents.map((event) => {
                    const days = getDaysUntil(event.date);
                    const daysClass =
                      days < 0 ? styles.past : days <= 7 ? styles.urgent : days <= 30 ? styles.soon : "";
                    return (
                      <div
                        key={event.id}
                        className={`${styles.eventItem} ${getSeverityClass(event.severity)}`}
                      >
                        <div className={styles.eventEmoji}>{getSeverityEmoji(event.severity)}</div>
                        <div className={styles.eventContent}>
                          <div className={styles.eventTitleRow}>
                            <span className={styles.eventTitle}>{event.title}</span>
                            {event.isManual && (
                              <span className={styles.manualBadge} title="Manuell hinzugefügt">
                                ✋ Manuell
                              </span>
                            )}
                          </div>
                          {event.description && (
                            <div className={styles.eventDescription}>{event.description}</div>
                          )}
                        </div>
                        <div className={styles.eventMeta}>
                          <div className={styles.eventDate}>{formatDate(event.date)}</div>
                          <div className={`${styles.eventDays} ${daysClass}`}>
                            {formatDaysUntil(days)}
                          </div>
                        </div>
                        {canDelete && (
                          <button
                            type="button"
                            className={styles.eventDeleteBtn}
                            onClick={() => handleDeleteClick(event)}
                            aria-label={`Termin „${event.title}" entfernen`}
                            title="Termin entfernen"
                          >
                            <Trash2 size={14} aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Zeitstrahl-Ansicht: vertikale Linie mit Severity-Dots, HEUTE-Divider zwischen past/future
                (() => {
                  const firstFutureIdx = sortedEvents.findIndex((e) => getDaysUntil(e.date) >= 0);
                  const hasPast = firstFutureIdx > 0;
                  const hasFuture = firstFutureIdx !== -1 && firstFutureIdx < sortedEvents.length;
                  // Echter Zeitstrahl: border-left auf jedem Event = unkaputtbare Linie.
                  // Funktioniert auch bei framer-motion-Stacking-Context, CSS-Module-Konflikten
                  // oder anderen unbekannten Layout-Problemen. Pro Event eine 2px-Border-Linie
                  // links, durch fehlende vertikale Margins entsteht ein durchgehender Strang.
                  return (
                    <div>
                      {sortedEvents.map((event, idx) => {
                        const days = getDaysUntil(event.date);
                        const sev: "urgent" | "soon" | "past" | "future" =
                          days < 0 ? "past" : days <= 7 ? "urgent" : days <= 30 ? "soon" : "future";
                        const dotColor =
                          sev === "urgent" ? "#ef4444"
                          : sev === "soon" ? "#f59e0b"
                          : sev === "past" ? "#94a3b8"
                          : "#2563eb";
                        const dotRing =
                          sev === "urgent" ? "#fef2f2"
                          : sev === "soon" ? "#fffbeb"
                          : sev === "past" ? "#f1f5f9"
                          : "#eff6ff";
                        const showDivider = hasPast && hasFuture && idx === firstFutureIdx;
                        return (
                          <div key={event.id}>
                            {showDivider && (
                              <div style={{
                                position: "relative",
                                marginLeft: 19,
                                borderLeft: "2px solid #2563eb",
                                paddingLeft: 32,
                                paddingTop: 14,
                                paddingBottom: 14,
                                display: "flex",
                                alignItems: "center",
                              }}>
                                {/* HEUTE-Dot zentriert auf border */}
                                <div style={{
                                  position: "absolute",
                                  left: -9,
                                  top: "50%",
                                  transform: "translateY(-50%)",
                                  width: 16,
                                  height: 16,
                                  borderRadius: "50%",
                                  background: "#2563eb",
                                  border: "3px solid #fff",
                                  boxShadow: "0 0 0 2px #2563eb",
                                }} />
                                <span style={{
                                  background: "#2563eb",
                                  color: "#fff",
                                  padding: "3px 12px",
                                  borderRadius: 999,
                                  fontSize: 10,
                                  fontWeight: 700,
                                  letterSpacing: 1.2,
                                }}>HEUTE</span>
                              </div>
                            )}
                            <div style={{
                              position: "relative",
                              marginLeft: 19,
                              borderLeft: `2px solid ${sev === "past" ? "#cbd5e1" : "#94a3b8"}`,
                              paddingLeft: 32,
                              paddingTop: 14,
                              paddingBottom: 14,
                              display: "flex",
                              alignItems: "flex-start",
                              borderBottom: idx < sortedEvents.length - 1 ? "1px solid #f1f5f9" : "none",
                            }}>
                              {/* DOT als SVG — robust gegen Stacking-Context (negative left
                                  wurde im div nicht gerendert). SVG mit overflow:visible
                                  ragt aus dem Container heraus und sitzt mittig auf der Border. */}
                              <svg
                                aria-hidden="true"
                                width="22"
                                height="22"
                                viewBox="0 0 22 22"
                                style={{
                                  position: "absolute",
                                  left: -12,
                                  top: 14,
                                  overflow: "visible",
                                  display: "block",
                                }}
                              >
                                {/* Pastell-Outer-Ring */}
                                <circle cx="11" cy="11" r="11" fill={dotRing} />
                                {/* Weißer Trennring */}
                                <circle cx="11" cy="11" r="8" fill="#ffffff" />
                                {/* Farbiger Inner-Dot */}
                                <circle cx="11" cy="11" r="6" fill={dotColor} />
                              </svg>
                              {/* CONTENT */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 2, flexWrap: "wrap" }}>
                                  <div style={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: sev === "past" ? "#64748b" : "#0f172a", minWidth: 88 }}>{formatDate(event.date)}</div>
                                  <div style={{ fontSize: 11.5, color: "#94a3b8" }}>{formatDaysUntil(days)}</div>
                                </div>
                                <div style={{ fontSize: 13.5, fontWeight: 550, color: sev === "past" ? "#475569" : "#0f172a", display: "inline-flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                  {event.isManual && <span title="Manuell hinzugefügt">✋</span>}
                                  {event.title}
                                </div>
                                {event.description && (
                                  <div style={{ fontSize: 12.5, color: "#64748b", marginTop: 4, lineHeight: 1.5 }}>{event.description}</div>
                                )}
                              </div>
                              {/* DELETE-BUTTON */}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClick(event)}
                                  aria-label={`Termin „${event.title}" entfernen`}
                                  title="Termin entfernen"
                                  style={{
                                    flexShrink: 0,
                                    width: 28,
                                    height: 28,
                                    borderRadius: 7,
                                    border: "1px solid #cbd5e1",
                                    background: "#f8fafc",
                                    color: "#475569",
                                    cursor: "pointer",
                                    display: "grid",
                                    placeItems: "center",
                                    marginLeft: 8,
                                    transition: "background .15s, color .15s, border-color .15s",
                                  }}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.background = "#fef2f2";
                                    e.currentTarget.style.color = "#ef4444";
                                    e.currentTarget.style.borderColor = "#fecaca";
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.background = "#f8fafc";
                                    e.currentTarget.style.color = "#475569";
                                    e.currentTarget.style.borderColor = "#cbd5e1";
                                  }}
                                >
                                  <Trash2 size={15} aria-hidden="true" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </>
          )}

          {/* Vertragshistorie-Block ENTFERNT (Doppelung beseitigt):
              Vergangene Datums werden jetzt mit isHistorical=true als reguläre
              Calendar-Events im Termine-Block oben gerendert (📜-Präfix vom
              Backend). Whitelist im Backend filtert Metadaten-Lärm raus.
              Daten bleiben in contract.importantDates abrufbar. */}
        </>
      )}

      {!canCreate && !loading && sortedEvents.length > 0 && (
        <div className={styles.upgradeHint}>
          <Crown size={14} />
          <span>Manuelle Termine hinzufügen ist ein Business/Enterprise-Feature</span>
        </div>
      )}

      <AnimatePresence>
        {showModal && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseModal}
          >
            <motion.div
              className={styles.modal}
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.modalHeader}>
                <div>
                  <h3 className={styles.modalTitle}>Neuer Termin</h3>
                  <p className={styles.modalSubtitle}>für „{contractName}"</p>
                </div>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={handleCloseModal}
                  disabled={submitting}
                  aria-label="Schließen"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                  <label htmlFor="event-title">Titel *</label>
                  <input
                    id="event-title"
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="z. B. Kündigungsfrist beachten"
                    maxLength={120}
                    required
                    autoFocus
                  />
                </div>

                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label htmlFor="event-date">Datum *</label>
                    <input
                      id="event-date"
                      type="date"
                      value={form.date}
                      min={todayStr}
                      onChange={(e) => setForm({ ...form, date: e.target.value })}
                      required
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label htmlFor="event-severity">Priorität</label>
                    <select
                      id="event-severity"
                      value={form.severity}
                      onChange={(e) =>
                        setForm({ ...form, severity: e.target.value as Severity })
                      }
                    >
                      <option value="info">🔵 Information</option>
                      <option value="warning">🟡 Warnung</option>
                      <option value="critical">🔴 Kritisch</option>
                    </select>
                  </div>
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="event-description">Beschreibung</label>
                  <textarea
                    id="event-description"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Optional: Zusätzliche Details zu diesem Termin..."
                    rows={3}
                    maxLength={500}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={handleCloseModal}
                    disabled={submitting}
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={submitting || !form.title.trim() || !form.date}
                  >
                    {submitting ? (
                      <>
                        <Loader size={16} className={styles.spinner} />
                        <span>Speichere...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={16} />
                        <span>Termin erstellen</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation-Modal beim Löschen eines Termins. AI-Events werden via dismiss
          gelöscht (status='dismissed'), manuelle Events via Hard-Delete. Beides bleibt
          nach Re-Analyse erhalten — siehe services/calendarEvents.js cleanupFilter. */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className={styles.modalOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseDeleteModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-confirm-title"
          >
            <motion.div
              className={styles.modal}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 460 }}
            >
              <div className={styles.modalHeader}>
                <h3 id="delete-confirm-title" className={styles.modalTitle}>
                  {getDaysUntil(deleteTarget.date) < 0 ? "Vergangenen Termin entfernen?" : "Termin entfernen?"}
                </h3>
                <button
                  type="button"
                  className={styles.modalClose}
                  onClick={handleCloseDeleteModal}
                  disabled={deleting}
                  aria-label="Modal schließen"
                >
                  <X size={20} aria-hidden="true" />
                </button>
              </div>
              <div style={{ padding: "16px 24px" }}>
                <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.55, marginBottom: 12 }}>
                  {getDaysUntil(deleteTarget.date) < 0
                    ? "Diesen vergangenen Termin aus der Übersicht entfernen?"
                    : "Diesen Termin entfernen?"}
                </p>
                <div style={{
                  background: "#fafbfc",
                  border: "1px solid #e5e7eb",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 14,
                }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a", marginBottom: 2 }}>
                    {deleteTarget.title}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#64748b" }}>
                    {formatDate(deleteTarget.date)}
                  </div>
                </div>
                <p style={{ fontSize: 12.5, color: "#64748b", lineHeight: 1.5 }}>
                  <strong style={{ color: "#92400e" }}>Achtung: dauerhaft.</strong>{" "}
                  {deleteTarget.isManual
                    ? "Dieser manuell hinzugefügte Termin wird endgültig entfernt."
                    : "Du erhältst keine Erinnerungen mehr für diesen Termin. Die Entscheidung bleibt auch nach einer Re-Analyse erhalten — der Termin taucht nicht wieder auf."}
                </p>
              </div>
              <div style={{ display: "flex", gap: 8, padding: "0 24px 20px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={handleCloseDeleteModal}
                  disabled={deleting}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    color: "#475569",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: deleting ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  Abbrechen
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={deleting}
                  style={{
                    padding: "9px 16px",
                    borderRadius: 8,
                    border: "1px solid #ef4444",
                    background: "#ef4444",
                    color: "#fff",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: deleting ? "wait" : "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    fontFamily: "inherit",
                  }}
                >
                  {deleting ? <Loader size={14} aria-hidden="true" /> : <Trash2 size={14} aria-hidden="true" />}
                  {deleting ? "Entferne..." : "Entfernen"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
