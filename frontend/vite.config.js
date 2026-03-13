import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    proxy: {
      // All API calls use /api prefix — Vite strips it before forwarding.
      // e.g. axios POST /api/auth/token → FastAPI POST /auth/token
      // this used to prevent the clash that occurs as frontend and backend has same endpoint names
      // eg. localhost:5173/projects, if we don't use /api in the frontend and directly convert '/' into localhost:8000, now url becomes localhost:8000/projects => which is one of the base endpoint for the project router
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },

      // The refresh_token cookie has path="/auth/refresh" on the backend.
      // The browser only sends it when the request URL path matches — so the
      // refresh call MUST be sent to exactly /auth/refresh (not /api/auth/refresh).
      // This dedicated rule proxies /auth/refresh without any rewrite,
      // so the browser sees the correct path and attaches the cookie.
      '/auth/refresh': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})