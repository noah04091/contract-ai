// src/pages/CalendarView.tsx
import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
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
  Clock,
  Shield,
  AlertTriangle,
  Info,
  Sparkles,
  Target,
  BarChart3,
  ArrowRight,
  Edit3,
  Save,
  Trash2,
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
  metadata?: {
    provider?: ProviderType;
    noticePeriodDays?: number;
    autoRenewMonths?: number;
    suggestedAction?: string;
    daysLeft?: number;
    daysUntilWindow?: number;
    contractName?: string;
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
}

function QuickActionsModal({ event, onAction, onClose, onEdit }: QuickActionsProps) {
  const navigate = useNavigate();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCancel = () => {
    navigate(`/cancel/${event.contractId}`);
    onClose();
  };

  const handleCompare = () => {
    navigate(`/better-contracts?contractId=${event.contractId}`);
    onClose();
  };

  const handleOptimize = () => {
    navigate(`/optimizer?contractId=${event.contractId}`);
    onClose();
  };

  // NEU: Vertrag anzeigen Handler
  const handleViewContract = () => {
    // Navigate to contracts page with contract details open
    navigate(`/contracts?view=${event.contractId}`);
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
            {/* NEU: Vertrag anzeigen Button - prominent platziert */}
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

            {/* ✨ NEU: Event bearbeiten Button */}
            <motion.button
              className="action-btn-premium secondary"
              onClick={() => {
                onEdit(event);
                onClose();
              }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{ gridColumn: '1 / -1' }}
            >
              <Edit3 size={18} />
              <span>Event bearbeiten</span>
            </motion.button>

            {event.metadata?.suggestedAction === "cancel" && (
              <motion.button 
                className="action-btn-premium primary"
                onClick={handleCancel}
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
              onClick={handleCompare}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <TrendingUp size={18} />
              <span>Vergleichen</span>
            </motion.button>
            
            <motion.button 
              className="action-btn-premium secondary"
              onClick={handleOptimize}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw size={18} />
              <span>Optimieren</span>
            </motion.button>
            
            <motion.button 
              className="action-btn-premium ghost"
              onClick={() => onAction("snooze", event.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <BellOff size={18} />
              <span>Später</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
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

// ✨ EVENT EDIT MODAL - Vollständige Event-Bearbeitung
interface EventEditModalProps {
  event: CalendarEvent;
  onSave: (updatedEvent: Partial<CalendarEvent>) => void;
  onDelete: (eventId: string) => void;
  onClose: () => void;
}

function EventEditModal({ event, onSave, onDelete, onClose }: EventEditModalProps) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [date, setDate] = useState(event.date.split('T')[0]); // YYYY-MM-DD
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
          <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 600 }}>
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
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
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
                fontSize: '14px'
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
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
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Date & Time */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
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
                  fontSize: '14px'
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
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
                  fontSize: '14px'
                }}
              />
            </div>
          </div>

          {/* Severity */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
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
                background: 'white'
              }}
            >
              <option value="info">Info (🟢)</option>
              <option value="warning">Warnung (🟡)</option>
              <option value="critical">Kritisch (🔴)</option>
            </select>
          </div>

          {/* Notes */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500 }}>
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
                fontFamily: 'inherit'
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

