import { useState, useEffect, type CSSProperties } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import styles from './ReminderSettingsModal.module.css';
import { cleanDeadlineName, reminderLeadLabel, isReminderEntry, stripFileName } from '../utils/reminderGrouping';
import {
  X,
  Bell,
  Check,
  AlertTriangle,
  Calendar,
  Clock,
  Trash2,
  CalendarX2,
  Scale,
  CalendarPlus,
  ArrowLeft
} from 'lucide-react';

interface ReminderSetting {
  type: 'expiry' | 'cancellation' | 'custom';
  days: number;
  targetDate?: string;
  label?: string;
}

interface ReminderSettingsModalProps {
  contractId: string;
  contractName: string;
  currentReminderSettings?: ReminderSetting[];
  currentReminderDays?: number[];
  expiryDate?: string;
  kuendigung?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

interface AutoEvent {
  id: string;
  title: string;
  date: string;
  type: string;
  severity: string;
}

interface PresetOption {
  label: string;
  days: number;
}

const PRESET_OPTIONS: PresetOption[] = [
  { label: '1 Woche', days: 7 },
  { label: '2 Wochen', days: 14 },
  { label: '1 Monat', days: 30 },
  { label: '2 Monate', days: 60 },
  { label: '3 Monate', days: 90 },
];

const TYPE_CONFIG = {
  expiry: { label: 'Vertragsende', color: 'Expiry' },
  cancellation: { label: 'Kündigungsfrist', color: 'Cancellation' },
  custom: { label: 'Eigenes Datum', color: 'Custom' },
} as const;

export default function ReminderSettingsModal({
  contractId,
  contractName,
  currentReminderSettings = [],
  currentReminderDays = [],
  expiryDate,
  kuendigung,
  onClose,
  onSuccess
}: ReminderSettingsModalProps) {

  // Initialize reminders from new format or legacy
  const initialReminders: ReminderSetting[] = currentReminderSettings.length > 0
    ? currentReminderSettings
    : currentReminderDays.map(days => ({ type: 'expiry' as const, days }));

  const [step, setStep] = useState<1 | 2>(1);
  const [selectedType, setSelectedType] = useState<'expiry' | 'cancellation' | 'custom' | null>(null);
  const [reminders, setReminders] = useState<ReminderSetting[]>(initialReminders);
  const [customDate, setCustomDate] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [customDays, setCustomDays] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoEvents, setAutoEvents] = useState<AutoEvent[]>([]);
  const [autoEventsLoading, setAutoEventsLoading] = useState(true);
  // Pro Frist: ob die zusammengefasste Wiederhol-Liste ("🔁 N Termine") aufgeklappt ist (reine Anzeige)
  const [expandedRecurring, setExpandedRecurring] = useState<Record<string, boolean>>({});
  // 🗑 Vorgemerkte automatische Vorwarnungen zum einmaligen Ausblenden (erst bei "Speichern" endgültig).
  const [pendingDismiss, setPendingDismiss] = useState<string[]>([]);

