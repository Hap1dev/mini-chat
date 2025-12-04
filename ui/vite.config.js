import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// vite.config.js (root)
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/send': 'https://mini-chat-service-a-gateway.onrender.com',
      '/stream': 'https://mini-chat-service-a-gateway.onrender.com',
      '/history': 'https://mini-chat-service-a-gateway.onrender.com'
    }
  }
});

