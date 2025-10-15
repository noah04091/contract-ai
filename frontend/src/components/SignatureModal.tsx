import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Mail, User, Trash2, Send } from "lucide-react";
import styles from "../styles/SignatureModal.module.css";

interface Signer {
  email: string;
  name: string;
}

interface SignatureModalProps {
  show: boolean;
  onClose: () => void;
  contractId: string;
  contractName: string;
  contractS3Key: string; // ✉️ NEU: S3 Key des Vertrags
}

export default function SignatureModal({
  show,
  onClose,
  contractId,
  contractName,
  contractS3Key
}: SignatureModalProps) {
  const [signers, setSigners] = useState<Signer[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddSigner = () => {
    if (!currentEmail || !currentName) {
      alert("Bitte E-Mail und Name eingeben");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentEmail)) {
      alert("Bitte gültige E-Mail-Adresse eingeben");
      return;
    }

    // Check for duplicates
    if (signers.some(s => s.email.toLowerCase() === currentEmail.toLowerCase())) {
      alert("Diese E-Mail-Adresse wurde bereits hinzugefügt");
      return;
    }

    setSigners([...signers, { email: currentEmail, name: currentName }]);
    setCurrentEmail("");
    setCurrentName("");
  };

  const handleRemoveSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (signers.length === 0) {
      alert("Bitte mindestens einen Empfänger hinzufügen");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      console.log("📤 Creating envelope for signature:", {
        contractId,
        contractName,
        signers,
        message
      });

      // ✉️ Erstelle Signaturfelder (ein Feld pro Signer auf letzter Seite)
      const signatureFields = signers.map((signer, index) => ({
        assigneeEmail: signer.email,
        type: "signature",
        required: true,
        page: 0, // Last page (wird im Backend interpretiert)
        x: 50,
        y: 150 + (index * 100), // Vertikaler Abstand
        width: 250,
        height: 80
      }));

      // API-Call zum Backend: Envelope erstellen
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
          message: message || "",
          s3Key: contractS3Key, // ✉️ NEU: S3 Key
          signers: signers.map(signer => ({
            email: signer.email,
            name: signer.name
          })),
          signatureFields // ✉️ NEU: Signatur-Felder
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Erstellen der Signaturanfrage");
      }

      console.log("✅ Envelope created successfully:", data);

      const envelopeId = data.envelope._id;

      // ✉️ BUG FIX 3: Automatisch E-Mails versenden
      console.log(`📧 Sending invitations for envelope: ${envelopeId}`);

      const sendResponse = await fetch(`/api/envelopes/${envelopeId}/send`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      const sendData = await sendResponse.json();

      if (!sendResponse.ok) {
        console.error("❌ Failed to send invitations:", sendData.error);
        alert(`⚠️ Envelope erstellt, aber E-Mail-Versand fehlgeschlagen:\n\n${sendData.error || "Unbekannter Fehler"}\n\nSie können die Einladungen später über das Envelopes Dashboard versenden.`);
      } else {
        console.log("✅ Invitations sent successfully:", sendData);

        // Success feedback
        alert(`✅ Signaturanfrage erfolgreich versendet!\n\nE-Mail-Einladungen wurden gesendet an:\n${signers.map(s => `- ${s.name} (${s.email})`).join("\n")}\n\n${sendData.message}`);
      }

      // Reset form and close
      setSigners([]);
      setMessage("");
      onClose();
    } catch (error) {
      console.error("❌ Error sending signature request:", error);
      const errorMessage = error instanceof Error ? error.message : "Unbekannter Fehler";
      alert(`❌ Fehler beim Versenden der Signaturanfrage:\n\n${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddSigner();
    }
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
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerTitle}>
              <h2>📝 Zur Signatur senden</h2>
              <p className={styles.contractName}>{contractName}</p>
            </div>
            <button className={styles.closeBtn} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Content */}
          <div className={styles.content}>
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
                        <div className={styles.signerIcon}>
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

            {/* Message */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Nachricht (optional)</h3>
              <textarea
                className={styles.textarea}
                placeholder="Fügen Sie eine persönliche Nachricht hinzu..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {/* Footer */}
          <div className={styles.footer}>
            <button className={styles.cancelBtn} onClick={onClose}>
              Abbrechen
            </button>
            <button
              className={styles.sendBtn}
              onClick={handleSubmit}
              disabled={signers.length === 0 || isSubmitting}
            >
              <Send size={16} />
              {isSubmitting ? "Wird gesendet..." : "Zur Signatur senden"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
