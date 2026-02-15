// 📝 EnhancedSignaturePage.tsx - DocuSign-Style Signature Experience
// Professional signature workflow with field-by-field completion

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FileText,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  HelpCircle,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2
} from "lucide-react";
import { Document, Page, pdfjs } from "react-pdf";
import SignatureFieldOverlay from "../components/SignatureFieldOverlay";
import FieldSidebar, { FieldState } from "../components/FieldSidebar";
import FieldInputModal from "../components/FieldInputModal";
import HelpModal from "../components/HelpModal";
import styles from "../styles/EnhancedSignaturePage.module.css";
import * as analytics from "../utils/signatureAnalytics";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ===== TYPES =====

interface SignerInfo {
  email: string;
  name: string;
  role: string;
  status: string;
}

interface SignatureField {
  _id: string;
  assigneeEmail: string;
  type: "signature" | "initials" | "initial" | "date" | "text" | "location";
  required: boolean;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  // Normalized coordinates (0-1 range)
  nx?: number;
  ny?: number;
  nwidth?: number;
  nheight?: number;
  label?: string;
}

interface EnvelopeData {
  _id: string;
  title: string;
  message: string;
  s3Key: string;
  pdfUrl: string;
  expiresAt: string;
}

// Removed - now using FieldState from FieldSidebar

// ===== MAIN COMPONENT =====

