import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Mail, User, Trash2, Send, Users } from "lucide-react";
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

type SignatureMode = "RECIPIENT_ONLY" | "BOTH_PARTIES";
type SigningOrder = "SENDER_FIRST" | "RECIPIENT_FIRST";

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

  // 🆕 Multi-Signer Settings
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("RECIPIENT_ONLY");
  const [signingOrder, setSigningOrder] = useState<SigningOrder>("RECIPIENT_FIRST");
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

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

    if (signatureMode === "BOTH_PARTIES" && !currentUser) {
      alert("Benutzerdaten konnten nicht geladen werden");
      return;
    }

    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      // 🆕 Build final signers array with roles and order
      let finalSigners: Array<{
        email: string;
        name: string;
        role: string;
        order: number;
      }> = [];

      if (signatureMode === "BOTH_PARTIES" && currentUser) {
        // Beide Seiten signieren
        if (signingOrder === "SENDER_FIRST") {
          // Owner signiert zuerst (order: 1), dann Recipients (order: 2+)
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
          // Recipients signieren zuerst (order: 1+), dann Owner (order: last)
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
        // Nur Recipients signieren (default behavior)
        finalSigners = signers.map((signer, index) => ({
          email: signer.email,
          name: signer.name,
          role: "recipient",
          order: index + 1
        }));
      }

      console.log("📤 Creating envelope for signature:", {
        contractId,
        contractName,
        signatureMode,
        signingOrder,
        finalSigners,
        message
      });

      // ✉️ Erstelle Signaturfelder (ein Feld pro Signer auf letzter Seite)
      const signatureFields = finalSigners.map((signer, index) => ({
        assigneeEmail: signer.email,
        type: "signature",
        required: true,
        page: 1, // 🔧 FIX: PDF-Seiten beginnen bei 1 (nicht 0)
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
          signingMode: signatureMode === "BOTH_PARTIES" ? "SEQUENTIAL" : "SINGLE",
          signers: finalSigners,
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
            {/* 🆕 Signature Settings */}
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
