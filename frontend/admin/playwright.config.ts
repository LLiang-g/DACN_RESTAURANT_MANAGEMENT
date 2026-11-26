import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5176",
    headless: true,
    actionTimeout: 10000,
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1",
    url: "http://localhost:5176",
    reuseExistingServer: false,
    env: { ADMIN_API_TARGET: "http://localhost:18080" },
    timeout: 30000,
  },
});