export default function CalendarView() {
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
  const [refreshing, setRefreshing] = useState(false);
  const [urgentEventsPage, setUrgentEventsPage] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1024);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

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
        withCredentials: true,
        params: {
          from: new Date().toISOString(),
          to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString()
        }
      });

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
  const handleRegenerateEvents = async () => {
    setRefreshing(true);
    
    try {
      const token = localStorage.getItem("token") || 
                    localStorage.getItem("authToken") || 
                    localStorage.getItem("jwtToken");
      
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      await axios.post("/api/calendar/regenerate-all", {}, {
        headers,
        withCredentials: true
      });
      
      await fetchEvents();
      alert("Events wurden erfolgreich regeneriert!");
    } catch (err) {
      console.error("Fehler beim Regenerieren der Events:", err);
      alert("Events konnten nicht regeneriert werden.");
    } finally {
      setRefreshing(false);
    }
  };

  // Handle Quick Actions
  const handleQuickAction = async (action: string, eventId: string) => {
    try {
      const token = localStorage.getItem("token") ||
                    localStorage.getItem("authToken") ||
                    localStorage.getItem("jwtToken");

      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      if (action === "snooze") {
        await axios.patch(`/api/calendar/events/${eventId}`, {
          status: 'snoozed',
          snoozeDays: 7
        }, {
          headers,
          withCredentials: true
        });

        alert('Erinnerung um 7 Tage verschoben');
        await fetchEvents();
        setShowQuickActions(false);
        setSelectedEvent(null);
      } else if (action === "dismiss") {
        await axios.patch(`/api/calendar/events/${eventId}`, {
          status: 'dismissed'
        }, {
          headers,
          withCredentials: true
        });

        alert('Erinnerung verworfen');
        await fetchEvents();
        setShowQuickActions(false);
        setSelectedEvent(null);
      }
    } catch (err) {
      console.error("Fehler bei Quick Action:", err);
      alert("Aktion konnte nicht ausgeführt werden.");
    }
  };

  // Handle Event Save (Edit)
  const handleEventSave = async (updatedEvent: Partial<CalendarEvent>) => {
    try {
      const token = localStorage.getItem("token") ||
                    localStorage.getItem("authToken") ||
                    localStorage.getItem("jwtToken");

      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await axios.patch(`/api/calendar/events/${updatedEvent.id}`, {
        title: updatedEvent.title,
        description: updatedEvent.description,
        date: updatedEvent.date,
        severity: updatedEvent.severity,
        notes: updatedEvent.notes
      }, {
        headers,
        withCredentials: true
      });

      alert('Event erfolgreich aktualisiert!');
      await fetchEvents();
      setShowEditModal(false);
      setEditingEvent(null);
    } catch (err) {
      console.error("Fehler beim Speichern des Events:", err);
      alert("Event konnte nicht gespeichert werden.");
    }
  };

  // Handle Event Delete
  const handleEventDelete = async (eventId: string) => {
    try {
      const token = localStorage.getItem("token") ||
                    localStorage.getItem("authToken") ||
                    localStorage.getItem("jwtToken");

      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      await axios.delete(`/api/calendar/events/${eventId}`, {
        headers,
        withCredentials: true
      });

      alert('Event erfolgreich gelöscht!');
      await fetchEvents();
      setShowEditModal(false);
      setEditingEvent(null);
    } catch (err) {
      console.error("Fehler beim Löschen des Events:", err);
      alert("Event konnte nicht gelöscht werden.");
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
    
    return filteredEvents
      .filter(e => {
        const eventDate = new Date(e.date);
        return eventDate >= now && 
               eventDate <= future && 
               (e.severity === "critical" || e.severity === "warning");
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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
        {/* Premium Header */}
        <motion.header 
          className="calendar-header-premium"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="header-content">
            <div className="header-main">
              <div className="header-icon-wrapper">
                <CalendarIconLucide size={32} />
              </div>
              <div className="header-text">
                <h1>Intelligenter Vertragskalender</h1>
                <p>Automatische Erinnerungen • 1-Klick-Kündigung • KI-Optimierung</p>
              </div>
            </div>
            
            {/* Mobile Menu Toggle */}
            {isMobile && (
              <button 
                className="mobile-menu-toggle"
                onClick={() => setShowMobileMenu(!showMobileMenu)}
              >
                <Filter size={24} />
              </button>
            )}
          </div>

          {/* Filter Bar - Desktop & Tablet */}
          {!isMobile && (
            <div className="filter-bar-premium">
              <div className="filter-group-premium">
                <Filter size={16} />
                <select 
                  value={filterSeverity} 
                  onChange={(e) => setFilterSeverity(e.target.value)}
                  className="filter-select-premium"
                >
                  <option value="all">Alle Dringlichkeiten</option>
                  <option value="critical">Kritisch</option>
                  <option value="warning">Warnung</option>
                  <option value="info">Info</option>
                </select>
              </div>
              
              <div className="filter-group-premium">
                <FileText size={16} />
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select-premium"
                >
                  <option value="all">Alle Ereignisse</option>
                  <option value="CANCEL_WINDOW_OPEN">Kündigungsfenster</option>
                  <option value="LAST_CANCEL_DAY">Letzte Chance</option>
                  <option value="PRICE_INCREASE">Preiserhöhung</option>
                  <option value="AUTO_RENEWAL">Verlängerung</option>
                  <option value="REVIEW">Review</option>
                </select>
              </div>
              
              <motion.button 
                className={`refresh-btn-premium ${refreshing ? 'refreshing' : ''}`}
                onClick={handleRegenerateEvents}
                disabled={refreshing}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
                <span>{refreshing ? "Aktualisiere..." : "Events neu generieren"}</span>
              </motion.button>
            </div>
          )}
        </motion.header>

        {/* Mobile Filter Menu */}
        <AnimatePresence>
          {isMobile && showMobileMenu && (
            <motion.div 
              className="mobile-filter-menu"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
            >
              <div className="mobile-filter-content">
                <div className="mobile-filter-group">
                  <label>Dringlichkeit</label>
                  <select 
                    value={filterSeverity} 
                    onChange={(e) => setFilterSeverity(e.target.value)}
                  >
                    <option value="all">Alle</option>
                    <option value="critical">Kritisch</option>
                    <option value="warning">Warnung</option>
                    <option value="info">Info</option>
                  </select>
                </div>
                
                <div className="mobile-filter-group">
                  <label>Ereignistyp</label>
                  <select 
                    value={filterType} 
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">Alle</option>
                    <option value="CANCEL_WINDOW_OPEN">Kündigungsfenster</option>
                    <option value="LAST_CANCEL_DAY">Letzte Chance</option>
                    <option value="PRICE_INCREASE">Preiserhöhung</option>
                    <option value="AUTO_RENEWAL">Verlängerung</option>
                    <option value="REVIEW">Review</option>
                  </select>
                </div>
                
                <button 
                  className="mobile-refresh-btn"
                  onClick={handleRegenerateEvents}
                  disabled={refreshing}
                >
                  <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
                  {refreshing ? "Aktualisiere..." : "Events generieren"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
              >
                <div className="stat-icon-wrapper">
                  <BarChart3 size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.total}</div>
                  <div className="stat-label">Ereignisse gesamt</div>
                </div>
              </motion.div>
              
              <motion.div 
                className="stat-card-premium critical"
                whileHover={{ scale: 1.05 }}
              >
                <div className="stat-icon-wrapper">
                  <AlertCircle size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.critical}</div>
                  <div className="stat-label">Kritisch</div>
                </div>
              </motion.div>
              
              <motion.div 
                className="stat-card-premium warning"
                whileHover={{ scale: 1.05 }}
              >
                <div className="stat-icon-wrapper">
                  <Clock size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.thisMonth}</div>
                  <div className="stat-label">Diesen Monat</div>
                </div>
              </motion.div>
              
              <motion.div 
                className="stat-card-premium info"
                whileHover={{ scale: 1.05 }}
              >
                <div className="stat-icon-wrapper">
                  <Bell size={24} />
                </div>
                <div className="stat-content">
                  <div className="stat-value">{stats.notified}</div>
                  <div className="stat-label">Benachrichtigt</div>
                </div>
              </motion.div>
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
                  showNeighboringMonth={false}
                  minDetail="year"
                  locale="de-DE"
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
              <div className="urgent-events-grid">
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
              onEdit={(event) => {
                setEditingEvent(event);
                setShowEditModal(true);
              }}
              onClose={() => {
                setShowQuickActions(false);
                setSelectedEvent(null);
              }}
            />
          )}
          {showEditModal && editingEvent && (
            <EventEditModal
              event={editingEvent}
              onSave={handleEventSave}
              onDelete={handleEventDelete}
              onClose={() => {
                setShowEditModal(false);
                setEditingEvent(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
