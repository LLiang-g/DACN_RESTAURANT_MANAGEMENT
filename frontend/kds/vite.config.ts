import { defineConfig } from 'vite';
import type { ProxyOptions } from 'vite';
import react from '@vitejs/plugin-react';

/**
 * Proxy giữ nguyên header Origin của trình duyệt (http://localhost:5174) nhưng lại đổi Host sang cổng 8080,
 * nên Spring tưởng đây là request chéo nguồn và chặn bằng 403 "Invalid CORS request".
 * Bỏ header Origin ở đây thì backend coi như request thường (giống khi gọi bằng Postman).
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
    // Gọi /api và /ws trên cổng 5175 sẽ được chuyển sang backend
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true, configure: stripOrigin },
      '/ws': { target: 'http://localhost:8080', ws: true, configure: stripOrigin },
    },
  },
});
