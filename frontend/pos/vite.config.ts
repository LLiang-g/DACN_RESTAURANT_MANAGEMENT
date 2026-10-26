import { defineConfig } from 'vite';
import type { ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Proxy giữ nguyên header Origin gốc của trình duyệt (http://localhost:5175) khi forward
 * sang backend (8080). Spring so khớp Origin này với allowlist trong CorsConfig, không thấy
 * 5175 trong đó nên chặn 403. Xoá header Origin trước khi forward thì Spring coi đây là
 * request "thường" (giống gọi bằng Postman/curl trực tiếp), không còn áp luồng kiểm tra CORS nữa.
 */
const stripOrigin: ProxyOptions['configure'] = (proxy) => {
  proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
  proxy.on('proxyReqWs', (proxyReq) => proxyReq.removeHeader('origin'));
};

export default defineConfig({
  plugins: [react()],
  // sockjs-client cần biến global của Node; trong trình duyệt thay bằng globalThis
  define: { global: 'globalThis' },
  server: {
    port: 5175,
    // Gọi /api và /ws trên cổng 5175 (chính dev server này) sẽ được chuyển tiếp sang backend 8080
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true, configure: stripOrigin },
      '/ws': { target: 'http://localhost:8080', ws: true, configure: stripOrigin },
    },
  },
});