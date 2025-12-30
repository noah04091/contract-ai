// 📝 FieldInputModal.tsx - Context-aware Field Input Modal
// Handles Signature Canvas, Date Picker, Text Input with validation

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  PenTool,
  Calendar,
  Type,
  FileSignature,
  Trash2,
  CheckCircle,
  AlertCircle,
  MapPin
} from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import styles from "../styles/FieldInputModal.module.css";

// ===== TYPES =====

export type FieldType = "signature" | "initials" | "initial" | "date" | "text" | "location";

export interface SignatureField {
  _id: string;
  type: FieldType;
  page: number;
  required: boolean;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  assigneeEmail: string;
}

export interface FieldSchemaExtras {
  multiline?: boolean;
  pattern?: string; // regex source
  mask?: "iban" | "phone" | "postal" | "none";
  minDate?: string; // ISO
  maxDate?: string; // ISO
}

export interface FieldInputModalProps {
  isOpen: boolean;
  field: (SignatureField & { extras?: FieldSchemaExtras }) | null;
  initialValue?: string;
  onClose: () => void;
  onConfirm: (value: string) => void; // returns normalized value (DataURL/ISO/string)
}

// ===== FIELD ICONS & LABELS =====

const FIELD_ICONS: Record<FieldType, typeof PenTool> = {
  signature: PenTool,
  initials: FileSignature,
  initial: FileSignature, // Backend uses singular
  date: Calendar,
  text: Type,
  location: MapPin
};

const FIELD_LABELS: Record<FieldType, string> = {
  signature: "Signatur",
  initials: "Initialen",
  initial: "Initialen", // Backend uses singular
  date: "Datum",
  text: "Text",
  location: "Ort"
};

// ===== VALIDATION FUNCTIONS =====

/**
 * Check if signature canvas has meaningful ink
 */
function signatureHasInk(dataURL: string): boolean {
  if (!dataURL || !dataURL.startsWith("data:image/png")) return false;

  // Basic check: data URL length (empty canvas is ~1500 chars, drawn canvas is 3000+)
  return dataURL.length > 2000;
}

/**
 * Validate date string (dd.mm.yyyy format)
 */
function validateDateString(dateStr: string): { valid: boolean; iso?: string; error?: string } {
  // Check format dd.mm.yyyy
  const dateRegex = /^(\d{2})\.(\d{2})\.(\d{4})$/;
  const match = dateStr.match(dateRegex);

  if (!match) {
    return { valid: false, error: "Ungültiges Datum. Format: TT.MM.JJJJ" };
  }

  const [, day, month, year] = match;
  const d = parseInt(day, 10);
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);

  // Check valid ranges
  if (d < 1 || d > 31 || m < 1 || m > 12 || y < 1900 || y > 2100) {
    return { valid: false, error: "Ungültiges Datum" };
  }

  // Check date actually exists (e.g., no 31.04.2025)
  const date = new Date(y, m - 1, d);
  if (date.getDate() !== d || date.getMonth() !== m - 1 || date.getFullYear() !== y) {
    return { valid: false, error: "Ungültiges Datum (z.B. 31.04. existiert nicht)" };
  }

  // Convert to ISO
  const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  return { valid: true, iso };
}

/**
 * Format ISO date to DD.MM.YYYY
 */
