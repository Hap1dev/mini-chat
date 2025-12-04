import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite.config.js (root)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/send': 'http://localhost:3000',
      '/stream': 'http://localhost:3000',
      '/history': 'http://localhost:3000'
    }
  }
});

