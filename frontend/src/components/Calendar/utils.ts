/**
 * Calendar Utilities
 * Shared helper functions for all calendar components
 */

// Format contract name (truncate if too long)
export const formatContractName = (name: string): string => {
  if (!name) return 'Unbekannt';
  if (name.length > 35) return name.substring(0, 32) + '...';
  return name;
};

// Calculate days remaining until a date
export const getDaysRemaining = (date: string) => {
  const eventDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  eventDate.setHours(0, 0, 0, 0);
  const diffTime = eventDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return {
    days: Math.abs(diffDays),
    isPast: diffDays < 0,
    isToday: diffDays === 0
  };
};

// Format date to local YYYY-MM-DD
export const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format date for display
export const formatDisplayDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-DE', options || {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

// Format date with weekday
export const formatDateWithWeekday = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('de-DE', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

// Get relative time string
export const getRelativeTimeString = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const { days, isPast, isToday } = getDaysRemaining(d.toISOString());

  if (isToday) return 'Heute';
  if (days === 1) return isPast ? 'Gestern' : 'Morgen';
  return isPast ? `vor ${days} Tagen` : `in ${days} Tagen`;
};

// Weekday names (German, starting Monday)
export const WEEKDAYS = ['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'];

// Month names (German)
export const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

// Get severity color
export const getSeverityColor = (severity: 'info' | 'warning' | 'critical') => {
  switch (severity) {
    case 'critical':
      return {
        text: '#ef4444',
        bg: 'rgba(239, 68, 68, 0.1)',
        border: 'rgba(239, 68, 68, 0.2)'
      };
    case 'warning':
      return {
        text: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.1)',
        border: 'rgba(245, 158, 11, 0.2)'
      };
    default:
      return {
        text: '#3b82f6',
        bg: 'rgba(59, 130, 246, 0.1)',
        border: 'rgba(59, 130, 246, 0.2)'
      };
  }
};
