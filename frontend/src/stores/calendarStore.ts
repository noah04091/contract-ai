/**
 * Calendar Zustand Store
 * State Management für Kalender-Events mit Caching
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import axios from 'axios';
import { clearAuthData } from '../utils/api'; // 🩹 24.07.2026: App-Standard-Logout bei TOKEN_EXPIRED

// 🔒 Calendar Access Info (vom Backend)
export interface CalendarAccess {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canSnooze: boolean;
  canDismiss: boolean;
  plan: string;
  upgradeRequired: boolean;
  requiredPlans: string[];
}

// API Response Type
interface ApiResponse {
  success: boolean;
  events?: CalendarEvent[];
  message?: string;
  access?: CalendarAccess;
}

// ============================================
// TYPES
// ============================================

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
  notes?: string;
  metadata?: {
    provider?: string;
    noticePeriodDays?: number;
    autoRenewMonths?: number;
    suggestedAction?: string;
    daysLeft?: number;
    cancellationId?: string;
    isFollowUp?: boolean;
  };
  amount?: number;
  isManual?: boolean;
  confidence?: number;
  dataSource?: string;
  isEstimated?: boolean;
}

// Helper: Extract userId from JWT token
const getUserIdFromToken = (): string | null => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.userId || payload.id || null;
  } catch {
    return null;
  }
};

interface CalendarState {
  // Data
  events: CalendarEvent[];
  lastFetched: number | null;
  cachedUserId: string | null;

  // 🔒 Access Control (vom Backend)
  access: CalendarAccess | null;

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
  hasFullAccess: () => boolean;
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
        access: null, // 🔒 Access wird beim ersten Fetch geladen
        loading: false,
        error: null,
        cacheMaxAge: 5 * 60 * 1000, // 5 minutes

        // 🔒 Prüft ob User vollen Kalender-Zugriff hat
        hasFullAccess: () => {
          const { access } = get();
          return access?.canCreate === true;
        },

        // Check if cache is still valid (also checks if user changed)
        isCacheValid: () => {
          const { lastFetched, cacheMaxAge, events, cachedUserId } = get();
          if (!lastFetched || events.length === 0) return false;

          // Invalidate cache if user has changed
          const currentUserId = getUserIdFromToken();
          if (currentUserId !== cachedUserId) {
            console.log('[CalendarStore] User changed, invalidating cache');
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

            // Future-Cutoff bei 3 Jahren — verhindert Endlos-Recurrence-Expansion
            // (Mietraten etc.) bei langfristigen Verträgen.
            // KEIN Past-Cutoff: historische Vertragsereignisse (Vertragsunterzeichnung
            // 2014, etc.) werden via HISTORICAL_EVENT_TYPE_WHITELIST im Backend
            // bereits streng gefiltert — wir wollen sie alle sehen, damit der
            // Kalender die volle Vertrags-Timeline abbildet.
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 1095); // 3 Jahre voraus

            const response = await axios.get<ApiResponse>('/api/calendar/events', {
              headers: { Authorization: `Bearer ${token}` },
              params: {
                to: futureDate.toISOString()
              }
            });

            if (response.data.success && response.data.events) {
              console.log('[CalendarStore] Events loaded:', response.data.events.length);
              console.log('[CalendarStore] Access:', response.data.access);
              set({
                events: response.data.events,
                lastFetched: Date.now(),
                cachedUserId: getUserIdFromToken(),
                access: response.data.access || null, // 🔒 Access Info speichern
                loading: false,
                error: null
              });
            }
          } catch (err) {
            console.error('[CalendarStore] Error fetching events:', err);
            // 🩹 24.07.2026 (Live-Vorfall „Kalender leer"): Der Store nutzt rohes axios
            // und umging damit den App-Standard aus apiCall — bei abgelaufener Sitzung
            // (403 TOKEN_EXPIRED aus verifyToken.js) blieb der Kalender STUMM leer und
            // sah aus wie Datenverlust. Jetzt: exakt das apiCall-Muster (Auto-Logout +
            // Redirect); andere Fehler bekommen eine sprechende Meldung für die UI.
            const resp = (err as { response?: { status?: number; data?: { error?: string } } })?.response;
            if (resp?.status === 403 && resp?.data?.error === 'TOKEN_EXPIRED') {
              console.warn('🔒 [CalendarStore] Sitzung abgelaufen - Auto-Logout');
              clearAuthData();
              if (!window.location.pathname.startsWith('/login')) {
                window.location.href = '/login?reason=session_expired';
              }
              set({ loading: false, error: 'Sitzung abgelaufen. Bitte erneut einloggen.' });
              return;
            }
            set({ loading: false, error: 'Deine Termine konnten gerade nicht geladen werden — sie sind weiterhin gespeichert. Bitte lade die Seite neu.' });
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
            lastFetched: null
          });
        }
      }),
      {
        name: 'calendar-store',
        // 🔄 Cache-Bust: bei jedem Schema-relevanten Code-Change inkrementieren.
        // Triggert automatisch frisches Re-Fetch aller User beim nächsten Page-Load.
        // v1 (06.05.2026): Past-Events-Cutoff entfernt → alte Caches enthalten nur
        // Events der letzten 365 Tage und müssen neu geladen werden.
        version: 1,
        // Only persist events, lastFetched, cachedUserId, and access (not loading state)
        partialize: (state) => ({
          events: state.events,
          lastFetched: state.lastFetched,
          cachedUserId: state.cachedUserId,
          access: state.access // 🔒 Access auch persistieren
        })
      }
    ),
    { name: 'CalendarStore' }
  )
);

export default useCalendarStore;
// Deployment trigger: So, 18. Jan 2026 19:38:41
