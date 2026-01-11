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

  const handleToggleEmailNotifications = async (enabled: boolean) => {
    const success = await updateSettings({ emailNotifications: enabled });
    if (success) {
      setShowSuccessMessage(true);
      onSaveSuccess?.();
    }
  };

  const handleDigestModeChange = async (mode: 'instant' | 'daily' | 'weekly') => {
    const success = await updateSettings({ digestMode: mode });
    if (success) {
      setShowSuccessMessage(true);
      onSaveSuccess?.();
    }
  };

  // Calculate next email date based on digest mode
  const getNextEmailDate = (): string => {
    if (!settings?.emailNotifications) return 'Deaktiviert';

    const now = new Date();
    let nextDate: Date;

    switch (settings?.digestMode) {
      case 'instant':
        return 'Sofort bei neuen Alerts';
      case 'daily':
        nextDate = new Date(now);
        nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(8, 0, 0, 0);
        return `Täglich um 8:00 Uhr (Nächste: ${nextDate.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })})`;
      case 'weekly':
      default:
        // Next Wednesday
        nextDate = new Date(now);
        const daysUntilWednesday = (3 - nextDate.getDay() + 7) % 7 || 7;
        nextDate.setDate(nextDate.getDate() + daysUntilWednesday);
        nextDate.setHours(9, 0, 0, 0);
        return `Jeden Mittwoch um 9:00 Uhr (Nächste: ${nextDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })})`;
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

          {/* Digest Mode Selection */}
          <div className={styles.settingCard}>
            <div className={styles.settingHeader}>
              <div className={styles.settingInfo}>
                <h4 className={styles.settingTitle}>📬 Digest-Frequenz</h4>
                <p className={styles.settingDescription}>
                  Wie oft möchten Sie über Gesetzesänderungen informiert werden?
                </p>
              </div>
            </div>

            <div className={styles.digestModeSelector}>
              <button
                className={`${styles.digestModeBtn} ${settings.digestMode === 'instant' ? styles.active : ''}`}
                onClick={() => handleDigestModeChange('instant')}
                disabled={isSaving}
              >
                <span className={styles.digestIcon}>⚡</span>
                <div className={styles.digestBtnContent}>
                  <strong>Sofort</strong>
                  <span>Bei jedem relevanten Alert</span>
                </div>
              </button>

              <button
                className={`${styles.digestModeBtn} ${settings.digestMode === 'daily' ? styles.active : ''}`}
                onClick={() => handleDigestModeChange('daily')}
                disabled={isSaving}
              >
                <span className={styles.digestIcon}>📅</span>
                <div className={styles.digestBtnContent}>
                  <strong>Täglich</strong>
                  <span>Jeden Morgen um 8:00 Uhr</span>
                </div>
              </button>

              <button
                className={`${styles.digestModeBtn} ${settings.digestMode === 'weekly' ? styles.active : ''} ${styles.recommended}`}
                onClick={() => handleDigestModeChange('weekly')}
                disabled={isSaving}
              >
                <span className={styles.digestIcon}>📆</span>
                <div className={styles.digestBtnContent}>
                  <strong>Wöchentlich</strong>
                  <span>Jeden Mittwoch (empfohlen)</span>
                </div>
                <span className={styles.recommendedBadge}>Empfohlen</span>
              </button>
            </div>

            {/* Next Email Preview */}
            {settings.emailNotifications && (
              <div className={styles.nextEmailPreview}>
                <span className={styles.previewIcon}>📧</span>
                <div className={styles.previewContent}>
                  <strong>Nächste E-Mail:</strong>
                  <span>{getNextEmailDate()}</span>
                </div>
              </div>
            )}
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
