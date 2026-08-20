// src/main.tsx
import { applyDOMProtectionFix } from "./utils/domProtection";
applyDOMProtectionFix(); // ✅ Funktion aktivieren

import * as Sentry from "@sentry/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import "./styles/theme.css";
import "./styles/accessibility.css";
import "./styles/LegalLensHighlight.css";
import { HelmetProvider } from "react-helmet-async";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

// 🛡️ 20.08.2026 (Noahs Test: "komplette Seite weiß"): Nach einem Deploy heißen die
// Code-Pakete anders. Eine offene Sitzung, die dann ein Paket nachlädt (z. B. beim
// Wechsel in die Analyse-Ansicht), bekommt einen 404 — Vite meldet das als
// `vite:preloadError`. Ohne Behandlung rendert die Seite an dieser Stelle nichts
// mehr: weiße Seite, aus der nur ein manueller Reload herausführt.
// Deshalb hier: EIN automatischer Reload, der die frische Version holt. Der
// sessionStorage-Riegel verhindert eine Reload-Schleife, falls der Fehler eine
// andere Ursache hat (dann greift die ErrorBoundary mit sichtbarer Meldung).
window.addEventListener("vite:preloadError", (event) => {
  const RELOAD_KEY = "ca_preloadReloadAt";
  let last = 0;
  try { last = Number(sessionStorage.getItem(RELOAD_KEY) || 0); } catch { /* blockiert */ }
  if (Date.now() - last < 15000) return; // kürzlich schon versucht → ErrorBoundary übernimmt
  event.preventDefault();
  try { sessionStorage.setItem(RELOAD_KEY, String(Date.now())); } catch { /* blockiert */ }
  console.warn("🔄 Neue Version erkannt (Paket nicht mehr verfügbar) — lade die Seite neu.");
  window.location.reload();
});

const container = document.getElementById("root")!;
const root = createRoot(container);

root.render(
  <HelmetProvider>
    <>
      <App />
      <ToastContainer
        position="top-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        style={{
          fontSize: '14px',
          fontWeight: '500'
        }}
      />
    </>
  </HelmetProvider>
);