// 📝 EnhancedSignatureModal.tsx - Multi-Step Signature Modal with Field Placement
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
// Note: Plus, Mail, User, Trash2, Users will be used in Step 1 & 3 implementation
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

// Predefined colors for signers (will be used in Step 1 implementation)
/*
const SIGNER_COLORS = [
  '#2E6CF6', // Blue
  '#10B981', // Green
  '#F59E0B', // Orange
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#EC4899', // Pink
];
*/

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
  // TODO: Add currentEmail, currentName state in Step 1 implementation
  const [message, setMessage] = useState("");

  // Settings
  const [signatureMode] = useState<SignatureMode>("RECIPIENT_ONLY"); // Will be used in Step 1
  const [signingOrder] = useState<SigningOrder>("RECIPIENT_FIRST"); // Will be used in Step 1
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
      // currentEmail and currentName will be added in Step 1 implementation
      setMessage("");
      setSignatureFields([]);
      setPdfUrl(null);
      setIsSubmitting(false);
    }
  }, [show]);

  // TODO: Implement these in Step 1
  // const handleAddSigner = () => { ... };
  // const handleRemoveSigner = (index: number) => { ... };

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
                    {/* Step 1 content from original modal */}
                    {/* TODO: Copy content from SignatureModal.tsx */}
                    <div className={styles.placeholder}>Step 1: Empfänger hinzufügen (wird implementiert)</div>
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
                    <div className={styles.placeholder}>Step 3: Review & Send (wird implementiert)</div>
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
