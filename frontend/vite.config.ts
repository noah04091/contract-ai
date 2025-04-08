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
        "default-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self' https://contract-ai-backend.onrender.com; font-src 'self' data:; style-src 'self' 'unsafe-inline'; object-src 'none';",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), camera=()"
    }
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "esbuild",
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: true,
    fs: {
      strict: true,
    },
  },
});
