import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Bell,
  Calendar,
  PenTool,
  AlertTriangle,
  CheckCircle,
  Info,
  RefreshCw,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import styles from './AllNotificationsModal.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.contract-ai.de';

interface Notification {
  id: string;
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  time: string;
  category: string;
  contractId?: string;
  actionUrl?: string;
  createdAt: string;
}

interface AllNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getDateGroup(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  // Zukunft (Kalender-Events)
  if (date >= today && date < new Date(today.getTime() + 86400000)) return 'Heute';
  if (date >= new Date(today.getTime() + 86400000)) {
    const daysAhead = Math.ceil((date.getTime() - today.getTime()) / 86400000);
    if (daysAhead <= 7) return 'Diese Woche';
    return 'Kommend';
  }

  // Vergangenheit
  if (date >= today) return 'Heute';
  if (date >= yesterday) return 'Gestern';
  if (date >= weekAgo) return 'Diese Woche';

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  if (date >= monthStart) return 'Dieser Monat';

  return 'Älter';
}

function getNotificationIcon(type: string, category?: string) {
  if (category === 'calendar') {
    return <Calendar size={16} strokeWidth={2} />;
  }
  if (category === 'signature') {
    return <PenTool size={16} strokeWidth={2} />;
  }
  switch (type) {
    case 'warning':
      return <AlertTriangle size={16} strokeWidth={2} />;
    case 'success':
      return <CheckCircle size={16} strokeWidth={2} />;
    default:
      return <Info size={16} strokeWidth={2} />;
  }
}

function getIconClass(type: string): string {
  switch (type) {
    case 'warning': return styles.iconWarning;
    case 'success': return styles.iconSuccess;
    default: return styles.iconInfo;
  }
}

export default function AllNotificationsModal({ isOpen, onClose }: AllNotificationsModalProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('authToken') || localStorage.getItem('token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  const fetchNotifications = useCallback(async (offset: number, append: boolean) => {
    if (offset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);

    try {
      const response = await fetch(
        `${API_BASE}/api/dashboard/notifications?days=30&limit=20&offset=${offset}`,
        { headers: getAuthHeaders(), credentials: 'include' }
      );

      if (!response.ok) {
        setError('Verbindungsfehler');
        return;
      }

      const data = await response.json();
      if (!data.success) {
        setError('Fehler beim Laden');
        return;
      }

      const fetched = data.notifications || [];
      setNotifications(prev => append ? [...prev, ...fetched] : fetched);
      setTotalCount(data.stats?.total || 0);
      setHasMore(data.pagination?.hasMore || false);
    } catch {
      setError('Netzwerkfehler');
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setNotifications([]);
      fetchNotifications(0, false);
    }
  }, [isOpen, fetchNotifications]);

  const handleLoadMore = () => {
    fetchNotifications(notifications.length, true);
  };

  const handleNotificationClick = (notification: Notification) => {
    onClose();
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  // Gruppiere nach Datum
  const grouped = notifications.reduce<Record<string, Notification[]>>((acc, n) => {
    const group = getDateGroup(n.createdAt);
    if (!acc[group]) acc[group] = [];
    acc[group].push(n);
    return acc;
  }, {});

  // Stabile Reihenfolge der Gruppen
  const groupOrder = ['Heute', 'Morgen', 'Diese Woche', 'Kommend', 'Gestern', 'Dieser Monat', 'Älter'];
  const sortedGroups = groupOrder.filter(g => grouped[g]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className={styles.overlay}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={styles.modal}
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={styles.header}>
            <div className={styles.headerLeft}>
              <h2>Alle Benachrichtigungen</h2>
              {totalCount > 0 && (
                <span className={styles.totalBadge}>{totalCount}</span>
              )}
            </div>
            <button className={styles.closeButton} onClick={onClose}>
              <X size={20} />
            </button>
          </div>

          {/* Body */}
          <div className={styles.body}>
            {isLoading ? (
              <div className={styles.loading}>
                <RefreshCw size={24} className={styles.spinIcon} />
                <span>Benachrichtigungen werden geladen...</span>
              </div>
            ) : error ? (
              <div className={styles.error}>
                <AlertCircle size={28} />
                <span>{error}</span>
                <button className={styles.retryButton} onClick={() => fetchNotifications(0, false)}>
                  <RefreshCw size={14} />
                  Erneut versuchen
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className={styles.empty}>
                <Bell size={32} />
                <span>Keine Benachrichtigungen in den letzten 30 Tagen</span>
              </div>
            ) : (
              <>
                {sortedGroups.map(group => (
                  <div key={group} className={styles.dateGroup}>
                    <div className={styles.dateGroupHeader}>{group}</div>
                    {grouped[group].map(notification => (
                      <button
                        key={notification.id}
                        className={styles.notificationItem}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <div className={`${styles.notificationIcon} ${getIconClass(notification.type)}`}>
                          {getNotificationIcon(notification.type, notification.category)}
                        </div>
                        <div className={styles.notificationContent}>
                          <div className={styles.notificationTitle}>{notification.title}</div>
                          <div className={styles.notificationMessage}>{notification.message}</div>
                          <div className={styles.notificationTime}>{notification.time}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ))}

                {hasMore && (
                  <div className={styles.loadMoreContainer}>
                    <button
                      className={styles.loadMoreButton}
                      onClick={handleLoadMore}
                      disabled={isLoadingMore}
                    >
                      {isLoadingMore ? (
                        <>
                          <RefreshCw size={14} className={styles.spinIcon} />
                          Lade...
                        </>
                      ) : (
                        <>
                          <ChevronDown size={14} />
                          Mehr laden
                        </>
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
