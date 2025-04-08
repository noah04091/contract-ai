// 📁 vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: true,
    port: 5173,
    fs: {
      strict: true,
    },
  },
  preview: {
    port: Number(process.env.PORT) || 4173,
    host: true,
    headers: {
      "Cache-Control": "public, max-age=31536000",
      // ⚠️ Angepasste CSP – erlaubt Inline-Styles & Skripte für Vite
      "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; object-src 'none';",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), camera=()"
    }
  }
});
