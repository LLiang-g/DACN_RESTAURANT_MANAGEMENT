import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Không dùng changeOrigin: giữ nguyên Host/Origin để Spring không kích hoạt CORS
// (chạy được cả khi truy cập qua IP LAN).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': { target: 'http://localhost:8080', ws: true },
    },
  },
})
