// 📁 frontend/src/pages/Integrations.tsx
// CRM/ERP/CPQ Integration Settings Page

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Helmet } from "react-helmet-async";
import {
  Link2,
  Unlink,
  RefreshCw,
  Settings,
  CheckCircle,
  AlertCircle,
  Clock,
  Activity,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building2,
  Zap,
  Shield,
  ArrowLeftRight,
  HelpCircle,
  BookOpen,
  ExternalLink,
  Lock
} from "lucide-react";
import styles from "../styles/Integrations.module.css";

interface Integration {
  type: string;
  name: string;
  category: string;
  description: string;
  features: string[];
  icon: string;
  connected: boolean;
  status: string;
  connectedAt?: string;
  lastSyncAt?: string;
  comingSoon?: boolean;
}

interface IntegrationCredential {
  integrationType: string;
  displayName: string;
  status: string;
  settings: {
    syncDirection: string;
    autoSync: boolean;
    syncInterval: number;
    triggers: {
      onContractCreate: boolean;
      onContractUpdate: boolean;
      onContractSign: boolean;
      onDealStageChange: boolean;
    };
  };
  metadata: {
    connectedAt: string;
    lastSyncAt: string;
    totalSyncs: number;
  };
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null);
  const [integrationDetails, setIntegrationDetails] = useState<IntegrationCredential | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [showSAPModal, setShowSAPModal] = useState(false);
  const [sapCredentials, setSapCredentials] = useState({
    username: "",
    password: "",
    baseUrl: "",
    companyDB: "",
    sapType: "sap_business_one"
  });
  const [showGuide, setShowGuide] = useState(false);

  // Lade Integrationen
  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    try {
      const res = await fetch("/api/integrations", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations);
      }
    } catch (error) {
      console.error("Error loading integrations:", error);
      showNotification("Fehler beim Laden der Integrationen", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadIntegrationDetails = async (type: string) => {
    try {
      const res = await fetch(`/api/integrations/${type}`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setIntegrationDetails(data.credential);
      }
    } catch (error) {
      console.error("Error loading integration details:", error);
    }
  };

  const handleConnect = async (integration: Integration) => {
    if (integration.comingSoon) {
      showNotification(`${integration.name} kommt bald!`, "error");
      return;
    }

    // SAP benötigt Modal für Credentials
    if (integration.type.includes("sap")) {
      setSapCredentials(prev => ({ ...prev, sapType: integration.type }));
      setShowSAPModal(true);
      return;
    }

    setIsConnecting(true);
    try {
      const res = await fetch(`/api/integrations/${integration.type}/auth`, {
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        // Redirect zu OAuth
        window.location.href = data.authUrl;
      } else {
        showNotification("Fehler beim Starten der Verbindung", "error");
      }
    } catch {
      showNotification("Verbindungsfehler", "error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSAPConnect = async () => {
    setIsConnecting(true);
    try {
      const res = await fetch(`/api/integrations/${sapCredentials.sapType}/connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(sapCredentials)
      });

      if (res.ok) {
        showNotification("SAP erfolgreich verbunden!", "success");
        setShowSAPModal(false);
        loadIntegrations();
      } else {
        const errorData = await res.json();
        showNotification(errorData.message || "SAP Verbindung fehlgeschlagen", "error");
      }
    } catch {
      showNotification("Verbindungsfehler", "error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (type: string) => {
    if (!confirm("Integration wirklich trennen? Alle Sync-Daten gehen verloren.")) return;

    try {
      const res = await fetch(`/api/integrations/${type}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (res.ok) {
        showNotification("Integration getrennt", "success");
        loadIntegrations();
        setSelectedIntegration(null);
      } else {
        showNotification("Fehler beim Trennen", "error");
      }
    } catch {
      showNotification("Fehler beim Trennen", "error");
    }
  };

  const handleTestConnection = async (type: string) => {
    try {
      const res = await fetch(`/api/integrations/${type}/test`, {
        method: "POST",
        credentials: "include"
      });

      const data = await res.json();
      if (data.success) {
        showNotification("Verbindung erfolgreich!", "success");
      } else {
        showNotification(`Verbindungsfehler: ${data.message}`, "error");
      }
    } catch {
      showNotification("Verbindungstest fehlgeschlagen", "error");
    }
  };

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const getIntegrationIcon = (icon: string) => {
    switch (icon) {
      case "salesforce":
        return (
          <img
            src="https://img.icons8.com/color/96/salesforce.png"
            alt="Salesforce"
            className={styles.integrationIcon}
          />
        );
      case "hubspot":
        return (
          <img
            src="https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png"
            alt="HubSpot"
            className={styles.integrationIcon}
          />
        );
      case "sap":
        return (
          <img
            src="https://img.icons8.com/color/96/sap.png"
            alt="SAP"
            className={styles.integrationIcon}
          />
        );
      case "pipedrive":
        return (
          <img
            src="https://img.icons8.com/color/96/pipedrive.png"
            alt="Pipedrive"
            className={styles.integrationIcon}
          />
        );
      case "zoho":
        return (
          <img
            src="https://img.icons8.com/color/96/zoho.png"
            alt="Zoho"
            className={styles.integrationIcon}
          />
        );
      default:
        return <Building2 className={styles.integrationIcon} />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Check URL für OAuth Success/Error
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const error = params.get("error");

    if (success) {
      showNotification(`${success} erfolgreich verbunden!`, "success");
      loadIntegrations();
      window.history.replaceState({}, "", "/integrations");
    }
    if (error) {
      showNotification(`Fehler: ${decodeURIComponent(error)}`, "error");
      window.history.replaceState({}, "", "/integrations");
    }
  }, []);

  return (
    <>
      <Helmet>
        <title>Integrationen | Contract AI</title>
      </Helmet>

      <div className={styles.container}>
        {/* Header */}
        <motion.div
          className={styles.header}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className={styles.headerContent}>
            <Link2 className={styles.headerIcon} />
            <div>
              <h1>CRM/ERP Integrationen</h1>
              <p>Verbinde Contract AI mit deinen Business-Systemen</p>
            </div>
          </div>
        </motion.div>

        {/* Enterprise Badge */}
        <motion.div
          className={styles.enterpriseBadge}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <Lock size={16} />
          <span>Premium-Feature</span>
        </motion.div>

        {/* Info/Guide Toggle Box */}
        <motion.div
          className={styles.guideContainer}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <button
            className={styles.guideToggle}
            onClick={() => setShowGuide(!showGuide)}
          >
            <div className={styles.guideToggleLeft}>
              <HelpCircle size={20} />
              <span>Anleitung & Dokumentation</span>
            </div>
            {showGuide ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>

          <AnimatePresence>
            {showGuide && (
              <motion.div
                className={styles.guideContent}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className={styles.guideInner}>
                  {/* Quick Start */}
                  <div className={styles.guideSection}>
                    <h3><Zap size={18} /> Schnellstart</h3>
                    <ol className={styles.guideSteps}>
                      <li>Wähle eine Integration (Salesforce, HubSpot oder SAP)</li>
                      <li>Klicke auf "Verbinden" und autorisiere den Zugriff</li>
                      <li>Konfiguriere die Sync-Einstellungen nach deinen Bedürfnissen</li>
                      <li>Fertig! Deine Verträge werden automatisch synchronisiert</li>
                    </ol>
                  </div>

                  {/* Salesforce Setup */}
                  <div className={styles.guideSection}>
                    <h3><img src="https://img.icons8.com/color/24/salesforce.png" alt="" /> Salesforce Setup</h3>
                    <p>Für die Salesforce-Integration benötigst du:</p>
                    <ul className={styles.guideList}>
                      <li>Einen Salesforce Account (Production oder Sandbox)</li>
                      <li>Admin-Rechte oder die Berechtigung, Connected Apps zu autorisieren</li>
                    </ul>
                    <p className={styles.guideNote}>
                      Die OAuth-Verbindung wird automatisch hergestellt. Du wirst zu Salesforce
                      weitergeleitet, um Contract AI den Zugriff zu erlauben.
                    </p>
                  </div>

                  {/* HubSpot Setup */}
                  <div className={styles.guideSection}>
                    <h3><img src="https://www.hubspot.com/hubfs/HubSpot_Logos/HubSpot-Inversed-Favicon.png" alt="" style={{ width: 24, height: 24 }} /> HubSpot Setup</h3>
                    <p>Für die HubSpot-Integration benötigst du:</p>
                    <ul className={styles.guideList}>
                      <li>Einen HubSpot Account (Free, Starter, Professional oder Enterprise)</li>
                      <li>Zugriff auf CRM Deals, Companies und Contacts</li>
                    </ul>
                    <p className={styles.guideNote}>
                      Contract AI synchronisiert Deals bidirektional - neue Verträge erscheinen
                      als Deals und umgekehrt.
                    </p>
                  </div>

                  {/* SAP Setup */}
                  <div className={styles.guideSection}>
                    <h3><img src="https://img.icons8.com/color/24/sap.png" alt="" /> SAP Setup</h3>
                    <p>Für SAP Business One oder S/4HANA benötigst du:</p>
                    <ul className={styles.guideList}>
                      <li>SAP Service Layer URL (z.B. https://your-server:50000)</li>
                      <li>Company Database Name</li>
                      <li>Benutzername und Passwort mit API-Zugriff</li>
                    </ul>
                    <p className={styles.guideNote}>
                      Die Credentials werden verschlüsselt gespeichert (AES-256).
                      Contract AI synchronisiert Sales Orders mit Verträgen.
                    </p>
                  </div>

                  {/* Features */}
                  <div className={styles.guideSection}>
                    <h3><BookOpen size={18} /> Was wird synchronisiert?</h3>
                    <div className={styles.syncTable}>
                      <div className={styles.syncRow}>
                        <span className={styles.syncSystem}>Salesforce</span>
                        <span className={styles.syncArrow}>↔</span>
                        <span className={styles.syncData}>Opportunities, Accounts, Contacts, Quotes</span>
                      </div>
                      <div className={styles.syncRow}>
                        <span className={styles.syncSystem}>HubSpot</span>
                        <span className={styles.syncArrow}>↔</span>
                        <span className={styles.syncData}>Deals, Companies, Contacts</span>
                      </div>
                      <div className={styles.syncRow}>
                        <span className={styles.syncSystem}>SAP</span>
                        <span className={styles.syncArrow}>↔</span>
                        <span className={styles.syncData}>Sales Orders, Business Partners, Invoices</span>
                      </div>
                    </div>
                  </div>

                  {/* Support */}
                  <div className={styles.guideSection}>
                    <h3><Shield size={18} /> Sicherheit & Support</h3>
                    <ul className={styles.guideList}>
                      <li>Alle Verbindungen nutzen OAuth 2.0 oder verschlüsselte Credentials</li>
                      <li>Tokens werden mit AES-256-CBC verschlüsselt gespeichert</li>
                      <li>Webhook-Signaturen werden verifiziert (HMAC-SHA256)</li>
                    </ul>
                    <p className={styles.guideNote}>
                      Bei Fragen: <a href="mailto:integration@contract-ai.de" className={styles.guideLink}>
                        integration@contract-ai.de <ExternalLink size={12} />
                      </a>
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Notification */}
        <AnimatePresence>
          {notification && (
            <motion.div
              className={`${styles.notification} ${styles[notification.type]}`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              {notification.type === "success" ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              {notification.message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <div className={styles.content}>
          {/* Integration Categories */}
          {["CRM", "ERP", "CPQ"].map((category) => {
            const categoryIntegrations = integrations.filter(
              (i) => i.category === category
            );
            if (categoryIntegrations.length === 0) return null;

            return (
              <motion.section
                key={category}
                className={styles.category}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h2 className={styles.categoryTitle}>
                  {category === "CRM" && "Customer Relationship Management"}
                  {category === "ERP" && "Enterprise Resource Planning"}
                  {category === "CPQ" && "Configure, Price, Quote"}
                </h2>

                <div className={styles.integrationGrid}>
                  {categoryIntegrations.map((integration) => (
                    <motion.div
                      key={integration.type}
                      className={`${styles.integrationCard} ${
                        integration.connected ? styles.connected : ""
                      } ${integration.comingSoon ? styles.comingSoon : ""}`}
                      whileHover={{ scale: integration.comingSoon ? 1 : 1.02 }}
                      onClick={() => {
                        if (!integration.comingSoon) {
                          setSelectedIntegration(integration);
                          if (integration.connected) {
                            loadIntegrationDetails(integration.type);
                          }
                        }
                      }}
                    >
                      {/* Coming Soon Badge */}
                      {integration.comingSoon && (
                        <div className={styles.comingSoonBadge}>Bald verfügbar</div>
                      )}

                      {/* Status Badge */}
                      {integration.connected && (
                        <div className={styles.statusBadge}>
                          <CheckCircle size={14} />
                          Verbunden
                        </div>
                      )}

                      {/* Icon */}
                      <div className={styles.iconWrapper}>
                        {getIntegrationIcon(integration.icon)}
                      </div>

                      {/* Name & Description */}
                      <h3>{integration.name}</h3>
                      <p>{integration.description}</p>

                      {/* Features */}
                      <div className={styles.features}>
                        {integration.features.slice(0, 3).map((feature, i) => (
                          <span key={i} className={styles.feature}>
                            {feature}
                          </span>
                        ))}
                      </div>

                      {/* Last Sync */}
                      {integration.lastSyncAt && (
                        <div className={styles.lastSync}>
                          <Clock size={12} />
                          Letzter Sync: {formatDate(integration.lastSyncAt)}
                        </div>
                      )}

                      {/* Action */}
                      <div className={styles.cardAction}>
                        {integration.comingSoon ? (
                          <span>Bald verfügbar</span>
                        ) : integration.connected ? (
                          <>
                            Einstellungen <ChevronRight size={16} />
                          </>
                        ) : (
                          <>
                            Verbinden <ChevronRight size={16} />
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>
            );
          })}
        </div>

        {/* Integration Detail Modal */}
        <AnimatePresence>
          {selectedIntegration && (
            <motion.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedIntegration(null)}
            >
              <motion.div
                className={styles.modal}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Modal Header */}
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}>
                    {getIntegrationIcon(selectedIntegration.icon)}
                    <div>
                      <h2>{selectedIntegration.name}</h2>
                      <span className={styles.modalCategory}>
                        {selectedIntegration.category}
                      </span>
                    </div>
                  </div>
                  <button
                    className={styles.closeButton}
                    onClick={() => setSelectedIntegration(null)}
                  >
                    ×
                  </button>
                </div>

                {/* Modal Content */}
                <div className={styles.modalContent}>
                  {selectedIntegration.connected ? (
                    <>
                      {/* Connected View */}
                      <div className={styles.statusSection}>
                        <div className={styles.statusItem}>
                          <CheckCircle className={styles.statusIconSuccess} />
                          <div>
                            <strong>Verbunden</strong>
                            <span>
                              seit{" "}
                              {integrationDetails?.metadata?.connectedAt &&
                                formatDate(integrationDetails.metadata.connectedAt)}
                            </span>
                          </div>
                        </div>

                        {integrationDetails?.metadata?.lastSyncAt && (
                          <div className={styles.statusItem}>
                            <Activity className={styles.statusIconInfo} />
                            <div>
                              <strong>Letzter Sync</strong>
                              <span>
                                {formatDate(integrationDetails.metadata.lastSyncAt)}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Settings Preview */}
                      <div className={styles.settingsPreview}>
                        <h3>
                          <Settings size={16} /> Sync-Einstellungen
                        </h3>
                        <div className={styles.settingItem}>
                          <ArrowLeftRight size={14} />
                          <span>
                            {integrationDetails?.settings?.syncDirection ===
                            "bidirectional"
                              ? "Bidirektionale Synchronisation"
                              : integrationDetails?.settings?.syncDirection ===
                                "outbound"
                              ? "Nur zu " + selectedIntegration.name
                              : "Nur von " + selectedIntegration.name}
                          </span>
                        </div>
                        <div className={styles.settingItem}>
                          <Zap size={14} />
                          <span>
                            Auto-Sync:{" "}
                            {integrationDetails?.settings?.autoSync ? "An" : "Aus"}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className={styles.modalActions}>
                        <button
                          className={styles.primaryButton}
                          onClick={() => handleTestConnection(selectedIntegration.type)}
                        >
                          <RefreshCw size={16} />
                          Verbindung testen
                        </button>
                        <button
                          className={styles.dangerButton}
                          onClick={() =>
                            handleDisconnect(selectedIntegration.type)
                          }
                        >
                          <Unlink size={16} />
                          Trennen
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Not Connected View */}
                      <p className={styles.integrationDescription}>
                        {selectedIntegration.description}
                      </p>

                      <div className={styles.benefitsList}>
                        <h3>Vorteile der Integration:</h3>
                        <ul>
                          <li>
                            <CheckCircle size={14} />
                            Automatische Vertragserstellung aus{" "}
                            {selectedIntegration.category === "CRM"
                              ? "Opportunities"
                              : "Aufträgen"}
                          </li>
                          <li>
                            <CheckCircle size={14} />
                            Bidirektionale Synchronisation von Vertragsdaten
                          </li>
                          <li>
                            <CheckCircle size={14} />
                            Real-time Updates via Webhooks
                          </li>
                          <li>
                            <CheckCircle size={14} />
                            Signatur-Status direkt in {selectedIntegration.name}
                          </li>
                        </ul>
                      </div>

                      <div className={styles.featuresSection}>
                        <h3>Features:</h3>
                        <div className={styles.featuresList}>
                          {selectedIntegration.features.map((feature, i) => (
                            <span key={i} className={styles.featureTag}>
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className={styles.modalActions}>
                        <button
                          className={styles.primaryButton}
                          onClick={() => handleConnect(selectedIntegration)}
                          disabled={isConnecting}
                        >
                          {isConnecting ? (
                            <>
                              <RefreshCw size={16} className={styles.spinning} />
                              Verbinde...
                            </>
                          ) : (
                            <>
                              <Link2 size={16} />
                              Jetzt verbinden
                            </>
                          )}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* SAP Credentials Modal */}
        <AnimatePresence>
          {showSAPModal && (
            <motion.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSAPModal(false)}
            >
              <motion.div
                className={styles.modal}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <div className={styles.modalTitle}>
                    {getIntegrationIcon("sap")}
                    <div>
                      <h2>SAP Verbindung</h2>
                      <span className={styles.modalCategory}>ERP</span>
                    </div>
                  </div>
                  <button
                    className={styles.closeButton}
                    onClick={() => setShowSAPModal(false)}
                  >
                    ×
                  </button>
                </div>

                <div className={styles.modalContent}>
                  <p className={styles.integrationDescription}>
                    Gib deine SAP Service Layer Zugangsdaten ein:
                  </p>

                  <div className={styles.formGroup}>
                    <label>SAP System</label>
                    <select
                      value={sapCredentials.sapType}
                      onChange={(e) =>
                        setSapCredentials((prev) => ({
                          ...prev,
                          sapType: e.target.value
                        }))
                      }
                    >
                      <option value="sap_business_one">SAP Business One</option>
                      <option value="sap_s4hana">SAP S/4HANA</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label>Service Layer URL</label>
                    <input
                      type="text"
                      placeholder="https://your-sap-server:50000"
                      value={sapCredentials.baseUrl}
                      onChange={(e) =>
                        setSapCredentials((prev) => ({
                          ...prev,
                          baseUrl: e.target.value
                        }))
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Company Database</label>
                    <input
                      type="text"
                      placeholder="SBODemoDE"
                      value={sapCredentials.companyDB}
                      onChange={(e) =>
                        setSapCredentials((prev) => ({
                          ...prev,
                          companyDB: e.target.value
                        }))
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Benutzername</label>
                    <input
                      type="text"
                      placeholder="manager"
                      value={sapCredentials.username}
                      onChange={(e) =>
                        setSapCredentials((prev) => ({
                          ...prev,
                          username: e.target.value
                        }))
                      }
                    />
                  </div>

                  <div className={styles.formGroup}>
                    <label>Passwort</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={sapCredentials.password}
                      onChange={(e) =>
                        setSapCredentials((prev) => ({
                          ...prev,
                          password: e.target.value
                        }))
                      }
                    />
                  </div>

                  <div className={styles.securityNote}>
                    <Shield size={16} />
                    Deine Zugangsdaten werden verschlüsselt gespeichert.
                  </div>

                  <div className={styles.modalActions}>
                    <button
                      className={styles.secondaryButton}
                      onClick={() => setShowSAPModal(false)}
                    >
                      Abbrechen
                    </button>
                    <button
                      className={styles.primaryButton}
                      onClick={handleSAPConnect}
                      disabled={
                        isConnecting ||
                        !sapCredentials.baseUrl ||
                        !sapCredentials.username ||
                        !sapCredentials.password
                      }
                    >
                      {isConnecting ? (
                        <>
                          <RefreshCw size={16} className={styles.spinning} />
                          Verbinde...
                        </>
                      ) : (
                        <>
                          <Link2 size={16} />
                          Verbinden
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading State */}
        {isLoading && (
          <div className={styles.loadingState}>
            <RefreshCw className={styles.spinning} size={32} />
            <p>Lade Integrationen...</p>
          </div>
        )}
      </div>
    </>
  );
}
