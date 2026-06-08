// First-party Herkunfts-Tracking — erfasst beim ERSTEN Besuch, wie ein Nutzer zu uns kam.
// Liest nur, was der Browser ohnehin mitschickt (URL-Parameter, Referrer). Keine Dritten,
// kein Cookie-Banner. Wird beim Registrieren mitgeschickt und am User gespeichert.

const STORAGE_KEY = "ca_acquisition";
const UTM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

export interface AcquisitionData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  referrer?: string;
  landingPage?: string;
  capturedAt?: string;
}

/**
 * Erfasst die Herkunft beim ERSTEN Besuch (first-touch) und speichert sie in localStorage.
 * Überschreibt NIE — die echte Erstquelle bleibt erhalten, auch wenn der Nutzer erst
 * durch die Seite klickt und sich später registriert.
 * Schlägt etwas fehl (privater Modus etc.), passiert einfach nichts.
 */
export function captureAcquisitionOnce(): void {
  try {
    if (localStorage.getItem(STORAGE_KEY)) return; // schon erfasst — first-touch behalten

    const params = new URLSearchParams(window.location.search);
    const data: AcquisitionData = {};

    for (const key of UTM_KEYS) {
      const value = params.get(key);
      if (value) data[key] = value.slice(0, 200);
    }

    const referrer = document.referrer || "";
    if (referrer) data.referrer = referrer.slice(0, 500);

    data.landingPage = (window.location.pathname || "/").slice(0, 200);
    data.capturedAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage nicht verfügbar — Registrierung läuft normal weiter, nur ohne Herkunft
  }
}

/** Liest die gespeicherte Herkunft (für den Register-Aufruf). */
export function getAcquisition(): AcquisitionData | undefined {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AcquisitionData) : undefined;
  } catch {
    return undefined;
  }
}
