import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import babel from "@rolldown/plugin-babel"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    host: true, // cho điện thoại trong cùng WiFi truy cập khi quét QR
    proxy: { "/api": "http://localhost:8080" }, // tránh lỗi CORS khi gọi backend
  },
})
