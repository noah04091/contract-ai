import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import axios from 'axios';
import styles from './ReminderSettingsModal.module.css';
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
      // Parse kuendigung to get notice period in days
      const noticeDays = parseNoticePeriod(kuendigung);
      if (noticeDays > 0) {
        const deadline = new Date(expiryDate);
        deadline.setDate(deadline.getDate() - noticeDays);
        deadline.setDate(deadline.getDate() - days);
        return deadline.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
      }
    }
    return null;
  };

  // Parse kuendigung string to days (e.g. "3 Monate zum Vertragsende" → 90)
  const parseNoticePeriod = (k: string): number => {
    if (!k) return 0;
    const lower = k.toLowerCase();
    const monthMatch = lower.match(/(\d+)\s*monat/);
    const weekMatch = lower.match(/(\d+)\s*woche/);
    const dayMatch = lower.match(/(\d+)\s*tag/);
    if (monthMatch) return parseInt(monthMatch[1]) * 30;
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
              <h2>Erinnerungen einrichten</h2>
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

            {/* Active Reminders — always visible */}
            {reminders.length > 0 && (
              <div className={styles.section}>
                <h3>Aktive Erinnerungen ({reminders.length})</h3>
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

            {/* Empty State */}
            {reminders.length === 0 && step === 1 && (
              <div className={styles.emptyState}>
                <BellOff size={48} />
                <p>Keine Erinnerungen eingerichtet</p>
                <span>Wähle einen Anlass, um eine Erinnerung hinzuzufügen</span>
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
