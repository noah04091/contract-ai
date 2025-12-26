// src/pages/Calendar.tsx - Custom Calendar Redesign
import { useEffect, useState, useMemo, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { useSwipeable } from "react-swipeable";
import { DndContext, DragEndEvent, useDraggable, useDroppable, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import {
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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
  Plus,
  EyeOff,
  Filter,
  SlidersHorizontal,
  Pencil,
  Trash2,
  Save
} from "lucide-react";
import axios from "axios";
import "../styles/AppleCalendar.css";
import CalendarSyncModal from "../components/CalendarSyncModal";
import { debug } from "../utils/debug";
import { useCalendarStore } from "../stores/calendarStore";
import { useToast } from "../context/ToastContext";

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
  isManual?: boolean;
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

// ===== TIMEZONE FIX: Lokale Datum-Formatierung ohne UTC-Konvertierung =====
const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ========== Draggable Event Pill ==========
interface DraggableEventPillProps {
  event: CalendarEvent;
  onClick: (e: React.MouseEvent) => void;
}

function DraggableEventPill({ event, onClick }: DraggableEventPillProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: event.id,
    data: { event }
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`event-pill ${event.severity} ${event.isRecurringMaster || event.isRecurringInstance ? 'recurring' : ''}`}
      onClick={onClick}
      style={{
        opacity: isDragging ? 0.5 : 1,
        cursor: isDragging ? 'grabbing' : 'grab',
        touchAction: 'none'
      }}
    >
      <div className="event-indicator"></div>
      <span className="event-text">{formatContractName(event.contractName)}</span>
      {(event.isRecurringMaster || event.isRecurringInstance) && (
        <span className="recurring-icon" title="Wiederkehrendes Ereignis">↻</span>
      )}
    </div>
  );
}

// ========== Droppable Day Cell ==========
interface DroppableDayCellProps {
  dayInfo: { day: number; type: 'prev' | 'current' | 'next'; events: CalendarEvent[] };
  year: number;
  month: number;
  isToday: boolean;
  isSelected: boolean;
  onDateClick: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onMoreClick: (date: Date, events: CalendarEvent[]) => void;
}

