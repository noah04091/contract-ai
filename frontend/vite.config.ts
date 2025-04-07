import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  preview: {
    port: Number(process.env.PORT) || 4173,
    host: true,
    allowedHosts: ["contract-ai.de", "www.contract-ai.de"],
    headers: {
      "Cache-Control": "public, max-age=31536000", // 1 Jahr Caching
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false, // kein Quellcode sichtbar
    minify: "esbuild", // effizientere JS-Komprimierung
    chunkSizeWarningLimit: 1000, // Warnung bei zu großen Chunks
  },
  server: {
    host: true, // wichtig für Render
    fs: {
      strict: true,
    },
  },
});
