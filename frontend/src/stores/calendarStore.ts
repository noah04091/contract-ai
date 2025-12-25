/**
 * Calendar Zustand Store
 * State Management für Kalender-Events mit Caching
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import axios from 'axios';

// API Response Type
interface ApiResponse {
  success: boolean;
  events?: CalendarEvent[];
  message?: string;
}

// ============================================
// TYPES
// ============================================

// Recurrence Types
export interface RecurrencePattern {
  type: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number; // Every X days/weeks/months/years
  endDate?: string | null;
  count?: number | null;
  daysOfWeek?: number[] | null; // For weekly: [0-6] (Sun-Sat)
}

export interface CalendarEvent {
  id: string;
  contractId: string;
  contractName: string;
  title: string;
  description: string;
  date: string;
  type: string;
  severity: 'info' | 'warning' | 'critical';
  status: string;
  metadata?: {
    provider?: string;
    noticePeriodDays?: number;
    autoRenewMonths?: number;
    suggestedAction?: string;
    daysLeft?: number;
  };
  amount?: number;
  isManual?: boolean;
  // Recurrence fields
  recurrence?: RecurrencePattern | null;
  isRecurringMaster?: boolean;
  isRecurringInstance?: boolean;
  masterEventId?: string | null;
}

interface CalendarState {
  // Data
  events: CalendarEvent[];
  lastFetched: number | null;
  cachedUserId: string | null; // Track which user the cache belongs to

  // UI State
  loading: boolean;
  error: string | null;

  // Cache Settings (5 minutes = 300000ms)
  cacheMaxAge: number;

  // Actions
  fetchEvents: (force?: boolean) => Promise<void>;
  dismissEvent: (eventId: string) => Promise<void>;
  snoozeEvent: (eventId: string, days: number) => Promise<void>;
  addEvent: (event: CalendarEvent) => void;
  removeEvent: (eventId: string) => void;
  updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  clearCache: () => void;

  // Helpers
  isCacheValid: () => boolean;
}

// ============================================
// STORE
// ============================================

export const useCalendarStore = create<CalendarState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        events: [],
        lastFetched: null,
        cachedUserId: null,
        loading: false,
        error: null,
        cacheMaxAge: 5 * 60 * 1000, // 5 minutes

        // Check if cache is still valid (including user check)
        isCacheValid: () => {
          const { lastFetched, cacheMaxAge, events, cachedUserId } = get();
          if (!lastFetched || events.length === 0) return false;

          // Check if user changed (extract userId from token)
          try {
            const token = localStorage.getItem('token');
            if (token) {
              const payload = JSON.parse(atob(token.split('.')[1]));
              const currentUserId = payload.userId || payload.sub;
              if (cachedUserId && cachedUserId !== currentUserId) {
                console.log('[CalendarStore] User changed - cache invalid');
                return false;
              }
            }
          } catch {
            // If we can't parse token, treat cache as invalid
            return false;
          }

          return Date.now() - lastFetched < cacheMaxAge;
        },

        // Fetch events (with caching)
        fetchEvents: async (force = false) => {
          const state = get();

          // Use cache if valid and not forced
          if (!force && state.isCacheValid()) {
            console.log('[CalendarStore] Using cached events:', state.events.length);
            return;
          }

          console.log('[CalendarStore] Fetching events from server...');
          set({ loading: true, error: null });

          try {
            const token = localStorage.getItem('token');
            if (!token) {
              set({ loading: false, error: 'Nicht eingeloggt' });
              return;
            }

            const pastDate = new Date();
            pastDate.setDate(pastDate.getDate() - 60);
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 365);

            const response = await axios.get<ApiResponse>('/api/calendar/events', {
              headers: { Authorization: `Bearer ${token}` },
              params: {
                from: pastDate.toISOString(),
                to: futureDate.toISOString()
              }
            });

            if (response.data.success && response.data.events) {
              console.log('[CalendarStore] Events loaded:', response.data.events.length);

              // Extract userId from token for cache validation
              let currentUserId = null;
              try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                currentUserId = payload.userId || payload.sub;
              } catch {
                // Ignore parsing errors
              }

              set({
                events: response.data.events,
                lastFetched: Date.now(),
                cachedUserId: currentUserId,
                loading: false,
                error: null
              });
            }
          } catch (err) {
            console.error('[CalendarStore] Error fetching events:', err);
            set({ loading: false, error: 'Fehler beim Laden' });
          }
        },

        // Dismiss event (optimistic update)
        dismissEvent: async (eventId: string) => {
          const previousEvents = get().events;

          // Optimistic update - remove from local state immediately
          set({
            events: previousEvents.filter(e => e.id !== eventId)
          });

          try {
            const token = localStorage.getItem('token');
            await axios.post('/api/calendar/quick-action', {
              eventId,
              action: 'dismiss'
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log('[CalendarStore] Event dismissed:', eventId);
          } catch (err) {
            // Rollback on error
            console.error('[CalendarStore] Error dismissing event:', err);
            set({ events: previousEvents });
            throw err;
          }
        },

        // Snooze event (optimistic update)
        snoozeEvent: async (eventId: string, days: number) => {
          const previousEvents = get().events;
          const event = previousEvents.find(e => e.id === eventId);

          if (!event) return;

          // Calculate new date
          const newDate = new Date(event.date);
          newDate.setDate(newDate.getDate() + days);

          // Optimistic update
          set({
            events: previousEvents.map(e =>
              e.id === eventId
                ? { ...e, date: newDate.toISOString(), status: 'snoozed' }
                : e
            )
          });

          try {
            const token = localStorage.getItem('token');
            await axios.post('/api/calendar/quick-action', {
              eventId,
              action: 'snooze',
              data: { days }
            }, {
              headers: { Authorization: `Bearer ${token}` }
            });
            console.log('[CalendarStore] Event snoozed:', eventId, days, 'days');
          } catch (err) {
            // Rollback on error
            console.error('[CalendarStore] Error snoozing event:', err);
            set({ events: previousEvents });
            throw err;
          }
        },

        // Add event to local cache
        addEvent: (event: CalendarEvent) => {
          set(state => ({
            events: [...state.events, event]
          }));
        },

        // Remove event from local cache
        removeEvent: (eventId: string) => {
          set(state => ({
            events: state.events.filter(e => e.id !== eventId)
          }));
        },

        // Update event in local cache
        updateEvent: (eventId: string, updates: Partial<CalendarEvent>) => {
          set(state => ({
            events: state.events.map(e =>
              e.id === eventId ? { ...e, ...updates } : e
            )
          }));
        },

        // Clear cache
        clearCache: () => {
          set({
            events: [],
            lastFetched: null,
            cachedUserId: null
          });
        }
      }),
      {
        name: 'calendar-store',
        // Persist events, lastFetched, and cachedUserId (not loading state)
        partialize: (state) => ({
          events: state.events,
          lastFetched: state.lastFetched,
          cachedUserId: state.cachedUserId
        })
      }
    ),
    { name: 'CalendarStore' }
  )
);

export default useCalendarStore;
