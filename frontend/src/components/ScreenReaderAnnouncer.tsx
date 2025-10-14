// 📢 src/components/ScreenReaderAnnouncer.tsx - ARIA Live Region for Announcements
import { useEffect, useState } from 'react';
import styles from './ScreenReaderAnnouncer.module.css';

interface AnnouncerProps {
  announcement: string;
  ariaLive?: 'polite' | 'assertive' | 'off';
  clearAfter?: number;
}

export default function ScreenReaderAnnouncer({
  announcement,
  ariaLive = 'polite',
  clearAfter = 3000,
}: AnnouncerProps) {
  const [message, setMessage] = useState(announcement);

  useEffect(() => {
    setMessage(announcement);

    if (clearAfter > 0) {
      const timer = setTimeout(() => {
        setMessage('');
      }, clearAfter);

      return () => clearTimeout(timer);
    }
  }, [announcement, clearAfter]);

  return (
    <div
      className={styles.announcer}
      role="status"
      aria-live={ariaLive}
      aria-atomic="true"
    >
      {message}
    </div>
  );
}

// Global announcer hook for use throughout the app
import { createContext, useContext, useCallback, ReactNode } from 'react';

interface AnnouncerContextType {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
}

const AnnouncerContext = createContext<AnnouncerContextType | undefined>(undefined);

export function AnnouncerProvider({ children }: { children: ReactNode }) {
  const [announcements, setAnnouncements] = useState<{
    polite: string;
    assertive: string;
  }>({ polite: '', assertive: '' });

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    setAnnouncements((prev) => ({
      ...prev,
      [priority]: message,
    }));

    // Clear after announcement
    setTimeout(() => {
      setAnnouncements((prev) => ({
        ...prev,
        [priority]: '',
      }));
    }, 3000);
  }, []);

  return (
    <AnnouncerContext.Provider value={{ announce }}>
      {children}
      <div className={styles.announcer} role="status" aria-live="polite" aria-atomic="true">
        {announcements.polite}
      </div>
      <div className={styles.announcer} role="alert" aria-live="assertive" aria-atomic="true">
        {announcements.assertive}
      </div>
    </AnnouncerContext.Provider>
  );
}

export function useAnnouncer() {
  const context = useContext(AnnouncerContext);
  if (!context) {
    throw new Error('useAnnouncer must be used within AnnouncerProvider');
  }
  return context;
}
