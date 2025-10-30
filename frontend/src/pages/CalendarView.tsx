// src/pages/CalendarView.tsx
import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Clock,
  X,
  ChevronRight,
  ChevronLeft,
  Zap,
  TrendingUp,
  FileText,
  Bell,
  BellOff,
  RefreshCw,
  Filter,
  Calendar as CalendarIconLucide,
  Shield,
  AlertTriangle,
  Info,
  Sparkles,
  Target,
  BarChart3,
  ArrowRight,
  Edit3,
  Save,
  Trash2
} from "lucide-react";
import axios from "axios";
import "../styles/AppleCalendar.css";

// Type for provider
type ProviderType = string | {
  name?: string;
  displayName?: string;
  confidence?: number;
  extractedFromText?: boolean;
} | null | undefined;

// Helper function to safely get provider name
const getProviderName = (provider: ProviderType): string => {
  if (!provider) return 'Unbekannt';
  if (typeof provider === 'string') return provider;
  if (typeof provider === 'object') {
    return provider.displayName || provider.name || 'Unbekannt';
  }
  return 'Unbekannt';
};

// Type für react-calendar
type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface CalendarEvent {
  id: string;
  contractId: string;
  contractName: string;
  title: string;
  description: string;
  date: string;
  type: string;
  severity: "info" | "warning" | "critical";
  status: string;
  notes?: string;
  metadata?: {
    provider?: ProviderType;
    noticePeriodDays?: number;
    autoRenewMonths?: number;
    suggestedAction?: string;
    daysLeft?: number;
    daysUntilWindow?: number;
    contractName?: string;
    notes?: string;
  };
  provider?: ProviderType;
  amount?: number;
}

interface ApiResponse<T> {
  success: boolean;
  events?: T[];
  message?: string;
  result?: {
    redirect?: string;
    message?: string;
  };
}

interface QuickActionsProps {
  event: CalendarEvent;
  onAction: (action: string, eventId: string) => void;
  onClose: () => void;
  onEdit: (event: CalendarEvent) => void;
  navigate: (path: string) => void;
  onOpenSnooze: (event: CalendarEvent) => void;
}

