import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, './src') } },
  server: { port: 5173 },
  optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-dev-runtime', 'react-router-dom', 'framer-motion'] },
})
