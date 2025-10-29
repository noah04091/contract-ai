import { useState, useEffect } from 'react';
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
  Plus,
  Trash2
} from 'lucide-react';

interface ReminderSettingsModalProps {
  contractId: string;
  contractName: string;
  currentReminderDays?: number[];
  expiryDate?: string;
  onClose: () => void;
  onSuccess?: (reminderDays: number[]) => void;
}

interface PresetOption {
  label: string;
  days: number;
  icon: string;
  popular?: boolean;
}

const PRESET_OPTIONS: PresetOption[] = [
  { label: '1 Woche', days: 7, icon: '📅' },
  { label: '2 Wochen', days: 14, icon: '📋', popular: true },
  { label: '1 Monat', days: 30, icon: '🗓️', popular: true },
  { label: '2 Monate', days: 60, icon: '📆', popular: true },
  { label: '3 Monate', days: 90, icon: '📊' },
  { label: '6 Monate', days: 180, icon: '📈' },
];

export default function ReminderSettingsModal({
  contractId,
  contractName,
  currentReminderDays = [],
  expiryDate,
  onClose,
  onSuccess
}: ReminderSettingsModalProps) {
  const [reminderDays, setReminderDays] = useState<number[]>(currentReminderDays);
  const [customDays, setCustomDays] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Calculate days until expiry
  const daysUntilExpiry = expiryDate
    ? Math.ceil((new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const togglePreset = (days: number) => {
    if (reminderDays.includes(days)) {
      setReminderDays(reminderDays.filter(d => d !== days));
    } else {
      setReminderDays([...reminderDays, days].sort((a, b) => a - b));
    }
  };

  const addCustomReminder = () => {
    const days = parseInt(customDays);
    if (isNaN(days) || days <= 0) {
      setError('Bitte gib eine gültige Anzahl an Tagen ein');
      return;
    }

    if (daysUntilExpiry && days >= daysUntilExpiry) {
      setError(`Erinnerung muss vor dem Ablaufdatum liegen (max. ${daysUntilExpiry - 1} Tage)`);
      return;
    }

    if (reminderDays.includes(days)) {
      setError('Diese Erinnerung existiert bereits');
      return;
    }

    setReminderDays([...reminderDays, days].sort((a, b) => a - b));
    setCustomDays('');
    setShowCustomInput(false);
    setError(null);
  };

  const removeReminder = (days: number) => {
    setReminderDays(reminderDays.filter(d => d !== days));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `/api/contracts/${contractId}/reminder-settings`,
        { reminderDays },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        onSuccess?.(reminderDays);
        onClose();
      }
    } catch (err: any) {
      console.error('Error saving reminder settings:', err);
      setError(err.response?.data?.error || 'Fehler beim Speichern der Einstellungen');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (daysBeforeExpiry: number) => {
    if (!expiryDate) return '';
    const date = new Date(expiryDate);
    date.setDate(date.getDate() - daysBeforeExpiry);
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const isPresetAvailable = (days: number) => {
    if (!daysUntilExpiry) return true;
    return days < daysUntilExpiry;
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

          {/* Expiry Info */}
          {expiryDate && daysUntilExpiry !== null && (
            <div className={styles.expiryInfo}>
              <Calendar size={16} />
              <span>
                Vertrag läuft ab am {new Date(expiryDate).toLocaleDateString('de-DE')}
                {daysUntilExpiry > 0 && ` (in ${daysUntilExpiry} Tagen)`}
              </span>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={styles.errorMessage}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Content */}
          <div className={styles.content}>
            {/* Preset Options */}
            <div className={styles.section}>
              <h3>Vordefinierte Erinnerungen</h3>
              <div className={styles.presetGrid}>
                {PRESET_OPTIONS.map((preset) => {
                  const isSelected = reminderDays.includes(preset.days);
                  const isAvailable = isPresetAvailable(preset.days);

                  return (
                    <button
                      key={preset.days}
                      className={`${styles.presetButton} ${
                        isSelected ? styles.selected : ''
                      } ${!isAvailable ? styles.disabled : ''}`}
                      onClick={() => isAvailable && togglePreset(preset.days)}
                      disabled={!isAvailable}
                    >
                      <span className={styles.presetIcon}>{preset.icon}</span>
                      <span className={styles.presetLabel}>{preset.label}</span>
                      <span className={styles.presetDays}>{preset.days} Tage</span>
                      {isSelected && (
                        <div className={styles.checkmark}>
                          <Check size={16} />
                        </div>
                      )}
                      {preset.popular && !isSelected && (
                        <span className={styles.popularBadge}>Beliebt</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Reminder */}
            <div className={styles.section}>
              <h3>Benutzerdefinierte Erinnerung</h3>
              {!showCustomInput ? (
                <button
                  className={styles.addCustomButton}
                  onClick={() => setShowCustomInput(true)}
                >
                  <Plus size={16} />
                  <span>Eigene Erinnerung hinzufügen</span>
                </button>
              ) : (
                <div className={styles.customInputGroup}>
                  <input
                    type="number"
                    className={styles.customInput}
                    placeholder="Anzahl Tage"
                    value={customDays}
                    onChange={(e) => setCustomDays(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addCustomReminder()}
                    min="1"
                    max={daysUntilExpiry ? daysUntilExpiry - 1 : undefined}
                  />
                  <button className={styles.addButton} onClick={addCustomReminder}>
                    <Check size={16} />
                  </button>
                  <button
                    className={styles.cancelButton}
                    onClick={() => {
                      setShowCustomInput(false);
                      setCustomDays('');
                      setError(null);
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              )}
            </div>

            {/* Active Reminders */}
            {reminderDays.length > 0 && (
              <div className={styles.section}>
                <h3>Aktive Erinnerungen ({reminderDays.length})</h3>
                <div className={styles.activeReminders}>
                  {reminderDays.map((days) => (
                    <div key={days} className={styles.reminderItem}>
                      <div className={styles.reminderIcon}>
                        <Clock size={16} />
                      </div>
                      <div className={styles.reminderInfo}>
                        <span className={styles.reminderDays}>{days} Tage vorher</span>
                        {expiryDate && (
                          <span className={styles.reminderDate}>
                            {formatDate(days)}
                          </span>
                        )}
                      </div>
                      <button
                        className={styles.removeButton}
                        onClick={() => removeReminder(days)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty State */}
            {reminderDays.length === 0 && (
              <div className={styles.emptyState}>
                <BellOff size={48} />
                <p>Keine Erinnerungen eingerichtet</p>
                <span>Wähle eine vordefinierte Option oder erstelle eine eigene</span>
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
