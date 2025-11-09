// 📁 frontend/src/hooks/usePushNotifications.ts
// Legal Pulse 2.0 Phase 3 - Browser Push Notifications

import { useState, useEffect, useCallback } from 'react';

interface NotificationData {
  url?: string;
  severity?: string;
  timestamp?: string;
  [key: string]: string | number | boolean | undefined;
}

interface PushNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: NotificationData;
  requireInteraction?: boolean;
  silent?: boolean;
  vibrate?: number[];
}

interface UsePushNotificationsResult {
  isSupported: boolean;
  permission: NotificationPermission;
  requestPermission: () => Promise<NotificationPermission>;
  showNotification: (options: PushNotificationOptions) => Promise<Notification | null>;
  showLegalPulseAlert: (title: string, message: string, severity?: 'low' | 'medium' | 'high' | 'critical') => Promise<Notification | null>;
}

export const usePushNotifications = (): UsePushNotificationsResult => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');

  // Check browser support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setIsSupported(true);
      setPermission(Notification.permission);
    }
  }, []);

  /**
   * Request notification permission
   */
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (!isSupported) {
      console.warn('[PUSH-NOTIFICATIONS] Not supported in this browser');
      return 'denied';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      console.log('[PUSH-NOTIFICATIONS] Permission:', result);
      return result;
    } catch (error) {
      console.error('[PUSH-NOTIFICATIONS] Permission request failed:', error);
      return 'denied';
    }
  }, [isSupported]);

  /**
   * Show notification
   */
  const showNotification = useCallback(async (options: PushNotificationOptions): Promise<Notification | null> => {
    if (!isSupported) {
      console.warn('[PUSH-NOTIFICATIONS] Not supported');
      return null;
    }

    // Request permission if not granted
    if (permission === 'default') {
      const newPermission = await requestPermission();
      if (newPermission !== 'granted') {
        console.warn('[PUSH-NOTIFICATIONS] Permission not granted');
        return null;
      }
    }

    if (permission === 'denied') {
      console.warn('[PUSH-NOTIFICATIONS] Permission denied');
      return null;
    }

    try {
      const notificationOptions: NotificationOptions & { vibrate?: number[] } = {
        body: options.body,
        icon: options.icon || '/logo.png',
        badge: options.badge || '/badge.png',
        tag: options.tag || 'legal-pulse',
        data: options.data || {},
        requireInteraction: options.requireInteraction || false,
        silent: options.silent || false,
      };

      // Add vibrate if supported (not all browsers/TypeScript defs support it)
      if (options.vibrate && 'vibrate' in navigator) {
        notificationOptions.vibrate = options.vibrate;
      }

      const notification = new Notification(options.title, notificationOptions);

      // Auto-close after 10 seconds
      setTimeout(() => {
        notification.close();
      }, 10000);

      // Click handler
      notification.onclick = (event) => {
        event.preventDefault();
        window.focus();
        notification.close();

        // Navigate if data.url is provided
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
      };

      console.log('[PUSH-NOTIFICATIONS] Notification shown:', options.title);

      return notification;

    } catch (error) {
      console.error('[PUSH-NOTIFICATIONS] Failed to show notification:', error);
      return null;
    }
  }, [isSupported, permission, requestPermission]);

  /**
   * Show Legal Pulse alert notification
   */
  const showLegalPulseAlert = useCallback(async (
    title: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<Notification | null> => {
    const severityConfig = getSeverityConfig(severity);

    return showNotification({
      title: `⚡ Legal Pulse Alert: ${title}`,
      body: message,
      icon: '/legal-pulse-icon.png',
      badge: '/legal-pulse-badge.png',
      tag: `legal-pulse-${severity}`,
      requireInteraction: severity === 'critical' || severity === 'high',
      vibrate: severityConfig.vibrate,
      data: {
        severity,
        timestamp: new Date().toISOString(),
        url: '/legal-pulse'
      }
    });
  }, [showNotification]);

  return {
    isSupported,
    permission,
    requestPermission,
    showNotification,
    showLegalPulseAlert
  };
};

/**
 * Get severity-specific configuration
 */
function getSeverityConfig(severity: 'low' | 'medium' | 'high' | 'critical') {
  const configs = {
    low: {
      vibrate: [100]
    },
    medium: {
      vibrate: [200, 100, 200]
    },
    high: {
      vibrate: [300, 100, 300, 100, 300]
    },
    critical: {
      vibrate: [500, 200, 500, 200, 500]
    }
  };

  return configs[severity];
}

export default usePushNotifications;
