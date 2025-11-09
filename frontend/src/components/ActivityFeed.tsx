// 📁 frontend/src/components/ActivityFeed.tsx
// Legal Pulse 2.0 Phase 2 - Activity Feed Component

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from '../styles/ActivityFeed.module.css';

interface Notification {
  _id: string;
  type: string;
  severity: string;
  title: string;
  description: string;
  actionUrl?: string;
  actionType?: string;
  read: boolean;
  createdAt: string;
  lawReference?: {
    lawId: string;
    sectionId: string;
    area: string;
  };
}

interface ActivityFeedProps {
  limit?: number;
  showHeader?: boolean;
}

export default function ActivityFeed({ limit = 10, showHeader = true }: ActivityFeedProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, [limit]);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/pulse-notifications?limit=${limit}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Fehler beim Laden der Aktivitäten');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/pulse-notifications/${notificationId}/read`, {
        method: 'PATCH',
        credentials: 'include'
      });

      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n._id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const getIcon = (type: string, severity: string) => {
    const icons = {
      law_change: '⚖️',
      risk_increase: '⚠️',
      deadline: '📅',
      forecast: '🔮',
      action_required: '🎯'
    };

    const severityIcons = {
      critical: '🔴',
      high: '🟠',
      medium: '🟡',
      low: '🟢'
    };

    return icons[type as keyof typeof icons] || severityIcons[severity as keyof typeof severityIcons] || '📢';
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Gerade eben';
    if (diffMins < 60) return `vor ${diffMins} Min`;
    if (diffHours < 24) return `vor ${diffHours} Std`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays === 1 ? '' : 'en'}`;

    return date.toLocaleDateString('de-DE');
  };

  if (loading) {
    return (
      <div className={styles.activityFeed}>
        {showHeader && <h3 className={styles.header}>📊 Aktivitäten</h3>}
        <div className={styles.loading}>Lade Aktivitäten...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.activityFeed}>
        {showHeader && <h3 className={styles.header}>📊 Aktivitäten</h3>}
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className={styles.activityFeed}>
        {showHeader && <h3 className={styles.header}>📊 Aktivitäten</h3>}
        <div className={styles.empty}>
          <p>Keine Aktivitäten</p>
          <small>Neue Benachrichtigungen erscheinen hier automatisch</small>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.activityFeed}>
      {showHeader && (
        <div className={styles.headerRow}>
          <h3 className={styles.header}>📊 Aktivitäten</h3>
          <Link to="/legalpulse" className={styles.viewAll}>
            Alle anzeigen →
          </Link>
        </div>
      )}

      <div className={styles.feedList}>
        {notifications.map((notification) => (
          <div
            key={notification._id}
            className={`${styles.feedItem} ${notification.read ? styles.read : styles.unread} ${styles[`severity-${notification.severity}`]}`}
            onClick={() => !notification.read && markAsRead(notification._id)}
          >
            <div className={styles.iconContainer}>
              <span className={styles.icon}>
                {getIcon(notification.type, notification.severity)}
              </span>
            </div>

            <div className={styles.content}>
              <div className={styles.titleRow}>
                <h4 className={styles.title}>{notification.title}</h4>
                {!notification.read && <span className={styles.unreadDot}></span>}
              </div>

              <p className={styles.description}>{notification.description}</p>

              {notification.lawReference && (
                <div className={styles.lawRef}>
                  📚 {notification.lawReference.lawId} {notification.lawReference.sectionId}
                </div>
              )}

              <div className={styles.footer}>
                <span className={styles.time}>{getTimeAgo(notification.createdAt)}</span>

                {notification.actionUrl && (
                  <Link
                    to={notification.actionUrl}
                    className={styles.actionButton}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {notification.actionType === 'optimize' && '🔧 Optimieren'}
                    {notification.actionType === 'generate' && '✨ Generieren'}
                    {notification.actionType === 'sign' && '✍️ Signieren'}
                    {notification.actionType === 'review' && '👁️ Prüfen'}
                    {notification.actionType === 'none' && 'Details'}
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
