// 📍 SignatureFieldOverlay.tsx - Interactive Field Overlays on PDF
// Shows clickable field boxes with status (pending/active/completed)

import { motion } from "framer-motion";
import { PenTool, Calendar, Type, FileSignature, CheckCircle } from "lucide-react";
import styles from "../styles/SignatureFieldOverlay.module.css";
import { fromNormalized, type FieldDocCoords } from "../utils/fieldCoords";

// ===== TYPES =====

interface SignatureField {
  _id: string;
  type: "signature" | "initials" | "date" | "text";
  page: number;

  // Legacy pixel coordinates (deprecated)
  x?: number;
  y?: number;
  width?: number;
  height?: number;

  // Normalized coordinates (preferred, 0-1 range)
  nx?: number;
  ny?: number;
  nwidth?: number;
  nheight?: number;
  rotation?: 0 | 90 | 180 | 270;

  label?: string;
  required: boolean;
  assigneeEmail: string;
}

interface FieldState {
  value?: string;
  status: "pending" | "active" | "completed" | "invalid";
  error?: string | null;
  updatedAt?: number;
}

interface SignatureFieldOverlayProps {
  /** All signature fields for this signer */
  fields: SignatureField[];

  /** Current page number (1-indexed) */
  currentPage: number;

  /** Field states record */
  fieldStates: Record<string, FieldState>;

  /** Currently active field ID */
  activeFieldId: string | null;

  /** PDF page dimensions */
  pageWidth: number;
  pageHeight: number;

  /** Zoom scale factor */
  scale?: number;

  /** Callback when field is clicked */
  onFieldClick: (fieldId: string) => void;

  /** Optional: Signer color for field borders */
  signerColor?: string;
}

// Field type icons
const FIELD_ICONS = {
  signature: PenTool,
  initials: FileSignature,
  date: Calendar,
  text: Type
};

// Field type labels
const FIELD_LABELS = {
  signature: "Signatur",
  initials: "Initialen",
  date: "Datum",
  text: "Text"
};

/**
 * SignatureFieldOverlay Component
 *
 * Renders interactive overlay boxes for signature fields on a PDF page.
 * Shows field status (pending/active/completed) and allows clicking to edit.
 */
export default function SignatureFieldOverlay({
  fields,
  currentPage,
  fieldStates,
  activeFieldId,
  pageWidth,
  pageHeight,
  scale = 1.0,
  onFieldClick,
  signerColor = "#2E6CF6"
}: SignatureFieldOverlayProps) {
  // Filter fields for current page
  const pageFields = fields.filter(field => field.page === currentPage);

  if (pageFields.length === 0) {
    return null;
  }

  return (
    <div className={styles.overlayContainer}>
      {pageFields.map(field => {
        const fieldState = fieldStates[field._id];
        const isCompleted = fieldState?.status === "completed";
        const isActive = field._id === activeFieldId;
        const value = fieldState?.value;

        // Field status class
        let statusClass = styles.statusPending;
        if (isCompleted) statusClass = styles.statusCompleted;
        if (isActive) statusClass = styles.statusActive;

        // Icon component
        const IconComponent = FIELD_ICONS[field.type];
        const fieldLabel = field.label || FIELD_LABELS[field.type];

        // Calculate pixel positions from normalized coordinates (if available)
        let scaledX: number, scaledY: number, scaledWidth: number, scaledHeight: number;

        if (field.nx !== undefined && field.ny !== undefined &&
            field.nwidth !== undefined && field.nheight !== undefined) {
          // ✅ Use normalized coordinates (stable across viewports)
          const pixelCoords = fromNormalized(
            { page: field.page, nx: field.nx, ny: field.ny, nwidth: field.nwidth, nheight: field.nheight },
            pageWidth,
            pageHeight
          );
          scaledX = pixelCoords.x * scale;
          scaledY = pixelCoords.y * scale;
          scaledWidth = pixelCoords.width * scale;
          scaledHeight = pixelCoords.height * scale;
        } else if (field.x !== undefined && field.y !== undefined &&
                   field.width !== undefined && field.height !== undefined) {
          // 🔄 Fallback to legacy pixel coordinates (deprecated)
          scaledX = field.x * scale;
          scaledY = field.y * scale;
          scaledWidth = field.width * scale;
          scaledHeight = field.height * scale;
        } else {
          // ⚠️ Invalid field data - skip rendering
          console.error(`Field ${field._id} has invalid coordinate data`);
          return null;
        }

        return (
          <motion.div
            key={field._id}
            className={`${styles.fieldOverlay} ${statusClass}`}
            style={{
              left: `${scaledX}px`,
              top: `${scaledY}px`,
              width: `${scaledWidth}px`,
              height: `${scaledHeight}px`,
              borderColor: signerColor
            }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
            onClick={() => onFieldClick(field._id)}
            role="button"
            tabIndex={0}
            aria-label={`${fieldLabel} - ${isCompleted ? 'Ausgefüllt' : 'Ausstehend'}`}
            data-testid={`overlay-field-${field._id}`}
            data-overlay-id={field._id}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onFieldClick(field._id);
              }
            }}
          >
            {/* Field Icon & Label */}
            <div className={styles.fieldHeader}>
              <IconComponent size={14} className={styles.fieldIcon} />
              <span className={styles.fieldLabel}>
                {fieldLabel}
                {field.required && <span className={styles.requiredStar}>*</span>}
              </span>
            </div>

            {/* Completed Checkmark */}
            {isCompleted && (
              <div className={styles.completedBadge}>
                <CheckCircle size={20} />
              </div>
            )}

            {/* Value Preview (for completed fields) */}
            {isCompleted && value && (
              field.type === 'signature' || field.type === 'initials' ? (
                <img
                  src={value}
                  alt={`${FIELD_LABELS[field.type]} Vorschau`}
                  className={styles.valueImage}
                />
              ) : (
                <span className={styles.valueText} title={String(value)}>
                  {String(value).length > 14 ? String(value).slice(0, 14) + '…' : String(value)}
                </span>
              )
            )}

            {/* Click Hint (only for pending fields) */}
            {!isCompleted && !isActive && (
              <div className={styles.clickHint}>
                Klicken zum Ausfüllen
              </div>
            )}

            {/* Active Pulse Animation */}
            {isActive && (
              <motion.div
                className={styles.pulseBorder}
                initial={{ scale: 1, opacity: 0.8 }}
                animate={{ scale: 1.05, opacity: 0 }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeOut"
                }}
                style={{ borderColor: signerColor }}
              />
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
