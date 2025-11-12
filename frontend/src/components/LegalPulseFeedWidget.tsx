// 📁 frontend/src/components/LegalPulseFeedWidget.tsx
// Legal Pulse Feed Widget - Real-time Notifications Display

import { useNavigate } from 'react-router-dom';
import styles from '../styles/LegalPulseFeedWidget.module.css';

interface FeedEvent {
  type: 'alert' | 'law-change' | 'connected' | 'test' | string;
  timestamp: string | number;
  message?: string;
  data?: {
    title?: string;
    description?: string;
    lawId?: string;
    area?: string;
    similarity?: number;
    effectiveDate?: string;
    actionUrl?: string;
  };
}

interface LegalPulseFeedWidgetProps {
  feedConnected: boolean;
  feedEvents: FeedEvent[];
  onClearEvents: () => void;
}

export default function LegalPulseFeedWidget({
  feedConnected,
  feedEvents,
  onClearEvents
}: LegalPulseFeedWidgetProps) {
  const navigate = useNavigate();

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'alert': return '⚠️';
      case 'law-change': return '⚖️';
      case 'connected': return '✅';
      case 'test': return '🧪';
      default: return '📢';
    }
  };

  const getEventTypeLabel = (type: string) => {
    if (type === 'law-change') return 'GESETZESÄNDERUNG';
    return type.toUpperCase();
  };

  return (
    <div className={styles.feedWidget}>
      <div className={styles.feedHeader}>
        <h3>⚡ Live Feed</h3>
        <p>Echtzeit-Benachrichtigungen zu Gesetzesänderungen und Risiken</p>
        <div className={styles.feedStatus}>
          <span className={feedConnected ? styles.statusConnected : styles.statusDisconnected}>
            {feedConnected ? '🟢 Verbunden' : '🔴 Nicht verbunden'}
          </span>
          {feedEvents.length > 0 && (
            <button className={styles.clearButton} onClick={onClearEvents}>
              Alle löschen
            </button>
          )}
        </div>
      </div>

      <div className={styles.feedList}>
        {feedEvents.length > 0 ? (
          [...feedEvents].reverse().map((event, index) => (
            <div
              key={index}
              className={`${styles.feedEvent} ${styles[`type-${event.type}`]}`}
            >
              <div className={styles.feedEventHeader}>
                <span className={styles.feedEventType}>
                  {getEventIcon(event.type)} {getEventTypeLabel(event.type)}
                </span>
                <span className={styles.feedEventTime}>
                  {new Date(event.timestamp).toLocaleTimeString('de-DE')}
                </span>
              </div>

              {event.message && (
                <div className={styles.feedEventMessage}>{event.message}</div>
              )}

              {event.data && (
                <div className={styles.feedEventData}>
                  <strong>{event.data.title || 'Keine Titel'}</strong>
                  <p>{event.data.description || ''}</p>

                  {/* Law Change specific details */}
                  {event.type === 'law-change' && event.data && (
                    <div className={styles.lawChangeDetails}>
                      {event.data.lawId && (
                        <div className={styles.lawChangeMeta}>
                          <span className={styles.metaLabel}>Gesetz:</span>
                          <span className={styles.metaValue}>{event.data.lawId}</span>
                        </div>
                      )}
                      {event.data.area && (
                        <div className={styles.lawChangeMeta}>
                          <span className={styles.metaLabel}>Bereich:</span>
                          <span className={styles.metaValue}>{event.data.area}</span>
                        </div>
                      )}
                      {event.data.similarity !== undefined && (
                        <div className={styles.lawChangeMeta}>
                          <span className={styles.metaLabel}>Relevanz:</span>
                          <span className={styles.metaValue}>
                            {Math.round(event.data.similarity * 100)}%
                          </span>
                        </div>
                      )}
                      {event.data.effectiveDate && (
                        <div className={styles.lawChangeMeta}>
                          <span className={styles.metaLabel}>Inkrafttreten:</span>
                          <span className={styles.metaValue}>{event.data.effectiveDate}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {event.data.actionUrl && (
                    <button
                      className={styles.feedActionButton}
                      onClick={() => {
                        if (event.data?.actionUrl) {
                          navigate(event.data.actionUrl);
                        }
                      }}
                    >
                      {event.type === 'law-change' ? 'Vertrag prüfen →' : 'Zur Aktion'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <p>Keine Benachrichtigungen</p>
            <small>Live-Benachrichtigungen erscheinen hier automatisch</small>
          </div>
        )}
      </div>
    </div>
  );
}
