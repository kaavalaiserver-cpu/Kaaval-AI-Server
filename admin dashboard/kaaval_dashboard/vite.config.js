import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
const apiTarget = process.env.VITE_API_URL || 'http://127.0.0.1:8003';
const corsOrigins = process.env.VITE_ALLOWED_HOSTS ? process.env.VITE_ALLOWED_HOSTS.split(',') : ['localhost'];

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Listen on all addresses
    port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 3000,
    allowedHosts: corsOrigins,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    port: process.env.VITE_PORT ? parseInt(process.env.VITE_PORT) : 3000,
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
