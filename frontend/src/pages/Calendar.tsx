// src/pages/Calendar.tsx - Custom Calendar Redesign
import { useEffect, useState, useCallback, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Calendar as CalendarIcon,
  BarChart3,
  Link2,
  X,
  FileText,
  Clock,
  Zap,
  Target,
  TrendingUp,
  Bell
} from "lucide-react";
import axios from "axios";
import "../styles/AppleCalendar.css";
import CalendarSyncModal from "../components/CalendarSyncModal";

// ========== Types ==========
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
  };
  amount?: number;
}

interface ApiResponse {
  success: boolean;
  events?: CalendarEvent[];
  message?: string;
  result?: { redirect?: string; message?: string };
}

// ========== Helper Functions ==========
const formatContractName = (name: string): string => {
  let formatted = name.replace(/\.(pdf|docx?|txt|png|jpg|jpeg)$/i, '');
  formatted = formatted.replace(/_/g, ' ').replace(/\d{8}_?\d{6}/g, '').replace(/\s+/g, ' ').trim();
  if (!formatted) formatted = name.split('.')[0];
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
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

// German weekday names (Monday first)
const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];
const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// ========== Custom Calendar Grid ==========
interface CalendarGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate: Date | null;
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onMoreClick: (date: Date, events: CalendarEvent[]) => void;
}

