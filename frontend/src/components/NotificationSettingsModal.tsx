import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Save,
  RefreshCw,
  Mail,
  BellRing,
  Monitor,
  Clock,
  Moon,
  Calendar,
  AlertTriangle,
  PenTool,
  Megaphone,
  MailX,
  ShieldAlert
} from 'lucide-react';
import styles from './NotificationSettingsModal.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

interface NotificationSettings {
  email: {
    enabled: boolean;
    contractDeadlines: boolean;
    legalPulse: boolean;
    analysisComplete: boolean;
    signatureUpdates: boolean;
    weeklyReport: boolean;
  };
  push: {
    enabled: boolean;
    contractDeadlines: boolean;
    legalPulse: boolean;
    analysisComplete: boolean;
    signatureUpdates: boolean;
  };
  inApp: {
    enabled: boolean;
    contractDeadlines: boolean;
    legalPulse: boolean;
    analysisComplete: boolean;
    signatureUpdates: boolean;
  };
  quietHours: {
    enabled: boolean;
    startTime: string;
    endTime: string;
  };
  deadlineReminders: {
    days7: boolean;
    days3: boolean;
    days1: boolean;
    daysSame: boolean;
  };
}

interface EmailHealthStatus {
  status: 'active' | 'quarantine' | 'inactive';
  bounceCount: number;
  hardBounces: number;
  softBounces: number;
  reason: string | null;
  deactivatedAt: string | null;
  quarantinedAt: string | null;
  autoRetryAttempted: boolean;
  lastBounceAt: string | null;
}

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved?: () => void;
  defaultTab?: 'channels' | 'types' | 'schedule';
}

