import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import styles from './ReminderSettingsModal.module.css';
import { cleanDeadlineName, reminderLeadLabel, isReminderEntry, stripFileName } from '../utils/reminderGrouping';
import {
  X,
  Bell,
  BellOff,
  Check,
  AlertTriangle,
  Calendar,
  Clock,
  Trash2,
  CalendarX2,
  Scale,
  CalendarPlus,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Zap
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
  const [autoEventsExpanded, setAutoEventsExpanded] = useState(false);
  // Pro Frist: ob die zusammengefasste Wiederhol-Liste ("🔁 N Termine") aufgeklappt ist (reine Anzeige)
  const [expandedRecurring, setExpandedRecurring] = useState<Record<string, boolean>>({});

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
            // Immer direkt offen — kein "N Erinnerungen anzeigen"-Klick mehr (Wiederhol-Flut
            // wird stattdessen pro Frist zu einer Zeile gefaltet, siehe Render).
            setAutoEventsExpanded(true);
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

  // Get severity CSS class for auto events
  const getSeverityClass = (severity: string): string => {
    switch (severity) {
      case 'critical': return styles.autoEventCritical;
      case 'warning': return styles.autoEventWarning;
      default: return styles.autoEventInfoSeverity;
    }
  };

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
              <h2>Erinnerungen verwalten</h2>
              <p>{contractName}</p>
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
              <div className={styles.section}>
                <div className={styles.stepHeader}>
                  <span className={styles.stepLabel}>Schritt 1 von 2</span>
                  <h3>Woran möchtest du erinnert werden?</h3>
                </div>
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

            {/* Auto Events Loading State */}
            {step === 1 && autoEventsLoading && (
              <div className={styles.autoEventsLoading}>
                <motion.div
                  className={styles.autoEventsLoadingSpinner}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Clock size={16} />
                </motion.div>
                <span>Automatische Erinnerungen werden geladen...</span>
              </div>
            )}

            {/* Auto Events Section — shown in Step 1 */}
            {step === 1 && !autoEventsLoading && autoEvents.length > 0 && (
              <div className={styles.autoEventsSection}>
                <div
                  className={styles.autoEventsHeader}
                  onClick={() => setAutoEventsExpanded(!autoEventsExpanded)}
                >
                  <div className={styles.autoEventsHeaderLeft}>
                    <Zap size={16} />
                    <h3>Automatische Erinnerungen ({autoEvents.length})</h3>
                  </div>
                  <button className={styles.autoEventsToggle}>
                    {autoEventsExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
                {autoEventsExpanded && (
                  <div className={styles.autoEventsList}>
                    {autoEventGroups.map((group) => {
                      const headSeverity = group.main?.severity || group.reminders[0]?.severity || 'info';
                      return (
                        <div
                          key={group.name}
                          className={`${styles.autoEventItem} ${getSeverityClass(headSeverity)}`}
                          style={{ flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}
                        >
                          {/* Frist-Kopf — reine Übersicht, keine Weiterleitung */}
                          <div
                            className={styles.autoEventInfo}
                            style={{ justifyContent: 'space-between', width: '100%' }}
                          >
                            <span className={styles.autoEventTitle} style={{ fontWeight: 600 }}>{stripFileName(group.name)}</span>
                            {group.main && <span className={styles.autoEventDate}>{formatAutoEventDate(group.main.date)}</span>}
                          </div>
                          {/* Vorwarnungen als Chips. Echte "X vorher"-Vorwarnungen bleiben als Chips;
                              reine Datums-Wiederholungen (z.B. monatliche Frist) werden ab >3 zu EINER
                              "🔁 N Termine"-Zeile gefaltet — reine Anzeige, alle Termine bleiben erhalten. */}
                          {group.reminders.length > 0 && (() => {
                            const labeled = group.reminders.filter((r) => reminderLeadLabel(r.title));
                            const dateOnly = group.reminders.filter((r) => !reminderLeadLabel(r.title));
                            const isOpen = !!expandedRecurring[group.name];
                            const fold = dateOnly.length > 3 && !isOpen;
                            const chip = { fontSize: '11px', color: '#475569', background: '#f1f5f9', borderRadius: '999px', padding: '2px 9px', whiteSpace: 'nowrap' as const };
                            const toggle = { ...chip, color: '#2563eb', background: '#eff6ff', border: 'none', cursor: 'pointer', fontWeight: 600 };
                            return (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {labeled.map((r) => (
                                  <span key={r.id} style={chip}>🔔 {reminderLeadLabel(r.title)}</span>
                                ))}
                                {fold ? (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedRecurring((p) => ({ ...p, [group.name]: true }))}
                                    style={toggle}
                                  >
                                    🔁 {dateOnly.length} Termine anzeigen
                                  </button>
                                ) : (
                                  <>
                                    {dateOnly.map((r) => (
                                      <span key={r.id} style={chip}>🔔 {formatAutoEventDate(r.date)}</span>
                                    ))}
                                    {dateOnly.length > 3 && isOpen && (
                                      <button
                                        type="button"
                                        onClick={() => setExpandedRecurring((p) => ({ ...p, [group.name]: false }))}
                                        style={toggle}
                                      >
                                        weniger
                                      </button>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
                {!autoEventsExpanded && autoEvents.length > 3 && (
                  <button
                    className={styles.autoEventsShowMore}
                    onClick={() => setAutoEventsExpanded(true)}
                  >
                    {autoEvents.length} Erinnerungen anzeigen
                  </button>
                )}
              </div>
            )}

            {/* Divider between auto and manual */}
            {step === 1 && !autoEventsLoading && autoEvents.length > 0 && (
              <div className={styles.sectionDivider} />
            )}

            {/* Active Reminders — always visible */}
            {reminders.length > 0 && (
              <div className={styles.section}>
                <h3>Eigene Erinnerungen ({reminders.length})</h3>
                <div className={styles.activeReminders}>
                  {reminders.map((r, i) => {
                    const dateStr = getReminderDate(r);
                    return (
                      <div key={i} className={styles.reminderItem}>
                        <div className={`${styles.reminderIcon} ${styles[`reminderIcon${TYPE_CONFIG[r.type].color}`]}`}>
                          <Clock size={16} />
                        </div>
                        <div className={styles.reminderInfo}>
                          <div className={styles.reminderTop}>
                            <span className={`${styles.typeBadge} ${styles[`typeBadge${TYPE_CONFIG[r.type].color}`]}`}>
                              {TYPE_CONFIG[r.type].label}
                            </span>
                          </div>
                          <span className={styles.reminderDays}>{getReminderDisplay(r)}</span>
                          {dateStr && (
                            <span className={styles.reminderDate}>{dateStr}</span>
                          )}
                        </div>
                        <button
                          className={styles.removeButton}
                          onClick={() => removeReminder(i)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty State — only when no manual reminders */}
            {reminders.length === 0 && step === 1 && (
              <div className={styles.emptyState}>
                {autoEvents.length > 0 ? (
                  <>
                    <Bell size={48} />
                    <p>Keine eigenen Erinnerungen</p>
                    <span>Dieser Vertrag hat bereits automatische Erinnerungen. Du kannst zusätzlich eigene hinzufügen.</span>
                  </>
                ) : (
                  <>
                    <BellOff size={48} />
                    <p>Keine Erinnerungen eingerichtet</p>
                    <span>Wähle einen Anlass, um eine Erinnerung hinzuzufügen</span>
                  </>
                )}
              </div>
            )}
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
