// import { defineConfig } from 'vite'
// import react from '@vitejs/plugin-react'

// export default defineConfig({
//   plugins: [react(), tailwind],
//   resolve: {
//     alias: {
//       '@': '/src',
//     },
//   },
//   server: {
//     proxy: {
      
//       '/api': {
//         target: 'http://localhost:8000',
//         changeOrigin: true,
//         rewrite: (path) => path.replace(/^\/api/, ''),
//       },
//     },
//   },
// })


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
      // All API calls go through /api/* prefix on the frontend.
      // Vite strips /api before forwarding to FastAPI, so the backend
      // sees its original routes (/auth/token, /project/all/..., etc.)
      // This completely avoids clashes with frontend routes like
      // /projects, /tasks, /members which don't start with /api.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})