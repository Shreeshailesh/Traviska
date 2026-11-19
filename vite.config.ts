import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      '/sitemap.xml': {
        target: 'https://traviska-backend.onrender.com',
        changeOrigin: true,
      },
    },
  },
  preview: {
    proxy: {
      '/sitemap.xml': {
        target: 'https://traviska-backend.onrender.com',
        changeOrigin: true,
      },
    },
  },
})