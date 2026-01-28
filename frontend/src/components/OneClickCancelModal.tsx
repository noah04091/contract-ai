// src/components/OneClickCancelModal.tsx
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Send, 
  Mail, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Download,
  Loader,
  User,
  Calendar,
  Building2,
  Sparkles
} from "lucide-react";
import styles from "../styles/OneClickCancelModal.module.css";
import { fixUtf8Display } from "../utils/textUtils";

// Proper TypeScript interfaces
interface ProviderAddress {
  street?: string;
  city?: string;
  zip?: string;
}

interface ProviderInfo {
  name?: string;
  displayName?: string;
  email?: string;
  phone?: string;
  address?: ProviderAddress;
  category?: string;
  confidence?: number;
}

interface Contract {
  _id: string;
  name: string;
  provider?: string | ProviderInfo;
  contractNumber?: string;
  customerNumber?: string;
  expiryDate?: string;
  amount?: number;
  address?: ProviderAddress;
}

interface OneClickCancelModalProps {
  contract: Contract;
  show: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

// Type for extracted provider info
interface ExtractedProviderInfo {
  providerName?: string;
  providerEmail?: string;
  providerPhone?: string;
  providerAddress?: string;
}

export default function OneClickCancelModal({ 
  contract, 
  show, 
  onClose, 
  onSuccess 
}: OneClickCancelModalProps) {
  const [step, setStep] = useState<"form" | "preview" | "sending" | "success">("form");
  const [formData, setFormData] = useState({
    customerName: "",
    customerAddress: "",
    customerEmail: "",
    customerPhone: "",
    contractNumber: "",
    customerNumber: "",
    providerName: "",
    providerEmail: "",
    providerAddress: "",
    providerPhone: "",
    cancellationReason: "better_offer",
    cancellationDate: "immediate",
    customDate: "",
    sendMethod: "email",
    recipientEmail: "",
    additionalNotes: ""
  });
  const [cancellationLetter, setCancellationLetter] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [providerDetected, setProviderDetected] = useState(false);

  useEffect(() => {
    if (show && contract) {
      // Load user data from localStorage
      const userData = JSON.parse(localStorage.getItem("userData") || "{}");
      
      // Extract provider information if available - FIXED: Using proper types
      const providerInfo: ExtractedProviderInfo = {};
      
      if (contract.provider) {
        if (typeof contract.provider === 'string') {
          providerInfo.providerName = contract.provider;
        } else if (typeof contract.provider === 'object') {
          const provider = contract.provider as ProviderInfo;
          providerInfo.providerName = provider.displayName || provider.name || "";
          providerInfo.providerEmail = provider.email || "";
          providerInfo.providerPhone = provider.phone || "";
          
          if (provider.address) {
            const addr = provider.address;
            providerInfo.providerAddress = `${addr.street || ''}\n${addr.zip || ''} ${addr.city || ''}`.trim();
          }
          
          // Mark as detected if confidence is high enough
          if (provider.confidence && provider.confidence > 50) {
            setProviderDetected(true);
          }
        }
      }
      
      // Set all form data
      setFormData(prev => ({
        ...prev,
        // User data
        customerName: userData.name || "",
        customerAddress: userData.address || "",
        customerEmail: userData.email || "",
        customerPhone: userData.phone || "",
        // Contract data
        contractNumber: contract.contractNumber || "",
        customerNumber: contract.customerNumber || "",
        // Provider data
        ...providerInfo,
        // Keep recipient email in sync
        recipientEmail: providerInfo.providerEmail || ""
      }));
    }
  }, [show, contract]);

  const generateCancellationLetter = () => {
    const today = new Date().toLocaleDateString('de-DE');
    const cancellationDateText = formData.cancellationDate === "immediate" 
      ? "zum nächstmöglichen Zeitpunkt"
      : formData.cancellationDate === "expiry"
      ? `zum Vertragsende am ${new Date(contract.expiryDate || "").toLocaleDateString('de-DE')}`
      : `zum ${new Date(formData.customDate).toLocaleDateString('de-DE')}`;
    
    const reasonText = {
      better_offer: "Ich habe ein besseres Angebot gefunden.",
      dissatisfied: "Ich bin mit der Leistung nicht zufrieden.",
      no_longer_needed: "Ich benötige die Leistung nicht mehr.",
      price_increase: "Die angekündigte Preiserhöhung ist für mich nicht akzeptabel.",
      other: formData.additionalNotes
    }[formData.cancellationReason];

    // Use detected provider name or placeholder
    const providerName = formData.providerName || "[Anbieter]";
    const providerAddress = formData.providerAddress || "[Adresse des Anbieters]";

    const letter = `
${formData.customerName}
${formData.customerAddress}
${formData.customerEmail}
${formData.customerPhone ? `Tel: ${formData.customerPhone}` : ''}

${providerName}
Kundendienst
${providerAddress}

${today}

**Kündigung meines Vertrags ${fixUtf8Display(contract.name)}**

Sehr geehrte Damen und Herren,

hiermit kündige ich meinen Vertrag **${fixUtf8Display(contract.name)}** ${cancellationDateText}.

**Vertragsdaten:**
- Vertragsname: ${fixUtf8Display(contract.name)}
${formData.contractNumber ? `- Vertragsnummer: ${formData.contractNumber}` : ""}
${formData.customerNumber ? `- Kundennummer: ${formData.customerNumber}` : ""}
${contract.amount ? `- Monatlicher Betrag: ${contract.amount}€` : ""}

${reasonText ? `**Kündigungsgrund:** ${reasonText}` : ""}

Ich bitte um eine schriftliche Bestätigung der Kündigung unter Angabe des Beendigungszeitpunktes.

${formData.additionalNotes && formData.cancellationReason !== "other" ? `\n**Zusätzliche Anmerkungen:**\n${formData.additionalNotes}` : ""}

Mit freundlichen Grüßen

${formData.customerName}

---
*Erstellt mit Contract AI - ${today}*
`;

    setCancellationLetter(letter);
  };

  const handlePreview = () => {
    if (!formData.customerName || !formData.customerEmail) {
      setError("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }
    
    generateCancellationLetter();
    setStep("preview");
    setError("");
  };

  const handleSend = async () => {
    setStep("sending");
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      
      // Use provider email if detected, otherwise use manually entered email
      const finalRecipientEmail = formData.sendMethod === "email" 
        ? (formData.recipientEmail || formData.providerEmail || "")
        : "";
      
      const response = await fetch("/api/cancellations/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contractId: contract._id,
          contractName: contract.name,
          provider: formData.providerName || contract.provider,
          cancellationLetter,
          sendMethod: formData.sendMethod,
          recipientEmail: finalRecipientEmail,
          customerData: {
            name: formData.customerName,
            email: formData.customerEmail,
            phone: formData.customerPhone,
            address: formData.customerAddress
          },
          metadata: {
            reason: formData.cancellationReason,
            cancellationDate: formData.cancellationDate,
            customDate: formData.customDate,
            notes: formData.additionalNotes,
            providerDetected: providerDetected
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setStep("success");
        
        // Save user data for future use
        localStorage.setItem("userData", JSON.stringify({
          name: formData.customerName,
          email: formData.customerEmail,
          phone: formData.customerPhone,
          address: formData.customerAddress
        }));
        
        // Call success callback after delay
        setTimeout(() => {
          if (onSuccess) onSuccess();
          onClose();
        }, 3000);
      } else {
        throw new Error(data.error || "Fehler beim Senden der Kündigung");
      }
    } catch (err) {
      console.error("Fehler beim Senden der Kündigung:", err);
      const errorMessage = err instanceof Error 
        ? err.message 
        : "Fehler beim Senden der Kündigung";
      setError(errorMessage);
      setStep("preview");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([cancellationLetter], { type: 'text/plain;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Kündigung_${fixUtf8Display(contract.name).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (!show) return null;

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
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <div className={styles.iconWrapper}>
                <Send size={24} />
              </div>
              <div>
                <h2>1-Klick Kündigung</h2>
                <p>Kündigen Sie "{fixUtf8Display(contract.name)}" mit nur einem Klick</p>
                {providerDetected && (
                  <div className={styles.providerBadge}>
                    <Sparkles size={14} />
                    Anbieter automatisch erkannt: {formData.providerName}
                  </div>
                )}
              </div>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          <div className={styles.content}>
            {step === "form" && (
              <motion.div 
                className={styles.formStep}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className={styles.formSection}>
                  <h3>
                    <User size={18} />
                    Ihre Daten
                  </h3>
                  
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Name *</label>
                      <input
                        type="text"
                        value={formData.customerName}
                        onChange={(e) => setFormData({...formData, customerName: e.target.value})}
                        placeholder="Max Mustermann"
                        required
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>E-Mail *</label>
                      <input
                        type="email"
                        value={formData.customerEmail}
                        onChange={(e) => setFormData({...formData, customerEmail: e.target.value})}
                        placeholder="max@example.com"
                        required
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Adresse</label>
                      <input
                        type="text"
                        value={formData.customerAddress}
                        onChange={(e) => setFormData({...formData, customerAddress: e.target.value})}
                        placeholder="Musterstraße 1, 12345 Musterstadt"
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Telefon</label>
                      <input
                        type="tel"
                        value={formData.customerPhone}
                        onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                        placeholder="+49 123 456789"
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.formSection}>
                  <h3>
                    <FileText size={18} />
                    Vertragsdaten
                  </h3>
                  
                  {(formData.contractNumber || formData.customerNumber) && (
                    <div className={styles.autoFilledNotice}>
                      <CheckCircle size={16} />
                      Daten wurden automatisch aus Ihrem Vertrag übernommen
                    </div>
                  )}
                  
                  <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                      <label>Vertragsnummer</label>
                      <input
                        type="text"
                        value={formData.contractNumber}
                        onChange={(e) => setFormData({...formData, contractNumber: e.target.value})}
                        placeholder={formData.contractNumber ? "" : "Optional"}
                        className={formData.contractNumber ? styles.autoFilled : ""}
                      />
                    </div>
                    
                    <div className={styles.formGroup}>
                      <label>Kundennummer</label>
                      <input
                        type="text"
                        value={formData.customerNumber}
                        onChange={(e) => setFormData({...formData, customerNumber: e.target.value})}
                        placeholder={formData.customerNumber ? "" : "Optional"}
                        className={formData.customerNumber ? styles.autoFilled : ""}
                      />
                    </div>
                  </div>
                  
                  {providerDetected && (
                    <div className={styles.providerInfo}>
                      <h4>
                        <Building2 size={16} />
                        Erkannter Anbieter
                      </h4>
                      <div className={styles.providerDetails}>
                        <p><strong>{formData.providerName}</strong></p>
                        {formData.providerAddress && (
                          <p className={styles.providerAddress}>{formData.providerAddress}</p>
                        )}
                        {formData.providerEmail && (
                          <p className={styles.providerContact}>
                            <Mail size={14} />
                            {formData.providerEmail}
                          </p>
                        )}
                        {formData.providerPhone && (
                          <p className={styles.providerContact}>
                            <span>📞</span>
                            {formData.providerPhone}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.formSection}>
                  <h3>
                    <Calendar size={18} />
                    Kündigungsdetails
                  </h3>
                  
                  <div className={styles.formGroup}>
                    <label>Kündigungszeitpunkt</label>
                    <select
                      value={formData.cancellationDate}
                      onChange={(e) => setFormData({...formData, cancellationDate: e.target.value})}
                    >
                      <option value="immediate">Zum nächstmöglichen Zeitpunkt</option>
                      <option value="expiry">Zum Vertragsende</option>
                      <option value="custom">Zu einem bestimmten Datum</option>
                    </select>
                  </div>
                  
                  {formData.cancellationDate === "custom" && (
                    <div className={styles.formGroup}>
                      <label>Datum</label>
                      <input
                        type="date"
                        value={formData.customDate}
                        onChange={(e) => setFormData({...formData, customDate: e.target.value})}
                        min={new Date().toISOString().split('T')[0]}
                      />
                    </div>
                  )}
                  
                  <div className={styles.formGroup}>
                    <label>Kündigungsgrund</label>
                    <select
                      value={formData.cancellationReason}
                      onChange={(e) => setFormData({...formData, cancellationReason: e.target.value})}
                    >
                      <option value="better_offer">Besseres Angebot gefunden</option>
                      <option value="dissatisfied">Unzufrieden mit der Leistung</option>
                      <option value="no_longer_needed">Leistung nicht mehr benötigt</option>
                      <option value="price_increase">Preiserhöhung</option>
                      <option value="other">Sonstiges</option>
                    </select>
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label>Zusätzliche Anmerkungen</label>
                    <textarea
                      value={formData.additionalNotes}
                      onChange={(e) => setFormData({...formData, additionalNotes: e.target.value})}
                      placeholder="Optional"
                      rows={3}
                    />
                  </div>
                </div>

                <div className={styles.formSection}>
                  <h3>
                    <Mail size={18} />
                    Versandart
                  </h3>
                  
                  <div className={styles.sendMethodGrid}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="sendMethod"
                        value="email"
                        checked={formData.sendMethod === "email"}
                        onChange={(e) => setFormData({...formData, sendMethod: e.target.value})}
                      />
                      <div className={styles.radioContent}>
                        <Mail size={20} />
                        <span>Per E-Mail</span>
                      </div>
                    </label>
                    
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="sendMethod"
                        value="download"
                        checked={formData.sendMethod === "download"}
                        onChange={(e) => setFormData({...formData, sendMethod: e.target.value})}
                      />
                      <div className={styles.radioContent}>
                        <Download size={20} />
                        <span>Nur Download</span>
                      </div>
                    </label>
                  </div>
                  
                  {formData.sendMethod === "email" && (
                    <div className={styles.formGroup}>
                      <label>E-Mail des Anbieters</label>
                      {providerDetected && formData.providerEmail ? (
                        <div className={styles.providerEmailInfo}>
                          <p>✓ E-Mail wird gesendet an:</p>
                          <strong>{formData.providerEmail}</strong>
                          <input
                            type="email"
                            value={formData.recipientEmail}
                            onChange={(e) => setFormData({...formData, recipientEmail: e.target.value})}
                            placeholder="Alternative E-Mail eingeben"
                            className={styles.alternativeEmail}
                          />
                        </div>
                      ) : (
                        <input
                          type="email"
                          value={formData.recipientEmail}
                          onChange={(e) => setFormData({...formData, recipientEmail: e.target.value})}
                          placeholder="service@anbieter.de"
                        />
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div className={styles.error}>
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className={styles.actions}>
                  <button className={styles.cancelBtn} onClick={onClose}>
                    Abbrechen
                  </button>
                  <button className={styles.primaryBtn} onClick={handlePreview}>
                    Vorschau anzeigen
                  </button>
                </div>
              </motion.div>
            )}

            {step === "preview" && (
              <motion.div
                className={styles.previewStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <h3>Kündigungsschreiben - Vorschau</h3>
                <p className={styles.editHint}>
                  💡 Sie können den Text noch bearbeiten, bevor Sie ihn versenden
                </p>

                <div className={styles.letterPreview}>
                  <textarea
                    value={cancellationLetter}
                    onChange={(e) => setCancellationLetter(e.target.value)}
                    className={styles.editablePreview}
                    rows={25}
                  />
                </div>

                {error && (
                  <div className={styles.error}>
                    <AlertCircle size={16} />
                    {error}
                  </div>
                )}

                <div className={styles.actions}>
                  <button className={styles.secondaryBtn} onClick={() => setStep("form")}>
                    Zurück
                  </button>
                  <button className={styles.secondaryBtn} onClick={handleDownload}>
                    <Download size={16} />
                    Herunterladen
                  </button>
                  <button 
                    className={styles.primaryBtn} 
                    onClick={handleSend}
                    disabled={loading}
                  >
                    {formData.sendMethod === "email" ? (
                      <>
                        <Send size={16} />
                        Jetzt senden
                      </>
                    ) : (
                      <>
                        <CheckCircle size={16} />
                        Fertigstellen
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}

            {step === "sending" && (
              <motion.div 
                className={styles.sendingStep}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <div className={styles.loadingWrapper}>
                  <Loader size={48} className={styles.spinner} />
                  <h3>Kündigung wird versendet...</h3>
                  <p>Bitte warten Sie einen Moment</p>
                </div>
              </motion.div>
            )}

            {step === "success" && (
              <motion.div 
                className={styles.successStep}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
              >
                <div className={styles.successIcon}>
                  <CheckCircle size={64} />
                </div>
                <h3>Kündigung erfolgreich!</h3>
                <p>
                  {formData.sendMethod === "email" 
                    ? `Die Kündigung wurde erfolgreich an ${formData.recipientEmail || formData.providerEmail || contract.provider} gesendet.`
                    : "Die Kündigung wurde erfolgreich erstellt und gespeichert."
                  }
                </p>
                <p className={styles.successInfo}>
                  Eine Kopie wurde in Ihrem Archiv gespeichert.
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}