function DroppableDayCell({ dayInfo, year, month, isToday, isSelected, onDateClick, onEventClick, onMoreClick }: DroppableDayCellProps) {
  const dropMonth = dayInfo.type === 'prev' ? month - 1 : dayInfo.type === 'next' ? month + 1 : month;
  const dropId = `${year}-${dropMonth}-${dayInfo.day}`;

  const { setNodeRef, isOver } = useDroppable({
    id: dropId,
    data: { year, month: dropMonth, day: dayInfo.day }
  });

  return (
    <div
      ref={setNodeRef}
      className={`day-cell ${dayInfo.type === 'current' ? '' : 'other-month'} ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={onDateClick}
      style={{
        background: isOver ? 'rgba(59, 130, 246, 0.15)' : undefined,
        borderColor: isOver ? '#3b82f6' : undefined,
        transition: 'background 0.2s, border-color 0.2s'
      }}
    >
      <div className="day-number">{dayInfo.day}</div>
      <div className="day-events">
        {dayInfo.events.slice(0, 3).map((event) => (
          <DraggableEventPill
            key={event.id}
            event={event}
            onClick={(e) => {
              e.stopPropagation();
              onEventClick(event);
            }}
          />
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
}

// ========== Custom Calendar Grid ==========
interface CalendarGridProps {
  currentDate: Date;
  events: CalendarEvent[];
  selectedDate: Date | null;
  view: 'month' | 'week' | 'day';
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onMoreClick: (date: Date, events: CalendarEvent[]) => void;
  onEventDrop?: (eventId: string, newDate: Date) => void;
}

function CustomCalendarGrid({ currentDate, events, selectedDate, view, onDateClick, onEventClick, onMoreClick, onEventDrop }: CalendarGridProps) {
  const [activeEvent, setActiveEvent] = useState<CalendarEvent | null>(null);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const draggedEvent = event.active.data.current?.event as CalendarEvent;
    if (draggedEvent) {
      setActiveEvent(draggedEvent);
    }
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveEvent(null);
    const { active, over } = event;

    if (!over || !onEventDrop) return;

    // Get the event ID and target date
    const eventId = active.id as string;
    const dropData = over.data.current as { year: number; month: number; day: number } | undefined;

    if (dropData) {
      const newDate = new Date(dropData.year, dropData.month, dropData.day);
      onEventDrop(eventId, newDate);
    }
  }, [onEventDrop]);
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
    const dateString = formatLocalDate(targetDate);
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

  // Get week days for week view
  const getWeekDays = () => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Monday as start
    startOfWeek.setDate(startOfWeek.getDate() + diff);

    const weekDayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      const dateStr = formatLocalDate(day);
      const dayEvents = events.filter(e => e.date && e.date.split('T')[0] === dateStr);
      weekDays.push({
        date: day,
        day: day.getDate(),
        dayName: weekDayNames[day.getDay()], // Actual day name from date
        events: dayEvents,
        isToday: isToday(day.getDate(), day.getMonth(), day.getFullYear()),
        isSelected: selectedDate && day.toDateString() === selectedDate.toDateString()
      });
    }
    return weekDays;
  };

  // Get events for day view
  const getDayEvents = () => {
    const dateStr = formatLocalDate(currentDate);
    return events.filter(e => e.date && e.date.split('T')[0] === dateStr);
  };

  // WEEK VIEW
  if (view === 'week') {
    const weekDays = getWeekDays();
    return (
      <div className="calendar-week-view">
        {/* Week Header */}
        <div className="week-header">
          {weekDays.map((dayInfo, index) => (
            <div
              key={index}
              className={`week-day-header ${dayInfo.isToday ? 'today' : ''} ${dayInfo.isSelected ? 'selected' : ''}`}
              onClick={() => onDateClick(dayInfo.date)}
            >
              <span className="week-day-name">{dayInfo.dayName}</span>
              <span className="week-day-number">{dayInfo.day}</span>
            </div>
          ))}
        </div>

        {/* Week Content */}
        <div className="week-content">
          {weekDays.map((dayInfo, index) => (
            <div
              key={index}
              className={`week-day-column ${dayInfo.isToday ? 'today' : ''}`}
              onClick={() => onDateClick(dayInfo.date)}
            >
              {dayInfo.events.length === 0 ? (
                <div className="week-day-empty">
                  <span>Keine Ereignisse</span>
                </div>
              ) : (
                <div className="week-day-events">
                  {dayInfo.events.map((event) => (
                    <div
                      key={event.id}
                      className={`week-event-card ${event.severity}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      <div className="week-event-indicator"></div>
                      <div className="week-event-content">
                        <span className="week-event-title">{formatContractName(event.contractName)}</span>
                        <span className="week-event-type">{event.title}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // DAY VIEW
  if (view === 'day') {
    const dayEvents = getDayEvents();
    const dayIsToday = isToday(currentDate.getDate(), currentDate.getMonth(), currentDate.getFullYear());

    return (
      <div className="calendar-day-view">
        {/* Day Header */}
        <div className={`day-view-header ${dayIsToday ? 'today' : ''}`}>
          <span className="day-view-weekday">
            {currentDate.toLocaleDateString('de-DE', { weekday: 'long' })}
          </span>
          <span className="day-view-date">
            {currentDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          {dayIsToday && <span className="day-view-today-badge">Heute</span>}
        </div>

        {/* Day Events */}
        <div className="day-view-content">
          {dayEvents.length === 0 ? (
            <div className="day-view-empty" onClick={() => onDateClick(currentDate)}>
              <CalendarIcon size={48} style={{ color: '#d1d5db', marginBottom: '16px' }} />
              <p>Keine Ereignisse an diesem Tag</p>
              <span>Klicken Sie, um ein Ereignis zu erstellen</span>
            </div>
          ) : (
            <div className="day-view-events">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  className={`day-event-card ${event.severity}`}
                  onClick={() => onEventClick(event)}
                >
                  <div className="day-event-time">
                    {new Date(event.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="day-event-indicator"></div>
                  <div className="day-event-details">
                    <span className="day-event-title">{formatContractName(event.contractName)}</span>
                    <span className="day-event-type">{event.title}</span>
                    {event.description && (
                      <span className="day-event-description">{event.description}</span>
                    )}
                  </div>
                  <div className={`day-event-severity ${event.severity}`}>
                    {event.severity === 'critical' ? 'Kritisch' : event.severity === 'warning' ? 'Wichtig' : 'Info'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // MONTH VIEW (default) - with Drag & Drop support
  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="calendar-grid">
        {/* Weekday Headers */}
        {WEEKDAYS.map((day, index) => (
          <div key={day} className={`weekday-header ${index >= 5 ? 'weekend' : ''}`}>
            {day}
          </div>
        ))}

        {/* Calendar Days with Droppable support */}
        {calendarDays.map((dayInfo, index) => {
          const dropMonth = dayInfo.type === 'prev' ? month - 1 : dayInfo.type === 'next' ? month + 1 : month;
          const dropId = `${year}-${dropMonth}-${dayInfo.day}`;

          return (
            <DroppableDayCell
              key={dropId + '-' + index}
              dayInfo={dayInfo}
              year={year}
              month={month}
              isToday={dayInfo.isToday || false}
              isSelected={dayInfo.isSelected || false}
              onDateClick={() => {
                if (dayInfo.type === 'current') {
                  onDateClick(new Date(year, month, dayInfo.day));
                }
              }}
              onEventClick={onEventClick}
              onMoreClick={onMoreClick}
            />
          );
        })}
      </div>

      {/* Drag Overlay - shows dragged event preview */}
      <DragOverlay>
        {activeEvent ? (
          <div
            className={`event-pill ${activeEvent.severity} dragging`}
            style={{
              opacity: 0.9,
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.2)',
              cursor: 'grabbing'
            }}
          >
            <div className="event-indicator"></div>
            <span className="event-text">{formatContractName(activeEvent.contractName)}</span>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ========== Quick Actions Modal (Premium Design) ==========
interface QuickActionsModalProps {
  event: CalendarEvent;
  allEvents?: CalendarEvent[]; // For pagination through multiple events
  onAction: (action: string, eventId: string) => void;
  onClose: () => void;
  onEventChange?: (event: CalendarEvent) => void; // Callback when navigating to different event
  onEdit?: (event: CalendarEvent) => void; // Callback to open edit modal
}

function QuickActionsModal({ event, allEvents, onAction, onClose, onEventChange, onEdit }: QuickActionsModalProps) {
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

  // Check if this event has a contract associated
  // Show "Vertrag anzeigen" if: has contractId AND (isManual is false OR contractName is not 'Manuelles Ereignis')
  const hasContract = !!currentEvent.contractId && currentEvent.contractId !== '';
  const isManualEvent = currentEvent.isManual === true && !hasContract;

  return (
    <motion.div
      className="quick-actions-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ padding: isMobile ? 0 : '40px' }}
    >
      <motion.div
        className="quick-actions-modal premium-modal"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? '100%' : '600px',
          width: isMobile ? '100%' : '600px',
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
              <h3>{isManualEvent ? currentEvent.title : formatContractName(currentEvent.contractName)}</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <p style={{ margin: 0 }}>{isManualEvent ? 'Manuelles Ereignis' : currentEvent.title}</p>
                {(currentEvent.isRecurringMaster || currentEvent.isRecurringInstance) && (
                  <span style={{
                    fontSize: '11px',
                    padding: '2px 8px',
                    background: 'rgba(139, 92, 246, 0.15)',
                    color: '#7c3aed',
                    borderRadius: '999px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    ↻ Wiederkehrend
                  </span>
                )}
              </div>
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
            background: 'rgba(59, 130, 246, 0.05)',
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
                background: currentIndex > 0 ? '#3b82f6' : 'rgba(0, 0, 0, 0.1)',
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
                background: currentIndex < totalEvents - 1 ? '#3b82f6' : 'rgba(0, 0, 0, 0.1)',
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
            {/* Show "Vertrag anzeigen" if contract is associated */}
            {hasContract && (
              <motion.button
                className="action-btn-premium view-contract"
                onClick={handleViewContract}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  gridColumn: '1 / -1',
                  background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
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
            )}

            {/* Cancel button for contract events with cancel suggestion */}
            {hasContract && currentEvent.metadata?.suggestedAction === "cancel" && (
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

            {/* Secondary Action Buttons - Different for manual vs contract events */}
            <div style={{
              gridColumn: '1 / -1',
              display: 'flex',
              gap: '8px',
              marginTop: '8px'
            }}>
              {/* Contract-based events: Show Compare & Optimize */}
              {hasContract && (
                <>
                  <motion.button
                    onClick={() => onAction("compare", currentEvent.id)}
                    whileHover={{ scale: 1.02, background: '#f0fdf4', borderColor: '#10b981' }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      flex: 1,
                      background: '#f9fafb',
                      color: '#059669',
                      border: '1px solid #e5e7eb',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <TrendingUp size={16} />
                    <span>Vergleichen</span>
                  </motion.button>

                  <motion.button
                    onClick={() => onAction("optimize", currentEvent.id)}
                    whileHover={{ scale: 1.02, background: '#eef2ff', borderColor: '#3b82f6' }}
                    whileTap={{ scale: 0.98 }}
                    style={{
                      flex: 1,
                      background: '#f9fafb',
                      color: '#3b82f6',
                      border: '1px solid #e5e7eb',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      fontWeight: 500,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      fontSize: '13px',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <RefreshCw size={16} />
                    <span>Optimieren</span>
                  </motion.button>
                </>
              )}

              {/* Edit button - for all events */}
              {onEdit && (
                <motion.button
                  onClick={() => {
                    onEdit(currentEvent);
                    onClose();
                  }}
                  whileHover={{ scale: 1.02, background: '#fef3c7', borderColor: '#f59e0b' }}
                  whileTap={{ scale: 0.98 }}
                  style={{
                    flex: 1,
                    background: '#f9fafb',
                    color: '#d97706',
                    border: '1px solid #e5e7eb',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <Pencil size={16} />
                  <span>Bearbeiten</span>
                </motion.button>
              )}

              {/* Snooze button - for all events */}
              <motion.button
                onClick={() => onAction("snooze", currentEvent.id)}
                whileHover={{ scale: 1.02, background: '#f1f5f9', borderColor: '#64748b' }}
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: 1,
                  background: '#f9fafb',
                  color: '#475569',
                  border: '1px solid #e5e7eb',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  transition: 'all 0.2s ease'
                }}
              >
                <Bell size={16} />
                <span>Erinnern</span>
              </motion.button>
            </div>

            {/* Dismiss Button - Separate Row */}
            <motion.button
              onClick={() => {
                if (window.confirm('Möchten Sie diese Erinnerung wirklich dauerhaft ausblenden?')) {
                  onAction("dismiss", currentEvent.id);
                }
              }}
              whileHover={{ scale: 1.01, background: '#fef2f2', borderColor: '#fca5a5' }}
              whileTap={{ scale: 0.99 }}
              style={{
                gridColumn: '1 / -1',
                background: '#fff',
                color: '#9ca3af',
                border: '1px solid #e5e7eb',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s ease',
                marginTop: '4px'
              }}
            >
              <EyeOff size={16} />
              <span>Nicht mehr erinnern</span>
            </motion.button>
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
      style={{ padding: isMobile ? 0 : '40px', zIndex: 1001 }}
    >
      <motion.div
        className="stats-detail-modal premium-modal"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
            maxWidth: isMobile ? '100%' : '800px',
            width: isMobile ? '100%' : '800px',
            maxHeight: isMobile ? '90vh' : '80vh',
            overflowY: 'auto',
            background: '#ffffff',
            borderRadius: isMobile ? '20px 20px 0 0' : '20px',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            padding: 0
          }}
        >
          {/* Header */}
          <div style={{
            padding: isMobile ? '20px' : '30px',
            borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(67, 56, 202, 0.03))',
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
      style={{ padding: isMobile ? 0 : '40px', zIndex: 1001 }}
    >
      <motion.div
        className="premium-modal"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? '100%' : '600px',
          width: isMobile ? '100%' : '600px',
          maxHeight: isMobile ? '90vh' : '80vh',
          overflowY: 'auto'
        }}
      >
        {/* Header */}
        <div style={{
          padding: isMobile ? '20px' : '30px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(67, 56, 202, 0.03))',
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
  onEventCreated: (event?: CalendarEvent) => void;
}

interface SimpleContractForCreate {
  _id: string;
  name: string;
}

function CreateEventModal({ date, onClose, onEventCreated }: CreateEventModalProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contracts, setContracts] = useState<SimpleContractForCreate[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const toast = useToast();

  // Use Zustand store for optimistic updates
  const { addEvent } = useCalendarStore();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: formatLocalDate(date),
    time: '09:00',
    type: 'REMINDER' as 'REMINDER' | 'DEADLINE' | 'CANCEL_WINDOW_OPEN' | 'LAST_CANCEL_DAY' | 'AUTO_RENEWAL',
    severity: 'info' as 'info' | 'warning' | 'critical',
    notes: '',
    contractId: '',
    contractName: '',
    // Recurrence fields
    recurrenceType: 'none' as 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly',
    recurrenceInterval: 1,
    recurrenceEndDate: ''
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch contracts when form is shown
  useEffect(() => {
    if (showForm && contracts.length === 0) {
      const fetchContracts = async () => {
        setLoadingContracts(true);
        try {
          const token = localStorage.getItem('token');
          interface ContractsResponse {
            success: boolean;
            contracts?: Array<{ _id: string; name: string }>;
          }
          const response = await axios.get<ContractsResponse>('/api/contracts/names', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success && response.data.contracts) {
            setContracts(response.data.contracts);
          }
        } catch (err) {
          console.error('Error fetching contracts:', err);
        } finally {
          setLoadingContracts(false);
        }
      };
      fetchContracts();
    }
  }, [showForm, contracts.length]);

  const handleUploadContract = () => {
    window.location.href = '/contracts?upload=true';
    onClose();
  };

  const handleSaveEvent = async () => {
    if (!formData.title.trim()) {
      toast.error('Bitte geben Sie einen Titel ein');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      // Create date string that preserves local date (avoid timezone issues)
      // Format: YYYY-MM-DDTHH:mm:00.000Z but adjusted for local timezone
      const [year, month, day] = formData.date.split('-').map(Number);
      const [hours, minutes] = formData.time.split(':').map(Number);
      const eventDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

      // ===== DEBUG: Date.UTC Fix =====
      console.log('%c[DEBUG] CreateEvent - Date.UTC Fix aktiv!', 'background: #10b981; color: white; font-weight: bold; padding: 5px;');
      console.log('%c[DEBUG] Eingabe:', 'color: #3b82f6;', { date: formData.date, time: formData.time });
      console.log('%c[DEBUG] Parsed:', 'color: #f59e0b;', { year, month, day, hours, minutes });
      console.log('%c[DEBUG] Event Date (UTC):', 'color: #10b981;', eventDate.toISOString());

      interface ApiEventResponse {
        success: boolean;
        event: {
          _id?: string;
          id?: string;
          contractId?: string;
        };
      }

      // Determine if manual or contract-linked
      const hasContract = !!formData.contractId;
      const eventPayload: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        date: eventDate.toISOString(),
        type: formData.type,
        severity: formData.severity,
        notes: formData.notes,
        contractName: hasContract ? formData.contractName : formData.title,
        isManual: !hasContract
      };

      // Include contractId if selected
      if (hasContract) {
        eventPayload.contractId = formData.contractId;
      }

      // Include recurrence if set
      if (formData.recurrenceType !== 'none') {
        eventPayload.recurrence = {
          type: formData.recurrenceType,
          interval: formData.recurrenceInterval,
          endDate: formData.recurrenceEndDate || null
        };
      }

      const response = await axios.post<ApiEventResponse>("/api/calendar/events", eventPayload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Add event directly to store (no reload needed!)
      if (response.data.success && response.data.event) {
        const newEvent: CalendarEvent = {
          id: response.data.event._id?.toString() || response.data.event.id || Date.now().toString(),
          contractId: formData.contractId || '',
          contractName: hasContract ? formData.contractName : formData.title,
          title: formData.title,
          description: formData.description,
          date: eventDate.toISOString(),
          type: formData.type,
          severity: formData.severity,
          status: 'scheduled',
          isManual: !hasContract,
          // Include recurrence if set
          recurrence: formData.recurrenceType !== 'none' ? {
            type: formData.recurrenceType,
            interval: formData.recurrenceInterval,
            endDate: formData.recurrenceEndDate || null
          } : null,
          isRecurringMaster: formData.recurrenceType !== 'none'
        };
        addEvent(newEvent);
        console.log('%c[DEBUG] Event added to store directly!', 'background: #10b981; color: white;');
      }

      onEventCreated();
      onClose();
    } catch (err) {
      console.error("Error creating event:", err);
      toast.error('Fehler beim Erstellen des Ereignisses');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px'
  };

  return (
    <motion.div
      className="quick-actions-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ padding: isMobile ? 0 : '40px', zIndex: 1001 }}
    >
      <motion.div
        className="premium-modal"
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: isMobile ? '100%' : showForm ? '520px' : '450px',
          width: isMobile ? '100%' : showForm ? '520px' : '450px',
          maxHeight: isMobile ? '90vh' : '85vh',
          overflowY: 'auto',
          background: '#ffffff',
          borderRadius: isMobile ? '20px 20px 0 0' : '20px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: isMobile ? '20px' : '24px',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(67, 56, 202, 0.05))',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {showForm && (
              <motion.button
                onClick={() => setShowForm(false)}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                style={{
                  background: 'rgba(0, 0, 0, 0.05)',
                  border: 'none',
                  borderRadius: '8px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <ChevronLeft size={18} />
              </motion.button>
            )}
            <div>
              <h2 style={{
                margin: 0,
                fontSize: isMobile ? '18px' : '20px',
                fontWeight: 700,
                color: '#1f2937'
              }}>
                {showForm ? 'Neues Ereignis' : 'Ereignis erstellen'}
              </h2>
              <p style={{ margin: '3px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                {date.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
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

        {!showForm ? (
          /* Options */
          <div style={{ padding: isMobile ? '20px' : '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <motion.button
              onClick={() => setShowForm(true)}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '18px',
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(67, 56, 202, 0.04))',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                borderRadius: '14px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <CalendarIcon size={22} style={{ color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                  Ereignis direkt erstellen
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Neues Ereignis mit Details hinzufügen
                </p>
              </div>
              <ChevronRight size={18} style={{ marginLeft: 'auto', color: '#9ca3af' }} />
            </motion.button>

            <motion.button
              onClick={handleUploadContract}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '18px',
                background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08), rgba(5, 150, 105, 0.04))',
                border: '1px solid rgba(16, 185, 129, 0.2)',
                borderRadius: '14px',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <FileText size={22} style={{ color: '#fff' }} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: '#1f2937' }}>
                  Vertrag hochladen
                </h3>
                <p style={{ margin: '3px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
                  Vertrag hochladen & analysieren
                </p>
              </div>
              <ChevronRight size={18} style={{ marginLeft: 'auto', color: '#9ca3af' }} />
            </motion.button>
          </div>
        ) : (
          /* Event Form */
          <div style={{ padding: isMobile ? '20px' : '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Title */}
            <div>
              <label style={labelStyle}>Titel *</label>
              <input
                type="text"
                placeholder="z.B. Kündigungsfrist beachten"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={inputStyle}
              />
            </div>

            {/* Date & Time Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Datum</label>
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Uhrzeit</label>
                <input
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Type & Severity Row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Typ</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as typeof formData.type })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="REMINDER">Erinnerung</option>
                  <option value="DEADLINE">Frist</option>
                  <option value="CANCEL_WINDOW_OPEN">Kündigungsfenster</option>
                  <option value="LAST_CANCEL_DAY">Letzte Kündigungschance</option>
                  <option value="AUTO_RENEWAL">Auto-Verlängerung</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>Priorität</label>
                <select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value as typeof formData.severity })}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  <option value="info">Normal</option>
                  <option value="warning">Wichtig</option>
                  <option value="critical">Kritisch</option>
                </select>
              </div>
            </div>

            {/* Contract Assignment */}
            <div>
              <label style={labelStyle}>
                Vertrag zuordnen
                <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '8px' }}>(optional)</span>
              </label>
              <select
                value={formData.contractId}
                onChange={(e) => {
                  const selectedContract = contracts.find(c => c._id === e.target.value);
                  setFormData({
                    ...formData,
                    contractId: e.target.value,
                    contractName: selectedContract?.name || ''
                  });
                }}
                disabled={loadingContracts}
                style={{
                  ...inputStyle,
                  cursor: loadingContracts ? 'wait' : 'pointer',
                  color: formData.contractId ? '#1f2937' : '#9ca3af'
                }}
              >
                <option value="">
                  {loadingContracts ? 'Lade Verträge...' : 'Kein Vertrag (manuelles Ereignis)'}
                </option>
                {contracts.map(contract => (
                  <option key={contract._id} value={contract._id}>
                    {contract.name}
                  </option>
                ))}
              </select>
              {formData.contractId && (
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#10b981' }}>
                  Ereignis wird mit diesem Vertrag verknüpft
                </p>
              )}
            </div>

            {/* Recurrence Section */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.05), rgba(99, 102, 241, 0.03))',
              borderRadius: '12px',
              border: '1px solid rgba(139, 92, 246, 0.15)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <RefreshCw size={16} style={{ color: '#7c3aed' }} />
                <label style={{ ...labelStyle, margin: 0 }}>Wiederholung</label>
              </div>

              <select
                value={formData.recurrenceType}
                onChange={(e) => setFormData({
                  ...formData,
                  recurrenceType: e.target.value as typeof formData.recurrenceType
                })}
                style={{ ...inputStyle, cursor: 'pointer', marginBottom: formData.recurrenceType !== 'none' ? '12px' : 0 }}
              >
                <option value="none">Keine Wiederholung</option>
                <option value="daily">Täglich</option>
                <option value="weekly">Wöchentlich</option>
                <option value="monthly">Monatlich</option>
                <option value="yearly">Jährlich</option>
              </select>

              {formData.recurrenceType !== 'none' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>
                      Alle X {formData.recurrenceType === 'daily' ? 'Tage' :
                              formData.recurrenceType === 'weekly' ? 'Wochen' :
                              formData.recurrenceType === 'monthly' ? 'Monate' : 'Jahre'}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="365"
                      value={formData.recurrenceInterval}
                      onChange={(e) => setFormData({
                        ...formData,
                        recurrenceInterval: Math.max(1, parseInt(e.target.value) || 1)
                      })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, fontSize: '12px' }}>
                      Enddatum (optional)
                    </label>
                    <input
                      type="date"
                      value={formData.recurrenceEndDate}
                      onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {formData.recurrenceType !== 'none' && (
                <p style={{ margin: '10px 0 0 0', fontSize: '12px', color: '#7c3aed' }}>
                  {formData.recurrenceType === 'daily' && `Wiederholt sich alle ${formData.recurrenceInterval === 1 ? '' : formData.recurrenceInterval + ' '}Tag${formData.recurrenceInterval === 1 ? '' : 'e'}`}
                  {formData.recurrenceType === 'weekly' && `Wiederholt sich alle ${formData.recurrenceInterval === 1 ? '' : formData.recurrenceInterval + ' '}Woche${formData.recurrenceInterval === 1 ? '' : 'n'}`}
                  {formData.recurrenceType === 'monthly' && `Wiederholt sich alle ${formData.recurrenceInterval === 1 ? '' : formData.recurrenceInterval + ' '}Monat${formData.recurrenceInterval === 1 ? '' : 'e'}`}
                  {formData.recurrenceType === 'yearly' && `Wiederholt sich alle ${formData.recurrenceInterval === 1 ? '' : formData.recurrenceInterval + ' '}Jahr${formData.recurrenceInterval === 1 ? '' : 'e'}`}
                  {formData.recurrenceEndDate && ` bis ${new Date(formData.recurrenceEndDate).toLocaleDateString('de-DE')}`}
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label style={labelStyle}>Beschreibung</label>
              <textarea
                placeholder="Kurze Beschreibung des Ereignisses..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Notizen (optional)</label>
              <textarea
                placeholder="Weitere Notizen oder Details..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                style={{ ...inputStyle, resize: 'none' }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <motion.button
                onClick={() => setShowForm(false)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{
                  flex: 1,
                  padding: '12px',
                  background: '#f9fafb',
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
              <motion.button
                onClick={handleSaveEvent}
                disabled={saving}
                whileHover={{ scale: saving ? 1 : 1.02 }}
                whileTap={{ scale: saving ? 1 : 0.98 }}
                style={{
                  flex: 2,
                  padding: '12px',
                  background: saving ? '#9ca3af' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                  border: 'none',
                  borderRadius: '10px',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                {saving ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    Speichern...
                  </>
                ) : (
                  <>
                    <Plus size={16} />
                    Ereignis erstellen
                  </>
                )}
              </motion.button>
            </div>
          </div>
        )}
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
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDays, setCustomDays] = useState('');

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isOpen) return null;

  // 4 Preset-Optionen wie im Screenshot
  const snoozePresets = [
    { days: 7, label: '7 Tage' },
    { days: 14, label: '14 Tage' },
    { days: 30, label: '1 Monat' },
    { days: 365, label: '1 Jahr' }
  ];

  const handleCustomSnooze = () => {
    const days = parseInt(customDays);
    if (days > 0) {
      onSnooze(days);
      setCustomDays('');
      setShowCustomInput(false);
    }
  };

  return (
    <motion.div
      className="quick-actions-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ padding: isMobile ? '16px' : '40px', zIndex: 1002 }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isMobile ? '100%' : '400px',
          maxWidth: '100%',
          background: '#ffffff',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #4f46e5, #4f46e5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Clock size={20} style={{ color: '#fff' }} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>
                Später erinnern
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '13px', color: '#6b7280' }}>
                Erinnerung verschieben um:
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#9ca3af'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Preset Buttons - 2x2 Grid */}
        <div style={{ padding: '20px 24px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px',
            marginBottom: '16px'
          }}>
            {snoozePresets.map((preset) => (
              <motion.button
                key={preset.days}
                onClick={() => onSnooze(preset.days)}
                whileHover={{ scale: 1.03, borderColor: '#4f46e5' }}
                whileTap={{ scale: 0.97 }}
                style={{
                  padding: '16px',
                  background: '#f9fafb',
                  border: '2px solid #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '15px',
                  fontWeight: 600,
                  color: '#1f2937',
                  transition: 'all 0.2s ease'
                }}
              >
                {preset.label}
              </motion.button>
            ))}
          </div>

          {/* Individuell Option */}
          {!showCustomInput ? (
            <motion.button
              onClick={() => setShowCustomInput(true)}
              whileHover={{ scale: 1.02, background: '#f3f4f6' }}
              whileTap={{ scale: 0.98 }}
              style={{
                width: '100%',
                padding: '14px',
                background: '#fff',
                border: '2px dashed #d1d5db',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                color: '#6b7280',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <Plus size={18} />
              Individuell
            </motion.button>
          ) : (
            <div style={{
              display: 'flex',
              gap: '10px',
              alignItems: 'center'
            }}>
              <input
                type="number"
                min="1"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="Anzahl Tage"
                autoFocus
                style={{
                  flex: 1,
                  padding: '12px 14px',
                  border: '2px solid #4f46e5',
                  borderRadius: '10px',
                  fontSize: '14px',
                  outline: 'none'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCustomSnooze();
                  if (e.key === 'Escape') {
                    setShowCustomInput(false);
                    setCustomDays('');
                  }
                }}
              />
              <motion.button
                onClick={handleCustomSnooze}
                disabled={!customDays || parseInt(customDays) <= 0}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '12px 20px',
                  background: customDays && parseInt(customDays) > 0
                    ? 'linear-gradient(135deg, #4f46e5, #4f46e5)'
                    : '#e5e7eb',
                  color: customDays && parseInt(customDays) > 0 ? '#fff' : '#9ca3af',
                  border: 'none',
                  borderRadius: '10px',
                  fontWeight: 600,
                  cursor: customDays && parseInt(customDays) > 0 ? 'pointer' : 'not-allowed',
                  fontSize: '14px'
                }}
              >
                OK
              </motion.button>
              <motion.button
                onClick={() => {
                  setShowCustomInput(false);
                  setCustomDays('');
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                style={{
                  padding: '12px',
                  background: '#f3f4f6',
                  color: '#6b7280',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer'
                }}
              >
                <X size={18} />
              </motion.button>
            </div>
          )}
        </div>

        {/* Cancel Button */}
        <div style={{ padding: '0 24px 20px 24px' }}>
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

// ========== Edit Event Modal (wie im Screenshot) ==========
interface EditEventModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onSave: (updatedEvent: CalendarEvent) => void;
  onDelete: (eventId: string) => void;
}

interface SimpleContract {
  _id: string;
  name: string;
}

function EditEventModal({ event, onClose, onSave, onDelete }: EditEventModalProps) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [saving, setSaving] = useState(false);
  const [contracts, setContracts] = useState<SimpleContract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const toast = useToast();
  const [formData, setFormData] = useState({
    title: event.title || '',
    description: event.description || '',
    date: event.date ? event.date.split('T')[0] : formatLocalDate(new Date()),
    time: event.date ? new Date(event.date).toTimeString().slice(0, 5) : '09:00',
    severity: event.severity || 'info' as 'info' | 'warning' | 'critical',
    notes: '',
    contractId: event.contractId || '',
    contractName: event.contractName || ''
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch contracts for dropdown (nur bei manuellen Events)
  useEffect(() => {
    if (event.isManual) {
      const fetchContracts = async () => {
        setLoadingContracts(true);
        try {
          const token = localStorage.getItem('token');
          interface ContractsResponse {
            success: boolean;
            contracts?: Array<{ _id: string; name: string }>;
          }
          const response = await axios.get<ContractsResponse>('/api/contracts/names', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success && response.data.contracts) {
            setContracts(response.data.contracts.map((c) => ({
              _id: c._id,
              name: c.name
            })));
          }
        } catch (err) {
          console.error('Error fetching contracts:', err);
        } finally {
          setLoadingContracts(false);
        }
      };
      fetchContracts();
    }
  }, [event.isManual]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('Bitte geben Sie einen Titel ein');
      return;
    }

    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const [year, month, day] = formData.date.split('-').map(Number);
      const [hours, minutes] = formData.time.split(':').map(Number);
      const eventDate = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));

      // Include contractId if assigned
      const updateData: Record<string, unknown> = {
        title: formData.title,
        description: formData.description,
        date: eventDate.toISOString(),
        severity: formData.severity,
        notes: formData.notes
      };

      // If a contract was assigned, include it
      if (formData.contractId) {
        updateData.contractId = formData.contractId;
        updateData.contractName = formData.contractName;
      }

      await axios.patch(`/api/calendar/events/${event.id}`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Create updated event object
      const updatedEvent: CalendarEvent = {
        ...event,
        title: formData.title,
        description: formData.description,
        date: eventDate.toISOString(),
        severity: formData.severity,
        contractId: formData.contractId || event.contractId,
        contractName: formData.contractName || event.contractName,
        // If contract was assigned, it's no longer manual
        isManual: formData.contractId ? false : event.isManual
      };

      onSave(updatedEvent);
      onClose();
    } catch (err) {
      console.error("Error updating event:", err);
      toast.error('Fehler beim Speichern des Ereignisses');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Möchten Sie dieses Ereignis wirklich löschen?')) {
      return;
    }

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`/api/calendar/events/${event.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      onDelete(event.id);
      onClose();
    } catch (err) {
      console.error("Error deleting event:", err);
      toast.error('Fehler beim Löschen des Ereignisses');
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    boxSizing: 'border-box' as const
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '6px'
  };

  return (
    <motion.div
      className="quick-actions-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{ padding: isMobile ? '16px' : '40px', zIndex: 1002 }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: isMobile ? '100%' : '480px',
          maxWidth: '100%',
          maxHeight: isMobile ? '90vh' : '85vh',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px',
          borderBottom: '1px solid #f3f4f6'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Pencil size={20} style={{ color: '#4f46e5' }} />
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#1f2937' }}>
              Event bearbeiten
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#9ca3af'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          maxHeight: isMobile ? 'calc(90vh - 140px)' : 'calc(85vh - 140px)'
        }}>
          {/* Titel */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Titel</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Titel des Ereignisses"
              style={inputStyle}
            />
          </div>

          {/* Vertrag zuordnen (nur bei manuellen Events) */}
          {event.isManual && (
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>
                Vertrag zuordnen
                <span style={{ fontWeight: 400, color: '#9ca3af', marginLeft: '8px' }}>(optional)</span>
              </label>
              <select
                value={formData.contractId}
                onChange={(e) => {
                  const selectedContract = contracts.find(c => c._id === e.target.value);
                  setFormData({
                    ...formData,
                    contractId: e.target.value,
                    contractName: selectedContract?.name || ''
                  });
                }}
                disabled={loadingContracts}
                style={{
                  ...inputStyle,
                  cursor: loadingContracts ? 'wait' : 'pointer',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  backgroundSize: '16px',
                  paddingRight: '40px',
                  color: formData.contractId ? '#1f2937' : '#9ca3af'
                }}
              >
                <option value="">
                  {loadingContracts ? 'Lade Verträge...' : 'Kein Vertrag zugeordnet'}
                </option>
                {contracts.map(contract => (
                  <option key={contract._id} value={contract._id}>
                    {contract.name}
                  </option>
                ))}
              </select>
              {formData.contractId && (
                <p style={{ margin: '6px 0 0 0', fontSize: '12px', color: '#10b981' }}>
                  Verknüpft mit: {formData.contractName}
                </p>
              )}
            </div>
          )}

          {/* Beschreibung */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Beschreibung hinzufügen..."
              rows={3}
              style={{
                ...inputStyle,
                resize: 'vertical',
                minHeight: '80px'
              }}
            />
          </div>

          {/* Datum & Uhrzeit */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Datum</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Uhrzeit</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                style={inputStyle}
              />
            </div>
          </div>

          {/* Priorität */}
          <div style={{ marginBottom: '20px' }}>
            <label style={labelStyle}>Priorität</label>
            <select
              value={formData.severity}
              onChange={(e) => setFormData({ ...formData, severity: e.target.value as 'info' | 'warning' | 'critical' })}
              style={{
                ...inputStyle,
                cursor: 'pointer',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                backgroundSize: '16px',
                paddingRight: '40px'
              }}
            >
              <option value="info">Info (🔵)</option>
              <option value="warning">Warnung (🟡)</option>
              <option value="critical">Kritisch (🔴)</option>
            </select>
          </div>

          {/* Notizen */}
          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Notizen</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Persönliche Notizen..."
              rows={2}
              style={{
                ...inputStyle,
                resize: 'vertical'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <motion.button
              onClick={handleSave}
              disabled={saving}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '14px 20px',
                background: '#4f46e5',
                color: '#fff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '15px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1
              }}
            >
              <Save size={18} />
              <span>{saving ? 'Speichern...' : 'Speichern'}</span>
            </motion.button>

            <motion.button
              onClick={handleDelete}
              whileHover={{ scale: 1.05, background: '#fef2f2' }}
              whileTap={{ scale: 0.95 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px',
                background: '#fff',
                color: '#ef4444',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                cursor: 'pointer'
              }}
              title="Ereignis löschen"
            >
              <Trash2 size={18} />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ========== Main Calendar Page ==========
// Farben für Stats-Karten
const STAT_COLORS = {
  upcoming: '#10b981',    // Grün
  past: '#9ca3af',        // Grau
  cancelable: '#f59e0b',  // Orange
  autoRenewal: '#3b82f6'  // Firmenblau
};

export default function CalendarPage() {
  // Debug: Component Mount
  useEffect(() => {
    debug.componentMount('CalendarPage');
  }, []);

  // ===== ZUSTAND STORE - Events werden gecacht! =====
  const {
    events,
    loading,
    fetchEvents,
    dismissEvent,
    snoozeEvent,
    updateEvent,
    removeEvent
  } = useCalendarStore();

  // ===== TOAST NOTIFICATIONS =====
  const toast = useToast();

  const [filteredEvents, setFilteredEvents] = useState<CalendarEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
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
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);

  // ===== MOBILE STATE =====
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  const EVENTS_PER_PAGE = 5;

  // ===== MOBILE: Nur Erkennung, KEIN Auto-View-Switch mehr =====
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch events on mount (uses cache if available)
  useEffect(() => {
    debug.info('Kalender geladen - prüfe Cache...');
    fetchEvents(); // Uses cache if valid, otherwise fetches
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
    debug.stateChange('Filter angewendet', { severity: filterSeverity, type: filterType }, { count: filtered.length });
  }, [events, filterSeverity, filterType]);

  // Regenerate events
  const handleRegenerateEvents = async () => {
    debug.userAction('Events neu generieren');
    setRefreshing(true);
    try {
      const token = localStorage.getItem("token");
      await axios.post("/api/calendar/regenerate-all", {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchEvents(true); // Force refresh - bypass cache
      debug.success('Events erfolgreich regeneriert');
      toast.success('Kalender erfolgreich aktualisiert');
    } catch (err) {
      debug.error('Fehler beim Regenerieren der Events', err);
      toast.error('Fehler beim Aktualisieren. Bitte erneut versuchen.');
    } finally {
      setRefreshing(false);
    }
  };

  // Handle event drag & drop
  const handleEventDrop = async (eventId: string, newDate: Date) => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // Don't allow dropping recurring instances (only master can be moved)
    if (event.isRecurringInstance) {
      toast.error('Wiederkehrende Instanzen können nicht verschoben werden');
      return;
    }

    try {
      const token = localStorage.getItem("token");

      // Keep the original time, just change the date
      const oldDate = new Date(event.date);
      newDate.setHours(oldDate.getHours(), oldDate.getMinutes(), 0, 0);

      // Optimistic update
      updateEvent(eventId, { date: newDate.toISOString() });

      // API call
      await axios.patch(`/api/calendar/events/${eventId}`, {
        date: newDate.toISOString()
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Event auf ${newDate.toLocaleDateString('de-DE')} verschoben`);
    } catch (err) {
      console.error('Error moving event:', err);
      toast.error('Fehler beim Verschieben des Events');
      // Rollback - refetch events
      fetchEvents(true);
    }
  };

  // Handle Quick Action - mit optimistischen Updates!
  const handleQuickAction = async (action: string, eventId: string, snoozeDays?: number) => {
    // If snooze action without days, open the snooze modal
    if (action === "snooze" && !snoozeDays) {
      setSnoozeEventId(eventId);
      setShowSnoozeModal(true);
      return;
    }

    try {
      // Optimistische Updates - kein Server-Roundtrip für UI
      if (action === "dismiss") {
        await dismissEvent(eventId);
        setShowQuickActions(false);
        setSelectedEvent(null);
        debug.success('Event ausgeblendet (optimistisch)');
        toast.success('Erinnerung wurde ausgeblendet');
        return;
      }

      if (action === "snooze" && snoozeDays) {
        await snoozeEvent(eventId, snoozeDays);
        setShowQuickActions(false);
        setShowSnoozeModal(false);
        setSnoozeEventId(null);
        setSelectedEvent(null);
        debug.success(`Event um ${snoozeDays} Tage verschoben (optimistisch)`);
        toast.success(`Erinnerung um ${snoozeDays} Tage verschoben`);
        return;
      }

      // Für andere Aktionen (compare, optimize, cancel) - Server-Request
      const token = localStorage.getItem("token");
      const response = await axios.post<ApiResponse>("/api/calendar/quick-action", {
        eventId, action, data: {}
      }, { headers: { Authorization: `Bearer ${token}` } });

      if (response.data.success) {
        if (response.data.result?.redirect) {
          window.location.href = response.data.result.redirect;
        } else {
          setShowQuickActions(false);
          setSelectedEvent(null);
          toast.success('Aktion erfolgreich ausgeführt');
        }
      }
    } catch (err) {
      console.error("Error executing action:", err);
      toast.error('Aktion fehlgeschlagen. Bitte erneut versuchen.');
    }
  };

  // Navigation - supports all views
  const navigatePeriod = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      const offset = direction === 'prev' ? -1 : 1;

      switch (currentView) {
        case 'day':
          newDate.setDate(newDate.getDate() + offset);
          break;
        case 'week':
          newDate.setDate(newDate.getDate() + (offset * 7));
          break;
        case 'month':
        default:
          newDate.setMonth(newDate.getMonth() + offset);
          break;
      }
      return newDate;
    });
  };

  // Legacy alias for month navigation
  const navigateMonth = (direction: 'prev' | 'next') => navigatePeriod(direction);

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // ===== SWIPE HANDLERS for mobile navigation =====
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => navigatePeriod('next'),
    onSwipedRight: () => navigatePeriod('prev'),
    trackMouse: false,
    preventScrollOnSwipe: true,
    delta: 50, // Minimum swipe distance
    swipeDuration: 500
  });

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

    const result = {
      upcoming: upcoming.length,
      past: past.length,
      cancelable: cancelable.length,
      autoRenewal: autoRenewal.length
    };

    // ===== DEBUG: Stats berechnet =====
    console.log('%c[DEBUG] Stats berechnet:', 'color: #3b82f6; font-weight: bold;', result);
    console.log('%c[DEBUG] Stats-Farben werden verwendet:', 'color: #f59e0b;');
    console.log('  - Kommende: #10b981 (Grün)');
    console.log('  - Vergangen: #9ca3af (Grau)');
    console.log('  - Kündbar: #f59e0b (Orange)');
    console.log('  - Auto-Verl: #3b82f6 (Blau)');

    return result;
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
          {/* Page Header - Mobile optimiert */}
          <header className="page-header">
            <div className="page-title">
              <div className="page-title-icon">
                <CalendarIcon size={24} />
              </div>
              <div>
                <h1>Vertragskalender</h1>
                {!isMobile && <p>Alle Fristen im Blick - nie wieder eine Deadline verpassen</p>}
              </div>
            </div>
            <div className="header-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShowCreateEventModal(new Date())}
                title="Ereignis erstellen"
              >
                <Plus size={18} />
                {!isMobile && <span className="btn-text">Ereignis erstellen</span>}
              </button>
              {!isMobile && (
                <button
                  className="btn btn-secondary"
                  onClick={() => window.location.href = '/contracts?upload=true'}
                  title="Vertrag hochladen"
                >
                  <FileText size={18} />
                  <span className="btn-text">Vertrag hochladen</span>
                </button>
              )}
              <button
                className="btn btn-secondary"
                onClick={() => setShowSyncModal(true)}
                title="Kalender Sync"
              >
                <Link2 size={18} />
                {!isMobile && <span className="btn-text">Kalender Sync</span>}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleRegenerateEvents}
                disabled={refreshing}
                title="Aktualisieren"
              >
                <RefreshCw size={18} className={refreshing ? 'spinning' : ''} />
                {!isMobile && <span className="btn-text">{refreshing ? 'Lädt...' : 'Aktualisieren'}</span>}
              </button>
            </div>
          </header>

          {/* Main Content Grid */}
          <div className="content-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 340px',
            gap: '24px'
          }}>
            {/* Calendar Container - with Swipe Support */}
            <div className="calendar-container" style={{ gridColumn: '1' }} {...swipeHandlers}>
              {/* Calendar Header */}
              <div className="calendar-header">
                {/* Row 1: [<] [Monat Jahr] [>] [Heute] */}
                <div className="calendar-nav-row">
                  <button className="nav-btn" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft size={20} />
                  </button>
                  <div className="current-month">
                    {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
                  </div>
                  <button className="nav-btn" onClick={() => navigateMonth('next')}>
                    <ChevronRight size={20} />
                  </button>
                  <button className="today-btn" onClick={goToToday}>Heute</button>
                </div>
                {/* Row 2: View Switcher */}
                <div className="view-switcher">
                  {(['month', 'week', 'day'] as const).map(view => (
                    <button
                      key={view}
                      className={`view-btn ${currentView === view ? 'active' : ''}`}
                      onClick={() => {
                        debug.userAction('View-Wechsel', { von: currentView, zu: view });
                        setCurrentView(view);
                      }}
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
                  view={currentView}
                  onDateClick={(date) => {
                    setSelectedDate(date);
                    // Check if this date has events
                    const dateStr = formatLocalDate(date);
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
                  onEventDrop={handleEventDrop}
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
                  <div className="stat-card clickable" onClick={() => {
                    console.log('%c[DEBUG] Stats-Karte geklickt: upcoming', 'color: #10b981; font-weight: bold;');
                    handleStatsCardClick('upcoming');
                  }}>
                    <div className="stat-value" style={{ color: STAT_COLORS.upcoming }}>{stats.upcoming}</div>
                    <div className="stat-label">Kommende</div>
                  </div>
                  <div className="stat-card clickable" onClick={() => {
                    console.log('%c[DEBUG] Stats-Karte geklickt: past', 'color: #9ca3af; font-weight: bold;');
                    handleStatsCardClick('past');
                  }}>
                    <div className="stat-value" style={{ color: STAT_COLORS.past }}>{stats.past}</div>
                    <div className="stat-label">Vergangen</div>
                  </div>
                  <div className="stat-card warning clickable" onClick={() => {
                    console.log('%c[DEBUG] Stats-Karte geklickt: cancelable', 'color: #f59e0b; font-weight: bold;');
                    handleStatsCardClick('cancelable');
                  }}>
                    <div className="stat-value" style={{ color: STAT_COLORS.cancelable }}>{stats.cancelable}</div>
                    <div className="stat-label">Kündbar</div>
                  </div>
                  <div className="stat-card clickable" onClick={() => {
                    console.log('%c[DEBUG] Stats-Karte geklickt: autoRenewal', 'color: #3b82f6; font-weight: bold;');
                    handleStatsCardClick('autoRenewal');
                  }}>
                    <div className="stat-value" style={{ color: STAT_COLORS.autoRenewal }}>{stats.autoRenewal}</div>
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

              {/* Filter Card - Collapsible */}
              <div className="sidebar-card">
                <div
                  className="sidebar-card-header clickable"
                  onClick={() => setShowFilters(!showFilters)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="sidebar-card-title">
                    <Target size={18} />
                    Filter
                    {(filterSeverity !== 'all' || filterType !== 'all') && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '11px',
                        background: '#3b82f6',
                        color: 'white',
                        padding: '2px 6px',
                        borderRadius: '10px'
                      }}>
                        aktiv
                      </span>
                    )}
                  </div>
                  {showFilters ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                {showFilters && (
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
                )}
              </div>
            </aside>
          </div>
        </div>

        {/* ===== MOBILE: Bottom Sheet Toggle FAB ===== */}
        {isMobile && (
          <button
            className={`mobile-filter-toggle ${showBottomSheet ? 'active' : ''}`}
            onClick={() => setShowBottomSheet(!showBottomSheet)}
            aria-label="Filter öffnen"
          >
            {showBottomSheet ? <X size={24} /> : <SlidersHorizontal size={24} />}
          </button>
        )}

        {/* ===== MOBILE: Bottom Sheet Overlay ===== */}
        {isMobile && (
          <div
            className={`bottom-sheet-overlay ${showBottomSheet ? 'visible' : ''}`}
            onClick={() => setShowBottomSheet(false)}
          />
        )}

        {/* ===== MOBILE: Bottom Sheet ===== */}
        {isMobile && (
          <div className={`bottom-sheet ${showBottomSheet ? 'visible' : ''}`}>
            <div className="bottom-sheet-handle" />
            <div className="bottom-sheet-header">
              <span className="bottom-sheet-title">Übersicht & Filter</span>
              <button className="bottom-sheet-close" onClick={() => setShowBottomSheet(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="bottom-sheet-content">
              {/* Stats Grid */}
              <div className="stats-grid" style={{ marginBottom: '20px' }}>
                <div className="stat-card clickable" onClick={() => {
                  handleStatsCardClick('upcoming');
                  setShowBottomSheet(false);
                }}>
                  <div className="stat-value" style={{ color: '#10b981' }}>{stats.upcoming}</div>
                  <div className="stat-label">Kommende</div>
                </div>
                <div className="stat-card clickable" onClick={() => {
                  handleStatsCardClick('past');
                  setShowBottomSheet(false);
                }}>
                  <div className="stat-value" style={{ color: '#9ca3af' }}>{stats.past}</div>
                  <div className="stat-label">Vergangen</div>
                </div>
                <div className="stat-card warning clickable" onClick={() => {
                  handleStatsCardClick('cancelable');
                  setShowBottomSheet(false);
                }}>
                  <div className="stat-value" style={{ color: '#f59e0b' }}>{stats.cancelable}</div>
                  <div className="stat-label">Kündbar</div>
                </div>
                <div className="stat-card clickable" onClick={() => {
                  handleStatsCardClick('autoRenewal');
                  setShowBottomSheet(false);
                }}>
                  <div className="stat-value" style={{ color: '#3b82f6' }}>{stats.autoRenewal}</div>
                  <div className="stat-label">Auto-Verl.</div>
                </div>
              </div>

              {/* Urgent Events - Compact */}
              {urgentEvents.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <AlertCircle size={16} style={{ color: '#ef4444' }} />
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>Dringend ({urgentEvents.length})</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {urgentEvents.slice(0, 3).map(event => (
                      <div
                        key={event.id}
                        onClick={() => {
                          setShowBottomSheet(false);
                          setSelectedEvent(event);
                          setShowQuickActions(true);
                        }}
                        style={{
                          padding: '12px',
                          background: '#f9fafb',
                          borderRadius: '10px',
                          borderLeft: `3px solid ${event.severity === 'critical' ? '#ef4444' : event.severity === 'warning' ? '#f59e0b' : '#3b82f6'}`,
                          cursor: 'pointer'
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '13px', color: '#1f2937' }}>
                          {formatContractName(event.contractName)}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                          {event.title} • {getDaysRemaining(event.date).text}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Filters */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Filter size={16} style={{ color: '#3b82f6' }} />
                  <span style={{ fontWeight: 600, fontSize: '14px' }}>Filter</span>
                  {(filterSeverity !== 'all' || filterType !== 'all') && (
                    <span style={{
                      fontSize: '11px',
                      background: '#3b82f6',
                      color: 'white',
                      padding: '2px 8px',
                      borderRadius: '10px'
                    }}>
                      aktiv
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                      Dringlichkeit
                    </label>
                    <select
                      className="filter-select"
                      value={filterSeverity}
                      onChange={(e) => setFilterSeverity(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="all">Alle</option>
                      <option value="critical">Kritisch</option>
                      <option value="warning">Warnung</option>
                      <option value="info">Info</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: '6px' }}>
                      Ereignistyp
                    </label>
                    <select
                      className="filter-select"
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      style={{ width: '100%' }}
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
            </div>
          </div>
        )}
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
            onEdit={(event) => {
              setShowQuickActions(false);
              setSelectedEvent(null);
              setEditingEvent(event);
            }}
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
            onEventCreated={() => {
              // Event is already added to store directly - no reload needed!
              toast.success('Ereignis erfolgreich erstellt');
            }}
          />
        )}
        {editingEvent && (
          <EditEventModal
            event={editingEvent}
            onClose={() => setEditingEvent(null)}
            onSave={(updatedEvent) => {
              updateEvent(updatedEvent.id, updatedEvent);
              toast.success('Ereignis erfolgreich aktualisiert');
              setEditingEvent(null);
            }}
            onDelete={(eventId) => {
              removeEvent(eventId);
              toast.success('Ereignis erfolgreich gelöscht');
              setEditingEvent(null);
            }}
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
