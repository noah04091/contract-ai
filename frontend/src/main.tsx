// src/main.tsx
import { applyDOMProtectionFix } from "./utils/domProtection";
applyDOMProtectionFix(); // ✅ Funktion aktivieren

import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/index.css";
import "./styles/theme.css";
import { HelmetProvider } from "react-helmet-async";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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