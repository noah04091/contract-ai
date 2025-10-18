import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, User, Mail, CheckCircle, AlertCircle, Clock, Trash2, PenTool, Download } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { Document, Page, pdfjs } from "react-pdf";
import styles from "../styles/SignaturePage.module.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker from unpkg.com (now allowed in CSP)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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
  pdfUrl: string;
  expiresAt: string;
}

export default function SignaturePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [envelope, setEnvelope] = useState<EnvelopeData | null>(null);
  const [signer, setSigner] = useState<SignerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  const [sealedPdfUrl, setSealedPdfUrl] = useState<string | null>(null);

  const sigPadRef = useRef<SignatureCanvas>(null);

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

  const clearSignature = () => {
    sigPadRef.current?.clear();
  };

  const handleSubmit = async () => {
    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
      alert("Bitte zeichnen Sie Ihre Signatur");
      return;
    }

    if (!token) {
      alert("Kein Token vorhanden");
      return;
    }

    if (!signatureFields || signatureFields.length === 0) {
      alert("Keine Signatur-Felder gefunden. Bitte kontaktieren Sie den Absender.");
      return;
    }

    setIsSubmitting(true);

    try {
      console.log("📝 Submitting signature for token:", token);

      // Get signature as base64 PNG
      const signatureDataURL = sigPadRef.current.toDataURL("image/png");

      // Create signatures array with all fields
      const signatures = signatureFields.map(field => ({
        fieldId: field._id,
        value: signatureDataURL // Base64 PNG image
      }));

      console.log(`✅ Prepared ${signatures.length} signatures`);

      const response = await fetch(`/api/sign/${token}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          signatures
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Einreichen der Signatur");
      }

      console.log("✅ Signature submitted successfully:", data);

      // Save sealed PDF URL for download
      if (data.envelope?.sealedPdfUrl) {
        setSealedPdfUrl(data.envelope.sealedPdfUrl);
      }

      setSuccess(true);
    } catch (err) {
      console.error("❌ Error submitting signature:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      alert(`Fehler beim Einreichen der Signatur:\n\n${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    console.log(`📄 PDF loaded with ${numPages} pages`);
  }

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

          {/* Download Button for Sealed PDF */}
          {sealedPdfUrl && (
            <a
              href={sealedPdfUrl}
              download
              className={styles.downloadBtn}
            >
              <FileText size={20} />
              Signiertes Dokument herunterladen
            </a>
          )}
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

  // Main Signature View with PDF Preview
  return (
    <div className={styles.container}>
      <div className={styles.splitLayout}>
        {/* Left Side - PDF Preview */}
        <div className={styles.pdfSection}>
          <div className={styles.pdfHeader}>
            <div className={styles.pdfHeaderLeft}>
              <FileText size={24} />
              <h2>Dokument</h2>
            </div>
            {envelope.pdfUrl && (
              <a
                href={envelope.pdfUrl}
                download={envelope.title}
                className={styles.pdfDownloadBtn}
              >
                <Download size={18} />
                Download
              </a>
            )}
          </div>

          {envelope.pdfUrl ? (
            <div className={styles.pdfViewer}>
              <Document
                file={envelope.pdfUrl}
                onLoadSuccess={onDocumentLoadSuccess}
                loading={
                  <div className={styles.pdfLoading}>
                    <div className={styles.spinner}></div>
                    <p>PDF wird geladen...</p>
                  </div>
                }
                error={
                  <div className={styles.pdfError}>
                    <AlertCircle size={32} />
                    <p>PDF konnte nicht geladen werden</p>
                  </div>
                }
              >
                {Array.from(new Array(numPages), (_, index) => (
                  <Page
                    key={`page_${index + 1}`}
                    pageNumber={index + 1}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    width={Math.min(window.innerWidth * 0.45, 600)}
                  />
                ))}
              </Document>

              {numPages > 0 && (
                <div className={styles.pdfInfo}>
                  <p>{numPages} {numPages === 1 ? 'Seite' : 'Seiten'}</p>
                </div>
              )}
            </div>
          ) : (
            <div className={styles.pdfPlaceholder}>
              <FileText size={48} />
              <p>Keine PDF-Vorschau verfügbar</p>
            </div>
          )}
        </div>

        {/* Right Side - Signature Form */}
        <div className={styles.signatureSection}>
          <motion.div
            className={styles.signatureCard}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerIcon}>
                <PenTool size={32} />
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

            {/* Canvas Signature */}
            <div className={styles.canvasContainer}>
              <div className={styles.canvasHeader}>
                <h3 className={styles.sectionTitle}>Ihre Signatur</h3>
                <button
                  className={styles.clearBtn}
                  onClick={clearSignature}
                  type="button"
                >
                  <Trash2 size={16} />
                  Löschen
                </button>
              </div>
              <p className={styles.sectionSubtitle}>
                Zeichnen Sie Ihre Signatur mit Maus oder Finger
              </p>

              <div className={styles.canvasWrapper}>
                <SignatureCanvas
                  ref={sigPadRef}
                  canvasProps={{
                    className: styles.signatureCanvas
                  }}
                  backgroundColor="#ffffff"
                  penColor="#000000"
                  minWidth={1}
                  maxWidth={2.5}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={isSubmitting}
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
      </div>
    </div>
  );
}
