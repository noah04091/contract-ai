// 📝 EnhancedSignatureModal.tsx - Multi-Step Signature Modal with Field Placement
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ArrowRight, ArrowLeft, CheckCircle, Plus, Mail, User, Trash2, Users, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PDFFieldPlacementEditor, { SignatureField, Signer } from "./PDFFieldPlacementEditor";
import styles from "../styles/EnhancedSignatureModal.module.css";

interface EnhancedSignatureModalProps {
  show: boolean;
  onClose: () => void;
  contractId: string;
  contractName: string;
  contractS3Key: string;
}

type SignatureMode = "RECIPIENT_ONLY" | "BOTH_PARTIES";
type SigningOrder = "SENDER_FIRST" | "RECIPIENT_FIRST";
type Step = 1 | 2 | 3;

// Predefined colors for signers
const SIGNER_COLORS = [
  '#2E6CF6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];

export default function EnhancedSignatureModal({
  show,
  onClose,
  contractId,
  contractName,
  contractS3Key
}: EnhancedSignatureModalProps) {
  const navigate = useNavigate();

  // Step management
  const [currentStep, setCurrentStep] = useState<Step>(1);

  // Signer management
  const [signers, setSigners] = useState<Array<{ email: string; name: string; color: string }>>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [message, setMessage] = useState("");

  // Settings
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("RECIPIENT_ONLY");
  const [signingOrder, setSigningOrder] = useState<SigningOrder>("RECIPIENT_FIRST");
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  // Signature fields
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);

  // PDF URL
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load current user info
  useEffect(() => {
    const loadUserInfo = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/auth/me", {
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          credentials: "include"
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentUser({
            name: data.user?.name || "Sie",
            email: data.user?.email || ""
          });
        }
      } catch (err) {
        console.error("Failed to load user info:", err);
      }
    };

    if (show) {
      loadUserInfo();
    }
  }, [show]);

  // Load PDF URL
  useEffect(() => {
    const loadPdfUrl = async () => {
      if (!show || !contractS3Key) return;

      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/s3/view?key=${encodeURIComponent(contractS3Key)}`, {
          headers: {
            "Authorization": `Bearer ${token}`
          },
          credentials: "include"
        });

        if (response.ok) {
          const data = await response.json();
          setPdfUrl(data.url || data.fileUrl);
        }
      } catch (err) {
        console.error("Failed to load PDF URL:", err);
        toast.error("Fehler beim Laden des PDFs");
      }
    };

    loadPdfUrl();
  }, [show, contractS3Key]);

  // Reset state when modal closes
  useEffect(() => {
    if (!show) {
      setCurrentStep(1);
      setSigners([]);
      setCurrentEmail("");
      setCurrentName("");
      setMessage("");
      setSignatureFields([]);
      setPdfUrl(null);
      setIsSubmitting(false);
    }
  }, [show]);

  const handleAddSigner = () => {
    if (!currentEmail || !currentName) {
      toast.warning("Bitte E-Mail und Name eingeben");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentEmail)) {
      toast.error("Bitte gültige E-Mail-Adresse eingeben");
      return;
    }

    // Check for duplicates
    if (signers.some(s => s.email.toLowerCase() === currentEmail.toLowerCase())) {
      toast.warning("Diese E-Mail-Adresse wurde bereits hinzugefügt");
      return;
    }

    // Assign color from SIGNER_COLORS (cycling through colors)
    const color = SIGNER_COLORS[signers.length % SIGNER_COLORS.length];

    setSigners([...signers, { email: currentEmail, name: currentName, color }]);
    setCurrentEmail("");
    setCurrentName("");
  };

  const handleRemoveSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSigner();
    }
  };

  const handleNextStep = () => {
    if (currentStep === 1) {
      // Validate step 1
      if (signers.length === 0) {
        toast.warning("Bitte mindestens einen Empfänger hinzufügen");
        return;
      }

      if (signatureMode === "BOTH_PARTIES" && !currentUser) {
        toast.error("Benutzerdaten konnten nicht geladen werden");
        return;
      }

      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Validate step 2
      if (signatureFields.length === 0) {
        toast.warning("Bitte mindestens ein Signaturfeld platzieren");
        return;
      }

      // Check if all signers have at least one field
      const allSigners = buildFinalSigners();
      const signersWithFields = new Set(signatureFields.map(f => f.assigneeEmail));
      const signersWithoutFields = allSigners.filter(s => !signersWithFields.has(s.email));

      if (signersWithoutFields.length > 0) {
        toast.warning(`Folgende Empfänger haben keine Signaturfelder: ${signersWithoutFields.map(s => s.name).join(", ")}`);
        return;
      }

      setCurrentStep(3);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as Step);
    }
  };

  const buildFinalSigners = () => {
    let finalSigners: Array<{
      email: string;
      name: string;
      role: string;
      order: number;
    }> = [];

    if (signatureMode === "BOTH_PARTIES" && currentUser) {
      if (signingOrder === "SENDER_FIRST") {
        finalSigners.push({
          email: currentUser.email,
          name: currentUser.name,
          role: "sender",
          order: 1
        });

        signers.forEach((signer, index) => {
          finalSigners.push({
            email: signer.email,
            name: signer.name,
            role: "recipient",
            order: index + 2
          });
        });
      } else {
        signers.forEach((signer, index) => {
          finalSigners.push({
            email: signer.email,
            name: signer.name,
            role: "recipient",
            order: index + 1
          });
        });

        finalSigners.push({
          email: currentUser.email,
          name: currentUser.name,
          role: "sender",
          order: signers.length + 1
        });
      }
    } else {
      finalSigners = signers.map((signer, index) => ({
        email: signer.email,
        name: signer.name,
        role: "recipient",
        order: index + 1
      }));
    }

    return finalSigners;
  };

  const handleSubmit = async () => {
    if (signatureFields.length === 0) {
      toast.error("Bitte mindestens ein Signaturfeld platzieren");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      const finalSigners = buildFinalSigners();

      console.log("📤 Creating envelope with custom field placement:", {
        contractId,
        contractName,
        signatureMode,
        signingOrder,
        finalSigners,
        signatureFields,
        message
      });

      const response = await fetch("/api/envelopes", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          contractId,
          title: contractName,
          message: message,
          s3Key: contractS3Key,
          signers: finalSigners,
          signatureFields: signatureFields,
          signingMode: finalSigners.length > 1 ? "SEQUENTIAL" : "SINGLE"
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Erstellen des Envelopes");
      }

      console.log("✅ Envelope created:", data.envelope);

      // Send invitations
      const sendResponse = await fetch(`/api/envelopes/${data.envelope._id}/send`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (!sendResponse.ok) {
        const sendData = await sendResponse.json();
        throw new Error(sendData.error || "Fehler beim Versenden der Einladungen");
      }

      console.log("✅ Invitations sent");

      toast.success(`✅ Signaturanfrage erfolgreich versendet an ${finalSigners.length} ${finalSigners.length === 1 ? 'Empfänger' : 'Empfänger'}!`, {
        position: "top-center",
        autoClose: 4000
      });

      onClose();

      // Navigate to envelopes page after short delay
      setTimeout(() => {
        navigate("/envelopes");
      }, 1500);

    } catch (error) {
      console.error("❌ Error creating envelope:", error);
      toast.error(error instanceof Error ? error.message : "Fehler beim Versenden der Signaturanfrage", {
        position: "top-right",
        autoClose: 5000
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Get all signers including current user if applicable
  const getAllSigners = (): Signer[] => {
    const result: Signer[] = signers;

    if (signatureMode === "BOTH_PARTIES" && currentUser) {
      // Add current user with a unique color
      result.push({
        email: currentUser.email,
        name: currentUser.name,
        color: '#667eea' // Purple for owner
      });
    }

    return result;
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      {show && (
        <div className={styles.modalOverlay} onClick={onClose}>
          <motion.div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
          >
            {/* Header */}
            <div className={styles.modalHeader}>
              <div className={styles.headerIcon}>
                <Send size={24} />
              </div>
              <div>
                <h2>Zur Signatur versenden</h2>
                <p>{contractName}</p>
              </div>
              <button
                className={styles.closeButton}
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Schließen"
              >
                <X size={20} />
              </button>
            </div>

            {/* Step Indicator */}
            <div className={styles.stepIndicator}>
              <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ''} ${currentStep > 1 ? styles.completed : ''}`}>
                <div className={styles.stepNumber}>{currentStep > 1 ? <CheckCircle size={16} /> : '1'}</div>
                <div className={styles.stepLabel}>Empfänger</div>
              </div>
              <div className={styles.stepLine}></div>
              <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ''} ${currentStep > 2 ? styles.completed : ''}`}>
                <div className={styles.stepNumber}>{currentStep > 2 ? <CheckCircle size={16} /> : '2'}</div>
                <div className={styles.stepLabel}>Felder platzieren</div>
              </div>
              <div className={styles.stepLine}></div>
              <div className={`${styles.step} ${currentStep >= 3 ? styles.active : ''}`}>
                <div className={styles.stepNumber}>3</div>
                <div className={styles.stepLabel}>Senden</div>
              </div>
            </div>

            {/* Step Content */}
            <div className={styles.modalBody}>
              <AnimatePresence mode="wait">
                {currentStep === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={styles.stepContent}
                  >
                    <div className={styles.step1Container}>
                      {/* Signature Settings */}
                      <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>
                          <Users size={18} />
                          Signatur-Einstellungen
                        </h3>

                        {/* Radio Buttons: Nur Empfänger vs Beide Seiten */}
                        <div className={styles.radioGroup}>
                          <label className={styles.radioOption}>
                            <input
                              type="radio"
                              name="signatureMode"
                              value="RECIPIENT_ONLY"
                              checked={signatureMode === "RECIPIENT_ONLY"}
                              onChange={() => setSignatureMode("RECIPIENT_ONLY")}
                              className={styles.radio}
                            />
                            <div className={styles.radioLabel}>
                              <span className={styles.radioTitle}>Nur Empfänger signiert</span>
                              <span className={styles.radioSubtitle}>
                                Nur die hinzugefügten Empfänger müssen signieren
                              </span>
                            </div>
                          </label>

                          <label className={styles.radioOption}>
                            <input
                              type="radio"
                              name="signatureMode"
                              value="BOTH_PARTIES"
                              checked={signatureMode === "BOTH_PARTIES"}
                              onChange={() => setSignatureMode("BOTH_PARTIES")}
                              className={styles.radio}
                            />
                            <div className={styles.radioLabel}>
                              <span className={styles.radioTitle}>Beide Seiten signieren</span>
                              <span className={styles.radioSubtitle}>
                                Sie und die Empfänger müssen signieren
                              </span>
                            </div>
                          </label>
                        </div>

                        {/* Signing Order Dropdown (nur bei BOTH_PARTIES) */}
                        {signatureMode === "BOTH_PARTIES" && (
                          <div className={styles.dropdownWrapper}>
                            <label className={styles.dropdownLabel}>Reihenfolge:</label>
                            <select
                              value={signingOrder}
                              onChange={(e) => setSigningOrder(e.target.value as SigningOrder)}
                              className={styles.dropdown}
                            >
                              <option value="RECIPIENT_FIRST">Empfänger signiert zuerst</option>
                              <option value="SENDER_FIRST">Ich signiere zuerst</option>
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Add Signer Form */}
                      <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Empfänger hinzufügen</h3>
                        <div className={styles.addSignerForm}>
                          <div className={styles.inputGroup}>
                            <div className={styles.inputWrapper}>
                              <Mail size={16} className={styles.inputIcon} />
                              <input
                                type="email"
                                placeholder="E-Mail-Adresse"
                                value={currentEmail}
                                onChange={(e) => setCurrentEmail(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className={styles.input}
                              />
                            </div>
                            <div className={styles.inputWrapper}>
                              <User size={16} className={styles.inputIcon} />
                              <input
                                type="text"
                                placeholder="Name"
                                value={currentName}
                                onChange={(e) => setCurrentName(e.target.value)}
                                onKeyPress={handleKeyPress}
                                className={styles.input}
                              />
                            </div>
                          </div>
                          <button
                            className={styles.addBtn}
                            onClick={handleAddSigner}
                            disabled={!currentEmail || !currentName}
                          >
                            <Plus size={16} />
                            Hinzufügen
                          </button>
                        </div>
                      </div>

                      {/* Signers List */}
                      {signers.length > 0 && (
                        <div className={styles.section}>
                          <h3 className={styles.sectionTitle}>
                            Empfänger ({signers.length})
                          </h3>
                          <div className={styles.signersList}>
                            {signers.map((signer, index) => (
                              <div key={index} className={styles.signerItem}>
                                <div className={styles.signerInfo}>
                                  <div
                                    className={styles.signerIcon}
                                    style={{ backgroundColor: signer.color }}
                                  >
                                    <User size={14} />
                                  </div>
                                  <div className={styles.signerDetails}>
                                    <span className={styles.signerName}>{signer.name}</span>
                                    <span className={styles.signerEmail}>{signer.email}</span>
                                  </div>
                                </div>
                                <button
                                  className={styles.removeBtn}
                                  onClick={() => handleRemoveSigner(index)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {currentStep === 2 && pdfUrl && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={styles.stepContent}
                  >
                    <PDFFieldPlacementEditor
                      pdfUrl={pdfUrl}
                      signers={getAllSigners()}
                      fields={signatureFields}
                      onFieldsChange={setSignatureFields}
                    />
                  </motion.div>
                )}

                {currentStep === 3 && (
                  <motion.div
                    key="step3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className={styles.stepContent}
                  >
                    <div className={styles.step3Container}>
                      {/* Summary Section */}
                      <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Zusammenfassung</h3>

                        {/* Contract Info */}
                        <div className={styles.summaryCard}>
                          <div className={styles.summaryLabel}>Dokument:</div>
                          <div className={styles.summaryValue}>{contractName}</div>
                        </div>

                        {/* Signers Info */}
                        <div className={styles.summaryCard}>
                          <div className={styles.summaryLabel}>Empfänger:</div>
                          <div className={styles.summarySigners}>
                            {getAllSigners().map((signer, index) => (
                              <div key={index} className={styles.summarySignerItem}>
                                <div
                                  className={styles.summarySignerDot}
                                  style={{ backgroundColor: signer.color }}
                                />
                                <span className={styles.summarySignerText}>
                                  {signer.name} ({signer.email})
                                </span>
                                {signatureFields.filter(f => f.assigneeEmail === signer.email).length > 0 && (
                                  <span className={styles.summaryFieldCount}>
                                    {signatureFields.filter(f => f.assigneeEmail === signer.email).length} {signatureFields.filter(f => f.assigneeEmail === signer.email).length === 1 ? 'Feld' : 'Felder'}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Signature Mode */}
                        <div className={styles.summaryCard}>
                          <div className={styles.summaryLabel}>Signatur-Modus:</div>
                          <div className={styles.summaryValue}>
                            {signatureMode === "BOTH_PARTIES"
                              ? `Beide Seiten signieren (${signingOrder === "SENDER_FIRST" ? "Sie zuerst" : "Empfänger zuerst"})`
                              : "Nur Empfänger signiert"
                            }
                          </div>
                        </div>

                        {/* Fields Count */}
                        <div className={styles.summaryCard}>
                          <div className={styles.summaryLabel}>Signatur-Felder:</div>
                          <div className={styles.summaryValue}>
                            {signatureFields.length} {signatureFields.length === 1 ? 'Feld' : 'Felder'} platziert
                          </div>
                        </div>
                      </div>

                      {/* Message Section */}
                      <div className={styles.section}>
                        <h3 className={styles.sectionTitle}>Nachricht (optional)</h3>
                        <textarea
                          className={styles.textarea}
                          placeholder="Fügen Sie eine persönliche Nachricht für die Empfänger hinzu..."
                          value={message}
                          onChange={(e) => setMessage(e.target.value)}
                          rows={4}
                        />
                      </div>

                      {/* Warning if BOTH_PARTIES and current user has no fields */}
                      {signatureMode === "BOTH_PARTIES" && currentUser &&
                       signatureFields.filter(f => f.assigneeEmail === currentUser.email).length === 0 && (
                        <div className={styles.warningBox}>
                          <span className={styles.warningIcon}>⚠️</span>
                          <div className={styles.warningText}>
                            <strong>Hinweis:</strong> Sie haben "Beide Seiten signieren" gewählt, aber keine Signatur-Felder für sich selbst platziert.
                          </div>
                        </div>
                      )}

                      {/* Success hint */}
                      <div className={styles.successBox}>
                        <span className={styles.successIcon}>✓</span>
                        <div className={styles.successText}>
                          Bereit zum Versenden! Die Empfänger erhalten E-Mail-Einladungen zum Signieren.
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer */}
            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={currentStep === 1 ? onClose : handlePrevStep}
                disabled={isSubmitting}
              >
                {currentStep === 1 ? (
                  <>
                    <X size={16} />
                    <span>Abbrechen</span>
                  </>
                ) : (
                  <>
                    <ArrowLeft size={16} />
                    <span>Zurück</span>
                  </>
                )}
              </button>

              {currentStep < 3 ? (
                <button
                  className={styles.nextButton}
                  onClick={handleNextStep}
                  disabled={isSubmitting}
                >
                  <span>Weiter</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className={styles.sendButton}
                  onClick={handleSubmit}
                  disabled={isSubmitting || signatureFields.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <div className={styles.spinner}></div>
                      <span>Wird versendet...</span>
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      <span>Jetzt versenden</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Professional Loading Overlay */}
            <AnimatePresence>
              {isSubmitting && (
                <motion.div
                  className={styles.loadingOverlay}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className={styles.loadingContent}>
                    <div className={styles.loadingSpinner}>
                      <Loader2 className={styles.spinnerIcon} size={48} />
                    </div>
                    <h3 className={styles.loadingTitle}>Vertrag wird erstellt...</h3>
                    <p className={styles.loadingText}>
                      Bitte warten Sie, während wir Ihre Signaturanfrage vorbereiten und versenden.
                    </p>
                    <div className={styles.loadingProgress}>
                      <div className={styles.progressBar}></div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