export default function EnhancedSignaturePage() {
  const { token } = useParams<{ token: string }>();

  // ===== STATE =====

  // Loading & Data
  const [loading, setLoading] = useState(true);
  const [envelope, setEnvelope] = useState<EnvelopeData | null>(null);
  const [signer, setSigner] = useState<SignerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [signatureFields, setSignatureFields] = useState<SignatureField[]>([]);

  // PDF
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pdfScale, setPdfScale] = useState<number>(1.0);
  const [pdfPageDimensions, setPdfPageDimensions] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [renderedPageWidth, setRenderedPageWidth] = useState<number>(0); // 🆕 Track actual rendered width for overlay scaling
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false); // 🆕 Fullscreen mode for mobile

  // Field Values & State
  const [fieldStates, setFieldStates] = useState<Record<string, FieldState>>({});
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [showInputModal, setShowInputModal] = useState(false);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [sealedPdfUrl, setSealedPdfUrl] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [successDetails, setSuccessDetails] = useState<string | null>(null);
  const [allSigned, setAllSigned] = useState<boolean>(false);

  // UI State
  const [showHelpModal, setShowHelpModal] = useState(false);

  // 🔄 Sequential Signing: Waiting for other signers
  const [waitingForSigners, setWaitingForSigners] = useState<Array<{ name: string; order: number }> | null>(null);

  // Refs
  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ===== COMPUTED VALUES =====

  // Sort fields by page, then by y, then by x (reading order)
  const sortedFields = [...signatureFields].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  // Field completion stats
  const totalFields = signatureFields.length;
  const completedFields = Object.values(fieldStates).filter(fs => fs.status === "completed").length;

  // Check if all required fields are valid
  const allRequiredFieldsValid = signatureFields
    .filter(f => f.required)
    .every(f => {
      const state = fieldStates[f._id];
      return state?.status === "completed" && !state?.error;
    });

  // Next/Previous field navigation
  const currentFieldIndex = activeFieldId
    ? sortedFields.findIndex(f => f._id === activeFieldId)
    : -1;

  // ===== EFFECTS =====

  // Load envelope data
  useEffect(() => {
    if (!token) {
      setError("Kein Token vorhanden");
      setLoading(false);
      return;
    }

    loadEnvelope();
  }, [token]);

  // Auto-save field values to sessionStorage every 5 seconds
  useEffect(() => {
    if (!token || Object.keys(fieldStates).length === 0) return;

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new timer
    autoSaveTimerRef.current = setTimeout(() => {
      saveToSessionStorage();
    }, 5000);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [fieldStates, token]);

  // Restore from sessionStorage on mount
  useEffect(() => {
    if (!token || signatureFields.length === 0) return;
    restoreFromSessionStorage();
  }, [token, signatureFields]);

  // Lock body scroll when modal is open (prevents background scrolling)
  useEffect(() => {
    if (showInputModal) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
  }, [showInputModal]);

  // ===== FUNCTIONS =====

  async function loadEnvelope() {
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

      // 🔄 SEQUENTIAL: Check if waiting for other signers
      if (data.waitingForSigners && Array.isArray(data.waitingForSigners) && data.waitingForSigners.length > 0) {
        setWaitingForSigners(data.waitingForSigners);
        console.log(`⏳ Sequential mode: Waiting for ${data.waitingForSigners.length} signer(s)`);
      }

      if (data.signatureFields && Array.isArray(data.signatureFields)) {
        setSignatureFields(data.signatureFields);
        console.log(`✅ Loaded ${data.signatureFields.length} signature fields for signer`);

        // Analytics: Track UI open
        analytics.trackSignUIOpen(data.envelope._id, data.signatureFields.length);
      }
    } catch (err) {
      console.error("❌ Error loading envelope:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  /**
   * Generate a simple hash from the PDF URL or s3Key
   * This ensures session data is only valid for the same document
   */
  function getDocHash(): string {
    if (!envelope) return "";
    const source = envelope.s3Key || envelope.pdfUrl || envelope._id;
    // Simple hash using string charCode sum
    return source.split("").reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0).toString(36);
  }

  function saveToSessionStorage() {
    if (!token || !envelope) return;

    const storageKey = `sign-session:${token}`;
    const completedCount = Object.values(fieldStates).filter(fs => fs.status === "completed").length;
    const dataToSave = {
      fieldStates,
      version: 1,
      savedAt: Date.now(),
      docHash: getDocHash() // Security: Invalidate if document changes
    };

    sessionStorage.setItem(storageKey, JSON.stringify(dataToSave));
    console.log(`💾 Auto-saved ${Object.keys(fieldStates).length} field states to sessionStorage`);

    // Analytics: Track auto-save
    analytics.trackAutoSave(envelope._id, completedCount);
  }

  function restoreFromSessionStorage() {
    if (!token || !envelope) return;

    const storageKey = `sign-session:${token}`;
    const savedData = sessionStorage.getItem(storageKey);

    if (!savedData) return;

    try {
      const parsed = JSON.parse(savedData);

      // Check version compatibility
      if (parsed.version !== 1) {
        console.warn("⚠️ Incompatible session version, ignoring saved data");
        sessionStorage.removeItem(storageKey);
        return;
      }

      // Security: Check if doc hash matches
      const currentDocHash = getDocHash();
      if (parsed.docHash && parsed.docHash !== currentDocHash) {
        console.warn("⚠️ Document hash mismatch, ignoring saved session data (possible document change)");
        sessionStorage.removeItem(storageKey);
        return;
      }

      const restoredCount = Object.keys(parsed.fieldStates || {}).length;
      setFieldStates(parsed.fieldStates || {});
      console.log(`✅ Restored ${restoredCount} field states from sessionStorage`);

      // Analytics: Track session restore
      analytics.trackSessionRestored(envelope._id, restoredCount);
    } catch (err) {
      console.error("❌ Failed to restore from sessionStorage:", err);
      sessionStorage.removeItem(storageKey);
    }
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    console.log(`📄 PDF loaded with ${numPages} pages`);
  }

  function onPageLoadSuccess(page: { width: number; originalWidth: number; originalHeight: number }) {
    // Store page dimensions for field overlay calculations
    const { width, originalWidth, originalHeight } = page;
    setPdfPageDimensions({ width: originalWidth, height: originalHeight });

    // 🆕 FIX 3: Track actual rendered width (not just scale prop)
    // The Page component might render at a different width than originalWidth * scale
    // due to the width prop constraint
    setRenderedPageWidth(width);

    console.log(`📏 Page dimensions: ${originalWidth}x${originalHeight}, rendered width: ${width}`);
  }

  // Update field value (defined first to avoid hoisting issues)
  const handleFieldValueUpdate = useCallback((fieldId: string, value: string, status: "completed" | "invalid", error?: string) => {
    setFieldStates(prev => ({
      ...prev,
      [fieldId]: {
        value,
        status,
        error: error || null,
        updatedAt: Date.now()
      }
    }));
  }, []);

  const handleFieldClick = useCallback((fieldId: string) => {
    const field = signatureFields.find(f => f._id === fieldId);
    if (!field || !envelope) return;

    setActiveFieldId(fieldId);
    setShowInputModal(true);

    console.log(`🖱️ Clicked field: ${fieldId} (${field.type})`);

    // Analytics: Track field focus
    analytics.trackFieldFocus(envelope._id, fieldId, field.type, field.required);
  }, [signatureFields, envelope]);

  const handleFieldInputClose = useCallback(() => {
    setShowInputModal(false);
    setActiveFieldId(null);
  }, []);

  // Helper: Wait for overlay to render, then scroll to it (with retry logic)
  const scrollToOverlayWhenReady = useCallback(async (fieldId: string, maxWait = 2000, openModal: boolean = true): Promise<boolean> => {
    const start = performance.now();

    while (performance.now() - start < maxWait) {
      const el = pdfContainerRef.current?.querySelector(
        `[data-overlay-id="${fieldId}"]`
      ) as HTMLElement | null;

      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("scrollPulse");
        setTimeout(() => el.classList.remove("scrollPulse"), 600);

        // Only open modal if requested
        if (openModal) {
          setShowInputModal(true);
        }

        console.log(`🎯 Scrolled to field: ${fieldId}, openModal: ${openModal}`);
        return true;
      }

      // Wait 80ms before retry
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    console.warn(`⚠️ Overlay target not found in time: ${fieldId}`);
    return false;
  }, []);

  // Jump to field (scroll + focus + optionally open modal)
  const handleJumpToField = useCallback((fieldId: string, openModal: boolean = true) => {
    const field = signatureFields.find(f => f._id === fieldId);
    if (!field) return;

    // Set as active (only if opening modal)
    if (openModal) {
      setActiveFieldId(fieldId);
    }

    // Check if field overlay is already rendered (same page)
    const overlayEl = pdfContainerRef.current?.querySelector(
      `[data-overlay-id="${fieldId}"]`
    ) as HTMLElement | null;

    // If already on screen → scroll to it immediately
    if (overlayEl) {
      overlayEl.scrollIntoView({ behavior: "smooth", block: "center" });
      overlayEl.classList.add("scrollPulse");
      setTimeout(() => overlayEl.classList.remove("scrollPulse"), 600);

      // Only open modal if requested
      if (openModal) {
        setShowInputModal(true);
      }

      console.log(`🎯 Jumped to field (same page): ${fieldId}, openModal: ${openModal}`);
      return;
    }

    // If on different page → change page first, then scroll with retry
    if (field.page !== currentPage) {
      setCurrentPage(field.page);
    }

    // Wait for page render with retry logic
    scrollToOverlayWhenReady(fieldId, 2000, openModal);
  }, [signatureFields, currentPage, scrollToOverlayWhenReady]);

  // Previous field navigation
  const handlePreviousField = useCallback(() => {
    if (currentFieldIndex <= 0) {
      console.log("⚠️ Already at first field");
      return;
    }

    const prevField = sortedFields[currentFieldIndex - 1];
    if (prevField) {
      handleJumpToField(prevField._id);
    }
  }, [currentFieldIndex, sortedFields, handleJumpToField]);

  // Smart "Next Field" navigation
  const handleNextField = useCallback(() => {
    if (!envelope) return;

    // Priority: required fields first, then optional
    // Skip completed fields
    // Sort by: page → y → x

    // Separate required and optional fields
    const requiredFields = sortedFields.filter(f => f.required);
    const optionalFields = sortedFields.filter(f => !f.required);

    // Find next incomplete required field
    const nextRequired = requiredFields.find(f => {
      const state = fieldStates[f._id];
      return !state || state.status !== "completed";
    });

    if (nextRequired) {
      handleJumpToField(nextRequired._id, false); // Don't auto-open modal for auto-navigation
      // Analytics: Track next field navigation
      analytics.trackNextField(envelope._id);
      return;
    }

    // All required done → find next incomplete optional
    const nextOptional = optionalFields.find(f => {
      const state = fieldStates[f._id];
      return !state || state.status !== "completed";
    });

    if (nextOptional) {
      handleJumpToField(nextOptional._id, false); // Don't auto-open modal for auto-navigation
      // Analytics: Track next field navigation
      analytics.trackNextField(envelope._id);
      return;
    }

    // All fields completed
    console.log("✅ All fields completed!");
  }, [envelope, sortedFields, fieldStates, handleJumpToField]);

  // Handle field input confirmation (defined after handleNextField to avoid hoisting)
  const handleFieldInputConfirm = useCallback((value: string) => {
    if (!activeFieldId || !envelope) return;

    const field = signatureFields.find(f => f._id === activeFieldId);

    // Update field state with completed status
    handleFieldValueUpdate(activeFieldId, value, "completed");

    // Close modal
    setShowInputModal(false);
    setActiveFieldId(null);

    console.log(`✅ Field completed: ${activeFieldId}`);

    // Analytics: Track field completion
    const newCompletedCount = Object.values(fieldStates).filter(fs => fs.status === "completed").length + 1;
    if (field) {
      analytics.trackFieldCompleted(envelope._id, activeFieldId, field.type, newCompletedCount, signatureFields.length);
    }

    // Auto-navigate to next field
    setTimeout(() => {
      handleNextField();
    }, 300);
  }, [activeFieldId, envelope, signatureFields, fieldStates, handleFieldValueUpdate, handleNextField]);

  // Keyboard shortcuts (moved here to avoid hoisting issues)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        return;
      }

      // Ctrl/Cmd+S: Manual save
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveToSessionStorage();
        console.log("💾 Manual save triggered");
        return;
      }

      // Arrow Right / N: Next field
      if (e.key === "ArrowRight" || e.key === "n" || e.key === "N") {
        e.preventDefault();
        handleNextField();
        return;
      }

      // Arrow Left / P: Previous field
      if (e.key === "ArrowLeft" || e.key === "p" || e.key === "P") {
        e.preventDefault();
        handlePreviousField();
        return;
      }

      // Arrow Down: Next page
      if (e.key === "ArrowDown" && currentPage < numPages) {
        e.preventDefault();
        setCurrentPage(prev => Math.min(prev + 1, numPages));
        return;
      }

      // Arrow Up: Previous page
      if (e.key === "ArrowUp" && currentPage > 1) {
        e.preventDefault();
        setCurrentPage(prev => Math.max(prev - 1, 1));
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentPage, numPages, handleNextField, handlePreviousField]);

  async function handleSubmit() {
    // ✅ Double-submit prevention: exit immediately if already submitting
    if (isSubmitting) return;

    if (!allRequiredFieldsValid) {
      alert("Bitte füllen Sie alle Pflichtfelder aus.");
      return;
    }

    if (!token || !envelope) {
      alert("Kein Token vorhanden");
      return;
    }

    // Analytics: Track finish attempt
    analytics.trackFinishAttempt(envelope._id, completedFields, totalFields);

    setIsSubmitting(true);

    try {
      console.log("📝 Submitting signature for token:", token);

      // Prepare signatures array from fieldStates
      const signatures = Object.entries(fieldStates)
        .filter(([, state]) => state.value)
        .map(([fieldId, state]) => ({
          fieldId,
          value: state.value!
        }));

      console.log(`✅ Prepared ${signatures.length} signatures`);

      const response = await fetch(`/api/sign/${token}/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ signatures })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fehler beim Einreichen der Signatur");
      }

      console.log("✅ Signature submitted successfully:", data);

      // Analytics: Track finish success
      analytics.trackFinishSuccess(envelope._id);

      // Save success data
      if (data.message) setSuccessMessage(data.message);
      if (data.details) setSuccessDetails(data.details);
      if (data.envelope?.sealedPdfUrl) setSealedPdfUrl(data.envelope.sealedPdfUrl);
      if (data.envelope?.allSigned !== undefined) setAllSigned(data.envelope.allSigned);

      // Clear sessionStorage
      if (token) {
        sessionStorage.removeItem(`sign-session:${token}`);
        console.log("✅ Cleared signature backup from sessionStorage");
      }

      setSuccess(true);
    } catch (err) {
      console.error("❌ Error submitting signature:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";

      // Analytics: Track finish error
      analytics.trackFinishError(envelope._id, errorMessage);

      alert(`Fehler beim Einreichen der Signatur:\n\n${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  // 🆕 PDF Zoom Functions
  const handleZoomIn = useCallback(() => {
    setPdfScale(prev => Math.min(prev + 0.25, 2.5));
  }, []);

  const handleZoomOut = useCallback(() => {
    setPdfScale(prev => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setPdfScale(1.0);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // 🆕 Download original PDF
  const handleDownloadPdf = useCallback(() => {
    if (!envelope?.pdfUrl) return;

    const link = document.createElement('a');
    link.href = envelope.pdfUrl;
    link.download = `${envelope.title || 'dokument'}.pdf`;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [envelope]);

  async function handleDecline() {
    // ✅ Double-submit prevention: exit immediately if already submitting
    if (isSubmitting) return;

    if (!token) {
      alert("Kein Token vorhanden");
      return;
    }

    const reason = prompt("Warum lehnen Sie die Signaturanfrage ab? (Optional)");

    // User cancelled prompt
    if (reason === null) return;

    setIsSubmitting(true);

    try {
      console.log("❌ Declining signature for token:", token);

      const response = await fetch(`/api/sign/${token}/decline`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ reason: reason || undefined })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Fehler beim Ablehnen der Signatur");
      }

      console.log("✅ Signature declined successfully:", data);
      setDeclined(true);
    } catch (err) {
      console.error("❌ Error declining signature:", err);
      const errorMessage = err instanceof Error ? err.message : "Unbekannter Fehler";
      alert(`Fehler beim Ablehnen der Signatur:\n\n${errorMessage}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  // ===== RENDER: LOADING STATE =====

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loader} style={{ marginTop: '50px' }}>
          <div className={styles.spinner}></div>
          <p>Lade Signaturanfrage...</p>
        </div>
      </div>
    );
  }

  // ===== RENDER: ERROR STATE =====

  if (error || !envelope) {
    return (
      <div className={styles.container}>
        <div className={styles.errorCard} style={{ marginTop: '50px' }}>
          <AlertCircle size={48} className={styles.errorIcon} />
          <h2>Fehler beim Laden</h2>
          <p>{error || "Signaturanfrage konnte nicht geladen werden"}</p>
        </div>
      </div>
    );
  }

  // ===== RENDER: SUCCESS STATE =====

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
          <h2>{successMessage || "Erfolgreich signiert!"}</h2>
          <p>Ihre Signatur wurde erfolgreich eingereicht.</p>
          {successDetails && (
            <p className={styles.successSubtext}>{successDetails}</p>
          )}

          {sealedPdfUrl && (
            <a href={sealedPdfUrl} download className={styles.downloadBtn}>
              <Download size={20} />
              {allSigned
                ? "Vollständig signiertes Dokument herunterladen"
                : "Dokument mit Ihrer Signatur herunterladen"}
            </a>
          )}
        </motion.div>
      </div>
    );
  }

  // ===== RENDER: DECLINED STATE =====

  if (declined) {
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.infoCard}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <AlertCircle size={64} className={styles.errorIcon} />
          <h2>Signatur abgelehnt</h2>
          <p>Sie haben die Signaturanfrage abgelehnt.</p>
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

  // 🔄 SEQUENTIAL: Check if waiting for other signers
  if (waitingForSigners && waitingForSigners.length > 0) {
    return (
      <div className={styles.container}>
        <motion.div
          className={styles.infoCard}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Clock size={64} className={styles.infoIcon} />
          <h2>Sie sind noch nicht an der Reihe</h2>
          <p style={{ marginBottom: '1rem' }}>
            Dieses Dokument wird nacheinander unterschrieben.
          </p>
          <div style={{
            background: '#f8fafc',
            borderRadius: '8px',
            padding: '1rem',
            marginTop: '1rem',
            textAlign: 'left'
          }}>
            <p style={{ fontWeight: 500, marginBottom: '0.5rem' }}>
              Warten auf:
            </p>
            <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
              {waitingForSigners.map((ws, idx) => (
                <li key={idx} style={{ marginBottom: '0.25rem' }}>
                  {ws.name}
                </li>
              ))}
            </ul>
          </div>
          <p style={{ marginTop: '1.5rem', color: '#64748b', fontSize: '0.9rem' }}>
            Sie erhalten eine E-Mail, sobald Sie unterschreiben können.
          </p>
        </motion.div>
      </div>
    );
  }

  // Check if expired (with proper validation for invalid/missing dates)
  const expiresAtDate = envelope.expiresAt ? new Date(envelope.expiresAt) : null;
  const isExpired = expiresAtDate && !isNaN(expiresAtDate.getTime()) && new Date() > expiresAtDate;
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

  // ===== RENDER: MAIN SIGNATURE VIEW =====

  return (
    <div className={styles.container}>
      {/* Sticky Header */}
      <header className={styles.header} role="banner" style={{ marginTop: '40px' }}>
        <div className={styles.headerLeft}>
          <FileText size={24} aria-hidden="true" />
          <div className={styles.headerInfo}>
            <h1 className={styles.headerTitle}>{envelope.title}</h1>
            <p className={styles.headerSubtitle}>
              {signer?.name} • {completedFields}/{totalFields} Felder ausgefüllt
            </p>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button
            className={styles.helpButton}
            onClick={() => {
              setShowHelpModal(true);
              // Analytics: Track help opened
              if (envelope) analytics.trackHelpOpened(envelope._id);
            }}
            aria-label="Hilfe zur Signatur anzeigen"
          >
            <HelpCircle size={20} aria-hidden="true" />
            Hilfe
          </button>

          <button
            className={styles.declineButton}
            onClick={handleDecline}
            disabled={isSubmitting}
            aria-label="Signaturanfrage ablehnen"
          >
            <X size={20} aria-hidden="true" />
            Ablehnen
          </button>

          <button
            className={styles.submitButton}
            onClick={handleSubmit}
            disabled={!allRequiredFieldsValid || isSubmitting}
            aria-label={
              !allRequiredFieldsValid
                ? "Füllen Sie alle Pflichtfelder aus um fortzufahren"
                : "Dokument mit allen Signaturen einreichen"
            }
          >
            <CheckCircle size={20} aria-hidden="true" />
            {isSubmitting ? "Wird eingereicht..." : "Fertigstellen"}
          </button>
        </div>
      </header>

      {/* Main Split Layout */}
      <main className={`${styles.splitLayout} ${isFullscreen ? styles.fullscreenMode : ''}`} role="main" aria-label="Dokument und Feldübersicht">
        {/* PDF Viewer (Left) */}
        <section className={`${styles.pdfSection} ${isFullscreen ? styles.pdfSectionFullscreen : ''}`} ref={pdfContainerRef} aria-label="PDF-Dokument mit Signaturfeldern">
          {/* 🆕 PDF Toolbar */}
          <div className={styles.pdfToolbar}>
            <div className={styles.toolbarLeft}>
              <span className={styles.pageInfo}>
                Seite {currentPage} von {numPages || '...'}
              </span>
            </div>

            <div className={styles.toolbarCenter}>
              <button
                className={styles.toolbarBtn}
                onClick={handleZoomOut}
                disabled={pdfScale <= 0.5}
                title="Verkleinern"
                aria-label="PDF verkleinern"
              >
                <ZoomOut size={18} />
              </button>
              <span className={styles.zoomLevel}>{Math.round(pdfScale * 100)}%</span>
              <button
                className={styles.toolbarBtn}
                onClick={handleZoomIn}
                disabled={pdfScale >= 2.5}
                title="Vergrößern"
                aria-label="PDF vergrößern"
              >
                <ZoomIn size={18} />
              </button>
              <button
                className={styles.toolbarBtn}
                onClick={handleZoomReset}
                title="Zoom zurücksetzen"
                aria-label="Zoom auf 100% zurücksetzen"
              >
                <RotateCcw size={18} />
              </button>
            </div>

            <div className={styles.toolbarRight}>
              <button
                className={styles.toolbarBtn}
                onClick={handleDownloadPdf}
                title="PDF herunterladen"
                aria-label="Original-PDF herunterladen"
              >
                <Download size={18} />
              </button>
              <button
                className={styles.toolbarBtn}
                onClick={toggleFullscreen}
                title={isFullscreen ? "Vollbild beenden" : "Vollbild"}
                aria-label={isFullscreen ? "Vollbildmodus beenden" : "Vollbildmodus aktivieren"}
              >
                {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </button>
            </div>
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
                {Array.from(new Array(numPages), (_, index) => {
                  const pageNumber = index + 1;
                  return (
                    <div
                      key={`page_${pageNumber}`}
                      className={styles.pageContainer}
                      data-page-number={pageNumber}
                    >
                      <Page
                        pageNumber={pageNumber}
                        renderTextLayer={true}
                        renderAnnotationLayer={false}
                        width={isFullscreen
                          ? Math.min(window.innerWidth * 0.9, 1200) * pdfScale
                          : Math.min(window.innerWidth * (window.innerWidth <= 768 ? 0.95 : 0.55), 800) * pdfScale
                        }
                        onLoadSuccess={onPageLoadSuccess}
                      />

                      {/* Signature Field Overlays */}
                      {pdfPageDimensions.width > 0 && renderedPageWidth > 0 && (
                        <SignatureFieldOverlay
                          fields={signatureFields}
                          currentPage={pageNumber}
                          fieldStates={fieldStates}
                          activeFieldId={activeFieldId}
                          pageWidth={pdfPageDimensions.width}
                          pageHeight={pdfPageDimensions.height}
                          scale={renderedPageWidth / pdfPageDimensions.width}
                          onFieldClick={handleFieldClick}
                        />
                      )}
                    </div>
                  );
                })}
              </Document>
            </div>
          ) : (
            <div className={styles.pdfPlaceholder}>
              <FileText size={48} />
              <p>Keine PDF-Vorschau verfügbar</p>
            </div>
          )}
        </section>

        {/* Sidebar (Right) */}
        <aside className={styles.sidebar} aria-label="Feld-Navigation und Fortschritt">
          <FieldSidebar
            fields={signatureFields}
            fieldStates={fieldStates}
            activeFieldId={activeFieldId}
            currentPage={currentPage}
            onJumpToField={handleJumpToField}
            onNextField={handleNextField}
            onFinish={handleSubmit}
            canFinish={allRequiredFieldsValid && !isSubmitting}
          />
        </aside>
      </main>

      {/* Field Input Modal */}
      <FieldInputModal
        isOpen={showInputModal}
        field={activeFieldId ? signatureFields.find(f => f._id === activeFieldId) || null : null}
        initialValue={activeFieldId ? fieldStates[activeFieldId]?.value : undefined}
        onClose={handleFieldInputClose}
        onConfirm={handleFieldInputConfirm}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
}
