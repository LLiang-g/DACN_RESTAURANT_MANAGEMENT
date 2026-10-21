import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Không dùng changeOrigin: giữ nguyên Host/Origin để Spring không kích hoạt CORS
// (chạy được cả khi truy cập qua IP LAN).
export default defineConfig({
  plugins: [react()],
  // sockjs-client cần biến global của Node; trong trình duyệt thay bằng globalThis
  define: { global: 'globalThis' },
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': 'http://localhost:8080',
      '/ws': { target: 'http://localhost:8080', ws: true },
    },
  },
})
