import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './CalendarWeekView.module.css';

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
  metadata?: Record<string, unknown>;
}

interface CalendarWeekViewProps {
  weekStart: Date;
  events: CalendarEvent[];
  onDateClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onPrevWeek: () => void;
  onNextWeek: () => void;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    days.push(day);
  }
  return days;
}

function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.toDateString() === date.toDateString();
  });
}

export default function CalendarWeekView({
  weekStart,
  events,
  onDateClick,
  onEventClick,
  onPrevWeek,
  onNextWeek
}: CalendarWeekViewProps) {
  const weekDays = getWeekDays(weekStart);
  const today = new Date();

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const formatWeekRange = () => {
    const start = `${weekStart.getDate()}.${weekStart.getMonth() + 1}.`;
    const end = `${weekEnd.getDate()}.${weekEnd.getMonth() + 1}.${weekEnd.getFullYear()}`;
    return `${start} - ${end}`;
  };

  const isToday = (date: Date) => {
    return date.toDateString() === today.toDateString();
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return styles.critical;
      case 'warning':
        return styles.warning;
      default:
        return styles.info;
    }
  };

  return (
    <div className={styles.weekView}>
      {/* Week Navigation */}
      <div className={styles.weekNav}>
        <button className={styles.navButton} onClick={onPrevWeek}>
          <ChevronLeft size={20} />
        </button>
        <h3 className={styles.weekRange}>{formatWeekRange()}</h3>
        <button className={styles.navButton} onClick={onNextWeek}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Week Grid */}
      <div className={styles.weekGrid}>
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDate(events, day);
          const isTodayFlag = isToday(day);

          return (
            <motion.div
              key={day.toISOString()}
              className={`${styles.dayColumn} ${isTodayFlag ? styles.today : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => onDateClick(day)}
            >
              {/* Day Header */}
              <div className={styles.dayHeader}>
                <span className={styles.weekday}>{WEEKDAYS[index]}</span>
                <span className={styles.dayNumber}>{day.getDate()}</span>
                {dayEvents.length > 0 && (
                  <span className={styles.eventCount}>{dayEvents.length}</span>
                )}
              </div>

              {/* Day Events */}
              <div className={styles.dayEvents}>
                {dayEvents.length === 0 ? (
                  <div className={styles.noEvents}>Keine Events</div>
                ) : (
                  dayEvents.slice(0, 5).map((event) => (
                    <motion.div
                      key={event.id}
                      className={`${styles.eventCard} ${getSeverityClass(event.severity)}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className={styles.eventTitle}>{event.title}</div>
                      <div className={styles.eventContract}>{event.contractName}</div>
                    </motion.div>
                  ))
                )}
                {dayEvents.length > 5 && (
                  <div className={styles.moreEvents}>
                    +{dayEvents.length - 5} weitere
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
