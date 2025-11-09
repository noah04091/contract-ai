// 📁 frontend/src/hooks/useLegalPulseFeed.ts
// Legal Pulse 2.0 - SSE Feed Hook

import { useState, useEffect, useCallback, useRef } from 'react';

interface PulseEvent {
  type: 'alert' | 'update' | 'connected' | 'test';
  data?: any;
  message?: string;
  connectionId?: string;
  timestamp: string;
}

interface UseLegalPulseFeedReturn {
  events: PulseEvent[];
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
  clearEvents: () => void;
  lastEvent: PulseEvent | null;
}

/**
 * Hook for Legal Pulse real-time feed using Server-Sent Events
 */
export function useLegalPulseFeed(): UseLegalPulseFeedReturn {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<PulseEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const maxReconnectAttempts = 5;
  const baseReconnectDelay = 1000; // 1 second

  const connect = useCallback(() => {
    // Prevent multiple connections
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      console.log('[Legal Pulse Feed] Already connected');
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const url = `${apiUrl}/api/legalpulse/stream`;

      console.log('[Legal Pulse Feed] Connecting to:', url);

      const eventSource = new EventSource(url, {
        withCredentials: true
      });

      eventSource.onopen = () => {
        console.log('[Legal Pulse Feed] ✓ Connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[Legal Pulse Feed] Event received:', data);

          const pulseEvent: PulseEvent = {
            type: data.type || 'update',
            data: data.data,
            message: data.message,
            connectionId: data.connectionId,
            timestamp: data.timestamp || new Date().toISOString()
          };

          setEvents((prev) => [...prev, pulseEvent]);
          setLastEvent(pulseEvent);

        } catch (error) {
          console.error('[Legal Pulse Feed] Error parsing event:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('[Legal Pulse Feed] ✗ Connection error:', error);
        setIsConnected(false);

        // Close current connection
        eventSource.close();

        // Attempt reconnect with exponential backoff
        if (reconnectAttempts.current < maxReconnectAttempts) {
          const delay = baseReconnectDelay * Math.pow(2, reconnectAttempts.current);
          console.log(`[Legal Pulse Feed] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current + 1}/${maxReconnectAttempts})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            connect();
          }, delay);
        } else {
          console.error('[Legal Pulse Feed] Max reconnect attempts reached');
        }
      };

      eventSourceRef.current = eventSource;

    } catch (error) {
      console.error('[Legal Pulse Feed] Error creating connection:', error);
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    console.log('[Legal Pulse Feed] Disconnecting...');

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setIsConnected(false);
    reconnectAttempts.current = 0;
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  // Auto-connect on mount, disconnect on unmount
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    events,
    isConnected,
    connect,
    disconnect,
    clearEvents,
    lastEvent
  };
}

/**
 * Hook variant that only connects when explicitly called
 */
export function useLegalPulseFeedManual(): UseLegalPulseFeedReturn {
  const [events, setEvents] = useState<PulseEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<PulseEvent | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    if (eventSourceRef.current?.readyState === EventSource.OPEN) {
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const url = `${apiUrl}/api/legalpulse/stream`;

      const eventSource = new EventSource(url, {
        withCredentials: true
      });

      eventSource.onopen = () => {
        console.log('[Legal Pulse Feed] Connected (manual)');
        setIsConnected(true);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const pulseEvent: PulseEvent = {
            type: data.type || 'update',
            data: data.data,
            message: data.message,
            connectionId: data.connectionId,
            timestamp: data.timestamp || new Date().toISOString()
          };

          setEvents((prev) => [...prev, pulseEvent]);
          setLastEvent(pulseEvent);
        } catch (error) {
          console.error('[Legal Pulse Feed] Parse error:', error);
        }
      };

      eventSource.onerror = () => {
        console.error('[Legal Pulse Feed] Error (manual mode)');
        setIsConnected(false);
        eventSource.close();
      };

      eventSourceRef.current = eventSource;

    } catch (error) {
      console.error('[Legal Pulse Feed] Connection error:', error);
      setIsConnected(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setLastEvent(null);
  }, []);

  // Manual mode: don't auto-connect
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    events,
    isConnected,
    connect,
    disconnect,
    clearEvents,
    lastEvent
  };
}

export default useLegalPulseFeed;