function CustomCalendarGrid({ currentDate, events, selectedDate, onDateClick, onEventClick, onMoreClick }: CalendarGridProps) {
  // Get days in month
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

  // Get first day of month (0 = Sunday, 1 = Monday, etc.)
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1; // Convert to Monday-based (0 = Monday)
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const daysInPrevMonth = getDaysInMonth(year, month - 1);

  const today = new Date();
  const isToday = (d: number, m: number, y: number) =>
    d === today.getDate() && m === today.getMonth() && y === today.getFullYear();

  const isSelected = (d: number, m: number, y: number) =>
    selectedDate && d === selectedDate.getDate() && m === selectedDate.getMonth() && y === selectedDate.getFullYear();

  // Get events for a specific date
  const getEventsForDate = (day: number, monthOffset: number = 0) => {
    const targetDate = new Date(year, month + monthOffset, day);
    const dateString = targetDate.toISOString().split('T')[0];
    return events.filter(e => e.date && e.date.split('T')[0] === dateString);
  };

  // Build calendar days
  const calendarDays = [];

  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    calendarDays.push({ day, type: 'prev', events: getEventsForDate(day, -1) });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      type: 'current',
      events: getEventsForDate(day),
      isToday: isToday(day, month, year),
      isSelected: isSelected(day, month, year),
      isWeekend: (firstDayOfMonth + day - 1) % 7 >= 5
    });
  }

  // Next month days (fill to 42 cells = 6 rows)
  const remainingDays = 42 - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    calendarDays.push({ day, type: 'next', events: getEventsForDate(day, 1) });
  }

  return (
    <div className="calendar-grid">
      {/* Weekday Headers */}
      {WEEKDAYS.map((day, index) => (
        <div key={day} className={`weekday-header ${index >= 5 ? 'weekend' : ''}`}>
          {day}
        </div>
      ))}

      {/* Calendar Days */}
      {calendarDays.map((dayInfo, index) => {
        const dayClasses = [
          'calendar-day',
          dayInfo.type !== 'current' ? 'other-month' : '',
          dayInfo.isToday ? 'today' : '',
          dayInfo.isSelected ? 'selected' : '',
          dayInfo.isWeekend && dayInfo.type === 'current' ? 'weekend' : ''
        ].filter(Boolean).join(' ');

        return (
          <div
            key={index}
            className={dayClasses}
            onClick={() => {
              if (dayInfo.type === 'current') {
                onDateClick(new Date(year, month, dayInfo.day));
              }
            }}
          >
            <div className="day-number">{dayInfo.day}</div>
            <div className="day-events">
              {dayInfo.events.slice(0, 3).map((event) => (
                <div
                  key={event.id}
                  className={`event-pill ${event.severity}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                >
                  <div className="event-indicator"></div>
                  <span className="event-text">{formatContractName(event.contractName)}</span>
                </div>
              ))}
              {dayInfo.events.length > 3 && (
                <div
                  className="more-events clickable"
                  onClick={(e) => {
                    e.stopPropagation();
                    const targetDate = new Date(year, month + (dayInfo.type === 'prev' ? -1 : dayInfo.type === 'next' ? 1 : 0), dayInfo.day);
                    onMoreClick(targetDate, dayInfo.events);
                  }}
                >
                  +{dayInfo.events.length - 3} mehr
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ========== Quick Actions Modal ==========
interface QuickActionsModalProps {
  event: CalendarEvent;
  onAction: (action: string, eventId: string) => void;
  onClose: () => void;
}

function QuickActionsModal({ event, onAction, onClose }: QuickActionsModalProps) {
  const daysInfo = getDaysRemaining(event.date);

  const getSeverityColor = () => {
    switch(event.severity) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '480px',
          width: '100%',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: getSeverityColor(),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <AlertCircle size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                {formatContractName(event.contractName)}
              </h3>
              <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#64748b' }}>
                {event.title}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              background: '#f1f5f9',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '24px' }}>
          {/* Meta Info */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '24px'
          }}>
            <div style={{
              padding: '12px',
              background: '#f8fafc',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <CalendarIcon size={18} style={{ color: '#6366f1' }} />
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Datum</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                  {new Date(event.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>
            <div style={{
              padding: '12px',
              background: daysInfo.urgent ? 'rgba(239,68,68,0.1)' : '#f8fafc',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Clock size={18} style={{ color: daysInfo.urgent ? '#ef4444' : '#6366f1' }} />
              <div>
                <div style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}>Verbleibend</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: daysInfo.urgent ? '#ef4444' : '#0f172a' }}>
                  {daysInfo.text}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button
              onClick={() => window.location.href = `/contracts?view=${event.contractId}`}
              style={{
                padding: '14px',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <FileText size={18} />
              Vertrag anzeigen
            </button>
            <button
              onClick={() => onAction('cancel', event.id)}
              style={{
                padding: '14px',
                background: '#6366f1',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                color: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Zap size={18} />
              Handeln
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========== Day Events Modal ==========
interface DayEventsModalProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onClose: () => void;
}

function DayEventsModal({ date, events, onEventClick, onClose }: DayEventsModalProps) {
  return (
    <motion.div
      className="modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '500px',
          width: '100%',
          maxHeight: '80vh',
          boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: '#6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <CalendarIcon size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                {date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '14px', color: '#64748b' }}>
                {events.length} Ereignis{events.length !== 1 ? 'se' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: '32px',
              height: '32px',
              border: 'none',
              background: '#f1f5f9',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Events List */}
        <div style={{ padding: '16px 24px', overflowY: 'auto', flex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {events.map(event => {
              const daysInfo = getDaysRemaining(event.date);
              const severityColors: Record<string, { bg: string; text: string; border: string }> = {
                critical: { bg: 'rgba(239,68,68,0.1)', text: '#dc2626', border: '#ef4444' },
                warning: { bg: 'rgba(245,158,11,0.1)', text: '#d97706', border: '#f59e0b' },
                info: { bg: 'rgba(59,130,246,0.1)', text: '#2563eb', border: '#3b82f6' }
              };
              const colors = severityColors[event.severity] || severityColors.info;

              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px',
                    background: colors.bg,
                    borderRadius: '12px',
                    borderLeft: `4px solid ${colors.border}`,
                    cursor: 'pointer',
                    transition: 'transform 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'}
                  onMouseLeave={(e) => e.currentTarget.style.transform = 'translateX(0)'}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a', marginBottom: '4px' }}>
                      {formatContractName(event.contractName)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                      {event.title}
                    </div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: '20px',
                    background: colors.bg,
                    color: colors.text,
                    fontSize: '12px',
                    fontWeight: 600,
                    whiteSpace: 'nowrap'
                  }}>
                    {daysInfo.text}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========== Main Calendar Page ==========
export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [currentView, setCurrentView] = useState<'month' | 'week' | 'day'>('month');
  const [urgentPage, setUrgentPage] = useState(0);
  const [dayEventsModal, setDayEventsModal] = useState<{ date: Date; events: CalendarEvent[] } | null>(null);

  const EVENTS_PER_PAGE = 5;

  // Fetch Events
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoading(false);
        return;
      }

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 60);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 365);

      const response = await axios.get<ApiResponse>("/api/calendar/events", {
        headers: { Authorization: `Bearer ${token}` },
        params: { from: pastDate.toISOString(), to: futureDate.toISOString() }
      });

      if (response.data.success && response.data.events) {
        setEvents(response.data.events);
        setFilteredEvents(response.data.events);
      }
    } catch (err) {
      console.error("Error fetching events:", err);
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

  // Regenerate events
  const handleRegenerateEvents = async () => {
    setRefreshing(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/calendar/regenerate-all", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchEvents();
    } catch (err) {
      console.error("Error regenerating events:", err);
    } finally {
      setRefreshing(false);
    }
  };

  // Handle Quick Action
  const handleQuickAction = async (action: string, eventId: string) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.post<ApiResponse>("/api/calendar/quick-action", {
        eventId, action, data: action === "snooze" ? { days: 7 } : {}
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (response.data.success) {
        if (response.data.result?.redirect) {
          window.location.href = response.data.result.redirect;
        } else {
          await fetchEvents();
          setShowQuickActions(false);
          setSelectedEvent(null);
        }
      }
    } catch (err) {
      console.error("Error executing action:", err);
    }
  };

  // Navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + (direction === 'prev' ? -1 : 1));
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Statistics
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = events.filter(e => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const critical = events.filter(e => e.severity === 'critical');
    const past = events.filter(e => new Date(e.date) < now);
    return {
      total: events.length,
      critical: critical.length,
      thisMonth: thisMonth.length,
      past: past.length
    };
  }, [events]);

  // Urgent Events (next 60 days - all upcoming events, sorted by urgency)
  const urgentEvents = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const future = new Date();
    future.setDate(future.getDate() + 60);
    return filteredEvents
      .filter(e => {
        const d = new Date(e.date);
        return d >= now && d <= future;
      })
      .sort((a, b) => {
        // Sort by severity first (critical > warning > info), then by date
        const severityOrder: Record<string, number> = { critical: 0, warning: 1, info: 2 };
        const severityDiff = (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3);
        if (severityDiff !== 0) return severityDiff;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  }, [filteredEvents]);

  const paginatedUrgent = urgentEvents.slice(urgentPage * EVENTS_PER_PAGE, (urgentPage + 1) * EVENTS_PER_PAGE);
  const totalPages = Math.ceil(urgentEvents.length / EVENTS_PER_PAGE);

  return (
    <>
      <Helmet>
        <title>Vertragskalender | Contract AI</title>
      </Helmet>

      <div className="calendar-page">
        <div className="calendar-page-content">
          {/* Page Header */}
          <header className="page-header">
            <div className="page-title">
              <div className="page-title-icon">
                <CalendarIcon size={24} />
              </div>
              <div>
                <h1>Vertragskalender</h1>
                <p>Alle Fristen im Blick - nie wieder eine Deadline verpassen</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="btn btn-secondary" onClick={() => setShowSyncModal(true)}>
                <Link2 size={16} />
                Kalender Sync
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleRegenerateEvents}
                disabled={refreshing}
              >
                <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
                {refreshing ? 'Lädt...' : 'Aktualisieren'}
              </button>
            </div>
          </header>

          {/* Main Content Grid */}
          <div className="content-grid">
            {/* Calendar Container */}
            <div className="calendar-container">
              {/* Calendar Header */}
              <div className="calendar-header">
                <div className="calendar-nav">
                  <button className="nav-btn" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft size={20} />
                  </button>
                  <button className="nav-btn" onClick={() => navigateMonth('next')}>
                    <ChevronRight size={20} />
                  </button>
                  <button className="today-btn" onClick={goToToday}>Heute</button>
                </div>
                <div className="current-month">
                  {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                </div>
                <div className="view-switcher">
                  {(['month', 'week', 'day'] as const).map(view => (
                    <button
                      key={view}
                      className={`view-btn ${currentView === view ? 'active' : ''}`}
                      onClick={() => setCurrentView(view)}
                    >
                      {view === 'month' ? 'Monat' : view === 'week' ? 'Woche' : 'Tag'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Calendar Grid */}
              {loading ? (
                <div className="loading">
                  <div className="loading-spinner"></div>
                  <p>Lade Kalender...</p>
                </div>
              ) : (
                <CustomCalendarGrid
                  currentDate={currentDate}
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  onDateClick={(date) => setSelectedDate(date)}
                  onEventClick={(event) => {
                    setSelectedEvent(event);
                    setShowQuickActions(true);
                  }}
                  onMoreClick={(date, events) => setDayEventsModal({ date, events })}
                />
              )}

              {/* Legend */}
              <div className="calendar-legend">
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
            </div>

            {/* Sidebar */}
            <aside className="sidebar">
              {/* Stats Card */}
              <div className="sidebar-card">
                <div className="sidebar-card-header">
                  <div className="sidebar-card-title">
                    <BarChart3 size={18} />
                    Übersicht
                  </div>
                </div>
                <div className="stats-grid">
                  <div className="stat-card" onClick={() => { setFilterSeverity('all'); setFilterType('all'); }}>
                    <div className="stat-value">{stats.total}</div>
                    <div className="stat-label">Ereignisse</div>
                  </div>
                  <div className="stat-card critical" onClick={() => { setFilterSeverity('critical'); setFilterType('all'); }}>
                    <div className="stat-value">{stats.critical}</div>
                    <div className="stat-label">Kritisch</div>
                  </div>
                  <div className="stat-card warning" onClick={() => { setFilterSeverity('warning'); setFilterType('all'); }}>
                    <div className="stat-value">{stats.thisMonth}</div>
                    <div className="stat-label">Diesen Monat</div>
                  </div>
                  <div className="stat-card" onClick={() => { setFilterSeverity('all'); setFilterType('all'); }}>
                    <div className="stat-value">{stats.past}</div>
                    <div className="stat-label">Vergangen</div>
                  </div>
                </div>
              </div>

              {/* Urgent Events */}
              <div className="sidebar-card">
                <div className="sidebar-card-header">
                  <div className="sidebar-card-title">
                    <AlertCircle size={18} />
                    Dringende Ereignisse
                  </div>
                  {urgentEvents.length > 0 && (
                    <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>
                      {urgentEvents.length} offen
                    </span>
                  )}
                </div>

                {paginatedUrgent.length > 0 ? (
                  <>
                    <div className="urgent-events-list">
                      {paginatedUrgent.map(event => {
                        const daysInfo = getDaysRemaining(event.date);
                        return (
                          <div
                            key={event.id}
                            className="urgent-event-item"
                            onClick={() => {
                              setSelectedEvent(event);
                              setShowQuickActions(true);
                            }}
                          >
                            <div className={`urgent-event-indicator ${event.severity}`}></div>
                            <div className="urgent-event-content">
                              <div className="urgent-event-title">
                                {formatContractName(event.contractName)}
                              </div>
                              <div className="urgent-event-desc">{event.title}</div>
                              <div className="urgent-event-meta">
                                <span className="urgent-event-date">
                                  {new Date(event.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })}
                                </span>
                              </div>
                            </div>
                            <div className={`urgent-event-badge ${event.severity}`}>
                              {daysInfo.text}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {totalPages > 1 && (
                      <div className="pagination">
                        <button
                          className="pagination-btn"
                          onClick={() => setUrgentPage(p => Math.max(0, p - 1))}
                          disabled={urgentPage === 0}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span className="pagination-info">{urgentPage + 1} / {totalPages}</span>
                        <button
                          className="pagination-btn"
                          onClick={() => setUrgentPage(p => Math.min(totalPages - 1, p + 1))}
                          disabled={urgentPage >= totalPages - 1}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="no-events">
                    <Bell size={32} />
                    <p>Keine dringenden Ereignisse</p>
                  </div>
                )}
              </div>

              {/* Filter Card */}
              <div className="sidebar-card">
                <div className="sidebar-card-header">
                  <div className="sidebar-card-title">
                    <Target size={18} />
                    Filter
                  </div>
                </div>
                <div className="filter-section">
                  <div className="filter-group">
                    <label className="filter-label">Dringlichkeit</label>
                    <select
                      className="filter-select"
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value)}
                    >
                      <option value="all">Alle</option>
                      <option value="critical">Kritisch</option>
                      <option value="warning">Warnung</option>
                      <option value="info">Info</option>
                    </select>
                  </div>
                  <div className="filter-group">
                    <label className="filter-label">Ereignistyp</label>
                    <select
                      className="filter-select"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                    >
                      <option value="all">Alle</option>
                      <option value="CANCEL_WINDOW_OPEN">Kündigungsfenster</option>
                      <option value="LAST_CANCEL_DAY">Letzte Chance</option>
                      <option value="PRICE_INCREASE">Preiserhöhung</option>
                      <option value="AUTO_RENEWAL">Auto-Verlängerung</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="sidebar-card">
                <div className="sidebar-card-header">
                  <div className="sidebar-card-title">
                    <Zap size={18} />
                    Schnellaktionen
                  </div>
                </div>
                <div className="quick-actions">
                  <button className="quick-action-btn" onClick={() => setShowSyncModal(true)}>
                    <Link2 size={18} />
                    Kalender synchronisieren
                  </button>
                  <button className="quick-action-btn" onClick={() => window.location.href = '/contracts'}>
                    <FileText size={18} />
                    Alle Verträge anzeigen
                  </button>
                  <button className="quick-action-btn" onClick={() => window.location.href = '/compare'}>
                    <TrendingUp size={18} />
                    Verträge vergleichen
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      {/* Modals */}
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
        {dayEventsModal && (
          <DayEventsModal
            date={dayEventsModal.date}
            events={dayEventsModal.events}
            onEventClick={(event) => {
              setDayEventsModal(null);
              setSelectedEvent(event);
              setShowQuickActions(true);
            }}
            onClose={() => setDayEventsModal(null)}
          />
        )}
      </AnimatePresence>

      <CalendarSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .spinning {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </>
  );
}
