import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  optimizeDeps: { include: ['react', 'react-dom/client', 'react/jsx-dev-runtime', 'react-router-dom', 'framer-motion'] },
})