function formatDateDisplay(iso: string): string {
  const date = new Date(iso);
  const d = String(date.getDate()).padStart(2, "0");
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

/**
 * Get today's date as ISO string (YYYY-MM-DD)
 */
function getTodayISO(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// ===== MAIN COMPONENT =====

export default function FieldInputModal({
  isOpen,
  field,
  initialValue,
  onClose,
  onConfirm
}: FieldInputModalProps) {
  const [value, setValue] = useState<string>(initialValue || "");
  const [error, setError] = useState<string | null>(null);
  const [isValid, setIsValid] = useState<boolean>(false);

  const sigPadRef = useRef<SignatureCanvas>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset state when modal opens/closes or field changes
  useEffect(() => {
    if (isOpen && field) {
      setValue(initialValue || "");
      setError(null);
      setIsValid(false);

      // Auto-focus first input
      setTimeout(() => {
        if (field.type === "text" || field.type === "location") {
          firstInputRef.current?.focus();
        } else if (field.type === "date") {
          firstInputRef.current?.focus();
        }
      }, 100);
    }
  }, [isOpen, field, initialValue]);

  // Handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Make signature canvas DPI-aware for accurate touch/pen input
  useEffect(() => {
    if (!isOpen || !field || (field.type !== "signature" && field.type !== "initials" && field.type !== "initial")) return;
    if (!sigPadRef.current) return;

    // Wait for canvas to be mounted
    const timer = setTimeout(() => {
      const sigPad = sigPadRef.current;
      if (!sigPad) return;

      const canvas = sigPad.getCanvas();
      if (!canvas) return;

      // Get CSS dimensions
      const rect = canvas.getBoundingClientRect();
      const cssWidth = rect.width;
      const cssHeight = rect.height;

      // Get device pixel ratio (2x on Retina, 3x on some phones)
      const dpr = Math.max(1, window.devicePixelRatio || 1);

      // Set physical canvas buffer size based on DPI
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);

      // Scale the drawing context
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      // Set CSS size to maintain visual appearance
      canvas.style.width = `${cssWidth}px`;
      canvas.style.height = `${cssHeight}px`;

      console.log(`📐 Canvas DPI-aware: ${cssWidth}x${cssHeight} CSS → ${canvas.width}x${canvas.height} physical (DPR: ${dpr})`);
    }, 50);

    return () => clearTimeout(timer);
  }, [isOpen, field]);

  if (!isOpen || !field) return null;

  const IconComponent = FIELD_ICONS[field.type];
  const fieldLabel = field.label || FIELD_LABELS[field.type];

  // ===== SIGNATURE/INITIALS HANDLERS =====

  const handleClearSignature = () => {
    sigPadRef.current?.clear();
    setError(null);
    setIsValid(false);
  };

  const handleSignatureChange = () => {
    if (!sigPadRef.current) return;

    const dataURL = sigPadRef.current.toDataURL("image/png");
    const hasInk = signatureHasInk(dataURL);

    setIsValid(hasInk);

    if (!hasInk) {
      setError("Bitte zeichnen Sie eine Signatur");
    } else {
      setError(null);
    }
  };

  const handleConfirmSignature = () => {
    if (!sigPadRef.current) return;

    const dataURL = sigPadRef.current.toDataURL("image/png");

    if (!signatureHasInk(dataURL)) {
      setError("Bitte zeichnen Sie eine Signatur");
      return;
    }

    onConfirm(dataURL);
  };

  // ===== DATE HANDLERS =====

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    if (!newValue.trim()) {
      setError(field.required ? "Bitte füllen Sie dieses Pflichtfeld aus." : null);
      setIsValid(false);
      return;
    }

    const validation = validateDateString(newValue);

    if (!validation.valid) {
      setError(validation.error || "Ungültiges Datum");
      setIsValid(false);
    } else {
      setError(null);
      setIsValid(true);
    }
  };

  const handleConfirmDate = () => {
    if (!value.trim()) {
      setError("Bitte füllen Sie dieses Pflichtfeld aus.");
      return;
    }

    const validation = validateDateString(value);

    if (!validation.valid) {
      setError(validation.error || "Ungültiges Datum");
      return;
    }

    // Return ISO format
    onConfirm(validation.iso!);
  };

  const handleTodayShortcut = () => {
    const today = getTodayISO();
    const formatted = formatDateDisplay(today);
    setValue(formatted);
    setError(null);
    setIsValid(true);
  };

  // ===== TEXT HANDLERS =====

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setValue(newValue);

    // Validate
    if (!newValue.trim()) {
      setError(field.required ? "Bitte füllen Sie dieses Pflichtfeld aus." : null);
      setIsValid(!field.required);
      return;
    }

    // Pattern validation (if provided)
    if (field.extras?.pattern) {
      try {
        const regex = new RegExp(field.extras.pattern);
        if (!regex.test(newValue)) {
          setError("Ungültige Eingabe.");
          setIsValid(false);
          return;
        }
      } catch {
        console.error("Invalid regex pattern:", field.extras.pattern);
      }
    }

    setError(null);
    setIsValid(true);
  };

  const handleConfirmText = () => {
    if (!value.trim() && field.required) {
      setError("Bitte füllen Sie dieses Pflichtfeld aus.");
      return;
    }

    if (!isValid) {
      setError("Ungültige Eingabe.");
      return;
    }

    onConfirm(value.trim());
  };

  // ===== RENDER: MODAL CONTENT =====

  const renderContent = () => {
    switch (field.type) {
      case "signature":
      case "initials":
      case "initial": { // Backend uses singular
        const canvasWidth = field.type === "signature" ? 600 : 300;
        const canvasHeight = field.type === "signature" ? 180 : 120;

        return (
          <div className={styles.signatureContainer}>
            <p className={styles.helperText}>
              Zeichnen Sie mit Maus oder Finger
            </p>

            <div className={styles.canvasWrapper}>
              <SignatureCanvas
                ref={sigPadRef}
                canvasProps={{
                  className: styles.signatureCanvas,
                  width: Math.min(canvasWidth, window.innerWidth - 100),
                  height: canvasHeight
                }}
                backgroundColor="#ffffff"
                penColor="#000000"
                minWidth={1}
                maxWidth={2.5}
                onEnd={handleSignatureChange}
              />
            </div>

            <button
              className={styles.clearButton}
              onClick={handleClearSignature}
              type="button"
            >
              <Trash2 size={16} />
              Löschen
            </button>
          </div>
        );
      }

      case "date":
        return (
          <div className={styles.dateContainer}>
            <p className={styles.helperText}>
              Format: TT.MM.JJJJ
            </p>

            <input
              ref={firstInputRef}
              type="text"
              className={styles.dateInput}
              value={value}
              onChange={handleDateChange}
              placeholder="01.12.2025"
              maxLength={10}
              autoComplete="off"
            />

            <button
              className={styles.todayButton}
              onClick={handleTodayShortcut}
              type="button"
            >
              <Calendar size={16} />
              Heute
            </button>
          </div>
        );

      case "text": {
        const multiline = field.extras?.multiline || false;

        return (
          <div className={styles.textContainer}>
            {multiline ? (
              <textarea
                ref={textareaRef}
                className={styles.textArea}
                value={value}
                onChange={handleTextChange}
                placeholder="Text eingeben..."
                rows={5}
                maxLength={500}
              />
            ) : (
              <input
                ref={firstInputRef}
                type="text"
                className={styles.textInput}
                value={value}
                onChange={handleTextChange}
                placeholder="Text eingeben..."
                maxLength={120}
              />
            )}

            {value.length > 0 && (
              <div className={styles.charCounter}>
                {value.length} / {multiline ? 500 : 120} Zeichen
              </div>
            )}
          </div>
        );
      }

      case "location":
        return (
          <div className={styles.textContainer}>
            <input
              ref={firstInputRef}
              type="text"
              className={styles.textInput}
              value={value}
              onChange={handleTextChange}
              placeholder="z.B. München, Berlin, Hamburg..."
              maxLength={100}
            />

            {value.length > 0 && (
              <div className={styles.charCounter}>
                {value.length} / 100 Zeichen
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const handleConfirm = () => {
    if (field.type === "signature" || field.type === "initials" || field.type === "initial") {
      handleConfirmSignature();
    } else if (field.type === "date") {
      handleConfirmDate();
    } else if (field.type === "text" || field.type === "location") {
      handleConfirmText();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className={styles.backdrop}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            className={styles.modal}
            data-testid="field-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            aria-describedby="modal-description"
          >
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerLeft}>
                <div className={styles.headerIcon}>
                  <IconComponent size={24} />
                </div>
                <div>
                  <h2 className={styles.title} id="modal-title">
                    {fieldLabel} ausfüllen
                  </h2>
                  <p className={styles.subtitle} id="modal-description">
                    Seite {field.page}
                    {field.required && " • Pflichtfeld"}
                  </p>
                </div>
              </div>

              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Schließen"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className={styles.body}>
              {renderContent()}

              {/* Error Message */}
              {error && (
                <div className={styles.errorMessage}>
                  <AlertCircle size={16} />
                  <span>{error}</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={styles.footer}>
              <button
                className={styles.cancelButton}
                onClick={onClose}
                type="button"
              >
                Abbrechen
              </button>

              <button
                className={styles.confirmButton}
                onClick={handleConfirm}
                disabled={!isValid}
                type="button"
                data-testid="confirm"
              >
                <CheckCircle size={18} />
                Übernehmen
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
