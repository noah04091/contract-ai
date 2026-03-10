// frontend/src/components/EmailInboxWidget.tsx
// Premium Enterprise Design - E-Mail Upload Widget

import { useState, useCallback, useRef, useEffect } from "react";
import { Copy, HelpCircle, RefreshCw, Power, Check, Mail, Zap, AlertTriangle, Edit3, Crown, Loader2, Lock } from "lucide-react";
import { motion } from "framer-motion";
import styles from "./EmailInboxWidget.module.css";
import EmailTutorialModal from "./EmailTutorialModal";
import { apiCall } from "../utils/api";
import { useToast } from "../context/ToastContext";

interface EmailInboxWidgetProps {
  emailInboxAddress: string | null;
  emailInboxEnabled: boolean;
  subscriptionPlan: 'free' | 'business' | 'enterprise';
  customEmailAlias?: string | null;
  onUpdate: () => void;
}

export default function EmailInboxWidget({
  emailInboxAddress,
  emailInboxEnabled,
  subscriptionPlan,
  customEmailAlias,
  onUpdate
}: EmailInboxWidgetProps) {
  const [showTutorial, setShowTutorial] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const { success, error: showError } = useToast();

  // Custom Alias State (Enterprise only)
  const [showAliasEditor, setShowAliasEditor] = useState(false);
  const [aliasInput, setAliasInput] = useState(customEmailAlias || '');
  const [aliasChecking, setAliasChecking] = useState(false);
  const [aliasAvailable, setAliasAvailable] = useState<boolean | null>(null);
  const [aliasError, setAliasError] = useState<string | null>(null);
  const [aliasSaving, setAliasSaving] = useState(false);

  const isFree = subscriptionPlan === 'free';
  const isEnterprise = subscriptionPlan === 'enterprise';
  const isBusiness = subscriptionPlan === 'business';

  const handleCopy = () => {
    if (isFree) return;
    if (emailInboxAddress) {
      navigator.clipboard.writeText(emailInboxAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      success("E-Mail-Adresse kopiert!", 3000);
    }
  };

  const handleRegenerate = async () => {
    if (isFree) return;
    if (!confirm("Neue E-Mail-Adresse generieren? Die alte Adresse wird ungültig.")) {
      return;
    }

    setLoading(true);
    try {
      await apiCall("/auth/email-inbox/regenerate", {
        method: "POST"
      });
      onUpdate();
    } catch (err) {
      console.error("Fehler beim Regenerieren:", err);
      showError("Fehler beim Generieren einer neuen Adresse");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (enabled: boolean) => {
    if (isFree) return;
    setLoading(true);
    try {
      await apiCall("/auth/email-inbox/toggle", {
        method: "PUT",
        body: JSON.stringify({ enabled })
      });
      onUpdate();
    } catch (err) {
      console.error("Fehler beim Toggle:", err);
      showError("Fehler beim Aktivieren/Deaktivieren");
    } finally {
      setLoading(false);
    }
  };

  // Debounced Alias Check
  const checkAliasDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup bei Unmount
  useEffect(() => {
    return () => {
      if (checkAliasDebounceRef.current) clearTimeout(checkAliasDebounceRef.current);
    };
  }, []);

  const handleAliasInputChange = useCallback((value: string) => {
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setAliasInput(cleaned);
    setAliasAvailable(null);
    setAliasError(null);

    if (checkAliasDebounceRef.current) {
      clearTimeout(checkAliasDebounceRef.current);
    }

    if (cleaned.length < 3) {
      setAliasError(cleaned.length > 0 ? 'Mindestens 3 Zeichen' : null);
      return;
    }

    if (cleaned.length > 30) {
      setAliasError('Maximal 30 Zeichen');
      return;
    }

    setAliasChecking(true);
    checkAliasDebounceRef.current = setTimeout(async () => {
      try {
        const response = await apiCall(`/auth/email-inbox/check-alias/${encodeURIComponent(cleaned)}`) as {
          available: boolean;
          error?: string;
        };
        setAliasAvailable(response.available);
        if (!response.available) {
          setAliasError(response.error || 'Nicht verfügbar');
        }
      } catch {
        setAliasError('Fehler beim Prüfen');
      } finally {
        setAliasChecking(false);
      }
    }, 500);
  }, []);

  const handleSaveAlias = async () => {
    if (!aliasInput || aliasInput.length < 3 || !aliasAvailable) return;

    setAliasSaving(true);
    try {
      await apiCall("/auth/email-inbox/custom-alias", {
        method: "PUT",
        body: JSON.stringify({ alias: aliasInput })
      });
      success("Custom E-Mail-Adresse gesetzt!", 3000);
      setShowAliasEditor(false);
      onUpdate();
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Fehler beim Speichern';
      showError(errorMsg);
    } finally {
      setAliasSaving(false);
    }
  };

  if (!emailInboxAddress) {
    return null;
  }

  // Maskierte Adresse für Free-User
  const maskedAddress = '********@upload.contract-ai.de';

  return (
    <>
      <motion.div
        className={`${styles.widget} ${!emailInboxEnabled && !isFree ? styles.disabled : ''} ${isFree ? styles.lockedWidget : ''}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Free-User: Locked Overlay */}
        {isFree && (
          <div className={styles.lockedOverlay}>
            <div className={styles.lockedContent}>
              <div className={styles.lockedIcon}>
                <Lock size={28} />
              </div>
              <h3 className={styles.lockedTitle}>E-Mail-Upload freischalten</h3>
              <p className={styles.lockedText}>
                Importiere Verträge automatisch per E-Mail-Weiterleitung. Verfügbar ab dem Business-Paket.
              </p>
              <button
                className={styles.lockedUpgradeButton}
                onClick={() => window.location.href = '/pricing'}
              >
                <Crown size={16} />
                Pakete ansehen
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.headerTitle}>
              <div className={styles.headerIcon}>
                <Mail />
              </div>
              <h3 className={styles.title}>E-Mail Upload</h3>
            </div>
            <span className={`${styles.statusBadge} ${isFree ? styles.statusLocked : emailInboxEnabled ? styles.statusActive : styles.statusInactive}`}>
              {isFree ? 'Gesperrt' : emailInboxEnabled ? 'Aktiv' : 'Inaktiv'}
            </span>
          </div>
          <p className={styles.subtitle}>
            Leite E-Mails mit Verträgen an deine persönliche Adresse weiter
          </p>
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Address Section */}
          <div className={styles.addressSection}>
            <div className={styles.addressLabel}>Deine Upload-Adresse</div>
            <div className={styles.addressBox}>
              <code className={styles.address}>{isFree ? maskedAddress : emailInboxAddress}</code>
              <div className={styles.controls}>
                <button
                  onClick={handleCopy}
                  className={`${styles.controlButton} ${copied ? styles.success : ''}`}
                  title="Kopieren"
                  disabled={isFree || loading || !emailInboxEnabled}
                >
                  {copied ? <Check size={18} /> : <Copy size={18} />}
                </button>
                {!isEnterprise && (
                  <button
                    onClick={handleRegenerate}
                    className={styles.controlButton}
                    title="Neue Adresse"
                    disabled={isFree || loading}
                  >
                    <RefreshCw size={18} className={loading ? styles.spinning : ''} />
                  </button>
                )}
                {isEnterprise && (
                  <button
                    onClick={() => {
                      setShowAliasEditor(!showAliasEditor);
                      setAliasInput(customEmailAlias || '');
                      setAliasAvailable(null);
                      setAliasError(null);
                    }}
                    className={`${styles.controlButton} ${styles.enterpriseButton}`}
                    title="Custom Adresse setzen"
                    disabled={loading}
                  >
                    <Edit3 size={18} />
                  </button>
                )}
                <button
                  onClick={() => handleToggle(!emailInboxEnabled)}
                  className={`${styles.controlButton} ${isFree ? '' : emailInboxEnabled ? styles.active : styles.inactive}`}
                  title={emailInboxEnabled ? "Deaktivieren" : "Aktivieren"}
                  disabled={isFree || loading}
                >
                  <Power size={18} />
                </button>
                <button
                  onClick={() => setShowTutorial(true)}
                  className={styles.controlButton}
                  title="Hilfe"
                  disabled={isFree || loading}
                >
                  <HelpCircle size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Enterprise: Custom Alias Editor */}
          {isEnterprise && showAliasEditor && (
            <motion.div
              className={styles.aliasEditor}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className={styles.aliasEditorHeader}>
                <Crown size={16} className={styles.crownIcon} />
                <span>Custom Upload-Adresse (Enterprise)</span>
              </div>
              <div className={styles.aliasInputRow}>
                <div className={`${styles.aliasInputWrapper} ${
                  aliasAvailable === true ? styles.aliasInputValid :
                  aliasAvailable === false ? styles.aliasInputInvalid : ''
                }`}>
                  <input
                    type="text"
                    value={aliasInput}
                    onChange={(e) => handleAliasInputChange(e.target.value)}
                    placeholder="dein-firmenname"
                    className={styles.aliasInput}
                    maxLength={30}
                    disabled={aliasSaving}
                  />
                  <span className={styles.aliasDomain}>@upload.contract-ai.de</span>
                </div>
                {aliasChecking && (
                  <Loader2 size={16} className={styles.spinning} />
                )}
                {!aliasChecking && aliasAvailable === true && (
                  <Check size={16} className={styles.aliasCheckOk} />
                )}
              </div>
              {aliasError && (
                <p className={styles.aliasErrorText}>{aliasError}</p>
              )}
              {aliasAvailable === true && (
                <p className={styles.aliasSuccessText}>Verfügbar!</p>
              )}
              <div className={styles.aliasActions}>
                <button
                  onClick={handleSaveAlias}
                  className={styles.aliasSaveButton}
                  disabled={!aliasAvailable || aliasSaving || aliasChecking}
                >
                  {aliasSaving ? (
                    <><Loader2 size={14} className={styles.spinning} /> Speichern...</>
                  ) : (
                    'Adresse setzen'
                  )}
                </button>
                <button
                  onClick={() => setShowAliasEditor(false)}
                  className={styles.aliasCancelButton}
                  disabled={aliasSaving}
                >
                  Abbrechen
                </button>
              </div>
            </motion.div>
          )}

          {/* How it works */}
          <div className={styles.howItWorks}>
            <h4 className={styles.howItWorksTitle}>
              <Zap size={16} />
              So funktioniert's
            </h4>
            <div className={styles.steps}>
              <div className={styles.step}>
                <div className={styles.stepNumber}>1</div>
                <div className={styles.stepContent}>
                  <p><strong>Adresse kopieren</strong> – Klicke auf das Kopier-Symbol</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>2</div>
                <div className={styles.stepContent}>
                  <p><strong>E-Mail weiterleiten</strong> – Leite Vertrags-E-Mails an diese Adresse</p>
                </div>
              </div>
              <div className={styles.step}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepContent}>
                  <p><strong>Automatisch importiert</strong> – Anhänge werden als Verträge gespeichert</p>
                </div>
              </div>
            </div>
          </div>

          {/* Warning when disabled (nur für zahlende User) */}
          {!emailInboxEnabled && !isFree && (
            <div className={styles.warningBox}>
              <AlertTriangle size={18} className={styles.warningIcon} />
              <p className={styles.warningText}>
                E-Mail-Upload ist deaktiviert. Klicke auf den Power-Button zum Aktivieren.
              </p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Tutorial Modal (nur für zahlende User) */}
      {!isFree && (
        <EmailTutorialModal
          show={showTutorial}
          emailAddress={emailInboxAddress}
          emailEnabled={emailInboxEnabled}
          onClose={() => setShowTutorial(false)}
          onCopy={handleCopy}
          onRegenerate={handleRegenerate}
          onToggle={handleToggle}
          showEnterpriseHint={isBusiness}
        />
      )}
    </>
  );
}
