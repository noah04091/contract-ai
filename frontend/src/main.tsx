// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import "./styles/theme.css";
import { ThemeProvider } from "./context/ThemeContext"; // ✅ ThemeContext einbinden

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ThemeProvider> {/* ✅ Theme um die gesamte App legen */}
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
