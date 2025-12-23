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
  Bell,
  AlertTriangle,
  Info,
  Sparkles,
  ArrowRight,
  BellOff,
  Plus
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

// ========== Quick Actions Modal (Premium Design) ==========
interface QuickActionsModalProps {
  event: CalendarEvent;
  allEvents?: CalendarEvent[]; // For pagination through multiple events
  onAction: (action: string, eventId: string) => void;
  onClose: () => void;
  onEventChange?: (event: CalendarEvent) => void; // Callback when navigating to different event
}

function QuickActionsModal({ event, allEvents, onAction, onClose, onEventChange }: QuickActionsModalProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [currentIndex, setCurrentIndex] = useState(() => {
    if (allEvents && allEvents.length > 1) {
      return allEvents.findIndex(e => e.id === event.id);
    }
    return 0;
  });

  // Get current event from allEvents or use the single event
  const currentEvent = allEvents && allEvents.length > 1 ? allEvents[currentIndex] : event;
  const hasPagination = allEvents && allEvents.length > 1;
  const totalEvents = allEvents?.length || 1;

  const goToPrev = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      if (onEventChange && allEvents) {
        onEventChange(allEvents[newIndex]);
      }
    }
  };

  const goToNext = () => {
    if (allEvents && currentIndex < allEvents.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      if (onEventChange && allEvents) {
        onEventChange(allEvents[newIndex]);
      }
    }
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleViewContract = () => {
    window.location.href = `/contracts?view=${currentEvent.contractId}`;
    onClose();
  };

  const formatDate = () => {
    return new Date(currentEvent.date).toLocaleDateString('de-DE', {
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const getSeverityStyle = () => {
    switch(currentEvent.severity) {
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
  const daysInfo = getDaysRemaining(currentEvent.date);

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
              <h3>{formatContractName(currentEvent.contractName)}</h3>
              <p>{currentEvent.title}</p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Pagination Controls */}
        {hasPagination && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '12px 20px',
            background: 'rgba(79, 70, 229, 0.05)',
            borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
          }}>
            <motion.button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              whileHover={{ scale: currentIndex > 0 ? 1.1 : 1 }}
              whileTap={{ scale: currentIndex > 0 ? 0.9 : 1 }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: currentIndex > 0 ? '#4f46e5' : 'rgba(0, 0, 0, 0.1)',
                color: currentIndex > 0 ? '#fff' : '#9ca3af',
                cursor: currentIndex > 0 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronLeft size={20} />
            </motion.button>
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#4b5563',
              minWidth: '60px',
              textAlign: 'center'
            }}>
              {currentIndex + 1} / {totalEvents}
            </span>
            <motion.button
              onClick={goToNext}
              disabled={currentIndex >= totalEvents - 1}
              whileHover={{ scale: currentIndex < totalEvents - 1 ? 1.1 : 1 }}
              whileTap={{ scale: currentIndex < totalEvents - 1 ? 0.9 : 1 }}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: currentIndex < totalEvents - 1 ? '#4f46e5' : 'rgba(0, 0, 0, 0.1)',
                color: currentIndex < totalEvents - 1 ? '#fff' : '#9ca3af',
                cursor: currentIndex < totalEvents - 1 ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ChevronRight size={20} />
            </motion.button>
          </div>
        )}

        <div className="modal-content-premium">
          <div className="event-description-premium">
            <Sparkles size={16} className="description-icon" />
            <p>{currentEvent.description}</p>
          </div>

          <div className="event-meta-grid">
            <div className="meta-card">
              <CalendarIcon size={18} className="meta-icon" />
              <div>
                <span className="meta-label">Datum</span>
                <span className="meta-value">{formatDate()}</span>
              </div>
            </div>
            <div className="meta-card">
              <Clock size={18} className="meta-icon" />
              <div>
                <span className="meta-label">Verbleibend</span>
                <span className="meta-value" style={{ color: severityStyle.color }}>
                  {daysInfo.text}
                </span>
              </div>
            </div>
          </div>

          <div className="modal-actions-grid">
            <motion.button
              className="action-btn-premium view-contract"
              onClick={handleViewContract}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                gridColumn: '1 / -1',
                background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
                color: '#fff',
                border: 'none',
                padding: '14px 20px',
                borderRadius: '12px',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer'
              }}
            >
              <FileText size={18} />
              <span>Vertrag anzeigen</span>
              <ArrowRight size={16} className="action-arrow" />
            </motion.button>

            {currentEvent.metadata?.suggestedAction === "cancel" && (
              <motion.button
                className="action-btn-premium primary"
                onClick={() => onAction("cancel", currentEvent.id)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  gridColumn: '1 / -1',
                  background: 'linear-gradient(135deg, #ef4444, #f87171)',
                  color: '#fff',
                  border: 'none',
                  padding: '14px 20px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  cursor: 'pointer'
                }}
              >
                <Zap size={18} />
                <span>Jetzt kündigen</span>
                <ArrowRight size={16} className="action-arrow" />
              </motion.button>
            )}

            {/* Action Buttons - Equal Width Grid */}
            <div style={{
              gridColumn: '1 / -1',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginTop: '8px'
            }}>
              <motion.button
                onClick={() => onAction("compare", currentEvent.id)}
                whileHover={{ scale: 1.02, background: 'linear-gradient(135deg, #10b981, #34d399)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <TrendingUp size={20} />
                <span>Vergleichen</span>
              </motion.button>

              <motion.button
                onClick={() => onAction("optimize", currentEvent.id)}
                whileHover={{ scale: 1.02, background: 'linear-gradient(135deg, #8b5cf6, #a78bfa)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <RefreshCw size={20} />
                <span>Optimieren</span>
              </motion.button>

              <motion.button
                onClick={() => onAction("snooze", currentEvent.id)}
                whileHover={{ scale: 1.02, background: 'linear-gradient(135deg, #64748b, #94a3b8)' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  background: 'linear-gradient(135deg, #475569, #64748b)',
                  color: '#fff',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '13px'
                }}
              >
                <BellOff size={20} />
                <span>Später</span>
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========== Stats Detail Modal (Timeline View from Backup) ==========
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

  // Safety check for events
  const safeEvents = Array.isArray(events) ? events : [];

  // Helper: Format date as DD.MM.YYYY
  const formatDateFull = (dateStr: string): string => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'Kein Datum';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };

  // Helper: Get relative days text
  const getRelativeDays = (dateStr: string): string => {
    const eventDate = new Date(dateStr);
    if (isNaN(eventDate.getTime())) return '';

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    const diffTime = eventDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Heute';
    if (diffDays === 1) return 'Morgen';
    if (diffDays === -1) return 'Gestern';
    if (diffDays > 0) return `in ${diffDays} Tagen`;
    return `vor ${Math.abs(diffDays)} Tagen`;
  };

  // Check if this is a "past" events modal
  const isPastEvents = title.toLowerCase().includes('vergangen');

  // Filter out events without valid dates and sort by date
  const validEvents = safeEvents.filter(e => e && e.date);
  const sortedEvents = [...validEvents].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    if (isNaN(dateA.getTime())) return 1;
    if (isNaN(dateB.getTime())) return -1;
    // For past events: newest first (descending)
    // For upcoming events: nearest first (ascending)
    return isPastEvents
      ? dateB.getTime() - dateA.getTime()
      : dateA.getTime() - dateB.getTime();
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  return (
    <motion.div
      className="quick-actions-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ padding: isMobile ? '20px' : '40px', zIndex: 1001 }}
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
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(79, 70, 229, 0.05))',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            position: 'sticky',
            top: 0,
            zIndex: 10
          }}>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? '20px' : '24px', fontWeight: 700, color: '#1f2937' }}>
                {title}
              </h2>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                {safeEvents.length} {safeEvents.length === 1 ? 'Ereignis' : 'Ereignisse'}
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
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </motion.button>
          </div>

          {/* Simple Events List */}
          <div style={{ padding: isMobile ? '20px' : '30px', maxHeight: '60vh', overflowY: 'auto' }}>
            {sortedEvents.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
                <Sparkles size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                <p style={{ fontSize: '16px', fontWeight: 500 }}>Keine Ereignisse gefunden</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {sortedEvents.map((event, index) => (
                  <div
                    key={event.id || `event-${index}`}
                    onClick={() => onEventClick(event)}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e5e7eb',
                      borderLeft: `4px solid ${getSeverityColor(event.severity || 'info')}`,
                      borderRadius: '8px',
                      padding: '16px',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        color: getSeverityColor(event.severity || 'info'),
                        textTransform: 'uppercase'
                      }}>
                        {event.severity === 'critical' ? 'Kritisch' : event.severity === 'warning' ? 'Warnung' : 'Info'}
                      </span>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500 }}>
                          {event.date ? formatDateFull(event.date) : 'Kein Datum'}
                        </span>
                        {event.date && (
                          <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '8px' }}>
                            ({getRelativeDays(event.date)})
                          </span>
                        )}
                      </div>
                    </div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                      {event.contractName ? formatContractName(event.contractName) : 'Unbekannter Vertrag'}
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#6b7280' }}>
                      {event.title || 'Keine Beschreibung'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
    </motion.div>
  );
}

