import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Calendar, Plus, X, Loader, Crown } from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useCalendarStore } from "../stores/calendarStore";
import type { CalendarEvent, CalendarAccess } from "../stores/calendarStore";
import styles from "../styles/AnalysisImportantDates.module.css";

interface AnalysisImportantDatesProps {
  contractId: string;
  contractName: string;
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

interface ImportantDate {
  type?: string;
  date: string;
  label: string;
  description?: string;
  source?: string;
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
}: AnalysisImportantDatesProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [access, setAccess] = useState<CalendarAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);

  // 📅 Stufe-2c: Frist-Hinweise + historische Datums + Kündigungsfrist (Fallback)
  // werden zusätzlich zum Calendar-Events-Pfad geladen, weil sie aus dem Contract-
  // Document selbst kommen (Date Hunt Stage + deterministischer Regex-Extractor).
  const [fristHinweise, setFristHinweise] = useState<FristHinweis[]>([]);
  const [historicalDates, setHistoricalDates] = useState<ImportantDate[]>([]);
  const [cancellationPeriod, setCancellationPeriod] = useState<CancellationPeriod | null>(null);

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

      // Vergangenheits-Datums: alle importantDates, deren date heute oder früher ist
      const allImportant: ImportantDate[] = Array.isArray(contract?.importantDates)
        ? contract.importantDates
        : [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const past = allImportant.filter((d) => {
        if (!d?.date) return false;
        const dt = new Date(d.date);
        if (isNaN(dt.getTime())) return false;
        dt.setHours(0, 0, 0, 0);
        return dt.getTime() <= today.getTime();
      });
      setHistoricalDates(past);

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

  // Vergangenheit absteigend sortieren (jüngste zuerst)
  const sortedHistorical = [...historicalDates].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
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
            "Diese Frist wurde aus dem Vertragstext erkannt. Plane sie ein, falls du den Vertrag beenden möchtest.",
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
              : sortedEvents.length === 0
              ? "Noch keine Termine hinterlegt"
              : `${sortedEvents.length} Termin${sortedEvents.length !== 1 ? "e" : ""} für diesen Vertrag`}
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
                {displayedFristHinweise.map((fh, idx) => (
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
                  ? "Dieser Vertrag enthält keine konkreten Datumsangaben — die wichtigsten Fristen siehst du oben."
                  : "Die KI hat für diesen Vertrag keine automatischen Termine erkannt."}
                {canCreate
                  ? " Du kannst oben einen eigenen Termin hinzufügen."
                  : " Termin-Erstellung ist ein Business/Enterprise-Feature."}
              </p>
            </div>
          ) : (
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
                  </div>
                );
              })}
            </div>
          )}

          {/* 📅 Stufe-2c Block 2: Vertragshistorie (unterhalb, gedimmt).
              Zeigt vergangene Datums (Mietbeginn, frühere Zahlungen etc.) als
              Anker-Information für den User. Keine Reminder, kein Kalender-Spam. */}
          {sortedHistorical.length > 0 && (
            <div className={styles.historyBlock}>
              <div className={styles.subBlockHeader}>
                <span className={styles.subBlockIcon}>📜</span>
                <span className={styles.subBlockTitle}>Vertragshistorie</span>
              </div>
              <div className={styles.historyList}>
                {sortedHistorical.map((d, idx) => {
                  const days = getDaysUntil(d.date);
                  return (
                    <div key={`${d.type || "hist"}-${idx}`} className={styles.historyItem}>
                      <div className={styles.historyEmoji}>🕒</div>
                      <div className={styles.historyContent}>
                        <div className={styles.historyTitle}>{d.label}</div>
                        {d.description && (
                          <div className={styles.historyDescription}>{d.description}</div>
                        )}
                      </div>
                      <div className={styles.historyMeta}>
                        <div className={styles.historyDate}>{formatDate(d.date)}</div>
                        <div className={styles.historyDays}>{formatDaysUntil(days)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
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
    </motion.div>
  );
}
