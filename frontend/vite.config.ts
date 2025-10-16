// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 🔐 Sicherheits-Header für Preview-Modus (Vercel Vorschau-Links oder local preview)
const securityHeaders = {
  "Cache-Control": "public, max-age=31536000",
  "Content-Security-Policy": [
    "default-src 'self';",
    "script-src 'self' 'unsafe-inline';",
    "connect-src 'self' https://api.contract-ai.de;", // 🔁 angepasst für Rewrite-Proxys
    "font-src 'self' data:;",
    "style-src 'self' 'unsafe-inline';",
    "img-src 'self' data: https://noah-contract-ai-documents.s3.eu-north-1.amazonaws.com;", // ✅ S3 Bilder erlauben
    "object-src 'none';"
  ].join(" "),
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), camera=()",
};

export default defineConfig({
  base: "/", // ✅ wichtig für korrekte Pfade bei Rewrite + Deployment

  plugins: [react()],
  
  // 🔍 Dev-Server (nur lokal!)
  server: {
    host: true,
    cors: {
      origin: ["https://contract-ai.de", "https://www.contract-ai.de"],
      credentials: true,
    },
    proxy: {
      "/api": {
        target: "https://api.contract-ai.de",
        changeOrigin: true,
        secure: true,
        // 🔧 FIXED: Behalte /api im Pfad - Backend erwartet /api/better-contracts
        // rewrite: (path) => path.replace(/^\/api/, ""), // REMOVED
      },
    },
    fs: {
      strict: true,
    },
  },

  // 🛠 Preview-Mode (vite preview oder Vercel)
  preview: {
    port: Number(process.env.PORT) || 4173,
    host: true,
    allowedHosts: ["contract-ai.de", "www.contract-ai.de"],
    headers: securityHeaders,
  },

  // 📦 Build-Optimierungen
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1000,
    modulePreload: false, // 🔧 FIX: Deaktiviert CSS-Preload-Fehler bei lazy-loaded routes
    rollupOptions: {
      output: {
        manualChunks: {
          // 🚀 React Core - Wird auf jeder Seite benötigt
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // 🎨 UI & Animation - Große Libraries
          'ui-vendor': ['framer-motion', 'lucide-react', 'react-toastify'],

          // 📄 PDF Generation - Nur für Generate & ContractDetails
          'pdf-vendor': ['html2pdf.js', 'jspdf', 'html2canvas'],

          // 🔐 Auth & Utils
          'utils-vendor': ['axios', 'jwt-decode'],
        },
      },
    },
  },
});