export default function NotificationSettingsModal({ isOpen, onClose, onSaved, defaultTab = 'channels' }: NotificationSettingsModalProps) {
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings | null>(null);
  const [marketingEnabled, setMarketingEnabled] = useState<boolean>(true);
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState<'channels' | 'types' | 'schedule'>(defaultTab);
  const [emailHealth, setEmailHealth] = useState<EmailHealthStatus | null>(null);
  const [isReactivating, setIsReactivating] = useState(false);

  // Auth headers helper
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      setSettingsTab(defaultTab);
      loadNotificationSettings();
      loadEmailHealth();
    }
  }, [isOpen]);

  const loadNotificationSettings = async () => {
    setIsLoadingSettings(true);
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/notifications/settings`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotificationSettings(data.settings);
          if (data.marketing !== undefined) {
            setMarketingEnabled(data.marketing.enabled);
          }
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Einstellungen:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const loadEmailHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/notifications/email-status`, {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEmailHealth(data);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden des E-Mail-Status:', error);
    }
  };

  const handleReactivateEmail = async () => {
    setIsReactivating(true);
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/notifications/reactivate-email`, {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setEmailHealth(data);
        }
      }
    } catch (error) {
      console.error('Fehler beim Reaktivieren:', error);
    } finally {
      setIsReactivating(false);
    }
  };

  const saveNotificationSettings = async () => {
    if (!notificationSettings) return;

    setIsSavingSettings(true);
    try {
      const response = await fetch(`${API_BASE}/api/dashboard/notifications/settings`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({ settings: notificationSettings, marketing: { enabled: marketingEnabled } })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setNotificationSettings(data.settings);
          onSaved?.();
          onClose();
        }
      }
    } catch (error) {
      console.error('Fehler beim Speichern:', error);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const updateSetting = (
    category: 'email' | 'push' | 'inApp' | 'quietHours' | 'deadlineReminders',
    key: string,
    value: boolean | string
  ) => {
    if (!notificationSettings) return;

    setNotificationSettings(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        [category]: {
          ...prev[category],
          [key]: value
        }
      };
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <h2>Benachrichtigungseinstellungen</h2>
            <button className={styles.closeButton} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${settingsTab === 'channels' ? styles.tabActive : ''}`}
              onClick={() => setSettingsTab('channels')}
            >
              <Mail size={16} />
              Kanäle
            </button>
            <button
              className={`${styles.tab} ${settingsTab === 'types' ? styles.tabActive : ''}`}
              onClick={() => setSettingsTab('types')}
            >
              <BellRing size={16} />
              Typen
            </button>
            <button
              className={`${styles.tab} ${settingsTab === 'schedule' ? styles.tabActive : ''}`}
              onClick={() => setSettingsTab('schedule')}
            >
              <Clock size={16} />
              Zeitplan
            </button>
          </div>

          {/* Tab Content */}
          <div className={styles.body}>
            {isLoadingSettings || !notificationSettings ? (
              <div className={styles.loading}>
                <RefreshCw size={24} className={styles.spinIcon} />
                <span>Einstellungen werden geladen...</span>
              </div>
            ) : (
              <>
                {/* Email Health Banner */}
                {emailHealth && emailHealth.status === 'inactive' && (
                  <div className={styles.emailHealthBanner} data-severity="error">
                    <div className={styles.bannerIcon}>
                      <MailX size={20} />
                    </div>
                    <div className={styles.bannerContent}>
                      <strong>E-Mail-Zustellung deaktiviert</strong>
                      <p>
                        {emailHealth.reason || 'Zustellungsprobleme erkannt'}.
                        {emailHealth.deactivatedAt && ` Seit ${new Date(emailHealth.deactivatedAt).toLocaleDateString('de-DE')}.`}
                        {' '}Du erh&auml;ltst derzeit keine E-Mail-Benachrichtigungen.
                      </p>
                    </div>
                    <button
                      className={styles.reactivateButton}
                      onClick={handleReactivateEmail}
                      disabled={isReactivating}
                    >
                      {isReactivating ? <RefreshCw size={14} className={styles.spinIcon} /> : <Mail size={14} />}
                      {isReactivating ? 'Wird reaktiviert...' : 'Reaktivieren'}
                    </button>
                  </div>
                )}

                {emailHealth && emailHealth.status === 'quarantine' && (
                  <div className={styles.emailHealthBanner} data-severity="warning">
                    <div className={styles.bannerIcon}>
                      <ShieldAlert size={20} />
                    </div>
                    <div className={styles.bannerContent}>
                      <strong>E-Mail unter Beobachtung</strong>
                      <p>
                        Es wurden Zustellungsprobleme erkannt ({emailHealth.bounceCount} Bounce{emailHealth.bounceCount !== 1 ? 's' : ''}).
                        E-Mails werden weiterhin gesendet, aber bei weiteren Fehlern deaktiviert.
                      </p>
                    </div>
                  </div>
                )}

                {/* Channels Tab */}
                {settingsTab === 'channels' && (
                  <div className={styles.section}>
                    {/* Email */}
                    <div className={styles.group}>
                      <div className={styles.groupHeader}>
                        <Mail size={18} />
                        <div>
                          <h3>E-Mail-Benachrichtigungen</h3>
                          <p>Erhalte wichtige Updates per E-Mail</p>
                        </div>
                        <label className={styles.toggle}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.email.enabled}
                            onChange={e => updateSetting('email', 'enabled', e.target.checked)}
                          />
                          <span className={styles.toggleSlider} />
                        </label>
                      </div>
                      {notificationSettings.email.enabled && (
                        <div className={styles.subOptions}>
                          <label className={styles.option}>
                            <input
                              type="checkbox"
                              checked={notificationSettings.email.weeklyReport}
                              onChange={e => updateSetting('email', 'weeklyReport', e.target.checked)}
                            />
                            <span>Wöchentlicher Bericht</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Push */}
                    <div className={styles.group}>
                      <div className={styles.groupHeader}>
                        <BellRing size={18} />
                        <div>
                          <h3>Push-Benachrichtigungen</h3>
                          <p>Browser-Benachrichtigungen in Echtzeit</p>
                        </div>
                        <label className={styles.toggle}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.push.enabled}
                            onChange={e => updateSetting('push', 'enabled', e.target.checked)}
                          />
                          <span className={styles.toggleSlider} />
                        </label>
                      </div>
                    </div>

                    {/* In-App */}
                    <div className={styles.group}>
                      <div className={styles.groupHeader}>
                        <Monitor size={18} />
                        <div>
                          <h3>In-App-Benachrichtigungen</h3>
                          <p>Benachrichtigungen im Dashboard anzeigen</p>
                        </div>
                        <label className={styles.toggle}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.inApp.enabled}
                            onChange={e => updateSetting('inApp', 'enabled', e.target.checked)}
                          />
                          <span className={styles.toggleSlider} />
                        </label>
                      </div>
                    </div>

                    {/* Marketing — eigene Kategorie, visuell abgesetzt */}
                    <div className={styles.marketingDivider}>
                      <span>Marketing</span>
                    </div>
                    <div className={styles.group}>
                      <div className={styles.groupHeader}>
                        <Megaphone size={18} />
                        <div>
                          <h3>Marketing & Werbe-E-Mails</h3>
                          <p>Onboarding-Tipps, Feature-Updates & Angebote</p>
                        </div>
                        <label className={styles.toggle}>
                          <input
                            type="checkbox"
                            checked={marketingEnabled}
                            onChange={e => setMarketingEnabled(e.target.checked)}
                          />
                          <span className={styles.toggleSlider} />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Types Tab */}
                {settingsTab === 'types' && (
                  <div className={styles.section}>
                    <p className={styles.info}>
                      Wähle aus, über welche Ereignisse du benachrichtigt werden möchtest.
                    </p>

                    <div className={styles.typeGrid}>
                      <div className={styles.typeItem}>
                        <div className={`${styles.typeIcon} ${styles.typeIconWarning}`}>
                          <Calendar size={20} />
                        </div>
                        <div className={styles.typeContent}>
                          <h4>Vertragsfristen</h4>
                          <p>Kündigungsfristen & Ablaufdaten</p>
                        </div>
                        <label className={styles.toggle}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.inApp.contractDeadlines}
                            onChange={e => {
                              updateSetting('inApp', 'contractDeadlines', e.target.checked);
                              updateSetting('email', 'contractDeadlines', e.target.checked);
                            }}
                          />
                          <span className={styles.toggleSlider} />
                        </label>
                      </div>

                      <div className={styles.typeItem}>
                        <div className={`${styles.typeIcon} ${styles.typeIconDanger}`}>
                          <AlertTriangle size={20} />
                        </div>
                        <div className={styles.typeContent}>
                          <h4>Legal Pulse Alerts</h4>
                          <p>Wichtige rechtliche Hinweise</p>
                        </div>
                        <label className={styles.toggle}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.inApp.legalPulse}
                            onChange={e => {
                              updateSetting('inApp', 'legalPulse', e.target.checked);
                              updateSetting('email', 'legalPulse', e.target.checked);
                            }}
                          />
                          <span className={styles.toggleSlider} />
                        </label>
                      </div>

                      <div className={styles.typeItem}>
                        <div className={`${styles.typeIcon} ${styles.typeIconInfo}`}>
                          <PenTool size={20} />
                        </div>
                        <div className={styles.typeContent}>
                          <h4>Signatur-Updates</h4>
                          <p>Status digitaler Unterschriften</p>
                        </div>
                        <label className={styles.toggle}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.inApp.signatureUpdates}
                            onChange={e => {
                              updateSetting('inApp', 'signatureUpdates', e.target.checked);
                              updateSetting('email', 'signatureUpdates', e.target.checked);
                            }}
                          />
                          <span className={styles.toggleSlider} />
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* Schedule Tab */}
                {settingsTab === 'schedule' && (
                  <div className={styles.section}>
                    {/* Quiet Hours */}
                    <div className={styles.group}>
                      <div className={styles.groupHeader}>
                        <Moon size={18} />
                        <div>
                          <h3>Ruhezeiten</h3>
                          <p>Keine Benachrichtigungen während dieser Zeit</p>
                        </div>
                        <label className={styles.toggle}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.quietHours.enabled}
                            onChange={e => updateSetting('quietHours', 'enabled', e.target.checked)}
                          />
                          <span className={styles.toggleSlider} />
                        </label>
                      </div>
                      {notificationSettings.quietHours.enabled && (
                        <div className={styles.timeRange}>
                          <div className={styles.timeInput}>
                            <label>Von</label>
                            <input
                              type="time"
                              value={notificationSettings.quietHours.startTime}
                              onChange={e => updateSetting('quietHours', 'startTime', e.target.value)}
                            />
                          </div>
                          <span className={styles.timeSeparator}>bis</span>
                          <div className={styles.timeInput}>
                            <label>Bis</label>
                            <input
                              type="time"
                              value={notificationSettings.quietHours.endTime}
                              onChange={e => updateSetting('quietHours', 'endTime', e.target.value)}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Deadline Reminders */}
                    <div className={styles.group}>
                      <div className={styles.groupHeader}>
                        <Calendar size={18} />
                        <div>
                          <h3>Frist-Erinnerungen</h3>
                          <p>Wann möchtest du erinnert werden?</p>
                        </div>
                      </div>
                      <div className={styles.checkboxGrid}>
                        <label className={styles.checkbox}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.deadlineReminders.days7}
                            onChange={e => updateSetting('deadlineReminders', 'days7', e.target.checked)}
                          />
                          <span>7 Tage vorher</span>
                        </label>
                        <label className={styles.checkbox}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.deadlineReminders.days3}
                            onChange={e => updateSetting('deadlineReminders', 'days3', e.target.checked)}
                          />
                          <span>3 Tage vorher</span>
                        </label>
                        <label className={styles.checkbox}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.deadlineReminders.days1}
                            onChange={e => updateSetting('deadlineReminders', 'days1', e.target.checked)}
                          />
                          <span>1 Tag vorher</span>
                        </label>
                        <label className={styles.checkbox}>
                          <input
                            type="checkbox"
                            checked={notificationSettings.deadlineReminders.daysSame}
                            onChange={e => updateSetting('deadlineReminders', 'daysSame', e.target.checked)}
                          />
                          <span>Am selben Tag</span>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button className={styles.cancelButton} onClick={onClose}>
              Abbrechen
            </button>
            <button
              className={styles.saveButton}
              onClick={saveNotificationSettings}
              disabled={isSavingSettings || isLoadingSettings}
            >
              {isSavingSettings ? (
                <>
                  <RefreshCw size={16} className={styles.spinIcon} />
                  Speichere...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Speichern
                </>
              )}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
