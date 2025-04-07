// frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  preview: {
    port: 10000,
    host: true,
    allowedHosts: ['contract-ai.de', 'www.contract-ai.de'], // ✅ echte Domains freigegeben
  }
})
