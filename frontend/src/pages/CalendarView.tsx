// src/pages/CalendarView.tsx
import { useEffect, useState, useCallback } from "react";
import { Helmet } from "react-helmet";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, 
  // Clock entfernt - wurde nicht verwendet
  X, 
  ChevronRight,
  Zap,
  TrendingUp,
  FileText,
  Bell,
  BellOff,
  RefreshCw,
  Filter,
  Calendar as CalendarIconLucide
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

  return (
    <motion.div
      className="quick-actions-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="quick-actions-modal"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="quick-actions-header">
          <div className="event-info">
            <span className={`severity-badge severity-${event.severity}`}>
              {event.severity === "critical" ? "🔴" : event.severity === "warning" ? "🟡" : "🔵"}
            </span>
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
          <p className="event-description">{event.description}</p>
          
          <div className="event-details">
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
              <span className="days-badge">{getDaysRemaining()}</span>
            </div>
          </div>

          <div className="quick-actions-buttons">
            {event.metadata?.suggestedAction === "cancel" && (
              <button 
                className="action-btn primary"
                onClick={handleCancel}
              >
                <Zap size={18} />
                <span>Jetzt kündigen</span>
                <ChevronRight size={16} />
              </button>
            )}
            
            <button 
              className="action-btn secondary"
              onClick={handleCompare}
            >
              <TrendingUp size={18} />
              <span>Alternativen vergleichen</span>
              <ChevronRight size={16} />
            </button>
            
            <button 
              className="action-btn secondary"
              onClick={handleOptimize}
            >
              <RefreshCw size={18} />
              <span>Vertrag optimieren</span>
              <ChevronRight size={16} />
            </button>
            
            <div className="action-divider"></div>
            
            <button 
              className="action-btn ghost"
              onClick={() => onAction("snooze", event.id)}
            >
              <BellOff size={18} />
              <span>7 Tage verschieben</span>
            </button>
            
            <button 
              className="action-btn ghost danger"
              onClick={() => onAction("dismiss", event.id)}
            >
              <X size={18} />
              <span>Erinnerung verwerfen</span>
            </button>
          </div>
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

  // Fetch Events from new Calendar API
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError("");
    
    try {
      // Versuche verschiedene Token-Namen
      const token = localStorage.getItem("token") || 
                    localStorage.getItem("authToken") || 
                    localStorage.getItem("jwtToken") ||
                    localStorage.getItem("accessToken") ||
                    sessionStorage.getItem("token") ||
                    sessionStorage.getItem("authToken");
      
      console.log("Token-Suche:", {
        token: !!token,
        localStorage: Object.keys(localStorage),
        sessionStorage: Object.keys(sessionStorage)
      });
      
      if (!token) {
        console.warn("Kein Token gefunden in localStorage/sessionStorage");
        // Versuche ohne Token - manche APIs nutzen Cookies
        console.log("Versuche Request ohne Token (Cookie-Auth)...");
      }

      // Request mit oder ohne Token (falls Cookie-Auth verwendet wird)
      const headers: Record<string, string> = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.get<ApiResponse<CalendarEvent>>("/api/calendar/events", {
        headers,
        withCredentials: true, // Wichtig für Cookie-Auth
        params: {
          from: new Date().toISOString(),
          to: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString() // Next year
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
      
      // Reload events
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
    
    // Get highest severity
    const hasCritical = dayEvents.some(e => e.severity === "critical");
    const hasWarning = dayEvents.some(e => e.severity === "warning");
    
    if (hasCritical) return "event-critical";
    if (hasWarning) return "event-warning";
    return "event-info";
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
      <div className="event-indicators">
        {hasCritical && <span className="indicator critical">●</span>}
        {hasWarning && !hasCritical && <span className="indicator warning">●</span>}
        {!hasCritical && !hasWarning && <span className="indicator info">●</span>}
        {dayEvents.length > 1 && (
          <span className="event-count">{dayEvents.length}</span>
        )}
      </div>
    );
  };

  const handleDateClick = (value: Value) => {
    // Prüfe ob value ein einzelnes Date ist
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
        // Show first event or create a selection modal
        setSelectedEvent(dayEvents[0]);
        setShowQuickActions(true);
      }
    } else if (Array.isArray(value) && value[0] instanceof Date) {
      // Falls es ein Date-Range ist, nehme das erste Datum
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
    
    if (diffDays === 0) return "Heute";
    if (diffDays === 1) return "Morgen";
    if (diffDays < 0) return "Abgelaufen";
    return `In ${diffDays} Tagen`;
  };

  return (
    <>
      <Helmet>
        <title>Intelligenter Vertragskalender — Nie wieder Fristen verpassen | Contract AI</title>
        <meta name="description" content="Revolutionärer Vertragskalender mit automatischen Erinnerungen, 1-Klick-Kündigung und KI-gestützten Optimierungsvorschlägen. Sparen Sie Zeit und Geld!" />
      </Helmet>
      
      <div className="apple-calendar-page enhanced">
        <div className="calendar-bg">
          <div className="calendar-shape shape-1"></div>
          <div className="calendar-shape shape-2"></div>
          <div className="calendar-shape shape-3"></div>
        </div>
        
        <div className="calendar-container">
          <div className="calendar-header">
            <div className="calendar-icon animated">
              <CalendarIconLucide size={28} />
            </div>
            <h1>Intelligenter Vertragskalender</h1>
            <p className="calendar-subtitle">
              Automatische Erinnerungen • 1-Klick-Kündigung • KI-Optimierung
            </p>
          </div>
          
          {/* Filter Bar */}
          <div className="filter-bar">
            <div className="filter-group">
              <label>
                <Filter size={16} />
                Dringlichkeit:
              </label>
              <select 
                value={filterSeverity} 
                onChange={(e) => setFilterSeverity(e.target.value)}
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
              className="refresh-btn"
              onClick={handleRegenerateEvents}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "spinning" : ""} />
              {refreshing ? "Aktualisiere..." : "Events neu generieren"}
            </button>
          </div>
          
          <div className="calendar-layout">
            <div className="calendar-main">
              {loading ? (
                <div className="calendar-loading">
                  <div className="spinner"></div>
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
                    <div className="legend-item">
                      <span className="legend-dot critical"></span>
                      <span className="legend-text">Kritisch - Sofort handeln</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot warning"></span>
                      <span className="legend-text">Warnung - Bald fällig</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-dot info"></span>
                      <span className="legend-text">Info - Zur Kenntnisnahme</span>
                    </div>
                  </div>
                </>
              )}
            </div>
            
            <div className="calendar-sidebar">
              <div className="sidebar-section urgent-events">
                <h3>
                  <AlertCircle size={18} />
                  Dringende Ereignisse
                </h3>
                {getUpcomingCriticalEvents().length > 0 ? (
                  <div className="urgent-events-list">
                    {getUpcomingCriticalEvents().map((event) => (
                      <motion.div 
                        key={event.id} 
                        className={`event-card severity-${event.severity}`}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => {
                          setSelectedEvent(event);
                          setShowQuickActions(true);
                        }}
                      >
                        <div className="event-card-header">
                          <h4>{event.metadata?.contractName || event.contractName}</h4>
                          <span className="days-badge">
                            {getDaysRemaining(event.date)}
                          </span>
                        </div>
                        <p className="event-card-title">{event.title}</p>
                        <div className="event-card-footer">
                          <span className="event-date">
                            <CalendarIconLucide size={14} />
                            {new Date(event.date).toLocaleDateString('de-DE')}
                          </span>
                          {event.metadata?.suggestedAction && (
                            <span className="suggested-action">
                              <Zap size={14} />
                              {event.metadata.suggestedAction === "cancel" ? "Kündigen" :
                               event.metadata.suggestedAction === "compare" ? "Vergleichen" :
                               event.metadata.suggestedAction === "review" ? "Prüfen" :
                               "Handeln"}
                            </span>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <p className="no-events">
                    {events.length === 0 
                      ? "Keine Events vorhanden. Laden Sie Verträge hoch oder klicken Sie auf 'Events neu generieren'."
                      : "Keine dringenden Ereignisse in den nächsten 30 Tagen"}
                  </p>
                )}
              </div>
              
              <div className="sidebar-section calendar-stats">
                <h3>Statistiken</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{events.length}</div>
                    <div className="stat-label">Ereignisse gesamt</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {events.filter(e => e.severity === "critical").length}
                    </div>
                    <div className="stat-label">Kritische Events</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">
                      {events.filter(e => e.status === "notified").length}
                    </div>
                    <div className="stat-label">Benachrichtigt</div>
                  </div>
                </div>
              </div>
              
              <div className="sidebar-section features">
                <h3>Premium Features</h3>
                <div className="feature-list">
                  <div className="feature-item">
                    <Zap size={16} className="feature-icon" />
                    <span>1-Klick-Kündigung direkt aus dem Kalender</span>
                  </div>
                  <div className="feature-item">
                    <Bell size={16} className="feature-icon" />
                    <span>Intelligente Erinnerungen per E-Mail</span>
                  </div>
                  <div className="feature-item">
                    <TrendingUp size={16} className="feature-icon" />
                    <span>Automatischer Marktvergleich</span>
                  </div>
                  <div className="feature-item">
                    <RefreshCw size={16} className="feature-icon" />
                    <span>KI-gestützte Optimierungsvorschläge</span>
                  </div>
                </div>
              </div>
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