  // Fetch automatic calendar events for this contract
  useEffect(() => {
    const fetchAutoEvents = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/calendar/events?contractId=${contractId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.events) {
            const now = new Date();
            const filtered = data.events
              .filter((e: AutoEvent) => e.type !== 'CUSTOM_REMINDER' && new Date(e.date) > now)
              .sort((a: AutoEvent, b: AutoEvent) => new Date(a.date).getTime() - new Date(b.date).getTime());
            setAutoEvents(filtered);
          }
        }
      } catch (err) {
        console.error('Error fetching calendar events:', err);
      } finally {
        setAutoEventsLoading(false);
      }
    };
    fetchAutoEvents();
  }, [contractId]);

  const hasExpiry = !!expiryDate;
  const hasKuendigung = !!kuendigung;

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Calculate the target date for a given type and days
  const calculateDate = (type: 'expiry' | 'cancellation', days: number): string | null => {
    if (type === 'expiry' && expiryDate) {
      const date = new Date(expiryDate);
      date.setDate(date.getDate() - days);
      return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    if (type === 'cancellation' && expiryDate && kuendigung) {
      // Kalendermonatgenaue Berechnung der Kündigungsfrist
      const deadline = new Date(expiryDate);
      const noticeMonths = parseNoticeMonths(kuendigung);
      if (noticeMonths > 0) {
        deadline.setMonth(deadline.getMonth() - noticeMonths);
      } else {
        const noticeDays = parseNoticePeriod(kuendigung);
        if (noticeDays > 0) {
          deadline.setDate(deadline.getDate() - noticeDays);
        }
      }
      deadline.setDate(deadline.getDate() - days);
      return deadline.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
    }
    return null;
  };

  // Parse kuendigung to months (0 if not in months) for calendar-accurate subtraction
  const parseNoticeMonths = (k: string): number => {
    if (!k) return 0;
    const lower = k.toLowerCase();
    const monthMatch = lower.match(/(\d+)\s*monat/);
    if (monthMatch) return parseInt(monthMatch[1]);
    if (lower.includes('quartal')) return 3;
    if (lower.includes('halbjahr')) return 6;
    const yearMatch = lower.match(/(\d+)\s*jahr/);
    if (yearMatch) return parseInt(yearMatch[1]) * 12;
    return 0;
  };

  // Parse kuendigung string to days — Fallback wenn nicht in Monaten
  const parseNoticePeriod = (k: string): number => {
    if (!k) return 0;
    const lower = k.toLowerCase();
    const weekMatch = lower.match(/(\d+)\s*woche/);
    const dayMatch = lower.match(/(\d+)\s*tag/);
    if (weekMatch) return parseInt(weekMatch[1]) * 7;
    if (dayMatch) return parseInt(dayMatch[1]);
    return 90; // Default
  };

  const handleSelectOccasion = (type: 'expiry' | 'cancellation' | 'custom') => {
    setSelectedType(type);
    setStep(2);
    setError(null);
    setCustomDays('');
    setCustomDate('');
    setCustomLabel('');
  };

  const handleBack = () => {
    setStep(1);
    setSelectedType(null);
    setError(null);
  };

  const addPresetReminder = (days: number) => {
    if (!selectedType || selectedType === 'custom') return;

    // Check duplicate
    const exists = reminders.some(r => r.type === selectedType && r.days === days);
    if (exists) {
      setError('Diese Erinnerung existiert bereits');
      return;
    }

    setReminders([...reminders, { type: selectedType, days }]);
    setError(null);
  };

  const addCustomDaysReminder = () => {
    if (!selectedType || selectedType === 'custom') return;
    const days = parseInt(customDays);
    if (isNaN(days) || days <= 0) {
      setError('Bitte gib eine gültige Anzahl an Tagen ein');
      return;
    }
    const exists = reminders.some(r => r.type === selectedType && r.days === days);
    if (exists) {
      setError('Diese Erinnerung existiert bereits');
      return;
    }
    setReminders([...reminders, { type: selectedType, days }]);
    setCustomDays('');
    setError(null);
  };

  const addCustomDateReminder = () => {
    if (!customDate) {
      setError('Bitte wähle ein Datum aus');
      return;
    }
    const exists = reminders.some(r => r.type === 'custom' && r.targetDate === customDate);
    if (exists) {
      setError('Diese Erinnerung existiert bereits');
      return;
    }
    setReminders([...reminders, {
      type: 'custom',
      days: 0,
      targetDate: customDate,
      label: customLabel || undefined
    }]);
    setCustomDate('');
    setCustomLabel('');
    setError(null);
  };

  const removeReminder = (index: number) => {
    setReminders(reminders.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');

      // Vorgemerkte automatische Erinnerungen einmalig ausblenden (status='dismissed' → stoppt die
      // Mail, bleibt auch nach Re-Analyse weg, siehe calendarEvents.js:1768). "Am Tag selbst" ist nie
      // dabei (das ist der Termin selbst). Dieselbe bewährte Operation wie der "Ausblenden"-Button.
      for (const id of pendingDismiss) {
        await axios.post(
          '/api/calendar/quick-action',
          { eventId: id, action: 'dismiss' },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }

      const response = await axios.patch<{ success: boolean; message?: string }>(
        `/api/contracts/${contractId}/reminder-settings`,
        { reminderSettings: reminders },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        onSuccess?.();
        onClose();
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('Error saving reminder settings:', err);
      setError(err.response?.data?.error || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setIsLoading(false);
    }
  };

  // Get display text for a reminder
  const getReminderDisplay = (r: ReminderSetting) => {
    if (r.type === 'custom') {
      return r.label
        ? `${r.label}`
        : 'Eigene Erinnerung';
    }
    const anlassLabel = r.type === 'expiry' ? 'Vertragsende' : 'Kündigungsfrist';
    return `${r.days} Tage vor ${anlassLabel}`;
  };

  const getReminderDate = (r: ReminderSetting): string | null => {
    if (r.type === 'custom' && r.targetDate) {
      return formatDate(r.targetDate);
    }
    if (r.type === 'expiry' || r.type === 'cancellation') {
      return calculateDate(r.type, r.days);
    }
    return null;
  };

  // (getSeverityClass entfernt — Auto-Sektion in die neue Übersicht überführt)

  // Format auto-event date for display
  const formatAutoEventDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' });
  };

  // 🗂️ Auto-Erinnerungen PRO FRIST gruppieren (REINE ANZEIGE; Daten/Backend unverändert).
  // Zuordnungs-Helfer (cleanDeadlineName/reminderLeadLabel/isReminderEntry) aus utils/reminderGrouping.
  const autoEventGroups = (() => {
    const map = new Map<string, { name: string; main: AutoEvent | null; reminders: AutoEvent[] }>();
    for (const e of autoEvents) {
      const name = cleanDeadlineName(e.title) || e.title;
      if (!map.has(name)) map.set(name, { name, main: null, reminders: [] });
      const g = map.get(name)!;
      if (isReminderEntry(e)) g.reminders.push(e);
      else if (!g.main) g.main = e;
      else g.reminders.push(e); // zweites Nicht-Reminder-Event (selten) → als Sub-Eintrag
    }
    return Array.from(map.values()).sort((a, b) =>
      new Date(a.main?.date || a.reminders[0]?.date || 0).getTime()
      - new Date(b.main?.date || b.reminders[0]?.date || 0).getTime()
    );
  })();

  // Check if a preset is already added for the current type
  const isPresetAdded = (days: number): boolean => {
    return reminders.some(r => r.type === selectedType && r.days === days);
  };

  // Lesbarer Vertragsname (Dateiendung + Unterstriche raus) — reine Darstellung.
  const displayName = (contractName || 'Vertrag')
    .replace(/\.[a-z0-9]{2,4}$/i, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim() || 'Vertrag';

  // Inline-Styles für die neue Übersicht (Look wie das Event-Popup).
  const sectionTitle: CSSProperties = { fontSize: '12.5px', fontWeight: 700, letterSpacing: '0.3px', textTransform: 'uppercase', color: '#6b7280', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' };
  const fristCard: CSSProperties = { background: '#f9fafb', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '12px', padding: '12px 14px', marginBottom: '10px' };
  const fristTop: CSSProperties = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '6px' };
  const fristNameStyle: CSSProperties = { fontSize: '13.5px', fontWeight: 700, color: '#111827' };
  const fristDateStyle: CSSProperties = { fontSize: '12px', fontWeight: 600, color: '#6b7280', whiteSpace: 'nowrap' };
  const remRow: CSSProperties = { display: 'flex', alignItems: 'center', gap: '9px', padding: '5px 0' };
  const remIc: CSSProperties = { width: '26px', height: '26px', borderRadius: '7px', flexShrink: 0, background: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' };
  const remWhen: CSSProperties = { flex: 1, fontSize: '13px', fontWeight: 600, color: '#374151' };
  const tagAuto: CSSProperties = { fontSize: '10px', fontWeight: 600, color: '#2563eb', background: '#eff6ff', borderRadius: '999px', padding: '2px 8px', whiteSpace: 'nowrap' };
  const tagOwn: CSSProperties = { fontSize: '10px', fontWeight: 600, color: '#15803d', background: '#f0fdf4', borderRadius: '999px', padding: '2px 8px', whiteSpace: 'nowrap' };
  const delBtn: CSSProperties = { width: '26px', height: '26px', border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' };
  const foldBtn: CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#2563eb', background: '#eff6ff', border: 'none', borderRadius: '999px', padding: '4px 10px', cursor: 'pointer', marginTop: '4px' };
  const addSubStyle: CSSProperties = { fontSize: '12.5px', color: '#6b7280', margin: '-4px 0 13px', lineHeight: 1.45 };
  const pendingTag: CSSProperties = { fontSize: '10px', fontWeight: 600, color: '#9ca3af', background: '#f3f4f6', borderRadius: '999px', padding: '2px 8px', whiteSpace: 'nowrap' };
  const undoBtn: CSSProperties = { fontSize: '12px', fontWeight: 700, color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', flexShrink: 0, whiteSpace: 'nowrap' };

  // Eine automatische Vorwarn-Zeile mit 🗑 (vormerken) bzw. ↩ (zurücknehmen). "Am Tag selbst" nutzt das NICHT.
  const autoRow = (id: string, label: string) => {
    const pending = pendingDismiss.includes(id);
    return (
      <div key={id} style={remRow}>
        <span style={remIc}>🔔</span>
        <span style={{ ...remWhen, ...(pending ? { textDecoration: 'line-through', color: '#9ca3af', fontWeight: 500 } : {}) }}>{label}</span>
        {pending ? (
          <>
            <span style={pendingTag}>wird entfernt</span>
            <button type="button" style={undoBtn} onClick={() => setPendingDismiss((p) => p.filter((x) => x !== id))} title="Doch behalten">↩</button>
          </>
        ) : (
          <>
            <span style={tagAuto}>✉️ automatisch</span>
            <button type="button" style={delBtn} onClick={() => setPendingDismiss((p) => [...p, id])} title="Diese Erinnerung einmalig entfernen">
              <Trash2 size={13} />
            </button>
          </>
        )}
      </div>
    );
  };

  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose}>
        <motion.div
          className={styles.modal}
          onClick={(e) => e.stopPropagation()}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerIcon}>
              <Bell size={24} />
            </div>
            <div className={styles.headerContent}>
              <h2>Erinnerungen</h2>
              <p>{displayName}</p>
            </div>
            <button className={styles.closeButton} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Content */}
          <div className={styles.content}>
            {/* Step 1: Choose Occasion */}
            {step === 1 && (
              <>
                {/* ===== Übersicht: So wirst du erinnert ===== */}
                <div className={styles.section}>
                  <div style={sectionTitle}><span style={{ color: '#2563eb' }}>📨</span> So wirst du bei diesem Vertrag erinnert</div>

                  {autoEventsLoading ? (
                    <div className={styles.autoEventsLoading}>
                      <motion.div
                        className={styles.autoEventsLoadingSpinner}
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      >
                        <Clock size={16} />
                      </motion.div>
                      <span>Erinnerungen werden geladen...</span>
                    </div>
                  ) : (autoEventGroups.length > 0 || reminders.length > 0) ? (
                    <>
                      {/* Automatische Erinnerungen pro Frist */}
                      {autoEventGroups.map((group) => {
                        const labeled = group.reminders.filter((r) => reminderLeadLabel(r.title));
                        const dateOnly = group.reminders.filter((r) => !reminderLeadLabel(r.title));
                        const isOpen = !!expandedRecurring[group.name];
                        const fold = dateOnly.length > 3 && !isOpen;
                        return (
                          <div key={group.name} style={fristCard}>
                            <div style={fristTop}>
                              <span style={fristNameStyle}>{stripFileName(group.name)}</span>
                              {group.main && <span style={fristDateStyle}>{formatAutoEventDate(group.main.date)}</span>}
                            </div>
                            {group.reminders.length > 0 && (
                              <>
                                {labeled.map((r) => autoRow(r.id, reminderLeadLabel(r.title) || 'Erinnerung'))}
                                {fold ? (
                                  <button type="button" style={foldBtn} onClick={() => setExpandedRecurring((p) => ({ ...p, [group.name]: true }))}>
                                    🔁 {dateOnly.length} weitere Termine anzeigen
                                  </button>
                                ) : (
                                  <>
                                    {dateOnly.map((r) => autoRow(r.id, formatAutoEventDate(r.date)))}
                                    {dateOnly.length > 3 && isOpen && (
                                      <button type="button" style={foldBtn} onClick={() => setExpandedRecurring((p) => ({ ...p, [group.name]: false }))}>
                                        weniger
                                      </button>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                            {/* Stichtag selbst: Haupt-Ereignis feuert am Frist-Tag (daysSame, Default an) */}
                            {group.main && (
                              <div style={remRow}>
                                <span style={remIc}>🔔</span>
                                <span style={remWhen}>Am Tag selbst</span>
                                <span style={tagAuto}>✉️ automatisch</span>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Eigene Erinnerungen */}
                      {reminders.map((r, i) => {
                        const dateStr = getReminderDate(r);
                        return (
                          <div key={`own-${i}`} style={fristCard}>
                            <div style={fristTop}>
                              <span style={fristNameStyle}>{TYPE_CONFIG[r.type].label}</span>
                              {dateStr && <span style={fristDateStyle}>{dateStr}</span>}
                            </div>
                            <div style={remRow}>
                              <span style={remIc}>🔔</span>
                              <span style={remWhen}>{getReminderDisplay(r)}</span>
                              <span style={tagOwn}>✓ eigene</span>
                              <button style={delBtn} onClick={() => removeReminder(i)} title="Eigene Erinnerung entfernen">
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#6b7280', padding: '4px 2px 2px', lineHeight: 1.5 }}>
                      Für diesen Vertrag ist aktuell keine Erinnerung aktiv. Füge unten eine eigene hinzu.
                    </div>
                  )}
                  {pendingDismiss.length > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '12px', color: '#b45309', fontWeight: 600 }}>
                      Mit „Speichern" {pendingDismiss.length === 1 ? 'wird 1 Erinnerung' : `werden ${pendingDismiss.length} Erinnerungen`} einmalig entfernt.
                    </div>
                  )}
                </div>

                <div className={styles.sectionDivider} />

                {/* ===== Eigene Erinnerung hinzufügen ===== */}
                <div className={styles.section}>
                  <div style={sectionTitle}><span style={{ color: '#2563eb' }}>＋</span> Eigene Erinnerung hinzufügen</div>
                  <div style={addSubStyle}>Zusätzlich zu den automatischen — für Vertragsende, Kündigungsfrist oder ein eigenes Datum.</div>
                  <div className={styles.occasionGrid}>
                    {/* Vertragsende */}
                    <button
                      className={`${styles.occasionCard} ${styles.occasionCardExpiry} ${!hasExpiry ? styles.occasionCardDisabled : ''}`}
                      onClick={() => hasExpiry && handleSelectOccasion('expiry')}
                      disabled={!hasExpiry}
                    >
                      <CalendarX2 size={28} />
                      <span className={styles.occasionTitle}>Vor Vertragsende</span>
                      <span className={styles.occasionSubtitle}>
                        {hasExpiry ? formatDate(expiryDate!) : 'Kein Datum vorhanden'}
                      </span>
                    </button>

                    {/* Kündigungsfrist */}
                    <button
                      className={`${styles.occasionCard} ${styles.occasionCardCancellation} ${!hasKuendigung ? styles.occasionCardDisabled : ''}`}
                      onClick={() => hasKuendigung && handleSelectOccasion('cancellation')}
                      disabled={!hasKuendigung}
                    >
                      <Scale size={28} />
                      <span className={styles.occasionTitle}>Vor Kündigungsfrist</span>
                      <span className={styles.occasionSubtitle}>
                        {hasKuendigung ? kuendigung : 'Keine Frist vorhanden'}
                      </span>
                    </button>

                    {/* Eigenes Datum */}
                    <button
                      className={`${styles.occasionCard} ${styles.occasionCardCustom}`}
                      onClick={() => handleSelectOccasion('custom')}
                    >
                      <CalendarPlus size={28} />
                      <span className={styles.occasionTitle}>Eigenes Datum</span>
                      <span className={styles.occasionSubtitle}>Beliebiges Datum</span>
                    </button>
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Choose Lead Time / Date */}
            {step === 2 && selectedType && (
              <div className={styles.section}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepHeaderTop}>
                    <button className={styles.backButton} onClick={handleBack}>
                      <ArrowLeft size={16} />
                      <span>Zurück</span>
                    </button>
                    <span className={styles.stepLabel}>Schritt 2 von 2</span>
                  </div>
                  <h3>
                    {selectedType === 'custom'
                      ? 'Datum und Bezeichnung wählen'
                      : `Vorlaufzeit wählen — ${TYPE_CONFIG[selectedType].label}`}
                  </h3>
                </div>

                {/* Context Info */}
                {selectedType === 'expiry' && expiryDate && (
                  <div className={`${styles.contextInfo} ${styles.contextInfoExpiry}`}>
                    <Calendar size={14} />
                    <span>Vertragsende: {formatDate(expiryDate)}</span>
                  </div>
                )}
                {selectedType === 'cancellation' && expiryDate && kuendigung && (
                  <div className={`${styles.contextInfo} ${styles.contextInfoCancellation}`}>
                    <Scale size={14} />
                    <span>Kündigungsfrist: {kuendigung} (Vertragsende: {formatDate(expiryDate)})</span>
                  </div>
                )}

                {/* For expiry / cancellation: Preset grid + custom days */}
                {(selectedType === 'expiry' || selectedType === 'cancellation') && (
                  <>
                    <div className={styles.presetGrid}>
                      {PRESET_OPTIONS.map((preset) => {
                        const added = isPresetAdded(preset.days);
                        const dateStr = calculateDate(selectedType, preset.days);
                        return (
                          <button
                            key={preset.days}
                            className={`${styles.presetButton} ${added ? styles.selected : ''}`}
                            onClick={() => !added && addPresetReminder(preset.days)}
                            disabled={added}
                          >
                            <span className={styles.presetLabel}>{preset.label}</span>
                            <span className={styles.presetDays}>{preset.days} Tage</span>
                            {dateStr && <span className={styles.presetDate}>{dateStr}</span>}
                            {added && (
                              <div className={styles.checkmark}>
                                <Check size={16} />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    <div className={styles.customDaysSection}>
                      <span className={styles.customDaysLabel}>Oder eigene Tage:</span>
                      <div className={styles.customInputGroup}>
                        <input
                          type="number"
                          className={styles.customInput}
                          placeholder="Anzahl Tage"
                          value={customDays}
                          onChange={(e) => setCustomDays(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && addCustomDaysReminder()}
                          min="1"
                        />
                        <button className={styles.addButton} onClick={addCustomDaysReminder}>
                          <Check size={16} />
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {/* For custom: Date picker + label */}
                {selectedType === 'custom' && (
                  <div className={styles.customDateSection}>
                    <div className={styles.customDateField}>
                      <label className={styles.fieldLabel}>Datum</label>
                      <input
                        type="date"
                        className={styles.customInput}
                        value={customDate}
                        onChange={(e) => setCustomDate(e.target.value)}
                      />
                    </div>
                    <div className={styles.customDateField}>
                      <label className={styles.fieldLabel}>Bezeichnung (optional)</label>
                      <input
                        type="text"
                        className={styles.customInput}
                        placeholder="z.B. Probezeit-Ende"
                        value={customLabel}
                        onChange={(e) => setCustomLabel(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addCustomDateReminder()}
                      />
                    </div>
                    <button className={styles.addCustomDateButton} onClick={addCustomDateReminder}>
                      <CalendarPlus size={16} />
                      <span>Erinnerung hinzufügen</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* (Erinnerungs-Übersicht + Eigene + Hinzufügen sind oben in Schritt 1 integriert) */}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button className={styles.cancelFooterButton} onClick={onClose}>
              Abbrechen
            </button>
            <button
              className={styles.saveButton}
              onClick={handleSave}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <Clock size={16} />
                  </motion.div>
                  <span>Speichern...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Speichern</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
