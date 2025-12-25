/**
 * Calendar Component Types
 * Shared types for all calendar components
 */

import { CalendarEvent } from '../../stores/calendarStore';

// Re-export for convenience
export type { CalendarEvent, RecurrencePattern } from '../../stores/calendarStore';

// Calendar View Types
export type CalendarView = 'month' | 'week' | 'day';

// Day info for calendar grid
export interface DayInfo {
  day: number;
  type: 'prev' | 'current' | 'next';
  events: CalendarEvent[];
}

// Stats data
export interface StatData {
  title: string;
  count: number;
  color: string;
  type: string;
  icon: React.ReactNode;
}

// Simple contract for dropdowns
export interface SimpleContract {
  _id: string;
  name: string;
}

// Snooze preset
export interface SnoozePreset {
  days: number;
  label: string;
  icon: React.ReactNode;
}

// Event form data for create/edit
export interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  type: 'REMINDER' | 'DEADLINE' | 'CANCEL_WINDOW_OPEN' | 'LAST_CANCEL_DAY' | 'AUTO_RENEWAL';
  severity: 'info' | 'warning' | 'critical';
  notes: string;
  contractId: string;
  contractName: string;
  recurrenceType: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  recurrenceInterval: number;
  recurrenceEndDate: string;
}
