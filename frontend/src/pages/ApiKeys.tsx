// 📁 frontend/src/pages/ApiKeys.tsx
// REST API-Zugang: API-Keys Management UI (Enterprise-Feature)

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet";
import { Key, Copy, Trash2, Plus, AlertCircle, CheckCircle, Eye, EyeOff, Lock, Code } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import styles from "../styles/ApiKeys.module.css";

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  permissions: string[];
  createdAt: string;
  lastUsedAt: string | null;
  isActive: boolean;
}

interface Notification {
  message: string;
  type: "success" | "error" | "warning";
}

export default function ApiKeys() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showKey, setShowKey] = useState(false);

  // Enterprise-Check
  useEffect(() => {
    if (!isLoading && user && user.subscriptionPlan !== "premium") {
      navigate("/pricing");
    }
  }, [user, isLoading, navigate]);

  // Lade API-Keys
  useEffect(() => {
    if (user && user.subscriptionPlan === "premium") {
      fetchApiKeys();
    }
  }, [user]);

  const fetchApiKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch("/api/api-keys/list", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setApiKeys(data.keys);
      } else {
        throw new Error(data.message || "Fehler beim Laden");
      }
    } catch (error: unknown) {
      console.error("Fehler beim Laden der API-Keys:", error);
      const message = error instanceof Error ? error.message : "Fehler beim Laden der API-Keys";
      setNotification({
        message,
        type: "error"
      });
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      setNotification({
        message: "Bitte gib einen Namen für den API-Key ein",
        type: "error"
      });
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/api-keys/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          name: newKeyName,
          permissions: ["read", "write"]
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setGeneratedKey(data.apiKey);
        setNewKeyName("");
        await fetchApiKeys();
        setNotification({
          message: "API-Key erfolgreich erstellt!",
          type: "success"
        });
      } else {
        throw new Error(data.message || "Fehler beim Erstellen");
      }
    } catch (error: unknown) {
      console.error("Fehler beim Generieren:", error);
      const message = error instanceof Error ? error.message : "Fehler beim Erstellen des API-Keys";
      setNotification({
        message,
        type: "error"
      });
      setShowGenerateModal(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteKey = async (keyId: string, keyName: string) => {
    if (!confirm(`API-Key "${keyName}" wirklich löschen?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/api-keys/${keyId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`
        }
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await fetchApiKeys();
        setNotification({
          message: "API-Key erfolgreich gelöscht",
          type: "success"
        });
      } else {
        throw new Error(data.message || "Fehler beim Löschen");
      }
    } catch (error: unknown) {
      console.error("Fehler beim Löschen:", error);
      const message = error instanceof Error ? error.message : "Fehler beim Löschen des API-Keys";
      setNotification({
        message,
        type: "error"
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setNotification({
      message: "In Zwischenablage kopiert!",
      type: "success"
    });
  };

  if (isLoading || (user && user.subscriptionPlan !== "premium")) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>API-Keys - Contract AI</title>
      </Helmet>

      <div className={styles.container}>
        <motion.div
          className={styles.content}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <Key size={32} className={styles.headerIcon} />
              <div>
                <h1 className={styles.title}>API-Keys</h1>
                <p className={styles.subtitle}>
                  Verwalte deine API-Keys für programmatischen Zugriff auf Contract AI
                </p>
              </div>
            </div>
            <button
              className={styles.generateButton}
              onClick={() => setShowGenerateModal(true)}
              disabled={apiKeys.length >= 5}
            >
              <Plus size={18} />
              Neuen Key erstellen
            </button>
          </div>

          {/* Enterprise Badge */}
          <div className={styles.enterpriseBadge}>
            <Lock size={16} />
            <span>Enterprise-Feature</span>
          </div>

          {/* Info Box */}
          <div className={styles.infoBox}>
            <AlertCircle size={20} />
            <div>
              <strong>REST API-Zugang:</strong> Nutze API-Keys für automatisierte Workflows,
              Systemintegrationen und Custom-Tools. Max. 5 Keys pro Account.
              <a href="/api-docs" className={styles.docsLink}>
                <Code size={14} />
                API-Dokumentation
              </a>
            </div>
          </div>

          {/* API-Keys Liste */}
          {isLoadingKeys ? (
            <div className={styles.loading}>Lade API-Keys...</div>
          ) : apiKeys.length === 0 ? (
            <div className={styles.emptyState}>
              <Key size={48} className={styles.emptyIcon} />
              <h3>Keine API-Keys vorhanden</h3>
              <p>Erstelle deinen ersten API-Key, um mit der Integration zu beginnen.</p>
            </div>
          ) : (
            <div className={styles.keysList}>
              {apiKeys.map((key) => (
                <motion.div
                  key={key.id}
                  className={styles.keyCard}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={styles.keyHeader}>
                    <div className={styles.keyName}>
                      <Key size={18} />
                      <strong>{key.name}</strong>
                    </div>
                    <button
                      className={styles.deleteButton}
                      onClick={() => handleDeleteKey(key.id, key.name)}
                      title="Key löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className={styles.keyDetails}>
                    <div className={styles.keyPrefixRow}>
                      <code className={styles.keyPrefix}>{key.keyPrefix}</code>
                      <button
                        className={styles.copyButton}
                        onClick={() => copyToClipboard(key.keyPrefix)}
                        title="Prefix kopieren"
                      >
                        <Copy size={14} />
                      </button>
                    </div>

                    <div className={styles.keyMeta}>
                      <span>Erstellt: {new Date(key.createdAt).toLocaleDateString("de-DE")}</span>
                      {key.lastUsedAt && (
                        <span>
                          Zuletzt verwendet: {new Date(key.lastUsedAt).toLocaleDateString("de-DE")}
                        </span>
                      )}
                    </div>

                    <div className={styles.keyPermissions}>
                      {key.permissions.map((perm) => (
                        <span key={perm} className={styles.permissionBadge}>
                          {perm}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Limit Warning */}
          {apiKeys.length >= 5 && (
            <div className={styles.warningBox}>
              <AlertCircle size={18} />
              Maximale Anzahl an API-Keys erreicht (5/5). Lösche alte Keys, um neue zu erstellen.
            </div>
          )}
        </motion.div>

        {/* Generate Modal */}
        <AnimatePresence>
          {showGenerateModal && (
            <motion.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !generatedKey && setShowGenerateModal(false)}
            >
              <motion.div
                className={styles.modal}
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                {!generatedKey ? (
                  <>
                    <h2 className={styles.modalTitle}>Neuen API-Key erstellen</h2>
                    <p className={styles.modalDescription}>
                      Gib dem API-Key einen beschreibenden Namen (z.B. "Production API", "Development", etc.)
                    </p>

                    <input
                      type="text"
                      className={styles.input}
                      placeholder="z.B. Production API"
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      maxLength={50}
                    />

                    <div className={styles.modalActions}>
                      <button
                        className={styles.cancelButton}
                        onClick={() => setShowGenerateModal(false)}
                        disabled={isGenerating}
                      >
                        Abbrechen
                      </button>
                      <button
                        className={styles.createButton}
                        onClick={handleGenerateKey}
                        disabled={isGenerating || !newKeyName.trim()}
                      >
                        {isGenerating ? "Erstelle..." : "Erstellen"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={styles.successHeader}>
                      <CheckCircle size={48} className={styles.successIcon} />
                      <h2 className={styles.modalTitle}>API-Key erfolgreich erstellt!</h2>
                    </div>

                    <div className={styles.warningBox}>
                      <AlertCircle size={18} />
                      <strong>Wichtig:</strong> Speichere diesen Key sicher! Er wird nur einmal angezeigt.
                    </div>

                    <div className={styles.generatedKeyBox}>
                      <div className={styles.keyDisplay}>
                        <code className={styles.generatedKey}>
                          {showKey ? generatedKey : generatedKey?.replace(/./g, "•")}
                        </code>
                        <button
                          className={styles.toggleKeyButton}
                          onClick={() => setShowKey(!showKey)}
                          title={showKey ? "Key verstecken" : "Key anzeigen"}
                        >
                          {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <button
                        className={styles.copyButtonLarge}
                        onClick={() => copyToClipboard(generatedKey!)}
                      >
                        <Copy size={18} />
                        In Zwischenablage kopieren
                      </button>
                    </div>

                    <button
                      className={styles.doneButton}
                      onClick={() => {
                        setGeneratedKey(null);
                        setShowGenerateModal(false);
                      }}
                    >
                      Fertig
                    </button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              className={`${styles.notification} ${styles[notification.type]}`}
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              {notification.type === "success" ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span>{notification.message}</span>
              <button onClick={() => setNotification(null)}>✕</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
