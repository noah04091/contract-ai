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
  XCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/AppleCalendar.css";

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
    provider?: string;
    noticePeriodDays?: number;
    autoRenewMonths?: number;
    suggestedAction?: string;
    daysLeft?: number;
    daysUntilWindow?: number;
    contractName?: string;
  };
  provider?: string;
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
}

function QuickActionsModal({ event, onAction, onClose }: QuickActionsProps) {
  const navigate = useNavigate();

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

  // Get severity color and icon
  const getSeverityStyle = () => {
    switch(event.severity) {
      case 'critical':
        return { color: '#FF3B30', icon: <AlertCircle size={20} />, bg: 'rgba(255, 59, 48, 0.1)' };
      case 'warning':
        return { color: '#FF9500', icon: <AlertTriangle size={20} />, bg: 'rgba(255, 149, 0, 0.1)' };
      default:
        return { color: '#007AFF', icon: <Info size={20} />, bg: 'rgba(0, 122, 255, 0.1)' };
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
    >
      <motion.div
        className="quick-actions-modal enhanced"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="quick-actions-header" style={{ background: severityStyle.bg }}>
          <div className="event-info">
            <div className="severity-icon" style={{ color: severityStyle.color }}>
              {severityStyle.icon}
            </div>
            <div>
              <h3>{event.metadata?.contractName || event.contractName}</h3>
              <p>{event.title}</p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="quick-actions-content">
          <p className="event-description">
            <Sparkles size={16} style={{ color: '#FFD60A', marginRight: '8px', verticalAlign: 'middle' }} />
            {event.description}
          </p>
          
          <div className="event-details enhanced">
            <div className="detail-item">
              <CalendarIconLucide size={16} />
              <span>{formatDate()}</span>
            </div>
            {event.provider && (
              <div className="detail-item">
                <FileText size={16} />
                <span>{event.provider}</span>
              </div>
            )}
            <div className="detail-item">
              <Clock size={16} />
              <span className="days-badge enhanced" style={{ background: severityStyle.color }}>
                {getDaysRemaining()}
              </span>
            </div>
          </div>

          <div className="quick-actions-buttons enhanced">
            {event.metadata?.suggestedAction === "cancel" && (
              <motion.button 
                className="action-btn primary gradient"
                onClick={handleCancel}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Zap size={18} />
                <span>Jetzt kündigen</span>
                <ChevronRight size={16} />
              </motion.button>
            )}
            
            <motion.button 
              className="action-btn secondary"
              onClick={handleCompare}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <TrendingUp size={18} />
              <span>Alternativen vergleichen</span>
              <ChevronRight size={16} />
            </motion.button>
            
            <motion.button 
              className="action-btn secondary"
              onClick={handleOptimize}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <RefreshCw size={18} />
              <span>Vertrag optimieren</span>
              <ChevronRight size={16} />
            </motion.button>
            
            <div className="action-divider"></div>
            
            <motion.button 
              className="action-btn ghost"
              onClick={() => onAction("snooze", event.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <BellOff size={18} />
              <span>7 Tage verschieben</span>
            </motion.button>
            
            <motion.button 
              className="action-btn ghost danger"
              onClick={() => onAction("dismiss", event.id)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <X size={18} />
              <span>Erinnerung verwerfen</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// Helper function to format contract name
const formatContractName = (name: string): string => {
  // Remove file extensions
  let formatted = name.replace(/\.(pdf|docx?|txt|png|jpg|jpeg)$/i, '');
  
  // Replace underscores with spaces
  formatted = formatted.replace(/_/g, ' ');
  
  // Remove date patterns like 20230627_193246
  formatted = formatted.replace(/\d{8}_?\d{6}/g, '');
  
  // Clean up multiple spaces
  formatted = formatted.replace(/\s+/g, ' ').trim();
  
  // If empty after cleaning, use original name
  if (!formatted) {
    formatted = name.split('.')[0];
  }
  
  // Capitalize first letter
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

  // Calendar tile styling
  const tileClassName = ({ date }: { date: Date }) => {
    const dateString = date.toISOString().split('T')[0];
    const dayEvents = filteredEvents.filter(e => 
      e.date && e.date.split('T')[0] === dateString
    );
    
    if (dayEvents.length === 0) return null;
    
    const hasCritical = dayEvents.some(e => e.severity === "critical");
    const hasWarning = dayEvents.some(e => e.severity === "warning");
    
    if (hasCritical) return "event-critical animated";
    if (hasWarning) return "event-warning animated";
    return "event-info animated";
  };

  const tileContent = ({ date }: { date: Date }) => {
    const dateString = date.toISOString().split('T')[0];
    const dayEvents = filteredEvents.filter(e => 
      e.date && e.date.split('T')[0] === dateString
    );
    
    if (dayEvents.length === 0) return null;
    
    const hasCritical = dayEvents.some(e => e.severity === "critical");
    const hasWarning = dayEvents.some(e => e.severity === "warning");
    
    return (
      <div className="event-indicators animated">
        {hasCritical && <span className="indicator critical pulse">●</span>}
        {hasWarning && !hasCritical && <span className="indicator warning pulse">●</span>}
        {!hasCritical && !hasWarning && <span className="indicator info">●</span>}
        {dayEvents.length > 1 && (
          <span className="event-count">{dayEvents.length}</span>
        )}
      </div>
    );
  };

  const handleDateClick = (value: Value) => {
    if (value instanceof Date) {
      setSelectedDate(value);
      
      const dateString = value.toISOString().split('T')[0];
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
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
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

  return (
    <>
      <Helmet>
        <title>Intelligenter Vertragskalender — Nie wieder Fristen verpassen | Contract AI</title>
        <meta name="description" content="Revolutionärer Vertragskalender mit automatischen Erinnerungen, 1-Klick-Kündigung und KI-gestützten Optimierungsvorschlägen. Sparen Sie Zeit und Geld!" />
      </Helmet>
      
      <div className="apple-calendar-page enhanced">
        <div className="calendar-bg animated">
          <div className="calendar-shape shape-1"></div>
          <div className="calendar-shape shape-2"></div>
          <div className="calendar-shape shape-3"></div>
        </div>
        
        <div className="calendar-container">
          <motion.div 
            className="calendar-header enhanced"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="calendar-icon animated gradient">
              <CalendarIconLucide size={28} />
            </div>
            <h1>Intelligenter Vertragskalender</h1>
            <p className="calendar-subtitle">
              Automatische Erinnerungen • 1-Klick-Kündigung • KI-Optimierung
            </p>
          </motion.div>
          
          {/* Enhanced Filter Bar */}
          <motion.div 
            className="filter-bar enhanced"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="filter-group">
              <label>
                <Filter size={16} />
                Dringlichkeit:
              </label>
              <select 
                value={filterSeverity} 
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="filter-select"
              >
                <option value="all">Alle</option>
                <option value="critical">🔴 Kritisch</option>
                <option value="warning">🟡 Warnung</option>
                <option value="info">🔵 Info</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>
                <FileText size={16} />
                Ereignistyp:
              </label>
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="filter-select"
              >
                <option value="all">Alle</option>
                <option value="CANCEL_WINDOW_OPEN">Kündigungsfenster</option>
                <option value="LAST_CANCEL_DAY">Letzte Chance</option>
                <option value="PRICE_INCREASE">Preiserhöhung</option>
                <option value="AUTO_RENEWAL">Verlängerung</option>
                <option value="REVIEW">Review</option>
              </select>
            </div>
            
            <motion.button 
              className={`refresh-btn gradient ${refreshing ? 'refreshing' : ''}`}
              onClick={handleRegenerateEvents}
              disabled={refreshing}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
              {refreshing ? "Aktualisiere..." : "Events neu generieren"}
            </motion.button>
          </motion.div>
          
          <div className="calendar-layout">
            <motion.div 
              className="calendar-main enhanced"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              {loading ? (
                <div className="calendar-loading">
                  <div className="spinner gradient"></div>
                  <p>Kalenderereignisse werden geladen...</p>
                </div>
              ) : error ? (
                <div className="calendar-error">
                  <AlertCircle size={24} />
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
                  />
                  
                  <div className="calendar-legend enhanced">
                    <motion.div 
                      className="legend-item"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="legend-dot critical pulse"></span>
                      <span className="legend-text">Kritisch - Sofort handeln</span>
                    </motion.div>
                    <motion.div 
                      className="legend-item"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="legend-dot warning pulse"></span>
                      <span className="legend-text">Warnung - Bald fällig</span>
                    </motion.div>
                    <motion.div 
                      className="legend-item"
                      whileHover={{ scale: 1.05 }}
                    >
                      <span className="legend-dot info"></span>
                      <span className="legend-text">Info - Zur Kenntnisnahme</span>
                    </motion.div>
                  </div>
                </>
              )}
            </motion.div>
            
            <div className="calendar-sidebar">
              {/* Enhanced Urgent Events */}
              <motion.div 
                className="sidebar-section urgent-events enhanced"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 className="section-title">
                  <div className="title-icon gradient">
                    <AlertCircle size={18} />
                  </div>
                  Dringende Ereignisse
                </h3>
                {getUpcomingCriticalEvents().length > 0 ? (
                  <div className="urgent-events-list">
                    {getUpcomingCriticalEvents().map((event, index) => {
                      const daysInfo = getDaysRemaining(event.date);
                      const formattedName = formatContractName(event.contractName);
                      
                      return (
                        <motion.div 
                          key={event.id} 
                          className={`event-card enhanced severity-${event.severity}`}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.1 * index }}
                          whileHover={{ scale: 1.02, x: 5 }}
                          onClick={() => {
                            setSelectedEvent(event);
                            setShowQuickActions(true);
                          }}
                        >
                          <div className="event-card-header">
                            <div className="event-title-group">
                              {getEventTypeIcon(event.type)}
                              <h4>{formattedName}</h4>
                            </div>
                            <span className={`days-badge ${daysInfo.urgent ? 'urgent' : ''}`}>
                              {daysInfo.text}
                            </span>
                          </div>
                          <p className="event-card-title">{event.title}</p>
                          <div className="event-card-footer">
                            <span className="event-date">
                              <CalendarIconLucide size={14} />
                              {new Date(event.date).toLocaleDateString('de-DE')}
                            </span>
                            {event.metadata?.suggestedAction && (
                              <motion.span 
                                className="suggested-action"
                                whileHover={{ scale: 1.1 }}
                              >
                                <Zap size={14} />
                                {event.metadata.suggestedAction === "cancel" ? "Kündigen" :
                                 event.metadata.suggestedAction === "compare" ? "Vergleichen" :
                                 event.metadata.suggestedAction === "review" ? "Prüfen" :
                                 "Handeln"}
                              </motion.span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="no-events enhanced">
                    <Sparkles size={24} style={{ color: '#FFD60A' }} />
                    <p>
                      {events.length === 0 
                        ? "Keine Events vorhanden. Laden Sie Verträge hoch oder klicken Sie auf 'Events neu generieren'."
                        : "Keine dringenden Ereignisse in den nächsten 30 Tagen - Sie können sich entspannen! 🎉"}
                    </p>
                  </div>
                )}
              </motion.div>
              
              {/* Enhanced Statistics */}
              <motion.div 
                className="sidebar-section calendar-stats enhanced"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <h3 className="section-title">
                  <div className="title-icon gradient">
                    <TrendingUp size={18} />
                  </div>
                  Statistiken
                </h3>
                <div className="stats-grid enhanced">
                  <motion.div 
                    className="stat-card gradient-border"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="stat-icon">
                      <FileText size={20} />
                    </div>
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Ereignisse gesamt</div>
                  </motion.div>
                  <motion.div 
                    className="stat-card critical"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="stat-icon">
                      <AlertCircle size={20} />
                    </div>
                    <div className="stat-value">{stats.critical}</div>
                    <div className="stat-label">Kritische Events</div>
                  </motion.div>
                  <motion.div 
                    className="stat-card warning"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="stat-icon">
                      <Clock size={20} />
                    </div>
                    <div className="stat-value">{stats.thisMonth}</div>
                    <div className="stat-label">Diesen Monat</div>
                  </motion.div>
                  <motion.div 
                    className="stat-card info"
                    whileHover={{ scale: 1.05 }}
                  >
                    <div className="stat-icon">
                      <Bell size={20} />
                    </div>
                    <div className="stat-value">{stats.notified}</div>
                    <div className="stat-label">Benachrichtigt</div>
                  </motion.div>
                  {stats.overdue > 0 && (
                    <motion.div 
                      className="stat-card overdue"
                      whileHover={{ scale: 1.05 }}
                    >
                      <div className="stat-icon">
                        <XCircle size={20} />
                      </div>
                      <div className="stat-value">{stats.overdue}</div>
                      <div className="stat-label">Überfällig</div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
              
              {/* Enhanced Features */}
              <motion.div 
                className="sidebar-section features enhanced"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <h3 className="section-title">
                  <div className="title-icon gradient">
                    <Sparkles size={18} />
                  </div>
                  Premium Features
                </h3>
                <div className="feature-list">
                  <motion.div 
                    className="feature-item"
                    whileHover={{ x: 5 }}
                  >
                    <div className="feature-icon-wrapper cancel">
                      <Zap size={16} />
                    </div>
                    <span>1-Klick-Kündigung direkt aus dem Kalender</span>
                  </motion.div>
                  <motion.div 
                    className="feature-item"
                    whileHover={{ x: 5 }}
                  >
                    <div className="feature-icon-wrapper notify">
                      <Bell size={16} />
                    </div>
                    <span>Intelligente Erinnerungen per E-Mail</span>
                  </motion.div>
                  <motion.div 
                    className="feature-item"
                    whileHover={{ x: 5 }}
                  >
                    <div className="feature-icon-wrapper compare">
                      <TrendingUp size={16} />
                    </div>
                    <span>Automatischer Marktvergleich</span>
                  </motion.div>
                  <motion.div 
                    className="feature-item"
                    whileHover={{ x: 5 }}
                  >
                    <div className="feature-icon-wrapper optimize">
                      <RefreshCw size={16} />
                    </div>
                    <span>KI-gestützte Optimierungsvorschläge</span>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
        
        <AnimatePresence>
          {showQuickActions && selectedEvent && (
            <QuickActionsModal
              event={selectedEvent}
              onAction={handleQuickAction}
              onClose={() => {
                setShowQuickActions(false);
                setSelectedEvent(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}