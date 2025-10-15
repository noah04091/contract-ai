import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, User, Mail, CheckCircle, AlertCircle, Clock } from "lucide-react";
import styles from "../styles/SignaturePage.module.css";

interface SignerInfo {
  email: string;
  name: string;
  role: string;
  status: string;
}

interface SignatureField {
  _id: string;
  assigneeEmail: string;
  type: string;
  required: boolean;
}

interface EnvelopeData {
  _id: string;
  title: string;
  message: string;
  s3Key: string;
  expiresAt: string;
}

export default function SignaturePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [envelope, setEnvelope] = useState<EnvelopeData | null>(null);
  const [signer, setSigner] = useState<SignerInfo | null>(null); // ✉️ FIX: Separate signer state
  const [error, setError] = useState<string | null>(null);
  const [signatureData, setSignatureData] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]); // ✉️ NEU: Signatur-Felder State

  // Load envelope data
  useEffect(() => {
    if (!token) {
      setError("Kein Token vorhanden");
      setLoading(false);
      return;
    }

    const loadEnvelope = async () => {
      try {
        console.log("📥 Loading envelope with token:", token);

        const response = await fetch(`/api/sign/${token}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json"
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Fehler beim Laden der Signaturanfrage");
        }

        console.log("✅ Envelope loaded:", data);

        // ✉️ FIX: Separate envelope, signer, signatureFields
        setEnvelope(data.envelope);
        setSigner(data.signer);

        if (data.signatureFields && Array.isArray(data.signatureFields)) {
          setSignatureFields(data.signatureFields);
          console.log(`✅ Loaded ${data.signatureFields.length} signature fields for signer`);
        }
      } catch (err) {
        console.error("❌ Error loading envelope:", err);
        const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadEnvelope();
  }, [token]);

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignatureData(e.target.value);
  };

  const handleSubmit = async () => {
    if (!signatureData.trim()) {
      alert("Bitte geben Sie Ihren Namen als Signatur ein");
      return;
    }

    if (!token) {
      alert("Kein Token vorhanden");
      return;
    }

    // ✉️ Prüfe ob Signatur-Felder vorhanden sind
    if (!signatureFields || signatureFields.length === 0) {
      alert("Keine Signatur-Felder gefunden. Bitte kontaktieren Sie den Absender.");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("📝 Submitting signature for token:", token);

      // ✉️ NEU: Erstelle signatures Array mit allen Feldern
      const signatures = signatureFields.map(field => ({
        fieldId: field._id,
        value: signatureData // Base64 oder Text-Signatur
      }));

      console.log(`✅ Prepared ${signatures.length} signatures:`, signatures);

      const response = await fetch(`/api/sign/${token}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          signatures // ✉️ NEU: Korrektes Format
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Einreichen der Signatur");
      }

      console.log("✅ Signature submitted successfully:", data);
      setSuccess(true);
    } catch (err) {
      console.error("❌ Error submitting signature:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      alert(`Fehler beim Einreichen der Signatur:\n\n${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loader}>
          <div className={styles.spinner}></div>
          <p>Lade Signaturanfrage...</p>
        </div>
      </div>
    );
  }

  // Error State
  if (error || !envelope) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h2>Fehler beim Laden</h2>
          <p>{error || "Signaturanfrage konnte nicht geladen werden"}</p>
        </div>
      </div>
    );
  }

  // Success State
  if (success) {
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.successCard}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <CheckCircle size={64} className={styles.successIcon} />
          <h2>Erfolgreich signiert!</h2>
          <p>Ihre Signatur wurde erfolgreich eingereicht.</p>
          <p className={styles.successSubtext}>
            Der Vertragsinhaber wurde benachrichtigt.
          </p>
        </motion.div>
      </div>
    );
  }

  // Check if already signed
  if (signer && signer.status === "SIGNED") {
    return (
      <div className={styles.container}>
        <div className={styles.infoCard}>
          <CheckCircle size={48} className={styles.infoIcon} />
          <h2>Bereits signiert</h2>
          <p>Sie haben dieses Dokument bereits signiert.</p>
        </div>
      </div>
    );
  }

  // Check if expired
  const isExpired = new Date() > new Date(envelope.expiresAt);
  if (isExpired) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard}>
          <Clock size={48} className={styles.errorIcon} />
          <h2>Abgelaufen</h2>
          <p>Diese Signaturanfrage ist abgelaufen.</p>
        </div>
      </div>
    );
  }

  // Main Signature View
  return (
    <div className={styles.container}>
      <motion.div
        className={styles.card}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerIcon}>
            <FileText size={32} />
          </div>
          <h1 className={styles.title}>Signaturanfrage</h1>
          <p className={styles.subtitle}>{envelope.title}</p>
        </div>

        {/* Message */}
        {envelope.message && (
          <div className={styles.message}>
            <p>{envelope.message}</p>
          </div>
        )}

        {/* Signer Info */}
        {signer && (
          <div className={styles.signerInfo}>
            <div className={styles.infoRow}>
              <User size={18} />
              <span>{signer.name}</span>
            </div>
            <div className={styles.infoRow}>
              <Mail size={18} />
              <span>{signer.email}</span>
            </div>
          </div>
        )}

        {/* Signature Input */}
        <div className={styles.signatureSection}>
          <h3 className={styles.sectionTitle}>Ihre Signatur</h3>
          <p className={styles.sectionSubtitle}>
            Geben Sie Ihren vollständigen Namen ein
          </p>
          <input
            type="text"
            className={styles.signatureInput}
            placeholder="Max Mustermann"
            value={signatureData}
            onChange={handleSignatureChange}
            disabled={isSubmitting}
          />
          <div className={styles.signaturePreview}>
            <span className={styles.previewLabel}>Vorschau:</span>
            <div className={styles.previewSignature}>
              {signatureData || "Ihre Signatur erscheint hier"}
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={!signatureData.trim() || isSubmitting}
        >
          {isSubmitting ? "Wird eingereicht..." : "Jetzt signieren"}
        </button>

        {/* Footer */}
        <div className={styles.footer}>
          <p className={styles.footerText}>
            Durch das Signieren bestätigen Sie die Richtigkeit Ihrer Angaben.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
