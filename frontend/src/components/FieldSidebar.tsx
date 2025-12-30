// 📋 FieldSidebar.tsx - Field List with Progress & Navigation
// Shows all fields grouped by page, with status and smart navigation

import { PenTool, Calendar, Type, FileSignature, CheckCircle, AlertCircle, ChevronRight, MapPin } from "lucide-react";
import styles from "../styles/FieldSidebar.module.css";

// ===== TYPES =====

export type FieldType = "signature" | "initials" | "initial" | "date" | "text" | "location";
export type FieldStatus = "pending" | "active" | "completed" | "invalid";

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

export interface FieldState {
  value?: string; // Data URL for signature/initials, ISO for date, string for text
  status: FieldStatus;
  error?: string | null;
  updatedAt?: number;
}

export interface FieldSidebarProps {
  fields: SignatureField[];
  fieldStates: Record<string, FieldState>;
  activeFieldId: string | null;
  currentPage: number;
  onJumpToField: (fieldId: string) => void; // scroll + focus in PDF
  onNextField: () => void;
  onFinish: () => void;
  canFinish: boolean; // all required valid?
}

// ===== CONSTANTS =====

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

const STATUS_LABELS: Record<FieldStatus, string> = {
  pending: "Ausstehend",
  active: "Aktiv",
  completed: "Erledigt",
  invalid: "Ungültig"
};

// ===== HELPER FUNCTIONS =====

/**
 * Group fields by page
 */
function groupFieldsByPage(fields: SignatureField[]): Map<number, SignatureField[]> {
  const grouped = new Map<number, SignatureField[]>();

  // Sort fields: page ASC → y ASC → x ASC
  const sorted = [...fields].sort((a, b) => {
    if (a.page !== b.page) return a.page - b.page;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  sorted.forEach(field => {
    const pageFields = grouped.get(field.page) || [];
    pageFields.push(field);
    grouped.set(field.page, pageFields);
  });

  return grouped;
}

/**
 * Calculate progress statistics
 */
function calculateProgress(
  fields: SignatureField[],
  fieldStates: Record<string, FieldState>
): { completed: number; total: number; percentage: number } {
  const total = fields.length;
  const completed = fields.filter(field => {
    const state = fieldStates[field._id];
    return state?.status === "completed";
  }).length;

  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return { completed, total, percentage };
}

// ===== MAIN COMPONENT =====

export default function FieldSidebar({
  fields,
  fieldStates,
  activeFieldId,
  currentPage,
  onJumpToField,
  onNextField,
  onFinish,
  canFinish
}: FieldSidebarProps) {
  // currentPage is kept in the interface for potential future use
  void currentPage;
  const grouped = groupFieldsByPage(fields);
  const pages = Array.from(grouped.keys()).sort((a, b) => a - b);
  const progress = calculateProgress(fields, fieldStates);

  // Keyboard navigation for field items
  const handleItemKeyDown = (e: React.KeyboardEvent, fieldId: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onJumpToField(fieldId);
    }
  };

  return (
    <div className={styles.sidebarContainer}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>
          Ihre Felder ({progress.completed}/{progress.total})
        </h2>

        {/* Progress Bar */}
        <div className={styles.progressBarContainer}>
          <div
            className={styles.progressBarFill}
            style={{ width: `${progress.percentage}%` }}
            role="progressbar"
            aria-valuenow={progress.completed}
            aria-valuemin={0}
            aria-valuemax={progress.total}
            aria-label={`${progress.completed} von ${progress.total} Feldern ausgefüllt`}
          />
        </div>

        <p className={styles.progressText}>
          {progress.completed === progress.total
            ? "Alle Felder ausgefüllt!"
            : `${progress.total - progress.completed} ${
                progress.total - progress.completed === 1 ? "Feld" : "Felder"
              } ausstehend`}
        </p>
      </div>

      {/* Field List */}
      <div className={styles.fieldList} role="list">
        {pages.map(page => {
          const pageFields = grouped.get(page) || [];

          return (
            <div key={page} className={styles.pageGroup}>
              <div className={styles.pageHeader}>
                Seite {page}
              </div>

              <ul className={styles.fieldItems} role="list">
                {pageFields.map(field => {
                  const state = fieldStates[field._id] || { status: "pending" };
                  const isActive = field._id === activeFieldId;

                  const IconComponent = FIELD_ICONS[field.type];
                  const fieldLabel = field.label || FIELD_LABELS[field.type];
                  const statusLabel = STATUS_LABELS[state.status];

                  // Status class
                  let statusClass = styles.statusPending;
                  if (state.status === "completed") statusClass = styles.statusCompleted;
                  if (state.status === "active") statusClass = styles.statusActive;
                  if (state.status === "invalid") statusClass = styles.statusInvalid;

                  return (
                    <li
                      key={field._id}
                      className={`${styles.fieldItem} ${isActive ? styles.itemActive : ""} ${statusClass}`}
                      role="listitem"
                      aria-current={isActive ? "true" : undefined}
                      tabIndex={0}
                      onClick={() => onJumpToField(field._id)}
                      onKeyDown={(e) => handleItemKeyDown(e, field._id)}
                    >
                      {/* Icon */}
                      <div className={styles.fieldIcon}>
                        <IconComponent size={18} />
                      </div>

                      {/* Content */}
                      <div className={styles.fieldContent}>
                        <div className={styles.fieldHeader}>
                          <span className={styles.fieldName}>
                            {fieldLabel}
                            {field.required && (
                              <span className={styles.requiredStar}>*</span>
                            )}
                          </span>

                          {/* Status Badge */}
                          <div className={`${styles.statusBadge} ${statusClass}`}>
                            {state.status === "completed" && (
                              <CheckCircle size={14} />
                            )}
                            {state.status === "invalid" && (
                              <AlertCircle size={14} />
                            )}
                            <span>{statusLabel}</span>
                          </div>
                        </div>

                        {/* Error Message */}
                        {state.error && (
                          <div className={styles.errorMessage}>
                            {state.error}
                          </div>
                        )}
                      </div>

                      {/* Arrow Icon (for active) */}
                      {isActive && (
                        <ChevronRight size={18} className={styles.activeArrow} />
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>

      {/* Footer Actions (Sticky) */}
      <div className={styles.footer}>
        <button
          className={styles.nextButton}
          onClick={onNextField}
          disabled={progress.completed === progress.total}
          aria-label="Zum nächsten Feld springen"
          data-testid="next-field"
        >
          <ChevronRight size={20} />
          Nächstes Feld
        </button>

        <button
          className={styles.finishButton}
          onClick={onFinish}
          disabled={!canFinish}
          aria-label={
            canFinish
              ? "Alle Felder ausfüllen und signieren"
              : "Füllen Sie alle Pflichtfelder aus um fortzufahren"
          }
          data-testid="finish"
        >
          <CheckCircle size={20} />
          Fertigstellen
        </button>
      </div>
    </div>
  );
}
