// 📁 vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  preview: {
    port: Number(process.env.PORT) || 4173,
    host: true,
    allowedHosts: ["contract-ai.de", "www.contract-ai.de"],
    headers: {
      "Cache-Control": "public, max-age=31536000",
      "Content-Security-Policy":
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; connect-src * data: blob: https://api.contract-ai.de https://contract-ai-backend.onrender.com;",
      "Access-Control-Allow-Origin": "*", // nur für Preview/debug hilfreich
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Origin, X-Requested-With, Content-Type, Accept",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), camera=()",
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: true,
    cors: {
      origin: ["https://contract-ai.de", "https://www.contract-ai.de"],
      credentials: true, // 🔑 wichtig für Cookies!
    },
    proxy: {
      "/api": {
        target: "https://api.contract-ai.de",
        changeOrigin: true,
        secure: true,
      },
    },
    fs: {
      strict: true,
    },
  },
});