// ========== Day Events Modal (Premium Design) ==========
interface DayEventsModalProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onClose: () => void;
}

function DayEventsModal({ date, events, onEventClick, onClose }: DayEventsModalProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle size={18} style={{ color: '#ef4444' }} />;
      case 'warning': return <AlertTriangle size={18} style={{ color: '#f59e0b' }} />;
      default: return <Info size={18} style={{ color: '#3b82f6' }} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  return (
    <motion.div
      className="quick-actions-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ padding: isMobile ? '20px' : '40px', zIndex: 1001 }}
    >
      <motion.div
        className="premium-modal"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? '100%' : '600px',
          width: isMobile ? 'calc(100% - 40px)' : '600px',
          maxHeight: isMobile ? '90vh' : '80vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{
          padding: isMobile ? '20px' : '30px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.05), rgba(99, 102, 241, 0.05))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: isMobile ? '20px' : '24px',
              fontWeight: 700,
              color: '#1f2937'
            }}>
              {date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' })}
            </h2>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              {events.length} Ereignis{events.length !== 1 ? 'se' : ''}
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
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </motion.button>
        </div>

        {/* Events List */}
        <div style={{ padding: isMobile ? '20px' : '30px' }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9ca3af' }}>
              <Sparkles size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <p style={{ fontSize: '16px', fontWeight: 500 }}>Keine Ereignisse an diesem Tag</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {events.map((event, index) => {
                const daysInfo = getDaysRemaining(event.date);
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => onEventClick(event)}
                    whileHover={{ scale: 1.02, x: 5 }}
                    style={{
                      background: '#ffffff',
                      border: `1px solid ${getSeverityColor(event.severity)}30`,
                      borderRadius: '12px',
                      padding: isMobile ? '16px' : '20px',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Left border accent */}
                    <div style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      width: '4px',
                      height: '100%',
                      background: `linear-gradient(180deg, ${getSeverityColor(event.severity)}, ${getSeverityColor(event.severity)}80)`
                    }} />

                    {/* Header */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: '12px',
                      marginBottom: '12px',
                      paddingLeft: '12px'
                    }}>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        {getSeverityIcon(event.severity)}
                        <span style={{
                          fontSize: '12px',
                          fontWeight: 600,
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
                        fontWeight: 500,
                        color: '#9ca3af',
                        whiteSpace: 'nowrap'
                      }}>
                        {daysInfo.text}
                      </span>
                    </div>

                    {/* Title & Description */}
                    <div style={{ paddingLeft: '12px' }}>
                      <h4 style={{
                        margin: '0 0 8px 0',
                        fontSize: isMobile ? '15px' : '16px',
                        fontWeight: 600,
                        color: '#1f2937'
                      }}>
                        {formatContractName(event.contractName)}
                      </h4>
                      <p style={{
                        margin: 0,
                        fontSize: '14px',
                        color: '#6b7280',
                        lineHeight: 1.5
                      }}>
                        {event.title}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========== Create Event Modal ==========
interface CreateEventModalProps {
  date: Date;
  onClose: () => void;
}

function CreateEventModal({ date, onClose }: CreateEventModalProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCreateEvent = () => {
    // TODO: Implement direct event creation
    // For now, navigate to contracts with create event intent
    window.location.href = `/contracts?createEvent=true&date=${date.toISOString().split('T')[0]}`;
    onClose();
  };

  const handleUploadContract = () => {
    window.location.href = '/contracts?upload=true';
    onClose();
  };

  return (
    <motion.div
      className="quick-actions-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ padding: isMobile ? '20px' : '40px', zIndex: 1001 }}
    >
      <motion.div
        className="premium-modal"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? '100%' : '450px',
          width: isMobile ? 'calc(100% - 40px)' : '450px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: isMobile ? '20px' : '30px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(79, 70, 229, 0.05))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              margin: 0,
              fontSize: isMobile ? '18px' : '22px',
              fontWeight: 700,
              color: '#1f2937'
            }}>
              Ereignis erstellen
            </h2>
            <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
              {date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
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
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </motion.button>
        </div>

        {/* Options */}
        <div style={{ padding: isMobile ? '20px' : '30px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <motion.button
            onClick={handleCreateEvent}
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(79, 70, 229, 0.04))',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '14px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <CalendarIcon size={24} style={{ color: '#fff' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                Ereignis direkt erstellen
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                Fügen Sie ein neues Ereignis hinzu
              </p>
            </div>
            <ChevronRight size={20} style={{ marginLeft: 'auto', color: '#9ca3af' }} />
          </motion.button>

          <motion.button
            onClick={handleUploadContract}
            whileHover={{ scale: 1.02, x: 5 }}
            whileTap={{ scale: 0.98 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '20px',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.04))',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              borderRadius: '14px',
              cursor: 'pointer',
              textAlign: 'left'
            }}
          >
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <FileText size={24} style={{ color: '#fff' }} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1f2937' }}>
                Vertrag hochladen
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                Laden Sie einen neuen Vertrag hoch
              </p>
            </div>
            <ChevronRight size={20} style={{ marginLeft: 'auto', color: '#9ca3af' }} />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========== Snooze Modal ==========
interface SnoozeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSnooze: (days: number) => void;
}

function SnoozeModal({ isOpen, onClose, onSnooze }: SnoozeModalProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  const snoozeOptions = [
    { days: 1, label: 'Morgen', icon: '🌅', description: 'In 1 Tag erinnern' },
    { days: 3, label: 'In 3 Tagen', icon: '📅', description: 'Kurze Pause' },
    { days: 7, label: 'In 1 Woche', icon: '📆', description: 'Nächste Woche erinnern' },
    { days: 14, label: 'In 2 Wochen', icon: '🗓️', description: 'In 14 Tagen erinnern' },
    { days: 30, label: 'In 1 Monat', icon: '📋', description: 'Nächsten Monat erinnern' },
  ];

  return (
    <motion.div
      className="quick-actions-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ padding: isMobile ? '20px' : '40px', zIndex: 1002 }}
    >
      <motion.div
        className="premium-modal"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? '100%' : '420px',
          width: isMobile ? 'calc(100% - 40px)' : '420px',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: isMobile ? '20px' : '24px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          background: 'linear-gradient(135deg, rgba(71, 85, 105, 0.08), rgba(100, 116, 139, 0.04))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #475569, #64748b)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <BellOff size={22} style={{ color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: isMobile ? '18px' : '20px', fontWeight: 700, color: '#1f2937' }}>
                Später erinnern
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                Wann sollen wir Sie erinnern?
              </p>
            </div>
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
              cursor: 'pointer'
            }}
          >
            <X size={20} />
          </motion.button>
        </div>

        {/* Options */}
        <div style={{ padding: isMobile ? '16px' : '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {snoozeOptions.map((option) => (
            <motion.button
              key={option.days}
              onClick={() => onSnooze(option.days)}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                padding: '16px',
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
              }}
            >
              <span style={{ fontSize: '24px' }}>{option.icon}</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                  {option.label}
                </h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#9ca3af' }}>
                  {option.description}
                </p>
              </div>
              <ChevronRight size={18} style={{ color: '#9ca3af' }} />
            </motion.button>
          ))}
        </div>

        {/* Cancel Button */}
        <div style={{ padding: '0 20px 20px 20px' }}>
          <motion.button
            onClick={onClose}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{
              width: '100%',
              padding: '12px',
              background: 'transparent',
              border: '1px solid #e5e7eb',
              borderRadius: '10px',
              color: '#6b7280',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            Abbrechen
          </motion.button>
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
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedStatFilter, setSelectedStatFilter] = useState<"upcoming" | "past" | "cancelable" | "autoRenewal">("upcoming");
  const [showCreateEventModal, setShowCreateEventModal] = useState<Date | null>(null);
  const [allDayEventsForPagination, setAllDayEventsForPagination] = useState<CalendarEvent[]>([]);
  const [showSnoozeModal, setShowSnoozeModal] = useState(false);
  const [snoozeEventId, setSnoozeEventId] = useState<string | null>(null);

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
  const handleQuickAction = async (action: string, eventId: string, snoozeDays?: number) => {
    // If snooze action without days, open the snooze modal
    if (action === "snooze" && !snoozeDays) {
      setSnoozeEventId(eventId);
      setShowSnoozeModal(true);
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post<ApiResponse>("/api/calendar/quick-action", {
        eventId, action, data: action === "snooze" ? { days: snoozeDays || 7 } : {}
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (response.data.success) {
        if (response.data.result?.redirect) {
          window.location.href = response.data.result.redirect;
        } else {
          await fetchEvents();
          setShowQuickActions(false);
          setShowSnoozeModal(false);
          setSnoozeEventId(null);
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

  // Statistics - Kommende, Vergangene, Kündbar, Auto-Verlängerung
  const stats = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Kommende Ereignisse (Zukunft)
    const upcoming = events.filter(e => new Date(e.date) >= now);

    // Vergangene Ereignisse
    const past = events.filter(e => new Date(e.date) < now);

    // Kündbar (Kündigungsfenster offen oder Letzte Chance)
    const cancelable = events.filter(e =>
      e.type === 'CANCEL_WINDOW_OPEN' || e.type === 'LAST_CANCEL_DAY'
    );

    // Auto-Verlängerung
    const autoRenewal = events.filter(e => e.type === 'AUTO_RENEWAL');

    return {
      upcoming: upcoming.length,
      past: past.length,
      cancelable: cancelable.length,
      autoRenewal: autoRenewal.length
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

  // Handle Stats Card Click - Opens Modal
  const handleStatsCardClick = (filterType: "upcoming" | "past" | "cancelable" | "autoRenewal") => {
    setSelectedStatFilter(filterType);
    setShowStatsModal(true);
  };

  // Get filtered events for stats modal
  const getFilteredStatsEvents = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    switch (selectedStatFilter) {
      case "upcoming":
        return events.filter(e => e.date && new Date(e.date) >= now);
      case "past":
        return events.filter(e => e.date && new Date(e.date) < now);
      case "cancelable":
        return events.filter(e => e.type === 'CANCEL_WINDOW_OPEN' || e.type === 'LAST_CANCEL_DAY');
      case "autoRenewal":
        return events.filter(e => e.type === 'AUTO_RENEWAL');
      default:
        return events;
    }
  };

  // Get title for stats modal
  const getStatsModalTitle = () => {
    switch (selectedStatFilter) {
      case "upcoming": return "Kommende Ereignisse";
      case "past": return "Vergangene Ereignisse";
      case "cancelable": return "Kündbare Verträge";
      case "autoRenewal": return "Auto-Verlängerungen";
      default: return "Alle Ereignisse";
    }
  };

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
              <button className="btn btn-primary" onClick={() => window.location.href = '/contracts?upload=true'}>
                <Plus size={16} />
                Vertrag hochladen
              </button>
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
          <div className="content-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 340px',
            gap: '24px'
          }}>
            {/* Calendar Container */}
            <div className="calendar-container" style={{ gridColumn: '1' }}>
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
                  onDateClick={(date) => {
                    setSelectedDate(date);
                    // Check if this date has events
                    const dateStr = date.toISOString().split('T')[0];
                    const dayEvents = filteredEvents.filter(e => e.date && e.date.split('T')[0] === dateStr);

                    if (dayEvents.length === 0) {
                      // No events - show create event modal
                      setShowCreateEventModal(date);
                    } else if (dayEvents.length === 1) {
                      // Single event - show quick actions (no pagination)
                      setAllDayEventsForPagination([]);
                      setSelectedEvent(dayEvents[0]);
                      setShowQuickActions(true);
                    } else {
                      // Multiple events - show day events modal
                      setDayEventsModal({ date, events: dayEvents });
                    }
                  }}
                  onEventClick={(event) => {
                    // Get all events for this day for pagination
                    const eventDateStr = event.date?.split('T')[0];
                    const dayEvents = filteredEvents.filter(e => e.date && e.date.split('T')[0] === eventDateStr);

                    // Set pagination if there are multiple events on this day
                    if (dayEvents.length > 1) {
                      setAllDayEventsForPagination(dayEvents);
                    } else {
                      setAllDayEventsForPagination([]);
                    }
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
            <aside className="calendar-sidebar" style={{ gridColumn: '2' }}>
              {/* Stats Card */}
              <div className="sidebar-card">
                <div className="sidebar-card-header">
                  <div className="sidebar-card-title">
                    <BarChart3 size={18} />
                    Übersicht
                  </div>
                </div>
                <div className="stats-grid">
                  <div className="stat-card clickable" onClick={() => handleStatsCardClick('upcoming')}>
                    <div className="stat-value" style={{ color: '#10b981' }}>{stats.upcoming}</div>
                    <div className="stat-label">Kommende</div>
                  </div>
                  <div className="stat-card clickable" onClick={() => handleStatsCardClick('past')}>
                    <div className="stat-value" style={{ color: '#9ca3af' }}>{stats.past}</div>
                    <div className="stat-label">Vergangen</div>
                  </div>
                  <div className="stat-card warning clickable" onClick={() => handleStatsCardClick('cancelable')}>
                    <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.cancelable}</div>
                    <div className="stat-label">Kündbar</div>
                  </div>
                  <div className="stat-card clickable" onClick={() => handleStatsCardClick('autoRenewal')}>
                    <div className="stat-value" style={{ color: '#6366f1' }}>{stats.autoRenewal}</div>
                    <div className="stat-label">Auto-Verl.</div>
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
            allEvents={allDayEventsForPagination.length > 1 ? allDayEventsForPagination : undefined}
            onAction={handleQuickAction}
            onClose={() => {
              setShowQuickActions(false);
              setSelectedEvent(null);
              setAllDayEventsForPagination([]);
            }}
            onEventChange={(event) => setSelectedEvent(event)}
          />
        )}
        {dayEventsModal && (
          <DayEventsModal
            date={dayEventsModal.date}
            events={dayEventsModal.events}
            onEventClick={(event) => {
              // Store all events from this day for pagination
              setAllDayEventsForPagination(dayEventsModal.events);
              setDayEventsModal(null);
              setSelectedEvent(event);
              setShowQuickActions(true);
            }}
            onClose={() => setDayEventsModal(null)}
          />
        )}
        {showCreateEventModal && (
          <CreateEventModal
            date={showCreateEventModal}
            onClose={() => setShowCreateEventModal(null)}
          />
        )}
      </AnimatePresence>

      <CalendarSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />

      {/* Stats Detail Modal - wrapped in AnimatePresence */}
      <AnimatePresence>
        {showStatsModal && (
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
        )}
      </AnimatePresence>

      {/* Snooze Modal */}
      <AnimatePresence>
        {showSnoozeModal && snoozeEventId && (
          <SnoozeModal
            isOpen={showSnoozeModal}
            onClose={() => {
              setShowSnoozeModal(false);
              setSnoozeEventId(null);
            }}
            onSnooze={(days) => {
              handleQuickAction("snooze", snoozeEventId, days);
            }}
          />
        )}
      </AnimatePresence>

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
