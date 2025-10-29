import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import styles from './CalendarDayView.module.css';

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

interface CalendarDayViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
}

const WEEKDAYS_FULL = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];

function getEventsForDate(events: CalendarEvent[], date: Date): CalendarEvent[] {
  return events.filter(event => {
    const eventDate = new Date(event.date);
    return eventDate.toDateString() === date.toDateString();
  });
}

export default function CalendarDayView({
  date,
  events,
  onEventClick,
  onPrevDay,
  onNextDay
}: CalendarDayViewProps) {
  const dayEvents = getEventsForDate(events, date);
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  const formatDate = () => {
    return `${WEEKDAYS_FULL[date.getDay()]}, ${date.getDate()}. ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
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

  const formatEventTime = (dateString: string) => {
    const eventDate = new Date(dateString);
    return eventDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={styles.dayView}>
      {/* Day Navigation */}
      <div className={styles.dayNav}>
        <button className={styles.navButton} onClick={onPrevDay}>
          <ChevronLeft size={20} />
        </button>
        <div className={styles.dateInfo}>
          <h3 className={styles.dateTitle}>{formatDate()}</h3>
          {isToday && <span className={styles.todayBadge}>Heute</span>}
        </div>
        <button className={styles.navButton} onClick={onNextDay}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Day Content */}
      <div className={styles.dayContent}>
        {dayEvents.length === 0 ? (
          <div className={styles.noEvents}>
            <Clock size={48} />
            <h4>Keine Ereignisse für diesen Tag</h4>
            <p>Genieße einen ereignisfreien Tag!</p>
          </div>
        ) : (
          <>
            <div className={styles.eventsSummary}>
              <span className={styles.eventCount}>
                {dayEvents.length} {dayEvents.length === 1 ? 'Ereignis' : 'Ereignisse'}
              </span>
              <div className={styles.severityBreakdown}>
                {dayEvents.filter(e => e.severity === 'critical').length > 0 && (
                  <span className={styles.criticalCount}>
                    {dayEvents.filter(e => e.severity === 'critical').length} Kritisch
                  </span>
                )}
                {dayEvents.filter(e => e.severity === 'warning').length > 0 && (
                  <span className={styles.warningCount}>
                    {dayEvents.filter(e => e.severity === 'warning').length} Warnung
                  </span>
                )}
                {dayEvents.filter(e => e.severity === 'info').length > 0 && (
                  <span className={styles.infoCount}>
                    {dayEvents.filter(e => e.severity === 'info').length} Info
                  </span>
                )}
              </div>
            </div>

            <div className={styles.eventsList}>
              {dayEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  className={`${styles.eventCard} ${getSeverityClass(event.severity)}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => onEventClick(event)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={styles.eventTime}>
                    <Clock size={16} />
                    <span>{formatEventTime(event.date)}</span>
                  </div>
                  <div className={styles.eventInfo}>
                    <h4 className={styles.eventTitle}>{event.title}</h4>
                    <p className={styles.eventContract}>{event.contractName}</p>
                    {event.description && (
                      <p className={styles.eventDescription}>{event.description}</p>
                    )}
                  </div>
                  <div className={styles.eventMeta}>
                    <span className={styles.eventType}>{event.type}</span>
                    <span className={`${styles.severityBadge} ${getSeverityClass(event.severity)}`}>
                      {event.severity === 'critical' ? 'Kritisch' : event.severity === 'warning' ? 'Warnung' : 'Info'}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
