// 📁 frontend/src/components/LegalPulseSettings.tsx
// Legal Pulse Settings UI Component with Premium UX

import { useState, useEffect } from 'react';
import { useLegalPulseSettings } from '../hooks/useLegalPulseSettings';
import styles from '../styles/LegalPulseSettings.module.css';

interface LegalPulseSettingsProps {
  onSaveSuccess?: () => void;
  compact?: boolean; // For embedding in smaller spaces
}

export default function LegalPulseSettings({ onSaveSuccess, compact = false }: LegalPulseSettingsProps) {
  const {
    settings,
    isLoading,
    isSaving,
    error,
    availableCategories,
    updateSettings
  } = useLegalPulseSettings();

  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Show success message temporarily
  useEffect(() => {
    if (showSuccessMessage) {
      const timer = setTimeout(() => setShowSuccessMessage(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showSuccessMessage]);

  const handleToggleEnabled = async (enabled: boolean) => {
    const success = await updateSettings({ enabled });
    if (success) {
      setShowSuccessMessage(true);
      onSaveSuccess?.();
    }
  };

  const handleUpdateThreshold = async (threshold: number) => {
    if (threshold < 0.5 || threshold > 0.95) {
      setLocalError('Schwellenwert muss zwischen 50% und 95% liegen');
      return;
    }
    setLocalError(null);
    const success = await updateSettings({ similarityThreshold: threshold });
    if (success) {
      setShowSuccessMessage(true);
      onSaveSuccess?.();
    }
  };

  const handleToggleCategory = async (category: string) => {
    if (!settings) return;

    const currentCategories = settings.categories || [];
    const newCategories = currentCategories.includes(category)
      ? currentCategories.filter(c => c !== category)
      : [...currentCategories, category];

    const success = await updateSettings({ categories: newCategories });
    if (success) {
      setShowSuccessMessage(true);
      onSaveSuccess?.();
    }
  };

  const handleUpdateDigestMode = async (mode: 'instant' | 'daily' | 'weekly') => {
    const success = await updateSettings({ digestMode: mode });
    if (success) {
      setShowSuccessMessage(true);
      onSaveSuccess?.();
    }
  };

  const handleToggleEmailNotifications = async (enabled: boolean) => {
    const success = await updateSettings({ emailNotifications: enabled });
    if (success) {
      setShowSuccessMessage(true);
      onSaveSuccess?.();
    }
  };

  if (isLoading) {
    return (
      <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Einstellungen werden geladen...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠️</span>
          <p>Fehler beim Laden der Einstellungen</p>
          <p className={styles.errorDetails}>{error || 'Unbekannter Fehler'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${compact ? styles.compact : ''}`}>
      {/* Success Message */}
      {showSuccessMessage && (
        <div className={styles.successMessage}>
          <span className={styles.successIcon}>✓</span>
          Einstellungen gespeichert
        </div>
      )}

      {/* Error Message */}
      {(error || localError) && (
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>⚠️</span>
          {localError || error}
        </div>
      )}

      {/* Saving Indicator */}
      {isSaving && (
        <div className={styles.savingIndicator}>
          <div className={styles.spinner}></div>
          Speichern...
        </div>
      )}

      {/* Master Toggle */}
      <div className={styles.settingCard}>
        <div className={styles.settingHeader}>
          <div className={styles.settingInfo}>
            <h3 className={styles.settingTitle}>⚖️ Legal Pulse Monitoring</h3>
            <p className={styles.settingDescription}>
              Automatische Überwachung von Gesetzesänderungen für Ihre Verträge
            </p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => handleToggleEnabled(e.target.checked)}
              disabled={isSaving}
            />
            <span className={styles.toggleSlider}></span>
          </label>
        </div>
      </div>

      {/* Settings only visible when enabled */}
      {settings.enabled && (
        <>
          {/* Similarity Threshold */}
          <div className={styles.settingCard}>
            <div className={styles.settingHeader}>
              <div className={styles.settingInfo}>
                <h4 className={styles.settingTitle}>🎯 Ähnlichkeits-Schwellenwert</h4>
                <p className={styles.settingDescription}>
                  Wie relevant muss eine Gesetzesänderung sein? Höhere Werte = weniger Benachrichtigungen
                </p>
              </div>
              <span className={styles.thresholdValue}>
                {Math.round(settings.similarityThreshold * 100)}%
              </span>
            </div>

            <div className={styles.sliderContainer}>
              <input
                type="range"
                min="50"
                max="95"
                value={Math.round(settings.similarityThreshold * 100)}
                onChange={(e) => handleUpdateThreshold(parseInt(e.target.value) / 100)}
                className={styles.slider}
                disabled={isSaving}
              />
              <div className={styles.sliderLabels}>
                <span>50% (Mehr Alerts)</span>
                <span>70% (Empfohlen)</span>
                <span>95% (Weniger Alerts)</span>
              </div>
            </div>

            <div className={styles.thresholdGuide}>
              <div className={styles.guideItem}>
                <span className={styles.guideEmoji}>🟢</span>
                <div>
                  <strong>50-70%:</strong> Umfassende Überwachung, mehr False Positives
                </div>
              </div>
              <div className={styles.guideItem}>
                <span className={styles.guideEmoji}>🟡</span>
                <div>
                  <strong>70-85%:</strong> Ausgewogen, empfohlen für die meisten Nutzer
                </div>
              </div>
              <div className={styles.guideItem}>
                <span className={styles.guideEmoji}>🔴</span>
                <div>
                  <strong>85-95%:</strong> Nur hochrelevante Änderungen, könnte wichtige Alerts verpassen
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className={styles.settingCard}>
            <div className={styles.settingHeader}>
              <div className={styles.settingInfo}>
                <h4 className={styles.settingTitle}>📚 Rechtsbereiche</h4>
                <p className={styles.settingDescription}>
                  Wählen Sie die für Sie relevanten Rechtsbereiche aus
                </p>
              </div>
              <span className={styles.categoryCount}>
                {settings.categories.length} / {availableCategories.length}
              </span>
            </div>

            <div className={styles.categoryGrid}>
              {availableCategories.map((category) => {
                const isSelected = settings.categories.includes(category);
                return (
                  <button
                    key={category}
                    className={`${styles.categoryChip} ${isSelected ? styles.selected : ''}`}
                    onClick={() => handleToggleCategory(category)}
                    disabled={isSaving}
                  >
                    <span className={styles.chipIcon}>
                      {isSelected ? '✓' : '+'}
                    </span>
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Benachrichtigungs-Info (Weekly only) */}
          <div className={styles.settingCard}>
            <div className={styles.settingHeader}>
              <div className={styles.settingInfo}>
                <h4 className={styles.settingTitle}>📬 Benachrichtigungen</h4>
                <p className={styles.settingDescription}>
                  Sie erhalten jeden Mittwoch eine wöchentliche Zusammenfassung aller relevanten Gesetzesänderungen per E-Mail.
                </p>
              </div>
              <span className={styles.modeIcon} style={{ fontSize: '1.5rem' }}>📆</span>
            </div>

            <div className={styles.infoBanner}>
              <span className={styles.infoIcon}>ℹ️</span>
              <div>
                <strong>Wöchentliche Zusammenfassung</strong>
                <p>
                  Alle relevanten Gesetzesänderungen werden gebündelt und jeden Mittwoch als übersichtliche Zusammenfassung per E-Mail versendet.
                  Dies reduziert E-Mail-Überlastung und gibt Ihnen einen klaren Überblick über alle Änderungen der Woche.
                </p>
              </div>
            </div>
          </div>

          {/* Email Notifications Toggle */}
          <div className={styles.settingCard}>
            <div className={styles.settingHeader}>
              <div className={styles.settingInfo}>
                <h4 className={styles.settingTitle}>📧 E-Mail-Benachrichtigungen</h4>
                <p className={styles.settingDescription}>
                  Alerts per E-Mail erhalten (empfohlen)
                </p>
              </div>
              <label className={styles.toggle}>
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => handleToggleEmailNotifications(e.target.checked)}
                  disabled={isSaving}
                />
                <span className={styles.toggleSlider}></span>
              </label>
            </div>

            {!settings.emailNotifications && (
              <div className={styles.warningBanner}>
                <span className={styles.warningIcon}>⚠️</span>
                <p>
                  <strong>Warnung:</strong> Ohne E-Mail-Benachrichtigungen erhalten Sie nur In-App-Alerts.
                  Wichtige Änderungen könnten unbemerkt bleiben.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Info Banner when disabled */}
      {!settings.enabled && (
        <div className={styles.infoBanner}>
          <span className={styles.infoIcon}>ℹ️</span>
          <div>
            <strong>Legal Pulse ist deaktiviert</strong>
            <p>
              Sie erhalten keine automatischen Benachrichtigungen über Gesetzesänderungen.
              Aktivieren Sie Legal Pulse, um Ihre Verträge auf dem neuesten Stand zu halten.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
