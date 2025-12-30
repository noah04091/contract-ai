// 📝 NewSignatureRequest.tsx - Neue Signaturanfrage erstellen
// Ermöglicht PDF-Upload und Signer-Konfiguration ohne bestehenden Vertrag

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Plus,
  Mail,
  User,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Users,
  AlertCircle,
  CheckCircle,
  Loader,
  PenTool,
  Send,
  Shield,
  FolderOpen,
  X
} from "lucide-react";
import styles from "../styles/NewSignatureRequest.module.css";

interface Signer {
  email: string;
  name: string;
}

interface TemplateField {
  page: number;
  nx: number;
  ny: number;
  nwidth: number;
  nheight: number;
  type: string;
  assigneeRole: string;
}

interface Template {
  _id: string;
  name: string;
  description?: string;
  signerRoles: Array<{ role: string; label: string }>;
  fields: TemplateField[];
  createdAt: string;
}

type SignatureMode = "RECIPIENT_ONLY" | "BOTH_PARTIES";
type SigningOrder = "SENDER_FIRST" | "RECIPIENT_FIRST";
type SigningMode = "PARALLEL" | "SEQUENTIAL"; // Backend: alle gleichzeitig oder nacheinander

export default function NewSignatureRequest() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // State
  const [step, setStep] = useState<1 | 2>(1); // 1 = Upload, 2 = Signers
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [signers, setSigners] = useState<Signer[]>([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Multi-Signer Settings
  const [signatureMode, setSignatureMode] = useState<SignatureMode>("RECIPIENT_ONLY");
  const [signingOrder, setSigningOrder] = useState<SigningOrder>("RECIPIENT_FIRST");
  const [signingMode, setSigningMode] = useState<SigningMode>("PARALLEL"); // Sequential or Parallel signing
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string } | null>(null);

  // Templates
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

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

    loadUserInfo();
  }, []);

  // Load templates
  const loadTemplates = async () => {
    setLoadingTemplates(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/envelope-templates", {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include"
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates || []);
      }
    } catch (err) {
      console.error("Failed to load templates:", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // Load templates when modal opens
  useEffect(() => {
    if (showTemplateModal && templates.length === 0) {
      loadTemplates();
    }
  }, [showTemplateModal]);

  // Apply template to current envelope
  const applyTemplate = (template: Template) => {
    setSelectedTemplate(template);

    // Reset signers based on template roles
    const newSigners: Signer[] = template.signerRoles.map(role => ({
      email: "",
      name: role.label || role.role
    }));

    // Only keep first signer as placeholder with role name
    if (newSigners.length > 0) {
      setSigners([]);
    }

    setShowTemplateModal(false);

    // Show info about template
    alert(`Vorlage "${template.name}" ausgewählt!\n\nBenötigte Unterzeichner:\n${template.signerRoles.map((r, i) => `${i + 1}. ${r.label || r.role}`).join("\n")}\n\nBitte fügen Sie die entsprechenden Unterzeichner hinzu.`);
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate PDF
    if (selectedFile.type !== "application/pdf") {
      setError("Bitte nur PDF-Dateien hochladen");
      return;
    }

    // Max 25MB
    if (selectedFile.size > 25 * 1024 * 1024) {
      setError("Datei ist zu groß (max. 25MB)");
      return;
    }

    setFile(selectedFile);
    setTitle(selectedFile.name.replace(/\.pdf$/i, ""));
    setError(null);
  };

  // Handle drag & drop
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];

    if (droppedFile?.type === "application/pdf") {
      if (droppedFile.size > 25 * 1024 * 1024) {
        setError("Datei ist zu groß (max. 25MB)");
        return;
      }
      setFile(droppedFile);
      setTitle(droppedFile.name.replace(/\.pdf$/i, ""));
      setError(null);
    } else {
      setError("Bitte nur PDF-Dateien hochladen");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  // Add signer
  const handleAddSigner = () => {
    if (!currentEmail || !currentName) {
      setError("Bitte E-Mail und Name eingeben");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(currentEmail)) {
      setError("Bitte gültige E-Mail-Adresse eingeben");
      return;
    }

    if (signers.some(s => s.email.toLowerCase() === currentEmail.toLowerCase())) {
      setError("Diese E-Mail-Adresse wurde bereits hinzugefügt");
      return;
    }

    // Normalize email to lowercase before storing
    setSigners([...signers, { email: currentEmail.toLowerCase().trim(), name: currentName.trim() }]);
    setCurrentEmail("");
    setCurrentName("");
    setError(null);
  };

  const handleRemoveSigner = (index: number) => {
    setSigners(signers.filter((_, i) => i !== index));
  };

  // Submit and create envelope
  const handleSubmit = async () => {
    if (!file || signers.length === 0) {
      setError("Bitte PDF hochladen und mindestens einen Unterzeichner hinzufügen");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");

      // Step 1: Upload PDF using FormData (existing /api/upload endpoint)
      console.log("📤 Uploading PDF...");

      const formData = new FormData();
      formData.append("file", file);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        credentials: "include",
        body: formData
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json();
        throw new Error(errorData.message || "Fehler beim Hochladen der Datei");
      }

      const uploadData = await uploadRes.json();
      const s3Key = uploadData.contract?.s3Key || uploadData.s3Key;
      const contractId = uploadData.contract?._id || uploadData.contractId;

      if (!s3Key) {
        throw new Error("Keine S3-Key in der Antwort erhalten");
      }

      console.log("✅ PDF uploaded:", s3Key);
      console.log("📋 Contract ID:", contractId);

      // Step 2: Build signers array with order
      const allSigners = [];
      let order = 1;

      if (signatureMode === "BOTH_PARTIES" && currentUser) {
        if (signingOrder === "SENDER_FIRST") {
          allSigners.push({
            email: currentUser.email,
            name: currentUser.name,
            role: "sender",
            order: order++
          });
        }
      }

      // Add external signers
      signers.forEach((signer) => {
        allSigners.push({
          email: signer.email,
          name: signer.name,
          role: "signer",
          order: order++
        });
      });

      if (signatureMode === "BOTH_PARTIES" && currentUser) {
        if (signingOrder === "RECIPIENT_FIRST") {
          allSigners.push({
            email: currentUser.email,
            name: currentUser.name,
            role: "sender",
            order: order++
          });
        }
      }

      // Step 3: Create envelope
      console.log("📧 Creating envelope...");

      const envelopeRes = await fetch("/api/envelopes", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          title: title || file.name,
          message: message || `Bitte unterschreiben Sie das Dokument "${title || file.name}"`,
          s3Key,
          contractId, // Link envelope to contract for Signierprozess tab
          signers: allSigners,
          signatureFields: [], // Will be added in next step
          signingMode: signers.length > 1 ? signingMode : "PARALLEL" // Only relevant for multiple signers
        })
      });

      if (!envelopeRes.ok) {
        const errorData = await envelopeRes.json();
        throw new Error(errorData.error || "Fehler beim Erstellen der Signaturanfrage");
      }

      const { envelope } = await envelopeRes.json();
      console.log("✅ Envelope created:", envelope._id);

      // Navigate to field placement
      navigate(`/signature/place-fields/${envelope._id}`);

    } catch (err) {
      console.error("❌ Error:", err);
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => navigate("/envelopes")}
          >
            <ArrowLeft size={18} />
            <span>Zurück</span>
          </button>
          <div className={styles.headerContent}>
            <div className={styles.headerIcon}>
              <PenTool size={24} />
            </div>
            <div>
              <h1>Neue Signaturanfrage</h1>
              <p className={styles.headerSubtitle}>
                Lassen Sie Dokumente digital unterschreiben
              </p>
            </div>
          </div>
          <button
            className={styles.templateButton}
            onClick={() => setShowTemplateModal(true)}
            title="Aus Vorlage laden"
          >
            <FolderOpen size={18} />
            <span>Vorlage</span>
          </button>
        </div>

        {/* Progress Steps */}
        <div className={styles.progressContainer}>
          <div className={styles.progressSteps}>
            <div className={`${styles.step} ${step >= 1 ? styles.stepActive : ""} ${step > 1 ? styles.stepCompleted : ""}`}>
              <div className={styles.stepNumber}>
                {step > 1 ? <CheckCircle size={16} /> : "1"}
              </div>
              <div className={styles.stepInfo}>
                <span className={styles.stepLabel}>Dokument</span>
                <span className={styles.stepDesc}>PDF hochladen</span>
              </div>
            </div>
            <div className={styles.stepLine}>
              <div className={`${styles.stepLineFill} ${step > 1 ? styles.stepLineFillActive : ""}`} />
            </div>
            <div className={`${styles.step} ${step >= 2 ? styles.stepActive : ""}`}>
              <div className={styles.stepNumber}>2</div>
              <div className={styles.stepInfo}>
                <span className={styles.stepLabel}>Unterzeichner</span>
                <span className={styles.stepDesc}>Empfänger hinzufügen</span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        <AnimatePresence>
          {error && (
            <motion.div
              className={styles.errorMessage}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
            >
              <AlertCircle size={18} />
              <span>{error}</span>
              <button
                className={styles.errorClose}
                onClick={() => setError(null)}
              >
                ×
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 1: Upload */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              className={styles.stepContent}
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.stepHeader}>
                <FileText size={20} />
                <h2>Dokument hochladen</h2>
              </div>

              <div
                className={`${styles.uploadZone} ${file ? styles.uploadZoneActive : ""} ${isDragging ? styles.uploadZoneDragging : ""}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />

                {file ? (
                  <div className={styles.uploadedFile}>
                    <div className={styles.fileIconWrapper}>
                      <FileText size={32} />
                    </div>
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </span>
                    </div>
                    <div className={styles.fileSuccess}>
                      <CheckCircle size={20} />
                      <span>Bereit</span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.uploadPlaceholder}>
                    <div className={styles.uploadIconWrapper}>
                      <Upload size={32} />
                    </div>
                    <div className={styles.uploadTextContent}>
                      <p className={styles.uploadText}>
                        PDF-Datei hierher ziehen
                      </p>
                      <p className={styles.uploadTextOr}>oder</p>
                      <button type="button" className={styles.uploadBrowseBtn}>
                        Datei auswählen
                      </button>
                    </div>
                    <p className={styles.uploadHint}>
                      Unterstützt: PDF bis 25 MB
                    </p>
                  </div>
                )}
              </div>

              {file && (
                <motion.div
                  className={styles.titleInput}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <label>Titel der Signaturanfrage</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="z.B. Arbeitsvertrag Max Mustermann"
                  />
                </motion.div>
              )}

              <div className={styles.stepActions}>
                <button
                  className={styles.nextButton}
                  onClick={() => setStep(2)}
                  disabled={!file}
                >
                  <span>Weiter</span>
                  <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* Step 2: Signers */}
          {step === 2 && (
            <motion.div
              key="step2"
              className={styles.stepContent}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30 }}
              transition={{ duration: 0.3 }}
            >
              <div className={styles.stepHeader}>
                <Users size={20} />
                <h2>Unterzeichner hinzufügen</h2>
              </div>

              {/* Signature Mode */}
              <div className={styles.modeSection}>
                <label className={styles.sectionLabel}>Wer muss unterschreiben?</label>
                <div className={styles.modeOptions}>
                  <button
                    className={`${styles.modeOption} ${signatureMode === "RECIPIENT_ONLY" ? styles.modeOptionActive : ""}`}
                    onClick={() => setSignatureMode("RECIPIENT_ONLY")}
                  >
                    <div className={styles.modeOptionIcon}>
                      <User size={24} />
                    </div>
                    <div className={styles.modeOptionContent}>
                      <span className={styles.modeOptionTitle}>Nur Empfänger</span>
                      <span className={styles.modeOptionDesc}>Externe Person(en) unterschreiben</span>
                    </div>
                    {signatureMode === "RECIPIENT_ONLY" && (
                      <CheckCircle size={20} className={styles.modeCheckIcon} />
                    )}
                  </button>
                  <button
                    className={`${styles.modeOption} ${signatureMode === "BOTH_PARTIES" ? styles.modeOptionActive : ""}`}
                    onClick={() => setSignatureMode("BOTH_PARTIES")}
                  >
                    <div className={styles.modeOptionIcon}>
                      <Users size={24} />
                    </div>
                    <div className={styles.modeOptionContent}>
                      <span className={styles.modeOptionTitle}>Beide Parteien</span>
                      <span className={styles.modeOptionDesc}>Sie und der Empfänger unterschreiben</span>
                    </div>
                    {signatureMode === "BOTH_PARTIES" && (
                      <CheckCircle size={20} className={styles.modeCheckIcon} />
                    )}
                  </button>
                </div>
              </div>

              {/* Signing Order (only if both parties) */}
              <AnimatePresence>
                {signatureMode === "BOTH_PARTIES" && (
                  <motion.div
                    className={styles.orderSection}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className={styles.sectionLabel}>Reihenfolge der Unterschriften</label>
                    <div className={styles.orderOptions}>
                      <label className={`${styles.radioOption} ${signingOrder === "RECIPIENT_FIRST" ? styles.radioOptionActive : ""}`}>
                        <input
                          type="radio"
                          checked={signingOrder === "RECIPIENT_FIRST"}
                          onChange={() => setSigningOrder("RECIPIENT_FIRST")}
                        />
                        <div className={styles.radioContent}>
                          <span className={styles.radioTitle}>Empfänger zuerst</span>
                          <span className={styles.radioDesc}>Sie unterschreiben nach dem Empfänger</span>
                        </div>
                      </label>
                      <label className={`${styles.radioOption} ${signingOrder === "SENDER_FIRST" ? styles.radioOptionActive : ""}`}>
                        <input
                          type="radio"
                          checked={signingOrder === "SENDER_FIRST"}
                          onChange={() => setSigningOrder("SENDER_FIRST")}
                        />
                        <div className={styles.radioContent}>
                          <span className={styles.radioTitle}>Ich zuerst</span>
                          <span className={styles.radioDesc}>Sie unterschreiben als Erster</span>
                        </div>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Sequential Signing Mode (only if multiple signers) */}
              <AnimatePresence>
                {signers.length > 1 && (
                  <motion.div
                    className={styles.orderSection}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <label className={styles.sectionLabel}>Signatur-Modus bei mehreren Unterzeichnern</label>
                    <div className={styles.orderOptions}>
                      <label className={`${styles.radioOption} ${signingMode === "PARALLEL" ? styles.radioOptionActive : ""}`}>
                        <input
                          type="radio"
                          checked={signingMode === "PARALLEL"}
                          onChange={() => setSigningMode("PARALLEL")}
                        />
                        <div className={styles.radioContent}>
                          <span className={styles.radioTitle}>Alle gleichzeitig</span>
                          <span className={styles.radioDesc}>Alle Unterzeichner können sofort unterschreiben</span>
                        </div>
                      </label>
                      <label className={`${styles.radioOption} ${signingMode === "SEQUENTIAL" ? styles.radioOptionActive : ""}`}>
                        <input
                          type="radio"
                          checked={signingMode === "SEQUENTIAL"}
                          onChange={() => setSigningMode("SEQUENTIAL")}
                        />
                        <div className={styles.radioContent}>
                          <span className={styles.radioTitle}>Nacheinander</span>
                          <span className={styles.radioDesc}>Jeder muss warten, bis der vorherige unterschrieben hat</span>
                        </div>
                      </label>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Add Signer Form */}
              <div className={styles.addSignerSection}>
                <label className={styles.sectionLabel}>Empfänger hinzufügen</label>
                <div className={styles.addSignerForm}>
                  <div className={styles.inputRow}>
                    <div className={styles.inputGroup}>
                      <Mail size={18} />
                      <input
                        type="email"
                        placeholder="E-Mail-Adresse"
                        value={currentEmail}
                        onChange={(e) => setCurrentEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddSigner()}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <User size={18} />
                      <input
                        type="text"
                        placeholder="Vollständiger Name"
                        value={currentName}
                        onChange={(e) => setCurrentName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddSigner()}
                      />
                    </div>
                  </div>
                  <button
                    className={styles.addButton}
                    onClick={handleAddSigner}
                    type="button"
                  >
                    <Plus size={18} />
                    <span>Hinzufügen</span>
                  </button>
                </div>
              </div>

              {/* Signers List */}
              <AnimatePresence>
                {signers.length > 0 && (
                  <motion.div
                    className={styles.signersList}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <label className={styles.sectionLabel}>
                      <Users size={16} />
                      Unterzeichner ({signers.length})
                    </label>
                    {signers.map((signer, index) => (
                      <motion.div
                        key={index}
                        className={styles.signerItem}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <div className={styles.signerAvatar}>
                          {signer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.signerInfo}>
                          <span className={styles.signerName}>{signer.name}</span>
                          <span className={styles.signerEmail}>{signer.email}</span>
                        </div>
                        <button
                          className={styles.removeButton}
                          onClick={() => handleRemoveSigner(index)}
                          title="Entfernen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message (Optional) */}
              <div className={styles.messageSection}>
                <label className={styles.sectionLabel}>
                  Persönliche Nachricht
                  <span className={styles.optionalTag}>Optional</span>
                </label>
                <textarea
                  placeholder="Fügen Sie eine Nachricht für die Unterzeichner hinzu..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className={styles.stepActions}>
                <button
                  className={styles.backStepButton}
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft size={18} />
                  <span>Zurück</span>
                </button>
                <button
                  className={styles.submitButton}
                  onClick={handleSubmit}
                  disabled={isSubmitting || signers.length === 0}
                >
                  {isSubmitting ? (
                    <>
                      <Loader size={18} className={styles.spinner} />
                      <span>Wird erstellt...</span>
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>Felder platzieren</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Trust Badge */}
        <div className={styles.trustBadge}>
          <Shield size={16} />
          <span>Ihre Dokumente werden sicher verschlüsselt übertragen</span>
        </div>

        {/* Template Modal */}
        <AnimatePresence>
          {showTemplateModal && (
            <motion.div
              className={styles.modalOverlay}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTemplateModal(false)}
            >
              <motion.div
                className={styles.modalContent}
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className={styles.modalHeader}>
                  <h2>
                    <FolderOpen size={20} />
                    Vorlage auswählen
                  </h2>
                  <button
                    className={styles.modalCloseBtn}
                    onClick={() => setShowTemplateModal(false)}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className={styles.modalBody}>
                  {loadingTemplates ? (
                    <div className={styles.loadingState}>
                      <Loader size={24} className={styles.spinner} />
                      <p>Lade Vorlagen...</p>
                    </div>
                  ) : templates.length === 0 ? (
                    <div className={styles.emptyState}>
                      <FolderOpen size={48} />
                      <p>Keine Vorlagen vorhanden</p>
                      <span>Erstellen Sie Vorlagen, indem Sie beim Platzieren von Signaturfeldern auf "Als Vorlage speichern" klicken.</span>
                    </div>
                  ) : (
                    <div className={styles.templateList}>
                      {templates.map((template) => (
                        <div
                          key={template._id}
                          className={styles.templateItem}
                          onClick={() => applyTemplate(template)}
                        >
                          <div className={styles.templateIcon}>
                            <FileText size={24} />
                          </div>
                          <div className={styles.templateInfo}>
                            <h3>{template.name}</h3>
                            {template.description && (
                              <p className={styles.templateDesc}>{template.description}</p>
                            )}
                            <div className={styles.templateMeta}>
                              <span>
                                <Users size={14} />
                                {template.signerRoles.length} Unterzeichner
                              </span>
                              <span>
                                <PenTool size={14} />
                                {template.fields.length} Felder
                              </span>
                            </div>
                          </div>
                          <ArrowRight size={18} className={styles.templateArrow} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedTemplate && (
                  <div className={styles.selectedTemplateBanner}>
                    <CheckCircle size={16} />
                    <span>Vorlage "{selectedTemplate.name}" ausgewählt</span>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
