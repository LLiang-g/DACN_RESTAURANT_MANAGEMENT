import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // sockjs-client cần biến global của Node; trong trình duyệt thay bằng globalThis
  define: { global: 'globalThis' },
  server: {
    port: 5176,
    strictPort: true,
    proxy: {
      '/api': {
        target: process.env.ADMIN_API_TARGET || 'http://localhost:8080',
        changeOrigin: true,
      },
      // Nhật ký realtime (STOMP over SockJS) — giống KDS: bỏ header Origin để backend không chặn CORS
      '/ws': {
        target: process.env.ADMIN_API_TARGET || 'http://localhost:8080',
        ws: true,
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
          proxy.on('proxyReqWs', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
    },
  },
})