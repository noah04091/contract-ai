import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import styles from './UpcomingDeadlinesWidget.module.css';
import {
  Calendar,
  Clock,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react';

interface UpcomingEvent {
  id: string;
  title: string;
  date: string;
  severity: 'info' | 'warning' | 'critical';
  contractName: string;
  daysUntil: number;
}

interface UpcomingDeadlinesWidgetProps {
  className?: string;
}

export default function UpcomingDeadlinesWidget({ className }: UpcomingDeadlinesWidgetProps) {
  const [events, setEvents] = useState<UpcomingEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUpcomingDeadlines();
  }, []);

  const fetchUpcomingDeadlines = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      const response = await axios.get<{ success: boolean; events?: UpcomingEvent[] }>('/api/calendar/upcoming', {
        headers: { Authorization: `Bearer ${token}` },
        params: { days: 30 }
      });

      if (response.data.success && Array.isArray(response.data.events)) {
        setEvents(response.data.events);
      } else {
        setEvents([]);
      }
    } catch (err: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      console.error('Error fetching upcoming deadlines:', err);
      setError(null); // Stille Fehler - zeige Widget nicht an
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className={styles.iconCritical} size={16} />;
      case 'warning':
        return <Clock className={styles.iconWarning} size={16} />;
      default:
        return <CheckCircle2 className={styles.iconInfo} size={16} />;
    }
  };

  const getSeverityClass = (severity: string) => {
    switch (severity) {
      case 'critical':
        return styles.deadlineCritical;
      case 'warning':
        return styles.deadlineWarning;
      default:
        return styles.deadlineInfo;
    }
  };

  const formatDaysUntil = (days: number) => {
    if (days === 0) return 'Heute';
    if (days === 1) return 'Morgen';
    if (days < 0) return `Vor ${Math.abs(days)} Tagen`;
    return `In ${days} Tagen`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className={`${styles.widget} ${className || ''}`}>
        <div className={styles.widgetHeader}>
          <div className={styles.headerTitle}>
            <Calendar size={20} />
            <h2>Anstehende Termine</h2>
          </div>
        </div>
        <div className={styles.widgetContent}>
          {[1, 2, 3].map((i) => (
            <div key={i} className={styles.skeletonItem}>
              <div className={styles.skeletonIcon}></div>
              <div className={styles.skeletonText}>
                <div className={styles.skeletonTitle}></div>
                <div className={styles.skeletonSubtitle}></div>
              </div>
              <div className={styles.skeletonBadge}></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`${styles.widget} ${className || ''}`}>
        <div className={styles.widgetHeader}>
          <div className={styles.headerTitle}>
            <Calendar size={20} />
            <h2>Anstehende Termine</h2>
          </div>
        </div>
        <div className={styles.errorState}>
          <XCircle size={32} />
          <p>{error}</p>
          <button onClick={fetchUpcomingDeadlines} className={styles.retryButton}>
            <RefreshCw size={16} />
            Erneut versuchen
          </button>
        </div>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className={`${styles.widget} ${className || ''}`}>
        <div className={styles.widgetHeader}>
          <div className={styles.headerTitle}>
            <Calendar size={20} />
            <h2>Anstehende Termine</h2>
          </div>
          <button
            onClick={() => navigate('/calendar')}
            className={styles.viewAllButton}
          >
            Zum Kalender
            <ArrowRight size={16} />
          </button>
        </div>
        <div className={styles.emptyState}>
          <CheckCircle2 size={48} className={styles.emptyIcon} />
          <p className={styles.emptyTitle}>Keine anstehenden Termine</p>
          <p className={styles.emptySubtitle}>
            Du hast in den nächsten 30 Tagen keine wichtigen Vertragsfristen
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.widget} ${className || ''}`}>
      <div className={styles.widgetHeader}>
        <div className={styles.headerTitle}>
          <Calendar size={20} />
          <h2>Anstehende Termine</h2>
          <span className={styles.eventCount}>{events.length}</span>
        </div>
        <button
          onClick={() => navigate('/calendar')}
          className={styles.viewAllButton}
        >
          Alle anzeigen
          <ArrowRight size={16} />
        </button>
      </div>

      <div className={styles.widgetContent}>
        {events.slice(0, 5).map((event) => (
          <div
            key={event.id}
            className={`${styles.deadlineItem} ${getSeverityClass(event.severity)}`}
            onClick={() => navigate('/calendar')}
          >
            <div className={styles.deadlineIcon}>
              {getSeverityIcon(event.severity)}
            </div>

            <div className={styles.deadlineInfo}>
              <h3 className={styles.deadlineTitle}>{event.title}</h3>
              <p className={styles.deadlineContract}>{event.contractName}</p>
              <p className={styles.deadlineDate}>{formatDate(event.date)}</p>
            </div>

            <div className={styles.deadlineCountdown}>
              <span className={styles.countdownBadge}>
                {formatDaysUntil(event.daysUntil)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {events.length > 5 && (
        <div className={styles.widgetFooter}>
          <button
            onClick={() => navigate('/calendar')}
            className={styles.viewMoreButton}
          >
            +{events.length - 5} weitere Termine anzeigen
          </button>
        </div>
      )}
    </div>
  );
}
