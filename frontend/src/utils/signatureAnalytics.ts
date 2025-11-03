// 📊 signatureAnalytics.ts - Telemetrie für Signaturprozess
// Tracked Events für Conversion-Analyse und UX-Optimierung

export type SignatureEvent =
  | "sign_ui_open"
  | "field_focus"
  | "field_completed"
  | "next_field"
  | "previous_field"
  | "finish_attempt"
  | "finish_success"
  | "finish_error"
  | "help_opened"
  | "auto_save"
  | "session_restored";

interface SignatureEventData {
  envelopeId?: string;
  fieldId?: string;
  fieldType?: string;
  required?: boolean;
  error?: string;
  totalFields?: number;
  completedFields?: number;
  timestamp: number;
}

/**
 * Track signature event
 * Sends to console in development, can be extended to send to analytics service
 * SAFE: Never throws errors, always wrapped in try-catch
 */
export function trackSignatureEvent(
  event: SignatureEvent,
  data: Partial<SignatureEventData> = {}
): void {
  try {
    const eventData: SignatureEventData = {
      ...data,
      timestamp: Date.now()
    };

    // Console logging for development
    console.log(`📊 [Analytics] ${event}`, eventData);

  // TODO: Send to analytics service (e.g., Google Analytics, Mixpanel, PostHog)
  // Example for Google Analytics 4:
  // if (typeof window !== 'undefined' && window.gtag) {
  //   window.gtag('event', event, {
  //     event_category: 'signature_flow',
  //     envelope_id: eventData.envelopeId,
  //     field_id: eventData.fieldId,
  //     field_type: eventData.fieldType,
  //     required: eventData.required,
  //     total_fields: eventData.totalFields,
  //     completed_fields: eventData.completedFields,
  //   });
  // }

  // Example for custom backend endpoint:
  // fetch('/api/analytics/signature-event', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ event, ...eventData })
  // }).catch(err => console.error('Analytics error:', err));
  } catch (err) {
    // Silent fail - analytics should never break the app
    console.debug('[Analytics] Failed to track event:', event, err);
  }
}

/**
 * Track page visit with referrer info
 */
export function trackSignUIOpen(envelopeId: string, totalFields: number): void {
  trackSignatureEvent("sign_ui_open", {
    envelopeId,
    totalFields
  });
}

/**
 * Track field interaction
 */
export function trackFieldFocus(
  envelopeId: string,
  fieldId: string,
  fieldType: string,
  required: boolean
): void {
  trackSignatureEvent("field_focus", {
    envelopeId,
    fieldId,
    fieldType,
    required
  });
}

/**
 * Track field completion
 */
export function trackFieldCompleted(
  envelopeId: string,
  fieldId: string,
  fieldType: string,
  completedFields: number,
  totalFields: number
): void {
  trackSignatureEvent("field_completed", {
    envelopeId,
    fieldId,
    fieldType,
    completedFields,
    totalFields
  });
}

/**
 * Track navigation events
 */
export function trackNextField(envelopeId: string): void {
  trackSignatureEvent("next_field", { envelopeId });
}

export function trackPreviousField(envelopeId: string): void {
  trackSignatureEvent("previous_field", { envelopeId });
}

/**
 * Track finish attempt (button clicked)
 */
export function trackFinishAttempt(
  envelopeId: string,
  completedFields: number,
  totalFields: number
): void {
  trackSignatureEvent("finish_attempt", {
    envelopeId,
    completedFields,
    totalFields
  });
}

/**
 * Track successful submission
 */
export function trackFinishSuccess(envelopeId: string): void {
  trackSignatureEvent("finish_success", { envelopeId });
}

/**
 * Track submission error
 */
export function trackFinishError(envelopeId: string, error: string): void {
  trackSignatureEvent("finish_error", {
    envelopeId,
    error
  });
}

/**
 * Track help modal
 */
export function trackHelpOpened(envelopeId: string): void {
  trackSignatureEvent("help_opened", { envelopeId });
}

/**
 * Track auto-save
 */
export function trackAutoSave(
  envelopeId: string,
  completedFields: number
): void {
  trackSignatureEvent("auto_save", {
    envelopeId,
    completedFields
  });
}

/**
 * Track session restore
 */
export function trackSessionRestored(
  envelopeId: string,
  restoredFields: number
): void {
  trackSignatureEvent("session_restored", {
    envelopeId,
    completedFields: restoredFields
  });
}
