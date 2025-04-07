// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import "./styles/theme.css";
import { ThemeProvider } from "./context/ThemeContext";
import { HelmetProvider } from "react-helmet-async"; // 👈 hinzugefügt

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <HelmetProvider> {/* 👈 Helmet um die gesamte App */}
      <ThemeProvider> {/* ✅ Theme bleibt erhalten */}
        <App />
      </ThemeProvider>
    </HelmetProvider>
  </React.StrictMode>
);