function QuickActionsModal({ event, onAction, onClose, onEdit, navigate, onOpenSnooze }: QuickActionsProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Vertrag anzeigen Handler
  const handleViewContract = () => {
    // Navigate to contracts page with contract details open
    window.location.href = `/contracts?view=${event.contractId}`;
    onClose();
  };

  const getDaysRemaining = () => {
    const now = new Date();
    const eventDate = new Date(event.date);
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Heute";
    if (diffDays === 1) return "Morgen";
    if (diffDays < 0) return "Abgelaufen";
    return `In ${diffDays} Tagen`;
  };

  const formatDate = () => {
    return new Date(event.date).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getSeverityStyle = () => {
    switch(event.severity) {
      case 'critical':
        return { 
          color: '#ef4444', 
          icon: <AlertCircle size={20} />, 
          bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(239, 68, 68, 0.05))',
          borderColor: 'rgba(239, 68, 68, 0.2)'
        };
      case 'warning':
        return { 
          color: '#f59e0b', 
          icon: <AlertTriangle size={20} />, 
          bg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(245, 158, 11, 0.05))',
          borderColor: 'rgba(245, 158, 11, 0.2)'
        };
      default:
        return { 
          color: '#3b82f6', 
          icon: <Info size={20} />, 
          bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(59, 130, 246, 0.05))',
          borderColor: 'rgba(59, 130, 246, 0.2)'
        };
    }
  };

  const severityStyle = getSeverityStyle();

  return (
    <motion.div
      className="quick-actions-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ padding: isMobile ? '20px' : '40px' }}
    >
      <motion.div
        className="quick-actions-modal premium-modal"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? '100%' : '600px',
          width: isMobile ? 'calc(100% - 40px)' : '600px',
          maxHeight: isMobile ? '90vh' : 'auto',
          overflowY: isMobile ? 'auto' : 'visible'
        }}
      >
        <div className="modal-header-premium" style={{ 
          background: severityStyle.bg,
          borderBottom: `1px solid ${severityStyle.borderColor}`
        }}>
          <div className="modal-header-content">
            <div className="severity-badge-premium" style={{ 
              background: severityStyle.color,
              boxShadow: `0 4px 12px ${severityStyle.color}40`
            }}>
              {severityStyle.icon}
            </div>
            <div className="modal-header-text">
              <h3>{event.metadata?.contractName || event.contractName}</h3>
              <p>{event.title}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-content-premium">
          <div className="event-description-premium">
            <Sparkles size={16} className="description-icon" />
            <p>{event.description}</p>
          </div>
          
          <div className="event-meta-grid">
            <div className="meta-card">
              <CalendarIconLucide size={18} className="meta-icon" />
              <div>
                <span className="meta-label">Datum</span>
                <span className="meta-value">{formatDate()}</span>
              </div>
            </div>
            {event.provider && (
              <div className="meta-card">
                <FileText size={18} className="meta-icon" />
                <div>
                  <span className="meta-label">Anbieter</span>
                  <span className="meta-value">{getProviderName(event.provider)}</span>
                </div>
              </div>
            )}
            <div className="meta-card">
              <Clock size={18} className="meta-icon" />
              <div>
                <span className="meta-label">Verbleibend</span>
                <span className="meta-value" style={{ color: severityStyle.color }}>
                  {getDaysRemaining()}
                </span>
              </div>
            </div>
          </div>

          <div className="modal-actions-grid">
            {/* Vertrag anzeigen Button - prominent platziert */}
            <motion.button 
              className="action-btn-premium view-contract"
              onClick={handleViewContract}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ gridColumn: '1 / -1' }}
            >
              <FileText size={18} />
              <span>📄 Vertrag anzeigen</span>
              <ArrowRight size={16} className="action-arrow" />
            </motion.button>

            {event.metadata?.suggestedAction === "cancel" && (
              <motion.button 
                className="action-btn-premium primary"
                onClick={() => onAction("cancel", event.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ gridColumn: '1 / -1' }}
              >
                <Zap size={18} />
                <span>Jetzt kündigen</span>
                <ArrowRight size={16} className="action-arrow" />
              </motion.button>
            )}
            
            <motion.button
              className="action-btn-premium secondary"
              onClick={() => { navigate(`/compare?contractId=${event.contractId}`); onClose(); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <TrendingUp size={18} />
              <span>Vergleichen</span>
            </motion.button>

            <motion.button
              className="action-btn-premium secondary"
              onClick={() => { navigate(`/optimize/${event.contractId}`); onClose(); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw size={18} />
              <span>Optimieren</span>
            </motion.button>

            <motion.button
              className="action-btn-premium secondary"
              onClick={() => { onEdit(event); onClose(); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Edit3 size={18} />
              <span>Bearbeiten</span>
            </motion.button>

            <motion.button
              className="action-btn-premium ghost"
              onClick={() => { onOpenSnooze(event); onClose(); }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Clock size={18} />
              <span>Erinnern</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Event Edit Modal Component
interface EventEditModalProps {
  event: CalendarEvent;
  onSave: (updatedEvent: Partial<CalendarEvent>) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}

function EventEditModal({ event, onSave, onDelete, onClose }: EventEditModalProps) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [date, setDate] = useState(event.date.split('T')[0]);
  const [time, setTime] = useState(() => {
    const d = new Date(event.date);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });
  const [severity, setSeverity] = useState(event.severity);
  const [notes, setNotes] = useState(event.metadata?.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = () => {
    const [hours, minutes] = time.split(':');
    const updatedDate = new Date(date);
    updatedDate.setHours(parseInt(hours), parseInt(minutes));

    onSave({
      id: event.id,
      title,
      description,
      date: updatedDate.toISOString(),
      severity,
      notes
    });
  };

  const handleDelete = () => {
    onDelete(event.id);
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ zIndex: 1002 }}
    >
      <motion.div
        className="event-edit-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          maxWidth: '500px',
          width: '90%',
          maxHeight: '80vh',
          overflowY: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600, color: '#1f2937' }}>
            <Edit3 size={20} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
            Event bearbeiten
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={24} />
          </button>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Title */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
              Titel
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#1f2937'
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
              Beschreibung
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                color: '#1f2937'
              }}
            />
          </div>

          {/* Date & Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                Datum
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#1f2937'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
                Uhrzeit
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#1f2937'
                }}
              />
            </div>
          </div>

          {/* Severity */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
              Priorität
            </label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as "info" | "warning" | "critical")}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                background: 'white',
                color: '#1f2937'
              }}
            >
              <option value="info">Info (🟢)</option>
              <option value="warning">Warnung (🟡)</option>
              <option value="critical">Kritisch (🔴)</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#374151' }}>
              Notizen
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Persönliche Notizen..."
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                fontFamily: 'inherit',
                color: '#1f2937'
              }}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <button
              onClick={handleSave}
              style={{
                flex: 1,
                padding: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Save size={16} />
              Speichern
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: '12px',
                background: '#fee',
                color: '#c33',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div style={{
              padding: '12px',
              background: '#fee',
              borderRadius: '8px',
              border: '1px solid #fcc'
            }}>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#c33' }}>
                Event wirklich löschen?
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleDelete}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: '#c33',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Ja, löschen
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    background: 'white',
                    color: '#666',
                    border: '1px solid #ddd',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Abbrechen
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// Snooze Dialog Modal Component
interface SnoozeDialogProps {
  event: CalendarEvent;
  onSnooze: (days: number | "disable") => void;
  onClose: () => void;
}

function SnoozeDialog({ event, onSnooze, onClose }: SnoozeDialogProps) {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDays, setCustomDays] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [inputMode, setInputMode] = useState<"days" | "date">("days");

  const handlePresetSnooze = (days: number) => {
    onSnooze(days);
    onClose();
  };

  const handleDisableNotification = () => {
    onSnooze("disable");
    onClose();
  };

  const handleCustomSnooze = () => {
    if (inputMode === "days") {
      const days = parseInt(customDays);
      if (days > 0) {
        onSnooze(days);
        onClose();
      } else {
        alert("Bitte geben Sie eine gültige Anzahl von Tagen ein.");
      }
    } else {
      // Date mode
      if (!selectedDate) {
        alert("Bitte wählen Sie ein Datum aus.");
        return;
      }

      const targetDate = new Date(selectedDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate day calculation

      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        alert("Bitte wählen Sie ein Datum in der Zukunft.");
        return;
      }

      onSnooze(diffDays);
      onClose();
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ zIndex: 1003 }}
    >
      <motion.div
        className="event-edit-modal"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: "500px" }}
      >
        <div className="modal-header">
          <h3>
            <BellOff size={20} style={{ marginRight: "8px" }} />
            Erinnerung verschieben
          </h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <p style={{ marginBottom: "20px", color: "#6b7280", fontSize: "14px" }}>
            Wann möchten Sie an "{event.title}" erinnert werden?
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "16px" }}>
            <motion.button
              className="action-btn-premium secondary"
              onClick={() => handlePresetSnooze(7)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px" }}
            >
              <Clock size={20} />
              <span style={{ marginTop: "8px", fontWeight: "600" }}>7 Tage</span>
            </motion.button>

            <motion.button
              className="action-btn-premium secondary"
              onClick={() => handlePresetSnooze(14)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px" }}
            >
              <Clock size={20} />
              <span style={{ marginTop: "8px", fontWeight: "600" }}>14 Tage</span>
            </motion.button>

            <motion.button
              className="action-btn-premium secondary"
              onClick={() => handlePresetSnooze(30)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px" }}
            >
              <Clock size={20} />
              <span style={{ marginTop: "8px", fontWeight: "600" }}>1 Monat</span>
            </motion.button>

            <motion.button
              className="action-btn-premium secondary"
              onClick={() => handlePresetSnooze(365)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "16px" }}
            >
              <Clock size={20} />
              <span style={{ marginTop: "8px", fontWeight: "600" }}>1 Jahr</span>
            </motion.button>
          </div>

          <motion.button
            className="action-btn-premium secondary"
            onClick={() => setShowCustomInput(!showCustomInput)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ width: "100%", marginBottom: "12px", justifyContent: "center" }}
          >
            <Edit3 size={18} />
            <span>Individuell festlegen</span>
          </motion.button>

          {showCustomInput && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              style={{ marginBottom: "12px" }}
            >
              {/* Toggle zwischen Tage und Datum */}
              <div style={{
                display: "flex",
                gap: "8px",
                marginBottom: "12px",
                padding: "4px",
                background: "#f3f4f6",
                borderRadius: "8px"
              }}>
                <button
                  onClick={() => setInputMode("days")}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "6px",
                    background: inputMode === "days" ? "#0071e3" : "transparent",
                    color: inputMode === "days" ? "white" : "#6b7280",
                    fontWeight: inputMode === "days" ? "600" : "400",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  Anzahl Tage
                </button>
                <button
                  onClick={() => setInputMode("date")}
                  style={{
                    flex: 1,
                    padding: "8px 16px",
                    border: "none",
                    borderRadius: "6px",
                    background: inputMode === "date" ? "#0071e3" : "transparent",
                    color: inputMode === "date" ? "white" : "#6b7280",
                    fontWeight: inputMode === "date" ? "600" : "400",
                    cursor: "pointer",
                    transition: "all 0.2s"
                  }}
                >
                  Datum wählen
                </button>
              </div>

              <div className="form-group">
                {inputMode === "days" ? (
                  <>
                    <label>Anzahl Tage</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="number"
                        min="1"
                        value={customDays}
                        onChange={(e) => setCustomDays(e.target.value)}
                        placeholder="z.B. 15"
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn-primary"
                        onClick={handleCustomSnooze}
                        style={{ padding: "10px 20px", whiteSpace: "nowrap" }}
                      >
                        Bestätigen
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <label>Datum auswählen</label>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        min={new Date().toISOString().split('T')[0]}
                        style={{ flex: 1 }}
                      />
                      <button
                        className="btn-primary"
                        onClick={handleCustomSnooze}
                        style={{ padding: "10px 20px", whiteSpace: "nowrap" }}
                      >
                        Bestätigen
                      </button>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}

          <motion.button
            className="action-btn-premium ghost"
            onClick={handleDisableNotification}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: "100%",
              justifyContent: "center",
              borderColor: "rgba(239, 68, 68, 0.3)",
              color: "#ef4444"
            }}
          >
            <BellOff size={18} />
            <span>Benachrichtigung ausschalten</span>
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Stats Detail Modal - Timeline View
interface StatsDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

function StatsDetailModal({ isOpen, onClose, title, events, onEventClick }: StatsDetailModalProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  // Sort events by date (ascending)
  const sortedEvents = [...events].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Group events by month
  const eventsByMonth = sortedEvents.reduce((acc, event) => {
    const eventDate = new Date(event.date);
    const monthKey = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}`;
    const monthLabel = eventDate.toLocaleDateString('de-DE', {
      month: 'long',
      year: 'numeric'
    });

    if (!acc[monthKey]) {
      acc[monthKey] = {
        label: monthLabel,
        events: []
      };
    }

    acc[monthKey].events.push(event);
    return acc;
  }, {} as Record<string, { label: string; events: CalendarEvent[] }>);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle size={18} style={{ color: '#ef4444' }} />;
      case 'warning':
        return <AlertTriangle size={18} style={{ color: '#f59e0b' }} />;
      default:
        return <Info size={18} style={{ color: '#3b82f6' }} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    });
  };

  const getDaysUntil = (dateString: string) => {
    const now = new Date();
    const eventDate = new Date(dateString);
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Morgen';
    if (diffDays < 0) return `Vor ${Math.abs(diffDays)} Tagen`;
    return `In ${diffDays} Tagen`;
  };

  return (
    <AnimatePresence>
      <motion.div
        className="quick-actions-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          padding: isMobile ? '20px' : '40px',
          zIndex: 1001
        }}
      >
        <motion.div
          className="stats-detail-modal premium-modal"
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: isMobile ? '100%' : '800px',
            width: isMobile ? 'calc(100% - 40px)' : '800px',
            maxHeight: isMobile ? '90vh' : '80vh',
            overflowY: 'auto',
            background: '#ffffff',
            borderRadius: '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            padding: 0
          }}
        >
          {/* Header */}
          <div style={{
            padding: isMobile ? '20px' : '30px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            background: '#ffffff',
            backgroundImage: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(147, 51, 234, 0.08))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            backdropFilter: 'blur(10px)'
          }}>
            <div>
              <h2 style={{
                margin: 0,
                fontSize: isMobile ? '20px' : '24px',
                fontWeight: '700',
                color: '#1f2937'
              }}>
                {title}
              </h2>
              <p style={{
                margin: '5px 0 0 0',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                {events.length} {events.length === 1 ? 'Ereignis' : 'Ereignisse'}
              </p>
            </div>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: 'rgba(0, 0, 0, 0.05)',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <X size={20} />
            </motion.button>
          </div>

          {/* Timeline Content */}
          <div style={{
            padding: isMobile ? '20px' : '30px'
          }}>
            {events.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#9ca3af'
              }}>
                <Sparkles size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p style={{ fontSize: '16px', fontWeight: '500' }}>
                  Keine Ereignisse gefunden
                </p>
              </div>
            ) : (
              <div className="timeline-container">
                {Object.entries(eventsByMonth).map(([monthKey, { label, events: monthEvents }]) => (
                  <div key={monthKey} style={{ marginBottom: '40px' }}>
                    {/* Month Header */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '20px'
                    }}>
                      <div style={{
                        flex: 1,
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent)'
                      }} />
                      <h3 style={{
                        margin: 0,
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#6b7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {label}
                      </h3>
                      <div style={{
                        flex: 1,
                        height: '1px',
                        background: 'linear-gradient(90deg, transparent, rgba(0, 0, 0, 0.1), transparent)'
                      }} />
                    </div>

                    {/* Events in this month */}
                    <div style={{ position: 'relative', paddingLeft: isMobile ? '20px' : '30px' }}>
                      {/* Timeline line */}
                      <div style={{
                        position: 'absolute',
                        left: '0',
                        top: '20px',
                        bottom: '20px',
                        width: '2px',
                        background: 'linear-gradient(180deg, rgba(59, 130, 246, 0.3), rgba(147, 51, 234, 0.3))'
                      }} />

                      {monthEvents.map((event, index) => (
                        <motion.div
                          key={event.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          style={{
                            position: 'relative',
                            marginBottom: '20px',
                            paddingLeft: '25px'
                          }}
                        >
                          {/* Timeline dot */}
                          <div style={{
                            position: 'absolute',
                            left: '-7px',
                            top: '20px',
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            background: getSeverityColor(event.severity),
                            border: '3px solid #ffffff',
                            boxShadow: `0 0 0 1px ${getSeverityColor(event.severity)}40`,
                            zIndex: 1
                          }} />

                          {/* Event Card */}
                          <motion.div
                            whileHover={{ scale: 1.02, x: 5 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              onEventClick(event);
                            }}
                            style={{
                              background: '#ffffff',
                              border: `1px solid ${getSeverityColor(event.severity)}30`,
                              borderRadius: '12px',
                              padding: isMobile ? '16px' : '20px',
                              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                              cursor: 'pointer',
                              transition: 'all 0.2s'
                            }}
                          >
                            {/* Header */}
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              gap: '12px',
                              marginBottom: '12px'
                            }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                {getSeverityIcon(event.severity)}
                                <span style={{
                                  fontSize: '14px',
                                  fontWeight: '600',
                                  color: getSeverityColor(event.severity),
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.05em'
                                }}>
                                  {event.severity === 'critical' ? 'Kritisch' :
                                   event.severity === 'warning' ? 'Warnung' : 'Info'}
                                </span>
                              </div>
                              <span style={{
                                fontSize: '12px',
                                fontWeight: '500',
                                color: '#9ca3af',
                                whiteSpace: 'nowrap'
                              }}>
                                {getDaysUntil(event.date)}
                              </span>
                            </div>

                            {/* Title */}
                            <h4 style={{
                              margin: '0 0 8px 0',
                              fontSize: isMobile ? '15px' : '16px',
                              fontWeight: '600',
                              color: '#1f2937'
                            }}>
                              {event.contractName}
                            </h4>

                            {/* Description */}
                            <p style={{
                              margin: '0 0 12px 0',
                              fontSize: '14px',
                              color: '#6b7280',
                              lineHeight: '1.5'
                            }}>
                              {event.title}
                            </p>

                            {/* Footer */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '12px',
                              fontSize: '13px',
                              color: '#9ca3af'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CalendarIconLucide size={14} />
                                {formatEventDate(event.date)}
                              </div>
                              {event.metadata?.provider && (
                                <>
                                  <span>•</span>
                                  <span>{getProviderName(event.metadata.provider)}</span>
                                </>
                              )}
                            </div>
                          </motion.div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// Helper function to format contract name
const formatContractName = (name: string): string => {
  let formatted = name.replace(/\.(pdf|docx?|txt|png|jpg|jpeg)$/i, '');
  formatted = formatted.replace(/_/g, ' ');
  formatted = formatted.replace(/\d{8}_?\d{6}/g, '');
  formatted = formatted.replace(/\s+/g, ' ').trim();
  if (!formatted) {
    formatted = name.split('.')[0];
  }
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

// Get event type icon
const getEventTypeIcon = (type: string) => {
  switch(type) {
    case 'CANCEL_WINDOW_OPEN':
      return <Target size={14} />;
    case 'LAST_CANCEL_DAY':
      return <AlertCircle size={14} />;
    case 'PRICE_INCREASE':
      return <TrendingUp size={14} />;
    case 'AUTO_RENEWAL':
      return <RefreshCw size={14} />;
    case 'REVIEW':
      return <Shield size={14} />;
    default:
      return <Info size={14} />;
  }
};

export default function CalendarPage() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"month" | "year">("month");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [urgentEventsPage, setUrgentEventsPage] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStatFilter, setSelectedStatFilter] = useState<"total" | "critical" | "thisMonth" | "notified">("total");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [showSnoozeDialog, setShowSnoozeDialog] = useState(false);
  const [snoozeEvent, setSnoozeEvent] = useState<CalendarEvent | null>(null);

  const EVENTS_PER_PAGE = isMobile ? 3 : 5;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch Events from new Calendar API
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token") ||
                    localStorage.getItem("authToken") ||
                    localStorage.getItem("jwtToken") ||
                    localStorage.getItem("accessToken") ||
                    sessionStorage.getItem("token") ||
                    sessionStorage.getItem("authToken");

      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await axios.get<ApiResponse<CalendarEvent>>("/api/calendar/events", {
        headers,
        params: {
          from: new Date().toISOString(),
          to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

      console.log("Calendar Events Response:", response.data);

      if (response.data.success && response.data.events) {
        setEvents(response.data.events);
        setFilteredEvents(response.data.events);
      } else {
        setEvents([]);
        setFilteredEvents([]);
      }
    } catch (err) {
      console.error("Fehler beim Laden der Kalenderereignisse:", err);
      setError("Die Kalenderdaten konnten nicht geladen werden.");
      setEvents([]);
      setFilteredEvents([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEditModal(true);
  };

  const handleSaveEvent = async (updatedEvent: Partial<CalendarEvent>) => {
    try {
      const token = localStorage.getItem("token") ||
                    localStorage.getItem("authToken") ||
                    localStorage.getItem("jwtToken") ||
                    localStorage.getItem("accessToken") ||
                    sessionStorage.getItem("token") ||
                    sessionStorage.getItem("authToken");

      await axios.patch(`/api/calendar/events/${updatedEvent.id}`, updatedEvent, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchEvents();
      setShowEditModal(false);
      setEditingEvent(null);
      alert("Event erfolgreich gespeichert!");
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
      alert("Event konnte nicht gespeichert werden.");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const token = localStorage.getItem("token") ||
                    localStorage.getItem("authToken") ||
                    localStorage.getItem("jwtToken") ||
                    localStorage.getItem("accessToken") ||
                    sessionStorage.getItem("token") ||
                    sessionStorage.getItem("authToken");

      await axios.delete(`/api/calendar/events/${eventId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      await fetchEvents();
      setShowEditModal(false);
      setEditingEvent(null);
      alert("Event erfolgreich gelöscht!");
    } catch (error) {
      console.error("Fehler beim Löschen:", error);
      alert("Event konnte nicht gelöscht werden.");
    }
  };

  const handleSnooze = async (days: number | "disable") => {
    if (!snoozeEvent) return;

    try {
      const token = localStorage.getItem("token") ||
                    localStorage.getItem("authToken") ||
                    localStorage.getItem("jwtToken") ||
                    localStorage.getItem("accessToken") ||
                    sessionStorage.getItem("token") ||
                    sessionStorage.getItem("authToken");

      if (days === "disable") {
        // Benachrichtigung ausschalten = Event als dismissed markieren
        await axios.patch(`/api/calendar/events/${snoozeEvent.id}`, {
          status: "dismissed"
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert("Benachrichtigung wurde ausgeschaltet.");
      } else {
        // Snooze mit Tagen
        await axios.post("/api/calendar/quick-action", {
          eventId: snoozeEvent.id,
          action: "snooze",
          data: { days }
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert(`Erinnerung um ${days} Tage verschoben.`);
      }

      await fetchEvents();
      setShowSnoozeDialog(false);
      setSnoozeEvent(null);
      setShowQuickActions(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error("Fehler beim Snoozen:", error);
      alert("Aktion konnte nicht ausgeführt werden.");
    }
  };

  // Filter events
  useEffect(() => {
    let filtered = [...events];
    
    if (filterSeverity !== "all") {
      filtered = filtered.filter(e => e.severity === filterSeverity);
    }
    
    if (filterType !== "all") {
      filtered = filtered.filter(e => e.type === filterType);
    }
    
    setFilteredEvents(filtered);
  }, [events, filterSeverity, filterType]);

  // Regenerate all events
  // Handle Quick Actions
  const handleQuickAction = async (action: string, eventId: string) => {
    try {
      const token = localStorage.getItem("token") ||
                    localStorage.getItem("authToken") ||
                    localStorage.getItem("jwtToken") ||
                    localStorage.getItem("accessToken") ||
                    sessionStorage.getItem("token") ||
                    sessionStorage.getItem("authToken");

      const response = await axios.post<ApiResponse<CalendarEvent>>("/api/calendar/quick-action", {
        eventId,
        action,
        data: action === "snooze" ? { days: 7 } : {}
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success) {
        if (response.data.result?.redirect) {
          window.location.href = response.data.result.redirect;
        } else {
          await fetchEvents();
          setShowQuickActions(false);
          setSelectedEvent(null);
          
          if (response.data.result?.message) {
            alert(response.data.result.message);
          }
        }
      }
    } catch (err) {
      console.error("Fehler bei Quick Action:", err);
      alert("Aktion konnte nicht ausgeführt werden.");
    }
  };

  // Modern calendar tile styling
  const tileClassName = ({ date }: { date: Date }) => {
    // ✅ FIX: Use local date format to avoid timezone shift
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const dayEvents = filteredEvents.filter(e =>
      e.date && e.date.split('T')[0] === dateString
    );
    
    if (dayEvents.length === 0) return null;
    
    const hasCritical = dayEvents.some(e => e.severity === "critical");
    const hasWarning = dayEvents.some(e => e.severity === "warning");
    
    if (hasCritical) return "tile-critical";
    if (hasWarning) return "tile-warning";
    return "tile-info";
  };

  const tileContent = ({ date }: { date: Date }) => {
    // ✅ FIX: Use local date format to avoid timezone shift
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const dayEvents = filteredEvents.filter(e =>
      e.date && e.date.split('T')[0] === dateString
    );
    
    if (dayEvents.length === 0) return null;
    
    const hasCritical = dayEvents.some(e => e.severity === "critical");
    const hasWarning = dayEvents.some(e => e.severity === "warning");
    const hasInfo = dayEvents.some(e => e.severity === "info");
    
    return (
      <div className="tile-content-modern">
        {hasCritical && (
          <div className="event-dot critical-dot">
            <span className="dot-pulse"></span>
          </div>
        )}
        {hasWarning && !hasCritical && (
          <div className="event-dot warning-dot">
            <span className="dot-pulse"></span>
          </div>
        )}
        {hasInfo && !hasCritical && !hasWarning && (
          <div className="event-dot info-dot"></div>
        )}
        {dayEvents.length > 1 && (
          <div className="event-count-badge">{dayEvents.length}</div>
        )}
      </div>
    );
  };

  // Format weekday names (Mo, Di, Mi, Do, Fr, Sa, So)
  const formatShortWeekday = (_locale: string | undefined, date: Date) => {
    const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    return weekdays[date.getDay()];
  };

  // Format day number - ensure all days show their number
  const formatDay = (_locale: string | undefined, date: Date) => {
    return date.getDate().toString();
  };

  const handleDateClick = (value: Value) => {
    if (value instanceof Date) {
      setSelectedDate(value);

      // ✅ FIX: Use local date format to avoid timezone shift
      const year = value.getFullYear();
      const month = String(value.getMonth() + 1).padStart(2, '0');
      const day = String(value.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;
      const dayEvents = filteredEvents.filter(e =>
        e.date && e.date.split('T')[0] === dateString
      );
      
      if (dayEvents.length === 1) {
        setSelectedEvent(dayEvents[0]);
        setShowQuickActions(true);
      } else if (dayEvents.length > 1) {
        setSelectedEvent(dayEvents[0]);
        setShowQuickActions(true);
      }
    } else if (Array.isArray(value) && value[0] instanceof Date) {
      setSelectedDate(value[0]);
    }
  };

  const getUpcomingCriticalEvents = () => {
    const now = new Date();
    const future = new Date();
    future.setDate(future.getDate() + 30);

    // WICHTIG: Verwende `events` statt `filteredEvents`
    // "Dringende Ereignisse" sollen IMMER angezeigt werden, unabhängig von Filtern!
    // Zeige ALLE Events in den nächsten 30 Tagen (critical, warning, info)
    return events
      .filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= now && eventDate <= future;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 10); // Maximal 10 Events anzeigen
  };

  const getDaysRemaining = (date: string) => {
    const now = new Date();
    const eventDate = new Date(date);
    const diffTime = eventDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return { text: "Heute", urgent: true };
    if (diffDays === 1) return { text: "Morgen", urgent: true };
    if (diffDays < 0) return { text: "Abgelaufen", urgent: true };
    if (diffDays <= 7) return { text: `${diffDays} Tage`, urgent: true };
    return { text: `${diffDays} Tage`, urgent: false };
  };

  // Calculate statistics
  const getStatistics = () => {
    const now = new Date();
    const thisMonth = filteredEvents.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate.getMonth() === now.getMonth() &&
             eventDate.getFullYear() === now.getFullYear();
    });

    const overdue = filteredEvents.filter(e => new Date(e.date) < now);

    return {
      total: events.length,
      critical: events.filter(e => e.severity === "critical").length,
      thisMonth: thisMonth.length,
      overdue: overdue.length,
      notified: events.filter(e => e.status === "notified").length
    };
  };

  const stats = getStatistics();

  // Handle Stats Card Click - Open Modal with filtered events
  const handleStatsCardClick = (filterType: "total" | "critical" | "thisMonth" | "notified") => {
    setSelectedStatFilter(filterType);
    setShowStatsModal(true);
  };

  // Get filtered events for stats modal
  const getFilteredStatsEvents = () => {
    const now = new Date();

    switch (selectedStatFilter) {
      case "critical":
        return events.filter(e => e.severity === "critical");
      case "thisMonth":
        return events.filter(e => {
          const eventDate = new Date(e.date);
          return eventDate.getMonth() === now.getMonth() &&
                 eventDate.getFullYear() === now.getFullYear();
        });
      case "notified":
        return events.filter(e => e.status === "notified");
      case "total":
      default:
        return events;
    }
  };

  // Get title for stats modal
  const getStatsModalTitle = () => {
    switch (selectedStatFilter) {
      case "critical":
        return "Kritische Ereignisse";
      case "thisMonth":
        return "Ereignisse diesen Monat";
      case "notified":
        return "Benachrichtigte Ereignisse";
      case "total":
      default:
        return "Alle Ereignisse";
    }
  };

  // Paginated urgent events
  const urgentEvents = getUpcomingCriticalEvents();
  const totalPages = Math.ceil(urgentEvents.length / EVENTS_PER_PAGE);
  const paginatedEvents = urgentEvents.slice(
    urgentEventsPage * EVENTS_PER_PAGE,
    (urgentEventsPage + 1) * EVENTS_PER_PAGE
  );

  return (
    <>
      <Helmet>
        <title>Intelligenter Vertragskalender – Nie wieder Fristen verpassen | Contract AI</title>
        <meta name="description" content="Revolutionärer Vertragskalender mit automatischen Erinnerungen, 1-Klick-Kündigung und KI-gestützten Optimierungsvorschlägen. Sparen Sie Zeit und Geld!" />
      </Helmet>
      
      <div className="calendar-page-premium">
        {/* Page Title - Apple Style (outside box, centered) */}
        <motion.div
          className="calendar-page-title"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="title-icon">
            <CalendarIconLucide size={36} />
          </div>
          <h1>Intelligenter Vertragskalender</h1>
          <p>Automatische Erinnerungen • 1-Klick-Kündigung • KI-Optimierung</p>
        </motion.div>

        {/* Main Content Grid */}
        <div className={`calendar-grid-premium ${isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'}`}>
          {/* Statistics Cards - Top Position */}
          <motion.div 
            className="stats-section-premium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="stats-grid-premium">
              <motion.div
                className="stat-card-premium total"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStatsCardClick("total")}
                style={{ cursor: 'pointer' }}
              >
                <div className="stat-icon-wrapper">
                  <BarChart3 size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.total}</div>
                  <div className="stat-label">Ereignisse gesamt</div>
                </div>
                <div className="stat-card-arrow">
                  <ArrowRight size={16} />
                </div>
              </motion.div>

              <motion.div
                className="stat-card-premium critical"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStatsCardClick("critical")}
                style={{ cursor: 'pointer' }}
              >
                <div className="stat-icon-wrapper">
                  <AlertCircle size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.critical}</div>
                  <div className="stat-label">Kritisch</div>
                </div>
                <div className="stat-card-arrow">
                  <ArrowRight size={16} />
                </div>
              </motion.div>

              <motion.div
                className="stat-card-premium warning"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStatsCardClick("thisMonth")}
                style={{ cursor: 'pointer' }}
              >
                <div className="stat-icon-wrapper">
                  <Clock size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.thisMonth}</div>
                  <div className="stat-label">Diesen Monat</div>
                </div>
                <div className="stat-card-arrow">
                  <ArrowRight size={16} />
                </div>
              </motion.div>

              <motion.div
                className="stat-card-premium info"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleStatsCardClick("notified")}
                style={{ cursor: 'pointer' }}
              >
                <div className="stat-icon-wrapper">
                  <Bell size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.notified}</div>
                  <div className="stat-label">Benachrichtigt</div>
                </div>
                <div className="stat-card-arrow">
                  <ArrowRight size={16} />
                </div>
              </motion.div>
            </div>
          </motion.div>

          {/* Filter Section - Below Stats */}
          <motion.div
            className="filter-section-premium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="filter-grid-premium">
              <div className="filter-group-compact">
                <Filter size={16} />
                <select
                  value={filterSeverity}
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="filter-select-compact"
                >
                  <option value="all">🔍 Alle Dringlichkeiten</option>
                  <option value="critical">🔴 Kritisch</option>
                  <option value="warning">🟠 Warnung</option>
                  <option value="info">🔵 Info</option>
                </select>
              </div>

              <div className="filter-group-compact">
                <FileText size={16} />
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select-compact"
                >
                  <option value="all">📋 Alle Ereignisse</option>
                  <option value="CANCEL_WINDOW_OPEN">🚪 Kündigungsfenster</option>
                  <option value="LAST_CANCEL_DAY">⏰ Letzte Chance</option>
                  <option value="PRICE_INCREASE">💰 Preiserhöhung</option>
                  <option value="AUTO_RENEWAL">🔄 Verlängerung</option>
                  <option value="REVIEW">📝 Review</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Calendar Section */}
          <motion.div 
            className="calendar-section-premium"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            {loading ? (
              <div className="calendar-loading-premium">
                <div className="loading-spinner"></div>
                <p>Kalenderereignisse werden geladen...</p>
              </div>
            ) : error ? (
              <div className="calendar-error-premium">
                <AlertCircle size={32} />
                <p>{error}</p>
              </div>
            ) : (
              <>
                <Calendar
                  onChange={handleDateClick}
                  value={selectedDate || new Date()}
                  tileClassName={tileClassName}
                  tileContent={tileContent}
                  view={view}
                  onViewChange={({ view: newView }) => setView(newView as "month" | "year")}
                  showNeighboringMonth={true}
                  showFixedNumberOfWeeks={false}
                  minDetail="year"
                  calendarType="iso8601"
                  formatShortWeekday={formatShortWeekday}
                  formatDay={formatDay}
                  className="calendar-premium"
                />
                
                <div className="calendar-legend-premium">
                  <div className="legend-item">
                    <div className="legend-dot critical"></div>
                    <span>Kritisch</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot warning"></div>
                    <span>Warnung</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-dot info"></div>
                    <span>Info</span>
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {/* Urgent Events Section with Pagination */}
          <motion.div 
            className="urgent-section-premium"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="section-header-premium">
              <div className="section-title">
                <AlertCircle size={20} className="section-icon" />
                <h3>Dringende Ereignisse</h3>
              </div>
              {urgentEvents.length > EVENTS_PER_PAGE && (
                <div className="pagination-controls">
                  <button 
                    onClick={() => setUrgentEventsPage(Math.max(0, urgentEventsPage - 1))}
                    disabled={urgentEventsPage === 0}
                    className="pagination-btn"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="pagination-info">
                    {urgentEventsPage + 1} / {totalPages}
                  </span>
                  <button 
                    onClick={() => setUrgentEventsPage(Math.min(totalPages - 1, urgentEventsPage + 1))}
                    disabled={urgentEventsPage === totalPages - 1}
                    className="pagination-btn"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
            
            {paginatedEvents.length > 0 ? (
              <div className={`urgent-events-grid ${
                paginatedEvents.length <= 3 ? 'event-density-low' :
                paginatedEvents.length <= 5 ? 'event-density-medium' :
                'event-density-high'
              }`}>
                {paginatedEvents.map((event, index) => {
                  const daysInfo = getDaysRemaining(event.date);
                  const formattedName = formatContractName(event.contractName);

                  return (
                    <motion.div
                      key={event.id}
                      className={`event-card-premium severity-${event.severity}`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 * index }}
                      whileHover={{ scale: 1.02 }}
                      onClick={() => {
                        setSelectedEvent(event);
                        setShowQuickActions(true);
                      }}
                    >
                      <div className="event-card-header">
                        <div className="event-type-badge">
                          {getEventTypeIcon(event.type)}
                        </div>
                        <span className={`days-badge-premium ${daysInfo.urgent ? 'urgent' : ''}`}>
                          {daysInfo.text}
                        </span>
                      </div>
                      <h4 className="event-card-title">{formattedName}</h4>
                      <p className="event-card-description">{event.title}</p>
                      <div className="event-card-footer">
                        <span className="event-date">
                          <CalendarIconLucide size={14} />
                          {new Date(event.date).toLocaleDateString('de-DE')}
                        </span>
                        {event.metadata?.suggestedAction && (
                          <motion.button 
                            className="suggested-action-btn"
                            whileHover={{ scale: 1.05 }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedEvent(event);
                              setShowQuickActions(true);
                            }}
                          >
                            <Zap size={14} />
                            {event.metadata.suggestedAction === "cancel" ? "Kündigen" :
                             event.metadata.suggestedAction === "compare" ? "Vergleichen" :
                             "Handeln"}
                          </motion.button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="no-events-premium">
                <Sparkles size={32} />
                <h4>Alles im Griff!</h4>
                <p>
                  {events.length === 0 
                    ? "Laden Sie Verträge hoch oder generieren Sie Events."
                    : "Keine dringenden Ereignisse in den nächsten 30 Tagen."}
                </p>
              </div>
            )}
          </motion.div>

          {/* Premium Features Section */}
          <motion.div 
            className="features-section-premium"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="section-header-premium">
              <div className="section-title">
                <Sparkles size={20} className="section-icon" />
                <h3>Premium Features</h3>
              </div>
            </div>
            
            <div className="features-grid-premium">
              <motion.div 
                className="feature-card-premium"
                whileHover={{ scale: 1.05 }}
              >
                <div className="feature-icon-wrapper cancel">
                  <Zap size={20} />
                </div>
                <h4>1-Klick-Kündigung</h4>
                <p>Kündigen Sie direkt aus dem Kalender</p>
              </motion.div>
              
              <motion.div 
                className="feature-card-premium"
                whileHover={{ scale: 1.05 }}
              >
                <div className="feature-icon-wrapper notify">
                  <Bell size={20} />
                </div>
                <h4>Smart Notifications</h4>
                <p>Intelligente Erinnerungen per E-Mail</p>
              </motion.div>
              
              <motion.div 
                className="feature-card-premium"
                whileHover={{ scale: 1.05 }}
              >
                <div className="feature-icon-wrapper compare">
                  <TrendingUp size={20} />
                </div>
                <h4>Marktvergleich</h4>
                <p>Automatischer Preisvergleich</p>
              </motion.div>
              
              <motion.div 
                className="feature-card-premium"
                whileHover={{ scale: 1.05 }}
              >
                <div className="feature-icon-wrapper optimize">
                  <RefreshCw size={20} />
                </div>
                <h4>KI-Optimierung</h4>
                <p>Personalisierte Empfehlungen</p>
              </motion.div>
            </div>
          </motion.div>
        </div>
        
        <AnimatePresence>
          {showQuickActions && selectedEvent && (
            <QuickActionsModal
              event={selectedEvent}
              onAction={handleQuickAction}
              onEdit={handleEditEvent}
              navigate={navigate}
              onOpenSnooze={(event) => {
                setSnoozeEvent(event);
                setShowSnoozeDialog(true);
              }}
              onClose={() => {
                setShowQuickActions(false);
                setSelectedEvent(null);
              }}
            />
          )}
        </AnimatePresence>

        {showEditModal && editingEvent && (
          <EventEditModal
            event={editingEvent}
            onSave={handleSaveEvent}
            onDelete={handleDeleteEvent}
            onClose={() => {
              setShowEditModal(false);
              setEditingEvent(null);
            }}
          />
        )}

        {showSnoozeDialog && snoozeEvent && (
          <SnoozeDialog
            event={snoozeEvent}
            onSnooze={handleSnooze}
            onClose={() => {
              setShowSnoozeDialog(false);
              setSnoozeEvent(null);
            }}
          />
        )}

        {/* Stats Detail Modal */}
        <StatsDetailModal
          isOpen={showStatsModal}
          onClose={() => setShowStatsModal(false)}
          title={getStatsModalTitle()}
          events={getFilteredStatsEvents()}
          onEventClick={(event) => {
            setShowStatsModal(false);
            setSelectedEvent(event);
            setShowQuickActions(true);
          }}
        />
      </div>
    </>
  );
}
