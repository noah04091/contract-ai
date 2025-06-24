// src/main.tsx
import { applyDOMProtectionFix } from "./utils/domProtection";
applyDOMProtectionFix(); // ✅ Funktion aktivieren

import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import "./styles/theme.css";
import { HelmetProvider } from "react-helmet-async";

const container = document.getElementById("root")!;
const root = createRoot(container);

root.render(
  <HelmetProvider>
    <App />
  </HelmetProvider>
);